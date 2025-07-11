/**
 * IDE Manager
 * Unified IDE management using factory pattern
 * Provides high-level interface for IDE detection, startup, and management
 */

const IDEDetectorFactory = require('./IDEDetectorFactory');
const IDEStarterFactory = require('./IDEStarterFactory');
const IDEConfigManager = require('./IDEConfigManager');
const IDEHealthMonitor = require('./IDEHealthMonitor');
const path = require('path');
const FileBasedWorkspaceDetector = require('../../../domain/services/workspace/FileBasedWorkspaceDetector');

class IDEManager {
  constructor(browserManager = null) {
    // Initialize factories
    this.detectorFactory = new IDEDetectorFactory();
    this.starterFactory = new IDEStarterFactory();
    
    // Initialize configuration and health monitoring
    this.configManager = new IDEConfigManager();
    this.healthMonitor = new IDEHealthMonitor(this.configManager);
    
    // Initialize workspace detection (only if browserManager is provided)
    this.fileDetector = null;
    this.browserManager = browserManager;
    
    if (browserManager) {
      try {
        this.fileDetector = new FileBasedWorkspaceDetector(browserManager);
      } catch (error) {
        console.warn('[IDEManager] Could not initialize FileBasedWorkspaceDetector:', error.message);
      }
    }
    
    // State management
    this.activePort = null;
    this.ideStatus = new Map(); // port -> status
    this.ideWorkspaces = new Map(); // port -> workspace path
    this.ideTypes = new Map(); // port -> ide type
    this.initialized = false;
  }

  /**
   * Initialize the IDE manager
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      console.log('[IDEManager] Already initialized');
      return;
    }

    console.log('[IDEManager] Initializing...');
    
    try {
      // Load configuration
      await this.configManager.loadConfig();
      
      // Scan for existing IDEs
      const existingIDEs = await this.detectorFactory.detectAll() || [];
      existingIDEs.forEach(ide => {
        this.ideStatus.set(ide.port, ide.status);
        this.ideTypes.set(ide.port, ide.ideType);
        
        // Register for health monitoring
        if (this.healthMonitor && typeof this.healthMonitor.registerIDE === 'function') {
          this.healthMonitor.registerIDE(ide.port, ide.ideType);
        }
      });

      // Set first available IDE as active
      if (existingIDEs.length > 0) {
        this.activePort = existingIDEs[0].port;
        console.log('[IDEManager] Set active IDE to port', this.activePort);
      }

      // Detect workspace paths for existing IDEs
      if (existingIDEs.length > 0) {
        console.log('[IDEManager] Detecting workspace paths for', existingIDEs.length, 'IDEs');
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

      // Start health monitoring
      await this.healthMonitor.startMonitoring();

      this.initialized = true;
      console.log('[IDEManager] Initialization complete. Found', existingIDEs.length, 'IDEs');
    } catch (error) {
      console.error('[IDEManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get all available IDEs
   * @returns {Promise<Array>} Array of available IDEs
   */
  async getAvailableIDEs() {
    if (!this.initialized) {
      await this.initialize();
    }

    const detectedIDEs = await this.detectorFactory.detectAll() || [];
    const startedIDEs = this.starterFactory.getRunningIDEs() || [];
    
    // Merge detected and started IDEs
    const allIDEs = new Map();
    
    detectedIDEs.forEach(ide => {
      allIDEs.set(ide.port, {
        ...ide,
        source: 'detected',
        workspacePath: this.ideWorkspaces.get(ide.port) || null,
        ideType: this.ideTypes.get(ide.port) || ide.ideType || 'cursor',
        active: ide.port === this.activePort,
        healthStatus: this.healthMonitor && typeof this.healthMonitor.getIDEHealthStatus === 'function' 
          ? this.healthMonitor.getIDEHealthStatus(ide.port) 
          : null
      });
    });
    
    startedIDEs.forEach(ide => {
      allIDEs.set(ide.port, {
        ...ide,
        source: 'started',
        workspacePath: this.ideWorkspaces.get(ide.port) || null,
        ideType: this.ideTypes.get(ide.port) || ide.ideType || 'cursor',
        active: ide.port === this.activePort,
        healthStatus: this.healthMonitor && typeof this.healthMonitor.getIDEHealthStatus === 'function' 
          ? this.healthMonitor.getIDEHealthStatus(ide.port) 
          : null
      });
    });

    return Array.from(allIDEs.values());
  }

  /**
   * Start new IDE
   * @param {string} workspacePath - Workspace path
   * @param {string} ideType - IDE type
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} IDE startup information
   */
  async startNewIDE(workspacePath = null, ideType = 'cursor', options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log('[IDEManager] Starting new', ideType, 'IDE...');
    
    // Check if IDE type is enabled
    if (this.configManager && typeof this.configManager.isIDEEnabled === 'function' && !this.configManager.isIDEEnabled(ideType)) {
      throw new Error(`IDE type ${ideType} is not enabled in configuration`);
    }

    // If no workspace path provided, use the project root
    if (!workspacePath) {
      const currentDir = process.cwd();
      const projectRoot = path.resolve(currentDir, '..');
      workspacePath = projectRoot;
      console.log('[IDEManager] No workspace path provided, using project root:', workspacePath);
    }
    
    // Get IDE configuration
    const ideConfig = this.configManager && typeof this.configManager.getIDEConfig === 'function' 
      ? this.configManager.getIDEConfig(ideType) 
      : { defaultOptions: {} };
    
    // Find available port
    const availablePort = await this.detectorFactory.findAvailablePort(ideType);
    
    // Merge options with default options
    const mergedOptions = {
      ...ideConfig.defaultOptions,
      ...options
    };
    
    // Start IDE
    const ideInfo = await this.starterFactory.startIDE(ideType, availablePort, workspacePath, mergedOptions);
    
    // Update state
    this.ideStatus.set(availablePort, 'starting');
    this.ideWorkspaces.set(availablePort, workspacePath);
    this.ideTypes.set(availablePort, ideType);
    
    // Register for health monitoring
    if (this.healthMonitor && typeof this.healthMonitor.registerIDE === 'function') {
      this.healthMonitor.registerIDE(availablePort, ideType);
    }
    
    console.log('[IDEManager] Tracked workspace path for port', availablePort, ':', workspacePath, 'IDE type:', ideType);
    
    // Wait for IDE to be ready
    await this.waitForIDE(availablePort);
    
    this.ideStatus.set(availablePort, 'running');
    
    // Set as active if no active IDE
    if (!this.activePort) {
      this.activePort = availablePort;
    }
    
    console.log('[IDEManager] New', ideType, 'IDE started on port', availablePort);
    return ideInfo;
  }

  /**
   * Switch to IDE
   * @param {number} port - IDE port
   * @returns {Promise<Object>} Switch result
   */
  async switchToIDE(port) {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log('[IDEManager] Switching to IDE on port', port);
    
    const availableIDEs = await this.getAvailableIDEs();
    console.log('[IDEManager] Available IDEs:', availableIDEs.map(ide => ({ port: ide.port, status: ide.status, active: ide.active })));
    
    const targetIDE = availableIDEs.find(ide => ide.port === port);
    console.log('[IDEManager] Target IDE found:', targetIDE ? { port: targetIDE.port, status: targetIDE.status } : 'NOT FOUND');
    
    if (!targetIDE) {
      throw new Error(`No IDE found on port ${port}`);
    }
    
    if (targetIDE.status !== 'running') {
      throw new Error(`IDE on port ${port} is not running`);
    }
    
    const previousPort = this.activePort;
    this.activePort = port;
    console.log('[IDEManager] Previous active port:', previousPort);
    console.log('[IDEManager] New active port:', this.activePort);
    console.log('[IDEManager] Successfully switched to IDE on port', port);
    
    return {
      port: port,
      status: 'active',
      workspacePath: this.ideWorkspaces.get(port) || null,
      previousPort: previousPort
    };
  }

  /**
   * Stop IDE
   * @param {number} port - IDE port
   * @returns {Promise<Object>} Stop result
   */
  async stopIDE(port) {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log('[IDEManager] Stopping IDE on port', port);
    
    const ideType = this.ideTypes.get(port) || 'cursor';
    
    // Stop the IDE process
    await this.starterFactory.stopIDE(port, ideType);
    
    // Update status and remove tracking
    this.ideStatus.delete(port);
    this.ideWorkspaces.delete(port);
    this.ideTypes.delete(port);
    
    // Unregister from health monitoring
    if (this.healthMonitor && typeof this.healthMonitor.unregisterIDE === 'function') {
      this.healthMonitor.unregisterIDE(port);
    }
    
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
    
    return { port, status: 'stopped', ideType };
  }

  /**
   * Get active IDE
   * @returns {Promise<Object|null>} Active IDE information
   */
  async getActiveIDE() {
    if (!this.initialized) {
      await this.initialize();
    }

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

  /**
   * Get IDE type for port
   * @param {number} port - IDE port
   * @returns {string} IDE type
   */
  getIDEType(port) {
    return this.ideTypes.get(port) || null;
  }

  /**
   * Detect workspace path for IDE
   * @param {number} port - IDE port
   * @returns {Promise<string|null>} Workspace path or null
   */
  async detectWorkspacePath(port) {
    try {
      // Check cache first
      if (this.ideWorkspaces.has(port)) {
        console.log('[IDEManager] Workspace path already cached for port', port, ':', this.ideWorkspaces.get(port));
        return this.ideWorkspaces.get(port);
      }
      
      console.log('[IDEManager] Starting file-based workspace detection for port', port);
      
      // File-based method
      if (this.fileDetector) {
        try {
          // Switch to target port
          if (this.browserManager) {
            await this.browserManager.switchToPort(port);
          }
          
          // Get workspace info
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

  /**
   * Get workspace info for IDE
   * @param {number} port - IDE port
   * @returns {Promise<Object|null>} Workspace information
   */
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

  /**
   * Get files list for IDE
   * @param {number} port - IDE port
   * @returns {Promise<Array>} Files list
   */
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

  /**
   * Wait for IDE to be ready
   * @param {number} port - IDE port
   * @param {number} maxAttempts - Maximum attempts
   * @returns {Promise<boolean>} True if IDE is ready
   */
  async waitForIDE(port, maxAttempts = 30) {
    console.log('[IDEManager] Waiting for IDE on port', port, 'to be ready...');
    
    const ideType = this.ideTypes.get(port) || 'cursor';
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const isAvailable = await this.detectorFactory.checkPort(port, ideType);
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

  /**
   * Refresh IDE list
   * @returns {Promise<Array>} Updated IDE list
   */
  async refreshIDEList() {
    if (!this.initialized) {
      await this.initialize();
    }

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

  /**
   * Get manager statistics
   * @returns {Object} Manager statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      activePort: this.activePort,
      totalIDEs: this.ideStatus.size,
      runningIDEs: Array.from(this.ideStatus.values()).filter(status => status === 'running').length,
      detectorStats: this.detectorFactory.getDetectorStats(),
      starterStats: this.starterFactory.getStarterStats(),
      configStats: this.configManager.getConfigStats(),
      healthStats: this.healthMonitor.getHealthStats()
    };
  }

  /**
   * Shutdown the IDE manager
   * @returns {Promise<void>}
   */
  async shutdown() {
    console.log('[IDEManager] Shutting down...');
    
    // Stop health monitoring
    this.healthMonitor.stopMonitoring();
    
    // Stop all running IDEs
    await this.starterFactory.stopAllIDEs();
    
    // Clear state
    this.ideStatus.clear();
    this.ideWorkspaces.clear();
    this.ideTypes.clear();
    this.activePort = null;
    this.initialized = false;
    
    console.log('[IDEManager] Shutdown complete');
  }

  /**
   * Stop all IDEs
   * @returns {Promise<void>}
   */
  async stopAllIDEs() {
    console.log('[IDEManager] Stopping all IDEs...');
    await this.starterFactory.stopAllIDEs();
    
    // Clear state
    this.ideStatus.clear();
    this.ideWorkspaces.clear();
    this.ideTypes.clear();
    this.activePort = null;
    
    console.log('[IDEManager] All IDEs stopped');
  }

  /**
   * Get active port
   * @returns {number|null} Active port
   */
  getActivePort() {
    return this.activePort;
  }

  /**
   * Get workspace path for port
   * @param {number} port - IDE port
   * @returns {string|null} Workspace path
   */
  getWorkspacePath(port) {
    return this.ideWorkspaces.get(port) || null;
  }

  /**
   * Get active workspace path
   * @returns {string|null} Active workspace path
   */
  getActiveWorkspacePath() {
    if (!this.activePort) {
      return null;
    }
    return this.ideWorkspaces.get(this.activePort) || null;
  }

  /**
   * Get manager status
   * @returns {Object} Manager status
   */
  getStatus() {
    return {
      activePort: this.activePort,
      totalIDEs: this.ideStatus.size,
      runningIDEs: Array.from(this.ideStatus.values()).filter(status => status === 'running').length,
      initialized: this.initialized,
      healthMonitoring: this.healthMonitor && typeof this.healthMonitor.isMonitoring === 'function' 
        ? this.healthMonitor.isMonitoring() 
        : false,
      ideTypes: Array.from(this.ideTypes.values()),
      workspaces: Array.from(this.ideWorkspaces.values())
    };
  }

  /**
   * Cleanup resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    console.log('[IDEManager] Cleaning up...');
    
    // Stop health monitoring
    if (this.healthMonitor && typeof this.healthMonitor.stopMonitoring === 'function') {
      this.healthMonitor.stopMonitoring();
    }
    
    // Save configuration
    if (this.configManager && typeof this.configManager.saveConfig === 'function') {
      this.configManager.saveConfig();
    }
    
    console.log('[IDEManager] Cleanup complete');
  }
}

module.exports = IDEManager; 