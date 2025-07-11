/**
 * WorkflowPersistenceService
 * Service for managing workflow persistence operations and data management
 */
const { v4: uuidv4 } = require('uuid');

class WorkflowPersistenceService {
  constructor(workflowRepository, logger = console) {
    this.workflowRepository = workflowRepository;
    this.logger = logger;
  }

  /**
   * Create workflow execution
   * @param {Object} executionData - Execution data
   * @returns {Promise<Object>} Created execution
   */
  async createWorkflowExecution(executionData) {
    try {
      this.logger.info('WorkflowPersistenceService: Creating workflow execution', {
        workflowId: executionData.workflowId,
        workflowName: executionData.workflowName
      });

      const execution = await this.workflowRepository.saveExecution(executionData);
      
      this.logger.info('WorkflowPersistenceService: Workflow execution created successfully', {
        executionId: execution.execution_id
      });

      return execution;
    } catch (error) {
      this.logger.error('WorkflowPersistenceService: Failed to create workflow execution', {
        workflowId: executionData.workflowId,
        error: error.message
      });
      throw new Error(`Failed to create workflow execution: ${error.message}`);
    }
  }

  /**
   * Update workflow execution
   * @param {string} executionId - Execution ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Updated execution
   */
  async updateWorkflowExecution(executionId, updates) {
    try {
      this.logger.info('WorkflowPersistenceService: Updating workflow execution', {
        executionId,
        updates: Object.keys(updates)
      });

      const execution = await this.workflowRepository.updateExecution(executionId, updates);
      
      this.logger.info('WorkflowPersistenceService: Workflow execution updated successfully', {
        executionId,
        status: updates.status
      });

      return execution;
    } catch (error) {
      this.logger.error('WorkflowPersistenceService: Failed to update workflow execution', {
        executionId,
        error: error.message
      });
      throw new Error(`Failed to update workflow execution: ${error.message}`);
    }
  }

  /**
   * Get workflow execution
   * @param {string} executionId - Execution ID
   * @returns {Promise<Object|null>} Execution or null
   */
  async getWorkflowExecution(executionId) {
    try {
      this.logger.debug('WorkflowPersistenceService: Getting workflow execution', {
        executionId
      });

      const execution = await this.workflowRepository.getExecutionWithMetrics(executionId);
      
      if (!execution) {
        this.logger.warn('WorkflowPersistenceService: Workflow execution not found', {
          executionId
        });
      } else {
        this.logger.debug('WorkflowPersistenceService: Workflow execution retrieved successfully', {
          executionId,
          status: execution.status
        });
      }

      return execution;
    } catch (error) {
      this.logger.error('WorkflowPersistenceService: Failed to get workflow execution', {
        executionId,
        error: error.message
      });
      throw new Error(`Failed to get workflow execution: ${error.message}`);
    }
  }

  /**
   * Find workflow executions
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Executions
   */
  async findWorkflowExecutions(filters = {}, options = {}) {
    try {
      this.logger.debug('WorkflowPersistenceService: Finding workflow executions', {
        filters,
        options
      });

      let executions = [];

      if (filters.workflowId) {
        executions = await this.workflowRepository.findExecutionsByWorkflowId(filters.workflowId, options);
      } else if (filters.taskId) {
        executions = await this.workflowRepository.findExecutionsByTaskId(filters.taskId);
      } else if (filters.userId) {
        executions = await this.workflowRepository.findExecutionsByUserId(filters.userId, options);
      } else if (filters.status) {
        executions = await this.workflowRepository.findExecutionsByStatus(filters.status, options);
      } else {
        // Default: get all executions with options
        executions = await this.workflowRepository.findExecutionsByWorkflowId('*', options);
      }

      this.logger.debug('WorkflowPersistenceService: Workflow executions found', {
        count: executions.length,
        filters
      });

      return executions;
    } catch (error) {
      this.logger.error('WorkflowPersistenceService: Failed to find workflow executions', {
        filters,
        error: error.message
      });
      throw new Error(`Failed to find workflow executions: ${error.message}`);
    }
  }

  /**
   * Delete workflow execution
   * @param {string} executionId - Execution ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteWorkflowExecution(executionId) {
    try {
      this.logger.info('WorkflowPersistenceService: Deleting workflow execution', {
        executionId
      });

      const success = await this.workflowRepository.deleteExecution(executionId);
      
      if (success) {
        this.logger.info('WorkflowPersistenceService: Workflow execution deleted successfully', {
          executionId
        });
      } else {
        this.logger.warn('WorkflowPersistenceService: Workflow execution not found for deletion', {
          executionId
        });
      }

      return success;
    } catch (error) {
      this.logger.error('WorkflowPersistenceService: Failed to delete workflow execution', {
        executionId,
        error: error.message
      });
      throw new Error(`Failed to delete workflow execution: ${error.message}`);
    }
  }

  /**
   * Record workflow metric
   * @param {string} executionId - Execution ID
   * @param {Object} metric - Metric data
   * @returns {Promise<Object>} Recorded metric
   */
  async recordWorkflowMetric(executionId, metric) {
    try {
      this.logger.debug('WorkflowPersistenceService: Recording workflow metric', {
        executionId,
        metricName: metric.metricName
      });

      const recordedMetric = await this.workflowRepository.recordExecutionMetrics(executionId, metric);
      
      this.logger.debug('WorkflowPersistenceService: Workflow metric recorded successfully', {
        executionId,
        metricName: metric.metricName
      });

      return recordedMetric;
    } catch (error) {
      this.logger.error('WorkflowPersistenceService: Failed to record workflow metric', {
        executionId,
        metricName: metric.metricName,
        error: error.message
      });
      throw new Error(`Failed to record workflow metric: ${error.message}`);
    }
  }

  /**
   * Get workflow metrics
   * @param {string} executionId - Execution ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Metrics
   */
  async getWorkflowMetrics(executionId, options = {}) {
    try {
      this.logger.debug('WorkflowPersistenceService: Getting workflow metrics', {
        executionId,
        options
      });

      const metrics = await this.workflowRepository.getMetricsForExecution(executionId, options);
      
      this.logger.debug('WorkflowPersistenceService: Workflow metrics retrieved successfully', {
        executionId,
        count: metrics.length
      });

      return metrics;
    } catch (error) {
      this.logger.error('WorkflowPersistenceService: Failed to get workflow metrics', {
        executionId,
        error: error.message
      });
      throw new Error(`Failed to get workflow metrics: ${error.message}`);
    }
  }

  /**
   * Get workflow statistics
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Statistics
   */
  async getWorkflowStatistics(filters = {}) {
    try {
      this.logger.debug('WorkflowPersistenceService: Getting workflow statistics', {
        filters
      });

      const statistics = await this.workflowRepository.getExecutionStatistics(filters);
      
      this.logger.debug('WorkflowPersistenceService: Workflow statistics retrieved successfully', {
        totalExecutions: statistics.executions.total_executions
      });

      return statistics;
    } catch (error) {
      this.logger.error('WorkflowPersistenceService: Failed to get workflow statistics', {
        filters,
        error: error.message
      });
      throw new Error(`Failed to get workflow statistics: ${error.message}`);
    }
  }

  /**
   * Get aggregated metrics
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} Aggregated metrics
   */
  async getAggregatedMetrics(filters = {}) {
    try {
      this.logger.debug('WorkflowPersistenceService: Getting aggregated metrics', {
        filters
      });

      const metrics = await this.workflowRepository.getAggregatedMetrics(filters);
      
      this.logger.debug('WorkflowPersistenceService: Aggregated metrics retrieved successfully', {
        count: metrics.length
      });

      return metrics;
    } catch (error) {
      this.logger.error('WorkflowPersistenceService: Failed to get aggregated metrics', {
        filters,
        error: error.message
      });
      throw new Error(`Failed to get aggregated metrics: ${error.message}`);
    }
  }

  /**
   * Get metrics statistics
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Metrics statistics
   */
  async getMetricsStatistics(filters = {}) {
    try {
      this.logger.debug('WorkflowPersistenceService: Getting metrics statistics', {
        filters
      });

      const statistics = await this.workflowRepository.getMetricsStatistics(filters);
      
      this.logger.debug('WorkflowPersistenceService: Metrics statistics retrieved successfully', {
        totalMetrics: statistics.total_metrics
      });

      return statistics;
    } catch (error) {
      this.logger.error('WorkflowPersistenceService: Failed to get metrics statistics', {
        filters,
        error: error.message
      });
      throw new Error(`Failed to get metrics statistics: ${error.message}`);
    }
  }

  /**
   * Clean up old executions
   * @param {number} daysOld - Number of days old to clean up
   * @returns {Promise<number>} Number of deleted executions
   */
  async cleanupOldExecutions(daysOld = 30) {
    try {
      this.logger.info('WorkflowPersistenceService: Cleaning up old executions', {
        daysOld
      });

      const deletedCount = await this.workflowRepository.cleanupOldExecutions(daysOld);
      
      this.logger.info('WorkflowPersistenceService: Cleanup completed successfully', {
        deletedCount,
        daysOld
      });

      return deletedCount;
    } catch (error) {
      this.logger.error('WorkflowPersistenceService: Failed to cleanup old executions', {
        daysOld,
        error: error.message
      });
      throw new Error(`Failed to cleanup old executions: ${error.message}`);
    }
  }

  /**
   * Bulk create workflow executions
   * @param {Array<Object>} executions - Array of execution data
   * @returns {Promise<Array>} Created executions
   */
  async bulkCreateWorkflowExecutions(executions) {
    try {
      this.logger.info('WorkflowPersistenceService: Bulk creating workflow executions', {
        count: executions.length
      });

      const createdExecutions = [];
      const errors = [];

      for (const executionData of executions) {
        try {
          const execution = await this.createWorkflowExecution(executionData);
          createdExecutions.push(execution);
        } catch (error) {
          errors.push({
            executionData,
            error: error.message
          });
          this.logger.error('WorkflowPersistenceService: Failed to create execution in bulk', {
            workflowId: executionData.workflowId,
            error: error.message
          });
        }
      }

      this.logger.info('WorkflowPersistenceService: Bulk creation completed', {
        created: createdExecutions.length,
        errors: errors.length,
        total: executions.length
      });

      return {
        created: createdExecutions,
        errors,
        summary: {
          total: executions.length,
          created: createdExecutions.length,
          failed: errors.length
        }
      };
    } catch (error) {
      this.logger.error('WorkflowPersistenceService: Failed to bulk create workflow executions', {
        count: executions.length,
        error: error.message
      });
      throw new Error(`Failed to bulk create workflow executions: ${error.message}`);
    }
  }

  /**
   * Bulk update workflow executions
   * @param {Array<Object>} updates - Array of update data with executionId
   * @returns {Promise<Object>} Update results
   */
  async bulkUpdateWorkflowExecutions(updates) {
    try {
      this.logger.info('WorkflowPersistenceService: Bulk updating workflow executions', {
        count: updates.length
      });

      const updatedExecutions = [];
      const errors = [];

      for (const update of updates) {
        try {
          const { executionId, ...updateData } = update;
          const execution = await this.updateWorkflowExecution(executionId, updateData);
          updatedExecutions.push(execution);
        } catch (error) {
          errors.push({
            update,
            error: error.message
          });
          this.logger.error('WorkflowPersistenceService: Failed to update execution in bulk', {
            executionId: update.executionId,
            error: error.message
          });
        }
      }

      this.logger.info('WorkflowPersistenceService: Bulk update completed', {
        updated: updatedExecutions.length,
        errors: errors.length,
        total: updates.length
      });

      return {
        updated: updatedExecutions,
        errors,
        summary: {
          total: updates.length,
          updated: updatedExecutions.length,
          failed: errors.length
        }
      };
    } catch (error) {
      this.logger.error('WorkflowPersistenceService: Failed to bulk update workflow executions', {
        count: updates.length,
        error: error.message
      });
      throw new Error(`Failed to bulk update workflow executions: ${error.message}`);
    }
  }

  /**
   * Export workflow data
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Exported data
   */
  async exportWorkflowData(filters = {}, options = {}) {
    try {
      this.logger.info('WorkflowPersistenceService: Exporting workflow data', {
        filters,
        options
      });

      const executions = await this.findWorkflowExecutions(filters, { ...options, limit: 10000 });
      const statistics = await this.getWorkflowStatistics(filters);
      const aggregatedMetrics = await this.getAggregatedMetrics(filters);

      const exportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          filters,
          options,
          summary: {
            executions: executions.length,
            statistics,
            metrics: aggregatedMetrics.length
          }
        },
        executions,
        statistics,
        aggregatedMetrics
      };

      this.logger.info('WorkflowPersistenceService: Workflow data exported successfully', {
        executionsCount: executions.length,
        metricsCount: aggregatedMetrics.length
      });

      return exportData;
    } catch (error) {
      this.logger.error('WorkflowPersistenceService: Failed to export workflow data', {
        filters,
        error: error.message
      });
      throw new Error(`Failed to export workflow data: ${error.message}`);
    }
  }

  /**
   * Set logger
   * @param {Object} logger - Logger instance
   */
  setLogger(logger) {
    this.logger = logger;
  }
}

module.exports = WorkflowPersistenceService; 