import { jest } from '@jest/globals';
import refreshService from '@/infrastructure/services/RefreshService';
import { CacheManager } from '@/infrastructure/services/CacheManager';
import { EventCoordinator } from '@/infrastructure/services/EventCoordinator';
import { ActivityTracker } from '@/infrastructure/services/ActivityTracker';
import { NetworkMonitor } from '@/infrastructure/services/NetworkMonitor';

// Mock dependencies
jest.mock('@/infrastructure/services/CacheManager');
jest.mock('@/infrastructure/services/EventCoordinator');
jest.mock('@/infrastructure/services/ActivityTracker');
jest.mock('@/infrastructure/services/NetworkMonitor');
jest.mock('@/infrastructure/services/WebSocketService', () => ({
  default: {
    isConnected: true,
    on: jest.fn(),
    off: jest.fn(),
    send: jest.fn()
  }
}));

describe('RefreshService', () => {
  let mockCacheManager;
  let mockEventCoordinator;
  let mockActivityTracker;
  let mockNetworkMonitor;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockCacheManager = {
      initialize: jest.fn().mockResolvedValue(),
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getStats: jest.fn().mockReturnValue({}),
      destroy: jest.fn()
    };

    mockEventCoordinator = {
      initialize: jest.fn().mockResolvedValue(),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      send: jest.fn(),
      destroy: jest.fn()
    };

    mockActivityTracker = {
      initialize: jest.fn().mockResolvedValue(),
      on: jest.fn(),
      off: jest.fn(),
      isActive: jest.fn().mockReturnValue(true),
      getStats: jest.fn().mockReturnValue({}),
      destroy: jest.fn()
    };

    mockNetworkMonitor = {
      initialize: jest.fn().mockResolvedValue(),
      on: jest.fn(),
      off: jest.fn(),
      getNetworkMultiplier: jest.fn().mockReturnValue(1.0),
      getStats: jest.fn().mockReturnValue({}),
      destroy: jest.fn()
    };

    // Mock constructors
    CacheManager.mockImplementation(() => mockCacheManager);
    EventCoordinator.mockImplementation(() => mockEventCoordinator);
    ActivityTracker.mockImplementation(() => mockActivityTracker);
    NetworkMonitor.mockImplementation(() => mockNetworkMonitor);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await refreshService.initialize();

      expect(mockCacheManager.initialize).toHaveBeenCalled();
      expect(mockEventCoordinator.initialize).toHaveBeenCalled();
      expect(mockActivityTracker.initialize).toHaveBeenCalled();
      expect(mockNetworkMonitor.initialize).toHaveBeenCalled();
      expect(refreshService.isInitialized).toBe(true);
    });

    test('should not initialize twice', async () => {
      await refreshService.initialize();
      await refreshService.initialize();

      expect(mockCacheManager.initialize).toHaveBeenCalledTimes(1);
    });

    test('should handle initialization errors', async () => {
      mockCacheManager.initialize.mockRejectedValue(new Error('Cache init failed'));

      await expect(refreshService.initialize()).rejects.toThrow('Cache init failed');
    });
  });

  describe('Component Registration', () => {
    beforeEach(async () => {
      await refreshService.initialize();
    });

    test('should register component successfully', () => {
      const mockComponent = {
        fetchData: jest.fn(),
        updateData: jest.fn()
      };

      refreshService.registerComponent('git', mockComponent);

      expect(refreshService.componentStates.has('git')).toBe(true);
      expect(refreshService.componentStates.get('git').component).toBe(mockComponent);
    });

    test('should start refresh timer for registered component', () => {
      const mockComponent = {
        fetchData: jest.fn(),
        updateData: jest.fn()
      };

      const startRefreshTimerSpy = jest.spyOn(refreshService, 'startRefreshTimer');

      refreshService.registerComponent('git', mockComponent);

      expect(startRefreshTimerSpy).toHaveBeenCalledWith('git');
    });

    test('should unregister component successfully', () => {
      const mockComponent = {
        fetchData: jest.fn(),
        updateData: jest.fn()
      };

      refreshService.registerComponent('git', mockComponent);
      refreshService.unregisterComponent('git');

      expect(refreshService.componentStates.has('git')).toBe(false);
    });
  });

  describe('Refresh Operations', () => {
    beforeEach(async () => {
      await refreshService.initialize();
    });

    test('should refresh component with cached data', async () => {
      const mockComponent = {
        fetchData: jest.fn(),
        updateData: jest.fn()
      };

      const cachedData = { status: 'cached' };
      mockCacheManager.get.mockReturnValue(cachedData);

      refreshService.registerComponent('git', mockComponent);
      await refreshService.refreshComponent('git');

      expect(mockCacheManager.get).toHaveBeenCalledWith('refresh:git');
      expect(mockComponent.updateData).toHaveBeenCalledWith(cachedData);
      expect(refreshService.stats.cacheHits).toBe(1);
    });

    test('should refresh component with fresh data', async () => {
      const mockComponent = {
        fetchData: jest.fn().mockResolvedValue({ status: 'fresh' }),
        updateData: jest.fn()
      };

      mockCacheManager.get.mockReturnValue(null);

      refreshService.registerComponent('git', mockComponent);
      await refreshService.refreshComponent('git');

      expect(mockComponent.fetchData).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalled();
      expect(mockComponent.updateData).toHaveBeenCalledWith({ status: 'fresh' });
      expect(refreshService.stats.cacheMisses).toBe(1);
    });

    test('should handle refresh errors gracefully', async () => {
      const mockComponent = {
        fetchData: jest.fn().mockRejectedValue(new Error('Fetch failed')),
        updateData: jest.fn()
      };

      mockCacheManager.get.mockReturnValue(null);

      refreshService.registerComponent('git', mockComponent);
      await refreshService.refreshComponent('git');

      expect(mockComponent.fetchData).toHaveBeenCalled();
      expect(refreshService.stats.cacheMisses).toBe(1);
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await refreshService.initialize();
    });

    test('should handle data change events', () => {
      const mockComponent = {
        fetchData: jest.fn(),
        updateData: jest.fn()
      };

      const eventData = { status: 'changed' };
      mockCacheManager.get.mockReturnValue({ cache: { ttl: 30000 } });

      refreshService.registerComponent('git', mockComponent);
      refreshService.handleDataChange('git', eventData);

      expect(mockCacheManager.set).toHaveBeenCalledWith('refresh:git', eventData, 30000);
      expect(mockComponent.updateData).toHaveBeenCalledWith(eventData);
    });

    test('should handle cache invalidation', () => {
      refreshService.handleCacheInvalidation({ componentType: 'git' });

      expect(mockCacheManager.invalidate).toHaveBeenCalledWith('refresh:git');
    });

    test('should handle user activity changes', () => {
      const startRefreshTimerSpy = jest.spyOn(refreshService, 'startRefreshTimer');
      const stopRefreshTimerSpy = jest.spyOn(refreshService, 'stopRefreshTimer');

      refreshService.handleUserActive();
      refreshService.handleUserInactive();

      expect(startRefreshTimerSpy).toHaveBeenCalled();
      expect(stopRefreshTimerSpy).toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await refreshService.initialize();
    });

    test('should return comprehensive statistics', () => {
      const stats = refreshService.getStats();

      expect(stats).toHaveProperty('totalRefreshes');
      expect(stats).toHaveProperty('cacheHits');
      expect(stats).toHaveProperty('cacheMisses');
      expect(stats).toHaveProperty('apiCalls');
      expect(stats).toHaveProperty('eventDrivenUpdates');
      expect(stats).toHaveProperty('uptime');
      expect(stats).toHaveProperty('activeComponents');
      expect(stats).toHaveProperty('activeTimers');
    });
  });

  describe('Cleanup', () => {
    test('should destroy service properly', async () => {
      await refreshService.initialize();
      refreshService.destroy();

      expect(mockCacheManager.destroy).toHaveBeenCalled();
      expect(mockEventCoordinator.destroy).toHaveBeenCalled();
      expect(mockActivityTracker.destroy).toHaveBeenCalled();
      expect(mockNetworkMonitor.destroy).toHaveBeenCalled();
      expect(refreshService.isInitialized).toBe(false);
    });
  });
});
