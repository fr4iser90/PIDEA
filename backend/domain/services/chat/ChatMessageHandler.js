class ChatMessageHandler {
  constructor(browserManager) {
    this.browserManager = browserManager;
  }

  async sendMessage(message, options = {}) {
    try {
      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No Cursor IDE page available');
      }

      const inputSelector = '.aislash-editor-input[contenteditable="true"]';
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
        timestamp: new Date()
      };
    } catch (error) {
      console.error('[ChatMessageHandler] Error sending message:', error.message);
      throw error;
    }
  }

  /**
   * Wait for AI response and detect completion
   * @param {Object} options - Wait options
   * @returns {Promise<Object>} Response result
   */
  async waitForAIResponse(options = {}) {
    const page = await this.browserManager.getPage();
    const timeout = options.timeout || 300000; // 5 minutes default (increased from 2)
    const checkInterval = options.checkInterval || 3000; // Check every 3 seconds (increased from 2)
    
    console.log('⏳ [ChatMessageHandler] Waiting for AI to finish editing...');
    
    const startTime = Date.now();
    let lastMessageCount = 0;
    let stableCount = 0;
    const requiredStableChecks = 15; // Wait for 5 stable checks (15 seconds) - increased from 3
    
    while (Date.now() - startTime < timeout) {
      try {
        // Count current AI messages
        const currentMessageCount = await page.evaluate(() => {
          const aiMessages = document.querySelectorAll('span.anysphere-markdown-container-root');
          return aiMessages.length;
        });
        
        // Check if message count is stable (no new messages)
        if (currentMessageCount === lastMessageCount) {
          stableCount++;
          console.log(`📊 [ChatMessageHandler] AI response stable: ${currentMessageCount} messages (${stableCount}/${requiredStableChecks})`);
          
          if (stableCount >= requiredStableChecks) {
            // Get the latest AI response
            const latestResponse = await this.extractLatestAIResponse(page);
            
            console.log('✅ [ChatMessageHandler] AI finished editing codebase');
            return {
              success: true,
              response: latestResponse,
              messageCount: currentMessageCount,
              duration: Date.now() - startTime,
              timestamp: new Date()
            };
          }
        } else {
          // Reset stable count if new message detected
          stableCount = 0;
          console.log(`📝 [ChatMessageHandler] AI still working: ${currentMessageCount} messages`);
        }
        
        lastMessageCount = currentMessageCount;
        
        // Wait before next check
        await page.waitForTimeout(checkInterval);
        
      } catch (error) {
        console.error('[ChatMessageHandler] Error checking AI response:', error.message);
        // Continue waiting despite error
      }
    }
    
    // Timeout reached
    console.log('⏰ [ChatMessageHandler] Timeout reached, extracting partial response');
    const partialResponse = await this.extractLatestAIResponse(page);
    
    return {
      success: false,
      response: partialResponse,
      error: 'Timeout waiting for AI to finish editing',
      duration: timeout,
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
      const response = await page.evaluate(() => {
        const aiMessages = document.querySelectorAll('span.anysphere-markdown-container-root');
        if (aiMessages.length === 0) {
          return '';
        }
        
        // Get the last AI message
        const lastMessage = aiMessages[aiMessages.length - 1];
        return lastMessage.innerText || lastMessage.textContent || '';
      });
      
      return response.trim();
    } catch (error) {
      console.error('[ChatMessageHandler] Error extracting AI response:', error.message);
      return '';
    }
  }
}

module.exports = ChatMessageHandler;
