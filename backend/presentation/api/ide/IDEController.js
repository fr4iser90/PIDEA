/**
 * Unified IDE Controller
 * Provides unified API endpoints for IDE management across all IDE types
 */
const IDETypes = require('@services/ide/IDETypes');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class IDEController {
  constructor(dependencies = {}) {
    this.ideManager = dependencies.ideManager;
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger || console;
    this.serviceRegistry = dependencies.serviceRegistry;
    
    // Get IDE services from registry
    this.cursorIDEService = this.serviceRegistry?.getService('cursorIDEService');
    this.vscodeIDEService = this.serviceRegistry?.getService('vscodeIDEService');
    this.windsurfIDEService = this.serviceRegistry?.getService('windsurfIDEService');
  }

  /**
   * Get list of available IDEs
   * GET /api/ide/list
   */
  async getIDEsList(req, res) {
    try {
      const availableIDEs = await this.ideManager.getAvailableIDEs();
      
      // Enhance IDE data with type information
      const enhancedIDEs = availableIDEs.map(ide => ({
        ...ide,
        ideType: this.detectIDEType(ide),
        features: this.getIDEFeatures(ide),
        metadata: this.getIDEMetadata(ide)
      }));

      res.json({
        success: true,
        data: enhancedIDEs,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('[IDEController] Error getting IDE list:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get IDE list',
        details: error.message
      });
    }
  }

  /**
   * Get IDE status
   * GET /api/ide/status
   */
  async getIDEStatus(req, res) {
    try {
      const { port } = req.query;
      
      if (port) {
        // Get status for specific IDE
        const availableIDEs = await this.ideManager.getAvailableIDEs();
        const targetIDE = availableIDEs.find(ide => ide.port === parseInt(port));
        
        if (!targetIDE) {
          return res.status(404).json({
            success: false,
            error: `IDE on port ${port} not found`
          });
        }

        const status = {
          port: targetIDE.port,
          status: targetIDE.status,
          active: targetIDE.active,
          ideType: this.detectIDEType(targetIDE),
          workspacePath: targetIDE.workspacePath,
          lastActivity: targetIDE.lastActivity || new Date().toISOString()
        };

        res.json({
          success: true,
          data: status
        });
      } else {
        // Get global IDE status
        const globalStatus = this.ideManager.getStatus();
        res.json({
          success: true,
          data: globalStatus
        });
      }
    } catch (error) {
      this.logger.error('[IDEController] Error getting IDE status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get IDE status',
        details: error.message
      });
    }
  }

  /**
   * Start IDE
   * POST /api/ide/start
   */
  async startIDE(req, res) {
    try {
      const { workspacePath, ideType = 'cursor', options = {} } = req.body;
      
      const ideInfo = await this.ideManager.startNewIDE(workspacePath, ideType, options);
      
      // Publish event
      if (this.eventBus) {
        await this.eventBus.publish('ideAdded', {
          port: ideInfo.port,
          status: ideInfo.status,
          ideType: ideInfo.ideType,
          workspacePath: ideInfo.workspacePath
        });
      }
      
      res.json({
        success: true,
        data: {
          ...ideInfo,
          features: this.getIDEFeatures(ideInfo),
          metadata: this.getIDEMetadata(ideInfo)
        }
      });
    } catch (error) {
      this.logger.error('[IDEController] Error starting IDE:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start IDE',
        details: error.message
      });
    }
  }

  /**
   * Stop IDE
   * POST /api/ide/stop
   */
  async stopIDE(req, res) {
    try {
      const { port } = req.params;
      const portNumber = parseInt(port);
      
      const result = await this.ideManager.stopIDE(portNumber);
      
      // Publish event
      if (this.eventBus) {
        await this.eventBus.publish('ideRemoved', {
          port: portNumber,
          status: 'stopped'
        });
      }
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      this.logger.error('[IDEController] Error stopping IDE:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to stop IDE',
        details: error.message
      });
    }
  }

  /**
   * Get IDE features
   * GET /api/ide/features
   */
  async getIDEFeatures(req, res) {
    try {
      const { port, ideType } = req.query;
      
      let features = {};
      
      if (port) {
        // Get features for specific IDE
        const availableIDEs = await this.ideManager.getAvailableIDEs();
        const targetIDE = availableIDEs.find(ide => ide.port === parseInt(port));
        
        if (!targetIDE) {
          return res.status(404).json({
            success: false,
            error: `IDE on port ${port} not found`
          });
        }
        
        features = this.getIDEFeatures(targetIDE);
      } else if (ideType) {
        // Get features for IDE type
        features = this.getIDETypeFeatures(ideType);
      } else {
        // Get all available IDE features
        features = this.getAllIDEFeatures();
      }

      res.json({
        success: true,
        data: features
      });
    } catch (error) {
      this.logger.error('[IDEController] Error getting IDE features:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get IDE features',
        details: error.message
      });
    }
  }

  /**
   * Switch to IDE
   * POST /api/ide/switch/:port
   */
  async switchIDE(req, res) {
    try {
      const port = parseInt(req.params.port);
      
      const result = await this.ideManager.switchToIDE(port);
      
      // Publish event
      if (this.eventBus) {
        await this.eventBus.publish('activeIDEChanged', {
          port: port,
          previousPort: result.previousPort,
          workspacePath: result.workspacePath
        });
      }
      
      res.json({
        success: true,
        data: {
          ...result,
          features: this.getIDEFeatures({ port, ideType: this.detectIDEType({ port }) }),
          metadata: this.getIDEMetadata({ port, ideType: this.detectIDEType({ port }) })
        }
      });
    } catch (error) {
      this.logger.error('[IDEController] Error switching IDE:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to switch IDE',
        details: error.message
      });
    }
  }

  /**
   * Get IDE configuration
   * GET /api/ide/config
   */
  async getIDEConfig(req, res) {
    try {
      const { port } = req.query;
      
      let config = {};
      
      if (port) {
        // Get config for specific IDE
        const availableIDEs = await this.ideManager.getAvailableIDEs();
        const targetIDE = availableIDEs.find(ide => ide.port === parseInt(port));
        
        if (!targetIDE) {
          return res.status(404).json({
            success: false,
            error: `IDE on port ${port} not found`
          });
        }
        
        config = this.getIDEConfiguration(targetIDE);
      } else {
        // Get global IDE configuration
        config = this.getGlobalIDEConfiguration();
      }

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      this.logger.error('[IDEController] Error getting IDE config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get IDE config',
        details: error.message
      });
    }
  }

  /**
   * Update IDE configuration
   * PUT /api/ide/config
   */
  async updateIDEConfig(req, res) {
    try {
      const { port, config } = req.body;
      
      if (port) {
        // Update config for specific IDE
        const result = await this.updateIDEConfiguration(port, config);
        res.json({
          success: true,
          data: result
        });
      } else {
        // Update global IDE configuration
        const result = await this.updateGlobalIDEConfiguration(config);
        res.json({
          success: true,
          data: result
        });
      }
    } catch (error) {
      this.logger.error('[IDEController] Error updating IDE config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update IDE config',
        details: error.message
      });
    }
  }

  // Helper methods

  /**
   * Detect IDE type based on IDE information
   */
  detectIDEType(ide) {
    // Default to cursor if no specific detection
    return ide.ideType || IDETypes.CURSOR;
  }

  /**
   * Get IDE features based on IDE information
   */
  getIDEFeatures(ide) {
    const ideType = this.detectIDEType(ide);
    const metadata = IDETypes.METADATA[ideType] || IDETypes.METADATA[IDETypes.CURSOR];
    
    return {
      supportedFeatures: metadata.supportedFeatures || [],
      fileExtensions: metadata.fileExtensions || [],
      hasChat: metadata.supportedFeatures?.includes('chat') || false,
      hasTerminal: metadata.supportedFeatures?.includes('terminal') || false,
      hasGit: metadata.supportedFeatures?.includes('git') || false,
      hasExtensions: metadata.supportedFeatures?.includes('extensions') || false,
      hasRefactoring: metadata.supportedFeatures?.includes('refactoring') || false
    };
  }

  /**
   * Get IDE metadata
   */
  getIDEMetadata(ide) {
    const ideType = this.detectIDEType(ide);
    const metadata = IDETypes.METADATA[ideType] || IDETypes.METADATA[IDETypes.CURSOR];
    
    return {
      name: metadata.name,
      displayName: metadata.displayName,
      description: metadata.description,
      defaultPort: metadata.defaultPort,
      startupCommand: metadata.startupCommand
    };
  }

  /**
   * Get IDE type features
   */
  getIDETypeFeatures(ideType) {
    const metadata = IDETypes.METADATA[ideType];
    if (!metadata) {
      throw new Error(`Unknown IDE type: ${ideType}`);
    }
    
    return this.getIDEFeatures({ ideType });
  }

  /**
   * Get all available IDE features
   */
  getAllIDEFeatures() {
    const features = {};
    
    Object.keys(IDETypes.METADATA).forEach(ideType => {
      features[ideType] = this.getIDETypeFeatures(ideType);
    });
    
    return features;
  }

  /**
   * Get IDE configuration
   */
  getIDEConfiguration(ide) {
    // This would integrate with IDEConfigManager
    return {
      port: ide.port,
      ideType: this.detectIDEType(ide),
      workspacePath: ide.workspacePath,
      status: ide.status,
      active: ide.active
    };
  }

  /**
   * Get global IDE configuration
   */
  getGlobalIDEConfiguration() {
    // This would integrate with IDEConfigManager
    return {
      defaultIDE: IDETypes.CURSOR,
      autoDetect: true,
      maxConcurrentIDEs: 5
    };
  }

  /**
   * Update IDE configuration
   */
  async updateIDEConfiguration(port, config) {
    // This would integrate with IDEConfigManager
    return {
      port,
      updated: true,
      config
    };
  }

  /**
   * Update global IDE configuration
   */
  async updateGlobalIDEConfiguration(config) {
    // This would integrate with IDEConfigManager
    return {
      updated: true,
      config
    };
  }

  /**
   * Setup routes for this controller
   */
  setupRoutes(app) {
    // IDE management routes
    app.get('/api/ide/list', this.getIDEsList.bind(this));
    app.get('/api/ide/status', this.getIDEStatus.bind(this));
    app.post('/api/ide/start', this.startIDE.bind(this));
    app.post('/api/ide/stop/:port', this.stopIDE.bind(this));
    app.get('/api/ide/features', this.getIDEFeatures.bind(this));
    app.post('/api/ide/switch/:port', this.switchIDE.bind(this));
    app.get('/api/ide/config', this.getIDEConfig.bind(this));
    app.put('/api/ide/config', this.updateIDEConfig.bind(this));
  }
}

module.exports = IDEController; 