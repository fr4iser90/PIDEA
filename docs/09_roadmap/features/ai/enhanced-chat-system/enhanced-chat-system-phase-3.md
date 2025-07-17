# Enhanced Chat System – Phase 3: Context-Aware Validation

## Overview
Implement context-aware validation that understands user intent, tracks conversation history, and validates responses based on the broader conversation context. This phase enhances the basic response validation to include intelligent context understanding, multi-turn conversation analysis, and response appropriateness scoring.

## Objectives
- [ ] Enhance existing ChatMessageHandler with context awareness
- [ ] Implement user intent understanding in existing validation logic
- [ ] Add conversation context tracking to ChatHistoryExtractor
- [ ] Create response appropriateness scoring in AutoFinishSystem
- [ ] Add multi-turn conversation analysis using existing chat history
- [ ] Implement context matching algorithms in current validation flow

## Deliverables
- File: `backend/domain/services/chat/ChatMessageHandler.js` - Context-aware validation
- File: `backend/domain/services/chat/ChatHistoryExtractor.js` - Enhanced context tracking
- File: `backend/domain/services/auto-finish/AutoFinishSystem.js` - Context integration
- File: `backend/domain/services/auto-finish/ConfirmationSystem.js` - Context-aware validation
- API: Context validation endpoints
- Test: `tests/unit/ContextAwareValidator.test.js` - Context validation tests

## Dependencies
- Requires: Phase 2 completion (Response Quality Engine)
- Blocks: Phase 4 start (Smart Completion Detection)

## Estimated Time
6 hours

## Implementation Details

### 1. Context-Aware Validator Class
```javascript
// New file: backend/domain/services/auto-finish/ContextAwareValidator.js
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
    const intentPatterns = this.intentPatterns[detectedIntent.type];
    if (intentPatterns) {
      const matchingPatterns = intentPatterns.patterns.filter(pattern => 
        pattern.test(response)
      );
      
      if (matchingPatterns.length > 0) {
        score += 0.4;
        factors.push({
          type: 'intent_patterns',
          score: 0.4,
          details: `${matchingPatterns.length} intent-specific patterns found`,
          patterns: matchingPatterns.map(p => p.source)
        });
      }
    }

    return {
      score: Math.min(score, 1.0),
      factors,
      details: `Intent match score: ${score.toFixed(2)}`,
      detectedIntent
    };
  }

  // Validate context relevance
  validateContextRelevance(response, conversationHistory) {
    const factors = [];
    let score = 0;

    if (!conversationHistory || conversationHistory.length === 0) {
      return {
        score: 0.5, // Neutral score when no context
        factors: [{ type: 'no_context', score: 0.5, details: 'No conversation history available' }],
        details: 'No context available for relevance assessment'
      };
    }

    // Check if response builds on previous messages
    if (this.contextPatterns.buildsOnPrevious.some(pattern => pattern.test(response))) {
      score += 0.4;
      factors.push({
        type: 'builds_on_previous',
        score: 0.4,
        details: 'Response builds on previous conversation'
      });
    }

    // Check if response maintains context
    if (this.contextPatterns.maintainsContext.some(pattern => pattern.test(response))) {
      score += 0.3;
      factors.push({
        type: 'maintains_context',
        score: 0.3,
        details: 'Response maintains conversation context'
      });
    }

    // Check if response provides continuity
    if (this.contextPatterns.providesContinuity.some(pattern => pattern.test(response))) {
      score += 0.3;
      factors.push({
        type: 'provides_continuity',
        score: 0.3,
        details: 'Response provides conversation continuity'
      });
    }

    // Check for references to previous messages
    const previousReferences = this.findPreviousReferences(response, conversationHistory);
    if (previousReferences.length > 0) {
      score += 0.2;
      factors.push({
        type: 'references_previous',
        score: 0.2,
        details: `References ${previousReferences.length} previous message(s)`,
        references: previousReferences
      });
    }

    return {
      score: Math.min(score, 1.0),
      factors,
      details: `Context relevance score: ${score.toFixed(2)}`
    };
  }

  // Validate response completeness in context
  validateCompleteness(response, userIntent) {
    const factors = [];
    let score = 0;

    // Check if response addresses the original question
    if (this.appropriatenessPatterns.addressesOriginalQuestion.some(pattern => pattern.test(response))) {
      score += 0.4;
      factors.push({
        type: 'addresses_question',
        score: 0.4,
        details: 'Response addresses the original question'
      });
    }

    // Check if response provides a complete solution
    if (this.appropriatenessPatterns.providesCompleteSolution.some(pattern => pattern.test(response))) {
      score += 0.3;
      factors.push({
        type: 'complete_solution',
        score: 0.3,
        details: 'Response provides a complete solution'
      });
    }

    // Check if response suggests next steps
    if (this.appropriatenessPatterns.suggestsNextSteps.some(pattern => pattern.test(response))) {
      score += 0.2;
      factors.push({
        type: 'suggests_next_steps',
        score: 0.2,
        details: 'Response suggests next steps'
      });
    }

    // Check for code examples (if intent suggests code is needed)
    const detectedIntent = this.detectUserIntent(userIntent);
    if (detectedIntent.type === 'codeGeneration' || detectedIntent.type === 'codeReview') {
      if (response.includes('```')) {
        score += 0.1;
        factors.push({
          type: 'includes_code',
          score: 0.1,
          details: 'Response includes code examples'
        });
      }
    }

    return {
      score: Math.min(score, 1.0),
      factors,
      details: `Completeness score: ${score.toFixed(2)}`
    };
  }

  // Validate response appropriateness
  validateAppropriateness(response, userIntent) {
    const factors = [];
    let score = 0;

    // Check response length appropriateness
    const responseLength = response.length;
    const detectedIntent = this.detectUserIntent(userIntent);
    
    if (detectedIntent.type === 'explanation' && responseLength > 200) {
      score += 0.3;
      factors.push({
        type: 'detailed_explanation',
        score: 0.3,
        details: 'Detailed explanation provided'
      });
    } else if (detectedIntent.type === 'codeGeneration' && responseLength > 100) {
      score += 0.3;
      factors.push({
        type: 'substantial_code',
        score: 0.3,
        details: 'Substantial code provided'
      });
    } else if (detectedIntent.type === 'debugging' && responseLength > 150) {
      score += 0.3;
      factors.push({
        type: 'comprehensive_debugging',
        score: 0.3,
        details: 'Comprehensive debugging response'
      });
    }

    // Check for appropriate tone
    const hasAppropriateTone = this.checkAppropriateTone(response, detectedIntent.type);
    if (hasAppropriateTone) {
      score += 0.2;
      factors.push({
        type: 'appropriate_tone',
        score: 0.2,
        details: 'Response has appropriate tone for intent'
      });
    }

    // Check for helpfulness indicators
    const helpfulnessScore = this.assessHelpfulness(response);
    if (helpfulnessScore > 0.5) {
      score += 0.3;
      factors.push({
        type: 'helpful_response',
        score: 0.3,
        details: 'Response is helpful and informative'
      });
    }

    // Check for clarity
    const clarityScore = this.assessClarity(response);
    if (clarityScore > 0.6) {
      score += 0.2;
      factors.push({
        type: 'clear_response',
        score: 0.2,
        details: 'Response is clear and understandable'
      });
    }

    return {
      score: Math.min(score, 1.0),
      factors,
      details: `Appropriateness score: ${score.toFixed(2)}`
    };
  }

  // Detect user intent from message
  detectUserIntent(message) {
    const lowerMessage = message.toLowerCase();
    let bestMatch = { type: 'general', confidence: 0.3 };

    for (const [intentType, patterns] of Object.entries(this.intentPatterns)) {
      let matchScore = 0;
      let matchCount = 0;

      // Check keywords
      for (const keyword of patterns.keywords) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          matchScore += 0.3;
          matchCount++;
        }
      }

      // Check patterns
      for (const pattern of patterns.patterns) {
        if (pattern.test(lowerMessage)) {
          matchScore += 0.5;
          matchCount++;
        }
      }

      // Calculate confidence
      const confidence = matchCount > 0 ? Math.min(matchScore / matchCount, 1.0) : 0;

      if (confidence > bestMatch.confidence) {
        bestMatch = { type: intentType, confidence };
      }
    }

    return bestMatch;
  }

  // Check if response addresses detected intent
  responseAddressesIntent(response, detectedIntent) {
    const responseLower = response.toLowerCase();
    
    switch (detectedIntent.type) {
      case 'codeReview':
        return /review|check|analyze|issue|problem|improvement/i.test(responseLower);
      case 'codeGeneration':
        return /```|function|class|code|implementation/i.test(responseLower);
      case 'debugging':
        return /fix|debug|error|solution|resolve/i.test(responseLower);
      case 'explanation':
        return /explain|describe|clarify|understand|because/i.test(responseLower);
      case 'refactoring':
        return /refactor|improve|optimize|clean|simplify/i.test(responseLower);
      default:
        return true; // General intent is always addressed
    }
  }

  // Find references to previous messages
  findPreviousReferences(response, conversationHistory) {
    const references = [];
    const responseLower = response.toLowerCase();

    // Look for references to previous messages
    for (let i = 0; i < conversationHistory.length; i++) {
      const message = conversationHistory[i];
      const messageContent = message.content.toLowerCase();
      
      // Check for direct references
      if (responseLower.includes(`message ${i + 1}`) || 
          responseLower.includes(`previous message`) ||
          responseLower.includes(`earlier message`)) {
        references.push({ index: i, type: 'direct_reference' });
      }

      // Check for content similarity
      const commonWords = this.findCommonWords(responseLower, messageContent);
      if (commonWords.length > 3) {
        references.push({ index: i, type: 'content_similarity', words: commonWords });
      }
    }

    return references;
  }

  // Find common words between two texts
  findCommonWords(text1, text2) {
    const words1 = text1.split(/\s+/).filter(word => word.length > 3);
    const words2 = text2.split(/\s+/).filter(word => word.length > 3);
    
    return words1.filter(word => words2.includes(word));
  }

  // Check appropriate tone for intent
  checkAppropriateTone(response, intentType) {
    const responseLower = response.toLowerCase();
    
    switch (intentType) {
      case 'codeReview':
        return /constructive|helpful|suggestion|improvement/i.test(responseLower);
      case 'debugging':
        return /solution|fix|resolve|help/i.test(responseLower);
      case 'explanation':
        return /clear|understand|explain|clarify/i.test(responseLower);
      case 'codeGeneration':
        return /here|provide|create|generate/i.test(responseLower);
      default:
        return true;
    }
  }

  // Assess response helpfulness
  assessHelpfulness(response) {
    const helpfulnessIndicators = [
      /here.*is/i,
      /you.*can/i,
      /this.*will/i,
      /solution.*is/i,
      /answer.*is/i,
      /help.*you/i,
      /provide.*you/i
    ];

    const matches = helpfulnessIndicators.filter(pattern => pattern.test(response));
    return Math.min(matches.length / 3, 1.0);
  }

  // Assess response clarity
  assessClarity(response) {
    const clarityIndicators = [
      /first/i,
      /second/i,
      /finally/i,
      /therefore/i,
      /because/i,
      /however/i,
      /additionally/i
    ];

    const matches = clarityIndicators.filter(pattern => pattern.test(response));
    return Math.min(matches.length / 4, 1.0);
  }

  // Calculate overall validation score
  calculateOverallScore(validation) {
    const intentScore = validation.intentMatch.score * 0.3;
    const contextScore = validation.contextRelevance.score * 0.25;
    const completenessScore = validation.completeness.score * 0.25;
    const appropriatenessScore = validation.appropriateness.score * 0.2;
    
    return Math.min(intentScore + contextScore + completenessScore + appropriatenessScore, 1.0);
  }

  // Calculate confidence in validation
  calculateConfidence(validation) {
    const factorCount = validation.intentMatch.factors.length + 
                       validation.contextRelevance.factors.length + 
                       validation.completeness.factors.length + 
                       validation.appropriateness.factors.length;
    
    return Math.min(factorCount / 8, 1.0);
  }
}

module.exports = ContextAwareValidator;
```

### 2. Enhanced ChatHistoryExtractor.js
```javascript
// Add to ChatHistoryExtractor.js
class ChatHistoryExtractor {
  // Enhanced context tracking
  async extractConversationContext() {
    try {
      const messages = await this.extractChatHistory();
      
      return {
        messages,
        context: this.analyzeConversationContext(messages),
        intent: this.detectConversationIntent(messages),
        topics: this.extractTopics(messages),
        sentiment: this.analyzeSentiment(messages)
      };
    } catch (error) {
      this.logger.error('Failed to extract conversation context:', error.message);
      return {
        messages: [],
        context: {},
        intent: { type: 'unknown', confidence: 0 },
        topics: [],
        sentiment: { positive: 0, negative: 0, neutral: 1 }
      };
    }
  }

  // Analyze conversation context
  analyzeConversationContext(messages) {
    const context = {
      length: messages.length,
      duration: this.calculateDuration(messages),
      participants: this.extractParticipants(messages),
      topics: this.extractTopics(messages),
      complexity: this.assessComplexity(messages),
      progress: this.assessProgress(messages)
    };

    return context;
  }

  // Detect conversation intent
  detectConversationIntent(messages) {
    if (messages.length === 0) {
      return { type: 'unknown', confidence: 0 };
    }

    // Analyze all messages for intent patterns
    const intentPatterns = {
      codeReview: 0,
      codeGeneration: 0,
      debugging: 0,
      explanation: 0,
      refactoring: 0
    };

    messages.forEach(message => {
      const intent = this.detectMessageIntent(message.content);
      if (intentPatterns.hasOwnProperty(intent.type)) {
        intentPatterns[intent.type] += intent.confidence;
      }
    });

    // Find dominant intent
    const dominantIntent = Object.entries(intentPatterns)
      .reduce((max, [type, score]) => score > max.score ? { type, score } : max, 
              { type: 'unknown', score: 0 });

    return {
      type: dominantIntent.type,
      confidence: Math.min(dominantIntent.score / messages.length, 1.0),
      distribution: intentPatterns
    };
  }

  // Extract conversation topics
  extractTopics(messages) {
    const topics = new Map();
    
    messages.forEach(message => {
      const messageTopics = this.extractMessageTopics(message.content);
      messageTopics.forEach(topic => {
        topics.set(topic, (topics.get(topic) || 0) + 1);
      });
    });

    return Array.from(topics.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }));
  }

  // Analyze conversation sentiment
  analyzeSentiment(messages) {
    const sentiment = { positive: 0, negative: 0, neutral: 0 };
    
    messages.forEach(message => {
      const messageSentiment = this.analyzeMessageSentiment(message.content);
      sentiment.positive += messageSentiment.positive;
      sentiment.negative += messageSentiment.negative;
      sentiment.neutral += messageSentiment.neutral;
    });

    const total = messages.length;
    return {
      positive: sentiment.positive / total,
      negative: sentiment.negative / total,
      neutral: sentiment.neutral / total
    };
  }

  // Calculate conversation duration
  calculateDuration(messages) {
    if (messages.length < 2) return 0;
    
    const firstMessage = new Date(messages[0].timestamp);
    const lastMessage = new Date(messages[messages.length - 1].timestamp);
    
    return lastMessage.getTime() - firstMessage.getTime();
  }

  // Extract participants
  extractParticipants(messages) {
    const participants = new Set();
    messages.forEach(message => participants.add(message.sender));
    return Array.from(participants);
  }

  // Assess conversation complexity
  assessComplexity(messages) {
    const complexityFactors = {
      messageCount: messages.length,
      avgMessageLength: messages.reduce((sum, msg) => sum + msg.content.length, 0) / messages.length,
      codeBlockCount: messages.filter(msg => msg.content.includes('```')).length,
      technicalTerms: this.countTechnicalTerms(messages)
    };

    let complexity = 0;
    if (complexityFactors.messageCount > 10) complexity += 0.3;
    if (complexityFactors.avgMessageLength > 200) complexity += 0.2;
    if (complexityFactors.codeBlockCount > 3) complexity += 0.3;
    if (complexityFactors.technicalTerms > 20) complexity += 0.2;

    return Math.min(complexity, 1.0);
  }

  // Assess conversation progress
  assessProgress(messages) {
    if (messages.length === 0) return { stage: 'start', confidence: 0 };

    const progressIndicators = {
      start: /hello|hi|help|question/i,
      exploration: /explain|describe|how|what|why/i,
      solution: /solution|fix|implement|create/i,
      verification: /test|check|verify|confirm/i,
      completion: /done|complete|finished|thank/i
    };

    const stageScores = {};
    Object.entries(progressIndicators).forEach(([stage, pattern]) => {
      stageScores[stage] = messages.filter(msg => pattern.test(msg.content)).length;
    });

    const dominantStage = Object.entries(stageScores)
      .reduce((max, [stage, count]) => count > max.count ? { stage, count } : max,
              { stage: 'start', count: 0 });

    return {
      stage: dominantStage.stage,
      confidence: dominantStage.count / messages.length,
      distribution: stageScores
    };
  }

  // Detect message intent
  detectMessageIntent(content) {
    const lowerContent = content.toLowerCase();
    
    if (/review|check|examine/i.test(lowerContent)) return { type: 'codeReview', confidence: 0.8 };
    if (/create|generate|write/i.test(lowerContent)) return { type: 'codeGeneration', confidence: 0.8 };
    if (/fix|debug|error/i.test(lowerContent)) return { type: 'debugging', confidence: 0.8 };
    if (/explain|describe|clarify/i.test(lowerContent)) return { type: 'explanation', confidence: 0.8 };
    if (/refactor|improve|optimize/i.test(lowerContent)) return { type: 'refactoring', confidence: 0.8 };
    
    return { type: 'general', confidence: 0.3 };
  }

  // Extract message topics
  extractMessageTopics(content) {
    const topics = [];
    const lowerContent = content.toLowerCase();
    
    // Technical topics
    if (/javascript|js|node/i.test(lowerContent)) topics.push('javascript');
    if (/python|py/i.test(lowerContent)) topics.push('python');
    if (/react|vue|angular/i.test(lowerContent)) topics.push('frontend');
    if (/api|endpoint|server/i.test(lowerContent)) topics.push('backend');
    if (/database|sql|mongodb/i.test(lowerContent)) topics.push('database');
    if (/testing|test|spec/i.test(lowerContent)) topics.push('testing');
    if (/deployment|docker|aws/i.test(lowerContent)) topics.push('deployment');
    
    return topics;
  }

  // Analyze message sentiment
  analyzeMessageSentiment(content) {
    const lowerContent = content.toLowerCase();
    
    const positiveWords = ['good', 'great', 'excellent', 'perfect', 'thanks', 'thank', 'awesome', 'nice'];
    const negativeWords = ['bad', 'wrong', 'error', 'problem', 'issue', 'fail', 'broken', 'terrible'];
    
    let positive = 0, negative = 0, neutral = 1;
    
    positiveWords.forEach(word => {
      if (lowerContent.includes(word)) positive += 1;
    });
    
    negativeWords.forEach(word => {
      if (lowerContent.includes(word)) negative += 1;
    });
    
    if (positive > 0 || negative > 0) neutral = 0;
    
    return { positive, negative, neutral };
  }

  // Count technical terms
  countTechnicalTerms(messages) {
    const technicalTerms = [
      'function', 'class', 'method', 'variable', 'constant', 'import', 'export',
      'async', 'await', 'promise', 'callback', 'event', 'state', 'props',
      'component', 'hook', 'context', 'reducer', 'middleware', 'router'
    ];
    
    let count = 0;
    messages.forEach(message => {
      const lowerContent = message.content.toLowerCase();
      technicalTerms.forEach(term => {
        if (lowerContent.includes(term)) count++;
      });
    });
    
    return count;
  }
}
```

### 3. Enhanced ChatMessageHandler.js
```javascript
// Add to ChatMessageHandler.js
class ChatMessageHandler {
  // Enhanced response extraction with context validation
  async extractLatestAIResponse(page) {
    try {
      const currentPage = await this.browserManager.getPage();
      if (!currentPage) {
        this.logger.error(`No page available for extracting AI response from ${this.ideType}`);
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
      
      // Get conversation context
      const chatHistoryExtractor = new ChatHistoryExtractor(this.browserManager, this.ideType);
      const conversationContext = await chatHistoryExtractor.extractConversationContext();
      
      // Validate response context
      const contextValidator = new ContextAwareValidator();
      const contextValidation = await contextValidator.validateResponse(
        response,
        conversationContext.intent.type,
        conversationContext.messages
      );
      
      this.logger.info('AI response context validation:', {
        responseLength: response.length,
        contextScore: contextValidation.overallScore,
        confidence: contextValidation.confidence,
        intent: conversationContext.intent.type
      });
      
      return {
        content: response.trim(),
        context: conversationContext,
        validation: contextValidation,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error(`Error extracting AI response from ${this.ideType}:`, error.message);
      return {
        content: '',
        context: null,
        validation: null,
        error: error.message
      };
    }
  }
}
```

### 4. Enhanced AutoFinishSystem.js
```javascript
// Add to AutoFinishSystem.js
class AutoFinishSystem {
  // Enhanced task validation with context
  async validateTaskCompletion(task, aiResponse) {
    try {
      // Get conversation context
      const conversationContext = await this.getConversationContext();
      
      // Get response quality assessment
      const qualityAssessment = await this.assessResponseQuality(aiResponse, {
        taskType: task.type,
        userIntent: task.description,
        conversationHistory: conversationContext.messages
      });

      // Get context validation
      const contextValidator = new ContextAwareValidator();
      const contextValidation = await contextValidator.validateResponse(
        aiResponse,
        conversationContext.intent.type,
        conversationContext.messages
      );

      // Enhanced validation logic
      const validationResult = {
        isValid: qualityAssessment.overallScore >= 0.8 && contextValidation.overallScore >= 0.7,
        qualityScore: qualityAssessment.overallScore,
        contextScore: contextValidation.overallScore,
        completeness: qualityAssessment.completeness.score,
        relevance: qualityAssessment.relevance.score,
        codeQuality: qualityAssessment.codeQuality.score,
        intentMatch: contextValidation.intentMatch.score,
        contextRelevance: contextValidation.contextRelevance.score,
        hasErrors: qualityAssessment.errors.hasErrors,
        confidence: (qualityAssessment.confidence + contextValidation.confidence) / 2,
        suggestions: [...qualityAssessment.suggestions, ...contextValidation.suggestions],
        qualityAssessment,
        contextValidation,
        conversationContext
      };

      this.logger.info(`Enhanced task validation result:`, {
        taskId: task.id,
        isValid: validationResult.isValid,
        qualityScore: validationResult.qualityScore,
        contextScore: validationResult.contextScore,
        confidence: validationResult.confidence
      });

      return validationResult;
      
    } catch (error) {
      this.logger.error(`Task validation failed:`, error.message);
      return {
        isValid: false,
        qualityScore: 0,
        contextScore: 0,
        confidence: 0,
        error: error.message
      };
    }
  }

  // Get conversation context
  async getConversationContext() {
    try {
      const chatHistoryExtractor = new ChatHistoryExtractor(this.browserManager, this.ideType);
      return await chatHistoryExtractor.extractConversationContext();
    } catch (error) {
      this.logger.warn('Failed to extract conversation context:', error.message);
      return {
        messages: [],
        context: {},
        intent: { type: 'unknown', confidence: 0 },
        topics: [],
        sentiment: { positive: 0, negative: 0, neutral: 1 }
      };
    }
  }
}
```

## Success Criteria
- [ ] All objectives completed
- [ ] ContextAwareValidator class implemented
- [ ] Enhanced ChatHistoryExtractor with context tracking
- [ ] Enhanced ChatMessageHandler with context validation
- [ ] Enhanced AutoFinishSystem with context integration
- [ ] Intent detection algorithms working correctly
- [ ] Context relevance assessment functional
- [ ] Conversation analysis working
- [ ] All tests passing
- [ ] Documentation updated

## Testing Requirements
- [ ] Unit tests for ContextAwareValidator
- [ ] Integration tests for context validation
- [ ] E2E tests for conversation analysis
- [ ] Performance tests for context extraction
- [ ] Edge case testing for various conversation types

## Dependencies
- Phase 2 completion (Response Quality Engine)
- Existing ChatHistoryExtractor.js
- Existing ChatMessageHandler.js
- Existing AutoFinishSystem.js
- ServiceLogger for logging

## Risk Mitigation
- **Performance Impact**: Implement caching for context analysis
- **False Positives**: Use confidence scoring to reduce false context matches
- **Complexity**: Start with simple intent detection, iterate based on feedback
- **Memory Usage**: Limit conversation history size for performance 