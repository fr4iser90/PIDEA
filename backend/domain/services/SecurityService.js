/**
 * SecurityService - Domain service for security analysis
 */
class SecurityService {
  constructor(securityAnalyzer, eventBus, logger) {
    this.securityAnalyzer = securityAnalyzer;
    this.eventBus = eventBus || { emit: () => {} };
    this.logger = logger || { info: () => {}, error: () => {}, warn: () => {} };
  }

  /**
   * Analyze security for a project
   * @param {string} projectPath - Project directory path
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Security analysis results
   */
  async analyzeSecurity(projectPath, options = {}) {
    try {
      this.logger.info(`[SecurityService] Starting security analysis for: ${projectPath}`);

      const analysis = await this.securityAnalyzer.analyzeSecurity(projectPath, options);

      this.logger.info(`[SecurityService] Security analysis completed for: ${projectPath}`);
      this.eventBus.emit('security:analysis:completed', { projectPath, analysis });

      return analysis;
    } catch (error) {
      this.logger.error(`[SecurityService] Security analysis failed for ${projectPath}:`, error);
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
      this.logger.error(`[SecurityService] Dependency vulnerability analysis failed:`, error);
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
      this.logger.error(`[SecurityService] Security configuration analysis failed:`, error);
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
      this.logger.error(`[SecurityService] Code security analysis failed:`, error);
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
      this.logger.error(`[SecurityService] Secrets analysis failed:`, error);
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
      this.logger.error(`[SecurityService] Security recommendation generation failed:`, error);
      throw error;
    }
  }

  /**
   * Get security score
   * @param {Object} analysis - Security analysis results
   * @returns {number} Security score (0-100)
   */
  getSecurityScore(analysis) {
    return this.securityAnalyzer.calculateSecurityScore(analysis);
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
}

module.exports = SecurityService; 