/**
 * TaskNotificationService - Real-time task notifications and alerts
 */
const EventEmitter = require('events');
const { logger } = require('@infrastructure/logging/Logger');

class TaskNotificationService {
    constructor(dependencies = {}) {
        this.io = dependencies.io;
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
        this.authService = dependencies.authService;
        
        this.notifications = new Map();
        this.userSubscriptions = new Map();
        this.notificationTemplates = new Map();
        
        this.setupEventListeners();
        this.setupNotificationTemplates();
    }

    /**
     * Setup event listeners for notifications
     */
    setupEventListeners() {
        // Task events
        this.eventBus.on('task:created', this.handleTaskCreated.bind(this));
        this.eventBus.on('task:updated', this.handleTaskUpdated.bind(this));
        this.eventBus.on('task:deleted', this.handleTaskDeleted.bind(this));
        
        // Task execution events
        this.eventBus.on('task:execution:start', this.handleTaskExecutionStart.bind(this));
        this.eventBus.on('task:execution:complete', this.handleTaskExecutionComplete.bind(this));
        this.eventBus.on('task:execution:error', this.handleTaskExecutionError.bind(this));
        
        // Analysis events
        this.eventBus.on('analysis:complete', this.handleAnalysisComplete.bind(this));
        this.eventBus.on('analysis:error', this.handleAnalysisError.bind(this));
        
        // Suggestion events
        this.eventBus.on('suggestion:generated', this.handleSuggestionGenerated.bind(this));
        this.eventBus.on('suggestion:applied', this.handleSuggestionApplied.bind(this));
        
        // Script events
        this.eventBus.on('script:generated', this.handleScriptGenerated.bind(this));
        this.eventBus.on('script:executed', this.handleScriptExecuted.bind(this));
        this.eventBus.on('script:error', this.handleScriptError.bind(this));
        
        // Auto mode events
        this.eventBus.on('auto:start', this.handleAutoModeStart.bind(this));
        this.eventBus.on('auto:complete', this.handleAutoModeComplete.bind(this));
        this.eventBus.on('auto:error', this.handleAutoModeError.bind(this));
    }

    /**
     * Setup notification templates
     */
    setupNotificationTemplates() {
        // Task notifications
        this.notificationTemplates.set('task:created', {
            title: 'New Task Created',
            message: 'A new task "{taskTitle}" has been created',
            type: 'info',
            icon: 'task',
            priority: 'normal'
        });

        this.notificationTemplates.set('task:updated', {
            title: 'Task Updated',
            message: 'Task "{taskTitle}" has been updated',
            type: 'info',
            icon: 'edit',
            priority: 'normal'
        });

        this.notificationTemplates.set('task:deleted', {
            title: 'Task Deleted',
            message: 'Task "{taskTitle}" has been deleted',
            type: 'warning',
            icon: 'delete',
            priority: 'high'
        });

        // Task execution notifications
        this.notificationTemplates.set('task:execution:start', {
            title: 'Task Execution Started',
            message: 'Task "{taskTitle}" execution has started',
            type: 'info',
            icon: 'play',
            priority: 'normal'
        });

        this.notificationTemplates.set('task:execution:complete', {
            title: 'Task Execution Completed',
            message: 'Task "{taskTitle}" has been completed successfully',
            type: 'success',
            icon: 'check',
            priority: 'normal'
        });

        this.notificationTemplates.set('task:execution:error', {
            title: 'Task Execution Failed',
            message: 'Task "{taskTitle}" execution has failed: {error}',
            type: 'error',
            icon: 'error',
            priority: 'high'
        });

        // Analysis notifications
        this.notificationTemplates.set('analysis:complete', {
            title: 'Project Analysis Complete',
            message: 'Project analysis for "{projectName}" has been completed',
            type: 'success',
            icon: 'analysis',
            priority: 'normal'
        });

        this.notificationTemplates.set('analysis:error', {
            title: 'Project Analysis Failed',
            message: 'Project analysis for "{projectName}" has failed: {error}',
            type: 'error',
            icon: 'error',
            priority: 'high'
        });

        // Suggestion notifications
        this.notificationTemplates.set('suggestion:generated', {
            title: 'AI Suggestions Generated',
            message: '{count} new AI suggestions have been generated for your project',
            type: 'info',
            icon: 'ai',
            priority: 'normal'
        });

        this.notificationTemplates.set('suggestion:applied', {
            title: 'Suggestion Applied',
            message: 'AI suggestion "{suggestionTitle}" has been applied successfully',
            type: 'success',
            icon: 'check',
            priority: 'normal'
        });

        // Script notifications
        this.notificationTemplates.set('script:generated', {
            title: 'Script Generated',
            message: 'Script "{scriptName}" has been generated successfully',
            type: 'success',
            icon: 'script',
            priority: 'normal'
        });

        this.notificationTemplates.set('script:executed', {
            title: 'Script Executed',
            message: 'Script "{scriptName}" has been executed successfully',
            type: 'success',
            icon: 'play',
            priority: 'normal'
        });

        this.notificationTemplates.set('script:error', {
            title: 'Script Error',
            message: 'Script "{scriptName}" execution failed: {error}',
            type: 'error',
            icon: 'error',
            priority: 'high'
        });

        // Auto mode notifications
        this.notificationTemplates.set('auto:start', {
            title: 'Auto Mode Started',
            message: 'VibeCoder auto mode has started for project "{projectName}"',
            type: 'info',
            icon: 'auto',
            priority: 'normal'
        });

        this.notificationTemplates.set('auto:complete', {
            title: 'Auto Mode Completed',
            message: 'VibeCoder auto mode has completed successfully for project "{projectName}"',
            type: 'success',
            icon: 'check',
            priority: 'normal'
        });

        this.notificationTemplates.set('auto:error', {
            title: 'Auto Mode Failed',
            message: 'VibeCoder auto mode has failed for project "{projectName}": {error}',
            type: 'error',
            icon: 'error',
            priority: 'high'
        });
    }

    /**
     * Handle task created event
     * @param {Object} data - Task data
     */
    handleTaskCreated(data) {
        this.createNotification('task:created', {
            taskTitle: data.task.title,
            taskId: data.task.id,
            projectId: data.task.projectId,
            createdBy: data.task.createdBy
        });
    }

    /**
     * Handle task updated event
     * @param {Object} data - Task data
     */
    handleTaskUpdated(data) {
        this.createNotification('task:updated', {
            taskTitle: data.task.title,
            taskId: data.task.id,
            projectId: data.task.projectId,
            updatedBy: data.task.updatedBy
        });
    }

    /**
     * Handle task deleted event
     * @param {Object} data - Task data
     */
    handleTaskDeleted(data) {
        this.createNotification('task:deleted', {
            taskTitle: data.task.title,
            taskId: data.task.id,
            projectId: data.task.projectId,
            deletedBy: data.task.deletedBy
        });
    }

    /**
     * Handle task execution start event
     * @param {Object} data - Execution data
     */
    handleTaskExecutionStart(data) {
        this.createNotification('task:execution:start', {
            taskTitle: data.task.title,
            taskId: data.task.id,
            executionId: data.execution.id,
            projectId: data.task.projectId
        });
    }

    /**
     * Handle task execution complete event
     * @param {Object} data - Execution data
     */
    handleTaskExecutionComplete(data) {
        this.createNotification('task:execution:complete', {
            taskTitle: data.task.title,
            taskId: data.task.id,
            executionId: data.execution.id,
            projectId: data.task.projectId,
            duration: data.execution.duration
        });
    }

    /**
     * Handle task execution error event
     * @param {Object} data - Error data
     */
    handleTaskExecutionError(data) {
        this.createNotification('task:execution:error', {
            taskTitle: data.task.title,
            taskId: data.task.id,
            executionId: data.execution.id,
            projectId: data.task.projectId,
            error: data.error.message
        });
    }

    /**
     * Handle analysis complete event
     * @param {Object} data - Analysis data
     */
    handleAnalysisComplete(data) {
        this.createNotification('analysis:complete', {
            projectName: data.project.name,
            projectId: data.project.id,
            analysisId: data.analysis.id,
            insights: data.insights.length
        });
    }

    /**
     * Handle analysis error event
     * @param {Object} data - Error data
     */
    handleAnalysisError(data) {
        this.createNotification('analysis:error', {
            projectName: data.project.name,
            projectId: data.project.id,
            error: data.error.message
        });
    }

    /**
     * Handle suggestion generated event
     * @param {Object} data - Suggestion data
     */
    handleSuggestionGenerated(data) {
        this.createNotification('suggestion:generated', {
            count: data.suggestions.length,
            projectId: data.projectId,
            projectName: data.projectName
        });
    }

    /**
     * Handle suggestion applied event
     * @param {Object} data - Suggestion data
     */
    handleSuggestionApplied(data) {
        this.createNotification('suggestion:applied', {
            suggestionTitle: data.suggestion.title,
            suggestionId: data.suggestion.id,
            projectId: data.projectId
        });
    }

    /**
     * Handle script generated event
     * @param {Object} data - Script data
     */
    handleScriptGenerated(data) {
        this.createNotification('script:generated', {
            scriptName: data.script.name,
            scriptId: data.script.id,
            scriptType: data.script.type,
            projectId: data.script.projectId
        });
    }

    /**
     * Handle script executed event
     * @param {Object} data - Script data
     */
    handleScriptExecuted(data) {
        this.createNotification('script:executed', {
            scriptName: data.script.name,
            scriptId: data.script.id,
            executionId: data.execution.id,
            projectId: data.script.projectId
        });
    }

    /**
     * Handle script error event
     * @param {Object} data - Error data
     */
    handleScriptError(data) {
        this.createNotification('script:error', {
            scriptName: data.script.name,
            scriptId: data.script.id,
            error: data.error.message,
            projectId: data.script.projectId
        });
    }

    /**
     * Handle auto mode start event
     * @param {Object} data - Auto mode data
     */
    handleAutoModeStart(data) {
        this.createNotification('auto:start', {
            projectName: data.project.name,
            projectId: data.project.id,
            sessionId: data.session.id,
            mode: data.mode
        });
    }

    /**
     * Handle auto mode complete event
     * @param {Object} data - Auto mode data
     */
    handleAutoModeComplete(data) {
        this.createNotification('auto:complete', {
            projectName: data.project.name,
            projectId: data.project.id,
            sessionId: data.session.id,
            completedTasks: data.results.completedTasks,
            totalTasks: data.results.totalTasks
        });
    }

    /**
     * Handle auto mode error event
     * @param {Object} data - Error data
     */
    handleAutoModeError(data) {
        this.createNotification('auto:error', {
            projectName: data.project.name,
            projectId: data.project.id,
            sessionId: data.session.id,
            error: data.error.message
        });
    }

    /**
     * Create notification
     * @param {string} type - Notification type
     * @param {Object} data - Notification data
     */
    createNotification(type, data) {
        try {
            const template = this.notificationTemplates.get(type);
            if (!template) {
                this.logger.warn('TaskNotificationService: No template found for notification type', { type });
                return;
            }

            const notification = {
                id: this.generateNotificationId(),
                type,
                title: this.interpolateTemplate(template.title, data),
                message: this.interpolateTemplate(template.message, data),
                icon: template.icon,
                priority: template.priority,
                data,
                timestamp: new Date(),
                read: false,
                dismissed: false
            };

            // Store notification
            this.notifications.set(notification.id, notification);

            // Determine recipients
            const recipients = this.determineRecipients(type, data);
            
            // Send notifications to recipients
            this.sendNotificationToRecipients(notification, recipients);

            this.logger.info('TaskNotificationService: Notification created', {
                notificationId: notification.id,
                type,
                recipients: recipients.length
            });

        } catch (error) {
            this.logger.error('TaskNotificationService: Failed to create notification', {
                type,
                error: error.message
            });
        }
    }

    /**
     * Interpolate template with data
     * @param {string} template - Template string
     * @param {Object} data - Data object
     * @returns {string} Interpolated string
     */
    interpolateTemplate(template, data) {
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            return data[key] !== undefined ? data[key] : match;
        });
    }

    /**
     * Generate unique notification ID
     * @returns {string} Notification ID
     */
    generateNotificationId() {
        return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Determine notification recipients
     * @param {string} type - Notification type
     * @param {Object} data - Notification data
     * @returns {Array} Array of user IDs
     */
    determineRecipients(type, data) {
        const recipients = new Set();

        // Add project members
        if (data.projectId) {
            const projectMembers = this.getProjectMembers(data.projectId);
            projectMembers.forEach(memberId => recipients.add(memberId));
        }

        // Add specific users based on event type
        if (data.createdBy) {
            recipients.add(data.createdBy);
        }
        if (data.updatedBy) {
            recipients.add(data.updatedBy);
        }
        if (data.deletedBy) {
            recipients.add(data.deletedBy);
        }

        // Add task assignee
        if (data.assigneeId) {
            recipients.add(data.assigneeId);
        }

        // Add users with specific subscriptions
        const subscribedUsers = this.getSubscribedUsers(type);
        subscribedUsers.forEach(userId => recipients.add(userId));

        return Array.from(recipients);
    }

    /**
     * Get project members
     * @param {string} projectId - Project ID
     * @returns {Array} Array of user IDs
     */
    getProjectMembers(projectId) {
        // This would typically query the database for project members
        // For now, return an empty array
        return [];
    }

    /**
     * Get subscribed users for notification type
     * @param {string} type - Notification type
     * @returns {Array} Array of user IDs
     */
    getSubscribedUsers(type) {
        const subscribers = [];
        for (const [userId, subscriptions] of this.userSubscriptions.entries()) {
            if (subscriptions.has(type) || subscriptions.has('all')) {
                subscribers.push(userId);
            }
        }
        return subscribers;
    }

    /**
     * Send notification to recipients
     * @param {Object} notification - Notification object
     * @param {Array} recipients - Array of user IDs
     */
    sendNotificationToRecipients(notification, recipients) {
        try {
            // Send to WebSocket clients
            recipients.forEach(userId => {
                const roomName = `notifications:${userId}`;
                this.io.to(roomName).emit('notification:new', {
                    notification,
                    timestamp: new Date().toISOString()
                });
            });

            // Store for each recipient
            recipients.forEach(userId => {
                this.storeUserNotification(userId, notification);
            });

        } catch (error) {
            this.logger.error('TaskNotificationService: Failed to send notifications', {
                notificationId: notification.id,
                error: error.message
            });
        }
    }

    /**
     * Store notification for user
     * @param {string} userId - User ID
     * @param {Object} notification - Notification object
     */
    storeUserNotification(userId, notification) {
        try {
            if (!this.userSubscriptions.has(userId)) {
                this.userSubscriptions.set(userId, new Set());
            }

            // Store notification in user's notification list
            const userNotifications = this.getUserNotifications(userId);
            userNotifications.unshift(notification);

            // Keep only last 100 notifications per user
            if (userNotifications.length > 100) {
                userNotifications.splice(100);
            }

            this.logger.debug('TaskNotificationService: Notification stored for user', {
                userId,
                notificationId: notification.id
            });

        } catch (error) {
            this.logger.error('TaskNotificationService: Failed to store user notification', {
                userId,
                notificationId: notification.id,
                error: error.message
            });
        }
    }

    /**
     * Get user notifications
     * @param {string} userId - User ID
     * @returns {Array} Array of notifications
     */
    getUserNotifications(userId) {
        // This would typically query the database
        // For now, return an empty array
        return [];
    }

    /**
     * Subscribe user to notification types
     * @param {string} userId - User ID
     * @param {Array} types - Array of notification types
     */
    subscribeUser(userId, types) {
        try {
            if (!this.userSubscriptions.has(userId)) {
                this.userSubscriptions.set(userId, new Set());
            }

            const subscriptions = this.userSubscriptions.get(userId);
            types.forEach(type => subscriptions.add(type));

            this.logger.info('TaskNotificationService: User subscribed to notifications', {
                userId,
                types
            });

        } catch (error) {
            this.logger.error('TaskNotificationService: Failed to subscribe user', {
                userId,
                types,
                error: error.message
            });
        }
    }

    /**
     * Unsubscribe user from notification types
     * @param {string} userId - User ID
     * @param {Array} types - Array of notification types
     */
    unsubscribeUser(userId, types) {
        try {
            const subscriptions = this.userSubscriptions.get(userId);
            if (subscriptions) {
                types.forEach(type => subscriptions.delete(type));
            }

            this.logger.info('TaskNotificationService: User unsubscribed from notifications', {
                userId,
                types
            });

        } catch (error) {
            this.logger.error('TaskNotificationService: Failed to unsubscribe user', {
                userId,
                types,
                error: error.message
            });
        }
    }

    /**
     * Mark notification as read
     * @param {string} userId - User ID
     * @param {string} notificationId - Notification ID
     */
    markNotificationAsRead(userId, notificationId) {
        try {
            const notification = this.notifications.get(notificationId);
            if (notification) {
                notification.read = true;
                notification.readAt = new Date();
            }

            this.logger.debug('TaskNotificationService: Notification marked as read', {
                userId,
                notificationId
            });

        } catch (error) {
            this.logger.error('TaskNotificationService: Failed to mark notification as read', {
                userId,
                notificationId,
                error: error.message
            });
        }
    }

    /**
     * Dismiss notification
     * @param {string} userId - User ID
     * @param {string} notificationId - Notification ID
     */
    dismissNotification(userId, notificationId) {
        try {
            const notification = this.notifications.get(notificationId);
            if (notification) {
                notification.dismissed = true;
                notification.dismissedAt = new Date();
            }

            this.logger.debug('TaskNotificationService: Notification dismissed', {
                userId,
                notificationId
            });

        } catch (error) {
            this.logger.error('TaskNotificationService: Failed to dismiss notification', {
                userId,
                notificationId,
                error: error.message
            });
        }
    }

    /**
     * Get notification statistics
     * @returns {Object} Notification statistics
     */
    getNotificationStats() {
        const stats = {
            total: this.notifications.size,
            unread: 0,
            byType: {},
            byPriority: {
                low: 0,
                normal: 0,
                high: 0
            }
        };

        for (const notification of this.notifications.values()) {
            if (!notification.read) {
                stats.unread++;
            }

            stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
            stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;
        }

        return stats;
    }

    /**
     * Health check
     * @returns {Object} Health status
     */
    getHealthStatus() {
        return {
            status: 'healthy',
            notifications: this.notifications.size,
            userSubscriptions: this.userSubscriptions.size,
            templates: this.notificationTemplates.size,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = TaskNotificationService; 