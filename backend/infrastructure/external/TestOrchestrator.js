/**
 * TestOrchestrator - Orchestrates test-related operations
 * Manages test analysis, coverage analysis, test fixing, and test generation
 */

const ServiceLogger = require('@logging/ServiceLogger');

class TestOrchestrator {
  constructor(dependencies = {}) {
    this.stepRegistry = dependencies.stepRegistry || { getStep: () => null };
    this.eventBus = dependencies.eventBus || { emit: () => {} };
    this.logger = dependencies.logger || new ServiceLogger('TestOrchestrator');
    this.testRepository = dependencies.testRepository || { save: () => Promise.resolve() };
    
    // Test status tracking
    this.activeTests = new Map();
    this.testCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Step mapping for test operations
    this.testStepMapping = {
      'test-analysis': 'TestingStep',
      'test-generation': 'TestingStep',
      'test-fixing': 'TestingStep',
      'coverage-analysis': 'TestingStep',
      'auto-test-fix': 'TestingStep',
      'run-unit-tests': 'run_unit_tests',
      'project-test': 'project_test_step',
      'project-build': 'project_build_step',
      'project-health-check': 'project_health_check_step'
    };
    
    this.logger.info('✅ TestOrchestrator initialized (Step delegation)');
  }

  /**
   * Execute a single test operation
   */
  async executeTest(testType, projectPath, options = {}) {
    const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      this.logger.info(`🧪 Starting test execution: ${testType}`, { testId, projectPath });
      
      // Track active test
      this.activeTests.set(testId, {
        id: testId,
        type: testType,
        status: 'running',
        startTime: Date.now(),
        projectPath,
        options
      });

      // Emit test started event
      this.eventBus.emit('test.started', { testId, type: testType, projectPath });

      // Execute test via step delegation
      const result = await this.executeStepTest(testType, projectPath, options);

      // Update test status
      const testInfo = this.activeTests.get(testId);
      if (testInfo) {
        testInfo.status = 'completed';
        testInfo.endTime = Date.now();
        testInfo.duration = testInfo.endTime - testInfo.startTime;
        testInfo.result = result;
      }

      // Cache result
      this.testCache.set(testId, {
        result,
        timestamp: Date.now()
      });

      // Emit test completed event
      this.eventBus.emit('test.completed', { testId, type: testType, result });

      this.logger.info(`✅ Test completed: ${testType}`, { testId, duration: testInfo?.duration });
      
      return {
        id: testId,
        type: testType,
        success: true,
        result,
        metadata: {
          startTime: testInfo?.startTime,
          endTime: testInfo?.endTime,
          duration: testInfo?.duration
        }
      };

    } catch (error) {
      this.logger.error(`❌ Test failed: ${testType}`, { testId, error: error.message });
      
      // Update test status
      const testInfo = this.activeTests.get(testId);
      if (testInfo) {
        testInfo.status = 'failed';
        testInfo.endTime = Date.now();
        testInfo.error = error.message;
      }

      // Emit test failed event
      this.eventBus.emit('test.failed', { testId, type: testType, error: error.message });

      return {
        id: testId,
        type: testType,
        success: false,
        error: error.message,
        metadata: {
          startTime: testInfo?.startTime,
          endTime: testInfo?.endTime
        }
      };
    }
  }

  /**
   * Execute multiple test operations
   */
  async executeMultipleTests(tests, projectPath, options = {}) {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.logger.info(`🧪 Starting batch test execution`, { batchId, testCount: tests.length });
    
    const results = [];
    const parallel = options.parallel !== false;
    
    if (parallel) {
      // Execute tests in parallel
      const promises = tests.map(testType => 
        this.executeTest(testType, projectPath, options)
      );
      results.push(...await Promise.all(promises));
    } else {
      // Execute tests sequentially
      for (const testType of tests) {
        const result = await this.executeTest(testType, projectPath, options);
        results.push(result);
      }
    }

    // Aggregate results
    const aggregatedResult = this.aggregateTestResults(results);
    
    this.logger.info(`✅ Batch test execution completed`, { 
      batchId, 
      totalTests: tests.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

    return {
      batchId,
      tests: results,
      summary: aggregatedResult,
      metadata: {
        totalTests: tests.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        parallel
      }
    };
  }

  /**
   * Execute test via step delegation
   */
  async executeStepTest(testType, projectPath, options = {}) {
    const stepName = this.testStepMapping[testType];
    
    if (!stepName) {
      throw new Error(`Unknown test type: ${testType}`);
    }

    const step = this.stepRegistry.getStep('testing', stepName);
    
    if (!step) {
      throw new Error(`Test step not found: ${stepName}`);
    }

    // Prepare context for step execution
    const context = {
      projectPath,
      testType,
      ...options,
      getService: (serviceName) => {
        // Provide access to services via dependency injection
        return this.stepRegistry.serviceRegistry?.getService(serviceName);
      }
    };

    // Execute the step
    const stepResult = await step.execute(context);
    
    if (!stepResult.success) {
      throw new Error(`Test step execution failed: ${stepResult.error}`);
    }

    return stepResult.results || stepResult.result;
  }

  /**
   * Get test status
   */
  getTestStatus(testId) {
    const test = this.activeTests.get(testId);
    if (!test) {
      return { status: 'not_found' };
    }
    
    return {
      id: test.id,
      type: test.type,
      status: test.status,
      startTime: test.startTime,
      endTime: test.endTime,
      duration: test.duration,
      error: test.error
    };
  }

  /**
   * Retry failed test
   */
  async retryTest(testId) {
    const test = this.activeTests.get(testId);
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    if (test.status !== 'failed') {
      throw new Error(`Test is not in failed state: ${test.status}`);
    }

    this.logger.info(`🔄 Retrying test: ${test.type}`, { testId });
    
    // Remove from active tests
    this.activeTests.delete(testId);
    
    // Retry with same parameters
    return await this.executeTest(test.type, test.projectPath, test.options);
  }

  /**
   * Get cached test result
   */
  getCachedResult(testId) {
    const cached = this.testCache.get(testId);
    if (!cached) {
      return null;
    }

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.testCache.delete(testId);
      return null;
    }

    return cached.result;
  }

  /**
   * Clear test cache
   */
  clearCache(testId = null) {
    if (testId) {
      this.testCache.delete(testId);
      this.logger.info(`🗑️ Cleared cache for test: ${testId}`);
    } else {
      this.testCache.clear();
      this.logger.info(`🗑️ Cleared all test cache`);
    }
  }

  /**
   * Aggregate test results
   */
  aggregateTestResults(results) {
    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalDuration: 0,
      averageDuration: 0,
      testTypes: {},
      errors: []
    };

    for (const result of results) {
      summary.totalDuration += result.metadata?.duration || 0;
      
      if (!summary.testTypes[result.type]) {
        summary.testTypes[result.type] = { count: 0, successful: 0, failed: 0 };
      }
      
      summary.testTypes[result.type].count++;
      
      if (result.success) {
        summary.testTypes[result.type].successful++;
      } else {
        summary.testTypes[result.type].failed++;
        summary.errors.push({
          type: result.type,
          error: result.error
        });
      }
    }

    summary.averageDuration = summary.total > 0 ? summary.totalDuration / summary.total : 0;

    return summary;
  }

  /**
   * Get orchestrator statistics
   */
  getStats() {
    const activeTests = Array.from(this.activeTests.values());
    const cachedTests = Array.from(this.testCache.keys());
    
    return {
      activeTests: activeTests.length,
      cachedTests: cachedTests.length,
      testTypes: Object.keys(this.testStepMapping),
      cacheTimeout: this.cacheTimeout,
      activeTestTypes: activeTests.map(t => t.type),
      cachedTestIds: cachedTests
    };
  }

  /**
   * Stop all active tests
   */
  async stopAllTests() {
    this.logger.info(`🛑 Stopping all active tests`, { count: this.activeTests.size });
    
    const activeTests = Array.from(this.activeTests.values());
    
    for (const test of activeTests) {
      test.status = 'stopped';
      test.endTime = Date.now();
      test.duration = test.endTime - test.startTime;
      
      this.eventBus.emit('test.stopped', { 
        testId: test.id, 
        type: test.type,
        reason: 'orchestrator_stop'
      });
    }
    
    this.activeTests.clear();
    
    this.logger.info(`✅ All tests stopped`);
  }
}

module.exports = TestOrchestrator; 