/**
 * GenerateTaskSuggestionsHandler - Handles AI-powered task suggestion generation
 * Implements the Command Handler pattern for task suggestion generation
 */
class GenerateTaskSuggestionsHandler {
    constructor(dependencies = {}) {
        this.validateDependencies(dependencies);
        
        this.taskSuggestionService = dependencies.taskSuggestionService;
        this.taskAnalysisService = dependencies.taskAnalysisService;
        this.cursorIDEService = dependencies.cursorIDEService;
        this.taskSuggestionRepository = dependencies.taskSuggestionRepository;
        this.taskRepository = dependencies.taskRepository;
        this.taskTemplateRepository = dependencies.taskTemplateRepository;
        this.eventBus = dependencies.eventBus;
        this.logger = dependencies.logger;
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
            'taskSuggestionService',
            'taskAnalysisService',
            'cursorIDEService',
            'taskSuggestionRepository',
            'taskRepository',
            'taskTemplateRepository',
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
        return `suggestions_handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Handle GenerateTaskSuggestionsCommand
     * @param {GenerateTaskSuggestionsCommand} command - Task suggestions command
     * @returns {Promise<Object>} Suggestions result
     */
    async handle(command) {
        try {
            this.logger.info('GenerateTaskSuggestionsHandler: Starting task suggestion generation', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
                context: command.context,
                requestedBy: command.requestedBy
            });

            // Validate command
            const validationResult = await this.validateCommand(command);
            if (!validationResult.isValid) {
                throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
            }

            // Analyze project context
            const projectContext = await this.analyzeProjectContext(command);

            // Generate AI suggestions
            const suggestions = await this.generateSuggestions(command, projectContext);

            // Save suggestions
            const savedSuggestions = await this.saveSuggestions(suggestions, command);

            // Publish suggestions generated event
            await this.publishSuggestionsGeneratedEvent(savedSuggestions, command);

            // Log success
            this.logger.info('GenerateTaskSuggestionsHandler: Task suggestions generated successfully', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
                suggestionsCount: savedSuggestions.length
            });

            return {
                success: true,
                suggestions: savedSuggestions,
                count: savedSuggestions.length,
                projectPath: command.projectPath,
                context: command.context,
                metadata: {
                    generationMethod: 'ai_powered',
                    confidenceThreshold: command.confidenceThreshold,
                    maxSuggestions: command.maxSuggestions
                }
            };

        } catch (error) {
            await this.handleSuggestionError(error, command);
            throw error;
        }
    }

    /**
     * Validate command
     * @param {GenerateTaskSuggestionsCommand} command - Task suggestions command
     * @returns {Promise<Object>} Validation result
     */
    async validateCommand(command) {
        const errors = [];
        const warnings = [];

        // Validate command structure
        if (!command.projectPath) {
            errors.push('Project path is required');
        }

        if (!command.requestedBy) {
            errors.push('Requested by is required');
        }

        // Validate context
        if (command.context && typeof command.context !== 'string') {
            errors.push('Context must be a string');
        }

        if (command.context && command.context.length > 1000) {
            errors.push('Context must be less than 1000 characters');
        }

        // Validate options
        if (command.maxSuggestions && (typeof command.maxSuggestions !== 'number' || command.maxSuggestions < 1 || command.maxSuggestions > 50)) {
            errors.push('Max suggestions must be between 1 and 50');
        }

        if (command.confidenceThreshold && (typeof command.confidenceThreshold !== 'number' || command.confidenceThreshold < 0 || command.confidenceThreshold > 1)) {
            errors.push('Confidence threshold must be between 0 and 1');
        }

        if (command.taskTypes && (!Array.isArray(command.taskTypes) || command.taskTypes.length === 0)) {
            errors.push('Task types must be a non-empty array');
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
     * Analyze project context
     * @param {GenerateTaskSuggestionsCommand} command - Task suggestions command
     * @returns {Promise<Object>} Project context
     */
    async analyzeProjectContext(command) {
        try {
            this.logger.info('GenerateTaskSuggestionsHandler: Analyzing project context', {
                handlerId: this.handlerId,
                projectPath: command.projectPath
            });

            // Get project structure
            const projectStructure = await this.projectAnalyzer.getProjectStructure(command.projectPath);

            // Get existing tasks
            const existingTasks = await this.taskRepository.findByProject(command.projectPath, {
                limit: 100,
                includeCompleted: false
            });

            // Get project metrics
            const projectMetrics = await this.projectAnalyzer.getProjectMetrics(command.projectPath);

            // Get recent activity
            const recentActivity = await this.getRecentActivity(command.projectPath);

            return {
                projectStructure,
                existingTasks: existingTasks.map(task => ({
                    id: task.id,
                    title: task.title,
                    taskType: task.taskType.value,
                    priority: task.priority.value,
                    status: task.status.value,
                    createdAt: task.createdAt
                })),
                projectMetrics,
                recentActivity,
                context: command.context,
                options: command.options || {}
            };

        } catch (error) {
            this.logger.error('GenerateTaskSuggestionsHandler: Failed to analyze project context', {
                handlerId: this.handlerId,
                projectPath: command.projectPath,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get recent activity
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Recent activity
     */
    async getRecentActivity(projectPath) {
        try {
            // Get recent task executions
            const recentExecutions = await this.taskRepository.getRecentExecutions(projectPath, {
                limit: 20,
                hours: 24
            });

            // Get recent suggestions
            const recentSuggestions = await this.taskSuggestionRepository.findByProject(projectPath, {
                limit: 10,
                hours: 24
            });

            return {
                recentExecutions,
                recentSuggestions,
                timestamp: new Date()
            };
        } catch (error) {
            this.logger.warn('GenerateTaskSuggestionsHandler: Failed to get recent activity', {
                handlerId: this.handlerId,
                projectPath,
                error: error.message
            });

            return {
                recentExecutions: [],
                recentSuggestions: [],
                timestamp: new Date()
            };
        }
    }

    /**
     * Generate suggestions
     * @param {GenerateTaskSuggestionsCommand} command - Task suggestions command
     * @param {Object} projectContext - Project context
     * @returns {Promise<Array>} Generated suggestions
     */
    async generateSuggestions(command, projectContext) {
        try {
            this.logger.info('GenerateTaskSuggestionsHandler: Generating AI suggestions', {
                handlerId: this.handlerId,
                projectPath: command.projectPath,
                maxSuggestions: command.maxSuggestions
            });

            // Use Cursor IDE service for AI-powered suggestions
            const aiSuggestions = await this.cursorIDEService.generateTaskSuggestions({
                projectPath: command.projectPath,
                context: command.context,
                projectContext,
                maxSuggestions: command.maxSuggestions || 10,
                taskTypes: command.taskTypes,
                confidenceThreshold: command.confidenceThreshold || 0.7,
                options: command.options || {}
            });

            // Process and validate suggestions
            const processedSuggestions = await this.processSuggestions(aiSuggestions, projectContext, command);

            // Filter by confidence threshold
            const filteredSuggestions = processedSuggestions.filter(suggestion => 
                suggestion.confidence >= (command.confidenceThreshold || 0.7)
            );

            // Sort by confidence and priority
            const sortedSuggestions = filteredSuggestions.sort((a, b) => {
                if (a.confidence !== b.confidence) {
                    return b.confidence - a.confidence;
                }
                return b.priority - a.priority;
            });

            // Limit to max suggestions
            const limitedSuggestions = sortedSuggestions.slice(0, command.maxSuggestions || 10);

            this.logger.info('GenerateTaskSuggestionsHandler: Generated suggestions', {
                handlerId: this.handlerId,
                projectPath: command.projectPath,
                totalGenerated: aiSuggestions.length,
                processed: processedSuggestions.length,
                filtered: filteredSuggestions.length,
                final: limitedSuggestions.length
            });

            return limitedSuggestions;

        } catch (error) {
            this.logger.error('GenerateTaskSuggestionsHandler: Failed to generate suggestions', {
                handlerId: this.handlerId,
                projectPath: command.projectPath,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Process suggestions
     * @param {Array} aiSuggestions - AI-generated suggestions
     * @param {Object} projectContext - Project context
     * @param {GenerateTaskSuggestionsCommand} command - Task suggestions command
     * @returns {Promise<Array>} Processed suggestions
     */
    async processSuggestions(aiSuggestions, projectContext, command) {
        const processedSuggestions = [];

        for (const aiSuggestion of aiSuggestions) {
            try {
                // Validate suggestion structure
                const validation = this.validateSuggestion(aiSuggestion);
                if (!validation.isValid) {
                    this.logger.warn('GenerateTaskSuggestionsHandler: Invalid suggestion skipped', {
                        handlerId: this.handlerId,
                        suggestion: aiSuggestion.title,
                        errors: validation.errors
                    });
                    continue;
                }

                // Check for duplicates
                const isDuplicate = await this.checkDuplicateSuggestion(aiSuggestion, projectContext);
                if (isDuplicate) {
                    this.logger.debug('GenerateTaskSuggestionsHandler: Duplicate suggestion skipped', {
                        handlerId: this.handlerId,
                        suggestion: aiSuggestion.title
                    });
                    continue;
                }

                // Enhance suggestion with additional context
                const enhancedSuggestion = await this.enhanceSuggestion(aiSuggestion, projectContext, command);

                // Calculate priority based on context
                const priority = this.calculatePriority(enhancedSuggestion, projectContext);

                // Create suggestion object
                const suggestion = {
                    title: enhancedSuggestion.title,
                    description: enhancedSuggestion.description,
                    taskType: enhancedSuggestion.taskType,
                    priority: priority,
                    confidence: enhancedSuggestion.confidence,
                    reasoning: enhancedSuggestion.reasoning,
                    estimatedTime: enhancedSuggestion.estimatedTime,
                    projectPath: command.projectPath,
                    context: command.context,
                    metadata: {
                        ...enhancedSuggestion.metadata,
                        generatedBy: 'ai',
                        generationMethod: 'cursor_ide',
                        projectContext: {
                            existingTasksCount: projectContext.existingTasks.length,
                            projectMetrics: projectContext.projectMetrics,
                            recentActivity: projectContext.recentActivity
                        }
                    },
                    requestedBy: command.requestedBy,
                    status: 'pending'
                };

                processedSuggestions.push(suggestion);

            } catch (error) {
                this.logger.warn('GenerateTaskSuggestionsHandler: Failed to process suggestion', {
                    handlerId: this.handlerId,
                    suggestion: aiSuggestion.title,
                    error: error.message
                });
            }
        }

        return processedSuggestions;
    }

    /**
     * Validate suggestion
     * @param {Object} suggestion - AI suggestion
     * @returns {Object} Validation result
     */
    validateSuggestion(suggestion) {
        const errors = [];

        if (!suggestion.title || typeof suggestion.title !== 'string') {
            errors.push('Title is required and must be a string');
        }

        if (!suggestion.description || typeof suggestion.description !== 'string') {
            errors.push('Description is required and must be a string');
        }

        if (!suggestion.taskType || typeof suggestion.taskType !== 'string') {
            errors.push('Task type is required and must be a string');
        }

        if (suggestion.confidence && (typeof suggestion.confidence !== 'number' || suggestion.confidence < 0 || suggestion.confidence > 1)) {
            errors.push('Confidence must be between 0 and 1');
        }

        if (suggestion.estimatedTime && (typeof suggestion.estimatedTime !== 'number' || suggestion.estimatedTime < 1)) {
            errors.push('Estimated time must be a positive number');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Check for duplicate suggestion
     * @param {Object} suggestion - AI suggestion
     * @param {Object} projectContext - Project context
     * @returns {Promise<boolean>} True if duplicate
     */
    async checkDuplicateSuggestion(suggestion, projectContext) {
        try {
            // Check existing tasks
            const existingTask = projectContext.existingTasks.find(task => 
                task.title.toLowerCase().includes(suggestion.title.toLowerCase()) ||
                suggestion.title.toLowerCase().includes(task.title.toLowerCase())
            );

            if (existingTask) {
                return true;
            }

            // Check recent suggestions
            const recentSuggestions = projectContext.recentActivity.recentSuggestions;
            const duplicateSuggestion = recentSuggestions.find(s => 
                s.title.toLowerCase().includes(suggestion.title.toLowerCase()) ||
                suggestion.title.toLowerCase().includes(s.title.toLowerCase())
            );

            return !!duplicateSuggestion;

        } catch (error) {
            this.logger.warn('GenerateTaskSuggestionsHandler: Failed to check duplicate suggestion', {
                handlerId: this.handlerId,
                suggestion: suggestion.title,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Enhance suggestion
     * @param {Object} aiSuggestion - AI suggestion
     * @param {Object} projectContext - Project context
     * @param {GenerateTaskSuggestionsCommand} command - Task suggestions command
     * @returns {Promise<Object>} Enhanced suggestion
     */
    async enhanceSuggestion(aiSuggestion, projectContext, command) {
        try {
            // Get relevant templates
            const templates = await this.taskTemplateRepository.findByType(aiSuggestion.taskType, {
                limit: 5
            });

            // Enhance with template information
            const enhancedSuggestion = {
                ...aiSuggestion,
                metadata: {
                    ...aiSuggestion.metadata,
                    templates: templates.map(t => ({
                        id: t.id,
                        name: t.name,
                        relevance: t.relevance || 0.5
                    })),
                    projectMetrics: projectContext.projectMetrics,
                    context: command.context
                }
            };

            // Add reasoning if not present
            if (!enhancedSuggestion.reasoning) {
                enhancedSuggestion.reasoning = this.generateReasoning(enhancedSuggestion, projectContext);
            }

            // Estimate time if not present
            if (!enhancedSuggestion.estimatedTime) {
                enhancedSuggestion.estimatedTime = this.estimateTime(enhancedSuggestion, projectContext);
            }

            return enhancedSuggestion;

        } catch (error) {
            this.logger.warn('GenerateTaskSuggestionsHandler: Failed to enhance suggestion', {
                handlerId: this.handlerId,
                suggestion: aiSuggestion.title,
                error: error.message
            });

            return aiSuggestion;
        }
    }

    /**
     * Generate reasoning for suggestion
     * @param {Object} suggestion - Suggestion
     * @param {Object} projectContext - Project context
     * @returns {string} Reasoning
     */
    generateReasoning(suggestion, projectContext) {
        const reasons = [];

        // Add context-based reasoning
        if (projectContext.context) {
            reasons.push(`Based on the provided context: "${projectContext.context}"`);
        }

        // Add project metrics reasoning
        if (projectContext.projectMetrics) {
            const metrics = projectContext.projectMetrics;
            if (metrics.complexity && metrics.complexity > 0.7) {
                reasons.push('High project complexity detected');
            }
            if (metrics.technicalDebt && metrics.technicalDebt > 0.5) {
                reasons.push('Technical debt identified');
            }
        }

        // Add task type reasoning
        switch (suggestion.taskType) {
            case 'refactor':
                reasons.push('Code quality improvement needed');
                break;
            case 'test':
                reasons.push('Test coverage enhancement');
                break;
            case 'optimize':
                reasons.push('Performance optimization opportunity');
                break;
            case 'security':
                reasons.push('Security improvement needed');
                break;
        }

        return reasons.length > 0 ? reasons.join('. ') : 'AI-generated suggestion based on project analysis';
    }

    /**
     * Estimate time for suggestion
     * @param {Object} suggestion - Suggestion
     * @param {Object} projectContext - Project context
     * @returns {number} Estimated time in minutes
     */
    estimateTime(suggestion, projectContext) {
        const baseTimes = {
            refactor: 30,
            test: 20,
            optimize: 45,
            security: 60,
            analysis: 15,
            deploy: 25,
            build: 10
        };

        let baseTime = baseTimes[suggestion.taskType] || 30;

        // Adjust based on project complexity
        if (projectContext.projectMetrics?.complexity) {
            const complexity = projectContext.projectMetrics.complexity;
            if (complexity > 0.8) {
                baseTime *= 1.5;
            } else if (complexity < 0.3) {
                baseTime *= 0.7;
            }
        }

        // Adjust based on project size
        if (projectContext.projectMetrics?.size) {
            const size = projectContext.projectMetrics.size;
            if (size > 10000) {
                baseTime *= 1.3;
            } else if (size < 1000) {
                baseTime *= 0.8;
            }
        }

        return Math.round(baseTime);
    }

    /**
     * Calculate priority for suggestion
     * @param {Object} suggestion - Suggestion
     * @param {Object} projectContext - Project context
     * @returns {number} Priority score
     */
    calculatePriority(suggestion, projectContext) {
        let priority = 0.5; // Base priority

        // Adjust based on confidence
        if (suggestion.confidence > 0.9) {
            priority += 0.3;
        } else if (suggestion.confidence > 0.7) {
            priority += 0.2;
        } else if (suggestion.confidence < 0.5) {
            priority -= 0.2;
        }

        // Adjust based on task type
        const typePriorities = {
            security: 0.3,
            optimize: 0.2,
            refactor: 0.1,
            test: 0.1,
            analysis: 0.05
        };

        priority += typePriorities[suggestion.taskType] || 0;

        // Adjust based on project context
        if (projectContext.projectMetrics?.technicalDebt > 0.7) {
            priority += 0.2;
        }

        if (projectContext.projectMetrics?.securityIssues > 0) {
            priority += 0.3;
        }

        // Normalize to 0-1 range
        return Math.max(0, Math.min(1, priority));
    }

    /**
     * Save suggestions
     * @param {Array} suggestions - Generated suggestions
     * @param {GenerateTaskSuggestionsCommand} command - Task suggestions command
     * @returns {Promise<Array>} Saved suggestions
     */
    async saveSuggestions(suggestions, command) {
        const savedSuggestions = [];

        for (const suggestion of suggestions) {
            try {
                const savedSuggestion = await this.taskSuggestionRepository.create(suggestion);
                savedSuggestions.push(savedSuggestion);

                this.logger.debug('GenerateTaskSuggestionsHandler: Saved suggestion', {
                    handlerId: this.handlerId,
                    suggestionId: savedSuggestion.id,
                    title: savedSuggestion.title
                });

            } catch (error) {
                this.logger.error('GenerateTaskSuggestionsHandler: Failed to save suggestion', {
                    handlerId: this.handlerId,
                    suggestion: suggestion.title,
                    error: error.message
                });
            }
        }

        return savedSuggestions;
    }

    /**
     * Publish suggestions generated event
     * @param {Array} suggestions - Saved suggestions
     * @param {GenerateTaskSuggestionsCommand} command - Task suggestions command
     * @returns {Promise<void>}
     */
    async publishSuggestionsGeneratedEvent(suggestions, command) {
        try {
            await this.eventBus.publish('task.suggestions.generated', {
                projectPath: command.projectPath,
                suggestionsCount: suggestions.length,
                context: command.context,
                requestedBy: command.requestedBy,
                commandId: command.commandId,
                suggestions: suggestions.map(s => ({
                    id: s.id,
                    title: s.title,
                    taskType: s.taskType,
                    priority: s.priority,
                    confidence: s.confidence
                })),
                timestamp: new Date()
            });
        } catch (error) {
            this.logger.warn('GenerateTaskSuggestionsHandler: Failed to publish suggestions generated event', {
                handlerId: this.handlerId,
                error: error.message
            });
        }
    }

    /**
     * Handle suggestion error
     * @param {Error} error - Suggestion error
     * @param {GenerateTaskSuggestionsCommand} command - Task suggestions command
     * @returns {Promise<void>}
     */
    async handleSuggestionError(error, command) {
        this.logger.error('GenerateTaskSuggestionsHandler: Task suggestion generation failed', {
            handlerId: this.handlerId,
            commandId: command.commandId,
            projectPath: command.projectPath,
            error: error.message,
            stack: error.stack
        });

        try {
            await this.eventBus.publish('task.suggestions.failed', {
                projectPath: command.projectPath,
                context: command.context,
                commandId: command.commandId,
                error: error.message,
                errorType: error.constructor.name,
                timestamp: new Date(),
                requestedBy: command.requestedBy
            });
        } catch (eventError) {
            this.logger.warn('GenerateTaskSuggestionsHandler: Failed to publish suggestions failed event', {
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
            type: 'GenerateTaskSuggestionsHandler',
            supportedCommands: ['GenerateTaskSuggestionsCommand'],
            dependencies: [
                'taskSuggestionService',
                'taskAnalysisService',
                'cursorIDEService',
                'taskSuggestionRepository',
                'taskRepository',
                'taskTemplateRepository',
                'eventBus',
                'logger'
            ]
        };
    }
}

module.exports = GenerateTaskSuggestionsHandler; 