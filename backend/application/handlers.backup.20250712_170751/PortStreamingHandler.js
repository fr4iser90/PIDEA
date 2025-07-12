/**
 * PortStreamingHandler
 * 
 * Handles PortStreamingCommand execution by managing IDE screenshot streaming
 * for specific ports. Replaces session-based approach with port-based management.
 */
const PortStreamingCommand = require('../commands/PortStreamingCommand');

class PortStreamingHandler {
  constructor(screenshotStreamingService, eventBus = null) {
    this.screenshotStreamingService = screenshotStreamingService;
    this.eventBus = eventBus;
  }

  /**
   * Handle PortStreamingCommand
   * @param {PortStreamingCommand} command - Command to handle
   * @returns {Promise<Object>} Command execution result
   */
  async handle(command) {
    try {
      console.log(`[PortStreamingHandler] Processing command: ${command.commandId} for port ${command.port}`);
      
      // Validate command
      command.validate();
      
      let result;
      
      // Execute command based on action
      switch (command.action) {
        case 'start':
          result = await this.handleStartCommand(command);
          break;
        case 'stop':
          result = await this.handleStopCommand(command);
          break;
        case 'pause':
          result = await this.handlePauseCommand(command);
          break;
        case 'resume':
          result = await this.handleResumeCommand(command);
          break;
        case 'config':
          result = await this.handleConfigCommand(command);
          break;
        default:
          throw new Error(`Unknown action: ${command.action}`);
      }
      
      // Emit success event if event bus is available
      if (this.eventBus) {
        this.eventBus.publish('streaming.port.action', {
          port: command.port,
          action: command.action,
          options: command.options,
          result: result,
          commandId: command.commandId,
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`[PortStreamingHandler] Successfully executed ${command.action} for port ${command.port}`);
      
      return {
        success: true,
        commandId: command.commandId,
        port: command.port,
        action: command.action,
        result: result,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`[PortStreamingHandler] Error handling command ${command.commandId}:`, error.message);
      
      // Emit error event if event bus is available
      if (this.eventBus) {
        this.eventBus.publish('streaming.port.error', {
          port: command.port,
          action: command.action,
          error: error.message,
          commandId: command.commandId,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: false,
        commandId: command.commandId,
        port: command.port,
        action: command.action,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Handle start streaming command
   * @param {PortStreamingCommand} command - Start command
   * @returns {Promise<Object>} Start result
   */
  async handleStartCommand(command) {
    // Check if port already exists
    const existingPort = this.screenshotStreamingService.getPort(command.port);
    if (existingPort && existingPort.isActive()) {
      throw new Error(`Port ${command.port} is already streaming`);
    }
    
    // Start streaming
    return await this.screenshotStreamingService.startStreaming(command.port, command.options);
  }

  /**
   * Handle stop streaming command
   * @param {PortStreamingCommand} command - Stop command
   * @returns {Promise<Object>} Stop result
   */
  async handleStopCommand(command) {
    // Check if port exists and is active
    const existingPort = this.screenshotStreamingService.getPort(command.port);
    if (!existingPort) {
      throw new Error(`Port ${command.port} is not streaming`);
    }
    
    // Stop streaming
    return await this.screenshotStreamingService.stopStreaming(command.port);
  }

  /**
   * Handle pause streaming command
   * @param {PortStreamingCommand} command - Pause command
   * @returns {Promise<Object>} Pause result
   */
  async handlePauseCommand(command) {
    // Check if port exists and is active
    const existingPort = this.screenshotStreamingService.getPort(command.port);
    if (!existingPort) {
      throw new Error(`Port ${command.port} is not streaming`);
    }
    
    if (!existingPort.isActive()) {
      throw new Error(`Port ${command.port} is not active and cannot be paused`);
    }
    
    // Pause streaming
    return await this.screenshotStreamingService.pauseStreaming(command.port);
  }

  /**
   * Handle resume streaming command
   * @param {PortStreamingCommand} command - Resume command
   * @returns {Promise<Object>} Resume result
   */
  async handleResumeCommand(command) {
    // Check if port exists and is paused
    const existingPort = this.screenshotStreamingService.getPort(command.port);
    if (!existingPort) {
      throw new Error(`Port ${command.port} is not streaming`);
    }
    
    if (!existingPort.isPaused()) {
      throw new Error(`Port ${command.port} is not paused and cannot be resumed`);
    }
    
    // Resume streaming
    return await this.screenshotStreamingService.resumeStreaming(command.port);
  }

  /**
   * Handle config update command
   * @param {PortStreamingCommand} command - Config command
   * @returns {Promise<Object>} Config update result
   */
  async handleConfigCommand(command) {
    // Check if port exists
    const existingPort = this.screenshotStreamingService.getPort(command.port);
    if (!existingPort) {
      throw new Error(`Port ${command.port} is not streaming`);
    }
    
    // Update configuration
    return await this.screenshotStreamingService.updatePortConfig(command.port, command.options);
  }

  /**
   * Check if handler can handle the command
   * @param {Object} command - Command to check
   * @returns {boolean} Whether handler can handle the command
   */
  canHandle(command) {
    return command instanceof PortStreamingCommand || command.type === 'PortStreamingCommand';
  }

  /**
   * Get handler metadata
   * @returns {Object} Handler metadata
   */
  getMetadata() {
    return {
      type: 'PortStreamingHandler',
      supportedCommands: ['PortStreamingCommand'],
      supportedActions: ['start', 'stop', 'pause', 'resume', 'config'],
      description: 'Handles port-based IDE screenshot streaming commands'
    };
  }
}

module.exports = PortStreamingHandler; 