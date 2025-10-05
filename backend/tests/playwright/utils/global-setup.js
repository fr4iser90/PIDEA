const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

/**
 * Global Setup for Playwright Tests
 * 
 * This function runs once before all tests and:
 * - Ensures output directories exist
 * - Validates test environment
 * - Sets up global test data
 */
async function globalSetup(config) {
  console.log('🚀 Starting Playwright global setup...');
  
  try {
    // Ensure output directories exist
    const outputDirs = [
      './reports',
      './reports/test-results',
      './reports/html-report',
      './screenshots',
      './videos',
      './traces'
    ];
    
    for (const dir of outputDirs) {
      await fs.ensureDir(path.resolve(dir));
      console.log(`✅ Created directory: ${dir}`);
    }
    
    // Validate environment variables
    const requiredEnvVars = ['TEST_BASE_URL'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
      console.warn('Using default values...');
    }
    
    // Set default environment variables if not provided
    if (!process.env.TEST_BASE_URL) {
      process.env.TEST_BASE_URL = 'http://localhost:3000';
    }
    
    // Validate base URL is accessible
    try {
      const browser = await chromium.launch();
      const page = await browser.newPage();
      
      const response = await page.goto(process.env.TEST_BASE_URL, { 
        waitUntil: 'networkidle',
        timeout: 10000 
      });
      
      if (response && response.status() < 400) {
        console.log(`✅ Base URL accessible: ${process.env.TEST_BASE_URL}`);
      } else {
        console.warn(`⚠️  Base URL may not be accessible: ${process.env.TEST_BASE_URL}`);
      }
      
      await browser.close();
    } catch (error) {
      console.warn(`⚠️  Could not validate base URL: ${error.message}`);
    }
    
    // Create test data fixtures if they don't exist
    const fixturesDir = path.resolve('./fixtures');
    await fs.ensureDir(fixturesDir);
    
    const defaultTestData = {
      users: {
        admin: {
          username: 'admin',
          password: 'admin123',
          email: 'admin@example.com'
        },
        user: {
          username: 'user',
          password: 'user123',
          email: 'user@example.com'
        }
      },
      projects: {
        sample: {
          name: 'Sample Project',
          description: 'A sample project for testing',
          type: 'web'
        }
      }
    };
    
    const testDataPath = path.join(fixturesDir, 'test-data.json');
    if (!await fs.pathExists(testDataPath)) {
      await fs.writeJson(testDataPath, defaultTestData, { spaces: 2 });
      console.log('✅ Created default test data fixtures');
    }
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

module.exports = globalSetup;
