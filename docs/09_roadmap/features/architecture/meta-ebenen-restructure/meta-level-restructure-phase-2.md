# Phase 2: Framework & Steps Integration Overview

## Objective
Create Framework and Step components as separate entities within the existing DDD domain layer.

## Duration: 6 hours (split into 2A and 2B)

## Concrete Tasks

### Phase 2A: Core Frameworks (3 hours)
- [ ] Create `backend/domain/frameworks/` directory
- [ ] Implement `AnalysisFramework.js` - Level 2 analysis
- [ ] Implement `RefactoringFramework.js` - Level 2 refactoring
- [ ] Implement `TestingFramework.js` - Level 2 testing
- [ ] Create basic framework integration

### Phase 2B: Advanced Frameworks (3 hours)
- [ ] Implement `DeploymentFramework.js` - Level 2 deployment
- [ ] Implement `FrameworkRegistry.js` - Level 2 registry
- [ ] Add advanced framework capabilities
- [ ] Validate framework integration

## Concrete Implementation

### 1. Framework Structure
```javascript
// backend/domain/frameworks/AnalysisFramework.js
/**
 * AnalysisFramework - Level 2: Analysis Strategy
 * Provides analysis capabilities using existing DDD services
 */
const { TaskService } = require('@/domain/services/TaskService');
const { WorkflowOrchestrationService } = require('@/domain/services/WorkflowOrchestrationService');

class AnalysisFramework {
  constructor(dependencies = {}) {
    this.taskService = dependencies.taskService || new TaskService();
    this.workflowService = dependencies.workflowService || new WorkflowOrchestrationService();
  }

  async analyze(context) {
    // Use existing DDD services for core operations
    const task = await this.taskService.createTask({
      projectId: context.projectId,
      title: `Analysis: ${context.type}`,
      description: context.description,
      type: 'analysis',
      priority: context.priority || 'medium'
    });

    // Execute analysis workflow
    const result = await this.workflowService.executeWorkflow(task, {
      framework: 'analysis',
      context
    });

    return {
      success: true,
      taskId: task.id,
      result
    };
  }
}
```

### 2. Step Structure
```javascript
// backend/domain/steps/AnalysisSteps/check_container_status.js
/**
 * check_container_status - Level 0: Container Status Check
 * Implements container status checking functionality
 */
class CheckContainerStatus {
  constructor(dependencies = {}) {
    this.logger = dependencies.logger || console;
  }

  async execute(context) {
    // Use existing DDD services for core operations
    return await this.checkContainer(context);
  }

  async checkContainer(context) {
    // This would integrate with existing DDD container services
    return {
      status: 'running',
      health: 'healthy',
      uptime: 3600
    };
  }
}
```

### 3. Integration Points
```javascript
// Framework using existing DDD services
class TestingFramework {
  constructor(dependencies = {}) {
    this.taskService = dependencies.taskService || new TaskService();
    this.workflowService = dependencies.workflowService || new WorkflowOrchestrationService();
  }

  async test(context) {
    // Use existing DDD project analysis logic
    const task = await this.taskService.createTask({
      projectId: context.projectId,
      title: `Testing: ${context.type}`,
      description: context.description,
      type: 'testing',
      priority: context.priority || 'medium'
    });

    // Execute testing workflow
    const result = await this.workflowService.executeWorkflow(task, {
      framework: 'testing',
      context
    });

    return {
      success: true,
      taskId: task.id,
      result
    };
  }
}
```

## Architecture Overview

### DDD with Framework & Steps Integration
```
backend/
├── domain/                    # ✅ PRESERVED DOMAIN LAYER
│   ├── entities/             # ✅ Task (600+ lines) - UNCHANGED
│   ├── value-objects/        # ✅ TaskStatus, TaskPriority, TaskType - UNCHANGED
│   ├── repositories/         # ✅ Repository interfaces - UNCHANGED
│   ├── services/             # ✅ EXISTING SERVICES - UNCHANGED
│   │   ├── TaskService.js           # ✅ EXISTING (UNCHANGED)
│   │   ├── WorkflowOrchestrationService.js  # ✅ EXISTING (UNCHANGED)
│   │   ├── TaskExecutionService.js   # ✅ EXISTING (UNCHANGED)
│   │   ├── CursorIDEService.js       # ✅ EXISTING (UNCHANGED)
│   │   └── VSCodeIDEService.js       # ✅ EXISTING (UNCHANGED)
│   ├── workflows/            # 🆕 NEW WORKFLOWS DIRECTORY
│   │   ├── WorkflowRegistry.js       # 🆕 Haupt-Registry
│   │   ├── WorkflowBuilder.js        # 🆕 Haupt-Builder
│   │   ├── categories/               # 🆕 KATEGORIEN-ORDNER
│   │   │   ├── analysis/             # 🆕 Analysis Kategorie
│   │   │   ├── testing/              # 🆕 Testing Kategorie
│   │   │   └── refactoring/          # 🆕 Refactoring Kategorie
│   │   └── index.js                  # 🆕 Export
│   ├── frameworks/            # 🆕 NEW FRAMEWORKS DIRECTORY
│   │   ├── FrameworkRegistry.js      # 🆕 Haupt-Registry
│   │   ├── FrameworkBuilder.js       # 🆕 Haupt-Builder
│   │   ├── categories/               # 🆕 KATEGORIEN-ORDNER
│   │   │   ├── analysis/             # 🆕 Analysis Kategorie
│   │   │   ├── testing/              # 🆕 Testing Kategorie
│   │   │   ├── refactoring/          # 🆕 Refactoring Kategorie
│   │   │   └── deployment/           # 🆕 Deployment Kategorie
│   │   └── index.js                  # 🆕 Export
│   └── steps/                 # 🆕 NEW STEPS DIRECTORY
│       ├── StepRegistry.js           # 🆕 Haupt-Registry
│       ├── StepBuilder.js            # 🆕 Haupt-Builder
│       ├── categories/               # 🆕 KATEGORIEN-ORDNER
│       │   ├── analysis/             # 🆕 Analysis Kategorie
│       │   ├── testing/              # 🆕 Testing Kategorie
│       │   └── refactoring/          # 🆕 Refactoring Kategorie
│       └── index.js                  # 🆕 Export
├── application/              # ✅ APPLICATION LAYER - UNCHANGED
└── infrastructure/           # ✅ INFRASTRUCTURE LAYER - UNCHANGED
```

### Key Principles
- **DDD Preservation**: All existing DDD services remain unchanged
- **Framework Addition**: New frameworks as separate components
- **Workflow Addition**: New workflows as separate components
- **Steps Addition**: New steps as separate components
- **Integration**: Framework components use workflows, workflows use steps, all use existing DDD services
- **Clear Separation**: Maintain boundaries between existing and new components
- **Hierarchical Structure**: Level 0-2 organization within DDD domain layer

## Success Criteria
- [ ] Framework components created as separate entities
- [ ] Workflow components created as separate entities
- [ ] Step components created as separate entities
- [ ] All existing DDD services preserved and unchanged
- [ ] Framework components integrate with workflows
- [ ] Workflow components integrate with steps
- [ ] Step components integrate with existing DDD services
- [ ] Clear separation between existing and new components
- [ ] Hierarchical structure maintained
- [ ] All tests passing

## Next Phase
Phase 2A: Core Frameworks 