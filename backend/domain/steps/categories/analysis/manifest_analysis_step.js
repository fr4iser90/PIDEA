/**
 * Manifest Analysis Step - Core Analysis Step
 * Analyzes project manifests and configuration files
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('manifest_analysis_step');
const fs = require('fs').promises;
const path = require('path');

// Step configuration
const config = {
  name: 'ManifestAnalysisStep',
  type: 'analysis',
  description: 'Analyzes project manifests and configuration files',
  category: 'analysis',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 15000,
    includePackageJson: true,
    includeConfigFiles: true,
    includeDockerFiles: true,
    includeCIFiles: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class ManifestAnalysisStep {
  constructor() {
    this.name = 'ManifestAnalysisStep';
    this.description = 'Analyzes project manifests and configuration files';
    this.category = 'analysis';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = ManifestAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`📋 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const projectPath = context.projectPath;
      
      logger.info(`📊 Starting manifest analysis for: ${projectPath}`);

      // Get manifest analyzer from context via dependency injection
      let manifestAnalyzer = context.manifestAnalyzer;
      if (!manifestAnalyzer) {
        manifestAnalyzer = context.getService('manifestAnalyzer');
      }
      
      if (!manifestAnalyzer) {
        throw new Error('Manifest analyzer not available in context');
      }

      // Analyze manifests
      const manifestAnalysis = await this.analyzeManifests(projectPath, context);

      logger.info(`✅ Manifest analysis completed successfully`);

      return {
        success: true,
        result: manifestAnalysis,
        metadata: {
          stepName: this.name,
          projectPath,
          analysisType: 'manifest',
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Manifest analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: this.name,
          projectPath: context.projectPath,
          analysisType: 'manifest',
          timestamp: new Date()
        }
      };
    }
  }

  async analyzeManifests(projectPath, context) {
    const manifests = {
      packageJson: null,
      configFiles: [],
      dockerFiles: [],
      ciFiles: [],
      summary: {}
    };

    try {
      // 1. Analyze package.json
      if (context.includePackageJson !== false) {
        const packageJsonPath = path.join(projectPath, 'package.json');
        try {
          const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
          const packageJson = JSON.parse(packageJsonContent);
          
          manifests.packageJson = {
            name: packageJson.name,
            version: packageJson.version,
            description: packageJson.description,
            scripts: packageJson.scripts || {},
            dependencies: packageJson.dependencies || {},
            devDependencies: packageJson.devDependencies || {},
            engines: packageJson.engines || {},
            type: packageJson.type || 'commonjs',
            main: packageJson.main,
            bin: packageJson.bin,
            keywords: packageJson.keywords || [],
            author: packageJson.author,
            license: packageJson.license
          };
        } catch (error) {
          logger.warn(`⚠️ Failed to read package.json: ${error.message}`);
        }
      }

      // 2. Find configuration files
      if (context.includeConfigFiles !== false) {
        const configFiles = await this.findConfigFiles(projectPath);
        manifests.configFiles = configFiles;
      }

      // 3. Find Docker files
      if (context.includeDockerFiles !== false) {
        const dockerFiles = await this.findDockerFiles(projectPath);
        manifests.dockerFiles = dockerFiles;
      }

      // 4. Find CI/CD files
      if (context.includeCIFiles !== false) {
        const ciFiles = await this.findCIFiles(projectPath);
        manifests.ciFiles = ciFiles;
      }

      // Generate summary
      manifests.summary = this.generateManifestSummary(manifests);

      return manifests;

    } catch (error) {
      logger.error(`❌ Manifest analysis failed: ${error.message}`);
      throw error;
    }
  }

  async findConfigFiles(projectPath) {
    const configFiles = [];
    const configPatterns = [
      '*.config.js', '*.config.json', '*.config.ts',
      '.eslintrc*', '.prettierrc*', '.babelrc*',
      'tsconfig.json', 'jsconfig.json',
      'webpack.config.js', 'vite.config.js', 'rollup.config.js',
      'tailwind.config.js', 'postcss.config.js',
      '.env*', '*.env'
    ];

    try {
      const files = await this.scanDirectory(projectPath, configPatterns);
      for (const file of files) {
        configFiles.push({
          name: path.basename(file),
          path: file.replace(projectPath, '').replace(/^\/+/, ''),
          type: this.getConfigFileType(file)
        });
      }
    } catch (error) {
      logger.warn(`⚠️ Failed to scan for config files: ${error.message}`);
    }

    return configFiles;
  }

  async findDockerFiles(projectPath) {
    const dockerFiles = [];
    const dockerPatterns = ['Dockerfile*', 'docker-compose*.yml', 'docker-compose*.yaml'];

    try {
      const files = await this.scanDirectory(projectPath, dockerPatterns);
      for (const file of files) {
        dockerFiles.push({
          name: path.basename(file),
          path: file.replace(projectPath, '').replace(/^\/+/, ''),
          type: this.getDockerFileType(file)
        });
      }
    } catch (error) {
      logger.warn(`⚠️ Failed to scan for Docker files: ${error.message}`);
    }

    return dockerFiles;
  }

  async findCIFiles(projectPath) {
    const ciFiles = [];
    const ciPatterns = [
      '.github/workflows/*.yml', '.github/workflows/*.yaml',
      '.gitlab-ci.yml', '.gitlab-ci.yaml',
      '.travis.yml', '.travis.yaml',
      'azure-pipelines.yml', 'azure-pipelines.yaml',
      'Jenkinsfile', 'Jenkinsfile.*'
    ];

    try {
      const files = await this.scanDirectory(projectPath, ciPatterns);
      for (const file of files) {
        ciFiles.push({
          name: path.basename(file),
          path: file.replace(projectPath, '').replace(/^\/+/, ''),
          type: this.getCIFileType(file)
        });
      }
    } catch (error) {
      logger.warn(`⚠️ Failed to scan for CI files: ${error.message}`);
    }

    return ciFiles;
  }

  async scanDirectory(dirPath, patterns) {
    const files = [];
    
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
          // Recursively scan subdirectories
          const subFiles = await this.scanDirectory(fullPath, patterns);
          files.push(...subFiles);
        } else if (item.isFile()) {
          // Check if file matches any pattern
          for (const pattern of patterns) {
            if (this.matchesPattern(item.name, pattern)) {
              files.push(fullPath);
              break;
            }
          }
        }
      }
    } catch (error) {
      // Ignore permission errors and continue
      logger.debug(`⚠️ Could not scan directory ${dirPath}: ${error.message}`);
    }
    
    return files;
  }

  matchesPattern(filename, pattern) {
    // Simple pattern matching - can be enhanced with glob patterns
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filename);
    }
    return filename === pattern;
  }

  getConfigFileType(filename) {
    if (filename.includes('eslint')) return 'linting';
    if (filename.includes('prettier')) return 'formatting';
    if (filename.includes('babel')) return 'transpilation';
    if (filename.includes('typescript') || filename.includes('tsconfig')) return 'typescript';
    if (filename.includes('webpack') || filename.includes('vite') || filename.includes('rollup')) return 'bundler';
    if (filename.includes('tailwind') || filename.includes('postcss')) return 'styling';
    if (filename.includes('.env')) return 'environment';
    return 'general';
  }

  getDockerFileType(filename) {
    if (filename.includes('docker-compose')) return 'compose';
    if (filename.includes('Dockerfile')) return 'dockerfile';
    return 'docker';
  }

  getCIFileType(filename) {
    if (filename.includes('.github/workflows')) return 'github-actions';
    if (filename.includes('.gitlab-ci')) return 'gitlab-ci';
    if (filename.includes('.travis')) return 'travis-ci';
    if (filename.includes('azure-pipelines')) return 'azure-devops';
    if (filename.includes('Jenkinsfile')) return 'jenkins';
    return 'ci-cd';
  }

  generateManifestSummary(manifests) {
    const summary = {
      hasPackageJson: !!manifests.packageJson,
      configFilesCount: manifests.configFiles.length,
      dockerFilesCount: manifests.dockerFiles.length,
      ciFilesCount: manifests.ciFiles.length,
      projectType: this.detectProjectType(manifests),
      packageManager: this.detectPackageManager(manifests),
      frameworks: this.detectFrameworks(manifests),
      buildTools: this.detectBuildTools(manifests)
    };

    return summary;
  }

  detectProjectType(manifests) {
    if (!manifests.packageJson) return 'unknown';
    
    const { dependencies = {}, devDependencies = {} } = manifests.packageJson;
    const allDeps = { ...dependencies, ...devDependencies };
    
    if (allDeps.react) return 'react';
    if (allDeps.vue) return 'vue';
    if (allDeps.angular) return 'angular';
    if (allDeps.express) return 'express';
    if (allDeps.nest) return 'nestjs';
    if (allDeps.next) return 'nextjs';
    if (allDeps.nuxt) return 'nuxtjs';
    
    return 'nodejs';
  }

  detectPackageManager(manifests) {
    const configFiles = manifests.configFiles.map(f => f.name);
    
    if (configFiles.some(f => f.includes('yarn.lock'))) return 'yarn';
    if (configFiles.some(f => f.includes('pnpm-lock.yaml'))) return 'pnpm';
    if (configFiles.some(f => f.includes('package-lock.json'))) return 'npm';
    
    return 'npm'; // default
  }

  detectFrameworks(manifests) {
    if (!manifests.packageJson) return [];
    
    const { dependencies = {}, devDependencies = {} } = manifests.packageJson;
    const allDeps = { ...dependencies, ...devDependencies };
    const frameworks = [];
    
    if (allDeps.react) frameworks.push('react');
    if (allDeps.vue) frameworks.push('vue');
    if (allDeps.angular) frameworks.push('angular');
    if (allDeps.express) frameworks.push('express');
    if (allDeps.nest) frameworks.push('nestjs');
    if (allDeps.next) frameworks.push('nextjs');
    if (allDeps.nuxt) frameworks.push('nuxtjs');
    
    return frameworks;
  }

  detectBuildTools(manifests) {
    const configFiles = manifests.configFiles.map(f => f.name);
    const buildTools = [];
    
    if (configFiles.some(f => f.includes('webpack'))) buildTools.push('webpack');
    if (configFiles.some(f => f.includes('vite'))) buildTools.push('vite');
    if (configFiles.some(f => f.includes('rollup'))) buildTools.push('rollup');
    if (configFiles.some(f => f.includes('babel'))) buildTools.push('babel');
    if (configFiles.some(f => f.includes('typescript'))) buildTools.push('typescript');
    
    return buildTools;
  }

  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required for manifest analysis');
    }
  }
}

// Create instance for execution
const stepInstance = new ManifestAnalysisStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 