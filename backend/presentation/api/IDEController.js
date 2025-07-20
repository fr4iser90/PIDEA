const Logger = require('@logging/Logger');
const logger = new Logger('IDEController');


class IDEController {
  constructor(dependencies = {}) {
    this.ideApplicationService = dependencies.ideApplicationService;
    this.logger = dependencies.logger || logger;
    
    if (!this.ideApplicationService) {
      throw new Error('IDEController requires ideApplicationService dependency');
    }
  }

  async getAvailableIDEs(req, res) {
    try {
      const userId = req.user?.id;
      const result = await this.ideApplicationService.getAvailableIDEs(userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      logger.error('Error getting available IDEs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get available IDEs'
      });
    }
  }

  async startIDE(req, res) {
    try {
      const { workspacePath, ideType = 'cursor' } = req.body;
      const userId = req.user?.id;
      const result = await this.ideApplicationService.startIDE(workspacePath, ideType, userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      logger.error('Error starting IDE:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start IDE'
      });
    }
  }

  async switchIDE(req, res) {
    try {
      logger.info('switchIDE called with req.params:', req.params);
      logger.info('switchIDE called with req.url:', req.url);
      logger.info('switchIDE called with req.path:', req.path);
      
      // Fix: Handle string port properly
      const portParam = req.params.port;
      logger.info('switchIDE called with portParam:', portParam);
      logger.info('Current active port before switch:', this.ideManager.getActivePort());
      
      // FIX: Use the port directly from params, not parsed
      const port = parseInt(portParam);
      logger.info('Parsed port:', port);
      
      if (!port || isNaN(port)) {
        logger.error('Invalid port:', portParam);
        return res.status(400).json({
          success: false,
          error: 'Invalid port parameter'
        });
      }
      
      // Validate port before switching
      if (this.ideManager.portManager) {
        const isValid = await this.ideManager.portManager.validatePort(port);
        if (!isValid) {
          logger.error('Port validation failed:', port);
          return res.status(400).json({
            success: false,
            error: 'Port validation failed'
          });
        }
      }
      
      const result = await this.ideManager.switchToIDE(port);
      logger.info('ideManager.switchToIDE completed, result:', result);
      logger.info('New active port after switch:', this.ideManager.getActivePort());
      
      // Publish event
      if (this.eventBus) {
        logger.info('Publishing activeIDEChanged event:', { port, previousPort: this.ideManager.getActivePort() });
        await this.eventBus.publish('activeIDEChanged', {
          port: port,
          previousPort: this.ideManager.getActivePort()
        });
      } else {
        logger.info('No eventBus available for publishing activeIDEChanged');
      }
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error switching IDE:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to switch IDE'
      });
    }
  }

  async stopIDE(req, res) {
    try {
      const port = parseInt(req.params.port);
      const userId = req.user?.id;
      const result = await this.ideApplicationService.stopIDE(port, userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      logger.error('Error stopping IDE:', error);
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
      logger.error('Error getting status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get IDE status'
      });
    }
  }

  async restartUserApp(req, res) {
    try {
      const port = parseInt(req.params.port);
      const userId = req.user?.id;
      const result = await this.ideApplicationService.restartUserApp(port, userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      logger.error('Error restarting user app:', error);
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
      logger.info('Searching for frontend URLs in', availableIDEs.length, 'IDEs');
      
      let foundUrl = null;
      let foundPort = null;
      let foundWorkspacePath = null;
      
      // Try each IDE workspace until we find a frontend
      for (const ide of availableIDEs) {
        if (ide.workspacePath && !ide.workspacePath.includes(':')) {
          logger.info('Checking IDE port', ide.port, 'workspace:', ide.workspacePath);
          
          const url = await this.cursorIDEService.getUserAppUrlForPort(ide.port);
          if (url) {
            logger.info('Found frontend URL in IDE port', ide.port, ':', url);
            foundUrl = url;
            foundPort = ide.port;
            foundWorkspacePath = ide.workspacePath;
            break;
          }
        }
      }
      
      const userId = req.user?.id;
      const result = await this.ideApplicationService.getUserAppUrl(foundPort, userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      logger.error('Error getting user app URL:', error);
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
      logger.error('Error getting user app URL for port:', error);
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
      logger.error('Error monitoring terminal:', error);
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
          logger.info('Detected dev server for workspace:', devServerUrl);
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
      logger.error('Error setting workspace path:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to set workspace path'
      });
    }
  }

  async getWorkspaceInfo(req, res) {
    try {
      const userId = req.user?.id;
      const result = await this.ideApplicationService.getWorkspaceInfo(userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      logger.error('Error getting workspace info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get workspace info'
      });
    }
  }

  async detectWorkspacePaths(req, res) {
    try {
      logger.info('Triggering workspace path detection for all IDEs');
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
      logger.error('Error detecting workspace paths:', error);
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
      logger.error('Error debugging DOM:', error);
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
      logger.error('Error detecting workspaces:', error);
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
      
      logger.info(`Detecting workspace for port ${portNum}`);
      
      // Trigger workspace detection for this specific port
      await this.ideManager.detectWorkspacePath(portNum);
      
      // Get the updated workspace path
      const workspacePath = this.ideManager.getWorkspacePath(portNum);
      
      logger.info(`Workspace detection completed for port ${portNum}:`, workspacePath);
      
      res.json({
        success: true,
        port: portNum,
        workspacePath: workspacePath,
        message: 'Workspace detection completed'
      });
    } catch (error) {
      logger.error(`Error detecting workspace for port ${req.params.port}:`, error);
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
      
      logger.info(`Force detecting workspace for port ${portNum} (clearing cache)`);
      
      // Clear cached workspace path to force re-detection
      this.ideManager.ideWorkspaces.delete(portNum);
      logger.info(`Cleared cached workspace for port ${portNum}`);
      
      // Clear FileBasedWorkspaceDetector cache
      if (this.ideManager.fileDetector) {
        this.ideManager.fileDetector.clearCache();
        logger.info(`Cleared FileBasedWorkspaceDetector cache for port ${portNum}`);
        
        // Also clear the actual files on disk
        const fs = require('fs');
        const path = require('path');
        const cacheDir = `/tmp/IDEWEB/${portNum}`;
        
        if (fs.existsSync(cacheDir)) {
          try {
            // Delete all files and directories in the cache directory
            const files = fs.readdirSync(cacheDir);
            for (const file of files) {
              const filePath = path.join(cacheDir, file);
              const stats = fs.statSync(filePath);
              
              if (stats.isDirectory()) {
                // Recursively delete directory
                fs.rmSync(filePath, { recursive: true, force: true });
                logger.info(`Deleted cached directory: ${filePath}`);
              } else {
                // Delete file
                fs.unlinkSync(filePath);
                logger.info(`Deleted cached file: ${filePath}`);
              }
            }
            logger.info(`Cleared disk cache for port ${portNum}`);
          } catch (error) {
            logger.error(`Error clearing disk cache for port ${portNum}:`, error);
          }
        }
      }
      
      // Trigger workspace detection for this specific port
      await this.ideManager.detectWorkspacePath(portNum);
      
      // Get the updated workspace path
      const workspacePath = this.ideManager.getWorkspacePath(portNum);
      
      logger.info(`Force workspace detection completed for port ${portNum}:`, workspacePath);
      
      res.json({
        success: true,
        port: portNum,
        workspacePath: workspacePath,
        message: 'Workspace detection completed (cache cleared)'
      });
    } catch (error) {
      logger.error(`Error force detecting workspace for port ${req.params.port}:`, error);
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
      logger.error('Error getting detection stats:', error);
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
      logger.error('Error clearing detection results:', error);
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
      logger.error(`Error executing terminal command for port ${req.params.port}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute terminal command',
        message: error.message
      });
    }
  }

  /**
   * GET /api/projects/:projectId/docs-tasks
   * Get list of all documentation tasks
   */
  async getDocsTasks(req, res) {
    try {
      const { projectId } = req.params;
      
      if (!this.taskRepository) {
        return res.status(500).json({
          success: false,
          error: 'Task repository not available'
        });
      }
      
      // Get all tasks from database for this project (no filtering)
      const tasks = await this.taskRepository.findByProject(projectId);
      
      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      logger.error('Error in getDocsTasks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get documentation tasks'
      });
    }
  }

  /**
   * GET /api/projects/:projectId/docs-tasks/:id
   * Get specific documentation task details
   */
  async getDocsTaskDetails(req, res) {
    try {
      const { projectId, id } = req.params;
      
      if (!this.taskRepository) {
        return res.status(500).json({
          success: false,
          error: 'Task repository not available'
        });
      }
      
      // Get task from database by ID
      const task = await this.taskRepository.findById(id);
      
      if (!task || task.projectId !== projectId) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }
      
      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      logger.error('Error in getDocsTaskDetails:', error);
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

      logger.info(`Clicking New Chat for port ${port}${message ? ` with message: ${message}` : ''}`);

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
        logger.info(`Successfully clicked New Chat button on port ${port}`);
        
        // If a message was provided, type it into the chat
        if (message) {
          logger.info(`Typing message: ${message}`);
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
      logger.error('Error clicking New Chat:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // ===== TERMINAL LOG ENDPOINTS =====

  /**
   * POST /api/terminal-logs/:port/execute
   * Execute a command in the terminal and capture its output
   */
  async executeTerminalCommandWithCapture(req, res) {
    try {
      const { port } = req.params;
      const { command } = req.body;

      if (!command) {
        return res.status(400).json({
          success: false,
          error: 'Command is required'
        });
      }

      logger.info(`Executing terminal command with capture for port ${port}: ${command}`);

      // Initialize capture if not already done
      await this.terminalLogCaptureService.initialize();
      await this.terminalLogCaptureService.initializeCapture(parseInt(port));

      // Execute command with capture
      const result = await this.terminalLogCaptureService.executeCommandWithCapture(parseInt(port), command);

      res.json({
        success: true,
        port: parseInt(port),
        command: command,
        result: result,
        message: 'Command executed and output captured'
      });
    } catch (error) {
      logger.error(`Error executing terminal command with capture for port ${req.params.port}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute terminal command with capture',
        message: error.message
      });
    }
  }

  /**
   * GET /api/terminal-logs/:port
   * Get recent terminal logs for a specific port
   */
  async getTerminalLogs(req, res) {
    try {
      const { port } = req.params;
      const { lines = 50 } = req.query;

      logger.info(`Getting terminal logs for port ${port}, lines: ${lines}`);

      const logs = await this.terminalLogReader.getRecentLogs(parseInt(port), parseInt(lines));

      res.json({
        success: true,
        port: parseInt(port),
        lines: parseInt(lines),
        data: logs,
        count: logs.length
      });
    } catch (error) {
      logger.error(`Error getting terminal logs for port ${req.params.port}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to get terminal logs',
        message: error.message
      });
    }
  }

  /**
   * GET /api/terminal-logs/:port/search
   * Search terminal logs for specific text
   */
  async searchTerminalLogs(req, res) {
    try {
      const { port } = req.params;
      const { q: searchText, caseSensitive, useRegex, maxResults = 100 } = req.query;

      if (!searchText) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }

      logger.info(`Searching terminal logs for port ${port}: "${searchText}"`);

      const options = {
        caseSensitive: caseSensitive === 'true',
        useRegex: useRegex === 'true',
        maxResults: parseInt(maxResults)
      };

      const results = await this.terminalLogReader.searchLogs(parseInt(port), searchText, options);

      res.json({
        success: true,
        port: parseInt(port),
        searchText: searchText,
        options: options,
        data: results,
        count: results.length
      });
    } catch (error) {
      logger.error(`Error searching terminal logs for port ${req.params.port}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to search terminal logs',
        message: error.message
      });
    }
  }

  /**
   * GET /api/terminal-logs/:port/export
   * Export terminal logs in different formats
   */
  async exportTerminalLogs(req, res) {
    try {
      const { port } = req.params;
      const { format = 'json', lines, startTime, endTime } = req.query;

      logger.info(`Exporting terminal logs for port ${port} in ${format} format`);

      const options = {};
      if (lines) options.lines = parseInt(lines);
      if (startTime) options.startTime = new Date(startTime);
      if (endTime) options.endTime = new Date(endTime);

      const exportedData = await this.terminalLogReader.exportLogs(parseInt(port), format, options);

      // Set appropriate headers for download
      const filename = `terminal-logs-port-${port}-${new Date().toISOString().split('T')[0]}.${format}`;
      
      res.setHeader('Content-Type', this.getContentType(format));
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      res.send(exportedData);
    } catch (error) {
      logger.error(`Error exporting terminal logs for port ${req.params.port}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to export terminal logs',
        message: error.message
      });
    }
  }

  /**
   * DELETE /api/terminal-logs/:port
   * Delete terminal logs for a specific port
   */
  async deleteTerminalLogs(req, res) {
    try {
      const { port } = req.params;

      logger.info(`Deleting terminal logs for port ${port}`);

      // Stop capture if running
      await this.terminalLogCaptureService.stopCapture(parseInt(port));

      // Clear cache
      this.terminalLogReader.clearCache(parseInt(port));

      res.json({
        success: true,
        port: parseInt(port),
        message: 'Terminal logs deleted and capture stopped'
      });
    } catch (error) {
      logger.error(`Error deleting terminal logs for port ${req.params.port}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete terminal logs',
        message: error.message
      });
    }
  }

  /**
   * GET /api/terminal-logs/:port/capture-status
   * Get capture status for a specific port
   */
  async getTerminalLogCaptureStatus(req, res) {
    try {
      const { port } = req.params;

      logger.info(`Getting capture status for port ${port}`);

      const status = await this.terminalLogCaptureService.getCaptureStatus(parseInt(port));
      const statistics = await this.terminalLogReader.getLogStatistics(parseInt(port));

      res.json({
        success: true,
        port: parseInt(port),
        captureStatus: status,
        statistics: statistics
      });
    } catch (error) {
      logger.error(`Error getting capture status for port ${req.params.port}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to get capture status',
        message: error.message
      });
    }
  }

  /**
   * POST /api/terminal-logs/:port/initialize
   * Initialize terminal log capture for a specific port
   */
  async initializeTerminalLogCapture(req, res) {
    try {
      const { port } = req.params;

      logger.info(`Initializing terminal log capture for port ${port}`);

      await this.terminalLogCaptureService.initialize();
      const result = await this.terminalLogCaptureService.initializeCapture(parseInt(port));

      res.json({
        success: true,
        port: parseInt(port),
        result: result,
        message: 'Terminal log capture initialized'
      });
    } catch (error) {
      logger.error(`Error initializing terminal log capture for port ${req.params.port}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to initialize terminal log capture',
        message: error.message
      });
    }
  }

  /**
   * Helper method to get content type for export formats
   */
  getContentType(format) {
    switch (format.toLowerCase()) {
      case 'json':
        return 'application/json';
      case 'csv':
        return 'text/csv';
      case 'txt':
        return 'text/plain';
      default:
        return 'application/octet-stream';
    }
  }

  // VSCode-specific endpoints
  async startVSCode(req, res) {
    try {
      const { workspacePath } = req.body;
      const ideInfo = await this.ideManager.startNewIDE(workspacePath, 'vscode');
      
      // Publish event
      if (this.eventBus) {
        await this.eventBus.publish('vscodeAdded', {
          port: ideInfo.port,
          status: ideInfo.status,
          ideType: 'vscode'
        });
      }
      
      res.json({
        success: true,
        data: ideInfo
      });
    } catch (error) {
      logger.error('Error starting VSCode:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start VSCode'
      });
    }
  }

  async getVSCodeExtensions(req, res) {
    try {
      const port = parseInt(req.params.port);
      
      if (!this.cursorIDEService) {
        throw new Error('vscodeIDEService not available');
      }
      
      const extensions = await this.cursorIDEService.getExtensions(port);
      
      res.json({
        success: true,
        data: extensions
      });
    } catch (error) {
      logger.error('Error getting VSCode extensions:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getVSCodeWorkspaceInfo(req, res) {
    try {
      const port = parseInt(req.params.port);
      
      if (!this.cursorIDEService) {
        throw new Error('vscodeIDEService not available');
      }
      
      const workspaceInfo = await this.ideManager.getWorkspaceInfo(port);
      
      res.json({
        success: true,
        data: workspaceInfo
      });
    } catch (error) {
      logger.error('Error getting VSCode workspace info:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async sendMessageToVSCode(req, res) {
    try {
      const { message, extensionType = 'githubCopilot', port } = req.body;
      
      if (!this.cursorIDEService) {
        throw new Error('vscodeIDEService not available');
      }
      
      // Switch to specified port if provided
      if (port) {
        await this.cursorIDEService.switchToPort(port);
      }
      
      const result = await this.cursorIDEService.sendMessage(message, { extensionType });
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error sending message to VSCode:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getVSCodeStatus(req, res) {
    try {
      const port = parseInt(req.params.port);
      
      if (!this.cursorIDEService) {
        throw new Error('vscodeIDEService not available');
      }
      
      const status = await this.cursorIDEService.getConnectionStatus('vscode-user');
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('Error getting VSCode status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = IDEController; 