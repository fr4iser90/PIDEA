const ContextAwareValidator = require('../../backend/domain/services/auto-finish/ContextAwareValidator');

describe('ContextAwareValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new ContextAwareValidator();
  });

  describe('Constructor', () => {
    test('should initialize with intent patterns', () => {
      expect(validator.intentPatterns).toBeDefined();
      expect(validator.intentPatterns.codeReview).toBeDefined();
      expect(validator.intentPatterns.codeGeneration).toBeDefined();
      expect(validator.intentPatterns.debugging).toBeDefined();
      expect(validator.intentPatterns.explanation).toBeDefined();
      expect(validator.intentPatterns.refactoring).toBeDefined();
    });

    test('should initialize with context patterns', () => {
      expect(validator.contextPatterns).toBeDefined();
      expect(validator.contextPatterns.buildsOnPrevious).toBeDefined();
      expect(validator.contextPatterns.maintainsContext).toBeDefined();
      expect(validator.contextPatterns.providesContinuity).toBeDefined();
    });

    test('should initialize with appropriateness patterns', () => {
      expect(validator.appropriatenessPatterns).toBeDefined();
      expect(validator.appropriatenessPatterns.addressesOriginalQuestion).toBeDefined();
      expect(validator.appropriatenessPatterns.providesCompleteSolution).toBeDefined();
      expect(validator.appropriatenessPatterns.suggestsNextSteps).toBeDefined();
    });
  });

  describe('validateResponse', () => {
    test('should validate response with context successfully', async () => {
      const response = 'Here is the complete solution for your code review request. The code has been analyzed and all issues have been identified.';
      const userIntent = 'Please review this code and find any issues';
      const conversationHistory = [
        { sender: 'user', content: 'Can you review this code?' },
        { sender: 'ai', content: 'I\'ll analyze the code for you.' }
      ];

      const result = await validator.validateResponse(response, userIntent, conversationHistory);

      expect(result).toBeDefined();
      expect(result.intentMatch).toBeDefined();
      expect(result.contextRelevance).toBeDefined();
      expect(result.completeness).toBeDefined();
      expect(result.appropriateness).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should handle empty conversation history', async () => {
      const response = 'Here is the solution';
      const userIntent = 'Create a function';
      const conversationHistory = [];

      const result = await validator.validateResponse(response, userIntent, conversationHistory);

      expect(result.contextRelevance.score).toBe(0.5);
      expect(result.contextRelevance.factors).toHaveLength(1);
      expect(result.contextRelevance.factors[0].type).toBe('no_context');
    });

    test('should handle validation errors gracefully', async () => {
      const response = null;
      const userIntent = 'test';
      const conversationHistory = [];

      const result = await validator.validateResponse(response, userIntent, conversationHistory);

      expect(result.error).toBeDefined();
      expect(result.overallScore).toBe(0);
      expect(result.confidence).toBe(0);
    });
  });

  describe('validateIntentMatch', () => {
    test('should detect code review intent', () => {
      const response = 'Code review complete. Found 3 issues that need attention.';
      const userIntent = 'Please review this code';

      const result = validator.validateIntentMatch(response, userIntent);

      expect(result.score).toBeGreaterThan(0);
      expect(result.detectedIntent.type).toBe('codeReview');
      expect(result.factors).toHaveLength(1);
    });

    test('should detect code generation intent', () => {
      const response = 'Here is the generated code for your function.';
      const userIntent = 'Create a function to calculate fibonacci';

      const result = validator.validateIntentMatch(response, userIntent);

      expect(result.score).toBeGreaterThan(0);
      expect(result.detectedIntent.type).toBe('codeGeneration');
    });

    test('should detect debugging intent', () => {
      const response = 'The error has been fixed. The issue was in the variable declaration.';
      const userIntent = 'Fix this error in my code';

      const result = validator.validateIntentMatch(response, userIntent);

      expect(result.score).toBeGreaterThan(0);
      expect(result.detectedIntent.type).toBe('debugging');
    });

    test('should detect explanation intent', () => {
      const response = 'Here is how the function works: it takes an input and processes it through several steps.';
      const userIntent = 'Explain how this function works';

      const result = validator.validateIntentMatch(response, userIntent);

      expect(result.score).toBeGreaterThan(0);
      expect(result.detectedIntent.type).toBe('explanation');
    });

    test('should detect refactoring intent', () => {
      const response = 'The code has been refactored for better performance and readability.';
      const userIntent = 'Refactor this code to improve performance';

      const result = validator.validateIntentMatch(response, userIntent);

      expect(result.score).toBeGreaterThan(0);
      expect(result.detectedIntent.type).toBe('refactoring');
    });
  });

  describe('validateContextRelevance', () => {
    test('should detect builds on previous context', () => {
      const response = 'As mentioned in the previous message, here is the extended solution.';
      const conversationHistory = [
        { sender: 'user', content: 'Create a function' },
        { sender: 'ai', content: 'Here is a basic function' }
      ];

      const result = validator.validateContextRelevance(response, conversationHistory);

      expect(result.score).toBeGreaterThan(0);
      expect(result.factors.some(f => f.type === 'builds_on_previous')).toBe(true);
    });

    test('should detect maintains context', () => {
      const response = 'In this context, the solution should be implemented as follows.';
      const conversationHistory = [
        { sender: 'user', content: 'How do I implement this?' }
      ];

      const result = validator.validateContextRelevance(response, conversationHistory);

      expect(result.score).toBeGreaterThan(0);
      expect(result.factors.some(f => f.type === 'maintains_context')).toBe(true);
    });

    test('should detect continuity indicators', () => {
      const response = 'Next step is to test the implementation.';
      const conversationHistory = [
        { sender: 'user', content: 'What should I do next?' }
      ];

      const result = validator.validateContextRelevance(response, conversationHistory);

      expect(result.score).toBeGreaterThan(0);
      expect(result.factors.some(f => f.type === 'continuity_indicators')).toBe(true);
    });
  });

  describe('validateCompleteness', () => {
    test('should detect comprehensive response', () => {
      const response = 'Here is a comprehensive solution that covers all aspects of your request.';
      const userIntent = 'Create a complete solution';

      const result = validator.validateCompleteness(response, userIntent);

      expect(result.score).toBeGreaterThan(0);
      expect(result.factors.some(f => f.type === 'response_coverage')).toBe(true);
    });

    test('should detect complete solution', () => {
      const response = 'Complete solution provided. You can now implement this code.';
      const userIntent = 'Provide a solution';

      const result = validator.validateCompleteness(response, userIntent);

      expect(result.score).toBeGreaterThan(0);
      expect(result.factors.some(f => f.type === 'solution_completeness')).toBe(true);
    });

    test('should detect explanation quality', () => {
      const response = 'Here is a detailed explanation with examples of how this works.';
      const userIntent = 'Explain this';

      const result = validator.validateCompleteness(response, userIntent);

      expect(result.score).toBeGreaterThan(0);
      expect(result.factors.some(f => f.type === 'explanation_quality')).toBe(true);
    });
  });

  describe('validateAppropriateness', () => {
    test('should detect addresses question', () => {
      const response = 'This answer addresses your original question about the implementation.';
      const userIntent = 'How do I implement this?';

      const result = validator.validateAppropriateness(response, userIntent);

      expect(result.score).toBeGreaterThan(0);
      expect(result.factors.some(f => f.type === 'addresses_question')).toBe(true);
    });

    test('should detect appropriate response type', () => {
      const response = 'Here is the code review analysis.';
      const userIntent = 'Review this code';

      const result = validator.validateAppropriateness(response, userIntent);

      expect(result.score).toBeGreaterThan(0);
      expect(result.factors.some(f => f.type === 'response_type')).toBe(true);
    });

    test('should detect helpful suggestions', () => {
      const response = 'You might want to consider adding error handling to this code.';
      const userIntent = 'Improve this code';

      const result = validator.validateAppropriateness(response, userIntent);

      expect(result.score).toBeGreaterThan(0);
      expect(result.factors.some(f => f.type === 'helpful_suggestions')).toBe(true);
    });
  });

  describe('detectUserIntent', () => {
    test('should detect code review intent from keywords', () => {
      const message = 'Please review this code for any issues';

      const result = validator.detectUserIntent(message);

      expect(result.type).toBe('codeReview');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.keywords).toContain('review');
    });

    test('should detect code generation intent from patterns', () => {
      const message = 'Create a function to handle user input';

      const result = validator.detectUserIntent(message);

      expect(result.type).toBe('codeGeneration');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.keywords).toContain('create');
    });

    test('should detect debugging intent', () => {
      const message = 'Fix the error in this code';

      const result = validator.detectUserIntent(message);

      expect(result.type).toBe('debugging');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.keywords).toContain('fix');
    });

    test('should detect explanation intent', () => {
      const message = 'Explain how this function works';

      const result = validator.detectUserIntent(message);

      expect(result.type).toBe('explanation');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.keywords).toContain('explain');
    });

    test('should detect refactoring intent', () => {
      const message = 'Refactor this code for better performance';

      const result = validator.detectUserIntent(message);

      expect(result.type).toBe('refactoring');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.keywords).toContain('refactor');
    });

    test('should return unknown for unclear intent', () => {
      const message = 'Hello there';

      const result = validator.detectUserIntent(message);

      expect(result.type).toBe('unknown');
      expect(result.confidence).toBe(0);
    });
  });

  describe('responseAddressesIntent', () => {
    test('should detect code review response', () => {
      const response = 'Code review complete. Found several issues.';
      const detectedIntent = { type: 'codeReview' };

      const result = validator.responseAddressesIntent(response, detectedIntent);

      expect(result).toBe(true);
    });

    test('should detect code generation response', () => {
      const response = 'Here is the generated code for your function.';
      const detectedIntent = { type: 'codeGeneration' };

      const result = validator.responseAddressesIntent(response, detectedIntent);

      expect(result).toBe(true);
    });

    test('should detect debugging response', () => {
      const response = 'The error has been fixed.';
      const detectedIntent = { type: 'debugging' };

      const result = validator.responseAddressesIntent(response, detectedIntent);

      expect(result).toBe(true);
    });

    test('should detect explanation response', () => {
      const response = 'Here is how the function works.';
      const detectedIntent = { type: 'explanation' };

      const result = validator.responseAddressesIntent(response, detectedIntent);

      expect(result).toBe(true);
    });

    test('should detect refactoring response', () => {
      const response = 'The code has been refactored.';
      const detectedIntent = { type: 'refactoring' };

      const result = validator.responseAddressesIntent(response, detectedIntent);

      expect(result).toBe(true);
    });

    test('should return false for unknown intent', () => {
      const response = 'Some response';
      const detectedIntent = { type: 'unknown' };

      const result = validator.responseAddressesIntent(response, detectedIntent);

      expect(result).toBe(false);
    });
  });

  describe('calculateOverallScore', () => {
    test('should calculate weighted overall score', () => {
      const validation = {
        intentMatch: { score: 0.8 },
        contextRelevance: { score: 0.7 },
        completeness: { score: 0.9 },
        appropriateness: { score: 0.6 }
      };

      const result = validator.calculateOverallScore(validation);

      // Expected: 0.8*0.3 + 0.7*0.25 + 0.9*0.25 + 0.6*0.2 = 0.24 + 0.175 + 0.225 + 0.12 = 0.76
      expect(result).toBeCloseTo(0.76, 2);
    });

    test('should handle zero scores', () => {
      const validation = {
        intentMatch: { score: 0 },
        contextRelevance: { score: 0 },
        completeness: { score: 0 },
        appropriateness: { score: 0 }
      };

      const result = validator.calculateOverallScore(validation);

      expect(result).toBe(0);
    });
  });

  describe('calculateConfidence', () => {
    test('should calculate average confidence from valid factors', () => {
      const validation = {
        intentMatch: { score: 0.8 },
        contextRelevance: { score: 0.7 },
        completeness: { score: 0.9 },
        appropriateness: { score: 0.6 }
      };

      const result = validator.calculateConfidence(validation);

      // Expected: (0.8 + 0.7 + 0.9 + 0.6) / 4 = 0.75
      expect(result).toBe(0.75);
    });

    test('should handle zero scores', () => {
      const validation = {
        intentMatch: { score: 0 },
        contextRelevance: { score: 0 },
        completeness: { score: 0 },
        appropriateness: { score: 0 }
      };

      const result = validator.calculateConfidence(validation);

      expect(result).toBe(0);
    });

    test('should handle mixed zero and non-zero scores', () => {
      const validation = {
        intentMatch: { score: 0 },
        contextRelevance: { score: 0.8 },
        completeness: { score: 0 },
        appropriateness: { score: 0.6 }
      };

      const result = validator.calculateConfidence(validation);

      // Expected: (0.8 + 0.6) / 2 = 0.7
      expect(result).toBe(0.7);
    });
  });

  describe('Integration Tests', () => {
    test('should provide comprehensive validation for code review scenario', async () => {
      const response = 'Code review complete. I found 3 issues: 1) Missing error handling, 2) Inefficient loop, 3) Unused variable. Here are the fixes for each issue.';
      const userIntent = 'Please review this code and find any issues';
      const conversationHistory = [
        { sender: 'user', content: 'Can you review this code?' },
        { sender: 'ai', content: 'I\'ll analyze the code for you.' }
      ];

      const result = await validator.validateResponse(response, userIntent, conversationHistory);

      expect(result.overallScore).toBeGreaterThan(0.6);
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.intentMatch.detectedIntent.type).toBe('codeReview');
      expect(result.intentMatch.score).toBeGreaterThan(0.5);
      expect(result.completeness.score).toBeGreaterThan(0.5);
      expect(result.appropriateness.score).toBeGreaterThan(0.5);
    });

    test('should provide comprehensive validation for code generation scenario', async () => {
      const response = 'Here is the complete implementation of the function you requested. The code includes proper error handling and follows best practices. You can now use this function in your project.';
      const userIntent = 'Create a function to validate email addresses';
      const conversationHistory = [
        { sender: 'user', content: 'I need a function to validate emails' },
        { sender: 'ai', content: 'I\'ll create that function for you.' }
      ];

      const result = await validator.validateResponse(response, userIntent, conversationHistory);

      expect(result.overallScore).toBeGreaterThan(0.6);
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.intentMatch.detectedIntent.type).toBe('codeGeneration');
      expect(result.intentMatch.score).toBeGreaterThan(0.5);
      expect(result.completeness.score).toBeGreaterThan(0.5);
      expect(result.appropriateness.score).toBeGreaterThan(0.5);
    });
  });
}); 