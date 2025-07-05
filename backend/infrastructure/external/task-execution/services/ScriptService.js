/**
 * Script execution service for TaskExecutionEngine
 */
const EXECUTION_CONSTANTS = require('../constants/ExecutionConstants');

class ScriptService {
    constructor(dependencies = {}, logger = console) {
        this.scriptExecutor = dependencies.scriptExecutor;
        this.logger = logger;
    }

    /**
     * Execute script task
     * @param {Object} execution - Execution object
     * @returns {Promise<Object>} Script execution result
     */
    async executeScriptTask(execution) {
        try {
            execution.status = EXECUTION_CONSTANTS.EXECUTION_STATUS.RUNNING;
            execution.currentStep = 'Preparing script execution';
            execution.progress = 10;

            const { script, target, options: scriptOptions } = execution.task.data;

            // Update progress
            this.updateExecutionProgress(execution, 20, 'Validating script');

            // Validate script
            if (!script) {
                throw new Error('Script content is required');
            }

            // Update progress
            this.updateExecutionProgress(execution, 30, 'Setting up execution environment');

            // Prepare execution environment
            const executionContext = await this.prepareExecutionContext(execution);

            // Update progress
            this.updateExecutionProgress(execution, 50, 'Executing script');

            // Execute script
            const scriptResult = await this.scriptExecutor.executeScript(script, {
                cwd: executionContext.workingDirectory,
                env: executionContext.environment,
                timeout: execution.options.timeout || EXECUTION_CONSTANTS.EXECUTION_TIMEOUT,
                ...scriptOptions
            });

            // Update progress
            this.updateExecutionProgress(execution, 80, 'Processing results');

            // Process script results
            const result = {
                output: scriptResult.output,
                error: scriptResult.error,
                exitCode: scriptResult.exitCode,
                duration: scriptResult.duration,
                logs: scriptResult.logs,
                metrics: {
                    executionDuration: scriptResult.duration,
                    outputSize: scriptResult.output?.length || 0
                }
            };

            this.updateExecutionProgress(execution, 100, 'Script execution completed');

            return result;

        } catch (error) {
            this.logger.error('ScriptService: Script task failed', {
                executionId: execution.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Prepare execution context
     * @param {Object} execution - Execution object
     * @returns {Promise<Object>} Execution context
     */
    async prepareExecutionContext(execution) {
        const { task, options } = execution;
        
        // Get project path using centralized service
        const { getProjectContextService } = require('../../../di/ProjectContextService');
        const projectContext = getProjectContextService();
        const projectPath = await projectContext.getProjectPath();
        
        if (!projectPath) {
            throw new Error('Project path is required for execution');
        }

        // Create working directory
        const workingDirectory = projectPath;

        // Prepare environment variables
        const environment = {
            ...process.env,
            NODE_ENV: options.environment || 'development',
            PROJECT_PATH: projectPath,
            EXECUTION_ID: execution.id,
            TASK_ID: task.id
        };

        // Add custom environment variables from task
        if (task.data && task.data.environment) {
            Object.assign(environment, task.data.environment);
        }

        return {
            workingDirectory,
            environment,
            projectPath,
            executionId: execution.id,
            taskId: task.id
        };
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

        this.logger.info('ScriptService: Progress updated', {
            executionId: execution.id,
            progress: execution.progress,
            step: step
        });
    }
}

module.exports = ScriptService; 