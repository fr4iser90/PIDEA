import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskCreationModal from '@/presentation/components/chat/modal/TaskCreationModal';
import TaskCreationService from '@/application/services/TaskCreationService';

// Mock dependencies
jest.mock('@/application/services/TaskCreationService');
jest.mock('@/application/services/TaskReviewService');
jest.mock('@/css/modal/task-create-modal.css', () => ({}));

describe('TaskCreationModal', () => {
  let mockOnClose;
  let mockOnTaskCreated;
  let mockTaskCreationService;

  beforeEach(() => {
    mockOnClose = jest.fn();
    mockOnTaskCreated = jest.fn();
    mockTaskCreationService = {
      startTaskCreationWorkflow: jest.fn(),
      getWorkflowStatus: jest.fn(),
      cancelWorkflow: jest.fn()
    };
    
    TaskCreationService.mockImplementation(() => mockTaskCreationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should not render when isOpen is false', () => {
      render(
        <TaskCreationModal 
          isOpen={false} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );
      
      expect(screen.queryByText('🚀 Create New Task')).not.toBeInTheDocument();
    });

    test('should render modal when isOpen is true', () => {
      render(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );
      
      expect(screen.getByText('🚀 Create New Task')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /×/ })).toBeInTheDocument();
    });

    test('should render form step by default', () => {
      render(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );
      
      expect(screen.getByText('Task Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Task Type')).toBeInTheDocument();
      expect(screen.getByText('Priority')).toBeInTheDocument();
    });
  });

  describe('Modal State Management', () => {
    test('should reset modal state when opened', () => {
      const { rerender } = render(
        <TaskCreationModal 
          isOpen={false} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );

      rerender(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );

      // Modal should be in initial form state
      expect(screen.getByText('Task Title')).toBeInTheDocument();
    });

    test('should close modal when close button is clicked', () => {
      render(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );
      
      const closeButton = screen.getByRole('button', { name: /×/ });
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('should close modal when overlay is clicked', () => {
      render(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );
      
      const overlay = screen.getByTestId('modal-overlay');
      fireEvent.click(overlay);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('should not close modal when modal content is clicked', () => {
      render(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );
      
      const modalContent = screen.getByTestId('modal-content');
      fireEvent.click(modalContent);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    test('should show validation errors for empty required fields', async () => {
      render(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Task title is required')).toBeInTheDocument();
        expect(screen.getByText('Description is required')).toBeInTheDocument();
        expect(screen.getByText('Task type is required')).toBeInTheDocument();
        expect(screen.getByText('Priority is required')).toBeInTheDocument();
      });
    });

    test('should validate task title length', async () => {
      render(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );
      
      const titleInput = screen.getByLabelText(/task title/i);
      fireEvent.change(titleInput, { target: { value: 'A'.repeat(101) } });
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Task title must be less than 100 characters')).toBeInTheDocument();
      });
    });

    test('should validate description length', async () => {
      render(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );
      
      const descriptionInput = screen.getByLabelText(/description/i);
      fireEvent.change(descriptionInput, { target: { value: 'A'.repeat(1001) } });
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Description must be less than 1000 characters')).toBeInTheDocument();
      });
    });

    test('should validate estimated time format', async () => {
      render(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );
      
      const timeInput = screen.getByLabelText(/estimated time/i);
      fireEvent.change(timeInput, { target: { value: 'invalid' } });
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Estimated time must be a valid number')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    test('should submit form with valid data', async () => {
      mockTaskCreationService.startTaskCreationWorkflow.mockResolvedValue({
        workflowId: 'test-workflow-123',
        success: true,
        status: 'started'
      });

      render(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );
      
      // Fill form with valid data
      fireEvent.change(screen.getByLabelText(/task title/i), { 
        target: { value: 'Test Task' } 
      });
      fireEvent.change(screen.getByLabelText(/description/i), { 
        target: { value: 'Test description' } 
      });
      fireEvent.change(screen.getByLabelText(/task type/i), { 
        target: { value: 'feature' } 
      });
      fireEvent.change(screen.getByLabelText(/priority/i), { 
        target: { value: 'medium' } 
      });
      fireEvent.change(screen.getByLabelText(/category/i), { 
        target: { value: 'frontend' } 
      });
      fireEvent.change(screen.getByLabelText(/estimated time/i), { 
        target: { value: '2' } 
      });
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockTaskCreationService.startTaskCreationWorkflow).toHaveBeenCalledWith({
          title: 'Test Task',
          description: 'Test description',
          type: 'feature',
          priority: 'medium',
          category: 'frontend',
          estimatedTime: 2
        });
      });
    });

    test('should handle form submission errors', async () => {
      mockTaskCreationService.startTaskCreationWorkflow.mockRejectedValue(
        new Error('Network error')
      );

      render(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );
      
      // Fill form with valid data
      fireEvent.change(screen.getByLabelText(/task title/i), { 
        target: { value: 'Test Task' } 
      });
      fireEvent.change(screen.getByLabelText(/description/i), { 
        target: { value: 'Test description' } 
      });
      fireEvent.change(screen.getByLabelText(/task type/i), { 
        target: { value: 'feature' } 
      });
      fireEvent.change(screen.getByLabelText(/priority/i), { 
        target: { value: 'medium' } 
      });
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Workflow Progress', () => {
    test('should show progress step after successful form submission', async () => {
      mockTaskCreationService.startTaskCreationWorkflow.mockResolvedValue({
        workflowId: 'test-workflow-123',
        success: true,
        status: 'started'
      });

      render(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );
      
      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/task title/i), { 
        target: { value: 'Test Task' } 
      });
      fireEvent.change(screen.getByLabelText(/description/i), { 
        target: { value: 'Test description' } 
      });
      fireEvent.change(screen.getByLabelText(/task type/i), { 
        target: { value: 'feature' } 
      });
      fireEvent.change(screen.getByLabelText(/priority/i), { 
        target: { value: 'medium' } 
      });
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/initializing workflow/i)).toBeInTheDocument();
        expect(screen.getByText(/0% complete/i)).toBeInTheDocument();
      });
    });

    test('should handle workflow cancellation', async () => {
      mockTaskCreationService.cancelWorkflow.mockResolvedValue({
        success: true,
        message: 'Workflow cancelled'
      });

      render(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );
      
      // Mock being in progress state
      const modal = screen.getByTestId('task-create-modal');
      modal.dataset.currentStep = 'progress';
      modal.dataset.workflowId = 'test-workflow-123';
      
      const closeButton = screen.getByRole('button', { name: /×/ });
      fireEvent.click(closeButton);
      
      // Should show confirmation dialog
      expect(screen.getByText(/task execution is in progress/i)).toBeInTheDocument();
      
      // Confirm cancellation
      const confirmButton = screen.getByRole('button', { name: /yes/i });
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockTaskCreationService.cancelWorkflow).toHaveBeenCalledWith('test-workflow-123');
      });
    });
  });

  describe('Review Modal', () => {
    test('should show review modal when review data is available', () => {
      render(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );
      
      // Mock review data
      const modal = screen.getByTestId('task-create-modal');
      modal.dataset.reviewData = JSON.stringify({
        title: 'Test Task',
        description: 'Test description',
        type: 'feature',
        priority: 'medium'
      });
      modal.dataset.isReviewModalOpen = 'true';
      
      expect(screen.getByText(/review task details/i)).toBeInTheDocument();
    });

    test('should handle review modal actions', async () => {
      render(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );
      
      // Mock review modal open
      const modal = screen.getByTestId('task-create-modal');
      modal.dataset.isReviewModalOpen = 'true';
      
      const executeButton = screen.getByRole('button', { name: /execute task/i });
      fireEvent.click(executeButton);
      
      await waitFor(() => {
        expect(screen.getByText(/initializing workflow/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );
      
      expect(screen.getByLabelText(/task title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/task type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    });

    test('should support keyboard navigation', () => {
      render(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );
      
      const closeButton = screen.getByRole('button', { name: /×/ });
      expect(closeButton).toHaveAttribute('tabindex', '0');
      
      // Test escape key
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalled();
    });

    test('should have proper focus management', () => {
      render(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );
      
      const titleInput = screen.getByLabelText(/task title/i);
      expect(titleInput).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    test('should display API errors', async () => {
      mockTaskCreationService.startTaskCreationWorkflow.mockRejectedValue(
        new Error('API Error: Invalid request')
      );

      render(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );
      
      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/task title/i), { 
        target: { value: 'Test Task' } 
      });
      fireEvent.change(screen.getByLabelText(/description/i), { 
        target: { value: 'Test description' } 
      });
      fireEvent.change(screen.getByLabelText(/task type/i), { 
        target: { value: 'feature' } 
      });
      fireEvent.change(screen.getByLabelText(/priority/i), { 
        target: { value: 'medium' } 
      });
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('API Error: Invalid request')).toBeInTheDocument();
      });
    });

    test('should handle network errors gracefully', async () => {
      mockTaskCreationService.startTaskCreationWorkflow.mockRejectedValue(
        new Error('Network Error: Failed to fetch')
      );

      render(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );
      
      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/task title/i), { 
        target: { value: 'Test Task' } 
      });
      fireEvent.change(screen.getByLabelText(/description/i), { 
        target: { value: 'Test description' } 
      });
      fireEvent.change(screen.getByLabelText(/task type/i), { 
        target: { value: 'feature' } 
      });
      fireEvent.change(screen.getByLabelText(/priority/i), { 
        target: { value: 'medium' } 
      });
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Network Error: Failed to fetch')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });
}); 