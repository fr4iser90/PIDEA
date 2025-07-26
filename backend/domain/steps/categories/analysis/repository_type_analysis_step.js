/**
 * Repository Type Analysis Step - Fast Repository Type Detection
 * Replaces slow Mono/Single Repo Strategy containers with fast, cacheable step
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('repository_type_analysis_step');

// Step configuration
const config = {
  name: 'RepositoryTypeAnalysisStep',
  type: 'analysis',
  description: 'Fast repository type detection (monorepo vs single repo)',
  category: 'analysis',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 5000, // 5 seconds max - should be much faster
    includeDetails: true,
    includeRecommendations: false,
    cacheTTL: 24 * 60 * 60, // 24 hours - very stable
    analysisType: 'repository-type'
  }
};

// Export config for StepRegistry
module.exports.config = config;

class RepositoryTypeAnalysisStep {
  constructor() {
    this.name = config.name;
    this.type = config.type;
    this.description = config.description;
    this.category = config.category;
    this.version = config.version;
    this.dependencies = config.dependencies;
    this.settings = config.settings;
  }

  /**
   * Execute the repository type analysis step
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Analysis result
   */
  async execute(context = {}) {
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔍 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const projectPath = context.projectPath;
      const startTime = Date.now();
      
      logger.debug(`📊 Starting repository type detection for: ${projectPath}`);

      // 1. Fast monorepo detection
      const isMonorepo = await this.detectMonorepo(projectPath);
      
      // 2. Get repository type details
      const repoType = isMonorepo ? 'monorepo' : 'single-repo';
      const typeDetails = await this.getRepositoryTypeDetails(projectPath, isMonorepo);
      
      // 3. Get detection indicators
      const indicators = await this.getDetectionIndicators(projectPath);
      
      // 4. Calculate confidence score
      const confidence = this.calculateConfidence(indicators);
      
      // 5. Build result
      const result = {
        repositoryType: repoType,
        isMonorepo: isMonorepo,
        typeDetails: typeDetails,
        detectionMethod: 'fast-scan',
        confidence: confidence,
        indicators: indicators,
        detectionTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      // 6. Add recommendations if requested
      if (context.includeRecommendations !== false) {
        result.recommendations = this.generateRecommendations(result);
      }

      logger.info(`✅ ${this.name} completed successfully in ${result.detectionTime}ms`);
      logger.info(`📊 Repository type: ${repoType} (confidence: ${confidence}%)`);

      return {
        success: true,
        result: result,
        metadata: {
          stepName: this.name,
          duration: result.detectionTime,
          cacheTTL: this.settings.cacheTTL
        }
      };

    } catch (error) {
      logger.error(`❌ ${this.name} failed:`, error.message);
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: this.name
        }
      };
    }
  }

  /**
   * Validate execution context
   * @param {Object} context - Execution context
   */
  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required');
    }
  }

  /**
   * Fast monorepo detection
   * @param {string} projectPath - Project path
   * @returns {Promise<boolean>} True if monorepo
   */
  async detectMonorepo(projectPath) {
    try {
      // Check for common monorepo indicators (fast file checks)
      const indicators = [
        'lerna.json',
        'nx.json', 
        'rush.json',
        'pnpm-workspace.yaml'
      ];

      // Quick file existence checks
      for (const indicator of indicators) {
        try {
          await fs.access(path.join(projectPath, indicator));
          return true; // Found monorepo indicator
        } catch {
          // File doesn't exist, continue
        }
      }

      // Check package.json for workspaces
      try {
        const packageJsonPath = path.join(projectPath, 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        if (packageJson.workspaces || packageJson.private) {
          return true; // Has workspaces configuration
        }
      } catch {
        // No package.json or invalid, continue
      }

      // Check for common monorepo directory structures
      const commonDirs = ['packages', 'apps', 'libs', 'services', 'frontend', 'backend'];
      const projectDirs = await this.getProjectDirectories(projectPath);
      
      return commonDirs.some(dir => projectDirs.includes(dir));

    } catch (error) {
      logger.warn('Monorepo detection failed:', error.message);
      return false; // Default to single repo on error
    }
  }

  /**
   * Get repository type details
   * @param {string} projectPath - Project path
   * @param {boolean} isMonorepo - Whether it's a monorepo
   * @returns {Promise<Object>} Type details
   */
  async getRepositoryTypeDetails(projectPath, isMonorepo) {
    try {
      if (isMonorepo) {
        return await this.getMonorepoDetails(projectPath);
      } else {
        return await this.getSingleRepoDetails(projectPath);
      }
    } catch (error) {
      logger.warn('Failed to get repository type details:', error.message);
      return { type: 'unknown', error: error.message };
    }
  }

  /**
   * Get monorepo specific details
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Monorepo details
   */
  async getMonorepoDetails(projectPath) {
    const details = { type: 'monorepo' };

    // Detect monorepo tool
    if (await this.fileExists(path.join(projectPath, 'lerna.json'))) {
      details.tool = 'lerna';
    } else if (await this.fileExists(path.join(projectPath, 'nx.json'))) {
      details.tool = 'nx';
    } else if (await this.fileExists(path.join(projectPath, 'rush.json'))) {
      details.tool = 'rush';
    } else if (await this.fileExists(path.join(projectPath, 'pnpm-workspace.yaml'))) {
      details.tool = 'pnpm-workspaces';
    } else {
      details.tool = 'yarn-workspaces';
    }

    // Get workspace directories
    const workspaceDirs = await this.getWorkspaceDirectories(projectPath);
    details.workspaces = workspaceDirs;

    return details;
  }

  /**
   * Get single repo specific details
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Single repo details
   */
  async getSingleRepoDetails(projectPath) {
    const details = { type: 'single-repo' };

    try {
      // Detect project type from package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Framework detection
      if (dependencies.react) {
        details.framework = 'react';
      } else if (dependencies.vue) {
        details.framework = 'vue';
      } else if (dependencies.angular) {
        details.framework = 'angular';
      } else if (dependencies.express) {
        details.framework = 'express';
      } else if (dependencies.koa) {
        details.framework = 'koa';
      } else if (dependencies.fastify) {
        details.framework = 'fastify';
      } else if (dependencies.nest) {
        details.framework = 'nestjs';
      } else if (dependencies.next) {
        details.framework = 'nextjs';
      } else if (dependencies.nuxt) {
        details.framework = 'nuxtjs';
      } else {
        details.framework = 'unknown';
      }

      details.packageManager = this.detectPackageManager(projectPath);
      
    } catch (error) {
      details.framework = 'unknown';
      details.packageManager = 'unknown';
    }

    return details;
  }

  /**
   * Get detection indicators
   * @param {string} projectPath - Project path
   * @returns {Promise<Object>} Detection indicators
   */
  async getDetectionIndicators(projectPath) {
    const indicators = {
      monorepoFiles: [],
      workspaceDirs: [],
      packageManager: null,
      hasPackageJson: false
    };

    try {
      // Check for monorepo files
      const monorepoFiles = ['lerna.json', 'nx.json', 'rush.json', 'pnpm-workspace.yaml'];
      for (const file of monorepoFiles) {
        if (await this.fileExists(path.join(projectPath, file))) {
          indicators.monorepoFiles.push(file);
        }
      }

      // Check for workspace directories
      const workspaceDirs = ['packages', 'apps', 'libs', 'services', 'frontend', 'backend'];
      const projectDirs = await this.getProjectDirectories(projectPath);
      indicators.workspaceDirs = workspaceDirs.filter(dir => projectDirs.includes(dir));

      // Check package manager
      indicators.packageManager = this.detectPackageManager(projectPath);

      // Check for package.json
      indicators.hasPackageJson = await this.fileExists(path.join(projectPath, 'package.json'));

    } catch (error) {
      logger.warn('Failed to get detection indicators:', error.message);
    }

    return indicators;
  }

  /**
   * Calculate confidence score
   * @param {Object} indicators - Detection indicators
   * @returns {number} Confidence percentage
   */
  calculateConfidence(indicators) {
    let confidence = 50; // Base confidence

    // Monorepo files increase confidence
    if (indicators.monorepoFiles.length > 0) {
      confidence += 30;
    }

    // Workspace directories increase confidence
    if (indicators.workspaceDirs.length > 0) {
      confidence += 20;
    }

    // Package.json presence increases confidence
    if (indicators.hasPackageJson) {
      confidence += 10;
    }

    // Cap at 100%
    return Math.min(confidence, 100);
  }

  /**
   * Generate recommendations
   * @param {Object} result - Analysis result
   * @returns {Array} Recommendations
   */
  generateRecommendations(result) {
    const recommendations = [];

    if (result.isMonorepo) {
      recommendations.push({
        type: 'monorepo-optimization',
        title: 'Monorepo detected',
        description: 'Consider using monorepo-specific tools for better performance',
        priority: 'medium'
      });
    } else {
      recommendations.push({
        type: 'single-repo-optimization', 
        title: 'Single repository detected',
        description: 'Consider modular architecture for better maintainability',
        priority: 'low'
      });
    }

    return recommendations;
  }

  /**
   * Check if file exists
   * @param {string} filePath - File path
   * @returns {Promise<boolean>} True if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get project directories
   * @param {string} projectPath - Project path
   * @returns {Promise<Array>} Directory list
   */
  async getProjectDirectories(projectPath) {
    try {
      const entries = await fs.readdir(projectPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory === true)
        .map(entry => entry.name);
    } catch {
      return [];
    }
  }

  /**
   * Get workspace directories
   * @param {string} projectPath - Project path
   * @returns {Promise<Array>} Workspace directories
   */
  async getWorkspaceDirectories(projectPath) {
    const commonWorkspaceDirs = ['packages', 'apps', 'libs', 'services', 'frontend', 'backend'];
    const projectDirs = await this.getProjectDirectories(projectPath);
    return projectDirs.filter(dir => commonWorkspaceDirs.includes(dir));
  }

  /**
   * Detect package manager
   * @param {string} projectPath - Project path
   * @returns {string} Package manager name
   */
  detectPackageManager(projectPath) {
    if (this.fileExists(path.join(projectPath, 'yarn.lock'))) {
      return 'yarn';
    } else if (this.fileExists(path.join(projectPath, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    } else if (this.fileExists(path.join(projectPath, 'package-lock.json'))) {
      return 'npm';
    } else {
      return 'unknown';
    }
  }

  /**
   * Get step configuration
   * @returns {Object} Step configuration
   */
  static getConfig() {
    return config;
  }
}

// Export both the class and the execute function for StepRegistry
module.exports = RepositoryTypeAnalysisStep;
module.exports.config = config;
module.exports.execute = async function(context) {
  const step = new RepositoryTypeAnalysisStep();
  return await step.execute(context);
}; 