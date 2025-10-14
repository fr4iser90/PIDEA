# Affected Legacy Code - Complete Migration Guide

## Backend Controllers - Legacy Response Patterns

### 1. AuthController.js

**LEGACY CODE:**
```javascript
// POST /api/auth/register
async register(req, res) {
  try {
    const { email, password, username } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const userData = { email, password, username };
    const result = await this.authApplicationService.register(userData);
    
    res.status(201).json({ 
      success: result.success, 
      user: result.data 
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ message: error.message });
  }
}
```

**MODERN CODE:**
```javascript
// POST /api/auth/register
async register(req, res) {
  try {
    const { email, password, username } = req.body;
    if (!email || !password) {
      return res.validationError('Email and password are required');
    }

    const userData = { email, password, username };
    const result = await this.authApplicationService.register(userData);
    
    return res.created(result.data);
  } catch (error) {
    logger.error('Registration error:', error);
    return res.internalError('Registration failed');
  }
}
```

### 2. TaskController.js

**LEGACY CODE:**
```javascript
// GET /api/projects/:projectId/tasks
async getProjectTasks(req, res) {
  try {
    const { projectId } = req.params;
    const { limit, offset, status, priority, type } = req.query;
    
    const tasks = await this.taskApplicationService.getProjectTasks(projectId, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      status,
      priority,
      type
    });

    res.json({
      data: tasks,
      projectId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    this.logger.error('Failed to get project tasks:', error);
    res.status(500).json({
     
      error: 'Failed to get project tasks',
      message: error.message
    });
  }
}
```

**MODERN CODE:**
```javascript
// GET /api/projects/:projectId/tasks
async getProjectTasks(req, res) {
  try {
    const { projectId } = req.params;
    const { limit, offset, status, priority, type } = req.query;
    
    const tasks = await this.taskApplicationService.getProjectTasks(projectId, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      status,
      priority,
      type
    });

    return res.success({
      ...tasks,
      projectId
    });
  } catch (error) {
    this.logger.error('Failed to get project tasks:', error);
    return res.internalError('Failed to get project tasks');
  }
}
```

### 3. WorkflowController.js

**LEGACY CODE:**
```javascript
// POST /api/workflow/execute
async executeWorkflow(req, res) {
  try {
    const { projectId } = req.params;
    const { projectPath, workflow, options = {} } = req.body;

    const result = await this.workflowLoaderService.executeWorkflow({
      projectId,
      projectPath,
      workflow,
      options
    });

    res.json({
      data: {
        workflowId: result.workflowId,
        status: result.status,
        steps: result.steps
      },
      message: 'Workflow executed successfully'
    });
  } catch (error) {
    this.logger.error('Workflow execution failed:', error);
    res.status(500).json({
     
      error: 'Workflow execution failed',
      message: error.message
    });
  }
}
```

**MODERN CODE:**
```javascript
// POST /api/workflow/execute
async executeWorkflow(req, res) {
  try {
    const { projectId } = req.params;
    const { projectPath, workflow, options = {} } = req.body;

    const result = await this.workflowLoaderService.executeWorkflow({
      projectId,
      projectPath,
      workflow,
      options
    });

    return res.success({
      workflowId: result.workflowId,
      status: result.status,
      steps: result.steps
    }, 200, {
      message: 'Workflow executed successfully'
    });
  } catch (error) {
    this.logger.error('Workflow execution failed:', error);
    return res.internalError('Workflow execution failed');
  }
}
```

### 4. IDEMirrorController.js

**LEGACY CODE:**
```javascript
// POST /api/ide/mirror
async mirrorIDE(req, res) {
  try {
    const { projectId, ideType } = req.body;
    
    if (!projectId || !ideType) {
      return res.status(400).json({
       
        error: 'Project ID and IDE type are required'
      });
    }

    const result = await this.ideMirrorService.mirrorIDE(projectId, ideType);
    
    res.json({
      data: {
        mirrorId: result.mirrorId,
        status: result.status,
        ideType: result.ideType
      }
    });
  } catch (error) {
    this.logger.error('IDE mirror failed:', error);
    res.status(500).json({
     
      error: 'IDE mirror failed',
      message: error.message
    });
  }
}
```

**MODERN CODE:**
```javascript
// POST /api/ide/mirror
async mirrorIDE(req, res) {
  try {
    const { projectId, ideType } = req.body;
    
    if (!projectId || !ideType) {
      return res.validationError('Project ID and IDE type are required');
    }

    const result = await this.ideMirrorService.mirrorIDE(projectId, ideType);
    
    return res.success({
      mirrorId: result.mirrorId,
      status: result.status,
      ideType: result.ideType
    });
  } catch (error) {
    this.logger.error('IDE mirror failed:', error);
    return res.internalError('IDE mirror failed');
  }
}
```

### 5. PerformanceAnalysisController.js

**LEGACY CODE:**
```javascript
// POST /api/analysis/performance
async analyze(req, res) {
  try {
    const { projectId, projectPath, config = {} } = req.body;

    if (!projectId || !projectPath) {
      return res.status(400).json({
       
        error: 'Missing required parameters: projectId and projectPath',
        data: null
      });
    }

    const result = await this.performanceService.analyze({
      projectId,
      projectPath,
      config
    });

    res.json({
      data: {
        projectId: projectId,
        timestamp: new Date().toISOString(),
        score: result.data?.score || 0,
        results: result.data?.results || {},
        recommendations: result.data?.recommendations || [],
        summary: result.data?.summary || {}
      },
      error: null
    });
  } catch (error) {
    this.logger.error('Performance analysis failed:', error);
    res.status(500).json({
     
      data: null,
      error: {
        message: 'Performance analysis failed',
        details: error.message
      }
    });
  }
}
```

**MODERN CODE:**
```javascript
// POST /api/analysis/performance
async analyze(req, res) {
  try {
    const { projectId, projectPath, config = {} } = req.body;

    if (!projectId || !projectPath) {
      return res.validationError('Missing required parameters: projectId and projectPath');
    }

    const result = await this.performanceService.analyze({
      projectId,
      projectPath,
      config
    });

    return res.success({
      projectId: projectId,
      score: result.data?.score || 0,
      results: result.data?.results || {},
      recommendations: result.data?.recommendations || [],
      summary: result.data?.summary || {}
    });
  } catch (error) {
    this.logger.error('Performance analysis failed:', error);
    return res.internalError('Performance analysis failed');
  }
}
```

## Frontend Services - Legacy Response Handling

### 1. ApiService.js

**LEGACY CODE:**
```javascript
// Handle backend response format
if (data && typeof data === 'object' && data.success !== undefined) {
  if (data.success) {
    return data.data || data;
  } else {
    return { error: data.error || 'Request failed' };
  }
}
```

**MODERN CODE:**
```javascript
// Handle new response format
if (data && typeof data === 'object' && data.error) {
  const error = new Error(data.error.message);
  error.code = data.error.code;
  error.statusCode = data.error.statusCode;
  throw error;
}

// Return data directly (new format)
return data;
```

### 2. Frontend Repository Pattern

**LEGACY CODE:**
```javascript
// ProjectRepository.jsx
const apiCall = async (endpoint, options = {}, projectId = null) => {
  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('API call failed:', error);
    return { error: error.message };
  }
};
```

**MODERN CODE:**
```javascript
// ProjectRepository.jsx
const apiCall = async (endpoint, options = {}, projectId = null) => {
  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json();
      if (errorData && errorData.error) {
        const error = new Error(errorData.error.message);
        error.code = errorData.error.code;
        error.statusCode = errorData.error.statusCode;
        throw error;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('API call failed:', error);
    throw error; // Let error handling be done by caller
  }
};
```

## Complete File List - All Affected Files

### Backend Controllers (48 files):
1. `backend/presentation/api/AnalysisController.js` ✅ (already modernized)
2. `backend/presentation/api/WebChatController.js` ✅ (already modernized)
3. `backend/presentation/api/ScriptGenerationController.js` ✅ (already modernized)
4. `backend/presentation/api/AuthController.js`
5. `backend/presentation/api/TaskController.js`
6. `backend/presentation/api/WorkflowController.js`
7. `backend/presentation/api/IDEMirrorController.js`
8. `backend/presentation/api/PerformanceAnalysisController.js`
9. `backend/presentation/api/TaskStatusSyncController.js`
10. `backend/presentation/api/TaskAnalysisController.js`
11. `backend/presentation/api/StreamingController.js`
12. `backend/presentation/api/SessionController.js`
13. `backend/presentation/api/QueueController.js`
14. `backend/presentation/api/ProjectAnalysisController.js`
15. `backend/presentation/api/PerformanceMonitoringController.js`
16. `backend/presentation/api/InterfaceController.js`
17. `backend/presentation/api/GitController.js`
18. `backend/presentation/api/ContentLibraryController.js`
19. `backend/presentation/api/CodeExplorerController.js`
20. `backend/presentation/api/projects/VersionController.js`
21. `backend/presentation/api/projects/ProjectInterfaceController.js`
22. `backend/presentation/api/projects/ProjectController.js`
23. `backend/presentation/api/controllers/TestManagementController.js`
24. `backend/presentation/api/controllers/TestCorrectionController.js`
25. `backend/presentation/api/controllers/AutoTestFixController.js`
26. `backend/presentation/api/controllers/DatabaseOptimizationController.js`
27. `backend/presentation/api/controllers/AutoRefactorController.js`
28. `backend/presentation/api/categories/analysis/security/ZapAnalysisController.js`
29. `backend/presentation/api/categories/analysis/security/TrivyAnalysisController.js`
30. `backend/presentation/api/categories/analysis/security/SnykAnalysisController.js`
31. `backend/presentation/api/categories/analysis/security/SemgrepAnalysisController.js`
32. `backend/presentation/api/categories/analysis/security/SecurityAnalysisController.js`
33. `backend/presentation/api/categories/analysis/security/ComplianceController.js`
34. `backend/presentation/api/categories/analysis/security/SecretScanningController.js`
35. `backend/presentation/api/categories/analysis/performance/PerformanceAnalysisController.js`
36. `backend/presentation/api/categories/analysis/performance/NetworkAnalysisController.js`
37. `backend/presentation/api/categories/analysis/performance/MemoryAnalysisController.js`
38. `backend/presentation/api/categories/analysis/performance/DatabaseAnalysisController.js`
39. `backend/presentation/api/categories/analysis/performance/CpuAnalysisController.js`
40. `backend/presentation/api/categories/analysis/architecture/StructureAnalysisController.js`
41. `backend/presentation/api/categories/analysis/architecture/PatternAnalysisController.js`
42. `backend/presentation/api/categories/analysis/architecture/LayerAnalysisController.js`
43. `backend/presentation/api/categories/analysis/architecture/CouplingAnalysisController.js`
44. `backend/presentation/api/categories/analysis/architecture/ArchitectureAnalysisController.js`
45. `backend/presentation/api/ide/IDEMirrorController.js`
46. `backend/presentation/api/routes/testCorrectionRoutes.js`
47. `backend/presentation/api/routes/healthRoutes.js`
48. `backend/presentation/api/routes/fileRoutes.js`
49. `backend/presentation/websocket/WebSocketManager.js`

### Frontend Services (17 files):
1. `frontend/src/infrastructure/services/ApiService.js` ✅ (already modernized)
2. `frontend/src/infrastructure/stores/AuthStore.jsx`
3. `frontend/src/infrastructure/services/IDEStartService.jsx`
4. `frontend/src/infrastructure/repositories/AnalysisRepository.jsx`
5. `frontend/src/infrastructure/repositories/ProjectRepository.jsx`
6. `frontend/src/infrastructure/stores/IDEStore.jsx`
7. `frontend/src/infrastructure/repositories/ChatRepository.jsx`
8. `frontend/src/infrastructure/services/CacheService.js`
9. `frontend/src/application/services/TaskReviewService.jsx`
10. `frontend/src/application/services/TaskCreationService.jsx`
11. `frontend/src/infrastructure/repositories/TaskWorkflowRepository.jsx`
12. `frontend/src/presentation/components/analysis/AnalysisDataViewer.jsx`
13. `frontend/src/presentation/components/ide/IDESwitch.jsx`
14. `frontend/src/presentation/components/analysis/CategoryAnalysisSection.jsx`
15. `frontend/src/hooks/usePortConfiguration.js`
16. `frontend/src/infrastructure/services/ETagManager.js`
17. `frontend/src/presentation/components/analysis/CategoryOverview.jsx`

## Migration Priority Order

### Phase 1: Core Controllers (High Priority)
1. `AuthController.js` - Authentication is critical
2. `TaskController.js` - Main task management
3. `WorkflowController.js` - Workflow execution
4. `IDEMirrorController.js` - IDE integration

### Phase 2: Analysis Controllers (Medium Priority)
5. `PerformanceAnalysisController.js`
6. `SecurityAnalysisController.js`
7. `ArchitectureAnalysisController.js`
8. All other analysis controllers

### Phase 3: Supporting Controllers (Low Priority)
9. `SessionController.js`
10. `QueueController.js`
11. `GitController.js`
12. All remaining controllers

### Phase 4: Frontend Services
13. All frontend repositories and services
14. Component error handling updates

## Key Migration Patterns

### Success Response Migration:
```javascript
// FROM:
res.json({ data: result })

// TO:
res.success(result)
```

### Error Response Migration:
```javascript
// FROM:
res.status(500).json({ error: 'Error message' })

// TO:
res.internalError('Error message')
```

### Validation Error Migration:
```javascript
// FROM:
res.status(400).json({ error: 'Validation failed' })

// TO:
res.validationError('Validation failed')
```

### Created Response Migration:
```javascript
// FROM:
res.status(201).json({ data: result })

// TO:
res.created(result)
```

### Unauthorized Response Migration:
```javascript
// FROM:
res.status(401).json({ error: 'Authentication required' })

// TO:
res.unauthorized('Authentication required')
```

## Additional Controller Examples - Complete Code Blocks

### 6. SessionController.js

**LEGACY CODE:**
```javascript
// POST /api/session/extend
async extendSession(req, res) {
  try {
    const { user, session } = req;
    
    if (!user || !session) {
      return res.status(401).json({
       
        error: 'Authentication required'
      });
    }

    const result = await this.sessionActivityService.extendSession(
      session.id, 
      'manual'
    );

    res.json({
      data: {
        sessionId: result.sessionId,
        expiresAt: result.expiresAt,
        extensionCount: result.extensionCount
      }
    });

  } catch (error) {
    logger.error('Session extension failed:', error);
    res.status(500).json({
     
      error: error.message || 'Failed to extend session'
    });
  }
}
```

**MODERN CODE:**
```javascript
// POST /api/session/extend
async extendSession(req, res) {
  try {
    const { user, session } = req;
    
    if (!user || !session) {
      return res.unauthorized('Authentication required');
    }

    const result = await this.sessionActivityService.extendSession(
      session.id, 
      'manual'
    );

    return res.success({
      sessionId: result.sessionId,
      expiresAt: result.expiresAt,
      extensionCount: result.extensionCount
    });

  } catch (error) {
    logger.error('Session extension failed:', error);
    return res.internalError('Failed to extend session');
  }
}
```

### 7. QueueController.js

**LEGACY CODE:**
```javascript
// GET /api/projects/:projectId/queue/status
async getQueueStatus(req, res) {
  try {
    const { projectId } = req.params;
    const { userId } = req.user;

    const queueStatus = await this.taskQueueStore.getProjectQueueStatus(projectId, userId);
    
    res.json({
      data: queueStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    this.logger.error('Failed to get queue status', { error: error.message });
    res.status(500).json({
     
      error: 'Failed to get queue status',
      message: error.message
    });
  }
}
```

**MODERN CODE:**
```javascript
// GET /api/projects/:projectId/queue/status
async getQueueStatus(req, res) {
  try {
    const { projectId } = req.params;
    const { userId } = req.user;

    const queueStatus = await this.taskQueueStore.getProjectQueueStatus(projectId, userId);
    
    return res.success(queueStatus);

  } catch (error) {
    this.logger.error('Failed to get queue status', { error: error.message });
    return res.internalError('Failed to get queue status');
  }
}
```

### 8. GitController.js

**LEGACY CODE:**
```javascript
// POST /api/projects/:projectId/git/status
async getStatus(req, res) {
  try {
    const projectId = req.params.projectId;
    const { projectPath } = req.body;
    const userId = req.user?.id;

    if (!projectId) {
      return res.status(400).json({
       
        error: 'Project ID is required'
      });
    }

    if (!projectPath) {
      return res.status(400).json({
       
        error: 'Project path is required'
      });
    }

    const [status, currentBranch] = await Promise.all([
      this.gitApplicationService.getStatusDirect(projectPath),
      this.gitApplicationService.getCurrentBranchDirect(projectPath)
    ]);
    
    const responseData = {
      data: {
        status,
        currentBranch
      },
      message: 'Git status retrieved successfully',
      timestamp: new Date().toISOString()
    };
    
    res.json(responseData);

  } catch (error) {
    this.logger.error('GitController: Failed to get Git status:', error);
    res.status(500).json({
     
      error: 'Failed to get Git status',
      message: error.message
    });
  }
}
```

**MODERN CODE:**
```javascript
// POST /api/projects/:projectId/git/status
async getStatus(req, res) {
  try {
    const projectId = req.params.projectId;
    const { projectPath } = req.body;
    const userId = req.user?.id;

    if (!projectId) {
      return res.validationError('Project ID is required');
    }

    if (!projectPath) {
      return res.validationError('Project path is required');
    }

    const [status, currentBranch] = await Promise.all([
      this.gitApplicationService.getStatusDirect(projectPath),
      this.gitApplicationService.getCurrentBranchDirect(projectPath)
    ]);
    
    return res.success({
      status,
      currentBranch
    }, 200, {
      message: 'Git status retrieved successfully'
    });

  } catch (error) {
    this.logger.error('GitController: Failed to get Git status:', error);
    return res.internalError('Failed to get Git status');
  }
}
```

### 9. ContentLibraryController.js

**LEGACY CODE:**
```javascript
// GET /api/content-library/prompts/:category/:filename
async getPrompt(req, res) {
  try {
    const { category, filename } = req.params;
    const content = await this.contentLibraryService.getPrompt(category, filename);
    res.json({ category, filename, content });
  } catch (error) {
    this.logger.error('Failed to get prompt:', error);
    res.status(404).json({ error: 'Prompt file not found', message: error.message });
  }
}
```

**MODERN CODE:**
```javascript
// GET /api/content-library/prompts/:category/:filename
async getPrompt(req, res) {
  try {
    const { category, filename } = req.params;
    const content = await this.contentLibraryService.getPrompt(category, filename);
    return res.success({ category, filename, content });
  } catch (error) {
    this.logger.error('Failed to get prompt:', error);
    return res.notFound('Prompt file not found');
  }
}
```

## Complete Pattern Summary

### All Legacy Patterns to Replace:

1. **Success with data wrapper:**
   - `res.json({ data: X })` → `res.success(X)`

2. **Success with data and timestamp:**
   - `res.json({ data: X, timestamp: new Date().toISOString() })` → `res.success(X)`

3. **Success with message:**
   - `res.json({ data: X, message: 'Y' })` → `res.success(X, 200, { message: 'Y' })`

4. **Error 400 (Validation):**
   - `res.status(400).json({ error: 'X' })` → `res.validationError('X')`

5. **Error 401 (Unauthorized):**
   - `res.status(401).json({ error: 'X' })` → `res.unauthorized('X')`

6. **Error 404 (Not Found):**
   - `res.status(404).json({ error: 'X' })` → `res.notFound('X')`

7. **Error 500 (Internal):**
   - `res.status(500).json({ error: 'X' })` → `res.internalError('X')`

8. **Error with message field:**
   - `res.status(500).json({ error: 'X', message: error.message })` → `res.internalError('X')`

9. **Success with null error:**
   - `res.json({ data: X, error: null })` → `res.success(X)`

10. **Error with null data:**
    - `res.status(500).json({ data: null, error: 'X' })` → `res.internalError('X')`
