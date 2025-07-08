const fs = require('fs');
const path = require('path');

class VSCodeExtensionManager {
  constructor() {
    this.extensionCache = new Map(); // port -> extensions
  }

  async detectExtensions(port) {
    try {
      console.log('[VSCodeExtensionManager] Detecting extensions for VSCode on port', port);
      
      // Get VSCode user data directory
      const userDataDir = path.join(process.cwd(), 'vscode-data-' + port);
      const extensionsDir = path.join(userDataDir, 'extensions');
      
      if (!fs.existsSync(extensionsDir)) {
        console.log('[VSCodeExtensionManager] Extensions directory not found:', extensionsDir);
        return {
          port,
          extensions: [],
          detected: false,
          message: 'Extensions directory not found'
        };
      }

      const extensions = await this.scanExtensionsDirectory(extensionsDir);
      
      // Cache the results
      this.extensionCache.set(port, extensions);
      
      console.log('[VSCodeExtensionManager] Detected', extensions.length, 'extensions for port', port);
      
      return {
        port,
        extensions,
        detected: true,
        count: extensions.length
      };
      
    } catch (error) {
      console.error('[VSCodeExtensionManager] Error detecting extensions:', error);
      return {
        port,
        extensions: [],
        detected: false,
        error: error.message
      };
    }
  }

  async scanExtensionsDirectory(extensionsDir) {
    const extensions = [];
    
    try {
      const extensionFolders = fs.readdirSync(extensionsDir);
      
      for (const folder of extensionFolders) {
        const extensionPath = path.join(extensionsDir, folder);
        const packageJsonPath = path.join(extensionPath, 'package.json');
        
        if (fs.existsSync(packageJsonPath)) {
          try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            extensions.push({
              id: packageJson.name,
              displayName: packageJson.displayName || packageJson.name,
              version: packageJson.version,
              description: packageJson.description,
              publisher: packageJson.publisher,
              path: extensionPath
            });
          } catch (parseError) {
            console.warn('[VSCodeExtensionManager] Failed to parse package.json for extension:', folder);
          }
        }
      }
    } catch (error) {
      console.error('[VSCodeExtensionManager] Error scanning extensions directory:', error);
    }
    
    return extensions;
  }

  async getExtensions(port) {
    // Return cached extensions if available
    if (this.extensionCache.has(port)) {
      return this.extensionCache.get(port);
    }
    
    // Otherwise detect them
    const result = await this.detectExtensions(port);
    return result.extensions;
  }

  async findExtension(port, extensionId) {
    const extensions = await this.getExtensions(port);
    return extensions.find(ext => ext.id === extensionId);
  }

  async hasExtension(port, extensionId) {
    const extension = await this.findExtension(port, extensionId);
    return extension !== undefined;
  }

  async getChatExtensions(port) {
    const extensions = await this.getExtensions(port);
    const chatExtensionIds = [
      'github.copilot',
      'github.copilot-chat',
      'ms-vscode.vscode-json',
      'ms-vscode.vscode-typescript-next',
      'ms-vscode.vscode-javascript-debug',
      'ms-vscode.vscode-json-language-features',
      'ms-vscode.vscode-typescript-language-features'
    ];
    
    return extensions.filter(ext => chatExtensionIds.includes(ext.id));
  }

  async getAIExtensions(port) {
    const extensions = await this.getExtensions(port);
    const aiExtensionIds = [
      'github.copilot',
      'github.copilot-chat',
      'ms-vscode.vscode-json',
      'ms-vscode.vscode-typescript-next',
      'ms-vscode.vscode-javascript-debug',
      'ms-vscode.vscode-json-language-features',
      'ms-vscode.vscode-typescript-language-features',
      'ms-vscode.vscode-python',
      'ms-vscode.vscode-java',
      'ms-vscode.vscode-cpptools'
    ];
    
    return extensions.filter(ext => aiExtensionIds.includes(ext.id));
  }

  clearCache(port = null) {
    if (port) {
      this.extensionCache.delete(port);
    } else {
      this.extensionCache.clear();
    }
  }

  async installExtension(port, extensionId) {
    // This would require VSCode CLI or API integration
    // For now, return a placeholder
    console.log('[VSCodeExtensionManager] Extension installation not yet implemented');
    return {
      success: false,
      message: 'Extension installation not yet implemented',
      extensionId,
      port
    };
  }

  async uninstallExtension(port, extensionId) {
    // This would require VSCode CLI or API integration
    // For now, return a placeholder
    console.log('[VSCodeExtensionManager] Extension uninstallation not yet implemented');
    return {
      success: false,
      message: 'Extension uninstallation not yet implemented',
      extensionId,
      port
    };
  }
}

module.exports = VSCodeExtensionManager; 