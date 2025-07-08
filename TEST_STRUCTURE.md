# Test Structure for PIDEA Monorepo

## Overview

This document explains the correct test structure for the PIDEA monorepo. Tests are organized by service to maintain clear separation and avoid confusion.

## Directory Structure

```
PIDEA/
├── backend/
│   ├── tests/                    ← Backend-specific tests
│   │   ├── unit/
│   │   │   ├── application/
│   │   │   │   ├── commands/
│   │   │   │   │   └── AdvancedAnalysisCommand.test.js
│   │   │   │   └── handlers/
│   │   │   │       └── AdvancedAnalysisHandler.test.js
│   │   │   ├── domain/
│   │   │   │   └── services/
│   │   │   │       └── AdvancedAnalysisService.test.js
│   │   │   ├── infrastructure/
│   │   │   ├── presentation/
│   │   │   └── services/         ← Service-specific tests
│   │   │       ├── PortStreamingService.test.js
│   │   │       ├── ScreenshotStreamingService.test.js
│   │   │       └── AutoFinishSystem.test.js
│   │   ├── integration/
│   │   │   ├── PortStreamingWorkflow.test.js
│   │   │   ├── StreamingWorkflow.test.js
│   │   │   └── TodoProcessing.test.js
│   │   ├── e2e/
│   │   ├── security/
│   │   ├── performance/
│   │   ├── analysis/
│   │   ├── jest.config.js
│   │   ├── setup.js
│   │   └── README.md
│   └── ...
├── frontend/
│   ├── tests/                    ← Frontend-specific tests
│   │   ├── e2e/
│   │   └── integration/
│   └── ...
├── scripts/
│   └── test-advanced-analysis.js ← Manual test scripts
└── ...
```

## Test Organization Principles

### 1. **Service-Based Organization**
- **Backend tests** → `backend/tests/`
- **Frontend tests** → `frontend/tests/`
- **Cross-service tests** → `backend/tests/integration/` (for now)

### 2. **Test Types**
- **Unit tests** → `unit/` - Test individual components in isolation
- **Integration tests** → `integration/` - Test component interactions
- **E2E tests** → `e2e/` - Test complete user workflows
- **Specialized tests** → `security/`, `performance/`, `analysis/`

### 3. **Path Mapping**
- Backend tests use `@/` alias for clean imports
- Jest config maps `@/` to `backend/` directory
- Manual scripts use relative paths

## Running Tests

### Backend Tests
```bash
cd backend
npm test                                    # Run all tests
npm test -- AdvancedAnalysisCommand.test.js # Run specific test
npm test -- --coverage                      # Run with coverage
```

### Manual Test Script
```bash
# From PIDEA root
node scripts/test-advanced-analysis.js

# With specific project
node scripts/test-advanced-analysis.js /path/to/project
```

## Test Naming Conventions

### Unit Tests
- `ComponentName.test.js` - Test individual components
- `ServiceName.test.js` - Test services
- `HandlerName.test.js` - Test handlers

### Integration Tests
- `WorkflowName.test.js` - Test complete workflows
- `ServiceIntegration.test.js` - Test service interactions

### E2E Tests
- `UserJourney.test.js` - Test user journeys
- `FeatureName.test.js` - Test specific features

## Migration History

### What Was Moved
- `tests/unit/PortStreamingService.test.js` → `backend/tests/unit/services/`
- `tests/unit/ScreenshotStreamingService.test.js` → `backend/tests/unit/services/`
- `tests/unit/AutoFinishSystem.test.js` → `backend/tests/unit/services/`
- `tests/integration/*` → `backend/tests/integration/`

### Why This Structure?
1. **Clear separation** - Backend tests with backend code
2. **Easier maintenance** - Tests close to the code they test
3. **Better organization** - No confusion about where tests belong
4. **Proper path mapping** - `@/` alias works correctly

## Best Practices

### 1. **Keep Tests Close to Code**
- Unit tests should be in the same service as the code they test
- Integration tests can span multiple services but should be in the primary service

### 2. **Use Proper Path Mapping**
- Backend tests: Use `@/` alias
- Manual scripts: Use relative paths
- Frontend tests: Use frontend-specific aliases

### 3. **Organize by Test Type**
- Unit tests in `unit/` subdirectories
- Integration tests in `integration/`
- Specialized tests in dedicated directories

### 4. **Maintain Clear Structure**
- Don't mix test types in the same directory
- Use descriptive test names
- Keep test files focused and single-purpose

## Troubleshooting

### Common Issues

1. **Module not found errors**
   - Check if using correct path mapping (`@/` vs relative paths)
   - Ensure Jest config is correct for the service

2. **Test discovery issues**
   - Ensure tests are in the correct directory structure
   - Check Jest configuration patterns

3. **Import path confusion**
   - Backend tests: Use `@/` alias
   - Manual scripts: Use relative paths
   - Frontend tests: Use frontend-specific paths

### Getting Help

- Check `backend/tests/README.md` for detailed testing guide
- Review Jest configuration in `backend/tests/jest.config.js`
- Look at existing test examples for patterns 