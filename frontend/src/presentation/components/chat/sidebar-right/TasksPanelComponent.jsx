import React, { useState, useEffect } from 'react';
import APIChatRepository, { apiCall } from '@infrastructure/repositories/APIChatRepository.jsx';
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

function TasksPanelComponent({ eventBus }) {
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

  // Load docs tasks on mount
  useEffect(() => {
    loadDocsTasks();
  }, []);

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

  const handleDocsTaskClick = async (task) => {
    setIsLoadingDocsTaskDetails(true);
    setIsDocsTaskModalOpen(true);
    setSelectedDocsTask(null);
    try {
      const response = await api.getDocsTaskDetails(task.filename);
      if (response.success) {
        setSelectedDocsTask(response.data);
      } else {
        setFeedback('Failed to load task details: ' + response.error);
      }
    } catch (error) {
      setFeedback('Error loading task details: ' + error.message);
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
- **Estimated Time**: ${taskDetails.estimatedTime || 'Not specified'}
- **File**: ${taskDetails.filename}

## Task Content
${taskDetails.content}

## Execute Instructions
**Execute this task automatically using the above prompt framework. Create a Git branch named \`task/${taskDetails.id}-${Date.now()}\` and implement everything with zero user input required.**`;

      // Get current project ID
      const projectId = await api.getCurrentProjectId();
      
      // Start auto-mode with the task
      const autoModeResponse = await apiCall(`/api/projects/${projectId}/auto/execute`, {
        method: 'POST',
        body: JSON.stringify({
          task: taskMessage,
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
          <button 
            className="btn-secondary text-sm"
            onClick={loadDocsTasks}
            disabled={isLoadingDocsTasks}
          >
            {isLoadingDocsTasks ? 'Loading...' : '🔄 Refresh'}
          </button>
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
          ) : filteredDocsTasks.length > 0 ? (
            <div className="space-y-2">
              {filteredDocsTasks.map((task) => (
                <div 
                  key={task.id}
                  className="docs-task-item p-3 bg-gray-800 rounded border border-gray-700 hover:border-gray-600 cursor-pointer transition-colors"
                  onClick={() => handleDocsTaskClick(task)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-white text-sm line-clamp-2">
                      {task.title}
                    </h4>
                    <div className="flex gap-1 flex-shrink-0 ml-2">
                      <span 
                        className="priority-badge text-xs px-2 py-1 rounded"
                        style={{ backgroundColor: getPriorityColor(task.priority) }}
                      >
                        {task.priority}
                      </span>
                      {task.status && (
                        <span 
                          className="status-badge text-xs px-2 py-1 rounded"
                          style={{ backgroundColor: getStatusColor(task.status) }}
                        >
                          {task.status}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span className="font-mono">{task.filename}</span>
                    <span>{formatDate(task.lastModified)}</span>
                  </div>
                  {task.estimatedTime && (
                    <div className="mt-1 text-xs text-gray-500">
                      ⏱️ {task.estimatedTime}
                    </div>
                  )}
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
