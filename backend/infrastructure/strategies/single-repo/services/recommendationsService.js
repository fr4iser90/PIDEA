const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

/**
 * Recommendations service for SingleRepoStrategy
 */
class RecommendationsService {
    constructor(logger) {
        this.logger = logger;
    }

    /**
     * Generate recommendations for single repository
     * @param {Object} analysis - Complete analysis object
     * @returns {Promise<Object>} Recommendations object with recommendations array
     */
    async generateRecommendations(analysis) {
        try {
            // logger.info('RecommendationsService: Starting recommendations generation');
            // logger.info('RecommendationsService: Received analysis data with', Object.keys(analysis || {}).length, 'analysis types');
            
            const recommendations = [];

            // Process each analysis type and convert findings to recommendations
            if (analysis.linting && analysis.linting.errors) {
                this.processLintingFindings(analysis.linting, recommendations);
            }

            if (analysis.security && analysis.security.vulnerabilities) {
                this.processSecurityFindings(analysis.security, recommendations);
            }

            if (analysis.codeQuality && analysis.codeQuality.criticalIssues) {
                this.processCodeQualityFindings(analysis.codeQuality, recommendations);
            }

            if (analysis.architecture && analysis.architecture.violations) {
                this.processArchitectureFindings(analysis.architecture, recommendations);
            }

            if (analysis.scripts && analysis.scripts.recommendations) {
                this.processScriptRecommendations(analysis.scripts, recommendations);
            }

            if (analysis.performance && analysis.performance.issues) {
                this.processPerformanceFindings(analysis.performance, recommendations);
            }

            // logger.info('RecommendationsService: Generated', recommendations.length, 'recommendations');

            return {
                recommendations: recommendations,
                insights: [],
                summary: 'Recommendations generated from all analysis findings'
            };
        } catch (error) {
            // logger.error('RecommendationsService: Failed to generate recommendations', {
            //     error: error.message
            // });
            return {
                recommendations: [],
                insights: [],
                summary: 'Failed to generate recommendations'
            };
        }
    }

    processLintingFindings(linting, recommendations) {
        if (!Array.isArray(linting.errors)) return;
        
        for (const error of linting.errors) {
            recommendations.push({
                title: error.message,
                description: `Fix linting issue in file: ${error.file}`,
                priority: error.severity === 'error' ? 'high' : 'medium',
                category: 'code-quality',
                effort: 'low',
                impact: 'medium',
                type: 'linting',
                file: error.file,
                line: error.line
            });
        }
    }

    processSecurityFindings(security, recommendations) {
        if (!Array.isArray(security.vulnerabilities)) return;
        
        for (const vuln of security.vulnerabilities) {
            recommendations.push({
                title: vuln.title,
                description: vuln.recommendation,
                priority: 'high',
                category: 'security',
                effort: 'medium',
                impact: 'high',
                type: 'security',
                file: vuln.file,
                severity: vuln.severity
            });
        }
    }

    processCodeQualityFindings(codeQuality, recommendations) {
        if (!Array.isArray(codeQuality.criticalIssues)) return;
        
        for (const issue of codeQuality.criticalIssues) {
            recommendations.push({
                title: issue.message,
                description: `Fix code quality issue in file: ${issue.file}`,
                priority: 'critical',
                category: 'code-quality',
                effort: 'medium',
                impact: 'high',
                type: 'code-quality',
                file: issue.file,
                line: issue.line
            });
        }
    }

    processArchitectureFindings(architecture, recommendations) {
        if (!Array.isArray(architecture.violations)) return;
        
        for (const violation of architecture.violations) {
            recommendations.push({
                title: violation.message,
                description: violation.suggestion,
                priority: violation.severity || 'medium',
                category: 'architecture',
                effort: 'high',
                impact: 'high',
                type: 'architecture',
                file: violation.file,
                component: violation.component
            });
        }
    }

    processScriptRecommendations(scripts, recommendations) {
        if (!Array.isArray(scripts.recommendations)) return;
        
        for (const rec of scripts.recommendations) {
            recommendations.push({
                title: rec.message,
                description: rec.action,
                priority: rec.priority || 'medium',
                category: 'automation',
                effort: rec.effort || 'medium',
                impact: rec.impact || 'medium',
                type: 'script',
                file: rec.file
            });
        }
    }

    processPerformanceFindings(performance, recommendations) {
        if (!Array.isArray(performance.issues)) return;
        
        for (const perf of performance.issues) {
            recommendations.push({
                title: perf.message,
                description: perf.suggestion,
                priority: perf.severity || 'medium',
                category: 'performance',
                effort: 'medium',
                impact: 'medium',
                type: 'performance',
                file: perf.file,
                metric: perf.metric
            });
        }
    }
}

module.exports = RecommendationsService; 