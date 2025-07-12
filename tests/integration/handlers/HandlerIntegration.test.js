/**
 * Handler Integration Tests
 * 
 * Tests the integration of all handler types in the unified workflow system.
 * This includes analyze, generate, refactor, and vibecoder handlers.
 */

const { expect } = require('chai');
const { createIntegrationSystem } = require('../../../backend/domain/workflows/integration');
const { UnifiedWorkflowHandler } = require('../../../backend/domain/workflows/handlers');
const { HandlerRegistry } = require('../../../backend/domain/workflows/handlers');
const { StepRegistry } = require('../../../backend/domain/workflows/steps');

describe('Handler Integration Tests', () => {
  let integrationSystem;
  let unifiedHandler;
  let handlerRegistry;
  let stepRegistry;

  before(async () => {
    // Initialize integration system
    integrationSystem = createIntegrationSystem({
      logger: console,
      eventBus: { emit: () => {}, subscribe: () => {} }
    });

    await integrationSystem.initialize();

    // Get components from integration system
    unifiedHandler = integrationSystem.manager.unifiedHandler;
    handlerRegistry = unifiedHandler.handlerRegistry;
    stepRegistry = integrationSystem.manager.stepRegistry;
  });

  after(async () => {
    await integrationSystem.cleanup();
  });

  describe('Handler Registry Integration', () => {
    it('should register all handler types successfully', () => {
      const handlerTypes = handlerRegistry.getHandlerTypes();
      
      expect(handlerTypes).to.include('analyze');
      expect(handlerTypes).to.include('generate');
      expect(handlerTypes).to.include('refactor');
      expect(handlerTypes).to.include('vibecoder');
      
      expect(handlerTypes.length).to.be.greaterThan(0);
    });

    it('should have valid handler metadata for all types', () => {
      const handlerTypes = handlerRegistry.getHandlerTypes();
      
      handlerTypes.forEach(type => {
        const metadata = handlerRegistry.getHandlerMetadata(type);
        expect(metadata).to.be.an('object');
        expect(metadata.integration).to.be.an('object');
        expect(metadata.integration.status).to.equal('registered');
        expect(metadata.integration.compatibility).to.equal('unified');
      });
    });

    it('should track integration metrics for all handlers', () => {
      const handlerTypes = handlerRegistry.getHandlerTypes();
      
      handlerTypes.forEach(type => {
        const statistics = handlerRegistry.getHandlerStatistics(type);
        expect(statistics).to.be.an('object');
        expect(statistics.integrationMetrics).to.be.an('object');
        expect(statistics.integrationMetrics.integrationHealth).to.be.a('string');
      });
    });
  });

  describe('Step Registry Integration', () => {
    it('should register all workflow steps successfully', () => {
      const steps = stepRegistry.listSteps();
      
      expect(steps).to.include('analysis');
      expect(steps).to.include('refactoring');
      expect(steps).to.include('testing');
      expect(steps).to.include('documentation');
      expect(steps).to.include('validation');
      expect(steps).to.include('deployment');
      expect(steps).to.include('security');
      expect(steps).to.include('optimization');
      
      expect(steps).to.include('vibecoder-analyze');
      expect(steps).to.include('vibecoder-generate');
      expect(steps).to.include('vibecoder-refactor');
      expect(steps).to.include('vibecoder-mode');
      
      expect(steps.length).to.be.greaterThan(0);
    });

    it('should have valid step metadata for all steps', () => {
      const steps = stepRegistry.listSteps();
      
      steps.forEach(stepName => {
        const metadata = stepRegistry.getStepMetadata(stepName);
        expect(metadata).to.be.an('object');
        expect(metadata.name).to.be.a('string');
        expect(metadata.type).to.be.a('string');
      });
    });

    it('should register step templates successfully', () => {
      const templates = stepRegistry.listTemplates();
      
      expect(templates).to.include('comprehensive-analysis');
      expect(templates).to.include('architecture-analysis');
      expect(templates).to.include('security-analysis');
      expect(templates).to.include('performance-analysis');
      expect(templates).to.include('vibecoder-comprehensive');
      
      expect(templates.length).to.be.greaterThan(0);
    });
  });

  describe('Unified Workflow Handler Integration', () => {
    it('should handle analyze requests through unified interface', async () => {
      const request = {
        type: 'analyze',
        subType: 'architecture',
        projectId: 'test-project',
        options: {
          depth: 'comprehensive',
          includeDependencies: true
        }
      };

      const result = await unifiedHandler.handle(request);
      
      expect(result).to.be.an('object');
      expect(result.success).to.be.a('boolean');
      expect(result.handlerType).to.equal('analyze');
    });

    it('should handle generate requests through unified interface', async () => {
      const request = {
        type: 'generate',
        subType: 'tests',
        projectId: 'test-project',
        options: {
          framework: 'jest',
          coverage: 80
        }
      };

      const result = await unifiedHandler.handle(request);
      
      expect(result).to.be.an('object');
      expect(result.success).to.be.a('boolean');
      expect(result.handlerType).to.equal('generate');
    });

    it('should handle refactor requests through unified interface', async () => {
      const request = {
        type: 'refactor',
        subType: 'split-large-files',
        projectId: 'test-project',
        options: {
          maxLines: 500,
          preserveStructure: true
        }
      };

      const result = await unifiedHandler.handle(request);
      
      expect(result).to.be.an('object');
      expect(result.success).to.be.a('boolean');
      expect(result.handlerType).to.equal('refactor');
    });

    it('should handle vibecoder requests through unified interface', async () => {
      const request = {
        type: 'vibecoder',
        subType: 'analyze',
        projectId: 'test-project',
        options: {
          mode: 'comprehensive',
          includeSuggestions: true
        }
      };

      const result = await unifiedHandler.handle(request);
      
      expect(result).to.be.an('object');
      expect(result.success).to.be.a('boolean');
      expect(result.handlerType).to.equal('vibecoder');
    });
  });

  describe('Handler Factory Integration', () => {
    it('should create handlers with integration metadata', () => {
      const handlerFactory = unifiedHandler.handlerFactory;
      const handlerTypes = ['analyze', 'generate', 'refactor', 'vibecoder'];
      
      handlerTypes.forEach(type => {
        const handler = handlerFactory.createHandler(type, {});
        expect(handler).to.be.an('object');
        expect(handler.getMetadata).to.be.a('function');
        
        const metadata = handler.getMetadata();
        expect(metadata).to.be.an('object');
        expect(metadata.type).to.equal(type);
      });
    });

    it('should support priority-based handler selection', () => {
      const handlerFactory = unifiedHandler.handlerFactory;
      
      // Test with different priorities
      const highPriorityHandler = handlerFactory.createHandler('analyze', { priority: 'high' });
      const lowPriorityHandler = handlerFactory.createHandler('analyze', { priority: 'low' });
      
      expect(highPriorityHandler).to.be.an('object');
      expect(lowPriorityHandler).to.be.an('object');
      
      const highMetadata = highPriorityHandler.getMetadata();
      const lowMetadata = lowPriorityHandler.getMetadata();
      
      expect(highMetadata.priority).to.equal('high');
      expect(lowMetadata.priority).to.equal('low');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid handler type gracefully', async () => {
      const request = {
        type: 'invalid-handler',
        subType: 'test',
        projectId: 'test-project'
      };

      try {
        await unifiedHandler.handle(request);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Handler not found');
      }
    });

    it('should handle handler execution errors gracefully', async () => {
      const request = {
        type: 'analyze',
        subType: 'invalid-analysis',
        projectId: 'test-project'
      };

      const result = await unifiedHandler.handle(request);
      
      // Should return error result instead of throwing
      expect(result).to.be.an('object');
      expect(result.success).to.be.false;
      expect(result.error).to.be.a('string');
    });

    it('should maintain system stability during handler failures', async () => {
      const handlerTypes = handlerRegistry.getHandlerTypes();
      
      // Verify all handlers are still registered after errors
      handlerTypes.forEach(type => {
        const handler = handlerRegistry.getHandler(type);
        expect(handler).to.be.an('object');
      });
    });
  });

  describe('Performance and Metrics', () => {
    it('should track handler execution metrics', async () => {
      const request = {
        type: 'analyze',
        subType: 'architecture',
        projectId: 'test-project'
      };

      await unifiedHandler.handle(request);
      
      const statistics = handlerRegistry.getHandlerStatistics('analyze');
      expect(statistics.executions).to.be.greaterThan(0);
      expect(statistics.lastExecuted).to.be.a('date');
    });

    it('should track integration health metrics', () => {
      const handlerTypes = handlerRegistry.getHandlerTypes();
      
      handlerTypes.forEach(type => {
        const statistics = handlerRegistry.getHandlerStatistics(type);
        expect(statistics.integrationMetrics.lastIntegrationCheck).to.be.a('date');
        expect(statistics.integrationMetrics.integrationHealth).to.be.oneOf(['healthy', 'degraded', 'failed', 'unknown']);
      });
    });
  });

  describe('Workflow Step Integration', () => {
    it('should execute workflow steps through handler integration', async () => {
      const stepName = 'analysis';
      const step = stepRegistry.createStep(stepName, {
        type: 'architecture',
        projectId: 'test-project'
      });

      expect(step).to.be.an('object');
      expect(step.execute).to.be.a('function');
      
      const result = await step.execute();
      expect(result).to.be.an('object');
    });

    it('should validate step compatibility with handlers', async () => {
      const stepName = 'vibecoder-analyze';
      const context = {
        projectId: 'test-project',
        handlerType: 'vibecoder'
      };

      const isCompatible = await stepRegistry.checkStepCompatibility(stepName, context);
      expect(isCompatible).to.be.a('boolean');
    });

    it('should get compatible steps for given context', async () => {
      const context = {
        projectId: 'test-project',
        handlerType: 'analyze'
      };

      const compatibleSteps = await stepRegistry.getCompatibleSteps(context);
      expect(compatibleSteps).to.be.an('array');
      expect(compatibleSteps.length).to.be.greaterThan(0);
    });
  });
}); 