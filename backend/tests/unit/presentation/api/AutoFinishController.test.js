const AutoFinishController = require('@/presentation/api/AutoFinishController');
const ProcessTodoListCommand = require('@categories/management/ProcessTodoListCommand');
const TaskSession = require('@/domain/entities/TaskSession');

describe('AutoFinishController', () => {
  let controller;
  let mockCommandBus;
  let mockTaskSessionRepository;
  let mockAutoFinishSystem;
  let mockLogger;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Create mock dependencies
    mockCommandBus = {
      execute: jest.fn()
    };

    mockTaskSessionRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByProjectId: jest.fn(),
      save: jest.fn(),
      getStats: jest.fn()
    };

    mockAutoFinishSystem = {
      cancelSession: jest.fn(),
      getStats: jest.fn(),
      todoParser: {
        getSupportedPatterns: jest.fn(),
        getTaskTypeKeywords: jest.fn()
      }
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    };

    // Create controller instance
    controller = new AutoFinishController({
      commandBus: mockCommandBus,
      taskSessionRepository: mockTaskSessionRepository,
      autoFinishSystem: mockAutoFinishSystem,
      logger: mockLogger
    });

    // Create mock request and response objects
    mockReq = {
      body: {},
      user: null,
      params: {},
      query: {},
      get: jest.fn(),
      ip: '127.0.0.1',
      id: 'req-123'
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
      expect(controller.taskSessionRepository).toBe(mockTaskSessionRepository);
      expect(controller.autoFinishSystem).toBe(mockAutoFinishSystem);
      expect(controller.logger).toBe(mockLogger);
    });

    it('should use console as default logger when not provided', () => {
      const controllerWithoutLogger = new AutoFinishController({
        commandBus: mockCommandBus,
        taskSessionRepository: mockTaskSessionRepository,
        autoFinishSystem: mockAutoFinishSystem
      });
      expect(controllerWithoutLogger.logger).toBe(console);
    });
  });

  describe('processTodoList', () => {
    beforeEach(() => {
      mockReq.body = {
        todoInput: 'TODO: Test task',
        options: { stopOnError: false }
      };
      mockReq.user = { id: 'user-123' };
      mockReq.params = { projectId: 'project-123' };
      mockReq.get.mockReturnValue('Mozilla/5.0');
    });

    it('should process TODO list successfully', async () => {
      const mockResult = {
        sessionId: 'session-123',
        result: { success: true },
        duration: 5000
      };
      mockCommandBus.execute.mockResolvedValue(mockResult);

      await controller.processTodoList(mockReq, mockRes);

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[AutoFinishController] Processing TODO list request',
        expect.objectContaining({
          userId: 'user-123',
          projectId: 'project-123',
          todoInputLength: 15
        })
      );

      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        'ProcessTodoListCommand',
        expect.any(ProcessTodoListCommand)
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[AutoFinishController] TODO list processing completed',
        expect.objectContaining({
          sessionId: 'session-123',
          duration: 5000
        })
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        sessionId: 'session-123',
        result: { success: true },
        duration: 5000
      });
    });

    it('should handle missing todoInput', async () => {
      mockReq.body = { options: {} };

      await controller.processTodoList(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'todoInput is required and must be a string'
      });
    });

    it('should handle non-string todoInput', async () => {
      mockReq.body = { todoInput: 123, options: {} };

      await controller.processTodoList(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'todoInput is required and must be a string'
      });
    });

    it('should handle empty string todoInput', async () => {
      mockReq.body = { todoInput: '', options: {} };

      await controller.processTodoList(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'todoInput is required and must be a string'
      });
    });

    it('should handle todoInput too long', async () => {
      const longInput = 'a'.repeat(10001);
      mockReq.body = { todoInput: longInput, options: {} };

      await controller.processTodoList(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'todoInput must be less than 10,000 characters'
      });
    });

    it('should handle command execution error', async () => {
      const error = new Error('Command execution failed');
      mockCommandBus.execute.mockRejectedValue(error);

      await controller.processTodoList(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[AutoFinishController] TODO list processing failed:',
        'Command execution failed'
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Command execution failed',
        timestamp: expect.any(String)
      });
    });

    it('should use projectId from body when not in params', async () => {
      mockReq.params = {};
      mockReq.body.projectId = 'body-project-123';

      const mockResult = {
        sessionId: 'session-123',
        result: { success: true },
        duration: 5000
      };
      mockCommandBus.execute.mockResolvedValue(mockResult);

      await controller.processTodoList(mockReq, mockRes);

      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        'ProcessTodoListCommand',
        expect.objectContaining({
          projectId: 'body-project-123'
        })
      );
    });

    it('should handle missing user', async () => {
      mockReq.user = null;

      const mockResult = {
        sessionId: 'session-123',
        result: { success: true },
        duration: 5000
      };
      mockCommandBus.execute.mockResolvedValue(mockResult);

      await controller.processTodoList(mockReq, mockRes);

      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        'ProcessTodoListCommand',
        expect.objectContaining({
          userId: null
        })
      );
    });
  });

  describe('getSessionStatus', () => {
    beforeEach(() => {
      mockReq.params = { sessionId: 'session-123' };
      mockReq.user = { id: 'user-123' };
    });

    it('should get session status successfully', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        status: 'completed',
        getSummary: jest.fn().mockReturnValue({
          id: 'session-123',
          status: 'completed',
          progress: 100
        })
      };
      mockTaskSessionRepository.findById.mockResolvedValue(mockSession);

      await controller.getSessionStatus(mockReq, mockRes);

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[AutoFinishController] Getting session status',
        { sessionId: 'session-123', userId: 'user-123' }
      );

      expect(mockTaskSessionRepository.findById).toHaveBeenCalledWith('session-123');
      expect(mockSession.getSummary).toHaveBeenCalled();

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        session: {
          id: 'session-123',
          status: 'completed',
          progress: 100
        }
      });
    });

    it('should handle missing sessionId', async () => {
      mockReq.params = {};

      await controller.getSessionStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'sessionId is required'
      });
    });

    it('should handle session not found', async () => {
      mockTaskSessionRepository.findById.mockResolvedValue(null);

      await controller.getSessionStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Session not found'
      });
    });

    it('should handle unauthorized access', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'different-user-123'
      };
      mockTaskSessionRepository.findById.mockResolvedValue(mockSession);

      await controller.getSessionStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied'
      });
    });

    it('should allow access when user is not authenticated', async () => {
      mockReq.user = null;
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        getSummary: jest.fn().mockReturnValue({
          id: 'session-123',
          status: 'completed'
        })
      };
      mockTaskSessionRepository.findById.mockResolvedValue(mockSession);

      await controller.getSessionStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        session: {
          id: 'session-123',
          status: 'completed'
        }
      });
    });

    it('should allow access when session has no userId', async () => {
      const mockSession = {
        id: 'session-123',
        userId: null,
        getSummary: jest.fn().mockReturnValue({
          id: 'session-123',
          status: 'completed'
        })
      };
      mockTaskSessionRepository.findById.mockResolvedValue(mockSession);

      await controller.getSessionStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        session: {
          id: 'session-123',
          status: 'completed'
        }
      });
    });

    it('should handle repository error', async () => {
      const error = new Error('Database error');
      mockTaskSessionRepository.findById.mockRejectedValue(error);

      await controller.getSessionStatus(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[AutoFinishController] Failed to get session status:',
        'Database error'
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error',
        timestamp: expect.any(String)
      });
    });
  });

  describe('getUserSessions', () => {
    beforeEach(() => {
      mockReq.user = { id: 'user-123' };
      mockReq.query = { limit: '20', offset: '0', status: 'completed' };
    });

    it('should get user sessions successfully', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          getSummary: jest.fn().mockReturnValue({ id: 'session-1', status: 'completed' })
        },
        {
          id: 'session-2',
          getSummary: jest.fn().mockReturnValue({ id: 'session-2', status: 'completed' })
        }
      ];
      mockTaskSessionRepository.findByUserId.mockResolvedValue(mockSessions);

      await controller.getUserSessions(mockReq, mockRes);

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[AutoFinishController] Getting user sessions',
        { userId: 'user-123', limit: '20', offset: '0', status: 'completed' }
      );

      expect(mockTaskSessionRepository.findByUserId).toHaveBeenCalledWith('user-123', {
        limit: 20,
        offset: 0,
        status: 'completed'
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        sessions: [
          { id: 'session-1', status: 'completed' },
          { id: 'session-2', status: 'completed' }
        ],
        pagination: {
          limit: 20,
          offset: 0,
          total: 2
        }
      });
    });

    it('should handle missing user authentication', async () => {
      mockReq.user = null;

      await controller.getUserSessions(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
    });

    it('should use default pagination values', async () => {
      mockReq.query = {};
      const mockSessions = [];
      mockTaskSessionRepository.findByUserId.mockResolvedValue(mockSessions);

      await controller.getUserSessions(mockReq, mockRes);

      expect(mockTaskSessionRepository.findByUserId).toHaveBeenCalledWith('user-123', {
        limit: 20,
        offset: 0,
        status: undefined
      });
    });

    it('should handle repository error', async () => {
      const error = new Error('Database error');
      mockTaskSessionRepository.findByUserId.mockRejectedValue(error);

      await controller.getUserSessions(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[AutoFinishController] Failed to get user sessions:',
        'Database error'
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error',
        timestamp: expect.any(String)
      });
    });
  });

  describe('getProjectSessions', () => {
    beforeEach(() => {
      mockReq.params = { projectId: 'project-123' };
      mockReq.user = { id: 'user-123' };
      mockReq.query = { limit: '10', offset: '5', status: 'running' };
    });

    it('should get project sessions successfully', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          getSummary: jest.fn().mockReturnValue({ id: 'session-1', status: 'running' })
        }
      ];
      mockTaskSessionRepository.findByProjectId.mockResolvedValue(mockSessions);

      await controller.getProjectSessions(mockReq, mockRes);

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[AutoFinishController] Getting project sessions',
        { projectId: 'project-123', userId: 'user-123', limit: '10', offset: '5', status: 'running' }
      );

      expect(mockTaskSessionRepository.findByProjectId).toHaveBeenCalledWith('project-123', {
        limit: 10,
        offset: 5,
        status: 'running'
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        sessions: [
          { id: 'session-1', status: 'running' }
        ],
        pagination: {
          limit: 10,
          offset: 5,
          total: 1
        }
      });
    });

    it('should handle missing projectId', async () => {
      mockReq.params = {};

      await controller.getProjectSessions(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'projectId is required'
      });
    });

    it('should handle repository error', async () => {
      const error = new Error('Database error');
      mockTaskSessionRepository.findByProjectId.mockRejectedValue(error);

      await controller.getProjectSessions(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[AutoFinishController] Failed to get project sessions:',
        'Database error'
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error',
        timestamp: expect.any(String)
      });
    });
  });

  describe('cancelSession', () => {
    beforeEach(() => {
      mockReq.params = { sessionId: 'session-123' };
      mockReq.user = { id: 'user-123' };
    });

    it('should cancel session successfully', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        isActive: jest.fn().mockReturnValue(true),
        cancel: jest.fn(),
        getSummary: jest.fn().mockReturnValue({
          id: 'session-123',
          status: 'cancelled'
        })
      };
      mockTaskSessionRepository.findById.mockResolvedValue(mockSession);
      mockTaskSessionRepository.save.mockResolvedValue(mockSession);

      await controller.cancelSession(mockReq, mockRes);

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[AutoFinishController] Cancelling session',
        { sessionId: 'session-123', userId: 'user-123' }
      );

      expect(mockTaskSessionRepository.findById).toHaveBeenCalledWith('session-123');
      expect(mockSession.isActive).toHaveBeenCalled();
      expect(mockSession.cancel).toHaveBeenCalled();
      expect(mockTaskSessionRepository.save).toHaveBeenCalledWith(mockSession);
      expect(mockAutoFinishSystem.cancelSession).toHaveBeenCalledWith('session-123');

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[AutoFinishController] Session cancelled successfully',
        { sessionId: 'session-123' }
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        session: {
          id: 'session-123',
          status: 'cancelled'
        }
      });
    });

    it('should handle missing sessionId', async () => {
      mockReq.params = {};

      await controller.cancelSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'sessionId is required'
      });
    });

    it('should handle session not found', async () => {
      mockTaskSessionRepository.findById.mockResolvedValue(null);

      await controller.cancelSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Session not found'
      });
    });

    it('should handle unauthorized access', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'different-user-123'
      };
      mockTaskSessionRepository.findById.mockResolvedValue(mockSession);

      await controller.cancelSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied'
      });
    });

    it('should handle inactive session', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        isActive: jest.fn().mockReturnValue(false)
      };
      mockTaskSessionRepository.findById.mockResolvedValue(mockSession);

      await controller.cancelSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Session cannot be cancelled (not active)'
      });
    });

    it('should handle missing autoFinishSystem', async () => {
      controller.autoFinishSystem = null;
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        isActive: jest.fn().mockReturnValue(true),
        cancel: jest.fn(),
        getSummary: jest.fn().mockReturnValue({
          id: 'session-123',
          status: 'cancelled'
        })
      };
      mockTaskSessionRepository.findById.mockResolvedValue(mockSession);
      mockTaskSessionRepository.save.mockResolvedValue(mockSession);

      await controller.cancelSession(mockReq, mockRes);

      expect(mockSession.cancel).toHaveBeenCalled();
      expect(mockTaskSessionRepository.save).toHaveBeenCalledWith(mockSession);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle repository error', async () => {
      const error = new Error('Database error');
      mockTaskSessionRepository.findById.mockRejectedValue(error);

      await controller.cancelSession(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[AutoFinishController] Failed to cancel session:',
        'Database error'
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error',
        timestamp: expect.any(String)
      });
    });
  });

  describe('getSystemStats', () => {
    beforeEach(() => {
      mockReq.user = { id: 'user-123' };
    });

    it('should get system stats successfully', async () => {
      const mockRepoStats = { totalSessions: 100, activeSessions: 5 };
      const mockSystemStats = { totalSessions: 100, maxConcurrentSessions: 10 };
      
      mockTaskSessionRepository.getStats.mockResolvedValue(mockRepoStats);
      mockAutoFinishSystem.getStats.mockReturnValue(mockSystemStats);

      await controller.getSystemStats(mockReq, mockRes);

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[AutoFinishController] Getting system stats',
        { userId: 'user-123' }
      );

      expect(mockTaskSessionRepository.getStats).toHaveBeenCalled();
      expect(mockAutoFinishSystem.getStats).toHaveBeenCalled();

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        stats: {
          repository: mockRepoStats,
          autoFinishSystem: mockSystemStats
        }
      });
    });

    it('should handle missing autoFinishSystem', async () => {
      controller.autoFinishSystem = null;
      const mockRepoStats = { totalSessions: 100, activeSessions: 5 };
      
      mockTaskSessionRepository.getStats.mockResolvedValue(mockRepoStats);

      await controller.getSystemStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        stats: {
          repository: mockRepoStats,
          autoFinishSystem: null
        }
      });
    });

    it('should handle repository error', async () => {
      const error = new Error('Database error');
      mockTaskSessionRepository.getStats.mockRejectedValue(error);

      await controller.getSystemStats(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[AutoFinishController] Failed to get system stats:',
        'Database error'
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error',
        timestamp: expect.any(String)
      });
    });
  });

  describe('getSupportedPatterns', () => {
    it('should get supported patterns successfully', async () => {
      const mockPatterns = ['TODO:', 'FIXME:', 'HACK:'];
      mockAutoFinishSystem.todoParser.getSupportedPatterns.mockReturnValue(mockPatterns);

      await controller.getSupportedPatterns(mockReq, mockRes);

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[AutoFinishController] Getting supported patterns'
      );

      expect(mockAutoFinishSystem.todoParser.getSupportedPatterns).toHaveBeenCalled();

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        patterns: mockPatterns
      });
    });

    it('should handle missing autoFinishSystem', async () => {
      controller.autoFinishSystem = null;

      await controller.getSupportedPatterns(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Auto-finish system not available'
      });
    });

    it('should handle parser error', async () => {
      const error = new Error('Parser error');
      mockAutoFinishSystem.todoParser.getSupportedPatterns.mockImplementation(() => {
        throw error;
      });

      await controller.getSupportedPatterns(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[AutoFinishController] Failed to get supported patterns:',
        'Parser error'
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Parser error',
        timestamp: expect.any(String)
      });
    });
  });

  describe('getTaskTypeKeywords', () => {
    it('should get task type keywords successfully', async () => {
      const mockTaskTypes = ['bug', 'feature', 'refactor'];
      mockAutoFinishSystem.todoParser.getTaskTypeKeywords.mockReturnValue(mockTaskTypes);

      await controller.getTaskTypeKeywords(mockReq, mockRes);

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[AutoFinishController] Getting task type keywords'
      );

      expect(mockAutoFinishSystem.todoParser.getTaskTypeKeywords).toHaveBeenCalled();

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        taskTypes: mockTaskTypes
      });
    });

    it('should handle missing autoFinishSystem', async () => {
      controller.autoFinishSystem = null;

      await controller.getTaskTypeKeywords(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Auto-finish system not available'
      });
    });

    it('should handle parser error', async () => {
      const error = new Error('Parser error');
      mockAutoFinishSystem.todoParser.getTaskTypeKeywords.mockImplementation(() => {
        throw error;
      });

      await controller.getTaskTypeKeywords(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[AutoFinishController] Failed to get task type keywords:',
        'Parser error'
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Parser error',
        timestamp: expect.any(String)
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all components are available', async () => {
      const mockSystemStats = {
        totalSessions: 50,
        maxConcurrentSessions: 10
      };
      mockAutoFinishSystem.getStats.mockReturnValue(mockSystemStats);

      await controller.healthCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        health: {
          status: 'healthy',
          timestamp: expect.any(String),
          components: {
            commandBus: true,
            taskSessionRepository: true,
            autoFinishSystem: true
          },
          autoFinishSystem: {
            activeSessions: 50,
            maxConcurrentSessions: 10
          }
        }
      });
    });

    it('should return degraded status when autoFinishSystem has error', async () => {
      const error = new Error('System error');
      mockAutoFinishSystem.getStats.mockImplementation(() => {
        throw error;
      });

      await controller.healthCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        health: {
          status: 'degraded',
          timestamp: expect.any(String),
          components: {
            commandBus: true,
            taskSessionRepository: true,
            autoFinishSystem: true
          },
          autoFinishSystem: {
            error: 'System error'
          }
        }
      });
    });

    it('should handle missing autoFinishSystem', async () => {
      controller.autoFinishSystem = null;

      await controller.healthCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        health: {
          status: 'healthy',
          timestamp: expect.any(String),
          components: {
            commandBus: true,
            taskSessionRepository: true,
            autoFinishSystem: false
          }
        }
      });
    });

    it('should handle  error', async () => {
      // Create a new controller instance with a mock that throws
      const mockLoggerWithError = {
        info: jest.fn(),
        error: jest.fn()
      };

      const errorController = new AutoFinishController({
        commandBus: mockCommandBus,
        taskSessionRepository: mockTaskSessionRepository,
        autoFinishSystem: mockAutoFinishSystem,
        logger: mockLoggerWithError
      });

      // Mock the health check to throw an error
      const originalHealthCheck = errorController.healthCheck.bind(errorController);
      errorController.healthCheck = jest.fn().mockImplementation(() => {
        throw new Error('Health check failed');
      });

      await errorController.healthCheck(mockReq, mockRes);

      expect(mockLoggerWithError.error).toHaveBeenCalledWith(
        '[AutoFinishController] Health check failed:',
        'Health check failed'
      );

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        health: {
          status: 'unhealthy',
          error: 'Health check failed',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('setupRoutes', () => {
    it('should setup all routes correctly', () => {
      const mockRouter = {
        post: jest.fn(),
        get: jest.fn()
      };

      controller.setupRoutes(mockRouter);

      expect(mockRouter.post).toHaveBeenCalledWith('/process', expect.any(Function));
      expect(mockRouter.get).toHaveBeenCalledWith('/sessions', expect.any(Function));
      expect(mockRouter.get).toHaveBeenCalledWith('/sessions/:sessionId', expect.any(Function));
      expect(mockRouter.post).toHaveBeenCalledWith('/sessions/:sessionId/cancel', expect.any(Function));
      expect(mockRouter.get).toHaveBeenCalledWith('/stats', expect.any(Function));
      expect(mockRouter.get).toHaveBeenCalledWith('/patterns', expect.any(Function));
      expect(mockRouter.get).toHaveBeenCalledWith('/task-types', expect.any(Function));
      expect(mockRouter.get).toHaveBeenCalledWith('/health', expect.any(Function));

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[AutoFinishController] Routes setup completed'
      );
    });
  });
}); 