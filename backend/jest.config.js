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
    '!**/scripts/**',
    '!**/cli/**',
    '!**/*.sh',
    '!**/entrypoint.sh'
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/domain/$1',
    '^@domain$': '<rootDir>/domain',
    '^@application/(.*)$': '<rootDir>/application/$1',
    '^@application$': '<rootDir>/application',
    '^@infrastructure/(.*)$': '<rootDir>/infrastructure/$1',
    '^@infrastructure$': '<rootDir>/infrastructure',
    '^@presentation/(.*)$': '<rootDir>/presentation/$1',
    '^@presentation$': '<rootDir>/presentation',
    '^@cli/(.*)$': '<rootDir>/cli/$1',
    '^@cli$': '<rootDir>/cli',
    '^@scripts/(.*)$': '<rootDir>/scripts/$1',
    '^@scripts$': '<rootDir>/scripts',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@tests$': '<rootDir>/tests',
    '^@commands/(.*)$': '<rootDir>/application/commands/$1',
    '^@commands$': '<rootDir>/application/commands',
    '^@handlers/(.*)$': '<rootDir>/application/handlers/$1',
    '^@handlers$': '<rootDir>/application/handlers',
    '^@steps/(.*)$': '<rootDir>/domain/steps/$1',
    '^@steps$': '<rootDir>/domain/steps',
    '^@workflows/(.*)$': '<rootDir>/domain/workflows/$1',
    '^@logging/(.*)$': '<rootDir>/infrastructure/logging/$1',
    '^@logging$': '<rootDir>/infrastructure/logging',
    '^@entities/(.*)$': '<rootDir>/domain/entities/$1',
    '^@entities$': '<rootDir>/domain/entities',
    '^@services/(.*)$': '<rootDir>/domain/services/$1',
    '^@services$': '<rootDir>/domain/services',
    '^@value-objects/(.*)$': '<rootDir>/domain/value-objects/$1',
    '^@value-objects$': '<rootDir>/domain/value-objects',
    '^@repositories/(.*)$': '<rootDir>/domain/repositories/$1',
    '^@repositories$': '<rootDir>/domain/repositories',
    '^@categories/(.*)$': '<rootDir>/application/commands/categories/$1',
    '^@categories$': '<rootDir>/application/commands/categories',
    '^@external/(.*)$': '<rootDir>/infrastructure/external/$1',
    '^@external$': '<rootDir>/infrastructure/external',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@config$': '<rootDir>/config'
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