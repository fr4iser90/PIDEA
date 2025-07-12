/**
 * ScriptGenerationStep - Single script generation workflow step
 * 
 * This step handles single script generation operations, migrating the logic from
 * GenerateScriptHandler to the unified workflow system. It provides
 * validation, complexity management, and performance optimization for script generation.
 */
const { DocumentationStep } = require('./DocumentationStep');
const fs = require('fs').promises;
const path = require('path');

/**
 * Single script generation workflow step
 */
class ScriptGenerationStep extends DocumentationStep {
  /**
   * Create a new script generation step
   * @param {Object} options - Step options
   */
  constructor(options = {}) {
    super('generate-script', {
      name: 'script_generation',
      description: 'Generate single project script',
      version: '1.0.0',
      ...options
    });
    
    this.scriptType = options.scriptType || 'build';
    this.scriptName = options.scriptName || 'script';
    this.scriptContent = options.scriptContent || null;
    this.scriptExtension = options.scriptExtension || 'sh';
    this.makeExecutable = options.makeExecutable !== false;
    this.logger = options.logger || console;
  }

  /**
   * Execute script generation step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Script generation result
   */
  async executeStep(context) {
    const projectPath = context.get('projectPath');
    const command = context.get('command');
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }

    this.logger.info('ScriptGenerationStep: Starting script generation', {
      projectPath,
      scriptType: this.scriptType,
      scriptName: this.scriptName,
      scriptExtension: this.scriptExtension,
      makeExecutable: this.makeExecutable
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
      
      // Step 4: Generate script content
      const scriptContent = await this.generateScriptContent(projectStructure, options);
      
      // Step 5: Create script file
      const scriptResult = await this.createScriptFile(projectPath, scriptContent, options);
      
      // Step 6: Validate script (if enabled)
      let validationResults = null;
      if (options.validateScript) {
        validationResults = await this.validateScript(projectPath, scriptResult);
      }

      // Step 7: Generate output
      const output = await this.generateOutput({
        command,
        projectStructure,
        scriptResult,
        validationResults,
        outputConfig
      });

      // Step 8: Save results
      if (command) {
        await this.saveResults(command, output);
      }

      this.logger.info('ScriptGenerationStep: Script generation completed successfully', {
        projectPath,
        scriptPath: scriptResult.path,
        scriptSize: scriptResult.size
      });

      return {
        success: true,
        commandId: command ? command.commandId : null,
        output,
        metadata: this.getMetadata()
      };

    } catch (error) {
      this.logger.error('ScriptGenerationStep: Script generation failed', {
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
        hasSrc: false,
        hasPublic: false,
        hasDist: false,
        hasScripts: false,
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
      const commonDirs = ['src', 'public', 'dist', 'scripts'];
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
      this.logger.warn('ScriptGenerationStep: Failed to analyze project structure', {
        projectPath,
        error: error.message
      });
      return { type: 'unknown', frameworks: [], dependencies: {}, devDependencies: {}, scripts: {} };
    }
  }

  /**
   * Generate script content
   * @param {Object} projectStructure - Project structure
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Script content
   */
  async generateScriptContent(projectStructure, options) {
    this.logger.info('ScriptGenerationStep: Generating script content...');
    
    // Use provided script content if available
    if (this.scriptContent) {
      return this.scriptContent;
    }

    // Generate content based on script type
    switch (this.scriptType) {
      case 'build':
        return this.generateBuildScriptContent(projectStructure);
      case 'deploy':
        return this.generateDeployScriptContent(projectStructure);
      case 'test':
        return this.generateTestScriptContent(projectStructure);
      case 'dev':
        return this.generateDevScriptContent(projectStructure);
      case 'clean':
        return this.generateCleanScriptContent(projectStructure);
      case 'setup':
        return this.generateSetupScriptContent(projectStructure);
      case 'start':
        return this.generateStartScriptContent(projectStructure);
      case 'stop':
        return this.generateStopScriptContent(projectStructure);
      case 'restart':
        return this.generateRestartScriptContent(projectStructure);
      case 'backup':
        return this.generateBackupScriptContent(projectStructure);
      case 'restore':
        return this.generateRestoreScriptContent(projectStructure);
      case 'migrate':
        return this.generateMigrateScriptContent(projectStructure);
      case 'seed':
        return this.generateSeedScriptContent(projectStructure);
      case 'lint':
        return this.generateLintScriptContent(projectStructure);
      case 'format':
        return this.generateFormatScriptContent(projectStructure);
      case 'custom':
        return this.generateCustomScriptContent(projectStructure, options);
      default:
        return this.generateGenericScriptContent(projectStructure);
    }
  }

  /**
   * Create script file
   * @param {string} projectPath - Project path
   * @param {string} scriptContent - Script content
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Script file result
   */
  async createScriptFile(projectPath, scriptContent, options) {
    this.logger.info('ScriptGenerationStep: Creating script file...');
    
    const results = {
      generated: [],
      errors: []
    };

    try {
      // Determine script directory
      const scriptDir = options.scriptDirectory || 'scripts';
      const fullScriptDir = path.join(projectPath, scriptDir);
      await fs.mkdir(fullScriptDir, { recursive: true });

      // Create script file
      const scriptFileName = `${this.scriptName}.${this.scriptExtension}`;
      const scriptFilePath = path.join(fullScriptDir, scriptFileName);
      await fs.writeFile(scriptFilePath, scriptContent);
      
      // Make executable if requested
      if (this.makeExecutable && this.scriptExtension === 'sh') {
        await fs.chmod(scriptFilePath, 0o755);
      }
      
      // Get file stats
      const stats = await fs.stat(scriptFilePath);
      
      results.generated.push({
        type: 'script',
        path: path.relative(projectPath, scriptFilePath),
        content: scriptContent,
        size: stats.size,
        executable: this.makeExecutable && this.scriptExtension === 'sh'
      });
      
    } catch (error) {
      results.errors.push({
        action: 'create_script_file',
        error: error.message
      });
    }

    return results;
  }

  /**
   * Validate script
   * @param {string} projectPath - Project path
   * @param {Object} scriptResult - Script result
   * @returns {Promise<Object>} Script validation result
   */
  async validateScript(projectPath, scriptResult) {
    this.logger.info('ScriptGenerationStep: Validating script...');
    
    const results = {
      validated: [],
      errors: []
    };

    try {
      // Validate each generated script
      for (const script of scriptResult.generated) {
        try {
          const scriptPath = path.join(projectPath, script.path);
          await fs.access(scriptPath);
          
          // Check if script is executable (if it should be)
          const stats = await fs.stat(scriptPath);
          const isExecutable = (stats.mode & 0o111) !== 0;
          
          results.validated.push({
            type: script.type,
            path: script.path,
            exists: true,
            executable: isExecutable,
            size: stats.size,
            expectedExecutable: script.executable
          });
        } catch (error) {
          results.errors.push({
            type: script.type,
            path: script.path,
            error: error.message
          });
        }
      }
    } catch (error) {
      results.errors.push({
        action: 'validate_script',
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
    const { command, projectStructure, scriptResult, validationResults, outputConfig } = params;
    
    const output = {
      generatedFiles: [],
      metadata: {
        projectType: projectStructure.type,
        frameworks: projectStructure.frameworks,
        scriptType: this.scriptType,
        scriptName: this.scriptName,
        scriptExtension: this.scriptExtension,
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
    if (scriptResult.generated) {
      output.generatedFiles.push(...scriptResult.generated);
      output.metadata.totalScripts += scriptResult.generated.length;
      output.metadata.successfulScripts += scriptResult.generated.length;
    }
    if (scriptResult.errors) {
      output.metadata.failedScripts += scriptResult.errors.length;
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
    this.logger.info('ScriptGenerationStep: Results saved', {
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
      scriptType: this.scriptType,
      scriptName: this.scriptName,
      scriptExtension: this.scriptExtension,
      makeExecutable: this.makeExecutable,
      validateScript: true,
      scriptDirectory: 'scripts'
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

  generateTestScriptContent(projectStructure) {
    return `#!/bin/bash
# Test script for ${projectStructure.type} project

set -e

echo "Running tests..."

# Run tests
npm test

# Run coverage if available
if npm run test:coverage 2>/dev/null; then
    echo "Coverage report generated"
fi

echo "Tests completed successfully!"
`;
  }

  generateDevScriptContent(projectStructure) {
    return `#!/bin/bash
# Development script for ${projectStructure.type} project

set -e

echo "Starting development server..."

# Start development server
npm run dev

echo "Development server started!"
`;
  }

  generateCleanScriptContent(projectStructure) {
    return `#!/bin/bash
# Clean script for ${projectStructure.type} project

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

  generateSetupScriptContent(projectStructure) {
    return `#!/bin/bash
# Setup script for ${projectStructure.type} project

set -e

echo "Setting up project..."

# Install dependencies
npm install

# Setup database if needed
if [ -f "scripts/migrate.sh" ]; then
    ./scripts/migrate.sh
fi

if [ -f "scripts/seed.sh" ]; then
    ./scripts/seed.sh
fi

echo "Setup completed successfully!"
`;
  }

  generateStartScriptContent(projectStructure) {
    return `#!/bin/bash
# Start script for ${projectStructure.type} project

set -e

echo "Starting application..."

# Start the application
npm start

echo "Application started!"
`;
  }

  generateStopScriptContent(projectStructure) {
    return `#!/bin/bash
# Stop script for ${projectStructure.type} project

set -e

echo "Stopping application..."

# Find and kill the process
pkill -f "npm start" || true
pkill -f "node.*index.js" || true

echo "Application stopped!"
`;
  }

  generateRestartScriptContent(projectStructure) {
    return `#!/bin/bash
# Restart script for ${projectStructure.type} project

set -e

echo "Restarting application..."

# Stop the application
./scripts/stop.sh

# Wait a moment
sleep 2

# Start the application
./scripts/start.sh

echo "Application restarted!"
`;
  }

  generateBackupScriptContent(projectStructure) {
    return `#!/bin/bash
# Backup script for ${projectStructure.type} project

set -e

echo "Creating backup..."

# Create backup directory
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup important files
cp -r src/ "$BACKUP_DIR/" 2>/dev/null || true
cp -r public/ "$BACKUP_DIR/" 2>/dev/null || true
cp package*.json "$BACKUP_DIR/" 2>/dev/null || true

echo "Backup created in $BACKUP_DIR"
`;
  }

  generateRestoreScriptContent(projectStructure) {
    return `#!/bin/bash
# Restore script for ${projectStructure.type} project

set -e

echo "Restoring from backup..."

# Check if backup directory is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <backup_directory>"
    exit 1
fi

BACKUP_DIR="$1"

if [ ! -d "$BACKUP_DIR" ]; then
    echo "Backup directory not found: $BACKUP_DIR"
    exit 1
fi

# Restore files
cp -r "$BACKUP_DIR"/* ./

echo "Restore completed from $BACKUP_DIR"
`;
  }

  generateMigrateScriptContent(projectStructure) {
    return `#!/bin/bash
# Migration script for ${projectStructure.type} project

set -e

echo "Running database migrations..."

# Run migrations
npm run db:migrate

echo "Migrations completed successfully!"
`;
  }

  generateSeedScriptContent(projectStructure) {
    return `#!/bin/bash
# Seed script for ${projectStructure.type} project

set -e

echo "Seeding database..."

# Run seeds
npm run db:seed

echo "Seeding completed successfully!"
`;
  }

  generateLintScriptContent(projectStructure) {
    return `#!/bin/bash
# Lint script for ${projectStructure.type} project

set -e

echo "Running linter..."

# Run linting
npm run lint

echo "Linting completed successfully!"
`;
  }

  generateFormatScriptContent(projectStructure) {
    return `#!/bin/bash
# Format script for ${projectStructure.type} project

set -e

echo "Formatting code..."

# Run formatting
npm run format

echo "Formatting completed successfully!"
`;
  }

  generateCustomScriptContent(projectStructure, options) {
    return `#!/bin/bash
# Custom script for ${projectStructure.type} project

set -e

echo "Running custom script..."

# Add your custom logic here
echo "Custom script executed successfully!"

# Example custom commands:
# npm run custom-command
# node scripts/custom.js
# ./scripts/custom.sh
`;
  }

  generateGenericScriptContent(projectStructure) {
    return `#!/bin/bash
# Generic script for ${projectStructure.type} project

set -e

echo "Executing generic script..."

# Generic script logic
echo "Script executed successfully!"

# Add your specific logic here
`;
  }

  /**
   * Validate script generation step
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
      return new ValidationResult(false, ['Project path is required for script generation']);
    }

    // Validate script type
    const validScriptTypes = [
      'build', 'deploy', 'test', 'dev', 'clean', 'setup', 'start', 'stop',
      'restart', 'backup', 'restore', 'migrate', 'seed', 'lint', 'format', 'custom'
    ];

    if (!validScriptTypes.includes(this.scriptType)) {
      return new ValidationResult(false, [`Invalid script type: ${this.scriptType}`]);
    }

    // Validate script extension
    const validExtensions = ['sh', 'js', 'py', 'rb', 'pl'];
    if (!validExtensions.includes(this.scriptExtension)) {
      return new ValidationResult(false, [`Invalid script extension: ${this.scriptExtension}`]);
    }

    return new ValidationResult(true, []);
  }

  /**
   * Get step metadata
   * @returns {Object} Step metadata
   */
  getMetadata() {
    return {
      name: 'ScriptGenerationStep',
      description: 'Generate single project script',
      version: '1.0.0',
      type: 'generate',
      scriptType: this.scriptType,
      scriptName: this.scriptName,
      scriptExtension: this.scriptExtension,
      makeExecutable: this.makeExecutable,
      dependencies: ['fs', 'path', 'DocumentationStep']
    };
  }
}

module.exports = ScriptGenerationStep; 