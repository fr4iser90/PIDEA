const ContentLibraryController = require('@api/ContentLibraryController');
const fs = require('fs').promises;

jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn()
  }
}));

describe('ContentLibraryController Scan', () => {
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

  describe('scanDirectoryForPrompts', () => {
    it('should scan prompts directory successfully', async () => {
      const mockFiles = [
        { name: 'development.md', isDirectory: () => false },
        { name: 'testing.md', isDirectory: () => false },
        { name: 'subfolder', isDirectory: () => true }
      ];
      fs.readdir.mockResolvedValue(mockFiles);

      await controller.scanDirectoryForPrompts(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [
          { id: 'development', name: 'development', path: 'prompts/development.md', type: 'prompt' },
          { id: 'testing', name: 'testing', path: 'prompts/testing.md', type: 'prompt' }
        ]
      });
    });

    it('should handle empty prompts directory', async () => {
      fs.readdir.mockResolvedValue([]);

      await controller.scanDirectoryForPrompts(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: [] });
    });

    it('should handle fs.readdir error', async () => {
      const error = new Error('Directory not found');
      fs.readdir.mockRejectedValue(error);

      await controller.scanDirectoryForPrompts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to scan prompts directory',
        message: 'Directory not found'
      });
    });
  });

  describe('scanDirectoryForTemplates', () => {
    it('should scan templates directory successfully', async () => {
      const mockFiles = [
        { name: 'game-template.md', isDirectory: () => false },
        { name: 'school-template.md', isDirectory: () => false },
        { name: 'subfolder', isDirectory: () => true }
      ];
      fs.readdir.mockResolvedValue(mockFiles);

      await controller.scanDirectoryForTemplates(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [
          { id: 'game-template', name: 'game', path: 'templates/game-template.md', type: 'template' },
          { id: 'school-template', name: 'school', path: 'templates/school-template.md', type: 'template' }
        ]
      });
    });

    it('should handle empty templates directory', async () => {
      fs.readdir.mockResolvedValue([]);

      await controller.scanDirectoryForTemplates(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: [] });
    });

    it('should handle fs.readdir error', async () => {
      const error = new Error('Directory not found');
      fs.readdir.mockRejectedValue(error);

      await controller.scanDirectoryForTemplates(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to scan templates directory',
        message: 'Directory not found'
      });
    });
  });
}); 