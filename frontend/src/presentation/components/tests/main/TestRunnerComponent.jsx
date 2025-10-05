import React, { useState, useEffect } from 'react';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';
import TestConfiguration from './TestConfiguration';
import TestResultsViewer from './TestResultsViewer';
import TestStatusBadge from '../common/TestStatusBadge';
import useTestRunner from '@/hooks/useTestRunner';
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
  
  const { executeTest, results, error, status } = useTestRunner();
  const { availableIDEs, activePort: storeActivePort } = useIDEStore();

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

  // Load test configuration when project changes
  useEffect(() => {
    if (projectId) {
      loadTestConfiguration();
    }
  }, [projectId]);

  const loadTestConfiguration = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tests/playwright/config`);
      if (response.ok) {
        const data = await response.json();
        setTestConfig(data.data.config);
      }
    } catch (error) {
      console.error('Failed to load test configuration:', error);
    }
  };
  
  const handleRunTest = async () => {
    if (!workspacePath || !projectId) {
      console.error('Workspace path or project ID not available');
      return;
    }
    
    setIsRunning(true);
    try {
      await executeTest(selectedTest, { 
        workspacePath, 
        projectId,
        config: testConfig 
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleStopTest = async () => {
    try {
      await fetch('/api/projects/${projectId}/tests/playwright/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: selectedTest?.id })
      });
      setIsRunning(false);
    } catch (error) {
      console.error('Failed to stop test:', error);
    }
  };

  const handleConfigUpdate = async (newConfig) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tests/playwright/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: newConfig })
      });
      
      if (response.ok) {
        setTestConfig(newConfig);
      }
    } catch (error) {
      console.error('Failed to update configuration:', error);
    }
  };

  const handleCreateTest = async (testData) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tests/playwright`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });
      
      if (response.ok) {
        // Test created successfully
        console.log('Test created successfully');
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
