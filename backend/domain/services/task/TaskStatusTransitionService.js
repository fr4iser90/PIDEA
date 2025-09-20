const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

/**
 * TaskStatusTransitionService - Handles automatic task status transitions
 * Automatically moves tasks between status directories and updates database
 */
class TaskStatusTransitionService {
    constructor(taskRepository, fileSystemService, eventBus = null) {
        this.taskRepository = taskRepository;
        this.fileSystemService = fileSystemService;
        this.eventBus = eventBus;
        this.logger = new Logger('TaskStatusTransitionService');
    }

    /**
     * Move task from pending to in-progress
     * @param {string} taskId - Task ID
     * @returns {Promise<Object>} Transition result
     */
    async moveTaskToInProgress(taskId) {
        try {
            this.logger.info('🔄 Moving task to in-progress', { taskId });

            // 1. Get task from database
            const task = await this.taskRepository.findById(taskId);
            if (!task) {
                throw new Error(`Task not found: ${taskId}`);
            }

            // 2. Check if task is already in progress
            if (task.status.value === 'in-progress') {
                this.logger.info('✅ Task already in progress', { taskId });
                return { success: true, message: 'Task already in progress' };
            }

            // 3. Update database status
            task.updateStatus('in-progress');
            await this.taskRepository.update(taskId, task);

            // 4. Move files from pending/ to in-progress/
            const oldPath = `docs/09_roadmap/pending/${task.priority.value}/${task.category}/${task.name}/`;
            const newPath = `docs/09_roadmap/in-progress/${task.priority.value}/${task.category}/${task.name}/`;

            await this.moveTaskFiles(oldPath, newPath, taskId);

            // 5. Update file references in database
            await this.updateFileReferences(taskId, oldPath, newPath);

            // 6. Emit event
            if (this.eventBus) {
                this.eventBus.emit('task:status:transition', {
                    taskId,
                    fromStatus: 'pending',
                    toStatus: 'in-progress',
                    timestamp: new Date()
                });
            }

            this.logger.info('✅ Task moved to in-progress successfully', { 
                taskId, 
                oldPath, 
                newPath 
            });

            return {
                success: true,
                taskId,
                fromStatus: 'pending',
                toStatus: 'in-progress',
                oldPath,
                newPath,
                message: 'Task moved to in-progress successfully'
            };

        } catch (error) {
            this.logger.error('❌ Failed to move task to in-progress', { 
                taskId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Move task to completed (handles all possible source statuses)
     * @param {string} taskId - Task ID
     * @returns {Promise<Object>} Transition result
     */
    async moveTaskToCompleted(taskId) {
        try {
            this.logger.info('🔄 Moving task to completed', { taskId });

            // 1. Get task from database
            const task = await this.taskRepository.findById(taskId);
            if (!task) {
                throw new Error(`Task not found: ${taskId}`);
            }

            // 2. Check if task is already completed AND files are in correct location
            if (task.status.value === 'completed') {
                const quarter = this.getCurrentQuarter();
                const expectedPath = `docs/09_roadmap/completed/${quarter}/${task.category}/${task.name}/`;
                
                try {
                    await fs.access(expectedPath);
                    this.logger.info('✅ Task already completed and files in correct location', { taskId, expectedPath });
                    return { success: true, message: 'Task already completed and synchronized' };
                } catch (error) {
                    this.logger.info('🔄 Task completed but files not in correct location, fixing...', { taskId, expectedPath });
                    // Continue with file movement
                }
            }

            // 3. Update database status (only if not already completed)
            if (task.status.value !== 'completed') {
                task.updateStatus('completed');
                if (task.setCompletionDate) {
                    task.setCompletionDate(new Date());
                }
                await this.taskRepository.update(taskId, task);
            }

            // 4. Find and move files from ANY possible source location
            const quarter = this.getCurrentQuarter();
            
            // Extract the actual folder name from the task title
            let taskName = task.name || task.title || 'unknown-task';
            if (taskName.includes('Task Panel')) {
                // Extract the specific task panel name (e.g., "task-panel-category-improvement")
                if (taskName.includes('Category Improvement')) {
                    taskName = 'task-panel-category-improvement';
                } else if (taskName.includes('Completion Filter')) {
                    taskName = 'task-panel-completion-filter';
                } else if (taskName.includes('Project Specific')) {
                    taskName = 'task-panel-project-specific';
                }
            }
            
            const taskCategory = task.category || 'unknown';
            const newPath = `docs/09_roadmap/completed/${quarter}/${taskCategory}/${taskName}/`;
            
            // Try to find the task files in different possible locations
            const taskPriority = task.priority?.value || 'medium-priority';
            const possibleOldPaths = [
                `docs/09_roadmap/in-progress/${taskPriority}/${taskCategory}/${taskName}/`,
                `docs/09_roadmap/pending/${taskPriority}/${taskCategory}/${taskName}/`,
                `docs/09_roadmap/pending/medium-priority/${taskCategory}/${taskName}/`,
                `docs/09_roadmap/pending/high-priority/${taskCategory}/${taskName}/`,
                `docs/09_roadmap/pending/low-priority/${taskCategory}/${taskName}/`,
                `docs/09_roadmap/planning/${taskPriority}/${taskCategory}/${taskName}/`
            ];

            let oldPath = null;
            let filesMoved = false;

            // Try each possible path until we find the task files
            for (const testPath of possibleOldPaths) {
                try {
                    await fs.access(testPath);
                    oldPath = testPath;
                    this.logger.info(`📁 Found task files at: ${testPath}`, { taskId });
                    break;
                } catch (error) {
                    // Path doesn't exist, try next one
                    continue;
                }
            }

            if (oldPath) {
                await this.moveTaskFiles(oldPath, newPath, taskId);
                filesMoved = true;
                
                // Update file references in database
                await this.updateFileReferences(taskId, oldPath, newPath);
            } else {
                this.logger.warn('⚠️ No task files found in any expected location', { 
                    taskId, 
                    possiblePaths: possibleOldPaths 
                });
            }

            // 5. Emit event
            if (this.eventBus) {
                this.eventBus.emit('task:status:transition', {
                    taskId,
                    fromStatus: task.status.value,
                    toStatus: 'completed',
                    timestamp: new Date(),
                    filesMoved
                });
            }

            this.logger.info('✅ Task moved to completed successfully', { 
                taskId, 
                oldPath, 
                newPath,
                quarter,
                filesMoved
            });

            return {
                success: true,
                taskId,
                fromStatus: task.status.value,
                toStatus: 'completed',
                oldPath,
                newPath,
                quarter,
                filesMoved,
                message: 'Task moved to completed successfully'
            };

        } catch (error) {
            this.logger.error('❌ Failed to move task to completed', { 
                taskId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Move task files from old path to new path
     * @param {string} oldPath - Source path
     * @param {string} newPath - Destination path
     * @param {string} taskId - Task ID for logging
     */
    async moveTaskFiles(oldPath, newPath, taskId) {
        try {
            // Check if old path exists
            try {
                await fs.access(oldPath);
            } catch (error) {
                this.logger.warn('⚠️ Old path does not exist, skipping file move', { 
                    taskId, 
                    oldPath 
                });
                return;
            }

            // Create new directory structure
            await fs.mkdir(newPath, { recursive: true });

            // Move all files from old path to new path
            const files = await fs.readdir(oldPath);
            for (const file of files) {
                const oldFilePath = path.join(oldPath, file);
                const newFilePath = path.join(newPath, file);
                
                await fs.rename(oldFilePath, newFilePath);
                this.logger.debug('📁 Moved file', { 
                    taskId, 
                    from: oldFilePath, 
                    to: newFilePath 
                });
            }

            // Remove old directory (recursively if it has subdirectories)
            try {
                await fs.rmdir(oldPath);
            } catch (error) {
                // If rmdir fails, try to remove recursively
                await fs.rm(oldPath, { recursive: true, force: true });
                this.logger.debug('🗑️ Removed old directory recursively', { 
                    taskId, 
                    oldPath 
                });
            }

            this.logger.info('📁 Task files moved successfully', { 
                taskId, 
                oldPath, 
                newPath,
                filesMoved: files.length 
            });

        } catch (error) {
            this.logger.error('❌ Failed to move task files', { 
                taskId, 
                oldPath, 
                newPath, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Update file references in database
     * @param {string} taskId - Task ID
     * @param {string} oldPath - Old file path
     * @param {string} newPath - New file path
     */
    async updateFileReferences(taskId, oldPath, newPath) {
        try {
            // Update task source_path in database
            const task = await this.taskRepository.findById(taskId);
            if (task && task.sourcePath) {
                const updatedSourcePath = task.sourcePath.replace(oldPath, newPath);
                task.sourcePath = updatedSourcePath;
                await this.taskRepository.update(taskId, task);
                
                this.logger.debug('📝 Updated task source path', { 
                    taskId, 
                    oldPath: task.sourcePath, 
                    newPath: updatedSourcePath 
                });
            }

        } catch (error) {
            this.logger.error('❌ Failed to update file references', { 
                taskId, 
                oldPath, 
                newPath, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Get current quarter for completed tasks organization
     * @returns {string} Current quarter (e.g., '2024-q4')
     */
    getCurrentQuarter() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // 0-based to 1-based
        
        let quarter;
        if (month <= 3) quarter = 'q1';
        else if (month <= 6) quarter = 'q2';
        else if (month <= 9) quarter = 'q3';
        else quarter = 'q4';
        
        return `${year}-${quarter}`;
    }

    /**
     * Move task to blocked status
     * @param {string} taskId - Task ID
     * @param {string} reason - Block reason
     * @returns {Promise<Object>} Transition result
     */
    async moveTaskToBlocked(taskId, reason = 'Blocked by external dependency') {
        try {
            this.logger.info('🔄 Moving task to blocked', { taskId, reason });

            const task = await this.taskRepository.findById(taskId);
            if (!task) {
                throw new Error(`Task not found: ${taskId}`);
            }

            // Update database status
            task.updateStatus('blocked');
            task.setMetadata('blockReason', reason);
            await this.taskRepository.update(taskId, task);

            // Move files to blocked directory
            const oldPath = `docs/09_roadmap/in-progress/${task.priority.value}/${task.category}/${task.name}/`;
            const newPath = `docs/09_roadmap/blocked/${task.priority.value}/${task.category}/${task.name}/`;

            await this.moveTaskFiles(oldPath, newPath, taskId);
            await this.updateFileReferences(taskId, oldPath, newPath);

            // Emit event
            if (this.eventBus) {
                this.eventBus.emit('task:status:transition', {
                    taskId,
                    fromStatus: 'in-progress',
                    toStatus: 'blocked',
                    reason,
                    timestamp: new Date()
                });
            }

            return {
                success: true,
                taskId,
                fromStatus: 'in-progress',
                toStatus: 'blocked',
                reason,
                message: 'Task moved to blocked successfully'
            };

        } catch (error) {
            this.logger.error('❌ Failed to move task to blocked', { 
                taskId, 
                reason, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Move task to cancelled status
     * @param {string} taskId - Task ID
     * @param {string} reason - Cancellation reason
     * @returns {Promise<Object>} Transition result
     */
    async moveTaskToCancelled(taskId, reason = 'Task cancelled') {
        try {
            this.logger.info('🔄 Moving task to cancelled', { taskId, reason });

            const task = await this.taskRepository.findById(taskId);
            if (!task) {
                throw new Error(`Task not found: ${taskId}`);
            }

            // Update database status
            task.updateStatus('cancelled');
            task.setMetadata('cancellationReason', reason);
            await this.taskRepository.update(taskId, task);

            // Move files to cancelled directory
            const oldPath = `docs/09_roadmap/in-progress/${task.priority.value}/${task.category}/${task.name}/`;
            const newPath = `docs/09_roadmap/cancelled/${task.priority.value}/${task.category}/${task.name}/`;

            await this.moveTaskFiles(oldPath, newPath, taskId);
            await this.updateFileReferences(taskId, oldPath, newPath);

            // Emit event
            if (this.eventBus) {
                this.eventBus.emit('task:status:transition', {
                    taskId,
                    fromStatus: 'in-progress',
                    toStatus: 'cancelled',
                    reason,
                    timestamp: new Date()
                });
            }

            return {
                success: true,
                taskId,
                fromStatus: 'in-progress',
                toStatus: 'cancelled',
                reason,
                message: 'Task moved to cancelled successfully'
            };

        } catch (error) {
            this.logger.error('❌ Failed to move task to cancelled', { 
                taskId, 
                reason, 
                error: error.message 
            });
            throw error;
        }
    }
}

module.exports = TaskStatusTransitionService;
