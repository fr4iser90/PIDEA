# Playwright Test Runner System

A comprehensive, project-specific Playwright test runner system integrated into the PIDEA platform. This system provides automated test execution, management, and visualization capabilities with full frontend integration.

## 🚀 Features

- **Project-Specific Configuration**: Each project gets its own test configuration and directory structure
- **Multi-Browser Support**: Execute tests on Chromium, Firefox, and WebKit browsers
- **Workspace Integration**: Automatic workspace detection and project mapping
- **Frontend Management UI**: Complete test management interface integrated into the main application
- **Real-time Test Execution**: Live test execution monitoring and result visualization
- **Comprehensive API**: Full REST API for test execution, configuration, and project management
- **Login Handling**: Automatic login detection and credential validation
- **Test Result Visualization**: Detailed test results with screenshots, videos, and traces

## 📁 Project Structure

```
tests/playwright/
├── playwright.config.js          # Main Playwright configuration
├── utils/
│   ├── global-setup.js           # Global test setup
│   ├── global-teardown.js        # Global test teardown
│   ├── test-runner.js            # Core test runner utility
│   └── test-manager.js           # Test management utility
├── tests/
│   ├── login.test.js             # Login functionality tests
│   ├── dashboard.test.js         # Dashboard tests
│   └── form-submission.test.js   # Form submission tests
├── fixtures/
│   └── test-data.json           # Test data fixtures
├── screenshots/                  # Screenshot storage
├── videos/                       # Video recording storage
└── reports/                      # Test reports and results

backend/
├── application/
│   ├── services/
│   │   └── PlaywrightTestApplicationService.js
│   └── handlers/
│       └── categories/testing/
│           └── PlaywrightTestHandler.js
└── presentation/api/controllers/
    └── TestManagementController.js (extended)

frontend/src/
├── presentation/components/tests/
│   ├── main/
│   │   ├── TestRunnerComponent.jsx
│   │   ├── TestConfiguration.jsx
│   │   └── TestResultsViewer.jsx
│   └── common/
│       └── TestStatusBadge.jsx
├── hooks/
│   └── useTestRunner.js
└── infrastructure/services/
    └── TestRunnerService.js
```

## 🛠️ Installation & Setup

### Prerequisites

- Node.js >= 16.0.0
- Playwright browsers installed
- PIDEA backend and frontend running

### Backend Setup

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install @playwright/test
   ```

2. **Install Playwright Browsers**:
   ```bash
   npx playwright install
   ```

3. **Configure Environment Variables**:
   ```bash
   # Add to .env
   TEST_BASE_URL=http://localhost:3000
   PLAYWRIGHT_TIMEOUT=30000
   PLAYWRIGHT_RETRIES=2
   ```

### Frontend Setup

The frontend components are already integrated into the main application. No additional setup required.

## 🎯 Usage

### 1. Access Test Runner

Navigate to the Tests view in the main application using the "🧪 Tests" button in the header.

### 2. Configure Tests

1. **Set Base Configuration**:
   - Click "Edit Config" to modify test settings
   - Configure base URL, timeouts, browsers, and login requirements
   - Save configuration for the current project

2. **Create Test Projects**:
   - Click "New Project" to create test project structure
   - Provide project name and description
   - System creates test directories and sample files

### 3. Execute Tests

1. **Select Test Project**: Choose from available test projects
2. **Run Tests**: Click "Run Tests" to execute selected tests
3. **Monitor Progress**: Watch real-time test execution status
4. **View Results**: Review detailed test results, screenshots, and videos

### 4. API Usage

#### Execute Tests
```bash
POST /api/projects/{projectId}/tests/playwright/execute
{
  "testName": "login.test.js",
  "options": {
    "timeout": 30000,
    "browsers": ["chromium", "firefox"]
  }
}
```

#### Get Test Results
```bash
GET /api/projects/{projectId}/tests/playwright/results/{testId}
```

#### Update Configuration
```bash
PUT /api/projects/{projectId}/tests/playwright/config
{
  "config": {
    "baseURL": "http://localhost:3000",
    "timeout": 30000,
    "retries": 2,
    "browsers": ["chromium"],
    "login": {
      "required": true,
      "username": "admin",
      "password": "admin123"
    }
  }
}
```

## 🔧 Configuration

### Test Configuration Schema

```javascript
{
  baseURL: "http://localhost:3000",     // Base URL for tests
  timeout: 30000,                        // Test timeout in ms
  retries: 2,                           // Number of retries
  browsers: ["chromium", "firefox"],     // Browsers to test
  headless: true,                        // Run in headless mode
  login: {
    required: false,                     // Login required
    selector: "/login",                  // Login page selector
    username: "",                       // Username field
    password: "",                       // Password field
    additionalFields: {}                // Additional form fields
  },
  tests: {
    directory: "./tests",                // Test directory
    pattern: "**/*.test.js",            // Test file pattern
    exclude: ["**/node_modules/**"]     // Excluded patterns
  },
  screenshots: {
    enabled: true,                        // Enable screenshots
    path: "./screenshots",              // Screenshot path
    onFailure: true                     // Screenshot on failure
  },
  videos: {
    enabled: false,                      // Enable video recording
    path: "./videos",                   // Video path
    onFailure: true                     // Video on failure
  },
  reports: {
    enabled: true,                       // Enable reports
    path: "./reports",                  // Report path
    format: "html"                      // Report format
  }
}
```

## 📝 Writing Tests

### Basic Test Structure

```javascript
const { test, expect } = require('@playwright/test');
const testData = require('../fixtures/test-data.json');

test.describe('Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(testData.urls.base);
  });

  test('should perform basic functionality', async ({ page }) => {
    // Test implementation
    await expect(page).toHaveTitle(/Expected Title/);
  });
});
```

### Login Handling

```javascript
test('should handle login', async ({ page }) => {
  await page.goto(testData.urls.login);
  await page.fill(testData.selectors.login.usernameField, testData.testData.login.validCredentials.username);
  await page.fill(testData.selectors.login.passwordField, testData.testData.login.validCredentials.password);
  await page.click(testData.selectors.login.loginButton);
  
  await page.waitForURL('**/dashboard');
  await expect(page).toHaveURL(/dashboard/);
});
```

## 🧪 Testing the System

### Backend Tests

```bash
# Run unit tests
npm test -- PlaywrightTestApplicationService.test.js
npm test -- PlaywrightTestHandler.test.js

# Run integration tests
npm test -- PlaywrightTestController.test.js
```

### Frontend Tests

```bash
# Run component tests
npm test -- TestRunnerComponent.test.jsx
```

### End-to-End Tests

```bash
# Run Playwright tests
npx playwright test

# Run specific test file
npx playwright test tests/login.test.js

# Run with specific browser
npx playwright test --project=chromium
```

## 📊 API Reference

### Test Execution Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/{projectId}/tests/playwright/execute` | Execute Playwright tests |
| GET | `/api/projects/{projectId}/tests/playwright/results/{testId}` | Get test results |
| GET | `/api/projects/all/tests/playwright/results` | Get all test results |

### Configuration Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/{projectId}/tests/playwright/config` | Get test configuration |
| PUT | `/api/projects/{projectId}/tests/playwright/config` | Update test configuration |
| POST | `/api/projects/validate/tests/playwright/config/validate` | Validate configuration |

### Project Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/{projectId}/tests/playwright/projects` | List test projects |
| POST | `/api/projects/{projectId}/tests/playwright/projects` | Create test project |
| GET | `/api/projects/{projectId}/tests/playwright/projects/{id}/config` | Get project config |
| PUT | `/api/projects/{projectId}/tests/playwright/projects/{id}/config` | Update project config |

### Control Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/status/tests/playwright/status` | Get test runner status |
| POST | `/api/projects/stop/tests/playwright/stop` | Stop running tests |
| GET | `/api/projects/{testId}/tests/playwright/logs` | Get test logs |
| POST | `/api/projects/{projectId}/tests/playwright/login/validate` | Validate login credentials |

## 🔍 Troubleshooting

### Common Issues

1. **Browser Installation**:
   ```bash
   npx playwright install
   ```

2. **Permission Issues**:
   ```bash
   chmod +x node_modules/.bin/playwright
   ```

3. **Port Conflicts**:
   - Ensure test base URL doesn't conflict with running applications
   - Use different ports for test execution

4. **Login Failures**:
   - Verify login credentials in test configuration
   - Check login selectors and form fields
   - Ensure login page is accessible

### Debug Mode

Enable debug mode for detailed logging:

```bash
DEBUG=playwright:* npx playwright test
```

### Logs

Check application logs for detailed error information:

```bash
# Backend logs
tail -f logs/combined.log

# Test execution logs
tail -f tests/playwright/reports/test-results.json
```

## 🚀 Deployment

### Production Configuration

1. **Environment Variables**:
   ```bash
   TEST_BASE_URL=https://your-app.com
   PLAYWRIGHT_TIMEOUT=60000
   PLAYWRIGHT_RETRIES=3
   PLAYWRIGHT_HEADLESS=true
   ```

2. **Browser Installation**:
   ```bash
   npx playwright install --with-deps
   ```

3. **Permissions**:
   ```bash
   chmod +x node_modules/.bin/playwright
   ```

### Docker Deployment

```dockerfile
# Install Playwright and browsers
RUN npm install @playwright/test
RUN npx playwright install --with-deps

# Set permissions
RUN chmod +x node_modules/.bin/playwright
```

## 📈 Performance

### Optimization Tips

1. **Parallel Execution**: Tests run in parallel by default
2. **Browser Reuse**: Browsers are reused across tests when possible
3. **Resource Management**: Automatic cleanup of browser resources
4. **Caching**: Test results and configurations are cached

### Monitoring

- Test execution times are tracked and reported
- Resource usage is monitored during test execution
- Performance metrics are available in test reports

## 🤝 Contributing

1. Follow existing code patterns and architecture
2. Add tests for new functionality
3. Update documentation for API changes
4. Ensure backward compatibility

## 📄 License

This project is part of the PIDEA platform and follows the same licensing terms.

## 🆘 Support

For issues and questions:

1. Check the troubleshooting section
2. Review application logs
3. Check test execution reports
4. Contact the development team

---

**Last Updated**: 2025-10-05T12:57:05.000Z  
**Version**: 1.0.0  
**Status**: ✅ Complete
