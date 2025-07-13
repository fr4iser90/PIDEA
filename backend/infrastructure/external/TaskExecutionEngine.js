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
const EventHandlers = require('./task-execution/handlers/EventHandlers');

// Import services
const AnalysisService = require('./task-execution/services/AnalysisService');
const ScriptService = require('./task-execution/services/ScriptService');
const OptimizationService = require('./task-execution/services/OptimizationService');
const SecurityService = require('./task-execution/services/SecurityService');
const RefactoringService = require('./task-execution/services/RefactoringService');
const TestingService = require('./task-execution/services/TestingService');
const DeploymentService = require('./task-execution/services/DeploymentService');
const CustomTaskService = require('./task-execution/services/CustomTaskService');

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
        
        // Initialize execution state
        this.activeExecutions = new Map();
        this.executionQueue = [];
        this.maxConcurrentExecutions = EXECUTION_CONSTANTS.MAX_CONCURRENT_EXECUTIONS;
        this.executionTimeout = EXECUTION_CONSTANTS.EXECUTION_TIMEOUT;
        
        // Initialize utilities
        this.executionUtils = new ExecutionUtils(this.logger);
        this.fileUtils = new FileUtils(this.logger);
        this.validator = validator;
        
        // Initialize services
        this.initializeServices();
        
        // Initialize event handlers
        this.eventHandlers = new EventHandlers(this, this.logger);
        this.eventHandlers.setupEventListeners();
        this.eventHandlers.startQueueProcessor();
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
            dockerService: this.dockerService
        };

        // Use DI system for service creation
        const { getServiceRegistry } = require('../di/ServiceRegistry');
const { logger } = require('@infrastructure/logging/Logger');
        const registry = getServiceRegistry();
        
        // Register serviceDependencies in DI container if not already present
        if (!registry.getContainer().factories.has('serviceDependencies')) {
            registry.getContainer().register('serviceDependencies', () => serviceDependencies, { singleton: true });
        }
        
        // Register services if not already registered
        const servicesToRegister = [
            { name: 'analysisService', class: AnalysisService },
            { name: 'scriptService', class: ScriptService },
            { name: 'optimizationService', class: OptimizationService },
            { name: 'securityService', class: SecurityService },
            { name: 'refactoringService', class: RefactoringService },
            { name: 'testingService', class: TestingService },
            { name: 'deploymentService', class: DeploymentService },
            { name: 'customTaskService', class: CustomTaskService }
        ];
        
        servicesToRegister.forEach(({ name, class: ServiceClass }) => {
            if (!registry.getContainer().factories.has(name)) {
                registry.getContainer().register(name, (serviceDependencies, logger) => {
                    return new ServiceClass(serviceDependencies, logger);
                }, { singleton: true, dependencies: ['serviceDependencies', 'logger'] });
            }
        });
        
        // Get services through DI
        this.analysisService = registry.getService('analysisService');
        this.scriptService = registry.getService('scriptService');
        this.optimizationService = registry.getService('optimizationService');
        this.securityService = registry.getService('securityService');
        this.refactoringService = registry.getService('refactoringService');
        this.testingService = registry.getService('testingService');
        this.deploymentService = registry.getService('deploymentService');
        this.customTaskService = registry.getService('customTaskService');
    }

    /**
     * Execute task
     * @param {Object} task - Task object
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Execution result
     */
    async executeTask(task, options = {}) {
        let execution = null;

        try {
            // Validate task
            const taskValidation = this.validator.validateTask(task);
            if (!taskValidation.isValid) {
                throw new Error(`Invalid task: ${taskValidation.errors.join(', ')}`);
            }

            this.logger.info('TaskExecutionEngine: Starting task execution', {
                taskId: task.id,
                taskType: task.type,
                userId: options.userId
            });

            // Create execution context
            execution = {
                id: this.executionUtils.generateExecutionId(),
                taskId: task.id,
                task: task,
                status: EXECUTION_CONSTANTS.EXECUTION_STATUS.PREPARING,
                startTime: new Date(),
                progress: 0,
                logs: [],
                metrics: {
                    cpu: 0,
                    memory: 0,
                    duration: 0
                },
                options: {
                    ...options,
                    dependencies: {
                        aiService: this.aiService,
                        scriptExecutor: this.scriptExecutor,
                        fileSystemService: this.fileSystemService,
                        gitService: this.gitService,
                        dockerService: this.dockerService
                    }
                }
            };

            // Add to active executions
            this.activeExecutions.set(execution.id, execution);

            // Emit start event
            if (this.eventBus) {
                this.eventBus.emit(EXECUTION_CONSTANTS.EVENTS.EXECUTION_START, {
                    taskId: task.id,
                    executionId: execution.id,
                    task,
                    execution
                });
            }

            // Execute based on task type
            const result = await this.executeTaskByType(execution);

            // Update execution
            execution.status = EXECUTION_CONSTANTS.EXECUTION_STATUS.COMPLETED;
            execution.endTime = new Date();
            execution.duration = execution.endTime - execution.startTime;
            execution.result = result;
            execution.progress = 100;

            this.activeExecutions.set(execution.id, execution);

            // Emit completion event
            if (this.eventBus) {
                this.eventBus.emit(EXECUTION_CONSTANTS.EVENTS.EXECUTION_COMPLETE, {
                    taskId: task.id,
                    executionId: execution.id,
                    task,
                    execution,
                    result
                });
            }

            this.logger.info('TaskExecutionEngine: Task execution completed', {
                taskId: task.id,
                executionId: execution.id,
                duration: execution.duration
            });

            return result;

        } catch (error) {
            this.logger.error('TaskExecutionEngine: Task execution failed', {
                taskId: task.id,
                error: error.message
            });

            // Update execution with error
            if (execution) {
                execution.status = EXECUTION_CONSTANTS.EXECUTION_STATUS.ERROR;
                execution.endTime = new Date();
                execution.duration = execution.endTime - execution.startTime;
                execution.error = error.message;

                this.activeExecutions.set(execution.id, execution);

                // Emit error event
                if (this.eventBus) {
                    this.eventBus.emit(EXECUTION_CONSTANTS.EVENTS.EXECUTION_ERROR, {
                        taskId: task.id,
                        executionId: execution.id,
                        task,
                        execution,
                        error: error.message
                    });
                }
            }

            throw error;
        }
    }

    /**
     * Execute task by type
     * @param {Object} execution - Execution object
     * @returns {Promise<Object>} Execution result
     */
    async executeTaskByType(execution) {
        const { task } = execution;

        switch (task.type) {
            case EXECUTION_CONSTANTS.TASK_TYPES.ANALYSIS:
                return await this.analysisService.executeAnalysisTask(execution);
            case EXECUTION_CONSTANTS.TASK_TYPES.SCRIPT:
                return await this.scriptService.executeScriptTask(execution);
            case EXECUTION_CONSTANTS.TASK_TYPES.OPTIMIZATION:
                return await this.optimizationService.executeOptimizationTask(execution);
            case EXECUTION_CONSTANTS.TASK_TYPES.SECURITY:
                return await this.securityService.executeSecurityTask(execution);
            case EXECUTION_CONSTANTS.TASK_TYPES.REFACTORING:
                return await this.refactoringService.executeRefactoringTask(execution);
            case EXECUTION_CONSTANTS.TASK_TYPES.TESTING:
                return await this.testingService.executeTestingTask(execution);
            case EXECUTION_CONSTANTS.TASK_TYPES.DEPLOYMENT:
                return await this.deploymentService.executeDeploymentTask(execution);
            case EXECUTION_CONSTANTS.TASK_TYPES.CUSTOM:
                return await this.customTaskService.executeCustomTask(execution);
            default:
                throw new Error(`Unknown task type: ${task.type}`);
        }
    }

    /**
     * Get execution statistics
     * @returns {Object} Execution statistics
     */
    getStats() {
        return {
            activeExecutions: this.activeExecutions.size,
            queuedExecutions: this.executionQueue.length,
            maxConcurrentExecutions: this.maxConcurrentExecutions,
            executionTimeout: this.executionTimeout,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Health check
     * @returns {Object} Health status
     */
    getHealthStatus() {
        return {
            status: 'healthy',
            activeExecutions: this.activeExecutions.size,
            queuedExecutions: this.executionQueue.length,
            maxConcurrentExecutions: this.maxConcurrentExecutions,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = TaskExecutionEngine; 