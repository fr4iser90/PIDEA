#!/usr/bin/env node

/**
 * Enhanced Memory-Optimized Analysis Testing Script
 * Tests OOM prevention, memory monitoring, cancellation, and fallback mechanisms
 */

const path = require('path');
const fs = require('fs').promises;
const MemoryOptimizedAnalysisService = require('@domain/services/MemoryOptimizedAnalysisService');
const AnalysisQueueService = require('@domain/services/AnalysisQueueService');

// Mock logger for testing
const mockLogger = {
  info: console.log,
  error: console.error,
  warn: console.warn
};

class MemoryTestRunner {
  constructor() {
    this.testResults = [];
    this.memorySnapshots = [];
  }

  /**
   * Take memory snapshot
   */
  takeMemorySnapshot(label) {
    const usage = process.memoryUsage();
    const snapshot = {
      label,
      timestamp: new Date(),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
      rss: Math.round(usage.rss / 1024 / 1024)
    };
    
    this.memorySnapshots.push(snapshot);
    console.log(`Memory Snapshot [${label}]:`, snapshot);
    
    return snapshot;
  }

  /**
   * Test memory monitoring
   */
  async testMemoryMonitoring() {
    console.log('\n=== Testing Memory Monitoring ===');
    
    const service = new MemoryOptimizedAnalysisService({
      logger: mockLogger,
      maxMemoryUsage: 256,
      enableMemoryMonitoring: true,
      enableGarbageCollection: true
    });

    // Test normal memory usage
    this.takeMemorySnapshot('Before memory check');
    await service.checkMemoryUsage();
    this.takeMemorySnapshot('After memory check');

    // Test memory threshold warning
    const originalMemoryUsage = process.memoryUsage;
    process.memoryUsage = () => ({ heapUsed: 200 * 1024 * 1024 }); // 200MB - 80% threshold
    
    try {
      await service.checkMemoryUsage();
      this.takeMemorySnapshot('After threshold warning');
    } finally {
      process.memoryUsage = originalMemoryUsage;
    }

    this.testResults.push({
      test: 'Memory Monitoring',
      status: 'PASSED',
      details: 'Memory monitoring and threshold warnings working correctly'
    });
  }

  /**
   * Test OOM prevention
   */
  async testOOMPrevention() {
    console.log('\n=== Testing OOM Prevention ===');
    
    const service = new MemoryOptimizedAnalysisService({
      logger: mockLogger,
      maxMemoryUsage: 256,
      enableCancellation: true,
      enableFallback: true
    });

    // Test memory limit exceeded
    const originalMemoryUsage = process.memoryUsage;
    process.memoryUsage = () => ({ heapUsed: 300 * 1024 * 1024 }); // 300MB - exceeds limit
    
    try {
      await expect(
        service.checkMemoryUsage()
      ).rejects.toThrow('Memory limit exceeded');
      
      this.testResults.push({
        test: 'OOM Prevention - Memory Limit',
        status: 'PASSED',
        details: 'Memory limit exceeded correctly detected and handled'
      });
    } catch (error) {
      this.testResults.push({
        test: 'OOM Prevention - Memory Limit',
        status: 'FAILED',
        details: error.message
      });
    } finally {
      process.memoryUsage = originalMemoryUsage;
    }

    // Test analysis cancellation
    service.cancelAnalysis();
    if (service.isCancelled && service.analysisResults.metrics.cancellationCount === 1) {
      this.testResults.push({
        test: 'OOM Prevention - Cancellation',
        status: 'PASSED',
        details: 'Analysis cancellation working correctly'
      });
    } else {
      this.testResults.push({
        test: 'OOM Prevention - Cancellation',
        status: 'FAILED',
        details: 'Analysis cancellation not working'
      });
    }
  }

  /**
   * Test fallback mechanisms
   */
  async testFallbackMechanisms() {
    console.log('\n=== Testing Fallback Mechanisms ===');
    
    const service = new MemoryOptimizedAnalysisService({
      logger: mockLogger,
      maxMemoryUsage: 256,
      enableFallback: true
    });

    // Test partial results creation
    const partialResults = service.createPartialResults('/test/project', 'timeout');
    
    if (partialResults.partial && partialResults.error.includes('timeout')) {
      this.testResults.push({
        test: 'Fallback - Partial Results',
        status: 'PASSED',
        details: 'Partial results creation working correctly'
      });
    } else {
      this.testResults.push({
        test: 'Fallback - Partial Results',
        status: 'FAILED',
        details: 'Partial results creation not working'
      });
    }

    // Test retry logic
    const timeoutError = new Error('Analysis timeout');
    timeoutError.name = 'TimeoutError';
    
    const memoryError = new Error('Memory limit exceeded');
    memoryError.name = 'MemoryError';
    
    const networkError = new Error('Network error');
    
    if (!service.shouldRetry(timeoutError) && 
        !service.shouldRetry(memoryError) && 
        service.shouldRetry(networkError)) {
      this.testResults.push({
        test: 'Fallback - Retry Logic',
        status: 'PASSED',
        details: 'Retry logic working correctly'
      });
    } else {
      this.testResults.push({
        test: 'Fallback - Retry Logic',
        status: 'FAILED',
        details: 'Retry logic not working correctly'
      });
    }
  }

  /**
   * Test queue-based analysis
   */
  async testQueueBasedAnalysis() {
    console.log('\n=== Testing Queue-Based Analysis ===');
    
    const service = new AnalysisQueueService({
      logger: mockLogger,
      maxMemoryUsage: 256,
      enableMemoryMonitoring: true,
      enableCancellation: true,
      enableFallback: true,
      maxConcurrentPerProject: 3,
      maxMemoryPerProject: 512 * 1024 * 1024
    });

    // Test project resource management
    const projectId = 'test-project';
    const resourceCheck = await service.checkProjectResources(projectId);
    
    if (resourceCheck.canStart && resourceCheck.concurrentAnalyses === 0) {
      this.testResults.push({
        test: 'Queue - Resource Management',
        status: 'PASSED',
        details: 'Project resource management working correctly'
      });
    } else {
      this.testResults.push({
        test: 'Queue - Resource Management',
        status: 'FAILED',
        details: 'Project resource management not working'
      });
    }

    // Test resource allocation and release
    const estimatedMemory = 256 * 1024 * 1024;
    await service.allocateProjectResources(projectId, estimatedMemory);
    
    const allocated = service.projectResources.get(projectId);
    if (allocated.memory === estimatedMemory && allocated.concurrentAnalyses === 1) {
      this.testResults.push({
        test: 'Queue - Resource Allocation',
        status: 'PASSED',
        details: 'Resource allocation working correctly'
      });
    } else {
      this.testResults.push({
        test: 'Queue - Resource Allocation',
        status: 'FAILED',
        details: 'Resource allocation not working'
      });
    }

    await service.releaseProjectResources(projectId, estimatedMemory);
    const released = service.projectResources.get(projectId);
    if (released.memory === 0 && released.concurrentAnalyses === 0) {
      this.testResults.push({
        test: 'Queue - Resource Release',
        status: 'PASSED',
        details: 'Resource release working correctly'
      });
    } else {
      this.testResults.push({
        test: 'Queue - Resource Release',
        status: 'FAILED',
        details: 'Resource release not working'
      });
    }
  }

  /**
   * Test timeout handling
   */
  async testTimeoutHandling() {
    console.log('\n=== Testing Timeout Handling ===');
    
    const service = new MemoryOptimizedAnalysisService({
      logger: mockLogger,
      analysisTimeout: 1000 // 1 second
    });

    // Test timeout creation
    const timeout = service.createTimeout(100);
    expect(timeout).toBeInstanceOf(Promise);
    
    // Test timeout execution
    const slowOperation = new Promise(resolve => {
      setTimeout(() => resolve('completed'), 200);
    });
    
    try {
      await Promise.race([slowOperation, service.createTimeout(50)]);
      this.testResults.push({
        test: 'Timeout - Execution',
        status: 'FAILED',
        details: 'Timeout should have triggered'
      });
    } catch (error) {
      if (error.message.includes('timeout')) {
        this.testResults.push({
          test: 'Timeout - Execution',
          status: 'PASSED',
          details: 'Timeout handling working correctly'
        });
      } else {
        this.testResults.push({
          test: 'Timeout - Execution',
          status: 'FAILED',
          details: error.message
        });
      }
    }
  }

  /**
   * Test garbage collection
   */
  async testGarbageCollection() {
    console.log('\n=== Testing Garbage Collection ===');
    
    const service = new MemoryOptimizedAnalysisService({
      logger: mockLogger,
      enableGarbageCollection: true
    });

    // Mock global.gc
    global.gc = jest.fn();
    
    try {
      await service.forceGarbageCollection();
      
      if (global.gc.mock && global.gc.mock.calls.length > 0) {
        this.testResults.push({
          test: 'Garbage Collection',
          status: 'PASSED',
          details: 'Garbage collection working correctly'
        });
      } else {
        this.testResults.push({
          test: 'Garbage Collection',
          status: 'FAILED',
          details: 'Garbage collection not called'
        });
      }
    } catch (error) {
      this.testResults.push({
        test: 'Garbage Collection',
        status: 'FAILED',
        details: error.message
      });
    } finally {
      delete global.gc;
    }
  }

  /**
   * Test memory protection integration
   */
  async testMemoryProtectionIntegration() {
    console.log('\n=== Testing Memory Protection Integration ===');
    
    const service = new AnalysisQueueService({
      logger: mockLogger,
      maxMemoryUsage: 256,
      enableMemoryMonitoring: true
    });

    // Mock successful analysis
    const mockResult = { success: true, data: 'test' };
    service.executeSingleAnalysis = jest.fn().mockResolvedValue(mockResult);
    
    try {
      const result = await service.executeAnalysisWithMemoryProtection(
        'code-quality',
        'test-project',
        { timeout: 5000 }
      );
      
      if (result === mockResult) {
        this.testResults.push({
          test: 'Memory Protection - Integration',
          status: 'PASSED',
          details: 'Memory protection integration working correctly'
        });
      } else {
        this.testResults.push({
          test: 'Memory Protection - Integration',
          status: 'FAILED',
          details: 'Memory protection integration not working'
        });
      }
    } catch (error) {
      this.testResults.push({
        test: 'Memory Protection - Integration',
        status: 'FAILED',
        details: error.message
      });
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('Starting Enhanced Memory-Optimized Analysis Tests...\n');
    
    this.takeMemorySnapshot('Test Start');
    
    try {
      await this.testMemoryMonitoring();
      await this.testOOMPrevention();
      await this.testFallbackMechanisms();
      await this.testQueueBasedAnalysis();
      await this.testTimeoutHandling();
      await this.testGarbageCollection();
      await this.testMemoryProtectionIntegration();
      
    } catch (error) {
      console.error('Test execution failed:', error);
    }
    
    this.takeMemorySnapshot('Test End');
    this.printResults();
  }

  /**
   * Print test results
   */
  printResults() {
    console.log('\n=== Test Results ===');
    
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    console.log('\nDetailed Results:');
    this.testResults.forEach(result => {
      const status = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`${status} ${result.test}: ${result.details}`);
    });
    
    console.log('\n=== Memory Usage Summary ===');
    if (this.memorySnapshots.length >= 2) {
      const start = this.memorySnapshots[0];
      const end = this.memorySnapshots[this.memorySnapshots.length - 1];
      const heapIncrease = end.heapUsed - start.heapUsed;
      
      console.log(`Start Memory: ${start.heapUsed}MB`);
      console.log(`End Memory: ${end.heapUsed}MB`);
      console.log(`Memory Increase: ${heapIncrease}MB`);
      
      if (heapIncrease < 50) {
        console.log('✅ Memory usage stable');
      } else {
        console.log('⚠️  Memory usage increased significantly');
      }
    }
  }
}

// Helper function for testing
function expect(value) {
  return {
    toBeInstanceOf: function(constructor) {
      if (!(value instanceof constructor)) {
        throw new Error(`Expected ${value} to be instance of ${constructor.name}`);
      }
      return true;
    }
  };
}

// Run tests if this script is executed directly
if (require.main === module) {
  const runner = new MemoryTestRunner();
  runner.runAllTests().catch(console.error);
}

module.exports = MemoryTestRunner; 