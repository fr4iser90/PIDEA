/**
 * Task Status Sync Step - Integration Tests
 * End-to-end integration tests for TaskStatusSyncStep
 * Created: 2025-09-28T17:54:16.000Z
 */

const TaskStatusSyncStep = require('@domain/steps/categories/task/task_status_sync_step');
const TaskRepository = require('@domain/repositories/TaskRepository');
const TaskStatusTransitionService = require('@domain/services/task/TaskStatusTransitionService');
const EventBus = require('@domain/services/shared/EventBus');
const Logger = require('@logging/Logger');

describe('TaskStatusSyncStep Integration Tests', () => {
  let step;
  let taskRepository;
  let statusTransitionService;
  let eventBus;
  let context;

  beforeAll(async () => {
    // Initialize real services for integration testing
    step = new TaskStatusSyncStep();
    
    // Mock database connection for testing
    const mockDatabase = {
      query: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn()
    };

    // Initialize services with mock dependencies
    taskRepository = new (require('@infrastructure/database/PostgreSQLTaskRepository'))(mockDatabase);
    statusTransitionService = new TaskStatusTransitionService(taskRepository, null, null);
    eventBus = new EventBus();

    // Create context with real services
    context = {
      getService: jest.fn((serviceName) => {
        const serviceMap = {
          'taskRepository': taskRepository,
          'statusTransitionService': statusTransitionService,
          'eventBus': eventBus
        };
        return serviceMap[serviceName];
      })
    };
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('Service Integration', () => {
    it('should integrate with TaskRepository', async () => {
      const config = TaskStatusSyncStep.getConfig();
      expect(config.dependencies).toContain('TaskRepository');
      
      const services = step.getRequiredServices(context);
      expect(services.taskRepository).toBeDefined();
      expect(services.taskRepository).toBeInstanceOf(TaskRepository);
    });

    it('should integrate with TaskStatusTransitionService', async () => {
      const config = TaskStatusSyncStep.getConfig();
      expect(config.dependencies).toContain('TaskStatusTransitionService');
      
      const services = step.getRequiredServices(context);
      expect(services.statusTransitionService).toBeDefined();
      expect(services.statusTransitionService).toBeInstanceOf(TaskStatusTransitionService);
    });

    it('should integrate with EventBus', async () => {
      const config = TaskStatusSyncStep.getConfig();
      expect(config.dependencies).toContain('EventBus');
      
      const services = step.getRequiredServices(context);
      expect(services.eventBus).toBeDefined();
      expect(services.eventBus).toBeInstanceOf(EventBus);
    });
  });

  describe('End-to-End Workflows', () => {
    it('should handle complete sync workflow', async () => {
      // Mock task data
      const mockTask = {
        id: 'integration-test-task',
        title: 'Integration Test Task',
        status: { value: 'pending' },
        priority: { value: 'medium' },
        category: 'test',
        updateStatus: jest.fn()
      };

      // Mock repository methods
      taskRepository.findById = jest.fn().mockResolvedValue(mockTask);
      taskRepository.update = jest.fn().mockResolvedValue(mockTask);

      // Mock status transition service
      statusTransitionService.moveTaskToInProgress = jest.fn().mockResolvedValue({ success: true });

      // Mock event bus
      eventBus.emit = jest.fn().mockResolvedValue({ success: true });

      // Execute sync
      const options = {
        operation: 'sync',
        taskId: 'integration-test-task',
        targetStatus: 'in-progress',
        sourceSystem: 'test',
        targetSystem: 'integration'
      };

      const result = await step.execute(context, options);

      // Verify results
      expect(result.success).toBe(true);
      expect(result.taskId).toBe('integration-test-task');
      expect(result.oldStatus).toBe('pending');
      expect(result.newStatus).toBe('in-progress');

      // Verify service calls
      expect(taskRepository.findById).toHaveBeenCalledWith('integration-test-task');
      expect(taskRepository.update).toHaveBeenCalledWith('integration-test-task', mockTask);
      expect(statusTransitionService.moveTaskToInProgress).toHaveBeenCalledWith('integration-test-task');
      expect(eventBus.emit).toHaveBeenCalledWith(expect.objectContaining({
        type: 'task.status.synced',
        taskId: 'integration-test-task',
        oldStatus: 'pending',
        newStatus: 'in-progress'
      }));
    });

    it('should handle batch sync workflow', async () => {
      // Mock multiple tasks
      const mockTasks = [
        { id: 'task-1', status: { value: 'pending' }, updateStatus: jest.fn() },
        { id: 'task-2', status: { value: 'pending' }, updateStatus: jest.fn() },
        { id: 'task-3', status: { value: 'pending' }, updateStatus: jest.fn() }
      ];

      // Mock repository methods
      taskRepository.findById = jest.fn().mockImplementation((id) => {
        const task = mockTasks.find(t => t.id === id);
        return Promise.resolve(task);
      });
      taskRepository.update = jest.fn().mockResolvedValue({});

      // Mock status transition service
      statusTransitionService.moveTaskToInProgress = jest.fn().mockResolvedValue({ success: true });

      // Mock event bus
      eventBus.emit = jest.fn().mockResolvedValue({ success: true });

      // Execute batch sync
      const options = {
        operation: 'batch-sync',
        taskIds: ['task-1', 'task-2', 'task-3'],
        targetStatus: 'in-progress',
        batchSize: 2
      };

      const result = await step.execute(context, options);

      // Verify results
      expect(result.success).toBe(true);
      expect(result.operation).toBe('batch-sync');
      expect(result.processedTasks).toBe(3);
      expect(result.successfulTasks).toBe(3);
      expect(result.failedTasks).toBe(0);

      // Verify service calls
      expect(taskRepository.findById).toHaveBeenCalledTimes(3);
      expect(taskRepository.update).toHaveBeenCalledTimes(3);
      expect(statusTransitionService.moveTaskToInProgress).toHaveBeenCalledTimes(3);
      expect(eventBus.emit).toHaveBeenCalledTimes(3);
    });

    it('should handle validation workflow', async () => {
      // Mock tasks with different statuses
      const mockTasks = [
        { id: 'task-1', status: { value: 'pending' } },
        { id: 'task-2', status: { value: 'in-progress' } },
        { id: 'task-3', status: { value: 'completed' } }
      ];

      // Mock repository methods
      taskRepository.findById = jest.fn().mockImplementation((id) => {
        const task = mockTasks.find(t => t.id === id);
        return Promise.resolve(task);
      });

      // Execute validation
      const options = {
        operation: 'validate',
        taskIds: ['task-1', 'task-2', 'task-3'],
        targetStatus: 'in-progress'
      };

      const result = await step.execute(context, options);

      // Verify results
      expect(result.success).toBe(true);
      expect(result.operation).toBe('validate');
      expect(result.totalTasks).toBe(3);
      expect(result.validTasks).toBe(2); // task-1 and task-2 can transition to in-progress
      expect(result.invalidTasks).toBe(1); // task-3 cannot transition from completed

      // Verify validation results
      const task1Result = result.results.find(r => r.taskId === 'task-1');
      const task2Result = result.results.find(r => r.taskId === 'task-2');
      const task3Result = result.results.find(r => r.taskId === 'task-3');

      expect(task1Result.valid).toBe(true);
      expect(task2Result.valid).toBe(true);
      expect(task3Result.valid).toBe(false);
    });

    it('should handle rollback workflow', async () => {
      // Mock tasks
      const mockTasks = [
        { id: 'task-1', status: { value: 'in-progress' }, updateStatus: jest.fn() },
        { id: 'task-2', status: { value: 'completed' }, updateStatus: jest.fn() }
      ];

      // Mock repository methods
      taskRepository.findById = jest.fn().mockImplementation((id) => {
        const task = mockTasks.find(t => t.id === id);
        return Promise.resolve(task);
      });
      taskRepository.update = jest.fn().mockResolvedValue({});

      // Mock status transition service
      statusTransitionService.moveTaskToPending = jest.fn().mockResolvedValue({ success: true });

      // Mock event bus
      eventBus.emit = jest.fn().mockResolvedValue({ success: true });

      // Execute rollback
      const options = {
        operation: 'rollback',
        taskIds: ['task-1', 'task-2'],
        previousStatus: 'pending'
      };

      const result = await step.execute(context, options);

      // Verify results
      expect(result.success).toBe(true);
      expect(result.operation).toBe('rollback');
      expect(result.totalTasks).toBe(2);
      expect(result.successfulRollbacks).toBe(2);
      expect(result.failedRollbacks).toBe(0);

      // Verify service calls
      expect(taskRepository.findById).toHaveBeenCalledTimes(2);
      expect(taskRepository.update).toHaveBeenCalledTimes(2);
      expect(statusTransitionService.moveTaskToPending).toHaveBeenCalledTimes(2);
      expect(eventBus.emit).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle service failures gracefully', async () => {
      // Mock task
      const mockTask = {
        id: 'error-test-task',
        status: { value: 'pending' },
        updateStatus: jest.fn()
      };

      // Mock repository methods
      taskRepository.findById = jest.fn().mockResolvedValue(mockTask);
      taskRepository.update = jest.fn().mockRejectedValue(new Error('Database update failed'));

      // Execute sync
      const options = {
        operation: 'sync',
        taskId: 'error-test-task',
        targetStatus: 'in-progress'
      };

      await expect(step.execute(context, options))
        .rejects.toThrow('Database update failed');
    });

    it('should handle partial failures in batch operations', async () => {
      // Mock tasks
      const mockTasks = [
        { id: 'task-1', status: { value: 'pending' }, updateStatus: jest.fn() },
        { id: 'task-2', status: { value: 'pending' }, updateStatus: jest.fn() }
      ];

      // Mock repository methods with partial failure
      taskRepository.findById = jest.fn().mockImplementation((id) => {
        if (id === 'task-2') {
          return Promise.reject(new Error('Task not found'));
        }
        const task = mockTasks.find(t => t.id === id);
        return Promise.resolve(task);
      });
      taskRepository.update = jest.fn().mockResolvedValue({});

      // Mock status transition service
      statusTransitionService.moveTaskToInProgress = jest.fn().mockResolvedValue({ success: true });

      // Mock event bus
      eventBus.emit = jest.fn().mockResolvedValue({ success: true });

      // Execute batch sync
      const options = {
        operation: 'batch-sync',
        taskIds: ['task-1', 'task-2'],
        targetStatus: 'in-progress'
      };

      const result = await step.execute(context, options);

      // Verify partial failure handling
      expect(result.success).toBe(false);
      expect(result.processedTasks).toBe(2);
      expect(result.successfulTasks).toBe(1);
      expect(result.failedTasks).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].taskId).toBe('task-2');
    });
  });

  describe('Performance Integration', () => {
    it('should handle large batch operations efficiently', async () => {
      const batchSize = 100;
      const taskIds = Array.from({ length: batchSize }, (_, i) => `task-${i + 1}`);

      // Mock tasks
      const mockTasks = taskIds.map(id => ({
        id,
        status: { value: 'pending' },
        updateStatus: jest.fn()
      }));

      // Mock repository methods
      taskRepository.findById = jest.fn().mockImplementation((id) => {
        const task = mockTasks.find(t => t.id === id);
        return Promise.resolve(task);
      });
      taskRepository.update = jest.fn().mockResolvedValue({});

      // Mock status transition service
      statusTransitionService.moveTaskToInProgress = jest.fn().mockResolvedValue({ success: true });

      // Mock event bus
      eventBus.emit = jest.fn().mockResolvedValue({ success: true });

      // Execute batch sync
      const options = {
        operation: 'batch-sync',
        taskIds,
        targetStatus: 'in-progress',
        batchSize: 50
      };

      const startTime = Date.now();
      const result = await step.execute(context, options);
      const endTime = Date.now();

      // Verify results
      expect(result.success).toBe(true);
      expect(result.processedTasks).toBe(batchSize);
      expect(result.successfulTasks).toBe(batchSize);
      expect(result.failedTasks).toBe(0);

      // Verify performance (should complete within reasonable time)
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify service calls
      expect(taskRepository.findById).toHaveBeenCalledTimes(batchSize);
      expect(taskRepository.update).toHaveBeenCalledTimes(batchSize);
      expect(statusTransitionService.moveTaskToInProgress).toHaveBeenCalledTimes(batchSize);
      expect(eventBus.emit).toHaveBeenCalledTimes(batchSize);
    });
  });

  describe('Configuration Integration', () => {
    it('should work with StepRegistry', async () => {
      const config = TaskStatusSyncStep.getConfig();
      
      // Verify config structure
      expect(config).toHaveProperty('name');
      expect(config).toHaveProperty('type');
      expect(config).toHaveProperty('description');
      expect(config).toHaveProperty('category');
      expect(config).toHaveProperty('version');
      expect(config).toHaveProperty('dependencies');
      expect(config).toHaveProperty('settings');
      expect(config).toHaveProperty('validation');

      // Verify config values
      expect(config.name).toBe('TaskStatusSyncStep');
      expect(config.type).toBe('sync');
      expect(config.category).toBe('task');
      expect(config.dependencies).toEqual(['TaskRepository', 'TaskStatusTransitionService', 'EventBus']);
    });

    it('should export execute function for StepRegistry', async () => {
      const TaskStatusSyncStepModule = require('@domain/steps/categories/task/task_status_sync_step');
      
      expect(TaskStatusSyncStepModule).toHaveProperty('config');
      expect(TaskStatusSyncStepModule).toHaveProperty('execute');
      expect(typeof TaskStatusSyncStepModule.execute).toBe('function');
    });
  });
});
