const { chromium, firefox, webkit } = require('playwright');
const fs = require('fs-extra');
const path = require('path');
const Logger = require('@logging/Logger');

const logger = new Logger('PlaywrightTestRunner');

/**
 * Playwright Test Runner Utility
 * 
 * Provides core functionality for executing Playwright tests with:
 * - Multi-browser support
 * - Project-specific configuration
 * - Test result collection and reporting
 * - Error handling and logging
 */
class PlaywrightTestRunner {
  constructor(options = {}) {
    this.options = {
      baseURL: options.baseURL || process.env.TEST_BASE_URL || 'http://localhost:3000',
      timeout: options.timeout || 30000,
      retries: options.retries || 2,
      headless: options.headless !== false,
      browsers: options.browsers || ['chromium', 'firefox', 'webkit'],
      outputDir: options.outputDir || './reports',
      ...options
    };
    
    this.browsers = {
      chromium,
      firefox,
      webkit
    };
    
    this.testResults = new Map();
    this.isRunning = false;
    
    logger.info('PlaywrightTestRunner initialized', {
      baseURL: this.options.baseURL,
      browsers: this.options.browsers,
      timeout: this.options.timeout
    });
  }
  
  /**
   * Execute a single test file
   * @param {string} testFile - Path to test file
   * @param {Object} options - Test execution options
   * @returns {Promise<Object>} Test results
   */
  async executeTest(testFile, options = {}) {
    const testId = this.generateTestId();
    const startTime = Date.now();
    
    logger.info(`Starting test execution: ${testFile}`, { testId });
    
    try {
      this.isRunning = true;
      
      const testOptions = {
        ...this.options,
        ...options,
        testId,
        startTime
      };
      
      // Validate test file exists
      if (!await fs.pathExists(testFile)) {
        throw new Error(`Test file not found: ${testFile}`);
      }
      
      // Execute test on each browser
      const results = {};
      for (const browserName of this.options.browsers) {
        try {
          results[browserName] = await this.executeTestOnBrowser(
            testFile, 
            browserName, 
            testOptions
          );
        } catch (error) {
          logger.error(`Test failed on ${browserName}:`, error);
          results[browserName] = {
            success: false,
            error: error.message,
            duration: 0
          };
        }
      }
      
      const duration = Date.now() - startTime;
      const overallSuccess = Object.values(results).every(r => r.success);
      
      const testResult = {
        testId,
        testFile,
        success: overallSuccess,
        results,
        duration,
        timestamp: new Date().toISOString(),
        options: testOptions
      };
      
      this.testResults.set(testId, testResult);
      await this.saveTestResult(testResult);
      
      logger.info(`Test execution completed: ${testFile}`, {
        testId,
        success: overallSuccess,
        duration: `${duration}ms`
      });
      
      return testResult;
      
    } catch (error) {
      logger.error(`Test execution failed: ${testFile}`, error);
      
      const testResult = {
        testId,
        testFile,
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        options: { ...this.options, ...options }
      };
      
      this.testResults.set(testId, testResult);
      await this.saveTestResult(testResult);
      
      throw error;
      
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Execute test on specific browser
   * @param {string} testFile - Path to test file
   * @param {string} browserName - Browser name
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Browser-specific results
   */
  async executeTestOnBrowser(testFile, browserName, options) {
    const startTime = Date.now();
    let browser = null;
    let context = null;
    let page = null;
    
    try {
      logger.debug(`Starting test on ${browserName}: ${testFile}`);
      
      // Launch browser
      browser = await this.browsers[browserName].launch({
        headless: this.options.headless,
        args: browserName === 'chromium' ? ['--disable-web-security'] : []
      });
      
      // Create browser context
      context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true
      });
      
      // Create page
      page = await context.newPage();
      
      // Set up page event handlers
      this.setupPageHandlers(page, browserName);
      
      // Load test file and execute
      const testContent = await fs.readFile(testFile, 'utf8');
      const testFunction = new Function('page', 'context', 'browser', testContent);
      
      await testFunction(page, context, browser);
      
      const duration = Date.now() - startTime;
      
      logger.debug(`Test completed on ${browserName}`, { duration: `${duration}ms` });
      
      return {
        success: true,
        duration,
        browser: browserName,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error(`Test failed on ${browserName}:`, error);
      
      // Take screenshot on failure
      if (page) {
        try {
          const screenshotPath = path.join(
        this.options.outputDir, 
        'screenshots', 
        `${browserName}-${Date.now()}.png`
      );
          await fs.ensureDir(path.dirname(screenshotPath));
          await page.screenshot({ path: screenshotPath, fullPage: true });
          logger.debug(`Screenshot saved: ${screenshotPath}`);
        } catch (screenshotError) {
          logger.warn('Failed to take screenshot:', screenshotError);
        }
      }
      
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        browser: browserName,
        timestamp: new Date().toISOString()
      };
      
    } finally {
      // Clean up resources
      if (page) await page.close();
      if (context) await context.close();
      if (browser) await browser.close();
    }
  }
  
  /**
   * Set up page event handlers for logging and debugging
   * @param {Page} page - Playwright page object
   * @param {string} browserName - Browser name
   */
  setupPageHandlers(page, browserName) {
    page.on('console', msg => {
      logger.debug(`[${browserName}] Console ${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      logger.error(`[${browserName}] Page error:`, error);
    });
    
    page.on('requestfailed', request => {
      logger.warn(`[${browserName}] Request failed: ${request.url()} - ${request.failure().errorText}`);
    });
  }
  
  /**
   * Save test result to file
   * @param {Object} testResult - Test result object
   */
  async saveTestResult(testResult) {
    try {
      const resultsDir = path.join(this.options.outputDir, 'test-results');
      await fs.ensureDir(resultsDir);
      
      const resultFile = path.join(resultsDir, `${testResult.testId}.json`);
      await fs.writeJson(resultFile, testResult, { spaces: 2 });
      
      logger.debug(`Test result saved: ${resultFile}`);
    } catch (error) {
      logger.error('Failed to save test result:', error);
    }
  }
  
  /**
   * Get test result by ID
   * @param {string} testId - Test ID
   * @returns {Object|null} Test result
   */
  getTestResult(testId) {
    return this.testResults.get(testId) || null;
  }
  
  /**
   * Get all test results
   * @returns {Array} Array of test results
   */
  getAllTestResults() {
    return Array.from(this.testResults.values());
  }
  
  /**
   * Generate unique test ID
   * @returns {string} Test ID
   */
  generateTestId() {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Check if test runner is currently running
   * @returns {boolean} Running status
   */
  isTestRunning() {
    return this.isRunning;
  }
  
  /**
   * Stop all running tests
   */
  async stopAllTests() {
    logger.info('Stopping all running tests...');
    this.isRunning = false;
    // Note: Individual browser cleanup is handled in executeTestOnBrowser
  }
}

module.exports = PlaywrightTestRunner;
