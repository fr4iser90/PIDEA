/**
 * AnalysisOutputService - Main service for analysis output management
 * 
 * This service has been refactored to use a modular architecture for better maintainability.
 * The original functionality has been split into focused modules:
 * - FileSystemService: Handles file operations
 * - ReportGenerator: Generates markdown reports
 * - MarkdownFormatter: Formats data into markdown
 * - PackageExtractor: Extracts and filters package data
 * - SecurityAggregator: Aggregates security data for monorepos
 * - UTILS: Utility functions
 * - CONSTANTS: Configuration constants
 */

const {
    FileSystemService,
    ReportGenerator,
    MarkdownFormatter,
    PackageExtractor,
    SecurityAggregator,
    UTILS,
    CONSTANTS
} = require('../analysis-output');

class AnalysisOutputService {
    constructor(dependencies = {}) {
        this.fileSystemService = new FileSystemService();
        this.reportGenerator = new ReportGenerator();
        this.markdownFormatter = new MarkdownFormatter();
        this.packageExtractor = new PackageExtractor();
        this.securityAggregator = new SecurityAggregator();
        
        // Inject dependencies
        this.analysisRepository = dependencies.analysisRepository;
        this.logger = dependencies.logger || console;
    }

    /**
     * Ensure required directories exist
     */
    async ensureDirectories() {
        await this.fileSystemService.ensureDirectories();
    }

    /**
     * Save analysis result to file
     * @param {string} projectId - Project ID
     * @param {string} analysisType - Analysis type
     * @param {Object} data - Analysis data
     * @returns {Promise<Object>} Save result
     */
    async saveAnalysisResult(projectId, analysisType, data) {
        return await this.fileSystemService.saveAnalysisResult(projectId, analysisType, data);
    }

    /**
     * Generate markdown report for a project
     * @param {string} projectId - Project ID
     * @param {Object} analysisResults - Analysis results
     * @returns {Promise<Object>} Report generation result
     */
    async generateMarkdownReport(projectId, analysisResults) {
        const projectsPath = this.fileSystemService.getProjectsPath();
        return await this.reportGenerator.generateMarkdownReport(projectId, analysisResults, projectsPath);
    }

    /**
     * Extract packages from analysis results
     * @param {Object} analysisResults - Analysis results object
     * @returns {Array} Array of package objects
     */
    extractPackagesFromAnalysis(analysisResults) {
        return this.packageExtractor.extractPackagesFromAnalysis(analysisResults);
    }

    /**
     * Filter analysis results for a specific package
     * @param {Object} analysisResults - Analysis results object
     * @param {Object} pkg - Package object
     * @returns {Object} Filtered analysis results for the package
     */
    filterAnalysisResultsForPackage(analysisResults, pkg) {
        return this.packageExtractor.filterAnalysisResultsForPackage(analysisResults, pkg);
    }

    /**
     * Calculate average coupling
     * @param {Object} coupling - Coupling object
     * @returns {number} Average coupling value
     */
    calculateAverageCoupling(coupling) {
        return UTILS.calculateAverageCoupling(coupling);
    }

    /**
     * Calculate average cohesion
     * @param {Object} cohesion - Cohesion object
     * @returns {number} Average cohesion value
     */
    calculateAverageCohesion(cohesion) {
        return UTILS.calculateAverageCohesion(cohesion);
    }

    /**
     * Calculate complexity score
     * @param {Object} architecture - Architecture object
     * @returns {number} Complexity score
     */
    calculateComplexityScore(architecture) {
        return UTILS.calculateComplexityScore(architecture);
    }

    /**
     * Generate monorepo reports
     * @param {string} projectId - Project ID
     * @param {Object} analysisResults - Analysis results
     * @param {Array} packages - Packages array
     * @param {string} baseFilename - Base filename
     * @returns {Promise<Object>} Report generation result
     */
    async generateMonorepoReports(projectId, analysisResults, packages, baseFilename) {
        const projectsPath = this.fileSystemService.getProjectsPath();
        const projectDir = require('path').join(projectsPath, projectId);
        return await this.reportGenerator.generateMonorepoReports(projectId, analysisResults, packages, baseFilename, projectDir);
    }

    /**
     * Generate single package report
     * @param {string} projectId - Project ID
     * @param {Object} analysisResults - Analysis results
     * @param {string} baseFilename - Base filename
     * @returns {Promise<Object>} Report generation result
     */
    async generateSinglePackageReport(projectId, analysisResults, baseFilename) {
        const projectsPath = this.fileSystemService.getProjectsPath();
        const projectDir = require('path').join(projectsPath, projectId);
        return await this.reportGenerator.generateSinglePackageReport(projectId, analysisResults, baseFilename, projectDir);
    }

    /**
     * Generate comprehensive suggestions
     * @param {Object} analysisResults - Analysis results
     * @returns {string} Formatted suggestions
     */
    generateComprehensiveSuggestions(analysisResults) {
        return this.reportGenerator.generateComprehensiveSuggestions(analysisResults);
    }

    /**
     * Format analysis type for display
     * @param {string} type - Analysis type
     * @returns {string} Formatted analysis type
     */
    formatAnalysisType(type) {
        return UTILS.formatAnalysisType(type);
    }

    /**
     * Format analysis data based on type
     * @param {string} type - Analysis type
     * @param {Object} data - Analysis data
     * @returns {string} Formatted markdown
     */
    formatAnalysisData(type, data) {
        return this.markdownFormatter.formatAnalysisData(type, data);
    }

    /**
     * Format code quality data
     * @param {Object} data - Code quality data
     * @param {Object} metrics - Metrics object
     * @param {Array} recommendations - Recommendations array
     * @returns {string} Formatted markdown
     */
    formatCodeQualityData(data, metrics = null, recommendations = null) {
        return this.markdownFormatter.formatCodeQualityData(data, metrics, recommendations);
    }

    /**
     * Format security data
     * @param {Object} data - Security data
     * @param {Object} metrics - Metrics object
     * @param {Array} recommendations - Recommendations array
     * @returns {string} Formatted markdown
     */
    formatSecurityData(data, metrics = null, recommendations = null) {
        return this.markdownFormatter.formatSecurityData(data, metrics, recommendations);
    }

    /**
     * Format performance data
     * @param {Object} data - Performance data
     * @param {Object} metrics - Metrics object
     * @param {Array} recommendations - Recommendations array
     * @returns {string} Formatted markdown
     */
    formatPerformanceData(data, metrics = null, recommendations = null) {
        return this.markdownFormatter.formatPerformanceData(data, metrics, recommendations);
    }

    /**
     * Format architecture data
     * @param {Object} data - Architecture data
     * @param {Object} metrics - Metrics object
     * @param {Array} recommendations - Recommendations array
     * @returns {string} Formatted markdown
     */
    formatArchitectureData(data, metrics = null, recommendations = null) {
        return this.markdownFormatter.formatArchitectureData(data, metrics, recommendations);
    }

    /**
     * Format project structure data
     * @param {Object} data - Project structure data
     * @param {Object} metrics - Metrics object
     * @param {Array} recommendations - Recommendations array
     * @returns {string} Formatted markdown
     */
    formatProjectStructureData(data, metrics = null, recommendations = null) {
        return this.markdownFormatter.formatProjectStructureData(data, metrics, recommendations);
    }

    /**
     * Format dependencies data
     * @param {Object} data - Dependencies data
     * @param {Object} metrics - Metrics object
     * @param {Array} recommendations - Recommendations array
     * @returns {string} Formatted markdown
     */
    formatDependenciesData(data, metrics = null, recommendations = null) {
        return this.markdownFormatter.formatDependenciesData(data, metrics, recommendations);
    }

    /**
     * Format tech stack data
     * @param {Object} data - Tech stack data
     * @returns {string} Formatted markdown
     */
    formatTechStackData(data) {
        return this.markdownFormatter.formatTechStackData(data);
    }

    /**
     * Format refactoring data
     * @param {Object} data - Refactoring data
     * @returns {string} Formatted markdown
     */
    formatRefactoringData(data) {
        return this.markdownFormatter.formatRefactoringData(data);
    }

    /**
     * Format generation data
     * @param {Object} data - Generation data
     * @returns {string} Formatted markdown
     */
    formatGenerationData(data) {
        return this.markdownFormatter.formatGenerationData(data);
    }

    /**
     * Format generic analysis data
     * @param {string} type - Analysis type
     * @param {Object} data - Analysis data
     * @returns {string} Formatted markdown
     */
    formatGenericAnalysisData(type, data) {
        return this.markdownFormatter.formatGenericAnalysisData(type, data);
    }

    /**
     * Format tree structure for display
     * @param {Object} structure - Tree structure object
     * @param {string} indent - Indentation string
     * @returns {string} Formatted tree string
     */
    formatTree(structure, indent = '') {
        return UTILS.formatTree(structure, indent);
    }

    /**
     * Get analysis history for a project
     * @param {string} projectId - Project ID
     * @returns {Promise<Array>} Analysis history
     */
    async getAnalysisHistory(projectId) {
        return await this.fileSystemService.getAnalysisHistory(projectId);
    }

    /**
     * Get analysis file content
     * @param {string} projectId - Project ID
     * @param {string} filename - Filename
     * @returns {Promise<Object|string>} File content
     */
    async getAnalysisFile(projectId, filename) {
        return await this.fileSystemService.getAnalysisFile(projectId, filename);
    }

    /**
     * Format file size in human readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    formatFileSize(bytes) {
        return UTILS.formatFileSize(bytes);
    }

    /**
     * Count critical vulnerabilities
     * @param {Array} vulnerabilities - Vulnerabilities array
     * @returns {number} Count of critical vulnerabilities
     */
    countCriticalVulnerabilities(vulnerabilities) {
        return UTILS.countCriticalVulnerabilities(vulnerabilities);
    }

    /**
     * Count high vulnerabilities
     * @param {Array} vulnerabilities - Vulnerabilities array
     * @returns {number} Count of high vulnerabilities
     */
    countHighVulnerabilities(vulnerabilities) {
        return UTILS.countHighVulnerabilities(vulnerabilities);
    }

    /**
     * Count medium vulnerabilities
     * @param {Array} vulnerabilities - Vulnerabilities array
     * @returns {number} Count of medium vulnerabilities
     */
    countMediumVulnerabilities(vulnerabilities) {
        return UTILS.countMediumVulnerabilities(vulnerabilities);
    }

    /**
     * Count low vulnerabilities
     * @param {Array} vulnerabilities - Vulnerabilities array
     * @returns {number} Count of low vulnerabilities
     */
    countLowVulnerabilities(vulnerabilities) {
        return UTILS.countLowVulnerabilities(vulnerabilities);
    }

    /**
     * Aggregate security data from all packages in a monorepo
     * @param {Object} monorepoSecurityData - Monorepo security data with packageSecurityAnalyses
     * @returns {Object} Aggregated security data
     */
    aggregateSecurityData(monorepoSecurityData) {
        return this.securityAggregator.aggregateSecurityData(monorepoSecurityData);
    }

    /**
     * Get analysis recommendations for a project
     * @param {string} projectId - Project ID (from database)
     * @returns {Promise<Array>} Array of recommendations
     */
    async getAnalysisRecommendations(projectId) {
        try {
            // Use injected analysis repository
            if (!this.analysisRepository) {
                this.logger.warn('Analysis repository not injected, returning empty recommendations');
                return [];
            }
            
            // Get latest completed analysis
            const latestAnalysis = await this.analysisRepository.findLatestCompleted(projectId);
            
            if (!latestAnalysis || !latestAnalysis.result) {
                return [];
            }
            
            // Extract recommendations from analysis result
            const recommendations = latestAnalysis.result.recommendations || [];
            
            return recommendations.map(rec => ({
                id: rec.id || `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                title: rec.title || 'Untitled Recommendation',
                description: rec.description || 'No description available',
                priority: rec.priority || 'medium',
                category: rec.category || rec.type || 'general',
                effort: rec.effort || 'medium',
                impact: rec.impact || 'medium',
                estimatedTime: rec.estimatedTime || null,
                status: rec.status || 'pending',
                tags: rec.tags || [],
                dependencies: rec.dependencies || []
            }));
            
        } catch (error) {
            console.error('Error getting analysis recommendations:', error);
            return [];
        }
    }

    /**
     * Get analysis metrics for a project
     * @param {string} projectId - Project ID (from database)
     * @returns {Promise<Object>} Analysis metrics
     */
    async getAnalysisMetrics(projectId) {
        try {
            // Use injected analysis repository
            if (!this.analysisRepository) {
                this.logger.warn('Analysis repository not injected, returning empty metrics');
                return {
                    totalAnalyses: 0,
                    completedAnalyses: 0,
                    failedAnalyses: 0,
                    averageDuration: 0,
                    lastAnalysis: null,
                    analysisTypes: {}
                };
            }
            
            // Get all analyses for the project
            const analyses = await this.analysisRepository.findByProjectId(projectId);
            
            if (!analyses || analyses.length === 0) {
                return {
                    totalAnalyses: 0,
                    completedAnalyses: 0,
                    failedAnalyses: 0,
                    averageDuration: 0,
                    lastAnalysis: null,
                    analysisTypes: {}
                };
            }
            
            // Calculate metrics
            const completedAnalyses = analyses.filter(a => a.status === 'completed');
            const failedAnalyses = analyses.filter(a => a.status === 'failed');
            const totalAnalyses = analyses.length;
            
            // Calculate average duration
            const durations = completedAnalyses
                .map(a => a.executionTime || 0)
                .filter(d => d > 0);
            const averageDuration = durations.length > 0 
                ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
                : 0;
            
            // Get last analysis
            const lastAnalysis = analyses.length > 0 
                ? new Date(Math.max(...analyses.map(a => new Date(a.completedAt || a.createdAt))))
                : null;
            
            // Count by analysis type
            const analysisTypes = {};
            analyses.forEach(a => {
                const type = a.analysisType || 'unknown';
                analysisTypes[type] = (analysisTypes[type] || 0) + 1;
            });
            
            return {
                totalAnalyses,
                completedAnalyses: completedAnalyses.length,
                failedAnalyses: failedAnalyses.length,
                averageDuration: Math.round(averageDuration),
                lastAnalysis: lastAnalysis ? lastAnalysis.toISOString() : null,
                analysisTypes
            };
            
        } catch (error) {
            console.error('Error getting analysis metrics:', error);
            return {
                totalAnalyses: 0,
                completedAnalyses: 0,
                failedAnalyses: 0,
                averageDuration: 0,
                lastAnalysis: null,
                analysisTypes: {}
            };
        }
    }

    /**
     * Get analysis tech stack for a project
     * @param {string} projectId - Project ID (from database)
     * @returns {Promise<Object>} Tech stack data
     */
    async getAnalysisTechStack(projectId) {
        try {
            // Use injected analysis repository
            if (!this.analysisRepository) {
                this.logger.warn('Analysis repository not injected, returning empty tech stack');
                return {
                    languages: [],
                    frameworks: [],
                    databases: [],
                    tools: [],
                    platforms: [],
                    versionControl: []
                };
            }
            
            // Get latest tech stack analysis
            const techStackAnalysis = await this.analysisRepository.findLatestByType(projectId, 'tech-stack');
            
            if (!techStackAnalysis || !techStackAnalysis.result) {
                return {
                    languages: [],
                    frameworks: [],
                    databases: [],
                    tools: [],
                    platforms: [],
                    versionControl: []
                };
            }
            
            // Extract tech stack from analysis result
            const techStack = techStackAnalysis.result.techStack || techStackAnalysis.result;
            
            return {
                languages: techStack.languages || [],
                frameworks: techStack.frameworks || [],
                databases: techStack.databases || [],
                tools: techStack.tools || [],
                platforms: techStack.platforms || [],
                versionControl: techStack.versionControl || []
            };
            
        } catch (error) {
            console.error('Error getting analysis tech stack:', error);
            return {
                languages: [],
                frameworks: [],
                databases: [],
                tools: [],
                platforms: [],
                versionControl: []
            };
        }
    }

    /**
     * Get analysis architecture for a project
     * @param {string} projectId - Project ID (from database)
     * @returns {Promise<Object>} Architecture analysis data
     */
    async getAnalysisArchitecture(projectId) {
        try {
            // Use injected analysis repository
            if (!this.analysisRepository) {
                this.logger.warn('Analysis repository not injected, returning empty architecture');
                return {
                    structure: null,
                    patterns: [],
                    layers: [],
                    dependencies: {},
                    metrics: {},
                    recommendations: []
                };
            }
            
            // Get latest architecture analysis
            const architectureAnalysis = await this.analysisRepository.findLatestByType(projectId, 'architecture');
            
            if (!architectureAnalysis || !architectureAnalysis.result) {
                return {
                    structure: null,
                    patterns: [],
                    layers: [],
                    dependencies: {},
                    metrics: {},
                    recommendations: []
                };
            }
            
            // Extract and format architecture data
            const architecture = architectureAnalysis.result;
            
            return {
                structure: architecture.structure || null,
                patterns: architecture.patterns || [],
                layers: architecture.layers || [],
                dependencies: architecture.dependencies || {},
                metrics: architecture.metrics || {},
                recommendations: architecture.recommendations || [],
                antiPatterns: architecture.antiPatterns || []
            };
            
        } catch (error) {
            this.logger.error('Error getting analysis architecture:', error);
            return {
                structure: null,
                patterns: [],
                layers: [],
                dependencies: {},
                metrics: {},
                recommendations: []
            };
        }
    }

    /**
     * Get analysis charts for a project
     * @param {string} projectId - Project ID (from database)
     * @param {string} type - Chart type (trends, metrics, etc.)
     * @returns {Promise<Object>} Chart data
     */
    async getAnalysisCharts(projectId, type) {
        try {
            // Use injected analysis repository
            if (!this.analysisRepository) {
                this.logger.warn('Analysis repository not injected, returning empty charts');
                return {
                    charts: [],
                    message: 'No analysis repository available'
                };
            }
            
            // Get analysis history for chart generation
            const analyses = await this.analysisRepository.findByProjectId(projectId, {
                limit: 50,
                status: 'completed'
            });
            
            if (!analyses || analyses.length === 0) {
                return {
                    charts: [],
                    message: 'No analysis data available for charts'
                };
            }
            
            // Generate charts based on type
            let charts = [];
            
            switch (type) {
                case 'trends':
                    charts = this.generateTrendCharts(analyses);
                    break;
                case 'metrics':
                    charts = this.generateMetricsCharts(analyses);
                    break;
                case 'performance':
                    charts = this.generatePerformanceCharts(analyses);
                    break;
                default:
                    charts = this.generateDefaultCharts(analyses);
            }
            
            return {
                charts,
                message: `Generated ${charts.length} charts for ${type}`
            };
            
        } catch (error) {
            this.logger.error('Error getting analysis charts:', error);
            return {
                charts: [],
                message: 'Error generating charts'
            };
        }
    }

    /**
     * Generate trend charts from analysis data
     * @param {Array} analyses - Array of analysis data
     * @returns {Array} Trend charts
     */
    generateTrendCharts(analyses) {
        try {
            const charts = [];
            
            // Analysis completion trends
            const completionTrend = {
                type: 'line',
                title: 'Analysis Completion Trends',
                data: analyses.map(analysis => ({
                    date: analysis.completedAt || analysis.createdAt,
                    value: analysis.overallScore || 0,
                    label: analysis.analysisType
                }))
            };
            charts.push(completionTrend);
            
            // Analysis type distribution
            const typeDistribution = {
                type: 'pie',
                title: 'Analysis Type Distribution',
                data: analyses.reduce((acc, analysis) => {
                    const type = analysis.analysisType || 'unknown';
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                }, {})
            };
            charts.push(typeDistribution);
            
            return charts;
        } catch (error) {
            this.logger.error('Error generating trend charts:', error);
            return [];
        }
    }

    /**
     * Generate metrics charts from analysis data
     * @param {Array} analyses - Array of analysis data
     * @returns {Array} Metrics charts
     */
    generateMetricsCharts(analyses) {
        try {
            const charts = [];
            
            // Performance metrics
            const performanceMetrics = {
                type: 'bar',
                title: 'Performance Metrics',
                data: analyses
                    .filter(a => a.analysisType === 'performance')
                    .map(analysis => ({
                        label: analysis.completedAt || analysis.createdAt,
                        value: analysis.overallScore || 0
                    }))
            };
            charts.push(performanceMetrics);
            
            return charts;
        } catch (error) {
            this.logger.error('Error generating metrics charts:', error);
            return [];
        }
    }

    /**
     * Generate performance charts from analysis data
     * @param {Array} analyses - Array of analysis data
     * @returns {Array} Performance charts
     */
    generatePerformanceCharts(analyses) {
        try {
            const charts = [];
            
            // Execution time trends
            const executionTimeTrend = {
                type: 'line',
                title: 'Analysis Execution Time',
                data: analyses.map(analysis => ({
                    date: analysis.completedAt || analysis.createdAt,
                    value: analysis.executionTime || 0,
                    label: analysis.analysisType
                }))
            };
            charts.push(executionTimeTrend);
            
            return charts;
        } catch (error) {
            this.logger.error('Error generating performance charts:', error);
            return [];
        }
    }

    /**
     * Generate default charts from analysis data
     * @param {Array} analyses - Array of analysis data
     * @returns {Array} Default charts
     */
    generateDefaultCharts(analyses) {
        try {
            const charts = [];
            
            // Overall analysis summary
            const summary = {
                type: 'summary',
                title: 'Analysis Summary',
                data: {
                    totalAnalyses: analyses.length,
                    averageScore: analyses.reduce((sum, a) => sum + (a.overallScore || 0), 0) / analyses.length,
                    lastAnalysis: analyses[0]?.completedAt || analyses[0]?.createdAt
                }
            };
            charts.push(summary);
            
            return charts;
        } catch (error) {
            this.logger.error('Error generating default charts:', error);
            return [];
        }
    }
}

module.exports = AnalysisOutputService; 
