/**
 * DetectPackageJsonCommand - Application Layer: IDE Analysis Commands
 * Command for detecting package.json and dev server
 */

class DetectPackageJsonCommand {
  constructor(params = {}) {
    this.userId = params.userId;
    this.workspacePath = params.workspacePath;
    this.detectDevServer = params.detectDevServer || true;
    this.analyzeScripts = params.analyzeScripts || true;
    this.options = params.options || {};
    this.timestamp = new Date();
    this.commandId = this.generateCommandId();
  }

  /**
   * Generate unique command ID
   * @returns {string} Unique command ID
   */
  generateCommandId() {
    return `detect_package_json_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

    if (typeof this.detectDevServer !== 'boolean') {
      throw new Error('detectDevServer must be a boolean');
    }

    if (typeof this.analyzeScripts !== 'boolean') {
      throw new Error('analyzeScripts must be a boolean');
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
      type: 'DetectPackageJsonCommand',
      userId: this.userId,
      workspacePath: this.workspacePath,
      detectDevServer: this.detectDevServer,
      analyzeScripts: this.analyzeScripts,
      options: { ...this.options, ...options },
      timestamp: this.timestamp,
      status: 'pending'
    };
  }
}

module.exports = DetectPackageJsonCommand; 