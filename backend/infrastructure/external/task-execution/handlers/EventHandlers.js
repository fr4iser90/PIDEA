/**
 * Event handlers for TaskExecutionEngine
 */
const EXECUTION_CONSTANTS = require('../constants/ExecutionConstants');
const { logger } = require('@infrastructure/logging/Logger');

class EventHandlers {
    constructor(taskExecutionEngine, logger = console) {
        this.taskExecutionEngine = taskExecutionEngine;
        this.logger = logger;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.taskExecutionEngine.eventBus) {
            this.logger.warn('EventHandlers: No event bus available, skipping event listeners');
            return;
        }

        this.taskExecutionEngine.eventBus.on(
            EXECUTION_CONSTANTS.EVENTS.EXECUTION_REQUESTED, 
            this.handleExecutionRequest.bind(this)
        );
        this.taskExecutionEngine.eventBus.on(
            EXECUTION_CONSTANTS.EVENTS.EXECUTION_CANCELLED, 
            this.handleExecutionCancellation.bind(this)
        );
        this.taskExecutionEngine.eventBus.on(
            EXECUTION_CONSTANTS.EVENTS.EXECUTION_PAUSED, 
            this.handleExecutionPause.bind(this)
        );
        this.taskExecutionEngine.eventBus.on(
            EXECUTION_CONSTANTS.EVENTS.EXECUTION_RESUMED, 
            this.handleExecutionResume.bind(this)
        );
    }

    /**
     * Handle execution request event
     * @param {Object} data - Event data
     */
    handleExecutionRequest(data) {
        this.logger.info('EventHandlers: Execution requested', {
            taskId: data.taskId,
            userId: data.userId
        });

        // Add task to execution queue
        this.taskExecutionEngine.executionQueue.push({
            task: data.task,
            options: data.options,
            timestamp: new Date()
        });
    }

    /**
     * Handle execution cancellation event
     * @param {Object} data - Event data
     */
    handleExecutionCancellation(data) {
        this.logger.info('EventHandlers: Execution cancellation requested', {
            taskId: data.taskId,
            executionId: data.executionId
        });

        // Find and cancel execution
        const execution = this.taskExecutionEngine.activeExecutions.get(data.executionId);
        if (execution) {
            execution.status = EXECUTION_CONSTANTS.EXECUTION_STATUS.CANCELLED;
            execution.endTime = new Date();
            execution.duration = execution.endTime - execution.startTime;

            this.taskExecutionEngine.activeExecutions.set(data.executionId, execution);

            // Emit cancellation event
            if (this.taskExecutionEngine.eventBus) {
                this.taskExecutionEngine.eventBus.emit('task:execution:cancelled', {
                    taskId: data.taskId,
                    executionId: data.executionId,
                    execution
                });
            }
        } else {
            this.logger.warn('EventHandlers: Execution not found for cancellation', {
                executionId: data.executionId
            });
        }
    }

    /**
     * Handle execution pause event
     * @param {Object} data - Event data
     */
    handleExecutionPause(data) {
        this.logger.info('EventHandlers: Execution pause requested', {
            taskId: data.taskId,
            executionId: data.executionId
        });

        // Find and pause execution
        const execution = this.taskExecutionEngine.activeExecutions.get(data.executionId);
        if (execution) {
            execution.status = EXECUTION_CONSTANTS.EXECUTION_STATUS.PAUSED;
            execution.pausedAt = new Date();

            this.taskExecutionEngine.activeExecutions.set(data.executionId, execution);

            // Emit pause event
            if (this.taskExecutionEngine.eventBus) {
                this.taskExecutionEngine.eventBus.emit('task:execution:paused', {
                    taskId: data.taskId,
                    executionId: data.executionId,
                    execution
                });
            }
        } else {
            this.logger.warn('EventHandlers: Execution not found for pause', {
                executionId: data.executionId
            });
        }
    }

    /**
     * Handle execution resume event
     * @param {Object} data - Event data
     */
    handleExecutionResume(data) {
        this.logger.info('EventHandlers: Execution resume requested', {
            taskId: data.taskId,
            executionId: data.executionId
        });

        // Find and resume execution
        const execution = this.taskExecutionEngine.activeExecutions.get(data.executionId);
        if (execution && execution.status === EXECUTION_CONSTANTS.EXECUTION_STATUS.PAUSED) {
            execution.status = EXECUTION_CONSTANTS.EXECUTION_STATUS.RUNNING;
            execution.resumedAt = new Date();

            this.taskExecutionEngine.activeExecutions.set(data.executionId, execution);

            // Emit resume event
            if (this.taskExecutionEngine.eventBus) {
                this.taskExecutionEngine.eventBus.emit('task:execution:resumed', {
                    taskId: data.taskId,
                    executionId: data.executionId,
                    execution
                });
            }
        } else {
            this.logger.warn('EventHandlers: Execution not found or not paused for resume', {
                executionId: data.executionId
            });
        }
    }

    /**
     * Process execution queue
     */
    async processExecutionQueue() {
        // Check if we can start new executions
        if (this.taskExecutionEngine.activeExecutions.size >= this.taskExecutionEngine.maxConcurrentExecutions) {
            return;
        }

        // Process queued tasks
        while (this.taskExecutionEngine.executionQueue.length > 0 && 
               this.taskExecutionEngine.activeExecutions.size < this.taskExecutionEngine.maxConcurrentExecutions) {
            
            const queuedTask = this.taskExecutionEngine.executionQueue.shift();
            
            try {
                await this.taskExecutionEngine.executeTask(queuedTask.task, queuedTask.options);
            } catch (error) {
                this.logger.error('EventHandlers: Failed to execute queued task', {
                    taskId: queuedTask.task.id,
                    error: error.message
                });
            }
        }
    }

    /**
     * Start queue processor
     */
    startQueueProcessor() {
        setInterval(() => {
            this.processExecutionQueue();
        }, EXECUTION_CONSTANTS.QUEUE_CHECK_INTERVAL);
    }
}

module.exports = EventHandlers; 