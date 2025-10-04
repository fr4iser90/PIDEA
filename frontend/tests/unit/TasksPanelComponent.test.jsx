/**
 * TasksPanelComponent.test.jsx
 * Unit tests for TasksPanelComponent sync integration
 * Created: 2025-10-04T00:25:45.000Z
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TasksPanelComponent from '@/presentation/components/chat/sidebar-right/TasksPanelComponent';
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
        title: 'Test Task 1',
        status: { value: 'pending' },
        priority: { value: 'high' },
        category: 'backend'
      },
      {
        id: 'task-2',
        title: 'Test Task 2',
        status: { value: 'completed' },
        priority: { value: 'medium' },
        category: 'frontend'
      }
    ],
    hasTasks: true,
    taskCount: 2,
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
      message: 'Review completed successfully',
      data: { summary: { completedTasks: 1, totalTasks: 1 } }
    }),
    validateTaskStatus: jest.fn().mockResolvedValue({
      success: true,
      validTasks: [{ id: 'task-1', title: 'Test Task 1' }],
      completedTasks: [{ id: 'task-2', title: 'Test Task 2' }],
      totalTasks: 2,
      message: 'Found 1 reviewable tasks (1 completed tasks excluded)'
    })
  }));
});

describe('TasksPanelComponent Sync Integration', () => {
  const mockEventBus = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    apiCall.mockResolvedValue({
      success: true,
      data: { importedCount: 2 }
    });
  });

  describe('Sync Before Review Modal', () => {
    test('should call sync before opening review modal', async () => {
      render(<TasksPanelComponent eventBus={mockEventBus} activePort={3000} />);

      // Find and click the Review button
      const reviewButton = screen.getByText('📋 Review');
      expect(reviewButton).toBeInTheDocument();

      fireEvent.click(reviewButton);

      // Wait for sync to be called BEFORE modal opens
      await waitFor(() => {
        expect(apiCall).toHaveBeenCalledWith(
          '/api/projects/test-project-id/tasks/sync-manual',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ projectPath: '/test/project' })
          })
        );
      });

      // Modal should open AFTER sync completes
      await waitFor(() => {
        expect(screen.getByText('Select Tasks for Review')).toBeInTheDocument();
      });
    });

    test('should handle sync errors gracefully', async () => {
      apiCall.mockRejectedValueOnce(new Error('Sync failed'));

      render(<TasksPanelComponent eventBus={mockEventBus} activePort={3000} />);

      const reviewButton = screen.getByText('📋 Review');
      fireEvent.click(reviewButton);

      await waitFor(() => {
        expect(screen.getByText(/Review failed: Sync failed/)).toBeInTheDocument();
      });
    });

    test('should show loading state during sync', async () => {
      // Mock a delayed sync response
      apiCall.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ success: true, data: { importedCount: 2 } }), 100)
        )
      );

      render(<TasksPanelComponent eventBus={mockEventBus} activePort={3000} />);

      const reviewButton = screen.getByText('📋 Review');
      fireEvent.click(reviewButton);

      // Should show loading state
      expect(screen.getByText('Syncing...')).toBeInTheDocument();
    });
  });

  describe('Task Status Validation', () => {
    test('should filter out completed tasks from review', async () => {
      const TaskReviewService = require('@/application/services/TaskReviewService');
      const mockTaskReviewService = new TaskReviewService();

      render(<TasksPanelComponent eventBus={mockEventBus} activePort={3000} />);

      const reviewButton = screen.getByText('📋 Review');
      fireEvent.click(reviewButton);

      await waitFor(() => {
        expect(mockTaskReviewService.validateTaskStatus).toHaveBeenCalled();
      });
    });

    test('should show validation results in feedback', async () => {
      render(<TasksPanelComponent eventBus={mockEventBus} activePort={3000} />);

      const reviewButton = screen.getByText('📋 Review');
      fireEvent.click(reviewButton);

      await waitFor(() => {
        expect(screen.getByText(/Found 1 reviewable tasks/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle network failures during sync', async () => {
      apiCall.mockRejectedValueOnce(new Error('Network error'));

      render(<TasksPanelComponent eventBus={mockEventBus} activePort={3000} />);

      const reviewButton = screen.getByText('📋 Review');
      fireEvent.click(reviewButton);

      await waitFor(() => {
        expect(screen.getByText(/Review failed: Network error/)).toBeInTheDocument();
      });
    });

    test('should handle partial sync failures', async () => {
      apiCall.mockResolvedValueOnce({
        success: false,
        error: 'Partial sync failed'
      });

      render(<TasksPanelComponent eventBus={mockEventBus} activePort={3000} />);

      const reviewButton = screen.getByText('📋 Review');
      fireEvent.click(reviewButton);

      await waitFor(() => {
        expect(screen.getByText(/Review failed: Partial sync failed/)).toBeInTheDocument();
      });
    });
  });

  describe('Integration with Existing Components', () => {
    test('should maintain existing functionality after sync integration', () => {
      render(<TasksPanelComponent eventBus={mockEventBus} activePort={3000} />);

      // Verify existing elements are still present
      expect(screen.getByText('📋 Task Management')).toBeInTheDocument();
      expect(screen.getByText('➕ Create')).toBeInTheDocument();
      expect(screen.getByText('🔄 Sync')).toBeInTheDocument();
      expect(screen.getByText('📋 Review')).toBeInTheDocument();
    });

    test('should refresh task list after successful sync', async () => {
      const { useProjectDataActions } = require('@/infrastructure/stores/selectors/ProjectSelectors');
      const mockLoadProjectTasks = jest.fn();
      
      useProjectDataActions.mockReturnValue({
        loadProjectTasks: mockLoadProjectTasks
      });

      render(<TasksPanelComponent eventBus={mockEventBus} activePort={3000} />);

      const reviewButton = screen.getByText('📋 Review');
      fireEvent.click(reviewButton);

      await waitFor(() => {
        expect(mockLoadProjectTasks).toHaveBeenCalledWith('/test/project');
      });
    });
  });
});
