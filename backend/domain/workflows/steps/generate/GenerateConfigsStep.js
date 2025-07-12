/**
 * GenerateConfigsStep - Configuration generation workflow step
 * 
 * This step handles configuration file generation operations, migrating the logic from
 * GenerateConfigsHandler to the unified workflow system. It provides
 * validation, complexity management, and performance optimization for configuration generation.
 */
const BaseWorkflowStep = require('../BaseWorkflowStep');
const fs = require('fs').promises;
const path = require('path');

/**
 * Configuration generation workflow step
 */
class GenerateConfigsStep extends BaseWorkflowStep {
  /**
   * Create a new configuration generation step
   * @param {Object} options - Step options
   */
  constructor(options = {}) {
    super('GenerateConfigsStep', 'Generate project configurations', 'configuration');
    
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

    this.logger.info('GenerateConfigsStep: Starting configuration generation', {
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

      this.logger.info('GenerateConfigsStep: Configuration generation completed successfully', {
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
      this.logger.error('GenerateConfigsStep: Configuration generation failed', {
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
        if (packageJson.devDependencies?.webpack) structure.hasWebpack = true;
        if (packageJson.devDependencies?.babel) structure.hasBabel = true;
        if (packageJson.devDependencies?.typescript) structure.hasTypeScript = true;
        if (packageJson.devDependencies?.jest) structure.hasJest = true;
        if (packageJson.devDependencies?.eslint) structure.hasESLint = true;
        if (packageJson.devDependencies?.prettier) structure.hasPrettier = true;
      } catch (error) {
        // package.json not found or invalid
      }

      // Check for common directories
      const commonDirs = ['src', 'public', 'dist', 'build', 'node_modules'];
      for (const dir of commonDirs) {
        try {
          await fs.access(path.join(projectPath, dir));
          if (dir === 'src') structure.hasSrc = true;
          if (dir === 'public') structure.hasPublic = true;
          if (dir === 'dist') structure.hasDist = true;
          if (dir === 'node_modules') structure.hasNodeModules = true;
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
   * Detect existing configurations
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Existing configurations
   */
  async detectExistingConfigs(projectPath) {
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

    const configFiles = [
      '.eslintrc.js', '.eslintrc.json', '.eslintrc',
      '.prettierrc', '.prettierrc.js', '.prettierrc.json',
      'jest.config.js', 'jest.config.json',
      'webpack.config.js', 'webpack.config.ts',
      '.babelrc', '.babelrc.js', 'babel.config.js',
      'tsconfig.json', 'tsconfig.js',
      'Dockerfile', 'docker-compose.yml',
      '.github/workflows', '.gitlab-ci.yml', '.travis.yml'
    ];

    for (const file of configFiles) {
      try {
        await fs.access(path.join(projectPath, file));
        
        if (file.includes('eslint')) existingConfigs.eslint = true;
        if (file.includes('prettier')) existingConfigs.prettier = true;
        if (file.includes('jest')) existingConfigs.jest = true;
        if (file.includes('webpack')) existingConfigs.webpack = true;
        if (file.includes('babel')) existingConfigs.babel = true;
        if (file.includes('tsconfig')) existingConfigs.typescript = true;
        if (file.includes('Docker')) existingConfigs.docker = true;
        if (file.includes('workflows') || file.includes('ci')) existingConfigs.ci = true;
      } catch (error) {
        // File doesn't exist
      }
    }

    return existingConfigs;
  }

  /**
   * Generate ESLint configuration
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} ESLint config results
   */
  async generateESLintConfig(projectPath, projectStructure, options) {
    const results = {
      files: []
    };

    try {
      const configContent = this.generateESLintConfigContent(projectStructure);
      const configPath = path.join(projectPath, '.eslintrc.js');
      await fs.writeFile(configPath, configContent);
      results.files.push(configPath);

      return results;
    } catch (error) {
      this.logger.error('Failed to generate ESLint config:', error.message);
      throw error;
    }
  }

  /**
   * Generate Prettier configuration
   * @param {string} projectPath - Project path
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Prettier config results
   */
  async generatePrettierConfig(projectPath, options) {
    const results = {
      files: []
    };

    try {
      const configContent = this.generatePrettierConfigContent();
      const configPath = path.join(projectPath, '.prettierrc');
      await fs.writeFile(configPath, configContent);
      results.files.push(configPath);

      return results;
    } catch (error) {
      this.logger.error('Failed to generate Prettier config:', error.message);
      throw error;
    }
  }

  /**
   * Generate Jest configuration
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Jest config results
   */
  async generateJestConfig(projectPath, projectStructure, options) {
    const results = {
      files: []
    };

    try {
      const configContent = this.generateJestConfigContent(projectStructure);
      const configPath = path.join(projectPath, 'jest.config.js');
      await fs.writeFile(configPath, configContent);
      results.files.push(configPath);

      return results;
    } catch (error) {
      this.logger.error('Failed to generate Jest config:', error.message);
      throw error;
    }
  }

  /**
   * Generate Webpack configuration
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Webpack config results
   */
  async generateWebpackConfig(projectPath, projectStructure, options) {
    const results = {
      files: []
    };

    try {
      const configContent = this.generateWebpackConfigContent(projectStructure);
      const configPath = path.join(projectPath, 'webpack.config.js');
      await fs.writeFile(configPath, configContent);
      results.files.push(configPath);

      return results;
    } catch (error) {
      this.logger.error('Failed to generate Webpack config:', error.message);
      throw error;
    }
  }

  /**
   * Generate Babel configuration
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Babel config results
   */
  async generateBabelConfig(projectPath, projectStructure, options) {
    const results = {
      files: []
    };

    try {
      const configContent = this.generateBabelConfigContent(projectStructure);
      const configPath = path.join(projectPath, 'babel.config.js');
      await fs.writeFile(configPath, configContent);
      results.files.push(configPath);

      return results;
    } catch (error) {
      this.logger.error('Failed to generate Babel config:', error.message);
      throw error;
    }
  }

  /**
   * Generate TypeScript configuration
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} TypeScript config results
   */
  async generateTypeScriptConfig(projectPath, projectStructure, options) {
    const results = {
      files: []
    };

    try {
      const configContent = this.generateTypeScriptConfigContent(projectStructure);
      const configPath = path.join(projectPath, 'tsconfig.json');
      await fs.writeFile(configPath, configContent);
      results.files.push(configPath);

      return results;
    } catch (error) {
      this.logger.error('Failed to generate TypeScript config:', error.message);
      throw error;
    }
  }

  /**
   * Generate Docker configuration
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Docker config results
   */
  async generateDockerConfig(projectPath, projectStructure, options) {
    const results = {
      files: []
    };

    try {
      // Generate Dockerfile
      const dockerfileContent = this.generateDockerfileContent(projectStructure);
      const dockerfilePath = path.join(projectPath, 'Dockerfile');
      await fs.writeFile(dockerfilePath, dockerfileContent);
      results.files.push(dockerfilePath);

      // Generate docker-compose.yml
      const composeContent = this.generateDockerComposeContent(projectStructure);
      const composePath = path.join(projectPath, 'docker-compose.yml');
      await fs.writeFile(composePath, composeContent);
      results.files.push(composePath);

      return results;
    } catch (error) {
      this.logger.error('Failed to generate Docker config:', error.message);
      throw error;
    }
  }

  /**
   * Generate CI configuration
   * @param {string} projectPath - Project path
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} CI config results
   */
  async generateCIConfig(projectPath, options) {
    const results = {
      files: []
    };

    try {
      // Create .github/workflows directory
      const workflowsDir = path.join(projectPath, '.github', 'workflows');
      try {
        await fs.access(workflowsDir);
      } catch (error) {
        await fs.mkdir(workflowsDir, { recursive: true });
      }

      // Generate GitHub workflow
      const workflowContent = this.generateGitHubWorkflowContent();
      const workflowPath = path.join(workflowsDir, 'ci.yml');
      await fs.writeFile(workflowPath, workflowContent);
      results.files.push(workflowPath);

      return results;
    } catch (error) {
      this.logger.error('Failed to generate CI config:', error.message);
      throw error;
    }
  }

  /**
   * Update package.json scripts
   * @param {string} projectPath - Project path
   * @param {Object} configResults - Configuration results
   * @returns {Promise<Object>} Scripts update results
   */
  async updatePackageScripts(projectPath, configResults) {
    const results = {
      updated: false,
      scripts: {}
    };

    try {
      const packagePath = path.join(projectPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
      
      const newScripts = {
        ...packageJson.scripts
      };

      // Add ESLint scripts
      if (configResults.eslint) {
        newScripts.lint = 'eslint src/**/*.js';
        newScripts['lint:fix'] = 'eslint src/**/*.js --fix';
      }

      // Add Prettier scripts
      if (configResults.prettier) {
        newScripts.format = 'prettier --write src/**/*.js';
        newScripts['format:check'] = 'prettier --check src/**/*.js';
      }

      // Add Jest scripts
      if (configResults.jest) {
        newScripts.test = 'jest';
        newScripts['test:watch'] = 'jest --watch';
        newScripts['test:coverage'] = 'jest --coverage';
      }

      // Add Webpack scripts
      if (configResults.webpack) {
        newScripts.build = 'webpack --mode production';
        newScripts.dev = 'webpack --mode development --watch';
      }

      // Update package.json
      packageJson.scripts = newScripts;
      await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2));
      
      results.updated = true;
      results.scripts = newScripts;

      return results;
    } catch (error) {
      this.logger.error('Failed to update package.json scripts:', error.message);
      throw error;
    }
  }

  /**
   * Validate configurations
   * @param {string} projectPath - Project path
   * @param {Object} configResults - Configuration results
   * @returns {Promise<Object>} Validation results
   */
  async validateConfigurations(projectPath, configResults) {
    const results = {
      valid: true,
      errors: [],
      warnings: []
    };

    try {
      // Validate ESLint config
      if (configResults.eslint) {
        try {
          const eslintPath = path.join(projectPath, '.eslintrc.js');
          await fs.access(eslintPath);
          // Basic validation - file exists
        } catch (error) {
          results.errors.push('ESLint configuration file not found');
          results.valid = false;
        }
      }

      // Validate other configs similarly
      // This is a simplified validation - in a real implementation,
      // you would validate the actual configuration content

      return results;
    } catch (error) {
      this.logger.error('Failed to validate configurations:', error.message);
      throw error;
    }
  }

  /**
   * Generate output
   * @param {Object} params - Output parameters
   * @returns {Promise<Object>} Generated output
   */
  async generateOutput(params) {
    const { command, projectStructure, existingConfigs, results, scriptsResults, validationResults, outputConfig } = params;

    return {
      success: true,
      projectPath: command ? command.projectPath : null,
      commandId: command ? command.commandId : null,
      timestamp: new Date(),
      summary: {
        totalConfigs: Object.keys(results).length,
        totalFiles: this.countGeneratedFiles(results),
        existingConfigs: Object.values(existingConfigs).filter(Boolean).length,
        scriptsUpdated: scriptsResults ? scriptsResults.updated : false,
        validationPassed: validationResults ? validationResults.valid : true
      },
      details: {
        projectStructure,
        existingConfigs,
        results,
        scriptsResults,
        validationResults
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
    this.logger.info('Configuration generation results saved', {
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
      configTypes: ['eslint', 'prettier', 'jest', 'webpack', 'babel', 'typescript', 'docker', 'ci'],
      includeScripts: true,
      validateConfigs: true
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

  // Configuration content generation methods
  generateESLintConfigContent(projectStructure) {
    return `/**
 * ESLint Configuration
 * Generated by GenerateConfigsStep
 */

module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    ${projectStructure.frameworks.includes('react') ? "'plugin:react/recommended'," : ''}
    ${projectStructure.frameworks.includes('vue') ? "'plugin:vue/recommended'," : ''}
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
  },
};
`;
  }

  generatePrettierConfigContent() {
    return `{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
`;
  }

  generateJestConfigContent(projectStructure) {
    return `/**
 * Jest Configuration
 * Generated by GenerateConfigsStep
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

  generateWebpackConfigContent(projectStructure) {
    return `/**
 * Webpack Configuration
 * Generated by GenerateConfigsStep
 */

const path = require('path');

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
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  devServer: {
    static: './dist',
    hot: true,
  },
};
`;
  }

  generateBabelConfigContent(projectStructure) {
    return `/**
 * Babel Configuration
 * Generated by GenerateConfigsStep
 */

module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current',
      },
    }],
    ${projectStructure.frameworks.includes('react') ? "'@babel/preset-react'," : ''}
    ${projectStructure.hasTypeScript ? "'@babel/preset-typescript'," : ''}
  ],
  plugins: [
    // Add any additional plugins here
  ],
};
`;
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
    "dist",
    "**/*.test.js",
    "**/*.spec.js"
  ]
}
`;
  }

  generateDockerfileContent(projectStructure) {
    return `# Dockerfile
# Generated by GenerateConfigsStep

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

${projectStructure.hasWebpack ? 'RUN npm run build' : ''}

EXPOSE 3000

CMD ["npm", "start"]
`;
  }

  generateDockerComposeContent(projectStructure) {
    return `# docker-compose.yml
# Generated by GenerateConfigsStep

version: '3.8'

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

  ${projectStructure.hasDatabase ? `database:
    image: postgres:13
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:` : ''}
`;
  }

  generateGitHubWorkflowContent() {
    return `# GitHub Actions CI/CD
# Generated by GenerateConfigsStep

name: CI/CD

on:
  push:
    branches: [ main, develop ]
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
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run tests
      run: npm test
    
    - name: Build
      run: npm run build
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
      name: 'GenerateConfigsStep',
      description: 'Generate project configurations',
      version: '1.0.0',
      type: 'generate-configs',
      category: 'configuration',
      complexity: 'medium',
      dependencies: ['projectPath'],
      options: {
        configTypes: this.configTypes,
        includeScripts: this.includeScripts,
        validateConfigs: this.validateConfigs
      }
    };
  }
}

module.exports = GenerateConfigsStep; 