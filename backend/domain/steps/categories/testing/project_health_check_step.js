const { BaseStep } = require('@/domain/steps/BaseStep');
const { ProjectRepository } = require('@/domain/repositories/ProjectRepository');
const logger = require('@/infrastructure/logging/logger');

class ProjectHealthCheckStep extends BaseStep {
  constructor() {
    super({
      name: 'ProjectHealthCheckStep',
      description: 'Check if project is running and healthy',
      category: 'testing',
      settings: {
        includePortCheck: true,
        includeHttpCheck: true,
        includeProcessCheck: true,
        includeResponseTime: true,
        timeout: 10000,
        retries: 3
      }
    });
  }

  async execute(context) {
    try {
      const { projectId, workspacePath } = context;
      
      logger.info(`🏥 Performing health check for project ${projectId}`);
      
      // 1. Get project configuration from database
      const projectRepo = new ProjectRepository();
      const project = await projectRepo.findById(projectId);
      
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }
      
      const healthResults = {
        projectId: projectId,
        projectName: project.name,
        overallStatus: 'unknown',
        checks: {},
        timestamp: new Date().toISOString()
      };
      
      // 2. Port availability check
      if (this.settings.includePortCheck) {
        healthResults.checks.portCheck = await this.checkPortAvailability(project);
      }
      
      // 3. Process check
      if (this.settings.includeProcessCheck) {
        healthResults.checks.processCheck = await this.checkProcessStatus(project);
      }
      
      // 4. HTTP health check
      if (this.settings.includeHttpCheck) {
        healthResults.checks.httpCheck = await this.performHttpHealthCheck(project);
      }
      
      // 5. Determine overall status
      healthResults.overallStatus = this.determineOverallStatus(healthResults.checks);
      
      // 6. Retry logic if unhealthy
      if (healthResults.overallStatus === 'unhealthy' && this.settings.retries > 0) {
        logger.info(`🔄 Retrying health check (${this.settings.retries} attempts remaining)...`);
        const retryResults = await this.retryHealthCheck(project, this.settings.retries);
        healthResults.retryResults = retryResults;
        
        // Update overall status after retries
        if (retryResults.finalStatus === 'healthy') {
          healthResults.overallStatus = 'healthy';
        }
      }
      
      const isHealthy = healthResults.overallStatus === 'healthy';
      
      if (isHealthy) {
        logger.info('✅ Project is healthy');
        return {
          success: true,
          message: 'Project health check passed',
          data: healthResults
        };
      } else {
        logger.warn('⚠️ Project health check failed');
        return {
          success: false,
          message: 'Project health check failed',
          data: healthResults
        };
      }
      
    } catch (error) {
      logger.error('❌ Health check failed:', error);
      
      return {
        success: false,
        message: 'Health check failed',
        error: error.message,
        data: {
          status: 'error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  async checkPortAvailability(project) {
    try {
      const port = project.frontend_port || project.backend_port;
      if (!port) {
        return {
          status: 'unknown',
          message: 'No port configured',
          available: false
        };
      }
      
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      const { stdout } = await execAsync(`lsof -i :${port}`);
      const isInUse = stdout.trim().length > 0;
      
      return {
        status: isInUse ? 'in_use' : 'available',
        port: port,
        available: isInUse,
        message: isInUse ? `Port ${port} is in use` : `Port ${port} is available`
      };
      
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        available: false
      };
    }
  }

  async checkProcessStatus(project) {
    try {
      const port = project.frontend_port || project.backend_port;
      if (!port) {
        return {
          status: 'unknown',
          message: 'No port configured',
          running: false
        };
      }
      
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      // Find processes using the port
      const { stdout } = await execAsync(`lsof -ti :${port}`);
      const pids = stdout.trim().split('\n').filter(pid => pid.length > 0);
      
      if (pids.length === 0) {
        return {
          status: 'not_running',
          message: 'No processes found on port',
          running: false,
          pids: []
        };
      }
      
      // Get process details
      const processDetails = [];
      for (const pid of pids) {
        try {
          const { stdout: psOutput } = await execAsync(`ps -p ${pid} -o pid,ppid,cmd --no-headers`);
          processDetails.push({
            pid: pid,
            details: psOutput.trim()
          });
        } catch (error) {
          processDetails.push({
            pid: pid,
            details: 'Unknown'
          });
        }
      }
      
      return {
        status: 'running',
        message: `${pids.length} process(es) running on port`,
        running: true,
        pids: pids,
        processDetails: processDetails
      };
      
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        running: false
      };
    }
  }

  async performHttpHealthCheck(project) {
    try {
      const port = project.frontend_port || project.backend_port;
      if (!port) {
        return {
          status: 'unknown',
          message: 'No port configured',
          healthy: false
        };
      }
      
      const startTime = Date.now();
      
      // Try different health endpoints
      const healthEndpoints = [
        `http://localhost:${port}/health`,
        `http://localhost:${port}/api/health`,
        `http://localhost:${port}/status`,
        `http://localhost:${port}/`
      ];
      
      for (const endpoint of healthEndpoints) {
        try {
          const result = await this.checkHttpEndpoint(endpoint, this.settings.timeout);
          
          if (result.success) {
            const responseTime = Date.now() - startTime;
            
            return {
              status: 'healthy',
              message: `Health check passed for ${endpoint}`,
              healthy: true,
              endpoint: endpoint,
              statusCode: result.statusCode,
              responseTime: responseTime,
              responseSize: result.responseSize
            };
          }
        } catch (error) {
          // Try next endpoint
          continue;
        }
      }
      
      return {
        status: 'unhealthy',
        message: 'All health endpoints failed',
        healthy: false,
        endpoints: healthEndpoints
      };
      
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        healthy: false
      };
    }
  }

  async checkHttpEndpoint(url, timeout) {
    return new Promise((resolve, reject) => {
      const http = require('http');
      const https = require('https');
      
      const client = url.startsWith('https') ? https : http;
      
      const req = client.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const isHealthy = res.statusCode >= 200 && res.statusCode < 300;
          
          resolve({
            success: isHealthy,
            statusCode: res.statusCode,
            responseSize: data.length,
            headers: res.headers
          });
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.setTimeout(timeout, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  determineOverallStatus(checks) {
    const statuses = Object.values(checks).map(check => check.status);
    
    if (statuses.every(status => status === 'healthy' || status === 'running' || status === 'in_use')) {
      return 'healthy';
    } else if (statuses.some(status => status === 'error')) {
      return 'error';
    } else {
      return 'unhealthy';
    }
  }

  async retryHealthCheck(project, retries) {
    const results = [];
    
    for (let i = 0; i < retries; i++) {
      logger.info(`🔄 Health check retry ${i + 1}/${retries}`);
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const retryChecks = {};
      
      if (this.settings.includeHttpCheck) {
        retryChecks.httpCheck = await this.performHttpHealthCheck(project);
      }
      
      if (this.settings.includeProcessCheck) {
        retryChecks.processCheck = await this.checkProcessStatus(project);
      }
      
      const retryStatus = this.determineOverallStatus(retryChecks);
      results.push({
        attempt: i + 1,
        status: retryStatus,
        checks: retryChecks
      });
      
      if (retryStatus === 'healthy') {
        logger.info(`✅ Health check passed on retry ${i + 1}`);
        break;
      }
    }
    
    return {
      attempts: results,
      finalStatus: results.length > 0 ? results[results.length - 1].status : 'unknown'
    };
  }
}

module.exports = ProjectHealthCheckStep; 