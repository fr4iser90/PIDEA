import { logger } from '@/infrastructure/logging/Logger';
import APIChatRepository, { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';

export default class TaskWorkflowRepository {
  constructor() {
    this.api = new APIChatRepository();
  }

  /**
   * Start auto-finish workflow
   * @param {Object} workflowData - Workflow configuration
   * @returns {Promise<Object>} Workflow result
   */
  async startAutoFinishWorkflow(workflowData) {
    try {
      logger.info('[TaskWorkflowRepository] Starting auto-finish workflow:', workflowData);

      const { workflowId, projectId, taskData, type, priority, estimatedTime } = workflowData;

      // Use existing auto-finish API pattern
      const response = await apiCall(`/api/projects/${projectId}/auto-finish/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workflowId,
          type: type || 'task_creation',
          priority: priority || 'medium',
          estimatedTime: estimatedTime || 1,
          taskData,
          autoExecute: true,
          createBranch: true,
          branchName: `task/${workflowId}-${Date.now()}`
        })
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to start auto-finish workflow');
      }

      logger.info('[TaskWorkflowRepository] Auto-finish workflow started successfully');
      
      return {
        success: true,
        workflowId,
        status: 'started',
        projectId,
        response: response.data
      };

    } catch (error) {
      logger.error('[TaskWorkflowRepository] Failed to start auto-finish workflow:', error);
      throw new Error(`Failed to start auto-finish workflow: ${error.message}`);
    }
  }

  /**
   * Execute workflow (alias for startAutoFinishWorkflow for compatibility)
   * @param {Object} workflowData - Workflow configuration with todoInput and options
   * @returns {Promise<Object>} Workflow result
   */
  async executeWorkflow(workflowData) {
    try {
      logger.info('[TaskWorkflowRepository] Executing workflow:', workflowData);

      const { todoInput, options } = workflowData;
      const { workflowId, taskData, projectId } = options;

      // Get current project ID if not provided
      const currentProjectId = projectId || await this.api.getCurrentProjectId();

      // Use existing auto-finish API pattern with todoInput
      const response = await apiCall(`/api/projects/${currentProjectId}/auto-finish/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workflowId,
          type: 'task_execution',
          priority: taskData?.priority || 'medium',
          estimatedTime: options?.estimatedHours || 1,
          taskData,
          todoInput, // The actual execution prompt
          autoExecute: true,
          createBranch: true,
          branchName: `task/${workflowId}-${Date.now()}`
        })
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to execute workflow');
      }

      logger.info('[TaskWorkflowRepository] Workflow executed successfully');
      
      return {
        success: true,
        workflowId,
        status: 'executing',
        projectId: currentProjectId,
        response: response.data
      };

    } catch (error) {
      logger.error('[TaskWorkflowRepository] Failed to execute workflow:', error);
      throw new Error(`Failed to execute workflow: ${error.message}`);
    }
  }

  /**
   * Get workflow status
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<Object>} Workflow status
   */
  async getWorkflowStatus(workflowId) {
    try {
      logger.info('[TaskWorkflowRepository] Getting workflow status:', workflowId);

      const response = await apiCall(`/api/auto-finish/status/${workflowId}`, {
        method: 'GET'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to get workflow status');
      }

      logger.info('[TaskWorkflowRepository] Workflow status retrieved successfully');
      
      return {
        success: true,
        workflowId,
        status: response.data.status,
        progress: response.data.progress,
        step: response.data.step,
        details: response.data.details,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('[TaskWorkflowRepository] Failed to get workflow status:', error);
      throw new Error(`Failed to get workflow status: ${error.message}`);
    }
  }

  /**
   * Cancel workflow
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<Object>} Cancel result
   */
  async cancelWorkflow(workflowId) {
    try {
      logger.info('[TaskWorkflowRepository] Cancelling workflow:', workflowId);

      const response = await apiCall(`/api/auto-finish/cancel/${workflowId}`, {
        method: 'POST'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to cancel workflow');
      }

      logger.info('[TaskWorkflowRepository] Workflow cancelled successfully');
      
      return {
        success: true,
        workflowId,
        status: 'cancelled',
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('[TaskWorkflowRepository] Failed to cancel workflow:', error);
      throw new Error(`Failed to cancel workflow: ${error.message}`);
    }
  }

  /**
   * Update workflow
   * @param {string} workflowId - Workflow ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Update result
   */
  async updateWorkflow(workflowId, updateData) {
    try {
      logger.info('[TaskWorkflowRepository] Updating workflow:', { workflowId, updateData });

      const response = await apiCall(`/api/auto-finish/update/${workflowId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to update workflow');
      }

      logger.info('[TaskWorkflowRepository] Workflow updated successfully');
      
      return {
        success: true,
        workflowId,
        status: 'updated',
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('[TaskWorkflowRepository] Failed to update workflow:', error);
      throw new Error(`Failed to update workflow: ${error.message}`);
    }
  }

  /**
   * Get workflow history
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<Object>} Workflow history
   */
  async getWorkflowHistory(workflowId) {
    try {
      logger.info('[TaskWorkflowRepository] Getting workflow history:', workflowId);

      const response = await apiCall(`/api/auto-finish/history/${workflowId}`, {
        method: 'GET'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to get workflow history');
      }

      logger.info('[TaskWorkflowRepository] Workflow history retrieved successfully');
      
      return {
        success: true,
        workflowId,
        history: response.data.history || [],
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('[TaskWorkflowRepository] Failed to get workflow history:', error);
      throw new Error(`Failed to get workflow history: ${error.message}`);
    }
  }

  /**
   * Get all workflows for project
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Project workflows
   */
  async getProjectWorkflows(projectId) {
    try {
      logger.info('[TaskWorkflowRepository] Getting project workflows:', projectId);

      const response = await apiCall(`/api/projects/${projectId}/auto-finish/workflows`, {
        method: 'GET'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to get project workflows');
      }

      logger.info('[TaskWorkflowRepository] Project workflows retrieved successfully');
      
      return {
        success: true,
        projectId,
        workflows: response.data.workflows || [],
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('[TaskWorkflowRepository] Failed to get project workflows:', error);
      throw new Error(`Failed to get project workflows: ${error.message}`);
    }
  }

  /**
   * Get workflow logs
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<Object>} Workflow logs
   */
  async getWorkflowLogs(workflowId) {
    try {
      logger.info('[TaskWorkflowRepository] Getting workflow logs:', workflowId);

      const response = await apiCall(`/api/auto-finish/logs/${workflowId}`, {
        method: 'GET'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to get workflow logs');
      }

      logger.info('[TaskWorkflowRepository] Workflow logs retrieved successfully');
      
      return {
        success: true,
        workflowId,
        logs: response.data.logs || [],
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('[TaskWorkflowRepository] Failed to get workflow logs:', error);
      throw new Error(`Failed to get workflow logs: ${error.message}`);
    }
  }

  /**
   * Retry failed workflow
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<Object>} Retry result
   */
  async retryWorkflow(workflowId) {
    try {
      logger.info('[TaskWorkflowRepository] Retrying workflow:', workflowId);

      const response = await apiCall(`/api/auto-finish/retry/${workflowId}`, {
        method: 'POST'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to retry workflow');
      }

      logger.info('[TaskWorkflowRepository] Workflow retry started successfully');
      
      return {
        success: true,
        workflowId,
        status: 'retrying',
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('[TaskWorkflowRepository] Failed to retry workflow:', error);
      throw new Error(`Failed to retry workflow: ${error.message}`);
    }
  }
} 