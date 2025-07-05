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
      // Trigger workspace path detection to refresh project data
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

  // VibeCoder Mode Handlers (stubs)
  const handleVibeCoderStart = async () => { 
    setFeedback('Starting VibeCoder Mode...');
    try {
      const projectId = await api.getCurrentProjectId();
      const response = await api.startAutoMode(projectId, {
        mode: 'full'
      });
      if (response.success) {
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
        // Show error message to user
      }
    } catch (error) {
      console.error('Error starting Auto Refactor:', error);
      // Show error message to user
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

  // EventBus-Listener (hier nur als Platzhalter, da keine dynamischen Daten im Original)
  useEffect(() => {
    if (!eventBus) return;
    // Hier könnten weitere Event-Listener hinzugefügt werden
  }, [eventBus]);

  const handleQuickPrompt = (prompt) => eventBus.emit('chat-right-panel:quick-prompt', { prompt });

  const handleStartRefactoring = async (selectedTasks) => {
    console.log('Starting refactoring for tasks:', selectedTasks);
    setIsTaskModalOpen(false);
    
    // TODO: Implement the actual refactoring workflow
    // 1. Git branch creation
    // 2. Playwright chat interaction
    // 3. AI task execution
    // 4. Validation and debugging
    
    // For now, just show a message
    alert(`Starting automated refactoring for ${selectedTasks.length} tasks...`);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setRefactoringTasks([]);
  };

  // Tab-Inhalte
  const renderChatTab = () => (
    <div className="chat-tab">
      <div className="chat-info">
        <h4>Chat Info</h4>
        <div className="info-item">
          <span className="label">Nachrichten:</span>
          <span className="value" id="messageCount">0</span>
        </div>
        <div className="info-item">
          <span className="label">Zeichen:</span>
          <span className="value" id="charCount">0</span>
        </div>
        <div className="info-item">
          <span className="label">Start:</span>
          <span className="value" id="chatStart">-</span>
        </div>
      </div>
      <div className="quick-prompts">
        <h4>Quick Prompts</h4>
        <div className="prompt-list">
          <button className="prompt-btn" onClick={() => handleQuickPrompt('Erkläre mir das kurz')}>💡 Kurze Erklärung</button>
          <button className="prompt-btn" onClick={() => handleQuickPrompt('Zeige mir ein Beispiel')}>📝 Beispiel</button>
          <button className="prompt-btn" onClick={() => handleQuickPrompt('Debugge diesen Code')}>🐛 Debug</button>
          <button className="prompt-btn" onClick={() => handleQuickPrompt('Optimiere diesen Code')}>⚡ Optimieren</button>
          <button className="prompt-btn" onClick={() => handleQuickPrompt('Schreibe Tests für diesen Code')}>🧪 Tests</button>
          <button className="prompt-btn" onClick={() => handleQuickPrompt('Dokumentiere diesen Code')}>📚 Dokumentation</button>
        </div>
      </div>
    </div>
  );

  const renderFilesTab = () => (
    <div className="files-tab">
      <div className="file-upload">
        <h4>Dateien hochladen</h4>
        <div className="upload-area" id="uploadArea">
          <input type="file" id="fileInput" multiple style={{ display: 'none' }} />
          <div className="upload-placeholder">
            <span>📁 Dateien hier ablegen oder klicken</span>
          </div>
        </div>
      </div>
      <div className="attached-files">
        <h4>Angehängte Dateien</h4>
        <div className="file-list" id="fileList">
          <div className="no-files">Keine Dateien angehängt</div>
        </div>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="settings-tab">
      <div className="setting-group">
        <h4>Chat-Einstellungen</h4>
        <div className="setting-item">
          <label htmlFor="autoScroll">Auto-Scroll</label>
          <input type="checkbox" id="autoScroll" defaultChecked />
        </div>
        <div className="setting-item">
          <label htmlFor="typingIndicator">Typing Indicator</label>
          <input type="checkbox" id="typingIndicator" defaultChecked />
        </div>
        <div className="setting-item">
          <label htmlFor="messageSound">Nachrichten-Sound</label>
          <input type="checkbox" id="messageSound" />
        </div>
        <div className="setting-item">
          <label htmlFor="markdownRendering">Markdown Rendering</label>
          <input type="checkbox" id="markdownRendering" defaultChecked />
        </div>
      </div>
      <div className="setting-group">
        <h4>Theme</h4>
        <div className="theme-options">
          <button className="theme-btn active" data-theme="dark">🌙 Dark</button>
          <button className="theme-btn" data-theme="light">☀️ Light</button>
          <button className="theme-btn" data-theme="auto">🔄 Auto</button>
        </div>
      </div>
    </div>
  );

  const renderFrameworksTab = () => (
    <div className="frameworks-tab">
      <FrameworkPanelComponent />
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
          <button className={`tab-btn${currentTab === 'chat' ? ' active' : ''}`} onClick={() => handleTabSwitch('chat')}>💬 Chat</button>
          <button className={`tab-btn${currentTab === 'files' ? ' active' : ''}`} onClick={() => handleTabSwitch('files')}>📁 Files</button>
          <button className={`tab-btn${currentTab === 'tasks' ? ' active' : ''}`} onClick={() => handleTabSwitch('tasks')}>🗂️ Tasks</button>
          <button className={`tab-btn${currentTab === 'analysis' ? ' active' : ''}`} onClick={() => handleTabSwitch('analysis')}>📊 Analysis</button>
          <button className={`tab-btn${currentTab === 'frameworks' ? ' active' : ''}`} onClick={() => handleTabSwitch('frameworks')}>🧩 Frameworks</button>
          <button className={`tab-btn${currentTab === 'settings' ? ' active' : ''}`} onClick={() => handleTabSwitch('settings')}>⚙️</button>
        </div>
        <button id="toggleChatPanelBtn" className="btn-icon" title="Panel ein-/ausblenden" onClick={handleTogglePanel}>◀</button>
      </div>
      <div className="panel-content">
        {currentTab === 'chat' && renderChatTab()}
        {currentTab === 'files' && renderFilesTab()}
        {currentTab === 'tasks' && (
          <div className="task-ai-panel space-y-6 p-3">
            {/* General Buttons */}
            <div className="panel-block">
              <div className="flex gap-2 mb-4">
                <button className="btn-primary" onClick={handleCreateTask}>Create Task</button>
                <button className="btn-secondary" onClick={handleAnalyzeProject}>Analyze Project</button>
                <button className="btn-secondary" onClick={handleRefresh}>Refresh</button>
              </div>
            </div>
            {/* Presets */}
            <div className="panel-block">
              <div className="font-semibold mb-1">Presets:</div>
              <div className="flex gap-2 flex-wrap mb-2">
                <button className="btn-preset" onClick={() => handlePreset('test')}>Test Task</button>
                <button className="btn-preset" onClick={() => handlePreset('refactor')}>Refactor Task</button>
                <button className="btn-preset" onClick={() => handlePreset('bugfix')}>Bugfix Task</button>
                <button className="btn-preset" onClick={() => handlePreset('doku')}>Doku Task</button>
                <button className="btn-preset" onClick={handleCustomPreset}>+ Custom</button>
              </div>
            </div>
            {/* VibeCoder Mode */}
            <div className="panel-block">
              <div className="font-semibold mb-1">VibeCoder Mode:</div>
              <div className="flex gap-2 flex-wrap mb-2">
                <button className="btn-vibecoder" onClick={handleVibeCoderStart}>VibeCoder Mode Start</button>
                <button className="btn-vibecoder" onClick={handleAutoAnalyze}>Auto Analyze</button>
                <button className="btn-vibecoder" onClick={handleAutoRefactor}>Auto Refactor</button>
                <button className="btn-vibecoder" onClick={handleAutoTest}>Auto Test</button>
                <button className="btn-danger" onClick={handleAutoStop}>Stop</button>
              </div>
            </div>
            {/* Task Status & Analysis Results */}
            <div className="panel-block">
              <div className="flex flex-col gap-2">
                <div className="font-semibold">Task Status</div>
                <div className="bg-gray-900 text-gray-200 rounded p-2 min-h-[40px]">(Task Status Panel TODO)</div>
                <div className="font-semibold mt-2">Analysis Results</div>
                <div className="bg-gray-900 text-gray-200 rounded p-2 min-h-[40px]">(Analysis Results Panel TODO)</div>
                {feedback && <div className="text-sm text-blue-400 mt-2">{feedback}</div>}
              </div>
            </div>
          </div>
        )}
        {currentTab === 'analysis' && <AnalysisPanelComponent />}
        {currentTab === 'frameworks' && renderFrameworksTab()}
        {currentTab === 'settings' && renderSettingsTab()}
      </div>
    </div>
  );
}

export default ChatRightPanelComponent; 