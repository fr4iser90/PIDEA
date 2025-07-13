/**
 * GetWorkspaceInfoCommand - Application Layer: IDE Analysis Commands
 * Command for getting workspace information
 */

class GetWorkspaceInfoCommand {
  constructor(params = {}) {
    this.userId = params.userId;
    this.workspacePath = params.workspacePath;
    this.includeDetails = params.includeDetails || true;
    this.includeProjects = params.includeProjects || true;
    this.options = params.options || {};
    this.timestamp = new Date();
    this.commandId = this.generateCommandId();
  }

  /**
   * Generate unique command ID
   * @returns {string} Unique command ID
   */
  generateCommandId() {
    return `get_workspace_info_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

    if (typeof this.includeDetails !== 'boolean') {
      throw new Error('includeDetails must be a boolean');
    }

    if (typeof this.includeProjects !== 'boolean') {
      throw new Error('includeProjects must be a boolean');
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
      type: 'GetWorkspaceInfoCommand',
      userId: this.userId,
      workspacePath: this.workspacePath,
      includeDetails: this.includeDetails,
      includeProjects: this.includeProjects,
      options: { ...this.options, ...options },
      timestamp: this.timestamp,
      status: 'pending'
    };
  }
}

module.exports = GetWorkspaceInfoCommand; 