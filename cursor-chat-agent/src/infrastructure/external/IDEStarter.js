const { spawn } = require('child_process');
const path = require('path');

class IDEStarter {
  constructor() {
    this.runningProcesses = new Map(); // port -> process
  }

  async startIDE(port, workspacePath = null) {
    console.log('[IDEStarter] Starting Cursor IDE on port', port);
    
    if (this.runningProcesses.has(port)) {
      throw new Error(`IDE already running on port ${port}`);
    }

    const args = [
      '--remote-debugging-port=' + port,
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ];

    if (workspacePath) {
      args.push(workspacePath);
    }

    try {
      const process = spawn('cursor', args, {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.runningProcesses.set(port, process);

      // Handle process events
      process.stdout.on('data', (data) => {
        console.log(`[IDEStarter] IDE ${port} stdout:`, data.toString().trim());
      });

      process.stderr.on('data', (data) => {
        console.log(`[IDEStarter] IDE ${port} stderr:`, data.toString().trim());
      });

      process.on('close', (code) => {
        console.log(`[IDEStarter] IDE ${port} process closed with code ${code}`);
        this.runningProcesses.delete(port);
      });

      process.on('error', (error) => {
        console.error(`[IDEStarter] IDE ${port} process error:`, error);
        this.runningProcesses.delete(port);
      });

      // Wait a bit for the IDE to start
      await new Promise(resolve => setTimeout(resolve, 3000));

      return {
        port: port,
        pid: process.pid,
        status: 'starting'
      };

    } catch (error) {
      console.error('[IDEStarter] Failed to start IDE:', error);
      throw error;
    }
  }

  async stopIDE(port) {
    console.log('[IDEStarter] Stopping IDE on port', port);
    
    const process = this.runningProcesses.get(port);
    if (!process) {
      throw new Error(`No IDE running on port ${port}`);
    }

    try {
      process.kill('SIGTERM');
      
      // Wait for process to terminate
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`IDE ${port} did not terminate within 5 seconds`));
        }, 5000);

        process.on('close', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.runningProcesses.delete(port);
      console.log('[IDEStarter] IDE stopped successfully on port', port);
      
    } catch (error) {
      console.error('[IDEStarter] Error stopping IDE:', error);
      // Force kill if graceful shutdown fails
      try {
        process.kill('SIGKILL');
        this.runningProcesses.delete(port);
      } catch (killError) {
        console.error('[IDEStarter] Failed to force kill IDE:', killError);
      }
      throw error;
    }
  }

  async stopAllIDEs() {
    console.log('[IDEStarter] Stopping all IDEs');
    
    const ports = Array.from(this.runningProcesses.keys());
    const promises = ports.map(port => this.stopIDE(port));
    
    await Promise.allSettled(promises);
    console.log('[IDEStarter] All IDEs stopped');
  }

  getRunningIDEs() {
    return Array.from(this.runningProcesses.entries()).map(([port, process]) => ({
      port: port,
      pid: process.pid,
      status: 'running'
    }));
  }

  isIDERunning(port) {
    return this.runningProcesses.has(port);
  }
}

module.exports = IDEStarter; 