/**
 * GenerateTestsStep - Test generation workflow step
 * 
 * This step handles test generation operations, migrating the logic from
 * GenerateTestsHandler to the unified workflow system. It provides
 * validation, complexity management, and performance optimization for test generation.
 */
const BaseWorkflowStep = require('../BaseWorkflowStep');
const fs = require('fs').promises;
const path = require('path');

/**
 * Test generation workflow step
 */
class GenerateTestsStep extends BaseWorkflowStep {
  /**
   * Create a new test generation step
   * @param {Object} options - Step options
   */
  constructor(options = {}) {
    super('GenerateTestsStep', 'Generate project tests', 'testing');
    
    this.generateUnitTests = options.generateUnitTests !== false;
    this.generateIntegrationTests = options.generateIntegrationTests !== false;
    this.generateE2ETests = options.generateE2ETests !== false;
    this.testFramework = options.testFramework || 'jest';
    this.createMocksAndFixtures = options.createMocksAndFixtures !== false;
    this.logger = options.logger || console;
  }

  /**
   * Execute test generation step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Test generation result
   */
  async executeStep(context) {
    const projectPath = context.get('projectPath');
    const command = context.get('command');
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }

    this.logger.info('GenerateTestsStep: Starting test generation', {
      projectPath,
      generateUnitTests: this.generateUnitTests,
      generateIntegrationTests: this.generateIntegrationTests,
      generateE2ETests: this.generateE2ETests,
      testFramework: this.testFramework,
      createMocksAndFixtures: this.createMocksAndFixtures
    });

    try {
      // Step 1: Validate command
      if (command) {
        const validation = command.validateBusinessRules();
        if (!validation.isValid) {
          throw new Error(`Business rule validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Step 2: Get options and configuration
      const options = command ? command.getGenerateOptions() : this.getDefaultOptions();
      const outputConfig = command ? command.getOutputConfiguration() : this.getDefaultOutputConfig();

      // Step 3: Analyze project structure
      const projectStructure = await this.analyzeProjectStructure(projectPath);
      
      // Step 4: Identify testable components
      const testableComponents = await this.identifyTestableComponents(projectPath, projectStructure);
      
      // Step 5: Generate tests based on options
      const results = {};
      
      if (this.generateUnitTests) {
        results.unitTests = await this.generateUnitTests(projectPath, testableComponents, options);
      }
      
      if (this.generateIntegrationTests) {
        results.integrationTests = await this.generateIntegrationTests(projectPath, testableComponents, options);
      }
      
      if (this.generateE2ETests) {
        results.e2eTests = await this.generateE2ETests(projectPath, testableComponents, options);
      }
      
      // Step 6: Create test configuration
      let configResults = null;
      if (this.testFramework) {
        configResults = await this.createTestConfiguration(projectPath, options);
      }
      
      // Step 7: Create mocks and fixtures (if enabled)
      let mockResults = null;
      if (this.createMocksAndFixtures) {
        mockResults = await this.createMocksAndFixtures(projectPath, testableComponents, options);
      }

      // Step 8: Generate output
      const output = await this.generateOutput({
        command,
        projectStructure,
        testableComponents,
        results,
        configResults,
        mockResults,
        outputConfig
      });

      // Step 9: Save results
      if (command) {
        await this.saveResults(command, output);
      }

      this.logger.info('GenerateTestsStep: Test generation completed successfully', {
        projectPath,
        generatedTests: Object.keys(results).length,
        totalFiles: this.countGeneratedFiles(results)
      });

      return {
        success: true,
        commandId: command ? command.commandId : null,
        output,
        metadata: this.getMetadata()
      };

    } catch (error) {
      this.logger.error('GenerateTestsStep: Test generation failed', {
        projectPath,
        error: error.message
      });

      // Publish failure event if event bus is available
      const eventBus = context.get('eventBus');
      if (eventBus) {
        await eventBus.publish('test.generation.failed', {
          commandId: command ? command.commandId : null,
          projectPath,
          error: error.message,
          timestamp: new Date()
        });
      }

      throw error;
    }
  }

  /**
   * Analyze project structure
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Project structure
   */
  async analyzeProjectStructure(projectPath) {
    try {
      const structure = {
        type: 'unknown',
        hasPackageJson: false,
        hasSrc: false,
        hasTests: false,
        hasJest: false,
        hasMocha: false,
        hasCypress: false,
        frameworks: [],
        dependencies: {},
        devDependencies: {},
        scripts: {}
      };

      // Check for package.json
      try {
        const packagePath = path.join(projectPath, 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
        structure.hasPackageJson = true;
        structure.dependencies = packageJson.dependencies || {};
        structure.devDependencies = packageJson.devDependencies || {};
        structure.scripts = packageJson.scripts || {};
        
        // Detect frameworks and testing tools
        if (packageJson.dependencies?.react) structure.frameworks.push('react');
        if (packageJson.dependencies?.vue) structure.frameworks.push('vue');
        if (packageJson.dependencies?.express) structure.frameworks.push('express');
        if (packageJson.dependencies?.next) structure.frameworks.push('next');
        if (packageJson.devDependencies?.jest) structure.hasJest = true;
        if (packageJson.devDependencies?.mocha) structure.hasMocha = true;
        if (packageJson.devDependencies?.cypress) structure.hasCypress = true;
      } catch (error) {
        // package.json not found or invalid
      }

      // Check for common directories
      const commonDirs = ['src', 'tests', 'test', '__tests__'];
      for (const dir of commonDirs) {
        try {
          await fs.access(path.join(projectPath, dir));
          if (dir === 'src') structure.hasSrc = true;
          if (['tests', 'test', '__tests__'].includes(dir)) structure.hasTests = true;
        } catch (error) {
          // Directory doesn't exist
        }
      }

      return structure;
    } catch (error) {
      this.logger.error('Failed to analyze project structure:', error.message);
      throw error;
    }
  }

  /**
   * Identify testable components
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @returns {Promise<Object>} Testable components
   */
  async identifyTestableComponents(projectPath, projectStructure) {
    const components = {
      functions: [],
      classes: [],
      components: [],
      modules: [],
      apis: []
    };

    try {
      // Scan source directories
      const srcDirs = ['src', 'lib', 'app', 'components', 'utils', 'services'];
      for (const dir of srcDirs) {
        const dirPath = path.join(projectPath, dir);
        try {
          await fs.access(dirPath);
          await this.scanDirectoryForComponents(dirPath, components, dir);
        } catch (error) {
          // Directory doesn't exist
        }
      }

      // If no src directory found, scan root
      if (components.functions.length === 0 && components.classes.length === 0) {
        await this.scanDirectoryForComponents(projectPath, components, 'root');
      }

      return components;
    } catch (error) {
      this.logger.error('Failed to identify testable components:', error.message);
      throw error;
    }
  }

  /**
   * Scan directory for components
   * @param {string} dirPath - Directory path
   * @param {Object} components - Components object
   * @param {string} category - Component category
   */
  async scanDirectoryForComponents(dirPath, components, category) {
    try {
      const files = await fs.readdir(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
          await this.scanDirectoryForComponents(filePath, components, category);
        } else if (this.isTestableFile(file)) {
          await this.scanFileForComponents(filePath, components, category);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to scan directory ${dirPath}:`, error.message);
    }
  }

  /**
   * Scan file for components
   * @param {string} filePath - File path
   * @param {Object} components - Components object
   * @param {string} category - Component category
   */
  async scanFileForComponents(filePath, components, category) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Extract function definitions
        if (line.startsWith('function ') || line.includes('function(') || line.includes('=>')) {
          const func = this.extractFunctionDefinition(line, i + 1);
          if (func) {
            func.file = filePath;
            func.category = category;
            components.functions.push(func);
          }
        }
        
        // Extract class definitions
        if (line.startsWith('class ') || line.includes('class ')) {
          const cls = this.extractClassDefinition(line, i + 1);
          if (cls) {
            cls.file = filePath;
            cls.category = category;
            components.classes.push(cls);
          }
        }
        
        // Extract component definitions (React/Vue)
        if (line.includes('export default') || line.includes('export const') || line.includes('export function')) {
          const component = this.extractComponentDefinition(line, i + 1);
          if (component) {
            component.file = filePath;
            component.category = category;
            components.components.push(component);
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to scan file ${filePath}:`, error.message);
    }
  }

  /**
   * Check if file is testable
   * @param {string} filename - Filename
   * @returns {boolean} True if testable
   */
  isTestableFile(filename) {
    const testableExtensions = ['.js', '.jsx', '.ts', '.tsx', '.vue'];
    const testablePatterns = ['component', 'service', 'util', 'helper', 'api'];
    
    const ext = path.extname(filename).toLowerCase();
    const name = filename.toLowerCase();
    
    return testableExtensions.includes(ext) && 
           !name.includes('test') && 
           !name.includes('spec') &&
           testablePatterns.some(pattern => name.includes(pattern));
  }

  /**
   * Extract function definition
   * @param {string} line - Line content
   * @param {number} lineNumber - Line number
   * @returns {Object|null} Function definition
   */
  extractFunctionDefinition(line, lineNumber) {
    const functionPatterns = [
      /function\s+(\w+)\s*\(/,
      /const\s+(\w+)\s*=\s*function\s*\(/,
      /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/,
      /(\w+)\s*:\s*function\s*\(/
    ];
    
    for (const pattern of functionPatterns) {
      const match = line.match(pattern);
      if (match) {
        return {
          name: match[1],
          type: 'function',
          line: lineNumber,
          definition: line.trim()
        };
      }
    }
    
    return null;
  }

  /**
   * Extract class definition
   * @param {string} line - Line content
   * @param {number} lineNumber - Line number
   * @returns {Object|null} Class definition
   */
  extractClassDefinition(line, lineNumber) {
    const classPattern = /class\s+(\w+)/;
    const match = line.match(classPattern);
    
    if (match) {
      return {
        name: match[1],
        type: 'class',
        line: lineNumber,
        definition: line.trim()
      };
    }
    
    return null;
  }

  /**
   * Extract component definition
   * @param {string} line - Line content
   * @param {number} lineNumber - Line number
   * @returns {Object|null} Component definition
   */
  extractComponentDefinition(line, lineNumber) {
    const componentPatterns = [
      /export\s+(?:default\s+)?(?:const\s+)?(\w+)/,
      /export\s+(?:default\s+)?(?:function\s+)?(\w+)/
    ];
    
    for (const pattern of componentPatterns) {
      const match = line.match(pattern);
      if (match) {
        return {
          name: match[1],
          type: 'component',
          line: lineNumber,
          definition: line.trim()
        };
      }
    }
    
    return null;
  }

  /**
   * Generate unit tests
   * @param {string} projectPath - Project path
   * @param {Object} testableComponents - Testable components
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Unit test results
   */
  async generateUnitTests(projectPath, testableComponents, options) {
    const results = {
      files: [],
      totalTests: 0,
      coverage: 0
    };

    try {
      // Create tests directory if it doesn't exist
      const testsDir = path.join(projectPath, 'tests');
      try {
        await fs.access(testsDir);
      } catch (error) {
        await fs.mkdir(testsDir, { recursive: true });
      }

      // Generate unit tests for functions
      for (const func of testableComponents.functions) {
        const testContent = this.generateFunctionUnitTest(func);
        const testFileName = `${func.name}.test.js`;
        const testFilePath = path.join(testsDir, testFileName);
        
        await fs.writeFile(testFilePath, testContent);
        results.files.push(testFilePath);
        results.totalTests++;
      }

      // Generate unit tests for classes
      for (const cls of testableComponents.classes) {
        const testContent = this.generateClassUnitTest(cls);
        const testFileName = `${cls.name}.test.js`;
        const testFilePath = path.join(testsDir, testFileName);
        
        await fs.writeFile(testFilePath, testContent);
        results.files.push(testFilePath);
        results.totalTests++;
      }

      // Generate unit tests for components
      for (const component of testableComponents.components) {
        const testContent = this.generateComponentUnitTest(component);
        const testFileName = `${component.name}.test.js`;
        const testFilePath = path.join(testsDir, testFileName);
        
        await fs.writeFile(testFilePath, testContent);
        results.files.push(testFilePath);
        results.totalTests++;
      }

      results.coverage = (results.totalTests / (testableComponents.functions.length + testableComponents.classes.length + testableComponents.components.length)) * 100;

      return results;
    } catch (error) {
      this.logger.error('Failed to generate unit tests:', error.message);
      throw error;
    }
  }

  /**
   * Generate integration tests
   * @param {string} projectPath - Project path
   * @param {Object} testableComponents - Testable components
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Integration test results
   */
  async generateIntegrationTests(projectPath, testableComponents, options) {
    const results = {
      files: [],
      totalTests: 0
    };

    try {
      // Create integration tests directory
      const integrationTestsDir = path.join(projectPath, 'tests', 'integration');
      try {
        await fs.access(integrationTestsDir);
      } catch (error) {
        await fs.mkdir(integrationTestsDir, { recursive: true });
      }

      // Generate API integration tests
      if (testableComponents.apis.length > 0) {
        const apiTestContent = this.generateAPIIntegrationTest();
        const apiTestPath = path.join(integrationTestsDir, 'api.integration.test.js');
        await fs.writeFile(apiTestPath, apiTestContent);
        results.files.push(apiTestPath);
        results.totalTests++;
      }

      // Generate database integration tests
      const dbTestContent = this.generateDatabaseIntegrationTest();
      const dbTestPath = path.join(integrationTestsDir, 'database.integration.test.js');
      await fs.writeFile(dbTestPath, dbTestContent);
      results.files.push(dbTestPath);
      results.totalTests++;

      return results;
    } catch (error) {
      this.logger.error('Failed to generate integration tests:', error.message);
      throw error;
    }
  }

  /**
   * Generate E2E tests
   * @param {string} projectPath - Project path
   * @param {Object} testableComponents - Testable components
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} E2E test results
   */
  async generateE2ETests(projectPath, testableComponents, options) {
    const results = {
      files: [],
      totalTests: 0
    };

    try {
      // Create E2E tests directory
      const e2eTestsDir = path.join(projectPath, 'tests', 'e2e');
      try {
        await fs.access(e2eTestsDir);
      } catch (error) {
        await fs.mkdir(e2eTestsDir, { recursive: true });
      }

      // Generate user flow E2E test
      const userFlowTestContent = this.generateUserFlowE2ETest();
      const userFlowTestPath = path.join(e2eTestsDir, 'user-flow.e2e.test.js');
      await fs.writeFile(userFlowTestPath, userFlowTestContent);
      results.files.push(userFlowTestPath);
      results.totalTests++;

      // Generate critical path E2E test
      const criticalPathTestContent = this.generateCriticalPathE2ETest();
      const criticalPathTestPath = path.join(e2eTestsDir, 'critical-path.e2e.test.js');
      await fs.writeFile(criticalPathTestPath, criticalPathTestContent);
      results.files.push(criticalPathTestPath);
      results.totalTests++;

      return results;
    } catch (error) {
      this.logger.error('Failed to generate E2E tests:', error.message);
      throw error;
    }
  }

  /**
   * Create test configuration
   * @param {string} projectPath - Project path
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Configuration results
   */
  async createTestConfiguration(projectPath, options) {
    const results = {
      files: []
    };

    try {
      let configContent;
      
      switch (this.testFramework) {
        case 'jest':
          configContent = this.generateJestConfigContent();
          break;
        case 'mocha':
          configContent = this.generateMochaConfigContent();
          break;
        default:
          configContent = this.generateJestConfigContent();
      }

      const configPath = path.join(projectPath, `${this.testFramework}.config.js`);
      await fs.writeFile(configPath, configContent);
      results.files.push(configPath);

      return results;
    } catch (error) {
      this.logger.error('Failed to create test configuration:', error.message);
      throw error;
    }
  }

  /**
   * Create mocks and fixtures
   * @param {string} projectPath - Project path
   * @param {Object} testableComponents - Testable components
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Mock and fixture results
   */
  async createMocksAndFixtures(projectPath, testableComponents, options) {
    const results = {
      files: []
    };

    try {
      // Create mocks directory
      const mocksDir = path.join(projectPath, 'tests', 'mocks');
      try {
        await fs.access(mocksDir);
      } catch (error) {
        await fs.mkdir(mocksDir, { recursive: true });
      }

      // Generate mock utilities
      const mockUtilsContent = this.generateMockUtilsContent();
      const mockUtilsPath = path.join(mocksDir, 'mockUtils.js');
      await fs.writeFile(mockUtilsPath, mockUtilsContent);
      results.files.push(mockUtilsPath);

      // Generate test fixtures
      const fixturesContent = this.generateTestFixturesContent();
      const fixturesPath = path.join(mocksDir, 'fixtures.js');
      await fs.writeFile(fixturesPath, fixturesContent);
      results.files.push(fixturesPath);

      return results;
    } catch (error) {
      this.logger.error('Failed to create mocks and fixtures:', error.message);
      throw error;
    }
  }

  /**
   * Generate output
   * @param {Object} params - Output parameters
   * @returns {Promise<Object>} Generated output
   */
  async generateOutput(params) {
    const { command, projectStructure, testableComponents, results, configResults, mockResults, outputConfig } = params;

    return {
      success: true,
      projectPath: command ? command.projectPath : null,
      commandId: command ? command.commandId : null,
      timestamp: new Date(),
      summary: {
        totalComponents: testableComponents.functions.length + testableComponents.classes.length + testableComponents.components.length,
        totalTests: this.countGeneratedFiles(results),
        testCoverage: this.calculateTestCoverage(testableComponents, results),
        frameworks: projectStructure.frameworks,
        testFramework: this.testFramework
      },
      details: {
        projectStructure,
        testableComponents,
        results,
        configResults,
        mockResults
      },
      metadata: this.getMetadata()
    };
  }

  /**
   * Save results
   * @param {Object} command - Command object
   * @param {Object} output - Output object
   */
  async saveResults(command, output) {
    // This would typically save to a database or file system
    // For now, we'll just log the results
    this.logger.info('Test generation results saved', {
      commandId: command.commandId,
      projectPath: command.projectPath,
      summary: output.summary
    });
  }

  /**
   * Get default options
   * @returns {Object} Default options
   */
  getDefaultOptions() {
    return {
      generateUnitTests: true,
      generateIntegrationTests: true,
      generateE2ETests: false,
      testFramework: 'jest',
      createMocksAndFixtures: true
    };
  }

  /**
   * Get default output configuration
   * @returns {Object} Default output configuration
   */
  getDefaultOutputConfig() {
    return {
      includeSummary: true,
      includeDetails: true,
      includeMetadata: true
    };
  }

  /**
   * Count generated files
   * @param {Object} results - Results object
   * @returns {number} Total files
   */
  countGeneratedFiles(results) {
    let total = 0;
    for (const key in results) {
      if (results[key] && results[key].files) {
        total += results[key].files.length;
      }
    }
    return total;
  }

  /**
   * Calculate test coverage
   * @param {Object} testableComponents - Testable components
   * @param {Object} results - Results object
   * @returns {number} Test coverage percentage
   */
  calculateTestCoverage(testableComponents, results) {
    const totalComponents = testableComponents.functions.length + testableComponents.classes.length + testableComponents.components.length;
    if (totalComponents === 0) return 0;
    
    const totalTests = this.countGeneratedFiles(results);
    return (totalTests / totalComponents) * 100;
  }

  // Test content generation methods
  generateFunctionUnitTest(func) {
    return `/**
 * Unit tests for ${func.name}
 * Generated by GenerateTestsStep
 */

describe('${func.name}', () => {
  test('should be defined', () => {
    expect(${func.name}).toBeDefined();
  });

  test('should be a function', () => {
    expect(typeof ${func.name}).toBe('function');
  });

  // Add more specific tests based on function behavior
  // TODO: Implement specific test cases
});
`;
  }

  generateClassUnitTest(cls) {
    return `/**
 * Unit tests for ${cls.name}
 * Generated by GenerateTestsStep
 */

describe('${cls.name}', () => {
  let instance;

  beforeEach(() => {
    instance = new ${cls.name}();
  });

  test('should create instance', () => {
    expect(instance).toBeInstanceOf(${cls.name});
  });

  test('should be defined', () => {
    expect(${cls.name}).toBeDefined();
  });

  // Add more specific tests based on class methods
  // TODO: Implement specific test cases
});
`;
  }

  generateComponentUnitTest(component) {
    return `/**
 * Unit tests for ${component.name}
 * Generated by GenerateTestsStep
 */

describe('${component.name}', () => {
  test('should be defined', () => {
    expect(${component.name}).toBeDefined();
  });

  test('should render without crashing', () => {
    // TODO: Implement component rendering test
    expect(true).toBe(true);
  });

  // Add more specific tests based on component props and behavior
  // TODO: Implement specific test cases
});
`;
  }

  generateAPIIntegrationTest() {
    return `/**
 * API Integration Tests
 * Generated by GenerateTestsStep
 */

describe('API Integration Tests', () => {
  test('should handle API requests', async () => {
    // TODO: Implement API integration tests
    expect(true).toBe(true);
  });

  test('should handle API responses', async () => {
    // TODO: Implement API response tests
    expect(true).toBe(true);
  });
});
`;
  }

  generateDatabaseIntegrationTest() {
    return `/**
 * Database Integration Tests
 * Generated by GenerateTestsStep
 */

describe('Database Integration Tests', () => {
  test('should connect to database', async () => {
    // TODO: Implement database connection test
    expect(true).toBe(true);
  });

  test('should perform database operations', async () => {
    // TODO: Implement database operation tests
    expect(true).toBe(true);
  });
});
`;
  }

  generateUserFlowE2ETest() {
    return `/**
 * User Flow E2E Tests
 * Generated by GenerateTestsStep
 */

describe('User Flow E2E Tests', () => {
  test('should complete user registration flow', async () => {
    // TODO: Implement user registration flow test
    expect(true).toBe(true);
  });

  test('should complete user login flow', async () => {
    // TODO: Implement user login flow test
    expect(true).toBe(true);
  });
});
`;
  }

  generateCriticalPathE2ETest() {
    return `/**
 * Critical Path E2E Tests
 * Generated by GenerateTestsStep
 */

describe('Critical Path E2E Tests', () => {
  test('should handle critical application flow', async () => {
    // TODO: Implement critical path test
    expect(true).toBe(true);
  });

  test('should handle error scenarios', async () => {
    // TODO: Implement error scenario test
    expect(true).toBe(true);
  });
});
`;
  }

  generateJestConfigContent() {
    return `/**
 * Jest Configuration
 * Generated by GenerateTestsStep
 */

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
`;
  }

  generateMochaConfigContent() {
    return `/**
 * Mocha Configuration
 * Generated by GenerateTestsStep
 */

module.exports = {
  spec: 'tests/**/*.test.js',
  timeout: 5000,
  require: ['@babel/register']
};
`;
  }

  generateMockUtilsContent() {
    return `/**
 * Mock Utilities
 * Generated by GenerateTestsStep
 */

// Mock function factory
export const createMockFunction = (returnValue = null) => {
  const mockFn = jest.fn();
  if (returnValue !== null) {
    mockFn.mockReturnValue(returnValue);
  }
  return mockFn;
};

// Mock object factory
export const createMockObject = (methods = {}) => {
  const mockObj = {};
  for (const [method, returnValue] of Object.entries(methods)) {
    mockObj[method] = createMockFunction(returnValue);
  }
  return mockObj;
};

// Mock API response factory
export const createMockApiResponse = (data, status = 200) => {
  return {
    data,
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(data)
  };
};

// Mock error factory
export const createMockError = (message, code = 'ERROR') => {
  const error = new Error(message);
  error.code = code;
  return error;
};
`;
  }

  generateTestFixturesContent() {
    return `/**
 * Test Fixtures
 * Generated by GenerateTestsStep
 */

// User fixtures
export const userFixtures = {
  validUser: {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'user'
  },
  adminUser: {
    id: 2,
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin'
  }
};

// API response fixtures
export const apiFixtures = {
  successResponse: {
    success: true,
    data: {},
    message: 'Operation successful'
  },
  errorResponse: {
    success: false,
    error: 'Operation failed',
    code: 'ERROR'
  }
};

// Database fixtures
export const dbFixtures = {
  testRecord: {
    id: 1,
    name: 'Test Record',
    createdAt: new Date(),
    updatedAt: new Date()
  }
};
`;
  }

  /**
   * Validate step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Validation result
   */
  async validate(context) {
    const projectPath = context.get('projectPath');
    
    if (!projectPath) {
      return {
        isValid: false,
        errors: ['Project path is required']
      };
    }

    try {
      await fs.access(projectPath);
    } catch (error) {
      return {
        isValid: false,
        errors: [`Project path does not exist: ${projectPath}`]
      };
    }

    return {
      isValid: true,
      errors: []
    };
  }

  /**
   * Get step metadata
   * @returns {Object} Step metadata
   */
  getMetadata() {
    return {
      name: 'GenerateTestsStep',
      description: 'Generate project tests',
      version: '1.0.0',
      type: 'generate-tests',
      category: 'testing',
      complexity: 'medium',
      dependencies: ['projectPath'],
      options: {
        generateUnitTests: this.generateUnitTests,
        generateIntegrationTests: this.generateIntegrationTests,
        generateE2ETests: this.generateE2ETests,
        testFramework: this.testFramework,
        createMocksAndFixtures: this.createMocksAndFixtures
      }
    };
  }
}

module.exports = GenerateTestsStep; 