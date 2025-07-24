import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import APIChatRepository, { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import TaskSelectionModal from '../modal/TaskSelectionModal.jsx';
import ManualTaskDetailsModal from '../modal/ManualTaskDetailsModal.jsx';
import TaskCreationModal from '../modal/TaskCreationModal.jsx';
import { getCategoryDisplay, getAllCategories, getCategoryIcon, getCategoryColor, MAIN_CATEGORIES } from '@/utils/taskTypeUtils';
import TaskTypeBadge from '@/components/TaskTypeBadge.jsx';
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
  const [manualTasks, setManualTasks] = useState([]);
  const [isLoadingManualTasks, setIsLoadingManualTasks] = useState(false);
  const [selectedManualTask, setSelectedManualTask] = useState(null);
  const [isManualTaskModalOpen, setIsManualTaskModalOpen] = useState(false);
  const [isLoadingManualTaskDetails, setIsLoadingManualTaskDetails] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskFilter, setTaskFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showTaskCreationModal, setShowTaskCreationModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [refactoringTasks, setRefactoringTasks] = useState([]);
  const [isAutoRefactoring, setIsAutoRefactoring] = useState(false);

  // Load tasks on component mount
  useEffect(() => {
    loadTasks();
  }, []); // Only run once on mount

  // Add task loading optimization
  const [lastLoadTime, setLastLoadTime] = useState(0);
  const loadTasksThrottle = 5000; // 5 seconds

  const loadTasks = async (force = false) => {
    const now = Date.now();
    
    // Prevent excessive loading
    if (!force && (now - lastLoadTime) < loadTasksThrottle) {
      logger.debug('Skipping task load - too recent');
      return;
    }

    setIsLoadingManualTasks(true);
    try {
      const response = await api.getManualTasks();
      if (response && response.data) {
        setManualTasks(response.data);
        setLastLoadTime(now);
      } else {
        setManualTasks([]);
      }
    } catch (error) {
      logger.error('Error loading manual tasks:', error);
      setManualTasks([]);
    } finally {
      setIsLoadingManualTasks(false);
    }
  };

  const handleSyncTasks = async () => {
    setIsLoadingManualTasks(true);
    try {
      const response = await api.syncManualTasks();
      if (response && response.data) {
        setManualTasks(response.data);
        setFeedback('Tasks synced successfully');
        setLastLoadTime(Date.now());
      }
    } catch (error) {
      logger.error('Error syncing tasks:', error);
      setFeedback('Error syncing tasks');
    } finally {
      setIsLoadingManualTasks(false);
    }
  };

  const handleCleanTasks = async () => {
    setIsLoadingManualTasks(true);
    try {
      const response = await api.cleanManualTasks();
      if (response && response.data) {
        setManualTasks(response.data);
        setFeedback('Tasks cleaned successfully');
      }
    } catch (error) {
      logger.error('Error cleaning tasks:', error);
      setFeedback('Error cleaning tasks');
    } finally {
      setIsLoadingManualTasks(false);
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
      const response = await api.executeManualTask(taskDetails.id);
      if (response && response.data) {
        setFeedback('Task executed successfully');
        loadTasks(); // Reload tasks to update status
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

  const handleTaskSubmit = async (taskData) => {
    try {
      const response = await api.createManualTask(taskData);
      if (response && response.data) {
        setManualTasks(prev => [...prev, response.data]);
        setFeedback('Task created successfully');
        setShowTaskCreationModal(false);
      }
    } catch (error) {
      logger.error('Error creating task:', error);
      setFeedback('Error creating task');
    }
  };

  // Filter and group tasks
  const filteredTasks = manualTasks.filter(task => {
    const matchesSearch = !taskSearch || 
      getTaskTitle(task).toLowerCase().includes(taskSearch.toLowerCase()) ||
      getTaskDescription(task).toLowerCase().includes(taskSearch.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || (task.category || 'manual') === selectedCategory;
    
    const matchesFilter = taskFilter === 'all' || 
      getPriorityText(task.priority).toLowerCase() === taskFilter;
    
    return matchesSearch && matchesCategory && matchesFilter;
  });

  // Group tasks by category for display
  const groupedTasks = filteredTasks.reduce((acc, task) => {
    const category = task.category || 'manual';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(task);
    return acc;
  }, {});

  // Get task counts for each category
  const getCategoryTaskCounts = () => {
    const counts = {};
    Object.keys(MAIN_CATEGORIES).forEach(category => {
      // Use the same logic as groupedTasks
      const taskCategory = category === 'manual' ? 'manual' : category;
      counts[category] = manualTasks.filter(task => (task.category || 'manual') === taskCategory).length;
    });
    return counts;
  };

  return (
    <div className="tasks-tab">
      {/* Simplified Header */}
      <div className="tasks-header">
        <div className="tasks-header-content">
          <h3 className="tasks-title">📋 Task Management</h3>
          <div className="tasks-header-buttons">
            <button 
              className="btn-primary text-sm"
              onClick={handleCreateTask}
              title="Create new task"
            >
              ➕ Create
            </button>
            <button 
              className="btn-secondary text-sm"
              onClick={handleSyncTasks}
              disabled={isLoadingManualTasks}
              title="Sync tasks with backend"
            >
              {isLoadingManualTasks ? 'Syncing...' : '🔄 Sync'}
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
          ) : filteredTasks.length > 0 ? (
            <div className="tasks-list">
              {Object.entries(groupedTasks).map(([category, categoryTasks]) => (
                <div key={category} className="category-group">
                  <div className="category-header">
                    <TaskTypeBadge 
                      category={category}
                      size="small"
                      showSubcategory={false}
                    />
                    <span className="category-count">
                      {categoryTasks.length} tasks
                    </span>
                  </div>
                  <div className="category-tasks">
                    {categoryTasks.map((task) => (
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
                            <span 
                              className="status-badge"
                              style={{ backgroundColor: getStatusColor(task.status) }}
                            >
                              {getStatusText(task.status)}
                            </span>
                          </div>
                        </div>
                        <div className="task-footer">
                          <span className="task-category">{task.category}</span>
                          <span className="task-date">{formatDate(task.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
      {feedback && <div className="feedback-message">{feedback}</div>}
    </div>
  );
}

export default TasksPanelComponent;
