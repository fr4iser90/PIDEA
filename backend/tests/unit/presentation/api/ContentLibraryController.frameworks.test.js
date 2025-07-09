const ContentLibraryController = require('@/presentation/api/ContentLibraryController');
const fs = require('fs').promises;
const path = require('path');

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
}); 