/**
 * Script Processing Service
 * Handles script content processing and enhancement
 */

const { 
    SCRIPT_NAME_BASE_MAPPING, 
    SCRIPT_DIRECTORIES,
    ERROR_HANDLING_TEMPLATE,
    LOGGING_TEMPLATE,
    SCRIPT_METADATA_TEMPLATE
} = require('../constants/ScriptGenerationConstants');

class ScriptProcessingService {
    constructor(dependencies = {}) {
        this.fileSystemService = dependencies.fileSystemService;
        this.logger = dependencies.logger;
    }

    /**
     * Process script
     * @param {Object} scriptResult - AI-generated script result
     * @param {Object} projectContext - Project context
     * @param {Object} command - Script generation command
     * @returns {Promise<Object>} Processed script
     */
    async processScript(scriptResult, projectContext, command) {
        try {
            // Generate script name
            const scriptName = this.generateScriptName(command.scriptType, command.options);

            // Determine script path
            const scriptPath = this.determineScriptPath(scriptName, projectContext, command);

            // Enhance script content
            const enhancedContent = await this.enhanceScriptContent(scriptResult.content, projectContext, command);

            // Add shebang and comments
            const finalContent = this.addScriptMetadata(enhancedContent, scriptName, command);

            return {
                name: scriptName,
                content: finalContent,
                path: scriptPath,
                type: command.scriptType,
                metadata: {
                    ...scriptResult.metadata,
                    generatedBy: 'ai',
                    generationMethod: 'cursor_ide',
                    projectContext: {
                        projectType: projectContext.projectType,
                        buildTools: projectContext.buildTools,
                        existingScripts: projectContext.existingScripts.length
                    }
                },
                warnings: scriptResult.warnings || [],
                errors: scriptResult.errors || []
            };

        } catch (error) {
            this.logger.error('ScriptProcessingService: Failed to process script', {
                scriptType: command.scriptType,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Generate script name
     * @param {string} scriptType - Script type
     * @param {Object} options - Script options
     * @returns {string} Script name
     */
    generateScriptName(scriptType, options = {}) {
        if (options.scriptName) {
            return options.scriptName;
        }

        const timestamp = Date.now();
        const baseName = SCRIPT_NAME_BASE_MAPPING[scriptType] || 'script';
        return `${baseName}-${timestamp}.sh`;
    }

    /**
     * Determine script path
     * @param {string} scriptName - Script name
     * @param {Object} projectContext - Project context
     * @param {Object} command - Script generation command
     * @returns {string} Script path
     */
    determineScriptPath(scriptName, projectContext, command) {
        const basePath = command.projectPath;
        
        // Check for preferred script directories
        for (const dir of SCRIPT_DIRECTORIES) {
            const scriptDir = `${basePath}/${dir}`;
            const hasDir = this.fileSystemService.exists(scriptDir);
            
            if (hasDir) {
                return `${scriptDir}/${scriptName}`;
            }
        }

        // Default to project root
        return `${basePath}/${scriptName}`;
    }

    /**
     * Enhance script content
     * @param {string} content - Original script content
     * @param {Object} projectContext - Project context
     * @param {Object} command - Script generation command
     * @returns {Promise<string>} Enhanced script content
     */
    async enhanceScriptContent(content, projectContext, command) {
        let enhancedContent = content;

        // Add environment variables if specified
        if (command.options?.environment) {
            const envVars = Object.entries(command.options.environment)
                .map(([key, value]) => `export ${key}="${value}"`)
                .join('\n');
            enhancedContent = `${envVars}\n\n${enhancedContent}`;
        }

        // Add error handling
        enhancedContent = this.addErrorHandling(enhancedContent);

        // Add logging
        enhancedContent = this.addLogging(enhancedContent);

        // Add project-specific enhancements
        enhancedContent = this.addProjectSpecificEnhancements(enhancedContent, projectContext, command);

        return enhancedContent;
    }

    /**
     * Add error handling to script
     * @param {string} content - Script content
     * @returns {string} Script content with error handling
     */
    addErrorHandling(content) {
        return `${ERROR_HANDLING_TEMPLATE}\n${content}`;
    }

    /**
     * Add logging to script
     * @param {string} content - Script content
     * @returns {string} Script content with logging
     */
    addLogging(content) {
        return `${LOGGING_TEMPLATE}\n${content}`;
    }

    /**
     * Add project-specific enhancements
     * @param {string} content - Script content
     * @param {Object} projectContext - Project context
     * @param {Object} command - Script generation command
     * @returns {string} Enhanced script content
     */
    addProjectSpecificEnhancements(content, projectContext, command) {
        let enhancedContent = content;

        // Add project path
        enhancedContent = `# Project path
PROJECT_PATH="${command.projectPath}"
cd "$PROJECT_PATH"

${enhancedContent}`;

        // Add Node.js specific enhancements
        if (projectContext.packageJson) {
            enhancedContent = `# Node.js project detected
NODE_VERSION="${projectContext.packageJson.engines?.node || 'latest'}"
NPM_VERSION="${projectContext.packageJson.engines?.npm || 'latest'}"

${enhancedContent}`;
        }

        return enhancedContent;
    }

    /**
     * Add script metadata
     * @param {string} content - Script content
     * @param {string} scriptName - Script name
     * @param {Object} command - Script generation command
     * @returns {string} Script content with metadata
     */
    addScriptMetadata(content, scriptName, command) {
        const metadata = SCRIPT_METADATA_TEMPLATE(
            scriptName, 
            command.scriptType, 
            command.projectPath, 
            command.requestedBy
        );
        return `${metadata}${content}`;
    }

    /**
     * Save script to file system
     * @param {Object} script - Processed script
     * @param {Object} command - Script generation command
     * @returns {Promise<Object>} Saved script information
     */
    async saveScript(script, command) {
        try {
            // Create directory if it doesn't exist
            const scriptDir = script.path.substring(0, script.path.lastIndexOf('/'));
            await this.fileSystemService.ensureDirectory(scriptDir);

            // Check if file exists and handle overwrite
            const exists = await this.fileSystemService.exists(script.path);
            if (exists && !command.options?.overwrite) {
                throw new Error(`Script file already exists: ${script.path}. Use overwrite option to replace.`);
            }

            // Write script to file
            await this.fileSystemService.writeFile(script.path, script.content);

            // Make script executable
            await this.fileSystemService.chmod(script.path, '755');

            this.logger.info('ScriptProcessingService: Script saved successfully', {
                scriptPath: script.path,
                scriptName: script.name
            });

            return {
                id: `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: script.name,
                content: script.content,
                path: script.path,
                metadata: script.metadata
            };

        } catch (error) {
            this.logger.error('ScriptProcessingService: Failed to save script', {
                scriptPath: script.path,
                error: error.message
            });
            throw error;
        }
    }
}

module.exports = ScriptProcessingService; 