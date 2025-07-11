#!/usr/bin/env node
require('module-alias/register');

/**
 * Git Workflow Deployment Validation Script
 * Validates that the enhanced git workflow system is properly configured
 * and ready for deployment across all environments
 */

const path = require('path');
const fs = require('fs');
const DeploymentConfig = require('../config/deployment-config');

class GitWorkflowDeploymentValidator {
  constructor() {
    this.deploymentConfig = new DeploymentConfig();
    this.validationResults = {
      passed: 0,
      failed: 0,
      warnings: 0,
      errors: []
    };
  }

  /**
   * Run all validation checks
   */
  async validate() {
    console.log('🔍 Starting Git Workflow Deployment Validation...\n');

    try {
      // Validate configuration
      await this.validateConfiguration();
      
      // Validate file structure
      await this.validateFileStructure();
      
      // Validate dependencies
      await this.validateDependencies();
      
      // Validate integration points
      await this.validateIntegrationPoints();
      
      // Validate environment variables
      await this.validateEnvironmentVariables();
      
      // Validate database schema
      await this.validateDatabaseSchema();
      
      // Validate security configuration
      await this.validateSecurityConfiguration();
      
      // Validate performance configuration
      await this.validatePerformanceConfiguration();
      
      // Validate monitoring setup
      await this.validateMonitoringSetup();
      
      // Generate validation report
      this.generateValidationReport();
      
    } catch (error) {
      console.error('❌ Validation failed with error:', error.message);
      process.exit(1);
    }
  }

  /**
   * Validate deployment configuration
   */
  async validateConfiguration() {
    console.log('📋 Validating deployment configuration...');
    
    const environments = ['development', 'staging', 'production'];
    
    for (const env of environments) {
      try {
        const config = this.deploymentConfig.getConfigForEnv(env);
        
        // Validate git workflow configuration exists
        if (!config.gitWorkflow) {
          this.addError(`Git workflow configuration missing for ${env} environment`);
          continue;
        }
        
        // Validate required git workflow settings
        const requiredSettings = [
          'enabled',
          'autoMerge',
          'createPullRequests',
          'requireReview',
          'mergeStrategy',
          'branchStrategies',
          'metrics',
          'audit'
        ];
        
        for (const setting of requiredSettings) {
          if (!(setting in config.gitWorkflow)) {
            this.addError(`Missing git workflow setting: ${setting} in ${env} environment`);
          }
        }
        
        // Validate branch strategies
        const requiredStrategies = ['feature', 'bug', 'refactor'];
        for (const strategy of requiredStrategies) {
          if (!config.gitWorkflow.branchStrategies[strategy]) {
            this.addError(`Missing branch strategy: ${strategy} in ${env} environment`);
          }
        }
        
        // Validate metrics configuration
        if (config.gitWorkflow.metrics.enabled && !config.gitWorkflow.metrics.collectionInterval) {
          this.addError(`Missing metrics collection interval in ${env} environment`);
        }
        
        // Validate audit configuration
        if (config.gitWorkflow.audit.enabled && !config.gitWorkflow.audit.retentionDays) {
          this.addError(`Missing audit retention days in ${env} environment`);
        }
        
        this.addPass(`Configuration validation passed for ${env} environment`);
        
      } catch (error) {
        this.addError(`Configuration validation failed for ${env} environment: ${error.message}`);
      }
    }
  }

  /**
   * Validate file structure
   */
  async validateFileStructure() {
    console.log('📁 Validating file structure...');
    
    const requiredFiles = [
      'backend/domain/workflows/git/GitWorkflowManager.js',
      'backend/domain/workflows/git/GitWorkflowContext.js',
      'backend/domain/workflows/git/GitWorkflowResult.js',
      'backend/domain/workflows/git/BranchStrategy.js',
      'backend/domain/workflows/git/MergeStrategy.js',
      'backend/domain/workflows/git/PullRequestManager.js',
      'backend/domain/workflows/git/AutoReviewService.js',
      'backend/domain/workflows/git/GitWorkflowValidator.js',
      'backend/domain/workflows/git/GitWorkflowMetrics.js',
      'backend/domain/workflows/git/GitWorkflowAudit.js',
      'backend/domain/workflows/git/strategies/FeatureBranchStrategy.js',
      'backend/domain/workflows/git/strategies/HotfixBranchStrategy.js',
      'backend/domain/workflows/git/strategies/ReleaseBranchStrategy.js',
      'backend/domain/workflows/git/exceptions/GitWorkflowException.js',
      'backend/domain/workflows/git/index.js',
      'backend/tests/unit/workflows/git/GitWorkflowManager.test.js',
      'backend/tests/integration/workflows/git/GitWorkflowIntegration.test.js',
      'backend/tests/e2e/git-workflow-e2e.test.js',
      'docs/08_reference/api/git-workflow-api.md',
      'docs/03_features/enhanced-git-workflow-guide.md'
    ];
    
    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        this.addPass(`File exists: ${file}`);
      } else {
        this.addError(`Missing required file: ${file}`);
      }
    }
  }

  /**
   * Validate dependencies
   */
  async validateDependencies() {
    console.log('📦 Validating dependencies...');
    
    try {
      // Check if required modules can be loaded
      const requiredModules = [
        '../domain/workflows/git/GitWorkflowManager',
        '../domain/workflows/git/GitWorkflowContext',
        '../domain/workflows/git/GitWorkflowResult',
        '../domain/workflows/git/exceptions/GitWorkflowException'
      ];
      
      for (const module of requiredModules) {
        try {
          require(module);
          this.addPass(`Module loaded successfully: ${module}`);
        } catch (error) {
          this.addError(`Failed to load module ${module}: ${error.message}`);
        }
      }
      
      // Validate package.json dependencies
      const packageJsonPath = path.join(__dirname, '../../package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        const requiredDependencies = [
          'uuid',
          'jest',
          'express',
          'cors'
        ];
        
        for (const dep of requiredDependencies) {
          if (packageJson.dependencies && packageJson.dependencies[dep]) {
            this.addPass(`Dependency found: ${dep}`);
          } else if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
            this.addPass(`Dev dependency found: ${dep}`);
          } else {
            this.addWarning(`Dependency not found: ${dep}`);
          }
        }
      } else {
        this.addError('package.json not found');
      }
      
    } catch (error) {
      this.addError(`Dependency validation failed: ${error.message}`);
    }
  }

  /**
   * Validate integration points
   */
  async validateIntegrationPoints() {
    console.log('🔗 Validating integration points...');
    
    const integrationFiles = [
      'backend/domain/services/WorkflowGitService.js',
      'backend/domain/services/WorkflowOrchestrationService.js',
      'backend/domain/services/TaskService.js',
      'backend/domain/services/auto-finish/AutoFinishSystem.js'
    ];
    
    for (const file of integrationFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for GitWorkflowManager import
        if (content.includes('GitWorkflowManager')) {
          this.addPass(`GitWorkflowManager integration found in: ${file}`);
        } else {
          this.addWarning(`GitWorkflowManager integration not found in: ${file}`);
        }
        
        // Check for GitWorkflowContext import
        if (content.includes('GitWorkflowContext')) {
          this.addPass(`GitWorkflowContext integration found in: ${file}`);
        } else {
          this.addWarning(`GitWorkflowContext integration not found in: ${file}`);
        }
        
        // Check for enhanced method calls
        if (content.includes('gitWorkflowManager')) {
          this.addPass(`Enhanced git workflow usage found in: ${file}`);
        } else {
          this.addWarning(`Enhanced git workflow usage not found in: ${file}`);
        }
        
      } else {
        this.addError(`Integration file not found: ${file}`);
      }
    }
  }

  /**
   * Validate environment variables
   */
  async validateEnvironmentVariables() {
    console.log('🌍 Validating environment variables...');
    
    const requiredEnvVars = [
      'NODE_ENV',
      'DB_HOST',
      'DB_PORT',
      'DB_NAME',
      'DB_USER',
      'DB_PASSWORD',
      'JWT_SECRET'
    ];
    
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        this.addPass(`Environment variable set: ${envVar}`);
      } else {
        this.addWarning(`Environment variable not set: ${envVar}`);
      }
    }
    
    // Validate git-specific environment variables
    const gitEnvVars = [
      'GIT_USERNAME',
      'GIT_EMAIL',
      'GITHUB_TOKEN',
      'GITLAB_TOKEN'
    ];
    
    for (const envVar of gitEnvVars) {
      if (process.env[envVar]) {
        this.addPass(`Git environment variable set: ${envVar}`);
      } else {
        this.addWarning(`Git environment variable not set: ${envVar}`);
      }
    }
  }

  /**
   * Validate database schema
   */
  async validateDatabaseSchema() {
    console.log('🗄️ Validating database schema...');
    
    // Check if database migration files exist
    const migrationFiles = [
      'database/init.sql',
      'database/seed.sql'
    ];
    
    for (const file of migrationFiles) {
      if (fs.existsSync(file)) {
        this.addPass(`Database file exists: ${file}`);
      } else {
        this.addWarning(`Database file not found: ${file}`);
      }
    }
    
    // Check for git workflow related tables
    const schemaFiles = [
      'database/init.sql'
    ];
    
    for (const file of schemaFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for git workflow related tables
        const gitWorkflowTables = [
          'git_workflows',
          'git_branches',
          'git_pull_requests',
          'git_workflow_metrics',
          'git_workflow_audit'
        ];
        
        for (const table of gitWorkflowTables) {
          if (content.toLowerCase().includes(table.toLowerCase())) {
            this.addPass(`Git workflow table found: ${table}`);
          } else {
            this.addWarning(`Git workflow table not found: ${table}`);
          }
        }
      }
    }
  }

  /**
   * Validate security configuration
   */
  async validateSecurityConfiguration() {
    console.log('🔒 Validating security configuration...');
    
    const environments = ['development', 'staging', 'production'];
    
    for (const env of environments) {
      const config = this.deploymentConfig.getConfigForEnv(env);
      
      // Validate JWT secret
      if (config.security.jwtSecret && config.security.jwtSecret !== 'dev-secret-key-change-in-production') {
        this.addPass(`JWT secret configured for ${env} environment`);
      } else {
        this.addWarning(`JWT secret not properly configured for ${env} environment`);
      }
      
      // Validate CORS configuration
      if (config.security.cors && config.security.cors.origin) {
        this.addPass(`CORS configured for ${env} environment`);
      } else {
        this.addWarning(`CORS not configured for ${env} environment`);
      }
      
      // Validate rate limiting
      if (config.security.rateLimit && config.security.rateLimit.max) {
        this.addPass(`Rate limiting configured for ${env} environment`);
      } else {
        this.addWarning(`Rate limiting not configured for ${env} environment`);
      }
    }
  }

  /**
   * Validate performance configuration
   */
  async validatePerformanceConfiguration() {
    console.log('⚡ Validating performance configuration...');
    
    const environments = ['development', 'staging', 'production'];
    
    for (const env of environments) {
      const config = this.deploymentConfig.getConfigForEnv(env);
      
      // Validate git workflow performance settings
      if (config.gitWorkflow && config.gitWorkflow.metrics) {
        if (config.gitWorkflow.metrics.collectionInterval) {
          this.addPass(`Metrics collection interval configured for ${env} environment`);
        } else {
          this.addWarning(`Metrics collection interval not configured for ${env} environment`);
        }
      }
      
      // Validate monitoring configuration
      if (config.monitoring && config.monitoring.enabled) {
        this.addPass(`Monitoring enabled for ${env} environment`);
      } else {
        this.addWarning(`Monitoring not enabled for ${env} environment`);
      }
    }
  }

  /**
   * Validate monitoring setup
   */
  async validateMonitoringSetup() {
    console.log('📊 Validating monitoring setup...');
    
    const environments = ['development', 'staging', 'production'];
    
    for (const env of environments) {
      const config = this.deploymentConfig.getConfigForEnv(env);
      
      // Validate metrics configuration
      if (config.monitoring && config.monitoring.metrics && config.monitoring.metrics.enabled) {
        this.addPass(`Metrics enabled for ${env} environment`);
      } else {
        this.addWarning(`Metrics not enabled for ${env} environment`);
      }
      
      // Validate health checks
      if (config.monitoring && config.monitoring.healthChecks && config.monitoring.healthChecks.enabled) {
        this.addPass(`Health checks enabled for ${env} environment`);
      } else {
        this.addWarning(`Health checks not enabled for ${env} environment`);
      }
      
      // Validate git workflow audit
      if (config.gitWorkflow && config.gitWorkflow.audit && config.gitWorkflow.audit.enabled) {
        this.addPass(`Git workflow audit enabled for ${env} environment`);
      } else {
        this.addWarning(`Git workflow audit not enabled for ${env} environment`);
      }
    }
  }

  /**
   * Add pass result
   */
  addPass(message) {
    this.validationResults.passed++;
    console.log(`✅ ${message}`);
  }

  /**
   * Add warning result
   */
  addWarning(message) {
    this.validationResults.warnings++;
    console.log(`⚠️ ${message}`);
  }

  /**
   * Add error result
   */
  addError(message) {
    this.validationResults.failed++;
    this.validationResults.errors.push(message);
    console.log(`❌ ${message}`);
  }

  /**
   * Generate validation report
   */
  generateValidationReport() {
    console.log('\n📋 Validation Report');
    console.log('==================');
    console.log(`✅ Passed: ${this.validationResults.passed}`);
    console.log(`⚠️ Warnings: ${this.validationResults.warnings}`);
    console.log(`❌ Failed: ${this.validationResults.failed}`);
    
    if (this.validationResults.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.validationResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    console.log('\n🎯 Deployment Readiness:');
    if (this.validationResults.failed === 0) {
      console.log('✅ READY FOR DEPLOYMENT');
      console.log('All critical validations passed. The enhanced git workflow system is ready for deployment.');
    } else if (this.validationResults.failed <= 3) {
      console.log('⚠️ DEPLOYMENT READY WITH WARNINGS');
      console.log('Some non-critical validations failed. Review warnings before deployment.');
    } else {
      console.log('❌ NOT READY FOR DEPLOYMENT');
      console.log('Critical validations failed. Fix errors before deployment.');
      process.exit(1);
    }
    
    console.log('\n📈 Recommendations:');
    if (this.validationResults.warnings > 0) {
      console.log('- Review and address warnings for optimal configuration');
    }
    if (this.validationResults.failed === 0) {
      console.log('- Consider running integration tests before deployment');
      console.log('- Monitor system performance after deployment');
      console.log('- Set up alerting for git workflow metrics');
    }
  }
}

// Run validation if script is executed directly
if (require.main === module) {
  const validator = new GitWorkflowDeploymentValidator();
  validator.validate().catch(error => {
    console.error('Validation script failed:', error);
    process.exit(1);
  });
}

module.exports = GitWorkflowDeploymentValidator; 