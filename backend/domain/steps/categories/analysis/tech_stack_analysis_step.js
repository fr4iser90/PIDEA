/**
 * Tech Stack Analysis Step - Core Analysis Step
 * Analyzes technology stack and frameworks used
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('tech_stack_analysis_step');

// Step configuration
const config = {
  name: 'TechStackAnalysisStep',
  type: 'analysis',
  description: 'Analyzes technology stack and frameworks used',
  category: 'analysis',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 45000,
    includeTechnologies: true,
    includeFrameworks: true,
    includeTools: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class TechStackAnalysisStep {
  constructor() {
    this.name = 'TechStackAnalysisStep';
    this.description = 'Analyzes technology stack and frameworks used';
    this.category = 'analysis';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = TechStackAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);

      const projectPath = context.projectPath;
      
      logger.info(`📊 Starting tech stack analysis for: ${projectPath}`);

      // Execute tech stack analysis
      const techStack = await this.analyzeTechStack(projectPath, {
        includeTechnologies: context.includeTechnologies !== false,
        includeFrameworks: context.includeFrameworks !== false,
        includeTools: context.includeTools !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(techStack);

      logger.info(`✅ Tech stack analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: this.name,
          projectPath,
          analysisType: 'techstack',
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Tech stack analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: this.name,
          projectPath: context.projectPath,
          analysisType: 'techstack',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Analyze tech stack for a project
   * @param {string} projectPath - Path to the project
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Tech stack analysis result
   */
  async analyzeTechStack(projectPath, options = {}) {
    try {
      const result = {
        technologies: [],
        frameworks: [],
        tools: [],
        summary: {}
      };

      // Analyze package.json dependencies
      const dependencyAnalysis = await this.analyzeDependencies(projectPath);
      
      // Analyze configuration files
      const configAnalysis = await this.analyzeConfigurationFiles(projectPath);
      
      // Analyze code patterns
      const codeAnalysis = await this.analyzeCodePatterns(projectPath);
      
      // Analyze build tools
      const buildAnalysis = await this.analyzeBuildTools(projectPath);

      // Aggregate technologies
      if (options.includeTechnologies) {
        result.technologies = [
          ...dependencyAnalysis.technologies,
          ...configAnalysis.technologies,
          ...codeAnalysis.technologies,
          ...buildAnalysis.technologies
        ];
      }

      // Aggregate frameworks
      if (options.includeFrameworks) {
        result.frameworks = [
          ...dependencyAnalysis.frameworks,
          ...configAnalysis.frameworks,
          ...codeAnalysis.frameworks,
          ...buildAnalysis.frameworks
        ];
      }

      // Aggregate tools
      if (options.includeTools) {
        result.tools = [
          ...dependencyAnalysis.tools,
          ...configAnalysis.tools,
          ...codeAnalysis.tools,
          ...buildAnalysis.tools
        ];
      }

      // Create summary
      result.summary = {
        totalTechnologies: result.technologies.length,
        totalFrameworks: result.frameworks.length,
        totalTools: result.tools.length,
        primaryLanguage: this.determinePrimaryLanguage(result),
        stackType: this.determineStackType(result),
        complexity: this.calculateComplexity(result)
      };

      return result;

    } catch (error) {
      logger.error(`Tech stack analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze dependencies from package.json
   */
  async analyzeDependencies(projectPath) {
    try {
      const technologies = [];
      const frameworks = [];
      const tools = [];
      const packageJsonPath = path.join(projectPath, 'package.json');

      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

        // Categorize dependencies
        Object.keys(dependencies).forEach(dep => {
          const depInfo = this.categorizeDependency(dep, dependencies[dep]);
          
          if (depInfo.category === 'technology') {
            technologies.push(depInfo);
          } else if (depInfo.category === 'framework') {
            frameworks.push(depInfo);
          } else if (depInfo.category === 'tool') {
            tools.push(depInfo);
          }
        });

        // Add Node.js as base technology
        technologies.push({
          name: 'Node.js',
          version: process.version,
          category: 'runtime',
          type: 'technology',
          confidence: 'high'
        });

      } catch (error) {
        logger.error(`Could not read package.json: ${error.message}`);
      }

      return { technologies, frameworks, tools };
    } catch (error) {
      logger.error(`Dependency analysis failed: ${error.message}`);
      return { technologies: [], frameworks: [], tools: [] };
    }
  }

  /**
   * Analyze configuration files
   */
  async analyzeConfigurationFiles(projectPath) {
    try {
      const technologies = [];
      const frameworks = [];
      const tools = [];

      // Common configuration files and their associated technologies
      const configFiles = [
        { file: 'tsconfig.json', tech: 'TypeScript', category: 'language' },
        { file: 'babel.config.js', tech: 'Babel', category: 'tool' },
        { file: 'webpack.config.js', tech: 'Webpack', category: 'tool' },
        { file: 'vite.config.js', tech: 'Vite', category: 'tool' },
        { file: 'rollup.config.js', tech: 'Rollup', category: 'tool' },
        { file: 'jest.config.js', tech: 'Jest', category: 'tool' },
        { file: 'mocha.opts', tech: 'Mocha', category: 'tool' },
        { file: 'eslint.config.js', tech: 'ESLint', category: 'tool' },
        { file: 'prettier.config.js', tech: 'Prettier', category: 'tool' },
        { file: 'tailwind.config.js', tech: 'Tailwind CSS', category: 'framework' },
        { file: 'next.config.js', tech: 'Next.js', category: 'framework' },
        { file: 'nuxt.config.js', tech: 'Nuxt.js', category: 'framework' },
        { file: 'angular.json', tech: 'Angular', category: 'framework' },
        { file: 'vue.config.js', tech: 'Vue.js', category: 'framework' },
        { file: 'react-scripts', tech: 'Create React App', category: 'framework' }
      ];

      for (const configFile of configFiles) {
        const configPath = path.join(projectPath, configFile.file);
        try {
          await fs.access(configPath);
          
          const techInfo = {
            name: configFile.tech,
            version: 'unknown',
            category: configFile.category,
            type: configFile.category === 'framework' ? 'framework' : 'tool',
            confidence: 'high',
            evidence: `Configuration file: ${configFile.file}`
          };

          if (configFile.category === 'framework') {
            frameworks.push(techInfo);
          } else if (configFile.category === 'tool') {
            tools.push(techInfo);
          } else {
            technologies.push(techInfo);
          }
        } catch (error) {
          // File doesn't exist
        }
      }

      return { technologies, frameworks, tools };
    } catch (error) {
      logger.error(`Configuration analysis failed: ${error.message}`);
      return { technologies: [], frameworks: [], tools: [] };
    }
  }

  /**
   * Analyze code patterns for technology detection
   */
  async analyzeCodePatterns(projectPath) {
    try {
      const technologies = [];
      const frameworks = [];
      const tools = [];
      const jsFiles = await this.getJavaScriptFiles(projectPath);

      for (const file of jsFiles.slice(0, 20)) { // Limit for performance
        try {
          const content = await fs.readFile(file, 'utf8');
          const fileTechs = this.detectTechnologiesInCode(content, file);
          
          technologies.push(...fileTechs.technologies);
          frameworks.push(...fileTechs.frameworks);
          tools.push(...fileTechs.tools);
        } catch (error) {
          // Skip files that can't be read
        }
      }

      // Remove duplicates
      const uniqueTechnologies = this.removeDuplicates(technologies);
      const uniqueFrameworks = this.removeDuplicates(frameworks);
      const uniqueTools = this.removeDuplicates(tools);

      return { 
        technologies: uniqueTechnologies, 
        frameworks: uniqueFrameworks, 
        tools: uniqueTools 
      };
    } catch (error) {
      logger.error(`Code pattern analysis failed: ${error.message}`);
      return { technologies: [], frameworks: [], tools: [] };
    }
  }

  /**
   * Analyze build tools
   */
  async analyzeBuildTools(projectPath) {
    try {
      const technologies = [];
      const frameworks = [];
      const tools = [];

      // Check for build scripts in package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        
        if (packageJson.scripts) {
          const scripts = Object.values(packageJson.scripts).join(' ');
          
          // Detect build tools from scripts
          if (scripts.includes('webpack')) {
            tools.push({
              name: 'Webpack',
              version: 'unknown',
              category: 'build',
              type: 'tool',
              confidence: 'high',
              evidence: 'Found in build scripts'
            });
          }
          
          if (scripts.includes('vite')) {
            tools.push({
              name: 'Vite',
              version: 'unknown',
              category: 'build',
              type: 'tool',
              confidence: 'high',
              evidence: 'Found in build scripts'
            });
          }
          
          if (scripts.includes('rollup')) {
            tools.push({
              name: 'Rollup',
              version: 'unknown',
              category: 'build',
              type: 'tool',
              confidence: 'high',
              evidence: 'Found in build scripts'
            });
          }
        }
      } catch (error) {
        // Could not read package.json
      }

      return { technologies, frameworks, tools };
    } catch (error) {
      logger.error(`Build tools analysis failed: ${error.message}`);
      return { technologies: [], frameworks: [], tools: [] };
    }
  }

  /**
   * Categorize a dependency
   */
  categorizeDependency(name, version) {
    const depName = name.toLowerCase();
    
    // Framework detection
    const frameworks = [
      'react', 'vue', 'angular', 'express', 'nest', 'next', 'nuxt', 'gatsby',
      'svelte', 'ember', 'backbone', 'meteor', 'fastify', 'koa', 'hapi'
    ];
    
    if (frameworks.some(fw => depName.includes(fw))) {
      return {
        name: this.capitalizeFirst(name),
        version,
        category: 'framework',
        type: 'framework',
        confidence: 'high'
      };
    }

    // Tool detection
    const tools = [
      'webpack', 'vite', 'rollup', 'babel', 'eslint', 'prettier', 'jest',
      'mocha', 'chai', 'cypress', 'playwright', 'storybook', 'lerna',
      'husky', 'lint-staged', 'commitizen'
    ];
    
    if (tools.some(tool => depName.includes(tool))) {
      return {
        name: this.capitalizeFirst(name),
        version,
        category: 'tool',
        type: 'tool',
        confidence: 'high'
      };
    }

    // Technology detection
    const technologies = [
      'typescript', 'javascript', 'node', 'npm', 'yarn', 'pnpm',
      'css', 'scss', 'sass', 'less', 'stylus', 'postcss',
      'html', 'markdown', 'json', 'xml', 'yaml'
    ];
    
    if (technologies.some(tech => depName.includes(tech))) {
      return {
        name: this.capitalizeFirst(name),
        version,
        category: 'technology',
        type: 'technology',
        confidence: 'medium'
      };
    }

    // Default to technology
    return {
      name: this.capitalizeFirst(name),
      version,
      category: 'library',
      type: 'technology',
      confidence: 'low'
    };
  }

  /**
   * Detect technologies in code content
   */
  detectTechnologiesInCode(content, filePath) {
    const technologies = [];
    const frameworks = [];
    const tools = [];

    // React detection
    if (content.includes('import React') || content.includes('from \'react\'') || content.includes('React.')) {
      frameworks.push({
        name: 'React',
        version: 'unknown',
        category: 'frontend',
        type: 'framework',
        confidence: 'high',
        evidence: `Found in ${path.basename(filePath)}`
      });
    }

    // Vue detection
    if (content.includes('import Vue') || content.includes('from \'vue\'') || content.includes('Vue.')) {
      frameworks.push({
        name: 'Vue.js',
        version: 'unknown',
        category: 'frontend',
        type: 'framework',
        confidence: 'high',
        evidence: `Found in ${path.basename(filePath)}`
      });
    }

    // Angular detection
    if (content.includes('@angular') || content.includes('import {') && content.includes('} from \'@angular\'')) {
      frameworks.push({
        name: 'Angular',
        version: 'unknown',
        category: 'frontend',
        type: 'framework',
        confidence: 'high',
        evidence: `Found in ${path.basename(filePath)}`
      });
    }

    // Express detection
    if (content.includes('const express') || content.includes('require(\'express\')')) {
      frameworks.push({
        name: 'Express.js',
        version: 'unknown',
        category: 'backend',
        type: 'framework',
        confidence: 'high',
        evidence: `Found in ${path.basename(filePath)}`
      });
    }

    // TypeScript detection
    if (content.includes(': string') || content.includes(': number') || content.includes(': boolean') || 
        content.includes('interface ') || content.includes('type ') || content.includes('enum ')) {
      technologies.push({
        name: 'TypeScript',
        version: 'unknown',
        category: 'language',
        type: 'technology',
        confidence: 'high',
        evidence: `Found in ${path.basename(filePath)}`
      });
    }

    // CSS-in-JS detection
    if (content.includes('styled-components') || content.includes('emotion') || content.includes('@emotion')) {
      technologies.push({
        name: 'CSS-in-JS',
        version: 'unknown',
        category: 'styling',
        type: 'technology',
        confidence: 'medium',
        evidence: `Found in ${path.basename(filePath)}`
      });
    }

    return { technologies, frameworks, tools };
  }

  /**
   * Remove duplicate technologies
   */
  removeDuplicates(items) {
    const seen = new Set();
    return items.filter(item => {
      const key = item.name.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Determine primary language
   */
  determinePrimaryLanguage(result) {
    const languages = result.technologies.filter(tech => tech.category === 'language');
    
    if (languages.length === 0) {
      return 'JavaScript';
    }
    
    // Prefer TypeScript over JavaScript
    const typescript = languages.find(lang => lang.name === 'TypeScript');
    if (typescript) {
      return 'TypeScript';
    }
    
    return languages[0].name;
  }

  /**
   * Determine stack type
   */
  determineStackType(result) {
    const frontendFrameworks = result.frameworks.filter(fw => fw.category === 'frontend');
    const backendFrameworks = result.frameworks.filter(fw => fw.category === 'backend');
    
    if (frontendFrameworks.length > 0 && backendFrameworks.length > 0) {
      return 'fullstack';
    } else if (frontendFrameworks.length > 0) {
      return 'frontend';
    } else if (backendFrameworks.length > 0) {
      return 'backend';
    } else {
      return 'library';
    }
  }

  /**
   * Calculate complexity
   */
  calculateComplexity(result) {
    const totalItems = result.technologies.length + result.frameworks.length + result.tools.length;
    
    if (totalItems > 20) {
      return 'high';
    } else if (totalItems > 10) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Capitalize first letter
   */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Helper methods
  async getJavaScriptFiles(projectPath) {
    const allFiles = await this.getAllFiles(projectPath);
    return allFiles.filter(file => 
      file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')
    );
  }

  async getAllFiles(dir) {
    const files = [];
    try {
      const items = await fs.readdir(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        if (stat.isFile()) {
          files.push(fullPath);
        } else if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          files.push(...(await this.getAllFiles(fullPath)));
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
    return files;
  }

  cleanResult(result) {
    if (!result) return null;
    
    // Remove sensitive information and large objects
    const clean = { ...result };
    
    // Remove internal properties
    delete clean._internal;
    delete clean.debug;
    
    return clean;
  }

  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required for tech stack analysis');
    }
  }
}

// Create instance for execution
const stepInstance = new TechStackAnalysisStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 