# DDD Domain Layer Structure - Frameworks & Steps Integration

## 🎯 **Overview**

This implementation **integrates** Frameworks and Steps as **separate directories** within the existing DDD domain layer:

- **DDD Preservation**: Existing Domain Services remain unchanged
- **Frameworks Directory**: New frameworks in `backend/domain/frameworks/`
- **Steps Directory**: New steps in `backend/domain/steps/`
- **Commands Directory**: Modular commands in `backend/application/commands/`
- **Handlers Directory**: Modular handlers in `backend/application/handlers/`
- **Clear Separation**: Clear separation between existing DDD and new components
- **No Service Enhancement**: Existing services stay untouched, new components are separate

## 📊 **Current vs. New Structure**

### ✅ **Current DDD Structure (PRESERVED)**
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
│   │   │   │   ├── CodeQualityWorkflow.js
│   │   │   │   ├── ArchitectureWorkflow.js
│   │   │   │   └── SecurityWorkflow.js
│   │   │   ├── testing/              # 🆕 Testing Kategorie
│   │   │   │   ├── UnitTestWorkflow.js
│   │   │   │   ├── IntegrationTestWorkflow.js
│   │   │   │   └── E2ETestWorkflow.js
│   │   │   └── refactoring/          # 🆕 Refactoring Kategorie
│   │   │       ├── CodeRefactoringWorkflow.js
│   │   │       └── StructureRefactoringWorkflow.js
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
├── application/              # 🆕 MODULAR APPLICATION LAYER
│   ├── commands/             # 🆕 MODULAR COMMANDS DIRECTORY
│   │   ├── CommandRegistry.js        # 🆕 Haupt-Registry
│   │   ├── CommandBuilder.js         # 🆕 Haupt-Builder
│   │   ├── categories/               # 🆕 KATEGORIEN-ORDNER
│   │   │   ├── analysis/             # 🆕 Analysis Kategorie
│   │   │   │   ├── AnalyzeArchitectureCommand.js
│   │   │   │   ├── AnalyzeCodeQualityCommand.js
│   │   │   │   ├── AnalyzeDependenciesCommand.js
│   │   │   │   ├── AnalyzeRepoStructureCommand.js
│   │   │   │   └── AnalyzeTechStackCommand.js
│   │   │   ├── generate/             # 🆕 Generate Kategorie
│   │   │   │   ├── GenerateConfigsCommand.js
│   │   │   │   ├── GenerateDocumentationCommand.js
│   │   │   │   ├── GenerateScriptsCommand.js
│   │   │   │   └── GenerateTestsCommand.js
│   │   │   ├── refactor/             # 🆕 Refactor Kategorie
│   │   │   │   ├── OrganizeModulesCommand.js
│   │   │   │   ├── RestructureArchitectureCommand.js
│   │   │   │   ├── SplitLargeFilesCommand.js
│   │   │   │   └── CleanDependenciesCommand.js
│   │   │   └── management/           # 🆕 Management Kategorie
│   │   │       ├── CreateTaskCommand.js
│   │   │       ├── ProcessTodoListCommand.js
│   │   │       ├── SendMessageCommand.js
│   │   │       └── UpdateTestStatusCommand.js
│   │   └── index.js                  # 🆕 Export
│   └── handlers/             # 🆕 MODULAR HANDLERS DIRECTORY
│       ├── HandlerRegistry.js        # 🆕 Haupt-Registry
│       ├── HandlerBuilder.js         # 🆕 Haupt-Builder
│       ├── categories/               # 🆕 KATEGORIEN-ORDNER
│       │   ├── analysis/             # 🆕 Analysis Kategorie
│       │   │   ├── AnalyzeArchitectureHandler.js
│       │   │   ├── AnalyzeCodeQualityHandler.js
│       │   │   ├── AnalyzeDependenciesHandler.js
│       │   │   ├── AnalyzeRepoStructureHandler.js
│       │   │   └── AnalyzeTechStackHandler.js
│       │   ├── generate/             # 🆕 Generate Kategorie
│       │   │   ├── GenerateConfigsHandler.js
│       │   │   ├── GenerateDocumentationHandler.js
│       │   │   ├── GenerateScriptsHandler.js
│       │   │   └── GenerateTestsHandler.js
│       │   ├── refactor/             # 🆕 Refactor Kategorie
│       │   │   ├── OrganizeModulesHandler.js
│       │   │   ├── RestructureArchitectureHandler.js
│       │   │   ├── SplitLargeFilesHandler.js
│       │   │   └── CleanDependenciesHandler.js
│       │   └── management/           # 🆕 Management Kategorie
│       │       ├── SendMessageHandler.js
│       │       ├── GetChatHistoryHandler.js
│       │       ├── CreateTaskHandler.js
│       │       └── ProcessTodoListHandler.js
│       └── index.js                  # 🆕 Export
└── infrastructure/           # ✅ INFRASTRUCTURE LAYER - UNCHANGED
```

### 🆕 **Commands Structure (MODULAR)**
```
backend/application/commands/
├── CommandRegistry.js        # 🆕 Haupt-Registry
├── CommandBuilder.js         # 🆕 Haupt-Builder
├── categories/               # 🆕 KATEGORIEN-ORDNER
│   ├── analysis/             # 🆕 Analysis Kategorie
│   │   ├── AnalyzeArchitectureCommand.js
│   │   ├── AnalyzeCodeQualityCommand.js
│   │   ├── AnalyzeDependenciesCommand.js
│   │   ├── AnalyzeRepoStructureCommand.js
│   │   └── AnalyzeTechStackCommand.js
│   ├── generate/             # 🆕 Generate Kategorie
│   │   ├── GenerateConfigsCommand.js
│   │   ├── GenerateDocumentationCommand.js
│   │   ├── GenerateScriptsCommand.js
│   │   └── GenerateTestsCommand.js
│   ├── refactor/             # 🆕 Refactor Kategorie
│   │   ├── OrganizeModulesCommand.js
│   │   ├── RestructureArchitectureCommand.js
│   │   ├── SplitLargeFilesCommand.js
│   │   └── CleanDependenciesCommand.js
│   └── management/           # 🆕 Management Kategorie
│       ├── CreateTaskCommand.js
│       ├── ProcessTodoListCommand.js
│       ├── SendMessageCommand.js
│       └── UpdateTestStatusCommand.js
└── index.js                  # 🆕 Export
```

### 🆕 **Handlers Structure (MODULAR)**
```
backend/application/handlers/
├── HandlerRegistry.js        # 🆕 Haupt-Registry
├── HandlerBuilder.js         # 🆕 Haupt-Builder
├── categories/               # 🆕 KATEGORIEN-ORDNER
│   ├── analysis/             # 🆕 Analysis Kategorie
│   │   ├── AnalyzeArchitectureHandler.js
│   │   ├── AnalyzeCodeQualityHandler.js
│   │   ├── AnalyzeDependenciesHandler.js
│   │   ├── AnalyzeRepoStructureHandler.js
│   │   └── AnalyzeTechStackHandler.js
│   ├── generate/             # 🆕 Generate Kategorie
│   │   ├── GenerateConfigsHandler.js
│   │   ├── GenerateDocumentationHandler.js
│   │   ├── GenerateScriptsHandler.js
│   │   └── GenerateTestsHandler.js
│   ├── refactor/             # 🆕 Refactor Kategorie
│   │   ├── OrganizeModulesHandler.js
│   │   ├── RestructureArchitectureHandler.js
│   │   ├── SplitLargeFilesHandler.js
│   │   └── CleanDependenciesHandler.js
│   └── management/           # 🆕 Management Kategorie
│       ├── SendMessageHandler.js
│       ├── GetChatHistoryHandler.js
│       ├── CreateTaskHandler.js
│       └── ProcessTodoListHandler.js
└── index.js                  # 🆕 Export
```

### 🆕 **Frameworks Structure**
```
backend/domain/frameworks/
├── FrameworkRegistry.js      # 🆕 Haupt-Registry
├── FrameworkBuilder.js       # 🆕 Haupt-Builder
├── categories/               # 🆕 KATEGORIEN-ORDNER
│   ├── analysis/             # 🆕 Analysis Kategorie
│   │   ├── CodeQualityFramework.js
│   │   ├── ArchitectureFramework.js
│   │   ├── SecurityFramework.js
│   │   └── PerformanceFramework.js
│   ├── testing/              # 🆕 Testing Kategorie
│   │   ├── UnitTestFramework.js
│   │   ├── IntegrationTestFramework.js
│   │   ├── E2ETestFramework.js
│   │   └── PerformanceTestFramework.js
│   ├── refactoring/          # 🆕 Refactoring Kategorie
│   │   ├── CodeRefactoringFramework.js
│   │   ├── StructureRefactoringFramework.js
│   │   └── DependencyRefactoringFramework.js
│   └── deployment/           # 🆕 Deployment Kategorie
│       ├── DockerFramework.js
│       ├── KubernetesFramework.js
│       └── ServerlessFramework.js
└── index.js                  # 🆕 Export
```

### 🆕 **Workflows Structure**
```
backend/domain/workflows/
├── WorkflowRegistry.js       # 🆕 Haupt-Registry
├── WorkflowBuilder.js        # 🆕 Haupt-Builder
├── categories/               # 🆕 KATEGORIEN-ORDNER
│   ├── analysis/             # 🆕 Analysis Kategorie
│   │   ├── CodeQualityWorkflow.js
│   │   ├── ArchitectureWorkflow.js
│   │   └── SecurityWorkflow.js
│   ├── testing/              # 🆕 Testing Kategorie
│   │   ├── UnitTestWorkflow.js
│   │   ├── IntegrationTestWorkflow.js
│   │   └── E2ETestWorkflow.js
│   └── refactoring/          # 🆕 Refactoring Kategorie
│       ├── CodeRefactoringWorkflow.js
│       └── StructureRefactoringWorkflow.js
└── index.js                  # 🆕 Export
```

### 🆕 **Steps Structure**
```
backend/domain/steps/
├── StepRegistry.js           # 🆕 Haupt-Registry
├── StepBuilder.js            # 🆕 Haupt-Builder
├── categories/               # 🆕 KATEGORIEN-ORDNER
│   ├── analysis/             # 🆕 Analysis Kategorie
│   │   ├── check_container_status.js
│   │   ├── analyze_code_quality.js
│   │   ├── validate_architecture.js
│   │   └── check_security_vulnerabilities.js
│   ├── testing/              # 🆕 Testing Kategorie
│   │   ├── run_unit_tests.js
│   │   ├── run_integration_tests.js
│   │   ├── validate_coverage.js
│   │   └── check_performance.js
│   └── refactoring/          # 🆕 Refactoring Kategorie
│       ├── refactor_code.js
│       ├── optimize_structure.js
│       └── clean_dependencies.js
└── index.js                  # 🆕 Export
```

## 🔄 **Implementation Phases**

### **Phase 1: DDD Architecture Preservation (2h)**
- [x] Dokumentiere bestehende DDD-Struktur
- [x] Validiere Domain Entities und Business Logic
- [x] Sichere Repository Pattern
- [x] Erstelle Backup der DDD-Struktur
- [x] Dokumentiere alle Import-Pfade und Dependencies

### **Phase 2A: Core Frameworks (3h)**
- [ ] Create `backend/domain/frameworks/` directory
- [ ] Implement `AnalysisFramework.js` - Level 2 analysis
- [ ] Implement `RefactoringFramework.js` - Level 2 refactoring
- [ ] Implement `TestingFramework.js` - Level 2 testing
- [ ] Create basic framework integration

### **Phase 2B: Advanced Frameworks (3h)**
- [ ] Implement `DeploymentFramework.js` - Level 2 deployment
- [ ] Implement `FrameworkRegistry.js` - Level 2 registry
- [ ] Add advanced framework capabilities
- [ ] Validate framework integration

### **Phase 3: Core Steps (4h)**
- [ ] Create `backend/domain/steps/` directory
- [ ] Implement AnalysisSteps (check_container_status, analyze_code_quality, validate_architecture)
- [ ] Implement TestingSteps (run_tests, validate_coverage, check_performance)
- [ ] Implement RefactoringSteps (refactor_code, optimize_structure, clean_dependencies)

### **Phase 4: Modular Commands (3h)**
- [ ] Create `backend/application/commands/` modular structure
- [ ] Implement `CommandRegistry.js` - Command management
- [ ] Implement `CommandBuilder.js` - Command builder
- [ ] Organize commands into categories (analysis, generate, refactor, management)
- [ ] Create command validation and error handling

### **Phase 5: Modular Handlers (3h)**
- [ ] Create `backend/application/handlers/` modular structure
- [ ] Implement `HandlerRegistry.js` - Handler management
- [ ] Implement `HandlerBuilder.js` - Handler builder
- [ ] Organize handlers into categories (analysis, generate, refactor, management)
- [ ] Create handler validation and error handling

### **Phase 6: Integration Layer (4h)**
- [ ] Integrate frameworks with existing DDD services
- [ ] Integrate steps with existing DDD workflows
- [ ] Integrate commands with existing CommandBus
- [ ] Integrate handlers with existing HandlerBus
- [ ] Create coordination between all layers
- [ ] Implement event coordination between layers
- [ ] Validate complete integration

## 🏗️ **Detailed Framework Implementation**

### **AnalysisFramework.js - Level 2**
```javascript
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
    this.logger = dependencies.logger || console;
  }

  /**
   * 🆕 NEW: Execute analysis
   * @param {Object} context - Analysis context
   * @returns {Promise<Object>} Analysis result
   */
  async analyze(context) {
    this.logger.info('AnalysisFramework: Starting analysis', {
      projectId: context.projectId,
      analysisType: context.type
    });

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
    
  /**
   * 🆕 NEW: Get available analysis types
   * @returns {Array} Available analysis types
   */
  getAnalysisTypes() {
    return [
      'code-quality',
      'architecture',
      'dependencies',
      'security',
      'performance'
    ];
  }

  /**
   * 🆕 NEW: Validate analysis context
   * @param {Object} context - Analysis context
   * @returns {boolean} Validation result
   */
  validateAnalysis(context) {
    return context.projectId && context.type && this.getAnalysisTypes().includes(context.type);
  }
}

module.exports = AnalysisFramework;
```

### **TestingFramework.js - Level 2**
```javascript
/**
 * TestingFramework - Level 2: Testing Strategy
 * Provides testing capabilities using existing DDD services
 */
const { TaskService } = require('@/domain/services/TaskService');
const { WorkflowOrchestrationService } = require('@/domain/services/WorkflowOrchestrationService');

class TestingFramework {
  constructor(dependencies = {}) {
    this.taskService = dependencies.taskService || new TaskService();
    this.workflowService = dependencies.workflowService || new WorkflowOrchestrationService();
    this.logger = dependencies.logger || console;
  }

  /**
   * 🆕 NEW: Execute tests
   * @param {Object} context - Testing context
   * @returns {Promise<Object>} Testing result
   */
  async test(context) {
    this.logger.info('TestingFramework: Starting tests', {
      projectId: context.projectId,
      testType: context.type
    });

    // Use existing DDD services for core operations
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

  /**
   * 🆕 NEW: Get available test types
   * @returns {Array} Available test types
   */
  getTestTypes() {
    return [
      'unit',
      'integration',
      'e2e',
      'performance',
      'security'
    ];
  }

  /**
   * 🆕 NEW: Validate test context
   * @param {Object} context - Test context
   * @returns {boolean} Validation result
   */
  validateTests(context) {
    return context.projectId && context.type && this.getTestTypes().includes(context.type);
  }
}

module.exports = TestingFramework;
```

## 🏗️ **Detailed Command Implementation**

### **CommandRegistry.js - Application Layer**
```javascript
/**
 * CommandRegistry - Application Layer: Command management
 * Manages command registration and retrieval
 */
class CommandRegistry {
  constructor() {
    this.commands = new Map();
    this.categories = new Map();
    this.logger = console;
  }

  /**
   * 🆕 NEW: Register command
   * @param {string} commandName - Command name
   * @param {Function} commandClass - Command class
   * @param {string} category - Command category
   */
  register(commandName, commandClass, category = 'default') {
    this.commands.set(commandName, commandClass);
    
    if (!this.categories.has(category)) {
      this.categories.set(category, new Set());
    }
    this.categories.get(category).add(commandName);
    
    this.logger.info(`[CommandRegistry] Registered command: ${commandName} in category: ${category}`);
  }

  /**
   * 🆕 NEW: Get command
   * @param {string} commandName - Command name
   * @returns {Function|null} Command class
   */
  get(commandName) {
    return this.commands.get(commandName) || null;
  }

  /**
   * 🆕 NEW: Get commands by category
   * @param {string} category - Category name
   * @returns {Array} Command names in category
   */
  getByCategory(category) {
    return Array.from(this.categories.get(category) || []);
  }

  /**
   * 🆕 NEW: Get all categories
   * @returns {Array} All category names
   */
  getCategories() {
    return Array.from(this.categories.keys());
  }

  /**
   * 🆕 NEW: Validate command
   * @param {string} commandName - Command name
   * @returns {boolean} Validation result
   */
  hasCommand(commandName) {
    return this.commands.has(commandName);
  }
}

module.exports = CommandRegistry;
```

### **CommandBuilder.js - Application Layer**
```javascript
/**
 * CommandBuilder - Application Layer: Command builder
 * Builds commands with validation and configuration
 */
class CommandBuilder {
  constructor(registry) {
    this.registry = registry;
    this.logger = console;
  }

  /**
   * 🆕 NEW: Build command
   * @param {string} commandName - Command name
   * @param {Object} params - Command parameters
   * @returns {Object} Command instance
   */
  build(commandName, params = {}) {
    const CommandClass = this.registry.get(commandName);
    
    if (!CommandClass) {
      throw new Error(`Command not found: ${commandName}`);
    }

    try {
      const command = new CommandClass(params);
      
      // Validate command
      if (typeof command.validateParams === 'function') {
        command.validateParams(params);
      }

      this.logger.info(`[CommandBuilder] Built command: ${commandName}`);
      return command;
    } catch (error) {
      this.logger.error(`[CommandBuilder] Failed to build command: ${commandName}`, error);
      throw error;
    }
  }

  /**
   * 🆕 NEW: Build command with category
   * @param {string} category - Command category
   * @param {string} commandName - Command name
   * @param {Object} params - Command parameters
   * @returns {Object} Command instance
   */
  buildFromCategory(category, commandName, params = {}) {
    const categoryCommands = this.registry.getByCategory(category);
    
    if (!categoryCommands.includes(commandName)) {
      throw new Error(`Command ${commandName} not found in category: ${category}`);
    }

    return this.build(commandName, params);
  }

  /**
   * 🆕 NEW: Validate command parameters
   * @param {string} commandName - Command name
   * @param {Object} params - Command parameters
   * @returns {Object} Validation result
   */
  validateParams(commandName, params) {
    const CommandClass = this.registry.get(commandName);
    
    if (!CommandClass) {
      return { isValid: false, errors: [`Command not found: ${commandName}`] };
    }

    try {
      const command = new CommandClass(params);
      
      if (typeof command.validateParams === 'function') {
        command.validateParams(params);
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      return { isValid: false, errors: [error.message] };
    }
  }
}

module.exports = CommandBuilder;
```

## 🏗️ **Detailed Handler Implementation**

### **HandlerRegistry.js - Application Layer**
```javascript
/**
 * HandlerRegistry - Application Layer: Handler management
 * Manages handler registration and retrieval
 */
class HandlerRegistry {
  constructor() {
    this.handlers = new Map();
    this.categories = new Map();
    this.logger = console;
  }

  /**
   * 🆕 NEW: Register handler
   * @param {string} handlerName - Handler name
   * @param {Function} handlerClass - Handler class
   * @param {string} category - Handler category
   */
  register(handlerName, handlerClass, category = 'default') {
    this.handlers.set(handlerName, handlerClass);
    
    if (!this.categories.has(category)) {
      this.categories.set(category, new Set());
    }
    this.categories.get(category).add(handlerName);
    
    this.logger.info(`[HandlerRegistry] Registered handler: ${handlerName} in category: ${category}`);
  }

  /**
   * 🆕 NEW: Get handler
   * @param {string} handlerName - Handler name
   * @returns {Function|null} Handler class
   */
  get(handlerName) {
    return this.handlers.get(handlerName) || null;
  }

  /**
   * 🆕 NEW: Get handlers by category
   * @param {string} category - Category name
   * @returns {Array} Handler names in category
   */
  getByCategory(category) {
    return Array.from(this.categories.get(category) || []);
  }

  /**
   * 🆕 NEW: Get all categories
   * @returns {Array} All category names
   */
  getCategories() {
    return Array.from(this.categories.keys());
  }

  /**
   * 🆕 NEW: Validate handler
   * @param {string} handlerName - Handler name
   * @returns {boolean} Validation result
   */
  hasHandler(handlerName) {
    return this.handlers.has(handlerName);
  }
}

module.exports = HandlerRegistry;
```

### **HandlerBuilder.js - Application Layer**
```javascript
/**
 * HandlerBuilder - Application Layer: Handler builder
 * Builds handlers with validation and configuration
 */
class HandlerBuilder {
  constructor(registry) {
    this.registry = registry;
    this.logger = console;
  }

  /**
   * 🆕 NEW: Build handler
   * @param {string} handlerName - Handler name
   * @param {Object} dependencies - Handler dependencies
   * @returns {Object} Handler instance
   */
  build(handlerName, dependencies = {}) {
    const HandlerClass = this.registry.get(handlerName);
    
    if (!HandlerClass) {
      throw new Error(`Handler not found: ${handlerName}`);
    }

    try {
      const handler = new HandlerClass(dependencies);
      
      // Validate handler
      if (typeof handler.validateDependencies === 'function') {
        handler.validateDependencies(dependencies);
      }

      this.logger.info(`[HandlerBuilder] Built handler: ${handlerName}`);
      return handler;
    } catch (error) {
      this.logger.error(`[HandlerBuilder] Failed to build handler: ${handlerName}`, error);
      throw error;
    }
  }

  /**
   * 🆕 NEW: Build handler with category
   * @param {string} category - Handler category
   * @param {string} handlerName - Handler name
   * @param {Object} dependencies - Handler dependencies
   * @returns {Object} Handler instance
   */
  buildFromCategory(category, handlerName, dependencies = {}) {
    const categoryHandlers = this.registry.getByCategory(category);
    
    if (!categoryHandlers.includes(handlerName)) {
      throw new Error(`Handler ${handlerName} not found in category: ${category}`);
    }

    return this.build(handlerName, dependencies);
  }

  /**
   * 🆕 NEW: Validate handler dependencies
   * @param {string} handlerName - Handler name
   * @param {Object} dependencies - Handler dependencies
   * @returns {Object} Validation result
   */
  validateDependencies(handlerName, dependencies) {
    const HandlerClass = this.registry.get(handlerName);
    
    if (!HandlerClass) {
      return { isValid: false, errors: [`Handler not found: ${handlerName}`] };
    }

    try {
      const handler = new HandlerClass(dependencies);
      
      if (typeof handler.validateDependencies === 'function') {
        handler.validateDependencies(dependencies);
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      return { isValid: false, errors: [error.message] };
    }
  }
}

module.exports = HandlerBuilder;
```

## 🎯 **Benefits of Framework & Steps Integration**

### **1. DDD-Preservation**
- ✅ **Rich Domain Model**: Task Entity with 600+ lines remains intact
- ✅ **Value Object Safety**: TaskStatus with State Transitions unchanged
- ✅ **Repository Pattern**: Clean Data Access preserved
- ✅ **Service Layer**: Existing Domain Services unchanged

### **2. Framework Benefits**
- 🆕 **Strategy Definition**: Level 2 framework management
- 🆕 **Workflow Selection**: Framework-based workflow selection
- 🆕 **Context Management**: Framework context management
- 🆕 **Result Aggregation**: Framework result aggregation

### **3. Steps Benefits**
- 🆕 **Atomic Operations**: Level 0 atomic step execution
- 🆕 **Tool Integration**: Step-based tool integration
- 🆕 **Framework Access**: Step access to frameworks
- 🆕 **Result Reporting**: Step result reporting

### **4. Command Benefits**
- 🆕 **Modular Structure**: Commands organized by categories
- 🆕 **Registry Management**: Command registration and retrieval
- 🆕 **Builder Pattern**: Command building with validation
- 🆕 **Category Organization**: Clear command categorization

### **5. Handler Benefits**
- 🆕 **Modular Structure**: Handlers organized by categories
- 🆕 **Registry Management**: Handler registration and retrieval
- 🆕 **Builder Pattern**: Handler building with validation
- 🆕 **Category Organization**: Clear handler categorization

### **6. Integration Benefits**
- 🔗 **Seamless Integration**: All components use existing DDD services
- 🔗 **Backward Compatibility**: All existing APIs remain functional
- 🔗 **Clear Separation**: All components are separate from existing services
- 🔗 **Risk Mitigation**: No changes to existing DDD structure

### **7. Technical Benefits**
- 🚀 **Performance**: Existing optimized DDD-Services preserved
- 🚀 **Maintainability**: Clear separation of concerns
- 🚀 **Testability**: Each layer can be tested in isolation
- 🚀 **Scalability**: Horizontal and vertical scaling preserved

## 📋 **Migration-Mapping**

### **DDD Components (PRESERVED)**
```
TaskService (600+ lines) → ✅ PRESERVED (UNCHANGED)
WorkflowOrchestrationService (1200+ lines) → ✅ PRESERVED (UNCHANGED)
TaskExecutionService → ✅ PRESERVED (UNCHANGED)
CursorIDEService → ✅ PRESERVED (UNCHANGED)
VSCodeIDEService → ✅ PRESERVED (UNCHANGED)
```

### **New Components (NEW)**
```
AnalysisFramework → 🆕 NEW Level 2 framework
RefactoringFramework → 🆕 NEW Level 2 framework
TestingFramework → 🆕 NEW Level 2 framework
DeploymentFramework → 🆕 NEW Level 2 framework
FrameworkRegistry → 🆕 NEW Level 2 registry
CommandRegistry → 🆕 NEW Application layer registry
HandlerRegistry → 🆕 NEW Application layer registry
check_container_status → 🆕 NEW Level 0 step
run_tests → 🆕 NEW Level 0 step
refactor_code → 🆕 NEW Level 0 step
```

## 🚀 **Next Steps**

1. **Start Phase 1**: Document and secure DDD-Architecture
2. **Phase 2A**: Create core frameworks
3. **Phase 2B**: Add advanced frameworks
4. **Phase 3**: Create steps
5. **Phase 4**: Create modular commands
6. **Phase 5**: Create modular handlers
7. **Phase 6**: Integrate all components with existing DDD services

## 📊 **Success Criteria**

- [ ] DDD-Architecture fully preserved and unchanged
- [ ] Frameworks created in separate directory
- [ ] Steps created in separate directory
- [ ] Commands created in modular structure
- [ ] Handlers created in modular structure
- [ ] All existing functionality operational
- [ ] Framework execution working
- [ ] Step execution working
- [ ] Command execution working
- [ ] Handler execution working
- [ ] Performance requirements met
- [ ] Security requirements met
- [ ] Documentation complete and accurate
- [ ] User acceptance testing passed

**This DDD Architecture integrates Frameworks, Steps, Commands, and Handlers as SEPARATE components within the DDD domain layer and Application layer!** 🚀 