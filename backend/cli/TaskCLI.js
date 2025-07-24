#!/usr/bin/env node
require('module-alias/register');

/**
 * TaskCLI - Main command-line interface for task management system
 */
const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const Table = require('cli-table3');
const fs = require('fs').promises;
const path = require('path');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class TaskCLI {
    constructor(dependencies = {}) {
        this.commandBus = dependencies.commandBus;
        this.queryBus = dependencies.queryBus;
        this.aiService = dependencies.aiService;
        // TaskExecutionEngine removed - functionality moved to WorkflowController
        this.logger = dependencies.logger || console;
        
        this.program = new Command();
        this.spinner = null;
        this.currentProject = null;
        
        this.setupCommands();
        this.setupGlobalOptions();
    }

    /**
     * Setup global CLI options
     */
    setupGlobalOptions() {
        this.program
            .name('task')
            .description('VibeCoder Task Management System - Complete Development Automation')
            .version('1.0.0')
            .option('-v, --verbose', 'Enable verbose logging')
            .option('-q, --quiet', 'Suppress output')
            .option('--no-color', 'Disable colored output')
            .option('--config <path>', 'Path to configuration file')
            .option('--project <path>', 'Project path to work with');
    }

    /**
     * Setup CLI commands
     */
    setupCommands() {
        this.setupAutoCommand();
        this.setupAnalysisCommands();
        this.setupTaskCommands();
        this.setupScriptCommands();
        this.setupSpecializedCommands();
        this.setupAdminCommands();
        this.setupTemplateCommands();
        this.setupStrategyCommands();
        this.setupAICommands();
        this.setupLayerViolationCommands();
    }

    /**
     * Setup auto mode command (VibeCoder)
     */
    setupAutoCommand() {
        this.program
            .command('auto')
            .description('🚀 VibeCoder Auto Mode - Zero configuration, full automation')
            .option('-p, --project <path>', 'Project path (auto-detected if not specified)')
            .option('-m, --mode <mode>', 'Auto mode type (full, analysis, optimization, security)', 'full')
            .option('--ai-model <model>', 'AI model to use (gpt-4, claude-3, etc.)', 'gpt-4')
            .option('--no-confirm', 'Skip confirmation prompts')
            .option('--dry-run', 'Show what would be done without executing')
            .action(async (options) => {
                await this.executeAutoMode(options);
            });
    }

    /**
     * Setup analysis commands
     */
    setupAnalysisCommands() {
        const analysis = this.program
            .command('analyze')
            .description('AI-powered project analysis and insights');

        analysis
            .command('project [path]')
            .description('Analyze project structure and provide insights')
            .option('--deep', 'Perform deep analysis')
            .option('--ai', 'Use AI-powered analysis')
            .option('--export <format>', 'Export results (json, csv, html)')
            .action(async (path, options) => {
                await this.analyzeProject(path, options);
            });

        analysis
            .command('code [path]')
            .description('Analyze code quality and provide recommendations')
            .option('--quality', 'Focus on code quality')
            .option('--performance', 'Focus on performance')
            .option('--security', 'Focus on security')
            .action(async (path, options) => {
                await this.analyzeCode(path, options);
            });
    }

    /**
     * Setup task commands
     */
    setupTaskCommands() {
        const task = this.program
            .command('task')
            .description('Task management operations');

        task
            .command('list')
            .description('List all tasks')
            .option('--status <status>', 'Filter by status')
            .option('--priority <priority>', 'Filter by priority')
            .option('--type <type>', 'Filter by type')
            .option('--format <format>', 'Output format (table, json, csv)')
            .action(async (options) => {
                await this.listTasks(options);
            });

        task
            .command('create')
            .description('Create a new task')
            .option('--title <title>', 'Task title')
            .option('--description <description>', 'Task description')
            .option('--type <type>', 'Task type')
            .option('--priority <priority>', 'Task priority')
            .action(async (options) => {
                await this.createTask(options);
            });

        task
            .command('execute <id>')
            .description('Execute a task')
            .option('--options <json>', 'Execution options')
            .action(async (id, options) => {
                await this.executeTask(id, options);
            });

        task
            .command('info <id>')
            .description('Show task information')
            .action(async (id) => {
                await this.showTaskInfo(id);
            });
    }

    /**
     * Setup script commands
     */
    setupScriptCommands() {
        const script = this.program
            .command('script')
            .description('Script generation and execution');

        script
            .command('generate <type>')
            .description('Generate a script')
            .option('--target <path>', 'Target path')
            .option('--template <name>', 'Template name')
            .option('--output <path>', 'Output path')
            .action(async (type, options) => {
                await this.generateScript(type, options);
            });

        script
            .command('execute <path>')
            .description('Execute a script')
            .option('--env <environment>', 'Environment')
            .option('--args <args>', 'Script arguments')
            .action(async (scriptPath, options) => {
                await this.executeScript(scriptPath, options);
            });

        script
            .command('list')
            .description('List generated scripts')
            .action(async () => {
                await this.listScripts();
            });
    }

    /**
     * Setup specialized commands
     */
    setupSpecializedCommands() {
        this.program
            .command('refactor [target]')
            .description('Refactor code with AI assistance')
            .option('--ai', 'Use AI-powered refactoring')
            .option('--suggestions', 'Show refactoring suggestions')
            .option('--auto-apply', 'Automatically apply refactoring')
            .action(async (target, options) => {
                await this.refactorCode(target, options);
            });

        this.program
            .command('optimize [target]')
            .description('Optimize code performance and quality')
            .option('--performance', 'Focus on performance optimization')
            .option('--quality', 'Focus on code quality')
            .option('--ai', 'Use AI-powered optimization')
            .action(async (target, options) => {
                await this.optimizeCode(target, options);
            });

        this.program
            .command('security [target]')
            .description('Security analysis and fixes')
            .option('--scan', 'Perform security scan')
            .option('--fix', 'Automatically fix security issues')
            .option('--report', 'Generate security report')
            .action(async (target, options) => {
                await this.securityAnalysis(target, options);
            });

        this.program
            .command('test [scope]')
            .description('Run tests and generate coverage')
            .option('--coverage', 'Generate coverage report')
            .option('--watch', 'Watch mode')
            .option('--ci', 'CI mode')
            .action(async (scope, options) => {
                await this.runTests(scope, options);
            });

        this.program
            .command('deploy [environment]')
            .description('Deploy application')
            .option('--build', 'Build before deployment')
            .option('--test', 'Run tests before deployment')
            .option('--rollback', 'Rollback to previous version')
            .action(async (environment, options) => {
                await this.deployApplication(environment, options);
            });
    }

    /**
     * Setup admin commands
     */
    setupAdminCommands() {
        const admin = this.program
            .command('admin')
            .description('Administrative operations');

        admin
            .command('stats')
            .description('Show system statistics')
            .action(async () => {
                await this.showStats();
            });

        admin
            .command('health')
            .description('Check system health')
            .action(async () => {
                await this.checkHealth();
            });

        admin
            .command('cleanup')
            .description('Clean up old data')
            .option('--days <days>', 'Keep data for N days', '30')
            .action(async (options) => {
                await this.cleanupData(options);
            });
    }

    /**
     * Setup template commands
     */
    setupTemplateCommands() {
        const template = this.program
            .command('template')
            .description('Template management');

        template
            .command('list')
            .description('List available templates')
            .action(async () => {
                await this.listTemplates();
            });

        template
            .command('create <name>')
            .description('Create a new template')
            .option('--type <type>', 'Template type')
            .action(async (name, options) => {
                await this.createTemplate(name, options);
            });

        template
            .command('edit <name>')
            .description('Edit a template')
            .action(async (name) => {
                await this.editTemplate(name);
            });
    }

    /**
     * Setup strategy commands
     */
    setupStrategyCommands() {
        const strategy = this.program
            .command('strategy')
            .description('Strategy management');

        strategy
            .command('list')
            .description('List available strategies')
            .action(async () => {
                await this.listStrategies();
            });

        strategy
            .command('apply <strategy>')
            .description('Apply a strategy')
            .option('--target <path>', 'Target path')
            .action(async (strategy, options) => {
                await this.applyStrategy(strategy, options);
            });
    }

    /**
     * Setup AI commands
     */
    setupAICommands() {
        const ai = this.program
            .command('ai')
            .description('AI management and configuration');

        ai
            .command('configure')
            .description('Configure AI settings')
            .action(async () => {
                await this.configureAI();
            });

        ai
            .command('test')
            .description('Test AI capabilities')
            .action(async () => {
                await this.testAI();
            });

        ai
            .command('models')
            .description('List available AI models')
            .action(async () => {
                await this.listAIModels();
            });
    }

    /**
     * Setup layer violation commands
     */
    setupLayerViolationCommands() {
        const LayerViolationCommands = require('./LayerViolationCommands');
        const layerViolationCommands = new LayerViolationCommands({
            commandBus: this.commandBus,
            queryBus: this.queryBus,
            logger: this.logger
        });
        
        layerViolationCommands.setupCommands(this.program);
    }

    /**
     * Execute auto mode (VibeCoder)
     * @param {Object} options - Command options
     */
    async executeAutoMode(options) {
        try {
            this.startSpinner('🚀 Starting VibeCoder Auto Mode...');

            // Auto-detect project if not specified
            const projectPath = options.project || await this.autoDetectProject();
            if (!projectPath) {
                this.stopSpinner();
                logger.error(chalk.red('❌ No project found. Please specify a project path.'));
                process.exit(1);
            }

            this.updateSpinner(`📁 Detected project: ${path.basename(projectPath)}`);

            // Confirm execution unless --no-confirm is specified
            if (!options.noConfirm && !options.dryRun) {
                this.stopSpinner();
                const confirmed = await this.confirmAutoMode(projectPath, options.mode);
                if (!confirmed) {
                    logger.info(chalk.yellow('⏹️  Auto mode cancelled.'));
                    return;
                }
                this.startSpinner('🚀 Executing VibeCoder Auto Mode...');
            }

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
                this.updateSpinner('🔍 Analyzing project (dry run)...');
                const analysis = await this.commandBus.execute('AnalyzeProjectCommand', {
                    projectPath,
                    analysisType: 'full',
                    includeAI: true
                });

                this.stopSpinner();
                this.displayAutoModePreview(analysis, projectPath);
                return;
            }

            this.updateSpinner('🤖 Executing AI-powered automation...');
            const result = await this.commandBus.execute('AutoModeCommand', command);

            this.stopSpinner();
            this.displayAutoModeResults(result, projectPath);

        } catch (error) {
            this.stopSpinner();
            logger.error(chalk.red(`❌ Auto mode failed: ${error.message}`));
            if (this.program.opts().verbose) {
                logger.error(error.stack);
            }
            process.exit(1);
        }
    }

    /**
     * Auto-detect project path
     * @returns {Promise<string|null>} Project path or null
     */
    async autoDetectProject() {
        try {
            const cwd = process.cwd();
            const files = await fs.readdir(cwd);
            
            // Look for common project indicators
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
                const parentFiles = await fs.readdir(parentDir);
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
     * Confirm auto mode execution
     * @param {string} projectPath - Project path
     * @param {string} mode - Auto mode type
     * @returns {Promise<boolean>} Confirmation result
     */
    async confirmAutoMode(projectPath, mode) {
        const projectName = path.basename(projectPath);
        
        logger.info(chalk.blue('\n🤖 VibeCoder Auto Mode Configuration:'));
        logger.info(chalk.gray(`   Project: ${chalk.white(projectName)}`));
        logger.info(chalk.gray(`   Path: ${chalk.white(projectPath)}`));
        logger.info(chalk.gray(`   Mode: ${chalk.white(mode)}`));
        logger.info(chalk.gray('   This will analyze your project and automatically:'));
        
        const actions = this.getAutoModeActions(mode);
        actions.forEach(action => {
            logger.info(chalk.gray(`   • ${action}`));
        });

        const { confirmed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmed',
                message: chalk.yellow('Proceed with VibeCoder Auto Mode?'),
                default: true
            }
        ]);

        return confirmed;
    }

    /**
     * Get auto mode actions description
     * @param {string} mode - Auto mode type
     * @returns {Array} Action descriptions
     */
    getAutoModeActions(mode) {
        const actions = {
            full: [
                'Analyze project structure and architecture',
                'Identify code quality issues and improvements',
                'Generate task suggestions and priorities',
                'Create optimization scripts',
                'Perform security analysis',
                'Generate comprehensive report'
            ],
            analysis: [
                'Analyze project structure',
                'Identify architectural patterns',
                'Generate insights and recommendations'
            ],
            optimization: [
                'Analyze performance bottlenecks',
                'Generate optimization scripts',
                'Apply code improvements'
            ],
            security: [
                'Perform security vulnerability scan',
                'Identify security issues',
                'Generate security fixes'
            ]
        };

        return actions[mode] || actions.full;
    }

    /**
     * Display auto mode preview (dry run)
     * @param {Object} analysis - Analysis results
     * @param {string} projectPath - Project path
     */
    displayAutoModePreview(analysis, projectPath) {
        const projectName = path.basename(projectPath);
        
        logger.info(chalk.green('\n✅ VibeCoder Auto Mode Preview:'));
        logger.info(chalk.blue(`\n📁 Project: ${projectName}`));
        
        // Display project structure
        logger.info(chalk.blue('\n🏗️  Project Structure:'));
        logger.info(chalk.gray(`   Type: ${chalk.white(analysis.projectStructure.type)}`));
        logger.info(chalk.gray(`   Files: ${chalk.white(analysis.projectStructure.files.length)}`));
        logger.info(chalk.gray(`   Dependencies: ${chalk.white(Object.keys(analysis.projectStructure.dependencies.dependencies || {}).length)}`));

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
     * Start spinner
     * @param {string} text - Spinner text
     */
    startSpinner(text) {
        this.spinner = ora(text).start();
    }

    /**
     * Update spinner text
     * @param {string} text - New spinner text
     */
    updateSpinner(text) {
        if (this.spinner) {
            this.spinner.text = text;
        }
    }

    /**
     * Stop spinner
     */
    stopSpinner() {
        if (this.spinner) {
            this.spinner.stop();
            this.spinner = null;
        }
    }

    /**
     * Parse CLI arguments and execute
     * @param {Array} args - Command line arguments
     */
    async parse(args) {
        try {
            await this.program.parseAsync(args);
        } catch (error) {
            logger.error(chalk.red(`❌ CLI Error: ${error.message}`));
            if (this.program.opts().verbose) {
                logger.error(error.stack);
            }
            process.exit(1);
        }
    }

    // Placeholder methods for other commands
    async analyzeProject(projectPath, options) {
        logger.info(chalk.blue('🔍 Project analysis command - Implementation pending'));
    }

    async analyzeCode(codePath, options) {
        logger.info(chalk.blue('🔍 Code analysis command - Implementation pending'));
    }

    async listTasks(options) {
        logger.info(chalk.blue('📋 List tasks command - Implementation pending'));
    }

    async createTask(options) {
        logger.info(chalk.blue('➕ Create task command - Implementation pending'));
    }

    async executeTask(taskId, options) {
        logger.info(chalk.blue('▶️  Execute task command - Implementation pending'));
    }

    async showTaskInfo(taskId) {
        logger.info(chalk.blue('ℹ️  Task info command - Implementation pending'));
    }

    async generateScript(type, options) {
        logger.info(chalk.blue('🔧 Generate script command - Implementation pending'));
    }

    async executeScript(scriptPath, options) {
        logger.info(chalk.blue('▶️  Execute script command - Implementation pending'));
    }

    async listScripts() {
        logger.info(chalk.blue('📋 List scripts command - Implementation pending'));
    }

    async refactorCode(target, options) {
        logger.info(chalk.blue('🔨 Refactor code command - Implementation pending'));
    }

    async optimizeCode(target, options) {
        logger.info(chalk.blue('⚡ Optimize code command - Implementation pending'));
    }

    async securityAnalysis(target, options) {
        logger.info(chalk.blue('🔒 Security analysis command - Implementation pending'));
    }

    async runTests(scope, options) {
        logger.debug(chalk.blue('🧪 Run tests command - Implementation pending'));
    }

    async deployApplication(environment, options) {
        logger.info(chalk.blue('🚀 Deploy application command - Implementation pending'));
    }

    async showStats() {
        logger.info(chalk.blue('📊 Show stats command - Implementation pending'));
    }

    async checkHealth() {
        logger.info(chalk.blue('🏥 Health check command - Implementation pending'));
    }

    async cleanupData(options) {
        logger.info(chalk.blue('🧹 Cleanup data command - Implementation pending'));
    }

    async listTemplates() {
        logger.debug(chalk.blue('📋 List templates command - Implementation pending'));
    }

    async createTemplate(name, options) {
        logger.debug(chalk.blue('➕ Create template command - Implementation pending'));
    }

    async editTemplate(name) {
        logger.debug(chalk.blue('✏️  Edit template command - Implementation pending'));
    }

    async listStrategies() {
        logger.info(chalk.blue('📋 List strategies command - Implementation pending'));
    }

    async applyStrategy(strategy, options) {
        logger.info(chalk.blue('🎯 Apply strategy command - Implementation pending'));
    }

    async configureAI() {
        logger.info(chalk.blue('🤖 Configure AI command - Implementation pending'));
    }

    async testAI() {
        logger.debug(chalk.blue('🧪 Test AI command - Implementation pending'));
    }

    async listAIModels() {
        logger.info(chalk.blue('📋 List AI models command - Implementation pending'));
    }
}

module.exports = TaskCLI; 