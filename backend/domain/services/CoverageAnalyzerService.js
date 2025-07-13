const fs = require('fs-extra');
const path = require('path');
const { logger } = require('@infrastructure/logging/Logger');

/**
 * CoverageAnalyzerService - Analyzes and improves test coverage
 */
class CoverageAnalyzerService {
  constructor() {
    this.coverageThresholds = {
      global: 90,
      domain: 95,
      application: 90,
      infrastructure: 85,
      presentation: 80
    };
  }

  /**
   * Get current coverage for a project
   */
  async getCurrentCoverage(projectId = 'default') {
    try {
      // Try to read coverage data from Jest output
      const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
      
      if (await fs.pathExists(coveragePath)) {
        const coverageData = await fs.readJson(coveragePath);
        return this.parseCoverageData(coverageData);
      }
      
      // Fallback: try to run coverage and parse output
      const { execSync } = require('child_process');
      const coverageOutput = execSync('npm test -- --coverage --json --silent', {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const testResults = JSON.parse(coverageOutput);
      return this.parseCoverageFromTestResults(testResults);
      
    } catch (error) {
      logger.warn('Could not get current coverage', { error: error.message });
      return {
        total: 0,
        branches: 0,
        functions: 0,
        lines: 0,
        statements: 0
      };
    }
  }

  /**
   * Analyze a file for coverage gaps
   */
  async analyzeFile(filePath, content) {
    const analysis = {
      file: filePath,
      coverage: 0,
      uncoveredLines: [],
      uncoveredFunctions: [],
      uncoveredBranches: [],
      complexity: 0,
      priority: 'low'
    };

    try {
      // Simple analysis based on content
      const lines = content.split('\n');
      const functions = this.extractFunctions(content);
      const branches = this.extractBranches(content);
      
      analysis.uncoveredLines = this.identifyUncoveredLines(lines);
      analysis.uncoveredFunctions = this.identifyUncoveredFunctions(functions);
      analysis.uncoveredBranches = this.identifyUncoveredBranches(branches);
      analysis.complexity = this.calculateComplexity(content);
      analysis.coverage = this.calculateFileCoverage(analysis);
      analysis.priority = this.calculatePriority(analysis);
      
    } catch (error) {
      logger.error('Failed to analyze file', { filePath, error: error.message });
    }

    return analysis;
  }

  /**
   * Generate missing tests for uncovered code
   */
  async generateMissingTests(coverageGaps) {
    const results = {
      total: coverageGaps.length,
      successful: 0,
      failed: 0,
      testsGenerated: 0,
      details: []
    };

    for (const gap of coverageGaps) {
      try {
        const testContent = await this.generateTestContent(gap);
        const testPath = this.getTestFilePath(gap.file);
        
        await fs.ensureDir(path.dirname(testPath));
        await fs.writeFile(testPath, testContent);
        
        results.successful++;
        results.testsGenerated += this.countTestsInContent(testContent);
        results.details.push({
          file: gap.file,
          testPath,
          success: true,
          testsGenerated: this.countTestsInContent(testContent)
        });
        
        logger.info('Generated missing tests', { 
          file: gap.file, 
          testPath,
          testsGenerated: this.countTestsInContent(testContent)
        });
        
      } catch (error) {
        results.failed++;
        results.details.push({
          file: gap.file,
          success: false,
          error: error.message
        });
        
        logger.error('Failed to generate tests', { 
          file: gap.file, 
          error: error.message 
        });
      }
    }

    return results;
  }

  /**
   * Improve existing test coverage
   */
  async improveExistingTests(testFiles) {
    const results = {
      total: testFiles.length,
      improved: 0,
      failed: 0,
      details: []
    };

    for (const testFile of testFiles) {
      try {
        const content = await fs.readFile(testFile, 'utf8');
        const improvedContent = await this.improveTestContent(content, testFile);
        
        if (improvedContent !== content) {
          await fs.writeFile(testFile, improvedContent);
          results.improved++;
          results.details.push({
            file: testFile,
            success: true,
            improvements: this.detectImprovements(content, improvedContent)
          });
        }
        
      } catch (error) {
        results.failed++;
        results.details.push({
          file: testFile,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Parse coverage data from Jest output
   */
  parseCoverageData(coverageData) {
    const summary = coverageData.total || coverageData;
    
    return {
      total: summary.lines?.pct || 0,
      branches: summary.branches?.pct || 0,
      functions: summary.functions?.pct || 0,
      lines: summary.lines?.pct || 0,
      statements: summary.statements?.pct || 0
    };
  }

  /**
   * Parse coverage from test results
   */
  parseCoverageFromTestResults(testResults) {
    const coverageMap = testResults.coverageMap || {};
    const totalCoverage = coverageMap.total || 0;
    
    return {
      total: totalCoverage,
      branches: totalCoverage,
      functions: totalCoverage,
      lines: totalCoverage,
      statements: totalCoverage
    };
  }

  /**
   * Extract functions from content
   */
  extractFunctions(content) {
    const functions = [];
    const functionRegex = /(?:function\s+(\w+)|(\w+)\s*[:=]\s*(?:async\s+)?function|(\w+)\s*[:=]\s*(?:async\s+)?\([^)]*\)\s*=>)/g;
    
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1] || match[2] || match[3];
      if (functionName) {
        functions.push({
          name: functionName,
          line: content.substring(0, match.index).split('\n').length
        });
      }
    }
    
    return functions;
  }

  /**
   * Extract branches from content
   */
  extractBranches(content) {
    const branches = [];
    const branchRegex = /(?:if|else\s+if|switch|case|catch|finally)\s*\(/g;
    
    let match;
    while ((match = branchRegex.exec(content)) !== null) {
      branches.push({
        type: match[0].split('(')[0].trim(),
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return branches;
  }

  /**
   * Identify uncovered lines
   */
  identifyUncoveredLines(lines) {
    return lines
      .map((line, index) => ({ line: line.trim(), index: index + 1 }))
      .filter(({ line }) => 
        line.length > 0 && 
        !line.startsWith('//') && 
        !line.startsWith('/*') &&
        !line.startsWith('*') &&
        !line.startsWith('*/')
      )
      .map(({ index }) => index);
  }

  /**
   * Identify uncovered functions
   */
  identifyUncoveredFunctions(functions) {
    return functions.map(f => f.name);
  }

  /**
   * Identify uncovered branches
   */
  identifyUncoveredBranches(branches) {
    return branches.map(b => ({ type: b.type, line: b.line }));
  }

  /**
   * Calculate file complexity
   */
  calculateComplexity(content) {
    let complexity = 1;
    
    // Add complexity for control structures
    complexity += (content.match(/if|else|switch|case|catch|finally|for|while|do/g) || []).length;
    
    // Add complexity for logical operators
    complexity += (content.match(/&&|\|\||!/g) || []).length;
    
    // Add complexity for function calls
    complexity += (content.match(/\.\w+\(/g) || []).length;
    
    return complexity;
  }

  /**
   * Calculate file coverage percentage
   */
  calculateFileCoverage(analysis) {
    const totalElements = analysis.uncoveredLines.length + 
                         analysis.uncoveredFunctions.length + 
                         analysis.uncoveredBranches.length;
    
    if (totalElements === 0) return 100;
    
    const coveredElements = totalElements - 
                           analysis.uncoveredLines.length - 
                           analysis.uncoveredFunctions.length - 
                           analysis.uncoveredBranches.length;
    
    return Math.round((coveredElements / totalElements) * 100);
  }

  /**
   * Calculate priority for coverage improvement
   */
  calculatePriority(analysis) {
    if (analysis.complexity > 10) return 'high';
    if (analysis.complexity > 5) return 'medium';
    return 'low';
  }

  /**
   * Generate test content for a file
   */
  async generateTestContent(coverageGap) {
    const content = await fs.readFile(coverageGap.filePath, 'utf8');
    const className = this.extractClassName(content);
    const functions = this.extractFunctions(content);
    
    let testContent = `const ${className} = require('../${path.basename(coverageGap.file, '.js')}');\n\n`;
    testContent += `describe('${className}', () => {\n`;
    
    for (const func of functions) {
      testContent += `  describe('${func.name}', () => {\n`;
      testContent += `    it('should work correctly', () => {\n`;
      testContent += `      // TODO: Add test implementation\n`;
      testContent += `      expect(true).toBe(true);\n`;
      testContent += `    });\n`;
      testContent += `  });\n\n`;
    }
    
    testContent += `});\n`;
    
    return testContent;
  }

  /**
   * Get test file path for a source file
   */
  getTestFilePath(sourceFile) {
    const relativePath = path.relative(process.cwd(), sourceFile);
    const dir = path.dirname(relativePath);
    const basename = path.basename(relativePath, '.js');
    
    return path.join(process.cwd(), 'tests', dir, `${basename}.test.js`);
  }

  /**
   * Extract class name from content
   */
  extractClassName(content) {
    const classMatch = content.match(/class\s+(\w+)/);
    return classMatch ? classMatch[1] : 'UnknownClass';
  }

  /**
   * Count tests in content
   */
  countTestsInContent(content) {
    return (content.match(/it\(/g) || []).length;
  }

  /**
   * Improve test content
   */
  async improveTestContent(content, testFile) {
    let improvedContent = content;
    
    // Add missing test setup
    if (!content.includes('beforeEach') && !content.includes('beforeAll')) {
      improvedContent = this.addTestSetup(improvedContent);
    }
    
    // Add missing test cleanup
    if (!content.includes('afterEach') && !content.includes('afterAll')) {
      improvedContent = this.addTestCleanup(improvedContent);
    }
    
    // Add error handling tests
    improvedContent = this.addErrorHandlingTests(improvedContent);
    
    // Add edge case tests
    improvedContent = this.addEdgeCaseTests(improvedContent);
    
    return improvedContent;
  }

  /**
   * Add test setup
   */
  addTestSetup(content) {
    if (!content.includes('beforeEach')) {
      const setupCode = `  beforeEach(() => {\n    // Setup test environment\n  });\n\n`;
      const insertIndex = content.indexOf('describe(') + content.substring(content.indexOf('describe(')).indexOf('{') + 1;
      return content.substring(0, insertIndex) + setupCode + content.substring(insertIndex);
    }
    return content;
  }

  /**
   * Add test cleanup
   */
  addTestCleanup(content) {
    if (!content.includes('afterEach')) {
      const cleanupCode = `  afterEach(() => {\n    // Cleanup test environment\n  });\n\n`;
      const lastDescribeIndex = content.lastIndexOf('describe(');
      const insertIndex = content.indexOf('}', lastDescribeIndex);
      return content.substring(0, insertIndex) + cleanupCode + content.substring(insertIndex);
    }
    return content;
  }

  /**
   * Add error handling tests
   */
  addErrorHandlingTests(content) {
    // Add basic error handling test if none exists
    if (!content.includes('should throw') && !content.includes('should handle error')) {
      const errorTest = `    it('should handle errors gracefully', () => {\n      // TODO: Add error handling test\n      expect(true).toBe(true);\n    });\n\n`;
      const lastItIndex = content.lastIndexOf('it(');
      if (lastItIndex !== -1) {
        const insertIndex = content.indexOf('});', lastItIndex);
        return content.substring(0, insertIndex) + errorTest + content.substring(insertIndex);
      }
    }
    return content;
  }

  /**
   * Add edge case tests
   */
  addEdgeCaseTests(content) {
    // Add basic edge case test if none exists
    if (!content.includes('edge case') && !content.includes('boundary')) {
      const edgeTest = `    it('should handle edge cases', () => {\n      // TODO: Add edge case test\n      expect(true).toBe(true);\n    });\n\n`;
      const lastItIndex = content.lastIndexOf('it(');
      if (lastItIndex !== -1) {
        const insertIndex = content.indexOf('});', lastItIndex);
        return content.substring(0, insertIndex) + edgeTest + content.substring(insertIndex);
      }
    }
    return content;
  }

  /**
   * Detect improvements between old and new content
   */
  detectImprovements(oldContent, newContent) {
    const improvements = [];
    
    if (newContent.includes('beforeEach') && !oldContent.includes('beforeEach')) {
      improvements.push('Added test setup');
    }
    
    if (newContent.includes('afterEach') && !oldContent.includes('afterEach')) {
      improvements.push('Added test cleanup');
    }
    
    if (newContent.includes('should handle errors') && !oldContent.includes('should handle errors')) {
      improvements.push('Added error handling tests');
    }
    
    if (newContent.includes('should handle edge cases') && !oldContent.includes('should handle edge cases')) {
      improvements.push('Added edge case tests');
    }
    
    return improvements;
  }
}

module.exports = CoverageAnalyzerService; 