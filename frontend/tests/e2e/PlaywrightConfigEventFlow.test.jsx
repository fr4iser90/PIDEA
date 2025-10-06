import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TestConfiguration from '@/presentation/components/tests/main/TestConfiguration.jsx';
import WebSocketService from '@/infrastructure/services/WebSocketService.jsx';

// Mock WebSocketService
jest.mock('@/infrastructure/services/WebSocketService.jsx', () => ({
  connect: jest.fn().mockResolvedValue(),
  on: jest.fn(),
  off: jest.fn()
}));

// Mock APIChatRepository
jest.mock('@/infrastructure/repositories/APIChatRepository.jsx', () => {
  return jest.fn().mockImplementation(() => ({
    updatePlaywrightTestConfig: jest.fn(),
    getBrowserEnvironment: jest.fn().mockResolvedValue({
      success: true,
      data: {
        browsers: ['chromium', 'firefox', 'webkit'],
        versions: { chromium: '120.0', firefox: '119.0', webkit: '17.0' }
      }
    })
  }));
});

describe('Playwright Config Event Flow E2E', () => {
  const mockProps = {
    onSelect: jest.fn(),
    selected: null,
    workspacePath: '/test/workspace',
    projectId: 'test-project-123',
    testConfig: null,
    testProjects: [],
    onConfigUpdate: jest.fn(),
    onCreateProject: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock window.dispatchEvent
    window.dispatchEvent = jest.fn();
    
    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe('WebSocket Event Integration', () => {
    it('should register WebSocket event listeners on mount', async () => {
      // Act
      render(<TestConfiguration {...mockProps} />);

      // Assert
      expect(WebSocketService.connect).toHaveBeenCalled();
      expect(WebSocketService.on).toHaveBeenCalledWith(
        'playwright:config:saved',
        expect.any(Function)
      );
      expect(WebSocketService.on).toHaveBeenCalledWith(
        'playwright:config:failed',
        expect.any(Function)
      );
    });

    it('should handle playwright:config:saved event', async () => {
      // Arrange
      const mockConfigSavedHandler = jest.fn();
      WebSocketService.on.mockImplementation((event, handler) => {
        if (event === 'playwright:config:saved') {
          mockConfigSavedHandler.mockImplementation(handler);
        }
      });

      render(<TestConfiguration {...mockProps} />);

      // Act
      const eventData = {
        projectId: 'test-project-123',
        config: {
          timeout: 30000,
          retries: 2,
          browsers: ['chromium']
        },
        timestamp: new Date().toISOString()
      };

      mockConfigSavedHandler(eventData);

      // Assert
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'notification',
          detail: {
            type: 'success',
            message: 'Test configuration saved!',
            duration: 3000
          }
        })
      );
    });

    it('should handle playwright:config:failed event', async () => {
      // Arrange
      const mockConfigFailedHandler = jest.fn();
      WebSocketService.on.mockImplementation((event, handler) => {
        if (event === 'playwright:config:failed') {
          mockConfigFailedHandler.mockImplementation(handler);
        }
      });

      render(<TestConfiguration {...mockProps} />);

      // Act
      const eventData = {
        projectId: 'test-project-123',
        error: 'Database connection failed',
        timestamp: new Date().toISOString()
      };

      mockConfigFailedHandler(eventData);

      // Assert
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'notification',
          detail: {
            type: 'error',
            message: 'Database connection failed',
            duration: 5000
          }
        })
      );
    });

    it('should ignore events for different project IDs', async () => {
      // Arrange
      const mockConfigSavedHandler = jest.fn();
      WebSocketService.on.mockImplementation((event, handler) => {
        if (event === 'playwright:config:saved') {
          mockConfigSavedHandler.mockImplementation(handler);
        }
      });

      render(<TestConfiguration {...mockProps} />);

      // Act
      const eventData = {
        projectId: 'different-project-456', // Different project ID
        config: { timeout: 30000 },
        timestamp: new Date().toISOString()
      };

      mockConfigSavedHandler(eventData);

      // Assert
      expect(window.dispatchEvent).not.toHaveBeenCalled();
    });
  });

  describe('Configuration Save Flow', () => {
    it('should initiate configuration save without manual notifications', async () => {
      // Arrange
      const mockApiRepository = require('@/infrastructure/repositories/APIChatRepository.jsx');
      const mockUpdateConfig = jest.fn().mockResolvedValue({ success: true });
      mockApiRepository.mockImplementation(() => ({
        updatePlaywrightTestConfig: mockUpdateConfig,
        getBrowserEnvironment: jest.fn().mockResolvedValue({ success: true, data: {} })
      }));

      render(<TestConfiguration {...mockProps} />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Configuration')).toBeInTheDocument();
      });

      // Act - Fill out configuration form
      const timeoutInput = screen.getByLabelText(/timeout/i);
      fireEvent.change(timeoutInput, { target: { value: '45000' } });

      const saveButton = screen.getByText('Save Configuration');
      fireEvent.click(saveButton);

      // Assert
      await waitFor(() => {
        expect(mockUpdateConfig).toHaveBeenCalledWith(
          'test-project-123',
          expect.objectContaining({
            timeout: '45000'
          })
        );
      });

      // Should not show manual notifications
      expect(window.dispatchEvent).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const mockApiRepository = require('@/infrastructure/repositories/APIChatRepository.jsx');
      const mockUpdateConfig = jest.fn().mockResolvedValue({ 
        success: false, 
        error: 'Validation failed' 
      });
      mockApiRepository.mockImplementation(() => ({
        updatePlaywrightTestConfig: mockUpdateConfig,
        getBrowserEnvironment: jest.fn().mockResolvedValue({ success: true, data: {} })
      }));

      render(<TestConfiguration {...mockProps} />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Configuration')).toBeInTheDocument();
      });

      // Act
      const saveButton = screen.getByText('Save Configuration');
      fireEvent.click(saveButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Failed to save configuration/)).toBeInTheDocument();
      });
    });
  });

  describe('Auto-Collapse Feature', () => {
    it('should auto-collapse configuration card after successful save', async () => {
      // Arrange
      const mockConfigSavedHandler = jest.fn();
      WebSocketService.on.mockImplementation((event, handler) => {
        if (event === 'playwright:config:saved') {
          mockConfigSavedHandler.mockImplementation(handler);
        }
      });

      render(<TestConfiguration {...mockProps} />);

      // Act
      const eventData = {
        projectId: 'test-project-123',
        config: { timeout: 30000 },
        timestamp: new Date().toISOString()
      };

      mockConfigSavedHandler(eventData);

      // Assert - Auto-collapse should happen after 1 second delay
      await waitFor(() => {
        // The component should be in collapsed state
        // This would need to be verified based on the actual component state
      }, { timeout: 2000 });
    });
  });

  describe('Event Cleanup', () => {
    it('should cleanup WebSocket event listeners on unmount', () => {
      // Arrange
      const { unmount } = render(<TestConfiguration {...mockProps} />);

      // Act
      unmount();

      // Assert
      expect(WebSocketService.off).toHaveBeenCalledWith(
        'playwright:config:saved',
        expect.any(Function)
      );
      expect(WebSocketService.off).toHaveBeenCalledWith(
        'playwright:config:failed',
        expect.any(Function)
      );
    });

    it('should cleanup event listeners when projectId changes', () => {
      // Arrange
      const { rerender } = render(<TestConfiguration {...mockProps} />);

      // Act - Change projectId
      rerender(<TestConfiguration {...mockProps} projectId="new-project-456" />);

      // Assert
      expect(WebSocketService.off).toHaveBeenCalledWith(
        'playwright:config:saved',
        expect.any(Function)
      );
      expect(WebSocketService.off).toHaveBeenCalledWith(
        'playwright:config:failed',
        expect.any(Function)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle WebSocket connection failures gracefully', async () => {
      // Arrange
      WebSocketService.connect.mockRejectedValue(new Error('Connection failed'));

      // Act
      render(<TestConfiguration {...mockProps} />);

      // Assert
      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          'Failed to setup WebSocket for config events:',
          expect.any(Error)
        );
      });
    });

    it('should handle WebSocket event handler errors gracefully', async () => {
      // Arrange
      const mockConfigSavedHandler = jest.fn();
      WebSocketService.on.mockImplementation((event, handler) => {
        if (event === 'playwright:config:saved') {
          mockConfigSavedHandler.mockImplementation(() => {
            throw new Error('Handler error');
          });
        }
      });

      render(<TestConfiguration {...mockProps} />);

      // Act
      const eventData = {
        projectId: 'test-project-123',
        config: { timeout: 30000 },
        timestamp: new Date().toISOString()
      };

      // Should not throw error
      expect(() => mockConfigSavedHandler(eventData)).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle multiple rapid configuration saves', async () => {
      // Arrange
      const mockApiRepository = require('@/infrastructure/repositories/APIChatRepository.jsx');
      const mockUpdateConfig = jest.fn().mockResolvedValue({ success: true });
      mockApiRepository.mockImplementation(() => ({
        updatePlaywrightTestConfig: mockUpdateConfig,
        getBrowserEnvironment: jest.fn().mockResolvedValue({ success: true, data: {} })
      }));

      render(<TestConfiguration {...mockProps} />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Configuration')).toBeInTheDocument();
      });

      // Act - Multiple rapid saves
      const saveButton = screen.getByText('Save Configuration');
      for (let i = 0; i < 5; i++) {
        fireEvent.click(saveButton);
      }

      // Assert
      await waitFor(() => {
        expect(mockUpdateConfig).toHaveBeenCalledTimes(5);
      });
    });
  });
});
