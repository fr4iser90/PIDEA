/**
 * DeploymentStep - Deployment workflow step
 * Performs deployment tasks including application deployment, configuration management, and environment setup
 */
const BaseWorkflowStep = require('./BaseWorkflowStep');

/**
 * Deployment workflow step
 */
class DeploymentStep extends BaseWorkflowStep {
  constructor(deploymentType = 'application-deployment', options = {}) {
    super('DeploymentStep', `Performs ${deploymentType} deployment`, 'deployment');
    this._deploymentType = deploymentType;
    this._options = { ...options };
  }

  /**
   * Execute deployment step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Deployment result
   */
  async executeStep(context) {
    const projectPath = context.get('projectPath');
    const deploymentService = context.get('deploymentService');
    const dockerService = context.get('dockerService');
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }
    
    if (!deploymentService && !dockerService) {
      throw new Error('Deployment service or docker service not found in context');
    }

    // Perform deployment based on type
    switch (this._deploymentType) {
      case 'application-deployment':
        return await this._deployApplication(context, projectPath);
      case 'docker-deployment':
        return await this._deployDocker(context, projectPath);
      case 'kubernetes-deployment':
        return await this._deployKubernetes(context, projectPath);
      case 'cloud-deployment':
        return await this._deployCloud(context, projectPath);
      case 'configuration-deployment':
        return await this._deployConfiguration(context, projectPath);
      case 'database-deployment':
        return await this._deployDatabase(context, projectPath);
      case 'environment-setup':
        return await this._setupEnvironment(context, projectPath);
      case 'rollback-deployment':
        return await this._rollbackDeployment(context, projectPath);
      default:
        throw new Error(`Unknown deployment type: ${this._deploymentType}`);
    }
  }

  /**
   * Deploy application
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Application deployment result
   */
  async _deployApplication(context, projectPath) {
    const deploymentService = context.get('deploymentService');
    const scriptExecutor = context.get('scriptExecutor');
    
    if (deploymentService) {
      return await deploymentService.deployApplication(projectPath, this._options);
    } else {
      // Fallback to script executor
      const deployCommand = this._options.deployCommand || 'npm run deploy';
      return await scriptExecutor.executeCommand(deployCommand, { cwd: projectPath });
    }
  }

  /**
   * Deploy Docker
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Docker deployment result
   */
  async _deployDocker(context, projectPath) {
    const dockerService = context.get('dockerService');
    const deploymentService = context.get('deploymentService');
    
    if (dockerService) {
      return await dockerService.deployDocker(projectPath, this._options);
    } else if (deploymentService) {
      return await deploymentService.deployDocker(projectPath, this._options);
    } else {
      throw new Error('Docker service or deployment service required for Docker deployment');
    }
  }

  /**
   * Deploy Kubernetes
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Kubernetes deployment result
   */
  async _deployKubernetes(context, projectPath) {
    const kubernetesService = context.get('kubernetesService');
    const deploymentService = context.get('deploymentService');
    
    if (kubernetesService) {
      return await kubernetesService.deployKubernetes(projectPath, this._options);
    } else if (deploymentService) {
      return await deploymentService.deployKubernetes(projectPath, this._options);
    } else {
      throw new Error('Kubernetes service or deployment service required for Kubernetes deployment');
    }
  }

  /**
   * Deploy to cloud
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Cloud deployment result
   */
  async _deployCloud(context, projectPath) {
    const cloudService = context.get('cloudService');
    const deploymentService = context.get('deploymentService');
    
    if (cloudService) {
      return await cloudService.deployCloud(projectPath, this._options);
    } else if (deploymentService) {
      return await deploymentService.deployCloud(projectPath, this._options);
    } else {
      throw new Error('Cloud service or deployment service required for cloud deployment');
    }
  }

  /**
   * Deploy configuration
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Configuration deployment result
   */
  async _deployConfiguration(context, projectPath) {
    const configurationService = context.get('configurationService');
    const deploymentService = context.get('deploymentService');
    
    if (configurationService) {
      return await configurationService.deployConfiguration(projectPath, this._options);
    } else if (deploymentService) {
      return await deploymentService.deployConfiguration(projectPath, this._options);
    } else {
      throw new Error('Configuration service or deployment service required for configuration deployment');
    }
  }

  /**
   * Deploy database
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Database deployment result
   */
  async _deployDatabase(context, projectPath) {
    const databaseService = context.get('databaseService');
    const deploymentService = context.get('deploymentService');
    
    if (databaseService) {
      return await databaseService.deployDatabase(projectPath, this._options);
    } else if (deploymentService) {
      return await deploymentService.deployDatabase(projectPath, this._options);
    } else {
      throw new Error('Database service or deployment service required for database deployment');
    }
  }

  /**
   * Setup environment
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Environment setup result
   */
  async _setupEnvironment(context, projectPath) {
    const environmentService = context.get('environmentService');
    const deploymentService = context.get('deploymentService');
    
    if (environmentService) {
      return await environmentService.setupEnvironment(projectPath, this._options);
    } else if (deploymentService) {
      return await deploymentService.setupEnvironment(projectPath, this._options);
    } else {
      throw new Error('Environment service or deployment service required for environment setup');
    }
  }

  /**
   * Rollback deployment
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Deployment rollback result
   */
  async _rollbackDeployment(context, projectPath) {
    const deploymentService = context.get('deploymentService');
    const rollbackService = context.get('rollbackService');
    
    if (deploymentService) {
      return await deploymentService.rollbackDeployment(projectPath, this._options);
    } else if (rollbackService) {
      return await rollbackService.rollbackDeployment(projectPath, this._options);
    } else {
      throw new Error('Deployment service or rollback service required for deployment rollback');
    }
  }

  /**
   * Get deployment type
   * @returns {string} Deployment type
   */
  getDeploymentType() {
    return this._deploymentType;
  }

  /**
   * Set deployment type
   * @param {string} deploymentType - Deployment type
   */
  setDeploymentType(deploymentType) {
    this._deploymentType = deploymentType;
  }

  /**
   * Get deployment options
   * @returns {Object} Deployment options
   */
  getOptions() {
    return { ...this._options };
  }

  /**
   * Set deployment options
   * @param {Object} options - Deployment options
   */
  setOptions(options) {
    this._options = { ...this._options, ...options };
  }

  /**
   * Get step metadata
   * @returns {Object} Step metadata
   */
  getMetadata() {
    return {
      ...super.getMetadata(),
      deploymentType: this._deploymentType,
      options: this._options
    };
  }

  /**
   * Validate deployment step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validate(context) {
    const baseValidation = await super.validate(context);
    
    if (!baseValidation.isValid) {
      return baseValidation;
    }

    // Check if project path exists
    const projectPath = context.get('projectPath');
    if (!projectPath) {
      return new ValidationResult(false, ['Project path is required for deployment']);
    }

    // Check if required service is available
    const deploymentService = context.get('deploymentService');
    const dockerService = context.get('dockerService');
    
    if (!deploymentService && !dockerService) {
      return new ValidationResult(false, ['Deployment service or docker service is required for deployment']);
    }

    // Validate deployment type
    const validTypes = [
      'application-deployment', 'docker-deployment', 'kubernetes-deployment',
      'cloud-deployment', 'configuration-deployment', 'database-deployment',
      'environment-setup', 'rollback-deployment'
    ];

    if (!validTypes.includes(this._deploymentType)) {
      return new ValidationResult(false, [`Invalid deployment type: ${this._deploymentType}`]);
    }

    return new ValidationResult(true, []);
  }

  /**
   * Rollback deployment step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Rollback result
   */
  async rollback(context) {
    const deploymentService = context.get('deploymentService');
    const rollbackService = context.get('rollbackService');
    const projectPath = context.get('projectPath');
    
    if ((deploymentService || rollbackService) && projectPath) {
      try {
        if (deploymentService) {
          await deploymentService.rollbackDeployment(projectPath, this._options);
        } else {
          await rollbackService.rollbackDeployment(projectPath, this._options);
        }
        return {
          success: true,
          stepName: this._name,
          message: 'Deployment step rollback completed via deployment service'
        };
      } catch (error) {
        return {
          success: false,
          stepName: this._name,
          error: `Deployment rollback failed: ${error.message}`
        };
      }
    }

    return {
      success: true,
      stepName: this._name,
      message: 'Deployment step rollback completed (manual intervention may be required)'
    };
  }

  /**
   * Clone deployment step
   * @returns {DeploymentStep} Cloned step
   */
  clone() {
    const clonedStep = new DeploymentStep(this._deploymentType, this._options);
    clonedStep._metadata = { ...this._metadata };
    clonedStep._validationRules = [...this._validationRules];
    clonedStep._dependencies = [...this._dependencies];
    return clonedStep;
  }

  /**
   * Convert step to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      ...super.toJSON(),
      deploymentType: this._deploymentType,
      options: this._options
    };
  }

  /**
   * Create step from JSON
   * @param {Object} json - JSON representation
   * @returns {DeploymentStep} Step instance
   */
  static fromJSON(json) {
    const step = new DeploymentStep(json.deploymentType, json.options);
    step._metadata = json.metadata || {};
    step._dependencies = json.dependencies || [];
    return step;
  }
}

module.exports = DeploymentStep; 