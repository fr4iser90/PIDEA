const Task = require('@/domain/entities/Task');
const TaskStatus = require('@/domain/value-objects/TaskStatus');
const TaskPriority = require('@/domain/value-objects/TaskPriority');
const TaskType = require('@/domain/value-objects/TaskType');

/**
 * TaskService - Business logic for project-based task management
 */
class TaskService {
  constructor(taskRepository, aiService, projectAnalyzer, cursorIDEService = null, autoFinishSystem, workflowGitService = null) {
    this.taskRepository = taskRepository;
    this.aiService = aiService;
    this.projectAnalyzer = projectAnalyzer;
    this.cursorIDEService = cursorIDEService;
    this.autoFinishSystem = autoFinishSystem;
    this.workflowGitService = workflowGitService;
  }

  buildRefactoringPrompt(task) {
    const file = task.metadata?.filePath || task.metadata?.originalFile || 'UNKNOWN FILE';
    const title = task.title || 'Refactor File';
    const description = task.description || '';
    const steps = Array.isArray(task.metadata?.refactoringSteps) ? task.metadata.refactoringSteps : [];
    let prompt = `Refactor the following file for better maintainability and structure.\n\n`;
    prompt += `File: ${file}\n`;
    prompt += `Task: ${title}\n`;
    if (description) prompt += `Description: ${description}\n`;
    if (steps.length) {
      prompt += `\nRefactoring Steps:\n`;
      steps.forEach((step, i) => {
        prompt += `${i + 1}. ${step}\n`;
      });
    }
    prompt += `\nDo not change any business logic. Only split, extract, and organize code as described.\n`;
    prompt += `Apply all changes directly in the IDE. Do not output explanations.\n`;
    return prompt;
  }

  async buildTaskExecutionPrompt(task) {
    console.log('🔍 [TaskService] buildTaskExecutionPrompt called for task:', {
      id: task.id,
      title: task.title,
      type: task.type?.value,
      hasTaskFilePath: !!task.metadata?.taskFilePath
    });
    
    // Lade task-execute.md Prompt über neue API
    let taskExecutePrompt = '';
    try {
      console.log('🔍 [TaskService] Loading task-execute.md via new API...');
      const response = await fetch('http://localhost:3000/api/content/prompts/task-management/task-execute.md');
      console.log('🔍 [TaskService] API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.content) {
          taskExecutePrompt = data.data.content;
          console.log('✅ [TaskService] Successfully loaded task-execute.md, length:', taskExecutePrompt.length);
        } else {
          throw new Error('Invalid API response format');
        }
      } else {
        throw new Error(`Failed to load task-execute.md: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ [TaskService] Error reading task-execute.md via API:', error);
      taskExecutePrompt = 'Execute the following task:\n\n';
    }

    // Für Doc Tasks: Verwende den Markdown-Inhalt der Datei als Prompt
    if (task.metadata?.taskFilePath) {
      try {
        const taskFilePath = path.resolve(task.metadata.taskFilePath);
        const markdownContent = fs.readFileSync(taskFilePath, 'utf8');
        
        // Kombiniere: task-execute.md + Task-Inhalt
        const finalPrompt = `${taskExecutePrompt}\n\n${markdownContent}`;
        console.log('✅ [TaskService] Final prompt for doc task (first 500 chars):', finalPrompt.substring(0, 500));
        return finalPrompt;
      } catch (error) {
        console.error('❌ [TaskService] Error reading task file:', error);
        const fallbackPrompt = `${taskExecutePrompt}\n\n${task.title}\n\n${task.description || ''}`;
        console.log('⚠️ [TaskService] Using fallback prompt for doc task');
        return fallbackPrompt;
      }
    }
    
    // Für normale Tasks: Verwende task-execute.md + Task-Details
    const finalPrompt = `${taskExecutePrompt}\n\n${task.title}\n\n${task.description || ''}`;
    console.log('✅ [TaskService] Final prompt for normal task (first 500 chars):', finalPrompt.substring(0, 500));
    return finalPrompt;
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

      // CRITICAL: Create new chat ONLY at the start of task execution
      if (this.cursorIDEService && this.cursorIDEService.browserManager) {
        console.log('🆕 [TaskService] Creating new chat for task execution...');
        await this.cursorIDEService.browserManager.clickNewChat();
        // Wait for new chat to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
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
      // Get projectPath from task metadata
      const projectPath = task.metadata.projectPath;
      
      console.log('🔍 [TaskService] Task details:', {
        id: task.id,
        title: task.title,
        projectPath: projectPath,
        filePath: task.metadata.filePath,
        type: task.type.value
      });
      
      execution.steps.push({ step: 'git_branch', status: 'running', message: 'Creating refactoring branch' });
      
      if (!projectPath) {
        throw new Error('Task has no projectPath in metadata - cannot create Git branch');
      }
      
      const branchName = `refactor/${task.type.value}-${taskId}-${Date.now()}`;
      const gitResult = await this.createRefactoringBranch(projectPath, branchName);
        
        execution.steps[execution.steps.length - 1] = { 
          step: 'git_branch', 
          status: 'completed', 
          message: `Created branch: ${branchName}`,
          data: gitResult
        };
        execution.progress = 20;

        // Step 2: AI-Powered Refactoring with Validation Loop
        console.log('🤖 [TaskService] Step 2: AI-powered refactoring with validation...');
        execution.steps.push({ step: 'ai_refactoring', status: 'running', message: 'Executing AI refactoring' });
        
        let refactoringResult;
        let buildValid = false;
        let attemptCount = 0;
        const maxAttempts = 3;
        
        while (!buildValid && attemptCount < maxAttempts) {
          attemptCount++;
          console.log(`🔄 [TaskService] Refactoring attempt ${attemptCount}/${maxAttempts}`);
          
          // Execute AI refactoring
          refactoringResult = await this.executeAIRefactoringWithAutoFinish(task);
          
          if (!refactoringResult.success) {
            throw new Error(`AI refactoring failed: ${refactoringResult.error}`);
          }
          
          // Step 3: Validate Build
          console.log('🔍 [TaskService] Step 3: Validating build...');
          execution.steps.push({ step: 'build_validation', status: 'running', message: `Validating build (attempt ${attemptCount})` });
          
          const buildResult = await this.validateBuild(task.metadata.projectPath);
          
          if (buildResult.success) {
            console.log('✅ [TaskService] Build validation successful!');
            buildValid = true;
            execution.steps[execution.steps.length - 1] = { 
              step: 'build_validation', 
              status: 'completed', 
              message: 'Build validation successful',
              data: buildResult
            };
          } else {
            console.log('❌ [TaskService] Build validation failed:', buildResult.error);
            execution.steps[execution.steps.length - 1] = { 
              step: 'build_validation', 
              status: 'failed', 
              message: `Build validation failed (attempt ${attemptCount})`,
              data: buildResult
            };
            
            // Send error back to AI for fixing
            if (attemptCount < maxAttempts) {
              console.log('🔄 [TaskService] Sending error to AI for fixing...');
              const errorPrompt = this.buildErrorFixPrompt(task, buildResult.error);
              await this.cursorIDEService.chatMessageHandler.sendMessage(errorPrompt, {
                waitForResponse: true,
                timeout: 120000
              });
            }
          }
        }
        
        if (!buildValid) {
          throw new Error(`Build validation failed after ${maxAttempts} attempts`);
        }
        
        execution.steps[execution.steps.length - 1] = { 
          step: 'ai_refactoring', 
          status: 'completed', 
          message: 'AI refactoring completed with successful build',
          data: refactoringResult
        };
        execution.progress = 80;

        // Step 4: Task completed successfully
        console.log('✅ [TaskService] Step 4: Task completed successfully with valid build');
        execution.steps.push({ step: 'completion', status: 'completed', message: 'Task completed with successful build validation' });
        execution.progress = 100;

        // Mark task as completed
        task.updateStatus(TaskStatus.COMPLETED);
        await this.taskRepository.update(taskId, task);

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
    // Use WorkflowGitService if available for better branch strategies
    if (this.workflowGitService) {
      const tempTask = {
        id: 'temp-task',
        title: 'Temporary task',
        type: { value: 'refactoring' },
        metadata: { projectPath }
      };
      
      return await this.workflowGitService.createWorkflowBranch(projectPath, tempTask, {
        customBranchName: branchName
      });
    }

    // Fallback to direct Git operations
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
   * Execute AI-powered refactoring with Auto-Finish System integration
   * @param {Object} task - Task object
   * @returns {Promise<Object>} Refactoring result
   */
  async executeAIRefactoringWithAutoFinish(task) {
    try {
      // Build AI prompt for task execution
      const aiPrompt = await this.buildTaskExecutionPrompt(task);
      
      // Use Auto-Finish System if available
      if (this.autoFinishSystem && this.cursorIDEService) {
        console.log('🤖 [TaskService] Using Auto-Finish System for AI refactoring...');
        
        // Create temporary task for Auto-Finish processing
        const tempTask = {
          id: task.id,
          description: task.title || task.description,
          type: task.type?.value || 'refactoring',
          metadata: task.metadata || {}
        };
        
        // Process with Auto-Finish confirmation loops and fallback detection
        const autoFinishResult = await this.autoFinishSystem.processTask(tempTask, `task-${task.id}`, {
          stopOnError: false,
          maxConfirmationAttempts: 3,
          confirmationTimeout: 10000,
          fallbackDetectionEnabled: true
        });
        
        console.log('✅ [TaskService] Auto-Finish processing completed:', {
          success: autoFinishResult.success,
          status: autoFinishResult.status,
          duration: autoFinishResult.duration
        });
        
        // Handle different Auto-Finish results
        if (autoFinishResult.status === 'paused') {
          throw new Error(`Task requires user input: ${autoFinishResult.reason}`);
        }
        
        if (!autoFinishResult.success) {
          throw new Error(`Auto-Finish processing failed: ${autoFinishResult.error || 'Unknown error'}`);
        }
        
        return {
          success: true,
          prompt: aiPrompt,
          aiResponse: autoFinishResult.aiResponse,
          message: 'AI refactoring completed with Auto-Finish confirmation',
          duration: autoFinishResult.duration,
          timestamp: new Date(),
          autoFinishResult: autoFinishResult
        };
        
      } else {
        // Fallback to original simple approach
        console.log('⚠️ [TaskService] Auto-Finish System not available, using fallback approach...');
        return await this.executeAIRefactoring(task);
      }
    } catch (error) {
      throw new Error(`AI refactoring with Auto-Finish failed: ${error.message}`);
    }
  }

  /**
   * Execute AI-powered refactoring
   * @param {Object} task - Task object
   * @returns {Promise<Object>} Refactoring result
   */
  async executeAIRefactoring(task) {
    try {
      // Build AI prompt for task execution (uses markdown content for doc tasks)
      const aiPrompt = await this.buildTaskExecutionPrompt(task);
      
      // Use the same working chat mechanism as the frontend
      if (this.cursorIDEService) {
        // Try to send via ChatMessageHandler first
        if (this.cursorIDEService.chatMessageHandler) {
          console.log('🤖 [TaskService] Sending refactoring prompt and waiting for AI to finish editing...');
          const result = await this.cursorIDEService.chatMessageHandler.sendMessage(aiPrompt, {
            waitForResponse: true,
            timeout: 120000, // 2 minutes timeout
            checkInterval: 2000 // Check every 2 seconds
          });
          
          console.log('✅ [TaskService] AI finished editing:', {
            success: result.success,
            responseLength: result.response?.length || 0,
            duration: result.duration
          });
          
          return {
            success: result.success,
            prompt: aiPrompt,
            aiResponse: result.response,
            message: result.success ? 'AI finished editing codebase' : 'AI editing timed out',
            duration: result.duration,
            timestamp: new Date()
          };
        } else {
          // Fallback: use the sendMessage method directly
          await this.cursorIDEService.sendMessage(aiPrompt);
          console.log('✅ [TaskService] Refactoring prompt sent via sendMessage (no response waiting)');
          
          return {
            success: true,
            prompt: aiPrompt,
            message: 'Refactoring prompt sent to IDE chat (no response waiting)',
            timestamp: new Date()
          };
        }
      } else {
        console.log('⚠️ [TaskService] CursorIDEService nicht verfügbar!');
        throw new Error('CursorIDEService not available');
      }
    } catch (error) {
      throw new Error(`AI refactoring failed: ${error.message}`);
    }
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
      // WE ARE CURSOR IDE! So we'll apply the changes directly to the file
      console.log('🎭 [TaskService] Applying refactoring changes directly to file...');
      
      const fs = require('fs');
      const path = require('path');
      
      // Create backup of original file
      const backupPath = `${task.metadata.filePath}.backup.${Date.now()}`;
      fs.copyFileSync(task.metadata.filePath, backupPath);
      console.log('📦 [TaskService] Created backup:', backupPath);
      
      // Apply the refactored code to the file
      if (!refactoringResult.refactoredCode) {
        throw new Error('Refactored code is undefined - cannot write to file');
      }
      fs.writeFileSync(task.metadata.filePath, refactoringResult.refactoredCode);
      console.log('✅ [TaskService] Applied refactored code to:', task.metadata.filePath);
      
      return {
        success: true,
        backupPath,
        message: 'Refactored code applied directly to file',
        appliedAt: new Date()
      };
    } catch (error) {
      throw new Error(`File integration failed: ${error.message}`);
    }
  }

  /**
   * Validate build after AI refactoring
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Build validation result
   */
  async validateBuild(projectPath) {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);

      console.log('🔍 [TaskService] Running build validation...');

      // Try common build commands
      const buildCommands = [
        'npm run build',
        'yarn build', 
        'npm run test',
        'yarn test',
        'npm run lint',
        'yarn lint'
      ];

      let buildResult = { success: false, error: 'No build commands found' };

      for (const command of buildCommands) {
        try {
          console.log(`🔍 [TaskService] Trying: ${command}`);
          const { stdout, stderr } = await execAsync(command, { 
            cwd: projectPath, 
            timeout: 60000 // 1 minute timeout
          });
          
          buildResult = { 
            success: true, 
            command,
            output: stdout,
            stderr: stderr,
            message: `Build validation passed with ${command}`,
            timestamp: new Date()
          };
          console.log(`✅ [TaskService] Build validation successful with ${command}`);
          break;
        } catch (error) {
          console.log(`❌ [TaskService] ${command} failed:`, error.message);
          // Continue to next command
        }
      }

      return buildResult;

    } catch (error) {
      console.error('❌ [TaskService] Build validation error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Build error fix prompt for AI
   * @param {Object} task - Task object
   * @param {string} error - Build error message
   * @returns {string} Error fix prompt
   */
  buildErrorFixPrompt(task, error) {
    return `The build validation failed with the following error:

${error}

Please fix the issues in the code and ensure the build passes. Focus on:
1. Syntax errors
2. Import/export issues  
3. Missing dependencies
4. Type errors (if using TypeScript)

The file being refactored is: ${task.metadata.filePath}

Please fix the issues and let me know when you're done.`;
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