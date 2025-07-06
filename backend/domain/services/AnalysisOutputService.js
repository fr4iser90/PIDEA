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
} = require('./analysis-output');

class AnalysisOutputService {
    constructor() {
        this.fileSystemService = new FileSystemService();
        this.reportGenerator = new ReportGenerator();
        this.markdownFormatter = new MarkdownFormatter();
        this.packageExtractor = new PackageExtractor();
        this.securityAggregator = new SecurityAggregator();
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
}

module.exports = AnalysisOutputService; 
