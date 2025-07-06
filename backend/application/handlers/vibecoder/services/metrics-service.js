/**
 * Metrics Service - Business logic for VibeCoder metrics calculations
 */

const ANALYSIS_CONSTANTS = require('../constants/analysis-constants');

class MetricsService {
    constructor(dependencies = {}) {
        this.logger = dependencies.logger || console;
    }

    /**
     * Calculate analyze metrics
     * @param {Object} analyzeResults - Analyze results
     * @returns {Object} Metrics object
     */
    calculateAnalyzeMetrics(analyzeResults) {
        // Extract scores from the actual analysis results structure
        const codeQualityScore = this.extractScoreFromResult(analyzeResults.codeQuality, 'overallQualityScore', ANALYSIS_CONSTANTS.DEFAULT_SCORES.QUALITY);
        const architectureScore = this.extractScoreFromResult(analyzeResults.architecture, 'architectureScore', ANALYSIS_CONSTANTS.DEFAULT_SCORES.ARCHITECTURE);
        const dependenciesScore = this.extractScoreFromResult(analyzeResults.dependencies, 'securityScore', ANALYSIS_CONSTANTS.DEFAULT_SCORES.SECURITY);
        const performanceScore = this.extractScoreFromResult(analyzeResults.performance, 'performanceScore', ANALYSIS_CONSTANTS.DEFAULT_SCORES.PERFORMANCE);
        const securityScore = this.extractScoreFromResult(analyzeResults.security, 'securityScore', ANALYSIS_CONSTANTS.DEFAULT_SCORES.SECURITY);
        const maintainabilityScore = this.extractScoreFromResult(analyzeResults.maintainability, 'maintainabilityIndex', ANALYSIS_CONSTANTS.DEFAULT_SCORES.MAINTAINABILITY);

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

    /**
     * Calculate refactor metrics
     * @param {Object} refactorResults - Refactor results
     * @returns {Object} Metrics object
     */
    calculateRefactorMetrics(refactorResults) {
        return {
            operationsCompleted: refactorResults.summary.successful,
            filesModified: refactorResults.summary.filesModified,
            successRate: (refactorResults.summary.successful / refactorResults.summary.total) * 100
        };
    }

    /**
     * Calculate generate metrics
     * @param {Object} generateResults - Generate results
     * @returns {Object} Metrics object
     */
    calculateGenerateMetrics(generateResults) {
        return {
            operationsCompleted: generateResults.summary.successful,
            filesCreated: generateResults.summary.filesCreated,
            itemsGenerated: generateResults.summary.itemsGenerated,
            successRate: (generateResults.summary.successful / generateResults.summary.total) * 100
        };
    }

    /**
     * Compare pre and post metrics
     * @param {Object} allResults - All results
     * @param {Object} postAnalysis - Post analysis results
     * @returns {Object} Comparison metrics
     */
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

    /**
     * Extract score from result object
     * @param {Object} result - Result object
     * @param {string} scoreKey - Score key to extract
     * @param {number} defaultValue - Default value if score not found
     * @returns {number} Extracted score
     */
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
        
        // Try to get score from nested structures
        if (result.result && result.result[scoreKey] !== undefined) {
            return result.result[scoreKey];
        }
        
        // Try common score keys
        const commonScoreKeys = ['score', 'overallScore', 'qualityScore', 'securityScore', 'performanceScore'];
        for (const key of commonScoreKeys) {
            if (result[key] !== undefined) {
                return result[key];
            }
            if (result.result && result.result[key] !== undefined) {
                return result.result[key];
            }
        }
        
        return defaultValue;
    }
}

module.exports = MetricsService; 