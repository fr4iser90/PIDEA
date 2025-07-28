/**
 * QueueHistoryService - Domain service for queue history management and persistence
 * Provides comprehensive history tracking with strict error handling (no fallbacks)
 */

const ServiceLogger = require('@logging/ServiceLogger');

// Custom error classes for strict error handling
class InvalidWorkflowDataError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidWorkflowDataError';
    this.code = 'InvalidWorkflowDataError';
  }
}

class InvalidFilterError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidFilterError';
    this.code = 'InvalidFilterError';
  }
}

class InvalidRetentionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidRetentionError';
    this.code = 'InvalidRetentionError';
  }
}

class HistoryItemNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'HistoryItemNotFoundError';
    this.code = 'HistoryItemNotFoundError';
  }
}

class QueueHistoryService {
  constructor(dependencies = {}) {
    this.logger = new ServiceLogger('QueueHistoryService');
    this.repository = dependencies.queueHistoryRepository;
    this.cache = dependencies.cacheService;
    this.eventBus = dependencies.eventBus;
    
    if (!this.repository) {
      throw new Error('QueueHistoryRepository is required');
    }
    
    this.logger.info('QueueHistoryService initialized');
  }

  /**
   * Persist workflow history to database
   * @param {Object} workflowData - Workflow execution data
   * @returns {Promise<Object>} Persisted history item
   */
  async persistWorkflowHistory(workflowData) {
    try {
      this.logger.debug('Persisting workflow history', { 
        workflowId: workflowData?.id,
        type: workflowData?.type 
      });

      // Validate workflow data - throw error if invalid
      if (!workflowData || !workflowData.id) {
        throw new InvalidWorkflowDataError('Workflow data is required and must have an ID');
      }

      if (!workflowData.type) {
        throw new InvalidWorkflowDataError('Workflow type is required');
      }

      if (!workflowData.status) {
        throw new InvalidWorkflowDataError('Workflow status is required');
      }

      // Prepare history data
      const historyData = {
        workflowId: workflowData.id,
        workflowType: workflowData.type,
        status: workflowData.status,
        createdAt: workflowData.createdAt || new Date().toISOString(),
        completedAt: workflowData.completedAt || null,
        executionTimeMs: workflowData.executionTimeMs || null,
        errorMessage: workflowData.errorMessage || null,
        metadata: workflowData.metadata || {},
        stepsData: workflowData.stepsData || [],
        createdBy: workflowData.userId || 'me'
      };

      // Store in database
      const history = await this.repository.create(historyData);

      // Emit event for real-time updates
      if (this.eventBus) {
        this.eventBus.emit('queue:history:created', {
          workflowId: workflowData.id,
          history
        });
      }

      this.logger.info('Workflow history persisted', { 
        workflowId: workflowData.id,
        historyId: history.id 
      });

      return history;

    } catch (error) {
      this.logger.error('Failed to persist workflow history', { 
        workflowId: workflowData?.id,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get workflow history with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} History items with pagination metadata
   */
  async getWorkflowHistory(filters = {}, pagination = { page: 1, limit: 20 }) {
    try {
      this.logger.debug('Getting workflow history', { filters, pagination });

      // Validate filters - throw error if invalid
      if (filters && !this.validateFilters(filters)) {
        throw new InvalidFilterError('Invalid filter parameters provided');
      }

      // Validate pagination - throw error if invalid
      if (pagination.page < 1) {
        throw new InvalidFilterError('Page number must be at least 1');
      }

      if (pagination.limit < 1 || pagination.limit > 100) {
        throw new InvalidFilterError('Limit must be between 1 and 100');
      }

      // Get history from repository
      const result = await this.repository.find(filters, pagination);

      this.logger.debug('Workflow history retrieved', { 
        itemCount: result.items?.length || 0,
        totalItems: result.pagination?.totalItems || 0
      });

      return result;

    } catch (error) {
      this.logger.error('Failed to get workflow history', { 
        filters, 
        pagination, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get specific history item by ID
   * @param {string} historyId - History item ID
   * @returns {Promise<Object>} History item
   */
  async getHistoryItem(historyId) {
    try {
      this.logger.debug('Getting history item', { historyId });

      if (!historyId) {
        throw new InvalidWorkflowDataError('History item ID is required');
      }



      // Get from database
      const history = await this.repository.findById(historyId);
      
      if (!history) {
        throw new HistoryItemNotFoundError(`History item ${historyId} not found`);
      }



      this.logger.debug('History item retrieved', { historyId });

      return history;

    } catch (error) {
      this.logger.error('Failed to get history item', { 
        historyId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Update history item
   * @param {string} historyId - History item ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated history item
   */
  async updateHistoryItem(historyId, updates) {
    try {
      this.logger.debug('Updating history item', { historyId, updates });

      if (!historyId) {
        throw new InvalidWorkflowDataError('History item ID is required');
      }

      if (!updates || Object.keys(updates).length === 0) {
        throw new InvalidWorkflowDataError('Updates object is required and cannot be empty');
      }

      // Update in database
      const updatedHistory = await this.repository.update(historyId, updates);

      if (!updatedHistory) {
        throw new HistoryItemNotFoundError(`History item ${historyId} not found`);
      }



      // Emit event for real-time updates
      if (this.eventBus) {
        this.eventBus.emit('queue:history:updated', {
          historyId,
          history: updatedHistory
        });
      }

      this.logger.info('History item updated', { historyId });

      return updatedHistory;

    } catch (error) {
      this.logger.error('Failed to update history item', { 
        historyId, 
        updates, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Clean up old history items based on retention policy
   * @param {number} retentionDays - Number of days to retain
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOldHistory(retentionDays) {
    try {
      this.logger.info('Starting history cleanup', { retentionDays });

      // Validate retention period - throw error if invalid
      if (!retentionDays || retentionDays < 1) {
        throw new InvalidRetentionError('Retention days must be at least 1');
      }

      if (retentionDays > 365) {
        throw new InvalidRetentionError('Retention days cannot exceed 365');
      }

      const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));
      
      // Delete old history items
      const result = await this.repository.deleteOlderThan(cutoffDate);



      // Emit cleanup event
      if (this.eventBus) {
        this.eventBus.emit('queue:history:cleaned', {
          deletedCount: result.deletedCount,
          retentionDays
        });
      }

      this.logger.info('History cleanup completed', { 
        deletedCount: result.deletedCount,
        retentionDays 
      });

      return result;

    } catch (error) {
      this.logger.error('Failed to cleanup old history', { 
        retentionDays, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get history statistics
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} History statistics
   */
  async getHistoryStatistics(filters = {}) {
    try {
      this.logger.debug('Getting history statistics', { filters });

      // Validate filters
      if (filters && !this.validateFilters(filters)) {
        throw new InvalidFilterError('Invalid filter parameters provided');
      }

      const statistics = await this.repository.getStatistics(filters);

      this.logger.debug('History statistics retrieved', { statistics });

      return statistics;

    } catch (error) {
      this.logger.error('Failed to get history statistics', { 
        filters, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Validate filter parameters
   * @param {Object} filters - Filter criteria
   * @returns {boolean} True if valid
   */
  validateFilters(filters) {
    const validFilters = ['type', 'status', 'startDate', 'endDate', 'search'];
    // Use central WorkflowTypes constants
    const WorkflowTypes = require('@domain/constants/WorkflowTypes');
    const validTypes = WorkflowTypes.getAllTypes();
    const validStatuses = ['completed', 'failed', 'cancelled'];

    // Check for invalid filter keys
    for (const key of Object.keys(filters)) {
      if (!validFilters.includes(key)) {
        return false;
      }
    }

    // Validate type filter
    if (filters.type && !validTypes.includes(filters.type)) {
      return false;
    }

    // Validate status filter
    if (filters.status && !validStatuses.includes(filters.status)) {
      return false;
    }

    // Validate date filters
    if (filters.startDate && isNaN(Date.parse(filters.startDate))) {
      return false;
    }

    if (filters.endDate && isNaN(Date.parse(filters.endDate))) {
      return false;
    }

    // Validate date range
    if (filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      if (startDate > endDate) {
        return false;
      }
    }

    return true;
  }

  /**
   * Export history to CSV format
   * @param {Object} filters - Filter criteria
   * @returns {Promise<string>} CSV data
   */
  async exportHistoryToCSV(filters = {}) {
    try {
      this.logger.info('Exporting history to CSV', { filters });

      // Validate filters
      if (filters && !this.validateFilters(filters)) {
        throw new InvalidFilterError('Invalid filter parameters provided');
      }

      // Get all history items (no pagination for export)
      const result = await this.repository.find(filters, { page: 1, limit: 10000 });

      if (!result.items || result.items.length === 0) {
        return 'ID,Type,Status,Created At,Completed At,Duration (ms),Error Message\n';
      }

      // Generate CSV
      const csvHeader = 'ID,Type,Status,Created At,Completed At,Duration (ms),Error Message\n';
      const csvRows = result.items.map(item => {
        const duration = item.executionTimeMs || '';
        const errorMessage = item.errorMessage ? `"${item.errorMessage.replace(/"/g, '""')}"` : '';
        return `${item.id},${item.workflowType},${item.status},${item.createdAt},${item.completedAt || ''},${duration},${errorMessage}`;
      });

      const csv = csvHeader + csvRows.join('\n');

      this.logger.info('History exported to CSV', { 
        itemCount: result.items.length 
      });

      return csv;

    } catch (error) {
      this.logger.error('Failed to export history to CSV', { 
        filters, 
        error: error.message 
      });
      throw error;
    }
  }
}

module.exports = QueueHistoryService; 