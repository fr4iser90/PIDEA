/**
 * StatusBadge Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatusBadge from '@/presentation/components/ide/StatusBadge.jsx';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';

// Mock the IDEStore
jest.mock('@/infrastructure/stores/IDEStore.jsx', () => ({
  __esModule: true,
  default: jest.fn()
}));

// Mock the logger
jest.mock('@/infrastructure/logging/Logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('StatusBadge Component', () => {
  const mockUseIDEStore = useIDEStore as jest.MockedFunction<typeof useIDEStore>;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultMockStore = {
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
  };

  it('renders with running status', () => {
    mockUseIDEStore.mockReturnValue(defaultMockStore);
    
    render(<StatusBadge />);
    
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('🟢')).toBeInTheDocument();
  });

  it('renders with starting status', () => {
    mockUseIDEStore.mockReturnValue({
      ...defaultMockStore,
      availableIDEs: [
        {
          ...defaultMockStore.availableIDEs[0],
          status: 'starting'
        }
      ]
    });
    
    render(<StatusBadge />);
    
    expect(screen.getByText('Starting')).toBeInTheDocument();
    expect(screen.getByText('🟡')).toBeInTheDocument();
  });

  it('renders with error status', () => {
    mockUseIDEStore.mockReturnValue({
      ...defaultMockStore,
      availableIDEs: [
        {
          ...defaultMockStore.availableIDEs[0],
          status: 'error'
        }
      ]
    });
    
    render(<StatusBadge />);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('🔴')).toBeInTheDocument();
  });

  it('renders with disconnected status when no active port', () => {
    mockUseIDEStore.mockReturnValue({
      ...defaultMockStore,
      activePort: null
    });
    
    render(<StatusBadge />);
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByText('⚪')).toBeInTheDocument();
  });

  it('shows loading indicator when loading', () => {
    mockUseIDEStore.mockReturnValue({
      ...defaultMockStore,
      isLoading: true
    });
    
    render(<StatusBadge />);
    
    expect(screen.getByTitle('Loading...')).toBeInTheDocument();
  });

  it('shows error indicator when there is an error', () => {
    mockUseIDEStore.mockReturnValue({
      ...defaultMockStore,
      error: 'Connection failed'
    });
    
    render(<StatusBadge />);
    
    expect(screen.getByTitle('Error: Connection failed')).toBeInTheDocument();
  });

  it('calls refresh when clicked', async () => {
    const mockRefresh = jest.fn();
    mockUseIDEStore.mockReturnValue({
      ...defaultMockStore,
      refresh: mockRefresh
    });
    
    render(<StatusBadge />);
    
    const statusBadge = screen.getByText('Running').closest('.status-badge');
    fireEvent.click(statusBadge!);
    
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('calls custom onClick handler when provided', () => {
    const mockOnClick = jest.fn();
    mockUseIDEStore.mockReturnValue(defaultMockStore);
    
    render(<StatusBadge onClick={mockOnClick} />);
    
    const statusBadge = screen.getByText('Running').closest('.status-badge');
    fireEvent.click(statusBadge!);
    
    expect(mockOnClick).toHaveBeenCalled();
  });

  it('renders in compact mode', () => {
    mockUseIDEStore.mockReturnValue(defaultMockStore);
    
    render(<StatusBadge compact />);
    
    const statusBadge = screen.getByText('Running').closest('.status-badge');
    expect(statusBadge).toHaveClass('compact');
  });

  it('shows port information when showPort is true', () => {
    mockUseIDEStore.mockReturnValue(defaultMockStore);
    
    render(<StatusBadge showPort />);
    
    expect(screen.getByText(':9222')).toBeInTheDocument();
  });

  it('shows detailed popup on hover', () => {
    mockUseIDEStore.mockReturnValue(defaultMockStore);
    
    render(<StatusBadge />);
    
    const statusBadge = screen.getByText('Running').closest('.status-badge');
    fireEvent.mouseEnter(statusBadge!);
    
    expect(screen.getByText('IDE Status')).toBeInTheDocument();
    expect(screen.getByText('Cursor')).toBeInTheDocument();
    expect(screen.getByText('9222')).toBeInTheDocument();
  });

  it('displays tooltip with correct information', () => {
    mockUseIDEStore.mockReturnValue(defaultMockStore);
    
    render(<StatusBadge />);
    
    const statusBadge = screen.getByText('Running').closest('.status-badge');
    expect(statusBadge).toHaveAttribute('title');
    
    const title = statusBadge?.getAttribute('title');
    expect(title).toContain('Status: Running');
    expect(title).toContain('IDE: Cursor');
    expect(title).toContain('Port: 9222');
  });

  it('handles status changes correctly', () => {
    const { rerender } = render(<StatusBadge />);
    
    // Initial state
    expect(screen.getByText('Running')).toBeInTheDocument();
    
    // Change to starting
    mockUseIDEStore.mockReturnValue({
      ...defaultMockStore,
      availableIDEs: [
        {
          ...defaultMockStore.availableIDEs[0],
          status: 'starting'
        }
      ]
    });
    
    rerender(<StatusBadge />);
    
    expect(screen.getByText('Starting')).toBeInTheDocument();
    expect(screen.getByText('🟡')).toBeInTheDocument();
  });

  it('handles missing IDE gracefully', () => {
    mockUseIDEStore.mockReturnValue({
      ...defaultMockStore,
      availableIDEs: []
    });
    
    render(<StatusBadge />);
    
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByText('⚪')).toBeInTheDocument();
  });

  it('applies correct CSS classes based on status', () => {
    mockUseIDEStore.mockReturnValue(defaultMockStore);
    
    render(<StatusBadge />);
    
    const statusBadge = screen.getByText('Running').closest('.status-badge');
    expect(statusBadge).toHaveClass('running');
  });

  it('handles refresh spinner correctly', async () => {
    const mockRefresh = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    mockUseIDEStore.mockReturnValue({
      ...defaultMockStore,
      refresh: mockRefresh
    });
    
    render(<StatusBadge />);
    
    const statusBadge = screen.getByText('Running').closest('.status-badge');
    fireEvent.click(statusBadge!);
    
    // Should show refresh spinner
    expect(screen.getByTitle('Refreshing...')).toBeInTheDocument();
    
    // Wait for refresh to complete
    await waitFor(() => {
      expect(screen.queryByTitle('Refreshing...')).not.toBeInTheDocument();
    });
  });
});
