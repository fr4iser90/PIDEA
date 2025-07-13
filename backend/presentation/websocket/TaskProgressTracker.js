/**
 * TaskProgressTracker - Real-time task progress monitoring and tracking
 */
const EventEmitter = require('events');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class TaskProgressTracker {
    constructor(dependencies = {}) {
        this.io = dependencies.io;
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
        this.taskMonitoringService = dependencies.taskMonitoringService;
        
        this.activeTasks = new Map();
        this.progressSubscriptions = new Map();
        this.progressHistory = new Map();
        
        this.setupEventListeners();
        this.setupProgressTracking();
    }

    /**
     * Setup event listeners for progress tracking
     */
    setupEventListeners() {
        // Task execution events
        this.eventBus.on('task:execution:start', this.handleTaskExecutionStart.bind(this));
        this.eventBus.on('task:execution:progress', this.handleTaskExecutionProgress.bind(this));
        this.eventBus.on('task:execution:complete', this.handleTaskExecutionComplete.bind(this));
        this.eventBus.on('task:execution:error', this.handleTaskExecutionError.bind(this));
        
        // Auto mode events
        this.eventBus.on('auto:start', this.handleAutoModeStart.bind(this));
        this.eventBus.on('auto:progress', this.handleAutoModeProgress.bind(this));
        this.eventBus.on('auto:complete', this.handleAutoModeComplete.bind(this));
        this.eventBus.on('auto:error', this.handleAutoModeError.bind(this));
        
        // Analysis events
        this.eventBus.on('analysis:start', this.handleAnalysisStart.bind(this));
        this.eventBus.on('analysis:progress', this.handleAnalysisProgress.bind(this));
        this.eventBus.on('analysis:complete', this.handleAnalysisComplete.bind(this));
        this.eventBus.on('analysis:error', this.handleAnalysisError.bind(this));
    }

    /**
     * Setup progress tracking intervals
     */
    setupProgressTracking() {
        // Update progress every 5 seconds for active tasks
        setInterval(() => {
            this.updateActiveTaskProgress();
        }, 5000);

        // Clean up completed tasks every minute
        setInterval(() => {
            this.cleanupCompletedTasks();
        }, 60000);

        // Save progress history every 30 seconds
        setInterval(() => {
            this.saveProgressHistory();
        }, 30000);
    }

    /**
     * Handle task execution start
     * @param {Object} data - Task execution data
     */
    handleTaskExecutionStart(data) {
        try {
            const { taskId, executionId, task, execution } = data;
            
            const progressData = {
                taskId,
                executionId,
                task,
                execution,
                status: 'running',
                progress: 0,
                startTime: new Date(),
                estimatedDuration: execution.estimatedDuration || 300, // 5 minutes default
                currentStep: 'Initializing',
                steps: [],
                logs: [],
                metrics: {
                    cpu: 0,
                    memory: 0,
                    duration: 0
                }
            };

            this.activeTasks.set(taskId, progressData);
            this.initializeProgressHistory(taskId, progressData);

            this.logger.info('TaskProgressTracker: Task execution started', {
                taskId,
                executionId
            });

            this.broadcastProgressUpdate(taskId, 'start', progressData);

        } catch (error) {
            this.logger.error('TaskProgressTracker: Failed to handle task execution start', {
                error: error.message
            });
        }
    }

    /**
     * Handle task execution progress
     * @param {Object} data - Progress data
     */
    handleTaskExecutionProgress(data) {
        try {
            const { taskId, progress, step, message, metrics } = data;
            
            const progressData = this.activeTasks.get(taskId);
            if (!progressData) {
                return;
            }

            // Update progress data
            progressData.progress = progress;
            progressData.currentStep = step;
            progressData.metrics = { ...progressData.metrics, ...metrics };
            
            if (message) {
                progressData.logs.push({
                    timestamp: new Date(),
                    level: 'info',
                    message
                });
            }

            // Add step to steps array if not already present
            if (step && !progressData.steps.find(s => s.name === step)) {
                progressData.steps.push({
                    name: step,
                    startTime: new Date(),
                    progress: progress
                });
            }

            // Update step progress
            const currentStepObj = progressData.steps.find(s => s.name === step);
            if (currentStepObj) {
                currentStepObj.progress = progress;
                currentStepObj.lastUpdate = new Date();
            }

            this.activeTasks.set(taskId, progressData);
            this.updateProgressHistory(taskId, progressData);

            this.logger.debug('TaskProgressTracker: Task progress updated', {
                taskId,
                progress,
                step
            });

            this.broadcastProgressUpdate(taskId, 'progress', progressData);

        } catch (error) {
            this.logger.error('TaskProgressTracker: Failed to handle task execution progress', {
                error: error.message
            });
        }
    }

    /**
     * Handle task execution complete
     * @param {Object} data - Completion data
     */
    handleTaskExecutionComplete(data) {
        try {
            const { taskId, result, duration, metrics } = data;
            
            const progressData = this.activeTasks.get(taskId);
            if (!progressData) {
                return;
            }

            // Update progress data
            progressData.status = 'completed';
            progressData.progress = 100;
            progressData.endTime = new Date();
            progressData.duration = duration;
            progressData.result = result;
            progressData.metrics = { ...progressData.metrics, ...metrics };
            progressData.currentStep = 'Completed';

            progressData.logs.push({
                timestamp: new Date(),
                level: 'info',
                message: 'Task execution completed successfully'
            });

            this.activeTasks.set(taskId, progressData);
            this.finalizeProgressHistory(taskId, progressData);

            this.logger.info('TaskProgressTracker: Task execution completed', {
                taskId,
                duration
            });

            this.broadcastProgressUpdate(taskId, 'complete', progressData);

            // Schedule cleanup
            setTimeout(() => {
                this.activeTasks.delete(taskId);
            }, 300000); // 5 minutes

        } catch (error) {
            this.logger.error('TaskProgressTracker: Failed to handle task execution complete', {
                error: error.message
            });
        }
    }

    /**
     * Handle task execution error
     * @param {Object} data - Error data
     */
    handleTaskExecutionError(data) {
        try {
            const { taskId, error, duration, metrics } = data;
            
            const progressData = this.activeTasks.get(taskId);
            if (!progressData) {
                return;
            }

            // Update progress data
            progressData.status = 'error';
            progressData.endTime = new Date();
            progressData.duration = duration;
            progressData.error = error;
            progressData.metrics = { ...progressData.metrics, ...metrics };
            progressData.currentStep = 'Error';

            progressData.logs.push({
                timestamp: new Date(),
                level: 'error',
                message: error.message || 'Task execution failed'
            });

            this.activeTasks.set(taskId, progressData);
            this.finalizeProgressHistory(taskId, progressData);

            this.logger.error('TaskProgressTracker: Task execution failed', {
                taskId,
                error: error.message
            });

            this.broadcastProgressUpdate(taskId, 'error', progressData);

            // Schedule cleanup
            setTimeout(() => {
                this.activeTasks.delete(taskId);
            }, 300000); // 5 minutes

        } catch (error) {
            this.logger.error('TaskProgressTracker: Failed to handle task execution error', {
                error: error.message
            });
        }
    }

    /**
     * Handle auto mode start
     * @param {Object} data - Auto mode data
     */
    handleAutoModeStart(data) {
        try {
            const { sessionId, projectPath, mode, tasks } = data;
            
            const progressData = {
                sessionId,
                projectPath,
                mode,
                status: 'running',
                progress: 0,
                startTime: new Date(),
                totalTasks: tasks.length,
                completedTasks: 0,
                currentTask: null,
                tasks: tasks.map(task => ({
                    id: task.id,
                    title: task.title,
                    status: 'pending',
                    progress: 0
                })),
                logs: [],
                metrics: {
                    cpu: 0,
                    memory: 0,
                    duration: 0
                }
            };

            this.activeTasks.set(`auto:${sessionId}`, progressData);
            this.initializeProgressHistory(`auto:${sessionId}`, progressData);

            this.logger.info('TaskProgressTracker: Auto mode started', {
                sessionId,
                totalTasks: tasks.length
            });

            this.broadcastProgressUpdate(`auto:${sessionId}`, 'start', progressData);

        } catch (error) {
            this.logger.error('TaskProgressTracker: Failed to handle auto mode start', {
                error: error.message
            });
        }
    }

    /**
     * Handle auto mode progress
     * @param {Object} data - Progress data
     */
    handleAutoModeProgress(data) {
        try {
            const { sessionId, currentTask, completedTasks, progress, message, metrics } = data;
            
            const progressData = this.activeTasks.get(`auto:${sessionId}`);
            if (!progressData) {
                return;
            }

            // Update progress data
            progressData.progress = progress;
            progressData.completedTasks = completedTasks;
            progressData.currentTask = currentTask;
            progressData.metrics = { ...progressData.metrics, ...metrics };
            
            if (message) {
                progressData.logs.push({
                    timestamp: new Date(),
                    level: 'info',
                    message
                });
            }

            // Update task status
            if (currentTask) {
                const taskObj = progressData.tasks.find(t => t.id === currentTask.id);
                if (taskObj) {
                    taskObj.status = 'running';
                    taskObj.progress = currentTask.progress || 0;
                }
            }

            this.activeTasks.set(`auto:${sessionId}`, progressData);
            this.updateProgressHistory(`auto:${sessionId}`, progressData);

            this.logger.debug('TaskProgressTracker: Auto mode progress updated', {
                sessionId,
                progress,
                completedTasks
            });

            this.broadcastProgressUpdate(`auto:${sessionId}`, 'progress', progressData);

        } catch (error) {
            this.logger.error('TaskProgressTracker: Failed to handle auto mode progress', {
                error: error.message
            });
        }
    }

    /**
     * Handle auto mode complete
     * @param {Object} data - Completion data
     */
    handleAutoModeComplete(data) {
        try {
            const { sessionId, results, duration, metrics } = data;
            
            const progressData = this.activeTasks.get(`auto:${sessionId}`);
            if (!progressData) {
                return;
            }

            // Update progress data
            progressData.status = 'completed';
            progressData.progress = 100;
            progressData.endTime = new Date();
            progressData.duration = duration;
            progressData.results = results;
            progressData.metrics = { ...progressData.metrics, ...metrics };
            progressData.completedTasks = progressData.totalTasks;

            progressData.logs.push({
                timestamp: new Date(),
                level: 'info',
                message: 'Auto mode completed successfully'
            });

            this.activeTasks.set(`auto:${sessionId}`, progressData);
            this.finalizeProgressHistory(`auto:${sessionId}`, progressData);

            this.logger.info('TaskProgressTracker: Auto mode completed', {
                sessionId,
                duration
            });

            this.broadcastProgressUpdate(`auto:${sessionId}`, 'complete', progressData);

            // Schedule cleanup
            setTimeout(() => {
                this.activeTasks.delete(`auto:${sessionId}`);
            }, 300000); // 5 minutes

        } catch (error) {
            this.logger.error('TaskProgressTracker: Failed to handle auto mode complete', {
                error: error.message
            });
        }
    }

    /**
     * Handle auto mode error
     * @param {Object} data - Error data
     */
    handleAutoModeError(data) {
        try {
            const { sessionId, error, duration, metrics } = data;
            
            const progressData = this.activeTasks.get(`auto:${sessionId}`);
            if (!progressData) {
                return;
            }

            // Update progress data
            progressData.status = 'error';
            progressData.endTime = new Date();
            progressData.duration = duration;
            progressData.error = error;
            progressData.metrics = { ...progressData.metrics, ...metrics };

            progressData.logs.push({
                timestamp: new Date(),
                level: 'error',
                message: error.message || 'Auto mode failed'
            });

            this.activeTasks.set(`auto:${sessionId}`, progressData);
            this.finalizeProgressHistory(`auto:${sessionId}`, progressData);

            this.logger.error('TaskProgressTracker: Auto mode failed', {
                sessionId,
                error: error.message
            });

            this.broadcastProgressUpdate(`auto:${sessionId}`, 'error', progressData);

            // Schedule cleanup
            setTimeout(() => {
                this.activeTasks.delete(`auto:${sessionId}`);
            }, 300000); // 5 minutes

        } catch (error) {
            this.logger.error('TaskProgressTracker: Failed to handle auto mode error', {
                error: error.message
            });
        }
    }

    /**
     * Handle analysis events (similar pattern for other event types)
     */
    handleAnalysisStart(data) {
        this.handleGenericProgressStart('analysis', data);
    }

    handleAnalysisProgress(data) {
        this.handleGenericProgressUpdate('analysis', data);
    }

    handleAnalysisComplete(data) {
        this.handleGenericProgressComplete('analysis', data);
    }

    handleAnalysisError(data) {
        this.handleGenericProgressError('analysis', data);
    }

    /**
     * Handle generic progress start
     * @param {string} type - Progress type
     * @param {Object} data - Progress data
     */
    handleGenericProgressStart(type, data) {
        try {
            const { id, projectId } = data;
            const key = `${type}:${id}`;
            
            const progressData = {
                type,
                id,
                projectId,
                status: 'running',
                progress: 0,
                startTime: new Date(),
                currentStep: 'Initializing',
                logs: [],
                metrics: {
                    cpu: 0,
                    memory: 0,
                    duration: 0
                }
            };

            this.activeTasks.set(key, progressData);
            this.initializeProgressHistory(key, progressData);

            this.broadcastProgressUpdate(key, 'start', progressData);

        } catch (error) {
            this.logger.error('TaskProgressTracker: Failed to handle generic progress start', {
                type,
                error: error.message
            });
        }
    }

    /**
     * Handle generic progress update
     * @param {string} type - Progress type
     * @param {Object} data - Progress data
     */
    handleGenericProgressUpdate(type, data) {
        try {
            const { id, progress, step, message, metrics } = data;
            const key = `${type}:${id}`;
            
            const progressData = this.activeTasks.get(key);
            if (!progressData) {
                return;
            }

            progressData.progress = progress;
            progressData.currentStep = step;
            progressData.metrics = { ...progressData.metrics, ...metrics };
            
            if (message) {
                progressData.logs.push({
                    timestamp: new Date(),
                    level: 'info',
                    message
                });
            }

            this.activeTasks.set(key, progressData);
            this.updateProgressHistory(key, progressData);

            this.broadcastProgressUpdate(key, 'progress', progressData);

        } catch (error) {
            this.logger.error('TaskProgressTracker: Failed to handle generic progress update', {
                type,
                error: error.message
            });
        }
    }

    /**
     * Handle generic progress complete
     * @param {string} type - Progress type
     * @param {Object} data - Progress data
     */
    handleGenericProgressComplete(type, data) {
        try {
            const { id, result, duration, metrics } = data;
            const key = `${type}:${id}`;
            
            const progressData = this.activeTasks.get(key);
            if (!progressData) {
                return;
            }

            progressData.status = 'completed';
            progressData.progress = 100;
            progressData.endTime = new Date();
            progressData.duration = duration;
            progressData.result = result;
            progressData.metrics = { ...progressData.metrics, ...metrics };

            this.activeTasks.set(key, progressData);
            this.finalizeProgressHistory(key, progressData);

            this.broadcastProgressUpdate(key, 'complete', progressData);

            setTimeout(() => {
                this.activeTasks.delete(key);
            }, 300000);

        } catch (error) {
            this.logger.error('TaskProgressTracker: Failed to handle generic progress complete', {
                type,
                error: error.message
            });
        }
    }

    /**
     * Handle generic progress error
     * @param {string} type - Progress type
     * @param {Object} data - Progress data
     */
    handleGenericProgressError(type, data) {
        try {
            const { id, error, duration, metrics } = data;
            const key = `${type}:${id}`;
            
            const progressData = this.activeTasks.get(key);
            if (!progressData) {
                return;
            }

            progressData.status = 'error';
            progressData.endTime = new Date();
            progressData.duration = duration;
            progressData.error = error;
            progressData.metrics = { ...progressData.metrics, ...metrics };

            this.activeTasks.set(key, progressData);
            this.finalizeProgressHistory(key, progressData);

            this.broadcastProgressUpdate(key, 'error', progressData);

            setTimeout(() => {
                this.activeTasks.delete(key);
            }, 300000);

        } catch (error) {
            this.logger.error('TaskProgressTracker: Failed to handle generic progress error', {
                type,
                error: error.message
            });
        }
    }

    /**
     * Update active task progress
     */
    async updateActiveTaskProgress() {
        try {
            for (const [taskId, progressData] of this.activeTasks.entries()) {
                if (progressData.status === 'running') {
                    // Update metrics from monitoring service
                    const metrics = await this.taskMonitoringService.getTaskMetrics(taskId);
                    if (metrics) {
                        progressData.metrics = { ...progressData.metrics, ...metrics };
                    }

                    // Calculate estimated time remaining
                    if (progressData.startTime && progressData.estimatedDuration) {
                        const elapsed = (new Date() - progressData.startTime) / 1000;
                        const remaining = Math.max(0, progressData.estimatedDuration - elapsed);
                        progressData.estimatedRemaining = remaining;
                    }

                    this.activeTasks.set(taskId, progressData);
                }
            }
        } catch (error) {
            this.logger.error('TaskProgressTracker: Failed to update active task progress', {
                error: error.message
            });
        }
    }

    /**
     * Clean up completed tasks
     */
    cleanupCompletedTasks() {
        try {
            const now = new Date();
            for (const [taskId, progressData] of this.activeTasks.entries()) {
                if (progressData.status === 'completed' || progressData.status === 'error') {
                    const timeSinceCompletion = now - progressData.endTime;
                    if (timeSinceCompletion > 300000) { // 5 minutes
                        this.activeTasks.delete(taskId);
                        this.logger.debug('TaskProgressTracker: Cleaned up completed task', { taskId });
                    }
                }
            }
        } catch (error) {
            this.logger.error('TaskProgressTracker: Failed to cleanup completed tasks', {
                error: error.message
            });
        }
    }

    /**
     * Save progress history
     */
    async saveProgressHistory() {
        try {
            for (const [taskId, history] of this.progressHistory.entries()) {
                if (history.updated) {
                    await this.taskMonitoringService.saveProgressHistory(taskId, history);
                    history.updated = false;
                }
            }
        } catch (error) {
            this.logger.error('TaskProgressTracker: Failed to save progress history', {
                error: error.message
            });
        }
    }

    /**
     * Initialize progress history
     * @param {string} taskId - Task ID
     * @param {Object} progressData - Progress data
     */
    initializeProgressHistory(taskId, progressData) {
        this.progressHistory.set(taskId, {
            taskId,
            startTime: progressData.startTime,
            updates: [],
            updated: true
        });
    }

    /**
     * Update progress history
     * @param {string} taskId - Task ID
     * @param {Object} progressData - Progress data
     */
    updateProgressHistory(taskId, progressData) {
        const history = this.progressHistory.get(taskId);
        if (history) {
            history.updates.push({
                timestamp: new Date(),
                progress: progressData.progress,
                step: progressData.currentStep,
                metrics: progressData.metrics
            });
            history.updated = true;
        }
    }

    /**
     * Finalize progress history
     * @param {string} taskId - Task ID
     * @param {Object} progressData - Progress data
     */
    finalizeProgressHistory(taskId, progressData) {
        const history = this.progressHistory.get(taskId);
        if (history) {
            history.endTime = progressData.endTime;
            history.duration = progressData.duration;
            history.status = progressData.status;
            history.result = progressData.result;
            history.error = progressData.error;
            history.updated = true;
        }
    }

    /**
     * Broadcast progress update
     * @param {string} taskId - Task ID
     * @param {string} eventType - Event type
     * @param {Object} progressData - Progress data
     */
    broadcastProgressUpdate(taskId, eventType, progressData) {
        try {
            const roomName = `progress:${taskId}`;
            this.io.to(roomName).emit(`progress:${eventType}`, {
                taskId,
                eventType,
                data: progressData,
                timestamp: new Date().toISOString()
            });

            this.logger.debug('TaskProgressTracker: Progress update broadcasted', {
                taskId,
                eventType,
                roomName
            });

        } catch (error) {
            this.logger.error('TaskProgressTracker: Failed to broadcast progress update', {
                taskId,
                eventType,
                error: error.message
            });
        }
    }

    /**
     * Get task progress
     * @param {string} taskId - Task ID
     * @returns {Object|null} Progress data
     */
    getTaskProgress(taskId) {
        return this.activeTasks.get(taskId) || null;
    }

    /**
     * Get all active tasks
     * @returns {Array} Array of active tasks
     */
    getActiveTasks() {
        return Array.from(this.activeTasks.values());
    }

    /**
     * Get progress statistics
     * @returns {Object} Progress statistics
     */
    getProgressStats() {
        const stats = {
            activeTasks: this.activeTasks.size,
            completedToday: 0,
            failedToday: 0,
            averageDuration: 0,
            totalDuration: 0
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const progressData of this.activeTasks.values()) {
            if (progressData.endTime && progressData.endTime >= today) {
                if (progressData.status === 'completed') {
                    stats.completedToday++;
                } else if (progressData.status === 'error') {
                    stats.failedToday++;
                }
            }

            if (progressData.duration) {
                stats.totalDuration += progressData.duration;
            }
        }

        const totalCompleted = stats.completedToday + stats.failedToday;
        if (totalCompleted > 0) {
            stats.averageDuration = stats.totalDuration / totalCompleted;
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
            activeTasks: this.activeTasks.size,
            progressHistory: this.progressHistory.size,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = TaskProgressTracker; 