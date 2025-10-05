const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');  // ✅ NEUE GLOB SYNTAX!
const Logger = require('@logging/Logger');
const centralizedConfig = require('@config/centralized-config');

const logger = new Logger('PlaywrightTestManager');

/**
 * Playwright Test Manager
 * 
 * Provides test management functionality including:
 * - Test discovery and organization
 * - Configuration management
 * - Test data management
 * - Project-specific test handling
 */
class PlaywrightTestManager {
  constructor(options = {}) {
    this.options = {
      testDir: options.testDir || centralizedConfig.pathConfig.tests.playwright,
      configDir: options.configDir || centralizedConfig.pathConfig.config.root,
      fixturesDir: options.fixturesDir || './fixtures',
      outputDir: options.outputDir || centralizedConfig.pathConfig.output.reports,
      ...options
    };
    
    this.testConfigs = new Map();
    this.testData = new Map();
    
    logger.info('PlaywrightTestManager initialized', {
      testDir: this.options.testDir,
      configDir: this.options.configDir
    });
  }
  
  /**
   * Discover all test files in the test directory
   * @param {string} pattern - Glob pattern for test files
   * @returns {Promise<Array>} Array of test file paths
   */
  async discoverTests(pattern = '**/*.test.js') {
    try {
      const testPattern = path.join(this.options.testDir, pattern);
      const testFiles = await glob(testPattern, { 
        cwd: process.cwd(),
        absolute: true 
      });
      
      logger.info(`Discovered ${testFiles.length} test files`, { pattern });
      
      return testFiles.map(file => ({
        path: file,
        name: path.basename(file, '.test.js'),
        relativePath: path.relative(this.options.testDir, file),
        directory: path.dirname(file)
      }));
      
    } catch (error) {
      logger.error('Failed to discover tests:', error);
      throw error;
    }
  }
  
  /**
   * Load test configuration for a project
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Test configuration
   */
  async loadTestConfig(projectPath) {
    try {
      const configPath = path.join(projectPath, 'playwright.config.js');
      
      if (await fs.pathExists(configPath)) {
        // Load project-specific config
        const config = require(configPath);
        logger.info(`Loaded project-specific config: ${configPath}`);
        return config;
      } else {
        // Load default config
        const defaultConfigPath = path.join(this.options.configDir, 'default.config.js');
        if (await fs.pathExists(defaultConfigPath)) {
          const config = require(defaultConfigPath);
          logger.info(`Loaded default config: ${defaultConfigPath}`);
          return config;
        } else {
          // Return minimal default config
          const defaultConfig = this.getDefaultConfig();
          logger.info('Using minimal default config');
          return defaultConfig;
        }
      }
      
    } catch (error) {
      logger.error('Failed to load test config:', error);
      throw error;
    }
  }
  
  /**
   * Save test configuration for a project
   * @param {string} projectPath - Project path
   * @param {Object} config - Test configuration
   * @returns {Promise<void>}
   */
  async saveTestConfig(projectPath, config) {
    try {
      const configPath = path.join(projectPath, 'playwright.config.js');
      await fs.ensureDir(path.dirname(configPath));
      
      const configContent = this.generateConfigFile(config);
      await fs.writeFile(configPath, configContent);
      
      logger.info(`Saved test config: ${configPath}`);
      
    } catch (error) {
      logger.error('Failed to save test config:', error);
      throw error;
    }
  }
  
  /**
   * Validate test configuration
   * @param {Object} config - Test configuration
   * @returns {Object} Validation result
   */
  validateTestConfig(config) {
    const errors = [];
    const warnings = [];
    
    // Required fields
    if (!config.baseURL) {
      errors.push('baseURL is required');
    }
    
    if (!config.timeout || config.timeout < 1000) {
      warnings.push('timeout should be at least 1000ms');
    }
    
    if (!config.retries || config.retries < 0) {
      warnings.push('retries should be a non-negative number');
    }
    
    // Validate browsers
    if (!config.browsers || !Array.isArray(config.browsers)) {
      errors.push('browsers must be an array');
    } else {
      const validBrowsers = ['chromium', 'firefox', 'webkit'];
      const invalidBrowsers = config.browsers.filter(b => !validBrowsers.includes(b));
      if (invalidBrowsers.length > 0) {
        errors.push(`Invalid browsers: ${invalidBrowsers.join(', ')}`);
      }
    }
    
    // Validate login configuration - DISABLED FOR NOW
    // if (config.login) {
    //   if (config.login.required && !config.login.selector) {
    //     errors.push('login.selector is required when login.required is true');
    //   }
    //   
    //   if (config.login.required && !config.login.username) {
    //     errors.push('login.username is required when login.required is true');
    //   }
    //   
    //   if (config.login.required && !config.login.password) {
    //     errors.push('login.password is required when login.required is true');
    //   }
    // }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Load test data for a project
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Test data
   */
  async loadTestData(projectPath) {
    try {
      const testDataPath = path.join(projectPath, 'test-data.json');
      
      if (await fs.pathExists(testDataPath)) {
        const testData = await fs.readJson(testDataPath);
        logger.info(`Loaded project-specific test data: ${testDataPath}`);
        return testData;
      } else {
        // Load default test data
        const defaultDataPath = path.join(this.options.fixturesDir, 'test-data.json');
        if (await fs.pathExists(defaultDataPath)) {
          const testData = await fs.readJson(defaultDataPath);
          logger.info(`Loaded default test data: ${defaultDataPath}`);
          return testData;
        } else {
          logger.warn('No test data found, using empty object');
          return {};
        }
      }
      
    } catch (error) {
      logger.error('Failed to load test data:', error);
      throw error;
    }
  }
  
  /**
   * Save test data for a project
   * @param {string} projectPath - Project path
   * @param {Object} testData - Test data
   * @returns {Promise<void>}
   */
  async saveTestData(projectPath, testData) {
    try {
      const testDataPath = path.join(projectPath, 'test-data.json');
      await fs.ensureDir(path.dirname(testDataPath));
      
      await fs.writeJson(testDataPath, testData, { spaces: 2 });
      logger.info(`Saved test data: ${testDataPath}`);
      
    } catch (error) {
      logger.error('Failed to save test data:', error);
      throw error;
    }
  }
  
  /**
   * Get default test configuration
   * @returns {Object} Default configuration
   */
  getDefaultConfig() {
    return {
      baseURL: 'http://localhost:3000',
      timeout: 30000,
      retries: 2,
      browsers: ['chromium'],
      headless: true,
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
  
  /**
   * Generate configuration file content
   * @param {Object} config - Configuration object
   * @returns {string} Configuration file content
   */
  generateConfigFile(config) {
    return `const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '${config.tests?.directory || './tests'}',
  timeout: ${config.timeout || 30000},
  retries: ${config.retries || 2},
  
  use: {
    baseURL: '${config.baseURL || 'http://localhost:3000'}',
    screenshot: '${config.screenshots?.onFailure ? 'only-on-failure' : 'off'}',
    video: '${config.videos?.onFailure ? 'retain-on-failure' : 'off'}',
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  
  projects: [
${config.browsers?.map(browser => `    {
      name: '${browser}',
      use: { ...devices['Desktop ${browser.charAt(0).toUpperCase() + browser.slice(1)}'] },
    },`).join('\n') || '    { name: \'chromium\', use: { ...devices[\'Desktop Chrome\'] } },'}
  ],
  
  outputDir: '${config.reports?.path || './reports'}/test-results',
  
  reporter: [
    ['html', { outputFolder: '${config.reports?.path || './reports'}/html-report' }],
    ['json', { outputFile: '${config.reports?.path || './reports'}/test-results.json' }],
    ['list']
  ],
  
  testMatch: '${config.tests?.pattern || '**/*.test.js'}',
  testIgnore: ${JSON.stringify(config.tests?.exclude || ['**/node_modules/**'], null, 4)},
});
`;
  }
  
  /**
   * Create test project structure
   * @param {string} projectPath - Project path
   * @param {Object} options - Project options
   * @returns {Promise<void>}
   */
  async createTestProject(projectPath, options = {}) {
    try {
      await fs.ensureDir(projectPath);
      
      // Create test directories
      const dirs = [
        'tests',
        'fixtures',
        'screenshots',
        'videos',
        'reports'
      ];
      
      for (const dir of dirs) {
        await fs.ensureDir(path.join(projectPath, dir));
      }
      
      // Create default configuration
      const config = {
        ...this.getDefaultConfig(),
        ...options.config
      };
      
      await this.saveTestConfig(projectPath, config);
      
      // Create default test data
      const testData = {
        users: {
          admin: {
            username: 'admin',
            password: 'admin123',
            email: 'admin@example.com'
          }
        },
        projects: {
          sample: {
            name: 'Sample Project',
            description: 'A sample project for testing'
          }
        }
      };
      
      await this.saveTestData(projectPath, testData);
      
      // Create sample test file
      const sampleTestPath = path.join(projectPath, 'tests', 'sample.test.js');
      const sampleTestContent = `const { test, expect } = require('@playwright/test');

test('sample test', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Sample/);
});
`;
      
      await fs.writeFile(sampleTestPath, sampleTestContent);
      
      logger.info(`Created test project: ${projectPath}`);
      
    } catch (error) {
      logger.error('Failed to create test project:', error);
      throw error;
    }
  }
}

module.exports = PlaywrightTestManager;
