/**
 * NetworkService - Infrastructure Layer
 * Network performance monitoring service
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Network performance monitoring and analysis
 */

const Logger = require('@logging/Logger');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class NetworkService {
  constructor() {
    this.logger = new Logger('NetworkService');
    this.baseUrl = process.env.NETWORK_API_URL;
    this.apiKey = process.env.NETWORK_API_KEY;
    this.timeout = parseInt(process.env.NETWORK_TIMEOUT) || 30000;
  }

  async analyze(params) {
    try {
      this.logger.info('Starting network analysis', { projectId: params.projectId });
      
      const { projectPath, config = {} } = params;
      const networkConfig = {
        ...config,
        duration: config.duration || 60,
        interval: config.interval || 5,
        includeConnections: config.includeConnections !== false
      };

      const result = await this.analyzeNetworkPerformance(projectPath, networkConfig);
      
      this.logger.info('Network analysis completed successfully', { 
        projectId: params.projectId,
        samples: result.samples?.length || 0 
      });

      return {
        success: true,
        data: result,
        metadata: {
          scanner: 'network',
          timestamp: new Date().toISOString(),
          config: networkConfig
        }
      };
    } catch (error) {
      this.logger.error('Network analysis failed', { 
        projectId: params.projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  async analyzeNetworkPerformance(projectPath, config) {
    const samples = [];
    const startTime = Date.now();
    const endTime = startTime + (config.duration * 1000);

    while (Date.now() < endTime) {
      const sample = await this.collectNetworkSample(projectPath, config);
      samples.push(sample);
      
      await new Promise(resolve => setTimeout(resolve, config.interval * 1000));
    }

    return {
      samples: samples,
      summary: this.calculateNetworkSummary(samples),
      recommendations: this.generateNetworkRecommendations(samples)
    };
  }

  async collectNetworkSample(projectPath, config) {
    const timestamp = new Date().toISOString();
    const networkInfo = await this.getNetworkInfo();
    
    let connections = null;
    if (config.includeConnections) {
      connections = await this.getNetworkConnections(projectPath);
    }

    return {
      timestamp: timestamp,
      network: networkInfo,
      connections: connections,
      projectPath: projectPath
    };
  }

  async getNetworkInfo() {
    try {
      const interfaces = os.networkInterfaces();
      const networkInfo = {};

      for (const [name, nets] of Object.entries(interfaces)) {
        networkInfo[name] = nets.map(net => ({
          family: net.family,
          address: net.address,
          netmask: net.netmask,
          mac: net.mac,
          internal: net.internal
        }));
      }

      return networkInfo;
    } catch (error) {
      this.logger.warn('Failed to get network info', { error: error.message });
      return {};
    }
  }

  async getNetworkConnections(projectPath) {
    try {
      const { stdout } = await execAsync('netstat -tuln', { timeout: 10000 });
      const lines = stdout.split('\n');
      const connections = [];

      for (const line of lines) {
        if (line.includes('LISTEN') || line.includes('ESTABLISHED')) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 4) {
            connections.push({
              protocol: parts[0],
              localAddress: parts[3],
              state: parts[5] || 'UNKNOWN'
            });
          }
        }
      }

      return connections;
    } catch (error) {
      this.logger.warn('Failed to get network connections', { error: error.message });
      return [];
    }
  }

  calculateNetworkSummary(samples) {
    if (samples.length === 0) {
      return {
        interfaces: 0,
        connections: 0,
        status: 'unknown'
      };
    }

    const lastSample = samples[samples.length - 1];
    const interfaceCount = Object.keys(lastSample.network).length;
    const connectionCount = lastSample.connections?.length || 0;

    return {
      interfaces: interfaceCount,
      connections: connectionCount,
      status: 'healthy',
      samples: samples.length
    };
  }

  generateNetworkRecommendations(samples) {
    const recommendations = [];
    const summary = this.calculateNetworkSummary(samples);

    if (summary.connections > 100) {
      recommendations.push({
        type: 'warning',
        message: 'High number of network connections detected. Monitor for potential connection leaks.',
        severity: 'medium'
      });
    }

    if (summary.interfaces === 0) {
      recommendations.push({
        type: 'error',
        message: 'No network interfaces detected. Check network configuration.',
        severity: 'high'
      });
    }

    return recommendations;
  }

  async getConfiguration() {
    return {
      name: 'Network Monitoring Service',
      version: '1.0.0',
      capabilities: ['network-monitoring', 'connection-tracking', 'interface-analysis'],
      configuration: {
        baseUrl: this.baseUrl,
        timeout: this.timeout,
        hasApiKey: !!this.apiKey
      }
    };
  }

  async getStatus() {
    try {
      const networkInfo = await this.getNetworkInfo();
      return {
        status: 'healthy',
        networkInfo: networkInfo,
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

module.exports = NetworkService; 