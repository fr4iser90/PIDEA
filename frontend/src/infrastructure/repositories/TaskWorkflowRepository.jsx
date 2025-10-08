import { logger } from '@/infrastructure/logging/Logger';
import APIChatRepository, { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';

export default class TaskWorkflowRepository {
  constructor() {
    this.api = new APIChatRepository();
  }

  /**
   * Start task creation workflow
   * @param {Object} workflowData - Workflow configuration
   * @returns {Promise<Object>} Workflow result
   */
  async startTaskCreationWorkflow(workflowData) {
    try {
      logger.info('Starting task creation workflow:', workflowData);

      const { workflowId, projectId, taskData, type, priority, estimatedTime } = workflowData;

      // Use TaskController with task-create mode
      const response = await apiCall(`/api/projects/${projectId}/tasks/enqueue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workflow: 'task-create-workflow',
          task: {
            id: workflowId,
            title: taskData?.title || 'New task',
            description: taskData?.description || 'Task created via workflow',
            type: type || 'feature',
            priority: priority || 'medium',
            estimatedHours: estimatedTime || 1,
            category: taskData?.category || 'general'
          },
          options: {
            autoExecute: true,
            createGitBranch: true,
            branchName: `task/${workflowId}-${Date.now()}`,
            clickNewChat: true
          }
        })
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to start task creation workflow');
      }

      logger.info('Task creation workflow started successfully');
      
      return {
        success: true,
        workflowId,
        status: 'started',
        projectId,
        response: response.data
      };

    } catch (error) {
      logger.error('Failed to start task creation workflow:', error);
      throw new Error(`Failed to start task creation workflow: ${error.message}`);
    }
  }

  /**
   * Execute workflow (alias for startAutoFinishWorkflow for compatibility)
   * @param {Object} workflowData - Workflow configuration with todoInput and options
   * @returns {Promise<Object>} Workflow result
   */
  async executeWorkflow(workflowData) {
    try {
      logger.info('Executing workflow:', workflowData);

      const { todoInput, options } = workflowData;
      const { workflowId, taskData, projectId } = options;

      // Get current project ID if not provided
      const currentProjectId = projectId || await this.api.getCurrentProjectId();

      // Use TaskController with task-create mode instead of non-existent auto-finish endpoint
      const response = await apiCall(`/api/projects/${currentProjectId}/tasks/enqueue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workflow: 'task-create-workflow',
          task: {
            id: workflowId,
            title: taskData?.title || 'Task execution',
            description: todoInput || taskData?.description || 'Task execution via workflow',
            type: 'task_execution',
            priority: taskData?.priority || 'medium',
            estimatedHours: options?.estimatedHours || 1,
            category: taskData?.category || 'general'
          },
          options: {
            autoExecute: true,
            createGitBranch: true,
            branchName: `task/${workflowId}-${Date.now()}`,
            clickNewChat: true,
            todoInput: todoInput // Pass the actual execution prompt
          }
        })
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to execute workflow');
      }

      logger.info('Workflow executed successfully');
      
      return {
        success: true,
        workflowId,
        status: 'executing',
        projectId: currentProjectId,
        response: response.data
      };

    } catch (error) {
      logger.error('Failed to execute workflow:', error);
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
      logger.info('Getting workflow status:', workflowId);

      const response = await apiCall(`/api/auto-finish/status/${workflowId}`, {
        method: 'GET'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to get workflow status');
      }

      logger.info('Workflow status retrieved successfully');
      
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
      logger.error('Failed to get workflow status:', error);
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
      logger.info('Cancelling workflow:', workflowId);

      const response = await apiCall(`/api/auto-finish/cancel/${workflowId}`, {
        method: 'POST'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to cancel workflow');
      }

      logger.info('Workflow cancelled successfully');
      
      return {
        success: true,
        workflowId,
        status: 'cancelled',
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Failed to cancel workflow:', error);
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
      logger.info('Updating workflow:', { workflowId, updateData });

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

      logger.info('Workflow updated successfully');
      
      return {
        success: true,
        workflowId,
        status: 'updated',
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Failed to update workflow:', error);
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
      logger.info('Getting workflow history:', workflowId);

      const response = await apiCall(`/api/auto-finish/history/${workflowId}`, {
        method: 'GET'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to get workflow history');
      }

      logger.info('Workflow history retrieved successfully');
      
      return {
        success: true,
        workflowId,
        history: response.data.history || [],
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Failed to get workflow history:', error);
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
      logger.info('Getting project workflows:', projectId);

      const response = await apiCall(`/api/projects/${projectId}/auto-finish/workflows`, {
        method: 'GET'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to get project workflows');
      }

      logger.info('Project workflows retrieved successfully');
      
      return {
        success: true,
        projectId,
        workflows: response.data.workflows || [],
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Failed to get project workflows:', error);
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
      logger.info('Getting workflow logs:', workflowId);

      const response = await apiCall(`/api/auto-finish/logs/${workflowId}`, {
        method: 'GET'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to get workflow logs');
      }

      logger.info('Workflow logs retrieved successfully');
      
      return {
        success: true,
        workflowId,
        logs: response.data.logs || [],
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Failed to get workflow logs:', error);
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
      logger.info('Retrying workflow:', workflowId);

      const response = await apiCall(`/api/auto-finish/retry/${workflowId}`, {
        method: 'POST'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to retry workflow');
      }

      logger.info('Workflow retry started successfully');
      
      return {
        success: true,
        workflowId,
        status: 'retrying',
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Failed to retry workflow:', error);
      throw new Error(`Failed to retry workflow: ${error.message}`);
    }
  }
} 