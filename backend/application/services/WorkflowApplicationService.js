/**
 * WorkflowApplicationService - Application layer service for workflow operations
 * 
 * RESPONSIBILITIES:
 * ✅ Coordinate workflow execution use cases
 * ✅ Handle workflow orchestration and step management
 * ✅ Manage project context and IDE integration
 * ✅ Orchestrate task creation and execution workflows
 * 
 * LAYER COMPLIANCE:
 * ✅ Application layer - coordinates between Presentation and Domain
 * ✅ Uses Domain services and Infrastructure repositories through interfaces
 * ✅ Handles DTOs and use case orchestration
 */
const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');
const { getStepRegistry } = require('@steps');

class WorkflowApplicationService {
  constructor({
    commandBus,
    queryBus,
    eventBus,
    ideManager,
    taskService,
    projectMappingService,
    logger
  }) {
    // Application layer services
    this.commandBus = commandBus;
    this.queryBus = queryBus;
    this.eventBus = eventBus;
    this.logger = logger || new ServiceLogger('WorkflowApplicationService');
    
    // Domain services
    // Remove circular dependency on application
    this.ideManager = ideManager;
    this.taskService = taskService;
    // TODO: Add workflowExecutionService when implemented
    this.projectMappingService = projectMappingService;
  }

  /**
   * Get project workspace path with fallback detection
   * @param {string} projectId - Project identifier
   * @returns {Promise<string>} Project workspace path
   */
  async getProjectWorkspacePath(projectId) {
    try {
      // Try project mapping service first
      if (this.projectMappingService) {
        try {
          const projectInfo = await this.projectMappingService.getProjectInfo(projectId);
          if (projectInfo && projectInfo.workspacePath) {
            this.logger.info(`✅ Using project mapping workspace: ${projectInfo.workspacePath}`);
            return projectInfo.workspacePath;
          }
        } catch (error) {
          this.logger.warn('Project mapping failed:', error.message);
        }
      }
      
      // Try IDE manager detection
      if (this.ideManager) {
        try {
          const activeIDE = await this.ideManager.getActiveIDE();
          if (activeIDE && activeIDE.port) {
            const workspacePath = await this.ideManager.detectWorkspacePath(activeIDE.port);
            if (workspacePath) {
              this.logger.info(`✅ Using IDE detected workspace: ${workspacePath}`);
              return workspacePath;
            }
          }
        } catch (error) {
          this.logger.warn('IDE workspace detection failed:', error.message);
        }
      }
      
      // Fallback to current working directory
      const fallbackPath = process.cwd();
      this.logger.warn(`Using fallback workspace path: ${fallbackPath}`);
      return fallbackPath;
      
    } catch (error) {
      this.logger.error('❌ Failed to get project workspace path:', error);
      throw new Error(`Failed to get project workspace path: ${error.message}`);
    }
  }

  /**
   * Execute workflow with comprehensive orchestration
   * @param {Object} workflowData - Workflow execution parameters
   * @param {Object} userContext - User context from request
   * @returns {Promise<Object>} Workflow execution result
   */
  async executeWorkflow(workflowData, userContext) {
    try {
      const {
        projectId,
        projectPath,
        mode = 'full',
        options = {},
        aiModel = 'gpt-4',
        autoExecute = true,
        task,
        createGitBranch = false,
        branchName,
        clickNewChat = false
      } = workflowData;
      
      this.logger.info('WorkflowApplicationService: Starting workflow execution', {
        projectId,
        mode,
        hasTask: !!task,
        createGitBranch,
        clickNewChat,
        userId: userContext.userId
      });
      
      // Get workspace path
      const workspacePath = projectPath || await this.getProjectWorkspacePath(projectId);
      
      // Get active IDE for context
      let activeIDE = null;
      if (this.ideManager) {
        try {
          activeIDE = await this.ideManager.getActiveIDE();
          this.logger.info('Active IDE detected:', { 
            port: activeIDE?.port,
            type: activeIDE?.type 
          });
        } catch (error) {
          this.logger.warn('Failed to get active IDE:', error.message);
        }
      }
      
      // Extract task-specific options
      const taskOptions = (workflowData.taskId || options.taskId) ? {
        taskId: workflowData.taskId || options.taskId,
        createGitBranch: createGitBranch || options.createGitBranch || false,
        branchName: branchName || options.branchName,
        clickNewChat: clickNewChat || options.clickNewChat || false,
        autoExecute: autoExecute || options.autoExecute || true
      } : null;
      
      this.logger.info('Extracted taskOptions:', taskOptions);
      
      let executionResult = null;
      
      // Handle new chat creation if requested
      if (clickNewChat && activeIDE) {
        try {
          await this.createNewChatSession(activeIDE, userContext);
        } catch (error) {
          this.logger.warn('New chat creation failed, continuing workflow:', error.message);
        }
      }
      
      // Execute task if specified
      if (taskOptions && taskOptions.taskId && this.taskService) {
        try {
          executionResult = await this.executeTaskWorkflow(taskOptions, workspacePath, userContext, activeIDE);
        } catch (error) {
          this.logger.error('Task execution failed:', error);
          throw new Error(`Task execution failed: ${error.message}`);
        }
      }
      
      // Execute standard workflow if no task or additional processing needed
      if (!taskOptions || mode === 'analysis' || mode === 'full') {
        try {
          const standardResult = await this.executeStandardWorkflow({
            projectId,
            workspacePath,
            mode,
            aiModel,
            autoExecute,
            userId: userContext.userId,
            activeIDE,
            options
          });
          
          // Merge results if both task and standard workflow executed
          if (executionResult) {
            executionResult = {
              ...executionResult,
              standardWorkflow: standardResult,
              combinedExecution: true
            };
          } else {
            executionResult = standardResult;
          }
        } catch (error) {
          this.logger.error('Standard workflow failed:', error);
          if (!executionResult) {
            throw new Error(`Standard workflow failed: ${error.message}`);
          }
        }
      }
      
      this.logger.info('✅ Workflow execution completed successfully');
      
      return {
        success: true,
        data: {
          projectId,
          workspacePath,
          mode,
          executionId: executionResult?.executionId,
          taskExecution: executionResult?.taskExecution,
          standardExecution: executionResult?.standardWorkflow || executionResult,
          activeIDE: activeIDE ? {
            port: activeIDE.port,
            type: activeIDE.type
          } : null,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      this.logger.error('❌ Workflow execution failed:', error);
      throw new Error(`Workflow execution failed: ${error.message}`);
    }
  }

  /**
   * Execute task-specific workflow
   * @param {Object} taskOptions - Task execution options
   * @param {string} workspacePath - Project workspace path
   * @param {Object} userContext - User context
   * @param {Object} activeIDE - Active IDE info
   * @returns {Promise<Object>} Task execution result
   */
  async executeTaskWorkflow(taskOptions, workspacePath, userContext, activeIDE) {
    try {
      this.logger.info('Executing task workflow:', { 
        taskId: taskOptions.taskId,
        workspacePath,
        userId: userContext.userId
      });
      
      if (!this.taskService) {
        throw new Error('Task service not available');
      }
      
      // Execute task with enhanced context
      const taskResult = await this.taskService.executeTask(taskOptions.taskId, userContext.userId, {
        projectPath: workspacePath,
        createGitBranch: taskOptions.createGitBranch,
        branchName: taskOptions.branchName,
        autoExecute: taskOptions.autoExecute,
        activeIDEPort: activeIDE?.port,
        projectId: taskOptions.projectId
      });
      
      this.logger.info('✅ Task workflow executed successfully:', { 
        taskId: taskOptions.taskId,
        executionId: taskResult.executionId
      });
      
      return {
        taskExecution: taskResult,
        executionId: taskResult.executionId,
        type: 'task'
      };
      
    } catch (error) {
      this.logger.error('❌ Task workflow execution failed:', error);
      throw new Error(`Task workflow execution failed: ${error.message}`);
    }
  }

  /**
   * Execute standard workflow (analysis, refactoring, etc.)
   * @param {Object} workflowParams - Standard workflow parameters
   * @returns {Promise<Object>} Standard workflow result
   */
  async executeStandardWorkflow(workflowParams) {
    try {
      const {
        projectId,
        workspacePath,
        mode,
        aiModel,
        autoExecute,
        userId,
        activeIDE,
        options
      } = workflowParams;
      
      this.logger.info('Executing standard workflow:', { 
        projectId,
        mode,
        workspacePath
      });
      
      if (!this.workflowExecutionService) {
        throw new Error('Workflow execution service not available');
      }
      
      // Prepare step options with all required services
      const stepOptions = {
        projectPath: workspacePath,
        aiModel,
        autoExecute,
        userId,
        projectId,
        activeIDEPort: activeIDE?.port,
        // Add required services for steps
        refactoringService: this.application?.refactoringService,
        aiService: this.application?.aiService,
        optimizationService: this.application?.optimizationService,
        cleanupService: this.application?.cleanupService,
        restructureService: this.application?.restructureService,
        modernizeService: this.application?.modernizeService,
        testingService: this.application?.testingService,
        deploymentService: this.application?.deploymentService,
        customTaskService: this.application?.customTaskService,
        taskRepository: this.application?.taskRepository,
                    analysisRepository: this.application?.analysisRepository,
        analysisOutputService: this.application?.analysisOutputService,
        projectAnalyzer: this.application?.projectAnalyzer,
        codeQualityAnalyzer: this.application?.codeQualityAnalyzer,
        architectureAnalyzer: this.application?.architectureAnalyzer,
        stepRegistry: getStepRegistry(),
        ...options
      };
      
      // Execute workflow based on mode
      let workflowResult;
      
      switch (mode) {
        case 'analysis':
          workflowResult = await this.workflowExecutionService.executeAnalysisWorkflow(stepOptions);
          break;
        case 'refactoring':
          workflowResult = await this.workflowExecutionService.executeRefactoringWorkflow(stepOptions);
          break;
        case 'full':
        default:
          workflowResult = await this.workflowExecutionService.executeFullWorkflow(stepOptions);
          break;
      }
      
      this.logger.info('✅ Standard workflow executed successfully:', { 
        mode,
        executionId: workflowResult.executionId
      });
      
      return {
        executionId: workflowResult.executionId,
        result: workflowResult.result,
        type: 'standard',
        mode
      };
      
    } catch (error) {
      this.logger.error('❌ Standard workflow execution failed:', error);
      throw new Error(`Standard workflow execution failed: ${error.message}`);
    }
  }

  /**
   * Create new chat session for workflow
   * @param {Object} activeIDE - Active IDE information
   * @param {Object} userContext - User context
   * @returns {Promise<Object>} Chat creation result
   */
  async createNewChatSession(activeIDE, userContext) {
    try {
      this.logger.info('Creating new chat session for workflow');
      
      // This would typically use a CreateChatCommand and Handler
      // For now, we'll simulate the basic functionality
      if (this.eventBus) {
        await this.eventBus.publish('chat:newSessionRequested', {
          userId: userContext.userId,
          idePort: activeIDE.port,
          timestamp: new Date().toISOString()
        });
      }
      
      this.logger.info('✅ New chat session request published');
      
      return {
        success: true,
        idePort: activeIDE.port,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to create new chat session:', error);
      throw new Error(`Failed to create new chat session: ${error.message}`);
    }
  }

  /**
   * Get workflow execution status
   * @param {string} executionId - Workflow execution ID
   * @returns {Promise<Object>} Execution status
   */
  async getWorkflowStatus(executionId) {
    try {
      this.logger.info(`Getting workflow status: ${executionId}`);
      
      if (!this.workflowExecutionService) {
        throw new Error('Workflow execution service not available');
      }
      
      const status = await this.workflowExecutionService.getExecutionStatus(executionId);
      
      return {
        success: true,
        data: {
          executionId,
          status: status.status,
          progress: status.progress,
          startedAt: status.startedAt,
          completedAt: status.completedAt,
          duration: status.duration,
          currentStep: status.currentStep,
          totalSteps: status.totalSteps,
          result: status.result
        }
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to get workflow status:', error);
      throw new Error(`Failed to get workflow status: ${error.message}`);
    }
  }

  /**
   * Cancel workflow execution
   * @param {string} executionId - Workflow execution ID
   * @param {Object} userContext - User context
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelWorkflow(executionId, userContext) {
    try {
      this.logger.info(`Cancelling workflow: ${executionId}`);
      
      if (!this.workflowExecutionService) {
        throw new Error('Workflow execution service not available');
      }
      
      const result = await this.workflowExecutionService.cancelExecution(executionId, userContext.userId);
      
      // Publish cancellation event
      if (this.eventBus) {
        await this.eventBus.publish('workflow:cancelled', {
          executionId,
          userId: userContext.userId,
          timestamp: new Date().toISOString()
        });
      }
      
      this.logger.info('✅ Workflow cancelled successfully');
      
      return {
        success: true,
        data: {
          executionId,
          cancelled: true,
          cancelledAt: result.cancelledAt,
          cancelledBy: userContext.userId
        }
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to cancel workflow:', error);
      throw new Error(`Failed to cancel workflow: ${error.message}`);
    }
  }

  /**
   * Get available workflow templates
   * @returns {Promise<Object>} Available templates
   */
  async getWorkflowTemplates() {
    try {
      this.logger.info('Getting available workflow templates');
      
      const stepRegistry = getStepRegistry();
      const availableSteps = stepRegistry ? stepRegistry.getAllSteps() : [];
      
      const templates = [
        {
          id: 'analysis',
          name: 'Project Analysis',
          description: 'Comprehensive project analysis including code quality, security, and architecture',
          steps: ['project_analysis_step', 'architecture_analysis_step', 'security_analysis_step'],
          estimatedDuration: '5-10 minutes'
        },
        {
          id: 'refactoring',
          name: 'Code Refactoring',
          description: 'Automated code refactoring with quality improvements',
          steps: ['refactor_analyze', 'refactor_step', 'testing_step'],
          estimatedDuration: '10-20 minutes'
        },
        {
          id: 'full',
          name: 'Full Workflow',
          description: 'Complete analysis and refactoring workflow',
          steps: ['project_analysis_step', 'refactor_step', 'testing_step'],
          estimatedDuration: '15-30 minutes'
        }
      ];
      
      return {
        success: true,
        data: {
          templates,
          availableSteps: availableSteps.length,
          totalTemplates: templates.length
        }
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to get workflow templates:', error);
      throw new Error(`Failed to get workflow templates: ${error.message}`);
    }
  }
}

module.exports = WorkflowApplicationService; 