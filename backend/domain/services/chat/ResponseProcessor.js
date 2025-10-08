/**
 * ResponseProcessor - Enhanced AI Response Detection
 * Based on the improved detection logic from automation folder
 * Replaces the old AITextDetector with better completion detection
 */

const ServiceLogger = require('@logging/ServiceLogger');

class ResponseProcessor {
  constructor(selectors) {
    this.selectors = selectors;
    this.logger = new ServiceLogger('ResponseProcessor');
  }

  /**
   * Detect if AI is actively typing/working
   * @param {Object} page - Playwright page object
   * @returns {Promise<boolean>} True if AI is typing
   */
  async detectAITyping(page) {
    try {
      // Check for generating indicator using JSON selector
      
      // Check for typing indicators using JSON selectors
      if (this.selectors && this.selectors.chatSelectors && this.selectors.chatSelectors.loadingIndicator) {
        try {
          const elements = await page.$$(this.selectors.chatSelectors.loadingIndicator);
          if (elements.length > 0) {
            for (const element of elements) {
              const text = await element.textContent();
              const isVisible = await element.isVisible();
              if (isVisible && text && (text.includes('Generating') || text.includes('Typing') || text.includes('Thinking'))) {
                return true;
              }
            }
          }
        } catch (error) {
          // Skip if selector fails
        }
      }
      
      // Check for typing indicators using thinkingIndicator from JSON
      if (this.selectors && this.selectors.chatSelectors && this.selectors.chatSelectors.thinkingIndicator) {
        try {
          const elements = await page.$$(this.selectors.chatSelectors.thinkingIndicator);
          if (elements.length > 0) {
            return true;
          }
        } catch (error) {
          // Skip if selector fails
        }
      }
      
      // Additional check using alternative selectors from JSON
      if (this.selectors && this.selectors.chatSelectors && this.selectors.chatSelectors.loadingIndicator) {
        try {
          const elements = await page.$$(this.selectors.chatSelectors.loadingIndicator);
          if (elements.length > 0) {
            return true;
          }
        } catch (error) {
          // Skip if selector fails
        }
      }
      
      return false;
      
    } catch (error) {
      this.logger.error(`⚠️ Error detecting AI typing: ${error.message}`);
      return false;
    }
  }

  /**
   * Extract AI response using multiple strategies
   * @param {Object} page - Playwright page object
   * @returns {Promise<string>} AI response text
   */
  async extractAIResponse(page) {
    try {
      this.logger.info('🔍 ResponseProcessor.extractAIResponse called');
      this.logger.info('🔍 ResponseProcessor selectors:', {
        hasSelectors: !!this.selectors,
        selectorKeys: this.selectors ? Object.keys(this.selectors) : [],
        hasChatSelectors: !!this.selectors?.chatSelectors,
        chatSelectorKeys: this.selectors?.chatSelectors ? Object.keys(this.selectors.chatSelectors) : [],
        aiMessages: this.selectors?.chatSelectors?.aiMessages,
        messagesContainer: this.selectors?.chatSelectors?.messagesContainer
      });
      
      // Try multiple strategies to find the AI response
      const responseStrategies = [
        // Strategy 1: Direct AI message selectors
        async () => {
          this.logger.info('🔍 Strategy 1: Looking for AI messages with selector:', this.selectors?.chatSelectors?.aiMessages);
          const messages = await page.$$(this.selectors.chatSelectors.aiMessages);
          this.logger.info(`🔍 Strategy 1: Found ${messages.length} AI message elements`);
          if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            const text = await lastMessage.textContent();
            this.logger.info(`🔍 Strategy 1: Last message text length: ${text?.length || 0}`);
            return text; // Let main loop validate
          }
          return null;
        },
        
        // Strategy 2: Look for markdown containers using JSON selector
        async () => {
          // Use the aiMessages selector as it points to the markdown container
          if (this.selectors.chatSelectors.aiMessages) {
            const elements = await page.$$(this.selectors.chatSelectors.aiMessages);
            if (elements.length > 0) {
              const lastElement = elements[elements.length - 1];
              const text = await lastElement.textContent();
              return text; // Let main loop validate
            }
          }
          return null;
        },
        
        // Strategy 3: Look for content using messagesContainer from JSON  
        async () => {
          if (this.selectors.chatSelectors.messagesContainer) {
            const elements = await page.$$(this.selectors.chatSelectors.messagesContainer);
            if (elements.length > 0) {
              const lastElement = elements[elements.length - 1];
              const text = await lastElement.textContent();
              return text; // Let main loop validate
            }
          }
          return null;
        },
        
      ];
      
      // Try each strategy until we find a response
      for (const strategy of responseStrategies) {
        try {
          const response = await strategy();
          if (response && response.trim().length > 0) {
            // Additional validation: check if it's a valid AI response
            if (this.isValidAIResponse(response)) {
              this.logger.info(`✅ Valid AI response found: ${response.length} chars`);
              return response.trim();
            } else {
              this.logger.info(`🚫 Invalid response filtered out: ${response.substring(0, 50)}...`);
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      return null;
      
    } catch (error) {
      this.logger.error(`⚠️ Error extracting AI response: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if extracted text is a valid AI response (not error messages)
   * @param {string} text - Text to validate
   * @returns {boolean} True if valid AI response
   */
  isValidAIResponse(text) {
    if (!text || text.trim().length === 0) {
      return false;
    }

    const trimmed = text.trim().toLowerCase();
    
    // Filter out common error messages and system messages
    // BUT NOT test results like "[FAILED] 0%" which are valid AI responses
    const errorPatterns = [
      'timeout',
      'connection error',
      'network error',
      'extension host unresponsive',
      'extension host has stopped responding',
      'reload window'
    ];
    
    // Check for specific error patterns (not test results)
    for (const pattern of errorPatterns) {
      if (trimmed.includes(pattern)) {
        this.logger.debug(`🚫 Filtered out error message: ${pattern}`);
        return false;
      }
    }
    
    // Don't filter out "failed" if it's part of a test result like "[FAILED] 0%"
    if (trimmed.includes('failed') && !trimmed.includes('[failed]')) {
      this.logger.debug(`🚫 Filtered out error message: failed`);
      return false;
    }
    
    // Valid AI responses should be longer and contain actual content
    if (trimmed.length < 20) {
      return false;
    }
    
    return true;
  }

  /**
   * Detect if AI response is complete
   * @param {Object} page - Playwright page object
   * @param {string} currentText - Current response text
   * @param {number} lastLength - Previous text length
   * @returns {Promise<boolean>} True if response is complete
   */
  async detectResponseComplete(page, currentText, lastLength) {
    try {
      // Check if AI is still typing/working - if yes, not complete
      const isTyping = await this.detectAITyping(page);
      if (isTyping) {
        this.logger.info('⌨️ AI still typing - not complete');
        return false;
      }
      
      // Check for loading indicators - if visible, not complete
      if (this.selectors && this.selectors.chatSelectors && this.selectors.chatSelectors.loadingIndicator) {
        try {
          const elements = await page.$$(this.selectors.chatSelectors.loadingIndicator);
          if (elements.length > 0) {
            for (const element of elements) {
              const isVisible = await element.isVisible();
              if (isVisible) {
                this.logger.info('⏳ Loading indicator visible - not complete');
                return false;
              }
            }
          }
        } catch (error) {
          // Skip if selector fails
        }
      }
      
      // Check for thinking indicators - if visible, not complete
      if (this.selectors && this.selectors.chatSelectors && this.selectors.chatSelectors.thinkingIndicator) {
        try {
          const elements = await page.$$(this.selectors.chatSelectors.thinkingIndicator);
          if (elements.length > 0) {
            for (const element of elements) {
              const isVisible = await element.isVisible();
              if (isVisible) {
                this.logger.info('🤔 Thinking indicator visible - not complete');
                return false;
              }
            }
          }
        } catch (error) {
          // Skip if selector fails
        }
      }
      
      // Check for completion indicators - if visible, response is complete!
      if (this.selectors && this.selectors.chatSelectors && this.selectors.chatSelectors.completionIndicator) {
        try {
          this.logger.info(`🔍 Debug: Checking completion indicator with selector: ${this.selectors.chatSelectors.completionIndicator}`);
          const elements = await page.$$(this.selectors.chatSelectors.completionIndicator);
          this.logger.info(`🔍 Debug: Found ${elements.length} completion indicator elements`);
          
          if (elements.length > 0) {
            for (const element of elements) {
              const isVisible = await element.isVisible();
              const text = await element.textContent();
              this.logger.info(`🔍 Debug: Completion indicator - text: "${text}", visible: ${isVisible}`);
              if (isVisible && text && (text.includes('Review Changes') || text.includes('Review') || text.includes('Apply'))) {
                this.logger.info('✅ Completion indicator visible with correct text - response is complete!');
                return true;
              }
            }
          }
        } catch (error) {
          this.logger.info(`🔍 Debug: Completion indicator selector failed: ${error.message}`);
        }
      }
      
      // Check if text has stopped growing and is substantial
      if (currentText && currentText.length > 100 && currentText.length === lastLength) {
        // First check if this is an error message - don't consider error messages as complete responses
        const trimmed = currentText.trim().toLowerCase();
        const errorPatterns = [
          'reload window',
          'failed',
          'timeout',
          'connection error',
          'network error',
          'error occurred',
          'an error',
          'error:',
          'error -'
        ];
        
        // If text contains error patterns, it's not a valid AI response
        for (const pattern of errorPatterns) {
          if (trimmed.includes(pattern)) {
            this.logger.info(`🚫 Filtered out error message: ${pattern}`);
            return false; // Don't consider error messages as complete
          }
        }
        
        // Additional checks for completion
        const hasCompletionKeywords = ['completed', 'done', 'finished', 'fertig', 'success'].some(keyword => 
          trimmed.includes(keyword)
        );
        
        const hasCodeBlocks = currentText.includes('```');
        const hasSubstantialContent = currentText.length > 200;
        
        // Only consider complete if we have substantial content AND completion indicators
        if (hasSubstantialContent && (hasCompletionKeywords || hasCodeBlocks)) {
          this.logger.info('📝 Text stable and substantial with completion indicators - appears complete');
          return true;
        }
        
        this.logger.info('📝 Text stable but no clear completion indicators - continuing to wait');
        return false; // Not complete yet
      }
      
      return false;
      
    } catch (error) {
      this.logger.error(`⚠️ Error detecting response completion: ${error.message}`);
      return false;
    }
  }

  /**
   * Extract code blocks from AI response using selectors
   * @param {Object} page - Playwright page object
   * @returns {Promise<Array>} Array of code blocks
   */
  async extractCodeBlocks(page) {
    try {
      if (!this.selectors?.chatSelectors?.codeBlocks) {
        return [];
      }

      const codeBlocks = await page.$$(this.selectors.chatSelectors.codeBlocks);
      const blocks = [];

      for (const block of codeBlocks) {
        try {
          // Extract code content
          let codeText = '';
          if (this.selectors.chatSelectors.codeBlockContent) {
            const contentElements = await block.$$(this.selectors.chatSelectors.codeBlockContent);
            if (contentElements.length > 0) {
              codeText = await contentElements[0].textContent();
            } else {
              codeText = await block.textContent();
            }
          } else {
            codeText = await block.textContent();
          }

          // Extract language if available
          let language = null;
          if (this.selectors.chatSelectors.codeBlockLanguage) {
            try {
              const langElements = await block.$$(this.selectors.chatSelectors.codeBlockLanguage);
              if (langElements.length > 0) {
                const langElement = langElements[0];
                const className = await langElement.getAttribute('class');
                language = className ? className.match(/javascript|python|java|typescript|json|html|css|sql|bash|sh/i)?.[0] : null;
              }
            } catch (error) {
              // Skip language detection if it fails
            }
          }

          if (codeText && codeText.trim()) {
            blocks.push({
              content: codeText.trim(),
              language: language || 'text',
              type: 'codeBlock'
            });
          }
        } catch (error) {
          // Skip individual block if it fails
          continue;
        }
      }

      return blocks;
    } catch (error) {
      this.logger.error(`⚠️ Error extracting code blocks: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract terminal/command blocks from AI response
   * @param {Object} page - Playwright page object
   * @returns {Promise<Array>} Array of terminal blocks
   */
  async extractTerminalBlocks(page) {
    try {
      const selectors = [
        this.selectors?.terminalBlocks,
        'pre[class*="bash"]',
        'pre[class*="shell"]',
        'pre[class*="terminal"]'
      ].filter(Boolean);

      const terminalBlocks = [];
      
      for (const selector of selectors) {
        try {
          const elements = await page.$$(selector);
          for (const element of elements) {
            const content = await element.textContent();
            if (content && content.trim()) {
              terminalBlocks.push({
                content: content.trim(),
                type: 'terminal'
              });
            }
          }
        } catch (error) {
          continue;
        }
      }

      return terminalBlocks;
    } catch (error) {
      this.logger.error(`⚠️ Error extracting terminal blocks: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract file references from AI response
   * @param {Object} page - Playwright page object
   * @returns {Promise<Array>} Array of file references
   */
  async extractFileReferences(page) {
    try {
      const selectors = [
        this.selectors?.fileReferences,
        'span[title*="."]',
        'a[href*="."]'
      ].filter(Boolean);

      const fileRefs = [];
      
      for (const selector of selectors) {
        try {
          const elements = await page.$$(selector);
          for (const element of elements) {
            const content = await element.textContent();
            const title = await element.getAttribute('title');
            const href = await element.getAttribute('href');
            
            if (content && content.includes('.')) {
              fileRefs.push({
                content: content.trim(),
                title: title || '',
                href: href || '',
                type: 'file'
              });
            }
          }
        } catch (error) {
          continue;
        }
      }

      return fileRefs;
    } catch (error) {
      this.logger.error(`⚠️ Error extracting file references: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract URLs from AI response
   * @param {Object} page - Playwright page object
   * @returns {Promise<Array>} Array of URLs
   */
  async extractUrls(page) {
    try {
      const selectors = [
        this.selectors?.urls,
        'a[href^="http"]',
        'a[href^="https"]',
        'a[href^="ftp"]'
      ].filter(Boolean);

      const urls = [];
      
      for (const selector of selectors) {
        try {
          const elements = await page.$$(selector);
          for (const element of elements) {
            const href = await element.getAttribute('href');
            const text = await element.textContent();
            
            if (href && (href.startsWith('http') || href.startsWith('ftp'))) {
              urls.push({
                url: href,
                text: text || href,
                type: 'url'
              });
            }
          }
        } catch (error) {
          continue;
        }
      }

      return urls;
    } catch (error) {
      this.logger.error(`⚠️ Error extracting URLs: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract structured data blocks (JSON, CSS, SQL, etc.)
   * @param {Object} page - Playwright page object
   * @returns {Promise<Object>} Object with different data types
   */
  async extractStructuredData(page) {
    try {
      const dataTypes = {
        json: [],
        css: [],
        sql: [],
        yaml: [],
        dockerfile: [],
        env: []
      };

      const typeSelectors = {
        json: [this.selectors?.jsonBlocks, 'pre[class*="json"]', 'code[class*="json"]'],
        css: [this.selectors?.cssBlocks, 'pre[class*="css"]', 'code[class*="css"]'],
        sql: [this.selectors?.sqlBlocks, 'pre[class*="sql"]', 'code[class*="sql"]'],
        yaml: [this.selectors?.yamlBlocks, 'pre[class*="yaml"]', 'code[class*="yaml"]'],
        dockerfile: [this.selectors?.dockerBlocks, 'pre[class*="dockerfile"]', 'code[class*="dockerfile"]'],
        env: [this.selectors?.envBlocks, 'pre[class*="env"]', 'code[class*="env"]']
      };

      for (const [type, selectors] of Object.entries(typeSelectors)) {
        const filteredSelectors = selectors.filter(Boolean);
        
        for (const selector of filteredSelectors) {
          try {
            const elements = await page.$$(selector);
            for (const element of elements) {
              const content = await element.textContent();
              if (content && content.trim()) {
                dataTypes[type].push({
                  content: content.trim(),
                  type: type
                });
              }
            }
          } catch (error) {
            continue;
          }
        }
      }

      return dataTypes;
    } catch (error) {
      this.logger.error(`⚠️ Error extracting structured data: ${error.message}`);
      return { json: [], css: [], sql: [], yaml: [], dockerfile: [], env: [] };
    }
  }

  /**
   * Extract lists and tables from AI response
   * @param {Object} page - Playwright page object
   * @returns {Promise<Object>} Object with lists and tables
   */
  async extractListsAndTables(page) {
    try {
      const lists = [];
      const tables = [];

      // Extract lists
      const listSelectors = [
        this.selectors?.lists,
        'ul', 'ol', 'li'
      ].filter(Boolean);

      for (const selector of listSelectors) {
        try {
          const elements = await page.$$(selector);
          for (const element of elements) {
            const content = await element.textContent();
            if (content && content.trim()) {
              lists.push({
                content: content.trim(),
                tagName: await element.evaluate(el => el.tagName),
                type: 'list'
              });
            }
          }
        } catch (error) {
          continue;
        }
      }

      // Extract tables
      const tableSelectors = [
        this.selectors?.tables,
        'table', 'tr', 'td', 'th'
      ].filter(Boolean);

      for (const selector of tableSelectors) {
        try {
          const elements = await page.$$(selector);
          for (const element of elements) {
            const content = await element.textContent();
            if (content && content.trim()) {
              tables.push({
                content: content.trim(),
                tagName: await element.evaluate(el => el.tagName),
                type: 'table'
              });
            }
          }
        } catch (error) {
          continue;
        }
      }

      return { lists, tables };
    } catch (error) {
      this.logger.error(`⚠️ Error extracting lists and tables: ${error.message}`);
      return { lists: [], tables: [] };
    }
  }

  /**
   * Extract inline code from AI response using selectors
   * @param {Object} page - Playwright page object
   * @returns {Promise<Array>} Array of inline code elements
   */
  async extractInlineCode(page) {
    try {
      const selectors = [
        this.selectors?.inlineCode,
        this.selectors?.codeSpans
      ].filter(Boolean);

      if (selectors.length === 0) {
        return [];
      }

      const inlineCodeBlocks = [];
      
      for (const selector of selectors) {
        try {
          const elements = await page.$$(selector);
          
          for (const element of elements) {
            try {
              const codeText = await element.textContent();
              if (codeText && codeText.trim()) {
                inlineCodeBlocks.push({
                  content: codeText.trim(),
                  type: 'inlineCode'
                });
              }
            } catch (error) {
              // Skip individual element if it fails
              continue;
            }
          }
        } catch (error) {
          // Skip selector if it fails
          continue;
        }
      }

      // Remove duplicates based on content
      const uniqueInlineCode = inlineCodeBlocks.filter((item, index, array) => 
        array.findIndex(other => other.content === item.content) === index
      );

      return uniqueInlineCode;
    } catch (error) {
      this.logger.error(`⚠️ Error extracting inline code: ${error.message}`);
      return [];
    }
  }

  /**
   * Wait for AI response with enhanced detection
   * @param {Object} page - Playwright page object
   * @param {Object} options - Options for waiting
   * @returns {Promise<Object>} AI response result
   */
  async waitForAIResponse(page, options = {}) {
    const {
      timeout = 300000, // 5 minutes default
      checkInterval = 2000, // Check every 2 seconds
      maxStableChecks = 50 // Much more conservative than old 3!
    } = options;
    
    this.logger.info('⏳ Waiting for AI response to start...');
    
    let stableCheckCount = 0;
    const startTime = Date.now();
    
    // Wait for response to start appearing
    await page.waitForTimeout(3000);
    
    // Wait for response to complete
    let responseText = '';
    let lastLength = 0;
    
    while (Date.now() - startTime < timeout) {
      try {
        // Get the latest response text using enhanced extraction
        const currentText = await this.extractAIResponse(page);
        
        if (currentText && currentText.length > lastLength) {
          responseText = currentText;
          lastLength = currentText.length;
          stableCheckCount = 0; // Reset stable count when text grows
          this.logger.info(`📝 Response growing: ${currentText.length} characters`);
        } else if (currentText && currentText.length === lastLength && currentText.length > 0) {
          stableCheckCount++;
          this.logger.info(`⏸️ Response stable (${stableCheckCount}/${maxStableChecks})`);
          
          // Check for code blocks during stable checks
          try {
            const codeBlocks = await this.extractCodeBlocks(page);
            if (codeBlocks.length > 0) {
              this.logger.info(`📦 Found ${codeBlocks.length} code blocks during stable check`);
              
              // Only reset stable count if code blocks are actually growing
              if (!this.lastCodeBlockCount || codeBlocks.length > this.lastCodeBlockCount) {
                this.logger.info(`📦 Code blocks growing (${this.lastCodeBlockCount || 0} → ${codeBlocks.length}) - AI still working!`);
                stableCheckCount = 0; // Reset stable count - AI is still working!
                this.lastCodeBlockCount = codeBlocks.length;
              } else {
                this.logger.info(`📦 Code blocks stable at ${codeBlocks.length} - not resetting stable count`);
                this.lastCodeBlockCount = codeBlocks.length;
              }
            }
          } catch (error) {
            this.logger.info(`📦 Code block detection failed: ${error.message}`);
          }
          
          // Only check for completion AFTER we have enough stable checks
          if (stableCheckCount >= 3) { // Require at least 3 stable checks
            const isComplete = await this.detectResponseComplete(page, currentText, lastLength);
            
            if (isComplete) {
              this.logger.info('✅ Response appears to be complete after stable checks');
              break;
            }
          }
          
          // Force continue after max stable checks
          if (stableCheckCount >= maxStableChecks) {
            this.logger.info(`⏰ Max stable checks reached (${maxStableChecks}), forcing continuation`);
            break;
          }
        } else if (!currentText) {
          // No response found yet, wait a bit longer
        }
        
        // Only then check for typing indicators
        const isTyping = await this.detectAITyping(page);
        
        if (isTyping) {
          this.logger.info('⌨️ AI is actively typing...');
          stableCheckCount = 0; // Reset stable count when typing
          await page.waitForTimeout(2000);
          continue;
        }
        
        await page.waitForTimeout(checkInterval);
        
      } catch (error) {
        this.logger.error(`⚠️ Error while waiting for response: ${error.message}`);
        await page.waitForTimeout(2000);
      }
    }
    
    if (responseText.length === 0) {
      this.logger.warn('⚠️ No response received');
      return {
        success: false,
        response: '',
        duration: Date.now() - startTime,
        stable: false,
        codeBlocks: [],
        inlineCode: []
      };
    } else {
      this.logger.info(`📥 Received response (${responseText.length} characters)`);
    }

    // Extract and log ALL elements
    let codeBlocks = [];
    let inlineCode = [];
    let terminalBlocks = [];
    let fileReferences = [];
    let urls = [];
    let structuredData = {};
    let listsAndTables = {};
    
    try {
      // Extract code blocks
      codeBlocks = await this.extractCodeBlocks(page);
      if (codeBlocks.length > 0) {
        this.logger.info(`📝 Found ${codeBlocks.length} code blocks:`);
        codeBlocks.forEach((block, index) => {
          this.logger.info(`📦 Code Block ${index + 1} (${block.language}):`);
          this.logger.info(`📄 ${block.content.substring(0, 100)}${block.content.length > 100 ? '...' : ''}`);
        });
      } else {
        this.logger.info('⚪ No code blocks found');
      }

      // Extract inline code
      inlineCode = await this.extractInlineCode(page);
      if (inlineCode.length > 0) {
        this.logger.info(`💬 Found ${inlineCode.length} inline code elements:`);
        inlineCode.forEach((code, index) => {
          this.logger.info(`📄 Inline Code ${index + 1}: \`${code.content}\``);
        });
      } else {
        this.logger.info('⚪ No inline code found');
      }

      // Extract terminal blocks
      terminalBlocks = await this.extractTerminalBlocks(page);
      if (terminalBlocks.length > 0) {
        this.logger.info(`🖥️ Found ${terminalBlocks.length} terminal blocks:`);
        terminalBlocks.forEach((block, index) => {
          this.logger.info(`💻 Terminal ${index + 1}: ${block.content.substring(0, 100)}${block.content.length > 100 ? '...' : ''}`);
        });
      } else {
        this.logger.info('⚪ No terminal blocks found');
      }

      // Extract file references
      fileReferences = await this.extractFileReferences(page);
      if (fileReferences.length > 0) {
        this.logger.info(`📁 Found ${fileReferences.length} file references:`);
        fileReferences.forEach((file, index) => {
          this.logger.info(`📄 File ${index + 1}: ${file.content}`);
        });
      } else {
        this.logger.info('⚪ No file references found');
      }

      // Extract URLs
      urls = await this.extractUrls(page);
      if (urls.length > 0) {
        this.logger.info(`🔗 Found ${urls.length} URLs:`);
        urls.forEach((url, index) => {
          this.logger.info(`🌐 URL ${index + 1}: ${url.url}`);
        });
      } else {
        this.logger.info('⚪ No URLs found');
      }

      // Extract structured data
      structuredData = await this.extractStructuredData(page);
      const totalStructured = Object.values(structuredData).flat().length;
      if (totalStructured > 0) {
        this.logger.info(`📊 Found ${totalStructured} structured data blocks:`);
        Object.entries(structuredData).forEach(([type, blocks]) => {
          if (blocks.length > 0) {
            this.logger.info(`📋 ${type.toUpperCase()}: ${blocks.length} blocks`);
          }
        });
      } else {
        this.logger.info('⚪ No structured data found');
      }

      // Extract lists and tables
      listsAndTables = await this.extractListsAndTables(page);
      const totalLists = listsAndTables.lists.length;
      const totalTables = listsAndTables.tables.length;
      if (totalLists > 0 || totalTables > 0) {
        this.logger.info(`📋 Found ${totalLists} lists and ${totalTables} tables`);
      } else {
        this.logger.info('⚪ No lists or tables found');
      }

    } catch (error) {
      this.logger.error(`⚠️ Error extracting elements: ${error.message}`);
    }
    
    return {
      success: responseText.length > 0,
      response: responseText,
      duration: Date.now() - startTime,
      stable: stableCheckCount >= maxStableChecks,
      codeBlocks: codeBlocks,
      inlineCode: inlineCode,
      terminalBlocks: terminalBlocks,
      fileReferences: fileReferences,
      urls: urls,
      structuredData: structuredData,
      listsAndTables: listsAndTables
    };
  }
}

module.exports = ResponseProcessor;
