import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TasksPanelComponent from '@/presentation/components/chat/sidebar-right/TasksPanelComponent';

// Mock dependencies
jest.mock('@/infrastructure/stores/selectors/ProjectSelectors', () => ({
  useActiveIDE: () => ({
    activeIDE: { workspacePath: '/test/project' },
    projectId: 'test-project',
    projectName: 'Test Project'
  }),
  useProjectTasks: () => ({
    tasks: [
      { id: '1', title: 'Task 1', status: 'pending', progress: 0, category: 'manual' },
      { id: '2', title: 'Task 2', status: 'completed', progress: 100, category: 'manual' },
      { id: '3', title: 'Task 3', status: 'pending', progress: 50, category: 'manual' }
    ],
    hasTasks: true,
    taskCount: 3,
    lastUpdate: new Date().toISOString()
  }),
  useProjectDataActions: () => ({
    loadProjectTasks: jest.fn()
  })
}));

// Mock the API repository
jest.mock('@/infrastructure/repositories/APIChatRepository.jsx', () => ({
  __esModule: true,
  default: jest.fn(),
  apiCall: jest.fn()
}));

// Mock the logger
jest.mock('@/infrastructure/logging/Logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('TasksPanelComponent - Completion Filter', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('should hide completed tasks by default', () => {
    render(<TasksPanelComponent />);
    
    // Should show pending and partially completed tasks
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 3')).toBeInTheDocument();
    
    // Should not show completed task
    expect(screen.queryByText('Task 2')).not.toBeInTheDocument();
  });

  test('should show completed tasks when filter is toggled', async () => {
    render(<TasksPanelComponent />);
    
    // Find and click the completion filter button
    const filterButton = screen.getByText(/Show Completed/);
    fireEvent.click(filterButton);
    
    // Wait for the completed task to appear
    await waitFor(() => {
      expect(screen.getByText('Task 2')).toBeInTheDocument();
    });
    
    // Verify button text changed
    expect(screen.getByText(/✅ Show Completed/)).toBeInTheDocument();
  });

  test('should display progress percentage for partially completed tasks', () => {
    render(<TasksPanelComponent />);
    
    // Should show progress percentage for Task 3
    expect(screen.getByText('50% COMPLETE')).toBeInTheDocument();
  });

  test('should maintain existing search functionality', () => {
    render(<TasksPanelComponent />);
    
    const searchInput = screen.getByPlaceholderText('Search tasks...');
    fireEvent.change(searchInput, { target: { value: 'Task 1' } });
    
    // Should only show Task 1
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.queryByText('Task 3')).not.toBeInTheDocument();
  });

  test('should maintain existing priority filter functionality', () => {
    render(<TasksPanelComponent />);
    
    const prioritySelect = screen.getByDisplayValue('All Priorities');
    fireEvent.change(prioritySelect, { target: { value: 'high' } });
    
    // Should apply priority filter (assuming tasks have priority)
    expect(prioritySelect.value).toBe('high');
  });

  test('should toggle completion filter button state correctly', () => {
    render(<TasksPanelComponent />);
    
    const filterButton = screen.getByText(/Show Completed/);
    
    // Initially should show pending icon
    expect(filterButton).toHaveTextContent('⏳ Show Completed');
    expect(filterButton).not.toHaveClass('active');
    
    // Click to show completed tasks
    fireEvent.click(filterButton);
    
    // Should show completed icon and active state
    expect(filterButton).toHaveTextContent('✅ Show Completed');
    expect(filterButton).toHaveClass('active');
    
    // Click again to hide completed tasks
    fireEvent.click(filterButton);
    
    // Should return to pending icon
    expect(filterButton).toHaveTextContent('⏳ Show Completed');
    expect(filterButton).not.toHaveClass('active');
  });

  test('should show correct completion status badges', () => {
    render(<TasksPanelComponent />);
    
    // Should show pending status for Task 1
    expect(screen.getByText('⏳ PENDING')).toBeInTheDocument();
    
    // Should show progress for Task 3
    expect(screen.getByText('🔄 50% COMPLETE')).toBeInTheDocument();
    
    // Toggle to show completed tasks
    const filterButton = screen.getByText(/Show Completed/);
    fireEvent.click(filterButton);
    
    // Should show completed status for Task 2
    expect(screen.getByText('✅ COMPLETED')).toBeInTheDocument();
  });

  test('should combine completion filter with search filter', async () => {
    render(<TasksPanelComponent />);
    
    // Show completed tasks first
    const filterButton = screen.getByText(/Show Completed/);
    fireEvent.click(filterButton);
    
    // Search for a specific task
    const searchInput = screen.getByPlaceholderText('Search tasks...');
    fireEvent.change(searchInput, { target: { value: 'Task 2' } });
    
    // Should only show Task 2 (completed task)
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.queryByText('Task 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Task 3')).not.toBeInTheDocument();
  });

  test('should show correct button tooltip', () => {
    render(<TasksPanelComponent />);
    
    const filterButton = screen.getByText(/Show Completed/);
    
    // Initially should show "Show completed tasks" tooltip
    expect(filterButton).toHaveAttribute('title', 'Show completed tasks');
    
    // Click to show completed tasks
    fireEvent.click(filterButton);
    
    // Should show "Hide completed tasks" tooltip
    expect(filterButton).toHaveAttribute('title', 'Hide completed tasks');
  });

  test('should handle tasks with value object status', () => {
    // Mock with tasks that have value object status
    jest.doMock('@/infrastructure/stores/selectors/ProjectSelectors', () => ({
      useActiveIDE: () => ({
        activeIDE: { workspacePath: '/test/project' },
        projectId: 'test-project',
        projectName: 'Test Project'
      }),
      useProjectTasks: () => ({
        tasks: [
          { id: '1', title: 'Task 1', status: { value: 'pending' }, progress: 0, category: 'manual' },
          { id: '2', title: 'Task 2', status: { value: 'completed' }, progress: 100, category: 'manual' }
        ],
        hasTasks: true,
        taskCount: 2,
        lastUpdate: new Date().toISOString()
      }),
      useProjectDataActions: () => ({
        loadProjectTasks: jest.fn()
      })
    }));

    render(<TasksPanelComponent />);
    
    // Should show pending task
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    
    // Should not show completed task by default
    expect(screen.queryByText('Task 2')).not.toBeInTheDocument();
    
    // Toggle to show completed tasks
    const filterButton = screen.getByText(/Show Completed/);
    fireEvent.click(filterButton);
    
    // Should now show completed task
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });
}); 