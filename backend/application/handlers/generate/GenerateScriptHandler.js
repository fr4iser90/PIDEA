/**
 * GenerateScriptHandler - Handles automatic script generation
 * Implements the Command Handler pattern for script generation
 */
class GenerateScriptHandler {
    constructor(dependencies = {}) {
        this.validateDependencies(dependencies);
        
        this.scriptGenerationService = dependencies.scriptGenerationService;
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
            'scriptGenerationService',
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
        return `script_handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Handle GenerateScriptCommand
     * @param {GenerateScriptCommand} command - Script generation command
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
            const validationResult = await this.validateCommand(command);
            if (!validationResult.isValid) {
                throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
            }

            // Analyze project for script generation
            const projectContext = await this.analyzeProjectForScripts(command);

            // Create script generation task
            const task = await this.createScriptTask(command);

            // Create execution record
            const execution = await this.createExecutionRecord(task, command);

            // Publish script generation started event
            await this.publishScriptGenerationStartedEvent(execution, command);

            // Generate script
            const result = await this.generateScript(command, projectContext, execution);

            // Update execution record
            await this.updateExecutionRecord(execution, result);

            // Update task status
            await this.updateTaskStatus(task, result);

            // Publish script generation completed event
            await this.publishScriptGenerationCompletedEvent(execution, result, command);

            // Log success
            this.logger.info('GenerateScriptHandler: Script generation completed successfully', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
                executionId: execution.id,
                scriptType: command.scriptType,
                duration: result.duration
            });

            return {
                success: true,
                scriptId: result.scriptId,
                taskId: task.id,
                projectPath: command.projectPath,
                scriptType: command.scriptType,
                scriptName: result.scriptName,
                scriptContent: result.scriptContent,
                metadata: result.metadata,
                duration: result.duration,
                warnings: result.warnings,
                errors: result.errors
            };

        } catch (error) {
            await this.handleScriptGenerationError(error, command);
            throw error;
        }
    }

    /**
     * Validate command
     * @param {GenerateScriptCommand} command - Script generation command
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

        if (!command.scriptType) {
            errors.push('Script type is required');
        }

        // Validate script type
        const validTypes = ['build', 'deploy', 'test', 'lint', 'format', 'clean', 'dev', 'prod', 'custom'];
        if (!validTypes.includes(command.scriptType)) {
            errors.push(`Invalid script type. Must be one of: ${validTypes.join(', ')}`);
        }

        // Validate options
        if (command.options) {
            if (command.options.autoExecute && typeof command.options.autoExecute !== 'boolean') {
                errors.push('Auto execute must be a boolean');
            }

            if (command.options.overwrite && typeof command.options.overwrite !== 'boolean') {
                errors.push('Overwrite must be a boolean');
            }

            if (command.options.scriptName && typeof command.options.scriptName !== 'string') {
                errors.push('Script name must be a string');
            }

            if (command.options.environment && typeof command.options.environment !== 'object') {
                errors.push('Environment must be an object');
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
     * Analyze project for script generation
     * @param {GenerateScriptCommand} command - Script generation command
     * @returns {Promise<Object>} Project context for scripts
     */
    async analyzeProjectForScripts(command) {
        try {
            this.logger.info('GenerateScriptHandler: Analyzing project for script generation', {
                handlerId: this.handlerId,
                projectPath: command.projectPath,
                scriptType: command.scriptType
            });

            // Get project structure
            const projectStructure = await this.projectAnalyzer.getProjectStructure(command.projectPath);

            // Get package.json information
            const packageJson = await this.getPackageJsonInfo(command.projectPath);

            // Get existing scripts
            const existingScripts = await this.getExistingScripts(command.projectPath);

            // Get project type and framework
            const projectType = await this.projectAnalyzer.detectProjectType(command.projectPath);

            // Get build tools
            const buildTools = await this.detectBuildTools(command.projectPath);

            return {
                projectStructure,
                packageJson,
                existingScripts,
                projectType,
                buildTools,
                scriptType: command.scriptType,
                options: command.options || {}
            };

        } catch (error) {
            this.logger.error('GenerateScriptHandler: Failed to analyze project for scripts', {
                handlerId: this.handlerId,
                projectPath: command.projectPath,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get package.json information
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Package.json information
     */
    async getPackageJsonInfo(projectPath) {
        try {
            const packageJsonPath = `${projectPath}/package.json`;
            const exists = await this.fileSystemService.exists(packageJsonPath);
            
            if (!exists) {
                return null;
            }

            const content = await this.fileSystemService.readFile(packageJsonPath);
            const packageData = JSON.parse(content);

            return {
                name: packageData.name,
                version: packageData.version,
                scripts: packageData.scripts || {},
                dependencies: packageData.dependencies || {},
                devDependencies: packageData.devDependencies || {},
                engines: packageData.engines || {},
                type: packageData.type || 'commonjs'
            };
        } catch (error) {
            this.logger.warn('GenerateScriptHandler: Failed to read package.json', {
                handlerId: this.handlerId,
                projectPath,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Get existing scripts
     * @param {string} projectPath - Project path
     * @returns {Promise<Array>} Existing scripts
     */
    async getExistingScripts(projectPath) {
        try {
            const scripts = [];

            // Check for package.json scripts
            const packageJson = await this.getPackageJsonInfo(projectPath);
            if (packageJson && packageJson.scripts) {
                Object.entries(packageJson.scripts).forEach(([name, command]) => {
                    scripts.push({
                        name,
                        command,
                        type: 'npm',
                        location: 'package.json'
                    });
                });
            }

            // Check for shell scripts
            const shellScripts = await this.fileSystemService.findFiles(projectPath, {
                pattern: '*.sh',
                recursive: true
            });

            for (const script of shellScripts) {
                const content = await this.fileSystemService.readFile(script);
                scripts.push({
                    name: script.split('/').pop(),
                    command: content,
                    type: 'shell',
                    location: script
                });
            }

            // Check for batch files (Windows)
            const batchFiles = await this.fileSystemService.findFiles(projectPath, {
                pattern: '*.bat',
                recursive: true
            });

            for (const script of batchFiles) {
                const content = await this.fileSystemService.readFile(script);
                scripts.push({
                    name: script.split('/').pop(),
                    command: content,
                    type: 'batch',
                    location: script
                });
            }

            return scripts;

        } catch (error) {
            this.logger.warn('GenerateScriptHandler: Failed to get existing scripts', {
                handlerId: this.handlerId,
                projectPath,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Detect build tools
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Build tools information
     */
    async detectBuildTools(projectPath) {
        try {
            const buildTools = {
                webpack: false,
                vite: false,
                rollup: false,
                esbuild: false,
                parcel: false,
                gulp: false,
                grunt: false,
                make: false,
                cmake: false,
                maven: false,
                gradle: false,
                cargo: false,
                go: false,
                python: false
            };

            // Check for configuration files
            const configFiles = [
                'webpack.config.js', 'vite.config.js', 'rollup.config.js',
                'esbuild.config.js', 'parcel.config.js', 'gulpfile.js',
                'gruntfile.js', 'Makefile', 'CMakeLists.txt',
                'pom.xml', 'build.gradle', 'Cargo.toml',
                'go.mod', 'requirements.txt', 'setup.py'
            ];

            for (const file of configFiles) {
                const exists = await this.fileSystemService.exists(`${projectPath}/${file}`);
                if (exists) {
                    const tool = this.getToolFromConfigFile(file);
                    if (tool) {
                        buildTools[tool] = true;
                    }
                }
            }

            return buildTools;

        } catch (error) {
            this.logger.warn('GenerateScriptHandler: Failed to detect build tools', {
                handlerId: this.handlerId,
                projectPath,
                error: error.message
            });
            return {};
        }
    }

    /**
     * Get tool from config file
     * @param {string} filename - Config filename
     * @returns {string|null} Tool name
     */
    getToolFromConfigFile(filename) {
        const toolMap = {
            'webpack.config.js': 'webpack',
            'vite.config.js': 'vite',
            'rollup.config.js': 'rollup',
            'esbuild.config.js': 'esbuild',
            'parcel.config.js': 'parcel',
            'gulpfile.js': 'gulp',
            'gruntfile.js': 'grunt',
            'Makefile': 'make',
            'CMakeLists.txt': 'cmake',
            'pom.xml': 'maven',
            'build.gradle': 'gradle',
            'Cargo.toml': 'cargo',
            'go.mod': 'go',
            'requirements.txt': 'python',
            'setup.py': 'python'
        };

        return toolMap[filename] || null;
    }

    /**
     * Create script generation task
     * @param {GenerateScriptCommand} command - Script generation command
     * @returns {Promise<Task>} Script generation task
     */
    async createScriptTask(command) {
        try {
            const task = await this.taskRepository.create({
                title: `Generate ${command.scriptType} script for ${command.projectPath}`,
                description: `AI-powered ${command.scriptType} script generation`,
                taskType: 'script',
                priority: 'medium',
                projectPath: command.projectPath,
                status: 'pending',
                metadata: {
                    scriptType: command.scriptType,
                    options: command.options || {},
                    commandId: command.commandId,
                    handlerId: this.handlerId
                },
                createdBy: command.requestedBy,
                estimatedTime: this.getEstimatedTime(command.scriptType, command.options)
            });

            this.logger.info('GenerateScriptHandler: Created script generation task', {
                handlerId: this.handlerId,
                taskId: task.id,
                projectPath: command.projectPath,
                scriptType: command.scriptType
            });

            return task;
        } catch (error) {
            this.logger.error('GenerateScriptHandler: Failed to create script generation task', {
                handlerId: this.handlerId,
                projectPath: command.projectPath,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Create execution record
     * @param {Task} task - Script generation task
     * @param {GenerateScriptCommand} command - Script generation command
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
                    scriptType: command.scriptType,
                    projectPath: command.projectPath
                }
            });

            this.logger.info('GenerateScriptHandler: Created execution record', {
                handlerId: this.handlerId,
                executionId: execution.id,
                taskId: task.id
            });

            return execution;
        } catch (error) {
            this.logger.error('GenerateScriptHandler: Failed to create execution record', {
                handlerId: this.handlerId,
                taskId: task.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Generate script
     * @param {GenerateScriptCommand} command - Script generation command
     * @param {Object} projectContext - Project context
     * @param {TaskExecution} execution - Execution record
     * @returns {Promise<Object>} Script generation result
     */
    async generateScript(command, projectContext, execution) {
        const startTime = Date.now();
        
        try {
            this.logger.info('GenerateScriptHandler: Starting script generation', {
                handlerId: this.handlerId,
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

            // Process and validate script
            const processedScript = await this.processScript(scriptResult, projectContext, command);

            // Save script to file system
            const savedScript = await this.saveScript(processedScript, command);

            const duration = Date.now() - startTime;

            return {
                scriptId: savedScript.id,
                scriptName: savedScript.name,
                scriptContent: savedScript.content,
                scriptPath: savedScript.path,
                status: 'completed',
                duration,
                metadata: {
                    ...savedScript.metadata,
                    scriptType: command.scriptType,
                    generationMethod: 'ai_powered',
                    projectType: projectContext.projectType,
                    buildTools: projectContext.buildTools
                },
                warnings: processedScript.warnings || [],
                errors: processedScript.errors || []
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            
            this.logger.error('GenerateScriptHandler: Script generation failed', {
                handlerId: this.handlerId,
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

    /**
     * Process script
     * @param {Object} scriptResult - AI-generated script result
     * @param {Object} projectContext - Project context
     * @param {GenerateScriptCommand} command - Script generation command
     * @returns {Promise<Object>} Processed script
     */
    async processScript(scriptResult, projectContext, command) {
        try {
            // Validate script structure
            const validation = this.validateScript(scriptResult);
            if (!validation.isValid) {
                throw new Error(`Script validation failed: ${validation.errors.join(', ')}`);
            }

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
            this.logger.error('GenerateScriptHandler: Failed to process script', {
                handlerId: this.handlerId,
                scriptType: command.scriptType,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Validate script
     * @param {Object} scriptResult - AI-generated script result
     * @returns {Object} Validation result
     */
    validateScript(scriptResult) {
        const errors = [];

        if (!scriptResult.content || typeof scriptResult.content !== 'string') {
            errors.push('Script content is required and must be a string');
        }

        if (scriptResult.content && scriptResult.content.length < 10) {
            errors.push('Script content is too short');
        }

        if (scriptResult.content && scriptResult.content.length > 10000) {
            errors.push('Script content is too long');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
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
        const baseNames = {
            build: 'build',
            deploy: 'deploy',
            test: 'test',
            lint: 'lint',
            format: 'format',
            clean: 'clean',
            dev: 'dev',
            prod: 'prod',
            custom: 'script'
        };

        const baseName = baseNames[scriptType] || 'script';
        return `${baseName}-${timestamp}.sh`;
    }

    /**
     * Determine script path
     * @param {string} scriptName - Script name
     * @param {Object} projectContext - Project context
     * @param {GenerateScriptCommand} command - Script generation command
     * @returns {string} Script path
     */
    determineScriptPath(scriptName, projectContext, command) {
        const basePath = command.projectPath;
        
        // Check for scripts directory
        const scriptsDir = `${basePath}/scripts`;
        const hasScriptsDir = this.fileSystemService.exists(scriptsDir);
        
        if (hasScriptsDir) {
            return `${scriptsDir}/${scriptName}`;
        }

        // Check for bin directory
        const binDir = `${basePath}/bin`;
        const hasBinDir = this.fileSystemService.exists(binDir);
        
        if (hasBinDir) {
            return `${binDir}/${scriptName}`;
        }

        // Default to project root
        return `${basePath}/${scriptName}`;
    }

    /**
     * Enhance script content
     * @param {string} content - Original script content
     * @param {Object} projectContext - Project context
     * @param {GenerateScriptCommand} command - Script generation command
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
        const errorHandling = `
# Error handling
set -e  # Exit on any error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Function to handle errors
handle_error() {
    echo "Error: $1" >&2
    exit 1
}

trap 'handle_error "Script failed at line $LINENO"' ERR
`;

        return `${errorHandling}\n${content}`;
    }

    /**
     * Add logging to script
     * @param {string} content - Script content
     * @returns {string} Script content with logging
     */
    addLogging(content) {
        const logging = `
# Logging functions
log_info() {
    echo "[INFO] $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo "[ERROR] $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
}

log_success() {
    echo "[SUCCESS] $(date '+%Y-%m-%d %H:%M:%S') - $1"
}
`;

        return `${logging}\n${content}`;
    }

    /**
     * Add project-specific enhancements
     * @param {string} content - Script content
     * @param {Object} projectContext - Project context
     * @param {GenerateScriptCommand} command - Script generation command
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
     * @param {GenerateScriptCommand} command - Script generation command
     * @returns {string} Script content with metadata
     */
    addScriptMetadata(content, scriptName, command) {
        const metadata = `#!/bin/bash
# Generated by AI Task Management System
# Script: ${scriptName}
# Type: ${command.scriptType}
# Project: ${command.projectPath}
# Generated: $(date '+%Y-%m-%d %H:%M:%S')
# Generated by: ${command.requestedBy}

`;

        return `${metadata}${content}`;
    }

    /**
     * Save script to file system
     * @param {Object} script - Processed script
     * @param {GenerateScriptCommand} command - Script generation command
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

            this.logger.info('GenerateScriptHandler: Script saved successfully', {
                handlerId: this.handlerId,
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
            this.logger.error('GenerateScriptHandler: Failed to save script', {
                handlerId: this.handlerId,
                scriptPath: script.path,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get estimated time for script generation
     * @param {string} scriptType - Script type
     * @param {Object} options - Script options
     * @returns {number} Estimated time in minutes
     */
    getEstimatedTime(scriptType, options = {}) {
        const baseTimes = {
            build: 5,
            deploy: 8,
            test: 3,
            lint: 2,
            format: 2,
            clean: 1,
            dev: 4,
            prod: 6,
            custom: 5
        };

        let baseTime = baseTimes[scriptType] || 5;
        
        // Adjust based on complexity
        if (options.complex) {
            baseTime *= 1.5;
        }

        return baseTime;
    }

    /**
     * Update execution record
     * @param {TaskExecution} execution - Execution record
     * @param {Object} result - Script generation result
     * @returns {Promise<void>}
     */
    async updateExecutionRecord(execution, result) {
        try {
            await this.taskExecutionRepository.update(execution.id, {
                status: result.status,
                completedAt: new Date(),
                duration: result.duration,
                output: {
                    scriptId: result.scriptId,
                    scriptName: result.scriptName,
                    scriptPath: result.scriptPath
                },
                metadata: {
                    ...execution.metadata,
                    result: result.metadata,
                    warnings: result.warnings,
                    errors: result.errors
                }
            });

            this.logger.info('GenerateScriptHandler: Updated execution record', {
                handlerId: this.handlerId,
                executionId: execution.id,
                status: result.status,
                duration: result.duration
            });
        } catch (error) {
            this.logger.error('GenerateScriptHandler: Failed to update execution record', {
                handlerId: this.handlerId,
                executionId: execution.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Update task status
     * @param {Task} task - Script generation task
     * @param {Object} result - Script generation result
     * @returns {Promise<void>}
     */
    async updateTaskStatus(task, result) {
        try {
            if (result.status === 'completed') {
                task.markAsCompleted();
            } else {
                task.markAsFailed();
            }

            await this.taskRepository.update(task.id, {
                status: task.status.value,
                lastExecutedAt: new Date(),
                executionCount: task.executionCount + 1
            });

            this.logger.info('GenerateScriptHandler: Updated task status', {
                handlerId: this.handlerId,
                taskId: task.id,
                newStatus: task.status.value,
                executionCount: task.executionCount
            });
        } catch (error) {
            this.logger.error('GenerateScriptHandler: Failed to update task status', {
                handlerId: this.handlerId,
                taskId: task.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Publish script generation started event
     * @param {TaskExecution} execution - Execution record
     * @param {GenerateScriptCommand} command - Script generation command
     * @returns {Promise<void>}
     */
    async publishScriptGenerationStartedEvent(execution, command) {
        try {
            await this.eventBus.publish('script.generation.started', {
                executionId: execution.id,
                taskId: execution.taskId,
                projectPath: command.projectPath,
                scriptType: command.scriptType,
                startedAt: execution.startedAt,
                requestedBy: command.requestedBy,
                commandId: command.commandId
            });
        } catch (error) {
            this.logger.warn('GenerateScriptHandler: Failed to publish script generation started event', {
                handlerId: this.handlerId,
                executionId: execution.id,
                error: error.message
            });
        }
    }

    /**
     * Publish script generation completed event
     * @param {TaskExecution} execution - Execution record
     * @param {Object} result - Script generation result
     * @param {GenerateScriptCommand} command - Script generation command
     * @returns {Promise<void>}
     */
    async publishScriptGenerationCompletedEvent(execution, result, command) {
        try {
            await this.eventBus.publish('script.generation.completed', {
                executionId: execution.id,
                taskId: execution.taskId,
                projectPath: command.projectPath,
                scriptType: command.scriptType,
                status: result.status,
                completedAt: new Date(),
                duration: result.duration,
                requestedBy: command.requestedBy,
                commandId: command.commandId,
                scriptId: result.scriptId,
                scriptName: result.scriptName,
                scriptPath: result.scriptPath,
                warnings: result.warnings,
                errors: result.errors
            });
        } catch (error) {
            this.logger.warn('GenerateScriptHandler: Failed to publish script generation completed event', {
                handlerId: this.handlerId,
                executionId: execution.id,
                error: error.message
            });
        }
    }

    /**
     * Handle script generation error
     * @param {Error} error - Script generation error
     * @param {GenerateScriptCommand} command - Script generation command
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

        try {
            await this.eventBus.publish('script.generation.failed', {
                projectPath: command.projectPath,
                scriptType: command.scriptType,
                commandId: command.commandId,
                error: error.message,
                errorType: error.constructor.name,
                timestamp: new Date(),
                requestedBy: command.requestedBy
            });
        } catch (eventError) {
            this.logger.warn('GenerateScriptHandler: Failed to publish script generation failed event', {
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
            type: 'GenerateScriptHandler',
            supportedCommands: ['GenerateScriptCommand'],
            supportedScriptTypes: ['build', 'deploy', 'test', 'lint', 'format', 'clean', 'dev', 'prod', 'custom'],
            dependencies: [
                'scriptGenerationService',
                'cursorIDEService',
                'taskRepository',
                'taskExecutionRepository',
                'eventBus',
                'logger'
            ]
        };
    }
}

module.exports = GenerateScriptHandler; 