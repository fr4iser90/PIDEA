/**
 * Task Status Update Step Integration Tests
 * Tests for the task status update step integration
 * Created: 2025-09-19T19:22:57.000Z
 */

const TaskStatusUpdateStep = require('../../domain/steps/status/TaskStatusUpdateStep');
const fs = require('fs').promises;
const path = require('path');

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    readdir: jest.fn(),
    copyFile: jest.fn(),
    rename: jest.fn(),
    unlink: jest.fn(),
    rmdir: jest.fn(),
    access: jest.fn()
  }
}));

jest.mock('@logging/Logger', () => {
  return jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }));
});

describe('TaskStatusUpdateStep Integration', () => {
  let step;
  let mockLogger;

  beforeEach(() => {
    step = new TaskStatusUpdateStep();
    mockLogger = step.logger;
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should successfully update task status and move files', async () => {
      const context = {};
      const options = {
        taskId: 'test-task-123',
        newStatus: 'completed',
        taskMetadata: {
          priority: 'high',
          category: 'backend',
          completedAt: '2024-03-15'
        },
        autoMoveFiles: true,
        updateDatabase: true
      };

      // Mock getCurrentTaskInfo
      step.getCurrentTaskInfo = jest.fn().mockResolvedValue({
        id: 'test-task-123',
        status: 'in_progress',
        priority: 'high',
        category: 'backend',
        filePath: 'docs/09_roadmap/in-progress/backend/test-task-123',
        completedAt: null
      });

      // Mock updateTaskStatus
      step.updateTaskStatus = jest.fn().mockResolvedValue();

      // Mock moveTaskFiles
      step.moveTaskFiles = jest.fn().mockResolvedValue();

      // Mock updateFileReferences
      step.updateFileReferences = jest.fn().mockResolvedValue();

      const result = await step.execute(context, options);

      expect(result.success).toBe(true);
      expect(result.taskId).toBe('test-task-123');
      expect(result.oldStatus).toBe('in_progress');
      expect(result.newStatus).toBe('completed');
      expect(result.filesMoved).toBe(true);
      expect(result.databaseUpdated).toBe(true);
    });

    it('should handle invalid status transitions', async () => {
      const context = {};
      const options = {
        taskId: 'test-task-123',
        newStatus: 'pending',
        taskMetadata: {}
      };

      step.getCurrentTaskInfo = jest.fn().mockResolvedValue({
        id: 'test-task-123',
        status: 'completed',
        priority: 'medium',
        category: 'frontend',
        filePath: 'docs/09_roadmap/completed/2024-q1/frontend/test-task-123',
        completedAt: '2024-01-15'
      });

      await expect(step.execute(context, options)).rejects.toThrow(
        'Invalid status transition from completed to pending'
      );
    });

    it('should handle missing task ID', async () => {
      const context = {};
      const options = {
        newStatus: 'completed'
      };

      await expect(step.execute(context, options)).rejects.toThrow(
        'Task ID and new status are required'
      );
    });

    it('should handle missing new status', async () => {
      const context = {};
      const options = {
        taskId: 'test-task-123'
      };

      await expect(step.execute(context, options)).rejects.toThrow(
        'Task ID and new status are required'
      );
    });

    it('should handle task not found', async () => {
      const context = {};
      const options = {
        taskId: 'non-existent-task',
        newStatus: 'completed'
      };

      step.getCurrentTaskInfo = jest.fn().mockResolvedValue(null);

      await expect(step.execute(context, options)).rejects.toThrow(
        'Task non-existent-task not found'
      );
    });
  });

  describe('validateStatusTransition', () => {
    it('should validate valid transitions', () => {
      expect(step.validateStatusTransition('pending', 'in_progress')).toBe(true);
      expect(step.validateStatusTransition('in_progress', 'completed')).toBe(true);
      expect(step.validateStatusTransition('blocked', 'pending')).toBe(true);
      expect(step.validateStatusTransition('failed', 'in_progress')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(step.validateStatusTransition('completed', 'pending')).toBe(false);
      expect(step.validateStatusTransition('cancelled', 'in_progress')).toBe(false);
      expect(step.validateStatusTransition('pending', 'completed')).toBe(false);
    });

    it('should handle unknown statuses', () => {
      expect(step.validateStatusTransition('unknown', 'pending')).toBe(false);
      expect(step.validateStatusTransition('pending', 'unknown')).toBe(false);
    });
  });

  describe('determineNewPath', () => {
    it('should determine correct path for completed tasks', () => {
      const taskMetadata = {
        id: 'test-task-123',
        priority: 'high',
        category: 'backend',
        completedAt: '2024-03-15'
      };

      const result = step.determineNewPath('completed', taskMetadata);
      
      expect(result).toBe('docs/09_roadmap/completed/2024-q1/backend/test-task-123/');
    });

    it('should determine correct path for in-progress tasks', () => {
      const taskMetadata = {
        id: 'test-task-123',
        category: 'frontend'
      };

      const result = step.determineNewPath('in_progress', taskMetadata);
      
      expect(result).toBe('docs/09_roadmap/in-progress/frontend/test-task-123/');
    });

    it('should determine correct path for pending tasks', () => {
      const taskMetadata = {
        id: 'test-task-123',
        priority: 'medium',
        category: 'security'
      };

      const result = step.determineNewPath('pending', taskMetadata);
      
      expect(result).toBe('docs/09_roadmap/pending/medium/security/test-task-123/');
    });

    it('should determine correct path for blocked tasks', () => {
      const taskMetadata = {
        id: 'test-task-123',
        category: 'database'
      };

      const result = step.determineNewPath('blocked', taskMetadata);
      
      expect(result).toBe('docs/09_roadmap/blocked/database/test-task-123/');
    });

    it('should determine correct path for cancelled tasks', () => {
      const taskMetadata = {
        id: 'test-task-123',
        category: 'testing'
      };

      const result = step.determineNewPath('cancelled', taskMetadata);
      
      expect(result).toBe('docs/09_roadmap/cancelled/testing/test-task-123/');
    });

    it('should determine correct path for failed tasks', () => {
      const taskMetadata = {
        id: 'test-task-123',
        category: 'performance'
      };

      const result = step.determineNewPath('failed', taskMetadata);
      
      expect(result).toBe('docs/09_roadmap/failed/performance/test-task-123/');
    });
  });

  describe('getCompletionQuarter', () => {
    it('should return correct quarter for Q1', () => {
      const result = step.getCompletionQuarter('2024-02-15');
      expect(result).toBe('2024-q1');
    });

    it('should return correct quarter for Q2', () => {
      const result = step.getCompletionQuarter('2024-05-15');
      expect(result).toBe('2024-q2');
    });

    it('should return correct quarter for Q3', () => {
      const result = step.getCompletionQuarter('2024-08-15');
      expect(result).toBe('2024-q3');
    });

    it('should return correct quarter for Q4', () => {
      const result = step.getCompletionQuarter('2024-11-15');
      expect(result).toBe('2024-q4');
    });

    it('should use current date when no completion date provided', () => {
      const result = step.getCompletionQuarter(null);
      expect(result).toMatch(/^\d{4}-q[1-4]$/);
    });
  });

  describe('moveTaskFiles', () => {
    it('should successfully move task files', async () => {
      const taskId = 'test-task-123';
      const currentTask = {
        id: 'test-task-123',
        filePath: 'docs/09_roadmap/pending/medium/test-task-123'
      };
      const newStatus = 'completed';
      const taskMetadata = {
        priority: 'medium',
        category: 'backend',
        completedAt: '2024-03-15'
      };

      // Mock file system operations
      fs.mkdir.mockResolvedValue();
      fs.readdir.mockResolvedValue(['task.md', 'index.md']);
      fs.copyFile.mockResolvedValue();
      fs.rename.mockResolvedValue();
      fs.unlink.mockResolvedValue();
      fs.rmdir.mockResolvedValue();

      await step.moveTaskFiles(taskId, currentTask, newStatus, taskMetadata);

      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.readdir).toHaveBeenCalled();
      expect(fs.copyFile).toHaveBeenCalledTimes(2);
      expect(fs.rename).toHaveBeenCalledTimes(2);
      expect(fs.unlink).toHaveBeenCalledTimes(2);
      expect(fs.rmdir).toHaveBeenCalled();
    });

    it('should handle file system errors', async () => {
      const taskId = 'test-task-123';
      const currentTask = {
        id: 'test-task-123',
        filePath: 'docs/09_roadmap/pending/medium/test-task-123'
      };
      const newStatus = 'completed';
      const taskMetadata = {};

      fs.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(step.moveTaskFiles(taskId, currentTask, newStatus, taskMetadata))
        .rejects.toThrow('Permission denied');
    });
  });

  describe('getConfiguration', () => {
    it('should return correct step configuration', () => {
      const config = step.getConfiguration();

      expect(config.name).toBe('TaskStatusUpdateStep');
      expect(config.type).toBe('status');
      expect(config.description).toBe('Updates task status and organizes files accordingly');
      expect(config.options.taskId.required).toBe(true);
      expect(config.options.newStatus.required).toBe(true);
      expect(config.options.newStatus.enum).toEqual([
        'pending', 'in_progress', 'completed', 'failed', 'blocked', 'cancelled'
      ]);
      expect(config.options.autoMoveFiles.default).toBe(true);
      expect(config.options.updateDatabase.default).toBe(true);
    });
  });
});
