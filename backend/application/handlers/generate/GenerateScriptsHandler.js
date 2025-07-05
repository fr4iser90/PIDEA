/**
 * GenerateScriptsHandler - Handles script generation
 * Implements the Handler pattern for script generation
 */
const fs = require('fs').promises;
const path = require('path');
const EventBus = require('../../../infrastructure/messaging/EventBus');
const AnalysisRepository = require('../../../domain/repositories/AnalysisRepository');

class GenerateScriptsHandler {
    constructor(dependencies = {}) {
        this.eventBus = dependencies.eventBus || new EventBus();
        this.analysisRepository = dependencies.analysisRepository || new AnalysisRepository();
        this.logger = dependencies.logger || console;
    }

    async handle(command) {
        this.logger.info(`Starting script generation for project: ${command.projectPath}`);

        try {
            const validation = command.validateBusinessRules();
            if (!validation.isValid) {
                throw new Error(`Business rule validation failed: ${validation.errors.join(', ')}`);
            }

            const options = command.getGenerateOptions();
            const outputConfig = command.getOutputConfiguration();

            // Step 1: Analyze project structure
            const projectStructure = await this.analyzeProjectStructure(command.projectPath);
            
            // Step 2: Generate build scripts (if enabled)
            let buildScriptsResults = null;
            if (options.scriptTypes.includes('build')) {
                buildScriptsResults = await this.generateBuildScripts(command.projectPath, projectStructure, options);
            }
            
            // Step 3: Generate deployment scripts (if enabled)
            let deploymentScriptsResults = null;
            if (options.scriptTypes.includes('deployment')) {
                deploymentScriptsResults = await this.generateDeploymentScripts(command.projectPath, projectStructure, options);
            }
            
            // Step 4: Generate database scripts (if enabled)
            let databaseScriptsResults = null;
            if (options.scriptTypes.includes('database')) {
                databaseScriptsResults = await this.generateDatabaseScripts(command.projectPath, projectStructure, options);
            }
            
            // Step 5: Generate utility scripts (if enabled)
            let utilityScriptsResults = null;
            if (options.scriptTypes.includes('utility')) {
                utilityScriptsResults = await this.generateUtilityScripts(command.projectPath, projectStructure, options);
            }
            
            // Step 6: Generate test scripts (if enabled)
            let testScriptsResults = null;
            if (options.scriptTypes.includes('test')) {
                testScriptsResults = await this.generateTestScripts(command.projectPath, projectStructure, options);
            }
            
            // Step 7: Generate monitoring scripts (if enabled)
            let monitoringScriptsResults = null;
            if (options.scriptTypes.includes('monitoring')) {
                monitoringScriptsResults = await this.generateMonitoringScripts(command.projectPath, projectStructure, options);
            }
            
            // Step 8: Generate backup scripts (if enabled)
            let backupScriptsResults = null;
            if (options.scriptTypes.includes('backup')) {
                backupScriptsResults = await this.generateBackupScripts(command.projectPath, projectStructure, options);
            }
            
            // Step 9: Update package.json scripts (if enabled)
            let packageScriptsResults = null;
            if (options.updatePackageScripts) {
                packageScriptsResults = await this.updatePackageScripts(command.projectPath, {
                    build: buildScriptsResults,
                    deployment: deploymentScriptsResults,
                    database: databaseScriptsResults,
                    utility: utilityScriptsResults,
                    test: testScriptsResults,
                    monitoring: monitoringScriptsResults,
                    backup: backupScriptsResults
                });
            }
            
            // Step 10: Validate scripts
            let validationResults = null;
            if (options.validateScripts) {
                validationResults = await this.validateScripts(command.projectPath, {
                    build: buildScriptsResults,
                    deployment: deploymentScriptsResults,
                    database: databaseScriptsResults,
                    utility: utilityScriptsResults,
                    test: testScriptsResults,
                    monitoring: monitoringScriptsResults,
                    backup: backupScriptsResults
                });
            }

            // Step 11: Generate output
            const output = await this.generateOutput({
                command,
                projectStructure,
                buildScriptsResults,
                deploymentScriptsResults,
                databaseScriptsResults,
                utilityScriptsResults,
                testScriptsResults,
                monitoringScriptsResults,
                backupScriptsResults,
                packageScriptsResults,
                validationResults,
                outputConfig
            });

            // Step 12: Save results
            await this.saveResults(command, output);

            this.logger.info(`Script generation completed successfully for project: ${command.projectPath}`);
            
            return {
                success: true,
                commandId: command.commandId,
                output,
                metadata: command.getMetadata()
            };

        } catch (error) {
            this.logger.error(`Script generation failed for project ${command.projectPath}:`, error);
            
            await this.eventBus.publish('script.generation.failed', {
                commandId: command.commandId,
                projectPath: command.projectPath,
                error: error.message,
                timestamp: new Date()
            });

            throw error;
        }
    }

    async analyzeProjectStructure(projectPath) {
        this.logger.info('Analyzing project structure...');
        
        const structure = {
            files: [],
            directories: [],
            techStack: {},
            metrics: {}
        };

        try {
            await this.scanProject(projectPath, structure);
            structure.techStack = this.detectTechStack(structure);
            structure.metrics = this.calculateProjectMetrics(structure);
            
            return structure;
        } catch (error) {
            throw new Error(`Failed to analyze project structure: ${error.message}`);
        }
    }

    async scanProject(projectPath, structure, relativePath = '') {
        const entries = await fs.readdir(projectPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(projectPath, entry.name);
            const relativeEntryPath = path.join(relativePath, entry.name);
            
            if (entry.isDirectory === true) {
                if (!this.shouldSkipDirectory(entry.name)) {
                    structure.directories.push({
                        path: relativeEntryPath,
                        name: entry.name,
                        type: this.classifyDirectory(entry.name)
                    });
                    
                    await this.scanProject(fullPath, structure, relativeEntryPath);
                }
            } else if (entry.isFile === true) {
                if (this.isCodeFile(entry.name)) {
                    const fileInfo = await this.analyzeFile(fullPath, relativeEntryPath);
                    structure.files.push(fileInfo);
                }
            }
        }
    }

    shouldSkipDirectory(dirName) {
        const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt'];
        return skipDirs.includes(dirName);
    }

    classifyDirectory(dirName) {
        const patterns = {
            source: ['src', 'app', 'lib', 'components'],
            config: ['config', 'configs', 'settings'],
            test: ['test', 'tests', '__tests__', 'spec'],
            scripts: ['scripts', 'bin', 'tools']
        };

        for (const [type, keywords] of Object.entries(patterns)) {
            if (keywords.some(keyword => dirName.toLowerCase().includes(keyword))) {
                return type;
            }
        }
        
        return 'other';
    }

    isCodeFile(fileName) {
        const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'];
        return codeExtensions.some(ext => fileName.endsWith(ext));
    }

    async analyzeFile(filePath, relativePath) {
        const content = await fs.readFile(filePath, 'utf-8');
        
        return {
            path: relativePath,
            fullPath: filePath,
            size: content.length,
            lines: content.split('\n').length,
            type: this.classifyFile(relativePath)
        };
    }

    classifyFile(filePath) {
        const patterns = {
            component: /\.(jsx?|tsx?|vue|svelte)$/,
            service: /service|api|client/i,
            model: /model|entity|schema/i,
            utility: /util|helper|constant/i,
            test: /\.test\.|\.spec\./
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            if (pattern.test(filePath)) {
                return type;
            }
        }
        
        return 'unknown';
    }

    detectTechStack(structure) {
        const techStack = {
            frameworks: [],
            libraries: [],
            tools: [],
            languages: []
        };

        // Detect languages
        const fileExtensions = new Set();
        structure.files.forEach(file => {
            const ext = path.extname(file.path);
            if (ext) fileExtensions.add(ext);
        });

        if (fileExtensions.has('.js') || fileExtensions.has('.jsx')) {
            techStack.languages.push('javascript');
        }
        if (fileExtensions.has('.ts') || fileExtensions.has('.tsx')) {
            techStack.languages.push('typescript');
        }
        if (fileExtensions.has('.vue')) {
            techStack.languages.push('vue');
        }
        if (fileExtensions.has('.svelte')) {
            techStack.languages.push('svelte');
        }

        // Detect frameworks and libraries based on file patterns
        const hasReact = structure.files.some(file => 
            file.path.includes('react') || file.path.includes('jsx')
        );
        if (hasReact) techStack.frameworks.push('react');

        const hasVue = structure.files.some(file => 
            file.path.includes('vue') || file.path.endsWith('.vue')
        );
        if (hasVue) techStack.frameworks.push('vue');

        const hasExpress = structure.files.some(file => 
            file.path.includes('express') || file.path.includes('server')
        );
        if (hasExpress) techStack.frameworks.push('express');

        return techStack;
    }

    calculateProjectMetrics(structure) {
        return {
            totalFiles: structure.files.length,
            totalDirectories: structure.directories.length,
            fileTypes: this.countFileTypes(structure.files),
            languages: structure.techStack.languages.length,
            frameworks: structure.techStack.frameworks.length
        };
    }

    countFileTypes(files) {
        const types = {};
        files.forEach(file => {
            types[file.type] = (types[file.type] || 0) + 1;
        });
        return types;
    }

    async generateBuildScripts(projectPath, projectStructure, options) {
        this.logger.info('Generating build scripts...');
        
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

    generateBuildScriptContent(projectStructure) {
        const hasTypeScript = projectStructure.techStack.languages.includes('typescript');
        
        return `#!/bin/bash

# Build script for the project
set -e

echo "Starting build process..."

# Install dependencies
echo "Installing dependencies..."
npm ci

# Run linting
echo "Running linting..."
npm run lint

# Run tests
echo "Running tests..."
npm run test

# Build the project
echo "Building the project..."
npm run build

# Create production build
echo "Creating production build..."
npm run build:prod

echo "Build completed successfully!"
`;
    }

    generateCleanScriptContent() {
        return `#!/bin/bash

# Clean script for the project
set -e

echo "Cleaning project..."

# Remove build artifacts
rm -rf dist/
rm -rf build/
rm -rf coverage/

# Remove node_modules (optional)
if [ "$1" = "--all" ]; then
    echo "Removing node_modules..."
    rm -rf node_modules/
fi

# Remove log files
find . -name "*.log" -type f -delete

echo "Clean completed!"
`;
    }

    async generateDeploymentScripts(projectPath, projectStructure, options) {
        this.logger.info('Generating deployment scripts...');
        
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

    generateDeployScriptContent(projectStructure) {
        return `#!/bin/bash

# Deployment script for the project
set -e

echo "Starting deployment process..."

# Build the project
echo "Building the project..."
npm run build

# Run tests
echo "Running tests..."
npm run test

# Deploy to production
echo "Deploying to production..."
# Add your deployment commands here
# Example: docker build -t myapp .
# Example: docker push myapp:latest

echo "Deployment completed successfully!"
`;
    }

    generateRollbackScriptContent() {
        return `#!/bin/bash

# Rollback script for the project
set -e

echo "Starting rollback process..."

# Rollback to previous version
echo "Rolling back to previous version..."
# Add your rollback commands here
# Example: docker pull myapp:previous
# Example: docker-compose down && docker-compose up -d

echo "Rollback completed successfully!"
`;
    }

    async generateDatabaseScripts(projectPath, projectStructure, options) {
        this.logger.info('Generating database scripts...');
        
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

    generateMigrationScriptContent() {
        return `#!/bin/bash

# Database migration script
set -e

echo "Starting database migration..."

# Run migrations
echo "Running migrations..."
npm run migrate

# Verify migration status
echo "Verifying migration status..."
npm run migrate:status

echo "Migration completed successfully!"
`;
    }

    generateSeedScriptContent() {
        return `#!/bin/bash

# Database seed script
set -e

echo "Starting database seeding..."

# Run seeders
echo "Running seeders..."
npm run seed

# Verify seed data
echo "Verifying seed data..."
npm run seed:verify

echo "Seeding completed successfully!"
`;
    }

    async generateUtilityScripts(projectPath, projectStructure, options) {
        this.logger.info('Generating utility scripts...');
        
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

    generateSetupScriptContent(projectStructure) {
        return `#!/bin/bash

# Project setup script
set -e

echo "Setting up the project..."

# Check Node.js version
echo "Checking Node.js version..."
node --version

# Install dependencies
echo "Installing dependencies..."
npm install

# Setup environment
echo "Setting up environment..."
cp .env.example .env

# Run initial setup
echo "Running initial setup..."
npm run setup

echo "Setup completed successfully!"
`;
    }

    generateDevScriptContent() {
        return `#!/bin/bash

# Development script
set -e

echo "Starting development environment..."

# Start development server
echo "Starting development server..."
npm run dev

echo "Development environment started!"
`;
    }

    async generateTestScripts(projectPath, projectStructure, options) {
        this.logger.info('Generating test scripts...');
        
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

    generateTestRunnerScriptContent() {
        return `#!/bin/bash

# Test runner script
set -e

echo "Running tests..."

# Run unit tests
echo "Running unit tests..."
npm run test:unit

# Run integration tests
echo "Running integration tests..."
npm run test:integration

# Run e2e tests
echo "Running e2e tests..."
npm run test:e2e

echo "All tests completed!"
`;
    }

    generateCoverageScriptContent() {
        return `#!/bin/bash

# Coverage script
set -e

echo "Generating test coverage..."

# Run tests with coverage
echo "Running tests with coverage..."
npm run test:coverage

# Generate coverage report
echo "Generating coverage report..."
npm run coverage:report

# Open coverage report
echo "Opening coverage report..."
open coverage/lcov-report/index.html

echo "Coverage report generated!"
`;
    }

    async generateMonitoringScripts(projectPath, projectStructure, options) {
        this.logger.info('Generating monitoring scripts...');
        
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

            // Generate performance script
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

    generateHealthCheckScriptContent() {
        return `#!/bin/bash

# Health check script
set -e

echo "Running health checks..."

# Check if application is running
echo "Checking application status..."
curl -f http://localhost:3000/health || exit 1

# Check database connection
echo "Checking database connection..."
npm run db:health || exit 1

# Check external services
echo "Checking external services..."
npm run services:health || exit 1

echo "Health checks passed!"
`;
    }

    generatePerformanceScriptContent() {
        return `#!/bin/bash

# Performance monitoring script
set -e

echo "Running performance tests..."

# Run load tests
echo "Running load tests..."
npm run test:load

# Run stress tests
echo "Running stress tests..."
npm run test:stress

# Generate performance report
echo "Generating performance report..."
npm run perf:report

echo "Performance tests completed!"
`;
    }

    async generateBackupScripts(projectPath, projectStructure, options) {
        this.logger.info('Generating backup scripts...');
        
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

    generateBackupScriptContent() {
        return `#!/bin/bash

# Backup script
set -e

echo "Starting backup process..."

# Create backup directory
BACKUP_DIR="./backups/\$(date +%Y%m%d_%H%M%S)"
mkdir -p "\$BACKUP_DIR"

# Backup database
echo "Backing up database..."
npm run db:backup -- "\$BACKUP_DIR/database.sql"

# Backup configuration files
echo "Backing up configuration files..."
cp -r config/ "\$BACKUP_DIR/"

# Backup logs
echo "Backing up logs..."
cp -r logs/ "\$BACKUP_DIR/" 2>/dev/null || true

echo "Backup completed: \$BACKUP_DIR"
`;
    }

    generateRestoreScriptContent() {
        return `#!/bin/bash

# Restore script
set -e

if [ -z "\$1" ]; then
    echo "Usage: \$0 <backup_directory>"
    exit 1
fi

BACKUP_DIR="\$1"

echo "Starting restore process from \$BACKUP_DIR..."

# Restore database
echo "Restoring database..."
npm run db:restore -- "\$BACKUP_DIR/database.sql"

# Restore configuration files
echo "Restoring configuration files..."
cp -r "\$BACKUP_DIR/config/" ./

# Restore logs
echo "Restoring logs..."
cp -r "\$BACKUP_DIR/logs/" ./ 2>/dev/null || true

echo "Restore completed!"
`;
    }

    async updatePackageScripts(projectPath, allScripts) {
        this.logger.info('Updating package.json scripts...');
        
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

    async validateScripts(projectPath, allScripts) {
        this.logger.info('Validating scripts...');
        
        const results = {
            valid: true,
            issues: [],
            metrics: {}
        };

        try {
            const generatedScripts = Object.values(allScripts).filter(scripts => scripts && scripts.generated);
            const totalScripts = generatedScripts.reduce((sum, scripts) => sum + scripts.generated.length, 0);
            const totalErrors = Object.values(allScripts).reduce((sum, scripts) => 
                sum + (scripts?.errors?.length || 0), 0
            );
            
            results.metrics = {
                totalScripts,
                totalErrors,
                scriptTypes: Object.keys(allScripts).filter(key => allScripts[key]?.generated?.length > 0)
            };

            if (totalErrors > 0) {
                results.valid = false;
                results.issues.push({
                    type: 'generation_errors',
                    message: `${totalErrors} script generation errors occurred`
                });
            }
            
        } catch (error) {
            results.valid = false;
            results.issues.push({
                type: 'validation_error',
                message: error.message
            });
        }

        return results;
    }

    async generateOutput(data) {
        const { command, projectStructure, buildScriptsResults, deploymentScriptsResults, databaseScriptsResults, utilityScriptsResults, testScriptsResults, monitoringScriptsResults, backupScriptsResults, packageScriptsResults, validationResults, outputConfig } = data;

        const output = {
            commandId: command.commandId,
            timestamp: new Date(),
            summary: {
                scriptTypes: command.getGenerateOptions().scriptTypes,
                buildScriptsGenerated: buildScriptsResults?.generated?.length || 0,
                deploymentScriptsGenerated: deploymentScriptsResults?.generated?.length || 0,
                databaseScriptsGenerated: databaseScriptsResults?.generated?.length || 0,
                utilityScriptsGenerated: utilityScriptsResults?.generated?.length || 0,
                testScriptsGenerated: testScriptsResults?.generated?.length || 0,
                monitoringScriptsGenerated: monitoringScriptsResults?.generated?.length || 0,
                backupScriptsGenerated: backupScriptsResults?.generated?.length || 0,
                packageScriptsUpdated: packageScriptsResults?.updated || false,
                validationPassed: validationResults?.valid || false
            },
            projectStructure: outputConfig.includeRawData ? projectStructure : projectStructure.metrics,
            results: {
                build: buildScriptsResults,
                deployment: deploymentScriptsResults,
                database: databaseScriptsResults,
                utility: utilityScriptsResults,
                test: testScriptsResults,
                monitoring: monitoringScriptsResults,
                backup: backupScriptsResults,
                package: packageScriptsResults,
                validation: validationResults
            }
        };

        if (outputConfig.includeMetrics) {
            output.metrics = {
                before: projectStructure.metrics,
                after: {
                    ...projectStructure.metrics,
                    scriptsGenerated: true
                }
            };
        }

        return output;
    }

    async saveResults(command, output) {
        try {
            await this.analysisRepository.save({
                id: command.commandId,
                type: 'script_generation',
                projectPath: command.projectPath,
                data: output,
                timestamp: new Date(),
                metadata: command.getMetadata()
            });

            await this.eventBus.publish('script.generation.completed', {
                commandId: command.commandId,
                projectPath: command.projectPath,
                results: output,
                timestamp: new Date()
            });
        } catch (error) {
            this.logger.error('Failed to save script generation results:', error);
        }
    }
}

module.exports = GenerateScriptsHandler; 