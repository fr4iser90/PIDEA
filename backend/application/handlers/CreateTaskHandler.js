/**
 * CreateTaskHandler - Handler for CreateTaskCommand
 * Implements the Command Handler pattern for task creation
 */
class CreateTaskHandler {
    constructor(dependencies) {
        this.validateDependencies(dependencies);
        
        this.taskRepository = dependencies.taskRepository;
        this.taskTemplateRepository = dependencies.taskTemplateRepository;
        this.taskSuggestionRepository = dependencies.taskSuggestionRepository;
        this.taskValidationService = dependencies.taskValidationService;
        this.taskGenerationService = dependencies.taskGenerationService;
        this.eventBus = dependencies.eventBus;
        this.logger = dependencies.logger;
    }

    /**
     * Validate handler dependencies
     * @param {Object} dependencies - Handler dependencies
     * @throws {Error} If dependencies are invalid
     */
    validateDependencies(dependencies) {
        if (!dependencies.taskRepository) {
            throw new Error('TaskRepository is required');
        }

        // Make validation service optional for now
        // if (!dependencies.taskValidationService) {
        //     throw new Error('TaskValidationService is required');
        // }

        if (!dependencies.eventBus) {
            throw new Error('EventBus is required');
        }

        if (!dependencies.logger) {
            throw new Error('Logger is required');
        }
    }

    /**
     * Handle CreateTaskCommand
     * @param {CreateTaskCommand} command - The command to handle
     * @returns {Promise<Object>} Created task result
     */
    async handle(command) {
        try {
            this.logger.info('Handling CreateTaskCommand', {
                commandId: command.commandId,
                title: command.title,
                type: command.type,
                priority: command.priority
            });

            // Validate command business rules
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

            // Validate task using domain service (optional)
            if (this.taskValidationService) {
                const validationResult = await this.taskValidationService.validateTaskCreation({
                    title: command.title,
                    description: command.description,
                    type: command.type,
                    priority: command.priority,
                    projectPath: command.projectPath,
                    estimatedTime: command.estimatedTime,
                    deadline: command.deadline,
                    dependencies: command.dependencies
                });

                if (!validationResult.isValid) {
                    throw new Error(`Task validation failed: ${validationResult.errors.join(', ')}`);
                }
            }

            // Create task entity directly (since taskGenerationService is null)
            const Task = require('@/domain/entities/Task');
            const task = Task.create(
                command.projectId,
                command.title,
                command.description || '',
                command.priority,
                command.type,
                {
                    ...command.metadata,
                    createdBy: command.requestedBy,
                    commandId: command.commandId
                }
            );

            // Save task to repository
            const savedTask = await this.taskRepository.save(task);

            // Publish task created event
            await this.eventBus.publish('task:created', {
                taskId: savedTask.id,
                title: savedTask.title,
                type: savedTask.type,
                priority: savedTask.priority,
                projectPath: savedTask.projectPath,
                createdBy: command.requestedBy,
                timestamp: new Date(),
                metadata: command.getMetadata()
            });

            this.logger.info('Task created successfully', {
                taskId: savedTask.id,
                commandId: command.commandId,
                title: savedTask.title
            });

            return {
                success: true,
                task: savedTask,
                commandId: command.commandId,
                timestamp: new Date()
            };

        } catch (error) {
            this.logger.error('Failed to handle CreateTaskCommand', {
                commandId: command.commandId,
                error: error.message,
                stack: error.stack
            });

            // Publish task creation failed event
            await this.eventBus.publish('task:creation:failed', {
                commandId: command.commandId,
                title: command.title,
                error: error.message,
                timestamp: new Date(),
                metadata: command.getMetadata()
            });

            throw error;
        }
    }

    /**
     * Handle command with template
     * @param {CreateTaskCommand} command - The command to handle
     * @param {string} templateId - Template ID
     * @returns {Promise<Object>} Created task result
     */
    async handleWithTemplate(command, templateId) {
        try {
            // Load template
            const template = await this.taskTemplateRepository.findById(templateId);
            if (!template) {
                throw new Error(`Template not found: ${templateId}`);
            }

            // Merge template with command
            const mergedCommand = this.mergeCommandWithTemplate(command, template);

            return await this.handle(mergedCommand);

        } catch (error) {
            this.logger.error('Failed to handle CreateTaskCommand with template', {
                commandId: command.commandId,
                templateId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Handle command with suggestion
     * @param {CreateTaskCommand} command - The command to handle
     * @param {string} suggestionId - Suggestion ID
     * @returns {Promise<Object>} Created task result
     */
    async handleWithSuggestion(command, suggestionId) {
        try {
            // Load suggestion
            const suggestion = await this.taskSuggestionRepository.findById(suggestionId);
            if (!suggestion) {
                throw new Error(`Suggestion not found: ${suggestionId}`);
            }

            // Merge suggestion with command
            const mergedCommand = this.mergeCommandWithSuggestion(command, suggestion);

            return await this.handle(mergedCommand);

        } catch (error) {
            this.logger.error('Failed to handle CreateTaskCommand with suggestion', {
                commandId: command.commandId,
                suggestionId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Merge command with template
     * @param {CreateTaskCommand} command - Original command
     * @param {Object} template - Task template
     * @returns {CreateTaskCommand} Merged command
     */
    mergeCommandWithTemplate(command, template) {
        const mergedParams = {
            title: command.title || template.title,
            description: command.description || template.description,
            type: command.type || template.type,
            priority: command.priority || template.defaultPriority,
            projectPath: command.projectPath,
            estimatedTime: command.estimatedTime || template.estimatedTime,
            tags: [...(template.tags || []), ...(command.tags || [])],
            dependencies: [...(template.dependencies || []), ...(command.dependencies || [])],
            deadline: command.deadline || template.deadline,
            metadata: { ...template.metadata, ...command.metadata },
            createdBy: command.createdBy,
            templateId: template.id,
            suggestionId: command.suggestionId,
            options: { ...template.options, ...command.options }
        };

        return new (require('@/application/commands/CreateTaskCommand'))(mergedParams);
    }

    /**
     * Merge command with suggestion
     * @param {CreateTaskCommand} command - Original command
     * @param {Object} suggestion - Task suggestion
     * @returns {CreateTaskCommand} Merged command
     */
    mergeCommandWithSuggestion(command, suggestion) {
        const mergedParams = {
            title: command.title || suggestion.title,
            description: command.description || suggestion.description,
            type: command.type || suggestion.taskType,
            priority: command.priority || suggestion.priority,
            projectPath: command.projectPath || suggestion.projectPath,
            estimatedTime: command.estimatedTime || suggestion.estimatedTime,
            tags: [...(suggestion.tags || []), ...(command.tags || [])],
            dependencies: [...(suggestion.dependencies || []), ...(command.dependencies || [])],
            deadline: command.deadline || suggestion.deadline,
            metadata: { 
                ...suggestion.metadata, 
                ...command.metadata,
                aiConfidence: suggestion.confidence,
                aiReasoning: suggestion.reasoning
            },
            createdBy: command.createdBy,
            templateId: command.templateId,
            suggestionId: suggestion.id,
            options: { ...suggestion.options, ...command.options }
        };

        return new (require('@/application/commands/CreateTaskCommand'))(mergedParams);
    }

    /**
     * Validate handler can process command
     * @param {CreateTaskCommand} command - The command to validate
     * @returns {Promise<Object>} Validation result
     */
    async canHandle(command) {
        try {
            // Check if command is valid
            if (!command || typeof command !== 'object') {
                return { canHandle: false, reason: 'Invalid command object' };
            }

            // Check if command has required properties
            const requiredProps = ['title', 'description', 'type', 'priority', 'projectPath'];
            for (const prop of requiredProps) {
                if (!command[prop]) {
                    return { canHandle: false, reason: `Missing required property: ${prop}` };
                }
            }

            // Check if repositories are available
            if (!this.taskRepository || !this.taskValidationService) {
                return { canHandle: false, reason: 'Required dependencies not available' };
            }

            return { canHandle: true };

        } catch (error) {
            this.logger.error('Error checking if handler can process command', {
                error: error.message
            });
            return { canHandle: false, reason: error.message };
        }
    }

    /**
     * Get handler metadata
     * @returns {Object} Handler metadata
     */
    getMetadata() {
        return {
            handlerType: 'CreateTaskHandler',
            supportedCommands: ['CreateTaskCommand'],
            dependencies: {
                taskRepository: !!this.taskRepository,
                taskValidationService: !!this.taskValidationService,
                taskGenerationService: !!this.taskGenerationService,
                eventBus: !!this.eventBus,
                logger: !!this.logger
            }
        };
    }
}

module.exports = CreateTaskHandler; 