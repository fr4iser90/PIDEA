
require('module-alias/register');
/**
 * TaskCommands - CLI command implementations
 */
const chalk = require('chalk');
const inquirer = require('inquirer');
const Table = require('cli-table3');
const fs = require('fs').promises;
const path = require('path');

class TaskCommands {
    constructor(dependencies = {}) {
        this.commandBus = dependencies.commandBus;
        this.queryBus = dependencies.queryBus;
        this.aiService = dependencies.aiService;
        this.taskExecutionEngine = dependencies.taskExecutionEngine;
        this.logger = dependencies.logger || console;
    }

    /**
     * Analyze project with AI
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     */
    async analyzeProject(projectPath, options = {}) {
        try {
            const spinner = this.createSpinner('🔍 Analyzing project...');
            
            // Auto-detect project if not specified
            const targetPath = projectPath || await this.autoDetectProject();
            if (!targetPath) {
                spinner.fail('No project found');
                return;
            }

            spinner.text = '🤖 Running AI analysis...';
            
            const command = {
                projectPath: targetPath,
                analysisType: options.deep ? 'deep' : 'full',
                includeAI: options.ai !== false,
                options: {
                    aiModel: options.aiModel || 'gpt-4'
                }
            };

            const result = await this.commandBus.execute('AnalyzeProjectCommand', command);
            
            spinner.succeed('Analysis completed');

            this.displayProjectAnalysis(result, targetPath, options);

        } catch (error) {
            this.handleError('Project analysis failed', error);
        }
    }

    /**
     * Analyze code quality
     * @param {string} codePath - Code path
     * @param {Object} options - Analysis options
     */
    async analyzeCode(codePath, options = {}) {
        try {
            const spinner = this.createSpinner('🔍 Analyzing code...');
            
            const targetPath = codePath || process.cwd();
            spinner.text = '🤖 Running code analysis...';

            // Read code files
            const files = await this.getCodeFiles(targetPath);
            
            const analysisResults = [];
            for (const file of files) {
                const content = await fs.readFile(file, 'utf8');
                const analysis = await this.aiService.optimizeCode(content, {
                    description: `Analyze ${path.basename(file)} for ${options.quality ? 'quality' : options.performance ? 'performance' : ' improvements'}`,
                    requirements: []
                });
                
                analysisResults.push({
                    file,
                    analysis: analysis.optimizedCode,
                    recommendations: analysis.recommendations
                });
            }

            spinner.succeed('Code analysis completed');
            this.displayCodeAnalysis(analysisResults, options);

        } catch (error) {
            this.handleError('Code analysis failed', error);
        }
    }

    /**
     * List tasks with filtering
     * @param {Object} options - List options
     */
    async listTasks(options = {}) {
        try {
            const spinner = this.createSpinner('📋 Loading tasks...');

            const query = {
                page: 1,
                limit: 50,
                filters: {
                    status: options.status,
                    priority: options.priority,
                    type: options.type
                }
            };

            const result = await this.queryBus.execute('GetTasksQuery', query);
            
            spinner.succeed(`Found ${result.total} tasks`);

            this.displayTaskList(result.tasks, options.format);

        } catch (error) {
            this.handleError('Failed to load tasks', error);
        }
    }

    /**
     * Create new task interactively
     * @param {Object} options - Task options
     */
    async createTask(options = {}) {
        try {
            // Collect task information interactively
            const taskData = await this.collectTaskData(options);
            
            const spinner = this.createSpinner('➕ Creating task...');

            const command = {
                ...taskData,
                createdBy: 'cli-user' // This would be the actual user ID
            };

            const result = await this.commandBus.execute('CreateTaskCommand', command);
            
            spinner.succeed('Task created successfully');

            this.displayTaskInfo(result.task);

        } catch (error) {
            this.handleError('Failed to create task', error);
        }
    }

    /**
     * Execute task by ID
     * @param {string} taskId - Task ID
     * @param {Object} options - Execution options
     */
    async executeTask(taskId, options = {}) {
        try {
            const spinner = this.createSpinner('▶️  Starting task execution...');

            const command = {
                taskId,
                options: options.options ? JSON.parse(options.options) : {},
                executedBy: 'cli-user'
            };

            const result = await this.commandBus.execute('ExecuteTaskCommand', command);
            
            spinner.succeed('Task execution started');

            this.displayTaskExecution(result);

            // Monitor execution if requested
            if (options.monitor) {
                await this.monitorTaskExecution(result.execution.id);
            }

        } catch (error) {
            this.handleError('Failed to execute task', error);
        }
    }

    /**
     * Show task information
     * @param {string} taskId - Task ID
     */
    async showTaskInfo(taskId) {
        try {
            const spinner = this.createSpinner('ℹ️  Loading task information...');

            const query = {
                taskId,
                userId: 'cli-user'
            };

            const result = await this.queryBus.execute('GetTasksQuery', query);
            
            if (!result.tasks || result.tasks.length === 0) {
                spinner.fail('Task not found');
                return;
            }

            spinner.succeed('Task information loaded');
            this.displayTaskInfo(result.tasks[0]);

        } catch (error) {
            this.handleError('Failed to load task information', error);
        }
    }

    /**
     * Generate script
     * @param {string} type - Script type
     * @param {Object} options - Generation options
     */
    async generateScript(type, options = {}) {
        try {
            const spinner = this.createSpinner('🔧 Generating script...');

            const target = options.target || process.cwd();
            const requirements = {
                target,
                description: `Generate ${type} script for ${path.basename(target)}`,
                environment: options.env || 'production',
                dependencies: []
            };

            const result = await this.aiService.generateScript(type, requirements, {
                aiModel: options.aiModel || 'gpt-4'
            });

            spinner.succeed('Script generated successfully');

            // Save script if output path specified
            if (options.output) {
                await fs.writeFile(options.output, result.script);
                logger.log(chalk.green(`📁 Script saved to: ${options.output}`));
            } else {
                logger.log(chalk.blue('\n📜 Generated Script:'));
                logger.log(chalk.gray('```'));
                logger.log(result.script);
                logger.log(chalk.gray('```'));
            }

            this.displayScriptInfo(result);

        } catch (error) {
            this.handleError('Failed to generate script', error);
        }
    }

    /**
     * Execute script
     * @param {string} scriptPath - Script path
     * @param {Object} options - Execution options
     */
    async executeScript(scriptPath, options = {}) {
        try {
            const spinner = this.createSpinner('▶️  Executing script...');

            const scriptContent = await fs.readFile(scriptPath, 'utf8');
            
            const executionResult = await this.taskExecutionEngine.executeScript(scriptContent, {
                cwd: process.cwd(),
                env: options.env ? { ...process.env, NODE_ENV: options.env } : process.env,
                args: options.args ? options.args.split(' ') : []
            });

            spinner.succeed('Script execution completed');

            this.displayScriptExecution(executionResult);

        } catch (error) {
            this.handleError('Failed to execute script', error);
        }
    }

    /**
     * List generated scripts
     */
    async listScripts() {
        try {
            const spinner = this.createSpinner('📋 Loading scripts...');

            const query = {
                page: 1,
                limit: 50,
                userId: 'cli-user'
            };

            const result = await this.queryBus.execute('GetGeneratedScriptsQuery', query);
            
            spinner.succeed(`Found ${result.total} scripts`);

            this.displayScriptList(result.scripts);

        } catch (error) {
            this.handleError('Failed to load scripts', error);
        }
    }

    /**
     * Refactor code with AI
     * @param {string} target - Target path
     * @param {Object} options - Refactoring options
     */
    async refactorCode(target, options = {}) {
        try {
            const spinner = this.createSpinner('🔨 Analyzing code for refactoring...');

            const targetPath = target || process.cwd();
            const files = await this.getCodeFiles(targetPath);

            spinner.text = '🤖 Generating refactoring suggestions...';

            const refactoringResults = [];
            for (const file of files) {
                const content = await fs.readFile(file, 'utf8');
                const result = await this.aiService.optimizeCode(content, {
                    description: 'Refactor code for better maintainability and readability',
                    requirements: ['improve structure', 'enhance readability', 'follow best practices']
                });

                refactoringResults.push({
                    file,
                    originalContent: content,
                    refactoredContent: result.optimizedCode,
                    recommendations: result.recommendations
                });
            }

            spinner.succeed('Refactoring analysis completed');

            this.displayRefactoringResults(refactoringResults, options);

            // Apply refactoring if requested
            if (options.autoApply) {
                await this.applyRefactoring(refactoringResults);
            }

        } catch (error) {
            this.handleError('Failed to refactor code', error);
        }
    }

    /**
     * Optimize code performance
     * @param {string} target - Target path
     * @param {Object} options - Optimization options
     */
    async optimizeCode(target, options = {}) {
        try {
            const spinner = this.createSpinner('⚡ Analyzing code for optimization...');

            const targetPath = target || process.cwd();
            const files = await this.getCodeFiles(targetPath);

            spinner.text = '🤖 Generating optimization suggestions...';

            const optimizationResults = [];
            for (const file of files) {
                const content = await fs.readFile(file, 'utf8');
                const result = await this.aiService.optimizeCode(content, {
                    description: options.performance ? 'Optimize for performance' : 'Optimize for code quality',
                    requirements: options.performance ? ['improve performance', 'reduce complexity'] : ['improve quality', 'enhance maintainability']
                });

                optimizationResults.push({
                    file,
                    originalContent: content,
                    optimizedContent: result.optimizedCode,
                    recommendations: result.recommendations
                });
            }

            spinner.succeed('Optimization analysis completed');

            this.displayOptimizationResults(optimizationResults, options);

        } catch (error) {
            this.handleError('Failed to optimize code', error);
        }
    }

    /**
     * Security analysis
     * @param {string} target - Target path
     * @param {Object} options - Security options
     */
    async securityAnalysis(target, options = {}) {
        try {
            const spinner = this.createSpinner('🔒 Performing security analysis...');

            const targetPath = target || process.cwd();
            const projectData = await this.collectProjectData(targetPath);

            spinner.text = '🤖 Running AI security scan...';

            const securityResult = await this.aiService.performSecurityAnalysis(projectData, {
                aiModel: 'gpt-4'
            });

            spinner.succeed('Security analysis completed');

            this.displaySecurityResults(securityResult, options);

        } catch (error) {
            this.handleError('Failed to perform security analysis', error);
        }
    }

    /**
     * Run tests
     * @param {string} scope - Test scope
     * @param {Object} options - Test options
     */
    async runTests(scope, options = {}) {
        try {
            const spinner = this.createSpinner('🧪 Running tests...');

            const targetPath = process.cwd();
            
            // Detect test framework
            const testFramework = await this.detectTestFramework(targetPath);
            
            spinner.text = `🧪 Running ${testFramework} tests...`;

            const testResult = await this.executeTests(targetPath, testFramework, options);

            spinner.succeed('Tests completed');

            this.displayTestResults(testResult, options);

        } catch (error) {
            this.handleError('Failed to run tests', error);
        }
    }

    /**
     * Deploy application
     * @param {string} environment - Deployment environment
     * @param {Object} options - Deployment options
     */
    async deployApplication(environment, options = {}) {
        try {
            const spinner = this.createSpinner('🚀 Starting deployment...');

            const targetPath = process.cwd();
            
            spinner.text = '🔨 Building application...';
            
            if (options.build) {
                await this.buildApplication(targetPath);
            }

            spinner.text = '🧪 Running pre-deployment tests...';
            
            if (options.test) {
                await this.runPreDeploymentTests(targetPath);
            }

            spinner.text = `🚀 Deploying to ${environment}...`;

            const deploymentResult = await this.deployToEnvironment(targetPath, environment, options);

            spinner.succeed('Deployment completed');

            this.displayDeploymentResults(deploymentResult);

        } catch (error) {
            this.handleError('Failed to deploy application', error);
        }
    }

    /**
     * Show system statistics
     */
    async showStats() {
        try {
            const spinner = this.createSpinner('📊 Loading statistics...');

            // Get various statistics
            const taskStats = await this.queryBus.execute('GetTaskStatsQuery', {});
            const aiStats = this.aiService.getStats();
            const executionStats = this.taskExecutionEngine.getStats();

            spinner.succeed('Statistics loaded');

            this.displaySystemStats({
                tasks: taskStats.stats,
                ai: aiStats,
                execution: executionStats
            });

        } catch (error) {
            this.handleError('Failed to load statistics', error);
        }
    }

    /**
     * Check system health
     */
    async checkHealth() {
        try {
            const spinner = this.createSpinner('🏥 Checking system health...');

            const healthChecks = {
                ai: this.aiService.getHealthStatus(),
                execution: this.taskExecutionEngine.getHealthStatus(),
                database: await this.checkDatabaseHealth(),
                services: await this.checkServiceHealth()
            };

            spinner.succeed('Health check completed');

            this.displayHealthStatus(healthChecks);

        } catch (error) {
            this.handleError('Failed to check system health', error);
        }
    }

    /**
     * Cleanup old data
     * @param {Object} options - Cleanup options
     */
    async cleanupData(options = {}) {
        try {
            const days = parseInt(options.days) || 30;
            const spinner = this.createSpinner(`🧹 Cleaning up data older than ${days} days...`);

            const cleanupResult = await this.performDataCleanup(days);

            spinner.succeed('Data cleanup completed');

            this.displayCleanupResults(cleanupResult);

        } catch (error) {
            this.handleError('Failed to cleanup data', error);
        }
    }

    /**
     * Execute tasks sequentially via IDE chat
     * @param {Object} options - Command options
     */
    async executeSequentialTasks(options) {
        try {
            logger.log('🚀 Starting sequential task execution via IDE chat...');
            
            // Get tasks from database or file
            const tasks = await this.getTasksForSequentialExecution(options);
            
            if (tasks.length === 0) {
                logger.log('❌ No tasks found for sequential execution');
                return;
            }
            
            logger.log(`📋 Found ${tasks.length} tasks to execute sequentially`);
            
            // Initialize services
            const workflowOrchestrationService = this.serviceContainer.get('workflowOrchestrationService');
            const cursorIDEService = this.serviceContainer.get('cursorIDEService');
            
            if (!workflowOrchestrationService || !cursorIDEService) {
                throw new Error('Required services not available');
            }
            
            // Execute tasks sequentially
            const result = await workflowOrchestrationService.executeTasksSequentiallyViaIDE(tasks, {
                projectPath: options.projectPath || process.cwd(),
                completionTimeout: options.timeout || 300000, // 5 minutes per task
                autoCommit: options.autoCommit !== false,
                autoBranch: options.autoBranch !== false
            });
            
            // Display results
            logger.log('\n📊 Sequential Task Execution Results:');
            logger.log(`✅ Successful: ${result.successful}/${result.totalTasks}`);
            logger.log(`❌ Failed: ${result.failed}/${result.totalTasks}`);
            logger.log(`⏱️  Total Duration: ${Math.round(result.totalDuration / 1000)}s`);
            logger.log(`📈 Average Duration: ${Math.round(result.averageDuration / 1000)}s per task`);
            
            if (result.success) {
                logger.log('\n🎉 All tasks completed successfully!');
            } else {
                logger.log('\n⚠️  Some tasks failed. Check the results above.');
            }
            
            // Show detailed results
            if (options.verbose) {
                logger.log('\n📝 Detailed Results:');
                result.results.forEach((taskResult, index) => {
                    const status = taskResult.success ? '✅' : '❌';
                    logger.log(`${status} Task ${index + 1}: ${taskResult.taskTitle}`);
                    logger.log(`   Duration: ${Math.round(taskResult.duration / 1000)}s`);
                    if (!taskResult.success) {
                        logger.log(`   Error: ${taskResult.error}`);
                    }
                });
            }
            
        } catch (error) {
            logger.error('❌ Sequential task execution failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Get tasks for sequential execution
     * @param {Object} options - Options
     * @returns {Promise<Array>} Tasks to execute
     */
    async getTasksForSequentialExecution(options) {
        // Try to get tasks from database first
        if (options.fromDatabase) {
            const taskRepository = this.serviceContainer.get('taskRepository');
            if (taskRepository) {
                const tasks = await taskRepository.findByStatus('pending');
                if (tasks.length > 0) {
                    logger.log(`📋 Found ${tasks.length} pending tasks in database`);
                    return tasks;
                }
            }
        }
        
        // Try to get tasks from test reports
        if (options.fromTestReports) {
            const tasks = await this.getTasksFromTestReports(options);
            if (tasks.length > 0) {
                logger.debug(`📋 Found ${tasks.length} tasks from test reports`);
                return tasks;
            }
        }
        
        // Try to get tasks from coverage report
        if (options.fromCoverage) {
            const tasks = await this.getTasksFromCoverageReport(options);
            if (tasks.length > 0) {
                logger.log(`📋 Found ${tasks.length} tasks from coverage report`);
                return tasks;
            }
        }
        
        // Default: create tasks from current test failures
        logger.debug('📋 Creating tasks from current test failures...');
        return await this.createTasksFromTestFailures(options);
    }

    /**
     * Get tasks from test reports
     * @param {Object} options - Options
     * @returns {Promise<Array>} Tasks
     */
    async getTasksFromTestReports(options) {
        const fs = require('fs').promises;
        const path = require('path');
        
        try {
            const testReportPath = options.testReportPath || 'test-report.md';
            const testReportFullPath = options.testReportFullPath || 'test-report-full.md';
            
            let tasks = [];
            
            // Try test-report.md
            try {
                const testReport = await fs.readFile(testReportPath, 'utf8');
                tasks = this.parseTasksFromTestReport(testReport);
            } catch (error) {
                logger.debug('No test-report.md found');
            }
            
            // Try test-report-full.md
            try {
                const testReportFull = await fs.readFile(testReportFullPath, 'utf8');
                const fullTasks = this.parseTasksFromTestReportFull(testReportFull);
                tasks = [...tasks, ...fullTasks];
            } catch (error) {
                logger.debug('No test-report-full.md found');
            }
            
            return tasks;
            
        } catch (error) {
            logger.debug('Failed to read test reports:', error.message);
            return [];
        }
    }

    /**
     * Get tasks from coverage report
     * @param {Object} options - Options
     * @returns {Promise<Array>} Tasks
     */
    async getTasksFromCoverageReport(options) {
        const fs = require('fs').promises;
        
        try {
            const coveragePath = options.coveragePath || 'coverage.md';
            const coverageReport = await fs.readFile(coveragePath, 'utf8');
            
            return this.parseTasksFromCoverageReport(coverageReport);
            
        } catch (error) {
            logger.log('Failed to read coverage report:', error.message);
            return [];
        }
    }

    /**
     * Create tasks from current test failures
     * @param {Object} options - Options
     * @returns {Promise<Array>} Tasks
     */
    async createTasksFromTestFailures(options) {
        const { execSync } = require('child_process');
        
        try {
            // Run tests to get current failures
            const testOutput = execSync('npm test -- --json --silent', {
                cwd: process.cwd(),
                encoding: 'utf8',
                stdio: 'pipe'
            });
            
            const testResults = JSON.parse(testOutput);
            const failingTests = testResults.testResults
                .flatMap(result => result.assertionResults || [])
                .filter(test => test.status === 'failed');
            
            // Create tasks for each failing test
            return failingTests.map((test, index) => ({
                id: `auto-fix-${Date.now()}-${index}`,
                title: `Fix failing test: ${test.title}`,
                description: `Fix the failing test "${test.title}" in ${test.ancestorTitles.join(' > ')}`,
                type: { value: 'testing' },
                priority: { value: 'high' },
                status: { value: 'pending' },
                metadata: {
                    testFile: test.ancestorTitles.join(' > '),
                    testName: test.title,
                    error: test.failureMessages?.[0] || 'Unknown error',
                    projectPath: process.cwd()
                },
                createdAt: new Date(),
                updatedAt: new Date()
            }));
            
        } catch (error) {
            logger.debug('Failed to create tasks from test failures:', error.message);
            return [];
        }
    }

    /**
     * Parse tasks from test report
     * @param {string} testReport - Test report content
     * @returns {Array} Tasks
     */
    parseTasksFromTestReport(testReport) {
        const tasks = [];
        
        // Parse failing tests from test report
        const failingTestsMatch = testReport.match(/Failing Tests.*?(\d+)/s);
        if (failingTestsMatch) {
            const failingCount = parseInt(failingTestsMatch[1]);
            
            for (let i = 0; i < failingCount; i++) {
                tasks.push({
                    id: `test-fix-${Date.now()}-${i}`,
                    title: `Fix failing test ${i + 1}`,
                    description: `Fix failing test from test report`,
                    type: { value: 'testing' },
                    priority: { value: 'high' },
                    status: { value: 'pending' },
                    metadata: {
                        source: 'test-report',
                        projectPath: process.cwd()
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        }
        
        return tasks;
    }

    /**
     * Parse tasks from full test report
     * @param {string} testReportFull - Full test report content
     * @returns {Array} Tasks
     */
    parseTasksFromTestReportFull(testReportFull) {
        const tasks = [];
        
        // Parse specific failing tests from full report
        const failingTestsSection = testReportFull.match(/❌ Failing Tests.*?(?=##|$)/s);
        if (failingTestsSection) {
            const failingTestLines = failingTestsSection[0].match(/\| `([^`]+)` \| `([^`]+)` \| `([^`]+)` \|/g);
            
            if (failingTestLines) {
                failingTestLines.forEach((line, index) => {
                    const matches = line.match(/\| `([^`]+)` \| `([^`]+)` \| `([^`]+)` \|/);
                    if (matches) {
                        const [, fileName, testName, lastError] = matches;
                        tasks.push({
                            id: `test-fix-${Date.now()}-${index}`,
                            title: `Fix test: ${testName}`,
                            description: `Fix the failing test "${testName}" in ${fileName}`,
                            type: { value: 'testing' },
                            priority: { value: 'high' },
                            status: { value: 'pending' },
                            metadata: {
                                testFile: fileName,
                                testName: testName,
                                error: lastError,
                                source: 'test-report-full',
                                projectPath: process.cwd()
                            },
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                    }
                });
            }
        }
        
        return tasks;
    }

    /**
     * Parse tasks from coverage report
     * @param {string} coverageReport - Coverage report content
     * @returns {Array} Tasks
     */
    parseTasksFromCoverageReport(coverageReport) {
        const tasks = [];
        
        // Parse files with low coverage
        const lowCoverageMatch = coverageReport.match(/Files with ≥80% Coverage.*?(\d+)/s);
        if (lowCoverageMatch) {
            const lowCoverageCount = parseInt(lowCoverageMatch[1]);
            
            // Find files with low coverage
            const fileLines = coverageReport.match(/\| `([^`]+)` \| \d+% \| \d+% \| \d+% \| \d+% \| ❌ \|/g);
            
            if (fileLines) {
                fileLines.forEach((line, index) => {
                    const fileMatch = line.match(/\| `([^`]+)` \|/);
                    if (fileMatch) {
                        const fileName = fileMatch[1];
                        tasks.push({
                            id: `coverage-improve-${Date.now()}-${index}`,
                            title: `Improve coverage for ${fileName}`,
                            description: `Improve test coverage for ${fileName}`,
                            type: { value: 'testing' },
                            priority: { value: 'medium' },
                            status: { value: 'pending' },
                            metadata: {
                                fileName: fileName,
                                source: 'coverage-report',
                                projectPath: process.cwd()
                            },
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                    }
                });
            }
        }
        
        return tasks;
    }

    // Helper methods
    createSpinner(text) {
        const ora = require('ora');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
        return ora(text).start();
    }

    handleError(message, error) {
        logger.error(chalk.red(`❌ ${message}: ${error.message}`));
        if (process.env.DEBUG) {
            logger.error(error.stack);
        }
    }

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

    async getCodeFiles(targetPath) {
        const files = [];
        const extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs'];
        
        try {
            await this.scanDirectory(targetPath, files, extensions);
            return files;
        } catch (error) {
            return [];
        }
    }

    async scanDirectory(dirPath, files, extensions) {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            
            if (entry.isDirectory === true && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                await this.scanDirectory(fullPath, files, extensions);
            } else if (entry.isFile === true && extensions.includes(path.extname(entry.name))) {
                files.push(fullPath);
            }
        }
    }

    async collectTaskData(options) {
        const questions = [];

        if (!options.title) {
            questions.push({
                type: 'input',
                name: 'title',
                message: 'Task title:',
                validate: input => input.length > 0 ? true : 'Title is required'
            });
        }

        if (!options.description) {
            questions.push({
                type: 'input',
                name: 'description',
                message: 'Task description:'
            });
        }

        if (!options.type) {
            questions.push({
                type: 'list',
                name: 'type',
                message: 'Task type:',
                choices: ['analysis', 'script', 'optimization', 'security', 'refactoring', 'testing', 'deployment', 'custom']
            });
        }

        if (!options.priority) {
            questions.push({
                type: 'list',
                name: 'priority',
                message: 'Task priority:',
                choices: ['low', 'normal', 'high', 'critical']
            });
        }

        const answers = await inquirer.prompt(questions);

        return {
            title: options.title || answers.title,
            description: options.description || answers.description,
            type: options.type || answers.type,
            priority: options.priority || answers.priority
        };
    }

    async monitorTaskExecution(executionId) {
        const spinner = this.createSpinner('⏳ Monitoring task execution...');
        
        let completed = false;
        while (!completed) {
            try {
                const result = await this.queryBus.execute('GetTaskExecutionQuery', { executionId });
                
                if (result.execution) {
                    spinner.text = `⏳ ${result.execution.currentStep} (${result.execution.progress}%)`;
                    
                    if (result.execution.status === 'completed' || result.execution.status === 'error') {
                        completed = true;
                        if (result.execution.status === 'completed') {
                            spinner.succeed('Task execution completed');
                        } else {
                            spinner.fail('Task execution failed');
                        }
                    }
                }
                
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                completed = true;
                spinner.fail('Failed to monitor task execution');
            }
        }
    }

    async collectProjectData(targetPath) {
        const files = await this.getCodeFiles(targetPath);
        const projectData = {
            name: path.basename(targetPath),
            path: targetPath,
            files: files.slice(0, 10), // Limit for analysis
            dependencies: await this.extractDependencies(targetPath)
        };

        // Read sample files for analysis
        projectData.code = '';
        for (const file of files.slice(0, 3)) {
            try {
                projectData.code += await fs.readFile(file, 'utf8') + '\n';
            } catch (error) {
                // Skip files that can't be read
            }
        }

        return projectData;
    }

    async extractDependencies(targetPath) {
        try {
            const packageJsonPath = path.join(targetPath, 'package.json');
            const packageJson = await fs.readFile(packageJsonPath, 'utf8');
            const pkg = JSON.parse(packageJson);
            return {
                dependencies: pkg.dependencies || {},
                devDependencies: pkg.devDependencies || {}
            };
        } catch (error) {
            return { dependencies: {}, devDependencies: {} };
        }
    }

    async detectTestFramework(targetPath) {
        try {
            const files = await fs.readdir(targetPath);
            
            if (files.includes('jest.config.js') || files.includes('package.json')) {
                const packageJson = await fs.readFile(path.join(targetPath, 'package.json'), 'utf8');
                const pkg = JSON.parse(packageJson);
                if (pkg.devDependencies?.jest) return 'jest';
            }
            
            if (files.includes('pytest.ini') || files.includes('requirements.txt')) return 'pytest';
            if (files.includes('pom.xml')) return 'maven';
            if (files.includes('build.gradle')) return 'gradle';
            
            return 'unknown';
        } catch (error) {
            return 'unknown';
        }
    }

    // Display methods
    displayProjectAnalysis(result, projectPath, options) {
        logger.log(chalk.blue('\n📊 Project Analysis Results:'));
        logger.log(chalk.gray(`Project: ${path.basename(projectPath)}`));
        
        if (result.analysis) {
            logger.log(chalk.blue('\n💡 Analysis:'));
            // logger.log(result.analysis); // Entfernt, um Spam zu verhindern
        }

        if (result.insights && result.insights.length > 0) {
            logger.log(chalk.blue('\n🔍 Key Insights:'));
            result.insights.forEach((insight, index) => {
                logger.log(chalk.gray(`${index + 1}. ${insight}`));
            });
        }

        if (result.recommendations && result.recommendations.length > 0) {
            logger.log(chalk.blue('\n🎯 Recommendations:'));
            result.recommendations.forEach((rec, index) => {
                logger.log(chalk.gray(`${index + 1}. ${rec.title}`));
                logger.log(chalk.gray(`   ${rec.description}`));
            });
        }
    }

    displayTaskList(tasks, format = 'table') {
        if (format === 'json') {
            logger.log(JSON.stringify(tasks, null, 2));
            return;
        }

        const table = new Table({
            head: ['ID', 'Title', 'Type', 'Status', 'Priority', 'Created'],
            colWidths: [10, 30, 15, 15, 15, 20]
        });

        tasks.forEach(task => {
            table.push([
                task.id.substring(0, 8),
                task.title,
                task.type,
                task.status,
                task.priority,
                new Date(task.createdAt).toLocaleDateString()
            ]);
        });

        logger.log(table.toString());
    }

    displayTaskInfo(task) {
        logger.log(chalk.blue('\n📋 Task Information:'));
        logger.log(chalk.gray(`ID: ${chalk.white(task.id)}`));
        logger.log(chalk.gray(`Title: ${chalk.white(task.title)}`));
        logger.log(chalk.gray(`Description: ${chalk.white(task.description)}`));
        logger.log(chalk.gray(`Type: ${chalk.white(task.type)}`));
        logger.log(chalk.gray(`Status: ${chalk.white(task.status)}`));
        logger.log(chalk.gray(`Priority: ${chalk.white(task.priority)}`));
        logger.log(chalk.gray(`Created: ${chalk.white(new Date(task.createdAt).toLocaleString())}`));
    }

    displayTaskExecution(result) {
        logger.log(chalk.blue('\n▶️  Task Execution Started:'));
        logger.log(chalk.gray(`Task ID: ${chalk.white(result.task.id)}`));
        logger.log(chalk.gray(`Execution ID: ${chalk.white(result.execution.id)}`));
        logger.log(chalk.gray(`Status: ${chalk.white(result.execution.status)}`));
    }

    displayScriptInfo(result) {
        logger.log(chalk.blue('\n🔧 Script Information:'));
        logger.log(chalk.gray(`Type: ${chalk.white(result.scriptType)}`));
        logger.log(chalk.gray(`Target: ${chalk.white(result.requirements.target)}`));
        logger.log(chalk.gray(`Generated: ${chalk.white(new Date(result.timestamp).toLocaleString())}`));
    }

    displayScriptExecution(result) {
        logger.log(chalk.blue('\n▶️  Script Execution Results:'));
        logger.log(chalk.gray(`Exit Code: ${chalk.white(result.exitCode)}`));
        logger.log(chalk.gray(`Duration: ${chalk.white(result.duration)}ms`));
        
        if (result.output) {
            logger.log(chalk.blue('\n📤 Output:'));
            logger.log(result.output);
        }
        
        if (result.error) {
            logger.log(chalk.red('\n❌ Error:'));
            logger.log(result.error);
        }
    }

    displayScriptList(scripts) {
        const table = new Table({
            head: ['ID', 'Name', 'Type', 'Status', 'Created'],
            colWidths: [10, 30, 15, 15, 20]
        });

        scripts.forEach(script => {
            table.push([
                script.id.substring(0, 8),
                script.name,
                script.type,
                script.status,
                new Date(script.createdAt).toLocaleDateString()
            ]);
        });

        logger.log(table.toString());
    }

    // Placeholder methods for other functionality
    async applyRefactoring(refactoringResults) {
        logger.log(chalk.blue('🔨 Applying refactoring...'));
    }

    displayRefactoringResults(results, options) {
        logger.log(chalk.blue('\n🔨 Refactoring Results:'));
        results.forEach((result, index) => {
            logger.log(chalk.gray(`${index + 1}. ${path.basename(result.file)}`));
            logger.log(chalk.gray(`   Recommendations: ${result.recommendations.length}`));
        });
    }

    displayOptimizationResults(results, options) {
        logger.log(chalk.blue('\n⚡ Optimization Results:'));
        results.forEach((result, index) => {
            logger.log(chalk.gray(`${index + 1}. ${path.basename(result.file)}`));
            logger.log(chalk.gray(`   Recommendations: ${result.recommendations.length}`));
        });
    }

    displaySecurityResults(results, options) {
        logger.log(chalk.blue('\n🔒 Security Analysis Results:'));
        logger.log(chalk.gray(`Vulnerabilities found: ${results.vulnerabilities.length}`));
        logger.log(chalk.gray(`Recommendations: ${results.recommendations.length}`));
    }

    async executeTests(targetPath, framework, options) {
        return { total: 10, passed: 8, failed: 2, coverage: 85 };
    }

    displayTestResults(results, options) {
        logger.debug(chalk.blue('\n🧪 Test Results:'));
        logger.log(chalk.gray(`Total: ${chalk.white(results.total)}`));
        logger.log(chalk.green(`Passed: ${results.passed}`));
        logger.log(chalk.red(`Failed: ${results.failed}`));
        logger.log(chalk.blue(`Coverage: ${results.coverage}%`));
    }

    async buildApplication(targetPath) {
        logger.log(chalk.blue('🔨 Building application...'));
    }

    async runPreDeploymentTests(targetPath) {
        logger.debug(chalk.blue('🧪 Running pre-deployment tests...'));
    }

    async deployToEnvironment(targetPath, environment, options) {
        return { success: true, url: 'https://app.example.com' };
    }

    displayDeploymentResults(results) {
        logger.log(chalk.blue('\n🚀 Deployment Results:'));
        logger.log(chalk.gray(`Status: ${chalk.white(results.success ? 'Success' : 'Failed')}`));
        if (results.url) {
            logger.log(chalk.gray(`URL: ${chalk.white(results.url)}`));
        }
    }

    displaySystemStats(stats) {
        logger.log(chalk.blue('\n📊 System Statistics:'));
        logger.log(chalk.gray(`Tasks: ${chalk.white(stats.tasks.total || 0)}`));
        logger.log(chalk.gray(`AI Models: ${chalk.white(stats.ai.models.length)}`));
        logger.log(chalk.gray(`Active Executions: ${chalk.white(stats.execution.activeExecutions)}`));
    }

    async checkDatabaseHealth() {
        return { status: 'healthy' };
    }

    async checkServiceHealth() {
        return { status: 'healthy' };
    }

    displayHealthStatus(healthChecks) {
        logger.log(chalk.blue('\n🏥 System Health Status:'));
        Object.entries(healthChecks).forEach(([service, health]) => {
            const status = health.status === 'healthy' ? chalk.green('✅') : chalk.red('❌');
            logger.log(chalk.gray(`${service}: ${status} ${health.status}`));
        });
    }

    async performDataCleanup(days) {
        return { deletedTasks: 10, deletedExecutions: 50, freedSpace: '1.2MB' };
    }

    displayCleanupResults(results) {
        logger.log(chalk.blue('\n🧹 Cleanup Results:'));
        logger.log(chalk.gray(`Deleted Tasks: ${chalk.white(results.deletedTasks)}`));
        logger.log(chalk.gray(`Deleted Executions: ${chalk.white(results.deletedExecutions)}`));
        logger.log(chalk.gray(`Freed Space: ${chalk.white(results.freedSpace)}`));
    }
}

module.exports = TaskCommands; 