/**
 * IDEAutomationService - Domain Layer: Unified IDE automation
 * Provides unified automation capabilities for terminal and analysis operations
 */

const TerminalMonitor = require('../terminal/TerminalMonitor');
const PackageJsonAnalyzer = require('../dev-server/PackageJsonAnalyzer');
const WorkspacePathDetector = require('../workspace/WorkspacePathDetector');
const IDETypes = require('./IDETypes');
const ServiceLogger = require('@logging/ServiceLogger');

class IDEAutomationService {
  constructor(dependencies = {}) {
    this.validateDependencies(dependencies);
    
    this.browserManager = dependencies.browserManager;
    this.ideManager = dependencies.ideManager;
    this.eventBus = dependencies.eventBus;
    this.logger = new ServiceLogger('IDEAutomationService');
    
    // Initialize core services
    this.terminalMonitor = new TerminalMonitor(this.browserManager, this.eventBus);
    this.packageJsonAnalyzer = new PackageJsonAnalyzer(this.eventBus);
    this.workspacePathDetector = new WorkspacePathDetector(this.browserManager, this.ideManager);
    
    // State management
    this.activePort = null;
    this.ideType = null;
    this.workspacePath = null;
    this.terminalStatus = {
      isOpen: false,
      isMonitoring: false,
      lastOutput: null
    };
    
    // Cache for analysis results
    this.analysisCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Event listeners
    this.setupEventListeners();
    
    this.logger.info('✅ IDE automation service initialized');
  }

  /**
   * Validate service dependencies
   * @param {Object} dependencies - Service dependencies
   * @throws {Error} If dependencies are invalid
   */
  validateDependencies(dependencies) {
    const required = ['browserManager', 'ideManager', 'eventBus'];
    for (const dep of required) {
      if (!dependencies[dep]) {
        throw new Error(`Missing required dependency: ${dep}`);
      }
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    if (this.eventBus) {
      this.eventBus.subscribe('ide.portChanged', async (eventData) => {
        await this.handlePortChange(eventData);
      });
      
      this.eventBus.subscribe('terminal.outputChanged', async (eventData) => {
        await this.handleTerminalOutputChange(eventData);
      });
    }
  }

  /**
   * Get current IDE context
   * @returns {Object} IDE context information
   */
  async getIDEContext() {
    const activePort = this.ideManager.getActivePort();
    const ideType = this.ideManager.getIDEType(activePort) || IDETypes.CURSOR;
    const workspacePath = this.ideManager.getWorkspacePath(activePort);
    
    return {
      port: activePort,
      ideType: ideType,
      workspacePath: workspacePath,
      selectors: IDETypes.getSelectors(ideType)
    };
  }

  /**
   * Open terminal in IDE
   * @param {Object} options - Terminal options
   * @returns {Promise<Object>} Terminal opening result
   */
  async openTerminal(options = {}) {
    try {
      const context = await this.getIDEContext();
      const page = await this.browserManager.getPage();
      
      if (!page) {
        throw new Error('No IDE page available');
      }

      this.logger.info(`Opening terminal for ${context.ideType} on port ${context.port}`);

      // Use IDE-specific terminal shortcuts
      if (context.ideType === IDETypes.VSCODE) {
        // VSCode: Ctrl+` to open terminal
        await page.keyboard.down('Control');
        await page.keyboard.press('`');
        await page.keyboard.up('Control');
      } else {
        // Cursor/Windsurf: Ctrl+Shift+` to open terminal
        await page.keyboard.down('Control');
        await page.keyboard.down('Shift');
        await page.keyboard.press('`');
        await page.keyboard.up('Shift');
        await page.keyboard.up('Control');
      }

      // Wait for terminal to open
      await page.waitForTimeout(1000);

      // Check if terminal is open
      const terminalExists = await page.evaluate(() => {
        const terminalWrapper = document.querySelector('.terminal-wrapper.active');
        const xtermScreen = document.querySelector('.xterm-screen');
        return {
          hasTerminalWrapper: !!terminalWrapper,
          hasXtermScreen: !!xtermScreen,
          terminalAvailable: !!xtermScreen
        };
      });

      this.terminalStatus.isOpen = terminalExists.terminalAvailable;

      // Publish event
      await this.eventBus.publish('terminal.opened', {
        ideType: context.ideType,
        port: context.port,
        success: this.terminalStatus.isOpen,
        timestamp: new Date()
      });

      this.logger.info(`Terminal opened: ${this.terminalStatus.isOpen}`);

      return {
        success: this.terminalStatus.isOpen,
        ideType: context.ideType,
        port: context.port,
        terminalStatus: terminalExists
      };

    } catch (error) {
      this.logger.error('Failed to open terminal:', error);
      await this.eventBus.publish('terminal.open.failed', {
        error: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Execute command in terminal
   * @param {string} command - Command to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Command execution result
   */
  async executeTerminalCommand(command, options = {}) {
    try {
      const context = await this.getIDEContext();
      const page = await this.browserManager.getPage();
      
      if (!page) {
        throw new Error('No IDE page available');
      }

      this.logger.info(`Executing command: ${command}`);

      // Ensure terminal is open
      if (!this.terminalStatus.isOpen) {
        await this.openTerminal();
      }

      // Find terminal input
      const terminalInput = await page.$('.xterm-helper-textarea') || 
                           await page.$('.terminal-input') ||
                           await page.$('.xterm textarea');

      if (!terminalInput) {
        throw new Error('Terminal input not found');
      }

      // Focus and send command
      await terminalInput.focus();
      await terminalInput.type(command);
      await terminalInput.press('Enter');

      // Wait for execution
      const waitTime = options.waitTime || 2000;
      await page.waitForTimeout(waitTime);

      // Publish event
      await this.eventBus.publish('terminal.command.executed', {
        command: command,
        ideType: context.ideType,
        port: context.port,
        timestamp: new Date()
      });

      this.logger.info(`Command executed: ${command}`);

      return {
        success: true,
        command: command,
        ideType: context.ideType,
        port: context.port
      };

    } catch (error) {
      this.logger.error('Failed to execute terminal command:', error);
      await this.eventBus.publish('terminal.command.failed', {
        command: command,
        error: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Monitor terminal output
   * @param {Object} options - Monitoring options
   * @returns {Promise<Object>} Terminal monitoring result
   */
  async monitorTerminalOutput(options = {}) {
    try {
      const context = await this.getIDEContext();
      
      this.logger.info(`Monitoring terminal output for ${context.ideType}`);

      // Use existing TerminalMonitor service
      const result = await this.terminalMonitor.monitorTerminalOutput();
      
      this.terminalStatus.isMonitoring = true;
      this.terminalStatus.lastOutput = result;

      // Publish event
      await this.eventBus.publish('terminal.output.monitored', {
        result: result,
        ideType: context.ideType,
        port: context.port,
        timestamp: new Date()
      });

      this.logger.info(`Terminal output monitored: ${result ? 'URL found' : 'No URL'}`);

      return {
        success: true,
        result: result,
        ideType: context.ideType,
        port: context.port
      };

    } catch (error) {
      this.logger.error('Failed to monitor terminal output:', error);
      await this.eventBus.publish('terminal.output.monitoring.failed', {
        error: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Restart user application
   * @param {Object} options - Restart options
   * @returns {Promise<Object>} Restart result
   */
  async restartUserApp(options = {}) {
    try {
      const context = await this.getIDEContext();
      
      this.logger.info(`Restarting user app for ${context.ideType}`);

      // Use existing TerminalMonitor service
      const result = await this.terminalMonitor.restartUserApp();

      // Publish event
      await this.eventBus.publish('terminal.app.restarted', {
        result: result,
        ideType: context.ideType,
        port: context.port,
        timestamp: new Date()
      });

      logger.info(`User app restarted: ${result ? 'Success' : 'Failed'}`);

      return {
        success: !!result,
        result: result,
        ideType: context.ideType,
        port: context.port
      };

    } catch (error) {
      logger.error('Failed to restart user app:', error);
      await this.eventBus.publish('terminal.app.restart.failed', {
        error: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Capture terminal logs
   * @param {Object} options - Log capture options
   * @returns {Promise<Object>} Log capture result
   */
  async captureTerminalLogs(options = {}) {
    try {
      const context = await this.getIDEContext();
      
      logger.info(`Capturing terminal logs for ${context.ideType}`);

      // Get terminal output
      const output = await this.terminalMonitor.monitorTerminalOutput();
      
      // Extract logs from output
      const logs = this.extractLogsFromOutput(output);

      // Publish event
      await this.eventBus.publish('terminal.logs.captured', {
        logs: logs,
        ideType: context.ideType,
        port: context.port,
        timestamp: new Date()
      });

      logger.info(`Terminal logs captured: ${logs.length} entries`);

      return {
        success: true,
        logs: logs,
        count: logs.length,
        ideType: context.ideType,
        port: context.port
      };

    } catch (error) {
      logger.error('Failed to capture terminal logs:', error);
      await this.eventBus.publish('terminal.logs.capture.failed', {
        error: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Analyze project structure
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Project analysis result
   */
  async analyzeProject(options = {}) {
    try {
      const context = await this.getIDEContext();
      
      // Check cache first
      const cacheKey = `project_analysis_${context.workspacePath}`;
      const cached = this.analysisCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        logger.info('Using cached project analysis');
        return cached.result;
      }

      logger.info(`Analyzing project for ${context.ideType}`);

      // Use existing PackageJsonAnalyzer service
      const analysis = await this.packageJsonAnalyzer.analyzePackageJsonInPath(context.workspacePath);

      const result = {
        success: true,
        analysis: analysis,
        workspacePath: context.workspacePath,
        ideType: context.ideType,
        port: context.port,
        timestamp: new Date()
      };

      // Cache result
      this.analysisCache.set(cacheKey, {
        result: result,
        timestamp: Date.now()
      });

      // Publish event
      await this.eventBus.publish('project.analyzed', {
        analysis: analysis,
        workspacePath: context.workspacePath,
        ideType: context.ideType,
        port: context.port,
        timestamp: new Date()
      });

      logger.info(`Project analyzed`);

      return result;

    } catch (error) {
      logger.error('Failed to analyze project:', error);
      await this.eventBus.publish('project.analysis.failed', {
        error: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Re-analyze project (force fresh analysis)
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Re-analysis result
   */
  async analyzeAgain(options = {}) {
    try {
      const context = await this.getIDEContext();
      
      // Clear cache for this project
      const cacheKey = `project_analysis_${context.workspacePath}`;
      this.analysisCache.delete(cacheKey);

      logger.info(`Re-analyzing project for ${context.ideType}`);

      // Perform fresh analysis
      const result = await this.analyzeProject(options);

      // Publish event
      await this.eventBus.publish('project.reanalyzed', {
        analysis: result.analysis,
        workspacePath: context.workspacePath,
        ideType: context.ideType,
        port: context.port,
        timestamp: new Date()
      });

      logger.info(`Project re-analyzed`);

      return result;

    } catch (error) {
      logger.error('Failed to re-analyze project:', error);
      await this.eventBus.publish('project.reanalysis.failed', {
        error: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Get workspace information
   * @param {Object} options - Workspace options
   * @returns {Promise<Object>} Workspace information
   */
  async getWorkspaceInfo(options = {}) {
    try {
      const context = await this.getIDEContext();
      
      logger.info(`Getting workspace info for ${context.ideType}`);

      // Use existing WorkspacePathDetector service
      const workspaceInfo = await this.workspacePathDetector.addWorkspacePathDetectionViaPlaywright();

      const result = {
        success: true,
        workspaceInfo: workspaceInfo,
        workspacePath: context.workspacePath,
        ideType: context.ideType,
        port: context.port,
        timestamp: new Date()
      };

      // Publish event
      await this.eventBus.publish('workspace.info.retrieved', {
        workspaceInfo: workspaceInfo,
        workspacePath: context.workspacePath,
        ideType: context.ideType,
        port: context.port,
        timestamp: new Date()
      });

      logger.info(`Workspace info retrieved: ${workspaceInfo ? 'Success' : 'No info'}`);

      return result;

    } catch (error) {
      logger.error('Failed to get workspace info:', error);
      await this.eventBus.publish('workspace.info.retrieval.failed', {
        error: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Detect package.json and dev server
   * @param {Object} options - Detection options
   * @returns {Promise<Object>} Package.json detection result
   */
  async detectPackageJson(options = {}) {
    try {
      const context = await this.getIDEContext();
      
      logger.info(`Detecting package.json for ${context.ideType}`);

      // Use existing PackageJsonAnalyzer service
      const packageJsonUrl = await this.packageJsonAnalyzer.analyzePackageJsonInPath(context.workspacePath);

      const result = {
        success: true,
        packageJsonUrl: packageJsonUrl,
        workspacePath: context.workspacePath,
        ideType: context.ideType,
        port: context.port,
        timestamp: new Date()
      };

      // Publish event
      await this.eventBus.publish('package.json.detected', {
        packageJsonUrl: packageJsonUrl,
        workspacePath: context.workspacePath,
        ideType: context.ideType,
        port: context.port,
        timestamp: new Date()
      });

      logger.info(`Package.json detected: ${packageJsonUrl ? 'Success' : 'No package.json'}`);

      return result;

    } catch (error) {
      logger.error('Failed to detect package.json:', error);
      await this.eventBus.publish('package.json.detection.failed', {
        error: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Extract logs from terminal output
   * @param {string} output - Terminal output
   * @returns {Array} Extracted logs
   */
  extractLogsFromOutput(output) {
    if (!output) return [];
    
    const lines = output.split('\n');
    const logs = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed.length > 0) {
        logs.push({
          content: trimmed,
          timestamp: new Date(),
          type: this.classifyLogType(trimmed)
        });
      }
    }
    
    return logs;
  }

  /**
   * Classify log type
   * @param {string} logLine - Log line
   * @returns {string} Log type
   */
  classifyLogType(logLine) {
    if (logLine.includes('error') || logLine.includes('Error')) return 'error';
    if (logLine.includes('warn') || logLine.includes('Warn')) return 'warning';
    if (logLine.includes('info') || logLine.includes('Info')) return 'info';
    if (logLine.includes('debug') || logLine.includes('Debug')) return 'debug';
    return 'log';
  }

  /**
   * Handle port change
   * @param {Object} eventData - Port change event data
   */
  async handlePortChange(eventData) {
    try {
      const { port } = eventData;
      this.activePort = port;
      
      // Update context
      const context = await this.getIDEContext();
      this.ideType = context.ideType;
      this.workspacePath = context.workspacePath;
      
      logger.info(`Port changed to ${port}, IDE type: ${this.ideType}`);
    } catch (error) {
      logger.error('Failed to handle port change:', error);
    }
  }

  /**
   * Handle terminal output change
   * @param {Object} eventData - Terminal output change event data
   */
  async handleTerminalOutputChange(eventData) {
    try {
      const { output } = eventData;
      this.terminalStatus.lastOutput = output;
      
      logger.info('Terminal output changed');
    } catch (error) {
      logger.error('Failed to handle terminal output change:', error);
    }
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      activePort: this.activePort,
      ideType: this.ideType,
      workspacePath: this.workspacePath,
      terminalStatus: this.terminalStatus,
      cacheSize: this.analysisCache.size,
      isInitialized: true
    };
  }

  /**
   * Clear analysis cache
   */
  clearCache() {
    this.analysisCache.clear();
    logger.info('Analysis cache cleared');
  }
}

module.exports = IDEAutomationService; 