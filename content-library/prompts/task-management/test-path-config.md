# Test Path Configuration for Monorepo Structure

## Overview
This configuration provides intelligent test path resolution for monorepo projects, automatically detecting the correct test location based on category, component type, and project structure.

## Intelligent Test Path Resolution

### Core Resolution Function
```javascript
/**
 * Smart test path detection for monorepo structure
 * @param {string} category - Task category (backend, frontend, etc.)
 * @param {string} componentName - Name of the component to test
 * @param {string} componentType - Type of component (service, component, etc.)
 * @returns {string} Resolved test file path
 */
const resolveTestPath = (category, componentName, componentType = 'service') => {
  // Component type to test directory mapping
  const componentTypeMapping = {
    // Backend components
    'service': 'unit',
    'controller': 'unit', 
    'repository': 'unit',
    'entity': 'unit',
    'middleware': 'unit',
    'handler': 'unit',
    'command': 'unit',
    'api': 'integration',
    'database': 'integration',
    'workflow': 'integration',
    'step': 'unit',
    'framework': 'unit',
    
    // Frontend components
    'component': 'unit',
    'hook': 'unit',
    'store': 'unit',
    'service': 'unit',
    'page': 'integration',
    'flow': 'e2e',
    'modal': 'unit',
    'panel': 'unit'
  };
  
  // Category to base path mapping
  const categoryPaths = {
    'backend': 'backend/tests',
    'frontend': 'frontend/tests',
    'database': 'backend/tests',
    'api': 'backend/tests',
    'security': 'backend/tests',
    'performance': 'backend/tests',
    'testing': 'backend/tests',
    'documentation': 'backend/tests',
    'migration': 'backend/tests',
    'automation': 'backend/tests',
    'ai': 'backend/tests',
    'ide': 'backend/tests'
  };
  
  // File extension based on category
  const getFileExtension = (category) => {
    return category === 'frontend' ? '.test.jsx' : '.test.js';
  };
  
  const basePath = categoryPaths[category] || 'tests';
  const testType = componentTypeMapping[componentType] || 'unit';
  const extension = getFileExtension(category);
  
  return `${basePath}/${testType}/${componentName}${extension}`;
};
```

### Usage Examples
```javascript
// Backend examples
resolveTestPath('backend', 'AuthService', 'service') 
// → 'backend/tests/unit/AuthService.test.js'

resolveTestPath('backend', 'AuthController', 'controller') 
// → 'backend/tests/unit/AuthController.test.js'

resolveTestPath('backend', 'AuthAPI', 'api') 
// → 'backend/tests/integration/AuthAPI.test.js'

// Frontend examples
resolveTestPath('frontend', 'LoginForm', 'component') 
// → 'frontend/tests/unit/LoginForm.test.jsx'

resolveTestPath('frontend', 'useAuth', 'hook') 
// → 'frontend/tests/unit/useAuth.test.jsx'

resolveTestPath('frontend', 'UserAuthentication', 'flow') 
// → 'frontend/tests/e2e/UserAuthentication.test.jsx'

// Other categories
resolveTestPath('database', 'UserMigration', 'database') 
// → 'backend/tests/integration/UserMigration.test.js'

resolveTestPath('security', 'SecurityMiddleware', 'middleware') 
// → 'backend/tests/unit/SecurityMiddleware.test.js'
```

## Test Configuration by Category

### Backend Tests
- **Environment**: Jest with Node.js
- **Extensions**: `.test.js`
- **Coverage**: 90%+ for unit tests, 80%+ for integration tests
- **Base Path**: `backend/tests/`

### Frontend Tests  
- **Environment**: Jest with jsdom
- **Extensions**: `.test.jsx`
- **Coverage**: 90%+ for unit tests, 80%+ for integration tests
- **Base Path**: `frontend/tests/`

## Test Type Mapping

### Unit Tests (Component Type → Unit)
- `service`, `controller`, `repository`, `entity`, `middleware`, `handler`, `command`, `step`, `framework`
- `component`, `hook`, `store`, `modal`, `panel`

### Integration Tests (Component Type → Integration)  
- `api`, `database`, `workflow`, `page`

### E2E Tests (Component Type → E2E)
- `flow`

## Category Path Mapping

| Category | Base Path | Description |
|----------|-----------|-------------|
| `backend` | `backend/tests` | Backend services, controllers, etc. |
| `frontend` | `frontend/tests` | Frontend components, hooks, etc. |
| `database` | `backend/tests` | Database operations, migrations |
| `api` | `backend/tests` | API endpoints, controllers |
| `security` | `backend/tests` | Security features, middleware |
| `performance` | `backend/tests` | Performance optimizations |
| `testing` | `backend/tests` | Testing infrastructure |
| `documentation` | `backend/tests` | Documentation generation |
| `migration` | `backend/tests` | System migrations |
| `automation` | `backend/tests` | Automation features |
| `ai` | `backend/tests` | AI-related features |
| `ide` | `backend/tests` | IDE integration features |

## Integration with Task Management Prompts

### In task-create.md
```markdown
#### Unit Tests:
- [ ] Test file: `{resolvedTestPath}` (auto-detected based on category and component type)
- [ ] Test cases: [List specific scenarios to test]
- [ ] Mock requirements: [External dependencies to mock]
```

### In task-execute.md
```javascript
// Use resolveTestPath function for automatic test file creation
const testPath = resolveTestPath(category, componentName, componentType);
// Create test file at resolved path
```

### In task-check-state.md
```javascript
// Check if test file exists at resolved path
const expectedTestPath = resolveTestPath(category, componentName, componentType);
const testExists = await fileExists(expectedTestPath);
```

## Benefits

1. **Consistency**: All prompts use the same test path resolution logic
2. **Accuracy**: Tests are placed in the correct location based on category and type
3. **Maintainability**: Single source of truth for test path configuration
4. **Flexibility**: Easy to add new categories or component types
5. **Monorepo Support**: Properly handles backend/frontend separation

## Migration from Root Tests

For existing projects with tests in root `tests/` directory:

```javascript
// Legacy support - fallback to root tests if category not found
const basePath = categoryPaths[category] || 'tests';
```

This ensures backward compatibility while encouraging proper monorepo structure. 