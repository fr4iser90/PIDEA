# Project Startup Workflow – Phase 2: Core Implementation

## Overview
Create the main project startup workflow steps and orchestration, leveraging existing services like IDEAutomationService and WorkflowOrchestrationService.

## Current Status - Last Updated: 2025-10-03T19:40:28.000Z
- **Status**: ❌ BLOCKED - Waiting for Phase 1 completion
- **Dependencies**: BaseWorkflowStep must be created first
- **Services Available**: WorkflowOrchestrationService ✅, IDEAutomationService ✅, TaskService ✅

## Objectives
- [ ] Create `ProjectStartupWorkflow.js` extending BaseWorkflowStep
- [ ] Implement `ProjectDetectionStep.js` using existing IDEAutomationService
- [ ] Implement `IDESetupStep.js` leveraging existing IDEFactory
- [ ] Add `ProjectConfigurationStep.js` using existing analysis patterns
- [ ] Integrate with existing TaskService for project management

## Deliverables
- **File**: `backend/domain/workflows/categories/project/ProjectStartupWorkflow.js` - Main workflow orchestration
- **File**: `backend/domain/steps/categories/project/ProjectDetectionStep.js` - Project detection logic
- **File**: `backend/domain/steps/categories/project/IDESetupStep.js` - IDE setup logic
- **File**: `backend/domain/steps/categories/project/ProjectConfigurationStep.js` - Project configuration
- **Integration**: Update WorkflowOrchestrationService to support project startup workflows

## Dependencies
- Requires: Phase 1 completion (BaseWorkflowStep functional)
- Requires: Existing IDEAutomationService, IDEFactory, TaskService
- Blocks: Phase 3 frontend integration

## Estimated Time
3 hours

## Success Criteria
- [ ] ProjectStartupWorkflow class created and functional
- [ ] All three project steps implemented using existing services
- [ ] WorkflowOrchestrationService supports project startup workflow type
- [ ] Project detection works for Node.js, Python, React, Vue projects
- [ ] IDE setup completes successfully for detected projects

## Technical Implementation

### ProjectStartupWorkflow.js Structure
```javascript
const BaseWorkflowStep = require('../../BaseWorkflowStep');
const StepRegistry = require('../../steps/StepRegistry');

class ProjectStartupWorkflow extends BaseWorkflowStep {
  constructor() {
    super();
    this.name = 'ProjectStartupWorkflow';
    this.description = 'Automated project initialization and IDE setup';
    this.category = 'project';
    this.steps = [
      'project_detection',
      'ide_setup', 
      'project_configuration'
    ];
  }

  async execute(context = {}) {
    // Leverage existing services through StepRegistry
    // Execute steps sequentially with proper error handling
  }
}
```

### ProjectDetectionStep.js Structure
```javascript
const BaseWorkflowStep = require('../../../workflows/BaseWorkflowStep');

class ProjectDetectionStep extends BaseWorkflowStep {
  constructor() {
    super();
    this.name = 'ProjectDetectionStep';
    this.description = 'Detect project type and configuration';
    this.category = 'project';
  }

  async execute(context) {
    // Use existing IDEAutomationService.analyzeProject()
    // Return project type, tech stack, dependencies
  }
}
```

### File Locations
- Workflow: `backend/domain/workflows/categories/project/ProjectStartupWorkflow.js`
- Steps: `backend/domain/steps/categories/project/[StepName].js`
- Controller: `backend/presentation/api/WorkflowController.js` (add endpoints)

### Service Integration Points
1. **IDEAutomationService**: `analyzeProject()` method for project detection
2. **IDEFactory**: `createIDE()` method for IDE setup
3. **TaskService**: Integration for project management
4. **WorkflowOrchestrationService**: Support for 'project_startup' workflow type

### Project Types to Support
- **Node.js**: Package.json detection, npm/yarn dependency management
- **Python**: requirements.txt detection, pip dependency management  
- **React**: JavaScript framework detection, build tool configuration
- **Vue**: Framework-specific detection and setup

## Risk Assessment
- **Medium**: Complex integration with existing services
- **Mitigation**: Follow established patterns from existing workflow implementations
- **Testing**: Test with sample projects of each supported type

## Post-Completion
After this phase:
- Core project startup workflow functionality complete
- Backend services integrated and working
- Ready for frontend integration in Phase 3
