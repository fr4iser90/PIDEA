/**
 * CodeQualityAnalysisStep - Code quality analysis workflow step
 * 
 * This step performs code quality analysis on codebases, including linting,
 * complexity analysis, maintainability metrics, test coverage, and code style checks.
 */
const BaseWorkflowStep = require('../BaseWorkflowStep');
const ValidationResult = require('../../validation/ValidationResult');

/**
 * Code quality analysis workflow step
 */
class CodeQualityAnalysisStep extends BaseWorkflowStep {
  /**
   * Create a new code quality analysis step
   * @param {Object} options - Step options
   */
  constructor(options = {}) {
    super('CodeQualityAnalysisStep', 'Performs code quality analysis', 'analysis');
    
    this.options = {
      linting: options.linting !== false,
      complexity: options.complexity !== false,
      maintainability: options.maintainability !== false,
      testCoverage: options.testCoverage !== false,
      codeDuplication: options.codeDuplication !== false,
      codeStyle: options.codeStyle !== false,
      documentation: options.documentation !== false,
      performance: options.performance !== false,
      ...options
    };
  }

  /**
   * Execute code quality analysis step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Code quality analysis result
   */
  async executeStep(context) {
    const projectPath = context.get('projectPath');
    const codeQualityAnalyzer = context.get('codeQualityAnalyzer');
    const logger = context.get('logger') || console;
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }
    
    if (!codeQualityAnalyzer) {
      throw new Error('Code quality analyzer not found in context');
    }

    const startTime = Date.now();
    
    try {
      logger.info('CodeQualityAnalysisStep: Starting code quality analysis', {
        projectPath,
        options: this.options
      });

      // Get project information
      const projectInfo = await this.getProjectInfo(projectPath, context);

      // Perform code quality analysis
      const analysis = await this.performCodeQualityAnalysis(projectInfo, context);

      // Generate metrics
      const metrics = this.generateMetrics(analysis);

      // Generate recommendations
      const recommendations = this.generateRecommendations(analysis);

      const duration = Date.now() - startTime;

      logger.info('CodeQualityAnalysisStep: Code quality analysis completed', {
        projectPath,
        duration,
        issuesFound: analysis.issues?.length || 0,
        qualityScore: metrics.qualityScore || 0
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
      logger.error('CodeQualityAnalysisStep: Code quality analysis failed', {
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
   * Perform code quality analysis
   * @param {Object} projectInfo - Project information
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Code quality analysis result
   */
  async performCodeQualityAnalysis(projectInfo, context) {
    const codeQualityAnalyzer = context.get('codeQualityAnalyzer');
    
    // Check if this is a monorepo by looking for packages
    const packages = await this.findPackages(projectInfo.path, context);
    
    if (packages.length > 1) {
      // Monorepo: analyze each package separately
      const packageQualityAnalyses = {};
      
      for (const pkg of packages) {
        const packageQualityAnalysis = await codeQualityAnalyzer.analyzeCodeQuality(
          pkg.path,
          {
            linting: this.options.linting,
            complexity: this.options.complexity,
            maintainability: this.options.maintainability,
            testCoverage: this.options.testCoverage,
            codeDuplication: this.options.codeDuplication,
            codeStyle: this.options.codeStyle,
            documentation: this.options.documentation,
            performance: this.options.performance
          }
        );

        // Ensure realMetrics are included in the analysis
        const analysisWithRealMetrics = {
          ...packageQualityAnalysis,
          realMetrics: packageQualityAnalysis.realMetrics || packageQualityAnalysis.metrics?.realMetrics
        };

        // Validate that realMetrics exist
        if (!analysisWithRealMetrics.realMetrics) {
          throw new Error(`Real metrics not calculated by analyzer for package ${pkg.name}`);
        }

        packageQualityAnalyses[pkg.name] = {
          packageInfo: pkg,
          analysis: analysisWithRealMetrics,
          lintingIssues: analysisWithRealMetrics.lintingIssues || [],
          complexityIssues: analysisWithRealMetrics.complexityIssues || [],
          maintainabilityIssues: analysisWithRealMetrics.maintainabilityIssues || [],
          testCoverageIssues: analysisWithRealMetrics.testCoverageIssues || [],
          duplicationIssues: analysisWithRealMetrics.duplicationIssues || [],
          styleIssues: analysisWithRealMetrics.styleIssues || [],
          documentationIssues: analysisWithRealMetrics.documentationIssues || [],
          performanceIssues: analysisWithRealMetrics.performanceIssues || [],
          realMetrics: analysisWithRealMetrics.realMetrics
        };
      }

      return {
        projectInfo,
        isMonorepo: true,
        packages: packageQualityAnalyses,
        issues: this.aggregateIssues(packageQualityAnalyses),
        metrics: this.aggregateMetrics(packageQualityAnalyses),
        analysisOptions: this.options,
        timestamp: new Date()
      };

    } else {
      // Single package: analyze project-wide
      const qualityAnalysis = await codeQualityAnalyzer.analyzeCodeQuality(
        projectInfo.path,
        {
          linting: this.options.linting,
          complexity: this.options.complexity,
          maintainability: this.options.maintainability,
          testCoverage: this.options.testCoverage,
          codeDuplication: this.options.codeDuplication,
          codeStyle: this.options.codeStyle,
          documentation: this.options.documentation,
          performance: this.options.performance
        }
      );

      // Ensure realMetrics are included
      const analysisWithRealMetrics = {
        ...qualityAnalysis,
        realMetrics: qualityAnalysis.realMetrics || qualityAnalysis.metrics?.realMetrics
      };

      // Validate that realMetrics exist
      if (!analysisWithRealMetrics.realMetrics) {
        throw new Error('Real metrics not calculated by analyzer');
      }

      return {
        projectInfo,
        isMonorepo: false,
        analysis: analysisWithRealMetrics,
        issues: this.collectIssues(analysisWithRealMetrics),
        metrics: analysisWithRealMetrics.realMetrics,
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
   * Collect issues from analysis
   * @param {Object} analysis - Analysis result
   * @returns {Array} Array of issues
   */
  collectIssues(analysis) {
    const issues = [];
    
    if (analysis.lintingIssues) issues.push(...analysis.lintingIssues);
    if (analysis.complexityIssues) issues.push(...analysis.complexityIssues);
    if (analysis.maintainabilityIssues) issues.push(...analysis.maintainabilityIssues);
    if (analysis.testCoverageIssues) issues.push(...analysis.testCoverageIssues);
    if (analysis.duplicationIssues) issues.push(...analysis.duplicationIssues);
    if (analysis.styleIssues) issues.push(...analysis.styleIssues);
    if (analysis.documentationIssues) issues.push(...analysis.documentationIssues);
    if (analysis.performanceIssues) issues.push(...analysis.performanceIssues);
    
    return issues;
  }

  /**
   * Aggregate issues from multiple packages
   * @param {Object} packageAnalyses - Package analyses
   * @returns {Array} Aggregated issues
   */
  aggregateIssues(packageAnalyses) {
    const issues = [];
    for (const pkg of Object.values(packageAnalyses)) {
      issues.push(...(pkg.issues || []));
    }
    return issues;
  }

  /**
   * Aggregate metrics from multiple packages
   * @param {Object} packageAnalyses - Package analyses
   * @returns {Object} Aggregated metrics
   */
  aggregateMetrics(packageAnalyses) {
    const aggregatedMetrics = {
      totalFiles: 0,
      totalLines: 0,
      totalIssues: 0,
      qualityScore: 0,
      maintainabilityIndex: 0,
      cyclomaticComplexity: 0,
      testCoverage: 0,
      documentationCoverage: 0
    };

    let packageCount = 0;
    
    for (const pkg of Object.values(packageAnalyses)) {
      const metrics = pkg.realMetrics || pkg.metrics;
      if (metrics) {
        aggregatedMetrics.totalFiles += metrics.totalFiles || 0;
        aggregatedMetrics.totalLines += metrics.totalLines || 0;
        aggregatedMetrics.totalIssues += metrics.totalIssues || 0;
        aggregatedMetrics.maintainabilityIndex += metrics.maintainabilityIndex || 0;
        aggregatedMetrics.cyclomaticComplexity += metrics.cyclomaticComplexity || 0;
        aggregatedMetrics.testCoverage += metrics.testCoverage || 0;
        aggregatedMetrics.documentationCoverage += metrics.documentationCoverage || 0;
        packageCount++;
      }
    }

    // Calculate averages
    if (packageCount > 0) {
      aggregatedMetrics.maintainabilityIndex /= packageCount;
      aggregatedMetrics.cyclomaticComplexity /= packageCount;
      aggregatedMetrics.testCoverage /= packageCount;
      aggregatedMetrics.documentationCoverage /= packageCount;
    }

    // Calculate quality score
    aggregatedMetrics.qualityScore = this.calculateQualityScore(aggregatedMetrics);

    return aggregatedMetrics;
  }

  /**
   * Calculate quality score from metrics
   * @param {Object} metrics - Metrics object
   * @returns {number} Quality score (0-100)
   */
  calculateQualityScore(metrics) {
    let score = 100;

    // Deduct points for issues
    if (metrics.totalIssues > 0) {
      score -= Math.min(metrics.totalIssues * 2, 50);
    }

    // Deduct points for low maintainability
    if (metrics.maintainabilityIndex < 50) {
      score -= (50 - metrics.maintainabilityIndex) * 0.5;
    }

    // Deduct points for high complexity
    if (metrics.cyclomaticComplexity > 10) {
      score -= Math.min((metrics.cyclomaticComplexity - 10) * 2, 20);
    }

    // Deduct points for low test coverage
    if (metrics.testCoverage < 80) {
      score -= (80 - metrics.testCoverage) * 0.3;
    }

    // Deduct points for low documentation coverage
    if (metrics.documentationCoverage < 70) {
      score -= (70 - metrics.documentationCoverage) * 0.2;
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * Generate metrics from analysis
   * @param {Object} analysis - Analysis result
   * @returns {Object} Metrics
   */
  generateMetrics(analysis) {
    const metrics = analysis.metrics || {};
    
    return {
      qualityScore: metrics.qualityScore || 0,
      totalIssues: analysis.issues?.length || 0,
      maintainabilityIndex: metrics.maintainabilityIndex || 0,
      cyclomaticComplexity: metrics.cyclomaticComplexity || 0,
      testCoverage: metrics.testCoverage || 0,
      documentationCoverage: metrics.documentationCoverage || 0,
      totalFiles: metrics.totalFiles || 0,
      totalLines: metrics.totalLines || 0
    };
  }

  /**
   * Generate recommendations from analysis
   * @param {Object} analysis - Analysis result
   * @returns {Array} Recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];
    const metrics = analysis.metrics || {};

    // Quality score recommendations
    if (metrics.qualityScore < 70) {
      recommendations.push({
        type: 'quality-score',
        severity: 'high',
        message: `Code quality score is low (${metrics.qualityScore}/100). Consider addressing code quality issues.`,
        details: analysis.issues?.slice(0, 10) || []
      });
    }

    // Maintainability recommendations
    if (metrics.maintainabilityIndex < 50) {
      recommendations.push({
        type: 'maintainability',
        severity: 'medium',
        message: `Maintainability index is low (${metrics.maintainabilityIndex}). Consider refactoring complex code.`,
        details: analysis.issues?.filter(i => i.type === 'maintainability') || []
      });
    }

    // Test coverage recommendations
    if (metrics.testCoverage < 80) {
      recommendations.push({
        type: 'test-coverage',
        severity: 'medium',
        message: `Test coverage is low (${metrics.testCoverage}%). Consider adding more tests.`,
        details: analysis.issues?.filter(i => i.type === 'test-coverage') || []
      });
    }

    // Documentation recommendations
    if (metrics.documentationCoverage < 70) {
      recommendations.push({
        type: 'documentation',
        severity: 'low',
        message: `Documentation coverage is low (${metrics.documentationCoverage}%). Consider improving documentation.`,
        details: analysis.issues?.filter(i => i.type === 'documentation') || []
      });
    }

    return recommendations;
  }

  /**
   * Validate code quality analysis step
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
      return new ValidationResult(false, ['Project path is required for code quality analysis']);
    }

    // Check if code quality analyzer is available
    const codeQualityAnalyzer = context.get('codeQualityAnalyzer');
    if (!codeQualityAnalyzer) {
      return new ValidationResult(false, ['Code quality analyzer is required for code quality analysis']);
    }

    return new ValidationResult(true, []);
  }

  /**
   * Rollback code quality analysis step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Rollback result
   */
  async rollback(context) {
    // Code quality analysis steps typically don't need rollback as they don't modify files
    return {
      success: true,
      stepName: this._name,
      message: 'Code quality analysis step rollback completed (no changes to revert)'
    };
  }

  /**
   * Clone code quality analysis step
   * @returns {CodeQualityAnalysisStep} Cloned step
   */
  clone() {
    const clonedStep = new CodeQualityAnalysisStep(this.options);
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
      type: 'code-quality-analysis'
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
      type: 'code-quality-analysis'
    };
  }

  /**
   * Create step from JSON
   * @param {Object} json - JSON representation
   * @returns {CodeQualityAnalysisStep} Step instance
   */
  static fromJSON(json) {
    const step = new CodeQualityAnalysisStep(json.options);
    step._metadata = json.metadata || {};
    step._dependencies = json.dependencies || [];
    return step;
  }
}

module.exports = CodeQualityAnalysisStep; 