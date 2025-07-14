/**
 * Integration tests for IDE Port Management
 */

const IDEManager = require('@infrastructure/external/ide/IDEManager');
const IDEPortManager = require('@services/IDEPortManager');
const IDEController = require('@presentation/api/IDEController');
const { jest } = require('@jest/globals');

describe('IDE Port Management Integration', () => {
  let ideManager;
  let portManager;
  let ideController;
  let mockEventBus;
  let mockBrowserManager;

  beforeEach(() => {
    // Mock Event Bus
    mockEventBus = {
      subscribe: jest.fn(),
      publish: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    };

    // Mock Browser Manager
    mockBrowserManager = {
      switchToPort: jest.fn(),
      getActivePort: jest.fn()
    };

    // Initialize components
    ideManager = new IDEManager(mockBrowserManager, mockEventBus);
    portManager = new IDEPortManager(ideManager, mockEventBus);
    ideController = new IDEController(ideManager, mockEventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-End Port Selection', () => {
    test('should select active port through complete flow', async () => {
      // Mock available IDEs
      jest.spyOn(ideManager, 'getAvailableIDEs').mockResolvedValue([
        { port: 9222, status: 'running', workspacePath: '/path1', ideType: 'cursor' },
        { port: 9223, status: 'running', workspacePath: '/path2', ideType: 'cursor' }
      ]);

      // Mock validation
      jest.spyOn(portManager, 'validatePort').mockResolvedValue(true);
      jest.spyOn(ideManager, 'switchToIDE').mockResolvedValue({
        port: 9222,
        status: 'active',
        workspacePath: '/path1'
      });

      // Initialize port manager
      await portManager.initialize();

      // Verify active port was selected
      const activePort = portManager.getActivePort();
      expect(activePort).toBe(9222);

      // Verify IDE manager was updated
      expect(ideManager.getActivePort()).toBe(9222);
    });

    test('should handle port failure and recovery', async () => {
      // Setup initial state
      portManager.activePort = 9222;
      jest.spyOn(portManager, 'validatePort')
        .mockResolvedValueOnce(true)  // Initial validation
        .mockResolvedValueOnce(false) // Failure validation
        .mockResolvedValueOnce(true); // Recovery validation

      jest.spyOn(portManager, 'selectActivePort').mockResolvedValue(9223);
      jest.spyOn(portManager, 'setActivePort').mockResolvedValue(true);

      // Simulate port failure
      await portManager.handlePortFailure(9222, 'connection lost');

      // Verify recovery
      expect(portManager.selectActivePort).toHaveBeenCalled();
      expect(portManager.setActivePort).toHaveBeenCalledWith(9223);
    });
  });

  describe('Controller Integration', () => {
    test('should handle port switching through controller', async () => {
      // Mock request and response
      const req = {
        params: { port: '9222' }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Mock port validation
      jest.spyOn(portManager, 'validatePort').mockResolvedValue(true);
      jest.spyOn(ideManager, 'switchToIDE').mockResolvedValue({
        port: 9222,
        status: 'active',
        workspacePath: '/path'
      });

      // Call controller method
      await ideController.switchIDE(req, res);

      // Verify response
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          port: 9222,
          status: 'active',
          workspacePath: '/path',
          previousPort: 9222
        }
      });

      // Verify event was published
      expect(mockEventBus.publish).toHaveBeenCalledWith('activeIDEChanged', {
        port: 9222,
        previousPort: 9222
      });
    });

    test('should handle invalid port in controller', async () => {
      const req = {
        params: { port: '9999' }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Mock port validation failure
      jest.spyOn(portManager, 'validatePort').mockResolvedValue(false);

      await ideController.switchIDE(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Port validation failed'
      });
    });
  });

  describe('Fallback Strategy Integration', () => {
    test('should use multiple fallback strategies', async () => {
      // Mock no previously active port
      portManager.activePort = null;

      // Mock available IDEs
      jest.spyOn(ideManager, 'getAvailableIDEs').mockResolvedValue([
        { port: 9223, status: 'running', workspacePath: '/path' },
        { port: 9224, status: 'running', workspacePath: '/path2' }
      ]);

      // Mock validation for different strategies
      jest.spyOn(portManager, 'validatePort')
        .mockResolvedValueOnce(false)  // First port fails
        .mockResolvedValueOnce(true);  // Second port succeeds

      const result = await portManager.selectActivePort();

      expect(result).toBe(9224);
      expect(portManager.validatePort).toHaveBeenCalledTimes(2);
    });

    test('should handle all fallback strategies failing', async () => {
      // Mock no previously active port
      portManager.activePort = null;

      // Mock no available IDEs
      jest.spyOn(ideManager, 'getAvailableIDEs').mockResolvedValue([]);
      jest.spyOn(portManager, 'validatePort').mockResolvedValue(false);

      const result = await portManager.selectActivePort();

      expect(result).toBeNull();
    });
  });

  describe('Health Monitoring Integration', () => {
    test('should update health status on events', async () => {
      // Simulate health change event
      const healthEvent = {
        port: 9222,
        health: 'healthy'
      };

      // Find the health change handler
      const healthHandler = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'ideHealthChanged'
      )[1];

      // Call the handler
      await healthHandler(healthEvent);

      // Verify health was updated
      expect(portManager.portHealth.get(9222)).toBe('healthy');
    });

    test('should handle port failure events', async () => {
      // Setup initial state
      portManager.activePort = 9222;
      jest.spyOn(portManager, 'selectActivePort').mockResolvedValue(9223);
      jest.spyOn(portManager, 'setActivePort').mockResolvedValue(true);

      // Find the failure handler
      const failureHandler = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'idePortFailure'
      )[1];

      // Call the handler
      await failureHandler({ port: 9222, reason: 'test failure' });

      // Verify recovery was attempted
      expect(portManager.selectActivePort).toHaveBeenCalled();
    });
  });

  describe('Port Preference Management', () => {
    test('should track port preferences', async () => {
      // Set active port
      await portManager.setActivePort(9222);

      // Verify preference was created
      const preferences = portManager.getPortPreferences();
      expect(preferences.has(9222)).toBe(true);
      expect(preferences.get(9222).weight).toBe(100);
      expect(preferences.get(9222).usageCount).toBe(1);
    });

    test('should update preference weight on multiple uses', async () => {
      // Use port multiple times
      await portManager.setActivePort(9222);
      await portManager.setActivePort(9222);

      const preferences = portManager.getPortPreferences();
      expect(preferences.get(9222).usageCount).toBe(2);
    });
  });

  describe('Error Recovery Integration', () => {
    test('should recover from IDE manager errors', async () => {
      // Mock IDE manager error
      jest.spyOn(ideManager, 'getAvailableIDEs').mockRejectedValue(new Error('Connection failed'));

      // Should handle error gracefully
      const result = await portManager.selectActivePort();
      expect(result).toBeNull();
    });

    test('should recover from validation errors', async () => {
      jest.spyOn(portManager, 'validatePort').mockRejectedValue(new Error('Validation failed'));

      const result = await portManager.setActivePort(9222);
      expect(result).toBe(false);
    });
  });

  describe('Event System Integration', () => {
    test('should publish events on port changes', async () => {
      jest.spyOn(portManager, 'validatePort').mockResolvedValue(true);
      jest.spyOn(ideManager, 'switchToIDE').mockResolvedValue({
        port: 9222,
        status: 'active'
      });

      await portManager.setActivePort(9222);

      expect(mockEventBus.publish).toHaveBeenCalledWith('activePortChanged', {
        port: 9222,
        timestamp: expect.any(String)
      });
    });

    test('should handle missing event bus gracefully', async () => {
      // Create port manager without event bus
      const portManagerNoEvents = new IDEPortManager(ideManager, null);
      
      jest.spyOn(portManagerNoEvents, 'validatePort').mockResolvedValue(true);
      jest.spyOn(ideManager, 'switchToIDE').mockResolvedValue({
        port: 9222,
        status: 'active'
      });

      // Should not throw error
      await expect(portManagerNoEvents.setActivePort(9222)).resolves.toBe(true);
    });
  });
}); 