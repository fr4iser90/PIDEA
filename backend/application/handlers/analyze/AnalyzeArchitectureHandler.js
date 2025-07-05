/**
 * AnalyzeArchitectureHandler - Handles architecture analysis commands
 * Implements the Command Handler pattern for architecture analysis
 */
class AnalyzeArchitectureHandler {
    constructor(dependencies = {}) {
        this.validateDependencies(dependencies);
        
        this.architectureAnalyzer = dependencies.architectureAnalyzer;
        this.cursorIDEService = dependencies.cursorIDEService;
        this.taskRepository = dependencies.taskRepository;
        this.eventBus = dependencies.eventBus;
        this.logger = dependencies.logger;
        this.fileSystemService = dependencies.fileSystemService;
        
        this.handlerId = this.generateHandlerId();
    }

    validateDependencies(dependencies) {
        const required = [
            'architectureAnalyzer',
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

    generateHandlerId() {
        return `analyze_architecture_handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async handle(command) {
        try {
            this.logger.info('AnalyzeArchitectureHandler: Starting architecture analysis', {
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

            this.logger.info('AnalyzeArchitectureHandler: Architecture analysis completed successfully', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
                executionId: execution.id,
                duration: result.duration
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

    async validateCommand(command) {
        const errors = [];
        const warnings = [];

        if (!command.projectPath) {
            errors.push('Project path is required');
        }

        if (!command.requestedBy) {
            errors.push('Requested by is required');
        }

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

        } catch (error) {
            this.logger.error('AnalyzeArchitectureHandler: Project path validation failed', {
                handlerId: this.handlerId,
                projectPath,
                error: error.message
            });
            throw error;
        }
    }

    async createAnalysisTask(command) {
        const task = {
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'analyze_architecture',
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

        return execution;
    }

    async performAnalysis(command, execution) {
        const startTime = Date.now();
        
        try {
            this.logger.info('AnalyzeArchitectureHandler: Performing architecture analysis', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath
            });

            const projectInfo = await this.getProjectInfo(command.projectPath);
            const analysis = await this.performArchitectureAnalysis(command, projectInfo);
            const metrics = this.generateMetrics(analysis);
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
            this.logger.error('AnalyzeArchitectureHandler: Architecture analysis failed', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
                duration,
                error: error.message
            });
            throw error;
        }
    }

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
            this.logger.error('AnalyzeArchitectureHandler: Failed to get project info', {
                handlerId: this.handlerId,
                projectPath,
                error: error.message
            });
            throw error;
        }
    }

    async performArchitectureAnalysis(command, projectInfo) {
        const options = command.getAnalysisOptions();
        
        try {
            const architecture = await this.architectureAnalyzer.analyze(
                projectInfo.path,
                {
                    detectPatterns: options.detectPatterns,
                    analyzeDependencies: options.analyzeDependencies,
                    complexityAnalysis: options.complexityAnalysis,
                    detectLayers: options.detectLayers,
                    detectModules: options.detectModules,
                    analyzeCoupling: options.analyzeCoupling,
                    analyzeCohesion: options.analyzeCohesion,
                    detectAntiPatterns: options.detectAntiPatterns,
                    analyzeDesignPrinciples: options.analyzeDesignPrinciples
                }
            );

            return {
                projectInfo,
                architecture,
                patterns: architecture.patterns || [],
                layers: architecture.layers || [],
                modules: architecture.modules || [],
                coupling: architecture.coupling || {},
                cohesion: architecture.cohesion || {},
                antiPatterns: architecture.antiPatterns || [],
                designPrinciples: architecture.designPrinciples || [],
                analysisOptions: options,
                timestamp: new Date()
            };

        } catch (error) {
            this.logger.error('AnalyzeArchitectureHandler: Architecture analysis failed', {
                handlerId: this.handlerId,
                projectPath: projectInfo.path,
                error: error.message
            });
            throw error;
        }
    }

    generateMetrics(analysis) {
        const { architecture } = analysis;
        
        return {
            patternCount: architecture.patterns?.length || 0,
            layerCount: architecture.layers?.length || 0,
            moduleCount: architecture.modules?.length || 0,
            antiPatternCount: architecture.antiPatterns?.length || 0,
            designPrincipleCount: architecture.designPrinciples?.length || 0,
            averageCoupling: this.calculateAverageCoupling(architecture.coupling),
            averageCohesion: this.calculateAverageCohesion(architecture.cohesion),
            complexityScore: this.calculateComplexityScore(architecture)
        };
    }

    calculateAverageCoupling(coupling) {
        if (!coupling || Object.keys(coupling).length === 0) return 0;
        const values = Object.values(coupling);
        return values.reduce((a, b) => a + b, 0) / values.length;
    }

    calculateAverageCohesion(cohesion) {
        if (!cohesion || Object.keys(cohesion).length === 0) return 0;
        const values = Object.values(cohesion);
        return values.reduce((a, b) => a + b, 0) / values.length;
    }

    calculateComplexityScore(architecture) {
        let score = 0;
        
        if (architecture.patterns) score += architecture.patterns.length * 10;
        if (architecture.layers) score += architecture.layers.length * 5;
        if (architecture.modules) score += architecture.modules.length * 3;
        if (architecture.antiPatterns) score += architecture.antiPatterns.length * -15;
        
        return Math.max(0, score);
    }

    generateRecommendations(analysis, command) {
        const recommendations = [];
        const { architecture, metrics } = analysis;

        // Check for anti-patterns
        if (architecture.antiPatterns && architecture.antiPatterns.length > 0) {
            recommendations.push({
                type: 'anti_patterns',
                severity: 'high',
                message: `Found ${architecture.antiPatterns.length} architectural anti-pattern(s)`,
                details: architecture.antiPatterns
            });
        }

        // Check coupling
        if (metrics && metrics.averageCoupling > 0.7) {
            recommendations.push({
                type: 'high_coupling',
                severity: 'medium',
                message: 'High coupling detected',
                details: { averageCoupling: metrics.averageCoupling, recommendation: 'Consider reducing dependencies between modules' }
            });
        }

        // Check cohesion
        if (metrics && metrics.averageCohesion < 0.3) {
            recommendations.push({
                type: 'low_cohesion',
                severity: 'medium',
                message: 'Low cohesion detected',
                details: { averageCohesion: metrics.averageCohesion, recommendation: 'Consider grouping related functionality together' }
            });
        }

        return recommendations;
    }

    getEstimatedTime(command) {
        const options = command.getAnalysisOptions();
        
        let estimatedTime = 60000; // Base time: 1 minute
        
        if (options.detectPatterns) estimatedTime += 30000;
        if (options.analyzeDependencies) estimatedTime += 45000;
        if (options.complexityAnalysis) estimatedTime += 30000;
        if (options.detectLayers) estimatedTime += 20000;
        if (options.detectModules) estimatedTime += 25000;
        if (options.analyzeCoupling) estimatedTime += 30000;
        if (options.analyzeCohesion) estimatedTime += 30000;
        if (options.detectAntiPatterns) estimatedTime += 20000;
        if (options.analyzeDesignPrinciples) estimatedTime += 15000;
        
        return Math.min(estimatedTime, 300000); // Max 5 minutes
    }

    async updateExecutionRecord(execution, result) {
        execution.status = 'completed';
        execution.completedAt = new Date();
        execution.duration = result.duration;
        execution.result = result;
        
        this.logger.info('AnalyzeArchitectureHandler: Execution record updated', {
            handlerId: this.handlerId,
            executionId: execution.id,
            status: execution.status,
            duration: execution.duration
        });
    }

    async updateTaskStatus(task, result) {
        task.status = 'completed';
        task.updatedAt = new Date();
        task.result = result;
        
        await this.taskRepository.update(task.id, task);
    }

    async publishAnalysisStartedEvent(execution, command) {
        await this.eventBus.publish('analysis.started', {
            type: 'architecture_analysis',
            executionId: execution.id,
            commandId: command.commandId,
            projectPath: command.projectPath,
            requestedBy: command.requestedBy,
            timestamp: new Date()
        });
    }

    async publishAnalysisCompletedEvent(execution, result, command) {
        await this.eventBus.publish('analysis.completed', {
            type: 'architecture_analysis',
            executionId: execution.id,
            commandId: command.commandId,
            projectPath: command.projectPath,
            requestedBy: command.requestedBy,
            result: result,
            timestamp: new Date()
        });
    }

    async handleAnalysisError(error, command) {
        this.logger.error('AnalyzeArchitectureHandler: Analysis failed', {
            handlerId: this.handlerId,
            commandId: command.commandId,
            projectPath: command.projectPath,
            error: error.message,
            stack: error.stack
        });

        await this.eventBus.publish('analysis.failed', {
            type: 'architecture_analysis',
            commandId: command.commandId,
            projectPath: command.projectPath,
            requestedBy: command.requestedBy,
            error: error.message,
            timestamp: new Date()
        });
    }

    getMetadata() {
        return {
            handlerId: this.handlerId,
            type: 'AnalyzeArchitectureHandler',
            version: '1.0.0',
            supportedCommands: ['AnalyzeArchitectureCommand'],
            capabilities: ['architecture_analysis', 'pattern_detection', 'complexity_analysis']
        };
    }
}

module.exports = AnalyzeArchitectureHandler; 