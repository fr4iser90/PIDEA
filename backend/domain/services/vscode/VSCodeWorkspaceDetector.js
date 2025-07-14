const WorkspacePathDetector = require('../workspace/WorkspacePathDetector');


class VSCodeWorkspaceDetector extends WorkspacePathDetector {
  constructor(browserManager, ideManager) {
    super(browserManager, ideManager);
    this.vscodeSelectors = {
      workspaceName: '.monaco-workbench .part.titlebar .title',
      fileExplorer: '.monaco-workbench .part.sidebar .explorer-viewlet',
      fileTree: '.monaco-workbench .part.sidebar .explorer-viewlet .explorer-item',
      statusBar: '.monaco-workbench .part.statusbar',
      editorTabs: '.monaco-workbench .part.editor .tabs-container .tab'
    };
  }

  /**
   * Detect workspace path for VSCode instance
   * @param {number} port - The VSCode port
   * @returns {Promise<string|null>} The detected workspace path
   */
  async detectVSCodeWorkspacePath(port) {
    try {
      logger.info('Detecting workspace path for VSCode on port', port);
      
      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No browser page available');
      }

      // Wait for VSCode to load
      await page.waitForSelector(this.vscodeSelectors.workspaceName, { timeout: 15000 });
      
      // Extract workspace name from title
      const workspaceName = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element ? element.textContent.trim() : null;
      }, this.vscodeSelectors.workspaceName);
      
      if (!workspaceName) {
        logger.info('No workspace name found in title');
        return null;
      }
      
      logger.info('Detected workspace name:', workspaceName);
      
      // Try to extract path from workspace name
      const workspacePath = this.extractPathFromWorkspaceName(workspaceName);
      
      if (workspacePath) {
        logger.info('Extracted workspace path:', workspacePath);
        return workspacePath;
      }
      
      // Fallback: try to get path from file explorer
      return await this.extractPathFromFileExplorer(page);
      
    } catch (error) {
      logger.error('Error detecting VSCode workspace path:', error);
      return null;
    }
  }

  /**
   * Extract path from workspace name
   * @param {string} workspaceName - The workspace name from VSCode title
   * @returns {string|null} The extracted path
   */
  extractPathFromWorkspaceName(workspaceName) {
    // VSCode title format: "workspace-name (folder) - Visual Studio Code"
    const match = workspaceName.match(/^(.+?)\s*\((.+?)\)/);
    if (match) {
      const folderName = match[2];
      // Try to find the actual path
      if (folderName !== 'folder') {
        return this.findPathByFolderName(folderName);
      }
    }
    
    // Try to extract from workspace name directly
    const cleanName = workspaceName.replace(/\s*-\s*Visual Studio Code$/, '');
    return this.findPathByFolderName(cleanName);
  }

  /**
   * Find path by folder name
   * @param {string} folderName - The folder name to search for
   * @returns {string|null} The found path
   */
  findPathByFolderName(folderName) {
    const fs = require('fs');
    const path = require('path');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
    
    // Common paths to search
    const searchPaths = [
      process.cwd(),
      path.resolve(process.cwd(), '..'),
      path.resolve(process.cwd(), '../..'),
      process.env.HOME || process.env.USERPROFILE,
      path.join(process.env.HOME || process.env.USERPROFILE, 'Projects'),
      path.join(process.env.HOME || process.env.USERPROFILE, 'Documents')
    ];
    
    for (const searchPath of searchPaths) {
      if (!searchPath) continue;
      
      try {
        const potentialPath = path.join(searchPath, folderName);
        if (fs.existsSync(potentialPath) && fs.statSync(potentialPath).isDirectory()) {
          return potentialPath;
        }
      } catch (error) {
        // Continue searching
      }
    }
    
    return null;
  }

  /**
   * Extract path from file explorer
   * @param {Object} page - Playwright page object
   * @returns {Promise<string|null>} The extracted path
   */
  async extractPathFromFileExplorer(page) {
    try {
      // Wait for file explorer to be available
      await page.waitForSelector(this.vscodeSelectors.fileExplorer, { timeout: 10000 });
      
      // Get the first file/folder in the explorer
      const firstItem = await page.evaluate((selector) => {
        const items = document.querySelectorAll(selector);
        return items.length > 0 ? items[0].textContent.trim() : null;
      }, this.vscodeSelectors.fileTree);
      
      if (firstItem) {
        logger.info('Found first item in file explorer:', firstItem);
        return this.findPathByFolderName(firstItem);
      }
      
      return null;
      
    } catch (error) {
      logger.error('Error extracting path from file explorer:', error);
      return null;
    }
  }

  /**
   * Get workspace information for VSCode
   * @param {number} port - The VSCode port
   * @returns {Promise<Object>} Workspace information
   */
  async getVSCodeWorkspaceInfo(port) {
    try {
      logger.info('Getting workspace info for VSCode on port', port);
      
      const workspacePath = await this.detectVSCodeWorkspacePath(port);
      
      if (!workspacePath) {
        return {
          port,
          workspacePath: null,
          detected: false,
          message: 'Could not detect workspace path'
        };
      }
      
      // Get additional workspace information
      const workspaceInfo = await this.getWorkspaceInfo(workspacePath);
      
      return {
        port,
        workspacePath,
        detected: true,
        ...workspaceInfo
      };
      
    } catch (error) {
      logger.error('Error getting VSCode workspace info:', error);
      return {
        port,
        workspacePath: null,
        detected: false,
        error: error.message
      };
    }
  }

  /**
   * Get open files in VSCode
   * @param {number} port - The VSCode port
   * @returns {Promise<Array>} Array of open files
   */
  async getOpenFiles(port) {
    try {
      logger.info('Getting open files for VSCode on port', port);
      
      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No browser page available');
      }

      // Wait for editor tabs to be available
      await page.waitForSelector(this.vscodeSelectors.editorTabs, { timeout: 10000 });
      
      const openFiles = await page.evaluate((selector) => {
        const tabs = document.querySelectorAll(selector);
        return Array.from(tabs).map((tab, index) => ({
          id: index,
          name: tab.textContent || tab.innerText,
          active: tab.classList.contains('active'),
          dirty: tab.classList.contains('dirty')
        }));
      }, this.vscodeSelectors.editorTabs);
      
      logger.info('Found', openFiles.length, 'open files');
      
      return openFiles;
      
    } catch (error) {
      logger.error('Error getting open files:', error);
      return [];
    }
  }

  /**
   * Get VSCode status information
   * @param {number} port - The VSCode port
   * @returns {Promise<Object>} Status information
   */
  async getVSCodeStatus(port) {
    try {
      logger.info('Getting status for VSCode on port', port);
      
      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No browser page available');
      }

      // Wait for status bar to be available
      await page.waitForSelector(this.vscodeSelectors.statusBar, { timeout: 10000 });
      
      const status = await page.evaluate((selector) => {
        const statusBar = document.querySelector(selector);
        if (!statusBar) return {};
        
        const statusItems = statusBar.querySelectorAll('.statusbar-item');
        const statusInfo = {};
        
        statusItems.forEach((item) => {
          const text = item.textContent || item.innerText;
          if (text) {
            statusInfo[item.className] = text.trim();
          }
        });
        
        return statusInfo;
      }, this.vscodeSelectors.statusBar);
      
      logger.info('Retrieved VSCode status');
      
      return {
        port,
        status,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('Error getting VSCode status:', error);
      return {
        port,
        status: {},
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = VSCodeWorkspaceDetector; 