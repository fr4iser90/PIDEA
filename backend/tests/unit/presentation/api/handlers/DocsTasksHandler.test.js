const fs = require('fs').promises;
const path = require('path');
const DocsTasksHandler = require('@/presentation/api/handlers/DocsTasksHandler');

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

describe('DocsTasksHandler', () => {
  let handler;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    handler = new DocsTasksHandler(() => '/test/workspace');
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

  describe('getDocsTasks', () => {
    it('should return list of documentation tasks from database successfully', async () => {
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

      await handler.getDocsTasks(mockReq, mockRes);

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

    it('should handle missing task repository', async () => {
      handler.taskRepository = null;

      await handler.getDocsTasks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve documentation tasks'
      });
    });

    it('should handle database errors gracefully', async () => {
      handler.taskRepository = {
        findByProject: jest.fn().mockRejectedValue(new Error('Database error'))
      };

      await handler.getDocsTasks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve documentation tasks'
      });
    });

    it('should sort tasks by category, priority, and title', async () => {
      const mockTasks = [
        {
          id: 'task1',
          title: 'Z Task',
          priority: 'low',
          category: 'backend'
        },
        {
          id: 'task2',
          title: 'A Task', 
          priority: 'high',
          category: 'backend'
        },
        {
          id: 'task3',
          title: 'B Task',
          priority: 'medium',
          category: 'frontend'
        }
      ];

      handler.taskRepository = {
        findByProject: jest.fn().mockResolvedValue(mockTasks)
      };

      await handler.getDocsTasks(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.data[0].category).toBe('backend');
      expect(response.data[0].priority).toBe('high'); // High priority first
      expect(response.data[1].category).toBe('backend');
      expect(response.data[1].priority).toBe('low');
      expect(response.data[2].category).toBe('frontend');
    });
  });

  describe('getDocsTaskDetails', () => {
    it('should return task details successfully', async () => {
      const mockTask = {
        id: 'test-task',
        title: 'Test Task',
        priority: 'high',
        category: 'backend',
        type: 'documentation',
        status: 'pending',
        description: '# Test Task\nPriority: high\nStatus: pending',
        metadata: { 
          source_type: 'markdown_doc',
          category: 'backend',
          automation_level: 'semi_auto'
        },
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      };

      mockReq.params = { taskId: 'test-task' };
      
      handler.taskRepository = {
        findById: jest.fn().mockResolvedValue(mockTask)
      };

      await handler.getDocsTaskDetails(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'test-task',
          title: 'Test Task',
          priority: 'high',
          category: 'backend',
          type: 'documentation',
          status: 'pending',
          content: mockTask.description,
          htmlContent: expect.any(String),
          metadata: mockTask.metadata,
          createdAt: mockTask.createdAt,
          updatedAt: mockTask.updatedAt
        })
      });
    });

    it('should handle missing taskId parameter', async () => {
      mockReq.params = {};

      await handler.getDocsTaskDetails(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve task details'
      });
    });

    it('should handle task not found', async () => {
      mockReq.params = { taskId: 'nonexistent-task' };
      
      handler.taskRepository = {
        findById: jest.fn().mockResolvedValue(null)
      };

      await handler.getDocsTaskDetails(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Task not found'
      });
    });

    it('should handle missing task repository', async () => {
      mockReq.params = { taskId: 'test-task' };
      handler.taskRepository = null;

      await handler.getDocsTaskDetails(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve task details'
      });
    });

    it('should handle database errors gracefully', async () => {
      mockReq.params = { taskId: 'test-task' };
      
      handler.taskRepository = {
        findById: jest.fn().mockRejectedValue(new Error('Database error'))
      };

      await handler.getDocsTaskDetails(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve task details'
      });
    });
  });

  describe('validateFilename', () => {
    it('should accept valid filenames', () => {
      const validFilenames = [
        'test.md',
        'test-task.md',
        'test_task.md',
        'test123.md',
        'test-task-123.md'
      ];

      validFilenames.forEach(filename => {
        expect(handler.validateFilename(filename)).toBe(filename);
      });
    });

    it('should reject path traversal attempts', () => {
      const invalidFilenames = [
        '../../../etc/passwd',
        '..\\windows\\system32\\config',
        '/etc/passwd',
        'C:\\windows\\system32',
        '..\\..\\..\\file.md'
      ];

      invalidFilenames.forEach(filename => {
        expect(handler.validateFilename(filename)).toBeNull();
      });
    });

    it('should reject filenames with invalid characters', () => {
      const invalidFilenames = [
        'test<>.md',
        'test|.md',
        'test*.md',
        'test?.md',
        'test".md'
      ];

      invalidFilenames.forEach(filename => {
        expect(handler.validateFilename(filename)).toBeNull();
      });
    });
  });

  describe('isValidMarkdownFile', () => {
    it('should accept markdown files', () => {
      expect(handler.isValidMarkdownFile('test.md')).toBe(true);
      expect(handler.isValidMarkdownFile('test.MD')).toBe(true);
      expect(handler.isValidMarkdownFile('test.markdown')).toBe(true);
    });

    it('should reject non-markdown files', () => {
      expect(handler.isValidMarkdownFile('test.txt')).toBe(false);
      expect(handler.isValidMarkdownFile('test.js')).toBe(false);
      expect(handler.isValidMarkdownFile('test')).toBe(false);
    });
  });

  describe('extractTaskMetadata', () => {
    it('should extract title from first heading', () => {
      const content = '# My Test Task\nSome content here';
      const metadata = handler.extractTaskMetadata(content, 'test.md');
      expect(metadata.title).toBe('My Test Task');
    });

    it('should use filename as fallback title', () => {
      const content = 'No heading here\nJust content';
      const metadata = handler.extractTaskMetadata(content, 'my-test-task.md');
      expect(metadata.title).toBe('My Test Task');
    });

    it('should extract priority from content', () => {
      const content = '# Test\nPriority: high\nOther content';
      const metadata = handler.extractTaskMetadata(content, 'test.md');
      expect(metadata.priority).toBe('high');
    });

    it('should extract estimated time', () => {
      const content = '# Test\nEstimated Time: 3 days\nOther content';
      const metadata = handler.extractTaskMetadata(content, 'test.md');
      expect(metadata.estimatedTime).toBe('3 days');
    });

    it('should extract status', () => {
      const content = '# Test\nStatus: in-progress\nOther content';
      const metadata = handler.extractTaskMetadata(content, 'test.md');
      expect(metadata.status).toBe('in-progress');
    });

    it('should use default values when metadata not found', () => {
      const content = '# Test\nJust some content';
      const metadata = handler.extractTaskMetadata(content, 'test.md');
      expect(metadata.priority).toBe('medium');
      expect(metadata.status).toBe('pending');
      expect(metadata.estimatedTime).toBeNull();
    });
  });

  describe('convertMarkdownToHtml', () => {
    it('should convert markdown to HTML', () => {
      const markdown = '# Test\nThis is a test';
      const html = handler.convertMarkdownToHtml(markdown);
      expect(html).toContain('<p>');
    });

    it('should handle conversion errors gracefully', () => {
      // Mock marked to throw an error
      const marked = require('marked');
      marked.default.mockImplementation(() => {
        throw new Error('Conversion failed');
      });

      const html = handler.convertMarkdownToHtml('test');
      expect(html).toContain('Error rendering markdown');
    });
  });

  describe('getCachedData', () => {
    it('should return cached data if available and not expired', async () => {
      const mockData = { test: 'data' };
      const key = 'test-key';
      const fetchFunction = jest.fn().mockResolvedValue(mockData);

      // Set cache
      handler.cache.set(key, {
        data: mockData,
        timestamp: Date.now()
      });

      const result = await handler.getCachedData(key, fetchFunction);
      expect(result).toEqual(mockData);
      expect(fetchFunction).not.toHaveBeenCalled();
    });

    it('should fetch fresh data if cache is expired', async () => {
      const mockData = { test: 'data' };
      const key = 'test-key';
      const fetchFunction = jest.fn().mockResolvedValue(mockData);

      // Set expired cache
      handler.cache.set(key, {
        data: { old: 'data' },
        timestamp: Date.now() - 70000 // 70 seconds ago
      });

      const result = await handler.getCachedData(key, fetchFunction);
      expect(result).toEqual(mockData);
      expect(fetchFunction).toHaveBeenCalled();
    });

    it('should fetch fresh data if cache is empty', async () => {
      const mockData = { test: 'data' };
      const key = 'test-key';
      const fetchFunction = jest.fn().mockResolvedValue(mockData);

      const result = await handler.getCachedData(key, fetchFunction);
      expect(result).toEqual(mockData);
      expect(fetchFunction).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', () => {
      handler.cache.set('test1', { data: 'value1' });
      handler.cache.set('test2', { data: 'value2' });
      
      expect(handler.cache.size).toBe(2);
      
      handler.clearCache();
      
      expect(handler.cache.size).toBe(0);
    });
  });
}); 