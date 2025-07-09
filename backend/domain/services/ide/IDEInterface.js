/**
 * IDEInterface - Base interface for all IDE implementations
 * Defines the contract that all IDE services must implement
 */
class IDEInterface {
  /**
   * Detect if IDE is running
   * @returns {Promise<boolean>} True if IDE is running
   */
  async detect() {
    throw new Error('detect() method must be implemented');
  }

  /**
   * Start IDE instance
   * @param {string} workspacePath - Path to workspace
   * @param {Object} options - Startup options
   * @returns {Promise<Object>} IDE startup result
   */
  async start(workspacePath = null, options = {}) {
    throw new Error('start() method must be implemented');
  }

  /**
   * Stop IDE instance
   * @returns {Promise<Object>} IDE stop result
   */
  async stop() {
    throw new Error('stop() method must be implemented');
  }

  /**
   * Get IDE status
   * @returns {Promise<Object>} IDE status information
   */
  async getStatus() {
    throw new Error('getStatus() method must be implemented');
  }

  /**
   * Get IDE version
   * @returns {Promise<string>} IDE version
   */
  async getVersion() {
    throw new Error('getVersion() method must be implemented');
  }

  /**
   * Get available features
   * @returns {Promise<Array>} List of available features
   */
  async getFeatures() {
    throw new Error('getFeatures() method must be implemented');
  }

  /**
   * Execute IDE command
   * @param {string} command - Command to execute
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Command execution result
   */
  async executeCommand(command, options = {}) {
    throw new Error('executeCommand() method must be implemented');
  }

  /**
   * Get IDE DOM structure
   * @returns {Promise<Object>} DOM structure
   */
  async getDOM() {
    throw new Error('getDOM() method must be implemented');
  }

  /**
   * Interact with IDE elements
   * @param {string} selector - Element selector
   * @param {string} action - Action to perform
   * @param {Object} options - Interaction options
   * @returns {Promise<Object>} Interaction result
   */
  async interact(selector, action, options = {}) {
    throw new Error('interact() method must be implemented');
  }

  /**
   * Send message to IDE chat
   * @param {string} message - Message to send
   * @param {Object} options - Message options
   * @returns {Promise<Object>} Message result
   */
  async sendMessage(message, options = {}) {
    throw new Error('sendMessage() method must be implemented');
  }

  /**
   * Get workspace path
   * @returns {Promise<string>} Workspace path
   */
  async getWorkspacePath() {
    throw new Error('getWorkspacePath() method must be implemented');
  }

  /**
   * Switch to different IDE session/port
   * @param {number} port - IDE port
   * @returns {Promise<Object>} Switch result
   */
  async switchToPort(port) {
    throw new Error('switchToPort() method must be implemented');
  }

  /**
   * Get active port
   * @returns {number|null} Active port number
   */
  getActivePort() {
    throw new Error('getActivePort() method must be implemented');
  }

  /**
   * Monitor terminal output
   * @returns {Promise<string|null>} Terminal output URL
   */
  async monitorTerminalOutput() {
    throw new Error('monitorTerminalOutput() method must be implemented');
  }

  /**
   * Get user app URL
   * @param {number} port - IDE port
   * @returns {Promise<string|null>} User app URL
   */
  async getUserAppUrlForPort(port = null) {
    throw new Error('getUserAppUrlForPort() method must be implemented');
  }

  /**
   * Detect dev server from package.json
   * @param {string} workspacePath - Workspace path
   * @returns {Promise<string|null>} Dev server URL
   */
  async detectDevServerFromPackageJson(workspacePath = null) {
    throw new Error('detectDevServerFromPackageJson() method must be implemented');
  }

  /**
   * Apply refactoring to file
   * @param {string} filePath - File path
   * @param {string} refactoredCode - Refactored code content
   * @returns {Promise<Object>} Refactoring result
   */
  async applyRefactoring(filePath, refactoredCode) {
    throw new Error('applyRefactoring() method must be implemented');
  }

  /**
   * Send task to IDE
   * @param {Object} task - Task object
   * @param {string} workspacePath - Workspace path
   * @returns {Promise<Object>} Task result
   */
  async sendTask(task, workspacePath = null) {
    throw new Error('sendTask() method must be implemented');
  }

  /**
   * Send auto mode tasks to IDE
   * @param {Array} tasks - Array of tasks
   * @param {Object} projectAnalysis - Project analysis
   * @param {string} workspacePath - Workspace path
   * @returns {Promise<Object>} Auto mode result
   */
  async sendAutoModeTasks(tasks, projectAnalysis, workspacePath = null) {
    throw new Error('sendAutoModeTasks() method must be implemented');
  }
}

module.exports = IDEInterface; 