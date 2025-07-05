/**
 * Custom task service for TaskExecutionEngine
 */
const EXECUTION_CONSTANTS = require('../constants/ExecutionConstants');

class CustomTaskService {
    constructor(dependencies = {}, logger = console) {
        this.aiService = dependencies.aiService;
        this.scriptExecutor = dependencies.scriptExecutor;
        this.fileSystemService = dependencies.fileSystemService;
        this.logger = logger;
    }

    /**
     * Execute custom task
     * @param {Object} execution - Execution object
     * @returns {Promise<Object>} Custom task result
     */
    async executeCustomTask(execution) {
        try {
            execution.status = EXECUTION_CONSTANTS.EXECUTION_STATUS.RUNNING;
            execution.currentStep = 'Preparing custom task execution';
            execution.progress = 10;

            const { customScript, customData } = execution.task.data;

            // Update progress
            this.updateExecutionProgress(execution, 20, 'Validating custom script');

            // Validate custom script
            if (!customScript) {
                throw new Error('Custom script is required');
            }

            // Update progress
            this.updateExecutionProgress(execution, 40, 'Executing custom logic');

            // Execute custom logic
            const customResult = await this.executeCustomLogic(customScript, customData, execution);

            // Update progress
            this.updateExecutionProgress(execution, 80, 'Processing custom results');

            // Process custom results
            const result = {
                customResult,
                summary: {
                    scriptExecuted: true,
                    customDataProcessed: !!customData,
                    executionSuccess: customResult.success
                },
                metrics: {
                    customExecutionDuration: Date.now() - execution.startTime.getTime()
                }
            };

            this.updateExecutionProgress(execution, 100, 'Custom task completed');

            return result;

        } catch (error) {
            this.logger.error('CustomTaskService: Custom task failed', {
                executionId: execution.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Execute custom logic
     * @param {string} customScript - Custom script to execute
     * @param {Object} customData - Custom data for the script
     * @param {Object} execution - Execution object
     * @returns {Promise<Object>} Custom execution result
     */
    async executeCustomLogic(customScript, customData, execution) {
        try {
            const projectPath = execution.options.projectPath;
            
            // Prepare execution environment
            const environment = {
                ...process.env,
                NODE_ENV: execution.options.environment || 'development',
                PROJECT_PATH: projectPath,
                EXECUTION_ID: execution.id,
                TASK_ID: execution.task.id,
                CUSTOM_DATA: JSON.stringify(customData || {})
            };

            // Execute custom script
            const result = await this.scriptExecutor.executeScript(customScript, {
                cwd: projectPath,
                env: environment,
                timeout: execution.options.timeout || EXECUTION_CONSTANTS.EXECUTION_TIMEOUT
            });

            // Parse custom output if it's JSON
            let parsedOutput = null;
            try {
                parsedOutput = JSON.parse(result.output);
            } catch (e) {
                // Output is not JSON, use as-is
                parsedOutput = result.output;
            }

            return {
                success: result.exitCode === 0,
                output: parsedOutput,
                rawOutput: result.output,
                error: result.error,
                exitCode: result.exitCode,
                duration: result.duration,
                customData: customData
            };

        } catch (error) {
            this.logger.error('CustomTaskService: Failed to execute custom logic', {
                error: error.message
            });
            throw error;
        }
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

        this.logger.info('CustomTaskService: Progress updated', {
            executionId: execution.id,
            progress: execution.progress,
            step: step
        });
    }
}

module.exports = CustomTaskService; 