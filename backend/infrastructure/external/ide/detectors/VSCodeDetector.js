
/**
 * VSCode IDE Detector
 * Detects VSCode IDE instances and manages VSCode-specific detection logic
 */

const http = require('http');
const net = require('net');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('VSCodeDetector');

class VSCodeDetector {
  constructor() {
    this.portRange = { start: 9232, end: 9241 };
    this.scanTimeout = 1000; // 1 second timeout per port
    this.config = {
      name: 'VSCode',
      executable: 'code',
      portRange: this.portRange,
      detectionMethod: 'http',
      versionEndpoint: '/json'
    };
  }

  /**
   * Scan for VSCode IDE instances
   * @returns {Promise<Array>} Array of detected VSCode IDEs
   */
  async scanForIDEs() {
    logger.info('[VSCodeDetector] 🔍 Scanning for VSCode IDEs on ports', this.portRange.start, 'to', this.portRange.end);
    
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
          ideType: 'vscode',
          version: result.value.version || 'unknown',
          webSocketUrl: result.value.webSocketUrl || null
        });
      }
    });

    logger.info('[VSCodeDetector] ✅ Found', availableIDEs.length, 'running VSCode IDEs');
    return availableIDEs;
  }

  /**
   * Check if VSCode is running on specific port
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
            
            // Handle both array format (from /json) and single object format
            const pages = Array.isArray(json) ? json : [json];
            
            // Look for VSCode pages
            for (const page of pages) {
              if (page.title && page.title.includes('Visual Studio Code')) {
                resolve({
                  version: 'VSCode',
                  webSocketUrl: page.webSocketDebuggerUrl,
                  userAgent: page.description || null,
                  title: page.title
                });
                return;
              }
            }
            
            // If no VSCode pages found, check if it's a single browser object
            if (json.Browser && json.webSocketDebuggerUrl) {
              if (json.Browser.includes('VS Code') || json.Browser.includes('Code')) {
                resolve({
                  version: json.Browser,
                  webSocketUrl: json.webSocketDebuggerUrl,
                  userAgent: json['User-Agent'] || null
                });
                return;
              }
            }
            
            resolve(false);
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
   * Find available port for VSCode
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
    
    throw new Error(`No available ports in range ${this.portRange.start}-${this.portRange.end} for VSCode`);
  }

  /**
   * Check if VSCode is installed
   * @returns {Promise<boolean>} True if VSCode is installed
   */
  async isInstalled() {
    return new Promise((resolve) => {
      const { spawn } = require('child_process');
      const process = spawn('which', ['code'], { stdio: 'ignore' });
      
      process.on('close', (code) => {
        resolve(code === 0);
      });
      
      process.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Get VSCode version
   * @returns {Promise<string|null>} VSCode version or null if not found
   */
  async getVersion() {
    return new Promise((resolve) => {
      const { spawn } = require('child_process');
      const process = spawn('code', ['--version'], { stdio: 'pipe' });
      
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
   * Find VSCode executable path
   * @returns {string|null} Path to VSCode executable or null if not found
   */
  findVSCodeExecutable() {
    const { spawn } = require('child_process');
    
    // Try common VSCode executable names
    const possibleExecutables = ['code', 'code-insiders', 'vscode'];
    
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
      '/usr/bin/code',
      '/usr/local/bin/code',
      '/opt/visual-studio-code/bin/code',
      '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code'
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
   * Validate VSCode installation
   * @returns {Promise<Object>} Validation result
   */
  async validateInstallation() {
    const isInstalled = await this.isInstalled();
    const version = isInstalled ? await this.getVersion() : null;
    const executablePath = this.findVSCodeExecutable();
    
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
   * Test connection to VSCode IDE
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
          error: 'No VSCode IDE found on port'
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
   * Get VSCode-specific capabilities
   * @returns {Object} Capabilities object
   */
  getCapabilities() {
    return {
      supportsRemoteDebugging: true,
      supportsWebSocket: true,
      supportsFileSystem: true,
      supportsExtensions: true,
      supportsAI: false, // VSCode doesn't have built-in AI like Cursor
      defaultPortRange: this.portRange
    };
  }
}

module.exports = VSCodeDetector; 