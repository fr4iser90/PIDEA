const net = require('net');
const http = require('http');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');


class VSCodeDetector {
  constructor() {
    this.portRange = { start: 9232, end: 9241 }; // VSCode-specific port range
    this.scanTimeout = 1000; // 1 second timeout per port
  }

  async scanForVSCodeInstances() {
    logger.info('[VSCodeDetector] Scanning for VSCode instances on ports', this.portRange.start, 'to', this.portRange.end);
    
    const availableVSCodeInstances = [];
    const promises = [];

    for (let port = this.portRange.start; port <= this.portRange.end; port++) {
      promises.push(this.checkVSCodePort(port));
    }

    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      const port = this.portRange.start + index;
      if (result.status === 'fulfilled' && result.value) {
        availableVSCodeInstances.push({
          port: port,
          status: 'running',
          url: `http://127.0.0.1:${port}`,
          ideType: 'vscode'
        });
      }
    });

    logger.info('[VSCodeDetector] Found', availableVSCodeInstances.length, 'running VSCode instances:', 
      availableVSCodeInstances.map(ide => ({ port: ide.port, status: ide.status, url: ide.url })));
    return availableVSCodeInstances;
  }

  async checkVSCodePort(port) {
    // HTTP-based detection: query /json/version endpoint
    return new Promise((resolve) => {
      const req = http.get({ 
        hostname: '127.0.0.1', 
        port, 
        path: '/json/version', 
        timeout: this.scanTimeout 
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            // Check for VSCode-specific indicators
            if (json.Browser && json.webSocketDebuggerUrl) {
              // Check for VSCode-specific user agent patterns
              const browserString = json.Browser.toLowerCase();
              const userAgent = json['User-Agent'] || '';
              
              // VSCode indicators: "Code/" in browser or "Code/" in user agent
              if (browserString.includes('code/') || 
                  userAgent.toLowerCase().includes('code/') ||
                  userAgent.toLowerCase().includes('electron')) {
                logger.info(`[VSCodeDetector] Found VSCode on port ${port}:`, json.Browser);
                resolve(true);
              } else {
                logger.info(`[VSCodeDetector] Port ${port} has CDP but not VSCode:`, json.Browser);
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

  async findAvailableVSCodePort() {
    const runningVSCodeInstances = await this.scanForVSCodeInstances();
    const usedPorts = runningVSCodeInstances.map(ide => ide.port);
    
    for (let port = this.portRange.start; port <= this.portRange.end; port++) {
      if (!usedPorts.includes(port)) {
        return port;
      }
    }
    
    throw new Error('No available ports in range 9232-9241 for VSCode');
  }

  async isVSCodePortAvailable(port) {
    return !(await this.checkVSCodePort(port));
  }

  async detectVSCodeExtensions(port) {
    try {
      // This would require additional CDP commands to detect installed extensions
      // For now, return a placeholder
      return {
        port,
        extensions: [],
        detected: false,
        message: 'Extension detection not yet implemented'
      };
    } catch (error) {
      logger.error('[VSCodeDetector] Error detecting VSCode extensions:', error);
      return {
        port,
        extensions: [],
        detected: false,
        error: error.message
      };
    }
  }
}

module.exports = VSCodeDetector; 