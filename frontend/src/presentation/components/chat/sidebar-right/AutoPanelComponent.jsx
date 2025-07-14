import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import APIChatRepository, { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import TaskSelectionModal from '../modal/TaskSelectionModal.jsx';
import TestFixTaskModal from '../modal/TestFixTaskModal.jsx';

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

  // Auto Test Fix Modal state
  const [showAutoTestModal, setShowAutoTestModal] = useState(false);
  const [testFixTasks, setTestFixTasks] = useState([]);
  const [isAutoTesting, setIsAutoTesting] = useState(false);

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
      // Get refactoring tasks from the unified auto mode with refactor mode
      const projectId = await api.getCurrentProjectId();
      const response = await api.startAutoRefactor(projectId);
      
      logger.info('Auto refactor response:', response);
      logger.info('Response data:', response.data);
      logger.info('Response data.result:', response.data?.result);
      logger.info('Response data.result.results:', response.data?.result?.results);
      logger.info('Response data.result.result:', response.data?.result?.result);
      logger.info('Response data.result.result.results:', response.data?.result?.result?.results);
      
      // Check for tasks in different possible locations
      let tasks = null;

      // Try multiple possible locations for tasks - including the deepest nested ones
      if (response?.data?.result?.result?.tasks && Array.isArray(response.data.result.result.tasks)) {
        tasks = response.data.result.result.tasks;
        logger.info('Found tasks in response.data.result.result.tasks:', tasks);
      } else if (response?.data?.result?.result?.tasks?.tasks && Array.isArray(response.data.result.result.tasks.tasks)) {
        tasks = response.data.result.result.tasks.tasks;
        logger.info('Found tasks in response.data.result.result.tasks.tasks:', tasks);
      } else if (response?.data?.result?.result?.result?.tasks && Array.isArray(response.data.result.result.result.tasks)) {
        tasks = response.data.result.result.result.tasks;
        logger.info('Found tasks in response.data.result.result.result.tasks:', tasks);
      } else if (response?.data?.result?.tasks?.result?.tasks && Array.isArray(response.data.result.tasks.result.tasks)) {
        tasks = response.data.result.tasks.result.tasks;
        logger.info('Found tasks in response.data.result.tasks.result.tasks:', tasks);
      } else if (response?.data?.result?.tasks?.tasks && Array.isArray(response.data.result.tasks.tasks)) {
        tasks = response.data.result.tasks.tasks;
        logger.info('Found tasks in response.data.result.tasks.tasks:', tasks);
      } else if (response?.data?.result?.tasks && Array.isArray(response.data.result.tasks)) {
        tasks = response.data.result.tasks;
        logger.info('Found tasks in response.data.result.tasks:', tasks);
      } else if (response?.data?.tasks && Array.isArray(response.data.tasks)) {
        tasks = response.data.tasks;
        logger.info('Found tasks in response.data.tasks:', tasks);
      } else if (response?.result?.tasks && Array.isArray(response.result.tasks)) {
        tasks = response.result.tasks;
        logger.info('Found tasks in response.result.tasks:', tasks);
      } else {
        logger.info('No tasks found in response, loading from database...');
        
        // Load tasks from database
        try {
          const tasksResponse = await apiCall(`/api/projects/${projectId}/tasks?type=refactor&status=pending`);
          if (tasksResponse.success && tasksResponse.data && Array.isArray(tasksResponse.data)) {
            tasks = tasksResponse.data;
            logger.info('Loaded tasks from database:', tasks);
          } else {
            logger.info('No tasks found in database either');
            logger.info('Full response structure:', JSON.stringify(response, null, 2));
          }
        } catch (dbError) {
          logger.error('Error loading tasks from database:', dbError);
        }
      }
      
      if (tasks && tasks.length > 0) {
        setRefactoringTasks(tasks);
        setShowAutoRefactorModal(true);
        setFeedback(`Refactoring tasks loaded successfully! Found ${tasks.length} tasks.`);
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
        const autoModeResponse = await api.startAutoMode(projectId, {
          taskId: task.id,  // Send the REAL task ID!
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
    setFeedback('Loading test fix tasks...');
    try {
      const projectId = await api.getCurrentProjectId();
      logger.debug('Loading test fix tasks for project:', projectId);
      
      // First, check if there are existing tasks
      let loadExistingTasks = false;
      let existingTasks = [];
      
      try {
        const existingTasksResponse = await apiCall(`/api/projects/${projectId}/auto/tests/load-tasks?status=pending`);
        if (existingTasksResponse.success && existingTasksResponse.data.count > 0) {
          loadExistingTasks = true;
          existingTasks = existingTasksResponse.data.tasks || [];
          logger.info(`Found ${existingTasksResponse.data.count} existing tasks`);
        }
      } catch (error) {
        logger.info('No existing tasks found or error loading them:', error.message);
      }

      // If we have existing tasks, show them in modal
      if (existingTasks.length > 0) {
        setTestFixTasks(existingTasks);
        setShowAutoTestModal(true);
        setFeedback(`Found ${existingTasks.length} existing test fix tasks!`);
      } else {
        // No existing tasks, start fresh
        setFeedback('No existing tasks found, starting fresh test fix...');
        await startAutoTestFix(projectId, false);
      }
    } catch (err) {
      setFeedback('Error loading test fix tasks: ' + (err.message || err));
    }
  };

  const handleStartTestFix = async (selectedTasks) => {
    setIsAutoTesting(true);
    setFeedback('Starting test fix for selected tasks...');
    
    try {
      const projectId = await api.getCurrentProjectId();
      
      // Execute test fix with selected tasks
      await startAutoTestFix(projectId, true, selectedTasks);
      
      setShowAutoTestModal(false);
      
    } catch (err) {
      setFeedback('Error starting test fix: ' + (err.message || err));
    } finally {
      setIsAutoTesting(false);
    }
  };

  const startAutoTestFix = async (projectId, loadExistingTasks = false, selectedTasks = []) => {
    try {
      const response = await apiCall(`/api/projects/${projectId}/auto/tests/fix`, {
        method: 'POST',
        body: JSON.stringify({
          loadExistingTasks: loadExistingTasks,
          taskStatus: 'pending',
          clearExisting: false,
          stopOnError: false,
          coverageThreshold: 90,
          autoCommit: true,
          autoBranch: true,
          maxFixAttempts: 3,
          selectedTaskIds: selectedTasks.map(task => task.id)
        })
      });
      
      logger.debug('Auto test fix response:', response);
      
      if (response.success) {
        setAutoStatus('testing');
        const message = loadExistingTasks 
          ? `Auto Test Fix started with ${selectedTasks.length} selected tasks! Session ID: ${response.data.sessionId}`
          : `Auto Test Fix started successfully! Session ID: ${response.data.sessionId}`;
        setFeedback(message);
        if (eventBus) eventBus.emit('auto-test-fix-started', response);
        
        // Start polling for status
        pollAutoTestStatus(response.data.sessionId, projectId);
      } else {
        setFeedback('Failed to start Auto Test Fix: ' + response.error);
      }
    } catch (error) {
      logger.error('API call failed:', error);
      setFeedback('Error making API call: ' + error.message);
    }
  };
  
  const pollAutoTestStatus = async (sessionId, projectId) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await apiCall(`/api/projects/${projectId}/auto/tests/status/${sessionId}`);

        if (response.success) {
          const status = response.status;
          setFeedback(`Auto Test Fix: ${status.status} - ${status.progress}%`);
          
          if (status.status === 'completed') {
            clearInterval(pollInterval);
            setAutoStatus('stopped');
            setFeedback('✅ Auto Test Fix completed successfully!');
            if (eventBus) eventBus.emit('auto-test-fix-completed', status.result);
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            setAutoStatus('stopped');
            setFeedback('❌ Auto Test Fix failed: ' + status.error);
          }
        }
      } catch (error) {
        logger.error('Failed to poll auto test status:', error);
        clearInterval(pollInterval);
      }
    }, 5000); // Poll every 5 seconds
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
          <button className="btn-vibecoder" onClick={handleAutoTest}>Auto Test Fix</button>
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

      {/* Auto Test Fix Modal */}
      <TestFixTaskModal
        isOpen={showAutoTestModal}
        onClose={() => setShowAutoTestModal(false)}
        tasks={testFixTasks}
        onStartTestFix={handleStartTestFix}
        isLoading={isAutoTesting}
      />
    </div>
  );
}

export default AutoPanelComponent;
