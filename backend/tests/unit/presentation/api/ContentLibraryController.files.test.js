const ContentLibraryController = require('@api/ContentLibraryController');
const fs = require('fs').promises;

jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn()
  }
}));

describe('ContentLibraryController Files', () => {
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

  describe('getFile', () => {
    it('should return file content successfully', async () => {
      mockReq.params[0] = 'frameworks/react-framework/README.md';
      const mockContent = '# React Framework\n\nThis is a React framework.';
      fs.readFile.mockResolvedValue(mockContent);

      await controller.getFile(mockReq, mockRes);

      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('content-library/frameworks/react-framework/README.md'),
        'utf8'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 'README',
          name: 'R E A D M E',
          content: mockContent,
          file: 'frameworks/react-framework/README.md',
          type: 'prompt'
        }
      });
    });

    it('should handle file not found error', async () => {
      mockReq.params[0] = 'nonexistent/file.md';
      const error = new Error('ENOENT: no such file or directory');
      error.code = 'ENOENT';
      fs.readFile.mockRejectedValue(error);

      await controller.getFile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'File not found',
        message: 'ENOENT: no such file or directory'
      });
    });

    it('should handle other fs.readFile errors', async () => {
      mockReq.params[0] = 'frameworks/react-framework/README.md';
      const error = new Error('Permission denied');
      error.code = 'EACCES';
      fs.readFile.mockRejectedValue(error);

      await controller.getFile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'File not found',
        message: 'Permission denied'
      });
    });

    it('should handle missing path parameter', async () => {
      mockReq.params = {};

      await controller.getFile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'File not found',
        message: "The \"path\" argument must be of type string. Received undefined"
      });
    });

    it('should prevent directory traversal attacks', async () => {
      mockReq.params[0] = '../../../etc/passwd';

      await controller.getFile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied'
      });
    });
  });
}); 