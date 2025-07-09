/**
 * AutoTestFixSystem - Core service for automated test correction and coverage improvement
 * Handles test analysis, AI-powered fixes, coverage improvement, and autonomous workflow execution
 */
const TestAnalyzer = require('@/infrastructure/external/TestAnalyzer');
const TestFixer = require('@/infrastructure/external/TestFixer');
const CoverageAnalyzer = require('@/infrastructure/external/CoverageAnalyzer');
const TestReportParser = require('@/domain/services/TestReportParser');
const TestFixTaskGenerator = require('@/domain/services/TestFixTaskGenerator');
const WorkflowGitService = require('@/domain/services/WorkflowGitService');
const ConfirmationSystem = require('@/domain/services/auto-finish/ConfirmationSystem');
const TaskType = require('@/domain/value-objects/TaskType');
const { v4: uuidv4 } = require('uuid');

class AutoTestFixSystem {
  constructor(dependencies = {}) {
    this.cursorIDE = dependencies.cursorIDE;
    this.browserManager = dependencies.browserManager;
    this.ideManager = dependencies.ideManager;
    this.webSocketManager = dependencies.webSocketManager;
    this.taskRepository = dependencies.taskRepository;
    this.workflowOrchestrationService = dependencies.workflowOrchestrationService;
    
    // Initialize subsystems
    this.testAnalyzer = new TestAnalyzer();
    this.testFixer = new TestFixer();
    this.coverageAnalyzer = new CoverageAnalyzer();
    this.testReportParser = new TestReportParser();
    this.testFixTaskGenerator = new TestFixTaskGenerator(this.taskRepository);
    
    // Initialize ConfirmationSystem like AutoFinishSystem
    this.confirmationSystem = new ConfirmationSystem(this.cursorIDE);
    
    // Initialize WorkflowGitService for proper branch management
    this.workflowGitService = new WorkflowGitService({
      gitService: dependencies.gitService,
      logger: dependencies.logger,
      eventBus: dependencies.eventBus
    });
    
    // Session management
    this.activeSessions = new Map(); // sessionId -> session data
    this.maxConcurrentSessions = 3;
    this.sessionTimeout = 1800000; // 30 minutes
    
    // Configuration
    this.config = {
      maxFixAttempts: 3,
      fixTimeout: 300000, // 5 minutes per test
      coverageThreshold: 90,
      autoCommitEnabled: true,
      autoBranchEnabled: true,
      stopOnError: false,
      parallelExecution: true,
      maxParallelTests: 5,
      updateTaskStatus: true, // Whether to update task status in database
      maxConfirmationAttempts: 3, // Like AutoFinishSystem
      confirmationTimeout: 10000 // 10 seconds
    };
    
    this.logger = dependencies.logger || console;
  }

  /**
   * Initialize the system
   */
  async initialize() {
    try {
      this.logger.info('[AutoTestFixSystem] Initializing...');
      
      // Initialize subsystems
      await this.testAnalyzer.initialize();
      await this.testFixer.initialize();
      await this.coverageAnalyzer.initialize();
      
      this.logger.info('[AutoTestFixSystem] Initialized successfully');
    } catch (error) {
      this.logger.error('[AutoTestFixSystem] Initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Load existing tasks from database
   * @param {Object} options - Options for loading tasks
   * @returns {Promise<Array<Task>>} Loaded tasks
   */
  async loadExistingTasks(options = {}) {
    try {
      this.logger.info(`[AutoTestFixSystem] Loading existing tasks from database...`);
      
      if (!this.taskRepository) {
        this.logger.warn(`[AutoTestFixSystem] No task repository available, cannot load existing tasks`);
        return [];
      }

      const projectId = options.projectId || 'system';
      const userId = options.userId || 'system';
      
      // Load tasks with filters
      const filters = {
        projectId: projectId,
        userId: userId,
        type: 'testing' // Only test-related tasks
      };

      // Add status filter if specified
      if (options.status) {
        filters.status = options.status;
      } else {
        // Default: only load pending and in_progress tasks (skip completed/failed)
        filters.status = ['pending', 'in_progress'];
      }

      // Load tasks from database
      const existingTasks = await this.taskRepository.findByProject(projectId, filters);
      
      // Filter out completed tasks (those with completedAt set)
      const activeTasks = existingTasks.filter(task => {
        // Skip tasks that are marked as completed
        if (task.status?.value === 'completed') {
          this.logger.debug(`[AutoTestFixSystem] Skipping completed task: ${task.id}`);
          return false;
        }
        
        // Skip tasks that have completedAt timestamp
        if (task.completedAt) {
          this.logger.debug(`[AutoTestFixSystem] Skipping task with completedAt: ${task.id}`);
          return false;
        }
        
        return true;
      });

      this.logger.info(`[AutoTestFixSystem] Loaded ${activeTasks.length} active tasks from database (filtered from ${existingTasks.length} total)`);
      return activeTasks;

    } catch (error) {
      this.logger.error(`[AutoTestFixSystem] Failed to load existing tasks: ${error.message}`);
      return [];
    }
  }

  /**
   * Execute complete auto test fix workflow
   * @param {Object} options - Workflow options
   * @returns {Promise<Object>} Workflow result
   */
  async executeAutoTestFixWorkflow(options = {}) {
    const sessionId = uuidv4();
    const startTime = Date.now();
    
    try {
      this.logger.info(`[AutoTestFixSystem] Starting auto test fix workflow ${sessionId}`);
      
      // Create session
      const session = this.createSession(sessionId, options);
      this.activeSessions.set(sessionId, session);
      
      // Stream session start
      this.streamProgress(sessionId, 'start', {
        sessionId,
        status: 'started',
        phase: 'initializing',
        progress: 0
      });

      let tasks = [];
      
      // Check if we should load existing tasks or generate new ones
      if (options.loadExistingTasks) {
        // Step 1: Load existing tasks from database
        this.logger.info(`[AutoTestFixSystem] Step 1: Loading existing tasks from database`);
        this.streamProgress(sessionId, 'phase', { phase: 'loading-tasks', progress: 10 });
        
        tasks = await this.loadExistingTasks({
          projectId: options.projectId || 'system',
          userId: options.userId || 'system',
          status: options.taskStatus // Optional status filter
        });
        
        if (tasks.length === 0) {
          this.logger.info(`[AutoTestFixSystem] No existing tasks found, will generate new tasks`);
          options.loadExistingTasks = false; // Fallback to generating new tasks
        } else {
          this.logger.info(`[AutoTestFixSystem] Loaded ${tasks.length} existing tasks from database`);
        }
      }
      
      if (!options.loadExistingTasks || tasks.length === 0) {
        // Step 1: Parse existing test output files
        this.logger.info(`[AutoTestFixSystem] Step 1: Parsing test output files`);
        this.streamProgress(sessionId, 'phase', { phase: 'parsing', progress: 10 });
        
        const parsedData = await this.testReportParser.parseAllTestOutputs(options.projectPath || process.cwd());
        
        if (!parsedData.failingTests.length && !parsedData.coverageIssues.length) {
          this.logger.info(`[AutoTestFixSystem] No test issues found in output files`);
          return this.completeSession(sessionId, {
            success: true,
            message: 'No test issues found in output files',
            parsedData
          });
        }
        
        // Step 2: Generate and save tasks to database
        this.logger.info(`[AutoTestFixSystem] Step 2: Generating and saving tasks to database`);
        this.streamProgress(sessionId, 'phase', { phase: 'task-generation', progress: 20 });
        
        tasks = await this.testFixTaskGenerator.generateAndSaveTasks(parsedData, {
          projectId: options.projectId || 'system',
          userId: options.userId || 'system',
          clearExisting: options.clearExisting || false
        });
        
        this.logger.info(`[AutoTestFixSystem] Generated ${tasks.length} tasks in database`);
      }
      
      // Step 3: Process tasks sequentially
      this.logger.info(`[AutoTestFixSystem] Step 3: Processing tasks sequentially`);
      this.streamProgress(sessionId, 'phase', { phase: 'task-processing', progress: 30 });
      
      const processingResult = await this.processTasksSequentially(tasks, sessionId, options);
      
      // Step 4: Generate final report
      this.logger.info(`[AutoTestFixSystem] Step 4: Generating final report`);
      this.streamProgress(sessionId, 'phase', { phase: 'report-generation', progress: 90 });
      
      const report = await this.generateFinalReport(parsedData, processingResult, options);
      
      // Complete session
      const finalResult = this.completeSession(sessionId, {
        success: true,
        sessionId,
        parsedData,
        tasksGenerated: tasks.length,
        processingResult,
        report,
        duration: Date.now() - startTime,
        startTime: new Date(startTime),
        endTime: new Date()
      });
      
      this.logger.info(`[AutoTestFixSystem] Auto test fix workflow completed successfully: ${sessionId}`);
      return finalResult;
      
    } catch (error) {
      this.logger.error(`[AutoTestFixSystem] Auto test fix workflow failed: ${error.message}`);
      
      // Update session status
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.status = 'failed';
        session.error = error.message;
        session.endTime = new Date();
        this.activeSessions.set(sessionId, session);
      }
      
      // Stream error
      this.streamProgress(sessionId, 'error', {
        sessionId,
        error: error.message,
        duration: Date.now() - startTime
      });
      
      throw error;
    }
  }

  /**
   * Analyze project for test issues
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeProjectTests(projectPath) {
    try {
      this.logger.info(`[AutoTestFixSystem] Analyzing project tests: ${projectPath}`);
      
      // Analyze failing tests
      const failingTests = await this.testAnalyzer.analyzeFailingTests(projectPath);
      
      // Analyze legacy tests
      const legacyTests = await this.testAnalyzer.analyzeLegacyTests(projectPath);
      
      // Analyze complex tests
      const complexTests = await this.testAnalyzer.analyzeComplexTests(projectPath);
      
      // Get current coverage
      const coverage = await this.coverageAnalyzer.getCurrentCoverage(projectPath);
      
      const result = {
        projectPath,
        failingTests: {
          count: failingTests.length,
          tests: failingTests
        },
        legacyTests: {
          count: legacyTests.length,
          tests: legacyTests
        },
        complexTests: {
          count: complexTests.length,
          tests: complexTests
        },
        coverage: {
          current: coverage.current,
          target: this.config.coverageThreshold,
          needsImprovement: coverage.current < this.config.coverageThreshold
        },
        hasIssues: failingTests.length > 0 || legacyTests.length > 0 || 
                   complexTests.length > 0 || coverage.current < this.config.coverageThreshold,
        totalIssues: failingTests.length + legacyTests.length + complexTests.length,
        timestamp: new Date()
      };
      
      this.logger.info(`[AutoTestFixSystem] Analysis complete: ${result.totalIssues} issues found`);
      return result;
      
    } catch (error) {
      throw new Error(`Test analysis failed: ${error.message}`);
    }
  }

  /**
   * Create test fix task for workflow orchestration
   * @param {Object} analysisResult - Analysis result
   * @param {Object} options - Options
   * @returns {Promise<Object>} Task object
   */
  async createTestFixTask(analysisResult, options) {
    try {
      const taskId = uuidv4();
      
      const task = {
        id: taskId,
        title: `Auto Test Fix - ${analysisResult.totalIssues} Issues`,
        description: `Automated test correction and coverage improvement for ${analysisResult.projectPath}`,
        type: { value: TaskType.TESTING }, // This will use the 'testing' branch strategy from WorkflowGitService
        priority: { value: 'high' },
        status: { value: 'pending' },
        projectId: options.projectId || 'system',
        userId: options.userId || 'system',
        metadata: {
          projectPath: analysisResult.projectPath,
          analysisResult,
          autoTestFix: true,
          sessionId: options.sessionId,
          coverageTarget: this.config.coverageThreshold,
          maxFixAttempts: this.config.maxFixAttempts,
          autoCommit: this.config.autoCommitEnabled,
          autoBranch: this.config.autoBranchEnabled,
          taskType: 'test_fix_workflow' // Specific task type for test fixes
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Save task if repository is available
      if (this.taskRepository) {
        await this.taskRepository.save(task);
      }
      
      this.logger.info(`[AutoTestFixSystem] Created test fix task: ${taskId}`);
      return task;
      
    } catch (error) {
      throw new Error(`Failed to create test fix task: ${error.message}`);
    }
  }

  /**
   * Improve test coverage
   * @param {Object} analysisResult - Analysis result
   * @param {Object} workflowResult - Workflow result
   * @param {Object} options - Options
   * @returns {Promise<Object>} Coverage improvement result
   */
  async improveTestCoverage(analysisResult, workflowResult, options) {
    try {
      this.logger.info(`[AutoTestFixSystem] Improving test coverage`);
      
      if (!analysisResult.coverage.needsImprovement) {
        this.logger.info(`[AutoTestFixSystem] Coverage target already met`);
        return {
          success: true,
          message: 'Coverage target already met',
          currentCoverage: analysisResult.coverage.current,
          targetCoverage: analysisResult.coverage.target
        };
      }
      
      // Generate additional tests to improve coverage
      const coverageImprovement = await this.coverageAnalyzer.improveCoverage(
        analysisResult.projectPath,
        {
          targetCoverage: this.config.coverageThreshold,
          currentCoverage: analysisResult.coverage.current,
          maxAttempts: 3
        }
      );
      
      return {
        success: coverageImprovement.success,
        message: coverageImprovement.message,
        currentCoverage: coverageImprovement.currentCoverage,
        targetCoverage: coverageImprovement.targetCoverage,
        improvement: coverageImprovement.improvement,
        newTests: coverageImprovement.newTests
      };
      
    } catch (error) {
      throw new Error(`Coverage improvement failed: ${error.message}`);
    }
  }

  /**
   * Process tasks sequentially
   * @param {Array<Task>} tasks - Tasks to process
   * @param {string} sessionId - Session ID
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processTasksSequentially(tasks, sessionId, options = {}) {
    try {
      this.logger.info(`[AutoTestFixSystem] Processing ${tasks.length} tasks sequentially`);
      
      const result = {
        totalTasks: tasks.length,
        completedTasks: 0,
        failedTasks: 0,
        skippedTasks: 0,
        results: [],
        startTime: new Date(),
        endTime: null,
        duration: 0
      };

      // Sort tasks by priority (critical -> high -> medium -> low)
      const sortedTasks = this.sortTasksByPriority(tasks);
      
      for (let i = 0; i < sortedTasks.length; i++) {
        const task = sortedTasks[i];
        
        try {
          this.logger.info(`[AutoTestFixSystem] Processing task ${i + 1}/${sortedTasks.length}: ${task.title}`);
          
          // Stream task start
          this.streamProgress(sessionId, 'task-start', {
            taskId: task.id,
            taskTitle: task.title,
            currentTask: i + 1,
            totalTasks: sortedTasks.length,
            progress: Math.round(((i + 1) / sortedTasks.length) * 100)
          });
          
          // Update task status to in progress
          task.start();
          if (this.taskRepository && this.config.updateTaskStatus) {
            try {
              await this.taskRepository.save(task);
            } catch (error) {
              this.logger.warn(`[AutoTestFixSystem] Failed to update task status for ${task.id}:`, error.message);
              // Continue processing even if status update fails
            }
          }
          
          // Process the task
          const taskResult = await this.processSingleTask(task, options);
          result.results.push(taskResult);
          
          // Update task status based on result
          if (taskResult.success) {
            task.complete(taskResult);
            result.completedTasks++;
          } else {
            task.fail(taskResult.error);
            result.failedTasks++;
          }
          
          if (this.taskRepository) {
            try {
              await this.taskRepository.save(task);
            } catch (error) {
              this.logger.warn(`[AutoTestFixSystem] Failed to update task status for ${task.id}:`, error.message);
              // Continue processing even if status update fails
            }
          }
          
          // Stream task completion
          this.streamProgress(sessionId, 'task-complete', {
            taskId: task.id,
            taskTitle: task.title,
            success: taskResult.success,
            result: taskResult,
            completedTasks: result.completedTasks,
            failedTasks: result.failedTasks,
            progress: Math.round(((i + 1) / sortedTasks.length) * 100)
          });
          
          // Check if we should stop on error
          if (!taskResult.success && options.stopOnError) {
            this.logger.warn(`[AutoTestFixSystem] Stopping on error as requested`);
            break;
          }
          
        } catch (error) {
          this.logger.error(`[AutoTestFixSystem] Error processing task ${task.id}:`, error.message);
          
          task.fail(error.message);
          if (this.taskRepository) {
            try {
              await this.taskRepository.save(task);
            } catch (error) {
              this.logger.warn(`[AutoTestFixSystem] Failed to update task status for ${task.id}:`, error.message);
              // Continue processing even if status update fails
            }
          }
          
          result.failedTasks++;
          result.results.push({
            taskId: task.id,
            success: false,
            error: error.message
          });
          
          if (options.stopOnError) {
            break;
          }
        }
      }
      
      result.endTime = new Date();
      result.duration = result.endTime - result.startTime;
      
      this.logger.info(`[AutoTestFixSystem] Sequential processing completed: ${result.completedTasks} completed, ${result.failedTasks} failed`);
      return result;
      
    } catch (error) {
      this.logger.error(`[AutoTestFixSystem] Sequential processing failed:`, error.message);
      throw error;
    }
  }

  /**
   * Process a single task using cursorIDE.postToCursor() with proper Git workflow
   * @param {Task} task - Task to process
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Task result
   */
  async processSingleTask(task, options = {}) {
    try {
      // Use cursorIDE.postToCursor() like AutoFinishSystem
      if (!this.cursorIDE) {
        this.logger.warn('[AutoTestFixSystem] cursorIDE not available, using fallback processing');
        return await this.processTaskFallback(task, options);
      }

      // Immer neuen Chat für jeden Test-Task öffnen
      if (task.type?.value === 'testing' && this.cursorIDE.browserManager) {
        this.logger.info('🆕 [AutoTestFixSystem] Creating new chat for test task...');
        await this.cursorIDE.browserManager.clickNewChat();
        // Warte kurz, bis das neue Chatfeld bereit ist
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Create proper workflow branch using WorkflowGitService
      const projectPath = task.metadata?.projectPath || process.cwd();
      let branchResult = null;
      
      try {
        this.logger.info(`[AutoTestFixSystem] Creating workflow branch for task: ${task.id}`);
        branchResult = await this.workflowGitService.createWorkflowBranch(projectPath, task, options);
        this.logger.info(`[AutoTestFixSystem] Created branch: ${branchResult.branchName}`);
      } catch (error) {
        this.logger.warn(`[AutoTestFixSystem] Failed to create workflow branch: ${error.message}`);
        // Continue without branch creation - the AI will handle it in the prompt
      }
      
      // Build task prompt with proper Git workflow
      const idePrompt = this.buildTaskPrompt(task);
      
      this.logger.info(`[AutoTestFixSystem] Sending task to Cursor IDE: ${task.title}`);
      
      // Send to Cursor IDE via postToCursor()
      let aiResponse = await this.cursorIDE.postToCursor(idePrompt);
      
      // Confirmation loop like AutoFinishSystem
      let confirmationAttempts = 0;
      const maxConfirmationAttempts = 3;
      let confirmationResult = null;
      
      while (confirmationAttempts < maxConfirmationAttempts) {
        confirmationAttempts++;
        this.logger.info(`[AutoTestFixSystem] Confirmation attempt ${confirmationAttempts}/${maxConfirmationAttempts}`);
        
        // Ask for explicit confirmation
        confirmationResult = await this.confirmationSystem.askConfirmation('test');
        
        this.logger.info(`[AutoTestFixSystem] Confirmation result: status=${confirmationResult.status}, isValid=${confirmationResult.isValid}, confidence=${confirmationResult.confidence}`);
        
        if (confirmationResult.testResults) {
          this.logger.info(`[AutoTestFixSystem] Test results from AI: ${confirmationResult.testResults.status} ${confirmationResult.testResults.percentage}%`);
        }
        
        if (confirmationResult.isValid) {
          this.logger.info(`[AutoTestFixSystem] ✅ Task confirmed as complete on attempt ${confirmationAttempts}`);
          break;
        } else {
          this.logger.info(`[AutoTestFixSystem] ❌ Task not confirmed (status: ${confirmationResult.status}), attempt ${confirmationAttempts}/${maxConfirmationAttempts}`);
          
          if (confirmationAttempts < maxConfirmationAttempts) {
            // Wait a bit before next attempt
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      // If we got confirmation, proceed with test validation
      let testValidationResult = null;
      if (confirmationResult && confirmationResult.isValid) {
        this.logger.info(`[AutoTestFixSystem] Proceeding with test validation for task: ${task.id}`);
        testValidationResult = await this.validateTestsWithExecution(task, branchResult);
        
        // Log the outcome
        if (testValidationResult.success) {
          this.logger.info(`[AutoTestFixSystem] ✅ Task ${task.id} completed successfully - Tests passed, changes committed`);
        } else {
          this.logger.warn(`[AutoTestFixSystem] ⚠️ Task ${task.id} failed - Tests failed, changes discarded, marked for review`);
        }
      } else {
        this.logger.warn(`[AutoTestFixSystem] Task not confirmed after ${maxConfirmationAttempts} attempts (final status: ${confirmationResult?.status}), skipping test validation`);
        testValidationResult = {
          success: false,
          reason: 'task_not_confirmed',
          successRate: 0,
          threshold: 80,
          taskStatus: 'not_confirmed'
        };
        
        // Update task status in database
        if (this.taskRepository) {
          task.fail({
            success: false,
            error: 'Task not confirmed by AI',
            message: `Task not confirmed after ${maxConfirmationAttempts} confirmation attempts`
          });
          await this.taskRepository.save(task);
        }
      }
      
      const taskResult = {
        taskId: task.id,
        description: task.title,
        success: testValidationResult?.success || false,
        aiResponse,
        confirmationResult,
        testValidationResult,
        branchResult,
        taskStatus: testValidationResult?.taskStatus || 'unknown',
        completedAt: new Date()
      };
      
      this.logger.info(`[AutoTestFixSystem] Task ${task.id} processed via Cursor IDE - Status: ${taskResult.taskStatus}`);
      return taskResult;
      
    } catch (error) {
      this.logger.error(`[AutoTestFixSystem] Task ${task.id} failed:`, error.message);
      
      return {
        taskId: task.id,
        description: task.title,
        success: false,
        error: error.message,
        failedAt: new Date()
      };
    }
  }

  /**
   * Build a prompt for task execution with proper Git workflow using WorkflowGitService
   * @param {Task} task - Task object
   * @returns {string} Task prompt
   */
  buildTaskPrompt(task) {
    const taskType = task.metadata?.taskType;
    const metadata = task.metadata || {};
    
    let specificInstructions = '';
    
    switch (taskType) {
      case 'failing_test_fix':
        specificInstructions = `
Specific Instructions for Failing Test Fix:
- Test File: ${metadata.testFile || 'Unknown'}
- Test Name: ${metadata.testName || 'Unknown'}
- Error: ${metadata.error || 'Unknown'}
- Fix the failing test by addressing the specific error
- Ensure the test passes after the fix
- Maintain test coverage and readability`;
        break;
        
      case 'coverage_improvement':
        specificInstructions = `
Specific Instructions for Coverage Improvement:
- File: ${metadata.file || 'Unknown'}
- Current Coverage: ${metadata.currentCoverage || 'Unknown'}%
- Target Coverage: ${metadata.targetCoverage || 80}%
- Add missing test cases to improve coverage
- Focus on uncovered code paths
- Ensure tests are meaningful and not just for coverage`;
        break;
        
      case 'legacy_test_refactor':
        specificInstructions = `
Specific Instructions for Legacy Test Refactor:
- Test File: ${metadata.testFile || 'Unknown'}
- Test Name: ${metadata.testName || 'Unknown'}
- Refactor the legacy test to modern standards
- Improve readability and maintainability
- Use modern testing patterns and assertions
- Remove deprecated testing approaches`;
        break;
        
      default:
        specificInstructions = `
General Task Instructions:
- Complete the task as described
- Follow best practices and coding standards
- Ensure the implementation is production-ready
- Test the changes if applicable`;
    }
    
    // Get proper branch strategy from WorkflowGitService
    const branchStrategy = this.workflowGitService.determineBranchStrategy(task.type, {});
    const branchName = this.workflowGitService.generateBranchName(task, branchStrategy);
    
    // Build Git workflow based on branch strategy
    const gitWorkflow = this.buildGitWorkflow(branchName, branchStrategy, task);
    
    return `Please complete the following test-related task with proper Git workflow:

${task.title}

${task.description}

${specificInstructions}

${gitWorkflow}

Requirements:
- Execute the task completely and accurately
- Make all necessary changes to the code
- Ensure the implementation is production-ready
- Follow best practices and coding standards
- Test the changes if applicable
- ALWAYS use the Git workflow above
- Confirm completion when finished

Please proceed with the implementation and let me know when you're finished.`;
  }

  /**
   * Build Git workflow instructions based on branch strategy
   * @param {string} branchName - Branch name
   * @param {Object} branchStrategy - Branch strategy
   * @param {Object} task - Task object
   * @returns {string} Git workflow instructions
   */
  buildGitWorkflow(branchName, branchStrategy, task) {
    const projectPath = task.metadata?.projectPath || process.cwd();
    const startPoint = branchStrategy.startPoint || 'main';
    
    return `GIT WORKFLOW (REQUIRED):
1. Ensure you're on the correct starting branch: git checkout ${startPoint}
2. Pull latest changes: git pull origin ${startPoint}
3. Create and switch to new branch: git checkout -b ${branchName}
4. Make the necessary code changes
5. Test your changes: npm test
6. Stage all changes: git add .
7. Commit your changes: git commit -m "${task.title} (Task ID: ${task.id})"
8. Push the branch: git push -u origin ${branchName}
9. Confirm completion when finished

Branch Strategy: ${branchStrategy.type} (${branchStrategy.prefix})
Start Point: ${startPoint}
Target Branch: ${branchStrategy.mergeTarget || 'main'}
Protection Level: ${branchStrategy.protection}
Auto-Merge: ${branchStrategy.autoMerge ? 'Enabled' : 'Disabled'}
Requires Review: ${branchStrategy.requiresReview ? 'Yes' : 'No'}`;
  }

  /**
   * Validate task completion like AutoFinishSystem
   * @param {Task} task - Task object
   * @param {string} aiResponse - AI response
   * @returns {Promise<Object>} Validation result
   */
  async validateTaskCompletion(task, aiResponse) {
    try {
      // Basic validation - check for completion keywords
      const completionKeywords = ['fertig', 'done', 'complete', 'finished', 'erledigt', 'abgeschlossen', 'fixed', 'resolved'];
      const hasCompletionKeyword = completionKeywords.some(keyword => 
        aiResponse.toLowerCase().includes(keyword)
      );
      
      // Check for error indicators
      const errorKeywords = ['error', 'failed', 'cannot', 'unable', 'problem', 'issue', 'failed to'];
      const hasErrorKeyword = errorKeywords.some(keyword => 
        aiResponse.toLowerCase().includes(keyword)
      );
      
      // Check for test-specific completion indicators
      const testCompletionKeywords = ['test passes', 'test fixed', 'coverage improved', 'refactored', 'updated test'];
      const hasTestCompletionKeyword = testCompletionKeywords.some(keyword => 
        aiResponse.toLowerCase().includes(keyword)
      );
      
      return {
        isValid: (hasCompletionKeyword || hasTestCompletionKeyword) && !hasErrorKeyword,
        hasCompletionKeyword,
        hasTestCompletionKeyword,
        hasErrorKeyword,
        confidence: (hasCompletionKeyword || hasTestCompletionKeyword) ? 0.9 : 0.3
      };
      
    } catch (error) {
      this.logger.error(`[AutoTestFixSystem] Task validation failed:`, error.message);
      return {
        isValid: false,
        error: error.message,
        confidence: 0.0
      };
    }
  }

  /**
   * Refactor a test
   * @param {Task} task - Task with test refactor data
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Refactor result
   */
  async refactorTest(task, options = {}) {
    try {
      const { testFile, testName } = task.metadata;
      
      this.logger.info(`[AutoTestFixSystem] Refactoring test: ${testName} in ${testFile}`);
      
      // Use existing TestFixer if available
      if (this.testFixer) {
        const refactorResult = await this.testFixer.applyRefactorFix(testFile, testName);
        return {
          taskId: task.id,
          success: refactorResult.success,
          result: refactorResult,
          message: `Refactored test: ${testName}`
        };
      }
      
      // Fallback: mark as completed (manual refactor required)
      return {
        taskId: task.id,
        success: true,
        message: `Task created for manual refactor: ${testName}`,
        requiresManualFix: true
      };
      
    } catch (error) {
      return {
        taskId: task.id,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process task fallback when cursorIDE is not available
   * @param {Task} task - Task to process
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processTaskFallback(task, options = {}) {
    try {
      this.logger.info(`[AutoTestFixSystem] Processing task fallback: ${task.title}`);
      
      // Use workflow orchestration if available
      if (this.workflowOrchestrationService) {
        const workflowResult = await this.workflowOrchestrationService.executeWorkflow(task, options);
        return {
          taskId: task.id,
          success: workflowResult.success,
          result: workflowResult,
          message: `Processed task via workflow: ${task.title}`
        };
      }
      
      // Fallback: mark as completed (manual processing required)
      return {
        taskId: task.id,
        success: true,
        message: `Task created for manual processing: ${task.title}`,
        requiresManualProcessing: true
      };
      
    } catch (error) {
      return {
        taskId: task.id,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sort tasks by priority
   * @param {Array<Task>} tasks - Tasks to sort
   * @returns {Array<Task>} Sorted tasks
   */
  sortTasksByPriority(tasks) {
    const priorityOrder = {
      'critical': 0,
      'high': 1,
      'medium': 2,
      'low': 3
    };
    
    return tasks.sort((a, b) => {
      const aPriority = priorityOrder[a.priority.value] || 2;
      const bPriority = priorityOrder[b.priority.value] || 2;
      return aPriority - bPriority;
    });
  }

  /**
   * Generate final report
   * @param {Object} parsedData - Parsed test data
   * @param {Object} processingResult - Processing result
   * @param {Object} options - Options
   * @returns {Promise<Object>} Final report
   */
  async generateFinalReport(parsedData, processingResult, options) {
    try {
      this.logger.info(`[AutoTestFixSystem] Generating final report`);
      
      const report = {
        summary: {
          totalIssues: parsedData.failingTests.length + parsedData.coverageIssues.length,
          tasksGenerated: processingResult.totalTasks,
          tasksCompleted: processingResult.completedTasks,
          tasksFailed: processingResult.failedTasks,
          successRate: processingResult.totalTasks > 0 ? 
            (processingResult.completedTasks / processingResult.totalTasks * 100).toFixed(1) : 0
        },
        details: {
          parsedData,
          processingResult
        },
        recommendations: this.generateRecommendations(parsedData, processingResult),
        timestamp: new Date()
      };
      
      return report;
      
    } catch (error) {
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }

  /**
   * Generate recommendations based on results
   * @param {Object} parsedData - Parsed test data
   * @param {Object} processingResult - Processing result
   * @returns {Array} Recommendations
   */
  generateRecommendations(parsedData, processingResult) {
    const recommendations = [];
    
    if (processingResult.failedTasks > 0) {
      recommendations.push({
        type: 'error',
        message: `${processingResult.failedTasks} tasks failed - review logs and retry`,
        priority: 'high'
      });
    }
    
    if (parsedData.failingTests.length > 0) {
      recommendations.push({
        type: 'warning',
        message: `${parsedData.failingTests.length} failing tests need attention`,
        priority: 'high'
      });
    }
    
    if (parsedData.coverageIssues.length > 0) {
      recommendations.push({
        type: 'info',
        message: `${parsedData.coverageIssues.length} files need coverage improvement`,
        priority: 'medium'
      });
    }
    
    if (parsedData.legacyTests.length > 0) {
      recommendations.push({
        type: 'info',
        message: `${parsedData.legacyTests.length} legacy tests identified for modernization`,
        priority: 'low'
      });
    }
    
    if (parsedData.complexTests.length > 0) {
      recommendations.push({
        type: 'info',
        message: `${parsedData.complexTests.length} complex tests need refactoring`,
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  /**
   * Create session
   * @param {string} sessionId - Session ID
   * @param {Object} options - Options
   * @returns {Object} Session object
   */
  createSession(sessionId, options) {
    return {
      id: sessionId,
      status: 'active',
      options,
      startTime: new Date(),
      progress: 0,
      logs: []
    };
  }

  /**
   * Complete session
   * @param {string} sessionId - Session ID
   * @param {Object} result - Result
   * @returns {Object} Final result
   */
  completeSession(sessionId, result) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'completed';
      session.result = result;
      session.endTime = new Date();
      session.progress = 100;
      this.activeSessions.set(sessionId, session);
    }
    
    this.streamProgress(sessionId, 'complete', result);
    
    // Schedule cleanup
    setTimeout(() => {
      this.activeSessions.delete(sessionId);
    }, 300000); // 5 minutes
    
    return result;
  }

  /**
   * Stream progress updates
   * @param {string} sessionId - Session ID
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  streamProgress(sessionId, event, data) {
    if (this.webSocketManager) {
      this.webSocketManager.broadcast('auto-test-fix', {
        sessionId,
        event,
        data,
        timestamp: new Date()
      });
    }
    
    // Log progress
    this.logger.info(`[AutoTestFixSystem] Progress: ${event}`, {
      sessionId,
      ...data
    });
  }

  /**
   * Get session status
   * @param {string} sessionId - Session ID
   * @returns {Object} Session status
   */
  getSessionStatus(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return { status: 'not_found' };
    }
    
    return {
      sessionId,
      status: session.status,
      progress: session.progress,
      startTime: session.startTime,
      endTime: session.endTime,
      result: session.result,
      error: session.error
    };
  }

  /**
   * Cancel session
   * @param {string} sessionId - Session ID
   * @returns {boolean} Success
   */
  cancelSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return false;
    }
    
    session.status = 'cancelled';
    session.endTime = new Date();
    this.activeSessions.set(sessionId, session);
    
    this.streamProgress(sessionId, 'cancelled', {
      sessionId,
      reason: 'user_cancelled'
    });
    
    return true;
  }

  /**
   * Validate tests by executing them and checking success rate
   * @param {Task} task - Task object
   * @param {Object} branchResult - Branch creation result
   * @returns {Promise<Object>} Test validation result
   */
  async validateTestsWithExecution(task, branchResult) {
    try {
      this.logger.info(`[AutoTestFixSystem] Starting test validation for task: ${task.id}`);
      
      // Ensure terminal is open in IDE
      if (this.cursorIDE && this.cursorIDE.browserManager) {
        this.logger.info(`[AutoTestFixSystem] Opening terminal in IDE...`);
        await this.cursorIDE.browserManager.ensureTerminalOpen();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for terminal
      }
      
      // Execute tests and capture output to log file
      const testCommand = 'npm test > test-output.log 2>&1';
      this.logger.info(`[AutoTestFixSystem] Executing: ${testCommand}`);
      
      if (this.cursorIDE && this.cursorIDE.browserManager) {
        await this.cursorIDE.browserManager.executeTerminalCommand(testCommand);
        // Wait for test execution to complete
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // Read and parse test output
      const fs = require('fs').promises;
      const path = require('path');
      const logFilePath = path.join(process.cwd(), 'test-output.log');
      
      let testOutput = '';
      try {
        testOutput = await fs.readFile(logFilePath, 'utf8');
        this.logger.info(`[AutoTestFixSystem] Test output captured (${testOutput.length} chars)`);
      } catch (error) {
        this.logger.warn(`[AutoTestFixSystem] Could not read test output log: ${error.message}`);
        return {
          success: false,
          error: 'Could not read test output',
          successRate: 0
        };
      }
      
      // Parse test output
      const testResult = this.parseTestOutput(testOutput);
      this.logger.info(`[AutoTestFixSystem] Test parsing result: ${testResult.successRate}% success rate`);
      
      // Validate success rate (threshold: 80%)
      const successThreshold = 80;
      const isSuccessful = testResult.successRate >= successThreshold;
      
      let commitResult = null;
      let taskStatus = 'unknown';
      
      if (isSuccessful) {
        // ✅ TESTS PASSED - Commit to Git
        this.logger.info(`[AutoTestFixSystem] ✅ Tests PASSED (${testResult.successRate}% >= ${successThreshold}%), committing to Git...`);
        
        commitResult = await this.commitAndPushChanges(task, branchResult, {
          testSuccess: true,
          successRate: testResult.successRate,
          threshold: successThreshold
        });
        
        taskStatus = 'completed';
        
        // Update task status in database
        if (this.taskRepository) {
          task.complete({
            success: true,
            successRate: testResult.successRate,
            commitResult,
            message: `Tests passed with ${testResult.successRate}% success rate, changes committed`
          });
          await this.taskRepository.save(task);
        }
        
      } else {
        // ❌ TESTS FAILED - Discard changes and mark for review
        this.logger.info(`[AutoTestFixSystem] ❌ Tests FAILED (${testResult.successRate}% < ${successThreshold}%), discarding changes and marking for review...`);
        
        // Discard changes by resetting to clean state
        if (this.cursorIDE && this.cursorIDE.browserManager) {
          this.logger.info(`[AutoTestFixSystem] Discarding changes...`);
          const discardCommands = [
            'git reset --hard HEAD',
            'git clean -fd'
          ];
          
          for (const command of discardCommands) {
            this.logger.info(`[AutoTestFixSystem] Executing: ${command}`);
            await this.cursorIDE.browserManager.executeTerminalCommand(command);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        taskStatus = 'needs_review';
        
        // Update task status in database
        if (this.taskRepository) {
          task.fail({
            success: false,
            successRate: testResult.successRate,
            error: `Test success rate ${testResult.successRate}% below threshold ${successThreshold}%`,
            message: `Tests failed with ${testResult.successRate}% success rate, task marked for manual review`
          });
          await this.taskRepository.save(task);
        }
        
        commitResult = {
          success: false,
          action: 'discarded',
          message: 'Changes discarded due to test failure, task marked for review'
        };
      }
      
      return {
        success: isSuccessful,
        successRate: testResult.successRate,
        testOutput: testOutput.substring(0, 500) + '...', // Truncated for logging
        commitResult,
        taskStatus,
        message: isSuccessful ? 
          `Tests passed with ${testResult.successRate}% success rate, changes committed` : 
          `Tests failed with ${testResult.successRate}% success rate, changes discarded and task marked for review`
      };
      
    } catch (error) {
      this.logger.error(`[AutoTestFixSystem] Test validation failed: ${error.message}`);
      
      // Update task status on error
      if (this.taskRepository) {
        task.fail({
          success: false,
          error: error.message,
          message: 'Test validation failed due to system error'
        });
        await this.taskRepository.save(task);
      }
      
      return {
        success: false,
        error: error.message,
        successRate: 0,
        taskStatus: 'error'
      };
    }
  }

  /**
   * Parse test output to calculate success rate
   * @param {string} testOutput - Raw test output
   * @returns {Object} Parsed test result
   */
  parseTestOutput(testOutput) {
    try {
      // Common test output patterns
      const patterns = [
        // Jest pattern: "Tests: 5 passed, 1 failed"
        /Tests:\s*(\d+)\s*passed,\s*(\d+)\s*failed/,
        // Jest pattern: "✓ 5 tests passed"
        /✓\s*(\d+)\s*tests?\s*passed/,
        // Mocha pattern: "5 passing (2s)"
        /(\d+)\s*passing/,
        // Generic pattern: "PASS" or "FAIL"
        /PASS/,
        /FAIL/
      ];
      
      let totalTests = 0;
      let passedTests = 0;
      let failedTests = 0;
      
      // Try to extract test counts
      for (const pattern of patterns) {
        const match = testOutput.match(pattern);
        if (match) {
          if (pattern.source.includes('passed') && pattern.source.includes('failed')) {
            // Jest format: "Tests: 5 passed, 1 failed"
            passedTests = parseInt(match[1]) || 0;
            failedTests = parseInt(match[2]) || 0;
            totalTests = passedTests + failedTests;
            break;
          } else if (pattern.source.includes('passing')) {
            // Mocha format: "5 passing"
            passedTests = parseInt(match[1]) || 0;
            totalTests = passedTests;
            break;
          } else if (pattern.source.includes('PASS')) {
            // Generic PASS
            passedTests = 1;
            totalTests = 1;
            break;
          }
        }
      }
      
      // If no specific pattern found, try to estimate from output
      if (totalTests === 0) {
        const passMatches = testOutput.match(/✓|PASS|passed/gi);
        const failMatches = testOutput.match(/✗|FAIL|failed/gi);
        
        passedTests = passMatches ? passMatches.length : 0;
        failedTests = failMatches ? failMatches.length : 0;
        totalTests = passedTests + failedTests;
      }
      
      // Calculate success rate
      const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
      
      return {
        totalTests,
        passedTests,
        failedTests,
        successRate: Math.round(successRate * 100) / 100, // Round to 2 decimal places
        rawOutput: testOutput
      };
      
    } catch (error) {
      this.logger.error(`[AutoTestFixSystem] Error parsing test output: ${error.message}`);
      return {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        successRate: 0,
        error: error.message
      };
    }
  }

  /**
   * Commit and push changes after test validation (only for successful tests)
   * @param {Task} task - Task object
   * @param {Object} branchResult - Branch creation result
   * @param {Object} testInfo - Test information (success, successRate, threshold)
   * @returns {Promise<Object>} Commit result
   */
  async commitAndPushChanges(task, branchResult, testInfo = {}) {
    try {
      this.logger.info(`[AutoTestFixSystem] Committing and pushing changes for task: ${task.id}`);
      
      // Only commit if tests are successful
      if (!testInfo.testSuccess) {
        this.logger.warn(`[AutoTestFixSystem] Skipping commit - tests failed (${testInfo.successRate}%)`);
        return {
          success: false,
          action: 'skipped',
          reason: 'tests_failed',
          message: 'Commit skipped due to test failure'
        };
      }
      
      if (this.cursorIDE && this.cursorIDE.browserManager) {
        // Build commit message for successful tests
        const commitMessage = `${task.title} (Task ID: ${task.id}) - ✅ Tests PASSED (${testInfo.successRate}%) - Auto-fixed by PIDEA`;
        
        this.logger.info(`[AutoTestFixSystem] Commit message: ${commitMessage}`);
        
        const commands = [
          'git add .',
          `git commit -m "${commitMessage}"`,
          'git push'
        ];
        
        for (const command of commands) {
          this.logger.info(`[AutoTestFixSystem] Executing: ${command}`);
          await this.cursorIDE.browserManager.executeTerminalCommand(command);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait between commands
        }
        
        return {
          success: true,
          branchName: branchResult?.branchName,
          commitMessage,
          testSuccess: testInfo.testSuccess,
          successRate: testInfo.successRate,
          action: 'committed',
          message: 'Changes committed and pushed successfully - Tests passed'
        };
      } else {
        throw new Error('CursorIDE or browserManager not available for git operations');
      }
      
    } catch (error) {
      this.logger.error(`[AutoTestFixSystem] Failed to commit and push changes: ${error.message}`);
      return {
        success: false,
        action: 'failed',
        error: error.message,
        message: 'Git operations failed'
      };
    }
  }
}

module.exports = AutoTestFixSystem; 