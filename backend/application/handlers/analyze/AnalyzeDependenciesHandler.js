/**
 * AnalyzeDependenciesHandler - Handles dependencies analysis commands
 * Implements the Command Handler pattern for dependencies analysis
 */
class AnalyzeDependenciesHandler {
    constructor(dependencies = {}) {
        this.validateDependencies(dependencies);
        
        this.dependencyAnalyzer = dependencies.dependencyAnalyzer;
        this.cursorIDEService = dependencies.cursorIDEService;
        this.taskRepository = dependencies.taskRepository;
        this.eventBus = dependencies.eventBus;
        this.logger = dependencies.logger;
        this.fileSystemService = dependencies.fileSystemService;
        
        this.handlerId = this.generateHandlerId();
    }

    validateDependencies(dependencies) {
        const required = [
            'dependencyAnalyzer',
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
        return `analyze_dependencies_handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async handle(command) {
        try {
            this.logger.info('AnalyzeDependenciesHandler: Starting dependencies analysis', {
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

            this.logger.info('AnalyzeDependenciesHandler: Dependencies analysis completed successfully', {
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
            this.logger.error('AnalyzeDependenciesHandler: Project path validation failed', {
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
            type: 'analyze_dependencies',
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
            this.logger.info('AnalyzeDependenciesHandler: Performing dependencies analysis', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath
            });

            const projectInfo = await this.getProjectInfo(command.projectPath);
            const analysis = await this.performDependenciesAnalysis(command, projectInfo);
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
            this.logger.error('AnalyzeDependenciesHandler: Dependencies analysis failed', {
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
            this.logger.error('AnalyzeDependenciesHandler: Failed to get project info', {
                handlerId: this.handlerId,
                projectPath,
                error: error.message
            });
            throw error;
        }
    }

    async performDependenciesAnalysis(command, projectInfo) {
        const options = command.getAnalysisOptions();
        
        try {
            const dependenciesAnalysis = await this.dependencyAnalyzer.analyzeDependencies(
                projectInfo.path,
                {
                    analyzeVersions: options.analyzeVersions,
                    checkVulnerabilities: options.checkVulnerabilities,
                    analyzeUpdates: options.analyzeUpdates,
                    checkLicenseCompatibility: options.checkLicenseCompatibility,
                    analyzeTransitiveDependencies: options.analyzeTransitiveDependencies,
                    checkBundleSize: options.checkBundleSize,
                    analyzeDependencyGraph: options.analyzeDependencyGraph
                }
            );

            return {
                projectInfo,
                dependenciesAnalysis,
                directDependencies: dependenciesAnalysis.directDependencies || [],
                transitiveDependencies: dependenciesAnalysis.transitiveDependencies || [],
                vulnerabilities: dependenciesAnalysis.vulnerabilities || [],
                outdatedPackages: dependenciesAnalysis.outdatedPackages || [],
                licenseIssues: dependenciesAnalysis.licenseIssues || [],
                bundleSize: dependenciesAnalysis.bundleSize || {},
                dependencyGraph: dependenciesAnalysis.dependencyGraph || {},
                analysisOptions: options,
                timestamp: new Date()
            };

        } catch (error) {
            this.logger.error('AnalyzeDependenciesHandler: Dependencies analysis failed', {
                handlerId: this.handlerId,
                projectPath: projectInfo.path,
                error: error.message
            });
            throw error;
        }
    }

    generateMetrics(analysis) {
        const { dependenciesAnalysis } = analysis;
        
        return {
            directDependencyCount: dependenciesAnalysis.directDependencies?.length || 0,
            transitiveDependencyCount: dependenciesAnalysis.transitiveDependencies?.length || 0,
            totalDependencies: (dependenciesAnalysis.directDependencies?.length || 0) + (dependenciesAnalysis.transitiveDependencies?.length || 0),
            vulnerabilityCount: dependenciesAnalysis.vulnerabilities?.length || 0,
            outdatedPackageCount: dependenciesAnalysis.outdatedPackages?.length || 0,
            licenseIssueCount: dependenciesAnalysis.licenseIssues?.length || 0,
            bundleSize: dependenciesAnalysis.bundleSize?.totalSize || 0,
            averageDependencyAge: this.calculateAverageDependencyAge(dependenciesAnalysis.directDependencies),
            securityScore: this.calculateSecurityScore(dependenciesAnalysis.vulnerabilities),
            updateScore: this.calculateUpdateScore(dependenciesAnalysis.outdatedPackages)
        };
    }

    calculateAverageDependencyAge(dependencies) {
        if (!dependencies || dependencies.length === 0) return 0;
        
        const now = new Date();
        const ages = dependencies.map(dep => {
            if (dep.lastUpdated) {
                return (now - new Date(dep.lastUpdated)) / (1000 * 60 * 60 * 24); // days
            }
            return 0;
        });
        
        return ages.reduce((a, b) => a + b, 0) / ages.length;
    }

    calculateSecurityScore(vulnerabilities) {
        if (!vulnerabilities || vulnerabilities.length === 0) return 100;
        
        let score = 100;
        vulnerabilities.forEach(vuln => {
            if (vuln.severity === 'critical') score -= 25;
            else if (vuln.severity === 'high') score -= 15;
            else if (vuln.severity === 'medium') score -= 10;
            else if (vuln.severity === 'low') score -= 5;
        });
        
        return Math.max(0, score);
    }

    calculateUpdateScore(outdatedPackages) {
        if (!outdatedPackages || outdatedPackages.length === 0) return 100;
        
        let score = 100;
        outdatedPackages.forEach(pkg => {
            if (pkg.updateType === 'major') score -= 20;
            else if (pkg.updateType === 'minor') score -= 10;
            else if (pkg.updateType === 'patch') score -= 5;
        });
        
        return Math.max(0, score);
    }

    generateRecommendations(analysis, command) {
        const recommendations = [];
        const { dependenciesAnalysis, metrics } = analysis;

        // Check for vulnerabilities
        if (metrics && metrics.vulnerabilityCount > 0) {
            const criticalVulns = dependenciesAnalysis.vulnerabilities?.filter(v => v.severity === 'critical').length || 0;
            const highVulns = dependenciesAnalysis.vulnerabilities?.filter(v => v.severity === 'high').length || 0;
            
            if (criticalVulns > 0) {
                recommendations.push({
                    type: 'critical_vulnerabilities',
                    severity: 'critical',
                    message: `${criticalVulns} critical vulnerabilities found`,
                    details: { recommendation: 'Update packages immediately to fix critical vulnerabilities' }
                });
            }
            
            if (highVulns > 0) {
                recommendations.push({
                    type: 'high_vulnerabilities',
                    severity: 'high',
                    message: `${highVulns} high severity vulnerabilities found`,
                    details: { recommendation: 'Update packages to fix high severity vulnerabilities' }
                });
            }
        }

        // Check for outdated packages
        if (metrics && metrics.outdatedPackageCount > 5) {
            recommendations.push({
                type: 'outdated_packages',
                severity: 'medium',
                message: `${metrics.outdatedPackageCount} outdated packages found`,
                details: { recommendation: 'Consider updating packages to get latest features and security fixes' }
            });
        }

        // Check for license issues
        if (metrics && metrics.licenseIssueCount > 0) {
            recommendations.push({
                type: 'license_issues',
                severity: 'medium',
                message: `${metrics.licenseIssueCount} license compatibility issues found`,
                details: { recommendation: 'Review license compatibility for your project' }
            });
        }

        // Check bundle size
        if (metrics && metrics.bundleSize > 1024 * 1024 * 5) { // 5MB
            recommendations.push({
                type: 'large_bundle_size',
                severity: 'low',
                message: 'Large bundle size detected',
                details: { bundleSize: metrics.bundleSize, recommendation: 'Consider optimizing bundle size for better performance' }
            });
        }

        // Check dependency age
        if (metrics && metrics.averageDependencyAge > 365) { // 1 year
            recommendations.push({
                type: 'old_dependencies',
                severity: 'low',
                message: 'Many dependencies are outdated',
                details: { averageAge: metrics.averageDependencyAge, recommendation: 'Consider updating dependencies' }
            });
        }

        return recommendations;
    }

    getEstimatedTime(command) {
        const options = command.getAnalysisOptions();
        
        let estimatedTime = 30000; // Base time: 30 seconds
        
        if (options.analyzeVersions) estimatedTime += 15000;
        if (options.checkVulnerabilities) estimatedTime += 30000;
        if (options.analyzeUpdates) estimatedTime += 20000;
        if (options.checkLicenseCompatibility) estimatedTime += 15000;
        if (options.analyzeTransitiveDependencies) estimatedTime += 25000;
        if (options.checkBundleSize) estimatedTime += 10000;
        if (options.analyzeDependencyGraph) estimatedTime += 20000;
        
        return Math.min(estimatedTime, 120000); // Max 2 minutes
    }

    async updateExecutionRecord(execution, result) {
        execution.status = 'completed';
        execution.completedAt = new Date();
        execution.duration = result.duration;
        execution.result = result;
        
        this.logger.info('AnalyzeDependenciesHandler: Execution record updated', {
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
            type: 'dependencies_analysis',
            executionId: execution.id,
            commandId: command.commandId,
            projectPath: command.projectPath,
            requestedBy: command.requestedBy,
            timestamp: new Date()
        });
    }

    async publishAnalysisCompletedEvent(execution, result, command) {
        await this.eventBus.publish('analysis.completed', {
            type: 'dependencies_analysis',
            executionId: execution.id,
            commandId: command.commandId,
            projectPath: command.projectPath,
            requestedBy: command.requestedBy,
            result: result,
            timestamp: new Date()
        });
    }

    async handleAnalysisError(error, command) {
        this.logger.error('AnalyzeDependenciesHandler: Analysis failed', {
            handlerId: this.handlerId,
            commandId: command.commandId,
            projectPath: command.projectPath,
            error: error.message,
            stack: error.stack
        });

        await this.eventBus.publish('analysis.failed', {
            type: 'dependencies_analysis',
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
            type: 'AnalyzeDependenciesHandler',
            version: '1.0.0',
            supportedCommands: ['AnalyzeDependenciesCommand'],
            capabilities: ['dependencies_analysis', 'vulnerability_checking', 'version_analysis']
        };
    }
}

module.exports = AnalyzeDependenciesHandler; 