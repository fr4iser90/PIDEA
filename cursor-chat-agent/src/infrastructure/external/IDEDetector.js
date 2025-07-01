const net = require('net');
const http = require('http');

class IDEDetector {
  constructor() {
    this.portRange = { start: 9222, end: 9231 };
    this.scanTimeout = 1000; // 1 second timeout per port
  }

  async scanForIDEs() {
    console.log('[IDEDetector] Scanning for Cursor IDEs on ports', this.portRange.start, 'to', this.portRange.end);
    
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
          url: `http://127.0.0.1:${port}`
        });
      }
    });

    console.log('[IDEDetector] Found', availableIDEs.length, 'running IDEs');
    return availableIDEs;
  }

  async checkPort(port) {
    // HTTP-basierte Erkennung: /json/version abfragen
    return new Promise((resolve) => {
      const req = http.get({ hostname: '127.0.0.1', port, path: '/json/version', timeout: this.scanTimeout }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.Browser && json.webSocketDebuggerUrl) {
              resolve(true);
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

  async findAvailablePort() {
    const runningIDEs = await this.scanForIDEs();
    const usedPorts = runningIDEs.map(ide => ide.port);
    
    for (let port = this.portRange.start; port <= this.portRange.end; port++) {
      if (!usedPorts.includes(port)) {
        return port;
      }
    }
    
    throw new Error('No available ports in range 9222-9231');
  }

  async isPortAvailable(port) {
    return !(await this.checkPort(port));
  }
}

module.exports = IDEDetector; 