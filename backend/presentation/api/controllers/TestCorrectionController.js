const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
const TestCorrectionService = require('@services/TestCorrectionService');
const AutoRefactorCommand = require('@categories/management/AutoRefactorCommand');
const CoverageAnalyzerService = require('@services/CoverageAnalyzerService');
const fs = require('fs-extra');
const path = require('path');

class TestCorrectionController {
  constructor({
    testCorrectionService = new TestCorrectionService(),
    coverageAnalyzer = new CoverageAnalyzerService(),
    commandBus = null,
    eventBus = null
  }) {
    this.testCorrectionService = testCorrectionService;
    this.coverageAnalyzer = coverageAnalyzer;
    this.commandBus = commandBus;
    this.eventBus = eventBus;
  }

  /**
   * GET /api/test-correction/status
   * Get current status of test correction system
   */
  async getStatus(req, res) {
    try {
      const status = this.testCorrectionService.getStatus();
      
      res.json({
        success: true,
        data: {
          ...status,
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        }
      });
      
    } catch (error) {
      logger.error('Failed to get test correction status', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get status',
        details: error.message
      });
    }
  }

  /**
   * POST /api/test-correction/analyze
   * Analyze failing tests and create correction tasks
   */
  async analyzeTests(req, res) {
    try {
      const { testResults, options = {} } = req.body;
      
      if (!testResults) {
        return res.status(400).json({
          success: false,
          error: 'Test results are required'
        });
      }
      
      logger.info('Starting test analysis', { 
        failing: testResults.failing?.length || 0,
        legacy: testResults.legacy?.length || 0,
        complex: testResults.complex?.length || 0
      });
      
      const corrections = [];
      
      // Analyze failing tests
      if (testResults.failing && testResults.failing.length > 0) {
        const failingCorrections = await this.testCorrectionService.analyzeFailingTests(testResults);
        corrections.push(...failingCorrections);
      }
      
      // Analyze legacy tests
      if (testResults.legacy && testResults.legacy.length > 0) {
        const legacyCorrections = await this.testCorrectionService.analyzeLegacyTests(testResults);
        corrections.push(...legacyCorrections);
      }
      
      // Analyze complex tests
      if (testResults.complex && testResults.complex.length > 0) {
        const complexCorrections = await this.testCorrectionService.analyzeComplexTests(testResults);
        corrections.push(...complexCorrections);
      }
      
      res.json({
        success: true,
        data: {
          corrections: corrections.map(c => c.toJSON()),
          summary: {
            total: corrections.length,
            failing: corrections.filter(c => c.originalError && c.originalError !== 'Legacy test pattern detected').length,
            legacy: corrections.filter(c => c.originalError === 'Legacy test pattern detected').length,
            complex: corrections.filter(c => c.originalError === 'High complexity test detected').length
          }
        }
      });
      
    } catch (error) {
      logger.error('Failed to analyze tests', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to analyze tests',
        details: error.message
      });
    }
  }

  /**
   * POST /api/test-correction/fix
   * Apply fixes to tests
   */
  async fixTests(req, res) {
    try {
      const { corrections, options = {} } = req.body;
      
      if (!corrections || !Array.isArray(corrections)) {
        return res.status(400).json({
          success: false,
          error: 'Corrections array is required'
        });
      }
      
      logger.info('Starting test fixes', { 
        count: corrections.length,
        options
      });
      
      const results = await this.testCorrectionService.processCorrections(corrections, {
        maxConcurrent: options.maxConcurrent || 5,
        onProgress: (progress) => {
          // Emit progress event if event bus is available
          if (this.eventBus) {
            this.eventBus.emit('testCorrection.progress', progress);
          }
        }
      });
      
      const summary = {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        strategies: this.getStrategyDistribution(results)
      };
      
      res.json({
        success: true,
        data: {
          results: results.map(r => ({
            success: r.success,
            testFile: r.correction?.testFile,
            testName: r.correction?.testName,
            fixType: r.fixResult?.fixType,
            error: r.error
          })),
          summary
        }
      });
      
    } catch (error) {
      logger.error('Failed to fix tests', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to fix tests',
        details: error.message
      });
    }
  }

  /**
   * POST /api/test-correction/auto-fix
   * Run complete auto-fix workflow
   */
  async autoFix(req, res) {
    try {
      const { options = {} } = req.body;
      
      logger.info('Starting auto-fix workflow', { options });
      
      // Create auto-refactor command
      const command = AutoRefactorCommand.createForAllTests(
        process.cwd(),
        req.user?.id || 'system',
        {
          dryRun: options.dryRun || false,
          maxConcurrent: options.maxConcurrent || 3,
          timeout: options.timeout || 1800000
        }
      );
      
      // Execute command if command bus is available
      if (this.commandBus) {
        const result = await this.commandBus.execute(command);
        
        res.json({
          success: true,
          data: {
            commandId: command.id,
            result: result
          }
        });
      } else {
        // Fallback to direct execution
        const AutoFixTests = require('../../../scripts/test-correction/auto-fix-tests');
        const autoFix = new AutoFixTests(options);
        const result = await autoFix.run();
        
        res.json({
          success: result.success,
          data: {
            commandId: command.id,
            result: result
          }
        });
      }
      
    } catch (error) {
      logger.error('Failed to run auto-fix', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to run auto-fix',
        details: error.message
      });
    }
  }

  /**
   * POST /api/test-correction/improve-coverage
   * Improve test coverage
   */
  async improveCoverage(req, res) {
    try {
      const { targetCoverage = 90, options = {} } = req.body;
      
      logger.info('Starting coverage improvement', { targetCoverage, options });
      
      const CoverageImprover = require('../../../scripts/test-correction/coverage-improver');
      const improver = new CoverageImprover({
        targetCoverage,
        ...options
      });
      
      const result = await improver.run();
      
      res.json({
        success: result.success,
        data: {
          initialCoverage: result.results.initialCoverage,
          finalCoverage: result.results.finalCoverage,
          improvement: result.results.improvement,
          targetCoverage,
          testGeneration: result.testGenerationResults,
          testImprovement: result.testImprovementResults
        }
      });
      
    } catch (error) {
      logger.error('Failed to improve coverage', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to improve coverage',
        details: error.message
      });
    }
  }

  /**
   * GET /api/test-correction/coverage
   * Get current test coverage
   */
  async getCoverage(req, res) {
    try {
      const { scope = 'all' } = req.query;
      
      const coverage = await this.coverageAnalyzer.getCurrentCoverage(scope);
      
      res.json({
        success: true,
        data: {
          coverage,
          scope,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Failed to get coverage', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get coverage',
        details: error.message
      });
    }
  }

  /**
   * POST /api/test-correction/refactor
   * Refactor specific test types
   */
  async refactorTests(req, res) {
    try {
      const { refactorType, scope = 'all', options = {} } = req.body;
      
      if (!refactorType) {
        return res.status(400).json({
          success: false,
          error: 'Refactor type is required'
        });
      }
      
      if (!AutoRefactorCommand.validateRefactorType(refactorType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid refactor type'
        });
      }
      
      logger.info('Starting test refactoring', { refactorType, scope, options });
      
      // Create refactor command
      const command = new AutoRefactorCommand({
        projectPath: process.cwd(),
        refactorType,
        scope,
        requestedBy: req.user?.id || 'system',
        ...options
      });
      
      // Execute command if command bus is available
      if (this.commandBus) {
        const result = await this.commandBus.execute(command);
        
        res.json({
          success: true,
          data: {
            commandId: command.id,
            refactorType,
            scope,
            result: result
          }
        });
      } else {
        // Fallback to direct execution
        const AutoRefactorService = require('@services/AutoRefactorService');
        const refactorService = new AutoRefactorService();
        const result = await refactorService.refactorTests(command);
        
        res.json({
          success: true,
          data: {
            commandId: command.id,
            refactorType,
            scope,
            result: result
          }
        });
      }
      
    } catch (error) {
      logger.error('Failed to refactor tests', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to refactor tests',
        details: error.message
      });
    }
  }

  /**
   * POST /api/test-correction/stop
   * Stop all active corrections
   */
  async stopCorrections(req, res) {
    try {
      logger.info('Stopping all active corrections');
      
      await this.testCorrectionService.stopAll();
      
      res.json({
        success: true,
        data: {
          message: 'All corrections stopped',
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Failed to stop corrections', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to stop corrections',
        details: error.message
      });
    }
  }

  /**
   * GET /api/test-correction/report
   * Get test correction report
   */
  async getReport(req, res) {
    try {
      const { format = 'json' } = req.query;
      
      // Try to read existing report
      const reportPath = path.join(process.cwd(), 'test-correction-report.json');
      
      if (await fs.pathExists(reportPath)) {
        const report = await fs.readJson(reportPath);
        
        if (format === 'markdown') {
          const markdownPath = path.join(process.cwd(), 'test-correction-report.md');
          if (await fs.pathExists(markdownPath)) {
            const markdown = await fs.readFile(markdownPath, 'utf8');
            res.set('Content-Type', 'text/markdown');
            res.send(markdown);
            return;
          }
        }
        
        res.json({
          success: true,
          data: report
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'No report found'
        });
      }
      
    } catch (error) {
      logger.error('Failed to get report', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get report',
        details: error.message
      });
    }
  }

  /**
   * GET /api/test-correction/health
   * Health check endpoint
   */
  async healthCheck(req, res) {
    try {
      const status = this.testCorrectionService.getStatus();
      
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        activeCorrections: status.active,
        queuedCorrections: status.queued
      };
      
      res.json({
        success: true,
        data: health
      });
      
    } catch (error) {
      logger.error('Health check failed', { error: error.message });
      res.status(503).json({
        success: false,
        error: 'Service unhealthy',
        details: error.message
      });
    }
  }

  // Utility methods
  getStrategyDistribution(results) {
    const distribution = {};
    
    for (const result of results) {
      const strategy = result.fixResult?.fixType || 'unknown';
      distribution[strategy] = (distribution[strategy] || 0) + 1;
    }
    
    return distribution;
  }
}

module.exports = TestCorrectionController; 