/**
 * ExecuteTaskHandler - Handles task execution commands
 * Implements the Command Handler pattern for task execution
 */
class ExecuteTaskHandler {
    constructor(dependencies = {}) {
        this.validateDependencies(dependencies);
        
        this.taskRepository = dependencies.taskRepository;
        this.taskExecutionRepository = dependencies.taskExecutionRepository;
        this.taskExecutionService = dependencies.taskExecutionService;
        this.taskValidationService = dependencies.taskValidationService;
        this.taskMonitoringService = dependencies.taskMonitoringService;
        this.eventBus = dependencies.eventBus;
        this.logger = dependencies.logger;
        this.cursorIDEService = dependencies.cursorIDEService;
        this.scriptExecutor = dependencies.scriptExecutor;
        this.projectAnalyzer = dependencies.projectAnalyzer;
        
        this.handlerId = this.generateHandlerId();
    }

    /**
     * Validate handler dependencies
     * @param {Object} dependencies - Handler dependencies
     * @throws {Error} If dependencies are invalid
     */
    validateDependencies(dependencies) {
        const required = [
            'taskRepository',
            'taskExecutionRepository', 
            'taskExecutionService',
            'taskValidationService',
            'taskMonitoringService',
            'eventBus',
            'logger'
        ];

        for (const dep of required) {
            if (!dependencies[dep]) {
                throw new Error(`Missing required dependency: ${dep}`);
            }
        }
    }

    /**
     * Generate unique handler ID
     * @returns {string} Unique handler ID
     */
    generateHandlerId() {
        return `execute_handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Handle ExecuteTaskCommand
     * @param {ExecuteTaskCommand} command - Task execution command
     * @returns {Promise<Object>} Execution result
     */
    async handle(command) {
        try {
            this.logger.info('ExecuteTaskHandler: Starting task execution', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                taskId: command.taskId,
                requestedBy: command.requestedBy
            });

            // Validate command
            const validationResult = await this.validateCommand(command);
            if (!validationResult.isValid) {
                throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
            }

            // Get task
            const task = await this.getTask(command.taskId);
            if (!task) {
                throw new Error(`Task not found: ${command.taskId}`);
            }

            // Check task status
            if (!task.canExecute()) {
                throw new Error(`Task cannot be executed in current status: ${task.status.value}`);
            }

            // Validate task for execution
            const taskValidation = await this.taskValidationService.validateForExecution(task, command.options);
            if (!taskValidation.isValid) {
                throw new Error(`Task validation failed: ${taskValidation.errors.join(', ')}`);
            }

            // Create execution record
            const execution = await this.createExecutionRecord(task, command);

            // Publish execution started event
            await this.publishExecutionStartedEvent(execution, command);

            // Execute task
            const result = await this.executeTask(task, execution, command);

            // Update execution record
            await this.updateExecutionRecord(execution, result);

            // Publish execution completed event
            await this.publishExecutionCompletedEvent(execution, result, command);

            // Update task status
            await this.updateTaskStatus(task, result);

            // Log success
            this.logger.info('ExecuteTaskHandler: Task execution completed successfully', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                taskId: command.taskId,
                executionId: execution.id,
                duration: result.duration,
                status: result.status
            });

            return {
                success: true,
                executionId: execution.id,
                taskId: task.id,
                status: result.status,
                result: result.output,
                duration: result.duration,
                metadata: result.metadata,
                warnings: result.warnings,
                errors: result.errors
            };

        } catch (error) {
            await this.handleExecutionError(error, command);
            throw error;
        }
    }

    /**
     * Validate command
     * @param {ExecuteTaskCommand} command - Task execution command
     * @returns {Promise<Object>} Validation result
     */
    async validateCommand(command) {
        const errors = [];
        const warnings = [];

        // Validate command structure
        if (!command.taskId) {
            errors.push('Task ID is required');
        }

        if (!command.requestedBy) {
            errors.push('Requested by is required');
        }

        // Validate options
        if (command.options) {
            if (command.options.timeout && (typeof command.options.timeout !== 'number' || command.options.timeout < 1)) {
                errors.push('Timeout must be a positive number');
            }

            if (command.options.retries && (typeof command.options.retries !== 'number' || command.options.retries < 0)) {
                errors.push('Retries must be a non-negative number');
            }

            if (command.options.parallel && typeof command.options.parallel !== 'boolean') {
                errors.push('Parallel must be a boolean');
            }
        }

        // Check business rules
        const businessValidation = command.validateBusinessRules();
        if (!businessValidation.isValid) {
            errors.push(...businessValidation.errors);
        }
        warnings.push(...businessValidation.warnings);

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get task by ID
     * @param {string} taskId - Task ID
     * @returns {Promise<Task>} Task instance
     */
    async getTask(taskId) {
        try {
            const task = await this.taskRepository.findById(taskId);
            if (!task) {
                throw new Error(`Task not found: ${taskId}`);
            }
            return task;
        } catch (error) {
            this.logger.error('ExecuteTaskHandler: Failed to get task', {
                handlerId: this.handlerId,
                taskId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Create execution record
     * @param {Task} task - Task instance
     * @param {ExecuteTaskCommand} command - Task execution command
     * @returns {Promise<TaskExecution>} Execution record
     */
    async createExecutionRecord(task, command) {
        try {
            const execution = await this.taskExecutionRepository.create({
                taskId: task.id,
                status: 'running',
                startedAt: new Date(),
                requestedBy: command.requestedBy,
                options: command.options || {},
                metadata: {
                    commandId: command.commandId,
                    handlerId: this.handlerId,
                    originalTask: {
                        id: task.id,
                        title: task.title,
                        taskType: task.taskType.value,
                        priority: task.priority.value
                    }
                }
            });

            this.logger.info('ExecuteTaskHandler: Created execution record', {
                handlerId: this.handlerId,
                executionId: execution.id,
                taskId: task.id
            });

            return execution;
        } catch (error) {
            this.logger.error('ExecuteTaskHandler: Failed to create execution record', {
                handlerId: this.handlerId,
                taskId: task.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Execute task
     * @param {Task} task - Task instance
     * @param {TaskExecution} execution - Execution record
     * @param {ExecuteTaskCommand} command - Task execution command
     * @returns {Promise<Object>} Execution result
     */
    async executeTask(task, execution, command) {
        const startTime = Date.now();
        
        try {
            this.logger.info('ExecuteTaskHandler: Starting task execution', {
                handlerId: this.handlerId,
                executionId: execution.id,
                taskId: task.id,
                taskType: task.taskType.value
            });

            // Start monitoring
            await this.taskMonitoringService.startMonitoring(execution.id, task.id);

            // Execute based on task type
            let result;
            switch (task.taskType.value) {
                case 'analysis':
                    result = await this.executeAnalysisTask(task, execution, command);
                    break;
                case 'script':
                    result = await this.executeScriptTask(task, execution, command);
                    break;
                case 'refactor':
                    result = await this.executeRefactorTask(task, execution, command);
                    break;
                case 'test':
                    result = await this.executeTestTask(task, execution, command);
                    break;
                case 'deploy':
                    result = await this.executeDeployTask(task, execution, command);
                    break;
                case 'optimize':
                    result = await this.executeOptimizeTask(task, execution, command);
                    break;
                case 'security':
                    result = await this.executeSecurityTask(task, execution, command);
                    break;
                default:
                    result = await this.executeGenericTask(task, execution, command);
            }

            const duration = Date.now() - startTime;

            // Stop monitoring
            await this.taskMonitoringService.stopMonitoring(execution.id);

            return {
                status: 'completed',
                output: result.output,
                duration,
                metadata: {
                    ...result.metadata,
                    taskType: task.taskType.value,
                    executionMethod: result.executionMethod
                },
                warnings: result.warnings || [],
                errors: result.errors || []
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            
            // Stop monitoring
            await this.taskMonitoringService.stopMonitoring(execution.id);

            this.logger.error('ExecuteTaskHandler: Task execution failed', {
                handlerId: this.handlerId,
                executionId: execution.id,
                taskId: task.id,
                duration,
                error: error.message,
                stack: error.stack
            });

            return {
                status: 'failed',
                output: null,
                duration,
                metadata: {
                    taskType: task.taskType.value,
                    error: error.message,
                    errorType: error.constructor.name
                },
                warnings: [],
                errors: [error.message]
            };
        }
    }

    /**
     * Execute analysis task
     * @param {Task} task - Task instance
     * @param {TaskExecution} execution - Execution record
     * @param {ExecuteTaskCommand} command - Task execution command
     * @returns {Promise<Object>} Execution result
     */
    async executeAnalysisTask(task, execution, command) {
        try {
            const analysisResult = await this.projectAnalyzer.analyzeProject(task.projectPath, {
                analysisType: task.metadata.analysisType || 'comprehensive',
                includeMetrics: true,
                includeRecommendations: true,
                timeout: command.options?.timeout || 300000 // 5 minutes
            });

            return {
                output: analysisResult,
                metadata: {
                    analysisType: analysisResult.type,
                    metricsCount: analysisResult.metrics?.length || 0,
                    recommendationsCount: analysisResult.recommendations?.length || 0
                },
                executionMethod: 'project_analyzer'
            };
        } catch (error) {
            throw new Error(`Analysis task execution failed: ${error.message}`);
        }
    }

    /**
     * Execute script task
     * @param {Task} task - Task instance
     * @param {TaskExecution} execution - Execution record
     * @param {ExecuteTaskCommand} command - Task execution command
     * @returns {Promise<Object>} Execution result
     */
    async executeScriptTask(task, execution, command) {
        try {
            const scriptResult = await this.scriptExecutor.executeScript(task.metadata.scriptContent, {
                workingDirectory: task.projectPath,
                timeout: command.options?.timeout || 600000, // 10 minutes
                environment: task.metadata.environment || {},
                captureOutput: true
            });

            return {
                output: scriptResult,
                metadata: {
                    exitCode: scriptResult.exitCode,
                    outputLength: scriptResult.stdout?.length || 0,
                    errorLength: scriptResult.stderr?.length || 0
                },
                executionMethod: 'script_executor'
            };
        } catch (error) {
            throw new Error(`Script task execution failed: ${error.message}`);
        }
    }

    /**
     * Execute refactor task
     * @param {Task} task - Task instance
     * @param {TaskExecution} execution - Execution record
     * @param {ExecuteTaskCommand} command - Task execution command
     * @returns {Promise<Object>} Execution result
     */
    async executeRefactorTask(task, execution, command) {
        try {
            // Use Cursor IDE service for AI-powered refactoring
            const refactorResult = await this.cursorIDEService.executeRefactoring({
                projectPath: task.projectPath,
                targetFiles: task.metadata.targetFiles || [],
                refactoringType: task.metadata.refactoringType || 'general',
                options: command.options || {}
            });

            return {
                output: refactorResult,
                metadata: {
                    filesModified: refactorResult.filesModified?.length || 0,
                    refactoringType: refactorResult.type,
                    changesCount: refactorResult.changes?.length || 0
                },
                executionMethod: 'cursor_ide_refactor'
            };
        } catch (error) {
            throw new Error(`Refactor task execution failed: ${error.message}`);
        }
    }

    /**
     * Execute test task
     * @param {Task} task - Task instance
     * @param {TaskExecution} execution - Execution record
     * @param {ExecuteTaskCommand} command - Task execution command
     * @returns {Promise<Object>} Execution result
     */
    async executeTestTask(task, execution, command) {
        try {
            const testResult = await this.scriptExecutor.executeScript('npm test', {
                workingDirectory: task.projectPath,
                timeout: command.options?.timeout || 300000, // 5 minutes
                captureOutput: true
            });

            return {
                output: testResult,
                metadata: {
                    exitCode: testResult.exitCode,
                    testsPassed: testResult.exitCode === 0,
                    outputLength: testResult.stdout?.length || 0
                },
                executionMethod: 'test_runner'
            };
        } catch (error) {
            throw new Error(`Test task execution failed: ${error.message}`);
        }
    }

    /**
     * Execute deploy task
     * @param {Task} task - Task instance
     * @param {TaskExecution} execution - Execution record
     * @param {ExecuteTaskCommand} command - Task execution command
     * @returns {Promise<Object>} Execution result
     */
    async executeDeployTask(task, execution, command) {
        try {
            const deployResult = await this.scriptExecutor.executeScript(task.metadata.deployScript, {
                workingDirectory: task.projectPath,
                timeout: command.options?.timeout || 900000, // 15 minutes
                environment: {
                    ...task.metadata.environment,
                    NODE_ENV: 'production'
                },
                captureOutput: true
            });

            return {
                output: deployResult,
                metadata: {
                    exitCode: deployResult.exitCode,
                    deploymentSuccessful: deployResult.exitCode === 0,
                    environment: task.metadata.environment?.name || 'production'
                },
                executionMethod: 'deployment_script'
            };
        } catch (error) {
            throw new Error(`Deploy task execution failed: ${error.message}`);
        }
    }

    /**
     * Execute optimize task
     * @param {Task} task - Task instance
     * @param {TaskExecution} execution - Execution record
     * @param {ExecuteTaskCommand} command - Task execution command
     * @returns {Promise<Object>} Execution result
     */
    async executeOptimizeTask(task, execution, command) {
        try {
            // Use Cursor IDE service for AI-powered optimization
            const optimizeResult = await this.cursorIDEService.executeOptimization({
                projectPath: task.projectPath,
                optimizationType: task.metadata.optimizationType || 'performance',
                targetFiles: task.metadata.targetFiles || [],
                options: command.options || {}
            });

            return {
                output: optimizeResult,
                metadata: {
                    optimizationType: optimizeResult.type,
                    filesOptimized: optimizeResult.filesOptimized?.length || 0,
                    improvementsCount: optimizeResult.improvements?.length || 0
                },
                executionMethod: 'cursor_ide_optimize'
            };
        } catch (error) {
            throw new Error(`Optimize task execution failed: ${error.message}`);
        }
    }

    /**
     * Execute security task
     * @param {Task} task - Task instance
     * @param {TaskExecution} execution - Execution record
     * @param {ExecuteTaskCommand} command - Task execution command
     * @returns {Promise<Object>} Execution result
     */
    async executeSecurityTask(task, execution, command) {
        try {
            // Use Cursor IDE service for AI-powered security analysis
            const securityResult = await this.cursorIDEService.executeSecurityScan({
                projectPath: task.projectPath,
                scanType: task.metadata.scanType || 'comprehensive',
                targetFiles: task.metadata.targetFiles || [],
                options: command.options || {}
            });

            return {
                output: securityResult,
                metadata: {
                    scanType: securityResult.type,
                    vulnerabilitiesFound: securityResult.vulnerabilities?.length || 0,
                    securityScore: securityResult.securityScore,
                    recommendationsCount: securityResult.recommendations?.length || 0
                },
                executionMethod: 'cursor_ide_security'
            };
        } catch (error) {
            throw new Error(`Security task execution failed: ${error.message}`);
        }
    }

    /**
     * Execute generic task
     * @param {Task} task - Task instance
     * @param {TaskExecution} execution - Execution record
     * @param {ExecuteTaskCommand} command - Task execution command
     * @returns {Promise<Object>} Execution result
     */
    async executeGenericTask(task, execution, command) {
        try {
            const result = await this.taskExecutionService.executeTask(task, {
                executionId: execution.id,
                options: command.options || {},
                metadata: command.metadata || {}
            });

            return {
                output: result.output,
                metadata: result.metadata,
                warnings: result.warnings || [],
                errors: result.errors || [],
                executionMethod: 'generic_executor'
            };
        } catch (error) {
            throw new Error(`Generic task execution failed: ${error.message}`);
        }
    }

    /**
     * Update execution record
     * @param {TaskExecution} execution - Execution record
     * @param {Object} result - Execution result
     * @returns {Promise<void>}
     */
    async updateExecutionRecord(execution, result) {
        try {
            await this.taskExecutionRepository.update(execution.id, {
                status: result.status,
                completedAt: new Date(),
                duration: result.duration,
                output: result.output,
                metadata: {
                    ...execution.metadata,
                    result: result.metadata,
                    warnings: result.warnings,
                    errors: result.errors
                }
            });

            this.logger.info('ExecuteTaskHandler: Updated execution record', {
                handlerId: this.handlerId,
                executionId: execution.id,
                status: result.status,
                duration: result.duration
            });
        } catch (error) {
            this.logger.error('ExecuteTaskHandler: Failed to update execution record', {
                handlerId: this.handlerId,
                executionId: execution.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Update task status
     * @param {Task} task - Task instance
     * @param {Object} result - Execution result
     * @returns {Promise<void>}
     */
    async updateTaskStatus(task, result) {
        try {
            if (result.status === 'completed') {
                task.markAsCompleted();
            } else if (result.status === 'failed') {
                task.markAsFailed();
            }

            await this.taskRepository.update(task.id, {
                status: task.status.value,
                lastExecutedAt: new Date(),
                executionCount: task.executionCount + 1
            });

            this.logger.info('ExecuteTaskHandler: Updated task status', {
                handlerId: this.handlerId,
                taskId: task.id,
                newStatus: task.status.value,
                executionCount: task.executionCount
            });
        } catch (error) {
            this.logger.error('ExecuteTaskHandler: Failed to update task status', {
                handlerId: this.handlerId,
                taskId: task.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Publish execution started event
     * @param {TaskExecution} execution - Execution record
     * @param {ExecuteTaskCommand} command - Task execution command
     * @returns {Promise<void>}
     */
    async publishExecutionStartedEvent(execution, command) {
        try {
            await this.eventBus.publish('task.execution.started', {
                executionId: execution.id,
                taskId: execution.taskId,
                startedAt: execution.startedAt,
                requestedBy: command.requestedBy,
                commandId: command.commandId,
                metadata: execution.metadata
            });
        } catch (error) {
            this.logger.warn('ExecuteTaskHandler: Failed to publish execution started event', {
                handlerId: this.handlerId,
                executionId: execution.id,
                error: error.message
            });
        }
    }

    /**
     * Publish execution completed event
     * @param {TaskExecution} execution - Execution record
     * @param {Object} result - Execution result
     * @param {ExecuteTaskCommand} command - Task execution command
     * @returns {Promise<void>}
     */
    async publishExecutionCompletedEvent(execution, result, command) {
        try {
            await this.eventBus.publish('task.execution.completed', {
                executionId: execution.id,
                taskId: execution.taskId,
                status: result.status,
                completedAt: new Date(),
                duration: result.duration,
                requestedBy: command.requestedBy,
                commandId: command.commandId,
                metadata: result.metadata,
                warnings: result.warnings,
                errors: result.errors
            });
        } catch (error) {
            this.logger.warn('ExecuteTaskHandler: Failed to publish execution completed event', {
                handlerId: this.handlerId,
                executionId: execution.id,
                error: error.message
            });
        }
    }

    /**
     * Handle execution error
     * @param {Error} error - Execution error
     * @param {ExecuteTaskCommand} command - Task execution command
     * @returns {Promise<void>}
     */
    async handleExecutionError(error, command) {
        this.logger.error('ExecuteTaskHandler: Task execution failed', {
            handlerId: this.handlerId,
            commandId: command.commandId,
            taskId: command.taskId,
            error: error.message,
            stack: error.stack
        });

        try {
            await this.eventBus.publish('task.execution.failed', {
                taskId: command.taskId,
                commandId: command.commandId,
                error: error.message,
                errorType: error.constructor.name,
                timestamp: new Date(),
                requestedBy: command.requestedBy
            });
        } catch (eventError) {
            this.logger.warn('ExecuteTaskHandler: Failed to publish execution failed event', {
                handlerId: this.handlerId,
                error: eventError.message
            });
        }
    }

    /**
     * Get handler metadata
     * @returns {Object} Handler metadata
     */
    getMetadata() {
        return {
            handlerId: this.handlerId,
            type: 'ExecuteTaskHandler',
            supportedCommands: ['ExecuteTaskCommand'],
            dependencies: [
                'taskRepository',
                'taskExecutionRepository',
                'taskExecutionService',
                'taskValidationService',
                'taskMonitoringService',
                'eventBus',
                'logger'
            ]
        };
    }
}

module.exports = ExecuteTaskHandler; 