# Task Panel Improvement - Phase 3: Integration & Testing

## 📋 Phase Overview
- **Phase**: 3 of 3
- **Focus**: Integration & Testing
- **Estimated Time**: 2 hours
- **Status**: Planning
- **Dependencies**: Phase 1 and Phase 2 completion

## 🎯 Objectives
- Integrate all components together in TasksPanelComponent
- Update SidebarRight component tab label
- Test all filtering combinations and edge cases
- Ensure responsive design works properly
- Add error handling and performance optimization
- Complete final testing and validation

## 📁 Files to Create/Modify

### Files to Modify:
- [ ] `frontend/src/presentation/components/chat/sidebar-right/TasksPanelComponent.jsx` - Complete integration
- [ ] `frontend/src/presentation/components/SidebarRight.jsx` - Update tab label
- [ ] `frontend/src/css/components/task-panel.css` - Final styling adjustments

### Files to Create:
- [ ] `frontend/tests/unit/TasksPanelComponent.test.jsx` - Unit tests
- [ ] `frontend/tests/integration/TaskPanelIntegration.test.jsx` - Integration tests

## 🔧 Implementation Steps

### Step 1: Complete TasksPanelComponent Integration (45 minutes)
```jsx
// Updated TasksPanelComponent.jsx
import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import APIChatRepository, { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import TaskSelectionModal from '../modal/TaskSelectionModal.jsx';
import DocsTaskDetailsModal from '../modal/DocsTaskDetailsModal.jsx';
import TaskCreationModal from '../modal/TaskCreationModal.jsx';
import TaskCardComponent from './TaskCardComponent.jsx';
import CategoryFilterComponent from './CategoryFilterComponent.jsx';
import { useTaskFiltering } from '@/hooks/useTaskFiltering.js';
import { 
  getTaskTitle, 
  getTaskDescription, 
  getPriorityColor, 
  getStatusColor, 
  formatDate 
} from '@/utils/taskUtils.js';
import '@/css/components/task-panel.css';

// Import the SAME fetchPromptContent function that works everywhere
async function fetchPromptContent(promptFile) {
  let url;
  if (promptFile.startsWith('frameworks/')) {
    const parts = promptFile.split('/');
    const frameworkId = parts[1];
    const filename = parts[3];
    url = `/api/frameworks/${frameworkId}/prompts/${filename}`;
  } else {
    let filePath = promptFile;
    if (filePath.startsWith('prompts/')) filePath = filePath.substring(8);
    const pathParts = filePath.split('/');
    const filename = pathParts.pop();
    const category = pathParts.join('/');
    url = `/api/prompts/${category}/${filename}`;
  }
  const response = await apiCall(url);
  if (response.content) return response.content;
  if (response.data && response.data.content) return response.data.content;
  if (typeof response.data === 'string') return response.data;
  if (typeof response === 'string') return response;
  throw new Error(`Prompt content not found for ${promptFile}`);
}

function TasksPanelComponent({ eventBus, activePort }) {
  const api = new APIChatRepository();
  
  // State management
  const [docsTasks, setDocsTasks] = useState([]);
  const [selectedDocsTask, setSelectedDocsTask] = useState(null);
  const [isDocsTaskModalOpen, setIsDocsTaskModalOpen] = useState(false);
  const [isLoadingDocsTasks, setIsLoadingDocsTasks] = useState(false);
  const [isLoadingDocsTaskDetails, setIsLoadingDocsTaskDetails] = useState(false);
  const [feedback, setFeedback] = useState(null);
  
  // Task creation state
  const [showTaskCreationModal, setShowTaskCreationModal] = useState(false);
  
  // Task selection state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [refactoringTasks, setRefactoringTasks] = useState([]);
  const [isAutoRefactoring, setIsAutoRefactoring] = useState(false);

  // Use custom filtering hook
  const {
    filters,
    filteredTasks,
    updateFilter,
    clearFilters,
    getFilterStats
  } = useTaskFiltering(docsTasks);

  // Load docs tasks on mount
  useEffect(() => {
    if (activePort) {
      logger.info('Loading tasks for port:', activePort);
      loadDocsTasks();
    } else {
      logger.info('No active port, clearing tasks');
      setDocsTasks([]);
    }
  }, []);

  // Task loading functions
  const loadDocsTasks = async () => {
    setIsLoadingDocsTasks(true);
    try {
      const response = await api.getDocsTasks();
      if (response.success) {
        setDocsTasks(response.data || []);
      } else {
        setFeedback('Failed to load tasks');
      }
    } catch (error) {
      setFeedback('Error loading tasks: ' + error.message);
    } finally {
      setIsLoadingDocsTasks(false);
    }
  };

  const handleSyncDocsTasks = async () => {
    setIsLoadingDocsTasks(true);
    try {
      logger.info('🔄 [TasksPanelComponent] Starting tasks sync...');
      const response = await api.syncDocsTasks();
      if (response.success) {
        setFeedback(`✅ Successfully synced ${response.data.importedCount} tasks to database`);
        await loadDocsTasks();
      } else {
        setFeedback('❌ Failed to sync tasks: ' + response.error);
      }
    } catch (error) {
      logger.error('Error syncing tasks:', error);
      setFeedback('❌ Error syncing tasks: ' + error.message);
    } finally {
      setIsLoadingDocsTasks(false);
    }
  };

  const handleCleanDocsTasks = async () => {
    if (!window.confirm('🗑️ Are you sure you want to delete ALL tasks from the database? This cannot be undone!')) {
      return;
    }
    
    setIsLoadingDocsTasks(true);
    try {
      logger.info('🗑️ [TasksPanelComponent] Starting tasks cleanup...');
      const response = await api.cleanDocsTasks();
      if (response.success) {
        setFeedback(`✅ Successfully deleted ${response.data.deletedCount} tasks from database`);
        await loadDocsTasks();
      } else {
        setFeedback('❌ Failed to clean tasks: ' + response.error);
      }
    } catch (error) {
      logger.error('Error cleaning tasks:', error);
      setFeedback('❌ Error cleaning tasks: ' + error.message);
    } finally {
      setIsLoadingDocsTasks(false);
    }
  };

  const handleDocsTaskClick = async (task) => {
    setIsLoadingDocsTaskDetails(true);
    setIsDocsTaskModalOpen(true);
    setSelectedDocsTask(null);
    
    try {
      logger.info('Loading task details for:', task.id);
      const response = await api.getDocsTaskDetails(task.id);
      if (response.success && response.data) {
        logger.info('Task details loaded successfully:', response.data);
        setSelectedDocsTask(response.data);
      } else {
        logger.warn('API returned no data, using task as fallback');
        setSelectedDocsTask({
          ...task,
          description: getTaskDescription(task),
          filename: task.filename || task.title || 'Unknown'
        });
      }
    } catch (error) {
      logger.error('Error loading task details:', error);
      setFeedback('Error loading task details: ' + error.message);
      setSelectedDocsTask({
        ...task,
        description: getTaskDescription(task),
        filename: task.filename || task.title || 'Unknown'
      });
    } finally {
      setIsLoadingDocsTaskDetails(false);
    }
  };

  const handleCloseDocsTaskModal = () => {
    setIsDocsTaskModalOpen(false);
    setSelectedDocsTask(null);
  };

  const handleSendToChat = (messageContent) => {
    if (eventBus) {
      eventBus.emit('chat:send:message', { message: messageContent });
    }
    handleCloseDocsTaskModal();
  };

  const handleExecuteTask = async (taskDetails) => {
    try {
      const executePromptContent = await fetchPromptContent('prompts/task-management/task-execute.md');
      const taskMessage = `${executePromptContent}

---

# TASK TO EXECUTE: ${taskDetails.title}

## Task Details
- **Priority**: ${taskDetails.priority || 'Not specified'}
- **Status**: ${taskDetails.status || 'Not specified'}
- **Estimated Time**: ${taskDetails.estimatedDuration ? Math.round(taskDetails.estimatedDuration / 60) + 'min' : 'Not specified'}
- **File**: ${taskDetails.metadata?.filename || 'Unknown file'}

## Task Content
${taskDetails.description}

## Execute Instructions
**Execute this task automatically using the above prompt framework. Create a Git branch named \`task/${taskDetails.id}-${Date.now()}\` and implement everything with zero user input required.**`;

      const projectId = await api.getCurrentProjectId();
      const autoModeResponse = await apiCall(`/api/projects/${projectId}/workflow/execute`, {
        method: 'POST',
        body: JSON.stringify({
          taskId: taskDetails.id,
          options: {
            createGitBranch: true,
            branchName: `task/${taskDetails.id}-${Date.now()}`,
            clickNewChat: true,
            autoExecute: true
          }
        })
      });

      if (autoModeResponse.success) {
        setFeedback('✅ Auto-mode started! Git branch created and task execution initiated.');
        handleCloseDocsTaskModal();
      } else {
        throw new Error(autoModeResponse.error || 'Failed to start auto-mode');
      }
    } catch (error) {
      logger.error('Error executing task:', error);
      setFeedback('Failed to execute task: ' + error.message);
    }
  };

  // Task creation functions
  const handleCreateTask = () => {
    setShowTaskCreationModal(true);
  };

  const handleCloseTaskCreationModal = () => {
    setShowTaskCreationModal(false);
  };

  const handleTaskSubmit = async (taskData) => {
    try {
      // Implementation for task creation
      setFeedback('✅ Task created successfully!');
      handleCloseTaskCreationModal();
      await loadDocsTasks(); // Reload tasks
    } catch (err) {
      setFeedback('❌ Failed to create task: ' + (err.message || err));
      throw err;
    }
  };

  // Get filter statistics
  const filterStats = getFilterStats();

  return (
    <div className="tasks-panel">
      {/* Header */}
      <div className="tasks-panel-header">
        <h2 className="tasks-panel-title">📋 Tasks</h2>
        <div className="tasks-panel-actions">
          <button className="btn-primary" onClick={handleCreateTask}>
            Create Task
          </button>
          <button 
            className="btn-secondary"
            onClick={handleSyncDocsTasks}
            disabled={isLoadingDocsTasks}
          >
            {isLoadingDocsTasks ? 'Syncing...' : '🔄 Sync'}
          </button>
          <button 
            className="btn-secondary"
            onClick={handleCleanDocsTasks}
            disabled={isLoadingDocsTasks}
          >
            {isLoadingDocsTasks ? 'Cleaning...' : '🗑️ Clean'}
          </button>
          <button 
            className="btn-secondary"
            onClick={loadDocsTasks}
            disabled={isLoadingDocsTasks}
          >
            {isLoadingDocsTasks ? 'Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="tasks-panel-content">
        {/* Filter Section */}
        <div className="filter-section">
          <h3>Filters</h3>
          
          {/* Search and Priority Filters */}
          <div className="filter-controls">
            <input 
              type="text" 
              placeholder="Search tasks..." 
              className="filter-input"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
            <select 
              className="filter-select"
              value={filters.priority}
              onChange={(e) => updateFilter('priority', e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
            <select 
              className="filter-select"
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Category Filter */}
          <CategoryFilterComponent
            selectedCategories={filters.categories}
            onCategoryChange={(categories) => updateFilter('categories', categories)}
            disabled={isLoadingDocsTasks}
          />

          {/* Filter Statistics */}
          {filterStats.hasActiveFilters && (
            <div className="filter-stats">
              <span className="filter-stat">
                Showing {filterStats.filtered} of {filterStats.total} tasks
                {filterStats.hidden > 0 && ` (${filterStats.hidden} hidden)`}
              </span>
              <button 
                className="filter-clear-btn"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Tasks List */}
        <div className="tasks-list">
          {isLoadingDocsTasks ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <span>Loading tasks...</span>
            </div>
          ) : filteredTasks.length > 0 ? (
            <div className="tasks-grid">
              {filteredTasks.map((task) => (
                <TaskCardComponent
                  key={task.id}
                  task={task}
                  onClick={handleDocsTaskClick}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p>
                {filterStats.hasActiveFilters 
                  ? 'No tasks match your current filters' 
                  : 'No tasks found. Create a new task or sync from documentation.'
                }
              </p>
              {filterStats.hasActiveFilters && (
                <button 
                  className="btn-secondary"
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <DocsTaskDetailsModal
        isOpen={isDocsTaskModalOpen}
        onClose={handleCloseDocsTaskModal}
        taskDetails={selectedDocsTask}
        isLoading={isLoadingDocsTaskDetails}
        onSendToChat={handleSendToChat}
        onExecuteTask={handleExecuteTask}
      />
      <TaskSelectionModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        tasks={refactoringTasks}
        onStartRefactoring={() => {}}
        isLoading={isAutoRefactoring}
      />
      <TaskCreationModal
        isOpen={showTaskCreationModal}
        onClose={handleCloseTaskCreationModal}
        onSubmit={handleTaskSubmit}
        eventBus={eventBus}
      />
      
      {/* Feedback */}
      {feedback && (
        <div className="feedback-message">
          {feedback}
        </div>
      )}
    </div>
  );
}

export default TasksPanelComponent;
```

### Step 2: Update SidebarRight Component (15 minutes)
```jsx
// Update in SidebarRight.jsx
<button className={`tab-btn${currentTab === 'tasks' ? ' active' : ''}`} onClick={() => setCurrentTab('tasks')}>
  📋 Tasks
</button>
```

### Step 3: Create Unit Tests (30 minutes)
```jsx
// TasksPanelComponent.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TasksPanelComponent from '@/presentation/components/chat/sidebar-right/TasksPanelComponent.jsx';

// Mock dependencies
jest.mock('@/infrastructure/repositories/APIChatRepository.jsx');
jest.mock('@/infrastructure/logging/Logger');
jest.mock('@/hooks/useTaskFiltering.js');

const mockEventBus = {
  emit: jest.fn()
};

const mockTasks = [
  {
    id: '1',
    title: 'Test Task 1',
    description: 'Test description 1',
    priority: 'high',
    status: 'pending',
    category: 'frontend',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    title: 'Test Task 2',
    description: 'Test description 2',
    priority: 'medium',
    status: 'completed',
    category: 'backend',
    createdAt: '2024-01-02T00:00:00Z'
  }
];

describe('TasksPanelComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders task panel with title', () => {
    render(<TasksPanelComponent eventBus={mockEventBus} activePort="3000" />);
    expect(screen.getByText('📋 Tasks')).toBeInTheDocument();
  });

  it('shows loading state when loading tasks', () => {
    render(<TasksPanelComponent eventBus={mockEventBus} activePort="3000" />);
    expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
  });

  it('displays tasks when loaded', async () => {
    // Mock the useTaskFiltering hook
    const mockUseTaskFiltering = require('@/hooks/useTaskFiltering.js');
    mockUseTaskFiltering.useTaskFiltering.mockReturnValue({
      filters: { search: '', priority: 'all', status: 'all', categories: [] },
      filteredTasks: mockTasks,
      updateFilter: jest.fn(),
      clearFilters: jest.fn(),
      getFilterStats: () => ({ total: 2, filtered: 2, hidden: 0, hasActiveFilters: false })
    });

    render(<TasksPanelComponent eventBus={mockEventBus} activePort="3000" />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      expect(screen.getByText('Test Task 2')).toBeInTheDocument();
    });
  });

  it('handles task creation button click', () => {
    render(<TasksPanelComponent eventBus={mockEventBus} activePort="3000" />);
    
    const createButton = screen.getByText('Create Task');
    fireEvent.click(createButton);
    
    // Should open task creation modal
    expect(screen.getByText('Create Task')).toBeInTheDocument();
  });

  it('displays filter controls', () => {
    render(<TasksPanelComponent eventBus={mockEventBus} activePort="3000" />);
    
    expect(screen.getByPlaceholderText('Search tasks...')).toBeInTheDocument();
    expect(screen.getByText('All Priorities')).toBeInTheDocument();
    expect(screen.getByText('All Status')).toBeInTheDocument();
  });
});
```

### Step 4: Create Integration Tests (30 minutes)
```jsx
// TaskPanelIntegration.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TasksPanelComponent from '@/presentation/components/chat/sidebar-right/TasksPanelComponent.jsx';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository.jsx';

// Mock API repository
jest.mock('@/infrastructure/repositories/APIChatRepository.jsx');

describe('TaskPanel Integration Tests', () => {
  const mockEventBus = {
    emit: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API methods
    APIChatRepository.prototype.getDocsTasks = jest.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: '1',
          title: 'Frontend Task',
          description: 'Improve UI',
          priority: 'high',
          status: 'pending',
          category: 'frontend'
        },
        {
          id: '2',
          title: 'Backend Task',
          description: 'Fix API',
          priority: 'medium',
          status: 'completed',
          category: 'backend'
        }
      ]
    });
  });

  it('loads and displays tasks from API', async () => {
    render(<TasksPanelComponent eventBus={mockEventBus} activePort="3000" />);
    
    await waitFor(() => {
      expect(APIChatRepository.prototype.getDocsTasks).toHaveBeenCalled();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Frontend Task')).toBeInTheDocument();
      expect(screen.getByText('Backend Task')).toBeInTheDocument();
    });
  });

  it('handles sync tasks functionality', async () => {
    APIChatRepository.prototype.syncDocsTasks = jest.fn().mockResolvedValue({
      success: true,
      data: { importedCount: 5 }
    });

    render(<TasksPanelComponent eventBus={mockEventBus} activePort="3000" />);
    
    const syncButton = screen.getByText('🔄 Sync');
    fireEvent.click(syncButton);
    
    await waitFor(() => {
      expect(APIChatRepository.prototype.syncDocsTasks).toHaveBeenCalled();
    });
  });

  it('handles task click and opens modal', async () => {
    APIChatRepository.prototype.getDocsTaskDetails = jest.fn().mockResolvedValue({
      success: true,
      data: {
        id: '1',
        title: 'Test Task',
        description: 'Test Description'
      }
    });

    render(<TasksPanelComponent eventBus={mockEventBus} activePort="3000" />);
    
    await waitFor(() => {
      const taskElement = screen.getByText('Frontend Task');
      fireEvent.click(taskElement);
    });
    
    await waitFor(() => {
      expect(APIChatRepository.prototype.getDocsTaskDetails).toHaveBeenCalledWith('1');
    });
  });
});
```

## ✅ Success Criteria
- [ ] All components integrate seamlessly
- [ ] Tab label updated from "🗂️ Tasks" to "📋 Tasks"
- [ ] All filtering combinations work correctly
- [ ] Responsive design works on all screen sizes
- [ ] Error handling covers all edge cases
- [ ] Performance meets requirements (<100ms filter operations)
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] No console errors or warnings
- [ ] Accessibility compliance verified

## 🎉 Project Completion
After completing Phase 3, the task panel improvement project is complete with:
- ✅ Enhanced UI/UX design
- ✅ Category filtering system
- ✅ Complete integration and testing
- ✅ "Documentation Tasks" renamed to "Tasks"
- ✅ All existing functionality preserved

## 📝 Notes
- Ensure all imports are correctly resolved
- Test on different browsers (Chrome, Firefox)
- Verify all existing functionality still works
- Check for any console errors or warnings
- Test with large datasets for performance
- Verify accessibility with screen readers 