/**
 * VibeCoderStepRegistry - Registry for VibeCoder workflow steps
 * Manages VibeCoder workflow steps and provides step lookup functionality
 */
const VibeCoderStepFactory = require('./VibeCoderStepFactory');

/**
 * VibeCoder step registry
 */
class VibeCoderStepRegistry {
  constructor(options = {}) {
    this.options = {
      enableAutoRegistration: options.enableAutoRegistration !== false,
      enableStepValidation: options.enableStepValidation !== false,
      enableStepCaching: options.enableStepCaching !== false,
      maxCacheSize: options.maxCacheSize || 100,
      ...options
    };

    this.steps = new Map();
    this.templates = new Map();
    this.factory = null;
    this.logger = options.logger || console;
  }

  /**
   * Initialize registry with dependencies
   * @param {Object} dependencies - Registry dependencies
   */
  initialize(dependencies = {}) {
    this.factory = new VibeCoderStepFactory(this.options);
    this.factory.initialize(dependencies);

    this.logger = dependencies.logger || this.logger;
    this.eventBus = dependencies.eventBus;
    this.commandBus = dependencies.commandBus;

    // Register default VibeCoder steps
    if (this.options.enableAutoRegistration) {
      this.registerDefaultSteps();
    }

    this.logger.info('VibeCoderStepRegistry: Registry initialized successfully', {
      options: this.options,
      stepCount: this.steps.size,
      templateCount: this.templates.size
    });
  }

  /**
   * Register VibeCoder step
   * @param {string} stepId - Step identifier
   * @param {Object} stepClass - Step class
   * @param {Object} metadata - Step metadata
   */
  registerStep(stepId, stepClass, metadata = {}) {
    if (this.steps.has(stepId)) {
      this.logger.warn(`VibeCoderStepRegistry: Step ${stepId} already registered, overwriting`);
    }

    const stepMetadata = {
      id: stepId,
      class: stepClass,
      type: 'vibecoder',
      version: metadata.version || '1.0.0',
      description: metadata.description || `VibeCoder ${stepId} step`,
      capabilities: metadata.capabilities || [],
      dependencies: metadata.dependencies || [],
      timestamp: new Date(),
      ...metadata
    };

    this.steps.set(stepId, stepMetadata);

    this.logger.info('VibeCoderStepRegistry: Registered VibeCoder step', {
      stepId,
      metadata: stepMetadata
    });

    // Publish step registered event
    if (this.eventBus) {
      this.eventBus.publish('vibecoder.step.registered', {
        stepId,
        metadata: stepMetadata
      });
    }
  }

  /**
   * Register VibeCoder step template
   * @param {string} templateId - Template identifier
   * @param {Function} templateFactory - Template factory function
   * @param {Object} metadata - Template metadata
   */
  registerTemplate(templateId, templateFactory, metadata = {}) {
    if (this.templates.has(templateId)) {
      this.logger.warn(`VibeCoderStepRegistry: Template ${templateId} already registered, overwriting`);
    }

    const templateMetadata = {
      id: templateId,
      factory: templateFactory,
      type: 'vibecoder',
      version: metadata.version || '1.0.0',
      description: metadata.description || `VibeCoder ${templateId} template`,
      parameters: metadata.parameters || [],
      timestamp: new Date(),
      ...metadata
    };

    this.templates.set(templateId, templateMetadata);

    this.logger.info('VibeCoderStepRegistry: Registered VibeCoder template', {
      templateId,
      metadata: templateMetadata
    });
  }

  /**
   * Get VibeCoder step
   * @param {string} stepId - Step identifier
   * @returns {Object|null} Step metadata or null
   */
  getStep(stepId) {
    return this.steps.get(stepId) || null;
  }

  /**
   * Get VibeCoder step template
   * @param {string} templateId - Template identifier
   * @returns {Object|null} Template metadata or null
   */
  getTemplate(templateId) {
    return this.templates.get(templateId) || null;
  }

  /**
   * Create VibeCoder step from template
   * @param {string} templateId - Template identifier
   * @param {Object} options - Step options
   * @returns {Object} Created step instance
   */
  createStepFromTemplate(templateId, options = {}) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`VibeCoder template not found: ${templateId}`);
    }

    try {
      const step = template.factory(options);
      
      this.logger.info('VibeCoderStepRegistry: Created step from template', {
        templateId,
        stepType: step.constructor.name,
        options
      });

      return step;
    } catch (error) {
      this.logger.error('VibeCoderStepRegistry: Failed to create step from template', {
        templateId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all VibeCoder steps
   * @returns {Map} All registered steps
   */
  getAllSteps() {
    return new Map(this.steps);
  }

  /**
   * Get all VibeCoder templates
   * @returns {Map} All registered templates
   */
  getAllTemplates() {
    return new Map(this.templates);
  }

  /**
   * Search VibeCoder steps
   * @param {Object} criteria - Search criteria
   * @returns {Array} Matching steps
   */
  searchSteps(criteria = {}) {
    const results = [];

    for (const [stepId, metadata] of this.steps) {
      let matches = true;

      if (criteria.type && metadata.type !== criteria.type) {
        matches = false;
      }

      if (criteria.capability && !metadata.capabilities.includes(criteria.capability)) {
        matches = false;
      }

      if (criteria.version && metadata.version !== criteria.version) {
        matches = false;
      }

      if (matches) {
        results.push({ stepId, metadata });
      }
    }

    return results;
  }

  /**
   * Register default VibeCoder steps
   */
  registerDefaultSteps() {
    // Register VibeCoder step classes
    this.registerStep('vibecoder-analyze', require('./VibeCoderAnalyzeStep'), {
      description: 'VibeCoder analysis step',
      version: '1.0.0',
      capabilities: ['analysis', 'comprehensive-analysis', 'project-analysis']
    });

    this.registerStep('vibecoder-generate', require('./VibeCoderGenerateStep'), {
      description: 'VibeCoder generation step',
      version: '1.0.0',
      capabilities: ['generation', 'code-generation', 'feature-generation']
    });

    this.registerStep('vibecoder-refactor', require('./VibeCoderRefactorStep'), {
      description: 'VibeCoder refactoring step',
      version: '1.0.0',
      capabilities: ['refactoring', 'code-refactoring', 'optimization']
    });

    this.registerStep('vibecoder-mode', require('./VibeCoderModeStep'), {
      description: 'VibeCoder mode step',
      version: '1.0.0',
      capabilities: ['orchestration', 'workflow-management', 'comprehensive-workflow']
    });

    // Register VibeCoder step templates
    this.registerTemplate('vibecoder-comprehensive', (options = {}) => {
      return this.factory.createComprehensiveVibeCoderWorkflow(options);
    }, {
      description: 'Comprehensive VibeCoder workflow template',
      version: '1.0.0',
      parameters: ['analyze', 'refactor', 'generate']
    });

    this.registerTemplate('vibecoder-analyze-only', (options = {}) => {
      return this.factory.createVibeCoderAnalyzeStep(options);
    }, {
      description: 'VibeCoder analysis only template',
      version: '1.0.0',
      parameters: ['analysis-options']
    });

    this.registerTemplate('vibecoder-generate-only', (options = {}) => {
      return this.factory.createVibeCoderGenerateStep(options);
    }, {
      description: 'VibeCoder generation only template',
      version: '1.0.0',
      parameters: ['generation-options']
    });

    this.registerTemplate('vibecoder-refactor-only', (options = {}) => {
      return this.factory.createVibeCoderRefactorStep(options);
    }, {
      description: 'VibeCoder refactoring only template',
      version: '1.0.0',
      parameters: ['refactoring-options']
    });

    this.logger.info('VibeCoderStepRegistry: Registered default steps and templates', {
      stepCount: this.steps.size,
      templateCount: this.templates.size
    });
  }

  /**
   * Validate step registration
   * @param {string} stepId - Step identifier
   * @returns {Object} Validation result
   */
  validateStepRegistration(stepId) {
    const step = this.getStep(stepId);
    
    if (!step) {
      return {
        isValid: false,
        errors: [`Step ${stepId} not found`]
      };
    }

    const errors = [];
    const warnings = [];

    // Validate step class
    if (!step.class) {
      errors.push('Step class is missing');
    }

    // Validate step metadata
    if (!step.description) {
      warnings.push('Step description is missing');
    }

    if (!step.version) {
      warnings.push('Step version is missing');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      step
    };
  }

  /**
   * Get registry statistics
   * @returns {Object} Registry statistics
   */
  getStatistics() {
    const stepTypes = new Map();
    const templateTypes = new Map();

    // Count step types
    for (const [_, metadata] of this.steps) {
      const type = metadata.type || 'unknown';
      stepTypes.set(type, (stepTypes.get(type) || 0) + 1);
    }

    // Count template types
    for (const [_, metadata] of this.templates) {
      const type = metadata.type || 'unknown';
      templateTypes.set(type, (templateTypes.get(type) || 0) + 1);
    }

    return {
      totalSteps: this.steps.size,
      totalTemplates: this.templates.size,
      stepTypes: Object.fromEntries(stepTypes),
      templateTypes: Object.fromEntries(templateTypes),
      isInitialized: !!this.factory
    };
  }

  /**
   * Get registry metadata
   * @returns {Object} Registry metadata
   */
  getMetadata() {
    const statistics = this.getStatistics();
    
    return {
      type: 'VibeCoderStepRegistry',
      version: '1.0.0',
      options: this.options,
      statistics,
      factory: this.factory ? this.factory.getMetadata() : null
    };
  }

  /**
   * Clear registry
   */
  clear() {
    this.steps.clear();
    this.templates.clear();
    this.logger.info('VibeCoderStepRegistry: Registry cleared');
  }
}

module.exports = VibeCoderStepRegistry; 