/**
 * Performance Analysis Step - Orchestrator
 * Orchestrates all specialized performance analysis steps
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Orchestrator for all performance analysis steps using performance/index.js
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
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
          failedSteps: 0,
          metrics: [],
          optimizations: [],
          bottlenecks: [],
          profiling: [],
          loadTesting: []
        },
        details: {},
        recommendations: [],
        // Standardized outputs
        issues: [],
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
          
          results.details[stepName] = stepResult;
          results.summary.completedSteps++;
          
          // Aggregate results
          if (stepResult.metrics) {
            results.summary.metrics.push(...stepResult.metrics);
          }
          if (stepResult.optimizations) {
            results.summary.optimizations.push(...stepResult.optimizations);
          }
          if (stepResult.bottlenecks) {
            results.summary.bottlenecks.push(...stepResult.bottlenecks);
          }
          if (stepResult.profiling) {
            results.summary.profiling.push(...stepResult.profiling);
          }
          if (stepResult.loadTesting) {
            results.summary.loadTesting.push(...stepResult.loadTesting);
          }
          if (stepResult.recommendations) {
            results.summary.recommendations.push(...stepResult.recommendations);
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

      // Generate performance score
      const performanceScore = this.calculatePerformanceScore(results);
      results.summary.performanceScore = performanceScore;

      logger.info('✅ Performance analysis completed successfully', {
        totalSteps: results.summary.totalSteps,
        completedSteps: results.summary.completedSteps,
        failedSteps: results.summary.failedSteps,
        performanceScore: performanceScore
      });

      // Database saving is handled by WorkflowController
      logger.info('📊 Performance analysis results ready for database save by WorkflowController');

      return {
        success: true,
        result: results,
        metadata: {
          type: 'performance-analysis',
          category: 'performance',
          stepsExecuted: results.summary.totalSteps,
          performanceScore: performanceScore
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
    const { metrics, optimizations, bottlenecks, profiling, loadTesting } = results.summary;
    
    let score = 100;
    
    // Deduct points for bottlenecks
    score -= bottlenecks.length * 15;
    
    // Add points for optimizations found
    score += optimizations.length * 5;
    
    // Add points for good metrics
    score += metrics.length * 3;
    
    // Add points for profiling data
    score += profiling.length * 4;
    
    // Add points for load testing data
    score += loadTesting.length * 6;
    
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