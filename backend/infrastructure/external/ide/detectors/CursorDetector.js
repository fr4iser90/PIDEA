
/**
 * Cursor IDE Detector
 * Detects Cursor IDE instances and manages Cursor-specific detection logic
 */

const http = require('http');
const net = require('net');

class CursorDetector {
  constructor() {
    this.portRange = { start: 9222, end: 9231 };
    this.scanTimeout = 1000; // 1 second timeout per port
    this.config = {
      name: 'Cursor',
      executable: 'cursor',
      portRange: this.portRange,
      detectionMethod: 'http',
      versionEndpoint: '/json/version'
    };
  }

  /**
   * Scan for Cursor IDE instances
   * @returns {Promise<Array>} Array of detected Cursor IDEs
   */
  async scanForIDEs() {
    logger.log('[CursorDetector] Scanning for Cursor IDEs on ports', this.portRange.start, 'to', this.portRange.end);
    
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
          ideType: 'cursor',
          version: result.value.version || 'unknown',
          webSocketUrl: result.value.webSocketUrl || null
        });
      }
    });

    logger.log('[CursorDetector] Found', availableIDEs.length, 'running Cursor IDEs');
    return availableIDEs;
  }

  /**
   * Check if Cursor is running on specific port
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
              // Check if it's Cursor (not VSCode)
              if (!json.Browser.includes('VS Code') && !json.Browser.includes('Code')) {
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
   * Find available port for Cursor
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
    
    throw new Error(`No available ports in range ${this.portRange.start}-${this.portRange.end} for Cursor`);
  }

  /**
   * Check if Cursor is installed
   * @returns {Promise<boolean>} True if Cursor is installed
   */
  async isInstalled() {
    return new Promise((resolve) => {
      const { spawn } = require('child_process');
      const process = spawn('which', ['cursor'], { stdio: 'ignore' });
      
      process.on('close', (code) => {
        resolve(code === 0);
      });
      
      process.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Get Cursor version
   * @returns {Promise<string|null>} Cursor version or null if not found
   */
  async getVersion() {
    return new Promise((resolve) => {
      const { spawn } = require('child_process');
const { logger } = require('@infrastructure/logging/Logger');
      const process = spawn('cursor', ['--version'], { stdio: 'pipe' });
      
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
   * Validate Cursor installation
   * @returns {Promise<Object>} Validation result
   */
  async validateInstallation() {
    const isInstalled = await this.isInstalled();
    const version = isInstalled ? await this.getVersion() : null;
    
    return {
      isInstalled,
      version,
      isValid: isInstalled && version !== null,
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
   * Test connection to Cursor IDE
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
          error: 'No Cursor IDE found on port'
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
   * Get Cursor-specific capabilities
   * @returns {Object} Capabilities object
   */
  getCapabilities() {
    return {
      supportsRemoteDebugging: true,
      supportsWebSocket: true,
      supportsFileSystem: true,
      supportsExtensions: true,
      supportsAI: true,
      defaultPortRange: this.portRange
    };
  }
}

module.exports = CursorDetector; 