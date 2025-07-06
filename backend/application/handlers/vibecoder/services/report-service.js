/**
 * Report Service - Business logic for VibeCoder report generation
 */

const ANALYSIS_CONSTANTS = require('../constants/analysis-constants');

class ReportService {
    constructor(dependencies = {}) {
        this.logger = dependencies.logger || console;
    }

    /**
     * Generate comprehensive report
     * @param {Object} command - Command object
     * @param {Object} allResults - All results
     * @param {Object} validationResults - Validation results
     * @returns {Promise<Object>} Comprehensive report
     */
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
}

module.exports = ReportService; 