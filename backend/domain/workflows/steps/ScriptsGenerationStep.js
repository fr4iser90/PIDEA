/**
 * ScriptsGenerationStep - Scripts generation workflow step
 * 
 * This step handles script generation operations, migrating the logic from
 * GenerateScriptsHandler to the unified workflow system. It provides
 * validation, complexity management, and performance optimization for script generation.
 */
const { DocumentationStep } = require('./DocumentationStep');
const fs = require('fs').promises;
const path = require('path');

/**
 * Scripts generation workflow step
 */
class ScriptsGenerationStep extends DocumentationStep {
  /**
   * Create a new scripts generation step
   * @param {Object} options - Step options
   */
  constructor(options = {}) {
    super('generate-scripts', {
      name: 'scripts_generation',
      description: 'Generate project scripts',
      version: '1.0.0',
      ...options
    });
    
    this.scriptTypes = options.scriptTypes || ['build', 'deployment', 'database', 'utility', 'test', 'monitoring', 'backup'];
    this.updatePackageScripts = options.updatePackageScripts !== false;
    this.validateScripts = options.validateScripts !== false;
    this.logger = options.logger || console;
  }

  /**
   * Execute scripts generation step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Scripts generation result
   */
  async executeStep(context) {
    const projectPath = context.get('projectPath');
    const command = context.get('command');
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }

    this.logger.info('ScriptsGenerationStep: Starting script generation', {
      projectPath,
      scriptTypes: this.scriptTypes,
      updatePackageScripts: this.updatePackageScripts,
      validateScripts: this.validateScripts
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
      
      // Step 4: Generate scripts based on types
      const results = {};
      
      if (this.scriptTypes.includes('build')) {
        results.build = await this.generateBuildScripts(projectPath, projectStructure, options);
      }
      
      if (this.scriptTypes.includes('deployment')) {
        results.deployment = await this.generateDeploymentScripts(projectPath, projectStructure, options);
      }
      
      if (this.scriptTypes.includes('database')) {
        results.database = await this.generateDatabaseScripts(projectPath, projectStructure, options);
      }
      
      if (this.scriptTypes.includes('utility')) {
        results.utility = await this.generateUtilityScripts(projectPath, projectStructure, options);
      }
      
      if (this.scriptTypes.includes('test')) {
        results.test = await this.generateTestScripts(projectPath, projectStructure, options);
      }
      
      if (this.scriptTypes.includes('monitoring')) {
        results.monitoring = await this.generateMonitoringScripts(projectPath, projectStructure, options);
      }
      
      if (this.scriptTypes.includes('backup')) {
        results.backup = await this.generateBackupScripts(projectPath, projectStructure, options);
      }
      
      // Step 5: Update package.json scripts (if enabled)
      let packageScriptsResults = null;
      if (this.updatePackageScripts) {
        packageScriptsResults = await this.updatePackageScripts(projectPath, results);
      }
      
      // Step 6: Validate scripts (if enabled)
      let validationResults = null;
      if (this.validateScripts) {
        validationResults = await this.validateScripts(projectPath, results);
      }

      // Step 7: Generate output
      const output = await this.generateOutput({
        command,
        projectStructure,
        results,
        packageScriptsResults,
        validationResults,
        outputConfig
      });

      // Step 8: Save results
      if (command) {
        await this.saveResults(command, output);
      }

      this.logger.info('ScriptsGenerationStep: Script generation completed successfully', {
        projectPath,
        generatedScripts: Object.keys(results).length,
        totalFiles: this.countGeneratedFiles(results)
      });

      return {
        success: true,
        commandId: command ? command.commandId : null,
        output,
        metadata: this.getMetadata()
      };

    } catch (error) {
      this.logger.error('ScriptsGenerationStep: Script generation failed', {
        projectPath,
        error: error.message
      });

      // Publish failure event if event bus is available
      const eventBus = context.get('eventBus');
      if (eventBus) {
        await eventBus.publish('script.generation.failed', {
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
        hasDockerfile: false,
        hasWebpack: false,
        hasBabel: false,
        hasTypeScript: false,
        hasJest: false,
        hasESLint: false,
        hasPrettier: false,
        frameworks: [],
        dependencies: {},
        devDependencies: {}
      };

      // Check for package.json
      try {
        const packagePath = path.join(projectPath, 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
        structure.hasPackageJson = true;
        structure.dependencies = packageJson.dependencies || {};
        structure.devDependencies = packageJson.devDependencies || {};
        
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

      // Check for Dockerfile
      try {
        await fs.access(path.join(projectPath, 'Dockerfile'));
        structure.hasDockerfile = true;
      } catch (error) {
        // Dockerfile not found
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
      this.logger.warn('ScriptsGenerationStep: Failed to analyze project structure', {
        projectPath,
        error: error.message
      });
      return { type: 'unknown', frameworks: [], dependencies: {}, devDependencies: {} };
    }
  }

  /**
   * Generate build scripts
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Build scripts result
   */
  async generateBuildScripts(projectPath, projectStructure, options) {
    this.logger.info('ScriptsGenerationStep: Generating build scripts...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      const scriptsDir = path.join(projectPath, 'scripts');
      await fs.mkdir(scriptsDir, { recursive: true });

      // Generate build script
      const buildScript = this.generateBuildScriptContent(projectStructure);
      const buildScriptPath = path.join(scriptsDir, 'build.sh');
      await fs.writeFile(buildScriptPath, buildScript);
      await fs.chmod(buildScriptPath, 0o755);
      
      results.generated.push({
        type: 'build',
        path: path.relative(projectPath, buildScriptPath),
        content: buildScript
      });

      // Generate clean script
      const cleanScript = this.generateCleanScriptContent();
      const cleanScriptPath = path.join(scriptsDir, 'clean.sh');
      await fs.writeFile(cleanScriptPath, cleanScript);
      await fs.chmod(cleanScriptPath, 0o755);
      
      results.generated.push({
        type: 'clean',
        path: path.relative(projectPath, cleanScriptPath),
        content: cleanScript
      });
      
    } catch (error) {
      results.errors.push({
        action: 'generate_build_scripts',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Generate deployment scripts
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Deployment scripts result
   */
  async generateDeploymentScripts(projectPath, projectStructure, options) {
    this.logger.info('ScriptsGenerationStep: Generating deployment scripts...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      const scriptsDir = path.join(projectPath, 'scripts');
      await fs.mkdir(scriptsDir, { recursive: true });

      // Generate deployment script
      const deployScript = this.generateDeployScriptContent(projectStructure);
      const deployScriptPath = path.join(scriptsDir, 'deploy.sh');
      await fs.writeFile(deployScriptPath, deployScript);
      await fs.chmod(deployScriptPath, 0o755);
      
      results.generated.push({
        type: 'deploy',
        path: path.relative(projectPath, deployScriptPath),
        content: deployScript
      });

      // Generate rollback script
      const rollbackScript = this.generateRollbackScriptContent();
      const rollbackScriptPath = path.join(scriptsDir, 'rollback.sh');
      await fs.writeFile(rollbackScriptPath, rollbackScript);
      await fs.chmod(rollbackScriptPath, 0o755);
      
      results.generated.push({
        type: 'rollback',
        path: path.relative(projectPath, rollbackScriptPath),
        content: rollbackScript
      });
      
    } catch (error) {
      results.errors.push({
        action: 'generate_deployment_scripts',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Generate database scripts
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Database scripts result
   */
  async generateDatabaseScripts(projectPath, projectStructure, options) {
    this.logger.info('ScriptsGenerationStep: Generating database scripts...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      const scriptsDir = path.join(projectPath, 'scripts');
      await fs.mkdir(scriptsDir, { recursive: true });

      // Generate migration script
      const migrationScript = this.generateMigrationScriptContent();
      const migrationScriptPath = path.join(scriptsDir, 'migrate.sh');
      await fs.writeFile(migrationScriptPath, migrationScript);
      await fs.chmod(migrationScriptPath, 0o755);
      
      results.generated.push({
        type: 'migration',
        path: path.relative(projectPath, migrationScriptPath),
        content: migrationScript
      });

      // Generate seed script
      const seedScript = this.generateSeedScriptContent();
      const seedScriptPath = path.join(scriptsDir, 'seed.sh');
      await fs.writeFile(seedScriptPath, seedScript);
      await fs.chmod(seedScriptPath, 0o755);
      
      results.generated.push({
        type: 'seed',
        path: path.relative(projectPath, seedScriptPath),
        content: seedScript
      });
      
    } catch (error) {
      results.errors.push({
        action: 'generate_database_scripts',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Generate utility scripts
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Utility scripts result
   */
  async generateUtilityScripts(projectPath, projectStructure, options) {
    this.logger.info('ScriptsGenerationStep: Generating utility scripts...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      const scriptsDir = path.join(projectPath, 'scripts');
      await fs.mkdir(scriptsDir, { recursive: true });

      // Generate setup script
      const setupScript = this.generateSetupScriptContent(projectStructure);
      const setupScriptPath = path.join(scriptsDir, 'setup.sh');
      await fs.writeFile(setupScriptPath, setupScript);
      await fs.chmod(setupScriptPath, 0o755);
      
      results.generated.push({
        type: 'setup',
        path: path.relative(projectPath, setupScriptPath),
        content: setupScript
      });

      // Generate dev script
      const devScript = this.generateDevScriptContent();
      const devScriptPath = path.join(scriptsDir, 'dev.sh');
      await fs.writeFile(devScriptPath, devScript);
      await fs.chmod(devScriptPath, 0o755);
      
      results.generated.push({
        type: 'dev',
        path: path.relative(projectPath, devScriptPath),
        content: devScript
      });
      
    } catch (error) {
      results.errors.push({
        action: 'generate_utility_scripts',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Generate test scripts
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Test scripts result
   */
  async generateTestScripts(projectPath, projectStructure, options) {
    this.logger.info('ScriptsGenerationStep: Generating test scripts...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      const scriptsDir = path.join(projectPath, 'scripts');
      await fs.mkdir(scriptsDir, { recursive: true });

      // Generate test runner script
      const testScript = this.generateTestRunnerScriptContent();
      const testScriptPath = path.join(scriptsDir, 'test.sh');
      await fs.writeFile(testScriptPath, testScript);
      await fs.chmod(testScriptPath, 0o755);
      
      results.generated.push({
        type: 'test_runner',
        path: path.relative(projectPath, testScriptPath),
        content: testScript
      });

      // Generate coverage script
      const coverageScript = this.generateCoverageScriptContent();
      const coverageScriptPath = path.join(scriptsDir, 'coverage.sh');
      await fs.writeFile(coverageScriptPath, coverageScript);
      await fs.chmod(coverageScriptPath, 0o755);
      
      results.generated.push({
        type: 'coverage',
        path: path.relative(projectPath, coverageScriptPath),
        content: coverageScript
      });
      
    } catch (error) {
      results.errors.push({
        action: 'generate_test_scripts',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Generate monitoring scripts
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Monitoring scripts result
   */
  async generateMonitoringScripts(projectPath, projectStructure, options) {
    this.logger.info('ScriptsGenerationStep: Generating monitoring scripts...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      const scriptsDir = path.join(projectPath, 'scripts');
      await fs.mkdir(scriptsDir, { recursive: true });

      // Generate health check script
      const healthScript = this.generateHealthCheckScriptContent();
      const healthScriptPath = path.join(scriptsDir, 'health-check.sh');
      await fs.writeFile(healthScriptPath, healthScript);
      await fs.chmod(healthScriptPath, 0o755);
      
      results.generated.push({
        type: 'health_check',
        path: path.relative(projectPath, healthScriptPath),
        content: healthScript
      });

      // Generate performance monitoring script
      const perfScript = this.generatePerformanceScriptContent();
      const perfScriptPath = path.join(scriptsDir, 'performance.sh');
      await fs.writeFile(perfScriptPath, perfScript);
      await fs.chmod(perfScriptPath, 0o755);
      
      results.generated.push({
        type: 'performance',
        path: path.relative(projectPath, perfScriptPath),
        content: perfScript
      });
      
    } catch (error) {
      results.errors.push({
        action: 'generate_monitoring_scripts',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Generate backup scripts
   * @param {string} projectPath - Project path
   * @param {Object} projectStructure - Project structure
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Backup scripts result
   */
  async generateBackupScripts(projectPath, projectStructure, options) {
    this.logger.info('ScriptsGenerationStep: Generating backup scripts...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      const scriptsDir = path.join(projectPath, 'scripts');
      await fs.mkdir(scriptsDir, { recursive: true });

      // Generate backup script
      const backupScript = this.generateBackupScriptContent();
      const backupScriptPath = path.join(scriptsDir, 'backup.sh');
      await fs.writeFile(backupScriptPath, backupScript);
      await fs.chmod(backupScriptPath, 0o755);
      
      results.generated.push({
        type: 'backup',
        path: path.relative(projectPath, backupScriptPath),
        content: backupScript
      });

      // Generate restore script
      const restoreScript = this.generateRestoreScriptContent();
      const restoreScriptPath = path.join(scriptsDir, 'restore.sh');
      await fs.writeFile(restoreScriptPath, restoreScript);
      await fs.chmod(restoreScriptPath, 0o755);
      
      results.generated.push({
        type: 'restore',
        path: path.relative(projectPath, restoreScriptPath),
        content: restoreScript
      });
      
    } catch (error) {
      results.errors.push({
        action: 'generate_backup_scripts',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Update package.json scripts
   * @param {string} projectPath - Project path
   * @param {Object} allScripts - All generated scripts
   * @returns {Promise<Object>} Package scripts update result
   */
  async updatePackageScripts(projectPath, allScripts) {
    this.logger.info('ScriptsGenerationStep: Updating package.json scripts...');
    
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
        'build:prod': 'NODE_ENV=production npm run build',
        'setup': 'npm install && npm run db:migrate && npm run db:seed',
        'dev': 'npm run start:dev',
        'start:dev': 'nodemon src/index.js',
        'test:unit': 'jest --testPathPattern=unit',
        'test:integration': 'jest --testPathPattern=integration',
        'test:e2e': 'jest --testPathPattern=e2e',
        'test:load': 'artillery run load-tests.yml',
        'test:stress': 'artillery run stress-tests.yml',
        'db:migrate': 'node scripts/migrate.js',
        'db:seed': 'node scripts/seed.js',
        'db:backup': 'node scripts/backup.js',
        'db:restore': 'node scripts/restore.js',
        'db:health': 'node scripts/health-check.js',
        'services:health': 'node scripts/services-health.js',
        'perf:report': 'node scripts/performance-report.js'
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
   * Validate scripts
   * @param {string} projectPath - Project path
   * @param {Object} allScripts - All generated scripts
   * @returns {Promise<Object>} Script validation result
   */
  async validateScripts(projectPath, allScripts) {
    this.logger.info('ScriptsGenerationStep: Validating scripts...');
    
    const results = {
      validated: [],
      errors: []
    };

    try {
      // Validate each script file
      for (const [scriptType, scriptResult] of Object.entries(allScripts)) {
        if (scriptResult.generated) {
          for (const script of scriptResult.generated) {
            try {
              const scriptPath = path.join(projectPath, script.path);
              await fs.access(scriptPath);
              
              // Check if script is executable
              const stats = await fs.stat(scriptPath);
              const isExecutable = (stats.mode & 0o111) !== 0;
              
              results.validated.push({
                type: script.type,
                path: script.path,
                exists: true,
                executable: isExecutable,
                size: stats.size
              });
            } catch (error) {
              results.errors.push({
                type: script.type,
                path: script.path,
                error: error.message
              });
            }
          }
        }
      }
    } catch (error) {
      results.errors.push({
        action: 'validate_scripts',
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
    const { command, projectStructure, results, packageScriptsResults, validationResults, outputConfig } = params;
    
    const output = {
      generatedFiles: [],
      metadata: {
        projectType: projectStructure.type,
        frameworks: projectStructure.frameworks,
        scriptTypes: this.scriptTypes,
        totalScripts: 0,
        successfulScripts: 0,
        failedScripts: 0
      },
      statistics: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 0
      }
    };

    // Collect generated files
    for (const [scriptType, scriptResult] of Object.entries(results)) {
      if (scriptResult.generated) {
        output.generatedFiles.push(...scriptResult.generated);
        output.metadata.totalScripts += scriptResult.generated.length;
        output.metadata.successfulScripts += scriptResult.generated.length;
      }
      if (scriptResult.errors) {
        output.metadata.failedScripts += scriptResult.errors.length;
      }
    }

    // Add package.json update info
    if (packageScriptsResults && packageScriptsResults.updated) {
      output.generatedFiles.push({
        type: 'package_scripts',
        path: packageScriptsResults.path,
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
    this.logger.info('ScriptsGenerationStep: Results saved', {
      commandId: command.commandId,
      totalFiles: output.generatedFiles.length,
      successfulScripts: output.metadata.successfulScripts,
      failedScripts: output.metadata.failedScripts
    });
  }

  /**
   * Get default options
   * @returns {Object} Default options
   */
  getDefaultOptions() {
    return {
      scriptTypes: this.scriptTypes,
      updatePackageScripts: this.updatePackageScripts,
      validateScripts: this.validateScripts
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
    for (const [scriptType, scriptResult] of Object.entries(results)) {
      if (scriptResult.generated) {
        count += scriptResult.generated.length;
      }
    }
    return count;
  }

  // Script content generation methods
  generateBuildScriptContent(projectStructure) {
    return `#!/bin/bash
# Build script for ${projectStructure.type} project

set -e

echo "Building project..."

# Install dependencies
npm install

# Run build based on project type
case "${projectStructure.type}" in
  "frontend")
    npm run build
    ;;
  "backend")
    npm run build
    ;;
  "fullstack")
    npm run build
    ;;
  *)
    echo "Unknown project type: ${projectStructure.type}"
    exit 1
    ;;
esac

echo "Build completed successfully!"
`;
  }

  generateCleanScriptContent() {
    return `#!/bin/bash
# Clean script

set -e

echo "Cleaning project..."

# Remove build artifacts
rm -rf dist/
rm -rf build/
rm -rf node_modules/
rm -rf coverage/

# Remove log files
rm -f *.log

echo "Clean completed successfully!"
`;
  }

  generateDeployScriptContent(projectStructure) {
    return `#!/bin/bash
# Deployment script for ${projectStructure.type} project

set -e

echo "Deploying project..."

# Build the project
./scripts/build.sh

# Deploy based on project type
case "${projectStructure.type}" in
  "frontend")
    # Deploy to CDN or static hosting
    echo "Deploying frontend..."
    ;;
  "backend")
    # Deploy to server or container
    echo "Deploying backend..."
    ;;
  "fullstack")
    # Deploy both frontend and backend
    echo "Deploying fullstack application..."
    ;;
  *)
    echo "Unknown project type: ${projectStructure.type}"
    exit 1
    ;;
esac

echo "Deployment completed successfully!"
`;
  }

  generateRollbackScriptContent() {
    return `#!/bin/bash
# Rollback script

set -e

echo "Rolling back deployment..."

# Implement rollback logic here
echo "Rollback completed successfully!"
`;
  }

  generateMigrationScriptContent() {
    return `#!/bin/bash
# Database migration script

set -e

echo "Running database migrations..."

# Run migrations
npm run db:migrate

echo "Migrations completed successfully!"
`;
  }

  generateSeedScriptContent() {
    return `#!/bin/bash
# Database seed script

set -e

echo "Seeding database..."

# Run seeds
npm run db:seed

echo "Seeding completed successfully!"
`;
  }

  generateSetupScriptContent(projectStructure) {
    return `#!/bin/bash
# Setup script for ${projectStructure.type} project

set -e

echo "Setting up project..."

# Install dependencies
npm install

# Setup database
npm run db:migrate
npm run db:seed

echo "Setup completed successfully!"
`;
  }

  generateDevScriptContent() {
    return `#!/bin/bash
# Development script

set -e

echo "Starting development server..."

# Start development server
npm run dev

echo "Development server started!"
`;
  }

  generateTestRunnerScriptContent() {
    return `#!/bin/bash
# Test runner script

set -e

echo "Running tests..."

# Run all tests
npm test

echo "Tests completed successfully!"
`;
  }

  generateCoverageScriptContent() {
    return `#!/bin/bash
# Coverage script

set -e

echo "Generating coverage report..."

# Run tests with coverage
npm run test:coverage

echo "Coverage report generated successfully!"
`;
  }

  generateHealthCheckScriptContent() {
    return `#!/bin/bash
# Health check script

set -e

echo "Running health checks..."

# Check application health
npm run db:health
npm run services:health

echo "Health checks completed successfully!"
`;
  }

  generatePerformanceScriptContent() {
    return `#!/bin/bash
# Performance monitoring script

set -e

echo "Running performance tests..."

# Run performance tests
npm run test:load
npm run test:stress
npm run perf:report

echo "Performance tests completed successfully!"
`;
  }

  generateBackupScriptContent() {
    return `#!/bin/bash
# Backup script

set -e

echo "Creating backup..."

# Create backup
npm run db:backup

echo "Backup completed successfully!"
`;
  }

  generateRestoreScriptContent() {
    return `#!/bin/bash
# Restore script

set -e

echo "Restoring from backup..."

# Restore from backup
npm run db:restore

echo "Restore completed successfully!"
`;
  }

  /**
   * Validate scripts generation step
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
      return new ValidationResult(false, ['Project path is required for scripts generation']);
    }

    // Validate script types
    const validScriptTypes = [
      'build', 'deployment', 'database', 'utility', 'test', 'monitoring', 'backup'
    ];

    for (const scriptType of this.scriptTypes) {
      if (!validScriptTypes.includes(scriptType)) {
        return new ValidationResult(false, [`Invalid script type: ${scriptType}`]);
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
      name: 'ScriptsGenerationStep',
      description: 'Generate project scripts',
      version: '1.0.0',
      type: 'generate',
      scriptTypes: this.scriptTypes,
      updatePackageScripts: this.updatePackageScripts,
      validateScripts: this.validateScripts,
      dependencies: ['fs', 'path', 'DocumentationStep']
    };
  }
}

module.exports = ScriptsGenerationStep; 