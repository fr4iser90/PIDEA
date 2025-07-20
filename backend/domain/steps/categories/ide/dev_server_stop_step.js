/**
 * Dev Server Stop Step
 * Stops the development server for the project
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('DevServerStopStep');

// Step configuration
const config = {
  name: 'DevServerStopStep',
  type: 'ide',
  category: 'ide',
  description: 'Stop development server for the project',
  version: '1.0.0',
  dependencies: ['projectRepository', 'terminalService'],
  settings: {
    includeStatusCheck: true,
    includeErrorHandling: true,
    timeout: 30000
  },
  validation: {
    required: ['projectId'],
    optional: ['workspacePath']
  }
};

class DevServerStopStep {
  constructor() {
    this.name = 'DevServerStopStep';
    this.description = 'Stop development server for the project';
    this.category = 'ide';
    this.dependencies = ['projectRepository', 'terminalService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = DevServerStopStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectId, workspacePath } = context;
      
      logger.info(`🛑 Stopping dev server for project ${projectId}`);
      
      // Get project configuration from database
      const projectRepo = new (require('@/domain/repositories/ProjectRepository'))();
      const project = await projectRepo.findById(projectId);
      
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }
      
      // Check if dev server is running
      if (config.settings.includeStatusCheck) {
      const isRunning = await this.checkDevServerStatus(project);
      if (!isRunning) {
          logger.info('✅ Dev server is not running');
        return {
          success: true,
          message: 'Dev server not running',
          data: {
              status: 'not_running',
            port: project.frontend_port || project.backend_port
          }
        };
        }
      }
      
      // Stop dev server by killing processes on the port
      const port = project.frontend_port || project.backend_port;
      if (port) {
        const result = await this.stopDevServer(port);
      
      if (result.success) {
        logger.info('✅ Dev server stopped successfully');
        return {
          success: true,
          message: 'Dev server stopped successfully',
          data: {
            status: 'stopped',
            port: port,
              killedProcesses: result.killedProcesses
          }
        };
      } else {
        throw new Error(`Failed to stop dev server: ${result.error}`);
        }
      } else {
        throw new Error('No port configured for project');
      }
      
    } catch (error) {
      logger.error('❌ Failed to stop dev server:', error);
      
      if (config.settings.includeErrorHandling) {
      return {
        success: false,
        message: 'Failed to stop dev server',
        error: error.message,
        data: {
          status: 'error'
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

  async stopDevServer(port) {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      // Get PIDs using the port
      const { stdout } = await execAsync(`lsof -ti :${port}`);
      const pids = stdout.trim().split('\n').filter(pid => pid.length > 0);
      
      if (pids.length === 0) {
        return {
          success: true,
          killedProcesses: 0,
          message: 'No processes found on port'
        };
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

  validateContext(context) {
    if (!context.projectId) {
      throw new Error('Project ID is required');
    }
  }
}

// Create instance for execution
const stepInstance = new DevServerStopStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 