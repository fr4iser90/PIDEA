# Handler Interface Architecture Refactoring – Phase 2: Move Workflow Handlers to Domain

## Overview
Move all workflow-specific handlers from the application layer to the domain layer and create a proper workflow handler registry. This establishes the correct layer separation according to DDD principles.

## Objectives
- [ ] Create `backend/domain/workflows/handlers/` directory
- [ ] Move all workflow handlers from application to domain
- [ ] Rename `HandlerRegistry.js` to `WorkflowHandlerRegistry.js`
- [ ] Update all import references to use domain interfaces
- [ ] Consolidate workflow handler management
- [ ] Update workflow handler factory and validator

## Deliverables
- Directory: `backend/domain/workflows/handlers/` - Workflow handlers location
- File: `backend/domain/workflows/handlers/UnifiedWorkflowHandler.js` - Moved from application
- File: `backend/domain/workflows/handlers/WorkflowHandlerRegistry.js` - Renamed and moved
- File: `backend/domain/workflows/handlers/HandlerFactory.js` - Moved from application
- File: `backend/domain/workflows/handlers/HandlerValidator.js` - Moved from application
- File: `backend/domain/workflows/handlers/HandlerMetrics.js` - Moved from application
- File: `backend/domain/workflows/handlers/HandlerOptimizer.js` - Moved from application
- File: `backend/domain/workflows/handlers/HandlerResult.js` - Moved from application
- File: `backend/domain/workflows/handlers/HandlerAudit.js` - Moved from application
- File: `backend/domain/workflows/handlers/HandlerContext.js` - Moved from application
- Directory: `backend/domain/workflows/handlers/adapters/` - Moved from application
- Directory: `backend/domain/workflows/handlers/exceptions/` - Moved from application
- Updates: All import statements in affected files

## Dependencies
- Requires: Phase 1 completion (domain interfaces created)
- Blocks: Phase 3 start

## Estimated Time
2 hours

## Success Criteria
- [ ] All workflow handlers moved to domain layer
- [ ] Workflow handler registry properly renamed and located
- [ ] All import references updated to use domain interfaces
- [ ] No broken imports in the codebase
- [ ] Clear separation between business and workflow handlers
- [ ] Workflow handler management consolidated

## Implementation Steps

### Step 1: Create Workflow Handlers Directory
```bash
mkdir -p backend/domain/workflows/handlers
mkdir -p backend/domain/workflows/handlers/adapters
mkdir -p backend/domain/workflows/handlers/exceptions
```

### Step 2: Move Workflow Handler Files
```bash
# Move main workflow handler files
mv backend/application/handlers/workflow/UnifiedWorkflowHandler.js backend/domain/workflows/handlers/
mv backend/application/handlers/workflow/HandlerFactory.js backend/domain/workflows/handlers/
mv backend/application/handlers/workflow/HandlerValidator.js backend/domain/workflows/handlers/
mv backend/application/handlers/workflow/HandlerMetrics.js backend/domain/workflows/handlers/
mv backend/application/handlers/workflow/HandlerOptimizer.js backend/domain/workflows/handlers/
mv backend/application/handlers/workflow/HandlerResult.js backend/domain/workflows/handlers/
mv backend/application/handlers/workflow/HandlerAudit.js backend/domain/workflows/handlers/
mv backend/application/handlers/workflow/HandlerContext.js backend/domain/workflows/handlers/

# Move subdirectories
mv backend/application/handlers/workflow/adapters/* backend/domain/workflows/handlers/adapters/
mv backend/application/handlers/workflow/exceptions/* backend/domain/workflows/handlers/exceptions/

# Move and rename registry
mv backend/application/handlers/workflow/HandlerRegistry.js backend/domain/workflows/handlers/WorkflowHandlerRegistry.js
```

### Step 3: Update WorkflowHandlerRegistry.js
Update the registry to use domain interfaces and proper naming:

```javascript
/**
 * WorkflowHandlerRegistry - Domain Layer: Workflow handler registration and management
 * 
 * This class provides a centralized registry for managing workflow handlers
 * in the domain layer. It follows the registry pattern for workflow handler management.
 */
const IHandler = require('@domain/interfaces/IHandler');

class WorkflowHandlerRegistry {
  /**
   * Create a new workflow handler registry
   * @param {Object} options - Registry options
   */
  constructor(options = {}) {
    this.handlers = new Map();
    this.handlerTypes = new Map();
    this.handlerMetadata = new Map();
    this.handlerStatistics = new Map();
    this.options = {
      enableStatistics: options.enableStatistics !== false,
      maxHandlers: options.maxHandlers || 1000,
      enableValidation: options.enableValidation !== false,
      ...options
    };
  }

  /**
   * Register workflow handler
   * @param {string} type - Handler type
   * @param {IHandler} handler - Handler instance
   * @param {Object} metadata - Handler metadata
   * @returns {boolean} True if registration successful
   */
  registerHandler(type, handler, metadata = {}) {
    try {
      // Validate inputs
      if (!type || typeof type !== 'string') {
        throw new Error('Handler type must be a non-empty string');
      }

      if (!handler) {
        throw new Error('Handler instance is required');
      }

      // Validate handler implements IHandler interface
      if (!(handler instanceof IHandler)) {
        throw new Error('Handler must implement IHandler interface');
      }

      // Check registry capacity
      if (this.handlers.size >= this.options.maxHandlers) {
        throw new Error(`Registry capacity exceeded (max: ${this.options.maxHandlers})`);
      }

      // Validate handler if enabled
      if (this.options.enableValidation) {
        this.validateHandlerForRegistration(handler);
      }

      // Register handler
      this.handlers.set(type, handler);
      this.handlerTypes.set(type, handler.constructor.name);
      
      // Store metadata
      const fullMetadata = {
        ...handler.getMetadata(),
        ...metadata,
        registeredAt: new Date(),
        type,
        className: handler.constructor.name
      };
      this.handlerMetadata.set(type, fullMetadata);

      // Initialize statistics
      if (this.options.enableStatistics) {
        this.handlerStatistics.set(type, {
          executions: 0,
          successes: 0,
          failures: 0,
          totalDuration: 0,
          lastExecuted: null,
          averageDuration: 0
        });
      }

      return true;

    } catch (error) {
      console.error('Workflow handler registration failed:', error.message);
      return false;
    }
  }

  // ... rest of the registry methods remain the same but with updated documentation
}

module.exports = WorkflowHandlerRegistry;
```

### Step 4: Update HandlerFactory.js
Update the factory to use domain interfaces:

```javascript
/**
 * HandlerFactory - Domain Layer: Workflow handler factory
 * 
 * Creates and configures workflow handlers using the domain interfaces.
 */
const IHandler = require('@domain/interfaces/IHandler');
const IHandlerAdapter = require('@domain/interfaces/IHandlerAdapter');

class HandlerFactory {
  constructor(registry = null) {
    this.registry = registry;
    this.handlerCache = new Map();
  }

  /**
   * Create handler instance
   * @param {string} type - Handler type
   * @param {Object} config - Handler configuration
   * @returns {IHandler} Handler instance
   */
  createHandler(type, config = {}) {
    // Implementation with domain interfaces
  }

  // ... rest of factory methods
}

module.exports = HandlerFactory;
```

### Step 5: Update HandlerValidator.js
Update the validator to use domain interfaces:

```javascript
/**
 * HandlerValidator - Domain Layer: Workflow handler validation
 * 
 * Validates workflow handlers against domain interfaces and business rules.
 */
const IHandler = require('@domain/interfaces/IHandler');
const IWorkflowContext = require('@domain/interfaces/IWorkflowContext');

class HandlerValidator {
  constructor() {
    this.validationRules = [];
  }

  /**
   * Validate handler
   * @param {IHandler} handler - Handler to validate
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Validation result
   */
  async validateHandler(handler, context) {
    // Implementation with domain interfaces
  }

  // ... rest of validator methods
}

module.exports = HandlerValidator;
```

### Step 6: Update All Import References
Update all files that import workflow handlers to use the new domain paths:

```javascript
// Old imports (to be updated)
const UnifiedWorkflowHandler = require('../../application/handlers/workflow/UnifiedWorkflowHandler');
const HandlerRegistry = require('../../application/handlers/workflow/HandlerRegistry');

// New imports (correct domain paths)
const UnifiedWorkflowHandler = require('@domain/workflows/handlers/UnifiedWorkflowHandler');
const WorkflowHandlerRegistry = require('@domain/workflows/handlers/WorkflowHandlerRegistry');
```

### Step 7: Update Workflow Service Integration
Update any services that use workflow handlers to use the new domain location:

```javascript
/**
 * UnifiedWorkflowService - Updated to use domain handlers
 */
const {
  WorkflowHandlerRegistry,
  UnifiedWorkflowHandler,
  HandlerFactory,
  HandlerValidator
} = require('@domain/workflows/handlers');

class UnifiedWorkflowService {
  constructor(dependencies = {}) {
    this.handlerRegistry = dependencies.handlerRegistry || new WorkflowHandlerRegistry();
    this.handlerFactory = dependencies.handlerFactory || new HandlerFactory(this.handlerRegistry);
    this.handlerValidator = dependencies.handlerValidator || new HandlerValidator();
    // ... rest of constructor
  }

  // ... rest of service methods
}
```

## Files to Update
1. All workflow handler files (import statements)
2. `backend/domain/workflows/index.js` (add handler exports)
3. `backend/domain/services/UnifiedWorkflowService.js` (update imports)
4. Any application layer files that use workflow handlers
5. Test files that reference workflow handlers

## Validation Checklist
- [ ] All workflow handlers moved to domain layer
- [ ] WorkflowHandlerRegistry properly renamed and located
- [ ] All import statements updated to use domain paths
- [ ] No broken imports in the codebase
- [ ] Clear separation between business and workflow handlers
- [ ] Workflow handler management consolidated
- [ ] All handlers use domain interfaces
- [ ] Registry properly validates IHandler interface compliance 