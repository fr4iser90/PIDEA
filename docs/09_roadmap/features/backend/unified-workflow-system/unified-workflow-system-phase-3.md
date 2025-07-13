# Unified Workflow System – Phase 3: Database API Layer

## Overview
Create the API layer for unified workflow management, including controller, routes, and monitoring endpoints with database integration.

## Objectives
- [ ] Create `UnifiedWorkflowController.js` - Database API controller
- [ ] Create database API routes for workflow management
- [ ] Add database workflow execution endpoints
- [ ] Add database workflow monitoring endpoints

## Deliverables
- File: `backend/presentation/api/UnifiedWorkflowController.js` - Main API controller with database integration
- File: `backend/presentation/api/routes/unified-workflow.js` - API routes for unified workflow system
- File: `backend/presentation/api/middleware/unified-workflow-auth.js` - Authentication middleware
- File: `backend/presentation/api/validators/unified-workflow-validator.js` - API request validation

## Dependencies
- Requires: Phase 2 completion (application layer integration)
- Blocks: Phase 4 start

## Estimated Time
4 hours

## Success Criteria
- [ ] API controller created and functional
- [ ] Routes configured correctly
- [ ] Database integration working
- [ ] Authentication and validation working
- [ ] Unit tests passing

## Implementation Details

### UnifiedWorkflowController.js
```javascript
/**
 * UnifiedWorkflowController - Database API controller
 * Handles HTTP requests for unified workflow operations with database integration
 */
class UnifiedWorkflowController {
  constructor(dependencies = {}) {
    this.unifiedWorkflowService = dependencies.unifiedWorkflowService;
    this.projectRepository = dependencies.projectRepository;
    this.taskRepository = dependencies.taskRepository;
    this.logger = dependencies.logger || console;
  }

  /**
   * Execute workflow for project
   * POST /api/unified-workflow/execute
   */
  async executeWorkflow(req, res) {
    try {
      const { projectId, workflowConfig, userId } = req.body;

      this.logger.info('UnifiedWorkflowController: Executing workflow', {
        projectId,
        userId,
        workflowType: workflowConfig?.framework || workflowConfig?.workflow?.name
      });

      // Validate request
      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
      }

      if (!workflowConfig) {
        return res.status(400).json({
          success: false,
          error: 'Workflow configuration is required'
        });
      }

      // Execute workflow
      const results = await this.unifiedWorkflowService.executeWorkflow({
        projectId,
        ...workflowConfig,
        userId
      });

      this.logger.info('UnifiedWorkflowController: Workflow execution completed', {
        projectId,
        success: results.success
      });

      return res.status(200).json({
        success: true,
        results,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('UnifiedWorkflowController: Workflow execution failed', {
        projectId: req.body?.projectId,
        error: error.message
      });

      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Execute command for project
   * POST /api/unified-workflow/command
   */
  async executeCommand(req, res) {
    try {
      const { projectId, category, command, params, userId } = req.body;

      this.logger.info('UnifiedWorkflowController: Executing command', {
        projectId,
        category,
        command,
        userId
      });

      // Validate request
      if (!projectId || !category || !command) {
        return res.status(400).json({
          success: false,
          error: 'Project ID, category, and command are required'
        });
      }

      // Execute command
      const results = await this.unifiedWorkflowService.executeCommand({
        projectId,
        category,
        command,
        params: params || {},
        userId
      });

      this.logger.info('UnifiedWorkflowController: Command execution completed', {
        projectId,
        success: results.success
      });

      return res.status(200).json({
        success: true,
        results,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('UnifiedWorkflowController: Command execution failed', {
        projectId: req.body?.projectId,
        error: error.message
      });

      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Execute handler for project
   * POST /api/unified-workflow/handler
   */
  async executeHandler(req, res) {
    try {
      const { projectId, category, handler, request, response, dependencies, userId } = req.body;

      this.logger.info('UnifiedWorkflowController: Executing handler', {
        projectId,
        category,
        handler,
        userId
      });

      // Validate request
      if (!projectId || !category || !handler) {
        return res.status(400).json({
          success: false,
          error: 'Project ID, category, and handler are required'
        });
      }

      // Execute handler
      const results = await this.unifiedWorkflowService.executeHandler({
        projectId,
        category,
        handler,
        request: request || {},
        response: response || {},
        dependencies: dependencies || {},
        userId
      });

      this.logger.info('UnifiedWorkflowController: Handler execution completed', {
        projectId,
        success: results.success
      });

      return res.status(200).json({
        success: true,
        results,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('UnifiedWorkflowController: Handler execution failed', {
        projectId: req.body?.projectId,
        error: error.message
      });

      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Get workflow execution history for project
   * GET /api/unified-workflow/history/:projectId
   */
  async getExecutionHistory(req, res) {
    try {
      const { projectId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      this.logger.info('UnifiedWorkflowController: Getting execution history', {
        projectId,
        limit,
        offset
      });

      // Validate project exists
      const project = await this.projectRepository.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Get execution history from database
      const history = await this.getExecutionHistoryFromDatabase(projectId, {
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return res.status(200).json({
        success: true,
        project: {
          id: project.id,
          name: project.name,
          workspace_path: project.workspace_path
        },
        history,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: history.length
        },
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('UnifiedWorkflowController: Failed to get execution history', {
        projectId: req.params?.projectId,
        error: error.message
      });

      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Get available frameworks and workflows for project
   * GET /api/unified-workflow/available/:projectId
   */
  async getAvailableWorkflows(req, res) {
    try {
      const { projectId } = req.params;

      this.logger.info('UnifiedWorkflowController: Getting available workflows', {
        projectId
      });

      // Validate project exists
      const project = await this.projectRepository.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Get available frameworks
      const frameworks = await this.getAvailableFrameworks();
      
      // Get available workflow templates
      const workflowTemplates = await this.getAvailableWorkflowTemplates();

      return res.status(200).json({
        success: true,
        project: {
          id: project.id,
          name: project.name,
          workspace_path: project.workspace_path
        },
        frameworks,
        workflowTemplates,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('UnifiedWorkflowController: Failed to get available workflows', {
        projectId: req.params?.projectId,
        error: error.message
      });

      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Health check endpoint
   * GET /api/unified-workflow/health
   */
  async healthCheck(req, res) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date(),
        services: {
          unifiedWorkflowService: 'healthy',
          projectRepository: 'healthy',
          taskRepository: 'healthy'
        }
      };

      return res.status(200).json(health);
    } catch (error) {
      return res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      });
    }
  }
}
```

### unified-workflow.js (Routes)
```javascript
/**
 * Unified Workflow API Routes
 * Defines all API endpoints for unified workflow system
 */
const express = require('express');
const router = express.Router();
const UnifiedWorkflowController = require('../UnifiedWorkflowController');
const unifiedWorkflowAuth = require('../middleware/unified-workflow-auth');
const unifiedWorkflowValidator = require('../validators/unified-workflow-validator');

// Initialize controller
const unifiedWorkflowController = new UnifiedWorkflowController({
  unifiedWorkflowService: require('../../../application/services/UnifiedWorkflowService'),
  projectRepository: require('../../../infrastructure/database/ProjectRepository'),
  taskRepository: require('../../../infrastructure/database/TaskRepository')
});

// Apply middleware
router.use(unifiedWorkflowAuth);
router.use(unifiedWorkflowValidator);

// Health check
router.get('/health', unifiedWorkflowController.healthCheck.bind(unifiedWorkflowController));

// Workflow execution
router.post('/execute', unifiedWorkflowController.executeWorkflow.bind(unifiedWorkflowController));

// Command execution
router.post('/command', unifiedWorkflowController.executeCommand.bind(unifiedWorkflowController));

// Handler execution
router.post('/handler', unifiedWorkflowController.executeHandler.bind(unifiedWorkflowController));

// Execution history
router.get('/history/:projectId', unifiedWorkflowController.getExecutionHistory.bind(unifiedWorkflowController));

// Available workflows
router.get('/available/:projectId', unifiedWorkflowController.getAvailableWorkflows.bind(unifiedWorkflowController));

module.exports = router;
```

### unified-workflow-auth.js (Middleware)
```javascript
/**
 * Unified Workflow Authentication Middleware
 * Handles authentication and authorization for unified workflow endpoints
 */
const unifiedWorkflowAuth = (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user has permission to access unified workflow
    if (!req.user.permissions || !req.user.permissions.includes('unified-workflow')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    // Add user context to request
    req.userContext = {
      userId: req.user.id,
      username: req.user.username,
      permissions: req.user.permissions
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Authentication middleware error'
    });
  }
};

module.exports = unifiedWorkflowAuth;
```

### unified-workflow-validator.js (Validator)
```javascript
/**
 * Unified Workflow Request Validator
 * Validates API requests for unified workflow endpoints
 */
const unifiedWorkflowValidator = (req, res, next) => {
  try {
    const { method, path, body } = req;

    // Validate based on endpoint
    switch (path) {
      case '/api/unified-workflow/execute':
        validateExecuteWorkflow(body);
        break;
      case '/api/unified-workflow/command':
        validateExecuteCommand(body);
        break;
      case '/api/unified-workflow/handler':
        validateExecuteHandler(body);
        break;
      default:
        // No validation needed for other endpoints
        break;
    }

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Validate execute workflow request
 */
function validateExecuteWorkflow(body) {
  if (!body.projectId) {
    throw new Error('Project ID is required');
  }
  
  if (!body.workflowConfig) {
    throw new Error('Workflow configuration is required');
  }
  
  if (body.workflowConfig.framework && body.workflowConfig.workflow) {
    throw new Error('Cannot specify both framework and workflow');
  }
  
  if (!body.workflowConfig.framework && !body.workflowConfig.workflow) {
    throw new Error('Either framework or workflow must be specified');
  }
}

/**
 * Validate execute command request
 */
function validateExecuteCommand(body) {
  if (!body.projectId) {
    throw new Error('Project ID is required');
  }
  
  if (!body.category) {
    throw new Error('Category is required');
  }
  
  if (!body.command) {
    throw new Error('Command is required');
  }
}

/**
 * Validate execute handler request
 */
function validateExecuteHandler(body) {
  if (!body.projectId) {
    throw new Error('Project ID is required');
  }
  
  if (!body.category) {
    throw new Error('Category is required');
  }
  
  if (!body.handler) {
    throw new Error('Handler is required');
  }
}

module.exports = unifiedWorkflowValidator;
``` 