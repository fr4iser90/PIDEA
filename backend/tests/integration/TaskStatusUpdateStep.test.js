/**
 * TaskStatusUpdateStep Integration Tests
 * Integration tests for TaskStatusUpdateStep with real services
 */

const TaskStatusUpdateStep = require('../../domain/steps/categories/task/task_status_update_step');
const TaskRepository = require('../../domain/repositories/TaskRepository');
const TaskStatusTransitionService = require('../../domain/services/task/TaskStatusTransitionService');
const Logger = require('@logging/Logger');

describe('TaskStatusUpdateStep Integration', () => {
  let step;
  let taskRepository;
  let statusTransitionService;
  let context;

  beforeAll(async () => {
    // Initialize real services
    taskRepository = new TaskRepository();
    statusTransitionService = new TaskStatusTransitionService();
    
    // Create context with real services
    context = {
      getService: (serviceName) => {
        if (serviceName === 'taskRepository') return taskRepository;
        if (serviceName === 'statusTransitionService') return statusTransitionService;
        return null;
      }
    };
    
    step = new TaskStatusUpdateStep();
  });

  describe('Real Service Integration', () => {
    it('should integrate with TaskRepository', async () => {
      // Create a test task
      const testTask = {
        title: 'Integration Test Task',
        status: 'pending',
        priority: 'medium',
        category: 'testing',
        sourcePath: '/test/path'
      };
      
      const createdTask = await taskRepository.create(testTask);
      expect(createdTask).toBeDefined();
      expect(createdTask.id).toBeDefined();
      
      // Test status update
      const options = {
        taskId: createdTask.id,
        newStatus: 'in-progress',
        autoMoveFiles: false, // Skip file movement for integration test
        updateDatabase: true
      };
      
      const result = await step.execute(context, options);
      
      expect(result.success).toBe(true);
      expect(result.taskId).toBe(createdTask.id);
      expect(result.oldStatus).toBe('pending');
      expect(result.newStatus).toBe('in-progress');
      
      // Verify database update
      const updatedTask = await taskRepository.findById(createdTask.id);
      expect(updatedTask.status).toBe('in-progress');
      
      // Cleanup
      await taskRepository.delete(createdTask.id);
    });

    it('should integrate with TaskStatusTransitionService for file movement', async () => {
      // Create a test task
      const testTask = {
        title: 'File Movement Test Task',
        status: 'pending',
        priority: 'high',
        category: 'testing',
        sourcePath: '/test/pending/task'
      };
      
      const createdTask = await taskRepository.create(testTask);
      
      // Test status update with file movement
      const options = {
        taskId: createdTask.id,
        newStatus: 'completed',
        autoMoveFiles: true,
        updateDatabase: true,
        taskMetadata: { reason: 'Integration test completed' }
      };
      
      const result = await step.execute(context, options);
      
      expect(result.success).toBe(true);
      expect(result.filesMoved).toBe(true);
      expect(result.databaseUpdated).toBe(true);
      
      // Verify database update
      const updatedTask = await taskRepository.findById(createdTask.id);
      expect(updatedTask.status).toBe('completed');
      expect(updatedTask.completed_at).toBeDefined();
      
      // Cleanup
      await taskRepository.delete(createdTask.id);
    });

    it('should handle complex status transitions', async () => {
      // Create a test task
      const testTask = {
        title: 'Complex Transition Test',
        status: 'pending',
        priority: 'medium',
        category: 'testing'
      };
      
      const createdTask = await taskRepository.create(testTask);
      
      // Test multiple transitions
      const transitions = [
        { from: 'pending', to: 'in-progress' },
        { from: 'in-progress', to: 'blocked' },
        { from: 'blocked', to: 'in-progress' },
        { from: 'in-progress', to: 'completed' }
      ];
      
      for (const transition of transitions) {
        const options = {
          taskId: createdTask.id,
          newStatus: transition.to,
          autoMoveFiles: false,
          updateDatabase: true
        };
        
        const result = await step.execute(context, options);
        
        expect(result.success).toBe(true);
        expect(result.oldStatus).toBe(transition.from);
        expect(result.newStatus).toBe(transition.to);
        
        // Verify database state
        const task = await taskRepository.findById(createdTask.id);
        expect(task.status).toBe(transition.to);
      }
      
      // Cleanup
      await taskRepository.delete(createdTask.id);
    });

    it('should handle error scenarios gracefully', async () => {
      // Test with non-existent task
      const options = {
        taskId: 'non-existent-task-id',
        newStatus: 'completed'
      };
      
      await expect(step.execute(context, options)).rejects.toThrow('Task non-existent-task-id not found');
    });

    it('should validate status transitions correctly', async () => {
      // Create a completed task
      const testTask = {
        title: 'Completed Task Test',
        status: 'completed',
        priority: 'low',
        category: 'testing'
      };
      
      const createdTask = await taskRepository.create(testTask);
      
      // Try invalid transition
      const options = {
        taskId: createdTask.id,
        newStatus: 'pending'
      };
      
      await expect(step.execute(context, options)).rejects.toThrow('Invalid status transition from completed to pending');
      
      // Cleanup
      await taskRepository.delete(createdTask.id);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent status updates', async () => {
      // Create multiple test tasks
      const tasks = [];
      for (let i = 0; i < 5; i++) {
        const testTask = {
          title: `Concurrent Test Task ${i}`,
          status: 'pending',
          priority: 'medium',
          category: 'testing'
        };
        const createdTask = await taskRepository.create(testTask);
        tasks.push(createdTask);
      }
      
      // Execute concurrent updates
      const updatePromises = tasks.map((task, index) => {
        const options = {
          taskId: task.id,
          newStatus: index % 2 === 0 ? 'in-progress' : 'completed',
          autoMoveFiles: false,
          updateDatabase: true
        };
        return step.execute(context, options);
      });
      
      const results = await Promise.all(updatePromises);
      
      // Verify all updates succeeded
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.taskId).toBe(tasks[index].id);
      });
      
      // Cleanup
      await Promise.all(tasks.map(task => taskRepository.delete(task.id)));
    });

    it('should complete status update within reasonable time', async () => {
      const testTask = {
        title: 'Performance Test Task',
        status: 'pending',
        priority: 'high',
        category: 'testing'
      };
      
      const createdTask = await taskRepository.create(testTask);
      
      const startTime = Date.now();
      
      const options = {
        taskId: createdTask.id,
        newStatus: 'completed',
        autoMoveFiles: false,
        updateDatabase: true
      };
      
      const result = await step.execute(context, options);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Cleanup
      await taskRepository.delete(createdTask.id);
    });
  });

  describe('Error Recovery', () => {
    it('should handle database errors gracefully', async () => {
      // Create a task
      const testTask = {
        title: 'Error Recovery Test',
        status: 'pending',
        priority: 'medium',
        category: 'testing'
      };
      
      const createdTask = await taskRepository.create(testTask);
      
      // Mock a database error
      const originalUpdate = taskRepository.update;
      taskRepository.update = jest.fn().mockRejectedValue(new Error('Database connection failed'));
      
      const options = {
        taskId: createdTask.id,
        newStatus: 'in-progress',
        autoMoveFiles: false,
        updateDatabase: true
      };
      
      await expect(step.execute(context, options)).rejects.toThrow('Database connection failed');
      
      // Restore original method
      taskRepository.update = originalUpdate;
      
      // Cleanup
      await taskRepository.delete(createdTask.id);
    });

    it('should handle file movement errors gracefully', async () => {
      // Create a task
      const testTask = {
        title: 'File Error Test',
        status: 'pending',
        priority: 'medium',
        category: 'testing'
      };
      
      const createdTask = await taskRepository.create(testTask);
      
      // Mock a file movement error
      const originalMoveToInProgress = statusTransitionService.moveTaskToInProgress;
      statusTransitionService.moveTaskToInProgress = jest.fn().mockRejectedValue(new Error('File system error'));
      
      const options = {
        taskId: createdTask.id,
        newStatus: 'in-progress',
        autoMoveFiles: true,
        updateDatabase: true
      };
      
      await expect(step.execute(context, options)).rejects.toThrow('File system error');
      
      // Restore original method
      statusTransitionService.moveTaskToInProgress = originalMoveToInProgress;
      
      // Cleanup
      await taskRepository.delete(createdTask.id);
    });
  });
});