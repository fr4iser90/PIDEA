/**
 * Completion Detection Step - Smart Completion Detection
 * Intelligently detects when tasks are complete using multiple strategies
 * Used in workflow, not as user-facing button
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('completion_detection_step');

// Step configuration
const config = {
  name: 'CompletionDetectionStep',
  type: 'completion',
  description: 'Intelligently detects when tasks are complete using multiple strategies',
  category: 'completion',
  version: '1.0.0',
  dependencies: ['quality_assessment'],
  settings: {
    timeout: 30000,
    confidenceThreshold: 0.6,
    enableMultiStrategy: true,
    enableContextAnalysis: true,
    enableQualityIntegration: true
  },
  validation: {
    requiredInputs: ['task', 'confirmationResult'],
    supportedStrategies: ['keyword', 'quality', 'context', 'pattern', 'composite']
  }
};

class CompletionDetectionStep {
  constructor() {
    this.logger = logger;
    
    // Completion patterns for different task types
    this.completionPatterns = {
      'development': {
        keywords: ['implemented', 'created', 'added', 'built', 'developed', 'done', 'complete'],
        codePatterns: ['function', 'class', 'module', 'export', 'return'],
        qualityIndicators: ['error handling', 'validation', 'comments']
      },
      'testing': {
        keywords: ['test passes', 'test fixed', 'coverage improved', 'tests passing', 'specified'],
        codePatterns: ['describe', 'it', 'test', 'expect', 'assert'],
        qualityIndicators: ['coverage', 'assertions', 'edge cases']
      },
      'refactoring': {
        keywords: ['refactored', 'refactoring complete', 'code improved', 'restructured', 'optimized'],
        codePatterns: ['function', 'class', 'extract', 'rename', 'simplify'],
        qualityIndicators: ['cleaner', 'maintainable', 'readable']
      },
      'documentation': {
        keywords: ['documented', 'docs updated', 'readme updated', 'comments added', 'documentation complete'],
        codePatterns: ['/**', '//', '/*', 'readme', 'docs'],
        qualityIndicators: ['clear', 'comprehensive', 'examples']
      },
      'bugfix': {
        keywords: ['fixed', 'bug resolved', 'issue fixed', 'error corrected', 'problem solved'],
        codePatterns: ['fix', 'resolve', 'correct', 'handle', 'catch'],
        qualityIndicators: ['root cause', 'prevention', 'testing']
      }
    };
  }

  /**
   * Execute completion detection
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Completion detection results
   */
  async execute(context) {
    try {
      this.logger.info('Starting completion detection');
      
      const { task, confirmationResult, projectPath, qualityAssessment, options = {} } = context;
      
      if (!task || !confirmationResult) {
        throw new Error('Task and confirmation result required for completion detection');
      }

      const result = {
        timestamp: new Date(),
        projectPath,
        taskId: task.id,
        isComplete: false,
        confidence: 0,
        completionType: null,
        strategies: [],
        metadata: {
          qualityScore: 0,
          contextScore: 0,
          patternScore: 0,
          compositeScore: 0
        }
      };

      // Get AI response from confirmation result
      const aiResponse = confirmationResult.aiResponse;
      if (!aiResponse) {
        this.logger.warn('No AI response available for completion detection');
        return result;
      }

      // Strategy 1: Keyword-based detection
      const keywordResult = this._detectByKeywords(aiResponse, task);
      result.strategies.push({
        name: 'keyword',
        score: keywordResult.score,
        confidence: keywordResult.confidence,
        details: keywordResult.details
      });

      // Strategy 2: Quality-based detection
      const qualityResult = this._detectByQuality(aiResponse, task, qualityAssessment);
      result.strategies.push({
        name: 'quality',
        score: qualityResult.score,
        confidence: qualityResult.confidence,
        details: qualityResult.details
      });

      // Strategy 3: Context-based detection
      const contextResult = this._detectByContext(aiResponse, task, confirmationResult);
      result.strategies.push({
        name: 'context',
        score: contextResult.score,
        confidence: contextResult.confidence,
        details: contextResult.details
      });

      // Strategy 4: Pattern-based detection
      const patternResult = this._detectByPatterns(aiResponse, task);
      result.strategies.push({
        name: 'pattern',
        score: patternResult.score,
        confidence: patternResult.confidence,
        details: patternResult.details
      });

      // Strategy 5: Composite detection (combine all strategies)
      const compositeResult = this._detectComposite(result.strategies, task);
      result.strategies.push({
        name: 'composite',
        score: compositeResult.score,
        confidence: compositeResult.confidence,
        details: compositeResult.details
      });

      // Update metadata with individual scores
      result.metadata.qualityScore = qualityResult.score;
      result.metadata.contextScore = contextResult.score;
      result.metadata.patternScore = patternResult.score;
      result.metadata.compositeScore = compositeResult.score;

      // Determine final completion status
      const finalConfidence = compositeResult.confidence;
      result.confidence = finalConfidence;
      result.isComplete = finalConfidence >= config.settings.confidenceThreshold;
      result.completionType = compositeResult.completionType;

      this.logger.info(`Completion detection for task ${task.id}: ${result.isComplete ? 'COMPLETE' : 'INCOMPLETE'} (confidence: ${finalConfidence.toFixed(2)})`);
      
      return result;
    } catch (error) {
      this.logger.error('Completion detection failed:', error);
      throw error;
    }
  }

  /**
   * Detect completion by keywords
   */
  _detectByKeywords(aiResponse, task) {
    const lowerResponse = aiResponse.toLowerCase();
    const taskType = task.type || 'general';
    const patterns = this.completionPatterns[taskType] || this.completionPatterns['development'];
    
    let score = 0;
    let matchedKeywords = [];
    
    // Check for completion keywords
    for (const keyword of patterns.keywords) {
      if (lowerResponse.includes(keyword.toLowerCase())) {
        score += 0.2;
        matchedKeywords.push(keyword);
      }
    }
    
    // Check for general completion indicators
    const generalKeywords = ['done', 'complete', 'finished', 'ready', 'ok', 'yes'];
    for (const keyword of generalKeywords) {
      if (lowerResponse.includes(keyword.toLowerCase())) {
        score += 0.1;
        matchedKeywords.push(keyword);
      }
    }
    
    const confidence = Math.min(1.0, score);
    
    return {
      score,
      confidence,
      details: {
        matchedKeywords,
        totalKeywords: patterns.keywords.length + generalKeywords.length
      }
    };
  }

  /**
   * Detect completion by quality assessment
   */
  _detectByQuality(aiResponse, task, qualityAssessment) {
    let score = 0;
    let qualityIndicators = [];
    
    // Use quality assessment if available
    if (qualityAssessment && qualityAssessment.overallScore) {
      score += qualityAssessment.overallScore * 0.4;
      qualityIndicators.push(`quality_score: ${qualityAssessment.overallScore.toFixed(2)}`);
    }
    
    // Check for code quality indicators
    const taskType = task.type || 'general';
    const patterns = this.completionPatterns[taskType] || this.completionPatterns['development'];
    
    for (const indicator of patterns.qualityIndicators) {
      if (aiResponse.toLowerCase().includes(indicator.toLowerCase())) {
        score += 0.15;
        qualityIndicators.push(indicator);
      }
    }
    
    // Check for code blocks (indicates implementation)
    if (aiResponse.includes('```')) {
      score += 0.2;
      qualityIndicators.push('code_blocks_present');
    }
    
    // Check for error handling
    if (aiResponse.toLowerCase().includes('error') || 
        aiResponse.toLowerCase().includes('try') ||
        aiResponse.toLowerCase().includes('catch')) {
      score += 0.1;
      qualityIndicators.push('error_handling');
    }
    
    const confidence = Math.min(1.0, score);
    
    return {
      score,
      confidence,
      details: {
        qualityIndicators,
        hasCodeBlocks: aiResponse.includes('```'),
        hasErrorHandling: aiResponse.toLowerCase().includes('error')
      }
    };
  }

  /**
   * Detect completion by context analysis
   */
  _detectByContext(aiResponse, task, confirmationResult) {
    let score = 0;
    let contextIndicators = [];
    
    // Check if task was confirmed
    if (confirmationResult.confirmed) {
      score += 0.3;
      contextIndicators.push('task_confirmed');
    }
    
    // Check confirmation method
    if (confirmationResult.confirmationMethod === 'auto_quality') {
      score += 0.2;
      contextIndicators.push('auto_confirmed_by_quality');
    }
    
    // Check for user input requirement
    if (confirmationResult.metadata && confirmationResult.metadata.requiresUserInput) {
      score -= 0.2;
      contextIndicators.push('requires_user_input');
    }
    
    // Check response length (appropriate length indicates completion)
    const responseLength = aiResponse.length;
    if (responseLength > 200 && responseLength < 3000) {
      score += 0.1;
      contextIndicators.push('appropriate_length');
    } else if (responseLength < 50) {
      score -= 0.2;
      contextIndicators.push('too_short');
    }
    
    // Check for task-specific context
    const taskType = task.type || 'general';
    if (taskType === 'testing' && aiResponse.toLowerCase().includes('test')) {
      score += 0.1;
      contextIndicators.push('testing_context');
    } else if (taskType === 'documentation' && aiResponse.toLowerCase().includes('doc')) {
      score += 0.1;
      contextIndicators.push('documentation_context');
    }
    
    const confidence = Math.max(0, Math.min(1.0, score));
    
    return {
      score,
      confidence,
      details: {
        contextIndicators,
        responseLength,
        confirmationMethod: confirmationResult.confirmationMethod
      }
    };
  }

  /**
   * Detect completion by patterns
   */
  _detectByPatterns(aiResponse, task) {
    const taskType = task.type || 'general';
    const patterns = this.completionPatterns[taskType] || this.completionPatterns['development'];
    
    let score = 0;
    let matchedPatterns = [];
    
    // Check for code patterns
    for (const pattern of patterns.codePatterns) {
      if (aiResponse.toLowerCase().includes(pattern.toLowerCase())) {
        score += 0.15;
        matchedPatterns.push(pattern);
      }
    }
    
    // Check for specific completion patterns
    const completionPatterns = [
      /done\s*[.!]?$/i,
      /complete\s*[.!]?$/i,
      /finished\s*[.!]?$/i,
      /ready\s*[.!]?$/i,
      /implemented\s*[.!]?$/i,
      /created\s*[.!]?$/i
    ];
    
    for (const pattern of completionPatterns) {
      if (pattern.test(aiResponse)) {
        score += 0.2;
        matchedPatterns.push(pattern.source);
      }
    }
    
    const confidence = Math.min(1.0, score);
    
    return {
      score,
      confidence,
      details: {
        matchedPatterns,
        totalPatterns: patterns.codePatterns.length + completionPatterns.length
      }
    };
  }

  /**
   * Composite detection combining all strategies
   */
  _detectComposite(strategies, task) {
    // Calculate weighted average of all strategies
    const weights = {
      'keyword': 0.25,
      'quality': 0.3,
      'context': 0.25,
      'pattern': 0.2
    };
    
    let weightedSum = 0;
    let totalWeight = 0;
    let strategyDetails = {};
    
    for (const strategy of strategies) {
      if (strategy.name !== 'composite' && weights[strategy.name]) {
        weightedSum += strategy.confidence * weights[strategy.name];
        totalWeight += weights[strategy.name];
        strategyDetails[strategy.name] = {
          confidence: strategy.confidence,
          score: strategy.score
        };
      }
    }
    
    const compositeConfidence = totalWeight > 0 ? weightedSum / totalWeight : 0;
    
    // Determine completion type based on highest scoring strategy
    const bestStrategy = strategies.reduce((best, current) => 
      current.name !== 'composite' && current.confidence > best.confidence ? current : best
    );
    
    let completionType = 'unknown';
    if (compositeConfidence >= 0.8) {
      completionType = 'high_confidence';
    } else if (compositeConfidence >= 0.6) {
      completionType = 'medium_confidence';
    } else if (compositeConfidence >= 0.4) {
      completionType = 'low_confidence';
    } else {
      completionType = 'incomplete';
    }
    
    return {
      score: compositeConfidence,
      confidence: compositeConfidence,
      completionType,
      details: {
        strategyDetails,
        weightedAverage: compositeConfidence,
        bestStrategy: bestStrategy.name
      }
    };
  }
}

// Create instance for execution
const stepInstance = new CompletionDetectionStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 