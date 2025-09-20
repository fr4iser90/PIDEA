/**
 * Performance Analysis Step - Orchestrator
 * Orchestrates all specialized performance analysis steps
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Orchestrator for all performance analysis steps using performance/index.js
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const AnalysisTaskService = require('@services/analysis/AnalysisTaskService');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('performance_analysis_step');

// Step configuration
const config = {
  name: 'PerformanceAnalysisOrchestrator',
  type: 'analysis',
  description: 'Orchestrates comprehensive performance analysis using specialized steps',
  category: 'analysis',
  subcategory: 'performance',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 120000, // 2 minutes for all performance steps
    includeMetrics: true,
    includeOptimizations: true,
    includeBottlenecks: true,
    includeProfiling: true,
    includeLoadTesting: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class PerformanceAnalysisOrchestrator extends StepBuilder {
  constructor() {
    super(config);
    this.performanceSteps = null;
    this.taskService = new AnalysisTaskService();
  }

  /**
   * Load all performance steps from index
   */
  async loadPerformanceSteps() {
    try {
      this.performanceSteps = {
        MemoryAnalysisStep: require('./performance/MemoryAnalysisStep'),
        CpuAnalysisStep: require('./performance/CpuAnalysisStep'),
        NetworkAnalysisStep: require('./performance/NetworkAnalysisStep'),
        DatabaseAnalysisStep: require('./performance/DatabaseAnalysisStep')
      };
      logger.info('✅ Performance steps loaded successfully', {
        stepCount: Object.keys(this.performanceSteps).length,
        steps: Object.keys(this.performanceSteps)
      });
      return true;
    } catch (error) {
      logger.error('❌ Failed to load performance steps:', error.message);
      throw error;
    }
  }

  /**
   * Execute all performance analysis steps
   */
  async execute(context) {
    try {
      logger.info('⚡ Starting comprehensive performance analysis...');
      
      // Load performance steps
      await this.loadPerformanceSteps();
      
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

      // Execute each performance step SEQUENTIALLY
      const stepNames = Object.keys(this.performanceSteps);
      for (let i = 0; i < stepNames.length; i++) {
        const stepName = stepNames[i];
        const stepModule = this.performanceSteps[stepName];
        
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

      // Generate performance score
      const performanceScore = this.calculatePerformanceScore(results);
      results.summary.performanceScore = performanceScore;

      logger.info('✅ Performance analysis completed successfully', {
        totalSteps: results.summary.totalSteps,
        completedSteps: results.summary.completedSteps,
        failedSteps: results.summary.failedSteps,
        performanceScore: performanceScore
      });

      // Generate tasks using unified task service
      const tasks = await this.taskService.createTasksFromAnalysis(
        results, 
        context, 
        'PerformanceAnalysisOrchestrator'
      );
      results.tasks = tasks;

      // Database saving is handled by WorkflowController
      logger.info('📊 Performance analysis results ready for database save by WorkflowController');

      return {
        success: true,
        result: results,
        metadata: {
          type: 'performance-analysis',
          category: 'performance',
          stepsExecuted: results.summary.totalSteps,
          performanceScore: performanceScore,
          tasksCreated: tasks.length
        }
      };

    } catch (error) {
      logger.error('❌ Performance analysis failed:', error.message);
      return {
        success: false,
        error: error.message,
        result: null
      };
    }
  }

  /**
   * Calculate overall performance score
   */
  calculatePerformanceScore(results) {
    const { issues } = results;
    
    let score = 100;
    
    // Deduct points for performance issues
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
const stepInstance = new PerformanceAnalysisOrchestrator();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 