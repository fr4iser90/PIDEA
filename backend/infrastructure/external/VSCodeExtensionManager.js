const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

/**
 * VSCodeExtensionManager
 * Manages VSCode extensions and their capabilities
 */
class VSCodeExtensionManager {
  constructor() {
    this.installedExtensions = new Map();
    this.extensionCapabilities = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the extension manager
   */
  async initialize() {
    try {
      // Load installed extensions
      await this.loadInstalledExtensions();
      
      // Load extension capabilities
      await this.loadExtensionCapabilities();
      
      this.isInitialized = true;
      logger.info('[VSCodeExtensionManager] Initialized successfully');
    } catch (error) {
      logger.error('[VSCodeExtensionManager] Failed to initialize:', error);
    }
  }

  /**
   * Load installed extensions
   */
  async loadInstalledExtensions() {
    // Mock implementation - in real scenario, this would query VSCode API
    this.installedExtensions.set('ms-vscode.vscode-json', {
      id: 'ms-vscode.vscode-json',
      name: 'JSON Language Features',
      version: '1.0.0',
      enabled: true
    });
    
    this.installedExtensions.set('ms-vscode.vscode-typescript-next', {
      id: 'ms-vscode.vscode-typescript-next',
      name: 'TypeScript and JavaScript Language Features',
      version: '1.0.0',
      enabled: true
    });
  }

  /**
   * Load extension capabilities
   */
  async loadExtensionCapabilities() {
    // Mock implementation - in real scenario, this would analyze extension manifests
    this.extensionCapabilities.set('ms-vscode.vscode-json', {
      languages: ['json'],
      commands: ['json.validate'],
      features: ['syntax-highlighting', 'validation']
    });
    
    this.extensionCapabilities.set('ms-vscode.vscode-typescript-next', {
      languages: ['typescript', 'javascript'],
      commands: ['typescript.reloadProjects', 'typescript.restartTsServer'],
      features: ['intellisense', 'refactoring', 'diagnostics']
    });
  }

  /**
   * Get installed extensions
   */
  getInstalledExtensions() {
    return Array.from(this.installedExtensions.values());
  }

  /**
   * Get extension capabilities
   */
  getExtensionCapabilities(extensionId) {
    return this.extensionCapabilities.get(extensionId) || null;
  }

  /**
   * Check if extension is installed
   */
  isExtensionInstalled(extensionId) {
    return this.installedExtensions.has(extensionId);
  }

  /**
   * Check if extension is enabled
   */
  isExtensionEnabled(extensionId) {
    const extension = this.installedExtensions.get(extensionId);
    return extension ? extension.enabled : false;
  }

  /**
   * Get extensions for specific language
   */
  getExtensionsForLanguage(language) {
    const extensions = [];
    
    for (const [id, capabilities] of this.extensionCapabilities) {
      if (capabilities.languages && capabilities.languages.includes(language)) {
        extensions.push({
          id,
          capabilities,
          installed: this.isExtensionInstalled(id),
          enabled: this.isExtensionEnabled(id)
        });
      }
    }
    
    return extensions;
  }

  /**
   * Get extensions with specific feature
   */
  getExtensionsWithFeature(feature) {
    const extensions = [];
    
    for (const [id, capabilities] of this.extensionCapabilities) {
      if (capabilities.features && capabilities.features.includes(feature)) {
        extensions.push({
          id,
          capabilities,
          installed: this.isExtensionInstalled(id),
          enabled: this.isExtensionEnabled(id)
        });
      }
    }
    
    return extensions;
  }
}

module.exports = VSCodeExtensionManager; 