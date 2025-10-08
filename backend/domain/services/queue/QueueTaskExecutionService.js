/**
 * QueueTaskExecutionService - Domain service for queue-based task execution
 * Provides unified task execution through the queue system
 */

const ServiceLogger = require('@logging/ServiceLogger');

class QueueTaskExecutionService {
    constructor(dependencies = {}) {
        this.logger = new ServiceLogger('QueueTaskExecutionService');
        this.taskQueueStore = dependencies.taskQueueStore;
        this.taskRepository = dependencies.taskRepository;
        this.eventBus = dependencies.eventBus;
        this.workflowLoaderService = dependencies.workflowLoaderService;
        
        this.logger.info('QueueTaskExecutionService initialized');
    }

    /**
     * Add task to queue for execution
     * @param {string} projectId - Project identifier
     * @param {string} userId - User identifier
     * @param {string} taskId - Task identifier
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Queue item with execution details
     */
    async addTaskToQueue(projectId, userId, taskId, options = {}) {
        try {
            this.logger.info('Adding task to queue', { 
                projectId, 
                userId, 
                taskId,
                priority: options.priority || 'normal'
            });

            // Validate task exists and belongs to project
            const task = await this.taskRepository.findById(taskId);
            if (!task) {
                throw new Error(`Task not found: ${taskId}`);
            }

            // Load workflow configuration
            const WorkflowLoaderService = require('../workflow/WorkflowLoaderService');
            const workflowLoader = new WorkflowLoaderService();
            await workflowLoader.loadWorkflows();
            
            // Determine workflow based on options or task type
            let workflowName = 'standard-task-workflow';
            
            if (options.workflowType === 'task-review') {
                workflowName = 'task-review-workflow';
            } else if (options.workflowType === 'task-check-state') {
                workflowName = 'task-review-workflow'; // Use same workflow but different prompt
            } else if (options.workflowType) {
                workflowName = options.workflowType;
            }
            
            // Get workflow
            const workflow = workflowLoader.getWorkflow(workflowName);
            if (!workflow) {
                throw new Error(`Workflow '${workflowName}' not found`);
            }

            // Create workflow context with task data
            const context = {
                task,
                taskId,
                projectId,
                userId,
                projectPath: options.projectPath,
                createGitBranch: options.createGitBranch || false,
                branchName: options.branchName,
                autoExecute: options.autoExecute || true,
                ...options
            };

            // Add to queue with proper priority
            const queueItem = await this.taskQueueStore.addToProjectQueue(
                projectId,
                userId,
                workflow,
                context,
                {
                    priority: options.priority || 'normal',
                    retryCount: 0,
                    maxRetries: options.maxRetries || 3,
                    timeout: options.timeout || 300000,
                    taskId,
                    taskType: task.type?.value,
                    ...options
                }
            );

            // Emit queue:item:added event
            if (this.eventBus) {
                this.eventBus.emit('queue:item:added', {
                    projectId,
                    userId,
                    item: queueItem,
                    taskId,
                    taskType: task.type?.value
                });
            }

            this.logger.info('Task added to queue successfully', { 
                taskId,
                queueItemId: queueItem.id,
                position: queueItem.position
            });

            return {
                success: true,
                taskId: task.id,
                queueItemId: queueItem.id,
                status: 'queued',
                position: queueItem.position,
                estimatedStartTime: queueItem.estimatedStartTime,
                message: `Task "${task.title}" added to queue for execution`
            };

        } catch (error) {
            this.logger.error('Failed to add task to queue', { 
                projectId, 
                userId, 
                taskId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Get task execution status from queue
     * @param {string} projectId - Project identifier
     * @param {string} queueItemId - Queue item identifier
     * @returns {Promise<Object>} Execution status with progress
     */
    async getTaskExecutionStatus(projectId, queueItemId) {
        try {
            this.logger.debug('Getting task execution status', { projectId, queueItemId });

            const projectQueue = this.taskQueueStore.getProjectQueue(projectId);
            const queueItem = projectQueue.find(item => item.id === queueItemId);
            
            if (!queueItem) {
                throw new Error(`Queue item ${queueItemId} not found`);
            }

            const status = {
                queueItemId,
                projectId,
                status: queueItem.status,
                progress: queueItem.workflow?.progress || 0,
                currentStep: queueItem.workflow?.currentStep || 0,
                totalSteps: queueItem.workflow?.steps?.length || 0,
                startedAt: queueItem.startedAt,
                completedAt: queueItem.completedAt,
                error: queueItem.error,
                position: queueItem.position,
                estimatedStartTime: queueItem.estimatedStartTime,
                lastUpdated: queueItem.updatedAt || queueItem.addedAt
            };

            // Add step details if available
            if (queueItem.workflow?.steps) {
                status.steps = queueItem.workflow.steps.map(step => ({
                    id: step.id,
                    name: step.name,
                    status: step.status || 'pending',
                    progress: step.progress || 0,
                    startedAt: step.startedAt,
                    completedAt: step.completedAt,
                    error: step.error
                }));
            }

            return status;

        } catch (error) {
            this.logger.error('Failed to get task execution status', { 
                projectId, 
                queueItemId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Cancel task execution
     * @param {string} projectId - Project identifier
     * @param {string} queueItemId - Queue item identifier
     * @param {string} userId - User identifier
     * @returns {Promise<Object>} Cancellation result
     */
    async cancelTaskExecution(projectId, queueItemId, userId) {
        try {
            this.logger.info('Cancelling task execution', { projectId, queueItemId, userId });

            // Update queue item status to cancelled
            const updatedItem = await this.taskQueueStore.updateQueueItem(projectId, queueItemId, {
                status: 'cancelled',
                cancelledAt: new Date().toISOString(),
                cancelledBy: userId
            });

            // Emit queue:item:cancelled event
            if (this.eventBus) {
                this.eventBus.emit('queue:item:cancelled', {
                    projectId,
                    userId,
                    item: updatedItem,
                    cancelledBy: userId
                });
            }

            this.logger.info('Task execution cancelled successfully', { 
                queueItemId,
                cancelledBy: userId
            });

            return {
                success: true,
                queueItemId,
                status: 'cancelled',
                message: 'Task execution cancelled successfully'
            };

        } catch (error) {
            this.logger.error('Failed to cancel task execution', { 
                projectId, 
                queueItemId, 
                userId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Get all task executions for a project
     * @param {string} projectId - Project identifier
     * @param {string} userId - User identifier
     * @returns {Promise<Array>} Array of task executions
     */
    async getProjectTaskExecutions(projectId, userId) {
        try {
            this.logger.debug('Getting project task executions', { projectId, userId });

            const projectQueue = this.taskQueueStore.getProjectQueue(projectId);
            
            // Filter queue items that are task executions
            const taskExecutions = projectQueue.filter(item => 
                item.context?.taskId || item.options?.taskId
            );

            return taskExecutions.map(item => ({
                queueItemId: item.id,
                taskId: item.context?.taskId || item.options?.taskId,
                status: item.status,
                progress: item.workflow?.progress || 0,
                currentStep: item.workflow?.currentStep || 0,
                totalSteps: item.workflow?.steps?.length || 0,
                addedAt: item.addedAt,
                startedAt: item.startedAt,
                completedAt: item.completedAt,
                cancelledAt: item.cancelledAt,
                error: item.error,
                position: item.position
            }));

        } catch (error) {
            this.logger.error('Failed to get project task executions', { 
                projectId, 
                userId, 
                error: error.message 
            });
            throw error;
        }
    }
}

module.exports = QueueTaskExecutionService; 