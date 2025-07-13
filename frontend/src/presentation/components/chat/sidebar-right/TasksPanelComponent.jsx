import React, { useState, useEffect } from 'react';
import APIChatRepository, { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import TaskSelectionModal from '../modal/TaskSelectionModal.jsx';
import DocsTaskDetailsModal from '../modal/DocsTaskDetailsModal.jsx';

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
  // Regular Tasks
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [modalType, setModalType] = useState('feature');
  const [feedback, setFeedback] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [taskFilter, setTaskFilter] = useState('all');
  const [taskSearch, setTaskSearch] = useState('');

  // Docs Tasks
  const [docsTasks, setDocsTasks] = useState([]);
  const [docsTaskFilter, setDocsTaskFilter] = useState('all');
  const [docsTaskSearch, setDocsTaskSearch] = useState('');
  const [selectedDocsTask, setSelectedDocsTask] = useState(null);
  const [isDocsTaskModalOpen, setIsDocsTaskModalOpen] = useState(false);
  const [isLoadingDocsTasks, setIsLoadingDocsTasks] = useState(false);
  const [isLoadingDocsTaskDetails, setIsLoadingDocsTaskDetails] = useState(false);

  // TaskSelectionModal (for refactoring etc.)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [refactoringTasks, setRefactoringTasks] = useState([]);
  const [isAutoRefactoring, setIsAutoRefactoring] = useState(false);

  // Load docs tasks on mount AND when activePort changes
  useEffect(() => {
    if (activePort) {
      console.log('[TasksPanelComponent] Loading docs tasks for port:', activePort);
      loadDocsTasks();
    } else {
      console.log('[TasksPanelComponent] No active port, clearing docs tasks');
      setDocsTasks([]);
    }
  }, [activePort]); // ← Jetzt lädt bei activePort Änderungen neu

  // Docs tasks functions
  const loadDocsTasks = async () => {
    setIsLoadingDocsTasks(true);
    try {
      const response = await api.getDocsTasks();
      if (response.success) {
        setDocsTasks(response.data || []);
      } else {
        setFeedback('Failed to load documentation tasks');
      }
    } catch (error) {
      setFeedback('Error loading documentation tasks: ' + error.message);
    } finally {
      setIsLoadingDocsTasks(false);
    }
  };

  const handleSyncDocsTasks = async () => {
    setIsLoadingDocsTasks(true);
    try {
      console.log('🔄 [TasksPanelComponent] Starting docs tasks sync...');
      const response = await api.syncDocsTasks();
      if (response.success) {
        setFeedback(`✅ Successfully synced ${response.data.importedCount} docs tasks to database`);
        // Reload tasks after sync
        await loadDocsTasks();
      } else {
        setFeedback('❌ Failed to sync documentation tasks: ' + response.error);
      }
    } catch (error) {
      console.error('Error syncing docs tasks:', error);
      setFeedback('❌ Error syncing docs tasks: ' + error.message);
    } finally {
      setIsLoadingDocsTasks(false);
    }
  };

  const handleCleanDocsTasks = async () => {
    if (!window.confirm('🗑️ Are you sure you want to delete ALL docs tasks from the database? This cannot be undone!')) {
      return;
    }
    
    setIsLoadingDocsTasks(true);
    try {
      console.log('🗑️ [TasksPanelComponent] Starting docs tasks cleanup...');
      const response = await api.cleanDocsTasks();
      if (response.success) {
        setFeedback(`✅ Successfully deleted ${response.data.deletedCount} docs tasks from database`);
        // Reload tasks after cleanup
        await loadDocsTasks();
      } else {
        setFeedback('❌ Failed to clean documentation tasks: ' + response.error);
      }
    } catch (error) {
      console.error('Error cleaning docs tasks:', error);
      setFeedback('❌ Error cleaning docs tasks: ' + error.message);
    } finally {
      setIsLoadingDocsTasks(false);
    }
  };

  const handleDocsTaskClick = async (task) => {
    setIsLoadingDocsTaskDetails(true);
    setIsDocsTaskModalOpen(true);
    setSelectedDocsTask(null);
    try {
      console.log('[TasksPanelComponent] Loading task details for:', task.id);
      const response = await api.getDocsTaskDetails(task.id);
      if (response.success && response.data) {
        console.log('[TasksPanelComponent] Task details loaded successfully:', response.data);
        setSelectedDocsTask(response.data);
      } else {
        console.warn('[TasksPanelComponent] API returned no data, using task as fallback');
        // Fallback: use the task data we already have
        setSelectedDocsTask({
          ...task,
          description: getTaskDescription(task),
          filename: getTaskFilename(task)
        });
      }
    } catch (error) {
      console.error('[TasksPanelComponent] Error loading task details:', error);
      setFeedback('Error loading task details: ' + error.message);
      // Fallback: use the task data we already have
      setSelectedDocsTask({
        ...task,
        description: getTaskDescription(task),
        filename: getTaskFilename(task)
      });
    } finally {
      setIsLoadingDocsTaskDetails(false);
    }
  };

  const handleCloseDocsTaskModal = () => {
    setIsDocsTaskModalOpen(false);
    setSelectedDocsTask(null);
  };

  // Handle sending task to chat
  const handleSendToChat = (messageContent) => {
    if (eventBus) {
      eventBus.emit('chat:send:message', { message: messageContent });
    }
    handleCloseDocsTaskModal();
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
      const autoModeResponse = await apiCall(`/api/projects/${projectId}/auto/execute`, {
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
      console.error('Error executing task:', error);
      setFeedback('Failed to execute task: ' + error.message);
    }
  };

  // Docs tasks filter/search
  const filteredDocsTasks = docsTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(docsTaskSearch.toLowerCase()) ||
                         task.filename.toLowerCase().includes(docsTaskSearch.toLowerCase());
    const matchesFilter = docsTaskFilter === 'all' || task.priority === docsTaskFilter;
    return matchesSearch && matchesFilter;
  });

  // Group tasks by summary and implementation
  const groupedList = filteredDocsTasks.reduce((acc, task) => {
    const summary = acc.find(g => g.summary?.id === task.id);
    if (summary) {
      // If summary exists, add implementation to its group
      summary.implementation = task;
    } else {
      // Otherwise, create a new group for the summary
      acc.push({
        summary: task,
        implementation: null
      });
    }
    return acc;
  }, []);

  // Only show groups with a summary task
  // Fix: Removed reference to undefined 'phases' variable
  const groupedSummaryList = groupedList.filter(group => group.summary);

  // Task creation logic
  const handleCreateTask = () => {
    setModalType('feature');
    setShowTaskModal(true);
  };

  const handleTaskSubmit = async (taskData) => {
    setFeedback(null);
    try {
      await api.createTask(taskData);
      setFeedback('Task created successfully!');
      setShowTaskModal(false);
      // Optionally reload tasks here
    } catch (err) {
      setFeedback('Failed to create task: ' + (err.message || err));
      throw err;
    }
  };

  // Helper function to get filename from task
  const getTaskFilename = (task) => {
    return (
      task.metadata?.filename ||
      task.filename ||
      (task.metadata?.category && task.metadata.category.filename) ||
      'Unknown file'
    );
  };

  // Helper function to get task description
  const getTaskDescription = (task) => {
    return task.description || 
           task.content || 
           task.details || 
           task.metadata?.description || 
           'No description available';
  };

  // Helper
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return '#ff4444';
      case 'medium': return '#ffaa00';
      case 'low': return '#44aa44';
      default: return '#888888';
    }
  };
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '#44aa44';
      case 'in-progress': return '#ffaa00';
      case 'blocked': return '#ff4444';
      case 'pending': return '#888888';
      default: return '#888888';
    }
  };
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
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
      {/* Documentation Tasks Section */}
      <div className="panel-block">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-lg">📚 Documentation Tasks</h3>
          <div className="flex gap-2">
            <button 
              className="btn-secondary text-sm"
              onClick={handleSyncDocsTasks}
              disabled={isLoadingDocsTasks}
            >
              {isLoadingDocsTasks ? 'Syncing...' : '🔄 Sync'}
            </button>
            <button 
              className="btn-secondary text-sm"
              onClick={handleCleanDocsTasks}
              disabled={isLoadingDocsTasks}
            >
              {isLoadingDocsTasks ? 'Cleaning...' : '🗑️ Clean'}
            </button>
            <button 
              className="btn-secondary text-sm"
              onClick={loadDocsTasks}
              disabled={isLoadingDocsTasks}
            >
              {isLoadingDocsTasks ? 'Loading...' : '🔄 Refresh'}
            </button>
          </div>
        </div>
        {/* Docs Tasks Filter */}
        <div className="flex gap-2 mb-3">
          <input 
            type="text" 
            placeholder="Search docs tasks..." 
            className="flex-1 rounded p-2 bg-gray-800 text-gray-100 text-sm"
            value={docsTaskSearch}
            onChange={(e) => setDocsTaskSearch(e.target.value)}
          />
          <select 
            className="rounded p-2 bg-gray-800 text-gray-100 text-sm"
            value={docsTaskFilter}
            onChange={(e) => setDocsTaskFilter(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
        {/* Docs Tasks List */}
        <div className="bg-gray-900 rounded p-3 min-h-[200px] max-h-[300px] overflow-y-auto">
          {isLoadingDocsTasks ? (
            <div className="flex items-center justify-center py-8">
              <div className="loading-spinner mr-3"></div>
              <span className="text-gray-400">Loading documentation tasks...</span>
            </div>
          ) : groupedSummaryList.length > 0 ? (
            <div className="space-y-2">
              {groupedSummaryList.map((group) => (
                <div
                  key={group.summary.id}
                  className="docs-task-item p-3 bg-gray-800 rounded border border-gray-700 hover:border-gray-600 cursor-pointer transition-colors"
                  onClick={() => handleDocsTaskClick(group.summary)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-white text-sm line-clamp-2">
                      {group.summary.title}
                    </h4>
                    <div className="flex gap-1 flex-shrink-0 ml-2">
                      <span
                        className="priority-badge text-xs px-2 py-1 rounded"
                        style={{ backgroundColor: getPriorityColor(group.summary.priority) }}
                      >
                        {group.summary.priority}
                      </span>
                      {group.summary.status && (
                        <span
                          className="status-badge text-xs px-2 py-1 rounded"
                          style={{ backgroundColor: getStatusColor(group.summary.status) }}
                        >
                          {group.summary.status}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span className="font-mono">{getTaskFilename(group.summary)}</span>
                    <span>{formatDate(group.summary.updatedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              {docsTaskSearch || docsTaskFilter !== 'all' ? 'No tasks match your filters' : 'No documentation tasks found'}
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
      {feedback && <div className="text-sm text-blue-400">{feedback}</div>}
    </div>
  );
}

export default TasksPanelComponent;
