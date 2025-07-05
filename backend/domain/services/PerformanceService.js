/**
 * PerformanceService - Domain service for performance analysis
 */
class PerformanceService {
  constructor(performanceAnalyzer, eventBus, logger) {
    this.performanceAnalyzer = performanceAnalyzer;
    this.eventBus = eventBus || { emit: () => {} };
    this.logger = logger || { info: () => {}, error: () => {}, warn: () => {} };
  }

  /**
   * Analyze performance for a project
   * @param {string} projectPath - Project directory path
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Performance analysis results
   */
  async analyzePerformance(projectPath, options = {}) {
    try {
      this.logger.info(`[PerformanceService] Starting performance analysis for: ${projectPath}`);

      const analysis = await this.performanceAnalyzer.analyzePerformance(projectPath, options);

      this.logger.info(`[PerformanceService] Performance analysis completed for: ${projectPath}`);
      this.eventBus.emit('performance:analysis:completed', { projectPath, analysis });

      return analysis;
    } catch (error) {
      this.logger.error(`[PerformanceService] Performance analysis failed for ${projectPath}:`, error);
      this.eventBus.emit('performance:analysis:failed', { projectPath, error: error.message });
      throw error;
    }
  }

  /**
   * Analyze build performance
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Object>} Build performance analysis
   */
  async analyzeBuildPerformance(projectPath) {
    try {
      return await this.performanceAnalyzer.analyzeBuildPerformance(projectPath);
    } catch (error) {
      this.logger.error(`[PerformanceService] Build performance analysis failed:`, error);
      throw error;
    }
  }

  /**
   * Analyze bundle size
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Object>} Bundle size analysis
   */
  async analyzeBundleSize(projectPath) {
    try {
      return await this.performanceAnalyzer.analyzeBundleSize(projectPath);
    } catch (error) {
      this.logger.error(`[PerformanceService] Bundle size analysis failed:`, error);
      throw error;
    }
  }

  /**
   * Analyze runtime performance
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Object>} Runtime performance analysis
   */
  async analyzeRuntimePerformance(projectPath) {
    try {
      return await this.performanceAnalyzer.analyzeRuntimePerformance(projectPath);
    } catch (error) {
      this.logger.error(`[PerformanceService] Runtime performance analysis failed:`, error);
      throw error;
    }
  }

  /**
   * Identify optimization opportunities
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Array>} Optimization opportunities
   */
  async identifyOptimizations(projectPath) {
    try {
      return await this.performanceAnalyzer.identifyOptimizations(projectPath);
    } catch (error) {
      this.logger.error(`[PerformanceService] Optimization identification failed:`, error);
      throw error;
    }
  }

  /**
   * Identify performance bottlenecks
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Array>} Performance bottlenecks
   */
  async identifyBottlenecks(projectPath) {
    try {
      return await this.performanceAnalyzer.identifyBottlenecks(projectPath);
    } catch (error) {
      this.logger.error(`[PerformanceService] Bottleneck identification failed:`, error);
      throw error;
    }
  }

  /**
   * Generate performance recommendations
   * @param {Object} analysis - Performance analysis results
   * @returns {Promise<Array>} Performance recommendations
   */
  async generateRecommendations(analysis) {
    try {
      return await this.performanceAnalyzer.generatePerformanceRecommendations(analysis);
    } catch (error) {
      this.logger.error(`[PerformanceService] Performance recommendation generation failed:`, error);
      throw error;
    }
  }

  /**
   * Get performance score
   * @param {Object} analysis - Performance analysis results
   * @returns {number} Performance score (0-100)
   */
  getPerformanceScore(analysis) {
    return this.performanceAnalyzer.calculateOverallScore(analysis);
  }

  /**
   * Get performance level based on score
   * @param {number} score - Performance score
   * @returns {string} Performance level
   */
  getPerformanceLevel(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
  }

  /**
   * Check if build time is acceptable
   * @param {Object} analysis - Performance analysis results
   * @returns {boolean} Build time is acceptable
   */
  isBuildTimeAcceptable(analysis) {
    const buildTime = analysis.buildPerformance.buildTime;
    return buildTime === null || buildTime < 60000; // Less than 1 minute
  }

  /**
   * Check if bundle size is acceptable
   * @param {Object} analysis - Performance analysis results
   * @returns {boolean} Bundle size is acceptable
   */
  isBundleSizeAcceptable(analysis) {
    const totalSize = analysis.bundleAnalysis.totalSize;
    return totalSize < 5000000; // Less than 5MB
  }

  /**
   * Get performance summary
   * @param {Object} analysis - Performance analysis results
   * @returns {Object} Performance summary
   */
  getPerformanceSummary(analysis) {
    return {
      overallScore: analysis.overallScore,
      buildTime: analysis.buildPerformance.buildTime,
      bundleSize: analysis.bundleAnalysis.totalSize,
      bottlenecks: analysis.bottlenecks.length,
      optimizations: analysis.optimizationOpportunities.length,
      recommendations: analysis.recommendations.length
    };
  }

  /**
   * Get critical performance issues
   * @param {Object} analysis - Performance analysis results
   * @returns {Array} Critical performance issues
   */
  getCriticalIssues(analysis) {
    const issues = [];

    // Check build time
    if (analysis.buildPerformance.buildTime > 120000) { // 2 minutes
      issues.push({
        type: 'build-time',
        severity: 'critical',
        description: 'Build time is too slow (>2 minutes)',
        value: analysis.buildPerformance.buildTime
      });
    }

    // Check bundle size
    if (analysis.bundleAnalysis.totalSize > 10000000) { // 10MB
      issues.push({
        type: 'bundle-size',
        severity: 'critical',
        description: 'Bundle size is too large (>10MB)',
        value: analysis.bundleAnalysis.totalSize
      });
    }

    // Check bottlenecks
    const criticalBottlenecks = analysis.bottlenecks.filter(b => b.severity === 'critical');
    if (criticalBottlenecks.length > 0) {
      issues.push({
        type: 'bottlenecks',
        severity: 'critical',
        description: `${criticalBottlenecks.length} critical performance bottlenecks found`,
        value: criticalBottlenecks.length
      });
    }

    return issues;
  }
}

module.exports = PerformanceService; 