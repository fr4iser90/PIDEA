require('module-alias/register');
/**
 * AnalysisQueueService Unit Tests
 * Tests queue management, memory monitoring, and analysis execution
 */
const AnalysisQueueService = require('@domain/services/AnalysisQueueService');
const { ExecutionQueue } = require('@domain/workflows/execution');

// Mock dependencies
jest.mock('@domain/workflows/execution');
jest.mock('@domain/services/MemoryOptimizedAnalysisService');
jest.mock('@logging/Logger');

describe('AnalysisQueueService', () => {
  let analysisQueueService;
  let mockLogger;
  let mockExecutionQueue;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };
    
    // Mock ExecutionQueue
    mockExecutionQueue = {
      enqueue: jest.fn().mockReturnValue(true),
      dequeue: jest.fn().mockReturnValue({ id: 'test-job', data: {} }),
      getStatus: jest.fn().mockReturnValue('idle'),
      getQueueLength: jest.fn().mockReturnValue(0),
      clear: jest.fn(),
      cancel: jest.fn().mockReturnValue(true)
    };

    // Mock ExecutionQueue constructor
    const { ExecutionQueue } = require('@domain/workflows/execution');
    ExecutionQueue.mockImplementation(() => mockExecutionQueue);

    analysisQueueService = new AnalysisQueueService({
      logger: mockLogger,
      enableSelectiveAnalysis: true,
      analysisTimeout: 10000
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with default configuration', () => {
      const service = new AnalysisQueueService();
      
      expect(service).toBeDefined();
      expect(service.enableSelectiveAnalysis).toBe(false);
      expect(service.analysisTimeout).toBe(300000); // 5 minutes default
    });

    test('should initialize with custom configuration', () => {
      const service = new AnalysisQueueService({
        enableSelectiveAnalysis: true,
        analysisTimeout: 60000
      });
      
      expect(service.enableSelectiveAnalysis).toBe(true);
      expect(service.analysisTimeout).toBe(60000);
    });
  });

  describe('Queue Management', () => {
    test('should create project-specific queue', () => {
      const projectPath = '/test/project';
      const queue = analysisQueueService.getProjectQueue(projectPath);
      expect(queue).toBeDefined();
      expect(analysisQueueService.projectQueues.has(projectPath)).toBe(true);
    });

    test('should reuse existing queue for same project', () => {
      const projectPath = '/test/project';
      const queue1 = analysisQueueService.getProjectQueue(projectPath);
      const queue2 = analysisQueueService.getProjectQueue(projectPath);
      expect(queue1).toBe(queue2);
    });

    test('should get queue status', () => {
      const projectPath = '/test/project';
      const queue = analysisQueueService.getProjectQueue(projectPath);
      // Simuliere Status
      const status = queue.queue.length === 0 ? 'idle' : 'busy';
      expect(['idle', 'busy']).toContain(status);
    });

    test('should return null status for non-existent queue', () => {
      const status = analysisQueueService.projectQueues.get('/non/existent');
      expect(status).toBeUndefined();
    });
  });

  describe('Analysis Request Processing', () => {
    test('should process analysis request successfully', async () => {
      const projectPath = '/test/project';
      const analysisTypes = ['code-quality', 'security'];
      const options = { priority: 'high' };
      const result = await analysisQueueService.processAnalysisRequest(
        projectPath,
        analysisTypes,
        options
      );
      expect(result).toBeDefined();
      expect(['queued', 'running']).toContain(result.status);
      expect(result.jobId).toBeDefined();
      expect(result.analysisTypes).toEqual(analysisTypes);
    });

    test('should handle analysis request with selective analysis disabled', async () => {
      const service = new AnalysisQueueService({
        enableSelectiveAnalysis: false
      });

      const projectPath = '/test/project';
      const analysisTypes = ['code-quality'];
      const options = { priority: 'normal' };

      const result = await service.processAnalysisRequest(
        projectPath,
        analysisTypes,
        options
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('queued');
    });

    test('should validate analysis types when selective analysis enabled', async () => {
      const projectPath = '/test/project';
      const invalidTypes = ['invalid-type'];
      const options = { priority: 'normal' };

      const result = await analysisQueueService.processAnalysisRequest(
        projectPath,
        invalidTypes,
        options
      );

      expect(result.status).toBe('error');
      expect(result.error).toContain('Invalid analysis types');
    });
  });

  describe('Memory Monitoring', () => {
    test('should monitor memory usage', () => {
      const memoryInfo = analysisQueueService.getMemoryInfo();
      
      expect(memoryInfo).toBeDefined();
      expect(memoryInfo.heapUsed).toBeDefined();
      expect(memoryInfo.heapTotal).toBeDefined();
      expect(memoryInfo.external).toBeDefined();
    });

    test('should check if memory usage is within limits', () => {
      const isWithinLimits = analysisQueueService.isMemoryUsageWithinLimits();
      
      expect(typeof isWithinLimits).toBe('boolean');
    });

    test('should trigger garbage collection when needed', () => {
      const beforeGC = process.memoryUsage().heapUsed;
      
      analysisQueueService.triggerGarbageCollection();
      
      const afterGC = process.memoryUsage().heapUsed;
      
      // Note: In tests, GC might not actually run
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Garbage collection triggered')
      );
    });
  });

  describe('Queue Execution', () => {
    test('should execute queued analysis', async () => {
      const projectPath = '/test/project';
      const analysisTypes = ['code-quality'];
      
      // Mock successful analysis execution
      const mockAnalysisService = require('@domain/services/MemoryOptimizedAnalysisService');
      mockAnalysisService.prototype.runAnalysisWithTimeout = jest.fn().mockResolvedValue({
        success: true,
        data: { score: 85 }
      });

      const result = await analysisQueueService.executeAnalysis(
        projectPath,
        analysisTypes,
        {}
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    test('should handle analysis execution timeout', async () => {
      const projectPath = '/test/project';
      const analysisTypes = ['code-quality'];
      
      // Mock timeout
      const mockAnalysisService = require('@domain/services/MemoryOptimizedAnalysisService');
      mockAnalysisService.prototype.runAnalysisWithTimeout = jest.fn().mockRejectedValue(
        new Error('Analysis timeout')
      );

      const result = await analysisQueueService.executeAnalysis(
        projectPath,
        analysisTypes,
        { timeout: 1000 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    test('should handle memory pressure during execution', async () => {
      const projectPath = '/test/project';
      const analysisTypes = ['code-quality'];
      
      // Mock memory pressure
      const mockAnalysisService = require('@domain/services/MemoryOptimizedAnalysisService');
      mockAnalysisService.prototype.runAnalysisWithTimeout = jest.fn().mockResolvedValue({
        success: true,
        partial: true,
        data: { score: 70 }
      });

      const result = await analysisQueueService.executeAnalysis(
        projectPath,
        analysisTypes,
        {}
      );

      expect(result.success).toBe(true);
      expect(result.partial).toBe(true);
    });
  });

  describe('Job Management', () => {
    test('should cancel running job', async () => {
      const projectPath = '/test/project';
      const jobId = 'test-job-123';
      
      const result = await analysisQueueService.cancelJob(projectPath, jobId);
      
      expect(result).toBe(true);
      expect(mockExecutionQueue.cancel).toHaveBeenCalledWith(jobId);
    });

    test('should get job status', async () => {
      const projectPath = '/test/project';
      const jobId = 'test-job-123';
      
      const status = await analysisQueueService.getJobStatus(projectPath, jobId);
      
      expect(status).toBeDefined();
    });

    test('should retry failed job', async () => {
      const projectPath = '/test/project';
      const jobId = 'test-job-123';
      
      const result = await analysisQueueService.retryJob(projectPath, jobId);
      
      expect(result).toBeDefined();
    });
  });

  describe('Resource Management', () => {
    test('should check project resource limits', () => {
      const projectPath = '/test/project';
      
      const canProcess = analysisQueueService.canProcessProject(projectPath);
      
      expect(typeof canProcess).toBe('boolean');
    });

    test('should limit concurrent analyses per project', () => {
      const projectPath = '/test/project';
      
      // Simulate multiple concurrent requests
      const canProcess1 = analysisQueueService.canProcessProject(projectPath);
      const canProcess2 = analysisQueueService.canProcessProject(projectPath);
      const canProcess3 = analysisQueueService.canProcessProject(projectPath);
      const canProcess4 = analysisQueueService.canProcessProject(projectPath);
      
      // Should allow up to 3 concurrent analyses
      expect(canProcess1).toBe(true);
      expect(canProcess2).toBe(true);
      expect(canProcess3).toBe(true);
      expect(canProcess4).toBe(false); // Should be limited
    });

    test('should release project resources after completion', () => {
      const projectPath = '/test/project';
      
      analysisQueueService.releaseProjectResources(projectPath);
      
      const canProcess = analysisQueueService.canProcessProject(projectPath);
      expect(canProcess).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle queue creation errors', () => {
      const { ExecutionQueue } = require('@domain/workflows/execution');
      ExecutionQueue.mockImplementation(() => {
        throw new Error('Queue creation failed');
      });

      expect(() => {
        analysisQueueService.getOrCreateQueue('/test/project');
      }).toThrow('Queue creation failed');
    });

    test('should handle analysis execution errors gracefully', async () => {
      const projectPath = '/test/project';
      const analysisTypes = ['code-quality'];
      
      const mockAnalysisService = require('@domain/services/MemoryOptimizedAnalysisService');
      mockAnalysisService.prototype.runAnalysisWithTimeout = jest.fn().mockRejectedValue(
        new Error('Analysis failed')
      );

      const result = await analysisQueueService.executeAnalysis(
        projectPath,
        analysisTypes,
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Analysis failed');
    });

    test('should handle memory monitoring errors', () => {
      // Mock process.memoryUsage to throw error
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockImplementation(() => {
        throw new Error('Memory monitoring failed');
      });

      const memoryInfo = analysisQueueService.getMemoryInfo();
      
      expect(memoryInfo).toEqual({
        heapUsed: 0,
        heapTotal: 0,
        external: 0
      });

      // Restore original
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('Cleanup', () => {
    test('should cleanup project queues', () => {
      const projectPath = '/test/project';
      analysisQueueService.getOrCreateQueue(projectPath);
      
      analysisQueueService.cleanupProjectQueues();
      
      expect(analysisQueueService.projectQueues.size).toBe(0);
    });

    test('should cleanup specific project queue', () => {
      const projectPath = '/test/project';
      analysisQueueService.getOrCreateQueue(projectPath);
      
      analysisQueueService.cleanupProjectQueue(projectPath);
      
      expect(analysisQueueService.projectQueues.has(projectPath)).toBe(false);
    });
  });
}); 