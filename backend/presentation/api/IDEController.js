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
    const requestStart = process.hrtime.bigint();
    try {
      const portParam = req.params.port;
      const userId = req.user?.id;
      
      this.logger.info(`[IDEController] Starting IDE switch request for port ${portParam}, user ${userId}`);
      
      const result = await this.ideApplicationService.switchIDE(portParam, userId);
      
      const totalDuration = Number(process.hrtime.bigint() - requestStart) / 1000; // Convert to milliseconds
      this.logger.info(`[IDEController] Complete IDE switch request completed in ${totalDuration.toFixed(2)}ms for port ${portParam}`);
      
      res.json({
        success: result.success,
        data: result.data,
        timing: {
          totalRequestTime: totalDuration.toFixed(2)
        }
      });
    } catch (error) {
      const totalDuration = Number(process.hrtime.bigint() - requestStart) / 1000; // Convert to milliseconds
      this.logger.error(`[IDEController] Error switching IDE after ${totalDuration.toFixed(2)}ms:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to switch IDE',
        timing: {
          totalRequestTime: totalDuration.toFixed(2)
        }
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
      const userId = req.user?.id;
      const result = await this.ideApplicationService.getIDEStatus(userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      this.logger.error('Error getting status:', error);
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
      const userId = req.user?.id;
      const result = await this.ideApplicationService.getUserAppUrl(null, userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      this.logger.error('Error getting user app URL:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async getUserAppUrlForPort(req, res) {
    try {
      const port = parseInt(req.params.port);
      const userId = req.user?.id;
      
      if (!port) {
        return res.status(400).json({
          success: false,
          error: 'Port parameter is required'
        });
      }
      
      const result = await this.ideApplicationService.getUserAppUrlForPort(port, userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      this.logger.error('Error getting user app URL for port:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async monitorTerminal(req, res) {
    try {
      const userId = req.user?.id;
      const result = await this.ideApplicationService.monitorTerminal(userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      this.logger.error('Error monitoring terminal:', error);
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
      const userId = req.user?.id;
      
      if (!workspacePath) {
        return res.status(400).json({
          success: false,
          error: 'Workspace path is required'
        });
      }
      
      const result = await this.ideApplicationService.setWorkspacePath(port, workspacePath, userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      this.logger.error('Error setting workspace path:', error);
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
      const userId = req.user?.id;
      const result = await this.ideApplicationService.detectWorkspacePaths(userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      this.logger.error('Error detecting workspace paths:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to detect workspace paths'
      });
    }
  }

  async debugDOM(req, res) {
    try {
      const userId = req.user?.id;
      const result = await this.ideApplicationService.debugDOM(userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      this.logger.error('Error debugging DOM:', error);
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
      const userId = req.user?.id;
      const result = await this.ideApplicationService.detectAllWorkspaces(userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      this.logger.error('Error detecting workspaces:', error);
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
      const userId = req.user?.id;
      
      const result = await this.ideApplicationService.detectWorkspaceForIDE(portNum, userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      this.logger.error(`Error detecting workspace for port ${req.params.port}:`, error);
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
      const userId = req.user?.id;
      
      const result = await this.ideApplicationService.forceDetectWorkspaceForIDE(portNum, userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      this.logger.error(`Error force detecting workspace for port ${req.params.port}:`, error);
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
      const userId = req.user?.id;
      const result = await this.ideApplicationService.getDetectionStats(userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      this.logger.error('Error getting detection stats:', error);
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
      const userId = req.user?.id;
      const result = await this.ideApplicationService.clearDetectionResults(userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      this.logger.error('Error clearing detection results:', error);
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
      const userId = req.user?.id;
      
      if (!command) {
        return res.status(400).json({
          success: false,
          error: 'Command is required'
        });
      }
      
      const result = await this.ideApplicationService.executeTerminalCommand(parseInt(port), command, userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      this.logger.error(`Error executing terminal command for port ${req.params.port}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute terminal command',
        message: error.message
      });
    }
  }

  // REMOVED: getDocsTasks and getDocsTaskDetails methods - MIGRATED TO TASKCONTROLLER

  async clickNewChat(req, res) {
    try {
      const { port } = req.params;
      const { message } = req.body;
      const userId = req.user?.id;

      const result = await this.ideApplicationService.clickNewChat(userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      this.logger.error('Error clicking New Chat:', error);
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
      const userId = req.user?.id;
      
      const result = await this.ideApplicationService.startVSCode(workspacePath, userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      this.logger.error('Error starting VSCode:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start VSCode'
      });
    }
  }

  async getVSCodeExtensions(req, res) {
    try {
      const port = parseInt(req.params.port);
      const userId = req.user?.id;
      
      const result = await this.ideApplicationService.getVSCodeExtensions(port, userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      this.logger.error('Error getting VSCode extensions:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getVSCodeWorkspaceInfo(req, res) {
    try {
      const port = parseInt(req.params.port);
      const userId = req.user?.id;
      
      const result = await this.ideApplicationService.getVSCodeWorkspaceInfo(port, userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      this.logger.error('Error getting VSCode workspace info:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async sendMessageToVSCode(req, res) {
    try {
      const { message, extensionType = 'githubCopilot', port } = req.body;
      const userId = req.user?.id;
      
      const result = await this.ideApplicationService.sendMessageToVSCode(message, extensionType, port, userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      this.logger.error('Error sending message to VSCode:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getVSCodeStatus(req, res) {
    try {
      const port = parseInt(req.params.port);
      const userId = req.user?.id;
      
      const result = await this.ideApplicationService.getVSCodeStatus(port, userId);
      
      res.json({
        success: result.success,
        data: result.data
      });
    } catch (error) {
      this.logger.error('Error getting VSCode status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = IDEController; 