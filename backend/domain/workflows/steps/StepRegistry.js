/**
 * StepRegistry - Registry for workflow steps and templates
 * Manages workflow steps and provides step lookup functionality
 */
const AnalysisStep = require('./AnalysisStep');
const RefactoringStep = require('./RefactoringStep');
const TestingStep = require('./TestingStep');
const DocumentationStep = require('./DocumentationStep');
const ValidationStep = require('./ValidationStep');
const DeploymentStep = require('./DeploymentStep');
const SecurityStep = require('./SecurityStep');
const OptimizationStep = require('./OptimizationStep');

/**
 * Step registry for workflow step management
 */
class StepRegistry {
  constructor() {
    this._steps = new Map();
    this._templates = new Map();
    this._initializeDefaultSteps();
  }

  /**
   * Register workflow step
   * @param {string} name - Step name
   * @param {Function} stepClass - Step class constructor
   */
  registerStep(name, stepClass) {
    this._steps.set(name, stepClass);
  }

  /**
   * Get workflow step
   * @param {string} name - Step name
   * @returns {Function} Step class constructor
   */
  getStep(name) {
    const stepClass = this._steps.get(name);
    if (!stepClass) {
      throw new Error(`Workflow step not found: ${name}`);
    }
    return stepClass;
  }

  /**
   * Create step instance
   * @param {string} name - Step name
   * @param {Object} options - Step options
   * @returns {IWorkflowStep} Step instance
   */
  createStep(name, options = {}) {
    const stepClass = this.getStep(name);
    return new stepClass(options);
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
   * Get workflow template
   * @param {string} name - Template name
   * @returns {Function} Template function
   */
  getTemplate(name) {
    const template = this._templates.get(name);
    if (!template) {
      throw new Error(`Workflow template not found: ${name}`);
    }
    return template;
  }

  /**
   * List all registered steps
   * @returns {Array<string>} Step names
   */
  listSteps() {
    return Array.from(this._steps.keys());
  }

  /**
   * List all registered templates
   * @returns {Array<string>} Template names
   */
  listTemplates() {
    return Array.from(this._templates.keys());
  }

  /**
   * Check if step exists
   * @param {string} name - Step name
   * @returns {boolean} True if step exists
   */
  hasStep(name) {
    return this._steps.has(name);
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
   * Remove step
   * @param {string} name - Step name
   * @returns {boolean} True if step was removed
   */
  removeStep(name) {
    return this._steps.delete(name);
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
   * Clear all steps
   */
  clearSteps() {
    this._steps.clear();
  }

  /**
   * Clear all templates
   */
  clearTemplates() {
    this._templates.clear();
  }

  /**
   * Initialize default steps
   */
  _initializeDefaultSteps() {
    // Register common workflow steps
    this.registerStep('analysis', AnalysisStep);
    this.registerStep('refactoring', RefactoringStep);
    this.registerStep('testing', TestingStep);
    this.registerStep('documentation', DocumentationStep);
    this.registerStep('validation', ValidationStep);
    this.registerStep('deployment', DeploymentStep);
    this.registerStep('security', SecurityStep);
    this.registerStep('optimization', OptimizationStep);

    // Register step templates
    this._initializeStepTemplates();
  }

  /**
   * Initialize step templates
   */
  _initializeStepTemplates() {
    // Analysis templates
    this.registerTemplate('comprehensive-analysis', (options = {}) => {
      return new AnalysisStep('comprehensive', options);
    });

    this.registerTemplate('architecture-analysis', (options = {}) => {
      return new AnalysisStep('architecture', options);
    });

    this.registerTemplate('security-analysis', (options = {}) => {
      return new AnalysisStep('security', options);
    });

    this.registerTemplate('performance-analysis', (options = {}) => {
      return new AnalysisStep('performance', options);
    });

    // Refactoring templates
    this.registerTemplate('general-refactoring', (options = {}) => {
      return new RefactoringStep('general', options);
    });

    this.registerTemplate('code-generation', (options = {}) => {
      return new RefactoringStep('code-generation', options);
    });

    this.registerTemplate('feature-implementation', (options = {}) => {
      return new RefactoringStep('feature-implementation', options);
    });

    // Testing templates
    this.registerTemplate('run-tests', (options = {}) => {
      return new TestingStep('run-tests', options);
    });

    this.registerTemplate('generate-tests', (options = {}) => {
      return new TestingStep('generate-tests', options);
    });

    this.registerTemplate('validate-coverage', (options = {}) => {
      return new TestingStep('validate-coverage', options);
    });

    // Documentation templates
    this.registerTemplate('generate-docs', (options = {}) => {
      return new DocumentationStep('generate-docs', options);
    });

    this.registerTemplate('generate-report', (options = {}) => {
      return new DocumentationStep('generate-report', options);
    });

    this.registerTemplate('update-readme', (options = {}) => {
      return new DocumentationStep('update-readme', options);
    });

    // Validation templates
    this.registerTemplate('code-validation', (options = {}) => {
      return new ValidationStep('code-validation', options);
    });

    this.registerTemplate('quality-check', (options = {}) => {
      return new ValidationStep('quality-check', options);
    });

    this.registerTemplate('validate-results', (options = {}) => {
      return new ValidationStep('validate-results', options);
    });

    // Deployment templates
    this.registerTemplate('application-deployment', (options = {}) => {
      return new DeploymentStep('application-deployment', options);
    });

    this.registerTemplate('docker-deployment', (options = {}) => {
      return new DeploymentStep('docker-deployment', options);
    });

    this.registerTemplate('kubernetes-deployment', (options = {}) => {
      return new DeploymentStep('kubernetes-deployment', options);
    });

    // Security templates
    this.registerTemplate('security-scan', (options = {}) => {
      return new SecurityStep('security-scan', options);
    });

    this.registerTemplate('vulnerability-check', (options = {}) => {
      return new SecurityStep('vulnerability-check', options);
    });

    this.registerTemplate('security-analysis', (options = {}) => {
      return new SecurityStep('security-analysis', options);
    });

    // Optimization templates
    this.registerTemplate('performance-optimization', (options = {}) => {
      return new OptimizationStep('performance-optimization', options);
    });

    this.registerTemplate('code-optimization', (options = {}) => {
      return new OptimizationStep('code-optimization', options);
    });

    this.registerTemplate('test-optimization', (options = {}) => {
      return new OptimizationStep('test-optimization', options);
    });
  }

  /**
   * Get step metadata
   * @param {string} name - Step name
   * @returns {Object|null} Step metadata or null
   */
  getStepMetadata(name) {
    const stepClass = this.getStep(name);
    if (!stepClass) {
      return null;
    }

    // Create a sample step to get metadata
    try {
      const sampleStep = new stepClass();
      return sampleStep.getMetadata();
    } catch (error) {
      return {
        name,
        description: 'Step metadata unavailable',
        type: 'unknown',
        version: '1.0.0'
      };
    }
  }

  /**
   * Get all step metadata
   * @returns {Array<Object>} Array of step metadata
   */
  getAllStepMetadata() {
    const metadata = [];
    for (const name of this.listSteps()) {
      const stepMetadata = this.getStepMetadata(name);
      if (stepMetadata) {
        metadata.push(stepMetadata);
      }
    }
    return metadata;
  }

  /**
   * Validate step
   * @param {string} name - Step name
   * @returns {Object} Validation result
   */
  validateStep(name) {
    const stepClass = this.getStep(name);
    if (!stepClass) {
      return {
        valid: false,
        error: `Step not found: ${name}`
      };
    }

    try {
      // Test step creation
      const testStep = new stepClass();
      
      // Validate step structure
      if (!testStep.getMetadata) {
        return {
          valid: false,
          error: 'Step does not have required getMetadata method'
        };
      }

      return {
        valid: true,
        metadata: testStep.getMetadata()
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Get step configuration
   * @param {string} name - Step name
   * @returns {Object|null} Step configuration or null
   */
  getStepConfiguration(name) {
    const stepClass = this.getStep(name);
    if (!stepClass) {
      return null;
    }

    // Create a sample step to get configuration
    try {
      const sampleStep = new stepClass();
      return sampleStep.getConfiguration ? sampleStep.getConfiguration() : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get step dependencies
   * @param {string} name - Step name
   * @returns {Array<string>} Step dependencies
   */
  getStepDependencies(name) {
    const stepClass = this.getStep(name);
    if (!stepClass) {
      return [];
    }

    // Create a sample step to get dependencies
    try {
      const sampleStep = new stepClass();
      return sampleStep.getDependencies ? sampleStep.getDependencies() : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Check step compatibility
   * @param {string} stepName - Step name
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<boolean>} True if step is compatible
   */
  async checkStepCompatibility(stepName, context) {
    const stepClass = this.getStep(stepName);
    if (!stepClass) {
      return false;
    }

    try {
      const step = new stepClass();
      return await step.canExecute(context);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get compatible steps
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Array<string>>} Compatible step names
   */
  async getCompatibleSteps(context) {
    const compatibleSteps = [];
    
    for (const stepName of this.listSteps()) {
      const isCompatible = await this.checkStepCompatibility(stepName, context);
      if (isCompatible) {
        compatibleSteps.push(stepName);
      }
    }
    
    return compatibleSteps;
  }

  /**
   * Create step from configuration
   * @param {Object} config - Step configuration
   * @returns {IWorkflowStep} Step instance
   */
  createStepFromConfig(config) {
    const stepClass = this.getStep(config.type);
    const step = new stepClass(config.options || {});
    
    if (config.metadata) {
      step.setMetadata(config.metadata);
    }
    
    if (config.dependencies) {
      step.setDependencies(config.dependencies);
    }
    
    return step;
  }

  /**
   * Export step registry
   * @returns {Object} Registry export
   */
  export() {
    return {
      steps: Array.from(this._steps.keys()),
      templates: Array.from(this._templates.keys()),
      stepMetadata: this.getAllStepMetadata()
    };
  }

  /**
   * Import step registry
   * @param {Object} data - Registry data
   */
  import(data) {
    // Clear existing registry
    this.clearSteps();
    this.clearTemplates();
    
    // Reinitialize with imported data
    this._initializeDefaultSteps();
    
    // Additional custom steps and templates can be added here
    if (data.customSteps) {
      for (const [name, stepClass] of Object.entries(data.customSteps)) {
        this.registerStep(name, stepClass);
      }
    }
    
    if (data.customTemplates) {
      for (const [name, template] of Object.entries(data.customTemplates)) {
        this.registerTemplate(name, template);
      }
    }
  }
}

// Global step registry instance
const stepRegistry = new StepRegistry();

module.exports = stepRegistry; 