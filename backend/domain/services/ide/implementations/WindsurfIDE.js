
/**
 * WindsurfIDE - Windsurf IDE Implementation
 * Extends BaseIDE to provide Windsurf-specific functionality
 */
const BaseIDE = require('../BaseIDE');
const IDETypes = require('../IDETypes');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class WindsurfIDE extends BaseIDE {
  constructor(browserManager, ideManager, eventBus = null) {
    super(browserManager, ideManager, eventBus, IDETypes.WINDSURF);
    
    // Windsurf-specific configuration
    this.config = {
      name: 'Windsurf',
      displayName: 'Windsurf IDE',
      portRange: { start: 9242, end: 9251 },
      startupCommand: 'windsurf',
      detectionPatterns: ['windsurf', 'Windsurf'],
      supportedFeatures: ['chat', 'refactoring', 'terminal', 'git', 'extensions'],
      fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.py', '.java', '.cpp', '.c'],
      defaultPort: 9242
    };
    
    // Windsurf-specific properties
    this.windsurfFeatures = [
      'ai_chat',
      'code_completion',
      'refactoring',
      'terminal',
      'git_integration',
      'extension_support',
      'multi_cursor',
      'intellisense',
      'debugging',
      'snippets'
    ];
    
    this.isInitialized = true;
    logger.info('Windsurf IDE implementation initialized');
  }

  /**
   * Detect if Windsurf is running on a specific port
   */
  async detect(port) {
    try {
      const page = await this.browserManager.getPage(port);
      if (!page) {
        return { detected: false, port, error: 'No page available' };
      }

      // Check for Windsurf-specific DOM elements
      const windsurfElements = await page.$$eval('*', (elements) => {
        return elements.some(el => 
          el.className?.includes('windsurf') || 
          el.id?.includes('windsurf') ||
          el.getAttribute('data-windsurf')
        );
      });

      if (windsurfElements) {
        return { detected: true, port, ideType: IDETypes.WINDSURF };
      }

      return { detected: false, port, error: 'Windsurf not detected' };
    } catch (error) {
      logger.error(`Error detecting Windsurf on port ${port}:`, error);
      return { detected: false, port, error: error.message };
    }
  }

  /**
   * Get Windsurf-specific features
   */
  getFeatures() {
    return {
      ideType: IDETypes.WINDSURF,
      features: this.windsurfFeatures,
      config: this.config,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Get Windsurf version
   */
  async getVersion() {
    try {
      const page = await this.browserManager.getPage();
      if (!page) {
        return { version: 'unknown', error: 'No page available' };
      }

      // Try to extract version from DOM
      const version = await page.evaluate(() => {
        // Method 1: Look for version in UI elements
        const versionElement = document.querySelector('[data-windsurf-version]') ||
                             document.querySelector('.windsurf-version') ||
                             document.querySelector('[title*="version"]');
        
        if (versionElement) {
          return versionElement.textContent.trim() || versionElement.getAttribute('data-windsurf-version');
        }
        
        // Method 2: Look in meta tags
        const metaVersion = document.querySelector('meta[name="windsurf-version"]');
        if (metaVersion) {
          return metaVersion.content;
        }
        
        // Method 3: Look in window object
        if (window.windsurf && window.windsurf.version) {
          return window.windsurf.version;
        }
        
        return 'unknown';
      });

      const normalizedVersion = this.normalizeVersion(version || 'unknown');
      return { version: normalizedVersion };
    } catch (error) {
      logger.error('Error getting version:', error);
      return { version: 'unknown', error: error.message };
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
   * Execute Windsurf-specific command
   */
  async executeCommand(command, options = {}) {
    try {
      logger.info(`Executing command: ${command}`);
      
      // Handle Windsurf-specific commands
      switch (command) {
        case 'getStatus':
          return await this.getStatus();
        case 'getFeatures':
          return this.getFeatures();
        case 'getVersion':
          return await this.getVersion();
        default:
          // Delegate to base implementation
          return await super.executeCommand(command, options);
      }
    } catch (error) {
      logger.error(`Error executing command ${command}:`, error);
      throw error;
    }
  }

  /**
   * Get Windsurf workspace path
   */
  async getWorkspacePath() {
    try {
      const page = await this.browserManager.getPage();
      if (!page) {
        return null;
      }

      // Try to extract workspace path from Windsurf DOM
      const workspacePath = await page.evaluate(() => {
        const workspaceElement = document.querySelector('[data-workspace-path]') ||
                               document.querySelector('.windsurf-workspace') ||
                               document.querySelector('meta[name="workspace-path"]');
        
        return workspaceElement ? workspaceElement.getAttribute('data-workspace-path') || 
                                 workspaceElement.textContent || 
                                 workspaceElement.content : null;
      });

      return workspacePath;
    } catch (error) {
      logger.error('Error getting workspace path:', error);
      return null;
    }
  }

  /**
   * Extract chat history from Windsurf
   * @param {number} requestedPort - Port to extract chat from (optional)
   */
  async extractChatHistory(requestedPort = null) {
    try {
      // Use requested port if provided, otherwise get current port
      const targetPort = requestedPort || this.browserManager.getCurrentPort();
      if (!targetPort) {
        logger.warn('No target port available for chat extraction');
        return [];
      }

      // Switch to target port if needed
      const currentPort = this.browserManager.getCurrentPort();
      if (currentPort !== targetPort) {
        logger.info(`Switching from port ${currentPort} to ${targetPort} for chat extraction`);
        await this.browserManager.switchToPort(targetPort);
      }

      const page = await this.browserManager.getPage();
      if (!page) {
        return [];
      }

      // Use Windsurf-specific selectors for chat extraction
      const messages = await page.evaluate(() => {
        const messageElements = document.querySelectorAll('.windsurf-chat-message, .chat-message, [data-chat-message]');
        return Array.from(messageElements).map((el, index) => {
          const isUser = el.classList.contains('user-message') || 
                        el.classList.contains('windsurf-user-message') ||
                        el.querySelector('.user-avatar');
          
          return {
            id: `windsurf-${Date.now()}-${index}`,
            content: el.textContent?.trim() || '',
            sender: isUser ? 'user' : 'ai',
            type: 'text',
            timestamp: new Date().toISOString(),
            metadata: {
              ideType: 'windsurf',
              elementId: el.id || null
            }
          };
        });
      });

      return messages;
    } catch (error) {
      logger.error('Error extracting chat history:', error);
      return [];
    }
  }

  // Required methods for IDE factory validation
  async start() {
    logger.info('Start method called');
    return { success: true, ideType: IDETypes.WINDSURF };
  }

  async stop() {
    logger.info('Stop method called');
    return { success: true, ideType: IDETypes.WINDSURF };
  }

  async getStatus() {
    return {
      ideType: IDETypes.WINDSURF,
      isRunning: true,
      port: this.activePort || 9242,
      version: await this.getVersion()
    };
  }

  async getDOM() {
    try {
      const page = await this.browserManager.getPage();
      if (!page) {
        return { success: false, error: 'No page available' };
      }

      const dom = await page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          body: document.body.innerHTML.substring(0, 1000)
        };
      });

      return { success: true, dom, ideType: IDETypes.WINDSURF };
    } catch (error) {
      return { success: false, error: error.message, ideType: IDETypes.WINDSURF };
    }
  }

  async interact(selector, action, options = {}) {
    try {
      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No page available');
      }

      switch (action) {
        case 'click':
          await page.click(selector);
          break;
        case 'type':
          await page.type(selector, options.text || '');
          break;
        case 'fill':
          await page.fill(selector, options.text || '');
          break;
        default:
          throw new Error(`Unsupported action: ${action}`);
      }

      return { success: true, action, selector, ideType: IDETypes.WINDSURF };
    } catch (error) {
      return { success: false, error: error.message, action, selector, ideType: IDETypes.WINDSURF };
    }
  }

  async sendMessage(message, options = {}) {
    try {
      // Use IDE Steps instead of ChatMessageHandler
      logger.info('sendMessage() - Using IDE Steps for message sending');
      throw new Error('sendMessage() - ChatMessageHandler removed, use IDE Steps instead');
    } catch (error) {
      return { success: false, error: error.message, message, ideType: IDETypes.WINDSURF };
    }
  }

  async switchToPort(port) {
    try {
      if (!this.ideManager) {
        throw new Error('IDE manager not available');
      }

      await this.ideManager.switchToPort(port);
      this.activePort = port;

      return { success: true, port, ideType: IDETypes.WINDSURF };
    } catch (error) {
      return { success: false, error: error.message, port, ideType: IDETypes.WINDSURF };
    }
  }

  getActivePort() {
    return this.activePort || 9242;
  }

  async monitorTerminalOutput(options = {}) {
    try {
      const page = await this.browserManager.getPage();
      if (!page) {
        return { success: false, error: 'No page available' };
      }

      const output = await page.evaluate(() => {
        const terminal = document.querySelector('.windsurf-terminal, .terminal, [data-terminal]');
        return terminal ? terminal.textContent : '';
      });

      return { success: true, output, ideType: IDETypes.WINDSURF };
    } catch (error) {
      return { success: false, error: error.message, ideType: IDETypes.WINDSURF };
    }
  }

  getUserAppUrlForPort(port) {
    return `http://localhost:${port}`;
  }

  async detectDevServerFromPackageJson(workspacePath) {
    // Mock implementation
    return {
      success: true,
      devServer: { port: 3000, command: 'npm start' },
      ideType: IDETypes.WINDSURF
    };
  }

  async applyRefactoring(refactoringType, options = {}) {
    logger.info(`Applying refactoring: ${refactoringType}`);
    return { success: true, refactoringType, ideType: IDETypes.WINDSURF };
  }

  async sendTask(task) {
    logger.info(`Sending task:`, task);
    return { success: true, task, ideType: IDETypes.WINDSURF };
  }

  async sendAutoModeTasks(tasks) {
    logger.info(`Sending auto mode tasks:`, tasks);
    return { success: true, tasks, ideType: IDETypes.WINDSURF };
  }
}

module.exports = WindsurfIDE; 