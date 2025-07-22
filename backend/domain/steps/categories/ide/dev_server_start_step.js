/**
 * Dev Server Start Step
 * Starts the development server for the project
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('DevServerStartStep');

// Step configuration
const config = {
      name: 'DevServerStartStep',
  type: 'ide',
  category: 'ide',
      description: 'Start development server for the project',
  version: '1.0.0',
  dependencies: ['projectRepository', 'terminalService'],
      settings: {
        includeStatusCheck: true,
        includeErrorHandling: true,
        includePortDetection: true,
        timeout: 30000
  },
  validation: {
    required: ['projectId'],
    optional: ['workspacePath']
  }
};

class DevServerStartStep {
  constructor() {
    this.name = 'DevServerStartStep';
    this.description = 'Start development server for the project';
    this.category = 'ide';
    this.dependencies = ['projectRepository', 'terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = DevServerStartStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectId, workspacePath } = context;
      
      logger.info(`🚀 Starting dev server for project ${projectId}`);
      
      // Get project configuration from database
      const projectRepo = new (require('@domain/repositories/ProjectRepository'))();
      const project = await projectRepo.findById(projectId);
      
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }
      
      // Get dev command from project config
      const devCommand = project.dev_command || 'npm run dev';
      const packageManager = project.package_manager || 'npm';
      
      logger.info(`📦 Using package manager: ${packageManager}`);
      logger.info(`🔧 Dev command: ${devCommand}`);
      
      // Check if dev server is already running
      if (config.settings.includeStatusCheck) {
        const isRunning = await this.checkDevServerStatus(project);
        if (isRunning) {
          logger.info('✅ Dev server is already running');
          return {
            success: true,
            message: 'Dev server already running',
            data: {
              status: 'running',
              port: project.frontend_port || project.backend_port,
              command: devCommand
            }
          };
        }
      }
      
      // Start dev server
      const terminalService = new (require('@domain/services/TerminalService'))();
      const result = await terminalService.executeCommand(devCommand, {
        cwd: workspacePath,
        timeout: config.settings.timeout,
        env: {
          ...process.env,
          NODE_ENV: 'development'
        }
      });
      
      if (result.success) {
        logger.info('✅ Dev server started successfully');
        
        // Detect port if enabled
        let detectedPort = null;
        if (config.settings.includePortDetection) {
          detectedPort = await this.detectDevServerPort(project, workspacePath);
        }
        
        return {
          success: true,
          message: 'Dev server started successfully',
          data: {
            status: 'started',
            port: detectedPort || project.frontend_port || project.backend_port,
            command: devCommand,
            output: result.output
          }
        };
      } else {
        throw new Error(`Failed to start dev server: ${result.error}`);
      }
      
    } catch (error) {
      logger.error('❌ Failed to start dev server:', error);
      
      if (config.settings.includeErrorHandling) {
        return {
          success: false,
          message: 'Failed to start dev server',
          error: error.message,
          data: {
            status: 'error',
            command: context.devCommand || 'npm run dev'
          }
        };
      }
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async checkDevServerStatus(project) {
    try {
      const port = project.frontend_port || project.backend_port;
      if (!port) return false;
      
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      // Check if port is in use
      const { stdout } = await execAsync(`lsof -i :${port}`);
      return stdout.trim().length > 0;
      
    } catch (error) {
      return false;
    }
  }

  async detectDevServerPort(project, workspacePath) {
    try {
      // Try to detect port from common dev server outputs
      const commonPorts = [3000, 3001, 4000, 4001, 5000, 5001, 8080, 8081];
      
      for (const port of commonPorts) {
        const isInUse = await this.checkPortInUse(port);
        if (isInUse) {
          return port;
        }
      }
      
      return null;
    } catch (error) {
      logger.warn('Could not detect dev server port:', error.message);
      return null;
    }
  }

  async checkPortInUse(port) {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      const { stdout } = await execAsync(`lsof -i :${port}`);
      return stdout.trim().length > 0;
    } catch (error) {
      return false;
    }
  }

  validateContext(context) {
    if (!context.projectId) {
      throw new Error('Project ID is required');
    }
  }
}

// Create instance for execution
const stepInstance = new DevServerStartStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 