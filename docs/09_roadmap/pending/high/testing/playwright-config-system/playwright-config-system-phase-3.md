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

### 2. Test Configuration Loading (1 hour)
- [ ] Ensure tests can load configuration via existing API endpoints
- [ ] Add fallback to environment variables if API fails
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
    // Load configuration from API endpoint
    const config = await loadConfigurationFromAPI();
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
    console.warn('Failed to load configuration from API, using environment variables:', error);
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

// Helper function to load configuration from API
async function loadConfigurationFromAPI() {
  try {
    // Use existing API endpoint to load configuration
    const response = await fetch('/api/projects/current/tests/playwright/config');
    if (response.ok) {
      const data = await response.json();
      return data.config;
    }
    throw new Error('Failed to load configuration from API');
  } catch (error) {
    console.warn('Failed to load configuration from API:', error);
    throw error;
  }
}
```

### API-Based Configuration Loading
```javascript
// Tests should use existing API endpoints instead of direct database access
// This ensures proper authentication and follows the established patterns

// Example: Load configuration in test setup
test.beforeAll(async () => {
  try {
    // Use existing API endpoint
    const config = await loadConfigurationFromAPI();
    testData = buildTestDataFromConfig(config);
  } catch (error) {
    console.warn('Failed to load configuration from API, using environment variables:', error);
    testData = buildTestDataFromEnvironment();
  }
});

function buildTestDataFromConfig(config) {
  return {
    urls: {
      login: config.baseURL + '/login',
      dashboard: config.baseURL + '/dashboard',
      home: config.baseURL + '/'
    },
    // ... rest of test data structure
  };
}

function buildTestDataFromEnvironment() {
  return {
    urls: {
      login: process.env.BASE_URL || 'http://localhost:3000/login',
      dashboard: process.env.BASE_URL || 'http://localhost:3000/dashboard',
      home: process.env.BASE_URL || 'http://localhost:3000/'
    },
    // ... rest of test data structure
  };
}
```

## Files to Create
- None (use existing API endpoints)

## Files to Modify
- `backend/tests/playwright/tests/login.test.js`
- `backend/application/services/PlaywrightTestApplicationService.js`

## Success Criteria
- [ ] Login test loads configuration from API endpoints
- [ ] Fallback to environment variables if API fails
- [ ] Comprehensive testing added

## Testing
- [ ] Test login test with API configuration
- [ ] Test fallback to environment variables
- [ ] Test end-to-end configuration flow
