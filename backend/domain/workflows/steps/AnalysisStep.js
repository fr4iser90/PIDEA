/**
 * AnalysisStep - Analysis workflow step
 * Performs various types of analysis on codebases and projects
 */
const BaseWorkflowStep = require('./BaseWorkflowStep');

/**
 * Analysis workflow step
 */
class AnalysisStep extends BaseWorkflowStep {
  constructor(analysisType = 'comprehensive', options = {}) {
    super('AnalysisStep', `Performs ${analysisType} analysis`, 'analysis');
    this._analysisType = analysisType;
    this._options = { ...options };
  }

  /**
   * Execute analysis step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Analysis result
   */
  async executeStep(context) {
    const projectPath = context.get('projectPath');
    const analysisService = context.get('analysisService');
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }
    
    if (!analysisService) {
      throw new Error('Analysis service not found in context');
    }

    // Perform analysis based on type
    switch (this._analysisType) {
      case 'comprehensive':
        return await analysisService.performComprehensiveAnalysis(projectPath, this._options);
      case 'architecture':
        return await analysisService.performArchitectureAnalysis(projectPath, this._options);
      case 'security':
        return await analysisService.performSecurityAnalysis(projectPath, this._options);
      case 'performance':
        return await analysisService.performPerformanceAnalysis(projectPath, this._options);
      case 'code-quality':
        return await analysisService.performCodeQualityAnalysis(projectPath, this._options);
      case 'dependencies':
        return await analysisService.performDependencyAnalysis(projectPath, this._options);
      case 'test-coverage':
        return await analysisService.performTestCoverageAnalysis(projectPath, this._options);
      case 'documentation':
        return await analysisService.performDocumentationAnalysis(projectPath, this._options);
      case 'requirements':
        return await analysisService.performRequirementsAnalysis(projectPath, this._options);
      case 'test-analysis':
        return await analysisService.performTestAnalysis(projectPath, this._options);
      case 'security-analysis':
        return await analysisService.performSecurityAnalysis(projectPath, this._options);
      case 'performance-analysis':
        return await analysisService.performPerformanceAnalysis(projectPath, this._options);
      default:
        throw new Error(`Unknown analysis type: ${this._analysisType}`);
    }
  }

  /**
   * Get analysis type
   * @returns {string} Analysis type
   */
  getAnalysisType() {
    return this._analysisType;
  }

  /**
   * Set analysis type
   * @param {string} analysisType - Analysis type
   */
  setAnalysisType(analysisType) {
    this._analysisType = analysisType;
  }

  /**
   * Get analysis options
   * @returns {Object} Analysis options
   */
  getOptions() {
    return { ...this._options };
  }

  /**
   * Set analysis options
   * @param {Object} options - Analysis options
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
      analysisType: this._analysisType,
      options: this._options
    };
  }

  /**
   * Validate analysis step
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
      return new ValidationResult(undefined, false, ['Project path is required for analysis'], [], {});
    }

    // Check if analysis service is available
    const analysisService = context.get('analysisService');
    if (!analysisService) {
      return new ValidationResult(undefined, false, ['Analysis service is required for analysis'], [], {});
    }

    // Validate analysis type
    const validTypes = [
      'comprehensive', 'architecture', 'security', 'performance',
      'code-quality', 'dependencies', 'test-coverage', 'documentation',
      'requirements', 'test-analysis', 'security-analysis', 'performance-analysis'
    ];

    if (!validTypes.includes(this._analysisType)) {
      return new ValidationResult(undefined, false, [`Invalid analysis type: ${this._analysisType}`], [], {});
    }

    return new ValidationResult(undefined, true, [], [], {});
  }

  /**
   * Rollback analysis step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Rollback result
   */
  async rollback(context) {
    // Analysis steps typically don't need rollback as they don't modify files
    return {
      success: true,
      stepName: this._name,
      message: 'Analysis step rollback completed (no changes to revert)'
    };
  }

  /**
   * Clone analysis step
   * @returns {AnalysisStep} Cloned step
   */
  clone() {
    const clonedStep = new AnalysisStep(this._analysisType, this._options);
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
      analysisType: this._analysisType,
      options: this._options
    };
  }

  /**
   * Create step from JSON
   * @param {Object} json - JSON representation
   * @returns {AnalysisStep} Step instance
   */
  static fromJSON(json) {
    const step = new AnalysisStep(json.analysisType, json.options);
    step._metadata = json.metadata || {};
    step._dependencies = json.dependencies || [];
    return step;
  }
}

module.exports = AnalysisStep; 