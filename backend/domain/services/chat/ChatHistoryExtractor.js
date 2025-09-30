const IDETypes = require('../ide/IDETypes');
const JSONSelectorManager = require('../ide/JSONSelectorManager');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');


class ChatHistoryExtractor {
  constructor(browserManager, ideType = IDETypes.CURSOR) {
    this.browserManager = browserManager;
    this.ideType = ideType;
    this.jsonSelectorManager = new JSONSelectorManager();
    this.selectors = null; // Will be loaded when needed with version
    
    // Note: Selectors are now loaded dynamically with version
    // Use this.getSelectors(version) to get selectors for specific version

    // Context tracking properties
    this.conversationContext = {
      topics: [],
      intentHistory: [],
      codeReferences: [],
      lastUserIntent: null,
      conversationFlow: []
    };
  }

  /**
   * Get selectors for specific version
   * @param {string} version - IDE version
   * @returns {Promise<Object>} Selectors object
   */
  async getSelectors(version) {
    if (!version) {
      throw new Error(`Version is required for ${this.ideType}. No fallbacks allowed.`);
    }
    
    try {
      return await this.jsonSelectorManager.getSelectors(this.ideType, version);
    } catch (error) {
      logger.error(`Error loading selectors for ${this.ideType} version ${version}:`, error.message);
      throw error;
    }
  }

  /**
   * Extract chat history from the current IDE
   * @param {string} version - IDE version (required)
   * @returns {Promise<Array>} Array of chat messages
   */
  async extractChatHistory(version) {
    if (!version) {
      throw new Error(`Version is required for chat extraction. No fallbacks allowed.`);
    }

    try {
      const startTime = Date.now();
      logger.info(`ChatHistoryExtractor: Starting chat extraction for ${this.ideType} version ${version}`);
      
      // Load selectors for the specific version
      const selectors = await this.getSelectors(version);
      
      const page = await this.browserManager.getPage();
      
      // ✅ OPTIMIZATION: Reduce timeout from 1000ms to 100ms for faster response
      await page.waitForTimeout(100); // Reduced from 1000ms
      
      const allMessages = await this.extractMessagesByIDEType(page, selectors);
      
      const duration = Date.now() - startTime;
      logger.info(`ChatHistoryExtractor: Extraction completed in ${duration}ms`, {
        messageCount: allMessages.length,
        duration
      });
      
      return allMessages;
    } catch (error) {
      logger.error('ChatHistoryExtractor: Failed to extract chat history:', error);
      throw error;
    }
  }

  /**
   * Navigate to the actual VS Code application window
   * @param {Page} page - Playwright page object
   */
  async navigateToVSCodeApp(page) {
    try {
      logger.info('[VSCode] Navigating to VS Code app...');
      
      // Get all targets (pages) available
      const targets = await this.browserManager.browser.targets();
      logger.info('[VSCode] Available targets:', targets.length);
      
      // Find the VS Code application target (not DevTools)
      let vscodeTarget = null;
      for (const target of targets) {
        const url = target.url();
        logger.info('[VSCode] Target URL:', url);
        
        // Skip DevTools targets
        if (url.includes('devtools://') || url.includes('chrome-devtools://')) {
          continue;
        }
        
        // Look for VS Code application target
        if (url.includes('file://') || url.includes('vscode://') || url === 'about:blank') {
          vscodeTarget = target;
          break;
        }
      }
      
      if (vscodeTarget) {
        logger.info('[VSCode] Found VS Code app target, navigating...');
        const newPage = await vscodeTarget.page();
        if (newPage) {
          // Update the browser manager to use the new page
          this.browserManager.currentPage = newPage;
          logger.info('[VSCode] Successfully navigated to VS Code app');
          return;
        }
      }
      
      logger.info('[VSCode] No VS Code app target found, staying on current page');
    } catch (error) {
      logger.error('[VSCode] Error navigating to VS Code app:', error);
    }
  }

  /**
   * Extract messages using IDE-specific logic
   * @param {Page} page - Playwright page object
   * @param {Object} selectors - Selectors for the specific version
   * @returns {Promise<Array>} Array of messages
   */
  async extractMessagesByIDEType(page, selectors) {
    switch (this.ideType) {
      case IDETypes.CURSOR:
        return await this.extractCursorMessages(page, selectors);
      case IDETypes.VSCODE:
        return await this.extractVSCodeMessages(page, selectors);
      case IDETypes.WINDSURF:
        return await this.extractWindsurfMessages(page, selectors);
      default:
        return await this.extractGenericMessages(page, selectors);
    }
  }

  /**
   * Extract messages from Cursor IDE
   * @param {Page} page - Playwright page object
   * @param {Object} selectors - Selectors for the specific version
   * @returns {Promise<Array>} Array of messages
   */
  async extractCursorMessages(page, selectors) {
    return await page.evaluate((selectors) => {
      const messages = [];
      
      // Find all User messages
      const userElements = document.querySelectorAll(selectors.chatSelectors.userMessages);
      userElements.forEach((element, index) => {
        const text = element.innerText || element.textContent || '';
        if (text.trim()) {
          messages.push({
            sender: 'user',
            type: text.includes('```') ? 'code' : 'text',
            content: text,
            element: element,
            index: index
          });
        }
      });
      
      // Find all AI normal messages (text only)
      const aiElements = document.querySelectorAll(selectors.chatSelectors.aiMessages);
      aiElements.forEach((element, index) => {
        const content = element.innerText || element.textContent || '';
        if (content.trim()) {
          messages.push({
            sender: 'assistant',
            type: 'text',
            content: content,
            element: element,
            index: index
          });
        }
      });
      
      // Find all AI code blocks as SEPARATE messages
      const codeBlockElements = document.querySelectorAll(selectors.chatSelectors.codeBlocks);
      codeBlockElements.forEach((element, index) => {
        const content = element.innerText || element.textContent || '';
        if (content.trim()) {
          messages.push({
            sender: 'assistant',
            type: 'code',
            content: '```\n' + content + '\n```',
            element: element,
            index: index
          });
        }
      });
      
      // Sort based on DOM position (top value)
      messages.sort((a, b) => {
        const aRect = a.element.getBoundingClientRect();
        const bRect = b.element.getBoundingClientRect();
        return aRect.top - bRect.top;
      });
      
      return messages.map(msg => ({
        sender: msg.sender,
        type: msg.type,
        content: msg.content
      }));
    }, selectors);
  }

  /**
   * Extract messages from VSCode IDE (Copilot)
   * @param {Page} page - Playwright page object
   * @returns {Promise<Array>} Array of messages
   */
  async extractVSCodeMessages(page) {
    logger.info('[VSCode] extractVSCodeMessages called');
    let result;
    try {
      result = await page.evaluate((selectors) => {
        const debug = {
          selectors,
          messageRowsCount: 0,
          userRows: 0,
          aiRows: 0,
          firstRowsHtml: [],
          userFound: [],
          aiFound: [],
          // Enhanced debugging
          allMonacoRows: 0,
          allInteractiveItems: 0,
          allChatContainers: 0,
          pageTitle: document.title,
          bodyClasses: document.body.className,
          sampleBodyHTML: document.body.innerHTML.substring(0, 500)
        };
        const messages = [];
        
        // Check for various possible selectors
        const allMonacoRows = document.querySelectorAll('.monaco-list-row');
        const allInteractiveItems = document.querySelectorAll('.interactive-item-container');
        const allChatContainers = document.querySelectorAll('.chat-container, .interactive-session');
        
        debug.allMonacoRows = allMonacoRows.length;
        debug.allInteractiveItems = allInteractiveItems.length;
        debug.allChatContainers = allChatContainers.length;
        
        // Try the original selectors
        const messageRows = document.querySelectorAll(selectors.messageRows || '.monaco-list-row');
        debug.messageRowsCount = messageRows.length;
        
        messageRows.forEach((row, index) => {
          if (index < 3) debug.firstRowsHtml.push(row.outerHTML.substring(0, 300));
          // User
          const userContainer = row.querySelector('.interactive-request');
          if (userContainer) {
            debug.userRows++;
            debug.userFound.push(index);
            const contentElement = userContainer.querySelector('.value .rendered-markdown');
            if (contentElement) {
              const text = contentElement.innerText || contentElement.textContent || '';
              if (text.trim()) {
                messages.push({
                  sender: 'user',
                  type: text.includes('```') ? 'code' : 'text',
                  content: content,
                  index: index
                });
              }
            }
          }
          // AI
          const aiContainer = row.querySelector('.interactive-response');
          if (aiContainer) {
            debug.aiRows++;
            debug.aiFound.push(index);
            const contentElement = aiContainer.querySelector('.value .rendered-markdown');
            if (contentElement) {
              const text = contentElement.innerText || contentElement.textContent || '';
              if (text.trim()) {
                messages.push({
                  sender: 'assistant',
                  type: text.includes('```') ? 'code' : 'text',
                  content: content,
                  index: index
                });
              }
            }
          }
        });
        
        return { debug, messages };
      }, selectors);
    } catch (error) {
      logger.error('[VSCode] page.evaluate error:', error);
      result = { debug: { error: error.message }, messages: [] };
    }
    logger.debug('[VSCode] Debug:', JSON.stringify(result.debug, null, 2));
    return result.messages;
  }

  /**
   * Extract messages from Windsurf IDE
   * @param {Page} page - Playwright page object
   * @returns {Promise<Array>} Array of messages
   */
  async extractWindsurfMessages(page) {
    return await page.evaluate((selectors) => {
      const messages = [];
      
      // Find all User messages
      const userElements = document.querySelectorAll(selectors.chatSelectors.userMessages);
      userElements.forEach((element, index) => {
        const text = element.innerText || element.textContent || '';
        if (text.trim()) {
          messages.push({
            sender: 'user',
            type: text.includes('```') ? 'code' : 'text',
            content: content,
            element: element,
            index: index
          });
        }
      });
      
      // Find all AI messages
      const aiElements = document.querySelectorAll(selectors.chatSelectors.aiMessages);
      aiElements.forEach((element, index) => {
        const text = element.innerText || element.textContent || '';
        if (text.trim()) {
          messages.push({
            sender: 'assistant',
            type: text.includes('```') ? 'code' : 'text',
            content: content,
            element: element,
            index: index
          });
        }
      });
      
      // Sort based on DOM position (top value)
      messages.sort((a, b) => {
        const aRect = a.element.getBoundingClientRect();
        const bRect = b.element.getBoundingClientRect();
        return aRect.top - bRect.top;
      });
      
      return messages.map(msg => ({
        sender: msg.sender,
        type: msg.type,
        content: msg.content
      }));
    }, selectors);
  }

  /**
   * Extract messages using generic selectors
   * @param {Page} page - Playwright page object
   * @returns {Promise<Array>} Array of messages
   */
  async extractGenericMessages(page) {
    return await page.evaluate((selectors) => {
      const messages = [];
      
      // Try to find user messages
      if (selectors.chatSelectors.userMessages) {
        const userElements = document.querySelectorAll(selectors.chatSelectors.userMessages);
        userElements.forEach((element, index) => {
          const text = element.innerText || element.textContent || '';
          if (text.trim()) {
            messages.push({
              sender: 'user',
              type: text.includes('```') ? 'code' : 'text',
              content: content,
              element: element,
              index: index
            });
          }
        });
      }
      
      // Try to find AI messages
      if (selectors.chatSelectors.aiMessages) {
        const aiElements = document.querySelectorAll(selectors.chatSelectors.aiMessages);
        aiElements.forEach((element, index) => {
          const text = element.innerText || element.textContent || '';
          if (text.trim()) {
            messages.push({
              sender: 'assistant',
              type: text.includes('```') ? 'code' : 'text',
              content: content,
              element: element,
              index: index
            });
          }
        });
      }
      
      // Sort based on DOM position (top value)
      messages.sort((a, b) => {
        const aRect = a.element.getBoundingClientRect();
        const bRect = b.element.getBoundingClientRect();
        return aRect.top - bRect.top;
      });
      
      return messages.map(msg => ({
        sender: msg.sender,
        type: msg.type,
        content: msg.content
      }));
    }, selectors);
  }

  /**
   * Get IDE type
   * @returns {string} IDE type
   */
  getIDEType() {
    return this.ideType;
  }

  /**
   * Get current selectors
   * @returns {Object} Current selectors
   */
  getSelectors() {
    return this.selectors;
  }

  // Context tracking methods
  updateConversationContext(messages) {
    try {
      // Extract topics from messages
      this.extractTopics(messages);
      
      // Track intent history
      this.trackIntentHistory(messages);
      
      // Extract code references
      this.extractCodeReferences(messages);
      
      // Update conversation flow
      this.updateConversationFlow(messages);
      
      // logger.info('Conversation context updated:', {
      //   topicsCount: this.conversationContext.topics.length,
      //   intentHistoryCount: this.conversationContext.intentHistory.length,
      //   codeReferencesCount: this.conversationContext.codeReferences.length
      // });
    } catch (error) {
      logger.error('Error updating conversation context:', error);
    }
  }

  extractTopics(messages) {
    const topics = new Set();
    
    messages.forEach(message => {
      if (message.sender === 'user') {
        // Extract potential topics from user messages
        const words = message.content.toLowerCase().split(/\s+/);
        const topicKeywords = ['function', 'class', 'component', 'api', 'database', 'test', 'error', 'bug', 'feature', 'refactor'];
        
        topicKeywords.forEach(keyword => {
          if (words.includes(keyword)) {
            topics.add(keyword);
          }
        });
      }
    });
    
    this.conversationContext.topics = Array.from(topics);
  }

  trackIntentHistory(messages) {
    const userMessages = messages.filter(msg => msg.sender === 'user');
    
    userMessages.forEach(message => {
      const intent = this.detectMessageIntent(message.content);
      if (intent.type !== 'unknown') {
        this.conversationContext.intentHistory.push({
          message: message.content,
          intent: intent,
          timestamp: Date.now()
        });
        this.conversationContext.lastUserIntent = intent;
      }
    });
  }

  detectMessageIntent(message) {
    const messageLower = message.toLowerCase();
    
    // Intent detection patterns
    const intentPatterns = {
      codeReview: {
        keywords: ['review', 'check', 'examine', 'analyze', 'inspect', 'audit'],
        patterns: [/review.*code/i, /check.*code/i, /analyze.*code/i]
      },
      codeGeneration: {
        keywords: ['create', 'generate', 'write', 'build', 'develop', 'implement'],
        patterns: [/create.*function/i, /generate.*code/i, /write.*class/i]
      },
      debugging: {
        keywords: ['fix', 'debug', 'solve', 'resolve', 'troubleshoot', 'error'],
        patterns: [/fix.*error/i, /debug.*issue/i, /solve.*problem/i]
      },
      explanation: {
        keywords: ['explain', 'describe', 'clarify', 'understand', 'how', 'why'],
        patterns: [/explain.*code/i, /describe.*function/i, /how.*works/i]
      },
      refactoring: {
        keywords: ['refactor', 'improve', 'optimize', 'clean', 'restructure', 'simplify'],
        patterns: [/refactor.*code/i, /improve.*performance/i, /optimize.*function/i]
      }
    };

    for (const [intentType, patterns] of Object.entries(intentPatterns)) {
      let score = 0;
      
      // Check keywords
      for (const keyword of patterns.keywords) {
        if (messageLower.includes(keyword)) {
          score += 0.3;
        }
      }
      
      // Check patterns
      for (const pattern of patterns.patterns) {
        if (pattern.test(message)) {
          score += 0.5;
        }
      }
      
      if (score > 0.3) {
        return {
          type: intentType,
          confidence: Math.min(score, 1.0),
          keywords: patterns.keywords.filter(k => messageLower.includes(k))
        };
      }
    }
    
    return { type: 'unknown', confidence: 0, keywords: [] };
  }

  extractCodeReferences(messages) {
    const codeReferences = [];
    
    messages.forEach(message => {
      // Look for code blocks
      const codeBlockMatches = message.content.match(/```[\s\S]*?```/g);
      if (codeBlockMatches) {
        codeBlockMatches.forEach(block => {
          codeReferences.push({
            type: 'code_block',
            content: block,
            sender: message.sender,
            timestamp: Date.now()
          });
        });
      }
      
      // Look for inline code
      const inlineCodeMatches = message.content.match(/`[^`]+`/g);
      if (inlineCodeMatches) {
        inlineCodeMatches.forEach(code => {
          codeReferences.push({
            type: 'inline_code',
            content: code,
            sender: message.sender,
            timestamp: Date.now()
          });
        });
      }
    });
    
    this.conversationContext.codeReferences = codeReferences;
  }

  updateConversationFlow(messages) {
    const flow = [];
    
    messages.forEach((message, index) => {
      flow.push({
        index: index,
        sender: message.sender,
        type: message.type,
        timestamp: Date.now(),
        hasCode: message.content.includes('```') || message.content.includes('`'),
        intent: message.sender === 'user' ? this.detectMessageIntent(message.content) : null
      });
    });
    
    this.conversationContext.conversationFlow = flow;
  }

  getConversationContext() {
    return this.conversationContext;
  }

  getLastUserIntent() {
    return this.conversationContext.lastUserIntent;
  }

  getRecentTopics() {
    return this.conversationContext.topics.slice(-5); // Last 5 topics
  }

  getCodeReferences() {
    return this.conversationContext.codeReferences;
  }

  getConversationFlow() {
    return this.conversationContext.conversationFlow;
  }
}

module.exports = ChatHistoryExtractor;
