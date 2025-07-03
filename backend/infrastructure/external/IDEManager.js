const IDEDetector = require('./IDEDetector');
const IDEStarter = require('./IDEStarter');
const FileBasedWorkspaceDetector = require('../../domain/services/workspace/FileBasedWorkspaceDetector');
const fs = require('fs');
const path = require('path');

class IDEManager {
  constructor(browserManager = null) {
    this.detector = new IDEDetector();
    this.starter = new IDEStarter();
    this.browserManager = browserManager;
    this.fileDetector = browserManager ? new FileBasedWorkspaceDetector(browserManager) : null;
    this.activePort = null;
    this.ideStatus = new Map(); // port -> status
    this.ideWorkspaces = new Map(); // port -> workspace path
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

    // Detect workspace paths ONCE during initialization
    if (existingIDEs.length > 0) {
      console.log('[IDEManager] Detecting workspace paths for', existingIDEs.length, 'IDEs (ONCE during startup)');
      for (const ide of existingIDEs) {
        if (!this.ideWorkspaces.has(ide.port)) {
          try {
            await this.detectWorkspacePath(ide.port);
            const workspacePath = this.ideWorkspaces.get(ide.port);
            if (workspacePath) {
              console.log('[IDEManager] Detected workspace path for port', ide.port, ':', workspacePath);
            }
          } catch (error) {
            console.log('[IDEManager] Could not detect workspace path for port', ide.port, ':', error.message);
          }
        }
      }
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
        source: 'detected',
        workspacePath: this.ideWorkspaces.get(ide.port) || null,
        active: ide.port === this.activePort
      });
    });
    
    startedIDEs.forEach(ide => {
      allIDEs.set(ide.port, {
        ...ide,
        source: 'started',
        workspacePath: this.ideWorkspaces.get(ide.port) || null,
        active: ide.port === this.activePort
      });
    });

    return Array.from(allIDEs.values());
  }

  async startNewIDE(workspacePath = null) {
    console.log('[IDEManager] Starting new IDE...');
    
    // If no workspace path provided, use the project root (one level up from backend)
    if (!workspacePath) {
      const currentDir = process.cwd();
      const projectRoot = path.resolve(currentDir, '..');
      workspacePath = projectRoot;
      console.log('[IDEManager] No workspace path provided, using project root:', workspacePath);
    }
    
    const availablePort = await this.detector.findAvailablePort();
    const ideInfo = await this.starter.startIDE(availablePort, workspacePath);
    
    this.ideStatus.set(availablePort, 'starting');
    
    // Track workspace path
    this.ideWorkspaces.set(availablePort, workspacePath);
    console.log('[IDEManager] Tracked workspace path for port', availablePort, ':', workspacePath);
    
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
    
    const previousPort = this.activePort;
    this.activePort = port;
    console.log('[IDEManager] Switched to IDE on port', port);
    
    return {
      port: port,
      status: 'active',
      workspacePath: this.ideWorkspaces.get(port) || null,
      previousPort: previousPort
    };
  }

  async stopIDE(port) {
    console.log('[IDEManager] Stopping IDE on port', port);
    
    // Stop the IDE process
    await this.starter.stopIDE(port);
    
    // Update status and remove workspace tracking
    this.ideStatus.delete(port);
    this.ideWorkspaces.delete(port);
    
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
    this.ideWorkspaces.clear();
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
    const activeIDE = availableIDEs.find(ide => ide.port === this.activePort);
    
    if (activeIDE) {
      activeIDE.workspacePath = this.ideWorkspaces.get(this.activePort) || null;
    }
    
    return activeIDE;
  }

  // New method to get workspace path for a specific IDE
  getWorkspacePath(port) {
    return this.ideWorkspaces.get(port) || null;
  }

  // New method to get active workspace path
  getActiveWorkspacePath() {
    if (!this.activePort) {
      return null;
    }
    return this.ideWorkspaces.get(this.activePort) || null;
  }

  // FILE-BASIERTE WORKSPACE-ERKENNUNG
  // Nur ausführen wenn noch keine Workspace-Pfad gespeichert ist
  async detectWorkspacePath(port) {
    try {
      // Prüfe Cache zuerst
      if (this.ideWorkspaces.has(port)) {
        console.log('[IDEManager] Workspace path already cached for port', port, ':', this.ideWorkspaces.get(port));
        return this.ideWorkspaces.get(port);
      }
      
      console.log('[IDEManager] Starting file-based workspace detection for port', port);
      
      // File-basierte Methode
      if (this.fileDetector) {
        try {
          // Switch to target port
          if (this.browserManager) {
            await this.browserManager.switchToPort(port);
          }
          
          // Workspace-Info über File-Output (nur wenn keine Daten vorhanden)
          const workspaceInfo = await this.fileDetector.getWorkspaceInfo(port);
          
          if (workspaceInfo && workspaceInfo.workspace) {
            console.log('[IDEManager] File-based detected workspace path for port', port, ':', workspaceInfo.workspace);
            this.ideWorkspaces.set(port, workspaceInfo.workspace);
            return workspaceInfo.workspace;
          }
        } catch (error) {
          console.log('[IDEManager] File-based detection failed for port', port, ':', error.message);
        }
      }
      
      console.log('[IDEManager] No workspace path detected for port', port);
      return null;
    } catch (error) {
      console.log('[IDEManager] Error in workspace detection for port', port, ':', error.message);
    }
    return null;
  }

  // New method to set workspace path for an IDE
  setWorkspacePath(port, workspacePath) {
    this.ideWorkspaces.set(port, workspacePath);
    console.log('[IDEManager] Set workspace path for port', port, ':', workspacePath);
  }

  // FILE-BASIERTE METHODEN
  async getWorkspaceInfo(port) {
    if (!this.fileDetector) {
      console.error('[IDEManager] File detector not available');
      return null;
    }
    
    try {
      // Switch to target port
      if (this.browserManager) {
        await this.browserManager.switchToPort(port);
      }
      
      return await this.fileDetector.getWorkspaceInfo(port);
    } catch (error) {
      console.error('[IDEManager] Error getting workspace info for port', port, ':', error.message);
      return null;
    }
  }

  async getFilesList(port) {
    if (!this.fileDetector) {
      console.error('[IDEManager] File detector not available');
      return [];
    }
    
    try {
      // Switch to target port
      if (this.browserManager) {
        await this.browserManager.switchToPort(port);
      }
      
      return await this.fileDetector.getFilesList(port);
    } catch (error) {
      console.error('[IDEManager] Error getting files list for port', port, ':', error.message);
      return [];
    }
  }

  async getGitStatus(port) {
    if (!this.fileDetector) {
      console.error('[IDEManager] File detector not available');
      return null;
    }
    
    try {
      // Switch to target port
      if (this.browserManager) {
        await this.browserManager.switchToPort(port);
      }
      
      return await this.fileDetector.getGitStatus(port);
    } catch (error) {
      console.error('[IDEManager] Error getting git status for port', port, ':', error.message);
      return null;
    }
  }

  async executeTerminalCommand(port, command, outputFile = null) {
    if (!this.fileDetector) {
      console.error('[IDEManager] File detector not available');
      return null;
    }
    
    try {
      // Switch to target port
      if (this.browserManager) {
        await this.browserManager.switchToPort(port);
      }
      
      return await this.fileDetector.executeCommand(port, command, outputFile);
    } catch (error) {
      console.error('[IDEManager] Error executing terminal command for port', port, ':', error.message);
      return null;
    }
  }

  // FILE DETECTOR STATUS
  getFileDetectorStatus() {
    if (!this.fileDetector) {
      return { available: false, error: 'File detector not initialized' };
    }
    
    return {
      available: true,
      cacheStatus: this.fileDetector.getCacheStatus(),
      fileStructureStatus: this.fileDetector.getFileStructureStatus()
    };
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
      ideStatus: Object.fromEntries(this.ideStatus),
      workspacePaths: Object.fromEntries(this.ideWorkspaces)
    };
  }

  // New method to detect workspace paths for all IDEs
  // Nur für IDEs ohne bereits gespeicherte Workspace-Pfade
  async detectWorkspacePathsForAllIDEs() {
    const availableIDEs = await this.detector.scanForIDEs();
    const startedIDEs = this.starter.getRunningIDEs();
    const allIDEs = [...availableIDEs, ...startedIDEs];
    
    // Filtere IDEs die bereits Workspace-Pfade haben
    const idesWithoutWorkspace = allIDEs.filter(ide => !this.ideWorkspaces.has(ide.port));
    
    if (idesWithoutWorkspace.length === 0) {
      console.log('[IDEManager] All IDEs already have workspace paths, skipping detection');
      return;
    }
    
    console.log(`[IDEManager] Detecting workspace paths for ${idesWithoutWorkspace.length} IDEs (${allIDEs.length - idesWithoutWorkspace.length} already have paths)`);
    
    for (const ide of idesWithoutWorkspace) {
      try {
        await this.detectWorkspacePath(ide.port);
      } catch (error) {
        console.log('[IDEManager] Could not detect workspace path for port', ide.port, ':', error.message);
      }
    }
  }

  // Cleanup method for graceful shutdown
  async cleanup() {
    console.log('[IDEManager] Cleaning up...');
    try {
      await this.stopAllIDEs();
    } catch (error) {
      console.log('[IDEManager] Error during cleanup:', error.message);
    }
  }
}

module.exports = IDEManager; 