const TerminalMonitor = require('./terminal/TerminalMonitor');
const WorkspacePathDetector = require('./workspace/WorkspacePathDetector');
const ChatMessageHandler = require('./chat/ChatMessageHandler');
const ChatHistoryExtractor = require('./chat/ChatHistoryExtractor');
const PackageJsonAnalyzer = require('./dev-server/PackageJsonAnalyzer');

class CursorIDEService {
  constructor(browserManager, ideManager, eventBus = null) {
    this.browserManager = browserManager;
    this.ideManager = ideManager;
    this.eventBus = eventBus;
    
    // Initialize separated services
    this.terminalMonitor = new TerminalMonitor(browserManager, eventBus);
    this.packageJsonAnalyzer = new PackageJsonAnalyzer(eventBus);
    this.workspacePathDetector = new WorkspacePathDetector(browserManager, ideManager);
    this.chatMessageHandler = new ChatMessageHandler(browserManager);
    this.chatHistoryExtractor = new ChatHistoryExtractor(browserManager);
    
    // Listen for IDE changes to reset package.json cache (optional, if you cache results)
    if (this.eventBus) {
      this.eventBus.subscribe('activeIDEChanged', async (eventData) => {
        console.log('[CursorIDEService] IDE changed, resetting package.json cache');
        // No cache in new analyzer, but if you add one, reset here
        // this.packageJsonAnalyzer.resetCache?.();
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
      
      // Use the workspace path of the active IDE
      const activeIDE = await this.ideManager.getActiveIDE();
      let workspacePath = activeIDE?.workspacePath;
      console.log('[CursorIDEService] Using workspace path for package.json analysis:', workspacePath);
      
      // If workspace path is virtual (like composer-code-block-anysphere:/), use project root as fallback
      if (workspacePath && workspacePath.includes(':')) {
        const path = require('path');
        const currentDir = process.cwd();
        workspacePath = path.resolve(currentDir, '..');
        console.log('[CursorIDEService] Virtual workspace detected, using project root as fallback:', workspacePath);
      }
      
      const packageJsonUrl = await this.packageJsonAnalyzer.analyzePackageJsonInPath(workspacePath);
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

  // New method to get user app URL for a specific IDE port
  async getUserAppUrlForPort(port = null) {
    try {
      // If no port specified, use active IDE
      if (!port) {
        const activeIDE = await this.ideManager.getActiveIDE();
        port = activeIDE?.port;
      }
      
      if (!port) {
        console.log('[CursorIDEService] No IDE port available');
        return null;
      }
      
      console.log('[CursorIDEService] Getting user app URL for port:', port);
      
      // Get workspace path for this specific port
      const workspacePath = this.ideManager.getWorkspacePath(port);
      console.log('[CursorIDEService] Workspace path for port', port, ':', workspacePath);
      
      if (!workspacePath) {
        console.log('[CursorIDEService] No workspace path found for port', port);
        return null;
      }
      
      // Try package.json analysis first
      const packageJsonUrl = await this.packageJsonAnalyzer.analyzePackageJsonInPath(workspacePath);
      if (packageJsonUrl) {
        console.log('[CursorIDEService] Dev server detected via package.json for port', port, ':', packageJsonUrl);
        return packageJsonUrl;
      }
      
      // Fallback to terminal monitoring (but this might not work for non-active IDEs)
      if (port === this.getActivePort()) {
        console.log('[CursorIDEService] Trying terminal monitoring for active port', port);
        return await this.terminalMonitor.monitorTerminalOutput();
      } else {
        console.log('[CursorIDEService] Port', port, 'is not active, cannot use terminal monitoring');
        return null;
      }
    } catch (error) {
      console.error('[CursorIDEService] Error getting user app URL for port', port, ':', error);
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
    // If no workspace path provided, use the active IDE's workspace path
    if (!workspacePath) {
      const activeIDE = await this.ideManager.getActiveIDE();
      workspacePath = activeIDE?.workspacePath;
      console.log('[CursorIDEService] No workspace path provided, using active IDE workspace path:', workspacePath);
    }
    
    // If workspace path is virtual (like composer-code-block-anysphere:/), use project root as fallback
    if (workspacePath && workspacePath.includes(':')) {
      const path = require('path');
      const currentDir = process.cwd();
      workspacePath = path.resolve(currentDir, '..');
      console.log('[CursorIDEService] Virtual workspace detected, using project root as fallback:', workspacePath);
    }
    
    return await this.packageJsonAnalyzer.analyzePackageJsonInPath(workspacePath);
  }

  // Workspace path detection methods
  async addWorkspacePathDetectionViaPlaywright() {
    return await this.workspacePathDetector.addWorkspacePathDetectionViaPlaywright();
  }

  // User-specific connection status
  async getConnectionStatus(userId) {
    try {
      const isConnected = await this.isConnected();
      const activePort = this.getActivePort();
      const availableIDEs = await this.getAvailableIDEs();

      return {
        connected: isConnected,
        activePort: activePort,
        availablePorts: availableIDEs.map(ide => ({
          port: ide.port,
          active: ide.active,
          workspacePath: ide.workspacePath
        })),
        lastActivity: new Date().toISOString(),
        userId: userId
      };
    } catch (error) {
      console.error('[CursorIDEService] Error getting connection status:', error);
      return {
        connected: false,
        activePort: null,
        availablePorts: [],
        lastActivity: new Date().toISOString(),
        userId: userId,
        error: error.message
      };
    }
  }
}

module.exports = CursorIDEService; 