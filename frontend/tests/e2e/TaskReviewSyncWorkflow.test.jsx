/**
 * TaskReviewSyncWorkflow.test.jsx
 * End-to-end tests for complete task review sync workflow
 * Created: 2025-10-04T00:25:45.000Z
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TasksPanelComponent from '@/presentation/components/chat/sidebar-right/TasksPanelComponent';
import TaskReviewSelectionModal from '@/presentation/components/chat/modal/TaskReviewSelectionModal';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository';

// Mock dependencies
jest.mock('@/infrastructure/repositories/APIChatRepository', () => ({
  __esModule: true,
  default: jest.fn(),
  apiCall: jest.fn()
}));

jest.mock('@/infrastructure/stores/selectors/ProjectSelectors', () => ({
  useActiveIDE: () => ({
    activeIDE: { workspacePath: '/test/project' },
    projectId: 'test-project-id',
    projectName: 'Test Project'
  }),
  useProjectTasks: () => ({
    tasks: [
      {
        id: 'task-1',
        title: 'Backend Task',
        status: { value: 'pending' },
        priority: { value: 'high' },
        category: 'backend'
      },
      {
        id: 'task-2',
        title: 'Frontend Task',
        status: { value: 'completed' },
        priority: { value: 'medium' },
        category: 'frontend'
      },
      {
        id: 'task-3',
        title: 'Database Task',
        status: { value: 'pending' },
        priority: { value: 'low' },
        category: 'database'
      }
    ],
    hasTasks: true,
    taskCount: 3,
    lastUpdate: new Date()
  }),
  useProjectDataActions: () => ({
    loadProjectTasks: jest.fn()
  })
}));

jest.mock('@/application/services/TaskReviewService', () => {
  return jest.fn().mockImplementation(() => ({
    executeTaskReviewWorkflow: jest.fn().mockResolvedValue({
      success: true,
      message: 'Review completed successfully for 2 tasks',
      data: { 
        summary: { completedTasks: 2, totalTasks: 2 },
        results: [
          { taskId: 'task-1', success: true },
          { taskId: 'task-3', success: true }
        ]
      }
    }),
    validateTaskStatus: jest.fn().mockResolvedValue({
      success: true,
      validTasks: [
        { id: 'task-1', title: 'Backend Task', status: { value: 'pending' } },
        { id: 'task-3', title: 'Database Task', status: { value: 'pending' } }
      ],
      completedTasks: [
        { id: 'task-2', title: 'Frontend Task', status: { value: 'completed' } }
      ],
      totalTasks: 3,
      message: 'Found 2 reviewable tasks (1 completed tasks excluded)'
    })
  }));
});

describe('Task Review Sync Workflow E2E', () => {
  const mockEventBus = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful sync response
    apiCall.mockResolvedValue({
      success: true,
      data: { 
        importedCount: 3,
        statusValidation: {
          totalTasks: 3,
          validTasks: 2,
          invalidTasks: 0
        }
      }
    });
  });

  describe('Complete Workflow: Sync → Review → Execute', () => {
    test('should complete full workflow successfully', async () => {
      render(<TasksPanelComponent eventBus={mockEventBus} activePort={3000} />);

      // Step 1: Click Review button (triggers sync)
      const reviewButton = screen.getByText('📋 Review');
      expect(reviewButton).toBeInTheDocument();
      
      fireEvent.click(reviewButton);

      // Step 2: Verify sync was called
      await waitFor(() => {
        expect(apiCall).toHaveBeenCalledWith(
          '/api/projects/test-project-id/tasks/sync-manual',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ projectPath: '/test/project' })
          })
        );
      });

      // Step 3: Verify review modal opens
      await waitFor(() => {
        expect(screen.getByText('Select Tasks for Review')).toBeInTheDocument();
      });

      // Step 4: Select tasks for review (should exclude completed tasks)
      const taskCheckboxes = screen.getAllByRole('checkbox');
      expect(taskCheckboxes).toHaveLength(2); // Only pending tasks should be selectable

      // Select both pending tasks
      fireEvent.click(taskCheckboxes[0]);
      fireEvent.click(taskCheckboxes[1]);

      // Step 5: Start review
      const startReviewButton = screen.getByText('Start Review');
      fireEvent.click(startReviewButton);

      // Step 6: Verify workflow execution
      await waitFor(() => {
        expect(screen.getByText(/Review completed successfully for 2 tasks/)).toBeInTheDocument();
      });

      // Step 7: Verify modal closes
      await waitFor(() => {
        expect(screen.queryByText('Select Tasks for Review')).not.toBeInTheDocument();
      });
    });

    test('should handle sync failure gracefully', async () => {
      // Mock sync failure
      apiCall.mockRejectedValueOnce(new Error('Network timeout'));

      render(<TasksPanelComponent eventBus={mockEventBus} activePort={3000} />);

      const reviewButton = screen.getByText('📋 Review');
      fireEvent.click(reviewButton);

      await waitFor(() => {
        expect(screen.getByText(/Review failed: Network timeout/)).toBeInTheDocument();
      });

      // Modal should not open on sync failure
      expect(screen.queryByText('Select Tasks for Review')).not.toBeInTheDocument();
    });

    test('should handle review workflow failure', async () => {
      const TaskReviewService = require('@/application/services/TaskReviewService');
      const mockTaskReviewService = new TaskReviewService();
      
      mockTaskReviewService.executeTaskReviewWorkflow.mockRejectedValueOnce(
        new Error('Workflow execution failed')
      );

      render(<TasksPanelComponent eventBus={mockEventBus} activePort={3000} />);

      const reviewButton = screen.getByText('📋 Review');
      fireEvent.click(reviewButton);

      // Wait for sync to complete and modal to open
      await waitFor(() => {
        expect(screen.getByText('Select Tasks for Review')).toBeInTheDocument();
      });

      // Select tasks and start review
      const taskCheckboxes = screen.getAllByRole('checkbox');
      fireEvent.click(taskCheckboxes[0]);
      
      const startReviewButton = screen.getByText('Start Review');
      fireEvent.click(startReviewButton);

      await waitFor(() => {
        expect(screen.getByText(/Review failed: Workflow execution failed/)).toBeInTheDocument();
      });
    });
  });

  describe('Task Filtering and Selection', () => {
    test('should only show non-completed tasks for review', async () => {
      render(<TasksPanelComponent eventBus={mockEventBus} activePort={3000} />);

      const reviewButton = screen.getByText('📋 Review');
      fireEvent.click(reviewButton);

      await waitFor(() => {
        expect(screen.getByText('Select Tasks for Review')).toBeInTheDocument();
      });

      // Should only show 2 tasks (pending ones), not the completed one
      const taskItems = screen.getAllByText(/Task$/);
      expect(taskItems).toHaveLength(2);
      
      // Should not show completed task
      expect(screen.queryByText('Frontend Task')).not.toBeInTheDocument();
    });

    test('should show validation results', async () => {
      render(<TasksPanelComponent eventBus={mockEventBus} activePort={3000} />);

      const reviewButton = screen.getByText('📋 Review');
      fireEvent.click(reviewButton);

      await waitFor(() => {
        expect(screen.getByText(/Found 2 reviewable tasks/)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States and User Feedback', () => {
    test('should show loading state during sync', async () => {
      // Mock delayed sync response
      apiCall.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ 
            success: true, 
            data: { importedCount: 3 } 
          }), 100)
        )
      );

      render(<TasksPanelComponent eventBus={mockEventBus} activePort={3000} />);

      const reviewButton = screen.getByText('📋 Review');
      fireEvent.click(reviewButton);

      // Should show loading state
      expect(screen.getByText('Syncing...')).toBeInTheDocument();

      // Wait for sync to complete
      await waitFor(() => {
        expect(screen.queryByText('Syncing...')).not.toBeInTheDocument();
      });
    });

    test('should show loading state during review execution', async () => {
      const TaskReviewService = require('@/application/services/TaskReviewService');
      const mockTaskReviewService = new TaskReviewService();
      
      // Mock delayed review execution
      mockTaskReviewService.executeTaskReviewWorkflow.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            success: true,
            message: 'Review completed',
            data: { summary: { completedTasks: 1, totalTasks: 1 } }
          }), 100)
        )
      );

      render(<TasksPanelComponent eventBus={mockEventBus} activePort={3000} />);

      const reviewButton = screen.getByText('📋 Review');
      fireEvent.click(reviewButton);

      await waitFor(() => {
        expect(screen.getByText('Select Tasks for Review')).toBeInTheDocument();
      });

      const taskCheckboxes = screen.getAllByRole('checkbox');
      fireEvent.click(taskCheckboxes[0]);
      
      const startReviewButton = screen.getByText('Start Review');
      fireEvent.click(startReviewButton);

      // Should show loading state during review execution
      expect(screen.getByText('Starting review...')).toBeInTheDocument();
    });
  });

  describe('Browser Compatibility', () => {
    test('should work with different screen sizes', () => {
      // Test mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<TasksPanelComponent eventBus={mockEventBus} activePort={3000} />);

      // Should still show all essential elements
      expect(screen.getByText('📋 Task Management')).toBeInTheDocument();
      expect(screen.getByText('📋 Review')).toBeInTheDocument();
    });

    test('should handle keyboard navigation', async () => {
      render(<TasksPanelComponent eventBus={mockEventBus} activePort={3000} />);

      const reviewButton = screen.getByText('📋 Review');
      
      // Focus and activate with keyboard
      reviewButton.focus();
      fireEvent.keyDown(reviewButton, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Select Tasks for Review')).toBeInTheDocument();
      });
    });
  });
});
