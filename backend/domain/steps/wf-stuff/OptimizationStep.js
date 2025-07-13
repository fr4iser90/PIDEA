/**
 * OptimizationStep - Optimization workflow step
 * Performs optimization tasks including performance optimization, code optimization, and test optimization
 */
const BaseWorkflowStep = require('./BaseWorkflowStep');

/**
 * Optimization workflow step
 */
class OptimizationStep extends BaseWorkflowStep {
  constructor(optimizationType = 'performance-optimization', options = {}) {
    super('OptimizationStep', `Performs ${optimizationType} optimization`, 'optimization');
    this._optimizationType = optimizationType;
    this._options = { ...options };
  }

  /**
   * Execute optimization step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Optimization result
   */
  async executeStep(context) {
    const projectPath = context.get('projectPath');
    const optimizationService = context.get('optimizationService');
    const performanceService = context.get('performanceService');
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }
    
    if (!optimizationService && !performanceService) {
      throw new Error('Optimization service or performance service not found in context');
    }

    // Perform optimization based on type
    switch (this._optimizationType) {
      case 'performance-optimization':
        return await this._optimizePerformance(context, projectPath);
      case 'code-optimization':
        return await this._optimizeCode(context, projectPath);
      case 'test-optimization':
        return await this._optimizeTests(context, projectPath);
      case 'memory-optimization':
        return await this._optimizeMemory(context, projectPath);
      case 'database-optimization':
        return await this._optimizeDatabase(context, projectPath);
      case 'build-optimization':
        return await this._optimizeBuild(context, projectPath);
      case 'bundle-optimization':
        return await this._optimizeBundle(context, projectPath);
      case 'algorithm-optimization':
        return await this._optimizeAlgorithm(context, projectPath);
      default:
        throw new Error(`Unknown optimization type: ${this._optimizationType}`);
    }
  }

  /**
   * Optimize performance
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Performance optimization result
   */
  async _optimizePerformance(context, projectPath) {
    const performanceService = context.get('performanceService');
    const optimizationService = context.get('optimizationService');
    
    if (performanceService) {
      return await performanceService.optimizePerformance(projectPath, this._options);
    } else {
      return await optimizationService.optimizePerformance(projectPath, this._options);
    }
  }

  /**
   * Optimize code
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Code optimization result
   */
  async _optimizeCode(context, projectPath) {
    const optimizationService = context.get('optimizationService');
    const aiService = context.get('aiService');
    
    if (optimizationService) {
      return await optimizationService.optimizeCode(projectPath, this._options);
    } else if (aiService) {
      return await aiService.optimizeCode(projectPath, this._options);
    } else {
      throw new Error('Optimization service or AI service required for code optimization');
    }
  }

  /**
   * Optimize tests
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Test optimization result
   */
  async _optimizeTests(context, projectPath) {
    const optimizationService = context.get('optimizationService');
    const testingService = context.get('testingService');
    
    if (optimizationService) {
      return await optimizationService.optimizeTests(projectPath, this._options);
    } else if (testingService) {
      return await testingService.optimizeTests(projectPath, this._options);
    } else {
      throw new Error('Optimization service or testing service required for test optimization');
    }
  }

  /**
   * Optimize memory
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Memory optimization result
   */
  async _optimizeMemory(context, projectPath) {
    const optimizationService = context.get('optimizationService');
    const memoryService = context.get('memoryService');
    
    if (optimizationService) {
      return await optimizationService.optimizeMemory(projectPath, this._options);
    } else if (memoryService) {
      return await memoryService.optimizeMemory(projectPath, this._options);
    } else {
      throw new Error('Optimization service or memory service required for memory optimization');
    }
  }

  /**
   * Optimize database
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Database optimization result
   */
  async _optimizeDatabase(context, projectPath) {
    const optimizationService = context.get('optimizationService');
    const databaseService = context.get('databaseService');
    
    if (optimizationService) {
      return await optimizationService.optimizeDatabase(projectPath, this._options);
    } else if (databaseService) {
      return await databaseService.optimizeDatabase(projectPath, this._options);
    } else {
      throw new Error('Optimization service or database service required for database optimization');
    }
  }

  /**
   * Optimize build
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Build optimization result
   */
  async _optimizeBuild(context, projectPath) {
    const optimizationService = context.get('optimizationService');
    const buildService = context.get('buildService');
    
    if (optimizationService) {
      return await optimizationService.optimizeBuild(projectPath, this._options);
    } else if (buildService) {
      return await buildService.optimizeBuild(projectPath, this._options);
    } else {
      throw new Error('Optimization service or build service required for build optimization');
    }
  }

  /**
   * Optimize bundle
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Bundle optimization result
   */
  async _optimizeBundle(context, projectPath) {
    const optimizationService = context.get('optimizationService');
    const bundleService = context.get('bundleService');
    
    if (optimizationService) {
      return await optimizationService.optimizeBundle(projectPath, this._options);
    } else if (bundleService) {
      return await bundleService.optimizeBundle(projectPath, this._options);
    } else {
      throw new Error('Optimization service or bundle service required for bundle optimization');
    }
  }

  /**
   * Optimize algorithm
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Algorithm optimization result
   */
  async _optimizeAlgorithm(context, projectPath) {
    const optimizationService = context.get('optimizationService');
    const algorithmService = context.get('algorithmService');
    
    if (optimizationService) {
      return await optimizationService.optimizeAlgorithm(projectPath, this._options);
    } else if (algorithmService) {
      return await algorithmService.optimizeAlgorithm(projectPath, this._options);
    } else {
      throw new Error('Optimization service or algorithm service required for algorithm optimization');
    }
  }

  /**
   * Get optimization type
   * @returns {string} Optimization type
   */
  getOptimizationType() {
    return this._optimizationType;
  }

  /**
   * Set optimization type
   * @param {string} optimizationType - Optimization type
   */
  setOptimizationType(optimizationType) {
    this._optimizationType = optimizationType;
  }

  /**
   * Get optimization options
   * @returns {Object} Optimization options
   */
  getOptions() {
    return { ...this._options };
  }

  /**
   * Set optimization options
   * @param {Object} options - Optimization options
   */
  setOptions(options) {
    this._options = { ...this._options, ...options };
  }

  /**
   * Get step metadata
   * @returns {Object} Step metadata
   */
  getMetadata() {
    return {
      ...super.getMetadata(),
      optimizationType: this._optimizationType,
      options: this._options
    };
  }

  /**
   * Validate optimization step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validate(context) {
    const baseValidation = await super.validate(context);
    
    if (!baseValidation.isValid) {
      return baseValidation;
    }

    // Check if project path exists
    const projectPath = context.get('projectPath');
    if (!projectPath) {
      return new ValidationResult(undefined, false, ['Project path is required for optimization'], [], {});
    }

    // Check if required service is available
    const optimizationService = context.get('optimizationService');
    const performanceService = context.get('performanceService');
    
    if (!optimizationService && !performanceService) {
      return new ValidationResult(undefined, false, ['Optimization service or performance service is required for optimization'], [], {});
    }

    // Validate optimization type
    const validTypes = [
      'performance-optimization', 'code-optimization', 'test-optimization',
      'memory-optimization', 'database-optimization', 'build-optimization',
      'bundle-optimization', 'algorithm-optimization'
    ];

    if (!validTypes.includes(this._optimizationType)) {
      return new ValidationResult(undefined, false, [`Invalid optimization type: ${this._optimizationType}`], [], {});
    }

    return new ValidationResult(undefined, true, [], [], {});
  }

  /**
   * Rollback optimization step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Rollback result
   */
  async rollback(context) {
    const gitService = context.get('gitService');
    const projectPath = context.get('projectPath');
    
    if (gitService && projectPath) {
      try {
        await gitService.revertLastCommit(projectPath);
        return {
          success: true,
          stepName: this._name,
          message: 'Optimization step rollback completed via git revert'
        };
      } catch (error) {
        return {
          success: false,
          stepName: this._name,
          error: `Git rollback failed: ${error.message}`
        };
      }
    }

    return {
      success: true,
      stepName: this._name,
      message: 'Optimization step rollback completed (manual intervention may be required)'
    };
  }

  /**
   * Clone optimization step
   * @returns {OptimizationStep} Cloned step
   */
  clone() {
    const clonedStep = new OptimizationStep(this._optimizationType, this._options);
    clonedStep._metadata = { ...this._metadata };
    clonedStep._validationRules = [...this._validationRules];
    clonedStep._dependencies = [...this._dependencies];
    return clonedStep;
  }

  /**
   * Convert step to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      ...super.toJSON(),
      optimizationType: this._optimizationType,
      options: this._options
    };
  }

  /**
   * Create step from JSON
   * @param {Object} json - JSON representation
   * @returns {OptimizationStep} Step instance
   */
  static fromJSON(json) {
    const step = new OptimizationStep(json.optimizationType, json.options);
    step._metadata = json.metadata || {};
    step._dependencies = json.dependencies || [];
    return step;
  }
}

module.exports = OptimizationStep; 