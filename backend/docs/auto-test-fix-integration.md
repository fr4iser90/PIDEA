# Auto Test Fix System Integration Guide

## Overview

The Auto Test Fix System is a unified workflow that integrates with your existing `WorkflowOrchestrationService` and follows the same pattern as `auto-finish` and `auto-refactor`. It provides automated test correction and coverage improvement through AI-powered analysis and fixes.

## API Endpoints

### Base URL
```
/api/projects/:projectId/auto/tests
```

### Available Endpoints

#### 1. Analyze Project Tests
```http
POST /api/projects/:projectId/auto/tests/analyze
```

**Request Body:**
```json
{
  "options": {
    "projectPath": "/path/to/project",
    "includeLegacy": true,
    "includeComplex": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "projectPath": "/path/to/project",
    "failingTests": {
      "count": 149,
      "tests": [...]
    },
    "legacyTests": {
      "count": 32,
      "tests": [...]
    },
    "complexTests": {
      "count": 438,
      "tests": [...]
    },
    "coverage": {
      "current": 75,
      "target": 90,
      "needsImprovement": true
    },
    "hasIssues": true,
    "totalIssues": 619
  }
}
```

#### 2. Execute Auto Test Fix Workflow
```http
POST /api/projects/:projectId/auto/tests/fix
```

**Request Body:**
```json
{
  "options": {
    "projectPath": "/path/to/project",
    "coverageThreshold": 90,
    "maxFixAttempts": 3,
    "autoCommit": true,
    "autoBranch": true,
    "stopOnError": false,
    "parallelExecution": true,
    "maxParallelTests": 5
  }
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid-session-id",
  "result": {
    "success": true,
    "sessionId": "uuid-session-id",
    "analysisResult": {...},
    "workflowResult": {...},
    "coverageResult": {...},
    "report": {...},
    "duration": 1800000
  },
  "duration": 1800000
}
```

#### 3. Get Session Status
```http
GET /api/projects/:projectId/auto/tests/status/:sessionId
```

**Response:**
```json
{
  "success": true,
  "status": {
    "sessionId": "uuid-session-id",
    "status": "active|completed|failed|cancelled",
    "progress": 75,
    "startTime": "2024-01-01T00:00:00.000Z",
    "endTime": "2024-01-01T00:30:00.000Z",
    "result": {...},
    "error": "error message if failed"
  }
}
```

#### 4. Cancel Session
```http
POST /api/projects/:projectId/auto/tests/cancel/:sessionId
```

**Response:**
```json
{
  "success": true,
  "cancelled": true,
  "sessionId": "uuid-session-id"
}
```

#### 5. Get Statistics
```http
GET /api/projects/:projectId/auto/tests/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "activeSessions": 2,
    "maxConcurrentSessions": 3,
    "sessionTimeout": 1800000,
    "config": {
      "maxFixAttempts": 3,
      "fixTimeout": 300000,
      "coverageThreshold": 90,
      "autoCommitEnabled": true,
      "autoBranchEnabled": true
    },
    "tasks": {
      "total": 25,
      "completed": 20,
      "failed": 3,
      "pending": 2
    },
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 6. Get Auto Test Tasks
```http
GET /api/projects/:projectId/auto/tests/tasks?status=completed&limit=10&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tasks": [...],
    "pagination": {
      "total": 25,
      "limit": 10,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

#### 7. Get Auto Test Task Details
```http
GET /api/projects/:projectId/auto/tests/tasks/:taskId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "task": {
      "id": "task-uuid",
      "title": "Fix failing test in UserService",
      "description": "Test is failing due to async timing issue",
      "type": "testing",
      "priority": "high",
      "status": "completed",
      "executionHistory": [...]
    },
    "executionHistory": [...]
  }
}
```

#### 8. Retry Failed Auto Test Task
```http
POST /api/projects/:projectId/auto/tests/tasks/:taskId/retry
```

**Response:**
```json
{
  "success": true,
  "data": {
    "task": {...},
    "execution": {...},
    "message": "Auto test task retry initiated"
  }
}
```

## Frontend Integration

### JavaScript/React Example

```javascript
// Auto Test Fix Button Component
const AutoTestFixButton = ({ projectId }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');

  const handleAutoTestFix = async () => {
    try {
      setIsRunning(true);
      setStatus('starting');

      // Step 1: Analyze project tests
      const analysisResponse = await fetch(`/api/projects/${projectId}/auto/tests/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          options: {
            projectPath: process.cwd()
          }
        })
      });

      const analysisResult = await analysisResponse.json();
      
      if (!analysisResult.success) {
        throw new Error(analysisResult.error);
      }

      if (!analysisResult.result.hasIssues) {
        setStatus('completed');
        alert('No test issues found!');
        return;
      }

      // Step 2: Execute auto test fix workflow
      const fixResponse = await fetch(`/api/projects/${projectId}/auto/tests/fix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          options: {
            projectPath: process.cwd(),
            coverageThreshold: 90,
            autoCommit: true,
            autoBranch: true
          }
        })
      });

      const fixResult = await fixResponse.json();
      
      if (!fixResult.success) {
        throw new Error(fixResult.error);
      }

      setSessionId(fixResult.sessionId);
      setStatus('running');

      // Step 3: Poll for status updates
      pollSessionStatus(fixResult.sessionId);

    } catch (error) {
      console.error('Auto test fix failed:', error);
      setStatus('error');
      alert(`Auto test fix failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const pollSessionStatus = async (sessionId) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/auto/tests/status/${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`
          }
        });

        const result = await response.json();
        
        if (result.success) {
          const sessionStatus = result.status;
          setProgress(sessionStatus.progress);
          setStatus(sessionStatus.status);

          if (sessionStatus.status === 'completed') {
            clearInterval(pollInterval);
            showResults(sessionStatus.result);
          } else if (sessionStatus.status === 'failed') {
            clearInterval(pollInterval);
            alert(`Auto test fix failed: ${sessionStatus.error}`);
          }
        }
      } catch (error) {
        console.error('Failed to poll session status:', error);
        clearInterval(pollInterval);
      }
    }, 5000); // Poll every 5 seconds
  };

  const showResults = (result) => {
    const report = result.report;
    alert(`Auto test fix completed!\n\n` +
          `Issues Fixed: ${report.summary.issuesFixed}/${report.summary.totalIssues}\n` +
          `Coverage Improved: ${report.summary.coverageImproved ? 'Yes' : 'No'}\n` +
          `Duration: ${Math.round(result.duration / 1000)}s`);
  };

  const handleCancel = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/auto/tests/cancel/${sessionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      const result = await response.json();
      
      if (result.success && result.cancelled) {
        setStatus('cancelled');
        setSessionId(null);
        setProgress(0);
      }
    } catch (error) {
      console.error('Failed to cancel session:', error);
    }
  };

  return (
    <div className="auto-test-fix-container">
      <button 
        className="btn-vibecoder"
        onClick={handleAutoTestFix}
        disabled={isRunning}
      >
        {isRunning ? 'Auto Test Fix Running...' : 'Auto Test Fix'}
      </button>

      {isRunning && (
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="progress-text">{progress}% - {status}</span>
          <button onClick={handleCancel} className="btn-cancel">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
```

### HTML Button Example

```html
<button class="btn-vibecoder" onclick="startAutoTestFix()">
  Auto Test Fix
</button>

<script>
async function startAutoTestFix() {
  const projectId = 'your-project-id';
  
  try {
    // Execute auto test fix workflow
    const response = await fetch(`/api/projects/${projectId}/auto/tests/fix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        options: {
          coverageThreshold: 90,
          autoCommit: true,
          autoBranch: true
        }
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Auto test fix started:', result.sessionId);
      // Poll for status updates
      pollStatus(result.sessionId);
    } else {
      alert('Failed to start auto test fix: ' + result.error);
    }
  } catch (error) {
    console.error('Auto test fix failed:', error);
    alert('Auto test fix failed: ' + error.message);
  }
}

async function pollStatus(sessionId) {
  const projectId = 'your-project-id';
  
  const interval = setInterval(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/auto/tests/status/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        const status = result.status;
        console.log(`Status: ${status.status}, Progress: ${status.progress}%`);
        
        if (status.status === 'completed') {
          clearInterval(interval);
          console.log('Auto test fix completed!', status.result);
        } else if (status.status === 'failed') {
          clearInterval(interval);
          console.error('Auto test fix failed:', status.error);
        }
      }
    } catch (error) {
      console.error('Failed to poll status:', error);
      clearInterval(interval);
    }
  }, 5000);
}
</script>
```

## Workflow Steps

1. **Analysis Phase**: Analyzes project for failing, legacy, and complex tests
2. **Task Creation**: Creates a workflow task for the orchestration service
3. **Workflow Execution**: Executes through `WorkflowOrchestrationService` with AI agent integration
4. **Coverage Improvement**: Improves test coverage to meet threshold
5. **Report Generation**: Generates comprehensive report with recommendations

## Configuration

The system can be configured through the `options` parameter:

- `coverageThreshold`: Target coverage percentage (default: 90)
- `maxFixAttempts`: Maximum attempts per test fix (default: 3)
- `autoCommit`: Auto-commit changes (default: true)
- `autoBranch`: Auto-create feature branches (default: true)
- `stopOnError`: Stop workflow on first error (default: false)
- `parallelExecution`: Enable parallel test execution (default: true)
- `maxParallelTests`: Maximum parallel tests (default: 5)

## Integration with Existing Systems

The Auto Test Fix System integrates seamlessly with:

- **WorkflowOrchestrationService**: Uses existing workflow patterns
- **AutoFinishSystem**: Leverages confirmation and fallback detection
- **TaskRepository**: Stores and tracks test fix tasks
- **WebSocketManager**: Real-time progress updates
- **GitService**: Branch management and commits
- **AIService**: AI-powered test analysis and fixes

## Error Handling

The system includes comprehensive error handling:

- **Session Management**: Tracks active sessions with timeout
- **Progress Tracking**: Real-time progress updates via WebSocket
- **Cancellation Support**: Ability to cancel running sessions
- **Fallback Detection**: Detects when user input is needed
- **Retry Logic**: Automatic retry for failed test fixes

## Monitoring and Logging

All operations are logged with structured logging:

```javascript
logger.info('[AutoTestFixSystem] Starting auto test fix workflow', {
  sessionId,
  projectId,
  options
});
```

Progress updates are broadcast via WebSocket for real-time monitoring. 