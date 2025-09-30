
/**
 * VSCodeIDE - VSCode IDE implementation
 * Extends BaseIDE with VSCode-specific functionality
 */
const BaseIDE = require('../BaseIDE');
const IDETypes = require('../IDETypes');
const VSCodeExtensionManager = require('@external/VSCodeExtensionManager');

class VSCodeIDE extends BaseIDE {
  constructor(browserManager, ideManager, eventBus = null) {
    super(browserManager, ideManager, eventBus, IDETypes.VSCODE);
    
    // Initialize VSCode-specific services with IDE type
    this.extensionManager = new VSCodeExtensionManager();
    
    // Ensure ChatHistoryExtractor is properly configured for VS Code
    const ChatHistoryExtractor = require('../chat/ChatHistoryExtractor');
    this.chatHistoryExtractor = new ChatHistoryExtractor(browserManager, IDETypes.VSCODE);
    logger.info('ChatHistoryExtractor created with IDE type:', this.chatHistoryExtractor.ideType);
    logger.info('ChatHistoryExtractor selectors:', this.chatHistoryExtractor.selectors);
    
    // VSCode-specific properties
    this.vscodeFeatures = [
      'ai_chat',
      'code_completion',
      'refactoring',
      'terminal',
      'git_integration',
      'extension_support',
      'debugging',
      'intellisense',
      'snippets',
      'multi_cursor'
    ];
    
    this.isInitialized = true;
    logger.info('VSCode IDE implementation initialized');
  }

  /**
   * Detect if VSCode IDE is running
   * @returns {Promise<boolean>} True if VSCode is running
   */
  async detect() {
    try {
      const availableIDEs = await this.ideManager.getAvailableIDEs();
      const vscodeIDEs = availableIDEs.filter(ide => 
        ide.ideType === IDETypes.VSCODE || 
        ide.source === 'detected' && ide.port === this.getActivePort()
      );
      
      return vscodeIDEs.length > 0;
    } catch (error) {
      this.handleError(error, 'detect');
      return false;
    }
  }

  /**
   * Start VSCode IDE instance
   * @param {string} workspacePath - Path to workspace
   * @param {Object} options - Startup options
   * @returns {Promise<Object>} VSCode startup result
   */
  async start(workspacePath = null, options = {}) {
    try {
      logger.info('Starting VSCode IDE...');
      
      const ideInfo = await this.ideManager.startNewIDE(workspacePath, IDETypes.VSCODE);
      
      this.updateStatus('started', { workspacePath, port: ideInfo.port });
      
      return {
        success: true,
        ideType: IDETypes.VSCODE,
        port: ideInfo.port,
        workspacePath: ideInfo.workspacePath,
        status: 'running',
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError(error, 'start');
    }
  }

  /**
   * Stop VSCode IDE instance
   * @returns {Promise<Object>} VSCode stop result
   */
  async stop() {
    try {
      const activePort = this.getActivePort();
      if (!activePort) {
        throw new Error('No active VSCode IDE to stop');
      }
      
      logger.info('Stopping VSCode IDE on port', activePort);
      
      const result = await this.ideManager.stopIDE(activePort);
      
      this.updateStatus('stopped', { port: activePort });
      
      return {
        success: true,
        ideType: IDETypes.VSCODE,
        port: activePort,
        status: 'stopped',
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError(error, 'stop');
    }
  }

  /**
   * Get VSCode IDE version
   * @returns {Promise<string>} VSCode version
   */
  async getVersion() {
    try {
      const page = await this.getPage();
      if (!page) {
        return 'unknown';
      }
      
      // Try to get version from VSCode's UI
      const version = await page.evaluate(() => {
        // Method 1: Look for version in UI elements
        const versionElement = document.querySelector('[data-testid="version"]') ||
                             document.querySelector('.version') ||
                             document.querySelector('[title*="version"]') ||
                             document.querySelector('.status-bar-item[title*="version"]');
        
        if (versionElement) {
          return versionElement.textContent.trim();
        }
        
        // Method 2: Look in meta tags
        const metaVersion = document.querySelector('meta[name="vscode-version"]');
        if (metaVersion) {
          return metaVersion.content;
        }
        
        // Method 3: Look in window object
        if (window.vscode && window.vscode.version) {
          return window.vscode.version;
        }
        
        return 'unknown';
      });
      
      return this.normalizeVersion(version) || 'unknown';
    } catch (error) {
      this.handleError(error, 'getVersion');
      return 'unknown';
    }
  }

  /**
   * Normalize version format
   * @param {string} version - Raw version string
   * @returns {string} Normalized version
   */
  normalizeVersion(version) {
    if (!version || version === 'unknown') {
      return 'unknown';
    }
    
    // Remove any non-version characters
    const cleaned = version.replace(/[^0-9.]/g, '');
    
    // Ensure it's a valid semantic version
    const versionRegex = /^(\d+)\.(\d+)\.(\d+)$/;
    if (versionRegex.test(cleaned)) {
      return cleaned;
    }
    
    // Try to extract version from string
    const match = version.match(/(\d+\.\d+\.\d+)/);
    if (match) {
      return match[1];
    }
    
    return 'unknown';
  }

  /**
   * Get VSCode-specific features
   * @returns {Promise<Array>} VSCode features
   */
  async getFeatures() {
    return this.vscodeFeatures;
  }

  /**
   * Execute VSCode IDE command
   * @param {string} command - Command to execute
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Command result
   */
  async executeCommand(command, options = {}) {
    try {
      const page = await this.getPage();
      if (!page) {
        throw new Error('No browser page available');
      }
      
      // Execute command via VSCode's command palette
      await page.keyboard.down('Control');
      await page.keyboard.down('Shift');
      await page.keyboard.press('P');
      await page.keyboard.up('Control');
      await page.keyboard.up('Shift');
      
      await page.waitForTimeout(500);
      await page.keyboard.type(command);
      await page.keyboard.press('Enter');
      
      this.updateStatus('command_executed', { command });
      
      return {
        success: true,
        command,
        ideType: IDETypes.VSCODE,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError(error, `executeCommand(${command})`);
    }
  }

  /**
   * Get workspace path for VSCode
   * @returns {Promise<string>} Workspace path
   */
  async getWorkspacePath() {
    try {
      const activeIDE = await this.ideManager.getActiveIDE();
      if (!activeIDE) {
        throw new Error('No active IDE found');
      }
      
      return activeIDE.workspacePath || null;
    } catch (error) {
      this.handleError(error, 'getWorkspacePath');
      return null;
    }
  }

  /**
   * Switch to different VSCode session/port
   * @param {number} port - VSCode port
   * @returns {Promise<Object>} Switch result
   */
  async switchToPort(port) {
    try {
      const currentActivePort = this.getActivePort();
      logger.info(`switchToPort(${port}) called, current active port:`, currentActivePort);
      
      if (currentActivePort === port) {
        logger.info(`Already connected to port ${port}`);
        return {
          success: true,
          port,
          message: 'Already connected to this port',
          timestamp: new Date()
        };
      }
      
      logger.info(`Switching to port ${port}`);
      
      // Only call ideManager - it handles browser switching internally
      if (this.ideManager.switchToIDE) {
        logger.info(`Calling ideManager.switchToIDE(${port})`);
        await this.ideManager.switchToIDE(port);
        logger.info(`ideManager.switchToIDE(${port}) completed`);
      }
      
      this.updateStatus('switched', { port, previousPort: currentActivePort });
      
      return {
        success: true,
        port,
        previousPort: currentActivePort,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError(error, `switchToPort(${port})`);
    }
  }

  /**
   * Get active port for VSCode
   * @returns {number|null} Active port number
   */
  getActivePort() {
    return this.ideManager.getActivePort();
  }

  /**
   * Extract chat history from VSCode
   * @returns {Promise<Array>} Chat history
   */
  async extractChatHistory() {
    logger.info('extractChatHistory() called');
    logger.info('Using chatHistoryExtractor with IDE type:', this.chatHistoryExtractor?.ideType);
    
    if (this.chatHistoryExtractor) {
      const result = await this.chatHistoryExtractor.extractChatHistory();
      logger.info('extractChatHistory() result:', result);
      return result;
    } else {
      logger.info('No chatHistoryExtractor available, using base class');
      return await super.extractChatHistory();
    }
  }

  /**
   * Send message to VSCode chat
   * @param {string} message - Message to send
   * @param {Object} options - Message options
   * @returns {Promise<Object>} Message result
   */
  async sendMessage(message, options = {}) {
    try {
      // Ensure browser is connected to the active IDE port
      const activePort = this.getActivePort();
      logger.info('sendMessage() - Active port:', activePort);
      
      if (activePort) {
        try {
          // Switch browser to active port if needed
          const currentBrowserPort = this.browserManager.getCurrentPort();
          logger.info('sendMessage() - Current browser port:', currentBrowserPort);
          
          if (currentBrowserPort !== activePort) {
            logger.info('sendMessage() - Switching browser to active port:', activePort);
            await this.browserManager.switchToPort(activePort);
          }
        } catch (error) {
          logger.error('sendMessage() - Failed to switch browser port:', error.message);
        }
      }
      
      // Use IDE Steps instead of ChatMessageHandler
      logger.info('sendMessage() - Using IDE Steps for message sending');
      throw new Error('sendMessage() - ChatMessageHandler removed, use IDE Steps instead');
      
      this.updateStatus('message_sent', { messageLength: message.length });
      
      return result;
    } catch (error) {
      return this.handleError(error, 'sendMessage');
    }
  }

  /**
   * Get user app URL for VSCode
   * @param {number} port - VSCode port
   * @returns {Promise<string|null>} User app URL
   */
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
      this.handleError(error, `getUserAppUrlForPort(${port})`);
      return null;
    }
  }

  /**
   * Apply refactoring to file in VSCode
   * @param {string} filePath - File path
   * @param {string} refactoredCode - Refactored code content
   * @returns {Promise<Object>} Refactoring result
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
      const result = await this.sendMessage(applyPrompt);
      
      logger.info('Refactoring applied successfully');
      
      this.updateStatus('refactoring_applied', { filePath });
      
      return {
        success: true,
        filePath,
        appliedAt: new Date(),
        result: result,
        message: 'Refactoring applied to VSCode IDE'
      };
    } catch (error) {
      return this.handleError(error, `applyRefactoring(${filePath})`);
    }
  }

  /**
   * Send task to VSCode IDE
   * @param {Object} task - Task object
   * @param {string} workspacePath - Workspace path
   * @returns {Promise<Object>} Task result
   */
  async sendTask(task, workspacePath = null) {
    try {
      logger.info('🔍 [VSCodeIDE] Sending task to VSCode IDE:', task.title);
      
      // Get active IDE workspace path if not provided
      if (!workspacePath) {
        const activeIDE = await this.ideManager.getActiveIDE();
        workspacePath = activeIDE?.workspacePath;
        logger.info('🔍 [VSCodeIDE] Using active IDE workspace path:', workspacePath);
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
      
      logger.info('✅ [VSCodeIDE] Created task file at:', taskFilePath);
      
      // Open file in VSCode IDE via Playwright
      await page.evaluate((filePath) => {
        // This would open the file in VSCode IDE
        // For now, we'll just log it
        logger.info('Opening file in VSCode IDE:', filePath);
      }, taskFilePath);
      
      // Send message to VSCode chat
      const chatMessage = `New task created: ${task.title}

Please open the file \`task_${task.id}.md\` in your workspace and execute the task.

Task details:
- Title: ${task.title}
- Description: ${task.description}
- Type: ${task.type}
- Priority: ${task.priority}

Please provide a summary when you complete the task.`;
      
      await this.sendMessage(chatMessage);
      
      this.updateStatus('task_sent', { taskId: task.id, taskTitle: task.title });
      
      return {
        success: true,
        taskFilePath,
        message: 'Task sent to VSCode IDE successfully'
      };
      
    } catch (error) {
      return this.handleError(error, `sendTask(${task.title})`);
    }
  }

  /**
   * Send auto mode tasks to VSCode IDE
   * @param {Array} tasks - Array of tasks
   * @param {Object} projectAnalysis - Project analysis
   * @param {string} workspacePath - Workspace path
   * @returns {Promise<Object>} Auto mode result
   */
  async sendAutoModeTasks(tasks, projectAnalysis, workspacePath = null) {
    try {
      logger.info('🔍 [VSCodeIDE] Sending auto mode tasks to VSCode IDE:', tasks.length, 'tasks');
      
      // Get active IDE workspace path if not provided
      if (!workspacePath) {
        const activeIDE = await this.ideManager.getActiveIDE();
        workspacePath = activeIDE?.workspacePath;
        logger.info('🔍 [VSCodeIDE] Using active IDE workspace path:', workspacePath);
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
      const autoModeFilePath = path.join(workspacePath, 'auto_mode_tasks.md');
      fs.writeFileSync(autoModeFilePath, autoModeContent);
      
      logger.info('✅ [VSCodeIDE] Created auto mode file at:', autoModeFilePath);
      
      // Get browser page
      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No browser page available');
      }
      
      // Open file in VSCode IDE via Playwright
      await page.evaluate((filePath) => {
        // This would open the file in VSCode IDE
        // For now, we'll just log it
        logger.info('Opening auto mode file in VSCode IDE:', filePath);
      }, autoModeFilePath);
      
      // Send message to VSCode chat
      const chatMessage = `Auto Mode activated! 🚀

I've analyzed your project and generated ${tasks.length} tasks to improve your codebase.

Please open the file \`auto_mode_tasks.md\` in your workspace and execute all tasks in priority order.

Project Analysis:
- Type: ${projectAnalysis.projectType}
- Complexity: ${projectAnalysis.complexity}
- Issues Found: ${projectAnalysis.issues?.length || 0}

Please provide a comprehensive summary when you complete all tasks.`;
      
      await this.sendMessage(chatMessage);
      
      this.updateStatus('auto_mode_tasks_sent', { 
        tasksCount: tasks.length, 
        projectType: projectAnalysis.projectType 
      });
      
      return {
        success: true,
        autoModeFilePath,
        tasksCount: tasks.length,
        message: 'Auto mode tasks sent to VSCode IDE successfully'
      };
      
    } catch (error) {
      return this.handleError(error, 'sendAutoModeTasks');
    }
  }

  /**
   * Get VSCode extensions
   * @returns {Promise<Array>} List of installed extensions
   */
  async getExtensions() {
    try {
      if (this.extensionManager) {
        return await this.extensionManager.getInstalledExtensions();
      }
      return [];
    } catch (error) {
      this.handleError(error, 'getExtensions');
      return [];
    }
  }

  /**
   * Install VSCode extension
   * @param {string} extensionId - Extension ID
   * @returns {Promise<Object>} Installation result
   */
  async installExtension(extensionId) {
    try {
      if (this.extensionManager) {
        const result = await this.extensionManager.installExtension(extensionId);
        this.updateStatus('extension_installed', { extensionId });
        return result;
      }
      throw new Error('Extension manager not available');
    } catch (error) {
      return this.handleError(error, `installExtension(${extensionId})`);
    }
  }

  /**
   * Uninstall VSCode extension
   * @param {string} extensionId - Extension ID
   * @returns {Promise<Object>} Uninstallation result
   */
  async uninstallExtension(extensionId) {
    try {
      if (this.extensionManager) {
        const result = await this.extensionManager.uninstallExtension(extensionId);
        this.updateStatus('extension_uninstalled', { extensionId });
        return result;
      }
      throw new Error('Extension manager not available');
    } catch (error) {
      return this.handleError(error, `uninstallExtension(${extensionId})`);
    }
  }
}

module.exports = VSCodeIDE; 