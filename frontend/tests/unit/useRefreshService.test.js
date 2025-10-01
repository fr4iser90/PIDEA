import { jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useRefreshService } from '@/hooks/useRefreshService';
import refreshService from '@/infrastructure/services/RefreshService';

// Mock RefreshService
jest.mock('@/infrastructure/services/RefreshService', () => ({
  default: {
    registerComponent: jest.fn(),
    unregisterComponent: jest.fn(),
    refreshComponent: jest.fn(),
    getStats: jest.fn(),
    eventCoordinator: {
      on: jest.fn(),
      off: jest.fn()
    }
  }
}));

describe('useRefreshService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Registration', () => {
    test('should register component on mount', () => {
      const mockComponent = {
        fetchData: jest.fn(),
        updateData: jest.fn()
      };

      const { result } = renderHook(() => 
        useRefreshService('git', mockComponent)
      );

      expect(refreshService.registerComponent).toHaveBeenCalledWith('git', mockComponent, {});
      expect(result.current.isRegistered).toBe(true);
    });

    test('should register component with options', () => {
      const mockComponent = {
        fetchData: jest.fn(),
        updateData: jest.fn()
      };

      const options = {
        interval: 5000,
        priority: 'high'
      };

      renderHook(() => 
        useRefreshService('git', mockComponent, options)
      );

      expect(refreshService.registerComponent).toHaveBeenCalledWith('git', mockComponent, options);
    });

    test('should unregister component on unmount', () => {
      const mockComponent = {
        fetchData: jest.fn(),
        updateData: jest.fn()
      };

      const { unmount } = renderHook(() => 
        useRefreshService('git', mockComponent)
      );

      unmount();

      expect(refreshService.unregisterComponent).toHaveBeenCalledWith('git');
    });

    test('should not register if component is null', () => {
      renderHook(() => 
        useRefreshService('git', null)
      );

      expect(refreshService.registerComponent).not.toHaveBeenCalled();
    });
  });

  describe('Force Refresh', () => {
    test('should call forceRefresh successfully', async () => {
      const mockComponent = {
        fetchData: jest.fn(),
        updateData: jest.fn()
      };

      refreshService.refreshComponent.mockResolvedValue();

      const { result } = renderHook(() => 
        useRefreshService('git', mockComponent)
      );

      await act(async () => {
        await result.current.forceRefresh();
      });

      expect(refreshService.refreshComponent).toHaveBeenCalledWith('git', true);
    });

    test('should handle forceRefresh errors', async () => {
      const mockComponent = {
        fetchData: jest.fn(),
        updateData: jest.fn()
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      refreshService.refreshComponent.mockRejectedValue(new Error('Refresh failed'));

      const { result } = renderHook(() => 
        useRefreshService('git', mockComponent)
      );

      await act(async () => {
        await result.current.forceRefresh();
      });

      expect(refreshService.refreshComponent).toHaveBeenCalledWith('git', true);
      consoleSpy.mockRestore();
    });
  });

  describe('Statistics', () => {
    test('should return statistics', () => {
      const mockComponent = {
        fetchData: jest.fn(),
        updateData: jest.fn()
      };

      const mockStats = {
        totalRefreshes: 10,
        cacheHits: 8,
        cacheMisses: 2
      };

      refreshService.getStats.mockReturnValue(mockStats);

      const { result } = renderHook(() => 
        useRefreshService('git', mockComponent)
      );

      const stats = result.current.getStats();
      expect(stats).toEqual(mockStats);
    });
  });

  describe('Component Updates', () => {
    test('should re-register when component changes', () => {
      const mockComponent1 = {
        fetchData: jest.fn(),
        updateData: jest.fn()
      };

      const mockComponent2 = {
        fetchData: jest.fn(),
        updateData: jest.fn()
      };

      const { rerender } = renderHook(
        ({ component }) => useRefreshService('git', component),
        { initialProps: { component: mockComponent1 } }
      );

      expect(refreshService.registerComponent).toHaveBeenCalledWith('git', mockComponent1, {});

      rerender({ component: mockComponent2 });

      expect(refreshService.registerComponent).toHaveBeenCalledWith('git', mockComponent2, {});
    });

    test('should re-register when options change', () => {
      const mockComponent = {
        fetchData: jest.fn(),
        updateData: jest.fn()
      };

      const options1 = { interval: 5000 };
      const options2 = { interval: 10000 };

      const { rerender } = renderHook(
        ({ options }) => useRefreshService('git', mockComponent, options),
        { initialProps: { options: options1 } }
      );

      expect(refreshService.registerComponent).toHaveBeenCalledWith('git', mockComponent, options1);

      rerender({ options: options2 });

      expect(refreshService.registerComponent).toHaveBeenCalledWith('git', mockComponent, options2);
    });
  });

  describe('Error Handling', () => {
    test('should handle registration errors', () => {
      const mockComponent = {
        fetchData: jest.fn(),
        updateData: jest.fn()
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      refreshService.registerComponent.mockRejectedValue(new Error('Registration failed'));

      renderHook(() => 
        useRefreshService('git', mockComponent)
      );

      expect(refreshService.registerComponent).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('should handle unregistration errors', () => {
      const mockComponent = {
        fetchData: jest.fn(),
        updateData: jest.fn()
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      refreshService.unregisterComponent.mockImplementation(() => {
        throw new Error('Unregistration failed');
      });

      const { unmount } = renderHook(() => 
        useRefreshService('git', mockComponent)
      );

      unmount();

      expect(refreshService.unregisterComponent).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
