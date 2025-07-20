/**
 * WorkflowTemplateRegistry - Registry for workflow templates
 * Manages workflow templates and provides template lookup functionality
 */
const WorkflowComposer = require('./WorkflowComposer');

/**
 * Workflow template registry
 */
class WorkflowTemplateRegistry {
  constructor() {
    this._templates = new Map();
    this._composer = new WorkflowComposer();
    this._initializeDefaultTemplates();
  }

  /**
   * Get workflow template
   * @param {string} name - Template name
   * @returns {Function|null} Template function or null
   */
  getTemplate(name) {
    return this._templates.get(name) || null;
  }

  /**
   * Register workflow template
   * @param {string} name - Template name
   * @param {Function} template - Template function
   */
  registerTemplate(name, template) {
    this._templates.set(name, template);
  }

  /**
   * List all registered templates
   * @returns {Array<string>} Template names
   */
  listTemplates() {
    return Array.from(this._templates.keys());
  }

  /**
   * Check if template exists
   * @param {string} name - Template name
   * @returns {boolean} True if template exists
   */
  hasTemplate(name) {
    return this._templates.has(name);
  }

  /**
   * Remove template
   * @param {string} name - Template name
   * @returns {boolean} True if template was removed
   */
  removeTemplate(name) {
    return this._templates.delete(name);
  }

  /**
   * Clear all templates
   */
  clearTemplates() {
    this._templates.clear();
  }

  /**
   * Initialize default templates
   */
  _initializeDefaultTemplates() {
    // Analysis template
    this.registerTemplate('analysis', (builder, options = {}) => {
      return this._composer.composeAnalysisWorkflow(options);
    });

    // Refactoring template
    this.registerTemplate('refactoring', (builder, options = {}) => {
      return this._composer.composeRefactoringWorkflow(options);
    });

    // Feature development template
    this.registerTemplate('feature', (builder, options = {}) => {
      return this._composer.composeFeatureWorkflow(options);
    });

    // Testing template
    this.registerTemplate('testing', (builder, options = {}) => {
      return this._composer.composeTestingWorkflow(options);
    });

    // Deployment template
    this.registerTemplate('deployment', (builder, options = {}) => {
      return this._composer.composeDeploymentWorkflow(options);
    });

    // Security template
    this.registerTemplate('security', (builder, options = {}) => {
      return this._composer.composeSecurityWorkflow(options);
    });

    // Optimization template
    this.registerTemplate('optimization', (builder, options = {}) => {
      return this._composer.composeOptimizationWorkflow(options);
    });

    // Simple analysis template
    this.registerTemplate('simple-analysis', (builder, options = {}) => {
      return builder
        .setMetadata({
          name: 'Simple Analysis',
          description: 'Basic analysis workflow using modular steps',
          type: 'analysis',
          version: '1.0.0'
        })
        .addStep(require('../steps/categories/analysis/ProjectAnalysisStep'))
        .addStep(require('../steps/categories/analysis/ManifestAnalysisStep'))
        .addStep(require('../steps/categories/analysis/TechStackAnalysisStep'))
        .build();
    });

    // Simple refactoring template
    this.registerTemplate('simple-refactoring', (builder, options = {}) => {
      return builder
        .setMetadata({
          name: 'Simple Refactoring',
          description: 'Basic refactoring workflow',
          type: 'refactoring',
          version: '1.0.0'
        })
        .addStep(require('../steps/RefactoringStep')(options))
        .build();
    });

    // Simple testing template
    this.registerTemplate('simple-testing', (builder, options = {}) => {
      return builder
        .setMetadata({
          name: 'Simple Testing',
          description: 'Basic testing workflow',
          type: 'testing',
          version: '1.0.0'
        })
        .addStep(require('../steps/TestingStep')(options))
        .build();
    });
  }

  /**
   * Get template metadata
   * @param {string} name - Template name
   * @returns {Object|null} Template metadata or null
   */
  getTemplateMetadata(name) {
    const template = this.getTemplate(name);
    if (!template) {
      return null;
    }

    // Create a sample workflow to get metadata
    try {
      const sampleWorkflow = template(new (require('./WorkflowBuilder'))(), {});
      return sampleWorkflow.getMetadata();
    } catch (error) {
      return {
        name,
        description: 'Template metadata unavailable',
        type: 'unknown',
        version: '1.0.0'
      };
    }
  }

  /**
   * Get all template metadata
   * @returns {Array<Object>} Array of template metadata
   */
  getAllTemplateMetadata() {
    const metadata = [];
    for (const name of this.listTemplates()) {
      const templateMetadata = this.getTemplateMetadata(name);
      if (templateMetadata) {
        metadata.push(templateMetadata);
      }
    }
    return metadata;
  }

  /**
   * Validate template
   * @param {string} name - Template name
   * @returns {Object} Validation result
   */
  validateTemplate(name) {
    const template = this.getTemplate(name);
    if (!template) {
      return {
        valid: false,
        error: `Template not found: ${name}`
      };
    }

    try {
      // Test template creation
      const testWorkflow = template(new (require('./WorkflowBuilder'))(), {});
      
      // Validate workflow structure
      if (!testWorkflow.getMetadata) {
        return {
          valid: false,
          error: 'Template does not return valid workflow'
        };
      }

      return {
        valid: true,
        metadata: testWorkflow.getMetadata()
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Get composer instance
   * @returns {WorkflowComposer} Workflow composer instance
   */
  getComposer() {
    return this._composer;
  }
}

// Global template registry instance
const templateRegistry = new WorkflowTemplateRegistry();

module.exports = templateRegistry; 