module.exports = {
  testEnvironment: 'node',
  
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '/build/'
  ],
  
  collectCoverage: true,
  collectCoverageFrom: [
    'presentation/api/ContentLibraryController.js'
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary'],
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/domain/(.*)$': '<rootDir>/domain/$1',
    '^@/application/(.*)$': '<rootDir>/application/$1',
    '^@/infrastructure/(.*)$': '<rootDir>/infrastructure/$1',
    '^@/presentation/(.*)$': '<rootDir>/presentation/$1'
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
  
  // No custom reporters
  reporters: ['default']
}; 