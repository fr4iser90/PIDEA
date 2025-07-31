/**
 * Code Quality Analysis Step - Orchestrator
 * Orchestrates all specialized code quality analysis steps
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Orchestrator for all code quality analysis steps using code-quality/index.js
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('code_quality_analysis_step');

// Step configuration
const config = {
  name: 'CodeQualityAnalysisOrchestrator',
  type: 'analysis',
  description: 'Orchestrates comprehensive code quality analysis using specialized steps',
  category: 'analysis',
  subcategory: 'code-quality',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 90000, // 1.5 minutes for all code quality steps
    includeLinting: true,
    includeComplexity: true,
    includeCoverage: true,
    includeDocumentation: true,
    includeBestPractices: true,
    includeCodeStyle: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class CodeQualityAnalysisOrchestrator extends StepBuilder {
  constructor() {
    super(config);
    this.codeQualitySteps = null;
  }

  /**
   * Load all code quality steps from index
   */
  async loadCodeQualitySteps() {
    try {
      this.codeQualitySteps = {
        LintingCodeQualityStep: require('./code-quality/LintingCodeQualityStep'),
        ComplexityCodeQualityStep: require('./code-quality/ComplexityCodeQualityStep'),
        CoverageCodeQualityStep: require('./code-quality/CoverageCodeQualityStep'),
        DocumentationCodeQualityStep: require('./code-quality/DocumentationCodeQualityStep')
      };
      logger.info('✅ Code quality steps loaded successfully', {
        stepCount: Object.keys(this.codeQualitySteps).length,
        steps: Object.keys(this.codeQualitySteps)
      });
      return true;
    } catch (error) {
      logger.error('❌ Failed to load code quality steps:', error.message);
      throw error;
    }
  }

  /**
   * Execute all code quality analysis steps
   */
  async execute(context) {
    try {
      logger.info('🔍 Starting comprehensive code quality analysis...');
      
      // Load code quality steps
      await this.loadCodeQualitySteps();
      
      const results = {
        summary: {
          totalSteps: 0,
          completedSteps: 0,
          failedSteps: 0,
          lintingIssues: [],
          complexityIssues: [],
          coverageIssues: [],
          documentationIssues: [],
          bestPractices: [],
          codeStyleIssues: []
        },
        details: {},
        recommendations: [],
        // Standardized outputs
        issues: [],
        tasks: [],
        documentation: []
      };

      // Execute each code quality step SEQUENTIALLY
      const stepNames = Object.keys(this.codeQualitySteps);
      for (let i = 0; i < stepNames.length; i++) {
        const stepName = stepNames[i];
        const stepModule = this.codeQualitySteps[stepName];
        
        try {
          logger.info(`🔍 Executing ${stepName}... (${i + 1}/${stepNames.length})`);
          
          const stepResult = await stepModule.execute(context);
          
          results.details[stepName] = stepResult;
          results.summary.completedSteps++;
          
          // Aggregate results
          if (stepResult.lintingIssues) {
            results.summary.lintingIssues.push(...stepResult.lintingIssues);
          }
          if (stepResult.complexityIssues) {
            results.summary.complexityIssues.push(...stepResult.complexityIssues);
          }
          if (stepResult.coverageIssues) {
            results.summary.coverageIssues.push(...stepResult.coverageIssues);
          }
          if (stepResult.documentationIssues) {
            results.summary.documentationIssues.push(...stepResult.documentationIssues);
          }
          if (stepResult.bestPractices) {
            results.summary.bestPractices.push(...stepResult.bestPractices);
          }
          if (stepResult.codeStyleIssues) {
            results.summary.codeStyleIssues.push(...stepResult.codeStyleIssues);
          }
          
          // Aggregate standardized outputs
          if (stepResult.issues) {
            results.issues.push(...stepResult.issues);
          }
          if (stepResult.recommendations) {
            results.recommendations.push(...stepResult.recommendations);
          }
          if (stepResult.tasks) {
            results.tasks.push(...stepResult.tasks);
          }
          if (stepResult.documentation) {
            results.documentation.push(...stepResult.documentation);
          }
          
          logger.info(`✅ ${stepName} completed successfully`);
          
        } catch (stepError) {
          logger.error(`❌ ${stepName} failed:`, stepError.message);
          results.summary.failedSteps++;
          results.details[stepName] = {
            error: stepError.message,
            success: false
          };
        }
        
        results.summary.totalSteps++;
      }

      // Generate code quality score
      const codeQualityScore = this.calculateCodeQualityScore(results);
      results.summary.codeQualityScore = codeQualityScore;

      logger.info('✅ Code quality analysis completed successfully', {
        totalSteps: results.summary.totalSteps,
        completedSteps: results.summary.completedSteps,
        failedSteps: results.summary.failedSteps,
        codeQualityScore: codeQualityScore
      });

      // Database saving is handled by WorkflowController
      logger.info('📊 Code quality analysis results ready for database save by WorkflowController');

      return {
        success: true,
        result: results,
        metadata: {
          type: 'code-quality-analysis',
          category: 'code-quality',
          stepsExecuted: results.summary.totalSteps,
          codeQualityScore: codeQualityScore
        }
      };

    } catch (error) {
      logger.error('❌ Code quality analysis failed:', error.message);
      return {
        success: false,
        error: error.message,
        result: null
      };
    }
  }

  /**
   * Calculate overall code quality score
   */
  calculateCodeQualityScore(results) {
    const { lintingIssues, complexityIssues, coverageIssues, documentationIssues, bestPractices } = results.summary;
    
    let score = 100;
    
    // Deduct points for linting issues
    score -= lintingIssues.length * 5;
    
    // Deduct points for complexity issues
    score -= complexityIssues.length * 8;
    
    // Deduct points for coverage issues
    score -= coverageIssues.length * 10;
    
    // Deduct points for documentation issues
    score -= documentationIssues.length * 3;
    
    // Add points for best practices
    score += bestPractices.length * 2;
    
    return Math.max(0, Math.min(100, score));
  }
}

// Create instance for execution
const stepInstance = new CodeQualityAnalysisOrchestrator();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 