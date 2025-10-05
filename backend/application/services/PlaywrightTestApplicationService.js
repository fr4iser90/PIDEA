const Logger = require('@logging/Logger');
const PlaywrightTestRunner = require('@tests/playwright/utils/test-runner');
const PlaywrightTestManager = require('@tests/playwright/utils/test-manager');
const path = require('path');
const fs = require('fs-extra');
const centralizedConfig = require('@config/centralized-config');

const logger = new Logger('PlaywrightTestApplicationService');

/**
 * Playwright Test Application Service
 * 
 * Provides high-level test execution and management functionality following
 * the existing ApplicationService pattern with dependency injection and
 * workspace detection integration.
 */
class PlaywrightTestApplicationService {
  constructor(dependencies = {}) {
    this.logger = dependencies.logger || logger;
    this.testRunner = dependencies.testRunner || new PlaywrightTestRunner();
    this.testManager = dependencies.testManager || new PlaywrightTestManager();
    this.workspaceDetector = dependencies.workspaceDetector;
    this.projectMapper = dependencies.projectMapper;
    this.application = dependencies.application;  // ✅ APPLICATION OBJEKT SPEICHERN!
    
    this.activeTests = new Map();
    this.testConfigurations = new Map();
    
    this.logger.info('PlaywrightTestApplicationService initialized', {
      hasWorkspaceDetector: !!this.workspaceDetector,
      hasProjectMapper: !!this.projectMapper,
      hasApplication: !!this.application
    });
  }
  
  /**
   * Execute Playwright tests for a specific project
   * @param {string} projectId - Project identifier
   * @param {Object} options - Test execution options
   * @returns {Promise<Object>} Test execution result
   */
  async executeTests(projectId, options = {}) {
    const startTime = Date.now();
    this.logger.info(`Starting test execution for project: ${projectId}`, options);
    
    try {
      // Get workspace path from options
      const workspacePath = options.workspacePath;
      if (!workspacePath) {
        throw new Error(`Workspace path is required for project: ${projectId}`);
      }
      
      this.logger.debug(`Using workspace path: ${workspacePath}`, { projectId });
      
      // Load project-specific configuration
      const config = await this.loadProjectConfiguration(workspacePath, options);
      this.logger.debug('Loaded project configuration', { projectId, config });
      
      // Discover available tests
      const testFiles = await this.discoverProjectTests(workspacePath, config);
      this.logger.info(`Discovered ${testFiles.length} test files`, { projectId });
      
      if (testFiles.length === 0) {
        return {
          success: true,
          message: 'No tests found to execute',
          testFiles: [],
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        };
      }
      
      // Execute tests based on options
      const results = await this.executeTestFiles(testFiles, config, options);
      
      const executionResult = {
        success: true,
        projectId,
        workspacePath,
        testFiles: testFiles.map(f => f.name),
        results,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
      
      this.logger.info(`Test execution completed for project: ${projectId}`, {
        duration: executionResult.duration,
        testCount: testFiles.length,
        successCount: results.filter(r => r.success).length
      });
      
      return executionResult;
      
    } catch (error) {
      this.logger.error(`Test execution failed for project: ${projectId}`, error);
      
      return {
        success: false,
        projectId,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Get test results for a specific test execution
   * @param {string} testId - Test execution ID
   * @returns {Promise<Object>} Test results
   */
  async getTestResults(testId) {
    try {
      this.logger.debug(`Retrieving test results for: ${testId}`);
      
      const result = this.testRunner.getTestResult(testId);
      if (!result) {
        throw new Error(`Test results not found for ID: ${testId}`);
      }
      
      return {
        success: true,
        testId,
        result,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error(`Failed to get test results for: ${testId}`, error);
      throw error;
    }
  }
  
  /**
   * Get all test results
   * @returns {Promise<Object>} All test results
   */
  async getAllTestResults() {
    try {
      this.logger.debug('Retrieving all test results');
      
      const results = this.testRunner.getAllTestResults();
      
      return {
        success: true,
        results,
        count: results.length,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('Failed to get all test results', error);
      throw error;
    }
  }
  
  /**
   * Stop running tests
   * @param {string} testId - Optional test ID to stop specific test
   * @returns {Promise<Object>} Stop result
   */
  async stopTests(testId = null) {
    try {
      this.logger.info(`Stopping tests${testId ? ` for ID: ${testId}` : ''}`);
      
      if (testId) {
        // Stop specific test
        const testResult = this.testRunner.getTestResult(testId);
        if (testResult && testResult.isRunning) {
          await this.testRunner.stopAllTests();
          this.activeTests.delete(testId);
        }
      } else {
        // Stop all tests
        await this.testRunner.stopAllTests();
        this.activeTests.clear();
      }
      
      return {
        success: true,
        message: testId ? `Test ${testId} stopped` : 'All tests stopped',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('Failed to stop tests', error);
      throw error;
    }
  }
  
  /**
   * Get test runner status
   * @returns {Promise<Object>} Status information
   */
  async getTestRunnerStatus() {
    try {
      const isRunning = this.testRunner.isTestRunning();
      const activeTestCount = this.activeTests.size;
      const totalResults = this.testRunner.getAllTestResults().length;
      
      return {
        success: true,
        status: {
          isRunning,
          activeTestCount,
          totalResults,
          lastActivity: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('Failed to get test runner status', error);
      throw error;
    }
  }
  
  /**
   * Load project-specific configuration
   * @param {string} workspacePath - Workspace path
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} Project configuration
   */
  async loadProjectConfiguration(workspacePath, options = {}) {
    try {
      this.logger.debug(`Loading configuration for workspace: ${workspacePath}`);
      
      // Load configuration using test manager
      const config = await this.testManager.loadTestConfig(workspacePath);
      
      // Merge with provided options
      const mergedConfig = {
        ...config,
        ...options.config
      };
      
      // Validate configuration
      const validation = this.testManager.validateTestConfig(mergedConfig);
      if (!validation.valid) {
        this.logger.warn('Configuration validation failed', validation.errors);
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }
      
      if (validation.warnings.length > 0) {
        this.logger.warn('Configuration warnings', validation.warnings);
      }
      
      this.logger.debug('Configuration loaded successfully', mergedConfig);
      return mergedConfig;
      
    } catch (error) {
      this.logger.error(`Failed to load configuration for workspace: ${workspacePath}`, error);
      throw error;
    }
  }
  
  /**
   * Discover test files in project
   * @param {string} workspacePath - Workspace path
   * @param {Object} config - Project configuration
   * @returns {Promise<Array>} Array of test files
   */
  async discoverProjectTests(workspacePath, config) {
    try {
      this.logger.debug(`Discovering tests in workspace: ${workspacePath}`);
      
      // Use testManager with proper configuration - NO HARDCODED PATHS!
      const testFiles = await this.testManager.discoverTests(config.tests?.pattern || '**/*.test.js');
      
      this.logger.debug(`Discovered ${testFiles.length} test files`, { workspacePath, testFiles });
      return testFiles;
      
    } catch (error) {
      this.logger.error(`Failed to discover tests in workspace: ${workspacePath}`, error);
      throw error;
    }
  }
  
  /**
   * Execute test files
   * @param {Array} testFiles - Array of test files
   * @param {Object} config - Project configuration
   * @param {Object} options - Execution options
   * @returns {Promise<Array>} Array of test results
   */
  async executeTestFiles(testFiles, config, options) {
    const results = [];
    
    try {
      this.logger.info(`Executing ${testFiles.length} test files`);
      
      // Execute tests sequentially to avoid resource conflicts
      for (const testFile of testFiles) {
        try {
          this.logger.debug(`Executing test file: ${testFile.name}`);
          
          const testOptions = {
            ...config,
            ...options,
            testFile: testFile.path
          };
          
          const result = await this.testRunner.executeTest(testFile.path, testOptions);
          results.push(result);
          
          // Track active test
          this.activeTests.set(result.testId, {
            testFile: testFile.name,
            startTime: result.timestamp,
            status: 'running'
          });
          
        } catch (error) {
          this.logger.error(`Failed to execute test file: ${testFile.name}`, error);
          results.push({
            testFile: testFile.name,
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      this.logger.info(`Completed execution of ${testFiles.length} test files`);
      return results;
      
    } catch (error) {
      this.logger.error('Failed to execute test files', error);
      throw error;
    }
  }
  
  /**
   * Validate login credentials for tests
   * @param {string} projectId - Project identifier
   * @param {Object} credentials - Login credentials
   * @returns {Promise<Object>} Validation result
   */
  async validateLoginCredentials(projectId, credentials, workspacePath) {
    try {
      this.logger.info(`Validating login credentials for project: ${projectId}`);
      
      if (!workspacePath) {
        throw new Error(`Workspace path is required for project: ${projectId}`);
      }
      
      // Load project configuration
      const config = await this.loadProjectConfiguration(workspacePath);
      
      // Check if login is required
      if (!config.login?.required) {
        return {
          success: true,
          message: 'Login not required for this project',
          timestamp: new Date().toISOString()
        };
      }
      
      // Validate credentials format
      if (!credentials.username || !credentials.password) {
        throw new Error('Username and password are required');
      }
      
      // Test credentials by attempting login
      const testResult = await this.testLoginCredentials(credentials, config);
      
      return {
        success: testResult.success,
        message: testResult.success ? 'Credentials are valid' : 'Invalid credentials',
        details: testResult.details,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error(`Failed to validate login credentials for project: ${projectId}`, error);
      throw error;
    }
  }
  
  /**
   * Test login credentials
   * @param {Object} credentials - Login credentials
   * @param {Object} config - Project configuration
   * @returns {Promise<Object>} Test result
   */
  async testLoginCredentials(credentials, config) {
    try {
      // Create a temporary test to validate credentials
      const testContent = `
        const { test, expect } = require('@playwright/test');
        
        test('validate credentials', async ({ page }) => {
          await page.goto('${config.baseURL}${config.login.selector}');
          await page.fill('${config.login.usernameField || 'input[name="username"]'}', '${credentials.username}');
          await page.fill('${config.login.passwordField || 'input[name="password"]'}', '${credentials.password}');
          await page.click('${config.login.submitButton || 'button[type="submit"]'}');
          
          // Wait for either success or error
          await page.waitForTimeout(2000);
          
          const currentUrl = page.url();
          const hasError = await page.locator('.error-message').isVisible();
          
          if (hasError) {
            throw new Error('Login failed - invalid credentials');
          }
          
          if (!currentUrl.includes('dashboard') && !currentUrl.includes('home')) {
            throw new Error('Login failed - unexpected redirect');
          }
        });
      `;
      
      // Execute temporary test
      const result = await this.testRunner.executeTest(testContent, {
        baseURL: config.baseURL,
        timeout: 10000,
        headless: config.headless !== undefined ? config.headless : false
      });
      
      return {
        success: result.success,
        details: result.error || 'Login successful'
      };
      
    } catch (error) {
      return {
        success: false,
        details: error.message
      };
    }
  }
  
  /**
   * Save configuration to database
   * @param {string} projectId - Project ID
   * @param {Object} config - Configuration to save
   * @returns {Promise<void>}
   */
  async saveConfigurationToDatabase(projectId, config) {
    try {
      // Get project repository from application
      const projectRepository = this.application?.projectRepository;
      if (!projectRepository) {
        throw new Error('Project repository not available');
      }
      
      // Get existing project
      const project = await projectRepository.findById(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }
      
      // Update project config with Playwright configuration
      const updatedConfig = {
        ...project.config,
        playwright: config
      };
      
      await projectRepository.update(projectId, { 
        config: JSON.stringify(updatedConfig),
        updated_at: new Date().toISOString()
      });
      
      this.logger.info(`Saved Playwright configuration to database for project: ${projectId}`);
      
    } catch (error) {
      this.logger.error(`Failed to save configuration to database for project: ${projectId}`, error);
      throw error;
    }
  }
  
  /**
   * Load configuration from database
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Configuration
   */
  async loadConfigurationFromDatabase(projectId) {
    try {
      // Get project repository from application
      const projectRepository = this.application?.projectRepository;
      if (!projectRepository) {
        throw new Error('Project repository not available');
      }
      
      // Get project from database
      const project = await projectRepository.findById(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }
      
      // Extract Playwright configuration from project config
      let config = {};
      if (project.config) {
        try {
          const projectConfig = typeof project.config === 'string' 
            ? JSON.parse(project.config) 
            : project.config;
          config = projectConfig.playwright || {};
        } catch (error) {
          this.logger.warn(`Failed to parse project config for ${projectId}:`, error.message);
        }
      }
      
      // Return default config if no Playwright config found
      if (Object.keys(config).length === 0) {
        config = this.getDefaultPlaywrightConfig();
        this.logger.info(`Using default Playwright configuration for project: ${projectId}`);
      }
      
      this.logger.info(`Loaded Playwright configuration from database for project: ${projectId}`);
      return config;
      
    } catch (error) {
      this.logger.error(`Failed to load configuration from database for project: ${projectId}`, error);
      throw error;
    }
  }
  
  /**
   * Get default Playwright configuration
   * @returns {Object} Default configuration
   */
  getDefaultPlaywrightConfig() {
    return {
      baseURL: 'http://localhost:4000',
      timeout: 30000,
      retries: 2,
      browsers: ['chromium'],
      headless: false, // Default to non-headless
      login: {
        required: false,
        selector: '',
        username: '',
        password: '',
        additionalFields: {}
      },
      tests: {
        directory: centralizedConfig.pathConfig.tests.playwright,
        pattern: '**/*.test.js',
        exclude: ['**/node_modules/**']
      },
      screenshots: {
        enabled: true,
        path: centralizedConfig.pathConfig.output.screenshots,
        onFailure: true
      },
      videos: {
        enabled: false,
        path: centralizedConfig.pathConfig.output.videos,
        onFailure: true
      },
      reports: {
        enabled: true,
        path: centralizedConfig.pathConfig.output.reports,
        format: 'html'
      }
    };
  }
}

module.exports = PlaywrightTestApplicationService;
