import { renderHook, act, waitFor } from '@testing-library/react';
import { usePortConfiguration } from '../../frontend/src/hooks/usePortConfiguration.js';

// Mock the IDEStore
jest.mock('../../frontend/src/infrastructure/stores/IDEStore.jsx', () => ({
  __esModule: true,
  default: () => ({
    validatePort: jest.fn(),
    isValidPortRange: jest.fn(),
    portPreferences: [],
    setActivePort: jest.fn(),
    clearError: jest.fn()
  })
}));

// Mock the logger
jest.mock('../../frontend/src/infrastructure/logging/Logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

describe('usePortConfiguration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  test('initializes with default state', () => {
    const { result } = renderHook(() => usePortConfiguration());

    expect(result.current.customPort).toBe(null);
    expect(result.current.isValidating).toBe(false);
    expect(result.current.validationError).toBe(null);
    expect(result.current.isInitialized).toBe(true);
  });

  test('loads custom port from localStorage on initialization', () => {
    localStorageMock.getItem.mockReturnValue('9222');
    
    const { result } = renderHook(() => usePortConfiguration());

    expect(result.current.customPort).toBe(9222);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('custom-port');
  });

  test('clears invalid saved port from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('9999'); // Invalid port
    
    const { result } = renderHook(() => usePortConfiguration());

    expect(result.current.customPort).toBe(null);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('custom-port');
  });

  test('sets custom port successfully', async () => {
    const mockValidatePort = jest.fn().mockResolvedValue(true);
    const mockIsValidPortRange = jest.fn().mockReturnValue(true);
    
    jest.doMock('../../frontend/src/infrastructure/stores/IDEStore.jsx', () => ({
      __esModule: true,
      default: () => ({
        validatePort: mockValidatePort,
        isValidPortRange: mockIsValidPortRange,
        portPreferences: [],
        setActivePort: jest.fn(),
        clearError: jest.fn()
      })
    }));

    const { result } = renderHook(() => usePortConfiguration());

    await act(async () => {
      const setResult = await result.current.setCustomPort(9222);
      expect(setResult.success).toBe(true);
    });

    expect(result.current.customPort).toBe(9222);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('custom-port', '9222');
  });

  test('fails to set port when validation fails', async () => {
    const mockValidatePort = jest.fn().mockResolvedValue(false);
    const mockIsValidPortRange = jest.fn().mockReturnValue(true);
    
    jest.doMock('../../frontend/src/infrastructure/stores/IDEStore.jsx', () => ({
      __esModule: true,
      default: () => ({
        validatePort: mockValidatePort,
        isValidPortRange: mockIsValidPortRange,
        portPreferences: [],
        setActivePort: jest.fn(),
        clearError: jest.fn()
      })
    }));

    const { result } = renderHook(() => usePortConfiguration());

    await act(async () => {
      const setResult = await result.current.setCustomPort(9222);
      expect(setResult.success).toBe(false);
      expect(setResult.error).toBe('Port is not available or IDE is not running');
    });

    expect(result.current.customPort).toBe(null);
    expect(result.current.validationError).toBe('Port is not available or IDE is not running');
  });

  test('fails to set port when range validation fails', async () => {
    const mockIsValidPortRange = jest.fn().mockReturnValue(false);
    
    jest.doMock('../../frontend/src/infrastructure/stores/IDEStore.jsx', () => ({
      __esModule: true,
      default: () => ({
        validatePort: jest.fn(),
        isValidPortRange: mockIsValidPortRange,
        portPreferences: [],
        setActivePort: jest.fn(),
        clearError: jest.fn()
      })
    }));

    const { result } = renderHook(() => usePortConfiguration());

    await act(async () => {
      const setResult = await result.current.setCustomPort(9999);
      expect(setResult.success).toBe(false);
      expect(setResult.error).toBe('Port must be between 9222 and 9251');
    });

    expect(result.current.customPort).toBe(null);
    expect(result.current.validationError).toBe('Port must be between 9222 and 9251');
  });

  test('validates port successfully', async () => {
    const mockValidatePort = jest.fn().mockResolvedValue(true);
    const mockIsValidPortRange = jest.fn().mockReturnValue(true);
    
    jest.doMock('../../frontend/src/infrastructure/stores/IDEStore.jsx', () => ({
      __esModule: true,
      default: () => ({
        validatePort: mockValidatePort,
        isValidPortRange: mockIsValidPortRange,
        portPreferences: [],
        setActivePort: jest.fn(),
        clearError: jest.fn()
      })
    }));

    const { result } = renderHook(() => usePortConfiguration());

    await act(async () => {
      const validationResult = await result.current.validatePort(9222);
      expect(validationResult.valid).toBe(true);
    });

    expect(mockValidatePort).toHaveBeenCalledWith(9222);
  });

  test('fails port validation when range check fails', async () => {
    const mockIsValidPortRange = jest.fn().mockReturnValue(false);
    
    jest.doMock('../../frontend/src/infrastructure/stores/IDEStore.jsx', () => ({
      __esModule: true,
      default: () => ({
        validatePort: jest.fn(),
        isValidPortRange: mockIsValidPortRange,
        portPreferences: [],
        setActivePort: jest.fn(),
        clearError: jest.fn()
      })
    }));

    const { result } = renderHook(() => usePortConfiguration());

    await act(async () => {
      const validationResult = await result.current.validatePort(9999);
      expect(validationResult.valid).toBe(false);
      expect(validationResult.error).toBe('Port must be between 9222 and 9251');
    });
  });

  test('clears custom port', () => {
    const { result } = renderHook(() => usePortConfiguration());

    act(() => {
      result.current.clearCustomPort();
    });

    expect(result.current.customPort).toBe(null);
    expect(result.current.validationError).toBe(null);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('custom-port');
  });

  test('gets effective port', () => {
    const { result } = renderHook(() => usePortConfiguration());

    // Initially no custom port
    expect(result.current.getEffectivePort()).toBe(null);

    // Set custom port
    act(() => {
      result.current.customPort = 9222;
    });

    expect(result.current.getEffectivePort()).toBe(9222);
  });

  test('checks if port is valid', () => {
    const mockIsValidPortRange = jest.fn().mockReturnValue(true);
    
    jest.doMock('../../frontend/src/infrastructure/stores/IDEStore.jsx', () => ({
      __esModule: true,
      default: () => ({
        validatePort: jest.fn(),
        isValidPortRange: mockIsValidPortRange,
        portPreferences: [],
        setActivePort: jest.fn(),
        clearError: jest.fn()
      })
    }));

    const { result } = renderHook(() => usePortConfiguration());

    expect(result.current.isValidPort(9222)).toBe(true);
    expect(mockIsValidPortRange).toHaveBeenCalledWith(9222);
  });

  test('handles validation errors gracefully', async () => {
    const mockValidatePort = jest.fn().mockRejectedValue(new Error('Network error'));
    
    jest.doMock('../../frontend/src/infrastructure/stores/IDEStore.jsx', () => ({
      __esModule: true,
      default: () => ({
        validatePort: mockValidatePort,
        isValidPortRange: jest.fn().mockReturnValue(true),
        portPreferences: [],
        setActivePort: jest.fn(),
        clearError: jest.fn()
      })
    }));

    const { result } = renderHook(() => usePortConfiguration());

    await act(async () => {
      const setResult = await result.current.setCustomPort(9222);
      expect(setResult.success).toBe(false);
      expect(setResult.error).toBe('Failed to set custom port');
    });
  });

  test('clears error when clearError is called', () => {
    const { result } = renderHook(() => usePortConfiguration());

    // Set an error
    act(() => {
      result.current.validationError = 'Test error';
    });

    expect(result.current.validationError).toBe('Test error');

    // Clear the error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.validationError).toBe(null);
  });

  test('handles localStorage errors gracefully', () => {
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('Storage error');
    });

    const { result } = renderHook(() => usePortConfiguration());

    // Should not crash when localStorage fails
    expect(() => {
      result.current;
    }).not.toThrow();
  });
}); 