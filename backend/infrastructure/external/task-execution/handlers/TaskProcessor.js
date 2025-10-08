/**
 * TaskProcessor - Infrastructure service for processing task execution queue
 * Handles automatic queue processing and task execution
 */
const EXECUTION_CONSTANTS = require('../constants/ExecutionConstants');
const Logger = require('@logging/Logger');
const logger = new Logger('TaskProcessor');

class TaskProcessor {
    constructor(workflowExecutor, logger = console, taskQueueStore = null, eventBus = null, ideManager = null) {
        this.workflowExecutor = workflowExecutor;
        this.logger = logger;
        this.taskQueueStore = taskQueueStore;
        this.eventBus = eventBus;
        this.ideManager = ideManager;
    }
    
    async getActiveIDE() {
        if (this.ideManager) {
            return await this.ideManager.getActiveIDE();
        }
        return null;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.eventBus) {
            this.logger.warn('TaskProcessor: No event bus available, skipping event listeners');
            return;
        }

        // Listen for queue events
        this.eventBus.on('queue:item:added', (data) => {
            this.logger.info('TaskProcessor: Queue item added event received', {
                queueItemId: data.queueItemId,
                taskId: data.context?.taskId,
                projectId: data.projectId,
                autoExecute: data.options?.autoExecute
            });
            
            // Only process queue immediately if autoExecute is true
            if (data.options?.autoExecute !== false) {
                this.logger.info('TaskProcessor: Auto-execute enabled, processing queue immediately');
                this.processExecutionQueue();
            } else {
                this.logger.info('TaskProcessor: Auto-execute disabled, task queued but not executed');
            }
        });

        // Legacy execution events
        this.eventBus.on(
            EXECUTION_CONSTANTS.EVENTS.EXECUTION_REQUESTED, 
            this.handleExecutionRequest.bind(this)
        );
        this.eventBus.on(
            EXECUTION_CONSTANTS.EVENTS.EXECUTION_CANCELLED, 
            this.handleExecutionCancellation.bind(this)
        );
        this.eventBus.on(
            EXECUTION_CONSTANTS.EVENTS.EXECUTION_PAUSED, 
            this.handleExecutionPause.bind(this)
        );
        this.eventBus.on(
            EXECUTION_CONSTANTS.EVENTS.EXECUTION_RESUMED, 
            this.handleExecutionResume.bind(this)
        );
    }

    /**
     * Handle execution request event
     * @param {Object} data - Event data
     */
    handleExecutionRequest(data) {
        this.logger.info('TaskProcessor: Execution requested', {
            taskId: data.taskId,
            userId: data.userId
        });

        // Add to queue for processing
        this.processExecutionQueue();
    }

    /**
     * Handle execution cancellation event
     * @param {Object} data - Event data
     */
    handleExecutionCancellation(data) {
        this.logger.info('TaskProcessor: Execution cancelled', {
            taskId: data.taskId,
            userId: data.userId
        });

        // Remove from queue if present
        if (this.taskQueueStore) {
            // Implementation for removing from queue
            this.logger.info('TaskProcessor: Removing task from queue', {
                taskId: data.taskId
            });
        }
    }

    /**
     * Handle execution pause event
     * @param {Object} data - Event data
     */
    handleExecutionPause(data) {
        this.logger.info('TaskProcessor: Execution paused', {
            taskId: data.taskId,
            userId: data.userId
        });

        // Pause queue processing
        this.pauseQueueProcessing();
    }

    /**
     * Handle execution resume event
     * @param {Object} data - Event data
     */
    handleExecutionResume(data) {
        this.logger.info('TaskProcessor: Execution resumed', {
            taskId: data.taskId,
            userId: data.userId
        });

        // Resume queue processing
        this.resumeQueueProcessing();
    }

    /**
     * Pause queue processing
     */
    pauseQueueProcessing() {
        this.logger.info('TaskProcessor: Pausing queue processing');
        this.isPaused = true;
    }

    /**
     * Resume queue processing
     */
    resumeQueueProcessing() {
        this.logger.info('TaskProcessor: Resuming queue processing');
        this.isPaused = false;
    }

    /**
     * Process execution queue
     */
    async processExecutionQueue() {
        if (!this.taskQueueStore) {
            this.logger.warn('TaskProcessor: No TaskQueueStore available, skipping queue processing');
            return;
        }

        if (this.isPaused) {
            this.logger.debug('TaskProcessor: Queue processing is paused, skipping');
            return;
        }

        try {
            // Get all project queues (TaskQueueStore uses Map, not Object!)
            const projectQueues = this.taskQueueStore.projectQueues;
            
            // Debug: Check TaskQueueStore status
            this.logger.info('TaskProcessor: Debug - TaskQueueStore status', {
                hasTaskQueueStore: !!this.taskQueueStore,
                hasProjectQueues: !!projectQueues,
                projectQueuesType: projectQueues?.constructor?.name || 'undefined',
                projectQueuesSize: projectQueues?.size || 0,
                projectQueuesKeys: projectQueues ? Array.from(projectQueues.keys()) : 'undefined'
            });
            
            if (!projectQueues || projectQueues.size === 0) {
                this.logger.warn('TaskProcessor: No project queues available, skipping queue processing');
                return;
            }
            
            // Count total queued tasks first
            let totalQueuedTasks = 0;
            for (const [projectId, projectQueue] of projectQueues) {
                const queuedTasks = projectQueue.filter(item => 
                    item.status === 'queued' && 
                    item.options?.autoExecute !== false
                );
                totalQueuedTasks += queuedTasks.length;
                
                // Debug: Log each project queue status
                this.logger.info(`TaskProcessor: Debug - Project ${projectId} queue status`, {
                    totalItems: projectQueue.length,
                    queuedItems: queuedTasks.length,
                    items: projectQueue.map(item => ({
                        id: item.id,
                        status: item.status,
                        autoExecute: item.options?.autoExecute
                    }))
                });
            }
            
            // Always log queue processing attempt
            this.logger.info(`TaskProcessor: Processing execution queue - ${totalQueuedTasks} tasks queued`);
            
            for (const [projectId, projectQueue] of projectQueues) {
                // Filter queued tasks that are ready for execution
                const queuedTasks = projectQueue.filter(item => 
                    item.status === 'queued' && 
                    item.options?.autoExecute !== false
                );

                // Check if any tasks are already running
                const runningTasks = projectQueue.filter(item => item.status === 'running');
                let stuckTasks = [];
                
                if (runningTasks.length > 0) {
                    this.logger.info(`TaskProcessor: ${runningTasks.length} tasks already running, checking if they need completion`);
                    
                    // Check if running tasks are actually stuck (running for too long without completion)
                    stuckTasks = runningTasks.filter(task => {
                        const startedAt = new Date(task.startedAt);
                        const now = new Date();
                        const runningTime = now.getTime() - startedAt.getTime();
                        const maxRunningTime = 30 * 1000; // 30 seconds - viel kürzer für Tests
                        
                        return runningTime > maxRunningTime;
                    });
                    
                    if (stuckTasks.length > 0) {
                        this.logger.warn(`TaskProcessor: Found ${stuckTasks.length} stuck running tasks, will attempt to complete them`, {
                            stuckTasks: stuckTasks.map(task => ({
                                id: task.id,
                                startedAt: task.startedAt,
                                runningTime: new Date().getTime() - new Date(task.startedAt).getTime()
                            }))
                        });
                        // Don't continue, let the execution proceed to handle stuck tasks
                    } else {
                        this.logger.info(`TaskProcessor: Running tasks are still within timeout, skipping queue processing`, {
                            runningTasks: runningTasks.map(task => ({
                                id: task.id,
                                startedAt: task.startedAt,
                                runningTime: new Date().getTime() - new Date(task.startedAt).getTime()
                            }))
                        });
                        continue;
                    }
                }

                // Process stuck running tasks first, then queued tasks
                let queueItem = null;
                
                if (stuckTasks && stuckTasks.length > 0) {
                    // Process the first stuck task
                    queueItem = stuckTasks[0];
                    this.logger.info('TaskProcessor: Processing stuck running task', {
                        taskId: queueItem.context?.taskId,
                        queueItemId: queueItem.id,
                        projectId: projectId,
                        runningTime: new Date().getTime() - new Date(queueItem.startedAt).getTime()
                    });
                } else if (queuedTasks.length > 0) {
                    // Process the first queued task
                    queueItem = queuedTasks[0];
                    this.logger.info('TaskProcessor: Processing queued task', {
                        taskId: queueItem.context?.taskId,
                        queueItemId: queueItem.id,
                        projectId: projectId
                    });
                }
                
                if (!queueItem) {
                    continue;
                }

                this.logger.info('TaskProcessor: Found queued task to process', {
                    taskId: queueItem.context?.taskId,
                    queueItemId: queueItem.id,
                    projectId: projectId,
                    currentStatus: queueItem.status
                });

                try {
                    this.logger.info('TaskProcessor: Entering try block');
                    
                    // Update status to running
                    queueItem.status = 'running';
                    queueItem.startedAt = new Date().toISOString();
                    queueItem.updatedAt = new Date().toISOString();

                    this.logger.info('TaskProcessor: Status updated to running');

                    this.logger.info('TaskProcessor: Starting task execution', {
                        taskId: queueItem.context.taskId,
                        queueItemId: queueItem.id,
                        projectId: projectId
                    });

                    // Execute the task using WorkflowExecutor
                    this.logger.info('TaskProcessor: Calling workflowExecutor.run()', {
                        taskId: queueItem.context.taskId,
                        options: queueItem.options,
                        workflowExecutor: !!this.workflowExecutor,
                        workflowExecutorType: this.workflowExecutor?.constructor?.name
                    });
                    
                    if (!this.workflowExecutor) {
                        throw new Error('WorkflowExecutor not available');
                    }
                    
                    // Add activeIDE to options
                    const activeIDE = await this.getActiveIDE();
                    
                    // Resolve projectPath if not available in context
                    let projectPath = queueItem.context.projectPath || queueItem.options.projectPath;
                    if (!projectPath) {
                        this.logger.info('TaskProcessor: projectPath not in context, resolving from database...');
                        projectPath = await this.resolveProjectPath(projectId);
                    }
                    
                    const optionsWithIDE = {
                        ...queueItem.options,
                        ...queueItem.context,
                        activeIDE: activeIDE,
                        projectId: projectId,
                        projectPath: projectPath
                    };
                    
                    // Log the context being passed to workflow
                    this.logger.info('TaskProcessor: Passing context to WorkflowExecutor', {
                        taskId: queueItem.context.taskId,
                        projectId: projectId,
                        activeIDE: activeIDE ? {
                            port: activeIDE.port,
                            type: activeIDE.type,
                            workspace: activeIDE.workspace
                        } : null,
                        hasActiveIDE: !!activeIDE,
                        projectPath: optionsWithIDE.projectPath,
                        hasProjectPath: !!optionsWithIDE.projectPath,
                        queueItemContext: queueItem.context,
                        queueItemOptions: queueItem.options
                    });
                    
                    // MANUALLY LOAD WorkflowLoaderService if not available
                    if (!this.workflowExecutor.workflowLoaderService) {
                        this.logger.warn('TaskProcessor: WorkflowLoaderService not available, loading manually');
                        const WorkflowLoaderService = require('@domain/services/workflow/WorkflowLoaderService');
                        const workflowLoaderService = new WorkflowLoaderService();
                        await workflowLoaderService.loadWorkflows();
                        this.workflowExecutor.workflowLoaderService = workflowLoaderService;
                    }
                    
                    const result = await this.workflowExecutor.run(queueItem.context.taskId, optionsWithIDE);
                    
                    this.logger.info('TaskProcessor: workflowExecutor.run() completed', {
                        taskId: queueItem.context.taskId,
                        result: result
                    });
                    
                    // Update status to completed
                    queueItem.status = 'completed';
                    queueItem.completedAt = new Date().toISOString();
                    queueItem.result = result;
                    queueItem.updatedAt = new Date().toISOString();
                    
                    this.logger.info('TaskProcessor: Task completed successfully', {
                        taskId: queueItem.context.taskId,
                        queueItemId: queueItem.id,
                        status: queueItem.status
                    });
                    
                    // Update the queue item in the store
                    await this.taskQueueStore.updateQueueItem(projectId, queueItem.id, {
                        status: 'completed',
                        completedAt: queueItem.completedAt,
                        result: result
                    });
                    
                } catch (error) {
                    this.logger.error('TaskProcessor: Failed to execute queued task', {
                        taskId: queueItem.context.taskId,
                        queueItemId: queueItem.id,
                        projectId: projectId,
                        error: error.message
                    });
                    
                    // Update status to failed
                    queueItem.status = 'failed';
                    queueItem.error = error.message;
                    queueItem.completedAt = new Date().toISOString();
                    queueItem.updatedAt = new Date().toISOString();
                    
                    // Update the queue item in the store
                    await this.taskQueueStore.updateQueueItem(projectId, queueItem.id, {
                        status: 'failed',
                        completedAt: queueItem.completedAt,
                        error: error.message
                    });
                }
            }
        } catch (error) {
            this.logger.error('TaskProcessor: Error processing execution queue', {
                error: error.message
            });
        }
    }

    /**
     * Resolve project path from database
     * @param {string} projectId - Project ID
     * @returns {Promise<string>} Project workspace path
     */
    async resolveProjectPath(projectId) {
        try {
            // Try to get project path from database via projectRepository
            if (this.taskQueueStore && this.taskQueueStore.projectRepository) {
                const project = await this.taskQueueStore.projectRepository.findById(projectId);
                if (project && project.workspacePath) {
                    this.logger.info(`TaskProcessor: Found project path in database: ${project.workspacePath}`);
                    return project.workspacePath;
                }
            }
            
            // Fallback to current working directory
            const fallbackPath = process.cwd();
            this.logger.warn(`TaskProcessor: Using fallback project path: ${fallbackPath}`);
            return fallbackPath;
            
        } catch (error) {
            this.logger.error('TaskProcessor: Failed to resolve project path:', error);
            // Fallback to current working directory
            const fallbackPath = process.cwd();
            this.logger.warn(`TaskProcessor: Using fallback project path after error: ${fallbackPath}`);
            return fallbackPath;
        }
    }

    /**
     * Start queue processor
     */
    startQueueProcessor() {
        this.logger.info('TaskProcessor: Starting queue processor');
        
        // Setup event listeners for immediate processing
        this.setupEventListeners();
    }
}

module.exports = TaskProcessor;
