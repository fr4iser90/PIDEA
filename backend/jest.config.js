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
    '^@/(.*)$': '<rootDir>/$1',
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
    '^@workflows$': '<rootDir>/domain/workflows',
    '^@frameworks/(.*)$': '<rootDir>/domain/frameworks/$1',
    '^@frameworks$': '<rootDir>/domain/frameworks',
    '^@git/(.*)$': '<rootDir>/domain/workflows/categories/git/$1',
    '^@git$': '<rootDir>/domain/workflows/categories/git',
    '^@categories/(.*)$': '<rootDir>/application/commands/categories/$1',
    '^@categories$': '<rootDir>/application/commands/categories',
    '^@handler-categories/(.*)$': '<rootDir>/application/handlers/categories/$1',
    '^@handler-categories$': '<rootDir>/application/handlers/categories',
    '^@step-categories/(.*)$': '<rootDir>/domain/workflows/steps/categories/$1',
    '^@step-categories$': '<rootDir>/domain/workflows/steps/categories',
    '^@workflow-categories/(.*)$': '<rootDir>/domain/workflows/categories/$1',
    '^@workflow-categories$': '<rootDir>/domain/workflows/categories',
    '^@entities/(.*)$': '<rootDir>/domain/entities/$1',
    '^@entities$': '<rootDir>/domain/entities',
    '^@services/(.*)$': '<rootDir>/domain/services/$1',
    '^@services$': '<rootDir>/domain/services',
    '^@value-objects/(.*)$': '<rootDir>/domain/value-objects/$1',
    '^@value-objects$': '<rootDir>/domain/value-objects',
    '^@repositories/(.*)$': '<rootDir>/domain/repositories/$1',
    '^@repositories$': '<rootDir>/domain/repositories',
    '^@messaging/(.*)$': '<rootDir>/infrastructure/messaging/$1',
    '^@messaging$': '<rootDir>/infrastructure/messaging',
    '^@database/(.*)$': '<rootDir>/infrastructure/database/$1',
    '^@database$': '<rootDir>/infrastructure/database',
    '^@external/(.*)$': '<rootDir>/infrastructure/external/$1',
    '^@external$': '<rootDir>/infrastructure/external',
    '^@auth/(.*)$': '<rootDir>/infrastructure/auth/$1',
    '^@auth$': '<rootDir>/infrastructure/auth',
    '^@auto/(.*)$': '<rootDir>/infrastructure/auto/$1',
    '^@auto$': '<rootDir>/infrastructure/auto',
    '^@security/(.*)$': '<rootDir>/infrastructure/security/$1',
    '^@security$': '<rootDir>/infrastructure/security',
    '^@logging/(.*)$': '<rootDir>/infrastructure/logging/$1',
    '^@logging$': '<rootDir>/infrastructure/logging',
    '^@templates/(.*)$': '<rootDir>/infrastructure/templates/$1',
    '^@templates$': '<rootDir>/infrastructure/templates',
    '^@strategies/(.*)$': '<rootDir>/infrastructure/strategies/$1',
    '^@strategies$': '<rootDir>/infrastructure/strategies',
    '^@controllers/(.*)$': '<rootDir>/presentation/api/controllers/$1',
    '^@controllers$': '<rootDir>/presentation/api/controllers',
    '^@websocket/(.*)$': '<rootDir>/presentation/websocket/$1',
    '^@websocket$': '<rootDir>/presentation/websocket',
    '^@api/(.*)$': '<rootDir>/presentation/api/$1',
    '^@api$': '<rootDir>/presentation/api',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@config$': '<rootDir>/config'
  },
  
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  transformIgnorePatterns: [
    '/node_modules/(?!(uuid|fs-extra|glob|chai|sinon|mocha|@babel|babel)/)'
  ],
  
  testTimeout: 30000,
  clearMocks: true,
  restoreMocks: true,
  resetModules: true,
  forceExit: true,
  detectOpenHandles: false,
  
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