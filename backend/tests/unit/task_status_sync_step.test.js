/**
 * Task Status Sync Step - Unit Tests
 * Tests for TaskStatusSyncStep functionality
 * Created: 2025-09-28T17:54:16.000Z
 */

const TaskStatusSyncStep = require('@domain/steps/categories/task/task_status_sync_step');
const TaskStatus = require('@domain/value-objects/TaskStatus');

describe('TaskStatusSyncStep', () => {
  let step;
  let mockContext;
  let mockServices;

  beforeEach(() => {
    step = new TaskStatusSyncStep();
    
    // Mock services
    mockServices = {
      taskRepository: {
        findById: jest.fn(),
        update: jest.fn()
      },
      statusTransitionService: {
        moveTaskToCompleted: jest.fn(),
        moveTaskToInProgress: jest.fn(),
        moveTaskToPending: jest.fn(),
        moveTaskToCancelled: jest.fn()
      },
      eventBus: {
        emit: jest.fn()
      }
    };

    // Mock context
    mockContext = {
      getService: jest.fn((serviceName) => {
        const serviceMap = {
          'taskRepository': mockServices.taskRepository,
          'statusTransitionService': mockServices.statusTransitionService,
          'eventBus': mockServices.eventBus
        };
        return serviceMap[serviceName];
      })
    };
  });

  describe('Configuration', () => {
    it('should have correct configuration', () => {
      const config = TaskStatusSyncStep.getConfig();
      
      expect(config.name).toBe('TaskStatusSyncStep');
      expect(config.type).toBe('sync');
      expect(config.description).toBe('Synchronizes task statuses across systems');
      expect(config.category).toBe('task');
      expect(config.version).toBe('1.0.0');
      expect(config.dependencies).toEqual(['TaskRepository', 'TaskStatusTransitionService', 'EventBus']);
    });

    it('should have correct settings', () => {
      const config = TaskStatusSyncStep.getConfig();
      
      expect(config.settings.timeout).toBe(60000);
      expect(config.settings.batchSize).toBe(50);
      expect(config.settings.retryAttempts).toBe(3);
      expect(config.settings.enableFileSync).toBe(true);
      expect(config.settings.enableEventEmission).toBe(true);
    });

    it('should have correct validation rules', () => {
      const config = TaskStatusSyncStep.getConfig();
      
      expect(config.validation.requiredServices).toEqual(['taskRepository', 'statusTransitionService', 'eventBus']);
      expect(config.validation.supportedOperations).toEqual(['sync', 'batch-sync', 'validate', 'rollback']);
    });
  });

  describe('Constructor', () => {
    it('should initialize with correct properties', () => {
      expect(step.name).toBe('TaskStatusSyncStep');
      expect(step.description).toBe('Synchronizes task statuses across systems');
      expect(step.category).toBe('task');
      expect(step.dependencies).toEqual(['TaskRepository', 'TaskStatusTransitionService', 'EventBus']);
    });
  });

  describe('Context Validation', () => {
    it('should validate context with getService method', () => {
      expect(() => step.validateContext(mockContext)).not.toThrow();
    });

    it('should throw error for invalid context', () => {
      expect(() => step.validateContext(null)).toThrow('Invalid context: getService method not available');
      expect(() => step.validateContext({})).toThrow('Invalid context: getService method not available');
    });
  });

  describe('Service Retrieval', () => {
    it('should retrieve all required services', () => {
      const services = step.getRequiredServices(mockContext);
      
      expect(services.taskRepository).toBe(mockServices.taskRepository);
      expect(services.statusTransitionService).toBe(mockServices.statusTransitionService);
      expect(services.eventBus).toBe(mockServices.eventBus);
    });

    it('should throw error for missing TaskRepository', () => {
      mockContext.getService.mockImplementation((serviceName) => {
        if (serviceName === 'taskRepository') return null;
        return mockServices[serviceName];
      });

      expect(() => step.getRequiredServices(mockContext)).toThrow('TaskRepository not available in context');
    });

    it('should throw error for missing TaskStatusTransitionService', () => {
      mockContext.getService.mockImplementation((serviceName) => {
        if (serviceName === 'statusTransitionService') return null;
        return mockServices[serviceName];
      });

      expect(() => step.getRequiredServices(mockContext)).toThrow('TaskStatusTransitionService not available in context');
    });

    it('should throw error for missing EventBus', () => {
      mockContext.getService.mockImplementation((serviceName) => {
        if (serviceName === 'eventBus') return null;
        return mockServices[serviceName];
      });

      expect(() => step.getRequiredServices(mockContext)).toThrow('EventBus not available in context');
    });
  });

  describe('Status Transition Validation', () => {
    it('should validate valid transitions', () => {
      expect(step.validateStatusTransition('pending', 'in-progress')).toBe(true);
      expect(step.validateStatusTransition('pending', 'cancelled')).toBe(true);
      expect(step.validateStatusTransition('in-progress', 'completed')).toBe(true);
      expect(step.validateStatusTransition('in-progress', 'failed')).toBe(true);
      expect(step.validateStatusTransition('blocked', 'pending')).toBe(true);
      expect(step.validateStatusTransition('failed', 'pending')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(step.validateStatusTransition('completed', 'pending')).toBe(false);
      expect(step.validateStatusTransition('cancelled', 'pending')).toBe(false);
      expect(step.validateStatusTransition('pending', 'completed')).toBe(false);
      expect(step.validateStatusTransition('completed', 'in-progress')).toBe(false);
    });

    it('should handle unknown statuses', () => {
      expect(step.validateStatusTransition('unknown', 'pending')).toBe(false);
      expect(step.validateStatusTransition('pending', 'unknown')).toBe(false);
    });
  });

  describe('Single Task Sync', () => {
    const mockTask = {
      id: 'test-task-1',
      status: { value: 'pending' },
      updateStatus: jest.fn()
    };

    beforeEach(() => {
      mockServices.taskRepository.findById.mockResolvedValue(mockTask);
      mockServices.taskRepository.update.mockResolvedValue(mockTask);
    });

    it('should sync single task successfully', async () => {
      const options = {
        taskId: 'test-task-1',
        targetStatus: 'in-progress'
      };

      const result = await step.syncSingleTask(mockContext, mockServices, options);

      expect(result.success).toBe(true);
      expect(result.taskId).toBe('test-task-1');
      expect(result.oldStatus).toBe('pending');
      expect(result.newStatus).toBe('in-progress');
      expect(mockServices.taskRepository.findById).toHaveBeenCalledWith('test-task-1');
      expect(mockServices.taskRepository.update).toHaveBeenCalledWith('test-task-1', mockTask);
    });

    it('should throw error for missing task ID', async () => {
      const options = {
        targetStatus: 'in-progress'
      };

      await expect(step.syncSingleTask(mockContext, mockServices, options))
        .rejects.toThrow('Task ID and target status are required for sync operation');
    });

    it('should throw error for missing target status', async () => {
      const options = {
        taskId: 'test-task-1'
      };

      await expect(step.syncSingleTask(mockContext, mockServices, options))
        .rejects.toThrow('Task ID and target status are required for sync operation');
    });

    it('should throw error for task not found', async () => {
      mockServices.taskRepository.findById.mockResolvedValue(null);

      const options = {
        taskId: 'non-existent-task',
        targetStatus: 'in-progress'
      };

      await expect(step.syncSingleTask(mockContext, mockServices, options))
        .rejects.toThrow('Task non-existent-task not found');
    });

    it('should throw error for invalid status transition', async () => {
      const options = {
        taskId: 'test-task-1',
        targetStatus: 'completed'
      };

      await expect(step.syncSingleTask(mockContext, mockServices, options))
        .rejects.toThrow('Invalid status transition from pending to completed');
    });
  });

  describe('Batch Task Sync', () => {
    const mockTasks = [
      { id: 'task-1', status: { value: 'pending' }, updateStatus: jest.fn() },
      { id: 'task-2', status: { value: 'pending' }, updateStatus: jest.fn() },
      { id: 'task-3', status: { value: 'pending' }, updateStatus: jest.fn() }
    ];

    beforeEach(() => {
      mockServices.taskRepository.findById.mockImplementation((id) => {
        const task = mockTasks.find(t => t.id === id);
        return Promise.resolve(task);
      });
      mockServices.taskRepository.update.mockResolvedValue({});
    });

    it('should sync multiple tasks successfully', async () => {
      const options = {
        taskIds: ['task-1', 'task-2', 'task-3'],
        targetStatus: 'in-progress'
      };

      const result = await step.syncBatchTasks(mockContext, mockServices, options);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('batch-sync');
      expect(result.processedTasks).toBe(3);
      expect(result.successfulTasks).toBe(3);
      expect(result.failedTasks).toBe(0);
      expect(result.results).toHaveLength(3);
    });

    it('should handle partial failures in batch sync', async () => {
      mockServices.taskRepository.findById.mockImplementation((id) => {
        if (id === 'task-2') {
          return Promise.resolve(null); // Simulate task not found
        }
        const task = mockTasks.find(t => t.id === id);
        return Promise.resolve(task);
      });

      const options = {
        taskIds: ['task-1', 'task-2', 'task-3'],
        targetStatus: 'in-progress'
      };

      const result = await step.syncBatchTasks(mockContext, mockServices, options);

      expect(result.success).toBe(false);
      expect(result.processedTasks).toBe(3);
      expect(result.successfulTasks).toBe(2);
      expect(result.failedTasks).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should throw error for missing task IDs', async () => {
      const options = {
        targetStatus: 'in-progress'
      };

      await expect(step.syncBatchTasks(mockContext, mockServices, options))
        .rejects.toThrow('Task IDs array is required for batch sync operation');
    });

    it('should throw error for missing target status', async () => {
      const options = {
        taskIds: ['task-1', 'task-2']
      };

      await expect(step.syncBatchTasks(mockContext, mockServices, options))
        .rejects.toThrow('Target status is required for batch sync operation');
    });
  });

  describe('Validation', () => {
    const mockTasks = [
      { id: 'task-1', status: { value: 'pending' } },
      { id: 'task-2', status: { value: 'in-progress' } },
      { id: 'task-3', status: { value: 'completed' } }
    ];

    beforeEach(() => {
      mockServices.taskRepository.findById.mockImplementation((id) => {
        const task = mockTasks.find(t => t.id === id);
        return Promise.resolve(task);
      });
    });

    it('should validate multiple tasks successfully', async () => {
      const options = {
        taskIds: ['task-1', 'task-2', 'task-3'],
        targetStatus: 'in-progress'
      };

      const result = await step.validateSync(mockContext, mockServices, options);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('validate');
      expect(result.totalTasks).toBe(3);
      expect(result.validTasks).toBe(2); // task-1 and task-2 can transition to in-progress
      expect(result.invalidTasks).toBe(1); // task-3 cannot transition from completed
    });

    it('should handle task not found in validation', async () => {
      mockServices.taskRepository.findById.mockImplementation((id) => {
        if (id === 'non-existent-task') {
          return Promise.resolve(null);
        }
        const task = mockTasks.find(t => t.id === id);
        return Promise.resolve(task);
      });

      const options = {
        taskIds: ['task-1', 'non-existent-task'],
        targetStatus: 'in-progress'
      };

      const result = await step.validateSync(mockContext, mockServices, options);

      expect(result.totalTasks).toBe(2);
      expect(result.validTasks).toBe(1);
      expect(result.invalidTasks).toBe(1);
    });

    it('should throw error for missing task IDs', async () => {
      const options = {
        targetStatus: 'in-progress'
      };

      await expect(step.validateSync(mockContext, mockServices, options))
        .rejects.toThrow('Task IDs array is required for validation');
    });
  });

  describe('Rollback', () => {
    const mockTasks = [
      { id: 'task-1', status: { value: 'in-progress' }, updateStatus: jest.fn() },
      { id: 'task-2', status: { value: 'completed' }, updateStatus: jest.fn() }
    ];

    beforeEach(() => {
      mockServices.taskRepository.findById.mockImplementation((id) => {
        const task = mockTasks.find(t => t.id === id);
        return Promise.resolve(task);
      });
      mockServices.taskRepository.update.mockResolvedValue({});
    });

    it('should rollback multiple tasks successfully', async () => {
      const options = {
        taskIds: ['task-1', 'task-2'],
        previousStatus: 'pending'
      };

      const result = await step.rollbackSync(mockContext, mockServices, options);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('rollback');
      expect(result.totalTasks).toBe(2);
      expect(result.successfulRollbacks).toBe(2);
      expect(result.failedRollbacks).toBe(0);
    });

    it('should handle partial rollback failures', async () => {
      mockServices.taskRepository.findById.mockImplementation((id) => {
        if (id === 'task-2') {
          return Promise.resolve(null); // Simulate task not found
        }
        const task = mockTasks.find(t => t.id === id);
        return Promise.resolve(task);
      });

      const options = {
        taskIds: ['task-1', 'task-2'],
        previousStatus: 'pending'
      };

      const result = await step.rollbackSync(mockContext, mockServices, options);

      expect(result.success).toBe(false);
      expect(result.totalTasks).toBe(2);
      expect(result.successfulRollbacks).toBe(1);
      expect(result.failedRollbacks).toBe(1);
    });

    it('should throw error for missing task IDs', async () => {
      const options = {
        previousStatus: 'pending'
      };

      await expect(step.rollbackSync(mockContext, mockServices, options))
        .rejects.toThrow('Task IDs array is required for rollback');
    });

    it('should throw error for missing previous status', async () => {
      const options = {
        taskIds: ['task-1', 'task-2']
      };

      await expect(step.rollbackSync(mockContext, mockServices, options))
        .rejects.toThrow('Previous status is required for rollback');
    });
  });

  describe('Execute Method', () => {
    it('should route to sync operation', async () => {
      const options = {
        operation: 'sync',
        taskId: 'test-task',
        targetStatus: 'in-progress'
      };

      const mockTask = { id: 'test-task', status: { value: 'pending' }, updateStatus: jest.fn() };
      mockServices.taskRepository.findById.mockResolvedValue(mockTask);
      mockServices.taskRepository.update.mockResolvedValue(mockTask);

      const result = await step.execute(mockContext, options);

      expect(result.success).toBe(true);
      expect(result.taskId).toBe('test-task');
    });

    it('should route to batch-sync operation', async () => {
      const options = {
        operation: 'batch-sync',
        taskIds: ['task-1'],
        targetStatus: 'in-progress'
      };

      const mockTask = { id: 'task-1', status: { value: 'pending' }, updateStatus: jest.fn() };
      mockServices.taskRepository.findById.mockResolvedValue(mockTask);
      mockServices.taskRepository.update.mockResolvedValue(mockTask);

      const result = await step.execute(mockContext, options);

      expect(result.operation).toBe('batch-sync');
      expect(result.successfulTasks).toBe(1);
    });

    it('should route to validate operation', async () => {
      const options = {
        operation: 'validate',
        taskIds: ['task-1'],
        targetStatus: 'in-progress'
      };

      const mockTask = { id: 'task-1', status: { value: 'pending' } };
      mockServices.taskRepository.findById.mockResolvedValue(mockTask);

      const result = await step.execute(mockContext, options);

      expect(result.operation).toBe('validate');
      expect(result.totalTasks).toBe(1);
    });

    it('should route to rollback operation', async () => {
      const options = {
        operation: 'rollback',
        taskIds: ['task-1'],
        previousStatus: 'pending'
      };

      const mockTask = { id: 'task-1', status: { value: 'in-progress' }, updateStatus: jest.fn() };
      mockServices.taskRepository.findById.mockResolvedValue(mockTask);
      mockServices.taskRepository.update.mockResolvedValue(mockTask);

      const result = await step.execute(mockContext, options);

      expect(result.operation).toBe('rollback');
      expect(result.successfulRollbacks).toBe(1);
    });

    it('should throw error for unsupported operation', async () => {
      const options = {
        operation: 'unsupported'
      };

      await expect(step.execute(mockContext, options))
        .rejects.toThrow('Unsupported operation: unsupported');
    });
  });
});
