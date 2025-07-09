const ContentLibraryController = require('../../../../presentation/api/ContentLibraryController');
const fs = require('fs').promises;
const path = require('path');

// Mock fs.promises
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn()
  }
}));

describe('ContentLibraryController', () => {
  let controller;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    controller = new ContentLibraryController();
    mockReq = { params: {}, query: {} };
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct content library path', () => {
      expect(controller.contentLibraryPath).toContain('content-library');
    });
  });

  describe('getFrameworks', () => {
    it('should return all frameworks successfully', async () => {
      const mockFrameworks = [
        { name: 'react-framework', isDirectory: () => true },
        { name: 'vue-framework', isDirectory: () => true },
        { name: 'file.txt', isDirectory: () => false }
      ];
      fs.readdir.mockResolvedValue(mockFrameworks);

      await controller.getFrameworks(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [
          { id: 'react-framework', name: 'react', path: 'react-framework', type: 'framework' },
          { id: 'vue-framework', name: 'vue', path: 'vue-framework', type: 'framework' }
        ]
      });
    });

    it('should filter frameworks by techstack', async () => {
      mockReq.query.techstack = 'react';
      const mockFrameworks = [
        { name: 'react-framework', isDirectory: () => true },
        { name: 'vue-framework', isDirectory: () => true }
      ];
      fs.readdir.mockResolvedValue(mockFrameworks);

      await controller.getFrameworks(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 'react-framework', name: 'react', path: 'react-framework', type: 'framework' }]
      });
    });

    it('should handle empty frameworks directory', async () => {
      fs.readdir.mockResolvedValue([]);
      await controller.getFrameworks(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: [] });
    });

    it('should handle fs.readdir error', async () => {
      const error = new Error('Directory not found');
      fs.readdir.mockRejectedValue(error);
      await controller.getFrameworks(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to load frameworks',
        message: 'Directory not found'
      });
    });
  });

  describe('getFrameworkPrompts', () => {
    beforeEach(() => {
      mockReq.params = { frameworkId: 'react-framework' };
    });

    it('should return framework prompts successfully', async () => {
      const mockPrompts = [{
        id: 'test-prompt',
        name: 'test prompt',
        category: 'development',
        file: 'frameworks/react-framework/prompts/development/test-prompt.md',
        type: 'prompt'
      }];
      jest.spyOn(controller, 'scanDirectoryForPrompts').mockResolvedValue(mockPrompts);

      await controller.getFrameworkPrompts(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { frameworkId: 'react-framework', prompts: mockPrompts }
      });
    });

    it('should filter prompts by category', async () => {
      mockReq.query.category = 'development';
      const mockPrompts = [
        { id: 'test-prompt', name: 'test prompt', category: 'development', file: 'test.md', type: 'prompt' },
        { id: 'security-prompt', name: 'security prompt', category: 'security', file: 'test.md', type: 'prompt' }
      ];
      jest.spyOn(controller, 'scanDirectoryForPrompts').mockResolvedValue(mockPrompts);

      await controller.getFrameworkPrompts(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { frameworkId: 'react-framework', prompts: [mockPrompts[0]] }
      });
    });

    it('should handle scanDirectoryForPrompts error', async () => {
      const error = new Error('Directory not found');
      jest.spyOn(controller, 'scanDirectoryForPrompts').mockRejectedValue(error);
      await controller.getFrameworkPrompts(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getFrameworkTemplates', () => {
    beforeEach(() => {
      mockReq.params = { frameworkId: 'react-framework' };
    });

    it('should return framework templates successfully', async () => {
      const mockTemplates = [{
        id: 'test-template',
        name: 'test template',
        category: 'components',
        file: 'frameworks/react-framework/templates/components/test-template.md',
        type: 'template'
      }];
      jest.spyOn(controller, 'scanDirectoryForTemplates').mockResolvedValue(mockTemplates);

      await controller.getFrameworkTemplates(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { frameworkId: 'react-framework', templates: mockTemplates }
      });
    });

    it('should filter templates by category', async () => {
      mockReq.query.category = 'components';
      const mockTemplates = [
        { id: 'test-template', name: 'test template', category: 'components', file: 'test.md', type: 'template' },
        { id: 'page-template', name: 'page template', category: 'pages', file: 'test.md', type: 'template' }
      ];
      jest.spyOn(controller, 'scanDirectoryForTemplates').mockResolvedValue(mockTemplates);

      await controller.getFrameworkTemplates(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { frameworkId: 'react-framework', templates: [mockTemplates[0]] }
      });
    });

    it('should handle scanDirectoryForTemplates error', async () => {
      const error = new Error('Directory not found');
      jest.spyOn(controller, 'scanDirectoryForTemplates').mockRejectedValue(error);
      await controller.getFrameworkTemplates(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getPrompts', () => {
    it('should return all prompts successfully', async () => {
      const mockPrompts = [{
        id: 'test-prompt',
        name: 'test prompt',
        category: 'development',
        file: 'prompts/development/test-prompt.md',
        type: 'prompt'
      }];
      jest.spyOn(controller, 'scanDirectoryForPrompts').mockResolvedValue(mockPrompts);

      await controller.getPrompts(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockPrompts
      });
    });

    it('should filter prompts by category', async () => {
      mockReq.query.category = 'development';
      const mockPrompts = [
        { id: 'test-prompt', name: 'test prompt', category: 'development', file: 'test.md', type: 'prompt' },
        { id: 'security-prompt', name: 'security prompt', category: 'security', file: 'test.md', type: 'prompt' }
      ];
      jest.spyOn(controller, 'scanDirectoryForPrompts').mockResolvedValue(mockPrompts);

      await controller.getPrompts(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [mockPrompts[0]]
      });
    });

    it('should handle scanDirectoryForPrompts error', async () => {
      const error = new Error('Directory not found');
      jest.spyOn(controller, 'scanDirectoryForPrompts').mockRejectedValue(error);
      await controller.getPrompts(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getPromptsByCategory', () => {
    beforeEach(() => {
      mockReq.params = { category: 'development' };
    });

    it('should return prompts by category successfully', async () => {
      const mockPrompts = [{
        id: 'test-prompt',
        name: 'test prompt',
        category: 'development',
        file: 'prompts/development/test-prompt.md',
        type: 'prompt'
      }];
      jest.spyOn(controller, 'scanDirectoryForPrompts').mockResolvedValue(mockPrompts);

      await controller.getPromptsByCategory(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { category: 'development', prompts: mockPrompts }
      });
    });

    it('should handle scanDirectoryForPrompts error', async () => {
      const error = new Error('Directory not found');
      jest.spyOn(controller, 'scanDirectoryForPrompts').mockRejectedValue(error);
      await controller.getPromptsByCategory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getPromptFile', () => {
    beforeEach(() => {
      mockReq.params = { category: 'development', filename: 'test-prompt.md' };
    });

    it('should return prompt file content successfully', async () => {
      const mockContent = '# Test Prompt\n\nThis is a test prompt content.';
      fs.readFile.mockResolvedValue(mockContent);

      await controller.getPromptFile(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        category: 'development',
        filename: 'test-prompt.md',
        content: mockContent
      });
    });

    it('should handle file not found error', async () => {
      const error = new Error('ENOENT: no such file or directory');
      fs.readFile.mockRejectedValue(error);

      await controller.getPromptFile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Prompt file not found',
        message: 'ENOENT: no such file or directory'
      });
    });
  });

  describe('getPromptFileWithSubcategory', () => {
    beforeEach(() => {
      mockReq.params = { category: 'development', subcategory: 'react', filename: 'component-prompt.md' };
    });

    it('should return prompt file with subcategory successfully', async () => {
      const mockContent = '# Component Prompt\n\nThis is a component prompt.';
      fs.readFile.mockResolvedValue(mockContent);

      await controller.getPromptFileWithSubcategory(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        category: 'development',
        subcategory: 'react',
        filename: 'component-prompt.md',
        content: mockContent
      });
    });

    it('should handle file not found error', async () => {
      const error = new Error('ENOENT: no such file or directory');
      fs.readFile.mockRejectedValue(error);

      await controller.getPromptFileWithSubcategory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getTemplates', () => {
    it('should return all templates successfully', async () => {
      const mockTemplates = [{
        id: 'test-template',
        name: 'test template',
        category: 'components',
        file: 'templates/components/test-template.md',
        type: 'template'
      }];
      jest.spyOn(controller, 'scanDirectoryForTemplates').mockResolvedValue(mockTemplates);

      await controller.getTemplates(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockTemplates
      });
    });

    it('should filter templates by category', async () => {
      mockReq.query.category = 'components';
      const mockTemplates = [
        { id: 'test-template', name: 'test template', category: 'components', file: 'test.md', type: 'template' },
        { id: 'page-template', name: 'page template', category: 'pages', file: 'test.md', type: 'template' }
      ];
      jest.spyOn(controller, 'scanDirectoryForTemplates').mockResolvedValue(mockTemplates);

      await controller.getTemplates(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [mockTemplates[0]]
      });
    });

    it('should handle scanDirectoryForTemplates error', async () => {
      const error = new Error('Directory not found');
      jest.spyOn(controller, 'scanDirectoryForTemplates').mockRejectedValue(error);
      await controller.getTemplates(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getTemplatesByCategory', () => {
    beforeEach(() => {
      mockReq.params = { category: 'components' };
    });

    it('should return templates by category successfully', async () => {
      const mockTemplates = [{
        id: 'test-template',
        name: 'test template',
        category: 'components',
        file: 'templates/components/test-template.md',
        type: 'template'
      }];
      jest.spyOn(controller, 'scanDirectoryForTemplates').mockResolvedValue(mockTemplates);

      await controller.getTemplatesByCategory(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { category: 'components', templates: mockTemplates }
      });
    });

    it('should handle scanDirectoryForTemplates error', async () => {
      const error = new Error('Directory not found');
      jest.spyOn(controller, 'scanDirectoryForTemplates').mockRejectedValue(error);
      await controller.getTemplatesByCategory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getTemplateFile', () => {
    beforeEach(() => {
      mockReq.params = { category: 'components', filename: 'test-template.md' };
    });

    it('should return template file content successfully', async () => {
      const mockContent = '# Test Template\n\nThis is a test template content.';
      fs.readFile.mockResolvedValue(mockContent);

      await controller.getTemplateFile(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        category: 'components',
        filename: 'test-template.md',
        content: mockContent
      });
    });

    it('should handle file not found error', async () => {
      const error = new Error('ENOENT: no such file or directory');
      fs.readFile.mockRejectedValue(error);

      await controller.getTemplateFile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getFile', () => {
    beforeEach(() => {
      mockReq.params = ['prompts/development/test-prompt.md'];
    });

    it('should return file content successfully', async () => {
      const mockContent = '# Test Prompt\n\nThis is a test prompt content.';
      fs.readFile.mockResolvedValue(mockContent);

      await controller.getFile(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 'test-prompt',
          name: 'test-prompt',
          content: mockContent,
          file: 'prompts/development/test-prompt.md',
          type: 'prompt'
        }
      });
    });

    it('should return template type for template files', async () => {
      mockReq.params = ['templates/components/test-template.md'];
      const mockContent = '# Test Template\n\nThis is a test template.';
      fs.readFile.mockResolvedValue(mockContent);

      await controller.getFile(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 'test-template',
          name: 'test-template',
          content: mockContent,
          file: 'templates/components/test-template.md',
          type: 'template'
        }
      });
    });

    it('should handle directory traversal attack', async () => {
      mockReq.params = ['../../../etc/passwd'];

      await controller.getFile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied'
      });
    });

    it('should handle file not found error', async () => {
      const error = new Error('ENOENT: no such file or directory');
      fs.readFile.mockRejectedValue(error);

      await controller.getFile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('scanDirectoryForPrompts', () => {
    it('should scan directory and return prompts', async () => {
      const mockItems = [
        { name: 'development', isDirectory: () => true, isFile: () => false },
        { name: 'test-prompt.md', isDirectory: () => false, isFile: () => true },
        { name: 'other.txt', isDirectory: () => false, isFile: () => true }
      ];
      fs.readdir.mockResolvedValue(mockItems);

      const result = await controller.scanDirectoryForPrompts('/test/path');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', 'test-prompt');
      expect(result[0]).toHaveProperty('type', 'prompt');
    });

    it('should handle nested directories recursively', async () => {
      const mockItems = [{ name: 'subdir', isDirectory: () => true, isFile: () => false }];
      fs.readdir
        .mockResolvedValueOnce(mockItems)
        .mockResolvedValueOnce([{ name: 'nested-prompt.md', isDirectory: () => false, isFile: () => true }]);

      const result = await controller.scanDirectoryForPrompts('/test/path');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', 'nested-prompt');
    });

    it('should handle directory not found error', async () => {
      const error = new Error('ENOENT: no such file or directory');
      fs.readdir.mockRejectedValue(error);

      const result = await controller.scanDirectoryForPrompts('/nonexistent/path');

      expect(result).toEqual([]);
    });
  });

  describe('scanDirectoryForTemplates', () => {
    it('should scan directory and return templates', async () => {
      const mockItems = [
        { name: 'components', isDirectory: () => true, isFile: () => false },
        { name: 'test-template.md', isDirectory: () => false, isFile: () => true },
        { name: 'other.txt', isDirectory: () => false, isFile: () => true }
      ];
      fs.readdir.mockResolvedValue(mockItems);

      const result = await controller.scanDirectoryForTemplates('/test/path');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', 'test-template');
      expect(result[0]).toHaveProperty('type', 'template');
    });

    it('should handle nested directories recursively', async () => {
      const mockItems = [{ name: 'subdir', isDirectory: () => true, isFile: () => false }];
      fs.readdir
        .mockResolvedValueOnce(mockItems)
        .mockResolvedValueOnce([{ name: 'nested-template.md', isDirectory: () => false, isFile: () => true }]);

      const result = await controller.scanDirectoryForTemplates('/test/path');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', 'nested-template');
    });

    it('should handle directory not found error', async () => {
      const error = new Error('ENOENT: no such file or directory');
      fs.readdir.mockRejectedValue(error);

      const result = await controller.scanDirectoryForTemplates('/nonexistent/path');

      expect(result).toEqual([]);
    });
  });

  describe('getFrameworkPromptFile', () => {
    beforeEach(() => {
      mockReq.params = { frameworkId: 'react-framework', filename: 'test-prompt.md' };
    });

    it('should return framework prompt file content successfully', async () => {
      const mockContent = '# Framework Prompt\n\nThis is a framework prompt.';
      fs.readFile.mockResolvedValue(mockContent);

      await controller.getFrameworkPromptFile(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        frameworkId: 'react-framework',
        filename: 'test-prompt.md',
        content: mockContent
      });
    });

    it('should handle file not found error', async () => {
      const error = new Error('ENOENT: no such file or directory');
      fs.readFile.mockRejectedValue(error);

      await controller.getFrameworkPromptFile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getFrameworkTemplateFile', () => {
    beforeEach(() => {
      mockReq.params = { frameworkId: 'react-framework', filename: 'test-template.md' };
    });

    it('should return framework template file content successfully', async () => {
      const mockContent = '# Framework Template\n\nThis is a framework template.';
      fs.readFile.mockResolvedValue(mockContent);

      await controller.getFrameworkTemplateFile(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        frameworkId: 'react-framework',
        filename: 'test-template.md',
        content: mockContent
      });
    });

    it('should handle file not found error', async () => {
      const error = new Error('ENOENT: no such file or directory');
      fs.readFile.mockRejectedValue(error);

      await controller.getFrameworkTemplateFile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });
}); 