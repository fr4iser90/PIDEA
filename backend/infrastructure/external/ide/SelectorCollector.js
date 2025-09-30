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

      this.logger.info(`Successfully collected ${Object.keys(selectors).length} selectors from port ${port}`);
      return selectors;

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
          // Chat-related elements
          chatInput: document.querySelector('[contenteditable="true"], textarea, input[type="text"]'),
          chatContainer: document.querySelector('[class*="chat"], [class*="conversation"]'),
          userMessages: document.querySelectorAll('[class*="user"], [class*="human"]'),
          aiMessages: document.querySelectorAll('[class*="ai"], [class*="assistant"], [class*="bot"]'),
          
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

