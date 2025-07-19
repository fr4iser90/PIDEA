/**
 * TestingStep - Comprehensive Testing Workflow
 * Integrates all test analyzer tools and provides complete testing functionality
 * Migrated from core domain to testing_management framework
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

// Step configuration
const config = {
  name: 'TestingStep',
  type: 'testing',
  description: 'Comprehensive testing workflow with analysis, generation, and fixing',
  category: 'testing',
  version: '1.0.0',
  framework: 'testing_management',
  dependencies: [
    'testAnalyzer', 
    'testFixer', 
    'coverageAnalyzer', 
    'testReportParser', 
    'testFixTaskGenerator',
    'autoTestFixSystem'
  ],
  settings: {
    timeout: 300000, // 5 minutes
    parallel: true,
    includeTestAnalysis: true,
    includeTestGeneration: true,
    includeTestFixing: true,
    includeCoverageAnalysis: true,
    includeAutoTestFix: true
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
    this.framework = 'testing_management';
    this.dependencies = [
      'testAnalyzer', 
      'testFixer', 
      'coverageAnalyzer', 
      'testReportParser', 
      'testFixTaskGenerator',
      'autoTestFixSystem'
    ];
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
        metadata: {
          framework: 'testing_management',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error(`❌ ${this.name} failed:`, error.message);
      return {
        success: false,
        step: this.name,
        error: error.message,
        metadata: {
          framework: 'testing_management',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Run comprehensive test analysis
   */
  async runTestAnalysis(projectPath, context) {
    try {
      // Get test analyzer from application
      const application = global.application;
      const testAnalyzer = application?.testAnalyzer || application?.TestAnalyzer;
      
      if (!testAnalyzer) {
        logger.warn('⚠️ TestAnalyzer not available, skipping test analysis');
        return { success: false, error: 'TestAnalyzer not available' };
      }

      // Analyze failing tests
      const failingTests = await testAnalyzer.analyzeFailingTests(projectPath);
      
      // Analyze legacy tests
      const legacyTests = await testAnalyzer.analyzeLegacyTests(projectPath);
      
      // Analyze complex tests
      const complexTests = await testAnalyzer.analyzeComplexTests(projectPath);
      
      // Run tests to get current status
      const testResults = await testAnalyzer.runTests(projectPath);

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
   * Run test generation
   */
  async runTestGeneration(projectPath, context) {
    try {
      // Get test generation services from application
      const application = global.application;
      const generateTestsHandler = application?.generateTestsHandler;
      
      if (!generateTestsHandler) {
        logger.warn('⚠️ GenerateTestsHandler not available, skipping test generation');
        return { success: false, error: 'GenerateTestsHandler not available' };
      }

      // Create test generation command
      const { GenerateTestsCommand } = require('@application/commands/GenerateTestsCommand');
      const command = new GenerateTestsCommand({
        projectPath: projectPath,
        generateUnitTests: true,
        generateIntegrationTests: true,
        generateE2ETests: false,
        testFramework: 'jest'
      });

      // Execute test generation
      const result = await generateTestsHandler.handle(command);

      return {
        success: true,
        generatedTests: result.generatedTests || [],
        testCount: result.generatedTests?.length || 0
      };
    } catch (error) {
      logger.error('❌ Test generation failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Run test fixing
   */
  async runTestFixing(projectPath, context) {
    try {
      // Get test fixing services from application
      const application = global.application;
      const testCorrectionService = application?.testCorrectionService;
      
      if (!testCorrectionService) {
        logger.warn('⚠️ TestCorrectionService not available, skipping test fixing');
        return { success: false, error: 'TestCorrectionService not available' };
      }

      // Run test correction
      const corrections = await testCorrectionService.analyzeFailingTests({
        failing: context.testResults?.failures || []
      });

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
      // Get coverage analyzer from application
      const application = global.application;
      const coverageAnalyzer = application?.coverageAnalyzer || application?.CoverageAnalyzer;
      
      if (!coverageAnalyzer) {
        logger.warn('⚠️ CoverageAnalyzer not available, skipping coverage analysis');
        return { success: false, error: 'CoverageAnalyzer not available' };
      }

      // Analyze coverage
      const coverage = await coverageAnalyzer.analyzeCoverage(projectPath);
      
      // Generate coverage report
      const report = await coverageAnalyzer.generateReport(projectPath);

      return {
        success: true,
        coverage: coverage,
        report: report,
        summary: {
          totalCoverage: coverage.total || 0,
          statements: coverage.statements || 0,
          branches: coverage.branches || 0,
          functions: coverage.functions || 0,
          lines: coverage.lines || 0
        }
      };
    } catch (error) {
      logger.error('❌ Coverage analysis failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Run auto test fix
   */
  async runAutoTestFix(projectPath, context) {
    try {
      // Get auto test fix system from application
      const application = global.application;
      const autoTestFixSystem = application?.autoTestFixSystem;
      
      if (!autoTestFixSystem) {
        logger.warn('⚠️ AutoTestFixSystem not available, skipping auto test fix');
        return { success: false, error: 'AutoTestFixSystem not available' };
      }

      // Run auto test fix
      const fixes = await autoTestFixSystem.autoFixTests(projectPath);

      return {
        success: true,
        fixes: fixes,
        fixCount: fixes.length
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
      totalTests: 0,
      failingTests: 0,
      legacyTests: 0,
      complexTests: 0,
      generatedTests: 0,
      fixedTests: 0,
      coveragePercentage: 0,
      overallStatus: 'unknown'
    };

    // Test Analysis Summary
    if (results.testAnalysis?.success) {
      summary.failingTests = results.testAnalysis.failingTests?.count || 0;
      summary.legacyTests = results.testAnalysis.legacyTests?.count || 0;
      summary.complexTests = results.testAnalysis.complexTests?.count || 0;
      summary.totalTests = summary.failingTests + summary.legacyTests + summary.complexTests;
    }

    // Test Generation Summary
    if (results.testGeneration?.success) {
      summary.generatedTests = results.testGeneration.testCount || 0;
    }

    // Test Fixing Summary
    if (results.testFixing?.success) {
      summary.fixedTests = results.testFixing.correctionCount || 0;
    }

    // Coverage Summary
    if (results.coverageAnalysis?.success) {
      summary.coveragePercentage = results.coverageAnalysis.summary?.totalCoverage || 0;
    }

    // Determine overall status
    if (summary.failingTests === 0 && summary.coveragePercentage >= 80) {
      summary.overallStatus = 'excellent';
    } else if (summary.failingTests <= 5 && summary.coveragePercentage >= 70) {
      summary.overallStatus = 'good';
    } else if (summary.failingTests <= 10 && summary.coveragePercentage >= 60) {
      summary.overallStatus = 'fair';
    } else {
      summary.overallStatus = 'needs_improvement';
    }

    return summary;
  }

  /**
   * Validate context
   */
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