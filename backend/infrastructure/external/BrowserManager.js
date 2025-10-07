const { chromium } = require('playwright');
const Logger = require('@logging/Logger');
const ConnectionPool = require('./ConnectionPool');
const logger = new Logger('BrowserManager');


class BrowserManager {
  constructor() {
    // Initialize connection pool with optimized settings
    this.connectionPool = new ConnectionPool({
      maxConnections: 10, // Increased for better performance
      connectionTimeout: 5000, // Reduced timeout for faster failure detection
      cleanupInterval: 120000, // 2 minutes - less frequent cleanup
      healthCheckInterval: 60000, // 1 minute - less frequent health checks
      host: '127.0.0.1'
    });
    
    // Current connection state
    this.currentPort = null;
    this.browser = null;
    this.page = null;
    this.isConnecting = false;
    
    // Performance tracking
    this.switchTimes = [];
    this.maxSwitchTimes = 100; // Keep last 100 switch times
    
    logger.info('BrowserManager initialized with optimized connection pooling');
    
    // Pre-warming removed for faster startup
  }



  trackSwitchTime(duration) {
    this.switchTimes.push(duration);
    
    // Keep only last N switch times
    if (this.switchTimes.length > this.maxSwitchTimes) {
      this.switchTimes.shift();
    }
  }

  getPerformanceStats() {
    if (this.switchTimes.length === 0) {
      return {
        totalSwitches: 0,
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        recentAverage: 0
      };
    }
    
    const sorted = [...this.switchTimes].sort((a, b) => a - b);
    const recent = this.switchTimes.slice(-10); // Last 10 switches
    
    return {
      totalSwitches: this.switchTimes.length,
      averageTime: this.switchTimes.reduce((a, b) => a + b, 0) / this.switchTimes.length,
      minTime: sorted[0],
      maxTime: sorted[sorted.length - 1],
      recentAverage: recent.reduce((a, b) => a + b, 0) / recent.length
    };
  }

  async connect(port = null) {
    if (port) {
      this.currentPort = port;
    }

    if (!this.currentPort) {
      throw new Error('No port specified for connection');
    }

    try {
      logger.info(`Getting connection for port ${this.currentPort} from pool...`);
      
      // Get connection from pool (creates new one if needed)
      const connection = await this.connectionPool.getConnection(this.currentPort);
      
      // Update current connection state
      this.browser = connection.browser;
      this.page = connection.page;
      
      // Connection success logs removed for cleaner output
      return this.page;

    } catch (error) {
      logger.error(`Connection failed on port ${this.currentPort}:`, error.message);
      this.browser = null;
      this.page = null;
      throw error;
    }
  }

  async getPage() {
    if (!this.currentPort) {
      throw new Error('No active port selected');
    }
    
    // Get connection from pool (handles reconnection automatically)
    const connection = await this.connectionPool.getConnection(this.currentPort);
    
    if (!connection) {
      throw new Error('Failed to get connection from pool');
    }
    
    if (!connection.page) {
      throw new Error('Connection exists but page is null');
    }
    
    // Update current state
    this.browser = connection.browser;
    this.page = connection.page;
    
    logger.debug(`Successfully got page for port ${this.currentPort}`);
    return this.page;
  }

  async switchToPort(port) {
    if (this.currentPort === port) {
      logger.debug(`Already connected to port ${port}`);
      return; // Already connected to this port
    }
    
    logger.info(`Switching to port ${port} using optimized connection pool...`);
    
    try {
      // Check connection pool health before switching
      const poolHealth = this.connectionPool.getHealth();
      logger.debug(`Connection pool health before switch: ${JSON.stringify(poolHealth)}`);
      
      // Get connection from pool (instant if cached, creates new if needed)
      const connection = await this.connectionPool.getConnection(port);
      
      // Update current port and connection state
      this.currentPort = port;
      this.browser = connection.browser;
      this.page = connection.page;

      
      // Check connection pool health after switching
      const poolHealthAfter = this.connectionPool.getHealth();
      logger.debug(`Connection pool health after switch: ${JSON.stringify(poolHealthAfter)}`);
      
      logger.info(`Successfully switched to port ${port}`);
      
    } catch (error) {
      logger.error(`Failed to switch to port ${port}:`, error.message);
      throw error;
    }
  }

  /**
   * Connect to a port without switching (for workspace detection)
   * This method is used when we need to connect to a port for detection purposes
   * but don't want to track it as a "switch" operation
   */
  async connectToPortForDetection(port) {
    if (this.currentPort === port) {
      logger.debug(`Already connected to port ${port}`);
      return; // Already connected to this port
    }
    
    logger.info(`Connecting to port ${port} for workspace detection...`);
    
    try {
      // Get connection from pool (instant if cached, creates new if needed)
      const connection = await this.connectionPool.getConnection(port);
      
      // Update current port and connection state
      this.currentPort = port;
      this.browser = connection.browser;
      this.page = connection.page;
      
      // Detection connection logs removed for cleaner output
      
    } catch (error) {
      logger.error(`Failed to connect to port ${port} for detection:`, error.message);
      throw error;
    }
  }

  async connectToPort(port) {
    logger.info(`Connecting to port ${port}...`);
    this.currentPort = port;
    await this.connect(port);
  }

  /**
   * Get all IDE selectors for current port
   * @returns {Promise<Object>} All IDE selectors
   */
  async getAllSelectors() {
    const currentPort = this.currentPort;
    if (!currentPort) {
      throw new Error('No active port set in BrowserManager');
    }
    const ideType = await this.detectIDEType(currentPort);
    const version = await this.detectIDEVersion(currentPort);
    return await this.getIDESelectors(ideType, version);
  }

  // File Explorer Methods
  async getFileExplorerTree() {
    try {
      const page = await this.getPage();
      if (!page) {
        throw new Error('No connection to Cursor IDE');
      }

      // Get IDE-specific selectors
      const selectors = await this.getAllSelectors();
      const projectManagementSelectors = selectors.projectManagementSelectors;
      if (!projectManagementSelectors) {
        throw new Error(`No project management selectors found`);
      }

      // Use single correct selector for explorer
      const explorerSelector = projectManagementSelectors.projectExplorer?.container;
      if (!explorerSelector) {
        throw new Error('Explorer container selector not found in configuration');
      }

      await page.waitForSelector(explorerSelector, { timeout: 5000 });

      // Extract the file tree structure as a flat list
      const flatFiles = await page.evaluate((selectors) => {
        const container = document.querySelector(selectors.projectManagementSelectors.projectExplorer?.container);
        if (!container) return [];
        
        const rows = container.querySelectorAll(selectors.projectManagementSelectors.projectExplorer?.rows);
        return Array.from(rows).map(item => {
          const labelElement = item.querySelector(selectors.projectManagementSelectors.projectExplorer?.labelName);
          if (!labelElement) return null;
          const name = labelElement.textContent.trim();
          const ariaLabel = item.getAttribute('aria-label');
          const ariaLevel = parseInt(item.getAttribute('aria-level') || '1');
          const ariaExpanded = item.getAttribute('aria-expanded') === 'true';
          const isSelected = item.classList.contains('selected');
          const isDirectory = item.querySelector(selectors.projectManagementSelectors.projectExplorer?.treeItemExpanded) !== null;
          
          // Extract path from aria-label
          let path = '';
          if (ariaLabel) {
            const pathMatch = ariaLabel.match(/~\/Documents\/Git\/PIDEA\/(.+)/);
            if (pathMatch) {
              path = pathMatch[1];
            }
          }
          
          // Use name as path if no path found
          if (!path) {
            path = name;
          }
          
          return {
            name,
            path,
            type: isDirectory ? 'directory' : 'file',
            level: ariaLevel,
            expanded: ariaExpanded,
            selected: isSelected
          };
        }).filter(Boolean);
      }, projectManagementSelectors);

      // Build tree from flat list
      function buildTree(flatList) {
        const root = [];
        const pathMap = {};
        flatList.forEach(item => {
          item.children = [];
          pathMap[item.path] = item;
        });
        flatList.forEach(item => {
          const parentPath = item.path.split('/').slice(0, -1).join('/');
          if (parentPath && pathMap[parentPath]) {
            pathMap[parentPath].children.push(item);
          } else {
            root.push(item);
          }
        });
        return root;
      }
      return buildTree(flatFiles);
    } catch (error) {
      logger.error('Error reading file explorer tree:', error.message);
      return [];
    }
  }

  async openFile(filePath) {
    try {
      logger.info('openFile aufgerufen mit:', filePath);
      const page = await this.getPage();
      if (!page) {
        throw new Error('No connection to Cursor IDE');
      }
      
      // Get IDE-specific selectors
      const selectors = await this.getAllSelectors();
      const projectManagementSelectors = selectors.projectManagementSelectors;
      const fileOperationSelectors = selectors.fileOperationSelectors;
      const chatSelectors = selectors.chatSelectors;
      
      if (!projectManagementSelectors || !fileOperationSelectors || !chatSelectors) {
        throw new Error(`Missing selectors`);
      }
      
      // Debug: Log all available files in explorer
      const debugInfo = await page.evaluate((selectors) => {
        const rows = document.querySelectorAll(selectors.projectManagementSelectors.projectExplorer?.container + ' ' + selectors.projectManagementSelectors.projectExplorer?.rows);
        const files = [];
        rows.forEach(row => {
          const ariaLabel = row.getAttribute('aria-label');
          const title = row.getAttribute('title');
          const textContent = row.textContent?.trim();
          files.push({ ariaLabel, title, textContent });
        });
        return files;
      }, projectManagementSelectors);
      logger.debug('Available files in explorer:', debugInfo);
      
      // Find the file in the explorer and click it
      const fileName = filePath.split('/').pop();
      logger.info('Looking for file name:', fileName);
      
      // Use single selector strategy
      const containerSelector = projectManagementSelectors.projectExplorer?.container;
      const rowsSelector = projectManagementSelectors.projectExplorer?.rows;
      if (!containerSelector || !rowsSelector) {
        throw new Error('File explorer selectors not found in configuration');
      }
      
      const rows = await page.$$(`${containerSelector} ${rowsSelector}`);
      let found = false;
      
      for (const row of rows) {
        const ariaLabel = await row.getAttribute('aria-label');
        const textContent = await row.evaluate(el => el.textContent?.trim());
        
        // Check if this row matches our file by exact name match
        if (textContent === fileName || (ariaLabel && ariaLabel.includes(fileName))) {
          logger.info('Found matching file, clicking:', { ariaLabel, textContent });
          await row.click();
          found = true;
          break;
        }
      }
      
      if (!found) {
        throw new Error(`File not found in explorer: ${filePath}`);
      }
      
      // Wait for the editor tab with the file name to be active
      const tabSelector = fileOperationSelectors.fileTabs?.tabByLabel?.replace('{fileName}', fileName);
      try {
        await page.waitForSelector(tabSelector, { timeout: 5000 });
        logger.info('Editor-Tab gefunden für:', filePath);
      } catch (e) {
        logger.warn('WARN: Editor-Tab NICHT gefunden für:', filePath);
      }
      
      // Wait for the file to open in the editor
      await page.waitForSelector(chatSelectors.monacoEditor, { timeout: 5000 });
      logger.info(`Opened file: ${filePath}`);
      return true;
    } catch (error) {
      logger.error(`Error opening file ${filePath}:`, error.message);
      return false;
    }
  }

  async getCurrentFileContent() {
    try {
      const page = await this.getPage();
      if (!page) {
        throw new Error('No connection to Cursor IDE');
      }
      const selectors = await this.getAllSelectors();
      const chatSelectors = selectors.chatSelectors;
      if (chatSelectors) {
        await page.waitForSelector(chatSelectors.monacoEditor, { timeout: 5000 });
      }
      
      const result = await page.evaluate((selectors) => {
        // Find the active tab and get its file name
        const activeTab = document.querySelector(selectors.fileOperationSelectors.fileTabs?.activeTab);
        let fileName = '';
        if (activeTab) {
          fileName = activeTab.getAttribute('aria-label') || '';
        }
        let log = `[getCurrentFileContent] Active tab: ${fileName}.`;
        let content = '';
        
        // Primary approach: Use Monaco API to get full content
        if (window.monaco && window.monaco.editor && window.monaco.editor.getEditors) {
          const allEditors = window.monaco.editor.getEditors();
          log += ` Monaco-API: ${allEditors.length} Editor-Objekte.`;
          
          // Try to find the active editor or editor with matching file
          let targetEditor = null;
          
          // First try to find editor with matching file name
          for (const editor of allEditors) {
            try {
              const model = editor.getModel && editor.getModel();
              if (model && model.uri && model.uri.path && fileName && model.uri.path.endsWith(fileName)) {
                targetEditor = editor;
                log += ` Editor mit passendem Dateinamen gefunden: ${fileName}`;
                break;
              }
            } catch (e) {
              log += ` Error checking Monaco editor: ${e.message}.`;
            }
          }
          
          // If no matching editor found, try to get the active/focused editor
          if (!targetEditor) {
            for (const editor of allEditors) {
              try {
                if (editor.hasFocus && editor.hasFocus()) {
                  targetEditor = editor;
                  log += ' Aktiver Editor gefunden.';
                  break;
                }
              } catch (e) {
                log += ` Error checking editor focus: ${e.message}.`;
              }
            }
          }
          
          // If still no editor found, try the first available editor
          if (!targetEditor && allEditors.length > 0) {
            targetEditor = allEditors[0];
            log += ' Ersten verfügbaren Editor verwendet.';
          }
          
          // Get content from the target editor
          if (targetEditor) {
            try {
              content = targetEditor.getValue();
              log += ` Vollständiger Inhalt aus Monaco Editor geholt (${content.length} Zeichen).`;
            } catch (e) {
              log += ` Error getting value from editor: ${e.message}.`;
            }
          }
        }
        
        // No fallback - Monaco API is the only way to get complete content
        
        if (!content) {
          log += ' Kein Inhalt gefunden!';
        }
        
        return { content, log };
      }, { fileTabs: fileOperationSelectors.fileTabs, monacoEditor: chatSelectors.monacoEditor, contentEditable: chatSelectors.contentEditable, textarea: chatSelectors.textarea, viewLine: chatSelectors.viewLine });
      
      logger.info('getCurrentFileContent: Content retrieved', {
        contentLength: result.content ? result.content.length : 0,
        hasContent: !!result.content
      });
      return result.content;
    } catch (error) {
      logger.error('Error reading file content:', error.message);
      return '';
    }
  }

  async getFileContent(filePath) {
    try {
      logger.info('getFileContent aufgerufen mit:', filePath);
      const page = await this.getPage();
      if (!page) {
        throw new Error('No connection to Cursor IDE');
      }
      // First, open the file in the editor
      const opened = await this.openFile(filePath);
      if (!opened) {
        throw new Error(`Failed to open file: ${filePath}`);
      }
      // Wait a bit for the file to load
      await page.waitForTimeout(1000);
      // Get the content from the editor
      const content = await this.getCurrentFileContent();
      logger.info('Dateiinhalt geladen für:', filePath);
      return content;
    } catch (error) {
      logger.error(`Error getting file content for ${filePath}:`, error.message);
      throw error;
    }
  }

  async getCurrentFileInfo() {
    try {
      const page = await this.getPage();
      if (!page) {
        throw new Error('No connection to Cursor IDE');
      }

      // Get the current file tab information
      const selectors = await this.getAllSelectors();
      const fileOperationSelectors = selectors.fileOperationSelectors;
      if (!fileOperationSelectors) {
        return null;
      }

      const fileInfo = await page.evaluate((selectors) => {
        const activeTab = document.querySelector(selectors.fileOperationSelectors.fileTabs?.activeTab);
        if (!activeTab) return null;

        const tabTitle = activeTab.querySelector(selectors.fileOperationSelectors.fileTabs?.tabTitle)?.textContent?.trim();
        const tabPath = activeTab.getAttribute('data-resource-uri');
        
        return {
          name: tabTitle,
          path: tabPath,
          isModified: activeTab.classList.contains('active-modified')
        };
      }, fileOperationSelectors);

      return fileInfo;

    } catch (error) {
      logger.error('Error getting current file info:', error.message);
      return null;
    }
  }

  async refreshExplorer() {
    try {
      const page = await this.getPage();
      if (!page) {
        throw new Error('No connection to Cursor IDE');
      }

      // Click the refresh button in the explorer
      const selectors = await this.getAllSelectors();
      const projectManagementSelectors = selectors.projectManagementSelectors;
      if (projectManagementSelectors && projectManagementSelectors.projectExplorer?.refreshButton) {
        const refreshButton = await page.$(projectManagementSelectors.projectExplorer.refreshButton);
        if (refreshButton) {
          await refreshButton.click();
          logger.info('Refreshed file explorer');
          return true;
        }
      }

      return false;

    } catch (error) {
      logger.error('Error refreshing explorer:', error.message);
      return false;
    }
  }

  async disconnect() {
    if (this.currentPort) {
      await this.connectionPool.closeConnection(this.currentPort);
      this.browser = null;
      this.page = null;
      logger.info(`Disconnected from IDE on port ${this.currentPort}`);
    }
  }

  async reconnect() {
    logger.info('Reconnecting to IDE...');
    if (this.currentPort) {
      // Close current connection and get fresh one from pool
      await this.connectionPool.closeConnection(this.currentPort);
      return await this.connect(this.currentPort);
    }
    throw new Error('No current port to reconnect to');
  }

  /**
   * Click the "New Chat" button in the IDE to create a new chat session
   * @returns {Promise<boolean>} Success status
   */
  async clickNewChat() {
    try {
      const page = await this.getPage();
      if (!page) {
        throw new Error('No connection to Cursor IDE');
      }

      logger.info('Clicking New Chat button...');

      // Get IDE-specific selectors
      const selectorsData = await this.getAllSelectors();
      const chatSelectors = selectorsData.chatSelectors;
      if (!chatSelectors) {
        throw new Error('No chat selectors found');
      }

      // Get New Chat button selector from JSON configuration
      const newChatButtonSelector = chatSelectors.newChatButton;
      if (!newChatButtonSelector) {
        throw new Error('New Chat button selector not found in configuration');
      }

      const button = await page.$(newChatButtonSelector);
      if (!button) {
        throw new Error(`New Chat button not found with selector: ${newChatButtonSelector}`);
      }
      
      const isVisible = await button.isVisible();
      if (!isVisible) {
        throw new Error('New Chat button is not visible');
      }
      
      await button.click();
      logger.info(`Successfully clicked New Chat button using selector: ${newChatButtonSelector}`);
      

      // Wait for potential modal to appear (shorter)
      await page.waitForTimeout(300);
      
      // Optimized: Only handle modal if it exists
      const modalSelectorsData = await this.getAllSelectors();
      const fileOperationSelectors = modalSelectorsData.fileOperationSelectors;
      if (fileOperationSelectors) {
        const modal = await page.$(fileOperationSelectors.modal);
        if (modal) {
          await this.handleNewChatModal(page, modal, fileOperationSelectors);
        } else {
          logger.info('No New Chat modal detected, continuing immediately.');
        }
      } else {
        logger.info('No modal selectors found, skipping modal handling.');
      }
      
      logger.info('Successfully clicked New Chat button and handled modal');
      return true;

    } catch (error) {
      logger.error('Error clicking New Chat button:', error.message);
      throw error; // Re-throw the error instead of returning false
    }
  }

  /**
   * Handle the New Chat modal that appears after clicking New Chat button
   * @param {Page} page - Playwright page object
   * @param {ElementHandle} modal - The modal element (if found)
   * @param {Object} fileOperationSelectors - File operation selectors from JSON
   */
  async handleNewChatModal(page, modal, fileOperationSelectors) {
    try {
      logger.info('Handling New Chat modal...');
      
      // Maximum attempts to prevent infinite loops
      let attempts = 0;
      const maxAttempts = 3;
      
      // Use single correct button selector
      const buttonSelector = fileOperationSelectors.okButton;
      if (!buttonSelector) {
        throw new Error('Modal OK button selector not found in configuration');
      }
      
      const button = await modal.$(buttonSelector);
      if (!button) {
        throw new Error(`Modal button not found with selector: ${buttonSelector}`);
      }
      
      await button.click();
      logger.info(`Clicked modal button: ${buttonSelector}`);
      
      // Wait for modal to close
      await page.waitForTimeout(500);
      
      logger.info('New Chat modal handled (or no modal found)');
    } catch (error) {
      logger.info(`New Chat modal handling failed: ${error.message}`);
    }
  }

  /**
   * Detect IDE version using CDP /json/version endpoint
   * @param {number} port - IDE port
   * @returns {Promise<string>} Detected version
   */
  async detectIDEVersion(port) {
    try {
      logger.info(`Detecting version on port ${port} using CDP /json/version endpoint`);
      
      // Use direct HTTP request to CDP endpoint
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (!response.ok) {
        throw new Error(`CDP version endpoint failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      logger.info(`CDP version response:`, data);

      // Use single correct field - User-Agent
      if (!data['User-Agent']) {
        throw new Error('User-Agent field not found in CDP response');
      }
      
      const userAgent = data['User-Agent'];
      const versionMatch = userAgent.match(/(\d+\.\d+\.\d+)/);
      if (!versionMatch) {
        throw new Error(`No version pattern found in User-Agent: ${userAgent}`);
      }
      
      logger.info(`✅ IDE version detected: ${versionMatch[1]}`);
      return versionMatch[1];
      
    } catch (error) {
      logger.error(`Version detection failed for port ${port}:`, error.message);
      throw new Error(`Version detection failed: ${error.message}`);
    }
  }

  /**
   * Detect IDE type based on port number
   * @param {number} port - The port number
   * @returns {string} The detected IDE type
   */
  async detectIDEType(port) {
    if (port >= 9222 && port <= 9231) return 'cursor';
    if (port >= 9232 && port <= 9241) return 'vscode';
    if (port >= 9242 && port <= 9251) return 'windsurf';
    throw new Error(`Unknown IDE type for port ${port}. Port must be between 9222-9251.`);
  }

  /**
   * Get IDE-specific selectors using IDESelectorManager
   * @param {string} ideType - The IDE type
   * @param {string} version - The IDE version (REQUIRED)
   * @returns {Object} IDE-specific selectors
   */
  async getIDESelectors(ideType, version) {
    if (!version) {
      throw new Error(`Version is required for ${ideType}. No fallbacks allowed. Please specify exact version.`);
    }
    
    const IDESelectorManager = require('@services/ide/IDESelectorManager');
    return IDESelectorManager.getSelectors(ideType, version);
  }

  /**
   * Type a message into the chat input and optionally send it
   * @param {string} message - Message to type
   * @param {boolean} send - Whether to send the message after typing
   * @returns {Promise<boolean>} Success status
   */
  async typeMessage(message, send = true) {
    try {
      const page = await this.getPage();
      if (!page) {
        throw new Error('No connection to IDE');
      }

      //logger.info(`Typing message: ${message}`);

      // Determine IDE type and version based on current port
            const currentPort = this.currentPort;
            if (!currentPort) {
              throw new Error('No active port set in BrowserManager');
            }
            const ideType = await this.detectIDEType(currentPort);
            const version = await this.detectIDEVersion(currentPort);
      
      logger.info(`Detected IDE type: ${ideType} version: ${version} on port ${currentPort}`);

      // Get IDE-specific selectors using IDESelectorManager with version
      const selectorsData = await this.getIDESelectors(ideType, version);
      const chatSelectors = selectorsData.chatSelectors;
      
      if (!chatSelectors) {
        throw new Error(`No chat selectors found for IDE type: ${ideType}`);
      }

      // Wait for chat input to be ready
      await page.waitForTimeout(1000);
      
      // Check if there's a modal and close it if needed (but be more careful)
      const allSelectors = await this.getAllSelectors();
      const fileOperationSelectors = allSelectors.fileOperationSelectors;
      if (fileOperationSelectors) {
        const modal = await page.$(fileOperationSelectors.modal);
        if (modal) {
          // Check if modal is actually visible and blocking
          const isVisible = await modal.isVisible();
          if (isVisible) {
            logger.info('Visible modal detected, attempting to close it...');
            try {
              // Use single correct close button selector
              const closeButtonSelector = fileOperationSelectors.closeButton;
              if (!closeButtonSelector) {
                throw new Error('Modal close button selector not found in configuration');
              }
              
              const closeButton = await page.$(closeButtonSelector);
              if (!closeButton) {
                throw new Error(`Modal close button not found with selector: ${closeButtonSelector}`);
              }
              
              await closeButton.click();
              logger.info('Modal closed via close button');
              await page.waitForTimeout(500);
            } catch (e) {
              logger.warn('Failed to close modal:', e.message);
            }
          } else {
            logger.info('Modal detected but not visible, ignoring');
          }
        }
      }

      // Use single correct input selector
      const inputSelector = chatSelectors.input;
      if (!inputSelector) {
        throw new Error('Chat input selector not found in configuration');
      }

      const chatInput = await page.$(inputSelector);
      if (!chatInput) {
        throw new Error(`Chat input not found with selector: ${inputSelector}`);
      }

      logger.info(`About to click chat input...`);
      // Click the input to focus it
      await chatInput.click();
      logger.info(`Clicked chat input to focus`);

      // Clear existing content and set the complete message
      await chatInput.fill('');
      logger.info(`Cleared chat input`);
      await chatInput.fill(message);
      logger.info(`Message set successfully`);

      if (send) {
        logger.info(`Looking for send button...`);
        
        // Use IDE-specific send method
        if (ideType === 'cursor') {
          // Cursor uses Enter key to send
          await chatInput.press('Enter');
          logger.info(`Message sent via Enter key (Cursor)`);
        } else if (ideType === 'vscode') {
          // VSCode uses send button
          const sendButtonSelector = chatSelectors.codiconSend;
          if (!sendButtonSelector) {
            throw new Error('VSCode send button selector not found in configuration');
          }
          
          const sendButton = await page.$(sendButtonSelector);
          if (!sendButton) {
            throw new Error(`VSCode send button not found with selector: ${sendButtonSelector}`);
          }
          
          await sendButton.click();
          logger.info(`Message sent via VSCode send button`);
        } else {
          // Other IDEs use Enter key
          await chatInput.press('Enter');
          logger.info(`Message sent via Enter key (${ideType})`);
        }
      }

      return true;

    } catch (error) {
      logger.error('Error typing message:', error.message);
      logger.error('Error stack:', error.stack);
      throw error; // Re-throw the error instead of returning false
    }
  }

  /**
   * Create a new chat and optionally send a message
   * @param {string} message - Optional message to send after creating chat
   * @returns {Promise<boolean>} Success status
   */
  async createNewChat(message = null) {
    try {
      const success = await this.clickNewChat();
      if (!success) {
        throw new Error('Failed to click New Chat button');
      }

      if (message) {
        // Wait for chat input to be ready (longer wait since modal handling might take time)
        await this.page.waitForTimeout(300);
        
        // Use the improved typeMessage method
        const messageSent = await this.typeMessage(message, true);
        if (messageSent) {
          logger.info('Message sent in new chat:', message);
        } else {
          logger.warn('Failed to send message in new chat');
        }
      }

      return true;

    } catch (error) {
      logger.error('Error creating new chat:', error.message);
      throw error; // Re-throw the error instead of returning false
    }
  }

  /**
   * Get the current active port
   * @returns {number|null} Current port number
   */
  getCurrentPort() {
    return this.currentPort;
  }

  isConnected() {
    return this.currentPort !== null && this.browser !== null && this.page !== null;
  }

  async healthCheck() {
    try {
      if (!this.currentPort) {
        return false;
      }
      
      // Use connection pool's health check
      await this.connectionPool.healthCheck();
      
      // Check if our current connection is still healthy
      const connection = this.connectionPool.connections.get(this.currentPort);
      return connection && connection.health === 'healthy';
    } catch (error) {
      logger.error('Health check failed:', error.message);
      return false;
    }
  }

  /**
   * Get connection pool health status
   * @returns {Object} Health status object
   */
  getConnectionPoolHealth() {
    return this.connectionPool.getHealth();
  }

  /**
   * Get connection pool statistics
   * @returns {Object} Statistics object
   */
  getConnectionPoolStats() {
    return this.connectionPool.getStats();
  }

  /**
   * Destroy the browser manager and cleanup all connections
   */
  async destroy() {
    logger.info('Destroying BrowserManager...');
    await this.connectionPool.destroy();
    this.browser = null;
    this.page = null;
    this.currentPort = null;
    logger.info('BrowserManager destroyed');
  }
}

module.exports = BrowserManager; 