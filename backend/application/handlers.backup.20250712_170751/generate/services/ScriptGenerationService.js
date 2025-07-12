/**
 * Script Generation Service
 * Main service that orchestrates script generation process
 */

class ScriptGenerationService {
    constructor(dependencies = {}) {
        this.cursorIDEService = dependencies.cursorIDEService;
        this.logger = dependencies.logger;
    }

    /**
     * Generate script using AI
     * @param {Object} command - Script generation command
     * @param {Object} projectContext - Project context
     * @param {Object} execution - Execution record
     * @returns {Promise<Object>} Script generation result
     */
    async generateScript(command, projectContext, execution) {
        const startTime = Date.now();
        
        try {
            this.logger.info('ScriptGenerationService: Starting script generation', {
                executionId: execution.id,
                projectPath: command.projectPath,
                scriptType: command.scriptType
            });

            // Use Cursor IDE service for AI-powered script generation
            const scriptResult = await this.cursorIDEService.generateScript({
                projectPath: command.projectPath,
                scriptType: command.scriptType,
                projectContext,
                options: command.options || {}
            });

            const duration = Date.now() - startTime;

            return {
                scriptId: null, // Will be set by processing service
                scriptName: null, // Will be set by processing service
                scriptContent: scriptResult.content,
                scriptPath: null, // Will be set by processing service
                status: 'completed',
                duration,
                metadata: {
                    ...scriptResult.metadata,
                    scriptType: command.scriptType,
                    generationMethod: 'ai_powered',
                    projectType: projectContext.projectType,
                    buildTools: projectContext.buildTools
                },
                warnings: scriptResult.warnings || [],
                errors: scriptResult.errors || []
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            
            this.logger.error('ScriptGenerationService: Script generation failed', {
                executionId: execution.id,
                projectPath: command.projectPath,
                duration,
                error: error.message,
                stack: error.stack
            });

            return {
                scriptId: null,
                scriptName: null,
                scriptContent: null,
                scriptPath: null,
                status: 'failed',
                duration,
                metadata: {
                    scriptType: command.scriptType,
                    error: error.message,
                    errorType: error.constructor.name
                },
                warnings: [],
                errors: [error.message]
            };
        }
    }
}

module.exports = ScriptGenerationService; 