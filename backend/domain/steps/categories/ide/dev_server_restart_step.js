/**
 * Dev Server Restart Step
 * Restarts the development server for the project
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('DevServerRestartStep');

// Step configuration
const config = {
      name: 'DevServerRestartStep',
  type: 'ide',
  category: 'ide',
      description: 'Restart development server for the project',
  version: '1.0.0',
  dependencies: ['projectRepository', 'terminalService'],
      settings: {
        includeStatusCheck: true,
    includeErrorHandling: true,
        timeout: 60000
  },
  validation: {
    required: ['projectId'],
    optional: ['workspacePath']
  }
};

class DevServerRestartStep {
  constructor() {
    this.name = 'DevServerRestartStep';
    this.description = 'Restart development server for the project';
    this.category = 'ide';
    this.dependencies = ['projectRepository', 'terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = DevServerRestartStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectId, workspacePath } = context;
      
      logger.info(`🔄 Restarting dev server for project ${projectId}`);
      
      // Get project configuration from database
      const projectRepo = context.projectRepository || context.getService?.('projectRepository') || global.application?.projectRepository;
      if (!projectRepo) {
        logger.warn('ProjectRepository not available in context, using basic dev server restart');
        // Continue without project repository for basic dev server restart
      }
      
      let project = null;
      if (projectRepo) {
        project = await projectRepo.findById(projectId);
      }
      
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }
      
      // Get dev command from project config
      const devCommand = project.dev_command || 'npm run dev';
      const packageManager = project.package_manager || 'npm';
      
      logger.info(`📦 Using package manager: ${packageManager}`);
      logger.info(`🔧 Dev command: ${devCommand}`);
      
      // Stop existing dev server first
      const stopResult = await this.stopDevServer(project);
      if (stopResult.success) {
        logger.info('✅ Existing dev server stopped');
        }
        
      // Wait a moment for processes to fully terminate
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Start dev server
      const terminalService = new (require('@domain/services/terminal/TerminalService'))();
      const result = await terminalService.executeCommand(devCommand, {
        cwd: workspacePath,
        timeout: config.settings.timeout,
        env: {
          ...process.env,
          NODE_ENV: 'development'
        }
      });
      
      if (result.success) {
        logger.info('✅ Dev server restarted successfully');
      
        // Detect port if enabled
        let detectedPort = null;
        if (config.settings.includeStatusCheck) {
          detectedPort = await this.detectDevServerPort(project, workspacePath);
        }
      
      return {
        success: true,
        message: 'Dev server restarted successfully',
        data: {
          status: 'restarted',
            port: detectedPort || project.frontend_port || project.backend_port,
          command: devCommand,
            output: result.output,
            stoppedProcesses: stopResult.killedProcesses || 0
        }
      };
      } else {
        throw new Error(`Failed to restart dev server: ${result.error}`);
      }
      
    } catch (error) {
      logger.error('❌ Failed to restart dev server:', error);
      
      if (config.settings.includeErrorHandling) {
        return {
          success: false,
          message: 'Failed to restart dev server',
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

  async stopDevServer(project) {
    try {
      const port = project.frontend_port || project.backend_port;
      if (!port) {
        return { success: true, killedProcesses: 0 };
      }
      
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      // Get PIDs using the port
      const { stdout } = await execAsync(`lsof -ti :${port}`);
      const pids = stdout.trim().split('\n').filter(pid => pid.length > 0);
      
      if (pids.length === 0) {
        return { success: true, killedProcesses: 0 };
      }
      
      // Kill processes
      const killedProcesses = [];
      for (const pid of pids) {
        try {
          await execAsync(`kill -9 ${pid}`);
          killedProcesses.push(pid);
        } catch (error) {
          logger.warn(`Failed to kill process ${pid}: ${error.message}`);
        }
      }
      
      return {
        success: true,
        killedProcesses: killedProcesses.length,
        pids: killedProcesses
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
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
const stepInstance = new DevServerRestartStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 