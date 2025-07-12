/**
 * IntegrationManager - Integration orchestration and management
 * 
 * This class provides the main orchestration for integrating all workflow components,
 * including handlers, steps, and services. It manages the integration lifecycle,
 * coordinates between different components, and provides unified integration interfaces.
 */
const { UnifiedWorkflowHandler } = require('../handlers');
const { StepRegistry } = require('../steps');
const IntegrationValidator = require('./IntegrationValidator');
const IntegrationMetrics = require('./IntegrationMetrics');
const IntegrationTestRunner = require('./IntegrationTestRunner');

class IntegrationManager {
  /**
   * Create a new integration manager
   * @param {Object} dependencies - Integration dependencies
   */
  constructor(dependencies = {}) {
    this.unifiedHandler = dependencies.unifiedHandler || new UnifiedWorkflowHandler();
    this.stepRegistry = dependencies.stepRegistry || new StepRegistry();
    this.validator = dependencies.validator || new IntegrationValidator();
    this.metrics = dependencies.metrics || new IntegrationMetrics();
    this.testRunner = dependencies.testRunner || new IntegrationTestRunner();
    this.logger = dependencies.logger || console;
    this.eventBus = dependencies.eventBus;
    
    this.integrationState = {
      isInitialized: false,
      isRunning: false,
      lastIntegrationTime: null,
      integrationCount: 0,
      errorCount: 0
    };
    
    this.registeredComponents = new Map();
    this.integrationQueue = [];
    this.activeIntegrations = new Set();
  }

  /**
   * Initialize integration manager
   * @param {Object} config - Integration configuration
   * @returns {Promise<Object>} Initialization result
   */
  async initialize(config = {}) {
    try {
      this.logger.info('IntegrationManager: Starting initialization', { config });

      // Initialize components
      await this.unifiedHandler.initialize(config.handler || {});
      await this.stepRegistry.initialize(config.steps || {});
      await this.validator.initialize(config.validator || {});
      await this.metrics.initialize(config.metrics || {});
      await this.testRunner.initialize(config.testRunner || {});

      // Register default components
      await this.registerDefaultComponents();

      // Validate integration setup
      const validationResult = await this.validator.validateIntegrationSetup();
      if (!validationResult.isValid) {
        throw new Error(`Integration setup validation failed: ${validationResult.errors.join(', ')}`);
      }

      this.integrationState.isInitialized = true;
      this.integrationState.lastIntegrationTime = new Date();

      this.logger.info('IntegrationManager: Initialization completed successfully', {
        registeredComponents: this.registeredComponents.size,
        handlerTypes: this.unifiedHandler.getHandlerTypes(),
        stepTypes: this.stepRegistry.getStepTypes()
      });

      return {
        success: true,
        message: 'Integration manager initialized successfully',
        components: {
          handlers: this.unifiedHandler.getHandlerCount(),
          steps: this.stepRegistry.getStepCount(),
          validators: this.validator.getValidatorCount()
        }
      };

    } catch (error) {
      this.logger.error('IntegrationManager: Initialization failed', { error: error.message });
      throw new Error(`Integration manager initialization failed: ${error.message}`);
    }
  }

  /**
   * Register component for integration
   * @param {string} componentType - Component type
   * @param {Object} component - Component instance
   * @param {Object} metadata - Component metadata
   * @returns {Promise<Object>} Registration result
   */
  async registerComponent(componentType, component, metadata = {}) {
    try {
      // Validate component
      const validationResult = await this.validator.validateComponent(componentType, component);
      if (!validationResult.isValid) {
        throw new Error(`Component validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Register component based on type
      switch (componentType) {
        case 'handler':
          await this.registerHandler(component, metadata);
          break;
        case 'step':
          await this.registerStep(component, metadata);
          break;
        case 'service':
          await this.registerService(component, metadata);
          break;
        default:
          this.registeredComponents.set(componentType, { component, metadata });
      }

      this.logger.info('IntegrationManager: Component registered', {
        componentType,
        componentName: component.constructor.name,
        metadata
      });

      return {
        success: true,
        message: 'Component registered successfully',
        componentType,
        componentName: component.constructor.name
      };

    } catch (error) {
      this.logger.error('IntegrationManager: Component registration failed', {
        componentType,
        error: error.message
      });
      throw new Error(`Component registration failed: ${error.message}`);
    }
  }

  /**
   * Register handler component
   * @param {Object} handler - Handler instance
   * @param {Object} metadata - Handler metadata
   * @returns {Promise<void>}
   */
  async registerHandler(handler, metadata) {
    const handlerType = metadata.type || handler.constructor.name.toLowerCase();
    this.unifiedHandler.registerHandler(handlerType, handler, metadata);
    this.registeredComponents.set(`handler:${handlerType}`, { component: handler, metadata });
  }

  /**
   * Register step component
   * @param {Object} step - Step instance
   * @param {Object} metadata - Step metadata
   * @returns {Promise<void>}
   */
  async registerStep(step, metadata) {
    const stepType = metadata.type || step.constructor.name.toLowerCase();
    this.stepRegistry.registerStep(stepType, step, metadata);
    this.registeredComponents.set(`step:${stepType}`, { component: step, metadata });
  }

  /**
   * Register service component
   * @param {Object} service - Service instance
   * @param {Object} metadata - Service metadata
   * @returns {Promise<void>}
   */
  async registerService(service, metadata) {
    const serviceType = metadata.type || service.constructor.name.toLowerCase();
    this.registeredComponents.set(`service:${serviceType}`, { component: service, metadata });
  }

  /**
   * Execute integration operation
   * @param {Object} request - Integration request
   * @param {Object} options - Integration options
   * @returns {Promise<Object>} Integration result
   */
  async executeIntegration(request, options = {}) {
    const integrationId = this.generateIntegrationId();
    const startTime = Date.now();

    try {
      this.logger.info('IntegrationManager: Starting integration execution', {
        integrationId,
        requestType: request.type,
        options
      });

      // Validate request
      const validationResult = await this.validator.validateIntegrationRequest(request);
      if (!validationResult.isValid) {
        throw new Error(`Integration request validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Add to active integrations
      this.activeIntegrations.add(integrationId);
      this.integrationState.isRunning = true;

      // Execute integration based on type
      let result;
      switch (request.type) {
        case 'workflow':
          result = await this.executeWorkflowIntegration(request, options);
          break;
        case 'handler':
          result = await this.executeHandlerIntegration(request, options);
          break;
        case 'step':
          result = await this.executeStepIntegration(request, options);
          break;
        case 'system':
          result = await this.executeSystemIntegration(request, options);
          break;
        default:
          throw new Error(`Unknown integration type: ${request.type}`);
      }

      // Update metrics
      const duration = Date.now() - startTime;
      await this.metrics.recordIntegration(integrationId, request, result, duration);

      // Update state
      this.integrationState.integrationCount++;
      this.integrationState.lastIntegrationTime = new Date();

      this.logger.info('IntegrationManager: Integration execution completed', {
        integrationId,
        success: result.success,
        duration
      });

      return {
        integrationId,
        success: true,
        result,
        duration,
        timestamp: new Date()
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.integrationState.errorCount++;

      this.logger.error('IntegrationManager: Integration execution failed', {
        integrationId,
        error: error.message,
        duration
      });

      // Record error metrics
      await this.metrics.recordIntegrationError(integrationId, request, error, duration);

      return {
        integrationId,
        success: false,
        error: error.message,
        duration,
        timestamp: new Date()
      };

    } finally {
      // Remove from active integrations
      this.activeIntegrations.delete(integrationId);
      if (this.activeIntegrations.size === 0) {
        this.integrationState.isRunning = false;
      }
    }
  }

  /**
   * Execute workflow integration
   * @param {Object} request - Workflow integration request
   * @param {Object} options - Integration options
   * @returns {Promise<Object>} Workflow integration result
   */
  async executeWorkflowIntegration(request, options) {
    return await this.unifiedHandler.handle(request.workflow, request.response, options);
  }

  /**
   * Execute handler integration
   * @param {Object} request - Handler integration request
   * @param {Object} options - Integration options
   * @returns {Promise<Object>} Handler integration result
   */
  async executeHandlerIntegration(request, options) {
    const handler = this.unifiedHandler.getHandlerByType(request.handlerType);
    if (!handler) {
      throw new Error(`Handler not found: ${request.handlerType}`);
    }

    return await handler.handle(request.data, request.context, options);
  }

  /**
   * Execute step integration
   * @param {Object} request - Step integration request
   * @param {Object} options - Integration options
   * @returns {Promise<Object>} Step integration result
   */
  async executeStepIntegration(request, options) {
    const step = this.stepRegistry.getStep(request.stepType);
    if (!step) {
      throw new Error(`Step not found: ${request.stepType}`);
    }

    return await step.execute(request.data, request.context, options);
  }

  /**
   * Execute system integration
   * @param {Object} request - System integration request
   * @param {Object} options - Integration options
   * @returns {Promise<Object>} System integration result
   */
  async executeSystemIntegration(request, options) {
    // Run comprehensive system integration tests
    const testResults = await this.testRunner.runSystemTests(request.testConfig || {});
    
    // Validate system health
    const healthCheck = await this.performHealthCheck();
    
    // Generate integration report
    const report = await this.generateIntegrationReport();

    return {
      testResults,
      healthCheck,
      report,
      timestamp: new Date()
    };
  }

  /**
   * Perform health check on integrated components
   * @returns {Promise<Object>} Health check result
   */
  async performHealthCheck() {
    const healthStatus = {
      handlers: {},
      steps: {},
      services: {},
      overall: 'healthy'
    };

    try {
      // Check handlers
      const handlerTypes = this.unifiedHandler.getHandlerTypes();
      for (const handlerType of handlerTypes) {
        const handler = this.unifiedHandler.getHandlerByType(handlerType);
        healthStatus.handlers[handlerType] = handler ? 'healthy' : 'unhealthy';
      }

      // Check steps
      const stepTypes = this.stepRegistry.getStepTypes();
      for (const stepType of stepTypes) {
        const step = this.stepRegistry.getStep(stepType);
        healthStatus.steps[stepType] = step ? 'healthy' : 'unhealthy';
      }

      // Check services
      for (const [serviceType, serviceData] of this.registeredComponents) {
        if (serviceType.startsWith('service:')) {
          healthStatus.services[serviceType] = serviceData.component ? 'healthy' : 'unhealthy';
        }
      }

      // Determine overall health
      const allComponents = [
        ...Object.values(healthStatus.handlers),
        ...Object.values(healthStatus.steps),
        ...Object.values(healthStatus.services)
      ];

      if (allComponents.some(status => status === 'unhealthy')) {
        healthStatus.overall = 'degraded';
      }

      if (allComponents.every(status => status === 'unhealthy')) {
        healthStatus.overall = 'unhealthy';
      }

      return healthStatus;

    } catch (error) {
      this.logger.error('IntegrationManager: Health check failed', { error: error.message });
      return {
        overall: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Generate integration report
   * @returns {Promise<Object>} Integration report
   */
  async generateIntegrationReport() {
    const metrics = await this.metrics.getMetrics();
    const healthStatus = await this.performHealthCheck();

    return {
      timestamp: new Date(),
      integrationState: this.integrationState,
      registeredComponents: {
        total: this.registeredComponents.size,
        handlers: this.unifiedHandler.getHandlerCount(),
        steps: this.stepRegistry.getStepCount(),
        services: Array.from(this.registeredComponents.keys()).filter(key => key.startsWith('service:')).length
      },
      metrics,
      healthStatus,
      activeIntegrations: this.activeIntegrations.size
    };
  }

  /**
   * Register default components
   * @returns {Promise<void>}
   */
  async registerDefaultComponents() {
    // Register default handlers (already handled by UnifiedWorkflowHandler)
    // Register default steps (already handled by StepRegistry)
    
    this.logger.info('IntegrationManager: Default components registered');
  }

  /**
   * Get integration status
   * @returns {Object} Integration status
   */
  getStatus() {
    return {
      isInitialized: this.integrationState.isInitialized,
      isRunning: this.integrationState.isRunning,
      lastIntegrationTime: this.integrationState.lastIntegrationTime,
      integrationCount: this.integrationState.integrationCount,
      errorCount: this.integrationState.errorCount,
      activeIntegrations: this.activeIntegrations.size,
      registeredComponents: this.registeredComponents.size
    };
  }

  /**
   * Get registered components
   * @returns {Map} Registered components
   */
  getRegisteredComponents() {
    return new Map(this.registeredComponents);
  }

  /**
   * Generate unique integration ID
   * @returns {string} Integration ID
   */
  generateIntegrationId() {
    return `integration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup integration manager
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      this.logger.info('IntegrationManager: Starting cleanup');

      // Cleanup components
      await this.unifiedHandler.cleanup();
      await this.stepRegistry.cleanup();
      await this.validator.cleanup();
      await this.metrics.cleanup();
      await this.testRunner.cleanup();

      // Clear state
      this.registeredComponents.clear();
      this.integrationQueue = [];
      this.activeIntegrations.clear();
      this.integrationState.isInitialized = false;
      this.integrationState.isRunning = false;

      this.logger.info('IntegrationManager: Cleanup completed');

    } catch (error) {
      this.logger.error('IntegrationManager: Cleanup failed', { error: error.message });
      throw new Error(`Integration manager cleanup failed: ${error.message}`);
    }
  }
}

module.exports = IntegrationManager; 