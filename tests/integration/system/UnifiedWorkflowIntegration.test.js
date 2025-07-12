/**
 * Unified Workflow Integration Tests
 * 
 * This test suite validates the complete integration of the unified workflow system,
 * including handlers, steps, and the integration framework. It ensures that all
 * components work together seamlessly.
 */

const { createIntegrationSystem, utils } = require('../../../backend/domain/workflows/integration');
const { UnifiedWorkflowHandler } = require('../../../backend/domain/workflows/handlers');
const { StepRegistry } = require('../../../backend/domain/workflows/steps');
const IntegrationRepository = require('../../../backend/infrastructure/database/repositories/IntegrationRepository');

describe('Unified Workflow Integration Tests', () => {
  let integrationSystem;
  let mockDatabase;

  beforeAll(async () => {
    // Setup mock database
    mockDatabase = {
      execute: jest.fn().mockResolvedValue([[], []]),
      query: jest.fn().mockResolvedValue([[], []]),
      transaction: jest.fn().mockImplementation(async (callback) => {
        return await callback(mockDatabase);
      })
    };

    // Create integration system
    integrationSystem = createIntegrationSystem({
      database: mockDatabase,
      logger: console
    });

    await integrationSystem.initialize();
  });

  afterAll(async () => {
    if (integrationSystem) {
      await integrationSystem.cleanup();
    }
  });

  describe('System Initialization', () => {
    test('should initialize integration system successfully', async () => {
      const status = integrationSystem.getStatus();
      
      expect(status.isInitialized).toBe(true);
      expect(status.registeredComponents).toBeGreaterThan(0);
    });

    test('should have all required components registered', () => {
      const status = integrationSystem.getStatus();
      const components = integrationSystem.getRegisteredComponents();
      
      expect(components.size).toBeGreaterThan(0);
      expect(status.activeIntegrations).toBe(0);
    });

    test('should validate system configuration', () => {
      const config = utils.createDefaultConfig();
      const validation = utils.validateConfiguration(config);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Handler Integration', () => {
    test('should register and execute analyze handler', async () => {
      const request = {
        type: 'handler',
        handlerType: 'analyze_architecture',
        data: {
          projectPath: '/test/project',
          options: { depth: 2 }
        }
      };

      const result = await integrationSystem.executeIntegration(request);
      
      expect(result.success).toBe(true);
      expect(result.integrationId).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    test('should register and execute vibecoder handler', async () => {
      const request = {
        type: 'handler',
        handlerType: 'vibecoder_analyze',
        data: {
          code: 'console.log("Hello World");',
          language: 'javascript'
        }
      };

      const result = await integrationSystem.executeIntegration(request);
      
      expect(result.success).toBe(true);
      expect(result.integrationId).toBeDefined();
    });

    test('should register and execute generate handler', async () => {
      const request = {
        type: 'handler',
        handlerType: 'generate_script',
        data: {
          template: 'basic',
          parameters: { name: 'test' }
        }
      };

      const result = await integrationSystem.executeIntegration(request);
      
      expect(result.success).toBe(true);
      expect(result.integrationId).toBeDefined();
    });

    test('should handle handler execution errors gracefully', async () => {
      const request = {
        type: 'handler',
        handlerType: 'nonexistent_handler',
        data: {}
      };

      const result = await integrationSystem.executeIntegration(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.integrationId).toBeDefined();
    });
  });

  describe('Step Integration', () => {
    test('should register and execute analysis step', async () => {
      const request = {
        type: 'step',
        stepType: 'analysis',
        data: {
          input: 'test data',
          options: { mode: 'quick' }
        }
      };

      const result = await integrationSystem.executeIntegration(request);
      
      expect(result.success).toBe(true);
      expect(result.integrationId).toBeDefined();
    });

    test('should register and execute validation step', async () => {
      const request = {
        type: 'step',
        stepType: 'validation',
        data: {
          schema: { type: 'object' },
          data: { test: 'value' }
        }
      };

      const result = await integrationSystem.executeIntegration(request);
      
      expect(result.success).toBe(true);
      expect(result.integrationId).toBeDefined();
    });

    test('should handle step execution errors gracefully', async () => {
      const request = {
        type: 'step',
        stepType: 'nonexistent_step',
        data: {}
      };

      const result = await integrationSystem.executeIntegration(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Workflow Integration', () => {
    test('should execute complete workflow', async () => {
      const workflow = {
        type: 'analysis',
        steps: [
          { type: 'analysis', data: { input: 'test' } },
          { type: 'validation', data: { schema: {} } }
        ]
      };

      const request = {
        type: 'workflow',
        workflow,
        response: {}
      };

      const result = await integrationSystem.executeIntegration(request);
      
      expect(result.success).toBe(true);
      expect(result.integrationId).toBeDefined();
    });

    test('should handle workflow with multiple steps', async () => {
      const workflow = {
        type: 'complex',
        steps: [
          { type: 'analysis', data: { input: 'step1' } },
          { type: 'validation', data: { schema: {} } },
          { type: 'transformation', data: { rules: [] } }
        ]
      };

      const request = {
        type: 'workflow',
        workflow,
        response: {}
      };

      const result = await integrationSystem.executeIntegration(request);
      
      expect(result.success).toBe(true);
      expect(result.integrationId).toBeDefined();
    });
  });

  describe('System Integration', () => {
    test('should perform system health check', async () => {
      const request = {
        type: 'system',
        testConfig: { quick: true }
      };

      const result = await integrationSystem.executeIntegration(request);
      
      expect(result.success).toBe(true);
      expect(result.result.healthCheck).toBeDefined();
      expect(result.result.report).toBeDefined();
    });

    test('should generate integration report', async () => {
      const report = await utils.generateReport(integrationSystem);
      
      expect(report.status).toBeDefined();
      expect(report.metrics).toBeDefined();
      expect(report.healthCheck).toBeDefined();
      expect(report.summary).toBeDefined();
    });

    test('should run system diagnostics', async () => {
      const diagnostics = await utils.runDiagnostics(integrationSystem);
      
      expect(diagnostics.components).toBeDefined();
      expect(diagnostics.issues).toBeDefined();
      expect(diagnostics.recommendations).toBeDefined();
    });
  });

  describe('Metrics Collection', () => {
    test('should collect integration metrics', async () => {
      const metrics = integrationSystem.getMetrics();
      
      expect(metrics.summary).toBeDefined();
      expect(metrics.current).toBeDefined();
      expect(metrics.uptime).toBeGreaterThan(0);
    });

    test('should track performance metrics', async () => {
      const request = {
        type: 'handler',
        handlerType: 'analyze_architecture',
        data: { test: 'data' }
      };

      await integrationSystem.executeIntegration(request);
      
      const performanceMetrics = integrationSystem.metrics.getPerformanceMetrics();
      
      expect(performanceMetrics.total).toBeGreaterThan(0);
      expect(performanceMetrics.averageDuration).toBeGreaterThan(0);
    });

    test('should track error metrics', async () => {
      const request = {
        type: 'handler',
        handlerType: 'nonexistent',
        data: {}
      };

      await integrationSystem.executeIntegration(request);
      
      const errorMetrics = integrationSystem.metrics.getErrorMetrics();
      
      expect(errorMetrics.total).toBeGreaterThan(0);
      expect(errorMetrics.errorTypes).toBeDefined();
    });
  });

  describe('Health Monitoring', () => {
    test('should perform health check on all components', async () => {
      const healthCheck = await integrationSystem.manager.performHealthCheck();
      
      expect(healthCheck.handlers).toBeDefined();
      expect(healthCheck.steps).toBeDefined();
      expect(healthCheck.services).toBeDefined();
      expect(healthCheck.overall).toBeDefined();
    });

    test('should track component health over time', async () => {
      const initialHealth = await integrationSystem.manager.performHealthCheck();
      
      // Perform some operations
      await integrationSystem.executeIntegration({
        type: 'handler',
        handlerType: 'analyze_architecture',
        data: { test: 'data' }
      });
      
      const updatedHealth = await integrationSystem.manager.performHealthCheck();
      
      expect(updatedHealth).toBeDefined();
      expect(updatedHealth.overall).toBeDefined();
    });
  });

  describe('Test Execution', () => {
    test('should run system integration tests', async () => {
      const testResults = await integrationSystem.runTests({
        enableSystemTests: true,
        enableHandlerTests: true,
        enablePerformanceTests: true
      });
      
      expect(testResults.success).toBe(true);
      expect(testResults.summary).toBeDefined();
      expect(testResults.results).toBeDefined();
    });

    test('should run handler integration tests', async () => {
      const testResults = await integrationSystem.testRunner.runHandlerTests({
        includeAnalyze: true,
        includeVibeCoder: true,
        includeGenerate: true
      });
      
      expect(testResults.success).toBe(true);
      expect(testResults.results).toBeDefined();
    });

    test('should run performance tests', async () => {
      const testResults = await integrationSystem.testRunner.runPerformanceTests({
        loadTest: true,
        concurrentUsers: 10
      });
      
      expect(testResults.success).toBe(true);
      expect(testResults.results).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle component failures gracefully', async () => {
      // Simulate a component failure
      const originalHandler = integrationSystem.manager.unifiedHandler.getHandlerByType('analyze_architecture');
      
      // Temporarily replace with failing handler
      const failingHandler = {
        handle: async () => { throw new Error('Simulated failure'); },
        getMetadata: () => ({ name: 'Failing Handler' })
      };
      
      integrationSystem.manager.unifiedHandler.registerHandler('analyze_architecture', failingHandler);
      
      const request = {
        type: 'handler',
        handlerType: 'analyze_architecture',
        data: { test: 'data' }
      };

      const result = await integrationSystem.executeIntegration(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      // Restore original handler
      if (originalHandler) {
        integrationSystem.manager.unifiedHandler.registerHandler('analyze_architecture', originalHandler);
      }
    });

    test('should recover from temporary failures', async () => {
      const request = {
        type: 'handler',
        handlerType: 'analyze_architecture',
        data: { test: 'data' }
      };

      // First execution should succeed
      const result1 = await integrationSystem.executeIntegration(request);
      expect(result1.success).toBe(true);
      
      // Second execution should also succeed
      const result2 = await integrationSystem.executeIntegration(request);
      expect(result2.success).toBe(true);
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle concurrent integration requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        type: 'handler',
        handlerType: 'analyze_architecture',
        data: { test: `data_${i}` }
      }));

      const results = await Promise.all(
        requests.map(request => integrationSystem.executeIntegration(request))
      );
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.integrationId).toBeDefined();
      });
    });

    test('should maintain system stability under load', async () => {
      const startTime = Date.now();
      
      const requests = Array.from({ length: 10 }, (_, i) => ({
        type: 'handler',
        handlerType: 'analyze_architecture',
        data: { test: `load_test_${i}` }
      }));

      const results = await Promise.all(
        requests.map(request => integrationSystem.executeIntegration(request))
      );
      
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      expect(results).toHaveLength(10);
      expect(totalDuration).toBeLessThan(30000); // Should complete within 30 seconds
      
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(8); // At least 80% success rate
    });
  });

  describe('Data Persistence', () => {
    test('should persist integration results', async () => {
      const request = {
        type: 'handler',
        handlerType: 'analyze_architecture',
        data: { test: 'persistence_test' }
      };

      const result = await integrationSystem.executeIntegration(request);
      
      // Verify that the result was persisted
      expect(mockDatabase.execute).toHaveBeenCalled();
    });

    test('should retrieve historical metrics', async () => {
      const historicalMetrics = integrationSystem.metrics.getHistoricalMetrics({
        timeRange: 24 * 60 * 60 * 1000, // Last 24 hours
        limit: 10
      });
      
      expect(historicalMetrics.total).toBeGreaterThanOrEqual(0);
      expect(historicalMetrics.metrics).toBeDefined();
    });
  });

  describe('Configuration Management', () => {
    test('should load default configuration', () => {
      const config = utils.createDefaultConfig();
      
      expect(config.manager).toBeDefined();
      expect(config.validator).toBeDefined();
      expect(config.metrics).toBeDefined();
      expect(config.testRunner).toBeDefined();
    });

    test('should validate custom configuration', () => {
      const customConfig = {
        manager: {
          maxConcurrentIntegrations: 20
        },
        validator: {
          maxRequestSize: 2048 * 1024
        }
      };
      
      const validation = utils.validateConfiguration(customConfig);
      
      expect(validation.isValid).toBe(true);
    });

    test('should reject invalid configuration', () => {
      const invalidConfig = {
        manager: {
          maxConcurrentIntegrations: -1 // Invalid value
        }
      };
      
      const validation = utils.validateConfiguration(invalidConfig);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
}); 