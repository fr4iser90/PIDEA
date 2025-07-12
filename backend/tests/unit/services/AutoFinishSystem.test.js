const AutoFinishSystem = require('@services/auto-finish/AutoFinishSystem');
const TodoParser = require('@services/auto-finish/TodoParser');
const ConfirmationSystem = require('@services/auto-finish/ConfirmationSystem');
const FallbackDetection = require('@services/auto-finish/FallbackDetection');
const TaskSequencer = require('@services/auto-finish/TaskSequencer');

// Mock dependencies
const mockCursorIDE = {
  postToCursor: jest.fn(),
  sendMessage: jest.fn()
};

const mockBrowserManager = {
  getCurrentFileContent: jest.fn(),
  getPage: jest.fn()
};

const mockIDEManager = {
  getActiveIDE: jest.fn(),
  getWorkspacePath: jest.fn()
};

const mockWebSocketManager = {
  broadcastToAll: jest.fn()
};

describe('AutoFinishSystem', () => {
  let autoFinishSystem;

  beforeEach(() => {
    jest.clearAllMocks();
    autoFinishSystem = new AutoFinishSystem(
      mockCursorIDE,
      mockBrowserManager,
      mockIDEManager,
      mockWebSocketManager
    );
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const result = await autoFinishSystem.initialize();
      expect(result).toBe(true);
    });

    it('should initialize all subsystems', async () => {
      await autoFinishSystem.initialize();
      
      expect(autoFinishSystem.todoParser).toBeDefined();
      expect(autoFinishSystem.confirmationSystem).toBeDefined();
      expect(autoFinishSystem.fallbackDetection).toBeDefined();
      expect(autoFinishSystem.taskSequencer).toBeDefined();
    });
  });

  describe('TODO parsing', () => {
    beforeEach(async () => {
      await autoFinishSystem.initialize();
    });

    it('should parse TODO list with multiple patterns', async () => {
      const todoInput = `
TODO: Create a new button component
- Add form validation
1. Update API endpoint
[ ] Write unit tests
FIXME: Fix authentication bug
      `;

      const result = await autoFinishSystem.processTodoList(todoInput);
      
      expect(result.success).toBe(true);
      expect(result.totalTasks).toBeGreaterThan(0);
      expect(result.completedTasks).toBeGreaterThan(0);
    });

    it('should handle empty TODO input', async () => {
      await expect(autoFinishSystem.processTodoList('')).rejects.toThrow('Invalid TODO input');
    });

    it('should handle TODO input with no tasks', async () => {
      await expect(autoFinishSystem.processTodoList('No tasks here')).rejects.toThrow('No tasks found in TODO input');
    });
  });

  describe('task processing', () => {
    beforeEach(async () => {
      await autoFinishSystem.initialize();
      mockCursorIDE.postToCursor.mockResolvedValue('Task completed successfully');
    });

    it('should process a single task', async () => {
      const todoInput = 'TODO: Create a button component';
      
      const result = await autoFinishSystem.processTodoList(todoInput);
      
      expect(result.success).toBe(true);
      expect(result.totalTasks).toBe(1);
      expect(mockCursorIDE.postToCursor).toHaveBeenCalled();
    });

    it('should handle task confirmation', async () => {
      const todoInput = 'TODO: Update CSS styles';
      
      const result = await autoFinishSystem.processTodoList(todoInput);
      
      expect(result.success).toBe(true);
      expect(result.completedTasks).toBe(1);
    });
  });

  describe('session management', () => {
    beforeEach(async () => {
      await autoFinishSystem.initialize();
    });

    it('should create and manage sessions', async () => {
      const todoInput = 'TODO: Test session management';
      
      const result = await autoFinishSystem.processTodoList(todoInput);
      
      expect(result.sessionId).toBeDefined();
      expect(autoFinishSystem.getSession(result.sessionId)).toBeDefined();
    });

    it('should cancel sessions', async () => {
      const todoInput = 'TODO: Test session cancellation';
      
      const result = await autoFinishSystem.processTodoList(todoInput);
      const sessionId = result.sessionId;
      
      const cancelled = autoFinishSystem.cancelSession(sessionId);
      expect(cancelled).toBe(true);
    });

    it('should get active sessions', async () => {
      const todoInput = 'TODO: Test active sessions';
      
      await autoFinishSystem.processTodoList(todoInput);
      
      const activeSessions = autoFinishSystem.getActiveSessions();
      expect(activeSessions.length).toBeGreaterThan(0);
    });
  });

  describe('progress streaming', () => {
    beforeEach(async () => {
      await autoFinishSystem.initialize();
    });

    it('should stream progress updates', async () => {
      const todoInput = 'TODO: Test progress streaming';
      
      await autoFinishSystem.processTodoList(todoInput);
      
      expect(mockWebSocketManager.broadcastToAll).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await autoFinishSystem.initialize();
    });

    it('should handle Cursor IDE errors', async () => {
      mockCursorIDE.postToCursor.mockRejectedValue(new Error('IDE connection failed'));
      
      const todoInput = 'TODO: Test error handling';
      
      await expect(autoFinishSystem.processTodoList(todoInput)).rejects.toThrow();
    });

    it('should handle task processing errors', async () => {
      const todoInput = 'TODO: Test error handling';
      
      // Mock a task that fails
      jest.spyOn(autoFinishSystem.todoParser, 'parse').mockImplementation(() => {
        throw new Error('Parsing failed');
      });
      
      await expect(autoFinishSystem.processTodoList(todoInput)).rejects.toThrow('Parsing failed');
    });
  });

  describe('configuration', () => {
    it('should have default configuration', () => {
      expect(autoFinishSystem.config).toBeDefined();
      expect(autoFinishSystem.config.maxConfirmationAttempts).toBe(3);
      expect(autoFinishSystem.config.confirmationTimeout).toBe(10000);
      expect(autoFinishSystem.config.taskExecutionTimeout).toBe(60000);
    });

    it('should allow configuration override', () => {
      const customConfig = {
        maxConfirmationAttempts: 5,
        confirmationTimeout: 15000
      };
      
      const customSystem = new AutoFinishSystem(
        mockCursorIDE,
        mockBrowserManager,
        mockIDEManager,
        mockWebSocketManager
      );
      
      customSystem.config = { ...customSystem.config, ...customConfig };
      
      expect(customSystem.config.maxConfirmationAttempts).toBe(5);
      expect(customSystem.config.confirmationTimeout).toBe(15000);
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      await autoFinishSystem.initialize();
    });

    it('should cleanup resources', async () => {
      await autoFinishSystem.cleanup();
      
      expect(autoFinishSystem.activeSessions.size).toBe(0);
    });
  });
}); 