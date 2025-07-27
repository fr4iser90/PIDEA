const SmartCompletionDetector = require('../../backend/domain/services/auto-finish/SmartCompletionDetector');

describe('SmartCompletionDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new SmartCompletionDetector();
  });

  describe('Constructor', () => {
    test('should initialize with completion patterns', () => {
      expect(detector.completionPatterns).toBeDefined();
      expect(detector.completionPatterns.explicit).toBeDefined();
      expect(detector.completionPatterns.implicit).toBeDefined();
      expect(detector.completionPatterns.summary).toBeDefined();
      expect(detector.completionPatterns.nextSteps).toBeDefined();
    });

    test('should initialize with partial completion patterns', () => {
      expect(detector.partialCompletionPatterns).toBeDefined();
      expect(detector.partialCompletionPatterns.incomplete).toBeDefined();
      expect(detector.partialCompletionPatterns.pending).toBeDefined();
      expect(detector.partialCompletionPatterns.questions).toBeDefined();
    });

    test('should initialize with confidence factors', () => {
      expect(detector.confidenceFactors).toBeDefined();
      expect(detector.confidenceFactors.explicitCompletion).toBe(0.9);
      expect(detector.confidenceFactors.implicitCompletion).toBe(0.7);
      expect(detector.confidenceFactors.summaryProvided).toBe(0.8);
    });

    test('should initialize with configuration', () => {
      expect(detector.config).toBeDefined();
      expect(detector.config.minConfidence).toBe(0.7);
      expect(detector.config.maxWaitTime).toBe(300000);
      expect(detector.config.checkInterval).toBe(2000);
    });
  });

  describe('detectCompletion', () => {
    test('should detect explicit completion', async () => {
      const response = 'Task complete. The implementation is done and ready for testing.';
      const context = { userIntent: 'Create a function' };

      const result = await detector.detectCompletion(response, context);

      expect(result.isComplete).toBe(true);
      expect(result.completionType).toBe('explicit');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.indicators).toHaveLength(1);
      expect(result.indicators[0].type).toBe('explicit_keyword');
    });

    test('should detect implicit completion', async () => {
      const response = 'Here is the solution for your problem. You can now implement this code.';
      const context = { userIntent: 'Solve this issue' };

      const result = await detector.detectCompletion(response, context);

      expect(result.isComplete).toBe(true);
      expect(result.completionType).toBe('implicit');
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.indicators.some(i => i.type === 'implicit_pattern')).toBe(true);
    });

    test('should detect partial completion', async () => {
      const response = 'I\'m still working on this. Need more time to complete the implementation.';
      const context = { userIntent: 'Create a complete solution' };

      const result = await detector.detectCompletion(response, context);

      expect(result.isPartial).toBe(true);
      expect(result.completionType).toBe('partial');
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0]).toContain('still in progress');
    });

    test('should detect completion with summary', async () => {
      const response = 'Summary of changes: Added error handling, improved performance, and updated documentation.';
      const context = { userIntent: 'Refactor this code' };

      const result = await detector.detectCompletion(response, context);

      expect(result.isComplete).toBe(true);
      expect(result.indicators.some(i => i.type === 'summary_pattern')).toBe(true);
    });

    test('should detect completion with next steps', async () => {
      const response = 'The code is ready. Next step is to test the implementation.';
      const context = { userIntent: 'Prepare the code' };

      const result = await detector.detectCompletion(response, context);

      expect(result.isComplete).toBe(true);
      expect(result.indicators.some(i => i.type === 'next_steps_pattern')).toBe(true);
    });

    test('should handle empty response', async () => {
      const response = '';
      const context = {};

      const result = await detector.detectCompletion(response, context);

      expect(result.isComplete).toBe(false);
      expect(result.isPartial).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test('should handle null response', async () => {
      const response = null;
      const context = {};

      const result = await detector.detectCompletion(response, context);

      expect(result.isComplete).toBe(false);
      expect(result.isPartial).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  describe('checkExplicitCompletion', () => {
    test('should detect explicit keywords', () => {
      const response = 'The task is done and complete.';

      const result = detector.checkExplicitCompletion(response);

      expect(result.isComplete).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.indicators.some(i => i.type === 'explicit_keyword')).toBe(true);
    });

    test('should detect explicit patterns', () => {
      const response = 'Task complete with all requirements met.';

      const result = detector.checkExplicitCompletion(response);

      expect(result.isComplete).toBe(true);
      expect(result.indicators.some(i => i.type === 'explicit_pattern')).toBe(true);
    });

    test('should not detect completion for non-explicit responses', () => {
      const response = 'I am working on this problem.';

      const result = detector.checkExplicitCompletion(response);

      expect(result.isComplete).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  describe('checkImplicitCompletion', () => {
    test('should detect implicit patterns', () => {
      const response = 'Here is the solution for your problem.';

      const result = detector.checkImplicitCompletion(response);

      expect(result.isComplete).toBe(true);
      expect(result.indicators.some(i => i.type === 'implicit_pattern')).toBe(true);
    });

    test('should detect summary patterns', () => {
      const response = 'Summary of changes made to the code.';

      const result = detector.checkImplicitCompletion(response);

      expect(result.isComplete).toBe(true);
      expect(result.indicators.some(i => i.type === 'summary_pattern')).toBe(true);
    });

    test('should detect next steps patterns', () => {
      const response = 'Next step is to test the implementation.';

      const result = detector.checkImplicitCompletion(response);

      expect(result.isComplete).toBe(true);
      expect(result.indicators.some(i => i.type === 'next_steps_pattern')).toBe(true);
    });
  });

  describe('checkPartialCompletion', () => {
    test('should detect incomplete indicators', () => {
      const response = 'I am still working on this implementation.';

      const result = detector.checkPartialCompletion(response);

      expect(result.isPartial).toBe(true);
      expect(result.indicators.some(i => i.type === 'incomplete_indicator')).toBe(true);
      expect(result.suggestions.some(s => s.includes('still in progress'))).toBe(true);
    });

    test('should detect pending indicators', () => {
      const response = 'TODO: Add error handling to this function.';

      const result = detector.checkPartialCompletion(response);

      expect(result.isPartial).toBe(true);
      expect(result.indicators.some(i => i.type === 'pending_indicator')).toBe(true);
      expect(result.suggestions.some(s => s.includes('pending items'))).toBe(true);
    });

    test('should detect question indicators', () => {
      const response = 'Is this the correct approach?';

      const result = detector.checkPartialCompletion(response);

      expect(result.isPartial).toBe(true);
      expect(result.indicators.some(i => i.type === 'question_indicator')).toBe(true);
      expect(result.suggestions.some(s => s.includes('clarification'))).toBe(true);
    });
  });

  describe('calculateOverallConfidence', () => {
    test('should calculate confidence with quality assessment', () => {
      const detection = { confidence: 0.8 };
      const context = {
        qualityAssessment: { overallScore: 0.9 }
      };

      const result = detector.calculateOverallConfidence(detection, context);

      expect(result).toBeGreaterThan(0.8);
    });

    test('should calculate confidence with context validation', () => {
      const detection = { confidence: 0.7 };
      const context = {
        contextValidation: { overallScore: 0.8 }
      };

      const result = detector.calculateOverallConfidence(detection, context);

      expect(result).toBeGreaterThan(0.7);
    });

    test('should calculate confidence with appropriate length', () => {
      const detection = { confidence: 0.6 };
      const context = {
        response: 'This is a response with appropriate length for testing purposes.'
      };

      const result = detector.calculateOverallConfidence(detection, context);

      expect(result).toBeGreaterThan(0.6);
    });

    test('should calculate confidence with code quality', () => {
      const detection = { confidence: 0.5 };
      const context = {
        hasCode: true,
        hasErrors: false
      };

      const result = detector.calculateOverallConfidence(detection, context);

      expect(result).toBeGreaterThan(0.5);
    });
  });

  describe('assessCompletionQuality', () => {
    test('should assess excellent quality', () => {
      const detection = { confidence: 0.95 };
      const context = {};

      const result = detector.assessCompletionQuality(detection, context);

      expect(result).toBe('excellent');
    });

    test('should assess very good quality', () => {
      const detection = { confidence: 0.85 };
      const context = {};

      const result = detector.assessCompletionQuality(detection, context);

      expect(result).toBe('very_good');
    });

    test('should assess good quality', () => {
      const detection = { confidence: 0.75 };
      const context = {};

      const result = detector.assessCompletionQuality(detection, context);

      expect(result).toBe('good');
    });

    test('should assess poor quality', () => {
      const detection = { confidence: 0.55 };
      const context = {};

      const result = detector.assessCompletionQuality(detection, context);

      expect(result).toBe('poor');
    });
  });

  describe('detectSemanticCompletion', () => {
    test('should detect semantic completion with keyword overlap', () => {
      const response = 'Here is the solution for the function implementation.';
      const userIntent = 'Create a function implementation';

      const result = detector.detectSemanticCompletion(response, userIntent);

      expect(result.isSemanticallyComplete).toBe(true);
      expect(result.score).toBeGreaterThan(0.5);
      expect(result.indicators.some(i => i.type === 'semantic_intent_match')).toBe(true);
    });

    test('should detect solution completeness', () => {
      const response = 'Solution provided with complete implementation.';
      const userIntent = 'Solve this problem';

      const result = detector.detectSemanticCompletion(response, userIntent);

      expect(result.isSemanticallyComplete).toBe(true);
      expect(result.indicators.some(i => i.type === 'solution_completeness')).toBe(true);
    });

    test('should not detect semantic completion for unrelated response', () => {
      const response = 'This is a random response.';
      const userIntent = 'Create a function';

      const result = detector.detectSemanticCompletion(response, userIntent);

      expect(result.isSemanticallyComplete).toBe(false);
      expect(result.score).toBeLessThan(0.5);
    });
  });

  describe('extractKeywords', () => {
    test('should extract keywords from text', () => {
      const text = 'Create a function to handle user input';

      const result = detector.extractKeywords(text);

      expect(result).toContain('create');
      expect(result).toContain('function');
      expect(result).toContain('handle');
      expect(result).toContain('input');
      expect(result).not.toContain('a');
      expect(result).not.toContain('to');
    });

    test('should handle empty text', () => {
      const text = '';

      const result = detector.extractKeywords(text);

      expect(result).toEqual([]);
    });

    test('should handle text with punctuation', () => {
      const text = 'Hello, world! How are you?';

      const result = detector.extractKeywords(text);

      expect(result).toContain('hello');
      expect(result).toContain('world');
      expect(result).toContain('are');
    });
  });

  describe('calculateKeywordOverlap', () => {
    test('should calculate overlap between keyword sets', () => {
      const intentKeywords = ['create', 'function', 'handle'];
      const responseKeywords = ['function', 'handle', 'input', 'data'];

      const result = detector.calculateKeywordOverlap(intentKeywords, responseKeywords);

      expect(result).toBe(0.5); // 2 common keywords out of 4 total unique keywords
    });

    test('should handle empty keyword sets', () => {
      const intentKeywords = [];
      const responseKeywords = ['test'];

      const result = detector.calculateKeywordOverlap(intentKeywords, responseKeywords);

      expect(result).toBe(0);
    });

    test('should handle identical keyword sets', () => {
      const keywords = ['create', 'function', 'test'];
      const intentKeywords = [...keywords];
      const responseKeywords = [...keywords];

      const result = detector.calculateKeywordOverlap(intentKeywords, responseKeywords);

      expect(result).toBe(1.0);
    });
  });

  describe('detectPartialCompletionWithSuggestions', () => {
    test('should provide context-specific suggestions', () => {
      const response = 'I created a function.';
      const context = {
        userIntent: 'Create a function with error handling and documentation'
      };

      const result = detector.detectPartialCompletionWithSuggestions(response, context);

      expect(result.suggestions.some(s => s.includes('error handling'))).toBe(true);
      expect(result.suggestions.some(s => s.includes('documentation'))).toBe(true);
    });

    test('should provide code-specific suggestions', () => {
      const response = '```javascript\nconst x = 1;\n```';

      const result = detector.detectPartialCompletionWithSuggestions(response, context);

      expect(result.suggestions.some(s => s.includes('completion status'))).toBe(true);
    });

    test('should provide length-based suggestions', () => {
      const response = 'Done.';

      const result = detector.detectPartialCompletionWithSuggestions(response, context);

      expect(result.suggestions.some(s => s.includes('brief'))).toBe(true);
    });
  });

  describe('getCompletionStats', () => {
    test('should return completion statistics', () => {
      const result = detector.getCompletionStats();

      expect(result.patterns).toBeDefined();
      expect(result.patterns.explicit).toBeGreaterThan(0);
      expect(result.patterns.implicit).toBeGreaterThan(0);
      expect(result.patterns.summary).toBeGreaterThan(0);
      expect(result.patterns.nextSteps).toBeGreaterThan(0);
      expect(result.patterns.partial).toBeGreaterThan(0);
      expect(result.confidenceFactors).toBeDefined();
      expect(result.config).toBeDefined();
    });
  });

  describe('updateConfig', () => {
    test('should update configuration', () => {
      const newConfig = {
        minConfidence: 0.8,
        maxWaitTime: 600000
      };

      detector.updateConfig(newConfig);

      expect(detector.config.minConfidence).toBe(0.8);
      expect(detector.config.maxWaitTime).toBe(600000);
      expect(detector.config.checkInterval).toBe(2000); // Should remain unchanged
    });
  });

  describe('Integration Tests', () => {
    test('should provide comprehensive completion detection for code generation', async () => {
      const response = 'Here is the complete solution for your function. The code includes error handling and is ready for testing. Next step is to run the tests.';
      const context = {
        userIntent: 'Create a function with error handling',
        qualityAssessment: { overallScore: 0.9 },
        contextValidation: { overallScore: 0.8 },
        hasCode: true,
        hasErrors: false
      };

      const result = await detector.detectCompletion(response, context);

      expect(result.isComplete).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.completionType).toBe('implicit');
      expect(result.quality).toBe('excellent');
      expect(result.indicators.length).toBeGreaterThan(1);
    });

    test('should provide comprehensive completion detection for partial work', async () => {
      const response = 'I\'ve started implementing the function but still need to add error handling. TODO: Add try-catch blocks. Is this the right approach?';
      const context = {
        userIntent: 'Create a robust function',
        qualityAssessment: { overallScore: 0.6 },
        contextValidation: { overallScore: 0.5 },
        hasCode: true,
        hasErrors: false
      };

      const result = await detector.detectCompletion(response, context);

      expect(result.isPartial).toBe(true);
      expect(result.isComplete).toBe(false);
      expect(result.suggestions.length).toBeGreaterThan(1);
      expect(result.suggestions.some(s => s.includes('error handling'))).toBe(true);
    });
  });
}); 