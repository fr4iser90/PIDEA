const { BaseStep } = require('@/domain/steps/BaseStep');
const { ProjectRepository } = require('@/domain/repositories/ProjectRepository');
const { TerminalService } = require('@/domain/services/TerminalService');
const logger = require('@/infrastructure/logging/logger');

class DevServerStartStep extends BaseStep {
  constructor() {
    super({
      name: 'DevServerStartStep',
      description: 'Start development server for the project',
      category: 'ide',
      settings: {
        includeStatusCheck: true,
        includeErrorHandling: true,
        includePortDetection: true,
        timeout: 30000
      }
    });
  }

  async execute(context) {
    try {
      const { projectId, workspacePath } = context;
      
      logger.info(`🚀 Starting dev server for project ${projectId}`);
      
      // 1. Get project configuration from database
      const projectRepo = new ProjectRepository();
      const project = await projectRepo.findById(projectId);
      
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }
      
      // 2. Get dev command from project config
      const devCommand = project.dev_command || 'npm run dev';
      const packageManager = project.package_manager || 'npm';
      
      logger.info(`📦 Using package manager: ${packageManager}`);
      logger.info(`🔧 Dev command: ${devCommand}`);
      
      // 3. Check if dev server is already running
      if (this.settings.includeStatusCheck) {
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
      
      // 4. Start dev server
      const terminalService = new TerminalService();
      const result = await terminalService.executeCommand(devCommand, {
        cwd: workspacePath,
        timeout: this.settings.timeout,
        env: {
          ...process.env,
          NODE_ENV: 'development'
        }
      });
      
      if (result.success) {
        logger.info('✅ Dev server started successfully');
        
        // 5. Detect port if enabled
        let detectedPort = null;
        if (this.settings.includePortDetection) {
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
      
      if (this.settings.includeErrorHandling) {
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
      
      throw error;
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
}

module.exports = DevServerStartStep; 