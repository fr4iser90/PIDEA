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
      // Check for the specific "Generating" indicator
      const generatingElements = await page.$$('span:has-text("Generating")');
      if (generatingElements.length > 0) {
        return true;
      }
      
      // Check for various typing indicators (more specific)
      const typingSelectors = [
        '.typing-indicator',
        '.ai-typing',
        '.generating',
        '.thinking',
        '[data-typing="true"]'
      ];
      
      for (const selector of typingSelectors) {
        try {
          const elements = await page.$$(selector);
          if (elements.length > 0) {
            // Double-check that the element is actually visible and contains typing text
            for (const element of elements) {
              const text = await element.textContent();
              const isVisible = await element.isVisible();
              if (isVisible && text && (text.includes('Generating') || text.includes('Typing') || text.includes('Thinking'))) {
                return true;
              }
            }
          }
        } catch (error) {
          // Skip invalid selectors
          continue;
        }
      }
      
      // Check for cursor blinking in response areas (only if visible)
      const cursorBlinkSelectors = [
        '.cursor-blink',
        '.typing-cursor',
        '.response-cursor'
      ];
      
      for (const selector of cursorBlinkSelectors) {
        try {
          const elements = await page.$$(selector);
          if (elements.length > 0) {
            return true;
          }
        } catch (error) {
          continue;
        }
      }
      
      // Check for streaming text indicators (only if visible)
      const streamingSelectors = [
        '.streaming-text',
        '.live-response',
        '.real-time-response'
      ];
      
      for (const selector of streamingSelectors) {
        try {
          const elements = await page.$$(selector);
          if (elements.length > 0) {
            return true;
          }
        } catch (error) {
          continue;
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
      // Try multiple strategies to find the AI response
      const responseStrategies = [
        // Strategy 1: Direct AI message selectors
        async () => {
          const messages = await page.$$(this.selectors.aiMessages);
          if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            return await lastMessage.textContent();
          }
          return null;
        },
        
        // Strategy 2: Look for markdown containers
        async () => {
          const markdownSelectors = [
            'span.anysphere-markdown-container-root',
            '.markdown-content',
            '.response-markdown',
            '[data-markdown="true"]'
          ];
          
          for (const selector of markdownSelectors) {
            const elements = await page.$$(selector);
            if (elements.length > 0) {
              const lastElement = elements[elements.length - 1];
              return await lastElement.textContent();
            }
          }
          return null;
        },
        
        // Strategy 3: Look for any response-like content
        async () => {
          const responseSelectors = [
            '.ai-response',
            '.assistant-message',
            '.response-message',
            '.message.assistant',
            '.chat-response'
          ];
          
          for (const selector of responseSelectors) {
            const elements = await page.$$(selector);
            if (elements.length > 0) {
              const lastElement = elements[elements.length - 1];
              return await lastElement.textContent();
            }
          }
          return null;
        },
        
        // Strategy 4: Look for content in the last message container
        async () => {
          const messageContainers = await page.$$(this.selectors.messagesContainer);
          if (messageContainers.length > 0) {
            const lastContainer = messageContainers[messageContainers.length - 1];
            return await lastContainer.textContent();
          }
          return null;
        },
        
        // Strategy 5: Look for any substantial text content that's not user input
        async () => {
          const allTextElements = await page.$$('p, div, span');
          let bestCandidate = null;
          let maxLength = 0;
          
          for (const element of allTextElements) {
            const text = await element.textContent();
            if (text && text.length > 200 && text.length > maxLength) {
              // Check if it looks like an AI response (not user input)
              const lowerText = text.toLowerCase();
              if (!lowerText.includes('user:') && !lowerText.includes('me:') && 
                  !lowerText.includes('input:') && !lowerText.includes('prompt:')) {
                bestCandidate = text;
                maxLength = text.length;
              }
            }
          }
          
          return bestCandidate;
        }
      ];
      
      // Try each strategy until we find a response
      for (const strategy of responseStrategies) {
        try {
          const response = await strategy();
          if (response && response.trim().length > 0) {
            return response.trim();
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
   * Detect if AI response is complete
   * @param {Object} page - Playwright page object
   * @param {string} currentText - Current response text
   * @param {number} lastLength - Previous text length
   * @returns {Promise<boolean>} True if response is complete
   */
  async detectResponseComplete(page, currentText, lastLength) {
    try {
      // Check for "X files edited" completion indicator
      const fileEditSelectors = [
        'span:has-text("file edited")',
        'span:has-text("files edited")',
        'div:has-text("file edited")',
        'div:has-text("files edited")'
      ];
      
      for (const selector of fileEditSelectors) {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          for (const element of elements) {
            const isVisible = await element.isVisible();
            if (isVisible) {
              const text = await element.textContent();
              if (text && (text.includes('file edited') || text.includes('files edited'))) {
                this.logger.info(`🔍 Detected file edit completion: "${text}"`);
                return true;
              }
            }
          }
        }
      }
      
      // Check for "Running terminal command" - means AI is still working
      const runningSelectors = [
        'span:has-text("Running terminal command")',
        'div:has-text("Running terminal command")',
        'span:has-text("Generating")',
        'div:has-text("Generating")'
      ];
      
      for (const selector of runningSelectors) {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          for (const element of elements) {
            const isVisible = await element.isVisible();
            if (isVisible) {
              const text = await element.textContent();
              if (text && (text.includes('Running terminal command') || text.includes('Generating'))) {
                this.logger.info(`🔍 AI still working: "${text}"`);
                return false; // Not complete yet
              }
            }
          }
        }
      }
      
      // Check for completion indicators
      const completionSelectors = [
        '.response-complete',
        '[data-complete="true"]',
        '.finished-response',
        '.response-done'
      ];
      
      for (const selector of completionSelectors) {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          return true;
        }
      }
      
      // Check if text has stopped growing and is substantial
      if (currentText && currentText.length > 100 && currentText.length === lastLength) {
        // Additional check: look for common response endings
        const responseEndings = [
          '```',
          '**Summary:**',
          '**Next Steps:**',
          '**Status:**',
          'completed',
          'finished',
          'done'
        ];
        
        const lowerText = currentText.toLowerCase();
        for (const ending of responseEndings) {
          if (lowerText.includes(ending.toLowerCase())) {
            return true;
          }
        }
      }
      
      return false;
      
    } catch (error) {
      this.logger.error(`⚠️ Error detecting response completion: ${error.message}`);
      return false;
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
    
    this.logger.info('⏳ [ResponseProcessor] Waiting for AI response to start...');
    
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
          this.logger.info(`📝 [ResponseProcessor] Response growing: ${currentText.length} characters`);
        } else if (currentText && currentText.length === lastLength && currentText.length > 0) {
          stableCheckCount++;
          this.logger.info(`⏸️ [ResponseProcessor] Response stable (${stableCheckCount}/${maxStableChecks})`);
          
          // Force continue after max stable checks
          if (stableCheckCount >= maxStableChecks) {
            this.logger.info(`⏰ [ResponseProcessor] Max stable checks reached (${maxStableChecks}), forcing continuation`);
            break;
          }
        } else if (!currentText) {
          // No response found yet, wait a bit longer
        }
        
        // Check if response appears to be complete FIRST (PRIORITY!)
        const isComplete = await this.detectResponseComplete(page, currentText, lastLength);
        
        // Break if completion is detected (files edited, etc.)
        if (isComplete) {
          this.logger.info('✅ [ResponseProcessor] Response appears to be complete');
          break;
        }
        
        // Only then check for typing indicators
        const isTyping = await this.detectAITyping(page);
        
        if (isTyping) {
          this.logger.info('⌨️ [ResponseProcessor] AI is actively typing...');
          stableCheckCount = 0; // Reset stable count when typing
          await page.waitForTimeout(2000);
          continue;
        }
        
        await page.waitForTimeout(checkInterval);
        
      } catch (error) {
        this.logger.error(`⚠️ [ResponseProcessor] Error while waiting for response: ${error.message}`);
        await page.waitForTimeout(2000);
      }
    }
    
    if (responseText.length === 0) {
      this.logger.warn('⚠️ [ResponseProcessor] No response received');
    } else {
      this.logger.info(`📥 [ResponseProcessor] Received response (${responseText.length} characters)`);
    }
    
    return {
      success: responseText.length > 0,
      response: responseText,
      duration: Date.now() - startTime,
      stable: stableCheckCount >= maxStableChecks
    };
  }
}

module.exports = ResponseProcessor;
