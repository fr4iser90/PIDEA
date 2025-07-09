const ContentLibraryController = require('@/presentation/api/ContentLibraryController');
const fs = require('fs').promises;

jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn()
  }
}));

describe('ContentLibraryController Prompts', () => {
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

  describe('getFrameworkPrompts', () => {
    it('should return framework prompts successfully', async () => {
      mockReq.params.frameworkId = 'react-framework';
      const mockPrompts = [
        { id: 'component', name: 'component', category: 'development', file: 'frameworks/react-framework/prompts/component.md', type: 'prompt' },
        { id: 'testing', name: 'testing', category: 'testing', file: 'frameworks/react-framework/prompts/testing.md', type: 'prompt' }
      ];
      
      // Mock the scanDirectoryForPrompts method
      controller.scanDirectoryForPrompts = jest.fn().mockResolvedValue(mockPrompts);

      await controller.getFrameworkPrompts(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          frameworkId: 'react-framework',
          prompts: mockPrompts
        }
      });
    });

    it('should filter prompts by category', async () => {
      mockReq.params.frameworkId = 'react-framework';
      mockReq.query.category = 'development';
      const mockPrompts = [
        { id: 'component', name: 'component', category: 'development', file: 'frameworks/react-framework/prompts/component.md', type: 'prompt' },
        { id: 'testing', name: 'testing', category: 'testing', file: 'frameworks/react-framework/prompts/testing.md', type: 'prompt' }
      ];
      
      controller.scanDirectoryForPrompts = jest.fn().mockResolvedValue(mockPrompts);

      await controller.getFrameworkPrompts(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          frameworkId: 'react-framework',
          prompts: [{ id: 'component', name: 'component', category: 'development', file: 'frameworks/react-framework/prompts/component.md', type: 'prompt' }]
        }
      });
    });

    it('should handle scanDirectoryForPrompts error', async () => {
      mockReq.params.frameworkId = 'react-framework';
      controller.scanDirectoryForPrompts = jest.fn().mockRejectedValue(new Error('Directory not found'));

      await controller.getFrameworkPrompts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to load framework prompts',
        message: 'Directory not found'
      });
    });
  });

  describe('getPrompts', () => {
    it('should return all prompts successfully', async () => {
      const mockPrompts = [
        { id: 'development', name: 'development', category: 'development', file: 'prompts/development.md', type: 'prompt' },
        { id: 'testing', name: 'testing', category: 'testing', file: 'prompts/testing.md', type: 'prompt' }
      ];
      
      controller.scanDirectoryForPrompts = jest.fn().mockResolvedValue(mockPrompts);

      await controller.getPrompts(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockPrompts
      });
    });

    it('should filter prompts by category', async () => {
      mockReq.query.category = 'development';
      const mockPrompts = [
        { id: 'development', name: 'development', category: 'development', file: 'prompts/development.md', type: 'prompt' },
        { id: 'testing', name: 'testing', category: 'testing', file: 'prompts/testing.md', type: 'prompt' }
      ];
      
      controller.scanDirectoryForPrompts = jest.fn().mockResolvedValue(mockPrompts);

      await controller.getPrompts(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 'development', name: 'development', category: 'development', file: 'prompts/development.md', type: 'prompt' }]
      });
    });

    it('should handle scanDirectoryForPrompts error', async () => {
      controller.scanDirectoryForPrompts = jest.fn().mockRejectedValue(new Error('Directory not found'));

      await controller.getPrompts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to load prompts',
        message: 'Directory not found'
      });
    });
  });

  describe('getPromptsByCategory', () => {
    it('should return prompts by category successfully', async () => {
      mockReq.params.category = 'development';
      const mockPrompts = [
        { id: 'component', name: 'component', category: 'development', file: 'prompts/development/component.md', type: 'prompt' }
      ];
      
      controller.scanDirectoryForPrompts = jest.fn().mockResolvedValue(mockPrompts);

      await controller.getPromptsByCategory(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          category: 'development',
          prompts: mockPrompts
        }
      });
    });

    it('should handle scanDirectoryForPrompts error', async () => {
      mockReq.params.category = 'development';
      controller.scanDirectoryForPrompts = jest.fn().mockRejectedValue(new Error('Directory not found'));

      await controller.getPromptsByCategory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to load prompts by category',
        message: 'Directory not found'
      });
    });
  });

  describe('getPromptFile', () => {
    it('should return prompt file content successfully', async () => {
      mockReq.params.category = 'development';
      mockReq.params.filename = 'component.md';
      const mockContent = '# Component Development\n\nThis is a component prompt.';
      fs.readFile.mockResolvedValue(mockContent);

      await controller.getPromptFile(mockReq, mockRes);

      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('content-library/prompts/development/component.md'),
        'utf-8'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        category: 'development',
        filename: 'component.md',
        content: mockContent
      });
    });

    it('should handle file not found error', async () => {
      mockReq.params.category = 'development';
      mockReq.params.filename = 'nonexistent.md';
      fs.readFile.mockRejectedValue(new Error('File not found'));

      await controller.getPromptFile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Prompt file not found',
        message: 'File not found'
      });
    });
  });

  describe('getPromptFileWithSubcategory', () => {
    it('should return prompt file with subcategory successfully', async () => {
      mockReq.params.category = 'development';
      mockReq.params.subcategory = 'react';
      mockReq.params.filename = 'component.md';
      const mockContent = '# React Component Development\n\nThis is a React component prompt.';
      fs.readFile.mockResolvedValue(mockContent);

      await controller.getPromptFileWithSubcategory(mockReq, mockRes);

      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('content-library/prompts/development/react/component.md'),
        'utf-8'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        category: 'development',
        subcategory: 'react',
        filename: 'component.md',
        content: mockContent
      });
    });

    it('should handle file not found error', async () => {
      mockReq.params.category = 'development';
      mockReq.params.subcategory = 'react';
      mockReq.params.filename = 'nonexistent.md';
      fs.readFile.mockRejectedValue(new Error('File not found'));

      await controller.getPromptFileWithSubcategory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Prompt file not found',
        message: 'File not found'
      });
    });
  });

  describe('getFrameworkPromptFile', () => {
    it('should return framework prompt file successfully', async () => {
      mockReq.params.frameworkId = 'react-framework';
      mockReq.params.filename = 'component.md';
      const mockContent = '# React Component Development\n\nThis is a React framework prompt.';
      fs.readFile.mockResolvedValue(mockContent);

      await controller.getFrameworkPromptFile(mockReq, mockRes);

      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('content-library/frameworks/react-framework/prompts/component.md'),
        'utf-8'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        frameworkId: 'react-framework',
        filename: 'component.md',
        content: mockContent
      });
    });

    it('should handle file not found error', async () => {
      mockReq.params.frameworkId = 'react-framework';
      mockReq.params.filename = 'nonexistent.md';
      fs.readFile.mockRejectedValue(new Error('File not found'));

      await controller.getFrameworkPromptFile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Framework prompt file not found',
        message: 'File not found'
      });
    });
  });
}); 