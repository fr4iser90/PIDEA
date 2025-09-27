# Universal UI Test Bot - Phase 2: Core Implementation

## Phase Overview
- **Phase**: 2
- **Name**: Core Implementation
- **Estimated Time**: 4 hours
- **Status**: Planning
- **Progress**: 0%

## Objectives
Build the core test execution engine, result storage system, and API endpoints for the Universal UI Test Bot.

## Tasks

### 1. TestExecutionService Implementation (1.5 hours)
- [ ] Create TestExecutionService class
- [ ] Implement test step execution engine
- [ ] Add assertion validation system
- [ ] Implement test result collection
- [ ] Add error handling and recovery

**Files to Create:**
- [ ] `backend/domain/services/testing/TestExecutionService.js` - Core execution engine
- [ ] `backend/domain/services/testing/AssertionService.js` - Assertion validation
- [ ] `backend/domain/services/testing/TestStepExecutor.js` - Step execution

**Code Example:**
```javascript
// backend/domain/services/testing/TestExecutionService.js
class TestExecutionService {
  constructor(dependencies = {}) {
    this.playwrightManager = dependencies.playwrightManager;
    this.assertionService = dependencies.assertionService;
    this.logger = new ServiceLogger('TestExecutionService');
  }

  async executeTest(testConfig) {
    const results = {
      testId: testConfig.id,
      startTime: new Date(),
      steps: [],
      screenshots: [],
      assertions: [],
      status: 'running'
    };

    try {
      const browser = await this.playwrightManager.connectToBrowser();
      const page = await browser.newPage();

      for (const step of testConfig.testSteps) {
        const stepResult = await this.executeStep(page, step);
        results.steps.push(stepResult);
        
        if (step.screenshot) {
          const screenshotPath = await this.captureScreenshot(page, step);
          results.screenshots.push(screenshotPath);
        }
      }

      // Execute assertions
      for (const assertion of testConfig.assertions) {
        const assertionResult = await this.assertionService.validate(page, assertion);
        results.assertions.push(assertionResult);
      }

      results.status = 'passed';
      results.endTime = new Date();
      
      return results;
    } catch (error) {
      results.status = 'failed';
      results.error = error.message;
      results.endTime = new Date();
      throw error;
    }
  }
}
```

### 2. TestResultRepository Implementation (1 hour)
- [ ] Create TestResultRepository class
- [ ] Implement result storage methods
- [ ] Add result querying functionality
- [ ] Implement result cleanup policies
- [ ] Add result export capabilities

**Files to Create:**
- [ ] `backend/domain/repositories/TestResultRepository.js` - Result storage
- [ ] `backend/infrastructure/database/TestResultSchema.js` - Database schema

**Code Example:**
```javascript
// backend/domain/repositories/TestResultRepository.js
class TestResultRepository {
  constructor(database) {
    this.database = database;
  }

  async saveTestResult(testResult) {
    const query = `
      INSERT INTO test_results (
        id, test_name, project_type, project_path, status,
        start_time, end_time, steps, screenshots, assertions,
        error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      testResult.id,
      testResult.testName,
      testResult.projectType,
      testResult.projectPath,
      testResult.status,
      testResult.startTime,
      testResult.endTime,
      JSON.stringify(testResult.steps),
      JSON.stringify(testResult.screenshots),
      JSON.stringify(testResult.assertions),
      testResult.error || null,
      new Date()
    ];

    return await this.database.run(query, values);
  }

  async getTestResults(filters = {}) {
    // Query implementation
  }
}
```

### 3. TestBotController API Endpoints (1 hour)
- [ ] Create TestBotController class
- [ ] Implement test execution endpoints
- [ ] Add test configuration endpoints
- [ ] Implement result retrieval endpoints
- [ ] Add test management endpoints

**Files to Create:**
- [ ] `backend/presentation/api/TestBotController.js` - API controller
- [ ] `backend/application/routes/TestBotRoutes.js` - Route definitions

**Code Example:**
```javascript
// backend/presentation/api/TestBotController.js
class TestBotController {
  constructor(dependencies = {}) {
    this.testBotService = dependencies.testBotService;
    this.testExecutionService = dependencies.testExecutionService;
    this.testResultRepository = dependencies.testResultRepository;
  }

  async executeTest(req, res) {
    try {
      const { testConfig } = req.body;
      
      const result = await this.testExecutionService.executeTest(testConfig);
      await this.testResultRepository.saveTestResult(result);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getTestResults(req, res) {
    try {
      const { projectId, status, limit = 50 } = req.query;
      
      const results = await this.testResultRepository.getTestResults({
        projectId,
        status,
        limit: parseInt(limit)
      });
      
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}
```

### 4. Test Execution Logging (0.5 hours)
- [ ] Implement structured logging for test execution
- [ ] Add performance metrics logging
- [ ] Create test execution audit trail
- [ ] Add error logging and debugging info
- [ ] Implement log rotation and cleanup

**Files to Create:**
- [ ] `backend/infrastructure/logging/TestExecutionLogger.js` - Test-specific logging
- [ ] `backend/infrastructure/logging/TestMetricsLogger.js` - Performance metrics

**Code Example:**
```javascript
// backend/infrastructure/logging/TestExecutionLogger.js
class TestExecutionLogger {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/test-execution.log' }),
        new winston.transports.Console()
      ]
    });
  }

  logTestStart(testConfig) {
    this.logger.info('Test execution started', {
      testId: testConfig.id,
      testName: testConfig.name,
      projectType: testConfig.projectType,
      timestamp: new Date()
    });
  }

  logTestStep(step, result) {
    this.logger.info('Test step executed', {
      step: step.action,
      selector: step.selector,
      result: result.status,
      duration: result.duration,
      timestamp: new Date()
    });
  }
}
```

## Success Criteria
- [ ] TestExecutionService can execute test steps
- [ ] Test results are properly stored in database
- [ ] API endpoints respond correctly
- [ ] Test execution logging is comprehensive
- [ ] Error handling works properly
- [ ] All unit tests pass

## Testing
- [ ] Unit test: `tests/unit/testing/TestExecutionService.test.js`
- [ ] Unit test: `tests/unit/testing/TestResultRepository.test.js`
- [ ] Integration test: `tests/integration/TestBotAPI.test.js`

## Database Schema
```sql
CREATE TABLE test_results (
  id TEXT PRIMARY KEY,
  test_name TEXT NOT NULL,
  project_type TEXT NOT NULL,
  project_path TEXT,
  status TEXT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  steps TEXT, -- JSON
  screenshots TEXT, -- JSON
  assertions TEXT, -- JSON
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_results_project ON test_results(project_type, project_path);
CREATE INDEX idx_test_results_status ON test_results(status);
CREATE INDEX idx_test_results_created ON test_results(created_at);
```

## Dependencies
- Phase 1 completion
- Database connection
- PlaywrightManager
- Test configuration system

## Risks & Mitigations
- **Risk**: Test execution performance issues
- **Mitigation**: Implement browser pooling, optimize test steps

- **Risk**: Database storage size growth
- **Mitigation**: Implement cleanup policies, compression

## Next Phase
Phase 3: PIDEA Integration - Connect the test bot to PIDEA's IDE detection and project analysis systems.
