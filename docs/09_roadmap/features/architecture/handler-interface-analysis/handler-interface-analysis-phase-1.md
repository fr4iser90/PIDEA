# Handler Interface Architecture Refactoring – Phase 1: Create Central Domain Interfaces

## Overview
Create the central domain interfaces directory and move all interfaces from the application layer to the domain layer. This establishes the proper DDD architecture foundation.

## Objectives
- [ ] Create `backend/domain/interfaces/` directory
- [ ] Move `IHandler.js` from application to domain
- [ ] Move `IHandlerAdapter.js` from application to domain
- [ ] Create missing workflow interfaces (`IWorkflow.js`, `IWorkflowContext.js`, `IWorkflowStep.js`, `IWorkflowValidator.js`)
- [ ] Create `IStep.js` interface for steps
- [ ] Create `IFramework.js` interface for frameworks
- [ ] Update all import references to use new domain interfaces

## Deliverables
- Directory: `backend/domain/interfaces/` - Central domain interfaces location
- File: `backend/domain/interfaces/IHandler.js` - Moved from application layer
- File: `backend/domain/interfaces/IHandlerAdapter.js` - Moved from application layer
- File: `backend/domain/interfaces/IWorkflow.js` - New workflow interface
- File: `backend/domain/interfaces/IWorkflowContext.js` - New workflow context interface
- File: `backend/domain/interfaces/IWorkflowStep.js` - New workflow step interface
- File: `backend/domain/interfaces/IWorkflowValidator.js` - New workflow validator interface
- File: `backend/domain/interfaces/IStep.js` - New step interface
- File: `backend/domain/interfaces/IFramework.js` - New framework interface
- Updates: All import statements in affected files

## Dependencies
- Requires: None (foundation phase)
- Blocks: Phase 2 start

## Estimated Time
2 hours

## Success Criteria
- [ ] All domain interfaces exist in correct location
- [ ] All interfaces follow consistent naming and structure
- [ ] All import references updated to use domain interfaces
- [ ] No broken imports in the codebase
- [ ] DDD layer separation properly established

## Implementation Steps

### Step 1: Create Domain Interfaces Directory
```bash
mkdir -p backend/domain/interfaces
```

### Step 2: Move Existing Interfaces
```bash
# Move IHandler.js from application to domain
mv backend/application/handlers/workflow/interfaces/IHandler.js backend/domain/interfaces/

# Move IHandlerAdapter.js from application to domain
mv backend/application/handlers/workflow/interfaces/IHandlerAdapter.js backend/domain/interfaces/
```

### Step 3: Create Missing Workflow Interfaces

#### IWorkflow.js
```javascript
/**
 * IWorkflow - Interface for workflow implementations
 * 
 * This interface defines the contract that all workflows must implement
 * in the domain layer. It provides a consistent API for workflow
 * execution, validation, and metadata access.
 */
class IWorkflow {
  /**
   * Execute workflow
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Execution result
   */
  async execute(context) {
    throw new Error('execute method must be implemented');
  }

  /**
   * Validate workflow
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Validation result
   */
  async validate(context) {
    throw new Error('validate method must be implemented');
  }

  /**
   * Get workflow metadata
   * @returns {Object} Workflow metadata
   */
  getMetadata() {
    throw new Error('getMetadata method must be implemented');
  }
}

module.exports = IWorkflow;
```

#### IWorkflowContext.js
```javascript
/**
 * IWorkflowContext - Interface for workflow context
 * 
 * This interface defines the contract for workflow execution context
 * that provides state, metadata, and data management.
 */
class IWorkflowContext {
  /**
   * Get workflow ID
   * @returns {string} Workflow ID
   */
  getWorkflowId() {
    throw new Error('getWorkflowId method must be implemented');
  }

  /**
   * Get workflow state
   * @returns {Object} Current workflow state
   */
  getState() {
    throw new Error('getState method must be implemented');
  }

  /**
   * Set workflow state
   * @param {Object} state - New workflow state
   */
  setState(state) {
    throw new Error('setState method must be implemented');
  }

  /**
   * Get workflow data
   * @returns {Object} Workflow data
   */
  getData() {
    throw new Error('getData method must be implemented');
  }

  /**
   * Set workflow data
   * @param {Object} data - Workflow data
   */
  setData(data) {
    throw new Error('setData method must be implemented');
  }

  /**
   * Validate context
   * @returns {Promise<Object>} Validation result
   */
  async validate() {
    throw new Error('validate method must be implemented');
  }
}

module.exports = IWorkflowContext;
```

#### IWorkflowStep.js
```javascript
/**
 * IWorkflowStep - Interface for workflow steps
 * 
 * This interface defines the contract that all workflow steps must implement.
 */
class IWorkflowStep {
  /**
   * Execute step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Step result
   */
  async execute(context) {
    throw new Error('execute method must be implemented');
  }

  /**
   * Validate step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Validation result
   */
  async validate(context) {
    throw new Error('validate method must be implemented');
  }

  /**
   * Get step metadata
   * @returns {Object} Step metadata
   */
  getMetadata() {
    throw new Error('getMetadata method must be implemented');
  }

  /**
   * Get step name
   * @returns {string} Step name
   */
  getName() {
    throw new Error('getName method must be implemented');
  }

  /**
   * Get step type
   * @returns {string} Step type
   */
  getType() {
    throw new Error('getType method must be implemented');
  }
}

module.exports = IWorkflowStep;
```

#### IWorkflowValidator.js
```javascript
/**
 * IWorkflowValidator - Interface for workflow validators
 * 
 * This interface defines the contract for workflow validation.
 */
class IWorkflowValidator {
  /**
   * Validate workflow
   * @param {IWorkflow} workflow - Workflow to validate
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Validation result
   */
  async validate(workflow, context) {
    throw new Error('validate method must be implemented');
  }

  /**
   * Add validation rule
   * @param {Object} rule - Validation rule
   */
  addRule(rule) {
    throw new Error('addRule method must be implemented');
  }

  /**
   * Get validation rules
   * @returns {Array} Validation rules
   */
  getRules() {
    throw new Error('getRules method must be implemented');
  }
}

module.exports = IWorkflowValidator;
```

### Step 4: Create Additional Interfaces

#### IStep.js
```javascript
/**
 * IStep - Interface for domain steps
 * 
 * This interface defines the contract that all domain steps must implement.
 */
class IStep {
  /**
   * Execute step
   * @param {Object} context - Step context
   * @returns {Promise<Object>} Step result
   */
  async execute(context) {
    throw new Error('execute method must be implemented');
  }

  /**
   * Get step metadata
   * @returns {Object} Step metadata
   */
  getMetadata() {
    throw new Error('getMetadata method must be implemented');
  }

  /**
   * Get step name
   * @returns {string} Step name
   */
  getName() {
    throw new Error('getName method must be implemented');
  }

  /**
   * Get step type
   * @returns {string} Step type
   */
  getType() {
    throw new Error('getType method must be implemented');
  }
}

module.exports = IStep;
```

#### IFramework.js
```javascript
/**
 * IFramework - Interface for domain frameworks
 * 
 * This interface defines the contract that all domain frameworks must implement.
 */
class IFramework {
  /**
   * Initialize framework
   * @param {Object} config - Framework configuration
   * @returns {Promise<void>} Initialization result
   */
  async initialize(config) {
    throw new Error('initialize method must be implemented');
  }

  /**
   * Get framework metadata
   * @returns {Object} Framework metadata
   */
  getMetadata() {
    throw new Error('getMetadata method must be implemented');
  }

  /**
   * Get framework name
   * @returns {string} Framework name
   */
  getName() {
    throw new Error('getName method must be implemented');
  }

  /**
   * Get framework version
   * @returns {string} Framework version
   */
  getVersion() {
    throw new Error('getVersion method must be implemented');
  }

  /**
   * Get framework type
   * @returns {string} Framework type
   */
  getType() {
    throw new Error('getType method must be implemented');
  }
}

module.exports = IFramework;
```

### Step 5: Update Import References
Update all files that import these interfaces to use the new domain paths:

```javascript
// Old imports (to be updated)
const IHandler = require('../../application/handlers/workflow/interfaces/IHandler');
const IWorkflow = require('../../application/handlers/workflow/interfaces/IWorkflow');

// New imports (correct domain paths)
const IHandler = require('@domain/interfaces/IHandler');
const IWorkflow = require('@domain/interfaces/IWorkflow');
```

## Files to Update
1. `backend/domain/workflows/ComposedWorkflow.js`
2. `backend/domain/workflows/validation/WorkflowValidator.js`
3. `backend/domain/workflows/categories/context/WorkflowContext.js`
4. `backend/domain/steps/wf-stuff/BaseWorkflowStep.js`
5. All workflow handler files in application layer

## Validation Checklist
- [ ] All interface files exist in `backend/domain/interfaces/`
- [ ] All interfaces have consistent structure and documentation
- [ ] All import statements updated to use domain paths
- [ ] No broken imports in the codebase
- [ ] DDD layer separation properly established
- [ ] All interfaces follow naming conventions 