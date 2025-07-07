import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SidebarRight from '../../src/presentation/components/SidebarRight';
import DocsTaskDetailsModal from '../../src/presentation/components/chat/modal/DocsTaskDetailsModal';
import APIChatRepository from '../../src/infrastructure/repositories/APIChatRepository';

// Mock the API repository
jest.mock('../../src/infrastructure/repositories/APIChatRepository');

// Mock the marked library
jest.mock('marked', () => ({
  setOptions: jest.fn(),
  __esModule: true,
  default: jest.fn((text) => `<p>${text}</p>`)
}));

describe('DocsTasks Integration Tests', () => {
  let mockApi;
  let mockEventBus;

  beforeEach(() => {
    mockApi = {
      getDocsTasks: jest.fn(),
      getDocsTaskDetails: jest.fn(),
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

  describe('SidebarRight - Docs Tasks Integration', () => {
    it('should load and display docs tasks on mount', async () => {
      const mockDocsTasks = [
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

      mockApi.getDocsTasks.mockResolvedValue({
        success: true,
        data: mockDocsTasks
      });

      render(<SidebarRight eventBus={mockEventBus} />);

      // Wait for tasks to load
      await waitFor(() => {
        expect(mockApi.getDocsTasks).toHaveBeenCalled();
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

    it('should handle docs tasks loading error', async () => {
      mockApi.getDocsTasks.mockRejectedValue(new Error('API Error'));

      render(<SidebarRight eventBus={mockEventBus} />);

      await waitFor(() => {
        expect(mockApi.getDocsTasks).toHaveBeenCalled();
      });

      // Should show error feedback
      await waitFor(() => {
        expect(screen.getByText(/Error loading documentation tasks/)).toBeInTheDocument();
      });
    });

    it('should filter docs tasks by search term', async () => {
      const mockDocsTasks = [
        {
          id: 'task1',
          filename: 'frontend-task.md',
          title: 'Frontend Implementation',
          priority: 'high',
          status: 'pending',
          lastModified: '2023-01-01T10:00:00Z'
        },
        {
          id: 'task2',
          filename: 'backend-task.md',
          title: 'Backend Implementation',
          priority: 'medium',
          status: 'pending',
          lastModified: '2023-01-02T10:00:00Z'
        }
      ];

      mockApi.getDocsTasks.mockResolvedValue({
        success: true,
        data: mockDocsTasks
      });

      render(<SidebarRight eventBus={mockEventBus} />);

      await waitFor(() => {
        expect(screen.getByText('Frontend Implementation')).toBeInTheDocument();
        expect(screen.getByText('Backend Implementation')).toBeInTheDocument();
      });

      // Search for frontend tasks
      const searchInput = screen.getByPlaceholderText('Search docs tasks...');
      fireEvent.change(searchInput, { target: { value: 'frontend' } });

      await waitFor(() => {
        expect(screen.getByText('Frontend Implementation')).toBeInTheDocument();
        expect(screen.queryByText('Backend Implementation')).not.toBeInTheDocument();
      });
    });

    it('should filter docs tasks by priority', async () => {
      const mockDocsTasks = [
        {
          id: 'task1',
          filename: 'high-task.md',
          title: 'High Priority Task',
          priority: 'high',
          status: 'pending',
          lastModified: '2023-01-01T10:00:00Z'
        },
        {
          id: 'task2',
          filename: 'low-task.md',
          title: 'Low Priority Task',
          priority: 'low',
          status: 'pending',
          lastModified: '2023-01-02T10:00:00Z'
        }
      ];

      mockApi.getDocsTasks.mockResolvedValue({
        success: true,
        data: mockDocsTasks
      });

      render(<SidebarRight eventBus={mockEventBus} />);

      await waitFor(() => {
        expect(screen.getByText('High Priority Task')).toBeInTheDocument();
        expect(screen.getByText('Low Priority Task')).toBeInTheDocument();
      });

      // Filter by high priority
      const filterSelect = screen.getByDisplayValue('All Priorities');
      fireEvent.change(filterSelect, { target: { value: 'high' } });

      await waitFor(() => {
        expect(screen.getByText('High Priority Task')).toBeInTheDocument();
        expect(screen.queryByText('Low Priority Task')).not.toBeInTheDocument();
      });
    });

    it('should open docs task details modal when clicking on a task', async () => {
      const mockDocsTasks = [
        {
          id: 'task1',
          filename: 'test-task.md',
          title: 'Test Task',
          priority: 'high',
          status: 'pending',
          lastModified: '2023-01-01T10:00:00Z'
        }
      ];

      const mockTaskDetails = {
        id: 'task1',
        filename: 'test-task.md',
        title: 'Test Task',
        priority: 'high',
        status: 'pending',
        content: '# Test Task\nThis is a test task.',
        htmlContent: '<h1>Test Task</h1><p>This is a test task.</p>',
        lastModified: '2023-01-01T10:00:00Z'
      };

      mockApi.getDocsTasks.mockResolvedValue({
        success: true,
        data: mockDocsTasks
      });

      mockApi.getDocsTaskDetails.mockResolvedValue({
        success: true,
        data: mockTaskDetails
      });

      render(<SidebarRight eventBus={mockEventBus} />);

      await waitFor(() => {
        expect(screen.getByText('Test Task')).toBeInTheDocument();
      });

      // Click on the task
      const taskItem = screen.getByText('Test Task').closest('.docs-task-item');
      fireEvent.click(taskItem);

      // Check if API was called
      await waitFor(() => {
        expect(mockApi.getDocsTaskDetails).toHaveBeenCalledWith('test-task.md');
      });

      // Check if modal is opened with task details
      await waitFor(() => {
        expect(screen.getByText('Test Task')).toBeInTheDocument();
        expect(screen.getByText('📄 test-task.md')).toBeInTheDocument();
      });
    });

    it('should handle task details loading error', async () => {
      const mockDocsTasks = [
        {
          id: 'task1',
          filename: 'test-task.md',
          title: 'Test Task',
          priority: 'high',
          status: 'pending',
          lastModified: '2023-01-01T10:00:00Z'
        }
      ];

      mockApi.getDocsTasks.mockResolvedValue({
        success: true,
        data: mockDocsTasks
      });

      mockApi.getDocsTaskDetails.mockRejectedValue(new Error('Details Error'));

      render(<SidebarRight eventBus={mockEventBus} />);

      await waitFor(() => {
        expect(screen.getByText('Test Task')).toBeInTheDocument();
      });

      // Click on the task
      const taskItem = screen.getByText('Test Task').closest('.docs-task-item');
      fireEvent.click(taskItem);

      // Check if error feedback is shown
      await waitFor(() => {
        expect(screen.getByText(/Error loading task details/)).toBeInTheDocument();
      });
    });

    it('should refresh docs tasks when refresh button is clicked', async () => {
      const mockDocsTasks = [
        {
          id: 'task1',
          filename: 'test-task.md',
          title: 'Test Task',
          priority: 'high',
          status: 'pending',
          lastModified: '2023-01-01T10:00:00Z'
        }
      ];

      mockApi.getDocsTasks.mockResolvedValue({
        success: true,
        data: mockDocsTasks
      });

      render(<SidebarRight eventBus={mockEventBus} />);

      await waitFor(() => {
        expect(mockApi.getDocsTasks).toHaveBeenCalledTimes(1);
      });

      // Click refresh button
      const refreshButton = screen.getByText('🔄 Refresh');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockApi.getDocsTasks).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('DocsTaskDetailsModal Integration', () => {
    it('should render task details correctly', () => {
      const mockTaskDetails = {
        id: 'task1',
        filename: 'test-task.md',
        title: 'Test Task',
        priority: 'high',
        status: 'pending',
        estimatedTime: '2 days',
        content: '# Test Task\nThis is a test task with **bold** text.',
        htmlContent: '<h1>Test Task</h1><p>This is a test task with <strong>bold</strong> text.</p>',
        lastModified: '2023-01-01T10:00:00Z'
      };

      render(
        <DocsTaskDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          taskDetails={mockTaskDetails}
          isLoading={false}
        />
      );

      // Check if task details are displayed
      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('📄 test-task.md')).toBeInTheDocument();
      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('⏱️ 2 days')).toBeInTheDocument();

      // Check if rendered content is displayed
      expect(screen.getByText('📖 Rendered')).toBeInTheDocument();
      expect(screen.getByText('📝 Raw Markdown')).toBeInTheDocument();
    });

    it('should switch between rendered and raw tabs', () => {
      const mockTaskDetails = {
        id: 'task1',
        filename: 'test-task.md',
        title: 'Test Task',
        content: '# Test Task\nThis is a test task.',
        lastModified: '2023-01-01T10:00:00Z'
      };

      render(
        <DocsTaskDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          taskDetails={mockTaskDetails}
          isLoading={false}
        />
      );

      // Initially should show rendered tab
      expect(screen.getByText('📖 Rendered')).toHaveClass('active');

      // Click on raw tab
      const rawTab = screen.getByText('📝 Raw Markdown');
      fireEvent.click(rawTab);

      // Should switch to raw tab
      expect(screen.getByText('📝 Raw Markdown')).toHaveClass('active');
      expect(screen.getByText('📖 Rendered')).not.toHaveClass('active');
    });

    it('should show loading state', () => {
      render(
        <DocsTaskDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          taskDetails={null}
          isLoading={true}
        />
      );

      expect(screen.getByText('Loading task details...')).toBeInTheDocument();
    });

    it('should show error state when no task details', () => {
      render(
        <DocsTaskDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          taskDetails={null}
          isLoading={false}
        />
      );

      expect(screen.getByText('❌ No task details available')).toBeInTheDocument();
    });

    it('should close modal when close button is clicked', () => {
      const onClose = jest.fn();
      const mockTaskDetails = {
        id: 'task1',
        filename: 'test-task.md',
        title: 'Test Task',
        content: '# Test Task',
        lastModified: '2023-01-01T10:00:00Z'
      };

      render(
        <DocsTaskDetailsModal
          isOpen={true}
          onClose={onClose}
          taskDetails={mockTaskDetails}
          isLoading={false}
        />
      );

      const closeButton = screen.getByText('✕');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('should copy task title to clipboard', () => {
      const mockTaskDetails = {
        id: 'task1',
        filename: 'test-task.md',
        title: 'Test Task',
        content: '# Test Task',
        lastModified: '2023-01-01T10:00:00Z'
      };

      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue()
        }
      });

      render(
        <DocsTaskDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          taskDetails={mockTaskDetails}
          isLoading={false}
        />
      );

      const copyButton = screen.getByText('Copy Title');
      fireEvent.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test Task');
    });
  });

  describe('API Integration', () => {
    it('should use correct API endpoints', async () => {
      const mockDocsTasks = [
        {
          id: 'task1',
          filename: 'test-task.md',
          title: 'Test Task',
          priority: 'high',
          status: 'pending',
          lastModified: '2023-01-01T10:00:00Z'
        }
      ];

      mockApi.getDocsTasks.mockResolvedValue({
        success: true,
        data: mockDocsTasks
      });

      render(<SidebarRight eventBus={mockEventBus} />);

      await waitFor(() => {
        expect(mockApi.getDocsTasks).toHaveBeenCalled();
      });
    });

    it('should handle API authentication errors', async () => {
      mockApi.getDocsTasks.mockRejectedValue(new Error('401 Unauthorized'));

      render(<SidebarRight eventBus={mockEventBus} />);

      await waitFor(() => {
        expect(screen.getByText(/Error loading documentation tasks/)).toBeInTheDocument();
      });
    });
  });
}); 