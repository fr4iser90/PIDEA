const IDETypes = require('../ide/IDETypes');

// Simple SmartCompletionDetector without external dependency
class SimpleSmartCompletionDetector {
  async detectCompletion(response, context) {
    return {
      isComplete: response.length > 100,
      isPartial: response.length > 50,
      confidence: response.length > 200 ? 0.9 : 0.5,
      completionType: 'text',
      quality: 'good'
    };
  }
}

// Simple logger without external dependency
const logger = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args)
};


class ChatMessageHandler {
  constructor(browserManager, ideType = IDETypes.CURSOR) {
    this.browserManager = browserManager;
    this.ideType = ideType;
    this.selectors = IDETypes.getChatSelectors(ideType);
    
    if (!this.selectors) {
      logger.warn(`No chat selectors found for IDE type: ${ideType}`);
    }

    // Initialize smart completion detector
    this.smartCompletionDetector = new SimpleSmartCompletionDetector();
  }

  async sendMessage(message, options = {}) {
    try {
      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No IDE page available');
      }

      if (!this.selectors) {
        throw new Error(`No chat selectors available for IDE type: ${this.ideType}`);
      }

      const inputSelector = this.selectors.input;
      await page.focus(inputSelector);
      await page.fill(inputSelector, message);
      await page.keyboard.press('Enter');

      // Wait for AI response if requested
      if (options.waitForResponse !== false) {
        return await this.waitForAIResponse(options);
      }

      return {
        success: true,
        message: 'Message sent successfully',
        ideType: this.ideType,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error(`Error sending message to ${this.ideType}:`, error.message);
      throw error;
    }
  }

  /**
   * Enhanced code block detection with advanced parsing
   * @param {Object} page - Playwright page object
   * @returns {Promise<Array>} Array of detected code blocks
   */
  async detectCodeBlocks(page) {
    try {
      // Pass selectors directly to avoid 'this' reference issues
      const selectors = this.selectors;
      
      return await page.evaluate((selectors) => {
        // Helper functions that work inside page.evaluate
        const detectLanguageFromElement = (languageElement, filenameElement) => {
          if (languageElement) {
            const classList = languageElement.className;
            if (classList.includes('javascript-lang-file-icon')) return 'javascript';
            if (classList.includes('typescript-lang-file-icon')) return 'typescript';
            if (classList.includes('python-lang-file-icon')) return 'python';
            if (classList.includes('java-lang-file-icon')) return 'java';
            if (classList.includes('cpp-lang-file-icon')) return 'cpp';
            if (classList.includes('csharp-lang-file-icon')) return 'csharp';
            if (classList.includes('php-lang-file-icon')) return 'php';
            if (classList.includes('ruby-lang-file-icon')) return 'ruby';
            if (classList.includes('go-lang-file-icon')) return 'go';
            if (classList.includes('rust-lang-file-icon')) return 'rust';
          }
          
          if (filenameElement) {
            const filename = filenameElement.textContent.toLowerCase();
            const extensionMap = {
              '.js': 'javascript',
              '.jsx': 'javascript',
              '.ts': 'typescript',
              '.tsx': 'typescript',
              '.py': 'python',
              '.java': 'java',
              '.cpp': 'cpp',
              '.c': 'c',
              '.cs': 'csharp',
              '.php': 'php',
              '.rb': 'ruby',
              '.go': 'go',
              '.rs': 'rust',
              '.html': 'html',
              '.css': 'css',
              '.scss': 'scss',
              '.json': 'json',
              '.xml': 'xml',
              '.sql': 'sql',
              '.md': 'markdown'
            };
            
            for (const [ext, lang] of Object.entries(extensionMap)) {
              if (filename.includes(ext)) return lang;
            }
          }
          
          return 'text';
        };

        const calculateConfidence = (container, selectors) => {
          let confidence = 0.5; // Base confidence
          
          // Check for Monaco editor (high confidence)
          if (container.querySelector(selectors.monacoEditor)) confidence += 0.3;
          
          // Check for syntax highlighting (medium confidence)
          if (container.querySelector(selectors.syntaxTokens)) confidence += 0.2;
          
          // Check for filename (low confidence)
          if (container.querySelector(selectors.codeBlockFilename)) confidence += 0.1;
          
          // Check for language indicator (medium confidence)
          if (container.querySelector(selectors.codeBlockLanguage)) confidence += 0.15;
          
          return Math.min(confidence, 1.0);
        };

        const validateSyntax = (codeText, language) => {
          // Basic syntax validation patterns
          const patterns = {
            javascript: {
              valid: /^[\s\S]*$/,
              hasErrors: /(SyntaxError|ReferenceError|TypeError|console\.error)/i,
              hasConsole: /console\.(log|warn|error|info)/i
            },
            typescript: {
              valid: /^[\s\S]*$/,
              hasErrors: /(TS\d+|Type.*error|interface|type\s+\w+)/i,
              hasTypes: /(:\s*\w+|interface|type\s+\w+)/i
            },
            python: {
              valid: /^[\s\S]*$/,
              hasErrors: /(SyntaxError|IndentationError|NameError|print\()/i,
              hasPrint: /print\s*\(/i
            },
            java: {
              valid: /^[\s\S]*$/,
              hasErrors: /(public\s+class|import\s+java|System\.out)/i,
              hasMain: /public\s+static\s+void\s+main/i
            }
          };
          
          const pattern = patterns[language] || patterns.javascript;
          return {
            isValid: pattern.valid.test(codeText),
            hasErrors: pattern.hasErrors.test(codeText),
            hasLanguageFeatures: pattern.hasConsole || pattern.hasTypes || pattern.hasPrint || pattern.hasMain,
            confidence: 0.8,
            language: language
          };
        };

        const codeBlocks = [];
        const containers = document.querySelectorAll(selectors.codeBlocks);
        
        // Log found containers
        const containerCount = containers.length;
        
                containers.forEach((container, index) => {
          const content = container.querySelector(selectors.codeBlockContent);
          const header = container.querySelector(selectors.codeBlockHeader);
          const filename = container.querySelector(selectors.codeBlockFilename);
          const language = container.querySelector(selectors.codeBlockLanguage);
          const editor = container.querySelector(selectors.monacoEditor);
          
          // Initialize variables
          let codeLines = null;
          let codeText = '';
          
          // Debug info (will be logged by the outer function)
          const debugInfo = {
            index: index + 1,
            hasContent: !!content,
            hasHeader: !!header,
            hasFilename: !!filename,
            hasLanguage: !!language,
            hasEditor: !!editor,
            codeLinesFound: 0,
            codeTextLength: 0
          };
          
          if (content && editor) {
            // Try multiple selectors for code lines
            let codeLines = editor.querySelectorAll(selectors.codeLines);
            
            // If no lines found, try alternative selectors
            if (codeLines.length === 0) {
              codeLines = editor.querySelectorAll('.view-line');
            }
            if (codeLines.length === 0) {
              codeLines = editor.querySelectorAll('.monaco-editor .view-line');
            }
            if (codeLines.length === 0) {
              codeLines = editor.querySelectorAll('span[class*="mtk"]');
            }
            
            // If still no lines, use the editor content directly
            let codeText;
            if (codeLines.length > 0) {
              // Join tokens and clean up whitespace
              codeText = Array.from(codeLines)
                .map(line => line.textContent || '')
                .join('')
                .replace(/\s+/g, ' ')
                .trim();
              
              // Remove duplicates (common issue with Monaco editor)
              codeText = codeText.replace(/(.+?)\1+/g, '$1');
            } else {
              codeText = (editor.textContent || editor.innerText || '').trim();
            }
            
            // Detect language from DOM elements
            const detectedLanguage = detectLanguageFromElement(language, filename);
            
            // Calculate confidence score
            const confidence = calculateConfidence(container, selectors);
            
            // Validate syntax
            const syntax = validateSyntax(codeText, detectedLanguage);
            
            // Update debug info
            debugInfo.codeLinesFound = codeLines ? codeLines.length : 0;
            debugInfo.codeTextLength = codeText.length;
            
            codeBlocks.push({
              type: 'code_block',
              language: detectedLanguage,
              content: codeText,
              filename: filename?.textContent || null,
              confidence: confidence,
              syntax: syntax,
              hasApplyButton: !!container.querySelector(selectors.codeBlockApplyButton) && 
                container.querySelector(selectors.codeBlockApplyButton).textContent.includes('Apply'),
              lineCount: codeLines ? codeLines.length : 0,
              characterCount: codeText.length
            });
          }
        });
        
        return codeBlocks;
      }, selectors);
      
      // Log the results
      logger.info(`🔍 [ChatMessageHandler] detectCodeBlocks found ${codeBlocks.length} code blocks`);
      
      return codeBlocks;
    } catch (error) {
      logger.error('❌ [ChatMessageHandler] Error detecting code blocks:', error.message);
      return [];
    }
  }



  /**
   * Extract inline code from text content
   * @param {string} content - Text content
   * @returns {Array} Array of inline code blocks
   */
  extractInlineCode(content) {
    const inlineCode = [];
    const inlinePatterns = [
      /`([^`]+)`/g,  // Backticks
      /<code>([^<]+)<\/code>/g,  // HTML code tags
      /\$\{([^}]+)\}/g  // Template literals
    ];
    
    inlinePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        inlineCode.push({
          type: 'inline_code',
          content: match[1],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          pattern: pattern.source
        });
      }
    });
    
    return inlineCode;
  }

  /**
   * Wait for AI response with smart completion detection
   * @param {Object} options - Wait options
   * @returns {Promise<Object>} Response result
   */
  async waitForAIResponse(options = {}) {
    const timeout = options.timeout || 300000; // 5 minutes default
    const checkInterval = options.checkInterval || 2000; // Check every 2 seconds for smart detection
    
    logger.info(`⏳ [ChatMessageHandler] Waiting for AI to finish editing in ${this.ideType} with smart completion detection...`);
    
    const startTime = Date.now();
    let lastMessageCount = 0;
    let stableCount = 0;
    const requiredStableChecks = 10; // Reduced for smart detection
    
    // Smart completion detection context
    const completionContext = {
      userIntent: options.userIntent || '',
      qualityAssessment: null,
      contextValidation: null,
      hasCode: false,
      hasErrors: false,
      response: ''
    };
    
    while (Date.now() - startTime < timeout) {
      try {
        // Get fresh page reference in case it changed
        const page = await this.browserManager.getPage();
        if (!page) {
          logger.error(`No page available for ${this.ideType}`);
          break;
        }
        
        // Count current AI messages using IDE-specific selector
        const currentMessageCount = await page.evaluate((selector) => {
          const aiMessages = document.querySelectorAll(selector);
          return aiMessages.length;
        }, this.selectors.aiMessages);
        
        // Check if message count is stable (no new messages)
        if (currentMessageCount === lastMessageCount) {
          stableCount++;
          logger.info(`📊 [ChatMessageHandler] AI response stable in ${this.ideType}: ${currentMessageCount} messages (${stableCount}/${requiredStableChecks})`);
          
          // Get the latest AI response for smart completion detection
          const latestResponse = await this.extractLatestAIResponse(page);
          completionContext.response = latestResponse;
          
          // Debug logging
          logger.info(`📝 [ChatMessageHandler] Latest AI response length: ${latestResponse?.length || 0}`);
          logger.info(`📝 [ChatMessageHandler] Latest AI response preview: ${latestResponse?.substring(0, 100)}...`);
          
          // Update context with code detection
          const codeBlocks = await this.detectCodeBlocks(page);
          completionContext.hasCode = codeBlocks.length > 0;
          completionContext.hasErrors = codeBlocks.some(block => block.syntax?.hasErrors);
          
          // Use smart completion detection
          const completionDetection = await this.smartCompletionDetector.detectCompletion(
            latestResponse, 
            completionContext
          );
          
          logger.info(`🧠 [ChatMessageHandler] Smart completion detection:`, {
            isComplete: completionDetection.isComplete,
            isPartial: completionDetection.isPartial,
            confidence: completionDetection.confidence,
            completionType: completionDetection.completionType,
            quality: completionDetection.quality
          });
          
          // Check for completion with smart detection
          if (completionDetection.isComplete && completionDetection.confidence >= 0.7) {
            logger.info(`✅ [ChatMessageHandler] Smart completion detected in ${this.ideType}`);
            return {
              success: true,
              response: latestResponse,
              codeBlocks: codeBlocks,
              messageCount: currentMessageCount,
              duration: Date.now() - startTime,
              ideType: this.ideType,
              timestamp: new Date(),
              completionDetection: completionDetection
            };
          }
          
          // Check for stable completion with lower confidence
          if (stableCount >= requiredStableChecks && completionDetection.confidence >= 0.5) {
            logger.info(`✅ [ChatMessageHandler] Stable completion detected in ${this.ideType}`);
            return {
              success: true,
              response: latestResponse,
              codeBlocks: codeBlocks,
              messageCount: currentMessageCount,
              duration: Date.now() - startTime,
              ideType: this.ideType,
              timestamp: new Date(),
              completionDetection: completionDetection,
              stable: true
            };
          }
          
          // Check for partial completion
          if (completionDetection.isPartial) {
            logger.info(`⚠️ [ChatMessageHandler] Partial completion detected in ${this.ideType}:`, completionDetection.suggestions);
          }
          
        } else {
          // Reset stable count if new message detected
          stableCount = 0;
          logger.info(`📝 [ChatMessageHandler] AI still working in ${this.ideType}: ${currentMessageCount} messages`);
        }
        
        lastMessageCount = currentMessageCount;
        
        // Wait before next check
        await page.waitForTimeout(checkInterval);
        
      } catch (error) {
        logger.error(`Error checking AI response in ${this.ideType}:`, error.message);
        
        // If page is closed, try to get a fresh page reference
        if (error.message.includes('Target page, context or browser has been closed')) {
          logger.info(`Page was closed, trying to get fresh page reference...`);
          try {
            await this.browserManager.getPage(); // This will reconnect if needed
            await page.waitForTimeout(1000); // Wait a bit before retrying
          } catch (reconnectError) {
            logger.error(`Failed to reconnect:`, reconnectError.message);
            break;
          }
        }
      }
    }
    
    // Timeout reached - try smart completion detection on partial response
    logger.info(`⏰ [ChatMessageHandler] Timeout reached in ${this.ideType}, checking for partial completion`);
    const partialResponse = await this.extractLatestAIResponse(page);
    const codeBlocks = await this.detectCodeBlocks(page);
    
    completionContext.response = partialResponse;
    completionContext.hasCode = codeBlocks.length > 0;
    completionContext.hasErrors = codeBlocks.some(block => block.syntax?.hasErrors);
    
    const finalCompletionDetection = await this.smartCompletionDetector.detectCompletion(
      partialResponse, 
      completionContext
    );
    
    return {
      success: finalCompletionDetection.isComplete,
      response: partialResponse,
      codeBlocks: codeBlocks,
      error: finalCompletionDetection.isComplete ? null : 'Timeout waiting for AI to finish editing',
      duration: timeout,
      ideType: this.ideType,
      timestamp: new Date(),
      completionDetection: finalCompletionDetection,
      timeout: !finalCompletionDetection.isComplete
    };
  }

  /**
   * Extract the latest AI response from the chat
   * @param {Page} page - Playwright page object
   * @returns {Promise<string>} Latest AI response content
   */
  async extractLatestAIResponse(page) {
    try {
      // Get fresh page reference in case it changed
      const currentPage = await this.browserManager.getPage();
      if (!currentPage) {
        logger.error(`No page available for extracting AI response from ${this.ideType}`);
        return '';
      }
      
      const response = await currentPage.evaluate(() => {
        // Try multiple selectors for AI messages
        const selectors = [
          'span.anysphere-markdown-container-root',
          '.markdown-section',
          '.message-content-animated',
          '.ai-message',
          '.assistant-message'
        ];
        
        for (const selector of selectors) {
          const messages = document.querySelectorAll(selector);
          
          if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            const content = lastMessage.innerText || lastMessage.textContent || '';
            return content;
          }
        }
        
        return '';
      });
      
      logger.info(`📝 [ChatMessageHandler] extractLatestAIResponse returned ${response.length} characters`);
      return response.trim();
    } catch (error) {
      logger.error(`❌ [ChatMessageHandler] Error extracting AI response from ${this.ideType}:`, error.message);
      return '';
    }
  }

  /**
   * Check if chat is active/available
   * @returns {Promise<boolean>} True if chat is active
   */
  async isChatActive() {
    try {
      const page = await this.browserManager.getPage();
      if (!page || !this.selectors) {
        return false;
      }

      await page.waitForSelector(this.selectors.chatContainer, {
        state: 'visible',
        timeout: 1000
      });
      return true;
    } catch {
      return false;
    }
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
}

module.exports = ChatMessageHandler;
