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

      // Execute manifest analysis directly (like other steps)
      const manifestAnalysis = await this.analyzeManifests(projectPath, context);

      logger.info(`✅ Manifest analysis completed successfully`);

      return {
        success: true,
        result: manifestAnalysis,
        metadata: {
          stepName: this.name,
          projectPath,
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
          timestamp: new Date()
        }
      };
    }
  }

  async analyzeManifests(projectPath, context) {
    const startTime = Date.now();
    
    const result = {
      score: 0,
      results: {},
      issues: [],
      recommendations: [],
      summary: {},
              metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
    };

    const manifests = {
      packageJson: null,
      configFiles: [],
      dockerFiles: [],
      ciFiles: []
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

      // Store manifests as results
      result.results = manifests;

      // Generate issues and recommendations
      result.issues = this.generateManifestIssues(manifests);
      result.recommendations = this.generateManifestRecommendations(manifests);

      // Calculate manifest score
      result.score = this.calculateManifestScore(result);

      // Generate summary
      result.summary = {
        overallScore: result.score,
        totalIssues: result.issues.length,
        totalRecommendations: result.recommendations.length,
        status: this.getManifestStatus(result.score),
        ...this.generateManifestSummary(manifests)
      };

      // Add metadata
      const executionTime = Date.now() - startTime;
      const files = await this.getAllFiles(projectPath);
      
      result.metadata = {
        ...result.metadata,
        executionTime,
        filesAnalyzed: files.length,
        coverage: this.calculateCoverage(files, projectPath),
        confidence: this.calculateConfidence(result)
      };

      return result;

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

  /**
   * Generate manifest issues
   * @param {Object} manifests - Manifest data
   * @returns {Array} Issues
   */
  generateManifestIssues(manifests) {
    const issues = [];
    
    // Check for missing package.json
    if (!manifests.packageJson) {
      issues.push({
        type: 'missing',
        severity: 'high',
        message: 'No package.json found',
        suggestion: 'Create a package.json file for your project'
      });
    }
    
    // Check for missing CI/CD
    if (manifests.ciFiles.length === 0) {
      issues.push({
        type: 'missing',
        severity: 'medium',
        message: 'No CI/CD configuration found',
        suggestion: 'Consider adding GitHub Actions, GitLab CI, or similar'
      });
    }
    
    return issues;
  }

  /**
   * Generate manifest recommendations
   * @param {Object} manifests - Manifest data
   * @returns {Array} Recommendations
   */
  generateManifestRecommendations(manifests) {
    const recommendations = [];
    
    if (manifests.packageJson) {
      recommendations.push({
        priority: 'medium',
        action: 'Add scripts for common tasks',
        impact: 'Improved developer experience',
        effort: 'low'
      });
    }
    
    return recommendations;
  }

  /**
   * Calculate manifest score
   * @param {Object} result - Analysis result
   * @returns {number} Manifest score (0-100)
   */
  calculateManifestScore(result) {
    let score = 60; // Base score
    
    // Add points for having package.json
    if (result.results.packageJson) {
      score += 20;
    }
    
    // Add points for config files
    if (result.results.configFiles.length > 0) {
      score += 10;
    }
    
    // Add points for Docker files
    if (result.results.dockerFiles.length > 0) {
      score += 5;
    }
    
    // Add points for CI/CD files
    if (result.results.ciFiles.length > 0) {
      score += 5;
    }
    
    // Deduct points for issues
    if (result.issues && result.issues.length > 0) {
      score -= Math.min(result.issues.length * 5, 20);
    }
    
    return Math.max(Math.min(score, 100), 0);
  }

  /**
   * Get manifest status
   * @param {number} score - Manifest score
   * @returns {string} Status
   */
  getManifestStatus(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
  }

  /**
   * Calculate coverage percentage
   * @param {Array} files - Analyzed files
   * @param {string} projectPath - Project path
   * @returns {number} Coverage percentage
   */
  calculateCoverage(files, projectPath) {
    try {
      const allFiles = this.getAllFilesSync(projectPath);
      return allFiles.length > 0 ? Math.round((files.length / allFiles.length) * 100) : 100;
    } catch (error) {
      return 100;
    }
  }

  /**
   * Calculate confidence level
   * @param {Object} result - Analysis result
   * @returns {number} Confidence percentage
   */
  calculateConfidence(result) {
    let confidence = 80;
    
    if (result.issues.length > 0) confidence += 10;
    if (result.recommendations.length > 0) confidence += 5;
    if (result.results && Object.keys(result.results).length > 0) confidence += 5;
    
    return Math.min(confidence, 100);
  }

  /**
   * Get all files synchronously
   * @param {string} dir - Directory path
   * @returns {Array} File paths
   */
  getAllFilesSync(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        files.push(...this.getAllFilesSync(fullPath));
      } else if (stat.isFile()) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * Get all files asynchronously
   * @param {string} dir - Directory path
   * @returns {Promise<Array>} File paths
   */
  async getAllFiles(dir) {
    const files = [];
    const items = await fs.readdir(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        files.push(...await this.getAllFiles(fullPath));
      } else if (stat.isFile()) {
        files.push(fullPath);
      }
    }
    
    return files;
  }
}

// Create instance for execution
const stepInstance = new ManifestAnalysisStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 