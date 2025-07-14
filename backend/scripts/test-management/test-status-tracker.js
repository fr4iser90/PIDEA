
#!/usr/bin/env node
require('module-alias/register');

/**
 * Test Status Tracker
 * Tracks test execution status and provides analytics
 */

const TestManagementService = require('@services/TestManagementService');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

const execAsync = promisify(exec);

class TestStatusTracker {
  constructor() {
    this.testManagementService = new TestManagementService();
    this.statusHistory = new Map();
    this.executionMetrics = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      skippedRuns: 0,
      averageDuration: 0,
      totalDuration: 0
    };
  }

  /**
   * Track test execution results
   * @param {Object} testResults - Jest test results
   * @returns {Promise<Object>} - Tracking results
   */
  async trackTestResults(testResults) {
    logger.debug('📊 Tracking test execution results...');
    
    const trackingResults = {
      totalTests: 0,
      trackedTests: 0,
      updatedTests: 0,
      newTests: 0,
      errors: 0,
      summary: {}
    };

    try {
      // Process test results
      if (testResults.testResults) {
        for (const result of testResults.testResults) {
          const filePath = result.testFilePath;
          const fileName = path.basename(filePath);
          
          trackingResults.totalTests += result.numPassingTests + result.numFailingTests + result.numPendingTests;
          
          // Process individual test cases
          if (result.testResults) {
            for (const testCase of result.testResults) {
              await this.processTestCase(testCase, filePath, trackingResults);
            }
          }
        }
      }

      // Update execution metrics
      this.updateExecutionMetrics(trackingResults);
      
      // Generate summary
      trackingResults.summary = await this.generateSummary();
      
      logger.debug('✅ Test tracking completed successfully!');
      this.printTrackingSummary(trackingResults);
      
      return trackingResults;
    } catch (error) {
      logger.error(`❌ Error tracking test results: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process individual test case
   * @param {Object} testCase - Jest test case result
   * @param {string} filePath - Test file path
   * @param {Object} trackingResults - Tracking results object
   * @returns {Promise<void>}
   */
  async processTestCase(testCase, filePath, trackingResults) {
    try {
      const testName = testCase.fullName || testCase.title;
      const status = this.mapJestStatus(testCase.status);
      const duration = testCase.duration || 0;
      const error = testCase.failureMessages ? testCase.failureMessages.join('\n') : null;
      
      trackingResults.trackedTests++;
      
      // Update test metadata
      const testMetadata = await this.testManagementService.updateTestStatus(
        filePath,
        testName,
        status,
        duration,
        error
      );
      
      if (testMetadata) {
        trackingResults.updatedTests++;
        
        // Track status history
        this.trackStatusHistory(filePath, testName, status, duration, error);
        
        // Log significant events
        this.logSignificantEvents(testMetadata, status);
      }
      
    } catch (error) {
      logger.warn(`⚠️  Failed to process test case: ${error.message}`);
      trackingResults.errors++;
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
   * Track status history for a test
   * @param {string} filePath - Test file path
   * @param {string} testName - Test name
   * @param {string} status - Test status
   * @param {number} duration - Test duration
   * @param {string} error - Error message
   */
  trackStatusHistory(filePath, testName, status, duration, error) {
    const key = `${filePath}:${testName}`;
    const timestamp = new Date();
    
    if (!this.statusHistory.has(key)) {
      this.statusHistory.set(key, []);
    }
    
    this.statusHistory.get(key).push({
      timestamp,
      status,
      duration,
      error
    });
    
    // Keep only last 10 entries
    const history = this.statusHistory.get(key);
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
  }

  /**
   * Log significant test events
   * @param {TestMetadata} testMetadata - Test metadata
   * @param {string} status - Current status
   */
  logSignificantEvents(testMetadata, status) {
    const fileName = testMetadata.fileName;
    const testName = testMetadata.testName;
    
    // Log status changes
    if (status === 'failing' && testMetadata.getSuccessRate() > 80) {
      logger.debug(`🚨 Previously stable test now failing: ${fileName} - ${testName}`);
    }
    
    if (status === 'passing' && testMetadata.failureCount > 5) {
      logger.debug(`✅ Previously failing test now passing: ${fileName} - ${testName}`);
    }
    
    // Log performance issues
    if (testMetadata.averageDuration > 5000) {
      logger.debug(`🐌 Slow test detected: ${fileName} - ${testName} (${Math.round(testMetadata.averageDuration)}ms avg)`);
    }
    
    // Log legacy tests
    if (testMetadata.isLegacy && status === 'failing') {
      logger.debug(`⚠️  Legacy test failing: ${fileName} - ${testName}`);
    }
  }

  /**
   * Update execution metrics
   * @param {Object} trackingResults - Tracking results
   */
  updateExecutionMetrics(trackingResults) {
    this.executionMetrics.totalRuns++;
    this.executionMetrics.totalDuration += trackingResults.summary?.totalDuration || 0;
    this.executionMetrics.averageDuration = this.executionMetrics.totalDuration / this.executionMetrics.totalRuns;
  }

  /**
   * Generate tracking summary
   * @returns {Promise<Object>} - Summary object
   */
  async generateSummary() {
    try {
      const stats = await this.testManagementService.getTestStatistics();
      const allTests = await this.testManagementService.testMetadataRepository.findAll();
      
      const summary = {
        ...stats,
        totalDuration: 0,
        slowTests: [],
        flakyTests: [],
        stableTests: [],
        recentFailures: []
      };
      
      // Calculate total duration and identify slow tests
      allTests.forEach(test => {
        summary.totalDuration += test.averageDuration * test.executionCount;
        
        if (test.averageDuration > 3000) {
          summary.slowTests.push({
            filePath: test.filePath,
            testName: test.testName,
            averageDuration: test.averageDuration
          });
        }
        
        // Identify flaky tests (high failure rate but not 100%)
        if (test.executionCount > 10 && test.getFailureRate() > 20 && test.getFailureRate() < 80) {
          summary.flakyTests.push({
            filePath: test.filePath,
            testName: test.testName,
            failureRate: test.getFailureRate(),
            executionCount: test.executionCount
          });
        }
        
        // Identify stable tests
        if (test.executionCount > 5 && test.getSuccessRate() > 95) {
          summary.stableTests.push({
            filePath: test.filePath,
            testName: test.testName,
            successRate: test.getSuccessRate(),
            executionCount: test.executionCount
          });
        }
        
        // Recent failures
        if (test.isFailing() && test.lastRunAt) {
          const hoursSinceLastRun = (new Date() - test.lastRunAt) / (1000 * 60 * 60);
          if (hoursSinceLastRun < 24) {
            summary.recentFailures.push({
              filePath: test.filePath,
              testName: test.testName,
              lastRunAt: test.lastRunAt,
              error: test.getMetadata('lastError')
            });
          }
        }
      });
      
      // Sort lists
      summary.slowTests.sort((a, b) => b.averageDuration - a.averageDuration);
      summary.flakyTests.sort((a, b) => b.failureRate - a.failureRate);
      summary.stableTests.sort((a, b) => b.successRate - a.successRate);
      summary.recentFailures.sort((a, b) => new Date(b.lastRunAt) - new Date(a.lastRunAt));
      
      return summary;
    } catch (error) {
      logger.warn(`Warning: Could not generate summary: ${error.message}`);
      return {};
    }
  }

  /**
   * Print tracking summary
   * @param {Object} trackingResults - Tracking results
   */
  printTrackingSummary(trackingResults) {
    logger.debug('\n📊 Test Tracking Summary');
    logger.info('========================');
    logger.debug(`📁 Total tests processed: ${trackingResults.totalTests}`);
    logger.debug(`✅ Successfully tracked: ${trackingResults.trackedTests}`);
    logger.debug(`🔄 Updated tests: ${trackingResults.updatedTests}`);
    logger.debug(`🆕 New tests: ${trackingResults.newTests}`);
    logger.info(`❌ Errors: ${trackingResults.errors}`);
    
    if (trackingResults.summary) {
      const summary = trackingResults.summary;
      logger.debug('\n📈 Test Statistics');
      logger.info('==================');
      logger.debug(`📊 Total tests: ${summary.total || 0}`);
      logger.info(`✅ Passing: ${summary.passing || 0}`);
      logger.info(`❌ Failing: ${summary.failing || 0}`);
      logger.info(`⏭️  Skipped: ${summary.skipped || 0}`);
      logger.info(`⚠️  Legacy: ${summary.legacy || 0}`);
      logger.debug(`🐌 Slow tests: ${summary.slowTests?.length || 0}`);
      logger.debug(`🎲 Flaky tests: ${summary.flakyTests?.length || 0}`);
      logger.debug(`🛡️  Stable tests: ${summary.stableTests?.length || 0}`);
      logger.info(`🚨 Recent failures: ${summary.recentFailures?.length || 0}`);
      
      if (summary.slowTests && summary.slowTests.length > 0) {
        logger.debug('\n🐌 Top 5 Slowest Tests');
        logger.info('=====================');
        summary.slowTests.slice(0, 5).forEach((test, index) => {
          logger.debug(`${index + 1}. ${path.basename(test.filePath)} - ${test.testName} (${Math.round(test.averageDuration)}ms)`);
        });
      }
      
      if (summary.flakyTests && summary.flakyTests.length > 0) {
        logger.debug('\n🎲 Top 5 Flakiest Tests');
        logger.info('======================');
        summary.flakyTests.slice(0, 5).forEach((test, index) => {
          logger.debug(`${index + 1}. ${path.basename(test.filePath)} - ${test.testName} (${Math.round(test.failureRate)}% failure rate)`);
        });
      }
    }
  }

  /**
   * Get test status history
   * @param {string} filePath - Test file path
   * @param {string} testName - Test name
   * @returns {Array} - Status history
   */
  getStatusHistory(filePath, testName) {
    const key = `${filePath}:${testName}`;
    return this.statusHistory.get(key) || [];
  }

  /**
   * Export tracking data
   * @param {string} outputPath - Output file path
   * @returns {Promise<void>}
   */
  async exportTrackingData(outputPath) {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        executionMetrics: this.executionMetrics,
        statusHistory: Object.fromEntries(this.statusHistory),
        summary: await this.generateSummary()
      };
      
      await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));
      logger.info(`📄 Tracking data exported to: ${outputPath}`);
    } catch (error) {
      logger.error(`❌ Failed to export tracking data: ${error.message}`);
    }
  }

  /**
   * Generate test health report
   * @returns {Promise<Object>} - Health report
   */
  async generateHealthReport() {
    try {
      const allTests = await this.testManagementService.testMetadataRepository.findAll();
      const report = {
        generatedAt: new Date().toISOString(),
        overallHealth: 0,
        testCounts: {
          total: allTests.length,
          healthy: 0,
          warning: 0,
          critical: 0
        },
        categories: {
          legacy: [],
          slow: [],
          flaky: [],
          failing: [],
          stable: []
        },
        recommendations: []
      };
      
      let totalHealthScore = 0;
      
      allTests.forEach(test => {
        const healthScore = test.getHealthScore();
        totalHealthScore += healthScore;
        
        // Categorize tests
        if (healthScore >= 80) {
          report.testCounts.healthy++;
          report.categories.stable.push({
            filePath: test.filePath,
            testName: test.testName,
            healthScore
          });
        } else if (healthScore >= 50) {
          report.testCounts.warning++;
        } else {
          report.testCounts.critical++;
        }
        
        if (test.isLegacy) {
          report.categories.legacy.push({
            filePath: test.filePath,
            testName: test.testName,
            healthScore,
            legacyScore: test.legacyScore
          });
        }
        
        if (test.averageDuration > 3000) {
          report.categories.slow.push({
            filePath: test.filePath,
            testName: test.testName,
            averageDuration: test.averageDuration
          });
        }
        
        if (test.executionCount > 10 && test.getFailureRate() > 20 && test.getFailureRate() < 80) {
          report.categories.flaky.push({
            filePath: test.filePath,
            testName: test.testName,
            failureRate: test.getFailureRate()
          });
        }
        
        if (test.isFailing()) {
          report.categories.failing.push({
            filePath: test.filePath,
            testName: test.testName,
            lastError: test.getMetadata('lastError')
          });
        }
      });
      
      report.overallHealth = allTests.length > 0 ? Math.round(totalHealthScore / allTests.length) : 0;
      
      // Generate recommendations
      if (report.categories.legacy.length > 0) {
        report.recommendations.push({
          type: 'legacy',
          priority: 'high',
          message: `Refactor ${report.categories.legacy.length} legacy tests`,
          count: report.categories.legacy.length
        });
      }
      
      if (report.categories.slow.length > 0) {
        report.recommendations.push({
          type: 'performance',
          priority: 'medium',
          message: `Optimize ${report.categories.slow.length} slow tests`,
          count: report.categories.slow.length
        });
      }
      
      if (report.categories.flaky.length > 0) {
        report.recommendations.push({
          type: 'reliability',
          priority: 'high',
          message: `Fix ${report.categories.flaky.length} flaky tests`,
          count: report.categories.flaky.length
        });
      }
      
      if (report.categories.failing.length > 0) {
        report.recommendations.push({
          type: 'failing',
          priority: 'critical',
          message: `Fix ${report.categories.failing.length} failing tests`,
          count: report.categories.failing.length
        });
      }
      
      return report;
    } catch (error) {
      logger.error(`❌ Error generating health report: ${error.message}`);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const tracker = new TestStatusTracker();
  
  if (args.length === 0) {
    logger.debug('Usage: node test-status-tracker.js <command> [options]');
    logger.info('');
    logger.info('Commands:');
    logger.debug('  track <results-file>     Track test results from JSON file');
    logger.info('  health                   Generate health report');
    logger.info('  export <output-file>     Export tracking data');
    logger.debug('  history <file> <test>    Show status history for test');
    logger.info('');
    logger.info('Examples:');
    logger.debug('  node test-status-tracker.js track jest-results.json');
    logger.debug('  node test-status-tracker.js health');
    logger.debug('  node test-status-tracker.js export tracking-data.json');
    return;
  }
  
  const command = args[0];
  
  try {
    switch (command) {
      case 'track':
        if (args.length < 2) {
          logger.error('❌ Results file path required');
          process.exit(1);
        }
        const resultsFile = args[1];
        const results = JSON.parse(await fs.readFile(resultsFile, 'utf8'));
        await tracker.trackTestResults(results);
        break;
        
      case 'health':
        const healthReport = await tracker.generateHealthReport();
        logger.info(JSON.stringify(healthReport, null, 2));
        break;
        
      case 'export':
        if (args.length < 2) {
          logger.error('❌ Output file path required');
          process.exit(1);
        }
        await tracker.exportTrackingData(args[1]);
        break;
        
      case 'history':
        if (args.length < 3) {
          logger.error('❌ File path and test name required');
          process.exit(1);
        }
        const history = tracker.getStatusHistory(args[1], args[2]);
        logger.info(JSON.stringify(history, null, 2));
        break;
        
      default:
        logger.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    logger.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = TestStatusTracker; 