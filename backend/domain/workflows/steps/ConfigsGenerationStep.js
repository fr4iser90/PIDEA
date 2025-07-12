/**
 * ConfigsGenerationStep - Configuration generation workflow step
 * 
 * This step handles configuration file generation operations, migrating the logic from
 * GenerateConfigsHandler to the unified workflow system. It provides
 * validation, complexity management, and performance optimization for configuration generation.
 */
const { DocumentationStep } = require('./DocumentationStep');
const fs = require('fs').promises;
const path = require('path');

/**
 * Configuration generation workflow step
 */
class ConfigsGenerationStep extends DocumentationStep {
  /**
   * Create a new configuration generation step
   * @param {Object} options - Step options
   */
  constructor(options = {}) {
    super('generate-configs', {
      name: 'configs_generation',
      description: 'Generate project configurations',
      version: '1.0.0',
      ...options
    });
    
    this.configTypes = options.configTypes || ['eslint', 'prettier', 'jest', 'webpack', 'babel', 'typescript', 'docker', 'ci'];
    this.includeScripts = options.includeScripts !== false;
    this.validateConfigs = options.validateConfigs !== false;
    this.logger = options.logger || console;
  }

  /**
   * Execute configuration generation step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Configuration generation result
   */
  async executeStep(context) {
    const projectPath = context.get('projectPath');
    const command = context.get('command');
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }

    this.logger.info('ConfigsGenerationStep: Starting configuration generation', {
      projectPath,
      configTypes: this.configTypes,
      includeScripts: this.includeScripts,
      validateConfigs: this.validateConfigs
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
      
      // Step 4: Detect existing configurations
      const existingConfigs = await this.detectExistingConfigs(projectPath);
      
      // Step 5: Generate configurations based on types
      const results = {};
      
      if (this.configTypes.includes('eslint')) {
        results.eslint = await this.generateESLintConfig(projectPath, projectStructure, options);
      }
      
      if (this.configTypes.includes('prettier')) {
        results.prettier = await this.generatePrettierConfig(projectPath, options);
      }
      
      if (this.configTypes.includes('jest')) {
        results.jest = await this.generateJestConfig(projectPath, projectStructure, options);
      }
      
      if (this.configTypes.includes('webpack')) {
        results.webpack = await this.generateWebpackConfig(projectPath, projectStructure, options);
      }
      
      if (this.configTypes.includes('babel')) {
        results.babel = await this.generateBabelConfig(projectPath, projectStructure, options);
      }
      
      if (this.configTypes.includes('typescript')) {
        results.typescript = await this.generateTypeScriptConfig(projectPath, projectStructure, options);
      }
      
      if (this.configTypes.includes('docker')) {
        results.docker = await this.generateDockerConfig(projectPath, projectStructure, options);
      }
      
      if (this.configTypes.includes('ci')) {
        results.ci = await this.generateCIConfig(projectPath, options);
      }
      
      // Step 6: Update package.json scripts (if enabled)
      let scriptsResults = null;
      if (this.includeScripts) {
        scriptsResults = await this.updatePackageScripts(projectPath, results);
      }
      
      // Step 7: Validate configurations (if enabled)
      let validationResults = null;
      if (this.validateConfigs) {
        validationResults = await this.validateConfigurations(projectPath, results);
      }

      // Step 8: Generate output
      const output = await this.generateOutput({
        command,
        projectStructure,
        existingConfigs,
        results,
        scriptsResults,
        validationResults,
        outputConfig
      });

      // Step 9: Save results
      if (command) {
        await this.saveResults(command, output);
      }

      this.logger.info('ConfigsGenerationStep: Configuration generation completed successfully', {
        projectPath,
        generatedConfigs: Object.keys(results).length,
        totalFiles: this.countGeneratedFiles(results)
      });

      return {
        success: true,
        commandId: command ? command.commandId : null,
        output,
        metadata: this.getMetadata()
      };

    } catch (error) {
      this.logger.error('ConfigsGenerationStep: Configuration generation failed', {
        projectPath,
        error: error.message
      });

      // Publish failure event if event bus is available
      const eventBus = context.get('eventBus');
      if (eventBus) {
        await eventBus.publish('config.generation.failed', {
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
        hasNodeModules: false,
        hasSrc: false,
        hasPublic: false,
        hasDist: false,
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
        
        // Detect frameworks and tools
        if (packageJson.dependencies?.react) structure.frameworks.push('react');
        if (packageJson.dependencies?.vue) structure.frameworks.push('vue');
        if (packageJson.dependencies?.express) structure.frameworks.push('express');
        if (packageJson.dependencies?.next) structure.frameworks.push('next');
      } catch (error) {
        // package.json not found or invalid
      }

      // Check for common directories
      const commonDirs = ['src', 'public', 'dist', 'build', 'node_modules'];
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
      this.logger.warn('ConfigsGenerationStep: Failed to analyze project structure', {
        projectPath,
        error: error.message
      });
      return { type: 'unknown', frameworks: [], dependencies: {}, devDependencies: {}, scripts: {} };
    }
  }

  /**
   * Detect existing configurations
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Existing configurations
   */
  async detectExistingConfigs(projectPath) {
    this.logger.info('ConfigsGenerationStep: Detecting existing configurations...');
    
    const existingConfigs = {
      eslint: false,
      prettier: false,
      jest: false,
      webpack: false,
      babel: false,
      typescript: false,
      docker: false,
      ci: false
    };

    const configFiles = {
      eslint: ['.eslintrc.js', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.yaml'],
      prettier: ['.prettierrc', '.prettierrc.js', '.prettierrc.json'],
      jest: ['jest.config.js', 'jest.config.json'],
      webpack: ['webpack.config.js', 'webpack.config.json'],
      babel: ['.babelrc', '.babelrc.js', '.babelrc.json', 'babel.config.js'],
      typescript: ['tsconfig.json', 'tsconfig.js'],
      docker: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'],
      ci: ['.github/workflows', '.gitlab-ci.yml', '.travis.yml', 'circle.yml']
    };

    for (const [configType, files] of Object.entries(configFiles)) {
      for (const file of files) {
        try {
          await fs.access(path.join(projectPath, file));
          existingConfigs[configType] = true;
          break;
        } catch (error) {
          // File doesn't exist
        }
      }
    }

    return existingConfigs;
  }

  /**
   * Generate ESLint configuration
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} ESLint configuration result
   */
  async generateESLintConfig(projectPath, projectStructure, options) {
    this.logger.info('ConfigsGenerationStep: Generating ESLint configuration...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      const eslintConfig = this.generateESLintConfigContent(projectStructure);
      const eslintConfigPath = path.join(projectPath, '.eslintrc.js');
      await fs.writeFile(eslintConfigPath, eslintConfig);
      
      results.generated.push({
        type: 'eslint',
        path: path.relative(projectPath, eslintConfigPath),
        content: eslintConfig
      });
      
    } catch (error) {
      results.errors.push({
        action: 'generate_eslint_config',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Generate Prettier configuration
   * @param {string} projectPath - Project path
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Prettier configuration result
   */
  async generatePrettierConfig(projectPath, options) {
    this.logger.info('ConfigsGenerationStep: Generating Prettier configuration...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      const prettierConfig = this.generatePrettierConfigContent();
      const prettierConfigPath = path.join(projectPath, '.prettierrc');
      await fs.writeFile(prettierConfigPath, prettierConfig);
      
      results.generated.push({
        type: 'prettier',
        path: path.relative(projectPath, prettierConfigPath),
        content: prettierConfig
      });
      
    } catch (error) {
      results.errors.push({
        action: 'generate_prettier_config',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Generate Jest configuration
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Jest configuration result
   */
  async generateJestConfig(projectPath, projectStructure, options) {
    this.logger.info('ConfigsGenerationStep: Generating Jest configuration...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      const jestConfig = this.generateJestConfigContent(projectStructure);
      const jestConfigPath = path.join(projectPath, 'jest.config.js');
      await fs.writeFile(jestConfigPath, jestConfig);
      
      results.generated.push({
        type: 'jest',
        path: path.relative(projectPath, jestConfigPath),
        content: jestConfig
      });
      
    } catch (error) {
      results.errors.push({
        action: 'generate_jest_config',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Generate Webpack configuration
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Webpack configuration result
   */
  async generateWebpackConfig(projectPath, projectStructure, options) {
    this.logger.info('ConfigsGenerationStep: Generating Webpack configuration...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      const webpackConfig = this.generateWebpackConfigContent(projectStructure);
      const webpackConfigPath = path.join(projectPath, 'webpack.config.js');
      await fs.writeFile(webpackConfigPath, webpackConfig);
      
      results.generated.push({
        type: 'webpack',
        path: path.relative(projectPath, webpackConfigPath),
        content: webpackConfig
      });
      
    } catch (error) {
      results.errors.push({
        action: 'generate_webpack_config',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Generate Babel configuration
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Babel configuration result
   */
  async generateBabelConfig(projectPath, projectStructure, options) {
    this.logger.info('ConfigsGenerationStep: Generating Babel configuration...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      const babelConfig = this.generateBabelConfigContent(projectStructure);
      const babelConfigPath = path.join(projectPath, '.babelrc');
      await fs.writeFile(babelConfigPath, babelConfig);
      
      results.generated.push({
        type: 'babel',
        path: path.relative(projectPath, babelConfigPath),
        content: babelConfig
      });
      
    } catch (error) {
      results.errors.push({
        action: 'generate_babel_config',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Generate TypeScript configuration
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} TypeScript configuration result
   */
  async generateTypeScriptConfig(projectPath, projectStructure, options) {
    this.logger.info('ConfigsGenerationStep: Generating TypeScript configuration...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      const typescriptConfig = this.generateTypeScriptConfigContent(projectStructure);
      const typescriptConfigPath = path.join(projectPath, 'tsconfig.json');
      await fs.writeFile(typescriptConfigPath, typescriptConfig);
      
      results.generated.push({
        type: 'typescript',
        path: path.relative(projectPath, typescriptConfigPath),
        content: typescriptConfig
      });
      
    } catch (error) {
      results.errors.push({
        action: 'generate_typescript_config',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Generate Docker configuration
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Docker configuration result
   */
  async generateDockerConfig(projectPath, projectStructure, options) {
    this.logger.info('ConfigsGenerationStep: Generating Docker configuration...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      // Generate Dockerfile
      const dockerfile = this.generateDockerfileContent(projectStructure);
      const dockerfilePath = path.join(projectPath, 'Dockerfile');
      await fs.writeFile(dockerfilePath, dockerfile);
      
      results.generated.push({
        type: 'dockerfile',
        path: path.relative(projectPath, dockerfilePath),
        content: dockerfile
      });

      // Generate docker-compose.yml
      const dockerCompose = this.generateDockerComposeContent(projectStructure);
      const dockerComposePath = path.join(projectPath, 'docker-compose.yml');
      await fs.writeFile(dockerComposePath, dockerCompose);
      
      results.generated.push({
        type: 'docker_compose',
        path: path.relative(projectPath, dockerComposePath),
        content: dockerCompose
      });
      
    } catch (error) {
      results.errors.push({
        action: 'generate_docker_config',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Generate CI configuration
   * @param {string} projectPath - Project path
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} CI configuration result
   */
  async generateCIConfig(projectPath, options) {
    this.logger.info('ConfigsGenerationStep: Generating CI configuration...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      // Create .github/workflows directory
      const workflowsDir = path.join(projectPath, '.github', 'workflows');
      await fs.mkdir(workflowsDir, { recursive: true });

      // Generate GitHub Actions workflow
      const githubWorkflow = this.generateGitHubWorkflowContent();
      const githubWorkflowPath = path.join(workflowsDir, 'ci.yml');
      await fs.writeFile(githubWorkflowPath, githubWorkflow);
      
      results.generated.push({
        type: 'github_workflow',
        path: path.relative(projectPath, githubWorkflowPath),
        content: githubWorkflow
      });
      
    } catch (error) {
      results.errors.push({
        action: 'generate_ci_config',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Update package.json scripts
   * @param {string} projectPath - Project path
   * @param {Object} configResults - Configuration results
   * @returns {Promise<Object>} Package scripts update result
   */
  async updatePackageScripts(projectPath, configResults) {
    this.logger.info('ConfigsGenerationStep: Updating package.json scripts...');
    
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

  /**
   * Validate configurations
   * @param {string} projectPath - Project path
   * @param {Object} configResults - Configuration results
   * @returns {Promise<Object>} Configuration validation result
   */
  async validateConfigurations(projectPath, configResults) {
    this.logger.info('ConfigsGenerationStep: Validating configurations...');
    
    const results = {
      validated: [],
      errors: []
    };

    try {
      // Validate each configuration file
      for (const [configType, configResult] of Object.entries(configResults)) {
        if (configResult.generated) {
          for (const config of configResult.generated) {
            try {
              const configPath = path.join(projectPath, config.path);
              await fs.access(configPath);
              
              // Check if config file is valid JSON/JS
              const stats = await fs.stat(configPath);
              
              results.validated.push({
                type: config.type,
                path: config.path,
                exists: true,
                size: stats.size
              });
            } catch (error) {
              results.errors.push({
                type: config.type,
                path: config.path,
                error: error.message
              });
            }
          }
        }
      }
    } catch (error) {
      results.errors.push({
        action: 'validate_configurations',
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
    const { command, projectStructure, existingConfigs, results, scriptsResults, validationResults, outputConfig } = params;
    
    const output = {
      generatedFiles: [],
      metadata: {
        projectType: projectStructure.type,
        frameworks: projectStructure.frameworks,
        configTypes: this.configTypes,
        existingConfigs,
        totalConfigs: 0,
        successfulConfigs: 0,
        failedConfigs: 0
      },
      statistics: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 0
      }
    };

    // Collect generated files
    for (const [configType, configResult] of Object.entries(results)) {
      if (configResult.generated) {
        output.generatedFiles.push(...configResult.generated);
        output.metadata.totalConfigs += configResult.generated.length;
        output.metadata.successfulConfigs += configResult.generated.length;
      }
      if (configResult.errors) {
        output.metadata.failedConfigs += configResult.errors.length;
      }
    }

    // Add package.json update info
    if (scriptsResults && scriptsResults.updated) {
      output.generatedFiles.push({
        type: 'package_scripts',
        path: scriptsResults.path,
        content: 'Package.json scripts updated'
      });
    }

    // Add validation results
    if (validationResults) {
      output.validation = validationResults;
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
    this.logger.info('ConfigsGenerationStep: Results saved', {
      commandId: command.commandId,
      totalFiles: output.generatedFiles.length,
      successfulConfigs: output.metadata.successfulConfigs,
      failedConfigs: output.metadata.failedConfigs
    });
  }

  /**
   * Get default options
   * @returns {Object} Default options
   */
  getDefaultOptions() {
    return {
      configTypes: this.configTypes,
      includeScripts: this.includeScripts,
      validateConfigs: this.validateConfigs
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
    for (const [configType, configResult] of Object.entries(results)) {
      if (configResult.generated) {
        count += configResult.generated.length;
      }
    }
    return count;
  }

  // Configuration content generation methods
  generateESLintConfigContent(projectStructure) {
    return `module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    ${projectStructure.frameworks.includes('react') ? "'plugin:react/recommended'," : ''}
    ${projectStructure.frameworks.includes('vue') ? "'plugin:vue/recommended'," : ''}
    ${projectStructure.hasTypeScript ? "'@typescript-eslint/recommended'," : ''}
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ${projectStructure.hasTypeScript ? "parser: '@typescript-eslint/parser'," : ''}
  },
  plugins: [
    ${projectStructure.frameworks.includes('react') ? "'react'," : ''}
    ${projectStructure.frameworks.includes('vue') ? "'vue'," : ''}
    ${projectStructure.hasTypeScript ? "'@typescript-eslint'," : ''}
  ],
  rules: {
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
  },
};`;
  }

  generatePrettierConfigContent() {
    return `{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}`;
  }

  generateJestConfigContent(projectStructure) {
    return `module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};`;
  }

  generateWebpackConfigContent(projectStructure) {
    return `const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\\.js$/,
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
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 3000,
  },
};`;
  }

  generateBabelConfigContent(projectStructure) {
    return `{
  "presets": [
    ["@babel/preset-env", {
      "targets": {
        "node": "current"
      }
    }]
    ${projectStructure.frameworks.includes('react') ? ',\n    "@babel/preset-react"' : ''}
    ${projectStructure.hasTypeScript ? ',\n    "@babel/preset-typescript"' : ''}
  ],
  "plugins": [
    ${projectStructure.frameworks.includes('react') ? '"@babel/plugin-proposal-class-properties",' : ''}
  ]
}`;
  }

  generateTypeScriptConfigContent(projectStructure) {
    return `{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "lib": ["es2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}`;
  }

  generateDockerfileContent(projectStructure) {
    return `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

${projectStructure.type === 'frontend' ? `
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]` : `
EXPOSE 3000

CMD ["npm", "start"]`}`;
  }

  generateDockerComposeContent(projectStructure) {
    return `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - .:/app
      - /app/node_modules
    ${projectStructure.type === 'fullstack' ? `
  database:
    image: postgres:13
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"` : ''}

volumes:
  postgres_data:`;
  }

  generateGitHubWorkflowContent() {
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
    - run: npm test
    - run: npm run build`;
  }

  /**
   * Validate configuration generation step
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
      return new ValidationResult(false, ['Project path is required for configuration generation']);
    }

    // Validate configuration types
    const validConfigTypes = [
      'eslint', 'prettier', 'jest', 'webpack', 'babel', 'typescript', 'docker', 'ci'
    ];

    for (const configType of this.configTypes) {
      if (!validConfigTypes.includes(configType)) {
        return new ValidationResult(false, [`Invalid configuration type: ${configType}`]);
      }
    }

    return new ValidationResult(true, []);
  }

  /**
   * Get step metadata
   * @returns {Object} Step metadata
   */
  getMetadata() {
    return {
      name: 'ConfigsGenerationStep',
      description: 'Generate project configurations',
      version: '1.0.0',
      type: 'generate',
      configTypes: this.configTypes,
      includeScripts: this.includeScripts,
      validateConfigs: this.validateConfigs,
      dependencies: ['fs', 'path', 'DocumentationStep']
    };
  }
}

module.exports = ConfigsGenerationStep; 