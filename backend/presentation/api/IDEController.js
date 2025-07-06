const DocsTasksHandler = require('./handlers/DocsTasksHandler');

class IDEController {
  constructor(ideManager, eventBus, cursorIDEService = null) {
    this.ideManager = ideManager;
    this.eventBus = eventBus;
    this.cursorIDEService = cursorIDEService;
    this.docsTasksHandler = new DocsTasksHandler(() => {
      const activePath = this.ideManager.getActiveWorkspacePath();
      console.log('[IDEController] Active workspace path:', activePath);
      console.log('[IDEController] Active port:', this.ideManager.getActivePort());
      console.log('[IDEController] Available workspaces:', Array.from(this.ideManager.ideWorkspaces.entries()));
      
      if (!activePath) {
        throw new Error('No active workspace path available - IDE workspace detection failed');
      }
      return activePath;
    });
  }

  async getAvailableIDEs(req, res) {
    try {
      const availableIDEs = await this.ideManager.getAvailableIDEs();
      res.json({
        success: true,
        data: availableIDEs
      });
    } catch (error) {
      console.error('[IDEController] Error getting available IDEs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get available IDEs'
      });
    }
  }

  async startIDE(req, res) {
    try {
      const { workspacePath } = req.body;
      const ideInfo = await this.ideManager.startNewIDE(workspacePath);
      
      // Publish event
      if (this.eventBus) {
        await this.eventBus.publish('ideAdded', {
          port: ideInfo.port,
          status: ideInfo.status
        });
      }
      
      res.json({
        success: true,
        data: ideInfo
      });
    } catch (error) {
      console.error('[IDEController] Error starting IDE:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start IDE'
      });
    }
  }

  async switchIDE(req, res) {
    try {
      const port = parseInt(req.params.port);
      console.log('[IDEController] switchIDE called with port:', port);
      console.log('[IDEController] Current active port before switch:', this.ideManager.getActivePort());
      
      const result = await this.ideManager.switchToIDE(port);
      console.log('[IDEController] ideManager.switchToIDE completed, result:', result);
      console.log('[IDEController] New active port after switch:', this.ideManager.getActivePort());
      
      // Publish event
      if (this.eventBus) {
        console.log('[IDEController] Publishing activeIDEChanged event:', { port, previousPort: this.ideManager.getActivePort() });
        await this.eventBus.publish('activeIDEChanged', {
          port: port,
          previousPort: this.ideManager.getActivePort()
        });
      } else {
        console.log('[IDEController] No eventBus available for publishing activeIDEChanged');
      }
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[IDEController] Error switching IDE:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to switch IDE'
      });
    }
  }

  async stopIDE(req, res) {
    try {
      const port = parseInt(req.params.port);
      const result = await this.ideManager.stopIDE(port);
      
      // Publish event
      if (this.eventBus) {
        await this.eventBus.publish('ideRemoved', {
          port: port
        });
      }
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[IDEController] Error stopping IDE:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to stop IDE'
      });
    }
  }

  async getStatus(req, res) {
    try {
      const status = this.ideManager.getStatus();
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('[IDEController] Error getting status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get IDE status'
      });
    }
  }

  async restartUserApp(req, res) {
    try {
      if (!this.cursorIDEService) {
        throw new Error('CursorIDEService not available');
      }
      
      await this.cursorIDEService.restartUserApp();
      res.json({ success: true });
    } catch (error) {
      console.error('[IDEController] Error restarting user app:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async getUserAppUrl(req, res) {
    try {
      if (!this.cursorIDEService) {
        throw new Error('CursorIDEService not available');
      }
      
      // Get ALL available IDEs and find frontend URLs in any of them
      const availableIDEs = await this.ideManager.getAvailableIDEs();
      console.log('[IDEController] Searching for frontend URLs in', availableIDEs.length, 'IDEs');
      
      let foundUrl = null;
      let foundPort = null;
      let foundWorkspacePath = null;
      
      // Try each IDE workspace until we find a frontend
      for (const ide of availableIDEs) {
        if (ide.workspacePath && !ide.workspacePath.includes(':')) {
          console.log('[IDEController] Checking IDE port', ide.port, 'workspace:', ide.workspacePath);
          
          const url = await this.cursorIDEService.getUserAppUrlForPort(ide.port);
          if (url) {
            console.log('[IDEController] Found frontend URL in IDE port', ide.port, ':', url);
            foundUrl = url;
            foundPort = ide.port;
            foundWorkspacePath = ide.workspacePath;
            break;
          }
        }
      }
      
      res.json({ 
        success: true, 
        data: { 
          url: foundUrl,
          port: foundPort,
          workspacePath: foundWorkspacePath
        } 
      });
    } catch (error) {
      console.error('[IDEController] Error getting user app URL:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async getUserAppUrlForPort(req, res) {
    try {
      if (!this.cursorIDEService) {
        throw new Error('CursorIDEService not available');
      }
      
      const port = parseInt(req.params.port);
      if (!port) {
        return res.status(400).json({
          success: false,
          error: 'Port parameter is required'
        });
      }
      
      const url = await this.cursorIDEService.getUserAppUrlForPort(port);
      const workspacePath = this.ideManager.getWorkspacePath(port);
      
      res.json({ 
        success: true, 
        data: { 
          url: url,
          port: port,
          workspacePath: workspacePath
        } 
      });
    } catch (error) {
      console.error('[IDEController] Error getting user app URL for port:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async monitorTerminal(req, res) {
    try {
      if (!this.cursorIDEService) {
        throw new Error('CursorIDEService not available');
      }
      
      const url = await this.cursorIDEService.monitorTerminalOutput();
      res.json({ 
        success: true, 
        data: { url: url } 
      });
    } catch (error) {
      console.error('[IDEController] Error monitoring terminal:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async setWorkspacePath(req, res) {
    try {
      const port = parseInt(req.params.port);
      const { workspacePath } = req.body;
      
      if (!workspacePath) {
        return res.status(400).json({
          success: false,
          error: 'Workspace path is required'
        });
      }
      
      this.ideManager.setWorkspacePath(port, workspacePath);
      
      // Trigger dev server detection with the new workspace path
      if (this.cursorIDEService) {
        const devServerUrl = await this.cursorIDEService.detectDevServerFromPackageJson(workspacePath);
        if (devServerUrl) {
          console.log('[IDEController] Detected dev server for workspace:', devServerUrl);
          // Broadcast the new dev server URL
          if (this.eventBus) {
            await this.eventBus.publish('userAppDetected', { url: devServerUrl });
          }
        }
      }
      
      res.json({
        success: true,
        data: {
          port: port,
          workspacePath: workspacePath
        }
      });
    } catch (error) {
      console.error('[IDEController] Error setting workspace path:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to set workspace path'
      });
    }
  }

  async getWorkspaceInfo(req, res) {
    try {
      const availableIDEs = await this.ideManager.getAvailableIDEs();
      const workspaceInfo = availableIDEs.map(ide => ({
        port: ide.port,
        status: ide.status,
        workspacePath: this.ideManager.getWorkspacePath(ide.port),
        hasWorkspace: !!this.ideManager.getWorkspacePath(ide.port)
      }));
      
      res.json({
        success: true,
        data: workspaceInfo
      });
    } catch (error) {
      console.error('[IDEController] Error getting workspace info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get workspace info'
      });
    }
  }

  async detectWorkspacePaths(req, res) {
    try {
      console.log('[IDEController] Triggering workspace path detection for all IDEs');
      await this.ideManager.detectWorkspacePathsForAllIDEs();
      
      // Get updated IDE list with workspace paths
      const availableIDEs = await this.ideManager.getAvailableIDEs();
      
      res.json({
        success: true,
        data: {
          message: 'Workspace path detection completed',
          ides: availableIDEs.map(ide => ({
            port: ide.port,
            status: ide.status,
            workspacePath: ide.workspacePath,
            hasWorkspace: !!ide.workspacePath
          }))
        }
      });
    } catch (error) {
      console.error('[IDEController] Error detecting workspace paths:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to detect workspace paths'
      });
    }
  }

  async debugDOM(req, res) {
    try {
      if (!this.cursorIDEService) {
        throw new Error('CursorIDEService not available');
      }
      
      const page = await this.cursorIDEService.browserManager.getPage();
      if (!page) {
        throw new Error('No page available');
      }
      
      const domInfo = await page.evaluate(() => {
        const info = {
          title: document.title,
          url: window.location.href,
          vscode: !!window.vscode,
          monaco: !!window.monaco,
          workspace: !!window.workspace,
          fileExplorer: {
            hasExplorer: !!document.querySelector('.explorer-folders-view'),
            rootFolders: [],
            allElements: []
          },
          statusBar: {
            items: []
          },
          breadcrumbs: {
            items: []
          }
        };
        
        // Get file explorer info
        const explorerElements = document.querySelectorAll('.explorer-folders-view *');
        explorerElements.forEach(el => {
          const text = el.textContent || el.innerText;
          if (text && text.trim()) {
            info.fileExplorer.allElements.push({
              tagName: el.tagName,
              className: el.className,
              text: text.trim(),
              ariaLevel: el.getAttribute('aria-level'),
              role: el.getAttribute('role')
            });
          }
        });
        
        // Get status bar info
        const statusItems = document.querySelectorAll('.status-bar-item');
        statusItems.forEach(item => {
          const text = item.textContent || item.innerText;
          const title = item.getAttribute('title');
          const ariaLabel = item.getAttribute('aria-label');
          if (text || title || ariaLabel) {
            info.statusBar.items.push({
              text: text,
              title: title,
              ariaLabel: ariaLabel
            });
          }
        });
        
        // Get breadcrumb info
        const breadcrumbItems = document.querySelectorAll('.breadcrumb-item, .monaco-breadcrumb-item');
        breadcrumbItems.forEach(item => {
          const text = item.textContent || item.innerText;
          if (text && text.trim()) {
            info.breadcrumbs.items.push(text.trim());
          }
        });
        
        return info;
      });
      
      res.json({
        success: true,
        data: domInfo
      });
    } catch (error) {
      console.error('[IDEController] Error debugging DOM:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/ide/workspace-detection
   * Alle IDEs scannen und Workspace-Info sammeln
   */
  async detectAllWorkspaces(req, res) {
    try {
      const detectionService = this.application.getIDEWorkspaceDetectionService();
      const results = await detectionService.detectAllWorkspaces();
      
      res.json({
        success: true,
        message: 'Workspace detection completed',
        results: detectionService.getDetectionResults(),
        stats: detectionService.getDetectionStats()
      });
    } catch (error) {
      console.error('[IDEController] Error detecting workspaces:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to detect workspaces',
        message: error.message
      });
    }
  }

  /**
   * GET /api/ide/workspace-detection/:port
   * Workspace für eine spezifische IDE erkennen
   */
  async detectWorkspaceForIDE(req, res) {
    try {
      const { port } = req.params;
      const portNum = parseInt(port);
      
      console.log(`[IDEController] Detecting workspace for port ${portNum}`);
      
      // Trigger workspace detection for this specific port
      await this.ideManager.detectWorkspacePath(portNum);
      
      // Get the updated workspace path
      const workspacePath = this.ideManager.getWorkspacePath(portNum);
      
      console.log(`[IDEController] Workspace detection completed for port ${portNum}:`, workspacePath);
      
      res.json({
        success: true,
        port: portNum,
        workspacePath: workspacePath,
        message: 'Workspace detection completed'
      });
    } catch (error) {
      console.error(`[IDEController] Error detecting workspace for port ${req.params.port}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to detect workspace',
        message: error.message
      });
    }
  }

  /**
   * POST /api/ide/workspace-detection/:port
   * Workspace für eine spezifische IDE erkennen (mit Cache-Clear für Button)
   */
  async forceDetectWorkspaceForIDE(req, res) {
    try {
      const { port } = req.params;
      const portNum = parseInt(port);
      
      console.log(`[IDEController] Force detecting workspace for port ${portNum} (clearing cache)`);
      
      // Clear cached workspace path to force re-detection
      this.ideManager.ideWorkspaces.delete(portNum);
      console.log(`[IDEController] Cleared cached workspace for port ${portNum}`);
      
      // Clear FileBasedWorkspaceDetector cache
      if (this.ideManager.fileDetector) {
        this.ideManager.fileDetector.clearCache();
        console.log(`[IDEController] Cleared FileBasedWorkspaceDetector cache for port ${portNum}`);
        
        // Also clear the actual files on disk
        const fs = require('fs');
        const path = require('path');
        const cacheDir = `/tmp/IDEWEB/${portNum}`;
        
        if (fs.existsSync(cacheDir)) {
          try {
            // Delete all files in the cache directory
            const files = fs.readdirSync(cacheDir);
            for (const file of files) {
              const filePath = path.join(cacheDir, file);
              fs.unlinkSync(filePath);
              console.log(`[IDEController] Deleted cached file: ${filePath}`);
            }
            console.log(`[IDEController] Cleared disk cache for port ${portNum}`);
          } catch (error) {
            console.error(`[IDEController] Error clearing disk cache for port ${portNum}:`, error);
          }
        }
      }
      
      // Trigger workspace detection for this specific port
      await this.ideManager.detectWorkspacePath(portNum);
      
      // Get the updated workspace path
      const workspacePath = this.ideManager.getWorkspacePath(portNum);
      
      console.log(`[IDEController] Force workspace detection completed for port ${portNum}:`, workspacePath);
      
      res.json({
        success: true,
        port: portNum,
        workspacePath: workspacePath,
        message: 'Workspace detection completed (cache cleared)'
      });
    } catch (error) {
      console.error(`[IDEController] Error force detecting workspace for port ${req.params.port}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to detect workspace',
        message: error.message
      });
    }
  }

  /**
   * GET /api/ide/workspace-detection/stats
   * Detection-Statistiken abrufen
   */
  async getDetectionStats(req, res) {
    try {
      const detectionService = this.application.getIDEWorkspaceDetectionService();
      
      res.json({
        success: true,
        stats: detectionService.getDetectionStats(),
        serviceStatus: detectionService.getServiceStatus()
      });
    } catch (error) {
      console.error('[IDEController] Error getting detection stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get detection stats',
        message: error.message
      });
    }
  }

  /**
   * DELETE /api/ide/workspace-detection/results
   * Detection-Ergebnisse zurücksetzen
   */
  async clearDetectionResults(req, res) {
    try {
      const detectionService = this.application.getIDEWorkspaceDetectionService();
      detectionService.clearDetectionResults();
      
      res.json({
        success: true,
        message: 'Detection results cleared'
      });
    } catch (error) {
      console.error('[IDEController] Error clearing detection results:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear detection results',
        message: error.message
      });
    }
  }

  /**
   * POST /api/ide/workspace-detection/:port/execute
   * Terminal-Befehl für eine IDE ausführen
   */
  async executeTerminalCommand(req, res) {
    try {
      const { port } = req.params;
      const { command, outputFile } = req.body;
      
      if (!command) {
        return res.status(400).json({
          success: false,
          error: 'Command is required'
        });
      }
      
      const detectionService = this.application.getIDEWorkspaceDetectionService();
      const result = await detectionService.executeTerminalCommand(parseInt(port), command, outputFile);
      
      res.json({
        success: true,
        port: parseInt(port),
        command: command,
        result: result
      });
    } catch (error) {
      console.error(`[IDEController] Error executing terminal command for port ${req.params.port}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute terminal command',
        message: error.message
      });
    }
  }

  /**
   * GET /api/docs-tasks
   * Get list of all documentation tasks
   */
  async getDocsTasks(req, res) {
    try {
      await this.docsTasksHandler.getDocsTasks(req, res);
    } catch (error) {
      console.error('[IDEController] Error in getDocsTasks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get documentation tasks'
      });
    }
  }

  /**
   * GET /api/docs-tasks/:filename
   * Get specific documentation task details
   */
  async getDocsTaskDetails(req, res) {
    try {
      await this.docsTasksHandler.getDocsTaskDetails(req, res);
    } catch (error) {
      console.error('[IDEController] Error in getDocsTaskDetails:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get documentation task details'
      });
    }
  }

  async clickNewChat(req, res) {
    try {
      const { port } = req.params;
      const { message } = req.body;

      console.log(`[IDEController] Clicking New Chat for port ${port}${message ? ` with message: ${message}` : ''}`);

      // Get the browser manager for the specified port
      const browserManager = this.ideManager.browserManager;
      if (!browserManager) {
        throw new Error('Browser manager not available');
      }

      // Switch to the specified port first
      await browserManager.switchToPort(parseInt(port));

      // Click the New Chat button
      const success = await browserManager.clickNewChat();
      
      if (success) {
        console.log(`[IDEController] Successfully clicked New Chat button on port ${port}`);
        
        // If a message was provided, type it into the chat
        if (message) {
          console.log(`[IDEController] Typing message: ${message}`);
          await browserManager.typeMessage(message);
        }
        
        res.json({
          success: true,
          message: `New chat created on port ${port}${message ? ` with message: ${message}` : ''}`
        });
      } else {
        throw new Error('Failed to click New Chat button');
      }
    } catch (error) {
      console.error('[IDEController] Error clicking New Chat:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = IDEController; 