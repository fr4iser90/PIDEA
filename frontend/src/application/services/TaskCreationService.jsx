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
      const prompt = await this.generateTaskPrompt(taskData);
      
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
   * @returns {Promise<string>} Generated prompt
   */
  async generateTaskPrompt(taskData) {
    const { title, description, category, priority, type, estimatedTime } = taskData;
    
    // Load the task-create.md prompt from content library
    const response = await fetch('/api/prompts/task-management/task-create');
    if (!response.ok) {
      throw new Error('Failed to load task-create prompt from content library');
    }
    
    const data = await response.json();
    const taskCreatePrompt = data.content;

    return `${taskCreatePrompt}

---

# TASK TO CREATE: ${title || 'New Task'}

## Task Details
- **Description:** ${description}
- **Category:** ${category}
- **Priority:** ${priority}
- **Type:** ${type}
- **Estimated Hours:** ${estimatedTime || 'Not specified'}

## Create Instructions
**Create a comprehensive implementation plan using the above task-create.md framework. The plan should be ready for database parsing and execution.**

Please provide a complete implementation plan that includes:

1. **Project Overview** - Clear project description and goals
2. **Technical Requirements** - Detailed technical specifications
3. **Implementation Strategy** - Step-by-step implementation approach
4. **File Structure** - Complete file organization plan
5. **Dependencies** - All required dependencies and prerequisites
6. **Testing Strategy** - Comprehensive testing approach
7. **Success Criteria** - Clear success metrics and validation

Format the response in Markdown with clear sections and actionable steps.`;
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