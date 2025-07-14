const { spawn } = require('child_process');
const path = require('path');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');


class VSCodeStarter {
  constructor() {
    this.runningProcesses = new Map(); // port -> process
  }

  async startVSCode(port, workspacePath = null) {
    logger.info('[VSCodeStarter] Starting VSCode on port', port);
    
    if (this.runningProcesses.has(port)) {
      throw new Error(`VSCode already running on port ${port}`);
    }

    const args = [
      '--remote-debugging-port=' + port,
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--user-data-dir=' + path.join(process.cwd(), 'vscode-data-' + port)
    ];

    if (workspacePath) {
      args.push(workspacePath);
    }

    try {
      // Try to find VSCode executable
      const vscodeCommand = this.findVSCodeExecutable();
      
      const process = spawn(vscodeCommand, args, {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.runningProcesses.set(port, process);

      // Handle process events
      process.stdout.on('data', (data) => {
        logger.info(`[VSCodeStarter] VSCode ${port} stdout:`, data.toString().trim());
      });

      process.stderr.on('data', (data) => {
        logger.info(`[VSCodeStarter] VSCode ${port} stderr:`, data.toString().trim());
      });

      process.on('close', (code) => {
        logger.info(`[VSCodeStarter] VSCode ${port} process closed with code ${code}`);
        this.runningProcesses.delete(port);
      });

      process.on('error', (error) => {
        logger.error(`[VSCodeStarter] VSCode ${port} process error:`, error);
        this.runningProcesses.delete(port);
      });

      // Wait a bit for VSCode to start
      await new Promise(resolve => setTimeout(resolve, 5000));

      return {
        port: port,
        pid: process.pid,
        status: 'starting',
        ideType: 'vscode'
      };

    } catch (error) {
      logger.error('[VSCodeStarter] Failed to start VSCode:', error);
      throw error;
    }
  }

  findVSCodeExecutable() {
    // Common VSCode executable names and paths
    const possibleCommands = [
      'code',
      'vscode',
      '/usr/bin/code',
      '/usr/local/bin/code',
      'C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe',
      '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code'
    ];

    // For now, return the most common command
    // In a production environment, you'd want to check which one exists
    return 'code';
  }

  async stopVSCode(port) {
    logger.info('[VSCodeStarter] Stopping VSCode on port', port);
    
    const process = this.runningProcesses.get(port);
    if (!process) {
      throw new Error(`No VSCode running on port ${port}`);
    }

    try {
      process.kill('SIGTERM');
      
      // Wait for process to terminate
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`VSCode ${port} did not terminate within 5 seconds`));
        }, 5000);

        process.on('close', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.runningProcesses.delete(port);
      logger.info('[VSCodeStarter] VSCode stopped successfully on port', port);
      
    } catch (error) {
      logger.error('[VSCodeStarter] Error stopping VSCode:', error);
      // Force kill if graceful shutdown fails
      try {
        process.kill('SIGKILL');
        this.runningProcesses.delete(port);
      } catch (killError) {
        logger.error('[VSCodeStarter] Failed to force kill VSCode:', killError);
      }
      throw error;
    }
  }

  async stopAllVSCodeInstances() {
    logger.info('[VSCodeStarter] Stopping all VSCode instances');
    
    const ports = Array.from(this.runningProcesses.keys());
    const promises = ports.map(port => this.stopVSCode(port));
    
    await Promise.allSettled(promises);
    logger.info('[VSCodeStarter] All VSCode instances stopped');
  }

  getRunningVSCodeInstances() {
    return Array.from(this.runningProcesses.entries()).map(([port, process]) => ({
      port: port,
      pid: process.pid,
      status: 'running',
      ideType: 'vscode'
    }));
  }

  isVSCodeRunning(port) {
    return this.runningProcesses.has(port);
  }
}

module.exports = VSCodeStarter; 