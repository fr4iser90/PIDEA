/**
 * Final validation tests for IDE Port Management
 * Tests the complete system integration and real-world scenarios
 */

const IDEManager = require('@infrastructure/external/ide/IDEManager');
const IDEPortManager = require('@services/IDEPortManager');
const IDEController = require('@presentation/api/IDEController');
const { jest } = require('@jest/globals');

describe('IDE Port Management - Final Validation', () => {
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

  describe('Real-World Scenarios', () => {
    test('should handle startup with no IDEs available', async () => {
      // Mock no available IDEs
      jest.spyOn(ideManager, 'getAvailableIDEs').mockResolvedValue([]);
      jest.spyOn(portManager, 'validatePort').mockResolvedValue(false);

      // Initialize port manager
      await portManager.initialize();

      // Should handle gracefully
      expect(portManager.getActivePort()).toBeNull();
      expect(portManager.getPortPreferences().size).toBe(0);
    });

    test('should handle startup with multiple IDEs', async () => {
      // Mock multiple available IDEs
      jest.spyOn(ideManager, 'getAvailableIDEs').mockResolvedValue([
        { port: 9222, status: 'running', workspacePath: '/path1', ideType: 'cursor' },
        { port: 9223, status: 'running', workspacePath: '/path2', ideType: 'cursor' },
        { port: 9232, status: 'running', workspacePath: '/path3', ideType: 'vscode' }
      ]);

      jest.spyOn(portManager, 'validatePort').mockResolvedValue(true);
      jest.spyOn(ideManager, 'switchToIDE').mockResolvedValue({
        port: 9222,
        status: 'active',
        workspacePath: '/path1'
      });

      // Initialize port manager
      await portManager.initialize();

      // Should select first available port
      expect(portManager.getActivePort()).toBe(9222);
      expect(ideManager.getActivePort()).toBe(9222);
    });

    test('should handle IDE failure and recovery', async () => {
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

    test('should handle rapid port switching', async () => {
      // Mock available IDEs
      jest.spyOn(ideManager, 'getAvailableIDEs').mockResolvedValue([
        { port: 9222, status: 'running', workspacePath: '/path1' },
        { port: 9223, status: 'running', workspacePath: '/path2' }
      ]);

      jest.spyOn(portManager, 'validatePort').mockResolvedValue(true);
      jest.spyOn(ideManager, 'switchToIDE').mockResolvedValue({
        port: 9222,
        status: 'active'
      });

      // Rapid port switching
      await portManager.setActivePort(9222);
      await portManager.setActivePort(9223);
      await portManager.setActivePort(9222);

      // Verify preferences were updated
      const preferences = portManager.getPortPreferences();
      expect(preferences.has(9222)).toBe(true);
      expect(preferences.has(9223)).toBe(true);
      expect(preferences.get(9222).usageCount).toBe(2);
      expect(preferences.get(9223).usageCount).toBe(1);
    });
  });

  describe('API Integration', () => {
    test('should handle port switching through API', async () => {
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

    test('should handle invalid port requests', async () => {
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

    test('should handle malformed port requests', async () => {
      const req = {
        params: { port: 'invalid' }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await ideController.switchIDE(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid port parameter'
      });
    });
  });

  describe('Fallback Strategy Validation', () => {
    test('should use previously active port when available', async () => {
      portManager.activePort = 9222;
      jest.spyOn(portManager, 'validatePort').mockResolvedValue(true);

      const result = await portManager.selectActivePort();
      expect(result).toBe(9222);
    });

    test('should fallback to first available when previously active is invalid', async () => {
      portManager.activePort = 9999; // Invalid port
      jest.spyOn(portManager, 'validatePort')
        .mockResolvedValueOnce(false) // Previously active invalid
        .mockResolvedValueOnce(true); // First available valid

      jest.spyOn(ideManager, 'getAvailableIDEs').mockResolvedValue([
        { port: 9222, status: 'running', workspacePath: '/path' }
      ]);

      const result = await portManager.selectActivePort();
      expect(result).toBe(9222);
    });

    test('should use healthiest IDE when multiple available', async () => {
      portManager.activePort = null;
      jest.spyOn(ideManager, 'getAvailableIDEs').mockResolvedValue([
        { port: 9222, status: 'running', workspacePath: '/path1', healthStatus: 'warning' },
        { port: 9223, status: 'running', workspacePath: '/path2', healthStatus: 'healthy' },
        { port: 9224, status: 'running', workspacePath: '/path3', healthStatus: 'unhealthy' }
      ]);

      jest.spyOn(portManager, 'validatePort').mockResolvedValue(true);

      const result = await portManager.selectActivePort();
      expect(result).toBe(9223); // Should select healthiest
    });

    test('should use default port range when no IDEs available', async () => {
      portManager.activePort = null;
      jest.spyOn(ideManager, 'getAvailableIDEs').mockResolvedValue([]);
      jest.spyOn(portManager, 'validatePort').mockResolvedValue(false);

      const result = await portManager.selectActivePort();
      expect(result).toBeNull(); // No fallback available
    });
  });

  describe('Health Monitoring', () => {
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
      expect(portManager.getPortHealth().get(9222)).toBe('healthy');
    });

    test('should handle health degradation', async () => {
      // Setup initial healthy state
      portManager.portHealth.set(9222, 'healthy');

      // Simulate health degradation
      const healthEvent = {
        port: 9222,
        health: 'unhealthy'
      };

      const healthHandler = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'ideHealthChanged'
      )[1];

      await healthHandler(healthEvent);

      expect(portManager.getPortHealth().get(9222)).toBe('unhealthy');
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle concurrent port operations', async () => {
      jest.spyOn(portManager, 'validatePort').mockResolvedValue(true);
      jest.spyOn(ideManager, 'switchToIDE').mockResolvedValue({
        port: 9222,
        status: 'active'
      });

      // Simulate concurrent operations
      const promises = [
        portManager.setActivePort(9222),
        portManager.setActivePort(9223),
        portManager.setActivePort(9222)
      ];

      await Promise.all(promises);

      // Should handle gracefully without errors
      expect(portManager.getActivePort()).toBe(9222);
    });

    test('should handle network failures gracefully', async () => {
      jest.spyOn(ideManager, 'getAvailableIDEs').mockRejectedValue(new Error('Network error'));

      const result = await portManager.selectActivePort();
      expect(result).toBeNull(); // Should handle gracefully
    });

    test('should maintain state consistency', async () => {
      // Setup state
      portManager.activePort = 9222;
      portManager.portPreferences.set(9222, { weight: 100, usageCount: 5 });

      // Simulate refresh
      jest.spyOn(portManager, 'validatePort').mockResolvedValue(true);
      await portManager.refresh();

      // State should remain consistent
      expect(portManager.getActivePort()).toBe(9222);
      expect(portManager.getPortPreferences().has(9222)).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    test('should recover from validation errors', async () => {
      jest.spyOn(portManager, 'validatePort').mockRejectedValue(new Error('Validation failed'));

      const result = await portManager.setActivePort(9222);
      expect(result).toBe(false);
    });

    test('should recover from IDE manager errors', async () => {
      jest.spyOn(ideManager, 'switchToIDE').mockRejectedValue(new Error('IDE manager error'));

      const result = await portManager.setActivePort(9222);
      expect(result).toBe(false);
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

  describe('Integration with IDE Manager', () => {
    test('should properly integrate with IDE manager initialization', async () => {
      // Mock IDE manager initialization
      jest.spyOn(ideManager, 'getAvailableIDEs').mockResolvedValue([
        { port: 9222, status: 'running', workspacePath: '/path' }
      ]);

      jest.spyOn(portManager, 'validatePort').mockResolvedValue(true);
      jest.spyOn(ideManager, 'switchToIDE').mockResolvedValue({
        port: 9222,
        status: 'active'
      });

      // Initialize IDE manager
      await ideManager.initialize();

      // Verify port manager was used
      expect(ideManager.getActivePort()).toBe(9222);
    });

    test('should handle IDE manager state changes', async () => {
      // Setup initial state
      ideManager.activePort = 9222;
      portManager.activePort = 9222;

      // Simulate IDE manager state change
      ideManager.activePort = 9223;

      // Port manager should reflect the change
      expect(portManager.getActivePort()).toBe(9223);
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

    test('should handle port failure events', async () => {
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
}); 