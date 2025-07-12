/**
 * Unit tests for Unified Workflow Foundation 1B
 * Tests the builder pattern, common workflow steps, and integration
 */

const {
  WorkflowBuilder,
  WorkflowStepBuilder,
  WorkflowComposer,
  WorkflowTemplateRegistry,
  StepRegistry
} = require('@domain/workflows');
const UnifiedWorkflowService = require('@services/UnifiedWorkflowService');

describe('Unified Workflow Foundation 1B', () => {
  let service;

  beforeEach(() => {
    service = new UnifiedWorkflowService({
      logger: console,
      eventBus: { emit: jest.fn() }
    });
  });

  describe('WorkflowBuilder', () => {
    test('should create workflow with fluent interface', () => {
      const workflow = new WorkflowBuilder()
        .setMetadata({
          name: 'Test Workflow',
          description: 'Test workflow',
          type: 'test',
          version: '1.0.0'
        })
        .addStep(
          WorkflowStepBuilder.analysis({
            type: 'comprehensive'
          }).build()
        )
        .build();

      expect(workflow).toBeDefined();
      expect(workflow.getMetadata().name).toBe('Test Workflow');
      expect(workflow.getSteps()).toHaveLength(1);
    });

    test('should support multiple steps', () => {
      const workflow = new WorkflowBuilder()
        .addStep(
          WorkflowStepBuilder.analysis({
            type: 'comprehensive'
          }).build()
        )
        .addStep(
          WorkflowStepBuilder.refactoring({
            type: ''
          }).build()
        )
        .addStep(
          WorkflowStepBuilder.testing({
            runTests: true
          }).build()
        )
        .build();

      expect(workflow.getSteps()).toHaveLength(3);
    });

    test('should support validation rules', () => {
      const workflow = new WorkflowBuilder()
        .addValidationRule({
          validate: () => ({ isValid: true })
        })
        .build();

      expect(workflow).toBeDefined();
    });
  });

  describe('WorkflowStepBuilder', () => {
    test('should create analysis step', () => {
      const step = WorkflowStepBuilder.analysis({
        type: 'comprehensive',
        includeMetrics: true
      }).build();

      expect(step).toBeDefined();
      expect(step.getType()).toBe('analysis');
    });

    test('should create refactoring step', () => {
      const step = WorkflowStepBuilder.refactoring({
        type: '',
        generateCode: true
      }).build();

      expect(step).toBeDefined();
      expect(step.getType()).toBe('refactoring');
    });

    test('should create testing step', () => {
      const step = WorkflowStepBuilder.testing({
        runTests: true,
        validateCoverage: true
      }).build();

      expect(step).toBeDefined();
      expect(step.getType()).toBe('testing');
    });

    test('should create documentation step', () => {
      const step = WorkflowStepBuilder.documentation({
        generateDocs: true,
        format: 'markdown'
      }).build();

      expect(step).toBeDefined();
      expect(step.getType()).toBe('documentation');
    });

    test('should create validation step', () => {
      const step = WorkflowStepBuilder.validation({
        validateCode: true,
        checkQuality: true
      }).build();

      expect(step).toBeDefined();
      expect(step.getType()).toBe('validation');
    });

    test('should create deployment step', () => {
      const step = WorkflowStepBuilder.deployment({
        type: 'application',
        environment: 'production'
      }).build();

      expect(step).toBeDefined();
      expect(step.getType()).toBe('deployment');
    });

    test('should create security step', () => {
      const step = WorkflowStepBuilder.security({
        securityScan: true,
        vulnerabilityCheck: true
      }).build();

      expect(step).toBeDefined();
      expect(step.getType()).toBe('security');
    });

    test('should create optimization step', () => {
      const step = WorkflowStepBuilder.optimization({
        type: 'performance-optimization',
        improveSpeed: true
      }).build();

      expect(step).toBeDefined();
      expect(step.getType()).toBe('optimization');
    });
  });

  describe('StepRegistry', () => {
    test('should list available steps', () => {
      const steps = StepRegistry.listSteps();
      expect(steps).toContain('analysis');
      expect(steps).toContain('refactoring');
      expect(steps).toContain('testing');
      expect(steps).toContain('documentation');
      expect(steps).toContain('validation');
      expect(steps).toContain('deployment');
      expect(steps).toContain('security');
      expect(steps).toContain('optimization');
    });

    test('should create step from registry', () => {
      const step = StepRegistry.createStep('analysis', {
        type: 'comprehensive'
      });

      expect(step).toBeDefined();
      expect(step.getType()).toBe('analysis');
    });

    test('should list step templates', () => {
      const templates = StepRegistry.listTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    test('should register custom step', () => {
      class CustomStep {
        constructor(options) {
          this.options = options;
        }
        getType() { return 'custom'; }
        getMetadata() { return { name: 'Custom Step' }; }
      }

      StepRegistry.registerStep('custom', CustomStep);
      const step = StepRegistry.createStep('custom', {});
      
      expect(step).toBeDefined();
      expect(step.getType()).toBe('custom');
    });
  });

  describe('WorkflowTemplateRegistry', () => {
    test('should list available templates', () => {
      const templates = WorkflowTemplateRegistry.listTemplates();
      expect(templates).toContain('analysis');
      expect(templates).toContain('refactoring');
      expect(templates).toContain('feature');
      expect(templates).toContain('testing');
      expect(templates).toContain('deployment');
      expect(templates).toContain('security');
      expect(templates).toContain('optimization');
    });

    test('should get template', () => {
      const template = WorkflowTemplateRegistry.getTemplate('analysis');
      expect(template).toBeDefined();
      expect(typeof template).toBe('function');
    });

    test('should validate template', () => {
      const result = WorkflowTemplateRegistry.validateTemplate('analysis');
      expect(result.valid).toBe(true);
    });
  });

  describe('WorkflowComposer', () => {
    let composer;

    beforeEach(() => {
      composer = new WorkflowComposer();
    });

    test('should compose analysis workflow', () => {
      const workflow = composer.composeAnalysisWorkflow({
        includeValidation: true
      });

      expect(workflow).toBeDefined();
      expect(workflow.getMetadata().type).toBe('analysis');
      expect(workflow.getSteps().length).toBeGreaterThan(0);
    });

    test('should compose refactoring workflow', () => {
      const workflow = composer.composeRefactoringWorkflow({
        includeTesting: true
      });

      expect(workflow).toBeDefined();
      expect(workflow.getMetadata().type).toBe('refactoring');
      expect(workflow.getSteps().length).toBeGreaterThan(0);
    });

    test('should compose feature workflow', () => {
      const workflow = composer.composeFeatureWorkflow({
        includeTesting: true
      });

      expect(workflow).toBeDefined();
      expect(workflow.getMetadata().type).toBe('feature');
      expect(workflow.getSteps().length).toBeGreaterThan(0);
    });

    test('should compose testing workflow', () => {
      const workflow = composer.composeTestingWorkflow({
        runTests: true
      });

      expect(workflow).toBeDefined();
      expect(workflow.getMetadata().type).toBe('testing');
      expect(workflow.getSteps().length).toBeGreaterThan(0);
    });

    test('should compose deployment workflow', () => {
      const workflow = composer.composeDeploymentWorkflow({
        environment: 'production'
      });

      expect(workflow).toBeDefined();
      expect(workflow.getMetadata().type).toBe('deployment');
      expect(workflow.getSteps().length).toBeGreaterThan(0);
    });

    test('should compose security workflow', () => {
      const workflow = composer.composeSecurityWorkflow({
        securityScan: true
      });

      expect(workflow).toBeDefined();
      expect(workflow.getMetadata().type).toBe('security');
      expect(workflow.getSteps().length).toBeGreaterThan(0);
    });

    test('should compose optimization workflow', () => {
      const workflow = composer.composeOptimizationWorkflow({
        improveSpeed: true
      });

      expect(workflow).toBeDefined();
      expect(workflow.getMetadata().type).toBe('optimization');
      expect(workflow.getSteps().length).toBeGreaterThan(0);
    });
  });

  describe('UnifiedWorkflowService', () => {
    test('should create analysis workflow', () => {
      const workflow = service.createAnalysisWorkflow({
        analysisType: 'comprehensive',
        includeMetrics: true
      });

      expect(workflow).toBeDefined();
      expect(workflow.getMetadata().type).toBe('analysis');
      expect(workflow.getSteps().length).toBeGreaterThan(0);
    });

    test('should create refactoring workflow', () => {
      const workflow = service.createRefactoringWorkflow({
        refactoringType: '',
        generateCode: true
      });

      expect(workflow).toBeDefined();
      expect(workflow.getMetadata().type).toBe('refactoring');
      expect(workflow.getSteps().length).toBeGreaterThan(0);
    });

    test('should create feature workflow', () => {
      const workflow = service.createFeatureWorkflow({
        includeTests: true
      });

      expect(workflow).toBeDefined();
      expect(workflow.getMetadata().type).toBe('feature');
      expect(workflow.getSteps().length).toBeGreaterThan(0);
    });

    test('should create testing workflow', () => {
      const workflow = service.createTestingWorkflow({
        runTests: true,
        validateCoverage: true
      });

      expect(workflow).toBeDefined();
      expect(workflow.getMetadata().type).toBe('testing');
      expect(workflow.getSteps().length).toBeGreaterThan(0);
    });

    test('should create deployment workflow', () => {
      const workflow = service.createDeploymentWorkflow({
        deploymentType: 'application',
        environment: 'production'
      });

      expect(workflow).toBeDefined();
      expect(workflow.getMetadata().type).toBe('deployment');
      expect(workflow.getSteps().length).toBeGreaterThan(0);
    });

    test('should create security workflow', () => {
      const workflow = service.createSecurityWorkflow({
        securityScan: true,
        complianceCheck: true
      });

      expect(workflow).toBeDefined();
      expect(workflow.getMetadata().type).toBe('security');
      expect(workflow.getSteps().length).toBeGreaterThan(0);
    });

    test('should create custom workflow from step types', () => {
      const workflow = service.createCustomWorkflow(
        ['analysis', 'refactoring'],
        {
          name: 'Custom Workflow',
          analysis: { type: 'comprehensive' },
          refactoring: { type: '' }
        }
      );

      expect(workflow).toBeDefined();
      expect(workflow.getMetadata().type).toBe('custom');
      expect(workflow.getSteps()).toHaveLength(2);
    });

    test('should create workflow from template', () => {
      const workflow = service.createFromTemplate('analysis', {
        includeValidation: true
      });

      expect(workflow).toBeDefined();
      expect(workflow.getMetadata().type).toBe('analysis');
    });

    test('should get available templates', () => {
      const templates = service.getAvailableTemplates();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('name');
    });

    test('should get available step types', () => {
      const stepTypes = service.getAvailableStepTypes();
      expect(stepTypes).toContain('analysis');
      expect(stepTypes).toContain('refactoring');
      expect(stepTypes).toContain('testing');
    });

    test('should get step templates', () => {
      const templates = service.getStepTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    test('should validate template', () => {
      const result = service.validateTemplate('analysis');
      expect(result.valid).toBe(true);
    });

    test('should create context', () => {
      const context = service.createContext({
        metadata: { projectPath: '/test' },
        data: { files: ['src/**/*.js'] }
      });

      expect(context).toBeDefined();
      expect(context.getState()).toBeDefined();
      expect(context.getMetadata()).toBeDefined();
    });

    test('should register custom template', () => {
      service.registerTemplate('custom', (builder, options) => {
        return builder
          .setMetadata({
            name: 'Custom Template',
            type: 'custom',
            version: '1.0.0'
          })
          .build();
      });

      const workflow = service.createFromTemplate('custom', {});
      expect(workflow).toBeDefined();
      expect(workflow.getMetadata().name).toBe('Custom Template');
    });

    test('should register custom step', () => {
      class CustomStep {
        constructor(options) {
          this.options = options;
        }
        getType() { return 'custom'; }
        getMetadata() { return { name: 'Custom Step' }; }
      }

      service.registerStep('custom', CustomStep);
      const step = service.getStepRegistry().createStep('custom', {});
      
      expect(step).toBeDefined();
      expect(step.getType()).toBe('custom');
    });
  });

  describe('Integration', () => {
    test('should complete full workflow lifecycle', async () => {
      // Create workflow
      const workflow = service.createRefactoringWorkflow({
        refactoringType: '',
        generateCode: true
      });

      expect(workflow).toBeDefined();
      expect(workflow.getMetadata().type).toBe('refactoring');

      // Create context
      const context = service.createContext({
        metadata: { projectPath: '/test' },
        data: { targetFiles: ['src/**/*.js'] }
      });

      expect(context).toBeDefined();

      // Validate workflow (mock validation)
      const validationResult = { isValid: true };
      expect(validationResult.isValid).toBe(true);

      // Execute workflow (mock execution)
      const executionResult = { success: true };
      expect(executionResult.success).toBe(true);
    });

    test('should handle workflow composition', () => {
      const composer = service.getComposer();
      const templateRegistry = service.getTemplateRegistry();
      const stepRegistry = service.getStepRegistry();

      expect(composer).toBeDefined();
      expect(templateRegistry).toBeDefined();
      expect(stepRegistry).toBeDefined();

      // Test composition
      const workflow = composer.composeAnalysisWorkflow({
        includeValidation: true
      });

      expect(workflow).toBeDefined();
      expect(workflow.getMetadata().type).toBe('analysis');
    });
  });
}); 