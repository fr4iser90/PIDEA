
/**
 * Cursor IDE Starter
 * Starts Cursor IDE instances and manages Cursor-specific startup logic
 */

const { spawn } = require('child_process');
const path = require('path');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('CursorStarter');

class CursorStarter {
  constructor() {
    this.config = {
      name: 'Cursor',
      executable: 'cursor',
      defaultArgs: [
        '--remote-debugging-port=',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      startupTimeout: 3000,
      portRange: { start: 9222, end: 9231 }
    };
  }

  /**
   * Start Cursor IDE
   * @param {number} port - Port to start IDE on
   * @param {string} workspacePath - Workspace path
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} IDE startup information
   */
  async startIDE(port, workspacePath = null, options = {}) {
    logger.info('Starting Cursor IDE on port', port);
    
    // Validate port is in range
    if (port < this.config.portRange.start || port > this.config.portRange.end) {
      throw new Error(`Port ${port} is outside Cursor's allowed range ${this.config.portRange.start}-${this.config.portRange.end}`);
    }

    // Check if Cursor is installed
    const isInstalled = await this.isInstalled();
    if (!isInstalled) {
      throw new Error('Cursor is not installed on this system');
    }

    const args = [
      `--remote-debugging-port=${port}`,
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ];

    // Add workspace path if provided
    if (workspacePath) {
      args.push(workspacePath);
    }

    // Add additional options
    if (options.userDataDir) {
      args.push(`--user-data-dir=${options.userDataDir}`);
    }

    if (options.extensionsDir) {
      args.push(`--extensions-dir=${options.extensionsDir}`);
    }

    if (options.disableExtensions) {
      args.push('--disable-extensions');
    }

    if (options.verbose) {
      args.push('--verbose');
    }

    try {
      const childProcess = spawn('cursor', args, {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ...options.env
        }
      });

      // Handle process events
      childProcess.stdout.on('data', (data) => {
        logger.info(`Cursor IDE ${port} stdout received`);
      });

      childProcess.stderr.on('data', (data) => {
        logger.info(`Cursor IDE ${port} stderr received`);
      });

      childProcess.on('close', (code) => {
        logger.info(`Cursor IDE ${port} process closed with code ${code}`);
      });

      childProcess.on('error', (error) => {
        logger.error(`Cursor IDE ${port} process error:`, error);
      });

      // Wait for IDE to start
      await new Promise(resolve => setTimeout(resolve, this.config.startupTimeout));

      return {
        port: port,
        pid: process.pid,
        status: 'starting',
        ideType: 'cursor',
        args: args,
        workspacePath: workspacePath
      };

    } catch (error) {
      logger.error('Failed to start Cursor IDE:', error);
      throw error;
    }
  }

  /**
   * Stop Cursor IDE
   * @param {number} port - Port of IDE to stop
   * @returns {Promise<Object>} Stop result
   */
  async stopIDE(port) {
    logger.info('Stopping Cursor IDE on port', port);
    
    try {
      // Find and kill Cursor processes on the specified port
      const { exec } = require('child_process');
      
      return new Promise((resolve, reject) => {
        exec(`lsof -ti:${port}`, (error, stdout) => {
          if (error || !stdout.trim()) {
            resolve({
              port: port,
              status: 'not_running',
              ideType: 'cursor'
            });
            return;
          }

          const pids = stdout.trim().split('\n');
          const killPromises = pids.map(pid => {
            return new Promise((resolveKill) => {
              exec(`kill -TERM ${pid}`, (killError) => {
                if (killError) {
                  logger.error(`Error killing process ${pid}:`, killError);
                }
                resolveKill();
              });
            });
          });

          Promise.all(killPromises).then(() => {
            resolve({
              port: port,
              status: 'stopped',
              ideType: 'cursor',
              killedPids: pids
            });
          });
        });
      });
    } catch (error) {
      logger.error('Error stopping Cursor IDE:', error);
      throw error;
    }
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
      const versionProcess = spawn('cursor', ['--version'], { stdio: 'pipe' });
      
      let output = '';
      versionProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      versionProcess.on('close', (code) => {
        if (code === 0 && output.trim()) {
          resolve(output.trim());
        } else {
          resolve(null);
        }
      });
      
      versionProcess.on('error', () => {
        resolve(null);
      });
    });
  }

  /**
   * Get starter configuration
   * @returns {Object} Starter configuration
   */
  getConfig() {
    return this.config;
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
   * Get Cursor-specific startup options
   * @returns {Object} Available startup options
   */
  getStartupOptions() {
    return {
      userDataDir: 'Custom user data directory',
      extensionsDir: 'Custom extensions directory',
      disableExtensions: 'Disable all extensions',
      verbose: 'Enable verbose logging',
      env: 'Environment variables'
    };
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
      supportsCustomUserData: true,
      supportsCustomExtensions: true,
      defaultPortRange: this.config.portRange
    };
  }
}

module.exports = CursorStarter; 