/**
 * UnifiedWorkflowService - Integration service for Unified Workflow Foundation 1B
 * Demonstrates and provides easy access to the builder pattern and common workflow steps
 */
const {
  WorkflowBuilder,
  WorkflowStepBuilder,
  WorkflowComposer,
  WorkflowTemplateRegistry,
  StepRegistry,
  WorkflowContext,
  WorkflowState,
  WorkflowMetadata
} = require('../workflows');

/**
 * Unified workflow service for easy workflow creation and execution
 */
class UnifiedWorkflowService {
  constructor(dependencies = {}) {
    this.composer = dependencies.composer || new WorkflowComposer();
    this.templateRegistry = dependencies.templateRegistry || WorkflowTemplateRegistry;
    this.stepRegistry = dependencies.stepRegistry || StepRegistry;
    this.logger = dependencies.logger || console;
    this.eventBus = dependencies.eventBus;
  }

  /**
   * Create a simple analysis workflow using the builder pattern
   * @param {Object} options - Analysis options
   * @returns {ComposedWorkflow} Composed workflow
   */
  createAnalysisWorkflow(options = {}) {
    this.logger.info('Creating analysis workflow with builder pattern', options);

    return new WorkflowBuilder()
      .setMetadata({
        name: 'Analysis Workflow',
        description: 'Comprehensive analysis workflow using builder pattern',
        type: 'analysis',
        version: '1.0.0',
        createdBy: 'UnifiedWorkflowService'
      })
      .addStep(
        WorkflowStepBuilder.analysis({
          type: options.analysisType || 'comprehensive',
          includeMetrics: options.includeMetrics !== false,
          includeArchitecture: options.includeArchitecture !== false,
          includeSecurity: options.includeSecurity !== false,
          includePerformance: options.includePerformance !== false
        }).build()
      )
      .addStep(
        WorkflowStepBuilder.validation({
          validateResults: true,
          generateReport: true
        }).build()
      )
      .addStep(
        WorkflowStepBuilder.documentation({
          generateReport: true,
          format: options.reportFormat || 'markdown'
        }).build()
      )
      .build();
  }

  /**
   * Create a refactoring workflow using the builder pattern
   * @param {Object} options - Refactoring options
   * @returns {ComposedWorkflow} Composed workflow
   */
  createRefactoringWorkflow(options = {}) {
    this.logger.info('Creating refactoring workflow with builder pattern', options);

    return new WorkflowBuilder()
      .setMetadata({
        name: 'Refactoring Workflow',
        description: 'Code refactoring workflow with validation using builder pattern',
        type: 'refactoring',
        version: '1.0.0',
        createdBy: 'UnifiedWorkflowService'
      })
      .addStep(
        WorkflowStepBuilder.analysis({
          type: 'code-analysis',
          includeMetrics: true
        }).build()
      )
      .addStep(
        WorkflowStepBuilder.refactoring({
          type: options.refactoringType || '',
          generateCode: options.generateCode !== false,
          improveQuality: options.improveQuality !== false,
          maintainTests: options.maintainTests !== false
        }).build()
      )
      .addStep(
        WorkflowStepBuilder.testing({
          runTests: true,
          validateResults: true
        }).build()
      )
      .addStep(
        WorkflowStepBuilder.validation({
          validateCode: true,
          checkQuality: true
        }).build()
      )
      .build();
  }

  /**
   * Create a feature development workflow using the builder pattern
   * @param {Object} options - Feature development options
   * @returns {ComposedWorkflow} Composed workflow
   */
  createFeatureWorkflow(options = {}) {
    this.logger.info('Creating feature workflow with builder pattern', options);

    return new WorkflowBuilder()
      .setMetadata({
        name: 'Feature Development Workflow',
        description: 'Complete feature development workflow using builder pattern',
        type: 'feature',
        version: '1.0.0',
        createdBy: 'UnifiedWorkflowService'
      })
      .addStep(
        WorkflowStepBuilder.analysis({
          type: 'requirements-analysis',
          includeArchitecture: true
        }).build()
      )
      .addStep(
        WorkflowStepBuilder.refactoring({
          type: 'feature-implementation',
          generateCode: true
        }).build()
      )
      .addStep(
        WorkflowStepBuilder.testing({
          runTests: true,
          generateTests: true,
          validateCoverage: true
        }).build()
      )
      .addStep(
        WorkflowStepBuilder.validation({
          validateFeature: true,
          checkIntegration: true
        }).build()
      )
      .addStep(
        WorkflowStepBuilder.documentation({
          generateDocs: true,
          includeAPI: true
        }).build()
      )
      .build();
  }

  /**
   * Create a testing workflow using the builder pattern
   * @param {Object} options - Testing options
   * @returns {ComposedWorkflow} Composed workflow
   */
  createTestingWorkflow(options = {}) {
    this.logger.info('Creating testing workflow with builder pattern', options);

    return new WorkflowBuilder()
      .setMetadata({
        name: 'Testing Workflow',
        description: 'Comprehensive testing workflow using builder pattern',
        type: 'testing',
        version: '1.0.0',
        createdBy: 'UnifiedWorkflowService'
      })
      .addStep(
        WorkflowStepBuilder.analysis({
          type: 'test-analysis',
          identifyGaps: true
        }).build()
      )
      .addStep(
        WorkflowStepBuilder.testing({
          runTests: options.runTests !== false,
          generateTests: options.generateTests !== false,
          validateCoverage: options.validateCoverage !== false,
          fixFailingTests: options.fixFailingTests !== false
        }).build()
      )
      .addStep(
        WorkflowStepBuilder.optimization({
          type: 'test-optimization',
          improveCoverage: true
        }).build()
      )
      .build();
  }

  /**
   * Create a deployment workflow using the builder pattern
   * @param {Object} options - Deployment options
   * @returns {ComposedWorkflow} Composed workflow
   */
  createDeploymentWorkflow(options = {}) {
    this.logger.info('Creating deployment workflow with builder pattern', options);

    return new WorkflowBuilder()
      .setMetadata({
        name: 'Deployment Workflow',
        description: 'Complete deployment workflow using builder pattern',
        type: 'deployment',
        version: '1.0.0',
        createdBy: 'UnifiedWorkflowService'
      })
      .addStep(
        WorkflowStepBuilder.validation({
          validateDeployment: true,
          checkDependencies: true
        }).build()
      )
      .addStep(
        WorkflowStepBuilder.testing({
          runTests: true,
          validateDeployment: true
        }).build()
      )
      .addStep(
        WorkflowStepBuilder.security({
          securityScan: true,
          vulnerabilityCheck: true
        }).build()
      )
      .addStep(
        WorkflowStepBuilder.deployment({
          type: options.deploymentType || 'application',
          environment: options.environment || 'production',
          rollbackEnabled: options.rollbackEnabled !== false
        }).build()
      )
      .build();
  }

  /**
   * Create a security workflow using the builder pattern
   * @param {Object} options - Security options
   * @returns {ComposedWorkflow} Composed workflow
   */
  createSecurityWorkflow(options = {}) {
    this.logger.info('Creating security workflow with builder pattern', options);

    return new WorkflowBuilder()
      .setMetadata({
        name: 'Security Workflow',
        description: 'Security analysis and validation workflow using builder pattern',
        type: 'security',
        version: '1.0.0',
        createdBy: 'UnifiedWorkflowService'
      })
      .addStep(
        WorkflowStepBuilder.analysis({
          type: 'security-analysis',
          includeVulnerabilities: true
        }).build()
      )
      .addStep(
        WorkflowStepBuilder.security({
          securityScan: true,
          vulnerabilityCheck: true,
          complianceCheck: options.complianceCheck !== false
        }).build()
      )
      .addStep(
        WorkflowStepBuilder.validation({
          validateSecurity: true,
          checkCompliance: true
        }).build()
      )
      .build();
  }

  /**
   * Create a custom workflow from step types
   * @param {Array<string>} stepTypes - Array of step type names
   * @param {Object} options - Workflow options
   * @returns {ComposedWorkflow} Composed workflow
   */
  createCustomWorkflow(stepTypes, options = {}) {
    this.logger.info('Creating custom workflow from step types', { stepTypes, options });

    const builder = new WorkflowBuilder()
      .setMetadata({
        name: options.name || 'Custom Workflow',
        description: options.description || 'Custom workflow created from step types',
        type: 'custom',
        version: '1.0.0',
        createdBy: 'UnifiedWorkflowService'
      });

    for (const stepType of stepTypes) {
      const stepOptions = options[stepType] || {};
      const step = WorkflowStepBuilder.fromTemplate(stepType, stepOptions).build();
      builder.addStep(step);
    }

    return builder.build();
  }

  /**
   * Create workflow from template
   * @param {string} templateName - Template name
   * @param {Object} options - Template options
   * @returns {ComposedWorkflow} Composed workflow
   */
  createFromTemplate(templateName, options = {}) {
    this.logger.info('Creating workflow from template', { templateName, options });

    const template = this.templateRegistry.getTemplate(templateName);
    if (!template) {
      throw new Error(`Workflow template not found: ${templateName}`);
    }

    return template(new WorkflowBuilder(), options);
  }

  /**
   * Execute workflow with context
   * @param {ComposedWorkflow} workflow - Workflow to execute
   * @param {Object} contextData - Context data
   * @returns {Promise<Object>} Execution result
   */
  async executeWorkflow(workflow, contextData = {}) {
    this.logger.info('Executing workflow', {
      workflowType: workflow.getMetadata().type,
      workflowName: workflow.getMetadata().name
    });

    // Create workflow context
    const context = new WorkflowContext(
      new WorkflowState('initialized'),
      new WorkflowMetadata(contextData.metadata || {}),
      contextData.data || {}
    );

    try {
      // Execute workflow
      const result = await workflow.execute(context);

      // Emit event if event bus is available
      if (this.eventBus) {
        this.eventBus.emit('workflow.executed', {
          workflow: workflow.getMetadata(),
          result,
          timestamp: new Date()
        });
      }

      return result;
    } catch (error) {
      this.logger.error('Workflow execution failed', {
        workflowType: workflow.getMetadata().type,
        error: error.message
      });

      // Emit error event if event bus is available
      if (this.eventBus) {
        this.eventBus.emit('workflow.error', {
          workflow: workflow.getMetadata(),
          error: error.message,
          timestamp: new Date()
        });
      }

      throw error;
    }
  }

  /**
   * Get available workflow templates
   * @returns {Array<Object>} Template metadata
   */
  getAvailableTemplates() {
    return this.templateRegistry.getAllTemplateMetadata();
  }

  /**
   * Get available step types
   * @returns {Array<string>} Step type names
   */
  getAvailableStepTypes() {
    return this.stepRegistry.listSteps();
  }

  /**
   * Get step templates
   * @returns {Array<string>} Step template names
   */
  getStepTemplates() {
    return this.stepRegistry.listTemplates();
  }

  /**
   * Validate workflow template
   * @param {string} templateName - Template name
   * @returns {Object} Validation result
   */
  validateTemplate(templateName) {
    return this.templateRegistry.validateTemplate(templateName);
  }

  /**
   * Register custom workflow template
   * @param {string} name - Template name
   * @param {Function} template - Template function
   */
  registerTemplate(name, template) {
    this.templateRegistry.registerTemplate(name, template);
  }

  /**
   * Register custom step
   * @param {string} name - Step name
   * @param {Function} stepClass - Step class constructor
   */
  registerStep(name, stepClass) {
    this.stepRegistry.registerStep(name, stepClass);
  }

  /**
   * Create workflow context
   * @param {Object} data - Context data
   * @returns {WorkflowContext} Workflow context
   */
  createContext(data = {}) {
    return new WorkflowContext(
      new WorkflowState('initialized'),
      new WorkflowMetadata(data.metadata || {}),
      data.data || {}
    );
  }

  /**
   * Get workflow composer instance
   * @returns {WorkflowComposer} Workflow composer
   */
  getComposer() {
    return this.composer;
  }

  /**
   * Get template registry instance
   * @returns {WorkflowTemplateRegistry} Template registry
   */
  getTemplateRegistry() {
    return this.templateRegistry;
  }

  /**
   * Get step registry instance
   * @returns {StepRegistry} Step registry
   */
  getStepRegistry() {
    return this.stepRegistry;
  }
}

module.exports = UnifiedWorkflowService; 