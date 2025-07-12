const CodeExplorerController = require('@api/CodeExplorerController');
const BrowserManager = require('@external/BrowserManager');

// Mock BrowserManager
jest.mock('../../../../infrastructure/external/BrowserManager');

describe('CodeExplorerController', () => {
  let controller;
  let mockBrowserManager;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Create mock BrowserManager
    mockBrowserManager = {
      getFileExplorerTree: jest.fn(),
      openFile: jest.fn(),
      getCurrentFileContent: jest.fn(),
      getCurrentFileInfo: jest.fn(),
      refreshExplorer: jest.fn()
    };

    // Mock the BrowserManager constructor
    BrowserManager.mockImplementation(() => mockBrowserManager);

    // Create controller instance
    controller = new CodeExplorerController();

    // Create mock request and response objects
    mockReq = {
      body: {},
      params: {},
      query: {}
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    // Reset console mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with BrowserManager instance', () => {
      // Create a new controller instance for this test
      const newController = new CodeExplorerController();
      expect(BrowserManager).toHaveBeenCalledTimes(1);
      expect(newController.browserManager).toBe(mockBrowserManager);
    });
  });

  describe('getFileTree', () => {
    it('should return file tree successfully', async () => {
      const mockFiles = [
        {
          name: 'backend',
          path: 'backend',
          type: 'directory',
          level: 1,
          expanded: true,
          selected: false,
          children: [
            {
              name: 'package.json',
              path: 'backend/package.json',
              type: 'file',
              level: 2,
              expanded: false,
              selected: false,
              children: []
            }
          ]
        }
      ];

      mockBrowserManager.getFileExplorerTree.mockResolvedValue(mockFiles);

      await controller.getFileTree(mockReq, mockRes);

      expect(mockBrowserManager.getFileExplorerTree).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockFiles
      });
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle error when getting file tree fails', async () => {
      const error = new Error('Failed to get file tree');
      mockBrowserManager.getFileExplorerTree.mockRejectedValue(error);

      await controller.getFileTree(mockReq, mockRes);

      expect(mockBrowserManager.getFileExplorerTree).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get file tree'
      });
    });

    it('should handle empty file tree', async () => {
      mockBrowserManager.getFileExplorerTree.mockResolvedValue([]);

      await controller.getFileTree(mockReq, mockRes);

      expect(mockBrowserManager.getFileExplorerTree).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: []
      });
    });
  });

  describe('getFileContent', () => {
    beforeEach(() => {
      mockReq.params = { path: 'backend/package.json' };
    });

    it('should return file content successfully', async () => {
      const mockContent = '{"name": "backend", "version": "1.0.0"}';
      const mockOpened = true;

      mockBrowserManager.openFile.mockResolvedValue(mockOpened);
      mockBrowserManager.getCurrentFileContent.mockResolvedValue(mockContent);

      await controller.getFileContent(mockReq, mockRes);

      expect(mockBrowserManager.openFile).toHaveBeenCalledWith('backend/package.json');
      expect(mockBrowserManager.getCurrentFileContent).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          path: 'backend/package.json',
          content: mockContent,
          opened: mockOpened
        }
      });
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 404 when file cannot be opened', async () => {
      mockBrowserManager.openFile.mockResolvedValue(false);

      await controller.getFileContent(mockReq, mockRes);

      expect(mockBrowserManager.openFile).toHaveBeenCalledWith('backend/package.json');
      expect(mockBrowserManager.getCurrentFileContent).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'File not found or could not be opened'
      });
    });

    it('should handle error when opening file fails', async () => {
      const error = new Error('Failed to open file');
      mockBrowserManager.openFile.mockRejectedValue(error);

      await controller.getFileContent(mockReq, mockRes);

      expect(mockBrowserManager.openFile).toHaveBeenCalledWith('backend/package.json');
      expect(mockBrowserManager.getCurrentFileContent).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to open file'
      });
    });

    it('should handle error when getting file content fails', async () => {
      const error = new Error('Failed to get file content');
      mockBrowserManager.openFile.mockResolvedValue(true);
      mockBrowserManager.getCurrentFileContent.mockRejectedValue(error);

      await controller.getFileContent(mockReq, mockRes);

      expect(mockBrowserManager.openFile).toHaveBeenCalledWith('backend/package.json');
      expect(mockBrowserManager.getCurrentFileContent).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get file content'
      });
    });

    it('should handle missing path parameter', async () => {
      mockReq.params = {};
      mockBrowserManager.openFile.mockResolvedValue(false);

      await controller.getFileContent(mockReq, mockRes);

      expect(mockBrowserManager.openFile).toHaveBeenCalledWith(undefined);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'File not found or could not be opened'
      });
    });

    it('should handle null path parameter', async () => {
      mockReq.params = { path: null };
      mockBrowserManager.openFile.mockResolvedValue(false);

      await controller.getFileContent(mockReq, mockRes);

      expect(mockBrowserManager.openFile).toHaveBeenCalledWith(null);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'File not found or could not be opened'
      });
    });
  });

  describe('getCurrentFileInfo', () => {
    it('should return current file info successfully', async () => {
      const mockFileInfo = {
        name: 'package.json',
        path: 'backend/package.json',
        size: 1024,
        modified: new Date().toISOString(),
        type: 'file'
      };

      mockBrowserManager.getCurrentFileInfo.mockResolvedValue(mockFileInfo);

      await controller.getCurrentFileInfo(mockReq, mockRes);

      expect(mockBrowserManager.getCurrentFileInfo).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockFileInfo
      });
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle error when getting current file info fails', async () => {
      const error = new Error('Failed to get current file info');
      mockBrowserManager.getCurrentFileInfo.mockRejectedValue(error);

      await controller.getCurrentFileInfo(mockReq, mockRes);

      expect(mockBrowserManager.getCurrentFileInfo).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get current file info'
      });
    });

    it('should handle null file info', async () => {
      mockBrowserManager.getCurrentFileInfo.mockResolvedValue(null);

      await controller.getCurrentFileInfo(mockReq, mockRes);

      expect(mockBrowserManager.getCurrentFileInfo).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: null
      });
    });

    it('should handle empty file info object', async () => {
      mockBrowserManager.getCurrentFileInfo.mockResolvedValue({});

      await controller.getCurrentFileInfo(mockReq, mockRes);

      expect(mockBrowserManager.getCurrentFileInfo).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {}
      });
    });
  });

  describe('refreshExplorer', () => {
    it('should refresh explorer successfully', async () => {
      const mockRefreshed = true;

      mockBrowserManager.refreshExplorer.mockResolvedValue(mockRefreshed);

      await controller.refreshExplorer(mockReq, mockRes);

      expect(mockBrowserManager.refreshExplorer).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { refreshed: mockRefreshed }
      });
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle error when refreshing explorer fails', async () => {
      const error = new Error('Failed to refresh explorer');
      mockBrowserManager.refreshExplorer.mockRejectedValue(error);

      await controller.refreshExplorer(mockReq, mockRes);

      expect(mockBrowserManager.refreshExplorer).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to refresh explorer'
      });
    });

    it('should handle refresh returning false', async () => {
      mockBrowserManager.refreshExplorer.mockResolvedValue(false);

      await controller.refreshExplorer(mockReq, mockRes);

      expect(mockBrowserManager.refreshExplorer).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { refreshed: false }
      });
    });

    it('should handle refresh returning null', async () => {
      mockBrowserManager.refreshExplorer.mockResolvedValue(null);

      await controller.refreshExplorer(mockReq, mockRes);

      expect(mockBrowserManager.refreshExplorer).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { refreshed: null }
      });
    });
  });

  describe('error handling edge cases', () => {
    it('should handle non-Error objects thrown', async () => {
      const nonError = 'String error';
      mockBrowserManager.getFileExplorerTree.mockRejectedValue(nonError);

      await controller.getFileTree(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'String error'
      });
    });

    it('should handle Error objects without message property', async () => {
      const errorWithoutMessage = new Error();
      delete errorWithoutMessage.message;
      mockBrowserManager.getFileExplorerTree.mockRejectedValue(errorWithoutMessage);

      await controller.getFileTree(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Error'
      });
    });

    it('should handle undefined error', async () => {
      mockBrowserManager.getFileExplorerTree.mockRejectedValue(undefined);

      await controller.getFileTree(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'undefined'
      });
    });
  });

  describe('console logging', () => {
    it('should log success messages', async () => {
      const mockFiles = [{ name: 'test.js', path: 'test.js', type: 'file' }];
      mockBrowserManager.getFileExplorerTree.mockResolvedValue(mockFiles);

      await controller.getFileTree(mockReq, mockRes);

      expect(console.log).toHaveBeenCalledWith('[CodeExplorerController] Getting file tree...');
    });

    it('should log error messages', async () => {
      const error = new Error('Test error');
      mockBrowserManager.getFileExplorerTree.mockRejectedValue(error);

      await controller.getFileTree(mockReq, mockRes);

      expect(console.error).toHaveBeenCalledWith('[CodeExplorerController] Error getting file tree:', error);
    });

    it('should log file content requests with path', async () => {
      mockReq.params = { path: 'test/file.js' };
      mockBrowserManager.openFile.mockResolvedValue(true);
      mockBrowserManager.getCurrentFileContent.mockResolvedValue('content');

      await controller.getFileContent(mockReq, mockRes);

      expect(console.log).toHaveBeenCalledWith('[CodeExplorerController] Getting file content for: test/file.js');
    });

    it('should log current file info requests', async () => {
      mockBrowserManager.getCurrentFileInfo.mockResolvedValue({});

      await controller.getCurrentFileInfo(mockReq, mockRes);

      expect(console.log).toHaveBeenCalledWith('[CodeExplorerController] Getting current file info...');
    });

    it('should log refresh explorer requests', async () => {
      mockBrowserManager.refreshExplorer.mockResolvedValue(true);

      await controller.refreshExplorer(mockReq, mockRes);

      expect(console.log).toHaveBeenCalledWith('[CodeExplorerController] Refreshing explorer...');
    });
  });
}); 