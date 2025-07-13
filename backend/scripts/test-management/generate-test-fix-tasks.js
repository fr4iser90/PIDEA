
#!/usr/bin/env node
require('module-alias/register');

/**
 * CLI Script: Generate and Process Test Fix Tasks
 * 
 * Usage:
 *   node scripts/test-management/generate-test-fix-tasks.js [options]
 * 
 * Options:
 *   --project-path <path>     Project path (default: current directory)
 *   --project-id <id>         Project ID (default: 'system')
 *   --user-id <id>            User ID (default: 'system')
 *   --stop-on-error           Stop processing on first error
 *   --dry-run                 Only generate tasks, don't process them
 *   --help                    Show this help
 */

const path = require('path');
const fs = require('fs');

// Add backend to module path
const backendPath = path.resolve(__dirname, '..', '..');
require('module').globalPaths.push(backendPath);

// Import services
const TestReportParser = require('@services/TestReportParser');
const TestFixTaskGenerator = require('@services/TestFixTaskGenerator');
const AutoTestFixSystem = require('@services/auto-test/AutoTestFixSystem');
const SQLiteTaskRepository = require('@database/SQLiteTaskRepository');
const CursorIDEService = require('@services/CursorIDEService');
const BrowserManager = require('@external/BrowserManager');
const IDEManager = require('@external/IDEManager');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class TestFixTaskCLI {
  constructor() {
    this.options = {
      projectPath: process.cwd(),
      projectId: 'system',
      userId: 'system',
      dryRun: false,
      stopOnError: false,
      clearExisting: false,
      loadExistingTasks: false, // New option to load existing tasks
      taskStatus: null, // Optional status filter
      help: false
    };
    
    this.logger = console;
    this.taskRepository = null;
    this.autoTestFixSystem = null;
  }

  /**
   * Parse command line arguments
   */
  parseArguments() {
    const args = process.argv.slice(2);
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--project-path':
        case '-p':
          this.options.projectPath = args[++i];
          break;
        case '--project-id':
          this.options.projectId = args[++i];
          break;
        case '--user-id':
          this.options.userId = args[++i];
          break;
        case '--dry-run':
          this.options.dryRun = true;
          break;
        case '--stop-on-error':
          this.options.stopOnError = true;
          break;
        case '--clear-existing':
          this.options.clearExisting = true;
          break;
        case '--load-existing-tasks':
          this.options.loadExistingTasks = true;
          break;
        case '--task-status':
          this.options.taskStatus = args[++i];
          break;
        case '--help':
        case '-h':
          this.options.help = true;
          break;
        default:
          if (arg.startsWith('--')) {
            logger.error(`Unknown option: ${arg}`);
            process.exit(1);
          }
      }
    }
  }

  /**
   * Display help information
   */
  showHelp() {
    logger.log(`
Test Fix Task Generator CLI

Usage: node generate-test-fix-tasks.js [options]

Options:
  --project-path, -p <path>     Project path (default: current directory)
  --project-id <id>             Project ID (default: 'system')
  --user-id <id>                User ID (default: 'system')
  --dry-run                     Run without making changes
  --stop-on-error               Stop processing on first error
  --clear-existing              Clear existing tasks before generating new ones
  --load-existing-tasks         Load existing tasks instead of generating new ones
  --task-status <status>        Filter existing tasks by status (pending, in_progress, etc.)
  --help, -h                    Show this help message

Examples:
  # Generate new tasks from test reports
  node generate-test-fix-tasks.js --project-path /path/to/project

  # Load existing pending tasks
  node generate-test-fix-tasks.js --load-existing-tasks --task-status pending

  # Load existing tasks with fallback to generating new ones
  node generate-test-fix-tasks.js --load-existing-tasks

  # Clear existing tasks and generate new ones
  node generate-test-fix-tasks.js --clear-existing

  # Dry run to see what would be generated
  node generate-test-fix-tasks.js --dry-run
`);
  }

  /**
   * Initialize services
   */
  async initializeServices() {
    try {
      this.logger.info('[TestFixTaskCLI] Initializing services...');

      // Initialize database - SQLiteTaskRepository doesn't need initialize()
      this.taskRepository = new SQLiteTaskRepository();

      // Initialize IDE services if not dry run
      if (!this.options.dryRun) {
        this.browserManager = new BrowserManager();
        this.ideManager = new IDEManager(this.browserManager);
        this.cursorIDE = new CursorIDEService(this.browserManager, this.ideManager);
        
        // Try to connect to existing IDE
        try {
          const availableIDEs = await this.ideManager.getAvailableIDEs();
          if (availableIDEs.length > 0) {
            const activeIDE = availableIDEs[0];
            await this.ideManager.switchToIDE(activeIDE.port);
            this.logger.info(`[TestFixTaskCLI] Connected to IDE on port ${activeIDE.port}`);
          } else {
            this.logger.warn('[TestFixTaskCLI] No IDE found, starting new one...');
            await this.ideManager.startNewIDE(this.options.projectPath);
          }
        } catch (error) {
          this.logger.warn('[TestFixTaskCLI] IDE connection failed, continuing without IDE:', error.message);
          this.cursorIDE = null;
        }
      }

      // Initialize AutoTestFixSystem
      this.autoTestFixSystem = new AutoTestFixSystem({
        taskRepository: this.taskRepository,
        cursorIDE: this.cursorIDE,
        webSocketManager: null, // No WebSocket for CLI
        logger: this.logger
      });

      await this.autoTestFixSystem.initialize();

      this.logger.info('[TestFixTaskCLI] Services initialized successfully');
      return true;

    } catch (error) {
      this.logger.error('[TestFixTaskCLI] Failed to initialize services:', error.message);
      throw error;
    }
  }

  /**
   * Check if output files exist
   */
  checkOutputFiles() {
    const requiredFiles = [
      'test-report.md',
      'test-report-full.md', 
      'coverage.md',
      'test-analysis-full.json'
    ];

    const missingFiles = [];
    
    for (const file of requiredFiles) {
      const filePath = path.join(this.options.projectPath, file);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      this.logger.error('[TestFixTaskCLI] Missing required output files:');
      missingFiles.forEach(file => this.logger.error(`  - ${file}`));
      this.logger.error('\nPlease run "npm run test:full" first to generate the required output files.');
      return false;
    }

    this.logger.info('[TestFixTaskCLI] All required output files found');
    return true;
  }

  /**
   * Run the test fix workflow
   */
  async run() {
    try {
      // Parse command line arguments
      this.parseArguments();
      
      // Show help if requested
      if (this.options.help) {
        this.showHelp();
        return;
      }

      this.logger.info('[TestFixTaskCLI] Starting test fix task generation...');
      this.logger.info(`[TestFixTaskCLI] Project path: ${this.options.projectPath}`);
      this.logger.info(`[TestFixTaskCLI] Project ID: ${this.options.projectId}`);
      this.logger.info(`[TestFixTaskCLI] User ID: ${this.options.userId}`);
      this.logger.info(`[TestFixTaskCLI] Dry run: ${this.options.dryRun}`);
      this.logger.info(`[TestFixTaskCLI] Clear existing: ${this.options.clearExisting}`);
      this.logger.info(`[TestFixTaskCLI] Load existing tasks: ${this.options.loadExistingTasks}`);
      this.logger.info(`[TestFixTaskCLI] Task status filter: ${this.options.taskStatus || 'none'}`);

      // Check output files only if not loading existing tasks
      if (!this.options.loadExistingTasks && !this.checkOutputFiles()) {
        process.exit(1);
      }

      // Initialize services
      await this.initializeServices();

      // Execute workflow
      const result = await this.autoTestFixSystem.executeAutoTestFixWorkflow({
        projectPath: this.options.projectPath,
        projectId: this.options.projectId,
        userId: this.options.userId,
        stopOnError: this.options.stopOnError,
        dryRun: this.options.dryRun,
        clearExisting: this.options.clearExisting,
        loadExistingTasks: this.options.loadExistingTasks,
        taskStatus: this.options.taskStatus
      });

      // Display results
      this.displayResults(result);

      this.logger.info('[TestFixTaskCLI] Test fix task generation completed successfully');
      return result;

    } catch (error) {
      this.logger.error('[TestFixTaskCLI] Test fix task generation failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Display results
   */
  displayResults(result) {
    logger.log('\n' + '='.repeat(60));
    logger.debug('TEST FIX TASK GENERATION RESULTS');
    logger.log('='.repeat(60));
    
    logger.log(`\nSession ID: ${result.sessionId}`);
    logger.log(`Duration: ${result.duration}ms`);
    logger.log(`Success: ${result.success ? 'Yes' : 'No'}`);
    
    if (result.parsedData) {
      logger.log('\nParsed Data:');
      logger.debug(`  - Failing Tests: ${result.parsedData.failingTests.length}`);
      logger.log(`  - Coverage Issues: ${result.parsedData.coverageIssues.length}`);
      logger.debug(`  - Legacy Tests: ${result.parsedData.legacyTests.length}`);
    }
    
    if (result.tasksGenerated) {
      logger.log(`\nTasks Generated: ${result.tasksGenerated}`);
    }
    
    if (result.processingResult) {
      const pr = result.processingResult;
      logger.log('\nProcessing Results:');
      logger.log(`  - Total Tasks: ${pr.totalTasks}`);
      logger.log(`  - Completed: ${pr.completedTasks}`);
      logger.log(`  - Failed: ${pr.failedTasks}`);
      logger.log(`  - Success Rate: ${pr.totalTasks > 0 ? Math.round((pr.completedTasks / pr.totalTasks) * 100) : 0}%`);
    }
    
    if (result.report && result.report.recommendations) {
      logger.log('\nRecommendations:');
      result.report.recommendations.forEach((rec, index) => {
        logger.log(`  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
      });
    }
    
    logger.log('\n' + '='.repeat(60));
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      if (this.autoTestFixSystem) {
        await this.autoTestFixSystem.cleanup();
      }
      
      if (this.taskRepository) {
        await this.taskRepository.close();
      }
      
      this.logger.info('[TestFixTaskCLI] Cleanup completed');
    } catch (error) {
      this.logger.error('[TestFixTaskCLI] Cleanup failed:', error.message);
    }
  }
}

// Main execution
async function main() {
  const cli = new TestFixTaskCLI();
  
  try {
    await cli.run();
  } catch (error) {
    logger.error('[TestFixTaskCLI] Fatal error:', error.message);
    process.exit(1);
  } finally {
    await cli.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = TestFixTaskCLI; 