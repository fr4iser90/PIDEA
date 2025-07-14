
/**
 * StopStreamingHandler
 * 
 * Handles StopStreamingCommand execution by stopping IDE screenshot streaming.
 */
const StopStreamingCommand = require('@application/commands/categories/management/StopStreamingCommand');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class StopStreamingHandler {
  constructor(screenshotStreamingService, eventBus = null) {
    this.screenshotStreamingService = screenshotStreamingService;
    this.eventBus = eventBus;
  }

  /**
   * Handle StopStreamingCommand
   * @param {StopStreamingCommand} command - Command to handle
   * @returns {Promise<Object>} Command execution result
   */
  async handle(command) {
    try {
      logger.info(`[StopStreamingHandler] Processing command: ${command.commandId}`);
      
      // Validate command
      command.validate();
      
      // Check if session exists
      const existingSession = this.screenshotStreamingService.getSession(command.sessionId);
      if (!existingSession) {
        throw new Error(`Streaming session ${command.sessionId} not found`);
      }
      
      // Stop streaming
      const result = await this.screenshotStreamingService.stopStreamingSession(command.sessionId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to stop streaming');
      }
      
      // Emit event if event bus is available
      if (this.eventBus) {
        this.eventBus.publish('streaming.stopped', {
          sessionId: command.sessionId,
          result: result,
          timestamp: new Date().toISOString()
        });
      }
      
      logger.info(`[StopStreamingHandler] Successfully stopped streaming for session ${command.sessionId}`);
      
      return {
        success: true,
        commandId: command.commandId,
        sessionId: command.sessionId,
        result: result,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error(`[StopStreamingHandler] Error handling command ${command.commandId}:`, error.message);
      
      // Emit error event if event bus is available
      if (this.eventBus) {
        this.eventBus.publish('streaming.error', {
          sessionId: command.sessionId,
          error: error.message,
          commandId: command.commandId,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: false,
        commandId: command.commandId,
        sessionId: command.sessionId,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check if handler can handle the command
   * @param {Object} command - Command to check
   * @returns {boolean} Whether handler can handle the command
   */
  canHandle(command) {
    return command instanceof StopStreamingCommand || command.type === 'StopStreamingCommand';
  }

  /**
   * Get handler metadata
   * @returns {Object} Handler metadata
   */
  getMetadata() {
    return {
      type: 'StopStreamingHandler',
      supportedCommands: ['StopStreamingCommand'],
      description: 'Handles IDE screenshot streaming stop commands'
    };
  }
}

module.exports = StopStreamingHandler; 