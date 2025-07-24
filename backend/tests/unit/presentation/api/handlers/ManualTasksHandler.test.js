const fs = require('fs').promises;
const path = require('path');
const ManualTasksHandler = require('@api/handlers/ManualTasksHandler');

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn(),
    stat: jest.fn()
  }
}));

// Mock marked
jest.mock('marked', () => ({
  setOptions: jest.fn(),
  __esModule: true,
  default: jest.fn((text) => `<p>${text}</p>`)
}));

describe('ManualTasksHandler', () => {
  let handler;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    handler = new ManualTasksHandler(() => '/test/workspace');
    mockReq = {};
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(handler.getFeaturesDir()).toContain('docs/09_roadmap/features');
      expect(handler.allowedExtensions).toEqual(['.md', '.markdown']);
      expect(handler.cache).toBeInstanceOf(Map);
      expect(handler.cacheTimeout).toBe(60000);
    });
  });

  describe('getManualTasks', () => {
    it('should return list of manual tasks from database successfully', async () => {
      const mockTasks = [
        {
          id: 'task1',
          title: 'Test Task 1',
          priority: 'high',
          category: 'backend',
          type: 'documentation',
          status: 'pending',
          description: 'Test task description'
        },
        {
          id: 'task2', 
          title: 'Test Task 2',
          priority: 'medium',
          category: 'frontend',
          type: 'documentation',
          status: 'pending',
          description: 'Test task description'
        }
      ];

      // Mock taskRepository
      handler.taskRepository = {
        findByProject: jest.fn().mockResolvedValue(mockTasks)
      };

      await handler.getManualTasks(mockReq, mockRes);

      expect(handler.taskRepository.findByProject).toHaveBeenCalledWith(undefined, {
        type: 'documentation'
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'task1',
            title: 'Test Task 1',
            priority: 'high',
            category: 'backend'
          }),
          expect.objectContaining({
            id: 'task2',
            title: 'Test Task 2', 
            priority: 'medium',
            category: 'frontend'
          })
        ]),
        count: 2
      });
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database connection failed');
      
      // Mock taskRepository with error
      handler.taskRepository = {
        findByProject: jest.fn().mockRejectedValue(error)
      };

      await handler.getManualTasks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch manual tasks',
        details: error.message
      });
    });

    it('should return empty array when no tasks found', async () => {
      // Mock taskRepository with empty result
      handler.taskRepository = {
        findByProject: jest.fn().mockResolvedValue([])
      };

      await handler.getManualTasks(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        count: 0
      });
    });
  });

  describe('getManualTaskDetails', () => {
    it('should return manual task details successfully', async () => {
      const mockTask = {
        id: 'task1',
        title: 'Test Task',
        priority: 'high',
        category: 'backend',
        type: 'documentation',
        status: 'pending',
        description: 'Test task description',
        content: '# Test Task\n\nThis is a test task.',
        metadata: {
          filename: 'test-task.md',
          category: 'backend',
          structure: 'implementation'
        }
      };

      // Mock taskRepository
      handler.taskRepository = {
        findById: jest.fn().mockResolvedValue(mockTask)
      };

      mockReq.params = { taskId: 'task1' };

      await handler.getManualTaskDetails(mockReq, mockRes);

      expect(handler.taskRepository.findById).toHaveBeenCalledWith('task1');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'task1',
          title: 'Test Task',
          priority: 'high',
          category: 'backend',
          content: '# Test Task\n\nThis is a test task.',
          htmlContent: '<p># Test Task</p><p>This is a test task.</p>'
        })
      });
    });

    it('should handle task not found', async () => {
      // Mock taskRepository with null result
      handler.taskRepository = {
        findById: jest.fn().mockResolvedValue(null)
      };

      mockReq.params = { taskId: 'nonexistent' };

      await handler.getManualTaskDetails(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Manual task not found'
      });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      
      // Mock taskRepository with error
      handler.taskRepository = {
        findById: jest.fn().mockRejectedValue(error)
      };

      mockReq.params = { taskId: 'task1' };

      await handler.getManualTaskDetails(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch manual task details',
        details: error.message
      });
    });
  });

  describe('syncManualTasks', () => {
    it('should sync manual tasks from workspace successfully', async () => {
      const mockWorkspacePath = '/test/workspace';
      const mockTasks = [
        {
          id: 'task1',
          title: 'Test Task 1',
          priority: 'high',
          category: 'backend'
        }
      ];

      // Mock workspace path function
      handler.getWorkspacePath = jest.fn().mockReturnValue(mockWorkspacePath);
      
      // Mock file system operations
      const fs = require('fs').promises;
      fs.access.mockResolvedValue();
      fs.readdir.mockResolvedValue(['task1.md', 'task2.md']);
      fs.stat.mockResolvedValue({ isFile: () => true });
      fs.readFile.mockResolvedValue('# Test Task\n\nTest content');

      // Mock taskRepository
      handler.taskRepository = {
        findByProject: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue(mockTasks[0])
      };

      await handler.syncManualTasks(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          syncedCount: 2,
          totalFiles: 2,
          workspacePath: mockWorkspacePath
        }
      });
    });

    it('should handle workspace path errors', async () => {
      const error = new Error('Workspace not found');
      
      // Mock workspace path function with error
      handler.getWorkspacePath = jest.fn().mockImplementation(() => {
        throw error;
      });

      await handler.syncManualTasks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to sync manual tasks',
        details: error.message
      });
    });
  });

  describe('cleanManualTasks', () => {
    it('should clean manual tasks successfully', async () => {
      const mockTasks = [
        { id: 'task1', title: 'Test Task 1' },
        { id: 'task2', title: 'Test Task 2' }
      ];

      // Mock taskRepository
      handler.taskRepository = {
        findByProject: jest.fn().mockResolvedValue(mockTasks),
        delete: jest.fn().mockResolvedValue(true)
      };

      await handler.cleanManualTasks(mockReq, mockRes);

      expect(handler.taskRepository.findByProject).toHaveBeenCalledWith(undefined, {
        type: 'documentation'
      });
      expect(handler.taskRepository.delete).toHaveBeenCalledTimes(2);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          deletedCount: 2,
          totalTasks: 2
        }
      });
    });

    it('should handle no tasks to clean', async () => {
      // Mock taskRepository with empty result
      handler.taskRepository = {
        findByProject: jest.fn().mockResolvedValue([])
      };

      await handler.cleanManualTasks(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          deletedCount: 0,
          totalTasks: 0
        }
      });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      
      // Mock taskRepository with error
      handler.taskRepository = {
        findByProject: jest.fn().mockRejectedValue(error)
      };

      await handler.cleanManualTasks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to clean manual tasks',
        details: error.message
      });
    });
  });

  describe('utility methods', () => {
    describe('getFeaturesDir', () => {
      it('should return correct features directory path', () => {
        const featuresDir = handler.getFeaturesDir();
        expect(featuresDir).toContain('docs/09_roadmap/features');
      });
    });

    describe('isValidFile', () => {
      it('should return true for valid markdown files', () => {
        expect(handler.isValidFile('test.md')).toBe(true);
        expect(handler.isValidFile('test.markdown')).toBe(true);
      });

      it('should return false for invalid files', () => {
        expect(handler.isValidFile('test.txt')).toBe(false);
        expect(handler.isValidFile('test.js')).toBe(false);
        expect(handler.isValidFile('.md')).toBe(false);
      });
    });

    describe('parseTaskFromFile', () => {
      it('should parse task from markdown file content', () => {
        const content = `# Test Task

## Priority
High

## Category
Backend

## Description
This is a test task description.

## Implementation
- Step 1
- Step 2`;

        const task = handler.parseTaskFromFile(content, 'test-task.md');

        expect(task).toMatchObject({
          title: 'Test Task',
          priority: 'high',
          category: 'backend',
          description: 'This is a test task description.',
          content: content,
          metadata: {
            filename: 'test-task.md',
            structure: 'implementation'
          }
        });
      });

      it('should handle missing optional fields', () => {
        const content = `# Test Task

## Description
This is a test task.`;

        const task = handler.parseTaskFromFile(content, 'test-task.md');

        expect(task).toMatchObject({
          title: 'Test Task',
          priority: 'medium', // default
          category: 'general', // default
          description: 'This is a test task.',
          content: content
        });
      });
    });
  });
}); 