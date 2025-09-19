# Auto-Finish Workflow Migration – Phase 2: Core Workflow Steps Creation

## Overview
Create the six new workflow steps that will replace the auto-finish services. This phase implements the core functionality migration from services to workflow steps, following established patterns and DDD principles.

## Objectives
- [ ] Create fallback_detection_step.js with user input detection logic
- [ ] Create task_sequencing_step.js with dependency management
- [ ] Create context_validation_step.js with response quality validation
- [ ] Create smart_completion_step.js with advanced completion detection
- [ ] Create session_management_step.js with workflow session orchestration
- [ ] Create response_waiting_step.js with AI response monitoring

## Deliverables
- **File**: `backend/domain/steps/categories/completion/fallback_detection_step.js`
- **File**: `backend/domain/steps/categories/completion/task_sequencing_step.js`
- **File**: `backend/domain/steps/categories/completion/context_validation_step.js`
- **File**: `backend/domain/steps/categories/completion/smart_completion_step.js`
- **File**: `backend/domain/steps/categories/completion/session_management_step.js`
- **File**: `backend/domain/steps/categories/completion/response_waiting_step.js`
- **Tests**: Unit tests for all new steps
- **Documentation**: Step usage documentation

## Dependencies
- Requires: Phase 1 completion (Service Analysis & Step Mapping)
- Blocks: Phase 3 start (Existing Steps Enhancement)

## Estimated Time
6 hours

## Success Criteria
- [ ] All 6 new workflow steps created and functional
- [ ] All steps follow established patterns (config, constructor, execute, validation, export)
- [ ] All steps properly integrated with StepRegistry
- [ ] Unit tests created and passing
- [ ] Documentation complete and accurate

## Detailed Tasks

### 1. Fallback Detection Step (1 hour)
- [ ] **File**: `backend/domain/steps/categories/completion/fallback_detection_step.js`
- [ ] **Functionality**:
  - [ ] User input need detection logic
  - [ ] IDE state analysis (dialogs, input focus, errors)
  - [ ] File content pattern analysis
  - [ ] Multi-language keyword detection
  - [ ] Decision making for pause/continue
- [ ] **Pattern Compliance**:
  - [ ] Config object with all metadata
  - [ ] Constructor with proper initialization
  - [ ] Execute method with context validation
  - [ ] Service validation with fallbacks
  - [ ] Proper error handling and logging
  - [ ] Export pattern for StepRegistry

### 2. Task Sequencing Step (1 hour)
- [ ] **File**: `backend/domain/steps/categories/completion/task_sequencing_step.js`
- [ ] **Functionality**:
  - [ ] Dependency graph building
  - [ ] Topological sorting algorithm
  - [ ] Circular dependency detection
  - [ ] Type-based dependencies
  - [ ] Implicit dependency detection
- [ ] **Pattern Compliance**:
  - [ ] Config object with all metadata
  - [ ] Constructor with proper initialization
  - [ ] Execute method with context validation
  - [ ] Service validation with fallbacks
  - [ ] Proper error handling and logging
  - [ ] Export pattern for StepRegistry

### 3. Context Validation Step (1 hour)
- [ ] **File**: `backend/domain/steps/categories/completion/context_validation_step.js`
- [ ] **Functionality**:
  - [ ] Intent matching validation
  - [ ] Context relevance checking
  - [ ] Response appropriateness assessment
  - [ ] Multi-language intent detection
  - [ ] Quality scoring metrics
- [ ] **Pattern Compliance**:
  - [ ] Config object with all metadata
  - [ ] Constructor with proper initialization
  - [ ] Execute method with context validation
  - [ ] Service validation with fallbacks
  - [ ] Proper error handling and logging
  - [ ] Export pattern for StepRegistry

### 4. Smart Completion Step (1 hour)
- [ ] **File**: `backend/domain/steps/categories/completion/smart_completion_step.js`
- [ ] **Functionality**:
  - [ ] Explicit completion detection
  - [ ] Implicit completion detection
  - [ ] Partial completion detection
  - [ ] Semantic completion analysis
  - [ ] Quality assessment integration
- [ ] **Pattern Compliance**:
  - [ ] Config object with all metadata
  - [ ] Constructor with proper initialization
  - [ ] Execute method with context validation
  - [ ] Service validation with fallbacks
  - [ ] Proper error handling and logging
  - [ ] Export pattern for StepRegistry

### 5. Session Management Step (1 hour)
- [ ] **File**: `backend/domain/steps/categories/completion/session_management_step.js`
- [ ] **Functionality**:
  - [ ] Session creation and tracking
  - [ ] Progress streaming functionality
  - [ ] Session timeout management
  - [ ] Concurrent session limits
  - [ ] Session cleanup mechanisms
- [ ] **Pattern Compliance**:
  - [ ] Config object with all metadata
  - [ ] Constructor with proper initialization
  - [ ] Execute method with context validation
  - [ ] Service validation with fallbacks
  - [ ] Proper error handling and logging
  - [ ] Export pattern for StepRegistry

### 6. Response Waiting Step (1 hour)
- [ ] **File**: `backend/domain/steps/categories/completion/response_waiting_step.js`
- [ ] **Functionality**:
  - [ ] AI response monitoring
  - [ ] Response timeout handling
  - [ ] Response quality analysis
  - [ ] Completion status detection
  - [ ] User input need detection
- [ ] **Pattern Compliance**:
  - [ ] Config object with all metadata
  - [ ] Constructor with proper initialization
  - [ ] Execute method with context validation
  - [ ] Service validation with fallbacks
  - [ ] Proper error handling and logging
  - [ ] Export pattern for StepRegistry

## Technical Specifications

### Step Implementation Pattern
```javascript
// Standard Step Pattern
const config = {
  name: 'FallbackDetectionStep',
  type: 'completion',
  category: 'completion',
  description: 'Detect when user input is needed',
  version: '1.0.0',
  dependencies: ['browserManager', 'ideManager', 'eventBus'],
  settings: {
    includeIDEStateCheck: true,
    includeFileContentCheck: true,
    timeout: 30000
  },
  validation: {
    required: ['projectId'],
    optional: ['workspacePath', 'aiResponse']
  }
};

class FallbackDetectionStep {
  constructor() {
    this.name = 'FallbackDetectionStep';
    this.description = 'Detect when user input is needed';
    this.category = 'completion';
    this.version = '1.0.0';
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const stepId = `fallback_detection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      logger.info('Starting FallbackDetectionStep execution', {
        stepId,
        projectId: context.projectId
      });

      // Validate context
      this.validateContext(context);
      
      // Get services via dependency injection
      const services = this.validateServices(context);
      
      // Main logic here...
      
      return {
        success: true,
        stepId,
        projectId,
        message: 'Fallback detection completed',
        data: { /* result data */ }
      };
      
    } catch (error) {
      logger.error('Failed to execute FallbackDetectionStep', {
        stepId,
        projectId: context.projectId,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        stepId,
        projectId: context.projectId,
        timestamp: new Date()
      };
    }
  }
}

// Export pattern
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};

module.exports.FallbackDetectionStep = FallbackDetectionStep;
```

### Service Migration Mapping
```javascript
// Service to Step Migration Examples
const serviceMapping = {
  'FallbackDetection': {
    targetStep: 'fallback_detection_step',
    functionality: [
      'detectUserInputNeed',
      'analyzeIDEState', 
      'analyzeFileContent',
      'makeDecision'
    ],
    dependencies: ['browserManager', 'ideManager'],
    complexity: 'medium'
  },
  'TaskSequencer': {
    targetStep: 'task_sequencing_step',
    functionality: [
      'buildDependencyGraph',
      'topologicalSort',
      'detectCircularDependencies',
      'sequenceTasks'
    ],
    dependencies: ['TaskRepository'],
    complexity: 'high'
  }
};
```

## Testing Strategy

### Unit Tests
- [ ] **Test File**: `tests/unit/steps/completion/fallback_detection_step.test.js`
  - [ ] Test user input detection logic
  - [ ] Test IDE state analysis
  - [ ] Test file content pattern analysis
  - [ ] Test multi-language keyword detection
  - [ ] Test decision making for pause/continue
- [ ] **Test File**: `tests/unit/steps/completion/task_sequencing_step.test.js`
  - [ ] Test dependency graph building
  - [ ] Test topological sorting algorithm
  - [ ] Test circular dependency detection
  - [ ] Test type-based dependencies
  - [ ] Test implicit dependency detection
- [ ] **Test File**: `tests/unit/steps/completion/context_validation_step.test.js`
  - [ ] Test intent matching validation
  - [ ] Test context relevance checking
  - [ ] Test response appropriateness assessment
  - [ ] Test multi-language intent detection
  - [ ] Test quality scoring metrics
- [ ] **Test File**: `tests/unit/steps/completion/smart_completion_step.test.js`
  - [ ] Test explicit completion detection
  - [ ] Test implicit completion detection
  - [ ] Test partial completion detection
  - [ ] Test semantic completion analysis
  - [ ] Test quality assessment integration
- [ ] **Test File**: `tests/unit/steps/completion/session_management_step.test.js`
  - [ ] Test session creation and tracking
  - [ ] Test progress streaming functionality
  - [ ] Test session timeout management
  - [ ] Test concurrent session limits
  - [ ] Test session cleanup mechanisms
- [ ] **Test File**: `tests/unit/steps/completion/response_waiting_step.test.js`
  - [ ] Test AI response monitoring
  - [ ] Test response timeout handling
  - [ ] Test response quality analysis
  - [ ] Test completion status detection
  - [ ] Test user input need detection

## Risk Assessment
- **Medium Risk**: Complex step creation and integration
- **Mitigation**: Follow established patterns, comprehensive testing
- **Fallback**: Incremental implementation with rollback capability

## Deliverables Checklist
- [ ] fallback_detection_step.js created and functional
- [ ] task_sequencing_step.js created and functional
- [ ] context_validation_step.js created and functional
- [ ] smart_completion_step.js created and functional
- [ ] session_management_step.js created and functional
- [ ] response_waiting_step.js created and functional
- [ ] All unit tests created and passing
- [ ] StepRegistry integration verified
- [ ] Documentation complete
- [ ] Phase 2 completion report

## Next Phase Preparation
- [ ] Validate all new steps in StepRegistry
- [ ] Test step execution and error handling
- [ ] Prepare existing step enhancement plan
- [ ] Set up integration testing framework
- [ ] Create Phase 3 task breakdown 