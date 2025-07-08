const { spawn } = require('child_process');
const path = require('path');
const VSCodeStarter = require('./VSCodeStarter');

class IDEStarter {
  constructor() {
    this.runningProcesses = new Map(); // port -> process
    this.vscodeStarter = new VSCodeStarter();
  }

  async startIDE(port, workspacePath = null, ideType = 'cursor') {
    if (ideType === 'vscode') {
      return await this.startVSCode(port, workspacePath);
    }
    
    return await this.startCursorIDE(port, workspacePath);
  }

  async startCursorIDE(port, workspacePath = null) {
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
        console.log(`[IDEStarter] Cursor IDE ${port} stdout:`, data.toString().trim());
      });

      process.stderr.on('data', (data) => {
        console.log(`[IDEStarter] Cursor IDE ${port} stderr:`, data.toString().trim());
      });

      process.on('close', (code) => {
        console.log(`[IDEStarter] Cursor IDE ${port} process closed with code ${code}`);
        this.runningProcesses.delete(port);
      });

      process.on('error', (error) => {
        console.error(`[IDEStarter] Cursor IDE ${port} process error:`, error);
        this.runningProcesses.delete(port);
      });

      // Wait a bit for the IDE to start
      await new Promise(resolve => setTimeout(resolve, 3000));

      return {
        port: port,
        pid: process.pid,
        status: 'starting',
        ideType: 'cursor'
      };

    } catch (error) {
      console.error('[IDEStarter] Failed to start Cursor IDE:', error);
      throw error;
    }
  }

  async startVSCode(port, workspacePath = null) {
    return await this.vscodeStarter.startVSCode(port, workspacePath);
  }

  async stopIDE(port, ideType = 'cursor') {
    if (ideType === 'vscode') {
      return await this.vscodeStarter.stopVSCode(port);
    }
    
    console.log('[IDEStarter] Stopping Cursor IDE on port', port);
    
    const process = this.runningProcesses.get(port);
    if (!process) {
      throw new Error(`No Cursor IDE running on port ${port}`);
    }

    try {
      process.kill('SIGTERM');
      
      // Wait for process to terminate
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Cursor IDE ${port} did not terminate within 5 seconds`));
        }, 5000);

        process.on('close', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.runningProcesses.delete(port);
      console.log('[IDEStarter] Cursor IDE stopped successfully on port', port);
      
    } catch (error) {
      console.error('[IDEStarter] Error stopping Cursor IDE:', error);
      // Force kill if graceful shutdown fails
      try {
        process.kill('SIGKILL');
        this.runningProcesses.delete(port);
      } catch (killError) {
        console.error('[IDEStarter] Failed to force kill Cursor IDE:', killError);
      }
      throw error;
    }
  }

  async stopAllIDEs() {
    console.log('[IDEStarter] Stopping all IDEs');
    
    // Stop Cursor IDEs
    const cursorPorts = Array.from(this.runningProcesses.keys());
    const cursorPromises = cursorPorts.map(port => this.stopIDE(port, 'cursor'));
    
    // Stop VSCode IDEs
    const vscodePromises = [this.vscodeStarter.stopAllVSCodeInstances()];
    
    await Promise.allSettled([...cursorPromises, ...vscodePromises]);
    console.log('[IDEStarter] All IDEs stopped');
  }

  getRunningIDEs() {
    const cursorIDEs = Array.from(this.runningProcesses.entries()).map(([port, process]) => ({
      port: port,
      pid: process.pid,
      status: 'running',
      ideType: 'cursor'
    }));
    
    const vscodeIDEs = this.vscodeStarter.getRunningVSCodeInstances();
    
    return [...cursorIDEs, ...vscodeIDEs];
  }

  isIDERunning(port, ideType = 'cursor') {
    if (ideType === 'vscode') {
      return this.vscodeStarter.isVSCodeRunning(port);
    }
    
    return this.runningProcesses.has(port);
  }
}

module.exports = IDEStarter; 