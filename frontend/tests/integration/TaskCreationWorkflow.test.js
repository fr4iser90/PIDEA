import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskCreationModal from '@/presentation/components/chat/modal/TaskCreationModal';
import TaskCreationService from '@/application/services/TaskCreationService';
import TaskWorkflowRepository from '@/infrastructure/repositories/TaskWorkflowRepository';

// Mock dependencies
jest.mock('@/application/services/TaskCreationService');
jest.mock('@/application/services/TaskReviewService');
jest.mock('@/infrastructure/repositories/TaskWorkflowRepository');
jest.mock('@/infrastructure/repositories/APIChatRepository');
jest.mock('@/css/modal/task-create-modal.css', () => ({}));
jest.mock('@/css/modal/task-workflow-progress.css', () => ({}));

// Mock event bus
const mockEventBus = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn()
};

global.window = {
  ...global.window,
  eventBus: mockEventBus
};

describe('TaskCreationWorkflow Integration', () => {
  let mockOnClose;
  let mockOnTaskCreated;
  let mockTaskCreationService;
  let mockTaskWorkflowRepository;

  beforeEach(() => {
    mockOnClose = jest.fn();
    mockOnTaskCreated = jest.fn();
    
    mockTaskCreationService = {
      startTaskCreationWorkflow: jest.fn(),
      getWorkflowStatus: jest.fn(),
      cancelWorkflow: jest.fn(),
      trackWorkflowProgress: jest.fn()
    };
    
    mockTaskWorkflowRepository = {
      executeWorkflow: jest.fn(),
      getWorkflowStatus: jest.fn(),
      cancelWorkflow: jest.fn(),
      updateWorkflow: jest.fn()
    };
    
    TaskCreationService.mockImplementation(() => mockTaskCreationService);
    TaskWorkflowRepository.mockImplementation(() => mockTaskWorkflowRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Workflow Integration', () => {
    test('should execute complete workflow from form to completion', async () => {
      // Mock successful workflow start
      mockTaskCreationService.startTaskCreationWorkflow.mockResolvedValue({
        workflowId: 'test-workflow-123',
        success: true,
        status: 'started',
        chatResult: { messageId: 'chat-123' },
        autoFinishResult: { sessionId: 'session-123' }
      });

      // Mock workflow status updates
      mockTaskCreationService.getWorkflowStatus
        .mockResolvedValueOnce({
          workflowId: 'test-workflow-123',
          status: 'running',
          step: 'ai_planning',
          progress: 20,
          details: 'AI is analyzing the task requirements'
        })
        .mockResolvedValueOnce({
          workflowId: 'test-workflow-123',
          status: 'running',
          step: 'implementation',
          progress: 50,
          details: 'Implementing the requested features'
        })
        .mockResolvedValueOnce({
          workflowId: 'test-workflow-123',
          status: 'completed',
          step: 'completed',
          progress: 100,
          details: 'Task creation completed successfully!',
          result: {
            filesCreated: ['src/components/NewFeature.jsx'],
            filesModified: ['src/App.jsx'],
            tasksCompleted: 1
          }
        });

      render(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );

      // Step 1: Fill out the form
      fireEvent.change(screen.getByLabelText(/task title/i), { 
        target: { value: 'Create User Authentication System' } 
      });
      fireEvent.change(screen.getByLabelText(/description/i), { 
        target: { value: 'Implement JWT-based authentication with login/logout functionality' } 
      });
      fireEvent.change(screen.getByLabelText(/task type/i), { 
        target: { value: 'feature' } 
      });
      fireEvent.change(screen.getByLabelText(/priority/i), { 
        target: { value: 'high' } 
      });
      fireEvent.change(screen.getByLabelText(/category/i), { 
        target: { value: 'security' } 
      });
      fireEvent.change(screen.getByLabelText(/estimated time/i), { 
        target: { value: '4' } 
      });

      // Step 2: Submit the form
      const submitButton = screen.getByRole('button', { name: /create task/i });
      fireEvent.click(submitButton);

      // Step 3: Verify workflow started
      await waitFor(() => {
        expect(mockTaskCreationService.startTaskCreationWorkflow).toHaveBeenCalledWith({
          title: 'Create User Authentication System',
          description: 'Implement JWT-based authentication with login/logout functionality',
          type: 'feature',
          priority: 'high',
          category: 'security',
          estimatedTime: 4
        });
      });

      // Step 4: Verify progress tracking started
      await waitFor(() => {
        expect(screen.getByText(/initializing workflow/i)).toBeInTheDocument();
      });

      // Step 5: Simulate progress updates
      const progressEvent = {
        workflowId: 'test-workflow-123',
        status: 'running',
        step: 'ai_planning',
        progress: 20,
        details: 'AI is analyzing the task requirements'
      };

      mockEventBus.emit('task-create:progress', progressEvent);

      await waitFor(() => {
        expect(screen.getByText(/ai planning & analysis/i)).toBeInTheDocument();
        expect(screen.getByText(/20% complete/i)).toBeInTheDocument();
      });

      // Step 6: Simulate completion
      const completionEvent = {
        workflowId: 'test-workflow-123',
        status: 'completed',
        step: 'completed',
        progress: 100,
        details: 'Task creation completed successfully!',
        result: {
          filesCreated: ['src/components/NewFeature.jsx'],
          filesModified: ['src/App.jsx'],
          tasksCompleted: 1
        }
      };

      mockEventBus.emit('task-create:completed', completionEvent);

      await waitFor(() => {
        expect(screen.getByText(/task processing complete/i)).toBeInTheDocument();
        expect(screen.getByText(/your task has been processed successfully/i)).toBeInTheDocument();
      });

      // Step 7: Verify completion callback
      await waitFor(() => {
        expect(mockOnTaskCreated).toHaveBeenCalledWith({
          workflowId: 'test-workflow-123',
          status: 'completed',
          result: {
            filesCreated: ['src/components/NewFeature.jsx'],
            filesModified: ['src/App.jsx'],
            tasksCompleted: 1
          }
        });
      });
    });

    test('should handle workflow errors and provide recovery options', async () => {
      // Mock workflow start with error
      mockTaskCreationService.startTaskCreationWorkflow.mockRejectedValue(
        new Error('API Error: Service unavailable')
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

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText('API Error: Service unavailable')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });

      // Test retry functionality
      mockTaskCreationService.startTaskCreationWorkflow.mockResolvedValue({
        workflowId: 'test-workflow-123',
        success: true,
        status: 'started'
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockTaskCreationService.startTaskCreationWorkflow).toHaveBeenCalledTimes(2);
      });
    });

    test('should handle workflow cancellation during execution', async () => {
      // Mock successful workflow start
      mockTaskCreationService.startTaskCreationWorkflow.mockResolvedValue({
        workflowId: 'test-workflow-123',
        success: true,
        status: 'started'
      });

      // Mock cancellation
      mockTaskCreationService.cancelWorkflow.mockResolvedValue({
        success: true,
        message: 'Workflow cancelled successfully'
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

      // Wait for progress step
      await waitFor(() => {
        expect(screen.getByText(/initializing workflow/i)).toBeInTheDocument();
      });

      // Simulate progress to running state
      mockEventBus.emit('task-create:progress', {
        workflowId: 'test-workflow-123',
        status: 'running',
        step: 'implementation',
        progress: 50
      });

      await waitFor(() => {
        expect(screen.getByText(/implementation/i)).toBeInTheDocument();
      });

      // Cancel the workflow
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Verify cancellation
      await waitFor(() => {
        expect(mockTaskCreationService.cancelWorkflow).toHaveBeenCalledWith('test-workflow-123');
      });

      // Simulate cancellation event
      mockEventBus.emit('task-create:cancelled', {
        workflowId: 'test-workflow-123',
        status: 'cancelled',
        details: 'Task creation was cancelled'
      });

      await waitFor(() => {
        expect(screen.getByText(/task creation was cancelled/i)).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    test('should integrate with backend API endpoints correctly', async () => {
      // Mock API responses
      mockTaskWorkflowRepository.executeWorkflow.mockResolvedValue({
        workflowId: 'api-workflow-123',
        status: 'started',
        message: 'Workflow initiated successfully'
      });

      mockTaskWorkflowRepository.getWorkflowStatus.mockResolvedValue({
        workflowId: 'api-workflow-123',
        status: 'running',
        progress: 75,
        step: 'testing'
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
        target: { value: 'API Integration Test' } 
      });
      fireEvent.change(screen.getByLabelText(/description/i), { 
        target: { value: 'Test API integration' } 
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
        expect(mockTaskWorkflowRepository.executeWorkflow).toHaveBeenCalled();
      });
    });

    test('should handle API timeout and retry logic', async () => {
      // Mock timeout error
      mockTaskCreationService.startTaskCreationWorkflow.mockRejectedValue(
        new Error('Request timeout')
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
        target: { value: 'Timeout Test' } 
      });
      fireEvent.change(screen.getByLabelText(/description/i), { 
        target: { value: 'Test timeout handling' } 
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
        expect(screen.getByText('Request timeout')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('Event Bus Communication', () => {
    test('should properly subscribe to and handle event bus events', async () => {
      render(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );

      // Verify event bus subscription
      expect(mockEventBus.on).toHaveBeenCalledWith('task-create:progress', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('task-create:completed', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('task-create:error', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('task-create:cancelled', expect.any(Function));
    });

    test('should emit progress events during workflow execution', async () => {
      mockTaskCreationService.startTaskCreationWorkflow.mockResolvedValue({
        workflowId: 'event-test-123',
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
        target: { value: 'Event Test' } 
      });
      fireEvent.change(screen.getByLabelText(/description/i), { 
        target: { value: 'Test event emission' } 
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
        expect(mockEventBus.emit).toHaveBeenCalledWith('task-create:progress', expect.objectContaining({
          workflowId: 'event-test-123',
          status: 'started'
        }));
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should handle network disconnection and reconnection', async () => {
      // Mock initial failure then success
      mockTaskCreationService.startTaskCreationWorkflow
        .mockRejectedValueOnce(new Error('Network disconnected'))
        .mockResolvedValueOnce({
          workflowId: 'recovery-test-123',
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
        target: { value: 'Recovery Test' } 
      });
      fireEvent.change(screen.getByLabelText(/description/i), { 
        target: { value: 'Test network recovery' } 
      });
      fireEvent.change(screen.getByLabelText(/task type/i), { 
        target: { value: 'feature' } 
      });
      fireEvent.change(screen.getByLabelText(/priority/i), { 
        target: { value: 'medium' } 
      });

      const submitButton = screen.getByRole('button', { name: /create task/i });
      fireEvent.click(submitButton);

      // Verify initial error
      await waitFor(() => {
        expect(screen.getByText('Network disconnected')).toBeInTheDocument();
      });

      // Retry after network recovery
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      // Verify successful retry
      await waitFor(() => {
        expect(mockTaskCreationService.startTaskCreationWorkflow).toHaveBeenCalledTimes(2);
      });
    });

    test('should handle partial workflow failures gracefully', async () => {
      // Mock workflow start success but status check failure
      mockTaskCreationService.startTaskCreationWorkflow.mockResolvedValue({
        workflowId: 'partial-failure-123',
        success: true,
        status: 'started'
      });

      mockTaskCreationService.getWorkflowStatus.mockRejectedValue(
        new Error('Status check failed')
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
        target: { value: 'Partial Failure Test' } 
      });
      fireEvent.change(screen.getByLabelText(/description/i), { 
        target: { value: 'Test partial failure handling' } 
      });
      fireEvent.change(screen.getByLabelText(/task type/i), { 
        target: { value: 'feature' } 
      });
      fireEvent.change(screen.getByLabelText(/priority/i), { 
        target: { value: 'medium' } 
      });

      const submitButton = screen.getByRole('button', { name: /create task/i });
      fireEvent.click(submitButton);

      // Verify graceful handling of partial failure
      await waitFor(() => {
        expect(screen.getByText(/initializing workflow/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Resource Management', () => {
    test('should clean up event listeners on unmount', () => {
      const { unmount } = render(
        <TaskCreationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onTaskCreated={mockOnTaskCreated} 
        />
      );

      unmount();

      // Verify cleanup
      expect(mockEventBus.off).toHaveBeenCalledWith('task-create:progress', expect.any(Function));
      expect(mockEventBus.off).toHaveBeenCalledWith('task-create:completed', expect.any(Function));
      expect(mockEventBus.off).toHaveBeenCalledWith('task-create:error', expect.any(Function));
      expect(mockEventBus.off).toHaveBeenCalledWith('task-create:cancelled', expect.any(Function));
    });

    test('should handle multiple rapid form submissions gracefully', async () => {
      mockTaskCreationService.startTaskCreationWorkflow.mockResolvedValue({
        workflowId: 'rapid-test-123',
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

      // Fill form
      fireEvent.change(screen.getByLabelText(/task title/i), { 
        target: { value: 'Rapid Test' } 
      });
      fireEvent.change(screen.getByLabelText(/description/i), { 
        target: { value: 'Test rapid submissions' } 
      });
      fireEvent.change(screen.getByLabelText(/task type/i), { 
        target: { value: 'feature' } 
      });
      fireEvent.change(screen.getByLabelText(/priority/i), { 
        target: { value: 'medium' } 
      });

      const submitButton = screen.getByRole('button', { name: /create task/i });

      // Rapid clicks
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      // Should only call once due to loading state
      await waitFor(() => {
        expect(mockTaskCreationService.startTaskCreationWorkflow).toHaveBeenCalledTimes(1);
      });
    });
  });
}); 