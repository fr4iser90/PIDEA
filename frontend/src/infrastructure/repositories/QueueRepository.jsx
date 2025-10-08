/**
 * QueueRepository - Frontend repository for queue management API communication
 * Provides comprehensive queue operations and real-time updates
 */

import { logger } from '@/infrastructure/logging/Logger';
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';

class QueueRepository {
    constructor() {
        this.baseURL = '/api';
        this.logger = logger;
    }

    /**
     * Get queue status for a project
     * @param {string} projectId - Project identifier
     * @returns {Promise<Object>} Queue status
     */
    async getQueueStatus(projectId) {
        try {
            this.logger.debug('Getting queue status', { projectId });

            const response = await fetch(`${this.baseURL}/projects/${projectId}/queue/status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get queue status: ${response.statusText}`);
            }

            const data = await response.json();
            this.logger.debug('Queue status retrieved', { projectId, itemCount: data.data?.queue?.total || 0 });

            return data.data;

        } catch (error) {
            this.logger.error('Failed to get queue status', { projectId, error: error.message });
            throw error;
        }
    }

    /**
     * Add item to project queue
     * @param {string} projectId - Project identifier
     * @param {Object} workflow - Workflow to execute
     * @param {Object} context - Execution context
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Queue item
     */
    async addToQueue(projectId, workflow, context = {}, options = {}) {
        try {
            this.logger.info('Adding item to queue', { 
                projectId, 
                taskMode: workflow?.type,
                priority: options.priority || 'normal'
            });

            const response = await fetch(`${this.baseURL}/projects/${projectId}/queue/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    workflow,
                    context,
                    options
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to add item to queue: ${response.statusText}`);
            }

            const data = await response.json();
            this.logger.info('Item added to queue', { 
                projectId, 
                queueItemId: data.data?.id,
                position: data.data?.position
            });

            return data.data;

        } catch (error) {
            this.logger.error('Failed to add item to queue', { 
                projectId, 
                taskMode: workflow?.type,
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Cancel queue item
     * @param {string} projectId - Project identifier
     * @param {string} itemId - Queue item identifier
     * @returns {Promise<Object>} Cancellation result
     */
    async cancelQueueItem(projectId, itemId) {
        try {
            this.logger.info('Cancelling queue item', { projectId, itemId });

            const response = await fetch(`${this.baseURL}/projects/${projectId}/queue/${itemId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to cancel queue item: ${response.statusText}`);
            }

            const data = await response.json();
            this.logger.info('Queue item cancelled', { projectId, itemId });

            return data.data;

        } catch (error) {
            this.logger.error('Failed to cancel queue item', { 
                projectId, 
                itemId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Update queue item priority
     * @param {string} projectId - Project identifier
     * @param {string} itemId - Queue item identifier
     * @param {string} priority - New priority level
     * @returns {Promise<Object>} Update result
     */
    async updateQueueItemPriority(projectId, itemId, priority) {
        try {
            this.logger.info('Updating queue item priority', { 
                projectId, 
                itemId, 
                priority 
            });

            const response = await fetch(`${this.baseURL}/projects/${projectId}/queue/${itemId}/priority`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({ priority })
            });

            if (!response.ok) {
                throw new Error(`Failed to update queue item priority: ${response.statusText}`);
            }

            const data = await response.json();
            this.logger.info('Queue item priority updated', { 
                projectId, 
                itemId, 
                oldPriority: data.data?.oldPriority,
                newPriority: data.data?.newPriority
            });

            return data.data;

        } catch (error) {
            this.logger.error('Failed to update queue item priority', { 
                projectId, 
                itemId, 
                priority, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Get step progress for a task
     * @param {string} projectId - Project identifier
     * @param {string} taskId - Task identifier
     * @returns {Promise<Object>} Step progress
     */
    async getStepProgress(projectId, taskId) {
        try {
            this.logger.debug('Getting step progress', { projectId, taskId });

            const response = await fetch(`${this.baseURL}/projects/${projectId}/queue/${taskId}/step-progress`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get step progress: ${response.statusText}`);
            }

            const data = await response.json();
            this.logger.debug('Step progress retrieved', { 
                projectId, 
                taskId, 
                currentStep: data.data?.currentStep,
                progressPercentage: data.data?.progressPercentage
            });

            return data.data;

        } catch (error) {
            this.logger.error('Failed to get step progress', { 
                projectId, 
                taskId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Toggle step status (pause/resume)
     * @param {string} projectId - Project identifier
     * @param {string} taskId - Task identifier
     * @param {string} stepId - Step identifier
     * @param {string} action - Action to perform ('pause' or 'resume')
     * @returns {Promise<Object>} Toggle result
     */
    async toggleStepStatus(projectId, taskId, stepId, action) {
        try {
            this.logger.info('Toggling step status', { 
                projectId, 
                taskId, 
                stepId, 
                action 
            });

            const response = await fetch(`${this.baseURL}/projects/${projectId}/queue/${taskId}/step/${stepId}/toggle`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({ action })
            });

            if (!response.ok) {
                throw new Error(`Failed to toggle step status: ${response.statusText}`);
            }

            const data = await response.json();
            this.logger.info('Step status toggled', { 
                projectId, 
                taskId, 
                stepId, 
                action,
                oldStatus: data.data?.oldStatus,
                newStatus: data.data?.newStatus
            });

            return data.data;

        } catch (error) {
            this.logger.error('Failed to toggle step status', { 
                projectId, 
                taskId, 
                stepId, 
                action, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Get queue statistics
     * @param {string} projectId - Project identifier
     * @returns {Promise<Object>} Queue statistics
     */
    async getQueueStatistics(projectId) {
        try {
            this.logger.debug('Getting queue statistics', { projectId });

            const response = await fetch(`${this.baseURL}/projects/${projectId}/queue/statistics`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get queue statistics: ${response.statusText}`);
            }

            const data = await response.json();
            this.logger.debug('Queue statistics retrieved', { 
                projectId, 
                totalItems: data.data?.totalItems,
                successRate: data.data?.successRate
            });

            return data.data;

        } catch (error) {
            this.logger.error('Failed to get queue statistics', { 
                projectId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Clear completed items from queue
     * @param {string} projectId - Project identifier
     * @returns {Promise<Object>} Clear result
     */
    async clearCompletedItems(projectId) {
        try {
            this.logger.info('Clearing completed items', { projectId });

            const response = await fetch(`${this.baseURL}/projects/${projectId}/queue/clear-completed`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to clear completed items: ${response.statusText}`);
            }

            const data = await response.json();
            this.logger.info('Completed items cleared', { 
                projectId, 
                clearedCount: data.data?.clearedCount,
                remainingCount: data.data?.remainingCount
            });

            return data.data;

        } catch (error) {
            this.logger.error('Failed to clear completed items', { 
                projectId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Get authentication token
     * @returns {string} Auth token
     */
    getAuthToken() {
        const { token } = useAuthStore.getState();
        return token;
    }

    /**
     * Format queue item for display
     * @param {Object} item - Queue item
     * @returns {Object} Formatted queue item
     */
    formatQueueItem(item) {
        return {
            ...item,
            formattedAddedAt: new Date(item.addedAt).toLocaleString(),
            formattedEstimatedStartTime: item.estimatedStartTime ? 
                new Date(item.estimatedStartTime).toLocaleString() : null,
            priorityLabel: this.getPriorityLabel(item.options?.priority),
            statusLabel: this.getStatusLabel(item.status),
            taskModeLabel: this.gettaskModeLabel(item.workflow?.type)
        };
    }

    /**
     * Get priority label
     * @param {string} priority - Priority level
     * @returns {string} Priority label
     */
    getPriorityLabel(priority) {
        const labels = {
            high: 'High',
            normal: 'Normal',
            low: 'Low'
        };
        return labels[priority] || 'Normal';
    }

    /**
     * Get status label
     * @param {string} status - Status
     * @returns {string} Status label
     */
    getStatusLabel(status) {
        const labels = {
            queued: 'Queued',
            running: 'Running',
            completed: 'Completed',
            failed: 'Failed',
            cancelled: 'Cancelled',
            paused: 'Paused'
        };
        return labels[status] || 'Unknown';
    }

    /**
     * Get workflow type label
     * @param {string} type - Workflow type
     * @returns {string} Workflow type label
     */
    gettaskModeLabel(type) {
        const labels = {
            refactoring: 'Refactoring',
            testing: 'Testing',
            analysis: 'Analysis',
            feature: 'Feature',
            bugfix: 'Bug Fix',
            documentation: 'Documentation',
            manual: 'Manual',
            optimization: 'Optimization',
            security: 'Security',
            generic: 'Generic'
        };
        return labels[type] || 'Unknown';
    }

    /**
     * Calculate estimated wait time
     * @param {Array} queuedItems - Queued items
     * @returns {number} Estimated wait time in milliseconds
     */
    calculateEstimatedWaitTime(queuedItems) {
        if (!queuedItems || queuedItems.length === 0) return 0;
        
        const averageProcessingTime = 30000; // 30 seconds default
        return queuedItems.length * averageProcessingTime;
    }

    /**
     * Format duration
     * @param {number} milliseconds - Duration in milliseconds
     * @returns {string} Formatted duration
     */
    formatDuration(milliseconds) {
        if (!milliseconds || milliseconds === 0) return '0s';
        
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    // ============================================================================
    // QUEUE HISTORY METHODS
    // ============================================================================

    /**
     * Get queue history with filtering and pagination
     * @param {Object} filters - Filter criteria
     * @param {Object} pagination - Pagination options
     * @returns {Promise<Object>} History data with pagination
     */
    async getQueueHistory(projectId, filters = {}, pagination = { page: 1, limit: 20 }) {
        try {
            this.logger.debug('Getting queue history', { projectId, filters, pagination });

            const params = new URLSearchParams();
            
            // Add filters
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
            
            // Add pagination
            params.append('page', pagination.page);
            params.append('limit', pagination.limit);
            
            const response = await fetch(`${this.baseURL}/projects/${projectId}/queue/history?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get queue history: ${response.statusText}`);
            }

            const data = await response.json();
            this.logger.debug('Queue history retrieved', { 
                itemCount: data.data?.items?.length || 0 
            });

            return data.data;

        } catch (error) {
            this.logger.error('Failed to get queue history', { filters, pagination, error: error.message });
            throw error;
        }
    }

    /**
     * Get specific history item by ID
     * @param {string} historyId - History item ID
     * @returns {Promise<Object>} History item
     */
    async getHistoryItem(projectId, historyId) {
        try {
            this.logger.debug('Getting history item', { projectId, historyId });

            if (!historyId) {
                throw new Error('History item ID is required');
            }

            const response = await fetch(`${this.baseURL}/projects/${projectId}/queue/history/${historyId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get history item: ${response.statusText}`);
            }

            const data = await response.json();
            this.logger.debug('History item retrieved', { historyId });

            return data.data;

        } catch (error) {
            this.logger.error('Failed to get history item', { historyId, error: error.message });
            throw error;
        }
    }

    /**
     * Delete old history items based on retention policy
     * @param {number} retentionDays - Number of days to retain
     * @returns {Promise<Object>} Deletion result
     */
    async deleteHistory(projectId, retentionDays = 30) {
        try {
            this.logger.debug('Deleting old history items', { projectId, retentionDays });

            if (!retentionDays || retentionDays < 1) {
                throw new Error('Retention days must be at least 1');
            }

            const response = await fetch(`${this.baseURL}/projects/${projectId}/queue/history`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({ retentionDays })
            });

            if (!response.ok) {
                throw new Error(`Failed to delete history: ${response.statusText}`);
            }

            const data = await response.json();
            this.logger.debug('History items deleted', { 
                deletedCount: data.data?.deletedCount || 0 
            });

            return data.data;

        } catch (error) {
            this.logger.error('Failed to delete history', { retentionDays, error: error.message });
            throw error;
        }
    }

    /**
     * Export history to CSV format
     * @param {Object} filters - Filter criteria
     * @returns {Promise<string>} CSV data
     */
    async exportHistoryToCSV(projectId, filters = {}) {
        try {
            this.logger.debug('Exporting history to CSV', { projectId, filters });

            const params = new URLSearchParams();
            
            // Add filters
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });

            const response = await fetch(`${this.baseURL}/projects/${projectId}/queue/history/export?${params}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to export history: ${response.statusText}`);
            }

            const csv = await response.text();
            this.logger.debug('History exported to CSV', { filters });

            return csv;

        } catch (error) {
            this.logger.error('Failed to export history', { filters, error: error.message });
            throw error;
        }
    }

    /**
     * Get history statistics
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Object>} Statistics
     */
    async getHistoryStatistics(projectId, filters = {}) {
        try {
            this.logger.debug('Getting history statistics', { projectId, filters });

            const params = new URLSearchParams();
            
            // Add filters
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });

            const response = await fetch(`${this.baseURL}/projects/${projectId}/queue/history/statistics?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get history statistics: ${response.statusText}`);
            }

            const data = await response.json();
            this.logger.debug('History statistics retrieved', { filters });

            return data.data;

        } catch (error) {
            this.logger.error('Failed to get history statistics', { filters, error: error.message });
            throw error;
        }
    }

    // ============================================================================
    // WORKFLOW TYPE DETECTION METHODS
    // ============================================================================

    /**
     * Get workflow type for a specific task
     * @param {string} projectId - Project identifier
     * @param {string} taskId - Task identifier
     * @returns {Promise<string>} Workflow type
     */
    async gettaskMode(projectId, taskId) {
        try {
            this.logger.debug('Loading workflow type for active task', { projectId, taskId });

            // For now, return a default type since we don't have a specific endpoint
            // This will be enhanced when the backend provides workflow type detection
            return 'workflow';

        } catch (error) {
            this.logger.error('Failed to load workflow type for active task', { 
                projectId, 
                taskId, 
                error: error.message 
            });
            return 'unknown';
        }
    }

    /**
     * Detect workflow type from workflow data
     * @param {Object} workflowData - Workflow data to analyze
     * @returns {Promise<Object>} Detection result
     */
    async detecttaskMode(projectId, workflowData) {
        try {
            this.logger.debug('Detecting workflow type', { projectId, workflowId: workflowData?.id });

            if (!workflowData) {
                throw new Error('Workflow data is required');
            }

            const response = await fetch(`${this.baseURL}/projects/${projectId}/queue/type-detect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({ workflowData })
            });

            if (!response.ok) {
                throw new Error(`Failed to detect workflow type: ${response.statusText}`);
            }

            const data = await response.json();
            this.logger.debug('Workflow type detected', { 
                workflowId: workflowData.id,
                type: data.data?.type 
            });

            return data.data;

        } catch (error) {
            this.logger.error('Failed to detect workflow type', { workflowData, error: error.message });
            throw error;
        }
    }

    /**
     * Get list of all known workflow types
     * @returns {Promise<Object>} Workflow types
     */
    async gettaskModes(projectId) {
        try {
            this.logger.debug('Getting workflow types', { projectId });

            const response = await fetch(`${this.baseURL}/projects/${projectId}/queue/types`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get workflow types: ${response.statusText}`);
            }

            const data = await response.json();
            this.logger.debug('Workflow types retrieved', { 
                count: data.data?.types?.length || 0 
            });

            return data.data;

        } catch (error) {
            this.logger.error('Failed to get workflow types', { error: error.message });
            throw error;
        }
    }
}

export default QueueRepository; 