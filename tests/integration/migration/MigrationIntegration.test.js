/**
 * Migration Integration Tests
 * 
 * Tests the complete integration of migrated handlers with the unified workflow system.
 * This includes validation of handler migration, workflow execution, and system integration.
 */
const { expect } = require('chai');
const { createIntegrationSystem } = require('../../../backend/domain/workflows/integration');
const { UnifiedWorkflowHandler } = require('../../../backend/domain/workflows/handlers');
const { HandlerRegistry } = require('../../../backend/domain/workflows/handlers');
const { StepRegistry } = require('../../../backend/domain/workflows/steps');
describe('Migration Integration Tests', () => {
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
  describe('Handler Migration Integration', () => {
    it('should have all migrated handlers registered', async () => {
      const handlers = handlerRegistry.listHandlers();
      // Check for analysis handlers (migrated)
      const analysisHandlers = handlers.filter(h => 
        h.type.includes('analysis') || h.type.includes('architecture') || h.type.includes('code-quality')
      );
      expect(analysisHandlers.length).to.be.greaterThan(0);
      // Check for VibeCoder handlers (validated)
      const vibecoderHandlers = handlers.filter(h => 
        h.type.includes('vibecoder')
      );
      expect(vibecoderHandlers.length).to.be.greaterThan(0);
      // Check for generate handlers (migrated)
      const generateHandlers = handlers.filter(h => 
        h.type.includes('generate')
      );
      expect(generateHandlers.length).to.be.greaterThan(0);
    });
    it('should have correct migration status for all handlers', async () => {
      const handlers = handlerRegistry.listHandlers();
      for (const handler of handlers) {
        const metadata = handlerRegistry.getHandlerMetadata(handler.type);
        expect(metadata).to.not.be.null;
        expect(metadata.migrationStatus).to.be.oneOf(['completed', 'validated', 'unified', 'deprecated', 'unknown']);
        if (handler.type.includes('analysis') || handler.type.includes('generate')) {
          expect(metadata.migrationStatus).to.equal('completed');
        }
        if (handler.type.includes('vibecoder')) {
          expect(metadata.migrationStatus).to.equal('validated');
        }
      }
    });
    it('should have automation levels set for all handlers', async () => {
      const handlers = handlerRegistry.listHandlers();
      for (const handler of handlers) {
        const metadata = handlerRegistry.getHandlerMetadata(handler.type);
        expect(metadata.automationLevel).to.be.oneOf(['basic', 'enhanced', 'full']);
        // Migrated handlers should have full automation
        if (metadata.migrationStatus === 'completed' || metadata.migrationStatus === 'validated') {
          expect(metadata.automationLevel).to.equal('full');
        }
      }
    });
  });
  describe('Workflow Execution Integration', () => {
    it('should execute analysis workflow with migrated handlers', async () => {
      const request = {
        type: 'architecture-analysis',
        projectPath: '/test/project',
        options: {
          depth: 'comprehensive'
        }
      };
      const result = await unifiedHandler.handle(request, {}, {});
      expect(result.isSuccess()).to.be.true;
      expect(result.getHandlerId()).to.be.a('string');
      expect(result.getDuration()).to.be.a('number');
    });
    it('should execute VibeCoder workflow with validated handlers', async () => {
      const request = {
        type: 'vibecoder-analyze',
        projectPath: '/test/project',
        options: {
          comprehensive: true
        }
      };
      const result = await unifiedHandler.handle(request, {}, {});
      expect(result.isSuccess()).to.be.true;
      expect(result.getHandlerId()).to.be.a('string');
      expect(result.getDuration()).to.be.a('number');
    });
    it('should execute generate workflow with migrated handlers', async () => {
      const request = {
        type: 'generate-script',
        projectPath: '/test/project',
        options: {
          framework: 'nodejs'
        }
      };
      const result = await unifiedHandler.handle(request, {}, {});
      expect(result.isSuccess()).to.be.true;
      expect(result.getHandlerId()).to.be.a('string');
      expect(result.getDuration()).to.be.a('number');
    });
  });
  describe('Step Integration', () => {
    it('should have all migrated steps registered', async () => {
      const steps = stepRegistry.listSteps();
      // Check for analysis steps
      const analysisSteps = steps.filter(s => 
        s.type.includes('analysis') || s.type.includes('architecture')
      );
      expect(analysisSteps.length).to.be.greaterThan(0);
      // Check for VibeCoder steps
      const vibecoderSteps = steps.filter(s => 
        s.type.includes('vibecoder')
      );
      expect(vibecoderSteps.length).to.be.greaterThan(0);
      // Check for generate steps
      const generateSteps = steps.filter(s => 
        s.type.includes('generate')
      );
      expect(generateSteps.length).to.be.greaterThan(0);
    });
    it('should execute analysis step successfully', async () => {
      const step = stepRegistry.getStep('architecture-analysis');
      expect(step).to.not.be.null;
      const context = {
        projectPath: '/test/project',
        options: { depth: 'comprehensive' }
      };
      const result = await step.execute(context);
      expect(result.success).to.be.true;
    });
    it('should execute VibeCoder step successfully', async () => {
      const step = stepRegistry.getStep('vibecoder-analyze');
      expect(step).to.not.be.null;
      const context = {
        projectPath: '/test/project',
        options: { comprehensive: true }
      };
      const result = await step.execute(context);
      expect(result.success).to.be.true;
    });
  });
  describe('Integration System Validation', () => {
    it('should validate complete integration setup', async () => {
      const validation = await integrationSystem.validator.validateIntegrationSetup();
      expect(validation.isValid).to.be.true;
    });
    it('should execute system integration successfully', async () => {
      const result = await integrationSystem.executeIntegration({
        type: 'system',
        components: ['handlers', 'steps', 'validators'],
        projectId: 'test-project',
        options: {
          comprehensive: true,
          timeout: 30000
        }
      });
      expect(result.success).to.be.true;
      expect(result.components).to.be.an('object');
    });
    it('should provide integration metrics', async () => {
      const metrics = await integrationSystem.metrics.getMetrics();
      expect(metrics).to.be.an('object');
      expect(metrics.integrations).to.be.an('array');
    });
  });
  describe('Migration Metadata Integration', () => {
    it('should include migration metadata in handler context', async () => {
      const request = {
        type: 'architecture-analysis',
        projectPath: '/test/project'
      };
      const result = await unifiedHandler.handle(request, {}, {});
      // The context should include migration metadata
      expect(result.isSuccess()).to.be.true;
      // Check that the handler has migration metadata
      const handler = handlerRegistry.getHandler('architecture-analysis');
      const metadata = handlerRegistry.getHandlerMetadata('architecture-analysis');
      expect(metadata.migrationStatus).to.equal('completed');
      expect(metadata.automationLevel).to.equal('full');
    });
    it('should prioritize migrated handlers over  ones', async () => {
      // Create a request that could be handled by multiple adapters
      const request = {
        type: 'analyze_architecture',
        projectPath: '/test/project'
      };
      const result = await unifiedHandler.handle(request, {}, {});
      expect(result.isSuccess()).to.be.true;
      const handler = handlerRegistry.getHandler('analyze_architecture');
      if (handler) {
        const metadata = handlerRegistry.getHandlerMetadata('analyze_architecture');
        expect(metadata.migrationStatus).to.not.equal('deprecated');
      }
    });
  });
  describe('Error Handling and Recovery', () => {
    it('should handle invalid handler requests gracefully', async () => {
      const request = {
        type: 'invalid_handler_type',
        projectPath: '/test/project'
      };
      const result = await unifiedHandler.handle(request, {}, {});
      // Should handle the error gracefully
      expect(result.isSuccess()).to.be.false;
      expect(result.getError()).to.be.a('string');
    });
    it('should recover from handler execution errors', async () => {
      const request = {
        type: 'architecture-analysis',
        projectPath: '/invalid/path'
      };
      const result = await unifiedHandler.handle(request, {}, {});
      // Should handle the error gracefully
      expect(result.isSuccess()).to.be.false;
      expect(result.getError()).to.be.a('string');
    });
  });
  describe('Performance and Scalability', () => {
    it('should handle concurrent handler executions', async () => {
      const requests = [
        { type: 'architecture-analysis', projectPath: '/test/project1' },
        { type: 'code-quality-analysis', projectPath: '/test/project2' },
        { type: 'vibecoder-analyze', projectPath: '/test/project3' }
      ];
      const promises = requests.map(request => 
        unifiedHandler.handle(request, {}, {})
      );
      const results = await Promise.all(promises);
      expect(results).to.have.length(3);
      results.forEach(result => {
        expect(result.isSuccess()).to.be.true;
      });
    });
    it('should maintain performance under load', async () => {
      const startTime = Date.now();
      // Execute multiple handlers
      for (let i = 0; i < 5; i++) {
        const request = {
          type: 'architecture-analysis',
          projectPath: `/test/project${i}`
        };
        await unifiedHandler.handle(request, {}, {});
      }
      const endTime = Date.now();
      const duration = endTime - startTime;
      // Should complete within reasonable time (5 seconds)
      expect(duration).to.be.lessThan(5000);
    });
  });
  describe('Automation Level Integration', () => {
    it('should determine correct automation levels', async () => {
      const handlers = handlerRegistry.listHandlers();
      for (const handler of handlers) {
        const metadata = handlerRegistry.getHandlerMetadata(handler.type);
        if (metadata.migrationStatus === 'completed' || metadata.migrationStatus === 'validated') {
          expect(metadata.automationLevel).to.equal('full');
        } else if (metadata.migrationStatus === 'unified') {
          expect(metadata.automationLevel).to.equal('enhanced');
        } else {
          expect(metadata.automationLevel).to.equal('basic');
        }
      }
    });
    it('should execute handlers with appropriate automation levels', async () => {
      // Test full automation handler
      const fullRequest = {
        type: 'architecture-analysis',
        projectPath: '/test/project'
      };
      const fullResult = await unifiedHandler.handle(fullRequest, {}, {});
      expect(fullResult.isSuccess()).to.be.true;
      // Test enhanced automation handler
      const enhancedRequest = {
        type: 'unified_workflow',
        projectPath: '/test/project'
      };
      const enhancedResult = await unifiedHandler.handle(enhancedRequest, {}, {});
      expect(enhancedResult.isSuccess()).to.be.true;
    });
  });
}); 