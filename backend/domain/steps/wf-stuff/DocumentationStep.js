/**
 * DocumentationStep - Documentation workflow step
 * Performs documentation generation and management tasks
 */
const BaseWorkflowStep = require('./BaseWorkflowStep');

/**
 * Documentation workflow step
 */
class DocumentationStep extends BaseWorkflowStep {
  constructor(documentationType = 'generate-docs', options = {}) {
    super('DocumentationStep', `Performs ${documentationType} documentation`, 'documentation');
    this._documentationType = documentationType;
    this._options = { ...options };
  }

  /**
   * Execute documentation step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Documentation result
   */
  async executeStep(context) {
    const projectPath = context.get('projectPath');
    const documentationService = context.get('documentationService');
    const aiService = context.get('aiService');
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }
    
    if (!documentationService && !aiService) {
      throw new Error('Documentation service or AI service not found in context');
    }

    // Perform documentation based on type
    switch (this._documentationType) {
      case 'generate-docs':
        return await this._generateDocumentation(context, projectPath);
      case 'generate-report':
        return await this._generateReport(context, projectPath);
      case 'update-readme':
        return await this._updateReadme(context, projectPath);
      case 'generate-api-docs':
        return await this._generateApiDocs(context, projectPath);
      case 'validate-docs':
        return await this._validateDocumentation(context, projectPath);
      case 'format-docs':
        return await this._formatDocumentation(context, projectPath);
      case 'include-api':
        return await this._includeApiDocumentation(context, projectPath);
      default:
        throw new Error(`Unknown documentation type: ${this._documentationType}`);
    }
  }

  /**
   * Generate documentation
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Documentation generation result
   */
  async _generateDocumentation(context, projectPath) {
    const documentationService = context.get('documentationService');
    const aiService = context.get('aiService');
    const task = context.get('task');
    
    if (documentationService) {
      return await documentationService.generateDocumentation(projectPath, task, this._options);
    } else {
      return await aiService.generateDocumentation(projectPath, task, this._options);
    }
  }

  /**
   * Generate report
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Report generation result
   */
  async _generateReport(context, projectPath) {
    const documentationService = context.get('documentationService');
    const aiService = context.get('aiService');
    const task = context.get('task');
    
    if (documentationService) {
      return await documentationService.generateReport(projectPath, task, this._options);
    } else {
      return await aiService.generateReport(projectPath, task, this._options);
    }
  }

  /**
   * Update README
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} README update result
   */
  async _updateReadme(context, projectPath) {
    const documentationService = context.get('documentationService');
    const aiService = context.get('aiService');
    const task = context.get('task');
    
    if (documentationService) {
      return await documentationService.updateReadme(projectPath, task, this._options);
    } else {
      return await aiService.updateReadme(projectPath, task, this._options);
    }
  }

  /**
   * Generate API documentation
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} API documentation result
   */
  async _generateApiDocs(context, projectPath) {
    const documentationService = context.get('documentationService');
    const apiService = context.get('apiService');
    
    if (documentationService) {
      return await documentationService.generateApiDocs(projectPath, this._options);
    } else if (apiService) {
      return await apiService.generateDocumentation(projectPath, this._options);
    } else {
      throw new Error('Documentation service or API service required for API documentation generation');
    }
  }

  /**
   * Validate documentation
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Documentation validation result
   */
  async _validateDocumentation(context, projectPath) {
    const documentationService = context.get('documentationService');
    const validationService = context.get('validationService');
    
    if (documentationService) {
      return await documentationService.validateDocumentation(projectPath, this._options);
    } else if (validationService) {
      return await validationService.validateDocumentation(projectPath, this._options);
    } else {
      throw new Error('Documentation service or validation service required for documentation validation');
    }
  }

  /**
   * Format documentation
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Documentation formatting result
   */
  async _formatDocumentation(context, projectPath) {
    const documentationService = context.get('documentationService');
    const formattingService = context.get('formattingService');
    
    if (documentationService) {
      return await documentationService.formatDocumentation(projectPath, this._options);
    } else if (formattingService) {
      return await formattingService.formatDocumentation(projectPath, this._options);
    } else {
      throw new Error('Documentation service or formatting service required for documentation formatting');
    }
  }

  /**
   * Include API documentation
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} API documentation inclusion result
   */
  async _includeApiDocumentation(context, projectPath) {
    const documentationService = context.get('documentationService');
    const apiService = context.get('apiService');
    
    if (documentationService) {
      return await documentationService.includeApiDocumentation(projectPath, this._options);
    } else if (apiService) {
      return await apiService.includeDocumentation(projectPath, this._options);
    } else {
      throw new Error('Documentation service or API service required for API documentation inclusion');
    }
  }

  /**
   * Get documentation type
   * @returns {string} Documentation type
   */
  getDocumentationType() {
    return this._documentationType;
  }

  /**
   * Set documentation type
   * @param {string} documentationType - Documentation type
   */
  setDocumentationType(documentationType) {
    this._documentationType = documentationType;
  }

  /**
   * Get documentation options
   * @returns {Object} Documentation options
   */
  getOptions() {
    return { ...this._options };
  }

  /**
   * Set documentation options
   * @param {Object} options - Documentation options
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
      documentationType: this._documentationType,
      options: this._options
    };
  }

  /**
   * Validate documentation step
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
      return new ValidationResult(undefined, false, ['Project path is required for documentation'], [], {});
    }

    // Check if required service is available
    const documentationService = context.get('documentationService');
    const aiService = context.get('aiService');
    
    if (!documentationService && !aiService) {
      return new ValidationResult(undefined, false, ['Documentation service or AI service is required for documentation'], [], {});
    }

    // Validate documentation type
    const validTypes = [
      'generate-docs', 'generate-report', 'update-readme', 'generate-api-docs',
      'validate-docs', 'format-docs', 'include-api'
    ];

    if (!validTypes.includes(this._documentationType)) {
      return new ValidationResult(undefined, false, [`Invalid documentation type: ${this._documentationType}`], [], {});
    }

    return new ValidationResult(undefined, true, [], [], {});
  }

  /**
   * Rollback documentation step
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
          message: 'Documentation step rollback completed via git revert'
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
      message: 'Documentation step rollback completed (manual intervention may be required)'
    };
  }

  /**
   * Clone documentation step
   * @returns {DocumentationStep} Cloned step
   */
  clone() {
    const clonedStep = new DocumentationStep(this._documentationType, this._options);
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
      documentationType: this._documentationType,
      options: this._options
    };
  }

  /**
   * Create step from JSON
   * @param {Object} json - JSON representation
   * @returns {DocumentationStep} Step instance
   */
  static fromJSON(json) {
    const step = new DocumentationStep(json.documentationType, json.options);
    step._metadata = json.metadata || {};
    step._dependencies = json.dependencies || [];
    return step;
  }
}

module.exports = DocumentationStep; 