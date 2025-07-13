const { logger } = require('@infrastructure/logging/Logger');
/**
 * Event Publishing Service
 * Handles event publishing for script generation
 */

class EventPublishingService {
    constructor(dependencies = {}) {
        this.eventBus = dependencies.eventBus;
        this.logger = dependencies.logger;
    }

    /**
     * Publish script generation started event
     * @param {Object} execution - Execution record
     * @param {Object} command - Script generation command
     * @returns {Promise<void>}
     */
    async publishScriptGenerationStartedEvent(execution, command) {
        try {
            await this.eventBus.publish('script.generation.started', {
                executionId: execution.id,
                taskId: execution.taskId,
                projectPath: command.projectPath,
                scriptType: command.scriptType,
                startedAt: execution.startedAt,
                requestedBy: command.requestedBy,
                commandId: command.commandId
            });
        } catch (error) {
            this.logger.warn('EventPublishingService: Failed to publish script generation started event', {
                executionId: execution.id,
                error: error.message
            });
        }
    }

    /**
     * Publish script generation completed event
     * @param {Object} execution - Execution record
     * @param {Object} result - Script generation result
     * @param {Object} command - Script generation command
     * @returns {Promise<void>}
     */
    async publishScriptGenerationCompletedEvent(execution, result, command) {
        try {
            await this.eventBus.publish('script.generation.completed', {
                executionId: execution.id,
                taskId: execution.taskId,
                projectPath: command.projectPath,
                scriptType: command.scriptType,
                status: result.status,
                completedAt: new Date(),
                duration: result.duration,
                requestedBy: command.requestedBy,
                commandId: command.commandId,
                scriptId: result.scriptId,
                scriptName: result.scriptName,
                scriptPath: result.scriptPath,
                warnings: result.warnings,
                errors: result.errors
            });
        } catch (error) {
            this.logger.warn('EventPublishingService: Failed to publish script generation completed event', {
                executionId: execution.id,
                error: error.message
            });
        }
    }

    /**
     * Publish script generation failed event
     * @param {Error} error - Script generation error
     * @param {Object} command - Script generation command
     * @returns {Promise<void>}
     */
    async publishScriptGenerationFailedEvent(error, command) {
        try {
            await this.eventBus.publish('script.generation.failed', {
                projectPath: command.projectPath,
                scriptType: command.scriptType,
                commandId: command.commandId,
                error: error.message,
                errorType: error.constructor.name,
                timestamp: new Date(),
                requestedBy: command.requestedBy
            });
        } catch (eventError) {
            this.logger.warn('EventPublishingService: Failed to publish script generation failed event', {
                error: eventError.message
            });
        }
    }
}

module.exports = EventPublishingService; 