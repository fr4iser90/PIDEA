/**
 * StepRegistry Unit Tests
 * Tests parallel execution functionality and step classification
 */

const StepRegistry = require('../../domain/steps/StepRegistry');
const StepClassifier = require('../../domain/steps/execution/StepClassifier');
const ParallelExecutionEngine = require('../../domain/steps/execution/ParallelExecutionEngine');

describe('StepRegistry Parallel Execution', () => {
  let stepRegistry;
  let stepClassifier;
  let parallelEngine;

  beforeEach(() => {
    stepRegistry = new StepRegistry();
    stepClassifier = new StepClassifier();
    parallelEngine = new ParallelExecutionEngine();
  });

  describe('StepClassifier', () => {
    test('should classify critical steps correctly', () => {
      const criticalSteps = [
        'IDESendMessageStep',
        'CreateChatStep',
        'TaskExecutionStep',
        'WorkflowExecutionStep'
      ];

      criticalSteps.forEach(stepName => {
        expect(stepClassifier.isCriticalStep(stepName)).toBe(true);
      });
    });

    test('should classify non-critical steps correctly', () => {
      const nonCriticalSteps = [
        'GetChatHistoryStep',
        'GitGetStatusStep',
        'GitGetCurrentBranchStep',
        'GetProjectInfoStep'
      ];

      nonCriticalSteps.forEach(stepName => {
        expect(stepClassifier.isCriticalStep(stepName)).toBe(false);
      });
    });

    test('should classify steps based on context', () => {
      const stepName = 'GetDataStep';
      const workflowContext = { workflowId: 'test-workflow' };
      const normalContext = {};

      expect(stepClassifier.isCriticalStep(stepName, workflowContext)).toBe(true);
      expect(stepClassifier.isCriticalStep(stepName, normalContext)).toBe(false);
    });

    test('should classify multiple steps correctly', () => {
      const stepNames = [
        'IDESendMessageStep',
        'GetChatHistoryStep',
        'CreateChatStep',
        'GitGetStatusStep'
      ];

      const result = stepClassifier.classifySteps(stepNames);

      expect(result.critical).toContain('IDESendMessageStep');
      expect(result.critical).toContain('CreateChatStep');
      expect(result.nonCritical).toContain('GetChatHistoryStep');
      expect(result.nonCritical).toContain('GitGetStatusStep');
      expect(result.classification.parallelizationRatio).toBe(0.5);
    });
  });

  describe('ParallelExecutionEngine', () => {
    test('should execute steps in parallel', async () => {
      // Mock step executors
      const mockExecutors = {
        'GetChatHistoryStep': async () => ({ success: true, data: 'chat history' }),
        'GitGetStatusStep': async () => ({ success: true, data: 'git status' }),
        'GetProjectInfoStep': async () => ({ success: true, data: 'project info' })
      };

      // Register mock executors
      Object.entries(mockExecutors).forEach(([stepName, executor]) => {
        stepRegistry.executors.set(stepName, executor);
      });

      const stepNames = ['GetChatHistoryStep', 'GitGetStatusStep', 'GetProjectInfoStep'];
      const results = await parallelEngine.executeStepsParallel(stepNames, {});

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.executionMode).toBe('parallel');
      });
    });

    test('should handle step failures gracefully', async () => {
      // Mock step executors with one failure
      const mockExecutors = {
        'GetChatHistoryStep': async () => ({ success: true, data: 'chat history' }),
        'GitGetStatusStep': async () => { throw new Error('Git error'); },
        'GetProjectInfoStep': async () => ({ success: true, data: 'project info' })
      };

      // Register mock executors
      Object.entries(mockExecutors).forEach(([stepName, executor]) => {
        stepRegistry.executors.set(stepName, executor);
      });

      const stepNames = ['GetChatHistoryStep', 'GitGetStatusStep', 'GetProjectInfoStep'];
      const results = await parallelEngine.executeStepsParallel(stepNames, {});

      expect(results).toHaveLength(3);
      expect(results.filter(r => r.success)).toHaveLength(2);
      expect(results.filter(r => !r.success)).toHaveLength(1);
    });

    test('should respect timeout configuration', async () => {
      const slowExecutor = async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { success: true, data: 'slow result' };
      };

      stepRegistry.executors.set('SlowStep', slowExecutor);

      const results = await parallelEngine.executeStepsParallel(['SlowStep'], {});

      expect(results[0].isTimeout).toBe(true);
      expect(results[0].success).toBe(false);
    });
  });

  describe('StepRegistry Integration', () => {
    test('should execute mixed steps with parallel optimization', async () => {
      // Mock step executors
      const mockExecutors = {
        'IDESendMessageStep': async () => ({ success: true, data: 'message sent' }),
        'GetChatHistoryStep': async () => ({ success: true, data: 'chat history' }),
        'CreateChatStep': async () => ({ success: true, data: 'chat created' }),
        'GitGetStatusStep': async () => ({ success: true, data: 'git status' })
      };

      // Register mock executors
      Object.entries(mockExecutors).forEach(([stepName, executor]) => {
        stepRegistry.executors.set(stepName, executor);
      });

      const stepNames = [
        'IDESendMessageStep',
        'GetChatHistoryStep',
        'CreateChatStep',
        'GitGetStatusStep'
      ];

      const results = await stepRegistry.executeSteps(stepNames, {});

      expect(results.executionMode).toBe('hybrid');
      expect(results.classification.criticalCount).toBe(2);
      expect(results.classification.nonCriticalCount).toBe(2);
      expect(results.classification.parallelizationRatio).toBe(0.5);
      expect(results.successful).toHaveLength(4);
      expect(results.failed).toHaveLength(0);
    });

    test('should fallback to sequential execution on error', async () => {
      // Mock step executors
      const mockExecutors = {
        'GetChatHistoryStep': async () => ({ success: true, data: 'chat history' }),
        'GitGetStatusStep': async () => ({ success: true, data: 'git status' })
      };

      // Register mock executors
      Object.entries(mockExecutors).forEach(([stepName, executor]) => {
        stepRegistry.executors.set(stepName, executor);
      });

      // Mock parallel engine to throw error
      stepRegistry.parallelEngine.executeStepsParallel = async () => {
        throw new Error('Parallel execution failed');
      };

      const stepNames = ['GetChatHistoryStep', 'GitGetStatusStep'];
      const results = await stepRegistry.executeSteps(stepNames, {});

      expect(results.executionMode).toBe('sequential');
      expect(results.successful).toHaveLength(2);
      expect(results.failed).toHaveLength(0);
    });

    test('should track execution statistics', async () => {
      // Mock step executors
      const mockExecutors = {
        'IDESendMessageStep': async () => ({ success: true, data: 'message sent' }),
        'GetChatHistoryStep': async () => ({ success: true, data: 'chat history' }),
        'GitGetStatusStep': async () => ({ success: true, data: 'git status' })
      };

      // Register mock executors
      Object.entries(mockExecutors).forEach(([stepName, executor]) => {
        stepRegistry.executors.set(stepName, executor);
      });

      const stepNames = [
        'IDESendMessageStep',
        'GetChatHistoryStep',
        'GitGetStatusStep'
      ];

      await stepRegistry.executeSteps(stepNames, {});

      const stats = stepRegistry.getExecutionStatistics();
      expect(stats.totalExecutions).toBe(1);
      expect(stats.sequentialExecutions).toBe(1);
      expect(stats.parallelExecutions).toBe(2);
      expect(stats.parallelizationRatio).toBe('66.67%');
    });
  });

  describe('Performance Validation', () => {
    test('should demonstrate performance improvement', async () => {
      // Mock step executors with realistic timing
      const mockExecutors = {
        'GetChatHistoryStep': async () => {
          await new Promise(resolve => setTimeout(resolve, 117)); // 117ms
          return { success: true, data: 'chat history' };
        },
        'GitGetStatusStep': async () => {
          await new Promise(resolve => setTimeout(resolve, 19)); // 19ms
          return { success: true, data: 'git status' };
        },
        'GitGetCurrentBranchStep': async () => {
          await new Promise(resolve => setTimeout(resolve, 9)); // 9ms
          return { success: true, data: 'git branch' };
        }
      };

      // Register mock executors
      Object.entries(mockExecutors).forEach(([stepName, executor]) => {
        stepRegistry.executors.set(stepName, executor);
      });

      const stepNames = ['GetChatHistoryStep', 'GitGetStatusStep', 'GitGetCurrentBranchStep'];

      // Test sequential execution
      const sequentialStart = Date.now();
      const sequentialResults = await stepRegistry.executeStepsSequential(stepNames, {});
      const sequentialDuration = Date.now() - sequentialStart;

      // Test parallel execution
      const parallelStart = Date.now();
      const parallelResults = await stepRegistry.executeSteps(stepNames, {});
      const parallelDuration = Date.now() - parallelStart;

      // Verify performance improvement
      expect(parallelDuration).toBeLessThan(sequentialDuration);
      expect(parallelResults.classification.parallelizationRatio).toBe(1.0);
      expect(parallelResults.successful).toHaveLength(3);
      expect(sequentialResults.successful).toHaveLength(3);

      console.log(`Sequential: ${sequentialDuration}ms, Parallel: ${parallelDuration}ms`);
      console.log(`Performance improvement: ${Math.round((1 - parallelDuration / sequentialDuration) * 100)}%`);
    });
  });

  describe('Error Handling', () => {
    test('should handle classification errors gracefully', () => {
      // Mock classifier to throw error
      stepRegistry.stepClassifier.classifySteps = () => {
        throw new Error('Classification error');
      };

      const stepNames = ['GetChatHistoryStep', 'GitGetStatusStep'];
      
      expect(async () => {
        await stepRegistry.executeSteps(stepNames, {});
      }).not.toThrow();
    });

    test('should handle parallel execution errors gracefully', async () => {
      // Mock step executors
      const mockExecutors = {
        'GetChatHistoryStep': async () => ({ success: true, data: 'chat history' }),
        'GitGetStatusStep': async () => ({ success: true, data: 'git status' })
      };

      // Register mock executors
      Object.entries(mockExecutors).forEach(([stepName, executor]) => {
        stepRegistry.executors.set(stepName, executor);
      });

      // Mock parallel engine to throw error
      stepRegistry.parallelEngine.executeStepsParallel = async () => {
        throw new Error('Parallel execution failed');
      };

      const stepNames = ['GetChatHistoryStep', 'GitGetStatusStep'];
      const results = await stepRegistry.executeSteps(stepNames, {});

      expect(results.executionMode).toBe('sequential');
      expect(results.successful).toHaveLength(2);
    });
  });
}); 