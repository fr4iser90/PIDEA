/**
 * AnalyzeLayerViolationsHandler - Handler for AnalyzeLayerViolationsCommand
 * Implements the Command Handler pattern for layer violation analysis
 */
class AnalyzeLayerViolationsHandler {
    constructor(dependencies) {
        this.validateDependencies(dependencies);
        
        this.taskRepository = dependencies.taskRepository;
        this.stepRegistry = dependencies.stepRegistry;
        this.eventBus = dependencies.eventBus;
        this.logger = dependencies.logger;
    }

    /**
     * Validate handler dependencies
     * @param {Object} dependencies - Handler dependencies
     */
    validateDependencies(dependencies) {
        const required = ['taskRepository', 'stepRegistry', 'eventBus', 'logger'];
        for (const dep of required) {
            if (!dependencies[dep]) {
                throw new Error(`Missing required dependency: ${dep}`);
            }
        }
    }

    /**
     * Handle AnalyzeLayerViolationsCommand
     * @param {AnalyzeLayerViolationsCommand} command - The command to handle
     * @returns {Promise<Object>} Analysis result
     */
    async handle(command) {
        try {
            this.logger.info('Handling AnalyzeLayerViolationsCommand', {
                commandId: command.commandId,
                projectId: command.projectId,
                projectPath: command.projectPath
            });

            // Validate command
            if (!command || typeof command !== 'object') {
                throw new Error('Invalid command object');
            }

            // Validate business rules
            const businessValidation = command.validateBusinessRules ? command.validateBusinessRules() : { isValid: true, errors: [], warnings: [] };
            if (!businessValidation.isValid) {
                throw new Error(`Business validation failed: ${businessValidation.errors.join(', ')}`);
            }

            if (businessValidation.warnings.length > 0) {
                this.logger.warn('Business validation warnings', {
                    commandId: command.commandId,
                    warnings: businessValidation.warnings
                });
            }

            // Create task for the analysis
            const task = await this.createAnalysisTask(command);
            
            // Execute layer violation analysis using step
            const analysisResult = await this.executeLayerViolationAnalysis(command, task);
            
            // Generate additional tasks from violations if requested
            let generatedTasks = [];
            if (command.options.generateTasks && analysisResult.success && analysisResult.data.tasks) {
                generatedTasks = await this.createTasksFromViolations(analysisResult.data.tasks, command);
            }

            // Publish analysis completed event
            await this.eventBus.publish('layer-violation:analysis:completed', {
                taskId: task.id,
                commandId: command.commandId,
                projectId: command.projectId,
                violations: analysisResult.success ? analysisResult.data.summary.totalViolations : 0,
                criticalViolations: analysisResult.success ? analysisResult.data.summary.criticalViolations : 0,
                generatedTasks: generatedTasks.length,
                timestamp: new Date(),
                metadata: command.getMetadata()
            });

            this.logger.info('Layer violation analysis completed successfully', {
                taskId: task.id,
                commandId: command.commandId,
                violations: analysisResult.success ? analysisResult.data.summary.totalViolations : 0,
                generatedTasks: generatedTasks.length
            });

            return {
                success: true,
                task: task,
                analysis: analysisResult,
                generatedTasks: generatedTasks,
                commandId: command.commandId,
                timestamp: new Date()
            };

        } catch (error) {
            this.logger.error('Failed to handle AnalyzeLayerViolationsCommand', {
                commandId: command.commandId,
                error: error.message,
                stack: error.stack
            });

            // Publish analysis failed event
            await this.eventBus.publish('layer-violation:analysis:failed', {
                commandId: command.commandId,
                projectId: command.projectId,
                error: error.message,
                timestamp: new Date(),
                metadata: command.getMetadata()
            });

            throw error;
        }
    }

    /**
     * Create analysis task
     * @param {AnalyzeLayerViolationsCommand} command - The command
     * @returns {Promise<Task>} Created task
     */
    async createAnalysisTask(command) {
        try {
            const Task = require('@entities/Task');
            const TaskPriority = require('@value-objects/TaskPriority');
            const TaskType = require('@value-objects/TaskType');

            const taskParams = command.toTaskParameters();
            
            const task = Task.create(
                command.projectId,
                taskParams.title,
                taskParams.description,
                taskParams.priority,
                taskParams.type,
                taskParams.category,
                {
                    ...taskParams.metadata,
                    createdBy: command.requestedBy,
                    commandId: command.commandId,
                    status: 'in_progress'
                }
            );

            // Save task to repository
            const savedTask = await this.taskRepository.save(task);
            
            this.logger.info('Created layer violation analysis task', {
                taskId: savedTask.id,
                commandId: command.commandId
            });

            return savedTask;

        } catch (error) {
            this.logger.error('Failed to create analysis task', {
                commandId: command.commandId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Execute layer violation analysis using step
     * @param {AnalyzeLayerViolationsCommand} command - The command
     * @param {Task} task - The analysis task
     * @returns {Promise<Object>} Analysis result
     */
    async executeLayerViolationAnalysis(command, task) {
        try {
            this.logger.info('Executing layer violation analysis step', {
                taskId: task.id,
                commandId: command.commandId
            });

            // Get the layer violation analysis step
            const step = this.stepRegistry.getStep('LayerViolationAnalysisStep');
            if (!step) {
                throw new Error('LayerViolationAnalysisStep not found in registry');
            }

            // Prepare context for step execution
            const context = {
                projectPath: command.projectPath,
                projectId: command.projectId,
                taskId: task.id,
                userId: command.requestedBy,
                ...command.options,
                // Add service resolution function
                getService: (serviceName) => {
                    // This will be resolved by the step system
                    return null;
                }
            };

            // Execute the step
            const result = await step.execute(context);

            if (!result.success) {
                throw new Error(`Step execution failed: ${result.error}`);
            }

            this.logger.info('Layer violation analysis step completed', {
                taskId: task.id,
                violations: result.data.summary.totalViolations,
                criticalViolations: result.data.summary.criticalViolations
            });

            return result;

        } catch (error) {
            this.logger.error('Failed to execute layer violation analysis step', {
                taskId: task.id,
                commandId: command.commandId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Create tasks from violations
     * @param {Array} violationTasks - Tasks generated from violations
     * @param {AnalyzeLayerViolationsCommand} command - The command
     * @returns {Promise<Array>} Created tasks
     */
    async createTasksFromViolations(violationTasks, command) {
        try {
            this.logger.info('Creating tasks from violations', {
                commandId: command.commandId,
                violationTaskCount: violationTasks.length
            });

            const createdTasks = [];
            const Task = require('@entities/Task');

            for (const violationTask of violationTasks) {
                try {
                    const task = Task.create(
                        command.projectId,
                        violationTask.title,
                        violationTask.description,
                        violationTask.priority,
                        violationTask.type,
                        violationTask.category,
                        {
                            ...violationTask.metadata,
                            createdBy: command.requestedBy,
                            commandId: command.commandId,
                            source: 'LayerViolationAnalysisStep',
                            parentTaskId: violationTask.parentTaskId
                        }
                    );

                    // Set additional properties
                    if (violationTask.estimatedHours) {
                        task.setEstimatedDuration(violationTask.estimatedHours * 3600); // Convert to seconds
                    }

                    if (violationTask.phase) {
                        task.setPhase(violationTask.phase);
                    }

                    if (violationTask.stage) {
                        task.setStage(violationTask.stage);
                    }

                    // Save task
                    const savedTask = await this.taskRepository.save(task);
                    createdTasks.push(savedTask);

                } catch (error) {
                    this.logger.error('Failed to create violation task', {
                        commandId: command.commandId,
                        violationTask: violationTask.title,
                        error: error.message
                    });
                    // Continue with other tasks
                }
            }

            this.logger.info('Created tasks from violations', {
                commandId: command.commandId,
                createdCount: createdTasks.length,
                totalCount: violationTasks.length
            });

            return createdTasks;

        } catch (error) {
            this.logger.error('Failed to create tasks from violations', {
                commandId: command.commandId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Validate handler can process command
     * @param {AnalyzeLayerViolationsCommand} command - The command to validate
     * @returns {Promise<Object>} Validation result
     */
    async canHandle(command) {
        try {
            // Check if command is valid
            if (!command || typeof command !== 'object') {
                return { canHandle: false, reason: 'Invalid command object' };
            }

            // Check if command has required properties
            const requiredProps = ['projectId', 'projectPath'];
            for (const prop of requiredProps) {
                if (!command[prop]) {
                    return { canHandle: false, reason: `Missing required property: ${prop}` };
                }
            }

            // Check if step registry is available
            if (!this.stepRegistry) {
                return { canHandle: false, reason: 'Step registry not available' };
            }

            // Check if required step exists
            const step = this.stepRegistry.getStep('LayerViolationAnalysisStep');
            if (!step) {
                return { canHandle: false, reason: 'LayerViolationAnalysisStep not found' };
            }

            return { canHandle: true };

        } catch (error) {
            this.logger.error('Error checking if handler can process command', {
                error: error.message
            });
            return { canHandle: false, reason: error.message };
        }
    }
}

module.exports = AnalyzeLayerViolationsHandler; 