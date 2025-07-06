/**
 * Analysis Utils - Utility functions for VibeCoder analysis operations
 */

const path = require('path');
const fs = require('fs');
const ANALYSIS_CONSTANTS = require('../constants/analysis-constants');

class AnalysisUtils {
    constructor(logger = console) {
        this.logger = logger;
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
     * Find packages in project
     * @param {string} projectPath - Project path
     * @returns {Promise<Array>} Array of packages
     */
    async findPackages(projectPath) {
        const packages = [];
        
        try {
            // Check root package.json
            const rootPackagePath = path.join(projectPath, 'package.json');
            if (await this.fileExists(rootPackagePath)) {
                packages.push({
                    name: 'root',
                    path: projectPath
                });
            }
            
            // Check common subdirectories
            for (const dir of ANALYSIS_CONSTANTS.COMMON_PACKAGE_DIRS) {
                const dirPath = path.join(projectPath, dir);
                const packagePath = path.join(dirPath, 'package.json');
                
                if (await this.fileExists(packagePath)) {
                    try {
                        const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));
                        packages.push({
                            name: packageJson.name || dir,
                            path: dirPath
                        });
                    } catch (error) {
                        // Ignore package.json parsing errors
                    }
                }
            }
        } catch (error) {
            this.logger.warn('Failed to find packages:', error.message);
        }
        
        return packages;
    }

    /**
     * Check if file exists
     * @param {string} filePath - File path
     * @returns {Promise<boolean>} True if file exists
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Aggregate results and errors
     * @param {Object} results - Results object
     * @param {Array} errors - Errors array
     * @returns {Object} Aggregated results
     */
    aggregateResults(results, errors) {
        return { results, errors };
    }
}

module.exports = AnalysisUtils; 