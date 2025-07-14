import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GitManagementComponent from '@/presentation/components/GitManagementComponent';
import PideaAgentBranchComponent from '@/presentation/components/PideaAgentBranchComponent';
import { APIChatRepository } from '@/infrastructure/repositories/APIChatRepository';

// Mock the API repository
jest.mock('@/infrastructure/repositories/APIChatRepository');

describe('PIDEA Agent Branch Integration Tests', () => {
  let mockAPIRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAPIRepository = {
      pullPideaAgentBranch: jest.fn(),
      mergePideaAgentBranch: jest.fn(),
      getPideaAgentStatus: jest.fn(),
      comparePideaAgentBranch: jest.fn(),
      getGitStatus: jest.fn(),
      pullChanges: jest.fn(),
      pushChanges: jest.fn(),
      commitChanges: jest.fn()
    };
    APIChatRepository.mockImplementation(() => mockAPIRepository);
  });

  describe('GitManagementComponent Integration', () => {
    it('integrates PIDEA Agent Branch component correctly', () => {
      render(<GitManagementComponent />);

      // Check if PIDEA Agent toggle button is present
      expect(screen.getByText('Show PIDEA Agent Branch')).toBeInTheDocument();
    });

    it('toggles PIDEA Agent Branch component visibility', async () => {
      render(<GitManagementComponent />);

      const toggleButton = screen.getByText('Show PIDEA Agent Branch');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('Hide PIDEA Agent Branch')).toBeInTheDocument();
        expect(screen.getByText('PIDEA Agent Branch')).toBeInTheDocument();
      });

      const hideButton = screen.getByText('Hide PIDEA Agent Branch');
      fireEvent.click(hideButton);

      await waitFor(() => {
        expect(screen.getByText('Show PIDEA Agent Branch')).toBeInTheDocument();
        expect(screen.queryByText('PIDEA Agent Branch')).not.toBeInTheDocument();
      });
    });

    it('maintains state when toggling PIDEA Agent Branch component', async () => {
      render(<GitManagementComponent />);

      // Show PIDEA Agent Branch
      const toggleButton = screen.getByText('Show PIDEA Agent Branch');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('PIDEA Agent Branch')).toBeInTheDocument();
      });

      // Hide and show again - should maintain state
      const hideButton = screen.getByText('Hide PIDEA Agent Branch');
      fireEvent.click(hideButton);

      await waitFor(() => {
        expect(screen.queryByText('PIDEA Agent Branch')).not.toBeInTheDocument();
      });

      const showButton = screen.getByText('Show PIDEA Agent Branch');
      fireEvent.click(showButton);

      await waitFor(() => {
        expect(screen.getByText('PIDEA Agent Branch')).toBeInTheDocument();
      });
    });
  });

  describe('API Integration Workflows', () => {
    it('performs complete pull workflow', async () => {
      mockAPIRepository.pullPideaAgentBranch.mockResolvedValue({
        success: true,
        message: 'Successfully pulled changes',
        changes: ['file1.js', 'file2.js'],
        status: 'up-to-date'
      });

      render(<PideaAgentBranchComponent />);

      const pullButton = screen.getByText('Pull Changes');
      fireEvent.click(pullButton);

      await waitFor(() => {
        expect(mockAPIRepository.pullPideaAgentBranch).toHaveBeenCalled();
        expect(screen.getByText('Status: Up to date')).toBeInTheDocument();
      });
    });

    it('performs complete merge workflow', async () => {
      mockAPIRepository.mergePideaAgentBranch.mockResolvedValue({
        success: true,
        message: 'Successfully merged changes',
        mergedFiles: ['file1.js', 'file2.js'],
        status: 'up-to-date'
      });

      render(<PideaAgentBranchComponent />);

      const mergeButton = screen.getByText('Merge Changes');
      fireEvent.click(mergeButton);

      await waitFor(() => {
        expect(mockAPIRepository.mergePideaAgentBranch).toHaveBeenCalled();
        expect(screen.getByText('Status: Up to date')).toBeInTheDocument();
      });
    });

    it('performs complete compare workflow', async () => {
      mockAPIRepository.comparePideaAgentBranch.mockResolvedValue({
        success: true,
        differences: [
          { file: 'file1.js', status: 'modified', changes: 5 },
          { file: 'file2.js', status: 'added', changes: 10 }
        ]
      });

      render(<PideaAgentBranchComponent />);

      const compareButton = screen.getByText('Compare Changes');
      fireEvent.click(compareButton);

      await waitFor(() => {
        expect(mockAPIRepository.comparePideaAgentBranch).toHaveBeenCalled();
      });
    });

    it('handles sequential operations correctly', async () => {
      mockAPIRepository.getPideaAgentStatus.mockResolvedValue({
        success: true,
        status: 'behind'
      });

      mockAPIRepository.pullPideaAgentBranch.mockResolvedValue({
        success: true,
        message: 'Successfully pulled changes',
        status: 'up-to-date'
      });

      mockAPIRepository.mergePideaAgentBranch.mockResolvedValue({
        success: true,
        message: 'Successfully merged changes',
        status: 'up-to-date'
      });

      render(<PideaAgentBranchComponent />);

      // Perform pull operation
      const pullButton = screen.getByText('Pull Changes');
      fireEvent.click(pullButton);

      await waitFor(() => {
        expect(mockAPIRepository.pullPideaAgentBranch).toHaveBeenCalled();
      });

      // Perform merge operation
      const mergeButton = screen.getByText('Merge Changes');
      fireEvent.click(mergeButton);

      await waitFor(() => {
        expect(mockAPIRepository.mergePideaAgentBranch).toHaveBeenCalled();
      });

      // Verify both operations were called
      expect(mockAPIRepository.pullPideaAgentBranch).toHaveBeenCalledTimes(1);
      expect(mockAPIRepository.mergePideaAgentBranch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling Integration', () => {
    it('handles API errors gracefully across components', async () => {
      mockAPIRepository.pullPideaAgentBranch.mockRejectedValue(new Error('Network error'));

      const mockOnError = jest.fn();
      render(<PideaAgentBranchComponent onError={mockOnError} />);

      const pullButton = screen.getByText('Pull Changes');
      fireEvent.click(pullButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Failed to pull changes: Network error');
      });
    });

    it('handles partial failures in workflows', async () => {
      mockAPIRepository.pullPideaAgentBranch.mockResolvedValue({
        success: true,
        message: 'Successfully pulled changes'
      });

      mockAPIRepository.mergePideaAgentBranch.mockRejectedValue(new Error('Merge conflict'));

      const mockOnError = jest.fn();
      render(<PideaAgentBranchComponent onError={mockOnError} />);

      // Successful pull
      const pullButton = screen.getByText('Pull Changes');
      fireEvent.click(pullButton);

      await waitFor(() => {
        expect(mockAPIRepository.pullPideaAgentBranch).toHaveBeenCalled();
      });

      // Failed merge
      const mergeButton = screen.getByText('Merge Changes');
      fireEvent.click(mergeButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Failed to merge changes: Merge conflict');
      });
    });
  });

  describe('State Management Integration', () => {
    it('maintains consistent state across operations', async () => {
      mockAPIRepository.pullPideaAgentBranch.mockResolvedValue({
        success: true,
        message: 'Success',
        status: 'up-to-date'
      });

      const mockOnStatusUpdate = jest.fn();
      render(<PideaAgentBranchComponent onStatusUpdate={mockOnStatusUpdate} />);

      const pullButton = screen.getByText('Pull Changes');
      fireEvent.click(pullButton);

      await waitFor(() => {
        expect(mockOnStatusUpdate).toHaveBeenCalledWith('up-to-date');
      });

      // Verify status is updated in component
      expect(screen.getByText('Status: Up to date')).toBeInTheDocument();
    });

    it('handles loading states correctly across operations', async () => {
      mockAPIRepository.pullPideaAgentBranch.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<PideaAgentBranchComponent />);

      const pullButton = screen.getByText('Pull Changes');
      fireEvent.click(pullButton);

      // Check loading state
      expect(screen.getByText('Pulling...')).toBeInTheDocument();
      expect(pullButton).toBeDisabled();

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('Pull Changes')).toBeInTheDocument();
        expect(pullButton).not.toBeDisabled();
      });
    });
  });

  describe('User Experience Integration', () => {
    it('provides clear feedback for all operations', async () => {
      mockAPIRepository.pullPideaAgentBranch.mockResolvedValue({
        success: true,
        message: 'Successfully pulled changes',
        changes: ['file1.js', 'file2.js']
      });

      render(<PideaAgentBranchComponent />);

      const pullButton = screen.getByText('Pull Changes');
      fireEvent.click(pullButton);

      // Check loading feedback
      expect(screen.getByText('Pulling...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Pull Changes')).toBeInTheDocument();
      });
    });

    it('handles rapid user interactions correctly', async () => {
      mockAPIRepository.pullPideaAgentBranch.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 200))
      );

      render(<PideaAgentBranchComponent />);

      const pullButton = screen.getByText('Pull Changes');
      
      // Rapid clicks should be ignored
      fireEvent.click(pullButton);
      fireEvent.click(pullButton);
      fireEvent.click(pullButton);

      // Should only be called once
      await waitFor(() => {
        expect(mockAPIRepository.pullPideaAgentBranch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Accessibility Integration', () => {
    it('maintains accessibility across component interactions', () => {
      render(<GitManagementComponent />);

      const toggleButton = screen.getByText('Show PIDEA Agent Branch');
      
      // Check keyboard navigation
      toggleButton.focus();
      expect(toggleButton).toHaveFocus();

      // Check ARIA attributes
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('provides proper focus management', async () => {
      render(<GitManagementComponent />);

      const toggleButton = screen.getByText('Show PIDEA Agent Branch');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const pullButton = screen.getByLabelText('Pull changes from pidea-agent branch');
        expect(pullButton).toBeInTheDocument();
      });
    });
  });

  describe('Performance Integration', () => {
    it('handles multiple operations efficiently', async () => {
      mockAPIRepository.pullPideaAgentBranch.mockResolvedValue({ success: true });
      mockAPIRepository.mergePideaAgentBranch.mockResolvedValue({ success: true });
      mockAPIRepository.comparePideaAgentBranch.mockResolvedValue({ success: true });

      render(<PideaAgentBranchComponent />);

      const startTime = performance.now();

      // Perform multiple operations
      const pullButton = screen.getByText('Pull Changes');
      const mergeButton = screen.getByText('Merge Changes');
      const compareButton = screen.getByText('Compare Changes');

      fireEvent.click(pullButton);
      fireEvent.click(mergeButton);
      fireEvent.click(compareButton);

      await waitFor(() => {
        expect(mockAPIRepository.pullPideaAgentBranch).toHaveBeenCalled();
        expect(mockAPIRepository.mergePideaAgentBranch).toHaveBeenCalled();
        expect(mockAPIRepository.comparePideaAgentBranch).toHaveBeenCalled();
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
}); 