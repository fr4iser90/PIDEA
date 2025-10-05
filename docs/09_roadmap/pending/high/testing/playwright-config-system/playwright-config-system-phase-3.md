# Phase 3: Test Integration and Initialization

## Overview
Update login test to use database configuration, create initial PIDEA project configuration, and implement comprehensive testing.

## Estimated Time: 2 hours

## Tasks

### 1. Update Login Test Database Integration (1 hour)
- [ ] Modify `login.test.js` to load configuration from database
- [ ] Remove environment variable dependencies
- [ ] Implement database configuration loading in test setup
- [ ] Add fallback to environment variables if database config fails

### 2. Create Initial Database Configuration (1 hour)
- [ ] Create script to initialize PIDEA project configuration
- [ ] Add default Playwright configuration with login credentials
- [ ] Implement configuration migration for existing projects
- [ ] Add comprehensive testing for configuration system

## Implementation Details

### Login Test Database Integration
```javascript
// Modify login.test.js (Line 4-38)
const { test, expect } = require('@playwright/test');

// Load configuration from database instead of environment
let testData = null;

test.beforeAll(async () => {
  try {
    // Load configuration from database
    const config = await loadConfigurationFromDatabase();
    testData = {
      urls: {
        login: config.baseURL + '/login',
        dashboard: config.baseURL + '/dashboard',
        home: config.baseURL + '/'
      },
      selectors: {
        login: {
          usernameField: "input[name='email']",
          passwordField: "input[name='password']", 
          loginButton: "button[type='submit']",
          errorMessage: ".error-message"
        },
        navigation: {
          logoutButton: "button[data-testid='logout']"
        }
      },
      testData: {
        login: {
          validCredentials: {
            username: config.login.username,
            password: config.login.password
          },
          invalidCredentials: {
            username: 'wrong@test.com',
            password: 'wrongpassword'
          }
        }
      },
      timeouts: {
        navigation: config.timeout || 10000,
        element: 5000,
        network: config.timeout || 30000
      }
    };
  } catch (error) {
    console.warn('Failed to load configuration from database, using environment variables:', error);
    // Fallback to environment variables
    testData = {
      urls: {
        login: process.env.BASE_URL || 'http://localhost:3000/login',
        dashboard: process.env.BASE_URL || 'http://localhost:3000/dashboard',
        home: process.env.BASE_URL || 'http://localhost:3000/'
      },
      selectors: {
        login: {
          usernameField: "input[name='email']",
          passwordField: "input[name='password']", 
          loginButton: "button[type='submit']",
          errorMessage: ".error-message"
        },
        navigation: {
          logoutButton: "button[data-testid='logout']"
        }
      },
      testData: {
        login: {
          validCredentials: {
            username: process.env.TEST_USERNAME || 'test@test.com',
            password: process.env.TEST_PASSWORD || 'test123'
          },
          invalidCredentials: {
            username: 'wrong@test.com',
            password: 'wrongpassword'
          }
        }
      },
      timeouts: {
        navigation: 10000,
        element: 5000,
        network: 30000
      }
    };
  }
});

// Helper function to load configuration from database
async function loadConfigurationFromDatabase() {
  // This would need to be implemented to connect to the database
  // and load the Playwright configuration for the current project
  throw new Error('Database configuration loading not implemented yet');
}
```

### Initial Configuration Script
```javascript
// Create backend/scripts/create-playwright-config.js
const path = require('path');
const fs = require('fs-extra');
const centralizedConfig = require('@config/centralized-config');

/**
 * Create initial Playwright configuration for PIDEA project
 */
async function createInitialPlaywrightConfig() {
  try {
    console.log('🚀 Creating initial Playwright configuration for PIDEA project...');
    
    // Default configuration
    const defaultConfig = {
      baseURL: 'http://localhost:4000',
      timeout: 30000,
      retries: 2,
      browsers: ['chromium'],
      headless: false,
      login: {
        required: true,
        username: 'test@test.com',
        password: 'test123',
        selector: '',
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
    
    // This would need to be implemented to save to database
    // For now, save to file for reference
    const configPath = path.join(__dirname, '../config/playwright-default-config.json');
    await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
    
    console.log('✅ Initial Playwright configuration created');
    console.log('📁 Configuration saved to:', configPath);
    
    return defaultConfig;
  } catch (error) {
    console.error('❌ Failed to create initial Playwright configuration:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createInitialPlaywrightConfig()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { createInitialPlaywrightConfig };
```

### Configuration Migration
```javascript
// Add to PlaywrightTestApplicationService.js
async migrateExistingConfigurations() {
  try {
    this.logger.info('Starting Playwright configuration migration...');
    
    // Get all projects without Playwright configuration
    const projectRepository = this.application?.projectRepository;
    if (!projectRepository) {
      throw new Error('Project repository not available');
    }
    
    const projects = await projectRepository.findAll();
    let migratedCount = 0;
    
    for (const project of projects) {
      const config = project.config || {};
      
      // Check if project already has Playwright configuration
      if (!config.playwright) {
        // Add default Playwright configuration
        const updatedConfig = {
          ...config,
          playwright: this.getDefaultPlaywrightConfig()
        };
        
        await projectRepository.update(project.id, {
          config: JSON.stringify(updatedConfig),
          updated_at: new Date().toISOString()
        });
        
        migratedCount++;
        this.logger.info(`Migrated configuration for project: ${project.id}`);
      }
    }
    
    this.logger.info(`Playwright configuration migration completed. Migrated ${migratedCount} projects.`);
    
  } catch (error) {
    this.logger.error('Failed to migrate Playwright configurations:', error);
    throw error;
  }
}
```

## Files to Create
- `backend/scripts/create-playwright-config.js`

## Files to Modify
- `backend/tests/playwright/tests/login.test.js`
- `backend/application/services/PlaywrightTestApplicationService.js`

## Success Criteria
- [ ] Login test loads configuration from database
- [ ] Fallback to environment variables if database fails
- [ ] Initial PIDEA project configuration created
- [ ] Configuration migration implemented
- [ ] Comprehensive testing added

## Testing
- [ ] Test login test with database configuration
- [ ] Test fallback to environment variables
- [ ] Test initial configuration creation
- [ ] Test configuration migration
- [ ] Test end-to-end configuration flow
