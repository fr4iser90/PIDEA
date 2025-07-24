import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SidebarRight from '../../src/presentation/components/SidebarRight';
import ManualTaskDetailsModal from '../../src/presentation/components/chat/modal/ManualTaskDetailsModal';
import APIChatRepository from '../../src/infrastructure/repositories/APIChatRepository';

// Mock the API repository
jest.mock('../../src/infrastructure/repositories/APIChatRepository');

// Mock the marked library
jest.mock('marked', () => ({
  setOptions: jest.fn(),
  __esModule: true,
  default: jest.fn((text) => `<p>${text}</p>`)
}));

describe('ManualTasks Integration Tests', () => {
  let mockApi;
  let mockEventBus;

  beforeEach(() => {
    mockApi = {
      getManualTasks: jest.fn(),
      getManualTaskDetails: jest.fn(),
      syncManualTasks: jest.fn(),
      cleanManualTasks: jest.fn(),
      createTask: jest.fn(),
      getTasks: jest.fn(),
      executeTask: jest.fn(),
      startAutoMode: jest.fn(),
      stopAutoMode: jest.fn(),
      startAutoRefactor: jest.fn(),
      analyzeProject: jest.fn(),
      detectWorkspacePaths: jest.fn(),
      getCurrentProjectId: jest.fn().mockResolvedValue('default')
    };

    mockEventBus = {
      emit: jest.fn()
    };

    // Mock the APIChatRepository constructor
    APIChatRepository.mockImplementation(() => mockApi);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('SidebarRight - Manual Tasks Integration', () => {
    it('should load and display manual tasks on mount', async () => {
      const mockManualTasks = [
        {
          id: 'task1',
          filename: 'test-task-1.md',
          title: 'Test Task 1',
          priority: 'high',
          status: 'pending',
          estimatedTime: '2 days',
          lastModified: '2023-01-01T10:00:00Z'
        },
        {
          id: 'task2',
          filename: 'test-task-2.md',
          title: 'Test Task 2',
          priority: 'medium',
          status: 'in-progress',
          estimatedTime: '1 day',
          lastModified: '2023-01-02T10:00:00Z'
        }
      ];

      mockApi.getManualTasks.mockResolvedValue({
        success: true,
        data: mockManualTasks
      });

      render(<SidebarRight eventBus={mockEventBus} />);

      // Wait for tasks to load
      await waitFor(() => {
        expect(mockApi.getManualTasks).toHaveBeenCalled();
      });

      // Check if tasks are displayed
      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
        expect(screen.getByText('Test Task 2')).toBeInTheDocument();
      });

      // Check if priority badges are displayed
      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
    });

    it('should handle manual tasks loading error', async () => {
      mockApi.getManualTasks.mockRejectedValue(new Error('API Error'));

      render(<SidebarRight eventBus={mockEventBus} />);

      await waitFor(() => {
        expect(mockApi.getManualTasks).toHaveBeenCalled();
      });

      // Check if error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/Failed to load manual tasks/)).toBeInTheDocument();
      });
    });

    it('should sync manual tasks successfully', async () => {
      mockApi.getManualTasks.mockResolvedValue({
        success: true,
        data: []
      });

      mockApi.syncManualTasks.mockResolvedValue({
        success: true,
        data: {
          syncedCount: 3,
          totalFiles: 3,
          workspacePath: '/test/workspace'
        }
      });

      render(<SidebarRight eventBus={mockEventBus} />);

      // Wait for initial load
      await waitFor(() => {
        expect(mockApi.getManualTasks).toHaveBeenCalled();
      });

      // Find and click sync button
      const syncButton = screen.getByText(/Sync Manual Tasks/i);
      fireEvent.click(syncButton);

      // Wait for sync to complete
      await waitFor(() => {
        expect(mockApi.syncManualTasks).toHaveBeenCalled();
      });

      // Check if success message is displayed
      await waitFor(() => {
        expect(screen.getByText(/Successfully synced 3 manual tasks/)).toBeInTheDocument();
      });
    });

    it('should clean manual tasks successfully', async () => {
      const mockManualTasks = [
        {
          id: 'task1',
          title: 'Test Task 1',
          priority: 'high'
        }
      ];

      mockApi.getManualTasks.mockResolvedValue({
        success: true,
        data: mockManualTasks
      });

      mockApi.cleanManualTasks.mockResolvedValue({
        success: true,
        data: {
          deletedCount: 1,
          totalTasks: 1
        }
      });

      // Mock window.confirm to return true
      global.window.confirm = jest.fn(() => true);

      render(<SidebarRight eventBus={mockEventBus} />);

      // Wait for initial load
      await waitFor(() => {
        expect(mockApi.getManualTasks).toHaveBeenCalled();
      });

      // Find and click clean button
      const cleanButton = screen.getByText(/Clean Manual Tasks/i);
      fireEvent.click(cleanButton);

      // Wait for clean to complete
      await waitFor(() => {
        expect(mockApi.cleanManualTasks).toHaveBeenCalled();
      });

      // Check if success message is displayed
      await waitFor(() => {
        expect(screen.getByText(/Successfully cleaned 1 manual tasks/)).toBeInTheDocument();
      });
    });

    it('should open manual task details modal when task is clicked', async () => {
      const mockManualTasks = [
        {
          id: 'task1',
          title: 'Test Task 1',
          priority: 'high',
          status: 'pending'
        }
      ];

      const mockTaskDetails = {
        id: 'task1',
        title: 'Test Task 1',
        priority: 'high',
        status: 'pending',
        description: 'Test task description',
        content: '# Test Task\n\nThis is a test task.',
        htmlContent: '<p># Test Task</p><p>This is a test task.</p>'
      };

      mockApi.getManualTasks.mockResolvedValue({
        success: true,
        data: mockManualTasks
      });

      mockApi.getManualTaskDetails.mockResolvedValue({
        success: true,
        data: mockTaskDetails
      });

      render(<SidebarRight eventBus={mockEventBus} />);

      // Wait for tasks to load
      await waitFor(() => {
        expect(mockApi.getManualTasks).toHaveBeenCalled();
      });

      // Click on a task
      const taskItem = screen.getByText('Test Task 1');
      fireEvent.click(taskItem);

      // Wait for task details to load
      await waitFor(() => {
        expect(mockApi.getManualTaskDetails).toHaveBeenCalledWith('task1');
      });

      // Check if modal content is displayed
      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
        expect(screen.getByText('Test task description')).toBeInTheDocument();
      });
    });

    it('should filter manual tasks by search term', async () => {
      const mockManualTasks = [
        {
          id: 'task1',
          title: 'Backend Task',
          priority: 'high'
        },
        {
          id: 'task2',
          title: 'Frontend Task',
          priority: 'medium'
        }
      ];

      mockApi.getManualTasks.mockResolvedValue({
        success: true,
        data: mockManualTasks
      });

      render(<SidebarRight eventBus={mockEventBus} />);

      // Wait for tasks to load
      await waitFor(() => {
        expect(mockApi.getManualTasks).toHaveBeenCalled();
      });

      // Find search input
      const searchInput = screen.getByPlaceholderText(/Search manual tasks/i);
      
      // Type search term
      fireEvent.change(searchInput, { target: { value: 'Backend' } });

      // Check if only backend task is displayed
      await waitFor(() => {
        expect(screen.getByText('Backend Task')).toBeInTheDocument();
        expect(screen.queryByText('Frontend Task')).not.toBeInTheDocument();
      });
    });

    it('should filter manual tasks by priority', async () => {
      const mockManualTasks = [
        {
          id: 'task1',
          title: 'High Priority Task',
          priority: 'high'
        },
        {
          id: 'task2',
          title: 'Medium Priority Task',
          priority: 'medium'
        },
        {
          id: 'task3',
          title: 'Low Priority Task',
          priority: 'low'
        }
      ];

      mockApi.getManualTasks.mockResolvedValue({
        success: true,
        data: mockManualTasks
      });

      render(<SidebarRight eventBus={mockEventBus} />);

      // Wait for tasks to load
      await waitFor(() => {
        expect(mockApi.getManualTasks).toHaveBeenCalled();
      });

      // Find priority filter
      const priorityFilter = screen.getByText(/Priority/i);
      fireEvent.click(priorityFilter);

      // Select high priority
      const highPriorityOption = screen.getByText('High');
      fireEvent.click(highPriorityOption);

      // Check if only high priority tasks are displayed
      await waitFor(() => {
        expect(screen.getByText('High Priority Task')).toBeInTheDocument();
        expect(screen.queryByText('Medium Priority Task')).not.toBeInTheDocument();
        expect(screen.queryByText('Low Priority Task')).not.toBeInTheDocument();
      });
    });
  });

  describe('ManualTaskDetailsModal Integration', () => {
    it('should render manual task details correctly', () => {
      const mockTask = {
        id: 'task1',
        title: 'Test Task',
        priority: 'high',
        status: 'pending',
        description: 'Test task description',
        content: '# Test Task\n\nThis is a test task.',
        htmlContent: '<p># Test Task</p><p>This is a test task.</p>'
      };

      const mockProps = {
        task: mockTask,
        isOpen: true,
        onClose: jest.fn(),
        onSendToChat: jest.fn()
      };

      render(<ManualTaskDetailsModal {...mockProps} />);

      // Check if task details are displayed
      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('Test task description')).toBeInTheDocument();
      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      const mockTask = {
        id: 'task1',
        title: 'Test Task',
        priority: 'high'
      };

      const mockOnClose = jest.fn();

      const mockProps = {
        task: mockTask,
        isOpen: true,
        onClose: mockOnClose,
        onSendToChat: jest.fn()
      };

      render(<ManualTaskDetailsModal {...mockProps} />);

      // Find and click close button
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onSendToChat when send to chat button is clicked', () => {
      const mockTask = {
        id: 'task1',
        title: 'Test Task',
        priority: 'high'
      };

      const mockOnSendToChat = jest.fn();

      const mockProps = {
        task: mockTask,
        isOpen: true,
        onClose: jest.fn(),
        onSendToChat: mockOnSendToChat
      };

      render(<ManualTaskDetailsModal {...mockProps} />);

      // Find and click send to chat button
      const sendButton = screen.getByRole('button', { name: /send to chat/i });
      fireEvent.click(sendButton);

      expect(mockOnSendToChat).toHaveBeenCalledWith(mockTask);
    });

    it('should not render when isOpen is false', () => {
      const mockTask = {
        id: 'task1',
        title: 'Test Task',
        priority: 'high'
      };

      const mockProps = {
        task: mockTask,
        isOpen: false,
        onClose: jest.fn(),
        onSendToChat: jest.fn()
      };

      const { container } = render(<ManualTaskDetailsModal {...mockProps} />);

      // Modal should not be in the document
      expect(container.firstChild).toBeNull();
    });

    it('should handle missing task gracefully', () => {
      const mockProps = {
        task: null,
        isOpen: true,
        onClose: jest.fn(),
        onSendToChat: jest.fn()
      };

      render(<ManualTaskDetailsModal {...mockProps} />);

      // Should display loading or error state
      expect(screen.getByText(/No task selected/i)).toBeInTheDocument();
    });
  });
}); 