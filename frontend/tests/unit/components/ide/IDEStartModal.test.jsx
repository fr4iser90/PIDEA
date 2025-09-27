/**
 * IDEStartModal Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import IDEStartModal from '@/presentation/components/ide/IDEStartModal.jsx';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';

// Mock the IDEStore
jest.mock('@/infrastructure/stores/IDEStore.jsx', () => ({
  __esModule: true,
  default: jest.fn()
}));

// Mock the API call
jest.mock('@/infrastructure/repositories/APIChatRepository.jsx', () => ({
  apiCall: jest.fn()
}));

// Mock the logger
jest.mock('@/infrastructure/logging/Logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('IDEStartModal Component', () => {
  const mockUseIDEStore = useIDEStore as jest.MockedFunction<typeof useIDEStore>;
  const mockApiCall = apiCall as jest.MockedFunction<typeof apiCall>;
  
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseIDEStore.mockReturnValue({
      refresh: jest.fn()
    });
    
    // Mock successful API responses
    mockApiCall.mockImplementation((url) => {
      if (url === '/api/ide/available') {
        return Promise.resolve({
          success: true,
          data: { ides: [] }
        });
      }
      if (url === '/api/ide/detect-workspace-paths') {
        return Promise.resolve({
          success: true,
          data: { paths: ['/test/workspace1', '/test/workspace2'] }
        });
      }
      if (url === '/api/ide/start') {
        return Promise.resolve({
          success: true,
          data: { port: 9222, ideType: 'cursor' }
        });
      }
      return Promise.resolve({ success: false });
    });
  });

  it('renders when open', () => {
    render(
      <IDEStartModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    expect(screen.getByText('Start New IDE')).toBeInTheDocument();
    expect(screen.getByText('IDE Configuration')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <IDEStartModal
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    expect(screen.queryByText('Start New IDE')).not.toBeInTheDocument();
  });

  it('shows IDE type options', () => {
    render(
      <IDEStartModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    expect(screen.getByText('Cursor')).toBeInTheDocument();
    expect(screen.getByText('VS Code')).toBeInTheDocument();
    expect(screen.getByText('Windsurf')).toBeInTheDocument();
  });

  it('allows IDE type selection', () => {
    render(
      <IDEStartModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    const vscodeOption = screen.getByText('VS Code');
    fireEvent.click(vscodeOption);
    
    // Check if VS Code is selected (this would depend on the implementation)
    expect(vscodeOption.closest('.ide-type-option')).toHaveClass('selected');
  });

  it('shows port options', () => {
    render(
      <IDEStartModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    expect(screen.getByText('Auto-assign')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('shows custom port input when custom is selected', () => {
    render(
      <IDEStartModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    const customOption = screen.getByText('Custom');
    fireEvent.click(customOption);
    
    expect(screen.getByPlaceholderText('Enter port number')).toBeInTheDocument();
  });

  it('detects workspace paths on open', async () => {
    render(
      <IDEStartModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith('/api/ide/detect-workspace-paths', {
        method: 'POST',
        body: JSON.stringify({})
      });
    });
  });

  it('shows detected workspace paths', async () => {
    render(
      <IDEStartModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('/test/workspace1')).toBeInTheDocument();
      expect(screen.getByText('/test/workspace2')).toBeInTheDocument();
    });
  });

  it('allows manual workspace path detection', async () => {
    render(
      <IDEStartModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    const detectButton = screen.getByText('Detect Paths');
    fireEvent.click(detectButton);
    
    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith('/api/ide/detect-workspace-paths', {
        method: 'POST',
        body: JSON.stringify({})
      });
    });
  });

  it('validates form before submission', async () => {
    render(
      <IDEStartModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    const startButton = screen.getByText('Start IDE');
    fireEvent.click(startButton);
    
    // Should not call API if form is invalid
    await waitFor(() => {
      expect(mockApiCall).not.toHaveBeenCalledWith('/api/ide/start', expect.any(Object));
    });
  });

  it('submits form with correct data', async () => {
    render(
      <IDEStartModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    // Select VS Code
    const vscodeOption = screen.getByText('VS Code');
    fireEvent.click(vscodeOption);
    
    // Select workspace
    const workspaceSelect = screen.getByDisplayValue('Select workspace (optional)');
    fireEvent.change(workspaceSelect, { target: { value: '/test/workspace1' } });
    
    // Submit form
    const startButton = screen.getByText('Start IDE');
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith('/api/ide/start', {
        method: 'POST',
        body: JSON.stringify({
          ideType: 'vscode',
          workspacePath: '/test/workspace1',
          options: {
            port: 'auto',
            executablePath: null,
            additionalFlags: null
          }
        })
      });
    });
  });

  it('calls onSuccess when IDE starts successfully', async () => {
    render(
      <IDEStartModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    const startButton = screen.getByText('Start IDE');
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith({ port: 9222, ideType: 'cursor' });
    });
  });

  it('calls onClose when IDE starts successfully', async () => {
    render(
      <IDEStartModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    const startButton = screen.getByText('Start IDE');
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('shows error when IDE start fails', async () => {
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
      <IDEStartModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    const startButton = screen.getByText('Start IDE');
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to start IDE')).toBeInTheDocument();
    });
  });

  it('closes modal when close button is clicked', () => {
    render(
      <IDEStartModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal when cancel button is clicked', () => {
    render(
      <IDEStartModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles escape key to close modal', () => {
    render(
      <IDEStartModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    mockApiCall.mockImplementation((url) => {
      if (url === '/api/ide/start') {
        return new Promise(resolve => 
          setTimeout(() => resolve({ success: true, data: {} }), 100)
        );
      }
      return Promise.resolve({ success: true, data: {} });
    });
    
    render(
      <IDEStartModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    const startButton = screen.getByText('Start IDE');
    fireEvent.click(startButton);
    
    expect(screen.getByText('Starting IDE...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('Starting IDE...')).not.toBeInTheDocument();
    });
  });

  it('validates custom port range', async () => {
    render(
      <IDEStartModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    // Select custom port
    const customOption = screen.getByText('Custom');
    fireEvent.click(customOption);
    
    // Enter invalid port
    const portInput = screen.getByPlaceholderText('Enter port number');
    fireEvent.change(portInput, { target: { value: '9999' } });
    
    // Submit form
    const startButton = screen.getByText('Start IDE');
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Port must be between/)).toBeInTheDocument();
    });
  });

  it('resets form when modal is closed', () => {
    const { rerender } = render(
      <IDEStartModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    // Change some values
    const vscodeOption = screen.getByText('VS Code');
    fireEvent.click(vscodeOption);
    
    // Close modal
    fireEvent.click(screen.getByText('✕'));
    
    // Reopen modal
    rerender(
      <IDEStartModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    // Should be back to default values
    expect(screen.getByText('Cursor')).toBeInTheDocument();
  });
});
