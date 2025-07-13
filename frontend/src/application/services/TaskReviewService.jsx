import APIChatRepository, { apiCall } from '@/infrastructure/repositories/APIChatRepository';
import TaskWorkflowRepository from '@/infrastructure/repositories/TaskWorkflowRepository';

class TaskReviewService {
  constructor() {
    this.apiChatRepository = new APIChatRepository();
    this.taskWorkflowRepository = new TaskWorkflowRepository();
  }

  /**
   * Generate a detailed implementation plan for task review
   * @param {Object} taskData - Task information
   * @returns {Promise<Object>} Review data with plan and analysis
   */
  async generateReviewPlan(taskData) {
    try {
      const prompt = await this.buildReviewPrompt(taskData);
      
      const response = await this.apiChatRepository.sendMessage(prompt);

      const plan = response.content;
      const analysis = this.analyzePlan(plan, taskData);

      return {
        plan,
        analysis,
        taskData,
        filesToCreate: analysis.filesToCreate,
        filesToModify: analysis.filesToModify,
        filesToDelete: analysis.filesToDelete,
        estimatedHours: analysis.estimatedHours,
        phases: analysis.phases,
        priority: taskData.priority,
        category: taskData.category
      };
    } catch (error) {
      console.error('Error generating review plan:', error);
      throw new Error('Failed to generate implementation plan');
    }
  }

  /**
   * Build the review prompt for AI analysis
   * @param {Object} taskData - Task information
   * @returns {String} Formatted prompt
   */
  async buildReviewPrompt(taskData) {
    // Load the task-review.md prompt from content library for REVIEW
    const response = await apiCall('/api/prompts/task-management/task-review');
    if (!response.success || !response.data) {
      throw new Error('Failed to load task-review prompt from content library');
    }
    
    const taskReviewPrompt = response.data.content;

    return `${taskReviewPrompt}

---

# TASK TO REVIEW: ${taskData.title || 'New Task'}

## Task Details
- **Description:** ${taskData.description}
- **Category:** ${taskData.category}
- **Priority:** ${taskData.priority}
- **Estimated Hours:** ${taskData.estimatedHours || 'Not specified'}

## Review Instructions
**Review this task and create a detailed analysis plan using the above task-review.md framework. The plan should be ready for validation and approval.**

Please provide a comprehensive review analysis that includes:

1. **Requirements Analysis** - Validate and clarify task requirements
2. **Technical Feasibility** - Assess technical complexity and approach
3. **Resource Assessment** - Evaluate time, effort, and dependencies
4. **Risk Analysis** - Identify potential risks and mitigation strategies
5. **Quality Assurance** - Define testing and validation criteria
6. **Implementation Strategy** - Outline the best approach for execution

Format the response in Markdown with clear sections and actionable insights.`;
  }

  /**
   * Get the system prompt for review context
   * @returns {String} System prompt
   */
  getReviewSystemPrompt() {
    return `You are an expert software architect and project manager. Your role is to analyze development tasks and create detailed, actionable implementation plans.

Key responsibilities:
- Break down complex tasks into manageable phases
- Identify all required file changes and dependencies
- Provide accurate time estimates
- Consider technical risks and mitigation strategies
- Ensure plans are comprehensive and actionable

Always provide structured, well-formatted responses in Markdown.`;
  }

  /**
   * Analyze the generated plan to extract key information
   * @param {String} plan - The generated plan
   * @param {Object} taskData - Original task data
   * @returns {Object} Analysis results
   */
  analyzePlan(plan, taskData) {
    const analysis = {
      phases: 0,
      estimatedHours: 0,
      filesToCreate: [],
      filesToModify: [],
      filesToDelete: [],
      complexity: 'medium',
      risks: [],
      dependencies: []
    };

    const lines = plan.split('\n');
    let currentSection = '';

    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Count phases
      if (trimmedLine.match(/^#+\s*Phase\s+\d+/i)) {
        analysis.phases++;
      }

      // Extract time estimates
      const timeMatch = trimmedLine.match(/(\d+(?:\.\d+)?)\s*hours?/i);
      if (timeMatch) {
        analysis.estimatedHours += parseFloat(timeMatch[1]);
      }

      // Extract file paths
      if (trimmedLine.includes('Files to Create:') || trimmedLine.includes('Create:')) {
        currentSection = 'create';
      } else if (trimmedLine.includes('Files to Modify:') || trimmedLine.includes('Modify:')) {
        currentSection = 'modify';
      } else if (trimmedLine.includes('Files to Delete:') || trimmedLine.includes('Delete:')) {
        currentSection = 'delete';
      } else if (trimmedLine.includes('Dependencies:') || trimmedLine.includes('Prerequisites:')) {
        currentSection = 'dependencies';
      } else if (trimmedLine.includes('Risks:') || trimmedLine.includes('Risk Assessment:')) {
        currentSection = 'risks';
      }

      // Parse file paths
      if (currentSection === 'create' && trimmedLine.match(/^[-*]\s*(.+\.(js|jsx|ts|tsx|css|html|md|json))$/)) {
        const filePath = trimmedLine.replace(/^[-*]\s*/, '');
        if (!analysis.filesToCreate.includes(filePath)) {
          analysis.filesToCreate.push(filePath);
        }
      } else if (currentSection === 'modify' && trimmedLine.match(/^[-*]\s*(.+\.(js|jsx|ts|tsx|css|html|md|json))$/)) {
        const filePath = trimmedLine.replace(/^[-*]\s*/, '');
        if (!analysis.filesToModify.includes(filePath)) {
          analysis.filesToModify.push(filePath);
        }
      } else if (currentSection === 'delete' && trimmedLine.match(/^[-*]\s*(.+\.(js|jsx|ts|tsx|css|html|md|json))$/)) {
        const filePath = trimmedLine.replace(/^[-*]\s*/, '');
        if (!analysis.filesToDelete.includes(filePath)) {
          analysis.filesToDelete.push(filePath);
        }
      }

      // Extract dependencies
      if (currentSection === 'dependencies' && trimmedLine.match(/^[-*]\s*(.+)$/)) {
        const dependency = trimmedLine.replace(/^[-*]\s*/, '');
        if (!analysis.dependencies.includes(dependency)) {
          analysis.dependencies.push(dependency);
        }
      }

      // Extract risks
      if (currentSection === 'risks' && trimmedLine.match(/^[-*]\s*(.+)$/)) {
        const risk = trimmedLine.replace(/^[-*]\s*/, '');
        if (!analysis.risks.includes(risk)) {
          analysis.risks.push(risk);
        }
      }
    });

    // Determine complexity based on analysis
    const totalFiles = analysis.filesToCreate.length + analysis.filesToModify.length + analysis.filesToDelete.length;
    const totalHours = analysis.estimatedHours;

    if (totalFiles > 10 || totalHours > 8 || analysis.phases > 5) {
      analysis.complexity = 'high';
    } else if (totalFiles > 5 || totalHours > 4 || analysis.phases > 3) {
      analysis.complexity = 'medium';
    } else {
      analysis.complexity = 'low';
    }

    return analysis;
  }

  /**
   * Split a complex task into smaller subtasks
   * @param {Object} reviewData - Review data with plan
   * @returns {Promise<Array>} Array of subtasks
   */
  async splitTask(reviewData) {
    try {
      const prompt = this.buildSplitPrompt(reviewData);
      
      const response = await this.apiChatRepository.sendMessage(prompt);

      const subtasks = this.parseSubtasks(response.content);
      
      // Emit event for task splitting
      if (window.eventBus) {
        window.eventBus.emit('task-split', {
          originalTask: reviewData.taskData,
          subtasks: subtasks
        });
      }

      return subtasks;
    } catch (error) {
      console.error('Error splitting task:', error);
      throw new Error('Failed to split task into subtasks');
    }
  }

  /**
   * Build the split prompt for task decomposition
   * @param {Object} reviewData - Review data
   * @returns {String} Formatted prompt
   */
  buildSplitPrompt(reviewData) {
    return `Please break down the following task into smaller, manageable subtasks:

**Original Task:** ${reviewData.taskData.description}
**Estimated Hours:** ${reviewData.estimatedHours}
**Complexity:** ${reviewData.analysis?.complexity || 'medium'}

**Current Plan Summary:**
- Phases: ${reviewData.phases}
- Files to Create: ${reviewData.filesToCreate?.length || 0}
- Files to Modify: ${reviewData.filesToModify?.length || 0}
- Files to Delete: ${reviewData.filesToDelete?.length || 0}

Please create 3-5 subtasks that:
1. Are independent and can be worked on separately
2. Have clear deliverables and acceptance criteria
3. Are sized appropriately (1-4 hours each)
4. Follow logical dependencies

Format each subtask as:
## Subtask [Number]: [Title]
**Description:** [Detailed description]
**Estimated Hours:** [X hours]
**Files:** [List of files to create/modify]
**Dependencies:** [Any dependencies]
**Acceptance Criteria:** [Clear success criteria]`;
  }

  /**
   * Get the system prompt for task splitting
   * @returns {String} System prompt
   */
  getSplitSystemPrompt() {
    return `You are an expert project manager specializing in task decomposition and agile development. Your role is to break down complex development tasks into smaller, manageable subtasks.

Key principles:
- Each subtask should be independently deliverable
- Subtasks should be sized for 1-4 hours of work
- Clear dependencies and acceptance criteria
- Logical progression and workflow
- Maintainable and testable increments

Provide structured, actionable subtasks that can be executed independently.`;
  }

  /**
   * Parse the AI response into structured subtasks
   * @param {String} content - AI response content
   * @returns {Array} Array of subtask objects
   */
  parseSubtasks(content) {
    const subtasks = [];
    const sections = content.split(/##\s*Subtask\s+\d+:/);
    
    sections.slice(1).forEach((section, index) => {
      const lines = section.trim().split('\n');
      const title = lines[0].trim();
      
      const subtask = {
        id: `subtask-${index + 1}`,
        title: title,
        description: '',
        estimatedHours: 0,
        files: [],
        dependencies: [],
        acceptanceCriteria: []
      };

      let currentSection = '';
      
      lines.slice(1).forEach(line => {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('**Description:**')) {
          currentSection = 'description';
          subtask.description = trimmedLine.replace('**Description:**', '').trim();
        } else if (trimmedLine.startsWith('**Estimated Hours:**')) {
          const hoursMatch = trimmedLine.match(/(\d+(?:\.\d+)?)\s*hours?/i);
          if (hoursMatch) {
            subtask.estimatedHours = parseFloat(hoursMatch[1]);
          }
        } else if (trimmedLine.startsWith('**Files:**')) {
          currentSection = 'files';
        } else if (trimmedLine.startsWith('**Dependencies:**')) {
          currentSection = 'dependencies';
        } else if (trimmedLine.startsWith('**Acceptance Criteria:**')) {
          currentSection = 'acceptance';
        } else if (trimmedLine.startsWith('**')) {
          currentSection = '';
        } else if (trimmedLine && currentSection === 'description') {
          subtask.description += ' ' + trimmedLine;
        } else if (trimmedLine && currentSection === 'files' && trimmedLine.match(/^[-*]\s*(.+)$/)) {
          const file = trimmedLine.replace(/^[-*]\s*/, '');
          subtask.files.push(file);
        } else if (trimmedLine && currentSection === 'dependencies' && trimmedLine.match(/^[-*]\s*(.+)$/)) {
          const dependency = trimmedLine.replace(/^[-*]\s*/, '');
          subtask.dependencies.push(dependency);
        } else if (trimmedLine && currentSection === 'acceptance' && trimmedLine.match(/^[-*]\s*(.+)$/)) {
          const criteria = trimmedLine.replace(/^[-*]\s*/, '');
          subtask.acceptanceCriteria.push(criteria);
        }
      });

      subtasks.push(subtask);
    });

    return subtasks;
  }

  /**
   * Modify the implementation plan based on user feedback
   * @param {Object} reviewData - Current review data
   * @param {String} modificationRequest - User's modification request
   * @returns {Promise<Object>} Updated review data
   */
  async modifyPlan(reviewData, modificationRequest) {
    try {
      const prompt = this.buildModifyPrompt(reviewData, modificationRequest);
      
      const response = await this.apiChatRepository.sendMessage(prompt);

      const modifiedPlan = response.content;
      const updatedAnalysis = this.analyzePlan(modifiedPlan, reviewData.taskData);

      const updatedReviewData = {
        ...reviewData,
        plan: modifiedPlan,
        analysis: updatedAnalysis,
        filesToCreate: updatedAnalysis.filesToCreate,
        filesToModify: updatedAnalysis.filesToModify,
        filesToDelete: updatedAnalysis.filesToDelete,
        estimatedHours: updatedAnalysis.estimatedHours,
        phases: updatedAnalysis.phases
      };

      // Emit event for plan modification
      if (window.eventBus) {
        window.eventBus.emit('plan-modified', {
          originalPlan: reviewData.plan,
          modifiedPlan: modifiedPlan,
          modificationRequest: modificationRequest
        });
      }

      return updatedReviewData;
    } catch (error) {
      console.error('Error modifying plan:', error);
      throw new Error('Failed to modify implementation plan');
    }
  }

  /**
   * Build the modification prompt
   * @param {Object} reviewData - Current review data
   * @param {String} modificationRequest - User's request
   * @returns {String} Formatted prompt
   */
  buildModifyPrompt(reviewData, modificationRequest) {
    return `Please modify the following implementation plan based on the user's request:

**Original Task:** ${reviewData.taskData.description}
**Modification Request:** ${modificationRequest}

**Current Plan:**
${reviewData.plan}

Please provide an updated implementation plan that addresses the modification request while maintaining the overall structure and quality of the original plan.`;
  }

  /**
   * Get the system prompt for plan modification
   * @returns {String} System prompt
   */
  getModifySystemPrompt() {
    return `You are an expert software architect. Your role is to modify implementation plans based on user feedback while maintaining quality and consistency.

Key principles:
- Address the modification request completely
- Maintain the original plan's structure and quality
- Update all relevant sections and estimates
- Ensure the modified plan is still actionable
- Preserve important technical details

Provide a complete, updated implementation plan.`;
  }

  /**
   * Execute the task implementation plan
   * @param {Object} reviewData - Review data with plan
   * @returns {Promise<Object>} Execution result
   */
  async executeTask(reviewData) {
    try {
      // Load the task-execute.md prompt from content library for EXECUTION
      const response = await apiCall('/api/prompts/task-management/task-execute');
      if (!response.success || !response.data) {
        throw new Error('Failed to load task-execute prompt from content library');
      }
      
      const taskExecutePrompt = response.data.content;

      // Create execution prompt with task data
      const executionPrompt = `${taskExecutePrompt}

---

# TASK TO EXECUTE: ${reviewData.taskData.title || 'New Task'}

## Task Details
- **Description:** ${reviewData.taskData.description}
- **Category:** ${reviewData.taskData.category}
- **Priority:** ${reviewData.taskData.priority}
- **Estimated Hours:** ${reviewData.estimatedHours || 'Not specified'}

## Review Analysis
${reviewData.plan}

## Execute Instructions
**Execute this task using the above task-execute.md framework. The task has been reviewed and approved for execution.**

Please execute the task according to the review analysis and provide real-time progress updates.`;

      // Start the workflow execution with task-execute.md prompt
      const workflowResult = await this.taskWorkflowRepository.executeWorkflow({
        todoInput: executionPrompt,
        options: {
          workflowId: `task-execution-${Date.now()}`,
          taskData: reviewData.taskData,
          plan: reviewData.plan,
          filesToCreate: reviewData.filesToCreate,
          filesToModify: reviewData.filesToModify,
          filesToDelete: reviewData.filesToDelete,
          estimatedHours: reviewData.estimatedHours,
          phases: reviewData.phases
        }
      });

      // Emit event for task execution
      if (window.eventBus) {
        window.eventBus.emit('task-execution-started', {
          workflowId: workflowResult.workflowId,
          taskData: reviewData.taskData,
          plan: reviewData.plan
        });
      }

      return workflowResult;
    } catch (error) {
      console.error('Error executing task:', error);
      throw new Error('Failed to execute task implementation');
    }
  }

  /**
   * Get workflow status and progress
   * @param {String} workflowId - Workflow identifier
   * @returns {Promise<Object>} Workflow status
   */
  async getWorkflowStatus(workflowId) {
    try {
      return await this.taskWorkflowRepository.getWorkflowStatus(workflowId);
    } catch (error) {
      console.error('Error getting workflow status:', error);
      throw new Error('Failed to get workflow status');
    }
  }

  /**
   * Cancel a running workflow
   * @param {String} workflowId - Workflow identifier
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelWorkflow(workflowId) {
    try {
      const result = await this.taskWorkflowRepository.cancelWorkflow(workflowId);
      
      // Emit event for workflow cancellation
      if (window.eventBus) {
        window.eventBus.emit('workflow-cancelled', {
          workflowId: workflowId
        });
      }

      return result;
    } catch (error) {
      console.error('Error cancelling workflow:', error);
      throw new Error('Failed to cancel workflow');
    }
  }
}

export default TaskReviewService; 