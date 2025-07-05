/**
 * CodeQualityService - Domain service for code quality analysis
 */
class CodeQualityService {
  constructor(codeQualityAnalyzer, eventBus, logger) {
    this.codeQualityAnalyzer = codeQualityAnalyzer;
    this.eventBus = eventBus || { emit: () => {} };
    this.logger = logger || { info: () => {}, error: () => {}, warn: () => {} };
  }

  /**
   * Analyze code quality for a project
   * @param {string} projectPath - Project directory path
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Code quality analysis results
   */
  async analyzeCodeQuality(projectPath, options = {}) {
    try {
      this.logger.info(`[CodeQualityService] Starting code quality analysis for: ${projectPath}`);

      const analysis = await this.codeQualityAnalyzer.analyzeCodeQuality(projectPath, options);

      this.logger.info(`[CodeQualityService] Code quality analysis completed for: ${projectPath}`);
      this.eventBus.emit('code-quality:analysis:completed', { projectPath, analysis });

      return analysis;
    } catch (error) {
      this.logger.error(`[CodeQualityService] Code quality analysis failed for ${projectPath}:`, error);
      this.eventBus.emit('code-quality:analysis:failed', { projectPath, error: error.message });
      throw error;
    }
  }

  /**
   * Analyze linting configuration
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Object>} Linting configuration analysis
   */
  async analyzeLintingConfig(projectPath) {
    try {
      return await this.codeQualityAnalyzer.analyzeLintingConfig(projectPath);
    } catch (error) {
      this.logger.error(`[CodeQualityService] Linting config analysis failed:`, error);
      throw error;
    }
  }

  /**
   * Analyze formatting configuration
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Object>} Formatting configuration analysis
   */
  async analyzeFormattingConfig(projectPath) {
    try {
      return await this.codeQualityAnalyzer.analyzeFormattingConfig(projectPath);
    } catch (error) {
      this.logger.error(`[CodeQualityService] Formatting config analysis failed:`, error);
      throw error;
    }
  }

  /**
   * Analyze code complexity
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Object>} Complexity analysis
   */
  async analyzeComplexity(projectPath) {
    try {
      return await this.codeQualityAnalyzer.analyzeComplexity(projectPath);
    } catch (error) {
      this.logger.error(`[CodeQualityService] Complexity analysis failed:`, error);
      throw error;
    }
  }

  /**
   * Analyze maintainability
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Object>} Maintainability analysis
   */
  async analyzeMaintainability(projectPath) {
    try {
      return await this.codeQualityAnalyzer.analyzeMaintainability(projectPath);
    } catch (error) {
      this.logger.error(`[CodeQualityService] Maintainability analysis failed:`, error);
      throw error;
    }
  }

  /**
   * Run ESLint analysis
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Array>} ESLint issues
   */
  async runESLintAnalysis(projectPath) {
    try {
      return await this.codeQualityAnalyzer.runESLintAnalysis(projectPath);
    } catch (error) {
      this.logger.error(`[CodeQualityService] ESLint analysis failed:`, error);
      throw error;
    }
  }

  /**
   * Generate code quality recommendations
   * @param {Object} analysis - Code quality analysis results
   * @returns {Promise<Array>} Recommendations
   */
  async generateRecommendations(analysis) {
    try {
      return await this.codeQualityAnalyzer.generateRecommendations(analysis);
    } catch (error) {
      this.logger.error(`[CodeQualityService] Recommendation generation failed:`, error);
      throw error;
    }
  }

  /**
   * Get code quality score
   * @param {Object} analysis - Code quality analysis results
   * @returns {number} Quality score (0-100)
   */
  getQualityScore(analysis) {
    return this.codeQualityAnalyzer.calculateOverallScore(analysis);
  }

  /**
   * Get quality level based on score
   * @param {number} score - Quality score
   * @returns {string} Quality level
   */
  getQualityLevel(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
  }
}

module.exports = CodeQualityService; 