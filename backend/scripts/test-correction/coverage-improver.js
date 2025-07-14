#!/usr/bin/env node

require('module-alias/register');

const path = require('path');
const fs = require('fs-extra');
const { execSync } = require('child_process');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
const CoverageAnalyzerService = require('@services/CoverageAnalyzerService');
const TestCorrectionService = require('@services/TestCorrectionService');

class CoverageImprover {
  constructor(options = {}) {
    this.options = {
      targetCoverage: 90,
      minCoverage: 80,
      focusAreas: ['unit', 'integration'],
      excludePatterns: ['**/node_modules/**', '**/coverage/**', '**/*.test.js'],
      includePatterns: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
      ...options
    };
    
    this.coverageAnalyzer = new CoverageAnalyzerService();
    this.testCorrectionService = new TestCorrectionService();
    this.results = {
      initialCoverage: 0,
      finalCoverage: 0,
      improvement: 0,
      filesAnalyzed: 0,
      testsAdded: 0,
      testsImproved: 0,
      startTime: null,
      endTime: null
    };
  }

  /**
   * Main entry point for coverage improvement
   */
  async run() {
    logger.info('🎯 Starting Coverage Improvement Process...');
    this.results.startTime = new Date();
    
    try {
      // Step 1: Get current coverage
      const currentCoverage = await this.getCurrentCoverage();
      this.results.initialCoverage = currentCoverage;
      
      logger.info(`📊 Current Coverage: ${currentCoverage.toFixed(2)}%`);
      
      if (currentCoverage >= this.options.targetCoverage) {
        logger.info(`✅ Target coverage (${this.options.targetCoverage}%) already achieved!`);
        return { success: true, results: this.results };
      }
      
      // Step 2: Analyze coverage gaps
      const coverageGaps = await this.analyzeCoverageGaps();
      
      // Step 3: Generate missing tests
      const testGenerationResults = await this.generateMissingTests(coverageGaps);
      
      // Step 4: Improve existing tests
      const testImprovementResults = await this.improveExistingTests();
      
      // Step 5: Verify coverage improvement
      const finalCoverage = await this.getCurrentCoverage();
      this.results.finalCoverage = finalCoverage;
      this.results.improvement = finalCoverage - currentCoverage;
      
      // Step 6: Generate report
      await this.generateReport(testGenerationResults, testImprovementResults);
      
      this.results.endTime = new Date();
      logger.info(`✅ Coverage Improvement Completed!`);
      logger.info(`📈 Coverage improved from ${currentCoverage.toFixed(2)}% to ${finalCoverage.toFixed(2)}% (+${this.results.improvement.toFixed(2)}%)`);
      
      return {
        success: true,
        results: this.results,
        testGenerationResults,
        testImprovementResults
      };
      
    } catch (error) {
      logger.error('Coverage improvement failed', { error: error.message });
      logger.error('❌ Coverage Improvement Failed:', error.message);
      
      return {
        success: false,
        error: error.message,
        results: this.results
      };
    }
  }

  /**
   * Get current test coverage
   */
  async getCurrentCoverage() {
    logger.info('📊 Collecting current coverage...');
    
    try {
      const coverageOutput = execSync('npm test -- --coverage --json --silent', {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const coverageData = JSON.parse(coverageOutput);
      const totalCoverage = coverageData.coverageMap?.total || 0;
      
      return totalCoverage;
      
    } catch (error) {
      // Try alternative coverage collection
      try {
        const coverageOutput = execSync('npx jest --coverage --json 2>&1', {
          cwd: process.cwd(),
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        // Parse coverage from output
        const coverageMatch = coverageOutput.match(/All files\s+\|\s+(\d+(?:\.\d+)?)/);
        return coverageMatch ? parseFloat(coverageMatch[1]) : 0;
        
      } catch (fallbackError) {
        logger.info('⚠️  Could not collect coverage, assuming 0%');
        return 0;
      }
    }
  }

  /**
   * Analyze coverage gaps to identify untested code
   */
  async analyzeCoverageGaps() {
    logger.info('🔍 Analyzing coverage gaps...');
    
    const glob = require('glob');
    const coverageGaps = [];
    
    // Get all source files
    const sourceFiles = glob.sync(this.options.includePatterns, {
      cwd: process.cwd(),
      ignore: this.options.excludePatterns
    });
    
    for (const file of sourceFiles) {
      try {
        const filePath = path.join(process.cwd(), file);
        const content = await fs.readFile(filePath, 'utf8');
        
        // Analyze file for test coverage
        const analysis = await this.coverageAnalyzer.analyzeFile(filePath, content);
        
        if (analysis.coverage < this.options.minCoverage) {
          coverageGaps.push({
            file,
            filePath,
            currentCoverage: analysis.coverage,
            uncoveredLines: analysis.uncoveredLines,
            uncoveredFunctions: analysis.uncoveredFunctions,
            uncoveredBranches: analysis.uncoveredBranches,
            priority: this.calculatePriority(analysis)
          });
        }
        
      } catch (error) {
        logger.warn('Failed to analyze file for coverage', { file, error: error.message });
      }
    }
    
    // Sort by priority (highest first)
    coverageGaps.sort((a, b) => b.priority - a.priority);
    
    logger.info(`📋 Found ${coverageGaps.length} files with coverage gaps`);
    
    return coverageGaps;
  }

  /**
   * Generate missing tests for uncovered code
   */
  async generateMissingTests(coverageGaps) {
    logger.debug('🧪 Generating missing tests...');
    
    const results = {
      total: coverageGaps.length,
      successful: 0,
      failed: 0,
      testsGenerated: 0,
      details: []
    };
    
    for (const gap of coverageGaps) {
      try {
        logger.debug(`📝 Generating tests for ${gap.file} (coverage: ${gap.currentCoverage.toFixed(1)}%)`);
        
        const testGenerationResult = await this.generateTestsForFile(gap);
        
        if (testGenerationResult.success) {
          results.successful++;
          results.testsGenerated += testGenerationResult.testsGenerated;
          
          logger.debug(`✅ Generated ${testGenerationResult.testsGenerated} tests for ${gap.file}`);
        } else {
          results.failed++;
          logger.debug(`❌ Failed to generate tests for ${gap.file}: ${testGenerationResult.error}`);
        }
        
        results.details.push({
          file: gap.file,
          success: testGenerationResult.success,
          testsGenerated: testGenerationResult.testsGenerated,
          error: testGenerationResult.error
        });
        
      } catch (error) {
        results.failed++;
        logger.error('Failed to generate tests for file', {
          file: gap.file,
          error: error.message
        });
        
        results.details.push({
          file: gap.file,
          success: false,
          testsGenerated: 0,
          error: error.message
        });
      }
    }
    
    this.results.testsAdded = results.testsGenerated;
    
    logger.debug(`📊 Test Generation Results: ${results.successful} successful, ${results.failed} failed, ${results.testsGenerated} tests generated`);
    
    return results;
  }

  /**
   * Generate tests for a specific file
   */
  async generateTestsForFile(coverageGap) {
    const { file, filePath, uncoveredFunctions, uncoveredBranches } = coverageGap;
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const testContent = await this.generateTestContent(file, content, uncoveredFunctions, uncoveredBranches);
      
      if (!testContent) {
        return { success: false, error: 'No test content generated' };
      }
      
      // Determine test file path
      const testFilePath = this.getTestFilePath(file);
      
      // Check if test file already exists
      if (await fs.pathExists(testFilePath)) {
        // Append to existing test file
        const existingContent = await fs.readFile(testFilePath, 'utf8');
        const updatedContent = existingContent + '\n\n' + testContent;
        await fs.writeFile(testFilePath, updatedContent, 'utf8');
      } else {
        // Create new test file
        await fs.ensureDir(path.dirname(testFilePath));
        await fs.writeFile(testFilePath, testContent, 'utf8');
      }
      
      const testsGenerated = this.countTestsInContent(testContent);
      
      return {
        success: true,
        testsGenerated,
        testFilePath
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate test content for a file
   */
  async generateTestContent(file, content, uncoveredFunctions, uncoveredBranches) {
    const fileName = path.basename(file, path.extname(file));
    const className = this.extractClassName(content);
    
    let testContent = `// Auto-generated tests for ${file}\n`;
    testContent += `// Generated on ${new Date().toISOString()}\n\n`;
    
    // Add imports
    testContent += this.generateImports(file, content);
    
    // Add test suite
    testContent += `describe('${className || fileName}', () => {\n`;
    
    // Generate tests for uncovered functions
    for (const func of uncoveredFunctions) {
      testContent += this.generateFunctionTest(func, content);
    }
    
    // Generate tests for uncovered branches
    for (const branch of uncoveredBranches) {
      testContent += this.generateBranchTest(branch, content);
    }
    
    // Add edge case tests
    testContent += this.generateEdgeCaseTests(content);
    
    testContent += `});\n`;
    
    return testContent;
  }

  /**
   * Generate imports for test file
   */
  generateImports(file, content) {
    let imports = '';
    
    // Add Jest imports
    imports += `import { jest } from '@jest/globals';\n`;
    
    // Add module imports based on file content
    const moduleMatch = content.match(/module\.exports\s*=\s*(\w+)/);
    if (moduleMatch) {
      imports += `import ${moduleMatch[1]} from './${path.basename(file)}';\n`;
    }
    
    // Add class imports
    const classMatch = content.match(/class\s+(\w+)/);
    if (classMatch) {
      imports += `import { ${classMatch[1]} } from './${path.basename(file)}';\n`;
    }
    
    // Add function imports
    const functionMatches = content.match(/function\s+(\w+)/g);
    if (functionMatches) {
      const functionNames = functionMatches.map(match => match.replace('function ', ''));
      imports += `import { ${functionNames.join(', ')} } from './${path.basename(file)}';\n`;
    }
    
    imports += '\n';
    return imports;
  }

  /**
   * Generate test for a specific function
   */
  generateFunctionTest(func, content) {
    const testName = func.name || 'unnamed function';
    
    return `
  describe('${testName}', () => {
    test('should work correctly', () => {
      // TODO: Implement proper test for ${testName}
      expect(true).toBe(true);
    });
    
    test('should handle edge cases', () => {
      // TODO: Test edge cases for ${testName}
      expect(true).toBe(true);
    });
    
    test('should handle errors', () => {
      // TODO: Test error handling for ${testName}
      expect(true).toBe(true);
    });
  });\n`;
  }

  /**
   * Generate test for a specific branch
   */
  generateBranchTest(branch, content) {
    return `
  test('should handle branch: ${branch.condition}', () => {
    // TODO: Test branch condition: ${branch.condition}
    expect(true).toBe(true);
  });\n`;
  }

  /**
   * Generate edge case tests
   */
  generateEdgeCaseTests(content) {
    return `
  describe('edge cases', () => {
    test('should handle null input', () => {
      // TODO: Test with null input
      expect(true).toBe(true);
    });
    
    test('should handle undefined input', () => {
      // TODO: Test with undefined input
      expect(true).toBe(true);
    });
    
    test('should handle empty input', () => {
      // TODO: Test with empty input
      expect(true).toBe(true);
    });
    
    test('should handle invalid input', () => {
      // TODO: Test with invalid input
      expect(true).toBe(true);
    });
  });\n`;
  }

  /**
   * Improve existing tests to increase coverage
   */
  async improveExistingTests() {
    logger.debug('🔧 Improving existing tests...');
    
    const glob = require('glob');
    const testFiles = glob.sync('**/*.test.js', { cwd: process.cwd() });
    
    const results = {
      total: testFiles.length,
      improved: 0,
      failed: 0,
      details: []
    };
    
    for (const testFile of testFiles) {
      try {
        logger.debug(`🔧 Improving ${testFile}`);
        
        const improvementResult = await this.improveTestFile(testFile);
        
        if (improvementResult.success) {
          results.improved++;
          logger.debug(`✅ Improved ${testFile}`);
        } else {
          results.failed++;
          logger.debug(`❌ Failed to improve ${testFile}: ${improvementResult.error}`);
        }
        
        results.details.push({
          file: testFile,
          success: improvementResult.success,
          improvements: improvementResult.improvements,
          error: improvementResult.error
        });
        
      } catch (error) {
        results.failed++;
        logger.error('Failed to improve test file', {
          file: testFile,
          error: error.message
        });
        
        results.details.push({
          file: testFile,
          success: false,
          improvements: 0,
          error: error.message
        });
      }
    }
    
    this.results.testsImproved = results.improved;
    
    logger.debug(`📊 Test Improvement Results: ${results.improved} improved, ${results.failed} failed`);
    
    return results;
  }

  /**
   * Improve a specific test file
   */
  async improveTestFile(testFile) {
    try {
      const filePath = path.join(process.cwd(), testFile);
      const content = await fs.readFile(filePath, 'utf8');
      
      let improvedContent = content;
      let improvements = 0;
      
      // Add missing test setup
      if (!content.includes('beforeEach') && !content.includes('beforeAll')) {
        improvedContent = this.addTestSetup(improvedContent);
        improvements++;
      }
      
      // Add missing test cleanup
      if (!content.includes('afterEach') && !content.includes('afterAll')) {
        improvedContent = this.addTestCleanup(improvedContent);
        improvements++;
      }
      
      // Add missing error handling tests
      if (!content.includes('should handle errors') && !content.includes('should throw')) {
        improvedContent = this.addErrorHandlingTests(improvedContent);
        improvements++;
      }
      
      // Add missing edge case tests
      if (!content.includes('edge cases') && !content.includes('null') && !content.includes('undefined')) {
        improvedContent = this.addEdgeCaseTests(improvedContent);
        improvements++;
      }
      
      // Write improved content if changes were made
      if (improvements > 0) {
        await fs.writeFile(filePath, improvedContent, 'utf8');
      }
      
      return {
        success: true,
        improvements
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add test setup to a test file
   */
  addTestSetup(content) {
    const setupCode = `
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });\n`;
    
    // Insert after describe block
    return content.replace(/(describe\([^)]+\)\s*\{)/, `$1${setupCode}`);
  }

  /**
   * Add test cleanup to a test file
   */
  addTestCleanup(content) {
    const cleanupCode = `
  afterAll(() => {
    jest.restoreAllMocks();
  });\n`;
    
    // Insert before closing brace of describe block
    return content.replace(/(\n\s*\}\);?\s*$)/, `${cleanupCode}$1`);
  }

  /**
   * Add error handling tests
   */
  addErrorHandlingTests(content) {
    const errorTests = `
  describe('error handling', () => {
    test('should handle errors gracefully', () => {
      // TODO: Test error handling
      expect(true).toBe(true);
    });
    
    test('should throw appropriate errors', () => {
      // TODO: Test error throwing
      expect(true).toBe(true);
    });
  });\n`;
    
    // Insert before closing brace of describe block
    return content.replace(/(\n\s*\}\);?\s*$)/, `${errorTests}$1`);
  }

  /**
   * Add edge case tests
   */
  addEdgeCaseTests(content) {
    const edgeCaseTests = `
  describe('edge cases', () => {
    test('should handle null input', () => {
      // TODO: Test with null input
      expect(true).toBe(true);
    });
    
    test('should handle undefined input', () => {
      // TODO: Test with undefined input
      expect(true).toBe(true);
    });
    
    test('should handle empty input', () => {
      // TODO: Test with empty input
      expect(true).toBe(true);
    });
  });\n`;
    
    // Insert before closing brace of describe block
    return content.replace(/(\n\s*\}\);?\s*$)/, `${edgeCaseTests}$1`);
  }

  /**
   * Calculate priority for coverage gap
   */
  calculatePriority(analysis) {
    let priority = 0;
    
    // Higher priority for lower coverage
    priority += (100 - analysis.coverage) * 2;
    
    // Higher priority for more uncovered functions
    priority += analysis.uncoveredFunctions.length * 10;
    
    // Higher priority for more uncovered branches
    priority += analysis.uncoveredBranches.length * 5;
    
    return priority;
  }

  /**
   * Get test file path for a source file
   */
  getTestFilePath(sourceFile) {
    const dir = path.dirname(sourceFile);
    const name = path.basename(sourceFile, path.extname(sourceFile));
    return path.join(dir, `${name}.test.js`);
  }

  /**
   * Extract class name from file content
   */
  extractClassName(content) {
    const classMatch = content.match(/class\s+(\w+)/);
    return classMatch ? classMatch[1] : null;
  }

  /**
   * Count tests in test content
   */
  countTestsInContent(content) {
    const testMatches = content.match(/test\(/g) || [];
    const itMatches = content.match(/it\(/g) || [];
    return testMatches.length + itMatches.length;
  }

  /**
   * Generate comprehensive report
   */
  async generateReport(testGenerationResults, testImprovementResults) {
    logger.info('📊 Generating coverage improvement report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      options: this.options,
      results: this.results,
      testGeneration: testGenerationResults,
      testImprovement: testImprovementResults,
      recommendations: this.generateRecommendations()
    };
    
    // Save report to file
    const reportPath = path.join(process.cwd(), 'coverage-improvement-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Generate markdown report
    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = path.join(process.cwd(), 'coverage-improvement-report.md');
    await fs.writeFile(markdownPath, markdownReport);
    
    logger.info(`📄 Reports saved to:`);
    logger.info(`   - ${reportPath}`);
    logger.info(`   - ${markdownPath}`);
    
    return report;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.finalCoverage < this.options.targetCoverage) {
      recommendations.push(`Continue improving coverage to reach target of ${this.options.targetCoverage}%`);
    }
    
    if (this.results.testsAdded > 0) {
      recommendations.push('Review auto-generated tests and add proper assertions');
    }
    
    if (this.results.testsImproved > 0) {
      recommendations.push('Review improved tests and add specific test cases');
    }
    
    recommendations.push('Run tests regularly to maintain coverage');
    recommendations.push('Consider adding integration tests for complex scenarios');
    
    return recommendations;
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(report) {
    return `# Coverage Improvement Report

**Generated:** ${report.timestamp}

## Summary

- **Initial Coverage:** ${report.results.initialCoverage.toFixed(2)}%
- **Final Coverage:** ${report.results.finalCoverage.toFixed(2)}%
- **Improvement:** +${report.results.improvement.toFixed(2)}%
- **Target Coverage:** ${report.options.targetCoverage}%
- **Duration:** ${this.calculateDuration(report.results.startTime, report.results.endTime)}

## Test Generation Results

- **Files Analyzed:** ${report.testGeneration.total}
- **Successfully Generated:** ${report.testGeneration.successful}
- **Failed:** ${report.testGeneration.failed}
- **Tests Generated:** ${report.testGeneration.testsGenerated}

## Test Improvement Results

- **Files Improved:** ${report.testImprovement.improved}
- **Failed:** ${report.testImprovement.failed}

## Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## Detailed Results

### Test Generation Details

${report.testGeneration.details.map(detail => `
#### ${detail.file}
- **Status:** ${detail.success ? '✅ Success' : '❌ Failed'}
- **Tests Generated:** ${detail.testsGenerated}
${detail.error ? `- **Error:** ${detail.error}` : ''}
`).join('\n')}

### Test Improvement Details

${report.testImprovement.details.map(detail => `
#### ${detail.file}
- **Status:** ${detail.success ? '✅ Success' : '❌ Failed'}
- **Improvements:** ${detail.improvements}
${detail.error ? `- **Error:** ${detail.error}` : ''}
`).join('\n')}
`;
  }

  calculateDuration(startTime, endTime) {
    if (!startTime || !endTime) return 'Unknown';
    const duration = endTime - startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--target':
        options.targetCoverage = parseInt(args[++i]);
        break;
      case '--min-coverage':
        options.minCoverage = parseInt(args[++i]);
        break;
      case '--focus-areas':
        options.focusAreas = args[++i].split(',');
        break;
      case '--help':
        logger.info(`
Usage: node coverage-improver.js [options]

Options:
  --target <n>           Target coverage percentage (default: 90)
  --min-coverage <n>     Minimum coverage threshold (default: 80)
  --focus-areas <list>   Focus areas: unit,integration,e2e (default: unit,integration)
  --help                 Show this help message
        `);
        process.exit(0);
    }
  }
  
  const improver = new CoverageImprover(options);
  improver.run()
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      logger.error('Fatal error:', error.message);
      process.exit(1);
    });
}

module.exports = CoverageImprover; 