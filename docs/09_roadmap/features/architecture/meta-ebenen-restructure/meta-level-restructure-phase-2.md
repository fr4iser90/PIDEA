# Phase 2: Create Meta-Level Facade

## Objective
Create the Meta-Level Facade Layer that integrates with the existing DDD architecture.

## Duration: 6 hours

## Concrete Tasks

### 1. Create Meta-Level Main Structure
- [ ] Create `backend/meta-level/` main directory
- [ ] Create `backend/meta-level/README.md` with architecture explanation
- [ ] Create `backend/meta-level/index.js` as main export
- [ ] Create `backend/meta-level/package.json` for facade layer

### 2. Create Orchestrator Layer
- [ ] Create `backend/meta-level/orchestrator/` directory
- [ ] Implement `SystemOrchestrator.js` - Main orchestrator
- [ ] Implement `MultiProjectManager.js` - Multi-project management
- [ ] Implement `DecisionMaker.js` - Intelligent decision making
- [ ] Create `backend/meta-level/orchestrator/index.js`

### 3. Create Agent Coordination Layer
- [ ] Create `backend/meta-level/agents/` directory
- [ ] Implement `IDEAgentCoordinator.js` - IDE agent coordination
- [ ] Implement `AgentSelector.js` - Intelligent agent selection
- [ ] Implement `AgentRegistry.js` - Agent registry
- [ ] Create `backend/meta-level/agents/index.js`

### 4. Create Framework Strategy Layer
- [ ] Create `backend/meta-level/frameworks/` directory
- [ ] Implement `FrameworkSelector.js` - Framework selection
- [ ] Implement `StrategyRegistry.js` - Strategy registry
- [ ] Implement `FrameworkExecutor.js` - Framework execution
- [ ] Create `backend/meta-level/frameworks/index.js`

### 5. Create Integration Adapters
- [ ] Create `backend/meta-level/adapters/` directory
- [ ] Implement `DDDToMetaLevelAdapter.js` - DDD integration
- [ ] Implement `WorkflowAdapter.js` - Workflow integration
- [ ] Implement `ServiceAdapter.js` - Service integration
- [ ] Create `backend/meta-level/adapters/index.js`

### 6. Create Shared Components
- [ ] Create `backend/meta-level/shared/` directory
- [ ] Create `backend/meta-level/shared/interfaces/`
- [ ] Create `backend/meta-level/shared/types/`
- [ ] Create `backend/meta-level/shared/utils/`
- [ ] Create `backend/meta-level/shared/index.js`

## Concrete Implementation

### 1. Meta-Level Main README
```markdown
# Meta-Level Facade Layer

## Overview
This facade layer integrates meta-level concepts with the existing DDD architecture:

- **Orchestrator**: System orchestration and multi-project management
- **Agents**: IDE agent coordination and intelligent selection
- **Frameworks**: Strategy frameworks and framework selection
- **Adapters**: DDD integration and bridge services

## Usage
```javascript
import { SystemOrchestrator } from '@/meta-level/orchestrator';
import { IDEAgentCoordinator } from '@/meta-level/agents';
import { FrameworkSelector } from '@/meta-level/frameworks';
import { DDDToMetaLevelAdapter } from '@/meta-level/adapters';
```

## Integration with DDD
This facade layer extends the existing DDD architecture with meta-level concepts without changing the domain layers.
```

### 2. SystemOrchestrator.js
```javascript
/**
 * SystemOrchestrator - Meta-Level System Orchestration
 * Integrates with existing DDD architecture for multi-project management
 */
const { TaskService } = require('@/domain/services/TaskService');
const { WorkflowOrchestrationService } = require('@/domain/services/WorkflowOrchestrationService');

class SystemOrchestrator {
  constructor(dependencies = {}) {
    this.taskService = dependencies.taskService || new TaskService();
    this.workflowService = dependencies.workflowService || new WorkflowOrchestrationService();
    this.agentCoordinator = dependencies.agentCoordinator;
    this.frameworkSelector = dependencies.frameworkSelector;
    this.logger = dependencies.logger || console;
  }

  /**
   * Execute multi-project command using DDD services
   * @param {Object} command - Command to execute
   * @param {Array} projects - Projects to process
   * @returns {Promise<Object>} Execution result
   */
  async executeMultiProjectCommand(command, projects) {
    this.logger.info('SystemOrchestrator: Starting multi-project execution', {
      commandType: command.type,
      projectCount: projects.length
    });

    const results = [];
    
    for (const project of projects) {
      try {
        // Use existing DDD TaskService
        const task = await this.taskService.createTask({
          projectId: project.id,
          title: command.title,
          description: command.description,
          type: command.type,
          priority: command.priority
        });

        // Select appropriate agent using meta-level logic
        const agent = await this.agentCoordinator.selectAgent(project);
        
        // Select framework using meta-level logic
        const framework = await this.frameworkSelector.selectFramework(command.type);
        
        // Execute using existing DDD workflow service
        const result = await this.workflowService.executeWorkflow(task, {
          agent,
          framework,
          project
        });

        results.push({
          projectId: project.id,
          taskId: task.id,
          success: true,
          result
        });

      } catch (error) {
        this.logger.error('SystemOrchestrator: Project execution failed', {
          projectId: project.id,
          error: error.message
        });

        results.push({
          projectId: project.id,
          success: false,
          error: error.message
        });
      }
    }

    return this.aggregateResults(results);
  }

  /**
   * Aggregate results from multiple projects
   * @param {Array} results - Project results
   * @returns {Object} Aggregated result
   */
  aggregateResults(results) {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return {
      totalProjects: results.length,
      successfulProjects: successful.length,
      failedProjects: failed.length,
      successRate: (successful.length / results.length) * 100,
      results,
      summary: {
        totalTasks: successful.reduce((sum, r) => sum + (r.result?.taskCount || 0), 0),
        totalDuration: successful.reduce((sum, r) => sum + (r.result?.duration || 0), 0),
        averageDuration: successful.length > 0 ? 
          successful.reduce((sum, r) => sum + (r.result?.duration || 0), 0) / successful.length : 0
      }
    };
  }
}

module.exports = SystemOrchestrator;
```

### 3. IDEAgentCoordinator.js
```javascript
/**
 * IDEAgentCoordinator - IDE Agent Coordination
 * Integrates with existing IDE services from DDD infrastructure
 */
const { CursorIDEService } = require('@/domain/services/CursorIDEService');
const { VSCodeIDEService } = require('@/domain/services/VSCodeIDEService');

class IDEAgentCoordinator {
  constructor(dependencies = {}) {
    this.cursorService = dependencies.cursorService || new CursorIDEService();
    this.vscodeService = dependencies.vscodeService || new VSCodeIDEService();
    this.logger = dependencies.logger || console;
  }

  /**
   * Select appropriate IDE agent for project
   * @param {Object} project - Project information
   * @returns {Promise<Object>} Selected agent
   */
  async selectAgent(project) {
    this.logger.info('IDEAgentCoordinator: Selecting agent for project', {
      projectId: project.id,
      projectType: project.type
    });

    // Use existing DDD logic for agent selection
    const agentType = await this.determineAgentType(project);
    
    switch (agentType) {
      case 'cursor':
        return {
          type: 'cursor',
          service: this.cursorService,
          capabilities: ['code-analysis', 'refactoring', 'generation']
        };
      
      case 'vscode':
        return {
          type: 'vscode',
          service: this.vscodeService,
          capabilities: ['code-analysis', 'refactoring', 'generation']
        };
      
      default:
        return {
          type: 'cursor',
          service: this.cursorService,
          capabilities: ['code-analysis', 'refactoring', 'generation']
        };
    }
  }

  /**
   * Determine agent type based on project characteristics
   * @param {Object} project - Project information
   * @returns {Promise<string>} Agent type
   */
  async determineAgentType(project) {
    // Use existing DDD project analysis logic
    const projectAnalysis = await this.analyzeProject(project);
    
    if (projectAnalysis.idePreference === 'vscode') {
      return 'vscode';
    }
    
    return 'cursor'; // Default
  }

  /**
   * Analyze project for agent selection
   * @param {Object} project - Project information
   * @returns {Promise<Object>} Project analysis
   */
  async analyzeProject(project) {
    // This would integrate with existing DDD project analysis services
    return {
      idePreference: 'cursor',
      complexity: 'medium',
      techStack: ['javascript', 'nodejs']
    };
  }
}

module.exports = IDEAgentCoordinator;
```

### 4. FrameworkSelector.js
```javascript
/**
 * FrameworkSelector - Strategy Framework Selection
 * Integrates with existing DDD workflow services
 */
const { WorkflowOrchestrationService } = require('@/domain/services/WorkflowOrchestrationService');

class FrameworkSelector {
  constructor(dependencies = {}) {
    this.workflowService = dependencies.workflowService || new WorkflowOrchestrationService();
    this.logger = dependencies.logger || console;
  }

  /**
   * Select appropriate framework for task type
   * @param {string} taskType - Type of task
   * @returns {Promise<Object>} Selected framework
   */
  async selectFramework(taskType) {
    this.logger.info('FrameworkSelector: Selecting framework', {
      taskType
    });

    // Use existing DDD workflow logic
    const availableFrameworks = await this.getAvailableFrameworks();
    
    const framework = availableFrameworks.find(f => 
      f.supportedTaskTypes.includes(taskType)
    );

    if (!framework) {
      throw new Error(`No framework found for task type: ${taskType}`);
    }

    return {
      name: framework.name,
      type: framework.type,
      strategy: framework.strategy,
      supportedTaskTypes: framework.supportedTaskTypes
    };
  }

  /**
   * Get available frameworks from DDD services
   * @returns {Promise<Array>} Available frameworks
   */
  async getAvailableFrameworks() {
    // This would integrate with existing DDD workflow services
    return [
      {
        name: 'AnalysisFramework',
        type: 'analysis',
        strategy: 'sequential',
        supportedTaskTypes: ['analyze', 'code-quality', 'dependencies']
      },
      {
        name: 'RefactoringFramework',
        type: 'refactoring',
        strategy: 'iterative',
        supportedTaskTypes: ['refactor', 'restructure', 'organize']
      },
      {
        name: 'GenerationFramework',
        type: 'generation',
        strategy: 'template-based',
        supportedTaskTypes: ['generate', 'documentation', 'tests']
      }
    ];
  }
}

module.exports = FrameworkSelector;
```

### 5. DDDToMetaLevelAdapter.js
```javascript
/**
 * DDDToMetaLevelAdapter - Bridge between DDD and Meta-Level
 * Provides seamless integration between existing DDD services and meta-level facade
 */
class DDDToMetaLevelAdapter {
  constructor(dependencies = {}) {
    this.taskService = dependencies.taskService;
    this.workflowService = dependencies.workflowService;
    this.logger = dependencies.logger || console;
  }

  /**
   * Adapt DDD task to meta-level format
   * @param {Object} dddTask - DDD task entity
   * @returns {Object} Meta-level task format
   */
  adaptTaskToMetaLevel(dddTask) {
    return {
      id: dddTask.id,
      title: dddTask.title,
      description: dddTask.description,
      type: dddTask.type.value,
      status: dddTask.status.value,
      priority: dddTask.priority.value,
      projectId: dddTask.projectId,
      metadata: dddTask.metadata,
      canExecute: dddTask.canStart(),
      businessRules: {
        canStart: dddTask.canStart(),
        canPause: dddTask.canPause(),
        canResume: dddTask.canResume(),
        canComplete: dddTask.canComplete(),
        canCancel: dddTask.canCancel()
      }
    };
  }

  /**
   * Adapt meta-level result to DDD format
   * @param {Object} metaLevelResult - Meta-level execution result
   * @returns {Object} DDD result format
   */
  adaptResultToDDD(metaLevelResult) {
    return {
      success: metaLevelResult.success,
      data: metaLevelResult.data,
      metadata: {
        executionTime: metaLevelResult.duration,
        agentType: metaLevelResult.agent?.type,
        frameworkType: metaLevelResult.framework?.type,
        projectCount: metaLevelResult.projectCount
      },
      errors: metaLevelResult.errors || []
    };
  }

  /**
   * Execute task using DDD services with meta-level orchestration
   * @param {Object} task - Task to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeTaskWithMetaLevel(task, options) {
    // Use existing DDD task service
    const dddTask = await this.taskService.findById(task.id);
    
    if (!dddTask) {
      throw new Error(`Task not found: ${task.id}`);
    }

    // Start task using DDD business logic
    dddTask.start();

    try {
      // Execute using existing DDD workflow service
      const result = await this.workflowService.executeWorkflow(dddTask, options);
      
      // Complete task using DDD business logic
      dddTask.complete(result);
      
      return this.adaptResultToDDD({
        success: true,
        data: result,
        duration: Date.now() - dddTask.startedAt.getTime(),
        agent: options.agent,
        framework: options.framework
      });

    } catch (error) {
      // Fail task using DDD business logic
      dddTask.fail(error.message);
      
      throw error;
    }
  }
}

module.exports = DDDToMetaLevelAdapter;
```

### 6. Meta-Level index.js
```javascript
/**
 * Meta-Level Facade Layer - Main exports
 * Provides integration between DDD architecture and meta-level concepts
 */

// Orchestrator components
const SystemOrchestrator = require('./orchestrator/SystemOrchestrator');
const MultiProjectManager = require('./orchestrator/MultiProjectManager');
const DecisionMaker = require('./orchestrator/DecisionMaker');

// Agent coordination components
const IDEAgentCoordinator = require('./agents/IDEAgentCoordinator');
const AgentSelector = require('./agents/AgentSelector');
const AgentRegistry = require('./agents/AgentRegistry');

// Framework components
const FrameworkSelector = require('./frameworks/FrameworkSelector');
const StrategyRegistry = require('./frameworks/StrategyRegistry');
const FrameworkExecutor = require('./frameworks/FrameworkExecutor');

// Integration adapters
const DDDToMetaLevelAdapter = require('./adapters/DDDToMetaLevelAdapter');
const WorkflowAdapter = require('./adapters/WorkflowAdapter');
const ServiceAdapter = require('./adapters/ServiceAdapter');

// Shared components
const { interfaces, types, utils } = require('./shared');

module.exports = {
  // Orchestrator
  SystemOrchestrator,
  MultiProjectManager,
  DecisionMaker,

  // Agents
  IDEAgentCoordinator,
  AgentSelector,
  AgentRegistry,

  // Frameworks
  FrameworkSelector,
  StrategyRegistry,
  FrameworkExecutor,

  // Adapters
  DDDToMetaLevelAdapter,
  WorkflowAdapter,
  ServiceAdapter,

  // Shared
  interfaces,
  types,
  utils,

  // Convenience exports
  orchestrator: {
    SystemOrchestrator,
    MultiProjectManager,
    DecisionMaker
  },

  agents: {
    IDEAgentCoordinator,
    AgentSelector,
    AgentRegistry
  },

  frameworks: {
    FrameworkSelector,
    StrategyRegistry,
    FrameworkExecutor
  },

  adapters: {
    DDDToMetaLevelAdapter,
    WorkflowAdapter,
    ServiceAdapter
  }
};
```

## Success Criteria
- [ ] Meta-Level facade layer created
- [ ] All components implemented
- [ ] DDD integration working
- [ ] Orchestrator service operational
- [ ] Agent coordination implemented
- [ ] Framework selection working
- [ ] Adapter layer created
- [ ] All tests passing

## Next Phase
Phase 3: Create Integration Layer 