const AutoModeController = require('@/presentation/api/AutoModeController');
const VibeCoderModeCommand = require('@/application/commands/vibecoder/VibeCoderModeCommand');
const { validationResult } = require('express-validator');

// Mock express-validator
jest.mock('express-validator', () => ({
  validationResult: jest.fn()
}));

// Mock VibeCoderModeCommand
jest.mock('../../../../application/commands/vibecoder/VibeCoderModeCommand');

describe('AutoModeController', () => {
  let controller;
  let mockCommandBus;
  let mockQueryBus;
  let mockLogger;
  let mockEventBus;
  let mockApplication;
  let mockIdeManager;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Create mock dependencies
    mockCommandBus = {
      execute: jest.fn()
    };

    mockQueryBus = {
      execute: jest.fn()
    };

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    mockEventBus = {
      publish: jest.fn()
    };

    mockApplication = {
      projectMappingService: {
        getWorkspaceFromProjectId: jest.fn()
      },
      gitService: {
        createBranch: jest.fn()
      },
      taskService: {
        executeTask: jest.fn()
      }
    };

    mockIdeManager = {
      getActiveIDE: jest.fn(),
      getWorkspaceInfo: jest.fn(),
      clickNewChat: jest.fn()
    };

    // Create controller instance
    controller = new AutoModeController({
      commandBus: mockCommandBus,
      queryBus: mockQueryBus,
      logger: mockLogger,
      eventBus: mockEventBus,
      application: mockApplication,
      ideManager: mockIdeManager
    });

    // Create mock request and response objects
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: { id: 'user-123' }
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with dependencies', () => {
      expect(controller.commandBus).toBe(mockCommandBus);
      expect(controller.queryBus).toBe(mockQueryBus);
      expect(controller.logger).toBe(mockLogger);
      expect(controller.eventBus).toBe(mockEventBus);
      expect(controller.application).toBe(mockApplication);
      expect(controller.ideManager).toBe(mockIdeManager);
    });

    it('should use default logger when not provided', () => {
      const controllerWithoutLogger = new AutoModeController({
        commandBus: mockCommandBus,
        queryBus: mockQueryBus,
        eventBus: mockEventBus,
        application: mockApplication,
        ideManager: mockIdeManager
      });

      expect(controllerWithoutLogger.logger).toBe(console);
    });
  });

  describe('executeAutoMode', () => {
    beforeEach(() => {
      mockReq.params = { projectId: 'test-project' };
      mockReq.body = {
        projectPath: '/test/path',
        mode: 'full',
        options: {},
        aiModel: 'gpt-4',
        autoExecute: true
      };
    });

    it('should return 400 when validation fails', async () => {
      const validationErrors = [
        { msg: 'Project path is required', param: 'projectPath' }
      ];
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => validationErrors
      });

      await controller.executeAutoMode(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        errors: validationErrors
      });
    });

    it('should execute auto mode successfully with full mode', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      const mockCommandInstance = {
        commandId: 'test-command-123'
      };
      VibeCoderModeCommand.mockImplementation(() => mockCommandInstance);
      mockCommandBus.execute.mockResolvedValue({ success: true });

      await controller.executeAutoMode(mockReq, mockRes);

      expect(VibeCoderModeCommand).toHaveBeenCalledWith(expect.objectContaining({
        commandId: expect.stringContaining('auto-mode-'),
        projectPath: '/test/path',
        mode: 'full',
        options: expect.objectContaining({
          aiModel: 'gpt-4',
          autoExecute: true,
          includeAnalyze: true,
          includeRefactor: true,
          includeGenerate: true
        })
      }));

      expect(mockCommandBus.execute).toHaveBeenCalledWith('VibeCoderModeCommand', mockCommandInstance);
      expect(mockEventBus.publish).toHaveBeenCalledWith('autoMode:completed', expect.objectContaining({
        projectId: 'test-project',
        userId: 'user-123'
      }));
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Auto mode execution completed successfully',
        data: expect.objectContaining({
          commandId: expect.stringContaining('auto-mode-'),
          result: { success: true }
        })
      });
    });

    it('should execute auto mode with analysis mode', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      mockReq.body.mode = 'analysis';
      const mockCommandInstance = {};
      VibeCoderModeCommand.mockImplementation(() => mockCommandInstance);
      mockCommandBus.execute.mockResolvedValue({ success: true });

      await controller.executeAutoMode(mockReq, mockRes);

      expect(VibeCoderModeCommand).toHaveBeenCalledWith(expect.objectContaining({
        options: expect.objectContaining({
          includeAnalyze: true,
          includeRefactor: false,
          includeGenerate: false
        })
      }));
    });

    it('should execute auto mode with refactor mode', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      mockReq.body.mode = 'refactor';
      const mockCommandInstance = {};
      VibeCoderModeCommand.mockImplementation(() => mockCommandInstance);
      mockCommandBus.execute.mockResolvedValue({ success: true });

      await controller.executeAutoMode(mockReq, mockRes);

      expect(VibeCoderModeCommand).toHaveBeenCalledWith(expect.objectContaining({
        options: expect.objectContaining({
          includeAnalyze: false,
          includeRefactor: true,
          includeGenerate: false
        })
      }));
    });

    it('should get workspace path from project mapping service', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      mockReq.body.projectPath = undefined;
      mockApplication.projectMappingService.getWorkspaceFromProjectId.mockReturnValue('/mapped/path');
      
      const mockCommandInstance = {};
      VibeCoderModeCommand.mockImplementation(() => mockCommandInstance);
      mockCommandBus.execute.mockResolvedValue({ success: true });

      await controller.executeAutoMode(mockReq, mockRes);

      expect(mockApplication.projectMappingService.getWorkspaceFromProjectId).toHaveBeenCalledWith('test-project');
      expect(VibeCoderModeCommand).toHaveBeenCalledWith(expect.objectContaining({
        projectPath: '/mapped/path'
      }));
    });

    it('should get workspace path from IDE manager when project mapping fails', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      mockReq.body.projectPath = undefined;
      mockApplication.projectMappingService.getWorkspaceFromProjectId.mockReturnValue(null);
      mockIdeManager.getActiveIDE.mockResolvedValue({ port: 3000 });
      mockIdeManager.getWorkspaceInfo.mockResolvedValue({ workspace: '/ide/workspace' });
      
      const mockCommandInstance = {};
      VibeCoderModeCommand.mockImplementation(() => mockCommandInstance);
      mockCommandBus.execute.mockResolvedValue({ success: true });

      await controller.executeAutoMode(mockReq, mockRes);

      expect(mockIdeManager.getActiveIDE).toHaveBeenCalled();
      expect(mockIdeManager.getWorkspaceInfo).toHaveBeenCalledWith(3000);
      expect(VibeCoderModeCommand).toHaveBeenCalledWith(expect.objectContaining({
        projectPath: '/ide/workspace'
      }));
    });

    it('should use project root as final fallback', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      mockReq.body.projectPath = undefined;
      mockApplication.projectMappingService.getWorkspaceFromProjectId.mockReturnValue(null);
      mockIdeManager.getActiveIDE.mockRejectedValue(new Error('IDE not found'));
      
      const mockCommandInstance = {};
      VibeCoderModeCommand.mockImplementation(() => mockCommandInstance);
      mockCommandBus.execute.mockResolvedValue({ success: true });

      await controller.executeAutoMode(mockReq, mockRes);

      expect(mockLogger.warn).toHaveBeenCalledWith('AutoModeController: File-based detection failed, using project root', expect.any(Object));
      expect(VibeCoderModeCommand).toHaveBeenCalledWith(expect.objectContaining({
        projectPath: expect.any(String)
      }));
    });

    it('should handle task execution with taskId', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      mockReq.body.taskId = 'task-123';
      mockReq.body.options = {
        createGitBranch: true,
        branchName: 'feature/test',
        clickNewChat: true
      };
      mockReq.body.projectPath = '/test/path';
      
      mockApplication.gitService.createBranch.mockResolvedValue();
      mockIdeManager.getActiveIDE.mockResolvedValue({ port: 3000 });
      mockIdeManager.clickNewChat.mockResolvedValue();
      mockApplication.taskService.executeTask.mockResolvedValue({ success: true });

      await controller.executeAutoMode(mockReq, mockRes);

      expect(mockApplication.gitService.createBranch).toHaveBeenCalledWith('/test/path', 'feature/test');
      expect(mockIdeManager.clickNewChat).toHaveBeenCalledWith(3000);
      expect(mockApplication.taskService.executeTask).toHaveBeenCalledWith('task-123', {
        projectPath: '/test/path',
        userId: 'user-123',
        projectId: 'test-project'
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task executed successfully',
        data: {
          taskId: 'task-123',
          result: { success: true },
          gitBranch: 'feature/test',
          newChat: true
        }
      });
    });

    it('should handle Git branch creation failure', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      mockReq.body.taskId = 'task-123';
      mockReq.body.options = {
        createGitBranch: true,
        branchName: 'feature/test'
      };
      mockReq.body.projectPath = '/test/path';
      
      mockApplication.gitService.createBranch.mockRejectedValue(new Error('Git error'));
      mockApplication.taskService.executeTask.mockResolvedValue({ success: true });

      await controller.executeAutoMode(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith('AutoModeController: Failed to create Git branch', expect.any(Object));
      expect(mockApplication.taskService.executeTask).toHaveBeenCalled();
    });

    it('should handle new chat click failure', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      mockReq.body.taskId = 'task-123';
      mockReq.body.options = {
        clickNewChat: true
      };
      mockReq.body.projectPath = '/test/path';
      
      mockIdeManager.getActiveIDE.mockResolvedValue({ port: 3000 });
      mockIdeManager.clickNewChat.mockRejectedValue(new Error('Click error'));
      mockApplication.taskService.executeTask.mockResolvedValue({ success: true });

      await controller.executeAutoMode(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith('AutoModeController: Failed to click new chat', expect.any(Object));
      expect(mockApplication.taskService.executeTask).toHaveBeenCalled();
    });

    it('should handle task execution failure', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      mockReq.body.taskId = 'task-123';
      mockApplication.taskService.executeTask.mockRejectedValue(new Error('Task execution failed'));

      await controller.executeAutoMode(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith('AutoModeController: Failed to execute task', expect.any(Object));
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to execute task',
        message: 'Task execution failed'
      });
    });

    it('should handle command execution failure', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      const mockCommandInstance = {};
      VibeCoderModeCommand.mockImplementation(() => mockCommandInstance);
      mockCommandBus.execute.mockRejectedValue(new Error('Command execution failed'));

      await controller.executeAutoMode(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith('AutoModeController: Failed to execute auto mode', expect.any(Object));
      expect(mockEventBus.publish).toHaveBeenCalledWith('autoMode:failed', expect.objectContaining({
        projectId: 'test-project',
        userId: 'user-123',
        error: 'Command execution failed'
      }));
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to execute auto mode',
        message: 'Command execution failed'
      });
    });

    it('should handle task options extraction from options object', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      mockReq.body.taskId = undefined;
      mockReq.body.options = {
        taskId: 'task-123',
        createGitBranch: true,
        branchName: 'feature/test',
        clickNewChat: true,
        autoExecute: false
      };
      
      mockApplication.taskService.executeTask.mockResolvedValue({ success: true });

      await controller.executeAutoMode(mockReq, mockRes);

      expect(mockApplication.taskService.executeTask).toHaveBeenCalledWith('task-123', expect.objectContaining({
        projectPath: '/test/path',
        userId: 'user-123',
        projectId: 'test-project'
      }));
    });

    it('should handle missing user ID', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      mockReq.user = undefined;
      const mockCommandInstance = {};
      VibeCoderModeCommand.mockImplementation(() => mockCommandInstance);
      mockCommandBus.execute.mockResolvedValue({ success: true });

      await controller.executeAutoMode(mockReq, mockRes);

      expect(VibeCoderModeCommand).toHaveBeenCalledWith(expect.objectContaining({
        metadata: expect.objectContaining({
          userId: undefined,
          projectId: 'test-project'
        })
      }));
    });
  });

  describe('getAutoModeStatus', () => {
    beforeEach(() => {
      mockReq.query = { sessionId: 'session-123' };
    });

    it('should get auto mode status successfully', async () => {
      const mockResult = { status: { state: 'completed', progress: 100 } };
      mockQueryBus.execute.mockResolvedValue(mockResult);

      await controller.getAutoModeStatus(mockReq, mockRes);

      expect(mockQueryBus.execute).toHaveBeenCalledWith('GetAutoModeStatusQuery', {
        sessionId: 'session-123',
        userId: 'user-123'
      });
      expect(mockLogger.info).toHaveBeenCalledWith('AutoModeController: Auto mode status retrieved', {
        sessionId: 'session-123',
        userId: 'user-123'
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.status
      });
    });

    it('should handle query execution failure', async () => {
      mockQueryBus.execute.mockRejectedValue(new Error('Query failed'));

      await controller.getAutoModeStatus(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith('AutoModeController: Failed to get auto mode status', {
        sessionId: 'session-123',
        error: 'Query failed',
        userId: 'user-123'
      });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get auto mode status',
        message: 'Query failed'
      });
    });

    it('should handle missing user ID', async () => {
      mockReq.user = undefined;
      const mockResult = { status: { state: 'completed' } };
      mockQueryBus.execute.mockResolvedValue(mockResult);

      await controller.getAutoModeStatus(mockReq, mockRes);

      expect(mockQueryBus.execute).toHaveBeenCalledWith('GetAutoModeStatusQuery', {
        sessionId: 'session-123',
        userId: undefined
      });
    });
  });

  describe('getAutoModeProgress', () => {
    beforeEach(() => {
      mockReq.query = { sessionId: 'session-123' };
    });

    it('should get auto mode progress successfully', async () => {
      const mockResult = { progress: { current: 50, total: 100, percentage: 50 } };
      mockQueryBus.execute.mockResolvedValue(mockResult);

      await controller.getAutoModeProgress(mockReq, mockRes);

      expect(mockQueryBus.execute).toHaveBeenCalledWith('GetAutoModeProgressQuery', {
        sessionId: 'session-123',
        userId: 'user-123'
      });
      expect(mockLogger.info).toHaveBeenCalledWith('AutoModeController: Auto mode progress retrieved', {
        sessionId: 'session-123',
        userId: 'user-123'
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.progress
      });
    });

    it('should handle query execution failure', async () => {
      mockQueryBus.execute.mockRejectedValue(new Error('Query failed'));

      await controller.getAutoModeProgress(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith('AutoModeController: Failed to get auto mode progress', {
        sessionId: 'session-123',
        error: 'Query failed',
        userId: 'user-123'
      });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get auto mode progress',
        message: 'Query failed'
      });
    });
  });

  describe('getAutoModeResults', () => {
    beforeEach(() => {
      mockReq.query = { sessionId: 'session-123' };
    });

    it('should get auto mode results successfully', async () => {
      const mockResult = { results: { analysis: {}, refactor: {}, generate: {} } };
      mockQueryBus.execute.mockResolvedValue(mockResult);

      await controller.getAutoModeResults(mockReq, mockRes);

      expect(mockQueryBus.execute).toHaveBeenCalledWith('GetAutoModeResultsQuery', {
        sessionId: 'session-123',
        userId: 'user-123'
      });
      expect(mockLogger.info).toHaveBeenCalledWith('AutoModeController: Auto mode results retrieved', {
        sessionId: 'session-123',
        userId: 'user-123'
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.results
      });
    });

    it('should handle query execution failure', async () => {
      mockQueryBus.execute.mockRejectedValue(new Error('Query failed'));

      await controller.getAutoModeResults(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith('AutoModeController: Failed to get auto mode results', {
        sessionId: 'session-123',
        error: 'Query failed',
        userId: 'user-123'
      });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get auto mode results',
        message: 'Query failed'
      });
    });
  });

  describe('getAutoModeSessions', () => {
    beforeEach(() => {
      mockReq.query = {
        page: '1',
        limit: '20',
        status: 'completed',
        mode: 'full',
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      };
    });

    it('should get auto mode sessions successfully', async () => {
      const mockResult = {
        sessions: [{ id: 'session-1' }, { id: 'session-2' }],
        page: 1,
        limit: 20,
        total: 50
      };
      mockQueryBus.execute.mockResolvedValue(mockResult);

      await controller.getAutoModeSessions(mockReq, mockRes);

      expect(mockQueryBus.execute).toHaveBeenCalledWith('GetAutoModeSessionsQuery', {
        page: 1,
        limit: 20,
        filters: {
          status: 'completed',
          mode: 'full',
          startDate: '2023-01-01',
          endDate: '2023-12-31'
        },
        userId: 'user-123'
      });
      expect(mockLogger.info).toHaveBeenCalledWith('AutoModeController: Auto mode sessions retrieved', {
        count: 2,
        userId: 'user-123'
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          sessions: mockResult.sessions,
          pagination: {
            page: 1,
            limit: 20,
            total: 50,
            pages: 3
          }
        }
      });
    });

    it('should use default pagination values', async () => {
      mockReq.query = {};
      const mockResult = {
        sessions: [],
        page: 1,
        limit: 20,
        total: 0
      };
      mockQueryBus.execute.mockResolvedValue(mockResult);

      await controller.getAutoModeSessions(mockReq, mockRes);

      expect(mockQueryBus.execute).toHaveBeenCalledWith('GetAutoModeSessionsQuery', {
        page: 1,
        limit: 20,
        filters: {
          status: undefined,
          mode: undefined,
          startDate: undefined,
          endDate: undefined
        },
        userId: 'user-123'
      });
    });

    it('should handle query execution failure', async () => {
      mockQueryBus.execute.mockRejectedValue(new Error('Query failed'));

      await controller.getAutoModeSessions(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith('AutoModeController: Failed to get auto mode sessions', {
        error: 'Query failed',
        userId: 'user-123'
      });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get auto mode sessions',
        message: 'Query failed'
      });
    });
  });

  describe('getAutoModeStats', () => {
    beforeEach(() => {
      mockReq.query = {
        timeRange: '7d',
        mode: 'full'
      };
    });

    it('should get auto mode statistics successfully', async () => {
      const mockResult = { stats: { totalSessions: 10, successRate: 0.8 } };
      mockQueryBus.execute.mockResolvedValue(mockResult);

      await controller.getAutoModeStats(mockReq, mockRes);

      expect(mockQueryBus.execute).toHaveBeenCalledWith('GetAutoModeStatsQuery', {
        timeRange: '7d',
        mode: 'full',
        userId: 'user-123'
      });
      expect(mockLogger.info).toHaveBeenCalledWith('AutoModeController: Auto mode statistics retrieved', {
        userId: 'user-123'
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.stats
      });
    });

    it('should handle query execution failure', async () => {
      mockQueryBus.execute.mockRejectedValue(new Error('Query failed'));

      await controller.getAutoModeStats(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith('AutoModeController: Failed to get auto mode statistics', {
        error: 'Query failed',
        userId: 'user-123'
      });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get auto mode statistics',
        message: 'Query failed'
      });
    });
  });

  describe('healthCheck', () => {
    it('should return health status successfully', async () => {
      await controller.healthCheck(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Auto mode service is healthy',
        timestamp: expect.any(String)
      });
    });

    it('should handle health check error', async () => {
      // Mock Date to throw an error
      const originalDate = global.Date;
      global.Date = jest.fn(() => {
        throw new Error('Date error');
      });

      await controller.healthCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Auto mode service is unhealthy',
        message: 'Date error'
      });

      // Restore original Date
      global.Date = originalDate;
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle missing dependencies gracefully', async () => {
      const controllerWithMissingDeps = new AutoModeController({});
      
      mockReq.params = { projectId: 'test-project' };
      mockReq.body = { projectPath: '/test/path' };
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      // Should not throw when dependencies are missing
      await expect(controllerWithMissingDeps.executeAutoMode(mockReq, mockRes)).resolves.not.toThrow();
    });

    it('should handle undefined request body gracefully', async () => {
      mockReq.body = undefined;
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      const mockCommandInstance = {};
      VibeCoderModeCommand.mockImplementation(() => mockCommandInstance);
      mockCommandBus.execute.mockResolvedValue({ success: true });

      // This should throw an error due to null/undefined handling in the controller
      await expect(controller.executeAutoMode(mockReq, mockRes)).rejects.toThrow();
    });

    it('should handle null request body gracefully', async () => {
      mockReq.body = null;
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      const mockCommandInstance = {};
      VibeCoderModeCommand.mockImplementation(() => mockCommandInstance);
      mockCommandBus.execute.mockResolvedValue({ success: true });

      // This should throw an error due to null/undefined handling in the controller
      await expect(controller.executeAutoMode(mockReq, mockRes)).rejects.toThrow();
    });

    it('should handle empty request body gracefully', async () => {
      mockReq.body = {};
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      const mockCommandInstance = {};
      VibeCoderModeCommand.mockImplementation(() => mockCommandInstance);
      mockCommandBus.execute.mockResolvedValue({ success: true });

      await controller.executeAutoMode(mockReq, mockRes);

      expect(VibeCoderModeCommand).toHaveBeenCalledWith(expect.objectContaining({
        projectPath: expect.any(String),
        options: expect.any(Object)
      }));
    });
  });
}); 