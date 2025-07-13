import { logger } from '@/infrastructure/logging/Logger';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository.jsx';
import TaskWorkflowRepository from '@/infrastructure/repositories/TaskWorkflowRepository.jsx';

export default class TaskCreationService {
  constructor() {
    this.api = new APIChatRepository();
    this.workflowApi = new TaskWorkflowRepository();
    this.activeWorkflows = new Map();
  }

  /**
   * Start AI-powered task creation workflow
   * @param {Object} taskData - Form data from modal
   * @param {Object} options - Workflow options
   * @returns {Promise<Object>} Workflow result
   */
  async startTaskCreationWorkflow(taskData, options = {}) {
    const workflowId = `task-creation-${Date.now()}`;
    
    try {
      logger.log('[TaskCreationService] Starting task creation workflow:', { workflowId, taskData });

      // Step 1: Generate AI prompt
      const prompt = this.generateTaskPrompt(taskData);
      
      // Step 2: Send to IDE chat
      const chatResult = await this.sendToIDEChat(prompt, options);
      
      // Step 3: Start auto-finish monitoring
      const autoFinishResult = await this.startAutoFinishMonitoring(workflowId, taskData);
      
      // Step 4: Track progress
      this.trackWorkflowProgress(workflowId, {
        status: 'started',
        step: 'ai_planning',
        progress: 10,
        taskData,
        chatResult
      });

      return {
        workflowId,
        success: true,
        status: 'started',
        chatResult,
        autoFinishResult
      };

    } catch (error) {
      logger.error('[TaskCreationService] Workflow failed:', error);
      throw error;
    }
  }

  /**
   * Generate AI prompt for task creation
   * @param {Object} taskData - Task form data
   * @returns {string} Generated prompt
   */
  generateTaskPrompt(taskData) {
    const { title, description, category, priority, type, estimatedTime } = taskData;
    
    return `# AI Task Creation Request

## Task Details
- **Title**: ${title}
- **Description**: ${description}
- **Category**: ${category}
- **Priority**: ${priority}
- **Type**: ${type}
- **Estimated Time**: ${estimatedTime || 'Not specified'} hours

## Instructions
Please create a comprehensive implementation plan for this task using the task-execute.md framework. Follow these steps:

1. **Analyze Requirements**: Understand the task requirements and scope
2. **Create Implementation Plan**: Generate a detailed plan following the template structure
3. **Define Phases**: Break down the implementation into logical phases
4. **Estimate Resources**: Provide accurate time and resource estimates
5. **Identify Dependencies**: List any prerequisites or dependencies
6. **Plan Testing**: Include testing strategy and validation criteria

## Framework Requirements
- Use the task-execute.md template structure
- Include all required sections (Project Overview, Technical Requirements, etc.)
- Create implementation and phase files in the correct directory structure
- Set appropriate automation levels and execution context
- Include success criteria and risk assessment

## Output Format
Please provide the complete implementation plan in markdown format, ready to be parsed into database tasks and executed by the AI system.

**Important**: This plan will be automatically executed, so ensure all details are comprehensive and accurate.`;
  }

  /**
   * Send prompt to IDE chat
   * @param {string} prompt - Generated prompt
   * @param {Object} options - Chat options
   * @returns {Promise<Object>} Chat result
   */
  async sendToIDEChat(prompt, options = {}) {
    try {
      logger.log('[TaskCreationService] Sending prompt to IDE chat');

      // Get current project ID
      const projectId = await this.api.getCurrentProjectId();
      
      // Send message to chat using existing APIChatRepository
      const result = await this.api.sendMessage(prompt);
      
      logger.log('[TaskCreationService] Chat message sent successfully');
      
      return {
        success: true,
        messageId: result.id,
        timestamp: new Date(),
        projectId
      };

    } catch (error) {
      logger.error('[TaskCreationService] Failed to send chat message:', error);
      throw new Error(`Failed to send message to IDE: ${error.message}`);
    }
  }

  /**
   * Start auto-finish monitoring
   * @param {string} workflowId - Workflow ID
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} Auto-finish result
   */
  async startAutoFinishMonitoring(workflowId, taskData) {
    try {
      logger.log('[TaskCreationService] Starting auto-finish monitoring:', workflowId);

      // Get current project ID
      const projectId = await this.api.getCurrentProjectId();
      
      // Start auto-finish workflow using existing API pattern
      const result = await this.workflowApi.startAutoFinishWorkflow({
        workflowId,
        projectId,
        taskData,
        type: 'task_creation',
        priority: taskData.priority,
        estimatedTime: taskData.estimatedTime
      });

      // Store workflow reference
      this.activeWorkflows.set(workflowId, {
        status: 'running',
        startTime: new Date(),
        taskData,
        projectId
      });

      logger.log('[TaskCreationService] Auto-finish monitoring started successfully');
      
      return {
        success: true,
        workflowId,
        status: 'running',
        projectId
      };

    } catch (error) {
      logger.error('[TaskCreationService] Failed to start auto-finish monitoring:', error);
      throw new Error(`Failed to start auto-finish monitoring: ${error.message}`);
    }
  }

  /**
   * Track workflow progress
   * @param {string} workflowId - Workflow ID
   * @param {Object} progressData - Progress data
   */
  trackWorkflowProgress(workflowId, progressData) {
    try {
      // Update local tracking
      if (this.activeWorkflows.has(workflowId)) {
        const workflow = this.activeWorkflows.get(workflowId);
        this.activeWorkflows.set(workflowId, {
          ...workflow,
          ...progressData,
          lastUpdate: new Date()
        });
      }

      // Emit progress event
      if (window.eventBus) {
        window.eventBus.emit('task-creation:progress', {
          workflowId,
          ...progressData
        });
      }

      logger.log('[TaskCreationService] Progress tracked:', { workflowId, progressData });

    } catch (error) {
      logger.error('[TaskCreationService] Failed to track progress:', error);
    }
  }

  /**
   * Get workflow status
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<Object>} Workflow status
   */
  async getWorkflowStatus(workflowId) {
    try {
      // Check local tracking first
      if (this.activeWorkflows.has(workflowId)) {
        const workflow = this.activeWorkflows.get(workflowId);
        return {
          success: true,
          workflowId,
          ...workflow
        };
      }

      // Fallback to API
      const result = await this.workflowApi.getWorkflowStatus(workflowId);
      return result;

    } catch (error) {
      logger.error('[TaskCreationService] Failed to get workflow status:', error);
      throw error;
    }
  }

  /**
   * Cancel workflow
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<Object>} Cancel result
   */
  async cancelWorkflow(workflowId) {
    try {
      logger.log('[TaskCreationService] Cancelling workflow:', workflowId);

      // Cancel via API
      const result = await this.workflowApi.cancelWorkflow(workflowId);

      // Remove from local tracking
      this.activeWorkflows.delete(workflowId);

      // Emit cancellation event
      if (window.eventBus) {
        window.eventBus.emit('task-creation:cancelled', {
          workflowId,
          timestamp: new Date()
        });
      }

      logger.log('[TaskCreationService] Workflow cancelled successfully');
      
      return {
        success: true,
        workflowId,
        status: 'cancelled'
      };

    } catch (error) {
      logger.error('[TaskCreationService] Failed to cancel workflow:', error);
      throw error;
    }
  }

  /**
   * Get all active workflows
   * @returns {Array} Active workflows
   */
  getActiveWorkflows() {
    return Array.from(this.activeWorkflows.entries()).map(([id, workflow]) => ({
      workflowId: id,
      ...workflow
    }));
  }

  /**
   * Clean up completed workflows
   */
  cleanupCompletedWorkflows() {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [workflowId, workflow] of this.activeWorkflows.entries()) {
      const age = now - workflow.startTime;
      if (age > maxAge || workflow.status === 'completed' || workflow.status === 'failed') {
        this.activeWorkflows.delete(workflowId);
        logger.log('[TaskCreationService] Cleaned up workflow:', workflowId);
      }
    }
  }
} 