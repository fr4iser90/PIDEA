/**
 * Tests for Optimization and Resource Management Components
 */
const {
  WorkflowOptimizer,
  ResourceManager,
  ExecutionCache,
  ExecutionMetrics,
  ExecutionPredictor,
  StepOptimizer,
  WorkflowAnalyzer,
  ResourceAllocator,
  ResourceMonitor
} = require('@workflows/execution');

describe('Optimization and Resource Management Components', () => {
  let workflowOptimizer, resourceManager, executionCache, executionMetrics, executionPredictor;
  let stepOptimizer, workflowAnalyzer, resourceAllocator, resourceMonitor;

  beforeEach(() => {
    // Initialize components with test configuration
    workflowOptimizer = new WorkflowOptimizer({
      enableOptimization: true,
      enableCaching: true,
      enableLearning: true
    });

    resourceManager = new ResourceManager({
      maxMemoryUsage: 512,
      maxCpuUsage: 80,
      maxConcurrentExecutions: 5,
      enableResourceMonitoring: true
    });

    executionCache = new ExecutionCache({
      enableCaching: true,
      maxSize: 100,
      ttl: 3600000
    });

    executionMetrics = new ExecutionMetrics({
      enableMetrics: true,
      enableRealTimeMetrics: true
    });

    executionPredictor = new ExecutionPredictor({
      enablePrediction: true
    });

    stepOptimizer = new StepOptimizer({
      enableStepOptimization: true,
      enableLearning: true
    });

    workflowAnalyzer = new WorkflowAnalyzer({
      enableAnalysis: true,
      enableLearning: true
    });

    resourceAllocator = new ResourceAllocator({
      enableAllocation: true,
      maxMemoryUsage: 512,
      maxCpuUsage: 80,
      maxConcurrentExecutions: 5
    });

    resourceMonitor = new ResourceMonitor({
      enableMonitoring: true,
      monitoringInterval: 5000
    });
  });

  afterEach(async () => {
    // Cleanup
    await workflowOptimizer.shutdown();
    await resourceManager.shutdown();
    executionCache.shutdown();
    executionMetrics.shutdown();
    executionPredictor.shutdown();
    stepOptimizer.shutdown();
    workflowAnalyzer.shutdown();
    await resourceAllocator.shutdown();
    resourceMonitor.shutdown();
  });

  describe('WorkflowOptimizer', () => {
    it('should initialize correctly', () => {
      expect(workflowOptimizer).toBeDefined();
      expect(workflowOptimizer.optimizationRules).toBeDefined();
      expect(workflowOptimizer.optimizationCache).toBeDefined();
    });

    it('should get optimization statistics', () => {
      const stats = workflowOptimizer.getOptimizationStatistics();
      expect(stats).toBeDefined();
      expect(stats.cacheSize).toBeDefined();
      expect(stats.rulesCount).toBeDefined();
      expect(stats.enabled).toBe(true);
    });

    it('should clear cache', () => {
      workflowOptimizer.clearCache();
      const stats = workflowOptimizer.getOptimizationStatistics();
      expect(stats.cacheSize).toBe(0);
    });
  });

  describe('ResourceManager', () => {
    it('should initialize correctly', () => {
      expect(resourceManager).toBeDefined();
      expect(resourceManager.allocatedResources).toBeDefined();
      expect(resourceManager.resourceLimits).toBeDefined();
    });

    it('should allocate resources', async () => {
      const requirements = { memory: 64, cpu: 10 };
      const allocation = await resourceManager.allocateResources('test-execution', requirements);
      
      expect(allocation).toBeDefined();
      expect(allocation.executionId).toBe('test-execution');
      expect(allocation.memory).toBe(64);
      expect(allocation.cpu).toBe(10);
    });

    it('should release resources', async () => {
      const requirements = { memory: 64, cpu: 10 };
      await resourceManager.allocateResources('test-execution', requirements);
      
      const released = await resourceManager.releaseResources('test-execution');
      expect(released).toBe(true);
    });

    it('should get resource statistics', async () => {
      const stats = await resourceManager.getResourceStatistics();
      expect(stats).toBeDefined();
      expect(stats.utilization).toBeDefined();
      expect(stats.allocations).toBeDefined();
    });
  });

  describe('ExecutionCache', () => {
    it('should initialize correctly', () => {
      expect(executionCache).toBeDefined();
      expect(executionCache.cache).toBeDefined();
      expect(executionCache.cacheStats).toBeDefined();
    });

    it('should get cache statistics', () => {
      const stats = executionCache.getStatistics();
      expect(stats).toBeDefined();
      expect(stats.size).toBeDefined();
      expect(stats.hitRate).toBeDefined();
      expect(stats.enabled).toBe(true);
    });

    it('should clear cache', () => {
      executionCache.clear();
      const stats = executionCache.getStatistics();
      expect(stats.size).toBe(0);
    });
  });

  describe('ExecutionMetrics', () => {
    it('should initialize correctly', () => {
      expect(executionMetrics).toBeDefined();
      expect(executionMetrics.executionMetrics).toBeDefined();
      expect(executionMetrics.aggregatedMetrics).toBeDefined();
    });

    it('should record execution start', () => {
      executionMetrics.recordExecutionStart('test-execution', { name: 'test-workflow' });
      const metrics = executionMetrics.getExecutionMetrics('test-execution');
      expect(metrics).toBeDefined();
      expect(metrics.executionId).toBe('test-execution');
    });

    it('should record execution end', () => {
      executionMetrics.recordExecutionStart('test-execution', { name: 'test-workflow' });
      
      // Simulate some execution time
      setTimeout(() => {}, 10);
      
      executionMetrics.recordExecutionEnd('test-execution', { success: true });
      
      const metrics = executionMetrics.getExecutionMetrics('test-execution');
      expect(metrics.status).toBe('completed');
      expect(metrics.duration).toBeGreaterThan(0);
    });

    it('should get metrics summary', () => {
      const summary = executionMetrics.getMetricsSummary();
      expect(summary).toBeDefined();
      expect(summary.aggregated).toBeDefined();
      expect(summary.realTime).toBeDefined();
    });
  });

  describe('ExecutionPredictor', () => {
    it('should initialize correctly', () => {
      expect(executionPredictor).toBeDefined();
      expect(executionPredictor.predictionModels).toBeDefined();
      expect(executionPredictor.executionHistory).toBeDefined();
    });

    it('should get prediction statistics', () => {
      const stats = executionPredictor.getPredictionStatistics();
      expect(stats).toBeDefined();
      expect(stats.totalPredictions).toBeDefined();
      expect(stats.enabled).toBe(true);
    });

    it('should clear prediction data', () => {
      executionPredictor.clearPredictionData();
      const stats = executionPredictor.getPredictionStatistics();
      expect(stats.totalPredictions).toBe(0);
    });
  });

  describe('StepOptimizer', () => {
    it('should initialize correctly', () => {
      expect(stepOptimizer).toBeDefined();
      expect(stepOptimizer.optimizationRules).toBeDefined();
      expect(stepOptimizer.stepCache).toBeDefined();
    });

    it('should get optimization statistics', () => {
      const stats = stepOptimizer.getOptimizationStatistics();
      expect(stats).toBeDefined();
      expect(stats.cacheSize).toBeDefined();
      expect(stats.rulesCount).toBeDefined();
      expect(stats.enabled).toBe(true);
    });
  });

  describe('WorkflowAnalyzer', () => {
    it('should initialize correctly', () => {
      expect(workflowAnalyzer).toBeDefined();
      expect(workflowAnalyzer.analysisRules).toBeDefined();
      expect(workflowAnalyzer.analysisCache).toBeDefined();
    });

    it('should get analysis statistics', () => {
      const stats = workflowAnalyzer.getAnalysisStatistics();
      expect(stats).toBeDefined();
      expect(stats.cacheSize).toBeDefined();
      expect(stats.rulesCount).toBeDefined();
      expect(stats.enabled).toBe(true);
    });
  });

  describe('ResourceAllocator', () => {
    it('should initialize correctly', () => {
      expect(resourceAllocator).toBeDefined();
      expect(resourceAllocator.allocationStrategies).toBeDefined();
      expect(resourceAllocator.allocatedResources).toBeDefined();
    });

    it('should get allocation statistics', () => {
      const stats = resourceAllocator.getAllocationStatistics();
      expect(stats).toBeDefined();
      expect(stats.available).toBeDefined();
      expect(stats.totalAllocated).toBeDefined();
      expect(stats.enabled).toBe(true);
    });
  });

  describe('ResourceMonitor', () => {
    it('should initialize correctly', () => {
      expect(resourceMonitor).toBeDefined();
      expect(resourceMonitor.alertThresholds).toBeDefined();
      expect(resourceMonitor.monitoringHistory).toBeDefined();
    });

    it('should start and stop monitoring', () => {
      resourceMonitor.startMonitoring();
      expect(resourceMonitor.isMonitoring).toBe(true);
      
      resourceMonitor.stopMonitoring();
      expect(resourceMonitor.isMonitoring).toBe(false);
    });

    it('should get monitoring statistics', () => {
      const stats = resourceMonitor.getMonitoringStatistics();
      expect(stats).toBeDefined();
      expect(stats.isMonitoring).toBeDefined();
      expect(stats.snapshotsCount).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should work together in a basic workflow', async () => {
      // Create a mock workflow
      const mockWorkflow = {
        getMetadata: () => ({
          name: 'test-workflow',
          version: '1.0.0',
          steps: [
            {
              getMetadata: () => ({
                name: 'step1',
                type: 'setup',
                parameters: { timeout: 30000 }
              })
            },
            {
              getMetadata: () => ({
                name: 'step2',
                type: 'processing',
                parameters: { batchSize: 100 }
              })
            }
          ]
        })
      };

      const mockContext = {
        getData: (key) => key === 'projectId' ? 'test-project' : null,
        setData: (key, value) => {},
        getAll: () => ({ projectId: 'test-project' })
      };

      // Test workflow optimization
      const optimizedWorkflow = await workflowOptimizer.optimizeWorkflow(mockWorkflow, mockContext);
      expect(optimizedWorkflow).toBeDefined();

      // Test resource allocation
      const requirements = { memory: 64, cpu: 10 };
      const allocation = await resourceManager.allocateResources('test-execution', requirements);
      expect(allocation).toBeDefined();

      // Test execution prediction
      const prediction = await executionPredictor.predictExecutionTime(mockWorkflow, mockContext);
      expect(prediction).toBeDefined();
      expect(prediction.executionTime).toBeDefined();

      // Test workflow analysis
      const analysis = await workflowAnalyzer.analyzeWorkflow(mockWorkflow, mockContext);
      expect(analysis).toBeDefined();
      expect(analysis.recommendations).toBeDefined();

      // Cleanup
      await resourceManager.releaseResources('test-execution');
    });
  });
}); 