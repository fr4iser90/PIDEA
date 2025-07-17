const ServiceLogger = require('@logging/ServiceLogger');

class ContextAwareValidator {
  constructor() {
    this.logger = new ServiceLogger('ContextAwareValidator');
    
    // Intent detection patterns
    this.intentPatterns = {
      codeReview: {
        keywords: ['review', 'check', 'examine', 'analyze', 'inspect', 'audit'],
        patterns: [
          /review.*code/i,
          /check.*code/i,
          /analyze.*code/i,
          /find.*issues/i,
          /look.*for.*problems/i
        ]
      },
      codeGeneration: {
        keywords: ['create', 'generate', 'write', 'build', 'develop', 'implement'],
        patterns: [
          /create.*function/i,
          /generate.*code/i,
          /write.*class/i,
          /build.*component/i,
          /implement.*feature/i
        ]
      },
      debugging: {
        keywords: ['fix', 'debug', 'solve', 'resolve', 'troubleshoot', 'error'],
        patterns: [
          /fix.*error/i,
          /debug.*issue/i,
          /solve.*problem/i,
          /resolve.*bug/i,
          /troubleshoot.*issue/i
        ]
      },
      explanation: {
        keywords: ['explain', 'describe', 'clarify', 'understand', 'how', 'why'],
        patterns: [
          /explain.*code/i,
          /describe.*function/i,
          /clarify.*logic/i,
          /how.*works/i,
          /why.*happens/i
        ]
      },
      refactoring: {
        keywords: ['refactor', 'improve', 'optimize', 'clean', 'restructure', 'simplify'],
        patterns: [
          /refactor.*code/i,
          /improve.*performance/i,
          /optimize.*function/i,
          /clean.*up/i,
          /simplify.*logic/i
        ]
      }
    };

    // Context relevance patterns
    this.contextPatterns = {
      buildsOnPrevious: [
        /as.*mentioned/i,
        /following.*up/i,
        /continuing.*from/i,
        /based.*on.*previous/i,
        /extending.*the.*solution/i
      ],
      maintainsContext: [
        /in.*this.*context/i,
        /given.*the.*situation/i,
        /considering.*the.*code/i,
        /with.*regard.*to/i,
        /in.*relation.*to/i
      ],
      providesContinuity: [
        /next.*step/i,
        /further.*improvement/i,
        /additional.*consideration/i,
        /building.*upon/i,
        /enhancing.*the.*solution/i
      ]
    };

    // Response appropriateness patterns
    this.appropriatenessPatterns = {
      addressesOriginalQuestion: [
        /answer.*question/i,
        /address.*concern/i,
        /resolve.*issue/i,
        /provide.*solution/i,
        /meet.*requirement/i
      ],
      providesCompleteSolution: [
        /complete.*solution/i,
        /full.*implementation/i,
        /comprehensive.*answer/i,
        /thorough.*explanation/i,
        /detailed.*response/i
      ],
      suggestsNextSteps: [
        /next.*step/i,
        /further.*action/i,
        /additional.*work/i,
        /consider.*also/i,
        /you.*might.*want/i
      ]
    };
  }

  // Main context validation method
  async validateResponse(response, userIntent, conversationHistory) {
    try {
      this.logger.info('Validating response context...');

      const validation = {
        intentMatch: this.validateIntentMatch(response, userIntent),
        contextRelevance: this.validateContextRelevance(response, conversationHistory),
        completeness: this.validateCompleteness(response, userIntent),
        appropriateness: this.validateAppropriateness(response, userIntent),
        overallScore: 0,
        confidence: 0
      };

      // Calculate overall score
      validation.overallScore = this.calculateOverallScore(validation);
      validation.confidence = this.calculateConfidence(validation);

      this.logger.info('Context validation completed:', {
        overallScore: validation.overallScore,
        confidence: validation.confidence
      });

      return validation;

    } catch (error) {
      this.logger.error('Context validation failed:', error.message);
      return {
        intentMatch: { score: 0, factors: [] },
        contextRelevance: { score: 0, factors: [] },
        completeness: { score: 0, factors: [] },
        appropriateness: { score: 0, factors: [] },
        overallScore: 0,
        confidence: 0,
        error: error.message
      };
    }
  }

  // Validate if response matches user intent
  validateIntentMatch(response, userIntent) {
    const factors = [];
    let score = 0;

    // Detect user intent
    const detectedIntent = this.detectUserIntent(userIntent);
    
    // Check if response addresses the detected intent
    if (detectedIntent.type && this.responseAddressesIntent(response, detectedIntent)) {
      score += 0.6;
      factors.push({
        type: 'addresses_intent',
        score: 0.6,
        details: `Response addresses ${detectedIntent.type} intent`,
        confidence: detectedIntent.confidence
      });
    }

    // Check for intent-specific patterns
    const intentSpecificScore = this.checkIntentSpecificPatterns(response, detectedIntent);
    if (intentSpecificScore > 0) {
      score += intentSpecificScore;
      factors.push({
        type: 'intent_specific_patterns',
        score: intentSpecificScore,
        details: 'Response contains intent-specific patterns',
        confidence: 0.8
      });
    }

    // Check for keyword relevance
    const keywordScore = this.checkKeywordRelevance(response, detectedIntent);
    if (keywordScore > 0) {
      score += keywordScore;
      factors.push({
        type: 'keyword_relevance',
        score: keywordScore,
        details: 'Response contains relevant keywords',
        confidence: 0.7
      });
    }

    return {
      score: Math.min(score, 1.0),
      factors,
      detectedIntent
    };
  }

  // Validate context relevance
  validateContextRelevance(response, conversationHistory) {
    const factors = [];
    let score = 0;

    if (!conversationHistory || conversationHistory.length === 0) {
      return { score: 0.5, factors: [{ type: 'no_context', score: 0.5, details: 'No conversation history available' }] };
    }

    // Check if response builds on previous context
    const buildsOnPrevious = this.checkBuildsOnPrevious(response, conversationHistory);
    if (buildsOnPrevious) {
      score += 0.4;
      factors.push({
        type: 'builds_on_previous',
        score: 0.4,
        details: 'Response builds on previous conversation context',
        confidence: 0.8
      });
    }

    // Check if response maintains conversation context
    const maintainsContext = this.checkMaintainsContext(response, conversationHistory);
    if (maintainsContext) {
      score += 0.3;
      factors.push({
        type: 'maintains_context',
        score: 0.3,
        details: 'Response maintains conversation context',
        confidence: 0.7
      });
    }

    // Check for continuity indicators
    const continuityScore = this.checkContinuityIndicators(response);
    if (continuityScore > 0) {
      score += continuityScore;
      factors.push({
        type: 'continuity_indicators',
        score: continuityScore,
        details: 'Response provides conversation continuity',
        confidence: 0.6
      });
    }

    return {
      score: Math.min(score, 1.0),
      factors
    };
  }

  // Validate response completeness
  validateCompleteness(response, userIntent) {
    const factors = [];
    let score = 0;

    // Check if response covers all aspects of the intent
    const coverageScore = this.checkResponseCoverage(response, userIntent);
    if (coverageScore > 0) {
      score += coverageScore;
      factors.push({
        type: 'response_coverage',
        score: coverageScore,
        details: 'Response covers intent aspects',
        confidence: 0.8
      });
    }

    // Check for solution completeness
    const solutionScore = this.checkSolutionCompleteness(response);
    if (solutionScore > 0) {
      score += solutionScore;
      factors.push({
        type: 'solution_completeness',
        score: solutionScore,
        details: 'Response provides complete solution',
        confidence: 0.7
      });
    }

    // Check for explanation quality
    const explanationScore = this.checkExplanationQuality(response);
    if (explanationScore > 0) {
      score += explanationScore;
      factors.push({
        type: 'explanation_quality',
        score: explanationScore,
        details: 'Response includes quality explanations',
        confidence: 0.6
      });
    }

    return {
      score: Math.min(score, 1.0),
      factors
    };
  }

  // Validate response appropriateness
  validateAppropriateness(response, userIntent) {
    const factors = [];
    let score = 0;

    // Check if response addresses the original question
    const addressesQuestion = this.checkAddressesQuestion(response, userIntent);
    if (addressesQuestion) {
      score += 0.5;
      factors.push({
        type: 'addresses_question',
        score: 0.5,
        details: 'Response addresses the original question',
        confidence: 0.9
      });
    }

    // Check for appropriate response type
    const responseTypeScore = this.checkResponseType(response, userIntent);
    if (responseTypeScore > 0) {
      score += responseTypeScore;
      factors.push({
        type: 'response_type',
        score: responseTypeScore,
        details: 'Response type matches intent',
        confidence: 0.8
      });
    }

    // Check for helpful suggestions
    const suggestionsScore = this.checkHelpfulSuggestions(response);
    if (suggestionsScore > 0) {
      score += suggestionsScore;
      factors.push({
        type: 'helpful_suggestions',
        score: suggestionsScore,
        details: 'Response includes helpful suggestions',
        confidence: 0.6
      });
    }

    return {
      score: Math.min(score, 1.0),
      factors
    };
  }

  // Detect user intent from message
  detectUserIntent(message) {
    const intent = {
      type: 'unknown',
      confidence: 0,
      keywords: [],
      patterns: []
    };

    const messageLower = message.toLowerCase();

    // Check each intent type
    for (const [intentType, patterns] of Object.entries(this.intentPatterns)) {
      let intentScore = 0;
      const matchedKeywords = [];
      const matchedPatterns = [];

      // Check keywords
      for (const keyword of patterns.keywords) {
        if (messageLower.includes(keyword)) {
          intentScore += 0.3;
          matchedKeywords.push(keyword);
        }
      }

      // Check patterns
      for (const pattern of patterns.patterns) {
        if (pattern.test(message)) {
          intentScore += 0.5;
          matchedPatterns.push(pattern.source);
        }
      }

      // Update intent if this type has higher score
      if (intentScore > intent.confidence) {
        intent.type = intentType;
        intent.confidence = Math.min(intentScore, 1.0);
        intent.keywords = matchedKeywords;
        intent.patterns = matchedPatterns;
      }
    }

    return intent;
  }

  // Check if response addresses the detected intent
  responseAddressesIntent(response, detectedIntent) {
    const responseLower = response.toLowerCase();

    switch (detectedIntent.type) {
      case 'codeReview':
        return this.checkCodeReviewResponse(responseLower);
      case 'codeGeneration':
        return this.checkCodeGenerationResponse(responseLower);
      case 'debugging':
        return this.checkDebuggingResponse(responseLower);
      case 'explanation':
        return this.checkExplanationResponse(responseLower);
      case 'refactoring':
        return this.checkRefactoringResponse(responseLower);
      default:
        return false;
    }
  }

  // Check intent-specific response patterns
  checkIntentSpecificPatterns(response, detectedIntent) {
    const responseLower = response.toLowerCase();
    let score = 0;

    switch (detectedIntent.type) {
      case 'codeReview':
        if (/review.*complete/i.test(responseLower) || /analysis.*done/i.test(responseLower)) {
          score += 0.3;
        }
        break;
      case 'codeGeneration':
        if (/here.*is.*the.*code/i.test(responseLower) || /generated.*code/i.test(responseLower)) {
          score += 0.3;
        }
        break;
      case 'debugging':
        if (/issue.*fixed/i.test(responseLower) || /problem.*solved/i.test(responseLower)) {
          score += 0.3;
        }
        break;
      case 'explanation':
        if (/explanation.*provided/i.test(responseLower) || /here.*is.*how/i.test(responseLower)) {
          score += 0.3;
        }
        break;
      case 'refactoring':
        if (/refactored.*code/i.test(responseLower) || /improved.*version/i.test(responseLower)) {
          score += 0.3;
        }
        break;
    }

    return score;
  }

  // Check keyword relevance
  checkKeywordRelevance(response, detectedIntent) {
    const responseLower = response.toLowerCase();
    let score = 0;

    for (const keyword of detectedIntent.keywords) {
      if (responseLower.includes(keyword)) {
        score += 0.1;
      }
    }

    return Math.min(score, 0.3);
  }

  // Check if response builds on previous context
  checkBuildsOnPrevious(response, conversationHistory) {
    const responseLower = response.toLowerCase();
    
    for (const pattern of this.contextPatterns.buildsOnPrevious) {
      if (pattern.test(responseLower)) {
        return true;
      }
    }

    return false;
  }

  // Check if response maintains context
  checkMaintainsContext(response, conversationHistory) {
    const responseLower = response.toLowerCase();
    
    for (const pattern of this.contextPatterns.maintainsContext) {
      if (pattern.test(responseLower)) {
        return true;
      }
    }

    return false;
  }

  // Check continuity indicators
  checkContinuityIndicators(response) {
    const responseLower = response.toLowerCase();
    let score = 0;

    for (const pattern of this.contextPatterns.providesContinuity) {
      if (pattern.test(responseLower)) {
        score += 0.2;
      }
    }

    return Math.min(score, 0.4);
  }

  // Check response coverage
  checkResponseCoverage(response, userIntent) {
    const responseLower = response.toLowerCase();
    let score = 0;

    // Check for comprehensive response indicators
    if (/comprehensive/i.test(responseLower) || /complete.*solution/i.test(responseLower)) {
      score += 0.4;
    }

    // Check for multiple aspects covered
    if (/additionally/i.test(responseLower) || /furthermore/i.test(responseLower)) {
      score += 0.2;
    }

    return Math.min(score, 0.6);
  }

  // Check solution completeness
  checkSolutionCompleteness(response) {
    const responseLower = response.toLowerCase();
    let score = 0;

    // Check for complete solution indicators
    if (/complete.*solution/i.test(responseLower) || /full.*implementation/i.test(responseLower)) {
      score += 0.4;
    }

    // Check for next steps
    if (/next.*step/i.test(responseLower) || /you.*can.*now/i.test(responseLower)) {
      score += 0.2;
    }

    return Math.min(score, 0.6);
  }

  // Check explanation quality
  checkExplanationQuality(response) {
    const responseLower = response.toLowerCase();
    let score = 0;

    // Check for detailed explanations
    if (/explanation/i.test(responseLower) || /detailed/i.test(responseLower)) {
      score += 0.3;
    }

    // Check for examples
    if (/example/i.test(responseLower) || /for.*instance/i.test(responseLower)) {
      score += 0.2;
    }

    return Math.min(score, 0.5);
  }

  // Check if response addresses the question
  checkAddressesQuestion(response, userIntent) {
    const responseLower = response.toLowerCase();
    
    for (const pattern of this.appropriatenessPatterns.addressesOriginalQuestion) {
      if (pattern.test(responseLower)) {
        return true;
      }
    }

    return false;
  }

  // Check response type appropriateness
  checkResponseType(response, userIntent) {
    const responseLower = response.toLowerCase();
    let score = 0;

    // Check for appropriate response type based on intent
    switch (userIntent.type) { // Use userIntent.type here
      case 'codeReview':
        if (/review.*complete/i.test(responseLower) || /analysis.*provided/i.test(responseLower)) {
          score += 0.3;
        }
        break;
      case 'codeGeneration':
        if (/here.*is.*the.*code/i.test(responseLower) || /generated.*code/i.test(responseLower)) {
          score += 0.3;
        }
        break;
      case 'debugging':
        if (/issue.*resolved/i.test(responseLower) || /problem.*fixed/i.test(responseLower)) {
          score += 0.3;
        }
        break;
      case 'explanation':
        if (/explanation.*provided/i.test(responseLower) || /here.*is.*how/i.test(responseLower)) {
          score += 0.3;
        }
        break;
      case 'refactoring':
        if (/refactored.*code/i.test(responseLower) || /improved.*version/i.test(responseLower)) {
          score += 0.3;
        }
        break;
    }

    return score;
  }

  // Check for helpful suggestions
  checkHelpfulSuggestions(response) {
    const responseLower = response.toLowerCase();
    let score = 0;

    for (const pattern of this.appropriatenessPatterns.suggestsNextSteps) {
      if (pattern.test(responseLower)) {
        score += 0.2;
      }
    }

    return Math.min(score, 0.4);
  }

  // Intent-specific response checks
  checkCodeReviewResponse(responseLower) {
    return /review.*complete/i.test(responseLower) || 
           /analysis.*done/i.test(responseLower) || 
           /issues.*found/i.test(responseLower);
  }

  checkCodeGenerationResponse(responseLower) {
    return /here.*is.*the.*code/i.test(responseLower) || 
           /generated.*code/i.test(responseLower) || 
           /implementation.*provided/i.test(responseLower);
  }

  checkDebuggingResponse(responseLower) {
    return /issue.*fixed/i.test(responseLower) || 
           /problem.*solved/i.test(responseLower) || 
           /error.*resolved/i.test(responseLower);
  }

  checkExplanationResponse(responseLower) {
    return /explanation.*provided/i.test(responseLower) || 
           /here.*is.*how/i.test(responseLower) || 
           /clarification.*given/i.test(responseLower);
  }

  checkRefactoringResponse(responseLower) {
    return /refactored.*code/i.test(responseLower) || 
           /improved.*version/i.test(responseLower) || 
           /optimized.*code/i.test(responseLower);
  }

  // Calculate overall score
  calculateOverallScore(validation) {
    const weights = {
      intentMatch: 0.3,
      contextRelevance: 0.25,
      completeness: 0.25,
      appropriateness: 0.2
    };

    return (
      validation.intentMatch.score * weights.intentMatch +
      validation.contextRelevance.score * weights.contextRelevance +
      validation.completeness.score * weights.completeness +
      validation.appropriateness.score * weights.appropriateness
    );
  }

  // Calculate confidence
  calculateConfidence(validation) {
    const factors = [
      validation.intentMatch.score,
      validation.contextRelevance.score,
      validation.completeness.score,
      validation.appropriateness.score
    ];

    const validFactors = factors.filter(score => score > 0);
    if (validFactors.length === 0) return 0;

    return validFactors.reduce((sum, score) => sum + score, 0) / validFactors.length;
  }
}

module.exports = ContextAwareValidator; 