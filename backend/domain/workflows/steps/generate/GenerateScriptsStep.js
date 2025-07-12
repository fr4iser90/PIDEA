/**
 * GenerateScriptsStep - Multiple scripts generation workflow step
 * 
 * This step handles multiple scripts generation operations, integrating with the
 * existing GenerateScriptsHandler through the service adapter. It provides
 * validation, complexity management, and performance optimization for batch script generation.
 */
const BaseWorkflowStep = require('../BaseWorkflowStep');
const GenerateServiceAdapter = require('./GenerateServiceAdapter');
const GenerateComplexityManager = require('./GenerateComplexityManager');
const GenerateValidationService = require('./GenerateValidationService');
const GeneratePerformanceOptimizer = require('./GeneratePerformanceOptimizer');

/**
 * Multiple scripts generation workflow step
 */
class GenerateScriptsStep extends BaseWorkflowStep {
  /**
   * Create a new generate scripts step
   * @param {Object} options - Step options
   */
  constructor(options = {}) {
    super('GenerateScriptsStep', 'Performs multiple scripts generation', 'generate');
    
    this.scriptTypes = options.scriptTypes || ['build', 'deploy'];
    this.options = { ...options };
    
    // Initialize services
    this.serviceAdapter = options.serviceAdapter || new GenerateServiceAdapter(options.serviceAdapterOptions);
    this.complexityManager = options.complexityManager || new GenerateComplexityManager(options.complexityManagerOptions);
    this.validationService = options.validationService || new GenerateValidationService(options.validationServiceOptions);
    this.performanceOptimizer = options.performanceOptimizer || new GeneratePerformanceOptimizer(options.performanceOptimizerOptions);
    
    this.logger = options.logger || console;
  }

  /**
   * Execute multiple scripts generation step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Scripts generation result
   */
  async executeStep(context) {
    const projectPath = context.get('projectPath');
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }

    this.logger.info('GenerateScriptsStep: Starting multiple scripts generation', {
      projectPath,
      scriptTypes: this.scriptTypes,
      options: this.options
    });

    try {
      // Step 1: Validate request
      const validationResult = await this.validationService.validateScriptsRequest(context, {
        scriptTypes: this.scriptTypes,
        ...this.options
      });

      if (!validationResult.isValid) {
        throw new Error(`Scripts generation validation failed: ${validationResult.errors.join(', ')}`);
      }

      if (validationResult.warnings.length > 0) {
        this.logger.warn('GenerateScriptsStep: Validation warnings', validationResult.warnings);
      }

      // Step 2: Check complexity and handle if needed
      const complexityAnalysis = await this.complexityManager.analyzeMultiScriptComplexity(projectPath, this.scriptTypes);
      
      let result;
      if (complexityAnalysis.totalComplexity === 'high') {
        this.logger.info('GenerateScriptsStep: Using complexity manager for high complexity project');
        result = await this.complexityManager.handleComplexScriptsGeneration(context, {
          scriptTypes: this.scriptTypes,
          ...this.options
        });
      } else {
        // Step 3: Execute generation with performance optimization
        result = await this.performanceOptimizer.optimizeScriptsGeneration(
          context,
          { scriptTypes: this.scriptTypes, ...this.options },
          async (ctx, opts) => {
            return await this.serviceAdapter.adaptScriptsService(ctx, opts);
          }
        );
      }

      // Step 4: Validate result
      const resultValidation = this.validationService.validateResult(result, 'scripts');
      if (!resultValidation.isValid) {
        this.logger.warn('GenerateScriptsStep: Result validation warnings', resultValidation.warnings);
      }

      this.logger.info('GenerateScriptsStep: Multiple scripts generation completed', {
        projectPath,
        scriptTypes: this.scriptTypes,
        success: result.success,
        scriptsGenerated: result.scriptsGenerated || result.totalScripts
      });

      return {
        success: result.success,
        type: 'scripts',
        scriptTypes: this.scriptTypes,
        scriptsGenerated: result.scriptsGenerated || result.totalScripts,
        successfulScripts: result.successfulScripts,
        failedScripts: result.failedScripts,
        data: result.data,
        metadata: {
          complexity: complexityAnalysis.totalComplexity,
          scriptAnalyses: complexityAnalysis.scriptAnalyses,
          validationWarnings: validationResult.warnings,
          resultValidationWarnings: resultValidation.warnings,
          timestamp: new Date()
        }
      };

    } catch (error) {
      this.logger.error('GenerateScriptsStep: Multiple scripts generation failed', {
        projectPath,
        scriptTypes: this.scriptTypes,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Validate scripts generation step
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
      return new ValidationResult(false, ['Project path is required for scripts generation']);
    }

    // Validate script types
    if (!Array.isArray(this.scriptTypes) || this.scriptTypes.length === 0) {
      return new ValidationResult(false, ['At least one script type must be specified']);
    }

    const validScriptTypes = [
      'build', 'deploy', 'test', 'lint', 'format', 'clean', 'dev', 'prod', 'custom'
    ];

    for (const scriptType of this.scriptTypes) {
      if (!validScriptTypes.includes(scriptType)) {
        return new ValidationResult(false, [`Invalid script type: ${scriptType}`]);
      }
    }

    // Check for duplicates
    const uniqueTypes = new Set(this.scriptTypes);
    if (uniqueTypes.size !== this.scriptTypes.length) {
      return new ValidationResult(false, ['Duplicate script types are not allowed']);
    }

    // Check if required services are available
    if (!this.serviceAdapter) {
      return new ValidationResult(false, ['Service adapter is required for scripts generation']);
    }

    return new ValidationResult(true, []);
  }

  /**
   * Set script types
   * @param {Array<string>} scriptTypes - Script types
   */
  setScriptTypes(scriptTypes) {
    this.scriptTypes = [...scriptTypes];
  }

  /**
   * Get script types
   * @returns {Array<string>} Script types
   */
  getScriptTypes() {
    return [...this.scriptTypes];
  }

  /**
   * Add script type
   * @param {string} scriptType - Script type to add
   */
  addScriptType(scriptType) {
    if (!this.scriptTypes.includes(scriptType)) {
      this.scriptTypes.push(scriptType);
    }
  }

  /**
   * Remove script type
   * @param {string} scriptType - Script type to remove
   */
  removeScriptType(scriptType) {
    const index = this.scriptTypes.indexOf(scriptType);
    if (index > -1) {
      this.scriptTypes.splice(index, 1);
    }
  }

  /**
   * Set complexity manager
   * @param {GenerateComplexityManager} complexityManager - Complexity manager
   */
  setComplexityManager(complexityManager) {
    this.complexityManager = complexityManager;
  }

  /**
   * Set validation service
   * @param {GenerateValidationService} validationService - Validation service
   */
  setValidationService(validationService) {
    this.validationService = validationService;
  }

  /**
   * Set performance optimizer
   * @param {GeneratePerformanceOptimizer} performanceOptimizer - Performance optimizer
   */
  setPerformanceOptimizer(performanceOptimizer) {
    this.performanceOptimizer = performanceOptimizer;
  }

  /**
   * Get step options
   * @returns {Object} Step options
   */
  getOptions() {
    return { ...this.options };
  }

  /**
   * Set step options
   * @param {Object} options - Step options
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get step metadata
   * @returns {Object} Step metadata
   */
  getMetadata() {
    return {
      ...super.getMetadata(),
      scriptTypes: this.scriptTypes,
      options: this.options,
      services: {
        serviceAdapter: this.serviceAdapter?.getMetadata(),
        complexityManager: this.complexityManager?.getMetadata(),
        validationService: this.validationService?.getMetadata(),
        performanceOptimizer: this.performanceOptimizer?.getMetadata()
      }
    };
  }

  /**
   * Rollback scripts generation step
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
          message: 'Scripts generation step rollback completed via git revert'
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
      message: 'Scripts generation step rollback completed (manual intervention may be required)'
    };
  }

  /**
   * Clone scripts generation step
   * @returns {GenerateScriptsStep} Cloned step
   */
  clone() {
    const clonedStep = new GenerateScriptsStep({
      scriptTypes: [...this.scriptTypes],
      ...this.options
    });
    
    clonedStep._metadata = { ...this._metadata };
    clonedStep._validationRules = [...this._validationRules];
    clonedStep._dependencies = [...this._dependencies];
    
    // Clone services
    clonedStep.serviceAdapter = this.serviceAdapter?.clone();
    clonedStep.complexityManager = this.complexityManager?.clone();
    clonedStep.validationService = this.validationService?.clone();
    clonedStep.performanceOptimizer = this.performanceOptimizer?.clone();
    
    return clonedStep;
  }

  /**
   * Convert step to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      ...super.toJSON(),
      scriptTypes: this.scriptTypes,
      options: this.options
    };
  }

  /**
   * Create step from JSON
   * @param {Object} json - JSON representation
   * @returns {GenerateScriptsStep} Step instance
   */
  static fromJSON(json) {
    const step = new GenerateScriptsStep({
      scriptTypes: json.scriptTypes,
      ...json.options
    });
    
    step._metadata = json.metadata || {};
    step._dependencies = json.dependencies || [];
    
    return step;
  }
}

// Import ValidationResult if not already available
let ValidationResult;
try {
  ValidationResult = require('../ValidationResult');
} catch (error) {
  // Create a simple ValidationResult class if not available
  class ValidationResult {
    constructor(isValid, errors = []) {
      this.isValid = isValid;
      this.errors = errors;
    }
  }
}

module.exports = GenerateScriptsStep; 