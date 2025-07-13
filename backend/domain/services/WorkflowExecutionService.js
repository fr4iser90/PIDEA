/**
 * WorkflowExecutionService - Domain Service for Workflow Execution
 * Orchestrates workflow execution using modular IDE commands
 */

const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class WorkflowExecutionService {
  constructor(dependencies = {}) {
    this.validateDependencies(dependencies);
    
    this.chatSessionService = dependencies.chatSessionService;
    this.ideAutomationService = dependencies.ideAutomationService;
    this.browserManager = dependencies.browserManager;
    this.ideManager = dependencies.ideManager;
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger || logger;
    
    this.serviceId = this.generateServiceId();
  }

  /**
   * Validate service dependencies
   * @param {Object} dependencies - Service dependencies
   */
  validateDependencies(dependencies) {
    const requiredDeps = ['chatSessionService', 'ideAutomationService', 'browserManager', 'ideManager'];
    const missingDeps = requiredDeps.filter(dep => !dependencies[dep]);
    
    if (missingDeps.length > 0) {
      throw new Error(`WorkflowExecutionService missing required dependencies: ${missingDeps.join(', ')}`);
    }
  }

  /**
   * Generate unique service ID
   * @returns {string} Service ID
   */
  generateServiceId() {
    return `WorkflowExecutionService_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Execute workflow using modular commands
   * @param {Object} workflow - Workflow definition
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Workflow execution result
   */
  async executeWorkflow(workflow, context = {}) {
    try {
      this.logger.info('[WorkflowExecutionService] Starting workflow execution', {
        serviceId: this.serviceId,
        workflowId: workflow.id,
        workflowType: workflow.type,
        userId: context.userId
      });

      // Publish workflow start event
      await this.eventBus.publish('workflow.execution.started', {
        workflowId: workflow.id,
        workflowType: workflow.type,
        userId: context.userId,
        timestamp: new Date()
      });

      const results = [];
      const startTime = Date.now();

      // Execute workflow steps using modular commands
      for (const step of workflow.steps || []) {
        try {
          const stepResult = await this.executeWorkflowStep(step, context);
          results.push(stepResult);
        } catch (error) {
          this.logger.error('[WorkflowExecutionService] Step execution failed:', error);
          results.push({
            success: false,
            step: step,
            error: error.message
          });
          
          // Continue with next step or break based on workflow configuration
          if (workflow.continueOnError !== true) {
            break;
          }
        }
      }

      const executionTime = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      const totalSteps = results.length;

      const result = {
        success: successCount === totalSteps,
        workflowId: workflow.id,
        workflowType: workflow.type,
        userId: context.userId,
        results: results,
        summary: {
          totalSteps: totalSteps,
          successfulSteps: successCount,
          failedSteps: totalSteps - successCount,
          executionTime: executionTime,
          successRate: totalSteps > 0 ? (successCount / totalSteps) * 100 : 0
        },
        metadata: {
          serviceId: this.serviceId,
          executionTime: new Date(),
          context: context
        }
      };

      // Publish workflow completion event
      await this.eventBus.publish('workflow.execution.completed', {
        workflowId: workflow.id,
        workflowType: workflow.type,
        userId: context.userId,
        result: result,
        timestamp: new Date()
      });

      this.logger.info('[WorkflowExecutionService] Workflow execution completed', {
        serviceId: this.serviceId,
        workflowId: workflow.id,
        success: result.success,
        summary: result.summary
      });

      return result;

    } catch (error) {
      this.logger.error('[WorkflowExecutionService] Workflow execution failed:', error);

      // Publish workflow failure event
      await this.eventBus.publish('workflow.execution.failed', {
        workflowId: workflow.id,
        workflowType: workflow.type,
        userId: context.userId,
        error: error.message,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * Execute a single workflow step
   * @param {Object} step - Workflow step
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Step execution result
   */
  async executeWorkflowStep(step, context = {}) {
    try {
      this.logger.info('[WorkflowExecutionService] Executing workflow step', {
        serviceId: this.serviceId,
        stepId: step.id,
        stepType: step.type,
        command: step.command
      });

      // Publish step start event
      await this.eventBus.publish('workflow.step.started', {
        stepId: step.id,
        stepType: step.type,
        command: step.command,
        userId: context.userId,
        timestamp: new Date()
      });

      let stepResult;

      // Execute step based on type
      switch (step.type) {
        case 'chat':
          stepResult = await this.executeChatStep(step, context);
          break;
        case 'terminal':
          stepResult = await this.executeTerminalStep(step, context);
          break;
        case 'analysis':
          stepResult = await this.executeAnalysisStep(step, context);
          break;
        case 'ide':
          stepResult = await this.executeIDEStep(step, context);
          break;
        default:
          throw new Error(`Unsupported step type: ${step.type}`);
      }

      // Publish step completion event
      await this.eventBus.publish('workflow.step.completed', {
        stepId: step.id,
        stepType: step.type,
        command: step.command,
        userId: context.userId,
        result: stepResult,
        timestamp: new Date()
      });

      return {
        success: true,
        step: step,
        result: stepResult
      };

    } catch (error) {
      this.logger.error('[WorkflowExecutionService] Step execution failed:', error);

      // Publish step failure event
      await this.eventBus.publish('workflow.step.failed', {
        stepId: step.id,
        stepType: step.type,
        command: step.command,
        userId: context.userId,
        error: error.message,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * Execute chat step using modular commands
   * @param {Object} step - Chat step
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Chat step result
   */
  async executeChatStep(step, context = {}) {
    const { CreateChatCommand, SendMessageCommand, SwitchChatCommand } = require('@categories/ide');

    switch (step.command) {
      case 'createChat':
        const createChatCommand = new CreateChatCommand({
          userId: context.userId,
          message: step.message,
          options: step.options
        });
        return await createChatCommand.execute(context);

      case 'sendMessage':
        const sendMessageCommand = new SendMessageCommand({
          userId: context.userId,
          message: step.message,
          sessionId: step.sessionId,
          options: step.options
        });
        return await sendMessageCommand.execute(context);

      case 'switchChat':
        const switchChatCommand = new SwitchChatCommand({
          userId: context.userId,
          sessionId: step.sessionId,
          options: step.options
        });
        return await switchChatCommand.execute(context);

      default:
        throw new Error(`Unsupported chat command: ${step.command}`);
    }
  }

  /**
   * Execute terminal step using modular commands
   * @param {Object} step - Terminal step
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Terminal step result
   */
  async executeTerminalStep(step, context = {}) {
    const { OpenTerminalCommand, ExecuteTerminalCommand, MonitorTerminalOutputCommand } = require('@categories/ide');

    switch (step.command) {
      case 'openTerminal':
        const openTerminalCommand = new OpenTerminalCommand({
          userId: context.userId,
          options: step.options
        });
        return await openTerminalCommand.execute(context);

      case 'executeCommand':
        const executeTerminalCommand = new ExecuteTerminalCommand({
          userId: context.userId,
          command: step.terminalCommand,
          options: step.options
        });
        return await executeTerminalCommand.execute(context);

      case 'monitorOutput':
        const monitorTerminalCommand = new MonitorTerminalOutputCommand({
          userId: context.userId,
          options: step.options
        });
        return await monitorTerminalCommand.execute(context);

      default:
        throw new Error(`Unsupported terminal command: ${step.command}`);
    }
  }

  /**
   * Execute analysis step using modular commands
   * @param {Object} step - Analysis step
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Analysis step result
   */
  async executeAnalysisStep(step, context = {}) {
    const { AnalyzeProjectCommand, GetWorkspaceInfoCommand } = require('@categories/ide');

    switch (step.command) {
      case 'analyzeProject':
        const analyzeProjectCommand = new AnalyzeProjectCommand({
          userId: context.userId,
          workspacePath: step.workspacePath,
          analysisType: step.analysisType,
          options: step.options
        });
        return await analyzeProjectCommand.execute(context);

      case 'getWorkspaceInfo':
        const getWorkspaceInfoCommand = new GetWorkspaceInfoCommand({
          userId: context.userId,
          workspacePath: step.workspacePath,
          options: step.options
        });
        return await getWorkspaceInfoCommand.execute(context);

      default:
        throw new Error(`Unsupported analysis command: ${step.command}`);
    }
  }

  /**
   * Execute IDE step using modular commands
   * @param {Object} step - IDE step
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} IDE step result
   */
  async executeIDEStep(step, context = {}) {
    const { SwitchIDEPortCommand, OpenFileExplorerCommand, OpenCommandPaletteCommand, ExecuteIDEActionCommand } = require('@categories/ide');

    switch (step.command) {
      case 'switchPort':
        const switchPortCommand = new SwitchIDEPortCommand({
          userId: context.userId,
          port: step.port,
          ideType: step.ideType,
          options: step.options
        });
        return await switchPortCommand.execute(context);

      case 'openFileExplorer':
        const openFileExplorerCommand = new OpenFileExplorerCommand({
          userId: context.userId,
          ideType: step.ideType,
          path: step.path,
          options: step.options
        });
        return await openFileExplorerCommand.execute(context);

      case 'openCommandPalette':
        const openCommandPaletteCommand = new OpenCommandPaletteCommand({
          userId: context.userId,
          ideType: step.ideType,
          searchTerm: step.searchTerm,
          options: step.options
        });
        return await openCommandPaletteCommand.execute(context);

      case 'executeAction':
        const executeActionCommand = new ExecuteIDEActionCommand({
          userId: context.userId,
          ideType: step.ideType,
          action: step.action,
          actionType: step.actionType,
          parameters: step.parameters,
          options: step.options
        });
        return await executeActionCommand.execute(context);

      default:
        throw new Error(`Unsupported IDE command: ${step.command}`);
    }
  }

  /**
   * Get service metadata
   * @returns {Object} Service metadata
   */
  getMetadata() {
    return {
      id: this.serviceId,
      type: 'WorkflowExecutionService',
      dependencies: ['chatSessionService', 'ideAutomationService', 'browserManager', 'ideManager', 'eventBus'],
      supportedWorkflowTypes: ['chat', 'terminal', 'analysis', 'ide', 'mixed']
    };
  }
}

module.exports = WorkflowExecutionService; 