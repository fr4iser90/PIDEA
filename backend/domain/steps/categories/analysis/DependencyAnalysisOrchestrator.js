/**
 * Dependency Analysis Step - Orchestrator
 * Orchestrates all specialized dependency analysis steps
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Orchestrator for all dependency analysis steps using dependencies/index.js
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
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
          failedSteps: 0,
          outdatedDependencies: [],
          vulnerableDependencies: [],
          unusedDependencies: [],
          licenseIssues: [],
          securityIssues: [],
          sizeIssues: []
        },
        details: {},
        recommendations: [],
        // Standardized outputs
        issues: [],
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
          
          results.details[stepName] = stepResult;
          results.summary.completedSteps++;
          
          // Aggregate results
          if (stepResult.outdatedDependencies) {
            results.summary.outdatedDependencies.push(...stepResult.outdatedDependencies);
          }
          if (stepResult.vulnerableDependencies) {
            results.summary.vulnerableDependencies.push(...stepResult.vulnerableDependencies);
          }
          if (stepResult.unusedDependencies) {
            results.summary.unusedDependencies.push(...stepResult.unusedDependencies);
          }
          if (stepResult.licenseIssues) {
            results.summary.licenseIssues.push(...stepResult.licenseIssues);
          }
          if (stepResult.securityIssues) {
            results.summary.securityIssues.push(...stepResult.securityIssues);
          }
          if (stepResult.sizeIssues) {
            results.summary.sizeIssues.push(...stepResult.sizeIssues);
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

      // Generate dependency health score
      const dependencyHealthScore = this.calculateDependencyHealthScore(results);
      results.summary.dependencyHealthScore = dependencyHealthScore;

      logger.info('✅ Dependency analysis completed successfully', {
        totalSteps: results.summary.totalSteps,
        completedSteps: results.summary.completedSteps,
        failedSteps: results.summary.failedSteps,
        dependencyHealthScore: dependencyHealthScore
      });

      // Database saving is handled by WorkflowController
      logger.info('📊 Dependency analysis results ready for database save by WorkflowController');

      return {
        success: true,
        result: results,
        metadata: {
          type: 'dependency-analysis',
          category: 'dependencies',
          stepsExecuted: results.summary.totalSteps,
          dependencyHealthScore: dependencyHealthScore
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
    const { outdatedDependencies, vulnerableDependencies, unusedDependencies, licenseIssues } = results.summary;
    
    let score = 100;
    
    // Deduct points for vulnerable dependencies
    score -= vulnerableDependencies.length * 15;
    
    // Deduct points for outdated dependencies
    score -= outdatedDependencies.length * 5;
    
    // Deduct points for unused dependencies
    score -= unusedDependencies.length * 3;
    
    // Deduct points for license issues
    score -= licenseIssues.length * 8;
    
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