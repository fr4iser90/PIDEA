/**
 * Tech Stack Analysis Step - Orchestrator
 * Orchestrates all specialized tech stack analysis steps
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Orchestrator for all tech stack analysis steps using tech-stack/index.js
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('tech_stack_analysis_step');

// Step configuration
const config = {
  name: 'TechStackAnalysisOrchestrator',
  type: 'analysis',
  description: 'Orchestrates comprehensive tech stack analysis using specialized steps',
  category: 'analysis',
  subcategory: 'tech-stack',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 90000, // 1.5 minutes for all tech stack steps
    includeFramework: true,
    includeLibrary: true,
    includeTool: true,
    includeVersion: true,
    includeCompatibility: true,
    includeTrends: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class TechStackAnalysisOrchestrator extends StepBuilder {
  constructor() {
    super(config);
    this.techStackSteps = null;
  }

  /**
   * Load all tech stack steps from index
   */
  async loadTechStackSteps() {
    try {
      this.techStackSteps = {
        FrameworkTechStackStep: require('./tech-stack/FrameworkTechStackStep'),
        LibraryTechStackStep: require('./tech-stack/LibraryTechStackStep'),
        ToolTechStackStep: require('./tech-stack/ToolTechStackStep'),
        VersionTechStackStep: require('./tech-stack/VersionTechStackStep')
      };
      logger.info('✅ Tech stack steps loaded successfully', {
        stepCount: Object.keys(this.techStackSteps).length,
        steps: Object.keys(this.techStackSteps)
      });
      return true;
    } catch (error) {
      logger.error('❌ Failed to load tech stack steps:', error.message);
      throw error;
    }
  }

  /**
   * Execute all tech stack analysis steps
   */
  async execute(context) {
    try {
      logger.info('🛠️ Starting comprehensive tech stack analysis...');
      
      // Load tech stack steps
      await this.loadTechStackSteps();
      
      const results = {
        summary: {
          totalSteps: 0,
          completedSteps: 0,
          failedSteps: 0
        },
        details: {},
        // Standardized outputs only
        issues: [],
        recommendations: [],
        tasks: [],
        documentation: []
      };

      // Execute each tech stack step SEQUENTIALLY
      const stepNames = Object.keys(this.techStackSteps);
      for (let i = 0; i < stepNames.length; i++) {
        const stepName = stepNames[i];
        const stepModule = this.techStackSteps[stepName];
        
        try {
          logger.info(`🛠️ Executing ${stepName}... (${i + 1}/${stepNames.length})`);
          
          const stepResult = await stepModule.execute(context);
          
          results.details[stepName] = stepResult;
          results.summary.completedSteps++;
          
          // Aggregate standardized outputs only
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
          
          // Also check stepResult.result for nested data
          if (stepResult.result) {
            if (stepResult.result.issues) {
              results.issues.push(...stepResult.result.issues);
            }
            if (stepResult.result.recommendations) {
              results.recommendations.push(...stepResult.result.recommendations);
            }
            if (stepResult.result.tasks) {
              results.tasks.push(...stepResult.result.tasks);
            }
            if (stepResult.result.documentation) {
              results.documentation.push(...stepResult.result.documentation);
            }
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

      // Generate tech stack maturity score
      const techStackMaturityScore = this.calculateTechStackMaturityScore(results);
      results.summary.techStackMaturityScore = techStackMaturityScore;

      logger.info('✅ Tech stack analysis completed successfully', {
        totalSteps: results.summary.totalSteps,
        completedSteps: results.summary.completedSteps,
        failedSteps: results.summary.failedSteps,
        techStackMaturityScore: techStackMaturityScore
      });

      // Database saving is handled by WorkflowController
      logger.info('📊 Tech stack analysis results ready for database save by WorkflowController');

      return {
        success: true,
        result: results,
        metadata: {
          type: 'tech-stack-analysis',
          category: 'tech-stack',
          stepsExecuted: results.summary.totalSteps,
          techStackMaturityScore: techStackMaturityScore
        }
      };

    } catch (error) {
      logger.error('❌ Tech stack analysis failed:', error.message);
      return {
        success: false,
        error: error.message,
        result: null
      };
    }
  }

  /**
   * Calculate overall tech stack maturity score
   */
  calculateTechStackMaturityScore(results) {
    const { issues } = results;
    
    let score = 100;
    
    // Deduct points for tech stack issues
    if (issues && issues.length > 0) {
      const severityWeights = {
        critical: 10,
        high: 7,
        medium: 4,
        low: 1
      };
      
      const totalWeight = issues.reduce((sum, issue) => {
        return sum + (severityWeights[issue.severity] || 1);
      }, 0);
      
      score -= totalWeight;
    }
    
    return Math.max(0, Math.min(100, score));
  }
}

// Create instance for execution
const stepInstance = new TechStackAnalysisOrchestrator();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 