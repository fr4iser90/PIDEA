const Logger = require('@logging/Logger');
const TaskContentHashService = require('@domain/services/task/TaskContentHashService');

/**
 * TaskStatusValidator - Validates status consistency between markdown content and database
 * Implements single source of truth principle using markdown content only
 */
class TaskStatusValidator {
    constructor(taskRepository, contentHashService, fileSystemService, eventStore = null) {
        this.taskRepository = taskRepository;
        this.contentHashService = contentHashService;
        this.fileSystemService = fileSystemService;
        this.eventStore = eventStore;
        this.logger = new Logger('TaskStatusValidator');
    }

    /**
     * Validate task status consistency between markdown and database
     * @param {string} taskId - Task ID
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Validation result
     */
    async validateTaskStatusConsistency(taskId, options = {}) {
        try {
            this.logger.info('Starting task status consistency validation', { taskId });

            // Get task from database
            const task = await this.taskRepository.findById(taskId);
            if (!task) {
                return {
                    isValid: false,
                    issues: ['Task not found in database'],
                    recommendations: ['Verify task ID and database connection']
                };
            }

            // Get file content if file path exists
            let fileContent = null;
            let fileStatus = null;
            let contentHash = null;

            if (task.filePath) {
                try {
                    fileContent = await this.fileSystemService.readFile(task.filePath, 'utf8');
                    fileStatus = await this.contentHashService.extractStatusFromContent(fileContent);
                    contentHash = await this.contentHashService.generateContentHash(fileContent);
                } catch (error) {
                    this.logger.warn('Failed to read task file', { 
                        taskId, 
                        filePath: task.filePath, 
                        error: error.message 
                    });
                }
            }

            // Validate consistency
            const validationResult = await this.performConsistencyValidation(
                task, fileContent, fileStatus, contentHash, options
            );

            // Record validation event if event store is available
            if (this.eventStore) {
                await this.eventStore.recordContentHashValidationEvent(
                    taskId,
                    contentHash,
                    validationResult.isValid,
                    {
                        issues: validationResult.issues,
                        recommendations: validationResult.recommendations,
                        validationMethod: 'automatic'
                    }
                );
            }

            this.logger.info('Task status consistency validation completed', {
                taskId,
                isValid: validationResult.isValid,
                issueCount: validationResult.issues.length
            });

            return validationResult;

        } catch (error) {
            this.logger.error('Failed to validate task status consistency', {
                taskId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Perform detailed consistency validation
     * @param {Object} task - Task from database
     * @param {string} fileContent - File content
     * @param {string} fileStatus - Status extracted from file
     * @param {string} contentHash - Content hash
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Validation result
     */
    async performConsistencyValidation(task, fileContent, fileStatus, contentHash, options = {}) {
        const issues = [];
        const recommendations = [];
        let isValid = true;

        // Check if file exists
        if (!fileContent) {
            issues.push('Task file not found or unreadable');
            recommendations.push('Verify file path and permissions');
            isValid = false;
        }

        // Check status consistency
        if (fileContent && fileStatus && task.status) {
            const dbStatus = task.status.value || task.status;
            if (fileStatus !== dbStatus) {
                issues.push(`Status mismatch: file shows '${fileStatus}', database shows '${dbStatus}'`);
                recommendations.push('Synchronize status between file and database');
                isValid = false;
            }
        }

        // Check content hash consistency
        if (fileContent && task.contentHash) {
            const isHashValid = await this.contentHashService.validateContentHash(fileContent, task.contentHash);
            if (!isHashValid) {
                issues.push('Content hash mismatch - file content has changed');
                recommendations.push('Update content hash in database');
                isValid = false;
            }
        }

        // Check sync timestamp
        if (task.lastSyncedAt) {
            const lastSync = new Date(task.lastSyncedAt);
            const now = new Date();
            const hoursSinceSync = (now - lastSync) / (1000 * 60 * 60);
            
            if (hoursSinceSync > 24) {
                issues.push(`Stale sync: last synced ${Math.round(hoursSinceSync)} hours ago`);
                recommendations.push('Perform fresh synchronization');
                isValid = false;
            }
        } else {
            issues.push('Never synced with file system');
            recommendations.push('Perform initial synchronization');
            isValid = false;
        }

        // Check for missing content hash
        if (!task.contentHash && fileContent) {
            issues.push('Missing content hash in database');
            recommendations.push('Generate and store content hash');
            isValid = false;
        }

        // Check for missing file path
        if (!task.filePath) {
            issues.push('Missing file path in database');
            recommendations.push('Update file path metadata');
            isValid = false;
        }

        return {
            isValid,
            issues,
            recommendations,
            details: {
                taskId: task.id,
                dbStatus: task.status?.value || task.status,
                fileStatus,
                hasFileContent: !!fileContent,
                hasContentHash: !!task.contentHash,
                hasFilePath: !!task.filePath,
                lastSyncedAt: task.lastSyncedAt,
                contentHash
            }
        };
    }

    /**
     * Validate multiple tasks for consistency
     * @param {Array<string>} taskIds - Array of task IDs
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Batch validation result
     */
    async validateBatchTaskStatusConsistency(taskIds, options = {}) {
        try {
            this.logger.info('Starting batch task status consistency validation', {
                taskCount: taskIds.length
            });

            const results = [];
            let validCount = 0;
            let invalidCount = 0;

            for (const taskId of taskIds) {
                try {
                    const result = await this.validateTaskStatusConsistency(taskId, options);
                    results.push({
                        taskId,
                        ...result
                    });

                    if (result.isValid) {
                        validCount++;
                    } else {
                        invalidCount++;
                    }
                } catch (error) {
                    this.logger.error('Failed to validate individual task', {
                        taskId,
                        error: error.message
                    });
                    results.push({
                        taskId,
                        isValid: false,
                        issues: [`Validation failed: ${error.message}`],
                        recommendations: ['Check task configuration and try again']
                    });
                    invalidCount++;
                }
            }

            const summary = {
                totalTasks: taskIds.length,
                validTasks: validCount,
                invalidTasks: invalidCount,
                validationRate: (validCount / taskIds.length) * 100,
                results
            };

            this.logger.info('Batch task status consistency validation completed', summary);

            return summary;

        } catch (error) {
            this.logger.error('Failed to validate batch task status consistency', {
                taskCount: taskIds.length,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get validation statistics for all tasks
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Validation statistics
     */
    async getValidationStatistics(options = {}) {
        try {
            const { projectId = null, category = null } = options;

            // Get all tasks
            const tasks = await this.taskRepository.findAll({
                projectId,
                category
            });

            const stats = {
                totalTasks: tasks.length,
                withFilePaths: 0,
                withContentHashes: 0,
                recentlySynced: 0,
                statusConsistency: {
                    pending: 0,
                    in_progress: 0,
                    completed: 0,
                    cancelled: 0,
                    failed: 0
                },
                issues: {
                    missingFilePaths: 0,
                    missingContentHashes: 0,
                    staleSync: 0,
                    statusMismatches: 0
                }
            };

            const now = new Date();

            for (const task of tasks) {
                // Count file paths
                if (task.filePath) {
                    stats.withFilePaths++;
                } else {
                    stats.issues.missingFilePaths++;
                }

                // Count content hashes
                if (task.contentHash) {
                    stats.withContentHashes++;
                } else {
                    stats.issues.missingContentHashes++;
                }

                // Count recent syncs
                if (task.lastSyncedAt) {
                    const lastSync = new Date(task.lastSyncedAt);
                    const hoursSinceSync = (now - lastSync) / (1000 * 60 * 60);
                    if (hoursSinceSync < 24) {
                        stats.recentlySynced++;
                    } else {
                        stats.issues.staleSync++;
                    }
                }

                // Count status distribution
                const status = task.status?.value || task.status;
                if (stats.statusConsistency[status] !== undefined) {
                    stats.statusConsistency[status]++;
                }
            }

            // Calculate percentages
            stats.filePathCoverage = (stats.withFilePaths / stats.totalTasks) * 100;
            stats.contentHashCoverage = (stats.withContentHashes / stats.totalTasks) * 100;
            stats.syncCoverage = (stats.recentlySynced / stats.totalTasks) * 100;

            this.logger.info('Generated validation statistics', {
                totalTasks: stats.totalTasks,
                filePathCoverage: stats.filePathCoverage,
                contentHashCoverage: stats.contentHashCoverage,
                syncCoverage: stats.syncCoverage
            });

            return stats;

        } catch (error) {
            this.logger.error('Failed to get validation statistics', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Auto-fix common consistency issues
     * @param {string} taskId - Task ID
     * @param {Object} options - Fix options
     * @returns {Promise<Object>} Fix result
     */
    async autoFixConsistencyIssues(taskId, options = {}) {
        try {
            this.logger.info('Starting auto-fix for task consistency issues', { taskId });

            const validationResult = await this.validateTaskStatusConsistency(taskId, options);
            
            if (validationResult.isValid) {
                return {
                    success: true,
                    message: 'No issues found, task is already consistent',
                    fixesApplied: []
                };
            }

            const fixesApplied = [];
            const task = await this.taskRepository.findById(taskId);

            // Fix missing content hash
            if (task.filePath && !task.contentHash) {
                try {
                    const fileContent = await this.fileSystemService.readFile(task.filePath, 'utf8');
                    const contentHash = await this.contentHashService.generateContentHash(fileContent);
                    
                    await this.taskRepository.update(taskId, {
                        contentHash,
                        lastSyncedAt: new Date().toISOString()
                    });
                    
                    fixesApplied.push('Generated and stored content hash');
                } catch (error) {
                    this.logger.warn('Failed to fix missing content hash', {
                        taskId,
                        error: error.message
                    });
                }
            }

            // Fix status mismatch
            if (task.filePath && validationResult.details.fileStatus) {
                try {
                    const fileContent = await this.fileSystemService.readFile(task.filePath, 'utf8');
                    const fileStatus = await this.contentHashService.extractStatusFromContent(fileContent);
                    
                    if (fileStatus !== (task.status?.value || task.status)) {
                        await this.taskRepository.update(taskId, {
                            status: fileStatus,
                            lastSyncedAt: new Date().toISOString()
                        });
                        
                        fixesApplied.push(`Updated status from '${task.status?.value || task.status}' to '${fileStatus}'`);
                    }
                } catch (error) {
                    this.logger.warn('Failed to fix status mismatch', {
                        taskId,
                        error: error.message
                    });
                }
            }

            // Update sync timestamp
            await this.taskRepository.update(taskId, {
                lastSyncedAt: new Date().toISOString()
            });

            fixesApplied.push('Updated last sync timestamp');

            this.logger.info('Auto-fix completed', {
                taskId,
                fixesApplied: fixesApplied.length
            });

            return {
                success: true,
                message: `Applied ${fixesApplied.length} fixes`,
                fixesApplied
            };

        } catch (error) {
            this.logger.error('Failed to auto-fix consistency issues', {
                taskId,
                error: error.message
            });
            throw error;
        }
    }
}

module.exports = TaskStatusValidator;
