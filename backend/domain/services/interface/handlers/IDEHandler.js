/**
 * IDE Handler - IDE-specific interface management
 * 
 * Handles IDE-specific operations like start, stop, status, features,
 * configuration, selection, and version management.
 */

const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');

class IDEHandler {
  constructor(dependencies = {}) {
    this.logger = dependencies.logger || new ServiceLogger('IDEHandler');
    this.ideManager = dependencies.ideManager;
    this.eventBus = dependencies.eventBus;
    this.serviceRegistry = dependencies.serviceRegistry;
    
    // IDE services - cursorIDEService, vscodeIDEService, windsurfIDEService removed, using interfaceManager instead
    
    // IDE state
    this.activeIDEs = new Map(); // port -> IDE instance
    this.ideSelection = null;
    this.selectionHistory = [];
  }

  /**
   * Create IDE interface instance
   * @param {Object} config - IDE configuration
   * @param {string} interfaceId - Interface ID
   * @returns {Promise<Object>} IDE interface instance
   */
  async createInterface(config, interfaceId) {
    try {
      const { port, workspacePath, ideType = 'auto' } = config;
      
      this.logger.info(`Creating IDE interface: ${interfaceId}`, {
        port,
        workspacePath,
        ideType
      });

      // Start IDE
      const ideInstance = await this.startIDE(workspacePath, ideType, port);
      
      // Store active IDE
      this.activeIDEs.set(port, {
        id: interfaceId,
        port,
        workspacePath,
        ideType,
        instance: ideInstance,
        status: 'running',
        createdAt: new Date()
      });

      return {
        id: interfaceId,
        type: 'ide',
        port,
        workspacePath,
        ideType,
        status: 'running',
        createdAt: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to create IDE interface:', error);
      throw new Error(`Failed to create IDE interface: ${error.message}`);
    }
  }

  /**
   * Start IDE
   * @param {string} workspacePath - Workspace path
   * @param {string} ideType - IDE type
   * @param {number} port - IDE port
   * @returns {Promise<Object>} IDE startup information
   */
  async startIDE(workspacePath, ideType = 'auto', port = null) {
    try {
      this.logger.info(`Starting IDE: ${ideType} at ${workspacePath}`);

      if (!this.ideManager) {
        throw new Error('IDE Manager not available');
      }

      const result = await this.ideManager.startIDE(workspacePath, ideType, { port });
      
      this.logger.info(`IDE started successfully on port ${result.port}`);
      
      return result;

    } catch (error) {
      this.logger.error('Failed to start IDE:', error);
      throw new Error(`Failed to start IDE: ${error.message}`);
    }
  }

  /**
   * Stop IDE
   * @param {number} port - IDE port
   * @returns {Promise<Object>} Stop result
   */
  async stopIDE(port) {
    try {
      this.logger.info(`Stopping IDE on port ${port}`);

      if (!this.ideManager) {
        throw new Error('IDE Manager not available');
      }

      const result = await this.ideManager.stopIDE(port);
      
      // Remove from active IDEs
      this.activeIDEs.delete(port);
      
      this.logger.info(`IDE stopped successfully on port ${port}`);
      
      return result;

    } catch (error) {
      this.logger.error('Failed to stop IDE:', error);
      throw new Error(`Failed to stop IDE: ${error.message}`);
    }
  }

  /**
   * Get IDE status
   * @param {number} port - IDE port
   * @returns {Promise<Object>} IDE status
   */
  async getIDEStatus(port) {
    try {
      const activeIDE = this.activeIDEs.get(port);
      
      if (!activeIDE) {
        throw new Error(`IDE not found on port ${port}`);
      }

      // Get status from IDE Manager
      const status = await this.ideManager.getIDEStatus(port);
      
      return {
        port,
        status: activeIDE.status,
        workspacePath: activeIDE.workspacePath,
        ideType: activeIDE.ideType,
        uptime: Date.now() - activeIDE.createdAt.getTime(),
        ...status
      };

    } catch (error) {
      this.logger.error('Failed to get IDE status:', error);
      throw new Error(`Failed to get IDE status: ${error.message}`);
    }
  }

  /**
   * Get available IDEs
   * @returns {Promise<Array>} Available IDEs
   */
  async getAvailableIDEs() {
    try {
      if (!this.ideManager) {
        throw new Error('IDE Manager not available');
      }

      const availableIDEs = await this.ideManager.getAvailableIDEs();
      
      return availableIDEs.map(ide => ({
        port: ide.port,
        type: ide.type,
        version: ide.version,
        workspacePath: ide.workspacePath,
        status: ide.status
      }));

    } catch (error) {
      this.logger.error('Failed to get available IDEs:', error);
      throw new Error(`Failed to get available IDEs: ${error.message}`);
    }
  }

  /**
   * Get IDE features
   * @param {number} port - IDE port
   * @returns {Promise<Object>} IDE features
   */
  async getIDEFeatures(port) {
    try {
      const activeIDE = this.activeIDEs.get(port);
      
      if (!activeIDE) {
        throw new Error(`IDE not found on port ${port}`);
      }

      // Get features based on IDE type
      const features = await this.getFeaturesForIDEType(activeIDE.ideType);
      
      return {
        port,
        ideType: activeIDE.ideType,
        features
      };

    } catch (error) {
      this.logger.error('Failed to get IDE features:', error);
      throw new Error(`Failed to get IDE features: ${error.message}`);
    }
  }

  /**
   * Get features for specific IDE type
   * @param {string} ideType - IDE type
   * @returns {Promise<Object>} Features
   */
  async getFeaturesForIDEType(ideType) {
    const baseFeatures = {
      chat: true,
      terminal: true,
      fileExplorer: true,
      git: true,
      extensions: true,
      debugging: true
    };

    switch (ideType.toLowerCase()) {
      case 'cursor':
        return {
          ...baseFeatures,
          aiChat: true,
          codeGeneration: true,
          refactoring: true
        };
      
      case 'vscode':
        return {
          ...baseFeatures,
          marketplace: true,
          themes: true,
          settings: true
        };
      
      case 'windsurf':
        return {
          ...baseFeatures,
          aiAssistance: true,
          codeCompletion: true
        };
      
      default:
        return baseFeatures;
    }
  }

  /**
   * Set IDE selection
   * @param {number} port - IDE port
   * @param {string} reason - Selection reason
   * @returns {Promise<Object>} Selection result
   */
  async setIDESelection(port, reason = 'manual') {
    try {
      const activeIDE = this.activeIDEs.get(port);
      
      if (!activeIDE) {
        throw new Error(`IDE not found on port ${port}`);
      }

      const previousSelection = this.ideSelection;
      this.ideSelection = {
        port,
        ideType: activeIDE.ideType,
        workspacePath: activeIDE.workspacePath,
        selectedAt: new Date(),
        reason
      };

      // Add to history
      this.selectionHistory.unshift({
        port,
        ideType: activeIDE.ideType,
        workspacePath: activeIDE.workspacePath,
        selectedAt: new Date(),
        reason
      });

      // Keep only last 10 selections
      if (this.selectionHistory.length > 10) {
        this.selectionHistory = this.selectionHistory.slice(0, 10);
      }

      this.logger.info(`IDE selection set to port ${port}`, { reason });

      return {
        success: true,
        selection: this.ideSelection,
        previousSelection
      };

    } catch (error) {
      this.logger.error('Failed to set IDE selection:', error);
      throw new Error(`Failed to set IDE selection: ${error.message}`);
    }
  }

  /**
   * Get current IDE selection
   * @returns {Object} Current selection
   */
  getCurrentSelection() {
    return this.ideSelection;
  }

  /**
   * Get IDE selection history
   * @returns {Array} Selection history
   */
  getSelectionHistory() {
    return this.selectionHistory;
  }

  /**
   * Get IDE version
   * @param {number} port - IDE port
   * @returns {Promise<string>} IDE version
   */
  async getIDEVersion(port) {
    try {
      if (!this.ideManager) {
        throw new Error('IDE Manager not available');
      }

      const version = await this.ideManager.detectIDEVersion(port);
      
      return version;

    } catch (error) {
      this.logger.error('Failed to get IDE version:', error);
      throw new Error(`Failed to get IDE version: ${error.message}`);
    }
  }

  /**
   * Get workspace info
   * @param {number} port - IDE port
   * @returns {Promise<Object>} Workspace information
   */
  async getWorkspaceInfo(port) {
    try {
      const activeIDE = this.activeIDEs.get(port);
      
      if (!activeIDE) {
        throw new Error(`IDE not found on port ${port}`);
      }

      if (!this.ideManager) {
        throw new Error('IDE Manager not available');
      }

      const workspaceInfo = await this.ideManager.getWorkspaceInfo(port);
      
      return {
        port,
        workspacePath: activeIDE.workspacePath,
        ...workspaceInfo
      };

    } catch (error) {
      this.logger.error('Failed to get workspace info:', error);
      throw new Error(`Failed to get workspace info: ${error.message}`);
    }
  }

  /**
   * Set workspace path
   * @param {number} port - IDE port
   * @param {string} workspacePath - New workspace path
   * @returns {Promise<Object>} Set result
   */
  async setWorkspacePath(port, workspacePath) {
    try {
      const activeIDE = this.activeIDEs.get(port);
      
      if (!activeIDE) {
        throw new Error(`IDE not found on port ${port}`);
      }

      if (!this.ideManager) {
        throw new Error('IDE Manager not available');
      }

      const result = await this.ideManager.setWorkspacePath(port, workspacePath);
      
      // Update active IDE
      activeIDE.workspacePath = workspacePath;
      
      this.logger.info(`Workspace path set to ${workspacePath} for port ${port}`);
      
      return result;

    } catch (error) {
      this.logger.error('Failed to set workspace path:', error);
      throw new Error(`Failed to set workspace path: ${error.message}`);
    }
  }

  /**
   * Detect workspace paths
   * @param {number} port - IDE port
   * @returns {Promise<Array>} Detected workspace paths
   */
  async detectWorkspacePaths(port) {
    try {
      if (!this.ideManager) {
        throw new Error('IDE Manager not available');
      }

      const workspacePaths = await this.ideManager.detectWorkspacePaths(port);
      
      return workspacePaths;

    } catch (error) {
      this.logger.error('Failed to detect workspace paths:', error);
      throw new Error(`Failed to detect workspace paths: ${error.message}`);
    }
  }

  /**
   * Monitor terminal
   * @param {number} port - IDE port
   * @param {Object} options - Monitor options
   * @returns {Promise<Object>} Monitor result
   */
  async monitorTerminal(port, options = {}) {
    try {
      if (!this.ideManager) {
        throw new Error('IDE Manager not available');
      }

      const result = await this.ideManager.monitorTerminal(port, options);
      
      return result;

    } catch (error) {
      this.logger.error('Failed to monitor terminal:', error);
      throw new Error(`Failed to monitor terminal: ${error.message}`);
    }
  }

  /**
   * Get IDE statistics
   * @returns {Object} IDE statistics
   */
  getIDEStats() {
    return {
      activeIDEs: this.activeIDEs.size,
      selectionHistory: this.selectionHistory.length,
      currentSelection: this.ideSelection ? this.ideSelection.port : null,
      lastActivity: new Date()
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      // Stop all active IDEs
      for (const [port, ide] of this.activeIDEs) {
        try {
          await this.stopIDE(port);
        } catch (error) {
          this.logger.warn(`Failed to stop IDE on port ${port}:`, error.message);
        }
      }

      // Clear state
      this.activeIDEs.clear();
      this.ideSelection = null;
      this.selectionHistory = [];

      this.logger.info('IDE Handler cleanup completed');

    } catch (error) {
      this.logger.error('Failed to cleanup IDE Handler:', error);
    }
  }
}

module.exports = IDEHandler;
