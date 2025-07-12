/**
 * GenerateScriptHandler - Handles automatic script generation
 * Implements the Command Handler pattern for script generation
 */

const ScriptGenerationValidator = require('./validation/ScriptGenerationValidator');
const ProjectAnalysisService = require('./services/ProjectAnalysisService');
const ScriptGenerationService = require('./services/ScriptGenerationService');
const ScriptProcessingService = require('./services/ScriptProcessingService');
const TaskManagementService = require('./services/TaskManagementService');
const EventPublishingService = require('./services/EventPublishingService');

class GenerateScriptHandler {
    constructor(dependencies = {}) {
        this.validateDependencies(dependencies);
        
        // Initialize services
        this.projectAnalysisService = new ProjectAnalysisService({
            fileSystemService: dependencies.fileSystemService,
            projectAnalyzer: dependencies.projectAnalyzer,
            logger: dependencies.logger
        });

        this.scriptGenerationService = new ScriptGenerationService({
            cursorIDEService: dependencies.cursorIDEService,
            logger: dependencies.logger
        });

        this.scriptProcessingService = new ScriptProcessingService({
            fileSystemService: dependencies.fileSystemService,
            logger: dependencies.logger
        });

        this.taskManagementService = new TaskManagementService({
            taskRepository: dependencies.taskRepository,
            taskExecutionRepository: dependencies.taskExecutionRepository,
            logger: dependencies.logger
        });

        this.eventPublishingService = new EventPublishingService({
            eventBus: dependencies.eventBus,
            logger: dependencies.logger
        });

        this.logger = dependencies.logger;
        this.handlerId = this.generateHandlerId();
    }

    /**
     * Validate handler dependencies
     * @param {Object} dependencies - Handler dependencies
     * @throws {Error} If dependencies are invalid
     */
    validateDependencies(dependencies) {
        const required = [
            'scriptGenerationService',
            'cursorIDEService',
            'taskRepository',
            'taskExecutionRepository',
            'eventBus',
            'logger',
            'projectAnalyzer',
            'fileSystemService'
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
        return `script_handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Handle GenerateScriptCommand
     * @param {Object} command - Script generation command
     * @returns {Promise<Object>} Script generation result
     */
    async handle(command) {
        try {
            this.logger.info('GenerateScriptHandler: Starting script generation', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
                scriptType: command.scriptType,
                requestedBy: command.requestedBy
            });

            // Validate command
            const validationResult = ScriptGenerationValidator.validateCommand(command);
            if (!validationResult.isValid) {
                throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
            }

            // Analyze project for script generation
            const projectContext = await this.projectAnalysisService.analyzeProjectForScripts(
                command.projectPath, 
                command.scriptType
            );

            // Create script generation task
            const task = await this.taskManagementService.createScriptTask(command, this.handlerId);

            // Create execution record
            const execution = await this.taskManagementService.createExecutionRecord(task, command, this.handlerId);

            // Publish script generation started event
            await this.eventPublishingService.publishScriptGenerationStartedEvent(execution, command);

            // Generate script
            const scriptResult = await this.scriptGenerationService.generateScript(command, projectContext, execution);

            // Process and save script
            const processedScript = await this.scriptProcessingService.processScript(scriptResult, projectContext, command);
            const savedScript = await this.scriptProcessingService.saveScript(processedScript, command);

            // Update result with saved script information
            const finalResult = {
                ...scriptResult,
                scriptId: savedScript.id,
                scriptName: savedScript.name,
                scriptPath: savedScript.path
            };

            // Update execution record
            await this.taskManagementService.updateExecutionRecord(execution, finalResult);

            // Update task status
            await this.taskManagementService.updateTaskStatus(task, finalResult);

            // Publish script generation completed event
            await this.eventPublishingService.publishScriptGenerationCompletedEvent(execution, finalResult, command);

            // Log success
            this.logger.info('GenerateScriptHandler: Script generation completed successfully', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
                executionId: execution.id,
                scriptType: command.scriptType,
                duration: finalResult.duration
            });

            return {
                success: true,
                scriptId: finalResult.scriptId,
                taskId: task.id,
                projectPath: command.projectPath,
                scriptType: command.scriptType,
                scriptName: finalResult.scriptName,
                scriptContent: finalResult.scriptContent,
                metadata: finalResult.metadata,
                duration: finalResult.duration,
                warnings: finalResult.warnings,
                errors: finalResult.errors
            };

        } catch (error) {
            await this.handleScriptGenerationError(error, command);
            throw error;
        }
    }

    /**
     * Handle script generation error
     * @param {Error} error - Script generation error
     * @param {Object} command - Script generation command
     * @returns {Promise<void>}
     */
    async handleScriptGenerationError(error, command) {
        this.logger.error('GenerateScriptHandler: Script generation failed', {
            handlerId: this.handlerId,
            commandId: command.commandId,
            projectPath: command.projectPath,
            scriptType: command.scriptType,
            error: error.message,
            stack: error.stack
        });

        await this.eventPublishingService.publishScriptGenerationFailedEvent(error, command);
    }

    /**
     * Get handler metadata
     * @returns {Object} Handler metadata
     */
    getMetadata() {
        return {
            handlerId: this.handlerId,
            type: 'GenerateScriptHandler',
            supportedCommands: ['GenerateScriptCommand'],
            supportedScriptTypes: ['build', 'deploy', 'test', 'lint', 'format', 'clean', 'dev', 'prod', 'custom'],
            dependencies: [
                'scriptGenerationService',
                'cursorIDEService',
                'taskRepository',
                'taskExecutionRepository',
                'eventBus',
                'logger',
                'projectAnalyzer',
                'fileSystemService'
            ]
        };
    }
}

module.exports = GenerateScriptHandler; 