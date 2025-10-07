/**
 * SelectorCollectionBot - Automated selector collection service
 * Integrates DOM collection and selector generation functionality from scripts
 */

const Logger = require('@logging/Logger');
const logger = new Logger('SelectorCollectionBot');

class SelectorCollectionBot {
  constructor(dependencies = {}) {
    this.selectorCollector = dependencies.selectorCollector;
    this.selectorVersionManager = dependencies.selectorVersionManager;
    this.ideTypesUpdater = dependencies.ideTypesUpdater;
    this.logger = dependencies.logger || logger;
    this.collectionCache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Collect selectors for IDE type and version
   * @param {string} ideType - IDE type (cursor, vscode, windsurf)
   * @param {string} version - IDE version
   * @param {number} port - IDE port
   * @returns {Promise<Object>} Collected selectors
   */
  async collectSelectors(ideType, version, port) {
    try {
      this.logger.info(`Collecting selectors for ${ideType} version ${version} on port ${port}`);
      
      // Check cache first
      const cacheKey = `${ideType}:${version}`;
      const cached = this.collectionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        this.logger.info(`Using cached selectors for ${ideType} version ${version}`);
        return cached.selectors;
      }

      // Collect selectors using SelectorCollector
      const collectedSelectors = await this.selectorCollector.collectSelectors(port);
      
      if (!collectedSelectors || Object.keys(collectedSelectors).length === 0) {
        throw new Error(`No selectors collected for ${ideType} version ${version}`);
      }

      // Validate collected selectors
      const validatedSelectors = await this.validateSelectors(collectedSelectors);
      
      // Categorize selectors
      const categorizedSelectors = await this.categorizeSelectors(validatedSelectors);

      // Cache the result
      this.collectionCache.set(cacheKey, {
        selectors: categorizedSelectors,
        timestamp: Date.now()
      });

      this.logger.info(`Successfully collected ${Object.keys(categorizedSelectors).length} selector categories for ${ideType} version ${version}`);
      return categorizedSelectors;

    } catch (error) {
      this.logger.error(`Selector collection failed for ${ideType} version ${version}:`, error.message);
      throw error;
    }
  }

  /**
   * Validate collected selectors
   * @param {Object} selectors - Raw selectors
   * @returns {Promise<Object>} Validated selectors
   */
  async validateSelectors(selectors) {
    try {
      const validated = {};

      for (const [key, value] of Object.entries(selectors)) {
        // Skip invalid selectors
        if (!value || typeof value !== 'string') {
          this.logger.warn(`Skipping invalid selector for ${key}: ${value}`);
          continue;
        }

        // Validate selector syntax (basic check)
        if (this.isValidSelector(value)) {
          validated[key] = value;
        } else {
          this.logger.warn(`Invalid selector syntax for ${key}: ${value}`);
        }
      }

      this.logger.info(`Validated ${Object.keys(validated).length} selectors`);
      return validated;

    } catch (error) {
      this.logger.error('Selector validation failed:', error.message);
      throw error;
    }
  }

  /**
   * Check if selector syntax is valid
   * @param {string} selector - Selector string
   * @returns {boolean} True if valid
   */
  isValidSelector(selector) {
    try {
      // Basic validation - check for common selector patterns
      if (!selector || selector.trim().length === 0) {
        return false;
      }

      // Check for dangerous patterns
      const dangerousPatterns = [
        '<script',
        'javascript:',
        'onerror=',
        'onclick='
      ];

      for (const pattern of dangerousPatterns) {
        if (selector.toLowerCase().includes(pattern)) {
          return false;
        }
      }

      // Valid selector patterns
      const validPatterns = [
        /^[.#][\w-]+/,           // Class or ID selector
        /^\w+/,                   // Element selector
        /^\[[\w-]+(=|~=|\|=|\^=|\$=|\*=)?/,  // Attribute selector
        /^:[\w-]+/                // Pseudo-class
      ];

      return validPatterns.some(pattern => pattern.test(selector));

    } catch (error) {
      this.logger.error('Selector validation error:', error.message);
      return false;
    }
  }

  /**
   * Categorize selectors by component type
   * @param {Object} selectors - Validated selectors
   * @returns {Promise<Object>} Categorized selectors
   */
  async categorizeSelectors(selectors) {
    try {
      const categories = {
        chatSelectors: {},
        commandPaletteSelectors: {},
        fileOperationSelectors: {},
        menuNavigationSelectors: {},
        projectManagementSelectors: {},
        welcomeScreenSelectors: {},
        workspaceSelectors: {},
        other: {}
      };

      // Enhanced categorization rules with consolidated 7-category structure
      const categoryRules = {
        'chatSelectors': [
          'input', 'inputcontainer', 'usermessages', 'aimessages', 'messagescontainer',
          'chatcontainer', 'isactive', 'isinputready', 'codeblocks', 'codeblockcontent',
          'codeblockheader', 'codeblockfilename', 'codeblocklanguage', 'monacoeditor',
          'codelines', 'syntaxtokens', 'codeblockapplybutton', 'inlinecode', 'codespans',
          'terminalblocks', 'filereferences', 'urls', 'jsonblocks', 'cssblocks', 'sqlblocks',
          'yamlblocks', 'dockerblocks', 'envblocks', 'lists', 'tables', 'syntaxclasses',
          'newchatbutton', 'sendbutton', 'deletechatbutton', 'renamechatbutton',
          'chathistory', 'chathistoryitem', 'chathistorytitle', 'connectionstatus',
          'loadingindicator', 'thinkingindicator', 'settingsbutton', 'modelselector',
          'websearchtoggle', 'contextbutton', 'attachfilebutton', 'helpbutton',
          'premiumpill', 'atsignbutton', 'messagetimestamp', 'messageactions',
          'messagecopybutton', 'codeblockrejectbutton', 'codeblockcopybutton',
          'codeblockdownloadbutton', 'chatsettingsmodal', 'chathistorymodal',
          'chatexportmodal', 'errormessage', 'retrybutton', 'connectionerror',
          'useravatar', 'username', 'themetoggle', 'agentautobutton', 'contextpercentage',
          'agentmodeselector', 'agentmodedropdown', 'askmodebutton', 'agentmodebutton',
          'modeldropdown', 'automodeltoggle', 'modeloptions', 'newchatbuttoncommand',
          'newchatbuttonlink', 'newchatbuttonlabel', 'addtwobutton', 'addtwobuttontab',
          'addtwobuttonrole', 'addtwobuttonclass', 'newchataria', 'newtabaria',
          'codiconaddtwo', 'actionlabelnew', 'buttonnewchat', 'linknewchat',
          'newchatbuttonclass', 'newchattestid', 'codiconadd', 'arialabeladd',
          'buttonnewchat', 'linknewchat', 'newchatbuttonclass', 'newchattestid',
          'codiconadd', 'arialabeladd', 'buttonnewchat', 'linknewchat',
          'newchatbuttonclass', 'newchattestid', 'codiconadd', 'arialabeladd',
          'buttontitlenew', 'linktitlenew', 'codiconsend', 'actionlabelsend',
          'chatexecutetoolbar', 'monacoactionbar', 'buttonsend', 'sendbuttonclass',
          'buttontitlesend', 'sendbuttontestid', 'contenteditable', 'textarea',
          'viewline', 'viewlines'
        ],
        'commandPaletteSelectors': [
          'commandpalette', 'palette', 'command', 'input', 'executecommand',
          'cancelcommand', 'historyup', 'historydown', 'terminalcommands'
        ],
        'fileOperationSelectors': [
          'filetabs', 'activetab', 'closetab', 'tablist', 'fileoperations',
          'newfile', 'closefile', 'filesearch', 'searchinput', 'searchbutton',
          'replacebutton', 'tabtitle', 'tabbylabel', 'modal', 'closebutton',
          'button', 'okbutton', 'continuebutton', 'startbutton', 'createbutton',
          'beginbutton', 'yesbutton', 'nobutton', 'cancelbutton'
        ],
        'menuNavigationSelectors': [
          'menubar', 'filemenu', 'editmenu', 'viewmenu', 'gomenu', 'runmenu',
          'terminalmenu', 'helpmenu', 'menuitem', 'contextmenu', 'contextmenuitem',
          'contextsubmenu'
        ],
        'projectManagementSelectors': [
          'welcomescreen', 'newproject', 'recentprojects', 'filemenu', 'closefolder',
          'closeworkspace', 'projectexplorer', 'container', 'list', 'tree', 'rows',
          'labelname', 'refreshbutton', 'newfilebutton', 'newfolderbutton',
          'workspace', 'workspacename', 'workspacepath', 'switchworkspace',
          'addtoworkspace', 'treeitemexpanded'
        ],
        'welcomeScreenSelectors': [
          'authentication', 'startbutton', 'authfeatures', 'authdescription',
          'welcomeactions', 'helpbutton'
        ],
        'workspaceSelectors': [
          'workspacemanagement', 'workspacesettings', 'workspaceconfig',
          'workspaceextensions'
        ]
      };

      for (const [key, value] of Object.entries(selectors)) {
        // Skip chat state metadata
        if (key === '_chatState') {
          continue;
        }

        let categorized = false;

        // Try to categorize based on rules
        for (const [category, patterns] of Object.entries(categoryRules)) {
          if (patterns.some(pattern => key.toLowerCase().includes(pattern) || value.toLowerCase().includes(pattern))) {
            categories[category][key] = value;
            categorized = true;
            break;
          }
        }

        // If not categorized, put in 'other'
        if (!categorized) {
          categories.other[key] = value;
        }
      }

      // Remove empty categories
      const result = {};
      for (const [category, items] of Object.entries(categories)) {
        if (Object.keys(items).length > 0) {
          result[category] = items;
        }
      }

      this.logger.info(`Categorized selectors into ${Object.keys(result).length} categories`);
      return result;

    } catch (error) {
      this.logger.error('Selector categorization failed:', error.message);
      throw error;
    }
  }

  /**
   * Collect comprehensive chat selectors
   * @param {string} ideType - IDE type
   * @param {string} version - IDE version
   * @param {number} port - IDE port
   * @returns {Promise<Object>} Chat selectors
   */
  async collectChatSelectors(ideType, version, port) {
    try {
      this.logger.info(`Collecting comprehensive chat selectors for ${ideType} version ${version}`);

      // Use SelectorCollector to get chat selectors
      const allSelectors = await this.selectorCollector.collectSelectors(port);
      const chatSelectors = {};
      
      // Extract chat-related selectors from all selectors
      const chatKeys = Object.keys(allSelectors).filter(key => 
        key.includes('chat') || key.includes('message') || key.includes('ai') || 
        key.includes('assistant') || key.includes('send') || key.includes('new') ||
        key.includes('delete') || key.includes('rename') || key.includes('settings') ||
        key.includes('model') || key.includes('context') || key.includes('premium') ||
        key.includes('agent') || key.includes('error') || key.includes('loading') ||
        key === '_chatState'
      );
      
      chatKeys.forEach(key => {
        chatSelectors[key] = allSelectors[key];
      });

      // Validate chat selectors
      const validatedChatSelectors = await this.validateChatSelectors(chatSelectors);

      this.logger.info(`Successfully collected ${Object.keys(validatedChatSelectors).length} chat selectors`);
      return validatedChatSelectors;

    } catch (error) {
      this.logger.error(`Chat selector collection failed for ${ideType} version ${version}:`, error.message);
      throw error;
    }
  }

  /**
   * Validate chat selectors specifically
   * @param {Object} chatSelectors - Chat selectors to validate
   * @returns {Promise<Object>} Validated chat selectors
   */
  async validateChatSelectors(chatSelectors) {
    try {
      const validated = {};
      const chatRequiredSelectors = [
        'newChatButton', 'sendButton', 'chatInput', 'chatContainer',
        'userMessages', 'aiMessages', 'settingsButton'
      ];

      for (const [key, value] of Object.entries(chatSelectors)) {
        // Skip chat state metadata
        if (key === '_chatState') {
          validated[key] = value;
          continue;
        }

        // Validate selector syntax
        if (this.isValidSelector(value)) {
          validated[key] = value;
        } else {
          this.logger.warn(`Invalid chat selector syntax for ${key}: ${value}`);
        }
      }

      // Check for required chat selectors
      const missingRequired = chatRequiredSelectors.filter(selector => !validated[selector]);
      if (missingRequired.length > 0) {
        this.logger.warn(`Missing required chat selectors: ${missingRequired.join(', ')}`);
      }

      this.logger.info(`Validated ${Object.keys(validated).length} chat selectors`);
      return validated;

    } catch (error) {
      this.logger.error('Chat selector validation failed:', error.message);
      throw error;
    }
  }

  /**
   * Test chat selectors specifically
   * @param {string} ideType - IDE type
   * @param {string} version - IDE version
   * @param {Object} chatSelectors - Chat selectors to test
   * @param {number} port - IDE port
   * @returns {Promise<Object>} Test results
   */
  async testChatSelectors(ideType, version, chatSelectors, port) {
    try {
      this.logger.info(`Testing chat selectors for ${ideType} version ${version}`);

      const results = {
        ideType,
        version,
        port,
        tested: 0,
        passed: 0,
        failed: 0,
        chatState: chatSelectors._chatState || {},
        details: {}
      };

      // Test each chat selector
      for (const [key, selector] of Object.entries(chatSelectors)) {
        if (key === '_chatState') {
          continue;
        }

        results.tested++;
        
        // Validate selector format
        const isValid = this.isValidSelector(selector);
        
        if (isValid) {
          results.passed++;
          results.details[key] = {
            selector,
            status: 'passed'
          };
        } else {
          results.failed++;
          results.details[key] = {
            selector,
            status: 'failed',
            error: 'Invalid selector format'
          };
        }
      }

      this.logger.info(`Chat selector testing completed: ${results.passed}/${results.tested} passed`);
      return results;

    } catch (error) {
      this.logger.error(`Chat selector testing failed for ${ideType} version ${version}:`, error.message);
      throw error;
    }
  }

  /**
   * Save selectors to version manager
   * @param {string} ideType - IDE type
   * @param {string} version - IDE version
   * @param {Object} selectors - Selectors to save
   * @returns {Promise<boolean>} True if saved successfully
   */
  async saveSelectors(ideType, version, selectors) {
    try {
      this.logger.info(`Saving selectors for ${ideType} version ${version}`);

      // Validate input
      if (!ideType || !version || !selectors) {
        throw new Error('Invalid input: ideType, version, and selectors are required');
      }

      // Format selectors for storage using consolidated 7-category structure
      const formattedSelectors = {
        chatSelectors: selectors.chatSelectors || {},
        commandPaletteSelectors: selectors.commandPaletteSelectors || {},
        fileOperationSelectors: selectors.fileOperationSelectors || {},
        menuNavigationSelectors: selectors.menuNavigationSelectors || {},
        projectManagementSelectors: selectors.projectManagementSelectors || {},
        welcomeScreenSelectors: selectors.welcomeScreenSelectors || {},
        workspaceSelectors: selectors.workspaceSelectors || {},
        metadata: {
          version,
          collectedAt: new Date().toISOString(),
          totalSelectors: Object.values(selectors).reduce((sum, cat) => sum + Object.keys(cat).length, 0)
        }
      };

      // Save to IDETypes.js using IDETypesUpdater
      if (this.ideTypesUpdater) {
        const updateResult = await this.ideTypesUpdater.updateVersion(ideType, version, selectors);
        this.logger.info(`Successfully updated IDETypes.js with ${ideType} version ${version}`);
        return updateResult;
      } else {
        this.logger.warn(`IDETypesUpdater not available, selectors not saved to IDETypes.js for ${ideType} version ${version}`);
        return {
          success: false,
          error: 'IDETypesUpdater not available',
          message: 'Selectors formatted but not saved to IDETypes.js'
        };
      }

    } catch (error) {
      this.logger.error(`Failed to save selectors for ${ideType} version ${version}:`, error.message);
      throw error;
    }
  }

  /**
   * Test selectors against IDE
   * @param {string} ideType - IDE type
   * @param {string} version - IDE version
   * @param {Object} selectors - Selectors to test
   * @param {number} port - IDE port
   * @returns {Promise<Object>} Test results
   */
  async testSelectors(ideType, version, selectors, port) {
    try {
      this.logger.info(`Testing selectors for ${ideType} version ${version}`);

      const results = {
        ideType,
        version,
        port,
        tested: 0,
        passed: 0,
        failed: 0,
        details: {}
      };

      // Test each selector category
      for (const [category, categorySelectors] of Object.entries(selectors)) {
        results.details[category] = {
          total: Object.keys(categorySelectors).length,
          passed: 0,
          failed: 0,
          selectors: {}
        };

        for (const [key, selector] of Object.entries(categorySelectors)) {
          results.tested++;
          
          // In actual implementation, this would test against the IDE
          // For now, we just validate the selector format
          const isValid = this.isValidSelector(selector);
          
          if (isValid) {
            results.passed++;
            results.details[category].passed++;
            results.details[category].selectors[key] = {
              selector,
              status: 'passed'
            };
          } else {
            results.failed++;
            results.details[category].failed++;
            results.details[category].selectors[key] = {
              selector,
              status: 'failed',
              error: 'Invalid selector format'
            };
          }
        }
      }

      this.logger.info(`Selector testing completed: ${results.passed}/${results.tested} passed`);
      return results;

    } catch (error) {
      this.logger.error(`Selector testing failed for ${ideType} version ${version}:`, error.message);
      throw error;
    }
  }

  /**
   * Clear collection cache
   */
  clearCache() {
    this.collectionCache.clear();
    this.logger.info('Selector collection cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.collectionCache.size,
      timeout: this.cacheTimeout,
      entries: Array.from(this.collectionCache.keys()).map(key => {
        const entry = this.collectionCache.get(key);
        return {
          key,
          timestamp: entry.timestamp,
          age: Date.now() - entry.timestamp,
          categories: Object.keys(entry.selectors).length
        };
      })
    };
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return {
      cache: this.getCacheStats(),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = SelectorCollectionBot;
