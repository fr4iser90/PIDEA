module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '**/tests/**/*.js',
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**',
    '!**/scripts/**',
    '!**/cli/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(chalk|ora|inquirer|cli-table3|commander)/)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@domain/(.*)$': '<rootDir>/domain/$1',
    '^@/domain/(.*)$': '<rootDir>/domain/$1',
    '^@application/(.*)$': '<rootDir>/application/$1',
    '^@/application/(.*)$': '<rootDir>/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/infrastructure/$1',
    '^@/infrastructure/(.*)$': '<rootDir>/infrastructure/$1',
    '^@presentation/(.*)$': '<rootDir>/presentation/$1',
    '^@/presentation/(.*)$': '<rootDir>/presentation/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@/tests/(.*)$': '<rootDir>/tests/$1',
    '^@cli/(.*)$': '<rootDir>/cli/$1',
    '^@/cli/(.*)$': '<rootDir>/cli/$1',
    '^@scripts/(.*)$': '<rootDir>/scripts/$1',
    '^@/scripts/(.*)$': '<rootDir>/scripts/$1'
  },
  testPathIgnorePatterns: ['/setup.js$', '/jest.config.js$'],
  testTimeout: 30000,
  verbose: true
}; 