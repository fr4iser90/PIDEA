/**
 * TechStackAnalysisStep - Tech stack analysis workflow step
 * 
 * This step performs tech stack analysis on codebases, including framework detection,
 * library identification, tool analysis, and technology compatibility assessment.
 */
const BaseWorkflowStep = require('../BaseWorkflowStep');
const ValidationResult = require('../../validation/ValidationResult');

/**
 * Tech stack analysis workflow step
 */
class TechStackAnalysisStep extends BaseWorkflowStep {
  /**
   * Create a new tech stack analysis step
   * @param {Object} options - Step options
   */
  constructor(options = {}) {
    super('TechStackAnalysisStep', 'Performs tech stack analysis', 'analysis');
    
    this.options = {
      detectFrameworks: options.detectFrameworks !== false,
      detectLibraries: options.detectLibraries !== false,
      detectTools: options.detectTools !== false,
      detectLanguages: options.detectLanguages !== false,
      detectDatabases: options.detectDatabases !== false,
      detectCloudServices: options.detectCloudServices !== false,
      ...options
    };
  }

  /**
   * Execute tech stack analysis step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Tech stack analysis result
   */
  async executeStep(context) {
    const projectPath = context.get('projectPath');
    const techStackAnalyzer = context.get('techStackAnalyzer');
    const logger = context.get('logger') || console;
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }
    
    if (!techStackAnalyzer) {
      throw new Error('Tech stack analyzer not found in context');
    }

    const startTime = Date.now();
    
    try {
      logger.info('TechStackAnalysisStep: Starting tech stack analysis', {
        projectPath,
        options: this.options
      });

      // Get project information
      const projectInfo = await this.getProjectInfo(projectPath, context);

      // Perform tech stack analysis
      const analysis = await this.performTechStackAnalysis(projectInfo, context);

      // Generate metrics
      const metrics = this.generateMetrics(analysis);

      // Generate recommendations
      const recommendations = this.generateRecommendations(analysis, metrics);

      const duration = Date.now() - startTime;

      logger.info('TechStackAnalysisStep: Tech stack analysis completed', {
        projectPath,
        duration,
        frameworksDetected: analysis.frameworks?.length || 0,
        librariesDetected: analysis.libraries?.length || 0
      });

      return {
        success: true,
        analysis,
        metrics,
        recommendations,
        duration,
        metadata: {
          stepName: this._name,
          projectPath,
          analysisOptions: this.options,
          timestamp: new Date()
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('TechStackAnalysisStep: Tech stack analysis failed', {
        projectPath,
        duration,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get project information
   * @param {string} projectPath - Project path
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Project information
   */
  async getProjectInfo(projectPath, context) {
    const fileSystemService = context.get('fileSystemService');
    
    if (fileSystemService) {
      return await fileSystemService.getProjectInfo(projectPath);
    }

    // Fallback to basic project info
    return {
      path: projectPath,
      name: projectPath.split('/').pop(),
      type: 'unknown'
    };
  }

  /**
   * Perform tech stack analysis
   * @param {Object} projectInfo - Project information
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Tech stack analysis result
   */
  async performTechStackAnalysis(projectInfo, context) {
    const techStackAnalyzer = context.get('techStackAnalyzer');
    
    // Use the TechStackAnalyzer directly
    const techStack = await techStackAnalyzer.analyzeTechStack(
      projectInfo.path,
      {
        detectFrameworks: this.options.detectFrameworks,
        detectLibraries: this.options.detectLibraries,
        detectTools: this.options.detectTools,
        detectLanguages: this.options.detectLanguages,
        detectDatabases: this.options.detectDatabases,
        detectCloudServices: this.options.detectCloudServices
      }
    );

    return {
      projectInfo,
      techStack,
      frameworks: techStack.frameworks || [],
      libraries: techStack.libraries || [],
      tools: techStack.tools || [],
      versions: techStack.versions || {},
      compatibility: techStack.compatibility || {},
      buildTools: techStack.buildTools || [],
      testingFrameworks: techStack.testingFrameworks || [],
      lintingTools: techStack.lintingTools || [],
      analysisOptions: this.options,
      timestamp: new Date()
    };
  }

  /**
   * Generate metrics from analysis
   * @param {Object} analysis - Analysis result
   * @returns {Object} Metrics
   */
  generateMetrics(analysis) {
    const metrics = {
      frameworksCount: analysis.frameworks?.length || 0,
      librariesCount: analysis.libraries?.length || 0,
      toolsCount: analysis.tools?.length || 0,
      buildToolsCount: analysis.buildTools?.length || 0,
      testingFrameworksCount: analysis.testingFrameworks?.length || 0,
      lintingToolsCount: analysis.lintingTools?.length || 0,
      versionsCount: Object.keys(analysis.versions || {}).length,
      compatibilityScore: this.calculateCompatibilityScore(analysis.compatibility)
    };

    return metrics;
  }

  /**
   * Calculate compatibility score
   * @param {Object} compatibility - Compatibility data
   * @returns {number} Compatibility score (0-100)
   */
  calculateCompatibilityScore(compatibility) {
    if (!compatibility || Object.keys(compatibility).length === 0) {
      return 100; // Default to perfect compatibility if no data
    }

    let totalScore = 0;
    let totalChecks = 0;

    for (const [component, score] of Object.entries(compatibility)) {
      if (typeof score === 'number' && score >= 0 && score <= 100) {
        totalScore += score;
        totalChecks++;
      }
    }

    return totalChecks > 0 ? Math.round(totalScore / totalChecks) : 100;
  }

  /**
   * Generate recommendations from analysis
   * @param {Object} analysis - Analysis result
   * @param {Object} metrics - Metrics
   * @returns {Array} Recommendations
   */
  generateRecommendations(analysis, metrics) {
    const recommendations = [];

    // Framework recommendations
    if (metrics.frameworksCount === 0) {
      recommendations.push({
        type: 'framework',
        severity: 'medium',
        message: 'No frameworks detected. Consider using a framework for better development experience.',
        details: []
      });
    }

    // Testing framework recommendations
    if (metrics.testingFrameworksCount === 0) {
      recommendations.push({
        type: 'testing',
        severity: 'high',
        message: 'No testing frameworks detected. Consider adding a testing framework.',
        details: []
      });
    }

    // Linting tool recommendations
    if (metrics.lintingToolsCount === 0) {
      recommendations.push({
        type: 'linting',
        severity: 'medium',
        message: 'No linting tools detected. Consider adding a linting tool for code quality.',
        details: []
      });
    }

    // Compatibility recommendations
    if (metrics.compatibilityScore < 80) {
      recommendations.push({
        type: 'compatibility',
        severity: 'medium',
        message: `Tech stack compatibility score is low (${metrics.compatibilityScore}/100). Consider updating incompatible components.`,
        details: analysis.compatibility || {}
      });
    }

    // Version recommendations
    if (metrics.versionsCount > 0) {
      const outdatedVersions = this.findOutdatedVersions(analysis.versions);
      if (outdatedVersions.length > 0) {
        recommendations.push({
          type: 'versions',
          severity: 'low',
          message: `Found ${outdatedVersions.length} outdated components. Consider updating to latest versions.`,
          details: outdatedVersions
        });
      }
    }

    return recommendations;
  }

  /**
   * Find outdated versions
   * @param {Object} versions - Version data
   * @returns {Array} Outdated versions
   */
  findOutdatedVersions(versions) {
    const outdated = [];
    
    for (const [component, version] of Object.entries(versions)) {
      // This is a simplified check - in a real implementation, you'd compare with latest versions
      if (version && typeof version === 'string' && version.includes('beta')) {
        outdated.push({
          component,
          currentVersion: version,
          recommendation: 'Consider using stable version'
        });
      }
    }
    
    return outdated;
  }

  /**
   * Validate tech stack analysis step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validate(context) {
    const baseValidation = await super.validate(context);
    
    if (!baseValidation.isValid) {
      return baseValidation;
    }

    // Check if project path exists
    const projectPath = context.get('projectPath');
    if (!projectPath) {
      return new ValidationResult(false, ['Project path is required for tech stack analysis']);
    }

    // Check if tech stack analyzer is available
    const techStackAnalyzer = context.get('techStackAnalyzer');
    if (!techStackAnalyzer) {
      return new ValidationResult(false, ['Tech stack analyzer is required for tech stack analysis']);
    }

    return new ValidationResult(true, []);
  }

  /**
   * Rollback tech stack analysis step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Rollback result
   */
  async rollback(context) {
    // Tech stack analysis steps typically don't need rollback as they don't modify files
    return {
      success: true,
      stepName: this._name,
      message: 'Tech stack analysis step rollback completed (no changes to revert)'
    };
  }

  /**
   * Clone tech stack analysis step
   * @returns {TechStackAnalysisStep} Cloned step
   */
  clone() {
    const clonedStep = new TechStackAnalysisStep(this.options);
    clonedStep._metadata = { ...this._metadata };
    clonedStep._validationRules = [...this._validationRules];
    clonedStep._dependencies = [...this._dependencies];
    return clonedStep;
  }

  /**
   * Get step metadata
   * @returns {Object} Step metadata
   */
  getMetadata() {
    return {
      ...super.getMetadata(),
      options: this.options,
      type: 'tech-stack-analysis'
    };
  }

  /**
   * Convert step to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      ...super.toJSON(),
      options: this.options,
      type: 'tech-stack-analysis'
    };
  }

  /**
   * Create step from JSON
   * @param {Object} json - JSON representation
   * @returns {TechStackAnalysisStep} Step instance
   */
  static fromJSON(json) {
    const step = new TechStackAnalysisStep(json.options);
    step._metadata = json.metadata || {};
    step._dependencies = json.dependencies || [];
    return step;
  }
}

module.exports = TechStackAnalysisStep; 