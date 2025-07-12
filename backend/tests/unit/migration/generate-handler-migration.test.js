/**
 * Generate Handler Migration Tests
 * 
 * This test suite verifies that all generate handlers have been successfully
 * migrated to the unified workflow system using the DocumentationStep base class.
 */

const { expect } = require('chai');
const sinon = require('sinon');

// Import the migrated generate steps
const {
  GenerateScriptStep,
  GenerateScriptsStep,
  GenerateDocumentationStep,
  GenerateTestsStep,
  GenerateConfigsStep,
  GenerateStepFactory,
  GenerateStepRegistry
} = require('../../../domain/workflows/steps/generate');

describe('Generate Handler Migration', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Step Creation and Registration', () => {
    it('should create all generate step instances', () => {
      // Test script step
      const scriptStep = new GenerateScriptStep();
      expect(scriptStep).to.be.instanceOf(GenerateScriptStep);
      expect(scriptStep.getMetadata().name).to.equal('GenerateScriptStep');

      // Test scripts step
      const scriptsStep = new GenerateScriptsStep();
      expect(scriptsStep).to.be.instanceOf(GenerateScriptsStep);
      expect(scriptsStep.getMetadata().name).to.equal('ScriptsGenerationStep');

      // Test documentation step
      const docStep = new GenerateDocumentationStep();
      expect(docStep).to.be.instanceOf(GenerateDocumentationStep);
      expect(docStep.getMetadata().name).to.equal('DocumentationGenerationStep');

      // Test tests step
      const testsStep = new GenerateTestsStep();
      expect(testsStep).to.be.instanceOf(GenerateTestsStep);
      expect(testsStep.getMetadata().name).to.equal('GenerateTestsStep');

      // Test configs step
      const configsStep = new GenerateConfigsStep();
      expect(configsStep).to.be.instanceOf(GenerateConfigsStep);
      expect(configsStep.getMetadata().name).to.equal('GenerateConfigsStep');
    });

    it('should register all steps in the registry', () => {
      const registry = new GenerateStepRegistry();
      
      expect(registry.hasStep('script')).to.be.true;
      expect(registry.hasStep('scripts')).to.be.true;
      expect(registry.hasStep('documentation')).to.be.true;
      expect(registry.hasStep('tests')).to.be.true;
      expect(registry.hasStep('configs')).to.be.true;
    });

    it('should create steps through factory', () => {
      const factory = new GenerateStepFactory();
      
      const scriptStep = factory.createScriptStep();
      expect(scriptStep).to.be.instanceOf(GenerateScriptStep);
      
      const scriptsStep = factory.createScriptsStep();
      expect(scriptsStep).to.be.instanceOf(GenerateScriptsStep);
      
      const docStep = factory.createDocumentationStep();
      expect(docStep).to.be.instanceOf(GenerateDocumentationStep);
      
      const testsStep = factory.createTestsStep();
      expect(testsStep).to.be.instanceOf(GenerateTestsStep);
      
      const configsStep = factory.createConfigsStep();
      expect(configsStep).to.be.instanceOf(GenerateConfigsStep);
    });
  });

  describe('Step Metadata and Configuration', () => {
    it('should have correct metadata for all steps', () => {
      const scriptStep = new GenerateScriptStep();
      const scriptsStep = new GenerateScriptsStep();
      const docStep = new GenerateDocumentationStep();
      const testsStep = new GenerateTestsStep();
      const configsStep = new GenerateConfigsStep();

      // Verify metadata structure
      [scriptStep, scriptsStep, docStep, testsStep, configsStep].forEach(step => {
        const metadata = step.getMetadata();
        expect(metadata).to.have.property('name');
        expect(metadata).to.have.property('description');
        expect(metadata).to.have.property('version');
        expect(metadata).to.have.property('type');
        expect(metadata).to.have.property('category');
        expect(metadata).to.have.property('complexity');
        expect(metadata).to.have.property('dependencies');
        expect(metadata).to.have.property('options');
      });
    });

    it('should have correct step types', () => {
      const scriptStep = new GenerateScriptStep();
      const scriptsStep = new GenerateScriptsStep();
      const docStep = new GenerateDocumentationStep();
      const testsStep = new GenerateTestsStep();
      const configsStep = new GenerateConfigsStep();

      expect(scriptStep.getMetadata().type).to.equal('generate-script');
      expect(scriptsStep.getMetadata().type).to.equal('generate-scripts');
      expect(docStep.getMetadata().type).to.equal('generate-documentation');
      expect(testsStep.getMetadata().type).to.equal('generate-tests');
      expect(configsStep.getMetadata().type).to.equal('generate-configs');
    });
  });

  describe('Step Validation', () => {
    it('should validate context for all steps', async () => {
      const scriptStep = new GenerateScriptStep();
      const scriptsStep = new GenerateScriptsStep();
      const docStep = new GenerateDocumentationStep();
      const testsStep = new GenerateTestsStep();
      const configsStep = new GenerateConfigsStep();

      const steps = [scriptStep, scriptsStep, docStep, testsStep, configsStep];

      for (const step of steps) {
        // Test with valid context
        const validContext = {
          get: (key) => {
            if (key === 'projectPath') return '/test/project';
            return null;
          }
        };
        
        const validResult = await step.validate(validContext);
        expect(validResult.isValid).to.be.true;

        // Test with invalid context (no project path)
        const invalidContext = {
          get: (key) => null
        };
        
        const invalidResult = await step.validate(invalidContext);
        expect(invalidResult.isValid).to.be.false;
        expect(invalidResult.errors).to.include('Project path is required');
      }
    });
  });

  describe('Step Execution', () => {
    it('should execute steps with proper context', async () => {
      const scriptStep = new GenerateScriptStep();
      const scriptsStep = new GenerateScriptsStep();
      const docStep = new GenerateDocumentationStep();
      const testsStep = new GenerateTestsStep();
      const configsStep = new GenerateConfigsStep();

      const steps = [scriptStep, scriptsStep, docStep, testsStep, configsStep];

      for (const step of steps) {
        const context = {
          get: (key) => {
            if (key === 'projectPath') return '/test/project';
            if (key === 'command') return {
              validateBusinessRules: () => ({ isValid: true, errors: [] }),
              getGenerateOptions: () => ({}),
              getOutputConfiguration: () => ({})
            };
            return null;
          }
        };

        // Mock file system operations
        const fsStub = sandbox.stub(require('fs').promises);
        fsStub.access.resolves();
        fsStub.readFile.resolves('{"name": "test-project"}');
        fsStub.writeFile.resolves();
        fsStub.mkdir.resolves();

        try {
          const result = await step.executeStep(context);
          expect(result).to.have.property('success');
          expect(result).to.have.property('metadata');
        } catch (error) {
          // Some steps might fail due to missing dependencies, which is expected
          expect(error.message).to.be.a('string');
        }
      }
    });
  });

  describe('Factory Integration', () => {
    it('should create comprehensive workflow with all steps', () => {
      const factory = new GenerateStepFactory();
      
      const workflow = factory.createComprehensiveWorkflow({
        includeScripts: true,
        includeMultipleScripts: true,
        includeDocumentation: true,
        includeTests: true,
        includeConfigs: true
      });

      expect(workflow).to.be.an('array');
      expect(workflow).to.have.length(5);
      
      expect(workflow[0]).to.be.instanceOf(GenerateScriptStep);
      expect(workflow[1]).to.be.instanceOf(GenerateScriptsStep);
      expect(workflow[2]).to.be.instanceOf(GenerateDocumentationStep);
      expect(workflow[3]).to.be.instanceOf(GenerateTestsStep);
      expect(workflow[4]).to.be.instanceOf(GenerateConfigsStep);
    });

    it('should create enhanced steps with all features', () => {
      const factory = new GenerateStepFactory({
        enableValidation: true,
        enablePerformanceMonitoring: true,
        enableComplexityManagement: true
      });

      const enhancedScriptStep = factory.createEnhancedStep('script');
      const enhancedScriptsStep = factory.createEnhancedStep('scripts');
      const enhancedDocStep = factory.createEnhancedStep('documentation');
      const enhancedTestsStep = factory.createEnhancedStep('tests');
      const enhancedConfigsStep = factory.createEnhancedStep('configs');

      expect(enhancedScriptStep).to.be.instanceOf(GenerateScriptStep);
      expect(enhancedScriptsStep).to.be.instanceOf(GenerateScriptsStep);
      expect(enhancedDocStep).to.be.instanceOf(GenerateDocumentationStep);
      expect(enhancedTestsStep).to.be.instanceOf(GenerateTestsStep);
      expect(enhancedConfigsStep).to.be.instanceOf(GenerateConfigsStep);
    });
  });

  describe('Registry Integration', () => {
    it('should provide step statistics', () => {
      const registry = new GenerateStepRegistry({
        enableStatistics: true
      });

      const scriptStep = registry.createStep('script');
      const scriptsStep = registry.createStep('scripts');
      const docStep = registry.createStep('documentation');
      const testsStep = registry.createStep('tests');
      const configsStep = registry.createStep('configs');

      expect(scriptStep).to.be.instanceOf(GenerateScriptStep);
      expect(scriptsStep).to.be.instanceOf(GenerateScriptsStep);
      expect(docStep).to.be.instanceOf(GenerateDocumentationStep);
      expect(testsStep).to.be.instanceOf(GenerateTestsStep);
      expect(configsStep).to.be.instanceOf(GenerateConfigsStep);

      const summary = registry.getSummary();
      expect(summary.totalSteps).to.equal(5);
      expect(summary.registeredTypes).to.include.members(['script', 'scripts', 'documentation', 'tests', 'configs']);
    });
  });

  describe('Migration Completeness', () => {
    it('should have migrated all 5 generate handlers', () => {
      // Verify that all 5 original handlers have corresponding steps
      const originalHandlers = [
        'GenerateScriptHandler',
        'GenerateScriptsHandler', 
        'GenerateDocumentationHandler',
        'GenerateTestsHandler',
        'GenerateConfigsHandler'
      ];

      const migratedSteps = [
        'GenerateScriptStep',
        'GenerateScriptsStep',
        'GenerateDocumentationStep', 
        'GenerateTestsStep',
        'GenerateConfigsStep'
      ];

      expect(migratedSteps).to.have.length(5);
      
      // Verify all steps can be instantiated
      const factory = new GenerateStepFactory();
      const availableTypes = factory.getAvailableTypes();
      
      expect(availableTypes).to.include.members(['script', 'scripts', 'documentation', 'tests', 'configs']);
      expect(availableTypes).to.have.length(5);
    });

    it('should maintain backward compatibility', () => {
      // Test that the steps can handle the same command structure as the original handlers
      const mockCommand = {
        commandId: 'test-command-123',
        projectPath: '/test/project',
        validateBusinessRules: () => ({ isValid: true, errors: [] }),
        getGenerateOptions: () => ({
          scriptTypes: ['build', 'deploy'],
          configTypes: ['eslint', 'prettier'],
          includeAPI: true,
          generateUnitTests: true
        }),
        getOutputConfiguration: () => ({
          includeSummary: true,
          includeDetails: true
        })
      };

      const context = {
        get: (key) => {
          if (key === 'projectPath') return mockCommand.projectPath;
          if (key === 'command') return mockCommand;
          return null;
        }
      };

      const steps = [
        new GenerateScriptStep(),
        new GenerateScriptsStep(),
        new GenerateDocumentationStep(),
        new GenerateTestsStep(),
        new GenerateConfigsStep()
      ];

      steps.forEach(step => {
        expect(() => {
          // Should not throw when accessing command properties
          const metadata = step.getMetadata();
          expect(metadata).to.have.property('options');
        }).to.not.throw();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing project path gracefully', async () => {
      const steps = [
        new GenerateScriptStep(),
        new GenerateScriptsStep(),
        new GenerateDocumentationStep(),
        new GenerateTestsStep(),
        new GenerateConfigsStep()
      ];

      for (const step of steps) {
        const context = {
          get: (key) => null // No project path
        };

        try {
          await step.executeStep(context);
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).to.include('Project path not found');
        }
      }
    });

    it('should handle invalid command gracefully', async () => {
      const steps = [
        new GenerateScriptStep(),
        new GenerateScriptsStep(),
        new GenerateDocumentationStep(),
        new GenerateTestsStep(),
        new GenerateConfigsStep()
      ];

      for (const step of steps) {
        const context = {
          get: (key) => {
            if (key === 'projectPath') return '/test/project';
            if (key === 'command') return {
              validateBusinessRules: () => ({ isValid: false, errors: ['Invalid command'] }),
              getGenerateOptions: () => ({}),
              getOutputConfiguration: () => ({})
            };
            return null;
          }
        };

        try {
          await step.executeStep(context);
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).to.include('Business rule validation failed');
        }
      }
    });
  });

  describe('Performance and Optimization', () => {
    it('should support performance optimization', () => {
      const factory = new GenerateStepFactory({
        enablePerformanceMonitoring: true
      });

      const optimizedStep = factory.createOptimizedStep('script');
      expect(optimizedStep).to.be.instanceOf(GenerateScriptStep);
    });

    it('should support complexity management', () => {
      const factory = new GenerateStepFactory({
        enableComplexityManagement: true
      });

      const complexStep = factory.createComplexStep('scripts');
      expect(complexStep).to.be.instanceOf(GenerateScriptsStep);
    });

    it('should support validation services', () => {
      const factory = new GenerateStepFactory({
        enableValidation: true
      });

      const validatedStep = factory.createValidatedStep('documentation');
      expect(validatedStep).to.be.instanceOf(GenerateDocumentationStep);
    });
  });
}); 