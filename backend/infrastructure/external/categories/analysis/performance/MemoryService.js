/**
 * MemoryService - Infrastructure Layer
 * Memory monitoring and analysis service
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Memory performance monitoring and analysis
 */

const Logger = require('@logging/Logger');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class MemoryService {
  constructor() {
    this.logger = new Logger('MemoryService');
    this.baseUrl = process.env.MEMORY_API_URL;
    this.apiKey = process.env.MEMORY_API_KEY;
    this.timeout = parseInt(process.env.MEMORY_TIMEOUT) || 30000;
  }

  async analyze(params) {
    try {
      this.logger.info('Starting memory analysis', { projectId: params.projectId });
      
      const { projectPath, config = {} } = config;
      const memoryConfig = {
        ...config,
        duration: config.duration || 60, // seconds
        interval: config.interval || 5, // seconds
        includeProcesses: config.includeProcesses !== false
      };

      const result = await this.analyzeMemoryUsage(projectPath, memoryConfig);
      
      this.logger.info('Memory analysis completed successfully', { 
        projectId: params.projectId,
        samples: result.samples?.length || 0 
      });

      return {
        success: true,
        data: result,
        metadata: {
          scanner: 'memory',
          timestamp: new Date().toISOString(),
          config: memoryConfig
        }
      };
    } catch (error) {
      this.logger.error('Memory analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  async analyzeMemoryUsage(projectPath, config) {
    const samples = [];
    const startTime = Date.now();
    const endTime = startTime + (config.duration * 1000);

    while (Date.now() < endTime) {
      const sample = await this.collectMemorySample(projectPath, config);
      samples.push(sample);
      
      // Wait for next interval
      await new Promise(resolve => setTimeout(resolve, config.interval * 1000));
    }

    return {
      samples: samples,
      summary: this.calculateMemorySummary(samples),
      recommendations: this.generateMemoryRecommendations(samples)
    };
  }

  async collectMemorySample(projectPath, config) {
    const timestamp = new Date().toISOString();
    
    // System memory info
    const systemMemory = this.getSystemMemoryInfo();
    
    // Process memory info (if enabled)
    let processMemory = null;
    if (config.includeProcesses) {
      processMemory = await this.getProcessMemoryInfo(projectPath);
    }

    return {
      timestamp: timestamp,
      system: systemMemory,
      processes: processMemory,
      projectPath: projectPath
    };
  }

  getSystemMemoryInfo() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usagePercent = (usedMem / totalMem) * 100;

    return {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      usagePercent: usagePercent,
      available: freeMem
    };
  }

  async getProcessMemoryInfo(projectPath) {
    try {
      // Get processes related to the project
      const processes = await this.findProjectProcesses(projectPath);
      const processMemory = [];

      for (const process of processes) {
        const memoryInfo = await this.getProcessMemory(process.pid);
        if (memoryInfo) {
          processMemory.push({
            pid: process.pid,
            name: process.name,
            memory: memoryInfo
          });
        }
      }

      return processMemory;
    } catch (error) {
      this.logger.warn('Failed to get process memory info', { error: error.message });
      return [];
    }
  }

  async findProjectProcesses(projectPath) {
    try {
      // Find processes that might be related to the project
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

  async getProcessMemory(pid) {
    try {
      const { stdout } = await execAsync(`ps -p ${pid} -o pid,rss,vsz,pcpu --no-headers`, { timeout: 5000 });
      const parts = stdout.trim().split(/\s+/);
      
      if (parts.length >= 4) {
        return {
          rss: parseInt(parts[1]) * 1024, // Convert KB to bytes
          vsz: parseInt(parts[2]) * 1024, // Convert KB to bytes
          cpu: parseFloat(parts[3])
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  calculateMemorySummary(samples) {
    if (samples.length === 0) {
      return {
        averageUsage: 0,
        peakUsage: 0,
        lowUsage: 0,
        trend: 'stable'
      };
    }

    const usagePercentages = samples.map(s => s.system.usagePercent);
    const averageUsage = usagePercentages.reduce((a, b) => a + b, 0) / usagePercentages.length;
    const peakUsage = Math.max(...usagePercentages);
    const lowUsage = Math.min(...usagePercentages);

    // Calculate trend
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

  generateMemoryRecommendations(samples) {
    const recommendations = [];
    const summary = this.calculateMemorySummary(samples);

    if (summary.averageUsage > 80) {
      recommendations.push({
        type: 'warning',
        message: 'High memory usage detected. Consider optimizing memory usage or increasing available memory.',
        severity: 'high'
      });
    }

    if (summary.peakUsage > 90) {
      recommendations.push({
        type: 'critical',
        message: 'Critical memory usage detected. Immediate action required to prevent system instability.',
        severity: 'critical'
      });
    }

    if (summary.trend === 'increasing') {
      recommendations.push({
        type: 'info',
        message: 'Memory usage is trending upward. Monitor for potential memory leaks.',
        severity: 'medium'
      });
    }

    if (samples.length > 0) {
      const processMemory = samples[samples.length - 1].processes || [];
      const highMemoryProcesses = processMemory.filter(p => p.memory.rss > 100 * 1024 * 1024); // 100MB
      
      if (highMemoryProcesses.length > 0) {
        recommendations.push({
          type: 'optimization',
          message: `High memory processes detected: ${highMemoryProcesses.map(p => p.name).join(', ')}`,
          severity: 'medium'
        });
      }
    }

    return recommendations;
  }

  async getConfiguration() {
    return {
      name: 'Memory Monitoring Service',
      version: '1.0.0',
      capabilities: ['memory-monitoring', 'process-tracking', 'trend-analysis'],
      configuration: {
        baseUrl: this.baseUrl,
        timeout: this.timeout,
        hasApiKey: !!this.apiKey
      }
    };
  }

  async getStatus() {
    try {
      const systemMemory = this.getSystemMemoryInfo();
      return {
        status: 'healthy',
        systemMemory: systemMemory,
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

module.exports = MemoryService; 