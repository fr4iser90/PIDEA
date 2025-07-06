/**
 * FallbackDetection - Service for detecting when user input is needed
 * Analyzes AI responses and IDE state to determine if automation should continue or pause
 */
class FallbackDetection {
  constructor(browserManager, ideManager) {
    this.browserManager = browserManager;
    this.ideManager = ideManager;
    
    // User input need indicators
    this.userInputKeywords = {
      'en': [
        'input', 'user', 'choice', 'select', 'choose', 'option', 'preference',
        'decision', 'which', 'what', 'how', 'where', 'when', 'why',
        'confirm', 'approve', 'review', 'check', 'verify', 'validate'
      ],
      'de': [
        'eingabe', 'benutzer', 'wahl', 'auswahl', 'entscheidung', 'option',
        'welche', 'was', 'wie', 'wo', 'wann', 'warum', 'bestätigen',
        'prüfen', 'überprüfen', 'validieren', 'genehmigen'
      ],
      'es': [
        'entrada', 'usuario', 'elección', 'selección', 'opción', 'decisión',
        'cuál', 'qué', 'cómo', 'dónde', 'cuándo', 'por qué', 'confirmar',
        'revisar', 'verificar', 'validar', 'aprobar'
      ],
      'fr': [
        'entrée', 'utilisateur', 'choix', 'sélection', 'option', 'décision',
        'quel', 'quoi', 'comment', 'où', 'quand', 'pourquoi', 'confirmer',
        'réviser', 'vérifier', 'valider', 'approuver'
      ]
    };
    
    // IDE state indicators that suggest user input might be needed
    this.ideStateIndicators = {
      'dialog_open': [
        '.monaco-dialog',
        '[role="dialog"]',
        '.modal-dialog',
        '.popup',
        '.overlay'
      ],
      'input_focused': [
        'input:focus',
        'textarea:focus',
        '[contenteditable="true"]:focus',
        '.monaco-editor:focus'
      ],
      'error_state': [
        '.error',
        '.warning',
        '.alert',
        '.notification',
        '.toast'
      ],
      'loading_state': [
        '.loading',
        '.spinner',
        '.progress',
        '.waiting'
      ]
    };
    
    // File content patterns that suggest user input
    this.fileContentPatterns = {
      'form_inputs': [
        /<input[^>]*>/gi,
        /<textarea[^>]*>/gi,
        /<select[^>]*>/gi,
        /<button[^>]*>/gi
      ],
      'configuration_options': [
        /config\s*[:=]/gi,
        /option\s*[:=]/gi,
        /setting\s*[:=]/gi,
        /parameter\s*[:=]/gi
      ],
      'api_endpoints': [
        /@(GET|POST|PUT|DELETE|PATCH)/gi,
        /router\.(get|post|put|delete|patch)/gi,
        /app\.(get|post|put|delete|patch)/gi
      ],
      'database_queries': [
        /SELECT\s+.+FROM/gi,
        /INSERT\s+INTO/gi,
        /UPDATE\s+.+SET/gi,
        /DELETE\s+FROM/gi
      ]
    };
    
    // Decision thresholds
    this.thresholds = {
      userInputConfidence: 0.7,
      ideStateConfidence: 0.6,
      fileContentConfidence: 0.5,
      autoContinueThreshold: 0.8
    };
    
    // Configuration
    this.config = {
      enabled: true,
      checkIDEState: true,
      checkFileContent: true,
      checkResponseContent: true,
      autoContinueEnabled: true,
      maxAnalysisTime: 5000 // 5 seconds
    };
    
    this.logger = console;
  }

  /**
   * Initialize the fallback detection system
   */
  async initialize() {
    this.logger.info('[FallbackDetection] Initializing fallback detection system...');
    this.logger.info(`[FallbackDetection] Loaded ${Object.keys(this.userInputKeywords).length} languages`);
    return true;
  }

  /**
   * Detect if user input is needed based on AI response and context
   * @param {string} aiResponse - AI response to analyze
   * @param {Object} options - Detection options
   * @returns {Promise<Object>} Detection result
   */
  async detectUserInputNeed(aiResponse, options = {}) {
    const startTime = Date.now();
    
    try {
      this.logger.info('[FallbackDetection] Detecting user input need...');
      
      if (!this.config.enabled) {
        return {
          needsUserInput: false,
          action: 'continue',
          confidence: 1.0,
          reason: 'system_disabled'
        };
      }
      
      const analysis = {
        responseAnalysis: null,
        ideStateAnalysis: null,
        fileContentAnalysis: null,
        combinedScore: 0,
        factors: []
      };
      
      // Analyze AI response content
      if (this.config.checkResponseContent) {
        analysis.responseAnalysis = this.analyzeResponseContent(aiResponse);
        analysis.factors.push({
          type: 'response',
          score: analysis.responseAnalysis.score,
          confidence: analysis.responseAnalysis.confidence
        });
      }
      
      // Analyze IDE state
      if (this.config.checkIDEState) {
        analysis.ideStateAnalysis = await this.analyzeIDEState();
        analysis.factors.push({
          type: 'ide_state',
          score: analysis.ideStateAnalysis.score,
          confidence: analysis.ideStateAnalysis.confidence
        });
      }
      
      // Analyze current file content
      if (this.config.checkFileContent) {
        analysis.fileContentAnalysis = await this.analyzeFileContent();
        analysis.factors.push({
          type: 'file_content',
          score: analysis.fileContentAnalysis.score,
          confidence: analysis.fileContentAnalysis.confidence
        });
      }
      
      // Calculate combined score
      analysis.combinedScore = this.calculateCombinedScore(analysis.factors);
      
      // Make decision
      const decision = this.makeDecision(analysis, options);
      
      const result = {
        needsUserInput: decision.needsUserInput,
        action: decision.action,
        confidence: analysis.combinedScore,
        reason: decision.reason,
        analysis,
        duration: Date.now() - startTime
      };
      
      this.logger.info(`[FallbackDetection] Detection result: ${result.action} (confidence: ${result.confidence.toFixed(2)})`);
      
      return result;
      
    } catch (error) {
      this.logger.error('[FallbackDetection] Detection failed:', error.message);
      
      return {
        needsUserInput: true, // Default to safe side
        action: 'pause',
        confidence: 0,
        reason: 'error',
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Analyze AI response content for user input indicators
   * @param {string} response - AI response
   * @returns {Object} Analysis result
   */
  analyzeResponseContent(response) {
    if (!response || typeof response !== 'string') {
      return {
        score: 0,
        confidence: 0,
        indicators: [],
        language: 'unknown'
      };
    }
    
    const lowerResponse = response.toLowerCase();
    const language = this.detectLanguage(lowerResponse);
    const indicators = [];
    let totalScore = 0;
    
    // Check user input keywords
    const keywords = this.userInputKeywords[language] || this.userInputKeywords['en'];
    for (const keyword of keywords) {
      if (lowerResponse.includes(keyword.toLowerCase())) {
        const score = this.calculateKeywordScore(keyword, lowerResponse);
        totalScore += score;
        indicators.push({
          type: 'keyword',
          keyword,
          score,
          language
        });
      }
    }
    
    // Check for question patterns
    const questionPatterns = [
      /\?/g,
      /^(what|which|how|where|when|why|who)/gi,
      /^(was|welche|wie|wo|wann|warum|wer)/gi,
      /^(qué|cuál|cómo|dónde|cuándo|por qué|quién)/gi,
      /^(quoi|quel|comment|où|quand|pourquoi|qui)/gi
    ];
    
    for (const pattern of questionPatterns) {
      const matches = lowerResponse.match(pattern);
      if (matches) {
        const score = matches.length * 0.3;
        totalScore += score;
        indicators.push({
          type: 'question',
          pattern: pattern.source,
          matches: matches.length,
          score
        });
      }
    }
    
    // Normalize score
    const normalizedScore = Math.min(totalScore / 10, 1.0);
    const confidence = Math.min(normalizedScore * 1.2, 1.0);
    
    return {
      score: normalizedScore,
      confidence,
      indicators,
      language
    };
  }

  /**
   * Analyze current IDE state
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeIDEState() {
    try {
      const page = await this.browserManager.getPage();
      if (!page) {
        return {
          score: 0,
          confidence: 0,
          indicators: [],
          error: 'No IDE connection'
        };
      }
      
      const indicators = [];
      let totalScore = 0;
      
      // Check for dialogs
      for (const [stateType, selectors] of Object.entries(this.ideStateIndicators)) {
        for (const selector of selectors) {
          try {
            const elements = await page.$$(selector);
            if (elements.length > 0) {
              const score = this.getStateScore(stateType);
              totalScore += score;
              indicators.push({
                type: stateType,
                selector,
                count: elements.length,
                score
              });
            }
          } catch (error) {
            // Selector might not be valid, continue
          }
        }
      }
      
      // Check for active input focus
      try {
        const focusedElement = await page.evaluate(() => {
          const activeElement = document.activeElement;
          return activeElement ? {
            tagName: activeElement.tagName,
            type: activeElement.type,
            className: activeElement.className,
            id: activeElement.id
          } : null;
        });
        
        if (focusedElement && this.isInputElement(focusedElement)) {
          const score = 0.8;
          totalScore += score;
          indicators.push({
            type: 'input_focused',
            element: focusedElement,
            score
          });
        }
      } catch (error) {
        this.logger.warn('[FallbackDetection] Failed to check focused element:', error.message);
      }
      
      const normalizedScore = Math.min(totalScore / 5, 1.0);
      const confidence = Math.min(normalizedScore * 1.1, 1.0);
      
      return {
        score: normalizedScore,
        confidence,
        indicators
      };
      
    } catch (error) {
      this.logger.error('[FallbackDetection] IDE state analysis failed:', error.message);
      return {
        score: 0,
        confidence: 0,
        indicators: [],
        error: error.message
      };
    }
  }

  /**
   * Analyze current file content
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeFileContent() {
    try {
      const fileContent = await this.browserManager.getCurrentFileContent();
      if (!fileContent) {
        return {
          score: 0,
          confidence: 0,
          indicators: [],
          error: 'No file content available'
        };
      }
      
      const indicators = [];
      let totalScore = 0;
      
      // Check for patterns that suggest user input
      for (const [patternType, patterns] of Object.entries(this.fileContentPatterns)) {
        for (const pattern of patterns) {
          const matches = fileContent.match(pattern);
          if (matches) {
            const score = this.getContentPatternScore(patternType) * Math.min(matches.length / 5, 1.0);
            totalScore += score;
            indicators.push({
              type: patternType,
              pattern: pattern.source,
              matches: matches.length,
              score
            });
          }
        }
      }
      
      // Check for TODO comments that might need user input
      const todoPatterns = [
        /TODO:\s*(.+)/gi,
        /FIXME:\s*(.+)/gi,
        /NOTE:\s*(.+)/gi
      ];
      
      for (const pattern of todoPatterns) {
        const matches = fileContent.match(pattern);
        if (matches) {
          for (const match of matches) {
            const todoContent = match.toLowerCase();
            if (this.containsUserInputKeywords(todoContent)) {
              const score = 0.6;
              totalScore += score;
              indicators.push({
                type: 'todo_user_input',
                match,
                score
              });
            }
          }
        }
      }
      
      const normalizedScore = Math.min(totalScore / 10, 1.0);
      const confidence = Math.min(normalizedScore * 1.0, 1.0);
      
      return {
        score: normalizedScore,
        confidence,
        indicators
      };
      
    } catch (error) {
      this.logger.error('[FallbackDetection] File content analysis failed:', error.message);
      return {
        score: 0,
        confidence: 0,
        indicators: [],
        error: error.message
      };
    }
  }

  /**
   * Calculate combined score from multiple factors
   * @param {Array} factors - Analysis factors
   * @returns {number} Combined score
   */
  calculateCombinedScore(factors) {
    if (factors.length === 0) {
      return 0;
    }
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const factor of factors) {
      const weight = this.getFactorWeight(factor.type);
      weightedSum += factor.score * weight * factor.confidence;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Make decision based on analysis
   * @param {Object} analysis - Analysis result
   * @param {Object} options - Decision options
   * @returns {Object} Decision result
   */
  makeDecision(analysis, options = {}) {
    const combinedScore = analysis.combinedScore;
    const autoContinueThreshold = options.autoContinueThreshold || this.thresholds.autoContinueThreshold;
    
    if (combinedScore >= autoContinueThreshold) {
      return {
        needsUserInput: false,
        action: 'continue',
        reason: 'high_confidence_auto_continue'
      };
    } else if (combinedScore >= this.thresholds.userInputConfidence) {
      return {
        needsUserInput: true,
        action: 'pause',
        reason: 'user_input_detected'
      };
    } else {
      return {
        needsUserInput: false,
        action: 'continue',
        reason: 'low_confidence_continue'
      };
    }
  }

  /**
   * Detect language from text
   * @param {string} text - Text to analyze
   * @returns {string} Language code
   */
  detectLanguage(text) {
    // Simple language detection based on keywords
    for (const [lang, keywords] of Object.entries(this.userInputKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          return lang;
        }
      }
    }
    return 'en';
  }

  /**
   * Calculate keyword score based on context
   * @param {string} keyword - Keyword found
   * @param {string} text - Full text
   * @returns {number} Score
   */
  calculateKeywordScore(keyword, text) {
    const occurrences = (text.match(new RegExp(keyword, 'gi')) || []).length;
    return Math.min(occurrences * 0.3, 1.0);
  }

  /**
   * Get state score for IDE state type
   * @param {string} stateType - State type
   * @returns {number} Score
   */
  getStateScore(stateType) {
    const scores = {
      'dialog_open': 0.9,
      'input_focused': 0.8,
      'error_state': 0.7,
      'loading_state': 0.3
    };
    return scores[stateType] || 0.5;
  }

  /**
   * Get content pattern score
   * @param {string} patternType - Pattern type
   * @returns {number} Score
   */
  getContentPatternScore(patternType) {
    const scores = {
      'form_inputs': 0.8,
      'configuration_options': 0.7,
      'api_endpoints': 0.5,
      'database_queries': 0.6
    };
    return scores[patternType] || 0.5;
  }

  /**
   * Get factor weight for combined score calculation
   * @param {string} factorType - Factor type
   * @returns {number} Weight
   */
  getFactorWeight(factorType) {
    const weights = {
      'response': 0.5,
      'ide_state': 0.3,
      'file_content': 0.2
    };
    return weights[factorType] || 0.3;
  }

  /**
   * Check if element is an input element
   * @param {Object} element - Element info
   * @returns {boolean} Is input element
   */
  isInputElement(element) {
    const inputTags = ['INPUT', 'TEXTAREA', 'SELECT'];
    const inputTypes = ['text', 'email', 'password', 'number', 'search', 'tel', 'url'];
    
    return inputTags.includes(element.tagName) ||
           (element.tagName === 'INPUT' && inputTypes.includes(element.type));
  }

  /**
   * Check if text contains user input keywords
   * @param {string} text - Text to check
   * @returns {boolean} Contains user input keywords
   */
  containsUserInputKeywords(text) {
    const allKeywords = Object.values(this.userInputKeywords).flat();
    return allKeywords.some(keyword => text.includes(keyword.toLowerCase()));
  }

  /**
   * Get detection statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const totalKeywords = Object.values(this.userInputKeywords).flat().length;
    const totalLanguages = Object.keys(this.userInputKeywords).length;
    const totalStateIndicators = Object.values(this.ideStateIndicators).flat().length;
    const totalContentPatterns = Object.values(this.fileContentPatterns).flat().length;
    
    return {
      languages: totalLanguages,
      keywords: totalKeywords,
      stateIndicators: totalStateIndicators,
      contentPatterns: totalContentPatterns,
      thresholds: this.thresholds,
      config: this.config
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.logger.info('[FallbackDetection] Cleaning up fallback detection system...');
    // No specific cleanup needed for fallback detection
  }
}

module.exports = FallbackDetection; 