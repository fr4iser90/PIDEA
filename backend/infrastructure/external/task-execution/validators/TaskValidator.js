/**
 * Task validation for TaskExecutionEngine
 */
const EXECUTION_CONSTANTS = require('../constants/ExecutionConstants');

class TaskValidator {
    constructor(logger = console) {
        this.logger = logger;
    }

    /**
     * Validate task object
     * @param {Object} task - Task object to validate
     * @returns {Object} Validation result
     */
    validateTask(task) {
        const errors = [];
        const warnings = [];

        // Check required fields
        if (!task) {
            errors.push('Task object is required');
            return { isValid: false, errors, warnings };
        }

        if (!task.id) {
            errors.push('Task ID is required');
        }

        if (!task.type) {
            errors.push('Task type is required');
        } else if (!Object.values(EXECUTION_CONSTANTS.TASK_TYPES).includes(task.type)) {
            errors.push(`Invalid task type: ${task.type}`);
        }

        if (!task.data) {
            errors.push('Task data is required');
        }

        // Validate task-specific data
        if (task.data) {
            const dataValidation = this.validateTaskData(task.type, task.data);
            errors.push(...dataValidation.errors);
            warnings.push(...dataValidation.warnings);
        }

        // Validate options
        if (task.options) {
            const optionsValidation = this.validateTaskOptions(task.options);
            errors.push(...optionsValidation.errors);
            warnings.push(...optionsValidation.warnings);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate task data based on task type
     * @param {string} taskType - Task type
     * @param {Object} data - Task data
     * @returns {Object} Validation result
     */
    validateTaskData(taskType, data) {
        const errors = [];
        const warnings = [];

        switch (taskType) {
            case EXECUTION_CONSTANTS.TASK_TYPES.ANALYSIS:
                if (!data.target && !data.projectPath) {
                    errors.push('Analysis task requires target or projectPath');
                }
                break;

            case EXECUTION_CONSTANTS.TASK_TYPES.SCRIPT:
                if (!data.script) {
                    errors.push('Script task requires script content');
                }
                if (!data.target) {
                    warnings.push('Script task should specify target');
                }
                break;

            case EXECUTION_CONSTANTS.TASK_TYPES.OPTIMIZATION:
                if (!data.target) {
                    errors.push('Optimization task requires target');
                }
                if (!data.optimizationType) {
                    errors.push('Optimization task requires optimizationType');
                }
                break;

            case EXECUTION_CONSTANTS.TASK_TYPES.SECURITY:
                if (!data.target) {
                    errors.push('Security task requires target');
                }
                if (!data.scanType) {
                    errors.push('Security task requires scanType');
                }
                break;

            case EXECUTION_CONSTANTS.TASK_TYPES.REFACTORING:
                if (!data.target) {
                    errors.push('Refactoring task requires target');
                }
                if (!data.refactoringType) {
                    errors.push('Refactoring task requires refactoringType');
                }
                break;

            case EXECUTION_CONSTANTS.TASK_TYPES.TESTING:
                if (!data.target) {
                    errors.push('Testing task requires target');
                }
                if (!data.testType) {
                    errors.push('Testing task requires testType');
                }
                break;

            case EXECUTION_CONSTANTS.TASK_TYPES.DEPLOYMENT:
                if (!data.target) {
                    errors.push('Deployment task requires target');
                }
                if (!data.environment) {
                    errors.push('Deployment task requires environment');
                }
                if (!data.deploymentType) {
                    errors.push('Deployment task requires deploymentType');
                }
                break;

            case EXECUTION_CONSTANTS.TASK_TYPES.CUSTOM:
                if (!data.customScript) {
                    errors.push('Custom task requires customScript');
                }
                break;

            default:
                errors.push(`Unknown task type: ${taskType}`);
        }

        return { errors, warnings };
    }

    /**
     * Validate task options
     * @param {Object} options - Task options
     * @returns {Object} Validation result
     */
    validateTaskOptions(options) {
        const errors = [];
        const warnings = [];

        // Validate timeout
        if (options.timeout) {
            if (typeof options.timeout !== 'number' || options.timeout <= 0) {
                errors.push('Timeout must be a positive number');
            } else if (options.timeout > 3600000) { // 1 hour
                warnings.push('Timeout is very long, consider reducing');
            }
        }

        // Validate AI model
        if (options.aiModel) {
            const validModels = ['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'claude-2'];
            if (!validModels.includes(options.aiModel)) {
                warnings.push(`AI model ${options.aiModel} may not be supported`);
            }
        }

        // Validate environment
        if (options.environment) {
            const validEnvironments = ['development', 'staging', 'production', 'test'];
            if (!validEnvironments.includes(options.environment)) {
                warnings.push(`Environment ${options.environment} is not standard`);
            }
        }

        // Validate autoApply
        if (options.autoApply !== undefined && typeof options.autoApply !== 'boolean') {
            errors.push('autoApply must be a boolean');
        }

        return { errors, warnings };
    }

    /**
     * Validate execution object
     * @param {Object} execution - Execution object to validate
     * @returns {Object} Validation result
     */
    validateExecution(execution) {
        const errors = [];
        const warnings = [];

        if (!execution) {
            errors.push('Execution object is required');
            return { isValid: false, errors, warnings };
        }

        if (!execution.id) {
            errors.push('Execution ID is required');
        }

        if (!execution.taskId) {
            errors.push('Task ID is required');
        }

        if (!execution.task) {
            errors.push('Task object is required');
        }

        if (!execution.status) {
            errors.push('Execution status is required');
        } else if (!Object.values(EXECUTION_CONSTANTS.EXECUTION_STATUS).includes(execution.status)) {
            errors.push(`Invalid execution status: ${execution.status}`);
        }

        if (execution.progress !== undefined) {
            if (typeof execution.progress !== 'number' || execution.progress < 0 || execution.progress > 100) {
                errors.push('Progress must be a number between 0 and 100');
            }
        }

        if (execution.startTime && !(execution.startTime instanceof Date)) {
            errors.push('Start time must be a Date object');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate dependencies
     * @param {Object} dependencies - Dependencies object
     * @returns {Object} Validation result
     */
    validateDependencies(dependencies) {
        const errors = [];
        const warnings = [];

        if (!dependencies) {
            errors.push('Dependencies object is required');
            return { isValid: false, errors, warnings };
        }

        const requiredServices = ['aiService', 'scriptExecutor', 'fileSystemService'];
        
        for (const service of requiredServices) {
            if (!dependencies[service]) {
                errors.push(`${service} is required`);
            }
        }

        // Optional services
        const optionalServices = ['gitService', 'dockerService', 'logger', 'eventBus'];
        
        for (const service of optionalServices) {
            if (!dependencies[service]) {
                warnings.push(`${service} is not provided, some features may not work`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
}

module.exports = TaskValidator; 