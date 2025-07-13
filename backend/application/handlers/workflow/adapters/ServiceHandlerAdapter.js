
/**
 * ServiceHandlerAdapter - Adapter for service-based handlers
 * 
 * This adapter provides integration with service-based handlers,
 * allowing service methods to be executed through the
 * handler system with dependency injection support.
 */
const IHandlerAdapter = require('../../../../domain/interfaces/IHandlerAdapter');

class ServiceHandlerAdapter extends IHandlerAdapter {
  /**
   * Create a new service handler adapter
   * @param {Object} options - Adapter options
   */
  constructor(options = {}) {
    super();
    this.serviceContainer = options.serviceContainer;
    this.serviceCache = new Map();
    this.options = {
      enableCaching: options.enableCaching !== false,
      cacheSize: options.cacheSize || 50,
      enableValidation: options.enableValidation !== false,
      enableDependencyInjection: options.enableDependencyInjection !== false,
      ...options
    };
  }

  /**
   * Create handler from service
   * @param {Object} request - Handler request
   * @param {HandlerContext} context - Handler context
   * @returns {Promise<IHandler>} Handler instance
   */
  async createHandler(request, context) {
    try {
      const service = request.service || this.createService(request);
      
      if (!service) {
        throw new Error('Could not create service from request');
      }

      // Check cache first
      if (this.options.enableCaching) {
        const cacheKey = this.generateCacheKey(request, service);
        if (this.serviceCache.has(cacheKey)) {
          return this.serviceCache.get(cacheKey);
        }
      }

          // Create handler wrapper
    const handler = this.wrapServiceHandler(service, request);
      
      // Cache handler
      if (this.options.enableCaching) {
        const cacheKey = this.generateCacheKey(request, service);
        this.cacheHandler(cacheKey, handler);
      }
      
      return handler;

    } catch (error) {
      throw new Error(`Service handler creation failed: ${error.message}`);
    }
  }

  /**
   * Create service from request
   * @param {Object} request - Handler request
   * @returns {Object} Service instance
   */
  createService(request) {
    try {
      const serviceName = request.serviceName || this.determineServiceName(request);
      const serviceMethod = request.serviceMethod || this.determineServiceMethod(request);
      
      if (!serviceName) {
        throw new Error('Could not determine service name');
      }

      // Get service from container or create new instance
      let service;
      if (this.serviceContainer && this.options.enableDependencyInjection) {
        service = this.serviceContainer.get(serviceName);
      } else {
        service = this.createServiceInstance(serviceName);
      }

      if (!service) {
        throw new Error(`Service not found: ${serviceName}`);
      }

      // Validate service method exists
      if (serviceMethod && typeof service[serviceMethod] !== 'function') {
        throw new Error(`Service method not found: ${serviceName}.${serviceMethod}`);
      }

      return {
        instance: service,
        name: serviceName,
        method: serviceMethod
      };

    } catch (error) {
      throw new Error(`Service creation failed: ${error.message}`);
    }
  }

  /**
   * Determine service name from request
   * @param {Object} request - Handler request
   * @returns {string|null} Service name
   */
  determineServiceName(request) {
    // Map request types to service names
    const serviceMap = {
      'analyze_architecture': 'ArchitectureService',
      'analyze_code_quality': 'CodeQualityService',
      'analyze_tech_stack': 'TechStackService',
      'analyze_repo_structure': 'RepoStructureService',
      'analyze_dependencies': 'DependencyService',
      'vibecoder_analyze': 'VibeCoderService',
      'vibecoder_generate': 'VibeCoderService',
      'vibecoder_refactor': 'VibeCoderService',
      'generate_script': 'ScriptGenerationService',
      'auto_test_fix': 'AutoTestFixService',
      'test_correction': 'TestCorrectionService',
      'workflow_orchestration': 'WorkflowOrchestrationService',
      'task_execution': 'TaskExecutionService',
      'workflow': 'WorkflowService'  // Add support for 'workflow' type
    };
    
    return serviceMap[request.type] || null;
  }

  /**
   * Determine service method from request
   * @param {Object} request - Handler request
   * @returns {string|null} Service method
   */
  determineServiceMethod(request) {
    // Map request types to service methods
    const methodMap = {
      'analyze_architecture': 'analyzeArchitecture',
      'analyze_code_quality': 'analyzeCodeQuality',
      'analyze_tech_stack': 'analyzeTechStack',
      'analyze_repo_structure': 'analyzeRepoStructure',
      'analyze_dependencies': 'analyzeDependencies',
      'vibecoder_analyze': 'analyze',
      'vibecoder_generate': 'generate',
      'vibecoder_refactor': 'refactor',
      'generate_script': 'generateScript',
      'auto_test_fix': 'fixTests',
      'test_correction': 'correctTests',
      'workflow_orchestration': 'executeWorkflow',
      'task_execution': 'executeTask',
      'workflow': 'executeWorkflow'  // Add support for 'workflow' type
    };
    
    return methodMap[request.type] || null;
  }

  /**
   * Create service instance
   * @param {string} serviceName - Service name
   * @returns {Object|null} Service instance
   */
  createServiceInstance(serviceName) {
    try {
      // Try different service paths
      const servicePaths = [
        `@/domain/services/${serviceName}`,
        `@/application/services/${serviceName}`,
        `@/infrastructure/services/${serviceName}`
      ];

      for (const path of servicePaths) {
        try {
          const ServiceClass = require(path);
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
          return new ServiceClass();
        } catch (error) {
          // Continue to next path
        }
      }

      return null;
    } catch (error) {
      logger.warn(`Failed to create service instance ${serviceName}:`, error.message);
      return null;
    }
  }

  /**
   * Wrap service handler with interface
   * @param {Object} service - Service object
   * @param {Object} request - Handler request
   * @returns {IHandler} Handler
   */
  wrapServiceHandler(service, request) {
    // Store adapter methods for use in wrapped handler
    const adapter = this;
    
    return {
      /**
       * Execute service handler
       * @param {HandlerContext} context - Handler context
       * @returns {Promise<HandlerResult>} Handler result
       */
      async execute(context) {
        try {
          const serviceInstance = service.instance;
          const serviceMethod = service.method;
          const request = context.getRequest();

          if (!serviceInstance) {
            throw new Error('Service instance not available');
          }

          let result;
          if (serviceMethod && typeof serviceInstance[serviceMethod] === 'function') {
            // Special handling for workflow execution
            if (serviceMethod === 'executeWorkflow' && request.workflow) {
              // Pass the workflow object directly to the service method
              result = await serviceInstance[serviceMethod](request.workflow, {
                metadata: request.metadata || {},
                data: request.data || {},
                task: request.task,
                taskId: request.taskId,
                userId: request.userId,
                options: request.options
              });
            } else {
              // Call specific service method with request and response
              result = await serviceInstance[serviceMethod](request, context.getResponse());
            }
          } else if (typeof serviceInstance.execute === 'function') {
            // Call default execute method
            result = await serviceInstance.execute(request, context.getResponse());
          } else if (typeof serviceInstance.executeWorkflow === 'function' && request.workflow) {
            // Fallback for WorkflowService
            result = await serviceInstance.executeWorkflow(request.workflow, {
              metadata: request.metadata || {},
              data: request.data || {},
              task: request.task,
              taskId: request.taskId,
              userId: request.userId,
              options: request.options
            });
          } else {
            throw new Error(`No suitable execution method found for service ${service.name}`);
          }
          
          return {
            success: true,
            data: result,
            metadata: {
              serviceHandler: true,
              serviceName: service.name,
              serviceMethod: service.method,
              originalRequest: request
            }
          };
          
        } catch (error) {
          return {
            success: false,
            error: error.message,
            metadata: {
              serviceHandler: true,
              serviceName: service.name,
              serviceMethod: service.method,
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
          name: `ServiceHandler_${service.name}`,
          description: 'Service handler adapter',
          type: 'service',
          version: '1.0.0',
          serviceName: service.name,
          serviceMethod: service.method,
          adapter: 'ServiceHandlerAdapter'
        };
      },

      /**
       * Validate service handler
       * @param {HandlerContext} context - Handler context
       * @returns {Promise<ValidationResult>} Validation result
       */
      async validate(context) {
        try {
          const serviceInstance = service.instance;
          const serviceMethod = service.method;

          if (!serviceInstance) {
            return {
              isValid: false,
              errors: ['Service instance not available'],
              warnings: []
            };
          }

          // Validate service method exists
          if (serviceMethod && typeof serviceInstance[serviceMethod] !== 'function') {
            return {
              isValid: false,
              errors: [`Service method not found: ${serviceMethod}`],
              warnings: []
            };
          }

          // Validate service has execute method if no specific method
          if (!serviceMethod && typeof serviceInstance.execute !== 'function') {
            return {
              isValid: false,
              errors: ['Service must have execute method'],
              warnings: []
            };
          }

          return {
            isValid: true,
            errors: [],
            warnings: ['Service validation is basic']
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
        return !!(request && (request.service || request.serviceName || 
                  (request.type && adapter.determineServiceName(request))));
      },

      /**
       * Get handler dependencies
       * @returns {Array<string>} Handler dependencies
       */
      getDependencies() {
        return ['service', 'adapter', 'serviceContainer'];
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
        return 'service';
      },

      /**
       * Get handler statistics
       * @returns {Object} Handler statistics
       */
      getStatistics() {
        return {
          type: 'service',
          adapter: 'ServiceHandlerAdapter',
          serviceName: service.name,
          serviceMethod: service.method,
          cacheSize: this.serviceCache.size,
          cacheEnabled: this.options.enableCaching
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
    return !!(request.service || request.serviceName || 
              (request.type && this.determineServiceName(request)));
  }

  /**
   * Get adapter metadata
   * @returns {Object} Adapter metadata
   */
  getMetadata() {
    return {
      name: 'Service Handler Adapter',
      description: 'Adapter for service handler patterns',
      version: '1.0.0',
      type: 'service',
      capabilities: ['service_execution', 'dependency_injection', 'caching'],
      supportedTypes: [
        'analyze_architecture',
        'analyze_code_quality',
        'analyze_tech_stack',
        'analyze_repo_structure',
        'analyze_dependencies',
        'vibecoder_analyze',
        'vibecoder_generate',
        'vibecoder_refactor',
        'generate_script',
        'auto_test_fix',
        'test_correction',
        'workflow_orchestration',
        'task_execution',
        'workflow',
        'workflow'
      ]
    };
  }

  /**
   * Get adapter type
   * @returns {string} Adapter type
   */
  getType() {
    return 'service';
  }

  /**
   * Get adapter version
   * @returns {string} Adapter version
   */
  getVersion() {
    return '1.0.0';
  }

  /**
   * Initialize adapter with configuration
   * @param {Object} config - Adapter configuration
   * @returns {Promise<void>} Initialization result
   */
  async initialize(config = {}) {
    this.options = {
      ...this.options,
      ...config
    };

    if (config.serviceContainer) {
      this.serviceContainer = config.serviceContainer;
    }
  }

  /**
   * Cleanup adapter resources
   * @returns {Promise<void>} Cleanup result
   */
  async cleanup() {
    this.serviceCache.clear();
  }

  /**
   * Validate request for this adapter
   * @param {Object} request - Request to validate
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validateRequest(request) {
    const errors = [];
    const warnings = [];

    if (!request) {
      errors.push('Request is required');
    } else {
      if (!request.service && !request.serviceName && !request.type) {
        errors.push('Request must have service, serviceName, or type');
      }

      if (!this.serviceContainer && this.options.enableDependencyInjection) {
        warnings.push('Service container not available');
      }
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
      'analyze_architecture',
      'analyze_code_quality',
      'analyze_tech_stack',
      'analyze_repo_structure',
      'analyze_dependencies',
      'vibecoder_analyze',
      'vibecoder_generate',
      'vibecoder_refactor',
      'generate_script',
      'auto_test_fix',
      'test_correction',
      'workflow_orchestration',
      'task_execution',
      'workflow',
      'workflow'
    ];
  }

  /**
   * Check if adapter is healthy
   * @returns {Promise<boolean>} True if adapter is healthy
   */
  async isHealthy() {
    try {
      // Test creating a sample service instance
      const testService = this.createServiceInstance('ArchitectureService');
      return !!testService;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate cache key
   * @param {Object} request - Handler request
   * @param {Object} service - Service object
   * @returns {string} Cache key
   */
  generateCacheKey(request, service) {
    return `${service.name}_${service.method || 'default'}_${request.type || 'unknown'}_${JSON.stringify(request.options || {})}`;
  }

  /**
   * Cache handler
   * @param {string} key - Cache key
   * @param {IHandler} handler - Handler to cache
   */
  cacheHandler(key, handler) {
    if (this.serviceCache.size >= this.options.cacheSize) {
      // Remove oldest entry
      const firstKey = this.serviceCache.keys().next().value;
      this.serviceCache.delete(firstKey);
    }
    this.serviceCache.set(key, handler);
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStatistics() {
    return {
      size: this.serviceCache.size,
      maxSize: this.options.cacheSize,
      enabled: this.options.enableCaching,
      keys: Array.from(this.serviceCache.keys())
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.serviceCache.clear();
  }

  /**
   * Set service container
   * @param {Object} serviceContainer - Service container instance
   */
  setServiceContainer(serviceContainer) {
    this.serviceContainer = serviceContainer;
  }

  /**
   * Get service container
   * @returns {Object|null} Service container instance
   */
  getServiceContainer() {
    return this.serviceContainer;
  }
}

module.exports = ServiceHandlerAdapter; 