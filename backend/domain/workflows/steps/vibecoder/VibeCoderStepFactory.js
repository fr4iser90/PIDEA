/**
 * VibeCoderStepFactory - Factory for creating VibeCoder workflow steps
 * Provides factory methods for creating different types of VibeCoder steps
 */
const VibeCoderServiceAdapter = require('./VibeCoderServiceAdapter');

/**
 * VibeCoder step factory
 */
class VibeCoderStepFactory {
  constructor(options = {}) {
    this.options = {
      enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
      enableEventHandling: options.enableEventHandling !== false,
      enableValidation: options.enableValidation !== false,
      enableLogging: options.enableLogging !== false,
      ...options
    };

    this.serviceAdapter = null;
    this.stepRegistry = new Map();
  }

  /**
   * Initialize factory with dependencies
   * @param {Object} dependencies - Factory dependencies
   */
  initialize(dependencies = {}) {
    this.serviceAdapter = new VibeCoderServiceAdapter(dependencies);
    
    // Validate service adapter
    const validation = this.serviceAdapter.validateServices();
    if (!validation.isValid) {
      throw new Error(`VibeCoder service adapter validation failed: ${validation.missingServices.join(', ')}`);
    }

    this.logger = dependencies.logger || console;
    this.eventBus = dependencies.eventBus;
    this.commandBus = dependencies.commandBus;

    this.logger.info('VibeCoderStepFactory: Factory initialized successfully', {
      options: this.options,
      services: validation.availableServices
    });
  }

  /**
   * Create VibeCoder analyze step
   * @param {Object} options - Step options
   * @returns {VibeCoderAnalyzeStep} Analyze step instance
   */
  createVibeCoderAnalyzeStep(options = {}) {
    this.validateInitialization();
    
    const VibeCoderAnalyzeStep = require('./VibeCoderAnalyzeStep');
    const step = new VibeCoderAnalyzeStep({
      ...this.options,
      ...options
    });

    // Register step
    this.stepRegistry.set('vibecoder-analyze', step);

    this.logger.info('VibeCoderStepFactory: Created VibeCoder analyze step', {
      stepId: 'vibecoder-analyze',
      options: step.getConfiguration()
    });

    return step;
  }

  /**
   * Create VibeCoder generate step
   * @param {Object} options - Step options
   * @returns {VibeCoderGenerateStep} Generate step instance
   */
  createVibeCoderGenerateStep(options = {}) {
    this.validateInitialization();
    
    const VibeCoderGenerateStep = require('./VibeCoderGenerateStep');
    const step = new VibeCoderGenerateStep({
      ...this.options,
      ...options
    });

    // Register step
    this.stepRegistry.set('vibecoder-generate', step);

    this.logger.info('VibeCoderStepFactory: Created VibeCoder generate step', {
      stepId: 'vibecoder-generate',
      options: step.getConfiguration()
    });

    return step;
  }

  /**
   * Create VibeCoder refactor step
   * @param {Object} options - Step options
   * @returns {VibeCoderRefactorStep} Refactor step instance
   */
  createVibeCoderRefactorStep(options = {}) {
    this.validateInitialization();
    
    const VibeCoderRefactorStep = require('./VibeCoderRefactorStep');
    const step = new VibeCoderRefactorStep({
      ...this.options,
      ...options
    });

    // Register step
    this.stepRegistry.set('vibecoder-refactor', step);

    this.logger.info('VibeCoderStepFactory: Created VibeCoder refactor step', {
      stepId: 'vibecoder-refactor',
      options: step.getConfiguration()
    });

    return step;
  }

  /**
   * Create VibeCoder mode step
   * @param {Object} options - Step options
   * @returns {VibeCoderModeStep} Mode step instance
   */
  createVibeCoderModeStep(options = {}) {
    this.validateInitialization();
    
    const VibeCoderModeStep = require('./VibeCoderModeStep');
    const step = new VibeCoderModeStep({
      ...this.options,
      ...options
    });

    // Register step
    this.stepRegistry.set('vibecoder-mode', step);

    this.logger.info('VibeCoderStepFactory: Created VibeCoder mode step', {
      stepId: 'vibecoder-mode',
      options: step.getConfiguration()
    });

    return step;
  }

  /**
   * Create comprehensive VibeCoder workflow
   * @param {Object} options - Workflow options
   * @returns {Array} Array of VibeCoder steps
   */
  createComprehensiveVibeCoderWorkflow(options = {}) {
    this.validateInitialization();

    const steps = [
      this.createVibeCoderAnalyzeStep(options.analyze || {}),
      this.createVibeCoderRefactorStep(options.refactor || {}),
      this.createVibeCoderGenerateStep(options.generate || {})
    ];

    this.logger.info('VibeCoderStepFactory: Created comprehensive VibeCoder workflow', {
      stepCount: steps.length,
      stepTypes: steps.map(step => step.constructor.name)
    });

    return steps;
  }

  /**
   * Create VibeCoder workflow by type
   * @param {string} workflowType - Workflow type
   * @param {Object} options - Workflow options
   * @returns {Array|Object} Workflow steps or single step
   */
  createVibeCoderWorkflow(workflowType, options = {}) {
    this.validateInitialization();

    switch (workflowType) {
      case 'analyze':
        return this.createVibeCoderAnalyzeStep(options);
      case 'generate':
        return this.createVibeCoderGenerateStep(options);
      case 'refactor':
        return this.createVibeCoderRefactorStep(options);
      case 'mode':
        return this.createVibeCoderModeStep(options);
      case 'comprehensive':
        return this.createComprehensiveVibeCoderWorkflow(options);
      case 'analyze-refactor':
        return [
          this.createVibeCoderAnalyzeStep(options.analyze || {}),
          this.createVibeCoderRefactorStep(options.refactor || {})
        ];
      case 'analyze-generate':
        return [
          this.createVibeCoderAnalyzeStep(options.analyze || {}),
          this.createVibeCoderGenerateStep(options.generate || {})
        ];
      default:
        throw new Error(`Unknown VibeCoder workflow type: ${workflowType}`);
    }
  }

  /**
   * Get registered step
   * @param {string} stepId - Step identifier
   * @returns {Object|null} Registered step or null
   */
  getRegisteredStep(stepId) {
    return this.stepRegistry.get(stepId) || null;
  }

  /**
   * Get all registered steps
   * @returns {Map} All registered steps
   */
  getRegisteredSteps() {
    return new Map(this.stepRegistry);
  }

  /**
   * Clear registered steps
   */
  clearRegisteredSteps() {
    this.stepRegistry.clear();
    this.logger.info('VibeCoderStepFactory: Cleared all registered steps');
  }

  /**
   * Validate factory initialization
   */
  validateInitialization() {
    if (!this.serviceAdapter) {
      throw new Error('VibeCoderStepFactory not initialized. Call initialize() first.');
    }
  }

  /**
   * Get factory metadata
   * @returns {Object} Factory metadata
   */
  getMetadata() {
    return {
      type: 'VibeCoderStepFactory',
      version: '1.0.0',
      options: this.options,
      registeredSteps: Array.from(this.stepRegistry.keys()),
      stepCount: this.stepRegistry.size,
      isInitialized: !!this.serviceAdapter
    };
  }

  /**
   * Get service adapter
   * @returns {VibeCoderServiceAdapter} Service adapter instance
   */
  getServiceAdapter() {
    this.validateInitialization();
    return this.serviceAdapter;
  }
}

module.exports = VibeCoderStepFactory; 