/**
 * SecurityService - Domain service for security analysis
 */
class SecurityService {
  constructor(securityAnalyzer, eventBus, logger, analysisOutputService, analysisRepository) {
    this.securityAnalyzer = securityAnalyzer;
    this.eventBus = eventBus || { emit: () => {} };
    this.logger = logger || { info: () => {}, error: () => {}, warn: () => {} };
    this.analysisOutputService = analysisOutputService;
    this.analysisRepository = analysisRepository;
  }

  /**
   * Analyze security for a project
   * @param {string} projectPath - Project directory path
   * @param {Object} options - Analysis options
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Security analysis results
   */
  async analyzeSecurity(projectPath, options = {}, projectId) {
    try {
      this.logger.info(`Starting security analysis for project`);

      const analysis = await this.securityAnalyzer.analyzeSecurity(projectPath, options);

      // Save to file ONLY if explicitly requested
      if (this.analysisOutputService && options.saveToFile !== false) {
        const fileResult = await this.analysisOutputService.saveAnalysisResult(
          projectId, 
          'security', 
          analysis
        );
        
        // Save to database ONLY if explicitly requested
        if (this.analysisRepository && options.saveToDatabase !== false) {
          const AnalysisResult = require('@entities/AnalysisResult');
          const Logger = require('@logging/Logger');
          const logger = new Logger('SecurityService');
          const analysisResult = AnalysisResult.create(
            projectId, 
            'security', 
            analysis, 
            fileResult.filepath
          );
          await this.analysisRepository.save(analysisResult);
        }
      }

      this.logger.info(`Security analysis completed for project`);
      this.eventBus.emit('security:analysis:completed', { projectPath, analysis, projectId });

      return analysis;
    } catch (error) {
      this.logger.error(`Security analysis failed:`, error.message);
      this.eventBus.emit('security:analysis:failed', { projectPath, error: error.message });
      throw error;
    }
  }

  /**
   * Analyze dependency vulnerabilities
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Object>} Dependency vulnerability analysis
   */
  async analyzeDependencyVulnerabilities(projectPath) {
    try {
      return await this.securityAnalyzer.analyzeDependencyVulnerabilities(projectPath);
    } catch (error) {
      this.logger.error(`Dependency vulnerability analysis failed:`, error);
      throw error;
    }
  }

  /**
   * Analyze security configuration
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Object>} Security configuration analysis
   */
  async analyzeSecurityConfiguration(projectPath) {
    try {
      return await this.securityAnalyzer.analyzeSecurityConfiguration(projectPath);
    } catch (error) {
      this.logger.error(`Security configuration analysis failed:`, error);
      throw error;
    }
  }

  /**
   * Analyze code for security issues
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Array>} Code security issues
   */
  async analyzeCodeSecurity(projectPath) {
    try {
      return await this.securityAnalyzer.analyzeCodeSecurity(projectPath);
    } catch (error) {
      this.logger.error(`Code security analysis failed:`, error);
      throw error;
    }
  }

  /**
   * Analyze for secrets and sensitive data
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Object>} Secrets analysis
   */
  async analyzeSecrets(projectPath) {
    try {
      return await this.securityAnalyzer.analyzeSecrets(projectPath);
    } catch (error) {
      this.logger.error(`Secrets analysis failed:`, error);
      throw error;
    }
  }

  /**
   * Generate security recommendations
   * @param {Object} analysis - Security analysis results
   * @returns {Promise<Array>} Security recommendations
   */
  async generateRecommendations(analysis) {
    try {
      return await this.securityAnalyzer.generateSecurityRecommendations(analysis);
    } catch (error) {
      this.logger.error(`Security recommendation generation failed:`, error);
      throw error;
    }
  }

  /**
   * Get security score
   * @param {Object} analysis - Security analysis results
   * @returns {number} Security score (0-100)
   */
  getSecurityScore(analysis) {
    // Use the securityScore that's already calculated by the analyzer
    return analysis.securityScore || 0;
  }

  /**
   * Get risk level based on score
   * @param {number} score - Security score
   * @returns {string} Risk level
   */
  getRiskLevel(score) {
    if (score >= 90) return 'low';
    if (score >= 70) return 'medium';
    if (score >= 50) return 'high';
    return 'critical';
  }

  /**
   * Get overall risk level
   * @param {Object} analysis - Security analysis results
   * @returns {string} Overall risk level
   */
  getOverallRiskLevel(analysis) {
    return this.securityAnalyzer.calculateRiskLevel(analysis);
  }

  /**
   * Check if project has critical vulnerabilities
   * @param {Object} analysis - Security analysis results
   * @returns {boolean} Has critical vulnerabilities
   */
  hasCriticalVulnerabilities(analysis) {
    return analysis.dependencies.critical > 0 || 
           analysis.codeIssues.some(issue => issue.severity === 'critical') ||
           analysis.secrets.found.some(secret => secret.severity === 'critical');
  }

  /**
   * Get vulnerability summary
   * @param {Object} analysis - Security analysis results
   * @returns {Object} Vulnerability summary
   */
  getVulnerabilitySummary(analysis) {
    return {
      total: analysis.dependencies.total,
      critical: analysis.dependencies.critical,
      high: analysis.dependencies.high,
      medium: analysis.dependencies.medium,
      low: analysis.dependencies.low,
      codeIssues: analysis.codeIssues.length,
      secrets: analysis.secrets.found.length
    };
  }

  /**
   * Get security level based on score
   * @param {number} score - Security score
   * @returns {string} Security level
   */
  getSecurityLevel(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
  }

  /**
   * Get critical issues from analysis
   * @param {Object} analysis - Security analysis results
   * @returns {Array} Critical issues
   */
  getCriticalIssues(analysis) {
    if (!analysis) return [];
    
    const criticalIssues = [];
    
    // Add critical dependency vulnerabilities
    if (analysis.dependencies && analysis.dependencies.critical) {
      criticalIssues.push(...analysis.dependencies.critical.map(vuln => ({
        type: 'dependency',
        severity: 'critical',
        title: vuln.title,
        description: vuln.description
      })));
    }
    
    // Add critical code issues
    if (analysis.codeIssues) {
      criticalIssues.push(...analysis.codeIssues.filter(issue => issue.severity === 'critical'));
    }
    
    // Add critical secrets
    if (analysis.secrets && analysis.secrets.found) {
      criticalIssues.push(...analysis.secrets.found.filter(secret => secret.severity === 'critical'));
    }
    
    return criticalIssues;
  }

  /**
   * Get security summary
   * @param {Object} analysis - Security analysis results
   * @returns {Object} Security summary
   */
  getSecuritySummary(analysis) {
    if (!analysis) return {};
    
    const criticalIssues = this.getCriticalIssues(analysis);
    const score = this.getSecurityScore(analysis);
    
    return {
      totalVulnerabilities: analysis.dependencies?.total || 0,
      criticalVulnerabilities: analysis.dependencies?.critical?.length || 0,
      highVulnerabilities: analysis.dependencies?.high?.length || 0,
      mediumVulnerabilities: analysis.dependencies?.medium?.length || 0,
      lowVulnerabilities: analysis.dependencies?.low?.length || 0,
      codeIssues: analysis.codeIssues?.length || 0,
      secretsFound: analysis.secrets?.found?.length || 0,
      criticalIssues: criticalIssues.length,
      overallScore: score,
      securityLevel: this.getSecurityLevel(score)
    };
  }
}

module.exports = SecurityService; 