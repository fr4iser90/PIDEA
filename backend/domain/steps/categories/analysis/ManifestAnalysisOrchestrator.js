/**
 * Manifest Analysis Step - Orchestrator
 * Orchestrates all specialized manifest analysis steps
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Orchestrator for all manifest analysis steps using manifest/index.js
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const AnalysisTaskService = require('@services/analysis/AnalysisTaskService');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('manifest_analysis_step');

// Step configuration
const config = {
  name: 'ManifestAnalysisOrchestrator',
  type: 'analysis',
  description: 'Orchestrates comprehensive manifest analysis using specialized steps',
  category: 'analysis',
  subcategory: 'manifest',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 60000, // 1 minute for all manifest steps
    includePackageJson: true,
    includeDockerfile: true,
    includeCIConfig: true,
    includeEnvironment: true,
    includeScripts: true,
    includeMetadata: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class ManifestAnalysisOrchestrator extends StepBuilder {
  constructor() {
    super(config);
    this.manifestSteps = null;
    this.taskService = new AnalysisTaskService();
  }

  /**
   * Load all manifest steps from index
   */
  async loadManifestSteps() {
    try {
      this.manifestSteps = {
        PackageJsonManifestStep: require('./manifest/PackageJsonManifestStep'),
        DockerfileManifestStep: require('./manifest/DockerfileManifestStep'),
        CIConfigManifestStep: require('./manifest/CIConfigManifestStep'),
        EnvironmentManifestStep: require('./manifest/EnvironmentManifestStep')
      };
      logger.info('✅ Manifest steps loaded successfully', {
        stepCount: Object.keys(this.manifestSteps).length,
        steps: Object.keys(this.manifestSteps)
      });
      return true;
    } catch (error) {
      logger.error('❌ Failed to load manifest steps:', error.message);
      throw error;
    }
  }

  /**
   * Execute all manifest analysis steps
   */
  async execute(context) {
    try {
      logger.info('📋 Starting comprehensive manifest analysis...');
      
      // Load manifest steps
      await this.loadManifestSteps();
      
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

      // Execute each manifest step SEQUENTIALLY
      const stepNames = Object.keys(this.manifestSteps);
      for (let i = 0; i < stepNames.length; i++) {
        const stepName = stepNames[i];
        const stepModule = this.manifestSteps[stepName];
        
        try {
          logger.info(`📋 Executing ${stepName}... (${i + 1}/${stepNames.length})`);
          
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

      // Generate manifest quality score
      const manifestQualityScore = this.calculateManifestQualityScore(results);
      results.summary.manifestQualityScore = manifestQualityScore;

      logger.info('✅ Manifest analysis completed successfully', {
        totalSteps: results.summary.totalSteps,
        completedSteps: results.summary.completedSteps,
        failedSteps: results.summary.failedSteps,
        manifestQualityScore: manifestQualityScore
      });

      // Generate tasks using unified task service
      const tasks = await this.taskService.createTasksFromAnalysis(
        results, 
        context, 
        'ManifestAnalysisOrchestrator'
      );
      results.tasks = tasks;

      // Database saving is handled by WorkflowController
      logger.info('📊 Manifest analysis results ready for database save by WorkflowController');

      return {
        success: true,
        result: results,
        metadata: {
          type: 'manifest-analysis',
          category: 'manifest',
          stepsExecuted: results.summary.totalSteps,
          manifestQualityScore: manifestQualityScore,
          tasksCreated: tasks.length
        }
      };

    } catch (error) {
      logger.error('❌ Manifest analysis failed:', error.message);
      return {
        success: false,
        error: error.message,
        result: null
      };
    }
  }

  /**
   * Calculate overall manifest quality score
   */
  calculateManifestQualityScore(results) {
    const { issues } = results;
    
    let score = 100;
    
    // Deduct points for manifest issues
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
const stepInstance = new ManifestAnalysisOrchestrator();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 