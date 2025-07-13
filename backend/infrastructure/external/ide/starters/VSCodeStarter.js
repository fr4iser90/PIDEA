
/**
 * VSCode IDE Starter
 * Starts VSCode IDE instances and manages VSCode-specific startup logic
 */

const { spawn } = require('child_process');
const path = require('path');

class VSCodeStarter {
  constructor() {
    this.config = {
      name: 'VSCode',
      executable: 'code',
      defaultArgs: [
        '--remote-debugging-port=',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      startupTimeout: 5000,
      portRange: { start: 9232, end: 9241 }
    };
  }

  /**
   * Start VSCode IDE
   * @param {number} port - Port to start IDE on
   * @param {string} workspacePath - Workspace path
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} IDE startup information
   */
  async startIDE(port, workspacePath = null, options = {}) {
    logger.log('[VSCodeStarter] Starting VSCode IDE on port', port);
    
    // Validate port is in range
    if (port < this.config.portRange.start || port > this.config.portRange.end) {
      throw new Error(`Port ${port} is outside VSCode's allowed range ${this.config.portRange.start}-${this.config.portRange.end}`);
    }

    // Check if VSCode is installed
    const isInstalled = await this.isInstalled();
    if (!isInstalled) {
      throw new Error('VSCode is not installed on this system');
    }

    const args = [
      `--remote-debugging-port=${port}`,
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ];

    // Add user data directory to avoid conflicts
    const userDataDir = options.userDataDir || path.join(process.cwd(), 'vscode-data-' + port);
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
      // Find VSCode executable
      const vscodeCommand = this.findVSCodeExecutable();
      if (!vscodeCommand) {
        throw new Error('VSCode executable not found');
      }

      const process = spawn(vscodeCommand, args, {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ...options.env
        }
      });

      // Handle process events
      process.stdout.on('data', (data) => {
        logger.log(`[VSCodeStarter] VSCode IDE ${port} stdout:`, data.toString().trim());
      });

      process.stderr.on('data', (data) => {
        logger.log(`[VSCodeStarter] VSCode IDE ${port} stderr:`, data.toString().trim());
      });

      process.on('close', (code) => {
        logger.log(`[VSCodeStarter] VSCode IDE ${port} process closed with code ${code}`);
      });

      process.on('error', (error) => {
        logger.error(`[VSCodeStarter] VSCode IDE ${port} process error:`, error);
      });

      // Wait for VSCode to start (longer timeout than Cursor)
      await new Promise(resolve => setTimeout(resolve, this.config.startupTimeout));

      return {
        port: port,
        pid: process.pid,
        status: 'starting',
        ideType: 'vscode',
        process: process,
        args: args,
        workspacePath: workspacePath,
        userDataDir: userDataDir
      };

    } catch (error) {
      logger.error('[VSCodeStarter] Failed to start VSCode IDE:', error);
      throw error;
    }
  }

  /**
   * Stop VSCode IDE
   * @param {number} port - Port of IDE to stop
   * @returns {Promise<Object>} Stop result
   */
  async stopIDE(port) {
    logger.log('[VSCodeStarter] Stopping VSCode IDE on port', port);
    
    try {
      // Find and kill VSCode processes on the specified port
      const { exec } = require('child_process');
      
      return new Promise((resolve, reject) => {
        exec(`lsof -ti:${port}`, (error, stdout) => {
          if (error || !stdout.trim()) {
            resolve({
              port: port,
              status: 'not_running',
              ideType: 'vscode'
            });
            return;
          }

          const pids = stdout.trim().split('\n');
          const killPromises = pids.map(pid => {
            return new Promise((resolveKill) => {
              exec(`kill -TERM ${pid}`, (killError) => {
                if (killError) {
                  logger.error(`[VSCodeStarter] Error killing process ${pid}:`, killError);
                }
                resolveKill();
              });
            });
          });

          Promise.all(killPromises).then(() => {
            resolve({
              port: port,
              status: 'stopped',
              ideType: 'vscode',
              killedPids: pids
            });
          });
        });
      });
    } catch (error) {
      logger.error('[VSCodeStarter] Error stopping VSCode IDE:', error);
      throw error;
    }
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
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
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
   * Get VSCode-specific startup options
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
      supportsCustomUserData: true,
      supportsCustomExtensions: true,
      defaultPortRange: this.config.portRange
    };
  }
}

module.exports = VSCodeStarter; 