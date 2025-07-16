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
            if (analysis.codeQuality && analysis.codeQuality.issues) {
                this.processCodeQualityFindings(analysis.codeQuality, recommendations);
            }

            if (analysis.security && analysis.security.vulnerabilities) {
                this.processSecurityFindings(analysis.security, recommendations);
            }

            if (analysis.architecture && analysis.architecture.detectedPatterns) {
                this.processArchitectureFindings(analysis.architecture, recommendations);
            }

            if (analysis.performance && analysis.performance) {
                this.processPerformanceFindings(analysis.performance, recommendations);
            }

            if (analysis.techstack && analysis.techstack) {
                this.processTechStackFindings(analysis.techstack, recommendations);
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

    processCodeQualityFindings(codeQuality, recommendations) {
        if (!Array.isArray(codeQuality.issues)) return;
        
        for (const issue of codeQuality.issues) {
            recommendations.push({
                title: issue.issue || 'Code Quality Issue',
                description: `Fix code quality issue in file: ${issue.file} at line ${issue.line}`,
                priority: issue.severity === 'error' ? 'high' : 'medium',
                category: 'code-quality',
                effort: 'low',
                impact: 'medium',
                type: 'code-quality',
                file: issue.file,
                line: issue.line
            });
        }
    }

    processSecurityFindings(security, recommendations) {
        if (!Array.isArray(security.vulnerabilities)) return;
        
        for (const vuln of security.vulnerabilities) {
            recommendations.push({
                title: vuln.title || 'Security Vulnerability',
                description: vuln.recommendation || 'Address security vulnerability',
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

    processArchitectureFindings(architecture, recommendations) {
        if (!Array.isArray(architecture.detectedPatterns)) return;
        
        for (const pattern of architecture.detectedPatterns) {
            recommendations.push({
                title: `Architecture Pattern: ${pattern.pattern}`,
                description: pattern.description || `Consider ${pattern.pattern} pattern implementation`,
                priority: pattern.confidence === 1 ? 'medium' : 'low',
                category: 'architecture',
                effort: 'high',
                impact: 'high',
                type: 'architecture',
                pattern: pattern.pattern,
                confidence: pattern.confidence
            });
        }
    }

    processPerformanceFindings(performance, recommendations) {
        // Handle performance analysis data
        if (performance.overallScore && performance.overallScore < 70) {
            recommendations.push({
                title: 'Performance Optimization Needed',
                description: `Overall performance score is ${performance.overallScore}. Consider optimizing build times, caching, and parallel processing.`,
                priority: 'medium',
                category: 'performance',
                effort: 'medium',
                impact: 'medium',
                type: 'performance',
                score: performance.overallScore
            });
        }

        if (performance.buildPerformance) {
            const build = performance.buildPerformance;
            if (build.buildTime && build.buildTime > 5000) {
                recommendations.push({
                    title: 'Build Time Optimization',
                    description: `Build time is ${build.buildTime}ms. Consider implementing build optimizations, caching, and parallel processing.`,
                    priority: 'medium',
                    category: 'performance',
                    effort: 'medium',
                    impact: 'medium',
                    type: 'performance',
                    buildTime: build.buildTime
                });
            }
        }
    }

    processTechStackFindings(techstack, recommendations) {
        if (techstack.frameworks && Array.isArray(techstack.frameworks)) {
            const frameworks = techstack.frameworks.map(f => f.name);
            recommendations.push({
                title: 'Tech Stack Analysis',
                description: `Detected frameworks: ${frameworks.join(', ')}. Consider version updates and security patches.`,
                priority: 'low',
                category: 'techstack',
                effort: 'low',
                impact: 'low',
                type: 'techstack',
                frameworks: frameworks
            });
        }
    }
}

module.exports = RecommendationsService; 