const IDEDetector = require('./IDEDetector');
const IDEStarter = require('./IDEStarter');

class IDEManager {
  constructor() {
    this.detector = new IDEDetector();
    this.starter = new IDEStarter();
    this.activePort = null;
    this.ideStatus = new Map(); // port -> status
  }

  async initialize() {
    console.log('[IDEManager] Initializing...');
    
    // Scan for existing IDEs
    const existingIDEs = await this.detector.scanForIDEs();
    existingIDEs.forEach(ide => {
      this.ideStatus.set(ide.port, ide.status);
    });

    // Set first available IDE as active
    if (existingIDEs.length > 0) {
      this.activePort = existingIDEs[0].port;
      console.log('[IDEManager] Set active IDE to port', this.activePort);
    }

    console.log('[IDEManager] Initialization complete. Found', existingIDEs.length, 'IDEs');
  }

  async getAvailableIDEs() {
    const detectedIDEs = await this.detector.scanForIDEs();
    const startedIDEs = this.starter.getRunningIDEs();
    
    // Merge detected and started IDEs
    const allIDEs = new Map();
    
    detectedIDEs.forEach(ide => {
      allIDEs.set(ide.port, {
        ...ide,
        source: 'detected'
      });
    });
    
    startedIDEs.forEach(ide => {
      allIDEs.set(ide.port, {
        ...ide,
        source: 'started'
      });
    });

    return Array.from(allIDEs.values());
  }

  async startNewIDE(workspacePath = null) {
    console.log('[IDEManager] Starting new IDE...');
    
    const availablePort = await this.detector.findAvailablePort();
    const ideInfo = await this.starter.startIDE(availablePort, workspacePath);
    
    this.ideStatus.set(availablePort, 'starting');
    
    // Wait for IDE to be ready
    await this.waitForIDE(availablePort);
    
    this.ideStatus.set(availablePort, 'running');
    
    // Set as active if no active IDE
    if (!this.activePort) {
      this.activePort = availablePort;
    }
    
    console.log('[IDEManager] New IDE started on port', availablePort);
    return ideInfo;
  }

  async switchToIDE(port) {
    console.log('[IDEManager] Switching to IDE on port', port);
    
    const availableIDEs = await this.getAvailableIDEs();
    const targetIDE = availableIDEs.find(ide => ide.port === port);
    
    if (!targetIDE) {
      throw new Error(`No IDE found on port ${port}`);
    }
    
    if (targetIDE.status !== 'running') {
      throw new Error(`IDE on port ${port} is not running`);
    }
    
    this.activePort = port;
    console.log('[IDEManager] Switched to IDE on port', port);
    
    return {
      port: port,
      status: 'active'
    };
  }

  async stopIDE(port) {
    console.log('[IDEManager] Stopping IDE on port', port);
    
    // Stop the IDE process
    await this.starter.stopIDE(port);
    
    // Update status
    this.ideStatus.delete(port);
    
    // If this was the active IDE, switch to another one
    if (this.activePort === port) {
      const availableIDEs = await this.getAvailableIDEs();
      if (availableIDEs.length > 0) {
        this.activePort = availableIDEs[0].port;
        console.log('[IDEManager] Switched active IDE to port', this.activePort);
      } else {
        this.activePort = null;
        console.log('[IDEManager] No active IDE available');
      }
    }
    
    return { port, status: 'stopped' };
  }

  async stopAllIDEs() {
    console.log('[IDEManager] Stopping all IDEs...');
    
    await this.starter.stopAllIDEs();
    this.ideStatus.clear();
    this.activePort = null;
    
    console.log('[IDEManager] All IDEs stopped');
  }

  getActivePort() {
    return this.activePort;
  }

  async getActiveIDE() {
    if (!this.activePort) {
      return null;
    }
    
    const availableIDEs = await this.getAvailableIDEs();
    return availableIDEs.find(ide => ide.port === this.activePort) || null;
  }

  async waitForIDE(port, maxAttempts = 30) {
    console.log('[IDEManager] Waiting for IDE on port', port, 'to be ready...');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const isAvailable = await this.detector.checkPort(port);
        if (isAvailable) {
          console.log('[IDEManager] IDE on port', port, 'is ready');
          return true;
        }
      } catch (error) {
        // Ignore errors during startup
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`IDE on port ${port} did not become ready within ${maxAttempts} seconds`);
  }

  async refreshIDEList() {
    console.log('[IDEManager] Refreshing IDE list...');
    
    const availableIDEs = await this.getAvailableIDEs();
    
    // Update status map
    this.ideStatus.clear();
    availableIDEs.forEach(ide => {
      this.ideStatus.set(ide.port, ide.status);
    });
    
    // Check if active IDE is still available
    if (this.activePort && !availableIDEs.find(ide => ide.port === this.activePort)) {
      console.log('[IDEManager] Active IDE no longer available, switching...');
      if (availableIDEs.length > 0) {
        this.activePort = availableIDEs[0].port;
      } else {
        this.activePort = null;
      }
    }
    
    return availableIDEs;
  }

  getStatus() {
    return {
      activePort: this.activePort,
      totalIDEs: this.ideStatus.size,
      ideStatus: Object.fromEntries(this.ideStatus)
    };
  }
}

module.exports = IDEManager; 