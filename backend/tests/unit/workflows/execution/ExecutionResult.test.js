/**
 * Unit tests for ExecutionResult
 */
const ExecutionResult = require('@workflows/execution/ExecutionResult');

describe('ExecutionResult', () => {
  let mockResult;

  beforeEach(() => {
    mockResult = {
      success: true,
      strategy: 'test_strategy',
      duration: 1000,
      results: [{ success: true, data: 'test' }],
      stepCount: 1,
      stepResults: [{ success: true, stepName: 'test-step' }],
      successfulSteps: [{ success: true, stepName: 'test-step' }],
      failedSteps: [],
      executionId: 'test-execution-1',
      workflowId: 'test-workflow-1',
      workflowName: 'Test Workflow'
    };
  });

  describe('constructor', () => {
    it('should create execution result with required parameters', () => {
      const result = new ExecutionResult(mockResult);

      expect(result.isSuccess()).toBe(true);
      expect(result.getStrategy()).toBe('test_strategy');
      expect(result.getDuration()).toBe(1000);
      expect(result.getStepCount()).toBe(1);
    });

    it('should create failed execution result', () => {
      const failedResult = new ExecutionResult({
        ...mockResult,
        success: false,
        error: 'Test error',
        failedSteps: [{ success: false, stepName: 'failed-step', error: 'Test error' }]
      });

      expect(failedResult.isSuccess()).toBe(false);
      expect(failedResult.getError()).toBe('Test error');
      expect(failedResult.getFailedSteps()).toHaveLength(1);
    });

    it('should set default values', () => {
      const result = new ExecutionResult({
        success: true
      });

      expect(result.getStrategy()).toBe('unknown');
      expect(result.getDuration()).toBe(0);
      expect(result.getStepCount()).toBe(0);
      expect(result.getExecutionId()).toBeDefined();
    });
  });

  describe('success status', () => {
    it('should check if execution was successful', () => {
      const successResult = new ExecutionResult({ ...mockResult, success: true });
      const failedResult = new ExecutionResult({ ...mockResult, success: false });

      expect(successResult.isSuccess()).toBe(true);
      expect(failedResult.isSuccess()).toBe(false);
    });

    it('should check if execution failed', () => {
      const successResult = new ExecutionResult({ ...mockResult, success: true });
      const failedResult = new ExecutionResult({ ...mockResult, success: false });

      expect(successResult.isFailed()).toBe(false);
      expect(failedResult.isFailed()).toBe(true);
    });
  });

  describe('strategy information', () => {
    it('should get execution strategy', () => {
      const result = new ExecutionResult(mockResult);
      expect(result.getStrategy()).toBe('test_strategy');
    });

    it('should get default strategy when not specified', () => {
      const result = new ExecutionResult({ success: true });
      expect(result.getStrategy()).toBe('unknown');
    });
  });

  describe('duration and timing', () => {
    it('should get execution duration', () => {
      const result = new ExecutionResult(mockResult);
      expect(result.getDuration()).toBe(1000);
    });

    it('should get formatted duration', () => {
      const result = new ExecutionResult({ ...mockResult, duration: 3661000 }); // 1h 1m 1s
      expect(result.getFormattedDuration()).toMatch(/1h 1m 1s/);
    });

    it('should format short duration', () => {
      const result = new ExecutionResult({ ...mockResult, duration: 5000 }); // 5s
      expect(result.getFormattedDuration()).toBe('5s');
    });

    it('should format medium duration', () => {
      const result = new ExecutionResult({ ...mockResult, duration: 125000 }); // 2m 5s
      expect(result.getFormattedDuration()).toBe('2m 5s');
    });
  });

  describe('step information', () => {
    it('should get step count', () => {
      const result = new ExecutionResult(mockResult);
      expect(result.getStepCount()).toBe(1);
    });

    it('should get step results', () => {
      const result = new ExecutionResult(mockResult);
      const stepResults = result.getStepResults();
      
      expect(stepResults).toHaveLength(1);
      expect(stepResults[0].success).toBe(true);
      expect(stepResults[0].stepName).toBe('test-step');
    });

    it('should get successful steps', () => {
      const result = new ExecutionResult(mockResult);
      const successfulSteps = result.getSuccessfulSteps();
      
      expect(successfulSteps).toHaveLength(1);
      expect(successfulSteps[0].success).toBe(true);
    });

    it('should get failed steps', () => {
      const failedResult = new ExecutionResult({
        ...mockResult,
        success: false,
        failedSteps: [{ success: false, stepName: 'failed-step', error: 'Test error' }]
      });

      const failedSteps = failedResult.getFailedSteps();
      expect(failedSteps).toHaveLength(1);
      expect(failedSteps[0].success).toBe(false);
    });
  });

  describe('success rate', () => {
    it('should calculate success rate for all successful steps', () => {
      const result = new ExecutionResult(mockResult);
      expect(result.getSuccessRate()).toBe(100);
    });

    it('should calculate success rate for mixed results', () => {
      const mixedResult = new ExecutionResult({
        ...mockResult,
        stepCount: 3,
        successfulSteps: [{ success: true }, { success: true }],
        failedSteps: [{ success: false }]
      });

      expect(mixedResult.getSuccessRate()).toBe(66.67);
    });

    it('should handle zero steps', () => {
      const result = new ExecutionResult({ success: true, stepCount: 0 });
      expect(result.getSuccessRate()).toBe(0);
    });
  });

  describe('execution metadata', () => {
    it('should get execution ID', () => {
      const result = new ExecutionResult(mockResult);
      expect(result.getExecutionId()).toBe('test-execution-1');
    });

    it('should get workflow ID', () => {
      const result = new ExecutionResult(mockResult);
      expect(result.getWorkflowId()).toBe('test-workflow-1');
    });

    it('should get workflow name', () => {
      const result = new ExecutionResult(mockResult);
      expect(result.getWorkflowName()).toBe('Test Workflow');
    });
  });

  describe('error handling', () => {
    it('should get error message', () => {
      const failedResult = new ExecutionResult({
        ...mockResult,
        success: false,
        error: 'Test error message'
      });

      expect(failedResult.getError()).toBe('Test error message');
    });

    it('should return null for successful execution', () => {
      const result = new ExecutionResult(mockResult);
      expect(result.getError()).toBeNull();
    });
  });

  describe('results access', () => {
    it('should get all results', () => {
      const result = new ExecutionResult(mockResult);
      const results = result.getResults();
      
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].data).toBe('test');
    });

    it('should get specific result by index', () => {
      const result = new ExecutionResult(mockResult);
      const firstResult = result.getResult(0);
      
      expect(firstResult.success).toBe(true);
      expect(firstResult.data).toBe('test');
    });

    it('should return null for invalid index', () => {
      const result = new ExecutionResult(mockResult);
      expect(result.getResult(999)).toBeNull();
    });
  });

  describe('summary and metrics', () => {
    it('should get execution summary', () => {
      const result = new ExecutionResult(mockResult);
      const summary = result.getSummary();
      
      expect(summary).toHaveProperty('success', true);
      expect(summary).toHaveProperty('strategy', 'test_strategy');
      expect(summary).toHaveProperty('duration', 1000);
      expect(summary).toHaveProperty('stepCount', 1);
      expect(summary).toHaveProperty('successRate', 100);
      expect(summary).toHaveProperty('executionId', 'test-execution-1');
      expect(summary).toHaveProperty('workflowName', 'Test Workflow');
    });

    it('should get metrics', () => {
      const result = new ExecutionResult(mockResult);
      const metrics = result.getMetrics();
      
      expect(metrics).toHaveProperty('duration', 1000);
      expect(metrics).toHaveProperty('stepCount', 1);
      expect(metrics).toHaveProperty('successRate', 100);
      expect(metrics).toHaveProperty('successfulSteps', 1);
      expect(metrics).toHaveProperty('failedSteps', 0);
    });
  });

  describe('JSON serialization', () => {
    it('should convert to JSON', () => {
      const result = new ExecutionResult(mockResult);
      const json = result.toJSON();
      
      expect(json).toHaveProperty('success', true);
      expect(json).toHaveProperty('strategy', 'test_strategy');
      expect(json).toHaveProperty('duration', 1000);
      expect(json).toHaveProperty('stepCount', 1);
      expect(json).toHaveProperty('executionId', 'test-execution-1');
      expect(json).toHaveProperty('workflowId', 'test-workflow-1');
      expect(json).toHaveProperty('workflowName', 'Test Workflow');
      expect(json).toHaveProperty('results');
      expect(json).toHaveProperty('stepResults');
      expect(json).toHaveProperty('successfulSteps');
      expect(json).toHaveProperty('failedSteps');
      expect(json).toHaveProperty('error', null);
      expect(json).toHaveProperty('formattedDuration');
      expect(json).toHaveProperty('successRate', 100);
      expect(json).toHaveProperty('summary');
      expect(json).toHaveProperty('metrics');
    });

    it('should include error in JSON for failed execution', () => {
      const failedResult = new ExecutionResult({
        ...mockResult,
        success: false,
        error: 'Test error'
      });

      const json = failedResult.toJSON();
      expect(json.error).toBe('Test error');
    });
  });

  describe('comparison and validation', () => {
    it('should compare with other results', () => {
      const result1 = new ExecutionResult({ ...mockResult, duration: 1000 });
      const result2 = new ExecutionResult({ ...mockResult, duration: 2000 });

      expect(result1.getDuration()).toBeLessThan(result2.getDuration());
    });

    it('should validate result structure', () => {
      const result = new ExecutionResult(mockResult);
      
      expect(result.isSuccess()).toBeDefined();
      expect(result.getStrategy()).toBeDefined();
      expect(result.getDuration()).toBeDefined();
      expect(result.getStepCount()).toBeDefined();
      expect(result.getExecutionId()).toBeDefined();
    });
  });
}); 