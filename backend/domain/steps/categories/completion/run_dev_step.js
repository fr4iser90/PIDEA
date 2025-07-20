/**
 * Run Dev Server Step
 * Starts the development server for the project
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('run_dev_step');

// Step configuration
const config = {
  name: 'RUN_DEV_STEP',
  type: 'completion',
  category: 'completion',
  description: 'Starts the development server',
  version: '1.0.0',
  dependencies: ['terminalService'],
  settings: {
    timeout: 30000,
    port: 3000,
    host: 'localhost',
    env: 'development'
  },
  validation: {
    required: ['projectPath'],
    optional: ['port', 'host', 'env']
  }
};

class RunDevStep {
  constructor() {
    this.name = 'RUN_DEV_STEP';
    this.description = 'Starts the development server';
    this.category = 'completion';
    this.dependencies = ['terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = RunDevStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectPath, port = 3000, host = 'localhost', env = 'development' } = context;
      
      logger.info('Executing RUN_DEV_STEP', {
        projectPath,
        port,
        host,
        env
      });

      // Get TerminalService from global application (like old steps)
      const application = global.application;
      if (!application) {
        throw new Error('Application not available');
      }

      const { terminalService } = application;
      if (!terminalService) {
        throw new Error('TerminalService not available');
      }

      // Start dev server
      const command = `npm run dev`;
      const result = await terminalService.executeCommand(command, {
        cwd: projectPath,
        env: {
          ...process.env,
          NODE_ENV: env,
          PORT: port,
          HOST: host
        }
      });

      logger.info('RUN_DEV_STEP completed successfully', {
        success: result.success,
        output: result.output?.substring(0, 200) + '...'
      });

      return {
        success: result.success,
        command,
        output: result.output,
        error: result.error,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('RUN_DEV_STEP failed', {
        error: error.message,
        context
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required');
    }
  }
}

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => {
    const stepInstance = new RunDevStep();
    return await stepInstance.execute(context);
  }
};
