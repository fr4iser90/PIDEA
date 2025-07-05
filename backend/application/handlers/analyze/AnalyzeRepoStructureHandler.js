/**
 * AnalyzeRepoStructureHandler - Handles repository structure analysis commands
 * Implements the Command Handler pattern for repository structure analysis
 */
class AnalyzeRepoStructureHandler {
    constructor(dependencies = {}) {
        this.validateDependencies(dependencies);
        
        this.projectAnalyzer = dependencies.projectAnalyzer;
        this.cursorIDEService = dependencies.cursorIDEService;
        this.taskRepository = dependencies.taskRepository;
        this.eventBus = dependencies.eventBus;
        this.logger = dependencies.logger;
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
        return `analyze_repo_structure_handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Handle AnalyzeRepoStructureCommand
     * @param {AnalyzeRepoStructureCommand} command - Repository structure analysis command
     * @returns {Promise<Object>} Analysis result
     */
    async handle(command) {
        try {
            this.logger.info('AnalyzeRepoStructureHandler: Starting repository structure analysis', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
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
            this.logger.info('AnalyzeRepoStructureHandler: Repository structure analysis completed successfully', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
                executionId: execution.id,
                duration: result.duration,
                fileCount: result.analysis.fileCount,
                directoryCount: result.analysis.directoryCount
            });

            return {
                success: true,
                analysisId: execution.id,
                taskId: task.id,
                projectPath: command.projectPath,
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
     * @param {AnalyzeRepoStructureCommand} command - Repository structure analysis command
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

        // Validate options
        if (command.options) {
            if (command.options.maxDepth && (typeof command.options.maxDepth !== 'number' || command.options.maxDepth < 1)) {
                errors.push('Max depth must be a positive number');
            }

            if (command.options.timeout && (typeof command.options.timeout !== 'number' || command.options.timeout < 1000)) {
                errors.push('Timeout must be at least 1000ms');
            }

            if (command.options.fileTypes && !Array.isArray(command.options.fileTypes)) {
                errors.push('File types must be an array');
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

            const isReadable = await this.fileSystemService.isReadable(projectPath);
            if (!isReadable) {
                throw new Error(`Project path is not readable: ${projectPath}`);
            }

        } catch (error) {
            this.logger.error('AnalyzeRepoStructureHandler: Project path validation failed', {
                handlerId: this.handlerId,
                projectPath,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Create analysis task
     * @param {AnalyzeRepoStructureCommand} command - Repository structure analysis command
     * @returns {Promise<Object>} Created task
     */
    async createAnalysisTask(command) {
        const task = {
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'analyze_repo_structure',
            status: 'pending',
            projectPath: command.projectPath,
            requestedBy: command.requestedBy,
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {
                commandId: command.commandId,
                analysisOptions: command.getAnalysisOptions(),
                outputConfiguration: command.getOutputConfiguration()
            }
        };

        await this.taskRepository.create(task);
        return task;
    }

    /**
     * Create execution record
     * @param {Object} task - Analysis task
     * @param {AnalyzeRepoStructureCommand} command - Repository structure analysis command
     * @returns {Promise<Object>} Created execution record
     */
    async createExecutionRecord(task, command) {
        const execution = {
            id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            taskId: task.id,
            commandId: command.commandId,
            status: 'running',
            startedAt: new Date(),
            estimatedDuration: this.getEstimatedTime(command),
            metadata: command.getMetadata()
        };

        // Store execution record (assuming we have a repository for this)
        // For now, we'll return the execution object
        return execution;
    }

    /**
     * Perform repository structure analysis
     * @param {AnalyzeRepoStructureCommand} command - Repository structure analysis command
     * @param {Object} execution - Execution record
     * @returns {Promise<Object>} Analysis result
     */
    async performAnalysis(command, execution) {
        const startTime = Date.now();
        
        try {
            this.logger.info('AnalyzeRepoStructureHandler: Performing repository structure analysis', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath
            });

            // Get project information
            const projectInfo = await this.getProjectInfo(command.projectPath);

            // Perform repository structure analysis
            const analysis = await this.performRepoStructureAnalysis(command, projectInfo);

            // Generate metrics
            const metrics = this.generateMetrics(analysis);

            // Generate recommendations
            const recommendations = this.generateRecommendations(analysis, command);

            const duration = Date.now() - startTime;

            return {
                analysis,
                metrics,
                recommendations,
                duration,
                metadata: {
                    handlerId: this.handlerId,
                    executionId: execution.id,
                    projectPath: command.projectPath,
                    analysisOptions: command.getAnalysisOptions(),
                    outputConfiguration: command.getOutputConfiguration()
                },
                warnings: [],
                errors: []
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error('AnalyzeRepoStructureHandler: Repository structure analysis failed', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
                duration,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get project information
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Project information
     */
    async getProjectInfo(projectPath) {
        try {
            const stats = await this.fileSystemService.getStats(projectPath);
            const files = await this.fileSystemService.readDirectory(projectPath);
            
            return {
                path: projectPath,
                name: projectPath.split('/').pop(),
                size: stats.size,
                fileCount: files.length,
                lastModified: stats.mtime,
                isDirectory: stats.isDirectory === true
            };
        } catch (error) {
            this.logger.error('AnalyzeRepoStructureHandler: Failed to get project info', {
                handlerId: this.handlerId,
                projectPath,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Perform repository structure analysis
     * @param {AnalyzeRepoStructureCommand} command - Repository structure analysis command
     * @param {Object} projectInfo - Project information
     * @returns {Promise<Object>} Analysis result
     */
    async performRepoStructureAnalysis(command, projectInfo) {
        const options = command.getAnalysisOptions();
        
        try {
            // Use project analyzer to analyze repository structure
            let structure = await this.projectAnalyzer.analyzeStructure(
                projectInfo.path,
                {
                    includeHidden: options.includeHidden,
                    maxDepth: options.maxDepth,
                    fileTypes: options.fileTypes,
                    excludePatterns: options.excludePatterns,
                    includeStats: options.includeStats
                }
            );

            // Patch: convert files/dirs to objects if needed
            if (structure.files && typeof structure.files[0] === 'string') {
                structure.files = structure.files.map(f => ({ path: f, size: 0, extension: f.split('.').pop() }));
            }
            if (structure.directories && typeof structure.directories[0] === 'string') {
                structure.directories = structure.directories.map(d => ({ path: d, size: 0, fileCount: 0 }));
            }

            return {
                projectInfo,
                structure,
                fileCount: structure.files.length,
                directoryCount: structure.directories.length,
                totalSize: structure.totalSize,
                analysisOptions: options,
                timestamp: new Date()
            };

        } catch (error) {
            this.logger.error('AnalyzeRepoStructureHandler: Repository structure analysis failed', {
                handlerId: this.handlerId,
                projectPath: projectInfo.path,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Generate metrics from analysis
     * @param {Object} analysis - Analysis result
     * @returns {Object} Generated metrics
     */
    generateMetrics(analysis) {
        const { structure } = analysis;
        
        const fileTypes = {};
        const directorySizes = {};
        const fileSizes = [];

        // Analyze file types
        structure.files.forEach(file => {
            const ext = file.extension || 'unknown';
            fileTypes[ext] = (fileTypes[ext] || 0) + 1;
            if (file.size) {
                fileSizes.push(file.size);
            }
        });

        // Analyze directory sizes
        structure.directories.forEach(dir => {
            if (dir.size) {
                directorySizes[dir.path] = dir.size;
            }
        });

        return {
            totalFiles: structure.files.length,
            totalDirectories: structure.directories ? structure.directories.length : 0,
            totalSize: structure.totalSize,
            fileTypeDistribution: fileTypes,
            averageFileSize: fileSizes.length > 0 ? fileSizes.reduce((a, b) => a + b, 0) / fileSizes.length : 0,
            maxFileSize: fileSizes.length > 0 ? Math.max(...fileSizes) : 0,
            minFileSize: fileSizes.length > 0 ? Math.min(...fileSizes) : 0,
            directorySizeDistribution: directorySizes,
            depthDistribution: structure.directories ? this.calculateDepthDistribution(structure.directories) : {}
        };
    }

    /**
     * Calculate depth distribution
     * @param {Array} directories - Directory list
     * @returns {Object} Depth distribution
     */
    calculateDepthDistribution(directories) {
        const distribution = {};
        
        directories.forEach(dir => {
            const depth = (dir.path || dir).split('/').length - 1;
            distribution[depth] = (distribution[depth] || 0) + 1;
        });

        return distribution;
    }

    /**
     * Generate recommendations from analysis
     * @param {Object} analysis - Analysis result
     * @param {AnalyzeRepoStructureCommand} command - Command
     * @returns {Array} Generated recommendations
     */
    generateRecommendations(analysis, command) {
        const recommendations = [];
        const { structure, metrics } = analysis;

        // Check for large files
        const largeFiles = structure.files.filter(file => file.size > 1024 * 1024); // 1MB
        if (largeFiles.length > 0) {
            recommendations.push({
                type: 'large_files',
                severity: 'medium',
                message: `Found ${largeFiles.length} large files (>1MB)`,
                details: largeFiles.map(f => ({ path: f.path, size: f.size }))
            });
        }

        // Check for deep directory structure
        if (metrics && metrics.depthDistribution && Object.keys(metrics.depthDistribution).length > 0) {
            const maxDepth = Math.max(...Object.keys(metrics.depthDistribution).map(Number));
            if (maxDepth > 8) {
                recommendations.push({
                    type: 'deep_structure',
                    severity: 'low',
                    message: `Directory structure is very deep (${maxDepth} levels)`,
                    details: { maxDepth, recommendation: 'Consider flattening the structure' }
                });
            }
        }

        // Check for many files in single directory
        const directoriesWithManyFiles = structure.directories.filter(dir => dir.fileCount > 100);
        if (directoriesWithManyFiles.length > 0) {
            recommendations.push({
                type: 'many_files',
                severity: 'medium',
                message: `Found ${directoriesWithManyFiles.length} directories with many files (>100)`,
                details: directoriesWithManyFiles.map(d => ({ path: d.path, fileCount: d.fileCount }))
            });
        }

        return recommendations;
    }

    /**
     * Get estimated analysis time
     * @param {AnalyzeRepoStructureCommand} command - Command
     * @returns {number} Estimated time in milliseconds
     */
    getEstimatedTime(command) {
        const options = command.getAnalysisOptions();
        
        // Base time: 30 seconds
        let estimatedTime = 30000;
        
        // Add time based on max depth
        estimatedTime += options.maxDepth * 2000;
        
        // Add time if including hidden files
        if (options.includeHidden) {
            estimatedTime += 10000;
        }
        
        // Add time if including dependencies
        if (options.includeDependencies) {
            estimatedTime += 15000;
        }
        
        return Math.min(estimatedTime, 300000); // Max 5 minutes
    }

    /**
     * Update execution record
     * @param {Object} execution - Execution record
     * @param {Object} result - Analysis result
     * @returns {Promise<void>}
     */
    async updateExecutionRecord(execution, result) {
        execution.status = 'completed';
        execution.completedAt = new Date();
        execution.duration = result.duration;
        execution.result = result;
        
        // Update execution record in repository
        // For now, we'll just log the update
        this.logger.info('AnalyzeRepoStructureHandler: Execution record updated', {
            handlerId: this.handlerId,
            executionId: execution.id,
            status: execution.status,
            duration: execution.duration
        });
    }

    /**
     * Update task status
     * @param {Object} task - Analysis task
     * @param {Object} result - Analysis result
     * @returns {Promise<void>}
     */
    async updateTaskStatus(task, result) {
        task.status = 'completed';
        task.updatedAt = new Date();
        task.result = result;
        
        await this.taskRepository.update(task.id, task);
    }

    /**
     * Publish analysis started event
     * @param {Object} execution - Execution record
     * @param {AnalyzeRepoStructureCommand} command - Command
     * @returns {Promise<void>}
     */
    async publishAnalysisStartedEvent(execution, command) {
        await this.eventBus.publish('analysis.started', {
            type: 'repo_structure_analysis',
            executionId: execution.id,
            commandId: command.commandId,
            projectPath: command.projectPath,
            requestedBy: command.requestedBy,
            timestamp: new Date()
        });
    }

    /**
     * Publish analysis completed event
     * @param {Object} execution - Execution record
     * @param {Object} result - Analysis result
     * @param {AnalyzeRepoStructureCommand} command - Command
     * @returns {Promise<void>}
     */
    async publishAnalysisCompletedEvent(execution, result, command) {
        await this.eventBus.publish('analysis.completed', {
            type: 'repo_structure_analysis',
            executionId: execution.id,
            commandId: command.commandId,
            projectPath: command.projectPath,
            requestedBy: command.requestedBy,
            result: result,
            timestamp: new Date()
        });
    }

    /**
     * Handle analysis error
     * @param {Error} error - Error object
     * @param {AnalyzeRepoStructureCommand} command - Command
     * @returns {Promise<void>}
     */
    async handleAnalysisError(error, command) {
        this.logger.error('AnalyzeRepoStructureHandler: Analysis failed', {
            handlerId: this.handlerId,
            commandId: command.commandId,
            projectPath: command.projectPath,
            error: error.message,
            stack: error.stack
        });

        // Publish error event
        await this.eventBus.publish('analysis.failed', {
            type: 'repo_structure_analysis',
            commandId: command.commandId,
            projectPath: command.projectPath,
            requestedBy: command.requestedBy,
            error: error.message,
            timestamp: new Date()
        });
    }

    /**
     * Get handler metadata
     * @returns {Object} Handler metadata
     */
    getMetadata() {
        return {
            handlerId: this.handlerId,
            type: 'AnalyzeRepoStructureHandler',
            version: '1.0.0',
            supportedCommands: ['AnalyzeRepoStructureCommand'],
            capabilities: ['repository_structure_analysis', 'file_analysis', 'directory_analysis']
        };
    }
}

module.exports = AnalyzeRepoStructureHandler; 