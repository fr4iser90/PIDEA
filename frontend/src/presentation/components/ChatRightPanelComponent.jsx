import React, { useState, useEffect } from 'react';
import AnalysisPanelComponent from './chat/panel/AnalysisPanelComponent.jsx';
import APIChatRepository from '../../infrastructure/repositories/APIChatRepository.jsx';
import FrameworkPanelComponent from './chat/FrameworkPanelComponent.jsx';
import TaskSelectionModal from './TaskSelectionModal';

const TASK_TYPES = [
  { value: 'test', label: 'Test' },
  { value: 'refactor', label: 'Refactor' },
  { value: 'bugfix', label: 'Bugfix' },
  { value: 'doku', label: 'Doku' },
  { value: 'feature', label: 'Feature' },
  { value: 'custom', label: 'Custom' }
];

function TaskModal({ open, onClose, onSubmit, defaultType }) {
  const [type, setType] = useState(defaultType || 'feature');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setType(defaultType || 'feature');
    setTitle('');
    setDescription('');
    setPriority('medium');
    setError(null);
  }, [open, defaultType]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!title.trim()) throw new Error('Title is required');
      await onSubmit({ type, title, description, priority });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <form className="bg-gray-900 text-gray-100 rounded-lg shadow-lg p-6 w-full max-w-md" onSubmit={handleSubmit}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Create Task</h2>
          <button type="button" className="text-gray-400 hover:text-white" onClick={onClose}>✖</button>
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">Type</label>
          <select className="w-full rounded p-2 bg-gray-800" value={type} onChange={e => setType(e.target.value)}>
            {TASK_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">Title</label>
          <input className="w-full rounded p-2 bg-gray-800" value={title} onChange={e => setTitle(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">Description</label>
          <textarea className="w-full rounded p-2 bg-gray-800" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">Priority</label>
          <select className="w-full rounded p-2 bg-gray-800" value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        {error && <div className="text-red-400 mb-2 text-sm">{error}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create'}</button>
        </div>
      </form>
    </div>
  );
}

function ChatRightPanelComponent({ eventBus }) {
  const [currentTab, setCurrentTab] = useState('tasks');
  const [isVisible, setIsVisible] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [modalType, setModalType] = useState('feature');
  const [feedback, setFeedback] = useState(null);
  const api = new APIChatRepository();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [refactoringTasks, setRefactoringTasks] = useState([]);
  const [isAutoRefactoring, setIsAutoRefactoring] = useState(false);
  
  // Task-related state
  const [tasks, setTasks] = useState([]);
  const [taskFilter, setTaskFilter] = useState('all');
  const [taskSearch, setTaskSearch] = useState('');
  
  // Auto mode state
  const [autoStatus, setAutoStatus] = useState('stopped');
  const [autoLogs, setAutoLogs] = useState([]);
  const [autoSettings, setAutoSettings] = useState({
    features: { analyze: true, refactor: true, test: true },
    thresholds: { confidence: 0.8, complexity: 10 }
  });
  
  // Prompts state
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);

  // General Button Handlers
  const handleCreateTask = () => {
    setModalType('feature');
    setShowTaskModal(true);
  };
  
  const handleAnalyzeProject = async () => { 
    setFeedback('Starting Project Analysis...');
    try {
      const projectId = await api.getCurrentProjectId();
      const response = await api.analyzeProject(null, {
        analysisType: 'full',
        includeAI: true
      }, projectId);
      if (response.success) {
        setFeedback('Project Analysis completed successfully!');
        if (eventBus) eventBus.emit('project-analysis-completed', response.data);
      } else {
        setFeedback('Failed to analyze project: ' + response.error);
      }
    } catch (err) {
      setFeedback('Error analyzing project: ' + (err.message || err));
    }
  };
  
  const handleRefresh = async () => { 
    setFeedback('Refreshing project data...');
    try {
      const projectId = await api.getCurrentProjectId();
      const response = await api.detectWorkspacePaths();
      if (response.success) {
        setFeedback('Project data refreshed successfully!');
        if (eventBus) eventBus.emit('project-data-refreshed', response.data);
      } else {
        setFeedback('Failed to refresh project data: ' + response.error);
      }
    } catch (err) {
      setFeedback('Error refreshing project data: ' + (err.message || err));
    }
  };

  // Preset Handlers
  const handlePreset = (type) => {
    setModalType(type);
    setShowTaskModal(true);
  };
  
  const handleCustomPreset = () => {
    setModalType('custom');
    setShowTaskModal(true);
  };

  // VibeCoder Mode Handlers
  const handleVibeCoderStart = async () => { 
    setFeedback('Starting VibeCoder Mode...');
    try {
      const projectId = await api.getCurrentProjectId();
      const response = await api.startAutoMode(projectId, {
        mode: 'full'
      });
      if (response.success) {
        setAutoStatus('running');
        setFeedback('VibeCoder Mode started successfully!');
        if (eventBus) eventBus.emit('vibecoder-mode-started', response.data);
      } else {
        setFeedback('Failed to start VibeCoder Mode: ' + response.error);
      }
    } catch (err) {
      setFeedback('Error starting VibeCoder Mode: ' + (err.message || err));
    }
  };
  
  const handleAutoAnalyze = async () => { 
    setFeedback('Starting Auto Analyze...');
    try {
      const projectId = await api.getCurrentProjectId();
      const response = await api.startAutoMode(projectId, {
        mode: 'analysis'
      });
      if (response.success) {
        setAutoStatus('analyzing');
        setFeedback('Auto Analyze started successfully!');
        if (eventBus) eventBus.emit('vibecoder-analyze-started', response.data);
      } else {
        setFeedback('Failed to start Auto Analyze: ' + response.error);
      }
    } catch (err) {
      setFeedback('Error starting Auto Analyze: ' + (err.message || err));
    }
  };
  
  const handleAutoRefactor = async () => {
    try {
      setIsAutoRefactoring(true);
      const response = await api.startAutoRefactor();
      
      if (response.success && response.data) {
        const tasks = response.data.tasks || [];
        setRefactoringTasks(tasks);
        setIsTaskModalOpen(true);
      } else {
        console.error('Auto Refactor failed:', response.error);
      }
    } catch (error) {
      console.error('Error starting Auto Refactor:', error);
    } finally {
      setIsAutoRefactoring(false);
    }
  };
  
  const handleAutoTest = async () => { 
    setFeedback('Starting Auto Test...');
    try {
      const projectId = await api.getCurrentProjectId();
      const response = await api.startAutoMode(projectId, {
        mode: 'testing'
      });
      if (response.success) {
        setAutoStatus('testing');
        setFeedback('Auto Test started successfully!');
        if (eventBus) eventBus.emit('vibecoder-test-started', response.data);
      } else {
        setFeedback('Failed to start Auto Test: ' + response.error);
      }
    } catch (err) {
      setFeedback('Error starting Auto Test: ' + (err.message || err));
    }
  };
  
  const handleAutoStop = async () => { 
    setFeedback('Stopping Auto Mode...');
    try {
      const projectId = await api.getCurrentProjectId();
      const response = await api.stopAutoMode(projectId);
      if (response.success) {
        setAutoStatus('stopped');
        setFeedback('Auto Mode stopped successfully!');
        if (eventBus) eventBus.emit('vibecoder-stopped', response.data);
      } else {
        setFeedback('Failed to stop Auto Mode: ' + response.error);
      }
    } catch (err) {
      setFeedback('Error stopping Auto Mode: ' + (err.message || err));
    }
  };

  // Task creation logic
  const handleTaskSubmit = async (taskData) => {
    setFeedback(null);
    try {
      await api.createTask(taskData);
      setFeedback('Task created successfully!');
    } catch (err) {
      setFeedback('Failed to create task: ' + (err.message || err));
      throw err;
    }
  };

  // Tab switch
  const handleTabSwitch = (tab) => setCurrentTab(tab);
  const handleTogglePanel = () => setIsVisible(v => !v);

  // EventBus-Listener
  useEffect(() => {
    if (!eventBus) return;
    // Additional event listeners can be added here
  }, [eventBus]);

  const handleQuickPrompt = (prompt) => eventBus.emit('chat-right-panel:quick-prompt', { prompt });

  const handleStartRefactoring = async (selectedTasks) => {
    console.log('Starting refactoring for tasks:', selectedTasks);
    setIsTaskModalOpen(false);
    
    if (!selectedTasks || selectedTasks.length === 0) {
      alert('No tasks selected for refactoring');
      return;
    }

    try {
      setFeedback(`Starting automated refactoring for ${selectedTasks.length} tasks...`);
      
      const executionResults = [];
      
      for (const task of selectedTasks) {
        try {
          setFeedback(`Executing task: ${task.title}...`);
          
          console.log('🔍 [ChatRightPanelComponent] Executing task:', {
            id: task.id,
            title: task.title,
            projectPath: task.projectPath,
            filePath: task.filePath
          });
          
          const result = await api.executeTask(task.id);
          
          console.log('🔍 [ChatRightPanelComponent] Task execution result:', result);
          
          if (result.success) {
            executionResults.push({
              taskId: task.id,
              taskTitle: task.title,
              status: 'success',
              result: result.data
            });
            setFeedback(`✅ Task "${task.title}" executed successfully`);
          } else {
            executionResults.push({
              taskId: task.id,
              taskTitle: task.title,
              status: 'failed',
              error: result.error || 'Unknown error'
            });
            setFeedback(`❌ Task "${task.title}" failed: ${result.error}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`Failed to execute task ${task.id}:`, error);
          executionResults.push({
            taskId: task.id,
            taskTitle: task.title,
            status: 'error',
            error: error.message
          });
          setFeedback(`❌ Task "${task.title}" error: ${error.message}`);
        }
      }
      
      const successfulTasks = executionResults.filter(r => r.status === 'success');
      const failedTasks = executionResults.filter(r => r.status !== 'success');
      
      setFeedback(`Refactoring completed! ${successfulTasks.length} successful, ${failedTasks.length} failed.`);
      
      console.log('Refactoring execution results:', executionResults);
      
      await handleRefresh();
      
    } catch (error) {
      console.error('Refactoring workflow failed:', error);
      setFeedback(`❌ Refactoring workflow failed: ${error.message}`);
    }
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setRefactoringTasks([]);
  };

  // Tab Content Renderers
  const renderTasksTab = () => (
    <div className="tasks-tab space-y-4 p-3">
      {/* Task Creation */}
      <div className="panel-block">
        <div className="flex gap-2 mb-4">
          <button className="btn-primary" onClick={handleCreateTask}>Create Task</button>
          <button className="btn-secondary" onClick={handleAnalyzeProject}>Analyze Project</button>
          <button className="btn-secondary" onClick={handleRefresh}>Refresh</button>
        </div>
        
        {/* Task Presets */}
        <div className="mb-4">
          <div className="font-semibold mb-2">Quick Presets:</div>
          <div className="flex gap-2 flex-wrap">
            <button className="btn-preset" onClick={() => handlePreset('test')}>Test Task</button>
            <button className="btn-preset" onClick={() => handlePreset('refactor')}>Refactor Task</button>
            <button className="btn-preset" onClick={() => handlePreset('bugfix')}>Bugfix Task</button>
            <button className="btn-preset" onClick={() => handlePreset('doku')}>Doku Task</button>
            <button className="btn-preset" onClick={handleCustomPreset}>+ Custom</button>
          </div>
        </div>
      </div>

      {/* Task List & Filter */}
      <div className="panel-block">
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
          <div className="text-gray-400 text-sm">Task list will be populated here</div>
        </div>
      </div>

      {/* Task Details */}
      <div className="panel-block">
        <div className="font-semibold mb-2">Task Details</div>
        <div className="bg-gray-900 rounded p-3 min-h-[100px]">
          <div className="text-gray-400 text-sm">Select a task to view details</div>
        </div>
      </div>

      {feedback && <div className="text-sm text-blue-400">{feedback}</div>}
    </div>
  );

  const renderAutoTab = () => (
    <div className="auto-tab space-y-4 p-3">
      {/* Auto Status */}
      <div className="panel-block">
        <div className="font-semibold mb-2">Auto Mode Status</div>
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-3 h-3 rounded-full ${autoStatus === 'running' ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm capitalize">{autoStatus}</span>
        </div>
      </div>

      {/* Auto Controls */}
      <div className="panel-block">
        <div className="font-semibold mb-2">Auto Features</div>
        <div className="flex gap-2 flex-wrap mb-3">
          <button className="btn-vibecoder" onClick={handleVibeCoderStart}>VibeCoder Mode Start</button>
          <button className="btn-vibecoder" onClick={handleAutoAnalyze}>Auto Analyze</button>
          <button className="btn-vibecoder" onClick={handleAutoRefactor}>Auto Refactor</button>
          <button className="btn-vibecoder" onClick={handleAutoTest}>Auto Test</button>
          <button className="btn-danger" onClick={handleAutoStop}>Stop</button>
        </div>
      </div>

      {/* Auto Logs */}
      <div className="panel-block">
        <div className="font-semibold mb-2">Auto Logs</div>
        <div className="bg-gray-900 rounded p-3 min-h-[150px] max-h-[200px] overflow-y-auto">
          <div className="text-gray-400 text-sm">Auto mode logs will appear here</div>
        </div>
      </div>

      {/* Auto Settings */}
      <div className="panel-block">
        <div className="font-semibold mb-2">Auto Settings</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Auto Analyze</span>
            <input 
              type="checkbox" 
              checked={autoSettings.features.analyze}
              onChange={(e) => setAutoSettings(prev => ({
                ...prev,
                features: { ...prev.features, analyze: e.target.checked }
              }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Auto Refactor</span>
            <input 
              type="checkbox" 
              checked={autoSettings.features.refactor}
              onChange={(e) => setAutoSettings(prev => ({
                ...prev,
                features: { ...prev.features, refactor: e.target.checked }
              }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Auto Test</span>
            <input 
              type="checkbox" 
              checked={autoSettings.features.test}
              onChange={(e) => setAutoSettings(prev => ({
                ...prev,
                features: { ...prev.features, test: e.target.checked }
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderFrameworksTab = () => (
    <div className="frameworks-tab space-y-4 p-3">
      <div className="panel-block">
        <div className="font-semibold mb-2">Detected Frameworks</div>
        <div className="bg-gray-900 rounded p-3 min-h-[100px]">
          <FrameworkPanelComponent />
        </div>
      </div>
      
      <div className="panel-block">
        <div className="font-semibold mb-2">Framework Actions</div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-secondary">Generate Component</button>
          <button className="btn-secondary">Generate API</button>
          <button className="btn-secondary">Generate Tests</button>
        </div>
      </div>
    </div>
  );

  const renderPromptsTab = () => (
    <div className="prompts-tab space-y-4 p-3">
      {/* Prompt Categories */}
      <div className="panel-block">
        <div className="font-semibold mb-2">Prompt Categories</div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-secondary">Analyze</button>
          <button className="btn-secondary">Refactor</button>
          <button className="btn-secondary">Feature</button>
          <button className="btn-secondary">Test</button>
          <button className="btn-secondary">Documentation</button>
        </div>
      </div>

      {/* Prompt Library */}
      <div className="panel-block">
        <div className="font-semibold mb-2">Prompt Library</div>
        <div className="bg-gray-900 rounded p-3 min-h-[200px]">
          <div className="text-gray-400 text-sm">Prompt library will be populated here</div>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="panel-block">
        <div className="font-semibold mb-2">Quick Prompts</div>
        <div className="space-y-2">
          <button className="prompt-btn w-full text-left" onClick={() => handleQuickPrompt('Erkläre mir das kurz')}>💡 Kurze Erklärung</button>
          <button className="prompt-btn w-full text-left" onClick={() => handleQuickPrompt('Zeige mir ein Beispiel')}>📝 Beispiel</button>
          <button className="prompt-btn w-full text-left" onClick={() => handleQuickPrompt('Debugge diesen Code')}>🐛 Debug</button>
          <button className="prompt-btn w-full text-left" onClick={() => handleQuickPrompt('Optimiere diesen Code')}>⚡ Optimieren</button>
          <button className="prompt-btn w-full text-left" onClick={() => handleQuickPrompt('Schreibe Tests für diesen Code')}>🧪 Tests</button>
          <button className="prompt-btn w-full text-left" onClick={() => handleQuickPrompt('Dokumentiere diesen Code')}>📚 Dokumentation</button>
        </div>
      </div>
    </div>
  );

  const renderAnalysisTab = () => (
    <div className="analysis-tab space-y-4 p-3">
      <AnalysisPanelComponent />
    </div>
  );

  const renderSettingsTab = () => (
    <div className="settings-tab space-y-4 p-3">
      {/* User Settings */}
      <div className="panel-block">
        <div className="font-semibold mb-2">User Settings</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Auto-Scroll</span>
            <input type="checkbox" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Typing Indicator</span>
            <input type="checkbox" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Message Sound</span>
            <input type="checkbox" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Markdown Rendering</span>
            <input type="checkbox" defaultChecked />
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div className="panel-block">
        <div className="font-semibold mb-2">API Configuration</div>
        <div className="space-y-2">
          <input 
            type="password" 
            placeholder="OpenAI API Key" 
            className="w-full rounded p-2 bg-gray-800 text-gray-100"
          />
          <input 
            type="password" 
            placeholder="Other API Key" 
            className="w-full rounded p-2 bg-gray-800 text-gray-100"
          />
        </div>
      </div>

      {/* Theme */}
      <div className="panel-block">
        <div className="font-semibold mb-2">Theme</div>
        <div className="flex gap-2">
          <button className="theme-btn active" data-theme="dark">🌙 Dark</button>
          <button className="theme-btn" data-theme="light">☀️ Light</button>
          <button className="theme-btn" data-theme="auto">🔄 Auto</button>
        </div>
      </div>
    </div>
  );

  if (!isVisible) return null;

  return (
    <div className="chat-right-panel-content">
      <TaskModal open={showTaskModal} onClose={() => setShowTaskModal(false)} onSubmit={handleTaskSubmit} defaultType={modalType} />
      <TaskSelectionModal
        isOpen={isTaskModalOpen}
        onClose={handleCloseTaskModal}
        tasks={refactoringTasks}
        onStartRefactoring={handleStartRefactoring}
        isLoading={isAutoRefactoring}
      />
      <div className="panel-header">
        <div className="panel-tabs">
          <button className={`tab-btn${currentTab === 'tasks' ? ' active' : ''}`} onClick={() => handleTabSwitch('tasks')}>🗂️ Tasks</button>
          <button className={`tab-btn${currentTab === 'auto' ? ' active' : ''}`} onClick={() => handleTabSwitch('auto')}>🤖 Auto</button>
          <button className={`tab-btn${currentTab === 'frameworks' ? ' active' : ''}`} onClick={() => handleTabSwitch('frameworks')}>🧩 Frameworks</button>
          <button className={`tab-btn${currentTab === 'prompts' ? ' active' : ''}`} onClick={() => handleTabSwitch('prompts')}>💬 Prompts</button>
          <button className={`tab-btn${currentTab === 'analysis' ? ' active' : ''}`} onClick={() => handleTabSwitch('analysis')}>📊 Analysis</button>
          <button className={`tab-btn${currentTab === 'settings' ? ' active' : ''}`} onClick={() => handleTabSwitch('settings')}>⚙️ Settings</button>
        </div>
        <button id="toggleChatPanelBtn" className="btn-icon" title="Panel ein-/ausblenden" onClick={handleTogglePanel}>◀</button>
      </div>
      <div className="panel-content">
        {currentTab === 'tasks' && renderTasksTab()}
        {currentTab === 'auto' && renderAutoTab()}
        {currentTab === 'frameworks' && renderFrameworksTab()}
        {currentTab === 'prompts' && renderPromptsTab()}
        {currentTab === 'analysis' && renderAnalysisTab()}
        {currentTab === 'settings' && renderSettingsTab()}
      </div>
    </div>
  );
}

export default ChatRightPanelComponent; 