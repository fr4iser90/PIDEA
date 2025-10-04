/**
 * Enhanced IDEStartModal Tests
 * Created: 2025-09-29T19:51:09.000Z
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import IDEStartModal from '@/presentation/components/ide/IDEStartModal.jsx';
import IDERequirementService from '@/infrastructure/services/IDERequirementService.jsx';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';

// Mock dependencies
jest.mock('@/infrastructure/services/IDERequirementService.jsx');
jest.mock('@/infrastructure/stores/IDEStore.jsx');
jest.mock('@/infrastructure/repositories/APIChatRepository.jsx', () => ({
  apiCall: jest.fn()
}));

const mockRefresh = jest.fn();
const mockIDERequirementService = {
  getDownloadLinks: jest.fn(),
  getDefaultExecutablePaths: jest.fn(),
  validateExecutablePath: jest.fn()
};

describe('IDEStartModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    useIDEStore.mockReturnValue({
      refresh: mockRefresh
    });

    IDERequirementService.mockImplementation(() => mockIDERequirementService);
  });

  describe('Basic Rendering', () => {
    it('should render modal when open', () => {
      render(
        <IDEStartModal
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      );

      expect(screen.getByText('Start New IDE')).toBeInTheDocument();
      expect(screen.getByText('IDE Configuration')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(
        <IDEStartModal
          isOpen={false}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      );

      expect(screen.queryByText('Start New IDE')).not.toBeInTheDocument();
    });

    it('should show requirement message when showRequirementMessage is true', () => {
      render(
        <IDEStartModal
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
          showRequirementMessage={true}
        />
      );

      expect(screen.getByText('IDE Required')).toBeInTheDocument();
      expect(screen.getByText('No IDE Running')).toBeInTheDocument();
      expect(screen.getByText('You need to start an IDE before you can use PIDEA. Please configure and start an IDE below.')).toBeInTheDocument();
    });
  });

  describe('IDE Type Selection', () => {
    it('should display all IDE types', () => {
      render(
        <IDEStartModal
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      );

      expect(screen.getByText('Cursor')).toBeInTheDocument();
      expect(screen.getByText('VS Code')).toBeInTheDocument();
      expect(screen.getByText('Windsurf')).toBeInTheDocument();
    });

    it('should allow IDE type selection', () => {
      render(
        <IDEStartModal
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      );

      const vscodeOption = screen.getByText('VS Code');
      fireEvent.click(vscodeOption);

      // Check if VS Code is selected (this would depend on the actual implementation)
      expect(vscodeOption.closest('.ide-type-option')).toHaveClass('selected');
    });
  });

  describe('Download Links', () => {
    it('should load and display download links', async () => {
      const downloadLinks = {
        cursor: {
          windows: 'https://cursor.sh/download/windows',
          macos: 'https://cursor.sh/download/macos',
          linux: 'https://cursor.sh/download/linux'
        }
      };

      mockIDERequirementService.getDownloadLinks.mockResolvedValueOnce(downloadLinks);

      render(
        <IDEStartModal
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockIDERequirementService.getDownloadLinks).toHaveBeenCalled();
      });

      expect(screen.getByText('Don\'t have this IDE?')).toBeInTheDocument();
      expect(screen.getByText('Download Cursor')).toBeInTheDocument();
    });

    it('should handle download link click', async () => {
      const downloadLinks = {
        cursor: {
          windows: 'https://cursor.sh/download/windows',
          macos: 'https://cursor.sh/download/macos',
          linux: 'https://cursor.sh/download/linux'
        }
      };

      mockIDERequirementService.getDownloadLinks.mockResolvedValueOnce(downloadLinks);

      // Mock window.open
      const mockOpen = jest.fn();
      Object.defineProperty(window, 'open', {
        value: mockOpen,
        writable: true
      });

      render(
        <IDEStartModal
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Download Cursor')).toBeInTheDocument();
      });

      const downloadButton = screen.getByText('Download Cursor');
      fireEvent.click(downloadButton);

      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('cursor.sh'),
        '_blank',
        'noopener,noreferrer'
      );
    });
  });

  describe('Executable Path Validation', () => {
    it('should validate executable path', async () => {
      const validationResult = {
        valid: true,
        version: '1.0.3''
      };

      mockIDERequirementService.validateExecutablePath.mockResolvedValueOnce(validationResult);

      render(
        <IDEStartModal
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      );

      const pathInput = screen.getByPlaceholderText(/Path to IDE executable/);
      fireEvent.change(pathInput, { target: { value: '/usr/bin/cursor' } });

      await waitFor(() => {
        expect(mockIDERequirementService.validateExecutablePath).toHaveBeenCalledWith('/usr/bin/cursor');
      });

      await waitFor(() => {
        expect(screen.getByText('Valid executable (version: '1.0.3')')).toBeInTheDocument();
      });
    });

    it('should show validation error for invalid path', async () => {
      const validationResult = {
        valid: false,
        error: 'File not found'
      };

      mockIDERequirementService.validateExecutablePath.mockResolvedValueOnce(validationResult);

      render(
        <IDEStartModal
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      );

      const pathInput = screen.getByPlaceholderText(/Path to IDE executable/);
      fireEvent.change(pathInput, { target: { value: '/invalid/path' } });

      await waitFor(() => {
        expect(screen.getByText('File not found')).toBeInTheDocument();
      });
    });

    it('should show loading state during validation', async () => {
      mockIDERequirementService.validateExecutablePath.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ valid: true }), 100))
      );

      render(
        <IDEStartModal
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      );

      const pathInput = screen.getByPlaceholderText(/Path to IDE executable/);
      fireEvent.change(pathInput, { target: { value: '/usr/bin/cursor' } });

      await waitFor(() => {
        expect(screen.getByText('Validating executable path...')).toBeInTheDocument();
      });
    });
  });

  describe('Default Path Suggestion', () => {
    it('should show default path button when available', async () => {
      const defaultPaths = {
        cursor: '/usr/bin/cursor'
      };

      mockIDERequirementService.getDefaultExecutablePaths.mockResolvedValueOnce(defaultPaths);

      render(
        <IDEStartModal
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockIDERequirementService.getDefaultExecutablePaths).toHaveBeenCalled();
      });

      const defaultPathButton = screen.getByTitle('Use default path');
      expect(defaultPathButton).toBeInTheDocument();
    });

    it('should fill default path when button is clicked', async () => {
      const defaultPaths = {
        cursor: '/usr/bin/cursor'
      };

      mockIDERequirementService.getDefaultExecutablePaths.mockResolvedValueOnce(defaultPaths);

      render(
        <IDEStartModal
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      );

      await waitFor(() => {
        const defaultPathButton = screen.getByTitle('Use default path');
        fireEvent.click(defaultPathButton);
      });

      const pathInput = screen.getByPlaceholderText(/Path to IDE executable/);
      expect(pathInput.value).toBe('/usr/bin/cursor');
    });
  });

  describe('Form Submission', () => {
    it('should validate form before submission', async () => {
      const mockOnSuccess = jest.fn();
      const mockOnClose = jest.fn();

      render(
        <IDEStartModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const submitButton = screen.getByText('Start IDE');
      fireEvent.click(submitButton);

      // Should show validation error
      expect(screen.getByText('Please select an IDE type')).toBeInTheDocument();
    });

    it('should submit form with valid data', async () => {
      const mockOnSuccess = jest.fn();
      const mockOnClose = jest.fn();

      // Mock API call
      const { apiCall } = require('@/infrastructure/repositories/APIChatRepository.jsx');
      apiCall.mockResolvedValueOnce({
        success: true,
        data: { port: 9222, ideType: 'cursor' }
      });

      render(
        <IDEStartModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Select IDE type
      const cursorOption = screen.getByText('Cursor');
      fireEvent.click(cursorOption);

      // Submit form
      const submitButton = screen.getByText('Start IDE');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(apiCall).toHaveBeenCalledWith('/api/ide/start', {
          method: 'POST',
          body: expect.stringContaining('cursor')
        });
      });

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Modal Close', () => {
    it('should close modal when close button is clicked', () => {
      const mockOnClose = jest.fn();

      render(
        <IDEStartModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={jest.fn()}
        />
      );

      const closeButton = screen.getByText('✕');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal when cancel button is clicked', () => {
      const mockOnClose = jest.fn();

      render(
        <IDEStartModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={jest.fn()}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal on escape key', () => {
      const mockOnClose = jest.fn();

      render(
        <IDEStartModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={jest.fn()}
        />
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display API errors', async () => {
      const { apiCall } = require('@/infrastructure/repositories/APIChatRepository.jsx');
      apiCall.mockRejectedValueOnce(new Error('Failed to start IDE'));

      render(
        <IDEStartModal
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      );

      // Select IDE type and submit
      const cursorOption = screen.getByText('Cursor');
      fireEvent.click(cursorOption);

      const submitButton = screen.getByText('Start IDE');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to start IDE')).toBeInTheDocument();
      });
    });
  });
});
