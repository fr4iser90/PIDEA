/**
 * Dependency Analysis Step - Orchestrator
 * Orchestrates all specialized dependency analysis steps
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Orchestrator for all dependency analysis steps using dependencies/index.js
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const AnalysisTaskService = require('@services/analysis/AnalysisTaskService');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('dependency_analysis_step');

// Step configuration
const config = {
  name: 'DependencyAnalysisOrchestrator',
  type: 'analysis',
  description: 'Orchestrates comprehensive dependency analysis using specialized steps',
  category: 'analysis',
  subcategory: 'dependencies',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 120000, // 2 minutes for all dependency steps
    includeOutdated: true,
    includeVulnerable: true,
    includeUnused: true,
    includeLicense: true,
    includeSecurity: true,
    includeSize: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class DependencyAnalysisOrchestrator extends StepBuilder {
  constructor() {
    super(config);
    this.dependencySteps = null;
    this.taskService = new AnalysisTaskService();
  }

  /**
   * Load all dependency steps from index
   */
  async loadDependencySteps() {
    try {
      this.dependencySteps = {
        OutdatedDependencyStep: require('./dependencies/OutdatedDependencyStep'),
        VulnerableDependencyStep: require('./dependencies/VulnerableDependencyStep'),
        UnusedDependencyStep: require('./dependencies/UnusedDependencyStep'),
        LicenseDependencyStep: require('./dependencies/LicenseDependencyStep')
      };
      logger.info('✅ Dependency steps loaded successfully', {
        stepCount: Object.keys(this.dependencySteps).length,
        steps: Object.keys(this.dependencySteps)
      });
      return true;
    } catch (error) {
      logger.error('❌ Failed to load dependency steps:', error.message);
      throw error;
    }
  }

  /**
   * Execute all dependency analysis steps
   */
  async execute(context) {
    try {
      logger.info('📦 Starting comprehensive dependency analysis...');
      
      // Load dependency steps
      await this.loadDependencySteps();
      
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

      // Execute each dependency step SEQUENTIALLY
      const stepNames = Object.keys(this.dependencySteps);
      for (let i = 0; i < stepNames.length; i++) {
        const stepName = stepNames[i];
        const stepModule = this.dependencySteps[stepName];
        
        try {
          logger.info(`📦 Executing ${stepName}... (${i + 1}/${stepNames.length})`);
          
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
          
          // Aggregate standardized outputs from details only (no circular references)
          if (results.details[stepName].issues) {
            results.issues.push(...results.details[stepName].issues);
          }
          if (results.details[stepName].recommendations) {
            results.recommendations.push(...results.details[stepName].recommendations);
          }
          if (results.details[stepName].tasks) {
            results.tasks.push(...results.details[stepName].tasks);
          }
          if (results.details[stepName].documentation) {
            results.documentation.push(...results.details[stepName].documentation);
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

      // Generate dependency health score
      const dependencyHealthScore = this.calculateDependencyHealthScore(results);
      results.summary.dependencyHealthScore = dependencyHealthScore;

      logger.info('✅ Dependency analysis completed successfully', {
        totalSteps: results.summary.totalSteps,
        completedSteps: results.summary.completedSteps,
        failedSteps: results.summary.failedSteps,
        dependencyHealthScore: dependencyHealthScore
      });

      // Generate tasks using unified task service
      const tasks = await this.taskService.createTasksFromAnalysis(
        results, 
        context, 
        'DependencyAnalysisOrchestrator'
      );
      results.tasks = tasks;

      // Database saving is handled by WorkflowController
      logger.info('📊 Dependency analysis results ready for database save by WorkflowController');

      return {
        success: true,
        result: results,
        metadata: {
          type: 'dependency-analysis',
          category: 'dependencies',
          stepsExecuted: results.summary.totalSteps,
          dependencyHealthScore: dependencyHealthScore,
          tasksCreated: tasks.length
        }
      };

    } catch (error) {
      logger.error('❌ Dependency analysis failed:', error.message);
      return {
        success: false,
        error: error.message,
        result: null
      };
    }
  }

  /**
   * Calculate overall dependency health score
   */
  calculateDependencyHealthScore(results) {
    const { issues } = results;
    
    let score = 100;
    
    // Deduct points for dependency issues
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
const stepInstance = new DependencyAnalysisOrchestrator();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 