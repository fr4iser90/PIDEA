const { BaseStep } = require('@/domain/steps/BaseStep');
const { ProjectRepository } = require('@/domain/repositories/ProjectRepository');
const { TerminalService } = require('@/domain/services/TerminalService');
const logger = require('@/infrastructure/logging/logger');

class DevServerStopStep extends BaseStep {
  constructor() {
    super({
      name: 'DevServerStopStep',
      description: 'Stop development server for the project',
      category: 'ide',
      settings: {
        includeForceKill: false,
        includePortCheck: true,
        includeProcessCleanup: true,
        timeout: 10000
      }
    });
  }

  async execute(context) {
    try {
      const { projectId, workspacePath } = context;
      
      logger.info(`🛑 Stopping dev server for project ${projectId}`);
      
      // 1. Get project configuration from database
      const projectRepo = new ProjectRepository();
      const project = await projectRepo.findById(projectId);
      
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }
      
      // 2. Check if dev server is running
      const isRunning = await this.checkDevServerStatus(project);
      if (!isRunning) {
        logger.info('ℹ️ Dev server is not running');
        return {
          success: true,
          message: 'Dev server not running',
          data: {
            status: 'stopped',
            port: project.frontend_port || project.backend_port
          }
        };
      }
      
      // 3. Get port information
      const port = project.frontend_port || project.backend_port;
      if (!port) {
        throw new Error('No port configured for project');
      }
      
      logger.info(`🔍 Stopping dev server on port ${port}`);
      
      // 4. Stop dev server by killing process on port
      const result = await this.stopDevServerOnPort(port);
      
      if (result.success) {
        logger.info('✅ Dev server stopped successfully');
        
        // 5. Cleanup processes if enabled
        if (this.settings.includeProcessCleanup) {
          await this.cleanupDevProcesses(workspacePath);
        }
        
        return {
          success: true,
          message: 'Dev server stopped successfully',
          data: {
            status: 'stopped',
            port: port,
            processesKilled: result.processesKilled
          }
        };
      } else {
        throw new Error(`Failed to stop dev server: ${result.error}`);
      }
      
    } catch (error) {
      logger.error('❌ Failed to stop dev server:', error);
      
      return {
        success: false,
        message: 'Failed to stop dev server',
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

  async stopDevServerOnPort(port) {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      // Find processes using the port
      const { stdout } = await execAsync(`lsof -ti :${port}`);
      const pids = stdout.trim().split('\n').filter(pid => pid.length > 0);
      
      if (pids.length === 0) {
        return {
          success: true,
          processesKilled: 0,
          message: 'No processes found on port'
        };
      }
      
      logger.info(`🔍 Found ${pids.length} process(es) on port ${port}: ${pids.join(', ')}`);
      
      // Kill processes
      let killedCount = 0;
      for (const pid of pids) {
        try {
          const signal = this.settings.includeForceKill ? 'KILL' : 'TERM';
          await execAsync(`kill -${signal} ${pid}`);
          killedCount++;
          logger.info(`✅ Killed process ${pid} with signal ${signal}`);
        } catch (error) {
          logger.warn(`⚠️ Failed to kill process ${pid}: ${error.message}`);
        }
      }
      
      // Wait a bit for processes to terminate
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify processes are stopped
      const { stdout: checkStdout } = await execAsync(`lsof -ti :${port}`);
      const remainingPids = checkStdout.trim().split('\n').filter(pid => pid.length > 0);
      
      if (remainingPids.length > 0 && this.settings.includeForceKill) {
        // Force kill remaining processes
        for (const pid of remainingPids) {
          try {
            await execAsync(`kill -KILL ${pid}`);
            killedCount++;
            logger.info(`💀 Force killed process ${pid}`);
          } catch (error) {
            logger.warn(`⚠️ Failed to force kill process ${pid}: ${error.message}`);
          }
        }
      }
      
      return {
        success: remainingPids.length === 0,
        processesKilled: killedCount,
        remainingPids: remainingPids
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        processesKilled: 0
      };
    }
  }

  async cleanupDevProcesses(workspacePath) {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      // Kill common dev server processes
      const commonProcesses = [
        'node.*dev',
        'npm.*dev',
        'yarn.*dev',
        'pnpm.*dev',
        'nodemon',
        'webpack.*serve',
        'vite'
      ];
      
      let cleanedCount = 0;
      for (const pattern of commonProcesses) {
        try {
          const { stdout } = await execAsync(`pkill -f "${pattern}"`);
          if (stdout) {
            cleanedCount++;
            logger.info(`🧹 Cleaned up process: ${pattern}`);
          }
        } catch (error) {
          // Process not found is expected
        }
      }
      
      logger.info(`🧹 Cleaned up ${cleanedCount} dev processes`);
      
    } catch (error) {
      logger.warn('⚠️ Process cleanup failed:', error.message);
    }
  }
}

module.exports = DevServerStopStep; 