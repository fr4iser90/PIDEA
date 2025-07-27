/**
 * CreateChatStep Unit Tests
 * Tests for the CreateChatStep functionality
 */

const CreateChatStep = require('@domain/steps/categories/ide/create_chat_step');

// Mock dependencies
const mockChatSessionService = {
  createSession: jest.fn()
};

const mockEventBus = {
  publish: jest.fn()
};

const mockBrowserManager = {
  clickNewChat: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn()
};

// Mock context with services
const createMockContext = (overrides = {}) => ({
  userId: 'test-user-123',
  title: 'Test Chat Session',
  metadata: { test: 'data' },
  ideType: 'cursor',
  getService: jest.fn((serviceName) => {
    switch (serviceName) {
      case 'ChatSessionService':
        return mockChatSessionService;
      case 'EventBus':
        return mockEventBus;
      case 'BrowserManager':
        return mockBrowserManager;
      default:
        return null;
    }
  }),
  ...overrides
});

describe('CreateChatStep', () => {
  let stepInstance;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create step instance
    stepInstance = new CreateChatStep();
    
    // Mock successful responses
    mockChatSessionService.createSession.mockResolvedValue({
      id: 'session-123',
      title: 'Test Chat Session',
      userId: 'test-user-123',
      status: 'active',
      createdAt: new Date(),
      metadata: { test: 'data' }
    });
    
    mockEventBus.publish.mockResolvedValue();
    mockBrowserManager.clickNewChat.mockResolvedValue(true);
  });

  describe('Configuration', () => {
    test('should have correct configuration', () => {
      const config = CreateChatStep.getConfig();
      
      expect(config.name).toBe('CreateChatStep');
      expect(config.type).toBe('ide');
      expect(config.category).toBe('ide');
      expect(config.description).toBe('Create new chat session with IDE integration');
      expect(config.version).toBe('1.0.0');
      expect(config.dependencies).toEqual(['chatSessionService', 'eventBus', 'browserManager']);
      expect(config.validation.required).toEqual(['userId', 'title']);
      expect(config.validation.optional).toEqual(['metadata', 'ideType']);
    });
  });

  describe('Context Validation', () => {
    test('should validate required fields', () => {
      const context = createMockContext();
      expect(() => stepInstance.validateContext(context)).not.toThrow();
    });

    test('should throw error for missing userId', () => {
      const context = createMockContext({ userId: null });
      expect(() => stepInstance.validateContext(context)).toThrow('User ID is required');
    });

    test('should throw error for missing title', () => {
      const context = createMockContext({ title: '' });
      expect(() => stepInstance.validateContext(context)).toThrow('Chat title is required');
    });

    test('should throw error for title too long', () => {
      const longTitle = 'a'.repeat(201);
      const context = createMockContext({ title: longTitle });
      expect(() => stepInstance.validateContext(context)).toThrow('Chat title too long');
    });

    test('should throw error for invalid metadata', () => {
      const context = createMockContext({ metadata: 'invalid' });
      expect(() => stepInstance.validateContext(context)).toThrow('Metadata must be an object');
    });
  });

  describe('Service Dependencies', () => {
    test('should throw error for missing ChatSessionService', () => {
      const context = createMockContext();
      context.getService.mockReturnValue(null);
      
      return expect(stepInstance.execute(context)).rejects.toThrow('ChatSessionService not available');
    });

    test('should throw error for missing EventBus', () => {
      const context = createMockContext();
      context.getService.mockImplementation((serviceName) => {
        if (serviceName === 'EventBus') return null;
        return mockChatSessionService;
      });
      
      return expect(stepInstance.execute(context)).rejects.toThrow('EventBus not available');
    });

    test('should throw error for missing BrowserManager', () => {
      const context = createMockContext();
      context.getService.mockImplementation((serviceName) => {
        if (serviceName === 'BrowserManager') return null;
        return serviceName === 'ChatSessionService' ? mockChatSessionService : mockEventBus;
      });
      
      return expect(stepInstance.execute(context)).rejects.toThrow('BrowserManager not available');
    });
  });

  describe('Successful Execution', () => {
    test('should create chat session successfully', async () => {
      const context = createMockContext();
      const result = await stepInstance.execute(context);
      
      expect(result.success).toBe(true);
      expect(result.session).toEqual({
        id: 'session-123',
        title: 'Test Chat Session',
        userId: 'test-user-123',
        status: 'active',
        createdAt: expect.any(Date),
        metadata: { test: 'data' }
      });
      expect(result.message).toBe('Chat session created successfully');
      expect(result.stepId).toMatch(/^create_chat_step_\d+_/);
    });

    test('should publish creating event', async () => {
      const context = createMockContext();
      await stepInstance.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('chat.creating', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        title: 'Test Chat Session',
        timestamp: expect.any(Date)
      });
    });

    test('should click new chat button', async () => {
      const context = createMockContext();
      await stepInstance.execute(context);
      
      expect(mockBrowserManager.clickNewChat).toHaveBeenCalled();
    });

    test('should create session with correct parameters', async () => {
      const context = createMockContext();
      await stepInstance.execute(context);
      
      expect(mockChatSessionService.createSession).toHaveBeenCalledWith(
        'test-user-123',
        'Test Chat Session',
        { test: 'data' }
      );
    });

    test('should publish created event', async () => {
      const context = createMockContext();
      await stepInstance.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('chat.created', {
        stepId: expect.any(String),
        userId: 'test-user-123',
        sessionId: 'session-123',
        title: 'Test Chat Session',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle browser click failure', async () => {
      mockBrowserManager.clickNewChat.mockResolvedValue(false);
      
      const context = createMockContext();
      const result = await stepInstance.execute(context);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to click New Chat button in IDE');
    });

    test('should handle session creation failure', async () => {
      mockChatSessionService.createSession.mockRejectedValue(new Error('Database error'));
      
      const context = createMockContext();
      const result = await stepInstance.execute(context);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    test('should handle event bus failure gracefully', async () => {
      mockEventBus.publish.mockRejectedValue(new Error('Event bus error'));
      
      const context = createMockContext();
      const result = await stepInstance.execute(context);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Event bus error');
    });

    test('should publish failure event on error', async () => {
      mockChatSessionService.createSession.mockRejectedValue(new Error('Test error'));
      
      const context = createMockContext();
      await stepInstance.execute(context);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('chat.creation.failed', {
        userId: 'test-user-123',
        error: 'Test error',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('Step ID Generation', () => {
    test('should generate unique step IDs', () => {
      const stepId1 = stepInstance.generateStepId();
      const stepId2 = stepInstance.generateStepId();
      
      expect(stepId1).toMatch(/^create_chat_step_\d+_/);
      expect(stepId2).toMatch(/^create_chat_step_\d+_/);
      expect(stepId1).not.toBe(stepId2);
    });
  });

  describe('Default Values', () => {
    test('should use default metadata if not provided', async () => {
      const context = createMockContext({ metadata: undefined });
      await stepInstance.execute(context);
      
      expect(mockChatSessionService.createSession).toHaveBeenCalledWith(
        'test-user-123',
        'Test Chat Session',
        {}
      );
    });
  });
}); 