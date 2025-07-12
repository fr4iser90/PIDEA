/**
 * AnalysisStepRegistry - Registry for analysis workflow steps
 * 
 * This registry manages all analysis step types and provides lookup functionality
 * for creating and managing analysis steps.
 */
const AnalysisStepFactory = require('./AnalysisStepFactory');

/**
 * Analysis step registry
 */
class AnalysisStepRegistry {
  /**
   * Create a new analysis step registry
   * @param {Object} options - Registry options
   */
  constructor(options = {}) {
    this.options = {
      enableValidation: options.enableValidation !== false,
      enableCaching: options.enableCaching !== false,
      autoRegister: options.autoRegister !== false,
      ...options
    };
    
    this.steps = new Map();
    this.factories = new Map();
    this.metadata = new Map();
    
    // Initialize with default factory
    this.registerFactory('default', new AnalysisStepFactory(this.options));
    
    // Auto-register default steps if enabled
    if (this.options.autoRegister) {
      this.registerDefaultSteps();
    }
  }

  /**
   * Register analysis step type
   * @param {string} type - Step type
   * @param {Function} stepClass - Step class constructor
   * @param {Object} metadata - Step metadata
   */
  registerStep(type, stepClass, metadata = {}) {
    if (!type || typeof type !== 'string') {
      throw new Error('Step type must be a non-empty string');
    }

    if (!stepClass || typeof stepClass !== 'function') {
      throw new Error('Step class must be a constructor function');
    }

    this.steps.set(type, stepClass);
    this.metadata.set(type, {
      name: stepClass.name,
      description: metadata.description || `Analysis step for ${type}`,
      version: metadata.version || '1.0.0',
      category: 'analysis',
      ...metadata
    });
  }

  /**
   * Register analysis step factory
   * @param {string} name - Factory name
   * @param {AnalysisStepFactory} factory - Analysis step factory
   */
  registerFactory(name, factory) {
    if (!name || typeof name !== 'string') {
      throw new Error('Factory name must be a non-empty string');
    }

    if (!factory || !(factory instanceof AnalysisStepFactory)) {
      throw new Error('Factory must be an instance of AnalysisStepFactory');
    }

    this.factories.set(name, factory);
  }

  /**
   * Get analysis step class
   * @param {string} type - Step type
   * @returns {Function|null} Step class constructor
   */
  getStepClass(type) {
    return this.steps.get(type) || null;
  }

  /**
   * Get analysis step factory
   * @param {string} name - Factory name
   * @returns {AnalysisStepFactory|null} Analysis step factory
   */
  getFactory(name = 'default') {
    return this.factories.get(name) || null;
  }

  /**
   * Create analysis step
   * @param {string} type - Step type
   * @param {Object} options - Step options
   * @param {string} factoryName - Factory name
   * @returns {BaseWorkflowStep} Analysis step instance
   */
  createStep(type, options = {}, factoryName = 'default') {
    const factory = this.getFactory(factoryName);
    if (!factory) {
      throw new Error(`Factory not found: ${factoryName}`);
    }

    return factory.createAnalysisStep(type, options);
  }

  /**
   * Check if step type is registered
   * @param {string} type - Step type
   * @returns {boolean} True if step type is registered
   */
  hasStep(type) {
    return this.steps.has(type);
  }

  /**
   * Get step metadata
   * @param {string} type - Step type
   * @returns {Object|null} Step metadata
   */
  getStepMetadata(type) {
    return this.metadata.get(type) || null;
  }

  /**
   * Get all registered step types
   * @returns {Array<string>} Array of step types
   */
  getStepTypes() {
    return Array.from(this.steps.keys());
  }

  /**
   * Get all step metadata
   * @returns {Array<Object>} Array of step metadata
   */
  getAllStepMetadata() {
    const metadata = [];
    for (const [type, meta] of this.metadata) {
      metadata.push({
        type,
        ...meta
      });
    }
    return metadata;
  }

  /**
   * Register default analysis steps
   */
  registerDefaultSteps() {
    // Register specialized analysis steps
    this.registerStep('architecture', require('./ArchitectureAnalysisStep'), {
      description: 'Architecture analysis step',
      version: '1.0.0'
    });

    this.registerStep('code-quality', require('./CodeQualityAnalysisStep'), {
      description: 'Code quality analysis step',
      version: '1.0.0'
    });

    this.registerStep('tech-stack', require('./TechStackAnalysisStep'), {
      description: 'Tech stack analysis step',
      version: '1.0.0'
    });

    this.registerStep('repo-structure', require('./RepoStructureAnalysisStep'), {
      description: 'Repository structure analysis step',
      version: '1.0.0'
    });

    this.registerStep('dependencies', require('./DependenciesAnalysisStep'), {
      description: 'Dependencies analysis step',
      version: '1.0.0'
    });

    this.registerStep('advanced', require('./AdvancedAnalysisStep'), {
      description: 'Advanced analysis step',
      version: '1.0.0'
    });
  }

  /**
   * Validate step type
   * @param {string} type - Step type
   * @returns {boolean} True if step type is valid
   */
  validateStepType(type) {
    if (!type || typeof type !== 'string') {
      return false;
    }

    return this.hasStep(type);
  }

  /**
   * Get registry statistics
   * @returns {Object} Registry statistics
   */
  getStatistics() {
    return {
      totalSteps: this.steps.size,
      totalFactories: this.factories.size,
      stepTypes: this.getStepTypes(),
      factoryNames: Array.from(this.factories.keys())
    };
  }

  /**
   * Clear registry
   */
  clear() {
    this.steps.clear();
    this.metadata.clear();
    // Don't clear factories as they might be shared
  }

  /**
   * Get registry metadata
   * @returns {Object} Registry metadata
   */
  getMetadata() {
    return {
      name: 'AnalysisStepRegistry',
      description: 'Registry for analysis workflow steps',
      version: '1.0.0',
      options: this.options,
      statistics: this.getStatistics(),
      supportedTypes: this.getStepTypes()
    };
  }
}

module.exports = AnalysisStepRegistry; 