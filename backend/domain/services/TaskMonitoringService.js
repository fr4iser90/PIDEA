const { Task, TaskExecution } = require('@/domain/entities');
const { TaskStatus, TaskType } = require('@/domain/value-objects');
const { TaskRepository, TaskExecutionRepository } = require('@/domain/repositories');

/**
 * TaskMonitoringService - Provides real-time task monitoring and progress tracking
 * Monitors task execution, performance, and provides real-time updates
 */
class TaskMonitoringService {
    constructor(
        taskRepository,
        taskExecutionRepository,
        cursorIDEService,
        eventBus,
        websocketManager
    ) {
        this.taskRepository = taskRepository;
        this.taskExecutionRepository = taskExecutionRepository;
        this.cursorIDEService = cursorIDEService;
        this.eventBus = eventBus;
        this.websocketManager = websocketManager;
        this.activeMonitors = new Map();
        this.monitoringIntervals = new Map();
    }

    /**
     * Start monitoring task execution
     * @param {Object} params - Monitoring parameters
     * @param {string} params.taskId - Task ID to monitor
     * @param {Object} params.options - Monitoring options
     * @returns {Promise<Object>} Monitoring result
     */
    async startMonitoring(params) {
        const { taskId, options = {} } = params;

        try {
            // Validate inputs
            if (!taskId) {
                throw new Error('Task ID is required');
            }

            // Get task
            const task = await this.taskRepository.findById(taskId);
            if (!task) {
                throw new Error(`Task not found: ${taskId}`);
            }

            // Check if already monitoring
            if (this.activeMonitors.has(taskId)) {
                throw new Error(`Already monitoring task: ${taskId}`);
            }

            // Create monitoring session
            const monitoringSession = this.createMonitoringSession(task, options);

            // Start monitoring
            await this.startMonitoringSession(monitoringSession);

            // Emit monitoring started event
            this.eventBus.emit('task:monitoring:started', {
                taskId,
                sessionId: monitoringSession.id,
                options
            });

            return {
                taskId,
                sessionId: monitoringSession.id,
                status: 'monitoring',
                options: monitoringSession.options
            };

        } catch (error) {
            this.eventBus.emit('task:monitoring:error', {
                error: error.message,
                taskId,
                options
            });
            throw error;
        }
    }

    /**
     * Stop monitoring task
     * @param {Object} params - Stop monitoring parameters
     * @param {string} params.taskId - Task ID
     * @param {string} params.sessionId - Session ID (optional)
     * @returns {Promise<Object>} Stop result
     */
    async stopMonitoring(params) {
        const { taskId, sessionId } = params;

        try {
            // Find monitoring session
            const session = this.activeMonitors.get(taskId);
            if (!session) {
                throw new Error(`No active monitoring for task: ${taskId}`);
            }

            // Stop monitoring
            await this.stopMonitoringSession(session);

            // Emit monitoring stopped event
            this.eventBus.emit('task:monitoring:stopped', {
                taskId,
                sessionId: session.id,
                duration: Date.now() - session.startTime
            });

            return {
                taskId,
                sessionId: session.id,
                status: 'stopped',
                duration: Date.now() - session.startTime
            };

        } catch (error) {
            this.eventBus.emit('task:monitoring:stop:error', {
                error: error.message,
                taskId,
                sessionId
            });
            throw error;
        }
    }

    /**
     * Get monitoring status
     * @param {string} taskId - Task ID
     * @returns {Promise<Object>} Monitoring status
     */
    async getMonitoringStatus(taskId) {
        const session = this.activeMonitors.get(taskId);
        
        if (!session) {
            return {
                isMonitoring: false,
                taskId
            };
        }

        // Get current task state
        const task = await this.taskRepository.findById(taskId);
        const currentExecution = await this.taskExecutionRepository.findLatestByTaskId(taskId);

        return {
            isMonitoring: true,
            taskId,
            sessionId: session.id,
            startTime: session.startTime,
            duration: Date.now() - session.startTime,
            taskStatus: task?.status.value,
            executionStatus: currentExecution?.status,
            progress: currentExecution?.progress || 0,
            lastUpdate: session.lastUpdate
        };
    }

    /**
     * Get real-time metrics
     * @param {Object} params - Metrics parameters
     * @param {string} params.taskId - Task ID
     * @param {string} params.metricType - Type of metrics
     * @param {Object} params.options - Metrics options
     * @returns {Promise<Object>} Real-time metrics
     */
    async getRealTimeMetrics(params) {
        const { taskId, metricType = 'all', options = {} } = params;

        try {
            const session = this.activeMonitors.get(taskId);
            if (!session) {
                throw new Error(`No active monitoring for task: ${taskId}`);
            }

            const metrics = {};

            if (metricType === 'all' || metricType === 'performance') {
                metrics.performance = await this.getPerformanceMetrics(taskId, options);
            }

            if (metricType === 'all' || metricType === 'resource') {
                metrics.resource = await this.getResourceMetrics(taskId, options);
            }

            if (metricType === 'all' || metricType === 'progress') {
                metrics.progress = await this.getProgressMetrics(taskId, options);
            }

            if (metricType === 'all' || metricType === 'quality') {
                metrics.quality = await this.getQualityMetrics(taskId, options);
            }

            return {
                taskId,
                timestamp: new Date().toISOString(),
                metrics
            };

        } catch (error) {
            this.eventBus.emit('task:metrics:error', {
                error: error.message,
                taskId,
                metricType,
                options
            });
            throw error;
        }
    }

    /**
     * Subscribe to real-time updates
     * @param {Object} params - Subscription parameters
     * @param {string} params.taskId - Task ID
     * @param {string} params.clientId - Client ID
     * @param {Object} params.options - Subscription options
     * @returns {Promise<Object>} Subscription result
     */
    async subscribeToUpdates(params) {
        const { taskId, clientId, options = {} } = params;

        try {
            // Validate task exists
            const task = await this.taskRepository.findById(taskId);
            if (!task) {
                throw new Error(`Task not found: ${taskId}`);
            }

            // Create subscription
            const subscription = {
                taskId,
                clientId,
                options,
                subscribedAt: new Date(),
                lastUpdate: null
            };

            // Add to websocket manager
            await this.websocketManager.addSubscription(clientId, `task:${taskId}`, subscription);

            // Emit subscription event
            this.eventBus.emit('task:subscription:created', {
                taskId,
                clientId,
                options
            });

            return {
                taskId,
                clientId,
                status: 'subscribed',
                subscriptionId: `task:${taskId}:${clientId}`
            };

        } catch (error) {
            this.eventBus.emit('task:subscription:error', {
                error: error.message,
                taskId,
                clientId,
                options
            });
            throw error;
        }
    }

    /**
     * Unsubscribe from updates
     * @param {Object} params - Unsubscription parameters
     * @param {string} params.taskId - Task ID
     * @param {string} params.clientId - Client ID
     * @returns {Promise<Object>} Unsubscription result
     */
    async unsubscribeFromUpdates(params) {
        const { taskId, clientId } = params;

        try {
            // Remove from websocket manager
            await this.websocketManager.removeSubscription(clientId, `task:${taskId}`);

            // Emit unsubscription event
            this.eventBus.emit('task:subscription:removed', {
                taskId,
                clientId
            });

            return {
                taskId,
                clientId,
                status: 'unsubscribed'
            };

        } catch (error) {
            this.eventBus.emit('task:unsubscription:error', {
                error: error.message,
                taskId,
                clientId
            });
            throw error;
        }
    }

    /**
     * Get monitoring history
     * @param {Object} params - History parameters
     * @param {string} params.taskId - Task ID
     * @param {Date} params.startDate - Start date
     * @param {Date} params.endDate - End date
     * @param {Object} params.options - History options
     * @returns {Promise<Object>} Monitoring history
     */
    async getMonitoringHistory(params) {
        const { taskId, startDate, endDate, options = {} } = params;

        try {
            // Get task executions in date range
            const executions = await this.taskExecutionRepository.findByTaskIdAndDateRange(
                taskId,
                startDate,
                endDate
            );

            // Get monitoring sessions
            const sessions = this.getMonitoringSessionsInRange(taskId, startDate, endDate);

            // Generate history report
            const history = this.generateHistoryReport(executions, sessions, options);

            return {
                taskId,
                startDate,
                endDate,
                history,
                summary: this.generateHistorySummary(history)
            };

        } catch (error) {
            this.eventBus.emit('task:history:error', {
                error: error.message,
                taskId,
                startDate,
                endDate,
                options
            });
            throw error;
        }
    }

    /**
     * Create monitoring session
     * @param {Task} task - Task object
     * @param {Object} options - Monitoring options
     * @returns {Object} Monitoring session
     */
    createMonitoringSession(task, options) {
        return {
            id: `monitor-${task.id}-${Date.now()}`,
            taskId: task.id,
            task: task,
            options: {
                updateInterval: options.updateInterval || 5000, // 5 seconds
                metrics: options.metrics || ['performance', 'resource', 'progress'],
                alerts: options.alerts || [],
                ...options
            },
            startTime: Date.now(),
            lastUpdate: null,
            metrics: {},
            alerts: []
        };
    }

    /**
     * Start monitoring session
     * @param {Object} session - Monitoring session
     * @returns {Promise<void>}
     */
    async startMonitoringSession(session) {
        // Add to active monitors
        this.activeMonitors.set(session.taskId, session);

        // Start monitoring interval
        const interval = setInterval(async () => {
            await this.updateMonitoringSession(session);
        }, session.options.updateInterval);

        this.monitoringIntervals.set(session.id, interval);

        // Initial update
        await this.updateMonitoringSession(session);
    }

    /**
     * Stop monitoring session
     * @param {Object} session - Monitoring session
     * @returns {Promise<void>}
     */
    async stopMonitoringSession(session) {
        // Clear interval
        const interval = this.monitoringIntervals.get(session.id);
        if (interval) {
            clearInterval(interval);
            this.monitoringIntervals.delete(session.id);
        }

        // Remove from active monitors
        this.activeMonitors.delete(session.taskId);

        // Final update
        await this.updateMonitoringSession(session);
    }

    /**
     * Update monitoring session
     * @param {Object} session - Monitoring session
     * @returns {Promise<void>}
     */
    async updateMonitoringSession(session) {
        try {
            // Get current task state
            const task = await this.taskRepository.findById(session.taskId);
            const currentExecution = await this.taskExecutionRepository.findLatestByTaskId(session.taskId);

            // Update session
            session.lastUpdate = Date.now();
            session.task = task;
            session.currentExecution = currentExecution;

            // Collect metrics
            session.metrics = await this.collectMetrics(session);

            // Check alerts
            await this.checkAlerts(session);

            // Broadcast updates
            await this.broadcastUpdates(session);

            // Emit monitoring update event
            this.eventBus.emit('task:monitoring:updated', {
                taskId: session.taskId,
                sessionId: session.id,
                metrics: session.metrics,
                timestamp: session.lastUpdate
            });

        } catch (error) {
            console.error('Error updating monitoring session:', error);
        }
    }

    /**
     * Collect metrics
     * @param {Object} session - Monitoring session
     * @returns {Promise<Object>} Collected metrics
     */
    async collectMetrics(session) {
        const metrics = {};

        // Performance metrics
        if (session.options.metrics.includes('performance')) {
            metrics.performance = await this.getPerformanceMetrics(session.taskId, session.options);
        }

        // Resource metrics
        if (session.options.metrics.includes('resource')) {
            metrics.resource = await this.getResourceMetrics(session.taskId, session.options);
        }

        // Progress metrics
        if (session.options.metrics.includes('progress')) {
            metrics.progress = await this.getProgressMetrics(session.taskId, session.options);
        }

        // Quality metrics
        if (session.options.metrics.includes('quality')) {
            metrics.quality = await this.getQualityMetrics(session.taskId, session.options);
        }

        return metrics;
    }

    /**
     * Get performance metrics
     * @param {string} taskId - Task ID
     * @param {Object} options - Options
     * @returns {Promise<Object>} Performance metrics
     */
    async getPerformanceMetrics(taskId, options) {
        const executions = await this.taskExecutionRepository.findByTaskId(taskId);
        const recentExecutions = executions.slice(-10);

        const metrics = {
            averageExecutionTime: 0,
            executionTimeTrend: 'stable',
            successRate: 0,
            failureRate: 0,
            throughput: 0
        };

        if (recentExecutions.length > 0) {
            const executionTimes = recentExecutions
                .filter(exec => exec.status === 'completed')
                .map(exec => exec.executionTime);

            if (executionTimes.length > 0) {
                metrics.averageExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
                metrics.executionTimeTrend = this.calculateExecutionTimeTrend(executionTimes);
            }

            const successCount = recentExecutions.filter(exec => exec.status === 'completed').length;
            metrics.successRate = successCount / recentExecutions.length;
            metrics.failureRate = 1 - metrics.successRate;
            metrics.throughput = successCount / (recentExecutions.length * 24); // per hour
        }

        return metrics;
    }

    /**
     * Get resource metrics
     * @param {string} taskId - Task ID
     * @param {Object} options - Options
     * @returns {Promise<Object>} Resource metrics
     */
    async getResourceMetrics(taskId, options) {
        const executions = await this.taskExecutionRepository.findByTaskId(taskId);
        const recentExecutions = executions.slice(-5);

        const metrics = {
            averageMemoryUsage: 0,
            averageCpuUsage: 0,
            peakMemoryUsage: 0,
            peakCpuUsage: 0,
            resourceEfficiency: 0
        };

        if (recentExecutions.length > 0) {
            const resourceUsage = recentExecutions
                .filter(exec => exec.resourceUsage)
                .map(exec => exec.resourceUsage);

            if (resourceUsage.length > 0) {
                const memoryUsage = resourceUsage.map(usage => usage.memory || 0);
                const cpuUsage = resourceUsage.map(usage => usage.cpu || 0);

                metrics.averageMemoryUsage = memoryUsage.reduce((sum, mem) => sum + mem, 0) / memoryUsage.length;
                metrics.averageCpuUsage = cpuUsage.reduce((sum, cpu) => sum + cpu, 0) / cpuUsage.length;
                metrics.peakMemoryUsage = Math.max(...memoryUsage);
                metrics.peakCpuUsage = Math.max(...cpuUsage);
                metrics.resourceEfficiency = this.calculateResourceEfficiency(memoryUsage, cpuUsage);
            }
        }

        return metrics;
    }

    /**
     * Get progress metrics
     * @param {string} taskId - Task ID
     * @param {Object} options - Options
     * @returns {Promise<Object>} Progress metrics
     */
    async getProgressMetrics(taskId, options) {
        const task = await this.taskRepository.findById(taskId);
        const currentExecution = await this.taskExecutionRepository.findLatestByTaskId(taskId);

        const metrics = {
            currentProgress: 0,
            estimatedTimeRemaining: 0,
            completionPercentage: 0,
            milestones: [],
            blockers: []
        };

        if (currentExecution && currentExecution.status === 'running') {
            metrics.currentProgress = currentExecution.progress || 0;
            metrics.completionPercentage = (metrics.currentProgress / 100) * 100;
            
            if (task.estimatedTime) {
                const elapsedTime = Date.now() - currentExecution.startedAt.getTime();
                const progressRatio = metrics.currentProgress / 100;
                const estimatedTotalTime = elapsedTime / progressRatio;
                metrics.estimatedTimeRemaining = Math.max(0, estimatedTotalTime - elapsedTime);
            }
        }

        return metrics;
    }

    /**
     * Get quality metrics
     * @param {string} taskId - Task ID
     * @param {Object} options - Options
     * @returns {Promise<Object>} Quality metrics
     */
    async getQualityMetrics(taskId, options) {
        const executions = await this.taskExecutionRepository.findByTaskId(taskId);
        const recentExecutions = executions.slice(-10);

        const metrics = {
            codeQuality: 0,
            testCoverage: 0,
            securityScore: 0,
            documentationQuality: 0,
            overallQuality: 0
        };

        // Calculate quality metrics based on execution results
        if (recentExecutions.length > 0) {
            const qualityScores = recentExecutions
                .filter(exec => exec.result && exec.result.quality)
                .map(exec => exec.result.quality);

            if (qualityScores.length > 0) {
                metrics.codeQuality = qualityScores.reduce((sum, score) => sum + (score.codeQuality || 0), 0) / qualityScores.length;
                metrics.testCoverage = qualityScores.reduce((sum, score) => sum + (score.testCoverage || 0), 0) / qualityScores.length;
                metrics.securityScore = qualityScores.reduce((sum, score) => sum + (score.securityScore || 0), 0) / qualityScores.length;
                metrics.documentationQuality = qualityScores.reduce((sum, score) => sum + (score.documentationQuality || 0), 0) / qualityScores.length;
                metrics.overallQuality = (metrics.codeQuality + metrics.testCoverage + metrics.securityScore + metrics.documentationQuality) / 4;
            }
        }

        return metrics;
    }

    /**
     * Check alerts
     * @param {Object} session - Monitoring session
     * @returns {Promise<void>}
     */
    async checkAlerts(session) {
        const alerts = [];

        // Check performance alerts
        if (session.metrics.performance) {
            const perf = session.metrics.performance;
            if (perf.successRate < 0.8) {
                alerts.push({
                    type: 'performance',
                    severity: 'warning',
                    message: `Low success rate: ${(perf.successRate * 100).toFixed(1)}%`,
                    timestamp: new Date()
                });
            }
        }

        // Check resource alerts
        if (session.metrics.resource) {
            const res = session.metrics.resource;
            if (res.averageCpuUsage > 80) {
                alerts.push({
                    type: 'resource',
                    severity: 'warning',
                    message: `High CPU usage: ${res.averageCpuUsage.toFixed(1)}%`,
                    timestamp: new Date()
                });
            }
        }

        // Check progress alerts
        if (session.metrics.progress) {
            const prog = session.metrics.progress;
            if (prog.estimatedTimeRemaining > 3600000) { // 1 hour
                alerts.push({
                    type: 'progress',
                    severity: 'info',
                    message: `Long execution time remaining: ${Math.round(prog.estimatedTimeRemaining / 60000)} minutes`,
                    timestamp: new Date()
                });
            }
        }

        // Emit alerts
        for (const alert of alerts) {
            this.eventBus.emit('task:alert', {
                taskId: session.taskId,
                alert
            });
        }

        session.alerts = alerts;
    }

    /**
     * Broadcast updates
     * @param {Object} session - Monitoring session
     * @returns {Promise<void>}
     */
    async broadcastUpdates(session) {
        const update = {
            taskId: session.taskId,
            sessionId: session.id,
            timestamp: session.lastUpdate,
            metrics: session.metrics,
            alerts: session.alerts
        };

        // Broadcast to websocket subscribers
        await this.websocketManager.broadcast(`task:${session.taskId}`, update);
    }

    // Helper methods (placeholder implementations)

    calculateExecutionTimeTrend(executionTimes) { return 'stable'; }
    calculateResourceEfficiency(memoryUsage, cpuUsage) { return 0.8; }
    getMonitoringSessionsInRange(taskId, startDate, endDate) { return []; }
    generateHistoryReport(executions, sessions, options) { return {}; }
    generateHistorySummary(history) { return {}; }
}

module.exports = TaskMonitoringService; 