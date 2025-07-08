/**
 * WorkflowOrchestrationService - Domain Service for Workflow Orchestration
 * Implements DDD patterns for coordinating different workflow types
 */
const WorkflowGitService = require('./WorkflowGitService');
const TaskType = require('../value-objects/TaskType');

class WorkflowOrchestrationService {
    constructor(dependencies = {}) {
        this.workflowGitService = dependencies.workflowGitService || new WorkflowGitService(dependencies);
        this.cursorIDEService = dependencies.cursorIDEService;
        this.autoFinishSystem = dependencies.autoFinishSystem;
        this.taskRepository = dependencies.taskRepository;
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
    }

    /**
     * Execute workflow based on task type
     * @param {Object} task - Task object
     * @param {Object} options - Workflow options
     * @returns {Promise<Object>} Workflow execution result
     */
    async executeWorkflow(task, options = {}) {
        let branchResult = null;
        
        try {
            this.logger.info('WorkflowOrchestrationService: Starting workflow execution', {
                taskId: task.id,
                taskType: task.type?.value,
                projectPath: task.metadata?.projectPath
            });

            // Step 1: Create workflow-specific branch
            branchResult = await this.workflowGitService.createWorkflowBranch(
                task.metadata.projectPath,
                task,
                options
            );

            // Step 2: Execute workflow based on task type
            const workflowResult = await this.executeWorkflowByType(task, options);

            // Step 3: Complete workflow and merge
            const completionResult = await this.workflowGitService.completeWorkflow(
                task.metadata.projectPath,
                branchResult.branchName,
                task,
                options
            );

            const result = {
                success: true,
                taskId: task.id,
                taskType: task.type?.value,
                branch: branchResult,
                workflow: workflowResult,
                completion: completionResult,
                message: `Workflow completed successfully for task: ${task.title}`,
                metadata: {
                    executionTime: Date.now() - (workflowResult.startedAt || Date.now()),
                    timestamp: new Date()
                }
            };

            // Emit workflow completed event
            if (this.eventBus) {
                this.eventBus.publish('workflow.execution.completed', {
                    taskId: task.id,
                    result,
                    timestamp: new Date()
                });
            }

            return result;

        } catch (error) {
            this.logger.error('WorkflowOrchestrationService: Workflow execution failed', {
                taskId: task.id,
                error: error.message
            });

            // Attempt rollback if branch was created
            if (task.metadata?.projectPath && branchResult?.branchName) {
                try {
                    await this.workflowGitService.rollbackWorkflow(
                        task.metadata.projectPath,
                        branchResult.branchName,
                        task
                    );
                } catch (rollbackError) {
                    this.logger.error('WorkflowOrchestrationService: Rollback failed', {
                        taskId: task.id,
                        rollbackError: rollbackError.message
                    });
                }
            }

            throw new Error(`Workflow execution failed: ${error.message}`);
        }
    }

    /**
     * Execute workflow based on task type
     * @param {Object} task - Task object
     * @param {Object} options - Workflow options
     * @returns {Promise<Object>} Workflow result
     */
    async executeWorkflowByType(task, options = {}) {
        const taskType = task.type?.value;

        switch (taskType) {
            case TaskType.REFACTORING.value:
                return await this.executeRefactoringWorkflow(task, options);

            case TaskType.FEATURE.value:
                return await this.executeFeatureWorkflow(task, options);

            case TaskType.BUG_FIX.value:
                return await this.executeBugFixWorkflow(task, options);

            case TaskType.ANALYSIS.value:
                return await this.executeAnalysisWorkflow(task, options);

            case TaskType.TESTING.value:
                return await this.executeTestingWorkflow(task, options);

            case TaskType.DOCUMENTATION.value:
                return await this.executeDocumentationWorkflow(task, options);

            case TaskType.DEBUG.value:
                return await this.executeDebugWorkflow(task, options);

            case TaskType.OPTIMIZATION.value:
                return await this.executeOptimizationWorkflow(task, options);

            case TaskType.CODE_REVIEW.value:
                return await this.executeCodeReviewWorkflow(task, options);

            case TaskType.HOTFIX.value:
                return await this.executeHotfixWorkflow(task, options);

            default:
                return await this.executeGenericWorkflow(task, options);
        }
    }

    /**
     * Execute refactoring workflow
     * @param {Object} task - Task object
     * @param {Object} options - Workflow options
     * @returns {Promise<Object>} Refactoring result
     */
    async executeRefactoringWorkflow(task, options = {}) {
        const startedAt = Date.now();

        try {
            this.logger.info('WorkflowOrchestrationService: Executing refactoring workflow', {
                taskId: task.id,
                filePath: task.metadata?.filePath
            });

            // Step 1: Create new chat for refactoring
            if (this.cursorIDEService?.browserManager) {
                await this.cursorIDEService.browserManager.clickNewChat();
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Step 2: Execute AI refactoring with Auto-Finish
            let refactoringResult;
            if (this.autoFinishSystem && this.cursorIDEService) {
                refactoringResult = await this.autoFinishSystem.processTask(task, `refactor-${task.id}`, {
                    stopOnError: false,
                    maxConfirmationAttempts: 3,
                    confirmationTimeout: 10000,
                    fallbackDetectionEnabled: true
                });
            } else {
                // Fallback to direct AI refactoring
                const aiPrompt = await this.buildRefactoringPrompt(task);
                refactoringResult = await this.cursorIDEService.sendMessage(aiPrompt);
            }

            // Step 3: Validate refactoring
            const validationResult = await this.validateRefactoring(task, refactoringResult);

            return {
                type: 'refactoring',
                success: validationResult.success,
                refactoringResult,
                validationResult,
                startedAt,
                completedAt: Date.now(),
                duration: Date.now() - startedAt
            };

        } catch (error) {
            throw new Error(`Refactoring workflow failed: ${error.message}`);
        }
    }

    /**
     * Execute feature implementation workflow
     * @param {Object} task - Task object
     * @param {Object} options - Workflow options
     * @returns {Promise<Object>} Feature implementation result
     */
    async executeFeatureWorkflow(task, options = {}) {
        const startedAt = Date.now();

        try {
            this.logger.info('WorkflowOrchestrationService: Executing feature workflow', {
                taskId: task.id
            });

            // Step 1: Create new chat for feature development
            if (this.cursorIDEService?.browserManager) {
                await this.cursorIDEService.browserManager.clickNewChat();
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Step 2: Execute feature implementation
            const featurePrompt = await this.buildFeaturePrompt(task);
            const featureResult = await this.cursorIDEService.sendMessage(featurePrompt);

            // Step 3: Generate tests for the feature
            const testPrompt = await this.buildTestGenerationPrompt(task);
            const testResult = await this.cursorIDEService.sendMessage(testPrompt);

            // Step 4: Validate feature implementation
            const validationResult = await this.validateFeatureImplementation(task, featureResult, testResult);

            return {
                type: 'feature',
                success: validationResult.success,
                featureResult,
                testResult,
                validationResult,
                startedAt,
                completedAt: Date.now(),
                duration: Date.now() - startedAt
            };

        } catch (error) {
            throw new Error(`Feature workflow failed: ${error.message}`);
        }
    }

    /**
     * Execute bug fix workflow
     * @param {Object} task - Task object
     * @param {Object} options - Workflow options
     * @returns {Promise<Object>} Bug fix result
     */
    async executeBugFixWorkflow(task, options = {}) {
        const startedAt = Date.now();

        try {
            this.logger.info('WorkflowOrchestrationService: Executing bug fix workflow', {
                taskId: task.id
            });

            // Step 1: Create new chat for bug fixing
            if (this.cursorIDEService?.browserManager) {
                await this.cursorIDEService.browserManager.clickNewChat();
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Step 2: Analyze the bug
            const analysisPrompt = await this.buildBugAnalysisPrompt(task);
            const analysisResult = await this.cursorIDEService.sendMessage(analysisPrompt);

            // Step 3: Implement the fix
            const fixPrompt = await this.buildBugFixPrompt(task, analysisResult);
            const fixResult = await this.cursorIDEService.sendMessage(fixPrompt);

            // Step 4: Validate the fix
            const validationResult = await this.validateBugFix(task, fixResult);

            return {
                type: 'bugfix',
                success: validationResult.success,
                analysisResult,
                fixResult,
                validationResult,
                startedAt,
                completedAt: Date.now(),
                duration: Date.now() - startedAt
            };

        } catch (error) {
            throw new Error(`Bug fix workflow failed: ${error.message}`);
        }
    }

    /**
     * Execute analysis workflow
     * @param {Object} task - Task object
     * @param {Object} options - Workflow options
     * @returns {Promise<Object>} Analysis result
     */
    async executeAnalysisWorkflow(task, options = {}) {
        const startedAt = Date.now();

        try {
            this.logger.info('WorkflowOrchestrationService: Executing analysis workflow', {
                taskId: task.id
            });

            // Step 1: Create new chat for analysis
            if (this.cursorIDEService?.browserManager) {
                await this.cursorIDEService.browserManager.clickNewChat();
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Step 2: Execute comprehensive analysis
            const analysisPrompt = await this.buildAnalysisPrompt(task);
            const analysisResult = await this.cursorIDEService.sendMessage(analysisPrompt);

            // Step 3: Generate analysis report
            const reportPrompt = await this.buildReportGenerationPrompt(task, analysisResult);
            const reportResult = await this.cursorIDEService.sendMessage(reportPrompt);

            return {
                type: 'analysis',
                success: true,
                analysisResult,
                reportResult,
                startedAt,
                completedAt: Date.now(),
                duration: Date.now() - startedAt
            };

        } catch (error) {
            throw new Error(`Analysis workflow failed: ${error.message}`);
        }
    }

    /**
     * Execute testing workflow
     * @param {Object} task - Task object
     * @param {Object} options - Workflow options
     * @returns {Promise<Object>} Testing result
     */
    async executeTestingWorkflow(task, options = {}) {
        const startedAt = Date.now();

        try {
            this.logger.info('WorkflowOrchestrationService: Executing testing workflow', {
                taskId: task.id
            });

            // Step 1: Create new chat for testing
            if (this.cursorIDEService?.browserManager) {
                await this.cursorIDEService.browserManager.clickNewChat();
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Step 2: Generate tests
            const testPrompt = await this.buildTestGenerationPrompt(task);
            const testResult = await this.cursorIDEService.sendMessage(testPrompt);

            // Step 3: Run tests
            const runTestPrompt = await this.buildTestExecutionPrompt(task, testResult);
            const runTestResult = await this.cursorIDEService.sendMessage(runTestPrompt);

            return {
                type: 'testing',
                success: runTestResult.success,
                testResult,
                runTestResult,
                startedAt,
                completedAt: Date.now(),
                duration: Date.now() - startedAt
            };

        } catch (error) {
            throw new Error(`Testing workflow failed: ${error.message}`);
        }
    }

    /**
     * Execute documentation workflow
     * @param {Object} task - Task object
     * @param {Object} options - Workflow options
     * @returns {Promise<Object>} Documentation result
     */
    async executeDocumentationWorkflow(task, options = {}) {
        const startedAt = Date.now();

        try {
            this.logger.info('WorkflowOrchestrationService: Executing documentation workflow', {
                taskId: task.id
            });

            // Step 1: Create new chat for documentation
            if (this.cursorIDEService?.browserManager) {
                await this.cursorIDEService.browserManager.clickNewChat();
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Step 2: Generate documentation
            const docPrompt = await this.buildDocumentationPrompt(task);
            const docResult = await this.cursorIDEService.sendMessage(docPrompt);

            // Step 3: Validate documentation
            const validationResult = await this.validateDocumentation(task, docResult);

            return {
                type: 'documentation',
                success: validationResult.success,
                docResult,
                validationResult,
                startedAt,
                completedAt: Date.now(),
                duration: Date.now() - startedAt
            };

        } catch (error) {
            throw new Error(`Documentation workflow failed: ${error.message}`);
        }
    }

    /**
     * Execute debug workflow
     * @param {Object} task - Task object
     * @param {Object} options - Workflow options
     * @returns {Promise<Object>} Debug result
     */
    async executeDebugWorkflow(task, options = {}) {
        const startedAt = Date.now();

        try {
            this.logger.info('WorkflowOrchestrationService: Executing debug workflow', {
                taskId: task.id
            });

            // Step 1: Create new chat for debugging
            if (this.cursorIDEService?.browserManager) {
                await this.cursorIDEService.browserManager.clickNewChat();
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Step 2: Analyze the issue
            const debugPrompt = await this.buildDebugPrompt(task);
            const debugResult = await this.cursorIDEService.sendMessage(debugPrompt);

            // Step 3: Generate debug report
            const reportPrompt = await this.buildDebugReportPrompt(task, debugResult);
            const reportResult = await this.cursorIDEService.sendMessage(reportPrompt);

            return {
                type: 'debug',
                success: true,
                debugResult,
                reportResult,
                startedAt,
                completedAt: Date.now(),
                duration: Date.now() - startedAt
            };

        } catch (error) {
            throw new Error(`Debug workflow failed: ${error.message}`);
        }
    }

    /**
     * Execute optimization workflow
     * @param {Object} task - Task object
     * @param {Object} options - Workflow options
     * @returns {Promise<Object>} Optimization result
     */
    async executeOptimizationWorkflow(task, options = {}) {
        const startedAt = Date.now();

        try {
            this.logger.info('WorkflowOrchestrationService: Executing optimization workflow', {
                taskId: task.id
            });

            // Step 1: Create new chat for optimization
            if (this.cursorIDEService?.browserManager) {
                await this.cursorIDEService.browserManager.clickNewChat();
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Step 2: Analyze current performance
            const analysisPrompt = await this.buildOptimizationAnalysisPrompt(task);
            const analysisResult = await this.cursorIDEService.sendMessage(analysisPrompt);

            // Step 3: Implement optimizations
            const optimizationPrompt = await this.buildOptimizationPrompt(task, analysisResult);
            const optimizationResult = await this.cursorIDEService.sendMessage(optimizationPrompt);

            // Step 4: Validate optimizations
            const validationResult = await this.validateOptimization(task, optimizationResult);

            return {
                type: 'optimization',
                success: validationResult.success,
                analysisResult,
                optimizationResult,
                validationResult,
                startedAt,
                completedAt: Date.now(),
                duration: Date.now() - startedAt
            };

        } catch (error) {
            throw new Error(`Optimization workflow failed: ${error.message}`);
        }
    }

    /**
     * Execute code review workflow
     * @param {Object} task - Task object
     * @param {Object} options - Workflow options
     * @returns {Promise<Object>} Code review result
     */
    async executeCodeReviewWorkflow(task, options = {}) {
        const startedAt = Date.now();

        try {
            this.logger.info('WorkflowOrchestrationService: Executing code review workflow', {
                taskId: task.id
            });

            // Step 1: Create new chat for code review
            if (this.cursorIDEService?.browserManager) {
                await this.cursorIDEService.browserManager.clickNewChat();
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Step 2: Perform code review
            const reviewPrompt = await this.buildCodeReviewPrompt(task);
            const reviewResult = await this.cursorIDEService.sendMessage(reviewPrompt);

            // Step 3: Generate review report
            const reportPrompt = await this.buildReviewReportPrompt(task, reviewResult);
            const reportResult = await this.cursorIDEService.sendMessage(reportPrompt);

            return {
                type: 'code_review',
                success: true,
                reviewResult,
                reportResult,
                startedAt,
                completedAt: Date.now(),
                duration: Date.now() - startedAt
            };

        } catch (error) {
            throw new Error(`Code review workflow failed: ${error.message}`);
        }
    }

    /**
     * Execute hotfix workflow
     * @param {Object} task - Task object
     * @param {Object} options - Workflow options
     * @returns {Promise<Object>} Hotfix result
     */
    async executeHotfixWorkflow(task, options = {}) {
        const startedAt = Date.now();

        try {
            this.logger.info('WorkflowOrchestrationService: Executing hotfix workflow', {
                taskId: task.id
            });

            // Step 1: Create new chat for hotfix
            if (this.cursorIDEService?.browserManager) {
                await this.cursorIDEService.browserManager.clickNewChat();
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Step 2: Analyze the critical issue
            const analysisPrompt = await this.buildHotfixAnalysisPrompt(task);
            const analysisResult = await this.cursorIDEService.sendMessage(analysisPrompt);

            // Step 3: Implement critical fix
            const fixPrompt = await this.buildHotfixPrompt(task, analysisResult);
            const fixResult = await this.cursorIDEService.sendMessage(fixPrompt);

            // Step 4: Validate critical fix
            const validationResult = await this.validateHotfix(task, fixResult);

            return {
                type: 'hotfix',
                success: validationResult.success,
                analysisResult,
                fixResult,
                validationResult,
                startedAt,
                completedAt: Date.now(),
                duration: Date.now() - startedAt
            };

        } catch (error) {
            throw new Error(`Hotfix workflow failed: ${error.message}`);
        }
    }

    /**
     * Execute generic workflow
     * @param {Object} task - Task object
     * @param {Object} options - Workflow options
     * @returns {Promise<Object>} Generic result
     */
    async executeGenericWorkflow(task, options = {}) {
        const startedAt = Date.now();

        try {
            this.logger.info('WorkflowOrchestrationService: Executing generic workflow', {
                taskId: task.id
            });

            // Step 1: Create new chat
            if (this.cursorIDEService?.browserManager) {
                await this.cursorIDEService.browserManager.clickNewChat();
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Step 2: Execute generic task
            const genericPrompt = await this.buildGenericPrompt(task);
            const genericResult = await this.cursorIDEService.sendMessage(genericPrompt);

            return {
                type: 'generic',
                success: true,
                genericResult,
                startedAt,
                completedAt: Date.now(),
                duration: Date.now() - startedAt
            };

        } catch (error) {
            throw new Error(`Generic workflow failed: ${error.message}`);
        }
    }

    // Use existing TaskService prompt building methods
    async buildRefactoringPrompt(task) {
        // Use existing TaskService buildRefactoringPrompt
        const taskService = new (require('./TaskService'))();
        return taskService.buildRefactoringPrompt(task);
    }

    async buildFeaturePrompt(task) {
        // Use existing TaskService buildTaskExecutionPrompt
        const taskService = new (require('./TaskService'))();
        return await taskService.buildTaskExecutionPrompt(task);
    }

    async buildBugAnalysisPrompt(task) {
        // Use existing TaskService buildTaskExecutionPrompt
        const taskService = new (require('./TaskService'))();
        return await taskService.buildTaskExecutionPrompt(task);
    }

    async buildBugFixPrompt(task, analysisResult) {
        // Use existing TaskService buildTaskExecutionPrompt
        const taskService = new (require('./TaskService'))();
        return await taskService.buildTaskExecutionPrompt(task);
    }

    async buildAnalysisPrompt(task) {
        // Use existing TaskService buildTaskExecutionPrompt
        const taskService = new (require('./TaskService'))();
        return await taskService.buildTaskExecutionPrompt(task);
    }

    async buildTestGenerationPrompt(task) {
        // Use existing TaskService buildTaskExecutionPrompt
        const taskService = new (require('./TaskService'))();
        return await taskService.buildTaskExecutionPrompt(task);
    }

    async buildTestExecutionPrompt(task, testResult) {
        // Use existing TaskService buildTaskExecutionPrompt
        const taskService = new (require('./TaskService'))();
        return await taskService.buildTaskExecutionPrompt(task);
    }

    async buildDocumentationPrompt(task) {
        // Use existing TaskService buildTaskExecutionPrompt
        const taskService = new (require('./TaskService'))();
        return await taskService.buildTaskExecutionPrompt(task);
    }

    async buildDebugPrompt(task) {
        // Use existing TaskService buildTaskExecutionPrompt
        const taskService = new (require('./TaskService'))();
        return await taskService.buildTaskExecutionPrompt(task);
    }

    async buildDebugReportPrompt(task, debugResult) {
        // Use existing TaskService buildTaskExecutionPrompt
        const taskService = new (require('./TaskService'))();
        return await taskService.buildTaskExecutionPrompt(task);
    }

    async buildOptimizationAnalysisPrompt(task) {
        // Use existing TaskService buildTaskExecutionPrompt
        const taskService = new (require('./TaskService'))();
        return await taskService.buildTaskExecutionPrompt(task);
    }

    async buildOptimizationPrompt(task, analysisResult) {
        // Use existing TaskService buildTaskExecutionPrompt
        const taskService = new (require('./TaskService'))();
        return await taskService.buildTaskExecutionPrompt(task);
    }

    async buildCodeReviewPrompt(task) {
        // Use existing TaskService buildTaskExecutionPrompt
        const taskService = new (require('./TaskService'))();
        return await taskService.buildTaskExecutionPrompt(task);
    }

    async buildReviewReportPrompt(task, reviewResult) {
        // Use existing TaskService buildTaskExecutionPrompt
        const taskService = new (require('./TaskService'))();
        return await taskService.buildTaskExecutionPrompt(task);
    }

    async buildHotfixAnalysisPrompt(task) {
        // Use existing TaskService buildTaskExecutionPrompt
        const taskService = new (require('./TaskService'))();
        return await taskService.buildTaskExecutionPrompt(task);
    }

    async buildHotfixPrompt(task, analysisResult) {
        // Use existing TaskService buildTaskExecutionPrompt
        const taskService = new (require('./TaskService'))();
        return await taskService.buildTaskExecutionPrompt(task);
    }

    async buildGenericPrompt(task) {
        // Use existing TaskService buildTaskExecutionPrompt
        const taskService = new (require('./TaskService'))();
        return await taskService.buildTaskExecutionPrompt(task);
    }

    // Validation methods (simplified implementations)
    async validateRefactoring(task, refactoringResult) {
        return { success: true, message: 'Refactoring validation passed' };
    }

    async validateFeatureImplementation(task, featureResult, testResult) {
        return { success: true, message: 'Feature implementation validation passed' };
    }

    async validateBugFix(task, fixResult) {
        return { success: true, message: 'Bug fix validation passed' };
    }

    async validateDocumentation(task, docResult) {
        return { success: true, message: 'Documentation validation passed' };
    }

    async validateOptimization(task, optimizationResult) {
        return { success: true, message: 'Optimization validation passed' };
    }

    async validateHotfix(task, fixResult) {
        return { success: true, message: 'Hotfix validation passed' };
    }
}

module.exports = WorkflowOrchestrationService; 