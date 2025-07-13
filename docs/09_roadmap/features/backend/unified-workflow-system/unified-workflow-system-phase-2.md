# Unified Workflow System – Phase 2: Database Application Layer Integration

## Overview
Create the application layer services and integrate with existing database project system, including commands, handlers, and composition utilities.

## Objectives
- [ ] Create `UnifiedWorkflowService.js` - Database-driven application service
- [ ] Integrate with existing database project system
- [ ] Add database-driven workflow commands and handlers
- [ ] Create database workflow composition utilities

## Deliverables
- File: `backend/application/services/UnifiedWorkflowService.js` - Main application service with database integration
- File: `backend/application/commands/UnifiedWorkflowCommand.js` - Database workflow command
- File: `backend/application/handlers/UnifiedWorkflowHandler.js` - Database workflow handler
- File: `backend/domain/workflows/unified/UnifiedWorkflowComposer.js` - Database workflow composition utilities

## Dependencies
- Requires: Phase 1 completion (core unified system)
- Blocks: Phase 3 start

## Estimated Time
8 hours

## Success Criteria
- [ ] Application service created and functional
- [ ] Database integration working correctly
- [ ] Commands and handlers integrated
- [ ] Composition utilities working
- [ ] Unit tests passing

## Implementation Details

### UnifiedWorkflowService.js
```javascript
/**
 * UnifiedWorkflowService - Database-driven application service
 * Provides high-level workflow execution with database integration
 */
class UnifiedWorkflowService {
  constructor(dependencies = {}) {
    this.orchestrator = dependencies.orchestrator;
    this.projectRepository = dependencies.projectRepository;
    this.taskRepository = dependencies.taskRepository;
    this.logger = dependencies.logger || console;
    this.eventBus = dependencies.eventBus;
  }

  /**
   * Execute workflow for specific project
   * @param {Object} config - Workflow configuration with projectId
   * @returns {Promise<Object>} Execution results
   */
  async executeWorkflow(config) {
    try {
      this.logger.info('UnifiedWorkflowService: Starting workflow execution', {
        projectId: config.projectId,
        workflowType: config.framework || config.workflow?.name
      });

      // Validate project exists
      const project = await this.projectRepository.findById(config.projectId);
      if (!project) {
        throw new Error(`Project not found: ${config.projectId}`);
      }

      // Execute workflow
      const results = await this.orchestrator.executeWorkflow(config, {
        projectId: config.projectId,
        userId: config.userId
      });

      this.logger.info('UnifiedWorkflowService: Workflow execution completed', {
        projectId: config.projectId,
        success: results.success
      });

      return results;
    } catch (error) {
      this.logger.error('UnifiedWorkflowService: Workflow execution failed', {
        projectId: config.projectId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute command for specific project
   * @param {Object} config - Command configuration with projectId
   * @returns {Promise<Object>} Command results
   */
  async executeCommand(config) {
    try {
      this.logger.info('UnifiedWorkflowService: Starting command execution', {
        projectId: config.projectId,
        category: config.category,
        command: config.command
      });

      // Get project context
      const project = await this.projectRepository.findById(config.projectId);
      if (!project) {
        throw new Error(`Project not found: ${config.projectId}`);
      }

      // Build command with database context
      const command = this.commandRegistry.buildFromCategory(
        config.category,
        config.command,
        {
          ...config.params,
          projectPath: project.workspace_path,
          projectId: project.id
        }
      );

      // Execute command
      const results = await command.execute();

      this.logger.info('UnifiedWorkflowService: Command execution completed', {
        projectId: config.projectId,
        success: results.success
      });

      return results;
    } catch (error) {
      this.logger.error('UnifiedWorkflowService: Command execution failed', {
        projectId: config.projectId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute handler for specific project
   * @param {Object} config - Handler configuration with projectId
   * @returns {Promise<Object>} Handler results
   */
  async executeHandler(config) {
    try {
      this.logger.info('UnifiedWorkflowService: Starting handler execution', {
        projectId: config.projectId,
        category: config.category,
        handler: config.handler
      });

      // Get project context
      const project = await this.projectRepository.findById(config.projectId);
      if (!project) {
        throw new Error(`Project not found: ${config.projectId}`);
      }

      // Build handler with database context
      const handler = this.handlerRegistry.buildFromCategory(
        config.category,
        config.handler,
        {
          ...config.dependencies,
          projectPath: project.workspace_path,
          projectId: project.id
        }
      );

      // Execute handler
      const results = await handler.handle(config.request, config.response);

      this.logger.info('UnifiedWorkflowService: Handler execution completed', {
        projectId: config.projectId,
        success: results.success
      });

      return results;
    } catch (error) {
      this.logger.error('UnifiedWorkflowService: Handler execution failed', {
        projectId: config.projectId,
        error: error.message
      });
      throw error;
    }
  }
}
```

### UnifiedWorkflowCommand.js
```javascript
/**
 * UnifiedWorkflowCommand - Database workflow command
 * Command for executing unified workflows with database integration
 */
class UnifiedWorkflowCommand {
  constructor(params = {}) {
    this.projectId = params.projectId;
    this.workflowConfig = params.workflowConfig;
    this.userId = params.userId;
    this.options = params.options || {};
  }

  /**
   * Execute the unified workflow command
   * @returns {Promise<Object>} Command execution results
   */
  async execute() {
    try {
      // Validate command parameters
      this.validate();

      // Execute workflow through service
      const results = await this.unifiedWorkflowService.executeWorkflow({
        projectId: this.projectId,
        ...this.workflowConfig,
        userId: this.userId,
        options: this.options
      });

      return {
        success: true,
        results,
        command: 'UnifiedWorkflowCommand',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        command: 'UnifiedWorkflowCommand',
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate command parameters
   */
  validate() {
    if (!this.projectId) {
      throw new Error('Project ID is required');
    }
    if (!this.workflowConfig) {
      throw new Error('Workflow configuration is required');
    }
  }
}
```

### UnifiedWorkflowHandler.js
```javascript
/**
 * UnifiedWorkflowHandler - Database workflow handler
 * Handler for processing unified workflow requests with database integration
 */
class UnifiedWorkflowHandler {
  constructor(dependencies = {}) {
    this.unifiedWorkflowService = dependencies.unifiedWorkflowService;
    this.logger = dependencies.logger || console;
  }

  /**
   * Handle unified workflow request
   * @param {Object} request - Handler request
   * @param {Object} response - Handler response
   * @returns {Promise<Object>} Handler results
   */
  async handle(request, response) {
    try {
      this.logger.info('UnifiedWorkflowHandler: Processing request', {
        requestType: request.type,
        projectId: request.projectId
      });

      let results;

      // Handle different request types
      switch (request.type) {
        case 'workflow':
          results = await this.unifiedWorkflowService.executeWorkflow(request.config);
          break;
        case 'command':
          results = await this.unifiedWorkflowService.executeCommand(request.config);
          break;
        case 'handler':
          results = await this.unifiedWorkflowService.executeHandler(request.config);
          break;
        default:
          throw new Error(`Unknown request type: ${request.type}`);
      }

      // Update response
      response.success = true;
      response.results = results;
      response.timestamp = new Date();

      this.logger.info('UnifiedWorkflowHandler: Request processed successfully', {
        requestType: request.type,
        projectId: request.projectId
      });

      return response;
    } catch (error) {
      this.logger.error('UnifiedWorkflowHandler: Request processing failed', {
        requestType: request.type,
        projectId: request.projectId,
        error: error.message
      });

      response.success = false;
      response.error = error.message;
      response.timestamp = new Date();

      return response;
    }
  }
}
```

### UnifiedWorkflowComposer.js
```javascript
/**
 * UnifiedWorkflowComposer - Database workflow composition utilities
 * Provides utilities for composing workflows with database context
 */
class UnifiedWorkflowComposer {
  constructor(dependencies = {}) {
    this.workflowBuilder = dependencies.workflowBuilder;
    this.stepRegistry = dependencies.stepRegistry;
    this.frameworkRegistry = dependencies.frameworkRegistry;
  }

  /**
   * Compose workflow from framework
   * @param {string} frameworkName - Framework name
   * @param {Object} projectContext - Project context from database
   * @param {Object} options - Composition options
   * @returns {Object} Composed workflow
   */
  async composeFromFramework(frameworkName, projectContext, options = {}) {
    // Get framework from registry
    const framework = this.frameworkRegistry.getFramework(frameworkName);
    
    // Build framework with project context
    const frameworkInstance = await this.frameworkBuilder.buildFramework(frameworkName, {
      projectPath: projectContext.workspace_path,
      projectId: projectContext.id,
      ...options
    });

    // Create workflow from framework
    const workflow = this.workflowBuilder
      .setMetadata({
        name: `${frameworkName}-${projectContext.name}`,
        description: `Workflow composed from ${frameworkName} framework`,
        projectId: projectContext.id,
        projectPath: projectContext.workspace_path,
        framework: frameworkName
      });

    // Add framework steps
    if (frameworkInstance.steps) {
      for (const stepConfig of frameworkInstance.steps) {
        const step = this.stepRegistry.createStep(stepConfig.type, {
          ...stepConfig.options,
          projectPath: projectContext.workspace_path
        });
        workflow.addStep(step);
      }
    }

    return workflow.build();
  }

  /**
   * Compose workflow from configuration
   * @param {Object} config - Workflow configuration
   * @param {Object} projectContext - Project context from database
   * @returns {Object} Composed workflow
   */
  composeFromConfig(config, projectContext) {
    const workflow = this.workflowBuilder
      .setMetadata({
        name: config.name,
        description: config.description,
        projectId: projectContext.id,
        projectPath: projectContext.workspace_path
      });

    // Add steps from configuration
    if (config.steps) {
      for (const stepConfig of config.steps) {
        const step = this.stepRegistry.createStep(stepConfig.type, {
          ...stepConfig.options,
          projectPath: projectContext.workspace_path
        });
        workflow.addStep(step);
      }
    }

    return workflow.build();
  }
}
``` 