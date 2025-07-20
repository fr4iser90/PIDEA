/**
 * CloseChatStep Unit Tests
 * Tests for the CloseChatStep functionality
 */

const closeChatStepModule = require('@domain/steps/categories/ide/close_chat_step');

// Mock dependencies
const mockChatSessionService = {
  closeSession: jest.fn()
};

const mockEventBus = {
  publish: jest.fn()
};

const mockIDEManager = {
  closeChat: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn()
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

describe('CloseChatStep', () => {
  let stepInstance;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create step instance using the exported class
    const CloseChatStep = closeChatStepModule.CloseChatStep;
    stepInstance = new CloseChatStep();
  });

  describe('Configuration', () => {
    test('should have correct configuration', () => {
      const config = closeChatStepModule.config;
      
      expect(config.name).toBe('CloseChatStep');
      expect(config.type).toBe('ide');
      expect(config.category).toBe('ide');
      expect(config.description).toBe('Close existing chat session with IDE integration');
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
    test('should close chat session successfully', async () => {
      const context = createMockContext();
      mockChatSessionService.closeSession.mockResolvedValue(true);
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('test-session-456');
      expect(result.userId).toBe('test-user-123');
      expect(result.data.sessionClosed).toBe(true);
      expect(result.stepId).toMatch(/close_chat_step_\d+_/);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    test('should publish closing event', async () => {
      const context = createMockContext();
      mockChatSessionService.closeSession.mockResolvedValue(true);
      mockEventBus.publish.mockResolvedValue();

      await stepInstance.execute(context);

      expect(mockEventBus.publish).toHaveBeenCalledWith('chat.closing', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        sessionId: 'test-session-456',
        timestamp: expect.any(Date)
      });
    });

    test('should publish closed event on success', async () => {
      const context = createMockContext();
      mockChatSessionService.closeSession.mockResolvedValue(true);
      mockEventBus.publish.mockResolvedValue();

      await stepInstance.execute(context);

      expect(mockEventBus.publish).toHaveBeenCalledWith('chat.closed', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        sessionId: 'test-session-456',
        timestamp: expect.any(Date)
      });
    });

    test('should call ChatSessionService.closeSession', async () => {
      const context = createMockContext();
      mockChatSessionService.closeSession.mockResolvedValue(true);
      mockEventBus.publish.mockResolvedValue();

      await stepInstance.execute(context);

      expect(mockChatSessionService.closeSession).toHaveBeenCalledWith(
        'test-user-123',
        'test-session-456'
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle ChatSessionService.closeSession failure', async () => {
      const context = createMockContext();
      mockChatSessionService.closeSession.mockResolvedValue(false);
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to close chat session');
      expect(result.stepId).toMatch(/close_chat_step_\d+_/);
    });

    test('should handle ChatSessionService.closeSession exception', async () => {
      const context = createMockContext();
      const error = new Error('Database connection failed');
      mockChatSessionService.closeSession.mockRejectedValue(error);
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(result.stepId).toMatch(/close_chat_step_\d+_/);
    });

    test('should publish failure event on error', async () => {
      const context = createMockContext();
      const error = new Error('Database connection failed');
      mockChatSessionService.closeSession.mockRejectedValue(error);
      mockEventBus.publish.mockResolvedValue();

      await stepInstance.execute(context);

      expect(mockEventBus.publish).toHaveBeenCalledWith('chat.closing.failed', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        sessionId: 'test-session-456',
        error: 'Database connection failed',
        timestamp: expect.any(Date)
      });
    });

    test('should handle EventBus.publish failure gracefully', async () => {
      const context = createMockContext();
      const error = new Error('Database connection failed');
      mockChatSessionService.closeSession.mockRejectedValue(error);
      mockEventBus.publish.mockRejectedValue(new Error('Event bus error'));

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(false);
      // The step should still return a result even if event publishing fails
      expect(result.stepId).toMatch(/close_chat_step_\d+_/);
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
      expect(typeof closeChatStepModule.execute).toBe('function');
    });

    test('should export config', () => {
      expect(closeChatStepModule.config).toBeDefined();
      expect(closeChatStepModule.config.name).toBe('CloseChatStep');
    });

    test('should export CloseChatStep class', () => {
      expect(closeChatStepModule.CloseChatStep).toBeDefined();
      expect(typeof closeChatStepModule.CloseChatStep).toBe('function');
    });
  });
}); 