/**
 * Unit tests for IDEStore
 */

import { renderHook, act } from '@testing-library/react';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';

// Mock the API call
jest.mock('@/infrastructure/repositories/APIChatRepository.jsx', () => ({
  apiCall: jest.fn()
}));

// Mock the logger
jest.mock('@/infrastructure/logging/Logger', () => ({
  logger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('IDEStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the store state before each test
    const { result } = renderHook(() => useIDEStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Initial State', () => {
    test('should have correct initial state', () => {
      const { result } = renderHook(() => useIDEStore());
      
      expect(result.current.activePort).toBeNull();
      expect(result.current.portPreferences).toEqual([]);
      expect(result.current.availableIDEs).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdate).toBeNull();
      expect(result.current.retryCount).toBe(0);
    });
  });

  describe('isValidPortRange', () => {
    test('should return true for valid Cursor ports', () => {
      const { result } = renderHook(() => useIDEStore());
      
      expect(result.current.isValidPortRange(9222)).toBe(true);
      expect(result.current.isValidPortRange(9225)).toBe(true);
      expect(result.current.isValidPortRange(9231)).toBe(true);
    });

    test('should return true for valid VSCode ports', () => {
      const { result } = renderHook(() => useIDEStore());
      
      expect(result.current.isValidPortRange(9232)).toBe(true);
      expect(result.current.isValidPortRange(9235)).toBe(true);
      expect(result.current.isValidPortRange(9241)).toBe(true);
    });

    test('should return true for valid Windsurf ports', () => {
      const { result } = renderHook(() => useIDEStore());
      
      expect(result.current.isValidPortRange(9242)).toBe(true);
      expect(result.current.isValidPortRange(9245)).toBe(true);
      expect(result.current.isValidPortRange(9251)).toBe(true);
    });

    test('should return false for invalid ports', () => {
      const { result } = renderHook(() => useIDEStore());
      
      expect(result.current.isValidPortRange(9221)).toBe(false);
      expect(result.current.isValidPortRange(9252)).toBe(false);
      expect(result.current.isValidPortRange(0)).toBe(false);
      expect(result.current.isValidPortRange(9999)).toBe(false);
    });
  });

  describe('validatePort', () => {
    test('should return false for invalid port range', async () => {
      const { result } = renderHook(() => useIDEStore());
      
      const isValid = await result.current.validatePort(9999);
      expect(isValid).toBe(false);
    });

    test('should return false when IDE not found', async () => {
      const { result } = renderHook(() => useIDEStore());
      
      // Set available IDEs
      act(() => {
        result.current.availableIDEs = [
          { port: 9222, status: 'running', workspacePath: '/path' }
        ];
      });
      
      const isValid = await result.current.validatePort(9223);
      expect(isValid).toBe(false);
    });

    test('should return false when IDE not running', async () => {
      const { result } = renderHook(() => useIDEStore());
      
      act(() => {
        result.current.availableIDEs = [
          { port: 9222, status: 'stopped', workspacePath: '/path' }
        ];
      });
      
      const isValid = await result.current.validatePort(9222);
      expect(isValid).toBe(false);
    });

    test('should return false when IDE has no workspace path', async () => {
      const { result } = renderHook(() => useIDEStore());
      
      act(() => {
        result.current.availableIDEs = [
          { port: 9222, status: 'running', workspacePath: null }
        ];
      });
      
      const isValid = await result.current.validatePort(9222);
      expect(isValid).toBe(false);
    });

    test('should return true for valid port', async () => {
      const { result } = renderHook(() => useIDEStore());
      
      act(() => {
        result.current.availableIDEs = [
          { port: 9222, status: 'running', workspacePath: '/path' }
        ];
      });
      
      const isValid = await result.current.validatePort(9222);
      expect(isValid).toBe(true);
    });
  });

  describe('loadAvailableIDEs', () => {
    test('should load IDEs successfully', async () => {
      const mockIDEs = [
        { port: 9222, status: 'running', workspacePath: '/path1' },
        { port: 9223, status: 'running', workspacePath: '/path2' }
      ];
      
      apiCall.mockResolvedValue({
        success: true,
        data: mockIDEs
      });

      const { result } = renderHook(() => useIDEStore());
      
      await act(async () => {
        await result.current.loadAvailableIDEs();
      });
      
      expect(result.current.availableIDEs).toEqual(mockIDEs);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdate).toBeTruthy();
    });

    test('should handle API errors', async () => {
      apiCall.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useIDEStore());
      
      await act(async () => {
        await result.current.loadAvailableIDEs();
      });
      
      expect(result.current.error).toBe('API Error');
      expect(result.current.isLoading).toBe(false);
    });

    test('should retry on failure', async () => {
      apiCall.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useIDEStore());
      
      await act(async () => {
        await result.current.loadAvailableIDEs();
      });
      
      expect(result.current.retryCount).toBe(1);
    });
  });

  describe('setActivePort', () => {
    test('should set active port successfully', async () => {
      const { result } = renderHook(() => useIDEStore());
      
      // Set available IDEs first
      act(() => {
        result.current.availableIDEs = [
          { port: 9222, status: 'running', workspacePath: '/path' }
        ];
      });
      
      await act(async () => {
        await result.current.setActivePort(9222);
      });
      
      expect(result.current.activePort).toBe(9222);
      expect(result.current.portPreferences).toHaveLength(1);
      expect(result.current.portPreferences[0].port).toBe(9222);
      expect(result.current.portPreferences[0].weight).toBe(100);
      expect(result.current.portPreferences[0].usageCount).toBe(1);
    });

    test('should update existing preference', async () => {
      const { result } = renderHook(() => useIDEStore());
      
      // Set available IDEs first
      act(() => {
        result.current.availableIDEs = [
          { port: 9222, status: 'running', workspacePath: '/path' }
        ];
      });
      
      // Set port twice
      await act(async () => {
        await result.current.setActivePort(9222);
        await result.current.setActivePort(9222);
      });
      
      expect(result.current.portPreferences[0].usageCount).toBe(2);
      expect(result.current.portPreferences[0].weight).toBe(100); // Should cap at 100
    });

    test('should throw error for invalid port', async () => {
      const { result } = renderHook(() => useIDEStore());
      
      await expect(
        act(async () => {
          await result.current.setActivePort(9999);
        })
      ).rejects.toThrow('Port 9999 is not valid');
    });
  });

  describe('loadActivePort', () => {
    test('should use previously active port if valid', async () => {
      const { result } = renderHook(() => useIDEStore());
      
      // Set up state
      act(() => {
        result.current.activePort = 9222;
        result.current.availableIDEs = [
          { port: 9222, status: 'running', workspacePath: '/path' }
        ];
      });
      
      const port = await act(async () => {
        return await result.current.loadActivePort();
      });
      
      expect(port).toBe(9222);
    });

    test('should use preferred port if previously active is invalid', async () => {
      const { result } = renderHook(() => useIDEStore());
      
      // Set up state with invalid active port but valid preference
      act(() => {
        result.current.activePort = 9999;
        result.current.portPreferences = [
          { port: 9222, weight: 100, lastUsed: new Date().toISOString() }
        ];
        result.current.availableIDEs = [
          { port: 9222, status: 'running', workspacePath: '/path' }
        ];
      });
      
      const port = await act(async () => {
        return await result.current.loadActivePort();
      });
      
      expect(port).toBe(9222);
    });

    test('should use first available port if no preferences', async () => {
      const { result } = renderHook(() => useIDEStore());
      
      // Mock API call
      apiCall.mockResolvedValue({
        success: true,
        data: [
          { port: 9222, status: 'running', workspacePath: '/path' }
        ]
      });
      
      const port = await act(async () => {
        return await result.current.loadActivePort();
      });
      
      expect(port).toBe(9222);
    });

    test('should return null when no ports available', async () => {
      const { result } = renderHook(() => useIDEStore());
      
      // Mock API call with no IDEs
      apiCall.mockResolvedValue({
        success: true,
        data: []
      });
      
      const port = await act(async () => {
        return await result.current.loadActivePort();
      });
      
      expect(port).toBeNull();
    });
  });

  describe('handlePortFailure', () => {
    test('should remove failed port from preferences', async () => {
      const { result } = renderHook(() => useIDEStore());
      
      // Set up state
      act(() => {
        result.current.activePort = 9222;
        result.current.portPreferences = [
          { port: 9222, weight: 100 },
          { port: 9223, weight: 50 }
        ];
      });
      
      await act(async () => {
        await result.current.handlePortFailure(9222, 'test failure');
      });
      
      expect(result.current.portPreferences).toHaveLength(1);
      expect(result.current.portPreferences[0].port).toBe(9223);
    });

    test('should select new port when active port fails', async () => {
      const { result } = renderHook(() => useIDEStore());
      
      // Set up state
      act(() => {
        result.current.activePort = 9222;
        result.current.availableIDEs = [
          { port: 9223, status: 'running', workspacePath: '/path' }
        ];
      });
      
      const newPort = await act(async () => {
        return await result.current.handlePortFailure(9222, 'test failure');
      });
      
      expect(newPort).toBe(9223);
    });
  });

  describe('switchIDE', () => {
    test('should switch IDE successfully', async () => {
      const { result } = renderHook(() => useIDEStore());
      
      // Mock API call
      apiCall.mockResolvedValue({
        success: true,
        data: { port: 9222 }
      });
      
      // Set available IDEs
      act(() => {
        result.current.availableIDEs = [
          { port: 9222, status: 'running', workspacePath: '/path' }
        ];
      });
      
      const success = await act(async () => {
        return await result.current.switchIDE(9222);
      });
      
      expect(success).toBe(true);
      expect(result.current.activePort).toBe(9222);
    });

    test('should handle switch failure', async () => {
      const { result } = renderHook(() => useIDEStore());
      
      // Mock API call failure
      apiCall.mockResolvedValue({
        success: false,
        error: 'Switch failed'
      });
      
      const success = await act(async () => {
        return await result.current.switchIDE(9222);
      });
      
      expect(success).toBe(false);
      expect(result.current.error).toBe('Switch failed');
    });
  });

  describe('refresh', () => {
    test('should refresh successfully', async () => {
      const { result } = renderHook(() => useIDEStore());
      
      // Mock API call
      apiCall.mockResolvedValue({
        success: true,
        data: [
          { port: 9222, status: 'running', workspacePath: '/path' }
        ]
      });
      
      await act(async () => {
        await result.current.refresh();
      });
      
      expect(result.current.availableIDEs).toHaveLength(1);
      expect(result.current.activePort).toBe(9222);
    });
  });

  describe('clearError', () => {
    test('should clear error', () => {
      const { result } = renderHook(() => useIDEStore());
      
      act(() => {
        result.current.error = 'Test error';
      });
      
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });
  });

  describe('reset', () => {
    test('should reset state', () => {
      const { result } = renderHook(() => useIDEStore());
      
      // Set some state
      act(() => {
        result.current.activePort = 9222;
        result.current.portPreferences = [{ port: 9222 }];
        result.current.availableIDEs = [{ port: 9222 }];
        result.current.error = 'Test error';
      });
      
      act(() => {
        result.current.reset();
      });
      
      expect(result.current.activePort).toBeNull();
      expect(result.current.portPreferences).toEqual([]);
      expect(result.current.availableIDEs).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.lastUpdate).toBeNull();
      expect(result.current.retryCount).toBe(0);
    });
  });
}); 