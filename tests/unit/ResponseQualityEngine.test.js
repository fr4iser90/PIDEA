const ResponseQualityEngine = require('../../backend/domain/services/chat/ResponseQualityEngine');

describe('ResponseQualityEngine', () => {
  let qualityEngine;

  beforeEach(() => {
    qualityEngine = new ResponseQualityEngine();
  });

  describe('Constructor', () => {
    test('should initialize with correct weights', () => {
      expect(qualityEngine.weights.completeness).toBe(0.3);
      expect(qualityEngine.weights.relevance).toBe(0.25);
      expect(qualityEngine.weights.codeQuality).toBe(0.25);
      expect(qualityEngine.weights.errorDetection).toBe(0.2);
    });

    test('should have completion indicators', () => {
      expect(qualityEngine.completionIndicators.positive).toContain('completed');
      expect(qualityEngine.completionIndicators.negative).toContain('incomplete');
      expect(qualityEngine.completionIndicators.error).toContain('error');
    });

    test('should have code quality patterns', () => {
      expect(qualityEngine.codeQualityPatterns.javascript).toBeDefined();
      expect(qualityEngine.codeQualityPatterns.python).toBeDefined();
      expect(qualityEngine.codeQualityPatterns.typescript).toBeDefined();
    });
  });

  describe('assessResponse', () => {
    test('should assess high-quality response', () => {
      const response = 'I have completed the task successfully. Here is the implementation:\n\n```javascript\nconst x = 1;\nconsole.log(x);\n```\n\nThe code follows best practices and includes proper error handling.';
      const context = { userQuestion: 'Create a simple function' };

      const result = qualityEngine.assessResponse(response, context);

      expect(result.overallScore).toBeGreaterThan(0.7);
      expect(result.completeness.score).toBeGreaterThan(0.6);
      expect(result.codeQuality.score).toBeGreaterThan(0.5);
      expect(result.relevance.score).toBeGreaterThan(0.5);
      expect(result.errorDetection.hasErrors).toBe(false);
    });

    test('should assess low-quality response', () => {
      const response = 'I cannot complete this task due to an error. The system is broken.';
      const context = { userQuestion: 'Create a simple function' };

      const result = qualityEngine.assessResponse(response, context);

      expect(result.overallScore).toBeLessThan(0.5);
      expect(result.errorDetection.hasErrors).toBe(true);
    });

    test('should handle empty response', () => {
      const response = '';
      const context = {};

      const result = qualityEngine.assessResponse(response, context);

      expect(result.overallScore).toBe(0);
      expect(result.confidence).toBe(0);
    });

    test('should handle error gracefully', () => {
      // Mock a method to throw an error
      qualityEngine.assessCompleteness = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      const response = 'Test response';
      const result = qualityEngine.assessResponse(response);

      expect(result.overallScore).toBe(0);
      expect(result.error).toBe('Test error');
    });
  });

  describe('assessCompleteness', () => {
    test('should detect completion keywords', () => {
      const response = 'The task is completed successfully.';
      const context = {};

      const result = qualityEngine.assessCompleteness(response, context);

      expect(result.score).toBeGreaterThan(0.4);
      expect(result.factors).toContain('has_completion_keyword');
    });

    test('should detect error keywords', () => {
      const response = 'I encountered an error and cannot complete the task.';
      const context = {};

      const result = qualityEngine.assessCompleteness(response, context);

      expect(result.score).toBeLessThan(0.7);
      expect(result.factors).toContain('has_error_keyword');
    });

    test('should detect code blocks', () => {
      const response = 'Here is the implementation:\n\n```javascript\nconst x = 1;\n```';
      const context = {};

      const result = qualityEngine.assessCompleteness(response, context);

      expect(result.score).toBeGreaterThan(0.3);
      expect(result.factors).toContain('has_code_blocks');
    });

    test('should detect explanations', () => {
      const response = 'This is a very long explanation that provides detailed information about the implementation and how it works in different scenarios.';
      const context = {};

      const result = qualityEngine.assessCompleteness(response, context);

      expect(result.score).toBeGreaterThan(0.2);
      expect(result.factors).toContain('has_explanation');
    });
  });

  describe('assessRelevance', () => {
    test('should detect question addressing', () => {
      const response = 'To create a function, you need to use the function keyword.';
      const context = { userQuestion: 'How do I create a function?' };

      const result = qualityEngine.assessRelevance(response, context);

      expect(result.score).toBeGreaterThan(0.4);
      expect(result.factors).toContain('addresses_question');
    });

    test('should detect technical terms', () => {
      const response = 'The function uses proper error handling and follows best practices.';
      const context = {};

      const result = qualityEngine.assessRelevance(response, context);

      expect(result.score).toBeGreaterThan(0.2);
      expect(result.factors).toContain('uses_technical_terms');
    });

    test('should detect action words', () => {
      const response = 'You need to create a new function and implement the required logic.';
      const context = {};

      const result = qualityEngine.assessRelevance(response, context);

      expect(result.score).toBeGreaterThan(0.2);
      expect(result.factors).toContain('suggests_actions');
    });

    test('should detect context awareness', () => {
      const response = 'Based on the previous discussion about functions, here is the implementation.';
      const context = { previousMessages: ['Let\'s talk about functions'] };

      const result = qualityEngine.assessRelevance(response, context);

      expect(result.score).toBeGreaterThan(0.2);
      expect(result.factors).toContain('maintains_context');
    });
  });

  describe('assessCodeQuality', () => {
    test('should assess JavaScript code quality', () => {
      const response = '```javascript\nconst x = 1;\nfunction test() {\n  console.log(x);\n}\n```';
      const context = {};

      const result = qualityEngine.assessCodeQuality(response, context);

      expect(result.score).toBeGreaterThan(0.5);
      expect(result.factors).toContain('follows_best_practices');
    });

    test('should detect anti-patterns', () => {
      const response = '```javascript\nvar x = 1;\neval("console.log(x)");\n```';
      const context = {};

      const result = qualityEngine.assessCodeQuality(response, context);

      expect(result.score).toBeLessThan(0.5);
      expect(result.factors).toContain('contains_anti_patterns');
    });

    test('should detect comments', () => {
      const response = '```javascript\n// This is a comment\nconst x = 1;\n```';
      const context = {};

      const result = qualityEngine.assessCodeQuality(response, context);

      expect(result.factors).toContain('has_comments');
    });

    test('should detect error handling', () => {
      const response = '```javascript\ntry {\n  const x = 1;\n} catch (error) {\n  console.error(error);\n}\n```';
      const context = {};

      const result = qualityEngine.assessCodeQuality(response, context);

      expect(result.factors).toContain('has_error_handling');
    });

    test('should handle non-code responses', () => {
      const response = 'This is a text response without any code.';
      const context = {};

      const result = qualityEngine.assessCodeQuality(response, context);

      expect(result.score).toBe(0.5);
      expect(result.factors).toContain('no_code_blocks');
    });
  });

  describe('detectErrors', () => {
    test('should detect error keywords', () => {
      const response = 'I encountered an error while processing the request.';
      const context = {};

      const result = qualityEngine.detectErrors(response, context);

      expect(result.hasErrors).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should detect incomplete code blocks', () => {
      const response = '```javascript\n// TODO: implement this\nconst x = ...\n```';
      const context = {};

      const result = qualityEngine.detectErrors(response, context);

      expect(result.hasWarnings).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('should detect syntax errors', () => {
      const response = '```javascript\nconst x = 1;\nfunction test() {\n  console.log(x);\n// Missing closing brace\n```';
      const context = {};

      const result = qualityEngine.detectErrors(response, context);

      expect(result.hasErrors).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle error-free response', () => {
      const response = 'The task is completed successfully with no issues.';
      const context = {};

      const result = qualityEngine.detectErrors(response, context);

      expect(result.hasErrors).toBe(false);
      expect(result.score).toBe(1);
    });
  });

  describe('calculateOverallScore', () => {
    test('should calculate weighted score correctly', () => {
      const assessments = {
        completeness: { score: 0.8 },
        relevance: { score: 0.9 },
        codeQuality: { score: 0.7 },
        errorDetection: { score: 1.0 }
      };

      const result = qualityEngine.calculateOverallScore(assessments);

      // Expected: 0.8*0.3 + 0.9*0.25 + 0.7*0.25 + 1.0*0.2 = 0.24 + 0.225 + 0.175 + 0.2 = 0.84
      expect(result).toBeCloseTo(0.84, 2);
    });

    test('should handle zero scores', () => {
      const assessments = {
        completeness: { score: 0 },
        relevance: { score: 0 },
        codeQuality: { score: 0 },
        errorDetection: { score: 0 }
      };

      const result = qualityEngine.calculateOverallScore(assessments);

      expect(result).toBe(0);
    });

    test('should cap score at 1.0', () => {
      const assessments = {
        completeness: { score: 1.0 },
        relevance: { score: 1.0 },
        codeQuality: { score: 1.0 },
        errorDetection: { score: 1.0 }
      };

      const result = qualityEngine.calculateOverallScore(assessments);

      expect(result).toBe(1.0);
    });
  });

  describe('extractCodeBlocks', () => {
    test('should extract JavaScript code blocks', () => {
      const response = 'Here is the code:\n\n```javascript\nconst x = 1;\nconsole.log(x);\n```';

      const result = qualityEngine.extractCodeBlocks(response);

      expect(result).toHaveLength(1);
      expect(result[0].language).toBe('javascript');
      expect(result[0].content).toContain('const x = 1;');
    });

    test('should extract multiple code blocks', () => {
      const response = '```javascript\nconst x = 1;\n```\n\n```python\ndef test():\n    pass\n```';

      const result = qualityEngine.extractCodeBlocks(response);

      expect(result).toHaveLength(2);
      expect(result[0].language).toBe('javascript');
      expect(result[1].language).toBe('python');
    });

    test('should handle code blocks without language', () => {
      const response = '```\nconst x = 1;\n```';

      const result = qualityEngine.extractCodeBlocks(response);

      expect(result).toHaveLength(1);
      expect(result[0].language).toBe('text');
    });

    test('should handle no code blocks', () => {
      const response = 'This is a text response without code.';

      const result = qualityEngine.extractCodeBlocks(response);

      expect(result).toHaveLength(0);
    });
  });

  describe('detectLanguage', () => {
    test('should detect JavaScript', () => {
      const text = 'const x = 1; function test() { console.log(x); }';

      const result = qualityEngine.detectLanguage(text);

      expect(result).toBe('javascript');
    });

    test('should detect TypeScript', () => {
      const text = 'interface User { name: string; } const user: User = { name: "test" };';

      const result = qualityEngine.detectLanguage(text);

      expect(result).toBe('typescript');
    });

    test('should detect Python', () => {
      const text = 'def test(): print("hello") import os';

      const result = qualityEngine.detectLanguage(text);

      expect(result).toBe('python');
    });

    test('should return text for unknown language', () => {
      const text = 'This is plain text without any programming language patterns.';

      const result = qualityEngine.detectLanguage(text);

      expect(result).toBe('text');
    });
  });

  describe('generateSuggestions', () => {
    test('should generate suggestions for low completeness', () => {
      const assessments = {
        completeness: { score: 0.3 },
        relevance: { score: 0.8 },
        codeQuality: { score: 0.7 },
        errorDetection: { hasErrors: false }
      };

      const result = qualityEngine.generateSuggestions(assessments);

      expect(result).toContain('Add completion keywords to indicate task status');
      expect(result).toContain('Include code examples or implementations');
    });

    test('should generate suggestions for low relevance', () => {
      const assessments = {
        completeness: { score: 0.8 },
        relevance: { score: 0.3 },
        codeQuality: { score: 0.7 },
        errorDetection: { hasErrors: false }
      };

      const result = qualityEngine.generateSuggestions(assessments);

      expect(result).toContain('Address the specific user question more directly');
      expect(result).toContain('Use relevant technical terminology');
    });

    test('should generate suggestions for low code quality', () => {
      const assessments = {
        completeness: { score: 0.8 },
        relevance: { score: 0.8 },
        codeQuality: { score: 0.3 },
        errorDetection: { hasErrors: false }
      };

      const result = qualityEngine.generateSuggestions(assessments);

      expect(result).toContain('Follow language-specific best practices');
      expect(result).toContain('Add error handling to code examples');
    });

    test('should generate suggestions for errors', () => {
      const assessments = {
        completeness: { score: 0.8 },
        relevance: { score: 0.8 },
        codeQuality: { score: 0.7 },
        errorDetection: { hasErrors: true }
      };

      const result = qualityEngine.generateSuggestions(assessments);

      expect(result).toContain('Review and fix syntax errors in code');
      expect(result).toContain('Remove error keywords unless reporting actual errors');
    });
  });
}); 