# Phase 3: Integration

## 📋 Phase Overview
- **Phase**: 3
- **Name**: Integration
- **Estimated Time**: 8 hours
- **Status**: completed
- **Progress**: 100%
- **Completed**: 2025-10-05T12:57:05.000Z

## 🎯 Objectives
Connect the Playwright test runner with existing systems and build the frontend UI.

## 📝 Tasks

### 3.1 Connect with Existing Test Framework (1.5 hours)
- [ ] Integrate with Jest/Vitest infrastructure
- [ ] Create compatibility layer for existing tests
- [ ] Add test result aggregation
- [ ] Implement test reporting integration

### 3.2 Create Comprehensive API Endpoints (3 hours)
- [ ] Create `backend/application/handlers/categories/testing/PlaywrightTestHandler.js`
- [ ] Create `backend/presentation/api/controllers/PlaywrightTestController.js`
- [ ] Implement test execution endpoints (POST /api/projects/:projectId/tests/execute, GET /api/projects/:projectId/tests/results)
- [ ] **NEW**: Add configuration management endpoints (GET/PUT /api/projects/:projectId/tests/config, POST /api/projects/:projectId/tests/config/validate)
- [ ] **NEW**: Add project management endpoints (GET/POST /api/projects/:projectId/tests/projects, GET/PUT /api/projects/:projectId/tests/projects/{id}/config)
- [ ] **NEW**: Add login validation endpoint (POST /api/projects/:projectId/tests/login/validate)
- [ ] **NEW**: Add test control endpoints (GET /api/projects/:projectId/tests/status, POST /api/projects/:projectId/tests/stop, GET /api/projects/:projectId/tests/logs)

### 3.3 Build Frontend Test Runner UI as Main View (3 hours)
- [ ] Create `frontend/src/presentation/components/tests/main/TestRunnerComponent.jsx`
- [ ] Create `frontend/src/presentation/components/tests/main/TestResultsViewer.jsx`
- [ ] Create `frontend/src/presentation/components/tests/main/TestConfiguration.jsx`
- [ ] Create `frontend/src/presentation/components/tests/common/TestStatusBadge.jsx`
- [ ] Add Tests button to `frontend/src/presentation/components/Header.jsx`
- [ ] Add tests case to `frontend/src/App.jsx` renderView function
- [ ] Implement test execution controls
- [ ] **NEW**: Add configuration management UI components
- [ ] **NEW**: Add project management UI components
- [ ] **NEW**: Add login credential management UI

### 3.4 Integrate with Project Configuration (1 hour)
- [ ] Connect frontend with project configuration
- [ ] Add configuration editing capabilities
- [ ] Implement configuration validation
- [ ] Add configuration persistence
- [ ] **NEW**: Integrate with centralized config system
- [ ] **NEW**: Add configuration templates and presets

### 3.5 Add Test Result Visualization (1 hour)
- [ ] Create test result display components
- [ ] Add screenshot and video viewing
- [ ] Implement test history tracking
- [ ] Add performance metrics display
- [ ] **NEW**: Add real-time test execution monitoring
- [ ] **NEW**: Add detailed test logs viewer

## 🔧 Technical Details

### Files to Create:
- `backend/application/handlers/PlaywrightTestHandler.js` - Test handler
- `backend/presentation/api/controllers/PlaywrightTestController.js` - API controller
- `frontend/src/presentation/components/tests/main/TestRunnerComponent.jsx` - Main UI component
- `frontend/src/presentation/components/tests/main/TestResultsViewer.jsx` - Results display
- `frontend/src/presentation/components/tests/main/TestConfiguration.jsx` - Test configuration
- `frontend/src/presentation/components/tests/common/TestStatusBadge.jsx` - Status indicator
- `frontend/src/hooks/useTestRunner.js` - Test runner hook
- `frontend/src/services/testRunnerService.js` - Frontend service

### API Controller Example:
```javascript
// PlaywrightTestController.js
class PlaywrightTestController {
  async executeTest(req, res) {
    try {
      const { test, projectPath, options } = req.body;
      const result = await this.testService.executeTest(test, projectPath, options);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getTestResults(req, res) {
    try {
      const { testId } = req.params;
      const results = await this.testService.getTestResults(testId);
      res.json({ success: true, results });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
```

### Frontend Component Example:
```jsx
// TestRunnerComponent.jsx
import React, { useState, useEffect } from 'react';
import { useTestRunner } from '@/hooks/useTestRunner';
import { useIDEStore } from '@/infrastructure/stores/IDEStore';
import TestConfiguration from './TestConfiguration';
import TestResultsViewer from './TestResultsViewer';
import TestStatusBadge from '../common/TestStatusBadge';

const TestRunnerComponent = ({ eventBus, activePort }) => {
  const [selectedTest, setSelectedTest] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [workspacePath, setWorkspacePath] = useState(null);
  const [projectId, setProjectId] = useState(null);
  
  const { executeTest, results, error } = useTestRunner();
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

  const handleRunTest = async () => {
    if (!workspacePath || !projectId) {
      console.error('Workspace path or project ID not available');
      return;
    }
    
    setIsRunning(true);
    try {
      await executeTest(selectedTest, { workspacePath, projectId });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="test-runner-container">
      <div className="test-runner-header">
        <h2>🧪 Test Runner</h2>
        <TestStatusBadge />
        {workspacePath && (
          <div className="workspace-info">
            <small>Workspace: {workspacePath}</small>
            <small>Project: {projectId}</small>
          </div>
        )}
      </div>
      
      <div className="test-runner-content">
        <TestConfiguration 
          onSelect={setSelectedTest}
          selected={selectedTest}
          workspacePath={workspacePath}
        />
        <button 
          onClick={handleRunTest}
          disabled={!selectedTest || isRunning || !workspacePath}
          className="run-test-btn"
        >
          {isRunning ? 'Running...' : 'Run Tests'}
        </button>
        <TestResultsViewer results={results} error={error} />
      </div>
    </div>
  );
};
```

## ✅ Success Criteria
- [ ] Integration with existing test framework complete
- [ ] API endpoints functional
- [ ] Frontend UI operational
- [ ] Project configuration integration working
- [ ] Test result visualization complete

## 🚀 Next Phase
Phase 4: Testing & Documentation - Final testing and documentation
