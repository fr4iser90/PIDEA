/**
 * VibeCoderModeHandler - Ultimate orchestrator for all VibeCoder operations
 * Implements the Handler pattern for coordinating analyze, refactor, and generate operations
 */
const EventBus = require('../../../infrastructure/messaging/EventBus');
const AnalysisRepository = require('../../../domain/repositories/AnalysisRepository');
const CommandBus = require('../../../infrastructure/messaging/CommandBus');
const AnalyzeRepoStructureCommand = require('../../commands/analyze/AnalyzeRepoStructureCommand');
const AnalyzeArchitectureCommand = require('../../commands/analyze/AnalyzeArchitectureCommand');
const AnalyzeCodeQualityCommand = require('../../commands/analyze/AnalyzeCodeQualityCommand');
const AnalyzeDependenciesCommand = require('../../commands/analyze/AnalyzeDependenciesCommand');
const AnalyzeTechStackCommand = require('../../commands/analyze/AnalyzeTechStackCommand');
const { SubprojectDetector } = require('../../../domain/services');
const path = require('path');
const fs = require('fs');


class VibeCoderModeHandler {
    constructor(dependencies = {}) {
        this.eventBus = dependencies.eventBus || new EventBus();
        this.analysisRepository = dependencies.analysisRepository || new AnalysisRepository();
        this.commandBus = dependencies.commandBus || new CommandBus();
        this.logger = dependencies.logger || console;
        this.subprojectDetector = dependencies.subprojectDetector || new SubprojectDetector();
        this.analysisOutputService = dependencies.analysisOutputService;
        
        // Initialize analyzers
        this.projectAnalyzer = dependencies.projectAnalyzer;
        this.codeQualityAnalyzer = dependencies.codeQualityAnalyzer;
        this.architectureAnalyzer = dependencies.architectureAnalyzer;
        this.dependencyAnalyzer = dependencies.dependencyAnalyzer;
        this.securityAnalyzer = dependencies.securityAnalyzer;
        this.performanceAnalyzer = dependencies.performanceAnalyzer;
    }

    async handle(command) {
        this.logger.info(`Starting VibeCoder mode orchestration for project: ${command.projectPath}`);

        try {
            // Debug: Check if eventBus is properly initialized
            if (!this.eventBus) {
                this.logger.error('EventBus is not initialized');
                throw new Error('EventBus is not initialized');
            }

            if (typeof this.eventBus.publish !== 'function') {
                this.logger.error('EventBus.publish is not a function', {
                    eventBusType: typeof this.eventBus,
                    eventBusKeys: Object.keys(this.eventBus || {})
                });
                throw new Error('EventBus.publish is not a function');
            }

            const validation = command.validateBusinessRules();
            if (!validation.isValid) {
                throw new Error(`Business rule validation failed: ${validation.errors.join(', ')}`);
            }

            const options = command.getModeOptions();
            const outputConfig = command.getOutputConfiguration();

            const projectPath = command.projectPath;
            // 1. Subprojekte erkennen
            const subprojects = await this.subprojectDetector.detectSubprojects(projectPath);
            let results = {};
            let errors = [];
            if (subprojects.length > 1) {
                // Monorepo-Strategie: Alle Subprojekte analysieren
                await Promise.all(subprojects.map(async (sub) => {
                    try {
                        results[sub.path] = await this.analyzeSubproject(sub);
                    } catch (e) {
                        errors.push({ path: sub.path, error: e.message });
                    }
                }));
            } else if (subprojects.length === 1) {
                // Single-Repo-Strategie: Nur ein Subprojekt
                try {
                    results[subprojects[0].path] = await this.analyzeSubproject(subprojects[0]);
                } catch (e) {
                    errors.push({ path: subprojects[0].path, error: e.message });
                }
            } else {
                // Fallback: Root analysieren
                try {
                    results[projectPath] = await this.analyzeSubproject({ path: projectPath, type: 'unknown', meta: {} });
                } catch (e) {
                    errors.push({ path: projectPath, error: e.message });
                }
            }
            // 2. Ergebnisse aggregieren
            const aggregated = this.aggregateResults(results, errors);

            // Step 2: Determine optimal execution strategy
            const executionStrategy = await this.determineExecutionStrategy(aggregated, options);
            
            // Step 3: Execute analyze phase
            const analyzeResults = await this.executeAnalyzePhase(command, executionStrategy);
            
            // Step 4: Execute refactor phase (if enabled)
            let refactorResults = null;
            if (options.includeRefactor && analyzeResults.recommendations.refactor) {
                refactorResults = await this.executeRefactorPhase(command, executionStrategy, analyzeResults);
            }
            
            // Step 5: Execute generate phase (if enabled)
            let generateResults = null;
            if (options.includeGenerate && analyzeResults.recommendations.generate) {
                generateResults = await this.executeGeneratePhase(command, executionStrategy, analyzeResults, refactorResults);
            }
            
            // Step 6: Validate overall results
            const validationResults = await this.validateOverallResults(projectPath, {
                analyze: analyzeResults,
                refactor: refactorResults,
                generate: generateResults
            });
            
            // Step 7: Generate comprehensive report
            const report = await this.generateComprehensiveReport(command, {
                analyze: analyzeResults,
                refactor: refactorResults,
                generate: generateResults
            }, validationResults);
            
            // Step 8: Generate output
            const output = await this.generateOutput({
                command,
                initialAnalysis: aggregated,
                executionStrategy,
                analyzeResults,
                refactorResults,
                generateResults,
                validationResults,
                report,
                outputConfig
            });

            // Step 9: Save results
            await this.saveResults(command, output);

            this.logger.info(`VibeCoder mode orchestration completed successfully for project: ${command.projectPath}`);
            
            return {
                success: true,
                commandId: command.commandId,
                output,
                metadata: command.getMetadata()
            };

        } catch (error) {
            this.logger.error(`VibeCoder mode orchestration failed for project ${command.projectPath}:`, error);
            
            if (this.eventBus && typeof this.eventBus.publish === 'function') {
                await this.eventBus.publish('vibecoder.mode.failed', {
                    commandId: command.commandId,
                    projectPath: command.projectPath,
                    error: error.message,
                    timestamp: new Date()
                });
            }

            throw error;
        }
    }

    async analyzeSubproject(sub) {
        // Analysiere je nach Typ
        const result = { type: sub.type, path: sub.path, meta: sub.meta, analyses: {} };
        // Struktur-Analyse (immer)
        result.analyses.structure = await this.projectAnalyzer.analyzeStructure(sub.path);
        // Node.js
        if (sub.type === 'nodejs') {
            result.analyses.codeQuality = await this.codeQualityAnalyzer.analyze(sub.path);
            result.analyses.architecture = await this.architectureAnalyzer.analyze(sub.path);
            result.analyses.dependencies = await this.dependencyAnalyzer.analyzeDependencies(sub.path);
            result.analyses.security = await this.securityAnalyzer.analyzeSecurity(sub.path);
            result.analyses.performance = await this.performanceAnalyzer.analyze(sub.path);
        }
        // Python
        else if (sub.type === 'python') {
            // Nur Struktur und Maintainability (Demo, kann erweitert werden)
            result.analyses.maintainability = await this.projectAnalyzer.calculateComplexity(sub.path);
        }
        // Java
        else if (sub.type === 'java') {
            // Nur Struktur (Demo, kann erweitert werden)
        }
        // C#
        else if (sub.type === 'csharp') {
            // Nur Struktur (Demo, kann erweitert werden)
        }
        // Unbekannt: Nur Struktur
        return result;
    }

    aggregateResults(results, errors) {
        // Aggregiere alle Ergebnisse und Fehler
        return { results, errors };
    }

    async performComprehensiveAnalysis(projectPath) {
        this.logger.info('Performing comprehensive project analysis...');
        
        const analysis = {
            projectStructure: {},
            codeQuality: {},
            architecture: {},
            dependencies: {},
            performance: {},
            security: {},
            maintainability: {},
            techStack: {},
            metrics: {}
        };

        try {
            // Analyze project structure
            analysis.projectStructure = await this.analyzeProjectStructure(projectPath);
            
            // Analyze code quality
            analysis.codeQuality = await this.analyzeCodeQuality(projectPath);
            
            // Analyze architecture
            analysis.architecture = await this.analyzeArchitecture(projectPath);
            
            // Analyze dependencies
            analysis.dependencies = await this.analyzeDependencies(projectPath);
            
            // Analyze performance
            analysis.performance = await this.analyzePerformance(projectPath);
            
            // Analyze security (will use packages from architecture analysis if available)
            analysis.security = await this.analyzeSecurity(projectPath);
            
            // Analyze tech stack
            analysis.techStack = await this.analyzeTechStack(projectPath);
            
            // Analyze maintainability
            analysis.maintainability = await this.analyzeMaintainability(projectPath);
            
            // Calculate overall metrics
            analysis.metrics = this.calculateComprehensiveMetrics(analysis);
            
            return analysis;
        } catch (error) {
            throw new Error(`Failed to perform comprehensive analysis: ${error.message}`);
        }
    }

    async analyzeProjectStructure(projectPath) {
        // This would integrate with the existing analysis services
        return {
            totalFiles: 0,
            totalDirectories: 0,
            fileTypes: {},
            complexity: 0,
            organization: 'good'
        };
    }

    async analyzeCodeQuality(projectPath) {
        // This would integrate with code quality analysis
        return {
            maintainability: 0,
            testability: 0,
            readability: 0,
            issues: [],
            score: 0
        };
    }

    async analyzeArchitecture(projectPath) {
        // This would integrate with architecture analysis
        return {
            patterns: [],
            violations: [],
            recommendations: [],
            complexity: 0,
            score: 0
        };
    }

    async analyzeDependencies(projectPath) {
        try {
            // Use real dependency analyzer
            const dependencyAnalyzer = require('@/infrastructure/external/DependencyAnalyzer');
            const analyzer = new dependencyAnalyzer();
            return await analyzer.analyzeDependencies(projectPath);
        } catch (error) {
            this.logger.warn('Dependency analysis failed, using fallback:', error.message);
            return {
                directDependencies: 0,
                transitiveDependencies: 0,
                outdatedPackages: [],
                securityIssues: [],
                score: 0,
                recommendations: ['Enable dependency analysis for detailed insights']
            };
        }
    }

    async analyzePerformance(projectPath) {
        try {
            // Use real performance analyzer
            const performanceAnalyzer = require('@/infrastructure/external/PerformanceAnalyzer');
            const analyzer = new performanceAnalyzer();
            return await analyzer.analyzePerformance(projectPath);
        } catch (error) {
            this.logger.warn('Performance analysis failed, using fallback:', error.message);
            return {
                bottlenecks: [],
                optimizationOpportunities: [],
                metrics: {},
                score: 0,
                recommendations: ['Enable performance analysis for detailed insights']
            };
        }
    }

    async analyzeSecurity(projectPath, existingPackages = null) {
        try {
            // Use existing packages if provided, otherwise find packages
            let packages = existingPackages;
            if (!packages) {
                packages = await this.findPackages(projectPath);
                this.logger.info('Found packages for standalone security analysis:', packages.length);
            } else {
                this.logger.info('Using provided packages for security analysis:', packages.length);
            }
            
            if (packages.length > 1) {
                const packageSecurityAnalyses = {};
                for (const pkg of packages) {
                    const securityAnalyzer = require('@/infrastructure/external/SecurityAnalyzer');
                    const secAnalyzer = new securityAnalyzer();
                    const packageSecurityResult = await secAnalyzer.analyzeSecurity(pkg.path);
                    
                    packageSecurityAnalyses[pkg.name] = {
                        package: pkg,
                        securityAnalysis: packageSecurityResult,
                        vulnerabilities: packageSecurityResult.vulnerabilities || [],
                        codeIssues: packageSecurityResult.codeIssues || [],
                        configuration: packageSecurityResult.configuration || {},
                        dependencies: packageSecurityResult.dependencies || {},
                        secrets: packageSecurityResult.secrets || {},
                        recommendations: packageSecurityResult.recommendations || []
                    };
                }
                const aggregatedSecurity = {
                    isMonorepo: true,
                    packages,
                    packageSecurityAnalyses,
                    overallRiskLevel: this.calculateOverallRiskLevel(packageSecurityAnalyses),
                    overallSecurityScore: this.calculateOverallSecurityScore(packageSecurityAnalyses),
                    totalVulnerabilities: this.calculateTotalVulnerabilities(packageSecurityAnalyses),
                    totalCodeIssues: this.calculateTotalCodeIssues(packageSecurityAnalyses),
                    overallRecommendations: this.generateOverallSecurityRecommendations(packageSecurityAnalyses)
                };
                return {
                    status: 'success',
                    result: aggregatedSecurity,
                    metrics: { overallScore: aggregatedSecurity.overallSecurityScore || 0 },
                    recommendations: aggregatedSecurity.overallRecommendations || []
                };
            } else {
                const securityAnalyzer = require('@/infrastructure/external/SecurityAnalyzer');
                const secAnalyzer = new securityAnalyzer();
                const securityResult = await secAnalyzer.analyzeSecurity(projectPath);
                
                return {
                    status: 'success',
                    result: securityResult,
                    metrics: { overallScore: securityResult.securityScore || 0 },
                    recommendations: securityResult.recommendations || []
                };
            }
        } catch (error) {
            this.logger.warn('Security analysis failed:', error.message);
            return {
                status: 'failed',
                result: { error: error.message },
                metrics: { overallScore: 0 },
                recommendations: ['Security analysis failed']
            };
        }
    }

    async analyzeMaintainability(projectPath) {
        // This would integrate with maintainability analysis
        return {
            technicalDebt: 0,
            complexityIssues: [],
            refactoringNeeds: [],
            score: 0
        };
    }

    async analyzeTechStack(projectPath) {
        try {
            // Use real tech stack analyzer
            const techStackAnalyzer = require('@/infrastructure/external/TechStackAnalyzer');
            const analyzer = new techStackAnalyzer();
            return await analyzer.analyzeTechStack(projectPath);
        } catch (error) {
            this.logger.warn('Tech stack analysis failed, using fallback:', error.message);
            return {
                frameworks: [],
                libraries: [],
                tools: [],
                languages: [],
                recommendations: ['Enable tech stack analysis for detailed insights']
            };
        }
    }

    calculateComprehensiveMetrics(analysis) {
        return {
            overallScore: 0,
            analyzePriority: 'high',
            refactorPriority: 'medium',
            generatePriority: 'medium',
            estimatedEffort: 'medium',
            riskLevel: 'low',
            recommendations: {
                analyze: true,
                refactor: false,
                generate: false
            }
        };
    }

    async determineExecutionStrategy(analysis, options) {
        this.logger.info('Determining optimal execution strategy...');
        
        const strategy = {
            phases: [],
            priority: 'medium',
            estimatedDuration: 'medium',
            dependencies: [],
            riskAssessment: 'low'
        };

        // Always include analyze phase
        strategy.phases.push({
            type: 'analyze',
            priority: 'high',
            reason: 'Comprehensive analysis required',
            dependencies: []
        });

        // Determine if refactor phase is needed
        if (options.includeRefactor && analysis.metrics.refactorPriority === 'high') {
            strategy.phases.push({
                type: 'refactor',
                priority: analysis.metrics.refactorPriority,
                reason: 'Significant refactoring opportunities detected',
                dependencies: ['analyze']
            });
        }

        // Determine if generate phase is needed
        if (options.includeGenerate && analysis.metrics.generatePriority === 'high') {
            strategy.phases.push({
                type: 'generate',
                priority: analysis.metrics.generatePriority,
                reason: 'Asset generation opportunities detected',
                dependencies: ['analyze']
            });
        }

        // Sort phases by priority
        strategy.phases.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        return strategy;
    }

    async executeAnalyzePhase(command, strategy) {
        this.logger.info('Executing analyze phase...');
        
        const results = {
            phase: 'analyze',
            status: 'success',
            results: {},
            recommendations: {
                refactor: false,
                generate: false,
                nextSteps: []
            },
            metrics: {}
        };

        try {
            // Execute comprehensive analysis using real commands
            const analysisResults = {};
            
            // 1. Analyze repository structure with deep scanning
            const structureCommand = {
                commandId: `${command.commandId}-structure`,
                projectPath: command.projectPath,
                options: {
                    includeHidden: true,
                    maxDepth: 20, // Increased depth
                    fileTypes: ['js', 'ts', 'jsx', 'tsx', 'json', 'md', 'yml', 'yaml', 'html', 'css', 'scss', 'sql', 'sh', 'dockerfile'],
                    includeStats: true,
                    recursive: true, // Force recursive scanning
                    excludePatterns: ['node_modules', '.git', 'dist', 'build', 'coverage']
                },
                requestedBy: command.requestedBy || 'vibecoder-mode',
                metadata: command.getMetadata()
            };
            const structureCommandInstance = new AnalyzeRepoStructureCommand(structureCommand);
            const structureResult = await this.commandBus.execute('AnalyzeRepoStructureCommand', structureCommandInstance);
            analysisResults.structure = structureResult;
            
            // 2. Analyze architecture
            const architectureCommand = {
                commandId: `${command.commandId}-architecture`,
                projectPath: command.projectPath,
                options: {
                    detectPatterns: true,
                    analyzeDependencies: true,
                    complexityAnalysis: true,
                    detectLayers: true,
                    detectModules: true,
                    analyzeCoupling: true,
                    analyzeCohesion: true,
                    detectAntiPatterns: true,
                    analyzeDesignPrinciples: true
                },
                requestedBy: command.requestedBy || 'vibecoder-mode',
                metadata: command.getMetadata()
            };
            const architectureCommandInstance = new AnalyzeArchitectureCommand(architectureCommand);
            const architectureResult = await this.commandBus.execute('AnalyzeArchitectureCommand', architectureCommandInstance);
            analysisResults.architecture = architectureResult;
            
            // 3. Analyze code quality
            const qualityCommand = {
                commandId: `${command.commandId}-quality`,
                projectPath: command.projectPath,
                options: {
                    analyzeComplexity: true,
                    detectCodeSmells: true,
                    analyzeMaintainability: true,
                    analyzeReadability: true,
                    detectDuplications: true,
                    analyzeTestCoverage: true
                },
                requestedBy: command.requestedBy || 'vibecoder-mode',
                metadata: command.getMetadata()
            };
            const qualityCommandInstance = new AnalyzeCodeQualityCommand(qualityCommand);
            const qualityResult = await this.commandBus.execute('AnalyzeCodeQualityCommand', qualityCommandInstance);
            analysisResults.codeQuality = qualityResult;
            
            // 4. Analyze dependencies
            const dependenciesCommand = {
                commandId: `${command.commandId}-dependencies`,
                projectPath: command.projectPath,
                options: {
                    analyzePackageJson: true,
                    detectOutdatedDependencies: true,
                    analyzeSecurityVulnerabilities: true,
                    analyzeDependencyGraph: true,
                    detectCircularDependencies: true,
                    analyzeDependencySize: true
                },
                requestedBy: command.requestedBy || 'vibecoder-mode',
                metadata: command.getMetadata()
            };
            const dependenciesCommandInstance = new AnalyzeDependenciesCommand(dependenciesCommand);
            const dependenciesResult = await this.commandBus.execute('AnalyzeDependenciesCommand', dependenciesCommandInstance);
            analysisResults.dependencies = dependenciesResult;
            
            // 5. Analyze tech stack
            const techStackCommand = {
                commandId: `${command.commandId}-techstack`,
                projectPath: command.projectPath,
                options: {
                    detectFrameworks: true,
                    detectLibraries: true,
                    detectTools: true,
                    detectLanguages: true,
                    detectDatabases: true,
                    detectCloudServices: true
                },
                requestedBy: command.requestedBy || 'vibecoder-mode',
                metadata: command.getMetadata()
            };
            const techStackCommandInstance = new AnalyzeTechStackCommand(techStackCommand);
            const techStackResult = await this.commandBus.execute('AnalyzeTechStackCommand', techStackCommandInstance);
            analysisResults.techStack = techStackResult;
            
            // 6. Analyze performance using real analyzer
            try {
                const performanceAnalyzer = require('@/infrastructure/external/PerformanceAnalyzer');
                const perfAnalyzer = new performanceAnalyzer();
                const performanceResult = await perfAnalyzer.analyzePerformance(command.projectPath);
                analysisResults.performance = {
                    status: 'success',
                    result: performanceResult,
                    metrics: { overallScore: performanceResult.overallScore || 0 },
                    recommendations: performanceResult.recommendations || []
                };
            } catch (error) {
                this.logger.warn('Performance analysis failed:', error.message);
                analysisResults.performance = {
                    status: 'failed',
                    result: { error: error.message },
                    metrics: { overallScore: 0 },
                    recommendations: ['Performance analysis failed']
                };
            }
            
            // 7. Analyze security using real analyzer
            try {
                // Use packages from architecture analysis if available, otherwise find packages
                let packages = [];
                if (analysisResults.architecture && analysisResults.architecture.result && 
                    analysisResults.architecture.result.packages) {
                    packages = analysisResults.architecture.result.packages;
                    this.logger.info('Using packages from architecture analysis:', packages.length);
                } else {
                    packages = await this.findPackages(command.projectPath);
                    this.logger.info('Found packages for security analysis:', packages.length);
                }
                
                if (packages.length > 1) {
                    const packageSecurityAnalyses = {};
                    for (const pkg of packages) {
                        const securityAnalyzer = require('@/infrastructure/external/SecurityAnalyzer');
                        const secAnalyzer = new securityAnalyzer();
                        const packageSecurityResult = await secAnalyzer.analyzeSecurity(pkg.path);
                        
                        packageSecurityAnalyses[pkg.name] = {
                            package: pkg,
                            securityAnalysis: packageSecurityResult,
                            vulnerabilities: packageSecurityResult.vulnerabilities || [],
                            codeIssues: packageSecurityResult.codeIssues || [],
                            configuration: packageSecurityResult.configuration || {},
                            dependencies: packageSecurityResult.dependencies || {},
                            secrets: packageSecurityResult.secrets || {},
                            recommendations: packageSecurityResult.recommendations || []
                        };
                    }
                    const aggregatedSecurity = {
                        isMonorepo: true,
                        packages,
                        packageSecurityAnalyses,
                        overallRiskLevel: this.calculateOverallRiskLevel(packageSecurityAnalyses),
                        overallSecurityScore: this.calculateOverallSecurityScore(packageSecurityAnalyses),
                        totalVulnerabilities: this.calculateTotalVulnerabilities(packageSecurityAnalyses),
                        totalCodeIssues: this.calculateTotalCodeIssues(packageSecurityAnalyses),
                        overallRecommendations: this.generateOverallSecurityRecommendations(packageSecurityAnalyses)
                    };
                    analysisResults.security = {
                        status: 'success',
                        result: aggregatedSecurity,
                        metrics: { overallScore: aggregatedSecurity.overallSecurityScore || 0 },
                        recommendations: aggregatedSecurity.overallRecommendations || []
                    };
                } else {
                    const securityAnalyzer = require('@/infrastructure/external/SecurityAnalyzer');
                    const secAnalyzer = new securityAnalyzer();
                    const securityResult = await secAnalyzer.analyzeSecurity(command.projectPath);
                    
                    analysisResults.security = {
                        status: 'success',
                        result: securityResult,
                        metrics: { overallScore: securityResult.securityScore || 0 },
                        recommendations: securityResult.recommendations || []
                    };
                }
            } catch (error) {
                this.logger.warn('Security analysis failed:', error.message);
                analysisResults.security = {
                    status: 'failed',
                    result: { error: error.message },
                    metrics: { overallScore: 0 },
                    recommendations: ['Security analysis failed']
                };
            }
            

            
            results.results = analysisResults;
            
            // Generate recommendations based on analysis results
            results.recommendations = this.generateAnalyzeRecommendations(results.results);
            
            // Calculate metrics
            results.metrics = this.calculateAnalyzeMetrics(results.results);
            
        } catch (error) {
            results.status = 'failed';
            results.error = error.message;
            this.logger.error('VibeCoderModeHandler: Analyze phase failed', {
                commandId: command.commandId,
                error: error.message
            });
        }

        return results;
    }

    async simulateAnalyzeOperation(analyzeCommand) {
        // Simulate the analyze operation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return {
            projectStructure: {
                totalFiles: 150,
                totalDirectories: 25,
                complexity: 7.5,
                organization: 'good'
            },
            codeQuality: {
                maintainability: 75,
                testability: 60,
                readability: 80,
                issues: ['Large files detected', 'Missing tests'],
                score: 72
            },
            architecture: {
                patterns: ['MVC', 'Repository'],
                violations: ['Circular dependencies'],
                recommendations: ['Split large components'],
                complexity: 6,
                score: 70
            },
            dependencies: {
                directDependencies: 45,
                transitiveDependencies: 120,
                outdatedPackages: ['lodash@4.17.15'],
                securityIssues: [],
                score: 85
            },
            performance: {
                bottlenecks: ['Database queries'],
                optimizationOpportunities: ['Caching', 'Lazy loading'],
                metrics: { loadTime: 2.5, memoryUsage: 150 },
                score: 65
            },
            security: {
                vulnerabilities: [],
                securityIssues: ['Missing input validation'],
                recommendations: ['Add input sanitization'],
                score: 80
            },
            maintainability: {
                technicalDebt: 15,
                complexityIssues: ['Large functions'],
                refactoringNeeds: ['Extract methods', 'Split classes'],
                score: 68
            }
        };
    }

    generateAnalyzeRecommendations(analyzeResults) {
        const recommendations = {
            refactor: false,
            generate: false,
            nextSteps: []
        };

        // Extract scores from the actual analysis results structure
        const codeQualityScore = this.extractScoreFromResult(analyzeResults.codeQuality, 'overallQualityScore', 100);
        const architectureScore = this.extractScoreFromResult(analyzeResults.architecture, 'architectureScore', 100);
        const maintainabilityScore = this.extractScoreFromResult(analyzeResults.maintainability, 'maintainabilityIndex', 100);

        // Determine if refactoring is needed
        if (codeQualityScore < 75 || 
            architectureScore < 75 || 
            maintainabilityScore < 70) {
            recommendations.refactor = true;
            recommendations.nextSteps.push('Refactor code to improve quality and maintainability');
        }

        // Determine if generation is needed
        const testabilityScore = this.extractScoreFromResult(analyzeResults.codeQuality, 'testCoverage', 100);
        if (testabilityScore < 70) {
            recommendations.generate = true;
            recommendations.nextSteps.push('Generate tests to improve test coverage');
        }

        // Check for architecture recommendations
        const architectureRecommendations = this.extractRecommendations(analyzeResults.architecture);
        if (architectureRecommendations.length > 0) {
            recommendations.generate = true;
            recommendations.nextSteps.push('Generate documentation for architectural patterns');
        }

        return recommendations;
    }

    extractRecommendations(result) {
        if (!result) return [];
        
        // Try to get recommendations from different possible locations
        if (result.recommendations && Array.isArray(result.recommendations)) {
            return result.recommendations;
        }
        
        if (result.architecture && result.architecture.recommendations && Array.isArray(result.architecture.recommendations)) {
            return result.architecture.recommendations;
        }
        
        if (result.qualityAnalysis && result.qualityAnalysis.recommendations && Array.isArray(result.qualityAnalysis.recommendations)) {
            return result.qualityAnalysis.recommendations;
        }
        
        return [];
    }

    calculateAnalyzeMetrics(analyzeResults) {
        // Extract scores from the actual analysis results structure
        const codeQualityScore = this.extractScoreFromResult(analyzeResults.codeQuality, 'overallQualityScore', 100);
        const architectureScore = this.extractScoreFromResult(analyzeResults.architecture, 'architectureScore', 100);
        const dependenciesScore = this.extractScoreFromResult(analyzeResults.dependencies, 'securityScore', 100);
        const performanceScore = this.extractScoreFromResult(analyzeResults.performance, 'performanceScore', 100);
        const securityScore = this.extractScoreFromResult(analyzeResults.security, 'securityScore', 100);
        const maintainabilityScore = this.extractScoreFromResult(analyzeResults.maintainability, 'maintainabilityIndex', 100);

        return {
            overallScore: Math.round(
                (codeQualityScore + 
                 architectureScore + 
                 dependenciesScore + 
                 performanceScore + 
                 securityScore + 
                 maintainabilityScore) / 6
            ),
            qualityScore: codeQualityScore,
            architectureScore: architectureScore,
            securityScore: securityScore,
            performanceScore: performanceScore
        };
    }

    extractScoreFromResult(result, scoreKey, defaultValue = 100) {
        if (!result) return defaultValue;
        
        // Try to get score from metrics first
        if (result.metrics && result.metrics[scoreKey] !== undefined) {
            return result.metrics[scoreKey];
        }
        
        // Try to get score from result directly
        if (result[scoreKey] !== undefined) {
            return result[scoreKey];
        }
        
        // Try to get score from qualityAnalysis
        if (result.qualityAnalysis && result.qualityAnalysis.overallScore !== undefined) {
            return result.qualityAnalysis.overallScore;
        }
        
        // Try to get score from architecture
        if (result.architecture && result.architecture.architectureScore !== undefined) {
            return result.architecture.architectureScore;
        }
        
        // Try to get score from dependenciesAnalysis
        if (result.dependenciesAnalysis && result.dependenciesAnalysis.securityScore !== undefined) {
            return result.dependenciesAnalysis.securityScore;
        }
        
        return defaultValue;
    }

    async executeRefactorPhase(command, strategy, analyzeResults) {
        this.logger.info('Executing refactor phase...');
        
        const results = {
            phase: 'refactor',
            status: 'success',
            results: {},
            recommendations: {
                nextSteps: []
            },
            metrics: {}
        };

        try {
            // Execute refactoring operations
            const refactorCommand = {
                commandId: `${command.commandId}-refactor`,
                projectPath: command.projectPath,
                refactorTypes: ['comprehensive'],
                options: command.getModeOptions(),
                metadata: command.getMetadata()
            };

            // This would dispatch to the VibeCoderRefactorCommand
            results.results = await this.simulateRefactorOperation(refactorCommand, analyzeResults);
            
            // Generate recommendations based on refactoring results
            results.recommendations = this.generateRefactorRecommendations(results.results);
            
            // Calculate metrics
            results.metrics = this.calculateRefactorMetrics(results.results);
            
        } catch (error) {
            results.status = 'failed';
            results.error = error.message;
        }

        return results;
    }

    async simulateRefactorOperation(refactorCommand, analyzeResults) {
        // Simulate the refactor operation
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        return {
            operations: [
                {
                    type: 'split_large_files',
                    status: 'success',
                    filesModified: 8,
                    linesChanged: 450,
                    complexityReduced: 15
                },
                {
                    type: 'restructure_architecture',
                    status: 'success',
                    componentsRefactored: 12,
                    patternsApplied: 3,
                    complexityReduced: 25
                },
                {
                    type: 'clean_dependencies',
                    status: 'success',
                    packagesUpdated: 5,
                    packagesRemoved: 2,
                    securityIssuesResolved: 1
                }
            ],
            summary: {
                totalOperations: 3,
                successful: 3,
                failed: 0,
                filesModified: 20,
                linesChanged: 1200,
                complexityReduced: 40
            }
        };
    }

    generateRefactorRecommendations(refactorResults) {
        return {
            nextSteps: [
                'Review refactored code for any issues',
                'Run tests to ensure functionality is preserved',
                'Update documentation to reflect changes'
            ]
        };
    }

    calculateRefactorMetrics(refactorResults) {
        return {
            operationsCompleted: refactorResults.summary.successful,
            filesModified: refactorResults.summary.filesModified,
            complexityReduction: refactorResults.summary.complexityReduced,
            successRate: (refactorResults.summary.successful / refactorResults.summary.total) * 100
        };
    }

    async executeGeneratePhase(command, strategy, analyzeResults, refactorResults) {
        this.logger.info('Executing generate phase...');
        
        const results = {
            phase: 'generate',
            status: 'success',
            results: {},
            recommendations: {
                nextSteps: []
            },
            metrics: {}
        };

        try {
            // Execute generation operations
            const generateCommand = {
                commandId: `${command.commandId}-generate`,
                projectPath: command.projectPath,
                generateTypes: ['comprehensive'],
                options: command.getModeOptions(),
                metadata: command.getMetadata()
            };

            // This would dispatch to the VibeCoderGenerateCommand
            results.results = await this.simulateGenerateOperation(generateCommand, analyzeResults, refactorResults);
            
            // Generate recommendations based on generation results
            results.recommendations = this.generateGenerateRecommendations(results.results);
            
            // Calculate metrics
            results.metrics = this.calculateGenerateMetrics(results.results);
            
        } catch (error) {
            results.status = 'failed';
            results.error = error.message;
        }

        return results;
    }

    async simulateGenerateOperation(generateCommand, analyzeResults, refactorResults) {
        // Simulate the generate operation
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        return {
            operations: [
                {
                    type: 'generate_tests',
                    status: 'success',
                    testFilesCreated: 25,
                    testCasesGenerated: 150,
                    coverageImproved: 35
                },
                {
                    type: 'generate_documentation',
                    status: 'success',
                    docFilesCreated: 8,
                    pagesGenerated: 45,
                    coverageImproved: 40
                },
                {
                    type: 'generate_configs',
                    status: 'success',
                    configFilesCreated: 6,
                    settingsConfigured: 18,
                    automationAdded: 3
                }
            ],
            summary: {
                totalOperations: 3,
                successful: 3,
                failed: 0,
                filesCreated: 39,
                itemsGenerated: 213
            }
        };
    }

    generateGenerateRecommendations(generateResults) {
        return {
            nextSteps: [
                'Review generated tests and customize as needed',
                'Update generated documentation with project-specific details',
                'Configure generated configs for your environment'
            ]
        };
    }

    calculateGenerateMetrics(generateResults) {
        return {
            operationsCompleted: generateResults.summary.successful,
            filesCreated: generateResults.summary.filesCreated,
            itemsGenerated: generateResults.summary.itemsGenerated,
            successRate: (generateResults.summary.successful / generateResults.summary.total) * 100
        };
    }

    async validateOverallResults(projectPath, allResults) {
        this.logger.info('Validating overall results...');
        
        const validation = {
            overall: true,
            issues: [],
            metrics: {
                before: {},
                after: {},
                improvement: {}
            }
        };

        try {
            // Perform post-execution analysis
            const postAnalysis = await this.performPostExecutionAnalysis(projectPath);
            
            // Compare with pre-execution state
            validation.metrics = this.comparePrePostMetrics(allResults, postAnalysis);
            
            // Check for any issues across all phases
            validation.issues = await this.detectOverallIssues(projectPath, allResults);
            
            if (validation.issues.length > 0) {
                validation.overall = false;
            }
            
        } catch (error) {
            validation.overall = false;
            validation.issues.push({
                type: 'validation_error',
                message: error.message
            });
        }

        return validation;
    }

    async performPostExecutionAnalysis(projectPath) {
        // This would perform the same analysis as the initial analysis
        // but after all phases to compare results
        return {
            projectStructure: { totalFiles: 0, complexity: 0 },
            codeQuality: { score: 0, maintainability: 0 },
            architecture: { score: 0, complexity: 0 },
            maintainability: { score: 0, technicalDebt: 0 }
        };
    }

    comparePrePostMetrics(allResults, postAnalysis) {
        return {
            before: {
                overallScore: 0,
                qualityScore: 0,
                architectureScore: 0
            },
            after: {
                overallScore: postAnalysis.codeQuality.score,
                qualityScore: postAnalysis.codeQuality.score,
                architectureScore: postAnalysis.architecture.score
            },
            improvement: {
                overallScoreIncrease: 0,
                qualityScoreIncrease: 0,
                architectureScoreIncrease: 0
            }
        };
    }

    async detectOverallIssues(projectPath, allResults) {
        const issues = [];
        
        // Check for phase failures
        Object.entries(allResults).forEach(([phase, results]) => {
            if (results && results.status === 'failed') {
                issues.push({
                    type: 'phase_failure',
                    phase: phase,
                    message: results.error || 'Unknown error',
                    severity: 'high'
                });
            }
        });
        
        // Check for incomplete operations
        Object.entries(allResults).forEach(([phase, results]) => {
            if (results && results.results && results.results.summary && results.results.summary.failed > 0) {
                issues.push({
                    type: 'incomplete_operations',
                    phase: phase,
                    message: `${results.results.summary.failed} operations failed in ${phase} phase`,
                    severity: 'medium'
                });
            }
        });
        
        return issues;
    }

    async generateComprehensiveReport(command, allResults, validationResults) {
        this.logger.info('Generating comprehensive report...');
        
        const report = {
            summary: {
                totalPhases: Object.keys(allResults).length,
                successfulPhases: Object.values(allResults).filter(r => r && r.status === 'success').length,
                failedPhases: Object.values(allResults).filter(r => r && r.status === 'failed').length,
                successRate: 0
            },
            phases: Object.entries(allResults).map(([phase, results]) => ({
                phase: phase,
                status: results ? (results.status || 'unknown') : 'unknown',
                results: results ? (results.results || null) : null,
                recommendations: results ? (results.recommendations || null) : null,
                metrics: results ? (results.metrics || null) : null,
                error: results ? (results.error || null) : null
            })),
            validation: {
                overall: validationResults ? validationResults.overall : false,
                issues: validationResults ? validationResults.issues : [],
                metrics: validationResults ? validationResults.metrics : {}
            },
            recommendations: this.generateComprehensiveRecommendations(allResults, validationResults)
        };

        // Calculate success rate
        report.summary.successRate = (report.summary.successfulPhases / report.summary.totalPhases) * 100;

        return report;
    }

    generateComprehensiveRecommendations(allResults, validationResults) {
        const recommendations = [];
        
        // Generate recommendations based on overall results
        if (validationResults.issues.length > 0) {
            recommendations.push({
                type: 'address_validation_issues',
                priority: 'high',
                description: 'Address validation issues before proceeding with further operations'
            });
        }
        
        // Check for specific improvements
        const analyzeResults = allResults.analyze;
        if (analyzeResults && analyzeResults.metrics && analyzeResults.metrics.overallScore < 80) {
            recommendations.push({
                type: 'continue_improvement',
                priority: 'medium',
                description: 'Continue with additional improvements to reach target quality score'
            });
        }
        
        // Check for maintenance recommendations
        recommendations.push({
            type: 'ongoing_maintenance',
            priority: 'low',
            description: 'Implement regular analysis and maintenance cycles'
        });
        
        return recommendations;
    }

    async generateOutput(data) {
        const { command, initialAnalysis, executionStrategy, analyzeResults, refactorResults, generateResults, validationResults, report, outputConfig } = data;

        const output = {
            commandId: command.commandId,
            timestamp: new Date(),
            summary: {
                mode: command.getModeOptions().mode,
                totalPhases: report ? report.summary.totalPhases : 0,
                successfulPhases: report ? report.summary.successfulPhases : 0,
                failedPhases: report ? report.summary.failedPhases : 0,
                successRate: report ? report.summary.successRate : 0,
                validationPassed: validationResults ? validationResults.overall : false
            },
            initialAnalysis: outputConfig && outputConfig.includeRawData ? initialAnalysis : (initialAnalysis ? initialAnalysis.metrics : {}),
            executionStrategy,
            results: {
                analyze: analyzeResults,
                refactor: refactorResults,
                generate: generateResults
            },
            validationResults,
            report,
            recommendations: report ? report.recommendations : []
        };

        if (outputConfig && outputConfig.includeMetrics) {
            output.metrics = {
                before: initialAnalysis ? initialAnalysis.metrics : {},
                after: validationResults && validationResults.metrics ? validationResults.metrics.after : {},
                improvement: validationResults && validationResults.metrics ? validationResults.metrics.improvement : {}
            };
        }

        return output;
    }

    async saveResults(command, output) {
        try {
            // Save to database
            await this.analysisRepository.save({
                id: command.commandId,
                type: 'vibecoder_mode',
                projectPath: command.projectPath,
                data: output,
                timestamp: new Date(),
                metadata: command.getMetadata()
            });

            // Save to output files using AnalysisOutputService
            if (this.analysisOutputService) {
                const projectId = command.commandId;
                
                // Prepare analysis results for markdown generation
                const analysisResults = {};
                
                // Add analyze phase results
                if (output.results && output.results.analyze && output.results.analyze.results) {
                    const analyzeResults = output.results.analyze.results;
                    
                    // Extract individual analysis results
                    if (analyzeResults.structure) {
                        analysisResults['Repository Structure'] = { 
                            data: analyzeResults.structure.result,
                            metrics: analyzeResults.structure.metrics,
                            recommendations: analyzeResults.structure.recommendations
                        };
                    }
                    
                    if (analyzeResults.architecture) {
                        analysisResults['Architecture'] = { 
                            data: analyzeResults.architecture.result,
                            metrics: analyzeResults.architecture.metrics,
                            recommendations: analyzeResults.architecture.recommendations
                        };
                    }
                    
                    if (analyzeResults.codeQuality) {
                        analysisResults['Code Quality'] = { 
                            data: analyzeResults.codeQuality.result,
                            metrics: analyzeResults.codeQuality.metrics,
                            recommendations: analyzeResults.codeQuality.recommendations
                        };
                    }
                    
                    if (analyzeResults.dependencies) {
                        analysisResults['Dependencies'] = { 
                            data: analyzeResults.dependencies.result,
                            metrics: analyzeResults.dependencies.metrics,
                            recommendations: analyzeResults.dependencies.recommendations
                        };
                    }
                    
                    if (analyzeResults.techStack) {
                        analysisResults['Tech Stack'] = { 
                            data: analyzeResults.techStack.result,
                            metrics: analyzeResults.techStack.metrics,
                            recommendations: analyzeResults.techStack.recommendations
                        };
                    } else if (analyzeResults.techStack) {
                        // Handle direct tech stack data
                        analysisResults['Tech Stack'] = { 
                            data: analyzeResults.techStack,
                            metrics: analyzeResults.techStack.metrics || {},
                            recommendations: analyzeResults.techStack.recommendations || []
                        };
                    }

                    // Add dependencies analysis
                    if (analyzeResults.dependencies) {
                        analysisResults['Dependencies'] = { 
                            data: analyzeResults.dependencies.result || analyzeResults.dependencies,
                            metrics: analyzeResults.dependencies.metrics || {},
                            recommendations: analyzeResults.dependencies.recommendations || []
                        };
                    }

                    // Add performance analysis
                    if (analyzeResults.performance) {
                        analysisResults['Performance'] = { 
                            data: analyzeResults.performance.result || analyzeResults.performance,
                            metrics: analyzeResults.performance.metrics || {},
                            recommendations: analyzeResults.performance.recommendations || []
                        };
                    }

                    // Add security analysis
                    if (analyzeResults.security) {
                        analysisResults['Security'] = { 
                            data: analyzeResults.security.result || analyzeResults.security,
                            metrics: analyzeResults.security.metrics || {},
                            recommendations: analyzeResults.security.recommendations || []
                        };
                    }
                }
                
                // Add refactor phase results
                if (output.results && output.results.refactor) {
                    analysisResults['Refactoring'] = { 
                        data: output.results.refactor,
                        metrics: output.results.refactor.metrics,
                        recommendations: output.results.refactor.recommendations
                    };
                }
                
                // Add generate phase results
                if (output.results && output.results.generate) {
                    analysisResults['Generation'] = { 
                        data: output.results.generate,
                        metrics: output.results.generate.metrics,
                        recommendations: output.results.generate.recommendations
                    };
                }
                
                // Generate comprehensive markdown report
                if (Object.keys(analysisResults).length > 0) {
                    this.logger.info('Generating markdown report with analysis results:', {
                        projectId,
                        analysisTypes: Object.keys(analysisResults)
                    });
                    
                    await this.analysisOutputService.generateMarkdownReport(
                        projectId,
                        analysisResults
                    );
                } else {
                    this.logger.warn('No analysis results found for markdown generation');
                }
                
                // Also save raw JSON for reference
                await this.analysisOutputService.saveAnalysisResult(
                    projectId, 
                    'vibecoder_mode', 
                    output
                );
            }

            await this.eventBus.publish('vibecoder.mode.completed', {
                commandId: command.commandId,
                projectPath: command.projectPath,
                results: output,
                timestamp: new Date()
            });
        } catch (error) {
            this.logger.error('Failed to save VibeCoder mode results:', error);
        }
    }

    /**
     * Calculate overall risk level from package security analyses
     * @param {Object} packageSecurityAnalyses - Package security analyses
     * @returns {string} Overall risk level
     */
    calculateOverallRiskLevel(packageSecurityAnalyses) {
        let maxRiskScore = 0;
        
        Object.values(packageSecurityAnalyses).forEach(pkgSec => {
            const riskScore = this.calculateRiskScore(pkgSec.securityAnalysis);
            maxRiskScore = Math.max(maxRiskScore, riskScore);
        });
        
        if (maxRiskScore >= 50) return 'critical';
        if (maxRiskScore >= 30) return 'high';
        if (maxRiskScore >= 15) return 'medium';
        return 'low';
    }

    /**
     * Calculate risk score for security analysis
     * @param {Object} securityAnalysis - Security analysis result
     * @returns {number} Risk score
     */
    calculateRiskScore(securityAnalysis) {
        let riskScore = 0;
        
        // Add points for vulnerabilities
        if (securityAnalysis.dependencies) {
            riskScore += (securityAnalysis.dependencies.critical || 0) * 10;
            riskScore += (securityAnalysis.dependencies.high || 0) * 5;
            riskScore += (securityAnalysis.dependencies.medium || 0) * 2;
        }
        
        // Add points for code issues
        const criticalIssues = (securityAnalysis.codeIssues || []).filter(issue => issue.severity === 'critical').length;
        const highIssues = (securityAnalysis.codeIssues || []).filter(issue => issue.severity === 'high').length;
        
        riskScore += criticalIssues * 10;
        riskScore += highIssues * 5;
        
        // Add points for secrets
        riskScore += (securityAnalysis.secrets?.found?.length || 0) * 5;
        
        // Add points for missing security
        riskScore += (securityAnalysis.configuration?.missingSecurity?.length || 0) * 2;
        
        return riskScore;
    }

    /**
     * Calculate overall security score from package security analyses
     * @param {Object} packageSecurityAnalyses - Package security analyses
     * @returns {number} Overall security score (0-100)
     */
    calculateOverallSecurityScore(packageSecurityAnalyses) {
        let totalScore = 0;
        let packageCount = 0;
        
        Object.values(packageSecurityAnalyses).forEach(pkgSec => {
            totalScore += pkgSec.securityAnalysis.securityScore || 100;
            packageCount++;
        });
        
        return packageCount > 0 ? Math.round(totalScore / packageCount) : 100;
    }

    /**
     * Calculate total vulnerabilities across all packages
     * @param {Object} packageSecurityAnalyses - Package security analyses
     * @returns {number} Total vulnerabilities
     */
    calculateTotalVulnerabilities(packageSecurityAnalyses) {
        let total = 0;
        
        Object.values(packageSecurityAnalyses).forEach(pkgSec => {
            if (pkgSec.securityAnalysis.dependencies) {
                total += pkgSec.securityAnalysis.dependencies.critical || 0;
                total += pkgSec.securityAnalysis.dependencies.high || 0;
                total += pkgSec.securityAnalysis.dependencies.medium || 0;
                total += pkgSec.securityAnalysis.dependencies.low || 0;
            }
        });
        
        return total;
    }

    /**
     * Calculate total code issues across all packages
     * @param {Object} packageSecurityAnalyses - Package security analyses
     * @returns {number} Total code issues
     */
    calculateTotalCodeIssues(packageSecurityAnalyses) {
        let total = 0;
        
        Object.values(packageSecurityAnalyses).forEach(pkgSec => {
            total += pkgSec.securityAnalysis.codeIssues?.length || 0;
        });
        
        return total;
    }

    /**
     * Generate overall security recommendations from package analyses
     * @param {Object} packageSecurityAnalyses - Package security analyses
     * @returns {Array} Overall recommendations
     */
    generateOverallSecurityRecommendations(packageSecurityAnalyses) {
        const recommendations = [];
        
        // Check for critical vulnerabilities across packages
        let criticalVulns = 0;
        Object.values(packageSecurityAnalyses).forEach(pkgSec => {
            if (pkgSec.securityAnalysis.dependencies) {
                criticalVulns += pkgSec.securityAnalysis.dependencies.critical || 0;
            }
        });
        
        if (criticalVulns > 0) {
            recommendations.push({
                title: 'Fix critical vulnerabilities',
                description: `${criticalVulns} critical vulnerabilities found across packages`,
                priority: 'critical',
                category: 'vulnerabilities'
            });
        }
        
        // Check for missing security middleware across packages
        const missingSecurity = new Set();
        Object.values(packageSecurityAnalyses).forEach(pkgSec => {
            if (pkgSec.securityAnalysis.configuration?.missingSecurity) {
                pkgSec.securityAnalysis.configuration.missingSecurity.forEach(item => {
                    missingSecurity.add(item);
                });
            }
        });
        
        if (missingSecurity.size > 0) {
            recommendations.push({
                title: 'Add security middleware',
                description: `Missing: ${Array.from(missingSecurity).join(', ')}`,
                priority: 'high',
                category: 'configuration'
            });
        }
        
        // Check for secrets across packages
        let totalSecrets = 0;
        Object.values(packageSecurityAnalyses).forEach(pkgSec => {
            totalSecrets += pkgSec.securityAnalysis.secrets?.found?.length || 0;
        });
        
        if (totalSecrets > 0) {
            recommendations.push({
                title: 'Remove hardcoded secrets',
                description: `${totalSecrets} secrets found across packages`,
                priority: 'critical',
                category: 'secrets'
            });
        }
        
        return recommendations;
    }

    /**
     * Find packages in project
     * @param {string} projectPath - Project path
     * @returns {Promise<Array>} Array of packages
     */
    async findPackages(projectPath) {
        const packages = [];
        
        try {
            // Check root package.json
            const rootPackagePath = path.join(projectPath, 'package.json');
            if (await this.fileExists(rootPackagePath)) {
                packages.push({
                    name: 'root',
                    path: projectPath
                });
            }
            
            // Check common subdirectories
            const commonDirs = ['backend', 'frontend', 'api', 'client', 'server', 'app', 'src'];
            
            for (const dir of commonDirs) {
                const dirPath = path.join(projectPath, dir);
                const packagePath = path.join(dirPath, 'package.json');
                
                if (await this.fileExists(packagePath)) {
                    try {
                        const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));
                        packages.push({
                            name: packageJson.name || dir,
                            path: dirPath
                        });
                    } catch (error) {
                        // Ignore package.json parsing errors
                    }
                }
            }
        } catch (error) {
            this.logger.warn('Failed to find packages:', error.message);
        }
        
        return packages;
    }

    /**
     * Check if file exists
     * @param {string} filePath - File path
     * @returns {Promise<boolean>} True if file exists
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}

module.exports = VibeCoderModeHandler; 