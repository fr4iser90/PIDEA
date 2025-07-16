/**
 * CodeQualityService - Domain service for code quality analysis
 */
class CodeQualityService {
  constructor(codeQualityAnalyzer, eventBus, logger, analysisOutputService, analysisRepository) {
    this.codeQualityAnalyzer = codeQualityAnalyzer;
    this.eventBus = eventBus || { emit: () => {} };
    this.logger = logger || { info: () => {}, error: () => {}, warn: () => {} };
    this.analysisOutputService = analysisOutputService;
    this.analysisRepository = analysisRepository;
  }

  /**
   * Analyze code quality for a project
   * @param {string} projectPath - Project directory path
   * @param {Object} options - Analysis options
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Code quality analysis results
   */
  async analyzeCodeQuality(projectPath, options = {}, projectId) {
    try {
      this.logger.info(`Starting code quality analysis for project`);

      const analysis = await this.codeQualityAnalyzer.analyzeCodeQuality(projectPath, options);

      // Save to file ONLY if explicitly requested
      if (this.analysisOutputService && options.saveToFile !== false) {
        const fileResult = await this.analysisOutputService.saveAnalysisResult(
          projectId, 
          'codeQuality', 
          analysis
        );
        
        // Save to database ONLY if explicitly requested
        if (this.analysisRepository && options.saveToDatabase !== false) {
          const AnalysisResult = require('@entities/AnalysisResult');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
          const analysisResult = AnalysisResult.create(
            projectId, 
            'codeQuality', 
            analysis, 
            fileResult.filepath
          );
          await this.analysisRepository.save(analysisResult);
        }
      }

      this.logger.info(`Code quality analysis completed for project`);
      this.eventBus.emit('code-quality:analysis:completed', { projectPath, analysis, projectId });

      return analysis;
    } catch (error) {
      this.logger.error(`Code quality analysis failed for ${projectPath}:`, error);
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
      this.logger.error(`Linting config analysis failed:`, error);
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
      this.logger.error(`Formatting config analysis failed:`, error);
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
      this.logger.error(`Complexity analysis failed:`, error);
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
      this.logger.error(`Maintainability analysis failed:`, error);
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
      this.logger.error(`ESLint analysis failed:`, error);
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
      this.logger.error(`Recommendation generation failed:`, error);
      throw error;
    }
  }

  /**
   * Get code quality score
   * @param {Object} analysis - Code quality analysis results
   * @returns {number} Quality score (0-100)
   */
  getQualityScore(analysis) {
    // Use the overallScore that's already calculated by the analyzer
    return analysis.overallScore || 0;
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

  /**
   * Get critical issues from analysis
   * @param {Object} analysis - Code quality analysis results
   * @returns {Array} Critical issues
   */
  getCriticalIssues(analysis) {
    if (!analysis || !analysis.issues) return [];
    return analysis.issues.filter(issue => issue.severity === 'critical');
  }

  /**
   * Get quality summary
   * @param {Object} analysis - Code quality analysis results
   * @returns {Object} Quality summary
   */
  getQualitySummary(analysis) {
    if (!analysis) return {};
    
    const issues = analysis.issues || [];
    const criticalIssues = issues.filter(issue => issue.severity === 'critical');
    const highIssues = issues.filter(issue => issue.severity === 'high');
    const mediumIssues = issues.filter(issue => issue.severity === 'medium');
    const lowIssues = issues.filter(issue => issue.severity === 'low');
    
    return {
      totalIssues: issues.length,
      criticalIssues: criticalIssues.length,
      highIssues: highIssues.length,
      mediumIssues: mediumIssues.length,
      lowIssues: lowIssues.length,
      overallScore: analysis.overallScore || 0,
      qualityLevel: this.getQualityLevel(analysis.overallScore || 0)
    };
  }
}

module.exports = CodeQualityService; 