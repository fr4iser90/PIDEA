/**
 * Architecture Analysis Step - Orchestrator
 * Orchestrates all specialized architecture analysis steps
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Orchestrator for all architecture analysis steps using architecture/index.js
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const AnalysisTaskService = require('@services/analysis/AnalysisTaskService');
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
    this.taskService = new AnalysisTaskService();
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
          failedSteps: 0
        },
        details: {},
        // Standardized outputs only
        issues: [],
        recommendations: [],
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
          
          results.details[stepName] = {
            success: stepResult.success,
            issues: stepResult.issues || [],
            recommendations: stepResult.recommendations || [],
            tasks: stepResult.tasks || [],
            documentation: stepResult.documentation || [],
            error: stepResult.error || null
          };
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

      // Generate architecture score
      const architectureScore = this.calculateArchitectureScore(results);
      results.summary.architectureScore = architectureScore;

      logger.info('✅ Architecture analysis completed successfully', {
        totalSteps: results.summary.totalSteps,
        completedSteps: results.summary.completedSteps,
        failedSteps: results.summary.failedSteps,
        architectureScore: architectureScore
      });

      // Generate tasks using unified task service
      const tasks = await this.taskService.createTasksFromAnalysis(
        results, 
        context, 
        'ArchitectureAnalysisOrchestrator'
      );
      results.tasks = tasks;

      // Database saving is handled by WorkflowController
      logger.info('📊 Architecture analysis results ready for database save by WorkflowController');

      return {
        success: true,
        result: results,
        metadata: {
          type: 'architecture-analysis',
          category: 'architecture',
          stepsExecuted: results.summary.totalSteps,
          architectureScore: architectureScore,
          tasksCreated: tasks.length
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
    const { issues } = results;
    
    let score = 100;
    
    // Deduct points for architecture issues
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
const stepInstance = new ArchitectureAnalysisOrchestrator();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 