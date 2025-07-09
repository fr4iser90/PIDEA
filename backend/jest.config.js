module.exports = {
  testEnvironment: 'node',
  
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/__tests__/**/*.js'
  ],
  
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '/build/',
    '/.git/',
    '/uploads/',
    '/output/',
    '/generated/'
  ],
  
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/*.test.js',
    '!**/*.spec.js',
    '!**/jest.config.js',
    '!**/setup.js',
    '!**/scripts/**'
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/domain/(.*)$': '<rootDir>/domain/$1',
    '^@/application/(.*)$': '<rootDir>/application/$1',
    '^@/infrastructure/(.*)$': '<rootDir>/infrastructure/$1',
    '^@/presentation/(.*)$': '<rootDir>/presentation/$1',
    '^@/cli/(.*)$': '<rootDir>/cli/$1',
    '^@/scripts/(.*)$': '<rootDir>/scripts/$1',
    '^@/tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  transformIgnorePatterns: [
    '/node_modules/(?!(uuid|fs-extra|glob)/)'
  ],
  
  testTimeout: 30000,
  clearMocks: true,
  restoreMocks: true,
  resetModules: true,
  forceExit: true,
  detectOpenHandles: true,
  
  // Memory Management für große Test-Suites
  maxWorkers: 1,
  runInBand: true,
  
  // Performance-Optimierungen
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Zusätzliche Memory-Optimierungen
  resetMocks: true,
  clearMocks: true,
  restoreMocks: true,
  
  // Test-Isolation verbessern
  testEnvironmentOptions: {
    url: 'http://localhost'
  },
  
  // Test Management Integration
  reporters: [
    'default',
    ['<rootDir>/tests/reporters/test-management-reporter.js', {
      enabled: process.env.TEST_MANAGEMENT_ENABLED !== 'false',
      autoRegister: process.env.TEST_AUTO_REGISTER !== 'false',
      statusTracking: process.env.TEST_STATUS_TRACKING !== 'false'
    }]
  ]
}; 