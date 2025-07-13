/**
 * IHandlerAdapter - Interface for handler adapters
 * 
 * This interface defines the contract for handler adapters that can
 * create handlers from different sources (legacy handlers, external
 * services, etc.). Adapters provide backward compatibility and
 * integration with existing systems.
 */
class IHandlerAdapter {
  /**
   * Create handler from request and context
   * @param {Object} request - Handler request object
   * @param {HandlerContext} context - Handler context
   * @returns {Promise<IHandler>} Created handler instance
   */
  async createHandler(request, context) {
    throw new Error('createHandler method must be implemented');
  }

  /**
   * Check if adapter can handle the given request
   * @param {Object} request - Handler request object
   * @returns {boolean} True if adapter can handle the request
   */
  canHandle(request) {
    throw new Error('canHandle method must be implemented');
  }

  /**
   * Get adapter metadata
   * @returns {Object} Adapter metadata including name, description, and capabilities
   */
  getMetadata() {
    throw new Error('getMetadata method must be implemented');
  }

  /**
   * Get adapter type
   * @returns {string} Adapter type identifier
   */
  getType() {
    throw new Error('getType method must be implemented');
  }

  /**
   * Get adapter version
   * @returns {string} Adapter version string
   */
  getVersion() {
    throw new Error('getVersion method must be implemented');
  }

  /**
   * Initialize adapter with configuration
   * @param {Object} config - Adapter configuration
   * @returns {Promise<void>} Initialization result
   */
  async initialize(config = {}) {
    throw new Error('initialize method must be implemented');
  }

  /**
   * Cleanup adapter resources
   * @returns {Promise<void>} Cleanup result
   */
  async cleanup() {
    throw new Error('cleanup method must be implemented');
  }

  /**
   * Validate request for this adapter
   * @param {Object} request - Request to validate
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validateRequest(request) {
    throw new Error('validateRequest method must be implemented');
  }

  /**
   * Get supported request types
   * @returns {Array<string>} Array of supported request types
   */
  getSupportedTypes() {
    throw new Error('getSupportedTypes method must be implemented');
  }

  /**
   * Get adapter capabilities
   * @returns {Object} Adapter capabilities and features
   */
  getCapabilities() {
    throw new Error('getCapabilities method must be implemented');
  }

  /**
   * Check if adapter is healthy
   * @returns {Promise<boolean>} True if adapter is healthy
   */
  async isHealthy() {
    throw new Error('isHealthy method must be implemented');
  }
}

module.exports = IHandlerAdapter; 