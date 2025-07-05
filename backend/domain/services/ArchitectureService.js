/**
 * ArchitectureService - Domain service for architecture analysis
 */
class ArchitectureService {
  constructor(architectureAnalyzer, eventBus, logger, analysisOutputService, analysisRepository) {
    this.architectureAnalyzer = architectureAnalyzer;
    this.eventBus = eventBus || { emit: () => {} };
    this.logger = logger || { info: () => {}, error: () => {}, warn: () => {} };
    this.analysisOutputService = analysisOutputService;
    this.analysisRepository = analysisRepository;
  }

  /**
   * Analyze architecture for a project
   * @param {string} projectPath - Project directory path
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Architecture analysis results
   */
  async analyzeArchitecture(projectPath, options = {}, projectId = 'default') {
    try {
      this.logger.info(`[ArchitectureService] Starting architecture analysis for: ${projectPath}`);

      const analysis = await this.architectureAnalyzer.analyzeArchitecture(projectPath, options);

      // Save to file
      if (this.analysisOutputService) {
        const fileResult = await this.analysisOutputService.saveAnalysisResult(
          projectId, 
          'architecture', 
          analysis
        );
        
        // Save to database
        if (this.analysisRepository) {
          const AnalysisResult = require('../entities/AnalysisResult');
          const analysisResult = AnalysisResult.create(
            projectId, 
            'architecture', 
            analysis, 
            fileResult.filepath
          );
          await this.analysisRepository.save(analysisResult);
        }
      }

      this.logger.info(`[ArchitectureService] Architecture analysis completed for: ${projectPath}`);
      this.eventBus.emit('architecture:analysis:completed', { projectPath, analysis, projectId });

      return analysis;
    } catch (error) {
      this.logger.error(`[ArchitectureService] Architecture analysis failed for ${projectPath}:`, error);
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
      this.logger.error(`[ArchitectureService] Project structure analysis failed:`, error);
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
      this.logger.error(`[ArchitectureService] Design pattern detection failed:`, error);
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
      this.logger.error(`[ArchitectureService] Coupling analysis failed:`, error);
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
      this.logger.error(`[ArchitectureService] Cohesion analysis failed:`, error);
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
      this.logger.error(`[ArchitectureService] Dependency graph generation failed:`, error);
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
      this.logger.error(`[ArchitectureService] Architecture violation detection failed:`, error);
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
      this.logger.error(`[ArchitectureService] Architecture recommendation generation failed:`, error);
      throw error;
    }
  }

  /**
   * Get architecture score
   * @param {Object} analysis - Architecture analysis results
   * @returns {number} Architecture score (0-100)
   */
  getArchitectureScore(analysis) {
    return this.architectureAnalyzer.calculateArchitectureScore(analysis);
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
   * Get architecture summary
   * @param {Object} analysis - Architecture analysis results
   * @returns {Object} Architecture summary
   */
  getArchitectureSummary(analysis) {
    return {
      overallScore: analysis.architectureScore,
      patterns: analysis.detectedPatterns.length,
      violations: analysis.violations.length,
      circularDependencies: analysis.dependencies.circularDependencies.length,
      modules: Object.keys(analysis.coupling.instability).length,
      organization: analysis.structure.organization
    };
  }

  /**
   * Get critical architecture issues
   * @param {Object} analysis - Architecture analysis results
   * @returns {Array} Critical architecture issues
   */
  getCriticalIssues(analysis) {
    const issues = [];

    // Check for critical violations
    const criticalViolations = analysis.violations.filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      issues.push({
        type: 'violations',
        severity: 'critical',
        description: `${criticalViolations.length} critical architecture violations found`,
        value: criticalViolations.length
      });
    }

    // Check for circular dependencies
    if (analysis.dependencies.circularDependencies.length > 0) {
      issues.push({
        type: 'circular-dependencies',
        severity: 'critical',
        description: `${analysis.dependencies.circularDependencies.length} circular dependencies found`,
        value: analysis.dependencies.circularDependencies.length
      });
    }

    // Check for high instability
    const highInstability = Object.entries(analysis.coupling.instability)
      .filter(([module, instability]) => instability > 0.8);
    
    if (highInstability.length > 0) {
      issues.push({
        type: 'high-instability',
        severity: 'high',
        description: `${highInstability.length} modules have very high instability`,
        value: highInstability.length
      });
    }

    return issues;
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