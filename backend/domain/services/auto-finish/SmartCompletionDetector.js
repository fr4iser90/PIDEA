const ServiceLogger = require('@logging/ServiceLogger');

class SmartCompletionDetector {
  constructor() {
    this.logger = new ServiceLogger('SmartCompletionDetector');
    
    // Completion detection patterns
    this.completionPatterns = {
      explicit: {
        keywords: ['done', 'complete', 'finished', 'ready', 'ok', 'yes', 'fertig', 'erledigt'],
        patterns: [
          /task.*complete/i,
          /work.*done/i,
          /finished.*implementation/i,
          /ready.*for.*next/i,
          /completion.*status/i
        ]
      },
      implicit: {
        patterns: [
          /here.*is.*the.*solution/i,
          /this.*should.*work/i,
          /you.*can.*now/i,
          /the.*implementation.*is/i,
          /code.*has.*been.*updated/i
        ]
      },
      summary: {
        patterns: [
          /summary.*of.*changes/i,
          /here.*is.*what.*was.*done/i,
          /changes.*made/i,
          /implementation.*complete/i,
          /solution.*provided/i
        ]
      },
      nextSteps: {
        patterns: [
          /next.*step/i,
          /you.*can.*now/i,
          /try.*running/i,
          /test.*the.*code/i,
          /verify.*the.*changes/i
        ]
      }
    };

    // Partial completion indicators
    this.partialCompletionPatterns = {
      incomplete: [
        /partially.*complete/i,
        /still.*working/i,
        /need.*more.*time/i,
        /in.*progress/i,
        /not.*finished/i
      ],
      pending: [
        /todo/i,
        /fixme/i,
        /need.*to.*add/i,
        /missing.*implementation/i,
        /requires.*more.*work/i
      ],
      questions: [
        /\?$/m,
        /what.*do.*you.*think/i,
        /should.*i.*continue/i,
        /is.*this.*correct/i,
        /need.*clarification/i
      ]
    };

    // Confidence scoring factors
    this.confidenceFactors = {
      explicitCompletion: 0.9,
      implicitCompletion: 0.7,
      summaryProvided: 0.8,
      nextStepsGiven: 0.6,
      codeQuality: 0.5,
      contextRelevance: 0.4,
      noErrors: 0.3,
      appropriateLength: 0.2
    };

    // Configuration
    this.config = {
      minConfidence: 0.7,
      maxWaitTime: 300000, // 5 minutes
      checkInterval: 2000, // 2 seconds
      stabilityChecks: 10,
      partialCompletionThreshold: 0.5
    };
  }

  // Main completion detection method
  async detectCompletion(response, context = {}) {
    try {
      this.logger.info('Detecting completion status...');

      const detection = {
        isComplete: false,
        isPartial: false,
        confidence: 0,
        indicators: [],
        completionType: 'unknown',
        quality: 'unknown',
        suggestions: [],
        duration: context.duration || 0
      };

      // Check for explicit completion
      const explicitCompletion = this.checkExplicitCompletion(response);
      if (explicitCompletion.isComplete) {
        detection.isComplete = true;
        detection.completionType = 'explicit';
        detection.confidence = explicitCompletion.confidence;
        detection.indicators.push(...explicitCompletion.indicators);
      }

      // Check for implicit completion
      const implicitCompletion = this.checkImplicitCompletion(response);
      if (implicitCompletion.isComplete && !detection.isComplete) {
        detection.isComplete = true;
        detection.completionType = 'implicit';
        detection.confidence = implicitCompletion.confidence;
        detection.indicators.push(...implicitCompletion.indicators);
      }

      // Check for partial completion
      const partialCompletion = this.checkPartialCompletion(response);
      if (partialCompletion.isPartial) {
        detection.isPartial = true;
        detection.completionType = 'partial';
        detection.confidence = partialCompletion.confidence;
        detection.indicators.push(...partialCompletion.indicators);
        detection.suggestions.push(...partialCompletion.suggestions);
      }

      // Calculate overall confidence
      detection.confidence = this.calculateOverallConfidence(detection, context);
      detection.quality = this.assessCompletionQuality(detection, context);

      this.logger.info('Completion detection completed:', {
        isComplete: detection.isComplete,
        isPartial: detection.isPartial,
        confidence: detection.confidence,
        completionType: detection.completionType
      });

      return detection;

    } catch (error) {
      this.logger.error('Completion detection failed:', error.message);
      return {
        isComplete: false,
        isPartial: false,
        confidence: 0,
        indicators: [],
        completionType: 'error',
        quality: 'unknown',
        suggestions: [],
        error: error.message
      };
    }
  }

  // Check for explicit completion indicators
  checkExplicitCompletion(response) {
    const indicators = [];
    let score = 0;
    const responseLower = response.toLowerCase();

    // Check explicit keywords
    for (const keyword of this.completionPatterns.explicit.keywords) {
      if (responseLower.includes(keyword)) {
        score += this.confidenceFactors.explicitCompletion;
        indicators.push({
          type: 'explicit_keyword',
          keyword: keyword,
          confidence: this.confidenceFactors.explicitCompletion
        });
      }
    }

    // Check explicit patterns
    for (const pattern of this.completionPatterns.explicit.patterns) {
      if (pattern.test(response)) {
        score += this.confidenceFactors.explicitCompletion * 0.8;
        indicators.push({
          type: 'explicit_pattern',
          pattern: pattern.source,
          confidence: this.confidenceFactors.explicitCompletion * 0.8
        });
      }
    }

    return {
      isComplete: score > 0.5,
      confidence: Math.min(score, 1.0),
      indicators: indicators
    };
  }

  // Check for implicit completion indicators
  checkImplicitCompletion(response) {
    const indicators = [];
    let score = 0;
    const responseLower = response.toLowerCase();

    // Check implicit patterns
    for (const pattern of this.completionPatterns.implicit.patterns) {
      if (pattern.test(response)) {
        score += this.confidenceFactors.implicitCompletion;
        indicators.push({
          type: 'implicit_pattern',
          pattern: pattern.source,
          confidence: this.confidenceFactors.implicitCompletion
        });
      }
    }

    // Check summary patterns
    for (const pattern of this.completionPatterns.summary.patterns) {
      if (pattern.test(response)) {
        score += this.confidenceFactors.summaryProvided;
        indicators.push({
          type: 'summary_pattern',
          pattern: pattern.source,
          confidence: this.confidenceFactors.summaryProvided
        });
      }
    }

    // Check next steps patterns
    for (const pattern of this.completionPatterns.nextSteps.patterns) {
      if (pattern.test(response)) {
        score += this.confidenceFactors.nextStepsGiven;
        indicators.push({
          type: 'next_steps_pattern',
          pattern: pattern.source,
          confidence: this.confidenceFactors.nextStepsGiven
        });
      }
    }

    return {
      isComplete: score > 0.6,
      confidence: Math.min(score, 1.0),
      indicators: indicators
    };
  }

  // Check for partial completion indicators
  checkPartialCompletion(response) {
    const indicators = [];
    const suggestions = [];
    let score = 0;
    const responseLower = response.toLowerCase();

    // Check incomplete patterns
    for (const pattern of this.partialCompletionPatterns.incomplete) {
      if (pattern.test(response)) {
        score += 0.3;
        indicators.push({
          type: 'incomplete_indicator',
          pattern: pattern.source,
          confidence: 0.3
        });
        suggestions.push('Response indicates work is still in progress');
      }
    }

    // Check pending patterns
    for (const pattern of this.partialCompletionPatterns.pending) {
      if (pattern.test(response)) {
        score += 0.4;
        indicators.push({
          type: 'pending_indicator',
          pattern: pattern.source,
          confidence: 0.4
        });
        suggestions.push('Response contains pending items or TODO markers');
      }
    }

    // Check question patterns
    for (const pattern of this.partialCompletionPatterns.questions) {
      if (pattern.test(response)) {
        score += 0.5;
        indicators.push({
          type: 'question_indicator',
          pattern: pattern.source,
          confidence: 0.5
        });
        suggestions.push('Response contains questions, indicating need for clarification');
      }
    }

    return {
      isPartial: score > this.config.partialCompletionThreshold,
      confidence: Math.min(score, 1.0),
      indicators: indicators,
      suggestions: suggestions
    };
  }

  // Calculate overall confidence
  calculateOverallConfidence(detection, context) {
    let confidence = detection.confidence;

    // Adjust based on response quality
    if (context.qualityAssessment) {
      confidence += context.qualityAssessment.overallScore * 0.2;
    }

    // Adjust based on context relevance
    if (context.contextValidation) {
      confidence += context.contextValidation.overallScore * 0.15;
    }

    // Adjust based on response length (appropriate length gets bonus)
    const responseLength = context.response?.length || 0;
    if (responseLength > 50 && responseLength < 2000) {
      confidence += this.confidenceFactors.appropriateLength;
    }

    // Adjust based on code quality
    if (context.hasCode && !context.hasErrors) {
      confidence += this.confidenceFactors.codeQuality;
    }

    return Math.min(confidence, 1.0);
  }

  // Assess completion quality
  assessCompletionQuality(detection, context) {
    if (detection.confidence >= 0.9) return 'excellent';
    if (detection.confidence >= 0.8) return 'very_good';
    if (detection.confidence >= 0.7) return 'good';
    if (detection.confidence >= 0.6) return 'fair';
    if (detection.confidence >= 0.5) return 'poor';
    return 'very_poor';
  }

  // Smart waiting with intelligent completion detection
  async waitForCompletion(getResponse, context = {}) {
    const startTime = Date.now();
    let lastResponse = '';
    let stableCount = 0;
    let lastCompletionDetection = null;

    this.logger.info('Starting smart completion detection...');

    while (Date.now() - startTime < this.config.maxWaitTime) {
      try {
        // Get current response
        const currentResponse = await getResponse();
        
        if (!currentResponse || currentResponse === lastResponse) {
          // Response hasn't changed, check for completion
          const completionDetection = await this.detectCompletion(currentResponse, {
            ...context,
            response: currentResponse,
            duration: Date.now() - startTime
          });

          if (completionDetection.isComplete && completionDetection.confidence >= this.config.minConfidence) {
            this.logger.info('Completion detected with high confidence:', completionDetection);
            return {
              success: true,
              response: currentResponse,
              completion: completionDetection,
              duration: Date.now() - startTime
            };
          }

          if (lastCompletionDetection && 
              completionDetection.confidence === lastCompletionDetection.confidence) {
            stableCount++;
          } else {
            stableCount = 0;
          }

          lastCompletionDetection = completionDetection;

          // If we have stable completion detection, consider it complete
          if (stableCount >= this.config.stabilityChecks && 
              completionDetection.confidence >= this.config.minConfidence * 0.8) {
            this.logger.info('Stable completion detected:', completionDetection);
            return {
              success: true,
              response: currentResponse,
              completion: completionDetection,
              duration: Date.now() - startTime,
              stable: true
            };
          }
        } else {
          // Response changed, reset stability counter
          stableCount = 0;
          lastCompletionDetection = null;
        }

        lastResponse = currentResponse;

        // Wait before next check
        await this.sleep(this.config.checkInterval);

      } catch (error) {
        this.logger.error('Error during completion detection:', error.message);
        await this.sleep(this.config.checkInterval);
      }
    }

    // Timeout reached
    this.logger.warn('Completion detection timeout reached');
    return {
      success: false,
      response: lastResponse,
      completion: lastCompletionDetection,
      duration: Date.now() - startTime,
      timeout: true
    };
  }

  // Detect semantic completion
  detectSemanticCompletion(response, userIntent) {
    const responseLower = response.toLowerCase();
    let semanticScore = 0;
    const indicators = [];

    // Check if response addresses the user intent semantically
    if (userIntent) {
      const intentKeywords = this.extractIntentKeywords(userIntent);
      const responseKeywords = this.extractResponseKeywords(response);
      
      const keywordOverlap = this.calculateKeywordOverlap(intentKeywords, responseKeywords);
      if (keywordOverlap > 0.6) {
        semanticScore += 0.4;
        indicators.push({
          type: 'semantic_intent_match',
          overlap: keywordOverlap,
          confidence: 0.4
        });
      }
    }

    // Check for solution completeness indicators
    const solutionIndicators = [
      /solution.*provided/i,
      /implementation.*complete/i,
      /code.*ready/i,
      /working.*solution/i
    ];

    for (const indicator of solutionIndicators) {
      if (indicator.test(responseLower)) {
        semanticScore += 0.3;
        indicators.push({
          type: 'solution_completeness',
          indicator: indicator.source,
          confidence: 0.3
        });
      }
    }

    return {
      isSemanticallyComplete: semanticScore > 0.5,
      score: semanticScore,
      indicators: indicators
    };
  }

  // Extract keywords from text
  extractKeywords(text) {
    if (!text) return [];
    
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    // Remove common stop words
    const stopWords = ['the', 'and', 'for', 'with', 'this', 'that', 'have', 'will', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'just', 'into', 'than', 'more', 'other', 'about', 'many', 'then', 'them', 'these', 'so', 'people', 'can', 'said', 'each', 'which', 'she', 'do', 'how', 'their', 'if', 'up', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would', 'make', 'like', 'into', 'him', 'time', 'two', 'more', 'go', 'no', 'way', 'could', 'my', 'than', 'first', 'been', 'call', 'who', 'its', 'now', 'find', 'long', 'down', 'day', 'did', 'get', 'come', 'made', 'may', 'part'];
    
    return words.filter(word => !stopWords.includes(word));
  }

  // Extract intent keywords
  extractIntentKeywords(intent) {
    return this.extractKeywords(intent);
  }

  // Extract response keywords
  extractResponseKeywords(response) {
    return this.extractKeywords(response);
  }

  // Calculate keyword overlap
  calculateKeywordOverlap(intentKeywords, responseKeywords) {
    if (intentKeywords.length === 0 || responseKeywords.length === 0) {
      return 0;
    }

    const intentSet = new Set(intentKeywords);
    const responseSet = new Set(responseKeywords);
    
    const intersection = new Set([...intentSet].filter(x => responseSet.has(x)));
    const union = new Set([...intentSet, ...responseSet]);
    
    return intersection.size / union.size;
  }

  // Detect partial completion with suggestions
  detectPartialCompletionWithSuggestions(response, context) {
    const partialDetection = this.checkPartialCompletion(response);
    const suggestions = [...partialDetection.suggestions];

    // Add context-specific suggestions
    if (context.userIntent) {
      const intentKeywords = this.extractIntentKeywords(context.userIntent);
      const responseKeywords = this.extractResponseKeywords(response);
      
      const missingKeywords = intentKeywords.filter(keyword => 
        !responseKeywords.includes(keyword)
      );

      if (missingKeywords.length > 0) {
        suggestions.push(`Consider addressing: ${missingKeywords.slice(0, 3).join(', ')}`);
      }
    }

    // Add code-specific suggestions
    if (response.includes('```') && !response.includes('complete')) {
      suggestions.push('Consider adding completion status or next steps');
    }

    // Add length-based suggestions
    if (response.length < 50) {
      suggestions.push('Response seems brief, consider adding more details');
    }

    return {
      ...partialDetection,
      suggestions: suggestions
    };
  }

  // Get completion statistics
  getCompletionStats() {
    return {
      patterns: {
        explicit: this.completionPatterns.explicit.patterns.length,
        implicit: this.completionPatterns.implicit.patterns.length,
        summary: this.completionPatterns.summary.patterns.length,
        nextSteps: this.completionPatterns.nextSteps.patterns.length,
        partial: Object.values(this.partialCompletionPatterns).flat().length
      },
      confidenceFactors: this.confidenceFactors,
      config: this.config
    };
  }

  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Configuration updated:', this.config);
  }

  // Sleep utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = SmartCompletionDetector; 