/**
 * CpuService - Infrastructure Layer
 * CPU performance monitoring service
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: CPU performance monitoring and analysis
 */

const Logger = require('@logging/Logger');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class CpuService {
  constructor() {
    this.logger = new Logger('CpuService');
    this.baseUrl = process.env.CPU_API_URL;
    this.apiKey = process.env.CPU_API_KEY;
    this.timeout = parseInt(process.env.CPU_TIMEOUT) || 30000;
  }

  async analyze(params) {
    try {
      this.logger.info('Starting CPU analysis', { projectId: params.projectId });
      
      const { projectPath, config = {} } = params;
      const cpuConfig = {
        ...config,
        duration: config.duration || 60,
        interval: config.interval || 5,
        includeProcesses: config.includeProcesses !== false
      };

      const result = await this.analyzeCpuUsage(projectPath, cpuConfig);
      
      this.logger.info('CPU analysis completed successfully', { 
        projectId: params.projectId,
        samples: result.samples?.length || 0 
      });

      return {
        success: true,
        data: result,
        metadata: {
          scanner: 'cpu',
          timestamp: new Date().toISOString(),
          config: cpuConfig
        }
      };
    } catch (error) {
      this.logger.error('CPU analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  async analyzeCpuUsage(projectPath, config) {
    const samples = [];
    const startTime = Date.now();
    const endTime = startTime + (config.duration * 1000);

    while (Date.now() < endTime) {
      const sample = await this.collectCpuSample(projectPath, config);
      samples.push(sample);
      
      await new Promise(resolve => setTimeout(resolve, config.interval * 1000));
    }

    return {
      samples: samples,
      summary: this.calculateCpuSummary(samples),
      recommendations: this.generateCpuRecommendations(samples)
    };
  }

  async collectCpuSample(projectPath, config) {
    const timestamp = new Date().toISOString();
    const systemCpu = this.getSystemCpuInfo();
    
    let processCpu = null;
    if (config.includeProcesses) {
      processCpu = await this.getProcessCpuInfo(projectPath);
    }

    return {
      timestamp: timestamp,
      system: systemCpu,
      processes: processCpu,
      projectPath: projectPath
    };
  }

  getSystemCpuInfo() {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    const totalCpu = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b);
      const idle = cpu.times.idle;
      return {
        total: acc.total + total,
        idle: acc.idle + idle
      };
    }, { total: 0, idle: 0 });

    const usagePercent = ((totalCpu.total - totalCpu.idle) / totalCpu.total) * 100;

    return {
      cores: cpus.length,
      usage: usagePercent,
      loadAverage: {
        '1min': loadAvg[0],
        '5min': loadAvg[1],
        '15min': loadAvg[2]
      },
      model: cpus[0]?.model || 'Unknown'
    };
  }

  async getProcessCpuInfo(projectPath) {
    try {
      const processes = await this.findProjectProcesses(projectPath);
      const processCpu = [];

      for (const process of processes) {
        const cpuInfo = await this.getProcessCpu(process.pid);
        if (cpuInfo) {
          processCpu.push({
            pid: process.pid,
            name: process.name,
            cpu: cpuInfo
          });
        }
      }

      return processCpu;
    } catch (error) {
      this.logger.warn('Failed to get process CPU info', { error: error.message });
      return [];
    }
  }

  async findProjectProcesses(projectPath) {
    try {
      const { stdout } = await execAsync('ps aux', { timeout: 10000 });
      const lines = stdout.split('\n');
      const processes = [];

      for (const line of lines) {
        if (line.includes(projectPath) || line.includes('node') || line.includes('npm')) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 2) {
            processes.push({
              pid: parseInt(parts[1]),
              name: parts[10] || parts[0]
            });
          }
        }
      }

      return processes;
    } catch (error) {
      this.logger.warn('Failed to find project processes', { error: error.message });
      return [];
    }
  }

  async getProcessCpu(pid) {
    try {
      const { stdout } = await execAsync(`ps -p ${pid} -o pid,pcpu,time --no-headers`, { timeout: 5000 });
      const parts = stdout.trim().split(/\s+/);
      
      if (parts.length >= 3) {
        return {
          usage: parseFloat(parts[1]),
          time: parts[2]
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  calculateCpuSummary(samples) {
    if (samples.length === 0) {
      return {
        averageUsage: 0,
        peakUsage: 0,
        lowUsage: 0,
        trend: 'stable'
      };
    }

    const usagePercentages = samples.map(s => s.system.usage);
    const averageUsage = usagePercentages.reduce((a, b) => a + b, 0) / usagePercentages.length;
    const peakUsage = Math.max(...usagePercentages);
    const lowUsage = Math.min(...usagePercentages);

    const firstHalf = usagePercentages.slice(0, Math.floor(usagePercentages.length / 2));
    const secondHalf = usagePercentages.slice(Math.floor(usagePercentages.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    let trend = 'stable';
    if (secondAvg > firstAvg + 5) trend = 'increasing';
    else if (secondAvg < firstAvg - 5) trend = 'decreasing';

    return {
      averageUsage: averageUsage,
      peakUsage: peakUsage,
      lowUsage: lowUsage,
      trend: trend,
      samples: samples.length
    };
  }

  generateCpuRecommendations(samples) {
    const recommendations = [];
    const summary = this.calculateCpuSummary(samples);

    if (summary.averageUsage > 80) {
      recommendations.push({
        type: 'warning',
        message: 'High CPU usage detected. Consider optimizing CPU-intensive operations.',
        severity: 'high'
      });
    }

    if (summary.peakUsage > 95) {
      recommendations.push({
        type: 'critical',
        message: 'Critical CPU usage detected. System may become unresponsive.',
        severity: 'critical'
      });
    }

    if (summary.trend === 'increasing') {
      recommendations.push({
        type: 'info',
        message: 'CPU usage is trending upward. Monitor for potential performance issues.',
        severity: 'medium'
      });
    }

    return recommendations;
  }

  async getConfiguration() {
    return {
      name: 'CPU Monitoring Service',
      version: '1.0.0',
      capabilities: ['cpu-monitoring', 'process-tracking', 'trend-analysis'],
      configuration: {
        baseUrl: this.baseUrl,
        timeout: this.timeout,
        hasApiKey: !!this.apiKey
      }
    };
  }

  async getStatus() {
    try {
      const systemCpu = this.getSystemCpuInfo();
      return {
        status: 'healthy',
        systemCpu: systemCpu,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = CpuService; 