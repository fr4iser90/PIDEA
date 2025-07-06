/**
 * Recommendation Service - Business logic for VibeCoder recommendation generation
 */

const ANALYSIS_CONSTANTS = require('../constants/analysis-constants');

class RecommendationService {
    constructor(dependencies = {}) {
        this.logger = dependencies.logger || console;
    }

    /**
     * Generate analyze recommendations
     * @param {Object} analyzeResults - Analyze results
     * @returns {Object} Recommendations object
     */
    generateAnalyzeRecommendations(analyzeResults) {
        const recommendations = {
            refactor: false,
            generate: false,
            nextSteps: []
        };

        // Extract scores from the actual analysis results structure
        const codeQualityScore = this.extractScoreFromResult(analyzeResults.codeQuality, 'overallQualityScore', ANALYSIS_CONSTANTS.DEFAULT_SCORES.QUALITY);
        const architectureScore = this.extractScoreFromResult(analyzeResults.architecture, 'architectureScore', ANALYSIS_CONSTANTS.DEFAULT_SCORES.ARCHITECTURE);
        const maintainabilityScore = this.extractScoreFromResult(analyzeResults.maintainability, 'maintainabilityIndex', ANALYSIS_CONSTANTS.DEFAULT_SCORES.MAINTAINABILITY);

        // Determine if refactoring is needed
        if (codeQualityScore < ANALYSIS_CONSTANTS.SCORE_THRESHOLDS.QUALITY_LOW || 
            architectureScore < ANALYSIS_CONSTANTS.SCORE_THRESHOLDS.ARCHITECTURE_LOW || 
            maintainabilityScore < ANALYSIS_CONSTANTS.SCORE_THRESHOLDS.MAINTAINABILITY_LOW) {
            recommendations.refactor = true;
            recommendations.nextSteps.push('Refactor code to improve quality and maintainability');
        }

        // Determine if generation is needed
        const testabilityScore = this.extractScoreFromResult(analyzeResults.codeQuality, 'testCoverage', ANALYSIS_CONSTANTS.DEFAULT_SCORES.QUALITY);
        if (testabilityScore < ANALYSIS_CONSTANTS.SCORE_THRESHOLDS.TESTABILITY_LOW) {
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

    /**
     * Generate refactor recommendations
     * @param {Object} refactorResults - Refactor results
     * @returns {Object} Recommendations object
     */
    generateRefactorRecommendations(refactorResults) {
        return {
            nextSteps: [
                'Review refactored code for any issues',
                'Run tests to ensure functionality is preserved',
                'Update documentation if needed'
            ]
        };
    }

    /**
     * Generate generate recommendations
     * @param {Object} generateResults - Generate results
     * @returns {Object} Recommendations object
     */
    generateGenerateRecommendations(generateResults) {
        return {
            nextSteps: [
                'Review generated tests and customize as needed',
                'Update generated documentation with project-specific details',
                'Configure generated configs for your environment'
            ]
        };
    }

    /**
     * Generate comprehensive recommendations
     * @param {Object} allResults - All results
     * @param {Object} validationResults - Validation results
     * @returns {Array} Comprehensive recommendations
     */
    generateComprehensiveRecommendations(allResults, validationResults) {
        const recommendations = [];
        
        // Generate recommendations based on overall results
        if (validationResults.issues.length > 0) {
            recommendations.push({
                type: ANALYSIS_CONSTANTS.RECOMMENDATION_CATEGORIES.ADDRESS_VALIDATION,
                priority: ANALYSIS_CONSTANTS.PRIORITY_LEVELS.HIGH,
                description: 'Address validation issues before proceeding with further operations'
            });
        }
        
        // Check for specific improvements
        const analyzeResults = allResults.analyze;
        if (analyzeResults && analyzeResults.metrics && analyzeResults.metrics.overallScore < ANALYSIS_CONSTANTS.SCORE_THRESHOLDS.OVERALL_TARGET) {
            recommendations.push({
                type: ANALYSIS_CONSTANTS.RECOMMENDATION_CATEGORIES.CONTINUE_IMPROVEMENT,
                priority: ANALYSIS_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
                description: 'Continue with additional improvements to reach target quality score'
            });
        }
        
        // Check for maintenance recommendations
        recommendations.push({
            type: ANALYSIS_CONSTANTS.RECOMMENDATION_CATEGORIES.ONGOING_MAINTENANCE,
            priority: ANALYSIS_CONSTANTS.PRIORITY_LEVELS.LOW,
            description: 'Implement regular analysis and maintenance cycles'
        });
        
        return recommendations;
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

    /**
     * Extract recommendations from result object
     * @param {Object} result - Result object
     * @returns {Array} Array of recommendations
     */
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
}

module.exports = RecommendationService; 