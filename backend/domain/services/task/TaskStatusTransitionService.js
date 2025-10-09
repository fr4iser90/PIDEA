const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');
const TaskFileLocationService = require('@domain/services/task/TaskFileLocationService');
const TaskEventStore = require('@domain/services/task/TaskEventStore');

/**
 * TaskStatusTransitionService - Handles automatic task status transitions
 * Automatically moves tasks between status directories and updates database
 * Uses TaskFileLocationService for consistent path management
 */
class TaskStatusTransitionService {
    constructor(taskRepository, fileSystemService, eventBus = null, fileLocationService = null, eventStore = null) {
        this.taskRepository = taskRepository;
        this.fileSystemService = fileSystemService;
        this.eventBus = eventBus;
        this.fileLocationService = fileLocationService || new TaskFileLocationService(fileSystemService);
        this.eventStore = eventStore;
        this.logger = new Logger('TaskStatusTransitionService');
    }

    /**
     * Move task from pending to in_progress
     * @param {string} taskId - Task ID
     * @returns {Promise<Object>} Transition result
     */
    async moveTaskToInProgress(taskId) {
        try {
            this.logger.info('🔄 Moving task to in_progress', { taskId });

            // 1. Get task from database
            const task = await this.taskRepository.findById(taskId);
            if (!task) {
                throw new Error(`Task not found: ${taskId}`);
            }

            // 2. Check if task is already in progress
            if (task.status.value === 'in_progress') {
                this.logger.info('✅ Task already in progress', { taskId });
                return { success: true, message: 'Task already in progress' };
            }

            // 3. Update database status
            task.updateStatus('in_progress');
            await this.taskRepository.update(taskId, task);

            // 4. Use file location service for consistent path management
            const oldPath = await this.fileLocationService.findExistingTaskFile(task);
            const newPath = this.fileLocationService.getTaskFilePathForStatus(task, 'in_progress');

            if (oldPath) {
                // 5. Move files using file location service
                const moveResult = await this.fileLocationService.moveTaskFiles(oldPath, newPath);
                
                // 6. Update file path in database
                await this.taskRepository.update(taskId, {
                    filePath: newPath,
                    lastSyncedAt: new Date().toISOString()
                });

                // 7. Record file movement event
                if (this.eventStore) {
                    await this.eventStore.recordFileMovementEvent(
                        taskId,
                        oldPath,
                        newPath,
                        { reason: 'Status transition to in_progress' },
                        'system'
                    );
                }
            } else {
                this.logger.warn('⚠️ No existing task files found, skipping file movement', { taskId });
            }

            // 6. Emit event
            if (this.eventBus) {
                this.eventBus.emit('task:status:transition', {
                    taskId,
                    fromStatus: 'pending',
                    toStatus: 'in_progress',
                    timestamp: new Date()
                });
            }

            this.logger.info('✅ Task moved to in_progress successfully', { 
                taskId, 
                oldPath, 
                newPath 
            });

            return {
                success: true,
                taskId,
                fromStatus: 'pending',
                toStatus: 'in_progress',
                oldPath,
                newPath,
                message: 'Task moved to in_progress successfully'
            };

        } catch (error) {
            this.logger.error('❌ Failed to move task to in_progress', { 
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
                const projectRoot = process.cwd();
                const expectedPath = path.join(projectRoot, `docs/09_roadmap/completed/${quarter}/${task.category}/${this.normalizeTaskName(task.title || 'unknown-task')}/`);
                
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
            
            // ✅ FIXED: Use task.metadata.taskDirectoryName directly (this is the correct directory name)
            let taskName;
            if (task.metadata?.taskDirectoryName) {
                // Use the taskDirectoryName from metadata (this is the actual directory name)
                taskName = task.metadata.taskDirectoryName;
            } else {
                // Fallback to title normalization (should not happen with new imports)
                taskName = this.normalizeTaskName(task.title || 'unknown-task');
            }
            
            // ✅ FIXED: Use the correct category from metadata, not task.category
            const taskCategory = task.metadata?.category || task.category || 'unknown';
            // ✅ FIXED: Use correct project root (parent directory of backend)
            const projectRoot = path.resolve(process.cwd(), '..');
            const newPath = path.join(projectRoot, `docs/09_roadmap/completed/${quarter}/${taskCategory}/${taskName}/`);
            
            // Try to find the task files in different possible locations
            const taskPriority = task.priority?.value || 'medium';
            const priorityDir = this.mapPriorityToDirectory(taskPriority);
            const possibleOldPaths = [
                path.join(projectRoot, `docs/09_roadmap/in-progress/${taskCategory}/${taskName}/`),
                path.join(projectRoot, `docs/09_roadmap/pending/${priorityDir}/${taskCategory}/${taskName}/`),
                path.join(projectRoot, `docs/09_roadmap/pending/medium/${taskCategory}/${taskName}/`),
                path.join(projectRoot, `docs/09_roadmap/pending/high/${taskCategory}/${taskName}/`),
                path.join(projectRoot, `docs/09_roadmap/pending/low/${taskCategory}/${taskName}/`),
                path.join(projectRoot, `docs/09_roadmap/pending/critical/${taskCategory}/${taskName}/`),
                path.join(projectRoot, `docs/09_roadmap/planning/${priorityDir}/${taskCategory}/${taskName}/`)
            ];

            let oldPath = null;
            let filesMoved = false;

            // Try each possible path until we find the task files
            for (const testPath of possibleOldPaths) {
                try {
                    await fs.access(testPath);
                    
                    // ✅ FIXED: Check if directory actually contains files (not just .gitkeep)
                    const files = await fs.readdir(testPath);
                    const actualFiles = files.filter(file => 
                        !file.startsWith('.') && 
                        !file.endsWith('.gitkeep') && 
                        !file.endsWith('.DS_Store')
                    );
                    
                    if (actualFiles.length > 0) {
                        oldPath = testPath;
                        this.logger.info(`📁 Found task files at: ${testPath}`, { 
                            taskId, 
                            fileCount: actualFiles.length,
                            files: actualFiles 
                        });
                        break;
                    } else {
                        this.logger.debug(`📁 Directory exists but is empty: ${testPath}`, { taskId });
                    }
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
     * Map priority value to directory name
     * @param {string} priority - Priority value
     * @returns {string} Directory name
     */
    mapPriorityToDirectory(priority) {
        const priorityMap = {
            'high': 'high',
            'medium': 'medium', 
            'low': 'low',
            'critical': 'critical'
        };
        return priorityMap[priority] || 'medium';
    }

    /**
     * Normalize task name for directory path
     * @param {string} taskName - Raw task name
     * @returns {string} Normalized task name
     */
    normalizeTaskName(taskName) {
        if (!taskName) return 'unknown-task';
        
        // Handle specific known cases
        if (taskName.includes('Framework Missing Steps Completion')) {
            return 'framework-missing-steps-completion';
        }
        
        // Remove common suffixes that don't belong in directory names
        let cleanedName = taskName
            .replace(/\s+Master\s+Index\s*$/i, '') // Remove "Master Index" suffix
            .replace(/\s+Index\s*$/i, '') // Remove "Index" suffix
            .replace(/\s+Task\s*$/i, '') // Remove "Task" suffix
            .replace(/\s+Implementation\s*$/i, '') // Remove "Implementation" suffix
            .replace(/\s+Plan\s*$/i, '') // Remove "Plan" suffix
            .replace(/\s+Phase\s+\d+\s*$/i, '') // Remove "Phase X" suffix
            .replace(/-task\s*$/i, '') // Remove "-task" suffix
            .trim();
        
        // Convert to kebab-case and clean up
        return cleanedName.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
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

            // Clean up empty parent directories
            await this.cleanupEmptyDirectories(oldPath);

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
     * Clean up empty parent directories after moving files
     * @param {string} oldPath - The old path that was removed
     */
    async cleanupEmptyDirectories(oldPath) {
        try {
            const pathParts = oldPath.split('/');
            
            // Start from the task directory and work upwards
            for (let i = pathParts.length - 1; i >= 0; i--) {
                const currentPath = pathParts.slice(0, i + 1).join('/');
                
                // Skip if we've reached the root or docs level
                if (i <= 2 || currentPath.includes('docs/09_roadmap')) {
                    try {
                        const files = await fs.readdir(currentPath);
                        const actualFiles = files.filter(file => 
                            !file.startsWith('.') && 
                            !file.endsWith('.gitkeep') && 
                            !file.endsWith('.DS_Store')
                        );
                        
                        // If directory is empty, remove it
                        if (actualFiles.length === 0) {
                            try {
                                await fs.rmdir(currentPath);
                                this.logger.debug('🗑️ Cleaned up empty directory', { path: currentPath });
                            } catch (rmError) {
                                // Directory might not be empty or have permission issues
                                break;
                            }
                        } else {
                            // Directory has files, stop cleaning up
                            break;
                        }
                    } catch (error) {
                        // Directory doesn't exist or can't be accessed
                        break;
                    }
                }
            }
        } catch (error) {
            this.logger.debug('⚠️ Failed to cleanup empty directories', { 
                oldPath, 
                error: error.message 
            });
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
            if (task) {
                // Extract task directory name from new path
                const taskDirectoryName = path.basename(newPath);
                
                // Update sourcePath if it exists
                if (task.sourcePath) {
                    const updatedSourcePath = task.sourcePath.replace(oldPath, newPath);
                    task.sourcePath = updatedSourcePath;
                }
                
                // Update metadata with new directory name and path
                if (!task.metadata) {
                    task.metadata = {};
                }
                
                task.metadata.taskDirectoryName = taskDirectoryName;
                task.metadata.currentPath = newPath;
                task.metadata.lastMovedAt = new Date().toISOString();
                
                // Update the task in database
                await this.taskRepository.update(taskId, task);
                
                this.logger.info('📝 Updated task file references in database', { 
                    taskId, 
                    oldPath, 
                    newPath,
                    taskDirectoryName,
                    updatedSourcePath: task.sourcePath
                });
            } else {
                this.logger.warn('⚠️ Task not found for file reference update', { taskId });
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

            // Normalize task name for directory path
            const taskName = this.normalizeTaskName(task.title || 'unknown-task');
            
            // Handle priority directory mapping
            const priorityDir = this.mapPriorityToDirectory(task.priority.value);
            
            // Move files to blocked directory
            // Note: in-progress goes directly to category, blocked might have priority subdirs
            const projectRoot = process.cwd();
            const oldPath = path.join(projectRoot, `docs/09_roadmap/in-progress/${task.category}/${taskName}/`);
            const newPath = path.join(projectRoot, `docs/09_roadmap/blocked/${priorityDir}/${task.category}/${taskName}/`);

            await this.moveTaskFiles(oldPath, newPath, taskId);
            await this.updateFileReferences(taskId, oldPath, newPath);

            // Emit event
            if (this.eventBus) {
                this.eventBus.emit('task:status:transition', {
                    taskId,
                    fromStatus: 'in_progress',
                    toStatus: 'blocked',
                    reason,
                    timestamp: new Date()
                });
            }

            return {
                success: true,
                taskId,
                fromStatus: 'in_progress',
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

            // Normalize task name for directory path
            const taskName = this.normalizeTaskName(task.title || 'unknown-task');
            
            // Handle priority directory mapping
            const priorityDir = this.mapPriorityToDirectory(task.priority.value);
            
            // Move files to cancelled directory
            // Note: in-progress goes directly to category, cancelled might have priority subdirs
            const projectRoot = process.cwd();
            const oldPath = path.join(projectRoot, `docs/09_roadmap/in-progress/${task.category}/${taskName}/`);
            const newPath = path.join(projectRoot, `docs/09_roadmap/cancelled/${priorityDir}/${task.category}/${taskName}/`);

            await this.moveTaskFiles(oldPath, newPath, taskId);
            await this.updateFileReferences(taskId, oldPath, newPath);

            // Emit event
            if (this.eventBus) {
                this.eventBus.emit('task:status:transition', {
                    taskId,
                    fromStatus: 'in_progress',
                    toStatus: 'cancelled',
                    reason,
                    timestamp: new Date()
                });
            }

            return {
                success: true,
                taskId,
                fromStatus: 'in_progress',
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
