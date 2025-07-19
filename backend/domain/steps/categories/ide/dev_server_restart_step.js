const { BaseStep } = require('@/domain/steps/BaseStep');
const { ProjectRepository } = require('@/domain/repositories/ProjectRepository');
const { TerminalService } = require('@/domain/services/TerminalService');
const logger = require('@/infrastructure/logging/logger');

class DevServerRestartStep extends BaseStep {
  constructor() {
    super({
      name: 'DevServerRestartStep',
      description: 'Restart development server for the project',
      category: 'ide',
      settings: {
        includeStatusCheck: true,
        includeWaitTime: 3000,
        includeHealthCheck: true,
        includeErrorRecovery: true,
        timeout: 60000
      }
    });
  }

  async execute(context) {
    try {
      const { projectId, workspacePath } = context;
      
      logger.info(`🔄 Restarting dev server for project ${projectId}`);
      
      // 1. Get project configuration from database
      const projectRepo = new ProjectRepository();
      const project = await projectRepo.findById(projectId);
      
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }
      
      const port = project.frontend_port || project.backend_port;
      const devCommand = project.dev_command || 'npm run dev';
      
      logger.info(`🔧 Dev command: ${devCommand}`);
      logger.info(`🌐 Port: ${port}`);
      
      // 2. Check current status
      let wasRunning = false;
      if (this.settings.includeStatusCheck) {
        wasRunning = await this.checkDevServerStatus(project);
        logger.info(`📊 Current status: ${wasRunning ? 'running' : 'stopped'}`);
      }
      
      // 3. Stop dev server if running
      if (wasRunning) {
        logger.info('🛑 Stopping existing dev server...');
        const stopResult = await this.stopDevServer(project, workspacePath);
        
        if (!stopResult.success) {
          logger.warn('⚠️ Failed to stop dev server, continuing anyway...');
        }
        
        // Wait before restarting
        if (this.settings.includeWaitTime > 0) {
          logger.info(`⏳ Waiting ${this.settings.includeWaitTime}ms before restart...`);
          await new Promise(resolve => setTimeout(resolve, this.settings.includeWaitTime));
        }
      }
      
      // 4. Start dev server
      logger.info('🚀 Starting dev server...');
      const startResult = await this.startDevServer(project, workspacePath);
      
      if (!startResult.success) {
        throw new Error(`Failed to start dev server: ${startResult.error}`);
      }
      
      // 5. Health check if enabled
      let healthStatus = null;
      if (this.settings.includeHealthCheck && port) {
        logger.info('🏥 Performing health check...');
        healthStatus = await this.performHealthCheck(port);
      }
      
      logger.info('✅ Dev server restarted successfully');
      
      return {
        success: true,
        message: 'Dev server restarted successfully',
        data: {
          status: 'restarted',
          wasRunning: wasRunning,
          port: port,
          command: devCommand,
          healthStatus: healthStatus,
          startResult: startResult.data
        }
      };
      
    } catch (error) {
      logger.error('❌ Failed to restart dev server:', error);
      
      if (this.settings.includeErrorRecovery) {
        logger.info('🔄 Attempting error recovery...');
        const recoveryResult = await this.attemptErrorRecovery(context);
        
        return {
          success: false,
          message: 'Failed to restart dev server, recovery attempted',
          error: error.message,
          recoveryAttempted: true,
          recoveryResult: recoveryResult,
          data: {
            status: 'error'
          }
        };
      }
      
      return {
        success: false,
        message: 'Failed to restart dev server',
        error: error.message,
        data: {
          status: 'error'
        }
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

  async stopDevServer(project, workspacePath) {
    try {
      const port = project.frontend_port || project.backend_port;
      if (!port) {
        return { success: true, message: 'No port configured' };
      }
      
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      // Find and kill processes on port
      const { stdout } = await execAsync(`lsof -ti :${port}`);
      const pids = stdout.trim().split('\n').filter(pid => pid.length > 0);
      
      if (pids.length === 0) {
        return { success: true, message: 'No processes to stop' };
      }
      
      let killedCount = 0;
      for (const pid of pids) {
        try {
          await execAsync(`kill -TERM ${pid}`);
          killedCount++;
        } catch (error) {
          logger.warn(`Failed to kill process ${pid}: ${error.message}`);
        }
      }
      
      // Wait for processes to terminate
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        success: true,
        processesKilled: killedCount
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async startDevServer(project, workspacePath) {
    try {
      const devCommand = project.dev_command || 'npm run dev';
      const packageManager = project.package_manager || 'npm';
      
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
        return {
          success: true,
          data: {
            command: devCommand,
            output: result.output
          }
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async performHealthCheck(port) {
    try {
      const http = require('http');
      
      return new Promise((resolve) => {
        const req = http.get(`http://localhost:${port}/health`, (res) => {
          resolve({
            status: res.statusCode,
            healthy: res.statusCode >= 200 && res.statusCode < 300
          });
        });
        
        req.on('error', () => {
          resolve({
            status: 'error',
            healthy: false
          });
        });
        
        req.setTimeout(5000, () => {
          req.destroy();
          resolve({
            status: 'timeout',
            healthy: false
          });
        });
      });
      
    } catch (error) {
      return {
        status: 'error',
        healthy: false,
        error: error.message
      };
    }
  }

  async attemptErrorRecovery(context) {
    try {
      const { projectId, workspacePath } = context;
      
      logger.info('🔄 Attempting error recovery...');
      
      // 1. Force kill all dev processes
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      const commonProcesses = [
        'node.*dev',
        'npm.*dev',
        'yarn.*dev',
        'pnpm.*dev',
        'nodemon',
        'webpack.*serve',
        'vite'
      ];
      
      for (const pattern of commonProcesses) {
        try {
          await execAsync(`pkill -f "${pattern}"`);
        } catch (error) {
          // Process not found is expected
        }
      }
      
      // 2. Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 3. Try to start again
      const projectRepo = new ProjectRepository();
      const project = await projectRepo.findById(projectId);
      
      if (project) {
        const terminalService = new TerminalService();
        const devCommand = project.dev_command || 'npm run dev';
        
        const result = await terminalService.executeCommand(devCommand, {
          cwd: workspacePath,
          timeout: 30000,
          env: {
            ...process.env,
            NODE_ENV: 'development'
          }
        });
        
        return {
          success: result.success,
          error: result.error,
          command: devCommand
        };
      }
      
      return {
        success: false,
        error: 'Project not found during recovery'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = DevServerRestartStep; 