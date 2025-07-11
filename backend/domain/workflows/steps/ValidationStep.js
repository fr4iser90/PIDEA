/**
 * ValidationStep - Validation workflow step
 * Performs various validation tasks including code validation, quality checks, and compliance validation
 */
const BaseWorkflowStep = require('./BaseWorkflowStep');

/**
 * Validation workflow step
 */
class ValidationStep extends BaseWorkflowStep {
  constructor(validationType = 'code-validation', options = {}) {
    super('ValidationStep', `Performs ${validationType} validation`, 'validation');
    this._validationType = validationType;
    this._options = { ...options };
  }

  /**
   * Execute validation step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Validation result
   */
  async executeStep(context) {
    const projectPath = context.get('projectPath');
    const validationService = context.get('validationService');
    const qualityService = context.get('qualityService');
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }
    
    if (!validationService && !qualityService) {
      throw new Error('Validation service or quality service not found in context');
    }

    // Perform validation based on type
    switch (this._validationType) {
      case 'code-validation':
        return await this._validateCode(context, projectPath);
      case 'quality-check':
        return await this._checkQuality(context, projectPath);
      case 'validate-results':
        return await this._validateResults(context, projectPath);
      case 'validate-deployment':
        return await this._validateDeployment(context, projectPath);
      case 'validate-security':
        return await this._validateSecurity(context, projectPath);
      case 'validate-feature':
        return await this._validateFeature(context, projectPath);
      case 'validate-optimizations':
        return await this._validateOptimizations(context, projectPath);
      case 'check-compliance':
        return await this._checkCompliance(context, projectPath);
      case 'validate-integration':
        return await this._validateIntegration(context, projectPath);
      case 'validate-dependencies':
        return await this._validateDependencies(context, projectPath);
      default:
        throw new Error(`Unknown validation type: ${this._validationType}`);
    }
  }

  /**
   * Validate code
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Code validation result
   */
  async _validateCode(context, projectPath) {
    const validationService = context.get('validationService');
    const qualityService = context.get('qualityService');
    
    if (validationService) {
      return await validationService.validateCode(projectPath, this._options);
    } else {
      return await qualityService.validateCode(projectPath, this._options);
    }
  }

  /**
   * Check quality
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Quality check result
   */
  async _checkQuality(context, projectPath) {
    const qualityService = context.get('qualityService');
    const validationService = context.get('validationService');
    
    if (qualityService) {
      return await qualityService.checkQuality(projectPath, this._options);
    } else {
      return await validationService.checkQuality(projectPath, this._options);
    }
  }

  /**
   * Validate results
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Results validation result
   */
  async _validateResults(context, projectPath) {
    const validationService = context.get('validationService');
    const resultsService = context.get('resultsService');
    
    if (validationService) {
      return await validationService.validateResults(projectPath, this._options);
    } else if (resultsService) {
      return await resultsService.validateResults(projectPath, this._options);
    } else {
      throw new Error('Validation service or results service required for results validation');
    }
  }

  /**
   * Validate deployment
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Deployment validation result
   */
  async _validateDeployment(context, projectPath) {
    const validationService = context.get('validationService');
    const deploymentService = context.get('deploymentService');
    
    if (validationService) {
      return await validationService.validateDeployment(projectPath, this._options);
    } else if (deploymentService) {
      return await deploymentService.validateDeployment(projectPath, this._options);
    } else {
      throw new Error('Validation service or deployment service required for deployment validation');
    }
  }

  /**
   * Validate security
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Security validation result
   */
  async _validateSecurity(context, projectPath) {
    const validationService = context.get('validationService');
    const securityService = context.get('securityService');
    
    if (validationService) {
      return await validationService.validateSecurity(projectPath, this._options);
    } else if (securityService) {
      return await securityService.validateSecurity(projectPath, this._options);
    } else {
      throw new Error('Validation service or security service required for security validation');
    }
  }

  /**
   * Validate feature
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Feature validation result
   */
  async _validateFeature(context, projectPath) {
    const validationService = context.get('validationService');
    const featureService = context.get('featureService');
    
    if (validationService) {
      return await validationService.validateFeature(projectPath, this._options);
    } else if (featureService) {
      return await featureService.validateFeature(projectPath, this._options);
    } else {
      throw new Error('Validation service or feature service required for feature validation');
    }
  }

  /**
   * Validate optimizations
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Optimizations validation result
   */
  async _validateOptimizations(context, projectPath) {
    const validationService = context.get('validationService');
    const optimizationService = context.get('optimizationService');
    
    if (validationService) {
      return await validationService.validateOptimizations(projectPath, this._options);
    } else if (optimizationService) {
      return await optimizationService.validateOptimizations(projectPath, this._options);
    } else {
      throw new Error('Validation service or optimization service required for optimizations validation');
    }
  }

  /**
   * Check compliance
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Compliance check result
   */
  async _checkCompliance(context, projectPath) {
    const validationService = context.get('validationService');
    const complianceService = context.get('complianceService');
    
    if (validationService) {
      return await validationService.checkCompliance(projectPath, this._options);
    } else if (complianceService) {
      return await complianceService.checkCompliance(projectPath, this._options);
    } else {
      throw new Error('Validation service or compliance service required for compliance check');
    }
  }

  /**
   * Validate integration
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Integration validation result
   */
  async _validateIntegration(context, projectPath) {
    const validationService = context.get('validationService');
    const integrationService = context.get('integrationService');
    
    if (validationService) {
      return await validationService.validateIntegration(projectPath, this._options);
    } else if (integrationService) {
      return await integrationService.validateIntegration(projectPath, this._options);
    } else {
      throw new Error('Validation service or integration service required for integration validation');
    }
  }

  /**
   * Validate dependencies
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Dependencies validation result
   */
  async _validateDependencies(context, projectPath) {
    const validationService = context.get('validationService');
    const dependencyService = context.get('dependencyService');
    
    if (validationService) {
      return await validationService.validateDependencies(projectPath, this._options);
    } else if (dependencyService) {
      return await dependencyService.validateDependencies(projectPath, this._options);
    } else {
      throw new Error('Validation service or dependency service required for dependencies validation');
    }
  }

  /**
   * Get validation type
   * @returns {string} Validation type
   */
  getValidationType() {
    return this._validationType;
  }

  /**
   * Set validation type
   * @param {string} validationType - Validation type
   */
  setValidationType(validationType) {
    this._validationType = validationType;
  }

  /**
   * Get validation options
   * @returns {Object} Validation options
   */
  getOptions() {
    return { ...this._options };
  }

  /**
   * Set validation options
   * @param {Object} options - Validation options
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
      validationType: this._validationType,
      options: this._options
    };
  }

  /**
   * Validate validation step
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
      return new ValidationResult(false, ['Project path is required for validation']);
    }

    // Check if required service is available
    const validationService = context.get('validationService');
    const qualityService = context.get('qualityService');
    
    if (!validationService && !qualityService) {
      return new ValidationResult(false, ['Validation service or quality service is required for validation']);
    }

    // Validate validation type
    const validTypes = [
      'code-validation', 'quality-check', 'validate-results', 'validate-deployment',
      'validate-security', 'validate-feature', 'validate-optimizations', 'check-compliance',
      'validate-integration', 'validate-dependencies'
    ];

    if (!validTypes.includes(this._validationType)) {
      return new ValidationResult(false, [`Invalid validation type: ${this._validationType}`]);
    }

    return new ValidationResult(true, []);
  }

  /**
   * Rollback validation step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Rollback result
   */
  async rollback(context) {
    // Validation steps typically don't need rollback as they don't modify files
    return {
      success: true,
      stepName: this._name,
      message: 'Validation step rollback completed (no changes to revert)'
    };
  }

  /**
   * Clone validation step
   * @returns {ValidationStep} Cloned step
   */
  clone() {
    const clonedStep = new ValidationStep(this._validationType, this._options);
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
      validationType: this._validationType,
      options: this._options
    };
  }

  /**
   * Create step from JSON
   * @param {Object} json - JSON representation
   * @returns {ValidationStep} Step instance
   */
  static fromJSON(json) {
    const step = new ValidationStep(json.validationType, json.options);
    step._metadata = json.metadata || {};
    step._dependencies = json.dependencies || [];
    return step;
  }
}

module.exports = ValidationStep; 