// Test setup file
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Increase timeout for async operations
jest.setTimeout(30000);

// Test Management Integration - Disabled for now to fix module resolution
if (process.env.TEST_MANAGEMENT_ENABLED !== 'false') {
  try {
    const TestManagementService = require('@services/TestManagementService');
    
    // Initialize test management service
    global.testManagementService = new TestManagementService();
    
    // Test lifecycle hooks for management
    beforeAll(async () => {
      if (process.env.TEST_AUTO_REGISTER !== 'false') {
        // Auto-register test file
        const testPath = expect.getState().testPath;
        if (testPath) {
          try {
            await global.testManagementService.registerTest(
              testPath,
              'test-suite',
              { registeredBy: 'jest-setup', testFramework: 'jest' }
            );
          } catch (error) {
            console.warn(`Failed to auto-register test: ${error.message}`);
          }
        }
      }
    });
    
    afterAll(async () => {
      // Cleanup if needed
      if (process.env.TEST_CLEANUP === 'true') {
        // Add cleanup logic here if needed
      }
    });
  } catch (error) {
    console.warn('TestManagementService not available, skipping test management integration');
  }
} 