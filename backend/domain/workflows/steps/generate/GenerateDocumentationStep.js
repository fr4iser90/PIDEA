/**
 * GenerateDocumentationStep - Documentation generation workflow step
 * 
 * This step handles documentation generation operations, integrating with the
 * existing GenerateDocumentationHandler through the service adapter. It provides
 * validation, complexity management, and performance optimization for documentation generation.
 */
const BaseWorkflowStep = require('../BaseWorkflowStep');
const GenerateServiceAdapter = require('./GenerateServiceAdapter');
const GenerateComplexityManager = require('./GenerateComplexityManager');
const GenerateValidationService = require('./GenerateValidationService');
const GeneratePerformanceOptimizer = require('./GeneratePerformanceOptimizer');

/**
 * Documentation generation workflow step
 */
class GenerateDocumentationStep extends BaseWorkflowStep {
  /**
   * Create a new generate documentation step
   * @param {Object} options - Step options
   */
  constructor(options = {}) {
    super('GenerateDocumentationStep', 'Performs documentation generation', 'generate');
    
    this.docType = options.docType || 'comprehensive';
    this.options = { ...options };
    
    // Initialize services
    this.serviceAdapter = options.serviceAdapter || new GenerateServiceAdapter(options.serviceAdapterOptions);
    this.complexityManager = options.complexityManager || new GenerateComplexityManager(options.complexityManagerOptions);
    this.validationService = options.validationService || new GenerateValidationService(options.validationServiceOptions);
    this.performanceOptimizer = options.performanceOptimizer || new GeneratePerformanceOptimizer(options.performanceOptimizerOptions);
    
    this.logger = options.logger || console;
  }

  /**
   * Execute documentation generation step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Documentation generation result
   */
  async executeStep(context) {
    const projectPath = context.get('projectPath');
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }

    this.logger.info('GenerateDocumentationStep: Starting documentation generation', {
      projectPath,
      docType: this.docType,
      options: this.options
    });

    try {
      // Step 1: Validate request
      const validationResult = await this.validationService.validateDocumentationRequest(context, {
        docType: this.docType,
        ...this.options
      });

      if (!validationResult.isValid) {
        throw new Error(`Documentation generation validation failed: ${validationResult.errors.join(', ')}`);
      }

      if (validationResult.warnings.length > 0) {
        this.logger.warn('GenerateDocumentationStep: Validation warnings', validationResult.warnings);
      }

      // Step 2: Check complexity and handle if needed
      const complexityAnalysis = await this.complexityManager.analyzeDocumentationComplexity(projectPath, this.docType);
      
      let result;
      if (complexityAnalysis.complexity === 'high') {
        this.logger.info('GenerateDocumentationStep: Using complexity manager for high complexity project');
        result = await this.complexityManager.handleComplexDocumentationGeneration(context, {
          docType: this.docType,
          ...this.options
        });
      } else {
        // Step 3: Execute generation with performance optimization
        result = await this.performanceOptimizer.optimizeDocumentationGeneration(
          context,
          { docType: this.docType, ...this.options },
          async (ctx, opts) => {
            return await this.serviceAdapter.adaptDocumentationService(ctx, opts);
          }
        );
      }

      // Step 4: Validate result
      const resultValidation = this.validationService.validateResult(result, 'documentation');
      if (!resultValidation.isValid) {
        this.logger.warn('GenerateDocumentationStep: Result validation warnings', resultValidation.warnings);
      }

      this.logger.info('GenerateDocumentationStep: Documentation generation completed', {
        projectPath,
        docType: this.docType,
        success: result.success,
        docsGenerated: result.docsGenerated
      });

      return {
        success: result.success,
        type: 'documentation',
        docType: this.docType,
        docsGenerated: result.docsGenerated,
        docTypes: result.docTypes,
        data: result.data,
        metadata: {
          complexity: complexityAnalysis.complexity,
          validationWarnings: validationResult.warnings,
          resultValidationWarnings: resultValidation.warnings,
          timestamp: new Date()
        }
      };

    } catch (error) {
      this.logger.error('GenerateDocumentationStep: Documentation generation failed', {
        projectPath,
        docType: this.docType,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Validate documentation generation step
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
      return new ValidationResult(false, ['Project path is required for documentation generation']);
    }

    // Validate documentation type
    const validDocTypes = [
      'comprehensive', 'api', 'architecture', 'examples', 'tutorials'
    ];

    if (!validDocTypes.includes(this.docType)) {
      return new ValidationResult(false, [`Invalid documentation type: ${this.docType}`]);
    }

    // Check if required services are available
    if (!this.serviceAdapter) {
      return new ValidationResult(false, ['Service adapter is required for documentation generation']);
    }

    return new ValidationResult(true, []);
  }

  /**
   * Set documentation type
   * @param {string} docType - Documentation type
   */
  setDocType(docType) {
    this.docType = docType;
  }

  /**
   * Get documentation type
   * @returns {string} Documentation type
   */
  getDocType() {
    return this.docType;
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
      docType: this.docType,
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
   * Rollback documentation generation step
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
          message: 'Documentation generation step rollback completed via git revert'
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
      message: 'Documentation generation step rollback completed (manual intervention may be required)'
    };
  }

  /**
   * Clone documentation generation step
   * @returns {GenerateDocumentationStep} Cloned step
   */
  clone() {
    const clonedStep = new GenerateDocumentationStep({
      docType: this.docType,
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
      docType: this.docType,
      options: this.options
    };
  }

  /**
   * Create step from JSON
   * @param {Object} json - JSON representation
   * @returns {GenerateDocumentationStep} Step instance
   */
  static fromJSON(json) {
    const step = new GenerateDocumentationStep({
      docType: json.docType,
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

module.exports = GenerateDocumentationStep; 