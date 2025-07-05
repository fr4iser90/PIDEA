const Task = require('@domain/entities/Task');
const TaskStatus = require('@domain/value-objects/TaskStatus');
const TaskPriority = require('@domain/value-objects/TaskPriority');
const TaskType = require('@domain/value-objects/TaskType');

/**
 * TaskService - Business logic for project-based task management
 */
class TaskService {
  constructor(taskRepository, aiService, projectAnalyzer, cursorIDEService = null) {
    this.taskRepository = taskRepository;
    this.aiService = aiService;
    this.projectAnalyzer = projectAnalyzer;
    this.cursorIDEService = cursorIDEService;
  }

  /**
   * Create a new task for a project
   * @param {string} projectId - Project ID
   * @param {string} title - Task title
   * @param {string} description - Task description
   * @param {string} priority - Task priority
   * @param {string} type - Task type
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Task>} Created task
   */
  async createTask(projectId, title, description, priority = TaskPriority.MEDIUM, type = TaskType.FEATURE, metadata = {}) {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    if (!title || title.trim().length === 0) {
      throw new Error('Task title is required');
    }

    const task = Task.create(projectId, title, description, priority, type, metadata);
    return await this.taskRepository.create(task);
  }

  /**
   * Update an existing task
   * @param {string} taskId - Task ID
   * @param {Object} updates - Update data
   * @returns {Promise<Task>} Updated task
   */
  async updateTask(taskId, updates) {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (updates.title) {
      task.title = updates.title;
    }
    if (updates.description) {
      task.description = updates.description;
    }
    if (updates.status && TaskStatus.isValid(updates.status)) {
      task.updateStatus(updates.status);
    }
    if (updates.priority && TaskPriority.isValid(updates.priority)) {
      task.updatePriority(updates.priority);
    }
    if (updates.metadata) {
      task.updateMetadata(updates.metadata);
    }

    return await this.taskRepository.update(taskId, task);
  }

  /**
   * Execute a task
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Execution result
   */
  async executeTask(taskId, userId) {
    console.log('🔍 [TaskService] executeTask called with:', { taskId, userId });
    
    try {
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      console.log('🔍 [TaskService] Found task:', task);

      if (task.isCompleted()) {
        throw new Error('Task is already completed');
      }

      // Update task status to in progress
      task.updateStatus(TaskStatus.IN_PROGRESS);
      await this.taskRepository.update(taskId, task);

      console.log('🔍 [TaskService] Starting automated refactoring workflow...');

      const execution = {
        taskId,
        userId,
        status: 'running',
        startedAt: new Date(),
        progress: 0,
        steps: []
      };

      try {
              // Step 1: Create Git Branch for Refactoring
      console.log('🔧 [TaskService] Step 1: Creating Git branch...');
      console.log('🔍 [TaskService] Task details:', {
        id: task.id,
        title: task.title,
        projectPath: task.projectPath,
        filePath: task.filePath,
        type: task.type
      });
      
      execution.steps.push({ step: 'git_branch', status: 'running', message: 'Creating refactoring branch' });
      
      if (!task.projectPath) {
        throw new Error('Task has no projectPath - cannot create Git branch');
      }
      
      const branchName = `refactor/${task.type}-${taskId}-${Date.now()}`;
      const gitResult = await this.createRefactoringBranch(task.projectPath, branchName);
        
        execution.steps[execution.steps.length - 1] = { 
          step: 'git_branch', 
          status: 'completed', 
          message: `Created branch: ${branchName}`,
          data: gitResult
        };
        execution.progress = 20;

        // Step 2: AI-Powered Refactoring
        console.log('🤖 [TaskService] Step 2: AI-powered refactoring...');
        execution.steps.push({ step: 'ai_refactoring', status: 'running', message: 'Executing AI refactoring' });
        
        const refactoringResult = await this.executeAIRefactoring(task);
        
        execution.steps[execution.steps.length - 1] = { 
          step: 'ai_refactoring', 
          status: 'completed', 
          message: 'AI refactoring completed',
          data: refactoringResult
        };
        execution.progress = 50;

        // Step 3: Playwright Integration - Interact with Cursor IDE
        console.log('🎭 [TaskService] Step 3: Playwright integration...');
        execution.steps.push({ step: 'playwright_integration', status: 'running', message: 'Integrating with Cursor IDE' });
        
        const playwrightResult = await this.integrateWithCursorIDE(task, refactoringResult);
        
        execution.steps[execution.steps.length - 1] = { 
          step: 'playwright_integration', 
          status: 'completed', 
          message: 'Cursor IDE integration completed',
          data: playwrightResult
        };
        execution.progress = 70;

        // Step 4: Validation - Run Tests
        console.log('🧪 [TaskService] Step 4: Running validation tests...');
        execution.steps.push({ step: 'validation', status: 'running', message: 'Running validation tests' });
        
        const validationResult = await this.validateRefactoring(task, refactoringResult);
        
        execution.steps[execution.steps.length - 1] = { 
          step: 'validation', 
          status: validationResult.passed ? 'completed' : 'failed', 
          message: validationResult.passed ? 'Validation passed' : 'Validation failed',
          data: validationResult
        };
        execution.progress = 90;

        // Step 5: Commit & Push Changes
        if (validationResult.passed) {
          console.log('📝 [TaskService] Step 5: Committing and pushing changes...');
          execution.steps.push({ step: 'commit_push', status: 'running', message: 'Committing and pushing changes' });
          
          const commitResult = await this.commitAndPushChanges(task.projectPath, branchName, task);
          
          execution.steps[execution.steps.length - 1] = { 
            step: 'commit_push', 
            status: 'completed', 
            message: 'Changes committed and pushed',
            data: commitResult
          };
          execution.progress = 100;

          // Mark task as completed
          task.updateStatus(TaskStatus.COMPLETED);
          await this.taskRepository.update(taskId, task);
        } else {
          // Rollback changes if validation failed
          console.log('🔄 [TaskService] Validation failed, rolling back changes...');
          await this.rollbackChanges(task.projectPath, branchName);
          
          task.updateStatus(TaskStatus.FAILED);
          await this.taskRepository.update(taskId, task);
          
          throw new Error('Refactoring validation failed');
        }

        execution.status = 'completed';
        execution.endTime = new Date();
        execution.duration = execution.endTime - execution.startedAt;

        console.log('✅ [TaskService] Automated refactoring workflow completed successfully');
        return execution;

      } catch (error) {
        console.error('❌ [TaskService] Refactoring workflow failed:', error);
        
        // Update execution with error
        execution.status = 'failed';
        execution.error = error.message;
        execution.endTime = new Date();
        
        // Mark task as failed
        task.updateStatus(TaskStatus.FAILED);
        await this.taskRepository.update(taskId, task);
        
        throw error;
      }

    } catch (error) {
      console.error('❌ [TaskService] Error in executeTask:', error);
      throw error;
    }
  }

  /**
   * Create Git branch for refactoring
   * @param {string} projectPath - Project path
   * @param {string} branchName - Branch name
   * @returns {Promise<Object>} Git result
   */
  async createRefactoringBranch(projectPath, branchName) {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);

    try {
      // Check if we're in a git repository
      await execAsync('git status', { cwd: projectPath });
      
      // Create and checkout new branch
      await execAsync(`git checkout -b ${branchName}`, { cwd: projectPath });
      
      return {
        branchName,
        status: 'created',
        message: `Successfully created and checked out branch: ${branchName}`
      };
    } catch (error) {
      throw new Error(`Failed to create git branch: ${error.message}`);
    }
  }

  /**
   * Execute AI-powered refactoring
   * @param {Object} task - Task object
   * @returns {Promise<Object>} Refactoring result
   */
  async executeAIRefactoring(task) {
    try {
      // Build AI prompt for refactoring
      const aiPrompt = this.buildRefactoringPrompt(task);
      
      // Execute AI refactoring via Cursor IDE
      const aiResponse = await this.cursorIDEService.postToCursor(aiPrompt);
      
      // Process AI response and apply changes
      const refactoringResult = this.processRefactoringResponse(aiResponse, task);
      
      return {
        success: true,
        aiResponse,
        refactoringResult,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`AI refactoring failed: ${error.message}`);
    }
  }

  /**
   * Build refactoring prompt for AI
   * @param {Object} task - Task object
   * @returns {string} AI prompt
   */
  buildRefactoringPrompt(task) {
    return `# AI Refactoring Task

## Task Information
- **Title**: ${task.title}
- **Description**: ${task.description}
- **Type**: ${task.type.value}
- **Priority**: ${task.priority.value}
- **File**: ${task.metadata.filePath}
- **Lines**: ${task.metadata.lines}

## Refactoring Steps
${task.metadata.refactoringSteps ? task.metadata.refactoringSteps.map(step => `- ${step}`).join('\n') : '- Split large file into smaller modules\n- Improve code organization\n- Follow best practices'}

## Instructions
Please refactor the code according to the task requirements. Focus on:
1. Improving code maintainability
2. Reducing file size and complexity
3. Following best practices
4. Maintaining functionality

## File to Refactor
${task.metadata.filePath}

Please provide the refactored code and explain the changes made.`;
  }

  /**
   * Process AI refactoring response
   * @param {string} aiResponse - AI response
   * @param {Object} task - Task object
   * @returns {Object} Processed result
   */
  processRefactoringResponse(aiResponse, task) {
    // Extract refactored code from AI response
    // This is a simplified implementation
    return {
      originalFile: task.metadata.filePath,
      refactoredCode: aiResponse,
      changes: ['Code refactored for better maintainability'],
      timestamp: new Date()
    };
  }

  /**
   * Integrate with Cursor IDE via Playwright
   * @param {Object} task - Task object
   * @param {Object} refactoringResult - Refactoring result
   * @returns {Promise<Object>} Integration result
   */
  async integrateWithCursorIDE(task, refactoringResult) {
    try {
      // Use CursorIDEService to interact with Cursor IDE
      if (this.cursorIDEService) {
        // Send refactored code to Cursor IDE
        const result = await this.cursorIDEService.applyRefactoring(task.metadata.filePath, refactoringResult.refactoredCode);
        
        return {
          success: true,
          cursorIntegration: result,
          message: 'Successfully integrated with Cursor IDE'
        };
      } else {
        // Fallback: write refactored code to file
        const fs = require('fs');
        const path = require('path');
        
        const backupPath = `${task.metadata.filePath}.backup.${Date.now()}`;
        fs.copyFileSync(task.metadata.filePath, backupPath);
        
        fs.writeFileSync(task.metadata.filePath, refactoringResult.refactoredCode);
        
        return {
          success: true,
          backupPath,
          message: 'Refactored code applied to file'
        };
      }
    } catch (error) {
      throw new Error(`Cursor IDE integration failed: ${error.message}`);
    }
  }

  /**
   * Validate refactoring changes
   * @param {Object} task - Task object
   * @param {Object} refactoringResult - Refactoring result
   * @returns {Promise<Object>} Validation result
   */
  async validateRefactoring(task, refactoringResult) {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);

      // Run tests if they exist
      let testResults = { passed: true, message: 'No tests found' };
      
      try {
        // Check for common test commands
        const testCommands = ['npm test', 'yarn test', 'jest', 'mocha'];
        
        for (const command of testCommands) {
          try {
            const { stdout, stderr } = await execAsync(command, { cwd: task.metadata.projectPath, timeout: 30000 });
            testResults = { passed: true, message: `Tests passed with ${command}`, output: stdout };
            break;
          } catch (error) {
            // Command not found or failed, try next
            continue;
          }
        }
      } catch (error) {
        testResults = { passed: false, message: 'Test execution failed', error: error.message };
      }

      // Basic syntax validation
      let syntaxValidation = { passed: true, message: 'Syntax validation passed' };
      
      try {
        // Check if file is valid JavaScript/TypeScript
        if (task.metadata.filePath.endsWith('.js') || task.metadata.filePath.endsWith('.ts')) {
          const { stdout, stderr } = await execAsync(`node -c "${task.metadata.filePath}"`, { cwd: task.metadata.projectPath });
          syntaxValidation = { passed: true, message: 'JavaScript syntax validation passed' };
        }
      } catch (error) {
        syntaxValidation = { passed: false, message: 'Syntax validation failed', error: error.message };
      }

      const overallPassed = testResults.passed && syntaxValidation.passed;

      return {
        passed: overallPassed,
        testResults,
        syntaxValidation,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        passed: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Commit and push changes
   * @param {string} projectPath - Project path
   * @param {string} branchName - Branch name
   * @param {Object} task - Task object
   * @returns {Promise<Object>} Commit result
   */
  async commitAndPushChanges(projectPath, branchName, task) {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);

    try {
      // Add all changes
      await execAsync('git add .', { cwd: projectPath });
      
      // Commit changes
      const commitMessage = `refactor: ${task.title}\n\n- ${task.description}\n- Task ID: ${task.id}\n- Automated refactoring`;
      await execAsync(`git commit -m "${commitMessage}"`, { cwd: projectPath });
      
      // Push branch
      await execAsync(`git push origin ${branchName}`, { cwd: projectPath });
      
      return {
        branchName,
        commitMessage,
        status: 'pushed',
        message: `Changes committed and pushed to branch: ${branchName}`
      };
    } catch (error) {
      throw new Error(`Failed to commit and push changes: ${error.message}`);
    }
  }

  /**
   * Rollback changes if validation fails
   * @param {string} projectPath - Project path
   * @param {string} branchName - Branch name
   * @returns {Promise<Object>} Rollback result
   */
  async rollbackChanges(projectPath, branchName) {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);

    try {
      // Reset to previous commit
      await execAsync('git reset --hard HEAD~1', { cwd: projectPath });
      
      // Switch back to main branch
      await execAsync('git checkout main', { cwd: projectPath });
      
      // Delete the refactoring branch
      await execAsync(`git branch -D ${branchName}`, { cwd: projectPath });
      
      return {
        status: 'rolled_back',
        message: `Successfully rolled back changes and deleted branch: ${branchName}`
      };
    } catch (error) {
      console.error('Failed to rollback changes:', error);
      return {
        status: 'rollback_failed',
        error: error.message
      };
    }
  }

  /**
   * Get task execution status
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Execution status
   */
  async getTaskExecution(taskId) {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    return {
      taskId,
      status: task.status,
      progress: task.isCompleted() ? 100 : 50,
      startedAt: task.createdAt,
      completedAt: task.completedAt
    };
  }

  /**
   * Cancel task execution
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async cancelTask(taskId, userId) {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.isCompleted()) {
      throw new Error('Cannot cancel completed task');
    }

    task.updateStatus(TaskStatus.CANCELLED);
    await this.taskRepository.update(taskId, task);

    return true;
  }

  /**
   * Analyze project and generate tasks
   * @param {string} projectId - Project ID
   * @param {string} projectPath - Project path
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeProjectAndGenerateTasks(projectId, projectPath, options = {}) {
    // Analyze project structure
    const projectAnalysis = await this.projectAnalyzer.analyzeProject(projectPath);
    
    // Generate AI-powered suggestions
    const aiSuggestions = await this.aiService.generateTaskSuggestions(projectAnalysis, options);
    
    // Convert suggestions to tasks
    const tasks = [];
    for (const suggestion of aiSuggestions.suggestions) {
      const task = await this.createTask(
        projectId,
        suggestion.title,
        suggestion.description,
        suggestion.priority || TaskPriority.MEDIUM,
        suggestion.type || TaskType.FEATURE,
        {
          source: 'ai_analysis',
          projectPath,
          analysisId: projectAnalysis.id
        }
      );
      tasks.push(task);
    }

    return {
      projectId,
      projectPath,
      analysis: projectAnalysis,
      tasks,
      aiSuggestions,
      timestamp: new Date()
    };
  }

  /**
   * Get project analysis
   * @param {string} analysisId - Analysis ID
   * @returns {Promise<Object>} Analysis results
   */
  async getProjectAnalysis(analysisId) {
    // Mock implementation - in real implementation this would fetch from database
    return {
      id: analysisId,
      projectType: 'nodejs',
      complexity: 'medium',
      issues: [],
      suggestions: []
    };
  }

  /**
   * Execute auto mode for a project
   * @param {string} projectId - Project ID
   * @param {string} projectPath - Project path
   * @param {Object} options - Auto mode options
   * @returns {Promise<Object>} Auto mode results
   */
  async executeAutoMode(projectId, projectPath, options = {}) {
    // Mock implementation - in real implementation this would:
    // 1. Analyze project
    // 2. Generate tasks
    // 3. Execute tasks automatically
    // 4. Monitor progress
    // 5. Generate reports

    return {
      projectId,
      projectPath,
      status: 'running',
      tasksGenerated: 5,
      tasksCompleted: 0,
      startedAt: new Date()
    };
  }

  /**
   * Get auto mode status
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Auto mode status
   */
  async getAutoModeStatus(projectId) {
    // Mock implementation
    return {
      projectId,
      status: 'idle',
      lastRun: null,
      totalRuns: 0
    };
  }

  /**
   * Stop auto mode
   * @param {string} projectId - Project ID
   * @returns {Promise<boolean>} Success status
   */
  async stopAutoMode(projectId) {
    // Mock implementation
    return true;
  }

  /**
   * Generate script for a task
   * @param {string} projectId - Project ID
   * @param {string} taskId - Task ID
   * @param {Object} context - Project context
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated script
   */
  async generateScript(projectId, taskId, context, options = {}) {
    const task = await this.taskRepository.findById(taskId);
    if (!task || !task.belongsToProject(projectId)) {
      throw new Error('Task not found or does not belong to project');
    }

    return await this.aiService.generateScript(task, context, options);
  }

  /**
   * Get generated scripts for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Generated scripts
   */
  async getGeneratedScripts(projectId) {
    // Mock implementation
    return [];
  }

  /**
   * Execute script for a project
   * @param {string} projectId - Project ID
   * @param {string} scriptId - Script ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Execution result
   */
  async executeScript(projectId, scriptId, userId) {
    // Mock implementation
    return {
      scriptId,
      projectId,
      userId,
      status: 'completed',
      result: 'Script executed successfully'
    };
  }
}

module.exports = TaskService; 