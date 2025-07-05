#!/usr/bin/env node

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

class TaskCLI {
    constructor(dependencies = {}) {
        this.commandBus = dependencies.commandBus;
        this.queryBus = dependencies.queryBus;
        this.aiService = dependencies.aiService;
        this.taskExecutionEngine = dependencies.taskExecutionEngine;
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
                console.error(chalk.red('❌ No project found. Please specify a project path.'));
                process.exit(1);
            }

            this.updateSpinner(`📁 Detected project: ${path.basename(projectPath)}`);

            // Confirm execution unless --no-confirm is specified
            if (!options.noConfirm && !options.dryRun) {
                this.stopSpinner();
                const confirmed = await this.confirmAutoMode(projectPath, options.mode);
                if (!confirmed) {
                    console.log(chalk.yellow('⏹️  Auto mode cancelled.'));
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
            console.error(chalk.red(`❌ Auto mode failed: ${error.message}`));
            if (this.program.opts().verbose) {
                console.error(error.stack);
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
        
        console.log(chalk.blue('\n🤖 VibeCoder Auto Mode Configuration:'));
        console.log(chalk.gray(`   Project: ${chalk.white(projectName)}`));
        console.log(chalk.gray(`   Path: ${chalk.white(projectPath)}`));
        console.log(chalk.gray(`   Mode: ${chalk.white(mode)}`));
        console.log(chalk.gray('   This will analyze your project and automatically:'));
        
        const actions = this.getAutoModeActions(mode);
        actions.forEach(action => {
            console.log(chalk.gray(`   • ${action}`));
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
        
        console.log(chalk.green('\n✅ VibeCoder Auto Mode Preview:'));
        console.log(chalk.blue(`\n📁 Project: ${projectName}`));
        
        // Display project structure
        console.log(chalk.blue('\n🏗️  Project Structure:'));
        console.log(chalk.gray(`   Type: ${chalk.white(analysis.projectStructure.type)}`));
        console.log(chalk.gray(`   Files: ${chalk.white(analysis.projectStructure.files.length)}`));
        console.log(chalk.gray(`   Dependencies: ${chalk.white(Object.keys(analysis.projectStructure.dependencies.dependencies || {}).length)}`));

        // Display insights
        if (analysis.insights && analysis.insights.length > 0) {
            console.log(chalk.blue('\n💡 Key Insights:'));
            analysis.insights.slice(0, 5).forEach((insight, index) => {
                console.log(chalk.gray(`   ${index + 1}. ${chalk.white(insight)}`));
            });
        }

        // Display recommendations
        if (analysis.recommendations && analysis.recommendations.length > 0) {
            console.log(chalk.blue('\n🎯 Recommended Actions:'));
            analysis.recommendations.slice(0, 5).forEach((rec, index) => {
                console.log(chalk.gray(`   ${index + 1}. ${chalk.white(rec.title)}`));
                console.log(chalk.gray(`      ${chalk.white(rec.description)}`));
            });
        }

        console.log(chalk.yellow('\n💡 Run without --dry-run to execute these actions automatically.'));
    }

    /**
     * Display auto mode results
     * @param {Object} result - Auto mode results
     * @param {string} projectPath - Project path
     */
    displayAutoModeResults(result, projectPath) {
        const projectName = path.basename(projectPath);
        
        console.log(chalk.green('\n✅ VibeCoder Auto Mode Completed Successfully!'));
        console.log(chalk.blue(`\n📁 Project: ${projectName}`));

        // Display session info
        if (result.session) {
            console.log(chalk.blue('\n🔄 Session Information:'));
            console.log(chalk.gray(`   Session ID: ${chalk.white(result.session.id)}`));
            console.log(chalk.gray(`   Duration: ${chalk.white(result.session.duration)}ms`));
            console.log(chalk.gray(`   Status: ${chalk.white(result.session.status)}`));
        }

        // Display tasks executed
        if (result.tasks && result.tasks.length > 0) {
            console.log(chalk.blue('\n📋 Tasks Executed:'));
            result.tasks.forEach((task, index) => {
                const status = task.status === 'completed' ? '✅' : '❌';
                console.log(chalk.gray(`   ${index + 1}. ${status} ${chalk.white(task.title)}`));
            });
        }

        // Display scripts generated
        if (result.scripts && result.scripts.length > 0) {
            console.log(chalk.blue('\n🔧 Scripts Generated:'));
            result.scripts.forEach((script, index) => {
                console.log(chalk.gray(`   ${index + 1}. ${chalk.white(script.name)} (${script.type})`));
            });
        }

        // Display analysis summary
        if (result.analysis) {
            console.log(chalk.blue('\n📊 Analysis Summary:'));
            console.log(chalk.gray(`   Files analyzed: ${chalk.white(result.analysis.metrics?.filesAnalyzed || 0)}`));
            console.log(chalk.gray(`   Issues found: ${chalk.white(result.analysis.insights?.length || 0)}`));
            console.log(chalk.gray(`   Recommendations: ${chalk.white(result.analysis.recommendations?.length || 0)}`));
        }

        console.log(chalk.green('\n🎉 Your project has been automatically analyzed and optimized!'));
        console.log(chalk.yellow('💡 Check the generated reports and scripts for details.'));
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
            console.error(chalk.red(`❌ CLI Error: ${error.message}`));
            if (this.program.opts().verbose) {
                console.error(error.stack);
            }
            process.exit(1);
        }
    }

    // Placeholder methods for other commands
    async analyzeProject(projectPath, options) {
        console.log(chalk.blue('🔍 Project analysis command - Implementation pending'));
    }

    async analyzeCode(codePath, options) {
        console.log(chalk.blue('🔍 Code analysis command - Implementation pending'));
    }

    async listTasks(options) {
        console.log(chalk.blue('📋 List tasks command - Implementation pending'));
    }

    async createTask(options) {
        console.log(chalk.blue('➕ Create task command - Implementation pending'));
    }

    async executeTask(taskId, options) {
        console.log(chalk.blue('▶️  Execute task command - Implementation pending'));
    }

    async showTaskInfo(taskId) {
        console.log(chalk.blue('ℹ️  Task info command - Implementation pending'));
    }

    async generateScript(type, options) {
        console.log(chalk.blue('🔧 Generate script command - Implementation pending'));
    }

    async executeScript(scriptPath, options) {
        console.log(chalk.blue('▶️  Execute script command - Implementation pending'));
    }

    async listScripts() {
        console.log(chalk.blue('📋 List scripts command - Implementation pending'));
    }

    async refactorCode(target, options) {
        console.log(chalk.blue('🔨 Refactor code command - Implementation pending'));
    }

    async optimizeCode(target, options) {
        console.log(chalk.blue('⚡ Optimize code command - Implementation pending'));
    }

    async securityAnalysis(target, options) {
        console.log(chalk.blue('🔒 Security analysis command - Implementation pending'));
    }

    async runTests(scope, options) {
        console.log(chalk.blue('🧪 Run tests command - Implementation pending'));
    }

    async deployApplication(environment, options) {
        console.log(chalk.blue('🚀 Deploy application command - Implementation pending'));
    }

    async showStats() {
        console.log(chalk.blue('📊 Show stats command - Implementation pending'));
    }

    async checkHealth() {
        console.log(chalk.blue('🏥 Health check command - Implementation pending'));
    }

    async cleanupData(options) {
        console.log(chalk.blue('🧹 Cleanup data command - Implementation pending'));
    }

    async listTemplates() {
        console.log(chalk.blue('📋 List templates command - Implementation pending'));
    }

    async createTemplate(name, options) {
        console.log(chalk.blue('➕ Create template command - Implementation pending'));
    }

    async editTemplate(name) {
        console.log(chalk.blue('✏️  Edit template command - Implementation pending'));
    }

    async listStrategies() {
        console.log(chalk.blue('📋 List strategies command - Implementation pending'));
    }

    async applyStrategy(strategy, options) {
        console.log(chalk.blue('🎯 Apply strategy command - Implementation pending'));
    }

    async configureAI() {
        console.log(chalk.blue('🤖 Configure AI command - Implementation pending'));
    }

    async testAI() {
        console.log(chalk.blue('🧪 Test AI command - Implementation pending'));
    }

    async listAIModels() {
        console.log(chalk.blue('📋 List AI models command - Implementation pending'));
    }
}

module.exports = TaskCLI; 