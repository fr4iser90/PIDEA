/**
 * Migration Performance Tests
 * 
 * Tests the performance and scalability of the migration system under various load conditions.
 * This includes stress testing, load testing, and performance benchmarking.
 */

const { expect } = require('chai');
const { createIntegrationSystem } = require('../../../backend/domain/workflows/integration');
const { UnifiedWorkflowHandler } = require('../../../backend/domain/workflows/handlers');
const { HandlerRegistry } = require('../../../backend/domain/workflows/handlers');

describe('Migration Performance Tests', () => {
  let integrationSystem;
  let unifiedHandler;
  let handlerRegistry;

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
  });

  after(async () => {
    await integrationSystem.cleanup();
  });

  describe('Handler Execution Performance', () => {
    it('should execute single handler within performance limits', async () => {
      const startTime = Date.now();
      
      const request = {
        type: 'architecture-analysis',
        projectPath: '/test/project',
        options: { depth: 'comprehensive' }
      };

      const result = await unifiedHandler.handle(request, {}, {});
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result.isSuccess()).to.be.true;
      expect(duration).to.be.lessThan(5000); // Should complete within 5 seconds
      expect(result.getDuration()).to.be.lessThan(5000);
    });

    it('should execute multiple handlers efficiently', async () => {
      const startTime = Date.now();
      
      const requests = [
        { type: 'architecture-analysis', projectPath: '/test/project1' },
        { type: 'code-quality-analysis', projectPath: '/test/project2' },
        { type: 'tech-stack-analysis', projectPath: '/test/project3' },
        { type: 'vibecoder-analyze', projectPath: '/test/project4' },
        { type: 'generate-script', projectPath: '/test/project5' }
      ];

      const promises = requests.map(request => 
        unifiedHandler.handle(request, {}, {})
      );

      const results = await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(results).to.have.length(5);
      results.forEach(result => {
        expect(result.isSuccess()).to.be.true;
      });
      
      // Should complete within 10 seconds for 5 handlers
      expect(duration).to.be.lessThan(10000);
    });

    it('should handle concurrent handler executions efficiently', async () => {
      const concurrentCount = 10;
      const startTime = Date.now();
      
      const requests = Array.from({ length: concurrentCount }, (_, i) => ({
        type: 'architecture-analysis',
        projectPath: `/test/project${i}`,
        options: { depth: 'basic' }
      }));

      const promises = requests.map(request => 
        unifiedHandler.handle(request, {}, {})
      );

      const results = await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(results).to.have.length(concurrentCount);
      results.forEach(result => {
        expect(result.isSuccess()).to.be.true;
      });
      
      // Should complete within 15 seconds for 10 concurrent handlers
      expect(duration).to.be.lessThan(15000);
      
      // Average time per handler should be reasonable
      const averageTime = duration / concurrentCount;
      expect(averageTime).to.be.lessThan(2000); // Less than 2 seconds per handler
    });
  });

  describe('Load Testing', () => {
    it('should handle sustained load without degradation', async () => {
      const iterations = 20;
      const durations = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        const request = {
          type: 'architecture-analysis',
          projectPath: `/test/project${i}`,
          options: { depth: 'basic' }
        };

        const result = await unifiedHandler.handle(request, {}, {});
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        expect(result.isSuccess()).to.be.true;
        durations.push(duration);
      }
      
      // Calculate performance metrics
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);
      
      // Performance should remain consistent
      expect(avgDuration).to.be.lessThan(3000); // Average under 3 seconds
      expect(maxDuration).to.be.lessThan(8000); // Max under 8 seconds
      expect(minDuration).to.be.greaterThan(100); // Min at least 100ms
      
      // Performance should not degrade significantly
      const firstHalf = durations.slice(0, Math.floor(iterations / 2));
      const secondHalf = durations.slice(Math.floor(iterations / 2));
      const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d, 0) / secondHalf.length;
      
      // Second half should not be more than 50% slower than first half
      expect(secondHalfAvg).to.be.lessThan(firstHalfAvg * 1.5);
    });

    it('should handle mixed workload efficiently', async () => {
      const workload = [
        { type: 'architecture-analysis', count: 5 },
        { type: 'code-quality-analysis', count: 5 },
        { type: 'vibecoder-analyze', count: 3 },
        { type: 'generate-script', count: 2 }
      ];
      
      const startTime = Date.now();
      const allPromises = [];
      
      workload.forEach(({ type, count }) => {
        for (let i = 0; i < count; i++) {
          const request = {
            type,
            projectPath: `/test/project_${type}_${i}`,
            options: { depth: 'basic' }
          };
          allPromises.push(unifiedHandler.handle(request, {}, {}));
        }
      });
      
      const results = await Promise.all(allPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(results).to.have.length(15); // Total of all counts
      results.forEach(result => {
        expect(result.isSuccess()).to.be.true;
      });
      
      // Should complete within 20 seconds for mixed workload
      expect(duration).to.be.lessThan(20000);
    });
  });

  describe('Stress Testing', () => {
    it('should handle high concurrent load', async () => {
      const concurrentCount = 25;
      const startTime = Date.now();
      
      const requests = Array.from({ length: concurrentCount }, (_, i) => ({
        type: 'architecture-analysis',
        projectPath: `/test/project${i}`,
        options: { depth: 'basic' }
      }));

      const promises = requests.map(request => 
        unifiedHandler.handle(request, {}, {})
      );

      const results = await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(results).to.have.length(concurrentCount);
      
      // Count successful executions
      const successCount = results.filter(r => r.isSuccess()).length;
      const successRate = successCount / concurrentCount;
      
      // Should maintain high success rate under stress
      expect(successRate).to.be.greaterThan(0.8); // At least 80% success rate
      expect(duration).to.be.lessThan(30000); // Should complete within 30 seconds
    });

    it('should recover from temporary failures', async () => {
      const iterations = 10;
      const results = [];
      
      for (let i = 0; i < iterations; i++) {
        try {
          const request = {
            type: 'architecture-analysis',
            projectPath: `/test/project${i}`,
            options: { depth: 'comprehensive' }
          };

          const result = await unifiedHandler.handle(request, {}, {});
          results.push({ success: result.isSuccess(), error: result.getError() });
        } catch (error) {
          results.push({ success: false, error: error.message });
        }
      }
      
      // Should handle failures gracefully
      const successCount = results.filter(r => r.success).length;
      const successRate = successCount / iterations;
      
      expect(successRate).to.be.greaterThan(0.7); // At least 70% success rate
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should maintain consistent memory usage', async () => {
      const initialMemory = process.memoryUsage();
      
      // Execute multiple handlers
      for (let i = 0; i < 10; i++) {
        const request = {
          type: 'architecture-analysis',
          projectPath: `/test/project${i}`,
          options: { depth: 'basic' }
        };
        
        await unifiedHandler.handle(request, {}, {});
      }
      
      const finalMemory = process.memoryUsage();
      
      // Memory usage should not increase dramatically
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
      
      // Should not increase by more than 50MB
      expect(memoryIncreaseMB).to.be.lessThan(50);
    });

    it('should handle large request payloads efficiently', async () => {
      const largeOptions = {
        depth: 'comprehensive',
        includeAll: true,
        detailedAnalysis: true,
        customConfig: {
          setting1: 'value1'.repeat(100),
          setting2: 'value2'.repeat(100),
          setting3: 'value3'.repeat(100)
        }
      };
      
      const startTime = Date.now();
      
      const request = {
        type: 'architecture-analysis',
        projectPath: '/test/project',
        options: largeOptions
      };

      const result = await unifiedHandler.handle(request, {}, {});
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result.isSuccess()).to.be.true;
      expect(duration).to.be.lessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance benchmarks for analysis handlers', async () => {
      const benchmarks = [
        { type: 'architecture-analysis', maxDuration: 5000 },
        { type: 'code-quality-analysis', maxDuration: 4000 },
        { type: 'tech-stack-analysis', maxDuration: 3000 },
        { type: 'vibecoder-analyze', maxDuration: 6000 },
        { type: 'generate-script', maxDuration: 4000 }
      ];
      
      for (const benchmark of benchmarks) {
        const startTime = Date.now();
        
        const request = {
          type: benchmark.type,
          projectPath: '/test/project',
          options: { depth: 'basic' }
        };

        const result = await unifiedHandler.handle(request, {}, {});
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        expect(result.isSuccess()).to.be.true;
        expect(duration).to.be.lessThan(benchmark.maxDuration);
      }
    });

    it('should maintain performance with different automation levels', async () => {
      const automationLevels = ['basic', 'enhanced', 'full'];
      const durations = {};
      
      for (const level of automationLevels) {
        const startTime = Date.now();
        
        const request = {
          type: 'architecture-analysis',
          projectPath: '/test/project',
          automationLevel: level,
          options: { depth: 'basic' }
        };

        const result = await unifiedHandler.handle(request, {}, {});
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        expect(result.isSuccess()).to.be.true;
        durations[level] = duration;
      }
      
      // Higher automation levels should not be significantly slower
      expect(durations.full).to.be.lessThan(durations.basic * 1.5);
      expect(durations.enhanced).to.be.lessThan(durations.basic * 1.3);
    });
  });

  describe('Scalability Testing', () => {
    it('should scale with handler registry size', async () => {
      const initialCount = handlerRegistry.getHandlerCount();
      
      // Execute handlers multiple times to test registry performance
      const iterations = 50;
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        const handlers = handlerRegistry.listHandlers();
        const randomHandler = handlers[Math.floor(Math.random() * handlers.length)];
        
        const request = {
          type: randomHandler.type,
          projectPath: `/test/project${i}`,
          options: { depth: 'basic' }
        };

        await unifiedHandler.handle(request, {}, {});
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should maintain performance regardless of registry size
      expect(duration).to.be.lessThan(60000); // Should complete within 60 seconds
      
      // Registry size should remain consistent
      const finalCount = handlerRegistry.getHandlerCount();
      expect(finalCount).to.equal(initialCount);
    });

    it('should handle increasing load gracefully', async () => {
      const loadLevels = [5, 10, 15, 20];
      const performanceMetrics = [];
      
      for (const load of loadLevels) {
        const startTime = Date.now();
        
        const requests = Array.from({ length: load }, (_, i) => ({
          type: 'architecture-analysis',
          projectPath: `/test/project${i}`,
          options: { depth: 'basic' }
        }));

        const promises = requests.map(request => 
          unifiedHandler.handle(request, {}, {})
        );

        const results = await Promise.all(promises);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        const successCount = results.filter(r => r.isSuccess()).length;
        const successRate = successCount / load;
        
        performanceMetrics.push({
          load,
          duration,
          successRate,
          averageTime: duration / load
        });
      }
      
      // Performance should scale reasonably
      performanceMetrics.forEach((metric, index) => {
        expect(metric.successRate).to.be.greaterThan(0.8); // At least 80% success rate
        expect(metric.averageTime).to.be.lessThan(3000); // Average under 3 seconds per request
      });
      
      // Performance degradation should be linear, not exponential
      const firstMetric = performanceMetrics[0];
      const lastMetric = performanceMetrics[performanceMetrics.length - 1];
      const loadRatio = lastMetric.load / firstMetric.load;
      const timeRatio = lastMetric.averageTime / firstMetric.averageTime;
      
      // Time increase should not be more than 2x the load increase
      expect(timeRatio).to.be.lessThan(loadRatio * 2);
    });
  });

  describe('Integration Performance', () => {
    it('should execute integration workflows efficiently', async () => {
      const startTime = Date.now();
      
      const result = await integrationSystem.executeIntegration({
        type: 'system',
        components: ['handlers', 'steps', 'validators'],
        projectId: 'performance-test-project',
        options: {
          comprehensive: true,
          timeout: 30000
        }
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result.success).to.be.true;
      expect(duration).to.be.lessThan(30000); // Should complete within 30 seconds
    });

    it('should provide performance metrics efficiently', async () => {
      const startTime = Date.now();
      
      const metrics = await integrationSystem.metrics.getMetrics();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(metrics).to.be.an('object');
      expect(duration).to.be.lessThan(1000); // Should complete within 1 second
    });
  });
}); 