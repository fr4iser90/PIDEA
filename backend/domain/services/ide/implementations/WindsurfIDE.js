/**
 * WindsurfIDE - Windsurf IDE Implementation
 * Extends BaseIDE to provide Windsurf-specific functionality
 */
const BaseIDE = require('../BaseIDE');
const IDETypes = require('../IDETypes');

class WindsurfIDE extends BaseIDE {
  constructor(browserManager, ideManager, eventBus = null) {
    super(browserManager, ideManager, eventBus, IDETypes.WINDSURF);
    
    // Windsurf-specific configuration
    this.config = {
      name: 'Windsurf',
      displayName: 'Windsurf IDE',
      defaultPort: 9242,
      portRange: { start: 9242, end: 9251 },
      startupCommand: 'windsurf',
      detectionPatterns: ['windsurf', 'Windsurf'],
      supportedFeatures: ['chat', 'refactoring', 'terminal', 'git', 'ai'],
      fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.py', '.java'],
      startupTimeout: 4000
    };
    
    // Windsurf-specific state
    this.windsurfFeatures = {
      aiChat: true,
      codeCompletion: true,
      refactoring: true,
      terminal: true,
      git: true,
      extensions: true,
      debugging: true
    };
  }

  /**
   * Get Windsurf-specific features
   * @returns {Promise<Object>} Windsurf features
   */
  async getFeatures() {
    return {
      ...super.getFeatures(),
      ...this.windsurfFeatures,
      ideType: 'windsurf',
      displayName: this.config.displayName,
      version: await this.getVersion()
    };
  }

  /**
   * Get Windsurf version
   * @returns {Promise<string>} Windsurf version
   */
  async getVersion() {
    try {
      if (!this.browserManager) {
        return 'unknown';
      }

      const page = await this.browserManager.getPage();
      if (!page) {
        return 'unknown';
      }

      // Try to get version from Windsurf's version endpoint
      const response = await page.evaluate(() => {
        return new Promise((resolve) => {
          fetch('/json/version')
            .then(res => res.json())
            .then(data => resolve(data.Browser || 'unknown'))
            .catch(() => resolve('unknown'));
        });
      });

      return response || 'unknown';
    } catch (error) {
      console.warn('[WindsurfIDE] Could not get version:', error.message);
      return 'unknown';
    }
  }

  /**
   * Get Windsurf DOM structure
   * @returns {Promise<Object>} Windsurf DOM structure
   */
  async getDOM() {
    try {
      if (!this.browserManager) {
        throw new Error('Browser manager not available');
      }

      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No active page');
      }

      const domStructure = await page.evaluate(() => {
        const getElementInfo = (element) => {
          if (!element) return null;
          
          return {
            tagName: element.tagName,
            id: element.id,
            className: element.className,
            textContent: element.textContent?.substring(0, 100),
            children: Array.from(element.children).map(child => getElementInfo(child))
          };
        };

        return {
          title: document.title,
          url: window.location.href,
          body: getElementInfo(document.body),
          windsurf: {
            chatPanel: getElementInfo(document.querySelector('[data-testid="chat-panel"]')),
            editor: getElementInfo(document.querySelector('[data-testid="editor"]')),
            sidebar: getElementInfo(document.querySelector('[data-testid="sidebar"]')),
            terminal: getElementInfo(document.querySelector('[data-testid="terminal"]')),
            aiAssistant: getElementInfo(document.querySelector('[data-testid="ai-assistant"]'))
          }
        };
      });

      return {
        success: true,
        dom: domStructure,
        timestamp: new Date(),
        ideType: 'windsurf'
      };
    } catch (error) {
      console.error('[WindsurfIDE] Failed to get DOM:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
        ideType: 'windsurf'
      };
    }
  }

  /**
   * Interact with Windsurf elements
   * @param {string} selector - CSS selector
   * @param {string} action - Action to perform
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Interaction result
   */
  async interact(selector, action, options = {}) {
    try {
      if (!this.browserManager) {
        throw new Error('Browser manager not available');
      }

      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No active page');
      }

      // Windsurf-specific selectors
      const windsurfSelectors = {
        chatInput: '[data-testid="chat-input"]',
        chatSend: '[data-testid="chat-send"]',
        editor: '[data-testid="editor"]',
        sidebar: '[data-testid="sidebar"]',
        terminal: '[data-testid="terminal"]',
        aiAssistant: '[data-testid="ai-assistant"]',
        fileExplorer: '[data-testid="file-explorer"]',
        gitPanel: '[data-testid="git-panel"]'
      };

      // Use Windsurf-specific selector if available
      const finalSelector = windsurfSelectors[selector] || selector;

      switch (action) {
        case 'click':
          await page.click(finalSelector);
          break;
        case 'type':
          await page.type(finalSelector, options.text || '');
          break;
        case 'fill':
          await page.fill(finalSelector, options.text || '');
          break;
        case 'hover':
          await page.hover(finalSelector);
          break;
        case 'focus':
          await page.focus(finalSelector);
          break;
        case 'select':
          await page.selectOption(finalSelector, options.value || '');
          break;
        default:
          throw new Error(`Unsupported action: ${action}`);
      }

      return {
        success: true,
        action: action,
        selector: finalSelector,
        timestamp: new Date(),
        ideType: 'windsurf'
      };
    } catch (error) {
      console.error('[WindsurfIDE] Interaction failed:', error);
      return {
        success: false,
        error: error.message,
        action: action,
        selector: selector,
        timestamp: new Date(),
        ideType: 'windsurf'
      };
    }
  }

  /**
   * Send message to Windsurf chat
   * @param {string} message - Message to send
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Message result
   */
  async sendMessage(message, options = {}) {
    try {
      if (!this.browserManager) {
        throw new Error('Browser manager not available');
      }

      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No active page');
      }

      // Find chat input and send message
      const chatInput = '[data-testid="chat-input"]';
      const chatSend = '[data-testid="chat-send"]';

      // Type message
      await page.fill(chatInput, message);
      
      // Send message
      await page.click(chatSend);

      // Wait for response (if requested)
      if (options.waitForResponse) {
        await page.waitForSelector('[data-testid="chat-message"]', { timeout: 30000 });
      }

      return {
        success: true,
        message: message,
        timestamp: new Date(),
        ideType: 'windsurf'
      };
    } catch (error) {
      console.error('[WindsurfIDE] Failed to send message:', error);
      return {
        success: false,
        error: error.message,
        message: message,
        timestamp: new Date(),
        ideType: 'windsurf'
      };
    }
  }

  /**
   * Get Windsurf workspace path
   * @returns {Promise<string>} Workspace path
   */
  async getWorkspacePath() {
    try {
      if (!this.browserManager) {
        return null;
      }

      const page = await this.browserManager.getPage();
      if (!page) {
        return null;
      }

      // Try to get workspace path from Windsurf's file explorer
      const workspacePath = await page.evaluate(() => {
        const fileExplorer = document.querySelector('[data-testid="file-explorer"]');
        if (fileExplorer) {
          return fileExplorer.getAttribute('data-workspace-path') || null;
        }
        return null;
      });

      return workspacePath;
    } catch (error) {
      console.warn('[WindsurfIDE] Could not get workspace path:', error.message);
      return null;
    }
  }

  /**
   * Switch Windsurf to specific port
   * @param {number} port - Port to switch to
   * @returns {Promise<Object>} Switch result
   */
  async switchToPort(port) {
    try {
      if (!this.ideManager) {
        throw new Error('IDE manager not available');
      }

      // Check if Windsurf is running on the target port
      const isRunning = await this.ideManager.isIDERunning(port, 'windsurf');
      if (!isRunning) {
        throw new Error(`Windsurf is not running on port ${port}`);
      }

      // Switch to the target port
      await this.ideManager.switchToPort(port);
      
      // Update active port
      this.activePort = port;

      return {
        success: true,
        port: port,
        timestamp: new Date(),
        ideType: 'windsurf'
      };
    } catch (error) {
      console.error('[WindsurfIDE] Failed to switch port:', error);
      return {
        success: false,
        error: error.message,
        port: port,
        timestamp: new Date(),
        ideType: 'windsurf'
      };
    }
  }

  /**
   * Get active Windsurf port
   * @returns {number|null} Active port
   */
  getActivePort() {
    return this.activePort;
  }

  /**
   * Monitor Windsurf terminal output
   * @param {Object} options - Monitoring options
   * @returns {Promise<Object>} Terminal output
   */
  async monitorTerminalOutput(options = {}) {
    try {
      if (!this.browserManager) {
        throw new Error('Browser manager not available');
      }

      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No active page');
      }

      // Get terminal output from Windsurf
      const terminalOutput = await page.evaluate(() => {
        const terminal = document.querySelector('[data-testid="terminal"]');
        if (terminal) {
          return terminal.textContent || '';
        }
        return '';
      });

      return {
        success: true,
        output: terminalOutput,
        timestamp: new Date(),
        ideType: 'windsurf'
      };
    } catch (error) {
      console.error('[WindsurfIDE] Failed to monitor terminal:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
        ideType: 'windsurf'
      };
    }
  }

  /**
   * Get Windsurf user app URL for port
   * @param {number} port - Port number
   * @returns {string} User app URL
   */
  getUserAppUrlForPort(port) {
    return `http://localhost:${port}`;
  }

  /**
   * Detect dev server from package.json in Windsurf
   * @param {string} workspacePath - Workspace path
   * @returns {Promise<Object>} Dev server information
   */
  async detectDevServerFromPackageJson(workspacePath) {
    try {
      if (!this.packageJsonAnalyzer) {
        throw new Error('Package.json analyzer not available');
      }

      const devServerInfo = await this.packageJsonAnalyzer.analyze(workspacePath);
      
      return {
        success: true,
        devServer: devServerInfo,
        timestamp: new Date(),
        ideType: 'windsurf'
      };
    } catch (error) {
      console.error('[WindsurfIDE] Failed to detect dev server:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
        ideType: 'windsurf'
      };
    }
  }

  /**
   * Apply refactoring in Windsurf
   * @param {string} refactoringType - Type of refactoring
   * @param {Object} options - Refactoring options
   * @returns {Promise<Object>} Refactoring result
   */
  async applyRefactoring(refactoringType, options = {}) {
    try {
      if (!this.browserManager) {
        throw new Error('Browser manager not available');
      }

      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No active page');
      }

      // Windsurf-specific refactoring logic
      switch (refactoringType) {
        case 'rename':
          // Trigger rename refactoring
          await page.keyboard.press('F2');
          break;
        case 'extract':
          // Trigger extract method refactoring
          await page.keyboard.press('Ctrl+Shift+R');
          break;
        case 'move':
          // Trigger move refactoring
          await page.keyboard.press('F6');
          break;
        default:
          throw new Error(`Unsupported refactoring type: ${refactoringType}`);
      }

      return {
        success: true,
        refactoringType: refactoringType,
        timestamp: new Date(),
        ideType: 'windsurf'
      };
    } catch (error) {
      console.error('[WindsurfIDE] Refactoring failed:', error);
      return {
        success: false,
        error: error.message,
        refactoringType: refactoringType,
        timestamp: new Date(),
        ideType: 'windsurf'
      };
    }
  }

  /**
   * Send task to Windsurf
   * @param {Object} task - Task to send
   * @returns {Promise<Object>} Task result
   */
  async sendTask(task) {
    try {
      if (!this.browserManager) {
        throw new Error('Browser manager not available');
      }

      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No active page');
      }

      // Send task to Windsurf's AI assistant
      const aiAssistant = '[data-testid="ai-assistant"]';
      const taskInput = '[data-testid="task-input"]';
      const taskSend = '[data-testid="task-send"]';

      // Type task
      await page.fill(taskInput, task.description || '');
      
      // Send task
      await page.click(taskSend);

      return {
        success: true,
        task: task,
        timestamp: new Date(),
        ideType: 'windsurf'
      };
    } catch (error) {
      console.error('[WindsurfIDE] Failed to send task:', error);
      return {
        success: false,
        error: error.message,
        task: task,
        timestamp: new Date(),
        ideType: 'windsurf'
      };
    }
  }

  /**
   * Send auto mode tasks to Windsurf
   * @param {Array} tasks - Array of tasks
   * @returns {Promise<Object>} Auto mode result
   */
  async sendAutoModeTasks(tasks) {
    try {
      if (!Array.isArray(tasks)) {
        throw new Error('Tasks must be an array');
      }

      const results = [];
      
      for (const task of tasks) {
        const result = await this.sendTask(task);
        results.push(result);
        
        // Wait between tasks
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return {
        success: true,
        tasks: tasks,
        results: results,
        timestamp: new Date(),
        ideType: 'windsurf'
      };
    } catch (error) {
      console.error('[WindsurfIDE] Auto mode failed:', error);
      return {
        success: false,
        error: error.message,
        tasks: tasks,
        timestamp: new Date(),
        ideType: 'windsurf'
      };
    }
  }

  /**
   * Get Windsurf-specific capabilities
   * @returns {Object} Capabilities
   */
  getCapabilities() {
    return {
      ...super.getCapabilities(),
      aiChat: true,
      codeCompletion: true,
      refactoring: true,
      terminal: true,
      git: true,
      extensions: true,
      debugging: true,
      aiAssistant: true,
      taskManagement: true,
      autoMode: true
    };
  }
}

module.exports = WindsurfIDE; 