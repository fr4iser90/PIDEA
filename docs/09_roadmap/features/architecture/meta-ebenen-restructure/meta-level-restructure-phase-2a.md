# Phase 2A: Core Frameworks

## Objective
Create core frameworks as separate components within the DDD domain layer.

## Duration: 3 hours

## Concrete Tasks

### 1. Create Frameworks Directory
- [ ] Create `backend/domain/frameworks/` directory
- [ ] Create `backend/domain/frameworks/README.md` with architecture explanation
- [ ] Create `backend/domain/frameworks/index.js` as main export
- [ ] Create `backend/domain/frameworks/FrameworkRegistry.js` - Haupt-Registry
- [ ] Create `backend/domain/frameworks/FrameworkBuilder.js` - Haupt-Builder

### 2. Create Analysis Category
- [ ] Create `backend/domain/frameworks/categories/analysis/` directory
- [ ] Create `backend/domain/frameworks/categories/analysis/CodeQualityFramework.js`
- [ ] Create `backend/domain/frameworks/categories/analysis/ArchitectureFramework.js`
- [ ] Create `backend/domain/frameworks/categories/analysis/SecurityFramework.js`
- [ ] Create `backend/domain/frameworks/categories/analysis/PerformanceFramework.js`

### 3. Create Testing Category
- [ ] Create `backend/domain/frameworks/categories/testing/` directory
- [ ] Create `backend/domain/frameworks/categories/testing/UnitTestFramework.js`
- [ ] Create `backend/domain/frameworks/categories/testing/IntegrationTestFramework.js`
- [ ] Create `backend/domain/frameworks/categories/testing/E2ETestFramework.js`
- [ ] Create `backend/domain/frameworks/categories/testing/PerformanceTestFramework.js`

### 4. Create Refactoring Category
- [ ] Create `backend/domain/frameworks/categories/refactoring/` directory
- [ ] Create `backend/domain/frameworks/categories/refactoring/CodeRefactoringFramework.js`
- [ ] Create `backend/domain/frameworks/categories/refactoring/StructureRefactoringFramework.js`
- [ ] Create `backend/domain/frameworks/categories/refactoring/DependencyRefactoringFramework.js`

## Concrete Implementation

### 1. Frameworks README
```markdown
# Frameworks

## Overview
This directory contains frameworks that integrate with existing DDD services:

- **AnalysisFramework**: Level 2 analysis strategy and execution
- **RefactoringFramework**: Level 2 refactoring strategy and execution
- **TestingFramework**: Level 2 testing strategy and execution

## Usage
```javascript
import { AnalysisFramework } from '@/domain/frameworks/AnalysisFramework';
import { RefactoringFramework } from '@/domain/frameworks/RefactoringFramework';
import { TestingFramework } from '@/domain/frameworks/TestingFramework';
```

## Integration with DDD
These frameworks use existing DDD services for core operations while providing higher-level strategy and execution.
```

### 2. FrameworkRegistry.js - Haupt-Registry
```javascript
/**
 * FrameworkRegistry - Haupt-Registry für alle Frameworks
 * Verwaltet Framework-Registrierung und -Abruf
 */
class FrameworkRegistry {
  constructor(dependencies = {}) {
    this.frameworks = new Map();
    this.logger = dependencies.logger || console;
  }

  /**
   * 🆕 NEW: Register framework
   * @param {string} key - Framework key
   * @param {Object} framework - Framework definition
   */
  registerFramework(key, framework) {
    this.logger.info('FrameworkRegistry: Registering framework', {
      key,
      frameworkType: framework.type
    });

    this.frameworks.set(key, {
      ...framework,
      priority: framework.priority || 5,
      registeredAt: new Date()
    });
  }

  /**
   * 🆕 NEW: Get framework by key
   * @param {string} key - Framework key
   * @returns {Object|null} Framework definition
   */
  getFramework(key) {
    return this.frameworks.get(key) || null;
  }

  /**
   * 🆕 NEW: List all frameworks
   * @returns {Array} All registered frameworks
   */
  listFrameworks() {
    return Array.from(this.frameworks.entries()).map(([key, framework]) => ({
      key,
      ...framework
    }));
  }

  /**
   * 🆕 NEW: Get frameworks by category
   * @param {string} category - Framework category
   * @returns {Array} Frameworks of specified category
   */
  getFrameworksByCategory(category) {
    return this.listFrameworks().filter(framework => framework.category === category);
  }
}

module.exports = FrameworkRegistry;
```

### 3. CodeQualityFramework.js - Analysis Kategorie
```javascript
/**
 * CodeQualityFramework - Analysis Kategorie
 * Provides code quality analysis capabilities using existing DDD services
 */
const { TaskService } = require('@/domain/services/TaskService');
const { WorkflowOrchestrationService } = require('@/domain/services/WorkflowOrchestrationService');

class CodeQualityFramework {
  constructor(dependencies = {}) {
    this.taskService = dependencies.taskService || new TaskService();
    this.workflowService = dependencies.workflowService || new WorkflowOrchestrationService();
    this.logger = dependencies.logger || console;
  }

  /**
   * 🆕 NEW: Execute code quality analysis
   * @param {Object} context - Analysis context
   * @returns {Promise<Object>} Analysis result
   */
  async analyze(context) {
    this.logger.info('CodeQualityFramework: Starting code quality analysis', {
      projectId: context.projectId,
      analysisType: context.type
    });

    // Use existing DDD services for core operations
    const task = await this.taskService.createTask({
      projectId: context.projectId,
      title: `Code Quality Analysis: ${context.type}`,
      description: context.description,
      type: 'analysis',
      priority: context.priority || 'medium'
    });

    // Execute analysis workflow
    const result = await this.workflowService.executeWorkflow(task, {
      framework: 'code-quality',
      context
    });

    return {
      success: true,
      taskId: task.id,
      result
    };
  }

  /**
   * 🆕 NEW: Get available code quality analysis types
   * @returns {Array} Available analysis types
   */
  getAnalysisTypes() {
    return [
      'linting',
      'complexity',
      'duplication',
      'maintainability',
      'readability'
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

module.exports = CodeQualityFramework;
```

### 4. UnitTestFramework.js - Testing Kategorie
```javascript
/**
 * UnitTestFramework - Testing Kategorie
 * Provides unit testing capabilities using existing DDD services
 */
const { TaskService } = require('@/domain/services/TaskService');
const { WorkflowOrchestrationService } = require('@/domain/services/WorkflowOrchestrationService');

class UnitTestFramework {
  constructor(dependencies = {}) {
    this.taskService = dependencies.taskService || new TaskService();
    this.workflowService = dependencies.workflowService || new WorkflowOrchestrationService();
    this.logger = dependencies.logger || console;
  }

  /**
   * 🆕 NEW: Execute unit tests
   * @param {Object} context - Testing context
   * @returns {Promise<Object>} Testing result
   */
  async test(context) {
    this.logger.info('UnitTestFramework: Starting unit tests', {
      projectId: context.projectId,
      testType: context.type
    });

    // Use existing DDD services for core operations
    const task = await this.taskService.createTask({
      projectId: context.projectId,
      title: `Unit Testing: ${context.type}`,
      description: context.description,
      type: 'testing',
      priority: context.priority || 'medium'
    });

    // Execute testing workflow
    const result = await this.workflowService.executeWorkflow(task, {
      framework: 'unit-test',
      context
    });

    return {
      success: true,
      taskId: task.id,
      result
    };
  }

  /**
   * 🆕 NEW: Get available unit test types
   * @returns {Array} Available test types
   */
  getTestTypes() {
    return [
      'jest',
      'mocha',
      'jasmine',
      'vitest',
      'ava'
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

module.exports = UnitTestFramework;
```

### 5. CodeRefactoringFramework.js - Refactoring Kategorie
```javascript
/**
 * CodeRefactoringFramework - Refactoring Kategorie
 * Provides code refactoring capabilities using existing DDD services
 */
const { TaskService } = require('@/domain/services/TaskService');
const { WorkflowOrchestrationService } = require('@/domain/services/WorkflowOrchestrationService');

class CodeRefactoringFramework {
  constructor(dependencies = {}) {
    this.taskService = dependencies.taskService || new TaskService();
    this.workflowService = dependencies.workflowService || new WorkflowOrchestrationService();
    this.logger = dependencies.logger || console;
  }

  /**
   * 🆕 NEW: Execute code refactoring
   * @param {Object} context - Refactoring context
   * @returns {Promise<Object>} Refactoring result
   */
  async refactor(context) {
    this.logger.info('CodeRefactoringFramework: Starting code refactoring', {
      projectId: context.projectId,
      refactoringType: context.type
    });

    // Use existing DDD services for core operations
    const task = await this.taskService.createTask({
      projectId: context.projectId,
      title: `Code Refactoring: ${context.type}`,
      description: context.description,
      type: 'refactoring',
      priority: context.priority || 'medium'
    });

    // Execute refactoring workflow
    const result = await this.workflowService.executeWorkflow(task, {
      framework: 'code-refactoring',
      context
    });

    return {
      success: true,
      taskId: task.id,
      result
    };
  }

  /**
   * 🆕 NEW: Get available code refactoring types
   * @returns {Array} Available refactoring types
   */
  getRefactoringTypes() {
    return [
      'extract-method',
      'extract-class',
      'rename',
      'move-method',
      'inline-method'
    ];
  }

  /**
   * 🆕 NEW: Validate refactoring context
   * @param {Object} context - Refactoring context
   * @returns {boolean} Validation result
   */
  validateRefactoring(context) {
    return context.projectId && context.type && this.getRefactoringTypes().includes(context.type);
  }
}

module.exports = CodeRefactoringFramework;
```

### 6. Frameworks index.js
```javascript
/**
 * Frameworks - Main exports
 * Provides frameworks that integrate with existing DDD services
 */

const FrameworkRegistry = require('./FrameworkRegistry');
const FrameworkBuilder = require('./FrameworkBuilder');

// Analysis Category
const CodeQualityFramework = require('./categories/analysis/CodeQualityFramework');
const ArchitectureFramework = require('./categories/analysis/ArchitectureFramework');
const SecurityFramework = require('./categories/analysis/SecurityFramework');
const PerformanceFramework = require('./categories/analysis/PerformanceFramework');

// Testing Category
const UnitTestFramework = require('./categories/testing/UnitTestFramework');
const IntegrationTestFramework = require('./categories/testing/IntegrationTestFramework');
const E2ETestFramework = require('./categories/testing/E2ETestFramework');
const PerformanceTestFramework = require('./categories/testing/PerformanceTestFramework');

// Refactoring Category
const CodeRefactoringFramework = require('./categories/refactoring/CodeRefactoringFramework');
const StructureRefactoringFramework = require('./categories/refactoring/StructureRefactoringFramework');
const DependencyRefactoringFramework = require('./categories/refactoring/DependencyRefactoringFramework');

// Deployment Category
const DockerFramework = require('./categories/deployment/DockerFramework');
const KubernetesFramework = require('./categories/deployment/KubernetesFramework');
const ServerlessFramework = require('./categories/deployment/ServerlessFramework');

module.exports = {
  // Main components
  FrameworkRegistry,
  FrameworkBuilder,

  // Analysis Category
  analysis: {
    CodeQualityFramework,
    ArchitectureFramework,
    SecurityFramework,
    PerformanceFramework
  },

  // Testing Category
  testing: {
    UnitTestFramework,
    IntegrationTestFramework,
    E2ETestFramework,
    PerformanceTestFramework
  },

  // Refactoring Category
  refactoring: {
    CodeRefactoringFramework,
    StructureRefactoringFramework,
    DependencyRefactoringFramework
  },

  // Deployment Category
  deployment: {
    DockerFramework,
    KubernetesFramework,
    ServerlessFramework
  }
};
```

## Success Criteria
- [ ] Frameworks directory created with categories structure
- [ ] FrameworkRegistry.js implemented as Haupt-Registry
- [ ] FrameworkBuilder.js implemented as Haupt-Builder
- [ ] Analysis category frameworks implemented (CodeQuality, Architecture, Security, Performance)
- [ ] Testing category frameworks implemented (Unit, Integration, E2E, Performance)
- [ ] Refactoring category frameworks implemented (Code, Structure, Dependency)
- [ ] All frameworks integrate with existing DDD services
- [ ] No changes to existing DDD services

## Dependencies
- Requires: Phase 1 completion (DDD architecture preservation)
- Blocks: Phase 2B start

## Next Phase
Phase 2B: Advanced Frameworks 