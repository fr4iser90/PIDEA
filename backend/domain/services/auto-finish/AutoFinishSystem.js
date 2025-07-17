const TodoParser = require('./TodoParser');
const ConfirmationSystem = require('./ConfirmationSystem');
const FallbackDetection = require('./FallbackDetection');
const TaskSequencer = require('./TaskSequencer');
const ResponseQualityEngine = require('../chat/ResponseQualityEngine');
const ContextAwareValidator = require('./ContextAwareValidator');
const SmartCompletionDetector = require('./SmartCompletionDetector');
const GitWorkflowManager = require('../../workflows/categories/git/GitWorkflowManager');
const GitWorkflowContext = require('../../workflows/categories/git/GitWorkflowContext');
const { v4: uuidv4 } = require('uuid');
const ServiceLogger = require('@logging/ServiceLogger');

/**
 * AutoFinishSystem - Core service for automated TODO processing and task completion
 * Handles TODO parsing, AI confirmation loops, fallback detection, and task sequencing
 * Enhanced with GitWorkflowManager integration
 */
class AutoFinishSystem {
  constructor(cursorIDE, browserManager, ideManager, webSocketManager = null) {
    this.cursorIDE = cursorIDE;
    this.browserManager = browserManager;
    this.ideManager = ideManager;
    this.webSocketManager = webSocketManager;
    
    // Initialize subsystems
    this.todoParser = new TodoParser();
    this.confirmationSystem = new ConfirmationSystem(cursorIDE);
    this.fallbackDetection = new FallbackDetection(browserManager, ideManager);
    this.taskSequencer = new TaskSequencer();
    this.responseQualityEngine = new ResponseQualityEngine();
    this.contextAwareValidator = new ContextAwareValidator();
    this.smartCompletionDetector = new SmartCompletionDetector();
    
    // Session management
    this.activeSessions = new Map(); // sessionId -> session data
    this.maxConcurrentSessions = 5;
    this.sessionTimeout = 300000; // 5 minutes
    
    // Configuration
    this.config = {
      maxConfirmationAttempts: 3,
      confirmationTimeout: 10000, // 10 seconds
      taskExecutionTimeout: 60000, // 1 minute
      fallbackDetectionEnabled: true,
      autoContinueThreshold: 0.8 // 80% confidence for auto-continue
    };
    
    this.logger = new ServiceLogger('AutoFinishSystem');
    
    // Initialize enhanced git workflow manager
    this.gitWorkflowManager = null;
    this.initializeGitWorkflowManager();
  }

  /**
   * Initialize git workflow manager
   */
  initializeGitWorkflowManager() {
    try {
      // Initialize git workflow manager if git service is available
      if (this.ideManager && this.ideManager.gitService) {
        this.gitWorkflowManager = new GitWorkflowManager({
          gitService: this.ideManager.gitService,
          logger: this.logger,
          eventBus: this.webSocketManager
        });
        this.logger.info('Git workflow manager initialized');
      } else {
        this.logger.warn('⚠️ Git service not available in IDEManager. Git-based features are disabled.');
        this.logger.warn('ℹ️  Lösung: Stelle sicher, dass gitService im DI-Container an IDEManager übergeben wird.');
      }
    } catch (error) {
      this.logger.error('Failed to initialize git workflow manager:', error.message);
    }
  }

  /**
   * Initialize the auto-finish system
   */
  async initialize() {
    try {
      this.logger.info('🚀 Initializing auto-finish system...');
      
      // Initialize subsystems
      await this.todoParser.initialize();
      await this.confirmationSystem.initialize();
      await this.fallbackDetection.initialize();
      await this.taskSequencer.initialize();
      // ResponseQualityEngine, ContextAwareValidator, and SmartCompletionDetector don't need initialization
      
      // Start session cleanup timer
      this.startSessionCleanup();
      
      this.logger.info('✅ Auto-finish system initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Process a TODO list with automatic task execution
   * @param {string} todoInput - Raw TODO input text
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processTodoList(todoInput, options = {}) {
    const sessionId = uuidv4();
    const startTime = Date.now();
    
    try {
      this.logger.info(`Starting TODO processing session ${sessionId}`);
      
      // Validate input
      if (!todoInput || typeof todoInput !== 'string') {
        throw new Error('Invalid TODO input: must be a non-empty string');
      }
      
      // Create session
      const session = this.createSession(sessionId, todoInput, options);
      this.activeSessions.set(sessionId, session);
      
      // Stream session start
      this.streamProgress(sessionId, 'start', {
        sessionId,
        status: 'started',
        totalTasks: 0,
        completedTasks: 0,
        progress: 0
      });
      
      // Parse TODO list
      this.logger.info(`Parsing TODO list for session ${sessionId}`);
      const tasks = await this.todoParser.parse(todoInput);
      
      if (tasks.length === 0) {
        throw new Error('No tasks found in TODO input');
      }
      
      // Update session with parsed tasks
      session.tasks = tasks;
      session.totalTasks = tasks.length;
      this.activeSessions.set(sessionId, session);
      
      // Stream task parsing completion
      this.streamProgress(sessionId, 'tasks-parsed', {
        sessionId,
        totalTasks: tasks.length,
        tasks: tasks.map(task => ({
          id: task.id,
          description: task.description,
          type: task.type,
          status: 'pending'
        }))
      });
      
      // Sequence tasks based on dependencies
      this.logger.info(`Sequencing ${tasks.length} tasks for session ${sessionId}`);
      const sequencedTasks = await this.taskSequencer.sequence(tasks);
      
      // Process tasks sequentially
      let completedTasks = 0;
      const results = [];
      
      for (const task of sequencedTasks) {
        try {
          this.logger.info(`Processing task ${task.id}: ${task.description}`);
          
          // Stream task start
          this.streamProgress(sessionId, 'task-start', {
            sessionId,
            taskId: task.id,
            taskDescription: task.description,
            currentTask: completedTasks + 1,
            totalTasks: tasks.length
          });
          
          // Process individual task
          const taskResult = await this.processTask(task, sessionId, options);
          results.push(taskResult);
          completedTasks++;
          
          // Stream task completion
          this.streamProgress(sessionId, 'task-complete', {
            sessionId,
            taskId: task.id,
            taskDescription: task.description,
            result: taskResult,
            completedTasks,
            totalTasks: tasks.length,
            progress: Math.round((completedTasks / tasks.length) * 100)
          });
          
        } catch (error) {
          this.logger.error(`Task ${task.id} failed:`, error.message);
          
          // Stream task error
          this.streamProgress(sessionId, 'task-error', {
            sessionId,
            taskId: task.id,
            taskDescription: task.description,
            error: error.message,
            completedTasks,
            totalTasks: tasks.length
          });
          
          // Handle task failure based on options
          if (options.stopOnError) {
            throw error;
          }
          
          // Continue with next task
          results.push({
            taskId: task.id,
            success: false,
            error: error.message
          });
        }
      }
      
      // Finalize session
      const duration = Date.now() - startTime;
      const finalResult = {
        sessionId,
        success: true,
        totalTasks: tasks.length,
        completedTasks,
        failedTasks: tasks.length - completedTasks,
        duration,
        results,
        startTime: new Date(startTime),
        endTime: new Date()
      };
      
      session.status = 'completed';
      session.result = finalResult;
      session.endTime = new Date();
      this.activeSessions.set(sessionId, session);
      
      // Stream session completion
      this.streamProgress(sessionId, 'complete', finalResult);
      
      this.logger.info(`TODO processing completed for session ${sessionId}: ${completedTasks}/${tasks.length} tasks completed`);
      
      return finalResult;
      
    } catch (error) {
      this.logger.error(`TODO processing failed for session ${sessionId}:`, error.message);
      
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
   * Process a single task with confirmation loops and fallback detection
   * @param {Object} task - Task object
   * @param {string} sessionId - Session ID
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Task result
   */
  async processTask(task, sessionId, options = {}) {
    const taskStartTime = Date.now();
    
    try {
      this.logger.info(`Processing task ${task.id}: ${task.description}`);
      
      // Try to use enhanced git workflow manager if available
      if (this.gitWorkflowManager && task.metadata?.projectPath) {
        try {
          const context = new GitWorkflowContext({
            projectPath: task.metadata.projectPath,
            task,
            options: { ...options, sessionId },
            workflowType: 'auto-finish-task'
          });

          const result = await this.gitWorkflowManager.executeWorkflow(context);
          
          this.logger.info(`Enhanced task processing completed for task ${task.id}`);
          
          return {
            taskId: task.id,
            description: task.description,
            success: true,
            result,
            duration: Date.now() - taskStartTime,
            completedAt: new Date(),
            method: 'enhanced'
          };

        } catch (error) {
          this.logger.error(`Enhanced task processing failed for task ${task.id}:`, error.message);
          // Fallback to legacy method
        }
      }
      
      // Legacy task processing method
      const idePrompt = this.buildTaskPrompt(task);
      const aiResponse = await this.cursorIDE.postToCursor(idePrompt);
      
      // Handle confirmation loop
      let confirmationResult = null;
      let confirmationAttempts = 0;
      
      while (confirmationAttempts < this.config.maxConfirmationAttempts) {
        confirmationAttempts++;
        
        this.logger.info(`Confirmation attempt ${confirmationAttempts} for task ${task.id}`);
        
        // Ask for confirmation
        confirmationResult = await this.confirmationSystem.askConfirmation(aiResponse, {
          timeout: this.config.confirmationTimeout,
          sessionId
        });
        
        if (confirmationResult.confirmed) {
          this.logger.info(`Task ${task.id} confirmed on attempt ${confirmationAttempts}`);
          break;
        }
        
        // If not confirmed, check if we need user input
        if (this.config.fallbackDetectionEnabled) {
          const fallbackAction = await this.fallbackDetection.detectUserInputNeed(aiResponse);
          
          if (fallbackAction === 'pause') {
            this.logger.info(`Task ${task.id} requires user input, pausing`);
            
            // Stream pause event
            this.streamProgress(sessionId, 'task-pause', {
              sessionId,
              taskId: task.id,
              reason: 'user_input_required',
              aiResponse
            });
            
            return {
              taskId: task.id,
              success: false,
              status: 'paused',
              reason: 'user_input_required',
              aiResponse
            };
          }
        }
        
        // Continue with next confirmation attempt
        this.logger.info(`Task ${task.id} not confirmed, continuing to next attempt`);
      }
      
      // Check if task was confirmed
      if (!confirmationResult || !confirmationResult.confirmed) {
        throw new Error(`Task ${task.id} was not confirmed after ${this.config.maxConfirmationAttempts} attempts`);
      }
      
      // Validate task completion
      const validationResult = await this.validateTaskCompletion(task, aiResponse);
      
      const taskResult = {
        taskId: task.id,
        description: task.description,
        success: true,
        aiResponse,
        confirmationResult,
        validationResult,
        duration: Date.now() - taskStartTime,
        completedAt: new Date()
      };
      
      this.logger.info(`Task ${task.id} completed successfully`);
      return taskResult;
      
    } catch (error) {
      this.logger.error(`Task ${task.id} failed:`, error.message);
      
      return {
        taskId: task.id,
        description: task.description,
        success: false,
        error: error.message,
        duration: Date.now() - taskStartTime,
        failedAt: new Date()
      };
    }
  }

  /**
   * Build a prompt for task execution
   * @param {Object} task - Task object
   * @returns {string} Task prompt
   */
  buildTaskPrompt(task) {
    return `Please complete the following task:

${task.description}

Requirements:
- Execute the task completely and accurately
- Make all necessary changes to the code
- Ensure the implementation is production-ready
- Follow best practices and coding standards
- Test the changes if applicable

Please proceed with the implementation and let me know when you're finished.`;
  }

  /**
   * Validate task completion with enhanced quality assessment
   * @param {Object} task - Task object
   * @param {string} aiResponse - AI response
   * @returns {Promise<Object>} Validation result
   */
  async validateTaskCompletion(task, aiResponse) {
    try {
      // Enhanced validation using ResponseQualityEngine
      const context = {
        userQuestion: task.description,
        taskType: task.type,
        taskId: task.id,
        previousMessages: task.metadata?.previousMessages || []
      };
      
      const qualityAssessment = this.responseQualityEngine.assessResponse(aiResponse, context);
      
      // Context-aware validation using ContextAwareValidator
      const conversationHistory = task.metadata?.conversationHistory || [];
      const contextValidation = await this.contextAwareValidator.validateResponse(
        aiResponse, 
        task.description, 
        conversationHistory
      );
      
      // Smart completion detection
      const completionDetection = await this.smartCompletionDetector.detectCompletion(aiResponse, {
        userIntent: task.description,
        qualityAssessment: qualityAssessment,
        contextValidation: contextValidation,
        hasCode: aiResponse.includes('```'),
        hasErrors: qualityAssessment.errorDetection.hasErrors
      });
      
      // Enhanced completion determination with smart detection
      const isCompleted = qualityAssessment.completeness.score > 0.7 && 
                         qualityAssessment.overallScore > 0.6 &&
                         !qualityAssessment.errorDetection.hasErrors &&
                         contextValidation.intentMatch.score > 0.5 &&
                         contextValidation.overallScore > 0.6 &&
                         completionDetection.isComplete &&
                         completionDetection.confidence >= 0.6;
      
      // Enhanced confidence calculation including smart completion
      const confidence = Math.min(1.0, 
        qualityAssessment.overallScore * 0.3 + 
        qualityAssessment.completeness.score * 0.25 +
        contextValidation.overallScore * 0.25 +
        completionDetection.confidence * 0.2
      );
      
      return {
        isValid: isCompleted,
        hasCompletionKeyword: qualityAssessment.completeness.factors.includes('has_completion_keyword'),
        hasErrorKeyword: qualityAssessment.errorDetection.hasErrors,
        confidence: confidence,
        qualityAssessment: qualityAssessment,
        contextValidation: contextValidation,
        completionDetection: completionDetection,
        suggestions: [
          ...qualityAssessment.suggestions,
          ...contextValidation.intentMatch.factors.map(f => f.details),
          ...contextValidation.contextRelevance.factors.map(f => f.details),
          ...completionDetection.suggestions
        ].filter(Boolean),
        overallScore: (qualityAssessment.overallScore + contextValidation.overallScore + completionDetection.confidence) / 3,
        completenessScore: qualityAssessment.completeness.score,
        codeQualityScore: qualityAssessment.codeQuality.score,
        relevanceScore: qualityAssessment.relevance.score,
        intentMatchScore: contextValidation.intentMatch.score,
        contextRelevanceScore: contextValidation.contextRelevance.score,
        detectedIntent: contextValidation.intentMatch.detectedIntent,
        completionType: completionDetection.completionType,
        completionQuality: completionDetection.quality
      };
      
    } catch (error) {
      this.logger.error(`Task validation failed:`, error.message);
      
      // Fallback to basic validation
      const completionKeywords = ['fertig', 'done', 'complete', 'finished', 'erledigt', 'abgeschlossen'];
      const hasCompletionKeyword = completionKeywords.some(keyword => 
        aiResponse.toLowerCase().includes(keyword)
      );
      
      const errorKeywords = ['error', 'failed', 'cannot', 'unable', 'problem', 'issue'];
      const hasErrorKeyword = errorKeywords.some(keyword => 
        aiResponse.toLowerCase().includes(keyword)
      );
      
      return {
        isValid: hasCompletionKeyword && !hasErrorKeyword,
        hasCompletionKeyword,
        hasErrorKeyword,
        confidence: hasCompletionKeyword ? 0.9 : 0.3,
        error: error.message,
        fallback: true
      };
    }
  }

  /**
   * Create a new processing session
   * @param {string} sessionId - Session ID
   * @param {string} todoInput - TODO input
   * @param {Object} options - Session options
   * @returns {Object} Session object
   */
  createSession(sessionId, todoInput, options) {
    return {
      id: sessionId,
      todoInput,
      options,
      status: 'started',
      tasks: [],
      totalTasks: 0,
      completedTasks: 0,
      startTime: new Date(),
      endTime: null,
      result: null,
      error: null
    };
  }

  /**
   * Stream progress updates via WebSocket
   * @param {string} sessionId - Session ID
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  streamProgress(sessionId, event, data) {
    if (!this.webSocketManager) {
      return;
    }
    
    try {
      this.webSocketManager.broadcastToAll('auto-finish-progress', {
        sessionId,
        event,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error(`Failed to stream progress for session ${sessionId}:`, error.message);
    }
  }

  /**
   * Get session status
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Session data
   */
  getSession(sessionId) {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   * @returns {Array} Active sessions
   */
  getActiveSessions() {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Cancel a session
   * @param {string} sessionId - Session ID
   * @returns {boolean} Success status
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
    
    this.logger.info(`Session ${sessionId} cancelled`);
    return true;
  }

  /**
   * Start session cleanup timer
   */
  startSessionCleanup() {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000); // Check every minute
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    const expiredSessions = [];
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      const sessionAge = now - session.startTime.getTime();
      
      if (sessionAge > this.sessionTimeout) {
        expiredSessions.push(sessionId);
      }
    }
    
    expiredSessions.forEach(sessionId => {
      this.activeSessions.delete(sessionId);
      this.logger.info(`Cleaned up expired session ${sessionId}`);
    });
  }

  /**
   * Get system statistics
   * @returns {Object} System stats
   */
  getStats() {
    const activeSessions = this.getActiveSessions();
    const runningSessions = activeSessions.filter(s => s.status === 'started');
    const completedSessions = activeSessions.filter(s => s.status === 'completed');
    const failedSessions = activeSessions.filter(s => s.status === 'failed');
    
    return {
      totalSessions: activeSessions.length,
      runningSessions: runningSessions.length,
      completedSessions: completedSessions.length,
      failedSessions: failedSessions.length,
      maxConcurrentSessions: this.maxConcurrentSessions,
      sessionTimeout: this.sessionTimeout
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.logger.info('Cleaning up auto-finish system...');
    
    // Cancel all active sessions
    for (const sessionId of this.activeSessions.keys()) {
      this.cancelSession(sessionId);
    }
    
    // Clear sessions
    this.activeSessions.clear();
    
    // Cleanup subsystems
    await this.todoParser.cleanup();
    await this.confirmationSystem.cleanup();
    await this.fallbackDetection.cleanup();
    await this.taskSequencer.cleanup();
    
    this.logger.info('Cleanup completed');
  }
}

module.exports = AutoFinishSystem; 