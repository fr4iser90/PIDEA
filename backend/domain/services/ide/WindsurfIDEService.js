const TerminalMonitor = require('../terminal/TerminalMonitor');
const WorkspacePathDetector = require('../workspace/WorkspacePathDetector');
const ChatHistoryExtractor = require('../chat/ChatHistoryExtractor');
const PackageJsonAnalyzer = require('../dev-server/PackageJsonAnalyzer');
const VersionDetector = require('@infrastructure/external/ide/VersionDetector');
const ServiceLogger = require('@logging/ServiceLogger');


class WindsurfIDEService {
  constructor(browserManager, ideManager, eventBus = null) {
    this.browserManager = browserManager;
    this.ideManager = ideManager;
    this.eventBus = eventBus;
    this.logger = new ServiceLogger('WindsurfIDEService');
    
    // Initialize separated services
    this.terminalMonitor = new TerminalMonitor(browserManager, eventBus);
    this.packageJsonAnalyzer = new PackageJsonAnalyzer(eventBus);
    this.workspacePathDetector = new WorkspacePathDetector(browserManager, ideManager);
    this.chatHistoryExtractor = new ChatHistoryExtractor(browserManager, 'windsurf');
    this.versionDetector = new VersionDetector();
    
    // Listen for IDE changes
    if (this.eventBus) {
      this.eventBus.subscribe('activeIDEChanged', async (eventData) => {
        this.logger.info('IDE changed, resetting package.json cache');
        this.logger.info('Event data:', eventData);
        
        // REMOVED: Double switching - IDEManager already handles browser switching
        // The browser connection is already switched by IDEManager.switchToIDE()
      });
    }
  }

  /**
   * @deprecated Use BrowserManager.typeMessage() or IDESendMessageStep instead
   * This method has been removed to prevent infinite loops
   */
  async sendMessage(message, options = {}) {
    console.warn('DEPRECATED: WindsurfIDEService.sendMessage() is deprecated. Use BrowserManager.typeMessage() or IDESendMessageStep instead.');
    throw new Error('sendMessage() - ChatMessageHandler removed, use IDE Steps instead');
  }

  async extractChatHistory(requestedPort = null) {
    // Use requested port if provided, otherwise fall back to active port
    const targetPort = requestedPort || this.getActivePort();
    this.logger.info(`extractChatHistory() - Requested port: ${requestedPort}, Target port: ${targetPort}`);
    
    if (!targetPort) {
      this.logger.warn('extractChatHistory() - No target port available');
      return [];
    }
    
    try {
      // Switch browser to target port if needed
      const currentBrowserPort = this.browserManager.currentPort;
      this.logger.info(`extractChatHistory() - Current browser port: ${currentBrowserPort}`);
      
      if (currentBrowserPort !== targetPort) {
        this.logger.info('extractChatHistory() - Switching browser to target port:', targetPort);
        await this.browserManager.switchToPort(targetPort);
      }
      
      // ✅ FIX: Detect version and pass it to ChatHistoryExtractor
      this.logger.info(`extractChatHistory() - Detecting version for port ${targetPort}...`);
      const version = await this.versionDetector.detectVersion(targetPort);
      
      if (!version) {
        throw new Error(`Version detection failed for port ${targetPort}. Version is required for Windsurf.`);
      }
      
      this.logger.info(`extractChatHistory() - Version detected: ${version}`);
      return await this.chatHistoryExtractor.extractChatHistory(version);
      
    } catch (error) {
      this.logger.error('extractChatHistory() - Failed to extract chat history:', error.message);
      return [];
    }
  }

  async isConnected() {
    try {
      const page = await this.browserManager.getPage();
      return page !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Send a prompt to Windsurf IDE via chat
   * @param {string} prompt - The prompt to send
   * @returns {Promise<Object>} Result of sending prompt
   */
  async postToWindsurf(prompt) {
    try {
      this.logger.info('Sending prompt to Windsurf IDE', {
        promptLength: prompt.length,
        promptType: 'windsurf_ide'
      });
      
      // Use BrowserManager directly to avoid infinite loops
      this.logger.info('postToWindsurf() - Using BrowserManager directly');
      
      // Ensure browser is connected to the active IDE port
      const activePort = this.getActivePort();
      if (activePort) {
        try {
          const currentBrowserPort = this.browserManager.getCurrentPort();
          if (currentBrowserPort !== activePort) {
            this.logger.info('postToWindsurf() - Switching browser to active port:', activePort);
            await this.browserManager.switchToPort(activePort);
          }
        } catch (error) {
          this.logger.error('postToWindsurf() - Failed to switch browser port:', error.message);
        }
      }
      
      // Send message directly via BrowserManager
      const result = await this.browserManager.typeMessage(prompt, true);
      
      if (!result) {
        throw new Error('Failed to send prompt to Windsurf IDE - BrowserManager returned false');
      }
      
      return {
        success: true,
        message: 'Prompt sent to Windsurf IDE',
        data: result
      };
    } catch (error) {
      this.logger.error('Error sending prompt to Windsurf:', error);
      throw error;
    }
  }

  /**
   * Apply refactoring changes to a file in Windsurf IDE
   * @param {string} filePath - Path to the file to refactor
   * @param {string} refactoredCode - The refactored code content
   * @returns {Promise<Object>} Result of the refactoring application
   */
  async applyRefactoring(filePath, refactoredCode) {
    try {
      this.logger.info('Applying refactoring to file:', filePath);
      
      // Create a prompt to apply the refactored code
      const applyPrompt = `Please apply the following refactored code to the file ${filePath}:

\`\`\`
${refactoredCode}
\`\`\`

Please replace the entire content of the file with this refactored version. Make sure to:
1. Replace all existing content
2. Maintain proper formatting
3. Preserve any necessary imports or dependencies
4. Ensure the code compiles and runs correctly

After applying the changes, please confirm that the refactoring has been completed successfully.`;

      // Send the refactoring prompt to Windsurf IDE
      const result = await this.postToWindsurf(applyPrompt);
      
      this.logger.info('Refactoring applied successfully');
      
      return {
        success: true,
        filePath,
        appliedAt: new Date(),
        result: result,
        message: 'Refactoring applied to Windsurf IDE'
      };
    } catch (error) {
      this.logger.error('Error applying refactoring:', error);
      throw new Error(`Failed to apply refactoring: ${error.message}`);
    }
  }

  async switchToSession(session) {
    if (!session.idePort) {
      throw new Error('Session has no IDE port assigned');
    }

    const activeIDE = await this.ideManager.getActiveIDE();
    if (activeIDE && activeIDE.port === session.idePort) {
      return; // Already connected to the right IDE
    }

    await this.ideManager.switchToIDE(session.idePort);
  }

  async getAvailableIDEs() {
    return await this.ideManager.getAvailableIDEs();
  }

  async startNewWindsurf(workspacePath = null) {
    return await this.ideManager.startNewIDE(workspacePath, 'windsurf');
  }

  async stopWindsurf(port) {
    return await this.ideManager.stopIDE(port);
  }

  getActivePort() {
    const activePort = this.ideManager.getActivePort();
    this.logger.info(`getActivePort() called, returning: ${activePort}`);
    return activePort;
  }

  async switchToPort(port) {
    const currentActivePort = this.getActivePort();
    this.logger.info(`switchToPort(${port}) called, current active port:`, currentActivePort);
    
    if (currentActivePort === port) {
      this.logger.info(`Already connected to port ${port}`);
      return;
    }
    
    this.logger.info(`Switching to port ${port}...`);
    
    try {
      const start = process.hrtime.bigint();
      
      // Only call ideManager - it handles browser switching internally
      await this.ideManager.switchToIDE(port);
      
      const duration = Number(process.hrtime.bigint() - start) / 1000; // Convert to milliseconds
      this.logger.info(`Successfully switched to port ${port} in ${duration.toFixed(2)}ms`);
    } catch (error) {
      this.logger.error(`Failed to switch to port ${port}:`, error.message);
      throw error;
    }
  }

  // Terminal monitoring methods
  async startTerminalMonitoring() {
    return await this.terminalMonitor.startMonitoring();
  }

  async stopTerminalMonitoring() {
    return await this.terminalMonitor.stopMonitoring();
  }

  async restartUserApp() {
    return await this.terminalMonitor.restartUserApp();
  }

  async ensureTerminalOpen() {
    return await this.terminalMonitor.ensureTerminalOpen();
  }

  async detectDevServerFromPackageJson(workspacePath = null) {
    if (!workspacePath) {
      const activeIDE = await this.ideManager.getActiveIDE();
      workspacePath = activeIDE?.workspacePath;
    }
    
    if (!workspacePath) {
      throw new Error('No workspace path available');
    }
    
    return await this.packageJsonAnalyzer.analyzePackageJsonInPath(workspacePath);
  }

  async getConnectionStatus(userId) {
    try {
      // Check connection status by attempting to get page
      let isConnected = false;
      let connectionError = null;
      
      try {
        const page = await this.browserManager.getPage();
        isConnected = page !== null;
      } catch (error) {
        isConnected = false;
        connectionError = error.message;
      }
      
      const activeIDE = await this.ideManager.getActiveIDE();
      
      const result = {
        connected: isConnected,
        activeIDE: activeIDE,
        userId: userId,
        timestamp: new Date().toISOString()
      };
      
      // Add error property if there was a connection error
      if (connectionError) {
        result.error = connectionError;
      }
      
      return result;
    } catch (error) {
      this.logger.error('Error getting connection status:', error);
      return {
        connected: false,
        error: error.message,
        userId: userId,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = WindsurfIDEService; 