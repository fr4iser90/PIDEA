const ServiceLogger = require('@logging/ServiceLogger');

/**
 * ResponseQualityEngine - Comprehensive AI response quality assessment
 * Evaluates responses across multiple dimensions: completeness, relevance, code quality, and error detection
 */
class ResponseQualityEngine {
  constructor() {
    this.logger = new ServiceLogger('ResponseQualityEngine');
    
    // Quality assessment weights
    this.weights = {
      completeness: 0.3,
      relevance: 0.25,
      codeQuality: 0.25,
      errorDetection: 0.2
    };
    
    // Completion indicators
    this.completionIndicators = {
      positive: [
        'completed', 'done', 'finished', 'ready', 'complete', 'successful',
        'fertig', 'erledigt', 'abgeschlossen', 'bereit', 'vollständig',
        'listo', 'completado', 'terminado', 'finalizado',
        'fini', 'terminé', 'completé', 'prêt', 'achevé'
      ],
      negative: [
        'incomplete', 'partial', 'unfinished', 'pending', 'ongoing',
        'unvollständig', 'teilweise', 'unfertig', 'ausstehend',
        'incompleto', 'parcial', 'pendiente', 'en curso',
        'incomplet', 'partiel', 'en cours', 'en attente'
      ],
      error: [
        'error', 'failed', 'cannot', 'unable', 'problem', 'issue', 'bug',
        'fehler', 'fehlgeschlagen', 'kann nicht', 'unmöglich', 'problem',
        'error', 'fallido', 'no puede', 'imposible', 'problema',
        'erreur', 'échoué', 'ne peut pas', 'impossible', 'problème'
      ]
    };
    
    // Code quality patterns
    this.codeQualityPatterns = {
      javascript: {
        good: [
          /const\s+\w+\s*=/g,  // const declarations
          /let\s+\w+\s*=/g,    // let declarations
          /function\s+\w+\s*\(/g,  // function declarations
          /=>\s*{/g,           // arrow functions
          /console\.log/g,     // logging
          /try\s*{/g,          // error handling
          /catch\s*\(/g,       // error handling
          /async\s+function/g, // async functions
          /await\s+/g,         // await usage
          /\.then\(/g,         // promises
          /\.catch\(/g         // promise error handling
        ],
        bad: [
          /var\s+\w+\s*=/g,    // var declarations (old)
          /eval\(/g,           // eval usage
          /document\.write/g,  // document.write
          /innerHTML\s*=/g,    // innerHTML assignment
          /setTimeout\s*\([^,]+,\s*0\)/g,  // setTimeout with 0
          /new\s+Function/g    // Function constructor
        ]
      },
      python: {
        good: [
          /def\s+\w+\s*\(/g,   // function definitions
          /class\s+\w+/g,      // class definitions
          /import\s+\w+/g,     // imports
          /from\s+\w+\s+import/g,  // from imports
          /try:/g,             // error handling
          /except\s+\w+:/g,    // error handling
          /with\s+\w+\s+as/g,  // context managers
          /async\s+def/g,      // async functions
          /await\s+/g,         // await usage
          /print\s*\(/g        // print statements
        ],
        bad: [
          /exec\s*\(/g,        // exec usage
          /eval\s*\(/g,        // eval usage
          /globals\s*\(/g,     // globals usage
          /locals\s*\(/g,      // locals usage
          /input\s*\(/g        // input without validation
        ]
      },
      typescript: {
        good: [
          /interface\s+\w+/g,  // interfaces
          /type\s+\w+\s*=/g,   // type aliases
          /:\s*\w+/g,          // type annotations
          /const\s+\w+:\s*\w+/g,  // typed const
          /function\s+\w+\s*\([^)]*\):\s*\w+/g,  // typed functions
          /async\s+function/g, // async functions
          /Promise<\w+>/g,     // promise types
          /enum\s+\w+/g        // enums
        ],
        bad: [
          /any\s*=/g,          // any type
          /as\s+any/g,         // type assertion to any
          /!\s*$/gm,           // non-null assertion
          /@ts-ignore/g        // ts-ignore
        ]
      }
    };
    
    // Relevance patterns
    this.relevancePatterns = {
      questionWords: ['what', 'how', 'why', 'when', 'where', 'which', 'who'],
      actionWords: ['create', 'build', 'implement', 'fix', 'add', 'remove', 'update', 'modify'],
      technicalTerms: ['function', 'class', 'method', 'variable', 'loop', 'condition', 'error', 'test']
    };
  }

  /**
   * Assess response quality comprehensively
   * @param {string} response - AI response text
   * @param {Object} context - Context information
   * @returns {Object} Quality assessment result
   */
  assessResponse(response, context = {}) {
    try {
      this.logger.info('Assessing response quality...');
      
      const completeness = this.assessCompleteness(response, context);
      const relevance = this.assessRelevance(response, context);
      const codeQuality = this.assessCodeQuality(response, context);
      const errorDetection = this.detectErrors(response, context);
      
      // Calculate overall score
      const overallScore = this.calculateOverallScore({
        completeness,
        relevance,
        codeQuality,
        errorDetection
      });
      
      const result = {
        overallScore,
        confidence: this.calculateConfidence(response),
        completeness,
        relevance,
        codeQuality,
        errorDetection,
        suggestions: this.generateSuggestions({
          completeness,
          relevance,
          codeQuality,
          errorDetection
        }),
        timestamp: new Date(),
        responseLength: response.length,
        hasCodeBlocks: response.includes('```'),
        language: this.detectLanguage(response)
      };
      
      this.logger.info(`Response quality assessment completed: ${Math.round(overallScore * 100)}%`);
      return result;
      
    } catch (error) {
      this.logger.error('Response quality assessment failed:', error.message);
      return {
        overallScore: 0,
        confidence: 0,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Assess response completeness
   * @param {string} response - AI response
   * @param {Object} context - Context information
   * @returns {Object} Completeness assessment
   */
  assessCompleteness(response, context) {
    const factors = [];
    let score = 0;
    
    // Check for completion keywords
    const hasCompletionKeyword = this.completionIndicators.positive.some(keyword =>
      response.toLowerCase().includes(keyword)
    );
    if (hasCompletionKeyword) {
      score += 0.4;
      factors.push('has_completion_keyword');
    }
    
    // Check for error indicators
    const hasErrorKeyword = this.completionIndicators.error.some(keyword =>
      response.toLowerCase().includes(keyword)
    );
    if (hasErrorKeyword) {
      score -= 0.3;
      factors.push('has_error_keyword');
    }
    
    // Check for partial completion indicators
    const hasPartialKeyword = this.completionIndicators.negative.some(keyword =>
      response.toLowerCase().includes(keyword)
    );
    if (hasPartialKeyword) {
      score += 0.2;
      factors.push('has_partial_keyword');
    }
    
    // Check for code blocks (indicates implementation)
    if (response.includes('```')) {
      score += 0.3;
      factors.push('has_code_blocks');
    }
    
    // Check for explanations
    if (response.length > 100) {
      score += 0.2;
      factors.push('has_explanation');
    }
    
    // Check for examples
    if (response.includes('example') || response.includes('Example')) {
      score += 0.1;
      factors.push('has_examples');
    }
    
    return {
      score: Math.max(0, Math.min(1, score)),
      factors,
      confidence: 0.8
    };
  }

  /**
   * Assess response relevance
   * @param {string} response - AI response
   * @param {Object} context - Context information
   * @returns {Object} Relevance assessment
   */
  assessRelevance(response, context) {
    const factors = [];
    let score = 0;
    
    // Check if response addresses the user's question
    if (context.userQuestion) {
      const questionWords = this.extractKeywords(context.userQuestion);
      const responseWords = this.extractKeywords(response);
      const commonWords = questionWords.filter(word => responseWords.includes(word));
      
      if (commonWords.length > 0) {
        score += 0.4;
        factors.push('addresses_question');
      }
    }
    
    // Check for technical terms
    const technicalTerms = this.relevancePatterns.technicalTerms.filter(term =>
      response.toLowerCase().includes(term)
    );
    if (technicalTerms.length > 0) {
      score += 0.2;
      factors.push('uses_technical_terms');
    }
    
    // Check for action words
    const actionWords = this.relevancePatterns.actionWords.filter(word =>
      response.toLowerCase().includes(word)
    );
    if (actionWords.length > 0) {
      score += 0.2;
      factors.push('suggests_actions');
    }
    
    // Check for context awareness
    if (context.previousMessages && context.previousMessages.length > 0) {
      const lastMessage = context.previousMessages[context.previousMessages.length - 1];
      const lastKeywords = this.extractKeywords(lastMessage);
      const responseKeywords = this.extractKeywords(response);
      const contextWords = lastKeywords.filter(word => responseKeywords.includes(word));
      
      if (contextWords.length > 0) {
        score += 0.2;
        factors.push('maintains_context');
      }
    }
    
    return {
      score: Math.max(0, Math.min(1, score)),
      factors,
      confidence: 0.7
    };
  }

  /**
   * Assess code quality in response
   * @param {string} response - AI response
   * @param {Object} context - Context information
   * @returns {Object} Code quality assessment
   */
  assessCodeQuality(response, context) {
    const factors = [];
    let score = 0;
    
    // Extract code blocks
    const codeBlocks = this.extractCodeBlocks(response);
    
    if (codeBlocks.length === 0) {
      return {
        score: 0.5, // Neutral score for non-code responses
        factors: ['no_code_blocks'],
        confidence: 0.6
      };
    }
    
    // Assess each code block
    for (const block of codeBlocks) {
      const language = this.detectLanguage(block.content);
      const patterns = this.codeQualityPatterns[language] || this.codeQualityPatterns.javascript;
      
      // Count good patterns
      const goodPatterns = patterns.good.filter(pattern => pattern.test(block.content));
      const badPatterns = patterns.bad.filter(pattern => pattern.test(block.content));
      
      if (goodPatterns.length > 0) {
        score += 0.3;
        factors.push('follows_best_practices');
      }
      
      if (badPatterns.length === 0) {
        score += 0.2;
        factors.push('avoids_anti_patterns');
      } else {
        score -= 0.2;
        factors.push('contains_anti_patterns');
      }
      
      // Check for comments
      if (block.content.includes('//') || block.content.includes('/*') || block.content.includes('#')) {
        score += 0.1;
        factors.push('has_comments');
      }
      
      // Check for error handling
      if (block.content.includes('try') || block.content.includes('catch') || block.content.includes('except')) {
        score += 0.2;
        factors.push('has_error_handling');
      }
      
      // Check for proper formatting
      if (block.content.includes('{') && block.content.includes('}')) {
        score += 0.1;
        factors.push('proper_formatting');
      }
    }
    
    return {
      score: Math.max(0, Math.min(1, score)),
      factors: [...new Set(factors)], // Remove duplicates
      confidence: 0.8
    };
  }

  /**
   * Detect errors in response
   * @param {string} response - AI response
   * @param {Object} context - Context information
   * @returns {Object} Error detection result
   */
  detectErrors(response, context) {
    const errors = [];
    const warnings = [];
    
    // Check for error keywords
    const errorKeywords = this.completionIndicators.error;
    for (const keyword of errorKeywords) {
      if (response.toLowerCase().includes(keyword)) {
        errors.push({
          type: 'error_keyword',
          keyword,
          severity: 'high'
        });
      }
    }
    
    // Check for incomplete code blocks
    const codeBlockMatches = response.match(/```[\s\S]*?```/g);
    if (codeBlockMatches) {
      for (const match of codeBlockMatches) {
        if (match.includes('...') || match.includes('TODO') || match.includes('FIXME')) {
          warnings.push({
            type: 'incomplete_code',
            content: match.substring(0, 50) + '...',
            severity: 'medium'
          });
        }
      }
    }
    
    // Check for syntax errors in code
    const codeBlocks = this.extractCodeBlocks(response);
    for (const block of codeBlocks) {
      const syntaxErrors = this.checkSyntaxErrors(block.content, block.language);
      errors.push(...syntaxErrors);
    }
    
    return {
      hasErrors: errors.length > 0,
      hasWarnings: warnings.length > 0,
      errors,
      warnings,
      score: errors.length === 0 ? 1 : Math.max(0, 1 - (errors.length * 0.2)),
      confidence: 0.9
    };
  }

  /**
   * Calculate overall quality score
   * @param {Object} assessments - Individual assessments
   * @returns {number} Overall score (0-1)
   */
  calculateOverallScore(assessments) {
    const { completeness, relevance, codeQuality, errorDetection } = assessments;
    
    const weightedScore = 
      completeness.score * this.weights.completeness +
      relevance.score * this.weights.relevance +
      codeQuality.score * this.weights.codeQuality +
      errorDetection.score * this.weights.errorDetection;
    
    return Math.max(0, Math.min(1, weightedScore));
  }

  /**
   * Calculate confidence in assessment
   * @param {string} response - AI response
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(response) {
    let confidence = 0.5; // Base confidence
    
    // Higher confidence for longer responses
    if (response.length > 200) confidence += 0.2;
    if (response.length > 500) confidence += 0.1;
    
    // Higher confidence for responses with code
    if (response.includes('```')) confidence += 0.2;
    
    // Higher confidence for structured responses
    if (response.includes('1.') || response.includes('2.') || response.includes('•')) confidence += 0.1;
    
    return Math.min(1, confidence);
  }

  /**
   * Generate improvement suggestions
   * @param {Object} assessments - Quality assessments
   * @returns {Array} Array of suggestions
   */
  generateSuggestions(assessments) {
    const suggestions = [];
    
    if (assessments.completeness.score < 0.7) {
      suggestions.push('Add completion keywords to indicate task status');
      suggestions.push('Include code examples or implementations');
      suggestions.push('Provide explanations for the solution');
    }
    
    if (assessments.relevance.score < 0.7) {
      suggestions.push('Address the specific user question more directly');
      suggestions.push('Use relevant technical terminology');
      suggestions.push('Maintain context from previous messages');
    }
    
    if (assessments.codeQuality.score < 0.7) {
      suggestions.push('Follow language-specific best practices');
      suggestions.push('Add error handling to code examples');
      suggestions.push('Include comments for complex logic');
      suggestions.push('Avoid deprecated or unsafe patterns');
    }
    
    if (assessments.errorDetection.hasErrors) {
      suggestions.push('Review and fix syntax errors in code');
      suggestions.push('Remove error keywords unless reporting actual errors');
      suggestions.push('Complete any incomplete code blocks');
    }
    
    return suggestions;
  }

  /**
   * Extract code blocks from response
   * @param {string} response - AI response
   * @returns {Array} Array of code blocks
   */
  extractCodeBlocks(response) {
    const codeBlocks = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    
    let match;
    while ((match = codeBlockRegex.exec(response)) !== null) {
      codeBlocks.push({
        language: match[1] || 'text',
        content: match[2].trim(),
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
    
    return codeBlocks;
  }

  /**
   * Detect programming language
   * @param {string} text - Text content
   * @returns {string} Detected language
   */
  detectLanguage(text) {
    const languagePatterns = {
      javascript: /(const|let|var|function|=>|console\.|\.then\(|\.catch\(|async|await)/i,
      typescript: /(interface|type\s+\w+|:\s*\w+|Promise<\w+>|enum)/i,
      python: /(def\s+\w+|import\s+\w+|from\s+\w+|class\s+\w+|print\s*\()/i,
      java: /(public\s+class|import\s+java|System\.out|public\s+static\s+void\s+main)/i,
      cpp: /(#include|std::|cout|cin|namespace|class\s+\w+)/i,
      csharp: /(using\s+System|public\s+class|Console\.WriteLine|namespace)/i,
      php: /(<?php|echo|function\s+\w+|class\s+\w+)/i,
      ruby: /(def\s+\w+|class\s+\w+|puts|require|module)/i,
      go: /(package\s+main|import\s+"|func\s+\w+|fmt\.Println)/i,
      rust: /(fn\s+\w+|let\s+\w+|println!|use\s+\w+|struct\s+\w+)/i
    };
    
    for (const [language, pattern] of Object.entries(languagePatterns)) {
      if (pattern.test(text)) {
        return language;
      }
    }
    
    return 'text';
  }

  /**
   * Extract keywords from text
   * @param {string} text - Text content
   * @returns {Array} Array of keywords
   */
  extractKeywords(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
  }

  /**
   * Check for syntax errors in code
   * @param {string} code - Code content
   * @param {string} language - Programming language
   * @returns {Array} Array of syntax errors
   */
  checkSyntaxErrors(code, language) {
    const errors = [];
    
    // Basic syntax checks
    if (language === 'javascript' || language === 'typescript') {
      // Check for unmatched brackets
      const openBrackets = (code.match(/\{/g) || []).length;
      const closeBrackets = (code.match(/\}/g) || []).length;
      if (openBrackets !== closeBrackets) {
        errors.push({
          type: 'unmatched_brackets',
          message: 'Unmatched curly brackets',
          severity: 'high'
        });
      }
      
      // Check for unmatched parentheses
      const openParens = (code.match(/\(/g) || []).length;
      const closeParens = (code.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        errors.push({
          type: 'unmatched_parentheses',
          message: 'Unmatched parentheses',
          severity: 'high'
        });
      }
    }
    
    return errors;
  }
}

module.exports = ResponseQualityEngine; 