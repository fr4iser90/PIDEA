
/**
 * StartStreamingHandler
 * 
 * Handles StartStreamingCommand execution by starting IDE screenshot streaming.
 */
const StartStreamingCommand = require('@application/commands/categories/management/StartStreamingCommand');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class StartStreamingHandler {
  constructor(screenshotStreamingService, eventBus = null) {
    this.screenshotStreamingService = screenshotStreamingService;
    this.eventBus = eventBus;
  }

  /**
   * Handle StartStreamingCommand
   * @param {StartStreamingCommand} command - Command to handle
   * @returns {Promise<Object>} Command execution result
   */
  async handle(command) {
    try {
      logger.info(`Processing command: ${command.commandId}`);
      
      // Validate command
      command.validate();
      
      // Check if session already exists
      const existingSession = this.screenshotStreamingService.getSession(command.sessionId);
      if (existingSession) {
        throw new Error(`Streaming session ${command.sessionId} already exists`);
      }
      
      // Start streaming
      const result = await this.screenshotStreamingService.startStreamingSession(
        command.sessionId,
        command.port,
        command.options
      );
      
      // Emit event if event bus is available
      if (this.eventBus) {
        this.eventBus.publish('streaming.started', {
          sessionId: command.sessionId,
          port: command.port,
          options: command.options,
          result: result,
          timestamp: new Date().toISOString()
        });
      }
      
      logger.info(`Successfully started streaming for session ${command.sessionId}`);
      
      return {
        success: true,
        commandId: command.commandId,
        sessionId: command.sessionId,
        result: result,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error(`Error handling command ${command.commandId}:`, error.message);
      
      // Emit error event if event bus is available
      if (this.eventBus) {
        this.eventBus.publish('streaming.error', {
          sessionId: command.sessionId,
          port: command.port,
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
    return command instanceof StartStreamingCommand || command.type === 'StartStreamingCommand';
  }

  /**
   * Get handler metadata
   * @returns {Object} Handler metadata
   */
  getMetadata() {
    return {
      type: 'StartStreamingHandler',
      supportedCommands: ['StartStreamingCommand'],
      description: 'Handles IDE screenshot streaming start commands'
    };
  }
}

module.exports = StartStreamingHandler; 