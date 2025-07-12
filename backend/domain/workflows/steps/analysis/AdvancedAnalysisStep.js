/**
 * AdvancedAnalysisStep - Advanced analysis workflow step
 * 
 * This step performs comprehensive analysis on codebases, including layer validation,
 * logic analysis, and advanced architectural assessment.
 */
const BaseWorkflowStep = require('../BaseWorkflowStep');
const ValidationResult = require('../../validation/ValidationResult');

/**
 * Advanced analysis workflow step
 */
class AdvancedAnalysisStep extends BaseWorkflowStep {
  /**
   * Create a new advanced analysis step
   * @param {Object} options - Step options
   */
  constructor(options = {}) {
    super('AdvancedAnalysisStep', 'Performs advanced analysis', 'analysis');
    
    this.options = {
      layerValidation: options.layerValidation !== false,
      logicAnalysis: options.logicAnalysis !== false,
      architecturalAssessment: options.architecturalAssessment !== false,
      performanceAnalysis: options.performanceAnalysis !== false,
      securityAnalysis: options.securityAnalysis !== false,
      scalabilityAnalysis: options.scalabilityAnalysis !== false,
      generateReport: options.generateReport !== false,
      ...options
    };
  }

  /**
   * Execute advanced analysis step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Advanced analysis result
   */
  async executeStep(context) {
    const projectPath = context.get('projectPath');
    const advancedAnalysisService = context.get('advancedAnalysisService');
    const logger = context.get('logger') || console;
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }
    
    if (!advancedAnalysisService) {
      throw new Error('Advanced analysis service not found in context');
    }

    const startTime = Date.now();
    
    try {
      logger.info('AdvancedAnalysisStep: Starting advanced analysis', {
        projectPath,
        options: this.options
      });

      // Update execution progress
      await this.updateExecutionProgress(context, 10, 'Starting advanced analysis');

      // Perform advanced analysis
      const analysis = await this.performAdvancedAnalysis(projectPath, context);

      // Update execution progress
      await this.updateExecutionProgress(context, 80, 'Analysis completed, generating report');

      // Generate report if requested
      let report = null;
      if (this.options.generateReport) {
        report = await this.generateAnalysisReport(analysis, context);
      }

      // Update execution progress
      await this.updateExecutionProgress(context, 100, 'Advanced analysis completed');

      const duration = Date.now() - startTime;

      logger.info('AdvancedAnalysisStep: Advanced analysis completed', {
        projectPath,
        duration,
        reportGenerated: !!report
      });

      return {
        success: true,
        analysis,
        report,
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
      logger.error('AdvancedAnalysisStep: Advanced analysis failed', {
        projectPath,
        duration,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Perform advanced analysis
   * @param {string} projectPath - Project path
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Advanced analysis result
   */
  async performAdvancedAnalysis(projectPath, context) {
    const advancedAnalysisService = context.get('advancedAnalysisService');
    
    // Perform advanced analysis using the service
    const analysis = await advancedAnalysisService.performAdvancedAnalysis(
      projectPath,
      this.options
    );

    return analysis;
  }

  /**
   * Generate analysis report
   * @param {Object} analysis - Analysis result
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Analysis report
   */
  async generateAnalysisReport(analysis, context) {
    const advancedAnalysisService = context.get('advancedAnalysisService');
    
    if (advancedAnalysisService && typeof advancedAnalysisService.generateAnalysisReport === 'function') {
      return advancedAnalysisService.generateAnalysisReport(analysis);
    }

    // Fallback report generation
    return this.generateFallbackReport(analysis);
  }

  /**
   * Generate fallback report
   * @param {Object} analysis - Analysis result
   * @returns {Object} Fallback report
   */
  generateFallbackReport(analysis) {
    const report = {
      summary: {
        totalIssues: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
        recommendations: 0
      },
      sections: [],
      metadata: {
        generatedAt: new Date(),
        version: '1.0.0'
      }
    };

    // Process analysis results
    if (analysis.issues) {
      for (const issue of analysis.issues) {
        report.summary.totalIssues++;
        const severity = issue.severity || 'medium';
        report.summary[`${severity}Issues`]++;
      }
    }

    if (analysis.recommendations) {
      report.summary.recommendations = analysis.recommendations.length;
    }

    // Add sections based on analysis type
    if (analysis.layerValidation) {
      report.sections.push({
        title: 'Layer Validation',
        content: analysis.layerValidation,
        type: 'validation'
      });
    }

    if (analysis.logicAnalysis) {
      report.sections.push({
        title: 'Logic Analysis',
        content: analysis.logicAnalysis,
        type: 'analysis'
      });
    }

    if (analysis.architecturalAssessment) {
      report.sections.push({
        title: 'Architectural Assessment',
        content: analysis.architecturalAssessment,
        type: 'assessment'
      });
    }

    return report;
  }

  /**
   * Update execution progress
   * @param {IWorkflowContext} context - Workflow context
   * @param {number} progress - Progress percentage
   * @param {string} message - Progress message
   */
  async updateExecutionProgress(context, progress, message) {
    const executionRepository = context.get('executionRepository');
    const executionId = context.get('executionId');
    
    if (executionRepository && executionId) {
      try {
        await executionRepository.updateProgress(executionId, progress, message);
      } catch (error) {
        // Log but don't fail the analysis
        const logger = context.get('logger') || console;
        logger.warn('Failed to update execution progress:', error.message);
      }
    }
  }

  /**
   * Generate metrics from analysis
   * @param {Object} analysis - Analysis result
   * @returns {Object} Metrics
   */
  generateMetrics(analysis) {
    const metrics = {
      totalIssues: analysis.issues?.length || 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
      recommendations: analysis.recommendations?.length || 0,
      layerValidationScore: this.calculateLayerValidationScore(analysis.layerValidation),
      logicAnalysisScore: this.calculateLogicAnalysisScore(analysis.logicAnalysis),
      architecturalScore: this.calculateArchitecturalScore(analysis.architecturalAssessment)
    };

    // Count issues by severity
    if (analysis.issues) {
      for (const issue of analysis.issues) {
        const severity = issue.severity || 'medium';
        metrics[`${severity}Issues`]++;
      }
    }

    return metrics;
  }

  /**
   * Calculate layer validation score
   * @param {Object} layerValidation - Layer validation result
   * @returns {number} Layer validation score (0-100)
   */
  calculateLayerValidationScore(layerValidation) {
    if (!layerValidation) return 100;

    let score = 100;
    const violations = layerValidation.violations || [];
    
    for (const violation of violations) {
      const severity = violation.severity || 'medium';
      const severityDeduction = {
        'critical': 20,
        'high': 10,
        'medium': 5,
        'low': 2
      }[severity] || 5;
      
      score -= severityDeduction;
    }

    return Math.max(0, score);
  }

  /**
   * Calculate logic analysis score
   * @param {Object} logicAnalysis - Logic analysis result
   * @returns {number} Logic analysis score (0-100)
   */
  calculateLogicAnalysisScore(logicAnalysis) {
    if (!logicAnalysis) return 100;

    let score = 100;
    const issues = logicAnalysis.issues || [];
    
    for (const issue of issues) {
      const severity = issue.severity || 'medium';
      const severityDeduction = {
        'critical': 15,
        'high': 8,
        'medium': 4,
        'low': 2
      }[severity] || 4;
      
      score -= severityDeduction;
    }

    return Math.max(0, score);
  }

  /**
   * Calculate architectural score
   * @param {Object} architecturalAssessment - Architectural assessment result
   * @returns {number} Architectural score (0-100)
   */
  calculateArchitecturalScore(architecturalAssessment) {
    if (!architecturalAssessment) return 100;

    let score = 100;
    const problems = architecturalAssessment.problems || [];
    
    for (const problem of problems) {
      const severity = problem.severity || 'medium';
      const severityDeduction = {
        'critical': 25,
        'high': 12,
        'medium': 6,
        'low': 3
      }[severity] || 6;
      
      score -= severityDeduction;
    }

    return Math.max(0, score);
  }

  /**
   * Generate recommendations from analysis
   * @param {Object} analysis - Analysis result
   * @returns {Array} Recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // Add existing recommendations
    if (analysis.recommendations) {
      recommendations.push(...analysis.recommendations);
    }

    // Generate recommendations based on issues
    if (analysis.issues) {
      const criticalIssues = analysis.issues.filter(i => i.severity === 'critical');
      const highIssues = analysis.issues.filter(i => i.severity === 'high');
      
      if (criticalIssues.length > 0) {
        recommendations.push({
          type: 'critical-issues',
          severity: 'critical',
          message: `Found ${criticalIssues.length} critical issues that require immediate attention.`,
          details: criticalIssues.slice(0, 5)
        });
      }
      
      if (highIssues.length > 0) {
        recommendations.push({
          type: 'high-issues',
          severity: 'high',
          message: `Found ${highIssues.length} high priority issues that should be addressed soon.`,
          details: highIssues.slice(0, 5)
        });
      }
    }

    // Layer validation recommendations
    if (analysis.layerValidation && analysis.layerValidation.violations) {
      const layerViolations = analysis.layerValidation.violations;
      if (layerViolations.length > 0) {
        recommendations.push({
          type: 'layer-validation',
          severity: 'medium',
          message: `Found ${layerViolations.length} layer validation violations. Review architectural boundaries.`,
          details: layerViolations.slice(0, 5)
        });
      }
    }

    // Logic analysis recommendations
    if (analysis.logicAnalysis && analysis.logicAnalysis.issues) {
      const logicIssues = analysis.logicAnalysis.issues;
      if (logicIssues.length > 0) {
        recommendations.push({
          type: 'logic-analysis',
          severity: 'medium',
          message: `Found ${logicIssues.length} logic analysis issues. Review business logic implementation.`,
          details: logicIssues.slice(0, 5)
        });
      }
    }

    return recommendations;
  }

  /**
   * Validate advanced analysis step
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
      return new ValidationResult(false, ['Project path is required for advanced analysis']);
    }

    // Check if advanced analysis service is available
    const advancedAnalysisService = context.get('advancedAnalysisService');
    if (!advancedAnalysisService) {
      return new ValidationResult(false, ['Advanced analysis service is required for advanced analysis']);
    }

    return new ValidationResult(true, []);
  }

  /**
   * Rollback advanced analysis step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Rollback result
   */
  async rollback(context) {
    // Advanced analysis steps typically don't need rollback as they don't modify files
    return {
      success: true,
      stepName: this._name,
      message: 'Advanced analysis step rollback completed (no changes to revert)'
    };
  }

  /**
   * Clone advanced analysis step
   * @returns {AdvancedAnalysisStep} Cloned step
   */
  clone() {
    const clonedStep = new AdvancedAnalysisStep(this.options);
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
      type: 'advanced-analysis'
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
      type: 'advanced-analysis'
    };
  }

  /**
   * Create step from JSON
   * @param {Object} json - JSON representation
   * @returns {AdvancedAnalysisStep} Step instance
   */
  static fromJSON(json) {
    const step = new AdvancedAnalysisStep(json.options);
    step._metadata = json.metadata || {};
    step._dependencies = json.dependencies || [];
    return step;
  }
}

module.exports = AdvancedAnalysisStep; 