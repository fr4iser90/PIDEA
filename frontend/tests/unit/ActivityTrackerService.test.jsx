import { jest } from '@jest/globals';
import ActivityTrackerService from '@/infrastructure/services/ActivityTrackerService.jsx';

// Mock dependencies
jest.mock('@/infrastructure/logging/Logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('ActivityTrackerService', () => {
  let activityTrackerService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    activityTrackerService = new ActivityTrackerService();
  });

  afterEach(() => {
    jest.useRealTimers();
    if (activityTrackerService) {
      activityTrackerService.destroy();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(activityTrackerService.isTracking).toBe(false);
      expect(activityTrackerService.activityThreshold).toBe(30 * 1000); // 30 seconds
      expect(activityTrackerService.debounceDelay).toBe(1000); // 1 second
      expect(activityTrackerService.lastActivity).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      const config = {
        activityThreshold: 60 * 1000,
        debounceDelay: 2000,
        enableMouseTracking: true,
        enableKeyboardTracking: true,
        enableScrollTracking: true
      };

      const service = new ActivityTrackerService(config);
      
      expect(service.activityThreshold).toBe(config.activityThreshold);
      expect(service.debounceDelay).toBe(config.debounceDelay);
    });
  });

  describe('Activity Tracking', () => {
    beforeEach(() => {
      activityTrackerService.startTracking();
    });

    it('should start tracking successfully', () => {
      expect(activityTrackerService.isTracking).toBe(true);
    });

    it('should not start tracking if already active', () => {
      const originalSetup = activityTrackerService.setupEventListeners;
      const mockSetup = jest.spyOn(activityTrackerService, 'setupEventListeners');
      
      activityTrackerService.startTracking();
      
      expect(mockSetup).toHaveBeenCalledTimes(1);
    });

    it('should stop tracking successfully', () => {
      activityTrackerService.stopTracking();
      
      expect(activityTrackerService.isTracking).toBe(false);
    });

    it('should track mouse activity', () => {
      const initialActivity = activityTrackerService.lastActivity;
      
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 200
      });
      
      document.dispatchEvent(mouseEvent);
      
      expect(activityTrackerService.lastActivity).toBeGreaterThan(initialActivity);
    });

    it('should track keyboard activity', () => {
      const initialActivity = activityTrackerService.lastActivity;
      
      const keyboardEvent = new KeyboardEvent('keydown', {
        key: 'a',
        code: 'KeyA'
      });
      
      document.dispatchEvent(keyboardEvent);
      
      expect(activityTrackerService.lastActivity).toBeGreaterThan(initialActivity);
    });

    it('should track scroll activity', () => {
      const initialActivity = activityTrackerService.lastActivity;
      
      const scrollEvent = new Event('scroll');
      window.dispatchEvent(scrollEvent);
      
      expect(activityTrackerService.lastActivity).toBeGreaterThan(initialActivity);
    });

    it('should track touch activity', () => {
      const initialActivity = activityTrackerService.lastActivity;
      
      const touchEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 200 }]
      });
      
      document.dispatchEvent(touchEvent);
      
      expect(activityTrackerService.lastActivity).toBeGreaterThan(initialActivity);
    });

    it('should debounce rapid activity events', () => {
      const mockDebouncedUpdate = jest.spyOn(activityTrackerService, 'debouncedUpdateActivity');
      
      // Trigger multiple rapid events
      for (let i = 0; i < 10; i++) {
        const mouseEvent = new MouseEvent('mousemove');
        document.dispatchEvent(mouseEvent);
      }
      
      // Should only call debounced function once
      expect(mockDebouncedUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Activity Detection', () => {
    it('should detect user as active', () => {
      activityTrackerService.lastActivity = Date.now();
      
      expect(activityTrackerService.isUserActive()).toBe(true);
    });

    it('should detect user as inactive', () => {
      activityTrackerService.lastActivity = Date.now() - 60 * 1000; // 1 minute ago
      
      expect(activityTrackerService.isUserActive()).toBe(false);
    });

    it('should get time since last activity', () => {
      const now = Date.now();
      activityTrackerService.lastActivity = now - 30 * 1000; // 30 seconds ago
      
      const timeSince = activityTrackerService.getTimeSinceLastActivity();
      
      expect(timeSince).toBeCloseTo(30 * 1000, -2); // Within 100ms tolerance
    });

    it('should get activity statistics', () => {
      activityTrackerService.startTracking();
      
      // Simulate some activity
      activityTrackerService.activityCount = 10;
      activityTrackerService.totalDuration = 5 * 60 * 1000; // 5 minutes
      
      const stats = activityTrackerService.getActivityStats();
      
      expect(stats).toEqual({
        isActive: true,
        lastActivity: activityTrackerService.lastActivity,
        timeSinceLastActivity: expect.any(Number),
        activityCount: 10,
        totalDuration: 5 * 60 * 1000,
        averageActivityInterval: expect.any(Number)
      });
    });
  });

  describe('Event Listeners', () => {
    beforeEach(() => {
      activityTrackerService.startTracking();
    });

    it('should setup all event listeners', () => {
      const mockAddEventListener = jest.spyOn(document, 'addEventListener');
      const mockWindowAddEventListener = jest.spyOn(window, 'addEventListener');
      
      activityTrackerService.setupEventListeners();
      
      expect(mockAddEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function), { passive: true });
      expect(mockAddEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function), { passive: true });
      expect(mockAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), { passive: true });
      expect(mockAddEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: true });
      expect(mockWindowAddEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
    });

    it('should remove event listeners on cleanup', () => {
      const mockRemoveEventListener = jest.spyOn(document, 'removeEventListener');
      const mockWindowRemoveEventListener = jest.spyOn(window, 'removeEventListener');
      
      activityTrackerService.removeEventListeners();
      
      expect(mockRemoveEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
      expect(mockWindowRemoveEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig = {
        activityThreshold: 45 * 1000,
        debounceDelay: 1500,
        enableMouseTracking: false
      };
      
      activityTrackerService.updateConfig(newConfig);
      
      expect(activityTrackerService.activityThreshold).toBe(newConfig.activityThreshold);
      expect(activityTrackerService.debounceDelay).toBe(newConfig.debounceDelay);
      expect(activityTrackerService.enableMouseTracking).toBe(newConfig.enableMouseTracking);
    });

    it('should get current configuration', () => {
      const config = activityTrackerService.getConfig();
      
      expect(config).toEqual({
        activityThreshold: activityTrackerService.activityThreshold,
        debounceDelay: activityTrackerService.debounceDelay,
        enableMouseTracking: activityTrackerService.enableMouseTracking,
        enableKeyboardTracking: activityTrackerService.enableKeyboardTracking,
        enableScrollTracking: activityTrackerService.enableScrollTracking,
        enableTouchTracking: activityTrackerService.enableTouchTracking
      });
    });
  });

  describe('Event Emission', () => {
    it('should emit activity events', () => {
      const mockCallback = jest.fn();
      activityTrackerService.on('activity-detected', mockCallback);
      
      activityTrackerService.emit('activity-detected', { type: 'mouse', timestamp: Date.now() });
      
      expect(mockCallback).toHaveBeenCalledWith({ type: 'mouse', timestamp: expect.any(Number) });
    });

    it('should emit inactivity events', () => {
      const mockCallback = jest.fn();
      activityTrackerService.on('inactivity-detected', mockCallback);
      
      activityTrackerService.lastActivity = Date.now() - 60 * 1000; // 1 minute ago
      activityTrackerService.checkInactivity();
      
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should remove event listeners', () => {
      const mockCallback = jest.fn();
      activityTrackerService.on('test-event', mockCallback);
      activityTrackerService.off('test-event', mockCallback);
      
      activityTrackerService.emit('test-event', { data: 'test' });
      
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Performance Optimization', () => {
    it('should use passive event listeners', () => {
      const mockAddEventListener = jest.spyOn(document, 'addEventListener');
      
      activityTrackerService.setupEventListeners();
      
      expect(mockAddEventListener).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        { passive: true }
      );
    });

    it('should debounce rapid events', () => {
      const mockUpdateActivity = jest.spyOn(activityTrackerService, 'updateActivity');
      
      // Trigger rapid events
      for (let i = 0; i < 5; i++) {
        activityTrackerService.handleActivity('mouse');
      }
      
      // Should only update once due to debouncing
      jest.advanceTimersByTime(1000);
      expect(mockUpdateActivity).toHaveBeenCalledTimes(1);
    });

    it('should handle memory cleanup', () => {
      activityTrackerService.startTracking();
      
      // Simulate memory pressure
      activityTrackerService.activityHistory = new Array(1000).fill({ timestamp: Date.now() });
      
      activityTrackerService.cleanupMemory();
      
      expect(activityTrackerService.activityHistory.length).toBeLessThan(1000);
    });
  });

  describe('Error Handling', () => {
    it('should handle event listener errors gracefully', () => {
      const originalAddEventListener = document.addEventListener;
      document.addEventListener = jest.fn().mockImplementation(() => {
        throw new Error('Event listener error');
      });
      
      expect(() => {
        activityTrackerService.setupEventListeners();
      }).not.toThrow();
      
      // Restore original method
      document.addEventListener = originalAddEventListener;
    });

    it('should handle configuration errors', () => {
      expect(() => {
        activityTrackerService.updateConfig({ invalidProperty: 'value' });
      }).not.toThrow();
    });

    it('should handle destroy when not initialized', () => {
      const uninitializedService = new ActivityTrackerService();
      
      expect(() => {
        uninitializedService.destroy();
      }).not.toThrow();
    });
  });

  describe('Browser Compatibility', () => {
    it('should handle missing TouchEvent', () => {
      const originalTouchEvent = global.TouchEvent;
      global.TouchEvent = undefined;
      
      expect(() => {
        activityTrackerService.handleActivity('touch');
      }).not.toThrow();
      
      global.TouchEvent = originalTouchEvent;
    });

    it('should handle missing MouseEvent', () => {
      const originalMouseEvent = global.MouseEvent;
      global.MouseEvent = undefined;
      
      expect(() => {
        activityTrackerService.handleActivity('mouse');
      }).not.toThrow();
      
      global.MouseEvent = originalMouseEvent;
    });
  });

  describe('Integration', () => {
    it('should work with session monitoring', () => {
      const mockSessionMonitor = {
        updateLastActivity: jest.fn()
      };
      
      activityTrackerService.on('activity-detected', (data) => {
        mockSessionMonitor.updateLastActivity(data.timestamp);
      });
      
      activityTrackerService.handleActivity('mouse');
      
      expect(mockSessionMonitor.updateLastActivity).toHaveBeenCalled();
    });

    it('should provide activity data for session extension', () => {
      activityTrackerService.startTracking();
      
      // Simulate activity
      activityTrackerService.activityCount = 5;
      activityTrackerService.totalDuration = 2 * 60 * 1000;
      
      const activityData = activityTrackerService.getActivityData();
      
      expect(activityData).toEqual({
        type: 'user-activity',
        details: {
          activityCount: 5,
          totalDuration: 2 * 60 * 1000,
          lastActivity: expect.any(Number)
        },
        duration: expect.any(Number)
      });
    });
  });
});
