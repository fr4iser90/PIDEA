/**
 * TaskController.test.js
 * Integration tests for TaskController sync-manual API
 * Created: 2025-10-04T00:25:45.000Z
 */

const request = require('supertest');
const express = require('express');
const TaskController = require('@presentation/api/TaskController');
const TaskApplicationService = require('@application/services/TaskApplicationService');
const TaskStatusSyncStep = require('@domain/steps/categories/task/task_status_sync_step');

// Mock dependencies
jest.mock('@application/services/TaskApplicationService');
jest.mock('@domain/steps/categories/task/task_status_sync_step');

describe('TaskController Sync Integration', () => {
  let app;
  let taskController;
  let mockTaskApplicationService;
  let mockTaskStatusSyncStep;

  beforeEach(() => {
    // Create mock TaskApplicationService
    mockTaskApplicationService = {
      syncManualTasks: jest.fn(),
      taskRepository: {
        findByProjectId: jest.fn()
      }
    };

    // Create mock TaskStatusSyncStep
    mockTaskStatusSyncStep = {
      execute: jest.fn()
    };

    TaskApplicationService.mockImplementation(() => mockTaskApplicationService);
    TaskStatusSyncStep.mockImplementation(() => mockTaskStatusSyncStep);

    // Create Express app with TaskController
    app = express();
    app.use(express.json());
    
    taskController = new TaskController(mockTaskApplicationService);
    
    // Add routes
    app.post('/api/projects/:projectId/tasks/sync-manual', (req, res) => {
      req.user = { id: 'test-user-id' };
      taskController.syncManualTasks(req, res);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/projects/:projectId/tasks/sync-manual', () => {
    test('should sync manual tasks successfully', async () => {
      // Mock successful sync
      mockTaskApplicationService.syncManualTasks.mockResolvedValue({
        success: true,
        importedCount: 5,
        message: 'Tasks synced successfully'
      });

      // Mock task repository response
      mockTaskApplicationService.taskRepository.findByProjectId.mockResolvedValue([
        { id: 'task-1', status: { value: 'pending' } },
        { id: 'task-2', status: { value: 'completed' } }
      ]);

      // Mock TaskStatusSyncStep execution
      mockTaskStatusSyncStep.execute.mockResolvedValue({
        success: true,
        processedTasks: 2,
        statusValidation: {
          totalTasks: 2,
          validTasks: 1,
          invalidTasks: 0
        }
      });

      const response = await request(app)
        .post('/api/projects/test-project-id/tasks/sync-manual')
        .send({ projectPath: '/test/project' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.importedCount).toBe(5);
      expect(response.body.data.statusValidation).toBeDefined();
      expect(response.body.data.statusValidation.totalTasks).toBe(2);
    });

    test('should handle sync errors gracefully', async () => {
      mockTaskApplicationService.syncManualTasks.mockRejectedValue(
        new Error('Sync failed')
      );

      const response = await request(app)
        .post('/api/projects/test-project-id/tasks/sync-manual')
        .send({ projectPath: '/test/project' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to sync manual tasks');
    });

    test('should validate task statuses after sync', async () => {
      mockTaskApplicationService.syncManualTasks.mockResolvedValue({
        success: true,
        importedCount: 3
      });

      mockTaskApplicationService.taskRepository.findByProjectId.mockResolvedValue([
        { id: 'task-1', status: { value: 'pending' } },
        { id: 'task-2', status: { value: 'completed' } },
        { id: 'task-3', status: { value: 'running' } }
      ]);

      mockTaskStatusSyncStep.execute.mockResolvedValue({
        success: true,
        processedTasks: 3,
        statusValidation: {
          totalTasks: 3,
          validTasks: 2,
          invalidTasks: 1
        }
      });

      const response = await request(app)
        .post('/api/projects/test-project-id/tasks/sync-manual')
        .send({ projectPath: '/test/project' })
        .expect(200);

      expect(mockTaskStatusSyncStep.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          getService: expect.any(Function)
        }),
        expect.objectContaining({
          operation: 'sync',
          taskIds: ['task-1', 'task-2', 'task-3'],
          options: expect.objectContaining({
            validateTransitions: true,
            moveFiles: true,
            emitEvents: true
          })
        })
      );

      expect(response.body.data.statusValidation.invalidTasks).toBe(1);
    });

    test('should handle TaskStatusSyncStep errors', async () => {
      mockTaskApplicationService.syncManualTasks.mockResolvedValue({
        success: true,
        importedCount: 2
      });

      mockTaskApplicationService.taskRepository.findByProjectId.mockResolvedValue([
        { id: 'task-1', status: { value: 'pending' } }
      ]);

      mockTaskStatusSyncStep.execute.mockRejectedValue(
        new Error('Status sync failed')
      );

      const response = await request(app)
        .post('/api/projects/test-project-id/tasks/sync-manual')
        .send({ projectPath: '/test/project' })
        .expect(200);

      // Should still return success for main sync, but log the error
      expect(response.body.success).toBe(true);
      expect(response.body.data.importedCount).toBe(2);
    });

    test('should handle empty task list', async () => {
      mockTaskApplicationService.syncManualTasks.mockResolvedValue({
        success: true,
        importedCount: 0
      });

      mockTaskApplicationService.taskRepository.findByProjectId.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/projects/test-project-id/tasks/sync-manual')
        .send({ projectPath: '/test/project' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.importedCount).toBe(0);
      expect(mockTaskStatusSyncStep.execute).not.toHaveBeenCalled();
    });

    test('should require project ID', async () => {
      const response = await request(app)
        .post('/api/projects//tasks/sync-manual')
        .send({ projectPath: '/test/project' })
        .expect(404);

      expect(response.body.success).toBeUndefined();
    });

    test('should handle missing project path', async () => {
      mockTaskApplicationService.syncManualTasks.mockResolvedValue({
        success: true,
        importedCount: 0
      });

      const response = await request(app)
        .post('/api/projects/test-project-id/tasks/sync-manual')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Status Validation Integration', () => {
    test('should provide correct context to TaskStatusSyncStep', async () => {
      mockTaskApplicationService.syncManualTasks.mockResolvedValue({
        success: true,
        importedCount: 1
      });

      mockTaskApplicationService.taskRepository.findByProjectId.mockResolvedValue([
        { id: 'task-1', status: { value: 'pending' } }
      ]);

      mockTaskStatusSyncStep.execute.mockResolvedValue({
        success: true,
        processedTasks: 1
      });

      await request(app)
        .post('/api/projects/test-project-id/tasks/sync-manual')
        .send({ projectPath: '/test/project' })
        .expect(200);

      const contextCall = mockTaskStatusSyncStep.execute.mock.calls[0][0];
      const context = contextCall.getService('taskRepository');
      
      expect(context).toBe(mockTaskApplicationService.taskRepository);
    });

    test('should pass correct options to TaskStatusSyncStep', async () => {
      mockTaskApplicationService.syncManualTasks.mockResolvedValue({
        success: true,
        importedCount: 1
      });

      mockTaskApplicationService.taskRepository.findByProjectId.mockResolvedValue([
        { id: 'task-1', status: { value: 'pending' } }
      ]);

      mockTaskStatusSyncStep.execute.mockResolvedValue({
        success: true,
        processedTasks: 1
      });

      await request(app)
        .post('/api/projects/test-project-id/tasks/sync-manual')
        .send({ projectPath: '/test/project' })
        .expect(200);

      const optionsCall = mockTaskStatusSyncStep.execute.mock.calls[0][1];
      
      expect(optionsCall).toMatchObject({
        operation: 'sync',
        taskIds: ['task-1'],
        sourceSystem: 'manual',
        targetSystem: 'automated',
        options: {
          validateTransitions: true,
          moveFiles: true,
          emitEvents: true,
          createBackup: true
        }
      });
    });
  });
});
