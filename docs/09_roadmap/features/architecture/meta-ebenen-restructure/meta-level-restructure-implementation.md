# JSON-Based Framework Architecture - Content-Library Integration

## 1. Project Overview
- **Feature/Component Name**: JSON-Based Framework System with Content-Library Integration
- **Priority**: High
- **Category**: architecture
- **Estimated Time**: 6 hours (reduced from 16 hours)
- **Dependencies**: Existing Content-Library Frameworks, Workflow Infrastructure
- **Related Issues**: Integration of JSON-based frameworks with existing prompts and workflow system

## 2. Technical Requirements
- **Tech Stack**: Node.js, JavaScript, Jest, ESLint
- **Architecture Pattern**: JSON-based Framework Definitions with Content-Library Integration
- **Database Changes**: None (preserve existing)
- **API Changes**: Add Content-Library API endpoints
- **Frontend Changes**: None
- **Backend Changes**: Add framework system that uses existing prompts and workflow infrastructure

## 3. File Impact Analysis

### Files to Create (Core Framework System):
- ✅ `backend/domain/frameworks/FrameworkRegistry.js` - Framework management
- ✅ `backend/domain/frameworks/Framework.js` - Base framework class
- ✅ `backend/domain/frameworks/FrameworkBuilder.js` - Framework builder
- ✅ `backend/domain/frameworks/index.js` - Export
- ✅ `backend/infrastructure/external/PromptService.js` - Content-Library API integration

### Files to Create (Framework Configurations):
- ✅ `backend/domain/frameworks/configs/documentation-framework.json` - Documentation framework config
- ✅ `backend/domain/frameworks/configs/ai-framework.json` - AI framework config
- ✅ `backend/domain/frameworks/configs/react-framework.json` - React framework config
- ✅ `backend/domain/frameworks/configs/vue-framework.json` - Vue framework config
- ✅ `backend/domain/frameworks/configs/ios-framework.json` - iOS framework config
- ✅ `backend/domain/frameworks/configs/android-framework.json` - Android framework config

### Files to Create (API Endpoints):
- ✅ `backend/presentation/api/ContentLibraryController.js` - Content-Library API
- ✅ `backend/presentation/api/FrameworkController.js` - Framework API

### Files to Preserve (Existing Infrastructure):
- ✅ `content-library/frameworks/` - ALL EXISTING PROMPTS PRESERVED
- ✅ `backend/domain/workflows/` - ALL EXISTING WORKFLOW INFRASTRUCTURE
- ✅ `backend/domain/services/` - ALL EXISTING DDD SERVICES
- ✅ `backend/domain/entities/` - ALL EXISTING ENTITIES
- ✅ `backend/domain/value-objects/` - ALL EXISTING VALUE OBJECTS

## 4. Implementation Phases

### 📋 Task Splitting Recommendations
Due to the streamlined approach, this task has been reduced to 2 SEQUENTIAL subtasks:

**EXECUTION ORDER:**
1. **Subtask 1**: [meta-level-restructure-phase-1-core-system.md](./meta-level-restructure-phase-1-core-system.md) – Core Framework System (3 hours)
2. **Subtask 2**: [meta-level-restructure-phase-2-integration.md](./meta-level-restructure-phase-2-integration.md) – Integration & APIs (3 hours) - REQUIRES Subtask 1 completion

**NO PARALLEL EXECUTION - SEQUENTIAL ONLY**

### Phase 1: Core Framework System (3 hours) - SUBTASK 1
- [ ] Create `backend/domain/frameworks/` directory structure
- [ ] Implement `FrameworkRegistry.js` - Framework management
- [ ] Implement `Framework.js` - Base framework class
- [ ] Implement `FrameworkBuilder.js` - Framework builder
- [ ] Implement `PromptService.js` - Content-Library integration
- [ ] Create JSON configuration files for existing frameworks

### Phase 2: Integration & APIs (3 hours) - SUBTASK 2
- [ ] Implement `ContentLibraryController.js` - API for prompts
- [ ] Implement `FrameworkController.js` - API for frameworks
- [ ] Integrate with existing `WorkflowOrchestrationService`
- [ ] Create framework execution endpoints
- [ ] Add comprehensive testing

## 5. Architecture Design

### JSON-Based Framework Configuration:
```json
{
  "name": "DocumentationFramework",
  "version": "1.0.0",
  "description": "Documentation analysis and creation framework",
  "workflows": {
    "analyze": {
      "steps": [
        {
          "type": "analysis",
          "prompt": "documentation-framework/doc-analyze.md",
          "context": ["projectPath", "options"]
        }
      ]
    },
    "execute": {
      "steps": [
        {
          "type": "execution", 
          "prompt": "documentation-framework/doc-execute.md",
          "context": ["analysis", "task"]
        }
      ]
    }
  },
  "prompts": {
    "analyze": "documentation-framework/doc-analyze.md",
    "execute": "documentation-framework/doc-execute.md"
  }
}
```

### Framework Integration with Existing Infrastructure:
```javascript
// Framework nutzt bestehende Workflow Infrastructure
class Framework {
  constructor(config, promptService) {
    this.config = config;
    this.promptService = promptService;
    this.workflowService = new WorkflowOrchestrationService(); // EXISTING
  }

  async executeWorkflow(workflowName, context) {
    const workflowConfig = this.config.workflows[workflowName];
    
    // Nutze bestehenden WorkflowBuilder
    const workflow = new WorkflowBuilder() // EXISTING
      .setMetadata({
        name: `${this.config.name}-${workflowName}`,
        framework: this.config.name
      });

    // Lade Prompts aus Content-Library
    for (const stepConfig of workflowConfig.steps) {
      const prompt = await this.promptService.get(stepConfig.prompt);
      workflow.addStep(
        WorkflowStepBuilder[stepConfig.type]({ // EXISTING
          prompt,
          context: stepConfig.context
        }).build()
      );
    }

    // Nutze bestehenden WorkflowOrchestrationService
    return await this.workflowService.executeWorkflow(workflow.build());
  }
}
```

### Content-Library API Integration:
```javascript
// PromptService lädt Prompts aus Content-Library
class PromptService {
  constructor(basePath = '/content-library') {
    this.basePath = basePath;
  }

  async get(promptPath) {
    // Lädt Prompts aus content-library über API
    const response = await fetch(`${this.basePath}/${promptPath}`);
    return await response.text();
  }

  async listFrameworks() {
    // Listet alle verfügbaren Frameworks
    const response = await fetch(`${this.basePath}/frameworks`);
    return await response.json();
  }
}
```

## 6. Code Standards & Patterns
- **Coding Style**: ESLint with existing rules, Prettier Formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for folders
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston Logger with structured logging, various levels for operations
- **Testing**: Jest Framework, 90% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates
- **JSON Schema**: Validate framework configurations with JSON schemas
- **DDD Compliance**: Framework components follow DDD patterns while integrating with existing services

## 7. Security Considerations
- [ ] Input validation for JSON framework configurations
- [ ] Prompt content sanitization and validation
- [ ] User authentication and authorization for framework services
- [ ] Rate limiting for framework executions
- [ ] Audit logging for all framework operations
- [ ] Content-Library API security (CORS, authentication)

## 8. Performance Requirements
- **Response Time**: < 100ms for framework executions
- **Throughput**: 100+ workflows per minute
- **Memory Usage**: < 256MB for framework services (reduced from 512MB)
- **Database Queries**: No additional database queries (uses existing)
- **Caching Strategy**: Prompt caching for 1 hour, framework config caching for 24 hours

## 9. Testing Strategy

### Unit Tests:
- [ ] Test file: `tests/unit/domain/frameworks/Framework.test.js`
- [ ] Test file: `tests/unit/domain/frameworks/FrameworkRegistry.test.js`
- [ ] Test file: `tests/unit/infrastructure/external/PromptService.test.js`
- [ ] Test file: `tests/unit/presentation/api/ContentLibraryController.test.js`

### Integration Tests:
- [ ] Test file: `tests/integration/domain/framework-integration.test.js`
- [ ] Test scenarios: Framework integration with existing workflow infrastructure
- [ ] Test data: Mock content-library responses

### E2E Tests:
- [ ] Test file: `tests/e2e/framework-execution.test.js`
- [ ] User flows: Framework execution with content-library prompts
- [ ] API testing: Content-Library and Framework endpoints

## 10. Documentation Requirements

### Code Documentation:
- [ ] JSDoc comments for all framework methods
- [ ] README for JSON-based framework architecture
- [ ] API documentation for Content-Library and Framework endpoints
- [ ] Architecture diagrams for framework integration

### User Documentation:
- [ ] Framework Configuration Guide
- [ ] Content-Library Integration Guide
- [ ] JSON Schema Documentation
- [ ] Framework Creation Guide

## 11. Deployment Checklist

### Pre-deployment:
- [ ] All tests passing (unit, integration, e2e)
- [ ] JSON configurations validated against schemas
- [ ] Content-Library API endpoints functional
- [ ] Framework integration with existing workflow infrastructure working
- [ ] Code review completed and approved
- [ ] Documentation updated and reviewed
- [ ] Security scan passed
- [ ] Performance benchmarks met

### Deployment:
- [ ] Framework services deployed
- [ ] Content-Library API deployed
- [ ] Framework configurations deployed
- [ ] Integration with existing services verified
- [ ] Service restarts if needed
- [ ] Health checks configured

### Post-deployment:
- [ ] Monitor logs for errors
- [ ] Verify framework execution with content-library prompts
- [ ] Performance monitoring active
- [ ] User feedback collection enabled

## 12. Rollback Plan
- [ ] Backup of existing workflow infrastructure before framework addition
- [ ] Rollback script for framework components
- [ ] Content-Library API rollback procedure
- [ ] Communication plan for stakeholders

## 13. Success Criteria

### Overall Success Criteria
- [ ] JSON-based framework system functional
- [ ] Content-Library integration working
- [ ] All existing functionality maintained
- [ ] Framework execution with prompts working
- [ ] Performance requirements met
- [ ] Security requirements met
- [ ] Documentation complete and accurate
- [ ] User acceptance testing passed

### Subtask Success Criteria (SEQUENTIAL EXECUTION)
- **Subtask 1**: Core Framework System (MUST COMPLETE FIRST)
  - [ ] FrameworkRegistry.js implemented with JSON config support
  - [ ] Framework.js implemented with workflow integration
  - [ ] PromptService.js implemented with content-library integration
  - [ ] All JSON configuration files created and validated

- **Subtask 2**: Integration & APIs (REQUIRES Subtask 1 completion)
  - [ ] ContentLibraryController.js implemented with API endpoints
  - [ ] FrameworkController.js implemented with execution endpoints
  - [ ] Integration with existing WorkflowOrchestrationService working
  - [ ] All API endpoints tested and functional

## 14. Risk Assessment

### Low Risk:
- [ ] Content-Library integration - Mitigation: API-based approach
- [ ] Performance impact - Mitigation: Caching and optimization

### Medium Risk:
- [ ] JSON configuration complexity - Mitigation: Schema validation
- [ ] Framework execution errors - Mitigation: Comprehensive error handling

### High Risk:
- [ ] Breaking existing functionality - Mitigation: Extensive testing and rollback plan

## 15. AI Auto-Implementation Instructions

### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/features/architecture/meta-ebenen-restructure/meta-level-restructure-implementation.md'
- **category**: 'architecture'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: true

### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/json-framework-architecture",
  "confirmation_keywords": ["done", "complete", "finished"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 300,
  "execution_order": "SEQUENTIAL_ONLY",
  "subtask_execution": {
    "subtask_1": "meta-level-restructure-phase-1-core-system.md",
    "subtask_2": "meta-level-restructure-phase-2-integration.md"
  },
  "dependencies": {
    "subtask_2": ["subtask_1"]
  }
}
```

### Success Indicators:
- [ ] JSON-based framework system created
- [ ] Content-Library integration working
- [ ] Framework execution functional
- [ ] Tests passing
- [ ] No build errors
- [ ] Code follows standards
- [ ] Documentation updated

## 16. References & Resources
- **Technical Documentation**: JSON-Based Framework Architecture Docs
- **API References**: Content-Library API Structure
- **Design Patterns**: Adapter Pattern, Configuration Pattern
- **Best Practices**: JSON Schema Validation, API Design
- **Similar Implementations**: Existing Content-Library Frameworks

---

## JSON-Based Framework Architecture

### Preserved Infrastructure:
```
content-library/frameworks/          # ✅ PRESERVED: All existing prompts
├── documentation-framework/         # ✅ doc-analyze.md, doc-execute.md
├── ai-framework/                   # ✅ ai-ml-integration.md
├── react-framework/               # ✅ Technology-specific prompts
├── vue-framework/                 # ✅ Technology-specific prompts
├── ios-framework/                 # ✅ Technology-specific prompts
└── android-framework/             # ✅ Technology-specific prompts

backend/domain/workflows/           # ✅ PRESERVED: All existing workflow infrastructure
├── WorkflowBuilder.js             # ✅ EXISTING
├── WorkflowRegistry.js            # ✅ EXISTING
├── StepRegistry.js                # ✅ EXISTING
└── execution/                     # ✅ EXISTING

backend/domain/services/           # ✅ PRESERVED: All existing DDD services
├── TaskService.js                 # ✅ EXISTING
├── WorkflowOrchestrationService.js # ✅ EXISTING
└── TaskExecutionService.js        # ✅ EXISTING
```

### New Framework System:
```
backend/domain/frameworks/          # 🆕 NEW: JSON-based framework system
├── FrameworkRegistry.js           # 🆕 Framework management
├── Framework.js                   # 🆕 Base framework class
├── FrameworkBuilder.js            # 🆕 Framework builder
├── index.js                       # 🆕 Export
└── configs/                       # 🆕 JSON configurations
    ├── documentation-framework.json
    ├── ai-framework.json
    ├── react-framework.json
    ├── vue-framework.json
    ├── ios-framework.json
    └── android-framework.json

backend/infrastructure/external/   # 🆕 NEW: Content-Library integration
└── PromptService.js               # 🆕 API for content-library prompts

backend/presentation/api/          # 🆕 NEW: API endpoints
├── ContentLibraryController.js    # 🆕 Content-Library API
└── FrameworkController.js         # 🆕 Framework API
```

### Integration Points:
```javascript
// Framework nutzt bestehende Workflow Infrastructure
class Framework {
  constructor(config, promptService) {
    this.config = config;
    this.promptService = promptService;
    this.workflowService = new WorkflowOrchestrationService(); // EXISTING
  }

  async executeWorkflow(workflowName, context) {
    const workflowConfig = this.config.workflows[workflowName];
    
    // Nutze bestehenden WorkflowBuilder
    const workflow = new WorkflowBuilder() // EXISTING
      .setMetadata({
        name: `${this.config.name}-${workflowName}`,
        framework: this.config.name
      });

    // Lade Prompts aus Content-Library
    for (const stepConfig of workflowConfig.steps) {
      const prompt = await this.promptService.get(stepConfig.prompt);
      workflow.addStep(
        WorkflowStepBuilder[stepConfig.type]({ // EXISTING
          prompt,
          context: stepConfig.context
        }).build()
      );
    }

    // Nutze bestehenden WorkflowOrchestrationService
    return await this.workflowService.executeWorkflow(workflow.build());
  }
}

// PromptService lädt Prompts aus Content-Library
class PromptService {
  async get(promptPath) {
    // Lädt Prompts aus content-library über API
    const response = await fetch(`/content-library/${promptPath}`);
    return await response.text();
  }
}
```

This JSON-Based Framework Architecture creates a lightweight framework system that integrates with existing Content-Library prompts and Workflow Infrastructure! 🚀 