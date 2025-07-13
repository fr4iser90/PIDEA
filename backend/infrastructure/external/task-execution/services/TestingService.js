/**
 * Testing service for TaskExecutionEngine
 */
const EXECUTION_CONSTANTS = require('../constants/ExecutionConstants');

class TestingService {
    constructor(dependencies = {}, logger = console) {
        this.aiService = dependencies.aiService;
        this.fileSystemService = dependencies.fileSystemService;
        this.scriptExecutor = dependencies.scriptExecutor;
        this.logger = logger;
    }

    /**
     * Execute testing task
     * @param {Object} execution - Execution object
     * @returns {Promise<Object>} Testing result
     */
    async executeTestingTask(execution) {
        try {
            execution.status = EXECUTION_CONSTANTS.EXECUTION_STATUS.RUNNING;
            execution.currentStep = 'Preparing test environment';
            execution.progress = 10;

            const { target, testType } = execution.task.data;

            // Update progress
            this.updateExecutionProgress(execution, 20, 'Installing test dependencies');

            // Install test dependencies
            await this.installTestDependencies(target, execution);

            // Update progress
            this.updateExecutionProgress(execution, 40, 'Running tests');

            // Run tests
            const testResults = await this.runTests(target, testType, execution);

            // Update progress
            this.updateExecutionProgress(execution, 70, 'Analyzing test results');

            // Analyze test results
            const analysis = await this.analyzeTestResults(testResults, execution);

            // Update progress
            this.updateExecutionProgress(execution, 90, 'Generating test report');

            const result = {
                testResults,
                analysis,
                summary: {
                    totalTests: testResults.totalTests || 0,
                    passedTests: testResults.passedTests || 0,
                    failedTests: testResults.failedTests || 0,
                    skippedTests: testResults.skippedTests || 0,
                    coverage: testResults.coverage || 0
                },
                metrics: {
                    testDuration: Date.now() - execution.startTime.getTime()
                }
            };

            this.updateExecutionProgress(execution, 100, 'Testing completed');

            return result;

        } catch (error) {
            this.logger.error('TestingService: Testing task failed', {
                executionId: execution.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Install test dependencies
     * @param {string} target - Target specification
     * @param {Object} execution - Execution object
     */
    async installTestDependencies(target, execution) {
        try {
            const { getProjectContextService } = require('../../../di/ProjectContextService');
            const projectContext = getProjectContextService();
            const projectPath = await projectContext.getProjectPath();
            
            // Check if package.json exists
            const packageJsonPath = `${projectPath}/package.json`;
            if (await this.fileSystemService.exists(packageJsonPath)) {
                // Install npm dependencies
                await this.scriptExecutor.executeScript('npm install', {
                    cwd: projectPath,
                    timeout: 300000 // 5 minutes
                });

                // Install test-specific dependencies if needed
                const packageJson = JSON.parse(await this.fileSystemService.readFile(packageJsonPath));
                const hasTestScript = packageJson.scripts && packageJson.scripts.test;
                
                if (!hasTestScript) {
                    this.logger.warn('TestingService: No test script found in package.json');
                }
            } else {
                this.logger.warn('TestingService: No package.json found, skipping dependency installation');
            }
        } catch (error) {
            this.logger.error('TestingService: Failed to install test dependencies', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Run tests
     * @param {string} target - Target specification
     * @param {string} testType - Type of tests to run
     * @param {Object} execution - Execution object
     * @returns {Promise<Object>} Test results
     */
    async runTests(target, testType, execution) {
        try {
            const { getProjectContextService } = require('../../../di/ProjectContextService');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
            const projectContext = getProjectContextService();
            const projectPath = await projectContext.getProjectPath();
            let testCommand = '';
            let testResults = {};

            switch (testType) {
                case EXECUTION_CONSTANTS.TEST_TYPES.UNIT:
                    testCommand = 'npm run test:unit || npm test';
                    break;
                case EXECUTION_CONSTANTS.TEST_TYPES.INTEGRATION:
                    testCommand = 'npm run test:integration';
                    break;
                case EXECUTION_CONSTANTS.TEST_TYPES.E2E:
                    testCommand = 'npm run test:e2e';
                    break;
                default:
                    testCommand = 'npm test';
            }

            // Run the test command
            const result = await this.scriptExecutor.executeScript(testCommand, {
                cwd: projectPath,
                timeout: execution.options.timeout || EXECUTION_CONSTANTS.EXECUTION_TIMEOUT
            });

            // Parse test results
            testResults = this.parseTestOutput(result.output, testType);

            return {
                ...testResults,
                command: testCommand,
                exitCode: result.exitCode,
                duration: result.duration,
                output: result.output,
                error: result.error
            };

        } catch (error) {
            this.logger.error('TestingService: Failed to run tests', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Parse test output
     * @param {string} output - Test command output
     * @param {string} testType - Type of tests
     * @returns {Object} Parsed test results
     */
    parseTestOutput(output, testType) {
        const results = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0,
            coverage: 0,
            failures: []
        };

        try {
            // Basic parsing for common test output patterns
            const lines = output.split('\n');
            
            for (const line of lines) {
                // Jest-like output
                if (line.includes('Tests:')) {
                    const match = line.match(/(\d+) total/);
                    if (match) results.totalTests = parseInt(match[1]);
                }
                
                if (line.includes('Pass:')) {
                    const match = line.match(/(\d+) passed/);
                    if (match) results.passedTests = parseInt(match[1]);
                }
                
                if (line.includes('Fail:')) {
                    const match = line.match(/(\d+) failed/);
                    if (match) results.failedTests = parseInt(match[1]);
                }
                
                if (line.includes('Skip:')) {
                    const match = line.match(/(\d+) skipped/);
                    if (match) results.skippedTests = parseInt(match[1]);
                }
                
                // Coverage parsing
                if (line.includes('All files')) {
                    const match = line.match(/(\d+(?:\.\d+)?)%/);
                    if (match) results.coverage = parseFloat(match[1]);
                }
                
                // Failure details
                if (line.includes('FAIL') || line.includes('✕')) {
                    results.failures.push(line.trim());
                }
            }
        } catch (error) {
            this.logger.warn('TestingService: Failed to parse test output', {
                error: error.message
            });
        }

        return results;
    }

    /**
     * Analyze test results
     * @param {Object} testResults - Test results
     * @param {Object} execution - Execution object
     * @returns {Promise<Object>} Analysis results
     */
    async analyzeTestResults(testResults, execution) {
        const analysis = {
            quality: 'unknown',
            recommendations: [],
            issues: []
        };

        try {
            // Analyze test coverage
            if (testResults.coverage < 50) {
                analysis.quality = 'poor';
                analysis.recommendations.push('Increase test coverage to at least 50%');
                analysis.issues.push('Low test coverage detected');
            } else if (testResults.coverage < 80) {
                analysis.quality = 'fair';
                analysis.recommendations.push('Consider increasing test coverage to 80% or higher');
            } else {
                analysis.quality = 'good';
            }

            // Analyze test failures
            if (testResults.failedTests > 0) {
                analysis.quality = 'poor';
                analysis.issues.push(`${testResults.failedTests} test(s) failed`);
                analysis.recommendations.push('Fix failing tests before proceeding');
            }

            // Analyze test execution
            if (testResults.totalTests === 0) {
                analysis.quality = 'poor';
                analysis.issues.push('No tests were executed');
                analysis.recommendations.push('Add tests to your project');
            }

            // Generate AI-powered recommendations
            if (this.aiService) {
                const aiAnalysis = await this.aiService.analyzeTestResults(testResults, {
                    userId: execution.options.userId,
                    model: execution.options.aiModel || 'gpt-4'
                });

                if (aiAnalysis.recommendations) {
                    analysis.recommendations.push(...aiAnalysis.recommendations);
                }
            }

        } catch (error) {
            this.logger.error('TestingService: Failed to analyze test results', {
                error: error.message
            });
        }

        return analysis;
    }

    /**
     * Update execution progress
     * @param {Object} execution - Execution object
     * @param {number} progress - Progress percentage
     * @param {string} step - Current step description
     */
    updateExecutionProgress(execution, progress, step) {
        execution.progress = Math.min(100, Math.max(0, progress));
        execution.currentStep = step;
        execution.lastUpdate = new Date();

        this.logger.info('TestingService: Progress updated', {
            executionId: execution.id,
            progress: execution.progress,
            step: step
        });
    }
}

module.exports = TestingService; 