/**
 * GenerateStepAdapter - Adapter for generate step handlers
 * 
 * This adapter bridges the generate step system with the handler factory,
 * allowing generate operations to be executed through the unified handler system.
 */
const IHandlerAdapter = require('../interfaces/IHandlerAdapter');

/**
 * Generate step adapter
 */
class GenerateStepAdapter extends IHandlerAdapter {
  constructor() {
    super();
    this.type = 'generate-step';
    this.version = '1.0.0';
    this.supportedOperations = [
      'generate-script',
      'generate-scripts', 
      'generate-documentation'
    ];
  }

  /**
   * Check if adapter can handle request
   * @param {Object} request - Handler request
   * @returns {boolean} True if adapter can handle request
   */
  canHandle(request) {
    // Check for generate operation patterns
    if (request.operation && this.supportedOperations.includes(request.operation)) {
      return true;
    }
    
    // Check for generate step patterns
    if (request.stepType && request.stepType.startsWith('generate')) {
      return true;
    }
    
    // Check for generate handler patterns
    if (request.handlerType && request.handlerType.startsWith('generate')) {
      return true;
    }
    
    // Check for generate service patterns
    if (request.service && request.service.startsWith('generate')) {
      return true;
    }
    
    return false;
  }

  /**
   * Create handler for request
   * @param {Object} request - Handler request
   * @param {HandlerContext} context - Handler context
   * @returns {Promise<IHandler>} Handler instance
   */
  async createHandler(request, context) {
    try {
      // Load generate step components
      const generateSteps = require('../../steps/generate');
      
      // Determine operation type
      const operation = this.determineOperation(request);
      
      // Create appropriate generate step
      let generateStep;
      const task = request.task || request.data || {};
      const options = request.options || {};
      
      switch (operation) {
        case 'generate-script':
          generateStep = generateSteps.GenerateStepFactory.createGenerateScriptStep(task, options);
          break;
        case 'generate-scripts':
          generateStep = generateSteps.GenerateStepFactory.createGenerateScriptsStep(task, options);
          break;
        case 'generate-documentation':
          generateStep = generateSteps.GenerateStepFactory.createGenerateDocumentationStep(task, options);
          break;
        default:
          throw new Error(`Unsupported generate operation: ${operation}`);
      }
      
      // Create handler wrapper
      return this.createHandlerWrapper(generateStep, operation, context);
      
    } catch (error) {
      throw new Error(`Failed to create generate step handler: ${error.message}`);
    }
  }

  /**
   * Determine operation from request
   * @param {Object} request - Handler request
   * @returns {string} Operation type
   */
  determineOperation(request) {
    if (request.operation) {
      return request.operation;
    }
    
    if (request.stepType) {
      return request.stepType.replace('Step', '').toLowerCase();
    }
    
    if (request.handlerType) {
      return request.handlerType.replace('Handler', '').toLowerCase();
    }
    
    if (request.service) {
      return request.service.replace('Service', '').toLowerCase();
    }
    
    // Default to generate-script
    return 'generate-script';
  }

  /**
   * Create handler wrapper for generate step
   * @param {BaseWorkflowStep} generateStep - Generate step instance
   * @param {string} operation - Operation type
   * @param {HandlerContext} context - Handler context
   * @returns {IHandler} Handler wrapper
   */
  createHandlerWrapper(generateStep, operation, context) {
    return {
      /**
       * Execute handler
       * @param {Object} data - Handler data
       * @returns {Promise<Object>} Handler result
       */
      async execute(data) {
        try {
          // Create workflow context from handler context
          const workflowContext = this.createWorkflowContext(context, data);
          
          // Execute generate step
          const result = await generateStep.execute(workflowContext);
          
          return {
            success: true,
            operation: operation,
            result: result,
            metadata: generateStep.getMetadata()
          };
          
        } catch (error) {
          return {
            success: false,
            operation: operation,
            error: error.message,
            metadata: generateStep.getMetadata()
          };
        }
      },

      /**
       * Create workflow context from handler context
       * @param {HandlerContext} handlerContext - Handler context
       * @param {Object} data - Handler data
       * @returns {IWorkflowContext} Workflow context
       */
      createWorkflowContext(handlerContext, data) {
        // Create a simple workflow context wrapper
        return {
          get: (key) => {
            // Check data first
            if (data && data[key] !== undefined) {
              return data[key];
            }
            
            // Check handler context
            if (handlerContext && handlerContext[key] !== undefined) {
              return handlerContext[key];
            }
            
            // Check environment variables
            return process.env[key];
          },
          
          set: (key, value) => {
            if (data) {
              data[key] = value;
            }
          },
          
          has: (key) => {
            return (data && data[key] !== undefined) ||
                   (handlerContext && handlerContext[key] !== undefined) ||
                   process.env[key] !== undefined;
          },
          
          getAll: () => {
            return {
              ...data,
              ...handlerContext,
              ...process.env
            };
          }
        };
      },

      /**
       * Get handler metadata
       * @returns {Object} Handler metadata
       */
      getMetadata() {
        return {
          type: 'generate-step',
          operation: operation,
          version: this.version,
          stepMetadata: generateStep.getMetadata()
        };
      },

      /**
       * Validate handler
       * @returns {Promise<ValidationResult>} Validation result
       */
      async validate() {
        try {
          const workflowContext = this.createWorkflowContext(context, {});
          return await generateStep.validate(workflowContext);
        } catch (error) {
          return {
            isValid: false,
            errors: [error.message]
          };
        }
      },

      /**
       * Rollback handler
       * @returns {Promise<Object>} Rollback result
       */
      async rollback() {
        try {
          const workflowContext = this.createWorkflowContext(context, {});
          return await generateStep.rollback(workflowContext);
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      }
    };
  }

  /**
   * Get adapter metadata
   * @returns {Object} Adapter metadata
   */
  getMetadata() {
    return {
      type: this.type,
      version: this.version,
      supportedOperations: this.supportedOperations,
      description: 'Adapter for generate step handlers',
      capabilities: [
        'generate-script',
        'generate-scripts',
        'generate-documentation'
      ]
    };
  }

  /**
   * Get adapter type
   * @returns {string} Adapter type
   */
  getType() {
    return this.type;
  }

  /**
   * Get adapter version
   * @returns {string} Adapter version
   */
  getVersion() {
    return this.version;
  }
}

module.exports = GenerateStepAdapter; 