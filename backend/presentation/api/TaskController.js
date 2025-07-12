/**
 * TaskController - Handles project-based task management
 */
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const TaskPriority = require('@/domain/value-objects/TaskPriority');
const TaskType = require('@/domain/value-objects/TaskType');

class TaskController {
    constructor(taskService, taskRepository, aiService, projectAnalyzer, projectMappingService = null, ideManager = null, docsImportService = null) {
        this.taskService = taskService;
        this.taskRepository = taskRepository;
        this.aiService = aiService;
        this.projectAnalyzer = projectAnalyzer;
        this.projectMappingService = projectMappingService;
        this.ideManager = ideManager;
        this.docsImportService = docsImportService;
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

    // Execute task within a project using unified workflow system
    async executeTask(req, res) {
        try {
            const { projectId, id } = req.params;
            const userId = req.user.id;
            const options = req.body.options || {};

            console.log('🚀 [TaskController] executeTask called with unified workflow system:', { 
                projectId, 
                id, 
                userId,
                options 
            });

            const task = await this.taskRepository.findById(id);
            console.log('🔍 [TaskController] Found task:', task ? {
                id: task.id,
                projectId: task.projectId,
                title: task.title,
                belongsToProject: task.belongsToProject(projectId)
            } : 'NOT FOUND');
            
            if (!task || !task.belongsToProject(projectId)) {
                console.log('❌ [TaskController] Task not found or does not belong to project');
                console.log('❌ [TaskController] Task exists:', !!task);
                console.log('❌ [TaskController] Task projectId:', task?.projectId);
                console.log('❌ [TaskController] Requested projectId:', projectId);
                console.log('❌ [TaskController] belongsToProject result:', task?.belongsToProject(projectId));
                return res.status(404).json({
                    success: false,
                    error: 'Task not found'
                });
            }

            console.log('🔍 [TaskController] Found task, executing with unified workflow system...');

            // Execute task using unified workflow system (priority method)
            const execution = await this.taskService.executeTask(id, userId, options);

            console.log('✅ [TaskController] Task execution completed with unified workflow:', {
                taskId: id,
                success: execution.success,
                executionMethod: execution.metadata?.executionMethod || 'unified_workflow',
                workflowType: execution.metadata?.workflowType,
                duration: execution.metadata?.formattedDuration
            });

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

    // NEW: Sync docs tasks using TEMP logic and DocsImportService
    async syncDocsTasks(req, res) {
        try {
            console.log('🔄 [TaskController] syncDocsTasks called');
            
            const { projectId } = req.params;
            const userId = req.user.id;

            console.log('🔄 [TaskController] Syncing docs tasks for project:', projectId);

            // Use DocsImportService for TEMP logic
            if (!this.docsImportService) {
                throw new Error('DocsImportService not available');
            }

            // Get port from IDE manager or use default
            let port = 9222; // Default Cursor port
            if (this.ideManager) {
                try {
                    const activeIDE = await this.ideManager.getActiveIDE();
                    if (activeIDE && activeIDE.port) {
                        port = activeIDE.port;
                    }
                } catch (error) {
                    console.warn('🔍 [TaskController] Failed to get active IDE port, using default:', error.message);
                }
            }

            console.log(`🔄 [TaskController] Using port ${port} for docs import`);

            // Use DocsImportService to handle TEMP logic and import
            const result = await this.docsImportService.importDocsFromTemp(projectId, port);

            console.log(`✅ [TaskController] Docs import completed:`, {
                importedCount: result.importedCount,
                totalFiles: result.totalFiles,
                workspacePath: result.workspacePath
            });

            res.json({
                success: true,
                data: result,
                message: `Successfully imported ${result.importedCount} docs tasks from TEMP data`
            });

        } catch (error) {
            console.error('❌ [TaskController] Failed to sync docs tasks:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Helper method to parse markdown content with category support
    parseDocsTaskFromMarkdown(content, filename) {
        try {
            // Extract title from first line (usually # Task Name)
            const titleMatch = content.match(/^#\s+(.+)$/m);
            const title = titleMatch ? titleMatch[1].trim() : filename.replace('.md', '');

            // Extract priority from content - use TaskPriority static values
            let priority = TaskPriority.MEDIUM;
            if (content.includes('KRITISCH') || content.includes('CRITICAL')) {
                priority = TaskPriority.CRITICAL;
            } else if (content.includes('HIGH') || content.includes('HOCH')) {
                priority = TaskPriority.HIGH;
            } else if (content.includes('LOW') || content.includes('NICHTIG') || content.includes('NIEDRIG')) {
                priority = TaskPriority.LOW;
            }
            
            console.log('🔍 [TaskController] Priority parsing:', {
                content: content.substring(0, 200),
                priority: priority,
                TaskPriority_LOW: TaskPriority.LOW,
                TaskPriority_MEDIUM: TaskPriority.MEDIUM,
                TaskPriority_HIGH: TaskPriority.HIGH,
                TaskPriority_CRITICAL: TaskPriority.CRITICAL
            });

            // Extract type from content or filename - use TaskType static values
            let type = TaskType.FEATURE;
            if (content.includes('refactor') || content.includes('Refactor')) {
                type = TaskType.REFACTOR;
            } else if (content.includes('bug') || content.includes('Bug')) {
                type = TaskType.BUG;
            } else if (content.includes('test') || content.includes('Test')) {
                type = TaskType.TEST;
            } else if (content.includes('documentation') || content.includes('docs')) {
                type = TaskType.DOCUMENTATION;
            }
            
            console.log('🔍 [TaskController] Type parsing:', {
                type: type,
                TaskType_FEATURE: TaskType.FEATURE,
                TaskType_REFACTOR: TaskType.REFACTOR,
                TaskType_BUG: TaskType.BUG,
                TaskType_TEST: TaskType.TEST,
                TaskType_DOCUMENTATION: TaskType.DOCUMENTATION
            });

            // Extract category from content or filename path
            let category;
            const categoryMatch = content.match(/category[:\s]+([^\n]+)/i);
            if (categoryMatch) {
                category = categoryMatch[1].trim();
            } else {
                // Try to extract from filename path (e.g., features/backend/task.md -> backend)
                const pathParts = filename.split('/');
                if (pathParts.length > 1) {
                    category = pathParts[0];
                }
            }

            // Create description from content
            const description = content
                .split('\n')
                .slice(0, 10) // First 10 lines
                .join('\n')
                .substring(0, 500); // Max 500 chars

            return {
                title,
                description,
                priority,
                type,
                category, // Add category support
                metadata: {
                    originalFilename: filename,
                    contentLength: content.length,
                    category: category // Include in metadata
                }
            };
        } catch (error) {
            console.error(`❌ [TaskController] Failed to parse markdown file ${filename}:`, error);
            return null;
        }
    }

    // Clean docs tasks from database
    async cleanDocsTasks(req, res) {
        try {
            console.log('🗑️ [TaskController] cleanDocsTasks called');
            
            const { projectId } = req.params;
            const userId = req.user.id;

            console.log('🗑️ [TaskController] Cleaning docs tasks for project:', projectId);

            // Get all tasks and delete them (no filtering)
            const allTasks = await this.taskRepository.findByProject(projectId);

            console.log(`🗑️ [TaskController] Found ${allTasks.length} tasks to delete`);

            // Delete all tasks
            let deletedCount = 0;
            for (const task of allTasks) {
                try {
                    await this.taskRepository.delete(task.id);
                    deletedCount++;
                    console.log(`🗑️ [TaskController] Deleted task: ${task.title}`);
                } catch (error) {
                    console.error(`❌ [TaskController] Failed to delete task ${task.id}:`, error);
                }
            }

            res.json({
                success: true,
                data: {
                    deletedTasks: allTasks,
                    totalFound: allTasks.length,
                    deletedCount: deletedCount
                },
                message: `Successfully deleted ${deletedCount} tasks`
            });

        } catch (error) {
            console.error('❌ [TaskController] Failed to clean tasks:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

}

module.exports = TaskController; 