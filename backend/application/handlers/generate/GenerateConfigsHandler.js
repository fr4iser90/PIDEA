/**
 * GenerateConfigsHandler - Handles configuration file generation
 * Implements the Handler pattern for configuration generation
 */
const fs = require('fs').promises;
const path = require('path');
const EventBus = require('../../../infrastructure/messaging/EventBus');
const AnalysisRepository = require('../../../domain/repositories/AnalysisRepository');

class GenerateConfigsHandler {
    constructor(dependencies = {}) {
        this.eventBus = dependencies.eventBus || new EventBus();
        this.analysisRepository = dependencies.analysisRepository || new AnalysisRepository();
        this.logger = dependencies.logger || console;
    }

    async handle(command) {
        this.logger.info(`Starting configuration generation for project: ${command.projectPath}`);

        try {
            const validation = command.validateBusinessRules();
            if (!validation.isValid) {
                throw new Error(`Business rule validation failed: ${validation.errors.join(', ')}`);
            }

            const options = command.getGenerateOptions();
            const outputConfig = command.getOutputConfiguration();

            // Step 1: Analyze project structure
            const projectStructure = await this.analyzeProjectStructure(command.projectPath);
            
            // Step 2: Detect existing configurations
            const existingConfigs = await this.detectExistingConfigs(command.projectPath);
            
            // Step 3: Generate ESLint config (if enabled)
            let eslintResults = null;
            if (options.configTypes.includes('eslint')) {
                eslintResults = await this.generateESLintConfig(command.projectPath, projectStructure, options);
            }
            
            // Step 4: Generate Prettier config (if enabled)
            let prettierResults = null;
            if (options.configTypes.includes('prettier')) {
                prettierResults = await this.generatePrettierConfig(command.projectPath, options);
            }
            
            // Step 5: Generate Jest config (if enabled)
            let jestResults = null;
            if (options.configTypes.includes('jest')) {
                jestResults = await this.generateJestConfig(command.projectPath, projectStructure, options);
            }
            
            // Step 6: Generate Webpack config (if enabled)
            let webpackResults = null;
            if (options.configTypes.includes('webpack')) {
                webpackResults = await this.generateWebpackConfig(command.projectPath, projectStructure, options);
            }
            
            // Step 7: Generate Babel config (if enabled)
            let babelResults = null;
            if (options.configTypes.includes('babel')) {
                babelResults = await this.generateBabelConfig(command.projectPath, projectStructure, options);
            }
            
            // Step 8: Generate TypeScript config (if enabled)
            let typescriptResults = null;
            if (options.configTypes.includes('typescript')) {
                typescriptResults = await this.generateTypeScriptConfig(command.projectPath, projectStructure, options);
            }
            
            // Step 9: Generate Docker config (if enabled)
            let dockerResults = null;
            if (options.configTypes.includes('docker')) {
                dockerResults = await this.generateDockerConfig(command.projectPath, projectStructure, options);
            }
            
            // Step 10: Generate CI config (if enabled)
            let ciResults = null;
            if (options.configTypes.includes('ci')) {
                ciResults = await this.generateCIConfig(command.projectPath, options);
            }
            
            // Step 11: Update package.json scripts (if enabled)
            let scriptsResults = null;
            if (options.includeScripts) {
                scriptsResults = await this.updatePackageScripts(command.projectPath, {
                    eslint: eslintResults,
                    jest: jestResults,
                    webpack: webpackResults
                });
            }
            
            // Step 12: Validate configurations
            let validationResults = null;
            if (options.validateConfigs) {
                validationResults = await this.validateConfigurations(command.projectPath, {
                    eslint: eslintResults,
                    prettier: prettierResults,
                    jest: jestResults,
                    webpack: webpackResults,
                    babel: babelResults,
                    typescript: typescriptResults,
                    docker: dockerResults,
                    ci: ciResults
                });
            }

            // Step 13: Generate output
            const output = await this.generateOutput({
                command,
                projectStructure,
                existingConfigs,
                eslintResults,
                prettierResults,
                jestResults,
                webpackResults,
                babelResults,
                typescriptResults,
                dockerResults,
                ciResults,
                scriptsResults,
                validationResults,
                outputConfig
            });

            // Step 14: Save results
            await this.saveResults(command, output);

            this.logger.info(`Configuration generation completed successfully for project: ${command.projectPath}`);
            
            return {
                success: true,
                commandId: command.commandId,
                output,
                metadata: command.getMetadata()
            };

        } catch (error) {
            this.logger.error(`Configuration generation failed for project ${command.projectPath}:`, error);
            
            await this.eventBus.publish('config.generation.failed', {
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
            techStack: {},
            metrics: {}
        };

        try {
            await this.scanProject(projectPath, structure);
            structure.techStack = this.detectTechStack(structure);
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
                }
            }
        }
    }

    shouldSkipDirectory(dirName) {
        const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt'];
        return skipDirs.includes(dirName);
    }

    classifyDirectory(dirName) {
        const patterns = {
            source: ['src', 'app', 'lib', 'components'],
            config: ['config', 'configs', 'settings'],
            test: ['test', 'tests', '__tests__', 'spec'],
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
        
        return {
            path: relativePath,
            fullPath: filePath,
            size: content.length,
            lines: content.split('\n').length,
            type: this.classifyFile(relativePath)
        };
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

    detectTechStack(structure) {
        const techStack = {
            frameworks: [],
            libraries: [],
            tools: [],
            languages: []
        };

        // Detect languages
        const fileExtensions = new Set();
        structure.files.forEach(file => {
            const ext = path.extname(file.path);
            if (ext) fileExtensions.add(ext);
        });

        if (fileExtensions.has('.js') || fileExtensions.has('.jsx')) {
            techStack.languages.push('javascript');
        }
        if (fileExtensions.has('.ts') || fileExtensions.has('.tsx')) {
            techStack.languages.push('typescript');
        }
        if (fileExtensions.has('.vue')) {
            techStack.languages.push('vue');
        }
        if (fileExtensions.has('.svelte')) {
            techStack.languages.push('svelte');
        }

        // Detect frameworks and libraries based on file patterns
        const hasReact = structure.files.some(file => 
            file.path.includes('react') || file.path.includes('jsx')
        );
        if (hasReact) techStack.frameworks.push('react');

        const hasVue = structure.files.some(file => 
            file.path.includes('vue') || file.path.endsWith('.vue')
        );
        if (hasVue) techStack.frameworks.push('vue');

        const hasExpress = structure.files.some(file => 
            file.path.includes('express') || file.path.includes('server')
        );
        if (hasExpress) techStack.frameworks.push('express');

        return techStack;
    }

    calculateProjectMetrics(structure) {
        return {
            totalFiles: structure.files.length,
            totalDirectories: structure.directories.length,
            fileTypes: this.countFileTypes(structure.files),
            languages: structure.techStack.languages.length,
            frameworks: structure.techStack.frameworks.length
        };
    }

    countFileTypes(files) {
        const types = {};
        files.forEach(file => {
            types[file.type] = (types[file.type] || 0) + 1;
        });
        return types;
    }

    async detectExistingConfigs(projectPath) {
        this.logger.info('Detecting existing configurations...');
        
        const existingConfigs = {
            found: [],
            missing: []
        };

        const configFiles = [
            '.eslintrc.js', '.eslintrc.json', '.eslintrc',
            '.prettierrc', '.prettierrc.js', '.prettierrc.json',
            'jest.config.js', 'jest.config.json',
            'webpack.config.js', 'webpack.config.ts',
            'babel.config.js', 'babel.config.json',
            'tsconfig.json', 'tsconfig.js',
            'Dockerfile', 'docker-compose.yml',
            '.github/workflows', '.gitlab-ci.yml', '.travis.yml'
        ];

        for (const configFile of configFiles) {
            const configPath = path.join(projectPath, configFile);
            try {
                await fs.access(configPath);
                existingConfigs.found.push(configFile);
            } catch (error) {
                existingConfigs.missing.push(configFile);
            }
        }

        return existingConfigs;
    }

    async generateESLintConfig(projectPath, projectStructure, options) {
        this.logger.info('Generating ESLint configuration...');
        
        const results = {
            generated: false,
            path: null,
            content: null,
            errors: []
        };

        try {
            const configPath = path.join(projectPath, '.eslintrc.js');
            
            if (options.overwriteExisting || !(await this.fileExists(configPath))) {
                const content = this.generateESLintContent(projectStructure);
                await fs.writeFile(configPath, content);
                
                results.generated = true;
                results.path = path.relative(projectPath, configPath);
                results.content = content;
            }
        } catch (error) {
            results.errors.push({
                action: 'generate_eslint',
                error: error.message
            });
        }

        return results;
    }

    generateESLintContent(projectStructure) {
        const hasReact = projectStructure.techStack.frameworks.includes('react');
        const hasTypeScript = projectStructure.techStack.languages.includes('typescript');
        
        let content = `module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',`;

        if (hasTypeScript) {
            content += `
    '@typescript-eslint/recommended',`;
        }

        if (hasReact) {
            content += `
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',`;
        }

        content += `
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',`;

        if (hasTypeScript) {
            content += `
    parser: '@typescript-eslint/parser',`;
        }

        content += `
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
  },`;

        if (hasReact) {
            content += `
  settings: {
    react: {
      version: 'detect',
    },
  },`;
        }

        content += `
};
`;

        return content;
    }

    async generatePrettierConfig(projectPath, options) {
        this.logger.info('Generating Prettier configuration...');
        
        const results = {
            generated: false,
            path: null,
            content: null,
            errors: []
        };

        try {
            const configPath = path.join(projectPath, '.prettierrc');
            
            if (options.overwriteExisting || !(await this.fileExists(configPath))) {
                const content = JSON.stringify({
                    semi: true,
                    trailingComma: 'es5',
                    singleQuote: true,
                    printWidth: 80,
                    tabWidth: 2,
                    useTabs: false
                }, null, 2);
                
                await fs.writeFile(configPath, content);
                
                results.generated = true;
                results.path = path.relative(projectPath, configPath);
                results.content = content;
            }
        } catch (error) {
            results.errors.push({
                action: 'generate_prettier',
                error: error.message
            });
        }

        return results;
    }

    async generateJestConfig(projectPath, projectStructure, options) {
        this.logger.info('Generating Jest configuration...');
        
        const results = {
            generated: false,
            path: null,
            content: null,
            errors: []
        };

        try {
            const configPath = path.join(projectPath, 'jest.config.js');
            
            if (options.overwriteExisting || !(await this.fileExists(configPath))) {
                const content = this.generateJestContent(projectStructure);
                await fs.writeFile(configPath, content);
                
                results.generated = true;
                results.path = path.relative(projectPath, configPath);
                results.content = content;
            }
        } catch (error) {
            results.errors.push({
                action: 'generate_jest',
                error: error.message
            });
        }

        return results;
    }

    generateJestContent(projectStructure) {
        const hasReact = projectStructure.techStack.frameworks.includes('react');
        const hasTypeScript = projectStructure.techStack.languages.includes('typescript');
        
        let content = `module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },`;

        if (hasReact) {
            content += `
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapping: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },`;
        }

        if (hasTypeScript) {
            content += `
  preset: 'ts-jest',
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],`;
        }

        content += `
};
`;

        return content;
    }

    async generateWebpackConfig(projectPath, projectStructure, options) {
        this.logger.info('Generating Webpack configuration...');
        
        const results = {
            generated: false,
            path: null,
            content: null,
            errors: []
        };

        try {
            const configPath = path.join(projectPath, 'webpack.config.js');
            
            if (options.overwriteExisting || !(await this.fileExists(configPath))) {
                const content = this.generateWebpackContent(projectStructure);
                await fs.writeFile(configPath, content);
                
                results.generated = true;
                results.path = path.relative(projectPath, configPath);
                results.content = content;
            }
        } catch (error) {
            results.errors.push({
                action: 'generate_webpack',
                error: error.message
            });
        }

        return results;
    }

    generateWebpackContent(projectStructure) {
        const hasReact = projectStructure.techStack.frameworks.includes('react');
        const hasTypeScript = projectStructure.techStack.languages.includes('typescript');
        
        let content = `const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  module: {
    rules: [`;

        if (hasTypeScript) {
            content += `
      {
        test: /\\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },`;
        }

        content += `
      {
        test: /\\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'`;

        if (hasTypeScript) {
            content += `, '.ts', '.tsx'`;
        }

        content += `],
  },
  devServer: {
    static: './dist',
    hot: true,
  },
};
`;

        return content;
    }

    async generateBabelConfig(projectPath, projectStructure, options) {
        this.logger.info('Generating Babel configuration...');
        
        const results = {
            generated: false,
            path: null,
            content: null,
            errors: []
        };

        try {
            const configPath = path.join(projectPath, 'babel.config.js');
            
            if (options.overwriteExisting || !(await this.fileExists(configPath))) {
                const content = this.generateBabelContent(projectStructure);
                await fs.writeFile(configPath, content);
                
                results.generated = true;
                results.path = path.relative(projectPath, configPath);
                results.content = content;
            }
        } catch (error) {
            results.errors.push({
                action: 'generate_babel',
                error: error.message
            });
        }

        return results;
    }

    generateBabelContent(projectStructure) {
        const hasReact = projectStructure.techStack.frameworks.includes('react');
        
        let content = `module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }]`;

        if (hasReact) {
            content += `,
    '@babel/preset-react'`;
        }

        content += `
  ],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-object-rest-spread',
  ],
};
`;

        return content;
    }

    async generateTypeScriptConfig(projectPath, projectStructure, options) {
        this.logger.info('Generating TypeScript configuration...');
        
        const results = {
            generated: false,
            path: null,
            content: null,
            errors: []
        };

        try {
            const configPath = path.join(projectPath, 'tsconfig.json');
            
            if (options.overwriteExisting || !(await this.fileExists(configPath))) {
                const content = this.generateTypeScriptContent(projectStructure);
                await fs.writeFile(configPath, content);
                
                results.generated = true;
                results.path = path.relative(projectPath, configPath);
                results.content = content;
            }
        } catch (error) {
            results.errors.push({
                action: 'generate_typescript',
                error: error.message
            });
        }

        return results;
    }

    generateTypeScriptContent(projectStructure) {
        const hasReact = projectStructure.techStack.frameworks.includes('react');
        
        const config = {
            compilerOptions: {
                target: 'es2020',
                lib: ['dom', 'dom.iterable', 'es6'],
                allowJs: true,
                skipLibCheck: true,
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
                strict: true,
                forceConsistentCasingInFileNames: true,
                noFallthroughCasesInSwitch: true,
                module: 'esnext',
                moduleResolution: 'node',
                resolveJsonModule: true,
                isolatedModules: true,
                noEmit: true,
                jsx: hasReact ? 'react-jsx' : 'preserve'
            },
            include: ['src'],
            exclude: ['node_modules']
        };

        return JSON.stringify(config, null, 2);
    }

    async generateDockerConfig(projectPath, projectStructure, options) {
        this.logger.info('Generating Docker configuration...');
        
        const results = {
            generated: false,
            path: null,
            content: null,
            errors: []
        };

        try {
            const dockerfilePath = path.join(projectPath, 'Dockerfile');
            
            if (options.overwriteExisting || !(await this.fileExists(dockerfilePath))) {
                const content = this.generateDockerfileContent(projectStructure);
                await fs.writeFile(dockerfilePath, content);
                
                results.generated = true;
                results.path = path.relative(projectPath, dockerfilePath);
                results.content = content;
            }
        } catch (error) {
            results.errors.push({
                action: 'generate_docker',
                error: error.message
            });
        }

        return results;
    }

    generateDockerfileContent(projectStructure) {
        return `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
`;
    }

    async generateCIConfig(projectPath, options) {
        this.logger.info('Generating CI configuration...');
        
        const results = {
            generated: false,
            path: null,
            content: null,
            errors: []
        };

        try {
            const workflowsDir = path.join(projectPath, '.github', 'workflows');
            await fs.mkdir(workflowsDir, { recursive: true });
            
            const ciPath = path.join(workflowsDir, 'ci.yml');
            const content = this.generateCIContent();
            await fs.writeFile(ciPath, content);
            
            results.generated = true;
            results.path = path.relative(projectPath, ciPath);
            results.content = content;
        } catch (error) {
            results.errors.push({
                action: 'generate_ci',
                error: error.message
            });
        }

        return results;
    }

    generateCIContent() {
        return `name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [16.x, 18.x]

    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'
    
    - run: npm ci
    - run: npm run lint
    - run: npm run test
    - run: npm run build
`;
    }

    async updatePackageScripts(projectPath, configResults) {
        this.logger.info('Updating package.json scripts...');
        
        const results = {
            updated: false,
            path: null,
            errors: []
        };

        try {
            const packagePath = path.join(projectPath, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
            
            const scripts = {
                ...packageJson.scripts,
                'lint': 'eslint src --ext .js,.jsx,.ts,.tsx',
                'lint:fix': 'eslint src --ext .js,.jsx,.ts,.tsx --fix',
                'format': 'prettier --write src',
                'test': 'jest',
                'test:watch': 'jest --watch',
                'test:coverage': 'jest --coverage',
                'build': 'webpack --mode production',
                'dev': 'webpack serve --mode development'
            };
            
            packageJson.scripts = scripts;
            await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2));
            
            results.updated = true;
            results.path = path.relative(projectPath, packagePath);
        } catch (error) {
            results.errors.push({
                action: 'update_package_scripts',
                error: error.message
            });
        }

        return results;
    }

    async validateConfigurations(projectPath, allConfigs) {
        this.logger.info('Validating configurations...');
        
        const results = {
            valid: true,
            issues: [],
            metrics: {}
        };

        try {
            const generatedConfigs = Object.values(allConfigs).filter(config => config && config.generated);
            
            results.metrics = {
                totalGenerated: generatedConfigs.length,
                totalErrors: Object.values(allConfigs).reduce((sum, config) => 
                    sum + (config?.errors?.length || 0), 0
                )
            };

            if (results.metrics.totalErrors > 0) {
                results.valid = false;
                results.issues.push({
                    type: 'generation_errors',
                    message: `${results.metrics.totalErrors} configuration generation errors occurred`
                });
            }
            
        } catch (error) {
            results.valid = false;
            results.issues.push({
                type: 'validation_error',
                message: error.message
            });
        }

        return results;
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }

    async generateOutput(data) {
        const { command, projectStructure, existingConfigs, eslintResults, prettierResults, jestResults, webpackResults, babelResults, typescriptResults, dockerResults, ciResults, scriptsResults, validationResults, outputConfig } = data;

        const output = {
            commandId: command.commandId,
            timestamp: new Date(),
            summary: {
                configTypes: command.getGenerateOptions().configTypes,
                existingConfigs: existingConfigs.found.length,
                missingConfigs: existingConfigs.missing.length,
                eslintGenerated: eslintResults?.generated || false,
                prettierGenerated: prettierResults?.generated || false,
                jestGenerated: jestResults?.generated || false,
                webpackGenerated: webpackResults?.generated || false,
                babelGenerated: babelResults?.generated || false,
                typescriptGenerated: typescriptResults?.generated || false,
                dockerGenerated: dockerResults?.generated || false,
                ciGenerated: ciResults?.generated || false,
                scriptsUpdated: scriptsResults?.updated || false,
                validationPassed: validationResults?.valid || false
            },
            projectStructure: outputConfig.includeRawData ? projectStructure : projectStructure.metrics,
            existingConfigs,
            results: {
                eslint: eslintResults,
                prettier: prettierResults,
                jest: jestResults,
                webpack: webpackResults,
                babel: babelResults,
                typescript: typescriptResults,
                docker: dockerResults,
                ci: ciResults,
                scripts: scriptsResults,
                validation: validationResults
            }
        };

        if (outputConfig.includeMetrics) {
            output.metrics = {
                before: projectStructure.metrics,
                after: {
                    ...projectStructure.metrics,
                    configurationsGenerated: true
                }
            };
        }

        return output;
    }

    async saveResults(command, output) {
        try {
            await this.analysisRepository.save({
                id: command.commandId,
                type: 'config_generation',
                projectPath: command.projectPath,
                data: output,
                timestamp: new Date(),
                metadata: command.getMetadata()
            });

            await this.eventBus.publish('config.generation.completed', {
                commandId: command.commandId,
                projectPath: command.projectPath,
                results: output,
                timestamp: new Date()
            });
        } catch (error) {
            this.logger.error('Failed to save configuration generation results:', error);
        }
    }
}

module.exports = GenerateConfigsHandler; 