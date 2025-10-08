/**
 * TaskQueueService - Domain service for task queue management
 * Handles task enqueuing and queue operations
 */

const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('TaskQueueService');

class TaskQueueService {
    constructor(dependencies = {}) {
        this.taskRepository = dependencies.taskRepository;
        this.queueTaskExecutionService = dependencies.queueTaskExecutionService;
        this.logger = logger;
        
        this.logger.info('TaskQueueService initialized');
    }

    /**
     * Enqueue task for execution using queue-based system
     * 
     * 📋 EXECUTION FLOW:
     * Frontend → TaskController → TaskApplicationService → TaskQueueService → QueueTaskExecutionService → TaskQueueStore
     * 
     * 🔄 QUEUE-BASED ARCHITECTURE:
     * 1. Frontend sends task execution request
     * 2. TaskController validates and routes to TaskApplicationService
     * 3. TaskApplicationService calls TaskQueueService.enqueue() (this method)
     * 4. TaskQueueService adds task to queue via QueueTaskExecutionService
     * 5. QueueTaskExecutionService manages queue and workflow selection
     * 6. TaskQueueStore tracks execution status
     * 7. TaskProcessor handles bulk operations, pausing, priorities
     * 
     * 🎯 BENEFITS:
     * - Bulk task management (pause, remove, prioritize)
     * - Real-time status tracking
     * - Retry logic and error handling
     * - Configurable workflows via JSON
     * - Concurrent execution control
     * 
     * @param {string} taskId - Task ID
     * @param {string} userId - User ID
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Queue result (task is queued, not executed immediately)
     */
    async enqueue(taskId, userId, options = {}) {
        this.logger.info('🔍 [TaskQueueService] enqueue called:', { taskId, options });
        
        try {
            // For task creation workflows, skip task validation since task doesn't exist yet
            if (options.taskMode === 'task-create-workflow' || options.taskMode === 'advanced-task-create-workflow') {
                this.logger.info('🔍 [TaskQueueService] Task creation workflow detected, skipping task validation');
            } else {
                // Validate task exists for execution workflows
                const task = await this.taskRepository.findById(taskId);
                if (!task) {
                    throw new Error('Task not found');
                }
                
                if (task.isCompleted()) {
                    throw new Error('Task is already completed');
                }
            }
            
            // Use QueueTaskExecutionService for queue-based execution
            if (!this.queueTaskExecutionService) {
                throw new Error('QueueTaskExecutionService not available');
            }
            
            // Add to queue instead of direct execution
            const queueItem = await this.queueTaskExecutionService.addTaskToQueue(
                options.projectId,
                userId,
                taskId,
                {
                    priority: options.priority || 'normal',
                    createGitBranch: options.createGitBranch || false,
                    branchName: options.branchName,
                    autoExecute: options.autoExecute || true,
                    projectPath: options.projectPath,
                    taskMode: options.taskMode,
                    workflow: options.workflow  
                }
            );
            
            this.logger.info('✅ [TaskQueueService] Task added to queue successfully', {
                taskId,
                queueItemId: queueItem.queueItemId
            });
            
            return {
                success: true,
                taskId: task.id,
                queueItemId: queueItem.queueItemId,
                status: 'queued',
                position: queueItem.position,
                estimatedStartTime: queueItem.estimatedStartTime,
                message: queueItem.message
            };
            
        } catch (error) {
            this.logger.error('❌ [TaskQueueService] Failed to add task to queue:', error.message);
            throw error;
        }
    }
}

module.exports = TaskQueueService;
