/**
 * RefactoringStep - Refactoring workflow step
 * Performs code refactoring and code generation tasks
 */
const BaseWorkflowStep = require('./BaseWorkflowStep');

/**
 * Refactoring workflow step
 */
class RefactoringStep extends BaseWorkflowStep {
  constructor(refactoringType = '', options = {}) {
    super('RefactoringStep', `Performs ${refactoringType} refactoring`, 'refactoring');
    this._refactoringType = refactoringType;
    this._options = { ...options };
  }

  /**
   * Execute refactoring step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Refactoring result
   */
  async executeStep(context) {
    const projectPath = context.get('projectPath');
    const refactoringService = context.get('refactoringService');
    const aiService = context.get('aiService');
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }
    
    if (!refactoringService && !aiService) {
      throw new Error('Refactoring service or AI service not found in context');
    }

    // Perform refactoring based on type
    switch (this._refactoringType) {
      case '':
        return await this._performRefactoring(context, projectPath);
      case 'code-generation':
        return await this._performCodeGeneration(context, projectPath);
      case 'feature-implementation':
        return await this._performFeatureImplementation(context, projectPath);
      case 'bug-fix':
        return await this._performBugFix(context, projectPath);
      case 'optimization':
        return await this._performOptimization(context, projectPath);
      case 'cleanup':
        return await this._performCleanup(context, projectPath);
      case 'restructure':
        return await this._performRestructure(context, projectPath);
      case 'modernize':
        return await this._performModernize(context, projectPath);
      default:
        throw new Error(`Unknown refactoring type: ${this._refactoringType}`);
    }
  }

  /**
   * Perform  refactoring
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Refactoring result
   */
  async _performRefactoring(context, projectPath) {
    const refactoringService = context.get('refactoringService');
    const task = context.get('task');
    
    if (refactoringService) {
      return await refactoringService.performRefactoring(projectPath, task, this._options);
    } else {
      // Fallback to AI service
      const aiService = context.get('aiService');
      return await aiService.performRefactoring(projectPath, task, this._options);
    }
  }

  /**
   * Perform code generation
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Code generation result
   */
  async _performCodeGeneration(context, projectPath) {
    const aiService = context.get('aiService');
    const task = context.get('task');
    
    if (!aiService) {
      throw new Error('AI service required for code generation');
    }
    
    return await aiService.generateCode(projectPath, task, this._options);
  }

  /**
   * Perform feature implementation
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Feature implementation result
   */
  async _performFeatureImplementation(context, projectPath) {
    const aiService = context.get('aiService');
    const task = context.get('task');
    
    if (!aiService) {
      throw new Error('AI service required for feature implementation');
    }
    
    return await aiService.implementFeature(projectPath, task, this._options);
  }

  /**
   * Perform bug fix
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Bug fix result
   */
  async _performBugFix(context, projectPath) {
    const aiService = context.get('aiService');
    const task = context.get('task');
    
    if (!aiService) {
      throw new Error('AI service required for bug fixing');
    }
    
    return await aiService.fixBug(projectPath, task, this._options);
  }

  /**
   * Perform optimization
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Optimization result
   */
  async _performOptimization(context, projectPath) {
    const optimizationService = context.get('optimizationService');
    const task = context.get('task');
    
    if (optimizationService) {
      return await optimizationService.optimizeCode(projectPath, task, this._options);
    } else {
      // Fallback to AI service
      const aiService = context.get('aiService');
      return await aiService.optimizeCode(projectPath, task, this._options);
    }
  }

  /**
   * Perform cleanup
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Cleanup result
   */
  async _performCleanup(context, projectPath) {
    const cleanupService = context.get('cleanupService');
    const task = context.get('task');
    
    if (cleanupService) {
      return await cleanupService.cleanupCode(projectPath, task, this._options);
    } else {
      // Fallback to AI service
      const aiService = context.get('aiService');
      return await aiService.cleanupCode(projectPath, task, this._options);
    }
  }

  /**
   * Perform restructure
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Restructure result
   */
  async _performRestructure(context, projectPath) {
    const restructureService = context.get('restructureService');
    const task = context.get('task');
    
    if (restructureService) {
      return await restructureService.restructureCode(projectPath, task, this._options);
    } else {
      // Fallback to AI service
      const aiService = context.get('aiService');
      return await aiService.restructureCode(projectPath, task, this._options);
    }
  }

  /**
   * Perform modernize
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Modernize result
   */
  async _performModernize(context, projectPath) {
    const modernizeService = context.get('modernizeService');
    const task = context.get('task');
    
    if (modernizeService) {
      return await modernizeService.modernizeCode(projectPath, task, this._options);
    } else {
      // Fallback to AI service
      const aiService = context.get('aiService');
      return await aiService.modernizeCode(projectPath, task, this._options);
    }
  }

  /**
   * Get refactoring type
   * @returns {string} Refactoring type
   */
  getRefactoringType() {
    return this._refactoringType;
  }

  /**
   * Set refactoring type
   * @param {string} refactoringType - Refactoring type
   */
  setRefactoringType(refactoringType) {
    this._refactoringType = refactoringType;
  }

  /**
   * Get refactoring options
   * @returns {Object} Refactoring options
   */
  getOptions() {
    return { ...this._options };
  }

  /**
   * Set refactoring options
   * @param {Object} options - Refactoring options
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
      refactoringType: this._refactoringType,
      options: this._options
    };
  }

  /**
   * Validate refactoring step
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
      return new ValidationResult(undefined, false, ['Project path is required for refactoring'], [], {});
    }

    // Check if required service is available
    const refactoringService = context.get('refactoringService');
    const aiService = context.get('aiService');
    
    if (!refactoringService && !aiService) {
      return new ValidationResult(undefined, false, ['Refactoring service or AI service is required for refactoring'], [], {});
    }

    // Validate refactoring type
    const validTypes = [
      '', 'code-generation', 'feature-implementation', 'bug-fix',
      'optimization', 'cleanup', 'restructure', 'modernize'
    ];

    if (!validTypes.includes(this._refactoringType)) {
      return new ValidationResult(undefined, false, [`Invalid refactoring type: ${this._refactoringType}`], [], {});
    }

    return new ValidationResult(undefined, true, [], [], {});
  }

  /**
   * Rollback refactoring step
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
          message: 'Refactoring step rollback completed via git revert'
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
      message: 'Refactoring step rollback completed (manual intervention may be required)'
    };
  }

  /**
   * Clone refactoring step
   * @returns {RefactoringStep} Cloned step
   */
  clone() {
    const clonedStep = new RefactoringStep(this._refactoringType, this._options);
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
      refactoringType: this._refactoringType,
      options: this._options
    };
  }

  /**
   * Create step from JSON
   * @param {Object} json - JSON representation
   * @returns {RefactoringStep} Step instance
   */
  static fromJSON(json) {
    const step = new RefactoringStep(json.refactoringType, json.options);
    step._metadata = json.metadata || {};
    step._dependencies = json.dependencies || [];
    return step;
  }
}

module.exports = RefactoringStep; 