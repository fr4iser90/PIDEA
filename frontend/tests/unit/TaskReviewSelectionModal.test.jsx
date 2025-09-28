import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskReviewSelectionModal from '@/presentation/components/chat/modal/TaskReviewSelectionModal';

// Mock tasks data
const mockTasks = [
  {
    id: '1',
    title: 'Task 1',
    description: 'Description for task 1',
    priority: { value: 'high' },
    status: { value: 'pending' },
    category: { value: 'frontend' },
    createdAt: '2025-01-01T10:00:00Z',
    estimatedHours: 2
  },
  {
    id: '2',
    title: 'Task 2',
    description: 'Description for task 2',
    priority: { value: 'medium' },
    status: { value: 'in-progress' },
    category: { value: 'backend' },
    createdAt: '2025-01-02T10:00:00Z',
    estimatedHours: 4
  },
  {
    id: '3',
    title: 'Task 3',
    description: 'Description for task 3',
    priority: { value: 'low' },
    status: { value: 'completed' },
    category: { value: 'testing' },
    createdAt: '2025-01-03T10:00:00Z',
    estimatedHours: 1
  }
];

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  tasks: mockTasks,
  onStartReview: jest.fn(),
  isLoading: false
};

describe('TaskReviewSelectionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders modal when isOpen is true', () => {
      render(<TaskReviewSelectionModal {...defaultProps} />);
      
      expect(screen.getByText('📋 Select Tasks for Review')).toBeInTheDocument();
      expect(screen.getByText('Select tasks to review. Completed tasks are automatically excluded.')).toBeInTheDocument();
    });

    it('does not render modal when isOpen is false', () => {
      render(<TaskReviewSelectionModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('📋 Select Tasks for Review')).not.toBeInTheDocument();
    });

    it('shows task count in summary', () => {
      render(<TaskReviewSelectionModal {...defaultProps} />);
      
      // Should show 2 tasks (excluding completed task)
      expect(screen.getByText('2 of 2 tasks selected')).toBeInTheDocument();
    });

    it('displays all reviewable tasks', () => {
      render(<TaskReviewSelectionModal {...defaultProps} />);
      
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
      // Completed task should not be shown
      expect(screen.queryByText('Task 3')).not.toBeInTheDocument();
    });
  });

  describe('Task Selection', () => {
    it('allows individual task selection', () => {
      render(<TaskReviewSelectionModal {...defaultProps} />);
      
      const task1Checkbox = screen.getByLabelText(/Task 1/i);
      fireEvent.click(task1Checkbox);
      
      expect(screen.getByText('1 of 2 tasks selected')).toBeInTheDocument();
    });

    it('allows select all functionality', () => {
      render(<TaskReviewSelectionModal {...defaultProps} />);
      
      const selectAllCheckbox = screen.getByLabelText(/Select All/i);
      fireEvent.click(selectAllCheckbox);
      
      expect(screen.getByText('2 of 2 tasks selected')).toBeInTheDocument();
    });

    it('allows deselect all functionality', () => {
      render(<TaskReviewSelectionModal {...defaultProps} />);
      
      const selectAllCheckbox = screen.getByLabelText(/Select All/i);
      
      // First select all
      fireEvent.click(selectAllCheckbox);
      expect(screen.getByText('2 of 2 tasks selected')).toBeInTheDocument();
      
      // Then deselect all
      fireEvent.click(selectAllCheckbox);
      expect(screen.getByText('0 of 2 tasks selected')).toBeInTheDocument();
    });

    it('disables start review button when no tasks selected', () => {
      render(<TaskReviewSelectionModal {...defaultProps} />);
      
      const startReviewButton = screen.getByText(/Start Review/i);
      expect(startReviewButton).toBeDisabled();
    });

    it('enables start review button when tasks are selected', () => {
      render(<TaskReviewSelectionModal {...defaultProps} />);
      
      const task1Checkbox = screen.getByLabelText(/Task 1/i);
      fireEvent.click(task1Checkbox);
      
      const startReviewButton = screen.getByText(/Start Review \(1\)/i);
      expect(startReviewButton).toBeEnabled();
    });
  });

  describe('Task Filtering', () => {
    it('filters tasks by category', () => {
      render(<TaskReviewSelectionModal {...defaultProps} />);
      
      const categorySelect = screen.getByDisplayValue('All Categories');
      fireEvent.change(categorySelect, { target: { value: 'frontend' } });
      
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.queryByText('Task 2')).not.toBeInTheDocument();
    });

    it('filters tasks by priority', () => {
      render(<TaskReviewSelectionModal {...defaultProps} />);
      
      const prioritySelect = screen.getByDisplayValue('All Priorities');
      fireEvent.change(prioritySelect, { target: { value: 'high' } });
      
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.queryByText('Task 2')).not.toBeInTheDocument();
    });

    it('filters tasks by status', () => {
      render(<TaskReviewSelectionModal {...defaultProps} />);
      
      const statusSelect = screen.getByDisplayValue('All Statuses');
      fireEvent.change(statusSelect, { target: { value: 'pending' } });
      
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.queryByText('Task 2')).not.toBeInTheDocument();
    });
  });

  describe('Task Sorting', () => {
    it('sorts tasks by priority', () => {
      render(<TaskReviewSelectionModal {...defaultProps} />);
      
      const sortSelect = screen.getByDisplayValue('Priority');
      fireEvent.change(sortSelect, { target: { value: 'priority' } });
      
      const taskItems = screen.getAllByRole('checkbox');
      // Task 1 (high priority) should come before Task 2 (medium priority)
      expect(taskItems[0]).toHaveAccessibleName(/Task 1/i);
    });

    it('sorts tasks by name', () => {
      render(<TaskReviewSelectionModal {...defaultProps} />);
      
      const sortSelect = screen.getByDisplayValue('Priority');
      fireEvent.change(sortSelect, { target: { value: 'name' } });
      
      const taskItems = screen.getAllByRole('checkbox');
      // Tasks should be sorted alphabetically
      expect(taskItems[0]).toHaveAccessibleName(/Task 1/i);
    });

    it('toggles sort order', () => {
      render(<TaskReviewSelectionModal {...defaultProps} />);
      
      const sortOrderButton = screen.getByTitle(/Sort/i);
      fireEvent.click(sortOrderButton);
      
      // Should show descending order indicator
      expect(sortOrderButton).toHaveTextContent('↓');
    });
  });

  describe('Task Expansion', () => {
    it('allows task expansion to show details', () => {
      render(<TaskReviewSelectionModal {...defaultProps} />);
      
      const expandButton = screen.getAllByText('+')[0];
      fireEvent.click(expandButton);
      
      expect(screen.getByText('Description for task 1')).toBeInTheDocument();
      expect(screen.getByText('Estimated: 2 hours')).toBeInTheDocument();
    });

    it('allows task collapse to hide details', () => {
      render(<TaskReviewSelectionModal {...defaultProps} />);
      
      const expandButton = screen.getAllByText('+')[0];
      fireEvent.click(expandButton);
      
      // Should show details
      expect(screen.getByText('Description for task 1')).toBeInTheDocument();
      
      // Click again to collapse
      const collapseButton = screen.getByText('−');
      fireEvent.click(collapseButton);
      
      // Details should be hidden
      expect(screen.queryByText('Description for task 1')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onClose when cancel button is clicked', () => {
      render(<TaskReviewSelectionModal {...defaultProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when close button is clicked', () => {
      render(<TaskReviewSelectionModal {...defaultProps} />);
      
      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when overlay is clicked', () => {
      render(<TaskReviewSelectionModal {...defaultProps} />);
      
      const overlay = screen.getByRole('dialog').parentElement;
      fireEvent.click(overlay);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onStartReview with selected tasks when start review is clicked', () => {
      render(<TaskReviewSelectionModal {...defaultProps} />);
      
      // Select a task
      const task1Checkbox = screen.getByLabelText(/Task 1/i);
      fireEvent.click(task1Checkbox);
      
      // Click start review
      const startReviewButton = screen.getByText(/Start Review \(1\)/i);
      fireEvent.click(startReviewButton);
      
      expect(defaultProps.onStartReview).toHaveBeenCalledWith([mockTasks[0]]);
    });

    it('does not call onStartReview when no tasks are selected', () => {
      render(<TaskReviewSelectionModal {...defaultProps} />);
      
      const startReviewButton = screen.getByText(/Start Review/i);
      fireEvent.click(startReviewButton);
      
      expect(defaultProps.onStartReview).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('shows loading state on start review button', () => {
      render(<TaskReviewSelectionModal {...defaultProps} isLoading={true} />);
      
      expect(screen.getByText('Starting Review...')).toBeInTheDocument();
    });

    it('disables buttons when loading', () => {
      render(<TaskReviewSelectionModal {...defaultProps} isLoading={true} />);
      
      const cancelButton = screen.getByText('Cancel');
      const startReviewButton = screen.getByText('Starting Review...');
      
      expect(cancelButton).toBeDisabled();
      expect(startReviewButton).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty tasks array', () => {
      render(<TaskReviewSelectionModal {...defaultProps} tasks={[]} />);
      
      expect(screen.getByText('No reviewable tasks found.')).toBeInTheDocument();
      expect(screen.getByText('All tasks may be completed or filtered out.')).toBeInTheDocument();
    });

    it('handles tasks with missing properties', () => {
      const incompleteTasks = [
        {
          id: '1',
          title: 'Task without priority',
          status: { value: 'pending' }
        }
      ];
      
      render(<TaskReviewSelectionModal {...defaultProps} tasks={incompleteTasks} />);
      
      expect(screen.getByText('Task without priority')).toBeInTheDocument();
    });

    it('handles tasks with string values instead of objects', () => {
      const stringValueTasks = [
        {
          id: '1',
          title: 'Task with string values',
          priority: 'high',
          status: 'pending',
          category: 'frontend'
        }
      ];
      
      render(<TaskReviewSelectionModal {...defaultProps} tasks={stringValueTasks} />);
      
      expect(screen.getByText('Task with string values')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<TaskReviewSelectionModal {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/Select All/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(<TaskReviewSelectionModal {...defaultProps} />);
      
      const firstCheckbox = screen.getAllByRole('checkbox')[0];
      firstCheckbox.focus();
      
      expect(firstCheckbox).toHaveFocus();
    });
  });
});
