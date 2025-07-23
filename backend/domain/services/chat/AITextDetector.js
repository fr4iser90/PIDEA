/**
 * AITextDetector - Dedicated service for AI text detection and analysis
 * Handles AI response extraction, completion detection, and text analysis
 */
class AITextDetector {
  constructor(selectors) {
    this.selectors = selectors;
    this.logger = console; // Simple logger
  }

  /**
   * Extract latest AI response from DOM
   * @param {Object} page - Playwright page object
   * @returns {Promise<string>} Latest AI response text
   */
  async extractLatestAIResponse(page) {
    try {
      this.logger.info('🔍 [AITextDetector] Extracting latest AI response');
      
      return await page.evaluate((selectors) => {
        // Find all AI messages
        const aiMessages = document.querySelectorAll(selectors.aiMessages);
        
        if (aiMessages.length === 0) {
          return '';
        }
        
        // Get the latest AI message (last in DOM)
        const latestMessage = aiMessages[aiMessages.length - 1];
        
        // Extract text content
        let textContent = '';
        
        // Try different content extraction methods
        if (latestMessage.querySelector('.anysphere-markdown-container-root')) {
          // Cursor IDE markdown container
          const markdownContainer = latestMessage.querySelector('.anysphere-markdown-container-root');
          textContent = markdownContainer.textContent || markdownContainer.innerText || '';
        } else if (latestMessage.querySelector('.rendered-markdown')) {
          // VSCode markdown container
          const markdownContainer = latestMessage.querySelector('.rendered-markdown');
          textContent = markdownContainer.textContent || markdownContainer.innerText || '';
        } else {
          // Fallback to direct text content
          textContent = latestMessage.textContent || latestMessage.innerText || '';
        }
        
        // Clean up the text
        textContent = textContent
          .replace(/\s+/g, ' ')  // Normalize whitespace
          .replace(/\n\s*\n/g, '\n')  // Remove empty lines
          .trim();
        
        return textContent;
      }, this.selectors);
      
    } catch (error) {
      this.logger.error('❌ [AITextDetector] Error extracting AI response:', error.message);
      return '';
    }
  }

  /**
   * Detect if AI response is complete
   * @param {string} response - AI response text
   * @param {Object} context - Context information
   * @returns {Object} Completion detection result
   */
  detectCompletion(response, context = {}) {
    const analysis = {
      isComplete: false,
      isPartial: false,
      confidence: 0,
      completionType: 'unknown',
      quality: 'unknown',
      suggestions: []
    };
    
    if (!response || response.length === 0) {
      return analysis;
    }
    
    // Check for explicit completion indicators
    const completionPatterns = [
      /^(here|this|that)'s (the|a|an) /i,
      /^(i hope|hope this|this should|this will) help/i,
      /^(let me know|feel free|don't hesitate) if/i,
      /^(is there|do you have) (any|other) (questions|concerns)/i,
      /^(that's|that is) (all|it|everything)/i,
      /^(the|a|an) (solution|answer|implementation|code) (is|follows|below)/i
    ];
    
    // Check for partial completion indicators
    const partialPatterns = [
      /\?$/m,  // Ends with question
      /^(but|however|although|though)/i,  // Starts with conjunction
      /^(i think|maybe|perhaps|possibly)/i,  // Uncertain language
      /^(you might|you could|you should)/i,  // Suggestions
      /^(let me|i'll|i will) (check|verify|test)/i  // Action promises
    ];
    
    // Check for incomplete patterns
    const incompletePatterns = [
      /\.\.\.$/,  // Ends with ellipsis
      /^(TODO|FIXME|NOTE):/im,  // TODO items
      /^(next|then|after|finally):/i,  // Next steps
      /^(to be continued|more to come)/i  // Explicit continuation
    ];
    
    // Calculate completion score
    let score = 0;
    let completionType = 'text';
    
    // Base score from length
    if (response.length > 200) score += 0.3;
    if (response.length > 500) score += 0.2;
    if (response.length > 1000) score += 0.2;
    
    // Check for code blocks
    if (response.includes('```')) {
      score += 0.2;
      completionType = 'code';
    }
    
    // Check for completion patterns
    const hasCompletionPattern = completionPatterns.some(pattern => pattern.test(response));
    if (hasCompletionPattern) {
      score += 0.3;
      analysis.suggestions.push('explicit_completion_phrase');
    }
    
    // Check for partial patterns
    const hasPartialPattern = partialPatterns.some(pattern => pattern.test(response));
    if (hasPartialPattern) {
      score -= 0.2;
      analysis.suggestions.push('partial_completion_phrase');
    }
    
    // Check for incomplete patterns
    const hasIncompletePattern = incompletePatterns.some(pattern => pattern.test(response));
    if (hasIncompletePattern) {
      score -= 0.3;
      analysis.suggestions.push('incomplete_indicator');
    }
    
    // Check for code quality indicators
    if (context.hasCode) {
      if (response.includes('function') || response.includes('class')) {
        score += 0.1;
      }
      if (response.includes('return') || response.includes('export')) {
        score += 0.1;
      }
    }
    
    // Determine completion status
    analysis.confidence = Math.max(0, Math.min(1, score));
    analysis.completionType = completionType;
    
    if (analysis.confidence >= 0.7) {
      analysis.isComplete = true;
      analysis.quality = 'high';
    } else if (analysis.confidence >= 0.4) {
      analysis.isPartial = true;
      analysis.quality = 'medium';
    } else {
      analysis.quality = 'low';
    }
    
    return analysis;
  }

  /**
   * Analyze AI response quality
   * @param {string} response - AI response text
   * @returns {Object} Quality analysis
   */
  analyzeResponseQuality(response) {
    const analysis = {
      score: 0,
      factors: [],
      readability: 0,
      relevance: 0,
      completeness: 0
    };
    
    if (!response || response.length === 0) {
      return analysis;
    }
    
    // Readability score
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = response.split(/\s+/).filter(w => w.length > 0);
    const avgSentenceLength = words.length / sentences.length;
    
    if (avgSentenceLength > 0 && avgSentenceLength < 25) {
      analysis.readability = 0.8;
      analysis.factors.push('good_sentence_length');
    } else if (avgSentenceLength > 0 && avgSentenceLength < 35) {
      analysis.readability = 0.6;
      analysis.factors.push('acceptable_sentence_length');
    } else {
      analysis.readability = 0.3;
      analysis.factors.push('long_sentences');
    }
    
    // Relevance score (basic heuristics)
    const technicalTerms = response.match(/\b(function|class|const|let|var|if|for|while|import|export|return|async|await)\b/g);
    if (technicalTerms && technicalTerms.length > 0) {
      analysis.relevance = 0.8;
      analysis.factors.push('technical_content');
    } else {
      analysis.relevance = 0.5;
      analysis.factors.push('general_content');
    }
    
    // Completeness score
    if (response.includes('```') && response.includes('```')) {
      analysis.completeness = 0.9;
      analysis.factors.push('code_blocks_present');
    } else if (response.length > 100) {
      analysis.completeness = 0.7;
      analysis.factors.push('substantial_content');
    } else {
      analysis.completeness = 0.4;
      analysis.factors.push('minimal_content');
    }
    
    // Overall score
    analysis.score = (analysis.readability + analysis.relevance + analysis.completeness) / 3;
    
    return analysis;
  }

  /**
   * Wait for AI response with completion detection
   * @param {Object} page - Playwright page object
   * @param {Object} options - Wait options
   * @returns {Promise<Object>} AI response with analysis
   */
  async waitForAIResponse(page, options = {}) {
    const {
      timeout = null,
      checkInterval = null,
      requiredStableChecks = 3
    } = options;
    
    // Use centralized timeout configuration
    const TimeoutConfig = require('@config/timeout-config');
    const actualTimeout = timeout ? TimeoutConfig.getTimeout('AI_RESPONSE', timeout) : TimeoutConfig.getTimeout('AI_RESPONSE', 'DEFAULT');
    const actualCheckInterval = checkInterval ? TimeoutConfig.getInterval(checkInterval) : TimeoutConfig.getInterval('AI_RESPONSE_CHECK');
    
    const startTime = Date.now();
    let lastMessageCount = 0;
    let stableCount = 0;
    
    this.logger.info('⏳ [AITextDetector] Waiting for AI response...');
    
    while (Date.now() - startTime < actualTimeout) {
      try {
        // Count current AI messages
        const currentMessageCount = await page.evaluate((selector) => {
          const aiMessages = document.querySelectorAll(selector);
          return aiMessages.length;
        }, this.selectors.aiMessages);
        
        // Check if message count is stable
        if (currentMessageCount === lastMessageCount) {
          stableCount++;
          
          // Get the latest AI response
          const latestResponse = await this.extractLatestAIResponse(page);
          
          // Analyze completion
          const completionAnalysis = this.detectCompletion(latestResponse);
          const qualityAnalysis = this.analyzeResponseQuality(latestResponse);
          
          this.logger.info(`📊 [AITextDetector] Response analysis:`, {
            length: latestResponse.length,
            isComplete: completionAnalysis.isComplete,
            confidence: completionAnalysis.confidence,
            quality: qualityAnalysis.score
          });
          
          // Check for completion
          if (completionAnalysis.isComplete && completionAnalysis.confidence >= 0.7) {
            this.logger.info('✅ [AITextDetector] AI response complete');
            return {
              success: true,
              response: latestResponse,
              completion: completionAnalysis,
              quality: qualityAnalysis,
              messageCount: currentMessageCount,
              duration: Date.now() - startTime
            };
          }
          
          // Check for stable completion with lower confidence
          if (stableCount >= requiredStableChecks && completionAnalysis.confidence >= 0.5) {
            this.logger.info('✅ [AITextDetector] AI response stable');
            return {
              success: true,
              response: latestResponse,
              completion: completionAnalysis,
              quality: qualityAnalysis,
              messageCount: currentMessageCount,
              duration: Date.now() - startTime,
              stable: true
            };
          }
          
          // Check if AI is still actively working (new messages appearing)
          if (currentMessageCount > lastMessageCount) {
            stableCount = 0; // Reset stable count if AI is still working
            this.logger.info(`📝 [AITextDetector] AI still actively working: ${currentMessageCount} messages`);
          }
          
        } else {
          // Reset stable count if new message detected
          stableCount = 0;
          this.logger.info(`📝 [AITextDetector] AI still working: ${currentMessageCount} messages`);
        }
        
        lastMessageCount = currentMessageCount;
        
        // Wait before next check
        await page.waitForTimeout(actualCheckInterval);
        
      } catch (error) {
        this.logger.error('❌ [AITextDetector] Error checking AI response:', error.message);
        await page.waitForTimeout(1000);
      }
    }
    
    // Timeout reached
    this.logger.info('⏰ [AITextDetector] Timeout reached');
    const finalResponse = await this.extractLatestAIResponse(page);
    const completionAnalysis = this.detectCompletion(finalResponse);
    const qualityAnalysis = this.analyzeResponseQuality(finalResponse);
    
    return {
      success: false,
      response: finalResponse,
      completion: completionAnalysis,
      quality: qualityAnalysis,
      messageCount: lastMessageCount,
      duration: Date.now() - startTime,
      timeout: true
    };
  }
}

module.exports = AITextDetector; 