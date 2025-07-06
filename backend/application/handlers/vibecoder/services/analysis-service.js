/**
 * Analysis Service - Business logic for VibeCoder analysis operations
 */

const ANALYSIS_CONSTANTS = require('../constants/analysis-constants');

class AnalysisService {
    constructor(dependencies = {}) {
        this.logger = dependencies.logger || console;
        this.projectAnalyzer = dependencies.projectAnalyzer;
        this.codeQualityAnalyzer = dependencies.codeQualityAnalyzer;
        this.architectureAnalyzer = dependencies.architectureAnalyzer;
        this.dependencyAnalyzer = dependencies.dependencyAnalyzer;
        this.securityAnalyzer = dependencies.securityAnalyzer;
        this.performanceAnalyzer = dependencies.performanceAnalyzer;
    }

    /**
     * Perform comprehensive project analysis
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Comprehensive analysis results
     */
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

    /**
     * Analyze project structure
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Project structure analysis
     */
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

    /**
     * Analyze code quality
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Code quality analysis
     */
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

    /**
     * Analyze architecture
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Architecture analysis
     */
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

    /**
     * Analyze dependencies
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Dependencies analysis
     */
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

    /**
     * Analyze performance
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Performance analysis
     */
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

    /**
     * Analyze security
     * @param {string} projectPath - Project path
     * @param {Array} existingPackages - Existing packages
     * @returns {Promise<Object>} Security analysis
     */
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

    /**
     * Analyze maintainability
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Maintainability analysis
     */
    async analyzeMaintainability(projectPath) {
        // This would integrate with maintainability analysis
        return {
            technicalDebt: 0,
            complexityIssues: [],
            refactoringNeeds: [],
            score: 0
        };
    }

    /**
     * Analyze tech stack
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Tech stack analysis
     */
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

    /**
     * Calculate comprehensive metrics
     * @param {Object} analysis - Analysis results
     * @returns {Object} Comprehensive metrics
     */
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

    /**
     * Analyze subproject
     * @param {Object} sub - Subproject object
     * @returns {Promise<Object>} Subproject analysis
     */
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

    // Security calculation methods (these would be moved to a separate security service)
    calculateOverallRiskLevel(packageSecurityAnalyses) {
        // This method should be moved to SecurityService
        return 'low';
    }

    calculateOverallSecurityScore(packageSecurityAnalyses) {
        // This method should be moved to SecurityService
        return 100;
    }

    calculateTotalVulnerabilities(packageSecurityAnalyses) {
        // This method should be moved to SecurityService
        return 0;
    }

    calculateTotalCodeIssues(packageSecurityAnalyses) {
        // This method should be moved to SecurityService
        return 0;
    }

    generateOverallSecurityRecommendations(packageSecurityAnalyses) {
        // This method should be moved to SecurityService
        return [];
    }

    async findPackages(projectPath) {
        // This method should be moved to PackageService
        return [];
    }
}

module.exports = AnalysisService; 