import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PideaAgentBranchComponent from '@/presentation/components/PideaAgentBranchComponent';

// Mock the API repository
jest.mock('@/infrastructure/repositories/APIChatRepository', () => ({
  pullPideaAgentBranch: jest.fn(),
  mergePideaAgentBranch: jest.fn(),
  getPideaAgentStatus: jest.fn(),
  comparePideaAgentBranch: jest.fn()
}));

describe('PideaAgentBranchComponent', () => {
  const mockOnStatusUpdate = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the component with initial state', () => {
      render(
        <PideaAgentBranchComponent
          onStatusUpdate={mockOnStatusUpdate}
          onError={mockOnError}
        />
      );

      expect(screen.getByText('PIDEA Agent Branch')).toBeInTheDocument();
      expect(screen.getByText('Pull Changes')).toBeInTheDocument();
      expect(screen.getByText('Merge Changes')).toBeInTheDocument();
      expect(screen.getByText('Compare Changes')).toBeInTheDocument();
      expect(screen.getByText('Status: Unknown')).toBeInTheDocument();
    });

    it('renders with custom title', () => {
      render(
        <PideaAgentBranchComponent
          title="Custom Title"
          onStatusUpdate={mockOnStatusUpdate}
          onError={mockOnError}
        />
      );

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('displays status correctly', () => {
      render(
        <PideaAgentBranchComponent
          status="up-to-date"
          onStatusUpdate={mockOnStatusUpdate}
          onError={mockOnError}
        />
      );

      expect(screen.getByText('Status: Up to date')).toBeInTheDocument();
    });

    it('displays behind status with warning', () => {
      render(
        <PideaAgentBranchComponent
          status="behind"
          onStatusUpdate={mockOnStatusUpdate}
          onError={mockOnError}
        />
      );

      expect(screen.getByText('Status: Behind remote')).toBeInTheDocument();
      expect(screen.getByText('Status: Behind remote')).toHaveClass('status-warning');
    });

    it('displays ahead status with info', () => {
      render(
        <PideaAgentBranchComponent
          status="ahead"
          onStatusUpdate={mockOnStatusUpdate}
          onError={mockOnError}
        />
      );

      expect(screen.getByText('Status: Ahead of remote')).toBeInTheDocument();
      expect(screen.getByText('Status: Ahead of remote')).toHaveClass('status-info');
    });
  });

  describe('Pull Operation', () => {
    it('handles successful pull operation', async () => {
      const { pullPideaAgentBranch } = require('@/infrastructure/repositories/APIChatRepository');
      pullPideaAgentBranch.mockResolvedValue({
        success: true,
        message: 'Successfully pulled changes',
        changes: ['file1.js', 'file2.js']
      });

      render(
        <PideaAgentBranchComponent
          onStatusUpdate={mockOnStatusUpdate}
          onError={mockOnError}
        />
      );

      const pullButton = screen.getByText('Pull Changes');
      fireEvent.click(pullButton);

      await waitFor(() => {
        expect(pullPideaAgentBranch).toHaveBeenCalled();
        expect(mockOnStatusUpdate).toHaveBeenCalledWith('up-to-date');
      });
    });

    it('handles pull operation error', async () => {
      const { pullPideaAgentBranch } = require('@/infrastructure/repositories/APIChatRepository');
      pullPideaAgentBranch.mockRejectedValue(new Error('Pull failed'));

      render(
        <PideaAgentBranchComponent
          onStatusUpdate={mockOnStatusUpdate}
          onError={mockOnError}
        />
      );

      const pullButton = screen.getByText('Pull Changes');
      fireEvent.click(pullButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Failed to pull changes: Pull failed');
      });
    });
  });

  describe('Merge Operation', () => {
    it('handles successful merge operation', async () => {
      const { mergePideaAgentBranch } = require('@/infrastructure/repositories/APIChatRepository');
      mergePideaAgentBranch.mockResolvedValue({
        success: true,
        message: 'Successfully merged changes',
        mergedFiles: ['file1.js', 'file2.js']
      });

      render(
        <PideaAgentBranchComponent
          onStatusUpdate={mockOnStatusUpdate}
          onError={mockOnError}
        />
      );

      const mergeButton = screen.getByText('Merge Changes');
      fireEvent.click(mergeButton);

      await waitFor(() => {
        expect(mergePideaAgentBranch).toHaveBeenCalled();
        expect(mockOnStatusUpdate).toHaveBeenCalledWith('up-to-date');
      });
    });

    it('handles merge operation error', async () => {
      const { mergePideaAgentBranch } = require('@/infrastructure/repositories/APIChatRepository');
      mergePideaAgentBranch.mockRejectedValue(new Error('Merge failed'));

      render(
        <PideaAgentBranchComponent
          onStatusUpdate={mockOnStatusUpdate}
          onError={mockOnError}
        />
      );

      const mergeButton = screen.getByText('Merge Changes');
      fireEvent.click(mergeButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Failed to merge changes: Merge failed');
      });
    });
  });

  describe('Compare Operation', () => {
    it('handles successful compare operation', async () => {
      const { comparePideaAgentBranch } = require('@/infrastructure/repositories/APIChatRepository');
      comparePideaAgentBranch.mockResolvedValue({
        success: true,
        differences: [
          { file: 'file1.js', status: 'modified' },
          { file: 'file2.js', status: 'added' }
        ]
      });

      render(
        <PideaAgentBranchComponent
          onStatusUpdate={mockOnStatusUpdate}
          onError={mockOnError}
        />
      );

      const compareButton = screen.getByText('Compare Changes');
      fireEvent.click(compareButton);

      await waitFor(() => {
        expect(comparePideaAgentBranch).toHaveBeenCalled();
      });
    });

    it('handles compare operation error', async () => {
      const { comparePideaAgentBranch } = require('@/infrastructure/repositories/APIChatRepository');
      comparePideaAgentBranch.mockRejectedValue(new Error('Compare failed'));

      render(
        <PideaAgentBranchComponent
          onStatusUpdate={mockOnStatusUpdate}
          onError={mockOnError}
        />
      );

      const compareButton = screen.getByText('Compare Changes');
      fireEvent.click(compareButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Failed to compare changes: Compare failed');
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state during pull operation', async () => {
      const { pullPideaAgentBranch } = require('@/infrastructure/repositories/APIChatRepository');
      pullPideaAgentBranch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <PideaAgentBranchComponent
          onStatusUpdate={mockOnStatusUpdate}
          onError={mockOnError}
        />
      );

      const pullButton = screen.getByText('Pull Changes');
      fireEvent.click(pullButton);

      expect(screen.getByText('Pulling...')).toBeInTheDocument();
      expect(pullButton).toBeDisabled();
    });

    it('shows loading state during merge operation', async () => {
      const { mergePideaAgentBranch } = require('@/infrastructure/repositories/APIChatRepository');
      mergePideaAgentBranch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <PideaAgentBranchComponent
          onStatusUpdate={mockOnStatusUpdate}
          onError={mockOnError}
        />
      );

      const mergeButton = screen.getByText('Merge Changes');
      fireEvent.click(mergeButton);

      expect(screen.getByText('Merging...')).toBeInTheDocument();
      expect(mergeButton).toBeDisabled();
    });

    it('shows loading state during compare operation', async () => {
      const { comparePideaAgentBranch } = require('@/infrastructure/repositories/APIChatRepository');
      comparePideaAgentBranch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <PideaAgentBranchComponent
          onStatusUpdate={mockOnStatusUpdate}
          onError={mockOnError}
        />
      );

      const compareButton = screen.getByText('Compare Changes');
      fireEvent.click(compareButton);

      expect(screen.getByText('Comparing...')).toBeInTheDocument();
      expect(compareButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      const { pullPideaAgentBranch } = require('@/infrastructure/repositories/APIChatRepository');
      pullPideaAgentBranch.mockRejectedValue(new Error('Network error'));

      render(
        <PideaAgentBranchComponent
          onStatusUpdate={mockOnStatusUpdate}
          onError={mockOnError}
        />
      );

      const pullButton = screen.getByText('Pull Changes');
      fireEvent.click(pullButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Failed to pull changes: Network error');
      });
    });

    it('handles API response errors', async () => {
      const { pullPideaAgentBranch } = require('@/infrastructure/repositories/APIChatRepository');
      pullPideaAgentBranch.mockResolvedValue({
        success: false,
        error: 'API error message'
      });

      render(
        <PideaAgentBranchComponent
          onStatusUpdate={mockOnStatusUpdate}
          onError={mockOnError}
        />
      );

      const pullButton = screen.getByText('Pull Changes');
      fireEvent.click(pullButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('API error message');
      });
    });
  });

  describe('Callbacks', () => {
    it('calls onStatusUpdate with correct status', async () => {
      const { pullPideaAgentBranch } = require('@/infrastructure/repositories/APIChatRepository');
      pullPideaAgentBranch.mockResolvedValue({
        success: true,
        message: 'Success',
        status: 'up-to-date'
      });

      render(
        <PideaAgentBranchComponent
          onStatusUpdate={mockOnStatusUpdate}
          onError={mockOnError}
        />
      );

      const pullButton = screen.getByText('Pull Changes');
      fireEvent.click(pullButton);

      await waitFor(() => {
        expect(mockOnStatusUpdate).toHaveBeenCalledWith('up-to-date');
      });
    });

    it('calls onError with correct error message', async () => {
      const { pullPideaAgentBranch } = require('@/infrastructure/repositories/APIChatRepository');
      pullPideaAgentBranch.mockRejectedValue(new Error('Test error'));

      render(
        <PideaAgentBranchComponent
          onStatusUpdate={mockOnStatusUpdate}
          onError={mockOnError}
        />
      );

      const pullButton = screen.getByText('Pull Changes');
      fireEvent.click(pullButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Failed to pull changes: Test error');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <PideaAgentBranchComponent
          onStatusUpdate={mockOnStatusUpdate}
          onError={mockOnError}
        />
      );

      expect(screen.getByLabelText('Pull changes from pidea-agent branch')).toBeInTheDocument();
      expect(screen.getByLabelText('Merge changes from pidea-agent branch')).toBeInTheDocument();
      expect(screen.getByLabelText('Compare changes in pidea-agent branch')).toBeInTheDocument();
    });

    it('has proper button roles', () => {
      render(
        <PideaAgentBranchComponent
          onStatusUpdate={mockOnStatusUpdate}
          onError={mockOnError}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
    });
  });
}); 