const TerminalMonitor = require('./terminal/TerminalMonitor');
const DevServerDetector = require('./dev-server/DevServerDetector');
const WorkspacePathDetector = require('./workspace/WorkspacePathDetector');
const ChatMessageHandler = require('./chat/ChatMessageHandler');
const ChatHistoryExtractor = require('./chat/ChatHistoryExtractor');

class CursorIDEService {
  constructor(browserManager, ideManager, eventBus = null) {
    this.browserManager = browserManager;
    this.ideManager = ideManager;
    this.eventBus = eventBus;
    
    // Initialize separated services
    this.terminalMonitor = new TerminalMonitor(browserManager, eventBus);
    this.devServerDetector = new DevServerDetector(ideManager, eventBus, browserManager);
    this.workspacePathDetector = new WorkspacePathDetector(browserManager, ideManager);
    this.chatMessageHandler = new ChatMessageHandler(browserManager);
    this.chatHistoryExtractor = new ChatHistoryExtractor(browserManager);
    
    // Listen for IDE changes to reset package.json cache
    if (this.eventBus) {
      this.eventBus.subscribe('activeIDEChanged', async (eventData) => {
        console.log('[CursorIDEService] IDE changed, resetting package.json cache');
        this.devServerDetector.resetPackageJsonCache();
        
        // Switch browser connection to new IDE
        if (eventData.port) {
          try {
            await this.browserManager.switchToPort(eventData.port);
            console.log('[CursorIDEService] Switched browser connection to port:', eventData.port);
          } catch (error) {
            console.error('[CursorIDEService] Failed to switch browser connection:', error.message);
          }
        }
      });
    }
  }

  async sendMessage(message) {
    return await this.chatMessageHandler.sendMessage(message);
  }

  async extractChatHistory() {
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

  async startNewIDE(workspacePath = null) {
    return await this.ideManager.startNewIDE(workspacePath);
  }

  async stopIDE(port) {
    return await this.ideManager.stopIDE(port);
  }

  getActivePort() {
    return this.ideManager.getActivePort();
  }

  async switchToPort(port) {
    if (this.getActivePort() === port) {
      console.log(`[CursorIDEService] Already connected to port ${port}`);
      return;
    }
    
    console.log(`[CursorIDEService] Switching to port ${port}`);
    await this.browserManager.switchToPort(port);
    
    // Update active port in IDE manager
    if (this.ideManager.switchToIDE) {
      await this.ideManager.switchToIDE(port);
    }
  }

  // Enhanced terminal monitoring with package.json priority
  async monitorTerminalOutput() {
    try {
      // First try package.json analysis (more reliable)
      console.log('[CursorIDEService] Trying package.json analysis first...');
      const packageJsonUrl = await this.devServerDetector.detectDevServerFromPackageJson();
      if (packageJsonUrl) {
        console.log('[CursorIDEService] Dev server detected via package.json:', packageJsonUrl);
        return packageJsonUrl;
      }

      // Fallback to terminal monitoring (less reliable due to CDP limitations)
      console.log('[CursorIDEService] Package.json analysis failed, trying terminal monitoring...');
      return await this.terminalMonitor.monitorTerminalOutput();
    } catch (error) {
      console.error('[CursorIDEService] Error in enhanced terminal monitoring:', error);
      return null;
    }
  }

  // Terminal monitoring methods
  async startTerminalMonitoring() {
    return await this.terminalMonitor.startTerminalMonitoring();
  }

  async stopTerminalMonitoring() {
    return await this.terminalMonitor.stopTerminalMonitoring();
  }

  async restartUserApp() {
    return await this.terminalMonitor.restartUserApp();
  }

  async ensureTerminalOpen() {
    return await this.terminalMonitor.ensureTerminalOpen();
  }

  // Dev server detection methods
  async detectDevServerFromPackageJson(workspacePath = null) {
    return await this.devServerDetector.detectDevServerFromPackageJson(workspacePath);
  }

  async detectDevServerFromCDP() {
    return await this.devServerDetector.detectDevServerFromCDP();
  }

  resetPackageJsonCache() {
    return this.devServerDetector.resetPackageJsonCache();
  }

  // Workspace path detection methods
  async addWorkspacePathDetectionViaPlaywright() {
    return await this.workspacePathDetector.addWorkspacePathDetectionViaPlaywright();
  }
}

module.exports = CursorIDEService; 