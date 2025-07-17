/**
 * ArchitectureService - Domain service for architecture analysis
 */
const ServiceLogger = require('@logging/ServiceLogger');

class ArchitectureService {
  constructor(architectureAnalyzer, eventBus, logger, analysisOutputService, analysisRepository) {
    this.architectureAnalyzer = architectureAnalyzer;
    this.eventBus = eventBus || { emit: () => {} };
    this.logger = logger || new ServiceLogger('ArchitectureService');
    this.analysisOutputService = analysisOutputService;
    this.analysisRepository = analysisRepository;
  }

  /**
   * Analyze architecture for a project
   * @param {string} projectPath - Project directory path
   * @param {Object} options - Analysis options
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Architecture analysis results
   */
  async analyzeArchitecture(projectPath, options = {}, projectId) {
    try {
      this.logger.info(`Starting architecture analysis for project`);

      const analysis = await this.architectureAnalyzer.analyzeArchitecture(projectPath, options);

      // Save to file ONLY if explicitly requested
      if (this.analysisOutputService && options.saveToFile !== false) {
        const fileResult = await this.analysisOutputService.saveAnalysisResult(
          projectId, 
          'architecture', 
          analysis
        );
        
        // Save to database ONLY if explicitly requested
        if (this.analysisRepository && options.saveToDatabase !== false) {
          const AnalysisResult = require('@entities/AnalysisResult');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
          const analysisResult = AnalysisResult.create(
            projectId, 
            'architecture', 
            analysis, 
            fileResult.filepath
          );
          await this.analysisRepository.save(analysisResult);
        }
      }

      this.logger.info(`Architecture analysis completed for project`);
      this.eventBus.emit('architecture:analysis:completed', { projectPath, analysis, projectId });

      return analysis;
    } catch (error) {
      this.logger.error(`Architecture analysis failed for ${projectPath}:`, error);
      this.eventBus.emit('architecture:analysis:failed', { projectPath, error: error.message });
      throw error;
    }
  }

  /**
   * Analyze project structure
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Object>} Project structure analysis
   */
  async analyzeProjectStructure(projectPath) {
    try {
      return await this.architectureAnalyzer.analyzeProjectStructure(projectPath);
    } catch (error) {
      this.logger.error(`Project structure analysis failed:`, error);
      throw error;
    }
  }

  /**
   * Detect design patterns
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Array>} Detected design patterns
   */
  async detectDesignPatterns(projectPath) {
    try {
      return await this.architectureAnalyzer.detectDesignPatterns(projectPath);
    } catch (error) {
      this.logger.error(`Design pattern detection failed:`, error);
      throw error;
    }
  }

  /**
   * Analyze coupling between modules
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Object>} Coupling analysis
   */
  async analyzeCoupling(projectPath) {
    try {
      return await this.architectureAnalyzer.analyzeCoupling(projectPath);
    } catch (error) {
      this.logger.error(`Coupling analysis failed:`, error);
      throw error;
    }
  }

  /**
   * Analyze cohesion within modules
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Object>} Cohesion analysis
   */
  async analyzeCohesion(projectPath) {
    try {
      return await this.architectureAnalyzer.analyzeCohesion(projectPath);
    } catch (error) {
      this.logger.error(`Cohesion analysis failed:`, error);
      throw error;
    }
  }

  /**
   * Generate dependency graph
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Object>} Dependency graph
   */
  async generateDependencyGraph(projectPath) {
    try {
      return await this.architectureAnalyzer.generateDependencyGraph(projectPath);
    } catch (error) {
      this.logger.error(`Dependency graph generation failed:`, error);
      throw error;
    }
  }

  /**
   * Detect architecture violations
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Array>} Architecture violations
   */
  async detectArchitectureViolations(projectPath) {
    try {
      return await this.architectureAnalyzer.detectArchitectureViolations(projectPath);
    } catch (error) {
      this.logger.error(`Architecture violation detection failed:`, error);
      throw error;
    }
  }

  /**
   * Generate architecture recommendations
   * @param {Object} analysis - Architecture analysis results
   * @returns {Promise<Array>} Architecture recommendations
   */
  async generateRecommendations(analysis) {
    try {
      return await this.architectureAnalyzer.generateArchitectureRecommendations(analysis);
    } catch (error) {
      this.logger.error(`Architecture recommendation generation failed:`, error);
      throw error;
    }
  }

  /**
   * Get architecture score
   * @param {Object} analysis - Architecture analysis results
   * @returns {number} Architecture score (0-100)
   */
  getArchitectureScore(analysis) {
    // Use the architectureScore that's already calculated by the analyzer
    return analysis.architectureScore || 0;
  }

  /**
   * Get architecture level based on score
   * @param {number} score - Architecture score
   * @returns {string} Architecture level
   */
  getArchitectureLevel(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
  }

  /**
   * Get critical issues from analysis
   * @param {Object} analysis - Architecture analysis results
   * @returns {Array} Critical issues
   */
  getCriticalIssues(analysis) {
    if (!analysis || !analysis.issues) return [];
    return analysis.issues.filter(issue => issue.severity === 'critical');
  }

  /**
   * Get architecture summary
   * @param {Object} analysis - Architecture analysis results
   * @returns {Object} Architecture summary
   */
  getArchitectureSummary(analysis) {
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
      overallScore: analysis.architectureScore || 0,
      architectureLevel: this.getArchitectureLevel(analysis.architectureScore || 0)
    };
  }

  /**
   * Check if architecture is well-structured
   * @param {Object} analysis - Architecture analysis results
   * @returns {boolean} Architecture is well-structured
   */
  isWellStructured(analysis) {
    return analysis.detectedPatterns.length > 0 && 
           analysis.violations.filter(v => v.severity === 'critical').length === 0;
  }

  /**
   * Check if there are circular dependencies
   * @param {Object} analysis - Architecture analysis results
   * @returns {boolean} Has circular dependencies
   */
  hasCircularDependencies(analysis) {
    return analysis.dependencies.circularDependencies.length > 0;
  }

  /**
   * Get architectural patterns summary
   * @param {Object} analysis - Architecture analysis results
   * @returns {Object} Patterns summary
   */
  getPatternsSummary(analysis) {
    const patterns = {};
    
    for (const pattern of analysis.detectedPatterns) {
      patterns[pattern.pattern] = {
        confidence: pattern.confidence,
        description: pattern.description
      };
    }
    
    return patterns;
  }

  /**
   * Get coupling metrics summary
   * @param {Object} analysis - Architecture analysis results
   * @returns {Object} Coupling metrics summary
   */
  getCouplingSummary(analysis) {
    const modules = Object.keys(analysis.coupling.instability);
    const avgInstability = modules.reduce((sum, module) => 
      sum + analysis.coupling.instability[module], 0) / modules.length;
    
    const highInstabilityCount = modules.filter(module => 
      analysis.coupling.instability[module] > 0.7).length;
    
    return {
      totalModules: modules.length,
      averageInstability: avgInstability,
      highInstabilityModules: highInstabilityCount,
      stableModules: modules.length - highInstabilityCount
    };
  }
}

module.exports = ArchitectureService; 