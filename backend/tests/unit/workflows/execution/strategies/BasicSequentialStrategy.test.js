/**
 * Unit tests for BasicSequentialStrategy
 */
const BasicSequentialStrategy = require('@workflows/execution/strategies/BasicSequentialStrategy');
const { StepExecutionException } = require('@workflows/execution/exceptions/ExecutionException');

describe('BasicSequentialStrategy', () => {
  let strategy;
  let mockWorkflow;
  let mockContext;
  let mockExecutionContext;

  beforeEach(() => {
    strategy = new BasicSequentialStrategy();
    
    mockWorkflow = {
      getMetadata: () => ({
        id: 'test-workflow-1',
        name: 'Test Workflow',
        type: 'test'
      }),
      getSteps: () => [
        {
          getMetadata: () => ({ name: 'step-1' }),
          execute: jest.fn().mockResolvedValue({ success: true, data: 'step1-result' })
        },
        {
          getMetadata: () => ({ name: 'step-2' }),
          execute: jest.fn().mockResolvedValue({ success: true, data: 'step2-result' })
        }
      ]
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

    mockExecutionContext = {
      getId: jest.fn().mockReturnValue('test-execution-1'),
      getWorkflow: jest.fn().mockReturnValue(mockWorkflow),
      getContext: jest.fn().mockReturnValue(mockContext),
      getStrategy: jest.fn().mockReturnValue(strategy),
      setStatus: jest.fn(),
      setTotalSteps: jest.fn(),
      setCurrentStep: jest.fn(),
      addResult: jest.fn(),
      addError: jest.fn(),
      addLog: jest.fn(),
      getOption: jest.fn().mockReturnValue(true),
      startStepTiming: jest.fn(),
      endStepTiming: jest.fn()
    };
  });

  describe('constructor', () => {
    it('should create strategy with correct name', () => {
      expect(strategy.name).toBe('basic_sequential');
    });

    it('should have execute method', () => {
      expect(typeof strategy.execute).toBe('function');
    });
  });

  describe('execute', () => {
    it('should execute workflow steps sequentially', async () => {
      const result = await strategy.execute(mockWorkflow, mockContext, mockExecutionContext);

      expect(result.isSuccess()).toBe(true);
      expect(result.getStrategy()).toBe('basic_sequential');
      expect(result.getStepCount()).toBe(2);
      expect(result.getSuccessfulSteps()).toHaveLength(2);
      expect(result.getFailedSteps()).toHaveLength(0);
    });

    it('should update execution context during execution', async () => {
      await strategy.execute(mockWorkflow, mockContext, mockExecutionContext);

      expect(mockExecutionContext.setStatus).toHaveBeenCalledWith('running');
      expect(mockExecutionContext.setTotalSteps).toHaveBeenCalledWith(2);
      expect(mockExecutionContext.setCurrentStep).toHaveBeenCalledWith(0);
      expect(mockExecutionContext.setCurrentStep).toHaveBeenCalledWith(1);
      expect(mockExecutionContext.setStatus).toHaveBeenCalledWith('completed');
    });

    it('should handle workflow with no steps', async () => {
      const emptyWorkflow = {
        getMetadata: () => ({
          id: 'empty-workflow',
          name: 'Empty Workflow',
          type: 'test'
        }),
        getSteps: () => []
      };

      const result = await strategy.execute(emptyWorkflow, mockContext, mockExecutionContext);

      expect(result.isSuccess()).toBe(true);
      expect(result.getStepCount()).toBe(0);
      expect(result.getSuccessfulSteps()).toHaveLength(0);
    });

    it('should handle step execution failure', async () => {
      const failingWorkflow = {
        getMetadata: () => ({
          id: 'failing-workflow',
          name: 'Failing Workflow',
          type: 'test'
        }),
        getSteps: () => [
          {
            getMetadata: () => ({ name: 'step-1' }),
            execute: jest.fn().mockResolvedValue({ success: true, data: 'step1-result' })
          },
          {
            getMetadata: () => ({ name: 'step-2' }),
            execute: jest.fn().mockRejectedValue(new Error('Step 2 failed'))
          }
        ]
      };

      const result = await strategy.execute(failingWorkflow, mockContext, mockExecutionContext);

      expect(result.isSuccess()).toBe(false);
      expect(result.getStepCount()).toBe(2);
      expect(result.getSuccessfulSteps()).toHaveLength(1);
      expect(result.getFailedSteps()).toHaveLength(1);
      expect(result.getFailedSteps()[0].stepName).toBe('step-2');
    });

    it('should stop on first failure when stopOnFailure is true', async () => {
      const failingWorkflow = {
        getMetadata: () => ({
          id: 'failing-workflow',
          name: 'Failing Workflow',
          type: 'test'
        }),
        getSteps: () => [
          {
            getMetadata: () => ({ name: 'step-1' }),
            execute: jest.fn().mockRejectedValue(new Error('Step 1 failed'))
          },
          {
            getMetadata: () => ({ name: 'step-2' }),
            execute: jest.fn().mockResolvedValue({ success: true, data: 'step2-result' })
          }
        ]
      };

      const result = await strategy.execute(failingWorkflow, mockContext, mockExecutionContext);

      expect(result.isSuccess()).toBe(false);
      expect(result.getStepCount()).toBe(2);
      expect(result.getSuccessfulSteps()).toHaveLength(0);
      expect(result.getFailedSteps()).toHaveLength(1);
      
      // Step 2 should not have been executed
      expect(failingWorkflow.getSteps()[1].execute).not.toHaveBeenCalled();
    });

    it('should continue on failure when stopOnFailure is false', async () => {
      mockExecutionContext.getOption.mockReturnValue(false);

      const failingWorkflow = {
        getMetadata: () => ({
          id: 'failing-workflow',
          name: 'Failing Workflow',
          type: 'test'
        }),
        getSteps: () => [
          {
            getMetadata: () => ({ name: 'step-1' }),
            execute: jest.fn().mockRejectedValue(new Error('Step 1 failed'))
          },
          {
            getMetadata: () => ({ name: 'step-2' }),
            execute: jest.fn().mockResolvedValue({ success: true, data: 'step2-result' })
          }
        ]
      };

      const result = await strategy.execute(failingWorkflow, mockContext, mockExecutionContext);

      expect(result.isSuccess()).toBe(false);
      expect(result.getStepCount()).toBe(2);
      expect(result.getSuccessfulSteps()).toHaveLength(1);
      expect(result.getFailedSteps()).toHaveLength(1);
      
      // Step 2 should have been executed
      expect(failingWorkflow.getSteps()[1].execute).toHaveBeenCalled();
    });

    it('should update context with step results', async () => {
      await strategy.execute(mockWorkflow, mockContext, mockExecutionContext);

      expect(mockContext.setData).toHaveBeenCalledWith('step_0_result', { success: true, data: 'step1-result' });
      expect(mockContext.setData).toHaveBeenCalledWith('step_1_result', { success: true, data: 'step2-result' });
    });

    it('should track step timing', async () => {
      await strategy.execute(mockWorkflow, mockContext, mockExecutionContext);

      expect(mockExecutionContext.startStepTiming).toHaveBeenCalledWith(0);
      expect(mockExecutionContext.startStepTiming).toHaveBeenCalledWith(1);
      expect(mockExecutionContext.endStepTiming).toHaveBeenCalledWith(0);
      expect(mockExecutionContext.endStepTiming).toHaveBeenCalledWith(1);
    });
  });

  describe('getWorkflowSteps', () => {
    it('should get steps from workflow', () => {
      const steps = strategy.getWorkflowSteps(mockWorkflow);
      expect(steps).toHaveLength(2);
      expect(steps[0].getMetadata().name).toBe('step-1');
      expect(steps[1].getMetadata().name).toBe('step-2');
    });

    it('should handle workflow without getSteps method', () => {
      const simpleWorkflow = {
        getMetadata: () => ({ name: 'simple-workflow' }),
        execute: jest.fn().mockResolvedValue({ success: true })
      };

      const steps = strategy.getWorkflowSteps(simpleWorkflow);
      expect(steps).toHaveLength(1);
      expect(steps[0]).toBe(simpleWorkflow);
    });

    it('should handle workflow with _steps property', () => {
      const composedWorkflow = {
        getMetadata: () => ({ name: 'composed-workflow' }),
        _steps: [
          { getMetadata: () => ({ name: 'composed-step-1' }) },
          { getMetadata: () => ({ name: 'composed-step-2' }) }
        ]
      };

      const steps = strategy.getWorkflowSteps(composedWorkflow);
      expect(steps).toHaveLength(2);
      expect(steps[0].getMetadata().name).toBe('composed-step-1');
      expect(steps[1].getMetadata().name).toBe('composed-step-2');
    });
  });

  describe('executeStep', () => {
    it('should execute step successfully', async () => {
      const step = {
        getMetadata: () => ({ name: 'test-step' }),
        execute: jest.fn().mockResolvedValue({ success: true, data: 'test-result' })
      };

      const result = await strategy.executeStep(step, mockContext, mockExecutionContext);

      expect(result.success).toBe(true);
      expect(result.data).toBe('test-result');
      expect(step.execute).toHaveBeenCalledWith(mockContext);
    });

    it('should handle step execution error', async () => {
      const step = {
        getMetadata: () => ({ name: 'failing-step' }),
        execute: jest.fn().mockRejectedValue(new Error('Step execution failed'))
      };

      await expect(strategy.executeStep(step, mockContext, mockExecutionContext))
        .rejects.toThrow(StepExecutionException);
    });

    it('should handle step without execute method', async () => {
      const invalidStep = {
        getMetadata: () => ({ name: 'invalid-step' })
      };

      await expect(strategy.executeStep(invalidStep, mockContext, mockExecutionContext))
        .rejects.toThrow(StepExecutionException);
    });

    it('should log step execution', async () => {
      const step = {
        getMetadata: () => ({ name: 'test-step' }),
        execute: jest.fn().mockResolvedValue({ success: true })
      };

      await strategy.executeStep(step, mockContext, mockExecutionContext);

      expect(mockExecutionContext.addLog).toHaveBeenCalledWith('info', 'Step executed successfully', {
        stepName: 'test-step',
        duration: expect.any(Number)
      });
    });

    it('should log step failure', async () => {
      const step = {
        getMetadata: () => ({ name: 'failing-step' }),
        execute: jest.fn().mockRejectedValue(new Error('Step failed'))
      };

      try {
        await strategy.executeStep(step, mockContext, mockExecutionContext);
      } catch (error) {
        // Expected to throw
      }

      expect(mockExecutionContext.addLog).toHaveBeenCalledWith('error', 'Step execution failed', {
        stepName: 'failing-step',
        error: 'Step failed',
        duration: expect.any(Number)
      });
    });
  });

  describe('error handling', () => {
    it('should handle workflow execution errors', async () => {
      const errorWorkflow = {
        getMetadata: () => ({ name: 'error-workflow' }),
        getSteps: () => {
          throw new Error('Workflow error');
        }
      };

      const result = await strategy.execute(errorWorkflow, mockContext, mockExecutionContext);

      expect(result.isSuccess()).toBe(false);
      expect(result.getError()).toContain('Workflow error');
    });

    it('should handle context errors', async () => {
      const invalidContext = {
        setData: jest.fn().mockImplementation(() => {
          throw new Error('Context error');
        })
      };

      const result = await strategy.execute(mockWorkflow, invalidContext, mockExecutionContext);

      expect(result.isSuccess()).toBe(false);
      expect(result.getError()).toContain('Context error');
    });
  });

  describe('performance tracking', () => {
    it('should track execution duration', async () => {
      const startTime = Date.now();
      const result = await strategy.execute(mockWorkflow, mockContext, mockExecutionContext);
      const endTime = Date.now();

      expect(result.getDuration()).toBeGreaterThanOrEqual(0);
      expect(result.getDuration()).toBeLessThanOrEqual(endTime - startTime + 100); // Allow some tolerance
    });

    it('should track step durations', async () => {
      await strategy.execute(mockWorkflow, mockContext, mockExecutionContext);

      expect(mockExecutionContext.startStepTiming).toHaveBeenCalledWith(0);
      expect(mockExecutionContext.startStepTiming).toHaveBeenCalledWith(1);
      expect(mockExecutionContext.endStepTiming).toHaveBeenCalledWith(0);
      expect(mockExecutionContext.endStepTiming).toHaveBeenCalledWith(1);
    });
  });
}); 