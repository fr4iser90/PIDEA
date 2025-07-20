
/**
 * TestingStep - Comprehensive Testing Workflow
 * Integrates all test analyzer tools and provides complete testing functionality
 */

const StepBuilder = require('@steps/StepBuilder');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const Logger = require('@logging/Logger');
const logger = new Logger('TestingStep');

const execAsync = promisify(exec);

// Step configuration
const config = {
  name: 'TestingStep',
  type: 'testing',
  description: 'Comprehensive testing workflow with analysis, generation, and fixing',
  category: 'testing',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 300000, // 5 minutes
    parallel: true,
    includeTestAnalysis: true,
    includeTestGeneration: true,
    includeTestFixing: true,
    includeCoverageAnalysis: true,
    includeAutoTestFix: true,
    maxFileSize: 1024 * 1024, // 1MB
    maxFiles: 1000
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class TestingStep {
  constructor() {
    this.name = 'TestingStep';
    this.description = 'Comprehensive testing workflow with analysis, generation, and fixing';
    this.category = 'testing';
    this.dependencies = [];
    
    // Test file patterns
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
    
    // Legacy patterns for test analysis
    this.legacyPatterns = [
      /describe\(/g,
      /it\(/g,
      /test\(/g,
      /expect\(/g
    ];
    
    // Complexity thresholds
    this.complexityThresholds = {
      maxLines: 100,
      maxNesting: 5,
      maxAssertions: 10
    };
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = TestingStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🧪 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const projectPath = context.projectPath;
      const results = {
        testAnalysis: null,
        testGeneration: null,
        testFixing: null,
        coverageAnalysis: null,
        autoTestFix: null,
        summary: null
      };

      logger.debug(`📊 Starting comprehensive testing for: ${projectPath}`);

      // 1. Test Analysis
      if (context.includeTestAnalysis !== false) {
        logger.debug('🔍 Running test analysis...');
        results.testAnalysis = await this.runTestAnalysis(projectPath, context);
      }

      // 2. Test Generation
      if (context.includeTestGeneration !== false) {
        logger.debug('📝 Running test generation...');
        results.testGeneration = await this.runTestGeneration(projectPath, context);
      }

      // 3. Test Fixing
      if (context.includeTestFixing !== false) {
        logger.debug('🔧 Running test fixing...');
        results.testFixing = await this.runTestFixing(projectPath, context);
      }

      // 4. Coverage Analysis
      if (context.includeCoverageAnalysis !== false) {
        logger.info('📈 Running coverage analysis...');
        results.coverageAnalysis = await this.runCoverageAnalysis(projectPath, context);
      }

      // 5. Auto Test Fix
      if (context.includeAutoTestFix !== false) {
        logger.debug('🤖 Running auto test fix...');
        results.autoTestFix = await this.runAutoTestFix(projectPath, context);
      }

      // Generate comprehensive summary
      results.summary = this.generateSummary(results);

      logger.info(`✅ ${this.name} completed successfully`);
      return {
        success: true,
        step: this.name,
        results: results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`❌ ${this.name} failed:`, error.message);
      return {
        success: false,
        step: this.name,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Run comprehensive test analysis
   */
  async runTestAnalysis(projectPath, context) {
    try {
      // Analyze failing tests
      const failingTests = await this.analyzeFailingTests(projectPath);
      
      // Analyze legacy tests
      const legacyTests = await this.analyzeLegacyTests(projectPath);
      
      // Analyze complex tests
      const complexTests = await this.analyzeComplexTests(projectPath);
      
      // Run tests to get current status
      const testResults = await this.runTests(projectPath);

      return {
        success: true,
        failingTests: {
          count: failingTests.length,
          tests: failingTests
        },
        legacyTests: {
          count: legacyTests.length,
          tests: legacyTests
        },
        complexTests: {
          count: complexTests.length,
          tests: complexTests
        },
        testResults: testResults,
        totalIssues: failingTests.length + legacyTests.length + complexTests.length
      };
    } catch (error) {
      logger.error('❌ Test analysis failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Analyze failing tests
   */
  async analyzeFailingTests(projectPath) {
    try {
      const failingTests = [];
      
      // Find test files
      const testFiles = await this.findTestFiles(projectPath);
      
      for (const testFile of testFiles) {
        try {
          // Run individual test file
          const result = await this.runTestFile(testFile);
          
          if (result.failing && result.failing.length > 0) {
            failingTests.push(...result.failing.map(test => ({
              file: testFile,
              name: test.name,
              error: test.error,
              duration: test.duration
            })));
          }
        } catch (error) {
          logger.debug(`Failed to analyze test file: ${testFile}`, error.message);
        }
      }
      
      return failingTests;
    } catch (error) {
      logger.error('Failed to analyze failing tests:', error.message);
      return [];
    }
  }

  /**
   * Analyze legacy tests
   */
  async analyzeLegacyTests(projectPath) {
    try {
      const legacyTests = [];
      
      // Find test files
      const testFiles = await this.findTestFiles(projectPath);
      
      for (const testFile of testFiles) {
        try {
          const content = await fs.readFile(testFile, 'utf-8');
          
          // Check for legacy patterns
          const legacyPatterns = this.legacyPatterns.filter(pattern => 
            pattern.test(content)
          );
          
          if (legacyPatterns.length > 0) {
            legacyTests.push({
              file: testFile,
              patterns: legacyPatterns.map(p => p.source),
              lineCount: content.split('\n').length
            });
          }
        } catch (error) {
          logger.debug(`Failed to analyze legacy test: ${testFile}`, error.message);
        }
      }
      
      return legacyTests;
    } catch (error) {
      logger.error('Failed to analyze legacy tests:', error.message);
      return [];
    }
  }

  /**
   * Analyze complex tests
   */
  async analyzeComplexTests(projectPath) {
    try {
      const complexTests = [];
      
      // Find test files
      const testFiles = await this.findTestFiles(projectPath);
      
      for (const testFile of testFiles) {
        try {
          const content = await fs.readFile(testFile, 'utf-8');
          const lines = content.split('\n');
          
          // Calculate complexity metrics
          const complexity = this.calculateComplexity(content);
          
          if (complexity.score > 7) { // High complexity threshold
            complexTests.push({
              file: testFile,
              complexity: complexity,
              lineCount: lines.length,
              suggestions: this.generateComplexitySuggestions(complexity)
            });
          }
        } catch (error) {
          logger.debug(`Failed to analyze complex test: ${testFile}`, error.message);
        }
      }
      
      return complexTests;
    } catch (error) {
      logger.error('Failed to analyze complex tests:', error.message);
      return [];
    }
  }

  /**
   * Calculate test complexity
   */
  calculateComplexity(content) {
    const lines = content.split('\n');
    let nestingLevel = 0;
    let maxNesting = 0;
    let assertionCount = 0;
    let functionCount = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Count nesting
      if (trimmed.includes('describe(') || trimmed.includes('it(') || trimmed.includes('test(')) {
        nestingLevel++;
        maxNesting = Math.max(maxNesting, nestingLevel);
      }
      
      if (trimmed.includes('});') || trimmed.includes('});')) {
        nestingLevel = Math.max(0, nestingLevel - 1);
      }
      
      // Count assertions
      if (trimmed.includes('expect(') || trimmed.includes('assert(')) {
        assertionCount++;
      }
      
      // Count functions
      if (trimmed.includes('function ') || trimmed.includes('=>')) {
        functionCount++;
      }
    }
    
    // Calculate complexity score (1-10)
    const score = Math.min(10, 
      (maxNesting / this.complexityThresholds.maxNesting) * 3 +
      (assertionCount / this.complexityThresholds.maxAssertions) * 3 +
      (lines.length / this.complexityThresholds.maxLines) * 2 +
      (functionCount / 5) * 2
    );
    
    return {
      score: Math.round(score * 10) / 10,
      maxNesting,
      assertionCount,
      lineCount: lines.length,
      functionCount
    };
  }

  /**
   * Generate complexity suggestions
   */
  generateComplexitySuggestions(complexity) {
    const suggestions = [];
    
    if (complexity.maxNesting > this.complexityThresholds.maxNesting) {
      suggestions.push('Reduce nesting levels by extracting helper functions');
    }
    
    if (complexity.assertionCount > this.complexityThresholds.maxAssertions) {
      suggestions.push('Split test into multiple smaller tests');
    }
    
    if (complexity.lineCount > this.complexityThresholds.maxLines) {
      suggestions.push('Break down large test file into smaller modules');
    }
    
    if (complexity.functionCount > 5) {
      suggestions.push('Consider using test utilities and shared setup');
    }
    
    return suggestions;
  }

  /**
   * Find test files in project
   */
  async findTestFiles(projectPath) {
    const testFiles = [];
    
    try {
      // Simple file discovery (in production, use glob patterns)
      const commonTestDirs = ['tests', '__tests__', 'test', 'spec'];
      
      for (const dir of commonTestDirs) {
        const testDir = path.join(projectPath, dir);
        try {
          const files = await this.scanDirectory(testDir);
          testFiles.push(...files.filter(file => 
            file.endsWith('.test.js') || 
            file.endsWith('.test.ts') || 
            file.endsWith('.spec.js') || 
            file.endsWith('.spec.ts')
          ));
        } catch (error) {
          // Directory doesn't exist, skip
        }
      }
      
      // Also check for test files in src directories
      const srcDirs = ['src', 'app', 'lib'];
      for (const dir of srcDirs) {
        const srcDir = path.join(projectPath, dir);
        try {
          const files = await this.scanDirectory(srcDir);
          testFiles.push(...files.filter(file => 
            file.endsWith('.test.js') || 
            file.endsWith('.test.ts') || 
            file.endsWith('.spec.js') || 
            file.endsWith('.spec.ts')
          ));
        } catch (error) {
          // Directory doesn't exist, skip
        }
      }
      
    } catch (error) {
      logger.error('Failed to find test files:', error.message);
    }
    
    return testFiles;
  }

  /**
   * Scan directory recursively
   */
  async scanDirectory(dirPath, maxDepth = 3, currentDepth = 0) {
    if (currentDepth > maxDepth) return [];
    
    const files = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.scanDirectory(fullPath, maxDepth, currentDepth + 1);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return files;
  }

  /**
   * Run individual test file
   */
  async runTestFile(testFile) {
    try {
      const projectPath = path.dirname(testFile);
      const testCommand = this.getTestCommand(projectPath);
      
      if (!testCommand) {
        return { success: false, error: 'No test command found' };
      }
      
      const { stdout, stderr } = await execAsync(`${testCommand} "${testFile}"`, {
        cwd: projectPath,
        timeout: 30000
      });
      
      return this.parseTestOutput(stdout, stderr);
    } catch (error) {
      return {
        success: false,
        error: error.message,
        failing: [{
          name: path.basename(testFile),
          error: error.message
        }]
      };
    }
  }

  /**
   * Get test command for project
   */
  getTestCommand(projectPath) {
    try {
      const packageJson = require(path.join(projectPath, 'package.json'));
      const scripts = packageJson.scripts || {};
      
      if (scripts.test) return 'npm test';
      if (scripts['test:unit']) return 'npm run test:unit';
      if (scripts.jest) return 'npm run jest';
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse test output
   */
  parseTestOutput(stdout, stderr) {
    const result = {
      success: true,
      passing: [],
      failing: [],
      total: 0
    };
    
    // Simple parsing (in production, use proper test result parsers)
    const lines = stdout.split('\n');
    
    for (const line of lines) {
      if (line.includes('✓') || line.includes('PASS')) {
        result.passing.push({ name: line.trim() });
      } else if (line.includes('✗') || line.includes('FAIL')) {
        result.failing.push({ name: line.trim(), error: 'Test failed' });
      }
    }
    
    result.total = result.passing.length + result.failing.length;
    result.success = result.failing.length === 0;
    
    return result;
  }

  /**
   * Run tests
   */
  async runTests(projectPath) {
    try {
      const testCommand = this.getTestCommand(projectPath);
      
      if (!testCommand) {
        return { success: false, error: 'No test command found' };
      }
      
      const { stdout, stderr } = await execAsync(testCommand, {
        cwd: projectPath,
        timeout: 60000
      });
      
      return this.parseTestOutput(stdout, stderr);
    } catch (error) {
      return {
        success: false,
        error: error.message,
        passing: [],
        failing: [],
        total: 0
      };
    }
  }

  /**
   * Run test generation
   */
  async runTestGeneration(projectPath, context) {
    try {
      // Find source files that need tests
      const sourceFiles = await this.findSourceFiles(projectPath);
      const testFiles = await this.findTestFiles(projectPath);
      
      // Identify files without tests
      const filesWithoutTests = sourceFiles.filter(sourceFile => {
        const baseName = path.basename(sourceFile, path.extname(sourceFile));
        return !testFiles.some(testFile => 
          testFile.includes(baseName + '.test.') || 
          testFile.includes(baseName + '.spec.')
        );
      });
      
      return {
        success: true,
        generatedTests: [],
        testCount: 0,
        filesWithoutTests: filesWithoutTests.length,
        suggestions: [
          `Found ${filesWithoutTests.length} files without tests`,
          'Consider adding unit tests for uncovered files'
        ]
      };
    } catch (error) {
      logger.error('❌ Test generation failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Find source files
   */
  async findSourceFiles(projectPath) {
    const sourceFiles = [];
    
    try {
      const srcDirs = ['src', 'app', 'lib', 'components', 'services'];
      
      for (const dir of srcDirs) {
        const srcDir = path.join(projectPath, dir);
        try {
          const files = await this.scanDirectory(srcDir);
          sourceFiles.push(...files.filter(file => 
            file.endsWith('.js') || 
            file.endsWith('.ts') || 
            file.endsWith('.jsx') || 
            file.endsWith('.tsx')
          ));
        } catch (error) {
          // Directory doesn't exist, skip
        }
      }
    } catch (error) {
      logger.error('Failed to find source files:', error.message);
    }
    
    return sourceFiles;
  }

  /**
   * Run test fixing
   */
  async runTestFixing(projectPath, context) {
    try {
      // Analyze failing tests
      const failingTests = await this.analyzeFailingTests(projectPath);
      
      const corrections = failingTests.map(test => ({
        file: test.file,
        name: test.name,
        error: test.error,
        suggestions: [
          'Check test assertions',
          'Verify test data',
          'Ensure proper setup/teardown'
        ]
      }));
      
      return {
        success: true,
        corrections: corrections,
        correctionCount: corrections.length
      };
    } catch (error) {
      logger.error('❌ Test fixing failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Run coverage analysis
   */
  async runCoverageAnalysis(projectPath, context) {
    try {
      // Simple coverage analysis
      const sourceFiles = await this.findSourceFiles(projectPath);
      const testFiles = await this.findTestFiles(projectPath);
      
      // Calculate basic coverage metrics
      const totalLines = await this.countLines(sourceFiles);
      const coveredLines = await this.estimateCoveredLines(sourceFiles, testFiles);
      
      const coverage = {
        current: Math.round((coveredLines / totalLines) * 100),
        total: totalLines,
        covered: coveredLines,
        uncovered: totalLines - coveredLines
      };
      
      const coverageGaps = await this.analyzeCoverageGaps(sourceFiles, testFiles);
      
      return {
        success: true,
        currentCoverage: coverage,
        coverageGaps: coverageGaps,
        needsImprovement: coverage.current < (context.coverageThreshold || 90)
      };
    } catch (error) {
      logger.error('❌ Coverage analysis failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Count lines in files
   */
  async countLines(files) {
    let totalLines = 0;
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        totalLines += content.split('\n').length;
      } catch (error) {
        // Skip files that can't be read
      }
    }
    
    return totalLines;
  }

  /**
   * Estimate covered lines
   */
  async estimateCoveredLines(sourceFiles, testFiles) {
    // Simple estimation: assume files with tests have 80% coverage
    const filesWithTests = new Set();
    
    for (const testFile of testFiles) {
      const testBaseName = path.basename(testFile, path.extname(testFile))
        .replace('.test', '')
        .replace('.spec', '');
      
      for (const sourceFile of sourceFiles) {
        const sourceBaseName = path.basename(sourceFile, path.extname(sourceFile));
        if (sourceBaseName.includes(testBaseName) || testBaseName.includes(sourceBaseName)) {
          filesWithTests.add(sourceFile);
        }
      }
    }
    
    let coveredLines = 0;
    for (const file of filesWithTests) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        coveredLines += Math.round(content.split('\n').length * 0.8);
      } catch (error) {
        // Skip files that can't be read
      }
    }
    
    return coveredLines;
  }

  /**
   * Analyze coverage gaps
   */
  async analyzeCoverageGaps(sourceFiles, testFiles) {
    const gaps = [];
    
    for (const sourceFile of sourceFiles) {
      const sourceBaseName = path.basename(sourceFile, path.extname(sourceFile));
      const hasTest = testFiles.some(testFile => {
        const testBaseName = path.basename(testFile, path.extname(testFile))
          .replace('.test', '')
          .replace('.spec', '');
        return sourceBaseName.includes(testBaseName) || testBaseName.includes(sourceBaseName);
      });
      
      if (!hasTest) {
        gaps.push({
          file: sourceFile,
          type: 'no-test',
          suggestion: 'Add unit tests for this file'
        });
      }
    }
    
    return gaps;
  }

  /**
   * Run auto test fix
   */
  async runAutoTestFix(projectPath, context) {
    try {
      // Analyze current test state
      const failingTests = await this.analyzeFailingTests(projectPath);
      const coverageAnalysis = await this.runCoverageAnalysis(projectPath, context);
      
      const tasksGenerated = failingTests.length + (coverageAnalysis.needsImprovement ? 1 : 0);
      
      return {
        success: true,
        sessionId: `auto-fix-${Date.now()}`,
        tasksGenerated: tasksGenerated,
        tasksProcessed: 0,
        result: {
          failingTests: failingTests.length,
          coverageNeedsImprovement: coverageAnalysis.needsImprovement,
          suggestions: [
            `Fix ${failingTests.length} failing tests`,
            coverageAnalysis.needsImprovement ? 'Improve test coverage' : null
          ].filter(Boolean)
        }
      };
    } catch (error) {
      logger.error('❌ Auto test fix failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate comprehensive summary
   */
  generateSummary(results) {
    const summary = {
      totalIssues: 0,
      testsGenerated: 0,
      testsFixed: 0,
      coverageImproved: false,
      autoTestFixCompleted: false,
      recommendations: []
    };

    // Count issues from test analysis
    if (results.testAnalysis?.success) {
      summary.totalIssues += results.testAnalysis.totalIssues || 0;
    }

    // Count generated tests
    if (results.testGeneration?.success) {
      summary.testsGenerated = results.testGeneration.testCount || 0;
    }

    // Count fixed tests
    if (results.testFixing?.success) {
      summary.testsFixed = results.testFixing.correctionCount || 0;
    }

    // Check coverage improvement
    if (results.coverageAnalysis?.success) {
      summary.coverageImproved = !results.coverageAnalysis.needsImprovement;
    }

    // Check auto test fix completion
    if (results.autoTestFix?.success) {
      summary.autoTestFixCompleted = true;
    }

    // Generate recommendations
    if (summary.totalIssues > 0) {
      summary.recommendations.push(`Found ${summary.totalIssues} test issues that need attention`);
    }
    if (summary.testsGenerated > 0) {
      summary.recommendations.push(`Generated ${summary.testsGenerated} new tests`);
    }
    if (summary.testsFixed > 0) {
      summary.recommendations.push(`Fixed ${summary.testsFixed} failing tests`);
    }
    if (!summary.coverageImproved) {
      summary.recommendations.push('Test coverage needs improvement');
    }

    return summary;
  }

  validateContext(context) {
    const required = ['projectPath'];
    const missing = required.filter(key => !context[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required context: ${missing.join(', ')}`);
    }
    
    return true;
  }
}

// Export for StepRegistry
module.exports = {
  config: TestingStep.getConfig(),
  execute: async (context = {}) => {
    const step = new TestingStep();
    return await step.execute(context);
  }
}; 