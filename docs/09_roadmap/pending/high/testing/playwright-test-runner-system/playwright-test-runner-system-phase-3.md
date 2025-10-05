# Phase 3: Integration

## 📋 Phase Overview
- **Phase**: 3
- **Name**: Integration
- **Estimated Time**: 6 hours
- **Status**: Planning
- **Progress**: 0%

## 🎯 Objectives
Connect the Playwright test runner with existing systems and build the frontend UI.

## 📝 Tasks

### 3.1 Connect with Existing Test Framework (1.5 hours)
- [ ] Integrate with Jest/Vitest infrastructure
- [ ] Create compatibility layer for existing tests
- [ ] Add test result aggregation
- [ ] Implement test reporting integration

### 3.2 Create API Endpoints for Test Execution (1.5 hours)
- [ ] Create `backend/application/handlers/PlaywrightTestHandler.js`
- [ ] Create `backend/presentation/api/controllers/PlaywrightTestController.js`
- [ ] Implement test execution endpoints
- [ ] Add test result retrieval endpoints

### 3.3 Build Frontend Test Runner UI as Main View (2 hours)
- [ ] Create `frontend/src/presentation/components/tests/main/TestRunnerComponent.jsx`
- [ ] Create `frontend/src/presentation/components/tests/main/TestResultsViewer.jsx`
- [ ] Create `frontend/src/presentation/components/tests/main/TestConfiguration.jsx`
- [ ] Create `frontend/src/presentation/components/tests/common/TestStatusBadge.jsx`
- [ ] Implement test execution controls

### 3.4 Integrate with Project Configuration (0.5 hours)
- [ ] Connect frontend with project configuration
- [ ] Add configuration editing capabilities
- [ ] Implement configuration validation
- [ ] Add configuration persistence

### 3.5 Add Test Result Visualization (0.5 hours)
- [ ] Create test result display components
- [ ] Add screenshot and video viewing
- [ ] Implement test history tracking
- [ ] Add performance metrics display

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
import React, { useState } from 'react';
import { useTestRunner } from '@/hooks/useTestRunner';
import TestConfiguration from './TestConfiguration';
import TestResultsViewer from './TestResultsViewer';
import TestStatusBadge from '../common/TestStatusBadge';

const TestRunnerComponent = ({ eventBus, activePort }) => {
  const [selectedTest, setSelectedTest] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const { executeTest, results, error } = useTestRunner();

  const handleRunTest = async () => {
    setIsRunning(true);
    try {
      await executeTest(selectedTest);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="test-runner-container">
      <div className="test-runner-header">
        <h2>🧪 Test Runner</h2>
        <TestStatusBadge />
      </div>
      
      <div className="test-runner-content">
        <TestConfiguration 
          onSelect={setSelectedTest}
          selected={selectedTest}
        />
        <button 
          onClick={handleRunTest}
          disabled={!selectedTest || isRunning}
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
