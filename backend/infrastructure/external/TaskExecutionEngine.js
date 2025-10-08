/**
 * TaskExecutionEngine - Task execution orchestration engine (Refactored)
 */
const EventEmitter = require('events');

// Import constants
const EXECUTION_CONSTANTS = require('./task-execution/constants/ExecutionConstants');

// Import utilities
const ExecutionUtils = require('./task-execution/utils/ExecutionUtils');
const FileUtils = require('./task-execution/utils/FileUtils');

// Import validators
const TaskValidator = require('./task-execution/validators/TaskValidator');

// Import handlers
const TaskProcessor = require('./task-execution/handlers/TaskProcessor');

// Import services
const AnalysisService = require('./task-execution/services/AnalysisService');
const ScriptService = require('./task-execution/services/ScriptService');
const OptimizationService = require('./task-execution/services/OptimizationService');
const SecurityService = require('./task-execution/services/SecurityService');
const RefactoringService = require('./task-execution/services/RefactoringService');
const TestingService = require('./task-execution/services/TestingService');
const DeploymentService = require('./task-execution/services/DeploymentService');
const CustomTaskService = require('./task-execution/services/CustomTaskService');

// Import WorkflowExecutionService for workflow-based execution
const WorkflowExecutionService = require('@domain/services/WorkflowExecutionService');

class TaskExecutionEngine {
    constructor(dependencies = {}) {
        // Validate dependencies
        const validator = new TaskValidator(dependencies.logger);
        const dependencyValidation = validator.validateDependencies(dependencies);
        if (!dependencyValidation.isValid) {
            throw new Error(`Invalid dependencies: ${dependencyValidation.errors.join(', ')}`);
        }

        // Store dependencies
        this.aiService = dependencies.aiService;
        this.scriptExecutor = dependencies.scriptExecutor;
        this.fileSystemService = dependencies.fileSystemService;
        this.gitService = dependencies.gitService;
        this.dockerService = dependencies.dockerService;
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
        
        // Initialize WorkflowExecutionService for workflow-based execution
        this.workflowExecutionService = dependencies.workflowExecutionService;
        this.taskRepository = dependencies.taskRepository;
        this.workflowLoaderService = dependencies.workflowLoaderService;
        
        // Initialize execution state
        this.activeExecutions = new Map();
        this.executionQueue = [];
        this.maxConcurrentExecutions = EXECUTION_CONSTANTS.MAX_CONCURRENT_EXECUTIONS;

        // Initialize utilities
        this.executionUtils = new ExecutionUtils();
        this.fileUtils = new FileUtils();
        this.validator = validator;

        // Initialize services
        this.initializeServices();
    }

    /**
     * Initialize task execution services
     */
    initializeServices() {
        const serviceDependencies = {
            aiService: this.aiService,
            scriptExecutor: this.scriptExecutor,
            fileSystemService: this.fileSystemService,
            gitService: this.gitService,
            dockerService: this.dockerService,
            logger: this.logger
        };

        this.analysisService = new AnalysisService(serviceDependencies, this.logger);
        this.scriptService = new ScriptService(serviceDependencies, this.logger);
        this.optimizationService = new OptimizationService(serviceDependencies, this.logger);
        this.securityService = new SecurityService(serviceDependencies, this.logger);
        this.refactoringService = new RefactoringService(serviceDependencies, this.logger);
        this.testingService = new TestingService(serviceDependencies, this.logger);
        this.deploymentService = new DeploymentService(serviceDependencies, this.logger);
        this.customTaskService = new CustomTaskService(serviceDependencies, this.logger);
    }

    /**
     * Execute workflow for a task (NEW METHOD)
     * @param {string} taskId - Task ID
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Execution result
     */
    async executeWorkflow(taskId, options = {}) {
        try {
            this.logger.info('TaskExecutionEngine: Starting workflow execution', {
                taskId: taskId,
                taskMode: options.taskMode,
                userId: options.userId
            });

            // Load task from database (you'll need to inject taskRepository)
            const task = await this.loadTask(taskId);
            if (!task) {
                throw new Error(`Task ${taskId} not found`);
            }

            // Determine workflow based on options
            let workflowName = 'standard-task-workflow';
            if (options.taskMode === 'task-review') {
                workflowName = 'task-review-workflow';
            } else if (options.taskMode) {
                workflowName = options.taskMode;
            }

            // Load workflow definition
            const workflow = await this.loadWorkflow(workflowName);
            if (!workflow) {
                throw new Error(`Workflow ${workflowName} not found`);
            }

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

            // Execute workflow using WorkflowExecutionService
            if (!this.workflowExecutionService) {
                throw new Error('WorkflowExecutionService not available');
            }

            const result = await this.workflowExecutionService.executeWorkflow(workflow, context);

            this.logger.info('TaskExecutionEngine: Workflow execution completed', {
                taskId: taskId,
                workflowName: workflowName,
                success: result.success
            });

            return result;

        } catch (error) {
            this.logger.error('TaskExecutionEngine: Workflow execution failed', {
                taskId: taskId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Load task from database
     * @param {string} taskId - Task ID
     * @returns {Promise<Object>} Task object
     */
    async loadTask(taskId) {
        if (!this.taskRepository) {
            throw new Error('TaskRepository not available');
        }
        
        try {
            const task = await this.taskRepository.findById(taskId);
            if (!task) {
                throw new Error(`Task ${taskId} not found`);
            }
            return task;
        } catch (error) {
            this.logger.error('TaskExecutionEngine: Failed to load task', {
                taskId: taskId,
                error: error.message
            });
            throw error;
        }
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
        
        try {
            const workflow = this.workflowLoaderService.getWorkflow(workflowName);
            if (!workflow) {
                throw new Error(`Workflow ${workflowName} not found`);
            }
            return workflow;
        } catch (error) {
            this.logger.error('TaskExecutionEngine: Failed to load workflow', {
                workflowName: workflowName,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Execute task (LEGACY METHOD - calls executeWorkflow)
     * @param {Object} task - Task object
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Execution result
     */
    async executeTask(task, options = {}) {
        // Convert legacy call to new workflow-based execution
        return await this.executeWorkflow(task.id, options);
    }

    /**
     * Cancel task execution
     * @param {string} executionId - Execution ID
     * @returns {Promise<boolean>} Success status
     */
    async cancelExecution(executionId) {
        const execution = this.activeExecutions.get(executionId);
        if (!execution) {
            return false;
        }

        execution.status = EXECUTION_CONSTANTS.EXECUTION_STATUS.CANCELLED;
        execution.endTime = new Date();
        execution.duration = execution.endTime - execution.startTime;

        this.activeExecutions.set(executionId, execution);

        // Emit cancellation event
        if (this.eventBus) {
            this.eventBus.emit(EXECUTION_CONSTANTS.EVENTS.EXECUTION_CANCELLED, {
                taskId: execution.taskId,
                executionId: executionId,
                execution
            });
        }

        return true;
    }

    /**
     * Get execution status
     * @param {string} executionId - Execution ID
     * @returns {Object|null} Execution status
     */
    getExecutionStatus(executionId) {
        return this.activeExecutions.get(executionId) || null;
    }

    /**
     * Get all active executions
     * @returns {Array} Active executions
     */
    getActiveExecutions() {
        return Array.from(this.activeExecutions.values());
    }

    /**
     * Get execution queue
     * @returns {Array} Execution queue
     */
    getExecutionQueue() {
        return this.executionQueue;
    }

    /**
     * Add task to execution queue
     * @param {Object} task - Task object
     * @param {Object} options - Execution options
     * @returns {string} Queue item ID
     */
    addToQueue(task, options = {}) {
        const queueItem = {
            id: this.executionUtils.generateExecutionId(),
            task: task,
            options: options,
            addedAt: new Date(),
            priority: options.priority || 'normal'
        };

        this.executionQueue.push(queueItem);
        return queueItem.id;
    }

    /**
     * Process execution queue
     * @returns {Promise<void>}
     */
    async processQueue() {
        while (this.executionQueue.length > 0 && 
               this.activeExecutions.size < this.maxConcurrentExecutions) {
            
            const queuedTask = this.executionQueue.shift();
            
            try {
                await this.executeTask(queuedTask.task, queuedTask.options);
            } catch (error) {
                this.logger.error('TaskExecutionEngine: Failed to execute queued task', {
                    taskId: queuedTask.task.id,
                    error: error.message
                });
            }
        }
    }
}

module.exports = TaskExecutionEngine;