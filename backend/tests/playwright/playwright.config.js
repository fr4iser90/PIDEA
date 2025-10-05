const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright Test Configuration
 * 
 * This configuration provides project-specific test settings with:
 * - Multi-browser support (Chrome, Firefox, Safari)
 * - Screenshot and video recording on failure
 * - Configurable timeouts and retries
 * - Environment-based base URL configuration
 */
module.exports = defineConfig({
  // Test directory
  testDir: './tests',
  
  // Global test timeout (30 seconds)
  timeout: 30000,
  
  // Number of retries for failed tests
  retries: 2,
  
  // Global test settings
  use: {
    // Base URL for tests (must be provided via environment)
    baseURL: process.env.TEST_BASE_URL,
    
    // Screenshot settings
    screenshot: 'only-on-failure',
    
    // Video recording settings
    video: 'retain-on-failure',
    
    // Trace settings for debugging
    trace: 'retain-on-failure',
    
    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Action timeout
    actionTimeout: 10000,
    
    // Navigation timeout
    navigationTimeout: 30000,
  },
  
  // Test projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Additional Chrome-specific settings
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
        }
      },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Additional Firefox-specific settings
        launchOptions: {
          firefoxUserPrefs: {
            'security.tls.insecure_fallback_hosts': 'localhost'
          }
        }
      },
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        // Additional Safari-specific settings
        launchOptions: {
          args: ['--disable-web-security']
        }
      },
    },
  ],
  
  // Output directories
  outputDir: './reports/test-results',
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: './reports/html-report' }],
    ['json', { outputFile: './reports/test-results.json' }],
    ['junit', { outputFile: './reports/test-results.xml' }],
    ['list']
  ],
  
  // Global setup and teardown
  globalSetup: require.resolve('./utils/global-setup.js'),
  globalTeardown: require.resolve('./utils/global-teardown.js'),
  
  // Test environment configuration
  testMatch: '**/*.test.js',
  
  // Ignore patterns
  testIgnore: [
    '**/node_modules/**',
    '**/coverage/**',
    '**/dist/**',
    '**/build/**'
  ],
  
  // Web server configuration (if needed)
  webServer: process.env.START_SERVER === 'true' ? {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  } : undefined,
});
