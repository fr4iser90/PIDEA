import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import APIChatRepository, { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import { useActiveIDE, useProjectTasks, useProjectDataActions } from '@/infrastructure/stores/selectors/ProjectSelectors';
import TaskSelectionModal from '../modal/TaskSelectionModal.jsx';
import ManualTaskDetailsModal from '../modal/ManualTaskDetailsModal.jsx';
import TaskCreationModal from '../modal/TaskCreationModal.jsx';
import TaskReviewSelectionModal from '../modal/TaskReviewSelectionModal.jsx';
import TaskReviewService from '@/application/services/TaskReviewService';
import { getCategoryDisplay, getAllCategories, getCategoryIcon, getCategoryColor, MAIN_CATEGORIES } from '@/utils/taskTypeUtils';
import TaskTypeBadge from '@/components/TaskTypeBadge.jsx';
import TaskCompletionBadge from '@/components/TaskCompletionBadge.jsx';
import { 
  isTaskCompleted, 
  isTaskPartiallyCompleted, 
  getCompletionStatus,
  getCompletionDisplayText,
  getCompletionColor 
} from '@/utils/taskCompletionUtils';
import '@/css/panel/task-panel.css';

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
  // Robust: prüfe alle sinnvollen Felder
  if (response.content) return response.content;
  if (response.data && response.data.content) return response.data.content;
  if (typeof response.data === 'string') return response.data;
  if (typeof response === 'string') return response;
  throw new Error(`Prompt content not found for ${promptFile}`);
}

// Category Tabs Component for Left Sidebar
const CategoryTabs = ({ categories, selectedCategory, onCategorySelect, taskCounts }) => {
  return (
    <div className="category-tabs-sidebar w-48 bg-gray-800 rounded p-3">
      <h4 className="text-sm font-semibold text-gray-300 mb-3">Categories</h4>
      <div className="space-y-2">
        {Object.entries(categories).map(([key, category]) => {
          const count = taskCounts[key] || 0;
          const isActive = selectedCategory === key;
          return (
            <button
              key={key}
              className={`category-tab w-full text-left p-2 rounded text-sm transition-colors ${
                isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => onCategorySelect(key)}
            >
              <div className="flex items-center justify-between">
                <span>{getCategoryIcon(key)} {category}</span>
                <span className="text-xs bg-gray-600 px-2 py-1 rounded">
                  {count}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Vertical Action Buttons Component for Bottom Section
const VerticalActionButtons = ({ 
  onGenerate, 
  onRefactor, 
  onTest, 
  onDeploy, 
  onSecurity, 
  onOptimize 
}) => {
  const categoryActions = [
    { id: 'generate', label: 'Generate', icon: '⚡', handler: onGenerate },
    { id: 'refactor', label: 'Refactor', icon: '🔧', handler: onRefactor },
    { id: 'test', label: 'Test', icon: '🧪', handler: onTest },
    { id: 'deploy', label: 'Deploy', icon: '🚀', handler: onDeploy },
    { id: 'security', label: 'Security', icon: '🔒', handler: onSecurity },
    { id: 'optimize', label: 'Optimize', icon: '⚡', handler: onOptimize }
  ];

  return (
    <div className="vertical-action-buttons bg-gray-800 rounded p-3">
      <h4 className="text-sm font-semibold text-gray-300 mb-3">Actions</h4>
      <div className="space-y-2">
        {categoryActions.map((action) => (
          <button
            key={action.id}
            className="action-button w-full btn-secondary text-sm text-left"
            onClick={action.handler}
            title={action.label}
          >
            <span className="mr-2">{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

function TasksPanelComponent({ eventBus, activePort }) {
  const api = new APIChatRepository();
  
  // ✅ NEW: Use project-specific selectors
  const { activeIDE, projectId, projectName } = useActiveIDE();
  const { tasks: manualTasks, hasTasks, taskCount, lastUpdate } = useProjectTasks();
  const { loadProjectTasks } = useProjectDataActions();
  
  // Helper functions
  const getTaskFilename = (task) => {
    return task.filename || task.title || 'Unknown';
  };

  const getTaskDescription = (task) => {
    return task.description || task.content || 'No description available';
  };

  const getTaskTitle = (task) => {
    return task.title || 'Unknown Task';
  };

  const getPriorityColor = (priority) => {
    // Handle value objects
    const priorityValue = priority?.value || priority;
    const priorityStr = String(priorityValue || '').toLowerCase();
    switch (priorityStr) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status) => {
    // Handle value objects
    const statusValue = status?.value || status;
    const statusStr = String(statusValue || '').toLowerCase();
    switch (statusStr) {
      case 'completed': return '#10b981';
      case 'running': return '#3b82f6';
      case 'pending': return '#f59e0b';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getPriorityText = (priority) => {
    // Handle value objects
    const priorityValue = priority?.value || priority;
    return String(priorityValue || 'Unknown');
  };

  const getStatusText = (status) => {
    // Handle value objects
    const statusValue = status?.value || status;
    return String(statusValue || 'Unknown');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // State management
  const [localManualTasks, setLocalManualTasks] = useState([]);
  const [isLoadingManualTasks, setIsLoadingManualTasks] = useState(false);
  const [selectedManualTask, setSelectedManualTask] = useState(null);
  const [isManualTaskModalOpen, setIsManualTaskModalOpen] = useState(false);
  const [isLoadingManualTaskDetails, setIsLoadingManualTaskDetails] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskFilter, setTaskFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [showTaskCreationModal, setShowTaskCreationModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [refactoringTasks, setRefactoringTasks] = useState([]);
  const [isAutoRefactoring, setIsAutoRefactoring] = useState(false);
  
  // Review modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  
  // Add state to track if initial sync is complete
  const [isInitialSyncComplete, setIsInitialSyncComplete] = useState(false);
  const [isWaitingForSync, setIsWaitingForSync] = useState(true);

  // ✅ NEW: Load tasks on component mount and when project changes
  useEffect(() => {
    if (projectId && activeIDE?.workspacePath) {
      // ✅ CRITICAL FIX: Always load tasks when component mounts or project changes
      loadTasks(true); // Force load
      
      // Wait a bit for backend sync to complete before showing "no tasks"
      const initialDelay = setTimeout(() => {
        if (manualTasks.length === 0 && !isLoadingManualTasks) {
          setIsWaitingForSync(false);
        }
      }, 3000); // Wait 3 seconds for initial sync
      
      return () => clearTimeout(initialDelay);
    }
  }, [projectId, activeIDE?.workspacePath]); // Auto-reload when project changes

  // Listen for task sync events from WebSocket
  useEffect(() => {
    if (!eventBus) return;

    const handleTaskSyncCompleted = (data) => {
      logger.info('Task sync completed event received:', data);
      // Mark initial sync as complete
      setIsInitialSyncComplete(true);
      setIsWaitingForSync(false);
      // Refresh tasks when sync is completed
      loadTasks(true); // Force refresh
      setFeedback(`Tasks synced successfully (${data.result?.importedCount || 0} imported)`);
    };

    eventBus.on('task:sync:completed', handleTaskSyncCompleted);

    return () => {
      eventBus.off('task:sync:completed', handleTaskSyncCompleted);
    };
  }, [eventBus]);

  // Add task loading optimization
  const [lastLoadTime, setLastLoadTime] = useState(0);
  const loadTasksThrottle = 5000; // 5 seconds

  const loadTasks = async (force = false) => {
    if (!projectId || !activeIDE?.workspacePath) {
      logger.debug('No project ID or workspace path available, skipping task load');
      return;
    }
    
    const now = Date.now();
    
    // Prevent excessive loading
    if (!force && (now - lastLoadTime) < loadTasksThrottle) {
      logger.debug('Skipping task load - too recent');
      return;
    }

    setIsLoadingManualTasks(true);
    try {
      // ✅ CRITICAL FIX: Force load tasks and wait for completion
      logger.info('🔄 Loading tasks for workspace:', activeIDE.workspacePath);
      const taskData = await loadProjectTasks(activeIDE.workspacePath);
      setLastLoadTime(now);
      
      logger.info('✅ Tasks loaded, checking result:', { 
        taskData: taskData ? 'exists' : 'null',
        taskCount: taskData?.tasks?.length || 0,
        projectId 
      });
      
      // If we found tasks, mark sync as complete
      if (taskData?.tasks?.length > 0) {
        setIsInitialSyncComplete(true);
        setIsWaitingForSync(false);
        logger.info('✅ Tasks found, sync complete');
      } else {
        logger.warn('⚠️ No tasks found in loaded data');
      }
      
      logger.debug('Tasks loaded successfully:', { taskCount: taskData?.tasks?.length || 0, projectId });
    } catch (error) {
      logger.error('Error loading manual tasks:', error);
      // Don't immediately show "no tasks" on first load
      if (lastLoadTime > 0) {
        setIsWaitingForSync(false);
      }
    } finally {
      setIsLoadingManualTasks(false);
    }
  };

  const handleSyncTasks = async () => {
    if (!projectId || !activeIDE?.workspacePath) {
      setFeedback('No project selected for task sync');
      return;
    }
    
    setIsLoadingManualTasks(true);
    setIsWaitingForSync(true);
    try {
      // ✅ FIXED: Call backend sync endpoint to import tasks from workspace
      const response = await apiCall(`/api/projects/${projectId}/tasks/sync-manual`, {
        method: 'POST',
        body: JSON.stringify({ projectPath: activeIDE.workspacePath })
      });
      
      if (response && response.success) {
        // 🆕 NEW: Check if status validation was performed
        if (response.data?.statusValidation) {
          const validation = response.data.statusValidation;
          logger.info('🔍 Task status validation completed:', {
            totalTasks: validation.totalTasks,
            validTasks: validation.validTasks,
            invalidTasks: validation.invalidTasks
          });

          // Show validation results in feedback
          if (validation.invalidTasks > 0) {
            setFeedback(`Tasks synced successfully (${response.data?.importedCount || 0} imported). ⚠️ Found ${validation.invalidTasks} invalid status transitions.`);
          } else {
            setFeedback(`Tasks synced successfully (${response.data?.importedCount || 0} imported). ✅ All task statuses validated.`);
          }
        } else {
          setFeedback(`Tasks synced successfully (${response.data?.importedCount || 0} imported)`);
        }

        // Reload tasks after sync
        await loadProjectTasks(activeIDE.workspacePath);
        setLastLoadTime(Date.now());
        setIsInitialSyncComplete(true);
        setIsWaitingForSync(false);
        logger.info('Tasks synced successfully:', { 
          taskCount: manualTasks.length, 
          importedCount: response.data?.importedCount || 0,
          projectId 
        });
      } else {
        throw new Error(response?.error || 'Task sync failed');
      }
    } catch (error) {
      logger.error('Error syncing tasks:', error);
      setFeedback('Error syncing tasks');
      setIsWaitingForSync(false);
      // Keep existing tasks on error
    } finally {
      setIsLoadingManualTasks(false);
    }
  };

  const handleCleanTasks = async () => {
    if (!projectId || !activeIDE?.workspacePath) {
      setFeedback('No project selected for task cleaning');
      return;
    }
    
    setIsLoadingManualTasks(true);
    try {
      // ✅ FIXED: Use project-specific task cleaning
      const response = await apiCall(`/api/projects/${projectId}/tasks/clean-manual`, {
        method: 'POST',
        body: JSON.stringify({ projectPath: activeIDE.workspacePath })
      });
      
      if (response && response.success) {
        // Reload tasks after cleaning
        await loadProjectTasks(activeIDE.workspacePath);
        setFeedback('Tasks cleaned successfully');
      } else {
        setFeedback('Task cleaning failed');
      }
    } catch (error) {
      logger.error('Error cleaning tasks:', error);
      setFeedback('Error cleaning tasks');
    } finally {
      setIsLoadingManualTasks(false);
    }
  };

  const handleOpenReviewModal = async () => {
    if (!projectId || !activeIDE?.workspacePath) {
      setFeedback('No project selected for task review');
      return;
    }
    
    setIsReviewLoading(true);
    try {
      // ✅ CRITICAL FIX: Sync tasks BEFORE opening review modal
      logger.info('🔄 Syncing tasks before opening review modal to ensure latest status...');
      await handleSyncTasks();
      
      // Wait a moment for sync to complete and data to refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Now open the modal with fresh data
      setIsReviewModalOpen(true);
      
      logger.info('Review modal opened with synced data');
      
    } catch (error) {
      logger.error('Error syncing before review modal:', error);
      setFeedback(`Failed to sync tasks: ${error.message}`);
    } finally {
      setIsReviewLoading(false);
    }
  };

  const handleStartReview = async (selectedTasks, taskMode = 'task-review') => {
    if (!projectId || !activeIDE?.workspacePath) {
      setFeedback('No project selected for task review');
      return;
    }
    
    setIsReviewLoading(true);
    try {
      // Use TaskReviewService to execute the workflow (sync already done in handleOpenReviewModal)
      const taskReviewService = new TaskReviewService();
      const result = await taskReviewService.executeTaskReviewWorkflow(
        selectedTasks, 
        projectId, 
        activeIDE.workspacePath,
        taskMode
      );
      
      setFeedback(result.message);
      
      // Refresh tasks to show updated status
      await loadTasks(true);
      
      // Close the modal
      setIsReviewModalOpen(false);
      
      logger.info('Task review workflow completed:', {
        taskCount: selectedTasks.length,
        projectId,
        taskMode,
        result: result.data
      });
      
    } catch (error) {
      logger.error('Error executing review workflow:', error);
      setFeedback(`Review failed: ${error.message}`);
    } finally {
      setIsReviewLoading(false);
    }
  };

  const handleGenerateTasks = async () => {
    try {
      const promptContent = await fetchPromptContent('prompts/development/generate-tasks.md');
      const message = `Generate tasks based on the current project analysis:\n\n${promptContent}`;
      eventBus.emit('sendMessage', { content: message, port: activePort });
    } catch (error) {
      logger.error('Error generating tasks:', error);
      setFeedback('Error generating tasks');
    }
  };

  const handleRefactorTasks = async () => {
    try {
      const promptContent = await fetchPromptContent('prompts/development/refactor-tasks.md');
      const message = `Start refactoring workflow:\n\n${promptContent}`;
      eventBus.emit('sendMessage', { content: message, port: activePort });
    } catch (error) {
      logger.error('Error starting refactoring:', error);
      setFeedback('Error starting refactoring');
    }
  };

  const handleTestTasks = async () => {
    try {
      const promptContent = await fetchPromptContent('prompts/development/test-tasks.md');
      const message = `Start testing workflow:\n\n${promptContent}`;
      eventBus.emit('sendMessage', { content: message, port: activePort });
    } catch (error) {
      logger.error('Error starting testing:', error);
      setFeedback('Error starting testing');
    }
  };

  const handleDeployTasks = async () => {
    try {
      const promptContent = await fetchPromptContent('prompts/development/deploy-tasks.md');
      const message = `Start deployment workflow:\n\n${promptContent}`;
      eventBus.emit('sendMessage', { content: message, port: activePort });
    } catch (error) {
      logger.error('Error starting deployment:', error);
      setFeedback('Error starting deployment');
    }
  };

  const handleSecurityTasks = async () => {
    try {
      const promptContent = await fetchPromptContent('prompts/development/security-tasks.md');
      const message = `Start security analysis:\n\n${promptContent}`;
      eventBus.emit('sendMessage', { content: message, port: activePort });
    } catch (error) {
      logger.error('Error starting security analysis:', error);
      setFeedback('Error starting security analysis');
    }
  };

  const handleOptimizeTasks = async () => {
    try {
      const promptContent = await fetchPromptContent('prompts/development/optimize-tasks.md');
      const message = `Start optimization workflow:\n\n${promptContent}`;
      eventBus.emit('sendMessage', { content: message, port: activePort });
    } catch (error) {
      logger.error('Error starting optimization:', error);
      setFeedback('Error starting optimization');
    }
  };

  const handleTaskClick = async (task) => {
    setSelectedManualTask(task);
    setIsManualTaskModalOpen(true);
    setIsLoadingManualTaskDetails(true);
    
    try {
      const response = await api.getManualTaskDetails(task.id);
      if (response && response.data) {
        setSelectedManualTask(response.data);
      }
    } catch (error) {
      logger.error('Error loading task details:', error);
      setFeedback('Error loading task details');
    } finally {
      setIsLoadingManualTaskDetails(false);
    }
  };

  const handleCloseManualTaskModal = () => {
    setIsManualTaskModalOpen(false);
    setSelectedManualTask(null);
  };

  const handleSendToChat = (messageContent) => {
    eventBus.emit('sendMessage', { content: messageContent, port: activePort });
  };

  const handleExecuteTask = async (taskDetails) => {
    try {
      // Get current project ID
      const projectId = await api.getCurrentProjectId();
      
      // ⚠️ DEPRECATED: This endpoint is deprecated and will be removed in a future version
      // TODO: Migrate to POST /api/projects/:projectId/tasks/enqueue for proper queue-based execution
      // Use the workflow execution endpoint for task execution
      console.warn('🚨 [TasksPanelComponent] Using DEPRECATED workflow/execute endpoint. Please migrate to tasks/enqueue');
      const response = await apiCall(`/api/projects/${projectId}/workflow/execute`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'task',
          taskType: 'manual',
          taskData: {
            id: taskDetails.id,
            title: taskDetails.title,
            description: taskDetails.content || taskDetails.description,
            type: 'manual',
            priority: taskDetails.priority || 'medium',
            category: taskDetails.category || 'manual'
          },
          options: {
            autoExecute: true,
            createGitBranch: true,
            clickNewChat: true
          }
        })
      });
      
      if (response && response.success) {
        setFeedback('Task executed successfully');
        loadTasks(); // Reload tasks to update status
      } else {
        throw new Error(response?.error || 'Task execution failed');
      }
    } catch (error) {
      logger.error('Error executing task:', error);
      setFeedback('Error executing task');
    }
  };

  const handleCreateTask = () => {
    setShowTaskCreationModal(true);
  };

  const handleCloseTaskCreationModal = () => {
    setShowTaskCreationModal(false);
  };

  const handleCompletionFilterToggle = () => {
    setShowCompletedTasks(!showCompletedTasks);
  };

  const handleTaskSubmit = async (taskData) => {
    if (!projectId || !activeIDE?.workspacePath) {
      setFeedback('No project selected for task creation');
      return;
    }
    
    try {
      // ✅ FIXED: Use project-specific task creation
      const response = await apiCall(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({
          ...taskData,
          projectPath: activeIDE.workspacePath
        })
      });
      
      if (response && response.success) {
        // Reload tasks after creation
        await loadProjectTasks(activeIDE.workspacePath);
        setFeedback('Task created successfully');
        setShowTaskCreationModal(false);
      } else {
        throw new Error(response?.error || 'Task creation failed');
      }
    } catch (error) {
      logger.error('Error creating task:', error);
      setFeedback('Error creating task');
    }
  };

  // ✅ FIXED: Filter and group tasks using state-based data
  const filteredTasks = (Array.isArray(manualTasks) ? manualTasks : []).filter(task => {
    // Apply completion filter first
    const isCompleted = isTaskCompleted(task);
    if (!showCompletedTasks && isCompleted) return false;
    
    // Apply existing filters
    const matchesSearch = !taskSearch || 
      getTaskTitle(task).toLowerCase().includes(taskSearch.toLowerCase()) ||
      getTaskDescription(task).toLowerCase().includes(taskSearch.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || (task.category || 'manual') === selectedCategory;
    
    const matchesFilter = taskFilter === 'all' || 
      getPriorityText(task.priority).toLowerCase() === taskFilter;
    
    return matchesSearch && matchesCategory && matchesFilter;
  });

  // Group tasks by featureId for display (to group related tasks together)
  const groupedTasks = filteredTasks.reduce((acc, task) => {
    const featureId = task.featureId || task.featureGroup || task.category || 'manual';
    if (!acc[featureId]) {
      acc[featureId] = [];
    }
    acc[featureId].push(task);
    return acc;
  }, {});

  // Get task counts for each category
  const getCategoryTaskCounts = () => {
    const counts = {};
    const tasks = Array.isArray(manualTasks) ? manualTasks : [];
    Object.keys(MAIN_CATEGORIES).forEach(category => {
      // Use the same logic as groupedTasks
      const taskCategory = category === 'manual' ? 'manual' : category;
      counts[category] = tasks.filter(task => (task.category || 'manual') === taskCategory).length;
    });
    return counts;
  };

  return (
    <div className="tasks-tab">
      {/* ✅ NEW: Enhanced Header with Project Context */}
      <div className="tasks-header">
        <div className="tasks-header-content">
          <div className="tasks-title-section">
            <h3 className="tasks-title">📋 Task Management</h3>
            {projectName && (
              <div className="project-context">
                <span className="project-label">Project:</span>
                <span className="project-name">{projectName}</span>
                <span className="task-count">({taskCount} tasks)</span>
              </div>
            )}
          </div>
          <div className="tasks-header-buttons">
            <button 
              className="btn-primary text-sm"
              onClick={handleCreateTask}
              disabled={!projectId}
              title={projectId ? "Create new task" : "No project selected"}
            >
              ➕ Create
            </button>
            <button 
              className="btn-secondary text-sm"
              onClick={handleSyncTasks}
              disabled={isLoadingManualTasks || !projectId}
              title={projectId ? "Sync tasks with backend" : "No project selected"}
            >
              {isLoadingManualTasks ? 'Syncing...' : '🔄 Sync'}
            </button>
            <button 
              className="btn-secondary text-sm"
              onClick={handleOpenReviewModal}
              disabled={isReviewLoading || !projectId || manualTasks.length === 0}
              title={projectId ? "Review selected tasks" : "No project selected"}
            >
              📋 Review
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="tasks-search-filter">
        <div className="search-filter-content">
          <input 
            type="text" 
            placeholder="Search tasks..." 
            className="search-input"
            value={taskSearch}
            onChange={(e) => setTaskSearch(e.target.value)}
          />
          <select 
            className="filter-select"
            value={taskFilter}
            onChange={(e) => setTaskFilter(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
          <button 
            className={`completion-filter-btn ${showCompletedTasks ? 'active' : ''}`}
            onClick={handleCompletionFilterToggle}
            title={showCompletedTasks ? "Hide completed tasks" : "Show completed tasks"}
          >
            {showCompletedTasks ? '✅' : '⏳'} Show Completed
          </button>
        </div>
      </div>

      {/* Main Content Area - Category Tabs + Tasks List */}
      <div className="tasks-main-content">
        {/* Category Tabs - Left Sidebar */}
        <div className="category-tabs-sidebar">
          <h4>Categories</h4>
          <div className="category-tabs-list">
            {Object.entries(MAIN_CATEGORIES).map(([key, category]) => {
              const count = getCategoryTaskCounts()[key] || 0;
              const isActive = selectedCategory === key;
              return (
                <button
                  key={key}
                  className={`category-tab ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(key)}
                >
                  <div className="category-tab-content">
                    <span className="category-tab-text">{getCategoryIcon(key)} {category}</span>
                    <span className="category-tab-count">{count}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Tasks List - Right Side */}
        <div className="tasks-list-container">
          {isLoadingManualTasks ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <span className="loading-text">Loading tasks...</span>
            </div>
          ) : isWaitingForSync && !isInitialSyncComplete ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <span className="loading-text">Waiting for task sync to complete...</span>
            </div>
          ) : filteredTasks.length > 0 ? (
            <div className="tasks-list">
              {Object.entries(groupedTasks).map(([featureId, featureTasks]) => {
                // Get the main task (index task) for display
                const mainTask = featureTasks.find(task => task.isIndexTask) || featureTasks[0];
                const featureName = mainTask?.name || featureId.replace(/_/g, ' ');
                
                return (
                  <div key={featureId} className="category-group">
                    <div className="category-header">
                      <TaskTypeBadge 
                        category={mainTask?.category || 'manual'}
                        size="small"
                        showSubcategory={false}
                      />
                      <span className="category-count">
                        {featureTasks.length} tasks
                      </span>
                    </div>
                    <div className="category-tasks">
                      {featureTasks.map((task) => (
                        <div
                          key={task.id}
                          className="task-item"
                          onClick={() => handleTaskClick(task)}
                        >
                          <div className="task-header">
                            <h4 className="task-title">{getTaskTitle(task)}</h4>
                            <div className="task-badges">
                              <span 
                                className="priority-badge"
                                style={{ backgroundColor: getPriorityColor(task.priority) }}
                              >
                                {getPriorityText(task.priority)}
                              </span>
                              <TaskCompletionBadge 
                                task={task}
                                size="small"
                                showIcon={true}
                                showProgress={true}
                              />
                            </div>
                          </div>
                          <div className="task-footer">
                            <span className="task-category">{task.category}</span>
                            <span className="task-date">{formatDate(task.createdAt || task.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-tasks">
              {taskSearch || selectedCategory !== 'all' || taskFilter !== 'all' 
                ? 'No tasks match your filters' 
                : 'No tasks found'}
            </div>
          )}
        </div>
      </div>

      {/* Vertical Action Buttons - Bottom */}
      <div className="vertical-action-buttons">
        <h4>Actions</h4>
        <div className="action-buttons-list">
          <button
            className="action-button"
            onClick={handleGenerateTasks}
            title="Generate"
          >
            <span className="action-icon">⚡</span>
            <span className="action-text">Generate</span>
          </button>
          <button
            className="action-button"
            onClick={handleRefactorTasks}
            title="Refactor"
          >
            <span className="action-icon">🔧</span>
            <span className="action-text">Refactor</span>
          </button>
          <button
            className="action-button"
            onClick={handleTestTasks}
            title="Test"
          >
            <span className="action-icon">🧪</span>
            <span className="action-text">Test</span>
          </button>
          <button
            className="action-button"
            onClick={handleDeployTasks}
            title="Deploy"
          >
            <span className="action-icon">🚀</span>
            <span className="action-text">Deploy</span>
          </button>
          <button
            className="action-button"
            onClick={handleSecurityTasks}
            title="Security"
          >
            <span className="action-icon">🔒</span>
            <span className="action-text">Security</span>
          </button>
          <button
            className="action-button"
            onClick={handleOptimizeTasks}
            title="Optimize"
          >
            <span className="action-icon">⚡</span>
            <span className="action-text">Optimize</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <ManualTaskDetailsModal
        isOpen={isManualTaskModalOpen}
        onClose={handleCloseManualTaskModal}
        taskDetails={selectedManualTask}
        isLoading={isLoadingManualTaskDetails}
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
      <TaskReviewSelectionModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        tasks={manualTasks}
        onStartReview={handleStartReview}
        isLoading={isReviewLoading}
      />
      {feedback && <div className="feedback-message">{feedback}</div>}
    </div>
  );
}

export default TasksPanelComponent;
