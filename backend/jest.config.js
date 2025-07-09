module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/__tests__/**/*.js'
  ],
  
  // Ignore patterns
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
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/.git/**',
    '!**/uploads/**',
    '!**/output/**',
    '!**/generated/**',
    '!**/tests/**',
    '!**/__tests__/**',
    '!**/*.test.js',
    '!**/*.spec.js',
    '!**/jest.config.js',
    '!**/setup.js',
    '!**/scripts/**',
    '!**/migrations/**',
    '!**/seeders/**'
  ],
  
  // Coverage thresholds - 90%+ requirement
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Specific thresholds for different areas
    './domain/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './application/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './infrastructure/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './presentation/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'json',
    'json-summary',
    'lcov',
    'cobertura'
  ],
  
  // Coverage directory
  coverageDirectory: 'coverage',
  
  // Coverage provider
  coverageProvider: 'v8',
  
  // Test timeout
  testTimeout: 30000,
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],
  
  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/domain/(.*)$': '<rootDir>/domain/$1',
    '^@/application/(.*)$': '<rootDir>/application/$1',
    '^@/infrastructure/(.*)$': '<rootDir>/infrastructure/$1',
    '^@/presentation/(.*)$': '<rootDir>/presentation/$1',
    '^@/cli/(.*)$': '<rootDir>/cli/$1',
    '^@/scripts/(.*)$': '<rootDir>/scripts/$1',
    '^@/tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    '/node_modules/(?!(uuid|fs-extra|glob)/)'
  ],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks between tests
  restoreMocks: true,
  
  // Reset modules between tests
  resetModules: true,
  
  // Verbose output
  verbose: true,
  
  // Force exit after tests
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Run tests in band for better coverage accuracy
  runInBand: true,
  
  // Maximum workers
  maxWorkers: '50%',
  
  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Test results processor
  testResultsProcessor: '<rootDir>/tests/reporters/test-management-reporter.js',
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Notify mode
  notify: true,
  
  // Notify mode configuration
  notifyMode: 'always',
  
  // Coverage path ignore patterns
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '/build/',
    '/.git/',
    '/uploads/',
    '/output/',
    '/generated/',
    '/tests/',
    '/__tests__/',
    '/scripts/',
    '/migrations/',
    '/seeders/',
    '/docs/',
    '/content-library/',
    '/frontend/',
    '/database/',
    '/docker-compose.yml',
    '/package.json',
    '/package-lock.json',
    '/README.md',
    '/LICENSE',
    '/.gitignore',
    '/.eslintrc.js',
    '/.prettierrc',
    '/jest.config.js',
    '/setup.js',
    '/babel.config.js',
    '/webpack.config.js',
    '/vite.config.js',
    '/rollup.config.js',
    '/tsconfig.json',
    '/.env',
    '/.env.example',
    '/.env.local',
    '/.env.development',
    '/.env.test',
    '/.env.production'
  ],
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost'
  },
  
  // Global setup and teardown
  globalSetup: '<rootDir>/tests/global-setup.js',
  globalTeardown: '<rootDir>/tests/global-teardown.js',
  
  // Projects for different test types
  projects: [
    {
      displayName: 'unit',
      testMatch: [
        '<rootDir>/tests/unit/**/*.test.js'
      ],
      coverageThreshold: {
        global: {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        }
      }
    },
    {
      displayName: 'integration',
      testMatch: [
        '<rootDir>/tests/integration/**/*.test.js'
      ],
      coverageThreshold: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      }
    },
    {
      displayName: 'e2e',
      testMatch: [
        '<rootDir>/tests/e2e/**/*.test.js'
      ],
      coverageThreshold: {
        global: {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75
        }
      }
    },
    {
      displayName: 'performance',
      testMatch: [
        '<rootDir>/tests/performance/**/*.test.js'
      ],
      coverageThreshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    {
      displayName: 'security',
      testMatch: [
        '<rootDir>/tests/security/**/*.test.js'
      ],
      coverageThreshold: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    }
  ],
  
  // Coverage collection options
  coverageCollector: {
    // Collect coverage from all files, not just tested ones
    collectCoverageFrom: [
      '**/*.js',
      '!**/node_modules/**',
      '!**/coverage/**',
      '!**/dist/**',
      '!**/build/**',
      '!**/.git/**',
      '!**/uploads/**',
      '!**/output/**',
      '!**/generated/**',
      '!**/tests/**',
      '!**/__tests__/**',
      '!**/*.test.js',
      '!**/*.spec.js'
    ]
  },
  
  // Test retry configuration
  retryTimes: 2,
  
  // Bail on first failure (useful for CI)
  bail: process.env.CI ? 1 : 0,
  
  // Fail fast
  failFast: process.env.CI ? true : false,
  
  // Test location in results
  testLocationInResults: true,
  
  // Update snapshots
  updateSnapshot: process.env.UPDATE_SNAPSHOTS === 'true',
  
  // Snapshot serializers
  snapshotSerializers: [
    'jest-serializer-path'
  ],
  
  // Test sequencer
  testSequencer: '<rootDir>/tests/test-sequencer.js',
  
  // Worker idle memory limit
  workerIdleMemoryLimit: '512MB',
  
  // Max concurrency
  maxConcurrency: 5,
  
  // Randomize test order
  randomize: false,
  
  // Seed for randomization
  seed: process.env.JEST_SEED || Date.now(),
  
  // Silent mode
  silent: process.env.JEST_SILENT === 'true',
  
  // Use fake timers
  timers: 'modern',
  
  // Unmocked module path patterns
  unmockedModulePathPatterns: [
    '<rootDir>/node_modules/'
  ],
  
  // Module file extensions
  moduleFileExtensions: [
    'js',
    'json',
    'jsx',
    'ts',
    'tsx',
    'node'
  ],
  
  // Module directories
  moduleDirectories: [
    'node_modules',
    '<rootDir>'
  ],
  
  // Module paths
  modulePaths: [
    '<rootDir>'
  ],
  
  // Roots
  roots: [
    '<rootDir>'
  ],
  
  // Test path ignore patterns
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
  
  // Test regex
  testRegex: [
    '(/__tests__/.*|(\\.|/)(test|spec))\\.js$'
  ],
  
  // Test URL
  testURL: 'http://localhost',
  
  // Timestamp
  timers: 'modern',
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    '/node_modules/(?!(uuid|fs-extra|glob)/)'
  ],
  
  // Unmocked module path patterns
  unmockedModulePathPatterns: [
    '<rootDir>/node_modules/'
  ],
  
  // Verbose
  verbose: true,
  
  // Watch path ignore patterns
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '/build/',
    '/.git/',
    '/uploads/',
    '/output/',
    '/generated/',
    '/.jest-cache/'
  ]
}; 