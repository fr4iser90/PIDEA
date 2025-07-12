/**
 * System Performance Tests
 * 
 * Tests the performance and scalability of the integration system under various load conditions.
 * This includes stress testing, load testing, and performance benchmarking.
 */

const { expect } = require('chai');
const { createIntegrationSystem } = require('../../../backend/domain/workflows/integration');
const { UnifiedWorkflowHandler } = require('../../../backend/domain/workflows/handlers');
const { HandlerRegistry } = require('../../../backend/domain/workflows/handlers');
const { StepRegistry } = require('../../../backend/domain/workflows/steps');

describe('System Performance Tests', () => {
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

  describe('Handler Performance', () => {
    it('should handle single handler execution efficiently', async () => {
      const request = {
        type: 'analyze',
        subType: 'architecture',
        projectId: 'test-project',
        options: { depth: 'comprehensive' }
      };

      const startTime = Date.now();
      const result = await unifiedHandler.handle(request);
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(result).to.be.an('object');
      expect(result.success).to.be.a('boolean');
      expect(executionTime).to.be.lessThan(5000); // Should complete within 5 seconds
    });

    it('should handle multiple concurrent handler executions', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        type: 'analyze',
        subType: 'architecture',
        projectId: `test-project-${i}`,
        options: { depth: 'basic' }
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map(request => unifiedHandler.handle(request))
      );
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(results).to.be.an('array');
      expect(results.length).to.equal(10);
      results.forEach(result => {
        expect(result).to.be.an('object');
        expect(result.success).to.be.a('boolean');
      });

      // Average time per request should be reasonable
      const averageTime = totalTime / 10;
      expect(averageTime).to.be.lessThan(2000); // Average 2 seconds per request
    });

    it('should handle high load of handler executions', async () => {
      const requests = Array.from({ length: 50 }, (_, i) => ({
        type: 'analyze',
        subType: 'code-quality',
        projectId: `load-test-${i}`,
        options: { depth: 'basic' }
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map(request => unifiedHandler.handle(request))
      );
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(results).to.be.an('array');
      expect(results.length).to.equal(50);
      
      const successCount = results.filter(r => r.success).length;
      const successRate = (successCount / 50) * 100;
      
      expect(successRate).to.be.greaterThan(80); // At least 80% success rate
      expect(totalTime).to.be.lessThan(60000); // Should complete within 1 minute
    });

    it('should maintain performance under sustained load', async () => {
      const iterations = 5;
      const requestsPerIteration = 10;
      const executionTimes = [];

      for (let i = 0; i < iterations; i++) {
        const requests = Array.from({ length: requestsPerIteration }, (_, j) => ({
          type: 'analyze',
          subType: 'dependencies',
          projectId: `sustained-${i}-${j}`,
          options: { depth: 'basic' }
        }));

        const startTime = Date.now();
        await Promise.all(
          requests.map(request => unifiedHandler.handle(request))
        );
        const endTime = Date.now();
        executionTimes.push(endTime - startTime);
      }

      expect(executionTimes).to.be.an('array');
      expect(executionTimes.length).to.equal(iterations);

      // Performance should not degrade significantly
      const firstIteration = executionTimes[0];
      const lastIteration = executionTimes[iterations - 1];
      const degradation = (lastIteration - firstIteration) / firstIteration;

      expect(degradation).to.be.lessThan(0.5); // Less than 50% degradation
    });
  });

  describe('Step Registry Performance', () => {
    it('should retrieve steps efficiently', async () => {
      const steps = stepRegistry.listSteps();
      const iterations = 1000;

      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        const stepName = steps[i % steps.length];
        const step = stepRegistry.getStep(stepName);
        expect(step).to.be.a('function');
      }
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const averageTime = totalTime / iterations;
      expect(averageTime).to.be.lessThan(1); // Less than 1ms per retrieval
    });

    it('should create step instances efficiently', async () => {
      const steps = stepRegistry.listSteps();
      const iterations = 100;

      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        const stepName = steps[i % steps.length];
        const step = stepRegistry.createStep(stepName, {
          projectId: `perf-test-${i}`
        });
        expect(step).to.be.an('object');
      }
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const averageTime = totalTime / iterations;
      expect(averageTime).to.be.lessThan(10); // Less than 10ms per creation
    });

    it('should handle step metadata retrieval efficiently', async () => {
      const steps = stepRegistry.listSteps();
      const iterations = 500;

      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        const stepName = steps[i % steps.length];
        const metadata = stepRegistry.getStepMetadata(stepName);
        expect(metadata).to.be.an('object');
      }
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const averageTime = totalTime / iterations;
      expect(averageTime).to.be.lessThan(2); // Less than 2ms per metadata retrieval
    });
  });

  describe('Handler Registry Performance', () => {
    it('should retrieve handler types efficiently', async () => {
      const iterations = 1000;

      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        const handlerTypes = handlerRegistry.getHandlerTypes();
        expect(handlerTypes).to.be.an('array');
        expect(handlerTypes.length).to.be.greaterThan(0);
      }
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const averageTime = totalTime / iterations;
      expect(averageTime).to.be.lessThan(1); // Less than 1ms per retrieval
    });

    it('should retrieve handler metadata efficiently', async () => {
      const handlerTypes = handlerRegistry.getHandlerTypes();
      const iterations = 500;

      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        const handlerType = handlerTypes[i % handlerTypes.length];
        const metadata = handlerRegistry.getHandlerMetadata(handlerType);
        expect(metadata).to.be.an('object');
      }
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const averageTime = totalTime / iterations;
      expect(averageTime).to.be.lessThan(2); // Less than 2ms per metadata retrieval
    });

    it('should retrieve handler statistics efficiently', async () => {
      const handlerTypes = handlerRegistry.getHandlerTypes();
      const iterations = 500;

      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        const handlerType = handlerTypes[i % handlerTypes.length];
        const statistics = handlerRegistry.getHandlerStatistics(handlerType);
        expect(statistics).to.be.an('object');
      }
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const averageTime = totalTime / iterations;
      expect(averageTime).to.be.lessThan(2); // Less than 2ms per statistics retrieval
    });
  });

  describe('Integration System Performance', () => {
    it('should execute integration requests efficiently', async () => {
      const request = {
        type: 'system',
        components: ['handlers', 'steps'],
        projectId: 'test-project',
        options: { timeout: 30000 }
      };

      const startTime = Date.now();
      const result = await integrationSystem.executeIntegration(request);
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(result).to.be.an('object');
      expect(executionTime).to.be.lessThan(10000); // Should complete within 10 seconds
    });

    it('should handle concurrent integration requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        type: 'handler',
        handler: {
          type: 'analyze',
          subType: 'architecture',
          projectId: `concurrent-${i}`
        },
        options: { timeout: 15000 }
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map(request => integrationSystem.executeIntegration(request))
      );
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(results).to.be.an('array');
      expect(results.length).to.equal(5);
      results.forEach(result => {
        expect(result).to.be.an('object');
      });

      // Should complete faster than sequential execution
      expect(totalTime).to.be.lessThan(30000); // Less than 30 seconds total
    });

    it('should maintain system stability under load', async () => {
      const requests = Array.from({ length: 20 }, (_, i) => ({
        type: 'step',
        step: {
          type: 'analysis',
          options: {
            type: 'code-quality',
            projectId: `stability-${i}`
          }
        },
        options: { timeout: 10000 }
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map(request => integrationSystem.executeIntegration(request))
      );
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(results).to.be.an('array');
      expect(results.length).to.equal(20);

      const successCount = results.filter(r => r.success !== false).length;
      const successRate = (successCount / 20) * 100;

      expect(successRate).to.be.greaterThan(90); // At least 90% success rate
      expect(totalTime).to.be.lessThan(60000); // Should complete within 1 minute
    });
  });

  describe('Memory Usage', () => {
    it('should maintain reasonable memory usage', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Execute multiple requests
      const requests = Array.from({ length: 50 }, (_, i) => ({
        type: 'analyze',
        subType: 'architecture',
        projectId: `memory-test-${i}`,
        options: { depth: 'comprehensive' }
      }));

      await Promise.all(
        requests.map(request => unifiedHandler.handle(request))
      );

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncreaseMB).to.be.lessThan(100);
    });

    it('should not have memory leaks during sustained operation', async () => {
      const memorySnapshots = [];
      const iterations = 10;
      const requestsPerIteration = 10;

      for (let i = 0; i < iterations; i++) {
        const requests = Array.from({ length: requestsPerIteration }, (_, j) => ({
          type: 'analyze',
          subType: 'code-quality',
          projectId: `leak-test-${i}-${j}`,
          options: { depth: 'basic' }
        }));

        await Promise.all(
          requests.map(request => unifiedHandler.handle(request))
        );

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        memorySnapshots.push(process.memoryUsage().heapUsed);
      }

      expect(memorySnapshots).to.be.an('array');
      expect(memorySnapshots.length).to.equal(iterations);

      // Check for consistent memory usage (no significant growth)
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[iterations - 1];
      const growth = (lastSnapshot - firstSnapshot) / firstSnapshot;

      expect(growth).to.be.lessThan(0.5); // Less than 50% growth
    });
  });

  describe('Response Time Benchmarks', () => {
    it('should meet response time requirements for handler execution', async () => {
      const request = {
        type: 'analyze',
        subType: 'architecture',
        projectId: 'benchmark-test',
        options: { depth: 'comprehensive' }
      };

      const startTime = Date.now();
      const result = await unifiedHandler.handle(request);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(result).to.be.an('object');
      expect(responseTime).to.be.lessThan(5000); // Under 5 seconds
    });

    it('should meet response time requirements for step execution', async () => {
      const step = stepRegistry.createStep('analysis', {
        type: 'architecture',
        projectId: 'benchmark-test'
      });

      const startTime = Date.now();
      const result = await step.execute();
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(result).to.be.an('object');
      expect(responseTime).to.be.lessThan(3000); // Under 3 seconds
    });

    it('should meet response time requirements for system integration', async () => {
      const request = {
        type: 'system',
        components: ['handlers', 'steps'],
        projectId: 'benchmark-test',
        options: { timeout: 30000 }
      };

      const startTime = Date.now();
      const result = await integrationSystem.executeIntegration(request);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(result).to.be.an('object');
      expect(responseTime).to.be.lessThan(10000); // Under 10 seconds
    });
  });

  describe('Throughput Testing', () => {
    it('should handle high throughput of simple operations', async () => {
      const operations = Array.from({ length: 100 }, (_, i) => ({
        type: 'analyze',
        subType: 'dependencies',
        projectId: `throughput-${i}`,
        options: { depth: 'basic' }
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        operations.map(operation => unifiedHandler.handle(operation))
      );
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const throughput = operations.length / (totalTime / 1000); // Operations per second

      expect(results).to.be.an('array');
      expect(results.length).to.equal(100);
      expect(throughput).to.be.greaterThan(5); // At least 5 operations per second
    });

    it('should maintain throughput under sustained load', async () => {
      const batches = 5;
      const operationsPerBatch = 20;
      const throughputs = [];

      for (let i = 0; i < batches; i++) {
        const operations = Array.from({ length: operationsPerBatch }, (_, j) => ({
          type: 'analyze',
          subType: 'code-quality',
          projectId: `sustained-${i}-${j}`,
          options: { depth: 'basic' }
        }));

        const startTime = Date.now();
        await Promise.all(
          operations.map(operation => unifiedHandler.handle(operation))
        );
        const endTime = Date.now();
        const batchTime = endTime - startTime;

        const throughput = operationsPerBatch / (batchTime / 1000);
        throughputs.push(throughput);
      }

      expect(throughputs).to.be.an('array');
      expect(throughputs.length).to.equal(batches);

      // Throughput should remain consistent
      const firstThroughput = throughputs[0];
      const lastThroughput = throughputs[batches - 1];
      const throughputDrop = (firstThroughput - lastThroughput) / firstThroughput;

      expect(throughputDrop).to.be.lessThan(0.3); // Less than 30% drop
    });
  });
}); 