/**
 * AnalyzeCodeQualityHandler - Handles code quality analysis commands
 * Implements the Command Handler pattern for code quality analysis
 */
class AnalyzeCodeQualityHandler {
    constructor(dependencies = {}) {
        this.validateDependencies(dependencies);
        
        this.codeQualityAnalyzer = dependencies.codeQualityAnalyzer;
        this.cursorIDEService = dependencies.cursorIDEService;
        this.taskRepository = dependencies.taskRepository;
        this.eventBus = dependencies.eventBus;
        this.logger = dependencies.logger;
        this.fileSystemService = dependencies.fileSystemService;
        
        this.handlerId = this.generateHandlerId();
    }

    validateDependencies(dependencies) {
        const required = [
            'codeQualityAnalyzer',
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
        return `analyze_code_quality_handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async handle(command) {
        try {
            this.logger.info('AnalyzeCodeQualityHandler: Starting code quality analysis', {
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

            this.logger.info('AnalyzeCodeQualityHandler: Code quality analysis completed successfully', {
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
            this.logger.error('AnalyzeCodeQualityHandler: Project path validation failed', {
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
            type: 'analyze_code_quality',
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
            this.logger.info('AnalyzeCodeQualityHandler: Performing code quality analysis', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath
            });

            const projectInfo = await this.getProjectInfo(command.projectPath);
            const analysis = await this.performCodeQualityAnalysis(command, projectInfo);
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
            this.logger.error('AnalyzeCodeQualityHandler: Code quality analysis failed', {
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
            this.logger.error('AnalyzeCodeQualityHandler: Failed to get project info', {
                handlerId: this.handlerId,
                projectPath,
                error: error.message
            });
            throw error;
        }
    }

    async performCodeQualityAnalysis(command, projectInfo) {
        const options = command.getAnalysisOptions();
        
        try {
            const qualityAnalysis = await this.codeQualityAnalyzer.analyze(
                projectInfo.path,
                {
                    linting: options.linting,
                    complexity: options.complexity,
                    maintainability: options.maintainability,
                    testCoverage: options.testCoverage,
                    codeDuplication: options.codeDuplication,
                    codeStyle: options.codeStyle,
                    documentation: options.documentation,
                    performance: options.performance
                }
            );

            return {
                projectInfo,
                qualityAnalysis,
                lintingResults: qualityAnalysis.lintingResults || [],
                complexityMetrics: qualityAnalysis.complexityMetrics || {},
                maintainabilityIndex: qualityAnalysis.maintainabilityIndex || 0,
                testCoverage: qualityAnalysis.testCoverage || 0,
                codeDuplication: qualityAnalysis.codeDuplication || {},
                codeStyleIssues: qualityAnalysis.codeStyleIssues || [],
                documentationCoverage: qualityAnalysis.documentationCoverage || 0,
                performanceIssues: qualityAnalysis.performanceIssues || [],
                analysisOptions: options,
                timestamp: new Date()
            };

        } catch (error) {
            this.logger.error('AnalyzeCodeQualityHandler: Code quality analysis failed', {
                handlerId: this.handlerId,
                projectPath: projectInfo.path,
                error: error.message
            });
            throw error;
        }
    }

    generateMetrics(analysis) {
        const { qualityAnalysis } = analysis;
        
        return {
            lintingIssues: qualityAnalysis.lintingResults?.length || 0,
            averageComplexity: this.calculateAverageComplexity(qualityAnalysis.complexityMetrics),
            maintainabilityIndex: qualityAnalysis.maintainabilityIndex || 0,
            testCoverage: qualityAnalysis.testCoverage || 0,
            codeDuplicationPercentage: this.calculateDuplicationPercentage(qualityAnalysis.codeDuplication),
            codeStyleIssues: qualityAnalysis.codeStyleIssues?.length || 0,
            documentationCoverage: qualityAnalysis.documentationCoverage || 0,
            performanceIssues: qualityAnalysis.performanceIssues?.length || 0,
            overallQualityScore: this.calculateOverallQualityScore(analysis)
        };
    }

    calculateAverageComplexity(complexityMetrics) {
        if (!complexityMetrics || Object.keys(complexityMetrics).length === 0) return 0;
        
        const values = Object.values(complexityMetrics);
        return values.reduce((a, b) => a + b, 0) / values.length;
    }

    calculateDuplicationPercentage(codeDuplication) {
        if (!codeDuplication || !codeDuplication.totalLines) return 0;
        return (codeDuplication.duplicatedLines / codeDuplication.totalLines) * 100;
    }

    calculateOverallQualityScore(analysis) {
        let score = 100;
        const { qualityAnalysis } = analysis;

        // Deduct points for issues
        if (qualityAnalysis.lintingResults) {
            score -= qualityAnalysis.lintingResults.length * 2;
        }

        if (qualityAnalysis.maintainabilityIndex < 50) {
            score -= 20;
        } else if (qualityAnalysis.maintainabilityIndex < 70) {
            score -= 10;
        }

        if (qualityAnalysis.testCoverage < 50) {
            score -= 15;
        } else if (qualityAnalysis.testCoverage < 80) {
            score -= 5;
        }

        if (this.calculateDuplicationPercentage(qualityAnalysis.codeDuplication) > 10) {
            score -= 10;
        }

        if (qualityAnalysis.codeStyleIssues) {
            score -= qualityAnalysis.codeStyleIssues.length;
        }

        return Math.max(0, score);
    }

    generateRecommendations(analysis, command) {
        const recommendations = [];
        const { qualityAnalysis, metrics } = analysis;

        // Check for linting issues
        if (metrics && metrics.lintingIssues > 10) {
            recommendations.push({
                type: 'linting_issues',
                severity: 'medium',
                message: `${metrics.lintingIssues} linting issues found`,
                details: { recommendation: 'Fix linting issues to improve code quality' }
            });
        }

        // Check maintainability
        if (metrics && metrics.maintainabilityIndex < 50) {
            recommendations.push({
                type: 'low_maintainability',
                severity: 'high',
                message: 'Low maintainability index detected',
                details: { maintainabilityIndex: metrics.maintainabilityIndex, recommendation: 'Refactor code to improve maintainability' }
            });
        }

        // Check test coverage
        if (metrics && metrics.testCoverage < 80) {
            recommendations.push({
                type: 'low_test_coverage',
                severity: 'medium',
                message: 'Low test coverage detected',
                details: { testCoverage: metrics.testCoverage, recommendation: 'Add more tests to improve coverage' }
            });
        }

        // Check code duplication
        if (metrics && metrics.codeDuplicationPercentage > 10) {
            recommendations.push({
                type: 'code_duplication',
                severity: 'medium',
                message: 'High code duplication detected',
                details: { duplicationPercentage: metrics.codeDuplicationPercentage, recommendation: 'Refactor duplicated code' }
            });
        }

        // Check code style
        if (metrics && metrics.codeStyleIssues > 5) {
            recommendations.push({
                type: 'code_style_issues',
                severity: 'low',
                message: `${metrics.codeStyleIssues} code style issues found`,
                details: { recommendation: 'Fix code style issues for consistency' }
            });
        }

        return recommendations;
    }

    getEstimatedTime(command) {
        const options = command.getAnalysisOptions();
        
        let estimatedTime = 60000; // Base time: 1 minute
        
        if (options.linting) estimatedTime += 30000;
        if (options.complexity) estimatedTime += 45000;
        if (options.maintainability) estimatedTime += 30000;
        if (options.testCoverage) estimatedTime += 60000;
        if (options.codeDuplication) estimatedTime += 45000;
        if (options.codeStyle) estimatedTime += 20000;
        if (options.documentation) estimatedTime += 30000;
        if (options.performance) estimatedTime += 45000;
        
        return Math.min(estimatedTime, 300000); // Max 5 minutes
    }

    async updateExecutionRecord(execution, result) {
        execution.status = 'completed';
        execution.completedAt = new Date();
        execution.duration = result.duration;
        execution.result = result;
        
        this.logger.info('AnalyzeCodeQualityHandler: Execution record updated', {
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
            type: 'code_quality_analysis',
            executionId: execution.id,
            commandId: command.commandId,
            projectPath: command.projectPath,
            requestedBy: command.requestedBy,
            timestamp: new Date()
        });
    }

    async publishAnalysisCompletedEvent(execution, result, command) {
        await this.eventBus.publish('analysis.completed', {
            type: 'code_quality_analysis',
            executionId: execution.id,
            commandId: command.commandId,
            projectPath: command.projectPath,
            requestedBy: command.requestedBy,
            result: result,
            timestamp: new Date()
        });
    }

    async handleAnalysisError(error, command) {
        this.logger.error('AnalyzeCodeQualityHandler: Analysis failed', {
            handlerId: this.handlerId,
            commandId: command.commandId,
            projectPath: command.projectPath,
            error: error.message,
            stack: error.stack
        });

        await this.eventBus.publish('analysis.failed', {
            type: 'code_quality_analysis',
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
            type: 'AnalyzeCodeQualityHandler',
            version: '1.0.0',
            supportedCommands: ['AnalyzeCodeQualityCommand'],
            capabilities: ['code_quality_analysis', 'linting_analysis', 'complexity_analysis']
        };
    }
}

module.exports = AnalyzeCodeQualityHandler; 