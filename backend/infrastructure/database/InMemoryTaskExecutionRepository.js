/**
 * InMemoryTaskExecutionRepository - In-memory storage for task executions
 */
class InMemoryTaskExecutionRepository {
    constructor() {
        this.executions = new Map();
        this.executionStats = {
            total: 0,
            completed: 0,
            failed: 0,
            running: 0,
            queued: 0
        };
    }

    /**
     * Save execution
     * @param {Object} execution - Execution data
     * @returns {Promise<Object>} Saved execution
     */
    async save(execution) {
        try {
            const executionId = execution.id || this.generateExecutionId();
            const executionData = {
                ...execution,
                id: executionId,
                createdAt: execution.createdAt || new Date(),
                updatedAt: new Date()
            };

            this.executions.set(executionId, executionData);
            this.updateStats(executionData.status);
            
            return executionData;
        } catch (error) {
            throw new Error(`Failed to save execution: ${error.message}`);
        }
    }

    /**
     * Find execution by ID
     * @param {string} id - Execution ID
     * @returns {Promise<Object|null>} Execution data
     */
    async findById(id) {
        try {
            return this.executions.get(id) || null;
        } catch (error) {
            throw new Error(`Failed to find execution: ${error.message}`);
        }
    }

    /**
     * Find executions by task ID
     * @param {string} taskId - Task ID
     * @returns {Promise<Array>} Executions for task
     */
    async findByTaskId(taskId) {
        try {
            const taskExecutions = [];
            for (const execution of this.executions.values()) {
                if (execution.taskId === taskId) {
                    taskExecutions.push(execution);
                }
            }
            return taskExecutions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } catch (error) {
            throw new Error(`Failed to find executions by task ID: ${error.message}`);
        }
    }

    /**
     * Find executions by status
     * @param {string} status - Execution status
     * @returns {Promise<Array>} Executions with status
     */
    async findByStatus(status) {
        try {
            const statusExecutions = [];
            for (const execution of this.executions.values()) {
                if (execution.status === status) {
                    statusExecutions.push(execution);
                }
            }
            return statusExecutions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } catch (error) {
            throw new Error(`Failed to find executions by status: ${error.message}`);
        }
    }

    /**
     * Find all executions
     * @param {Object} options - Query options
     * @returns {Promise<Array>} All executions
     */
    async findAll(options = {}) {
        try {
            let executions = Array.from(this.executions.values());
            
            // Apply filters
            if (options.status) {
                executions = executions.filter(exec => exec.status === options.status);
            }
            
            if (options.taskId) {
                executions = executions.filter(exec => exec.taskId === options.taskId);
            }
            
            if (options.startDate) {
                executions = executions.filter(exec => new Date(exec.createdAt) >= new Date(options.startDate));
            }
            
            if (options.endDate) {
                executions = executions.filter(exec => new Date(exec.createdAt) <= new Date(options.endDate));
            }

            // Sort
            const sortField = options.sortBy || 'createdAt';
            const sortOrder = options.sortOrder || 'desc';
            
            executions.sort((a, b) => {
                const aValue = a[sortField];
                const bValue = b[sortField];
                
                if (sortOrder === 'asc') {
                    return aValue > bValue ? 1 : -1;
                } else {
                    return aValue < bValue ? 1 : -1;
                }
            });

            // Pagination
            if (options.limit) {
                const offset = options.offset || 0;
                executions = executions.slice(offset, offset + options.limit);
            }

            return executions;
        } catch (error) {
            throw new Error(`Failed to find all executions: ${error.message}`);
        }
    }

    /**
     * Update execution
     * @param {string} id - Execution ID
     * @param {Object} updates - Update data
     * @returns {Promise<Object>} Updated execution
     */
    async update(id, updates) {
        try {
            const execution = this.executions.get(id);
            if (!execution) {
                throw new Error(`Execution not found: ${id}`);
            }

            const oldStatus = execution.status;
            const updatedExecution = {
                ...execution,
                ...updates,
                updatedAt: new Date()
            };

            this.executions.set(id, updatedExecution);
            
            // Update stats if status changed
            if (oldStatus !== updatedExecution.status) {
                this.updateStats(oldStatus, -1);
                this.updateStats(updatedExecution.status, 1);
            }

            return updatedExecution;
        } catch (error) {
            throw new Error(`Failed to update execution: ${error.message}`);
        }
    }

    /**
     * Delete execution
     * @param {string} id - Execution ID
     * @returns {Promise<boolean>} Success status
     */
    async delete(id) {
        try {
            const execution = this.executions.get(id);
            if (!execution) {
                return false;
            }

            this.updateStats(execution.status, -1);
            this.executions.delete(id);
            return true;
        } catch (error) {
            throw new Error(`Failed to delete execution: ${error.message}`);
        }
    }

    /**
     * Delete executions by task ID
     * @param {string} taskId - Task ID
     * @returns {Promise<number>} Number of deleted executions
     */
    async deleteByTaskId(taskId) {
        try {
            let deletedCount = 0;
            const executionsToDelete = [];

            for (const [id, execution] of this.executions.entries()) {
                if (execution.taskId === taskId) {
                    executionsToDelete.push(id);
                }
            }

            for (const id of executionsToDelete) {
                const execution = this.executions.get(id);
                this.updateStats(execution.status, -1);
                this.executions.delete(id);
                deletedCount++;
            }

            return deletedCount;
        } catch (error) {
            throw new Error(`Failed to delete executions by task ID: ${error.message}`);
        }
    }

    /**
     * Count executions
     * @param {Object} filter - Filter criteria
     * @returns {Promise<number>} Count of executions
     */
    async count(filter = {}) {
        try {
            let executions = Array.from(this.executions.values());
            
            if (filter.status) {
                executions = executions.filter(exec => exec.status === filter.status);
            }
            
            if (filter.taskId) {
                executions = executions.filter(exec => exec.taskId === filter.taskId);
            }
            
            if (filter.startDate) {
                executions = executions.filter(exec => new Date(exec.createdAt) >= new Date(filter.startDate));
            }
            
            if (filter.endDate) {
                executions = executions.filter(exec => new Date(exec.createdAt) <= new Date(filter.endDate));
            }

            return executions.length;
        } catch (error) {
            throw new Error(`Failed to count executions: ${error.message}`);
        }
    }

    /**
     * Get execution statistics
     * @returns {Promise<Object>} Execution statistics
     */
    async getStats() {
        try {
            const stats = { ...this.executionStats };
            
            // Calculate additional stats
            const allExecutions = Array.from(this.executions.values());
            
            if (allExecutions.length > 0) {
                const completedExecutions = allExecutions.filter(exec => exec.status === 'completed');
                const failedExecutions = allExecutions.filter(exec => exec.status === 'failed');
                
                stats.averageExecutionTime = this.calculateAverageExecutionTime(completedExecutions);
                stats.successRate = completedExecutions.length / allExecutions.length;
                stats.failureRate = failedExecutions.length / allExecutions.length;
                
                // Recent activity (last 24 hours)
                const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const recentExecutions = allExecutions.filter(exec => new Date(exec.createdAt) >= last24Hours);
                stats.recentActivity = recentExecutions.length;
            }

            return stats;
        } catch (error) {
            throw new Error(`Failed to get execution stats: ${error.message}`);
        }
    }

    /**
     * Clear all executions
     * @returns {Promise<void>}
     */
    async clear() {
        try {
            this.executions.clear();
            this.resetStats();
        } catch (error) {
            throw new Error(`Failed to clear executions: ${error.message}`);
        }
    }

    /**
     * Find recent executions
     * @param {number} limit - Number of recent executions
     * @returns {Promise<Array>} Recent executions
     */
    async findRecent(limit = 10) {
        try {
            const allExecutions = Array.from(this.executions.values());
            return allExecutions
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, limit);
        } catch (error) {
            throw new Error(`Failed to find recent executions: ${error.message}`);
        }
    }

    /**
     * Find executions by date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Array>} Executions in date range
     */
    async findByDateRange(startDate, endDate) {
        try {
            const executions = [];
            for (const execution of this.executions.values()) {
                const executionDate = new Date(execution.createdAt);
                if (executionDate >= startDate && executionDate <= endDate) {
                    executions.push(execution);
                }
            }
            return executions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } catch (error) {
            throw new Error(`Failed to find executions by date range: ${error.message}`);
        }
    }

    /**
     * Find long running executions
     * @param {number} thresholdMinutes - Threshold in minutes
     * @returns {Promise<Array>} Long running executions
     */
    async findLongRunning(thresholdMinutes = 30) {
        try {
            const longRunning = [];
            const thresholdMs = thresholdMinutes * 60 * 1000;
            const now = new Date();

            for (const execution of this.executions.values()) {
                if (execution.status === 'running') {
                    const startTime = new Date(execution.startTime || execution.createdAt);
                    const duration = now - startTime;
                    
                    if (duration > thresholdMs) {
                        longRunning.push({
                            ...execution,
                            duration: duration,
                            durationMinutes: Math.round(duration / (60 * 1000))
                        });
                    }
                }
            }

            return longRunning.sort((a, b) => b.duration - a.duration);
        } catch (error) {
            throw new Error(`Failed to find long running executions: ${error.message}`);
        }
    }

    // Helper methods

    /**
     * Generate execution ID
     * @returns {string} Execution ID
     */
    generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Update execution statistics
     * @param {string} status - Execution status
     * @param {number} delta - Change in count (default: 1)
     */
    updateStats(status, delta = 1) {
        switch (status) {
            case 'completed':
                this.executionStats.completed += delta;
                break;
            case 'failed':
                this.executionStats.failed += delta;
                break;
            case 'running':
                this.executionStats.running += delta;
                break;
            case 'queued':
                this.executionStats.queued += delta;
                break;
        }
        this.executionStats.total += delta;
    }

    /**
     * Reset execution statistics
     */
    resetStats() {
        this.executionStats = {
            total: 0,
            completed: 0,
            failed: 0,
            running: 0,
            queued: 0
        };
    }

    /**
     * Calculate average execution time
     * @param {Array} executions - Completed executions
     * @returns {number} Average execution time in milliseconds
     */
    calculateAverageExecutionTime(executions) {
        if (executions.length === 0) return 0;

        const totalTime = executions.reduce((sum, exec) => {
            if (exec.startTime && exec.endTime) {
                return sum + (new Date(exec.endTime) - new Date(exec.startTime));
            }
            return sum;
        }, 0);

        return totalTime / executions.length;
    }

    /**
     * Get repository info
     * @returns {Object} Repository information
     */
    getInfo() {
        return {
            type: 'InMemoryTaskExecutionRepository',
            totalExecutions: this.executions.size,
            stats: this.executionStats,
            supportsPagination: true,
            supportsFiltering: true,
            supportsSorting: true
        };
    }
}

module.exports = InMemoryTaskExecutionRepository; 