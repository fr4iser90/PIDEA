const fs = require('fs-extra');
const path = require('path');
const logger = require('@/infrastructure/logging/logger');

class TestAnalyzer {
  constructor() {
    this.errorPatterns = {
      syntax: [
        /SyntaxError/,
        /Unexpected token/,
        /Missing semicolon/,
        /Unexpected end of input/
      ],
      import: [
        /Cannot find module/,
        /Module not found/,
        /Cannot resolve module/,
        /import.*not found/
      ],
      reference: [
        /ReferenceError/,
        /Cannot read properties of undefined/,
        /Cannot read properties of null/,
        /is not defined/
      ],
      type: [
        /TypeError/,
        /Cannot read properties/,
        /Cannot set properties/,
        /is not a function/
      ],
      assertion: [
        /expect\(received\)/,
        /Expected.*but received/,
        /toBe\(expected\)/,
        /toEqual\(expected\)/
      ],
      mock: [
        /jest\.mock/,
        /mock.*not found/,
        /Mock.*not implemented/
      ],
      async: [
        /async.*await/,
        /Promise.*rejected/,
        /Timeout.*exceeded/
      ]
    };

    this.legacyPatterns = [
      /describe\(/,
      /it\(/,
      /test\(/,
      /beforeEach\(/,
      /afterEach\(/,
      /beforeAll\(/,
      /afterAll\(/,
      /expect\(/,
      /\.toBe\(/,
      /\.toEqual\(/,
      /\.toContain\(/,
      /\.toHaveProperty\(/,
      /\.toMatch\(/,
      /\.toThrow\(/,
      /\.not\./,
      /\.resolves\./,
      /\.rejects\./,
      /\.mockReturnValue\(/,
      /\.mockImplementation\(/,
      /\.mockResolvedValue\(/,
      /\.mockRejectedValue\(/,
      /jest\.fn\(/,
      /jest\.spyOn\(/,
      /jest\.mock\(/,
      /jest\.unmock\(/,
      /jest\.clearAllMocks\(/,
      /jest\.resetAllMocks\(/,
      /jest\.restoreAllMocks\(/,
      /jest\.useFakeTimers\(/,
      /jest\.useRealTimers\(/,
      /jest\.advanceTimersByTime\(/,
      /jest\.runAllTimers\(/,
      /jest\.runOnlyPendingTimers\(/,
      /jest\.setSystemTime\(/,
      /jest\.getRealSystemTime\(/,
      /jest\.requireActual\(/,
      /jest\.requireMock\(/,
      /jest\.setMock\(/,
      /jest\.isolateModules\(/,
      /jest\.retryTimes\(/,
      /jest\.setTimeout\(/,
      /jest\.getTimerCount\(/,
      /jest\.isMockFunction\(/,
      /jest\.genMockFromModule\(/,
      /jest\.createMockFromModule\(/,
      /jest\.mocked\(/,
      /jest\.replaceProperty\(/,
      /jest\.extend\(/,
      /jest\.addMatchers\(/,
      /jest\.addSnapshotSerializer\(/,
      /jest\.getSeed\(/,
      /jest\.isEnvironmentTornDown\(/,
      /jest\.getVmContext\(/,
      /jest\.setMock\(/,
      /jest\.unmock\(/,
      /jest\.doMock\(/,
      /jest\.dontMock\(/,
      /jest\.resetModules\(/,
      /jest\.isolateModules\(/,
      /jest\.requireActual\(/,
      /jest\.requireMock\(/,
      /jest\.genMockFromModule\(/,
      /jest\.createMockFromModule\(/,
      /jest\.mocked\(/,
      /jest\.replaceProperty\(/,
      /jest\.extend\(/,
      /jest\.addMatchers\(/,
      /jest\.addSnapshotSerializer\(/,
      /jest\.getSeed\(/,
      /jest\.isEnvironmentTornDown\(/,
      /jest\.getVmContext\(/,
      /jest\.setMock\(/,
      /jest\.unmock\(/,
      /jest\.doMock\(/,
      /jest\.dontMock\(/,
      /jest\.resetModules\(/,
      /jest\.isolateModules\(/,
      /jest\.requireActual\(/,
      /jest\.requireMock\(/,
      /jest\.genMockFromModule\(/,
      /jest\.createMockFromModule\(/,
      /jest\.mocked\(/,
      /jest\.replaceProperty\(/,
      /jest\.extend\(/,
      /jest\.addMatchers\(/,
      /jest\.addSnapshotSerializer\(/,
      /jest\.getSeed\(/,
      /jest\.isEnvironmentTornDown\(/,
      /jest\.getVmContext\(/
    ];

    this.complexityPatterns = [
      /describe\(.*describe\(/,
      /it\(.*it\(/,
      /test\(.*test\(/,
      /beforeEach\(.*beforeEach\(/,
      /afterEach\(.*afterEach\(/,
      /beforeAll\(.*beforeAll\(/,
      /afterAll\(.*afterAll\(/,
      /expect\(.*expect\(/,
      /\.toBe\(.*\.toBe\(/,
      /\.toEqual\(.*\.toEqual\(/,
      /\.toContain\(.*\.toContain\(/,
      /\.toHaveProperty\(.*\.toHaveProperty\(/,
      /\.toMatch\(.*\.toMatch\(/,
      /\.toThrow\(.*\.toThrow\(/,
      /\.not\./,
      /\.resolves\./,
      /\.rejects\./,
      /\.mockReturnValue\(.*\.mockReturnValue\(/,
      /\.mockImplementation\(.*\.mockImplementation\(/,
      /\.mockResolvedValue\(.*\.mockResolvedValue\(/,
      /\.mockRejectedValue\(.*\.mockRejectedValue\(/,
      /jest\.fn\(.*jest\.fn\(/,
      /jest\.spyOn\(.*jest\.spyOn\(/,
      /jest\.mock\(.*jest\.mock\(/,
      /jest\.unmock\(.*jest\.unmock\(/,
      /jest\.clearAllMocks\(.*jest\.clearAllMocks\(/,
      /jest\.resetAllMocks\(.*jest\.resetAllMocks\(/,
      /jest\.restoreAllMocks\(.*jest\.restoreAllMocks\(/,
      /jest\.useFakeTimers\(.*jest\.useFakeTimers\(/,
      /jest\.useRealTimers\(.*jest\.useRealTimers\(/,
      /jest\.advanceTimersByTime\(.*jest\.advanceTimersByTime\(/,
      /jest\.runAllTimers\(.*jest\.runAllTimers\(/,
      /jest\.runOnlyPendingTimers\(.*jest\.runOnlyPendingTimers\(/,
      /jest\.setSystemTime\(.*jest\.setSystemTime\(/,
      /jest\.getRealSystemTime\(.*jest\.getRealSystemTime\(/,
      /jest\.requireActual\(.*jest\.requireActual\(/,
      /jest\.requireMock\(.*jest\.requireMock\(/,
      /jest\.setMock\(.*jest\.setMock\(/,
      /jest\.isolateModules\(.*jest\.isolateModules\(/,
      /jest\.retryTimes\(.*jest\.retryTimes\(/,
      /jest\.setTimeout\(.*jest\.setTimeout\(/,
      /jest\.getTimerCount\(.*jest\.getTimerCount\(/,
      /jest\.isMockFunction\(.*jest\.isMockFunction\(/,
      /jest\.genMockFromModule\(.*jest\.genMockFromModule\(/,
      /jest\.createMockFromModule\(.*jest\.createMockFromModule\(/,
      /jest\.mocked\(.*jest\.mocked\(/,
      /jest\.replaceProperty\(.*jest\.replaceProperty\(/,
      /jest\.extend\(.*jest\.extend\(/,
      /jest\.addMatchers\(.*jest\.addMatchers\(/,
      /jest\.addSnapshotSerializer\(.*jest\.addSnapshotSerializer\(/,
      /jest\.getSeed\(.*jest\.getSeed\(/,
      /jest\.isEnvironmentTornDown\(.*jest\.isEnvironmentTornDown\(/,
      /jest\.getVmContext\(.*jest\.getVmContext\(/,
      /jest\.setMock\(.*jest\.setMock\(/,
      /jest\.unmock\(.*jest\.unmock\(/,
      /jest\.doMock\(.*jest\.doMock\(/,
      /jest\.dontMock\(.*jest\.dontMock\(/,
      /jest\.resetModules\(.*jest\.resetModules\(/,
      /jest\.isolateModules\(.*jest\.isolateModules\(/,
      /jest\.requireActual\(.*jest\.requireActual\(/,
      /jest\.requireMock\(.*jest\.requireMock\(/,
      /jest\.genMockFromModule\(.*jest\.genMockFromModule\(/,
      /jest\.createMockFromModule\(.*jest\.createMockFromModule\(/,
      /jest\.mocked\(.*jest\.mocked\(/,
      /jest\.replaceProperty\(.*jest\.replaceProperty\(/,
      /jest\.extend\(.*jest\.extend\(/,
      /jest\.addMatchers\(.*jest\.addMatchers\(/,
      /jest\.addSnapshotSerializer\(.*jest\.addSnapshotSerializer\(/,
      /jest\.getSeed\(.*jest\.getSeed\(/,
      /jest\.isEnvironmentTornDown\(.*jest\.isEnvironmentTornDown\(/,
      /jest\.getVmContext\(.*jest\.getVmContext\(/
    ];
  }

  /**
   * Analyze a failing test to determine the best fix strategy
   */
  async analyzeTest(testResult) {
    const { file, name, error } = testResult;
    
    logger.debug('Analyzing test', { file, name });
    
    try {
      const testContent = await this.readTestFile(file);
      const errorType = this.classifyError(error);
      const patterns = this.detectPatterns(testContent, error);
      const complexity = this.calculateComplexity(testContent, patterns);
      
      const analysis = {
        errorType,
        patterns,
        complexity,
        suggestions: this.generateSuggestions(errorType, patterns, complexity),
        confidence: this.calculateConfidence(errorType, patterns)
      };
      
      logger.debug('Test analysis completed', {
        file,
        name,
        errorType,
        complexity,
        patterns: patterns.length
      });
      
      return analysis;
      
    } catch (error) {
      logger.error('Failed to analyze test', {
        file,
        name,
        error: error.message
      });
      
      // Return basic analysis on error
      return {
        errorType: 'unknown',
        patterns: [],
        complexity: 50,
        suggestions: ['Manual review required'],
        confidence: 0.1
      };
    }
  }

  /**
   * Analyze a legacy test for migration
   */
  async analyzeLegacyTest(testResult) {
    const { file, name } = testResult;
    
    logger.debug('Analyzing legacy test', { file, name });
    
    try {
      const testContent = await this.readTestFile(file);
      const legacyPatterns = this.detectLegacyPatterns(testContent);
      const complexity = this.calculateLegacyComplexity(testContent, legacyPatterns);
      
      const analysis = {
        legacyPatterns,
        complexity,
        migrationPath: this.determineMigrationPath(legacyPatterns),
        suggestions: this.generateLegacySuggestions(legacyPatterns, complexity)
      };
      
      logger.debug('Legacy test analysis completed', {
        file,
        name,
        legacyPatterns: legacyPatterns.length,
        complexity
      });
      
      return analysis;
      
    } catch (error) {
      logger.error('Failed to analyze legacy test', {
        file,
        name,
        error: error.message
      });
      
      return {
        legacyPatterns: [],
        complexity: 50,
        migrationPath: 'manual',
        suggestions: ['Manual migration required']
      };
    }
  }

  /**
   * Analyze a complex test for refactoring
   */
  async analyzeComplexTest(testResult) {
    const { file, name } = testResult;
    
    logger.debug('Analyzing complex test', { file, name });
    
    try {
      const testContent = await this.readTestFile(file);
      const complexityPatterns = this.detectComplexityPatterns(testContent);
      const complexity = this.calculateComplexityScore(testContent, complexityPatterns);
      
      const analysis = {
        complexity,
        complexityPatterns,
        refactoringSuggestions: this.generateRefactoringSuggestions(complexityPatterns, complexity),
        estimatedRefactoringTime: this.estimateRefactoringTime(complexity)
      };
      
      logger.debug('Complex test analysis completed', {
        file,
        name,
        complexity,
        complexityPatterns: complexityPatterns.length
      });
      
      return analysis;
      
    } catch (error) {
      logger.error('Failed to analyze complex test', {
        file,
        name,
        error: error.message
      });
      
      return {
        complexity: 50,
        complexityPatterns: [],
        refactoringSuggestions: ['Manual refactoring required'],
        estimatedRefactoringTime: 300000 // 5 minutes
      };
    }
  }

  /**
   * Read test file content
   */
  async readTestFile(filePath) {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read test file: ${error.message}`);
    }
  }

  /**
   * Classify error type based on error message
   */
  classifyError(error) {
    for (const [type, patterns] of Object.entries(this.errorPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(error)) {
          return type;
        }
      }
    }
    return 'unknown';
  }

  /**
   * Detect patterns in test content
   */
  detectPatterns(content, error) {
    const patterns = [];
    
    // Check for external dependencies
    if (content.includes('require(') || content.includes('import ')) {
      patterns.push('external_dependency');
    }
    
    // Check for network calls
    if (content.includes('fetch(') || content.includes('axios') || content.includes('http')) {
      patterns.push('network_call');
    }
    
    // Check for file system operations
    if (content.includes('fs.') || content.includes('readFile') || content.includes('writeFile')) {
      patterns.push('file_system');
    }
    
    // Check for database operations
    if (content.includes('database') || content.includes('db.') || content.includes('query(')) {
      patterns.push('database');
    }
    
    // Check for async operations
    if (content.includes('async') || content.includes('await') || content.includes('Promise')) {
      patterns.push('async_operation');
    }
    
    // Check for complex logic
    if (content.includes('if (') || content.includes('for (') || content.includes('while (')) {
      patterns.push('complex_logic');
    }
    
    // Check for mock usage
    if (content.includes('jest.mock') || content.includes('jest.fn') || content.includes('mock')) {
      patterns.push('mock_usage');
    }
    
    return patterns;
  }

  /**
   * Detect legacy patterns in test content
   */
  detectLegacyPatterns(content) {
    const patterns = [];
    
    for (const pattern of this.legacyPatterns) {
      if (pattern.test(content)) {
        patterns.push(pattern.source);
      }
    }
    
    return patterns;
  }

  /**
   * Detect complexity patterns in test content
   */
  detectComplexityPatterns(content) {
    const patterns = [];
    
    for (const pattern of this.complexityPatterns) {
      if (pattern.test(content)) {
        patterns.push(pattern.source);
      }
    }
    
    return patterns;
  }

  /**
   * Calculate complexity score for a test
   */
  calculateComplexity(content, patterns) {
    let complexity = 0;
    
    // Base complexity from patterns
    complexity += patterns.length * 10;
    
    // Line count complexity
    const lines = content.split('\n').length;
    if (lines > 100) complexity += 30;
    else if (lines > 50) complexity += 20;
    else if (lines > 20) complexity += 10;
    
    // Nested structure complexity
    const describeCount = (content.match(/describe\(/g) || []).length;
    const itCount = (content.match(/it\(/g) || []).length;
    const testCount = (content.match(/test\(/g) || []).length;
    
    complexity += (describeCount + itCount + testCount) * 5;
    
    // Mock complexity
    const mockCount = (content.match(/jest\./g) || []).length;
    complexity += mockCount * 2;
    
    return Math.min(100, complexity);
  }

  /**
   * Calculate legacy complexity
   */
  calculateLegacyComplexity(content, legacyPatterns) {
    let complexity = 0;
    
    complexity += legacyPatterns.length * 15;
    
    const lines = content.split('\n').length;
    if (lines > 200) complexity += 40;
    else if (lines > 100) complexity += 30;
    else if (lines > 50) complexity += 20;
    
    return Math.min(100, complexity);
  }

  /**
   * Calculate complexity score for complex tests
   */
  calculateComplexityScore(content, complexityPatterns) {
    let complexity = 0;
    
    complexity += complexityPatterns.length * 20;
    
    const lines = content.split('\n').length;
    if (lines > 300) complexity += 50;
    else if (lines > 150) complexity += 35;
    else if (lines > 75) complexity += 25;
    
    return Math.min(100, complexity);
  }

  /**
   * Generate suggestions based on analysis
   */
  generateSuggestions(errorType, patterns, complexity) {
    const suggestions = [];
    
    switch (errorType) {
      case 'syntax':
        suggestions.push('Fix syntax errors in test file');
        suggestions.push('Check for missing semicolons or brackets');
        break;
      case 'import':
        suggestions.push('Fix import/require statements');
        suggestions.push('Check module paths and dependencies');
        break;
      case 'reference':
        suggestions.push('Add missing variable declarations');
        suggestions.push('Check for undefined/null references');
        break;
      case 'type':
        suggestions.push('Fix type mismatches');
        suggestions.push('Add proper type checking');
        break;
      case 'assertion':
        suggestions.push('Fix test assertions');
        suggestions.push('Update expected values');
        break;
      case 'mock':
        suggestions.push('Fix mock implementations');
        suggestions.push('Add missing mock setup');
        break;
      case 'async':
        suggestions.push('Fix async/await usage');
        suggestions.push('Add proper error handling');
        break;
    }
    
    if (patterns.includes('external_dependency')) {
      suggestions.push('Mock external dependencies');
    }
    
    if (patterns.includes('network_call')) {
      suggestions.push('Mock network requests');
    }
    
    if (complexity > 70) {
      suggestions.push('Consider refactoring into smaller tests');
    }
    
    return suggestions;
  }

  /**
   * Generate legacy migration suggestions
   */
  generateLegacySuggestions(legacyPatterns, complexity) {
    const suggestions = [];
    
    if (legacyPatterns.length > 0) {
      suggestions.push('Migrate to modern Jest syntax');
      suggestions.push('Update test structure to current standards');
    }
    
    if (complexity > 50) {
      suggestions.push('Break down complex legacy tests');
      suggestions.push('Extract reusable test utilities');
    }
    
    return suggestions;
  }

  /**
   * Generate refactoring suggestions
   */
  generateRefactoringSuggestions(complexityPatterns, complexity) {
    const suggestions = [];
    
    if (complexityPatterns.length > 0) {
      suggestions.push('Extract test setup into helper functions');
      suggestions.push('Split large test suites into smaller files');
      suggestions.push('Use test factories for common test data');
    }
    
    if (complexity > 80) {
      suggestions.push('Consider complete test rewrite');
      suggestions.push('Implement test-driven development approach');
    }
    
    return suggestions;
  }

  /**
   * Calculate confidence in analysis
   */
  calculateConfidence(errorType, patterns) {
    let confidence = 0.5; // Base confidence
    
    if (errorType !== 'unknown') {
      confidence += 0.3;
    }
    
    if (patterns.length > 0) {
      confidence += Math.min(0.2, patterns.length * 0.05);
    }
    
    return Math.min(1.0, confidence);
  }

  /**
   * Determine migration path for legacy tests
   */
  determineMigrationPath(legacyPatterns) {
    if (legacyPatterns.length === 0) {
      return 'none';
    }
    
    if (legacyPatterns.length < 5) {
      return 'simple';
    }
    
    if (legacyPatterns.length < 15) {
      return 'moderate';
    }
    
    return 'complex';
  }

  /**
   * Estimate refactoring time
   */
  estimateRefactoringTime(complexity) {
    if (complexity < 30) return 60000; // 1 minute
    if (complexity < 60) return 300000; // 5 minutes
    if (complexity < 80) return 600000; // 10 minutes
    return 900000; // 15 minutes
  }
}

module.exports = TestAnalyzer; 