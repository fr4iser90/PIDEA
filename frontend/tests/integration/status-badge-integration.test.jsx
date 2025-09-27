/**
 * Status Badge Integration Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import Header from '@/presentation/components/Header.jsx';
import SidebarLeft from '@/presentation/components/SidebarLeft.jsx';
import StatusBadge from '@/presentation/components/ide/StatusBadge.jsx';
import IDEStartModal from '@/presentation/components/ide/IDEStartModal.jsx';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';

// Mock dependencies
jest.mock('@/infrastructure/stores/IDEStore.jsx', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('@/infrastructure/repositories/APIChatRepository.jsx', () => ({
  apiCall: jest.fn()
}));

jest.mock('@/infrastructure/logging/Logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock event bus
const createMockEventBus = () => ({
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn()
});

describe('Status Badge Integration Tests', () => {
  const mockUseIDEStore = useIDEStore as jest.MockedFunction<typeof useIDEStore>;
  const mockApiCall = apiCall as jest.MockedFunction<typeof apiCall>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseIDEStore.mockReturnValue({
      activePort: 9222,
      availableIDEs: [
        {
          port: 9222,
          status: 'running',
          ideType: 'cursor',
          workspacePath: '/test/workspace',
          metadata: { displayName: 'Cursor' }
        }
      ],
      isLoading: false,
      error: null,
      refresh: jest.fn()
    });
    
    mockApiCall.mockResolvedValue({
      success: true,
      data: { ides: [] }
    });
  });

  describe('Header Integration', () => {
    it('renders StatusBadge in Header', () => {
      const mockEventBus = createMockEventBus();
      
      render(
        <BrowserRouter>
          <Header
            eventBus={mockEventBus}
            currentView="chat"
            onNavigationClick={jest.fn()}
            onLeftSidebarToggle={jest.fn()}
            onRightSidebarToggle={jest.fn()}
          />
        </BrowserRouter>
      );
      
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('🟢')).toBeInTheDocument();
    });

    it('updates status when IDE changes', () => {
      const mockEventBus = createMockEventBus();
      const { rerender } = render(
        <BrowserRouter>
          <Header
            eventBus={mockEventBus}
            currentView="chat"
            onNavigationClick={jest.fn()}
            onLeftSidebarToggle={jest.fn()}
            onRightSidebarToggle={jest.fn()}
          />
        </BrowserRouter>
      );
      
      // Initial state
      expect(screen.getByText('Running')).toBeInTheDocument();
      
      // Change IDE status
      mockUseIDEStore.mockReturnValue({
        activePort: 9222,
        availableIDEs: [
          {
            port: 9222,
            status: 'starting',
            ideType: 'cursor',
            workspacePath: '/test/workspace',
            metadata: { displayName: 'Cursor' }
          }
        ],
        isLoading: false,
        error: null,
        refresh: jest.fn()
      });
      
      rerender(
        <BrowserRouter>
          <Header
            eventBus={mockEventBus}
            currentView="chat"
            onNavigationClick={jest.fn()}
            onLeftSidebarToggle={jest.fn()}
            onRightSidebarToggle={jest.fn()}
          />
        </BrowserRouter>
      );
      
      expect(screen.getByText('Starting')).toBeInTheDocument();
      expect(screen.getByText('🟡')).toBeInTheDocument();
    });
  });

  describe('SidebarLeft Integration', () => {
    it('opens IDEStartModal when new IDE button is clicked', () => {
      const mockEventBus = createMockEventBus();
      
      render(
        <SidebarLeft
          eventBus={mockEventBus}
          activePort={9222}
          onActivePortChange={jest.fn()}
          mode="chat"
        />
      );
      
      const newIDEButton = screen.getByTitle('Neue IDE starten');
      fireEvent.click(newIDEButton);
      
      expect(screen.getByText('Start New IDE')).toBeInTheDocument();
    });

    it('closes IDEStartModal when IDE is started successfully', async () => {
      const mockEventBus = createMockEventBus();
      const mockOnActivePortChange = jest.fn();
      
      mockApiCall.mockImplementation((url) => {
        if (url === '/api/ide/start') {
          return Promise.resolve({
            success: true,
            data: { port: 9223, ideType: 'cursor' }
          });
        }
        return Promise.resolve({ success: true, data: {} });
      });
      
      render(
        <SidebarLeft
          eventBus={mockEventBus}
          activePort={9222}
          onActivePortChange={mockOnActivePortChange}
          mode="chat"
        />
      );
      
      // Open modal
      const newIDEButton = screen.getByTitle('Neue IDE starten');
      fireEvent.click(newIDEButton);
      
      // Start IDE
      const startButton = screen.getByText('Start IDE');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Start New IDE')).not.toBeInTheDocument();
      });
      
      expect(mockOnActivePortChange).toHaveBeenCalledWith(9223);
    });
  });

  describe('Full Workflow Integration', () => {
    it('completes full IDE start workflow', async () => {
      const mockEventBus = createMockEventBus();
      const mockOnActivePortChange = jest.fn();
      
      // Mock successful API responses
      mockApiCall.mockImplementation((url) => {
        if (url === '/api/ide/start') {
          return Promise.resolve({
            success: true,
            data: { port: 9223, ideType: 'vscode' }
          });
        }
        if (url === '/api/ide/detect-workspace-paths') {
          return Promise.resolve({
            success: true,
            data: { paths: ['/test/workspace1', '/test/workspace2'] }
          });
        }
        return Promise.resolve({ success: true, data: {} });
      });
      
      render(
        <BrowserRouter>
          <div>
            <Header
              eventBus={mockEventBus}
              currentView="chat"
              onNavigationClick={jest.fn()}
              onLeftSidebarToggle={jest.fn()}
              onRightSidebarToggle={jest.fn()}
            />
            <SidebarLeft
              eventBus={mockEventBus}
              activePort={9222}
              onActivePortChange={mockOnActivePortChange}
              mode="chat"
            />
          </div>
        </BrowserRouter>
      );
      
      // Initial state - should show running IDE
      expect(screen.getByText('Running')).toBeInTheDocument();
      
      // Open IDE start modal
      const newIDEButton = screen.getByTitle('Neue IDE starten');
      fireEvent.click(newIDEButton);
      
      // Select VS Code
      const vscodeOption = screen.getByText('VS Code');
      fireEvent.click(vscodeOption);
      
      // Select workspace
      await waitFor(() => {
        const workspaceSelect = screen.getByDisplayValue('Select workspace (optional)');
        fireEvent.change(workspaceSelect, { target: { value: '/test/workspace1' } });
      });
      
      // Start IDE
      const startButton = screen.getByText('Start IDE');
      fireEvent.click(startButton);
      
      // Wait for modal to close and new IDE to be active
      await waitFor(() => {
        expect(screen.queryByText('Start New IDE')).not.toBeInTheDocument();
      });
      
      expect(mockOnActivePortChange).toHaveBeenCalledWith(9223);
    });

    it('handles IDE start failure gracefully', async () => {
      const mockEventBus = createMockEventBus();
      
      // Mock API failure
      mockApiCall.mockImplementation((url) => {
        if (url === '/api/ide/start') {
          return Promise.resolve({
            success: false,
            error: 'Failed to start IDE'
          });
        }
        return Promise.resolve({ success: true, data: {} });
      });
      
      render(
        <SidebarLeft
          eventBus={mockEventBus}
          activePort={9222}
          onActivePortChange={jest.fn()}
          mode="chat"
        />
      );
      
      // Open modal
      const newIDEButton = screen.getByTitle('Neue IDE starten');
      fireEvent.click(newIDEButton);
      
      // Start IDE
      const startButton = screen.getByText('Start IDE');
      fireEvent.click(startButton);
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to start IDE')).toBeInTheDocument();
      });
      
      // Modal should still be open
      expect(screen.getByText('Start New IDE')).toBeInTheDocument();
    });
  });

  describe('Status Badge Interaction', () => {
    it('refreshes status when clicked', async () => {
      const mockRefresh = jest.fn();
      mockUseIDEStore.mockReturnValue({
        activePort: 9222,
        availableIDEs: [
          {
            port: 9222,
            status: 'running',
            ideType: 'cursor',
            workspacePath: '/test/workspace',
            metadata: { displayName: 'Cursor' }
          }
        ],
        isLoading: false,
        error: null,
        refresh: mockRefresh
      });
      
      render(<StatusBadge />);
      
      const statusBadge = screen.getByText('Running').closest('.status-badge');
      fireEvent.click(statusBadge!);
      
      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('shows detailed popup on hover', () => {
      render(<StatusBadge />);
      
      const statusBadge = screen.getByText('Running').closest('.status-badge');
      fireEvent.mouseEnter(statusBadge!);
      
      expect(screen.getByText('IDE Status')).toBeInTheDocument();
      expect(screen.getByText('Cursor')).toBeInTheDocument();
      expect(screen.getByText('9222')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      const mockEventBus = createMockEventBus();
      
      // Mock network error
      mockApiCall.mockRejectedValue(new Error('Network Error'));
      
      render(
        <SidebarLeft
          eventBus={mockEventBus}
          activePort={9222}
          onActivePortChange={jest.fn()}
          mode="chat"
        />
      );
      
      // Open modal
      const newIDEButton = screen.getByTitle('Neue IDE starten');
      fireEvent.click(newIDEButton);
      
      // Start IDE
      const startButton = screen.getByText('Start IDE');
      fireEvent.click(startButton);
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Network Error')).toBeInTheDocument();
      });
    });

    it('handles missing IDE data gracefully', () => {
      mockUseIDEStore.mockReturnValue({
        activePort: null,
        availableIDEs: [],
        isLoading: false,
        error: null,
        refresh: jest.fn()
      });
      
      render(<StatusBadge />);
      
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });
  });
});
