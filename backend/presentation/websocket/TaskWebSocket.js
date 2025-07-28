/**
 * TaskWebSocket - Real-time task updates and communication
 */
const EventEmitter = require('events');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class TaskWebSocket {
    constructor(dependencies = {}) {
        this.io = dependencies.io;
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
        this.authService = dependencies.authService;
        this.taskMonitoringService = dependencies.taskMonitoringService;
        
        this.connectedClients = new Map();
        this.roomSubscriptions = new Map();
        
        this.setupEventListeners();
        this.setupWebSocketHandlers();
    }

    /**
     * Setup event listeners for task events
     */
    setupEventListeners() {
        // Task events
        this.eventBus.on('task:created', this.handleTaskCreated.bind(this));
        this.eventBus.on('task:updated', this.handleTaskUpdated.bind(this));
        this.eventBus.on('task:deleted', this.handleTaskDeleted.bind(this));
        this.eventBus.on('task:sync:completed', this.handleTaskSyncCompleted.bind(this));
        
        // Task execution events
        this.eventBus.on('task:execution:start', this.handleTaskExecutionStart.bind(this));
        this.eventBus.on('task:execution:progress', this.handleTaskExecutionProgress.bind(this));
        this.eventBus.on('task:execution:complete', this.handleTaskExecutionComplete.bind(this));
        this.eventBus.on('task:execution:error', this.handleTaskExecutionError.bind(this));
        
        // Analysis events
        this.eventBus.on('analysis:start', this.handleAnalysisStart.bind(this));
        this.eventBus.on('analysis:progress', this.handleAnalysisProgress.bind(this));
        this.eventBus.on('analysis:complete', this.handleAnalysisComplete.bind(this));
        this.eventBus.on('analysis:error', this.handleAnalysisError.bind(this));
        
        // Analysis step events
        this.eventBus.on('step:created', this.handleAnalysisStepCreated.bind(this));
        this.eventBus.on('step:started', this.handleAnalysisStepStarted.bind(this));
        this.eventBus.on('step:progress', this.handleAnalysisStepProgress.bind(this));
        this.eventBus.on('step:completed', this.handleAnalysisStepCompleted.bind(this));
        this.eventBus.on('step:failed', this.handleAnalysisStepFailed.bind(this));
        this.eventBus.on('step:cancelled', this.handleAnalysisStepCancelled.bind(this));
        
        // Suggestion events
        this.eventBus.on('suggestion:generated', this.handleSuggestionGenerated.bind(this));
        this.eventBus.on('suggestion:applied', this.handleSuggestionApplied.bind(this));
        this.eventBus.on('suggestion:rejected', this.handleSuggestionRejected.bind(this));
        
        // Script events
        this.eventBus.on('script:generated', this.handleScriptGenerated.bind(this));
        this.eventBus.on('script:executed', this.handleScriptExecuted.bind(this));
        this.eventBus.on('script:error', this.handleScriptError.bind(this));
        
        // Auto mode events
        this.eventBus.on('auto:start', this.handleAutoModeStart.bind(this));
        this.eventBus.on('auto:progress', this.handleAutoModeProgress.bind(this));
        this.eventBus.on('auto:complete', this.handleAutoModeComplete.bind(this));
        this.eventBus.on('auto:error', this.handleAutoModeError.bind(this));
        
        // IDE events
        this.eventBus.on('ide:list:updated', this.handleIDEListUpdated.bind(this));
        this.eventBus.on('ide:status:changed', this.handleIDEStatusChanged.bind(this));
        this.eventBus.on('ide:switched', this.handleIDESwitched.bind(this));
        this.eventBus.on('ide:features:updated', this.handleIDEFeaturesUpdated.bind(this));
        this.eventBus.on('ide:mirror:status:changed', this.handleIDEMirrorStatusChanged.bind(this));
        this.eventBus.on('ide:dom:updated', this.handleIDEDOMUpdated.bind(this));
        this.eventBus.on('ide:element:interaction', this.handleIDEElementInteraction.bind(this));
        
        // Queue events
        this.eventBus.on('queue:updated', this.handleQueueUpdated.bind(this));
        this.eventBus.on('queue:item:added', this.handleQueueItemAdded.bind(this));
        this.eventBus.on('queue:item:cancelled', this.handleQueueItemCancelled.bind(this));
        this.eventBus.on('queue:item:priority_updated', this.handleQueueItemPriorityUpdated.bind(this));
        this.eventBus.on('queue:items:cleared', this.handleQueueItemsCleared.bind(this));
        
        // Step progress events
        this.eventBus.on('task:step:progress', this.handleTaskStepProgress.bind(this));
        this.eventBus.on('task:step:started', this.handleTaskStepStarted.bind(this));
        this.eventBus.on('task:step:completed', this.handleTaskStepCompleted.bind(this));
        this.eventBus.on('task:step:failed', this.handleTaskStepFailed.bind(this));
        this.eventBus.on('task:step:paused', this.handleTaskStepPaused.bind(this));
        this.eventBus.on('task:step:resumed', this.handleTaskStepResumed.bind(this));
        this.eventBus.on('task:step:progress:initialized', this.handleTaskStepProgressInitialized.bind(this));
    }

    /**
     * Setup WebSocket connection handlers
     */
    setupWebSocketHandlers() {
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });
    }

    /**
     * Handle new WebSocket connection
     * @param {Socket} socket - Socket instance
     */
    async handleConnection(socket) {
        try {
            // Authenticate user
            const user = await this.authenticateSocket(socket);
            if (!user) {
                socket.disconnect();
                return;
            }

            // Store client information
            this.connectedClients.set(socket.id, {
                socket,
                user,
                subscriptions: new Set(),
                connectedAt: new Date()
            });

            this.logger.info('TaskWebSocket: Client connected', {
                socketId: socket.id,
                userId: user.id,
                username: user.username
            });

            // Send welcome message
            socket.emit('connected', {
                message: 'Connected to task management system',
                userId: user.id,
                timestamp: new Date().toISOString()
            });

            // Setup socket event handlers
            this.setupSocketEventHandlers(socket, user);

        } catch (error) {
            this.logger.error('TaskWebSocket: Failed to handle connection', {
                socketId: socket.id,
                error: error.message
            });
            socket.disconnect();
        }
    }

    /**
     * Authenticate WebSocket connection
     * @param {Socket} socket - Socket instance
     * @returns {Object|null} User object or null if authentication fails
     */
    async authenticateSocket(socket) {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
            if (!token) {
                socket.emit('error', { message: 'Authentication required' });
                return null;
            }

            const user = await this.authService.verifyAuthentication(token);
            if (!user) {
                socket.emit('error', { message: 'Invalid authentication' });
                return null;
            }

            return user;
        } catch (error) {
            this.logger.error('TaskWebSocket: Authentication failed', {
                socketId: socket.id,
                error: error.message
            });
            socket.emit('error', { message: 'Authentication failed' });
            return null;
        }
    }

    /**
     * Setup event handlers for individual socket
     * @param {Socket} socket - Socket instance
     * @param {Object} user - User object
     */
    setupSocketEventHandlers(socket, user) {
        // Subscribe to task updates
        socket.on('subscribe:task', (data) => {
            this.handleTaskSubscription(socket, user, data);
        });

        // Unsubscribe from task updates
        socket.on('unsubscribe:task', (data) => {
            this.handleTaskUnsubscription(socket, user, data);
        });

        // Subscribe to project updates
        socket.on('subscribe:project', (data) => {
            this.handleProjectSubscription(socket, user, data);
        });

        // Unsubscribe from project updates
        socket.on('unsubscribe:project', (data) => {
            this.handleProjectUnsubscription(socket, user, data);
        });

        // Subscribe to auto mode updates
        socket.on('subscribe:auto', (data) => {
            this.handleAutoModeSubscription(socket, user, data);
        });

        // Unsubscribe from auto mode updates
        socket.on('unsubscribe:auto', (data) => {
            this.handleAutoModeUnsubscription(socket, user, data);
        });

        // Request task status
        socket.on('request:task:status', (data) => {
            this.handleTaskStatusRequest(socket, user, data);
        });

        // Request execution logs
        socket.on('request:execution:logs', (data) => {
            this.handleExecutionLogsRequest(socket, user, data);
        });

        // Subscribe to IDE updates
        socket.on('subscribe:ide', (data) => {
            this.handleIDESubscription(socket, user, data);
        });

        // Unsubscribe from IDE updates
        socket.on('unsubscribe:ide', (data) => {
            this.handleIDEUnsubscription(socket, user, data);
        });

        // Subscribe to IDE mirror updates
        socket.on('subscribe:ide:mirror', (data) => {
            this.handleIDEMirrorSubscription(socket, user, data);
        });

        // Unsubscribe from IDE mirror updates
        socket.on('unsubscribe:ide:mirror', (data) => {
            this.handleIDEMirrorUnsubscription(socket, user, data);
        });

        // Request IDE status
        socket.on('request:ide:status', (data) => {
            this.handleIDEStatusRequest(socket, user, data);
        });

        // Request IDE features
        socket.on('request:ide:features', (data) => {
            this.handleIDEFeaturesRequest(socket, user, data);
        });

        // Disconnect handler
        socket.on('disconnect', () => {
            this.handleDisconnection(socket, user);
        });

        // Error handler
        socket.on('error', (error) => {
            this.logger.error('TaskWebSocket: Socket error', {
                socketId: socket.id,
                userId: user.id,
                error: error.message
            });
        });
    }

    /**
     * Handle task subscription
     * @param {Socket} socket - Socket instance
     * @param {Object} user - User object
     * @param {Object} data - Subscription data
     */
    handleTaskSubscription(socket, user, data) {
        try {
            const { taskId, projectId } = data;
            const roomName = `task:${taskId}`;
            
            socket.join(roomName);
            
            const client = this.connectedClients.get(socket.id);
            if (client) {
                client.subscriptions.add(roomName);
            }

            // Track room subscription
            if (!this.roomSubscriptions.has(roomName)) {
                this.roomSubscriptions.set(roomName, new Set());
            }
            this.roomSubscriptions.get(roomName).add(socket.id);

            this.logger.info('TaskWebSocket: Task subscription added', {
                socketId: socket.id,
                userId: user.id,
                taskId,
                roomName
            });

            socket.emit('subscribed:task', {
                taskId,
                roomName,
                message: 'Subscribed to task updates'
            });

        } catch (error) {
            this.logger.error('TaskWebSocket: Failed to subscribe to task', {
                socketId: socket.id,
                userId: user.id,
                error: error.message
            });
            socket.emit('error', { message: 'Failed to subscribe to task' });
        }
    }

    /**
     * Handle task unsubscription
     * @param {Socket} socket - Socket instance
     * @param {Object} user - User object
     * @param {Object} data - Unsubscription data
     */
    handleTaskUnsubscription(socket, user, data) {
        try {
            const { taskId } = data;
            const roomName = `task:${taskId}`;
            
            socket.leave(roomName);
            
            const client = this.connectedClients.get(socket.id);
            if (client) {
                client.subscriptions.delete(roomName);
            }

            // Remove from room subscription tracking
            const roomSubs = this.roomSubscriptions.get(roomName);
            if (roomSubs) {
                roomSubs.delete(socket.id);
                if (roomSubs.size === 0) {
                    this.roomSubscriptions.delete(roomName);
                }
            }

            this.logger.info('TaskWebSocket: Task subscription removed', {
                socketId: socket.id,
                userId: user.id,
                taskId,
                roomName
            });

            socket.emit('unsubscribed:task', {
                taskId,
                roomName,
                message: 'Unsubscribed from task updates'
            });

        } catch (error) {
            this.logger.error('TaskWebSocket: Failed to unsubscribe from task', {
                socketId: socket.id,
                userId: user.id,
                error: error.message
            });
        }
    }

    /**
     * Handle project subscription
     * @param {Socket} socket - Socket instance
     * @param {Object} user - User object
     * @param {Object} data - Subscription data
     */
    handleProjectSubscription(socket, user, data) {
        try {
            const { projectId } = data;
            const roomName = `project:${projectId}`;
            
            socket.join(roomName);
            
            const client = this.connectedClients.get(socket.id);
            if (client) {
                client.subscriptions.add(roomName);
            }

            this.logger.info('TaskWebSocket: Project subscription added', {
                socketId: socket.id,
                userId: user.id,
                projectId,
                roomName
            });

            socket.emit('subscribed:project', {
                projectId,
                roomName,
                message: 'Subscribed to project updates'
            });

        } catch (error) {
            this.logger.error('TaskWebSocket: Failed to subscribe to project', {
                socketId: socket.id,
                userId: user.id,
                error: error.message
            });
            socket.emit('error', { message: 'Failed to subscribe to project' });
        }
    }

    /**
     * Handle project unsubscription
     * @param {Socket} socket - Socket instance
     * @param {Object} user - User object
     * @param {Object} data - Unsubscription data
     */
    handleProjectUnsubscription(socket, user, data) {
        try {
            const { projectId } = data;
            const roomName = `project:${projectId}`;
            
            socket.leave(roomName);
            
            const client = this.connectedClients.get(socket.id);
            if (client) {
                client.subscriptions.delete(roomName);
            }

            this.logger.info('TaskWebSocket: Project subscription removed', {
                socketId: socket.id,
                userId: user.id,
                projectId,
                roomName
            });

            socket.emit('unsubscribed:project', {
                projectId,
                roomName,
                message: 'Unsubscribed from project updates'
            });

        } catch (error) {
            this.logger.error('TaskWebSocket: Failed to unsubscribe from project', {
                socketId: socket.id,
                userId: user.id,
                error: error.message
            });
        }
    }

    /**
     * Handle auto mode subscription
     * @param {Socket} socket - Socket instance
     * @param {Object} user - User object
     * @param {Object} data - Subscription data
     */
    handleAutoModeSubscription(socket, user, data) {
        try {
            const { sessionId } = data;
            const roomName = `auto:${sessionId}`;
            
            socket.join(roomName);
            
            const client = this.connectedClients.get(socket.id);
            if (client) {
                client.subscriptions.add(roomName);
            }

            this.logger.info('TaskWebSocket: Auto mode subscription added', {
                socketId: socket.id,
                userId: user.id,
                sessionId,
                roomName
            });

            socket.emit('subscribed:auto', {
                sessionId,
                roomName,
                message: 'Subscribed to auto mode updates'
            });

        } catch (error) {
            this.logger.error('TaskWebSocket: Failed to subscribe to auto mode', {
                socketId: socket.id,
                userId: user.id,
                error: error.message
            });
            socket.emit('error', { message: 'Failed to subscribe to auto mode' });
        }
    }

    /**
     * Handle auto mode unsubscription
     * @param {Socket} socket - Socket instance
     * @param {Object} user - User object
     * @param {Object} data - Unsubscription data
     */
    handleAutoModeUnsubscription(socket, user, data) {
        try {
            const { sessionId } = data;
            const roomName = `auto:${sessionId}`;
            
            socket.leave(roomName);
            
            const client = this.connectedClients.get(socket.id);
            if (client) {
                client.subscriptions.delete(roomName);
            }

            this.logger.info('TaskWebSocket: Auto mode subscription removed', {
                socketId: socket.id,
                userId: user.id,
                sessionId,
                roomName
            });

            socket.emit('unsubscribed:auto', {
                sessionId,
                roomName,
                message: 'Unsubscribed from auto mode updates'
            });

        } catch (error) {
            this.logger.error('TaskWebSocket: Failed to unsubscribe from auto mode', {
                socketId: socket.id,
                userId: user.id,
                error: error.message
            });
        }
    }

    /**
     * Handle task status request
     * @param {Socket} socket - Socket instance
     * @param {Object} user - User object
     * @param {Object} data - Request data
     */
    async handleTaskStatusRequest(socket, user, data) {
        try {
            const { taskId } = data;
            
            // Get task status from monitoring service
            const status = await this.taskMonitoringService.getTaskStatus(taskId, user.id);
            
            socket.emit('task:status', {
                taskId,
                status,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error('TaskWebSocket: Failed to get task status', {
                socketId: socket.id,
                userId: user.id,
                taskId: data.taskId,
                error: error.message
            });
            socket.emit('error', { message: 'Failed to get task status' });
        }
    }

    /**
     * Handle execution logs request
     * @param {Socket} socket - Socket instance
     * @param {Object} user - User object
     * @param {Object} data - Request data
     */
    async handleExecutionLogsRequest(socket, user, data) {
        try {
            const { executionId, limit = 50 } = data;
            
            // Get execution logs from monitoring service
            const logs = await this.taskMonitoringService.getExecutionLogs(executionId, user.id, limit);
            
            socket.emit('execution:logs', {
                executionId,
                logs,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error('TaskWebSocket: Failed to get execution logs', {
                socketId: socket.id,
                userId: user.id,
                executionId: data.executionId,
                error: error.message
            });
            socket.emit('error', { message: 'Failed to get execution logs' });
        }
    }

    /**
     * Handle client disconnection
     * @param {Socket} socket - Socket instance
     * @param {Object} user - User object
     */
    handleDisconnection(socket, user) {
        try {
            const client = this.connectedClients.get(socket.id);
            if (client) {
                // Remove from all room subscriptions
                client.subscriptions.forEach(roomName => {
                    const roomSubs = this.roomSubscriptions.get(roomName);
                    if (roomSubs) {
                        roomSubs.delete(socket.id);
                        if (roomSubs.size === 0) {
                            this.roomSubscriptions.delete(roomName);
                        }
                    }
                });
                
                this.connectedClients.delete(socket.id);
            }

            this.logger.info('TaskWebSocket: Client disconnected', {
                socketId: socket.id,
                userId: user?.id,
                username: user?.username
            });

        } catch (error) {
            this.logger.error('TaskWebSocket: Error handling disconnection', {
                socketId: socket.id,
                error: error.message
            });
        }
    }

    // Event handlers for task events
    handleTaskCreated(data) {
        this.broadcastToRoom(`task:${data.task.id}`, 'task:created', data);
    }

    handleTaskUpdated(data) {
        this.broadcastToRoom(`task:${data.task.id}`, 'task:updated', data);
    }

    handleTaskDeleted(data) {
        this.broadcastToRoom(`task:${data.task.id}`, 'task:deleted', data);
    }

    handleTaskSyncCompleted(data) {
        // Broadcast to all clients subscribed to the project
        this.broadcastToRoom(`project:${data.projectId}`, 'task:sync:completed', data);
        
        this.logger.info('TaskWebSocket: Task sync completed event broadcasted', {
            projectId: data.projectId,
            importedCount: data.result?.importedCount || 0
        });
    }

    // Event handlers for task execution events
    handleTaskExecutionStart(data) {
        this.broadcastToRoom(`task:${data.taskId}`, 'task:execution:start', data);
    }

    handleTaskExecutionProgress(data) {
        this.broadcastToRoom(`task:${data.taskId}`, 'task:execution:progress', data);
    }

    handleTaskExecutionComplete(data) {
        this.broadcastToRoom(`task:${data.taskId}`, 'task:execution:complete', data);
    }

    handleTaskExecutionError(data) {
        this.broadcastToRoom(`task:${data.taskId}`, 'task:execution:error', data);
    }

    // Event handlers for analysis events
    handleAnalysisStart(data) {
        this.broadcastToRoom(`project:${data.projectId}`, 'analysis:start', data);
    }

    handleAnalysisProgress(data) {
        this.broadcastToRoom(`project:${data.projectId}`, 'analysis:progress', data);
    }

    handleAnalysisComplete(data) {
        this.broadcastToRoom(`project:${data.projectId}`, 'analysis:complete', data);
    }

    handleAnalysisError(data) {
        this.broadcastToRoom(`project:${data.projectId}`, 'analysis:error', data);
    }

    // Event handlers for analysis step events
    handleAnalysisStepCreated(data) {
        this.broadcastToRoom(`project:${data.projectId}`, 'step:created', data);
    }

    handleAnalysisStepStarted(data) {
        this.broadcastToRoom(`project:${data.projectId}`, 'step:started', data);
    }

    handleAnalysisStepProgress(data) {
        this.broadcastToRoom(`project:${data.projectId}`, 'step:progress', data);
    }

    handleAnalysisStepCompleted(data) {
        this.broadcastToRoom(`project:${data.projectId}`, 'step:completed', data);
    }

    handleAnalysisStepFailed(data) {
        this.broadcastToRoom(`project:${data.projectId}`, 'step:failed', data);
    }

    handleAnalysisStepCancelled(data) {
        this.broadcastToRoom(`project:${data.projectId}`, 'step:cancelled', data);
    }

    // Event handlers for suggestion events
    handleSuggestionGenerated(data) {
        this.broadcastToRoom(`project:${data.projectId}`, 'suggestion:generated', data);
    }

    handleSuggestionApplied(data) {
        this.broadcastToRoom(`project:${data.projectId}`, 'suggestion:applied', data);
    }

    handleSuggestionRejected(data) {
        this.broadcastToRoom(`project:${data.projectId}`, 'suggestion:rejected', data);
    }

    // Event handlers for script events
    handleScriptGenerated(data) {
        this.broadcastToRoom(`project:${data.projectId}`, 'script:generated', data);
    }

    handleScriptExecuted(data) {
        this.broadcastToRoom(`project:${data.projectId}`, 'script:executed', data);
    }

    handleScriptError(data) {
        this.broadcastToRoom(`project:${data.projectId}`, 'script:error', data);
    }

    // Event handlers for auto mode events
    handleAutoModeStart(data) {
        this.broadcastToRoom(`auto:${data.sessionId}`, 'auto:start', data);
    }

    handleAutoModeProgress(data) {
        this.broadcastToRoom(`auto:${data.sessionId}`, 'auto:progress', data);
    }

    handleAutoModeComplete(data) {
        this.broadcastToRoom(`auto:${data.sessionId}`, 'auto:complete', data);
    }

    handleAutoModeError(data) {
        this.broadcastToRoom(`auto:${data.sessionId}`, 'auto:error', data);
    }

    // IDE Event Handlers
    handleIDEListUpdated(data) {
        this.broadcastToRoom('ide', 'ide:list:updated', data);
    }

    handleIDEStatusChanged(data) {
        this.broadcastToRoom('ide', 'ide:status:changed', data);
    }

    handleIDESwitched(data) {
        this.broadcastToRoom('ide', 'ide:switched', data);
    }

    handleIDEFeaturesUpdated(data) {
        this.broadcastToRoom('ide', 'ide:features:updated', data);
    }

    handleIDEMirrorStatusChanged(data) {
        this.broadcastToRoom(`ide:mirror:${data.port}`, 'ide:mirror:status:changed', data);
    }

    handleIDEDOMUpdated(data) {
        this.broadcastToRoom(`ide:mirror:${data.port}`, 'ide:dom:updated', data);
    }

    handleIDEElementInteraction(data) {
        this.broadcastToRoom(`ide:mirror:${data.port}`, 'ide:element:interaction', data);
    }

    // IDE Socket Event Handlers
    handleIDESubscription(socket, user, data) {
        try {
            const roomName = 'ide';
            socket.join(roomName);
            
            const client = this.connectedClients.get(socket.id);
            if (client) {
                client.subscriptions.add(roomName);
            }

            this.logger.info('TaskWebSocket: Client subscribed to IDE updates', {
                socketId: socket.id,
                userId: user.id,
                roomName
            });

            socket.emit('subscribed:ide', {
                message: 'Subscribed to IDE updates',
                roomName,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            this.logger.error('TaskWebSocket: Failed to handle IDE subscription', {
                socketId: socket.id,
                userId: user.id,
                error: error.message
            });
            socket.emit('error', { message: 'Failed to subscribe to IDE updates' });
        }
    }

    handleIDEUnsubscription(socket, user, data) {
        try {
            const roomName = 'ide';
            socket.leave(roomName);
            
            const client = this.connectedClients.get(socket.id);
            if (client) {
                client.subscriptions.delete(roomName);
            }

            this.logger.info('TaskWebSocket: Client unsubscribed from IDE updates', {
                socketId: socket.id,
                userId: user.id,
                roomName
            });

            socket.emit('unsubscribed:ide', {
                message: 'Unsubscribed from IDE updates',
                roomName,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            this.logger.error('TaskWebSocket: Failed to handle IDE unsubscription', {
                socketId: socket.id,
                userId: user.id,
                error: error.message
            });
            socket.emit('error', { message: 'Failed to unsubscribe from IDE updates' });
        }
    }

    handleIDEMirrorSubscription(socket, user, data) {
        try {
            const port = data.port || 'default';
            const roomName = `ide:mirror:${port}`;
            socket.join(roomName);
            
            const client = this.connectedClients.get(socket.id);
            if (client) {
                client.subscriptions.add(roomName);
            }

            this.logger.info('TaskWebSocket: Client subscribed to IDE mirror updates', {
                socketId: socket.id,
                userId: user.id,
                roomName,
                port
            });

            socket.emit('subscribed:ide:mirror', {
                message: 'Subscribed to IDE mirror updates',
                roomName,
                port,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            this.logger.error('TaskWebSocket: Failed to handle IDE mirror subscription', {
                socketId: socket.id,
                userId: user.id,
                error: error.message
            });
            socket.emit('error', { message: 'Failed to subscribe to IDE mirror updates' });
        }
    }

    handleIDEMirrorUnsubscription(socket, user, data) {
        try {
            const port = data.port || 'default';
            const roomName = `ide:mirror:${port}`;
            socket.leave(roomName);
            
            const client = this.connectedClients.get(socket.id);
            if (client) {
                client.subscriptions.delete(roomName);
            }

            this.logger.info('TaskWebSocket: Client unsubscribed from IDE mirror updates', {
                socketId: socket.id,
                userId: user.id,
                roomName,
                port
            });

            socket.emit('unsubscribed:ide:mirror', {
                message: 'Unsubscribed from IDE mirror updates',
                roomName,
                port,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            this.logger.error('TaskWebSocket: Failed to handle IDE mirror unsubscription', {
                socketId: socket.id,
                userId: user.id,
                error: error.message
            });
            socket.emit('error', { message: 'Failed to unsubscribe from IDE mirror updates' });
        }
    }

    async handleIDEStatusRequest(socket, user, data) {
        try {
            const port = data.port;
            if (!port) {
                socket.emit('error', { message: 'Port is required for IDE status request' });
                return;
            }

            // This would typically call an IDE service to get status
            // For now, we'll send a mock response
            socket.emit('ide:status:response', {
                port,
                status: 'connected',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            this.logger.error('TaskWebSocket: Failed to handle IDE status request', {
                socketId: socket.id,
                userId: user.id,
                error: error.message
            });
            socket.emit('error', { message: 'Failed to get IDE status' });
        }
    }

    async handleIDEFeaturesRequest(socket, user, data) {
        try {
            const port = data.port;
            if (!port) {
                socket.emit('error', { message: 'Port is required for IDE features request' });
                return;
            }

            // This would typically call an IDE service to get features
            // For now, we'll send a mock response
            socket.emit('ide:features:response', {
                port,
                features: {
                    chat: { available: true, enabled: true },
                    terminal: { available: true, enabled: false },
                    git: { available: true, enabled: true }
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            this.logger.error('TaskWebSocket: Failed to handle IDE features request', {
                socketId: socket.id,
                userId: user.id,
                error: error.message
            });
            socket.emit('error', { message: 'Failed to get IDE features' });
        }
    }

    /**
     * Broadcast event to room
     * @param {string} roomName - Room name
     * @param {string} eventName - Event name
     * @param {Object} data - Event data
     */
    broadcastToRoom(roomName, eventName, data) {
        try {
            this.io.to(roomName).emit(eventName, {
                ...data,
                timestamp: new Date().toISOString()
            });

            this.logger.debug('TaskWebSocket: Event broadcasted', {
                roomName,
                eventName,
                dataKeys: Object.keys(data)
            });

        } catch (error) {
            this.logger.error('TaskWebSocket: Failed to broadcast event', {
                roomName,
                eventName,
                error: error.message
            });
        }
    }

    /**
     * Get connection statistics
     * @returns {Object} Connection statistics
     */
    getConnectionStats() {
        return {
            connectedClients: this.connectedClients.size,
            roomSubscriptions: this.roomSubscriptions.size,
            totalRooms: Array.from(this.roomSubscriptions.keys()),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Health check
     * @returns {Object} Health status
     */
    getHealthStatus() {
        return {
            status: 'healthy',
            connectedClients: this.connectedClients.size,
            activeRooms: this.roomSubscriptions.size,
            timestamp: new Date().toISOString()
        };
    }

    // Queue Event Handlers
    handleQueueUpdated(data) {
        const roomName = `queue:${data.projectId}`;
        this.broadcastToRoom(roomName, 'queue:updated', data);
    }

    handleQueueItemAdded(data) {
        const roomName = `queue:${data.projectId}`;
        this.broadcastToRoom(roomName, 'queue:item:added', data);
    }

    handleQueueItemCancelled(data) {
        const roomName = `queue:${data.projectId}`;
        this.broadcastToRoom(roomName, 'queue:item:cancelled', data);
    }

    handleQueueItemPriorityUpdated(data) {
        const roomName = `queue:${data.projectId}`;
        this.broadcastToRoom(roomName, 'queue:item:priority_updated', data);
    }

    handleQueueItemsCleared(data) {
        const roomName = `queue:${data.projectId}`;
        this.broadcastToRoom(roomName, 'queue:items:cleared', data);
    }

    // Step Progress Event Handlers
    handleTaskStepProgress(data) {
        const roomName = `task:step:progress:${data.projectId}`;
        this.broadcastToRoom(roomName, 'task:step:progress', data);
    }

    handleTaskStepStarted(data) {
        const roomName = `task:step:progress:${data.projectId}`;
        this.broadcastToRoom(roomName, 'task:step:started', data);
    }

    handleTaskStepCompleted(data) {
        const roomName = `task:step:progress:${data.projectId}`;
        this.broadcastToRoom(roomName, 'task:step:completed', data);
    }

    handleTaskStepFailed(data) {
        const roomName = `task:step:progress:${data.projectId}`;
        this.broadcastToRoom(roomName, 'task:step:failed', data);
    }

    handleTaskStepPaused(data) {
        const roomName = `task:step:progress:${data.projectId}`;
        this.broadcastToRoom(roomName, 'task:step:paused', data);
    }

    handleTaskStepResumed(data) {
        const roomName = `task:step:progress:${data.projectId}`;
        this.broadcastToRoom(roomName, 'task:step:resumed', data);
    }

    handleTaskStepProgressInitialized(data) {
        const roomName = `task:step:progress:${data.projectId}`;
        this.broadcastToRoom(roomName, 'task:step:progress:initialized', data);
    }
}

module.exports = TaskWebSocket; 