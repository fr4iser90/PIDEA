/**
 * SecurityStep - Security workflow step
 * Performs security tasks including vulnerability scanning, security analysis, and compliance checks
 */
const BaseWorkflowStep = require('./BaseWorkflowStep');

/**
 * Security workflow step
 */
class SecurityStep extends BaseWorkflowStep {
  constructor(securityType = 'security-scan', options = {}) {
    super('SecurityStep', `Performs ${securityType} security`, 'security');
    this._securityType = securityType;
    this._options = { ...options };
  }

  /**
   * Execute security step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Security result
   */
  async executeStep(context) {
    const projectPath = context.get('projectPath');
    const securityService = context.get('securityService');
    const vulnerabilityService = context.get('vulnerabilityService');
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }
    
    if (!securityService && !vulnerabilityService) {
      throw new Error('Security service or vulnerability service not found in context');
    }

    // Perform security based on type
    switch (this._securityType) {
      case 'security-scan':
        return await this._performSecurityScan(context, projectPath);
      case 'vulnerability-check':
        return await this._checkVulnerabilities(context, projectPath);
      case 'security-analysis':
        return await this._analyzeSecurity(context, projectPath);
      case 'compliance-check':
        return await this._checkCompliance(context, projectPath);
      case 'penetration-test':
        return await this._performPenetrationTest(context, projectPath);
      case 'code-audit':
        return await this._performCodeAudit(context, projectPath);
      case 'dependency-scan':
        return await this._scanDependencies(context, projectPath);
      case 'security-validation':
        return await this._validateSecurity(context, projectPath);
      default:
        throw new Error(`Unknown security type: ${this._securityType}`);
    }
  }

  /**
   * Perform security scan
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Security scan result
   */
  async _performSecurityScan(context, projectPath) {
    const securityService = context.get('securityService');
    const vulnerabilityService = context.get('vulnerabilityService');
    
    if (securityService) {
      return await securityService.performSecurityScan(projectPath, this._options);
    } else {
      return await vulnerabilityService.performSecurityScan(projectPath, this._options);
    }
  }

  /**
   * Check vulnerabilities
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Vulnerability check result
   */
  async _checkVulnerabilities(context, projectPath) {
    const vulnerabilityService = context.get('vulnerabilityService');
    const securityService = context.get('securityService');
    
    if (vulnerabilityService) {
      return await vulnerabilityService.checkVulnerabilities(projectPath, this._options);
    } else {
      return await securityService.checkVulnerabilities(projectPath, this._options);
    }
  }

  /**
   * Analyze security
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Security analysis result
   */
  async _analyzeSecurity(context, projectPath) {
    const securityService = context.get('securityService');
    const analysisService = context.get('analysisService');
    
    if (securityService) {
      return await securityService.analyzeSecurity(projectPath, this._options);
    } else if (analysisService) {
      return await analysisService.performSecurityAnalysis(projectPath, this._options);
    } else {
      throw new Error('Security service or analysis service required for security analysis');
    }
  }

  /**
   * Check compliance
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Compliance check result
   */
  async _checkCompliance(context, projectPath) {
    const securityService = context.get('securityService');
    const complianceService = context.get('complianceService');
    
    if (securityService) {
      return await securityService.checkCompliance(projectPath, this._options);
    } else if (complianceService) {
      return await complianceService.checkCompliance(projectPath, this._options);
    } else {
      throw new Error('Security service or compliance service required for compliance check');
    }
  }

  /**
   * Perform penetration test
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Penetration test result
   */
  async _performPenetrationTest(context, projectPath) {
    const securityService = context.get('securityService');
    const penetrationService = context.get('penetrationService');
    
    if (securityService) {
      return await securityService.performPenetrationTest(projectPath, this._options);
    } else if (penetrationService) {
      return await penetrationService.performPenetrationTest(projectPath, this._options);
    } else {
      throw new Error('Security service or penetration service required for penetration test');
    }
  }

  /**
   * Perform code audit
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Code audit result
   */
  async _performCodeAudit(context, projectPath) {
    const securityService = context.get('securityService');
    const auditService = context.get('auditService');
    
    if (securityService) {
      return await securityService.performCodeAudit(projectPath, this._options);
    } else if (auditService) {
      return await auditService.performCodeAudit(projectPath, this._options);
    } else {
      throw new Error('Security service or audit service required for code audit');
    }
  }

  /**
   * Scan dependencies
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Dependency scan result
   */
  async _scanDependencies(context, projectPath) {
    const securityService = context.get('securityService');
    const dependencyService = context.get('dependencyService');
    
    if (securityService) {
      return await securityService.scanDependencies(projectPath, this._options);
    } else if (dependencyService) {
      return await dependencyService.scanDependencies(projectPath, this._options);
    } else {
      throw new Error('Security service or dependency service required for dependency scan');
    }
  }

  /**
   * Validate security
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Security validation result
   */
  async _validateSecurity(context, projectPath) {
    const securityService = context.get('securityService');
    const validationService = context.get('validationService');
    
    if (securityService) {
      return await securityService.validateSecurity(projectPath, this._options);
    } else if (validationService) {
      return await validationService.validateSecurity(projectPath, this._options);
    } else {
      throw new Error('Security service or validation service required for security validation');
    }
  }

  /**
   * Get security type
   * @returns {string} Security type
   */
  getSecurityType() {
    return this._securityType;
  }

  /**
   * Set security type
   * @param {string} securityType - Security type
   */
  setSecurityType(securityType) {
    this._securityType = securityType;
  }

  /**
   * Get security options
   * @returns {Object} Security options
   */
  getOptions() {
    return { ...this._options };
  }

  /**
   * Set security options
   * @param {Object} options - Security options
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
      securityType: this._securityType,
      options: this._options
    };
  }

  /**
   * Validate security step
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
      return new ValidationResult(false, ['Project path is required for security']);
    }

    // Check if required service is available
    const securityService = context.get('securityService');
    const vulnerabilityService = context.get('vulnerabilityService');
    
    if (!securityService && !vulnerabilityService) {
      return new ValidationResult(false, ['Security service or vulnerability service is required for security']);
    }

    // Validate security type
    const validTypes = [
      'security-scan', 'vulnerability-check', 'security-analysis', 'compliance-check',
      'penetration-test', 'code-audit', 'dependency-scan', 'security-validation'
    ];

    if (!validTypes.includes(this._securityType)) {
      return new ValidationResult(false, [`Invalid security type: ${this._securityType}`]);
    }

    return new ValidationResult(true, []);
  }

  /**
   * Rollback security step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Rollback result
   */
  async rollback(context) {
    // Security steps typically don't need rollback as they don't modify files
    return {
      success: true,
      stepName: this._name,
      message: 'Security step rollback completed (no changes to revert)'
    };
  }

  /**
   * Clone security step
   * @returns {SecurityStep} Cloned step
   */
  clone() {
    const clonedStep = new SecurityStep(this._securityType, this._options);
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
      securityType: this._securityType,
      options: this._options
    };
  }

  /**
   * Create step from JSON
   * @param {Object} json - JSON representation
   * @returns {SecurityStep} Step instance
   */
  static fromJSON(json) {
    const step = new SecurityStep(json.securityType, json.options);
    step._metadata = json.metadata || {};
    step._dependencies = json.dependencies || [];
    return step;
  }
}

module.exports = SecurityStep; 