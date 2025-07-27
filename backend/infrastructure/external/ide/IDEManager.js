
/**
 * IDE Manager
 * Unified IDE management using factory pattern
 * Provides high-level interface for IDE detection, startup, and management
 */

const IDEDetectorFactory = require('./IDEDetectorFactory');
const IDEStarterFactory = require('./IDEStarterFactory');
const IDEConfigManager = require('./IDEConfigManager');
const IDEHealthMonitor = require('./IDEHealthMonitor');
const IDEPortManager = require('@domain/services/ide/IDEPortManager');
const path = require('path');
const FileBasedWorkspaceDetector = require('@services/workspace/FileBasedWorkspaceDetector');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('IDEManager');

class IDEManager {
  constructor(browserManager = null, eventBus = null, gitService = null) {
    // Initialize factories
    this.detectorFactory = new IDEDetectorFactory();
    this.starterFactory = new IDEStarterFactory();
    
    // Initialize configuration and health monitoring
    this.configManager = new IDEConfigManager();
    this.healthMonitor = new IDEHealthMonitor(this.configManager);
    
    // Initialize port manager
    this.portManager = new IDEPortManager(this, eventBus);
    
    // Initialize workspace detection (only if browserManager is provided)
    this.fileDetector = null;
    this.browserManager = browserManager;
    this.eventBus = eventBus;
    this.gitService = gitService;
    if (gitService) {
      logger.info('IDEManager: gitService injected and available');
    } else {
      logger.warn('IDEManager: gitService NOT available');
    }
    
    if (browserManager) {
      try {
        this.fileDetector = new FileBasedWorkspaceDetector(browserManager);
      } catch (error) {
        logger.warn('Could not initialize FileBasedWorkspaceDetector:', error.message);
      }
    }
    
    // State management
    this.activePort = null;
    this.ideStatus = new Map(); // port -> status
    this.ideWorkspaces = new Map(); // port -> workspace path
    this.ideTypes = new Map(); // port -> ide type
    this.initialized = false;
    
    // Setup event handlers
    this.setupEventHandlers();
  }
  
  /**
   * Setup event handlers for IDE management
   */
  setupEventHandlers() {
    if (this.eventBus) {
      this.eventBus.subscribe('activeIDEChanged', async (eventData) => {
        logger.info('Received activeIDEChanged event:', eventData);
        if (eventData.port) {
          try {
                    logger.info(`Setting active port from event: ${eventData.port}`);
        this.activePort = eventData.port;
                  logger.info(`Active port set to: ${this.activePort}`);
          } catch (error) {
            logger.error('Failed to set active port from event:', error.message);
          }
        }
      });
    }
  }

  /**
   * Initialize the IDE manager
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      logger.info('Already initialized');
      return;
    }

    logger.info('Initializing...');
    
    try {
      // Load configuration
      await this.configManager.loadConfig();
      
      // Scan for existing IDEs with timeout
      logger.info('Scanning for existing IDEs...');
      const existingIDEs = await this.detectorFactory.detectAll() || [];
      
      logger.info(`Found ${existingIDEs.length} existing IDEs`);
      existingIDEs.forEach(ide => {
        this.ideStatus.set(ide.port, ide.status);
        this.ideTypes.set(ide.port, ide.type || 'cursor');
        logger.info(`Registered IDE: ${ide.type} on port ${ide.port} (${ide.status})`);
      });
      
      // Initialize port manager
      await this.portManager.initialize();
      
      // Set initial active port
      if (existingIDEs.length > 0) {
        this.activePort = existingIDEs[0].port;
        logger.info(`Set initial active port: ${this.activePort}`);
      }
      
      // Register IDEs with health monitoring
      for (const ide of existingIDEs) {
        if (this.healthMonitor && typeof this.healthMonitor.registerIDE === 'function') {
          this.healthMonitor.registerIDE(ide.port, ide.type || 'cursor');
        }
      }
      
      this.initialized = true;
      logger.info('Initialization complete');
      
      // Start workspace detection in background (non-blocking)
      this.detectWorkspacePathsForAllIDEs().catch(error => {
        logger.warn('Background workspace detection failed:', error.message);
      });
      
    } catch (error) {
      logger.error('Initialization failed:', error.message);
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

          logger.info('Starting new', ideType, 'IDE...');
    
    // Check if IDE type is enabled
    if (this.configManager && typeof this.configManager.isIDEEnabled === 'function' && !this.configManager.isIDEEnabled(ideType)) {
      throw new Error(`IDE type ${ideType} is not enabled in configuration`);
    }

    // If no workspace path provided, use the project root
    if (!workspacePath) {
      const currentDir = process.cwd();
      const projectRoot = path.resolve(currentDir, '..');
      workspacePath = projectRoot;
      logger.info('No workspace path provided, using project root:', workspacePath);
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
    
          logger.info('Tracked workspace path for port', availablePort, ':', workspacePath, 'IDE type:', ideType);
    
    // Wait for IDE to be ready
    await this.waitForIDE(availablePort);
    
    this.ideStatus.set(availablePort, 'running');
    
    // Set as active if no active IDE
    if (!this.activePort) {
      this.activePort = availablePort;
    }
    
          logger.info('New', ideType, 'IDE started on port', availablePort);
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

    logger.info(`Switching to IDE on port ${port}`);
    
    // Check if already on correct port
    if (this.activePort === port) {
      logger.info(`Already on port ${port}, no switching needed`);
      return {
        port: port,
        status: 'active',
        alreadyActive: true,
        workspacePath: this.ideWorkspaces.get(port) || null
      };
    }
    
    // Store the previous port before switching
    const previousPort = this.activePort;
    
    // Use port manager to validate and set active port
    const success = await this.portManager.setActivePort(port);
    if (!success) {
      throw new Error(`Failed to switch to IDE on port ${port}`);
    }
    
    // Update local state
    this.activePort = this.portManager.getActivePort();
    
    // Update the active status in ideStatus map
    if (this.ideStatus.has(port)) {
      // Set all IDEs as inactive first
      for (const [idePort] of this.ideStatus) {
        this.ideStatus.set(idePort, 'running');
      }
      // Set the target IDE as active
      this.ideStatus.set(port, 'active');
    }
    
    // Only switch browser manager if necessary
    if (this.browserManager && this.browserManager.getCurrentPort() !== port) {
      try {
        await this.browserManager.switchToPort(port);
        logger.info(`Browser manager switched to port ${port}`);
      } catch (error) {
        logger.warn('Failed to switch browser manager to port', port, ':', error.message);
      }
    } else {
      logger.info(`Browser manager already on port ${port}, no switching needed`);
    }
    
    logger.info(`Successfully switched to IDE on port ${port}`);
    
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

    logger.info('Stopping IDE on port', port);
    
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
        logger.info('Switched active IDE to port', this.activePort);
      } else {
        this.activePort = null;
        logger.info('No active IDE available');
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
        logger.info('Workspace path already cached for port', port, ':', this.ideWorkspaces.get(port));
        return this.ideWorkspaces.get(port);
      }
      
      logger.info(`Starting file-based workspace detection for port ${port}`);
      
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
            logger.info(`File-based detected workspace path for port ${port}: ${workspaceInfo.workspace}`);
            this.ideWorkspaces.set(port, workspaceInfo.workspace);
            
            // AUTOMATISCH Projekt in der DB erstellen
            await this.createProjectInDatabase(workspaceInfo.workspace, port);
            
            return workspaceInfo.workspace;
          }
        } catch (error) {
          logger.info('File-based detection failed for port', port, ':', error.message);
        }
      }
      
              logger.info('No workspace path detected for port', port);
      return null;
    } catch (error) {
              logger.info('Error in workspace detection for port', port, ':', error.message);
    }
    return null;
  }

  /**
   * Detect workspace paths for all available IDEs
   * @returns {Promise<Array>} Array of detection results
   */
  async detectWorkspacePathsForAllIDEs() {
    if (!this.initialized) {
      await this.initialize();
    }

    const availableIDEs = await this.getAvailableIDEs();
    const results = [];

    for (const ide of availableIDEs) {
      if (!this.ideWorkspaces.has(ide.port)) {
        try {
          const workspacePath = await this.detectWorkspacePath(ide.port);
          results.push({
            port: ide.port,
            workspacePath: workspacePath,
            success: workspacePath !== null
          });
        } catch (error) {
          logger.warn(`Failed to detect workspace path for port ${ide.port}: ${error.message}`);
          results.push({
            port: ide.port,
            workspacePath: null,
            success: false,
            error: error.message
          });
        }
      }
    }

    return results;
  }

  /**
   * Get workspace info for IDE
   * @param {number} port - IDE port
   * @returns {Promise<Object|null>} Workspace information
   */
  async getWorkspaceInfo(port) {
    if (!this.fileDetector) {
      logger.error('File detector not available');
      return null;
    }
    
    try {
      // Switch to target port
      if (this.browserManager) {
        await this.browserManager.switchToPort(port);
      }
      
      return await this.fileDetector.getWorkspaceInfo(port);
    } catch (error) {
      logger.error('Error getting workspace info for port', port, ':', error.message);
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
      logger.error('File detector not available');
      return [];
    }
    
    try {
      // Switch to target port
      if (this.browserManager) {
        await this.browserManager.switchToPort(port);
      }
      
      return await this.fileDetector.getFilesList(port);
    } catch (error) {
      logger.error('Error getting files list for port', port, ':', error.message);
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
    logger.info('Waiting for IDE on port', port, 'to be ready...');
    
    const ideType = this.ideTypes.get(port) || 'cursor';
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const isAvailable = await this.detectorFactory.checkPort(port, ideType);
        if (isAvailable) {
          logger.info('IDE on port', port, 'is ready');
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

    logger.info('Refreshing IDE list...');
    
    const availableIDEs = await this.getAvailableIDEs();
    
    // Update status map
    this.ideStatus.clear();
    availableIDEs.forEach(ide => {
      this.ideStatus.set(ide.port, ide.status);
    });
    
    // Check if active IDE is still available
    if (this.activePort && !availableIDEs.find(ide => ide.port === this.activePort)) {
      logger.info('Active IDE no longer available, switching...');
      if (availableIDEs.length > 0) {
        this.activePort = availableIDEs[0].port;
      } else {
        this.activePort = null;
      }
    }
    
    return availableIDEs;
  }

  /**
   * AUTOMATISCH Projekt in der DB erstellen
   * @param {string} workspacePath - Workspace path
   * @param {number} port - IDE port
   */
  async createProjectInDatabase(workspacePath, port) {
    try {
      // Use injected project repository
      if (!this.projectRepository) {
        logger.warn('No project repository available, skipping project creation');
        return;
      }

      // Extract project name from workspace path
      const path = require('path');
      const projectName = path.basename(workspacePath);
      
      // Generate project ID - Keep original case
      const projectId = projectName.replace(/[^a-zA-Z0-9]/g, '_');
      
      // Prüfe, ob das Projekt existiert
      let project = await this.projectRepository.findByWorkspacePath(workspacePath);
      let created = false;
      if (!project) {
        logger.info(`Creating project in database: ${projectId} (${projectName}) at ${workspacePath}`);
        created = true;
      }
    
      // Get IDE type for this port
      const ideType = this.ideTypes.get(port) || 'cursor';
      
      // Create project using findOrCreateByWorkspacePath
      project = await this.projectRepository.findOrCreateByWorkspacePath(workspacePath, {
        id: projectId,
        name: projectName,
        description: `Project detected at ${workspacePath}`,
        type: 'development',
        ideType: ideType,
        port: port,
        metadata: {
          detectedBy: 'IDEManager',
          port: port,
          ideType: ideType,
          detectedAt: new Date().toISOString()
        }
      });
      
      if (created) {
        logger.info(`Project created in database: ${project.id}`);
      } else {
        logger.info(`Project already exists in database: ${project.id}`);
      }
      
    } catch (error) {
      logger.error('Failed to create project in database:', error.message);
    }
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
    logger.info('Shutting down...');
    
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
    
    logger.info('Shutdown complete');
  }

  /**
   * Stop all IDEs
   * @returns {Promise<void>}
   */
  async stopAllIDEs() {
    logger.info('Stopping all IDEs...');
    await this.starterFactory.stopAllIDEs();
    
    // Clear state
    this.ideStatus.clear();
    this.ideWorkspaces.clear();
    this.ideTypes.clear();
    this.activePort = null;
    
    logger.info('All IDEs stopped');
  }

  /**
   * Get active port
   * @returns {number|null} Active port
   */
  getActivePort() {
    // Use port manager as primary source
    if (this.portManager) {
      const portManagerPort = this.portManager.getActivePort();
      if (portManagerPort) {
        this.activePort = portManagerPort;
        return this.activePort;
      }
    }
    
    // Fallback to local state
    if (!this.activePort) {
      for (const [port, status] of this.ideStatus) {
        if (status === 'active') {
          this.activePort = port;
          logger.info(`Found active port from ideStatus: ${this.activePort}`);
          break;
        }
      }
    }
    
    logger.info(`getActivePort() called, returning: ${this.activePort}`);
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
    logger.info('Cleaning up...');
    
    // Stop health monitoring
    if (this.healthMonitor && typeof this.healthMonitor.stopMonitoring === 'function') {
      this.healthMonitor.stopMonitoring();
    }
    
    // Save configuration
    if (this.configManager && typeof this.configManager.saveConfig === 'function') {
      this.configManager.saveConfig();
    }
    
    logger.info('Cleanup complete');
  }
}

module.exports = IDEManager; 