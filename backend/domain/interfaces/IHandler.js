/**
 * IHandler - Interface for unified workflow handlers
 * 
 * This interface defines the contract that all handlers must implement
 * in the unified workflow system. It provides a consistent API for
 * handler execution, validation, and metadata access.
 */
class IHandler {
  /**
   * Execute handler
   * @param {HandlerContext} context - Handler context containing request, response, and execution data
   * @returns {Promise<HandlerResult>} Handler result with success status, data, and metadata
   */
  async execute(context) {
    throw new Error('execute method must be implemented');
  }

  /**
   * Get handler metadata
   * @returns {Object} Handler metadata including name, description, version, and capabilities
   */
  getMetadata() {
    throw new Error('getMetadata method must be implemented');
  }

  /**
   * Validate handler for given context
   * @param {HandlerContext} context - Handler context to validate against
   * @returns {Promise<ValidationResult>} Validation result with success status and errors
   */
  async validate(context) {
    throw new Error('validate method must be implemented');
  }

  /**
   * Check if handler can handle the given request
   * @param {Object} request - Request object to check
   * @returns {boolean} True if handler can handle the request
   */
  canHandle(request) {
    throw new Error('canHandle method must be implemented');
  }

  /**
   * Get handler dependencies
   * @returns {Array<string>} Array of dependency identifiers
   */
  getDependencies() {
    throw new Error('getDependencies method must be implemented');
  }

  /**
   * Get handler version
   * @returns {string} Handler version string
   */
  getVersion() {
    throw new Error('getVersion method must be implemented');
  }

  /**
   * Get handler type
   * @returns {string} Handler type identifier
   */
  getType() {
    throw new Error('getType method must be implemented');
  }

  /**
   * Initialize handler with configuration
   * @param {Object} config - Handler configuration
   * @returns {Promise<void>} Initialization result
   */
  async initialize(config = {}) {
    throw new Error('initialize method must be implemented');
  }

  /**
   * Cleanup handler resources
   * @returns {Promise<void>} Cleanup result
   */
  async cleanup() {
    throw new Error('cleanup method must be implemented');
  }

  /**
   * Get handler statistics
   * @returns {Object} Handler statistics and metrics
   */
  getStatistics() {
    throw new Error('getStatistics method must be implemented');
  }

  /**
   * Check if handler is healthy
   * @returns {Promise<boolean>} True if handler is healthy
   */
  async isHealthy() {
    throw new Error('isHealthy method must be implemented');
  }
}

module.exports = IHandler; 