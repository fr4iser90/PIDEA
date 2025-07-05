/**
 * AnalyzeProjectHandler - Handles project analysis commands
 * Implements the Command Handler pattern for project analysis
 */
class AnalyzeProjectHandler {
    constructor(dependencies = {}) {
        this.validateDependencies(dependencies);
        
        this.taskAnalysisService = dependencies.taskAnalysisService;
        this.projectAnalyzer = dependencies.projectAnalyzer;
        this.cursorIDEService = dependencies.cursorIDEService;
        this.taskRepository = dependencies.taskRepository;
        this.taskExecutionRepository = dependencies.taskExecutionRepository;
        this.eventBus = dependencies.eventBus;
        this.logger = dependencies.logger;
        this.fileSystemService = dependencies.fileSystemService;
        this.gitService = dependencies.gitService;
        
        this.handlerId = this.generateHandlerId();
    }

    /**
     * Validate handler dependencies
     * @param {Object} dependencies - Handler dependencies
     * @throws {Error} If dependencies are invalid
     */
      validateDependencies(dependencies) {
    const required = [
      'taskAnalysisService',
      'projectAnalyzer', 
      'cursorIDEService',
      'taskRepository',
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
        return `analyze_handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Handle AnalyzeProjectCommand
     * @param {AnalyzeProjectCommand} command - Project analysis command
     * @returns {Promise<Object>} Analysis result
     */
    async handle(command) {
        try {
            this.logger.info('AnalyzeProjectHandler: Starting project analysis', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
                analysisType: command.analysisType,
                requestedBy: command.requestedBy
            });

            // Validate command
            const validationResult = await this.validateCommand(command);
            if (!validationResult.isValid) {
                throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
            }

            // Validate project path
            await this.validateProjectPath(command.projectPath);

            // Create analysis task
            const task = await this.createAnalysisTask(command);

            // Create execution record
            const execution = await this.createExecutionRecord(task, command);

            // Publish analysis started event
            await this.publishAnalysisStartedEvent(execution, command);

            // Perform analysis
            const result = await this.performAnalysis(command, execution);

            // Update execution record
            await this.updateExecutionRecord(execution, result);

            // Update task status
            await this.updateTaskStatus(task, result);

            // Publish analysis completed event
            await this.publishAnalysisCompletedEvent(execution, result, command);

            // Log success
            this.logger.info('AnalyzeProjectHandler: Project analysis completed successfully', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
                executionId: execution.id,
                duration: result.duration,
                analysisType: command.analysisType
            });

            return {
                success: true,
                analysisId: execution.id,
                taskId: task.id,
                projectPath: command.projectPath,
                analysisType: command.analysisType,
                result: result.analysis,
                metrics: result.metrics,
                recommendations: result.recommendations,
                duration: result.duration,
                metadata: result.metadata,
                warnings: result.warnings,
                errors: result.errors
            };

        } catch (error) {
            await this.handleAnalysisError(error, command);
            throw error;
        }
    }

    /**
     * Validate command
     * @param {AnalyzeProjectCommand} command - Project analysis command
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

        if (!command.analysisType) {
            errors.push('Analysis type is required');
        }

        // Validate analysis type
        const validTypes = ['comprehensive', 'performance', 'security', 'quality', 'architecture', 'dependencies'];
        if (!validTypes.includes(command.analysisType)) {
            errors.push(`Invalid analysis type. Must be one of: ${validTypes.join(', ')}`);
        }

        // Validate options
        if (command.options) {
            if (command.options.depth && !['shallow', 'medium', 'deep'].includes(command.options.depth)) {
                errors.push('Depth must be shallow, medium, or deep');
            }

            if (command.options.timeout && (typeof command.options.timeout !== 'number' || command.options.timeout < 1000)) {
                errors.push('Timeout must be at least 1000ms');
            }

            if (command.options.maxFileSize && (typeof command.options.maxFileSize !== 'number' || command.options.maxFileSize < 1)) {
                errors.push('Max file size must be a positive number');
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
     * Validate project path
     * @param {string} projectPath - Project path
     * @returns {Promise<void>}
     */
    async validateProjectPath(projectPath) {
        try {
            const exists = await this.fileSystemService.exists(projectPath);
            if (!exists) {
                throw new Error(`Project path does not exist: ${projectPath}`);
            }

            const isDirectory = await this.fileSystemService.isDirectory(projectPath);
            if (!isDirectory) {
                throw new Error(`Project path is not a directory: ${projectPath}`);
            }

            // Check for basic project indicators
            const hasPackageJson = await this.fileSystemService.exists(`${projectPath}/package.json`);
            const hasGit = await this.fileSystemService.exists(`${projectPath}/.git`);
            
            if (!hasPackageJson && !hasGit) {
                throw new Error(`Project path does not appear to be a valid project: ${projectPath}`);
            }

        } catch (error) {
            this.logger.error('AnalyzeProjectHandler: Project path validation failed', {
                handlerId: this.handlerId,
                projectPath,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Create analysis task
     * @param {AnalyzeProjectCommand} command - Project analysis command
     * @returns {Promise<Task>} Analysis task
     */
    async createAnalysisTask(command) {
        try {
            const task = await this.taskRepository.create({
                title: `Analyze ${command.projectPath} - ${command.analysisType}`,
                description: `AI-powered ${command.analysisType} analysis of project`,
                taskType: 'analysis',
                priority: 'high',
                projectPath: command.projectPath,
                status: 'pending',
                metadata: {
                    analysisType: command.analysisType,
                    options: command.options || {},
                    commandId: command.commandId,
                    handlerId: this.handlerId
                },
                createdBy: command.requestedBy,
                estimatedTime: this.getEstimatedTime(command.analysisType, command.options)
            });

            this.logger.info('AnalyzeProjectHandler: Created analysis task', {
                handlerId: this.handlerId,
                taskId: task.id,
                projectPath: command.projectPath,
                analysisType: command.analysisType
            });

            return task;
        } catch (error) {
            this.logger.error('AnalyzeProjectHandler: Failed to create analysis task', {
                handlerId: this.handlerId,
                projectPath: command.projectPath,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Create execution record
     * @param {Task} task - Analysis task
     * @param {AnalyzeProjectCommand} command - Project analysis command
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
                    analysisType: command.analysisType,
                    projectPath: command.projectPath
                }
            });

            this.logger.info('AnalyzeProjectHandler: Created execution record', {
                handlerId: this.handlerId,
                executionId: execution.id,
                taskId: task.id
            });

            return execution;
        } catch (error) {
            this.logger.error('AnalyzeProjectHandler: Failed to create execution record', {
                handlerId: this.handlerId,
                taskId: task.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Perform analysis
     * @param {AnalyzeProjectCommand} command - Project analysis command
     * @param {TaskExecution} execution - Execution record
     * @returns {Promise<Object>} Analysis result
     */
    async performAnalysis(command, execution) {
        const startTime = Date.now();
        
        try {
            this.logger.info('AnalyzeProjectHandler: Starting analysis', {
                handlerId: this.handlerId,
                executionId: execution.id,
                projectPath: command.projectPath,
                analysisType: command.analysisType
            });

            // Get project information
            const projectInfo = await this.getProjectInfo(command.projectPath);

            // Perform analysis based on type
            let analysisResult;
            switch (command.analysisType) {
                case 'comprehensive':
                    analysisResult = await this.performComprehensiveAnalysis(command, projectInfo);
                    break;
                case 'performance':
                    analysisResult = await this.performPerformanceAnalysis(command, projectInfo);
                    break;
                case 'security':
                    analysisResult = await this.performSecurityAnalysis(command, projectInfo);
                    break;
                case 'quality':
                    analysisResult = await this.performQualityAnalysis(command, projectInfo);
                    break;
                case 'architecture':
                    analysisResult = await this.performArchitectureAnalysis(command, projectInfo);
                    break;
                case 'dependencies':
                    analysisResult = await this.performDependenciesAnalysis(command, projectInfo);
                    break;
                default:
                    analysisResult = await this.performGenericAnalysis(command, projectInfo);
            }

            const duration = Date.now() - startTime;

            return {
                analysis: analysisResult.analysis,
                metrics: analysisResult.metrics,
                recommendations: analysisResult.recommendations,
                duration,
                metadata: {
                    ...analysisResult.metadata,
                    analysisType: command.analysisType,
                    projectInfo,
                    executionId: execution.id
                },
                warnings: analysisResult.warnings || [],
                errors: analysisResult.errors || []
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            
            this.logger.error('AnalyzeProjectHandler: Analysis failed', {
                handlerId: this.handlerId,
                executionId: execution.id,
                projectPath: command.projectPath,
                duration,
                error: error.message,
                stack: error.stack
            });

            return {
                analysis: null,
                metrics: {},
                recommendations: [],
                duration,
                metadata: {
                    analysisType: command.analysisType,
                    error: error.message,
                    errorType: error.constructor.name
                },
                warnings: [],
                errors: [error.message]
            };
        }
    }

    /**
     * Get project information
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Project information
     */
    async getProjectInfo(projectPath) {
        try {
            const packageJson = await this.fileSystemService.readFile(`${projectPath}/package.json`);
            const packageData = JSON.parse(packageJson);
            
            const gitInfo = await this.gitService.getRepositoryInfo(projectPath);
            const fileStats = await this.fileSystemService.getDirectoryStats(projectPath);

            return {
                name: packageData.name || 'Unknown',
                version: packageData.version || 'Unknown',
                description: packageData.description || '',
                dependencies: packageData.dependencies || {},
                devDependencies: packageData.devDependencies || {},
                scripts: packageData.scripts || {},
                git: gitInfo,
                fileStats,
                packageJson: packageData
            };
        } catch (error) {
            this.logger.warn('AnalyzeProjectHandler: Failed to get complete project info', {
                handlerId: this.handlerId,
                projectPath,
                error: error.message
            });

            // Return basic info if package.json is not available
            return {
                name: 'Unknown',
                version: 'Unknown',
                description: '',
                dependencies: {},
                devDependencies: {},
                scripts: {},
                git: null,
                fileStats: await this.fileSystemService.getDirectoryStats(projectPath),
                packageJson: null
            };
        }
    }

    /**
     * Perform comprehensive analysis
     * @param {AnalyzeProjectCommand} command - Project analysis command
     * @param {Object} projectInfo - Project information
     * @returns {Promise<Object>} Analysis result
     */
    async performComprehensiveAnalysis(command, projectInfo) {
        try {
            // Use Cursor IDE service for AI-powered comprehensive analysis
            const analysis = await this.cursorIDEService.analyzeProject({
                projectPath: command.projectPath,
                analysisType: 'comprehensive',
                options: command.options || {},
                projectInfo
            });

            // Get additional metrics from project analyzer
            const metrics = await this.projectAnalyzer.getComprehensiveMetrics(command.projectPath, {
                includePerformance: true,
                includeSecurity: true,
                includeQuality: true,
                includeArchitecture: true
            });

            // Generate recommendations
            const recommendations = await this.taskAnalysisService.generateRecommendations(analysis, metrics, projectInfo);

            return {
                analysis,
                metrics,
                recommendations,
                metadata: {
                    analysisMethod: 'ai_comprehensive',
                    metricsCount: Object.keys(metrics).length,
                    recommendationsCount: recommendations.length
                }
            };
        } catch (error) {
            throw new Error(`Comprehensive analysis failed: ${error.message}`);
        }
    }

    /**
     * Perform performance analysis
     * @param {AnalyzeProjectCommand} command - Project analysis command
     * @param {Object} projectInfo - Project information
     * @returns {Promise<Object>} Analysis result
     */
    async performPerformanceAnalysis(command, projectInfo) {
        try {
            const analysis = await this.cursorIDEService.analyzeProject({
                projectPath: command.projectPath,
                analysisType: 'performance',
                options: command.options || {},
                projectInfo
            });

            const metrics = await this.projectAnalyzer.getPerformanceMetrics(command.projectPath);
            const recommendations = await this.taskAnalysisService.generatePerformanceRecommendations(analysis, metrics);

            return {
                analysis,
                metrics,
                recommendations,
                metadata: {
                    analysisMethod: 'ai_performance',
                    performanceScore: metrics.overallScore,
                    bottlenecksCount: metrics.bottlenecks?.length || 0
                }
            };
        } catch (error) {
            throw new Error(`Performance analysis failed: ${error.message}`);
        }
    }

    /**
     * Perform security analysis
     * @param {AnalyzeProjectCommand} command - Project analysis command
     * @param {Object} projectInfo - Project information
     * @returns {Promise<Object>} Analysis result
     */
    async performSecurityAnalysis(command, projectInfo) {
        try {
            const analysis = await this.cursorIDEService.analyzeProject({
                projectPath: command.projectPath,
                analysisType: 'security',
                options: command.options || {},
                projectInfo
            });

            const metrics = await this.projectAnalyzer.getSecurityMetrics(command.projectPath);
            const recommendations = await this.taskAnalysisService.generateSecurityRecommendations(analysis, metrics);

            return {
                analysis,
                metrics,
                recommendations,
                metadata: {
                    analysisMethod: 'ai_security',
                    securityScore: metrics.securityScore,
                    vulnerabilitiesCount: metrics.vulnerabilities?.length || 0
                }
            };
        } catch (error) {
            throw new Error(`Security analysis failed: ${error.message}`);
        }
    }

    /**
     * Perform quality analysis
     * @param {AnalyzeProjectCommand} command - Project analysis command
     * @param {Object} projectInfo - Project information
     * @returns {Promise<Object>} Analysis result
     */
    async performQualityAnalysis(command, projectInfo) {
        try {
            const analysis = await this.cursorIDEService.analyzeProject({
                projectPath: command.projectPath,
                analysisType: 'quality',
                options: command.options || {},
                projectInfo
            });

            const metrics = await this.projectAnalyzer.getQualityMetrics(command.projectPath);
            const recommendations = await this.taskAnalysisService.generateQualityRecommendations(analysis, metrics);

            return {
                analysis,
                metrics,
                recommendations,
                metadata: {
                    analysisMethod: 'ai_quality',
                    qualityScore: metrics.qualityScore,
                    issuesCount: metrics.issues?.length || 0
                }
            };
        } catch (error) {
            throw new Error(`Quality analysis failed: ${error.message}`);
        }
    }

    /**
     * Perform architecture analysis
     * @param {AnalyzeProjectCommand} command - Project analysis command
     * @param {Object} projectInfo - Project information
     * @returns {Promise<Object>} Analysis result
     */
    async performArchitectureAnalysis(command, projectInfo) {
        try {
            const analysis = await this.cursorIDEService.analyzeProject({
                projectPath: command.projectPath,
                analysisType: 'architecture',
                options: command.options || {},
                projectInfo
            });

            const metrics = await this.projectAnalyzer.getArchitectureMetrics(command.projectPath);
            const recommendations = await this.taskAnalysisService.generateArchitectureRecommendations(analysis, metrics);

            return {
                analysis,
                metrics,
                recommendations,
                metadata: {
                    analysisMethod: 'ai_architecture',
                    architectureScore: metrics.architectureScore,
                    patternsCount: metrics.patterns?.length || 0
                }
            };
        } catch (error) {
            throw new Error(`Architecture analysis failed: ${error.message}`);
        }
    }

    /**
     * Perform dependencies analysis
     * @param {AnalyzeProjectCommand} command - Project analysis command
     * @param {Object} projectInfo - Project information
     * @returns {Promise<Object>} Analysis result
     */
    async performDependenciesAnalysis(command, projectInfo) {
        try {
            const analysis = await this.cursorIDEService.analyzeProject({
                projectPath: command.projectPath,
                analysisType: 'dependencies',
                options: command.options || {},
                projectInfo
            });

            const metrics = await this.projectAnalyzer.getDependenciesMetrics(command.projectPath);
            const recommendations = await this.taskAnalysisService.generateDependenciesRecommendations(analysis, metrics);

            return {
                analysis,
                metrics,
                recommendations,
                metadata: {
                    analysisMethod: 'ai_dependencies',
                    dependenciesCount: metrics.totalDependencies,
                    outdatedCount: metrics.outdatedDependencies?.length || 0
                }
            };
        } catch (error) {
            throw new Error(`Dependencies analysis failed: ${error.message}`);
        }
    }

    /**
     * Perform generic analysis
     * @param {AnalyzeProjectCommand} command - Project analysis command
     * @param {Object} projectInfo - Project information
     * @returns {Promise<Object>} Analysis result
     */
    async performGenericAnalysis(command, projectInfo) {
        try {
            const analysis = await this.taskAnalysisService.analyzeProject(command.projectPath, {
                analysisType: command.analysisType,
                options: command.options || {},
                projectInfo
            });

            return {
                analysis,
                metrics: {},
                recommendations: [],
                metadata: {
                    analysisMethod: 'generic',
                    analysisType: command.analysisType
                }
            };
        } catch (error) {
            throw new Error(`Generic analysis failed: ${error.message}`);
        }
    }

    /**
     * Get estimated time for analysis
     * @param {string} analysisType - Analysis type
     * @param {Object} options - Analysis options
     * @returns {number} Estimated time in minutes
     */
    getEstimatedTime(analysisType, options = {}) {
        const baseTimes = {
            comprehensive: 15,
            performance: 8,
            security: 10,
            quality: 6,
            architecture: 12,
            dependencies: 5
        };

        let baseTime = baseTimes[analysisType] || 10;
        
        // Adjust based on depth
        if (options.depth === 'deep') {
            baseTime *= 2;
        } else if (options.depth === 'shallow') {
            baseTime *= 0.5;
        }

        return baseTime;
    }

    /**
     * Update execution record
     * @param {TaskExecution} execution - Execution record
     * @param {Object} result - Analysis result
     * @returns {Promise<void>}
     */
    async updateExecutionRecord(execution, result) {
        try {
            await this.taskExecutionRepository.update(execution.id, {
                status: result.analysis ? 'completed' : 'failed',
                completedAt: new Date(),
                duration: result.duration,
                output: result.analysis,
                metadata: {
                    ...execution.metadata,
                    result: result.metadata,
                    metrics: result.metrics,
                    recommendations: result.recommendations,
                    warnings: result.warnings,
                    errors: result.errors
                }
            });

            this.logger.info('AnalyzeProjectHandler: Updated execution record', {
                handlerId: this.handlerId,
                executionId: execution.id,
                status: result.analysis ? 'completed' : 'failed',
                duration: result.duration
            });
        } catch (error) {
            this.logger.error('AnalyzeProjectHandler: Failed to update execution record', {
                handlerId: this.handlerId,
                executionId: execution.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Update task status
     * @param {Task} task - Analysis task
     * @param {Object} result - Analysis result
     * @returns {Promise<void>}
     */
    async updateTaskStatus(task, result) {
        try {
            if (result.analysis) {
                task.markAsCompleted();
            } else {
                task.markAsFailed();
            }

            await this.taskRepository.update(task.id, {
                status: task.status.value,
                lastExecutedAt: new Date(),
                executionCount: task.executionCount + 1
            });

            this.logger.info('AnalyzeProjectHandler: Updated task status', {
                handlerId: this.handlerId,
                taskId: task.id,
                newStatus: task.status.value,
                executionCount: task.executionCount
            });
        } catch (error) {
            this.logger.error('AnalyzeProjectHandler: Failed to update task status', {
                handlerId: this.handlerId,
                taskId: task.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Publish analysis started event
     * @param {TaskExecution} execution - Execution record
     * @param {AnalyzeProjectCommand} command - Project analysis command
     * @returns {Promise<void>}
     */
    async publishAnalysisStartedEvent(execution, command) {
        try {
            await this.eventBus.publish('project.analysis.started', {
                executionId: execution.id,
                taskId: execution.taskId,
                projectPath: command.projectPath,
                analysisType: command.analysisType,
                startedAt: execution.startedAt,
                requestedBy: command.requestedBy,
                commandId: command.commandId
            });
        } catch (error) {
            this.logger.warn('AnalyzeProjectHandler: Failed to publish analysis started event', {
                handlerId: this.handlerId,
                executionId: execution.id,
                error: error.message
            });
        }
    }

    /**
     * Publish analysis completed event
     * @param {TaskExecution} execution - Execution record
     * @param {Object} result - Analysis result
     * @param {AnalyzeProjectCommand} command - Project analysis command
     * @returns {Promise<void>}
     */
    async publishAnalysisCompletedEvent(execution, result, command) {
        try {
            await this.eventBus.publish('project.analysis.completed', {
                executionId: execution.id,
                taskId: execution.taskId,
                projectPath: command.projectPath,
                analysisType: command.analysisType,
                status: result.analysis ? 'completed' : 'failed',
                completedAt: new Date(),
                duration: result.duration,
                requestedBy: command.requestedBy,
                commandId: command.commandId,
                metrics: result.metrics,
                recommendationsCount: result.recommendations?.length || 0,
                warnings: result.warnings,
                errors: result.errors
            });
        } catch (error) {
            this.logger.warn('AnalyzeProjectHandler: Failed to publish analysis completed event', {
                handlerId: this.handlerId,
                executionId: execution.id,
                error: error.message
            });
        }
    }

    /**
     * Handle analysis error
     * @param {Error} error - Analysis error
     * @param {AnalyzeProjectCommand} command - Project analysis command
     * @returns {Promise<void>}
     */
    async handleAnalysisError(error, command) {
        this.logger.error('AnalyzeProjectHandler: Project analysis failed', {
            handlerId: this.handlerId,
            commandId: command.commandId,
            projectPath: command.projectPath,
            analysisType: command.analysisType,
            error: error.message,
            stack: error.stack
        });

        try {
            await this.eventBus.publish('project.analysis.failed', {
                projectPath: command.projectPath,
                analysisType: command.analysisType,
                commandId: command.commandId,
                error: error.message,
                errorType: error.constructor.name,
                timestamp: new Date(),
                requestedBy: command.requestedBy
            });
        } catch (eventError) {
            this.logger.warn('AnalyzeProjectHandler: Failed to publish analysis failed event', {
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
            type: 'AnalyzeProjectHandler',
            supportedCommands: ['AnalyzeProjectCommand'],
            supportedAnalysisTypes: ['comprehensive', 'performance', 'security', 'quality', 'architecture', 'dependencies'],
            dependencies: [
                'taskAnalysisService',
                'projectAnalyzer',
                'cursorIDEService',
                'taskRepository',
                'taskExecutionRepository',
                'eventBus',
                'logger'
            ]
        };
    }
}

module.exports = AnalyzeProjectHandler; 