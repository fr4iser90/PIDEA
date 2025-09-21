# Framework Loading System Refactor - Phase 1: Domain Layer Cleanup

## Phase Overview
- **Duration**: 3 hours
- **Status**: Planning
- **Progress**: 0%
- **Dependencies**: None

## Objectives
Clean up the domain layer to follow Clean Architecture principles by removing infrastructure concerns and focusing only on framework metadata management.

## Tasks

### 1.1 Remove Steps Validation from FrameworkRegistry (1 hour)
- [ ] **Remove steps validation logic** from `validateFrameworkConfig` method (lines 214-219)
- [ ] **Simplify validation** to only check framework metadata (name, version, description, category)
- [ ] **Update validation rules** to remove infrastructure-specific validations
- [ ] **Test validation changes** to ensure no breaking changes

**Files to modify:**
- `backend/domain/frameworks/FrameworkRegistry.js`

**Expected changes:**
```javascript
// BEFORE: Validates steps array/object (lines 214-219)
if (config.steps !== undefined) {
  if (!Array.isArray(config.steps) && typeof config.steps !== 'object') {
    throw new Error('Framework configuration "steps" must be an array or object');
  }
}

// AFTER: Only validate framework metadata
if (!config.name || typeof config.name !== 'string') {
  throw new Error('Framework configuration must have a "name" property');
}
```

### 1.2 Simplify Domain Layer Interface (1 hour)
- [ ] **Review FrameworkRegistry interface** for infrastructure dependencies
- [ ] **Remove file system operations** from domain layer (lines 72-109)
- [ ] **Remove file system imports** (`fs`, `path` modules - lines 8-9)
- [ ] **Ensure domain layer** only handles business logic
- [ ] **Update method signatures** to remove infrastructure parameters

**Files to modify:**
- `backend/domain/frameworks/FrameworkRegistry.js`

**Expected changes:**
- Remove `loadFrameworkConfigs` method (lines 72-109) - move to infrastructure
- Remove `fs` and `path` imports (lines 8-9)
- Remove any file path handling
- Remove step file validation
- Focus only on framework metadata validation

### 1.3 Update Domain Layer Tests (45 minutes)
- [ ] **Create unit tests** for simplified domain layer
- [ ] **Test framework metadata validation** only
- [ ] **Mock infrastructure dependencies** properly
- [ ] **Ensure test coverage** for domain logic

**Files to create:**
- `backend/tests/unit/FrameworkRegistry.test.js`

**Test cases:**
- Framework metadata validation
- Category validation
- Framework registration/unregistration
- Error handling for invalid metadata

### 1.4 Verify Clean Separation (15 minutes)
- [ ] **Review domain layer** for infrastructure dependencies
- [ ] **Ensure no file system operations** in domain
- [ ] **Verify domain layer** only handles business logic
- [ ] **Document separation** achieved

## Success Criteria
- [ ] Domain layer only validates framework metadata
- [ ] No infrastructure concerns in domain layer
- [ ] All domain tests pass
- [ ] Clean separation of concerns achieved

## Risk Mitigation
- **Risk**: Breaking existing functionality
- **Mitigation**: Comprehensive testing, gradual changes
- **Rollback**: Git revert if issues arise

## Dependencies
- None (can start immediately)

## Next Phase
Phase 2: Infrastructure Layer Improvements
