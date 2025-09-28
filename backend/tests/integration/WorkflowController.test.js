const request = require('supertest');
const express = require('express');
const { validationResult } = require('express-validator');

// Mock dependencies
jest.mock('@steps', () => ({
  getStepRegistry: jest.fn()
}));

jest.mock('@logging/Logger', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }))
}));

const WorkflowController = require('@/presentation/api/WorkflowController');

describe('WorkflowController - Task Review Mode', () => {
  let app;
  let workflowController;
  let mockStepRegistry;
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create Express app
    app = express();
    app.use(express.json());
    
    // Mock StepRegistry
    mockStepRegistry = {
      executeStep: jest.fn()
    };
    
    // Mock Logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };
    
    // Create WorkflowController instance
    workflowController = new WorkflowController({
      logger: mockLogger,
      stepRegistry: mockStepRegistry
    });
    
    // Setup route
    app.post('/api/projects/:projectId/workflow/execute', (req, res) => {
      workflowController.executeWorkflow(req, res);
    });
  });

  describe('POST /api/projects/:projectId/workflow/execute - task-review mode', () => {
    const projectId = 'test-project-123';
    const workspacePath = '/path/to/workspace';
    const userId = 'test-user-456';

    const mockTasks = [
      {
        id: 'task-1',
        title: 'Review Task 1',
        priority: { value: 'high' },
        status: { value: 'pending' }
      },
      {
        id: 'task-2',
        title: 'Review Task 2',
        priority: { value: 'medium' },
        status: { value: 'in-progress' }
      }
    ];

    const mockStepResult = {
      success: true,
      result: 'Task processed successfully'
    };

    beforeEach(() => {
      mockStepRegistry.executeStep.mockResolvedValue(mockStepResult);
    });

    it('successfully executes task review workflow', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/workflow/execute`)
        .send({
          projectPath: workspacePath,
          mode: 'task-review',
          tasks: mockTasks,
          options: {
            workflowPrompt: 'task-check-state.md',
            autoExecute: true
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Task review completed: 2/2 tasks processed successfully');
      expect(response.body.data.results).toHaveLength(2);
      expect(response.body.data.summary.totalTasks).toBe(2);
      expect(response.body.data.summary.completedTasks).toBe(2);
      expect(response.body.data.summary.failedTasks).toBe(0);
    });

    it('processes tasks sequentially', async () => {
      await request(app)
        .post(`/api/projects/${projectId}/workflow/execute`)
        .send({
          projectPath: workspacePath,
          mode: 'task-review',
          tasks: mockTasks,
          options: {
            workflowPrompt: 'task-check-state.md',
            autoExecute: true
          }
        })
        .expect(200);

      expect(mockStepRegistry.executeStep).toHaveBeenCalledTimes(2);
      
      // Verify first task call
      expect(mockStepRegistry.executeStep).toHaveBeenNthCalledWith(1, 'IDESendMessageStep', {
        projectId,
        userId,
        workspacePath,
        message: 'task-check-state.md',
        taskData: mockTasks[0],
        options: {
          taskIndex: 1,
          totalTasks: 2,
          workflowPrompt: 'task-check-state.md'
        }
      });

      // Verify second task call
      expect(mockStepRegistry.executeStep).toHaveBeenNthCalledWith(2, 'IDESendMessageStep', {
        projectId,
        userId,
        workspacePath,
        message: 'task-check-state.md',
        taskData: mockTasks[1],
        options: {
          taskIndex: 2,
          totalTasks: 2,
          workflowPrompt: 'task-check-state.md'
        }
      });
    });

    it('handles individual task failures gracefully', async () => {
      mockStepRegistry.executeStep
        .mockResolvedValueOnce(mockStepResult) // First task succeeds
        .mockRejectedValueOnce(new Error('Step execution failed')); // Second task fails

      const response = await request(app)
        .post(`/api/projects/${projectId}/workflow/execute`)
        .send({
          projectPath: workspacePath,
          mode: 'task-review',
          tasks: mockTasks,
          options: {
            workflowPrompt: 'task-check-state.md',
            autoExecute: true
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true); // Should still succeed if at least one task succeeds
      expect(response.body.data.summary.completedTasks).toBe(1);
      expect(response.body.data.summary.failedTasks).toBe(1);
      
      // Check individual results
      expect(response.body.data.results[0].success).toBe(true);
      expect(response.body.data.results[1].success).toBe(false);
      expect(response.body.data.results[1].error).toBe('Step execution failed');
    });

    it('returns failure when all tasks fail', async () => {
      mockStepRegistry.executeStep.mockRejectedValue(new Error('All tasks failed'));

      const response = await request(app)
        .post(`/api/projects/${projectId}/workflow/execute`)
        .send({
          projectPath: workspacePath,
          mode: 'task-review',
          tasks: mockTasks,
          options: {
            workflowPrompt: 'task-check-state.md',
            autoExecute: true
          }
        })
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.data.summary.completedTasks).toBe(0);
      expect(response.body.data.summary.failedTasks).toBe(2);
    });

    it('handles empty tasks array', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/workflow/execute`)
        .send({
          projectPath: workspacePath,
          mode: 'task-review',
          tasks: [],
          options: {
            workflowPrompt: 'task-check-state.md',
            autoExecute: true
          }
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No tasks provided for review');
    });

    it('uses default workflow prompt when not provided', async () => {
      await request(app)
        .post(`/api/projects/${projectId}/workflow/execute`)
        .send({
          projectPath: workspacePath,
          mode: 'task-review',
          tasks: [mockTasks[0]]
        })
        .expect(200);

      expect(mockStepRegistry.executeStep).toHaveBeenCalledWith('IDESendMessageStep', 
        expect.objectContaining({
          message: 'task-check-state.md'
        })
      );
    });

    it('uses custom workflow prompt when provided', async () => {
      const customPrompt = 'custom-review-prompt.md';
      
      await request(app)
        .post(`/api/projects/${projectId}/workflow/execute`)
        .send({
          projectPath: workspacePath,
          mode: 'task-review',
          tasks: [mockTasks[0]],
          options: {
            workflowPrompt: customPrompt
          }
        })
        .expect(200);

      expect(mockStepRegistry.executeStep).toHaveBeenCalledWith('IDESendMessageStep', 
        expect.objectContaining({
          message: customPrompt
        })
      );
    });

    it('logs execution details', async () => {
      await request(app)
        .post(`/api/projects/${projectId}/workflow/execute`)
        .send({
          projectPath: workspacePath,
          mode: 'task-review',
          tasks: mockTasks,
          options: {
            workflowPrompt: 'task-check-state.md',
            autoExecute: true
          }
        })
        .expect(200);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'WorkflowController: Starting task review workflow',
        {
          taskCount: mockTasks.length,
          workflowPrompt: 'task-check-state.md',
          projectId,
          userId
        }
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'WorkflowController: Task review workflow completed',
        {
          totalTasks: 2,
          successfulTasks: 2,
          failedTasks: 0,
          projectId,
          userId
        }
      );
    });

    it('logs individual task processing', async () => {
      await request(app)
        .post(`/api/projects/${projectId}/workflow/execute`)
        .send({
          projectPath: workspacePath,
          mode: 'task-review',
          tasks: mockTasks,
          options: {
            workflowPrompt: 'task-check-state.md',
            autoExecute: true
          }
        })
        .expect(200);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'WorkflowController: Processing task 1/2',
        {
          taskId: mockTasks[0].id,
          taskTitle: mockTasks[0].title,
          projectId,
          userId
        }
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'WorkflowController: Processing task 2/2',
        {
          taskId: mockTasks[1].id,
          taskTitle: mockTasks[1].title,
          projectId,
          userId
        }
      );
    });

    it('logs task processing errors', async () => {
      const error = new Error('Step execution failed');
      mockStepRegistry.executeStep.mockRejectedValue(error);

      await request(app)
        .post(`/api/projects/${projectId}/workflow/execute`)
        .send({
          projectPath: workspacePath,
          mode: 'task-review',
          tasks: [mockTasks[0]],
          options: {
            workflowPrompt: 'task-check-state.md',
            autoExecute: true
          }
        })
        .expect(200);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'WorkflowController: Failed to process task 1',
        {
          taskId: mockTasks[0].id,
          error: error.message,
          projectId,
          userId
        }
      );
    });

    it('handles workflow execution errors', async () => {
      const error = new Error('Workflow execution failed');
      mockStepRegistry.executeStep.mockRejectedValue(error);

      const response = await request(app)
        .post(`/api/projects/${projectId}/workflow/execute`)
        .send({
          projectPath: workspacePath,
          mode: 'task-review',
          tasks: mockTasks,
          options: {
            workflowPrompt: 'task-check-state.md',
            autoExecute: true
          }
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Task review workflow failed');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'WorkflowController: Task review workflow failed',
        {
          error: error.message,
          projectId,
          userId
        }
      );
    });
  });

  describe('Integration with other modes', () => {
    it('does not interfere with other workflow modes', async () => {
      const response = await request(app)
        .post('/api/projects/test-project/workflow/execute')
        .send({
          projectPath: '/path/to/workspace',
          mode: 'analysis',
          options: {}
        })
        .expect(200);

      // Should not execute task-review logic
      expect(mockStepRegistry.executeStep).not.toHaveBeenCalledWith(
        'IDESendMessageStep',
        expect.any(Object)
      );
    });
  });
});
