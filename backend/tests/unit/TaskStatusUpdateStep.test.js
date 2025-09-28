/**
 * TaskStatusUpdateStep Tests
 * Tests for the refactored TaskStatusUpdateStep
 */

const TaskStatusUpdateStep = require('../../domain/steps/categories/task/task_status_update_step');
const Logger = require('@logging/Logger');

describe('TaskStatusUpdateStep', () => {
  let step;
  let mockTaskRepository;
  let mockStatusTransitionService;
  let mockContext;

  beforeEach(() => {
    // Setup mocks
    mockTaskRepository = {
      findById: jest.fn(),
      update: jest.fn()
    };
    
    mockStatusTransitionService = {
      moveTaskToCompleted: jest.fn(),
      moveTaskToInProgress: jest.fn(),
      moveTaskToPending: jest.fn(),
      moveTaskToCancelled: jest.fn()
    };
    
    mockContext = {
      getService: jest.fn((serviceName) => {
        if (serviceName === 'taskRepository') return mockTaskRepository;
        if (serviceName === 'statusTransitionService') return mockStatusTransitionService;
        return null;
      })
    };
    
    step = new TaskStatusUpdateStep();
  });

  describe('Configuration', () => {
    it('should have correct configuration', () => {
      const config = TaskStatusUpdateStep.getConfig();
      
      expect(config.name).toBe('TaskStatusUpdateStep');
      expect(config.type).toBe('status');
      expect(config.category).toBe('task');
      expect(config.dependencies).toContain('TaskRepository');
      expect(config.dependencies).toContain('TaskStatusTransitionService');
    });

    it('should have correct instance properties', () => {
      expect(step.name).toBe('TaskStatusUpdateStep');
      expect(step.description).toBe('Updates task status and organizes files accordingly');
      expect(step.category).toBe('task');
    });
  });

  describe('Context Validation', () => {
    it('should validate context successfully', () => {
      expect(() => step.validateContext(mockContext)).not.toThrow();
    });

    it('should throw error for invalid context', () => {
      expect(() => step.validateContext(null)).toThrow('Invalid context: getService method not available');
      expect(() => step.validateContext({})).toThrow('Invalid context: getService method not available');
    });
  });

  describe('Task Information Retrieval', () => {
    it('should get current task info successfully', async () => {
      const mockTask = {
        id: 'task-123',
        status: { value: 'pending' },
        priority: 'high',
        category: 'automation',
        title: 'Test Task',
        sourcePath: '/path/to/task',
        completedAt: null
      };
      
      mockTaskRepository.findById.mockResolvedValue(mockTask);
      
      const result = await step.getCurrentTaskInfo('task-123', mockTaskRepository);
      
      expect(result).toEqual({
        id: 'task-123',
        status: 'pending',
        priority: 'high',
        category: 'automation',
        title: 'Test Task',
        sourcePath: '/path/to/task',
        completedAt: undefined
      });
    });

    it('should return null for non-existent task', async () => {
      mockTaskRepository.findById.mockResolvedValue(null);
      
      const result = await step.getCurrentTaskInfo('non-existent', mockTaskRepository);
      
      expect(result).toBeNull();
    });

    it('should handle task with string status', async () => {
      const mockTask = {
        id: 'task-123',
        status: 'completed',
        priority: 'medium',
        category: 'backend'
      };
      
      mockTaskRepository.findById.mockResolvedValue(mockTask);
      
      const result = await step.getCurrentTaskInfo('task-123', mockTaskRepository);
      
      expect(result.status).toBe('completed');
    });
  });

  describe('Status Transition Validation', () => {
    it('should validate valid transitions', () => {
      expect(step.validateStatusTransition('pending', 'in-progress')).toBe(true);
      expect(step.validateStatusTransition('in-progress', 'completed')).toBe(true);
      expect(step.validateStatusTransition('in-progress', 'failed')).toBe(true);
      expect(step.validateStatusTransition('blocked', 'pending')).toBe(true);
      expect(step.validateStatusTransition('failed', 'in-progress')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(step.validateStatusTransition('completed', 'pending')).toBe(false);
      expect(step.validateStatusTransition('cancelled', 'in-progress')).toBe(false);
      expect(step.validateStatusTransition('pending', 'completed')).toBe(false);
      expect(step.validateStatusTransition('unknown', 'pending')).toBe(false);
    });
  });

  describe('Database Updates', () => {
    it('should update task status in database', async () => {
      mockTaskRepository.update.mockResolvedValue(true);
      
      await step.updateTaskStatus('task-123', 'completed', { reason: 'Done' }, mockTaskRepository);
      
      expect(mockTaskRepository.update).toHaveBeenCalledWith('task-123', {
        status: 'completed',
        updated_at: expect.any(String),
        completed_at: expect.any(String),
        reason: 'Done'
      });
    });

    it('should not add completed_at for non-completed status', async () => {
      mockTaskRepository.update.mockResolvedValue(true);
      
      await step.updateTaskStatus('task-123', 'in-progress', {}, mockTaskRepository);
      
      expect(mockTaskRepository.update).toHaveBeenCalledWith('task-123', {
        status: 'in-progress',
        updated_at: expect.any(String)
      });
    });
  });

  describe('File Movement', () => {
    it('should move files to completed using status transition service', async () => {
      mockStatusTransitionService.moveTaskToCompleted.mockResolvedValue({ success: true });
      
      const currentTask = { id: 'task-123', status: 'in-progress' };
      
      await step.moveTaskFiles('task-123', currentTask, 'completed', {}, mockStatusTransitionService);
      
      expect(mockStatusTransitionService.moveTaskToCompleted).toHaveBeenCalledWith('task-123');
    });

    it('should move files to in-progress using status transition service', async () => {
      mockStatusTransitionService.moveTaskToInProgress.mockResolvedValue({ success: true });
      
      const currentTask = { id: 'task-123', status: 'pending' };
      
      await step.moveTaskFiles('task-123', currentTask, 'in-progress', {}, mockStatusTransitionService);
      
      expect(mockStatusTransitionService.moveTaskToInProgress).toHaveBeenCalledWith('task-123');
    });

    it('should move files to cancelled with reason', async () => {
      mockStatusTransitionService.moveTaskToCancelled.mockResolvedValue({ success: true });
      
      const currentTask = { id: 'task-123', status: 'in-progress' };
      const metadata = { reason: 'No longer needed' };
      
      await step.moveTaskFiles('task-123', currentTask, 'cancelled', metadata, mockStatusTransitionService);
      
      expect(mockStatusTransitionService.moveTaskToCancelled).toHaveBeenCalledWith('task-123', 'No longer needed');
    });
  });

  describe('Complete Execution Flow', () => {
    it('should execute complete status update flow successfully', async () => {
      const mockTask = {
        id: 'task-123',
        status: { value: 'pending' },
        priority: 'high',
        category: 'automation',
        title: 'Test Task',
        sourcePath: '/path/to/task'
      };
      
      mockTaskRepository.findById.mockResolvedValue(mockTask);
      mockTaskRepository.update.mockResolvedValue(true);
      mockStatusTransitionService.moveTaskToInProgress.mockResolvedValue({ success: true });
      
      const options = {
        taskId: 'task-123',
        newStatus: 'in-progress',
        autoMoveFiles: true,
        updateDatabase: true
      };
      
      const result = await step.execute(mockContext, options);
      
      expect(result.success).toBe(true);
      expect(result.taskId).toBe('task-123');
      expect(result.oldStatus).toBe('pending');
      expect(result.newStatus).toBe('in-progress');
      expect(result.filesMoved).toBe(true);
      expect(result.databaseUpdated).toBe(true);
    });

    it('should handle missing task ID', async () => {
      const options = {
        newStatus: 'completed'
      };
      
      await expect(step.execute(mockContext, options)).rejects.toThrow('Task ID and new status are required');
    });

    it('should handle missing new status', async () => {
      const options = {
        taskId: 'task-123'
      };
      
      await expect(step.execute(mockContext, options)).rejects.toThrow('Task ID and new status are required');
    });

    it('should handle task not found', async () => {
      mockTaskRepository.findById.mockResolvedValue(null);
      
      const options = {
        taskId: 'non-existent',
        newStatus: 'completed'
      };
      
      await expect(step.execute(mockContext, options)).rejects.toThrow('Task non-existent not found');
    });

    it('should handle invalid status transition', async () => {
      const mockTask = {
        id: 'task-123',
        status: { value: 'completed' },
        priority: 'high',
        category: 'automation'
      };
      
      mockTaskRepository.findById.mockResolvedValue(mockTask);
      
      const options = {
        taskId: 'task-123',
        newStatus: 'pending'
      };
      
      await expect(step.execute(mockContext, options)).rejects.toThrow('Invalid status transition from completed to pending');
    });

    it('should handle missing services in context', async () => {
      const invalidContext = {
        getService: jest.fn(() => null)
      };
      
      const options = {
        taskId: 'task-123',
        newStatus: 'completed'
      };
      
      await expect(step.execute(invalidContext, options)).rejects.toThrow('TaskRepository not available in context');
    });
  });

  describe('Quarter Calculation', () => {
    it('should calculate current quarter correctly', () => {
      const quarter = step.getCompletionQuarter();
      expect(quarter).toMatch(/^\d{4}-q[1-4]$/);
    });

    it('should calculate quarter from specific date', () => {
      const quarter = step.getCompletionQuarter('2024-06-15');
      expect(quarter).toBe('2024-q2');
    });
  });
});
