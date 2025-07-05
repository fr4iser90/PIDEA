/**
 * OptimizeTaskHandler - Handles task optimization commands
 * Implements the Command Handler pattern for task optimization
 */
class OptimizeTaskHandler {
    constructor(dependencies = {}) {
        this.validateDependencies(dependencies);
        this.taskOptimizationService = dependencies.taskOptimizationService;
        this.cursorIDEService = dependencies.cursorIDEService;
        this.taskRepository = dependencies.taskRepository;
        this.taskExecutionRepository = dependencies.taskExecutionRepository;
        this.eventBus = dependencies.eventBus;
        this.logger = dependencies.logger;
        this.projectAnalyzer = dependencies.projectAnalyzer;
        this.fileSystemService = dependencies.fileSystemService;
        this.handlerId = this.generateHandlerId();
    }

    /**
     * Validate handler dependencies
     * @param {Object} dependencies - Handler dependencies
     * @throws {Error} If dependencies are invalid
     */
    validateDependencies(dependencies) {
        const required = [
            'taskOptimizationService',
            'cursorIDEService',
            'taskRepository',
            'taskExecutionRepository',
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
        return `optimize_handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Handle OptimizeTaskCommand
     * @param {OptimizeTaskCommand} command - Task optimization command
     * @returns {Promise<Object>} Optimization result
     */
    async handle(command) {
        // Validate command
        const validationResult = await this.validateCommand(command);
        if (!validationResult.isValid) {
            throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
        }
        try {
            this.logger.info('OptimizeTaskHandler: Starting optimization', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
                optimizationType: command.optimizationType,
                requestedBy: command.requestedBy
            });
            await this.eventBus.publish('task.optimization.started', {
                projectPath: command.projectPath,
                optimizationType: command.optimizationType,
                commandId: command.commandId,
                requestedBy: command.requestedBy,
                timestamp: new Date()
            });
            // Call optimization service
            const result = await this.taskOptimizationService.optimize(command.projectPath, {
                type: command.optimizationType,
                options: command.options || {},
                requestedBy: command.requestedBy
            });
            await this.eventBus.publish('task.optimization.completed', {
                projectPath: command.projectPath,
                optimizationType: command.optimizationType,
                commandId: command.commandId,
                requestedBy: command.requestedBy,
                result,
                timestamp: new Date()
            });
            this.logger.info('OptimizeTaskHandler: Optimization completed', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
                optimizationType: command.optimizationType
            });
            return {
                success: true,
                result
            };
        } catch (error) {
            this.logger.error('OptimizeTaskHandler: Optimization failed', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
                error: error.message
            });
            await this.eventBus.publish('task.optimization.failed', {
                projectPath: command.projectPath,
                optimizationType: command.optimizationType,
                commandId: command.commandId,
                requestedBy: command.requestedBy,
                error: error.message,
                timestamp: new Date()
            });
            throw error;
        }
    }

    /**
     * Validate command
     * @param {OptimizeTaskCommand} command - Task optimization command
     * @returns {Promise<Object>} Validation result
     */
    async validateCommand(command) {
        const errors = [];
        const warnings = [];
        if (!command.projectPath) {
            errors.push('Project path is required');
        }
        if (!command.requestedBy) {
            errors.push('Requested by is required');
        }
        if (!command.optimizationType) {
            errors.push('Optimization type is required');
        }
        // Add more validation as needed
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
}

module.exports = OptimizeTaskHandler; 