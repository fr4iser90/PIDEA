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
const TestReportParser = require('@/domain/services/TestReportParser');
const TestFixTaskGenerator = require('@/domain/services/TestFixTaskGenerator');
const AutoTestFixSystem = require('@/domain/services/auto-test/AutoTestFixSystem');
const SQLiteTaskRepository = require('@/infrastructure/database/SQLiteTaskRepository');
const CursorIDEService = require('@/domain/services/CursorIDEService');
const BrowserManager = require('@/infrastructure/external/BrowserManager');
const IDEManager = require('@/infrastructure/external/IDEManager');

class TestFixTaskCLI {
  constructor() {
    this.logger = console;
    this.options = this.parseOptions();
  }

  /**
   * Parse command line options
   */
  parseOptions() {
    const args = process.argv.slice(2);
    const options = {
      projectPath: process.cwd(),
      projectId: 'system',
      userId: 'system',
      stopOnError: false,
      dryRun: false
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--project-path':
          options.projectPath = args[++i];
          break;
        case '--project-id':
          options.projectId = args[++i];
          break;
        case '--user-id':
          options.userId = args[++i];
          break;
        case '--stop-on-error':
          options.stopOnError = true;
          break;
        case '--dry-run':
          options.dryRun = true;
          break;
        case '--help':
          this.showHelp();
          process.exit(0);
          break;
        default:
          if (arg.startsWith('--')) {
            this.logger.error(`Unknown option: ${arg}`);
            this.showHelp();
            process.exit(1);
          }
      }
    }

    return options;
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log(`
CLI Script: Generate and Process Test Fix Tasks

Usage:
  node scripts/test-management/generate-test-fix-tasks.js [options]

Options:
  --project-path <path>     Project path (default: current directory)
  --project-id <id>         Project ID (default: 'system')
  --user-id <id>            User ID (default: 'system')
  --stop-on-error           Stop processing on first error
  --dry-run                 Only generate tasks, don't process them
  --help                    Show this help

Examples:
  # Generate and process tasks from current directory
  node scripts/test-management/generate-test-fix-tasks.js

  # Generate tasks only (dry run)
  node scripts/test-management/generate-test-fix-tasks.js --dry-run

  # Process with custom project settings
  node scripts/test-management/generate-test-fix-tasks.js --project-path /path/to/project --project-id my-project --user-id user123

  # Stop on first error
  node scripts/test-management/generate-test-fix-tasks.js --stop-on-error
`);
  }

  /**
   * Initialize services
   */
  async initializeServices() {
    try {
      this.logger.info('[TestFixTaskCLI] Initializing services...');

      // Initialize database
      this.taskRepository = new SQLiteTaskRepository();
      await this.taskRepository.initialize();

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
      this.logger.info('[TestFixTaskCLI] Starting test fix task generation...');
      this.logger.info(`[TestFixTaskCLI] Project path: ${this.options.projectPath}`);
      this.logger.info(`[TestFixTaskCLI] Project ID: ${this.options.projectId}`);
      this.logger.info(`[TestFixTaskCLI] User ID: ${this.options.userId}`);
      this.logger.info(`[TestFixTaskCLI] Dry run: ${this.options.dryRun}`);

      // Check output files
      if (!this.checkOutputFiles()) {
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
        dryRun: this.options.dryRun
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
    console.log('\n' + '='.repeat(60));
    console.log('TEST FIX TASK GENERATION RESULTS');
    console.log('='.repeat(60));
    
    console.log(`\nSession ID: ${result.sessionId}`);
    console.log(`Duration: ${result.duration}ms`);
    console.log(`Success: ${result.success ? 'Yes' : 'No'}`);
    
    if (result.parsedData) {
      console.log('\nParsed Data:');
      console.log(`  - Failing Tests: ${result.parsedData.failingTests.length}`);
      console.log(`  - Coverage Issues: ${result.parsedData.coverageIssues.length}`);
      console.log(`  - Legacy Tests: ${result.parsedData.legacyTests.length}`);
    }
    
    if (result.tasksGenerated) {
      console.log(`\nTasks Generated: ${result.tasksGenerated}`);
    }
    
    if (result.processingResult) {
      const pr = result.processingResult;
      console.log('\nProcessing Results:');
      console.log(`  - Total Tasks: ${pr.totalTasks}`);
      console.log(`  - Completed: ${pr.completedTasks}`);
      console.log(`  - Failed: ${pr.failedTasks}`);
      console.log(`  - Success Rate: ${pr.totalTasks > 0 ? Math.round((pr.completedTasks / pr.totalTasks) * 100) : 0}%`);
    }
    
    if (result.report && result.report.recommendations) {
      console.log('\nRecommendations:');
      result.report.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
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
    console.error('[TestFixTaskCLI] Fatal error:', error.message);
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