/**
 * WorkflowExecutor - Domain service for executing workflows
 * Handles workflow execution orchestration and task management
 */
const Logger = require('@logging/Logger');
const logger = new Logger('WorkflowExecutor');

class WorkflowExecutor {
    constructor(dependencies = {}) {
        this.stepRegistry = dependencies.stepRegistry;
        this.taskRepository = dependencies.taskRepository;
        this.workflowLoaderService = dependencies.workflowLoaderService;
        this.taskService = dependencies.taskService;
        this.logger = dependencies.logger || logger;
        
        this.logger.info('WorkflowExecutor initialized');
    }

    /**
     * Run workflow for a task
     * @param {string} taskId - Task ID
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Execution result
     */
    async run(taskId, options = {}) {
        try {
            this.logger.info('WorkflowExecutor: Starting workflow execution', {
                taskId: taskId,
                taskMode: options.taskMode,
                userId: options.userId
            });

            // For task creation workflows, skip task loading since task doesn't exist yet
            let task = null;
            if (options.taskMode === 'task-create-workflow' || options.taskMode === 'advanced-task-create-workflow') {
                // This is a task creation workflow with real task in database
                this.logger.info('WorkflowExecutor: Task creation workflow detected, loading real task from database');
                task = await this.loadTask(taskId);
                if (!task) {
                    throw new Error(`Task ${taskId} not found`);
                }
                this.logger.info('WorkflowExecutor: Real task loaded successfully', { taskId, taskTitle: task.title });
            } else {
                // Load task from database for execution workflows
                this.logger.info('WorkflowExecutor: Loading task from database', { taskId });
                task = await this.loadTask(taskId);
                if (!task) {
                    throw new Error(`Task ${taskId} not found`);
                }
                this.logger.info('WorkflowExecutor: Task loaded successfully', { taskId, taskTitle: task.title });
            }

            // Use workflow from options
            if (!options.workflow) {
                throw new Error('Workflow must be specified in options.workflow');
            }
            const workflowName = options.workflow;
            this.logger.info('WorkflowExecutor: Determined workflow name', { workflowName, taskMode: options.taskMode });

            // Load workflow definition
            this.logger.info('WorkflowExecutor: Loading workflow definition', { workflowName });
            const workflow = await this.loadWorkflow(workflowName);
            if (!workflow) {
                throw new Error(`Workflow ${workflowName} not found`);
            }
            this.logger.info('WorkflowExecutor: Workflow loaded successfully', { workflowName, stepsCount: workflow.steps?.length });

            // Create execution context
            const context = {
                taskId: taskId,
                task: task,
                userId: options.userId,
                projectId: options.projectId,
                projectPath: options.projectPath,
                taskMode: options.taskMode,
                ...options
            };
            
            // Log the context being passed to WorkflowExecutionService
            this.logger.info('WorkflowExecutor: Passing context to WorkflowExecutionService', {
                taskId: taskId,
                projectId: context.projectId,
                activeIDE: context.activeIDE ? {
                    port: context.activeIDE.port,
                    type: context.activeIDE.type,
                    workspace: context.activeIDE.workspace
                } : null,
                hasActiveIDE: !!context.activeIDE,
                hasProjectId: !!context.projectId,
                hasProjectPath: !!context.projectPath,
                contextKeys: Object.keys(context)
            });

            // Execute workflow steps directly using StepRegistry
            if (!this.stepRegistry) {
                throw new Error('StepRegistry not available');
            }

            const results = [];
            const startTime = Date.now();

            // Execute workflow steps
            for (const step of workflow.steps || []) {
                try {
                    // Check if step is enabled/skipped
                    if (step.enabled === false) {
                        this.logger.info('WorkflowExecutor: Skipping disabled step', {
                            stepName: step.step,
                            stepType: step.type,
                            stepId: step.id,
                            reason: 'enabled: false'
                        });
                        
                        results.push({
                            success: true,
                            step: step,
                            result: { success: true, skipped: true, reason: 'Step disabled' }
                        });
                        continue;
                    }

                    this.logger.info('WorkflowExecutor: Executing step', {
                        stepName: step.step,
                        stepType: step.type,
                        stepId: step.id
                    });

                    // Prepare step context
                    let stepMessage = step.options?.message;
                    
                    // Build prompt if useTaskPrompt is true
                    if (step.type === 'ide_send_message_step' && step.options?.useTaskPrompt && context.task) {
                        if (this.taskService) {
                            // Use step-specific taskMode if available, otherwise use context taskMode
                            const stepTaskMode = step.options?.taskMode || context.taskMode;
                            
                            // Use the smart router function that handles step-specific prompts
                            stepMessage = await this.taskService.buildTaskPromptForStep(context.task, {
                                taskMode: stepTaskMode,
                                stepName: step.name,
                                ...context
                            });
                            this.logger.info('WorkflowExecutor: Built prompt via router', {
                                taskId: context.task.id,
                                stepName: step.name,
                                taskMode: stepTaskMode,
                                promptLength: stepMessage.length
                            });
                        } else {
                            this.logger.warn('WorkflowExecutor: TaskService not available for prompt building');
                        }
                    }
                    
                    const stepContext = {
                        ...context,
                        ...step.options,
                        message: stepMessage,
                        sessionId: step.options?.sessionId || `workflow-${step.id}`,
                        requestedBy: context.userId,
                        userId: context.userId,
                        projectId: context.projectId,
                        projectPath: context.projectPath,
                        workspacePath: context.projectPath,
                        activeIDE: context.activeIDE
                    };

                    const stepResult = await this.stepRegistry.executeStep(step.step, stepContext);
                    
                    // Check if step actually succeeded
                    const stepSucceeded = stepResult && stepResult.success !== false && !stepResult.error;
                    
                    results.push({
                        success: stepSucceeded,
                        step: step,
                        result: stepResult
                    });

                    if (stepSucceeded) {
                        this.logger.info('WorkflowExecutor: Step completed successfully', {
                            stepName: step.step,
                            stepType: step.type
                        });
                    } else {
                        this.logger.error('WorkflowExecutor: Step FAILED - STOPPING WORKFLOW', {
                            stepName: step.step,
                            stepType: step.type,
                            error: stepResult?.error || 'Unknown error'
                        });
                        
                        // STOP WORKFLOW IMMEDIATELY ON STEP FAILURE
                        throw new Error(`Workflow stopped due to step failure: ${step.step} - ${stepResult?.error || 'Unknown error'}`);
                    }

                } catch (error) {
                    this.logger.error('WorkflowExecutor: Step execution FAILED - STOPPING WORKFLOW', {
                        stepName: step.step,
                        stepType: step.type,
                        error: error.message
                    });
                    
                    results.push({
                        success: false,
                        step: step,
                        error: error.message
                    });
                    
                    // STOP WORKFLOW IMMEDIATELY ON STEP EXCEPTION
                    throw new Error(`Workflow stopped due to step exception: ${step.step} - ${error.message}`);
                }
            }

            const executionTime = Date.now() - startTime;
            const successCount = results.filter(r => r.success).length;
            const totalSteps = results.length;

            const result = {
                success: successCount === totalSteps,
                workflowId: workflow.id,
                taskMode: workflow.type,
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
                    executionTime: new Date(),
                    context: context
                }
            };

            this.logger.info('WorkflowExecutor: Workflow execution completed', {
                taskId: taskId,
                workflowName: workflowName,
                success: result.success,
                summary: result.summary
            });

            return result;

        } catch (error) {
            this.logger.error('WorkflowExecutor: Workflow execution failed', {
                taskId: taskId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Load task from repository
     * @param {string} taskId - Task ID
     * @returns {Promise<Object>} Task object
     */
    async loadTask(taskId) {
        if (!this.taskRepository) {
            throw new Error('TaskRepository not available');
        }
        
        return await this.taskRepository.findById(taskId);
    }

    /**
     * Load workflow definition
     * @param {string} workflowName - Workflow name
     * @returns {Promise<Object>} Workflow definition
     */
    async loadWorkflow(workflowName) {
        if (!this.workflowLoaderService) {
            throw new Error('WorkflowLoaderService not available');
        }
        
        return await this.workflowLoaderService.loadWorkflow(workflowName);
    }
}

module.exports = WorkflowExecutor;
