import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import PreviewComponent from '@/presentation/components/chat/main/PreviewComponent.jsx';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';

// Mock dependencies
jest.mock('@/infrastructure/stores/IDEStore.jsx');
jest.mock('@/infrastructure/repositories/APIChatRepository.jsx', () => {
  return jest.fn().mockImplementation(() => ({
    getUserAppUrl: jest.fn().mockResolvedValue({
      success: true,
      data: { url: 'http://localhost:3000', port: 3000 }
    }),
    getUserAppUrlForPort: jest.fn().mockResolvedValue({
      success: true,
      data: { url: 'http://localhost:3000', port: 3000 }
    }),
    getProjectCommands: jest.fn().mockResolvedValue({
      success: true,
      data: {
        start_command: 'npm start',
        dev_command: 'npm run dev',
        build_command: 'npm run build',
        test_command: 'npm test'
      }
    }),
    executeProjectCommand: jest.fn().mockResolvedValue({
      success: true,
      data: { status: 'executing' }
    })
  }));
});
jest.mock('@/hooks/usePortConfiguration.js', () => ({
  usePortConfiguration: () => ({
    customPort: 3000,
    setCustomPort: jest.fn(),
    validatePort: jest.fn().mockResolvedValue(true)
  })
}));

// Mock event bus
const mockEventBus = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn()
};

describe('PreviewComponent Integration Tests', () => {
  let mockIDEStore;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock IDEStore
    mockIDEStore = {
      activePort: null,
      customPort: 3000,
      validatePort: jest.fn().mockResolvedValue(true),
      setCustomPort: jest.fn().mockResolvedValue({ success: true }),
      getCustomPort: jest.fn().mockReturnValue(3000),
      clearCustomPort: jest.fn().mockResolvedValue({ success: true })
    };

    useIDEStore.mockReturnValue(mockIDEStore);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Port Configuration Integration', () => {
    it('should show port input when no active port is detected', () => {
      render(
        <PreviewComponent 
          eventBus={mockEventBus} 
          activePort={null} 
          projectId="test-project" 
        />
      );

      // Check if port configuration section is visible
      expect(screen.getByText('Preview')).toBeInTheDocument();
      
      // Port input should be visible when no active port
      const portInput = screen.getByRole('textbox', { name: /port/i });
      expect(portInput).toBeInTheDocument();
    });

    it('should hide port input when active port is available', () => {
      render(
        <PreviewComponent 
          eventBus={mockEventBus} 
          activePort={3000} 
          projectId="test-project" 
        />
      );

      // Port input should not be visible when active port exists
      const portInput = screen.queryByRole('textbox', { name: /port/i });
      expect(portInput).not.toBeInTheDocument();
    });

    it('should handle port change and validation', async () => {
      const { usePortConfiguration } = await import('@/hooks/usePortConfiguration.js');
      const mockSetCustomPort = jest.fn();
      const mockValidatePort = jest.fn().mockResolvedValue(true);
      
      usePortConfiguration.mockReturnValue({
        customPort: 3000,
        setCustomPort: mockSetCustomPort,
        validatePort: mockValidatePort
      });

      render(
        <PreviewComponent 
          eventBus={mockEventBus} 
          activePort={null} 
          projectId="test-project" 
        />
      );

      const portInput = screen.getByRole('textbox', { name: /port/i });
      
      // Change port value
      fireEvent.change(portInput, { target: { value: '3001' } });
      
      await waitFor(() => {
        expect(mockSetCustomPort).toHaveBeenCalledWith('3001');
      });
    });
  });

  describe('Command Execution Integration', () => {
    it('should show command buttons when projectId is provided', () => {
      render(
        <PreviewComponent 
          eventBus={mockEventBus} 
          activePort={3000} 
          projectId="test-project" 
        />
      );

      // Check if command buttons are rendered
      expect(screen.getByText('Preview')).toBeInTheDocument();
      
      // Command buttons should be visible
      const startButton = screen.getByRole('button', { name: /start/i });
      const devButton = screen.getByRole('button', { name: /dev/i });
      
      expect(startButton).toBeInTheDocument();
      expect(devButton).toBeInTheDocument();
    });

    it('should hide command buttons when no projectId is provided', () => {
      render(
        <PreviewComponent 
          eventBus={mockEventBus} 
          activePort={3000} 
          projectId={null} 
        />
      );

      // Command buttons should not be visible
      const startButton = screen.queryByRole('button', { name: /start/i });
      const devButton = screen.queryByRole('button', { name: /dev/i });
      
      expect(startButton).not.toBeInTheDocument();
      expect(devButton).not.toBeInTheDocument();
    });

    it('should execute commands when buttons are clicked', async () => {
      render(
        <PreviewComponent 
          eventBus={mockEventBus} 
          activePort={3000} 
          projectId="test-project" 
        />
      );

      const startButton = screen.getByRole('button', { name: /start/i });
      
      // Click start button
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(mockAPIRepository.executeProjectCommand).toHaveBeenCalledWith(
          'test-project',
          'start',
          expect.any(Object)
        );
      });
    });
  });

  describe('Preview Loading Integration', () => {
    it('should load preview with custom port when no active port', async () => {
      render(
        <PreviewComponent 
          eventBus={mockEventBus} 
          activePort={null} 
          projectId="test-project" 
        />
      );

      await waitFor(() => {
        expect(mockAPIRepository.getUserAppUrlForPort).toHaveBeenCalledWith(3000);
      });
    });

    it('should load preview with active port when available', async () => {
      render(
        <PreviewComponent 
          eventBus={mockEventBus} 
          activePort={3001} 
          projectId="test-project" 
        />
      );

      await waitFor(() => {
        expect(mockAPIRepository.getUserAppUrlForPort).toHaveBeenCalledWith(3001);
      });
    });

    it('should fallback to general URL when port-specific fails', async () => {
      // Mock port-specific call to fail
      mockAPIRepository.getUserAppUrlForPort.mockResolvedValueOnce({
        success: false,
        error: 'Port not found'
      });

      render(
        <PreviewComponent 
          eventBus={mockEventBus} 
          activePort={3000} 
          projectId="test-project" 
        />
      );

      await waitFor(() => {
        expect(mockAPIRepository.getUserAppUrl).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle port validation errors', async () => {
      const { usePortConfiguration } = await import('@/hooks/usePortConfiguration.js');
      const mockValidatePort = jest.fn().mockResolvedValue(false);
      
      usePortConfiguration.mockReturnValue({
        customPort: 3000,
        setCustomPort: jest.fn(),
        validatePort: mockValidatePort
      });

      render(
        <PreviewComponent 
          eventBus={mockEventBus} 
          activePort={null} 
          projectId="test-project" 
        />
      );

      const portInput = screen.getByRole('textbox', { name: /port/i });
      fireEvent.change(portInput, { target: { value: '99999' } });
      
      await waitFor(() => {
        expect(mockValidatePort).toHaveBeenCalledWith('99999');
      });
    });

    it('should handle command execution errors', async () => {
      // Mock command execution to fail
      mockAPIRepository.executeProjectCommand.mockResolvedValueOnce({
        success: false,
        error: 'Command failed'
      });

      render(
        <PreviewComponent 
          eventBus={mockEventBus} 
          activePort={3000} 
          projectId="test-project" 
        />
      );

      const startButton = screen.getByRole('button', { name: /start/i });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(mockAPIRepository.executeProjectCommand).toHaveBeenCalled();
      });
    });
  });

  describe('Event Bus Integration', () => {
    it('should handle IDE change events', async () => {
      render(
        <PreviewComponent 
          eventBus={mockEventBus} 
          activePort={3000} 
          projectId="test-project" 
        />
      );

      // Simulate IDE change event
      const ideChangeHandler = mockEventBus.on.mock.calls.find(
        call => call[0] === 'activeIDEChanged'
      )[1];

      ideChangeHandler({ port: 3001 });
      
      await waitFor(() => {
        expect(mockAPIRepository.getUserAppUrlForPort).toHaveBeenCalledWith(3001);
      });
    });

    it('should handle user app URL events', () => {
      render(
        <PreviewComponent 
          eventBus={mockEventBus} 
          activePort={3000} 
          projectId="test-project" 
        />
      );

      // Simulate user app URL event
      const userAppUrlHandler = mockEventBus.on.mock.calls.find(
        call => call[0] === 'userAppUrl'
      )[1];

      userAppUrlHandler({ url: 'http://localhost:3001', port: 3001 });
      
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });
  });
}); 