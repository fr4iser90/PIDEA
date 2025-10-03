# Universal UI Test Bot - Phase 1: Foundation Setup

## Phase Overview
- **Phase**: 1
- **Name**: Foundation Setup
- **Estimated Time**: 4 hours
- **Status**: In Progress
- **Progress**: 67%

## Objectives
Set up the foundational infrastructure for the Universal UI Test Bot, including Playwright installation, basic service structure, and core functionality.

## Tasks

### 1. Playwright Installation & Setup (1 hour)
- [x] Install Playwright in backend package.json
- [ ] Install Playwright in frontend package.json (if needed)
- [x] Configure Playwright browsers (Chrome, Firefox)
- [ ] Set up Playwright configuration file
- [x] Test basic Playwright connection

**Files to Create/Modify:**
- [x] `backend/package.json` - Add Playwright dependencies
- [ ] `backend/playwright.config.js` - Playwright configuration
- [ ] `scripts/test-bot/install-browsers.js` - Browser installation script

**Code Example:**
```javascript
// backend/package.json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "playwright": "^1.40.0"
  }
}
```

### 2. Basic TestBotService Structure (1 hour)
- [ ] Create TestBotService class
- [ ] Implement basic service initialization
- [ ] Add error handling and logging
- [ ] Create service interface methods
- [ ] Add dependency injection setup

**Files to Create:**
- [ ] `backend/domain/services/testing/TestBotService.js` - Core service
- [ ] `backend/domain/services/testing/TestBotServiceInterface.js` - Interface

**Code Example:**
```javascript
// backend/domain/services/testing/TestBotService.js
const ServiceLogger = require('@logging/ServiceLogger');

class TestBotService {
  constructor(dependencies = {}) {
    this.validateDependencies(dependencies);
    this.logger = new ServiceLogger('TestBotService');
    this.playwrightManager = dependencies.playwrightManager;
    this.testExecutionService = dependencies.testExecutionService;
  }

  async initialize() {
    try {
      this.logger.info('Initializing Test Bot Service...');
      // Initialization logic
      this.logger.info('Test Bot Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Test Bot Service:', error);
      throw error;
    }
  }

  async executeTest(testConfig) {
    // Test execution logic
  }
}
```

### 3. PlaywrightManager Implementation (1 hour)
- [ ] Create PlaywrightManager class
- [ ] Implement browser connection management
- [ ] Add browser instance pooling
- [ ] Implement screenshot functionality
- [ ] Add browser cleanup methods

**Files to Create:**
- [ ] `backend/infrastructure/testing/PlaywrightManager.js` - Browser management
- [ ] `backend/infrastructure/testing/BrowserPool.js` - Browser pooling

**Code Example:**
```javascript
// backend/infrastructure/testing/PlaywrightManager.js
const { chromium, firefox, webkit } = require('playwright');

class PlaywrightManager {
  constructor() {
    this.browsers = new Map();
    this.pages = new Map();
  }

  async connectToBrowser(browserType = 'chromium', port = null) {
    try {
      if (port) {
        // Connect to existing browser (for IDE integration)
        return await chromium.connectOverCDP(`http://localhost:${port}`);
      } else {
        // Launch new browser
        return await chromium.launch({ headless: false });
      }
    } catch (error) {
      throw new Error(`Failed to connect to browser: ${error.message}`);
    }
  }

  async takeScreenshot(page, path) {
    await page.screenshot({ path, fullPage: true });
  }
}
```

### 4. Test Configuration System (1 hour)
- [ ] Create TestConfigManager class
- [ ] Implement configuration validation
- [ ] Add configuration templates
- [ ] Create configuration storage
- [ ] Add configuration loading methods

**Files to Create:**
- [ ] `backend/infrastructure/testing/TestConfigManager.js` - Config management
- [ ] `backend/infrastructure/testing/TestTemplates.js` - Test templates
- [ ] `config/test-bot-config.js` - Default configuration

**Code Example:**
```javascript
// backend/infrastructure/testing/TestConfigManager.js
class TestConfigManager {
  constructor() {
    this.templates = new Map();
    this.loadTemplates();
  }

  loadTemplates() {
    this.templates.set('pidea-ui', {
      name: 'PIDEA UI Test',
      projectType: 'pidea',
      browsers: ['chrome'],
      testSteps: [
        {
          action: 'navigate',
          url: 'http://localhost:3000',
          screenshot: true
        }
      ]
    });
  }

  validateConfig(config) {
    // Validation logic
  }
}
```

## Success Criteria
- [ ] Playwright successfully installed and configured
- [ ] TestBotService can be instantiated without errors
- [ ] PlaywrightManager can connect to browsers
- [ ] Test configuration system is functional
- [ ] Basic screenshot functionality works
- [ ] All unit tests pass

## Testing
- [ ] Unit test: `tests/unit/testing/TestBotService.test.js`
- [ ] Unit test: `tests/unit/testing/PlaywrightManager.test.js`
- [ ] Integration test: `tests/integration/TestBotSetup.test.js`

## Dependencies
- Playwright installation
- Node.js environment
- Basic PIDEA infrastructure

## Risks & Mitigations
- **Risk**: Playwright browser installation issues
- **Mitigation**: Provide fallback installation scripts, clear error messages

- **Risk**: Browser compatibility issues
- **Mitigation**: Test on multiple platforms, provide configuration options

## Next Phase
Phase 2: Core Implementation - Build the test execution engine and result storage system.

