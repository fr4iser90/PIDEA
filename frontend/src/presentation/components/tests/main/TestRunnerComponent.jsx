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
  const [selectedTests, setSelectedTests] = useState([]); // Changed to array for multiple selection
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
    
    if (selectedTests.length === 0) {
      console.error('No tests selected');
      return;
    }
    
    setIsRunning(true);
    try {
      // ✅ DIREKTEN PLAYWRIGHT ENDPOINT VERWENDEN STATT WORKFLOW!
      const data = await apiRepository.executePlaywrightTests(projectId, {
        testNames: selectedTests.map(test => test.name), // Send array of test names
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
      await apiRepository.stopPlaywrightTests(projectId, { testIds: selectedTests.map(test => test.id) });
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

  const handleTestSelect = (test) => {
    setSelectedTests(prev => {
      const isSelected = prev.some(t => t.id === test.id);
      if (isSelected) {
        // Remove from selection
        return prev.filter(t => t.id !== test.id);
      } else {
        // Add to selection
        return [...prev, test];
      }
    });
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
          onSelect={handleTestSelect}
          selected={selectedTests}
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
                disabled={selectedTests.length === 0 || isRunning || !workspacePath}
                className="run-button"
              >
                <span className="button-icon">
                  {isRunning ? '⏳' : '▶️'}
                </span>
                <span>{isRunning ? 'Running...' : `Run Tests (${selectedTests.length})`}</span>
              </button>
              
              {isRunning && (
                <button 
                  onClick={handleStopTest}
                  className="stop-button"
                >
                  <span className="button-icon">⏹️</span>
                  <span>Stop Tests</span>
                </button>
              )}
            </div>
            
            <div className="text-sm text-gray-600">
              {selectedTests.length > 0 ? `Selected: ${selectedTests.map(t => t.name).join(', ')}` : 'No tests selected'}
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
