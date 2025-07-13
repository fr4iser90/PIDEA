/**
 * Task Management Service
 * Handles task and execution record operations
 */

const { ESTIMATED_TIMES } = require('../constants/ScriptGenerationConstants');
const { logger } = require('@infrastructure/logging/Logger');

class TaskManagementService {
    constructor(dependencies = {}) {
        this.taskRepository = dependencies.taskRepository;
        this.taskExecutionRepository = dependencies.taskExecutionRepository;
        this.logger = dependencies.logger;
    }

    /**
     * Create script generation task
     * @param {Object} command - Script generation command
     * @param {string} handlerId - Handler ID
     * @returns {Promise<Object>} Script generation task
     */
    async createScriptTask(command, handlerId) {
        try {
            const task = await this.taskRepository.create({
                title: `Generate ${command.scriptType} script for ${command.projectPath}`,
                description: `AI-powered ${command.scriptType} script generation`,
                taskType: 'script',
                priority: 'medium',
                projectPath: command.projectPath,
                status: 'pending',
                metadata: {
                    scriptType: command.scriptType,
                    options: command.options || {},
                    commandId: command.commandId,
                    handlerId: handlerId
                },
                createdBy: command.requestedBy,
                estimatedTime: this.getEstimatedTime(command.scriptType, command.options)
            });

            this.logger.info('TaskManagementService: Created script generation task', {
                taskId: task.id,
                projectPath: command.projectPath,
                scriptType: command.scriptType
            });

            return task;
        } catch (error) {
            this.logger.error('TaskManagementService: Failed to create script generation task', {
                projectPath: command.projectPath,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Create execution record
     * @param {Object} task - Script generation task
     * @param {Object} command - Script generation command
     * @param {string} handlerId - Handler ID
     * @returns {Promise<Object>} Execution record
     */
    async createExecutionRecord(task, command, handlerId) {
        try {
            const execution = await this.taskExecutionRepository.create({
                taskId: task.id,
                status: 'running',
                startedAt: new Date(),
                requestedBy: command.requestedBy,
                options: command.options || {},
                metadata: {
                    commandId: command.commandId,
                    handlerId: handlerId,
                    scriptType: command.scriptType,
                    projectPath: command.projectPath
                }
            });

            this.logger.info('TaskManagementService: Created execution record', {
                executionId: execution.id,
                taskId: task.id
            });

            return execution;
        } catch (error) {
            this.logger.error('TaskManagementService: Failed to create execution record', {
                taskId: task.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Update execution record
     * @param {Object} execution - Execution record
     * @param {Object} result - Script generation result
     * @returns {Promise<void>}
     */
    async updateExecutionRecord(execution, result) {
        try {
            await this.taskExecutionRepository.update(execution.id, {
                status: result.status,
                completedAt: new Date(),
                duration: result.duration,
                output: {
                    scriptId: result.scriptId,
                    scriptName: result.scriptName,
                    scriptPath: result.scriptPath
                },
                metadata: {
                    ...execution.metadata,
                    result: result.metadata,
                    warnings: result.warnings,
                    errors: result.errors
                }
            });

            this.logger.info('TaskManagementService: Updated execution record', {
                executionId: execution.id,
                status: result.status,
                duration: result.duration
            });
        } catch (error) {
            this.logger.error('TaskManagementService: Failed to update execution record', {
                executionId: execution.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Update task status
     * @param {Object} task - Script generation task
     * @param {Object} result - Script generation result
     * @returns {Promise<void>}
     */
    async updateTaskStatus(task, result) {
        try {
            if (result.status === 'completed') {
                task.markAsCompleted();
            } else {
                task.markAsFailed();
            }

            await this.taskRepository.update(task.id, {
                status: task.status.value,
                lastExecutedAt: new Date(),
                executionCount: task.executionCount + 1
            });

            this.logger.info('TaskManagementService: Updated task status', {
                taskId: task.id,
                newStatus: task.status.value,
                executionCount: task.executionCount
            });
        } catch (error) {
            this.logger.error('TaskManagementService: Failed to update task status', {
                taskId: task.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get estimated time for script generation
     * @param {string} scriptType - Script type
     * @param {Object} options - Script options
     * @returns {number} Estimated time in minutes
     */
    getEstimatedTime(scriptType, options = {}) {
        let baseTime = ESTIMATED_TIMES[scriptType] || 5;
        
        // Adjust based on complexity
        if (options.complex) {
            baseTime *= 1.5;
        }

        return baseTime;
    }
}

module.exports = TaskManagementService; 