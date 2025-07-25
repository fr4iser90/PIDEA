
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
    constructor(taskApplicationService, eventBus = null) {
        this.taskApplicationService = taskApplicationService;
        this.eventBus = eventBus;
        this.logger = logger;
        
        // DEBUG: Check what methods taskApplicationService has
        this.logger.info('🔍 [TaskController] taskApplicationService methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.taskApplicationService)));
        this.logger.info('🔍 [TaskController] syncManualTasks exists:', typeof this.taskApplicationService.syncManualTasks);
        this.logger.info('🔍 [TaskController] taskApplicationService type:', typeof this.taskApplicationService);
        this.logger.info('🔍 [TaskController] taskApplicationService constructor:', this.taskApplicationService.constructor.name);
        this.logger.info('🔍 [TaskController] taskApplicationService keys:', Object.keys(this.taskApplicationService));
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
     * POST /api/projects/:projectId/tasks/:id/execute - Execute task within project
     */
    async executeTask(req, res) {
        try {
            const { projectId, id } = req.params;
            const userId = req.user.id;
            const options = req.body.options || {};

            this.logger.info('🚀 [TaskController] executeTask called with Categories system:', { 
                projectId, 
                id, 
                userId,
                options 
            });

            // Use Application Service for task execution
            const execution = await this.taskApplicationService.executeTask(id, projectId, userId, options);

            this.logger.info('✅ [TaskController] Task execution completed successfully');

            res.json({
                success: true,
                data: execution,
                projectId,
                taskId: id,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error('❌ [TaskController] Task execution failed:', error);
            if (error.message.includes('not found') || error.message.includes('does not belong')) {
                res.status(404).json({
                    success: false,
                    error: 'Task not found',
                    message: error.message
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Task execution failed',
                    message: error.message
                });
            }
        }
    }

    /**
     * POST /api/projects/:projectId/tasks/sync-manual - Sync manual tasks using workspace
     */
    async syncManualTasks(req, res) {
        try {
            const { projectId } = req.params;
            const userId = req.user.id;

            this.logger.info('🔄 [TaskController] syncManualTasks called');

            // Use Application Service for manual tasks sync
            const result = await this.taskApplicationService.syncManualTasks(projectId, userId);

            this.logger.info('✅ [TaskController] Manual tasks sync completed successfully');

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
}

module.exports = TaskController; 