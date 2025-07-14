const TerminalMonitor = require('./terminal/TerminalMonitor');
const WorkspacePathDetector = require('./workspace/WorkspacePathDetector');
const ChatMessageHandler = require('./chat/ChatMessageHandler');
const ChatHistoryExtractor = require('./chat/ChatHistoryExtractor');
const PackageJsonAnalyzer = require('./dev-server/PackageJsonAnalyzer');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');


class WindsurfIDEService {
  constructor(browserManager, ideManager, eventBus = null) {
    this.browserManager = browserManager;
    this.ideManager = ideManager;
    this.eventBus = eventBus;
    
    // Initialize separated services
    this.terminalMonitor = new TerminalMonitor(browserManager, eventBus);
    this.packageJsonAnalyzer = new PackageJsonAnalyzer(eventBus);
    this.workspacePathDetector = new WorkspacePathDetector(browserManager, ideManager);
    this.chatMessageHandler = new ChatMessageHandler(browserManager);
    this.chatHistoryExtractor = new ChatHistoryExtractor(browserManager, 'windsurf');
    
    // Listen for IDE changes
    if (this.eventBus) {
      this.eventBus.subscribe('activeIDEChanged', async (eventData) => {
        logger.info('[WindsurfIDEService] IDE changed, resetting package.json cache');
        logger.info('[WindsurfIDEService] Event data:', eventData);
        
        // Switch browser connection to new IDE
        if (eventData.port) {
          try {
            logger.info(`[WindsurfIDEService] Switching browser connection to port: ${eventData.port}`);
            await this.browserManager.switchToPort(eventData.port);
            logger.info(`[WindsurfIDEService] Successfully switched browser connection to port: ${eventData.port}`);
          } catch (error) {
            logger.error('[WindsurfIDEService] Failed to switch browser connection:', error.message);
          }
        }
      });
    }
  }

  async sendMessage(message, options = {}) {
    // Ensure browser is connected to the active IDE port
    const activePort = this.getActivePort();
    logger.info('[WindsurfIDEService] sendMessage() - Active port:', activePort);
    
    if (activePort) {
      try {
        // Switch browser to active port if needed
        const currentBrowserPort = this.browserManager.getCurrentPort();
        logger.info('[WindsurfIDEService] sendMessage() - Current browser port:', currentBrowserPort);
        
        if (currentBrowserPort !== activePort) {
          logger.info('[WindsurfIDEService] sendMessage() - Switching browser to active port:', activePort);
          await this.browserManager.switchToPort(activePort);
        }
      } catch (error) {
        logger.error('[WindsurfIDEService] sendMessage() - Failed to switch browser port:', error.message);
      }
    }
    
    return await this.chatMessageHandler.sendMessage(message, options);
  }

  async extractChatHistory() {
    // Ensure browser is connected to the active IDE port
    const activePort = this.getActivePort();
    logger.info('[WindsurfIDEService] extractChatHistory() - Active port:', activePort);
    
    if (activePort) {
      try {
        // Switch browser to active port if needed
        const currentBrowserPort = this.browserManager.getCurrentPort();
        logger.info('[WindsurfIDEService] extractChatHistory() - Current browser port:', currentBrowserPort);
        
        if (currentBrowserPort !== activePort) {
          logger.info('[WindsurfIDEService] extractChatHistory() - Switching browser to active port:', activePort);
          await this.browserManager.switchToPort(activePort);
        }
      } catch (error) {
        logger.error('[WindsurfIDEService] extractChatHistory() - Failed to switch browser port:', error.message);
      }
    }
    
    return await this.chatHistoryExtractor.extractChatHistory();
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
      logger.info('[WindsurfIDEService] Sending prompt to Windsurf IDE:', prompt.substring(0, 100) + '...');
      
      // Use the chat message handler to send the prompt
      const result = await this.chatMessageHandler.sendMessage(prompt);
      
      logger.info('[WindsurfIDEService] Prompt sent successfully');
      return result;
    } catch (error) {
      logger.error('[WindsurfIDEService] Error sending prompt to Windsurf:', error);
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
      logger.info('[WindsurfIDEService] Applying refactoring to file:', filePath);
      
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
      
      logger.info('[WindsurfIDEService] Refactoring applied successfully');
      
      return {
        success: true,
        filePath,
        appliedAt: new Date(),
        result: result,
        message: 'Refactoring applied to Windsurf IDE'
      };
    } catch (error) {
      logger.error('[WindsurfIDEService] Error applying refactoring:', error);
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
    await this.browserManager.switchToPort(session.idePort);
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
    logger.info(`[WindsurfIDEService] getActivePort() called, returning: ${activePort}`);
    return activePort;
  }

  async switchToPort(port) {
    const currentActivePort = this.getActivePort();
    logger.info(`[WindsurfIDEService] switchToPort(${port}) called, current active port:`, currentActivePort);
    
    if (currentActivePort === port) {
      logger.info(`[WindsurfIDEService] Already connected to port ${port}`);
      return;
    }
    
    logger.info(`[WindsurfIDEService] Switching to port ${port}`);
    await this.ideManager.switchToIDE(port);
    await this.browserManager.switchToPort(port);
    logger.info(`[WindsurfIDEService] Successfully switched to port ${port}`);
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
      logger.error('[WindsurfIDEService] Error getting connection status:', error);
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