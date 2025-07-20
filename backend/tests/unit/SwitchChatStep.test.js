/**
 * SwitchChatStep Unit Tests
 * Tests for the SwitchChatStep functionality
 */

const switchChatStepModule = require('@domain/steps/categories/ide/switch_chat_step');

// Mock dependencies
const mockChatSessionService = {
  switchSession: jest.fn()
};

const mockEventBus = {
  publish: jest.fn()
};

const mockIDEManager = {
  switchChat: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn()
};

// Mock session data
const mockSession = {
  id: 'test-session-456',
  title: 'Test Chat Session',
  userId: 'test-user-123',
  status: 'active',
  createdAt: new Date(),
  metadata: { test: 'data' }
};

// Mock context with services
const createMockContext = (overrides = {}) => ({
  userId: 'test-user-123',
  sessionId: 'test-session-456',
  options: { force: false },
  getService: jest.fn((serviceName) => {
    switch (serviceName) {
      case 'ChatSessionService':
        return mockChatSessionService;
      case 'EventBus':
        return mockEventBus;
      case 'IDEManager':
        return mockIDEManager;
      default:
        return null;
    }
  }),
  ...overrides
});

describe('SwitchChatStep', () => {
  let stepInstance;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create step instance using the exported class
    const SwitchChatStep = switchChatStepModule.SwitchChatStep;
    stepInstance = new SwitchChatStep();
  });

  describe('Configuration', () => {
    test('should have correct configuration', () => {
      const config = switchChatStepModule.config;
      
      expect(config.name).toBe('SwitchChatStep');
      expect(config.type).toBe('ide');
      expect(config.category).toBe('ide');
      expect(config.description).toBe('Switch between existing chat sessions with IDE integration');
      expect(config.version).toBe('1.0.0');
      expect(config.dependencies).toEqual(['chatSessionService', 'eventBus', 'ideManager']);
      expect(config.validation.required).toEqual(['userId', 'sessionId']);
      expect(config.validation.optional).toEqual(['options']);
    });
  });

  describe('Service Dependencies', () => {
    test('should throw error for missing ChatSessionService', () => {
      const context = createMockContext();
      context.getService.mockReturnValue(null);
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'ChatSessionService not available in context'
        })
      );
    });

    test('should throw error for missing EventBus', () => {
      const context = createMockContext();
      context.getService.mockImplementation((serviceName) => {
        if (serviceName === 'EventBus') return null;
        return mockChatSessionService;
      });
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'EventBus not available in context'
        })
      );
    });

    test('should throw error for missing IDEManager', () => {
      const context = createMockContext();
      context.getService.mockImplementation((serviceName) => {
        if (serviceName === 'IDEManager') return null;
        return serviceName === 'ChatSessionService' ? mockChatSessionService : mockEventBus;
      });
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'IDEManager not available in context'
        })
      );
    });
  });

  describe('Parameter Validation', () => {
    test('should throw error for missing userId', () => {
      const context = createMockContext({ userId: null });
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'User ID is required'
        })
      );
    });

    test('should throw error for missing sessionId', () => {
      const context = createMockContext({ sessionId: null });
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'Session ID must be a non-empty string'
        })
      );
    });

    test('should throw error for empty sessionId', () => {
      const context = createMockContext({ sessionId: '' });
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'Session ID must be a non-empty string'
        })
      );
    });

    test('should throw error for non-string sessionId', () => {
      const context = createMockContext({ sessionId: 123 });
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'Session ID must be a non-empty string'
        })
      );
    });
  });

  describe('Successful Execution', () => {
    test('should switch chat session successfully', async () => {
      const context = createMockContext();
      mockChatSessionService.switchSession.mockResolvedValue(mockSession);
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('test-session-456');
      expect(result.userId).toBe('test-user-123');
      expect(result.data.session).toEqual(mockSession);
      expect(result.data.switched).toBe(true);
      expect(result.stepId).toMatch(/switch_chat_step_\d+_/);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    test('should publish switching event', async () => {
      const context = createMockContext();
      mockChatSessionService.switchSession.mockResolvedValue(mockSession);
      mockEventBus.publish.mockResolvedValue();

      await stepInstance.execute(context);

      expect(mockEventBus.publish).toHaveBeenCalledWith('chat.switching', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        sessionId: 'test-session-456',
        timestamp: expect.any(Date)
      });
    });

    test('should publish switched event on success', async () => {
      const context = createMockContext();
      mockChatSessionService.switchSession.mockResolvedValue(mockSession);
      mockEventBus.publish.mockResolvedValue();

      await stepInstance.execute(context);

      expect(mockEventBus.publish).toHaveBeenCalledWith('chat.switched', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        sessionId: 'test-session-456',
        title: 'Test Chat Session',
        timestamp: expect.any(Date)
      });
    });

    test('should call ChatSessionService.switchSession', async () => {
      const context = createMockContext();
      mockChatSessionService.switchSession.mockResolvedValue(mockSession);
      mockEventBus.publish.mockResolvedValue();

      await stepInstance.execute(context);

      expect(mockChatSessionService.switchSession).toHaveBeenCalledWith(
        'test-user-123',
        'test-session-456'
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle ChatSessionService.switchSession exception', async () => {
      const context = createMockContext();
      const error = new Error('Session not found');
      mockChatSessionService.switchSession.mockRejectedValue(error);
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
      expect(result.stepId).toMatch(/switch_chat_step_\d+_/);
    });

    test('should publish failure event on error', async () => {
      const context = createMockContext();
      const error = new Error('Session not found');
      mockChatSessionService.switchSession.mockRejectedValue(error);
      mockEventBus.publish.mockResolvedValue();

      await stepInstance.execute(context);

      expect(mockEventBus.publish).toHaveBeenCalledWith('chat.switching.failed', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        sessionId: 'test-session-456',
        error: 'Session not found',
        timestamp: expect.any(Date)
      });
    });

    test('should handle EventBus.publish failure gracefully', async () => {
      const context = createMockContext();
      const error = new Error('Session not found');
      mockChatSessionService.switchSession.mockRejectedValue(error);
      mockEventBus.publish.mockRejectedValue(new Error('Event bus error'));

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(false);
      // The step should still return a result even if event publishing fails
      expect(result.stepId).toMatch(/switch_chat_step_\d+_/);
      expect(result.userId).toBe('test-user-123');
      expect(result.sessionId).toBe('test-session-456');
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Validation Method', () => {
    test('should validate correct parameters', () => {
      const context = createMockContext();
      const validation = stepInstance.validate(context);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
      expect(validation.warnings).toEqual([]);
    });

    test('should detect missing userId', () => {
      const context = createMockContext({ userId: null });
      const validation = stepInstance.validate(context);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('User ID is required');
    });

    test('should detect missing sessionId', () => {
      const context = createMockContext({ sessionId: null });
      const validation = stepInstance.validate(context);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Session ID must be a non-empty string');
    });

    test('should detect invalid sessionId', () => {
      const context = createMockContext({ sessionId: '' });
      const validation = stepInstance.validate(context);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Session ID must be a non-empty string');
    });
  });

  describe('Step Registry Integration', () => {
    test('should export execute function', () => {
      expect(typeof switchChatStepModule.execute).toBe('function');
    });

    test('should export config', () => {
      expect(switchChatStepModule.config).toBeDefined();
      expect(switchChatStepModule.config.name).toBe('SwitchChatStep');
    });

    test('should export SwitchChatStep class', () => {
      expect(switchChatStepModule.SwitchChatStep).toBeDefined();
      expect(typeof switchChatStepModule.SwitchChatStep).toBe('function');
    });
  });
}); 