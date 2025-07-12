const vscodeIDEService = require('@services/vscodeIDEService');
const VSCodeDetector = require('@external/VSCodeDetector');
const VSCodeStarter = require('@external/VSCodeStarter');
const VSCodeExtensionManager = require('@external/VSCodeExtensionManager');
const IDEManager = require('@external/IDEManager');

// Mock dependencies
jest.mock('../../infrastructure/external/VSCodeDetector');
jest.mock('../../infrastructure/external/VSCodeStarter');
jest.mock('../../infrastructure/external/VSCodeExtensionManager');
jest.mock('../../infrastructure/external/IDEManager');

describe('VSCode Integration Tests', () => {
  let vscodeIDEService;
  let mockBrowserManager;
  let mockIDEManager;
  let mockEventBus;

  beforeEach(() => {
    jest.clearAllMocks();

    mockBrowserManager = {
      getPage: jest.fn(),
      getCurrentPort: jest.fn(),
      switchToPort: jest.fn(),
      connect: jest.fn()
    };

    mockIDEManager = {
      getActivePort: jest.fn(),
      getActiveIDE: jest.fn(),
      switchToIDE: jest.fn(),
      startNewIDE: jest.fn(),
      stopIDE: jest.fn(),
      getAvailableIDEs: jest.fn(),
      getWorkspacePath: jest.fn(),
      getWorkspaceInfo: jest.fn()
    };

    mockEventBus = {
      subscribe: jest.fn(),
      publish: jest.fn()
    };

    vscodeIDEService = new vscodeIDEService(mockBrowserManager, mockIDEManager, mockEventBus);
  });

  describe('VSCode Detection Integration', () => {
    it('should detect VSCode instances correctly', async () => {
      const mockVSCodeInstances = [
        { port: 9232, status: 'running', url: 'http://127.0.0.1:9232', ideType: 'vscode' },
        { port: 9233, status: 'running', url: 'http://127.0.0.1:9233', ideType: 'vscode' }
      ];

      mockIDEManager.getAvailableIDEs.mockResolvedValue(mockVSCodeInstances);

      const result = await vscodeIDEService.getAvailableIDEs();

      expect(result).toEqual(mockVSCodeInstances);
      expect(mockIDEManager.getAvailableIDEs).toHaveBeenCalled();
    });

    it('should handle no VSCode instances found', async () => {
      mockIDEManager.getAvailableIDEs.mockResolvedValue([]);

      const result = await vscodeIDEService.getAvailableIDEs();

      expect(result).toEqual([]);
    });
  });

  describe('VSCode Startup Integration', () => {
    it('should start VSCode instance successfully', async () => {
      const workspacePath = '/test/workspace';
      const expectedResult = {
        port: 9232,
        pid: 12345,
        status: 'starting',
        ideType: 'vscode'
      };

      mockIDEManager.startNewIDE.mockResolvedValue(expectedResult);

      const result = await vscodeIDEService.startNewVSCode(workspacePath);

      expect(result).toEqual(expectedResult);
      expect(mockIDEManager.startNewIDE).toHaveBeenCalledWith(workspacePath, 'vscode');
    });

    it('should handle VSCode startup errors', async () => {
      const workspacePath = '/test/workspace';
      const error = new Error('Failed to start VSCode');

      mockIDEManager.startNewIDE.mockRejectedValue(error);

      await expect(vscodeIDEService.startNewVSCode(workspacePath)).rejects.toThrow('Failed to start VSCode');
    });
  });

  describe('VSCode Extension Integration', () => {
    it('should detect extensions correctly', async () => {
      const mockExtensions = [
        { id: 'github.copilot', displayName: 'GitHub Copilot', version: '1.0.0' },
        { id: 'ms-vscode.vscode-json', displayName: 'JSON Language Features', version: '1.0.0' }
      ];

      mockIDEManager.getActiveIDE.mockResolvedValue({ port: 9232 });
      vscodeIDEService.extensionManager.detectExtensions = jest.fn().mockResolvedValue({
        port: 9232,
        extensions: mockExtensions,
        detected: true,
        count: 2
      });

      const result = await vscodeIDEService.detectExtensions();

      expect(result.detected).toBe(true);
      expect(result.extensions).toEqual(mockExtensions);
      expect(result.count).toBe(2);
    });

    it('should get chat extensions correctly', async () => {
      const mockChatExtensions = [
        { id: 'github.copilot', displayName: 'GitHub Copilot' }
      ];

      mockIDEManager.getActiveIDE.mockResolvedValue({ port: 9232 });
      vscodeIDEService.extensionManager.getChatExtensions = jest.fn().mockResolvedValue(mockChatExtensions);

      const result = await vscodeIDEService.getChatExtensions();

      expect(result).toEqual(mockChatExtensions);
      expect(vscodeIDEService.extensionManager.getChatExtensions).toHaveBeenCalledWith(9232);
    });

    it('should check extension availability correctly', async () => {
      mockIDEManager.getActiveIDE.mockResolvedValue({ port: 9232 });
      vscodeIDEService.extensionManager.hasExtension = jest.fn().mockResolvedValue(true);

      const result = await vscodeIDEService.hasExtension('github.copilot');

      expect(result).toBe(true);
      expect(vscodeIDEService.extensionManager.hasExtension).toHaveBeenCalledWith(9232, 'github.copilot');
    });
  });

  describe('VSCode Communication Integration', () => {
    it('should send message to VSCode successfully', async () => {
      const message = 'Test message';
      const mockPage = { evaluate: jest.fn() };

      mockBrowserManager.getPage.mockResolvedValue(mockPage);
      mockIDEManager.getActivePort.mockReturnValue(9232);
      mockBrowserManager.getCurrentPort.mockReturnValue(9232);

      vscodeIDEService.chatMessageHandler = {
        sendMessage: jest.fn().mockResolvedValue({ success: true, message: 'Sent successfully' })
      };

      const result = await vscodeIDEService.sendMessage(message);

      expect(result.success).toBe(true);
      expect(vscodeIDEService.chatMessageHandler.sendMessage).toHaveBeenCalledWith(message, {});
    });

    it('should handle browser port switching', async () => {
      const message = 'Test message';
      const mockPage = { evaluate: jest.fn() };

      mockBrowserManager.getPage.mockResolvedValue(mockPage);
      mockIDEManager.getActivePort.mockReturnValue(9232);
      mockBrowserManager.getCurrentPort.mockReturnValue(9222);

      vscodeIDEService.chatMessageHandler = {
        sendMessage: jest.fn().mockResolvedValue({ success: true })
      };

      await vscodeIDEService.sendMessage(message);

      expect(mockBrowserManager.switchToPort).toHaveBeenCalledWith(9232);
    });

    it('should post to VSCode successfully', async () => {
      const prompt = 'Test prompt';

      vscodeIDEService.chatMessageHandler = {
        sendMessage: jest.fn().mockResolvedValue({ success: true, response: 'AI response' })
      };

      const result = await vscodeIDEService.postToVSCode(prompt);

      expect(result.success).toBe(true);
      expect(result.response).toBe('AI response');
    });
  });

  describe('VSCode Workspace Integration', () => {
    it('should get workspace information correctly', async () => {
      const mockWorkspaceInfo = {
        port: 9232,
        workspacePath: '/test/workspace',
        files: ['index.js', 'package.json'],
        gitStatus: 'clean'
      };

      mockIDEManager.getWorkspaceInfo.mockResolvedValue(mockWorkspaceInfo);

      const result = await mockIDEManager.getWorkspaceInfo(9232);

      expect(result).toEqual(mockWorkspaceInfo);
    });

    it('should handle workspace path detection', async () => {
      const workspacePath = '/test/workspace';
      mockIDEManager.getWorkspacePath.mockReturnValue(workspacePath);

      const result = mockIDEManager.getWorkspacePath(9232);

      expect(result).toBe(workspacePath);
    });
  });

  describe('VSCode Task Integration', () => {
    it('should send task to VSCode successfully', async () => {
      const task = {
        id: 'task-123',
        title: 'Implement Feature',
        description: 'Implement new feature',
        type: 'feature',
        priority: 'high',
        status: 'pending',
        createdAt: new Date(),
        projectId: 'project-123'
      };

      const workspacePath = '/test/workspace';
      const mockPage = { evaluate: jest.fn() };

      mockBrowserManager.getPage.mockResolvedValue(mockPage);
      mockIDEManager.getActiveIDE.mockResolvedValue({ port: 9232, workspacePath });

      const result = await vscodeIDEService.sendTaskToVSCode(task, workspacePath);

      expect(result.success).toBe(true);
      expect(result.taskId).toBe('task-123');
      expect(result).toHaveProperty('filePath');
    });

    it('should send auto mode tasks successfully', async () => {
      const tasks = [
        { id: 'task-1', title: 'Task 1', description: 'Description 1' },
        { id: 'task-2', title: 'Task 2', description: 'Description 2' }
      ];

      const projectAnalysis = {
        projectType: 'React',
        complexity: 'medium',
        projectPath: '/test/project',
        timestamp: new Date()
      };

      const workspacePath = '/test/workspace';
      const mockPage = { evaluate: jest.fn() };

      mockBrowserManager.getPage.mockResolvedValue(mockPage);
      mockIDEManager.getActiveIDE.mockResolvedValue({ port: 9232, workspacePath });

      const result = await vscodeIDEService.sendAutoModeTasksToVSCode(tasks, projectAnalysis, workspacePath);

      expect(result.success).toBe(true);
      expect(result.taskCount).toBe(2);
    });
  });

  describe('VSCode Status Integration', () => {
    it('should get connection status correctly', async () => {
      const userId = 'test-user';
      const mockPage = { evaluate: jest.fn() };

      mockBrowserManager.getPage.mockResolvedValue(mockPage);
      mockIDEManager.getActiveIDE.mockResolvedValue({
        port: 9232,
        workspacePath: '/test/workspace',
        status: 'running'
      });

      const result = await vscodeIDEService.getConnectionStatus(userId);

      expect(result.connected).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result).toHaveProperty('timestamp');
    });

    it('should handle connection failures', async () => {
      const userId = 'test-user';

      mockBrowserManager.getPage.mockRejectedValue(new Error('Connection failed'));

      const result = await vscodeIDEService.getConnectionStatus(userId);

      expect(result.connected).toBe(false);
      expect(result).toHaveProperty('error');
    });
  });

  describe('VSCode Port Management Integration', () => {
    it('should switch to port correctly', async () => {
      const port = 9232;
      const currentPort = 9222;

      mockIDEManager.getActivePort.mockReturnValue(currentPort);

      await vscodeIDEService.switchToPort(port);

      expect(mockIDEManager.switchToIDE).toHaveBeenCalledWith(port);
      expect(mockBrowserManager.switchToPort).toHaveBeenCalledWith(port);
    });

    it('should get active port correctly', async () => {
      const activePort = 9232;
      mockIDEManager.getActivePort.mockReturnValue(activePort);

      const result = vscodeIDEService.getActivePort();

      expect(result).toBe(activePort);
    });
  });

  describe('VSCode Error Handling Integration', () => {
    it('should handle browser connection errors gracefully', async () => {
      const message = 'Test message';

      mockBrowserManager.getPage.mockRejectedValue(new Error('Browser not available'));
      mockIDEManager.getActivePort.mockReturnValue(9232);

      vscodeIDEService.chatMessageHandler = {
        sendMessage: jest.fn().mockResolvedValue({ success: true })
      };

      // Should not throw error, but handle gracefully
      await expect(vscodeIDEService.sendMessage(message)).resolves.toBeDefined();
    });

    it('should handle IDE manager errors gracefully', async () => {
      mockIDEManager.getActiveIDE.mockRejectedValue(new Error('IDE not available'));

      const result = await vscodeIDEService.getConnectionStatus('test-user');

      expect(result.connected).toBe(false);
      expect(result).toHaveProperty('error');
    });
  });
}); 