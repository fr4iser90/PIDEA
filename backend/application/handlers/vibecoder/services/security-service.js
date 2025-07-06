/**
 * Security Service - Business logic for VibeCoder security operations
 */

const ANALYSIS_CONSTANTS = require('../constants/analysis-constants');

class SecurityService {
    constructor(dependencies = {}) {
        this.logger = dependencies.logger || console;
    }

    /**
     * Calculate overall risk level from package security analyses
     * @param {Object} packageSecurityAnalyses - Package security analyses
     * @returns {string} Overall risk level
     */
    calculateOverallRiskLevel(packageSecurityAnalyses) {
        let maxRiskScore = 0;
        
        Object.values(packageSecurityAnalyses).forEach(pkgSec => {
            const riskScore = this.calculateRiskScore(pkgSec.securityAnalysis);
            maxRiskScore = Math.max(maxRiskScore, riskScore);
        });
        
        if (maxRiskScore >= ANALYSIS_CONSTANTS.RISK_THRESHOLDS.CRITICAL) return ANALYSIS_CONSTANTS.PRIORITY_LEVELS.CRITICAL;
        if (maxRiskScore >= ANALYSIS_CONSTANTS.RISK_THRESHOLDS.HIGH) return ANALYSIS_CONSTANTS.PRIORITY_LEVELS.HIGH;
        if (maxRiskScore >= ANALYSIS_CONSTANTS.RISK_THRESHOLDS.MEDIUM) return ANALYSIS_CONSTANTS.PRIORITY_LEVELS.MEDIUM;
        return ANALYSIS_CONSTANTS.PRIORITY_LEVELS.LOW;
    }

    /**
     * Calculate risk score for security analysis
     * @param {Object} securityAnalysis - Security analysis result
     * @returns {number} Risk score
     */
    calculateRiskScore(securityAnalysis) {
        let riskScore = 0;
        
        // Add points for vulnerabilities
        if (securityAnalysis.dependencies) {
            riskScore += (securityAnalysis.dependencies.critical || 0) * ANALYSIS_CONSTANTS.RISK_MULTIPLIERS.CRITICAL_VULNERABILITY;
            riskScore += (securityAnalysis.dependencies.high || 0) * ANALYSIS_CONSTANTS.RISK_MULTIPLIERS.HIGH_VULNERABILITY;
            riskScore += (securityAnalysis.dependencies.medium || 0) * ANALYSIS_CONSTANTS.RISK_MULTIPLIERS.MEDIUM_VULNERABILITY;
        }
        
        // Add points for code issues
        const criticalIssues = (securityAnalysis.codeIssues || []).filter(issue => issue.severity === 'critical').length;
        const highIssues = (securityAnalysis.codeIssues || []).filter(issue => issue.severity === 'high').length;
        
        riskScore += criticalIssues * ANALYSIS_CONSTANTS.RISK_MULTIPLIERS.CRITICAL_ISSUE;
        riskScore += highIssues * ANALYSIS_CONSTANTS.RISK_MULTIPLIERS.HIGH_ISSUE;
        
        // Add points for secrets
        riskScore += (securityAnalysis.secrets?.found?.length || 0) * ANALYSIS_CONSTANTS.RISK_MULTIPLIERS.SECRET_FOUND;
        
        // Add points for missing security
        riskScore += (securityAnalysis.configuration?.missingSecurity?.length || 0) * ANALYSIS_CONSTANTS.RISK_MULTIPLIERS.MISSING_SECURITY;
        
        return riskScore;
    }

    /**
     * Calculate overall security score from package security analyses
     * @param {Object} packageSecurityAnalyses - Package security analyses
     * @returns {number} Overall security score (0-100)
     */
    calculateOverallSecurityScore(packageSecurityAnalyses) {
        let totalScore = 0;
        let packageCount = 0;
        
        Object.values(packageSecurityAnalyses).forEach(pkgSec => {
            totalScore += pkgSec.securityAnalysis.securityScore || ANALYSIS_CONSTANTS.DEFAULT_SCORES.SECURITY;
            packageCount++;
        });
        
        return packageCount > 0 ? Math.round(totalScore / packageCount) : ANALYSIS_CONSTANTS.DEFAULT_SCORES.SECURITY;
    }

    /**
     * Calculate total vulnerabilities across all packages
     * @param {Object} packageSecurityAnalyses - Package security analyses
     * @returns {number} Total vulnerabilities
     */
    calculateTotalVulnerabilities(packageSecurityAnalyses) {
        let total = 0;
        
        Object.values(packageSecurityAnalyses).forEach(pkgSec => {
            if (pkgSec.securityAnalysis.dependencies) {
                total += pkgSec.securityAnalysis.dependencies.critical || 0;
                total += pkgSec.securityAnalysis.dependencies.high || 0;
                total += pkgSec.securityAnalysis.dependencies.medium || 0;
                total += pkgSec.securityAnalysis.dependencies.low || 0;
            }
        });
        
        return total;
    }

    /**
     * Calculate total code issues across all packages
     * @param {Object} packageSecurityAnalyses - Package security analyses
     * @returns {number} Total code issues
     */
    calculateTotalCodeIssues(packageSecurityAnalyses) {
        let total = 0;
        
        Object.values(packageSecurityAnalyses).forEach(pkgSec => {
            total += pkgSec.securityAnalysis.codeIssues?.length || 0;
        });
        
        return total;
    }

    /**
     * Generate overall security recommendations from package analyses
     * @param {Object} packageSecurityAnalyses - Package security analyses
     * @returns {Array} Overall recommendations
     */
    generateOverallSecurityRecommendations(packageSecurityAnalyses) {
        const recommendations = [];
        
        // Check for critical vulnerabilities across packages
        let criticalVulns = 0;
        Object.values(packageSecurityAnalyses).forEach(pkgSec => {
            if (pkgSec.securityAnalysis.dependencies) {
                criticalVulns += pkgSec.securityAnalysis.dependencies.critical || 0;
            }
        });
        
        if (criticalVulns > 0) {
            recommendations.push({
                title: 'Fix critical vulnerabilities',
                description: `${criticalVulns} critical vulnerabilities found across packages`,
                priority: ANALYSIS_CONSTANTS.PRIORITY_LEVELS.CRITICAL,
                category: ANALYSIS_CONSTANTS.RECOMMENDATION_CATEGORIES.VULNERABILITIES
            });
        }
        
        // Check for missing security middleware across packages
        const missingSecurity = new Set();
        Object.values(packageSecurityAnalyses).forEach(pkgSec => {
            if (pkgSec.securityAnalysis.configuration?.missingSecurity) {
                pkgSec.securityAnalysis.configuration.missingSecurity.forEach(item => {
                    missingSecurity.add(item);
                });
            }
        });
        
        if (missingSecurity.size > 0) {
            recommendations.push({
                title: 'Add security middleware',
                description: `Missing: ${Array.from(missingSecurity).join(', ')}`,
                priority: ANALYSIS_CONSTANTS.PRIORITY_LEVELS.HIGH,
                category: ANALYSIS_CONSTANTS.RECOMMENDATION_CATEGORIES.CONFIGURATION
            });
        }
        
        // Check for secrets across packages
        let totalSecrets = 0;
        Object.values(packageSecurityAnalyses).forEach(pkgSec => {
            totalSecrets += pkgSec.securityAnalysis.secrets?.found?.length || 0;
        });
        
        if (totalSecrets > 0) {
            recommendations.push({
                title: 'Remove hardcoded secrets',
                description: `${totalSecrets} secrets found across packages`,
                priority: ANALYSIS_CONSTANTS.PRIORITY_LEVELS.CRITICAL,
                category: ANALYSIS_CONSTANTS.RECOMMENDATION_CATEGORIES.SECRETS
            });
        }
        
        return recommendations;
    }
}

module.exports = SecurityService; 