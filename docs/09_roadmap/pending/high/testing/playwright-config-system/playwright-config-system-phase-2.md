# Phase 2: Backend Configuration Persistence

## Overview
Fix PlaywrightTestApplicationService to save configuration during test execution and ensure proper database persistence.

## Estimated Time: 2 hours

## Tasks

### 1. Fix Test Execution Configuration Saving (1 hour)
- [ ] Modify `executeTests()` method to call `saveConfigurationToDatabase()`
- [ ] Ensure configuration is saved before test execution
- [ ] Add proper error handling for configuration save failures
- [ ] Add logging for configuration operations

### 2. Enhance Configuration Validation (1 hour)
- [ ] Add configuration validation before saving
- [ ] Implement configuration schema validation
- [ ] Add proper error messages for invalid configurations
- [ ] Ensure configuration integrity

## Implementation Details

### Test Execution Fix
```javascript
// Modify executeTests method in PlaywrightTestApplicationService.js
async executeTests(projectId, options = {}) {
  try {
    this.logger.info(`Executing Playwright tests for project: ${projectId}`);
    
    // Save configuration to database before execution
    if (options.config) {
      try {
        await this.saveConfigurationToDatabase(projectId, options.config);
        this.logger.info(`Configuration saved to database for project: ${projectId}`);
      } catch (error) {
        this.logger.error(`Failed to save configuration for project: ${projectId}`, error);
        // Continue with execution even if config save fails
      }
    }
    
    // Continue with existing test execution logic
    const result = await this.testRunner.runTests(projectId, options);
    
    return {
      success: true,
      result: result
    };
  } catch (error) {
    this.logger.error(`Failed to execute tests for project: ${projectId}`, error);
    throw error;
  }
}
```

### Configuration Validation
```javascript
// Add to PlaywrightTestApplicationService.js
validateConfiguration(config) {
  const errors = [];
  
  if (!config.baseURL) {
    errors.push('Base URL is required');
  }
  
  if (!config.timeout || config.timeout < 1000) {
    errors.push('Timeout must be at least 1000ms');
  }
  
  if (!config.retries || config.retries < 0) {
    errors.push('Retries must be non-negative');
  }
  
  if (!config.browsers || config.browsers.length === 0) {
    errors.push('At least one browser must be selected');
  }
  
  if (config.login && config.login.required) {
    if (!config.login.username) {
      errors.push('Username is required when login is enabled');
    }
    if (!config.login.password) {
      errors.push('Password is required when login is enabled');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}
```

### Enhanced Default Configuration (Remove PIDEA Hardcoded Values)
```javascript
// Update getDefaultPlaywrightConfig method in PlaywrightTestApplicationService.js (Line 524-559)
getDefaultPlaywrightConfig() {
  return {
    baseURL: 'http://localhost:3000', // Generic default, not PIDEA-specific
    timeout: 30000,
    retries: 2,
    browsers: ['chromium'],
    headless: false,
    login: {
      required: false,
      selector: '',
      username: '',
      password: '',
      additionalFields: {}
    },
    tests: {
      directory: './tests', // Generic test directory, not PIDEA-specific
      pattern: '**/*.test.js',
      exclude: ['**/node_modules/**']
    },
    screenshots: {
      enabled: true,
      path: './test-results/screenshots', // Generic path, not PIDEA-specific
      onFailure: true
    },
    videos: {
      enabled: false,
      path: './test-results/videos', // Generic path, not PIDEA-specific
      onFailure: true
    },
    reports: {
      enabled: true,
      path: './test-results/reports', // Generic path, not PIDEA-specific
      format: 'html'
    }
  };
}
```

## Files to Modify
- `backend/application/services/PlaywrightTestApplicationService.js`

## Success Criteria
- [ ] `executeTests()` method calls `saveConfigurationToDatabase()`
- [ ] Configuration validation implemented
- [ ] Proper error handling for configuration save failures
- [ ] Logging implemented for configuration operations
- [ ] Configuration integrity maintained

## Testing
- [ ] Test configuration saving during test execution
- [ ] Test configuration validation
- [ ] Test error handling
- [ ] Test logging functionality
- [ ] Test configuration integrity
