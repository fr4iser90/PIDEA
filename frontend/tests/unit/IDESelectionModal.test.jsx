/**
 * IDESelectionModal Test Suite
 * 
 * Comprehensive tests for the IDE selection modal component
 * covering all functionality, edge cases, and user interactions.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import IDESelectionModal from '@/presentation/components/project/IDESelectionModal.jsx';
import ProjectRepository from '@/infrastructure/repositories/ProjectRepository.jsx';

// Mock the ProjectRepository
jest.mock('@/infrastructure/repositories/ProjectRepository.jsx', () => {
  return jest.fn().mockImplementation(() => ({
    getAvailableIDEs: jest.fn()
  }));
});

// Mock the logger
jest.mock('@/infrastructure/logging/Logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

describe('IDESelectionModal', () => {
  let mockProjectRepository;
  let mockOnClose;
  let mockOnIDESelected;

  beforeEach(() => {
    mockOnClose = jest.fn();
    mockOnIDESelected = jest.fn();
    mockProjectRepository = new ProjectRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Modal Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <IDESelectionModal
          isOpen={false}
          onClose={mockOnClose}
          onIDESelected={mockOnIDESelected}
        />
      );

      expect(screen.queryByText('Select IDE for Project')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <IDESelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onIDESelected={mockOnIDESelected}
        />
      );

      expect(screen.getByText('Select IDE for Project')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Select IDE')).toBeInTheDocument();
    });

    it('should have proper accessibility attributes', () => {
      render(
        <IDESelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onIDESelected={mockOnIDESelected}
        />
      );

      const closeButton = screen.getByLabelText('Close modal');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('IDE Loading', () => {
    it('should show loading state when loading IDEs', async () => {
      mockProjectRepository.getAvailableIDEs.mockImplementation(
        () => new Promise(() => {}) // Never resolves to keep loading state
      );

      render(
        <IDESelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onIDESelected={mockOnIDESelected}
        />
      );

      expect(screen.getByText('Loading available IDEs...')).toBeInTheDocument();
    });

    it('should load IDEs when modal opens', async () => {
      const mockIDEs = [
        {
          port: 9222,
          type: 'cursor',
          name: 'Cursor IDE',
          workspacePath: '/home/user/project1',
          status: 'active',
          version: '1.5.7'
        }
      ];

      mockProjectRepository.getAvailableIDEs.mockResolvedValue({
        success: true,
        data: mockIDEs
      });

      render(
        <IDESelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onIDESelected={mockOnIDESelected}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cursor IDE')).toBeInTheDocument();
        expect(screen.getByText('/home/user/project1')).toBeInTheDocument();
      });
    });
  });

  describe('IDE Selection', () => {
    const mockIDEs = [
      {
        port: 9222,
        type: 'cursor',
        name: 'Cursor IDE',
        workspacePath: '/home/user/project1',
        status: 'active',
        version: '1.5.7'
      },
      {
        port: 9223,
        type: 'vscode',
        name: 'VS Code',
        workspacePath: '/home/user/project2',
        status: 'running',
        version: '1.85.0'
      }
    ];

    beforeEach(() => {
      mockProjectRepository.getAvailableIDEs.mockResolvedValue({
        success: true,
        data: mockIDEs
      });
    });

    it('should display list of available IDEs', async () => {
      render(
        <IDESelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onIDESelected={mockOnIDESelected}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cursor IDE')).toBeInTheDocument();
        expect(screen.getByText('VS Code')).toBeInTheDocument();
        expect(screen.getByText('/home/user/project1')).toBeInTheDocument();
        expect(screen.getByText('/home/user/project2')).toBeInTheDocument();
      });
    });

    it('should allow IDE selection', async () => {
      render(
        <IDESelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onIDESelected={mockOnIDESelected}
        />
      );

      await waitFor(() => {
        const cursorIDE = screen.getByText('Cursor IDE').closest('.ide-item');
        fireEvent.click(cursorIDE);
      });

      expect(screen.getByText('Select IDE')).not.toBeDisabled();
    });

    it('should call onIDESelected when confirm button is clicked', async () => {
      render(
        <IDESelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onIDESelected={mockOnIDESelected}
        />
      );

      await waitFor(() => {
        const cursorIDE = screen.getByText('Cursor IDE').closest('.ide-item');
        fireEvent.click(cursorIDE);
      });

      const confirmButton = screen.getByText('Select IDE');
      fireEvent.click(confirmButton);

      expect(mockOnIDESelected).toHaveBeenCalledWith(mockIDEs[0]);
    });

    it('should disable confirm button when no IDE is selected', async () => {
      render(
        <IDESelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onIDESelected={mockOnIDESelected}
        />
      );

      await waitFor(() => {
        const confirmButton = screen.getByText('Select IDE');
        expect(confirmButton).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      mockProjectRepository.getAvailableIDEs.mockResolvedValue({
        success: false,
        error: 'API Error'
      });

      render(
        <IDESelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onIDESelected={mockOnIDESelected}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('❌ API Error')).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should display error message when API throws exception', async () => {
      mockProjectRepository.getAvailableIDEs.mockRejectedValue(
        new Error('Network Error')
      );

      render(
        <IDESelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onIDESelected={mockOnIDESelected}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('❌ Failed to load IDEs. Please try again.')).toBeInTheDocument();
      });
    });

    it('should show empty state when no IDEs are found', async () => {
      mockProjectRepository.getAvailableIDEs.mockResolvedValue({
        success: true,
        data: []
      });

      render(
        <IDESelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onIDESelected={mockOnIDESelected}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No IDEs with workspace paths found.')).toBeInTheDocument();
        expect(screen.getByText('Please open an IDE with a project workspace and try again.')).toBeInTheDocument();
      });
    });

    it('should retry loading IDEs when retry button is clicked', async () => {
      mockProjectRepository.getAvailableIDEs
        .mockResolvedValueOnce({
          success: false,
          error: 'API Error'
        })
        .mockResolvedValueOnce({
          success: true,
          data: [{
            port: 9222,
            type: 'cursor',
            name: 'Cursor IDE',
            workspacePath: '/home/user/project1',
            status: 'active',
            version: '1.5.7'
          }]
        });

      render(
        <IDESelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onIDESelected={mockOnIDESelected}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('❌ API Error')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Cursor IDE')).toBeInTheDocument();
      });
    });
  });

  describe('Modal Interactions', () => {
    it('should close modal when close button is clicked', () => {
      render(
        <IDESelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onIDESelected={mockOnIDESelected}
        />
      );

      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal when cancel button is clicked', () => {
      render(
        <IDESelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onIDESelected={mockOnIDESelected}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal when backdrop is clicked', () => {
      render(
        <IDESelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onIDESelected={mockOnIDESelected}
        />
      );

      const backdrop = screen.getByText('Select IDE for Project').closest('.ide-selection-modal-overlay');
      fireEvent.click(backdrop);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close modal when modal content is clicked', () => {
      render(
        <IDESelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onIDESelected={mockOnIDESelected}
        />
      );

      const modalContent = screen.getByText('Select IDE for Project').closest('.ide-selection-modal');
      fireEvent.click(modalContent);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('IDE Status Display', () => {
    it('should display correct status badges', async () => {
      const mockIDEs = [
        {
          port: 9222,
          type: 'cursor',
          name: 'Cursor IDE',
          workspacePath: '/home/user/project1',
          status: 'active',
          version: '1.5.7'
        },
        {
          port: 9223,
          type: 'vscode',
          name: 'VS Code',
          workspacePath: '/home/user/project2',
          status: 'stopped',
          version: '1.85.0'
        }
      ];

      mockProjectRepository.getAvailableIDEs.mockResolvedValue({
        success: true,
        data: mockIDEs
      });

      render(
        <IDESelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onIDESelected={mockOnIDESelected}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('active')).toBeInTheDocument();
        expect(screen.getByText('stopped')).toBeInTheDocument();
      });
    });
  });
});
