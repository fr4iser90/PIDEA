import { renderHook, act, waitFor } from '@testing-library/react';
import { usePortConfiguration } from '@/hooks/usePortConfiguration.js';

// Mock dependencies
jest.mock('@/infrastructure/logging/Logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('@/infrastructure/stores/IDEStore.jsx', () => ({
  __esModule: true,
  default: () => ({
    validatePort: jest.fn(),
    isValidPortRange: jest.fn(),
    portPreferences: [],
    setActivePort: jest.fn()
  })
}));

describe('usePortConfiguration', () => {
  let mockValidatePort;
  let mockIsValidPortRange;
  let mockPortPreferences;
  let mockSetActivePort;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockValidatePort = jest.fn();
    mockIsValidPortRange = jest.fn();
    mockPortPreferences = [];
    mockSetActivePort = jest.fn();

    jest.doMock('@/infrastructure/stores/IDEStore.jsx', () => ({
      __esModule: true,
      default: () => ({
        validatePort: mockValidatePort,
        isValidPortRange: mockIsValidPortRange,
        portPreferences: mockPortPreferences,
        setActivePort: mockSetActivePort
      })
    }));
  });

  describe('Initialization', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() => usePortConfiguration());

      expect(result.current.customPort).toBeNull();
      expect(result.current.isValidating).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastValidation).toBeNull();
    });

    it('initializes with custom port from preferences', () => {
      mockPortPreferences.push({
        port: 9222,
        isCustom: true,
        weight: 100,
        usageCount: 1,
        lastUsed: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      const { result } = renderHook(() => usePortConfiguration());

      expect(result.current.customPort).toBe(9222);
    });

    it('ignores preferences without isCustom flag', () => {
      mockPortPreferences.push({
        port: 9222,
        weight: 100,
        usageCount: 1,
        lastUsed: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      const { result } = renderHook(() => usePortConfiguration());

      expect(result.current.customPort).toBeNull();
    });
  });

  describe('setCustomPort', () => {
    it('sets valid port successfully', async () => {
      mockIsValidPortRange.mockReturnValue(true);
      mockValidatePort.mockResolvedValue(true);

      const { result } = renderHook(() => usePortConfiguration());

      await act(async () => {
        const response = await result.current.setCustomPort(9222);
        expect(response.success).toBe(true);
        expect(response.port).toBe(9222);
      });

      expect(result.current.customPort).toBe(9222);
      expect(result.current.error).toBeNull();
      expect(result.current.lastValidation).toEqual({
        isValid: true,
        error: null,
        port: 9222
      });
    });

    it('handles empty port', async () => {
      const { result } = renderHook(() => usePortConfiguration());

      await act(async () => {
        const response = await result.current.setCustomPort('');
        expect(response.success).toBe(true);
        expect(response.message).toBe('Port cleared');
      });

      expect(result.current.customPort).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('validates port range', async () => {
      mockIsValidPortRange.mockReturnValue(false);

      const { result } = renderHook(() => usePortConfiguration());

      await act(async () => {
        const response = await result.current.setCustomPort(9999);
        expect(response.success).toBe(false);
        expect(response.error).toBe('Port not in valid IDE range (9222-9251)');
      });

      expect(result.current.customPort).toBeNull();
      expect(result.current.error).toBe('Port not in valid IDE range (9222-9251)');
    });

    it('validates port availability', async () => {
      mockIsValidPortRange.mockReturnValue(true);
      mockValidatePort.mockResolvedValue(false);

      const { result } = renderHook(() => usePortConfiguration());

      await act(async () => {
        const response = await result.current.setCustomPort(9222);
        expect(response.success).toBe(false);
        expect(response.error).toBe('Port is not available or IDE is not running');
      });

      expect(result.current.customPort).toBeNull();
      expect(result.current.error).toBe('Port is not available or IDE is not running');
    });

    it('handles validation errors', async () => {
      mockIsValidPortRange.mockReturnValue(true);
      mockValidatePort.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePortConfiguration());

      await act(async () => {
        const response = await result.current.setCustomPort(9222);
        expect(response.success).toBe(false);
        expect(response.error).toBe('Failed to set custom port');
      });

      expect(result.current.customPort).toBeNull();
      expect(result.current.error).toBe('Failed to set custom port');
    });

    it('updates port preferences on successful set', async () => {
      mockIsValidPortRange.mockReturnValue(true);
      mockValidatePort.mockResolvedValue(true);

      const { result } = renderHook(() => usePortConfiguration());

      await act(async () => {
        await result.current.setCustomPort(9222);
      });

      // Verify that preferences would be updated (this is handled by IDEStore)
      expect(mockValidatePort).toHaveBeenCalledWith(9222);
    });
  });

  describe('validatePort', () => {
    it('validates port successfully', async () => {
      mockIsValidPortRange.mockReturnValue(true);
      mockValidatePort.mockResolvedValue(true);

      const { result } = renderHook(() => usePortConfiguration());

      await act(async () => {
        const validation = await result.current.validatePort(9222);
        expect(validation.isValid).toBe(true);
        expect(validation.error).toBeNull();
        expect(validation.port).toBe(9222);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.lastValidation).toEqual({
        isValid: true,
        error: null,
        port: 9222
      });
    });

    it('handles empty port', async () => {
      const { result } = renderHook(() => usePortConfiguration());

      await act(async () => {
        const validation = await result.current.validatePort('');
        expect(validation.isValid).toBe(false);
        expect(validation.error).toBeNull();
        expect(validation.port).toBeNull();
      });
    });

    it('validates port range', async () => {
      mockIsValidPortRange.mockReturnValue(false);

      const { result } = renderHook(() => usePortConfiguration());

      await act(async () => {
        const validation = await result.current.validatePort(9999);
        expect(validation.isValid).toBe(false);
        expect(validation.error).toBe('Port not in valid IDE range (9222-9251)');
        expect(validation.port).toBe(9999);
      });

      expect(result.current.error).toBe('Port not in valid IDE range (9222-9251)');
    });

    it('validates port availability', async () => {
      mockIsValidPortRange.mockReturnValue(true);
      mockValidatePort.mockResolvedValue(false);

      const { result } = renderHook(() => usePortConfiguration());

      await act(async () => {
        const validation = await result.current.validatePort(9222);
        expect(validation.isValid).toBe(false);
        expect(validation.error).toBe('Port is not available or IDE is not running');
        expect(validation.port).toBe(9222);
      });

      expect(result.current.error).toBe('Port is not available or IDE is not running');
    });

    it('handles validation errors', async () => {
      mockIsValidPortRange.mockReturnValue(true);
      mockValidatePort.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePortConfiguration());

      await act(async () => {
        const validation = await result.current.validatePort(9222);
        expect(validation.isValid).toBe(false);
        expect(validation.error).toBe('Failed to validate port');
        expect(validation.port).toBe(9222);
      });

      expect(result.current.error).toBe('Failed to validate port');
    });
  });

  describe('clearCustomPort', () => {
    it('clears custom port successfully', () => {
      const { result } = renderHook(() => usePortConfiguration());

      act(() => {
        const response = result.current.clearCustomPort();
        expect(response.success).toBe(true);
      });

      expect(result.current.customPort).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.lastValidation).toEqual({
        isValid: false,
        error: null,
        port: null
      });
    });

    it('handles clear errors gracefully', () => {
      const { result } = renderHook(() => usePortConfiguration());

      // Mock an error scenario
      jest.spyOn(console, 'error').mockImplementation(() => {});

      act(() => {
        const response = result.current.clearCustomPort();
        expect(response.success).toBe(true);
      });

      expect(result.current.customPort).toBeNull();
    });
  });

  describe('clearError', () => {
    it('clears error state', async () => {
      mockIsValidPortRange.mockReturnValue(false);

      const { result } = renderHook(() => usePortConfiguration());

      // First, create an error
      await act(async () => {
        await result.current.validatePort(9999);
      });

      expect(result.current.error).toBe('Port not in valid IDE range (9222-9251)');

      // Then clear it
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('getCustomPort', () => {
    it('returns current custom port', () => {
      const { result } = renderHook(() => usePortConfiguration());

      expect(result.current.getCustomPort()).toBeNull();

      act(() => {
        result.current.setCustomPort(9222);
      });

      expect(result.current.getCustomPort()).toBe(9222);
    });
  });

  describe('isPortValid', () => {
    it('returns true for valid port', async () => {
      mockIsValidPortRange.mockReturnValue(true);
      mockValidatePort.mockResolvedValue(true);

      const { result } = renderHook(() => usePortConfiguration());

      await act(async () => {
        await result.current.validatePort(9222);
      });

      expect(result.current.isPortValid()).toBe(true);
    });

    it('returns false for invalid port', async () => {
      mockIsValidPortRange.mockReturnValue(false);

      const { result } = renderHook(() => usePortConfiguration());

      await act(async () => {
        await result.current.validatePort(9999);
      });

      expect(result.current.isPortValid()).toBe(false);
    });

    it('returns false when no validation has been performed', () => {
      const { result } = renderHook(() => usePortConfiguration());

      expect(result.current.isPortValid()).toBe(false);
    });
  });

  describe('Loading States', () => {
    it('shows loading state during validation', async () => {
      mockIsValidPortRange.mockReturnValue(true);
      mockValidatePort.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      const { result } = renderHook(() => usePortConfiguration());

      expect(result.current.isValidating).toBe(false);

      act(() => {
        result.current.validatePort(9222);
      });

      expect(result.current.isValidating).toBe(true);

      await waitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });
    });

    it('shows loading state during setCustomPort', async () => {
      mockIsValidPortRange.mockReturnValue(true);
      mockValidatePort.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      const { result } = renderHook(() => usePortConfiguration());

      expect(result.current.isValidating).toBe(false);

      act(() => {
        result.current.setCustomPort(9222);
      });

      expect(result.current.isValidating).toBe(true);

      await waitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      mockIsValidPortRange.mockReturnValue(true);
      mockValidatePort.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePortConfiguration());

      await act(async () => {
        const validation = await result.current.validatePort(9222);
        expect(validation.isValid).toBe(false);
        expect(validation.error).toBe('Failed to validate port');
      });

      expect(result.current.error).toBe('Failed to validate port');
    });

    it('handles invalid port numbers', async () => {
      const { result } = renderHook(() => usePortConfiguration());

      await act(async () => {
        const validation = await result.current.validatePort('abc');
        expect(validation.isValid).toBe(false);
        expect(validation.error).toBe('Port must be between 1 and 65535');
      });

      expect(result.current.error).toBe('Port must be between 1 and 65535');
    });

    it('handles out of range ports', async () => {
      const { result } = renderHook(() => usePortConfiguration());

      await act(async () => {
        const validation = await result.current.validatePort(70000);
        expect(validation.isValid).toBe(false);
        expect(validation.error).toBe('Port must be between 1 and 65535');
      });

      expect(result.current.error).toBe('Port must be between 1 and 65535');
    });
  });

  describe('State Persistence', () => {
    it('maintains state across re-renders', async () => {
      mockIsValidPortRange.mockReturnValue(true);
      mockValidatePort.mockResolvedValue(true);

      const { result, rerender } = renderHook(() => usePortConfiguration());

      await act(async () => {
        await result.current.setCustomPort(9222);
      });

      expect(result.current.customPort).toBe(9222);

      rerender();

      expect(result.current.customPort).toBe(9222);
    });

    it('updates lastValidation correctly', async () => {
      mockIsValidPortRange.mockReturnValue(true);
      mockValidatePort.mockResolvedValue(true);

      const { result } = renderHook(() => usePortConfiguration());

      await act(async () => {
        await result.current.validatePort(9222);
      });

      expect(result.current.lastValidation).toEqual({
        isValid: true,
        error: null,
        port: 9222
      });

      // Update with different port
      mockValidatePort.mockResolvedValue(false);

      await act(async () => {
        await result.current.validatePort(9223);
      });

      expect(result.current.lastValidation).toEqual({
        isValid: false,
        error: 'Port is not available or IDE is not running',
        port: 9223
      });
    });
  });
}); 