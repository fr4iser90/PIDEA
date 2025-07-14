/**
 * WorkflowRepository
 * Service for managing workflow persistence and operations
 */
const { v4: uuidv4 } = require('uuid');
const ServiceLogger = require('@logging/ServiceLogger');

class WorkflowRepository {
  constructor(workflowExecutionRepository, workflowMetricsRepository) {
    this.executionRepository = workflowExecutionRepository;
    this.metricsRepository = workflowMetricsRepository;
    this.logger = new ServiceLogger('WorkflowRepository');
  }

  /**
   * Save workflow execution
   * @param {Object} execution - Execution data
   * @returns {Promise<Object>} Saved execution
   */
  async saveExecution(execution) {
    try {
      this.logger.info('WorkflowRepository: Saving workflow execution', {
        executionId: execution.executionId,
        workflowId: execution.workflowId,
        workflowName: execution.workflowName
      });

      // Save execution
      const savedExecution = await this.executionRepository.create(execution);
      
      // Record initial metrics
      await this.recordExecutionMetrics(savedExecution.execution_id, {
        metricName: 'execution_started',
        metricValue: 1,
        metricUnit: 'count',
        metricType: 'performance',
        metricCategory: 'execution_status',
        metadata: { status: 'started' }
      });

      this.logger.info('WorkflowRepository: Workflow execution saved successfully', {
        executionId: savedExecution.execution_id
      });

      return savedExecution;
    } catch (error) {
      this.logger.error('WorkflowRepository: Failed to save workflow execution', {
        executionId: execution.executionId,
        error: error.message
      });
      throw new Error(`Failed to save workflow execution: ${error.message}`);
    }
  }

  /**
   * Update workflow execution
   * @param {string} executionId - Execution ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Updated execution
   */
  async updateExecution(executionId, updates) {
    try {
      this.logger.info('WorkflowRepository: Updating workflow execution', {
        executionId,
        updates: Object.keys(updates)
      });

      const updatedExecution = await this.executionRepository.update(executionId, updates);
      
      // Record completion metrics if execution completed
      if (updates.status === 'completed' && updates.actualDuration) {
        await this.recordExecutionMetrics(executionId, {
          metricName: 'execution_duration',
          metricValue: updates.actualDuration,
          metricUnit: 'milliseconds',
          metricType: 'performance',
          metricCategory: 'execution_time',
          metadata: { status: 'completed' }
        });

        await this.recordExecutionMetrics(executionId, {
          metricName: 'execution_completed',
          metricValue: 1,
          metricUnit: 'count',
          metricType: 'performance',
          metricCategory: 'execution_status',
          metadata: { status: 'completed' }
        });
      }

      // Record failure metrics if execution failed
      if (updates.status === 'failed') {
        await this.recordExecutionMetrics(executionId, {
          metricName: 'execution_failed',
          metricValue: 1,
          metricUnit: 'count',
          metricType: 'performance',
          metricCategory: 'execution_status',
          metadata: { status: 'failed', error: updates.errorData }
        });
      }

      this.logger.info('WorkflowRepository: Workflow execution updated successfully', {
        executionId,
        status: updates.status
      });

      return updatedExecution;
    } catch (error) {
      this.logger.error('WorkflowRepository: Failed to update workflow execution', {
        executionId,
        error: error.message
      });
      throw new Error(`Failed to update workflow execution: ${error.message}`);
    }
  }

  /**
   * Record execution metrics
   * @param {string} executionId - Execution ID
   * @param {Object} metric - Metric data
   * @returns {Promise<Object>} Recorded metric
   */
  async recordExecutionMetrics(executionId, metric) {
    try {
      const metricData = {
        executionId,
        ...metric
      };

      const recordedMetric = await this.metricsRepository.recordMetric(metricData);
      
      this.logger.debug('WorkflowRepository: Metric recorded', {
        executionId,
        metricName: metric.metricName,
        metricValue: metric.metricValue
      });

      return recordedMetric;
    } catch (error) {
      this.logger.error('WorkflowRepository: Failed to record execution metrics', {
        executionId,
        metricName: metric.metricName,
        error: error.message
      });
      throw new Error(`Failed to record execution metrics: ${error.message}`);
    }
  }

  /**
   * Get execution with metrics
   * @param {string} executionId - Execution ID
   * @returns {Promise<Object>} Execution with metrics
   */
  async getExecutionWithMetrics(executionId) {
    try {
      this.logger.debug('WorkflowRepository: Getting execution with metrics', {
        executionId
      });

      const execution = await this.executionRepository.findByExecutionId(executionId);
      if (!execution) {
        this.logger.warn('WorkflowRepository: Execution not found', {
          executionId
        });
        return null;
      }

      const metrics = await this.metricsRepository.getMetricsForExecution(executionId);
      
      const result = {
        ...execution,
        metrics
      };

      this.logger.debug('WorkflowRepository: Execution with metrics retrieved', {
        executionId,
        metricsCount: metrics.length
      });

      return result;
    } catch (error) {
      this.logger.error('WorkflowRepository: Failed to get execution with metrics', {
        executionId,
        error: error.message
      });
      throw new Error(`Failed to get execution with metrics: ${error.message}`);
    }
  }

  /**
   * Get execution statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Statistics
   */
  async getExecutionStatistics(filters = {}) {
    try {
      this.logger.debug('WorkflowRepository: Getting execution statistics', {
        filters
      });

      const executionStats = await this.executionRepository.getStatistics(filters);
      const aggregatedMetrics = await this.metricsRepository.getAggregatedMetrics(filters);
      
      const result = {
        executions: executionStats,
        metrics: aggregatedMetrics
      };

      this.logger.debug('WorkflowRepository: Execution statistics retrieved', {
        totalExecutions: executionStats.total_executions,
        metricsCount: aggregatedMetrics.length
      });

      return result;
    } catch (error) {
      this.logger.error('WorkflowRepository: Failed to get execution statistics', {
        filters,
        error: error.message
      });
      throw new Error(`Failed to get execution statistics: ${error.message}`);
    }
  }

  /**
   * Find executions by workflow ID
   * @param {string} workflowId - Workflow ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Executions
   */
  async findExecutionsByWorkflowId(workflowId, options = {}) {
    try {
      this.logger.debug('WorkflowRepository: Finding executions by workflow ID', {
        workflowId,
        options
      });

      const executions = await this.executionRepository.findByWorkflowId(workflowId, options);
      
      this.logger.debug('WorkflowRepository: Executions found by workflow ID', {
        workflowId,
        count: executions.length
      });

      return executions;
    } catch (error) {
      this.logger.error('WorkflowRepository: Failed to find executions by workflow ID', {
        workflowId,
        error: error.message
      });
      throw new Error(`Failed to find executions by workflow ID: ${error.message}`);
    }
  }

  /**
   * Find executions by task ID
   * @param {string} taskId - Task ID
   * @returns {Promise<Array>} Executions
   */
  async findExecutionsByTaskId(taskId) {
    try {
      this.logger.debug('WorkflowRepository: Finding executions by task ID', {
        taskId
      });

      const executions = await this.executionRepository.findByTaskId(taskId);
      
      this.logger.debug('WorkflowRepository: Executions found by task ID', {
        taskId,
        count: executions.length
      });

      return executions;
    } catch (error) {
      this.logger.error('WorkflowRepository: Failed to find executions by task ID', {
        taskId,
        error: error.message
      });
      throw new Error(`Failed to find executions by task ID: ${error.message}`);
    }
  }

  /**
   * Find executions by user ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Executions
   */
  async findExecutionsByUserId(userId, options = {}) {
    try {
      this.logger.debug('WorkflowRepository: Finding executions by user ID', {
        userId,
        options
      });

      const executions = await this.executionRepository.findByUserId(userId, options);
      
      this.logger.debug('WorkflowRepository: Executions found by user ID', {
        userId,
        count: executions.length
      });

      return executions;
    } catch (error) {
      this.logger.error('WorkflowRepository: Failed to find executions by user ID', {
        userId,
        error: error.message
      });
      throw new Error(`Failed to find executions by user ID: ${error.message}`);
    }
  }

  /**
   * Find executions by status
   * @param {string} status - Execution status
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Executions
   */
  async findExecutionsByStatus(status, options = {}) {
    try {
      this.logger.debug('WorkflowRepository: Finding executions by status', {
        status,
        options
      });

      const executions = await this.executionRepository.findByStatus(status, options);
      
      this.logger.debug('WorkflowRepository: Executions found by status', {
        status,
        count: executions.length
      });

      return executions;
    } catch (error) {
      this.logger.error('WorkflowRepository: Failed to find executions by status', {
        status,
        error: error.message
      });
      throw new Error(`Failed to find executions by status: ${error.message}`);
    }
  }

  /**
   * Delete execution
   * @param {string} executionId - Execution ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteExecution(executionId) {
    try {
      this.logger.info('WorkflowRepository: Deleting workflow execution', {
        executionId
      });

      // Delete metrics first (due to foreign key constraints)
      await this.metricsRepository.deleteMetricsForExecution(executionId);
      
      // Delete execution
      const success = await this.executionRepository.delete(executionId);
      
      if (success) {
        this.logger.info('WorkflowRepository: Workflow execution deleted successfully', {
          executionId
        });
      } else {
        this.logger.warn('WorkflowRepository: Workflow execution not found for deletion', {
          executionId
        });
      }

      return success;
    } catch (error) {
      this.logger.error('WorkflowRepository: Failed to delete workflow execution', {
        executionId,
        error: error.message
      });
      throw new Error(`Failed to delete workflow execution: ${error.message}`);
    }
  }

  /**
   * Clean up old executions
   * @param {number} daysOld - Number of days old to clean up
   * @returns {Promise<number>} Number of deleted executions
   */
  async cleanupOldExecutions(daysOld = 30) {
    try {
      this.logger.info('WorkflowRepository: Cleaning up old executions', {
        daysOld
      });

      const deletedExecutions = await this.executionRepository.cleanupOldExecutions(daysOld);
      const deletedMetrics = await this.metricsRepository.cleanupOldMetrics(daysOld);
      
      this.logger.info('WorkflowRepository: Cleanup completed', {
        deletedExecutions,
        deletedMetrics,
        daysOld
      });

      return deletedExecutions;
    } catch (error) {
      this.logger.error('WorkflowRepository: Failed to cleanup old executions', {
        daysOld,
        error: error.message
      });
      throw new Error(`Failed to cleanup old executions: ${error.message}`);
    }
  }

  /**
   * Get metrics for execution
   * @param {string} executionId - Execution ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Metrics
   */
  async getMetricsForExecution(executionId, options = {}) {
    try {
      this.logger.debug('WorkflowRepository: Getting metrics for execution', {
        executionId,
        options
      });

      const metrics = await this.metricsRepository.getMetricsForExecution(executionId, options);
      
      this.logger.debug('WorkflowRepository: Metrics retrieved for execution', {
        executionId,
        count: metrics.length
      });

      return metrics;
    } catch (error) {
      this.logger.error('WorkflowRepository: Failed to get metrics for execution', {
        executionId,
        error: error.message
      });
      throw new Error(`Failed to get metrics for execution: ${error.message}`);
    }
  }

  /**
   * Get aggregated metrics
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Aggregated metrics
   */
  async getAggregatedMetrics(filters = {}) {
    try {
      this.logger.debug('WorkflowRepository: Getting aggregated metrics', {
        filters
      });

      const metrics = await this.metricsRepository.getAggregatedMetrics(filters);
      
      this.logger.debug('WorkflowRepository: Aggregated metrics retrieved', {
        count: metrics.length
      });

      return metrics;
    } catch (error) {
      this.logger.error('WorkflowRepository: Failed to get aggregated metrics', {
        filters,
        error: error.message
      });
      throw new Error(`Failed to get aggregated metrics: ${error.message}`);
    }
  }

  /**
   * Get metrics statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Metrics statistics
   */
  async getMetricsStatistics(filters = {}) {
    try {
      this.logger.debug('WorkflowRepository: Getting metrics statistics', {
        filters
      });

      const statistics = await this.metricsRepository.getMetricsStatistics(filters);
      
      this.logger.debug('WorkflowRepository: Metrics statistics retrieved', {
        totalMetrics: statistics.total_metrics
      });

      return statistics;
    } catch (error) {
      this.logger.error('WorkflowRepository: Failed to get metrics statistics', {
        filters,
        error: error.message
      });
      throw new Error(`Failed to get metrics statistics: ${error.message}`);
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

module.exports = WorkflowRepository; 