/**
 * StopStreamingCommand
 * 
 * Command to stop IDE screenshot streaming for a specific session.
 */
class StopStreamingCommand {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.timestamp = new Date();
    this.commandId = this.generateCommandId();
  }

  /**
   * Generate unique command ID
   * @returns {string} Unique command identifier
   */
  generateCommandId() {
    return `stream-stop-${this.sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate command parameters
   * @returns {boolean} Whether command is valid
   */
  validate() {
    if (!this.sessionId || typeof this.sessionId !== 'string') {
      throw new Error('Valid session ID is required');
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
      type: 'StopStreamingCommand',
      sessionId: this.sessionId,
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
   * @returns {StopStreamingCommand} Command instance
   */
  static fromJSON(data) {
    const command = new StopStreamingCommand(data.sessionId);
    command.commandId = data.commandId;
    command.timestamp = new Date(data.timestamp);
    return command;
  }
}

module.exports = StopStreamingCommand; 