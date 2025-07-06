/**
 * Validation Service - Business logic for VibeCoder validation operations
 */

const ANALYSIS_CONSTANTS = require('../constants/analysis-constants');

class ValidationService {
    constructor(dependencies = {}) {
        this.logger = dependencies.logger || console;
    }

    /**
     * Validate overall results
     * @param {string} projectPath - Project path
     * @param {Object} allResults - All results
     * @returns {Promise<Object>} Validation results
     */
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
                type: ANALYSIS_CONSTANTS.ISSUE_TYPES.VALIDATION_ERROR,
                message: error.message
            });
        }

        return validation;
    }

    /**
     * Perform post execution analysis
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Post analysis results
     */
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
     * Detect overall issues
     * @param {string} projectPath - Project path
     * @param {Object} allResults - All results
     * @returns {Promise<Array>} Array of issues
     */
    async detectOverallIssues(projectPath, allResults) {
        const issues = [];
        
        // Check for phase failures
        Object.entries(allResults).forEach(([phase, results]) => {
            if (results && results.status === 'failed') {
                issues.push({
                    type: ANALYSIS_CONSTANTS.ISSUE_TYPES.PHASE_FAILURE,
                    phase: phase,
                    message: results.error || 'Unknown error',
                    severity: ANALYSIS_CONSTANTS.PRIORITY_LEVELS.HIGH
                });
            }
        });
        
        // Check for incomplete operations
        Object.entries(allResults).forEach(([phase, results]) => {
            if (results && results.results && results.results.summary && results.results.summary.failed > 0) {
                issues.push({
                    type: ANALYSIS_CONSTANTS.ISSUE_TYPES.INCOMPLETE_OPERATIONS,
                    phase: phase,
                    message: `${results.results.summary.failed} operations failed in ${phase} phase`,
                    severity: ANALYSIS_CONSTANTS.PRIORITY_LEVELS.MEDIUM
                });
            }
        });
        
        return issues;
    }
}

module.exports = ValidationService; 