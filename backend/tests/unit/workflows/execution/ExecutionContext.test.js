/**
 * Unit tests for ExecutionContext
 */
const ExecutionContext = require('@/domain/workflows/execution/ExecutionContext');

describe('ExecutionContext', () => {
  let mockWorkflow;
  let mockContext;
  let mockStrategy;

  beforeEach(() => {
    mockWorkflow = {
      getMetadata: () => ({
        id: 'test-workflow-1',
        name: 'Test Workflow',
        type: 'test'
      })
    };

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

    mockStrategy = {
      name: 'test_strategy',
      execute: jest.fn()
    };
  });

  describe('constructor', () => {
    it('should create execution context with required parameters', () => {
      const executionContext = new ExecutionContext({
        workflow: mockWorkflow,
        context: mockContext,
        strategy: mockStrategy
      });

      expect(executionContext.getWorkflow()).toBe(mockWorkflow);
      expect(executionContext.getContext()).toBe(mockContext);
      expect(executionContext.getStrategy()).toBe(mockStrategy);
      expect(executionContext.getStatus()).toBe('initialized');
    });

    it('should generate execution ID if not provided', () => {
      const executionContext = new ExecutionContext({
        workflow: mockWorkflow,
        context: mockContext,
        strategy: mockStrategy
      });

      expect(executionContext.getId()).toMatch(/^[a-f0-9-]+$/);
    });

    it('should use provided execution ID', () => {
      const executionId = 'test-execution-id';
      const executionContext = new ExecutionContext({
        id: executionId,
        workflow: mockWorkflow,
        context: mockContext,
        strategy: mockStrategy
      });

      expect(executionContext.getId()).toBe(executionId);
    });

    it('should set start time', () => {
      const startTime = Date.now();
      const executionContext = new ExecutionContext({
        workflow: mockWorkflow,
        context: mockContext,
        strategy: mockStrategy,
        startTime
      });

      expect(executionContext.startTime).toBe(startTime);
    });

    it('should merge options', () => {
      const options = { testOption: 'testValue' };
      const executionContext = new ExecutionContext({
        workflow: mockWorkflow,
        context: mockContext,
        strategy: mockStrategy,
        options
      });

      expect(executionContext.getOption('testOption')).toBe('testValue');
    });

    it('should throw error if workflow is missing', () => {
      expect(() => {
        new ExecutionContext({
          context: mockContext,
          strategy: mockStrategy
        });
      }).toThrow('Workflow is required for execution context');
    });

    it('should throw error if context is missing', () => {
      expect(() => {
        new ExecutionContext({
          workflow: mockWorkflow,
          strategy: mockStrategy
        });
      }).toThrow('Context is required for execution context');
    });

    it('should throw error if strategy is missing', () => {
      expect(() => {
        new ExecutionContext({
          workflow: mockWorkflow,
          context: mockContext
        });
      }).toThrow('Strategy is required for execution context');
    });
  });

  describe('status management', () => {
    let executionContext;

    beforeEach(() => {
      executionContext = new ExecutionContext({
        workflow: mockWorkflow,
        context: mockContext,
        strategy: mockStrategy
      });
    });

    it('should set and get status', () => {
      executionContext.setStatus('running');
      expect(executionContext.getStatus()).toBe('running');
    });

    it('should check if execution is completed', () => {
      executionContext.setStatus('completed');
      expect(executionContext.isCompleted()).toBe(true);

      executionContext.setStatus('failed');
      expect(executionContext.isCompleted()).toBe(true);

      executionContext.setStatus('cancelled');
      expect(executionContext.isCompleted()).toBe(true);

      executionContext.setStatus('running');
      expect(executionContext.isCompleted()).toBe(false);
    });

    it('should check if execution is running', () => {
      executionContext.setStatus('running');
      expect(executionContext.isRunning()).toBe(true);

      executionContext.setStatus('completed');
      expect(executionContext.isRunning()).toBe(false);
    });

    it('should check if execution failed', () => {
      executionContext.setStatus('failed');
      expect(executionContext.isFailed()).toBe(true);

      executionContext.setStatus('completed');
      expect(executionContext.isFailed()).toBe(false);
    });
  });

  describe('step management', () => {
    let executionContext;

    beforeEach(() => {
      executionContext = new ExecutionContext({
        workflow: mockWorkflow,
        context: mockContext,
        strategy: mockStrategy
      });
    });

    it('should set and get current step', () => {
      executionContext.setCurrentStep(5);
      expect(executionContext.getCurrentStep()).toBe(5);
    });

    it('should set and get total steps', () => {
      executionContext.setTotalSteps(10);
      expect(executionContext.getTotalSteps()).toBe(10);
    });
  });

  describe('results management', () => {
    let executionContext;

    beforeEach(() => {
      executionContext = new ExecutionContext({
        workflow: mockWorkflow,
        context: mockContext,
        strategy: mockStrategy
      });
    });

    it('should add and get results', () => {
      const result1 = { success: true, data: 'result1' };
      const result2 = { success: true, data: 'result2' };

      executionContext.addResult(result1);
      executionContext.addResult(result2);

      const results = executionContext.getResults();
      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject(result1);
      expect(results[1]).toMatchObject(result2);
    });

    it('should add and get errors', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      executionContext.addError(error1);
      executionContext.addError(error2);

      const errors = executionContext.getErrors();
      expect(errors).toHaveLength(2);
      expect(errors[0].message).toBe('Error 1');
      expect(errors[1].message).toBe('Error 2');
    });
  });

  describe('metrics management', () => {
    let executionContext;

    beforeEach(() => {
      executionContext = new ExecutionContext({
        workflow: mockWorkflow,
        context: mockContext,
        strategy: mockStrategy
      });
    });

    it('should set and get metrics', () => {
      executionContext.setMetric('testMetric', 'testValue');
      expect(executionContext.getMetric('testMetric')).toBe('testValue');
    });

    it('should return default value for missing metric', () => {
      expect(executionContext.getMetric('missingMetric', 'default')).toBe('default');
    });

    it('should increment metric', () => {
      executionContext.setMetric('counter', 5);
      executionContext.incrementMetric('counter', 3);
      expect(executionContext.getMetric('counter')).toBe(8);
    });

    it('should get all metrics', () => {
      executionContext.setMetric('metric1', 'value1');
      executionContext.setMetric('metric2', 'value2');

      const metrics = executionContext.getMetrics();
      expect(metrics).toEqual({
        metric1: 'value1',
        metric2: 'value2'
      });
    });
  });

  describe('logging', () => {
    let executionContext;

    beforeEach(() => {
      executionContext = new ExecutionContext({
        workflow: mockWorkflow,
        context: mockContext,
        strategy: mockStrategy
      });
    });

    it('should add and get logs', () => {
      executionContext.addLog('info', 'Test log message', { data: 'test' });
      executionContext.addLog('error', 'Error log message');

      const logs = executionContext.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].level).toBe('info');
      expect(logs[0].message).toBe('Test log message');
      expect(logs[0].data).toEqual({ data: 'test' });
      expect(logs[1].level).toBe('error');
      expect(logs[1].message).toBe('Error log message');
    });

    it('should get logs by level', () => {
      executionContext.addLog('info', 'Info message');
      executionContext.addLog('error', 'Error message');
      executionContext.addLog('info', 'Another info message');

      const infoLogs = executionContext.getLogsByLevel('info');
      expect(infoLogs).toHaveLength(2);

      const errorLogs = executionContext.getLogsByLevel('error');
      expect(errorLogs).toHaveLength(1);
    });

    it('should get recent logs', () => {
      for (let i = 0; i < 15; i++) {
        executionContext.addLog('info', `Log ${i}`);
      }

      const recentLogs = executionContext.getRecentLogs(10);
      expect(recentLogs).toHaveLength(10);
      expect(recentLogs[0].message).toBe('Log 5');
      expect(recentLogs[9].message).toBe('Log 14');
    });
  });

  describe('timing', () => {
    let executionContext;

    beforeEach(() => {
      executionContext = new ExecutionContext({
        workflow: mockWorkflow,
        context: mockContext,
        strategy: mockStrategy
      });
    });

    it('should get duration', () => {
      const startTime = Date.now() - 1000; // 1 second ago
      executionContext.startTime = startTime;

      const duration = executionContext.getDuration();
      expect(duration).toBeGreaterThanOrEqual(1000);
    });

    it('should get formatted duration', () => {
      executionContext.startTime = Date.now() - 3661000; // 1 hour 1 minute 1 second ago

      const formatted = executionContext.getFormattedDuration();
      expect(formatted).toMatch(/1h 1m 1s/);
    });

    it('should handle step timing', () => {
      executionContext.startStepTiming(0);
      
      // Simulate some time passing
      const stepDuration = executionContext.endStepTiming(0);
      expect(stepDuration).toBeGreaterThanOrEqual(0);

      const retrievedDuration = executionContext.getStepDuration(0);
      expect(retrievedDuration).toBe(stepDuration);
    });

    it('should get all step durations', () => {
      executionContext.startStepTiming(0);
      executionContext.endStepTiming(0);
      executionContext.startStepTiming(1);
      executionContext.endStepTiming(1);

      const durations = executionContext.getAllStepDurations();
      expect(durations.size).toBe(2);
      expect(durations.has(0)).toBe(true);
      expect(durations.has(1)).toBe(true);
    });
  });

  describe('options management', () => {
    let executionContext;

    beforeEach(() => {
      executionContext = new ExecutionContext({
        workflow: mockWorkflow,
        context: mockContext,
        strategy: mockStrategy,
        options: { testOption: 'testValue' }
      });
    });

    it('should get option value', () => {
      expect(executionContext.getOption('testOption')).toBe('testValue');
    });

    it('should return default value for missing option', () => {
      expect(executionContext.getOption('missingOption', 'default')).toBe('default');
    });

    it('should set option value', () => {
      executionContext.setOption('newOption', 'newValue');
      expect(executionContext.getOption('newOption')).toBe('newValue');
    });

    it('should get all options', () => {
      executionContext.setOption('option2', 'value2');
      const options = executionContext.getOptions();
      expect(options).toEqual({
        testOption: 'testValue',
        option2: 'value2'
      });
    });
  });

  describe('dependencies and constraints', () => {
    let executionContext;

    beforeEach(() => {
      executionContext = new ExecutionContext({
        workflow: mockWorkflow,
        context: mockContext,
        strategy: mockStrategy,
        dependencies: ['dep1', 'dep2'],
        constraints: { maxTime: 300000 }
      });
    });

    it('should get dependencies', () => {
      const dependencies = executionContext.getDependencies();
      expect(dependencies).toEqual(['dep1', 'dep2']);
    });

    it('should add dependency', () => {
      executionContext.addDependency('dep3');
      const dependencies = executionContext.getDependencies();
      expect(dependencies).toContain('dep3');
    });

    it('should not add duplicate dependency', () => {
      executionContext.addDependency('dep1');
      const dependencies = executionContext.getDependencies();
      expect(dependencies.filter(d => d === 'dep1')).toHaveLength(1);
    });

    it('should get constraints', () => {
      const constraints = executionContext.getConstraints();
      expect(constraints).toEqual({ maxTime: 300000 });
    });

    it('should set constraint', () => {
      executionContext.setConstraint('maxMemory', 1024);
      expect(executionContext.getConstraints().maxMemory).toBe(1024);
    });
  });

  describe('summary and JSON', () => {
    let executionContext;

    beforeEach(() => {
      executionContext = new ExecutionContext({
        workflow: mockWorkflow,
        context: mockContext,
        strategy: mockStrategy
      });
    });

    it('should get summary', () => {
      executionContext.setStatus('running');
      executionContext.setCurrentStep(2);
      executionContext.setTotalSteps(5);
      executionContext.addResult({ success: true });
      executionContext.addError(new Error('Test error'));

      const summary = executionContext.getSummary();
      expect(summary).toHaveProperty('id');
      expect(summary).toHaveProperty('status', 'running');
      expect(summary).toHaveProperty('currentStep', 2);
      expect(summary).toHaveProperty('totalSteps', 5);
      expect(summary).toHaveProperty('duration');
      expect(summary).toHaveProperty('formattedDuration');
      expect(summary).toHaveProperty('resultsCount', 1);
      expect(summary).toHaveProperty('errorsCount', 1);
      expect(summary).toHaveProperty('logsCount', 1);
      expect(summary).toHaveProperty('metrics');
      expect(summary).toHaveProperty('strategy', 'test_strategy');
    });

    it('should convert to JSON', () => {
      executionContext.setStatus('completed');
      executionContext.addResult({ success: true });

      const json = executionContext.toJSON();
      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('workflowId', 'test-workflow-1');
      expect(json).toHaveProperty('strategy', 'test_strategy');
      expect(json).toHaveProperty('startTime');
      expect(json).toHaveProperty('status', 'completed');
      expect(json).toHaveProperty('currentStep', 0);
      expect(json).toHaveProperty('totalSteps', 0);
      expect(json).toHaveProperty('results');
      expect(json).toHaveProperty('errors');
      expect(json).toHaveProperty('metrics');
      expect(json).toHaveProperty('logs');
      expect(json).toHaveProperty('options');
      expect(json).toHaveProperty('dependencies');
      expect(json).toHaveProperty('constraints');
      expect(json).toHaveProperty('duration');
    });

    it('should create from JSON', () => {
      const originalJson = executionContext.toJSON();
      const recreated = ExecutionContext.fromJSON({
        ...originalJson,
        workflow: mockWorkflow,
        context: mockContext,
        strategy: mockStrategy
      });

      expect(recreated.getId()).toBe(originalJson.id);
      expect(recreated.startTime).toBe(originalJson.startTime);
      expect(recreated.getOptions()).toEqual(originalJson.options);
      expect(recreated.getDependencies()).toEqual(originalJson.dependencies);
      expect(recreated.getConstraints()).toEqual(originalJson.constraints);
    });
  });
}); 