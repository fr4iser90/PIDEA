
// Test environment setup
process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';

// Mock console methods to reduce noise
const originalConsole = { ...console };
console.log = (...args) => {
  if (process.env.VERBOSE_TESTS) {
    originalConsole.log(...args);
  }
};

console.warn = (...args) => {
  if (process.env.VERBOSE_TESTS) {
    originalConsole.warn(...args);
  }
};

// Global test utilities
global.testUtils = {
  createMockContext: () => ({
    port: '9222',
    sessionId: 'test-session',
    userId: 'test-user'
  }),
  
  createMockMessages: () => [
    { id: '1', content: 'Test message', sender: 'user' },
    { id: '2', content: 'Test response', sender: 'assistant' }
  ],
  
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Cleanup after tests
afterAll(async () => {
  // Wait for any pending operations
  await new Promise(resolve => setTimeout(resolve, 100));
});
