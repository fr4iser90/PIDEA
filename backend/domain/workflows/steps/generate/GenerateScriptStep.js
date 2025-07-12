/**
 * GenerateScriptStep - Script generation workflow step
 * 
 * This step handles single script generation operations, integrating with the
 * existing GenerateScriptHandler through the service adapter. It provides
 * validation, complexity management, and performance optimization.
 */
const BaseWorkflowStep = require('../BaseWorkflowStep');
const GenerateServiceAdapter = require('./GenerateServiceAdapter');
const GenerateComplexityManager = require('./GenerateComplexityManager');
const GenerateValidationService = require('./GenerateValidationService');
const GeneratePerformanceOptimizer = require('./GeneratePerformanceOptimizer');

/**
 * Script generation workflow step
 */
class GenerateScriptStep extends BaseWorkflowStep {
  /**
   * Create a new generate script step
   * @param {Object} options - Step options
   */
  constructor(options = {}) {
    super('GenerateScriptStep', 'Performs script generation', 'generate');
    
    this.scriptType = options.scriptType || 'build';
    this.options = { ...options };
    
    // Initialize services
    this.serviceAdapter = options.serviceAdapter || new GenerateServiceAdapter(options.serviceAdapterOptions);
    this.complexityManager = options.complexityManager || new GenerateComplexityManager(options.complexityManagerOptions);
    this.validationService = options.validationService || new GenerateValidationService(options.validationServiceOptions);
    this.performanceOptimizer = options.performanceOptimizer || new GeneratePerformanceOptimizer(options.performanceOptimizerOptions);
    
    this.logger = options.logger || console;
  }

  /**
   * Execute script generation step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Script generation result
   */
  async executeStep(context) {
    const projectPath = context.get('projectPath');
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }

    this.logger.info('GenerateScriptStep: Starting script generation', {
      projectPath,
      scriptType: this.scriptType,
      options: this.options
    });

    try {
      // Step 1: Validate request
      const validationResult = await this.validationService.validateScriptRequest(context, {
        scriptType: this.scriptType,
        ...this.options
      });

      if (!validationResult.isValid) {
        throw new Error(`Script generation validation failed: ${validationResult.errors.join(', ')}`);
      }

      if (validationResult.warnings.length > 0) {
        this.logger.warn('GenerateScriptStep: Validation warnings', validationResult.warnings);
      }

      // Step 2: Check complexity and handle if needed
      const complexityAnalysis = await this.complexityManager.analyzeProjectComplexity(projectPath, this.scriptType);
      
      let result;
      if (complexityAnalysis.complexity === 'high') {
        this.logger.info('GenerateScriptStep: Using complexity manager for high complexity project');
        result = await this.complexityManager.handleComplexScriptGeneration(context, {
          scriptType: this.scriptType,
          ...this.options
        });
      } else {
        // Step 3: Execute generation with performance optimization
        result = await this.performanceOptimizer.optimizeScriptGeneration(
          context,
          { scriptType: this.scriptType, ...this.options },
          async (ctx, opts) => {
            return await this.serviceAdapter.adaptScriptService(ctx, opts);
          }
        );
      }

      // Step 4: Validate result
      const resultValidation = this.validationService.validateResult(result, 'script');
      if (!resultValidation.isValid) {
        this.logger.warn('GenerateScriptStep: Result validation warnings', resultValidation.warnings);
      }

      this.logger.info('GenerateScriptStep: Script generation completed', {
        projectPath,
        scriptType: this.scriptType,
        success: result.success,
        scriptGenerated: result.scriptGenerated
      });

      return {
        success: result.success,
        type: 'script',
        scriptType: this.scriptType,
        scriptGenerated: result.scriptGenerated,
        scriptPath: result.scriptPath,
        data: result.data,
        metadata: {
          complexity: complexityAnalysis.complexity,
          validationWarnings: validationResult.warnings,
          resultValidationWarnings: resultValidation.warnings,
          timestamp: new Date()
        }
      };

    } catch (error) {
      this.logger.error('GenerateScriptStep: Script generation failed', {
        projectPath,
        scriptType: this.scriptType,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Validate script generation step
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
      return new ValidationResult(false, ['Project path is required for script generation']);
    }

    // Validate script type
    const validScriptTypes = [
      'build', 'deploy', 'test', 'lint', 'format', 'clean', 'dev', 'prod', 'custom'
    ];

    if (!validScriptTypes.includes(this.scriptType)) {
      return new ValidationResult(false, [`Invalid script type: ${this.scriptType}`]);
    }

    // Check if required services are available
    if (!this.serviceAdapter) {
      return new ValidationResult(false, ['Service adapter is required for script generation']);
    }

    return new ValidationResult(true, []);
  }

  /**
   * Set script type
   * @param {string} scriptType - Script type
   */
  setScriptType(scriptType) {
    this.scriptType = scriptType;
  }

  /**
   * Get script type
   * @returns {string} Script type
   */
  getScriptType() {
    return this.scriptType;
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
      scriptType: this.scriptType,
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
   * Rollback script generation step
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
          message: 'Script generation step rollback completed via git revert'
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
      message: 'Script generation step rollback completed (manual intervention may be required)'
    };
  }

  /**
   * Clone script generation step
   * @returns {GenerateScriptStep} Cloned step
   */
  clone() {
    const clonedStep = new GenerateScriptStep({
      scriptType: this.scriptType,
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
      scriptType: this.scriptType,
      options: this.options
    };
  }

  /**
   * Create step from JSON
   * @param {Object} json - JSON representation
   * @returns {GenerateScriptStep} Step instance
   */
  static fromJSON(json) {
    const step = new GenerateScriptStep({
      scriptType: json.scriptType,
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

module.exports = GenerateScriptStep; 