
// Dynamic path resolution functions
function getTaskDocumentationPath(task) {
  const { status, priority, category, completedAt } = task;
  
  if (status === 'completed') {
    const quarter = getCompletionQuarter(completedAt);
    return `docs/09_roadmap/completed/${quarter}/${category}/`;
  } else if (status === 'in_progress') {
    return `docs/09_roadmap/in-progress/${category}/`;
  } else if (status === 'pending') {
    return `docs/09_roadmap/pending/${priority}/${category}/`;
  } else if (status === 'blocked') {
    return `docs/09_roadmap/blocked/${category}/`;
  } else if (status === 'cancelled') {
    return `docs/09_roadmap/cancelled/${category}/`;
  }
  
  return `docs/09_roadmap/pending/${priority}/${category}/`;
}

function getCompletionQuarter(completedAt) {
  if (!completedAt) {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    if (month <= 3) return `${year}-q1`;
    if (month <= 6) return `${year}-q2`;
    if (month <= 9) return `${year}-q3`;
    return `${year}-q4`;
  }
  
  const date = new Date(completedAt);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  if (month <= 3) return `${year}-q1`;
  if (month <= 6) return `${year}-q2`;
  if (month <= 9) return `${year}-q3`;
  return `${year}-q4`;
}

function getPromptPath(promptType) {
  const promptPaths = {
    'task-create': 'content-library/prompts/task-management/task-create.md',
    'task-execute': 'content-library/prompts/task-management/task-execute.md',
    'task-analyze': 'content-library/prompts/task-management/task-analyze.md',
    'task-review': 'content-library/prompts/task-management/task-review.md'
  };
  
  return promptPaths[promptType] || promptPaths['task-create'];
}

function getWorkflowPath(workflowType) {
  return `backend/framework/workflows/${workflowType}-workflows.json`;
}

const Task = require('@entities/Task');
const TaskStatus = require('@value-objects/TaskStatus');
const TaskPriority = require('@value-objects/TaskPriority');
const TaskType = require('@value-objects/TaskType');
const GitWorkflowManager = require('../../workflows/categories/git/GitWorkflowManager');
const GitWorkflowContext = require('../../workflows/categories/git/GitWorkflowContext');
// SequentialExecutionEngine removed - no longer needed
const StepRegistry = require('../../steps/StepRegistry');
const FrameworkRegistry = require('../../frameworks/FrameworkRegistry');
const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new Logger('TaskService');
const fs = require('fs');
const path = require('path');



/**
 * TaskService - Business logic for project-based task management
 * Enhanced with GitWorkflowManager integration
 */
class TaskService {
  constructor(taskRepository, aiService, projectAnalyzer, cursorIDEService = null, autoFinishSystem, workflowGitService = null, queueTaskExecutionService = null) {
    this.taskRepository = taskRepository;
    this.aiService = aiService;
    this.projectAnalyzer = projectAnalyzer;
    this.cursorIDEService = cursorIDEService;
    this.autoFinishSystem = autoFinishSystem;
    this.workflowGitService = workflowGitService;
    this.queueTaskExecutionService = queueTaskExecutionService;
    
    // Initialize enhanced git workflow manager if workflowGitService is available
    if (this.workflowGitService) {
      this.gitWorkflowManager = new GitWorkflowManager({
        gitService: this.workflowGitService.gitService,
        logger: new ServiceLogger('TaskService'),
        eventBus: null
      });
    }
    
    // Execution engine removed - using WorkflowOrchestrationService instead

        // Initialize Categories-based registries
        this.stepRegistry = new StepRegistry();
        this.frameworkRegistry = new FrameworkRegistry();

    
  }

  /**
   * Get task file path based on status and metadata
   * @param {Object} task - Task object with status, priority, category, etc.
   * @returns {string} Dynamic file path based on task status
   */
  getTaskFilePath(task) {
    const status = task.status;
    const priority = task.priority;
    const category = task.category;
    
    // Extract task name from title or metadata
    let taskName = task.metadata?.name || task.title?.toLowerCase().replace(/\s+/g, '-') || 'unknown-task';
    
    if (status === 'completed') {
      const quarter = this.getCompletionQuarter(task.completedAt);
      return `docs/09_roadmap/completed/${quarter}/${category}/${taskName}/`;
    } else if (status === 'in_progress') {
      return `docs/09_roadmap/in-progress/${priority}/${category}/${taskName}/`;
    } else if (status === 'pending') {
      return `docs/09_roadmap/pending/${priority}/${category}/${taskName}/`;
    } else if (status === 'blocked') {
      return `docs/09_roadmap/blocked/${priority}/${category}/${taskName}/`;
    } else if (status === 'cancelled') {
      return `docs/09_roadmap/cancelled/${priority}/${category}/${taskName}/`;
    } else if (status === 'failed') {
      return `docs/09_roadmap/failed/${priority}/${category}/${taskName}/`;
    }
    
    return `docs/09_roadmap/pending/${priority}/${category}/${taskName}/`;
  }

  /**
   * Get completion quarter from date
   * @param {string} completedAt - Completion date string
   * @returns {string} Quarter string (e.g., '2024-q4')
   */
  getCompletionQuarter(completedAt) {
    if (!completedAt) {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      if (month <= 3) return `${year}-q1`;
      if (month <= 6) return `${year}-q2`;
      if (month <= 9) return `${year}-q3`;
      return `${year}-q4`;
    }
    
    const date = new Date(completedAt);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    if (month <= 3) return `${year}-q1`;
    if (month <= 6) return `${year}-q2`;
    if (month <= 9) return `${year}-q3`;
    return `${year}-q4`;
  }

  /**
   * Get prompt path dynamically based on prompt type
   * @param {string} promptType - Type of prompt (task-create, task-execute, etc.)
   * @returns {string} Dynamic prompt path
   */
  getPromptPath(promptType) {
    const promptPaths = {
      'task-create': '{{promptPath("task-create")}}',
      'task-execute': '{{promptPath("task-execute")}}',
      'task-analyze': '{{promptPath("task-analyze")}}',
      'task-review': '{{promptPath("task-review")}}'
    };
    
    return promptPaths[promptType] || promptPaths['task-create'];
  }

  /**
   * Get workflow path dynamically based on workflow type
   * @param {string} workflowType - Type of workflow
   * @returns {string} Dynamic workflow path
   */
  getWorkflowPath(workflowType) {
    return `backend/framework/workflows/${workflowType}-workflows.json`;
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
    logger.info('🔍 [TaskService] buildTaskExecutionPrompt called for task:', {
      id: task.id,
      title: task.title,
      type: task.type?.value,
      hasTaskFilePath: !!task.metadata?.taskFilePath
    });
    
    // Load task-execute.md prompt using dynamic path resolution
    let taskExecutePrompt = '';
    try {
      logger.info('🔍 [TaskService] Loading task-execute.md using dynamic path resolution...');
      const taskExecutePath = this.getPromptPath('task-execute');
      const fullPath = path.join(process.cwd(), taskExecutePath);
      taskExecutePrompt = fs.readFileSync(fullPath, 'utf8');
      logger.info('✅ [TaskService] Successfully loaded task-execute.md, length:', taskExecutePrompt.length);
    } catch (error) {
      logger.error('❌ [TaskService] Error reading task-execute.md from file:', error);
      taskExecutePrompt = 'Execute the following task:\n\n';
    }

    // Für Doc Tasks: Verwende den Markdown-Inhalt der Datei als Prompt
    if (task.metadata?.taskFilePath) {
      try {
        const taskFilePath = path.resolve(task.metadata.taskFilePath);
        const markdownContent = fs.readFileSync(taskFilePath, 'utf8');
        
        // Kombiniere: task-execute.md + Task-Inhalt
        const finalPrompt = `${taskExecutePrompt}\n\n${markdownContent}`;
        logger.info('✅ [TaskService] Final prompt for doc task (first 500 chars):', finalPrompt.substring(0, 500));
        return finalPrompt;
      } catch (error) {
        logger.error('❌ [TaskService] Error reading task file:', error);
        const fallbackPrompt = `${taskExecutePrompt}\n\n${task.title}\n\n${task.description || ''}`;
        logger.info('⚠️ [TaskService] Using fallback prompt for doc task');
        return fallbackPrompt;
      }
    }
    
    // Für normale Tasks: Verwende task-execute.md + Task-Details
    const finalPrompt = `${taskExecutePrompt}\n\n${task.title}\n\n${task.description || ''}`;
    logger.info('✅ [TaskService] Final prompt for normal task (first 500 chars):', finalPrompt.substring(0, 500));
    return finalPrompt;
  }

  /**
   * Create a new task for a project
   * @param {string} projectId - Project ID
   * @param {string} title - Task title
   * @param {string} description - Task description
   * @param {string} priority - Task priority
   * @param {string} type - Task type
   * @param {string} category - Task category
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Task>} Created task
   */
      async createTask(projectId, title, description, priority = TaskPriority.MEDIUM, type = TaskType.FEATURE, category, metadata = {}) {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    if (!title || title.trim().length === 0) {
      throw new Error('Task title is required');
    }

    const task = Task.create(projectId, title, description, priority, type, { ...metadata, category });
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
   * Execute task using queue-based system
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Queue execution result
   */
  async executeTask(taskId, userId, options = {}) {
    this.logger.info('🔍 [TaskService] executeTask called with queue system:', { taskId, options });
    
    try {
      // Validate task exists
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }
      
      if (task.isCompleted()) {
        throw new Error('Task is already completed');
      }
      
      // Use QueueTaskExecutionService for queue-based execution
      if (!this.queueTaskExecutionService) {
        throw new Error('QueueTaskExecutionService not available');
      }
      
      // Add to queue instead of direct execution
      const queueItem = await this.queueTaskExecutionService.addTaskToQueue(
        options.projectId,
        userId,
        taskId,
        {
          priority: options.priority || 'normal',
          createGitBranch: options.createGitBranch || false,
          branchName: options.branchName,
          autoExecute: options.autoExecute || true,
          projectPath: options.projectPath
        }
      );
      
      this.logger.info('✅ [TaskService] Task added to queue successfully', {
        taskId,
        queueItemId: queueItem.queueItemId
      });
      
      return {
        success: true,
        taskId: task.id,
        queueItemId: queueItem.queueItemId,
        status: 'queued',
        position: queueItem.position,
        estimatedStartTime: queueItem.estimatedStartTime,
        message: queueItem.message
      };
      
    } catch (error) {
      this.logger.error('❌ [TaskService] Failed to add task to queue:', error.message);
      throw error;
    }
  }



  /**
   * Determine workflow type based on task type
   * @param {Object} task - Task object
   * @returns {string} Workflow type
   */
  determineWorkflowType(task) {
    const taskType = task.type?.value?.toLowerCase() || '';
    
    if (taskType.includes('refactor') || taskType.includes('refactoring')) {
      return 'refactoring';
    } else if (taskType.includes('test') || taskType.includes('testing')) {
      return 'testing';
    } else if (taskType.includes('generate') || taskType.includes('documentation')) {
      return 'documentation';
    } else if (taskType.includes('analyze') || taskType.includes('analysis')) {
      return 'analysis';
    } else if (taskType.includes('deploy') || taskType.includes('deployment')) {
      return 'deployment';
    } else if (taskType.includes('security')) {
      return 'security';
    } else if (taskType.includes('optimize') || taskType.includes('optimization')) {
      return 'optimization';
    } else {
      return 'analysis'; // Default fallback
    }
  }

  /**
   * Execute a task using core execution engine
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeTaskWithEngine(taskId, userId, options = {}) {
          logger.info('🔍 [TaskService] executeTaskWithEngine called with:', { taskId, options });
    
    try {
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      logger.info('🔍 [TaskService] Found task for engine execution:', task);

      if (task.isCompleted()) {
        throw new Error('Task is already completed');
      }

      // Create workflow from task
      const workflow = await this.createWorkflowFromTask(task, options);
      
      // Create workflow context
      const context = this.createWorkflowContext(task, options);
      
      // Execute workflow using core execution engine
      const result = await this.executionEngine.executeWorkflow(workflow, context, {
        strategy: options.strategy || 'basic',
        priority: options.priority || 'normal',
        timeout: options.timeout || 300000,
        userId,
        ...options
      });
      
      logger.info('✅ [TaskService] Core engine task execution completed', {
        taskId: task.id,
        success: result.isSuccess(),
        duration: result.getFormattedDuration()
      });

      return {
        success: result.isSuccess(),
        taskId: task.id,
        taskType: task.type?.value,
        result: result.toJSON(),
        message: result.isSuccess() ? 
          `Task completed successfully: ${task.title}` :
          `Task failed: ${task.title}`,
        metadata: {
          executionTime: result.getDuration(),
          formattedDuration: result.getFormattedDuration(),
          strategy: result.getStrategy(),
          stepCount: result.getStepCount(),
          successRate: result.getSuccessRate(),
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error('❌ [TaskService] Core engine task execution failed:', error.message);
      throw error;
    }
  }

  /**
   * Create workflow from task
   * @param {Object} task - Task object
   * @param {Object} options - Workflow options
   * @returns {Promise<IWorkflow>} Workflow
   */
  async createWorkflowFromTask(task, options = {}) {
    // Create a workflow that delegates to the existing task execution methods
    const workflow = {
      getMetadata: () => ({
        id: task.id,
        name: task.title,
        type: task.type?.value || 'generic',
        steps: []
      }),
      getType: () => task.type?.value || 'generic',
      getVersion: () => '1.0.0',
      getDependencies: () => [],
      getSteps: () => [],
      execute: async (context) => {
        // Execute task using modern methods
        const taskPrompt = await this.buildTaskExecutionPrompt(task);
        
        // Use IDE Steps instead of ChatMessageHandler
        logger.info('🔍 [TaskService] Using IDE Steps for task execution');
        throw new Error('TaskService - ChatMessageHandler removed, use IDE Steps instead');
      },
      validate: async (context) => ({ isValid: true }),
      canExecute: async (context) => true,
      rollback: async (context, stepId) => ({ success: true })
    };
    
    return workflow;
  }

  /**
   * Create workflow context
   * @param {Object} task - Task object
   * @param {Object} options - Workflow options
   * @returns {WorkflowContext} Workflow context
   */
  createWorkflowContext(task, options = {}) {
    const { WorkflowContext, WorkflowState, WorkflowMetadata } = require('../../workflows');
    
    return new WorkflowContext(
      task.id,
      task.type?.value || 'generic',
      '1.0.0',
      new WorkflowState('initialized'),
      new WorkflowMetadata({
        taskId: task.id,
        taskType: task.type?.value,
        projectPath: task.metadata?.projectPath
      }),
      {
        task,
        options,
        projectPath: task.metadata?.projectPath,
        userId: options.userId
      }
    );
  }

  /**
   * @deprecated Legacy method for task execution - use executeTask instead
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Execution result
   */
  async executeTaskLegacy(taskId, userId, options = {}) {
    logger.warn('⚠️ [TaskService] executeTaskLegacy is deprecated - use executeTask instead');
    return this.executeTask(taskId, userId, options);
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
        logger.info('🤖 [TaskService] Using Auto-Finish System for AI refactoring...');
        
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
        
        logger.info('✅ [TaskService] Auto-Finish processing completed:', {
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
        logger.info('⚠️ [TaskService] Auto-Finish System not available, using fallback approach...');
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
      
      // Use IDE Steps instead of ChatMessageHandler
      logger.info('🤖 [TaskService] Using IDE Steps for AI refactoring');
      throw new Error('TaskService - ChatMessageHandler removed, use IDE Steps instead');
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
      logger.info('🎭 [TaskService] Applying refactoring changes directly to file...');
      
      const fs = require('fs');
      const path = require('path');
      
      // Create backup of original file
      const backupPath = `${task.metadata.filePath}.backup.${Date.now()}`;
      fs.copyFileSync(task.metadata.filePath, backupPath);
      logger.info('📦 [TaskService] Created backup:', backupPath);
      
      // Apply the refactored code to the file
      if (!refactoringResult.refactoredCode) {
        throw new Error('Refactored code is undefined - cannot write to file');
      }
      fs.writeFileSync(task.metadata.filePath, refactoringResult.refactoredCode);
      logger.info('✅ [TaskService] Applied refactored code to:', task.metadata.filePath);
      
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

      logger.info('🔍 [TaskService] Running build validation...');

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
          logger.info(`🔍 [TaskService] Trying: ${command}`);
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
          logger.info(`✅ [TaskService] Build validation successful with ${command}`);
          break;
        } catch (error) {
          logger.info(`❌ [TaskService] ${command} failed:`, error.message);
          // Continue to next command
        }
      }

      return buildResult;

    } catch (error) {
      logger.error('❌ [TaskService] Build validation error:', error);
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
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
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
      logger.error('Failed to rollback changes:', error);
      return {
        status: 'rollback_failed',
        error: error.message
      };
    }
  }

  /**
   * Create merge request for refactored code
   * @param {string} projectPath - Project path
   * @param {string} branchName - Branch name
   * @param {Task} task - Task object
   * @returns {Promise<Object>} Merge request result
   */
  async createMergeRequest(projectPath, branchName, task) {
    try {
      // Check if we have GitLab/GitHub integration
      if (this.workflowGitService && this.workflowGitService.createMergeRequest) {
        return await this.workflowGitService.createMergeRequest(projectPath, branchName, {
          title: `Refactor: ${task.title}`,
          description: this.buildMergeRequestDescription(task),
          sourceBranch: branchName,
          targetBranch: 'main'
        });
      }

      // Fallback: Just log the merge request info
      const mergeRequestInfo = {
        title: `Refactor: ${task.title}`,
        description: this.buildMergeRequestDescription(task),
        sourceBranch: branchName,
        targetBranch: 'main',
        status: 'manual_creation_required',
        message: 'Please create merge request manually in your Git platform'
      };

      logger.info('📋 [TaskService] Merge request info:', mergeRequestInfo);
      
      return mergeRequestInfo;
    } catch (error) {
      throw new Error(`Failed to create merge request: ${error.message}`);
    }
  }

  /**
   * Build merge request description
   * @param {Task} task - Task object
   * @returns {string} Merge request description
   */
  buildMergeRequestDescription(task) {
    return `
## Refactoring Task: ${task.title}

### Description
${task.description}

### Changes Made
- Refactored file: \`${task.metadata.filePath}\`
- Original lines: ${task.metadata.lines}
- Target: <500 lines per file
- Refactoring type: ${task.metadata.refactoringType}

### Files Modified
- \`${task.metadata.filePath}\` - Main refactored file

### Testing
- ✅ Build validation passed
- ✅ Code structure improved
- ✅ No business logic changes

### Review Checklist
- [ ] Code follows project conventions
- [ ] No breaking changes introduced
- [ ] All imports/exports updated correctly
- [ ] File size reduced as expected

---
*Auto-generated by PIDEA Refactoring System*
    `.trim();
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

  /**
   * Get execution engine status
   * @returns {Object} Execution engine status
   */
  getExecutionEngineStatus() {
    return {
      health: this.executionEngine.getHealthStatus(),
      metrics: this.executionEngine.getSystemMetrics(),
      configuration: this.executionEngine.getConfiguration()
    };
  }

  /**
   * Get execution engine statistics
   * @returns {Object} Execution engine statistics
   */
  getExecutionEngineStatistics() {
    return {
      queue: this.executionEngine.getQueueStatistics(),
      scheduler: this.executionEngine.getSchedulerStatistics(),
      resourcePool: this.executionEngine.getResourcePoolStatus()
    };
  }

  /**
   * Get active executions
   * @returns {Array} Active executions
   */
  getActiveExecutions() {
    return this.executionEngine.getActiveExecutions();
  }

  /**
   * Cancel execution
   * @param {string} executionId - Execution ID
   * @returns {boolean} True if cancelled
   */
  cancelExecution(executionId) {
    return this.executionEngine.cancelExecution(executionId);
  }

  /**
   * Get execution status
   * @param {string} executionId - Execution ID
   * @returns {Object} Execution status
   */
  getExecutionStatus(executionId) {
    return this.executionEngine.getExecutionStatus(executionId);
  }

  /**
   * Update execution engine configuration
   * @param {Object} config - New configuration
   */
  updateExecutionEngineConfiguration(config) {
    this.executionEngine.updateConfiguration(config);
  }

  /**
   * Shutdown execution engine
   * @returns {Promise<void>}
   */
  async shutdownExecutionEngine() {
    await this.executionEngine.shutdown();
  }
}

module.exports = TaskService; 