# Testing Guide for Advanced Analysis Components

This guide explains how to test the Advanced Analysis components in the PIDEA project.

## Overview

The Advanced Analysis system consists of three main components:

1. **AdvancedAnalysisCommand** - Command object for analysis requests
2. **AdvancedAnalysisHandler** - Handler for processing analysis commands
3. **AdvancedAnalysisService** - Service for performing comprehensive analysis

## Test Structure

```
backend/tests/
├── unit/
│   ├── application/
│   │   ├── commands/
│   │   │   └── AdvancedAnalysisCommand.test.js
│   │   └── handlers/
│   │       └── AdvancedAnalysisHandler.test.js
│   └── domain/
│       └── services/
│           └── AdvancedAnalysisService.test.js
├── jest.config.js
└── setup.js
```

## Running Tests

### 1. Run All Tests

```bash
cd backend
npm test
```

### 2. Run Specific Test Files

```bash
# Test only the command
npm test -- AdvancedAnalysisCommand.test.js

# Test only the handler
npm test -- AdvancedAnalysisHandler.test.js

# Test only the service
npm test -- AdvancedAnalysisService.test.js
```

### 3. Run Tests with Coverage

```bash
npm test -- --coverage
```

### 4. Run Tests in Watch Mode

```bash
npm test -- --watch
```

## Manual Testing

For manual testing with real project data, use the test runner script:

```bash
# Test with current directory
node scripts/test-advanced-analysis.js

# Test with specific project path
node scripts/test-advanced-analysis.js /path/to/your/project
```

## Test Coverage

### AdvancedAnalysisCommand Tests

- ✅ Constructor with default and custom values
- ✅ Command ID generation (unique)
- ✅ Analysis options configuration
- ✅ Output configuration
- ✅ Metadata generation
- ✅ Business rule validation
- ✅ Command description generation
- ✅ Duration estimation
- ✅ Resource requirements
- ✅ Priority and tags
- ✅ Command cloning
- ✅ Serialization/deserialization

### AdvancedAnalysisHandler Tests

- ✅ Handler initialization with dependencies
- ✅ Command validation
- ✅ Project path validation
- ✅ Task creation
- ✅ Execution record management
- ✅ Event publishing
- ✅ Progress tracking
- ✅ Error handling
- ✅ Analysis workflow
- ✅ Result processing

### AdvancedAnalysisService Tests

- ✅ Service initialization
- ✅ Comprehensive analysis workflow
- ✅ Layer validation integration
- ✅ Logic validation integration
- ✅ Standard analysis integration
- ✅ Integrated insights generation
- ✅ Cross-violation correlation
- ✅ Business logic placement detection
- ✅ Error handling pattern analysis
- ✅ Security pattern analysis
- ✅ Data flow pattern analysis
- ✅ Comprehensive recommendations
- ✅ Metrics calculation
- ✅ Report generation

## Test Dependencies

The tests use the following dependencies:

- **Jest** - Testing framework
- **Mock objects** - For external dependencies
- **Real services** - LayerValidationService, LogicValidationService, TaskAnalysisService

## Mock Strategy

The tests use mocks to isolate the components being tested:

1. **External services** are mocked to avoid real file system operations
2. **Repositories** are mocked to avoid database dependencies
3. **Event bus** is mocked to capture events without real event handling
4. **File system** operations are mocked where appropriate

## Integration Testing

For integration testing with real components:

1. Ensure all dependencies are available
2. Use a test project with known structure
3. Run the test runner script
4. Verify results against expected outcomes

## Debugging Tests

### Enable Verbose Logging

```bash
npm test -- --verbose
```

### Debug Specific Test

```bash
npm test -- --testNamePattern="should perform comprehensive advanced analysis"
```

### Run Single Test File in Debug Mode

```bash
node --inspect-brk node_modules/.bin/jest AdvancedAnalysisService.test.js --runInBand
```

## Common Issues

### 1. Mock Not Working

Ensure mocks are properly set up in `beforeEach`:

```javascript
beforeEach(() => {
    jest.clearAllMocks();
    // Set up mocks here
});
```

### 2. Async Test Failures

Use proper async/await patterns:

```javascript
test('should handle async operation', async () => {
    const result = await service.performOperation();
    expect(result).toBeDefined();
});
```

### 3. File System Errors

Mock file system operations:

```javascript
jest.mock('fs').promises;
const fs = require('fs').promises;
jest.spyOn(fs, 'stat').mockResolvedValue({ isDirectory: () => true });
```

## Adding New Tests

When adding new tests:

1. Follow the existing naming convention
2. Use descriptive test names
3. Test both success and failure scenarios
4. Mock external dependencies
5. Add proper error handling tests
6. Update this README if needed

## Performance Testing

For performance testing:

```bash
# Run tests with performance profiling
npm test -- --detectOpenHandles --forceExit
```

## Continuous Integration

Tests are automatically run in CI/CD pipelines. Ensure all tests pass before merging code changes. 