/**
 * TestsGenerationStep - Test generation workflow step
 * 
 * This step handles test generation operations, migrating the logic from
 * GenerateTestsHandler to the unified workflow system. It provides
 * validation, complexity management, and performance optimization for test generation.
 */
const { DocumentationStep } = require('./DocumentationStep');
const fs = require('fs').promises;
const path = require('path');

/**
 * Test generation workflow step
 */
class TestsGenerationStep extends DocumentationStep {
  /**
   * Create a new test generation step
   * @param {Object} options - Step options
   */
  constructor(options = {}) {
    super('generate-tests', {
      name: 'tests_generation',
      description: 'Generate project tests',
      version: '1.0.0',
      ...options
    });
    
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

    this.logger.info('TestsGenerationStep: Starting test generation', {
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

      this.logger.info('TestsGenerationStep: Test generation completed successfully', {
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
      this.logger.error('TestsGenerationStep: Test generation failed', {
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
          structure[`has${dir.charAt(0).toUpperCase() + dir.slice(1)}`] = true;
        } catch (error) {
          // Directory doesn't exist
        }
      }

      // Determine project type
      if (structure.frameworks.includes('react') || structure.frameworks.includes('vue')) {
        structure.type = 'frontend';
      } else if (structure.frameworks.includes('express')) {
        structure.type = 'backend';
      } else if (structure.frameworks.includes('next')) {
        structure.type = 'fullstack';
      } else {
        structure.type = 'generic';
      }

      return structure;
    } catch (error) {
      this.logger.warn('TestsGenerationStep: Failed to analyze project structure', {
        projectPath,
        error: error.message
      });
      return { type: 'unknown', frameworks: [], dependencies: {}, devDependencies: {}, scripts: {} };
    }
  }

  /**
   * Identify testable components
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @returns {Promise<Object>} Testable components
   */
  async identifyTestableComponents(projectPath, projectStructure) {
    this.logger.info('TestsGenerationStep: Identifying testable components...');
    
    const components = {
      functions: [],
      classes: [],
      modules: [],
      components: [],
      services: [],
      utilities: []
    };

    try {
      // Scan source directories
      const sourceDirs = ['src', 'lib', 'app', 'components', 'services', 'utils'];
      
      for (const dir of sourceDirs) {
        const dirPath = path.join(projectPath, dir);
        try {
          await fs.access(dirPath);
          await this.scanDirectoryForComponents(dirPath, components, dir);
        } catch (error) {
          // Directory doesn't exist
        }
      }

      // Scan root files
      const rootFiles = ['index.js', 'index.ts', 'main.js', 'main.ts', 'app.js', 'app.ts'];
      for (const file of rootFiles) {
        const filePath = path.join(projectPath, file);
        try {
          await fs.access(filePath);
          await this.scanFileForComponents(filePath, components, 'root');
        } catch (error) {
          // File doesn't exist
        }
      }

    } catch (error) {
      this.logger.warn('TestsGenerationStep: Failed to identify testable components', {
        projectPath,
        error: error.message
      });
    }

    return components;
  }

  /**
   * Scan directory for components
   * @param {string} dirPath - Directory path
   * @param {Object} components - Components object
   * @param {string} category - Component category
   * @returns {Promise<void>}
   */
  async scanDirectoryForComponents(dirPath, components, category) {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        await this.scanDirectoryForComponents(itemPath, components, category);
      } else if (item.isFile() && this.isTestableFile(item.name)) {
        await this.scanFileForComponents(itemPath, components, category);
      }
    }
  }

  /**
   * Scan file for components
   * @param {string} filePath - File path
   * @param {Object} components - Components object
   * @param {string} category - Component category
   * @returns {Promise<void>}
   */
  async scanFileForComponents(filePath, components, category) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Extract function definitions
        if (line.includes('function ') || line.includes('=>')) {
          const func = this.extractFunctionDefinition(line, i + 1);
          if (func) {
            components.functions.push({
              file: path.relative(process.cwd(), filePath),
              line: i + 1,
              category,
              ...func
            });
          }
        }
        
        // Extract class definitions
        if (line.includes('class ')) {
          const cls = this.extractClassDefinition(line, i + 1);
          if (cls) {
            components.classes.push({
              file: path.relative(process.cwd(), filePath),
              line: i + 1,
              category,
              ...cls
            });
          }
        }
        
        // Extract component definitions (React/Vue)
        if (line.includes('export default') || line.includes('export const')) {
          const component = this.extractComponentDefinition(line, i + 1);
          if (component) {
            components.components.push({
              file: path.relative(process.cwd(), filePath),
              line: i + 1,
              category,
              ...component
            });
          }
        }
      }
    } catch (error) {
      this.logger.warn('TestsGenerationStep: Failed to scan file for components', {
        filePath,
        error: error.message
      });
    }
  }

  /**
   * Check if file is testable
   * @param {string} filename - Filename
   * @returns {boolean} True if testable
   */
  isTestableFile(filename) {
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.vue'];
    return extensions.some(ext => filename.endsWith(ext)) && !filename.includes('.test.') && !filename.includes('.spec.');
  }

  /**
   * Extract function definition
   * @param {string} line - Line content
   * @param {number} lineNumber - Line number
   * @returns {Object|null} Function definition
   */
  extractFunctionDefinition(line, lineNumber) {
    const functionMatch = line.match(/(?:function\s+)?(\w+)\s*\(/);
    if (functionMatch) {
      return {
        name: functionMatch[1],
        type: 'function',
        lineNumber
      };
    }
    
    const arrowMatch = line.match(/(\w+)\s*[:=]\s*\([^)]*\)\s*=>/);
    if (arrowMatch) {
      return {
        name: arrowMatch[1],
        type: 'arrow_function',
        lineNumber
      };
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
    const classMatch = line.match(/class\s+(\w+)/);
    if (classMatch) {
      return {
        name: classMatch[1],
        type: 'class',
        lineNumber
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
    const exportMatch = line.match(/export\s+(?:default\s+)?(?:const\s+)?(\w+)/);
    if (exportMatch) {
      return {
        name: exportMatch[1],
        type: 'component',
        lineNumber
      };
    }
    
    return null;
  }

  /**
   * Generate unit tests
   * @param {string} projectPath - Project path
   * @param {Object} testableComponents - Testable components
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Unit tests result
   */
  async generateUnitTests(projectPath, testableComponents, options) {
    this.logger.info('TestsGenerationStep: Generating unit tests...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      const testsDir = path.join(projectPath, 'tests', 'unit');
      await fs.mkdir(testsDir, { recursive: true });

      // Generate unit tests for functions
      for (const func of testableComponents.functions.slice(0, 10)) { // Limit to first 10
        const unitTest = this.generateFunctionUnitTest(func);
        const testFileName = `${func.name}.test.js`;
        const testFilePath = path.join(testsDir, testFileName);
        await fs.writeFile(testFilePath, unitTest);
        
        results.generated.push({
          type: 'unit_test',
          path: path.relative(projectPath, testFilePath),
          content: unitTest,
          component: func
        });
      }

      // Generate unit tests for classes
      for (const cls of testableComponents.classes.slice(0, 5)) { // Limit to first 5
        const unitTest = this.generateClassUnitTest(cls);
        const testFileName = `${cls.name}.test.js`;
        const testFilePath = path.join(testsDir, testFileName);
        await fs.writeFile(testFilePath, unitTest);
        
        results.generated.push({
          type: 'unit_test',
          path: path.relative(projectPath, testFilePath),
          content: unitTest,
          component: cls
        });
      }

      // Generate unit tests for components
      for (const component of testableComponents.components.slice(0, 5)) { // Limit to first 5
        const unitTest = this.generateComponentUnitTest(component);
        const testFileName = `${component.name}.test.js`;
        const testFilePath = path.join(testsDir, testFileName);
        await fs.writeFile(testFilePath, unitTest);
        
        results.generated.push({
          type: 'unit_test',
          path: path.relative(projectPath, testFilePath),
          content: unitTest,
          component: component
        });
      }
      
    } catch (error) {
      results.errors.push({
        action: 'generate_unit_tests',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Generate integration tests
   * @param {string} projectPath - Project path
   * @param {Object} testableComponents - Testable components
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Integration tests result
   */
  async generateIntegrationTests(projectPath, testableComponents, options) {
    this.logger.info('TestsGenerationStep: Generating integration tests...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      const testsDir = path.join(projectPath, 'tests', 'integration');
      await fs.mkdir(testsDir, { recursive: true });

      // Generate integration test for API endpoints
      const apiIntegrationTest = this.generateAPIIntegrationTest();
      const apiTestPath = path.join(testsDir, 'api.integration.test.js');
      await fs.writeFile(apiTestPath, apiIntegrationTest);
      
      results.generated.push({
        type: 'integration_test',
        path: path.relative(projectPath, apiTestPath),
        content: apiIntegrationTest
      });

      // Generate integration test for database operations
      const dbIntegrationTest = this.generateDatabaseIntegrationTest();
      const dbTestPath = path.join(testsDir, 'database.integration.test.js');
      await fs.writeFile(dbTestPath, dbIntegrationTest);
      
      results.generated.push({
        type: 'integration_test',
        path: path.relative(projectPath, dbTestPath),
        content: dbIntegrationTest
      });
      
    } catch (error) {
      results.errors.push({
        action: 'generate_integration_tests',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Generate E2E tests
   * @param {string} projectPath - Project path
   * @param {Object} testableComponents - Testable components
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} E2E tests result
   */
  async generateE2ETests(projectPath, testableComponents, options) {
    this.logger.info('TestsGenerationStep: Generating E2E tests...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      const testsDir = path.join(projectPath, 'tests', 'e2e');
      await fs.mkdir(testsDir, { recursive: true });

      // Generate E2E test for user flow
      const userFlowTest = this.generateUserFlowE2ETest();
      const userFlowTestPath = path.join(testsDir, 'user-flow.e2e.test.js');
      await fs.writeFile(userFlowTestPath, userFlowTest);
      
      results.generated.push({
        type: 'e2e_test',
        path: path.relative(projectPath, userFlowTestPath),
        content: userFlowTest
      });

      // Generate E2E test for critical path
      const criticalPathTest = this.generateCriticalPathE2ETest();
      const criticalPathTestPath = path.join(testsDir, 'critical-path.e2e.test.js');
      await fs.writeFile(criticalPathTestPath, criticalPathTest);
      
      results.generated.push({
        type: 'e2e_test',
        path: path.relative(projectPath, criticalPathTestPath),
        content: criticalPathTest
      });
      
    } catch (error) {
      results.errors.push({
        action: 'generate_e2e_tests',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Create test configuration
   * @param {string} projectPath - Project path
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Test configuration result
   */
  async createTestConfiguration(projectPath, options) {
    this.logger.info('TestsGenerationStep: Creating test configuration...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      if (this.testFramework === 'jest') {
        const jestConfig = this.generateJestConfigContent();
        const jestConfigPath = path.join(projectPath, 'jest.config.js');
        await fs.writeFile(jestConfigPath, jestConfig);
        
        results.generated.push({
          type: 'jest_config',
          path: path.relative(projectPath, jestConfigPath),
          content: jestConfig
        });
      } else if (this.testFramework === 'mocha') {
        const mochaConfig = this.generateMochaConfigContent();
        const mochaConfigPath = path.join(projectPath, '.mocharc.js');
        await fs.writeFile(mochaConfigPath, mochaConfig);
        
        results.generated.push({
          type: 'mocha_config',
          path: path.relative(projectPath, mochaConfigPath),
          content: mochaConfig
        });
      }
      
    } catch (error) {
      results.errors.push({
        action: 'create_test_configuration',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Create mocks and fixtures
   * @param {string} projectPath - Project path
   * @param {Object} testableComponents - Testable components
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Mocks and fixtures result
   */
  async createMocksAndFixtures(projectPath, testableComponents, options) {
    this.logger.info('TestsGenerationStep: Creating mocks and fixtures...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      const mocksDir = path.join(projectPath, 'tests', 'mocks');
      await fs.mkdir(mocksDir, { recursive: true });

      // Generate mock utilities
      const mockUtils = this.generateMockUtilsContent();
      const mockUtilsPath = path.join(mocksDir, 'mockUtils.js');
      await fs.writeFile(mockUtilsPath, mockUtils);
      
      results.generated.push({
        type: 'mock_utils',
        path: path.relative(projectPath, mockUtilsPath),
        content: mockUtils
      });

      // Generate test fixtures
      const testFixtures = this.generateTestFixturesContent();
      const testFixturesPath = path.join(mocksDir, 'fixtures.js');
      await fs.writeFile(testFixturesPath, testFixtures);
      
      results.generated.push({
        type: 'test_fixtures',
        path: path.relative(projectPath, testFixturesPath),
        content: testFixtures
      });
      
    } catch (error) {
      results.errors.push({
        action: 'create_mocks_and_fixtures',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Generate output
   * @param {Object} params - Output generation parameters
   * @returns {Promise<Object>} Generated output
   */
  async generateOutput(params) {
    const { command, projectStructure, testableComponents, results, configResults, mockResults, outputConfig } = params;
    
    const output = {
      generatedFiles: [],
      metadata: {
        projectType: projectStructure.type,
        frameworks: projectStructure.frameworks,
        testFramework: this.testFramework,
        testableComponents: {
          functions: testableComponents.functions.length,
          classes: testableComponents.classes.length,
          components: testableComponents.components.length
        },
        totalTests: 0,
        successfulTests: 0,
        failedTests: 0
      },
      statistics: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 0
      }
    };

    // Collect generated files
    for (const [testType, testResult] of Object.entries(results)) {
      if (testResult.generated) {
        output.generatedFiles.push(...testResult.generated);
        output.metadata.totalTests += testResult.generated.length;
        output.metadata.successfulTests += testResult.generated.length;
      }
      if (testResult.errors) {
        output.metadata.failedTests += testResult.errors.length;
      }
    }

    // Add configuration results
    if (configResults && configResults.generated) {
      output.generatedFiles.push(...configResults.generated);
      output.metadata.totalTests += configResults.generated.length;
      output.metadata.successfulTests += configResults.generated.length;
    }

    // Add mock results
    if (mockResults && mockResults.generated) {
      output.generatedFiles.push(...mockResults.generated);
      output.metadata.totalTests += mockResults.generated.length;
      output.metadata.successfulTests += mockResults.generated.length;
    }

    // Calculate statistics
    output.statistics.endTime = new Date();
    output.statistics.duration = output.statistics.endTime - output.statistics.startTime;

    return output;
  }

  /**
   * Save results
   * @param {Object} command - Command object
   * @param {Object} output - Generated output
   * @returns {Promise<void>}
   */
  async saveResults(command, output) {
    // This would save results to the database
    // For now, just log the results
    this.logger.info('TestsGenerationStep: Results saved', {
      commandId: command.commandId,
      totalFiles: output.generatedFiles.length,
      successfulTests: output.metadata.successfulTests,
      failedTests: output.metadata.failedTests
    });
  }

  /**
   * Get default options
   * @returns {Object} Default options
   */
  getDefaultOptions() {
    return {
      generateUnitTests: this.generateUnitTests,
      generateIntegrationTests: this.generateIntegrationTests,
      generateE2ETests: this.generateE2ETests,
      testFramework: this.testFramework,
      createMocksAndFixtures: this.createMocksAndFixtures
    };
  }

  /**
   * Get default output configuration
   * @returns {Object} Default output configuration
   */
  getDefaultOutputConfig() {
    return {
      includeMetadata: true,
      includeStatistics: true,
      includeValidation: true
    };
  }

  /**
   * Count generated files
   * @param {Object} results - Generation results
   * @returns {number} Total file count
   */
  countGeneratedFiles(results) {
    let count = 0;
    for (const [testType, testResult] of Object.entries(results)) {
      if (testResult.generated) {
        count += testResult.generated.length;
      }
    }
    return count;
  }

  // Test content generation methods
  generateFunctionUnitTest(func) {
    return `const { ${func.name} } = require('../${func.file.replace('.js', '')}');

describe('${func.name}', () => {
  test('should work correctly', () => {
    // Arrange
    const input = 'test input';
    
    // Act
    const result = ${func.name}(input);
    
    // Assert
    expect(result).toBeDefined();
  });

  test('should handle edge cases', () => {
    // Arrange
    const input = null;
    
    // Act
    const result = ${func.name}(input);
    
    // Assert
    expect(result).toBeDefined();
  });
});`;
  }

  generateClassUnitTest(cls) {
    return `const { ${cls.name} } = require('../${cls.file.replace('.js', '')}');

describe('${cls.name}', () => {
  let instance;

  beforeEach(() => {
    instance = new ${cls.name}();
  });

  test('should instantiate correctly', () => {
    expect(instance).toBeInstanceOf(${cls.name});
  });

  test('should have required methods', () => {
    expect(typeof instance.method).toBe('function');
  });
});`;
  }

  generateComponentUnitTest(component) {
    return `import React from 'react';
import { render, screen } from '@testing-library/react';
import { ${component.name} } from '../${component.file.replace('.js', '')}';

describe('${component.name}', () => {
  test('should render correctly', () => {
    render(<${component.name} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  test('should handle props correctly', () => {
    const testProps = { title: 'Test Title' };
    render(<${component.name} {...testProps} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });
});`;
  }

  generateAPIIntegrationTest() {
    return `const request = require('supertest');
const app = require('../src/app');

describe('API Integration Tests', () => {
  test('GET /api/health should return 200', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });

  test('POST /api/data should create new data', async () => {
    const testData = { name: 'Test', value: 123 };
    const response = await request(app).post('/api/data').send(testData);
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });
});`;
  }

  generateDatabaseIntegrationTest() {
    return `const { connect, disconnect } = require('../src/database');
const { createUser, getUser } = require('../src/services/userService');

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await disconnect();
  });

  test('should create and retrieve user', async () => {
    const userData = { name: 'Test User', email: 'test@example.com' };
    const createdUser = await createUser(userData);
    expect(createdUser).toHaveProperty('id');
    
    const retrievedUser = await getUser(createdUser.id);
    expect(retrievedUser.name).toBe(userData.name);
  });
});`;
  }

  generateUserFlowE2ETest() {
    return `const { test, expect } = require('@playwright/test');

test('user registration and login flow', async ({ page }) => {
  // Navigate to registration page
  await page.goto('/register');
  
  // Fill registration form
  await page.fill('[data-testid="name"]', 'Test User');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="register-button"]');
  
  // Verify registration success
  await expect(page).toHaveURL('/login');
  
  // Login
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="login-button"]');
  
  // Verify login success
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('[data-testid="user-name"]')).toContainText('Test User');
});`;
  }

  generateCriticalPathE2ETest() {
    return `const { test, expect } = require('@playwright/test');

test('critical application functionality', async ({ page }) => {
  // Navigate to main page
  await page.goto('/');
  
  // Verify page loads
  await expect(page).toHaveTitle(/Application/);
  
  // Test main functionality
  await page.click('[data-testid="main-action"]');
  await expect(page.locator('[data-testid="result"]')).toBeVisible();
  
  // Verify data persistence
  await page.reload();
  await expect(page.locator('[data-testid="result"]')).toBeVisible();
});`;
  }

  generateJestConfigContent() {
    return `module.exports = {
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
};`;
  }

  generateMochaConfigContent() {
    return `module.exports = {
  require: ['@babel/register'],
  reporter: 'spec',
  timeout: 5000,
  recursive: true,
  spec: ['tests/**/*.test.js', 'tests/**/*.spec.js']
};`;
  }

  generateMockUtilsContent() {
    return `// Mock utilities for testing

const mockFunction = (returnValue) => {
  return jest.fn().mockReturnValue(returnValue);
};

const mockAsyncFunction = (returnValue) => {
  return jest.fn().mockResolvedValue(returnValue);
};

const mockRejectedFunction = (error) => {
  return jest.fn().mockRejectedValue(error);
};

const createMockRequest = (data = {}) => ({
  body: data.body || {},
  params: data.params || {},
  query: data.query || {},
  headers: data.headers || {},
  ...data
});

const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

module.exports = {
  mockFunction,
  mockAsyncFunction,
  mockRejectedFunction,
  createMockRequest,
  createMockResponse
};`;
  }

  generateTestFixturesContent() {
    return `// Test fixtures for consistent test data

const userFixtures = {
  validUser: {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123'
  },
  invalidUser: {
    name: '',
    email: 'invalid-email',
    password: '123'
  }
};

const dataFixtures = {
  validData: {
    title: 'Test Title',
    content: 'Test content',
    tags: ['test', 'example']
  },
  emptyData: {
    title: '',
    content: '',
    tags: []
  }
};

const apiFixtures = {
  successResponse: {
    success: true,
    data: { id: 1, name: 'Test' },
    message: 'Operation successful'
  },
  errorResponse: {
    success: false,
    error: 'Something went wrong',
    code: 500
  }
};

module.exports = {
  userFixtures,
  dataFixtures,
  apiFixtures
};`;
  }

  /**
   * Validate test generation step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validate(context) {
    const baseValidation = await super.validate(context);
    
    if (!baseValidation.isValid) {
      return baseValidation;
    }

    // Check if project path exists
    const projectPath = context.get('projectPath');
    if (!projectPath) {
      return new ValidationResult(false, ['Project path is required for test generation']);
    }

    // Validate test framework
    const validTestFrameworks = ['jest', 'mocha', 'cypress', 'playwright'];
    if (!validTestFrameworks.includes(this.testFramework)) {
      return new ValidationResult(false, [`Invalid test framework: ${this.testFramework}`]);
    }

    return new ValidationResult(true, []);
  }

  /**
   * Get step metadata
   * @returns {Object} Step metadata
   */
  getMetadata() {
    return {
      name: 'TestsGenerationStep',
      description: 'Generate project tests',
      version: '1.0.0',
      type: 'generate',
      generateUnitTests: this.generateUnitTests,
      generateIntegrationTests: this.generateIntegrationTests,
      generateE2ETests: this.generateE2ETests,
      testFramework: this.testFramework,
      createMocksAndFixtures: this.createMocksAndFixtures,
      dependencies: ['fs', 'path', 'DocumentationStep']
    };
  }
}

module.exports = TestsGenerationStep; 