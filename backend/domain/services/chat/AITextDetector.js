/**
 * AITextDetector - Enhanced AI Response Detection Service
 * Now uses the improved ResponseProcessor for better detection
 * Based on the successful automation folder detection logic
 */

const ServiceLogger = require('@logging/ServiceLogger');
const ResponseProcessor = require('./ResponseProcessor');

class AITextDetector {
  constructor(selectors) {
    this.selectors = selectors;
    this.logger = new ServiceLogger('AITextDetector');
    this.responseProcessor = new ResponseProcessor(selectors);
  }

  /**
   * Extract latest AI response from DOM
   * @param {Object} page - Playwright page object
   * @returns {Promise<string>} Latest AI response text
   */
  async extractLatestAIResponse(page) {
    try {
      this.logger.info('🔍 [AITextDetector] Extracting latest AI response');
      
      // Use the improved response processor
      const response = await this.responseProcessor.extractAIResponse(page);
      
      if (response) {
        this.logger.info(`📝 [AITextDetector] Extracted response (${response.length} chars)`);
        return response;
      } else {
        this.logger.warn('⚠️ [AITextDetector] No response found');
        return '';
      }
    } catch (error) {
      this.logger.error(`❌ [AITextDetector] Error extracting response: ${error.message}`);
      return '';
    }
  }

  /**
   * Detect if AI response is complete using enhanced detection
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
    
    // Enhanced completion detection based on automation folder logic
    const completionIndicators = [
      'completed', 'success', 'done', 'finished', 'implemented', 
      'created', 'added', 'updated', 'working', 'functional',
      'file edited', 'files edited', 'file changed', 'files changed'
    ];
    
    const errorIndicators = [
      'error', 'failed', 'cannot', 'unable', 'missing', 'not found',
      'invalid', 'broken', 'doesn\'t work', 'failed to'
    ];
    
    const responseEndings = [
      '```',
      '**Summary:**',
      '**Next Steps:**',
      '**Status:**',
      'completed',
      'finished',
      'done'
    ];
    
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
      /\.\.\.$/,
      /^(wait|hold on|give me a moment)/i,
      /^(i'm|i am) (working|processing|analyzing)/i
    ];
    
    const lowerResponse = response.toLowerCase();
    
    // Check for completion indicators
    const hasCompletionIndicator = completionIndicators.some(indicator => 
      lowerResponse.includes(indicator.toLowerCase())
    );
    
    // Check for error indicators
    const hasErrorIndicator = errorIndicators.some(indicator => 
      lowerResponse.includes(indicator.toLowerCase())
    );
    
    // Check for response endings
    const hasResponseEnding = responseEndings.some(ending => 
      lowerResponse.includes(ending.toLowerCase())
    );
    
    // Check completion patterns
    const hasCompletionPattern = completionPatterns.some(pattern => 
      pattern.test(response)
    );
    
    // Check partial patterns
    const hasPartialPattern = partialPatterns.some(pattern => 
      pattern.test(response)
    );
    
    // Check incomplete patterns
    const hasIncompletePattern = incompletePatterns.some(pattern => 
      pattern.test(response)
    );
    
    // Calculate confidence based on multiple factors
    let confidence = 0;
    
    if (hasCompletionIndicator) confidence += 0.4;
    if (hasResponseEnding) confidence += 0.3;
    if (hasCompletionPattern) confidence += 0.2;
    if (response.length > 200) confidence += 0.1;
    
    // Reduce confidence for error indicators
    if (hasErrorIndicator) confidence -= 0.3;
    
    // Reduce confidence for partial/incomplete patterns
    if (hasPartialPattern) confidence -= 0.2;
    if (hasIncompletePattern) confidence -= 0.3;
    
    // Determine completion status
    if (confidence >= 0.7) {
      analysis.isComplete = true;
      analysis.completionType = 'complete';
    } else if (confidence >= 0.4) {
      analysis.isPartial = true;
      analysis.completionType = 'partial';
    } else {
      analysis.completionType = 'incomplete';
    }
    
    analysis.confidence = Math.max(0, Math.min(1, confidence));
    
    // Determine quality
    if (response.length > 500) {
      analysis.quality = 'high';
    } else if (response.length > 200) {
      analysis.quality = 'medium';
    } else {
      analysis.quality = 'low';
    }
    
    return analysis;
  }

  /**
   * Analyze response quality
   * @param {string} response - AI response text
   * @returns {Object} Quality analysis
   */
  analyzeResponseQuality(response) {
    if (!response || response.length === 0) {
      return {
        score: 0,
        factors: ['empty_response'],
        confidence: 0
      };
    }
    
    const factors = [];
    let score = 0;
    
    // Length factor
    if (response.length > 500) {
      score += 0.3;
      factors.push('substantial_length');
    } else if (response.length > 200) {
      score += 0.2;
      factors.push('adequate_length');
    } else if (response.length > 100) {
      score += 0.1;
      factors.push('minimal_length');
    }
    
    // Code blocks factor
    const codeBlockCount = (response.match(/```/g) || []).length / 2;
    if (codeBlockCount > 0) {
      score += 0.2;
      factors.push('contains_code');
    }
    
    // Structure factor
    if (response.includes('**') || response.includes('##') || response.includes('###')) {
      score += 0.1;
      factors.push('well_structured');
    }
    
    // Action words factor
    const actionWords = ['created', 'updated', 'added', 'implemented', 'fixed', 'completed'];
    const hasActionWords = actionWords.some(word => response.toLowerCase().includes(word));
    if (hasActionWords) {
      score += 0.2;
      factors.push('action_oriented');
    }
    
    // File paths factor
    if (response.includes('/') || response.includes('\\')) {
      score += 0.1;
      factors.push('references_files');
    }
    
    // Error factor (negative)
    const errorWords = ['error', 'failed', 'cannot', 'unable'];
    const hasErrors = errorWords.some(word => response.toLowerCase().includes(word));
    if (hasErrors) {
      score -= 0.2;
      factors.push('contains_errors');
    }
    
    return {
      score: Math.max(0, Math.min(1, score)),
      factors,
      confidence: 0.8
    };
  }

  /**
   * Wait for AI response with enhanced detection
   * @param {Object} page - Playwright page object
   * @param {Object} options - Options for waiting
   * @returns {Promise<Object>} AI response with analysis
   */
  async waitForAIResponse(page, options = {}) {
    try {
      this.logger.info('⏳ [AITextDetector] Waiting for AI response...');
      
      // Use the improved response processor
      const result = await this.responseProcessor.waitForAIResponse(page, options);
      
      if (result.success) {
        // Analyze the response
        const completionAnalysis = this.detectCompletion(result.response);
        const qualityAnalysis = this.analyzeResponseQuality(result.response);
        
        this.logger.info('✅ [AITextDetector] AI response received', {
          length: result.response.length,
          confidence: completionAnalysis.confidence,
          quality: qualityAnalysis.score,
          duration: result.duration
        });
        
        return {
          success: true,
          response: result.response,
          completion: completionAnalysis,
          quality: qualityAnalysis,
          duration: result.duration,
          stable: result.stable
        };
      } else {
        this.logger.warn('⚠️ [AITextDetector] No AI response received');
        return {
          success: false,
          response: null,
          completion: { isComplete: false, confidence: 0 },
          quality: { score: 0 },
          duration: result.duration,
          timeout: true
        };
      }
    } catch (error) {
      this.logger.error(`❌ [AITextDetector] Error waiting for AI response: ${error.message}`);
      return {
        success: false,
        response: null,
        completion: { isComplete: false, confidence: 0 },
        quality: { score: 0 },
        duration: 0,
        error: error.message
      };
    }
  }
}

module.exports = AITextDetector;