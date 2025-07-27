const TerminalMonitor = require('../terminal/TerminalMonitor');
const WorkspacePathDetector = require('../workspace/WorkspacePathDetector');
const ChatHistoryExtractor = require('../chat/ChatHistoryExtractor');
const PackageJsonAnalyzer = require('../dev-server/PackageJsonAnalyzer');
const Logger = require('@logging/Logger');
const logger = new Logger('CursorIDEService');

class CursorIDEService {
  constructor(browserManager, ideManager, eventBus = null) {
    this.browserManager = browserManager;
    this.ideManager = ideManager;
    this.eventBus = eventBus;
    
    // Initialize separated services
    this.terminalMonitor = new TerminalMonitor(browserManager, eventBus);
    this.packageJsonAnalyzer = new PackageJsonAnalyzer(eventBus);
    this.workspacePathDetector = new WorkspacePathDetector(browserManager, ideManager);
    this.chatHistoryExtractor = new ChatHistoryExtractor(browserManager);
    
    // Listen for IDE changes to reset package.json cache (optional, if you cache results)
    if (this.eventBus) {
      this.eventBus.subscribe('activeIDEChanged', async (eventData) => {
        logger.info('IDE changed, resetting package.json cache');
        logger.info('Event data:', eventData);
        // No cache in new analyzer, but if you add one, reset here
        // this.packageJsonAnalyzer.resetCache?.();
        // Switch browser connection to new IDE using pooled connections
        if (eventData.port) {
          try {
            logger.info(`Switching browser connection to port: ${eventData.port} using pooled connections`);
            const start = process.hrtime.bigint();
            await this.browserManager.switchToPort(eventData.port);
            const duration = Number(process.hrtime.bigint() - start) / 1000; // Convert to milliseconds
            logger.info(`Successfully switched browser connection to port: ${eventData.port} in ${duration.toFixed(2)}ms`);
          } catch (error) {
            logger.error('Failed to switch browser connection:', error.message);
          }
        }
      });
    }
  }

  /**
   * @deprecated Use BrowserManager.typeMessage() or IDESendMessageStep instead
   * This method has been removed to prevent infinite loops
   */
  async sendMessage(message, options = {}) {
    console.warn('DEPRECATED: CursorIDEService.sendMessage() is deprecated. Use BrowserManager.typeMessage() or IDESendMessageStep instead.');
    throw new Error('sendMessage() - ChatMessageHandler removed, use IDE Steps instead');
  }

  async extractChatHistory() {
    // Ensure browser is connected to the active IDE port
    const activePort = this.getActivePort();
    // logger.info(`extractChatHistory() - Active port: ${activePort}`);
    
    if (activePort) {
      try {
        // Switch browser to active port if needed
        const currentBrowserPort = this.browserManager.getCurrentPort();
        // logger.info(`extractChatHistory() - Current browser port: ${currentBrowserPort}`);
        
        if (currentBrowserPort !== activePort) {
          logger.info('extractChatHistory() - Switching browser to active port:', activePort);
          await this.browserManager.switchToPort(activePort);
        }
      } catch (error) {
        logger.error('extractChatHistory() - Failed to switch browser port:', error.message);
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
   * Send a prompt to Cursor IDE via chat
   * @param {string} prompt - The prompt to send
   * @returns {Promise<Object>} Result of sending prompt
   */
  async postToCursor(prompt) {
    try {
      logger.info('Sending prompt to Cursor IDE:', prompt.substring(0, 100) + '...');
      
      // Use BrowserManager directly to avoid infinite loops
      logger.info('postToCursor() - Using BrowserManager directly');
      
      // Ensure browser is connected to the active IDE port
      const activePort = this.getActivePort();
      if (activePort) {
        try {
          const currentBrowserPort = this.browserManager.getCurrentPort();
          if (currentBrowserPort !== activePort) {
            logger.info('postToCursor() - Switching browser to active port:', activePort);
            await this.browserManager.switchToPort(activePort);
          }
        } catch (error) {
          logger.error('postToCursor() - Failed to switch browser port:', error.message);
        }
      }
      
      // Send message directly via BrowserManager
      const result = await this.browserManager.typeMessage(prompt, true);
      
      if (!result) {
        throw new Error('Failed to send prompt to Cursor IDE - BrowserManager returned false');
      }
      
      return {
        success: true,
        message: 'Prompt sent to Cursor IDE',
        data: result
      };
    } catch (error) {
      logger.error('Error sending prompt to Cursor:', error);
      throw error;
    }
  }

  /**
   * Apply refactoring changes to a file in Cursor IDE
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

      // Send the refactoring prompt to Cursor IDE
      const result = await this.postToCursor(applyPrompt);
      
      logger.info('Refactoring applied successfully');
      
      return {
        success: true,
        filePath,
        appliedAt: new Date(),
        result: result,
        message: 'Refactoring applied to Cursor IDE'
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
    const activePort = this.ideManager.getActivePort();
    // logger.info(`getActivePort() called, returning: ${activePort}`);
    return activePort;
  }

  async switchToPort(port) {
    const currentActivePort = this.getActivePort();
    logger.info(`switchToPort(${port}) called, current active port:`, currentActivePort);
    
    if (currentActivePort === port) {
      logger.info(`Already connected to port ${port}`);
      return;
    }
    
    logger.info(`Switching to port ${port} using pooled connections...`);
    
    try {
      // Use BrowserManager's pooled connection
      const start = process.hrtime.bigint();
      await this.browserManager.switchToPort(port);
      const duration = Number(process.hrtime.bigint() - start) / 1000; // Convert to milliseconds
      // Update IDE manager state (no redundant browser switching)
      if (this.ideManager.switchToIDE) {
        logger.info(`Updating IDE manager state for port ${port}`);
        await this.ideManager.switchToIDE(port);
      }
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
      logger.info('No workspace path provided, using active IDE workspace path:', workspacePath);
    }
    
    // If workspace path is virtual (like composer-code-block-anysphere:/), use project root as fallback
    if (workspacePath && workspacePath.includes(':')) {
      const path = require('path');
      const currentDir = process.cwd();
      workspacePath = path.resolve(currentDir, '..');
      logger.info('Virtual workspace detected, using project root as fallback:', workspacePath);
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
      logger.error('Error getting connection status:', error);
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

  /**
   * Generate AI-powered task suggestions based on project analysis
   * @param {Object} projectAnalysis - Project analysis results
   * @returns {Promise<Array>} Array of task suggestions
   */
  async generateTaskSuggestions(projectAnalysis) {
    logger.info('🔍 [CursorIDEService] Generating AI task suggestions for:', projectAnalysis.projectType);
    
    // Generate suggestions based on project type and analysis
    const suggestions = [];
    
    // Common suggestions for all project types
    suggestions.push({
      title: 'Add comprehensive tests',
      description: 'Create unit tests, integration tests, and e2e tests to improve code quality and reliability',
      type: 'test',
      priority: 'high'
    });
    
    suggestions.push({
      title: 'Improve documentation',
      description: 'Add README.md, API documentation, and inline code comments',
      type: 'documentation',
      priority: 'medium'
    });
    
    suggestions.push({
      title: 'Code quality improvements',
      description: 'Run linters, fix code style issues, and improve code organization',
      type: 'refactor',
      priority: 'medium'
    });
    
    // Project-specific suggestions
    if (projectAnalysis.projectType === 'nodejs' || projectAnalysis.projectType === 'react') {
      suggestions.push({
        title: 'Update dependencies',
        description: 'Check for outdated packages and update them to latest versions',
        type: 'maintenance',
        priority: 'medium'
      });
      
      suggestions.push({
        title: 'Add error handling',
        description: 'Implement proper error handling and logging throughout the application',
        type: 'bugfix',
        priority: 'high'
      });
    }
    
    if (projectAnalysis.projectType === 'react') {
      suggestions.push({
        title: 'Optimize bundle size',
        description: 'Analyze and reduce JavaScript bundle size for better performance',
        type: 'optimization',
        priority: 'medium'
      });
      
      suggestions.push({
        title: 'Add accessibility features',
        description: 'Implement ARIA labels, keyboard navigation, and screen reader support',
        type: 'feature',
        priority: 'medium'
      });
    }
    
    if (projectAnalysis.complexity === 'high') {
      suggestions.push({
        title: 'Architecture review',
        description: 'Review and refactor complex code structures for better maintainability',
        type: 'refactor',
        priority: 'high'
      });
    }
    
    // Add suggestions based on detected issues
    if (projectAnalysis.issues && projectAnalysis.issues.length > 0) {
      projectAnalysis.issues.forEach(issue => {
        // Handle both old string format and new object format
        const issueTitle = typeof issue === 'string' ? issue : issue.title;
        const issueDescription = typeof issue === 'string' ? issue : issue.description;
        const issueSeverity = typeof issue === 'string' ? 'medium' : issue.severity;
        
        suggestions.push({
          title: `Fix: ${issueTitle}`,
          description: issueDescription,
          type: 'bugfix',
          priority: issueSeverity === 'high' ? 'high' : 'medium'
        });
      });
    }
    
    // Add suggestions from project analysis
    if (projectAnalysis.suggestions && projectAnalysis.suggestions.length > 0) {
      projectAnalysis.suggestions.forEach(suggestion => {
        // Handle both old string format and new object format
        const suggestionTitle = typeof suggestion === 'string' ? suggestion : suggestion.title;
        const suggestionDescription = typeof suggestion === 'string' ? suggestion : suggestion.description;
        const suggestionPriority = typeof suggestion === 'string' ? 'medium' : suggestion.priority;
        
        suggestions.push({
          title: suggestionTitle,
          description: suggestionDescription,
          type: 'improvement',
          priority: suggestionPriority === 'high' ? 'high' : 'medium'
        });
      });
    }
    
    logger.info('✅ [CursorIDEService] Generated', suggestions.length, 'task suggestions');
    return suggestions;
  }

  /**
   * Send task to Cursor IDE via Playwright
   * @param {Object} task - Task object
   * @param {string} workspacePath - Workspace path
   * @returns {Promise<Object>} Result of sending task
   */
  async sendTaskToCursorIDE(task, workspacePath = null) {
    logger.info('🔍 [CursorIDEService] Sending task to Cursor IDE:', task.title);
    
    try {
      // Get active IDE workspace path if not provided
      if (!workspacePath) {
        const activeIDE = await this.ideManager.getActiveIDE();
        workspacePath = activeIDE?.workspacePath;
        logger.info('🔍 [CursorIDEService] Using active IDE workspace path:', workspacePath);
      }
      
      if (!workspacePath) {
        throw new Error('No workspace path available for Cursor IDE');
      }
      
      // Create task content
      const taskContent = `# Task: ${task.title}

## Description
${task.description}

## Type: ${task.type}
## Priority: ${task.priority}
## Status: ${task.status}

## Instructions
Please execute this task in Cursor IDE and provide a summary of what was accomplished.

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
      
      logger.info('✅ [CursorIDEService] Created task file at:', taskFilePath);
      
      // Open file in Cursor IDE via Playwright
      await page.evaluate((filePath) => {
        // This would open the file in Cursor IDE
        // For now, we'll just log it
        logger.info('Opening file in Cursor IDE:', filePath);
      }, taskFilePath);
      
      // Send message to Cursor chat
      const chatMessage = `New task created: ${task.title}

Please open the file \`task_${task.id}.md\` in your workspace and execute the task.

Task details:
- Title: ${task.title}
- Description: ${task.description}
- Type: ${task.type}
- Priority: ${task.priority}

Please provide a summary when you complete the task.`;
      
      await this.sendMessage(chatMessage);
      
      return {
        success: true,
        taskFilePath,
        message: 'Task sent to Cursor IDE successfully'
      };
      
    } catch (error) {
      logger.error('❌ [CursorIDEService] Error sending task to Cursor IDE:', error);
      throw error;
    }
  }

  /**
   * Send auto mode tasks to Cursor IDE via Playwright
   * @param {Array} tasks - Array of tasks
   * @param {Object} projectAnalysis - Project analysis
   * @param {string} workspacePath - Workspace path
   * @returns {Promise<Object>} Result of sending tasks
   */
  async sendAutoModeTasksToCursorIDE(tasks, projectAnalysis, workspacePath = null) {
    logger.info('🔍 [CursorIDEService] Sending auto mode tasks to Cursor IDE:', tasks.length, 'tasks');
    
    try {
      // Get active IDE workspace path if not provided
      if (!workspacePath) {
        const activeIDE = await this.ideManager.getActiveIDE();
        workspacePath = activeIDE?.workspacePath;
        logger.info('🔍 [CursorIDEService] Using active IDE workspace path:', workspacePath);
      }
      
      if (!workspacePath) {
        throw new Error('No workspace path available for Cursor IDE');
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
      
      // Use real workspace path, not backend path
      const autoModeFilePath = path.join(workspacePath, 'auto_mode_tasks.md');
      fs.writeFileSync(autoModeFilePath, autoModeContent);
      
      logger.info('✅ [CursorIDEService] Created auto mode file at:', autoModeFilePath);
      
      // Get browser page
      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No browser page available');
      }
      
      // Open file in Cursor IDE via Playwright
      await page.evaluate((filePath) => {
        // This would open the file in Cursor IDE
        // For now, we'll just log it
        logger.info('Opening auto mode file in Cursor IDE:', filePath);
      }, autoModeFilePath);
      
      // Send message to Cursor chat
      const chatMessage = `Auto Mode activated! 🚀

I've analyzed your project and generated ${tasks.length} tasks to improve your codebase.

Please open the file \`auto_mode_tasks.md\` in your workspace and execute all tasks in priority order.

Project Analysis:
- Type: ${projectAnalysis.projectType}
- Complexity: ${projectAnalysis.complexity}
- Issues Found: ${projectAnalysis.issues?.length || 0}

Please provide a comprehensive summary when you complete all tasks.`;
      
      await this.sendMessage(chatMessage);
      
      return {
        success: true,
        autoModeFilePath,
        tasksCount: tasks.length,
        message: 'Auto mode tasks sent to Cursor IDE successfully'
      };
      
    } catch (error) {
      logger.error('❌ [CursorIDEService] Error sending auto mode tasks to Cursor IDE:', error);
      throw error;
    }
  }
}

module.exports = CursorIDEService; 