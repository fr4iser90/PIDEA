/**
 * Event Handlers - Professional Event Management
 * 
 * This module provides a clean, modular approach to event handling
 * including WebSocket broadcasting and event subscriptions.
 */

class EventHandlers {
  constructor(eventBus, webSocketManager, logger) {
    this.eventBus = eventBus;
    this.webSocketManager = webSocketManager;
    this.logger = logger;
  }

  /**
   * Setup all event handlers
   */
  setupEventHandlers() {
    this.logger.info('Setting up event handlers...');

    if (this.eventBus) {
      this.logger.info('EventBus available, setting up subscriptions...');
      
      // ========================================
      // IDE EVENTS - IDE Management
      // ========================================
      this.setupIDEEvents();
      
      // ========================================
      // CHAT EVENTS - Chat Management
      // ========================================
      this.setupChatEvents();
      
      // ========================================
      // QUEUE EVENTS - Queue Management
      // ========================================
      this.setupQueueEvents();
      
      // ========================================
      // WORKFLOW EVENTS - Workflow Management
      // ========================================
      this.setupWorkflowEvents();
      
      // ========================================
      // GIT EVENTS - Git Management
      // ========================================
      this.setupGitEvents();
      
      // ========================================
      // TEST EVENTS - Test Management
      // ========================================
      this.setupTestEvents();
      
      // ========================================
      // VERSION EVENTS - Version Management
      // ========================================
      this.setupVersionEvents();
      
    } else {
      this.logger.warn('No EventBus available for setting up event handlers');
    }

    this.logger.info('Event handlers setup complete');
  }

  setupIDEEvents() {
    this.eventBus.subscribe('ide-started', (data) => {
      this.logger.info('IDE started:', '[REDACTED_IDE_DATA]');
      if (this.webSocketManager) {
        this.webSocketManager.broadcastToUser('ide-started', data);
      }
    });

    this.eventBus.subscribe('ide-stopped', (data) => {
      this.logger.info('IDE stopped:', '[REDACTED_IDE_DATA]');
      if (this.webSocketManager) {
        this.webSocketManager.broadcastToUser('ide-stopped', data);
      }
    });

    this.eventBus.subscribe('userAppDetected', (data) => {
      this.logger.info('User app detected event:', '[REDACTED_APP_DATA]');
      if (this.webSocketManager) {
        this.webSocketManager.broadcastToAll('userAppUrl', data);
      }
    });

    this.eventBus.subscribe('activeIDEChanged', (data) => {
      this.logger.info('Active IDE changed event:', '[REDACTED_IDE_DATA]');
      if (this.webSocketManager) {
        this.logger.info('Broadcasting activeIDEChanged to all clients');
        this.webSocketManager.broadcastToAll('activeIDEChanged', data);
      } else {
        this.logger.warn('No WebSocket manager available for broadcasting activeIDEChanged');
      }
    });

    this.eventBus.subscribe('ideListUpdated', (data) => {
      this.logger.info('IDE list updated event:', '[REDACTED_IDE_DATA]');
      if (this.webSocketManager) {
        this.logger.info('Broadcasting ideListUpdated to all clients');
        this.webSocketManager.broadcastToAll('ideListUpdated', data);
      } else {
        this.logger.warn('No WebSocket manager available for broadcasting ideListUpdated');
      }
    });
  }

  setupChatEvents() {
    this.eventBus.subscribe('chat-message', (data) => {
      this.logger.info('Chat message:', '[REDACTED_CHAT_DATA]');
      if (this.webSocketManager) {
        this.webSocketManager.broadcastToUser('chat-message', data);
      }
    });

    this.eventBus.subscribe('MessageSent', (data) => {
      this.logger.info('Message sent event:', '[REDACTED_MESSAGE_DATA]');
      if (this.webSocketManager) {
        this.webSocketManager.broadcastToUser('chat-message', data);
      }
    });

    this.eventBus.subscribe('ChatHistoryUpdated', (data) => {
      this.logger.info('Chat history updated event:', '[REDACTED_HISTORY_DATA]');
      if (this.webSocketManager) {
        this.webSocketManager.broadcastToUser('chat-history-updated', data);
      }
    });
  }

  setupQueueEvents() {
    this.eventBus.subscribe('queue:item:added', (data) => {
      this.logger.info('Queue item added event:', '[REDACTED_QUEUE_DATA]');
      if (this.webSocketManager) {
        this.logger.info('Broadcasting queue:item:added to all clients');
        this.webSocketManager.broadcastToAll('queue:item:added', data);
      } else {
        this.logger.warn('No WebSocket manager available for broadcasting queue:item:added');
      }
    });

    this.eventBus.subscribe('queue:item:updated', (data) => {
      this.logger.info('Queue item updated event:', '[REDACTED_QUEUE_DATA]');
      if (this.webSocketManager) {
        this.logger.info('Broadcasting queue:item:updated to all clients');
        this.webSocketManager.broadcastToAll('queue:item:updated', data);
      } else {
        this.logger.warn('No WebSocket manager available for broadcasting queue:item:updated');
      }
    });

    this.eventBus.subscribe('queue:item:completed', (data) => {
      this.logger.info('Queue item completed event:', '[REDACTED_QUEUE_DATA]');
      if (this.webSocketManager) {
        this.logger.info('Broadcasting queue:item:completed to all clients');
        this.webSocketManager.broadcastToAll('queue:item:completed', data);
      } else {
        this.logger.warn('No WebSocket manager available for broadcasting queue:item:completed');
      }
    });
  }

  setupWorkflowEvents() {
    this.eventBus.subscribe('workflow:step:progress', (data) => {
      this.logger.info('Workflow step progress event:', '[REDACTED_WORKFLOW_DATA]');
      if (this.webSocketManager) {
        this.logger.info('Broadcasting workflow:step:progress to all clients');
        this.webSocketManager.broadcastToAll('workflow:step:progress', data);
      } else {
        this.logger.warn('No WebSocket manager available for broadcasting workflow:step:progress');
      }
    });

    this.eventBus.subscribe('workflow:step:completed', (data) => {
      this.logger.info('Workflow step completed event:', '[REDACTED_WORKFLOW_DATA]');
      if (this.webSocketManager) {
        this.logger.info('Broadcasting workflow:step:completed to all clients');
        this.webSocketManager.broadcastToAll('workflow:step:completed', data);
      } else {
        this.logger.warn('No WebSocket manager available for broadcasting workflow:step:completed');
      }
    });

    this.eventBus.subscribe('workflow:step:failed', (data) => {
      this.logger.info('Workflow step failed event:', '[REDACTED_WORKFLOW_DATA]');
      if (this.webSocketManager) {
        this.logger.info('Broadcasting workflow:step:failed to all clients');
        this.webSocketManager.broadcastToAll('workflow:step:failed', data);
      } else {
        this.logger.warn('No WebSocket manager available for broadcasting workflow:step:failed');
      }
    });

    this.eventBus.subscribe('analysis:completed', (data) => {
      this.logger.info('Analysis completed event:', '[REDACTED_ANALYSIS_DATA]');
      if (this.webSocketManager) {
        this.logger.info('Broadcasting analysis:completed to all clients');
        this.webSocketManager.broadcastToAll('analysis:completed', data);
      } else {
        this.logger.warn('No WebSocket manager available for broadcasting analysis:completed');
      }
    });
  }

  setupGitEvents() {
    this.eventBus.subscribe('git:checkout:completed', (data) => {
      this.logger.info('Git checkout completed event:', '[REDACTED_GIT_DATA]');
      if (this.webSocketManager) {
        this.logger.info('Broadcasting git-branch-changed to all clients');
        this.webSocketManager.broadcastToAll('git-branch-changed', {
          workspacePath: data.projectPath,
          newBranch: data.branch
        });
      } else {
        this.logger.warn('No WebSocket manager available for broadcasting git-branch-changed');
      }
    });

    this.eventBus.subscribe('git:pull:completed', (data) => {
      this.logger.info('Git pull completed event:', '[REDACTED_GIT_DATA]');
      if (this.webSocketManager) {
        this.logger.info('Broadcasting git-status-updated to all clients');
        this.webSocketManager.broadcastToAll('git-status-updated', {
          workspacePath: data.projectPath,
          gitStatus: {
            currentBranch: data.branch,
            lastUpdate: new Date().toISOString()
          }
        });
      } else {
        this.logger.warn('No WebSocket manager available for broadcasting git-status-updated');
      }
    });

    this.eventBus.subscribe('git:merge:completed', (data) => {
      this.logger.info('Git merge completed event:', '[REDACTED_GIT_DATA]');
      if (this.webSocketManager) {
        this.logger.info('Broadcasting git-status-updated to all clients');
        this.webSocketManager.broadcastToAll('git-status-updated', {
          workspacePath: data.projectPath,
          gitStatus: {
            currentBranch: data.targetBranch,
            lastUpdate: new Date().toISOString()
          }
        });
      } else {
        this.logger.warn('No WebSocket manager available for broadcasting git-status-updated');
      }
    });

    this.eventBus.subscribe('git:branch:created', (data) => {
      this.logger.info('Git branch created event:', '[REDACTED_GIT_DATA]');
      if (this.webSocketManager) {
        this.logger.info('Broadcasting git-status-updated to all clients');
        this.webSocketManager.broadcastToAll('git-status-updated', {
          workspacePath: data.projectPath,
          gitStatus: {
            currentBranch: data.branchName,
            lastUpdate: new Date().toISOString()
          }
        });
      } else {
        this.logger.warn('No WebSocket manager available for broadcasting git-status-updated');
      }
    });
  }

  setupTestEvents() {
    this.eventBus.subscribe('playwright:config:saved', (data) => {
      this.logger.info('Playwright config saved event:', '[REDACTED_CONFIG_DATA]');
      if (this.webSocketManager) {
        this.webSocketManager.broadcastToAll('playwright:config:saved', data);
      } else {
        this.logger.warn('WebSocket manager not available for playwright:config:saved broadcast');
      }
    });

    this.eventBus.subscribe('playwright:config:failed', (data) => {
      this.logger.info('Playwright config failed event:', '[REDACTED_ERROR_DATA]');
      if (this.webSocketManager) {
        this.webSocketManager.broadcastToAll('playwright:config:failed', data);
      } else {
        this.logger.warn('WebSocket manager not available for playwright:config:failed broadcast');
      }
    });
  }

  setupVersionEvents() {
    // AI Version Analysis Completed Event
    this.eventBus.subscribe('ai-version-analysis-completed', (data) => {
      this.logger.info('AI version analysis completed event:', '[REDACTED_ANALYSIS_DATA]');
      if (this.webSocketManager) {
        this.webSocketManager.broadcastToAll('ai-version-analysis-completed', data);
        this.logger.info('Broadcasting ai-version-analysis-completed to all clients');
      } else {
        this.logger.warn('WebSocket manager not available for ai-version-analysis-completed broadcast');
      }
    });
  }
}

module.exports = EventHandlers;
