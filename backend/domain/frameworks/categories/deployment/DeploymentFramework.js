const FrameworkBuilder = require('@frameworks/FrameworkBuilder');
const { logger } = require('@infrastructure/logging/Logger');


class DeploymentFramework {
  constructor() {
    this.name = 'DeploymentFramework';
    this.version = '1.0.0';
    this.description = 'Automated deployment framework for production releases';
    this.category = 'deployment';
  }

  static getConfig() {
    return {
      name: 'DeploymentFramework',
      version: '1.0.0',
      description: 'Automated deployment framework for production releases',
      category: 'deployment',
      steps: [
        {
          name: 'validate_deployment_ready',
          description: 'Validate that the application is ready for deployment',
          handler: 'DeploymentValidationHandler',
          dependencies: ['testRunner', 'qualityChecker']
        },
        {
          name: 'build_application',
          description: 'Build the application for production deployment',
          handler: 'BuildHandler',
          dependencies: ['buildTool', 'optimizer']
        },
        {
          name: 'deploy_to_staging',
          description: 'Deploy to staging environment for testing',
          handler: 'StagingDeploymentHandler',
          dependencies: ['deploymentTool', 'environmentManager']
        },
        {
          name: 'run_staging_tests',
          description: 'Run comprehensive tests in staging environment',
          handler: 'StagingTestHandler',
          dependencies: ['testRunner', 'monitoringTool']
        },
        {
          name: 'deploy_to_production',
          description: 'Deploy to production environment',
          handler: 'ProductionDeploymentHandler',
          dependencies: ['deploymentTool', 'rollbackManager']
        },
        {
          name: 'validate_production_deployment',
          description: 'Validate production deployment and health checks',
          handler: 'ProductionValidationHandler',
          dependencies: ['healthChecker', 'monitoringTool']
        }
      ],
      settings: {
        stagingRequired: true,
        rollbackEnabled: true,
        healthCheckTimeout: 300,
        deploymentTimeout: 1800
      },
      validation: {
        requiredDependencies: ['docker', 'kubernetes', 'helm'],
        supportedEnvironments: ['staging', 'production'],
        minNodeVersion: '14.0.0'
      }
    };
  }

  async execute(context = {}) {
    const config = DeploymentFramework.getConfig();
    const framework = FrameworkBuilder.build(config, context);
    
    try {
      logger.log(`🚀 Executing ${this.name}...`);
      
      const results = await framework.execute();
      
      logger.log(`✅ ${this.name} completed successfully`);
      return {
        success: true,
        framework: this.name,
        results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`❌ ${this.name} failed:`, error.message);
      return {
        success: false,
        framework: this.name,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  validateContext(context) {
    const required = ['projectPath', 'deploymentConfig', 'environmentConfig'];
    const missing = required.filter(key => !context[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required context: ${missing.join(', ')}`);
    }
    
    return true;
  }
}

module.exports = DeploymentFramework; 