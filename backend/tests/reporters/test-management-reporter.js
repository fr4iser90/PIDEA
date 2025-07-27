
require('module-alias/register');
/**
 * Test Management Reporter for Jest
 * Integrates with the test management system to track test execution
 */

const TestManagementService = require('@services/testing/TestManagementService');
const Logger = require('@logging/Logger');
const path = require('path');

const logger = new Logger('TestManagementReporter');

class TestManagementReporter {
  constructor(globalConfig, options = {}) {
    this.globalConfig = globalConfig;
    this.options = options;
    this.testManagementService = new TestManagementService();
    this.testResults = [];
    this.enabled = options.enabled !== false;
  }

  onRunStart() {
    if (!this.enabled) return;
    
    logger.debug('🔧 Test Management: Starting test run...');
    this.testResults = [];
  }

  onTestStart(test) {
    if (!this.enabled) return;
    
    // Register test if auto-registration is enabled
    if (this.options.autoRegister !== false) {
      this.registerTest(test);
    }
  }

  onTestResult(test, testResult, aggregatedResult) {
    if (!this.enabled) return;
    
    // Process test results
    this.processTestResults(testResult);
  }

  async onRunComplete(contexts, results) {
    if (!this.enabled) return;
    
    logger.debug('🔧 Test Management: Processing test results...');
    
    // Track all test results
    await this.trackAllResults(results);
    
    // Generate summary
    await this.generateSummary(results);

    // Persist test metadata to disk
    const exportPath = path.join(process.cwd(), 'test-data.json');
    await this.testManagementService.exportTestMetadata(exportPath);
    logger.debug(`💾 Test metadata exported to: ${exportPath}`);
    
    logger.debug('✅ Test Management: Test run completed');
  }

  /**
   * Register a test with the management system
   * @param {Object} test - Jest test object
   */
  async registerTest(test) {
    try {
      const filePath = test.path;
      const testName = test.name || 'unnamed-test';
      
      await this.testManagementService.registerTest(filePath, testName, {
        registeredBy: 'jest-reporter',
        testFramework: 'jest'
      });
    } catch (error) {
      logger.warn(`⚠️  Failed to register test: ${error.message}`);
    }
  }

  /**
   * Process test results
   * @param {Object} testResult - Jest test result
   */
  async processTestResults(testResult) {
    try {
      const filePath = testResult.testFilePath;
      
      for (const testCase of testResult.testResults) {
        const testName = testCase.fullName || testCase.title;
        const status = this.mapJestStatus(testCase.status);
        const duration = testCase.duration || 0;
        const error = testCase.failureMessages ? testCase.failureMessages.join('\n') : null;
        
        // Update test status
        await this.testManagementService.updateTestStatus(
          filePath,
          testName,
          status,
          duration,
          error
        );
        
        // Store for batch processing
        this.testResults.push({
          filePath,
          testName,
          status,
          duration,
          error,
          timestamp: new Date()
        });
      }
    } catch (error) {
      logger.warn(`⚠️  Failed to process test results: ${error.message}`);
    }
  }

  /**
   * Track all results
   * @param {Object} results - Jest run results
   */
  async trackAllResults(results) {
    try {
      if (this.options.statusTracking !== false) {
        // Process all test results for tracking
        logger.debug(`📊 Tracking ${this.testResults.length} test results...`);
        
        // The test results are already processed in processTestResults
        // Additional tracking logic can be added here if needed
      }
    } catch (error) {
      logger.warn(`⚠️  Failed to track test results: ${error.message}`);
    }
  }

  /**
   * Generate summary report
   * @param {Object} results - Jest run results
   */
  async generateSummary(results) {
    try {
      const stats = await this.testManagementService.getTestStatistics();
      const healthReport = await this.testManagementService.generateHealthReport();
      
      logger.debug('\n📊 Test Management Summary');
      logger.info('========================');
      logger.debug(`Total Tests: ${stats.total}`);
      logger.info(`Passing: ${stats.passing}`);
      logger.info(`Failing: ${stats.failing}`);
      logger.info(`Skipped: ${stats.skipped}`);
      logger.info(`Legacy: ${stats.legacy}`);
      logger.info(`Average Health Score: ${stats.averageHealthScore}%`);
      
      if (healthReport.recommendations && healthReport.recommendations.length > 0) {
        logger.info('\n💡 Recommendations:');
        healthReport.recommendations.forEach((rec, index) => {
          logger.info(`${index + 1}. [${rec.type.toUpperCase()}] ${rec.message}`);
        });
      }
      
    } catch (error) {
      logger.warn(`⚠️  Failed to generate summary: ${error.message}`);
    }
  }

  /**
   * Map Jest status to internal status
   * @param {string} jestStatus - Jest test status
   * @returns {string} - Internal status
   */
  mapJestStatus(jestStatus) {
    switch (jestStatus) {
      case 'passed':
        return 'passing';
      case 'failed':
        return 'failing';
      case 'skipped':
      case 'pending':
        return 'skipped';
      case 'todo':
        return 'pending';
      default:
        return 'unknown';
    }
  }

  /**
   * Get test results for external processing
   * @returns {Array} - Test results
   */
  getTestResults() {
    return this.testResults;
  }

  /**
   * Export test results to file
   * @param {string} filePath - Output file path
   */
  async exportResults(filePath) {
    try {
      const exportData = {
        runDate: new Date().toISOString(),
        testResults: this.testResults,
        summary: await this.testManagementService.getTestStatistics()
      };
      
      const fs = require('fs').promises;
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
      await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
      logger.debug(`📄 Test results exported to: ${filePath}`);
    } catch (error) {
      logger.error(`❌ Failed to export results: ${error.message}`);
    }
  }
}

module.exports = TestManagementReporter; 