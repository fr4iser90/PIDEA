/**
 * AnalyzeProjectCommand - Application Layer: IDE Analysis Commands
 * Command for analyzing project structure
 */

class AnalyzeProjectCommand {
  constructor(params = {}) {
    this.userId = params.userId;
    this.workspacePath = params.workspacePath;
    this.analysisType = params.analysisType || 'full'; // full, quick, dependencies, structure
    this.includeCache = params.includeCache || true;
    this.options = params.options || {};
    this.timestamp = new Date();
    this.commandId = this.generateCommandId();
  }

  /**
   * Generate unique command ID
   * @returns {string} Unique command ID
   */
  generateCommandId() {
    return `analyze_project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

    const validTypes = ['full', 'quick', 'dependencies', 'structure'];
    if (this.analysisType && !validTypes.includes(this.analysisType)) {
      throw new Error(`Analysis type must be one of: ${validTypes.join(', ')}`);
    }

    if (typeof this.includeCache !== 'boolean') {
      throw new Error('includeCache must be a boolean');
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
      type: 'AnalyzeProjectCommand',
      userId: this.userId,
      workspacePath: this.workspacePath,
      analysisType: this.analysisType,
      includeCache: this.includeCache,
      options: { ...this.options, ...options },
      timestamp: this.timestamp,
      status: 'pending'
    };
  }
}

module.exports = AnalyzeProjectCommand; 