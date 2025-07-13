const { logger } = require('@infrastructure/logging/Logger');

class CDPWorkspaceDetector {
  constructor(browserManager, packageJsonAnalyzer) {
    this.browserManager = browserManager;
    this.packageJsonAnalyzer = packageJsonAnalyzer;
  }

  async detectDevServerFromCDP() {
    try {
      const page = await this.browserManager.getPage();
      if (!page) {
        logger.log('[CDPWorkspaceDetector] No page available for CDP');
        return null;
      }

      // Use CDP to get file system info
      const client = await page.context().newCDPSession(page);
      
      // Get workspace info from CDP
      const workspaceInfo = await client.send('Runtime.evaluate', {
        expression: `
          (() => {
            // Try to get workspace from various sources
            const workspace = {
              path: null,
              name: null
            };
            
            // Method 1: From window object
            if (window.workspace) {
              workspace.path = window.workspace.uri?.fsPath;
              workspace.name = window.workspace.name;
            }
            
            // Method 2: From VS Code API
            if (window.vscode) {
              workspace.path = window.vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
              workspace.name = window.vscode.workspace.workspaceFolders?.[0]?.name;
            }
            
            // Method 3: From Monaco editor
            if (window.monaco) {
              workspace.path = window.monaco.Uri.file('.').fsPath;
            }
            
            return workspace;
          })()
        `
      });

      if (workspaceInfo.result?.value?.path) {
        const workspacePath = workspaceInfo.result.value.path;
        logger.log('[CDPWorkspaceDetector] CDP workspace path:', workspacePath);
        
        // Now analyze package.json in this path
        return await this.packageJsonAnalyzer.analyzePackageJsonInPath(workspacePath);
      }

      logger.log('[CDPWorkspaceDetector] No workspace path found via CDP');
      return null;

    } catch (error) {
      logger.error('[CDPWorkspaceDetector] CDP error:', error.message);
      return null;
    }
  }
}

module.exports = CDPWorkspaceDetector;
