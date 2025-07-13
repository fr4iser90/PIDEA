# Unified System Cleanup – Phase 2: Core System Removal

## Overview
This phase focuses on the systematic removal of all unified workflow system files and components, updating service dependencies to use Categories-only patterns, and cleaning up the codebase.

## Objectives
- [ ] Remove UnifiedWorkflowService.js and related files
- [ ] Remove UnifiedWorkflowHandler.js and handler registry
- [ ] Remove unified workflow tests and documentation
- [ ] Remove migration scripts
- [ ] Update service dependencies to use Categories only

## Deliverables
- **File**: `scripts/cleanup/remove-unified-files.js` - Automated file removal script
- **File**: `scripts/cleanup/update-service-dependencies.js` - Service dependency updater
- **File**: `backend/domain/services/WorkflowOrchestrationService.js` - Updated to use Categories only
- **File**: `backend/domain/services/TaskService.js` - Updated to use Categories only
- **File**: `backend/application/handlers/index.js` - Updated exports
- **Test**: `tests/cleanup/CoreSystemRemoval.test.js` - Removal validation tests

## Dependencies
- Requires: Phase 1 completion (backup and analysis)
- Blocks: Phase 3 start

## Estimated Time
6 hours

## Implementation Details

### 1. Automated File Removal Script
```javascript
// scripts/cleanup/remove-unified-files.js
const fs = require('fs-extra');
const path = require('path');

class UnifiedFileRemover {
  constructor() {
    this.filesToRemove = [
      'backend/domain/services/UnifiedWorkflowService.js',
      'backend/application/handlers/workflow/UnifiedWorkflowHandler.js',
      'backend/application/handlers/UnifiedHandlerRegistry.js',
      'backend/application/handlers/workflow/index.js',
      'backend/tests/unit/domain/workflows/UnifiedWorkflowFoundation.test.js',
      'backend/tests/unit/workflows/handlers/UnifiedWorkflowHandler.test.js',
      'backend/examples/UnifiedWorkflowFoundationExample.js',
      'backend/docs/UnifiedWorkflowFoundation1B.md',
      'scripts/migration/start-unified-workflow-migration.js',
      'scripts/migration/complete-unified-workflow-migration.js'
    ];
    
    this.directoriesToCheck = [
      'backend/application/handlers/workflow',
      'backend/tests/unit/workflows',
      'scripts/migration'
    ];
  }

  async removeUnifiedFiles() {
    const removedFiles = [];
    const errors = [];

    for (const file of this.filesToRemove) {
      try {
        const filePath = path.join(__dirname, '../../..', file);
        
        if (await fs.pathExists(filePath)) {
          await fs.remove(filePath);
          removedFiles.push(file);
          console.log(`✅ Removed: ${file}`);
        } else {
          console.log(`⚠️  File not found: ${file}`);
        }
      } catch (error) {
        errors.push({ file, error: error.message });
        console.error(`❌ Failed to remove ${file}:`, error.message);
      }
    }

    // Clean up empty directories
    await this.cleanupEmptyDirectories();

    return { removedFiles, errors };
  }

  async cleanupEmptyDirectories() {
    for (const dir of this.directoriesToCheck) {
      const dirPath = path.join(__dirname, '../../..', dir);
      
      if (await fs.pathExists(dirPath)) {
        const files = await fs.readdir(dirPath);
        if (files.length === 0) {
          await fs.remove(dirPath);
          console.log(`✅ Removed empty directory: ${dir}`);
        }
      }
    }
  }
}
```

### 2. Service Dependency Updater
```javascript
// scripts/cleanup/update-service-dependencies.js
const fs = require('fs-extra');
const path = require('path');

class ServiceDependencyUpdater {
  constructor() {
    this.filesToUpdate = [
      'backend/domain/services/WorkflowOrchestrationService.js',
      'backend/domain/services/TaskService.js',
      'backend/infrastructure/di/ServiceRegistry.js'
    ];
  }

  async updateServiceDependencies() {
    const updates = [];

    for (const file of this.filesToUpdate) {
      try {
        const filePath = path.join(__dirname, '../../..', file);
        const content = await fs.readFile(filePath, 'utf8');
        
        const updatedContent = this.updateFileContent(content, file);
        
        if (updatedContent !== content) {
          await fs.writeFile(filePath, updatedContent);
          updates.push(file);
          console.log(`✅ Updated: ${file}`);
        } else {
          console.log(`ℹ️  No changes needed: ${file}`);
        }
      } catch (error) {
        console.error(`❌ Failed to update ${file}:`, error.message);
      }
    }

    return updates;
  }

  updateFileContent(content, filename) {
    let updatedContent = content;

    // Remove unified workflow imports
    updatedContent = updatedContent.replace(
      /const\s*{\s*UnifiedWorkflowHandler[^}]*}\s*=\s*require\([^)]+\);/g,
      ''
    );

    // Remove unified workflow service registrations
    updatedContent = updatedContent.replace(
      /this\.container\.register\('unifiedWorkflowService'[^}]+},?\s*{.*?}\);?\s*/gs,
      ''
    );

    // Update WorkflowOrchestrationService
    if (filename.includes('WorkflowOrchestrationService')) {
      updatedContent = this.updateWorkflowOrchestrationService(updatedContent);
    }

    // Update TaskService
    if (filename.includes('TaskService')) {
      updatedContent = this.updateTaskService(updatedContent);
    }

    return updatedContent;
  }

  updateWorkflowOrchestrationService(content) {
    // Remove unified handler initialization
    content = content.replace(
      /\/\/ Initialize unified workflow handler system[\s\S]*?this\.unifiedHandler\s*=\s*new\s*UnifiedWorkflowHandler\([^)]+\);/g,
      ''
    );

    // Remove unified handler methods
    content = content.replace(
      /async\s+executeWorkflowWithUnifiedHandler[\s\S]*?}/g,
      ''
    );

    // Update to use Categories-based patterns
    content = content.replace(
      /const\s*{\s*SequentialExecutionEngine\s*}\s*=\s*require\([^)]+\);/g,
      `const { SequentialExecutionEngine } = require('../workflows/execution');
const StepRegistry = require('../steps/StepRegistry');
const FrameworkRegistry = require('../frameworks/FrameworkRegistry');`
    );

    return content;
  }

  updateTaskService(content) {
    // Remove unified handler initialization
    content = content.replace(
      /\/\/ Initialize unified workflow handler system[\s\S]*?this\.unifiedHandler\s*=\s*new\s*UnifiedWorkflowHandler\([^)]+\);/g,
      ''
    );

    // Remove unified handler methods
    content = content.replace(
      /async\s+executeTaskWithUnifiedWorkflow[\s\S]*?}/g,
      ''
    );

    content = content.replace(
      /async\s+executeTaskWithUnifiedHandler[\s\S]*?}/g,
      ''
    );

    // Update to use Categories-based patterns
    content = content.replace(
      /const\s*{\s*SequentialExecutionEngine\s*}\s*=\s*require\([^)]+\);/g,
      `const { SequentialExecutionEngine } = require('../workflows/execution');
const StepRegistry = require('../steps/StepRegistry');
const FrameworkRegistry = require('../frameworks/FrameworkRegistry');`
    );

    return content;
  }
}
```

### 3. Updated WorkflowOrchestrationService
```javascript
// backend/domain/services/WorkflowOrchestrationService.js (updated)
/**
 * WorkflowOrchestrationService - Domain Service for Workflow Orchestration
 * Implements DDD patterns for coordinating different workflow types
 * Enhanced with GitWorkflowManager integration and Core Execution Engine
 * Uses Categories-based registry patterns only
 */
const WorkflowGitService = require('./WorkflowGitService');
const TaskType = require('../value-objects/TaskType');
const GitWorkflowManager = require('../workflows/categories/git/GitWorkflowManager');
const GitWorkflowContext = require('../workflows/categories/git/GitWorkflowContext');
const { SequentialExecutionEngine } = require('../workflows/execution');
const StepRegistry = require('../steps/StepRegistry');
const FrameworkRegistry = require('../frameworks/FrameworkRegistry');

class WorkflowOrchestrationService {
    constructor(dependencies = {}) {
        this.workflowGitService = dependencies.workflowGitService || new WorkflowGitService(dependencies);
        this.cursorIDEService = dependencies.cursorIDEService;
        this.autoFinishSystem = dependencies.autoFinishSystem;
        this.taskRepository = dependencies.taskRepository;
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
        
        // Initialize enhanced git workflow manager
        this.gitWorkflowManager = new GitWorkflowManager({
            gitService: this.workflowGitService.gitService,
            logger: this.logger,
            eventBus: this.eventBus
        });
        
        // Initialize core execution engine
        this.executionEngine = new SequentialExecutionEngine({
            logger: this.logger,
            enablePriority: true,
            enableRetry: true,
            enableResourceManagement: true,
            enableDependencyResolution: true,
            enablePriorityScheduling: true
        });

        // Initialize Categories-based registries
        this.stepRegistry = new StepRegistry();
        this.frameworkRegistry = new FrameworkRegistry();
    }

    /**
     * Execute workflow using Categories-based patterns
     * @param {Object} task - Task object
     * @param {Object} options - Workflow options
     * @returns {Promise<Object>} Workflow execution result
     */
    async executeWorkflowWithCategories(task, options = {}) {
        try {
            this.logger.info('WorkflowOrchestrationService: Starting workflow execution with Categories', {
                taskId: task.id,
                taskType: task.type?.value
            });

            // Get appropriate step from registry
            const stepType = this.determineStepType(task);
            const step = await this.stepRegistry.getStep(stepType);

            if (!step) {
                throw new Error(`Step not found: ${stepType}`);
            }

            // Execute step using Categories pattern
            const result = await step.execute({
                task,
                options,
                context: {
                    taskId: task.id,
                    taskType: task.type?.value,
                    userId: options.userId
                }
            });

            this.logger.info('WorkflowOrchestrationService: Categories workflow execution completed', {
                taskId: task.id,
                taskType: task.type?.value,
                success: result.success,
                stepType
            });

            return {
                success: result.success,
                taskId: task.id,
                taskType: task.type?.value,
                result: result.data,
                message: result.success ? 
                    `Workflow completed successfully for task: ${task.title}` :
                    `Workflow failed for task: ${task.title}`,
                metadata: {
                    executionTime: result.duration,
                    stepType,
                    timestamp: new Date()
                }
            };

        } catch (error) {
            this.logger.error('WorkflowOrchestrationService: Categories workflow execution failed', {
                taskId: task.id,
                error: error.message
            });

            return {
                success: false,
                taskId: task.id,
                error: error.message,
                metadata: {
                    timestamp: new Date()
                }
            };
        }
    }

    /**
     * Determine step type based on task type
     * @param {Object} task - Task object
     * @returns {string} Step type
     */
    determineStepType(task) {
        const taskType = task.type?.value;
        
        switch (taskType) {
            case 'analysis':
                return 'AnalysisStep';
            case 'refactoring':
                return 'RefactoringStep';
            case 'testing':
                return 'TestingStep';
            case 'documentation':
                return 'DocumentationStep';
            default:
                return 'AnalysisStep';
        }
    }
}
```

### 4. Updated TaskService
```javascript
// backend/domain/services/TaskService.js (updated)
const Task = require('@entities/Task');
const TaskStatus = require('@value-objects/TaskStatus');
const TaskPriority = require('@value-objects/TaskPriority');
const TaskType = require('@value-objects/TaskType');
const GitWorkflowManager = require('../workflows/categories/git/GitWorkflowManager');
const GitWorkflowContext = require('../workflows/categories/git/GitWorkflowContext');
const { SequentialExecutionEngine } = require('../workflows/execution');
const StepRegistry = require('../steps/StepRegistry');
const FrameworkRegistry = require('../frameworks/FrameworkRegistry');

/**
 * TaskService - Business logic for project-based task management
 * Enhanced with GitWorkflowManager integration
 * Uses Categories-based registry patterns only
 */
class TaskService {
  constructor(taskRepository, aiService, projectAnalyzer, cursorIDEService = null, autoFinishSystem, workflowGitService = null) {
    this.taskRepository = taskRepository;
    this.aiService = aiService;
    this.projectAnalyzer = projectAnalyzer;
    this.cursorIDEService = cursorIDEService;
    this.autoFinishSystem = autoFinishSystem;
    this.workflowGitService = workflowGitService;
    
    // Initialize enhanced git workflow manager if workflowGitService is available
    if (this.workflowGitService) {
      this.gitWorkflowManager = new GitWorkflowManager({
        gitService: this.workflowGitService.gitService,
        logger: console,
        eventBus: null
      });
    }
    
    // Initialize core execution engine
    this.executionEngine = new SequentialExecutionEngine({
      logger: console,
      enablePriority: true,
      enableRetry: true,
      enableResourceManagement: true,
      enableDependencyResolution: true,
      enablePriorityScheduling: true
    });

    // Initialize Categories-based registries
    this.stepRegistry = new StepRegistry();
    this.frameworkRegistry = new FrameworkRegistry();
  }

  /**
   * Execute task using Categories-based patterns
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeTask(taskId, userId, options = {}) {
    try {
      console.log('🔍 [TaskService] executeTask called with Categories system:', { taskId, userId, options });

      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      // Execute using Categories-based patterns
      return await this.executeTaskWithCategories(task, userId, options);

    } catch (error) {
      console.error('❌ [TaskService] Error executing task:', error);
      throw error;
    }
  }

  /**
   * Execute task using Categories-based patterns
   * @param {Object} task - Task object
   * @param {string} userId - User ID
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeTaskWithCategories(task, userId, options = {}) {
    try {
      console.log('🚀 [TaskService] executeTaskWithCategories called:', {
        taskId: task.id,
        taskType: task.type?.value,
        userId
      });

      // Determine step type based on task type
      const stepType = this.determineStepType(task);
      
      // Get step from registry
      const step = await this.stepRegistry.getStep(stepType);
      
      if (!step) {
        throw new Error(`Step not found: ${stepType}`);
      }

      // Execute step
      const result = await step.execute({
        task,
        userId,
        options,
        context: {
          taskId: task.id,
          taskType: task.type?.value,
          projectId: task.projectId
        }
      });

      console.log('✅ [TaskService] Categories task execution completed', {
        taskId: task.id,
        success: result.success,
        stepType,
        duration: result.duration
      });

      return {
        success: result.success,
        taskId: task.id,
        result: result.data,
        message: result.success ? 
          `Task completed successfully: ${task.title}` :
          `Task failed: ${task.title}`,
        metadata: {
          executionMethod: 'categories',
          stepType,
          duration: result.duration,
          timestamp: new Date()
        }
      };

    } catch (error) {
      console.error('❌ [TaskService] Categories task execution failed:', error);
      throw error;
    }
  }

  /**
   * Determine step type based on task type
   * @param {Object} task - Task object
   * @returns {string} Step type
   */
  determineStepType(task) {
    const taskType = task.type?.value;
    
    switch (taskType) {
      case 'analysis':
        return 'AnalysisStep';
      case 'refactoring':
        return 'RefactoringStep';
      case 'testing':
        return 'TestingStep';
      case 'documentation':
        return 'DocumentationStep';
      default:
        return 'AnalysisStep';
    }
  }
}
```

## Success Criteria
- [ ] All unified workflow files successfully removed
- [ ] Service dependencies updated to use Categories only
- [ ] WorkflowOrchestrationService updated and working
- [ ] TaskService updated and working
- [ ] No broken imports or references
- [ ] All removal validation tests passing
- [ ] Categories-based patterns working correctly

## Risk Mitigation
- **System Breakage**: Comprehensive testing after each file removal
- **Lost Functionality**: Ensure Categories system provides equivalent functionality
- **Import Errors**: Validate all imports resolve correctly
- **Service Failures**: Test service functionality after updates

## Next Phase Dependencies
This phase must complete successfully before Phase 3 can begin. All core unified system files must be removed and services must be updated to use Categories-only patterns. 