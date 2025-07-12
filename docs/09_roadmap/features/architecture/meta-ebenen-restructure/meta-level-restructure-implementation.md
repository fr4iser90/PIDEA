# JSON-Based Framework Architecture - Content-Library Integration

## 1. Project Overview
- **Feature/Component Name**: JSON-Based Framework System with Content-Library Integration
- **Priority**: High
- **Category**: architecture
- **Estimated Time**: 12 hours (increased from 6 hours to include modular Commands and Handlers)
- **Dependencies**: Existing Content-Library Frameworks, Workflow Infrastructure
- **Related Issues**: Integration of JSON-based frameworks with existing prompts and workflow system

## 2. Technical Requirements
- **Tech Stack**: Node.js, JavaScript, Jest, ESLint
- **Architecture Pattern**: JSON-based Framework Definitions with Content-Library Integration + Modular Commands/Handlers
- **Database Changes**: None (preserve existing)
- **API Changes**: Add Content-Library API endpoints
- **Frontend Changes**: None
- **Backend Changes**: Add framework system that uses existing prompts and workflow infrastructure + modular Commands/Handlers

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

### Files to Create (Modular Commands System):
- 🆕 `backend/application/commands/CommandRegistry.js` - Command management
- 🆕 `backend/application/commands/CommandBuilder.js` - Command builder
- 🆕 `backend/application/commands/index.js` - Export
- 🆕 `backend/application/commands/categories/analysis/` - Analysis commands
- 🆕 `backend/application/commands/categories/generate/` - Generate commands
- 🆕 `backend/application/commands/categories/refactor/` - Refactor commands
- 🆕 `backend/application/commands/categories/management/` - Management commands

### Files to Create (Modular Handlers System):
- 🆕 `backend/application/handlers/HandlerRegistry.js` - Handler management
- 🆕 `backend/application/handlers/HandlerBuilder.js` - Handler builder
- 🆕 `backend/application/handlers/index.js` - Export
- 🆕 `backend/application/handlers/categories/analysis/` - Analysis handlers
- 🆕 `backend/application/handlers/categories/generate/` - Generate handlers
- 🆕 `backend/application/handlers/categories/refactor/` - Refactor handlers
- 🆕 `backend/application/handlers/categories/management/` - Management handlers

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
Due to the expanded approach including modular Commands and Handlers, this task has been expanded to 4 SEQUENTIAL subtasks:

**EXECUTION ORDER:**
1. **Subtask 1**: [meta-level-restructure-phase-1-core-system.md](./meta-level-restructure-phase-1-core-system.md) – Core Framework System (3 hours)
2. **Subtask 2**: [meta-level-restructure-phase-2-integration.md](./meta-level-restructure-phase-2-integration.md) – Integration & APIs (3 hours) - REQUIRES Subtask 1 completion
3. **Subtask 3**: [meta-level-restructure-phase-3-modular-commands.md](./meta-level-restructure-phase-3-modular-commands.md) – Modular Commands System (3 hours) - REQUIRES Subtask 2 completion
4. **Subtask 4**: [meta-level-restructure-phase-4-modular-handlers.md](./meta-level-restructure-phase-4-modular-handlers.md) – Modular Handlers System (3 hours) - REQUIRES Subtask 3 completion

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

### Phase 3: Modular Commands System (3 hours) - SUBTASK 3
- [ ] Create `backend/application/commands/` modular structure
- [ ] Implement `CommandRegistry.js` - Command management
- [ ] Implement `CommandBuilder.js` - Command builder
- [ ] Organize commands into categories (analysis, generate, refactor, management)
- [ ] Create command validation and error handling
- [ ] Integrate with existing CommandBus

### Phase 4: Modular Handlers System (3 hours) - SUBTASK 4
- [ ] Create `backend/application/handlers/` modular structure
- [ ] Implement `HandlerRegistry.js` - Handler management
- [ ] Implement `HandlerBuilder.js` - Handler builder
- [ ] Organize handlers into categories (analysis, generate, refactor, management)
- [ ] Create handler validation and error handling
- [ ] Integrate with existing HandlerBus

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

### Modular Commands Integration:
```javascript
// CommandRegistry verwaltet Commands modular
class CommandRegistry {
  constructor() {
    this.commands = new Map();
    this.categories = new Map();
  }

  register(commandName, commandClass, category = 'default') {
    this.commands.set(commandName, commandClass);
    
    if (!this.categories.has(category)) {
      this.categories.set(category, new Set());
    }
    this.categories.get(category).add(commandName);
  }

  getByCategory(category) {
    return Array.from(this.categories.get(category) || []);
  }
}

// CommandBuilder erstellt Commands mit Validierung
class CommandBuilder {
  constructor(registry) {
    this.registry = registry;
  }

  build(commandName, params = {}) {
    const CommandClass = this.registry.get(commandName);
    
    if (!CommandClass) {
      throw new Error(`Command not found: ${commandName}`);
    }

    const command = new CommandClass(params);
    
    // Validate command
    if (typeof command.validateParams === 'function') {
      command.validateParams(params);
    }

    return command;
  }
}
```

### Modular Handlers Integration:
```javascript
// HandlerRegistry verwaltet Handlers modular
class HandlerRegistry {
  constructor() {
    this.handlers = new Map();
    this.categories = new Map();
  }

  register(handlerName, handlerClass, category = 'default') {
    this.handlers.set(handlerName, handlerClass);
    
    if (!this.categories.has(category)) {
      this.categories.set(category, new Set());
    }
    this.categories.get(category).add(handlerName);
  }

  getByCategory(category) {
    return Array.from(this.categories.get(category) || []);
  }
}

// HandlerBuilder erstellt Handlers mit Validierung
class HandlerBuilder {
  constructor(registry) {
    this.registry = registry;
  }

  build(handlerName, dependencies = {}) {
    const HandlerClass = this.registry.get(handlerName);
    
    if (!HandlerClass) {
      throw new Error(`Handler not found: ${handlerName}`);
    }

    const handler = new HandlerClass(dependencies);
    
    // Validate handler
    if (typeof handler.validateDependencies === 'function') {
      handler.validateDependencies(dependencies);
    }

    return handler;
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
- **Modular Architecture**: Commands and Handlers follow modular patterns with Registry and Builder

## 7. Security Considerations
- [ ] Input validation for JSON framework configurations
- [ ] Prompt content sanitization and validation
- [ ] User authentication and authorization for framework services
- [ ] Rate limiting for framework executions
- [ ] Audit logging for all framework operations
- [ ] Content-Library API security (CORS, authentication)
- [ ] Command and Handler validation and sanitization

## 8. Performance Requirements
- **Response Time**: < 100ms for framework executions
- **Throughput**: 100+ workflows per minute
- **Memory Usage**: < 256MB for framework services (reduced from 512MB)
- **Database Queries**: No additional database queries (uses existing)
- **Caching Strategy**: Prompt caching for 1 hour, framework config caching for 24 hours
- **Command/Handler Performance**: < 50ms for command/handler operations

## 9. Testing Strategy

### Unit Tests:
- [ ] Test file: `tests/unit/domain/frameworks/Framework.test.js`
- [ ] Test file: `tests/unit/domain/frameworks/FrameworkRegistry.test.js`
- [ ] Test file: `tests/unit/infrastructure/external/PromptService.test.js`
- [ ] Test file: `tests/unit/presentation/api/ContentLibraryController.test.js`
- [ ] Test file: `tests/unit/application/commands/CommandRegistry.test.js`
- [ ] Test file: `tests/unit/application/commands/CommandBuilder.test.js`
- [ ] Test file: `tests/unit/application/handlers/HandlerRegistry.test.js`
- [ ] Test file: `tests/unit/application/handlers/HandlerBuilder.test.js`

### Integration Tests:
- [ ] Test file: `tests/integration/domain/framework-integration.test.js`
- [ ] Test scenarios: Framework integration with existing workflow infrastructure
- [ ] Test data: Mock content-library responses
- [ ] Test file: `tests/integration/application/command-handler-integration.test.js`
- [ ] Test scenarios: Command and Handler integration with existing CommandBus

### E2E Tests:
- [ ] Test file: `tests/e2e/framework-execution.test.js`
- [ ] User flows: Framework execution with content-library prompts
- [ ] API testing: Content-Library and Framework endpoints
- [ ] Test file: `tests/e2e/command-handler-execution.test.js`
- [ ] User flows: Command and Handler execution flows

## 10. Documentation Requirements

### Code Documentation:
- [ ] JSDoc comments for all framework methods
- [ ] README for JSON-based framework architecture
- [ ] API documentation for Content-Library and Framework endpoints
- [ ] Architecture diagrams for framework integration
- [ ] JSDoc comments for all command and handler methods
- [ ] README for modular Commands and Handlers architecture
- [ ] API documentation for Command and Handler endpoints

### User Documentation:
- [ ] Framework Configuration Guide
- [ ] Content-Library Integration Guide
- [ ] JSON Schema Documentation
- [ ] Framework Creation Guide
- [ ] Command Creation Guide
- [ ] Handler Creation Guide
- [ ] Modular Architecture Guide

## 11. Deployment Checklist

### Pre-deployment:
- [ ] All tests passing (unit, integration, e2e)
- [ ] JSON configurations validated against schemas
- [ ] Content-Library API endpoints functional
- [ ] Framework integration with existing workflow infrastructure working
- [ ] Command and Handler modular system functional
- [ ] Code review completed and approved
- [ ] Documentation updated and reviewed
- [ ] Security scan passed
- [ ] Performance benchmarks met

### Deployment:
- [ ] Framework services deployed
- [ ] Content-Library API deployed
- [ ] Framework configurations deployed
- [ ] Command and Handler modular system deployed
- [ ] Integration with existing services verified
- [ ] Service restarts if needed
- [ ] Health checks configured

### Post-deployment:
- [ ] Monitor logs for errors
- [ ] Verify framework execution with content-library prompts
- [ ] Verify command and handler execution
- [ ] Performance monitoring active
- [ ] User feedback collection enabled

## 12. Rollback Plan
- [ ] Backup of existing workflow infrastructure before framework addition
- [ ] Rollback script for framework components
- [ ] Content-Library API rollback procedure
- [ ] Command and Handler modular system rollback procedure
- [ ] Communication plan for stakeholders

## 13. Success Criteria

### Overall Success Criteria
- [ ] JSON-based framework system functional
- [ ] Content-Library integration working
- [ ] Modular Commands system functional
- [ ] Modular Handlers system functional
- [ ] All existing functionality maintained
- [ ] Framework execution with prompts working
- [ ] Command and Handler execution working
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

- **Subtask 3**: Modular Commands System (REQUIRES Subtask 2 completion)
  - [ ] CommandRegistry.js implemented with category management
  - [ ] CommandBuilder.js implemented with validation
  - [ ] Commands organized into categories (analysis, generate, refactor, management)
  - [ ] Integration with existing CommandBus working
  - [ ] All command operations tested and functional

- **Subtask 4**: Modular Handlers System (REQUIRES Subtask 3 completion)
  - [ ] HandlerRegistry.js implemented with category management
  - [ ] HandlerBuilder.js implemented with validation
  - [ ] Handlers organized into categories (analysis, generate, refactor, management)
  - [ ] Integration with existing HandlerBus working
  - [ ] All handler operations tested and functional

## 14. Risk Assessment

### Low Risk:
- [ ] Content-Library integration - Mitigation: API-based approach
- [ ] Performance impact - Mitigation: Caching and optimization
- [ ] Command/Handler modularity - Mitigation: Registry and Builder patterns

### Medium Risk:
- [ ] JSON configuration complexity - Mitigation: Schema validation
- [ ] Framework execution errors - Mitigation: Comprehensive error handling
- [ ] Command/Handler integration - Mitigation: Extensive testing

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
    "subtask_2": "meta-level-restructure-phase-2-integration.md",
    "subtask_3": "meta-level-restructure-phase-3-modular-commands.md",
    "subtask_4": "meta-level-restructure-phase-4-modular-handlers.md"
  },
  "dependencies": {
    "subtask_2": ["subtask_1"],
    "subtask_3": ["subtask_2"],
    "subtask_4": ["subtask_3"]
  }
}
```

### Success Indicators:
- [ ] JSON-based framework system created
- [ ] Content-Library integration working
- [ ] Framework execution functional
- [ ] Modular Commands system created
- [ ] Modular Handlers system created
- [ ] Command and Handler execution functional
- [ ] Tests passing
- [ ] No build errors
- [ ] Code follows standards
- [ ] Documentation updated

## 16. References & Resources
- **Technical Documentation**: JSON-Based Framework Architecture Docs
- **API References**: Content-Library API Structure
- **Design Patterns**: Adapter Pattern, Configuration Pattern, Registry Pattern, Builder Pattern
- **Best Practices**: JSON Schema Validation, API Design, Modular Architecture
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

### New Modular Commands System:
```
backend/application/commands/       # 🆕 NEW: Modular commands system
├── CommandRegistry.js             # 🆕 Command management
├── CommandBuilder.js              # 🆕 Command builder
├── index.js                       # 🆕 Export
└── categories/                    # 🆕 Command categories
    ├── analysis/                  # 🆕 Analysis commands
    │   ├── AnalyzeArchitectureCommand.js
    │   ├── AnalyzeCodeQualityCommand.js
    │   ├── AnalyzeDependenciesCommand.js
    │   ├── AnalyzeRepoStructureCommand.js
    │   └── AnalyzeTechStackCommand.js
    ├── generate/                  # 🆕 Generate commands
    │   ├── GenerateConfigsCommand.js
    │   ├── GenerateDocumentationCommand.js
    │   ├── GenerateScriptsCommand.js
    │   └── GenerateTestsCommand.js
    ├── refactor/                  # 🆕 Refactor commands
    │   ├── OrganizeModulesCommand.js
    │   ├── RestructureArchitectureCommand.js
    │   ├── SplitLargeFilesCommand.js
    │   └── CleanDependenciesCommand.js
    └── management/                # 🆕 Management commands
        ├── CreateTaskCommand.js
        ├── ProcessTodoListCommand.js
        ├── SendMessageCommand.js
        └── UpdateTestStatusCommand.js
```

### New Modular Handlers System:
```
backend/application/handlers/       # 🆕 NEW: Modular handlers system
├── HandlerRegistry.js             # 🆕 Handler management
├── HandlerBuilder.js              # 🆕 Handler builder
├── index.js                       # 🆕 Export
└── categories/                    # 🆕 Handler categories
    ├── analysis/                  # 🆕 Analysis handlers
    │   ├── AnalyzeArchitectureHandler.js
    │   ├── AnalyzeCodeQualityHandler.js
    │   ├── AnalyzeDependenciesHandler.js
    │   ├── AnalyzeRepoStructureHandler.js
    │   └── AnalyzeTechStackHandler.js
    ├── generate/                  # 🆕 Generate handlers
    │   ├── GenerateConfigsHandler.js
    │   ├── GenerateDocumentationHandler.js
    │   ├── GenerateScriptsHandler.js
    │   └── GenerateTestsHandler.js
    ├── refactor/                  # 🆕 Refactor handlers
    │   ├── OrganizeModulesHandler.js
    │   ├── RestructureArchitectureHandler.js
    │   ├── SplitLargeFilesHandler.js
    │   └── CleanDependenciesHandler.js
    └── management/                # 🆕 Management handlers
        ├── SendMessageHandler.js
        ├── GetChatHistoryHandler.js
        ├── CreateTaskHandler.js
        └── ProcessTodoListHandler.js
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

// CommandRegistry verwaltet Commands modular
class CommandRegistry {
  register(commandName, commandClass, category = 'default') {
    this.commands.set(commandName, commandClass);
    // Category management
  }
}

// HandlerRegistry verwaltet Handlers modular
class HandlerRegistry {
  register(handlerName, handlerClass, category = 'default') {
    this.handlers.set(handlerName, handlerClass);
    // Category management
  }
}
```

This JSON-Based Framework Architecture creates a lightweight framework system that integrates with existing Content-Library prompts and Workflow Infrastructure, plus modular Commands and Handlers systems! 🚀 