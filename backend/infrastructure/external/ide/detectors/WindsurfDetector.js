
/**
 * Windsurf IDE Detector
 * Detects Windsurf IDE instances and manages Windsurf-specific detection logic
 */

const http = require('http');
const net = require('net');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('WindsurfDetector');

class WindsurfDetector {
  constructor() {
    this.portRange = { start: 9242, end: 9251 };
    this.scanTimeout = 1000; // 1 second timeout per port
    this.config = {
      name: 'Windsurf',
      executable: 'windsurf',
      portRange: this.portRange,
      detectionMethod: 'http',
      versionEndpoint: '/json/version'
    };
  }

  /**
   * Scan for Windsurf IDE instances
   * @returns {Promise<Array>} Array of detected Windsurf IDEs
   */
  async scanForIDEs() {
    logger.info('[WindsurfDetector] 🔍 Scanning for Windsurf IDEs on ports', this.portRange.start, 'to', this.portRange.end);
    
    const availableIDEs = [];
    const promises = [];

    for (let port = this.portRange.start; port <= this.portRange.end; port++) {
      promises.push(this.checkPort(port));
    }

    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      const port = this.portRange.start + index;
      if (result.status === 'fulfilled' && result.value) {
        availableIDEs.push({
          port: port,
          status: 'running',
          url: `http://127.0.0.1:${port}`,
          ideType: 'windsurf',
          version: result.value.version || 'unknown',
          webSocketUrl: result.value.webSocketUrl || null
        });
      }
    });

    logger.info('[WindsurfDetector] ✅ Found', availableIDEs.length, 'running Windsurf IDEs');
    return availableIDEs;
  }

  /**
   * Check if Windsurf is running on specific port
   * @param {number} port - Port to check
   * @returns {Promise<Object|false>} IDE info if running, false otherwise
   */
  async checkPort(port) {
    return new Promise((resolve) => {
      const req = http.get({
        hostname: '127.0.0.1',
        port: port,
        path: this.config.versionEndpoint,
        timeout: this.scanTimeout
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.Browser && json.webSocketDebuggerUrl) {
              // Check if it's Windsurf
              if (json.Browser.includes('Windsurf') || json.Browser.includes('windsurf')) {
                resolve({
                  version: json.Browser,
                  webSocketUrl: json.webSocketDebuggerUrl,
                  userAgent: json['User-Agent'] || null
                });
              } else {
                resolve(false);
              }
            } else {
              resolve(false);
            }
          } catch {
            resolve(false);
          }
        });
      });
      
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Find available port for Windsurf
   * @returns {Promise<number>} Available port number
   */
  async findAvailablePort() {
    const runningIDEs = await this.scanForIDEs();
    const usedPorts = runningIDEs.map(ide => ide.port);
    
    for (let port = this.portRange.start; port <= this.portRange.end; port++) {
      if (!usedPorts.includes(port)) {
        return port;
      }
    }
    
    throw new Error(`No available ports in range ${this.portRange.start}-${this.portRange.end} for Windsurf`);
  }

  /**
   * Check if Windsurf is installed
   * @returns {Promise<boolean>} True if Windsurf is installed
   */
  async isInstalled() {
    return new Promise((resolve) => {
      const { spawn } = require('child_process');
      const process = spawn('which', ['windsurf'], { stdio: 'ignore' });
      
      process.on('close', (code) => {
        resolve(code === 0);
      });
      
      process.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Get Windsurf version
   * @returns {Promise<string|null>} Windsurf version or null if not found
   */
  async getVersion() {
    return new Promise((resolve) => {
      const { spawn } = require('child_process');
      const process = spawn('windsurf', ['--version'], { stdio: 'pipe' });
      
      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0 && output.trim()) {
          resolve(output.trim());
        } else {
          resolve(null);
        }
      });
      
      process.on('error', () => {
        resolve(null);
      });
    });
  }

  /**
   * Find Windsurf executable path
   * @returns {string|null} Path to Windsurf executable or null if not found
   */
  findWindsurfExecutable() {
    const { spawn } = require('child_process');
    
    // Try common Windsurf executable names
    const possibleExecutables = ['windsurf', 'windsurf-ide', 'windsurf-editor'];
    
    for (const executable of possibleExecutables) {
      try {
        const result = require('child_process').execSync(`which ${executable}`, { encoding: 'utf8' });
        if (result.trim()) {
          return result.trim();
        }
      } catch (error) {
        // Continue to next executable
      }
    }
    
    // Try common installation paths
    const commonPaths = [
      '/usr/bin/windsurf',
      '/usr/local/bin/windsurf',
      '/opt/windsurf/bin/windsurf',
      '/Applications/Windsurf.app/Contents/MacOS/windsurf'
    ];
    
    for (const path of commonPaths) {
      try {
        require('fs').accessSync(path, require('fs').constants.X_OK);
        return path;
      } catch (error) {
        // Continue to next path
      }
    }
    
    return null;
  }

  /**
   * Validate Windsurf installation
   * @returns {Promise<Object>} Validation result
   */
  async validateInstallation() {
    const isInstalled = await this.isInstalled();
    const version = isInstalled ? await this.getVersion() : null;
    const executablePath = this.findWindsurfExecutable();
    
    return {
      isInstalled,
      version,
      executablePath,
      isValid: isInstalled && version !== null && executablePath !== null,
      executable: this.config.executable
    };
  }

  /**
   * Get detector configuration
   * @returns {Object} Detector configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Test connection to Windsurf IDE
   * @param {number} port - Port to test
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection(port) {
    try {
      const ideInfo = await this.checkPort(port);
      if (ideInfo) {
        return {
          success: true,
          port: port,
          version: ideInfo.version,
          webSocketUrl: ideInfo.webSocketUrl,
          responseTime: Date.now()
        };
      } else {
        return {
          success: false,
          port: port,
          error: 'No Windsurf IDE found on port'
        };
      }
    } catch (error) {
      return {
        success: false,
        port: port,
        error: error.message
      };
    }
  }

  /**
   * Get Windsurf-specific capabilities
   * @returns {Object} Capabilities object
   */
  getCapabilities() {
    return {
      supportsRemoteDebugging: true,
      supportsWebSocket: true,
      supportsFileSystem: true,
      supportsExtensions: true,
      supportsAI: true, // Windsurf has AI capabilities
      defaultPortRange: this.portRange
    };
  }
}

module.exports = WindsurfDetector; 