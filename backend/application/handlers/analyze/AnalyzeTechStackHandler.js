/**
 * AnalyzeTechStackHandler - Handles tech stack analysis commands
 * Implements the Command Handler pattern for tech stack analysis
 */
class AnalyzeTechStackHandler {
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

    generateHandlerId() {
        return `analyze_tech_stack_handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async handle(command) {
        try {
            this.logger.info('AnalyzeTechStackHandler: Starting tech stack analysis', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
                requestedBy: command.requestedBy
            });

            const validationResult = await this.validateCommand(command);
            if (!validationResult.isValid) {
                throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
            }

            await this.validateProjectPath(command.projectPath);
            const task = await this.createAnalysisTask(command);
            const execution = await this.createExecutionRecord(task, command);
            await this.publishAnalysisStartedEvent(execution, command);
            const result = await this.performAnalysis(command, execution);
            await this.updateExecutionRecord(execution, result);
            await this.updateTaskStatus(task, result);
            await this.publishAnalysisCompletedEvent(execution, result, command);

            this.logger.info('AnalyzeTechStackHandler: Tech stack analysis completed successfully', {
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
            this.logger.error('AnalyzeTechStackHandler: Project path validation failed', {
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
            type: 'analyze_tech_stack',
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
            this.logger.info('AnalyzeTechStackHandler: Performing tech stack analysis', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath
            });

            const projectInfo = await this.getProjectInfo(command.projectPath);
            const analysis = await this.performTechStackAnalysis(command, projectInfo);
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
            this.logger.error('AnalyzeTechStackHandler: Tech stack analysis failed', {
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
                isDirectory: stats.isDirectory()
            };
        } catch (error) {
            this.logger.error('AnalyzeTechStackHandler: Failed to get project info', {
                handlerId: this.handlerId,
                projectPath,
                error: error.message
            });
            throw error;
        }
    }

    async performTechStackAnalysis(command, projectInfo) {
        const options = command.getAnalysisOptions();
        
        try {
            const techStack = await this.projectAnalyzer.analyzeTechStack(
                projectInfo.path,
                {
                    detectFrameworks: options.detectFrameworks,
                    detectLibraries: options.detectLibraries,
                    detectTools: options.detectTools,
                    analyzeVersions: options.analyzeVersions,
                    checkCompatibility: options.checkCompatibility,
                    detectBuildTools: options.detectBuildTools,
                    detectTestingFrameworks: options.detectTestingFrameworks,
                    detectLintingTools: options.detectLintingTools
                }
            );

            return {
                projectInfo,
                techStack,
                frameworks: techStack.frameworks || [],
                libraries: techStack.libraries || [],
                tools: techStack.tools || [],
                versions: techStack.versions || {},
                compatibility: techStack.compatibility || {},
                buildTools: techStack.buildTools || [],
                testingFrameworks: techStack.testingFrameworks || [],
                lintingTools: techStack.lintingTools || [],
                analysisOptions: options,
                timestamp: new Date()
            };

        } catch (error) {
            this.logger.error('AnalyzeTechStackHandler: Tech stack analysis failed', {
                handlerId: this.handlerId,
                projectPath: projectInfo.path,
                error: error.message
            });
            throw error;
        }
    }

    generateMetrics(analysis) {
        const { techStack } = analysis;
        
        return {
            frameworkCount: techStack.frameworks?.length || 0,
            libraryCount: techStack.libraries?.length || 0,
            toolCount: techStack.tools?.length || 0,
            buildToolCount: techStack.buildTools?.length || 0,
            testingFrameworkCount: techStack.testingFrameworks?.length || 0,
            lintingToolCount: techStack.lintingTools?.length || 0,
            totalDependencies: (techStack.frameworks?.length || 0) + (techStack.libraries?.length || 0),
            averageVersionAge: this.calculateAverageVersionAge(techStack.versions),
            compatibilityScore: this.calculateCompatibilityScore(techStack.compatibility)
        };
    }

    calculateAverageVersionAge(versions) {
        if (!versions || Object.keys(versions).length === 0) return 0;
        
        const now = new Date();
        const ages = Object.values(versions).map(version => {
            if (version.releaseDate) {
                return (now - new Date(version.releaseDate)) / (1000 * 60 * 60 * 24); // days
            }
            return 0;
        });
        
        return ages.reduce((a, b) => a + b, 0) / ages.length;
    }

    calculateCompatibilityScore(compatibility) {
        if (!compatibility || Object.keys(compatibility).length === 0) return 100;
        
        const scores = Object.values(compatibility).map(comp => comp.score || 100);
        return scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    generateRecommendations(analysis, command) {
        const recommendations = [];
        const { techStack, metrics } = analysis;

        // Check for outdated versions
        if (metrics.averageVersionAge > 365) { // 1 year
            recommendations.push({
                type: 'outdated_versions',
                severity: 'medium',
                message: 'Some dependencies are outdated',
                details: { averageVersionAge: metrics.averageVersionAge, recommendation: 'Consider updating dependencies' }
            });
        }

        // Check for compatibility issues
        if (metrics.compatibilityScore < 80) {
            recommendations.push({
                type: 'compatibility_issues',
                severity: 'high',
                message: 'Compatibility issues detected',
                details: { compatibilityScore: metrics.compatibilityScore, recommendation: 'Review dependency compatibility' }
            });
        }

        // Check for missing testing frameworks
        if (metrics.testingFrameworkCount === 0) {
            recommendations.push({
                type: 'missing_testing',
                severity: 'medium',
                message: 'No testing frameworks detected',
                details: { recommendation: 'Consider adding a testing framework' }
            });
        }

        // Check for missing linting tools
        if (metrics.lintingToolCount === 0) {
            recommendations.push({
                type: 'missing_linting',
                severity: 'low',
                message: 'No linting tools detected',
                details: { recommendation: 'Consider adding a linting tool for code quality' }
            });
        }

        return recommendations;
    }

    getEstimatedTime(command) {
        const options = command.getAnalysisOptions();
        
        let estimatedTime = 30000; // Base time: 30 seconds
        
        if (options.detectFrameworks) estimatedTime += 15000;
        if (options.detectLibraries) estimatedTime += 20000;
        if (options.detectTools) estimatedTime += 10000;
        if (options.analyzeVersions) estimatedTime += 15000;
        if (options.checkCompatibility) estimatedTime += 20000;
        if (options.detectBuildTools) estimatedTime += 10000;
        if (options.detectTestingFrameworks) estimatedTime += 10000;
        if (options.detectLintingTools) estimatedTime += 10000;
        
        return Math.min(estimatedTime, 120000); // Max 2 minutes
    }

    async updateExecutionRecord(execution, result) {
        execution.status = 'completed';
        execution.completedAt = new Date();
        execution.duration = result.duration;
        execution.result = result;
        
        this.logger.info('AnalyzeTechStackHandler: Execution record updated', {
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
            type: 'tech_stack_analysis',
            executionId: execution.id,
            commandId: command.commandId,
            projectPath: command.projectPath,
            requestedBy: command.requestedBy,
            timestamp: new Date()
        });
    }

    async publishAnalysisCompletedEvent(execution, result, command) {
        await this.eventBus.publish('analysis.completed', {
            type: 'tech_stack_analysis',
            executionId: execution.id,
            commandId: command.commandId,
            projectPath: command.projectPath,
            requestedBy: command.requestedBy,
            result: result,
            timestamp: new Date()
        });
    }

    async handleAnalysisError(error, command) {
        this.logger.error('AnalyzeTechStackHandler: Analysis failed', {
            handlerId: this.handlerId,
            commandId: command.commandId,
            projectPath: command.projectPath,
            error: error.message,
            stack: error.stack
        });

        await this.eventBus.publish('analysis.failed', {
            type: 'tech_stack_analysis',
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
            type: 'AnalyzeTechStackHandler',
            version: '1.0.0',
            supportedCommands: ['AnalyzeTechStackCommand'],
            capabilities: ['tech_stack_analysis', 'framework_detection', 'dependency_analysis']
        };
    }
}

module.exports = AnalyzeTechStackHandler; 