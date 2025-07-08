const net = require('net');
const http = require('http');
const VSCodeDetector = require('./VSCodeDetector');

class IDEDetector {
  constructor() {
    this.cursorPortRange = { start: 9222, end: 9231 }; // Cursor port range
    this.vscodePortRange = { start: 9232, end: 9241 }; // VSCode port range
    this.scanTimeout = 1000; // 1 second timeout per port
    this.vscodeDetector = new VSCodeDetector();
  }

  async scanForIDEs() {
    console.log('[IDEDetector] Scanning for all IDEs (Cursor: 9222-9231, VSCode: 9232-9241)');
    
    // Scan for both Cursor and VSCode instances
    const [cursorIDEs, vscodeIDEs] = await Promise.all([
      this.scanForCursorIDEs(),
      this.scanForVSCodeIDEs()
    ]);
    
    const allIDEs = [...cursorIDEs, ...vscodeIDEs];
    
    console.log('[IDEDetector] Found', allIDEs.length, 'running IDEs:', 
      allIDEs.map(ide => ({ port: ide.port, status: ide.status, url: ide.url, ideType: ide.ideType })));
    return allIDEs;
  }

  async scanForCursorIDEs() {
    console.log('[IDEDetector] Scanning for Cursor IDEs on ports', this.cursorPortRange.start, 'to', this.cursorPortRange.end);
    
    const availableIDEs = [];
    const promises = [];

    for (let port = this.cursorPortRange.start; port <= this.cursorPortRange.end; port++) {
      promises.push(this.checkCursorPort(port));
    }

    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      const port = this.cursorPortRange.start + index;
      if (result.status === 'fulfilled' && result.value) {
        availableIDEs.push({
          port: port,
          status: 'running',
          url: `http://127.0.0.1:${port}`,
          ideType: 'cursor'
        });
      }
    });

    console.log('[IDEDetector] Found', availableIDEs.length, 'running Cursor IDEs');
    return availableIDEs;
  }

  async scanForVSCodeIDEs() {
    return await this.vscodeDetector.scanForVSCodeInstances();
  }

  async checkCursorPort(port) {
    // HTTP-based detection: query /json/version endpoint for Cursor
    return new Promise((resolve) => {
      const req = http.get({ hostname: '127.0.0.1', port, path: '/json/version', timeout: this.scanTimeout }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.Browser && json.webSocketDebuggerUrl) {
              // Check if it's Cursor (not VSCode)
              if (!json.Browser.includes('VS Code') && !json.Browser.includes('Code')) {
                resolve(true);
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

  async findAvailablePort(ideType = 'cursor') {
    if (ideType === 'vscode') {
      return await this.vscodeDetector.findAvailableVSCodePort();
    }
    
    // For Cursor or default
    const runningIDEs = await this.scanForCursorIDEs();
    const usedPorts = runningIDEs.map(ide => ide.port);
    
    for (let port = this.cursorPortRange.start; port <= this.cursorPortRange.end; port++) {
      if (!usedPorts.includes(port)) {
        return port;
      }
    }
    
    throw new Error('No available ports in range 9222-9231 for Cursor');
  }

  async isPortAvailable(port, ideType = 'cursor') {
    if (ideType === 'vscode') {
      return await this.vscodeDetector.isVSCodePortAvailable(port);
    }
    
    return !(await this.checkCursorPort(port));
  }

  // Legacy method for backward compatibility
  async checkPort(port) {
    return await this.checkCursorPort(port);
  }
}

module.exports = IDEDetector; 