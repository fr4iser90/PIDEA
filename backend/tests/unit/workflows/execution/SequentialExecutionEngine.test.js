/**
 * Unit tests for SequentialExecutionEngine
 */
const SequentialExecutionEngine = require('@/domain/workflows/execution/SequentialExecutionEngine');
const ExecutionContext = require('@/domain/workflows/execution/ExecutionContext');
const ExecutionResult = require('@/domain/workflows/execution/ExecutionResult');
const { ExecutionException } = require('@/domain/workflows/execution/exceptions/ExecutionException');

describe('SequentialExecutionEngine', () => {
  let executionEngine;
  let mockWorkflow;
  let mockContext;

  beforeEach(() => {
    executionEngine = new SequentialExecutionEngine({
      logger: console,
      enablePriority: true,
      enableRetry: true
    });

    // Mock workflow
    mockWorkflow = {
      getMetadata: () => ({
        id: 'test-workflow-1',
        name: 'Test Workflow',
        type: 'test',
        steps: []
      }),
      getType: () => 'test',
      getVersion: () => '1.0.0',
      getDependencies: () => [],
      getSteps: () => [],
      execute: jest.fn().mockResolvedValue({ success: true, result: 'test result' }),
      validate: jest.fn().mockResolvedValue({ isValid: true }),
      canExecute: jest.fn().mockResolvedValue(true),
      rollback: jest.fn().mockResolvedValue({ success: true })
    };

    // Mock context
    mockContext = {
      setData: jest.fn(),
      getData: jest.fn(),
      getAllData: jest.fn().mockReturnValue({}),
      getState: jest.fn().mockReturnValue({ status: 'initialized' }),
      setState: jest.fn(),
      getMetadata: jest.fn().mockReturnValue({}),
      setMetadata: jest.fn(),
      getWorkflowId: jest.fn().mockReturnValue('test-workflow-1'),
      getWorkflowType: jest.fn().mockReturnValue('test'),
      getWorkflowVersion: jest.fn().mockReturnValue('1.0.0'),
      getDependencies: jest.fn().mockReturnValue([]),
      addDependency: jest.fn(),
      removeDependency: jest.fn(),
      getMetrics: jest.fn().mockReturnValue({}),
      setMetric: jest.fn(),
      getMetric: jest.fn(),
      incrementMetric: jest.fn(),
      getLogs: jest.fn().mockReturnValue([]),
      addLog: jest.fn(),
      clearLogs: jest.fn(),
      getExecutionHistory: jest.fn().mockReturnValue([]),
      addExecutionHistory: jest.fn(),
      isCompleted: jest.fn().mockReturnValue(false),
      isFailed: jest.fn().mockReturnValue(false),
      isCancelled: jest.fn().mockReturnValue(false),
      getResult: jest.fn(),
      setResult: jest.fn(),
      getError: jest.fn(),
      setError: jest.fn(),
      getLogsByLevel: jest.fn().mockReturnValue([]),
      getRecentLogs: jest.fn().mockReturnValue([]),
      getLogsInRange: jest.fn().mockReturnValue([]),
      getExecutionHistoryByAction: jest.fn().mockReturnValue([]),
      getRecentExecutionHistory: jest.fn().mockReturnValue([]),
      hasMetric: jest.fn().mockReturnValue(false),
      removeMetric: jest.fn(),
      decrementMetric: jest.fn(),
      transitionTo: jest.fn(),
      setMetadataData: jest.fn(),
      getMetadataData: jest.fn(),
      hasMetadataData: jest.fn(),
      addMetadataTag: jest.fn(),
      removeMetadataTag: jest.fn(),
      hasMetadataTag: jest.fn(),
      setMetadataLabel: jest.fn(),
      getMetadataLabel: jest.fn(),
      hasMetadataLabel: jest.fn(),
      validate: jest.fn().mockResolvedValue({ isValid: true }),
      getDuration: jest.fn().mockReturnValue(1000),
      getFormattedDuration: jest.fn().mockReturnValue('1s'),
      getSummary: jest.fn().mockReturnValue({}),
      toJSON: jest.fn().mockReturnValue({}),
      static: {
        fromJSON: jest.fn(),
        create: jest.fn(),
        createWithData: jest.fn(),
        createWithState: jest.fn(),
        createWithMetadata: jest.fn()
      }
    };
  });

  describe('constructor', () => {
    it('should create execution engine with default options', () => {
      const engine = new SequentialExecutionEngine();
      expect(engine.maxQueueSize).toBe(50);
      expect(engine.executionTimeout).toBe(300000);
      expect(engine.retryAttempts).toBe(2);
    });

    it('should create execution engine with custom options', () => {
      const engine = new SequentialExecutionEngine({
        maxQueueSize: 100,
        executionTimeout: 600000,
        retryAttempts: 5
      });
      expect(engine.maxQueueSize).toBe(100);
      expect(engine.executionTimeout).toBe(600000);
      expect(engine.retryAttempts).toBe(5);
    });

    it('should initialize execution strategies', () => {
      expect(executionEngine.executionStrategies.size).toBeGreaterThan(0);
      expect(executionEngine.executionStrategies.has('basic')).toBe(true);
      expect(executionEngine.executionStrategies.has('simple')).toBe(true);
    });
  });

  describe('executeWorkflow', () => {
    it('should execute workflow successfully', async () => {
      const result = await executionEngine.executeWorkflow(mockWorkflow, mockContext, {
        strategy: 'basic'
      });

      expect(result).toBeInstanceOf(ExecutionResult);
      expect(result.isSuccess()).toBe(true);
      expect(result.getStrategy()).toBe('basic_sequential');
    });

    it('should handle workflow execution failure', async () => {
      mockWorkflow.execute = jest.fn().mockRejectedValue(new Error('Workflow failed'));

      const result = await executionEngine.executeWorkflow(mockWorkflow, mockContext, {
        strategy: 'basic'
      });

      expect(result).toBeInstanceOf(ExecutionResult);
      expect(result.isSuccess()).toBe(false);
      expect(result.getError()).toBe('Workflow failed');
    });

    it('should use default strategy when none specified', async () => {
      const result = await executionEngine.executeWorkflow(mockWorkflow, mockContext);

      expect(result).toBeInstanceOf(ExecutionResult);
      expect(result.getStrategy()).toBe('basic_sequential');
    });

    it('should throw ExecutionException on critical error', async () => {
      executionEngine.executionScheduler.schedule = jest.fn().mockRejectedValue(new Error('Scheduling failed'));

      await expect(executionEngine.executeWorkflow(mockWorkflow, mockContext))
        .rejects.toThrow(ExecutionException);
    });
  });

  describe('determineExecutionStrategy', () => {
    it('should return specified strategy if available', () => {
      const strategy = executionEngine.determineExecutionStrategy(mockWorkflow, mockContext, {
        strategy: 'simple'
      });

      expect(strategy.name).toBe('simple_sequential');
    });

    it('should return basic strategy as default', () => {
      const strategy = executionEngine.determineExecutionStrategy(mockWorkflow, mockContext, {});

      expect(strategy.name).toBe('basic_sequential');
    });

    it('should return basic strategy for unknown strategy', () => {
      const strategy = executionEngine.determineExecutionStrategy(mockWorkflow, mockContext, {
        strategy: 'unknown'
      });

      expect(strategy.name).toBe('basic_sequential');
    });
  });

  describe('generateExecutionId', () => {
    it('should generate unique execution IDs', () => {
      const id1 = executionEngine.generateExecutionId();
      const id2 = executionEngine.generateExecutionId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^exec_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^exec_\d+_[a-z0-9]+$/);
    });
  });

  describe('getExecutionStatus', () => {
    it('should return not_found for unknown execution', () => {
      const status = executionEngine.getExecutionStatus('unknown-id');

      expect(status.status).toBe('not_found');
    });

    it('should return execution status for active execution', async () => {
      await executionEngine.executeWorkflow(mockWorkflow, mockContext);
      
      // Get the execution ID from the active executions
      const executionIds = Array.from(executionEngine.activeExecutions.keys());
      const executionId = executionIds[0];
      
      const status = executionEngine.getExecutionStatus(executionId);

      expect(status.status).toBe('active');
      expect(status.workflowName).toBe('Test Workflow');
    });
  });

  describe('getSystemMetrics', () => {
    it('should return system metrics', async () => {
      const metrics = await executionEngine.getSystemMetrics();

      expect(metrics).toHaveProperty('activeExecutions');
      expect(metrics).toHaveProperty('maxQueueSize');
      expect(metrics).toHaveProperty('queueLength');
      expect(metrics).toHaveProperty('processingLength');
      expect(metrics).toHaveProperty('completedLength');
      expect(metrics).toHaveProperty('failedLength');
      expect(metrics).toHaveProperty('scheduledExecutions');
      expect(metrics).toHaveProperty('resourceUtilization');
      expect(metrics).toHaveProperty('averageWaitTime');
      expect(metrics).toHaveProperty('averageProcessingTime');
    });
  });

  describe('cancelExecution', () => {
    it('should cancel execution successfully', async () => {
      await executionEngine.executeWorkflow(mockWorkflow, mockContext);
      
      const executionIds = Array.from(executionEngine.activeExecutions.keys());
      const executionId = executionIds[0];
      
      const result = executionEngine.cancelExecution(executionId);

      expect(result).toBe(true);
    });

    it('should return false for unknown execution', () => {
      const result = executionEngine.cancelExecution('unknown-id');

      expect(result).toBe(false);
    });
  });

  describe('getExecution', () => {
    it('should return execution context for known execution', async () => {
      await executionEngine.executeWorkflow(mockWorkflow, mockContext);
      
      const executionIds = Array.from(executionEngine.activeExecutions.keys());
      const executionId = executionIds[0];
      
      const execution = executionEngine.getExecution(executionId);

      expect(execution).toBeInstanceOf(ExecutionContext);
      expect(execution.getId()).toBe(executionId);
    });

    it('should return null for unknown execution', () => {
      const execution = executionEngine.getExecution('unknown-id');

      expect(execution).toBeNull();
    });
  });

  describe('getActiveExecutions', () => {
    it('should return empty array when no active executions', () => {
      const executions = executionEngine.getActiveExecutions();

      expect(executions).toEqual([]);
    });

    it('should return active executions', async () => {
      await executionEngine.executeWorkflow(mockWorkflow, mockContext);
      
      const executions = executionEngine.getActiveExecutions();

      expect(executions.length).toBeGreaterThan(0);
      expect(executions[0]).toBeInstanceOf(ExecutionContext);
    });
  });

  describe('getStrategy', () => {
    it('should return strategy for known name', () => {
      const strategy = executionEngine.getStrategy('basic');

      expect(strategy).toBeDefined();
      expect(strategy.name).toBe('basic_sequential');
    });

    it('should return null for unknown strategy', () => {
      const strategy = executionEngine.getStrategy('unknown');

      expect(strategy).toBeNull();
    });
  });

  describe('registerStrategy', () => {
    it('should register new strategy', () => {
      const mockStrategy = {
        name: 'custom_strategy',
        execute: jest.fn()
      };

      executionEngine.registerStrategy('custom', mockStrategy);

      const strategy = executionEngine.getStrategy('custom');
      expect(strategy).toBe(mockStrategy);
    });
  });

  describe('getRegisteredStrategies', () => {
    it('should return all registered strategy names', () => {
      const strategies = executionEngine.getRegisteredStrategies();

      expect(strategies).toContain('basic');
      expect(strategies).toContain('simple');
    });
  });

  describe('updateConfiguration', () => {
    it('should update engine configuration', () => {
      const newConfig = {
        maxQueueSize: 200,
        executionTimeout: 600000,
        retryAttempts: 5
      };

      executionEngine.updateConfiguration(newConfig);

      expect(executionEngine.maxQueueSize).toBe(200);
      expect(executionEngine.executionTimeout).toBe(600000);
      expect(executionEngine.retryAttempts).toBe(5);
    });
  });

  describe('getConfiguration', () => {
    it('should return current configuration', () => {
      const config = executionEngine.getConfiguration();

      expect(config).toHaveProperty('maxQueueSize');
      expect(config).toHaveProperty('executionTimeout');
      expect(config).toHaveProperty('retryAttempts');
      expect(config).toHaveProperty('queue');
      expect(config).toHaveProperty('scheduler');
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status', () => {
      const health = executionEngine.getHealthStatus();

      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('queueHealth');
      expect(health).toHaveProperty('systemMetrics');
      expect(health).toHaveProperty('configuration');
    });
  });

  describe('shutdown', () => {
    it('should shutdown engine successfully', async () => {
      await executionEngine.executeWorkflow(mockWorkflow, mockContext);
      
      expect(executionEngine.activeExecutions.size).toBeGreaterThan(0);

      await executionEngine.shutdown();

      expect(executionEngine.activeExecutions.size).toBe(0);
    });
  });

  describe('toJSON', () => {
    it('should return JSON representation', () => {
      const json = executionEngine.toJSON();

      expect(json).toHaveProperty('maxQueueSize');
      expect(json).toHaveProperty('executionTimeout');
      expect(json).toHaveProperty('retryAttempts');
      expect(json).toHaveProperty('activeExecutions');
      expect(json).toHaveProperty('registeredStrategies');
      expect(json).toHaveProperty('queue');
      expect(json).toHaveProperty('scheduler');
    });
  });
}); 