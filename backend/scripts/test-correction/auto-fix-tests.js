#!/usr/bin/env node

require('module-alias/register');

const path = require('path');
const fs = require('fs-extra');
const { execSync } = require('child_process');
const TestCorrectionService = require('@services/TestCorrectionService');
const TestAnalyzer = require('@external/TestAnalyzer');
const TestFixer = require('@external/TestFixer');
const CoverageAnalyzerService = require('@services/CoverageAnalyzerService');
const logger = require('@logging/logger');

class AutoFixTests {
  constructor(options = {}) {
    this.options = {
      testPattern: '**/*.test.js',
      maxConcurrent: 5,
      retryAttempts: 3,
      coverageTarget: 90,
      dryRun: false,
      backupFiles: true,
      ...options
    };
    
    this.testCorrectionService = new TestCorrectionService({
      testAnalyzer: new TestAnalyzer(),
      testFixer: new TestFixer(),
      config: {
        maxConcurrentFixes: this.options.maxConcurrent,
        retryAttempts: this.options.retryAttempts
      }
    });
    
    this.coverageAnalyzer = new CoverageAnalyzerService();
    this.results = {
      total: 0,
      fixed: 0,
      failed: 0,
      skipped: 0,
      coverage: 0,
      startTime: null,
      endTime: null
    };
  }

  /**
   * Main entry point for auto-fixing tests
   */
  async run() {
    console.log('🚀 Starting Auto Test Fix Process...');
    this.results.startTime = new Date();
    
    try {
      // Step 1: Run tests to get current status
      const testResults = await this.runTests();
      
      // Step 2: Analyze failing tests
      const corrections = await this.analyzeTests(testResults);
      
      // Step 3: Apply fixes
      const fixResults = await this.applyFixes(corrections);
      
      // Step 4: Verify fixes
      const verificationResults = await this.verifyFixes();
      
      // Step 5: Generate report
      await this.generateReport(fixResults, verificationResults);
      
      this.results.endTime = new Date();
      console.log('✅ Auto Test Fix Process Completed!');
      
      return {
        success: true,
        results: this.results,
        fixResults,
        verificationResults
      };
      
    } catch (error) {
      logger.error('Auto fix process failed', { error: error.message });
      console.error('❌ Auto Test Fix Process Failed:', error.message);
      
      return {
        success: false,
        error: error.message,
        results: this.results
      };
    }
  }

  /**
   * Run tests and collect results
   */
  async runTests() {
    console.log('📊 Running tests to collect current status...');
    
    try {
      const testOutput = execSync('npm test -- --json --silent', {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const testResults = JSON.parse(testOutput);
      
      this.results.total = testResults.numTotalTests || 0;
      const failing = testResults.testResults
        .flatMap(result => result.assertionResults || [])
        .filter(test => test.status === 'failed');
      
      console.log(`📈 Test Results: ${testResults.numPassedTests} passed, ${failing.length} failed`);
      
      return {
        total: testResults.numTotalTests,
        passed: testResults.numPassedTests,
        failed: failing.length,
        failing: failing.map(test => ({
          file: test.ancestorTitles.join(' > '),
          name: test.title,
          error: test.failureMessages?.[0] || 'Unknown error'
        }))
      };
      
    } catch (error) {
      // If tests fail, try to parse the output anyway
      console.log('⚠️  Tests failed, attempting to parse results...');
      
      try {
        const testOutput = execSync('npm test -- --json --silent 2>&1', {
          cwd: process.cwd(),
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        // Try to extract failing tests from output
        const failingTests = this.extractFailingTestsFromOutput(testOutput);
        
        return {
          total: 0,
          passed: 0,
          failed: failingTests.length,
          failing: failingTests
        };
        
      } catch (parseError) {
        throw new Error(`Failed to run or parse tests: ${error.message}`);
      }
    }
  }

  /**
   * Analyze tests and create correction tasks
   */
  async analyzeTests(testResults) {
    console.log('🔍 Analyzing failing tests...');
    
    const corrections = [];
    
    // Analyze failing tests
    if (testResults.failing && testResults.failing.length > 0) {
      const failingCorrections = await this.testCorrectionService.analyzeFailingTests(testResults);
      corrections.push(...failingCorrections);
    }
    
    // Analyze legacy tests
    const legacyTests = await this.findLegacyTests();
    if (legacyTests.length > 0) {
      const legacyCorrections = await this.testCorrectionService.analyzeLegacyTests({
        legacy: legacyTests
      });
      corrections.push(...legacyCorrections);
    }
    
    // Analyze complex tests
    const complexTests = await this.findComplexTests();
    if (complexTests.length > 0) {
      const complexCorrections = await this.testCorrectionService.analyzeComplexTests({
        complex: complexTests
      });
      corrections.push(...complexCorrections);
    }
    
    console.log(`📋 Created ${corrections.length} correction tasks`);
    
    return corrections;
  }

  /**
   * Apply fixes to tests
   */
  async applyFixes(corrections) {
    if (corrections.length === 0) {
      console.log('✅ No corrections needed');
      return [];
    }
    
    console.log(`🔧 Applying fixes to ${corrections.length} tests...`);
    
    if (this.options.dryRun) {
      console.log('🔍 DRY RUN MODE - No actual changes will be made');
      return corrections.map(correction => ({
        success: true,
        correction,
        fixResult: { success: true, fixType: 'dry_run' }
      }));
    }
    
    const results = await this.testCorrectionService.processCorrections(corrections, {
      maxConcurrent: this.options.maxConcurrent,
      onProgress: (progress) => {
        console.log(`📈 Progress: ${progress.completed}/${progress.total} (${Math.round(progress.completed/progress.total*100)}%)`);
      },
      onComplete: (results) => {
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        console.log(`✅ Fixes completed: ${successful} successful, ${failed} failed`);
      }
    });
    
    this.results.fixed = results.filter(r => r.success).length;
    this.results.failed = results.filter(r => !r.success).length;
    
    return results;
  }

  /**
   * Verify that fixes worked
   */
  async verifyFixes() {
    console.log('🔍 Verifying fixes...');
    
    try {
      const testOutput = execSync('npm test -- --json --silent', {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const testResults = JSON.parse(testOutput);
      const failing = testResults.testResults
        .flatMap(result => result.assertionResults || [])
        .filter(test => test.status === 'failed');
      
      console.log(`📊 Verification Results: ${testResults.numPassedTests} passed, ${failing.length} failed`);
      
      return {
        total: testResults.numTotalTests,
        passed: testResults.numPassedTests,
        failed: failing.length,
        success: failing.length === 0
      };
      
    } catch (error) {
      console.log('⚠️  Verification failed, some tests may still be broken');
      return {
        total: 0,
        passed: 0,
        failed: 1,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Find legacy tests in the codebase
   */
  async findLegacyTests() {
    const glob = require('glob');
    const testFiles = glob.sync(this.options.testPattern, { cwd: process.cwd() });
    const legacyTests = [];
    
    for (const testFile of testFiles) {
      try {
        const content = await fs.readFile(testFile, 'utf8');
        
        // Check for legacy patterns
        const legacyPatterns = [
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
          /jest\.getVmContext\(/
        ];
        
        const legacyCount = legacyPatterns.filter(pattern => pattern.test(content)).length;
        
        if (legacyCount > 10) {
          legacyTests.push({
            file: testFile,
            name: path.basename(testFile, '.test.js'),
            legacyPatterns: legacyCount
          });
        }
        
      } catch (error) {
        logger.warn('Failed to analyze test file for legacy patterns', { file: testFile, error: error.message });
      }
    }
    
    return legacyTests;
  }

  /**
   * Find complex tests in the codebase
   */
  async findComplexTests() {
    const glob = require('glob');
    const testFiles = glob.sync(this.options.testPattern, { cwd: process.cwd() });
    const complexTests = [];
    
    for (const testFile of testFiles) {
      try {
        const content = await fs.readFile(testFile, 'utf8');
        const lines = content.split('\n').length;
        const describeCount = (content.match(/describe\(/g) || []).length;
        const itCount = (content.match(/it\(/g) || []).length;
        const testCount = (content.match(/test\(/g) || []).length;
        const mockCount = (content.match(/jest\./g) || []).length;
        
        const complexity = lines + (describeCount + itCount + testCount) * 5 + mockCount * 2;
        
        if (complexity > 100) {
          complexTests.push({
            file: testFile,
            name: path.basename(testFile, '.test.js'),
            complexity
          });
        }
        
      } catch (error) {
        logger.warn('Failed to analyze test file for complexity', { file: testFile, error: error.message });
      }
    }
    
    return complexTests;
  }

  /**
   * Extract failing tests from test output
   */
  extractFailingTestsFromOutput(output) {
    const failingTests = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('FAIL') && line.includes('.test.js')) {
        const match = line.match(/([^\/]+\.test\.js)/);
        if (match) {
          failingTests.push({
            file: match[1],
            name: path.basename(match[1], '.test.js'),
            error: 'Test failed'
          });
        }
      }
    }
    
    return failingTests;
  }

  /**
   * Generate comprehensive report
   */
  async generateReport(fixResults, verificationResults) {
    console.log('📊 Generating report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      options: this.options,
      results: this.results,
      fixResults: {
        total: fixResults.length,
        successful: fixResults.filter(r => r.success).length,
        failed: fixResults.filter(r => !r.success).length,
        details: fixResults.map(r => ({
          testFile: r.correction?.testFile,
          testName: r.correction?.testName,
          success: r.success,
          fixType: r.fixResult?.fixType,
          error: r.error
        }))
      },
      verification: verificationResults,
      recommendations: this.generateRecommendations(fixResults, verificationResults)
    };
    
    // Save report to file
    const reportPath = path.join(process.cwd(), 'test-correction-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Generate markdown report
    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = path.join(process.cwd(), 'test-correction-report.md');
    await fs.writeFile(markdownPath, markdownReport);
    
    console.log(`📄 Reports saved to:`);
    console.log(`   - ${reportPath}`);
    console.log(`   - ${markdownPath}`);
    
    return report;
  }

  /**
   * Generate recommendations based on results
   */
  generateRecommendations(fixResults, verificationResults) {
    const recommendations = [];
    
    if (fixResults.filter(r => !r.success).length > 0) {
      recommendations.push('Some tests could not be automatically fixed. Manual review required.');
    }
    
    if (verificationResults.failed > 0) {
      recommendations.push('Some tests are still failing after fixes. Additional manual intervention needed.');
    }
    
    if (fixResults.length === 0) {
      recommendations.push('No test corrections were needed. Your test suite is in good shape!');
    }
    
    if (fixResults.filter(r => r.fixResult?.fixType === 'rewrite').length > 0) {
      recommendations.push('Some tests were completely rewritten. Review the changes carefully.');
    }
    
    return recommendations;
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(report) {
    return `# Test Correction Report

**Generated:** ${report.timestamp}

## Summary

- **Total Tests:** ${report.results.total}
- **Tests Fixed:** ${report.results.fixed}
- **Tests Failed:** ${report.results.failed}
- **Duration:** ${this.calculateDuration(report.results.startTime, report.results.endTime)}

## Fix Results

| Status | Count |
|--------|-------|
| Successful | ${report.fixResults.successful} |
| Failed | ${report.fixResults.failed} |

## Fix Types Applied

${this.generateFixTypeTable(report.fixResults.details)}

## Verification Results

- **Total Tests:** ${report.verification.total}
- **Passed:** ${report.verification.passed}
- **Failed:** ${report.verification.failed}
- **Success:** ${report.verification.success ? '✅' : '❌'}

## Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## Detailed Results

${this.generateDetailedResults(report.fixResults.details)}
`;
  }

  generateFixTypeTable(details) {
    const fixTypes = {};
    details.forEach(detail => {
      const type = detail.fixType || 'unknown';
      fixTypes[type] = (fixTypes[type] || 0) + 1;
    });
    
    return Object.entries(fixTypes)
      .map(([type, count]) => `| ${type} | ${count} |`)
      .join('\n');
  }

  generateDetailedResults(details) {
    return details.map(detail => `
### ${detail.testName || 'Unknown Test'}

- **File:** ${detail.testFile || 'Unknown'}
- **Status:** ${detail.success ? '✅ Success' : '❌ Failed'}
- **Fix Type:** ${detail.fixType || 'Unknown'}
${detail.error ? `- **Error:** ${detail.error}` : ''}
`).join('\n');
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
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--max-concurrent':
        options.maxConcurrent = parseInt(args[++i]);
        break;
      case '--coverage-target':
        options.coverageTarget = parseInt(args[++i]);
        break;
      case '--test-pattern':
        options.testPattern = args[++i];
        break;
      case '--help':
        console.log(`
Usage: node auto-fix-tests.js [options]

Options:
  --dry-run              Run without making actual changes
  --max-concurrent <n>   Maximum concurrent fixes (default: 5)
  --coverage-target <n>  Target coverage percentage (default: 90)
  --test-pattern <glob>  Test file pattern (default: **/*.test.js)
  --help                 Show this help message
        `);
        process.exit(0);
    }
  }
  
  const autoFix = new AutoFixTests(options);
  autoFix.run()
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error.message);
      process.exit(1);
    });
}

module.exports = AutoFixTests; 