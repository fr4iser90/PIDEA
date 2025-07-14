const IDETypes = require('../ide/IDETypes');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');


class ChatMessageHandler {
  constructor(browserManager, ideType = IDETypes.CURSOR) {
    this.browserManager = browserManager;
    this.ideType = ideType;
    this.selectors = IDETypes.getChatSelectors(ideType);
    
    if (!this.selectors) {
      logger.warn(`No chat selectors found for IDE type: ${ideType}`);
    }
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
   * Wait for AI response and detect completion
   * @param {Object} options - Wait options
   * @returns {Promise<Object>} Response result
   */
  async waitForAIResponse(options = {}) {
    const timeout = options.timeout || 300000; // 5 minutes default
    const checkInterval = options.checkInterval || 5000; // Check every 5 seconds
    
    logger.info(`⏳ [ChatMessageHandler] Waiting for AI to finish editing in ${this.ideType}...`);
    
    const startTime = Date.now();
    let lastMessageCount = 0;
    let stableCount = 0;
    const requiredStableChecks = 15; // Wait for 15 stable checks (75 seconds)
    
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
          
          if (stableCount >= requiredStableChecks) {
            // Get the latest AI response
            const latestResponse = await this.extractLatestAIResponse(page);
            
            logger.info(`✅ [ChatMessageHandler] AI finished editing in ${this.ideType}`);
            return {
              success: true,
              response: latestResponse,
              messageCount: currentMessageCount,
              duration: Date.now() - startTime,
              ideType: this.ideType,
              timestamp: new Date()
            };
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
    
    // Timeout reached
    logger.info(`⏰ [ChatMessageHandler] Timeout reached in ${this.ideType}, extracting partial response`);
    const partialResponse = await this.extractLatestAIResponse(page);
    
    return {
      success: false,
      response: partialResponse,
      error: 'Timeout waiting for AI to finish editing',
      duration: timeout,
      ideType: this.ideType,
      timestamp: new Date()
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
      
      const response = await currentPage.evaluate((selector) => {
        const aiMessages = document.querySelectorAll(selector);
        if (aiMessages.length === 0) {
          return '';
        }
        
        // Get the last AI message
        const lastMessage = aiMessages[aiMessages.length - 1];
        return lastMessage.innerText || lastMessage.textContent || '';
      }, this.selectors.aiMessages);
      
      return response.trim();
    } catch (error) {
      logger.error(`Error extracting AI response from ${this.ideType}:`, error.message);
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
