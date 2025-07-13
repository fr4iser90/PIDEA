const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
/**
 * ConfirmationSystem - Service for handling AI confirmation loops
 * Analyzes AI responses and manages confirmation workflows
 * Can be used by AutoFinishSystem, AutoTestFixSystem, and other services
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
    
    // Test-specific completion keywords
    this.testCompletionKeywords = {
      'en': ['test passes', 'test fixed', 'coverage improved', 'refactored', 'updated test', 'tests passing'],
      'de': ['test bestanden', 'test gefixt', 'coverage verbessert', 'refactored', 'test aktualisiert'],
      'es': ['test pasa', 'test arreglado', 'cobertura mejorada', 'refactorizado'],
      'fr': ['test réussi', 'test corrigé', 'couverture améliorée', 'refactorisé']
    };
    
    // Refactoring-specific completion keywords
    this.refactoringCompletionKeywords = {
      'en': ['refactored', 'refactoring complete', 'code improved', 'restructured', 'optimized'],
      'de': ['refactored', 'refactoring abgeschlossen', 'code verbessert', 'umstrukturiert', 'optimiert'],
      'es': ['refactorizado', 'refactoring completado', 'código mejorado', 'reestructurado'],
      'fr': ['refactorisé', 'refactoring terminé', 'code amélioré', 'restructuré']
    };
    
    // Confirmation questions in multiple languages (structured format)
    this.confirmationQuestions = {
      'en': [
        'Check your status against the task and respond with your status: completed/partially completed/need human. Also include test results: [PASSED] or [FAILED] with percentage.',
        'Check your status against the task and respond with your status: completed/partially completed/need human.'
      ],
      'de': [
        'Prüfe deinen Status gegen die Aufgabe und antworte mit deinem Status: completed/partially completed/need human. Füge auch Testergebnisse hinzu: [PASSED] oder [FAILED] mit Prozentsatz.',
        'Prüfe deinen Status gegen die Aufgabe und antworte mit deinem Status: completed/partially completed/need human.'
      ],
      'es': [
        'Verifica tu estado contra la tarea y responde con tu estado: completed/partially completed/need human. También incluye resultados de pruebas: [PASSED] o [FAILED] con porcentaje.',
        'Verifica tu estado contra la tarea y responde con tu estado: completed/partially completed/need human.'
      ],
      'fr': [
        'Vérifiez votre statut par rapport à la tâche et répondez avec votre statut: completed/partially completed/need human. Incluez également les résultats des tests: [PASSED] ou [FAILED] avec pourcentage.',
        'Vérifiez votre statut par rapport à la tâche et répondez avec votre statut: completed/partially completed/need human.'
      ]
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
   * Ask for explicit confirmation from AI
   * @param {string} context - Context type (test, refactor, )
   * @returns {Promise<Object>} Confirmation result
   */
  async askConfirmation(context = '') {
    try {
      const questions = this.getConfirmationQuestions(context);
      const question = questions[Math.floor(Math.random() * questions.length)];
      
      this.logger.info(`[ConfirmationSystem] Asking for confirmation: "${question}"`);
      
      // Send structured status request
      const response = await this.cursorIDE.postToCursor(question);
      
      this.logger.info(`[ConfirmationSystem] AI response: ${response}`);
      
      // Parse structured response
      const validationResult = this.validateTaskCompletion(response);
      
      return {
        isValid: validationResult.isValid,
        response: response,
        question: question,
        confidence: validationResult.confidence,
        status: validationResult.status,
        testResults: validationResult.testResults,
        rawResponse: validationResult.rawResponse
      };
    } catch (error) {
      this.logger.error(`[ConfirmationSystem] Error asking confirmation: ${error.message}`);
      return {
        isValid: false,
        response: '',
        question: '',
        confidence: 0,
        status: 'error',
        testResults: null,
        error: error.message
      };
    }
  }

  /**
   * Validate task completion from AI response
   * @param {string} response - AI response
   * @returns {Object} Validation result
   */
  validateTaskCompletion(response) {
    if (!response || typeof response !== 'string') {
      return { isValid: false, confidence: 0, status: 'unknown', testResults: null };
    }

    const lowerResponse = response.toLowerCase();
    
    // Parse structured status response
    const statusMatch = lowerResponse.match(/(completed|partially completed|need human)/);
    const passedMatch = lowerResponse.match(/\[passed\]\s*(\d+)%/i);
    const failedMatch = lowerResponse.match(/\[failed\]\s*(\d+)%/i);
    
    let status = 'unknown';
    let testResults = null;
    let isValid = false;
    let confidence = 0;
    
    // Extract status
    if (statusMatch) {
      status = statusMatch[1];
      
      // Determine if task is completed
      if (status === 'completed') {
        isValid = true;
        confidence = 0.9;
      } else if (status === 'partially completed') {
        isValid = false;
        confidence = 0.7;
      } else if (status === 'need human') {
        isValid = false;
        confidence = 0.8;
      }
    }
    
    // Extract test results
    if (passedMatch) {
      testResults = {
        status: 'PASSED',
        percentage: parseInt(passedMatch[1]),
        raw: passedMatch[0]
      };
    } else if (failedMatch) {
      testResults = {
        status: 'FAILED',
        percentage: parseInt(failedMatch[1]),
        raw: failedMatch[0]
      };
    }
    
    // Fallback to old keyword-based validation if no structured response
    if (status === 'unknown') {
      // Check for completion keywords
      const completionKeywords = [
        'completed', 'done', 'finished', 'ready', 'complete',
        'fertig', 'erledigt', 'abgeschlossen', 'bereit',
        'listo', 'completado', 'terminado',
        'fini', 'terminé', 'completé'
      ];
      
      for (const keyword of completionKeywords) {
        if (lowerResponse.includes(keyword)) {
          status = 'completed';
          isValid = true;
          confidence = 0.6; // Lower confidence for keyword-based detection
          break;
        }
      }
    }
    
    this.logger.info(`[ConfirmationSystem] Parsed response: status=${status}, isValid=${isValid}, confidence=${confidence}, testResults=${JSON.stringify(testResults)}`);
    
    return {
      isValid,
      confidence,
      status,
      testResults,
      rawResponse: response
    };
  }

  /**
   * Analyze AI response for completion indicators
   * @param {string} response - AI response
   * @param {string} context - Context type (test, refactor, )
   * @returns {Object} Analysis result
   */
  analyzeResponse(response, context = '') {
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
    
    // Check  completion keywords
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
    
    // Check context-specific completion keywords
    if (context === 'test') {
      for (const [lang, keywords] of Object.entries(this.testCompletionKeywords)) {
        for (const keyword of keywords) {
          if (lowerResponse.includes(keyword.toLowerCase())) {
            completionScore += 1.5; // Higher weight for test-specific keywords
            indicators.push({
              type: 'test_completion',
              keyword,
              language: lang,
              confidence: 0.9
            });
          }
        }
      }
    } else if (context === 'refactor') {
      for (const [lang, keywords] of Object.entries(this.refactoringCompletionKeywords)) {
        for (const keyword of keywords) {
          if (lowerResponse.includes(keyword.toLowerCase())) {
            completionScore += 1.5; // Higher weight for refactoring-specific keywords
            indicators.push({
              type: 'refactoring_completion',
              keyword,
              language: lang,
              confidence: 0.9
            });
          }
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
        const question = this.getConfirmationQuestion(options.language, options.context);
        const confirmationResponse = await this.cursorIDE.postToCursor(question);
        
        // Parse structured response
        const validationResult = this.validateTaskCompletion(confirmationResponse);
        
        if (validationResult.isValid && validationResult.confidence >= this.config.confidenceThreshold) {
          this.logger.info(`[ConfirmationSystem] Confirmation successful on attempt ${attempt}`);
          
          return {
            confirmed: true,
            response: confirmationResponse,
            confidence: validationResult.confidence,
            status: validationResult.status,
            testResults: validationResult.testResults,
            attempt
          };
        }
        
        if (!validationResult.isValid && validationResult.confidence >= this.config.confidenceThreshold) {
          this.logger.info(`[ConfirmationSystem] Confirmation indicates incompletion on attempt ${attempt} (status: ${validationResult.status})`);
          
          return {
            confirmed: false,
            response: confirmationResponse,
            confidence: validationResult.confidence,
            status: validationResult.status,
            testResults: validationResult.testResults,
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
      status: 'max_attempts_exceeded',
      testResults: null,
      attempt: maxAttempts,
      reason: 'max_attempts_exceeded'
    };
  }

  /**
   * Get confirmation question in specified language and context
   * @param {string} language - Language code
   * @param {string} context - Context type (test, refactor, )
   * @returns {string} Confirmation question
   */
  getConfirmationQuestion(language = 'en', context = '') {
    // Use the new structured questions from getConfirmationQuestions
    const questions = this.getConfirmationQuestions(context);
    
    // Filter by language if needed (for now, return any question as they're multilingual)
    return questions[Math.floor(Math.random() * questions.length)];
  }

  /**
   * Get confirmation questions for different contexts
   * @param {string} context - Context type (test, refactor, )
   * @returns {Array} Array of confirmation questions
   */
  getConfirmationQuestions(context = '') {
    const questions = {
      'test': [
        'Check your status against the task and respond with your status: completed/partially completed/need human. Also include test results: [PASSED] or [FAILED] with percentage.',
        'Prüfe deinen Status gegen die Aufgabe und antworte mit deinem Status: completed/partially completed/need human. Füge auch Testergebnisse hinzu: [PASSED] oder [FAILED] mit Prozentsatz.',
        'Verifica tu estado contra la tarea y responde con tu estado: completed/partially completed/need human. También incluye resultados de pruebas: [PASSED] o [FAILED] con porcentaje.',
        'Vérifiez votre statut par rapport à la tâche et répondez avec votre statut: completed/partially completed/need human. Incluez également les résultats des tests: [PASSED] ou [FAILED] avec pourcentage.'
      ],
      'refactor': [
        'Check your status against the task and respond with your status: completed/partially completed/need human.',
        'Prüfe deinen Status gegen die Aufgabe und antworte mit deinem Status: completed/partially completed/need human.',
        'Verifica tu estado contra la tarea y responde con tu estado: completed/partially completed/need human.',
        'Vérifiez votre statut par rapport à la tâche et répondez avec votre statut: completed/partially completed/need human.'
      ],
      '': [
        'Check your status against the task and respond with your status: completed/partially completed/need human.',
        'Prüfe deinen Status gegen die Aufgabe und antworte mit deinem Status: completed/partially completed/need human.',
        'Verifica tu estado contra la tarea y responde con tu estado: completed/partially completed/need human.',
        'Vérifiez votre statut par rapport à la tâche et répondez avec votre statut: completed/partially completed/need human.'
      ]
    };
    
    return questions[context] || questions[''];
  }

  /**
   * Detect language from text
   * @param {string} text - Text to analyze
   * @returns {string} Language code
   */
  detectLanguage(text) {
    // Simple language detection based on common words
    if (text.includes('fertig') || text.includes('erledigt') || text.includes('abgeschlossen')) {
      return 'de';
    } else if (text.includes('listo') || text.includes('completado') || text.includes('terminado')) {
      return 'es';
    } else if (text.includes('fini') || text.includes('terminé') || text.includes('completé')) {
      return 'fr';
    }
    return 'en';
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
   * Set configuration
   * @param {Object} config - Configuration object
   */
  setConfig(config) {
    this.config = { ...this.config, ...config };
    this.logger.info('[ConfirmationSystem] Configuration updated');
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return { ...this.config };
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