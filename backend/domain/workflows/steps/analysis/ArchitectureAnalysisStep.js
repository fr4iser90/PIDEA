/**
 * ArchitectureAnalysisStep - Architecture analysis workflow step
 * 
 * This step performs architecture analysis on codebases, including pattern detection,
 * dependency analysis, complexity analysis, and architectural recommendations.
 */
const BaseWorkflowStep = require('../BaseWorkflowStep');
const ValidationResult = require('../../validation/ValidationResult');

/**
 * Architecture analysis workflow step
 */
class ArchitectureAnalysisStep extends BaseWorkflowStep {
  /**
   * Create a new architecture analysis step
   * @param {Object} options - Step options
   */
  constructor(options = {}) {
    super('ArchitectureAnalysisStep', 'Performs architecture analysis', 'analysis');
    
    this.options = {
      detectPatterns: options.detectPatterns !== false,
      analyzeDependencies: options.analyzeDependencies !== false,
      complexityAnalysis: options.complexityAnalysis !== false,
      detectLayers: options.detectLayers !== false,
      detectModules: options.detectModules !== false,
      analyzeCoupling: options.analyzeCoupling !== false,
      analyzeCohesion: options.analyzeCohesion !== false,
      detectAntiPatterns: options.detectAntiPatterns !== false,
      analyzeDesignPrinciples: options.analyzeDesignPrinciples !== false,
      ...options
    };
  }

  /**
   * Execute architecture analysis step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Architecture analysis result
   */
  async executeStep(context) {
    const projectPath = context.get('projectPath');
    const architectureAnalyzer = context.get('architectureAnalyzer');
    const logger = context.get('logger') || console;
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }
    
    if (!architectureAnalyzer) {
      throw new Error('Architecture analyzer not found in context');
    }

    const startTime = Date.now();
    
    try {
      logger.info('ArchitectureAnalysisStep: Starting architecture analysis', {
        projectPath,
        options: this.options
      });

      // Get project information
      const projectInfo = await this.getProjectInfo(projectPath, context);

      // Perform architecture analysis
      const analysis = await this.performArchitectureAnalysis(projectInfo, context);

      // Generate metrics
      const metrics = this.generateMetrics(analysis);

      // Generate recommendations
      const recommendations = this.generateRecommendations(analysis);

      const duration = Date.now() - startTime;

      logger.info('ArchitectureAnalysisStep: Architecture analysis completed', {
        projectPath,
        duration,
        patternsDetected: analysis.patterns?.length || 0,
        layersDetected: analysis.layers?.length || 0,
        modulesDetected: analysis.modules?.length || 0
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
      logger.error('ArchitectureAnalysisStep: Architecture analysis failed', {
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
   * Perform architecture analysis
   * @param {Object} projectInfo - Project information
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Architecture analysis result
   */
  async performArchitectureAnalysis(projectInfo, context) {
    const architectureAnalyzer = context.get('architectureAnalyzer');
    
    // Check if this is a monorepo by looking for packages
    const packages = await this.findPackages(projectInfo.path, context);
    
    if (packages.length > 1) {
      // Monorepo: analyze each package separately
      const packageArchitectures = {};
      
      for (const pkg of packages) {
        const packageArchitecture = await architectureAnalyzer.analyze(
          pkg.path,
          {
            detectPatterns: this.options.detectPatterns,
            analyzeDependencies: this.options.analyzeDependencies,
            complexityAnalysis: this.options.complexityAnalysis,
            detectLayers: this.options.detectLayers,
            detectModules: this.options.detectModules,
            analyzeCoupling: this.options.analyzeCoupling,
            analyzeCohesion: this.options.analyzeCohesion,
            detectAntiPatterns: this.options.detectAntiPatterns,
            analyzeDesignPrinciples: this.options.analyzeDesignPrinciples
          }
        );

        packageArchitectures[pkg.name] = {
          packageInfo: pkg,
          architecture: packageArchitecture,
          patterns: packageArchitecture.detectedPatterns || [],
          layers: packageArchitecture.structure?.layers || [],
          modules: Object.keys(packageArchitecture.coupling?.instability || {}),
          coupling: packageArchitecture.coupling || {},
          cohesion: packageArchitecture.cohesion || {},
          antiPatterns: packageArchitecture.violations?.filter(v => v.severity === 'high') || [],
          designPrinciples: packageArchitecture.recommendations || []
        };
      }

      return {
        projectInfo,
        isMonorepo: true,
        packages: packageArchitectures,
        patterns: this.aggregatePatterns(packageArchitectures),
        layers: this.aggregateLayers(packageArchitectures),
        modules: this.aggregateModules(packageArchitectures),
        coupling: this.aggregateCoupling(packageArchitectures),
        cohesion: this.aggregateCohesion(packageArchitectures),
        antiPatterns: this.aggregateAntiPatterns(packageArchitectures),
        designPrinciples: this.aggregateDesignPrinciples(packageArchitectures),
        analysisOptions: this.options,
        timestamp: new Date()
      };

    } else {
      // Single package: analyze project-wide
      const architecture = await architectureAnalyzer.analyze(
        projectInfo.path,
        {
          detectPatterns: this.options.detectPatterns,
          analyzeDependencies: this.options.analyzeDependencies,
          complexityAnalysis: this.options.complexityAnalysis,
          detectLayers: this.options.detectLayers,
          detectModules: this.options.detectModules,
          analyzeCoupling: this.options.analyzeCoupling,
          analyzeCohesion: this.options.analyzeCohesion,
          detectAntiPatterns: this.options.detectAntiPatterns,
          analyzeDesignPrinciples: this.options.analyzeDesignPrinciples
        }
      );

      return {
        projectInfo,
        isMonorepo: false,
        architecture,
        patterns: architecture.detectedPatterns || [],
        layers: architecture.structure?.layers || [],
        modules: Object.keys(architecture.coupling?.instability || {}),
        coupling: architecture.coupling || {},
        cohesion: architecture.cohesion || {},
        antiPatterns: architecture.violations?.filter(v => v.severity === 'high') || [],
        designPrinciples: architecture.recommendations || [],
        analysisOptions: this.options,
        timestamp: new Date()
      };
    }
  }

  /**
   * Find packages in project
   * @param {string} projectPath - Project path
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Array>} Array of package information
   */
  async findPackages(projectPath, context) {
    const fileSystemService = context.get('fileSystemService');
    
    if (fileSystemService) {
      try {
        return await fileSystemService.findPackages(projectPath);
      } catch (error) {
        // Fallback to single package
        return [{ name: 'root', path: projectPath }];
      }
    }

    // Fallback to single package
    return [{ name: 'root', path: projectPath }];
  }

  /**
   * Generate metrics from analysis
   * @param {Object} analysis - Analysis result
   * @returns {Object} Metrics
   */
  generateMetrics(analysis) {
    const metrics = {
      patternsCount: analysis.patterns?.length || 0,
      layersCount: analysis.layers?.length || 0,
      modulesCount: analysis.modules?.length || 0,
      antiPatternsCount: analysis.antiPatterns?.length || 0,
      designPrinciplesCount: analysis.designPrinciples?.length || 0
    };

    if (analysis.isMonorepo) {
      metrics.packagesCount = Object.keys(analysis.packages || {}).length;
    }

    return metrics;
  }

  /**
   * Generate recommendations from analysis
   * @param {Object} analysis - Analysis result
   * @returns {Array} Recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // Add anti-pattern recommendations
    if (analysis.antiPatterns && analysis.antiPatterns.length > 0) {
      recommendations.push({
        type: 'anti-pattern',
        severity: 'high',
        message: `Found ${analysis.antiPatterns.length} architectural anti-patterns that should be addressed`,
        details: analysis.antiPatterns
      });
    }

    // Add design principle recommendations
    if (analysis.designPrinciples && analysis.designPrinciples.length > 0) {
      recommendations.push({
        type: 'design-principle',
        severity: 'medium',
        message: `Consider implementing ${analysis.designPrinciples.length} design principles`,
        details: analysis.designPrinciples
      });
    }

    return recommendations;
  }

  /**
   * Aggregate patterns from multiple packages
   * @param {Object} packageArchitectures - Package architectures
   * @returns {Array} Aggregated patterns
   */
  aggregatePatterns(packageArchitectures) {
    const patterns = [];
    for (const pkg of Object.values(packageArchitectures)) {
      patterns.push(...(pkg.patterns || []));
    }
    return patterns;
  }

  /**
   * Aggregate layers from multiple packages
   * @param {Object} packageArchitectures - Package architectures
   * @returns {Array} Aggregated layers
   */
  aggregateLayers(packageArchitectures) {
    const layers = [];
    for (const pkg of Object.values(packageArchitectures)) {
      layers.push(...(pkg.layers || []));
    }
    return layers;
  }

  /**
   * Aggregate modules from multiple packages
   * @param {Object} packageArchitectures - Package architectures
   * @returns {Array} Aggregated modules
   */
  aggregateModules(packageArchitectures) {
    const modules = [];
    for (const pkg of Object.values(packageArchitectures)) {
      modules.push(...(pkg.modules || []));
    }
    return modules;
  }

  /**
   * Aggregate coupling from multiple packages
   * @param {Object} packageArchitectures - Package architectures
   * @returns {Object} Aggregated coupling
   */
  aggregateCoupling(packageArchitectures) {
    const coupling = {};
    for (const pkg of Object.values(packageArchitectures)) {
      Object.assign(coupling, pkg.coupling || {});
    }
    return coupling;
  }

  /**
   * Aggregate cohesion from multiple packages
   * @param {Object} packageArchitectures - Package architectures
   * @returns {Object} Aggregated cohesion
   */
  aggregateCohesion(packageArchitectures) {
    const cohesion = {};
    for (const pkg of Object.values(packageArchitectures)) {
      Object.assign(cohesion, pkg.cohesion || {});
    }
    return cohesion;
  }

  /**
   * Aggregate anti-patterns from multiple packages
   * @param {Object} packageArchitectures - Package architectures
   * @returns {Array} Aggregated anti-patterns
   */
  aggregateAntiPatterns(packageArchitectures) {
    const antiPatterns = [];
    for (const pkg of Object.values(packageArchitectures)) {
      antiPatterns.push(...(pkg.antiPatterns || []));
    }
    return antiPatterns;
  }

  /**
   * Aggregate design principles from multiple packages
   * @param {Object} packageArchitectures - Package architectures
   * @returns {Array} Aggregated design principles
   */
  aggregateDesignPrinciples(packageArchitectures) {
    const designPrinciples = [];
    for (const pkg of Object.values(packageArchitectures)) {
      designPrinciples.push(...(pkg.designPrinciples || []));
    }
    return designPrinciples;
  }

  /**
   * Validate architecture analysis step
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
      return new ValidationResult(false, ['Project path is required for architecture analysis']);
    }

    // Check if architecture analyzer is available
    const architectureAnalyzer = context.get('architectureAnalyzer');
    if (!architectureAnalyzer) {
      return new ValidationResult(false, ['Architecture analyzer is required for architecture analysis']);
    }

    return new ValidationResult(true, []);
  }

  /**
   * Rollback architecture analysis step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Rollback result
   */
  async rollback(context) {
    // Architecture analysis steps typically don't need rollback as they don't modify files
    return {
      success: true,
      stepName: this._name,
      message: 'Architecture analysis step rollback completed (no changes to revert)'
    };
  }

  /**
   * Clone architecture analysis step
   * @returns {ArchitectureAnalysisStep} Cloned step
   */
  clone() {
    const clonedStep = new ArchitectureAnalysisStep(this.options);
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
      type: 'architecture-analysis'
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
      type: 'architecture-analysis'
    };
  }

  /**
   * Create step from JSON
   * @param {Object} json - JSON representation
   * @returns {ArchitectureAnalysisStep} Step instance
   */
  static fromJSON(json) {
    const step = new ArchitectureAnalysisStep(json.options);
    step._metadata = json.metadata || {};
    step._dependencies = json.dependencies || [];
    return step;
  }
}

module.exports = ArchitectureAnalysisStep; 