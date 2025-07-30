/**
 * Security Analysis Step - Orchestrator
 * Orchestrates all specialized security analysis steps
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Orchestrator for all security analysis steps using security/index.js
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
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
          failedSteps: 0,
          vulnerabilities: [],
          bestPractices: [],
          dependencies: [],
          secrets: [],
          permissions: []
        },
        details: {},
        recommendations: [],
        // Standardized outputs
        issues: [],
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
          
          results.details[stepName] = stepResult;
          results.summary.completedSteps++;
          
          // Aggregate results
          if (stepResult.vulnerabilities) {
            results.summary.vulnerabilities.push(...stepResult.vulnerabilities);
          }
          if (stepResult.bestPractices) {
            results.summary.bestPractices.push(...stepResult.bestPractices);
          }
          if (stepResult.dependencies) {
            results.summary.dependencies.push(...stepResult.dependencies);
          }
          if (stepResult.secrets) {
            results.summary.secrets.push(...stepResult.secrets);
          }
          if (stepResult.permissions) {
            results.summary.permissions.push(...stepResult.permissions);
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

      // Generate security score
      const securityScore = this.calculateSecurityScore(results);
      results.summary.securityScore = securityScore;

      logger.info('✅ Security analysis completed successfully', {
        totalSteps: results.summary.totalSteps,
        completedSteps: results.summary.completedSteps,
        failedSteps: results.summary.failedSteps,
        securityScore: securityScore
      });

      // Database saving is handled by WorkflowController
      logger.info('📊 Security analysis results ready for database save by WorkflowController');

      return {
        success: true,
        result: results,
        metadata: {
          type: 'security-analysis',
          category: 'security',
          stepsExecuted: results.summary.totalSteps,
          securityScore: securityScore
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
    const { vulnerabilities, bestPractices, secrets, permissions } = results.summary;
    
    let score = 100;
    
    // Deduct points for vulnerabilities
    score -= vulnerabilities.length * 10;
    
    // Deduct points for secrets found
    score -= secrets.length * 15;
    
    // Deduct points for permission issues
    score -= permissions.length * 5;
    
    // Add points for best practices
    score += bestPractices.length * 2;
    
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