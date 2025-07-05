# Test Generation Workflow Prompts

## Overview
AI prompts for generating comprehensive tests file-by-file, integrated with the refactor workflow.

## Core Test Generation Prompt

### Main Test Generation Prompt
```
You are an expert test engineer. Analyze the following code and create comprehensive tests.

**File Analysis:**
- File Path: {filePath}
- File Type: {fileType}
- Framework: {framework}
- Dependencies: {dependencies}
- Complexity: {complexity}

**Code to Test:**
```{language}
{code}
```

**Requirements:**
1. Use {framework} testing framework
2. Test ALL public methods, functions, and classes
3. Include edge cases and error scenarios
4. Mock external dependencies properly
5. Achieve >80% code coverage
6. Follow AAA pattern (Arrange, Act, Assert)
7. Use descriptive test names
8. Include setup and teardown if needed
9. Test both success and failure paths
10. Add integration tests for complex interactions

**Test Structure:**
- Unit tests for individual functions/methods
- Integration tests for component interactions
- Error handling tests
- Edge case tests
- Performance tests if applicable

**Output Format:**
Generate a complete test file with:
- All necessary imports
- Proper test structure
- Comprehensive test cases
- Mock configurations
- Setup/teardown functions

**Quality Standards:**
- Tests must be maintainable and readable
- Use meaningful test data
- Avoid test interdependence
- Include proper assertions
- Handle async operations correctly
```

## Specialized Test Prompts

### Unit Test Generation
```
Create unit tests for the following function/class:

**Function/Class:** {functionName}
**Purpose:** {purpose}
**Parameters:** {parameters}
**Return Type:** {returnType}

**Code:**
```{language}
{code}
```

**Test Requirements:**
1. Test normal operation with valid inputs
2. Test edge cases (null, undefined, empty values)
3. Test error conditions and exceptions
4. Test boundary values
5. Mock any external dependencies
6. Test all code paths
7. Verify return values and side effects

**Generate:**
- Individual test cases for each scenario
- Proper setup and teardown
- Meaningful test descriptions
- Comprehensive assertions
```

### Integration Test Generation
```
Create integration tests for the following component:

**Component:** {componentName}
**Dependencies:** {dependencies}
**Integration Points:** {integrationPoints}

**Code:**
```{language}
{code}
```

**Integration Test Requirements:**
1. Test component interaction with dependencies
2. Test data flow between components
3. Test error propagation
4. Test state management
5. Test async operations
6. Test real-world scenarios
7. Use realistic test data

**Generate:**
- Integration test scenarios
- Mock configurations for dependencies
- End-to-end test flows
- Error handling tests
```

### Error Handling Test Generation
```
Create error handling tests for the following code:

**Code:**
```{language}
{code}
```

**Error Scenarios to Test:**
1. Invalid input parameters
2. Network failures
3. Database connection errors
4. File system errors
5. Authentication failures
6. Authorization errors
7. Timeout scenarios
8. Resource exhaustion

**Requirements:**
1. Test each error scenario
2. Verify proper error messages
3. Test error recovery mechanisms
4. Test fallback behaviors
5. Verify error logging
6. Test error propagation

**Generate:**
- Error test cases
- Error recovery tests
- Error message validation
- Error handling assertions
```

### Performance Test Generation
```
Create performance tests for the following code:

**Code:**
```{language}
{code}
```

**Performance Requirements:**
1. Response time < {targetTime}ms
2. Memory usage < {targetMemory}MB
3. CPU usage < {targetCPU}%
4. Throughput > {targetThroughput} requests/sec

**Test Scenarios:**
1. Normal load testing
2. Stress testing
3. Memory leak detection
4. CPU usage monitoring
5. Response time analysis
6. Scalability testing

**Generate:**
- Performance test cases
- Load testing scenarios
- Memory monitoring tests
- Performance assertions
```

## Framework-Specific Prompts

### Jest Test Generation
```
Create Jest tests for the following code:

**Code:**
```{language}
{code}
```

**Jest-Specific Requirements:**
1. Use Jest testing framework
2. Use Jest mocks for dependencies
3. Use Jest matchers for assertions
4. Use Jest setup/teardown hooks
5. Use Jest test utilities
6. Configure Jest properly

**Jest Features to Use:**
- `describe()` for test suites
- `it()` or `test()` for test cases
- `beforeEach()` and `afterEach()` for setup/teardown
- `jest.mock()` for mocking
- `expect()` for assertions
- `jest.fn()` for function mocks
- `jest.spyOn()` for method spying

**Generate:**
- Jest test file structure
- Proper Jest imports
- Jest mock configurations
- Jest assertions
```

### Mocha Test Generation
```
Create Mocha tests for the following code:

**Code:**
```{language}
{code}
```

**Mocha-Specific Requirements:**
1. Use Mocha testing framework
2. Use Chai for assertions
3. Use Sinon for mocking
4. Use Mocha hooks for setup/teardown
5. Configure Mocha properly

**Mocha Features to Use:**
- `describe()` for test suites
- `it()` for test cases
- `before()`, `beforeEach()`, `after()`, `afterEach()` for hooks
- `sinon.mock()` for mocking
- `chai.expect()` for assertions
- `sinon.spy()` for spying

**Generate:**
- Mocha test file structure
- Proper Mocha imports
- Sinon mock configurations
- Chai assertions
```

### Vitest Test Generation
```
Create Vitest tests for the following code:

**Code:**
```{language}
{code}
```

**Vitest-Specific Requirements:**
1. Use Vitest testing framework
2. Use Vitest mocks for dependencies
3. Use Vitest matchers for assertions
4. Use Vitest setup/teardown hooks
5. Configure Vitest properly

**Vitest Features to Use:**
- `describe()` for test suites
- `it()` or `test()` for test cases
- `beforeEach()` and `afterEach()` for setup/teardown
- `vi.mock()` for mocking
- `expect()` for assertions
- `vi.fn()` for function mocks
- `vi.spyOn()` for method spying

**Generate:**
- Vitest test file structure
- Proper Vitest imports
- Vitest mock configurations
- Vitest assertions
```

## Test Quality Prompts

### Test Coverage Analysis
```
Analyze the following test file for coverage gaps:

**Test File:**
```{language}
{testCode}
```

**Source Code:**
```{language}
{sourceCode}
```

**Coverage Analysis Requirements:**
1. Identify untested code paths
2. Find missing edge cases
3. Check for proper mocking
4. Verify error scenarios
5. Analyze test quality
6. Suggest improvements

**Generate:**
- Coverage gap analysis
- Missing test scenarios
- Test quality assessment
- Improvement recommendations
```

### Test Refactoring
```
Refactor the following tests to improve quality:

**Current Tests:**
```{language}
{testCode}
```

**Refactoring Requirements:**
1. Improve test readability
2. Reduce test interdependence
3. Better test organization
4. More descriptive test names
5. Proper test isolation
6. Better error handling
7. Optimize test performance

**Generate:**
- Refactored test code
- Improved test structure
- Better test organization
- Enhanced test quality
```

## Workflow Integration Prompts

### Post-Refactor Test Generation
```
The following code has been refactored. Create comprehensive tests for the refactored version:

**Original Code:**
```{language}
{originalCode}
```

**Refactored Code:**
```{language}
{refactoredCode}
```

**Refactoring Changes:**
- {change1}
- {change2}
- {change3}

**Test Generation Requirements:**
1. Test the refactored functionality
2. Ensure all changes are covered
3. Test new interfaces and methods
4. Verify refactoring didn't break existing behavior
5. Test new error handling
6. Cover all new code paths

**Generate:**
- Tests for refactored code
- Tests for new functionality
- Regression tests
- Integration tests for changes
```

### Test Execution and Debug
```
Execute the following tests and analyze the results:

**Test File:**
```{language}
{testCode}
```

**Execution Results:**
{executionResults}

**Debug Requirements:**
1. Analyze test failures
2. Identify root causes
3. Suggest fixes
4. Improve test reliability
5. Optimize test performance
6. Fix flaky tests

**Generate:**
- Failure analysis
- Root cause identification
- Fix suggestions
- Test improvements
- Performance optimizations
```

## Usage Instructions

### For File-by-File Test Generation:
1. **Analyze each file** using the main test generation prompt
2. **Generate framework-specific tests** using the appropriate prompt
3. **Create specialized tests** (unit, integration, error handling) as needed
4. **Analyze test quality** using the coverage analysis prompt
5. **Refactor tests** if needed using the test refactoring prompt

### For Workflow Integration:
1. **After refactoring**, use the post-refactor test generation prompt
2. **Execute generated tests** and use the debug prompt for failures
3. **Iterate on test quality** until coverage and reliability targets are met

### For Different Frameworks:
1. **Jest**: Use Jest-specific prompt for Node.js/React projects
2. **Mocha**: Use Mocha-specific prompt for Node.js projects
3. **Vitest**: Use Vitest-specific prompt for modern Node.js projects

## Example Usage

```javascript
// Example: Generate Jest tests for a service
const prompt = `
${jestTestGenerationPrompt}

File: backend/services/UserService.js
Framework: Jest
Code:
${userServiceCode}
`;

// Example: Generate integration tests
const integrationPrompt = `
${integrationTestGenerationPrompt}

Component: UserService
Dependencies: UserRepository, EmailService, Logger
Code:
${userServiceCode}
`;
```

## Quality Checklist

### Before Using Prompts:
- [ ] Code is properly analyzed
- [ ] Dependencies are identified
- [ ] Framework is determined
- [ ] Test requirements are clear

### After Generating Tests:
- [ ] All public methods are tested
- [ ] Edge cases are covered
- [ ] Error scenarios are tested
- [ ] Mocks are properly configured
- [ ] Tests are readable and maintainable
- [ ] Coverage targets are met

### For Workflow Integration:
- [ ] Tests are generated after refactoring
- [ ] Tests are executed automatically
- [ ] Failures are analyzed and fixed
- [ ] Coverage reports are generated
- [ ] Debug reports are created 