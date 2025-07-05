/**
 * AnalyzeArchitectureHandler - Handles architecture analysis commands
 * Implements the Command Handler pattern for architecture analysis
 */
const fs = require('fs').promises;
const path = require('path');

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
            // Check if this is a monorepo by looking for packages
            const packages = await this.findPackages(projectInfo.path);
            
            if (packages.length > 1) {
                // Monorepo: analyze each package separately
                const packageArchitectures = {};
                
                for (const pkg of packages) {
                    const packageArchitecture = await this.architectureAnalyzer.analyze(
                        pkg.path,
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
                    
                    packageArchitectures[pkg.name] = {
                        package: pkg,
                        architecture: packageArchitecture,
                        patterns: packageArchitecture.detectedPatterns || [],
                        layers: packageArchitecture.structure?.layers || [],
                        modules: Object.keys(packageArchitecture.coupling?.instability || {}),
                        coupling: packageArchitecture.coupling || {},
                        cohesion: packageArchitecture.cohesion || {},
                        antiPatterns: packageArchitecture.violations?.filter(v => v.severity === 'high') || [],
                        designPrinciples: packageArchitecture.recommendations || []
                    };
                }
                
                return {
                    projectInfo,
                    packages,
                    packageArchitectures,
                    isMonorepo: true,
                    analysisOptions: options,
                    timestamp: new Date()
                };
            } else {
                // Single package: analyze project-wide
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
                    patterns: architecture.detectedPatterns || [],
                    layers: architecture.structure?.layers || [],
                    modules: Object.keys(architecture.coupling?.instability || {}),
                    coupling: architecture.coupling || {},
                    cohesion: architecture.cohesion || {},
                    antiPatterns: architecture.violations?.filter(v => v.severity === 'high') || [],
                    designPrinciples: architecture.recommendations || [],
                    analysisOptions: options,
                    timestamp: new Date()
                };
            }

        } catch (error) {
            this.logger.error('AnalyzeArchitectureHandler: Architecture analysis failed', {
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
                totalPatternCount: 0,
                totalLayerCount: 0,
                totalModuleCount: 0,
                totalAntiPatternCount: 0,
                totalDesignPrincipleCount: 0,
                averageCoupling: 0,
                averageCohesion: 0,
                complexityScore: 0,
                packageCount: Object.keys(analysis.packageArchitectures).length
            };
            
            let totalCoupling = 0;
            let totalCohesion = 0;
            let packageCount = 0;
            
            Object.values(analysis.packageArchitectures).forEach(pkgArch => {
                const { architecture } = pkgArch;
                
                aggregatedMetrics.totalPatternCount += architecture.detectedPatterns?.length || 0;
                aggregatedMetrics.totalLayerCount += architecture.structure?.layers?.length || 0;
                aggregatedMetrics.totalModuleCount += Object.keys(architecture.coupling?.instability || {}).length;
                aggregatedMetrics.totalAntiPatternCount += architecture.violations?.filter(v => v.severity === 'high').length || 0;
                aggregatedMetrics.totalDesignPrincipleCount += architecture.recommendations?.length || 0;
                
                const pkgCoupling = this.calculateAverageCoupling(architecture.coupling);
                const pkgCohesion = this.calculateAverageCohesion(architecture.cohesion);
                
                if (pkgCoupling > 0) {
                    totalCoupling += pkgCoupling;
                    packageCount++;
                }
                if (pkgCohesion > 0) {
                    totalCohesion += pkgCohesion;
                }
                
                aggregatedMetrics.complexityScore += this.calculateComplexityScore(architecture);
            });
            
            aggregatedMetrics.averageCoupling = packageCount > 0 ? totalCoupling / packageCount : 0;
            aggregatedMetrics.averageCohesion = packageCount > 0 ? totalCohesion / packageCount : 0;
            
            return aggregatedMetrics;
        } else {
            // For single package, use existing logic
            const { architecture } = analysis;
            
            return {
                patternCount: architecture.detectedPatterns?.length || 0,
                layerCount: architecture.structure?.layers?.length || 0,
                moduleCount: Object.keys(architecture.coupling?.instability || {}).length,
                antiPatternCount: architecture.violations?.filter(v => v.severity === 'high').length || 0,
                designPrincipleCount: architecture.recommendations?.length || 0,
                averageCoupling: this.calculateAverageCoupling(architecture.coupling),
                averageCohesion: this.calculateAverageCohesion(architecture.cohesion),
                complexityScore: this.calculateComplexityScore(architecture)
            };
        }
    }

    calculateAverageCoupling(coupling) {
        if (!coupling || !coupling.instability || Object.keys(coupling.instability).length === 0) return 0;
        const values = Object.values(coupling.instability).filter(v => !isNaN(v) && isFinite(v));
        if (values.length === 0) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }

    calculateAverageCohesion(cohesion) {
        if (!cohesion || !cohesion.moduleCohesion || Object.keys(cohesion.moduleCohesion).length === 0) return 0;
        const values = Object.values(cohesion.moduleCohesion);
        return values.reduce((a, b) => a + b, 0) / values.length;
    }

    calculateComplexityScore(architecture) {
        let score = 0;
        
        if (architecture.detectedPatterns) score += architecture.detectedPatterns.length * 10;
        if (architecture.structure?.layers) score += architecture.structure.layers.length * 5;
        if (architecture.coupling?.instability) score += Object.keys(architecture.coupling.instability).length * 3;
        if (architecture.violations) score += architecture.violations.filter(v => v.severity === 'high').length * -15;
        
        return Math.max(0, score);
    }

    generateRecommendations(analysis, command) {
        const recommendations = [];
        
        if (analysis.isMonorepo) {
            // For monorepo, generate recommendations per package and overall
            Object.entries(analysis.packageArchitectures).forEach(([packageName, pkgArch]) => {
                const { architecture } = pkgArch;
                
                // Package-specific recommendations
                if (architecture.violations?.length > 0) {
                    recommendations.push({
                        title: `Fix architecture violations in ${packageName}`,
                        description: `${architecture.violations.length} violations found in ${packageName}`,
                        priority: 'high',
                        category: 'architecture',
                        package: packageName
                    });
                }
                
                if (architecture.dependencies?.circularDependencies?.length > 0) {
                    recommendations.push({
                        title: `Remove circular dependencies in ${packageName}`,
                        description: `${architecture.dependencies.circularDependencies.length} circular dependencies found in ${packageName}`,
                        priority: 'high',
                        category: 'dependencies',
                        package: packageName
                    });
                }
                
                const highInstability = Object.entries(architecture.coupling?.instability || {})
                    .filter(([module, instability]) => instability > 0.7);
                
                if (highInstability.length > 0) {
                    recommendations.push({
                        title: `Reduce module instability in ${packageName}`,
                        description: `${highInstability.length} modules have high instability in ${packageName}`,
                        priority: 'medium',
                        category: 'coupling',
                        package: packageName
                    });
                }
            });
            
            // Overall monorepo recommendations
            if (Object.keys(analysis.packageArchitectures).length > 2) {
                recommendations.push({
                    title: 'Consider microservices architecture',
                    description: 'Large monorepo detected. Consider splitting into microservices for better maintainability.',
                    priority: 'medium',
                    category: 'architecture',
                    package: 'overall'
                });
            }
        } else {
            // For single package, use existing logic
            const { architecture } = analysis;
            
            if (architecture.violations?.length > 0) {
                recommendations.push({
                    title: 'Fix architecture violations',
                    description: `${architecture.violations.length} violations found`,
                    priority: 'high',
                    category: 'architecture'
                });
            }
            
            if (architecture.dependencies?.circularDependencies?.length > 0) {
                recommendations.push({
                    title: 'Remove circular dependencies',
                    description: `${architecture.dependencies.circularDependencies.length} circular dependencies found`,
                    priority: 'high',
                    category: 'dependencies'
                });
            }
            
            const highInstability = Object.entries(architecture.coupling?.instability || {})
                .filter(([module, instability]) => instability > 0.7);
            
            if (highInstability.length > 0) {
                recommendations.push({
                    title: 'Reduce module instability',
                    description: `${highInstability.length} modules have high instability`,
                    priority: 'medium',
                    category: 'coupling'
                });
            }
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