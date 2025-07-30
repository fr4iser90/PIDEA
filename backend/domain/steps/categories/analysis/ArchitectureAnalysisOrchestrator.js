/**
 * Architecture Analysis Step - Orchestrator
 * Orchestrates all specialized architecture analysis steps
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Orchestrator for all architecture analysis steps using architecture/index.js
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('architecture_analysis_step');

// Step configuration
const config = {
  name: 'ArchitectureAnalysisOrchestrator',
  type: 'analysis',
  description: 'Orchestrates comprehensive architecture analysis using specialized steps',
  category: 'analysis',
  subcategory: 'architecture',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 90000, // 1.5 minutes for all architecture steps
    includePatterns: true,
    includeStructure: true,
    includeRecommendations: true,
    includeSecurityPatterns: true,
    includePerformancePatterns: true,
    includeCodeQualityPatterns: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class ArchitectureAnalysisOrchestrator extends StepBuilder {
  constructor() {
    super(config);
    this.architectureSteps = null;
  }

  /**
   * Load all architecture steps from index
   */
  async loadArchitectureSteps() {
    try {
      this.architectureSteps = {
        StructureAnalysisStep: require('./architecture/StructureAnalysisStep'),
        PatternAnalysisStep: require('./architecture/PatternAnalysisStep'),
        CouplingAnalysisStep: require('./architecture/CouplingAnalysisStep'),
        LayerAnalysisStep: require('./architecture/LayerAnalysisStep')
      };
      logger.info('✅ Architecture steps loaded successfully', {
        stepCount: Object.keys(this.architectureSteps).length,
        steps: Object.keys(this.architectureSteps)
      });
      return true;
    } catch (error) {
      logger.error('❌ Failed to load architecture steps:', error.message);
      throw error;
    }
  }

  /**
   * Execute all architecture analysis steps
   */
  async execute(context) {
    try {
      logger.info('🏗️ Starting comprehensive architecture analysis...');
      
      // Load architecture steps
      await this.loadArchitectureSteps();
      
      const results = {
        summary: {
          totalSteps: 0,
          completedSteps: 0,
          failedSteps: 0,
          patterns: [],
          structures: [],
          recommendations: [],
          securityPatterns: [],
          performancePatterns: [],
          codeQualityPatterns: []
        },
        details: {},
        recommendations: [],
        // Standardized outputs
        issues: [],
        tasks: [],
        documentation: []
      };

      // Execute each architecture step SEQUENTIALLY
      const stepNames = Object.keys(this.architectureSteps);
      for (let i = 0; i < stepNames.length; i++) {
        const stepName = stepNames[i];
        const stepModule = this.architectureSteps[stepName];
        
        try {
          logger.info(`🔍 Executing ${stepName}... (${i + 1}/${stepNames.length})`);
          
          const stepResult = await stepModule.execute(context);
          
          results.details[stepName] = stepResult;
          results.summary.completedSteps++;
          
          // Aggregate results
          if (stepResult.patterns) {
            results.summary.patterns.push(...stepResult.patterns);
          }
          if (stepResult.structures) {
            results.summary.structures.push(...stepResult.structures);
          }
          if (stepResult.recommendations) {
            results.summary.recommendations.push(...stepResult.recommendations);
          }
          if (stepResult.securityPatterns) {
            results.summary.securityPatterns.push(...stepResult.securityPatterns);
          }
          if (stepResult.performancePatterns) {
            results.summary.performancePatterns.push(...stepResult.performancePatterns);
          }
          if (stepResult.codeQualityPatterns) {
            results.summary.codeQualityPatterns.push(...stepResult.codeQualityPatterns);
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

      // Generate architecture score
      const architectureScore = this.calculateArchitectureScore(results);
      results.summary.architectureScore = architectureScore;

      logger.info('✅ Architecture analysis completed successfully', {
        totalSteps: results.summary.totalSteps,
        completedSteps: results.summary.completedSteps,
        failedSteps: results.summary.failedSteps,
        architectureScore: architectureScore
      });

      // Database saving is handled by WorkflowController
      logger.info('📊 Architecture analysis results ready for database save by WorkflowController');

      return {
        success: true,
        result: results,
        metadata: {
          type: 'architecture-analysis',
          category: 'architecture',
          stepsExecuted: results.summary.totalSteps,
          architectureScore: architectureScore
        }
      };

    } catch (error) {
      logger.error('❌ Architecture analysis failed:', error.message);
      return {
        success: false,
        error: error.message,
        result: null
      };
    }
  }

  /**
   * Calculate overall architecture score
   */
  calculateArchitectureScore(results) {
    const { patterns, structures, recommendations, securityPatterns, performancePatterns, codeQualityPatterns } = results.summary;
    
    let score = 100;
    
    // Add points for good patterns
    score += patterns.length * 5;
    
    // Add points for good structures
    score += structures.length * 3;
    
    // Add points for security patterns
    score += securityPatterns.length * 8;
    
    // Add points for performance patterns
    score += performancePatterns.length * 6;
    
    // Add points for code quality patterns
    score += codeQualityPatterns.length * 4;
    
    // Add points for recommendations (shows good analysis)
    score += recommendations.length * 2;
    
    return Math.max(0, Math.min(100, score));
  }
}

// Create instance for execution
const stepInstance = new ArchitectureAnalysisOrchestrator();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 