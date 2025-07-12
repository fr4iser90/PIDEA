/**
 * PortStreamingCommand
 * 
 * Command to manage IDE screenshot streaming for a specific port.
 * Replaces session-based commands with simpler port-based approach.
 */
class PortStreamingCommand {
  constructor(port, action, options = {}) {
    this.port = port;
    this.action = action; // start, stop, pause, resume, config
    this.options = {
      fps: options.fps || 10,
      quality: options.quality || 0.8,
      format: options.format || 'jpeg',
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
    return `port-stream-${this.action}-${this.port}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate command parameters
   * @returns {boolean} Whether command is valid
   */
  validate() {
    if (!this.port || typeof this.port !== 'number' || this.port < 1 || this.port > 65535) {
      throw new Error('Valid port number (1-65535) is required');
    }
    
    if (!this.action || !['start', 'stop', 'pause', 'resume', 'config'].includes(this.action)) {
      throw new Error('Valid action (start, stop, pause, resume, config) is required');
    }
    
    // Validate options based on action
    if (this.action === 'start' || this.action === 'config') {
      if (this.options.fps < 1 || this.options.fps > 60) {
        throw new Error('FPS must be between 1 and 60');
      }
      
      if (this.options.quality < 0.1 || this.options.quality > 1.0) {
        throw new Error('Quality must be between 0.1 and 1.0');
      }
      
      if (!['jpeg', 'webp'].includes(this.options.format)) {
        throw new Error('Format must be either "jpeg" or "webp"');
      }
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
      type: 'PortStreamingCommand',
      port: this.port,
      action: this.action,
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
   * @returns {PortStreamingCommand} Command instance
   */
  static fromJSON(data) {
    const command = new PortStreamingCommand(data.port, data.action, data.options);
    command.commandId = data.commandId;
    command.timestamp = new Date(data.timestamp);
    return command;
  }

  /**
   * Create start streaming command
   * @param {number} port - Port number
   * @param {Object} options - Streaming options
   * @returns {PortStreamingCommand} Start command
   */
  static createStartCommand(port, options = {}) {
    return new PortStreamingCommand(port, 'start', options);
  }

  /**
   * Create stop streaming command
   * @param {number} port - Port number
   * @returns {PortStreamingCommand} Stop command
   */
  static createStopCommand(port) {
    return new PortStreamingCommand(port, 'stop');
  }

  /**
   * Create pause streaming command
   * @param {number} port - Port number
   * @returns {PortStreamingCommand} Pause command
   */
  static createPauseCommand(port) {
    return new PortStreamingCommand(port, 'pause');
  }

  /**
   * Create resume streaming command
   * @param {number} port - Port number
   * @returns {PortStreamingCommand} Resume command
   */
  static createResumeCommand(port) {
    return new PortStreamingCommand(port, 'resume');
  }

  /**
   * Create config update command
   * @param {number} port - Port number
   * @param {Object} options - New configuration options
   * @returns {PortStreamingCommand} Config command
   */
  static createConfigCommand(port, options = {}) {
    return new PortStreamingCommand(port, 'config', options);
  }
}

module.exports = PortStreamingCommand; 