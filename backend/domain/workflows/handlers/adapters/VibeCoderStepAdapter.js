/**
 * VibeCoderStepAdapter - Adapter for VibeCoder workflow steps
 * 
 * This adapter provides integration for VibeCoder requests using the new
 * unified workflow step system instead of  handlers.
 */
const IHandlerAdapter = require('../interfaces/IHandlerAdapter');
const { VibeCoderStepFactory } = require('../../steps/vibecoder');
class VibeCoderStepAdapter extends IHandlerAdapter {
  /**
   * Create a new VibeCoder step adapter
   * @param {Object} options - Adapter options
   */
  constructor(options = {}) {
    super();
    this.stepFactory = new VibeCoderStepFactory();
    this.options = {
      enableCaching: options.enableCaching !== false,
      cacheSize: options.cacheSize || 50,
      enableValidation: options.enableValidation !== false,
      ...options
    };
  }
  /**
   * Create handler from VibeCoder step
   * @param {Object} request - Handler request
   * @param {HandlerContext} context - Handler context
   * @returns {Promise<IHandler>} Handler instance
   */
  async createHandler(request, context) {
    const stepType = this.determineStepType(request);
    if (!stepType) {
      throw new Error(`Could not determine VibeCoder step type for request: ${request.type}`);
    }
    // Create step instance using factory
    const step = await this.stepFactory.createStep(stepType, {
      ...context.getServices(),
      logger: context.getLogger()
    });
    // Wrap with unified handler interface
    return this.wrapVibeCoderStep(step, request);
  }
  /**
   * Determine VibeCoder step type from request
   * @param {Object} request - Handler request
   * @returns {string|null} Step type
   */
  determineStepType(request) {
    // Map request types to VibeCoder step types
    const stepMap = {
      'vibecoder_analyze': 'analyze',
      'vibecoder_generate': 'generate',
      'vibecoder_refactor': 'refactor',
      'vibecoder_mode': 'mode'
    };
    return stepMap[request.type] || null;
  }
  /**
   * Wrap VibeCoder step with unified interface
   * @param {Object} step - VibeCoder step instance
   * @param {Object} request - Handler request
   * @returns {IHandler} Unified handler
   */
  wrapVibeCoderStep(step, request) {
    return {
      /**
       * Execute VibeCoder step
       * @param {HandlerContext} context - Handler context
       * @returns {Promise<HandlerResult>} Handler result
       */
      async execute(context) {
        try {
          // Prepare step context
          const stepContext = {
            request: context.getRequest(),
            response: context.getResponse(),
            services: context.getServices(),
            logger: context.getLogger(),
            metadata: context.getMetadata()
          };
          // Execute step
          const result = await step.execute(stepContext);
          return {
            success: true,
            data: result,
            metadata: {
              vibecoderStep: true,
              stepType: step.getType(),
              stepName: step.getName(),
              originalRequest: context.getRequest()
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            metadata: {
              vibecoderStep: true,
              stepType: step.getType(),
              stepName: step.getName(),
              originalRequest: context.getRequest()
            }
          };
        }
      },
      /**
       * Get handler metadata
       * @returns {Object} Handler metadata
       */
      getMetadata() {
        return {
          name: `VibeCoder${step.getType().charAt(0).toUpperCase() + step.gettype().slice(1)}Step`,
          description: `VibeCoder ${step.getType()} workflow step`,
          type: 'vibecoder_step',
          version: '1.0.0',
          stepType: step.getType(),
          adapter: 'VibeCoderStepAdapter'
        };
      },
      /**
       * Validate VibeCoder step
       * @param {HandlerContext} context - Handler context
       * @returns {Promise<ValidationResult>} Validation result
       */
      async validate(context) {
        try {
          const stepContext = {
            request: context.getRequest(),
            response: context.getResponse(),
            services: context.getServices(),
            logger: context.getLogger()
          };
          const validationResult = await step.validate(stepContext);
          return {
            isValid: validationResult.isValid,
            errors: validationResult.errors || [],
            warnings: validationResult.warnings || []
          };
        } catch (error) {
          return {
            isValid: false,
            errors: [error.message],
            warnings: []
          };
        }
      },
      /**
       * Check if handler can handle the request
       * @param {Object} request - Request to check
       * @returns {boolean} True if handler can handle the request
       */
      canHandle(request) {
        return !!(request && request.type && request.type.startsWith('vibecoder_'));
      },
      /**
       * Get handler dependencies
       * @returns {Array<string>} Handler dependencies
       */
      getDependencies() {
        return ['vibecoder_step', 'workflow_step'];
      },
      /**
       * Get handler version
       * @returns {string} Handler version
       */
      getVersion() {
        return '1.0.0';
      },
      /**
       * Get handler type
       * @returns {string} Handler type
       */
      getType() {
        return 'vibecoder_step';
      },
      /**
       * Get handler statistics
       * @returns {Object} Handler statistics
       */
      getStatistics() {
        return {
          type: 'vibecoder_step',
          adapter: 'VibeCoderStepAdapter',
          stepType: step.getType(),
          stepName: step.getName()
        };
      }
    };
  }
  /**
   * Check if adapter can handle the given request
   * @param {Object} request - Handler request object
   * @returns {boolean} True if adapter can handle the request
   */
  canHandle(request) {
    return !!(request && request.type && request.type.startsWith('vibecoder_'));
  }
  /**
   * Get adapter metadata
   * @returns {Object} Adapter metadata
   */
  getMetadata() {
    return {
      name: 'VibeCoder Step Adapter',
      description: 'Adapter for VibeCoder workflow steps',
      version: '1.0.0',
      type: 'vibecoder_step',
      capabilities: ['vibecoder_step_execution', 'workflow_integration', 'step_validation'],
      supportedTypes: [
        'vibecoder_analyze',
        'vibecoder_generate',
        'vibecoder_refactor',
        'vibecoder_mode'
      ]
    };
  }
  /**
   * Get adapter type
   * @returns {string} Adapter type
   */
  getType() {
    return 'vibecoder_step';
  }
  /**
   * Get adapter version
   * @returns {string} Adapter version
   */
  getVersion() {
    return '1.0.0';
  }
  /**
   * Initialize adapter
   * @param {Object} config - Configuration
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    // Initialize step factory
    await this.stepFactory.initialize(config);
  }
  /**
   * Cleanup adapter
   * @returns {Promise<void>}
   */
  async cleanup() {
    // Cleanup step factory
    await this.stepFactory.cleanup();
  }
  /**
   * Validate request
   * @param {Object} request - Request to validate
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validateRequest(request) {
    const errors = [];
    const warnings = [];
    if (!request.type) {
      errors.push('Request type is required');
    } else if (!request.type.startsWith('vibecoder_')) {
      errors.push('Request type must start with vibecoder_');
    }
    if (!this.determineStepType(request)) {
      errors.push(`Unsupported VibeCoder request type: ${request.type}`);
    }
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  /**
   * Get supported request types
   * @returns {Array<string>} Array of supported request types
   */
  getSupportedTypes() {
    return [
      'vibecoder_analyze',
      'vibecoder_generate',
      'vibecoder_refactor',
      'vibecoder_mode'
    ];
  }
  /**
   * Check if adapter is healthy
   * @returns {Promise<boolean>} True if adapter is healthy
   */
  async isHealthy() {
    try {
      // Check if step factory is healthy
      return await this.stepFactory.isHealthy();
    } catch (error) {
      return false;
    }
  }
}
module.exports = VibeCoderStepAdapter; 