const TerminalMonitor = require('../terminal/TerminalMonitor');
const WorkspacePathDetector = require('../workspace/WorkspacePathDetector');
const ChatHistoryExtractor = require('../chat/ChatHistoryExtractor');
const PackageJsonAnalyzer = require('../dev-server/PackageJsonAnalyzer');
const VSCodeExtensionManager = require('@external/VSCodeExtensionManager');
const VersionDetector = require('@infrastructure/external/ide/VersionDetector');
const Logger = require('@logging/Logger');
const logger = new Logger('VSCodeIDEService');


class VSCodeIDEService {
  constructor(browserManager, ideManager, eventBus = null) {
    this.browserManager = browserManager;
    this.ideManager = ideManager;
    this.eventBus = eventBus;
    
    // Initialize separated services
    this.terminalMonitor = new TerminalMonitor(browserManager, eventBus);
    this.packageJsonAnalyzer = new PackageJsonAnalyzer(eventBus);
    this.workspacePathDetector = new WorkspacePathDetector(browserManager, ideManager);
    this.chatHistoryExtractor = new ChatHistoryExtractor(browserManager, 'vscode');
    this.extensionManager = new VSCodeExtensionManager();
    this.versionDetector = new VersionDetector();
    
    // Listen for IDE changes
    if (this.eventBus) {
      this.eventBus.subscribe('activeIDEChanged', async (eventData) => {
        logger.info('IDE changed, resetting package.json cache');
        logger.info('Event data:', eventData);
        
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
    console.warn('DEPRECATED: VSCodeIDEService.sendMessage() is deprecated. Use BrowserManager.typeMessage() or IDESendMessageStep instead.');
    throw new Error('sendMessage() - ChatMessageHandler removed, use IDE Steps instead');
  }

  async extractChatHistory(requestedPort = null) {
    // Use requested port if provided, otherwise fall back to active port
    const targetPort = requestedPort || this.getActivePort();
    logger.info(`extractChatHistory() - Requested port: ${requestedPort}, Target port: ${targetPort}`);
    
    if (!targetPort) {
      logger.warn('extractChatHistory() - No target port available');
      return [];
    }
    
    try {
      // Switch browser to target port if needed
      const currentBrowserPort = this.browserManager.currentPort;
      logger.info(`extractChatHistory() - Current browser port: ${currentBrowserPort}`);
      
      if (currentBrowserPort !== targetPort) {
        logger.info('extractChatHistory() - Switching browser to target port:', targetPort);
        await this.browserManager.switchToPort(targetPort);
      }
      
      // ✅ FIX: Detect version and pass it to ChatHistoryExtractor
      logger.info(`extractChatHistory() - Detecting version for port ${targetPort}...`);
      const version = await this.versionDetector.detectVersion(targetPort);
      
      if (!version) {
        throw new Error(`Version detection failed for port ${targetPort}. Version is required for VSCode.`);
      }
      
      logger.info(`extractChatHistory() - Version detected: ${version}`);
      return await this.chatHistoryExtractor.extractChatHistory(version);
      
    } catch (error) {
      logger.error('extractChatHistory() - Failed to extract chat history:', error.message);
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
   * Send a prompt to VSCode IDE via chat
   * @param {string} prompt - The prompt to send
   * @returns {Promise<Object>} Result of sending prompt
   */
  async postToVSCode(prompt) {
    try {
      logger.info('Sending prompt to VSCode IDE', {
        promptLength: prompt.length,
        promptType: 'vscode_ide'
      });
      
      // Use BrowserManager directly to avoid infinite loops
      logger.info('postToVSCode() - Using BrowserManager directly');
      
      // Ensure browser is connected to the active IDE port
      const activePort = this.getActivePort();
      if (activePort) {
        try {
          const currentBrowserPort = this.browserManager.getCurrentPort();
          if (currentBrowserPort !== activePort) {
            logger.info('postToVSCode() - Switching browser to active port:', activePort);
            await this.browserManager.switchToPort(activePort);
          }
        } catch (error) {
          logger.error('postToVSCode() - Failed to switch browser port:', error.message);
        }
      }
      
      // Send message directly via BrowserManager
      const result = await this.browserManager.typeMessage(prompt, true);
      
      if (!result) {
        throw new Error('Failed to send prompt to VSCode IDE - BrowserManager returned false');
      }
      
      return {
        success: true,
        message: 'Prompt sent to VSCode IDE',
        data: result
      };
    } catch (error) {
      logger.error('Error sending prompt to VSCode:', error);
      throw error;
    }
  }

  /**
   * Apply refactoring changes to a file in VSCode IDE
   * @param {string} filePath - Path to the file to refactor
   * @param {string} refactoredCode - The refactored code content
   * @returns {Promise<Object>} Result of the refactoring application
   */
  async applyRefactoring(filePath, refactoredCode) {
    try {
      logger.info('Applying refactoring to file:', filePath);
      
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

      // Send the refactoring prompt to VSCode IDE
      const result = await this.postToVSCode(applyPrompt);
      
      logger.info('Refactoring applied successfully');
      
      return {
        success: true,
        filePath,
        appliedAt: new Date(),
        result: result,
        message: 'Refactoring applied to VSCode IDE'
      };
    } catch (error) {
      logger.error('Error applying refactoring:', error);
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

  async startNewVSCode(workspacePath = null) {
    return await this.ideManager.startNewIDE(workspacePath, 'vscode');
  }

  async stopVSCode(port) {
    return await this.ideManager.stopIDE(port);
  }

  getActivePort() {
    const activePort = this.ideManager.getActivePort();
    logger.info(`getActivePort() called, returning: ${activePort}`);
    return activePort;
  }

  async switchToPort(port) {
    const currentActivePort = this.getActivePort();
    logger.info(`switchToPort(${port}) called, current active port:`, currentActivePort);
    
    if (currentActivePort === port) {
      logger.info(`Already connected to port ${port}`);
      return;
    }
    
    logger.info(`Switching to port ${port}...`);
    
    try {
      const start = process.hrtime.bigint();
      
      // Only call ideManager - it handles browser switching internally
      await this.ideManager.switchToIDE(port);
      
      const duration = Number(process.hrtime.bigint() - start) / 1000; // Convert to milliseconds
      logger.info(`Successfully switched to port ${port} in ${duration.toFixed(2)}ms`);
    } catch (error) {
      logger.error(`Failed to switch to port ${port}:`, error.message);
      throw error;
    }
  }

  // Enhanced terminal monitoring with package.json priority
  async monitorTerminalOutput() {
    try {
      // First try package.json analysis (more reliable)
      logger.info('Trying package.json analysis first...');
      
      // Use the workspace path of the active IDE
      const activeIDE = await this.ideManager.getActiveIDE();
      let workspacePath = activeIDE?.workspacePath;
      logger.info('Using workspace path for package.json analysis:', workspacePath);
      
      // If workspace path is virtual (like composer-code-block-anysphere:/), use project root as fallback
      if (workspacePath && workspacePath.includes(':')) {
        const path = require('path');
        const currentDir = process.cwd();
        workspacePath = path.resolve(currentDir, '..');
        logger.info('Virtual workspace detected, using project root as fallback:', workspacePath);
      }
      
      const packageJsonUrl = await this.packageJsonAnalyzer.analyzePackageJsonInPath(workspacePath);
      if (packageJsonUrl) {
        logger.info('Dev server detected via package.json:', packageJsonUrl);
        return packageJsonUrl;
      }
      // Fallback to terminal monitoring (less reliable due to CDP limitations)
      logger.info('Package.json analysis failed, trying terminal monitoring...');
      return await this.terminalMonitor.monitorTerminalOutput();
    } catch (error) {
      logger.error('Error in enhanced terminal monitoring:', error);
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
        logger.info('No IDE port available');
        return null;
      }
      
      logger.info('Getting user app URL for port:', port);
      
      // Get workspace path for this specific port
      const workspacePath = this.ideManager.getWorkspacePath(port);
      logger.info('Workspace path for port', port, ':', workspacePath);
      
      if (!workspacePath) {
        logger.info('No workspace path found for port', port);
        return null;
      }
      
      // If workspace path is virtual (like composer-code-block-anysphere:/), skip
      if (workspacePath.includes(':')) {
        logger.info('Skipping virtual workspace for port', port, ':', workspacePath);
        return null;
      }
      
      // Try package.json analysis first
      const packageJsonUrl = await this.packageJsonAnalyzer.analyzePackageJsonInPath(workspacePath);
      if (packageJsonUrl) {
        logger.info('Dev server detected via package.json for port', port, ':', packageJsonUrl);
        return packageJsonUrl;
      }
      
      // No frontend found in this workspace
      logger.info('No frontend found in workspace for port', port, ':', workspacePath);
      return null;
    } catch (error) {
      logger.error('Error getting user app URL for port', port, ':', error);
      return null;
    }
  }

  // VSCode-specific methods
  async getExtensions(port = null) {
    if (!port) {
      const activeIDE = await this.ideManager.getActiveIDE();
      port = activeIDE?.port;
    }
    
    if (!port) {
      throw new Error('No IDE port available');
    }
    
    return await this.extensionManager.getExtensions(port);
  }

  async getChatExtensions(port = null) {
    if (!port) {
      const activeIDE = await this.ideManager.getActiveIDE();
      port = activeIDE?.port;
    }
    
    if (!port) {
      throw new Error('No IDE port available');
    }
    
    return await this.extensionManager.getChatExtensions(port);
  }

  async getAIExtensions(port = null) {
    if (!port) {
      const activeIDE = await this.ideManager.getActiveIDE();
      port = activeIDE?.port;
    }
    
    if (!port) {
      throw new Error('No IDE port available');
    }
    
    return await this.extensionManager.getAIExtensions(port);
  }

  async hasExtension(extensionId, port = null) {
    if (!port) {
      const activeIDE = await this.ideManager.getActiveIDE();
      port = activeIDE?.port;
    }
    
    if (!port) {
      throw new Error('No IDE port available');
    }
    
    return await this.extensionManager.hasExtension(port, extensionId);
  }

  async detectExtensions(port = null) {
    if (!port) {
      const activeIDE = await this.ideManager.getActiveIDE();
      port = activeIDE?.port;
    }
    
    if (!port) {
      throw new Error('No IDE port available');
    }
    
    return await this.extensionManager.detectExtensions(port);
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
      logger.error('Error getting connection status:', error);
      return {
        connected: false,
        error: error.message,
        userId: userId,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send task to VSCode IDE via Playwright
   * @param {Object} task - Task object
   * @param {string} workspacePath - Workspace path
   * @returns {Promise<Object>} Result of sending task
   */
  async sendTaskToVSCode(task, workspacePath = null) {
    logger.info('🔍 [vscodeIDEService] Sending task to VSCode IDE:', task.title);
    
    try {
      // Get active IDE workspace path if not provided
      if (!workspacePath) {
        const activeIDE = await this.ideManager.getActiveIDE();
        workspacePath = activeIDE?.workspacePath;
        logger.info('🔍 [vscodeIDEService] Using active IDE workspace path:', workspacePath);
      }
      
      if (!workspacePath) {
        throw new Error('No workspace path available for VSCode IDE');
      }
      
      // Create task content
      const taskContent = `# Task: ${task.title}

## Description
${task.description}

## Type: ${task.type}
## Priority: ${task.priority}
## Status: ${task.status}

## Instructions
Please execute this task in VSCode IDE and provide a summary of what was accomplished.

## Task ID: ${task.id}
## Created: ${task.createdAt}
## Project: ${task.projectId}

---
*Generated by PIDEA Task Management System*
`;

      // Get browser page
      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No browser page available');
      }
      
      // Create file in workspace via Playwright
      const fs = require('fs');
      const path = require('path');
      
      // Use real workspace path, not backend path
      const taskFilePath = path.join(workspacePath, `task_${task.id}.md`);
      fs.writeFileSync(taskFilePath, taskContent);
      
      logger.info('✅ [vscodeIDEService] Created task file at:', taskFilePath);
      
      // Open file in VSCode IDE via Playwright
      await page.evaluate((filePath) => {
        // This would open the file in VSCode IDE
        // For now, we'll just log it
        logger.info('Opening file in VSCode IDE:', filePath);
      }, taskFilePath);
      
      logger.info('✅ [vscodeIDEService] Task sent to VSCode IDE successfully');
      
      return {
        success: true,
        taskId: task.id,
        filePath: taskFilePath,
        message: 'Task sent to VSCode IDE successfully'
      };
      
    } catch (error) {
      logger.error('❌ [vscodeIDEService] Error sending task to VSCode IDE:', error);
      throw new Error(`Failed to send task to VSCode IDE: ${error.message}`);
    }
  }

  /**
   * Send auto mode tasks to VSCode IDE via Playwright
   * @param {Array} tasks - Array of tasks
   * @param {Object} projectAnalysis - Project analysis
   * @param {string} workspacePath - Workspace path
   * @returns {Promise<Object>} Result of sending tasks
   */
  async sendAutoModeTasksToVSCode(tasks, projectAnalysis, workspacePath = null) {
    logger.info('🔍 [vscodeIDEService] Sending auto mode tasks to VSCode IDE:', tasks.length, 'tasks');
    
    try {
      // Get active IDE workspace path if not provided
      if (!workspacePath) {
        const activeIDE = await this.ideManager.getActiveIDE();
        workspacePath = activeIDE?.workspacePath;
        logger.info('🔍 [vscodeIDEService] Using active IDE workspace path:', workspacePath);
      }
      
      if (!workspacePath) {
        throw new Error('No workspace path available for VSCode IDE');
      }
      
      // Create comprehensive auto mode content
      const autoModeContent = `# Auto Mode Tasks: ${projectAnalysis.projectType} Project

## Project Analysis
- **Type**: ${projectAnalysis.projectType}
- **Complexity**: ${projectAnalysis.complexity}
- **Path**: ${projectAnalysis.projectPath}
- **Analysis Time**: ${projectAnalysis.timestamp}

## Generated Tasks (${tasks.length} total)

${tasks.map((task, index) => `
### Task ${index + 1}: ${task.title}
- **Type**: ${task.type}
- **Priority**: ${task.priority}
- **Description**: ${task.description}

**Instructions**: ${task.description}

---
`).join('\n')}

## Auto Mode Instructions
1. Review each task above
2. Execute tasks in priority order (High → Medium → Low)
3. Provide completion status for each task
4. Report any issues or additional tasks needed

## Expected Outcome
Complete all generated tasks and provide a comprehensive summary.

---
*Auto-generated by PIDEA AI Task Management System*
`;

      // Create file in workspace via Playwright
      const fs = require('fs');
      const path = require('path');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
      
      // Use real workspace path, not backend path
      const autoModeFilePath = path.join(workspacePath, `auto_mode_tasks_${Date.now()}.md`);
      fs.writeFileSync(autoModeFilePath, autoModeContent);
      
      logger.info('✅ [vscodeIDEService] Created auto mode file at:', autoModeFilePath);
      
      // Open file in VSCode IDE via Playwright
      const page = await this.browserManager.getPage();
      if (page) {
        await page.evaluate((filePath) => {
          // This would open the file in VSCode IDE
          logger.info('Opening auto mode file in VSCode IDE:', filePath);
        }, autoModeFilePath);
      }
      
      logger.info('✅ [vscodeIDEService] Auto mode tasks sent to VSCode IDE successfully');
      
      return {
        success: true,
        taskCount: tasks.length,
        filePath: autoModeFilePath,
        message: 'Auto mode tasks sent to VSCode IDE successfully'
      };
      
    } catch (error) {
      logger.error('❌ [vscodeIDEService] Error sending auto mode tasks to VSCode IDE:', error);
      throw new Error(`Failed to send auto mode tasks to VSCode IDE: ${error.message}`);
    }
  }
}

module.exports = VSCodeIDEService; 