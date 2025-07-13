/**
 * TestAnalyzer - Infrastructure component for analyzing test files
 * Identifies failing, legacy, and complex tests in a project
 */
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { clear } = require('console');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

const execAsync = promisify(exec);

class TestAnalyzer {
  constructor() {
    this.logger = console;
    this.testFilePatterns = [
      '**/*.test.js',
      '**/*.test.ts',
      '**/*.spec.js',
      '**/*.spec.ts',
      '**/__tests__/**/*.js',
      '**/__tests__/**/*.ts',
      '**/tests/**/*.js',
      '**/tests/**/*.ts'
    ];
    
    this.legacyPatterns = [
      /describe\(/g,
      /it\(/g,
      /test\(/g,
      /expect\(/g
    ];
    
    this.complexityThresholds = {
      maxLines: 100,
      maxNesting: 5,
      maxAssertions: 10
    };
  }

  /**
   * Initialize the analyzer
   */
  async initialize() {
    this.logger.info('[TestAnalyzer] Initialized');
  }

  /**
   * Analyze failing tests in project
   * @param {string} projectPath - Project path
   * @returns {Promise<Array>} Array of failing test objects
   */
  async analyzeFailingTests(projectPath) {
    try {
      this.logger.info(`[TestAnalyzer] Analyzing failing tests in: ${projectPath}`);
      
      const failingTests = [];
      
      // Run tests to identify failures
      const testResult = await this.runTests(projectPath);
      
      if (testResult.failures && testResult.failures.length > 0) {
        for (const failure of testResult.failures) {
          const testFile = await this.findTestFile(projectPath, failure.testName);
          
          if (testFile) {
            failingTests.push({
              id: `failing-${Date.now()}-${Math.random()}`,
              testName: failure.testName,
              filePath: testFile,
              error: failure.error,
              errorMessage: failure.errorMessage,
              lineNumber: failure.lineNumber || 0,
              type: 'failing',
              priority: 'high',
              metadata: {
                failureType: this.categorizeFailure(failure.errorMessage),
                lastRun: new Date().toISOString(),
                attempts: 0
              }
            });
          }
        }
      }
      
      this.logger.info(`[TestAnalyzer] Found ${failingTests.length} failing tests`);
      return failingTests;
      
    } catch (error) {
      this.logger.error(`[TestAnalyzer] Failed to analyze failing tests: ${error.message}`);
      return [];
    }
  }

  /**
   * Analyze legacy tests in project
   * @param {string} projectPath - Project path
   * @returns {Promise<Array>} Array of legacy test objects
   */
  async analyzeLegacyTests(projectPath) {
    try {
      this.logger.info(`[TestAnalyzer] Analyzing legacy tests in: ${projectPath}`);
      
      const legacyTests = [];
      const testFiles = await this.findTestFiles(projectPath);
      
      for (const testFile of testFiles) {
        const content = await fs.readFile(testFile, 'utf8');
        const legacyScore = this.calculateLegacyScore(content);
        
        if (legacyScore > 0.7) { // 70% legacy threshold
          legacyTests.push({
            id: `legacy-${Date.now()}-${Math.random()}`,
            filePath: testFile,
            legacyScore: legacyScore,
            type: 'legacy',
            priority: 'medium',
            metadata: {
              legacyPatterns: this.identifyLegacyPatterns(content),
              lastModified: await this.getLastModified(testFile),
              recommendations: this.generateLegacyRecommendations(content)
            }
          });
        }
      }
      
      this.logger.info(`[TestAnalyzer] Found ${legacyTests.length} legacy tests`);
      return legacyTests;
      
    } catch (error) {
      this.logger.error(`[TestAnalyzer] Failed to analyze legacy tests: ${error.message}`);
      return [];
    }
  }

  /**
   * Analyze complex tests in project
   * @param {string} projectPath - Project path
   * @returns {Promise<Array>} Array of complex test objects
   */
  async analyzeComplexTests(projectPath) {
    try {
      this.logger.info(`[TestAnalyzer] Analyzing complex tests in: ${projectPath}`);
      
      const complexTests = [];
      const testFiles = await this.findTestFiles(projectPath);
      
      for (const testFile of testFiles) {
        const content = await fs.readFile(testFile, 'utf8');
        const complexity = this.calculateComplexity(content);
        
        if (complexity.score > 0.8) { // 80% complexity threshold
          complexTests.push({
            id: `complex-${Date.now()}-${Math.random()}`,
            filePath: testFile,
            complexityScore: complexity.score,
            type: 'complex',
            priority: 'medium',
            metadata: {
              lineCount: complexity.lineCount,
              nestingLevel: complexity.nestingLevel,
              assertionCount: complexity.assertionCount,
              recommendations: this.generateComplexityRecommendations(complexity)
            }
          });
        }
      }
      
      this.logger.info(`[TestAnalyzer] Found ${complexTests.length} complex tests`);
      return complexTests;
      
    } catch (error) {
      this.logger.error(`[TestAnalyzer] Failed to analyze complex tests: ${error.message}`);
      return [];
    }
  }

  /**
   * Run tests to identify failures
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Test results
   */
  async runTests(projectPath) {
    try {
      // Check if package.json exists and has test script
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      if (!packageJson.scripts || !packageJson.scripts.test) {
        return { failures: [] };
      }
      
      // Run tests with timeout
      const { stdout, stderr } = await execAsync('npm test', {
        cwd: projectPath,
        timeout: 30000 // 30 seconds timeout
      });
      
      // Parse test output to identify failures
      return this.parseTestOutput(stdout, stderr);
      
    } catch (error) {
      // If tests fail, parse the error output
      if (error.stderr) {
        return this.parseTestOutput('', error.stderr);
      }
      
      this.logger.warn(`[TestAnalyzer] Test execution failed: ${error.message}`);
      return { failures: [] };
    }
  }

  /**
   * Parse test output to identify failures
   * @param {string} stdout - Standard output
   * @param {string} stderr - Standard error
   * @returns {Object} Parsed test results
   */
  parseTestOutput(stdout, stderr) {
    const failures = [];
    const output = stdout + stderr;
    
    // Common test failure patterns
    const failurePatterns = [
      /FAIL\s+(.+)/g,
      /✕\s+(.+)/g,
      /×\s+(.+)/g,
      /Error:\s+(.+)/g,
      /AssertionError:\s+(.+)/g
    ];
    
    for (const pattern of failurePatterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        failures.push({
          testName: match[1] || 'Unknown Test',
          error: 'Test Failure',
          errorMessage: match[0],
          lineNumber: 0
        });
      }
    }
    
    return { failures };
  }

  /**
   * Find test files in project
   * @param {string} projectPath - Project path
   * @returns {Promise<Array>} Array of test file paths
   */
  async findTestFiles(projectPath) {
    const testFiles = [];
    
    try {
      // Simple recursive file finder for test files
      const findFiles = async (dir) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await findFiles(fullPath);
          } else if (entry.isFile() && this.isTestFile(entry.name)) {
            testFiles.push(fullPath);
          }
        }
      };
      
      await findFiles(projectPath);
      
    } catch (error) {
      this.logger.warn(`[TestAnalyzer] Error finding test files: ${error.message}`);
    }
    
    return testFiles;
  }

  /**
   * Check if file is a test file
   * @param {string} filename - Filename
   * @returns {boolean} True if test file
   */
  isTestFile(filename) {
    return this.testFilePatterns.some(pattern => {
      const regex = pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
      return new RegExp(regex).test(filename);
    });
  }

  /**
   * Find test file by test name
   * @param {string} projectPath - Project path
   * @param {string} testName - Test name
   * @returns {Promise<string|null>} Test file path or null
   */
  async findTestFile(projectPath, testName) {
    const testFiles = await this.findTestFiles(projectPath);
    
    for (const testFile of testFiles) {
      try {
        const content = await fs.readFile(testFile, 'utf8');
        if (content.includes(testName)) {
          return testFile;
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
    
    return null;
  }

  /**
   * Calculate legacy score for test content
   * @param {string} content - Test file content
   * @returns {number} Legacy score (0-1)
   */
  calculateLegacyScore(content) {
    let legacyCount = 0;
    let totalPatterns = 0;
    
    for (const pattern of this.legacyPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        legacyCount += matches.length;
      }
      totalPatterns++;
    }
    
    // Check for modern testing patterns
    const modernPatterns = [
      /import.*from.*['"]@testing-library/g,
      /import.*from.*['"]jest/g,
      /describe\.each/g,
      /test\.each/g,
      /beforeEach/g,
      /afterEach/g
    ];
    
    let modernCount = 0;
    for (const pattern of modernPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        modernCount += matches.length;
      }
    }
    
    // Calculate score: higher legacy patterns, lower modern patterns = higher legacy score
    const legacyRatio = legacyCount / Math.max(totalPatterns, 1);
    const modernRatio = modernCount / Math.max(totalPatterns, 1);
    
    return Math.min(1, Math.max(0, legacyRatio - modernRatio * 0.5));
  }

  /**
   * Calculate complexity score for test content
   * @param {string} content - Test file content
   * @returns {Object} Complexity metrics
   */
  calculateComplexity(content) {
    const lines = content.split('\n');
    const lineCount = lines.length;
    
    let nestingLevel = 0;
    let maxNesting = 0;
    let assertionCount = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Count nesting
      if (trimmed.includes('{')) {
        nestingLevel++;
        maxNesting = Math.max(maxNesting, nestingLevel);
      }
      if (trimmed.includes('}')) {
        nestingLevel = Math.max(0, nestingLevel - 1);
      }
      
      // Count assertions
      if (trimmed.includes('expect(') || trimmed.includes('assert(')) {
        assertionCount++;
      }
    }
    
    // Calculate complexity score
    const lineScore = Math.min(1, lineCount / this.complexityThresholds.maxLines);
    const nestingScore = Math.min(1, maxNesting / this.complexityThresholds.maxNesting);
    const assertionScore = Math.min(1, assertionCount / this.complexityThresholds.maxAssertions);
    
    const score = (lineScore + nestingScore + assertionScore) / 3;
    
    return {
      score,
      lineCount,
      nestingLevel: maxNesting,
      assertionCount
    };
  }

  /**
   * Categorize test failure
   * @param {string} errorMessage - Error message
   * @returns {string} Failure category
   */
  categorizeFailure(errorMessage) {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('async')) return 'async';
    if (message.includes('mock')) return 'mock';
    if (message.includes('import')) return 'import';
    if (message.includes('syntax')) return 'syntax';
    if (message.includes('type')) return 'type';
    if (message.includes('undefined')) return 'undefined';
    if (message.includes('null')) return 'null';
    
    return '';
  }

  /**
   * Identify legacy patterns in content
   * @param {string} content - Test file content
   * @returns {Array} Array of legacy patterns found
   */
  identifyLegacyPatterns(content) {
    const patterns = [];
    
    for (const pattern of this.legacyPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        patterns.push({
          pattern: pattern.source,
          count: matches.length
        });
      }
    }
    
    return patterns;
  }

  /**
   * Generate legacy recommendations
   * @param {string} content - Test file content
   * @returns {Array} Array of recommendations
   */
  generateLegacyRecommendations(content) {
    const recommendations = [];
    
    if (content.includes('describe(') && !content.includes('@testing-library')) {
      recommendations.push('Consider using @testing-library for better user-centric testing');
    }
    
    if (content.includes('document.querySelector')) {
      recommendations.push('Replace querySelector with @testing-library queries');
    }
    
    if (content.includes('fireEvent(') && !content.includes('@testing-library')) {
      recommendations.push('Use @testing-library fireEvent for better event simulation');
    }
    
    return recommendations;
  }

  /**
   * Generate complexity recommendations
   * @param {Object} complexity - Complexity metrics
   * @returns {Array} Array of recommendations
   */
  generateComplexityRecommendations(complexity) {
    const recommendations = [];
    
    if (complexity.lineCount > this.complexityThresholds.maxLines) {
      recommendations.push('Split large test file into smaller, focused test files');
    }
    
    if (complexity.nestingLevel > this.complexityThresholds.maxNesting) {
      recommendations.push('Reduce nesting by extracting helper functions');
    }
    
    if (complexity.assertionCount > this.complexityThresholds.maxAssertions) {
      recommendations.push('Split test with many assertions into multiple focused tests');
    }
    
    return recommendations;
  }

  /**
   * Get last modified date of file
   * @param {string} filePath - File path
   * @returns {Promise<string>} Last modified date
   */
  async getLastModified(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.mtime.toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  }
}

module.exports = TestAnalyzer; 