/**
 * IDE Feature Controller
 * Manages IDE-specific features and capabilities
 */
const IDETypes = require('@services/ide/IDETypes');

class IDEFeatureController {
  constructor(dependencies = {}) {
    this.ideManager = dependencies.ideManager;
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger || console;
    this.serviceRegistry = dependencies.serviceRegistry;
    
    // Get IDE-specific services
    this.cursorIDEService = this.serviceRegistry?.getService('cursorIDEService');
    this.vscodeIDEService = this.serviceRegistry?.getService('vscodeIDEService');
    this.windsurfIDEService = this.serviceRegistry?.getService('windsurfIDEService');
  }

  /**
   * Get IDE features
   * GET /api/ide/features
   */
  async getIDEFeatures(req, res) {
    try {
      const { port, ideType, includeDetails = false } = req.query;
      
      let features = {};
      
      if (port) {
        // Get features for specific IDE
        features = await this.getFeaturesForPort(parseInt(port), includeDetails === 'true');
      } else if (ideType) {
        // Get features for IDE type
        features = this.getFeaturesForIDEType(ideType, includeDetails === 'true');
      } else {
        // Get all available IDE features
        features = this.getAllIDEFeatures(includeDetails === 'true');
      }

      res.json({
        success: true,
        data: features
      });
    } catch (error) {
      this.logger.error('[IDEFeatureController] Error getting IDE features:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get IDE features',
        details: error.message
      });
    }
  }

  /**
   * Get feature capabilities
   * GET /api/ide/features/capabilities
   */
  async getFeatureCapabilities(req, res) {
    try {
      const { port, feature } = req.query;
      
      if (!feature) {
        return res.status(400).json({
          success: false,
          error: 'Feature name is required'
        });
      }

      let capabilities = {};
      
      if (port) {
        // Get capabilities for specific IDE and feature
        capabilities = await this.getCapabilitiesForPort(parseInt(port), feature);
      } else {
        // Get capabilities for feature across all IDE types
        capabilities = this.getCapabilitiesForFeature(feature);
      }

      res.json({
        success: true,
        data: capabilities
      });
    } catch (error) {
      this.logger.error('[IDEFeatureController] Error getting feature capabilities:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get feature capabilities',
        details: error.message
      });
    }
  }

  /**
   * Check feature availability
   * GET /api/ide/features/available
   */
  async checkFeatureAvailability(req, res) {
    try {
      const { port, features } = req.query;
      
      if (!features) {
        return res.status(400).json({
          success: false,
          error: 'Features list is required'
        });
      }

      const featureList = features.split(',').map(f => f.trim());
      let availability = {};
      
      if (port) {
        // Check availability for specific IDE
        availability = await this.checkAvailabilityForPort(parseInt(port), featureList);
      } else {
        // Check availability across all IDEs
        availability = await this.checkAvailabilityForAllIDEs(featureList);
      }

      res.json({
        success: true,
        data: availability
      });
    } catch (error) {
      this.logger.error('[IDEFeatureController] Error checking feature availability:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check feature availability',
        details: error.message
      });
    }
  }

  /**
   * Get feature configuration
   * GET /api/ide/features/config
   */
  async getFeatureConfig(req, res) {
    try {
      const { port, feature } = req.query;
      
      if (!feature) {
        return res.status(400).json({
          success: false,
          error: 'Feature name is required'
        });
      }

      let config = {};
      
      if (port) {
        // Get config for specific IDE and feature
        config = await this.getFeatureConfigForPort(parseInt(port), feature);
      } else {
        // Get default config for feature
        config = this.getDefaultFeatureConfig(feature);
      }

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      this.logger.error('[IDEFeatureController] Error getting feature config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get feature config',
        details: error.message
      });
    }
  }

  /**
   * Update feature configuration
   * PUT /api/ide/features/config
   */
  async updateFeatureConfig(req, res) {
    try {
      const { port, feature, config } = req.body;
      
      if (!feature) {
        return res.status(400).json({
          success: false,
          error: 'Feature name is required'
        });
      }

      if (!config) {
        return res.status(400).json({
          success: false,
          error: 'Configuration is required'
        });
      }

      let result = {};
      
      if (port) {
        // Update config for specific IDE and feature
        result = await this.updateFeatureConfigForPort(parseInt(port), feature, config);
      } else {
        // Update default config for feature
        result = this.updateDefaultFeatureConfig(feature, config);
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      this.logger.error('[IDEFeatureController] Error updating feature config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update feature config',
        details: error.message
      });
    }
  }

  /**
   * Get feature usage statistics
   * GET /api/ide/features/stats
   */
  async getFeatureStats(req, res) {
    try {
      const { port, feature, timeRange = '24h' } = req.query;
      
      let stats = {};
      
      if (port && feature) {
        // Get stats for specific IDE and feature
        stats = await this.getFeatureStatsForPort(parseInt(port), feature, timeRange);
      } else if (feature) {
        // Get stats for feature across all IDEs
        stats = await this.getFeatureStatsForAllIDEs(feature, timeRange);
      } else {
        // Get overall feature usage stats
        stats = await this.getOverallFeatureStats(timeRange);
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      this.logger.error('[IDEFeatureController] Error getting feature stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get feature stats',
        details: error.message
      });
    }
  }

  // Helper methods

  /**
   * Get features for specific port
   */
  async getFeaturesForPort(port, includeDetails = false) {
    const availableIDEs = await this.ideManager.getAvailableIDEs();
    const targetIDE = availableIDEs.find(ide => ide.port === port);
    
    if (!targetIDE) {
      throw new Error(`IDE on port ${port} not found`);
    }

    const ideType = targetIDE.ideType || 'cursor';
    const baseFeatures = this.getFeaturesForIDEType(ideType, includeDetails);
    
    if (includeDetails) {
      // Add port-specific details
      baseFeatures.port = port;
      baseFeatures.status = targetIDE.status;
      baseFeatures.workspacePath = targetIDE.workspacePath;
      baseFeatures.lastActivity = targetIDE.lastActivity;
    }

    return baseFeatures;
  }

  /**
   * Get features for IDE type
   */
  getFeaturesForIDEType(ideType, includeDetails = false) {
    const metadata = IDETypes.METADATA[ideType];
    if (!metadata) {
      throw new Error(`Unknown IDE type: ${ideType}`);
    }

    const features = {
      ideType: ideType,
      name: metadata.name,
      displayName: metadata.displayName,
      supportedFeatures: metadata.supportedFeatures || [],
      fileExtensions: metadata.fileExtensions || [],
      hasChat: metadata.supportedFeatures?.includes('chat') || false,
      hasTerminal: metadata.supportedFeatures?.includes('terminal') || false,
      hasGit: metadata.supportedFeatures?.includes('git') || false,
      hasExtensions: metadata.supportedFeatures?.includes('extensions') || false,
      hasRefactoring: metadata.supportedFeatures?.includes('refactoring') || false,
      hasDebugging: metadata.supportedFeatures?.includes('debugging') || false,
      hasTesting: metadata.supportedFeatures?.includes('testing') || false,
      hasProfiling: metadata.supportedFeatures?.includes('profiling') || false
    };

    if (includeDetails) {
      features.description = metadata.description;
      features.defaultPort = metadata.defaultPort;
      features.startupCommand = metadata.startupCommand;
      features.detectionPatterns = metadata.detectionPatterns;
    }

    return features;
  }

  /**
   * Get all IDE features
   */
  getAllIDEFeatures(includeDetails = false) {
    const features = {};
    
    Object.keys(IDETypes.METADATA).forEach(ideType => {
      features[ideType] = this.getFeaturesForIDEType(ideType, includeDetails);
    });
    
    return features;
  }

  /**
   * Get capabilities for specific port
   */
  async getCapabilitiesForPort(port, feature) {
    const ideService = this.getIDEServiceForPort(port);
    if (!ideService) {
      throw new Error(`No IDE service found for port ${port}`);
    }

    // Check if the IDE service has the specific feature capability
    const capabilities = {
      port: port,
      feature: feature,
      available: false,
      methods: [],
      properties: []
    };

    // Check for feature-specific methods
    const featureMethods = this.getFeatureMethods(feature);
    featureMethods.forEach(method => {
      if (ideService[method]) {
        capabilities.methods.push(method);
        capabilities.available = true;
      }
    });

    // Check for feature-specific properties
    const featureProperties = this.getFeatureProperties(feature);
    featureProperties.forEach(prop => {
      if (ideService[prop] !== undefined) {
        capabilities.properties.push(prop);
        capabilities.available = true;
      }
    });

    return capabilities;
  }

  /**
   * Get capabilities for feature across all IDE types
   */
  getCapabilitiesForFeature(feature) {
    const capabilities = {
      feature: feature,
      ideTypes: {}
    };

    Object.keys(IDETypes.METADATA).forEach(ideType => {
      const metadata = IDETypes.METADATA[ideType];
      capabilities.ideTypes[ideType] = {
        supported: metadata.supportedFeatures?.includes(feature) || false,
        methods: this.getFeatureMethods(feature),
        properties: this.getFeatureProperties(feature)
      };
    });

    return capabilities;
  }

  /**
   * Check availability for specific port
   */
  async checkAvailabilityForPort(port, features) {
    const ideService = this.getIDEServiceForPort(port);
    if (!ideService) {
      throw new Error(`No IDE service found for port ${port}`);
    }

    const availability = {
      port: port,
      features: {}
    };

    features.forEach(feature => {
      availability.features[feature] = {
        available: this.isFeatureAvailable(ideService, feature),
        methods: this.getAvailableFeatureMethods(ideService, feature),
        properties: this.getAvailableFeatureProperties(ideService, feature)
      };
    });

    return availability;
  }

  /**
   * Check availability for all IDEs
   */
  async checkAvailabilityForAllIDEs(features) {
    const availableIDEs = await this.ideManager.getAvailableIDEs();
    const availability = {
      ides: {}
    };

    for (const ide of availableIDEs) {
      const ideService = this.getIDEServiceForPort(ide.port);
      if (ideService) {
        availability.ides[ide.port] = {
          ideType: ide.ideType || 'cursor',
          features: {}
        };

        features.forEach(feature => {
          availability.ides[ide.port].features[feature] = {
            available: this.isFeatureAvailable(ideService, feature),
            methods: this.getAvailableFeatureMethods(ideService, feature),
            properties: this.getAvailableFeatureProperties(ideService, feature)
          };
        });
      }
    }

    return availability;
  }

  /**
   * Get feature configuration for port
   */
  async getFeatureConfigForPort(port, feature) {
    const ideService = this.getIDEServiceForPort(port);
    if (!ideService) {
      throw new Error(`No IDE service found for port ${port}`);
    }

    // Get feature-specific configuration
    const config = this.getDefaultFeatureConfig(feature);
    
    // Override with port-specific settings if available
    if (ideService.getFeatureConfig) {
      const portConfig = await ideService.getFeatureConfig(feature);
      Object.assign(config, portConfig);
    }

    return {
      port: port,
      feature: feature,
      config: config
    };
  }

  /**
   * Get default feature configuration
   */
  getDefaultFeatureConfig(feature) {
    const defaultConfigs = {
      chat: {
        enabled: true,
        maxMessageLength: 1000,
        autoComplete: true,
        historyLimit: 100
      },
      terminal: {
        enabled: true,
        shell: 'bash',
        maxOutputLines: 1000,
        autoScroll: true
      },
      git: {
        enabled: true,
        autoCommit: false,
        showDiff: true,
        branchTracking: true
      },
      extensions: {
        enabled: true,
        autoUpdate: false,
        marketplace: true
      },
      refactoring: {
        enabled: true,
        previewChanges: true,
        backupFiles: true
      }
    };

    return defaultConfigs[feature] || { enabled: false };
  }

  /**
   * Update feature configuration for port
   */
  async updateFeatureConfigForPort(port, feature, config) {
    const ideService = this.getIDEServiceForPort(port);
    if (!ideService) {
      throw new Error(`No IDE service found for port ${port}`);
    }

    // Update feature configuration if the service supports it
    if (ideService.updateFeatureConfig) {
      await ideService.updateFeatureConfig(feature, config);
    }

    return {
      port: port,
      feature: feature,
      updated: true,
      config: config
    };
  }

  /**
   * Update default feature configuration
   */
  updateDefaultFeatureConfig(feature, config) {
    // This would typically update a configuration file or database
    return {
      feature: feature,
      updated: true,
      config: config
    };
  }

  /**
   * Get feature statistics for port
   */
  async getFeatureStatsForPort(port, feature, timeRange) {
    // This would typically query a statistics database
    return {
      port: port,
      feature: feature,
      timeRange: timeRange,
      usageCount: 0,
      lastUsed: null,
      averageUsageTime: 0
    };
  }

  /**
   * Get feature statistics for all IDEs
   */
  async getFeatureStatsForAllIDEs(feature, timeRange) {
    // This would typically query a statistics database
    return {
      feature: feature,
      timeRange: timeRange,
      totalUsage: 0,
      averageUsagePerIDE: 0,
      mostUsedPort: null
    };
  }

  /**
   * Get overall feature statistics
   */
  async getOverallFeatureStats(timeRange) {
    // This would typically query a statistics database
    return {
      timeRange: timeRange,
      totalFeatures: Object.keys(IDETypes.METADATA).length,
      mostUsedFeature: 'chat',
      leastUsedFeature: 'profiling',
      averageFeaturesPerIDE: 5
    };
  }

  /**
   * Get IDE service for port
   */
  getIDEServiceForPort(port) {
    const availableIDEs = this.ideManager.getAvailableIDEsSync();
    const targetIDE = availableIDEs.find(ide => ide.port === port);
    
    if (!targetIDE) {
      return null;
    }

    const ideType = targetIDE.ideType || 'cursor';
    
    switch (ideType) {
      case 'cursor':
        return this.cursorIDEService;
      case 'vscode':
        return this.vscodeIDEService;
      case 'windsurf':
        return this.windsurfIDEService;
      default:
        return this.cursorIDEService;
    }
  }

  /**
   * Get feature methods
   */
  getFeatureMethods(feature) {
    const featureMethods = {
      chat: ['sendChatMessage', 'getChatHistory', 'clearChat'],
      terminal: ['executeCommand', 'getTerminalOutput', 'clearTerminal'],
      git: ['getGitStatus', 'commitChanges', 'pushChanges', 'pullChanges'],
      extensions: ['getExtensions', 'installExtension', 'uninstallExtension'],
      refactoring: ['refactorCode', 'previewRefactoring', 'applyRefactoring']
    };

    return featureMethods[feature] || [];
  }

  /**
   * Get feature properties
   */
  getFeatureProperties(feature) {
    const featureProperties = {
      chat: ['chatEnabled', 'chatHistory', 'chatConfig'],
      terminal: ['terminalEnabled', 'terminalConfig', 'terminalHistory'],
      git: ['gitEnabled', 'gitConfig', 'gitStatus'],
      extensions: ['extensionsEnabled', 'extensionsList', 'extensionsConfig'],
      refactoring: ['refactoringEnabled', 'refactoringConfig']
    };

    return featureProperties[feature] || [];
  }

  /**
   * Check if feature is available
   */
  isFeatureAvailable(ideService, feature) {
    const methods = this.getFeatureMethods(feature);
    const properties = this.getFeatureProperties(feature);

    return methods.some(method => ideService[method]) || 
           properties.some(prop => ideService[prop] !== undefined);
  }

  /**
   * Get available feature methods
   */
  getAvailableFeatureMethods(ideService, feature) {
    const methods = this.getFeatureMethods(feature);
    return methods.filter(method => ideService[method]);
  }

  /**
   * Get available feature properties
   */
  getAvailableFeatureProperties(ideService, feature) {
    const properties = this.getFeatureProperties(feature);
    return properties.filter(prop => ideService[prop] !== undefined);
  }

  /**
   * Setup routes for this controller
   */
  setupRoutes(app) {
    // IDE feature routes
    app.get('/api/ide/features', this.getIDEFeatures.bind(this));
    app.get('/api/ide/features/capabilities', this.getFeatureCapabilities.bind(this));
    app.get('/api/ide/features/available', this.checkFeatureAvailability.bind(this));
    app.get('/api/ide/features/config', this.getFeatureConfig.bind(this));
    app.put('/api/ide/features/config', this.updateFeatureConfig.bind(this));
    app.get('/api/ide/features/stats', this.getFeatureStats.bind(this));
  }
}

module.exports = IDEFeatureController; 