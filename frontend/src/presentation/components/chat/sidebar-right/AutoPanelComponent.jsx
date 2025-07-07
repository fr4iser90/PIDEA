import React, { useState, useEffect } from 'react';
import APIChatRepository from '@infrastructure/repositories/APIChatRepository.jsx';
import TaskSelectionModal from '../modal/TaskSelectionModal.jsx';

function AutoPanelComponent({ eventBus }) {
  const api = new APIChatRepository();
  
  // Auto mode state
  const [autoStatus, setAutoStatus] = useState('stopped');
  const [autoLogs, setAutoLogs] = useState([]);
  const [autoSettings, setAutoSettings] = useState({
    features: { analyze: true, refactor: true, test: true },
    thresholds: { confidence: 0.8, complexity: 10 }
  });
  const [feedback, setFeedback] = useState(null);

  // Auto Refactor Modal state
  const [showAutoRefactorModal, setShowAutoRefactorModal] = useState(false);
  const [refactoringTasks, setRefactoringTasks] = useState([]);
  const [isAutoRefactoring, setIsAutoRefactoring] = useState(false);

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
    setFeedback('Loading refactoring tasks...');
    try {
      // Get refactoring tasks from the auto-refactor endpoint
      const projectId = await api.getCurrentProjectId();
      const response = await api.startAutoRefactor(projectId);
      
      if (response.success && response.data && response.data.tasks) {
        setRefactoringTasks(response.data.tasks);
        setShowAutoRefactorModal(true);
        setFeedback('Refactoring tasks loaded successfully!');
      } else {
        setFeedback('No refactoring tasks found or failed to load tasks');
      }
    } catch (err) {
      setFeedback('Error loading refactoring tasks: ' + (err.message || err));
    }
  };

  const handleStartRefactoring = async (selectedTasks) => {
    setIsAutoRefactoring(true);
    setFeedback('Starting refactoring for selected tasks...');
    
    try {
      const projectId = await api.getCurrentProjectId();
      
      // Execute each selected task
      for (const task of selectedTasks) {
        const taskMessage = `Execute this refactoring task: ${task.title}\n\nDescription: ${task.description}`;
        
        const autoModeResponse = await api.startAutoMode(projectId, {
          task: taskMessage,
          options: {
            createGitBranch: true,
            branchName: `refactor/${task.id}-${Date.now()}`,
            clickNewChat: true,
            autoExecute: true
          }
        });
        
        if (!autoModeResponse.success) {
          throw new Error(`Failed to execute task ${task.title}: ${autoModeResponse.error}`);
        }
      }
      
      setAutoStatus('refactoring');
      setFeedback(`✅ Refactoring started for ${selectedTasks.length} tasks!`);
      setShowAutoRefactorModal(false);
      
      if (eventBus) eventBus.emit('vibecoder-refactor-started', { tasks: selectedTasks });
      
    } catch (err) {
      setFeedback('Error starting refactoring: ' + (err.message || err));
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

  return (
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

      {/* Feedback */}
      {feedback && (
        <div className="text-sm text-blue-400 bg-blue-900 bg-opacity-20 p-2 rounded">
          {feedback}
        </div>
      )}

      {/* Auto Refactor Modal */}
      <TaskSelectionModal
        isOpen={showAutoRefactorModal}
        onClose={() => setShowAutoRefactorModal(false)}
        tasks={refactoringTasks}
        onStartRefactoring={handleStartRefactoring}
        isLoading={isAutoRefactoring}
      />
    </div>
  );
}

export default AutoPanelComponent;
