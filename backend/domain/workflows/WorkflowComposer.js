/**
 * WorkflowComposer - Complex workflow composition logic
 * Provides advanced workflow composition patterns and templates
 */
const WorkflowBuilder = require('./WorkflowBuilder');
const WorkflowStepBuilder = require('./WorkflowStepBuilder');
const StepRegistry = require('../steps/StepRegistry');

/**
 * Workflow composer for complex workflow logic
 */
class WorkflowComposer {
  constructor() {
    this._templates = new Map();
    this._patterns = new Map();
  }

  /**
   * Compose analysis workflow
   * @param {Object} options - Analysis options
   * @returns {ComposedWorkflow} Composed workflow
   */
  composeAnalysisWorkflow(options = {}) {
    const builder = new WorkflowBuilder()
      .setMetadata({
        name: 'Analysis Workflow',
        description: 'Comprehensive analysis workflow',
        type: 'analysis',
        version: '1.0.0'
      });

    // Add analysis steps
    const projectAnalysisStep = WorkflowStepBuilder.analysis(options).build();
    builder.addStep(projectAnalysisStep);
    
    // Add additional analysis steps based on options
    if (options.includeTechStack !== false) {
      const techStackStep = new (require('../steps/categories/analysis/TechStackAnalysisStep'))();
      builder.addStep(techStackStep);
    }
    
    if (options.includeArchitecture !== false) {
      const architectureStep = new (require('../steps/categories/analysis/ArchitectureAnalysisStep'))();
      builder.addStep(architectureStep);
    }

    // Add validation step if required
    if (options.includeValidation !== false) {
      const validationStep = WorkflowStepBuilder.validation({
        validateResults: true,
        generateReport: true
      }).build();
      builder.addStep(validationStep);
    }

    // Add documentation step if required
    if (options.includeDocumentation !== false) {
      const documentationStep = WorkflowStepBuilder.documentation({
        generateReport: true,
        format: options.reportFormat || 'markdown'
      }).build();
      builder.addStep(documentationStep);
    }

    return builder.build();
  }

  /**
   * Compose refactoring workflow
   * @param {Object} options - Refactoring options
   * @returns {ComposedWorkflow} Composed workflow
   */
  composeRefactoringWorkflow(options = {}) {
    const builder = new WorkflowBuilder()
      .setMetadata({
        name: 'Refactoring Workflow',
        description: 'Code refactoring workflow with validation',
        type: 'refactoring',
        version: '1.0.0'
      });

    // Add analysis steps for understanding current code
    const projectAnalysisStep = WorkflowStepBuilder.analysis({
      type: 'code-analysis',
      includeMetrics: true
    }).build();
    builder.addStep(projectAnalysisStep);
    
    const codeQualityStep = new (require('../steps/categories/analysis/CodeQualityAnalysisStep'))();
    builder.addStep(codeQualityStep);

    // Add refactoring step
    const refactoringStep = WorkflowStepBuilder.refactoring(options).build();
    builder.addStep(refactoringStep);

    // Add testing step to ensure refactoring didn't break anything
    const testingStep = WorkflowStepBuilder.testing({
      runTests: true,
      validateResults: true
    }).build();
    builder.addStep(testingStep);

    // Add validation step
    const validationStep = WorkflowStepBuilder.validation({
      validateCode: true,
      checkQuality: true
    }).build();
    builder.addStep(validationStep);

    return builder.build();
  }

  /**
   * Compose feature development workflow
   * @param {Object} options - Feature development options
   * @returns {ComposedWorkflow} Composed workflow
   */
  composeFeatureWorkflow(options = {}) {
    const builder = new WorkflowBuilder()
      .setMetadata({
        name: 'Feature Development Workflow',
        description: 'Complete feature development workflow',
        type: 'feature',
        version: '1.0.0'
      });

    // Add analysis steps for requirements understanding
    const projectAnalysisStep = WorkflowStepBuilder.analysis({
      type: 'requirements-analysis',
      includeArchitecture: true
    }).build();
    builder.addStep(projectAnalysisStep);
    
    const architectureStep = new (require('../steps/categories/analysis/ArchitectureAnalysisStep'))();
    builder.addStep(architectureStep);

    // Add implementation step (using refactoring step for code generation)
    const implementationStep = WorkflowStepBuilder.refactoring({
      type: 'feature-implementation',
      generateCode: true
    }).build();
    builder.addStep(implementationStep);

    // Add testing step
    const testingStep = WorkflowStepBuilder.testing({
      runTests: true,
      generateTests: true,
      validateCoverage: true
    }).build();
    builder.addStep(testingStep);

    // Add validation step
    const validationStep = WorkflowStepBuilder.validation({
      validateFeature: true,
      checkIntegration: true
    }).build();
    builder.addStep(validationStep);

    // Add documentation step
    const documentationStep = WorkflowStepBuilder.documentation({
      generateDocs: true,
      includeAPI: true
    }).build();
    builder.addStep(documentationStep);

    return builder.build();
  }

  /**
   * Compose testing workflow
   * @param {Object} options - Testing options
   * @returns {ComposedWorkflow} Composed workflow
   */
  composeTestingWorkflow(options = {}) {
    const builder = new WorkflowBuilder()
      .setMetadata({
        name: 'Testing Workflow',
        description: 'Comprehensive testing workflow',
        type: 'testing',
        version: '1.0.0'
      });

    // Add analysis steps to understand test requirements
    const projectAnalysisStep = WorkflowStepBuilder.analysis({
      type: 'test-analysis',
      identifyGaps: true
    }).build();
    builder.addStep(projectAnalysisStep);
    
    const dependencyStep = new (require('../steps/categories/analysis/DependencyAnalysisStep'))();
    builder.addStep(dependencyStep);

    // Add testing step
    const testingStep = WorkflowStepBuilder.testing(options).build();
    builder.addStep(testingStep);

    // Add optimization step for test improvements
    const optimizationStep = WorkflowStepBuilder.optimization({
      type: 'test-optimization',
      improveCoverage: true
    }).build();
    builder.addStep(optimizationStep);

    return builder.build();
  }

  /**
   * Compose deployment workflow
   * @param {Object} options - Deployment options
   * @returns {ComposedWorkflow} Composed workflow
   */
  composeDeploymentWorkflow(options = {}) {
    const builder = new WorkflowBuilder()
      .setMetadata({
        name: 'Deployment Workflow',
        description: 'Complete deployment workflow',
        type: 'deployment',
        version: '1.0.0'
      });

    // Add validation step
    const validationStep = WorkflowStepBuilder.validation({
      validateDeployment: true,
      checkDependencies: true
    }).build();
    builder.addStep(validationStep);

    // Add testing step
    const testingStep = WorkflowStepBuilder.testing({
      runTests: true,
      validateDeployment: true
    }).build();
    builder.addStep(testingStep);

    // Add security step
    const securityStep = WorkflowStepBuilder.security({
      securityScan: true,
      vulnerabilityCheck: true
    }).build();
    builder.addStep(securityStep);

    // Add deployment step
    const deploymentStep = WorkflowStepBuilder.deployment(options).build();
    builder.addStep(deploymentStep);

    return builder.build();
  }

  /**
   * Compose security workflow
   * @param {Object} options - Security options
   * @returns {ComposedWorkflow} Composed workflow
   */
  composeSecurityWorkflow(options = {}) {
    const builder = new WorkflowBuilder()
      .setMetadata({
        name: 'Security Workflow',
        description: 'Security analysis and validation workflow',
        type: 'security',
        version: '1.0.0'
      });

    // Add security analysis steps
    const projectAnalysisStep = WorkflowStepBuilder.analysis({
      type: 'security-analysis',
      includeVulnerabilities: true
    }).build();
    builder.addStep(projectAnalysisStep);
    
    const securityAnalysisStep = new (require('../steps/categories/analysis/SecurityAnalysisStep'))();
    builder.addStep(securityAnalysisStep);

    // Add security step
    const securityStep = WorkflowStepBuilder.security(options).build();
    builder.addStep(securityStep);

    // Add validation step
    const validationStep = WorkflowStepBuilder.validation({
      validateSecurity: true,
      checkCompliance: true
    }).build();
    builder.addStep(validationStep);

    return builder.build();
  }

  /**
   * Compose optimization workflow
   * @param {Object} options - Optimization options
   * @returns {ComposedWorkflow} Composed workflow
   */
  composeOptimizationWorkflow(options = {}) {
    const builder = new WorkflowBuilder()
      .setMetadata({
        name: 'Optimization Workflow',
        description: 'Performance and code optimization workflow',
        type: 'optimization',
        version: '1.0.0'
      });

    // Add performance analysis steps
    const projectAnalysisStep = WorkflowStepBuilder.analysis({
      type: 'performance-analysis',
      includeMetrics: true
    }).build();
    builder.addStep(projectAnalysisStep);
    
    const performanceStep = new (require('../steps/categories/analysis/PerformanceAnalysisStep'))();
    builder.addStep(performanceStep);

    // Add optimization step
    const optimizationStep = WorkflowStepBuilder.optimization(options).build();
    builder.addStep(optimizationStep);

    // Add testing step to ensure optimizations work
    const testingStep = WorkflowStepBuilder.testing({
      runTests: true,
      validatePerformance: true
    }).build();
    builder.addStep(testingStep);

    // Add validation step
    const validationStep = WorkflowStepBuilder.validation({
      validateOptimizations: true,
      checkPerformance: true
    }).build();
    builder.addStep(validationStep);

    return builder.build();
  }

  /**
   * Compose custom workflow from template
   * @param {string} templateName - Template name
   * @param {Object} options - Template options
   * @returns {ComposedWorkflow} Composed workflow
   */
  composeFromTemplate(templateName, options = {}) {
    const template = this._templates.get(templateName);
    if (!template) {
      throw new Error(`Workflow template not found: ${templateName}`);
    }

    return template(builder, options);
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
   * Register workflow pattern
   * @param {string} name - Pattern name
   * @param {Function} pattern - Pattern function
   */
  registerPattern(name, pattern) {
    this._patterns.set(name, pattern);
  }

  /**
   * Apply workflow pattern
   * @param {string} patternName - Pattern name
   * @param {WorkflowBuilder} builder - Workflow builder
   * @param {Object} options - Pattern options
   * @returns {WorkflowBuilder} Modified builder
   */
  applyPattern(patternName, builder, options = {}) {
    const pattern = this._patterns.get(patternName);
    if (!pattern) {
      throw new Error(`Workflow pattern not found: ${patternName}`);
    }

    return pattern(builder, options);
  }

  /**
   * Get available templates
   * @returns {Array<string>} Template names
   */
  getAvailableTemplates() {
    return Array.from(this._templates.keys());
  }

  /**
   * Get available patterns
   * @returns {Array<string>} Pattern names
   */
  getAvailablePatterns() {
    return Array.from(this._patterns.keys());
  }

  /**
   * Create workflow from step types
   * @param {Array<string>} stepTypes - Step type names
   * @param {Object} options - Workflow options
   * @returns {ComposedWorkflow} Composed workflow
   */
  createFromStepTypes(stepTypes, options = {}) {
    const builder = new WorkflowBuilder()
      .setMetadata(options.metadata || {
        name: 'Custom Workflow',
        description: 'Custom workflow from step types',
        type: 'custom',
        version: '1.0.0'
      });

    for (const stepType of stepTypes) {
      const step = WorkflowStepBuilder.fromTemplate(stepType, options[stepType] || {}).build();
      builder.addStep(step);
    }

    return builder.build();
  }

  /**
   * Create workflow from configuration
   * @param {Object} config - Workflow configuration
   * @returns {ComposedWorkflow} Composed workflow
   */
  createFromConfig(config) {
    const builder = new WorkflowBuilder()
      .setMetadata(config.metadata || {});

    if (config.validationRules) {
      for (const rule of config.validationRules) {
        builder.addValidationRule(rule);
      }
    }

    if (config.rollbackStrategy) {
      builder.setRollbackStrategy(config.rollbackStrategy);
    }

    if (config.steps) {
      for (const stepConfig of config.steps) {
        const step = WorkflowStepBuilder
          .fromTemplate(stepConfig.type, stepConfig.options || {})
          .setMetadata(stepConfig.metadata || {})
          .build();
        builder.addStep(step);
      }
    }

    return builder.build();
  }
}

module.exports = WorkflowComposer; 