
/**
 * TaskController - Handles project-based task management
 * 
 * LAYER COMPLIANCE FIXED:
 * ✅ Uses TaskApplicationService (Application layer)
 * ✅ No direct repository or domain service access
 * ✅ Proper DDD layer separation maintained
 */
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const TaskPriority = require('@value-objects/TaskPriority');
const TaskType = require('@value-objects/TaskType');
const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('TaskController');

class TaskController {
    constructor(taskApplicationService, eventBus = null, application = null) {
        this.taskApplicationService = taskApplicationService;
        this.eventBus = eventBus;
        this.application = application; // Add application for IDE/Git services
        this.logger = logger;
        
        // DEBUG: Check what methods taskApplicationService has
        this.logger.debug('🔍 [TaskController] taskApplicationService methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.taskApplicationService)));
        this.logger.debug('🔍 [TaskController] syncManualTasks exists:', typeof this.taskApplicationService.syncManualTasks);
        this.logger.debug('🔍 [TaskController] taskApplicationService type:', typeof this.taskApplicationService);
        this.logger.debug('🔍 [TaskController] taskApplicationService constructor:', this.taskApplicationService.constructor.name);
        this.logger.debug('🔍 [TaskController] taskApplicationService keys:', Object.keys(this.taskApplicationService));
    }

    /**
     * GET /api/projects/:projectId/tasks - Get all tasks for project
     */
    async getProjectTasks(req, res) {
        try {
            const { projectId } = req.params;
            const { limit, offset, status, priority, type } = req.query;
            
            // // // this.logger.info(`Getting tasks for project: ${projectId}`);
            
            // Use Application Service for tasks
            const tasks = await this.taskApplicationService.getProjectTasks(projectId, {
                limit: limit ? parseInt(limit) : undefined,
                offset: offset ? parseInt(offset) : undefined,
                status,
                priority,
                type
            });
            
            res.json({
                success: true,
                data: tasks,
                projectId,
                count: tasks.length,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            this.logger.error('❌ Failed to get project tasks:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get project tasks',
                message: error.message
            });
        }
    }

    /**
     * GET /api/projects/:projectId/tasks/:id - Get task by ID
     */
    async getTask(req, res) {
        try {
            const { projectId, id } = req.params;
            
            this.logger.info(`Getting task: ${id} for project: ${projectId}`);
            
            // Use Application Service for task retrieval
            const task = await this.taskApplicationService.getTask(id, projectId);
            
            res.json({
                success: true,
                data: task,
                projectId,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            this.logger.error('❌ Failed to get task:', error);
            if (error.message.includes('not found') || error.message.includes('does not belong')) {
                res.status(404).json({
                    success: false,
                    error: 'Task not found',
                    message: error.message
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Failed to get task',
                    message: error.message
                });
            }
        }
    }

    /**
     * GET /api/projects/:projectId/tasks?type=documentation - Get docs tasks
     * Reuses existing getProjectTasks with type=documentation filter
     */
    // REMOVED: getDocsTasks method - using generic /tasks routes instead

    // REMOVED: getDocsTaskDetails method - using generic /tasks routes instead

    /**
     * POST /api/projects/:projectId/tasks - Create new task
     */
    async createTask(req, res) {
        try {
            const { projectId } = req.params;
            const userId = req.user.id;
            const { title, description, priority, type, metadata } = req.body;
            
            this.logger.info(`Creating task for project: ${projectId}`);
            
            // Use Application Service for task creation
            const task = await this.taskApplicationService.createTask({
                title,
                description,
                priority,
                type,
                metadata
            }, projectId, userId);
            
            res.status(201).json({
                success: true,
                data: task,
                projectId,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            this.logger.error('❌ Failed to create task:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create task',
                message: error.message
            });
        }
    }

    /**
     * PUT /api/projects/:projectId/tasks/:id - Update task
     */
    async updateTask(req, res) {
        try {
            const { projectId, id } = req.params;
            const userId = req.user.id;
            const updateData = req.body;
            
            this.logger.info(`Updating task: ${id} for project: ${projectId}`);
            
            // Use Application Service for task update
            const task = await this.taskApplicationService.updateTask(id, projectId, updateData, userId);
            
            res.json({
                success: true,
                data: task,
                projectId,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            this.logger.error('❌ Failed to update task:', error);
            if (error.message.includes('not found') || error.message.includes('does not belong')) {
                res.status(404).json({
                    success: false,
                    error: 'Task not found',
                    message: error.message
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Failed to update task',
                    message: error.message
                });
            }
        }
    }

    /**
     * DELETE /api/projects/:projectId/tasks/:id - Delete task
     */
    async deleteTask(req, res) {
        try {
            const { projectId, id } = req.params;
            const userId = req.user.id;
            
            this.logger.info(`Deleting task: ${id} for project: ${projectId}`);
            
            // Use Application Service for task deletion
            await this.taskApplicationService.deleteTask(id, projectId, userId);
            
            res.json({
                success: true,
                message: 'Task deleted successfully',
                projectId,
                taskId: id,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            this.logger.error('❌ Failed to delete task:', error);
            if (error.message.includes('not found') || error.message.includes('does not belong')) {
                res.status(404).json({
                    success: false,
                    error: 'Task not found',
                    message: error.message
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Failed to delete task',
                    message: error.message
                });
            }
        }
    }

    /**
     * POST /api/projects/:projectId/tasks/:id/execute - Queue task for execution within project
     * 
     * @deprecated This endpoint is deprecated. Use TaskController.enqueueTask() instead.
     * @deprecated This endpoint will be removed in a future version.
     * @deprecated Use POST /api/projects/:projectId/tasks/enqueue for proper queue-based execution.
     */
    async executeTask(req, res) {
        try {
            // Log deprecation warning
            this.logger.warn('🚨 [TaskController] executeTask endpoint is DEPRECATED! Redirecting to enqueueTask');
            
            // Transform the request to match enqueueTask format
            const { projectId, id } = req.params;
            const userId = req.user.id;
            const options = req.body.options || {};

            // Create a new request object for enqueueTask
            const enqueueReq = {
                params: { projectId },
                body: {
                    task: { id },
                    taskId: id,
                    ...req.body,
                    options
                },
                user: req.user
            };

            // Redirect to the new enqueueTask method
            return await this.enqueueTask(enqueueReq, res);

        } catch (error) {
            this.logger.error('❌ [TaskController] Task execution failed:', error);
            if (error.message.includes('not found') || error.message.includes('does not belong')) {
                res.status(404).json({
                    success: false,
                    error: 'Task not found',
                    message: error.message,
                    deprecationWarning: 'This endpoint is deprecated. Use /api/projects/:projectId/tasks/enqueue instead.'
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Task execution failed',
                    message: error.message,
                    deprecationWarning: 'This endpoint is deprecated. Use /api/projects/:projectId/tasks/enqueue instead.'
                });
            }
        }
    }

    /**
     * POST /api/projects/:projectId/tasks/sync-manual - Sync manual tasks using workspace
     * Now includes TaskStatusSyncStep integration for validation and status sync
     */
    async syncManualTasks(req, res) {
        try {
            const { projectId } = req.params;
            const userId = req.user.id;

            this.logger.info('🔄 [TaskController] syncManualTasks called');

            // Use Application Service for manual tasks sync
            const result = await this.taskApplicationService.syncManualTasks(projectId, userId);

            this.logger.info('✅ [TaskController] Manual tasks sync completed successfully');

            // 🆕 NEW: Integrate TaskStatusSyncStep for status validation and sync
            try {
                const TaskStatusSyncStep = require('@domain/steps/categories/task/task_status_sync_step');
                const syncStep = new TaskStatusSyncStep();

                // Get all tasks for the project to validate their statuses
                const allTasks = await this.taskApplicationService.taskRepository.findByProjectId(projectId);
                
                if (allTasks && allTasks.length > 0) {
                    // Extract task IDs
                    const taskIds = allTasks.map(task => task.id);
                    
                    // Create context for TaskStatusSyncStep
                    const context = {
                        getService: (serviceName) => {
                            // Get services from application service
                            const serviceMap = {
                                'taskRepository': this.taskApplicationService.taskRepository,
                                'statusTransitionService': this.taskApplicationService.taskService?.statusTransitionService,
                                'eventBus': this.eventBus
                            };
                            return serviceMap[serviceName];
                        }
                    };

                    // Validate all task statuses
                    const validationResult = await syncStep.execute(context, {
                        operation: 'validate',
                        taskIds,
                        targetStatus: 'pending' // Default validation
                    });

                    this.logger.info('🔍 [TaskController] Task status validation completed', {
                        projectId,
                        totalTasks: validationResult.totalTasks,
                        validTasks: validationResult.validTasks,
                        invalidTasks: validationResult.invalidTasks
                    });

                    // Add validation result to sync result
                    result.statusValidation = validationResult;

                    // If there are invalid statuses, log them
                    if (validationResult.invalidTasks > 0) {
                        const invalidTasks = validationResult.results.filter(r => !r.valid);
                        this.logger.warn('⚠️ [TaskController] Found invalid task statuses:', {
                            projectId,
                            invalidTasks: invalidTasks.map(t => ({
                                taskId: t.taskId,
                                currentStatus: t.currentStatus,
                                targetStatus: t.targetStatus,
                                error: t.error
                            }))
                        });
                    }
                }
            } catch (syncError) {
                // Don't fail the main sync if status validation fails
                this.logger.warn('⚠️ [TaskController] Task status validation failed (non-critical):', syncError);
            }

            // Emit WebSocket event to notify frontend about task sync
            if (this.eventBus) {
                this.eventBus.emit('task:sync:completed', {
                    projectId,
                    userId,
                    result,
                    timestamp: new Date().toISOString()
                });
                this.logger.info('📡 [TaskController] Emitted task:sync:completed event');
            }

            res.json({
                success: true,
                data: result,
                projectId,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error('❌ [TaskController] Failed to sync manual tasks:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to sync manual tasks',
                message: error.message
            });
        }
    }

    /**
     * POST /api/projects/:projectId/tasks/clean-manual - Clean manual tasks from database
     */
    async cleanManualTasks(req, res) {
        try {
            const { projectId } = req.params;
            const userId = req.user.id;

            this.logger.info(`🧹 [TaskController] cleanManualTasks called for project: ${projectId}`);

            // Use Application Service for manual tasks cleanup
            const result = await this.taskApplicationService.cleanManualTasks(projectId, userId);

            this.logger.info('✅ [TaskController] Manual tasks cleanup completed successfully');

            res.json({
                success: true,
                data: result,
                projectId,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error('❌ [TaskController] Failed to clean manual tasks:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to clean manual tasks',
                message: error.message
            });
        }
    }

    /**
     * POST /api/projects/:projectId/tasks/analyze - Analyze project for task suggestions
     */
    async analyzeProjectForTasks(req, res) {
        try {
            const { projectId } = req.params;
            const options = req.body || {};

            this.logger.info('🔍 [TaskController] analyzeProjectForTasks called');

            // Use Application Service for project analysis
            const result = await this.taskApplicationService.analyzeProjectForTasks(projectId, options);

            this.logger.info('✅ [TaskController] Project analysis completed successfully');

            res.json({
                success: true,
                data: result,
                projectId,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error('❌ [TaskController] Failed to analyze project for tasks:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to analyze project for tasks',
                message: error.message
            });
        }
    }

    /**
     * GET /api/tasks/health - Get controller health status
     */
    async getHealth(req, res) {
        try {
            const health = {
                status: 'healthy',
                controller: 'TaskController',
                services: {
                    taskApplicationService: !!this.taskApplicationService
                },
                architecture: 'DDD-compliant',
                layerCompliance: 'Uses Application Service layer',
                timestamp: new Date().toISOString()
            };

            res.json({
                success: true,
                data: health
            });

        } catch (error) {
            this.logger.error('❌ Health check failed:', error);
            res.status(500).json({
                success: false,
                error: 'Health check failed',
                message: error.message
            });
        }
    }
    /**
     * POST /api/tasks/sync-status - Synchronize task status between markdown and database
     */
    async syncTaskStatus(req, res) {
        try {
            const { taskId } = req.body;
            
            if (!taskId) {
                return res.status(400).json({
                    success: false,
                    error: 'Task ID is required'
                });
            }

            this.logger.info(`Syncing task status for task: ${taskId}`);

            // Use Application Service for status synchronization
            const result = await this.taskApplicationService.syncTaskStatus(taskId);

            res.json({
                success: true,
                data: result,
                message: 'Task status synchronized successfully'
            });

        } catch (error) {
            this.logger.error('❌ Failed to sync task status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to sync task status',
                message: error.message
            });
        }
    }

    /**
     * POST /api/tasks/validate-consistency - Validate task status consistency
     */
    async validateTaskConsistency(req, res) {
        try {
            const { taskId, autoFix = false } = req.body;
            
            if (!taskId) {
                return res.status(400).json({
                    success: false,
                    error: 'Task ID is required'
                });
            }

            this.logger.info(`Validating task consistency for task: ${taskId}`);

            // Use Application Service for consistency validation
            const result = await this.taskApplicationService.validateTaskConsistency(taskId, { autoFix });

            res.json({
                success: true,
                data: result,
                message: 'Task consistency validation completed'
            });

        } catch (error) {
            this.logger.error('❌ Failed to validate task consistency:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to validate task consistency',
                message: error.message
            });
        }
    }

    /**
     * GET /api/tasks/validation-statistics - Get validation statistics for all tasks
     */
    async getValidationStatistics(req, res) {
        try {
            const { projectId, category } = req.query;

            this.logger.info('Getting validation statistics');

            // Use Application Service for validation statistics
            const stats = await this.taskApplicationService.getValidationStatistics({
                projectId,
                category
            });

            res.json({
                success: true,
                data: stats,
                message: 'Validation statistics retrieved successfully'
            });

        } catch (error) {
            this.logger.error('❌ Failed to get validation statistics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get validation statistics',
                message: error.message
            });
        }
    }

    /**
     * POST /api/tasks/batch-sync - Synchronize multiple tasks
     */
    async batchSyncTasks(req, res) {
        try {
            const { taskIds, autoFix = false } = req.body;
            
            if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Task IDs array is required'
                });
            }

            this.logger.info(`Batch syncing ${taskIds.length} tasks`);

            // Use Application Service for batch synchronization
            const result = await this.taskApplicationService.batchSyncTasks(taskIds, { autoFix });

            res.json({
                success: true,
                data: result,
                message: `Batch synchronization completed for ${taskIds.length} tasks`
            });

        } catch (error) {
            this.logger.error('❌ Failed to batch sync tasks:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to batch sync tasks',
                message: error.message
            });
        }
    }

    /**
     * Enqueue task for execution
     * POST /api/projects/:projectId/tasks/enqueue
     * 
     * This method handles task execution requests, including:
     * - Single task execution
     * - Bulk task review
     * - Analysis workflows
     * - IDE integration (New Chat, Git branches)
     */
    async enqueueTask(req, res) {
        try {
            const { projectId } = req.params;
            const {
                workflow,
                options = {},
                autoExecute = true,
                task,
                createGitBranch = false,
                branchName,
                clickNewChat = false
            } = req.body;

            this.logger.info('TaskController: Received task execution request', {
                projectId,
                workflow,
                taskId: task?.id,
                createGitBranch,
                branchName,
                clickNewChat
            });

            const userId = req.user?.id;

            // Handle task execution requests
            if (req.body.taskId || (task && task.id)) {
                const taskId = req.body.taskId || task.id;
                
                this.logger.info('TaskController: Processing task execution', {
                    taskId,
                    createGitBranch,
                    branchName,
                    clickNewChat
                });

                // Create Git branch if requested
                if (createGitBranch && branchName) {
                    try {
                        const gitService = this.application?.gitService;
                        if (gitService) {
                            // Let TaskApplicationService handle the workspace path
                            await gitService.createBranch(null, branchName); // projectId will be resolved internally
                            this.logger.info('TaskController: Git branch created', {
                                branchName
                            });
                        }
                    } catch (error) {
                        this.logger.error('TaskController: Failed to create Git branch', {
                            error: error.message,
                            branchName
                        });
                    }
                }

                // Click new chat if requested
                if (clickNewChat) {
                    try {
                        this.logger.info('TaskController: Starting New Chat click process');
                        
                        const ideManager = this.application?.ideManager;
                        if (ideManager) {
                            const activeIDE = await ideManager.getActiveIDE();
                            this.logger.info('TaskController: Active IDE found', {
                                hasActiveIDE: !!activeIDE,
                                port: activeIDE?.port
                            });
                            
                            if (activeIDE && activeIDE.port) {
                                // Use CreateChatCommand with proper handler execution
                                const CreateChatCommand = require('@categories/ide/CreateChatCommand');
                                const CreateChatHandler = require('@application/handlers/categories/ide/CreateChatHandler');
                                
                                const createChatCommand = new CreateChatCommand({
                                    userId: userId,
                                    title: 'New Chat',
                                    clickNewChat: true,
                                    metadata: { port: activeIDE.port }
                                });
                                
                                // Create handler with all required dependencies
                                const createChatHandler = new CreateChatHandler({
                                    chatSessionService: this.application?.chatSessionService || this.application?.getChatHistoryHandler,
                                    ideManager: ideManager,
                                    browserManager: this.application?.browserManager,
                                    eventBus: this.eventBus,
                                    logger: this.logger
                                });
                                
                                this.logger.info('TaskController: Creating new chat with timeout');
                                // Add timeout to prevent hanging
                                const clickPromise = createChatHandler.handle(createChatCommand, {}, activeIDE.port);
                                const timeoutPromise = new Promise((_, reject) => 
                                    setTimeout(() => reject(new Error('New Chat creation timeout')), 10000)
                                );
                                
                                const result = await Promise.race([clickPromise, timeoutPromise]);
                                
                                if (result && result.success) {
                                    this.logger.info('TaskController: New chat created successfully', {
                                        port: activeIDE.port,
                                        sessionId: result.session?.id
                                    });
                                } else {
                                    throw new Error('Failed to create new chat');
                                }
                            } else {
                                this.logger.warn('TaskController: No active IDE found for New Chat');
                            }
                        }
                    } catch (error) {
                        this.logger.error('TaskController: Failed to click new chat', {
                            error: error.message,
                            stack: error.stack
                        });
                    }
                }
                
                this.logger.info('TaskController: New Chat process completed, proceeding to task execution');

                    // Queue the task for execution using TaskApplicationService
                    try {
                        const taskResult = await this.taskApplicationService.executeTask(taskId, projectId, userId, {
                            createGitBranch,
                            branchName,
                            clickNewChat,
                            autoExecute
                        });
                    
                    this.logger.info('TaskController: Task queued successfully', {
                        taskId,
                        queueItemId: taskResult.queueItemId
                    });

                    res.json({
                        success: true,
                        message: 'Task queued for execution successfully',
                        data: {
                            taskId,
                            result: taskResult,
                            gitBranch: createGitBranch ? branchName : null,
                            newChat: clickNewChat
                        }
                    });
                    return;
                } catch (error) {
                    this.logger.error('TaskController: Failed to queue task', {
                        error: error.message,
                        taskId,
                        stack: error.stack
                    });
                    
                    res.status(500).json({
                        success: false,
                        error: 'Failed to queue task for execution',
                        message: error.message
                    });
                    return;
                }
            }

            // Handle bulk task check-state
            if (workflow === 'task-check-state-workflow') {
                try {
                    const tasks = req.body.tasks || [];
                    
                    this.logger.info('TaskController: Starting bulk task check-state', {
                        taskCount: tasks.length,
                        projectId,
                        userId
                    });
                    
                    if (!tasks || tasks.length === 0) {
                        throw new Error('No tasks provided for check-state');
                    }
                    
                    // Add all tasks to queue for proper management
                    const queueResults = [];
                    
                    for (let i = 0; i < tasks.length; i++) {
                        const task = tasks[i];
                        
                        try {
                            this.logger.info(`TaskController: Adding task ${i + 1}/${tasks.length} to check-state queue`, {
                                taskId: task.id,
                                taskTitle: task.title || task.name,
                                projectId,
                                userId
                            });
                            
                            // Queue task for execution using TaskApplicationService
                            const queueResult = await this.taskApplicationService.executeTask(task.id, projectId, userId, {
                                priority: 'normal',
                                taskMode: 'task-check-state',
                                autoExecute: true,
                                createGitBranch: false,
                                workflow: 'task-check-state-workflow'
                            });
                            
                            queueResults.push({
                                    taskId: task.id,
                                    taskTitle: task.title || task.name,
                                    success: true,
                                    queueItemId: queueResult.queueItemId,
                                    status: queueResult.status,
                                    position: queueResult.position,
                                    estimatedStartTime: queueResult.estimatedStartTime,
                                    index: i + 1
                                });
                                
                                this.logger.info(`TaskController: Task ${i + 1} added to check-state queue`, {
                                    taskId: task.id,
                                    queueItemId: queueResult.queueItemId,
                                    position: queueResult.position
                                });
                            
                        } catch (error) {
                            this.logger.error(`TaskController: Failed to add task ${i + 1} to check-state queue`, {
                                taskId: task.id,
                                error: error.message,
                                projectId,
                                userId
                            });
                            
                            queueResults.push({
                                taskId: task.id,
                                taskTitle: task.title || task.name,
                                success: false,
                                error: error.message,
                                index: i + 1
                            });
                        }
                    }
                    
                    const results = queueResults;
                    const successCount = results.filter(r => r.success).length;
                    const totalCount = results.length;
                    
                    this.logger.info('TaskController: Task check-state workflow completed', {
                        totalTasks: totalCount,
                        successfulTasks: successCount,
                        failedTasks: totalCount - successCount,
                        projectId,
                        userId
                    });
                    
                    return res.status(200).json({
                        success: successCount > 0,
                        message: `Task check-state completed: ${successCount}/${totalCount} tasks processed successfully`,
                        data: {
                            results,
                            summary: {
                                totalTasks: totalCount,
                                completedTasks: successCount,
                                failedTasks: totalCount - successCount,
                                workflowPrompt: 'task-check-state.md'
                            }
                        }
                    });
                    
                } catch (error) {
                    this.logger.error('TaskController: Failed to execute task check-state workflow', {
                        error: error.message,
                        projectId,
                        userId
                    });
                    
                    return res.status(500).json({
                        success: false,
                        error: `Task check-state workflow failed: ${error.message}`
                    });
                }
            }

            // Handle bulk task review
            if (workflow === 'task-review-workflow') {
                try {
                    const tasks = req.body.tasks || [];
                    
                    this.logger.info('TaskController: Starting bulk task review', {
                        taskCount: tasks.length,
                        projectId,
                        userId
                    });
                    
                    if (!tasks || tasks.length === 0) {
                        throw new Error('No tasks provided for review');
                    }
                    
                    // Add all tasks to queue for proper management
                    const queueResults = [];
                    
                    for (let i = 0; i < tasks.length; i++) {
                        const task = tasks[i];
                        
                        try {
                            this.logger.info(`TaskController: Adding task ${i + 1}/${tasks.length} to review queue`, {
                                taskId: task.id,
                                taskTitle: task.title || task.name,
                                projectId,
                                userId
                            });
                            
                                // Queue task for execution using TaskApplicationService
                                const queueResult = await this.taskApplicationService.executeTask(task.id, projectId, userId, {
                                    priority: 'normal',
                                    taskMode: 'task-review',
                                    autoExecute: true,
                                    createGitBranch: false,
                                    workflow: 'task-review-workflow'
                                });
                            
                            queueResults.push({
                                taskId: task.id,
                                taskTitle: task.title || task.name,
                                success: true,
                                queueItemId: queueResult.queueItemId,
                                status: queueResult.status,
                                position: queueResult.position,
                                estimatedStartTime: queueResult.estimatedStartTime,
                                index: i + 1
                            });
                            
                            this.logger.info(`TaskController: Task ${i + 1} added to review queue`, {
                                taskId: task.id,
                                queueItemId: queueResult.queueItemId,
                                position: queueResult.position
                            });
                            
                        } catch (error) {
                            this.logger.error(`TaskController: Failed to add task ${i + 1} to queue`, {
                                taskId: task.id,
                                error: error.message,
                                projectId,
                                userId
                            });
                            
                            queueResults.push({
                                taskId: task.id,
                                taskTitle: task.title || task.name,
                                success: false,
                                error: error.message,
                                index: i + 1
                            });
                        }
                    }
                    
                    const successCount = queueResults.filter(r => r.success).length;
                    const totalCount = queueResults.length;
                    
                    this.logger.info('TaskController: Bulk task review completed', {
                        totalTasks: totalCount,
                        successfulTasks: successCount,
                        failedTasks: totalCount - successCount,
                        projectId,
                        userId
                    });
                    
                    return res.status(200).json({
                        success: successCount > 0,
                        message: `Bulk task review completed: ${successCount}/${totalCount} tasks processed successfully`,
                        data: {
                            results: queueResults,
                            summary: {
                                totalTasks: totalCount,
                                completedTasks: successCount,
                                failedTasks: totalCount - successCount,
                                workflowPrompt: 'task-check-state.md'
                            }
                        }
                    });
                    
                } catch (error) {
                    this.logger.error('TaskController: Bulk task review failed', {
                        error: error.message,
                        projectId,
                        userId
                    });
                    
                    return res.status(500).json({
                        success: false,
                        error: `Bulk task review failed: ${error.message}`
                    });
                }
            }

            // Handle task creation workflow
            if (workflow === 'task-create-workflow') {
                try {
                    const taskData = req.body.task || {};
                    const creationOptions = req.body.options || {};
                    
                    this.logger.info('TaskController: Starting task creation workflow', {
                        taskTitle: taskData.title,
                        creationMode: creationOptions.creationMode || 'normal',
                        projectId,
                        userId
                    });
                    
                    // In normal mode, title can be empty as AI will generate it
                    // In advanced mode, title is required
                    if (creationOptions.creationMode === 'advanced' && !taskData.title) {
                        throw new Error('Task title is required for advanced task creation');
                    }
                    
                    // Create a real task entry in the database with temporary title
                    // The AI will update the title during workflow execution
                    const createdTask = await this.taskApplicationService.createTask({
                        title: taskData.title || 'New Task', // Will be updated by AI
                        description: taskData.description || '',
                        type: taskData.type || 'feature',
                        priority: taskData.priority || 'medium',
                        estimatedHours: taskData.estimatedHours || 1,
                        category: taskData.category || 'general',
                        metadata: {
                            creationMode: creationOptions.creationMode || 'normal',
                            originalDescription: taskData.description,
                            status: 'pending_ai_creation' // Special status for AI to process
                        }
                    }, projectId, userId);
                    
                    this.logger.info('TaskController: Task created successfully', {
                        taskId: createdTask.id,
                        taskTitle: createdTask.title,
                        projectId,
                        userId
                    });
                    
                    // If autoExecute is enabled, queue the task for execution
                    if (creationOptions.autoExecute !== false) {
                        try {
                            const queueResult = await this.taskApplicationService.executeTask(createdTask.id, projectId, userId, {
                                priority: taskData.priority || 'medium',
                                taskMode: 'task-create',
                                autoExecute: true,
                                createGitBranch: creationOptions.createGitBranch || false,
                                workflow: 'task-create-workflow',
                                creationMode: creationOptions.creationMode || 'normal'
                            });
                            
                            this.logger.info('TaskController: Task queued for execution', {
                                taskId: createdTask.id,
                                queueItemId: queueResult.queueItemId,
                                position: queueResult.position
                            });
                            
                            return res.status(200).json({
                                success: true,
                                message: 'Task created and queued for execution successfully',
                                data: {
                                    task: createdTask,
                                    workflowId: createdTask.id,
                                    queueItemId: queueResult.queueItemId,
                                    status: queueResult.status,
                                    position: queueResult.position,
                                    estimatedStartTime: queueResult.estimatedStartTime,
                                    taskMode: 'task-create',
                                    creationMode: creationOptions.creationMode || 'normal'
                                }
                            });
                            
                        } catch (queueError) {
                            this.logger.error('TaskController: Failed to queue created task', {
                                taskId: createdTask.id,
                                error: queueError.message,
                                projectId,
                                userId
                            });
                            
                            // Task was created but failed to queue - return partial success
                            return res.status(200).json({
                                success: true,
                                message: 'Task created successfully but failed to queue for execution',
                                data: {
                                    task: createdTask,
                                    workflowId: createdTask.id,
                                    queueItemId: null,
                                    status: 'created',
                                    position: null,
                                    estimatedStartTime: null,
                                    taskMode: 'task-create',
                                    creationMode: creationOptions.creationMode || 'normal',
                                    warning: 'Task created but not queued for execution'
                                }
                            });
                        }
                    } else {
                        // Task created but not queued for execution
                        return res.status(200).json({
                            success: true,
                            message: 'Task created successfully',
                            data: {
                                task: createdTask,
                                workflowId: createdTask.id,
                                queueItemId: null,
                                status: 'created',
                                position: null,
                                estimatedStartTime: null,
                                taskMode: 'task-create',
                                creationMode: creationOptions.creationMode || 'normal'
                            }
                        });
                    }
                    
                } catch (error) {
                    this.logger.error('TaskController: Task creation workflow failed', {
                        error: error.message,
                        projectId,
                        userId
                    });
                    
                    return res.status(500).json({
                        success: false,
                        error: `Task creation workflow failed: ${error.message}`
                    });
                }
            }

            // For other workflows, return not implemented
            res.status(501).json({
                success: false,
                error: 'Workflow not implemented',
                message: `Workflow '${workflow}' is not yet implemented in TaskController`
            });

        } catch (error) {
            this.logger.error('TaskController: Failed to enqueue task', {
                projectId: req.params.projectId,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to enqueue task',
                message: error.message
            });
        }
    }
}

module.exports = TaskController;