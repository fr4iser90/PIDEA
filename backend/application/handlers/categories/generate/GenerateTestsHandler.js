/**
 * GenerateTestsHandler - Handles test generation
 * Implements the Handler pattern for test generation
 */
const fs = require('fs').promises;
const path = require('path');
const EventBus = require('@messaging/EventBus');
const AnalysisRepository = require('@repositories/AnalysisRepository');

class GenerateTestsHandler {
    constructor(dependencies = {}) {
        this.eventBus = dependencies.eventBus || new EventBus();
        this.analysisRepository = dependencies.analysisRepository || new AnalysisRepository();
        this.logger = dependencies.logger || console;
    }

    async handle(command) {
        this.logger.info(`Starting test generation for project: ${command.projectPath}`);

        try {
            const validation = command.validateBusinessRules();
            if (!validation.isValid) {
                throw new Error(`Business rule validation failed: ${validation.errors.join(', ')}`);
            }

            const options = command.getGenerateOptions();
            const outputConfig = command.getOutputConfiguration();

            // Step 1: Analyze project structure
            const projectStructure = await this.analyzeProjectStructure(command.projectPath);
            
            // Step 2: Identify testable components
            const testableComponents = await this.identifyTestableComponents(command.projectPath, projectStructure);
            
            // Step 3: Generate unit tests (if enabled)
            let unitTestResults = null;
            if (options.generateUnitTests) {
                unitTestResults = await this.generateUnitTests(command.projectPath, testableComponents, options);
            }
            
            // Step 4: Generate integration tests (if enabled)
            let integrationTestResults = null;
            if (options.generateIntegrationTests) {
                integrationTestResults = await this.generateIntegrationTests(command.projectPath, testableComponents, options);
            }
            
            // Step 5: Generate E2E tests (if enabled)
            let e2eTestResults = null;
            if (options.generateE2ETests) {
                e2eTestResults = await this.generateE2ETests(command.projectPath, testableComponents, options);
            }
            
            // Step 6: Create test configuration
            let configResults = null;
            if (options.testFramework) {
                configResults = await this.createTestConfiguration(command.projectPath, options);
            }
            
            // Step 7: Create mocks and fixtures (if enabled)
            let mockResults = null;
            if (options.includeMocks) {
                mockResults = await this.createMocksAndFixtures(command.projectPath, testableComponents);
            }
            
            // Step 8: Validate generated tests
            let validationResults = null;
            if (options.testFramework) {
                validationResults = await this.validateGeneratedTests(command.projectPath, options);
            }

            // Step 9: Generate output
            const output = await this.generateOutput({
                command,
                projectStructure,
                testableComponents,
                unitTestResults,
                integrationTestResults,
                e2eTestResults,
                configResults,
                mockResults,
                validationResults,
                outputConfig
            });

            // Step 10: Save results
            await this.saveResults(command, output);

            this.logger.info(`Test generation completed successfully for project: ${command.projectPath}`);
            
            return {
                success: true,
                commandId: command.commandId,
                output,
                metadata: command.getMetadata()
            };

        } catch (error) {
            this.logger.error(`Test generation failed for project ${command.projectPath}:`, error);
            
            await this.eventBus.publish('test.generation.failed', {
                commandId: command.commandId,
                projectPath: command.projectPath,
                error: error.message,
                timestamp: new Date()
            });

            throw error;
        }
    }

    async analyzeProjectStructure(projectPath) {
        this.logger.info('Analyzing project structure...');
        
        const structure = {
            files: [],
            directories: [],
            components: [],
            metrics: {}
        };

        try {
            await this.scanProject(projectPath, structure);
            structure.metrics = this.calculateProjectMetrics(structure);
            
            return structure;
        } catch (error) {
            throw new Error(`Failed to analyze project structure: ${error.message}`);
        }
    }

    async scanProject(projectPath, structure, relativePath = '') {
        const entries = await fs.readdir(projectPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(projectPath, entry.name);
            const relativeEntryPath = path.join(relativePath, entry.name);
            
            if (entry.isDirectory === true) {
                if (!this.shouldSkipDirectory(entry.name)) {
                    structure.directories.push({
                        path: relativeEntryPath,
                        name: entry.name,
                        type: this.classifyDirectory(entry.name)
                    });
                    
                    await this.scanProject(fullPath, structure, relativeEntryPath);
                }
            } else if (entry.isFile === true) {
                if (this.isCodeFile(entry.name)) {
                    const fileInfo = await this.analyzeFile(fullPath, relativeEntryPath);
                    structure.files.push(fileInfo);
                    
                    if (this.isTestableComponent(fileInfo)) {
                        structure.components.push(fileInfo);
                    }
                }
            }
        }
    }

    shouldSkipDirectory(dirName) {
        const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt', 'tests', '__tests__'];
        return skipDirs.includes(dirName);
    }

    classifyDirectory(dirName) {
        const patterns = {
            source: ['src', 'app', 'lib', 'components'],
            test: ['test', 'tests', '__tests__', 'spec'],
            config: ['config', 'configs', 'settings'],
            docs: ['docs', 'documentation']
        };

        for (const [type, keywords] of Object.entries(patterns)) {
            if (keywords.some(keyword => dirName.toLowerCase().includes(keyword))) {
                return type;
            }
        }
        
        return 'other';
    }

    isCodeFile(fileName) {
        const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'];
        return codeExtensions.some(ext => fileName.endsWith(ext));
    }

    async analyzeFile(filePath, relativePath) {
        const content = await fs.readFile(filePath, 'utf-8');
        const functions = this.extractFunctions(content);
        const classes = this.extractClasses(content);
        const imports = this.extractImports(content);
        
        return {
            path: relativePath,
            fullPath: filePath,
            size: content.length,
            lines: content.split('\n').length,
            functions,
            classes,
            imports,
            type: this.classifyFile(relativePath),
            complexity: this.calculateComplexity(content)
        };
    }

    extractFunctions(content) {
        const functions = [];
        const functionRegex = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\(|(\w+)\s*\([^)]*\)\s*\{)/g;
        
        let match;
        while ((match = functionRegex.exec(content)) !== null) {
            const functionName = match[1] || match[2] || match[3];
            if (functionName && !functionName.startsWith('_')) {
                functions.push({
                    name: functionName,
                    line: content.substring(0, match.index).split('\n').length
                });
            }
        }
        
        return functions;
    }

    extractClasses(content) {
        const classes = [];
        const classRegex = /class\s+(\w+)/g;
        
        let match;
        while ((match = classRegex.exec(content)) !== null) {
            classes.push({
                name: match[1],
                line: content.substring(0, match.index).split('\n').length
            });
        }
        
        return classes;
    }

    extractImports(content) {
        const imports = [];
        const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g;
        
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            imports.push({
                module: match[1],
                line: content.substring(0, match.index).split('\n').length
            });
        }
        
        return imports;
    }

    classifyFile(filePath) {
        const patterns = {
            component: /\.(jsx?|tsx?|vue|svelte)$/,
            service: /service|api|client/i,
            model: /model|entity|schema/i,
            utility: /util|helper|constant/i,
            test: /\.test\.|\.spec\./
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            if (pattern.test(filePath)) {
                return type;
            }
        }
        
        return 'unknown';
    }

    calculateComplexity(content) {
        let complexity = 0;
        
        // Count conditional statements
        const conditionals = (content.match(/if|else|switch|case/g) || []).length;
        complexity += conditionals * 2;
        
        // Count loops
        const loops = (content.match(/for|while|do/g) || []).length;
        complexity += loops * 3;
        
        // Count functions
        const functions = (content.match(/function|=>/g) || []).length;
        complexity += functions;
        
        return complexity;
    }

    isTestableComponent(fileInfo) {
        // Skip test files
        if (fileInfo.type === 'test') {
            return false;
        }
        
        // Skip files with no functions or classes
        if (fileInfo.functions.length === 0 && fileInfo.classes.length === 0) {
            return false;
        }
        
        // Skip utility files with low complexity
        if (fileInfo.type === 'utility' && fileInfo.complexity < 5) {
            return false;
        }
        
        return true;
    }

    calculateProjectMetrics(structure) {
        return {
            totalFiles: structure.files.length,
            totalComponents: structure.components.length,
            averageComplexity: structure.components.length > 0 
                ? structure.components.reduce((sum, comp) => sum + comp.complexity, 0) / structure.components.length 
                : 0,
            fileTypes: this.countFileTypes(structure.files),
            testCoverage: 0 // Will be calculated after test generation
        };
    }

    countFileTypes(files) {
        const types = {};
        files.forEach(file => {
            types[file.type] = (types[file.type] || 0) + 1;
        });
        return types;
    }

    async identifyTestableComponents(projectPath, projectStructure) {
        this.logger.info('Identifying testable components...');
        
        const testableComponents = {
            high: [],
            medium: [],
            low: [],
            total: 0
        };

        for (const component of projectStructure.components) {
            const priority = this.calculateTestPriority(component);
            testableComponents[priority].push(component);
            testableComponents.total++;
        }

        return testableComponents;
    }

    calculateTestPriority(component) {
        if (component.complexity > 20 || component.functions.length > 10 || component.classes.length > 2) {
            return 'high';
        } else if (component.complexity > 10 || component.functions.length > 5 || component.classes.length > 1) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    async generateUnitTests(projectPath, testableComponents, options) {
        this.logger.info('Generating unit tests...');
        
        const results = {
            generated: [],
            errors: [],
            totalTests: 0
        };

        try {
            const testDir = path.join(projectPath, '__tests__');
            await fs.mkdir(testDir, { recursive: true });

            for (const priority of ['high', 'medium', 'low']) {
                for (const component of testableComponents[priority]) {
                    try {
                        const testFile = await this.generateUnitTestFile(component, options);
                        const testPath = path.join(testDir, `${path.basename(component.path, path.extname(component.path))}.test.js`);
                        
                        await fs.writeFile(testPath, testFile);
                        results.generated.push({
                            component: component.path,
                            testPath: path.relative(projectPath, testPath),
                            priority,
                            testCount: this.countTestsInFile(testFile)
                        });
                        
                        results.totalTests += this.countTestsInFile(testFile);
                    } catch (error) {
                        results.errors.push({
                            component: component.path,
                            error: error.message
                        });
                    }
                }
            }
        } catch (error) {
            throw new Error(`Failed to generate unit tests: ${error.message}`);
        }

        return results;
    }

    async generateUnitTestFile(component, options) {
        const framework = options.testFramework || 'jest';
        let testContent = '';

        switch (framework) {
            case 'jest':
                testContent = this.generateJestTest(component);
                break;
            case 'mocha':
                testContent = this.generateMochaTest(component);
                break;
            case 'vitest':
                testContent = this.generateVitestTest(component);
                break;
            default:
                testContent = this.generateJestTest(component);
        }

        return testContent;
    }

    generateJestTest(component) {
        const importPath = this.getImportPath(component.path);
        const testCases = this.generateTestCases(component);
        
        return `/**
 * Generated test file for ${component.path}
 * Generated on: ${new Date().toISOString()}
 */

import { ${component.functions.map(f => f.name).join(', ')} } from '${importPath}';

${testCases.map(testCase => `
describe('${testCase.name}', () => {
  test('${testCase.description}', () => {
    ${testCase.implementation}
  });
});`).join('\n')}

// Additional test cases can be added here
`;
    }

    generateMochaTest(component) {
        const importPath = this.getImportPath(component.path);
        const testCases = this.generateTestCases(component);
        
        return `/**
 * Generated test file for ${component.path}
 * Generated on: ${new Date().toISOString()}
 */

const { ${component.functions.map(f => f.name).join(', ')} } = require('${importPath}');

${testCases.map(testCase => `
describe('${testCase.name}', () => {
  it('${testCase.description}', () => {
    ${testCase.implementation}
  });
});`).join('\n')}

// Additional test cases can be added here
`;
    }

    generateVitestTest(component) {
        const importPath = this.getImportPath(component.path);
        const testCases = this.generateTestCases(component);
        
        return `/**
 * Generated test file for ${component.path}
 * Generated on: ${new Date().toISOString()}
 */

import { describe, test, expect } from 'vitest';
import { ${component.functions.map(f => f.name).join(', ')} } from '${importPath}';

${testCases.map(testCase => `
describe('${testCase.name}', () => {
  test('${testCase.description}', () => {
    ${testCase.implementation}
  });
});`).join('\n')}

// Additional test cases can be added here
`;
    }

    getImportPath(filePath) {
        // Convert file path to import path
        return filePath.replace(/\\/g, '/').replace(/\.(js|jsx|ts|tsx)$/, '');
    }

    generateTestCases(component) {
        const testCases = [];

        // Generate test cases for functions
        for (const func of component.functions) {
            testCases.push({
                name: func.name,
                description: `should handle ${func.name} correctly`,
                implementation: `expect(${func.name}()).toBeDefined();\n    // Add specific test cases based on function behavior`
            });
        }

        // Generate test cases for classes
        for (const cls of component.classes) {
            testCases.push({
                name: cls.name,
                description: `should instantiate ${cls.name} correctly`,
                implementation: `expect(new ${cls.name}()).toBeInstanceOf(${cls.name});\n    // Add specific test cases for class methods`
            });
        }

        return testCases;
    }

    countTestsInFile(testContent) {
        const testRegex = /(?:test|it)\s*\(/g;
        const matches = testContent.match(testRegex);
        return matches ? matches.length : 0;
    }

    async generateIntegrationTests(projectPath, testableComponents, options) {
        this.logger.info('Generating integration tests...');
        
        const results = {
            generated: [],
            errors: [],
            totalTests: 0
        };

        // This is a simplified implementation
        // In a real scenario, you would generate integration tests based on component interactions
        
        return results;
    }

    async generateE2ETests(projectPath, testableComponents, options) {
        this.logger.info('Generating E2E tests...');
        
        const results = {
            generated: [],
            errors: [],
            totalTests: 0
        };

        // This is a simplified implementation
        // In a real scenario, you would generate E2E tests based on user flows
        
        return results;
    }

    async createTestConfiguration(projectPath, options) {
        this.logger.info('Creating test configuration...');
        
        const results = {
            created: [],
            errors: []
        };

        try {
            const framework = options.testFramework || 'jest';
            const configPath = path.join(projectPath, this.getConfigFileName(framework));
            
            const configContent = this.generateTestConfig(framework, options);
            await fs.writeFile(configPath, configContent);
            
            results.created.push(configPath);
        } catch (error) {
            results.errors.push({
                action: 'create_config',
                error: error.message
            });
        }

        return results;
    }

    getConfigFileName(framework) {
        const configFiles = {
            jest: 'jest.config.js',
            mocha: '.mocharc.js',
            vitest: 'vitest.config.js'
        };
        
        return configFiles[framework] || 'jest.config.js';
    }

    generateTestConfig(framework, options) {
        switch (framework) {
            case 'jest':
                return this.generateJestConfig(options);
            case 'mocha':
                return this.generateMochaConfig(options);
            case 'vitest':
                return this.generateVitestConfig(options);
            default:
                return this.generateJestConfig(options);
        }
    }

    generateJestConfig(options) {
        return `module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: ${options.coverageTarget || 80},
      functions: ${options.coverageTarget || 80},
      lines: ${options.coverageTarget || 80},
      statements: ${options.coverageTarget || 80}
    }
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};`;
    }

    generateMochaConfig(options) {
        return `module.exports = {
  spec: '**/__tests__/**/*.test.js',
  require: ['@babel/register'],
  reporter: 'spec',
  timeout: 5000
};`;
    }

    generateVitestConfig(options) {
        return `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: ${options.coverageTarget || 80},
          functions: ${options.coverageTarget || 80},
          lines: ${options.coverageTarget || 80},
          statements: ${options.coverageTarget || 80}
        }
      }
    }
  }
});`;
    }

    async createMocksAndFixtures(projectPath, testableComponents) {
        this.logger.info('Creating mocks and fixtures...');
        
        const results = {
            created: [],
            errors: []
        };

        try {
            const mocksDir = path.join(projectPath, '__mocks__');
            await fs.mkdir(mocksDir, { recursive: true });

            // Create common mocks
            const commonMocks = this.generateCommonMocks();
            for (const [name, content] of Object.entries(commonMocks)) {
                const mockPath = path.join(mocksDir, `${name}.js`);
                await fs.writeFile(mockPath, content);
                results.created.push(mockPath);
            }

            // Create fixtures directory
            const fixturesDir = path.join(projectPath, '__fixtures__');
            await fs.mkdir(fixturesDir, { recursive: true });

            const fixtures = this.generateFixtures();
            for (const [name, content] of Object.entries(fixtures)) {
                const fixturePath = path.join(fixturesDir, `${name}.json`);
                await fs.writeFile(fixturePath, JSON.stringify(content, null, 2));
                results.created.push(fixturePath);
            }

        } catch (error) {
            results.errors.push({
                action: 'create_mocks_fixtures',
                error: error.message
            });
        }

        return results;
    }

    generateCommonMocks() {
        return {
            'fs': `module.exports = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  stat: jest.fn()
};`,
            'path': `module.exports = {
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => args.join('/')),
  basename: jest.fn((path) => path.split('/').pop()),
  dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/'))
};`,
            'axios': `module.exports = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};`
        };
    }

    generateFixtures() {
        return {
            'user': {
                id: 1,
                name: 'Test User',
                email: 'test@example.com'
            },
            'product': {
                id: 1,
                name: 'Test Product',
                price: 99.99
            },
            'order': {
                id: 1,
                userId: 1,
                products: [1, 2, 3],
                total: 299.97
            }
        };
    }

    async validateGeneratedTests(projectPath, options) {
        this.logger.info('Validating generated tests...');
        
        const results = {
            valid: true,
            issues: [],
            metrics: {}
        };

        try {
            // Check if test files exist
            const testDir = path.join(projectPath, '__tests__');
            const testFiles = await this.getTestFiles(testDir);
            
            if (testFiles.length === 0) {
                results.valid = false;
                results.issues.push({
                    type: 'no_tests',
                    message: 'No test files were generated'
                });
            }

            // Calculate test metrics
            results.metrics = {
                totalTestFiles: testFiles.length,
                totalTestCases: await this.countTotalTestCases(testFiles),
                averageTestsPerFile: testFiles.length > 0 ? await this.countTotalTestCases(testFiles) / testFiles.length : 0
            };
            
        } catch (error) {
            results.valid = false;
            results.issues.push({
                type: 'validation_error',
                message: error.message
            });
        }

        return results;
    }

    async getTestFiles(testDir) {
        const files = [];
        
        try {
            const entries = await fs.readdir(testDir, { withFileTypes: true });
            
            for (const entry of entries) {
                if (entry.isFile === true && entry.name.endsWith('.test.js')) {
                    files.push(path.join(testDir, entry.name));
                }
            }
        } catch (error) {
            // Test directory doesn't exist
        }
        
        return files;
    }

    async countTotalTestCases(testFiles) {
        let total = 0;
        
        for (const file of testFiles) {
            try {
                const content = await fs.readFile(file, 'utf-8');
                total += this.countTestsInFile(content);
            } catch (error) {
                // Skip files that can't be read
            }
        }
        
        return total;
    }

    async generateOutput(data) {
        const { command, projectStructure, testableComponents, unitTestResults, integrationTestResults, e2eTestResults, configResults, mockResults, validationResults, outputConfig } = data;

        const output = {
            commandId: command.commandId,
            timestamp: new Date(),
            summary: {
                framework: command.getGenerateOptions().testFramework,
                totalComponents: testableComponents.total,
                unitTestsGenerated: unitTestResults?.generated?.length || 0,
                integrationTestsGenerated: integrationTestResults?.generated?.length || 0,
                e2eTestsGenerated: e2eTestResults?.generated?.length || 0,
                configFilesCreated: configResults?.created?.length || 0,
                mocksCreated: mockResults?.created?.length || 0,
                validationPassed: validationResults?.valid || false
            },
            projectStructure: outputConfig.includeRawData ? projectStructure : projectStructure.metrics,
            testableComponents: {
                high: testableComponents.high.length,
                medium: testableComponents.medium.length,
                low: testableComponents.low.length,
                total: testableComponents.total
            },
            results: {
                unitTests: unitTestResults,
                integrationTests: integrationTestResults,
                e2eTests: e2eTestResults,
                config: configResults,
                mocks: mockResults,
                validation: validationResults
            }
        };

        if (outputConfig.includeMetrics) {
            output.metrics = {
                before: projectStructure.metrics,
                after: validationResults?.metrics || projectStructure.metrics
            };
        }

        return output;
    }

    async saveResults(command, output) {
        try {
            await this.analysisRepository.save({
                id: command.commandId,
                type: 'test_generation',
                projectPath: command.projectPath,
                data: output,
                timestamp: new Date(),
                metadata: command.getMetadata()
            });

            await this.eventBus.publish('test.generation.completed', {
                commandId: command.commandId,
                projectPath: command.projectPath,
                results: output,
                timestamp: new Date()
            });
        } catch (error) {
            this.logger.error('Failed to save test generation results:', error);
        }
    }
}

module.exports = GenerateTestsHandler; 