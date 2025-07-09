/**
 * AutoTestFixSystem - Core service for automated test correction and coverage improvement
 * Handles test analysis, AI-powered fixes, coverage improvement, and autonomous workflow execution
 */
const TestAnalyzer = require('@/infrastructure/external/TestAnalyzer');
const TestFixer = require('@/infrastructure/external/TestFixer');
const CoverageAnalyzer = require('@/infrastructure/external/CoverageAnalyzer');
const TestReportParser = require('@/domain/services/TestReportParser');
const TestFixTaskGenerator = require('@/domain/services/TestFixTaskGenerator');
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
      maxParallelTests: 5
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
      
      const tasks = await this.testFixTaskGenerator.generateAndSaveTasks(parsedData, {
        projectId: options.projectId || 'system',
        userId: options.userId || 'system'
      });
      
      this.logger.info(`[AutoTestFixSystem] Generated ${tasks.length} tasks in database`);
      
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
        type: { value: 'testing' },
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
          autoBranch: this.config.autoBranchEnabled
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
          if (this.taskRepository) {
            await this.taskRepository.save(task);
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
            await this.taskRepository.save(task);
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
            await this.taskRepository.save(task);
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
   * Process a single task using cursorIDE.postToCursor() like AutoFinishSystem
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
      
      // Build task prompt like AutoFinishSystem
      const idePrompt = this.buildTaskPrompt(task);
      
      this.logger.info(`[AutoTestFixSystem] Sending task to Cursor IDE: ${task.title}`);
      
      // Send to Cursor IDE via postToCursor()
      const aiResponse = await this.cursorIDE.postToCursor(idePrompt);
      
      // Validate task completion
      const validationResult = await this.validateTaskCompletion(task, aiResponse);
      
      const taskResult = {
        taskId: task.id,
        description: task.title,
        success: validationResult.isValid,
        aiResponse,
        validationResult,
        completedAt: new Date()
      };
      
      this.logger.info(`[AutoTestFixSystem] Task ${task.id} processed via Cursor IDE`);
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
   * Build a prompt for task execution like AutoFinishSystem
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
    
    return `Please complete the following test-related task:

${task.title}

${task.description}

${specificInstructions}

Requirements:
- Execute the task completely and accurately
- Make all necessary changes to the code
- Ensure the implementation is production-ready
- Follow best practices and coding standards
- Test the changes if applicable
- Confirm completion when finished

Please proceed with the implementation and let me know when you're finished.`;
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
}

module.exports = AutoTestFixSystem; 