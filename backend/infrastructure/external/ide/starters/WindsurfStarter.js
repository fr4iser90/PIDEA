
/**
 * Windsurf IDE Starter
 * Starts Windsurf IDE instances and manages Windsurf-specific startup logic
 */

const { spawn } = require('child_process');
const path = require('path');

class WindsurfStarter {
  constructor() {
    this.config = {
      name: 'Windsurf',
      executable: 'windsurf',
      defaultArgs: [
        '--remote-debugging-port=',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      startupTimeout: 4000,
      portRange: { start: 9242, end: 9251 }
    };
  }

  /**
   * Start Windsurf IDE
   * @param {number} port - Port to start IDE on
   * @param {string} workspacePath - Workspace path
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} IDE startup information
   */
  async startIDE(port, workspacePath = null, options = {}) {
    logger.log('[WindsurfStarter] Starting Windsurf IDE on port', port);
    
    // Validate port is in range
    if (port < this.config.portRange.start || port > this.config.portRange.end) {
      throw new Error(`Port ${port} is outside Windsurf's allowed range ${this.config.portRange.start}-${this.config.portRange.end}`);
    }

    // Check if Windsurf is installed
    const isInstalled = await this.isInstalled();
    if (!isInstalled) {
      throw new Error('Windsurf is not installed on this system');
    }

    const args = [
      `--remote-debugging-port=${port}`,
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ];

    // Add user data directory to avoid conflicts
    const userDataDir = options.userDataDir || path.join(process.cwd(), 'windsurf-data-' + port);
    args.push(`--user-data-dir=${userDataDir}`);

    // Add workspace path if provided
    if (workspacePath) {
      args.push(workspacePath);
    }

    // Add additional options
    if (options.extensionsDir) {
      args.push(`--extensions-dir=${options.extensionsDir}`);
    }

    if (options.disableExtensions) {
      args.push('--disable-extensions');
    }

    if (options.verbose) {
      args.push('--verbose');
    }

    if (options.newWindow) {
      args.push('--new-window');
    }

    try {
      // Find Windsurf executable
      const windsurfCommand = this.findWindsurfExecutable();
      if (!windsurfCommand) {
        throw new Error('Windsurf executable not found');
      }

      const process = spawn(windsurfCommand, args, {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ...options.env
        }
      });

      // Handle process events
      process.stdout.on('data', (data) => {
        logger.log(`[WindsurfStarter] Windsurf IDE ${port} stdout:`, data.toString().trim());
      });

      process.stderr.on('data', (data) => {
        logger.log(`[WindsurfStarter] Windsurf IDE ${port} stderr:`, data.toString().trim());
      });

      process.on('close', (code) => {
        logger.log(`[WindsurfStarter] Windsurf IDE ${port} process closed with code ${code}`);
      });

      process.on('error', (error) => {
        logger.error(`[WindsurfStarter] Windsurf IDE ${port} process error:`, error);
      });

      // Wait for Windsurf to start
      await new Promise(resolve => setTimeout(resolve, this.config.startupTimeout));

      return {
        port: port,
        pid: process.pid,
        status: 'starting',
        ideType: 'windsurf',
        process: process,
        args: args,
        workspacePath: workspacePath,
        userDataDir: userDataDir
      };

    } catch (error) {
      logger.error('[WindsurfStarter] Failed to start Windsurf IDE:', error);
      throw error;
    }
  }

  /**
   * Stop Windsurf IDE
   * @param {number} port - Port of IDE to stop
   * @returns {Promise<Object>} Stop result
   */
  async stopIDE(port) {
    logger.log('[WindsurfStarter] Stopping Windsurf IDE on port', port);
    
    try {
      // Find and kill Windsurf processes on the specified port
      const { exec } = require('child_process');
      
      return new Promise((resolve, reject) => {
        exec(`lsof -ti:${port}`, (error, stdout) => {
          if (error || !stdout.trim()) {
            resolve({
              port: port,
              status: 'not_running',
              ideType: 'windsurf'
            });
            return;
          }

          const pids = stdout.trim().split('\n');
          const killPromises = pids.map(pid => {
            return new Promise((resolveKill) => {
              exec(`kill -TERM ${pid}`, (killError) => {
                if (killError) {
                  logger.error(`[WindsurfStarter] Error killing process ${pid}:`, killError);
                }
                resolveKill();
              });
            });
          });

          Promise.all(killPromises).then(() => {
            resolve({
              port: port,
              status: 'stopped',
              ideType: 'windsurf',
              killedPids: pids
            });
          });
        });
      });
    } catch (error) {
      logger.error('[WindsurfStarter] Error stopping Windsurf IDE:', error);
      throw error;
    }
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
const { logger } = require('@infrastructure/logging/Logger');
        return path;
      } catch (error) {
        // Continue to next path
      }
    }
    
    return null;
  }

  /**
   * Get starter configuration
   * @returns {Object} Starter configuration
   */
  getConfig() {
    return this.config;
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
   * Get Windsurf-specific startup options
   * @returns {Object} Available startup options
   */
  getStartupOptions() {
    return {
      userDataDir: 'Custom user data directory',
      extensionsDir: 'Custom extensions directory',
      disableExtensions: 'Disable all extensions',
      verbose: 'Enable verbose logging',
      newWindow: 'Open in new window',
      env: 'Environment variables'
    };
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
      supportsCustomUserData: true,
      supportsCustomExtensions: true,
      defaultPortRange: this.config.portRange
    };
  }
}

module.exports = WindsurfStarter; 