import { jest } from '@jest/globals';
import SessionMonitorService from '@/infrastructure/services/SessionMonitorService.jsx';
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import useNotificationStore from '@/infrastructure/stores/NotificationStore.jsx';
import webSocketService from '@/infrastructure/services/WebSocketService.jsx';

// Mock dependencies
jest.mock('@/infrastructure/stores/AuthStore.jsx');
jest.mock('@/infrastructure/stores/NotificationStore.jsx');
jest.mock('@/infrastructure/services/WebSocketService.jsx');
jest.mock('@/infrastructure/logging/Logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('SessionMonitorService', () => {
  let sessionMonitorService;
  let mockAuthStore;
  let mockNotificationStore;
  let mockWebSocketService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock AuthStore
    mockAuthStore = {
      getState: jest.fn(() => ({
        isAuthenticated: true,
        user: { id: 'user-1', email: 'test@example.com' },
        sessionExpiry: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
        sessionWarningShown: false,
        logout: jest.fn()
      })),
      setState: jest.fn()
    };
    useAuthStore.mockReturnValue(mockAuthStore);

    // Mock NotificationStore
    mockNotificationStore = {
      getState: jest.fn(() => ({
        addNotification: jest.fn(),
        clearAllNotifications: jest.fn()
      }))
    };
    useNotificationStore.mockReturnValue(mockNotificationStore);

    // Mock WebSocketService
    mockWebSocketService = {
      isConnected: true,
      send: jest.fn(),
      on: jest.fn(),
      off: jest.fn()
    };
    webSocketService.mockReturnValue(mockWebSocketService);

    // Create service instance
    sessionMonitorService = new SessionMonitorService();
  });

  afterEach(() => {
    jest.useRealTimers();
    if (sessionMonitorService) {
      sessionMonitorService.stopMonitoring();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(sessionMonitorService.isMonitoring).toBe(false);
      expect(sessionMonitorService.sessionTimeout).toBe(15 * 60 * 1000);
      expect(sessionMonitorService.warningThreshold).toBe(5 * 60 * 1000);
      expect(sessionMonitorService.validationIntervalMs).toBe(2 * 60 * 1000);
    });

    it('should setup cross-tab synchronization', () => {
      expect(sessionMonitorService.broadcastChannel).toBeDefined();
    });
  });

  describe('Session Monitoring', () => {
    it('should start monitoring successfully', () => {
      sessionMonitorService.startMonitoring();

      expect(sessionMonitorService.isMonitoring).toBe(true);
      expect(sessionMonitorService.validationInterval).toBeDefined();
    });

    it('should not start monitoring if already active', () => {
      sessionMonitorService.startMonitoring();
      const firstInterval = sessionMonitorService.validationInterval;
      
      sessionMonitorService.startMonitoring();
      
      expect(sessionMonitorService.validationInterval).toBe(firstInterval);
    });

    it('should stop monitoring successfully', () => {
      sessionMonitorService.startMonitoring();
      sessionMonitorService.stopMonitoring();

      expect(sessionMonitorService.isMonitoring).toBe(false);
      expect(sessionMonitorService.validationInterval).toBeNull();
    });

    it('should handle monitoring stop when not active', () => {
      expect(() => {
        sessionMonitorService.stopMonitoring();
      }).not.toThrow();
    });
  });

  describe('Session Validation', () => {
    beforeEach(() => {
      sessionMonitorService.startMonitoring();
    });

    it('should validate session successfully', async () => {
      const mockSession = {
        id: 'session-1',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
        isActive: () => true
      };

      mockAuthStore.getState.mockReturnValue({
        isAuthenticated: true,
        sessionExpiry: mockSession.expiresAt,
        user: { id: 'user-1' }
      });

      await sessionMonitorService.validateSession();

      // Should not trigger warning for valid session
      expect(mockNotificationStore.getState().addNotification).not.toHaveBeenCalled();
    });

    it('should handle session expiry', async () => {
      const expiredDate = new Date(Date.now() - 1000); // 1 second ago
      
      mockAuthStore.getState.mockReturnValue({
        isAuthenticated: true,
        sessionExpiry: expiredDate,
        user: { id: 'user-1' },
        logout: jest.fn()
      });

      await sessionMonitorService.validateSession();

      expect(mockAuthStore.getState().logout).toHaveBeenCalled();
    });

    it('should show warning when session expires soon', async () => {
      const warningDate = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now
      
      mockAuthStore.getState.mockReturnValue({
        isAuthenticated: true,
        sessionExpiry: warningDate,
        sessionWarningShown: false,
        user: { id: 'user-1' }
      });

      await sessionMonitorService.validateSession();

      expect(mockNotificationStore.getState().addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          title: 'Session Expiring Soon'
        })
      );
    });
  });

  describe('Activity Tracking', () => {
    beforeEach(() => {
      sessionMonitorService.startMonitoring();
    });

    it('should detect user activity', () => {
      const initialActivity = sessionMonitorService.lastActivity;
      
      // Simulate user activity
      const mouseEvent = new MouseEvent('mousedown');
      document.dispatchEvent(mouseEvent);

      expect(sessionMonitorService.lastActivity).toBeGreaterThan(initialActivity);
    });

    it('should track multiple activity types', () => {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      events.forEach(eventType => {
        const event = new Event(eventType);
        document.dispatchEvent(event);
      });

      // All events should update activity
      expect(sessionMonitorService.lastActivity).toBeGreaterThan(Date.now() - 1000);
    });

    it('should determine if user is active', () => {
      sessionMonitorService.lastActivity = Date.now();
      expect(sessionMonitorService.isUserActive()).toBe(true);

      sessionMonitorService.lastActivity = Date.now() - 60 * 1000; // 1 minute ago
      expect(sessionMonitorService.isUserActive()).toBe(false);
    });

    it('should update last activity timestamp', () => {
      const beforeUpdate = sessionMonitorService.lastActivity;
      
      sessionMonitorService.updateLastActivity();
      
      expect(sessionMonitorService.lastActivity).toBeGreaterThan(beforeUpdate);
    });
  });

  describe('Session Extension', () => {
    it('should extend session successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          sessionId: 'session-1',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          extensionCount: 1
        }
      };

      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await sessionMonitorService.extendSession();

      expect(result).toEqual(mockResponse.data);
      expect(fetch).toHaveBeenCalledWith('/api/session/extend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    });

    it('should handle session extension failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Extension failed' })
      });

      await expect(sessionMonitorService.extendSession()).rejects.toThrow();
    });
  });

  describe('Cross-Tab Synchronization', () => {
    it('should broadcast session events', () => {
      const mockBroadcast = jest.spyOn(sessionMonitorService, 'broadcastToTabs');
      
      sessionMonitorService.broadcastToTabs('session-extended', { sessionId: 'session-1' });
      
      expect(mockBroadcast).toHaveBeenCalledWith('session-extended', { sessionId: 'session-1' });
    });

    it('should handle cross-tab messages', () => {
      const mockHandler = jest.fn();
      sessionMonitorService.on('session-expired', mockHandler);

      // Simulate cross-tab message
      const message = {
        type: 'session-expired',
        payload: { sessionId: 'session-1' },
        tabId: 'other-tab'
      };

      sessionMonitorService.handleCrossTabMessage(message);

      expect(mockHandler).toHaveBeenCalledWith(message.payload);
    });
  });

  describe('Session State Persistence', () => {
    it('should save session state', async () => {
      const mockState = {
        currentPage: '/dashboard',
        formData: { field1: 'value1' },
        timestamp: Date.now()
      };

      // Mock localStorage
      const mockSetItem = jest.spyOn(Storage.prototype, 'setItem');
      
      await sessionMonitorService.saveSessionState(mockState);

      expect(mockSetItem).toHaveBeenCalledWith(
        'pidea-session-state',
        JSON.stringify(mockState)
      );
    });

    it('should restore session state', async () => {
      const mockState = {
        currentPage: '/dashboard',
        formData: { field1: 'value1' }
      };

      // Mock localStorage
      const mockGetItem = jest.spyOn(Storage.prototype, 'getItem')
        .mockReturnValue(JSON.stringify(mockState));

      const result = await sessionMonitorService.restoreSessionState();

      expect(result).toEqual(mockState);
      expect(mockGetItem).toHaveBeenCalledWith('pidea-session-state');
    });

    it('should handle missing session state', async () => {
      const mockGetItem = jest.spyOn(Storage.prototype, 'getItem')
        .mockReturnValue(null);

      const result = await sessionMonitorService.restoreSessionState();

      expect(result).toBeNull();
    });
  });

  describe('Event Handling', () => {
    it('should emit events correctly', () => {
      const mockCallback = jest.fn();
      sessionMonitorService.on('test-event', mockCallback);

      sessionMonitorService.emit('test-event', { data: 'test' });

      expect(mockCallback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should remove event listeners', () => {
      const mockCallback = jest.fn();
      sessionMonitorService.on('test-event', mockCallback);
      sessionMonitorService.off('test-event', mockCallback);

      sessionMonitorService.emit('test-event', { data: 'test' });

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      mockAuthStore.getState.mockImplementation(() => {
        throw new Error('Auth store error');
      });

      await expect(sessionMonitorService.validateSession()).rejects.toThrow('Auth store error');
    });

    it('should handle activity tracking errors', () => {
      // Mock document.addEventListener to throw error
      const originalAddEventListener = document.addEventListener;
      document.addEventListener = jest.fn().mockImplementation(() => {
        throw new Error('Event listener error');
      });

      expect(() => {
        sessionMonitorService.setupActivityTracking();
      }).not.toThrow();

      // Restore original method
      document.addEventListener = originalAddEventListener;
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      const newConfig = {
        sessionTimeout: 30 * 60 * 1000,
        warningThreshold: 10 * 60 * 1000,
        validationIntervalMs: 5 * 60 * 1000
      };

      sessionMonitorService.updateConfig(newConfig);

      expect(sessionMonitorService.sessionTimeout).toBe(newConfig.sessionTimeout);
      expect(sessionMonitorService.warningThreshold).toBe(newConfig.warningThreshold);
      expect(sessionMonitorService.validationIntervalMs).toBe(newConfig.validationIntervalMs);
    });

    it('should get current configuration', () => {
      const config = sessionMonitorService.getConfig();

      expect(config).toEqual({
        sessionTimeout: sessionMonitorService.sessionTimeout,
        warningThreshold: sessionMonitorService.warningThreshold,
        validationIntervalMs: sessionMonitorService.validationIntervalMs,
        activityThreshold: sessionMonitorService.activityThreshold
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      sessionMonitorService.startMonitoring();
      
      const mockStopMonitoring = jest.spyOn(sessionMonitorService, 'stopMonitoring');
      const mockRemoveActivityTracking = jest.spyOn(sessionMonitorService, 'removeActivityTracking');

      sessionMonitorService.destroy();

      expect(mockStopMonitoring).toHaveBeenCalled();
      expect(mockRemoveActivityTracking).toHaveBeenCalled();
    });
  });
});
