/**
 * StartStreamingCommand
 * 
 * Command to start IDE screenshot streaming for a specific port.
 */
class StartStreamingCommand {
  constructor(sessionId, port, options = {}) {
    this.sessionId = sessionId;
    this.port = port;
    this.options = {
      fps: options.fps || 10,
      quality: options.quality || 0.8,
      format: options.format || 'webp',
      maxFrameSize: options.maxFrameSize || 50 * 1024,
      enableRegionDetection: options.enableRegionDetection || false
    };
    
    this.timestamp = new Date();
    this.commandId = this.generateCommandId();
  }

  /**
   * Generate unique command ID
   * @returns {string} Unique command identifier
   */
  generateCommandId() {
    return `stream-start-${this.sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate command parameters
   * @returns {boolean} Whether command is valid
   */
  validate() {
    if (!this.sessionId || typeof this.sessionId !== 'string') {
      throw new Error('Valid session ID is required');
    }
    
    if (!this.port || typeof this.port !== 'number' || this.port < 1 || this.port > 65535) {
      throw new Error('Valid port number (1-65535) is required');
    }
    
    if (this.options.fps < 1 || this.options.fps > 60) {
      throw new Error('FPS must be between 1 and 60');
    }
    
    if (this.options.quality < 0.1 || this.options.quality > 1.0) {
      throw new Error('Quality must be between 0.1 and 1.0');
    }
    
    if (!['webp', 'jpeg'].includes(this.options.format)) {
      throw new Error('Format must be either "webp" or "jpeg"');
    }
    
    return true;
  }

  /**
   * Get command metadata
   * @returns {Object} Command metadata
   */
  getMetadata() {
    return {
      commandId: this.commandId,
      type: 'StartStreamingCommand',
      sessionId: this.sessionId,
      port: this.port,
      options: this.options,
      timestamp: this.timestamp.toISOString()
    };
  }

  /**
   * Convert command to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      ...this.getMetadata(),
      validated: true
    };
  }

  /**
   * Create command from JSON
   * @param {Object} data - JSON data
   * @returns {StartStreamingCommand} Command instance
   */
  static fromJSON(data) {
    const command = new StartStreamingCommand(data.sessionId, data.port, data.options);
    command.commandId = data.commandId;
    command.timestamp = new Date(data.timestamp);
    return command;
  }
}

module.exports = StartStreamingCommand; 