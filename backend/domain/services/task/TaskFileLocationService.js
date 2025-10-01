const Logger = require('@logging/Logger');
const path = require('path');
const fs = require('fs').promises;

/**
 * TaskFileLocationService - Manages task file locations consistently
 * Provides single source of truth for task file path resolution and management
 */
class TaskFileLocationService {
    constructor(fileSystemService = null) {
        this.fileSystemService = fileSystemService;
        this.logger = new Logger('TaskFileLocationService');
        this.projectRoot = this.resolveProjectRoot();
    }

    /**
     * Resolve project root directory
     * @returns {string} Project root path
     */
    resolveProjectRoot() {
        // Try to find project root by looking for package.json
        let currentDir = process.cwd();
        let maxDepth = 10; // Prevent infinite loops
        
        while (maxDepth > 0) {
            try {
                const packageJsonPath = path.join(currentDir, 'package.json');
                if (require('fs').existsSync(packageJsonPath)) {
                    return currentDir;
                }
            } catch (error) {
                // Continue searching
            }
            
            const parentDir = path.dirname(currentDir);
            if (parentDir === currentDir) {
                break; // Reached filesystem root
            }
            currentDir = parentDir;
            maxDepth--;
        }
        
        // Fallback to current working directory
        return process.cwd();
    }

    /**
     * Get task file path based on status and metadata
     * @param {Object} task - Task object
     * @param {Object} options - Path resolution options
     * @returns {string} Resolved file path
     */
    getTaskFilePath(task, options = {}) {
        try {
            const { status, priority, category, title, completedAt } = task;
            const normalizedTitle = this.normalizeTaskName(title || 'unknown-task');
            
            let basePath;
            
            // Determine base path based on status
            if (status === 'completed') {
                const quarter = this.getCompletionQuarter(completedAt);
                basePath = path.join(this.projectRoot, 'docs/09_roadmap/completed', quarter, category || 'general');
            } else if (status === 'in_progress') {
                basePath = path.join(this.projectRoot, 'docs/09_roadmap/in-progress', category || 'general');
            } else if (status === 'cancelled') {
                const priorityDir = this.mapPriorityToDirectory(priority);
                basePath = path.join(this.projectRoot, 'docs/09_roadmap/cancelled', priorityDir, category || 'general');
            } else if (status === 'failed') {
                basePath = path.join(this.projectRoot, 'docs/09_roadmap/failed', category || 'general');
            } else {
                // Default to pending
                const priorityDir = this.mapPriorityToDirectory(priority);
                basePath = path.join(this.projectRoot, 'docs/09_roadmap/pending', priorityDir, category || 'general');
            }
            
            const taskPath = path.join(basePath, normalizedTitle);
            
            this.logger.debug('Resolved task file path', {
                taskId: task.id,
                status,
                category,
                priority,
                resolvedPath: taskPath
            });
            
            return taskPath;
            
        } catch (error) {
            this.logger.error('Failed to resolve task file path', {
                taskId: task.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get task file path for specific status
     * @param {Object} task - Task object
     * @param {string} targetStatus - Target status
     * @returns {string} Resolved file path for target status
     */
    getTaskFilePathForStatus(task, targetStatus) {
        const taskWithStatus = { ...task, status: targetStatus };
        return this.getTaskFilePath(taskWithStatus);
    }

    /**
     * Find existing task file location
     * @param {Object} task - Task object
     * @returns {Promise<string|null>} Existing file path or null
     */
    async findExistingTaskFile(task) {
        try {
            const possiblePaths = this.getPossibleTaskPaths(task);
            
            for (const possiblePath of possiblePaths) {
                try {
                    await fs.access(possiblePath);
                    this.logger.debug('Found existing task file', {
                        taskId: task.id,
                        foundPath: possiblePath
                    });
                    return possiblePath;
                } catch (error) {
                    // Path doesn't exist, continue searching
                }
            }
            
            this.logger.debug('No existing task file found', {
                taskId: task.id,
                searchedPaths: possiblePaths.length
            });
            
            return null;
            
        } catch (error) {
            this.logger.error('Failed to find existing task file', {
                taskId: task.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get all possible task file paths to search
     * @param {Object} task - Task object
     * @returns {Array<string>} Array of possible paths
     */
    getPossibleTaskPaths(task) {
        const { priority, category, title } = task;
        const normalizedTitle = this.normalizeTaskName(title || 'unknown-task');
        const priorityDir = this.mapPriorityToDirectory(priority);
        
        const possiblePaths = [];
        
        // Check all possible status locations
        const statuses = ['pending', 'in_progress', 'completed', 'cancelled', 'failed'];
        
        for (const status of statuses) {
            if (status === 'completed') {
                // Check different quarters
                const quarters = this.getRecentQuarters();
                for (const quarter of quarters) {
                    possiblePaths.push(
                        path.join(this.projectRoot, 'docs/09_roadmap/completed', quarter, category || 'general', normalizedTitle)
                    );
                }
            } else if (status === 'pending' || status === 'cancelled') {
                // Check different priority directories
                const priorities = ['low', 'medium', 'high', 'critical'];
                for (const prio of priorities) {
                    possiblePaths.push(
                        path.join(this.projectRoot, 'docs/09_roadmap', status, prio, category || 'general', normalizedTitle)
                    );
                }
            } else {
                // Direct category path
                possiblePaths.push(
                    path.join(this.projectRoot, 'docs/09_roadmap', status, category || 'general', normalizedTitle)
                );
            }
        }
        
        return possiblePaths;
    }

    /**
     * Move task files from source to destination
     * @param {string} sourcePath - Source path
     * @param {string} destinationPath - Destination path
     * @param {Object} options - Move options
     * @returns {Promise<Object>} Move result
     */
    async moveTaskFiles(sourcePath, destinationPath, options = {}) {
        try {
            const { createDirectories = true, overwrite = false } = options;
            
            // Check if source exists
            try {
                await fs.access(sourcePath);
            } catch (error) {
                this.logger.warn('Source path does not exist, skipping move', {
                    sourcePath,
                    destinationPath
                });
                return {
                    success: true,
                    message: 'Source path does not exist, no move needed',
                    filesMoved: 0
                };
            }
            
            // Check if destination exists and handle overwrite
            try {
                await fs.access(destinationPath);
                if (!overwrite) {
                    throw new Error(`Destination path already exists: ${destinationPath}`);
                }
            } catch (error) {
                // Destination doesn't exist or overwrite is allowed, continue
            }
            
            // Create destination directory if needed
            if (createDirectories) {
                await fs.mkdir(destinationPath, { recursive: true });
            }
            
            // Move all files from source to destination
            const files = await fs.readdir(sourcePath);
            const filesMoved = [];
            
            for (const file of files) {
                const sourceFilePath = path.join(sourcePath, file);
                const destinationFilePath = path.join(destinationPath, file);
                
                await fs.rename(sourceFilePath, destinationFilePath);
                filesMoved.push(file);
                
                this.logger.debug('Moved file', {
                    from: sourceFilePath,
                    to: destinationFilePath
                });
            }
            
            // Remove source directory
            await fs.rmdir(sourcePath);
            
            // Clean up empty parent directories
            await this.cleanupEmptyDirectories(sourcePath);
            
            this.logger.info('Task files moved successfully', {
                sourcePath,
                destinationPath,
                filesMoved: filesMoved.length
            });
            
            return {
                success: true,
                sourcePath,
                destinationPath,
                filesMoved,
                message: `Moved ${filesMoved.length} files successfully`
            };
            
        } catch (error) {
            this.logger.error('Failed to move task files', {
                sourcePath,
                destinationPath,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Clean up empty parent directories
     * @param {string} filePath - File path to clean up from
     */
    async cleanupEmptyDirectories(filePath) {
        try {
            let currentPath = path.dirname(filePath);
            const maxDepth = 5; // Prevent going too far up
            let depth = 0;
            
            while (depth < maxDepth && currentPath !== path.dirname(currentPath)) {
                try {
                    const files = await fs.readdir(currentPath);
                    if (files.length === 0) {
                        await fs.rmdir(currentPath);
                        this.logger.debug('Removed empty directory', { path: currentPath });
                        currentPath = path.dirname(currentPath);
                        depth++;
                    } else {
                        break;
                    }
                } catch (error) {
                    // Directory not empty or other error, stop cleanup
                    break;
                }
            }
        } catch (error) {
            this.logger.warn('Failed to cleanup empty directories', {
                filePath,
                error: error.message
            });
        }
    }

    /**
     * Normalize task name for file system compatibility
     * @param {string} taskName - Task name
     * @returns {string} Normalized task name
     */
    normalizeTaskName(taskName) {
        if (!taskName) return 'unknown-task';
        
        return taskName
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    }

    /**
     * Map priority to directory name
     * @param {string} priority - Task priority
     * @returns {string} Directory name
     */
    mapPriorityToDirectory(priority) {
        const priorityMap = {
            'low': 'low',
            'medium': 'medium',
            'high': 'high',
            'critical': 'critical'
        };
        
        return priorityMap[priority] || 'medium';
    }

    /**
     * Get completion quarter for completed tasks
     * @param {Date|string} completedAt - Completion date
     * @returns {string} Quarter string (e.g., '2024-q4')
     */
    getCompletionQuarter(completedAt) {
        if (!completedAt) {
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            const quarter = Math.ceil(month / 3);
            return `${year}-q${quarter}`;
        }
        
        const date = new Date(completedAt);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const quarter = Math.ceil(month / 3);
        
        return `${year}-q${quarter}`;
    }

    /**
     * Get recent quarters for searching completed tasks
     * @returns {Array<string>} Array of recent quarters
     */
    getRecentQuarters() {
        const quarters = [];
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const currentQuarter = Math.ceil(currentMonth / 3);
        
        // Include current quarter and previous 4 quarters
        for (let i = 0; i < 5; i++) {
            const quarter = currentQuarter - i;
            const year = quarter <= 0 ? currentYear - 1 : currentYear;
            const adjustedQuarter = quarter <= 0 ? quarter + 4 : quarter;
            
            quarters.push(`${year}-q${adjustedQuarter}`);
        }
        
        return quarters;
    }

    /**
     * Validate file path for security
     * @param {string} filePath - File path to validate
     * @returns {boolean} True if path is safe
     */
    validateFilePath(filePath) {
        try {
            // Check for path traversal attempts
            if (filePath.includes('..') || filePath.includes('~')) {
                return false;
            }
            
            // Ensure path is within project root
            const resolvedPath = path.resolve(filePath);
            const projectRootResolved = path.resolve(this.projectRoot);
            
            return resolvedPath.startsWith(projectRootResolved);
            
        } catch (error) {
            this.logger.warn('Failed to validate file path', {
                filePath,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Get project root path
     * @returns {string} Project root path
     */
    getProjectRoot() {
        return this.projectRoot;
    }
}

module.exports = TaskFileLocationService;
