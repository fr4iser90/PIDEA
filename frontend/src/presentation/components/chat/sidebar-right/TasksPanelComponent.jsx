import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import APIChatRepository, { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import TaskSelectionModal from '../modal/TaskSelectionModal.jsx';
import ManualTaskDetailsModal from '../modal/ManualTaskDetailsModal.jsx';
import TaskCreationModal from '../modal/TaskCreationModal.jsx';

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

const TASK_TYPES = [
  { value: 'test', label: 'Test' },
  { value: 'refactor', label: 'Refactor' },
  { value: 'bugfix', label: 'Bugfix' },
  { value: 'doku', label: 'Doku' },
  { value: 'feature', label: 'Feature' },
  { value: 'custom', label: 'Custom' }
];

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

  // Regular Tasks
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [modalType, setModalType] = useState('feature');
  const [feedback, setFeedback] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [taskFilter, setTaskFilter] = useState('all');
  const [taskSearch, setTaskSearch] = useState('');

  // Docs Tasks
  const [manualTasks, setManualTasks] = useState([]);
  const [manualTaskFilter, setManualTaskFilter] = useState('all');
  const [manualTaskSearch, setManualTaskSearch] = useState('');
  const [selectedManualTask, setSelectedManualTask] = useState(null);
  const [isManualTaskModalOpen, setIsManualTaskModalOpen] = useState(false);
  const [isLoadingManualTasks, setIsLoadingManualTasks] = useState(false);
  const [isLoadingManualTaskDetails, setIsLoadingManualTaskDetails] = useState(false);

  // TaskSelectionModal (for refactoring etc.)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [refactoringTasks, setRefactoringTasks] = useState([]);
  const [isAutoRefactoring, setIsAutoRefactoring] = useState(false);

  // TaskCreationModal state
  const [showTaskCreationModal, setShowTaskCreationModal] = useState(false);



  // Load docs tasks on mount only
  useEffect(() => {
    if (activePort) {
      logger.info('Loading docs tasks for port:', activePort);
      loadManualTasks();
    } else {
      logger.info('No active port, clearing docs tasks');
      setManualTasks([]);
    }
  }, []); // ← Only load once on mount, not on every activePort change

  // Docs tasks functions
  const loadManualTasks = async () => {
    setIsLoadingManualTasks(true);
    try {
      const response = await api.getManualTasks();
      if (response.success) {
        setManualTasks(response.data || []);
      } else {
        setFeedback('Failed to load manual tasks');
      }
    } catch (error) {
              setFeedback('Error loading manual tasks: ' + error.message);
          } finally {
        setIsLoadingManualTasks(false);
      }
  };

  const handleSyncManualTasks = async () => {
    setIsLoadingManualTasks(true);
    try {
      logger.info('🔄 [TasksPanelComponent] Starting manual tasks sync...');
      const response = await api.syncManualTasks();
      if (response.success) {
        setFeedback(`✅ Successfully synced ${response.data.importedCount} manual tasks to database`);
        // Reload tasks after sync
        await loadManualTasks();
      } else {
        setFeedback('❌ Failed to sync manual tasks: ' + response.error);
      }
    } catch (error) {
      logger.error('Error syncing manual tasks:', error);
      setFeedback('❌ Error syncing manual tasks: ' + error.message);
    } finally {
      setIsLoadingManualTasks(false);
    }
  };

  const handleCleanManualTasks = async () => {
    if (!window.confirm('🗑️ Are you sure you want to delete ALL manual tasks from the database? This cannot be undone!')) {
      return;
    }
    
    setIsLoadingManualTasks(true);
    try {
      logger.info('🗑️ [TasksPanelComponent] Starting manual tasks cleanup...');
      const response = await api.cleanManualTasks();
      if (response.success) {
        setFeedback(`✅ Successfully deleted ${response.data.deletedCount} manual tasks from database`);
        // Reload tasks after cleanup
        await loadManualTasks();
      } else {
        setFeedback('❌ Failed to clean manual tasks: ' + response.error);
      }
    } catch (error) {
      logger.error('Error cleaning manual tasks:', error);
      setFeedback('❌ Error cleaning manual tasks: ' + error.message);
    } finally {
      setIsLoadingManualTasks(false);
    }
  };

  const handleManualTaskClick = async (task) => {
    setIsLoadingManualTaskDetails(true);
    setIsManualTaskModalOpen(true);
    setSelectedManualTask(null);
    
    try {
      // Find the group this task belongs to
      const featureId = task.metadata?.featureId || task.metadata?.featureGroup || task.id;
      const group = groupedList.find(g => g.featureId === featureId);
      
      logger.info('Loading task details for:', task.id);
      const response = await api.getManualTaskDetails(task.id);
      if (response.success && response.data) {
        logger.info('Task details loaded successfully:', response.data);
        const taskWithGroup = {
          ...response.data,
          featureGroup: group,
          allTasks: group ? {
            index: group.index,
            phases: group.phases,
            implementation: group.implementation,
            summary: group.summary
          } : null
        };
        setSelectedManualTask(taskWithGroup);
      } else {
        logger.warn('API returned no data, using task as fallback');
        // Fallback: use the task data we already have
        const taskWithGroup = {
          ...task,
          description: getTaskDescription(task),
          filename: getTaskFilename(task),
          featureGroup: group,
          allTasks: group ? {
            index: group.index,
            phases: group.phases,
            implementation: group.implementation,
            summary: group.summary
          } : null
        };
        setSelectedManualTask(taskWithGroup);
      }
    } catch (error) {
      logger.error('Error loading task details:', error);
      setFeedback('Error loading task details: ' + error.message);
            // Fallback: use the task data we already have
      const featureId = task.metadata?.featureId || task.metadata?.featureGroup || task.id;
      const group = groupedList.find(g => g.featureId === featureId);
      const taskWithGroup = {
        ...task,
        description: getTaskDescription(task),
        filename: getTaskFilename(task),
        featureGroup: group,
        allTasks: group ? {
          index: group.index,
          phases: group.phases,
          implementation: group.implementation,
          summary: group.summary
        } : null
      };
      setSelectedManualTask(taskWithGroup);
    } finally {
      setIsLoadingManualTaskDetails(false);
    }
  };

  const handleCloseManualTaskModal = () => {
    setIsManualTaskModalOpen(false);
    setSelectedManualTask(null);
  };

  // Handle sending task to chat
  const handleSendToChat = (messageContent) => {
    if (eventBus) {
      eventBus.emit('chat:send:message', { message: messageContent });
    }
    handleCloseManualTaskModal();
  };

  // Handle executing task (start auto-mode with git branch and new chat)
  const handleExecuteTask = async (taskDetails) => {
    try {
      // Load the execute prompt using the SAME function as everywhere else
      const executePromptContent = await fetchPromptContent('prompts/task-management/task-execute.md');

      // Create the complete task message
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

      // Get current project ID
      const projectId = await api.getCurrentProjectId();
      
      // Start auto-mode with the task
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
        handleCloseManualTaskModal();
      } else {
        throw new Error(autoModeResponse.error || 'Failed to start auto-mode');
      }
    } catch (error) {
      logger.error('Error executing task:', error);
      setFeedback('Failed to execute task: ' + error.message);
    }
  };

  // Docs tasks filter/search
  const filteredManualTasks = manualTasks.filter(task => {
    const taskTitle = String(task.title || '');
    const taskFilename = getTaskFilename(task);
    const matchesSearch = taskTitle.toLowerCase().includes(manualTaskSearch.toLowerCase()) ||
                         String(taskFilename).toLowerCase().includes(manualTaskSearch.toLowerCase());
    const matchesFilter = manualTaskFilter === 'all' || task.priority === manualTaskFilter;
    return matchesSearch && matchesFilter;
  });

  // Group tasks by feature (category/name)
  const groupedList = filteredManualTasks.reduce((acc, task) => {
    const featureId = task.metadata?.featureId || task.metadata?.featureGroup || task.id;
    const existingGroup = acc.find(g => g.featureId === featureId);
    
    if (existingGroup) {
      // Add task to existing group based on structure
      const structure = task.metadata?.structure || 'implementation';
      if (structure === 'index') {
        existingGroup.index = task;
      } else if (structure === 'phase') {
        if (!existingGroup.phases) existingGroup.phases = [];
        existingGroup.phases.push(task);
      } else if (structure === 'implementation') {
        existingGroup.implementation = task;
      } else if (structure === 'summary') {
        existingGroup.summary = task;
      }
    } else {
      // Create new group
      const newGroup = {
        featureId,
        featureName: task.metadata?.name || task.title,
        category: task.metadata?.category || 'Unknown',
        index: null,
        phases: [],
        implementation: null,
        summary: null
      };
      
      // Add first task to appropriate slot
      const structure = task.metadata?.structure || 'implementation';
      if (structure === 'index') {
        newGroup.index = task;
      } else if (structure === 'phase') {
        newGroup.phases.push(task);
      } else if (structure === 'implementation') {
        newGroup.implementation = task;
      } else if (structure === 'summary') {
        newGroup.summary = task;
      }
      
      acc.push(newGroup);
    }
    return acc;
  }, []);

  // Sort phases within each group
  groupedList.forEach(group => {
    if (group.phases) {
      group.phases.sort((a, b) => {
        const phaseA = a.metadata?.phaseNumber || 0;
        const phaseB = b.metadata?.phaseNumber || 0;
        return phaseA - phaseB;
      });
    }
  });



  // Task creation logic
  const handleCreateTask = () => {
    setShowTaskCreationModal(true);
  };

  const handleCloseTaskCreationModal = () => {
    setShowTaskCreationModal(false);
  };

  const handleTaskSubmit = async (taskData) => {
    setFeedback(null);
    try {
      logger.info('Task submitted:', taskData);
      
      // If this is a workflow result, handle it differently
      if (taskData.workflowId && taskData.workflowResult) {
        setFeedback(`✅ AI Task "${taskData.title}" created and executed successfully! Workflow ID: ${taskData.workflowId}`);
      } else {
        // Handle regular task creation
        await api.createTask(taskData);
        setFeedback(`✅ Task "${taskData.title}" created successfully!`);
      }
      
      setShowTaskCreationModal(false);
      
    } catch (err) {
      logger.error('Error handling task submission:', err);
      setFeedback('❌ Failed to create task: ' + (err.message || err));
      throw err;
    }
  };

  return (
    <div className="tasks-tab space-y-4 p-3">
      {/* Task Creation */}
      <div className="panel-block">
        <div className="flex gap-2 mb-4">
          <button className="btn-primary" onClick={handleCreateTask}>Create Task</button>
        </div>
      </div>
      {/* Manual Tasks Section */}
      <div className="panel-block">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-lg">📚 Manual Tasks</h3>
          <div className="flex gap-2">
            <button 
              className="btn-secondary text-sm"
              onClick={handleSyncManualTasks}
              disabled={isLoadingManualTasks}
            >
              {isLoadingManualTasks ? 'Syncing...' : '🔄 Sync'}
            </button>
            <button 
              className="btn-secondary text-sm"
              onClick={handleCleanManualTasks}
              disabled={isLoadingManualTasks}
            >
              {isLoadingManualTasks ? 'Cleaning...' : '🗑️ Clean'}
            </button>
            <button 
              className="btn-secondary text-sm"
              onClick={loadManualTasks}
              disabled={isLoadingManualTasks}
            >
              {isLoadingManualTasks ? 'Loading...' : '🔄 Refresh'}
            </button>
          </div>
        </div>
        {/* Manual Tasks Filter */}
        <div className="flex gap-2 mb-3">
          <input 
            type="text" 
            placeholder="Search manual tasks..." 
            className="flex-1 rounded p-2 bg-gray-800 text-gray-100 text-sm"
            value={manualTaskSearch}
            onChange={(e) => setManualTaskSearch(e.target.value)}
          />
          <select 
            className="rounded p-2 bg-gray-800 text-gray-100 text-sm"
            value={manualTaskFilter}
            onChange={(e) => setManualTaskFilter(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
        {/* Manual Tasks List */}
        <div className="bg-gray-900 rounded p-3 min-h-[200px] max-h-[300px] overflow-y-auto">
          {isLoadingManualTasks ? (
            <div className="flex items-center justify-center py-8">
              <div className="loading-spinner mr-3"></div>
              <span className="text-gray-400">Loading manual tasks...</span>
            </div>
          ) : filteredManualTasks.length > 0 ? (
            <div className="space-y-3">
              {filteredManualTasks.map((task) => {
                return (
                  <div
                    key={task.id}
                    className="manual-task-item p-3 bg-gray-800 rounded border border-gray-700 hover:border-gray-600 cursor-pointer transition-colors"
                    onClick={() => handleManualTaskClick(task)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-white text-sm line-clamp-2">
                        {getTaskTitle(task)}
                      </h4>
                      <div className="flex gap-1 flex-shrink-0 ml-2">
                        <span
                          className="priority-badge text-xs px-2 py-1 rounded"
                          style={{ backgroundColor: getPriorityColor(task.priority) }}
                        >
                          {getPriorityText(task.priority)}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-blue-600">
                          📋
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span className="font-mono">
                        {String(task.metadata?.structure || 'Documentation')} • {String(task.metadata?.category || 'Unknown')}
                      </span>
                      <span>{formatDate(task.updatedAt || task.createdAt || null)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              {manualTaskSearch || manualTaskFilter !== 'all' ? 'No tasks match your filters' : 'No manual tasks found'}
            </div>
          )}
        </div>
      </div>
      {/* Regular Task List & Filter */}
      <div className="panel-block">
        <h3 className="font-semibold mb-2">🔄 Active Tasks</h3>
        <div className="flex gap-2 mb-3">
          <input 
            type="text" 
            placeholder="Search tasks..." 
            className="flex-1 rounded p-2 bg-gray-800 text-gray-100"
            value={taskSearch}
            onChange={(e) => setTaskSearch(e.target.value)}
          />
          <select 
            className="rounded p-2 bg-gray-800 text-gray-100"
            value={taskFilter}
            onChange={(e) => setTaskFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        {/* Task List */}
        <div className="bg-gray-900 rounded p-3 min-h-[200px]">
          <div className="text-gray-400 text-sm">Active task list will be populated here</div>
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
      {feedback && <div className="text-sm text-blue-400">{feedback}</div>}
    </div>
  );
}

export default TasksPanelComponent;
