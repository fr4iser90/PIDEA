import React, { useState, useEffect } from 'react';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';
import TestConfiguration from './TestConfiguration';
import TestResultsViewer from './TestResultsViewer';
import TestStatusBadge from '../common/TestStatusBadge';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository.jsx';
import '@/css/components/test/test-runner.css';

/**
 * TestRunnerComponent - Main test runner UI component
 * 
 * Provides a complete test management interface following existing component patterns
 * with workspace integration and eventBus/activePort props.
 */
const TestRunnerComponent = ({ eventBus, activePort }) => {
  const [selectedTest, setSelectedTest] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [workspacePath, setWorkspacePath] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [testConfig, setTestConfig] = useState(null);
  const [testProjects, setTestProjects] = useState([]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('ready');
  
  const { availableIDEs, activePort: storeActivePort } = useIDEStore();
  const apiRepository = new APIChatRepository(); // ✅ API REPOSITORY VERWENDEN!

  // Get workspace path from active IDE (follows existing pattern)
  useEffect(() => {
    const loadWorkspaceInfo = async () => {
      const activeIDE = availableIDEs.find(ide => ide.port === (activePort || storeActivePort));
      if (activeIDE && activeIDE.workspacePath) {
        setWorkspacePath(activeIDE.workspacePath);
        // Generate project ID from workspace path (follows existing pattern)
        const projectName = activeIDE.workspacePath.split('/').pop();
        setProjectId(projectName.replace(/[^a-zA-Z0-9]/g, '_'));
      }
    };
    
    loadWorkspaceInfo();
  }, [availableIDEs, activePort, storeActivePort]);

  // Load test configuration and projects when project changes
  useEffect(() => {
    if (projectId) {
      loadTestConfiguration();
      loadTestProjects();  // ✅ TESTS VOM BACKEND LADEN!
    }
  }, [projectId]);

  const loadTestConfiguration = async () => {
    try {
      // ✅ API REPOSITORY VERWENDEN STATT DIREKTE FETCH!
      const data = await apiRepository.getPlaywrightTestConfig(projectId);
      if (data.success) {
        setTestConfig(data.data.config);
      }
    } catch (error) {
      console.error('Failed to load test configuration:', error);
    }
  };

  const loadTestProjects = async () => {
    try {
      // ✅ API REPOSITORY VERWENDEN STATT DIREKTE FETCH!
      const data = await apiRepository.getPlaywrightTestProjects(projectId);
      if (data.success) {
        setTestProjects(data.data.projects || []);
      }
    } catch (error) {
      console.error('Failed to load test projects:', error);
    }
  };
  
  const handleRunTest = async () => {
    if (!workspacePath || !projectId) {
      console.error('Workspace path or project ID not available');
      return;
    }
    
    setIsRunning(true);
    try {
      // ✅ DIREKTEN PLAYWRIGHT ENDPOINT VERWENDEN STATT WORKFLOW!
      const data = await apiRepository.executePlaywrightTests(projectId, {
        testName: selectedTest?.name,
        options: {
          workspacePath,
          config: testConfig
        }
      });
      
      if (data.success) {
        console.log('Test execution result:', data.data);
        setResults(data.data);
        setError(null);
        setStatus('completed');
      }
    } catch (error) {
      console.error('Failed to execute test:', error);
      setError(error.message);
      setStatus('error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleStopTest = async () => {
    try {
      // ✅ API REPOSITORY VERWENDEN STATT DIREKTE FETCH!
      await apiRepository.stopPlaywrightTests(projectId, { testId: selectedTest?.id });
      setIsRunning(false);
    } catch (error) {
      console.error('Failed to stop test:', error);
    }
  };

  const handleConfigUpdate = async (newConfig) => {
    try {
      // ✅ API REPOSITORY VERWENDEN STATT DIREKTE FETCH!
      const data = await apiRepository.updatePlaywrightTestConfig(projectId, newConfig);
      if (data.success) {
        setTestConfig(newConfig);
      }
    } catch (error) {
      console.error('Failed to update configuration:', error);
    }
  };

  const handleCreateTest = async (testData) => {
    try {
      // ✅ API REPOSITORY VERWENDEN STATT DIREKTE FETCH!
      const data = await apiRepository.createPlaywrightTestProject(projectId, testData);
      if (data.success) {
        console.log('Test created successfully');
        // Reload test projects after creation
        loadTestProjects();
      }
    } catch (error) {
      console.error('Failed to create test:', error);
    }
  };

  return (
    <div className="test-runner-container bg-white rounded-lg shadow-lg p-6">
      <div className="test-runner-header mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold text-gray-800">🧪 Test Runner</h2>
            <TestStatusBadge status={status} />
          </div>
          
          {workspacePath && (
            <div className="text-sm text-gray-600">
              <div>Workspace: <span className="font-mono">{workspacePath}</span></div>
              <div>Project: <span className="font-mono">{projectId}</span></div>
            </div>
          )}
        </div>
      </div>
      
      <div className="test-runner-content space-y-6">
        {/* Test Configuration Section */}
        <TestConfiguration 
          onSelect={setSelectedTest}
          selected={selectedTest}
          workspacePath={workspacePath}
          projectId={projectId}
          testConfig={testConfig}
          testProjects={testProjects}
          onConfigUpdate={handleConfigUpdate}
          onCreateTest={handleCreateTest}
        />
        
        {/* Test Execution Controls */}
        <div className="test-controls bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleRunTest}
                disabled={!selectedTest || isRunning || !workspacePath}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isRunning ? 'Running...' : 'Run Tests'}
              </button>
              
              {isRunning && (
                <button 
                  onClick={handleStopTest}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Stop Tests
                </button>
              )}
            </div>
            
            <div className="text-sm text-gray-600">
              {selectedTest ? `Selected: ${selectedTest.name}` : 'No test selected'}
            </div>
          </div>
        </div>
        
        {/* Test Results Section */}
        <TestResultsViewer 
          results={results} 
          error={error}
          isRunning={isRunning}
        />
      </div>
    </div>
  );
};

export default TestRunnerComponent;
