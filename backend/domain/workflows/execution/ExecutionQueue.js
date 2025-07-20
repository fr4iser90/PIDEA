/**
 * ExecutionQueue - Queue for managing workflow execution
 * Provides priority scheduling and resource management
 */

const ServiceLogger = require('@logging/ServiceLogger');

class ExecutionQueue {
    constructor(options = {}) {
        this.logger = new ServiceLogger('ExecutionQueue');
        this.maxConcurrent = options.maxConcurrent || 5;
        this.enablePriority = options.enablePriority || false;
        this.enableRetry = options.enableRetry || false;
        
        this.queue = [];
        this.running = new Map();
        this.completed = [];
        this.failed = [];
        
        this.logger.info('ExecutionQueue initialized', {
            maxConcurrent: this.maxConcurrent,
            enablePriority: this.enablePriority,
            enableRetry: this.enableRetry
        });
    }

    /**
     * Add workflow to execution queue
     * @param {Object} workflow - Workflow to execute
     * @param {Object} context - Execution context
     * @param {Object} options - Execution options
     * @returns {Promise<string>} Execution ID
     */
    async addToQueue(workflow, context = {}, options = {}) {
        const executionId = this.generateExecutionId();
        
        const queueItem = {
            id: executionId,
            workflow,
            context,
            options: {
                priority: options.priority || 'normal',
                retryCount: 0,
                maxRetries: options.maxRetries || 3,
                timeout: options.timeout || 300000,
                ...options
            },
            status: 'queued',
            addedAt: Date.now()
        };

        this.queue.push(queueItem);
        
        // Sort queue by priority if enabled
        if (this.enablePriority) {
            this.sortQueueByPriority();
        }

        this.logger.info('Workflow added to execution queue', {
            executionId,
            priority: queueItem.options.priority,
            queueLength: this.queue.length
        });

        // Start processing if not at capacity
        this.processQueue();

        return executionId;
    }

    /**
     * Process execution queue
     */
    async processQueue() {
        while (this.running.size < this.maxConcurrent && this.queue.length > 0) {
            const item = this.queue.shift();
            
            if (item) {
                this.running.set(item.id, item);
                item.status = 'running';
                item.startedAt = Date.now();

                this.logger.info('Starting workflow execution', {
                    executionId: item.id,
                    runningCount: this.running.size
                });

                // Execute workflow
                this.executeWorkflow(item).catch(error => {
                    this.logger.error('Workflow execution failed', {
                        executionId: item.id,
                        error: error.message
                    });
                });
            }
        }
    }

    /**
     * Execute workflow
     * @param {Object} item - Queue item
     */
    async executeWorkflow(item) {
        try {
            // Execute workflow
            const result = await item.workflow.execute(item.context);

            // Update item status
            item.status = 'completed';
            item.completedAt = Date.now();
            item.result = result;

            // Move to completed list
            this.completed.push(item);
            this.running.delete(item.id);

            this.logger.info('Workflow execution completed', {
                executionId: item.id,
                success: result.success,
                duration: item.completedAt - item.startedAt
            });

        } catch (error) {
            // Handle retry logic
            if (this.enableRetry && item.options.retryCount < item.options.maxRetries) {
                item.options.retryCount++;
                item.status = 'retrying';
                
                this.logger.warn('Retrying workflow execution', {
                    executionId: item.id,
                    retryCount: item.options.retryCount,
                    maxRetries: item.options.maxRetries
                });

                // Add back to queue for retry
                this.queue.unshift(item);
                this.running.delete(item.id);
                
                // Continue processing
                this.processQueue();
                return;
            }

            // Mark as failed
            item.status = 'failed';
            item.completedAt = Date.now();
            item.error = error.message;

            this.failed.push(item);
            this.running.delete(item.id);

            this.logger.error('Workflow execution failed permanently', {
                executionId: item.id,
                error: error.message,
                retryCount: item.options.retryCount
            });
        }

        // Continue processing queue
        this.processQueue();
    }

    /**
     * Sort queue by priority
     */
    sortQueueByPriority() {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        
        this.queue.sort((a, b) => {
            const priorityA = priorityOrder[a.options.priority] || 2;
            const priorityB = priorityOrder[b.options.priority] || 2;
            
            if (priorityA !== priorityB) {
                return priorityB - priorityA; // Higher priority first
            }
            
            // If same priority, FIFO
            return a.addedAt - b.addedAt;
        });
    }

    /**
     * Get execution status
     * @param {string} executionId - Execution ID
     * @returns {Object|null} Execution status
     */
    getExecutionStatus(executionId) {
        // Check running executions
        const running = this.running.get(executionId);
        if (running) {
            return {
                id: running.id,
                status: running.status,
                startedAt: running.startedAt,
                duration: Date.now() - running.startedAt
            };
        }

        // Check completed executions
        const completed = this.completed.find(item => item.id === executionId);
        if (completed) {
            return {
                id: completed.id,
                status: completed.status,
                startedAt: completed.startedAt,
                completedAt: completed.completedAt,
                duration: completed.completedAt - completed.startedAt,
                result: completed.result
            };
        }

        // Check failed executions
        const failed = this.failed.find(item => item.id === executionId);
        if (failed) {
            return {
                id: failed.id,
                status: failed.status,
                startedAt: failed.startedAt,
                completedAt: failed.completedAt,
                duration: failed.completedAt - failed.startedAt,
                error: failed.error
            };
        }

        // Check queued executions
        const queued = this.queue.find(item => item.id === executionId);
        if (queued) {
            return {
                id: queued.id,
                status: queued.status,
                addedAt: queued.addedAt,
                position: this.queue.indexOf(queued) + 1
            };
        }

        return null;
    }

    /**
     * Get queue statistics
     * @returns {Object} Queue statistics
     */
    getStats() {
        return {
            queued: this.queue.length,
            running: this.running.size,
            completed: this.completed.length,
            failed: this.failed.length,
            total: this.queue.length + this.running.size + this.completed.length + this.failed.length,
            maxConcurrent: this.maxConcurrent
        };
    }

    /**
     * Clear completed and failed executions
     */
    clearHistory() {
        const completedCount = this.completed.length;
        const failedCount = this.failed.length;
        
        this.completed = [];
        this.failed = [];
        
        this.logger.info('Execution history cleared', {
            completedCleared: completedCount,
            failedCleared: failedCount
        });
    }

    /**
     * Generate unique execution ID
     * @returns {string} Execution ID
     */
    generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

module.exports = ExecutionQueue; 