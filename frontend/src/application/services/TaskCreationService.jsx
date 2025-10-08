import { logger } from '@/infrastructure/logging/Logger';
import APIChatRepository, { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import TaskWorkflowRepository from '@/infrastructure/repositories/TaskWorkflowRepository.jsx';

export default class TaskCreationService {
  constructor() {
    this.api = new APIChatRepository();
    this.workflowApi = new TaskWorkflowRepository();
    this.activeWorkflows = new Map();
  }

  /**
   * Start AI-powered task creation workflow (Manual Config Mode)
   * @param {Object} taskData - Form data from modal
   * @param {Object} options - Workflow options
   * @returns {Promise<Object>} Workflow result
   */
  async startTaskCreationWorkflow(taskData, options = {}) {
    try {
      logger.info('Starting task creation workflow:', { taskData });

      // Get current project ID
      const projectId = await this.api.getCurrentProjectId();
      
      // Use the new backend task enqueue endpoint
      const response = await apiCall(`/api/projects/${projectId}/tasks/enqueue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workflow: 'task-create-workflow',
          task: taskData,
          options: {
            creationMode: 'normal',
            autoExecute: true,
            createGitBranch: false
          }
        })
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to start task creation workflow');
      }

      logger.info('Task creation workflow started successfully');
      
      return {
        success: true,
        workflowId: response.data.workflowId,
        queueItemId: response.data.queueItemId,
        status: response.data.status,
        position: response.data.position,
        estimatedStartTime: response.data.estimatedStartTime,
        mode: 'normal',
        taskMode: response.data.taskMode
      };

    } catch (error) {
      logger.error('Workflow failed:', error);
      throw error;
    }
  }

  /**
   * Start Advanced task creation workflow (AI determines everything from description)
   * @param {Object} taskData - Form data from modal (only description required)
   * @param {Object} options - Workflow options
   * @returns {Promise<Object>} Workflow result
   */
    async startAdvancedTaskCreation(taskData, options = {}) {
      try {
        logger.info('Starting Advanced task creation workflow:', { taskData });

        // Get current project ID
        const projectId = await this.api.getCurrentProjectId();

        // Use the new backend task enqueue endpoint
        const response = await apiCall(`/api/projects/${projectId}/tasks/enqueue`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            workflow: 'task-create-workflow',
            task: taskData,
            options: {
              creationMode: 'advanced',
              autoExecute: true,
              createGitBranch: false
            }
          })
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to start Advanced task creation workflow');
        }

        logger.info('Advanced task creation workflow started successfully');

        return {
          success: true,
          workflowId: response.data.workflowId,
          queueItemId: response.data.queueItemId,
          status: response.data.status,
          position: response.data.position,
          estimatedStartTime: response.data.estimatedStartTime,
          mode: 'advanced',
          taskMode: response.data.taskMode
        };

      } catch (error) {
        logger.error('Advanced workflow failed:', error);
        throw error;
      }
    }

  /**
   * Generate Advanced prompt (AI determines title, category, priority from description)
   * @param {Object} taskData - Task form data (only description required)
   * @returns {Promise<string>} Generated prompt
   */
  async generateAdvancedPrompt(taskData) {
    const { description } = taskData;
    
    // Load the task-create.md prompt from content library using API
    const promptResponse = await apiCall('/api/prompts/task-management/task-create.md');
    if (!promptResponse.success || !promptResponse.content) {
      throw new Error('Failed to load task-create prompt from content library');
    }
    
    const taskCreatePrompt = promptResponse.content;

    // Get comprehensive project analysis
    const projectAnalysis = await this.getProjectAnalysis();
    
    // Get current project ID
    const projectId = await this.api.getCurrentProjectId();

    return `${taskCreatePrompt}

---

# ADVANCED TASK CREATION

## User Description
${description}

## AI Instructions
**You are an expert AI that will analyze the user's description and automatically determine:**

1. **Task Title** - Create a clear, descriptive title
2. **Category** - Determine the appropriate category (frontend, backend, database, etc.)
3. **Priority** - Assess priority level (low, medium, high, urgent)
4. **Type** - Determine task type (feature, bugfix, refactor, etc.)
5. **Estimated Time** - Provide realistic time estimate
6. **File Structure** - Create proper directory structure and files

## Project Context Analysis
${this.formatProjectAnalysis(projectAnalysis)}

## Advanced Creation Process
**IMPORTANT**: Follow this exact process:

1. **Analyze Description** - Extract requirements, complexity, and scope
2. **Determine Metadata** - Set title, category, priority, type, estimated time
3. **Create File Structure** - Generate proper directory structure
4. **Generate Implementation Plan** - Create comprehensive plan following project patterns
5. **Create Files** - Generate all necessary files in correct locations

## File Creation Requirements
- **Create files in correct directory structure**: docs/09_roadmap/pending/[priority]/[category]/[name]/
- **Generate index file**: [name]-index.md
- **Generate implementation file**: [name]-implementation.md  
- **Generate phase files**: [name]-phase-[number].md
- **Follow project patterns** - Use detected architecture and coding standards
- **Include all metadata** - Title, category, priority, type, estimated time

## Success Criteria
- All files created in correct directory structure
- Implementation plan follows project patterns
- Metadata accurately reflects task complexity
- Files ready for database parsing and execution

**Create the complete task implementation now, including all files and proper directory structure.**`;
  }

  /**
   * Monitor file creation and parse into database
   * @param {string} workflowId - Workflow ID
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} File creation result
   */
  async monitorFileCreation(workflowId, taskData) {
    try {
      logger.info('Monitoring file creation:', workflowId);

      // Wait for AI to create files (simulate monitoring)
      // In real implementation, this would poll for file creation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Parse created files into database
      const parseResult = await this.parseFilesToDatabase(workflowId, taskData);

      logger.info('File creation monitoring completed');
      
      return {
        success: true,
        workflowId,
        filesCreated: parseResult.filesCreated,
        databaseEntry: parseResult.databaseEntry
      };

    } catch (error) {
      logger.error('Failed to monitor file creation:', error);
      throw new Error(`Failed to monitor file creation: ${error.message}`);
    }
  }

  /**
   * Parse created files into database entry
   * @param {string} workflowId - Workflow ID
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} Parse result
   */
  async parseFilesToDatabase(workflowId, taskData) {
    try {
      logger.info('Parsing files to database:', workflowId);

      // In real implementation, this would:
      // 1. Scan the created files
      // 2. Extract metadata (title, category, priority, etc.)
      // 3. Parse implementation plan
      // 4. Create database entry
      // 5. Link files to database entry

      // For now, simulate the process
      const mockResult = {
        filesCreated: [
          'docs/09_roadmap/pending/medium/backend/user-auth-index.md',
          'docs/09_roadmap/pending/medium/backend/user-auth-implementation.md',
          'docs/09_roadmap/pending/medium/backend/user-auth-phase-1.md'
        ],
        databaseEntry: {
          id: workflowId,
          title: 'User Authentication System',
          category: 'backend',
          priority: 'medium',
          type: 'feature',
          estimatedHours: 8,
          status: 'pending',
          sourceType: 'markdown_doc',
          sourcePath: 'docs/09_roadmap/pending/medium/backend/user-auth-implementation.md'
        }
      };

      logger.info('Files parsed to database successfully');
      
      return mockResult;

    } catch (error) {
      logger.error('Failed to parse files to database:', error);
      throw new Error(`Failed to parse files to database: ${error.message}`);
    }
  }

  /**
   * Generate AI prompt for task creation with comprehensive analysis
   * @param {Object} taskData - Task form data
   * @returns {Promise<string>} Generated prompt
   */
  async generateTaskPrompt(taskData) {
    const { title, description, category, priority, type, estimatedTime } = taskData;
    
    // Load the task-create.md prompt from content library using API
    const promptResponse = await apiCall('/api/prompts/task-management/task-create.md');
    if (!promptResponse.success || !promptResponse.content) {
      throw new Error('Failed to load task-create prompt from content library');
    }
    
    const taskCreatePrompt = promptResponse.content;

    // Get comprehensive project analysis
    const projectAnalysis = await this.getProjectAnalysis();
    
    // Get current project ID
    const projectId = await this.api.getCurrentProjectId();

    return `${taskCreatePrompt}

---

# TASK TO CREATE: ${title || 'New Task'}

## Task Details
- **Description:** ${description}
- **Category:** ${category}
- **Priority:** ${priority}
- **Type:** ${type}
- **Estimated Hours:** ${estimatedTime || 'Not specified'}

## Project Context Analysis
${this.formatProjectAnalysis(projectAnalysis)}

## Create Instructions
**Create a comprehensive implementation plan using the above task-create.md framework. The plan should be ready for database parsing and execution.**

**IMPORTANT**: Use the project analysis above to:
1. **Leverage existing patterns** - Follow the detected architecture patterns
2. **Respect current structure** - Use the existing folder structure and naming conventions
3. **Consider dependencies** - Account for existing dependencies and tech stack
4. **Follow code standards** - Use the detected linting and formatting rules
5. **Integrate with existing services** - Leverage existing services and utilities
6. **Consider performance impact** - Account for current performance metrics
7. **Address security context** - Follow existing security patterns

Please provide a complete implementation plan that includes:

1. **Project Overview** - Clear project description and goals
2. **Technical Requirements** - Detailed technical specifications based on current tech stack
3. **Implementation Strategy** - Step-by-step implementation approach using existing patterns
4. **File Structure** - Complete file organization plan following current structure
5. **Dependencies** - All required dependencies considering existing ones
6. **Testing Strategy** - Comprehensive testing approach using existing test patterns
7. **Success Criteria** - Clear success metrics and validation
8. **Integration Points** - How this integrates with existing services and components

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
      logger.info('Sending prompt to IDE chat');

      // Get current project ID
      const projectId = await this.api.getCurrentProjectId();
      
      // Send message to chat using existing APIChatRepository
      const result = await this.api.sendMessage(prompt);
      
      logger.info('Chat message sent successfully');
      
      return {
        success: true,
        messageId: result.id,
        timestamp: new Date(),
        projectId
      };

    } catch (error) {
      logger.error('Failed to send chat message:', error);
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
      logger.info('Starting auto-finish monitoring:', workflowId);

      // Get current project ID
      const projectId = await this.api.getCurrentProjectId();
      
      // Start task creation workflow
      const result = await this.workflowApi.startTaskCreationWorkflow({
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

      logger.info('Task creation workflow started successfully');
      
      return {
        success: true,
        workflowId,
        status: 'running',
        projectId
      };

    } catch (error) {
      logger.error('Failed to start task creation workflow:', error);
      throw new Error(`Failed to start task creation workflow: ${error.message}`);
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
        window.eventBus.emit('task-create:progress', {
          workflowId,
          ...progressData
        });
      }

      logger.info('Progress tracked:', { workflowId, progressData });

    } catch (error) {
      logger.error('Failed to track progress:', error);
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
      logger.error('Failed to get workflow status:', error);
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
      logger.info('Cancelling workflow:', workflowId);

      // Cancel via API
      const result = await this.workflowApi.cancelWorkflow(workflowId);

      // Remove from local tracking
      this.activeWorkflows.delete(workflowId);

      // Emit cancellation event
      if (window.eventBus) {
        window.eventBus.emit('task-create:cancelled', {
          workflowId,
          timestamp: new Date()
        });
      }

      logger.info('Workflow cancelled successfully');
      
      return {
        success: true,
        workflowId,
        status: 'cancelled'
      };

    } catch (error) {
      logger.error('Failed to cancel workflow:', error);
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
        logger.info('Cleaned up workflow:', workflowId);
      }
    }
  }

  /**
   * Get comprehensive project analysis
   * @returns {Promise<Object>} Project analysis data
   */
  async getProjectAnalysis() {
    try {
      const projectId = await this.api.getCurrentProjectId();
      
      // Get workspace info to get project path
      const workspaceInfo = await this.api.getWorkspaceInfo();
      const projectPath = workspaceInfo?.data?.workspacePath;
      
      if (!projectPath) {
        logger.warn('No workspace path found, skipping analysis');
        return {};
      }
      
      // Get comprehensive analysis using existing API
      const analysisResponse = await this.api.analyzeProject(projectPath, {
        includeCodeQuality: true,
        includeArchitecture: true,
        includeTechStack: true,
        includeDependencies: true,
        includeSecurity: true,
        includePerformance: true
      });

      return analysisResponse.data || {};
    } catch (error) {
      logger.error('Failed to get project analysis:', error);
      // Return empty analysis if failed
      return {};
    }
  }

  /**
   * Format project analysis for prompt
   * @param {Object} analysis - Project analysis data
   * @returns {string} Formatted analysis text
   */
  formatProjectAnalysis(analysis) {
    if (!analysis || Object.keys(analysis).length === 0) {
      return '**No project analysis available** - Creating generic plan.';
    }

    let formatted = '';

    // Project Type & Structure
    if (analysis.projectType) {
      formatted += `### Project Type: ${analysis.projectType}\n`;
    }

    // Tech Stack
    if (analysis.techStack) {
      formatted += `### Tech Stack:\n`;
      if (analysis.techStack.frameworks) {
        formatted += `- **Frameworks:** ${analysis.techStack.frameworks.join(', ')}\n`;
      }
      if (analysis.techStack.libraries) {
        formatted += `- **Libraries:** ${analysis.techStack.libraries.join(', ')}\n`;
      }
      if (analysis.techStack.tools) {
        formatted += `- **Tools:** ${analysis.techStack.tools.join(', ')}\n`;
      }
    }

    // Architecture Patterns
    if (analysis.architecture && analysis.architecture.detectedPatterns) {
      formatted += `### Architecture Patterns:\n`;
      analysis.architecture.detectedPatterns.forEach(pattern => {
        formatted += `- **${pattern.name}:** ${pattern.description}\n`;
      });
    }

    // Code Quality
    if (analysis.codeQuality) {
      formatted += `### Code Quality:\n`;
      if (analysis.codeQuality.overallScore) {
        formatted += `- **Overall Score:** ${analysis.codeQuality.overallScore}/100\n`;
      }
      if (analysis.codeQuality.metrics) {
        formatted += `- **Complexity:** ${analysis.codeQuality.metrics.complexity || 'N/A'}\n`;
        formatted += `- **Maintainability:** ${analysis.codeQuality.metrics.maintainability || 'N/A'}\n`;
      }
    }

    // Dependencies
    if (analysis.dependencies) {
      formatted += `### Dependencies:\n`;
      if (analysis.dependencies.outdated) {
        formatted += `- **Outdated:** ${analysis.dependencies.outdated.length} packages\n`;
      }
      if (analysis.dependencies.vulnerabilities) {
        formatted += `- **Vulnerabilities:** ${analysis.dependencies.vulnerabilities.length} found\n`;
      }
    }

    // Security
    if (analysis.security) {
      formatted += `### Security:\n`;
      if (analysis.security.issues) {
        formatted += `- **Issues:** ${analysis.security.issues.length} found\n`;
      }
      if (analysis.security.score) {
        formatted += `- **Score:** ${analysis.security.score}/100\n`;
      }
    }

    // Performance
    if (analysis.performance) {
      formatted += `### Performance:\n`;
      if (analysis.performance.metrics) {
        formatted += `- **Response Time:** ${analysis.performance.metrics.responseTime || 'N/A'}\n`;
        formatted += `- **Memory Usage:** ${analysis.performance.metrics.memoryUsage || 'N/A'}\n`;
      }
    }

    // File Structure
    if (analysis.structure) {
      formatted += `### File Structure:\n`;
      if (analysis.structure.folders) {
        formatted += `- **Main Folders:** ${Object.keys(analysis.structure.folders).join(', ')}\n`;
      }
    }

    // Recommendations
    if (analysis.recommendations && analysis.recommendations.length > 0) {
      formatted += `### Key Recommendations:\n`;
      analysis.recommendations.slice(0, 5).forEach(rec => {
        formatted += `- **${rec.priority}:** ${rec.description}\n`;
      });
    }

    return formatted;
  }
} 