/**
 * Generate Handler Migration Tests
 * 
 * Tests for the migrated generate handlers to unified workflow steps
 */
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Import the migrated steps
const ScriptsGenerationStep = require('../../../backend/domain/workflows/steps/ScriptsGenerationStep');
const DocumentationGenerationStep = require('../../../backend/domain/workflows/steps/DocumentationGenerationStep');
const ConfigsGenerationStep = require('../../../backend/domain/workflows/steps/ConfigsGenerationStep');
const TestsGenerationStep = require('../../../backend/domain/workflows/steps/TestsGenerationStep');
const ScriptGenerationStep = require('../../../backend/domain/workflows/steps/ScriptGenerationStep');

// Mock workflow context
class MockWorkflowContext {
  constructor(data = {}) {
    this.data = data;
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    this.data[key] = value;
  }
}

// Mock command
class MockCommand {
  constructor(data = {}) {
    this.commandId = data.commandId || 'test-command-id';
    this.projectPath = data.projectPath || '/tmp/test-project';
    this.data = data;
  }

  validateBusinessRules() {
    return { isValid: true, errors: [] };
  }

  getGenerateOptions() {
    return this.data.options || {};
  }

  getOutputConfiguration() {
    return this.data.outputConfig || {};
  }

  getMetadata() {
    return {
      commandId: this.commandId,
      type: 'test-command'
    };
  }
}

describe('Generate Handler Migration Tests', () => {
  let testProjectPath;
  let mockContext;
  let mockCommand;

  beforeAll(async () => {
    // Create temporary test project
    testProjectPath = path.join(os.tmpdir(), `test-project-${Date.now()}`);
    await fs.mkdir(testProjectPath, { recursive: true });

    // Create basic project structure
    await fs.writeFile(path.join(testProjectPath, 'package.json'), JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        react: '^18.0.0',
        express: '^4.18.0'
      },
      devDependencies: {
        jest: '^29.0.0',
        eslint: '^8.0.0'
      },
      scripts: {
        start: 'node index.js',
        test: 'jest'
      }
    }, null, 2));

    // Create source directory
    await fs.mkdir(path.join(testProjectPath, 'src'), { recursive: true });
    await fs.writeFile(path.join(testProjectPath, 'src', 'index.js'), `
function testFunction() {
  return 'Hello, World!';
}

class TestClass {
  constructor() {
    this.name = 'TestClass';
  }
  
  getMessage() {
    return 'Hello from TestClass';
  }
}

module.exports = { testFunction, TestClass };
    `);

    mockContext = new MockWorkflowContext({
      projectPath: testProjectPath,
      eventBus: {
        publish: jest.fn()
      }
    });

    mockCommand = new MockCommand({
      projectPath: testProjectPath,
      options: {
        scriptTypes: ['build', 'deployment'],
        configTypes: ['eslint', 'prettier'],
        generateUnitTests: true,
        scriptType: 'build'
      }
    });
  });

  afterAll(async () => {
    // Clean up test project
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up test project:', error.message);
    }
  });

  describe('ScriptsGenerationStep', () => {
    let scriptsStep;

    beforeEach(() => {
      scriptsStep = new ScriptsGenerationStep({
        scriptTypes: ['build', 'deployment'],
        updatePackageScripts: true,
        validateScripts: true,
        logger: console
      });
    });

    test('should create scripts generation step with correct metadata', () => {
      const metadata = scriptsStep.getMetadata();
      expect(metadata.name).toBe('ScriptsGenerationStep');
      expect(metadata.description).toBe('Generate project scripts');
      expect(metadata.scriptTypes).toEqual(['build', 'deployment']);
      expect(metadata.updatePackageScripts).toBe(true);
      expect(metadata.validateScripts).toBe(true);
    });

    test('should validate step correctly', async () => {
      const validation = await scriptsStep.validate(mockContext);
      expect(validation.isValid).toBe(true);
    });

    test('should generate build scripts', async () => {
      const result = await scriptsStep.executeStep(mockContext);
      
      expect(result.success).toBe(true);
      expect(result.output.generatedFiles).toBeDefined();
      expect(result.output.metadata.totalScripts).toBeGreaterThan(0);
      
      // Check if build script was created
      const buildScriptPath = path.join(testProjectPath, 'scripts', 'build.sh');
      const buildScriptExists = await fs.access(buildScriptPath).then(() => true).catch(() => false);
      expect(buildScriptExists).toBe(true);
    });

    test('should handle errors gracefully', async () => {
      const invalidContext = new MockWorkflowContext({});
      
      await expect(scriptsStep.executeStep(invalidContext)).rejects.toThrow('Project path not found in context');
    });
  });

  describe('DocumentationGenerationStep', () => {
    let docsStep;

    beforeEach(() => {
      docsStep = new DocumentationGenerationStep({
        includeAPI: true,
        includeArchitecture: true,
        includeExamples: true,
        autoGenerate: true,
        logger: console
      });
    });

    test('should create documentation generation step with correct metadata', () => {
      const metadata = docsStep.getMetadata();
      expect(metadata.name).toBe('DocumentationGenerationStep');
      expect(metadata.description).toBe('Generate project documentation');
      expect(metadata.includeAPI).toBe(true);
      expect(metadata.includeArchitecture).toBe(true);
      expect(metadata.includeExamples).toBe(true);
      expect(metadata.autoGenerate).toBe(true);
    });

    test('should validate step correctly', async () => {
      const validation = await docsStep.validate(mockContext);
      expect(validation.isValid).toBe(true);
    });

    test('should generate API documentation', async () => {
      const result = await docsStep.executeStep(mockContext);
      
      expect(result.success).toBe(true);
      expect(result.output.generatedFiles).toBeDefined();
      expect(result.output.metadata.totalDocs).toBeGreaterThan(0);
      
      // Check if API docs were created
      const apiDocsPath = path.join(testProjectPath, 'docs', 'api.md');
      const apiDocsExists = await fs.access(apiDocsPath).then(() => true).catch(() => false);
      expect(apiDocsExists).toBe(true);
    });

    test('should extract code documentation correctly', async () => {
      const codeDoc = await docsStep.extractCodeDocumentation(testProjectPath, {
        type: 'frontend',
        frameworks: ['react']
      });
      
      expect(codeDoc.functions).toBeDefined();
      expect(codeDoc.classes).toBeDefined();
      expect(codeDoc.functions.length).toBeGreaterThan(0);
      expect(codeDoc.classes.length).toBeGreaterThan(0);
    });
  });

  describe('ConfigsGenerationStep', () => {
    let configsStep;

    beforeEach(() => {
      configsStep = new ConfigsGenerationStep({
        configTypes: ['eslint', 'prettier', 'jest'],
        includeScripts: true,
        validateConfigs: true,
        logger: console
      });
    });

    test('should create configs generation step with correct metadata', () => {
      const metadata = configsStep.getMetadata();
      expect(metadata.name).toBe('ConfigsGenerationStep');
      expect(metadata.description).toBe('Generate project configurations');
      expect(metadata.configTypes).toEqual(['eslint', 'prettier', 'jest']);
      expect(metadata.includeScripts).toBe(true);
      expect(metadata.validateConfigs).toBe(true);
    });

    test('should validate step correctly', async () => {
      const validation = await configsStep.validate(mockContext);
      expect(validation.isValid).toBe(true);
    });

    test('should generate ESLint configuration', async () => {
      const result = await configsStep.executeStep(mockContext);
      
      expect(result.success).toBe(true);
      expect(result.output.generatedFiles).toBeDefined();
      expect(result.output.metadata.totalConfigs).toBeGreaterThan(0);
      
      // Check if ESLint config was created
      const eslintConfigPath = path.join(testProjectPath, '.eslintrc.js');
      const eslintConfigExists = await fs.access(eslintConfigPath).then(() => true).catch(() => false);
      expect(eslintConfigExists).toBe(true);
    });

    test('should detect existing configurations', async () => {
      const existingConfigs = await configsStep.detectExistingConfigs(testProjectPath);
      expect(existingConfigs).toBeDefined();
      expect(typeof existingConfigs.eslint).toBe('boolean');
      expect(typeof existingConfigs.prettier).toBe('boolean');
    });
  });

  describe('TestsGenerationStep', () => {
    let testsStep;

    beforeEach(() => {
      testsStep = new TestsGenerationStep({
        generateUnitTests: true,
        generateIntegrationTests: true,
        testFramework: 'jest',
        createMocksAndFixtures: true,
        logger: console
      });
    });

    test('should create tests generation step with correct metadata', () => {
      const metadata = testsStep.getMetadata();
      expect(metadata.name).toBe('TestsGenerationStep');
      expect(metadata.description).toBe('Generate project tests');
      expect(metadata.generateUnitTests).toBe(true);
      expect(metadata.generateIntegrationTests).toBe(true);
      expect(metadata.testFramework).toBe('jest');
      expect(metadata.createMocksAndFixtures).toBe(true);
    });

    test('should validate step correctly', async () => {
      const validation = await testsStep.validate(mockContext);
      expect(validation.isValid).toBe(true);
    });

    test('should generate unit tests', async () => {
      const result = await testsStep.executeStep(mockContext);
      
      expect(result.success).toBe(true);
      expect(result.output.generatedFiles).toBeDefined();
      expect(result.output.metadata.totalTests).toBeGreaterThan(0);
      
      // Check if unit tests were created
      const unitTestsPath = path.join(testProjectPath, 'tests', 'unit');
      const unitTestsExists = await fs.access(unitTestsPath).then(() => true).catch(() => false);
      expect(unitTestsExists).toBe(true);
    });

    test('should identify testable components', async () => {
      const testableComponents = await testsStep.identifyTestableComponents(testProjectPath, {
        type: 'frontend',
        frameworks: ['react']
      });
      
      expect(testableComponents.functions).toBeDefined();
      expect(testableComponents.classes).toBeDefined();
      expect(testableComponents.functions.length).toBeGreaterThan(0);
      expect(testableComponents.classes.length).toBeGreaterThan(0);
    });
  });

  describe('ScriptGenerationStep', () => {
    let scriptStep;

    beforeEach(() => {
      scriptStep = new ScriptGenerationStep({
        scriptType: 'build',
        scriptName: 'custom-build',
        scriptExtension: 'sh',
        makeExecutable: true,
        logger: console
      });
    });

    test('should create script generation step with correct metadata', () => {
      const metadata = scriptStep.getMetadata();
      expect(metadata.name).toBe('ScriptGenerationStep');
      expect(metadata.description).toBe('Generate single project script');
      expect(metadata.scriptType).toBe('build');
      expect(metadata.scriptName).toBe('custom-build');
      expect(metadata.scriptExtension).toBe('sh');
      expect(metadata.makeExecutable).toBe(true);
    });

    test('should validate step correctly', async () => {
      const validation = await scriptStep.validate(mockContext);
      expect(validation.isValid).toBe(true);
    });

    test('should generate single script', async () => {
      const result = await scriptStep.executeStep(mockContext);
      
      expect(result.success).toBe(true);
      expect(result.output.generatedFiles).toBeDefined();
      expect(result.output.metadata.totalScripts).toBeGreaterThan(0);
      
      // Check if script was created
      const scriptPath = path.join(testProjectPath, 'scripts', 'custom-build.sh');
      const scriptExists = await fs.access(scriptPath).then(() => true).catch(() => false);
      expect(scriptExists).toBe(true);
    });

    test('should generate different script types', async () => {
      const scriptTypes = ['build', 'deploy', 'test', 'dev', 'clean'];
      
      for (const scriptType of scriptTypes) {
        const step = new ScriptGenerationStep({
          scriptType,
          scriptName: `test-${scriptType}`,
          logger: console
        });
        
        const content = await step.generateScriptContent({
          type: 'frontend',
          frameworks: ['react']
        }, {});
        
        expect(content).toBeDefined();
        expect(content.length).toBeGreaterThan(0);
        expect(content).toContain('#!/bin/bash');
      }
    });
  });

  describe('Integration Tests', () => {
    test('should work together in a workflow', async () => {
      // Test that all steps can work together
      const steps = [
        new ScriptsGenerationStep({ scriptTypes: ['build'] }),
        new DocumentationGenerationStep({ includeAPI: true }),
        new ConfigsGenerationStep({ configTypes: ['eslint'] }),
        new TestsGenerationStep({ generateUnitTests: true }),
        new ScriptGenerationStep({ scriptType: 'custom' })
      ];

      for (const step of steps) {
        const result = await step.executeStep(mockContext);
        expect(result.success).toBe(true);
        expect(result.metadata).toBeDefined();
      }
    });

    test('should handle project structure analysis consistently', async () => {
      const steps = [
        new ScriptsGenerationStep(),
        new DocumentationGenerationStep(),
        new ConfigsGenerationStep(),
        new TestsGenerationStep(),
        new ScriptGenerationStep()
      ];

      for (const step of steps) {
        const structure = await step.analyzeProjectStructure(testProjectPath);
        expect(structure.type).toBe('fullstack'); // react + express
        expect(structure.frameworks).toContain('react');
        expect(structure.frameworks).toContain('express');
        expect(structure.hasPackageJson).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid project paths', async () => {
      const invalidPath = '/invalid/path/that/does/not/exist';
      const steps = [
        new ScriptsGenerationStep(),
        new DocumentationGenerationStep(),
        new ConfigsGenerationStep(),
        new TestsGenerationStep(),
        new ScriptGenerationStep()
      ];

      for (const step of steps) {
        const invalidContext = new MockWorkflowContext({ projectPath: invalidPath });
        await expect(step.executeStep(invalidContext)).rejects.toThrow();
      }
    });

    test('should handle validation errors', async () => {
      const invalidStep = new ScriptsGenerationStep({
        scriptTypes: ['invalid-type']
      });

      const validation = await invalidStep.validate(mockContext);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    test('should complete generation within reasonable time', async () => {
      const startTime = Date.now();
      
      const step = new ScriptsGenerationStep({
        scriptTypes: ['build', 'deployment', 'database'],
        logger: console
      });
      
      const result = await step.executeStep(mockContext);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
}); 