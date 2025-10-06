/**
 * QueueMonitoringService - Domain service for queue monitoring and management
 * Provides comprehensive queue tracking, status reporting, and control operations
 */

const ServiceLogger = require('@logging/ServiceLogger');

class QueueMonitoringService {
    constructor(dependencies = {}) {
        this.logger = new ServiceLogger('QueueMonitoringService');
        this.eventBus = dependencies.eventBus;
        
        // Project-specific queues
        this.projectQueues = new Map();
        
        // Queue statistics tracking
        this.queueStats = new Map();
        
        this.logger.info('QueueMonitoringService initialized');
    }

    /**
     * Get comprehensive queue status for a project
     * @param {string} projectId - Project identifier
     * @param {string} userId - User identifier
     * @returns {Object} Queue status with items, statistics, and metadata
     */
    async getProjectQueueStatus(projectId, userId) {
        try {
            this.logger.debug('Getting queue status', { projectId, userId });

            const projectQueue = this.getProjectQueue(projectId);
            
            const queueItems = await this.getQueueItems(projectId, userId);
            const statistics = await this.getQueueStatistics(projectId, userId);
            const activeItems = queueItems.filter(item => item.status === 'running' || item.status === 'queued');
            const completedItems = queueItems.filter(item => item.status === 'completed' || item.status === 'failed');

            const status = {
                projectId,
                userId,
                timestamp: new Date().toISOString(),
                queue: {
                    active: activeItems,
                    completed: completedItems,
                    total: queueItems.length,
                    running: activeItems.filter(item => item.status === 'running').length,
                    queued: activeItems.filter(item => item.status === 'queued').length,
                    completed: completedItems.filter(item => item.status === 'completed').length,
                    failed: completedItems.filter(item => item.status === 'failed').length
                },
                statistics,
                metadata: {
                    lastUpdated: new Date().toISOString(),
                    queueHealth: this.calculateQueueHealth(activeItems),
                    estimatedWaitTime: this.calculateEstimatedWaitTime(activeItems),
                    priorityDistribution: this.calculatePriorityDistribution(activeItems)
                }
            };

            this.logger.debug('Queue status retrieved', { 
                projectId, 
                totalItems: status.queue.total,
                running: status.queue.running,
                queued: status.queue.queued
            });

            return status;

        } catch (error) {
            this.logger.error('Failed to get queue status', { projectId, userId, error: error.message });
            throw error;
        }
    }

    /**
     * Add workflow to project queue
     * @param {string} projectId - Project identifier
     * @param {string} userId - User identifier
     * @param {Object} workflow - Workflow to execute
     * @param {Object} context - Execution context
     * @param {Object} options - Execution options
     * @returns {Object} Queue item with ID and status
     */
    async addToProjectQueue(projectId, userId, workflow, context = {}, options = {}) {
        try {
            this.logger.info('Adding to project queue', { 
                projectId, 
                userId, 
                workflowType: workflow?.type,
                priority: options.priority || 'normal'
            });

            const projectQueue = this.getProjectQueue(projectId);
            
            // Generate unique queue item ID
            const queueItemId = this.generateQueueItemId();
            
            const queueItem = {
                id: queueItemId,
                projectId,
                userId,
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
                addedAt: new Date().toISOString(),
                estimatedStartTime: this.calculateEstimatedStartTime(projectId),
                position: projectQueue.length + 1
            };

            // Add to project queue
            projectQueue.push(queueItem);
            
            // Sort by priority (always enabled)
            this.sortProjectQueueByPriority(projectId);

            // Update statistics
            this.updateQueueStatistics(projectId, 'added');

            // Emit event for real-time updates
            if (this.eventBus) {
                this.eventBus.emit('queue:item:added', {
                    projectId,
                    userId,
                    item: queueItem
                });
            }

            this.logger.info('Item added to queue', { 
                projectId, 
                queueItemId, 
                position: queueItem.position,
                priority: queueItem.options.priority
            });

            return queueItem;

        } catch (error) {
            this.logger.error('Failed to add to project queue', { 
                projectId, 
                userId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Add workflow to queue (alias for addToProjectQueue)
     * @param {string} projectId - Project identifier
     * @param {string} userId - User identifier
     * @param {Object} workflow - Workflow to execute
     * @param {Object} context - Execution context
     * @param {Object} options - Execution options
     * @returns {Object} Queue item with ID and status
     */
    async addToQueue(projectId, userId, workflow, context = {}, options = {}) {
        return this.addToProjectQueue(projectId, userId, workflow, context, options);
    }

    /**
     * Cancel queue item
     * @param {string} projectId - Project identifier
     * @param {string} itemId - Queue item identifier
     * @param {string} userId - User identifier
     * @returns {Object} Cancellation result
     */
    async cancelQueueItem(projectId, itemId, userId) {
        try {
            this.logger.info('Cancelling queue item', { projectId, itemId, userId });

            const projectQueue = this.getProjectQueue(projectId);
            const itemIndex = projectQueue.findIndex(item => item.id === itemId);
            
            if (itemIndex === -1) {
                throw new Error(`Queue item ${itemId} not found`);
            }

            const item = projectQueue[itemIndex];
            
            // Check if item can be cancelled
            if (item.status === 'completed' || item.status === 'failed') {
                throw new Error(`Cannot cancel ${item.status} item`);
            }

            // Update item status
            item.status = 'cancelled';
            item.cancelledAt = new Date().toISOString();
            item.cancelledBy = userId;

            // Remove from active queue if not running
            if (item.status !== 'running') {
                projectQueue.splice(itemIndex, 1);
            }

            // Update statistics
            this.updateQueueStatistics(projectId, 'cancelled');

            // Emit event for real-time updates
            if (this.eventBus) {
                this.eventBus.emit('queue:item:cancelled', {
                    projectId,
                    userId,
                    itemId,
                    item
                });
            }

            this.logger.info('Queue item cancelled', { projectId, itemId, userId });

            return {
                success: true,
                itemId,
                status: 'cancelled',
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            this.logger.error('Failed to cancel queue item', { 
                projectId, 
                itemId, 
                userId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Update queue item status and data
     * @param {string} projectId - Project identifier
     * @param {string} itemId - Queue item identifier
     * @param {Object} updates - Updates to apply
     * @returns {Object} Updated queue item
     */
    async updateQueueItem(projectId, itemId, updates) {
        try {
            this.logger.debug('Updating queue item', { projectId, itemId, updates });

            const projectQueue = this.getProjectQueue(projectId);
            const itemIndex = projectQueue.findIndex(item => item.id === itemId);
            
            if (itemIndex === -1) {
                throw new Error(`Queue item ${itemId} not found`);
            }

            const item = projectQueue[itemIndex];
            
            // Apply updates
            Object.assign(item, updates);
            item.updatedAt = new Date().toISOString();

            // Update statistics based on status change
            if (updates.status) {
                this.updateQueueStatistics(projectId, updates.status);
            }

            // Emit event for real-time updates
            if (this.eventBus) {
                this.eventBus.emit('queue:item:updated', {
                    projectId,
                    itemId,
                    item
                });
            }

            this.logger.debug('Queue item updated', { projectId, itemId, status: item.status });

            return item;

        } catch (error) {
            this.logger.error('Failed to update queue item', { 
                projectId, 
                itemId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Update step progress within a workflow
     * @param {string} projectId - Project identifier
     * @param {string} workflowId - Workflow identifier
     * @param {string} stepId - Step identifier
     * @param {Object} progress - Progress data
     * @returns {Object} Updated workflow
     */
    async updateStepProgress(projectId, workflowId, stepId, progress) {
        try {
            this.logger.debug('Updating step progress', { projectId, workflowId, stepId, progress });

            const projectQueue = this.getProjectQueue(projectId);
            const workflowIndex = projectQueue.findIndex(item => item.id === workflowId);
            
            if (workflowIndex === -1) {
                throw new Error(`Workflow ${workflowId} not found in queue`);
            }

            const workflow = projectQueue[workflowIndex];
            
            // Find the step in the workflow (steps are in workflow.workflow.steps)
            const stepIndex = workflow.workflow?.steps?.findIndex(step => step.id === stepId);
            if (stepIndex === -1) {
                throw new Error(`Step ${stepId} not found in workflow ${workflowId}`);
            }

            // Update step progress
            Object.assign(workflow.workflow.steps[stepIndex], progress);
            workflow.workflow.steps[stepIndex].updatedAt = new Date().toISOString();

            // Update overall workflow progress
            const completedSteps = workflow.workflow.steps.filter(step => step.status === 'completed').length;
            const totalSteps = workflow.workflow.steps.length;
            workflow.workflow.progress = Math.round((completedSteps / totalSteps) * 100);
            workflow.workflow.currentStep = completedSteps;

            // Update workflow status if all steps are completed
            if (completedSteps === totalSteps) {
                workflow.workflow.status = 'completed';
                workflow.workflow.completedAt = new Date().toISOString();
            }

            // Emit event for real-time updates
            if (this.eventBus) {
                this.eventBus.emit('workflow:step:progress', {
                    projectId,
                    workflowId,
                    stepId,
                    progress: workflow.workflow.steps[stepIndex],
                    overallProgress: workflow.workflow.progress
                });
            }

            this.logger.debug('Step progress updated', { 
                projectId, 
                workflowId, 
                stepId, 
                status: workflow.workflow.steps[stepIndex].status,
                overallProgress: workflow.workflow.progress 
            });

            return workflow;

        } catch (error) {
            this.logger.error('Failed to update step progress', { 
                projectId, 
                workflowId, 
                stepId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Update queue item priority
     * @param {string} projectId - Project identifier
     * @param {string} itemId - Queue item identifier
     * @param {string} userId - User identifier
     * @param {string} priority - New priority level
     * @returns {Object} Update result
     */
    async updateQueueItemPriority(projectId, itemId, userId, priority) {
        try {
            this.logger.info('Updating queue item priority', { 
                projectId, 
                itemId, 
                userId, 
                priority 
            });

            const projectQueue = this.getProjectQueue(projectId);
            const item = projectQueue.find(item => item.id === itemId);
            
            if (!item) {
                throw new Error(`Queue item ${itemId} not found`);
            }

            // Check if item can be updated
            if (item.status === 'completed' || item.status === 'failed' || item.status === 'cancelled') {
                throw new Error(`Cannot update priority of ${item.status} item`);
            }

            const oldPriority = item.options.priority;
            item.options.priority = priority;
            item.updatedAt = new Date().toISOString();
            item.updatedBy = userId;

            // Re-sort queue if priority changed
            if (oldPriority !== priority) {
                this.sortProjectQueueByPriority(projectId);
            }

            // Emit event for real-time updates
            if (this.eventBus) {
                this.eventBus.emit('queue:item:priority_updated', {
                    projectId,
                    userId,
                    itemId,
                    oldPriority,
                    newPriority: priority
                });
            }

            this.logger.info('Queue item priority updated', { 
                projectId, 
                itemId, 
                userId, 
                oldPriority, 
                newPriority: priority 
            });

            return {
                success: true,
                itemId,
                oldPriority,
                newPriority: priority,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            this.logger.error('Failed to update queue item priority', { 
                projectId, 
                itemId, 
                userId, 
                priority, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Get queue statistics
     * @param {string} projectId - Project identifier
     * @param {string} userId - User identifier
     * @returns {Object} Queue statistics
     */
    async getQueueStatistics(projectId, userId) {
        try {
            const projectQueue = this.getProjectQueue(projectId);
            const stats = this.queueStats.get(projectId) || this.initializeQueueStats();

            const currentStats = {
                totalItems: projectQueue.length,
                running: projectQueue.filter(item => item.status === 'running').length,
                queued: projectQueue.filter(item => item.status === 'queued').length,
                completed: projectQueue.filter(item => item.status === 'completed').length,
                failed: projectQueue.filter(item => item.status === 'failed').length,
                cancelled: projectQueue.filter(item => item.status === 'cancelled').length,
                averageProcessingTime: stats.averageProcessingTime,
                totalProcessingTime: stats.totalProcessingTime,
                itemsProcessed: stats.itemsProcessed,
                successRate: stats.itemsProcessed > 0 ? (stats.completed / stats.itemsProcessed) * 100 : 0,
                lastUpdated: new Date().toISOString()
            };

            return currentStats;

        } catch (error) {
            this.logger.error('Failed to get queue statistics', { 
                projectId, 
                userId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Clear completed items from queue
     * @param {string} projectId - Project identifier
     * @param {string} userId - User identifier
     * @returns {Object} Clear result
     */
    async clearCompletedItems(projectId, userId) {
        try {
            this.logger.info('Clearing completed items', { projectId, userId });

            const projectQueue = this.getProjectQueue(projectId);
            const initialLength = projectQueue.length;
            
            // Remove completed, failed, and cancelled items
            const itemsToRemove = projectQueue.filter(item => 
                item.status === 'completed' || 
                item.status === 'failed' || 
                item.status === 'cancelled'
            );

            // Remove items from queue
            itemsToRemove.forEach(item => {
                const index = projectQueue.indexOf(item);
                if (index > -1) {
                    projectQueue.splice(index, 1);
                }
            });

            const clearedCount = initialLength - projectQueue.length;

            // Emit event for real-time updates
            if (this.eventBus) {
                this.eventBus.emit('queue:items:cleared', {
                    projectId,
                    userId,
                    clearedCount,
                    remainingCount: projectQueue.length
                });
            }

            this.logger.info('Completed items cleared', { 
                projectId, 
                userId, 
                clearedCount, 
                remainingCount: projectQueue.length 
            });

            return {
                success: true,
                clearedCount,
                remainingCount: projectQueue.length,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            this.logger.error('Failed to clear completed items', { 
                projectId, 
                userId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Get project queue (create if doesn't exist)
     * @param {string} projectId - Project identifier
     * @returns {Array} Project queue array
     */
    getProjectQueue(projectId) {
        if (!this.projectQueues.has(projectId)) {
            this.projectQueues.set(projectId, []);
        }
        return this.projectQueues.get(projectId);
    }

    /**
     * Get queue items for a project
     * @param {string} projectId - Project identifier
     * @param {string} userId - User identifier
     * @returns {Array} Queue items
     */
    async getQueueItems(projectId, userId) {
        const projectQueue = this.getProjectQueue(projectId);
        
        // Filter items by user if needed (for multi-user projects)
        // For now, return all items for the project
        return projectQueue.map((item, index) => ({
            ...item,
            position: index + 1
        }));
    }

    /**
     * Sort project queue by priority
     * @param {string} projectId - Project identifier
     */
    sortProjectQueueByPriority(projectId) {
        const projectQueue = this.getProjectQueue(projectId);
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        
        projectQueue.sort((a, b) => {
            const priorityA = priorityOrder[a.options.priority] || 2;
            const priorityB = priorityOrder[b.options.priority] || 2;
            
            if (priorityA !== priorityB) {
                return priorityB - priorityA; // Higher priority first
            }
            
            // If same priority, FIFO
            return new Date(a.addedAt) - new Date(b.addedAt);
        });
    }

    /**
     * Generate unique queue item ID
     * @returns {string} Unique queue item ID
     */
    generateQueueItemId() {
        return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Calculate estimated start time for new item
     * @param {string} projectId - Project identifier
     * @returns {string} Estimated start time ISO string
     */
    calculateEstimatedStartTime(projectId) {
        const projectQueue = this.getProjectQueue(projectId);
        const queuedItems = projectQueue.filter(item => item.status === 'queued');
        const averageProcessingTime = 30000; // 30 seconds default
        
        const estimatedWaitTime = queuedItems.length * averageProcessingTime;
        const estimatedStartTime = new Date(Date.now() + estimatedWaitTime);
        
        return estimatedStartTime.toISOString();
    }

    /**
     * Calculate queue health score
     * @param {Array} activeItems - Active queue items
     * @returns {number} Health score (0-100)
     */
    calculateQueueHealth(activeItems) {
        if (activeItems.length === 0) return 100;
        
        const runningItems = activeItems.filter(item => item.status === 'running');
        const queuedItems = activeItems.filter(item => item.status === 'queued');
        
        // Health factors: running items (good), queued items (neutral), failed items (bad)
        const healthScore = Math.max(0, 100 - (queuedItems.length * 5));
        
        return Math.min(100, healthScore);
    }

    /**
     * Calculate estimated wait time
     * @param {Array} activeItems - Active queue items
     * @returns {number} Estimated wait time in milliseconds
     */
    calculateEstimatedWaitTime(activeItems) {
        const queuedItems = activeItems.filter(item => item.status === 'queued');
        const averageProcessingTime = 30000; // 30 seconds default
        
        return queuedItems.length * averageProcessingTime;
    }

    /**
     * Calculate priority distribution
     * @param {Array} activeItems - Active queue items
     * @returns {Object} Priority distribution
     */
    calculatePriorityDistribution(activeItems) {
        const distribution = { high: 0, normal: 0, low: 0 };
        
        activeItems.forEach(item => {
            const priority = item.options.priority || 'normal';
            distribution[priority] = (distribution[priority] || 0) + 1;
        });
        
        return distribution;
    }

    /**
     * Update queue statistics
     * @param {string} projectId - Project identifier
     * @param {string} action - Action performed
     */
    updateQueueStatistics(projectId, action) {
        const stats = this.queueStats.get(projectId) || this.initializeQueueStats();
        
        switch (action) {
            case 'added':
                stats.totalAdded++;
                break;
            case 'completed':
                stats.completed++;
                stats.itemsProcessed++;
                break;
            case 'failed':
                stats.failed++;
                stats.itemsProcessed++;
                break;
            case 'cancelled':
                stats.cancelled++;
                break;
        }
        
        this.queueStats.set(projectId, stats);
    }

    /**
     * Initialize queue statistics
     * @returns {Object} Initial statistics object
     */
    initializeQueueStats() {
        return {
            totalAdded: 0,
            completed: 0,
            failed: 0,
            cancelled: 0,
            itemsProcessed: 0,
            totalProcessingTime: 0,
            averageProcessingTime: 0
        };
    }
}

module.exports = QueueMonitoringService; 