/**
 * Unit tests for IDE Chat Commands - Phase 1
 * Tests the foundation and chat command functionality
 */

const { STANDARD_CATEGORIES } = require('@domain/constants/Categories');
const CommandRegistry = require('@application/commands/CommandRegistry');
const HandlerRegistry = require('@application/handlers/HandlerRegistry');

describe('IDE Chat Commands - Phase 1', () => {
  describe('Categories', () => {
    test('should have IDE category defined', () => {
      expect(STANDARD_CATEGORIES.IDE).toBe('ide');
    });

    test('should include IDE in category descriptions', () => {
      const { CATEGORY_DESCRIPTIONS } = require('@domain/constants/Categories');
      expect(CATEGORY_DESCRIPTIONS[STANDARD_CATEGORIES.IDE]).toBeDefined();
      expect(CATEGORY_DESCRIPTIONS[STANDARD_CATEGORIES.IDE]).toContain('IDE integration');
    });
  });

  describe('CommandRegistry', () => {
    test('should include IDE category in buildFromCategory', () => {
      const commandMap = CommandRegistry.buildFromCategory('ide', 'CreateChatCommand', {});
      expect(commandMap).toBeDefined();
    });

    test('should list IDE commands by category', () => {
      const ideCommands = CommandRegistry.getByCategory(STANDARD_CATEGORIES.IDE);
      expect(ideCommands).toContain('CreateChatCommand');
      expect(ideCommands).toContain('SendMessageCommand');
      expect(ideCommands).toContain('SwitchChatCommand');
      expect(ideCommands).toContain('ListChatsCommand');
      expect(ideCommands).toContain('CloseChatCommand');
      expect(ideCommands).toContain('GetChatHistoryCommand');
    });

    test('should build CreateChatCommand', () => {
      const command = CommandRegistry.buildFromCategory('ide', 'CreateChatCommand', {
        userId: 'test-user',
        title: 'Test Chat'
      });
      expect(command).toBeDefined();
      expect(command.userId).toBe('test-user');
      expect(command.title).toBe('Test Chat');
    });

    test('should build SendMessageCommand', () => {
      const command = CommandRegistry.buildFromCategory('ide', 'SendMessageCommand', {
        userId: 'test-user',
        message: 'Hello World'
      });
      expect(command).toBeDefined();
      expect(command.userId).toBe('test-user');
      expect(command.message).toBe('Hello World');
    });

    test('should build SwitchChatCommand', () => {
      const command = CommandRegistry.buildFromCategory('ide', 'SwitchChatCommand', {
        userId: 'test-user',
        sessionId: 'test-session'
      });
      expect(command).toBeDefined();
      expect(command.userId).toBe('test-user');
      expect(command.sessionId).toBe('test-session');
    });

    test('should build ListChatsCommand', () => {
      const command = CommandRegistry.buildFromCategory('ide', 'ListChatsCommand', {
        userId: 'test-user',
        limit: 10
      });
      expect(command).toBeDefined();
      expect(command.userId).toBe('test-user');
      expect(command.limit).toBe(10);
    });

    test('should build CloseChatCommand', () => {
      const command = CommandRegistry.buildFromCategory('ide', 'CloseChatCommand', {
        userId: 'test-user',
        sessionId: 'test-session'
      });
      expect(command).toBeDefined();
      expect(command.userId).toBe('test-user');
      expect(command.sessionId).toBe('test-session');
    });

    test('should build GetChatHistoryCommand', () => {
      const command = CommandRegistry.buildFromCategory('ide', 'GetChatHistoryCommand', {
        userId: 'test-user',
        sessionId: 'test-session',
        limit: 50
      });
      expect(command).toBeDefined();
      expect(command.userId).toBe('test-user');
      expect(command.sessionId).toBe('test-session');
      expect(command.limit).toBe(50);
    });
  });

  describe('HandlerRegistry', () => {
    test('should include IDE category in buildFromCategory', () => {
      const handlerMap = HandlerRegistry.buildFromCategory('ide', 'CreateChatHandler', {});
      expect(handlerMap).toBeDefined();
    });

    test('should list IDE handlers by category', () => {
      const ideHandlers = HandlerRegistry.getByCategory(STANDARD_CATEGORIES.IDE);
      expect(ideHandlers).toContain('CreateChatHandler');
      expect(ideHandlers).toContain('SendMessageHandler');
      expect(ideHandlers).toContain('SwitchChatHandler');
      expect(ideHandlers).toContain('ListChatsHandler');
      expect(ideHandlers).toContain('CloseChatHandler');
      expect(ideHandlers).toContain('GetChatHistoryHandler');
    });

    test('should build CreateChatHandler', () => {
      const mockDependencies = {
        chatSessionService: {},
        ideManager: {},
        eventBus: {}
      };
      const handler = HandlerRegistry.buildFromCategory('ide', 'CreateChatHandler', mockDependencies);
      expect(handler).toBeDefined();
    });

    test('should build SendMessageHandler', () => {
      const mockDependencies = {
        chatSessionService: {},
        cursorIDEService: {},
        vscodeIDEService: {},
        windsurfIDEService: {},
        ideManager: {},
        eventBus: {}
      };
      const handler = HandlerRegistry.buildFromCategory('ide', 'SendMessageHandler', mockDependencies);
      expect(handler).toBeDefined();
    });

    test('should build SwitchChatHandler', () => {
      const mockDependencies = {
        chatSessionService: {},
        ideManager: {},
        eventBus: {}
      };
      const handler = HandlerRegistry.buildFromCategory('ide', 'SwitchChatHandler', mockDependencies);
      expect(handler).toBeDefined();
    });

    test('should build ListChatsHandler', () => {
      const mockDependencies = {
        chatSessionService: {},
        ideManager: {},
        eventBus: {}
      };
      const handler = HandlerRegistry.buildFromCategory('ide', 'ListChatsHandler', mockDependencies);
      expect(handler).toBeDefined();
    });

    test('should build CloseChatHandler', () => {
      const mockDependencies = {
        chatSessionService: {},
        ideManager: {},
        eventBus: {}
      };
      const handler = HandlerRegistry.buildFromCategory('ide', 'CloseChatHandler', mockDependencies);
      expect(handler).toBeDefined();
    });

    test('should build GetChatHistoryHandler', () => {
      const mockDependencies = {
        chatSessionService: {},
        ideManager: {},
        eventBus: {}
      };
      const handler = HandlerRegistry.buildFromCategory('ide', 'GetChatHistoryHandler', mockDependencies);
      expect(handler).toBeDefined();
    });
  });

  describe('Command Validation', () => {
    test('CreateChatCommand should validate required fields', () => {
      const command = CommandRegistry.buildFromCategory('ide', 'CreateChatCommand', {});
      expect(() => command.validate()).toThrow('User ID is required');
    });

    test('SendMessageCommand should validate required fields', () => {
      const command = CommandRegistry.buildFromCategory('ide', 'SendMessageCommand', {});
      expect(() => command.validate()).toThrow('User ID is required');
    });

    test('SwitchChatCommand should validate required fields', () => {
      const command = CommandRegistry.buildFromCategory('ide', 'SwitchChatCommand', {});
      expect(() => command.validate()).toThrow('User ID is required');
    });

    test('CloseChatCommand should validate required fields', () => {
      const command = CommandRegistry.buildFromCategory('ide', 'CloseChatCommand', {});
      expect(() => command.validate()).toThrow('User ID is required');
    });

    test('GetChatHistoryCommand should validate required fields', () => {
      const command = CommandRegistry.buildFromCategory('ide', 'GetChatHistoryCommand', {});
      expect(() => command.validate()).toThrow('User ID is required');
    });
  });
}); 