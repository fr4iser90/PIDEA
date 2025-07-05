/**
 * AnalyzeCodeQualityHandler - Handles code quality analysis commands
 * Implements the Command Handler pattern for code quality analysis
 */
const fs = require('fs').promises;
const path = require('path');

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
            // Check if this is a monorepo by looking for packages
            const packages = await this.findPackages(projectInfo.path);
            
            if (packages.length > 1) {
                // Monorepo: analyze each package separately
                const packageQualityAnalyses = {};
                
                for (const pkg of packages) {
                    const packageQualityAnalysis = await this.codeQualityAnalyzer.analyzeCodeQuality(
                        pkg.path,
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

                    // Ensure realMetrics are included in the analysis
                    const analysisWithRealMetrics = {
                        ...packageQualityAnalysis,
                        realMetrics: packageQualityAnalysis.realMetrics || packageQualityAnalysis.metrics?.realMetrics
                    };

                    // Validate that realMetrics exist
                    if (!analysisWithRealMetrics.realMetrics) {
                        throw new Error(`Real metrics not calculated by analyzer for package ${pkg.name}`);
                    }

                    packageQualityAnalyses[pkg.name] = {
                        package: pkg,
                        qualityAnalysis: analysisWithRealMetrics,
                        lintingResults: packageQualityAnalysis.issues || [],
                        complexityMetrics: packageQualityAnalysis.metrics?.complexity || {},
                        maintainabilityIndex: analysisWithRealMetrics.realMetrics.maintainabilityIndex,
                        testCoverage: analysisWithRealMetrics.realMetrics.testCoverage,
                        codeDuplication: packageQualityAnalysis.metrics?.maintainability?.codeDuplication || {},
                        codeStyleIssues: packageQualityAnalysis.issues?.filter(issue => issue.type === 'code-smell') || [],
                        documentationCoverage: analysisWithRealMetrics.realMetrics.documentationCoverage,
                        performanceIssues: packageQualityAnalysis.issues?.filter(issue => issue.severity === 'high') || [],
                        // Detailed issues from real metrics
                        largeFiles: analysisWithRealMetrics.realMetrics.largeFiles || [],
                        magicNumberFiles: analysisWithRealMetrics.realMetrics.magicNumberFiles || [],
                        complexityIssuesList: analysisWithRealMetrics.realMetrics.complexityIssuesList || [],
                        lintingIssuesList: analysisWithRealMetrics.realMetrics.lintingIssuesList || []
                    };
                }
                
                return {
                    projectInfo,
                    packages,
                    packageQualityAnalyses,
                    isMonorepo: true,
                    analysisOptions: options,
                    timestamp: new Date()
                };
            } else {
                // Single package: analyze project-wide
                const qualityAnalysis = await this.codeQualityAnalyzer.analyzeCodeQuality(
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

                // Ensure realMetrics are included in the analysis
                const analysisWithRealMetrics = {
                    ...qualityAnalysis,
                    realMetrics: qualityAnalysis.realMetrics || qualityAnalysis.metrics?.realMetrics
                };

                // Validate that realMetrics exist
                if (!analysisWithRealMetrics.realMetrics) {
                    throw new Error('Real metrics not calculated by analyzer');
                }

                return {
                    projectInfo,
                    qualityAnalysis: analysisWithRealMetrics,
                    lintingResults: qualityAnalysis.issues || [],
                    complexityMetrics: qualityAnalysis.metrics?.complexity || {},
                    maintainabilityIndex: analysisWithRealMetrics.realMetrics.maintainabilityIndex,
                    testCoverage: analysisWithRealMetrics.realMetrics.testCoverage,
                    codeDuplication: qualityAnalysis.metrics?.maintainability?.codeDuplication || {},
                    codeStyleIssues: qualityAnalysis.issues?.filter(issue => issue.type === 'code-smell') || [],
                    documentationCoverage: analysisWithRealMetrics.realMetrics.documentationCoverage,
                    performanceIssues: qualityAnalysis.issues?.filter(issue => issue.severity === 'high') || [],
                    // Detailed issues from real metrics
                    largeFiles: analysisWithRealMetrics.realMetrics.largeFiles || [],
                    magicNumberFiles: analysisWithRealMetrics.realMetrics.magicNumberFiles || [],
                    complexityIssuesList: analysisWithRealMetrics.realMetrics.complexityIssuesList || [],
                    lintingIssuesList: analysisWithRealMetrics.realMetrics.lintingIssuesList || [],
                    analysisOptions: options,
                    timestamp: new Date()
                };
            }

        } catch (error) {
            this.logger.error('AnalyzeCodeQualityHandler: Code quality analysis failed', {
                handlerId: this.handlerId,
                projectPath: projectInfo.path,
                error: error.message
            });
            throw error;
        }
    }

    async findPackages(projectPath) {
        const packages = [];
        
        // Check root package.json
        const rootPackagePath = path.join(projectPath, 'package.json');
        if (await this.fileExists(rootPackagePath)) {
            try {
                const packageJson = JSON.parse(await fs.readFile(rootPackagePath, 'utf-8'));
                packages.push({
                    name: packageJson.name || 'root',
                    version: packageJson.version,
                    path: projectPath,
                    relativePath: '.',
                    dependencies: packageJson.dependencies || {},
                    devDependencies: packageJson.devDependencies || {}
                });
            } catch (e) {
                // Ignore parse errors
            }
        }

        // Check common subdirectories
        const commonDirs = ['backend', 'frontend', 'api', 'client', 'server', 'app', 'src'];
        for (const dir of commonDirs) {
            const subdirPath = path.join(projectPath, dir);
            const packagePath = path.join(subdirPath, 'package.json');
            
            if (await this.fileExists(packagePath)) {
                try {
                    const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
                    packages.push({
                        name: packageJson.name || dir,
                        version: packageJson.version,
                        path: subdirPath,
                        relativePath: dir,
                        dependencies: packageJson.dependencies || {},
                        devDependencies: packageJson.devDependencies || {}
                    });
                } catch (e) {
                    // Ignore parse errors
                }
            }
        }

        return packages;
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    generateMetrics(analysis) {
        if (analysis.isMonorepo) {
            // For monorepo, aggregate metrics from all packages
            const aggregatedMetrics = {
                totalLintingIssues: 0,
                totalComplexityIssues: 0,
                averageMaintainabilityIndex: 0,
                averageTestCoverage: 0,
                totalCodeDuplicationPercentage: 0,
                totalCodeStyleIssues: 0,
                averageDocumentationCoverage: 0,
                totalPerformanceIssues: 0,
                averageOverallQualityScore: 0,
                packageCount: Object.keys(analysis.packageQualityAnalyses).length
            };
            
            let totalMaintainability = 0;
            let totalTestCoverage = 0;
            let totalDocumentationCoverage = 0;
            let totalOverallScore = 0;
            let packageCount = 0;
            
            Object.values(analysis.packageQualityAnalyses).forEach(pkgQuality => {
                const { qualityAnalysis } = pkgQuality;
                const realMetrics = qualityAnalysis.realMetrics;
                
                aggregatedMetrics.totalLintingIssues += realMetrics.lintingIssues || 0;
                aggregatedMetrics.totalComplexityIssues += realMetrics.averageComplexity || 0;
                aggregatedMetrics.totalCodeDuplicationPercentage += realMetrics.codeDuplicationPercentage || 0;
                aggregatedMetrics.totalCodeStyleIssues += realMetrics.codeStyleIssues || 0;
                aggregatedMetrics.totalPerformanceIssues += realMetrics.performanceIssues || 0;
                
                if (realMetrics.maintainabilityIndex > 0) {
                    totalMaintainability += realMetrics.maintainabilityIndex;
                    packageCount++;
                }
                if (realMetrics.testCoverage > 0) {
                    totalTestCoverage += realMetrics.testCoverage;
                }
                if (realMetrics.documentationCoverage > 0) {
                    totalDocumentationCoverage += realMetrics.documentationCoverage;
                }
                if (realMetrics.overallQualityScore > 0) {
                    totalOverallScore += realMetrics.overallQualityScore;
                }
            });
            
            aggregatedMetrics.averageMaintainabilityIndex = packageCount > 0 ? totalMaintainability / packageCount : 0;
            aggregatedMetrics.averageTestCoverage = packageCount > 0 ? totalTestCoverage / packageCount : 0;
            aggregatedMetrics.averageDocumentationCoverage = packageCount > 0 ? totalDocumentationCoverage / packageCount : 0;
            aggregatedMetrics.averageOverallQualityScore = packageCount > 0 ? totalOverallScore / packageCount : 0;
            
            return aggregatedMetrics;
        } else {
            // For single package, use existing logic
            const qualityAnalysis = analysis.qualityAnalysis;
            
            // ONLY use real metrics - NO FALLBACKS
            const realMetrics = qualityAnalysis.realMetrics || qualityAnalysis.metrics?.realMetrics;
            
            if (!realMetrics) {
                throw new Error('Real metrics not found - analysis failed');
            }
            
            return {
                lintingIssues: realMetrics.lintingIssues,
                averageComplexity: realMetrics.averageComplexity,
                maintainabilityIndex: realMetrics.maintainabilityIndex,
                testCoverage: realMetrics.testCoverage,
                codeDuplicationPercentage: realMetrics.codeDuplicationPercentage,
                codeStyleIssues: realMetrics.codeStyleIssues,
                documentationCoverage: realMetrics.documentationCoverage,
                performanceIssues: realMetrics.performanceIssues,
                overallQualityScore: realMetrics.overallQualityScore
            };
        }
    }

    calculateAverageComplexity(complexityMetrics) {
        if (!complexityMetrics || Object.keys(complexityMetrics).length === 0) return 0;
        
        // Handle the new complexity structure
        const cyclomaticValues = Object.values(complexityMetrics.cyclomaticComplexity || {});
        const cognitiveValues = Object.values(complexityMetrics.cognitiveComplexity || {});
        
        const allValues = [...cyclomaticValues, ...cognitiveValues];
        
        if (allValues.length === 0) return 0;
        return allValues.reduce((a, b) => a + b, 0) / allValues.length;
    }

    calculateDuplicationPercentage(codeDuplication) {
        if (!codeDuplication || typeof codeDuplication !== 'number') return 0;
        return codeDuplication; // The analyzer already returns the percentage
    }

    calculateOverallQualityScore(analysis) {
        let score = 100;
        const qualityAnalysis = analysis;

        // Use the overall score from the analyzer if available
        if (qualityAnalysis.overallScore !== undefined) {
            return qualityAnalysis.overallScore;
        }

        // Deduct points for issues
        if (qualityAnalysis.issues) {
            score -= qualityAnalysis.issues.length * 2;
        }

        if (qualityAnalysis.metrics?.maintainability?.maintainabilityIndex < 50) {
            score -= 20;
        } else if (qualityAnalysis.metrics?.maintainability?.maintainabilityIndex < 70) {
            score -= 10;
        }

        if (qualityAnalysis.metrics?.testability?.testCoverage < 50) {
            score -= 15;
        } else if (qualityAnalysis.metrics?.testability?.testCoverage < 80) {
            score -= 5;
        }

        if (this.calculateDuplicationPercentage(qualityAnalysis.metrics?.maintainability?.codeDuplication) > 10) {
            score -= 10;
        }

        if (qualityAnalysis.issues?.filter(issue => issue.type === 'code-smell')?.length > 5) {
            score -= 5;
        }

        return Math.max(0, score);
    }

    generateRecommendations(analysis, command) {
        const recommendations = [];
        
        if (analysis.isMonorepo) {
            // For monorepo, generate recommendations per package and overall
            Object.entries(analysis.packageQualityAnalyses).forEach(([packageName, pkgQuality]) => {
                const { qualityAnalysis } = pkgQuality;
                
                // Package-specific recommendations
                if (qualityAnalysis.realMetrics.lintingIssues > 0) {
                    recommendations.push({
                        title: `Fix linting issues in ${packageName}`,
                        description: `${qualityAnalysis.realMetrics.lintingIssues} linting issues found in ${packageName}`,
                        priority: 'medium',
                        category: 'linting',
                        package: packageName
                    });
                }
                
                if (qualityAnalysis.realMetrics.maintainabilityIndex < 70) {
                    recommendations.push({
                        title: `Improve maintainability in ${packageName}`,
                        description: `Maintainability index is ${qualityAnalysis.realMetrics.maintainabilityIndex} in ${packageName}`,
                        priority: 'high',
                        category: 'maintainability',
                        package: packageName
                    });
                }
                
                if (qualityAnalysis.realMetrics.testCoverage < 80) {
                    recommendations.push({
                        title: `Improve test coverage in ${packageName}`,
                        description: `Test coverage is ${qualityAnalysis.realMetrics.testCoverage}% in ${packageName}`,
                        priority: 'high',
                        category: 'testing',
                        package: packageName
                    });
                }
                
                if (qualityAnalysis.realMetrics.overallQualityScore < 70) {
                    recommendations.push({
                        title: `Improve overall code quality in ${packageName}`,
                        description: `Overall quality score is ${qualityAnalysis.realMetrics.overallQualityScore} in ${packageName}`,
                        priority: 'high',
                        category: 'quality',
                        package: packageName
                    });
                }
            });
            
            // Overall monorepo recommendations
            const avgQualityScore = analysis.packageQualityAnalyses && 
                Object.values(analysis.packageQualityAnalyses).reduce((sum, pkg) => 
                    sum + (pkg.qualityAnalysis.realMetrics.overallQualityScore || 0), 0) / 
                Object.keys(analysis.packageQualityAnalyses).length;
            
            if (avgQualityScore < 75) {
                recommendations.push({
                    title: 'Improve overall code quality across packages',
                    description: `Average quality score across packages is ${avgQualityScore}`,
                    priority: 'medium',
                    category: 'quality',
                    package: 'overall'
                });
            }
        } else {
            // For single package, use existing logic
            const qualityAnalysis = analysis.qualityAnalysis;
            
            if (qualityAnalysis.realMetrics.lintingIssues > 0) {
                recommendations.push({
                    title: 'Fix linting issues',
                    description: `${qualityAnalysis.realMetrics.lintingIssues} linting issues found`,
                    priority: 'medium',
                    category: 'linting'
                });
            }
            
            if (qualityAnalysis.realMetrics.maintainabilityIndex < 70) {
                recommendations.push({
                    title: 'Improve maintainability',
                    description: `Maintainability index is ${qualityAnalysis.realMetrics.maintainabilityIndex}`,
                    priority: 'high',
                    category: 'maintainability'
                });
            }
            
            if (qualityAnalysis.realMetrics.testCoverage < 80) {
                recommendations.push({
                    title: 'Improve test coverage',
                    description: `Test coverage is ${qualityAnalysis.realMetrics.testCoverage}%`,
                    priority: 'high',
                    category: 'testing'
                });
            }
            
            if (qualityAnalysis.realMetrics.overallQualityScore < 70) {
                recommendations.push({
                    title: 'Improve overall code quality',
                    description: `Overall quality score is ${qualityAnalysis.realMetrics.overallQualityScore}`,
                    priority: 'high',
                    category: 'quality'
                });
            }
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