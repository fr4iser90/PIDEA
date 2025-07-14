
require('module-alias/register');
/**
 * TaskInteractiveCLI - Interactive CLI interface with advanced features
 */
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const cliProgress = require('cli-progress');
const Table = require('cli-table3');
const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class TaskInteractiveCLI extends EventEmitter {
    constructor(dependencies = {}) {
        super();
        
        this.commandBus = dependencies.commandBus;
        this.queryBus = dependencies.queryBus;
        this.aiService = dependencies.aiService;
        this.taskExecutionEngine = dependencies.taskExecutionEngine;
        this.logger = dependencies.logger || console;
        
        this.currentProject = null;
        this.currentSession = null;
        this.progressBars = new Map();
        this.spinners = new Map();
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for real-time updates
     */
    setupEventListeners() {
        this.taskExecutionEngine.on('execution:start', (data) => {
            this.handleExecutionStart(data);
        });

        this.taskExecutionEngine.on('execution:progress', (data) => {
            this.handleExecutionProgress(data);
        });

        this.taskExecutionEngine.on('execution:complete', (data) => {
            this.handleExecutionComplete(data);
        });

        this.taskExecutionEngine.on('execution:error', (data) => {
            this.handleExecutionError(data);
        });

        this.aiService.on('ai:request', (data) => {
            this.handleAIRequest(data);
        });

        this.aiService.on('ai:response', (data) => {
            this.handleAIResponse(data);
        });
    }

    /**
     * Start interactive CLI session
     */
    async startInteractiveSession() {
        logger.info(chalk.blue.bold('\n🤖 VibeCoder Interactive Task Management'));
        logger.info(chalk.gray('Type "help" for available commands or "exit" to quit\n'));

        await this.showMainMenu();
    }

    /**
     * Show main interactive menu
     */
    async showMainMenu() {
        const choices = [
            { name: '🚀 VibeCoder Auto Mode', value: 'auto' },
            { name: '🔍 Project Analysis', value: 'analysis' },
            { name: '📋 Task Management', value: 'tasks' },
            { name: '🔧 Script Generation', value: 'scripts' },
            { name: '⚡ Quick Actions', value: 'quick' },
            { name: '⚙️  Settings & Configuration', value: 'settings' },
            { name: '📊 Statistics & Reports', value: 'stats' },
            { name: '❓ Help', value: 'help' },
            { name: '🚪 Exit', value: 'exit' }
        ];

        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices
            }
        ]);

        await this.handleMainMenuAction(action);
    }

    /**
     * Handle main menu action
     * @param {string} action - Selected action
     */
    async handleMainMenuAction(action) {
        switch (action) {
            case 'auto':
                await this.startAutoMode();
                break;
            case 'analysis':
                await this.showAnalysisMenu();
                break;
            case 'tasks':
                await this.showTaskMenu();
                break;
            case 'scripts':
                await this.showScriptMenu();
                break;
            case 'quick':
                await this.showQuickActionsMenu();
                break;
            case 'settings':
                await this.showSettingsMenu();
                break;
            case 'stats':
                await this.showStatsMenu();
                break;
            case 'help':
                await this.showHelp();
                break;
            case 'exit':
                await this.exitSession();
                break;
        }

        // Return to main menu unless exiting
        if (action !== 'exit') {
            await this.showMainMenu();
        }
    }

    /**
     * Start VibeCoder Auto Mode interactively
     */
    async startAutoMode() {
        logger.info(chalk.blue.bold('\n🚀 VibeCoder Auto Mode'));
        logger.info(chalk.gray('Zero configuration, full automation\n'));

        // Auto-detect project
        const projectPath = await this.autoDetectProject();
        if (!projectPath) {
            logger.info(chalk.yellow('⚠️  No project detected in current directory.'));
            const { useCurrent } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'useCurrent',
                    message: 'Use current directory as project?',
                    default: true
                }
            ]);

            if (!useCurrent) {
                return;
            }
        }

        const projectName = path.basename(projectPath || process.cwd());
        logger.info(chalk.green(`📁 Project: ${projectName}`));

        // Select auto mode type
        const { mode } = await inquirer.prompt([
            {
                type: 'list',
                name: 'mode',
                message: 'Select auto mode type:',
                choices: [
                    { name: '🎯 Full Automation (Recommended)', value: 'full' },
                    { name: '🔍 Analysis Only', value: 'analysis' },
                    { name: '⚡ Optimization Focus', value: 'optimization' },
                    { name: '🔒 Security Focus', value: 'security' },
                    { name: '🔨 Refactoring Focus', value: 'refactoring' }
                ]
            }
        ]);

        // Select AI model
        const { aiModel } = await inquirer.prompt([
            {
                type: 'list',
                name: 'aiModel',
                message: 'Select AI model:',
                choices: [
                    { name: '🤖 GPT-4 (Best Quality)', value: 'gpt-4' },
                    { name: '⚡ GPT-3.5 (Fast)', value: 'gpt-3.5-turbo' },
                    { name: '🧠 Claude-3 (Advanced)', value: 'claude-3' }
                ]
            }
        ]);

        // Confirm execution
        const { confirmed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmed',
                message: `Start VibeCoder Auto Mode (${mode}) with ${aiModel}?`,
                default: true
            }
        ]);

        if (!confirmed) {
            logger.info(chalk.yellow('⏹️  Auto mode cancelled.'));
            return;
        }

        // Execute auto mode
        await this.executeAutoMode(projectPath || process.cwd(), mode, aiModel);
    }

    /**
     * Execute auto mode with progress tracking
     * @param {string} projectPath - Project path
     * @param {string} mode - Auto mode type
     * @param {string} aiModel - AI model
     */
    async executeAutoMode(projectPath, mode, aiModel) {
        const sessionId = `auto-${Date.now()}`;
        this.currentSession = { id: sessionId, type: 'auto', projectPath, mode };

        logger.info(chalk.blue('\n🚀 Starting VibeCoder Auto Mode...\n'));

        // Create progress bar
        const progressBar = new cliProgress.SingleBar({
            format: 'Progress |{bar}| {percentage}% | {value}/{total} | {task}',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true
        });

        progressBar.start(100, 0, { task: 'Initializing...' });

        try {
            // Step 1: Project Analysis
            progressBar.update(10, { task: 'Analyzing project structure...' });
            const analysis = await this.commandBus.execute('AnalyzeProjectCommand', {
                projectPath,
                analysisType: 'full',
                includeAI: true,
                options: { aiModel }
            });

            // Step 2: Generate Task Suggestions
            progressBar.update(30, { task: 'Generating AI task suggestions...' });
            const suggestions = await this.commandBus.execute('GenerateTaskSuggestionsCommand', {
                projectPath,
                analysis: analysis.analysis,
                options: { aiModel }
            });

            // Step 3: Create and Execute Tasks
            progressBar.update(50, { task: 'Creating and executing tasks...' });
            const tasks = [];
            for (const suggestion of suggestions.suggestions.slice(0, 5)) {
                const task = await this.commandBus.execute('CreateTaskCommand', {
                    title: suggestion.title,
                    description: suggestion.description,
                    type: suggestion.type,
                    priority: suggestion.priority,
                    createdBy: 'interactive-cli'
                });

                const execution = await this.commandBus.execute('ExecuteTaskCommand', {
                    taskId: task.task.id,
                    options: { aiModel },
                    executedBy: 'interactive-cli'
                });

                tasks.push({ task: task.task, execution: execution.execution });
            }

            // Step 4: Generate Scripts
            progressBar.update(80, { task: 'Generating optimization scripts...' });
            const scripts = [];
            for (const task of tasks) {
                if (task.task.type === 'script') {
                    const script = await this.commandBus.execute('GenerateScriptCommand', {
                        taskId: task.task.id,
                        options: { aiModel }
                    });
                    scripts.push(script.script);
                }
            }

            // Step 5: Finalize
            progressBar.update(100, { task: 'Finalizing...' });
            await new Promise(resolve => setTimeout(resolve, 1000));

            progressBar.stop();

            // Display results
            this.displayAutoModeResults({
                session: { id: sessionId, duration: Date.now() - parseInt(sessionId.split('-')[1]) },
                tasks,
                scripts,
                analysis
            });

        } catch (error) {
            progressBar.stop();
            logger.error(chalk.red(`❌ Auto mode failed: ${error.message}`));
        }
    }

    /**
     * Show analysis menu
     */
    async showAnalysisMenu() {
        const choices = [
            { name: '🔍 Full Project Analysis', value: 'full' },
            { name: '📊 Code Quality Analysis', value: 'quality' },
            { name: '⚡ Performance Analysis', value: 'performance' },
            { name: '🔒 Security Analysis', value: 'security' },
            { name: '🏗️  Architecture Analysis', value: 'architecture' },
            { name: '🔙 Back to Main Menu', value: 'back' }
        ];

        const { analysisType } = await inquirer.prompt([
            {
                type: 'list',
                name: 'analysisType',
                message: 'Select analysis type:',
                choices
            }
        ]);

        if (analysisType === 'back') {
            return;
        }

        await this.performAnalysis(analysisType);
    }

    /**
     * Show task management menu
     */
    async showTaskMenu() {
        const choices = [
            { name: '📋 List Tasks', value: 'list' },
            { name: '➕ Create Task', value: 'create' },
            { name: '▶️  Execute Task', value: 'execute' },
            { name: '🔍 Search Tasks', value: 'search' },
            { name: '📊 Task Statistics', value: 'stats' },
            { name: '🔙 Back to Main Menu', value: 'back' }
        ];

        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'Task Management:',
                choices
            }
        ]);

        if (action === 'back') {
            return;
        }

        await this.handleTaskAction(action);
    }

    /**
     * Show script generation menu
     */
    async showScriptMenu() {
        const choices = [
            { name: '🔧 Generate Build Script', value: 'build' },
            { name: '🚀 Generate Deploy Script', value: 'deploy' },
            { name: '🧪 Generate Test Script', value: 'test' },
            { name: '🔒 Generate Security Script', value: 'security' },
            { name: '⚡ Generate Optimization Script', value: 'optimization' },
            { name: '📋 List Generated Scripts', value: 'list' },
            { name: '🔙 Back to Main Menu', value: 'back' }
        ];

        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'Script Generation:',
                choices
            }
        ]);

        if (action === 'back') {
            return;
        }

        await this.handleScriptAction(action);
    }

    /**
     * Show quick actions menu
     */
    async showQuickActionsMenu() {
        const choices = [
            { name: '🔨 Quick Refactor', value: 'refactor' },
            { name: '⚡ Quick Optimize', value: 'optimize' },
            { name: '🔒 Quick Security Scan', value: 'security' },
            { name: '🧪 Quick Test', value: 'test' },
            { name: '🚀 Quick Deploy', value: 'deploy' },
            { name: '🔙 Back to Main Menu', value: 'back' }
        ];

        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'Quick Actions:',
                choices
            }
        ]);

        if (action === 'back') {
            return;
        }

        await this.performQuickAction(action);
    }

    /**
     * Show settings menu
     */
    async showSettingsMenu() {
        const choices = [
            { name: '🤖 AI Configuration', value: 'ai' },
            { name: '📁 Project Settings', value: 'project' },
            { name: '🔧 CLI Preferences', value: 'cli' },
            { name: '🔙 Back to Main Menu', value: 'back' }
        ];

        const { setting } = await inquirer.prompt([
            {
                type: 'list',
                name: 'setting',
                message: 'Settings:',
                choices
            }
        ]);

        if (setting === 'back') {
            return;
        }

        await this.handleSettingAction(setting);
    }

    /**
     * Show statistics menu
     */
    async showStatsMenu() {
        const choices = [
            { name: '📊 System Statistics', value: 'system' },
            { name: '📈 Task Statistics', value: 'tasks' },
            { name: '🤖 AI Usage Statistics', value: 'ai' },
            { name: '⚡ Performance Statistics', value: 'performance' },
            { name: '🔙 Back to Main Menu', value: 'back' }
        ];

        const { statType } = await inquirer.prompt([
            {
                type: 'list',
                name: 'statType',
                message: 'Statistics:',
                choices
            }
        ]);

        if (statType === 'back') {
            return;
        }

        await this.showStatistics(statType);
    }

    /**
     * Show help information
     */
    async showHelp() {
        logger.info(chalk.blue.bold('\n❓ VibeCoder Task Management Help'));
        logger.info(chalk.gray('\nAvailable Commands:'));
        
        const helpData = [
            { command: 'auto', description: 'Start VibeCoder Auto Mode (zero configuration)' },
            { command: 'analysis', description: 'Perform project analysis with AI' },
            { command: 'tasks', description: 'Manage tasks (create, execute, list)' },
            { command: 'scripts', description: 'Generate and manage scripts' },
            { command: 'quick', description: 'Quick actions for common tasks' },
            { command: 'settings', description: 'Configure AI, projects, and CLI preferences' },
            { command: 'stats', description: 'View system and task statistics' },
            { command: 'help', description: 'Show this help information' },
            { command: 'exit', description: 'Exit the interactive CLI' }
        ];

        const table = new Table({
            head: ['Command', 'Description'],
            colWidths: [15, 60]
        });

        helpData.forEach(item => {
            table.push([chalk.blue(item.command), item.description]);
        });

        logger.info(table.toString());
        
        logger.info(chalk.yellow('\n💡 Tip: Use VibeCoder Auto Mode for the best experience!'));
        logger.info(chalk.gray('Press Enter to continue...'));
        
        await inquirer.prompt([{ type: 'input', name: 'continue', message: '' }]);
    }

    /**
     * Exit interactive session
     */
    async exitSession() {
        const { confirmed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmed',
                message: 'Are you sure you want to exit?',
                default: false
            }
        ]);

        if (confirmed) {
            logger.info(chalk.blue('\n👋 Thanks for using VibeCoder Task Management!'));
            process.exit(0);
        }
    }

    // Event handlers
    handleExecutionStart(data) {
        const spinner = ora(`▶️  Starting task: ${data.taskTitle}`).start();
        this.spinners.set(data.executionId, spinner);
    }

    handleExecutionProgress(data) {
        const spinner = this.spinners.get(data.executionId);
        if (spinner) {
            spinner.text = `⏳ ${data.currentStep} (${data.progress}%)`;
        }
    }

    handleExecutionComplete(data) {
        const spinner = this.spinners.get(data.executionId);
        if (spinner) {
            spinner.succeed(`✅ Task completed: ${data.taskTitle}`);
            this.spinners.delete(data.executionId);
        }
    }

    handleExecutionError(data) {
        const spinner = this.spinners.get(data.executionId);
        if (spinner) {
            spinner.fail(`❌ Task failed: ${data.taskTitle} - ${data.error}`);
            this.spinners.delete(data.executionId);
        }
    }

    handleAIRequest(data) {
        const spinner = ora(`🤖 AI request: ${data.description}`).start();
        this.spinners.set(`ai-${data.requestId}`, spinner);
    }

    handleAIResponse(data) {
        const spinner = this.spinners.get(`ai-${data.requestId}`);
        if (spinner) {
            spinner.succeed(`✅ AI response received`);
            this.spinners.delete(`ai-${data.requestId}`);
        }
    }

    // Helper methods
    async autoDetectProject() {
        try {
            const cwd = process.cwd();
            const files = await fs.readdir(cwd);
            
            const projectIndicators = [
                'package.json', 'pyproject.toml', 'requirements.txt',
                'Cargo.toml', 'composer.json', 'pom.xml', 'build.gradle'
            ];

            for (const indicator of projectIndicators) {
                if (files.includes(indicator)) {
                    return cwd;
                }
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    async performAnalysis(analysisType) {
        const spinner = ora(`🔍 Performing ${analysisType} analysis...`).start();
        
        try {
            const projectPath = this.currentProject || process.cwd();
            const result = await this.commandBus.execute('AnalyzeProjectCommand', {
                projectPath,
                analysisType,
                includeAI: true
            });

            spinner.succeed(`${analysisType} analysis completed`);
            this.displayAnalysisResults(result, analysisType);

        } catch (error) {
            spinner.fail(`${analysisType} analysis failed: ${error.message}`);
        }
    }

    async handleTaskAction(action) {
        switch (action) {
            case 'list':
                await this.listTasksInteractive();
                break;
            case 'create':
                await this.createTaskInteractive();
                break;
            case 'execute':
                await this.executeTaskInteractive();
                break;
            case 'search':
                await this.searchTasksInteractive();
                break;
            case 'stats':
                await this.showTaskStats();
                break;
        }
    }

    async handleScriptAction(action) {
        switch (action) {
            case 'build':
                await this.generateScriptInteractive('build');
                break;
            case 'deploy':
                await this.generateScriptInteractive('deploy');
                break;
            case 'test':
                await this.generateScriptInteractive('test');
                break;
            case 'security':
                await this.generateScriptInteractive('security');
                break;
            case 'optimization':
                await this.generateScriptInteractive('optimization');
                break;
            case 'list':
                await this.listScriptsInteractive();
                break;
        }
    }

    async performQuickAction(action) {
        const spinner = ora(`⚡ Performing quick ${action}...`).start();
        
        try {
            const projectPath = this.currentProject || process.cwd();
            
            switch (action) {
                case 'refactor':
                    await this.quickRefactor(projectPath);
                    break;
                case 'optimize':
                    await this.quickOptimize(projectPath);
                    break;
                case 'security':
                    await this.quickSecurityScan(projectPath);
                    break;
                case 'test':
                    await this.quickTest(projectPath);
                    break;
                case 'deploy':
                    await this.quickDeploy(projectPath);
                    break;
            }

            spinner.succeed(`Quick ${action} completed`);

        } catch (error) {
            spinner.fail(`Quick ${action} failed: ${error.message}`);
        }
    }

    async handleSettingAction(setting) {
        switch (setting) {
            case 'ai':
                await this.configureAI();
                break;
            case 'project':
                await this.configureProject();
                break;
            case 'cli':
                await this.configureCLI();
                break;
        }
    }

    async showStatistics(statType) {
        const spinner = ora(`📊 Loading ${statType} statistics...`).start();
        
        try {
            let stats;
            switch (statType) {
                case 'system':
                    stats = await this.getSystemStats();
                    break;
                case 'tasks':
                    stats = await this.getTaskStats();
                    break;
                case 'ai':
                    stats = await this.getAIStats();
                    break;
                case 'performance':
                    stats = await this.getPerformanceStats();
                    break;
            }

            spinner.succeed(`${statType} statistics loaded`);
            this.displayStatistics(stats, statType);

        } catch (error) {
            spinner.fail(`Failed to load ${statType} statistics: ${error.message}`);
        }
    }

    // Display methods
    displayAutoModeResults(result) {
        logger.info(chalk.green.bold('\n✅ VibeCoder Auto Mode Completed Successfully!'));
        
        if (result.session) {
            logger.info(chalk.blue(`\n🔄 Session: ${result.session.id}`));
            logger.info(chalk.gray(`Duration: ${result.session.duration}ms`));
        }

        if (result.tasks && result.tasks.length > 0) {
            logger.info(chalk.blue('\n📋 Tasks Executed:'));
            result.tasks.forEach((item, index) => {
                const status = item.execution.status === 'completed' ? '✅' : '❌';
                logger.info(chalk.gray(`${index + 1}. ${status} ${item.task.title}`));
            });
        }

        if (result.scripts && result.scripts.length > 0) {
            logger.info(chalk.blue('\n🔧 Scripts Generated:'));
            result.scripts.forEach((script, index) => {
                logger.info(chalk.gray(`${index + 1}. ${script.name} (${script.type})`));
            });
        }

        logger.info(chalk.green('\n🎉 Your project has been automatically optimized!'));
    }

    displayAnalysisResults(result, analysisType) {
        logger.info(chalk.blue(`\n📊 ${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} Analysis Results:`));
        
        if (result.insights && result.insights.length > 0) {
            logger.info(chalk.blue('\n💡 Key Insights:'));
            result.insights.slice(0, 5).forEach((insight, index) => {
                logger.info(chalk.gray(`${index + 1}. ${insight}`));
            });
        }

        if (result.recommendations && result.recommendations.length > 0) {
            logger.info(chalk.blue('\n🎯 Recommendations:'));
            result.recommendations.slice(0, 5).forEach((rec, index) => {
                logger.info(chalk.gray(`${index + 1}. ${rec.title}`));
                logger.info(chalk.gray(`   ${rec.description}`));
            });
        }
    }

    // Placeholder methods for interactive features
    async listTasksInteractive() {
        logger.info(chalk.blue('📋 Interactive task listing - Implementation pending'));
    }

    async createTaskInteractive() {
        logger.info(chalk.blue('➕ Interactive task creation - Implementation pending'));
    }

    async executeTaskInteractive() {
        logger.info(chalk.blue('▶️  Interactive task execution - Implementation pending'));
    }

    async searchTasksInteractive() {
        logger.info(chalk.blue('🔍 Interactive task search - Implementation pending'));
    }

    async showTaskStats() {
        logger.info(chalk.blue('📊 Task statistics - Implementation pending'));
    }

    async generateScriptInteractive(type) {
        logger.info(chalk.blue(`🔧 Interactive script generation (${type}) - Implementation pending`));
    }

    async listScriptsInteractive() {
        logger.info(chalk.blue('📋 Interactive script listing - Implementation pending'));
    }

    async quickRefactor(projectPath) {
        logger.info(chalk.blue('🔨 Quick refactor - Implementation pending'));
    }

    async quickOptimize(projectPath) {
        logger.info(chalk.blue('⚡ Quick optimize - Implementation pending'));
    }

    async quickSecurityScan(projectPath) {
        logger.info(chalk.blue('🔒 Quick security scan - Implementation pending'));
    }

    async quickTest(projectPath) {
        logger.debug(chalk.blue('🧪 Quick test - Implementation pending'));
    }

    async quickDeploy(projectPath) {
        logger.info(chalk.blue('🚀 Quick deploy - Implementation pending'));
    }

    async configureAI() {
        logger.info(chalk.blue('🤖 AI configuration - Implementation pending'));
    }

    async configureProject() {
        logger.info(chalk.blue('📁 Project configuration - Implementation pending'));
    }

    async configureCLI() {
        logger.info(chalk.blue('🔧 CLI configuration - Implementation pending'));
    }

    async getSystemStats() {
        return { total: 0, active: 0, completed: 0 };
    }

    async getTaskStats() {
        return { total: 0, active: 0, completed: 0 };
    }

    async getAIStats() {
        return { requests: 0, responses: 0, models: [] };
    }

    async getPerformanceStats() {
        return { avgExecutionTime: 0, successRate: 0 };
    }

    displayStatistics(stats, type) {
        logger.info(chalk.blue(`\n📊 ${type.charAt(0).toUpperCase() + type.slice(1)} Statistics:`));
        Object.entries(stats).forEach(([key, value]) => {
            logger.info(chalk.gray(`${key}: ${chalk.white(value)}`));
        });
    }
}

module.exports = TaskInteractiveCLI; 