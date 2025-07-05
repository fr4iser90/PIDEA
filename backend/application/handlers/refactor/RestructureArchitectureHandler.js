/**
 * RestructureArchitectureHandler - Handles architecture restructuring refactoring
 * Implements the Handler pattern for architecture restructuring
 */
const fs = require('fs').promises;
const path = require('path');
const EventBus = require('../../../infrastructure/messaging/EventBus');
const AnalysisRepository = require('../../../domain/repositories/AnalysisRepository');

class RestructureArchitectureHandler {
    constructor(dependencies = {}) {
        this.eventBus = dependencies.eventBus || new EventBus();
        this.analysisRepository = dependencies.analysisRepository || new AnalysisRepository();
        this.logger = dependencies.logger || console;
    }

    async handle(command) {
        this.logger.info(`Starting architecture restructuring for project: ${command.projectPath}`);

        try {
            const validation = command.validateBusinessRules();
            if (!validation.isValid) {
                throw new Error(`Business rule validation failed: ${validation.errors.join(', ')}`);
            }

            const options = command.getRefactorOptions();
            const outputConfig = command.getOutputConfiguration();

            // Step 1: Analyze current architecture
            const currentArchitecture = await this.analyzeCurrentArchitecture(command.projectPath);
            
            // Step 2: Generate target architecture plan
            const targetArchitecture = await this.generateTargetArchitecture(currentArchitecture, options);
            
            // Step 3: Create backup (if enabled)
            let backupResults = null;
            if (options.backupOriginal) {
                backupResults = await this.createBackup(command.projectPath, currentArchitecture);
            }
            
            // Step 4: Create new structure (if enabled)
            let structureResults = null;
            if (options.createNewStructure) {
                structureResults = await this.createNewStructure(command.projectPath, targetArchitecture);
            }
            
            // Step 5: Migrate existing code (if enabled)
            let migrationResults = null;
            if (options.migrateExisting) {
                migrationResults = await this.migrateExistingCode(command.projectPath, currentArchitecture, targetArchitecture);
            }
            
            // Step 6: Update imports (if enabled)
            let importResults = null;
            if (options.updateImports) {
                importResults = await this.updateImports(command.projectPath, targetArchitecture);
            }
            
            // Step 7: Create documentation (if enabled)
            let documentationResults = null;
            if (options.createDocumentation) {
                documentationResults = await this.createArchitectureDocumentation(command.projectPath, targetArchitecture);
            }
            
            // Step 8: Validate architecture (if enabled)
            let validationResults = null;
            if (options.validateArchitecture) {
                validationResults = await this.validateArchitecture(command.projectPath, targetArchitecture);
            }

            // Step 9: Generate output
            const output = await this.generateOutput({
                command,
                currentArchitecture,
                targetArchitecture,
                backupResults,
                structureResults,
                migrationResults,
                importResults,
                documentationResults,
                validationResults,
                outputConfig
            });

            // Step 10: Save results
            await this.saveResults(command, output);

            this.logger.info(`Architecture restructuring completed successfully for project: ${command.projectPath}`);
            
            return {
                success: true,
                commandId: command.commandId,
                output,
                metadata: command.getMetadata()
            };

        } catch (error) {
            this.logger.error(`Architecture restructuring failed for project ${command.projectPath}:`, error);
            
            await this.eventBus.publish('architecture.restructuring.failed', {
                commandId: command.commandId,
                projectPath: command.projectPath,
                error: error.message,
                timestamp: new Date()
            });

            throw error;
        }
    }

    async analyzeCurrentArchitecture(projectPath) {
        this.logger.info('Analyzing current architecture...');
        
        const architecture = {
            pattern: 'unknown',
            layers: [],
            modules: [],
            dependencies: [],
            metrics: {}
        };

        try {
            // Analyze directory structure
            const structure = await this.analyzeDirectoryStructure(projectPath);
            architecture.layers = this.identifyLayers(structure);
            architecture.modules = this.identifyModules(structure);
            architecture.dependencies = await this.analyzeDependencies(projectPath);
            
            // Detect architecture pattern
            architecture.pattern = this.detectArchitecturePattern(architecture);
            
            // Calculate metrics
            architecture.metrics = this.calculateArchitectureMetrics(architecture);
            
            return architecture;
        } catch (error) {
            throw new Error(`Failed to analyze current architecture: ${error.message}`);
        }
    }

    async analyzeDirectoryStructure(projectPath) {
        const structure = {
            directories: [],
            files: [],
            depth: 0
        };

        const scanDir = async (dir, currentDepth = 0) => {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const relativePath = path.relative(projectPath, fullPath);
                
                if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
                    structure.directories.push({
                        path: relativePath,
                        name: entry.name,
                        depth: currentDepth,
                        type: this.classifyDirectory(entry.name)
                    });
                    
                    await scanDir(fullPath, currentDepth + 1);
                    structure.depth = Math.max(structure.depth, currentDepth + 1);
                } else if (entry.isFile() && this.isCodeFile(entry.name)) {
                    structure.files.push({
                        path: relativePath,
                        name: entry.name,
                        type: this.classifyFile(entry.name)
                    });
                }
            }
        };

        await scanDir(projectPath);
        return structure;
    }

    shouldSkipDirectory(dirName) {
        const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt'];
        return skipDirs.includes(dirName);
    }

    classifyDirectory(dirName) {
        const patterns = {
            presentation: ['components', 'pages', 'views', 'controllers', 'ui'],
            application: ['services', 'useCases', 'handlers', 'commands'],
            domain: ['entities', 'models', 'domain', 'business'],
            infrastructure: ['repositories', 'database', 'external', 'config']
        };

        for (const [type, keywords] of Object.entries(patterns)) {
            if (keywords.some(keyword => dirName.toLowerCase().includes(keyword))) {
                return type;
            }
        }
        
        return 'unknown';
    }

    isCodeFile(fileName) {
        const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'];
        return codeExtensions.some(ext => fileName.endsWith(ext));
    }

    classifyFile(fileName) {
        const patterns = {
            component: /\.(jsx?|tsx?|vue|svelte)$/,
            service: /service|api|client/i,
            model: /model|entity|schema/i,
            utility: /util|helper|constant/i,
            test: /\.test\.|\.spec\./
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            if (pattern.test(fileName)) {
                return type;
            }
        }
        
        return 'unknown';
    }

    identifyLayers(structure) {
        const layers = {
            presentation: [],
            application: [],
            domain: [],
            infrastructure: []
        };

        structure.directories.forEach(dir => {
            if (layers[dir.type]) {
                layers[dir.type].push(dir);
            }
        });

        return layers;
    }

    identifyModules(structure) {
        const modules = [];
        const modulePatterns = {
            auth: /auth|login|user/i,
            product: /product|item|goods/i,
            order: /order|cart|checkout/i,
            payment: /payment|billing|invoice/i
        };

        structure.directories.forEach(dir => {
            for (const [moduleName, pattern] of Object.entries(modulePatterns)) {
                if (pattern.test(dir.name)) {
                    modules.push({
                        name: moduleName,
                        path: dir.path,
                        type: dir.type
                    });
                    break;
                }
            }
        });

        return modules;
    }

    async analyzeDependencies(projectPath) {
        const dependencies = [];
        const packageJsonPath = path.join(projectPath, 'package.json');
        
        try {
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
            
            // Analyze internal dependencies
            const codeFiles = await this.getAllCodeFiles(projectPath);
            
            for (const filePath of codeFiles) {
                const content = await fs.readFile(filePath, 'utf-8');
                const imports = this.extractImports(content);
                
                imports.forEach(importInfo => {
                    if (importInfo.module.startsWith('.')) {
                        dependencies.push({
                            from: filePath,
                            to: importInfo.module,
                            type: 'internal'
                        });
                    }
                });
            }
            
        } catch (error) {
            this.logger.warn('Could not analyze dependencies:', error.message);
        }

        return dependencies;
    }

    async getAllCodeFiles(projectPath) {
        const files = [];
        
        const scanDir = async (dir) => {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
                    await scanDir(fullPath);
                } else if (entry.isFile() && this.isCodeFile(entry.name)) {
                    files.push(fullPath);
                }
            }
        };

        await scanDir(projectPath);
        return files;
    }

    extractImports(content) {
        const imports = [];
        const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g;
        
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            imports.push({
                module: match[1],
                line: content.substring(0, match.index).split('\n').length
            });
        }
        
        return imports;
    }

    detectArchitecturePattern(architecture) {
        const { layers, modules, dependencies } = architecture;
        
        // Check for Clean Architecture
        if (layers.domain.length > 0 && layers.application.length > 0 && layers.infrastructure.length > 0) {
            return 'clean';
        }
        
        // Check for DDD
        if (modules.length > 0 && layers.domain.length > 0) {
            return 'ddd';
        }
        
        // Check for MVC
        if (layers.presentation.length > 0 && this.hasModelLayer(architecture)) {
            return 'mvc';
        }
        
        // Check for Monolithic
        if (dependencies.length > 50) {
            return 'monolithic';
        }
        
        return 'unknown';
    }

    hasModelLayer(architecture) {
        return architecture.layers.domain.length > 0 || 
               architecture.layers.infrastructure.some(dir => dir.name.toLowerCase().includes('model'));
    }

    calculateArchitectureMetrics(architecture) {
        return {
            totalLayers: Object.keys(architecture.layers).filter(key => architecture.layers[key].length > 0).length,
            totalModules: architecture.modules.length,
            totalDependencies: architecture.dependencies.length,
            layerDistribution: Object.fromEntries(
                Object.entries(architecture.layers).map(([key, value]) => [key, value.length])
            ),
            complexity: this.calculateComplexity(architecture)
        };
    }

    calculateComplexity(architecture) {
        let complexity = 0;
        
        // Add complexity based on number of layers
        complexity += Object.keys(architecture.layers).filter(key => architecture.layers[key].length > 0).length * 10;
        
        // Add complexity based on number of modules
        complexity += architecture.modules.length * 5;
        
        // Add complexity based on dependencies
        complexity += Math.min(architecture.dependencies.length * 0.5, 50);
        
        return Math.round(complexity);
    }

    async generateTargetArchitecture(currentArchitecture, options) {
        this.logger.info('Generating target architecture...');
        
        const targetArchitecture = {
            pattern: options.architecturePattern,
            layers: this.generateTargetLayers(currentArchitecture, options),
            modules: this.generateTargetModules(currentArchitecture, options),
            structure: this.generateTargetStructure(options),
            migrationPlan: this.generateMigrationPlan(currentArchitecture, options)
        };

        return targetArchitecture;
    }

    generateTargetLayers(currentArchitecture, options) {
        const targetLayers = {
            presentation: [],
            application: [],
            domain: [],
            infrastructure: []
        };

        switch (options.architecturePattern) {
            case 'clean':
                targetLayers.presentation = ['components', 'pages', 'controllers'];
                targetLayers.application = ['services', 'useCases', 'handlers'];
                targetLayers.domain = ['entities', 'valueObjects', 'repositories'];
                targetLayers.infrastructure = ['database', 'external', 'config'];
                break;
            case 'ddd':
                targetLayers.presentation = ['api', 'controllers', 'dto'];
                targetLayers.application = ['services', 'commands', 'queries'];
                targetLayers.domain = ['entities', 'aggregates', 'services'];
                targetLayers.infrastructure = ['repositories', 'persistence', 'messaging'];
                break;
            case 'mvc':
                targetLayers.presentation = ['views', 'controllers'];
                targetLayers.application = ['services'];
                targetLayers.domain = ['models'];
                targetLayers.infrastructure = ['database', 'config'];
                break;
        }

        return targetLayers;
    }

    generateTargetModules(currentArchitecture, options) {
        const targetModules = [];
        
        // Extract modules from current architecture
        const existingModules = currentArchitecture.modules.map(m => m.name);
        
        // Add standard modules based on pattern
        const standardModules = {
            clean: ['auth', 'user', 'product', 'order'],
            ddd: ['identity', 'catalog', 'ordering', 'payment'],
            mvc: ['auth', 'user', 'product', 'order']
        };

        const modules = standardModules[options.architecturePattern] || [];
        
        modules.forEach(moduleName => {
            targetModules.push({
                name: moduleName,
                layers: this.generateTargetLayers(currentArchitecture, options),
                path: `src/${moduleName}`
            });
        });

        return targetModules;
    }

    generateTargetStructure(options) {
        const structure = {
            directories: [],
            files: []
        };

        switch (options.architecturePattern) {
            case 'clean':
                structure.directories = [
                    'src/presentation',
                    'src/application',
                    'src/domain',
                    'src/infrastructure',
                    'src/shared'
                ];
                break;
            case 'ddd':
                structure.directories = [
                    'src/api',
                    'src/application',
                    'src/domain',
                    'src/infrastructure',
                    'src/shared'
                ];
                break;
            case 'mvc':
                structure.directories = [
                    'src/views',
                    'src/controllers',
                    'src/models',
                    'src/services',
                    'src/config'
                ];
                break;
        }

        return structure;
    }

    generateMigrationPlan(currentArchitecture, options) {
        const plan = {
            steps: [],
            estimatedTime: 0,
            risks: []
        };

        // Step 1: Create new structure
        plan.steps.push({
            step: 1,
            action: 'create_new_structure',
            description: `Create new ${options.architecturePattern} architecture structure`,
            estimatedTime: 5
        });

        // Step 2: Migrate existing code
        if (options.migrateExisting) {
            plan.steps.push({
                step: 2,
                action: 'migrate_existing_code',
                description: 'Migrate existing code to new structure',
                estimatedTime: currentArchitecture.metrics.complexity * 0.5
            });
        }

        // Step 3: Update imports
        if (options.updateImports) {
            plan.steps.push({
                step: 3,
                action: 'update_imports',
                description: 'Update all import statements',
                estimatedTime: currentArchitecture.dependencies.length * 0.1
            });
        }

        // Step 4: Validate architecture
        if (options.validateArchitecture) {
            plan.steps.push({
                step: 4,
                action: 'validate_architecture',
                description: 'Validate new architecture',
                estimatedTime: 3
            });
        }

        plan.estimatedTime = plan.steps.reduce((total, step) => total + step.estimatedTime, 0);

        // Identify risks
        if (currentArchitecture.metrics.complexity > 50) {
            plan.risks.push('High complexity - consider gradual migration');
        }

        if (currentArchitecture.dependencies.length > 100) {
            plan.risks.push('Many dependencies - import updates may be complex');
        }

        return plan;
    }

    async createBackup(projectPath, currentArchitecture) {
        this.logger.info('Creating backup...');
        
        const backupResults = {
            created: false,
            path: null,
            size: 0
        };

        try {
            const backupPath = `${projectPath}_backup_${Date.now()}`;
            await this.copyDirectory(projectPath, backupPath);
            
            backupResults.created = true;
            backupResults.path = backupPath;
            backupResults.size = await this.calculateDirectorySize(backupPath);
            
        } catch (error) {
            throw new Error(`Failed to create backup: ${error.message}`);
        }

        return backupResults;
    }

    async copyDirectory(src, dest) {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });
        
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            
            if (entry.isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            } else {
                await fs.copyFile(srcPath, destPath);
            }
        }
    }

    async calculateDirectorySize(dirPath) {
        let size = 0;
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            
            if (entry.isDirectory()) {
                size += await this.calculateDirectorySize(fullPath);
            } else {
                const stats = await fs.stat(fullPath);
                size += stats.size;
            }
        }
        
        return size;
    }

    async createNewStructure(projectPath, targetArchitecture) {
        this.logger.info('Creating new architecture structure...');
        
        const results = {
            created: [],
            errors: []
        };

        try {
            for (const dir of targetArchitecture.structure.directories) {
                const fullPath = path.join(projectPath, dir);
                await fs.mkdir(fullPath, { recursive: true });
                results.created.push(dir);
            }
        } catch (error) {
            results.errors.push({
                action: 'create_structure',
                error: error.message
            });
        }

        return results;
    }

    async migrateExistingCode(projectPath, currentArchitecture, targetArchitecture) {
        this.logger.info('Migrating existing code...');
        
        const results = {
            migrated: [],
            errors: []
        };

        // This is a simplified implementation
        // In a real scenario, you would implement sophisticated code migration logic
        
        return results;
    }

    async updateImports(projectPath, targetArchitecture) {
        this.logger.info('Updating imports...');
        
        const results = {
            updated: [],
            errors: []
        };

        // This is a simplified implementation
        // In a real scenario, you would update all import statements
        
        return results;
    }

    async createArchitectureDocumentation(projectPath, targetArchitecture) {
        this.logger.info('Creating architecture documentation...');
        
        const results = {
            created: [],
            errors: []
        };

        try {
            const docPath = path.join(projectPath, 'docs', 'architecture.md');
            await fs.mkdir(path.dirname(docPath), { recursive: true });
            
            const documentation = this.generateArchitectureDocumentation(targetArchitecture);
            await fs.writeFile(docPath, documentation);
            
            results.created.push(docPath);
        } catch (error) {
            results.errors.push({
                action: 'create_documentation',
                error: error.message
            });
        }

        return results;
    }

    generateArchitectureDocumentation(targetArchitecture) {
        return `# Architecture Documentation

## Pattern: ${targetArchitecture.pattern}

## Layers:
${Object.entries(targetArchitecture.layers).map(([layer, dirs]) => 
    `### ${layer}:\n${dirs.map(dir => `- ${dir}`).join('\n')}`
).join('\n\n')}

## Modules:
${targetArchitecture.modules.map(module => 
    `### ${module.name}:\n- Path: ${module.path}`
).join('\n\n')}

## Structure:
${targetArchitecture.structure.directories.map(dir => `- ${dir}`).join('\n')}

Generated on: ${new Date().toISOString()}
`;
    }

    async validateArchitecture(projectPath, targetArchitecture) {
        this.logger.info('Validating architecture...');
        
        const results = {
            valid: true,
            issues: [],
            metrics: {}
        };

        try {
            // Check if all required directories exist
            for (const dir of targetArchitecture.structure.directories) {
                const fullPath = path.join(projectPath, dir);
                try {
                    await fs.access(fullPath);
                } catch (error) {
                    results.valid = false;
                    results.issues.push({
                        type: 'missing_directory',
                        path: dir,
                        message: 'Required directory does not exist'
                    });
                }
            }

            // Calculate new metrics
            const newArchitecture = await this.analyzeCurrentArchitecture(projectPath);
            results.metrics = newArchitecture.metrics;
            
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
        const { command, currentArchitecture, targetArchitecture, backupResults, structureResults, migrationResults, importResults, documentationResults, validationResults, outputConfig } = data;

        const output = {
            commandId: command.commandId,
            timestamp: new Date(),
            summary: {
                pattern: targetArchitecture.pattern,
                strategy: command.getRefactorOptions().restructureStrategy,
                backupCreated: backupResults?.created || false,
                structureCreated: structureResults?.created?.length || 0,
                filesMigrated: migrationResults?.migrated?.length || 0,
                importsUpdated: importResults?.updated?.length || 0,
                documentationCreated: documentationResults?.created?.length || 0,
                validationPassed: validationResults?.valid || false
            },
            currentArchitecture: outputConfig.includeRawData ? currentArchitecture : currentArchitecture.metrics,
            targetArchitecture: {
                pattern: targetArchitecture.pattern,
                layers: targetArchitecture.layers,
                modules: targetArchitecture.modules,
                structure: targetArchitecture.structure,
                migrationPlan: targetArchitecture.migrationPlan
            },
            results: {
                backup: backupResults,
                structure: structureResults,
                migration: migrationResults,
                imports: importResults,
                documentation: documentationResults,
                validation: validationResults
            }
        };

        if (outputConfig.includeMetrics) {
            output.metrics = {
                before: currentArchitecture.metrics,
                after: validationResults?.metrics || currentArchitecture.metrics
            };
        }

        return output;
    }

    async saveResults(command, output) {
        try {
            await this.analysisRepository.save({
                id: command.commandId,
                type: 'architecture_restructuring',
                projectPath: command.projectPath,
                data: output,
                timestamp: new Date(),
                metadata: command.getMetadata()
            });

            await this.eventBus.publish('architecture.restructuring.completed', {
                commandId: command.commandId,
                projectPath: command.projectPath,
                results: output,
                timestamp: new Date()
            });
        } catch (error) {
            this.logger.error('Failed to save architecture restructuring results:', error);
        }
    }
}

module.exports = RestructureArchitectureHandler; 