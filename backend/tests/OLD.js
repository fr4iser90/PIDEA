module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(chalk|ora|inquirer|cli-table3)/)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  testTimeout: 30000,
  verbose: true,
  // Test Management Integration
  reporters: [
    'default',
    ['<rootDir>/tests/reporters/test-management-reporter.js', {
      enabled: process.env.TEST_MANAGEMENT_ENABLED !== 'false'
    }]
  ],
  // Collect test metadata
  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  // Test management specific settings
  testManagement: {
    enabled: process.env.TEST_MANAGEMENT_ENABLED !== 'false',
    autoRegister: process.env.TEST_AUTO_REGISTER !== 'false',
    legacyDetection: process.env.TEST_LEGACY_DETECTION !== 'false',
    statusTracking: process.env.TEST_STATUS_TRACKING !== 'false'
  }
}; 