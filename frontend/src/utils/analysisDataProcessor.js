/**
 * Analysis Data Processor Utility
 * Handles processing of new analysis data formats from backend
 * Supports SecurityAnalysisOrchestrator, TechStackAnalysisStep, CodeQualityAnalysisStep
 * 
 * Created: 2025-07-30T19:53:33.000Z
 * Last Updated: 2025-07-30T19:53:33.000Z
 */

import { logger } from "@/infrastructure/logging/Logger";

/**
 * Process SecurityAnalysisOrchestrator data structure
 * @param {Object} securityData - Raw security analysis data
 * @returns {Object} Processed security data with scanner results
 */
export const processSecurityData = (securityData) => {
  if (!securityData) {
    logger.warn('No security data provided to processSecurityData');
    return null;
  }

  try {
    const processed = {
      summary: securityData.summary || {},
      scanners: {},
      vulnerabilities: [],
      bestPractices: [],
      score: securityData.summary?.securityScore || 0,
      totalSteps: securityData.summary?.totalSteps || 0,
      completedSteps: securityData.summary?.completedSteps || 0,
      failedSteps: securityData.summary?.failedSteps || 0
    };

    // Process scanner details
    if (securityData.details) {
      const scannerNames = [
        'TrivySecurityStep',
        'SnykSecurityStep', 
        'SemgrepSecurityStep',
        'SecretScanningStep',
        'ZapSecurityStep',
        'ComplianceSecurityStep'
      ];

      let totalVulnerabilities = 0;
      let totalBestPractices = 0;
      let completedScanners = 0;

      scannerNames.forEach(scannerName => {
        const scannerData = securityData.details[scannerName];
        if (scannerData) {
          const vulnerabilities = scannerData.success ? (scannerData.result?.vulnerabilities || []) : [];
          const bestPractices = scannerData.success ? (scannerData.result?.bestPractices || []) : [];
          
          processed.scanners[scannerName] = {
            status: scannerData.success ? 'completed' : 'failed',
            vulnerabilities: vulnerabilities.length,
            bestPractices: bestPractices.length,
            severity: calculateSeverity(vulnerabilities),
            details: scannerData,
            lastUpdated: new Date().toISOString()
          };

          if (scannerData.success) completedScanners++;
          totalVulnerabilities += vulnerabilities.length;
          totalBestPractices += bestPractices.length;

          // Aggregate vulnerabilities
          if (vulnerabilities.length > 0) {
            processed.vulnerabilities.push(...vulnerabilities.map(v => ({
              ...v,
              scanner: scannerName.replace('SecurityStep', '').replace('Step', ''),
              scannerFullName: scannerName
            })));
          }

          // Aggregate best practices
          if (bestPractices.length > 0) {
            processed.bestPractices.push(...bestPractices.map(bp => ({
              ...bp,
              scanner: scannerName.replace('SecurityStep', '').replace('Step', ''),
              scannerFullName: scannerName
            })));
          }
        }
      });

      processed.totalVulnerabilities = totalVulnerabilities;
      processed.totalBestPractices = totalBestPractices;
      processed.completedScanners = completedScanners;
      processed.totalScanners = Object.keys(processed.scanners).length;
      processed.overallStatus = determineOverallStatus(processed.scanners);
      processed.trends = calculateSecurityTrends(securityData);
    }

    return processed;
  } catch (error) {
    logger.error('Error processing security data:', error);
    return null;
  }
};

/**
 * Calculate severity level based on vulnerabilities
 * @param {Array} vulnerabilities - Array of vulnerabilities
 * @returns {string} Severity level
 */
const calculateSeverity = (vulnerabilities) => {
  if (!vulnerabilities || vulnerabilities.length === 0) return 'none';
  
  const severityCounts = vulnerabilities.reduce((acc, vuln) => {
    const severity = vuln.severity?.toLowerCase() || 'low';
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {});

  if (severityCounts.critical > 0) return 'critical';
  if (severityCounts.high > 0) return 'high';
  if (severityCounts.medium > 0) return 'medium';
  return 'low';
};

/**
 * Determine overall security status
 * @param {Object} scanners - Scanner data
 * @returns {string} Overall status
 */
const determineOverallStatus = (scanners) => {
  const scannerArray = Object.values(scanners);
  const completedScanners = scannerArray.filter(s => s.status === 'completed').length;
  const totalScanners = scannerArray.length;
  
  if (totalScanners === 0) return 'unknown';
  if (completedScanners === totalScanners) return 'excellent';
  if (completedScanners >= totalScanners * 0.8) return 'good';
  if (completedScanners >= totalScanners * 0.5) return 'fair';
  return 'poor';
};

/**
 * Calculate security trends (placeholder for future implementation)
 * @param {Object} securityData - Security data
 * @returns {Object} Trends data
 */
const calculateSecurityTrends = (securityData) => {
  return {
    scoreTrend: 'stable',
    vulnerabilityTrend: 'decreasing',
    scannerCoverage: '100%',
    lastUpdated: new Date().toISOString()
  };
};

/**
 * Process TechStackAnalysisStep data structure
 * @param {Object} techStackData - Raw tech stack analysis data
 * @returns {Object} Processed tech stack data with technologies array
 */
export const processTechStackData = (techStackData) => {
  if (!techStackData) {
    logger.warn('No tech stack data provided to processTechStackData');
    return null;
  }

  try {
    const processed = {
      technologies: [],
      dependencies: techStackData.dependencies || {},
      structure: techStackData.structure || {},
      categories: {
        framework: [],
        library: [],
        tool: [],
        runtime: [],
        database: [],
        testing: []
      }
    };

    // Process new technologies array structure
    if (techStackData.results?.technologies) {
      processed.technologies = techStackData.results.technologies.map(tech => ({
        name: tech.name || 'Unknown',
        version: tech.version || 'Unknown',
        category: tech.category || 'other',
        type: tech.type || 'technology',
        confidence: tech.confidence || 'medium',
        description: tech.description || '',
        homepage: tech.homepage || '',
        repository: tech.repository || '',
        license: tech.license || '',
        isOutdated: tech.isOutdated || false,
        latestVersion: tech.latestVersion || null,
        updateAvailable: tech.updateAvailable || false
      }));

      // Categorize technologies
      processed.technologies.forEach(tech => {
        const category = tech.category.toLowerCase();
        if (processed.categories[category]) {
          processed.categories[category].push(tech);
        } else {
          processed.categories.other = processed.categories.other || [];
          processed.categories.other.push(tech);
        }
      });
    }

    // Fallback to old dependencies structure if technologies array is empty
    if (processed.technologies.length === 0 && techStackData.dependencies) {
      const deps = techStackData.dependencies.direct || {};
      processed.technologies = Object.entries(deps).map(([name, version]) => ({
        name,
        version,
        category: 'library',
        type: 'dependency',
        confidence: 'high',
        isOutdated: false
      }));
    }

    // Calculate tech stack metrics
    processed.metrics = {
      totalTechnologies: processed.technologies.length,
      technologiesByCategory: Object.entries(processed.categories).reduce((acc, [category, techs]) => {
        acc[category] = techs.length;
        return acc;
      }, {}),
      technologiesByConfidence: processed.technologies.reduce((acc, tech) => {
        acc[tech.confidence] = (acc[tech.confidence] || 0) + 1;
        return acc;
      }, {}),
      outdatedCount: processed.technologies.filter(t => t.isOutdated).length,
      updateAvailableCount: processed.technologies.filter(t => t.updateAvailable).length
    };

    return processed;
  } catch (error) {
    logger.error('Error processing tech stack data:', error);
    return null;
  }
};

/**
 * Process CodeQualityAnalysisStep data structure
 * @param {Object} codeQualityData - Raw code quality analysis data
 * @returns {Object} Processed code quality data with complexity metrics
 */
export const processCodeQualityData = (codeQualityData) => {
  if (!codeQualityData) {
    logger.warn('No code quality data provided to processCodeQualityData');
    return null;
  }

  try {
    const processed = {
      complexity: codeQualityData.complexity || {},
      issues: [],
      metrics: {},
      recommendations: []
    };

    // Process complexity data
    if (codeQualityData.complexity) {
      processed.complexity = {
        averageComplexity: codeQualityData.complexity.averageComplexity || 0,
        totalComplexity: codeQualityData.complexity.totalComplexity || 0,
        highComplexityFiles: codeQualityData.complexity.highComplexityFiles || 0,
        totalFiles: codeQualityData.complexity.totalFiles || 0,
        complexityDistribution: codeQualityData.complexity.distribution || {},
        maxComplexity: codeQualityData.complexity.maxComplexity || 0,
        minComplexity: codeQualityData.complexity.minComplexity || 0
      };
    }

    // Process issues
    if (codeQualityData.issues) {
      processed.issues = codeQualityData.issues.map(issue => ({
        type: issue.type || 'unknown',
        severity: issue.severity || 'medium',
        message: issue.message || 'No message provided',
        suggestion: issue.suggestion || '',
        file: issue.file || null,
        line: issue.line || null,
        column: issue.column || null,
        rule: issue.rule || null,
        category: issue.category || 'code-quality',
        complexity: issue.complexity || null,
        maintainability: issue.maintainability || null,
        readability: issue.readability || null
      }));
    }

    // Process metrics
    if (codeQualityData.metrics) {
      processed.metrics = {
        maintainabilityIndex: codeQualityData.metrics.maintainabilityIndex || 0,
        cyclomaticComplexity: codeQualityData.metrics.cyclomaticComplexity || 0,
        halsteadMetrics: codeQualityData.metrics.halsteadMetrics || {},
        linesOfCode: codeQualityData.metrics.linesOfCode || 0,
        commentLines: codeQualityData.metrics.commentLines || 0,
        codeLines: codeQualityData.metrics.codeLines || 0,
        commentRatio: codeQualityData.metrics.commentRatio || 0,
        duplicationRatio: codeQualityData.metrics.duplicationRatio || 0,
        testCoverage: codeQualityData.metrics.testCoverage || 0
      };
    }

    // Process recommendations
    if (codeQualityData.recommendations) {
      processed.recommendations = codeQualityData.recommendations.map(rec => ({
        title: rec.title || 'Code Quality Improvement',
        description: rec.description || '',
        priority: rec.priority || 'medium',
        category: rec.category || 'code-quality',
        effort: rec.effort || 'medium',
        impact: rec.impact || 'medium',
        file: rec.file || null,
        line: rec.line || null,
        suggestion: rec.suggestion || '',
        estimatedTime: rec.estimatedTime || null,
        tags: rec.tags || []
      }));
    }

    // Calculate quality metrics
    processed.qualityMetrics = {
      totalIssues: processed.issues.length,
      issuesBySeverity: processed.issues.reduce((acc, issue) => {
        acc[issue.severity] = (acc[issue.severity] || 0) + 1;
        return acc;
      }, {}),
      issuesByType: processed.issues.reduce((acc, issue) => {
        acc[issue.type] = (acc[issue.type] || 0) + 1;
        return acc;
      }, {}),
      totalRecommendations: processed.recommendations.length,
      recommendationsByPriority: processed.recommendations.reduce((acc, rec) => {
        acc[rec.priority] = (acc[rec.priority] || 0) + 1;
        return acc;
      }, {}),
      qualityScore: calculateQualityScore(processed)
    };

    return processed;
  } catch (error) {
    logger.error('Error processing code quality data:', error);
    return null;
  }
};

/**
 * Calculate overall quality score based on various metrics
 * @param {Object} processedData - Processed code quality data
 * @returns {number} Quality score (0-100)
 */
const calculateQualityScore = (processedData) => {
  let score = 100;

  // Deduct points for issues
  const severityWeights = { critical: 10, high: 5, medium: 2, low: 1 };
  processedData.issues.forEach(issue => {
    score -= severityWeights[issue.severity] || 1;
  });

  // Deduct points for high complexity
  if (processedData.complexity.averageComplexity > 10) {
    score -= Math.min(20, (processedData.complexity.averageComplexity - 10) * 2);
  }

  // Deduct points for low maintainability
  if (processedData.metrics.maintainabilityIndex < 50) {
    score -= Math.min(15, (50 - processedData.metrics.maintainabilityIndex) / 3);
  }

  // Deduct points for low test coverage
  if (processedData.metrics.testCoverage < 80) {
    score -= Math.min(10, (80 - processedData.metrics.testCoverage) / 8);
  }

  return Math.max(0, Math.round(score));
};

/**
 * Process combined analysis data from multiple sources
 * @param {Object} analysisData - Combined analysis data object
 * @returns {Object} Processed combined data
 */
export const processCombinedAnalysisData = (analysisData) => {
  if (!analysisData) {
    logger.warn('No analysis data provided to processCombinedAnalysisData');
    return null;
  }

  try {
    const processed = {
      security: null,
      techStack: null,
      codeQuality: null,
      summary: {
        totalAnalyses: 0,
        completedAnalyses: 0,
        failedAnalyses: 0,
        overallScore: 0
      }
    };

    // Process security data
    if (analysisData.security) {
      processed.security = processSecurityData(analysisData.security);
      if (processed.security) {
        processed.summary.totalAnalyses++;
        processed.summary.completedAnalyses++;
      }
    }

    // Process tech stack data
    if (analysisData.techStack) {
      processed.techStack = processTechStackData(analysisData.techStack);
      if (processed.techStack) {
        processed.summary.totalAnalyses++;
        processed.summary.completedAnalyses++;
      }
    }

    // Process code quality data
    if (analysisData.codeQuality) {
      processed.codeQuality = processCodeQualityData(analysisData.codeQuality);
      if (processed.codeQuality) {
        processed.summary.totalAnalyses++;
        processed.summary.completedAnalyses++;
      }
    }

    // Calculate overall score
    const scores = [];
    if (processed.security?.securityScore) scores.push(processed.security.securityScore);
    if (processed.codeQuality?.qualityMetrics?.qualityScore) scores.push(processed.codeQuality.qualityMetrics.qualityScore);
    
    if (scores.length > 0) {
      processed.summary.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    return processed;
  } catch (error) {
    logger.error('Error processing combined analysis data:', error);
    return null;
  }
};

/**
 * Validate analysis data structure
 * @param {Object} data - Data to validate
 * @param {string} type - Expected data type
 * @returns {boolean} Whether data is valid
 */
export const validateAnalysisData = (data, type) => {
  if (!data) return false;

  try {
    switch (type) {
      case 'security':
        return !!(data.summary && data.details);
      case 'techStack':
        return !!(data.results?.technologies || data.dependencies || data.structure);
      case 'codeQuality':
        return !!(data.complexity || data.issues || data.metrics);
      default:
        return true;
    }
  } catch (error) {
    logger.error('Error validating analysis data:', error);
    return false;
  }
};

export default {
  processSecurityData,
  processTechStackData,
  processCodeQualityData,
  processCombinedAnalysisData,
  validateAnalysisData
}; 