/**
 * ListChatsStep Unit Tests
 * Tests for the ListChatsStep functionality
 */

const listChatsStepModule = require('@domain/steps/categories/ide/list_chats_step');

// Mock dependencies
const mockChatSessionService = {
  listSessions: jest.fn(),
  getSessionStats: jest.fn()
};

const mockEventBus = {
  publish: jest.fn()
};

const mockIDEManager = {
  listChats: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn()
};

// Mock session data
const mockSessions = [
  {
    id: 'test-session-1',
    title: 'Test Chat Session 1',
    userId: 'test-user-123',
    status: 'active',
    createdAt: new Date(),
    isActive: true,
    metadata: { test: 'data1' }
  },
  {
    id: 'test-session-2',
    title: 'Test Chat Session 2',
    userId: 'test-user-123',
    status: 'archived',
    createdAt: new Date(),
    isActive: false,
    metadata: { test: 'data2' }
  }
];

const mockStats = {
  total: 2,
  active: 1,
  archived: 1,
  recent: 1
};

// Mock context with services
const createMockContext = (overrides = {}) => ({
  userId: 'test-user-123',
  limit: 50,
  offset: 0,
  includeArchived: false,
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

describe('ListChatsStep', () => {
  let stepInstance;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create step instance using the exported class
    const ListChatsStep = listChatsStepModule.ListChatsStep;
    stepInstance = new ListChatsStep();
  });

  describe('Configuration', () => {
    test('should have correct configuration', () => {
      const config = listChatsStepModule.config;
      
      expect(config.name).toBe('ListChatsStep');
      expect(config.type).toBe('ide');
      expect(config.category).toBe('ide');
      expect(config.description).toBe('List available chat sessions with pagination and filtering');
      expect(config.version).toBe('1.0.0');
      expect(config.dependencies).toEqual(['chatSessionService', 'eventBus', 'ideManager']);
      expect(config.validation.required).toEqual(['userId']);
      expect(config.validation.optional).toEqual(['limit', 'offset', 'includeArchived', 'options']);
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

    test('should throw error for invalid includeArchived (non-boolean)', () => {
      const context = createMockContext({ includeArchived: 'true' });
      
      return expect(stepInstance.execute(context)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          error: 'includeArchived must be a boolean'
        })
      );
    });
  });

  describe('Successful Execution', () => {
    test('should list chat sessions successfully', async () => {
      const context = createMockContext();
      mockChatSessionService.listSessions.mockResolvedValue(mockSessions);
      mockChatSessionService.getSessionStats.mockResolvedValue(mockStats);
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(true);
      expect(result.userId).toBe('test-user-123');
      expect(result.data.sessions).toHaveLength(2);
      expect(result.data.sessions[0].id).toBe('test-session-1');
      expect(result.data.sessions[1].id).toBe('test-session-2');
      expect(result.data.stats).toEqual(mockStats);
      expect(result.data.pagination.limit).toBe(50);
      expect(result.data.pagination.offset).toBe(0);
      expect(result.data.pagination.total).toBe(2);
      expect(result.stepId).toMatch(/list_chats_step_\d+_/);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    test('should use default values when not provided', async () => {
      const context = createMockContext({
        limit: undefined,
        offset: undefined,
        includeArchived: undefined
      });
      mockChatSessionService.listSessions.mockResolvedValue(mockSessions);
      mockChatSessionService.getSessionStats.mockResolvedValue(mockStats);
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(true);
      expect(result.data.pagination.limit).toBe(50);
      expect(result.data.pagination.offset).toBe(0);
    });

    test('should publish listing event', async () => {
      const context = createMockContext();
      mockChatSessionService.listSessions.mockResolvedValue(mockSessions);
      mockChatSessionService.getSessionStats.mockResolvedValue(mockStats);
      mockEventBus.publish.mockResolvedValue();

      await stepInstance.execute(context);

      expect(mockEventBus.publish).toHaveBeenCalledWith('chat.listing', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        timestamp: expect.any(Date)
      });
    });

    test('should publish listed event on success', async () => {
      const context = createMockContext();
      mockChatSessionService.listSessions.mockResolvedValue(mockSessions);
      mockChatSessionService.getSessionStats.mockResolvedValue(mockStats);
      mockEventBus.publish.mockResolvedValue();

      await stepInstance.execute(context);

      expect(mockEventBus.publish).toHaveBeenCalledWith('chat.listed', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        sessionCount: 2,
        timestamp: expect.any(Date)
      });
    });

    test('should call ChatSessionService.listSessions with correct parameters', async () => {
      const context = createMockContext({
        limit: 25,
        offset: 10,
        includeArchived: true
      });
      mockChatSessionService.listSessions.mockResolvedValue(mockSessions);
      mockChatSessionService.getSessionStats.mockResolvedValue(mockStats);
      mockEventBus.publish.mockResolvedValue();

      await stepInstance.execute(context);

      expect(mockChatSessionService.listSessions).toHaveBeenCalledWith('test-user-123', {
        limit: 25,
        offset: 10,
        includeArchived: true
      });
    });

    test('should call ChatSessionService.getSessionStats', async () => {
      const context = createMockContext();
      mockChatSessionService.listSessions.mockResolvedValue(mockSessions);
      mockChatSessionService.getSessionStats.mockResolvedValue(mockStats);
      mockEventBus.publish.mockResolvedValue();

      await stepInstance.execute(context);

      expect(mockChatSessionService.getSessionStats).toHaveBeenCalledWith('test-user-123');
    });
  });

  describe('Error Handling', () => {
    test('should handle ChatSessionService.listSessions exception', async () => {
      const context = createMockContext();
      const error = new Error('Database connection failed');
      mockChatSessionService.listSessions.mockRejectedValue(error);
      mockEventBus.publish.mockResolvedValue();

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(result.stepId).toMatch(/list_chats_step_\d+_/);
    });

    test('should publish failure event on error', async () => {
      const context = createMockContext();
      const error = new Error('Database connection failed');
      mockChatSessionService.listSessions.mockRejectedValue(error);
      mockEventBus.publish.mockResolvedValue();

      await stepInstance.execute(context);

      expect(mockEventBus.publish).toHaveBeenCalledWith('chat.listing.failed', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        error: 'Database connection failed',
        timestamp: expect.any(Date)
      });
    });

    test('should handle EventBus.publish failure gracefully', async () => {
      const context = createMockContext();
      const error = new Error('Database connection failed');
      mockChatSessionService.listSessions.mockRejectedValue(error);
      mockEventBus.publish.mockRejectedValue(new Error('Event bus error'));

      const result = await stepInstance.execute(context);

      expect(result.success).toBe(false);
      // The step should still return a result even if event publishing fails
      expect(result.stepId).toMatch(/list_chats_step_\d+_/);
      expect(result.userId).toBe('test-user-123');
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

    test('should detect invalid includeArchived', () => {
      const context = createMockContext({ includeArchived: 'true' });
      const validation = stepInstance.validate(context);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('includeArchived must be a boolean');
    });
  });

  describe('Step Registry Integration', () => {
    test('should export execute function', () => {
      expect(typeof listChatsStepModule.execute).toBe('function');
    });

    test('should export config', () => {
      expect(listChatsStepModule.config).toBeDefined();
      expect(listChatsStepModule.config.name).toBe('ListChatsStep');
    });

    test('should export ListChatsStep class', () => {
      expect(listChatsStepModule.ListChatsStep).toBeDefined();
      expect(typeof listChatsStepModule.ListChatsStep).toBe('function');
    });
  });
}); 