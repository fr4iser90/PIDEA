/**
 * DependenciesAnalysisStep - Dependencies analysis workflow step
 * 
 * This step performs dependencies analysis on codebases, including version analysis,
 * vulnerability checking, update recommendations, and dependency graph analysis.
 */
const BaseWorkflowStep = require('../BaseWorkflowStep');
const ValidationResult = require('../../validation/ValidationResult');

/**
 * Dependencies analysis workflow step
 */
class DependenciesAnalysisStep extends BaseWorkflowStep {
  /**
   * Create a new dependencies analysis step
   * @param {Object} options - Step options
   */
  constructor(options = {}) {
    super('DependenciesAnalysisStep', 'Performs dependencies analysis', 'analysis');
    
    this.options = {
      analyzeVersions: options.analyzeVersions !== false,
      checkVulnerabilities: options.checkVulnerabilities !== false,
      analyzeUpdates: options.analyzeUpdates !== false,
      checkLicenseCompatibility: options.checkLicenseCompatibility !== false,
      analyzeTransitiveDependencies: options.analyzeTransitiveDependencies !== false,
      checkBundleSize: options.checkBundleSize !== false,
      analyzeDependencyGraph: options.analyzeDependencyGraph !== false,
      ...options
    };
  }

  /**
   * Execute dependencies analysis step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Dependencies analysis result
   */
  async executeStep(context) {
    const projectPath = context.get('projectPath');
    const dependencyAnalyzer = context.get('dependencyAnalyzer');
    const logger = context.get('logger') || console;
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }
    
    if (!dependencyAnalyzer) {
      throw new Error('Dependency analyzer not found in context');
    }

    const startTime = Date.now();
    
    try {
      logger.info('DependenciesAnalysisStep: Starting dependencies analysis', {
        projectPath,
        options: this.options
      });

      // Get project information
      const projectInfo = await this.getProjectInfo(projectPath, context);

      // Perform dependencies analysis
      const analysis = await this.performDependenciesAnalysis(projectInfo, context);

      // Generate metrics
      const metrics = this.generateMetrics(analysis);

      // Generate recommendations
      const recommendations = this.generateRecommendations(analysis, context);

      const duration = Date.now() - startTime;

      logger.info('DependenciesAnalysisStep: Dependencies analysis completed', {
        projectPath,
        duration,
        directDependencies: analysis.directDependencies?.length || 0,
        vulnerabilities: analysis.vulnerabilities?.length || 0
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
      logger.error('DependenciesAnalysisStep: Dependencies analysis failed', {
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
   * Perform dependencies analysis
   * @param {Object} projectInfo - Project information
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Dependencies analysis result
   */
  async performDependenciesAnalysis(projectInfo, context) {
    const dependencyAnalyzer = context.get('dependencyAnalyzer');
    
    const dependenciesAnalysis = await dependencyAnalyzer.analyzeDependencies(
      projectInfo.path,
      {
        analyzeVersions: this.options.analyzeVersions,
        checkVulnerabilities: this.options.checkVulnerabilities,
        analyzeUpdates: this.options.analyzeUpdates,
        checkLicenseCompatibility: this.options.checkLicenseCompatibility,
        analyzeTransitiveDependencies: this.options.analyzeTransitiveDependencies,
        checkBundleSize: this.options.checkBundleSize,
        analyzeDependencyGraph: this.options.analyzeDependencyGraph
      }
    );

    return {
      projectInfo,
      dependenciesAnalysis,
      directDependencies: dependenciesAnalysis.directDependencies || [],
      transitiveDependencies: dependenciesAnalysis.transitiveDependencies || [],
      vulnerabilities: dependenciesAnalysis.vulnerabilities || [],
      outdatedPackages: dependenciesAnalysis.outdatedPackages || [],
      licenseIssues: dependenciesAnalysis.licenseIssues || [],
      bundleSize: dependenciesAnalysis.bundleSize || {},
      dependencyGraph: dependenciesAnalysis.dependencyGraph || {},
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
      directDependenciesCount: analysis.directDependencies?.length || 0,
      transitiveDependenciesCount: analysis.transitiveDependencies?.length || 0,
      totalDependenciesCount: 0,
      vulnerabilitiesCount: analysis.vulnerabilities?.length || 0,
      outdatedPackagesCount: analysis.outdatedPackages?.length || 0,
      licenseIssuesCount: analysis.licenseIssues?.length || 0,
      bundleSize: analysis.bundleSize?.totalSize || 0,
      dependencyDepth: this.calculateDependencyDepth(analysis.dependencyGraph),
      securityScore: this.calculateSecurityScore(analysis.vulnerabilities),
      updateScore: this.calculateUpdateScore(analysis.outdatedPackages)
    };

    metrics.totalDependenciesCount = metrics.directDependenciesCount + metrics.transitiveDependenciesCount;

    return metrics;
  }

  /**
   * Calculate dependency depth
   * @param {Object} dependencyGraph - Dependency graph
   * @returns {number} Maximum dependency depth
   */
  calculateDependencyDepth(dependencyGraph) {
    if (!dependencyGraph || Object.keys(dependencyGraph).length === 0) {
      return 0;
    }

    let maxDepth = 0;
    
    const calculateDepth = (node, visited = new Set(), depth = 0) => {
      if (visited.has(node)) return depth;
      visited.add(node);
      
      maxDepth = Math.max(maxDepth, depth);
      
      const dependencies = dependencyGraph[node] || [];
      for (const dep of dependencies) {
        calculateDepth(dep, new Set(visited), depth + 1);
      }
    };

    for (const root of Object.keys(dependencyGraph)) {
      calculateDepth(root);
    }

    return maxDepth;
  }

  /**
   * Calculate security score
   * @param {Array} vulnerabilities - Vulnerabilities array
   * @returns {number} Security score (0-100)
   */
  calculateSecurityScore(vulnerabilities) {
    if (!vulnerabilities || vulnerabilities.length === 0) {
      return 100;
    }

    let totalSeverity = 0;
    for (const vuln of vulnerabilities) {
      const severity = vuln.severity || 'medium';
      const severityScore = {
        'critical': 10,
        'high': 7,
        'medium': 4,
        'low': 1
      }[severity] || 4;
      
      totalSeverity += severityScore;
    }

    const maxSeverity = vulnerabilities.length * 10;
    const score = Math.max(0, 100 - (totalSeverity / maxSeverity) * 100);
    
    return Math.round(score);
  }

  /**
   * Calculate update score
   * @param {Array} outdatedPackages - Outdated packages array
   * @returns {number} Update score (0-100)
   */
  calculateUpdateScore(outdatedPackages) {
    if (!outdatedPackages || outdatedPackages.length === 0) {
      return 100;
    }

    let totalOutdated = 0;
    for (const pkg of outdatedPackages) {
      const outdatedLevel = pkg.outdatedLevel || 'minor';
      const levelScore = {
        'major': 10,
        'minor': 5,
        'patch': 2
      }[outdatedLevel] || 5;
      
      totalOutdated += levelScore;
    }

    const maxOutdated = outdatedPackages.length * 10;
    const score = Math.max(0, 100 - (totalOutdated / maxOutdated) * 100);
    
    return Math.round(score);
  }

  /**
   * Generate recommendations from analysis
   * @param {Object} analysis - Analysis result
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Array} Recommendations
   */
  generateRecommendations(analysis, context) {
    const recommendations = [];
    const metrics = this.generateMetrics(analysis);

    // Vulnerability recommendations
    if (metrics.vulnerabilitiesCount > 0) {
      const criticalVulns = analysis.vulnerabilities?.filter(v => v.severity === 'critical') || [];
      const highVulns = analysis.vulnerabilities?.filter(v => v.severity === 'high') || [];
      
      if (criticalVulns.length > 0) {
        recommendations.push({
          type: 'critical-vulnerabilities',
          severity: 'critical',
          message: `Found ${criticalVulns.length} critical vulnerabilities. Update immediately.`,
          details: criticalVulns.slice(0, 5)
        });
      }
      
      if (highVulns.length > 0) {
        recommendations.push({
          type: 'high-vulnerabilities',
          severity: 'high',
          message: `Found ${highVulns.length} high severity vulnerabilities. Update soon.`,
          details: highVulns.slice(0, 5)
        });
      }
    }

    // Outdated packages recommendations
    if (metrics.outdatedPackagesCount > 0) {
      const majorUpdates = analysis.outdatedPackages?.filter(p => p.outdatedLevel === 'major') || [];
      const minorUpdates = analysis.outdatedPackages?.filter(p => p.outdatedLevel === 'minor') || [];
      
      if (majorUpdates.length > 0) {
        recommendations.push({
          type: 'major-updates',
          severity: 'medium',
          message: `Found ${majorUpdates.length} packages with major updates available. Review compatibility before updating.`,
          details: majorUpdates.slice(0, 5)
        });
      }
      
      if (minorUpdates.length > 0) {
        recommendations.push({
          type: 'minor-updates',
          severity: 'low',
          message: `Found ${minorUpdates.length} packages with minor updates available. Consider updating.`,
          details: minorUpdates.slice(0, 5)
        });
      }
    }

    // License compatibility recommendations
    if (metrics.licenseIssuesCount > 0) {
      recommendations.push({
        type: 'license-issues',
        severity: 'medium',
        message: `Found ${metrics.licenseIssuesCount} license compatibility issues. Review license terms.`,
        details: analysis.licenseIssues?.slice(0, 5) || []
      });
    }

    // Bundle size recommendations
    if (metrics.bundleSize > 1024 * 1024) { // > 1MB
      recommendations.push({
        type: 'bundle-size',
        severity: 'medium',
        message: `Bundle size is large (${Math.round(metrics.bundleSize / 1024)}KB). Consider code splitting or tree shaking.`,
        details: analysis.bundleSize || {}
      });
    }

    // Dependency depth recommendations
    if (metrics.dependencyDepth > 5) {
      recommendations.push({
        type: 'dependency-depth',
        severity: 'low',
        message: `Deep dependency tree (${metrics.dependencyDepth} levels). Consider reducing dependency depth.`,
        details: []
      });
    }

    return recommendations;
  }

  /**
   * Validate dependencies analysis step
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
      return new ValidationResult(false, ['Project path is required for dependencies analysis']);
    }

    // Check if dependency analyzer is available
    const dependencyAnalyzer = context.get('dependencyAnalyzer');
    if (!dependencyAnalyzer) {
      return new ValidationResult(false, ['Dependency analyzer is required for dependencies analysis']);
    }

    return new ValidationResult(true, []);
  }

  /**
   * Rollback dependencies analysis step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Rollback result
   */
  async rollback(context) {
    // Dependencies analysis steps typically don't need rollback as they don't modify files
    return {
      success: true,
      stepName: this._name,
      message: 'Dependencies analysis step rollback completed (no changes to revert)'
    };
  }

  /**
   * Clone dependencies analysis step
   * @returns {DependenciesAnalysisStep} Cloned step
   */
  clone() {
    const clonedStep = new DependenciesAnalysisStep(this.options);
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
      type: 'dependencies-analysis'
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
      type: 'dependencies-analysis'
    };
  }

  /**
   * Create step from JSON
   * @param {Object} json - JSON representation
   * @returns {DependenciesAnalysisStep} Step instance
   */
  static fromJSON(json) {
    const step = new DependenciesAnalysisStep(json.options);
    step._metadata = json.metadata || {};
    step._dependencies = json.dependencies || [];
    return step;
  }
}

module.exports = DependenciesAnalysisStep; 