/**
 * ManifestAnalyzer - Domain Service
 * Analyzes project manifests and configuration files
 */

const fs = require('fs').promises;
const path = require('path');
const Logger = require('@logging/Logger');

class ManifestAnalyzer {
  constructor() {
    this.logger = new Logger('ManifestAnalyzer');
  }

  /**
   * Analyze project manifests
   * @param {string} projectPath - Project directory path
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Manifest analysis result
   */
  async analyzeManifests(projectPath, options = {}) {
    try {
      this.logger.info(`📋 Starting manifest analysis for: ${projectPath}`);

      const manifests = {
        packageJson: null,
        configFiles: [],
        dockerFiles: [],
        ciFiles: [],
        summary: {}
      };

      // 1. Analyze package.json
      if (options.includePackageJson !== false) {
        manifests.packageJson = await this.analyzePackageJson(projectPath);
      }

      // 2. Find configuration files
      if (options.includeConfigFiles !== false) {
        manifests.configFiles = await this.findConfigFiles(projectPath);
      }

      // 3. Find Docker files
      if (options.includeDockerFiles !== false) {
        manifests.dockerFiles = await this.findDockerFiles(projectPath);
      }

      // 4. Find CI/CD files
      if (options.includeCIFiles !== false) {
        manifests.ciFiles = await this.findCIFiles(projectPath);
      }

      // Generate summary
      manifests.summary = this.generateManifestSummary(manifests);

      this.logger.info(`✅ Manifest analysis completed successfully`);
      return manifests;

    } catch (error) {
      this.logger.error(`❌ Manifest analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze package.json file
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Object|null>} Package.json analysis
   */
  async analyzePackageJson(projectPath) {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageJsonContent);
      
      return {
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
      this.logger.warn(`⚠️ Failed to read package.json: ${error.message}`);
      return null;
    }
  }

  /**
   * Find configuration files
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Array>} Configuration files
   */
  async findConfigFiles(projectPath) {
    const configPatterns = [
      '*.config.js', '*.config.json', '*.config.ts',
      '.eslintrc*', '.prettierrc*', '.babelrc*',
      'tsconfig.json', 'jsconfig.json',
      'webpack.config.js', 'vite.config.js', 'rollup.config.js',
      'jest.config.js', 'karma.conf.js',
      '.env*', 'config.*'
    ];

    return await this.scanDirectory(projectPath, configPatterns);
  }

  /**
   * Find Docker files
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Array>} Docker files
   */
  async findDockerFiles(projectPath) {
    const dockerPatterns = [
      'Dockerfile*', 'docker-compose*.yml', 'docker-compose*.yaml',
      '.dockerignore', 'dockerfile*'
    ];

    return await this.scanDirectory(projectPath, dockerPatterns);
  }

  /**
   * Find CI/CD files
   * @param {string} projectPath - Project directory path
   * @returns {Promise<Array>} CI/CD files
   */
  async findCIFiles(projectPath) {
    const ciPatterns = [
      '.github/workflows/*.yml', '.github/workflows/*.yaml',
      '.gitlab-ci.yml', '.gitlab-ci.yaml',
      '.travis.yml', '.travis.yaml',
      'azure-pipelines.yml', 'azure-pipelines.yaml',
      'Jenkinsfile', 'Jenkinsfile.*',
      '.circleci/config.yml', '.circleci/config.yaml'
    ];

    return await this.scanDirectory(projectPath, ciPatterns);
  }

  /**
   * Scan directory for files matching patterns
   * @param {string} dirPath - Directory path
   * @param {Array} patterns - File patterns to match
   * @returns {Promise<Array>} Matching files
   */
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
      this.logger.debug(`⚠️ Could not scan directory ${dirPath}: ${error.message}`);
    }
    
    return files;
  }

  /**
   * Check if filename matches pattern
   * @param {string} filename - Filename to check
   * @param {string} pattern - Pattern to match against
   * @returns {boolean} True if matches
   */
  matchesPattern(filename, pattern) {
    // Simple pattern matching - can be enhanced with glob patterns
    if (pattern.includes('*')) {
      const regexPattern = pattern.replace(/\*/g, '.*');
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(filename);
    }
    return filename === pattern;
  }

  /**
   * Generate manifest summary
   * @param {Object} manifests - Manifest analysis results
   * @returns {Object} Summary
   */
  generateManifestSummary(manifests) {
    return {
      hasPackageJson: !!manifests.packageJson,
      configFilesCount: manifests.configFiles.length,
      dockerFilesCount: manifests.dockerFiles.length,
      ciFilesCount: manifests.ciFiles.length,
      projectType: this.detectProjectType(manifests),
      packageManager: this.detectPackageManager(manifests),
      frameworks: this.detectFrameworks(manifests),
      buildTools: this.detectBuildTools(manifests)
    };
  }

  /**
   * Detect project type
   * @param {Object} manifests - Manifest analysis results
   * @returns {string} Project type
   */
  detectProjectType(manifests) {
    if (!manifests.packageJson) return 'unknown';

    const { dependencies = {}, devDependencies = {} } = manifests.packageJson;
    const allDeps = { ...dependencies, ...devDependencies };

    if (allDeps.react) return 'react';
    if (allDeps.vue) return 'vue';
    if (allDeps.angular) return 'angular';
    if (allDeps.express) return 'express';
    if (allDeps.nest) return 'nest';
    if (allDeps.next) return 'next';
    if (allDeps.nuxt) return 'nuxt';

    return 'nodejs';
  }

  /**
   * Detect package manager
   * @param {Object} manifests - Manifest analysis results
   * @returns {string} Package manager
   */
  detectPackageManager(manifests) {
    // Check for lock files
    const lockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
    for (const lockFile of lockFiles) {
      if (manifests.configFiles.some(file => file.includes(lockFile))) {
        if (lockFile === 'package-lock.json') return 'npm';
        if (lockFile === 'yarn.lock') return 'yarn';
        if (lockFile === 'pnpm-lock.yaml') return 'pnpm';
      }
    }

    return 'npm'; // Default
  }

  /**
   * Detect frameworks
   * @param {Object} manifests - Manifest analysis results
   * @returns {Array} Frameworks
   */
  detectFrameworks(manifests) {
    if (!manifests.packageJson) return [];

    const { dependencies = {}, devDependencies = {} } = manifests.packageJson;
    const allDeps = { ...dependencies, ...devDependencies };
    const frameworks = [];

    if (allDeps.react) frameworks.push('React');
    if (allDeps.vue) frameworks.push('Vue.js');
    if (allDeps.angular) frameworks.push('Angular');
    if (allDeps.express) frameworks.push('Express');
    if (allDeps.nest) frameworks.push('NestJS');
    if (allDeps.next) frameworks.push('Next.js');
    if (allDeps.nuxt) frameworks.push('Nuxt.js');

    return frameworks;
  }

  /**
   * Detect build tools
   * @param {Object} manifests - Manifest analysis results
   * @returns {Array} Build tools
   */
  detectBuildTools(manifests) {
    const buildTools = [];

    // Check config files for build tools
    for (const configFile of manifests.configFiles) {
      if (configFile.includes('webpack.config')) buildTools.push('Webpack');
      if (configFile.includes('vite.config')) buildTools.push('Vite');
      if (configFile.includes('rollup.config')) buildTools.push('Rollup');
      if (configFile.includes('parcel.config')) buildTools.push('Parcel');
    }

    return buildTools;
  }
}

module.exports = ManifestAnalyzer; 