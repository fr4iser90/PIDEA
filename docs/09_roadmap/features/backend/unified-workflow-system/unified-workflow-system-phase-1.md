# Unified Workflow System – Phase 1: Database-Driven Core System

## Overview
Create the core unified workflow system components with database integration, including orchestrator, engine, context, and validator.

## Objectives
- [ ] Create `UnifiedWorkflowOrchestrator.js` - Database-driven orchestrator
- [ ] Create `UnifiedWorkflowEngine.js` - Database-aware execution engine
- [ ] Create `UnifiedWorkflowContext.js` - Database context management
- [ ] Create `UnifiedWorkflowValidator.js` - Database validation system
- [ ] Create database-driven exports and integration

## Deliverables
- File: `backend/domain/workflows/unified/UnifiedWorkflowOrchestrator.js` - Main orchestrator with database integration
- File: `backend/domain/workflows/unified/UnifiedWorkflowEngine.js` - Execution engine with database awareness
- File: `backend/domain/workflows/unified/UnifiedWorkflowContext.js` - Context management with database project data
- File: `backend/domain/workflows/unified/UnifiedWorkflowValidator.js` - Validation system for database-driven workflows
- File: `backend/domain/workflows/unified/index.js` - Module exports for unified system

## Dependencies
- Requires: Existing Framework, Workflow, Command, Handler, Step systems
- Blocks: Phase 2 start

## Estimated Time
8 hours

## Success Criteria
- [ ] All core components created and functional
- [ ] Database integration working correctly
- [ ] Registry method calls use correct patterns
- [ ] Unit tests passing
- [ ] Documentation complete

## Implementation Details

### UnifiedWorkflowOrchestrator.js
```javascript
/**
 * UnifiedWorkflowOrchestrator - Database-driven workflow orchestration
 * Integrates all workflow components with database project context
 */
class UnifiedWorkflowOrchestrator {
  constructor(dependencies = {}) {
    this.frameworkRegistry = dependencies.frameworkRegistry;
    this.stepRegistry = dependencies.stepRegistry;
    this.commandRegistry = dependencies.commandRegistry;
    this.handlerRegistry = dependencies.handlerRegistry;
    
    // Database dependencies
    this.projectRepository = dependencies.projectRepository;
    this.taskRepository = dependencies.taskRepository;
    
    this.engine = new UnifiedWorkflowEngine();
    this.context = new UnifiedWorkflowContext();
    this.validator = new UnifiedWorkflowValidator();
  }

  async executeWorkflow(workflowConfig, context = {}) {
    // Get project from database
    const project = await this.getProjectFromDatabase(context.projectId);
    
    // Validate workflow configuration
    await this.validator.validateWorkflow(workflowConfig);
    
    // Create execution context with database project
    const executionContext = this.context.createContext(workflowConfig, {
      ...context,
      projectId: project.id,
      projectPath: project.workspace_path,
      projectName: project.name
    });
    
    // Execute workflow
    const results = await this.engine.execute(executionContext);
    
    // Save results to database
    await this.saveExecutionResults(executionContext, results);
    
    return results;
  }
}
```

### UnifiedWorkflowEngine.js
```javascript
/**
 * UnifiedWorkflowEngine - Database-aware execution engine
 * Handles execution of workflows, commands, and frameworks with database context
 */
class UnifiedWorkflowEngine {
  constructor(dependencies = {}) {
    this.logger = dependencies.logger || console;
    this.eventBus = dependencies.eventBus;
  }

  async execute(executionContext) {
    const { workflow, framework, stepResults = [] } = executionContext;
    
    // Execute based on type
    if (framework) {
      return await this.executeFramework(framework, executionContext);
    } else if (workflow) {
      return await this.executeWorkflow(workflow, executionContext);
    } else {
      throw new Error('No workflow or framework specified');
    }
  }
}
```

### UnifiedWorkflowContext.js
```javascript
/**
 * UnifiedWorkflowContext - Database context management
 * Manages execution context with database project information
 */
class UnifiedWorkflowContext {
  constructor() {
    this.contexts = new Map();
  }

  createContext(workflowConfig, projectContext) {
    const contextId = this.generateContextId();
    
    const context = {
      id: contextId,
      workflowConfig,
      projectContext,
      createdAt: new Date(),
      state: 'initialized',
      data: new Map(),
      results: []
    };
    
    this.contexts.set(contextId, context);
    return context;
  }
}
```

### UnifiedWorkflowValidator.js
```javascript
/**
 * UnifiedWorkflowValidator - Database validation system
 * Validates workflow configurations and database project context
 */
class UnifiedWorkflowValidator {
  constructor() {
    this.validationRules = new Map();
  }

  async validateWorkflow(workflowConfig) {
    const errors = [];
    
    // Validate required fields
    if (!workflowConfig.projectId) {
      errors.push('Project ID is required');
    }
    
    // Validate workflow structure
    if (workflowConfig.workflow && !workflowConfig.workflow.name) {
      errors.push('Workflow name is required');
    }
    
    if (errors.length > 0) {
      throw new Error(`Workflow validation failed: ${errors.join(', ')}`);
    }
  }
}
```

### index.js
```javascript
/**
 * Unified Workflow System - Module exports
 * Exports all unified workflow components
 */
const UnifiedWorkflowOrchestrator = require('./UnifiedWorkflowOrchestrator');
const UnifiedWorkflowEngine = require('./UnifiedWorkflowEngine');
const UnifiedWorkflowContext = require('./UnifiedWorkflowContext');
const UnifiedWorkflowValidator = require('./UnifiedWorkflowValidator');

module.exports = {
  UnifiedWorkflowOrchestrator,
  UnifiedWorkflowEngine,
  UnifiedWorkflowContext,
  UnifiedWorkflowValidator
};
``` 