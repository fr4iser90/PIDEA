/**
 * Dependency Analysis Step - Core Analysis Step
 * Analyzes dependencies and package information
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');
const semver = require('semver');
const logger = new Logger('dependency_analysis_step');

// Step configuration
const config = {
  name: 'DependencyAnalysisStep',
  type: 'analysis',
  description: 'Analyzes dependencies and package information',
  category: 'analysis',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 30000,
    includeOutdated: true,
    includeVulnerabilities: true,
    includeRecommendations: true,
    maxFileSize: 1024 * 1024, // 1MB
    maxFiles: 1000
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

class DependencyAnalysisStep {
  constructor() {
    this.name = 'DependencyAnalysisStep';
    this.description = 'Analyzes dependencies and package information';
    this.category = 'analysis';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = DependencyAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`📦 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const projectPath = context.projectPath;
      
      logger.info(`📊 Starting dependency analysis for: ${projectPath}`);

      // Execute dependency analysis with internal logic
      const dependencies = await this.analyzeDependencies(projectPath, {
        includeOutdated: context.includeOutdated !== false,
        includeVulnerabilities: context.includeVulnerabilities !== false,
        includeRecommendations: context.includeRecommendations !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(dependencies);

      logger.info(`✅ Dependency analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: this.name,
          projectPath,
          analysisType: 'dependency',
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Dependency analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: this.name,
          projectPath: context.projectPath,
          analysisType: 'dependency',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Analyze dependencies with internal logic
   */
  async analyzeDependencies(projectPath, options = {}) {
    try {
      // Find all packages in the project
      const packages = await this.findPackages(projectPath);
      
      if (packages.length === 0) {
        logger.warn('No package.json found in any expected location');
        return this.getEmptyResult();
      }

      // Process all found packages
      const allDirectDependencies = [];
      const allDirectDevDependencies = [];
      const allTransitiveDependencies = [];
      const allOutdatedPackages = [];
      const allVulnerabilities = [];
      const allBundleSizes = {};
      const allDependencyGraphs = {};

      for (const pkg of packages) {
        const packageJsonPath = path.join(pkg.path, 'package.json');
        const lockPath = path.join(pkg.path, 'package-lock.json');
        let packageLock;
        
        try {
          packageLock = JSON.parse(await fs.readFile(lockPath, 'utf-8'));
        } catch (e) {
          packageLock = null;
        }

        // Direct dependencies
        const directDeps = this.extractDeps(pkg.dependencies, packageLock);
        const directDevDeps = this.extractDeps(pkg.devDependencies, packageLock);
        const transitiveDeps = packageLock ? this.extractTransitiveDeps(packageLock) : [];
        const outdatedPkgs = await this.findOutdatedPackages(directDeps, pkg.path);

        allDirectDependencies.push(...directDeps);
        allDirectDevDependencies.push(...directDevDeps);
        allTransitiveDependencies.push(...transitiveDeps);
        allOutdatedPackages.push(...outdatedPkgs);
      }

      // Calculate metrics
      const metrics = {
        directDependencyCount: allDirectDependencies.length,
        transitiveDependencyCount: allTransitiveDependencies.length,
        totalDependencies: allDirectDependencies.length + allTransitiveDependencies.length,
        vulnerabilityCount: allVulnerabilities.length,
        outdatedPackageCount: allOutdatedPackages.length,
        licenseIssueCount: 0,
        bundleSize: Object.keys(allBundleSizes).length > 0 ? Object.values(allBundleSizes).reduce((a, b) => a + b, 0) : 0,
        averageDependencyAge: this.calculateAverageAge(allDirectDependencies),
        securityScore: allVulnerabilities.length === 0 ? 100 : Math.max(0, 100 - allVulnerabilities.length * 10),
        updateScore: allOutdatedPackages.length === 0 ? 100 : Math.max(0, 100 - allOutdatedPackages.length * 5)
      };

      return {
        packages: packages,
        directDependencies: allDirectDependencies,
        directDevDependencies: allDirectDevDependencies,
        transitiveDependencies: allTransitiveDependencies,
        outdatedPackages: allOutdatedPackages,
        vulnerabilities: allVulnerabilities,
        license: null,
        bundleSize: allBundleSizes,
        dependencyGraph: allDependencyGraphs,
        metrics
      };
    } catch (error) {
      logger.error('Dependency analysis failed:', error.message);
      return this.getEmptyResult();
    }
  }

  /**
   * Find all packages in the project
   */
  async findPackages(projectPath) {
    const packages = [];
    
    // Check root package.json
    const rootPackagePath = path.join(projectPath, 'package.json');
    if (await this.fileExists(rootPackagePath)) {
      try {
        const packageJson = JSON.parse(await fs.readFile(rootPackagePath, 'utf-8'));
        packages.push({
          name: packageJson.name,
          version: packageJson.version,
          path: projectPath,
          dependencies: packageJson.dependencies || {},
          devDependencies: packageJson.devDependencies || {}
        });
        logger.info(`Found root package.json: ${packageJson.name}`);
      } catch (e) {
        logger.error('Failed to parse root package.json');
      }
    }

    // Check common subdirectories
    const commonDirs = ['backend', 'frontend', 'api', 'client', 'server', 'app', 'src'];
    for (const dir of commonDirs) {
      const subdirPath = path.join(projectPath, dir);
      const packagePath = path.join(subdirPath, 'package.json');
      
      if (await this.fileExists(packagePath)) {
        try {
          const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
          packages.push({
            name: packageJson.name,
            version: packageJson.version,
            path: subdirPath,
            dependencies: packageJson.dependencies || {},
            devDependencies: packageJson.devDependencies || {}
          });
          logger.info(`Found package.json in ${dir}: ${packageJson.name}`);
        } catch (e) {
          logger.error(`Failed to parse package.json in ${dir}`);
        }
      }
    }

    return packages;
  }

  /**
   * Check if file exists
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
   * Extract dependencies from package.json
   */
  extractDeps(depsObj, packageLock) {
    if (!depsObj) return [];
    return Object.entries(depsObj).map(([name, version]) => {
      let locked = null;
      if (packageLock && packageLock.dependencies && packageLock.dependencies[name]) {
        locked = packageLock.dependencies[name].version;
      }
      return {
        name,
        required: version,
        installed: locked || null
      };
    });
  }

  /**
   * Extract transitive dependencies from package-lock.json
   */
  extractTransitiveDeps(packageLock) {
    const result = [];
    function walk(deps) {
      for (const [name, info] of Object.entries(deps)) {
        result.push({
          name,
          version: info.version,
          resolved: info.resolved || null
        });
        if (info.dependencies) walk(info.dependencies);
      }
    }
    if (packageLock.dependencies) walk(packageLock.dependencies);
    return result;
  }

  /**
   * Find outdated packages
   */
  async findOutdatedPackages(directDependencies, projectPath) {
    const nodeModulesPath = path.join(projectPath, 'node_modules');
    const outdated = [];
    for (const dep of directDependencies) {
      if (!dep.installed) continue;
      try {
        const pkgPath = path.join(nodeModulesPath, dep.name, 'package.json');
        const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
        if (!semver.satisfies(pkg.version, dep.required)) {
          outdated.push({
            name: dep.name,
            required: dep.required,
            installed: pkg.version,
            updateType: this.getUpdateType(pkg.version, dep.required)
          });
        }
      } catch (e) {
        outdated.push({
          name: dep.name,
          required: dep.required,
          installed: null,
          updateType: 'missing'
        });
      }
    }
    return outdated;
  }

  /**
   * Get update type for package
   */
  getUpdateType(installed, required) {
    if (!installed || !required) return 'unknown';
    if (semver.gt(installed, required)) return 'downgrade';
    if (semver.lt(installed, required)) return 'upgrade';
    return 'current';
  }

  /**
   * Calculate average age of dependencies
   */
  calculateAverageAge(dependencies) {
    if (dependencies.length === 0) return 0;
    const totalAge = dependencies.reduce((sum, dep) => {
      // Simple age calculation based on version
      const version = dep.installed || dep.required;
      if (!version) return sum;
      try {
        const major = semver.major(version);
        return sum + (2024 - major); // Rough estimate
      } catch {
        return sum;
      }
    }, 0);
    return Math.round(totalAge / dependencies.length);
  }

  /**
   * Get empty result structure
   */
  getEmptyResult() {
    return {
      packages: [],
      directDependencies: [],
      directDevDependencies: [],
      transitiveDependencies: [],
      outdatedPackages: [],
      vulnerabilities: [],
      license: null,
      bundleSize: {},
      dependencyGraph: {},
      metrics: {
        directDependencyCount: 0,
        transitiveDependencyCount: 0,
        totalDependencies: 0,
        vulnerabilityCount: 0,
        outdatedPackageCount: 0,
        licenseIssueCount: 0,
        bundleSize: 0,
        averageDependencyAge: 0,
        securityScore: 100,
        updateScore: 100
      }
    };
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
      throw new Error('Project path is required for dependency analysis');
    }
  }
}

// Create instance for execution
const stepInstance = new DependencyAnalysisStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 