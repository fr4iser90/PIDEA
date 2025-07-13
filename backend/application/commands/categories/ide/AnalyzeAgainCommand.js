/**
 * AnalyzeAgainCommand - Application Layer: IDE Analysis Commands
 * Command for re-analyzing projects
 */

class AnalyzeAgainCommand {
  constructor(params = {}) {
    this.userId = params.userId;
    this.workspacePath = params.workspacePath;
    this.clearCache = params.clearCache || true;
    this.forceRefresh = params.forceRefresh || true;
    this.options = params.options || {};
    this.timestamp = new Date();
    this.commandId = this.generateCommandId();
  }

  /**
   * Generate unique command ID
   * @returns {string} Unique command ID
   */
  generateCommandId() {
    return `analyze_again_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate command parameters
   * @throws {Error} If validation fails
   */
  validate() {
    if (!this.userId) {
      throw new Error('User ID is required');
    }

    if (this.workspacePath && typeof this.workspacePath !== 'string') {
      throw new Error('Workspace path must be a string');
    }

    if (typeof this.clearCache !== 'boolean') {
      throw new Error('clearCache must be a boolean');
    }

    if (typeof this.forceRefresh !== 'boolean') {
      throw new Error('forceRefresh must be a boolean');
    }

    // Validate options
    if (this.options && typeof this.options !== 'object') {
      throw new Error('Options must be an object');
    }
  }

  /**
   * Execute command
   * @param {Object} context - Execution context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async execute(context = {}, options = {}) {
    this.validate();
    
    return {
      commandId: this.commandId,
      type: 'AnalyzeAgainCommand',
      userId: this.userId,
      workspacePath: this.workspacePath,
      clearCache: this.clearCache,
      forceRefresh: this.forceRefresh,
      options: { ...this.options, ...options },
      timestamp: this.timestamp,
      status: 'pending'
    };
  }
}

module.exports = AnalyzeAgainCommand; 