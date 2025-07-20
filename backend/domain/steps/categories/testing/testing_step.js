
/**
 * TestingStep - Comprehensive Testing Workflow
 * Integrates all test analyzer tools and provides complete testing functionality
 */

const StepBuilder = require('@steps/StepBuilder');

// Step configuration
const config = {
  name: 'TestingStep',
  type: 'testing',
  description: 'Comprehensive testing workflow with analysis, generation, and fixing',
  category: 'testing',
  version: '1.0.0',
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
      // Get services via dependency injection
      const testService = context.getService('TestService');
      const terminalService = context.getService('TerminalService');
      const projectService = context.getService('ProjectService');
      const coverageService = context.getService('CoverageService');
      const reportService = context.getService('ReportService');
      
      if (!testService) {
        throw new Error('TestService not available in context');
      }
      if (!terminalService) {
        throw new Error('TerminalService not available in context');
      }
      if (!projectService) {
        throw new Error('ProjectService not available in context');
      }
      if (!coverageService) {
        throw new Error('CoverageService not available in context');
      }
      if (!reportService) {
        throw new Error('ReportService not available in context');
      }

      // Analyze failing tests
      const failingTests = await testService.analyzeFailingTests(projectPath);
      
      // Analyze legacy tests
      const legacyTests = await testService.analyzeLegacyTests(projectPath);
      
      // Analyze complex tests
      const complexTests = await testService.analyzeComplexTests(projectPath);
      
      // Run tests to get current status
      const testResults = await testService.runTests(projectPath);

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
      // Get test generation services via dependency injection
      const testGenerationService = context.getService('TestGenerationService');
      
      if (!testGenerationService) {
        logger.warn('⚠️ TestGenerationService not available, skipping test generation');
        return { success: false, error: 'TestGenerationService not available' };
      }

      // Execute test generation
      const result = await testGenerationService.generateTests({
        projectPath: projectPath,
        generateUnitTests: true,
        generateIntegrationTests: true,
        generateE2ETests: false,
        testFramework: 'jest'
      });

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
      // Get test fixing services via dependency injection
      const testCorrectionService = context.getService('TestCorrectionService');
      
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
      // Get coverage analyzer via dependency injection
      const coverageService = context.getService('CoverageService');
      
      if (!coverageService) {
        logger.warn('⚠️ CoverageService not available, skipping coverage analysis');
        return { success: false, error: 'CoverageService not available' };
      }

      // Get current coverage
      const coverage = await coverageService.getCurrentCoverage(projectPath);
      
      // Analyze coverage gaps
      const coverageGaps = await coverageService.analyzeCoverageGaps(projectPath);

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
   * Run auto test fix
   */
  async runAutoTestFix(projectPath, context) {
    try {
      // Get auto test fix system via dependency injection
      const autoTestFixService = context.getService('AutoTestFixService');
      
      if (!autoTestFixService) {
        logger.warn('⚠️ AutoTestFixService not available, skipping auto test fix');
        return { success: false, error: 'AutoTestFixService not available' };
      }

      // Execute auto test fix workflow
      const result = await autoTestFixService.executeAutoTestFixWorkflow({
        projectPath: projectPath,
        projectId: context.projectId || 'system',
        userId: context.userId || 'system',
        loadExistingTasks: context.loadExistingTasks || false,
        clearExisting: context.clearExisting || false,
        stopOnError: context.stopOnError || false,
        coverageThreshold: context.coverageThreshold || 90,
        autoCommit: context.autoCommit || true,
        autoBranch: context.autoBranch || true,
        maxFixAttempts: context.maxFixAttempts || 3
      });

      return {
        success: true,
        sessionId: result.sessionId,
        tasksGenerated: result.tasksGenerated || 0,
        tasksProcessed: result.tasksProcessed || 0,
        result: result
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