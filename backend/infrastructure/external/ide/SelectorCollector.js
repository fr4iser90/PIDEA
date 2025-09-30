/**
 * SelectorCollector - CDP-based selector collection infrastructure
 * Handles DOM collection and selector generation with integrated script functionality
 */

const { chromium } = require('playwright');
const Logger = require('@logging/Logger');
const logger = new Logger('SelectorCollector');

class SelectorCollector {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 10000,
      retries: options.retries || 3,
      retryDelay: options.retryDelay || 2000,
      host: options.host || '127.0.0.1',
      ...options
    };
    this.logger = options.logger || logger;
  }

  /**
   * Collect selectors from IDE
   * @param {number} port - IDE port
   * @returns {Promise<Object>} Collected selectors
   */
  async collectSelectors(port) {
    let browser = null;
    let page = null;

    try {
      this.logger.info(`Collecting selectors from IDE on port ${port}`);

      // Connect to IDE via CDP
      browser = await chromium.connectOverCDP({
        endpointURL: `http://${this.options.host}:${port}`,
        timeout: this.options.timeout
      });

      const contexts = browser.contexts();
      if (contexts.length === 0) {
        throw new Error('No browser contexts available');
      }

      const pages = contexts[0].pages();
      if (pages.length === 0) {
        throw new Error('No pages available');
      }

      page = pages[0];

      // Analyze DOM and collect selectors
      const domData = await this.analyzeDOM(page);
      const selectors = await this.generateSelectors(domData);

      // Collect comprehensive chat selectors
      const chatSelectors = await this.collectChatSelectors(page);
      
      // Detect chat state
      const chatState = await this.detectChatState(page);

      // Merge chat selectors with general selectors
      const allSelectors = {
        ...selectors,
        ...chatSelectors,
        _chatState: chatState
      };

      this.logger.info(`Successfully collected ${Object.keys(allSelectors).length} selectors from port ${port} (${Object.keys(chatSelectors).length} chat selectors)`);
      return allSelectors;

    } catch (error) {
      this.logger.error(`Selector collection failed for port ${port}:`, error.message);
      throw error;
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          this.logger.warn('Error closing browser:', closeError.message);
        }
      }
    }
  }

  /**
   * Analyze DOM structure
   * @param {Page} page - Playwright page
   * @returns {Promise<Object>} DOM analysis data
   */
  async analyzeDOM(page) {
    try {
      this.logger.info('Analyzing DOM structure');

      // Execute DOM analysis script in page context
      const domData = await page.evaluate(() => {
        const elements = {
          // Comprehensive Chat Controls
          newChatButton: document.querySelector('[aria-label*="New Chat"], [data-testid*="new-chat"], button[title*="New Chat"], .new-chat-button'),
          sendButton: document.querySelector('[aria-label*="Send"], [data-testid*="send"], button[title*="Send"], .send-button'),
          deleteChatButton: document.querySelector('[aria-label*="Delete"], [data-testid*="delete"], button[title*="Delete"], .delete-chat-button'),
          renameChatButton: document.querySelector('[aria-label*="Rename"], [data-testid*="rename"], button[title*="Rename"], .rename-chat-button'),
          
          // Chat History Elements
          chatHistory: document.querySelector('[class*="chat-history"], [data-testid*="chat-history"], .chat-history'),
          chatHistoryItem: document.querySelectorAll('[class*="chat-history-item"], [data-testid*="chat-history-item"], .chat-history-item'),
          chatHistoryTitle: document.querySelectorAll('[class*="chat-title"], [data-testid*="chat-title"], .chat-title'),
          
          // Chat Status Indicators
          connectionStatus: document.querySelector('[class*="connection-status"], [data-testid*="connection-status"], .connection-status'),
          loadingIndicator: document.querySelector('[class*="loading"], [data-testid*="loading"], .loading-indicator, .spinner'),
          thinkingIndicator: document.querySelector('[class*="thinking"], [data-testid*="thinking"], .thinking-indicator'),
          
          // Chat Settings
          settingsButton: document.querySelector('[aria-label*="Settings"], [data-testid*="settings"], button[title*="Settings"], .settings-button'),
          modelSelector: document.querySelector('[aria-label*="Model"], [data-testid*="model"], select[name*="model"], .model-selector'),
          webSearchToggle: document.querySelector('[aria-label*="Web Search"], [data-testid*="web-search"], input[type="checkbox"][name*="web"], .web-search-toggle'),
          
          // Chat Context Controls
          contextButton: document.querySelector('[aria-label*="Context"], [data-testid*="context"], button[title*="Context"], .context-button'),
          attachFileButton: document.querySelector('[aria-label*="Attach"], [data-testid*="attach"], button[title*="Attach"], .attach-file-button'),
          helpButton: document.querySelector('[aria-label*="Help"], [data-testid*="help"], button[title*="Help"], .help-button'),
          premiumPill: document.querySelector('[class*="premium"], [data-testid*="premium"], .premium-pill'),
          atSignButton: document.querySelector('[aria-label*="@"], [data-testid*="at-sign"], button[title*="@"], .at-sign-button'),
          
          // Chat Messages
          chatInput: document.querySelector('[contenteditable="true"], textarea, input[type="text"], .chat-input'),
          chatContainer: document.querySelector('[class*="chat"], [class*="conversation"], .chat-container'),
          userMessages: document.querySelectorAll('[class*="user"], [class*="human"], .user-message'),
          aiMessages: document.querySelectorAll('[class*="ai"], [class*="assistant"], [class*="bot"], .ai-message'),
          messageTimestamp: document.querySelectorAll('[class*="timestamp"], [data-testid*="timestamp"], .message-timestamp'),
          messageActions: document.querySelectorAll('[class*="message-actions"], [data-testid*="message-actions"], .message-actions'),
          messageCopyButton: document.querySelectorAll('[aria-label*="Copy"], [data-testid*="copy"], button[title*="Copy"], .copy-button'),
          
          // Chat Code Blocks
          codeBlockRejectButton: document.querySelectorAll('[aria-label*="Reject"], [data-testid*="reject"], button[title*="Reject"], .reject-button'),
          codeBlockCopyButton: document.querySelectorAll('[aria-label*="Copy Code"], [data-testid*="copy-code"], button[title*="Copy Code"], .copy-code-button'),
          codeBlockDownloadButton: document.querySelectorAll('[aria-label*="Download"], [data-testid*="download"], button[title*="Download"], .download-button'),
          
          // Chat Modals
          chatSettingsModal: document.querySelector('[class*="settings-modal"], [data-testid*="settings-modal"], .settings-modal'),
          chatHistoryModal: document.querySelector('[class*="history-modal"], [data-testid*="history-modal"], .history-modal'),
          chatExportModal: document.querySelector('[class*="export-modal"], [data-testid*="export-modal"], .export-modal'),
          
          // Chat Error States
          errorMessage: document.querySelector('[class*="error"], [data-testid*="error"], .error-message'),
          retryButton: document.querySelector('[aria-label*="Retry"], [data-testid*="retry"], button[title*="Retry"], .retry-button'),
          connectionError: document.querySelector('[class*="connection-error"], [data-testid*="connection-error"], .connection-error'),
          
          // Chat UI Elements
          userAvatar: document.querySelector('[class*="avatar"], [data-testid*="avatar"], .user-avatar'),
          userName: document.querySelector('[class*="username"], [data-testid*="username"], .user-name'),
          themeToggle: document.querySelector('[aria-label*="Theme"], [data-testid*="theme"], button[title*="Theme"], .theme-toggle'),
          agentAutoButton: document.querySelector('[aria-label*="Agent"], [data-testid*="agent"], button[title*="Agent"], .agent-auto-button'),
          contextPercentage: document.querySelector('[class*="context-percentage"], [data-testid*="context-percentage"], .context-percentage'),
          
          // Agent Controls
          agentModeSelector: document.querySelector('[aria-label*="Agent Mode"], [data-testid*="agent-mode"], select[name*="agent-mode"], .agent-mode-selector'),
          agentModeDropdown: document.querySelector('[class*="agent-mode-dropdown"], [data-testid*="agent-mode-dropdown"], .agent-mode-dropdown'),
          askModeButton: document.querySelector('[aria-label*="Ask Mode"], [data-testid*="ask-mode"], button[title*="Ask Mode"], .ask-mode-button'),
          agentModeButton: document.querySelector('[aria-label*="Agent Mode"], [data-testid*="agent-mode"], button[title*="Agent Mode"], .agent-mode-button'),
          modelDropdown: document.querySelector('[class*="model-dropdown"], [data-testid*="model-dropdown"], .model-dropdown'),
          autoModelToggle: document.querySelector('[aria-label*="Auto Model"], [data-testid*="auto-model"], input[type="checkbox"][name*="auto"], .auto-model-toggle'),
          modelOptions: document.querySelectorAll('[class*="model-option"], [data-testid*="model-option"], .model-option'),
          
          // Editor elements
          monacoEditor: document.querySelector('.monaco-editor'),
          editorLines: document.querySelectorAll('.view-line'),
          editorTabs: document.querySelectorAll('.tab'),
          
          // Explorer elements
          fileExplorer: document.querySelector('.explorer, .pane'),
          fileTree: document.querySelector('.monaco-list, .tree'),
          
          // Terminal elements
          terminal: document.querySelector('.terminal, .xterm'),
          
          // Panel elements
          sidebar: document.querySelector('.sidebar, .activitybar'),
          statusbar: document.querySelector('.statusbar'),
          
          // Command elements
          commandPalette: document.querySelector('.quick-input-widget'),
          
          // Code blocks
          codeBlocks: document.querySelectorAll('pre, .code-block'),
          
          // All interactive elements
          buttons: document.querySelectorAll('button'),
          inputs: document.querySelectorAll('input'),
          links: document.querySelectorAll('a')
        };

        // Extract selector information
        const extractSelector = (element) => {
          if (!element) return null;
          
          // Try data-testid first
          if (element.getAttribute('data-testid')) {
            return `[data-testid="${element.getAttribute('data-testid')}"]`;
          }
          
          // Try ID
          if (element.id) {
            return `#${element.id}`;
          }
          
          // Try unique class
          const classes = Array.from(element.classList);
          if (classes.length > 0) {
            const uniqueClass = classes.find(cls => 
              document.querySelectorAll(`.${cls}`).length === 1
            );
            if (uniqueClass) {
              return `.${uniqueClass}`;
            }
            // Return first class as fallback
            return `.${classes[0]}`;
          }
          
          // Fallback to tag name
          return element.tagName.toLowerCase();
        };

        const result = {};

        // Extract selectors for single elements
        for (const [key, element] of Object.entries(elements)) {
          if (element instanceof NodeList) {
            // Handle NodeList
            if (element.length > 0) {
              result[key] = extractSelector(element[0]);
            }
          } else if (element) {
            // Handle single element
            result[key] = extractSelector(element);
          }
        }

        return result;
      });

      this.logger.info(`DOM analysis completed, found ${Object.keys(domData).length} elements`);
      return domData;

    } catch (error) {
      this.logger.error('DOM analysis failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate selectors from DOM data
   * @param {Object} domData - DOM analysis data
   * @returns {Promise<Object>} Generated selectors
   */
  async generateSelectors(domData) {
    try {
      this.logger.info('Generating selectors from DOM data');

      const selectors = {};

      // Filter out null values and format selectors
      for (const [key, value] of Object.entries(domData)) {
        if (value && typeof value === 'string') {
          // Clean up selector
          const cleanedSelector = value.trim();
          if (cleanedSelector.length > 0) {
            selectors[key] = cleanedSelector;
          }
        }
      }

      this.logger.info(`Generated ${Object.keys(selectors).length} selectors`);
      return selectors;

    } catch (error) {
      this.logger.error('Selector generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Collect comprehensive chat selectors
   * @param {Page} page - Playwright page
   * @returns {Promise<Object>} Chat selectors
   */
  async collectChatSelectors(page) {
    try {
      this.logger.info('Collecting comprehensive chat selectors');

      const chatSelectors = await page.evaluate(() => {
        const chatElements = {
          // Chat Controls
          newChatButton: document.querySelector('[aria-label*="New Chat"], [data-testid*="new-chat"], button[title*="New Chat"], .new-chat-button'),
          sendButton: document.querySelector('[aria-label*="Send"], [data-testid*="send"], button[title*="Send"], .send-button'),
          deleteChatButton: document.querySelector('[aria-label*="Delete"], [data-testid*="delete"], button[title*="Delete"], .delete-chat-button'),
          renameChatButton: document.querySelector('[aria-label*="Rename"], [data-testid*="rename"], button[title*="Rename"], .rename-chat-button'),
          
          // Chat History
          chatHistory: document.querySelector('[class*="chat-history"], [data-testid*="chat-history"], .chat-history'),
          chatHistoryItem: document.querySelectorAll('[class*="chat-history-item"], [data-testid*="chat-history-item"], .chat-history-item'),
          chatHistoryTitle: document.querySelectorAll('[class*="chat-title"], [data-testid*="chat-title"], .chat-title'),
          
          // Chat Status
          connectionStatus: document.querySelector('[class*="connection-status"], [data-testid*="connection-status"], .connection-status'),
          loadingIndicator: document.querySelector('[class*="loading"], [data-testid*="loading"], .loading-indicator, .spinner'),
          thinkingIndicator: document.querySelector('[class*="thinking"], [data-testid*="thinking"], .thinking-indicator'),
          
          // Chat Settings
          settingsButton: document.querySelector('[aria-label*="Settings"], [data-testid*="settings"], button[title*="Settings"], .settings-button'),
          modelSelector: document.querySelector('[aria-label*="Model"], [data-testid*="model"], select[name*="model"], .model-selector'),
          webSearchToggle: document.querySelector('[aria-label*="Web Search"], [data-testid*="web-search"], input[type="checkbox"][name*="web"], .web-search-toggle'),
          
          // Chat Context
          contextButton: document.querySelector('[aria-label*="Context"], [data-testid*="context"], button[title*="Context"], .context-button'),
          attachFileButton: document.querySelector('[aria-label*="Attach"], [data-testid*="attach"], button[title*="Attach"], .attach-file-button'),
          helpButton: document.querySelector('[aria-label*="Help"], [data-testid*="help"], button[title*="Help"], .help-button'),
          premiumPill: document.querySelector('[class*="premium"], [data-testid*="premium"], .premium-pill'),
          atSignButton: document.querySelector('[aria-label*="@"], [data-testid*="at-sign"], button[title*="@"], .at-sign-button'),
          
          // Chat Messages
          chatInput: document.querySelector('[contenteditable="true"], textarea, input[type="text"], .chat-input'),
          chatContainer: document.querySelector('[class*="chat"], [class*="conversation"], .chat-container'),
          userMessages: document.querySelectorAll('[class*="user"], [class*="human"], .user-message'),
          aiMessages: document.querySelectorAll('[class*="ai"], [class*="assistant"], [class*="bot"], .ai-message'),
          messageTimestamp: document.querySelectorAll('[class*="timestamp"], [data-testid*="timestamp"], .message-timestamp'),
          messageActions: document.querySelectorAll('[class*="message-actions"], [data-testid*="message-actions"], .message-actions'),
          messageCopyButton: document.querySelectorAll('[aria-label*="Copy"], [data-testid*="copy"], button[title*="Copy"], .copy-button'),
          
          // Chat Code Blocks
          codeBlockRejectButton: document.querySelectorAll('[aria-label*="Reject"], [data-testid*="reject"], button[title*="Reject"], .reject-button'),
          codeBlockCopyButton: document.querySelectorAll('[aria-label*="Copy Code"], [data-testid*="copy-code"], button[title*="Copy Code"], .copy-code-button'),
          codeBlockDownloadButton: document.querySelectorAll('[aria-label*="Download"], [data-testid*="download"], button[title*="Download"], .download-button'),
          
          // Chat Modals
          chatSettingsModal: document.querySelector('[class*="settings-modal"], [data-testid*="settings-modal"], .settings-modal'),
          chatHistoryModal: document.querySelector('[class*="history-modal"], [data-testid*="history-modal"], .history-modal'),
          chatExportModal: document.querySelector('[class*="export-modal"], [data-testid*="export-modal"], .export-modal'),
          
          // Chat Error States
          errorMessage: document.querySelector('[class*="error"], [data-testid*="error"], .error-message'),
          retryButton: document.querySelector('[aria-label*="Retry"], [data-testid*="retry"], button[title*="Retry"], .retry-button'),
          connectionError: document.querySelector('[class*="connection-error"], [data-testid*="connection-error"], .connection-error'),
          
          // Chat UI
          userAvatar: document.querySelector('[class*="avatar"], [data-testid*="avatar"], .user-avatar'),
          userName: document.querySelector('[class*="username"], [data-testid*="username"], .user-name'),
          themeToggle: document.querySelector('[aria-label*="Theme"], [data-testid*="theme"], button[title*="Theme"], .theme-toggle'),
          agentAutoButton: document.querySelector('[aria-label*="Agent"], [data-testid*="agent"], button[title*="Agent"], .agent-auto-button'),
          contextPercentage: document.querySelector('[class*="context-percentage"], [data-testid*="context-percentage"], .context-percentage'),
          
          // Agent Controls
          agentModeSelector: document.querySelector('[aria-label*="Agent Mode"], [data-testid*="agent-mode"], select[name*="agent-mode"], .agent-mode-selector'),
          agentModeDropdown: document.querySelector('[class*="agent-mode-dropdown"], [data-testid*="agent-mode-dropdown"], .agent-mode-dropdown'),
          askModeButton: document.querySelector('[aria-label*="Ask Mode"], [data-testid*="ask-mode"], button[title*="Ask Mode"], .ask-mode-button'),
          agentModeButton: document.querySelector('[aria-label*="Agent Mode"], [data-testid*="agent-mode"], button[title*="Agent Mode"], .agent-mode-button'),
          modelDropdown: document.querySelector('[class*="model-dropdown"], [data-testid*="model-dropdown"], .model-dropdown'),
          autoModelToggle: document.querySelector('[aria-label*="Auto Model"], [data-testid*="auto-model"], input[type="checkbox"][name*="auto"], .auto-model-toggle'),
          modelOptions: document.querySelectorAll('[class*="model-option"], [data-testid*="model-option"], .model-option')
        };

        // Extract selector information with enhanced logic
        const extractSelector = (element) => {
          if (!element) return null;
          
          // Try data-testid first (most reliable)
          if (element.getAttribute('data-testid')) {
            return `[data-testid="${element.getAttribute('data-testid')}"]`;
          }
          
          // Try aria-label (good for accessibility)
          if (element.getAttribute('aria-label')) {
            return `[aria-label="${element.getAttribute('aria-label')}"]`;
          }
          
          // Try ID
          if (element.id) {
            return `#${element.id}`;
          }
          
          // Try unique class combinations
          const classes = Array.from(element.classList);
          if (classes.length > 0) {
            // Look for unique class combinations
            for (let i = 0; i < classes.length; i++) {
              for (let j = i + 1; j < classes.length; j++) {
                const combinedClass = `.${classes[i]}.${classes[j]}`;
                if (document.querySelectorAll(combinedClass).length === 1) {
                  return combinedClass;
                }
              }
            }
            
            // Try single unique class
            const uniqueClass = classes.find(cls => 
              document.querySelectorAll(`.${cls}`).length === 1
            );
            if (uniqueClass) {
              return `.${uniqueClass}`;
            }
            
            // Return first class as fallback
            return `.${classes[0]}`;
          }
          
          // Fallback to tag name with attributes
          const tagName = element.tagName.toLowerCase();
          const attributes = Array.from(element.attributes)
            .filter(attr => !['class', 'id'].includes(attr.name))
            .map(attr => `[${attr.name}="${attr.value}"]`)
            .join('');
          
          return attributes ? `${tagName}${attributes}` : tagName;
        };

        const result = {};

        // Extract selectors for single elements
        for (const [key, element] of Object.entries(chatElements)) {
          if (element instanceof NodeList) {
            // Handle NodeList - get first element's selector
            if (element.length > 0) {
              result[key] = extractSelector(element[0]);
            }
          } else if (element) {
            // Handle single element
            result[key] = extractSelector(element);
          }
        }

        return result;
      });

      this.logger.info(`Collected ${Object.keys(chatSelectors).length} chat selectors`);
      return chatSelectors;

    } catch (error) {
      this.logger.error('Chat selector collection failed:', error.message);
      throw error;
    }
  }

  /**
   * Detect chat state (active, premium, agent modes)
   * @param {Page} page - Playwright page
   * @returns {Promise<Object>} Chat state information
   */
  async detectChatState(page) {
    try {
      this.logger.info('Detecting chat state');

      const chatState = await page.evaluate(() => {
        const state = {
          isActive: false,
          isPremium: false,
          agentMode: null,
          modelType: null,
          webSearchEnabled: false,
          contextAttached: false
        };

        // Detect active chat
        const chatInput = document.querySelector('[contenteditable="true"], textarea, input[type="text"]');
        state.isActive = chatInput !== null && chatInput.offsetParent !== null;

        // Detect premium features
        const premiumElements = document.querySelectorAll('[class*="premium"], [data-testid*="premium"]');
        state.isPremium = premiumElements.length > 0;

        // Detect agent mode
        const agentElements = document.querySelectorAll('[class*="agent"], [data-testid*="agent"]');
        if (agentElements.length > 0) {
          state.agentMode = 'enabled';
        }

        // Detect model type
        const modelSelector = document.querySelector('[aria-label*="Model"], [data-testid*="model"]');
        if (modelSelector) {
          state.modelType = modelSelector.textContent || 'unknown';
        }

        // Detect web search
        const webSearchToggle = document.querySelector('[aria-label*="Web Search"], [data-testid*="web-search"]');
        if (webSearchToggle) {
          state.webSearchEnabled = webSearchToggle.checked || false;
        }

        // Detect context attachment
        const contextElements = document.querySelectorAll('[class*="context"], [data-testid*="context"]');
        state.contextAttached = contextElements.length > 0;

        return state;
      });

      this.logger.info(`Chat state detected: ${JSON.stringify(chatState)}`);
      return chatState;

    } catch (error) {
      this.logger.error('Chat state detection failed:', error.message);
      return {
        isActive: false,
        isPremium: false,
        agentMode: null,
        modelType: null,
        webSearchEnabled: false,
        contextAttached: false
      };
    }
  }

  /**
   * Discover additional selectors
   * @param {Page} page - Playwright page
   * @returns {Promise<Object>} Discovered selectors
   */
  async discoverSelectors(page) {
    try {
      this.logger.info('Discovering additional selectors');

      const discovered = await page.evaluate(() => {
        const selectors = {};

        // Find all elements with data attributes
        const dataElements = document.querySelectorAll('[data-testid], [data-id], [data-component]');
        dataElements.forEach((el, index) => {
          const testId = el.getAttribute('data-testid');
          const dataId = el.getAttribute('data-id');
          const component = el.getAttribute('data-component');
          
          if (testId) {
            selectors[`testid_${testId}`] = `[data-testid="${testId}"]`;
          }
          if (dataId) {
            selectors[`dataid_${dataId}`] = `[data-id="${dataId}"]`;
          }
          if (component) {
            selectors[`component_${component}`] = `[data-component="${component}"]`;
          }
        });

        // Find elements with aria labels
        const ariaElements = document.querySelectorAll('[aria-label], [aria-labelledby]');
        ariaElements.forEach((el, index) => {
          const ariaLabel = el.getAttribute('aria-label');
          if (ariaLabel) {
            const key = ariaLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');
            selectors[`aria_${key}`] = `[aria-label="${ariaLabel}"]`;
          }
        });

        return selectors;
      });

      this.logger.info(`Discovered ${Object.keys(discovered).length} additional selectors`);
      return discovered;

    } catch (error) {
      this.logger.error('Selector discovery failed:', error.message);
      return {};
    }
  }

  /**
   * Validate selector against page
   * @param {Page} page - Playwright page
   * @param {string} selector - Selector to validate
   * @returns {Promise<boolean>} True if selector is valid
   */
  async validateSelector(page, selector) {
    try {
      const element = await page.$(selector);
      return element !== null;
    } catch (error) {
      this.logger.warn(`Selector validation failed for ${selector}:`, error.message);
      return false;
    }
  }

  /**
   * Test port availability
   * @param {number} port - Port to test
   * @returns {Promise<boolean>} True if port is available
   */
  async testPort(port) {
    try {
      const browser = await chromium.connectOverCDP({
        endpointURL: `http://${this.options.host}:${port}`,
        timeout: 3000
      });
      
      await browser.close();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get collector statistics
   * @returns {Object} Collector statistics
   */
  getStats() {
    return {
      options: this.options,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = SelectorCollector;

