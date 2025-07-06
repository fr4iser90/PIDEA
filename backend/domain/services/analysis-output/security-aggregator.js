const UTILS = require('./utils');

/**
 * Security aggregator service for monorepo security data
 */
class SecurityAggregator {
    /**
     * Aggregate security data from all packages in a monorepo
     * @param {Object} monorepoSecurityData - Monorepo security data with packageSecurityAnalyses
     * @returns {Object} Aggregated security data
     */
    aggregateSecurityData(monorepoSecurityData) {
        const aggregated = {
            isMonorepo: true,
            packages: monorepoSecurityData.packages || [],
            securityScore: monorepoSecurityData.overallSecurityScore || 100,
            overallRiskLevel: monorepoSecurityData.overallRiskLevel || 'low',
            vulnerabilities: [],
            codeIssues: [],
            configuration: {
                securityMiddleware: [],
                missingSecurity: []
            },
            dependencies: {
                total: 0,
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                vulnerable: []
            },
            secrets: {
                found: [],
                patterns: []
            },
            recommendations: monorepoSecurityData.overallRecommendations || [],
            metrics: {
                totalVulnerabilities: monorepoSecurityData.totalVulnerabilities || 0,
                totalCodeIssues: monorepoSecurityData.totalCodeIssues || 0,
                totalSecrets: 0,
                totalMissingSecurity: 0,
                criticalVulnerabilities: 0,
                highVulnerabilities: 0,
                mediumVulnerabilities: 0,
                lowVulnerabilities: 0
            }
        };

        // Aggregate data from all packages
        Object.values(monorepoSecurityData.packageSecurityAnalyses || {}).forEach(pkgSec => {
            const securityAnalysis = pkgSec.securityAnalysis;
            
            // Aggregate vulnerabilities
            if (securityAnalysis.vulnerabilities) {
                aggregated.vulnerabilities.push(...securityAnalysis.vulnerabilities);
            }
            
            // Aggregate code issues
            if (securityAnalysis.codeIssues) {
                aggregated.codeIssues.push(...securityAnalysis.codeIssues);
            }
            
            // Aggregate configuration - track what's present vs missing across all packages
            if (securityAnalysis.configuration) {
                if (securityAnalysis.configuration.securityMiddleware) {
                    aggregated.configuration.securityMiddleware.push(...securityAnalysis.configuration.securityMiddleware);
                }
                if (securityAnalysis.configuration.missingSecurity) {
                    aggregated.configuration.missingSecurity.push(...securityAnalysis.configuration.missingSecurity);
                }
            }
            
            // Aggregate dependencies
            if (securityAnalysis.dependencies) {
                aggregated.dependencies.total += securityAnalysis.dependencies.total || 0;
                aggregated.dependencies.critical += securityAnalysis.dependencies.critical || 0;
                aggregated.dependencies.high += securityAnalysis.dependencies.high || 0;
                aggregated.dependencies.medium += securityAnalysis.dependencies.medium || 0;
                aggregated.dependencies.low += securityAnalysis.dependencies.low || 0;
                if (securityAnalysis.dependencies.vulnerable) {
                    aggregated.dependencies.vulnerable.push(...securityAnalysis.dependencies.vulnerable);
                }
            }
            
            // Aggregate secrets
            if (securityAnalysis.secrets) {
                if (securityAnalysis.secrets.found) {
                    aggregated.secrets.found.push(...securityAnalysis.secrets.found);
                }
                if (securityAnalysis.secrets.patterns) {
                    aggregated.secrets.patterns.push(...securityAnalysis.secrets.patterns);
                }
            }
        });

        // Remove duplicates from arrays
        aggregated.configuration.securityMiddleware = [...new Set(aggregated.configuration.securityMiddleware)];
        aggregated.configuration.missingSecurity = [...new Set(aggregated.configuration.missingSecurity)];
        
        // Remove features from missingSecurity if they are present in securityMiddleware
        aggregated.configuration.missingSecurity = aggregated.configuration.missingSecurity.filter(
            missing => !aggregated.configuration.securityMiddleware.includes(missing)
        );
        
        // Update metrics
        aggregated.metrics.totalSecrets = aggregated.secrets.found.length;
        aggregated.metrics.totalMissingSecurity = aggregated.configuration.missingSecurity.length;
        aggregated.metrics.criticalVulnerabilities = UTILS.countCriticalVulnerabilities(aggregated.vulnerabilities);
        aggregated.metrics.highVulnerabilities = UTILS.countHighVulnerabilities(aggregated.vulnerabilities);
        aggregated.metrics.mediumVulnerabilities = UTILS.countMediumVulnerabilities(aggregated.vulnerabilities);
        aggregated.metrics.lowVulnerabilities = UTILS.countLowVulnerabilities(aggregated.vulnerabilities);
        
        // Filter recommendations based on aggregated data
        aggregated.recommendations = aggregated.recommendations.filter(rec => {
            // Remove "Add security middleware" recommendation if no security features are missing
            if (rec.title === 'Add security middleware' && aggregated.configuration.missingSecurity.length === 0) {
                return false;
            }
            return true;
        });

        return aggregated;
    }
}

module.exports = SecurityAggregator; 