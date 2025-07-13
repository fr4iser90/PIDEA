const AutoFinishSystem = require('@services/auto-finish/AutoFinishSystem');
const TaskSession = require('@entities/TaskSession');
const TodoTask = require('@entities/TodoTask');
const { logger } = require('@infrastructure/logging/Logger');

/**
 * ProcessTodoListHandler - Handler for processing TODO lists with auto-finish system
 * Orchestrates the complete TODO processing workflow
 */
class ProcessTodoListHandler {
  constructor(dependencies = {}) {
    this.autoFinishSystem = dependencies.autoFinishSystem;
    this.cursorIDE = dependencies.cursorIDE;
    this.browserManager = dependencies.browserManager;
    this.ideManager = dependencies.ideManager;
    this.webSocketManager = dependencies.webSocketManager;
    this.taskSessionRepository = dependencies.taskSessionRepository;
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger || console;
  }

  /**
   * Handle ProcessTodoListCommand
   * @param {ProcessTodoListCommand} command - The command to handle
   * @returns {Promise<Object>} Processing result
   */
  async handle(command) {
    const startTime = Date.now();
    
    try {
      this.logger.info(`[ProcessTodoListHandler] Processing TODO list command: ${command.commandId}`);
      
      // Validate command
      if (!command.todoInput || typeof command.todoInput !== 'string') {
        throw new Error('Invalid TODO input: must be a non-empty string');
      }
      
      // Create task session
      const session = this.createTaskSession(command);
      
      // Save session to repository
      if (this.taskSessionRepository) {
        await this.taskSessionRepository.save(session);
      }
      
      // Emit session created event
      if (this.eventBus) {
        this.eventBus.emit('task-session:created', {
          sessionId: session.id,
          userId: command.userId,
          projectId: command.projectId,
          timestamp: new Date()
        });
      }
      
      // Stream session start
      this.streamProgress(session.id, 'session-start', {
        sessionId: session.id,
        status: 'started',
        totalTasks: 0,
        completedTasks: 0,
        progress: 0
      });
      
      // Process TODO list with auto-finish system
      const result = await this.autoFinishSystem.processTodoList(
        command.todoInput,
        {
          ...command.options,
          sessionId: session.id,
          userId: command.userId,
          projectId: command.projectId
        }
      );
      
      // Update session with result
      session.complete(result);
      
      // Save updated session
      if (this.taskSessionRepository) {
        await this.taskSessionRepository.save(session);
      }
      
      // Emit session completed event
      if (this.eventBus) {
        this.eventBus.emit('task-session:completed', {
          sessionId: session.id,
          result,
          duration: Date.now() - startTime,
          timestamp: new Date()
        });
      }
      
      // Stream session completion
      this.streamProgress(session.id, 'session-complete', {
        sessionId: session.id,
        result,
        duration: Date.now() - startTime
      });
      
      this.logger.info(`[ProcessTodoListHandler] TODO list processing completed: ${session.id}`);
      
      return {
        success: true,
        sessionId: session.id,
        result,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      this.logger.error(`[ProcessTodoListHandler] TODO list processing failed:`, error.message);
      
      // Create error result
      const errorResult = {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
      
      // If we have a session, update it with error
      if (command.sessionId) {
        try {
          const session = await this.taskSessionRepository?.findById(command.sessionId);
          if (session) {
            session.fail(error.message);
            await this.taskSessionRepository.save(session);
            
            // Stream error
            this.streamProgress(session.id, 'session-error', {
              sessionId: session.id,
              error: error.message,
              duration: Date.now() - startTime
            });
          }
        } catch (saveError) {
          this.logger.error(`[ProcessTodoListHandler] Failed to save error state:`, saveError.message);
        }
      }
      
      // Emit error event
      if (this.eventBus) {
        this.eventBus.emit('task-session:error', {
          commandId: command.commandId,
          error: error.message,
          duration: Date.now() - startTime,
          timestamp: new Date()
        });
      }
      
      throw error;
    }
  }

  /**
   * Create task session from command
   * @param {ProcessTodoListCommand} command - The command
   * @returns {TaskSession} Task session
   */
  createTaskSession(command) {
    return new TaskSession({
      userId: command.userId,
      projectId: command.projectId,
      todoInput: command.todoInput,
      options: command.options,
      metadata: {
        commandId: command.commandId,
        ...command.metadata
      }
    });
  }

  /**
   * Stream progress updates
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
      this.logger.error(`[ProcessTodoListHandler] Failed to stream progress:`, error.message);
    }
  }

  /**
   * Get handler statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      handlerName: 'ProcessTodoListHandler',
      dependencies: {
        hasAutoFinishSystem: !!this.autoFinishSystem,
        hasCursorIDE: !!this.cursorIDE,
        hasBrowserManager: !!this.browserManager,
        hasIDEManager: !!this.ideManager,
        hasWebSocketManager: !!this.webSocketManager,
        hasTaskSessionRepository: !!this.taskSessionRepository,
        hasEventBus: !!this.eventBus
      }
    };
  }
}

module.exports = ProcessTodoListHandler; 