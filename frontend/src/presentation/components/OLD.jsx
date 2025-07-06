import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiCall, API_CONFIG } from '@infrastructure/repositories/APIChatRepository.jsx';
import ChatMessage from '@domain/entities/ChatMessage.jsx';
import FrameworkPanelComponent from './chat/FrameworkPanelComponent.jsx';
import '@css/framework-panel.css';
import useAuthStore from '@infrastructure/stores/AuthStore.jsx';

function RightPanelComponent({ eventBus, messages = [] }) {
  const [activeTab, setActiveTab] = useState('chat');
  const [isVisible, setIsVisible] = useState(true);
  const [quickPrompts, setQuickPrompts] = useState([]);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [settings, setSettings] = useState({});
  const [inputValue, setInputValue] = useState('');
  const [tasks, setTasks] = useState([]);
  const [taskStatus, setTaskStatus] = useState({});
  const [autoModeStatus, setAutoModeStatus] = useState({ isRunning: false, currentTask: null });
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', type: '', priority: 'low' });
  const [selectedTask, setSelectedTask] = useState(null);
  const containerRef = useRef(null);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    console.log('RightPanelComponent useEffect running, eventBus:', !!eventBus);
    setupEventListeners();
    loadPanelData();
    return () => {
      if (eventBus) {
        console.log('Cleaning up right panel event listeners');
        eventBus.off('right-panel-toggle', handleToggle);
        eventBus.off('files-attached', handleFilesAttached);
        eventBus.off('files-removed', handleFilesRemoved);
        eventBus.off('settings-updated', handleSettingsUpdate);
        eventBus.off('quick-prompt-selected', handleQuickPromptSelected);
        eventBus.off('task-created', handleTaskCreated);
        eventBus.off('task-updated', handleTaskUpdated);
        eventBus.off('task-executed', handleTaskExecuted);
        eventBus.off('auto-mode-started', handleAutoModeStarted);
        eventBus.off('auto-mode-stopped', handleAutoModeStopped);
      }
    };
  }, [eventBus]);

  const setupEventListeners = () => {
    if (eventBus) {
      console.log('Setting up right panel event listeners');
      eventBus.on('right-panel-toggle', handleToggle);
      eventBus.on('files-attached', handleFilesAttached);
      eventBus.on('files-removed', handleFilesRemoved);
      eventBus.on('settings-updated', handleSettingsUpdate);
      eventBus.on('quick-prompt-selected', handleQuickPromptSelected);
      eventBus.on('task-created', handleTaskCreated);
      eventBus.on('task-updated', handleTaskUpdated);
      eventBus.on('task-executed', handleTaskExecuted);
      eventBus.on('auto-mode-started', handleAutoModeStarted);
      eventBus.on('auto-mode-stopped', handleAutoModeStopped);
      console.log('Right panel event listeners set up');
    } else {
      console.log('No eventBus provided to RightPanelComponent');
    }
  };

  const loadPanelData = async () => {
    if (!isAuthenticated) return;
    try {
      // Load quick prompts
      const promptsData = await apiCall(API_CONFIG.endpoints.prompts.quick);
      if (promptsData.success) {
        setQuickPrompts(promptsData.prompts || []);
      }
      // Load settings
      const settingsData = await apiCall(API_CONFIG.endpoints.settings);
      if (settingsData.success) {
        setSettings(settingsData.settings || {});
      }
      // Load tasks
      await loadTasks();
    } catch (error) {
      console.error('❌ Failed to load panel data:', error);
    }
  };

  const handleToggle = useCallback(() => {
    console.log('Right panel toggle called, current state:', isVisible);
    setIsVisible(prev => {
      const newState = !prev;
      console.log('Right panel new state:', newState);
      return newState;
    });
  }, [isVisible]);
  const handleFilesAttached = useCallback((files) => setAttachedFiles(prevFiles => [...prevFiles, ...files]), []);
  const handleFilesRemoved = useCallback((fileIds) => setAttachedFiles(prevFiles => prevFiles.filter(f => !fileIds.includes(f.id))), []);
  const handleSettingsUpdate = useCallback((newSettings) => setSettings(newSettings), []);
  const handleQuickPromptSelected = useCallback((prompt) => { if (eventBus) { eventBus.emit('prompt-selected', { prompt }); } }, [eventBus]);
  const handleTabChange = (tab) => setActiveTab(tab);
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const fileData = files.map(file => ({ id: Date.now() + Math.random(), name: file.name, size: file.size, type: file.type, file: file }));
    handleFilesAttached(fileData);
  };
  const handleFileRemove = (fileId) => handleFilesRemoved([fileId]);
  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    if (eventBus) { eventBus.emit('setting-changed', { key, value }); }
  };
  const handleThemeChange = (theme) => {
    handleSettingChange('theme', theme);
    document.body.className = theme === 'light' ? 'light-theme' : '';
  };
  const handleRightPanelSend = () => {
    if (!inputValue.trim()) return;
    if (eventBus) { eventBus.emit('right-panel-message', { message: inputValue }); }
    setInputValue('');
  };
  const handleInputKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRightPanelSend(); } };
  const formatFileSize = (bytes) => { if (bytes === 0) return '0 Bytes'; const k = 1024; const sizes = ['Bytes', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]; };
  const renderChatTab = () => (
    <div className="chat-tab">
      <div className="quick-prompts">
        <h4>Quick Prompts</h4>
        <div className="prompt-list">
          {quickPrompts.map(prompt => (
            <button key={prompt.id} onClick={() => handleQuickPromptSelected(prompt)} className="prompt-btn">{prompt.title}</button>
          ))}
        </div>
      </div>
    </div>
  );
  const renderFilesTab = () => (
    <div className="files-tab">
      <div className="file-upload">
        <h4>Upload Files</h4>
        <div className="upload-area" onClick={() => document.getElementById('fileInput').click()}>
          <div className="upload-placeholder">Click to upload files or drag and drop</div>
        </div>
        <input id="fileInput" type="file" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
      </div>
      <div className="attached-files">
        <h4>Attached Files</h4>
        {attachedFiles.length === 0 ? (
          <div className="no-files">No files attached</div>
        ) : (
          <div className="file-list">
            {attachedFiles.map(file => (
              <div key={file.id} className="file-item">
                <span className="file-icon">📎</span>
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatFileSize(file.size)}</span>
                <button onClick={() => handleFileRemove(file.id)} className="file-remove-btn" title="Remove file">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  const renderSettingsTab = () => (
    <div className="settings-tab">
      <div className="setting-group">
        <h4>Appearance</h4>
        <div className="setting-item">
          <label>Theme:</label>
          <div className="theme-options">
            <button onClick={() => handleThemeChange('dark')} className={`theme-btn ${settings.theme === 'dark' ? 'active' : ''}`}>Dark</button>
            <button onClick={() => handleThemeChange('light')} className={`theme-btn ${settings.theme === 'light' ? 'active' : ''}`}>Light</button>
          </div>
        </div>
      </div>
      <div className="setting-group">
        <h4>Chat Settings</h4>
        <div className="setting-item">
          <label>Auto-scroll to bottom:</label>
          <input type="checkbox" checked={settings.autoScroll || false} onChange={(e) => handleSettingChange('autoScroll', e.target.checked)} />
        </div>
        <div className="setting-item">
          <label>Show timestamps:</label>
          <input type="checkbox" checked={settings.showTimestamps !== false} onChange={(e) => handleSettingChange('showTimestamps', e.target.checked)} />
        </div>
      </div>
    </div>
  );
  const renderFrameworksTab = () => (
    <div className="frameworks-tab">
      <FrameworkPanelComponent />
    </div>
  );
  
  const renderTasksTab = () => {
    console.log('🔍 [RightPanelComponent] renderTasksTab called, tasks:', tasks);
    return (
    <div className="tasks-tab">
      <div className="task-controls">
        <h4>Task Management</h4>
        <div className="task-actions">
          <button onClick={() => setShowCreateTask(true)} className="btn-primary">Create Task</button>
          <button onClick={loadTasks} className="btn-secondary" disabled={isLoadingTasks}>
            {isLoadingTasks ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      <div className="vibecoder-controls">
        <h4>🚀 VibeCoder Mode</h4>
        <div className="vibecoder-actions">
          <button onClick={() => startVibeCoderAnalyze()} className="btn-vibecoder analyze">
            🔍 Analyze Project
          </button>
          <button onClick={() => startVibeCoderRefactor()} className="btn-vibecoder refactor">
            🔧 Auto Refactor
          </button>
          <button onClick={() => startVibeCoderMode()} className="btn-vibecoder mode">
            ⚡ VibeCoder Mode
          </button>
        </div>
        <div className="vibecoder-status">
          <span className="status-indicator">💤</span>
          <span>Ready for VibeCoder Magic</span>
        </div>
      </div>
      
      <div className="auto-mode-section">
        <h4>Auto Mode</h4>
        <div className="auto-mode-controls">
          {autoModeStatus.isRunning ? (
            <div className="auto-mode-status running">
              <span className="status-indicator">🔄</span>
              <span>Auto Mode Running</span>
              <button onClick={stopAutoMode} className="btn-danger">Stop</button>
            </div>
          ) : (
            <div className="auto-mode-status stopped">
              <span className="status-indicator">⏸️</span>
              <span>Auto Mode Stopped</span>
              <button onClick={() => startAutoMode('default')} className="btn-success">Start</button>
            </div>
          )}
        </div>
        {autoModeStatus.currentTask && (
          <div className="current-task">
            <strong>Current Task:</strong> {autoModeStatus.currentTask.title}
          </div>
        )}
      </div>
      
      <div className="task-list">
        <h4>Tasks ({tasks.length})</h4>
        {tasks.length === 0 ? (
          <div className="no-tasks">No tasks available</div>
        ) : (
          <div className="task-items">
            {tasks.map(task => {
              if (!task) return null;
              return (
                <div key={task.id} className="task-item">
                  <div className="task-header">
                    <span className="task-title">{task.title || 'Untitled'}</span>
                    <span className={`task-status ${task.status || 'pending'}`}>{task.status || 'pending'}</span>
                  </div>
                  <div className="task-description">{task.description || 'No description'}</div>
                  <div className="task-meta">
                    <span className="task-type">{task.type || 'unknown'}</span>
                    <span className="task-priority">{task.priority || 'low'}</span>
                  </div>
                  <div className="task-actions">
                    <button 
                      onClick={() => executeTask(task.id)} 
                      className="btn-execute"
                      disabled={task.status === 'running' || task.status === 'completed'}
                    >
                      {task.status === 'running' ? 'Running...' : 'Execute'}
                    </button>
                    <button onClick={() => setSelectedTask(task)} className="btn-view">View</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {showCreateTask && (
        <div className="create-task-modal">
          <div className="modal-content">
            <h4>Create New Task</h4>
            <form onSubmit={handleCreateTaskSubmit}>
              <div className="form-group">
                <label>Title:</label>
                <input 
                  type="text" 
                  value={newTask.title} 
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Description:</label>
                <textarea 
                  value={newTask.description} 
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Type:</label>
                <select 
                  value={newTask.type} 
                  onChange={(e) => setNewTask(prev => ({ ...prev, type: e.target.value }))}
                  required
                >
                  <option value="">Select Type</option>
                  <option value="analysis">Analysis</option>
                  <option value="script">Script</option>
                  <option value="feature">Feature</option>
                  <option value="bugfix">Bug Fix</option>
                </select>
              </div>
              <div className="form-group">
                <label>Priority:</label>
                <select 
                  value={newTask.priority} 
                  onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value }))}
                  required
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">Create Task</button>
                <button type="button" onClick={() => setShowCreateTask(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    );
  };

  // Task Event Handlers
  const handleTaskCreated = useCallback((task) => {
    console.log('🔍 [RightPanelComponent] handleTaskCreated called with task:', task);
    if (!task) {
      console.error('❌ [RightPanelComponent] handleTaskCreated received undefined task');
      return;
    }
    setTasks(prev => [...prev, task]);
    if (eventBus) eventBus.emit('task-status-updated', { taskId: task.id, status: 'created' });
  }, [eventBus]);
  
  const handleTaskUpdated = useCallback((task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    if (eventBus) eventBus.emit('task-status-updated', { taskId: task.id, status: 'updated' });
  }, [eventBus]);
  
  const handleTaskExecuted = useCallback((task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    setTaskStatus(prev => ({ ...prev, [task.id]: task.status }));
    if (eventBus) eventBus.emit('task-status-updated', { taskId: task.id, status: task.status });
  }, [eventBus]);
  
  const handleAutoModeStarted = useCallback((data) => {
    console.log('🔍 [RightPanelComponent] Auto mode started:', data);
    setAutoModeStatus({ 
      isRunning: true, 
      currentTask: data.currentTask,
      session: data.session,
      tasks: data.tasks || []
    });
    if (eventBus) eventBus.emit('auto-mode-status-updated', { isRunning: true });
  }, [eventBus]);
  
  const handleAutoModeStopped = useCallback(() => {
    setAutoModeStatus({ isRunning: false, currentTask: null });
    if (eventBus) eventBus.emit('auto-mode-status-updated', { isRunning: false });
  }, [eventBus]);
  
  // Task Management Functions
  const loadTasks = async () => {
    if (!isAuthenticated) return;
    setIsLoadingTasks(true);
    try {
      const response = await apiCall(API_CONFIG.endpoints.tasks.projectTasks('default'));
      if (response.success) {
        setTasks(response.data || []);
      }
    } catch (error) {
      console.error('❌ Failed to load tasks:', error);
    } finally {
      setIsLoadingTasks(false);
    }
  };
  
  const createTask = async (taskData) => {
    try {
      const response = await apiCall(API_CONFIG.endpoints.tasks.projectCreate('default'), {
        method: 'POST',
        body: JSON.stringify(taskData)
      });
      console.log('🔍 [RightPanelComponent] createTask response:', response);
      if (response.success) {
        console.log('🔍 [RightPanelComponent] Calling handleTaskCreated with:', response.data);
        handleTaskCreated(response.data);
        return response.data;
      }
    } catch (error) {
      console.error('❌ Failed to create task:', error);
      throw error;
    }
  };
  
  const executeTask = async (taskId) => {
    try {
      const response = await apiCall(API_CONFIG.endpoints.tasks.projectExecute('default', taskId), {
        method: 'POST'
      });
      if (response.success) {
        handleTaskExecuted(response.data);
        return response.data;
      }
    } catch (error) {
      console.error('❌ Failed to execute task:', error);
      throw error;
    }
  };
  
  const startAutoMode = async (projectId = 'default') => {
    try {
      const response = await apiCall(API_CONFIG.endpoints.tasks.autoMode.start(projectId), {
        method: 'POST',
        body: JSON.stringify({})
      });
      if (response.success) {
        handleAutoModeStarted(response.data);
        return response.data;
      }
    } catch (error) {
      console.error('❌ Failed to start auto mode:', error);
      throw error;
    }
  };
  
  const stopAutoMode = async (projectId = 'default') => {
    try {
      const response = await apiCall(API_CONFIG.endpoints.tasks.autoMode.stop(projectId), {
        method: 'POST'
      });
      if (response.success) {
        handleAutoModeStopped();
        return response.data;
      }
    } catch (error) {
      console.error('❌ Failed to stop auto mode:', error);
      throw error;
    }
  };

  // 🚀 VibeCoder Mode Functions (using existing Auto Mode endpoints)
  const startVibeCoderAnalyze = async () => {
    try {
      console.log('🚀 Starting VibeCoder Analyze...');
      const response = await apiCall(API_CONFIG.endpoints.vibecoder.analyze('default'), {
        method: 'POST',
        body: JSON.stringify({
          mode: 'analyze',
          projectPath: '/home/fr4iser/Documents/Git/PIDEA/backend'
        })
      });
      if (response.success) {
        console.log('✅ VibeCoder Analyze started:', response);
        // Update UI to show analysis in progress
        if (eventBus) eventBus.emit('vibecoder-analyze-started', response.data);
      }
    } catch (error) {
      console.error('❌ Failed to start VibeCoder Analyze:', error);
    }
  };

  const startVibeCoderRefactor = async () => {
    try {
      console.log('🚀 Starting VibeCoder Refactor...');
      const response = await apiCall(API_CONFIG.endpoints.vibecoder.refactor('default'), {
        method: 'POST',
        body: JSON.stringify({
          mode: 'refactor',
          projectPath: '/home/fr4iser/Documents/Git/PIDEA/backend'
        })
      });
      if (response.success) {
        console.log('✅ VibeCoder Refactor started:', response);
        // Update UI to show refactoring in progress
        if (eventBus) eventBus.emit('vibecoder-refactor-started', response.data);
      }
    } catch (error) {
      console.error('❌ Failed to start VibeCoder Refactor:', error);
    }
  };

  const startVibeCoderMode = async () => {
    try {
      console.log('🚀 Starting VibeCoder Mode...');
      const response = await apiCall(API_CONFIG.endpoints.vibecoder.mode('default'), {
        method: 'POST',
        body: JSON.stringify({
          mode: 'full',
          projectPath: '/home/fr4iser/Documents/Git/PIDEA/backend'
        })
      });
      if (response.success) {
        console.log('✅ VibeCoder Mode started:', response);
        // Update UI to show VibeCoder mode in progress
        if (eventBus) eventBus.emit('vibecoder-mode-started', response.data);
      }
    } catch (error) {
      console.error('❌ Failed to start VibeCoder Mode:', error);
    }
  };

  const handleCreateTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      await createTask({
        title: newTask.title,
        description: newTask.description,
        type: newTask.type,
        priority: newTask.priority
      });
      setNewTask({ title: '', description: '', type: '', priority: 'low' });
      setShowCreateTask(false);
    } catch (error) {
      console.error('❌ Failed to create task:', error);
    }
  };

  return (
    <div ref={containerRef} className="chat-right-panel" style={{ display: isVisible ? 'flex' : 'none' }}>
      <div className="chat-right-panel-content">
        <div className="panel-header">
          <div className="panel-tabs">
            <button onClick={() => handleTabChange('chat')} className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}>Chat</button>
            <button onClick={() => handleTabChange('files')} className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}>Files</button>
            <button onClick={() => handleTabChange('tasks')} className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}>Tasks</button>
            <button onClick={() => handleTabChange('settings')} className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}>Settings</button>
            <button onClick={() => handleTabChange('frameworks')} className={`tab-btn ${activeTab === 'frameworks' ? 'active' : ''}`}>Frameworks</button>
          </div>
          <button onClick={handleToggle} className="btn-icon" title="Toggle Right Panel">✕</button>
        </div>
        <div className="panel-content">
          {activeTab === 'chat' && renderChatTab()}
          {activeTab === 'files' && renderFilesTab()}
          {activeTab === 'settings' && renderSettingsTab()}
          {activeTab === 'frameworks' && renderFrameworksTab()}
          {activeTab === 'tasks' && renderTasksTab()}
        </div>
        
        {/* Task Status Panel - Always visible when tasks are active */}
        {(activeTab === 'tasks' || autoModeStatus.isRunning || Object.keys(taskStatus).length > 0) && (
          <div className="task-status-panel">
            <div className="status-panel-header">
              <h5>Task Status</h5>
              <span className="status-indicator">
                {autoModeStatus.isRunning ? '🔄' : '⏸️'}
              </span>
            </div>
            <div className="status-panel-content">
              {autoModeStatus.isRunning && (
                <div className="auto-mode-status-item">
                  <div className="status-item-header">
                    <span className="status-label">Auto Mode</span>
                    <span className="status-value running">Running</span>
                  </div>
                  {autoModeStatus.session && (
                    <div className="session-info">
                      <span className="session-id">Session: {autoModeStatus.session.id}</span>
                      <span className="session-status">{autoModeStatus.session.status}</span>
                    </div>
                  )}
                  {autoModeStatus.tasks && autoModeStatus.tasks.length > 0 && (
                    <div className="auto-tasks-info">
                      <span className="tasks-count">{autoModeStatus.tasks.length} tasks generated</span>
                      <div className="auto-tasks-list">
                        {autoModeStatus.tasks.map(task => (
                          <div key={task.id} className="auto-task-item">
                            <span className="task-title">{task.title}</span>
                            <span className={`task-status ${task.status}`}>{task.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {autoModeStatus.currentTask && (
                    <div className="current-task-info">
                      <span className="task-name">{autoModeStatus.currentTask.title}</span>
                      <span className="task-progress">Processing...</span>
                    </div>
                  )}
                </div>
              )}
              
              {Object.entries(taskStatus).map(([taskId, status]) => {
                const task = tasks.find(t => t && t.id === taskId);
                if (!task) return null;
                
                return (
                  <div key={taskId} className="task-status-item">
                    <div className="status-item-header">
                      <span className="status-label">{task.title || 'Unknown Task'}</span>
                      <span className={`status-value ${status}`}>{status}</span>
                    </div>
                    <div className="task-progress-info">
                      {status === 'running' && <span className="progress-text">Executing...</span>}
                      {status === 'completed' && <span className="progress-text success">✓ Completed</span>}
                      {status === 'failed' && <span className="progress-text error">✗ Failed</span>}
                    </div>
                  </div>
                );
              })}
              
              {!autoModeStatus.isRunning && Object.keys(taskStatus).length === 0 && (
                <div className="no-active-tasks">
                  <span>No active tasks</span>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="right-panel-input-area">
          <textarea id="rightPanelMsgInput" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={handleInputKeyPress} placeholder="Quick message..." />
          <button id="rightPanelSendBtn" onClick={handleRightPanelSend} disabled={!inputValue.trim()}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default RightPanelComponent; 