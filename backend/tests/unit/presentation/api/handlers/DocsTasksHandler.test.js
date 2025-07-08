const fs = require('fs').promises;
const path = require('path');
const DocsTasksHandler = require('../../../../../presentation/api/handlers/DocsTasksHandler');

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
    handler = new DocsTasksHandler();
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
      expect(handler.featuresDir).toContain('docs/09_roadmap/features');
      expect(handler.allowedExtensions).toEqual(['.md']);
      expect(handler.cache).toBeInstanceOf(Map);
      expect(handler.cacheTimeout).toBe(60000);
    });
  });

  describe('getDocsTasks', () => {
    it('should return list of documentation tasks successfully', async () => {
      const mockFiles = ['task1.md', 'task2.md', 'ignore.txt'];
      const mockContent = '# Test Task\nPriority: high\nEstimated Time: 2 days';
      const mockStats = { mtime: new Date('2023-01-01') };

      fs.access.mockResolvedValue();
      fs.readdir.mockResolvedValue(mockFiles);
      fs.readFile.mockResolvedValue(mockContent);
      fs.stat.mockResolvedValue(mockStats);

      await handler.getDocsTasks(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'task1',
            filename: 'task1.md',
            title: 'Test Task',
            priority: 'high',
            estimatedTime: '2 days'
          }),
          expect.objectContaining({
            id: 'task2',
            filename: 'task2.md',
            title: 'Test Task',
            priority: 'high',
            estimatedTime: '2 days'
          })
        ]),
        count: 2
      });
    });

    it('should handle directory not found error', async () => {
      fs.access.mockRejectedValue(new Error('Directory not found'));

      await handler.getDocsTasks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Documentation directory not found'
      });
    });

    it('should handle file reading errors gracefully', async () => {
      const mockFiles = ['task1.md', 'task2.md'];
      
      fs.access.mockResolvedValue();
      fs.readdir.mockResolvedValue(mockFiles);
      fs.readFile.mockRejectedValueOnce(new Error('File read error'));
      fs.readFile.mockResolvedValueOnce('# Test Task');
      fs.stat.mockResolvedValue({ mtime: new Date('2023-01-01') });

      await handler.getDocsTasks(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'task2',
            filename: 'task2.md'
          })
        ]),
        count: 1
      });
    });

    it('should filter out non-markdown files', async () => {
      const mockFiles = ['task1.md', 'task2.txt', 'task3.md'];
      const mockContent = '# Test Task';
      const mockStats = { mtime: new Date('2023-01-01') };

      fs.access.mockResolvedValue();
      fs.readdir.mockResolvedValue(mockFiles);
      fs.readFile.mockResolvedValue(mockContent);
      fs.stat.mockResolvedValue(mockStats);

      await handler.getDocsTasks(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.data).toHaveLength(2);
      expect(response.data.every(task => task.filename.endsWith('.md'))).toBe(true);
    });
  });

  describe('getDocsTaskDetails', () => {
    it('should return task details successfully', async () => {
      const mockContent = '# Test Task\nPriority: high\nStatus: pending';
      const mockStats = { mtime: new Date('2023-01-01') };

      mockReq.params = { filename: 'test-task.md' };
      fs.access.mockResolvedValue();
      fs.readFile.mockResolvedValue(mockContent);
      fs.stat.mockResolvedValue(mockStats);

      await handler.getDocsTaskDetails(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'test-task',
          filename: 'test-task.md',
          title: 'Test Task',
          priority: 'high',
          status: 'pending',
          content: mockContent,
          htmlContent: expect.any(String)
        })
      });
    });

    it('should handle missing filename parameter', async () => {
      mockReq.params = {};

      await handler.getDocsTaskDetails(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Filename parameter is required'
      });
    });

    it('should prevent path traversal attacks', async () => {
      mockReq.params = { filename: '../../../etc/passwd' };

      await handler.getDocsTaskDetails(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid filename'
      });
    });

    it('should handle file not found', async () => {
      mockReq.params = { filename: 'nonexistent.md' };
      fs.access.mockRejectedValue(new Error('File not found'));

      await handler.getDocsTaskDetails(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Documentation file not found'
      });
    });

    it('should reject non-markdown files', async () => {
      mockReq.params = { filename: 'test.txt' };

      await handler.getDocsTaskDetails(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Only markdown files are allowed'
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
      // Mock marked for Jest compatibility
const marked = jest.fn((text) => text);
      marked.mockImplementation(() => {
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