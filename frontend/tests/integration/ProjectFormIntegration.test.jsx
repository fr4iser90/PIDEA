/**
 * Project Form Integration Test Suite
 * 
 * Integration tests for the complete IDE selection flow
 * from button click to form auto-fill.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '@/App.jsx';
import ProjectRepository from '@/infrastructure/repositories/ProjectRepository.jsx';

// Mock the ProjectRepository
jest.mock('@/infrastructure/repositories/ProjectRepository.jsx', () => {
  return jest.fn().mockImplementation(() => ({
    getAvailableIDEs: jest.fn(),
    detectProjects: jest.fn()
  }));
});

// Mock other dependencies
jest.mock('@/infrastructure/logging/Logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('@/infrastructure/stores/AuthStore.jsx', () => ({
  __esModule: true,
  default: () => ({
    isAuthenticated: true,
    extendSession: jest.fn(),
    logout: jest.fn()
  })
}));

jest.mock('@/infrastructure/stores/IDEStore.jsx', () => ({
  __esModule: true,
  default: () => ({
    activePort: null,
    availableIDEs: [],
    isLoading: false,
    error: null,
    setActivePort: jest.fn(),
    refreshIDEs: jest.fn()
  })
}));

// Mock other components to focus on the integration
jest.mock('@/presentation/components/chat/main/ChatComponent.jsx', () => () => <div>Chat Component</div>);
jest.mock('@/presentation/components/SidebarLeft.jsx', () => () => <div>Sidebar Left</div>);
jest.mock('@/presentation/components/SidebarRight.jsx', () => () => <div>Sidebar Right</div>);
jest.mock('@/presentation/components/Header.jsx', () => () => <div>Header</div>);
jest.mock('@/presentation/components/Footer.jsx', () => () => <div>Footer</div>);

describe('Project Form IDE Selection Integration', () => {
  let mockProjectRepository;

  beforeEach(() => {
    mockProjectRepository = new ProjectRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete IDE Selection Flow', () => {
    it('should open IDE selection modal when detect button is clicked', async () => {
      const mockIDEs = [
        {
          port: 9222,
          type: 'cursor',
          name: 'Cursor IDE',
          workspacePath: '/home/user/test-project',
          status: 'active',
          version: '1.5.7'
        }
      ];

      mockProjectRepository.getAvailableIDEs.mockResolvedValue({
        data: mockIDEs
      });

      render(<App />);

      // Open project add modal
      const addProjectButton = screen.getByText(/add project/i);
      fireEvent.click(addProjectButton);

      // Click detect from IDE button
      const detectButton = screen.getByText('🔍 Detect from IDE');
      fireEvent.click(detectButton);

      // Verify IDE selection modal opens
      await waitFor(() => {
        expect(screen.getByText('Select IDE for Project')).toBeInTheDocument();
        expect(screen.getByText('Cursor IDE')).toBeInTheDocument();
      });
    });

    it('should auto-fill form when IDE is selected', async () => {
      const mockIDEs = [
        {
          port: 9222,
          type: 'cursor',
          name: 'Cursor IDE',
          workspacePath: '/home/user/test-project',
          status: 'active',
          version: '1.5.7'
        }
      ];

      mockProjectRepository.getAvailableIDEs.mockResolvedValue({
        data: mockIDEs
      });

      render(<App />);

      // Open project add modal
      const addProjectButton = screen.getByText(/add project/i);
      fireEvent.click(addProjectButton);

      // Click detect from IDE button
      const detectButton = screen.getByText('🔍 Detect from IDE');
      fireEvent.click(detectButton);

      // Wait for modal to open and select IDE
      await waitFor(() => {
        const cursorIDE = screen.getByText('Cursor IDE').closest('.ide-item');
        fireEvent.click(cursorIDE);
      });

      // Confirm selection
      const confirmButton = screen.getByText('Select IDE');
      fireEvent.click(confirmButton);

      // Verify form is auto-filled
      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('test-project');
        const workspaceInput = screen.getByDisplayValue('/home/user/test-project');
        
        expect(nameInput).toBeInTheDocument();
        expect(workspaceInput).toBeInTheDocument();
      });
    });

    it('should handle no IDEs found scenario', async () => {
      mockProjectRepository.getAvailableIDEs.mockResolvedValue({
        data: []
      });

      render(<App />);

      // Open project add modal
      const addProjectButton = screen.getByText(/add project/i);
      fireEvent.click(addProjectButton);

      // Click detect from IDE button
      const detectButton = screen.getByText('🔍 Detect from IDE');
      fireEvent.click(detectButton);

      // Verify empty state is shown
      await waitFor(() => {
        expect(screen.getByText('No IDEs with workspace paths found.')).toBeInTheDocument();
        expect(screen.getByText('Please open an IDE with a project workspace and try again.')).toBeInTheDocument();
      });
    });

    it('should handle API error scenario', async () => {
      mockProjectRepository.getAvailableIDEs.mockResolvedValue({
       
        error: 'Failed to connect to IDE service'
      });

      render(<App />);

      // Open project add modal
      const addProjectButton = screen.getByText(/add project/i);
      fireEvent.click(addProjectButton);

      // Click detect from IDE button
      const detectButton = screen.getByText('🔍 Detect from IDE');
      fireEvent.click(detectButton);

      // Verify error state is shown
      await waitFor(() => {
        expect(screen.getByText('❌ Failed to connect to IDE service')).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      const mockIDEs = [
        {
          port: 9222,
          type: 'cursor',
          name: 'Cursor IDE',
          workspacePath: '/home/user/test-project',
          status: 'active',
          version: '1.5.7'
        }
      ];

      mockProjectRepository.getAvailableIDEs
        .mockResolvedValueOnce({
         
          error: 'Network error'
        })
        .mockResolvedValueOnce({
          data: mockIDEs
        });

      render(<App />);

      // Open project add modal
      const addProjectButton = screen.getByText(/add project/i);
      fireEvent.click(addProjectButton);

      // Click detect from IDE button
      const detectButton = screen.getByText('🔍 Detect from IDE');
      fireEvent.click(detectButton);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('❌ Network error')).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      // Verify IDEs are loaded after retry
      await waitFor(() => {
        expect(screen.getByText('Cursor IDE')).toBeInTheDocument();
      });
    });
  });

  describe('Form State Management', () => {
    it('should maintain form state when modal is closed without selection', async () => {
      const mockIDEs = [
        {
          port: 9222,
          type: 'cursor',
          name: 'Cursor IDE',
          workspacePath: '/home/user/test-project',
          status: 'active',
          version: '1.5.7'
        }
      ];

      mockProjectRepository.getAvailableIDEs.mockResolvedValue({
        data: mockIDEs
      });

      render(<App />);

      // Open project add modal
      const addProjectButton = screen.getByText(/add project/i);
      fireEvent.click(addProjectButton);

      // Fill some form data
      const nameInput = screen.getByPlaceholderText('Enter project name');
      fireEvent.change(nameInput, { target: { value: 'My Project' } });

      // Click detect from IDE button
      const detectButton = screen.getByText('🔍 Detect from IDE');
      fireEvent.click(detectButton);

      // Close modal without selecting
      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);
      });

      // Verify form data is preserved
      expect(screen.getByDisplayValue('My Project')).toBeInTheDocument();
    });

    it('should update form state when IDE is selected', async () => {
      const mockIDEs = [
        {
          port: 9222,
          type: 'cursor',
          name: 'Cursor IDE',
          workspacePath: '/home/user/test-project',
          status: 'active',
          version: '1.5.7'
        }
      ];

      mockProjectRepository.getAvailableIDEs.mockResolvedValue({
        data: mockIDEs
      });

      render(<App />);

      // Open project add modal
      const addProjectButton = screen.getByText(/add project/i);
      fireEvent.click(addProjectButton);

      // Click detect from IDE button
      const detectButton = screen.getByText('🔍 Detect from IDE');
      fireEvent.click(detectButton);

      // Select IDE
      await waitFor(() => {
        const cursorIDE = screen.getByText('Cursor IDE').closest('.ide-item');
        fireEvent.click(cursorIDE);
      });

      const confirmButton = screen.getByText('Select IDE');
      fireEvent.click(confirmButton);

      // Verify form is updated
      await waitFor(() => {
        expect(screen.getByDisplayValue('test-project')).toBeInTheDocument();
        expect(screen.getByDisplayValue('/home/user/test-project')).toBeInTheDocument();
      });
    });
  });
});
