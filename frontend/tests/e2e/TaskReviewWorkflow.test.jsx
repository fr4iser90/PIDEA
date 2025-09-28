import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TasksPanelComponent from '@/presentation/components/chat/sidebar-right/TasksPanelComponent';
import TaskReviewSelectionModal from '@/presentation/components/chat/modal/TaskReviewSelectionModal';
import TaskReviewService from '@/application/services/TaskReviewService';

// Mock dependencies
jest.mock('@/infrastructure/stores/selectors/ProjectSelectors', () => ({
  useActiveIDE: () => ({
    workspacePath: '/path/to/project',
    port: 3000
  }),
  useProjectTasks: () => ({
    manualTasks: [
      {
        id: '1',
        title: 'Frontend Task',
        description: 'Implement user interface',
        priority: { value: 'high' },
        status: { value: 'pending' },
        category: { value: 'frontend' },
        createdAt: '2025-01-01T10:00:00Z',
        estimatedHours: 3
      },
      {
        id: '2',
        title: 'Backend Task',
        description: 'Implement API endpoints',
        priority: { value: 'medium' },
        status: { value: 'in-progress' },
        category: { value: 'backend' },
        createdAt: '2025-01-02T10:00:00Z',
        estimatedHours: 5
      },
      {
        id: '3',
        title: 'Completed Task',
        description: 'Already finished task',
        priority: { value: 'low' },
        status: { value: 'completed' },
        category: { value: 'testing' },
        createdAt: '2025-01-03T10:00:00Z',
        estimatedHours: 1
      }
    ],
    isLoadingManualTasks: false
  }),
  useProjectDataActions: () => ({
    loadProjectTasks: jest.fn(),
    createTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn()
  })
}));

jest.mock('@/infrastructure/logging/Logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('@/infrastructure/repositories/APIChatRepository', () => ({
  __esModule: true,
  default: jest.fn(),
  apiCall: jest.fn()
}));

jest.mock('@/application/services/TaskReviewService');

// Mock eventBus
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

global.window = { eventBus: mockEventBus };

describe('Task Review Button - End-to-End Workflow', () => {
  let mockTaskReviewService;
  let mockApiCall;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock TaskReviewService
    mockTaskReviewService = {
      executeTaskReviewWorkflow: jest.fn()
    };
    TaskReviewService.mockImplementation(() => mockTaskReviewService);
    
    // Mock API calls
    mockApiCall = jest.fn();
    require('@/infrastructure/repositories/APIChatRepository').apiCall = mockApiCall;
    
    // Mock successful API responses
    mockApiCall.mockResolvedValue({
      success: true,
      data: { importedCount: 3 }
    });
  });

  afterEach(() => {
    delete global.window;
  });

  describe('Complete Review Workflow', () => {
    it('completes full task review workflow successfully', async () => {
      // Mock successful review workflow
      mockTaskReviewService.executeTaskReviewWorkflow.mockResolvedValue({
        success: true,
        data: {
          results: [
            { taskId: '1', success: true, result: 'completed' },
            { taskId: '2', success: true, result: 'completed' }
          ],
          summary: {
            totalTasks: 2,
            completedTasks: 2,
            failedTasks: 0
          }
        },
        message: 'Review completed for 2/2 tasks'
      });

      render(<TasksPanelComponent />);

      // 1. Verify Review button is present and enabled
      const reviewButton = screen.getByText('📋 Review');
      expect(reviewButton).toBeInTheDocument();
      expect(reviewButton).not.toBeDisabled();

      // 2. Click Review button to open modal
      fireEvent.click(reviewButton);

      // 3. Verify modal opens with correct tasks
      await waitFor(() => {
        expect(screen.getByText('📋 Select Tasks for Review')).toBeInTheDocument();
      });

      // Should show 2 reviewable tasks (excluding completed)
      expect(screen.getByText('2 of 2 tasks selected')).toBeInTheDocument();
      expect(screen.getByText('Frontend Task')).toBeInTheDocument();
      expect(screen.getByText('Backend Task')).toBeInTheDocument();
      expect(screen.queryByText('Completed Task')).not.toBeInTheDocument();

      // 4. Select tasks for review
      const frontendTaskCheckbox = screen.getByLabelText(/Frontend Task/i);
      const backendTaskCheckbox = screen.getByLabelText(/Backend Task/i);
      
      fireEvent.click(frontendTaskCheckbox);
      fireEvent.click(backendTaskCheckbox);

      // 5. Verify selection count updates
      expect(screen.getByText('2 of 2 tasks selected')).toBeInTheDocument();

      // 6. Click Start Review button
      const startReviewButton = screen.getByText(/Start Review \(2\)/i);
      expect(startReviewButton).toBeEnabled();
      
      fireEvent.click(startReviewButton);

      // 7. Verify loading state
      expect(screen.getByText('Starting Review...')).toBeInTheDocument();

      // 8. Wait for workflow completion
      await waitFor(() => {
        expect(mockTaskReviewService.executeTaskReviewWorkflow).toHaveBeenCalledWith(
          [
            expect.objectContaining({ id: '1', title: 'Frontend Task' }),
            expect.objectContaining({ id: '2', title: 'Backend Task' })
          ],
          expect.any(String), // projectId
          '/path/to/project' // workspacePath
        );
      });

      // 9. Verify success feedback
      await waitFor(() => {
        expect(screen.getByText('Review completed for 2/2 tasks')).toBeInTheDocument();
      });

      // 10. Verify modal closes
      await waitFor(() => {
        expect(screen.queryByText('📋 Select Tasks for Review')).not.toBeInTheDocument();
      });
    });

    it('handles partial task review success', async () => {
      // Mock partial success
      mockTaskReviewService.executeTaskReviewWorkflow.mockResolvedValue({
        success: true,
        data: {
          results: [
            { taskId: '1', success: true, result: 'completed' },
            { taskId: '2', success: false, error: 'Task processing failed' }
          ],
          summary: {
            totalTasks: 2,
            completedTasks: 1,
            failedTasks: 1
          }
        },
        message: 'Review completed for 1/2 tasks'
      });

      render(<TasksPanelComponent />);

      // Open modal and select tasks
      fireEvent.click(screen.getByText('📋 Review'));
      
      await waitFor(() => {
        expect(screen.getByText('📋 Select Tasks for Review')).toBeInTheDocument();
      });

      // Select all tasks
      fireEvent.click(screen.getByLabelText(/Select All/i));
      fireEvent.click(screen.getByText(/Start Review \(2\)/i));

      // Verify partial success message
      await waitFor(() => {
        expect(screen.getByText('Review completed for 1/2 tasks')).toBeInTheDocument();
      });
    });

    it('handles complete workflow failure', async () => {
      // Mock complete failure
      mockTaskReviewService.executeTaskReviewWorkflow.mockRejectedValue(
        new Error('Workflow execution failed')
      );

      render(<TasksPanelComponent />);

      // Open modal and select tasks
      fireEvent.click(screen.getByText('📋 Review'));
      
      await waitFor(() => {
        expect(screen.getByText('📋 Select Tasks for Review')).toBeInTheDocument();
      });

      // Select a task and start review
      fireEvent.click(screen.getByLabelText(/Frontend Task/i));
      fireEvent.click(screen.getByText(/Start Review \(1\)/i));

      // Verify error message
      await waitFor(() => {
        expect(screen.getByText('Review failed: Workflow execution failed')).toBeInTheDocument();
      });

      // Modal should remain open for user to retry
      expect(screen.getByText('📋 Select Tasks for Review')).toBeInTheDocument();
    });
  });

  describe('Task Filtering and Selection', () => {
    it('filters tasks by category during review', async () => {
      render(<TasksPanelComponent />);

      // Open review modal
      fireEvent.click(screen.getByText('📋 Review'));
      
      await waitFor(() => {
        expect(screen.getByText('📋 Select Tasks for Review')).toBeInTheDocument();
      });

      // Filter by frontend category
      const categorySelect = screen.getByDisplayValue('All Categories');
      fireEvent.change(categorySelect, { target: { value: 'frontend' } });

      // Should only show frontend task
      expect(screen.getByText('Frontend Task')).toBeInTheDocument();
      expect(screen.queryByText('Backend Task')).not.toBeInTheDocument();
      expect(screen.getByText('1 of 1 tasks selected')).toBeInTheDocument();
    });

    it('sorts tasks by priority during review', async () => {
      render(<TasksPanelComponent />);

      // Open review modal
      fireEvent.click(screen.getByText('📋 Review'));
      
      await waitFor(() => {
        expect(screen.getByText('📋 Select Tasks for Review')).toBeInTheDocument();
      });

      // Sort by priority
      const sortSelect = screen.getByDisplayValue('Priority');
      fireEvent.change(sortSelect, { target: { value: 'priority' } });

      // High priority task should come first
      const taskItems = screen.getAllByRole('checkbox');
      expect(taskItems[0]).toHaveAccessibleName(/Frontend Task/i); // High priority
      expect(taskItems[1]).toHaveAccessibleName(/Backend Task/i); // Medium priority
    });

    it('allows task expansion to view details', async () => {
      render(<TasksPanelComponent />);

      // Open review modal
      fireEvent.click(screen.getByText('📋 Review'));
      
      await waitFor(() => {
        expect(screen.getByText('📋 Select Tasks for Review')).toBeInTheDocument();
      });

      // Expand first task
      const expandButton = screen.getAllByText('+')[0];
      fireEvent.click(expandButton);

      // Should show task details
      expect(screen.getByText('Implement user interface')).toBeInTheDocument();
      expect(screen.getByText('Estimated: 3 hours')).toBeInTheDocument();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('disables review button when no tasks available', () => {
      // Mock empty tasks
      jest.doMock('@/infrastructure/stores/selectors/ProjectSelectors', () => ({
        useActiveIDE: () => ({
          workspacePath: '/path/to/project',
          port: 3000
        }),
        useProjectTasks: () => ({
          manualTasks: [],
          isLoadingManualTasks: false
        }),
        useProjectDataActions: () => ({
          loadProjectTasks: jest.fn(),
          createTask: jest.fn(),
          updateTask: jest.fn(),
          deleteTask: jest.fn()
        })
      }));

      render(<TasksPanelComponent />);

      const reviewButton = screen.getByText('📋 Review');
      expect(reviewButton).toBeDisabled();
    });

    it('shows no tasks message when all tasks are completed', async () => {
      // Mock only completed tasks
      jest.doMock('@/infrastructure/stores/selectors/ProjectSelectors', () => ({
        useActiveIDE: () => ({
          workspacePath: '/path/to/project',
          port: 3000
        }),
        useProjectTasks: () => ({
          manualTasks: [
            {
              id: '1',
              title: 'Completed Task',
              status: { value: 'completed' },
              category: { value: 'frontend' }
            }
          ],
          isLoadingManualTasks: false
        }),
        useProjectDataActions: () => ({
          loadProjectTasks: jest.fn(),
          createTask: jest.fn(),
          updateTask: jest.fn(),
          deleteTask: jest.fn()
        })
      }));

      render(<TasksPanelComponent />);

      // Open review modal
      fireEvent.click(screen.getByText('📋 Review'));
      
      await waitFor(() => {
        expect(screen.getByText('No reviewable tasks found.')).toBeInTheDocument();
        expect(screen.getByText('All tasks may be completed or filtered out.')).toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      // Mock network error
      mockTaskReviewService.executeTaskReviewWorkflow.mockRejectedValue(
        new Error('Network connection failed')
      );

      render(<TasksPanelComponent />);

      // Open modal and start review
      fireEvent.click(screen.getByText('📋 Review'));
      
      await waitFor(() => {
        expect(screen.getByText('📋 Select Tasks for Review')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText(/Frontend Task/i));
      fireEvent.click(screen.getByText(/Start Review \(1\)/i));

      // Verify network error handling
      await waitFor(() => {
        expect(screen.getByText('Review failed: Network connection failed')).toBeInTheDocument();
      });
    });
  });

  describe('User Experience', () => {
    it('provides clear visual feedback during workflow execution', async () => {
      // Mock delayed response
      mockTaskReviewService.executeTaskReviewWorkflow.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: { summary: { completedTasks: 1, totalTasks: 1 } },
          message: 'Review completed'
        }), 100))
      );

      render(<TasksPanelComponent />);

      // Start review workflow
      fireEvent.click(screen.getByText('📋 Review'));
      
      await waitFor(() => {
        expect(screen.getByText('📋 Select Tasks for Review')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText(/Frontend Task/i));
      fireEvent.click(screen.getByText(/Start Review \(1\)/i));

      // Verify loading state
      expect(screen.getByText('Starting Review...')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeDisabled();

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('Review completed')).toBeInTheDocument();
      });
    });

    it('allows cancellation during workflow execution', async () => {
      render(<TasksPanelComponent />);

      // Open modal
      fireEvent.click(screen.getByText('📋 Review'));
      
      await waitFor(() => {
        expect(screen.getByText('📋 Select Tasks for Review')).toBeInTheDocument();
      });

      // Cancel modal
      fireEvent.click(screen.getByText('Cancel'));

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText('📋 Select Tasks for Review')).not.toBeInTheDocument();
      });
    });
  });
});
