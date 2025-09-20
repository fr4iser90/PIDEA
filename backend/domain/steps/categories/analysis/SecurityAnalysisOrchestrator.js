/**
 * Security Analysis Step - Orchestrator
 * Orchestrates all specialized security analysis steps
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Orchestrator for all security analysis steps using security/index.js
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const AnalysisTaskService = require('@services/analysis/AnalysisTaskService');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('security_analysis_step');

// Step configuration
const config = {
  name: 'SecurityAnalysisOrchestrator',
  type: 'analysis',
  description: 'Orchestrates comprehensive security analysis using specialized steps',
  category: 'analysis',
  subcategory: 'security',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 120000, // 2 minutes for all security steps
    includeVulnerabilities: true,
    includeBestPractices: true,
    includeDependencies: true,
    includeSecrets: true,
    includePermissions: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class SecurityAnalysisOrchestrator extends StepBuilder {
  constructor() {
    super(config);
    this.securitySteps = null;
    this.taskService = new AnalysisTaskService();
  }

  /**
   * Load all security steps from index
   */
  async loadSecuritySteps() {
    try {
      this.securitySteps = {
        TrivySecurityStep: require('./security/TrivySecurityStep'),
        SnykSecurityStep: require('./security/SnykSecurityStep'),
        SemgrepSecurityStep: require('./security/SemgrepSecurityStep'),
        SecretScanningStep: require('./security/SecretScanningStep'),
        ZapSecurityStep: require('./security/ZapSecurityStep'),
        ComplianceSecurityStep: require('./security/ComplianceSecurityStep')
      };
      logger.info('✅ Security steps loaded successfully', {
        stepCount: Object.keys(this.securitySteps).length,
        steps: Object.keys(this.securitySteps)
      });
      return true;
    } catch (error) {
      logger.error('❌ Failed to load security steps:', error.message);
      throw error;
    }
  }

  /**
   * Execute all security analysis steps
   */
  async execute(context) {
    try {
      logger.info('🔒 Starting comprehensive security analysis...');
      
      // Load security steps
      await this.loadSecuritySteps();
      
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

      // Execute each security step SEQUENTIALLY
      const stepNames = Object.keys(this.securitySteps);
      for (let i = 0; i < stepNames.length; i++) {
        const stepName = stepNames[i];
        const stepModule = this.securitySteps[stepName];
        
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

      // Generate security score
      const securityScore = this.calculateSecurityScore(results);
      results.summary.securityScore = securityScore;

      logger.info('✅ Security analysis completed successfully', {
        totalSteps: results.summary.totalSteps,
        completedSteps: results.summary.completedSteps,
        failedSteps: results.summary.failedSteps,
        securityScore: securityScore
      });

      // Generate tasks using unified task service
      const tasks = await this.taskService.createTasksFromAnalysis(
        results, 
        context, 
        'SecurityAnalysisOrchestrator'
      );
      results.tasks = tasks;

      // Database saving is handled by WorkflowController
      logger.info('📊 Security analysis results ready for database save by WorkflowController');

      return {
        success: true,
        result: results,
        metadata: {
          type: 'security-analysis',
          category: 'security',
          stepsExecuted: results.summary.totalSteps,
          securityScore: securityScore,
          tasksCreated: tasks.length
        }
      };

    } catch (error) {
      logger.error('❌ Security analysis failed:', error.message);
      return {
        success: false,
        error: error.message,
        result: null
      };
    }
  }

  /**
   * Calculate overall security score
   */
  calculateSecurityScore(results) {
    const { issues } = results;
    
    let score = 100;
    
    // Deduct points for security issues
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
const stepInstance = new SecurityAnalysisOrchestrator();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 