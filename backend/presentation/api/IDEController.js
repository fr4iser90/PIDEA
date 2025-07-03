class IDEController {
  constructor(ideManager, eventBus, cursorIDEService = null) {
    this.ideManager = ideManager;
    this.eventBus = eventBus;
    this.cursorIDEService = cursorIDEService;
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
      const result = await this.ideManager.switchToIDE(port);
      
      // Publish event
      if (this.eventBus) {
        await this.eventBus.publish('activeIDEChanged', {
          port: port,
          previousPort: this.ideManager.getActivePort()
        });
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
      
      // Get the active IDE to include port information
      const activeIDE = await this.ideManager.getActiveIDE();
      const url = await this.cursorIDEService.getUserAppUrlForPort();
      
      res.json({ 
        success: true, 
        data: { 
          url: url,
          port: activeIDE?.port || null,
          workspacePath: activeIDE?.workspacePath || null
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
}

module.exports = IDEController; 