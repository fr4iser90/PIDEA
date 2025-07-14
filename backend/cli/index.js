
#!/usr/bin/env node

/**
 * VibeCoder Task Management CLI - Main Entry Point
 * The famous 'task auto' command starts here!
 */

// Load module aliases BEFORE any other imports
require('module-alias/register');

const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

// Import CLI components
const TaskCLI = require('./TaskCLI');
const TaskCommands = require('./TaskCommands');
const TaskInteractiveCLI = require('./TaskInteractiveCLI');
const TaskProgressUI = require('./TaskProgressUI');

// Import backend services (these would be initialized in a real app)
const Application = require('../Application');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class TaskCLIMain {
    constructor() {
        this.application = null;
        this.taskCLI = null;
        this.taskCommands = null;
        this.interactiveCLI = null;
        this.progressUI = null;
        
        this.setupErrorHandling();
    }

    /**
     * Setup error handling
     */
    setupErrorHandling() {
        process.on('uncaughtException', (error) => {
            logger.error('\n❌ Uncaught Exception:', error.message);
            if (process.env.DEBUG) {
                logger.error(error.stack);
            }
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('\n❌ Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });

        process.on('SIGINT', () => {
            logger.info('\n👋 Thanks for using VibeCoder Task Management!');
            this.cleanup();
            process.exit(0);
        });
    }

    /**
     * Initialize the CLI application
     */
    async initialize() {
        try {
            logger.info('🚀 Initializing VibeCoder Task Management CLI...');
            
            // Initialize backend application
            this.application = new Application();
            await this.application.initialize();

            // Get dependencies from application
            const dependencies = {
                commandBus: this.application.commandBus,
                queryBus: this.application.queryBus,
                aiService: this.application.aiService,
                taskExecutionEngine: this.application.taskExecutionEngine,
                logger: this.application.logger
            };

            // Initialize CLI components
            this.taskCommands = new TaskCommands(dependencies);
            this.progressUI = new TaskProgressUI();
            this.interactiveCLI = new TaskInteractiveCLI(dependencies);
            this.taskCLI = new TaskCLI(dependencies);

            // Setup event forwarding
            this.setupEventForwarding();

            logger.info('✅ CLI initialized successfully!\n');

        } catch (error) {
            logger.error('❌ Failed to initialize CLI:', error.message);
            if (process.env.DEBUG) {
                logger.error(error.stack);
            }
            process.exit(1);
        }
    }

    /**
     * Setup event forwarding between components
     */
    setupEventForwarding() {
        // Forward task execution events to progress UI
        this.application.taskExecutionEngine.on('execution:start', (data) => {
            this.progressUI.emit('execution:start', data);
        });

        this.application.taskExecutionEngine.on('execution:progress', (data) => {
            this.progressUI.emit('execution:progress', data);
        });

        this.application.taskExecutionEngine.on('execution:complete', (data) => {
            this.progressUI.emit('execution:complete', data);
        });

        this.application.taskExecutionEngine.on('execution:error', (data) => {
            this.progressUI.emit('execution:error', data);
        });

        // Forward AI events to progress UI
        this.application.aiService.on('ai:request', (data) => {
            this.progressUI.emit('ai:request', data);
        });

        this.application.aiService.on('ai:response', (data) => {
            this.progressUI.emit('ai:response', data);
        });

        this.application.aiService.on('ai:error', (data) => {
            this.progressUI.emit('ai:error', data);
        });
    }

    /**
     * Parse command line arguments and execute
     * @param {Array} args - Command line arguments
     */
    async run(args) {
        try {
            await this.initialize();

            // Check if running in interactive mode
            if (args.length === 0 || args.includes('--interactive') || args.includes('-i')) {
                await this.runInteractiveMode();
                return;
            }

            // Check for special commands
            const command = args[0];
            
            if (command === 'auto') {
                await this.runAutoMode(args.slice(1));
                return;
            }

            if (command === 'dashboard') {
                await this.runDashboard();
                return;
            }

            if (command === 'demo') {
                await this.runDemo();
                return;
            }

            if (command === 'sequential') {
                await this.runSequentialMode(args.slice(1));
                return;
            }

            // Run standard CLI
            await this.taskCLI.parse(args);

        } catch (error) {
            logger.error('❌ CLI execution failed:', error.message);
            if (process.env.DEBUG) {
                logger.error(error.stack);
            }
            process.exit(1);
        }
    }

    /**
     * Run interactive mode
     */
    async runInteractiveMode() {
        logger.info(chalk.blue.bold('\n🤖 VibeCoder Interactive Task Management'));
        logger.info(chalk.gray('Welcome to the interactive CLI!\n'));
        
        await this.interactiveCLI.startInteractiveSession();
    }

    /**
     * Run VibeCoder Auto Mode
     * @param {Array} args - Additional arguments
     */
    async runAutoMode(args) {
        logger.info(chalk.blue.bold('\n🚀 VibeCoder Auto Mode'));
        logger.info(chalk.gray('Zero configuration, full automation\n'));

        // Parse auto mode options
        const options = this.parseAutoModeOptions(args);
        
        // Start progress UI
        this.progressUI.startSession({
            id: `auto-${Date.now()}`,
            mode: 'auto',
            projectName: options.project ? path.basename(options.project) : 'Auto-detected'
        });

        try {
            // Auto-detect project if not specified
            const projectPath = options.project || await this.autoDetectProject();
            if (!projectPath) {
                logger.error(chalk.red('❌ No project found. Please specify a project path.'));
                process.exit(1);
            }

            logger.info(chalk.green(`📁 Project: ${path.basename(projectPath)}`));

            // Execute auto mode
            const command = {
                projectPath,
                mode: options.mode,
                options: {
                    aiModel: options.aiModel,
                    dryRun: options.dryRun
                }
            };

            if (options.dryRun) {
                logger.info(chalk.yellow('🔍 Running in dry-run mode...'));
                const analysis = await this.application.commandBus.execute('AnalyzeProjectCommand', {
                    projectPath,
                    analysisType: 'full',
                    includeAI: true
                });

                this.displayAutoModePreview(analysis, projectPath);
                return;
            }

            logger.info(chalk.blue('🤖 Starting AI-powered automation...'));
            const result = await this.application.commandBus.execute('AutoModeCommand', command);

            this.progressUI.stopSession();
            this.displayAutoModeResults(result, projectPath);

        } catch (error) {
            this.progressUI.stopSession();
            logger.error(chalk.red(`❌ Auto mode failed: ${error.message}`));
            if (process.env.DEBUG) {
                logger.error(error.stack);
            }
            process.exit(1);
        }
    }

    /**
     * Run live dashboard
     */
    async runDashboard() {
        logger.info(chalk.blue.bold('\n📊 VibeCoder Live Dashboard'));
        logger.info(chalk.gray('Real-time task monitoring\n'));

        this.progressUI.showLiveDashboard();
    }

    /**
     * Run demo mode
     */
    async runDemo() {
        logger.info(chalk.blue.bold('\n🎬 VibeCoder Demo Mode'));
        logger.info(chalk.gray('Demonstrating capabilities...\n'));

        // Start progress UI
        this.progressUI.startSession({
            id: `demo-${Date.now()}`,
            mode: 'demo',
            projectName: 'Demo Project'
        });

        try {
            // Simulate demo tasks
            await this.runDemoTasks();
            
            this.progressUI.stopSession();
            logger.info(chalk.green('\n✅ Demo completed successfully!'));

        } catch (error) {
            this.progressUI.stopSession();
            logger.error(chalk.red(`❌ Demo failed: ${error.message}`));
        }
    }

    /**
     * Parse auto mode options
     * @param {Array} args - Command arguments
     * @returns {Object} Parsed options
     */
    parseAutoModeOptions(args) {
        const options = {
            project: null,
            mode: 'full',
            aiModel: 'gpt-4',
            dryRun: false,
            noConfirm: false
        };

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            
            switch (arg) {
                case '-p':
                case '--project':
                    options.project = args[++i];
                    break;
                case '-m':
                case '--mode':
                    options.mode = args[++i];
                    break;
                case '--ai-model':
                    options.aiModel = args[++i];
                    break;
                case '--dry-run':
                    options.dryRun = true;
                    break;
                case '--no-confirm':
                    options.noConfirm = true;
                    break;
            }
        }

        return options;
    }

    /**
     * Auto-detect project path
     * @returns {Promise<string|null>} Project path or null
     */
    async autoDetectProject() {
        try {
            const cwd = process.cwd();
            const files = await fs.promises.readdir(cwd);
            
            const projectIndicators = [
                'package.json', 'pyproject.toml', 'requirements.txt',
                'Cargo.toml', 'composer.json', 'pom.xml', 'build.gradle',
                '.git', 'README.md', 'src', 'app', 'lib'
            ];

            for (const indicator of projectIndicators) {
                if (files.includes(indicator)) {
                    return cwd;
                }
            }

            // Check parent directories
            const parentDir = path.dirname(cwd);
            if (parentDir !== cwd) {
                const parentFiles = await fs.promises.readdir(parentDir);
                for (const indicator of projectIndicators) {
                    if (parentFiles.includes(indicator)) {
                        return parentDir;
                    }
                }
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Display auto mode preview
     * @param {Object} analysis - Analysis results
     * @param {string} projectPath - Project path
     */
    displayAutoModePreview(analysis, projectPath) {
        const projectName = path.basename(projectPath);
        
        logger.info(chalk.green('\n✅ VibeCoder Auto Mode Preview:'));
        logger.info(chalk.blue(`\n📁 Project: ${projectName}`));
        
        // Display project structure
        logger.info(chalk.blue('\n🏗️  Project Structure:'));
        logger.info(chalk.gray(`   Type: ${chalk.white(analysis.projectStructure?.type || 'Unknown')}`));
        logger.info(chalk.gray(`   Files: ${chalk.white(analysis.projectStructure?.files?.length || 0)}`));

        // Display insights
        if (analysis.insights && analysis.insights.length > 0) {
            logger.info(chalk.blue('\n💡 Key Insights:'));
            analysis.insights.slice(0, 5).forEach((insight, index) => {
                logger.info(chalk.gray(`   ${index + 1}. ${chalk.white(insight)}`));
            });
        }

        // Display recommendations
        if (analysis.recommendations && analysis.recommendations.length > 0) {
            logger.info(chalk.blue('\n🎯 Recommended Actions:'));
            analysis.recommendations.slice(0, 5).forEach((rec, index) => {
                logger.info(chalk.gray(`   ${index + 1}. ${chalk.white(rec.title)}`));
                logger.info(chalk.gray(`      ${chalk.white(rec.description)}`));
            });
        }

        logger.info(chalk.yellow('\n💡 Run without --dry-run to execute these actions automatically.'));
    }

    /**
     * Display auto mode results
     * @param {Object} result - Auto mode results
     * @param {string} projectPath - Project path
     */
    displayAutoModeResults(result, projectPath) {
        const projectName = path.basename(projectPath);
        
        logger.info(chalk.green('\n✅ VibeCoder Auto Mode Completed Successfully!'));
        logger.info(chalk.blue(`\n📁 Project: ${projectName}`));

        // Display session info
        if (result.session) {
            logger.info(chalk.blue('\n🔄 Session Information:'));
            logger.info(chalk.gray(`   Session ID: ${chalk.white(result.session.id)}`));
            logger.info(chalk.gray(`   Duration: ${chalk.white(result.session.duration)}ms`));
            logger.info(chalk.gray(`   Status: ${chalk.white(result.session.status)}`));
        }

        // Display tasks executed
        if (result.tasks && result.tasks.length > 0) {
            logger.info(chalk.blue('\n📋 Tasks Executed:'));
            result.tasks.forEach((task, index) => {
                const status = task.status === 'completed' ? '✅' : '❌';
                logger.info(chalk.gray(`   ${index + 1}. ${status} ${chalk.white(task.title)}`));
            });
        }

        // Display scripts generated
        if (result.scripts && result.scripts.length > 0) {
            logger.info(chalk.blue('\n🔧 Scripts Generated:'));
            result.scripts.forEach((script, index) => {
                logger.info(chalk.gray(`   ${index + 1}. ${chalk.white(script.name)} (${script.type})`));
            });
        }

        // Display analysis summary
        if (result.analysis) {
            logger.info(chalk.blue('\n📊 Analysis Summary:'));
            logger.info(chalk.gray(`   Files analyzed: ${chalk.white(result.analysis.metrics?.filesAnalyzed || 0)}`));
            logger.info(chalk.gray(`   Issues found: ${chalk.white(result.analysis.insights?.length || 0)}`));
            logger.info(chalk.gray(`   Recommendations: ${chalk.white(result.analysis.recommendations?.length || 0)}`));
        }

        logger.info(chalk.green('\n🎉 Your project has been automatically analyzed and optimized!'));
        logger.info(chalk.yellow('💡 Check the generated reports and scripts for details.'));
    }

    /**
     * Run Sequential Task Execution Mode
     * @param {Array} args - Additional arguments
     */
    async runSequentialMode(args) {
        logger.info(chalk.blue.bold('\n🔄 Sequential Task Execution Mode'));
        logger.info(chalk.gray('Execute tasks sequentially via IDE chat\n'));

        // Parse sequential mode options
        const options = this.parseSequentialModeOptions(args);
        
        // Start progress UI
        this.progressUI.startSession({
            id: `sequential-${Date.now()}`,
            type: 'sequential',
            title: 'Sequential Task Execution',
            description: 'Executing tasks one by one via IDE chat'
        });

        try {
            // Execute sequential tasks
            const result = await this.taskCommands.executeSequentialTasks(options);
            
            // Display results
            this.displaySequentialModeResults(result);
            
        } catch (error) {
            logger.error('❌ Sequential mode failed:', error.message);
            this.progressUI.emit('execution:error', { error: error.message });
        } finally {
            this.progressUI.endSession();
        }
    }

    /**
     * Parse sequential mode options
     * @param {Array} args - Command line arguments
     * @returns {Object} Parsed options
     */
    parseSequentialModeOptions(args) {
        const options = {
            projectPath: process.cwd(),
            timeout: 300000, // 5 minutes per task
            autoCommit: true,
            autoBranch: true,
            verbose: false,
            fromDatabase: false,
            fromTestReports: false,
            fromCoverage: false
        };

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            
            switch (arg) {
                case '--project':
                case '-p':
                    options.projectPath = args[++i];
                    break;
                    
                case '--timeout':
                case '-t':
                    options.timeout = parseInt(args[++i]) * 1000; // Convert to milliseconds
                    break;
                    
                case '--no-commit':
                    options.autoCommit = false;
                    break;
                    
                case '--no-branch':
                    options.autoBranch = false;
                    break;
                    
                case '--verbose':
                case '-v':
                    options.verbose = true;
                    break;
                    
                case '--from-database':
                    options.fromDatabase = true;
                    break;
                    
                case '--from-test-reports':
                    options.fromTestReports = true;
                    break;
                    
                case '--from-coverage':
                    options.fromCoverage = true;
                    break;
                    
                case '--help':
                case '-h':
                    this.displaySequentialModeHelp();
                    process.exit(0);
                    break;
            }
        }

        return options;
    }

    /**
     * Display sequential mode help
     */
    displaySequentialModeHelp() {
        logger.info(chalk.blue.bold('\n🔄 Sequential Task Execution Mode'));
        logger.info(chalk.gray('Execute tasks sequentially via IDE chat\n'));
        
        logger.info(chalk.yellow('Usage:'));
        logger.info('  node cli/index.js sequential [options]\n');
        
        logger.info(chalk.yellow('Options:'));
        logger.info('  --project, -p <path>     Project path (default: current directory)');
        logger.info('  --timeout, -t <seconds>  Timeout per task in seconds (default: 300)');
        logger.info('  --no-commit              Disable auto-commit after each task');
        logger.info('  --no-branch              Disable auto-branch creation');
        logger.info('  --verbose, -v            Show detailed results');
        logger.info('  --from-database          Get tasks from database');
        logger.debug('  --from-test-reports      Get tasks from test reports');
        logger.info('  --from-coverage          Get tasks from coverage report');
        logger.info('  --help, -h               Show this help\n');
        
        logger.info(chalk.yellow('Examples:'));
        logger.info('  node cli/index.js sequential');
        logger.info('  node cli/index.js sequential --verbose --timeout 600');
        logger.debug('  node cli/index.js sequential --from-test-reports --project /path/to/project');
    }

    /**
     * Display sequential mode results
     * @param {Object} result - Execution result
     */
    displaySequentialModeResults(result) {
        logger.info(chalk.green.bold('\n🎉 Sequential Task Execution Completed!'));
        
        logger.info(chalk.blue('\n📊 Summary:'));
        logger.info(`  Total Tasks: ${result.totalTasks}`);
        logger.info(`  Successful: ${chalk.green(result.successful)}`);
        logger.info(`  Failed: ${chalk.red(result.failed)}`);
        logger.info(`  Total Duration: ${chalk.yellow(Math.round(result.totalDuration / 1000))}s`);
        logger.info(`  Average Duration: ${chalk.yellow(Math.round(result.averageDuration / 1000))}s per task`);
        
        if (result.success) {
            logger.info(chalk.green('\n✅ All tasks completed successfully!'));
        } else {
            logger.info(chalk.yellow('\n⚠️  Some tasks failed. Check the details above.'));
        }
        
        // Show task details if verbose
        if (result.results && result.results.length > 0) {
            logger.info(chalk.blue('\n📝 Task Details:'));
            result.results.forEach((taskResult, index) => {
                const status = taskResult.success ? chalk.green('✅') : chalk.red('❌');
                const duration = Math.round(taskResult.duration / 1000);
                
                logger.info(`  ${status} Task ${index + 1}: ${taskResult.taskTitle}`);
                logger.info(`     Duration: ${chalk.yellow(duration)}s`);
                
                if (!taskResult.success && taskResult.error) {
                    logger.info(`     Error: ${chalk.red(taskResult.error)}`);
                }
            });
        }
    }

    /**
     * Run demo tasks
     */
    async runDemoTasks() {
        const demoTasks = [
            { title: 'Project Analysis', type: 'analysis', duration: 2000 },
            { title: 'Code Quality Check', type: 'quality', duration: 1500 },
            { title: 'Security Scan', type: 'security', duration: 1800 },
            { title: 'Performance Optimization', type: 'optimization', duration: 2500 },
            { title: 'Script Generation', type: 'script', duration: 1200 }
        ];

        for (const demoTask of demoTasks) {
            // Simulate task creation
            this.progressUI.emit('task:created', {
                task: {
                    id: `demo-${Date.now()}`,
                    title: demoTask.title,
                    type: demoTask.type,
                    status: 'active',
                    createdAt: new Date()
                }
            });

            // Simulate execution start
            this.progressUI.emit('execution:start', {
                execution: { id: `exec-${Date.now()}` },
                taskTitle: demoTask.title
            });

            // Simulate progress updates
            for (let progress = 0; progress <= 100; progress += 20) {
                await new Promise(resolve => setTimeout(resolve, demoTask.duration / 5));
                
                this.progressUI.emit('execution:progress', {
                    executionId: `exec-${Date.now()}`,
                    taskTitle: demoTask.title,
                    progress,
                    currentStep: `Step ${Math.floor(progress / 20) + 1}`,
                    status: 'active'
                });
            }

            // Simulate completion
            this.progressUI.emit('execution:complete', {
                executionId: `exec-${Date.now()}`,
                taskTitle: demoTask.title
            });
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.progressUI) {
            this.progressUI.cleanup();
        }
        
        if (this.application) {
            this.application.cleanup();
        }
    }
}

// Main execution
if (require.main === module) {
    const cli = new TaskCLIMain();
    cli.run(process.argv.slice(2)).catch(error => {
        logger.error('❌ CLI failed to start:', error.message);
        process.exit(1);
    });
}

module.exports = TaskCLIMain; 