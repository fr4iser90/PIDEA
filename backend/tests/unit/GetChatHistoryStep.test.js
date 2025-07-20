/**
 * GetChatHistoryStep Unit Tests
 * Tests for the GetChatHistoryStep functionality
 */

const getChatHistoryStepModule = require('@domain/steps/categories/ide/get_chat_history_step');

// Mock dependencies
const mockChatSessionService = {
  getChatHistory: jest.fn()
};

const mockEventBus = {
  publish: jest.fn()
};

const mockIDEManager = {
  getChatHistory: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn()
};

// Mock message data
const mockMessages = [
  {
    id: 'msg-1',
    content: 'Hello, how can I help you?',
    type: 'text',
    sender: 'assistant',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    metadata: { model: 'gpt-4' }
  },
  {
    id: 'msg-2',
    content: 'I need help with my code',
    type: 'text',
    sender: 'user',
    timestamp: new Date('2024-01-01T10:01:00Z'),
    metadata: { language: 'javascript' }
  },
  {
    id: 'msg-3',
    content: 'Sure, I can help you with that!',
    type: 'text',
    sender: 'assistant',
    timestamp: new Date('2024-01-01T10:02:00Z'),
    metadata: { model: 'gpt-4' }
  }
];

// Mock context with services
const createMockContext = (overrides = {}) => ({
  userId: 'test-user-123',
  sessionId: 'test-session-456',
  limit: 100,
  offset: 0,
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

describe('GetChatHistoryStep', () => {
  let stepInstance;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create step instance using the exported class
    const GetChatHistoryStep = getChatHistoryStepModule.GetChatHistoryStep;
    stepInstance = new GetChatHistoryStep();
  });

  describe('Configuration', () => {
    test('should have correct configuration', () => {
      const config = getChatHistoryStepModule.config;
      
      expect(config.name).toBe('GetChatHistoryStep');
      expect(config.type).toBe('ide');
      expect(config.category).toBe('ide');
      expect(config.description).toBe('Retrieve chat history with pagination and filtering');
      expect(config.version).toBe('1.0.0');
      expect(config.dependencies).toEqual(['chatSessionService', 'eventBus', 'ideManager']);
      expect(config.validation.required).toEqual(['userId', 'sessionId']);
      expect(config.validation.optional).toEqual(['limit', 'offset', 'options']);
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

    test('should throw error for invalid limit (too low)', () => {
      const context = createMockContext({ limit: -1 });
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'Limit must be a number between 1 and 1000'
        })
      );
    });

    test('should throw error for invalid limit (too high)', () => {
      const context = createMockContext({ limit: 1001 });
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'Limit must be a number between 1 and 1000'
        })
      );
    });

    test('should throw error for invalid offset (negative)', () => {
      const context = createMockContext({ offset: -1 });
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'Offset must be a non-negative number'
        })
      );
    });
  });

  describe('Successful Execution', () => {
    test('should retrieve chat history successfully', async () => {
      const context = createMockContext();
      mockChatSessionService.getChatHistory.mockResolvedValue(mockMessages);
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('test-session-456');
      expect(result.userId).toBe('test-user-123');
      expect(result.data.messages).toHaveLength(3);
      expect(result.data.messages[0].id).toBe('msg-1');
      expect(result.data.messages[1].id).toBe('msg-2');
      expect(result.data.messages[2].id).toBe('msg-3');
      expect(result.data.pagination.limit).toBe(100);
      expect(result.data.pagination.offset).toBe(0);
      expect(result.data.pagination.total).toBe(3);
      expect(result.stepId).toMatch(/get_chat_history_step_\d+_/);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    test('should use default values when not provided', async () => {
      const context = createMockContext({
        limit: undefined,
        offset: undefined
      });
      mockChatSessionService.getChatHistory.mockResolvedValue(mockMessages);
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(true);
      expect(result.data.pagination.limit).toBe(100);
      expect(result.data.pagination.offset).toBe(0);
    });

    test('should publish retrieving event', async () => {
      const context = createMockContext();
      mockChatSessionService.getChatHistory.mockResolvedValue(mockMessages);
      mockEventBus.publish.mockResolvedValue();

      await stepInstance.execute(context);

      expect(mockEventBus.publish).toHaveBeenCalledWith('chat.history.retrieving', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        sessionId: 'test-session-456',
        timestamp: expect.any(Date)
      });
    });

    test('should publish retrieved event on success', async () => {
      const context = createMockContext();
      mockChatSessionService.getChatHistory.mockResolvedValue(mockMessages);
      mockEventBus.publish.mockResolvedValue();

      await stepInstance.execute(context);

      expect(mockEventBus.publish).toHaveBeenCalledWith('chat.history.retrieved', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        sessionId: 'test-session-456',
        messageCount: 3,
        timestamp: expect.any(Date)
      });
    });

    test('should call ChatSessionService.getChatHistory with correct parameters', async () => {
      const context = createMockContext({
        limit: 50,
        offset: 10
      });
      mockChatSessionService.getChatHistory.mockResolvedValue(mockMessages);
      mockEventBus.publish.mockResolvedValue();

      await stepInstance.execute(context);

      expect(mockChatSessionService.getChatHistory).toHaveBeenCalledWith(
        'test-user-123',
        'test-session-456',
        {
          limit: 50,
          offset: 10
        }
      );
    });

    test('should handle empty message list', async () => {
      const context = createMockContext();
      mockChatSessionService.getChatHistory.mockResolvedValue([]);
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(true);
      expect(result.data.messages).toHaveLength(0);
      expect(result.data.pagination.total).toBe(0);
    });

    test('should handle undefined messages gracefully', async () => {
      const context = createMockContext();
      mockChatSessionService.getChatHistory.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(true);
      expect(result.data.messages).toHaveLength(0);
      expect(result.data.pagination.total).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle ChatSessionService.getChatHistory exception', async () => {
      const context = createMockContext();
      const error = new Error('Database connection failed');
      mockChatSessionService.getChatHistory.mockRejectedValue(error);
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(result.stepId).toMatch(/get_chat_history_step_\d+_/);
    });

    test('should publish failure event on error', async () => {
      const context = createMockContext();
      const error = new Error('Database connection failed');
      mockChatSessionService.getChatHistory.mockRejectedValue(error);
      mockEventBus.publish.mockResolvedValue();

      await stepInstance.execute(context);

      expect(mockEventBus.publish).toHaveBeenCalledWith('chat.history.retrieval.failed', {
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
      mockChatSessionService.getChatHistory.mockRejectedValue(error);
      mockEventBus.publish.mockRejectedValue(new Error('Event bus error'));

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(false);
      // The step should still return a result even if event publishing fails
      expect(result.stepId).toMatch(/get_chat_history_step_\d+_/);
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

    test('should detect invalid limit', () => {
      const context = createMockContext({ limit: -1 });
      const validation = stepInstance.validate(context);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Limit must be a number between 1 and 1000');
    });

    test('should detect invalid offset', () => {
      const context = createMockContext({ offset: -1 });
      const validation = stepInstance.validate(context);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Offset must be a non-negative number');
    });
  });

  describe('Step Registry Integration', () => {
    test('should export execute function', () => {
      expect(typeof getChatHistoryStepModule.execute).toBe('function');
    });

    test('should export config', () => {
      expect(getChatHistoryStepModule.config).toBeDefined();
      expect(getChatHistoryStepModule.config.name).toBe('GetChatHistoryStep');
    });

    test('should export GetChatHistoryStep class', () => {
      expect(getChatHistoryStepModule.GetChatHistoryStep).toBeDefined();
      expect(typeof getChatHistoryStepModule.GetChatHistoryStep).toBe('function');
    });
  });
}); 