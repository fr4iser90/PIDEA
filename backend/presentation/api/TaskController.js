/**
 * TaskController - Handles project-based task management
 */
class TaskController {
    constructor(taskService, taskRepository, aiService, projectAnalyzer) {
        this.taskService = taskService;
        this.taskRepository = taskRepository;
        this.aiService = aiService;
        this.projectAnalyzer = projectAnalyzer;
    }

    // Create task for a specific project
    async createTask(req, res) {
        try {
            const { projectId } = req.params;
            const { title, description, priority, type, metadata } = req.body;
            const userId = req.user.id;

            console.log('🔍 [TaskController] Creating task:', {
                projectId,
                title,
                description,
                priority,
                type,
                userId
            });

            const task = await this.taskService.createTask(projectId, title, description, priority, type, {
                ...metadata,
                createdBy: userId
            });

            console.log('✅ [TaskController] Task created successfully:', task);

            res.status(201).json({
                success: true,
                data: task
            });
        } catch (error) {
            console.error('❌ [TaskController] Failed to create task:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    // Get all tasks for a specific project
    async getTasks(req, res) {
        try {
            const { projectId } = req.params;
            const { status, priority, type } = req.query;
            const userId = req.user.id;

            const tasks = await this.taskRepository.findByProject(projectId, {
                status,
                priority,
                type
            });

            res.json({
                success: true,
                data: tasks
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Get specific task by ID within a project
    async getTaskById(req, res) {
        try {
            const { projectId, id } = req.params;
            const userId = req.user.id;

            const task = await this.taskRepository.findById(id);
            
            if (!task || !task.belongsToProject(projectId)) {
                return res.status(404).json({
                    success: false,
                    error: 'Task not found'
                });
            }

            res.json({
                success: true,
                data: task
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Update task within a project
    async updateTask(req, res) {
        try {
            const { projectId, id } = req.params;
            const updates = req.body;
            const userId = req.user.id;

            const task = await this.taskRepository.findById(id);
            
            if (!task || !task.belongsToProject(projectId)) {
                return res.status(404).json({
                    success: false,
                    error: 'Task not found'
                });
            }

            const updatedTask = await this.taskService.updateTask(id, updates);

            res.json({
                success: true,
                data: updatedTask
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    // Delete task within a project
    async deleteTask(req, res) {
        try {
            const { projectId, id } = req.params;
            const userId = req.user.id;

            const task = await this.taskRepository.findById(id);
            
            if (!task || !task.belongsToProject(projectId)) {
                return res.status(404).json({
                    success: false,
                    error: 'Task not found'
                });
            }

            await this.taskRepository.delete(id);

            res.json({
                success: true,
                message: 'Task deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Execute task within a project
    async executeTask(req, res) {
        try {
            const { projectId, id } = req.params;
            const userId = req.user.id;

            console.log('🔍 [TaskController] executeTask called:', { projectId, id, userId });

            const task = await this.taskRepository.findById(id);
            
            if (!task || !task.belongsToProject(projectId)) {
                console.log('❌ [TaskController] Task not found or does not belong to project');
                return res.status(404).json({
                    success: false,
                    error: 'Task not found'
                });
            }

            console.log('🔍 [TaskController] Found task, executing...');

            const execution = await this.taskService.executeTask(id, userId);

            console.log('✅ [TaskController] Task execution started:', execution);

            res.json({
                success: true,
                data: execution
            });
        } catch (error) {
            console.error('❌ [TaskController] Error executing task:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Get task execution status
    async getTaskExecution(req, res) {
        try {
            const { projectId, id } = req.params;
            const userId = req.user.id;

            const task = await this.taskRepository.findById(id);
            
            if (!task || !task.belongsToProject(projectId)) {
                return res.status(404).json({
                    success: false,
                    error: 'Task not found'
                });
            }

            const execution = await this.taskService.getTaskExecution(id);

            res.json({
                success: true,
                data: execution
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Cancel task execution
    async cancelTask(req, res) {
        try {
            const { projectId, id } = req.params;
            const userId = req.user.id;

            const task = await this.taskRepository.findById(id);
            
            if (!task || !task.belongsToProject(projectId)) {
                return res.status(404).json({
                    success: false,
                    error: 'Task not found'
                });
            }

            await this.taskService.cancelTask(id, userId);

            res.json({
                success: true,
                message: 'Task cancelled successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Analyze project and generate tasks
    async analyzeProject(req, res) {
        try {
            const { projectId } = req.params;
            const { projectPath, options } = req.body;
            const userId = req.user.id;

            const analysis = await this.taskService.analyzeProjectAndGenerateTasks(
                projectId,
                projectPath,
                options
            );

            res.json({
                success: true,
                data: analysis
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Get project analysis results
    async getProjectAnalysis(req, res) {
        try {
            const { projectId, analysisId } = req.params;
            const userId = req.user.id;

            const analysis = await this.taskService.getProjectAnalysis(analysisId);

            res.json({
                success: true,
                data: analysis
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // AI-powered analysis
    async aiAnalysis(req, res) {
        try {
            const { projectId } = req.params;
            const { projectPath, aiOptions } = req.body;
            const userId = req.user.id;

            const analysis = await this.aiService.analyzeProject(projectPath, aiOptions);

            res.json({
                success: true,
                data: analysis
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Execute auto mode for a project
    async executeAutoMode(req, res) {
        try {
            const { projectId } = req.params;
            const { projectPath, options } = req.body;
            const userId = req.user.id;

            const result = await this.taskService.executeAutoMode(projectId, projectPath, options);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Get auto mode status
    async getAutoModeStatus(req, res) {
        try {
            const { projectId } = req.params;
            const userId = req.user.id;

            const status = await this.taskService.getAutoModeStatus(projectId);

            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Stop auto mode
    async stopAutoMode(req, res) {
        try {
            const { projectId } = req.params;
            const userId = req.user.id;

            await this.taskService.stopAutoMode(projectId);

            res.json({
                success: true,
                message: 'Auto mode stopped successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Generate script for a project
    async generateScript(req, res) {
        try {
            const { projectId } = req.params;
            const { taskId, context, options } = req.body;
            const userId = req.user.id;

            const script = await this.taskService.generateScript(projectId, taskId, context, options);

            res.json({
                success: true,
                data: script
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Get generated scripts for a project
    async getGeneratedScripts(req, res) {
        try {
            const { projectId } = req.params;
            const userId = req.user.id;

            const scripts = await this.taskService.getGeneratedScripts(projectId);

            res.json({
                success: true,
                data: scripts
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Execute script for a project
    async executeScript(req, res) {
        try {
            const { projectId, id } = req.params;
            const userId = req.user.id;

            const result = await this.taskService.executeScript(projectId, id, userId);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = TaskController; 