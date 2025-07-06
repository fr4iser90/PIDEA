/**
 * ConfirmationSystem - Service for handling AI confirmation loops
 * Analyzes AI responses and manages confirmation workflows
 */
class ConfirmationSystem {
  constructor(cursorIDE) {
    this.cursorIDE = cursorIDE;
    
    // Completion keywords in multiple languages
    this.completionKeywords = {
      'en': ['done', 'complete', 'finished', 'ready', 'completed', 'finished', 'ready', 'ok', 'yes'],
      'de': ['fertig', 'erledigt', 'abgeschlossen', 'bereit', 'ok', 'ja', 'vollständig'],
      'es': ['listo', 'completado', 'terminado', 'listo', 'ok', 'sí'],
      'fr': ['fini', 'terminé', 'completé', 'prêt', 'ok', 'oui']
    };
    
    // Incomplete indicators
    this.incompleteKeywords = {
      'en': ['not done', 'not finished', 'still working', 'in progress', 'waiting', 'need more'],
      'de': ['nicht fertig', 'noch nicht', 'arbeitet noch', 'in bearbeitung', 'wartet', 'braucht mehr'],
      'es': ['no listo', 'no terminado', 'todavía trabajando', 'en progreso', 'esperando', 'necesita más'],
      'fr': ['pas fini', 'pas terminé', 'travaille encore', 'en cours', 'attend', 'a besoin de plus']
    };
    
    // Confirmation questions in multiple languages
    this.confirmationQuestions = {
      'en': ['Fertig?', 'Done?', 'Complete?', 'Ready?'],
      'de': ['Fertig?', 'Erledigt?', 'Abgeschlossen?', 'Bereit?'],
      'es': ['¿Listo?', '¿Terminado?', '¿Completado?', '¿Listo?'],
      'fr': ['Fini?', 'Terminé?', 'Complété?', 'Prêt?']
    };
    
    // Response analysis patterns
    this.responsePatterns = {
      positive: [
        /^(ja|yes|sí|oui|ok|okay|yep|yeah|sure|absolutely|definitely|of course)$/i,
        /^(fertig|done|complete|finished|ready|listo|terminado|fini|prêt)$/i,
        /^(alles erledigt|all done|everything complete|todo listo|tout fini)$/i
      ],
      negative: [
        /^(nein|no|non|nope|not yet|not done|not finished|not complete)$/i,
        /^(noch nicht|still working|in progress|en cours|todavía trabajando)$/i,
        /^(braucht noch|needs more|necesita más|a besoin de plus)$/i
      ],
      ambiguous: [
        /^(maybe|perhaps|vielleicht|tal vez|peut-être)$/i,
        /^(partially|teilweise|parcialmente|partiellement)$/i,
        /^(almost|fast|casi|presque)$/i
      ]
    };
    
    // Configuration
    this.config = {
      maxAttempts: 3,
      timeout: 10000, // 10 seconds
      confidenceThreshold: 0.8,
      languageDetection: true,
      autoDetectLanguage: true
    };
    
    this.logger = console;
  }

  /**
   * Initialize the confirmation system
   */
  async initialize() {
    this.logger.info('[ConfirmationSystem] Initializing confirmation system...');
    this.logger.info(`[ConfirmationSystem] Loaded ${Object.keys(this.completionKeywords).length} languages`);
    return true;
  }

  /**
   * Ask for confirmation from AI
   * @param {string} aiResponse - AI response to analyze
   * @param {Object} options - Confirmation options
   * @returns {Promise<Object>} Confirmation result
   */
  async askConfirmation(aiResponse, options = {}) {
    const startTime = Date.now();
    
    try {
      this.logger.info('[ConfirmationSystem] Analyzing AI response for confirmation...');
      
      // Analyze the AI response
      const analysis = this.analyzeResponse(aiResponse);
      
      // If response indicates completion, no confirmation needed
      if (analysis.isComplete && analysis.confidence >= this.config.confidenceThreshold) {
        this.logger.info('[ConfirmationSystem] Response indicates completion, no confirmation needed');
        
        return {
          confirmed: true,
          autoConfirmed: true,
          confidence: analysis.confidence,
          reason: 'auto_confirmed',
          analysis,
          duration: Date.now() - startTime
        };
      }
      
      // If response indicates incompletion, continue automatically
      if (analysis.isIncomplete && analysis.confidence >= this.config.confidenceThreshold) {
        this.logger.info('[ConfirmationSystem] Response indicates incompletion, continuing automatically');
        
        return {
          confirmed: false,
          autoConfirmed: true,
          confidence: analysis.confidence,
          reason: 'auto_continued',
          analysis,
          duration: Date.now() - startTime
        };
      }
      
      // Need explicit confirmation
      this.logger.info('[ConfirmationSystem] Response ambiguous, requesting explicit confirmation');
      
      const confirmationResult = await this.requestExplicitConfirmation(options);
      
      return {
        confirmed: confirmationResult.confirmed,
        autoConfirmed: false,
        confidence: confirmationResult.confidence,
        reason: 'explicit_confirmation',
        analysis,
        confirmationResponse: confirmationResult.response,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      this.logger.error('[ConfirmationSystem] Confirmation failed:', error.message);
      
      return {
        confirmed: false,
        autoConfirmed: false,
        confidence: 0,
        reason: 'error',
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Analyze AI response for completion indicators
   * @param {string} response - AI response
   * @returns {Object} Analysis result
   */
  analyzeResponse(response) {
    if (!response || typeof response !== 'string') {
      return {
        isComplete: false,
        isIncomplete: false,
        confidence: 0,
        language: 'unknown',
        indicators: []
      };
    }
    
    const lowerResponse = response.toLowerCase();
    const language = this.detectLanguage(lowerResponse);
    const indicators = [];
    
    // Check for completion keywords
    let completionScore = 0;
    let incompleteScore = 0;
    
    // Check completion keywords
    for (const [lang, keywords] of Object.entries(this.completionKeywords)) {
      for (const keyword of keywords) {
        if (lowerResponse.includes(keyword.toLowerCase())) {
          completionScore += 1;
          indicators.push({
            type: 'completion',
            keyword,
            language: lang,
            confidence: 0.8
          });
        }
      }
    }
    
    // Check incomplete keywords
    for (const [lang, keywords] of Object.entries(this.incompleteKeywords)) {
      for (const keyword of keywords) {
        if (lowerResponse.includes(keyword.toLowerCase())) {
          incompleteScore += 1;
          indicators.push({
            type: 'incomplete',
            keyword,
            language: lang,
            confidence: 0.8
          });
        }
      }
    }
    
    // Check response patterns
    for (const [patternType, patterns] of Object.entries(this.responsePatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerResponse)) {
          if (patternType === 'positive') {
            completionScore += 1;
            indicators.push({
              type: 'positive_pattern',
              pattern: pattern.source,
              confidence: 0.9
            });
          } else if (patternType === 'negative') {
            incompleteScore += 1;
            indicators.push({
              type: 'negative_pattern',
              pattern: pattern.source,
              confidence: 0.9
            });
          }
        }
      }
    }
    
    // Calculate confidence and decision
    const totalScore = completionScore + incompleteScore;
    const completionConfidence = totalScore > 0 ? completionScore / totalScore : 0;
    const incompleteConfidence = totalScore > 0 ? incompleteScore / totalScore : 0;
    
    const isComplete = completionConfidence > incompleteConfidence && completionConfidence >= 0.5;
    const isIncomplete = incompleteConfidence > completionConfidence && incompleteConfidence >= 0.5;
    const confidence = Math.max(completionConfidence, incompleteConfidence);
    
    return {
      isComplete,
      isIncomplete,
      confidence,
      language,
      indicators,
      scores: {
        completion: completionScore,
        incomplete: incompleteScore,
        completionConfidence,
        incompleteConfidence
      }
    };
  }

  /**
   * Detect language from response
   * @param {string} response - Response text
   * @returns {string} Detected language
   */
  detectLanguage(response) {
    if (!this.config.languageDetection) {
      return 'en';
    }
    
    const languageScores = {};
    
    // Count language-specific keywords
    for (const [lang, keywords] of Object.entries(this.completionKeywords)) {
      languageScores[lang] = 0;
      for (const keyword of keywords) {
        if (response.includes(keyword.toLowerCase())) {
          languageScores[lang] += 1;
        }
      }
    }
    
    // Find language with highest score
    let maxScore = 0;
    let detectedLanguage = 'en';
    
    for (const [lang, score] of Object.entries(languageScores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedLanguage = lang;
      }
    }
    
    return detectedLanguage;
  }

  /**
   * Request explicit confirmation from AI
   * @param {Object} options - Confirmation options
   * @returns {Promise<Object>} Confirmation result
   */
  async requestExplicitConfirmation(options = {}) {
    const maxAttempts = options.maxAttempts || this.config.maxAttempts;
    const timeout = options.timeout || this.config.timeout;
    const sessionId = options.sessionId;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.info(`[ConfirmationSystem] Confirmation attempt ${attempt}/${maxAttempts}`);
        
        // Send confirmation question
        const question = this.getConfirmationQuestion(options.language);
        const confirmationResponse = await this.cursorIDE.postToCursor(question);
        
        // Analyze confirmation response
        const analysis = this.analyzeResponse(confirmationResponse);
        
        if (analysis.isComplete && analysis.confidence >= this.config.confidenceThreshold) {
          this.logger.info(`[ConfirmationSystem] Confirmation successful on attempt ${attempt}`);
          
          return {
            confirmed: true,
            response: confirmationResponse,
            confidence: analysis.confidence,
            attempt
          };
        }
        
        if (analysis.isIncomplete && analysis.confidence >= this.config.confidenceThreshold) {
          this.logger.info(`[ConfirmationSystem] Confirmation indicates incompletion on attempt ${attempt}`);
          
          return {
            confirmed: false,
            response: confirmationResponse,
            confidence: analysis.confidence,
            attempt
          };
        }
        
        // If ambiguous, try again
        this.logger.info(`[ConfirmationSystem] Confirmation response ambiguous on attempt ${attempt}, retrying...`);
        
        // Wait before next attempt
        if (attempt < maxAttempts) {
          await this.sleep(1000);
        }
        
      } catch (error) {
        this.logger.error(`[ConfirmationSystem] Confirmation attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxAttempts) {
          throw error;
        }
      }
    }
    
    // All attempts failed
    this.logger.warn(`[ConfirmationSystem] All ${maxAttempts} confirmation attempts failed`);
    
    return {
      confirmed: false,
      response: null,
      confidence: 0,
      attempt: maxAttempts,
      reason: 'max_attempts_exceeded'
    };
  }

  /**
   * Get confirmation question in specified language
   * @param {string} language - Language code
   * @returns {string} Confirmation question
   */
  getConfirmationQuestion(language = 'en') {
    const questions = this.confirmationQuestions[language] || this.confirmationQuestions['en'];
    return questions[Math.floor(Math.random() * questions.length)];
  }

  /**
   * Sleep utility function
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Sleep promise
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Batch confirm multiple responses
   * @param {Array} responses - Array of AI responses
   * @param {Object} options - Confirmation options
   * @returns {Promise<Array>} Array of confirmation results
   */
  async batchConfirm(responses, options = {}) {
    const results = [];
    
    for (const response of responses) {
      try {
        const result = await this.askConfirmation(response, options);
        results.push({
          response,
          confirmation: result
        });
      } catch (error) {
        this.logger.error('[ConfirmationSystem] Batch confirmation failed for response:', error.message);
        results.push({
          response,
          confirmation: {
            confirmed: false,
            error: error.message
          }
        });
      }
    }
    
    return results;
  }

  /**
   * Get confirmation statistics
   * @param {Array} results - Array of confirmation results
   * @returns {Object} Statistics
   */
  getConfirmationStats(results) {
    const stats = {
      total: results.length,
      confirmed: 0,
      autoConfirmed: 0,
      explicitConfirmed: 0,
      failed: 0,
      averageConfidence: 0,
      averageDuration: 0,
      languageDistribution: {}
    };
    
    let totalConfidence = 0;
    let totalDuration = 0;
    
    for (const result of results) {
      if (result.confirmation.confirmed) {
        stats.confirmed++;
        
        if (result.confirmation.autoConfirmed) {
          stats.autoConfirmed++;
        } else {
          stats.explicitConfirmed++;
        }
      } else {
        stats.failed++;
      }
      
      totalConfidence += result.confirmation.confidence || 0;
      totalDuration += result.confirmation.duration || 0;
      
      // Track language distribution
      const language = result.confirmation.analysis?.language || 'unknown';
      stats.languageDistribution[language] = (stats.languageDistribution[language] || 0) + 1;
    }
    
    if (stats.total > 0) {
      stats.averageConfidence = totalConfidence / stats.total;
      stats.averageDuration = totalDuration / stats.total;
    }
    
    return stats;
  }

  /**
   * Add custom completion keywords
   * @param {string} language - Language code
   * @param {Array} keywords - Keywords to add
   */
  addCompletionKeywords(language, keywords) {
    if (!this.completionKeywords[language]) {
      this.completionKeywords[language] = [];
    }
    
    this.completionKeywords[language].push(...keywords);
    this.logger.info(`[ConfirmationSystem] Added completion keywords for language: ${language}`);
  }

  /**
   * Add custom incomplete keywords
   * @param {string} language - Language code
   * @param {Array} keywords - Keywords to add
   */
  addIncompleteKeywords(language, keywords) {
    if (!this.incompleteKeywords[language]) {
      this.incompleteKeywords[language] = [];
    }
    
    this.incompleteKeywords[language].push(...keywords);
    this.logger.info(`[ConfirmationSystem] Added incomplete keywords for language: ${language}`);
  }

  /**
   * Add custom confirmation questions
   * @param {string} language - Language code
   * @param {Array} questions - Questions to add
   */
  addConfirmationQuestions(language, questions) {
    if (!this.confirmationQuestions[language]) {
      this.confirmationQuestions[language] = [];
    }
    
    this.confirmationQuestions[language].push(...questions);
    this.logger.info(`[ConfirmationSystem] Added confirmation questions for language: ${language}`);
  }

  /**
   * Get system statistics
   * @returns {Object} System stats
   */
  getStats() {
    const totalLanguages = Object.keys(this.completionKeywords).length;
    const totalCompletionKeywords = Object.values(this.completionKeywords).flat().length;
    const totalIncompleteKeywords = Object.values(this.incompleteKeywords).flat().length;
    const totalQuestions = Object.values(this.confirmationQuestions).flat().length;
    
    return {
      languages: totalLanguages,
      completionKeywords: totalCompletionKeywords,
      incompleteKeywords: totalIncompleteKeywords,
      confirmationQuestions: totalQuestions,
      maxAttempts: this.config.maxAttempts,
      timeout: this.config.timeout,
      confidenceThreshold: this.config.confidenceThreshold
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.logger.info('[ConfirmationSystem] Cleaning up confirmation system...');
    // No specific cleanup needed for confirmation system
  }
}

module.exports = ConfirmationSystem; 