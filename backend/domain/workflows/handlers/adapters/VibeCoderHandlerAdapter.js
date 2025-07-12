/**
 * VibeCoderHandlerAdapter - Adapter for VibeCoder workflow steps
 * Makes VibeCoder workflow steps compatible with HandlerRegistry
 */
const { v4: uuidv4 } = require('uuid');

/**
 * Adapter class that wraps VibeCoder workflow steps to make them compatible with HandlerRegistry
 */
class VibeCoderHandlerAdapter {
  constructor(vibeCoderStep, metadata = {}) {
    this.step = vibeCoderStep;
    this.metadata = metadata;
    this.handlerId = this.generateHandlerId();
  }

  /**
   * Generate unique handler ID
   * @returns {string} Handler ID
   */
  generateHandlerId() {
    return `vibecoder-adapter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Execute the handler (delegates to workflow step)
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Execution result
   */
  async execute(context) {
    return await this.step.execute(context);
  }

  /**
   * Validate the handler (delegates to workflow step)
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Validation result
   */
  async validate(context) {
    return await this.step.validate(context);
  }

  /**
   * Check if handler can handle the request
   * @param {Object} request - Request object
   * @returns {Promise<boolean>} True if can handle
   */
  async canHandle(request) {
    // VibeCoder handlers can handle vibecoder requests
    return request && request.type && request.type.startsWith('vibecoder');
  }

  /**
   * Get handler dependencies
   * @returns {Array<string>} Dependencies
   */
  getDependencies() {
    return this.step.getDependencies ? this.step.getDependencies() : [];
  }

  /**
   * Get handler version
   * @returns {string} Version
   */
  getVersion() {
    return this.metadata.version || '1.0.0';
  }

  /**
   * Get handler type
   * @returns {string} Handler type
   */
  getType() {
    return this.metadata.type || 'vibecoder_handler';
  }

  /**
   * Get handler metadata
   * @returns {Object} Metadata
   */
  getMetadata() {
    const stepMetadata = this.step.getMetadata ? this.step.getMetadata() : {};
    
    return {
      ...stepMetadata,
      ...this.metadata,
      handlerId: this.handlerId,
      adapterType: 'VibeCoderHandlerAdapter',
      stepType: this.step.getType ? this.step.getType() : 'unknown',
      stepName: this.step.getName ? this.step.getName() : 'unknown'
    };
  }

  /**
   * Rollback handler execution
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Rollback result
   */
  async rollback(context) {
    return await this.step.rollback(context);
  }

  /**
   * Check if handler can be executed
   * @param {Object} context - Execution context
   * @returns {Promise<boolean>} True if can execute
   */
  async canExecute(context) {
    return await this.step.canExecute(context);
  }

  /**
   * Get handler timeout
   * @returns {number} Timeout in milliseconds
   */
  getTimeout() {
    return this.step.getTimeout ? this.step.getTimeout() : 120000;
  }

  /**
   * Get handler retry configuration
   * @returns {Object} Retry configuration
   */
  getRetryConfig() {
    return this.step.getRetryConfig ? this.step.getRetryConfig() : {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2
    };
  }

  /**
   * Check if handler is required
   * @returns {boolean} True if required
   */
  isRequired() {
    return this.step.isRequired ? this.step.isRequired() : true;
  }

  /**
   * Check if handler can be skipped
   * @returns {boolean} True if can be skipped
   */
  canSkip() {
    return this.step.canSkip ? this.step.canSkip() : false;
  }
}

module.exports = VibeCoderHandlerAdapter; 