/**
 * OrganizeModulesHandler - Handles module organization refactoring
 * Implements the Handler pattern for module organization
 */
const fs = require('fs').promises;
const path = require('path');
const EventBus = require('../../../infrastructure/messaging/EventBus');
const AnalysisRepository = require('../../../domain/repositories/AnalysisRepository');

class OrganizeModulesHandler {
    constructor(dependencies = {}) {
        this.eventBus = dependencies.eventBus || new EventBus();
        this.analysisRepository = dependencies.analysisRepository || new AnalysisRepository();
        this.logger = dependencies.logger || console;
    }

    async handle(command) {
        this.logger.info(`Starting module organization for project: ${command.projectPath}`);

        try {
            const validation = command.validateBusinessRules();
            if (!validation.isValid) {
                throw new Error(`Business rule validation failed: ${validation.errors.join(', ')}`);
            }

            const options = command.getRefactorOptions();
            const outputConfig = command.getOutputConfiguration();

            // Step 1: Analyze current module structure
            const currentStructure = await this.analyzeCurrentStructure(command.projectPath);
            
            // Step 2: Generate organization plan
            const organizationPlan = await this.generateOrganizationPlan(currentStructure, options);
            
            // Step 3: Execute organization (if moveFiles is enabled)
            let executionResults = null;
            if (options.moveFiles) {
                executionResults = await this.executeOrganization(command.projectPath, organizationPlan, options);
            }
            
            // Step 4: Create index files (if enabled)
            let indexResults = null;
            if (options.createIndexFiles) {
                indexResults = await this.createIndexFiles(command.projectPath, organizationPlan);
            }
            
            // Step 5: Update imports (if enabled)
            let importResults = null;
            if (options.updateImports) {
                importResults = await this.updateImports(command.projectPath, organizationPlan);
            }
            
            // Step 6: Validate organization
            let validationResults = null;
            if (options.validateOrganization) {
                validationResults = await this.validateOrganization(command.projectPath, organizationPlan);
            }

            // Step 7: Generate output
            const output = await this.generateOutput({
                command,
                currentStructure,
                organizationPlan,
                executionResults,
                indexResults,
                importResults,
                validationResults,
                outputConfig
            });

            // Step 8: Save results
            await this.saveResults(command, output);

            this.logger.info(`Module organization completed successfully for project: ${command.projectPath}`);
            
            return {
                success: true,
                commandId: command.commandId,
                output,
                metadata: command.getMetadata()
            };

        } catch (error) {
            this.logger.error(`Module organization failed for project ${command.projectPath}:`, error);
            
            await this.eventBus.publish('module.organization.failed', {
                commandId: command.commandId,
                projectPath: command.projectPath,
                error: error.message,
                timestamp: new Date()
            });

            throw error;
        }
    }

    async analyzeCurrentStructure(projectPath) {
        this.logger.info('Analyzing current module structure...');
        
        const structure = {
            files: [],
            directories: [],
            imports: [],
            dependencies: [],
            metrics: {}
        };

        try {
            await this.scanDirectory(projectPath, structure);
            structure.metrics = this.calculateMetrics(structure);
            
            return structure;
        } catch (error) {
            throw new Error(`Failed to analyze current structure: ${error.message}`);
        }
    }

    async scanDirectory(dirPath, structure, relativePath = '') {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const relativeEntryPath = path.join(relativePath, entry.name);
            
            if (entry.isDirectory === true) {
                if (!this.shouldSkipDirectory(entry.name)) {
                    structure.directories.push({
                        path: relativeEntryPath,
                        fullPath,
                        type: this.classifyDirectory(entry.name)
                    });
                    
                    await this.scanDirectory(fullPath, structure, relativeEntryPath);
                }
            } else if (entry.isFile === true) {
                if (this.isCodeFile(entry.name)) {
                    const fileInfo = await this.analyzeFile(fullPath, relativeEntryPath);
                    structure.files.push(fileInfo);
                    
                    if (fileInfo.imports) {
                        structure.imports.push(...fileInfo.imports);
                    }
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
            feature: ['components', 'pages', 'views', 'screens'],
            layer: ['controllers', 'services', 'models', 'repositories'],
            type: ['utils', 'helpers', 'constants', 'types'],
            domain: ['auth', 'user', 'product', 'order']
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

    async analyzeFile(filePath, relativePath) {
        const content = await fs.readFile(filePath, 'utf-8');
        const imports = this.extractImports(content);
        
        return {
            path: relativePath,
            fullPath: filePath,
            size: content.length,
            lines: content.split('\n').length,
            imports,
            type: this.classifyFile(relativePath)
        };
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

    calculateMetrics(structure) {
        return {
            totalFiles: structure.files.length,
            totalDirectories: structure.directories.length,
            totalImports: structure.imports.length,
            averageFileSize: structure.files.length > 0 
                ? structure.files.reduce((sum, file) => sum + file.size, 0) / structure.files.length 
                : 0,
            fileTypes: this.countFileTypes(structure.files),
            directoryTypes: this.countDirectoryTypes(structure.directories)
        };
    }

    countFileTypes(files) {
        const types = {};
        files.forEach(file => {
            types[file.type] = (types[file.type] || 0) + 1;
        });
        return types;
    }

    countDirectoryTypes(directories) {
        const types = {};
        directories.forEach(dir => {
            types[dir.type] = (types[dir.type] || 0) + 1;
        });
        return types;
    }

    async generateOrganizationPlan(currentStructure, options) {
        this.logger.info('Generating organization plan...');
        
        const strategy = options.organizationStrategy;
        const plan = {
            strategy,
            moves: [],
            newStructure: {},
            recommendations: []
        };

        switch (strategy) {
            case 'feature':
                plan.moves = this.generateFeatureBasedMoves(currentStructure);
                break;
            case 'layer':
                plan.moves = this.generateLayerBasedMoves(currentStructure);
                break;
            case 'type':
                plan.moves = this.generateTypeBasedMoves(currentStructure);
                break;
            case 'domain':
                plan.moves = this.generateDomainBasedMoves(currentStructure);
                break;
            default:
                throw new Error(`Unknown organization strategy: ${strategy}`);
        }

        plan.recommendations = this.generateRecommendations(currentStructure, plan);
        
        return plan;
    }

    generateFeatureBasedMoves(structure) {
        const moves = [];
        const features = new Set();

        // Extract features from file paths
        structure.files.forEach(file => {
            const feature = this.extractFeatureFromPath(file.path);
            if (feature) {
                features.add(feature);
            }
        });

        // Generate moves for each feature
        features.forEach(feature => {
            const featureFiles = structure.files.filter(file => 
                this.extractFeatureFromPath(file.path) === feature
            );

            moves.push({
                type: 'create_directory',
                path: `src/features/${feature}`,
                reason: `Group files for feature: ${feature}`
            });

            featureFiles.forEach(file => {
                moves.push({
                    type: 'move_file',
                    from: file.path,
                    to: `src/features/${feature}/${path.basename(file.path)}`,
                    reason: `Organize by feature: ${feature}`
                });
            });
        });

        return moves;
    }

    extractFeatureFromPath(filePath) {
        const parts = filePath.split(path.sep);
        const featureIndex = parts.findIndex(part => 
            ['components', 'pages', 'views', 'screens'].includes(part)
        );
        
        if (featureIndex >= 0 && featureIndex + 1 < parts.length) {
            return parts[featureIndex + 1];
        }
        
        return null;
    }

    generateLayerBasedMoves(structure) {
        const moves = [];
        const layers = ['controllers', 'services', 'models', 'repositories', 'utils'];

        layers.forEach(layer => {
            const layerFiles = structure.files.filter(file => 
                file.type === layer || file.path.includes(layer)
            );

            if (layerFiles.length > 0) {
                moves.push({
                    type: 'create_directory',
                    path: `src/${layer}`,
                    reason: `Group files by layer: ${layer}`
                });

                layerFiles.forEach(file => {
                    moves.push({
                        type: 'move_file',
                        from: file.path,
                        to: `src/${layer}/${path.basename(file.path)}`,
                        reason: `Organize by layer: ${layer}`
                    });
                });
            }
        });

        return moves;
    }

    generateTypeBasedMoves(structure) {
        const moves = [];
        const typeGroups = {
            components: ['component'],
            services: ['service', 'api'],
            models: ['model', 'entity'],
            utils: ['util', 'helper', 'constant']
        };

        Object.entries(typeGroups).forEach(([group, types]) => {
            const groupFiles = structure.files.filter(file => 
                types.some(type => file.type === type || file.path.includes(type))
            );

            if (groupFiles.length > 0) {
                moves.push({
                    type: 'create_directory',
                    path: `src/${group}`,
                    reason: `Group files by type: ${group}`
                });

                groupFiles.forEach(file => {
                    moves.push({
                        type: 'move_file',
                        from: file.path,
                        to: `src/${group}/${path.basename(file.path)}`,
                        reason: `Organize by type: ${group}`
                    });
                });
            }
        });

        return moves;
    }

    generateDomainBasedMoves(structure) {
        const moves = [];
        const domains = new Set();

        // Extract domains from file paths
        structure.files.forEach(file => {
            const domain = this.extractDomainFromPath(file.path);
            if (domain) {
                domains.add(domain);
            }
        });

        // Generate moves for each domain
        domains.forEach(domain => {
            const domainFiles = structure.files.filter(file => 
                this.extractDomainFromPath(file.path) === domain
            );

            moves.push({
                type: 'create_directory',
                path: `src/domains/${domain}`,
                reason: `Group files for domain: ${domain}`
            });

            domainFiles.forEach(file => {
                moves.push({
                    type: 'move_file',
                    from: file.path,
                    to: `src/domains/${domain}/${path.basename(file.path)}`,
                    reason: `Organize by domain: ${domain}`
                });
            });
        });

        return moves;
    }

    extractDomainFromPath(filePath) {
        const parts = filePath.split(path.sep);
        const domainKeywords = ['auth', 'user', 'product', 'order', 'payment', 'notification'];
        
        for (const part of parts) {
            if (domainKeywords.includes(part.toLowerCase())) {
                return part;
            }
        }
        
        return null;
    }

    generateRecommendations(structure, plan) {
        const recommendations = [];

        if (structure.metrics.totalFiles > 100) {
            recommendations.push({
                type: 'performance',
                message: 'Large number of files detected. Consider breaking into smaller modules.',
                priority: 'high'
            });
        }

        if (structure.metrics.averageFileSize > 1000) {
            recommendations.push({
                type: 'maintainability',
                message: 'Large average file size detected. Consider splitting large files.',
                priority: 'medium'
            });
        }

        if (plan.moves.length > 50) {
            recommendations.push({
                type: 'safety',
                message: 'Many file moves planned. Consider backing up before execution.',
                priority: 'high'
            });
        }

        return recommendations;
    }

    async executeOrganization(projectPath, plan, options) {
        if (!options.moveFiles) {
            return { skipped: true, reason: 'File moves disabled' };
        }

        this.logger.info('Executing organization plan...');
        
        const results = {
            created: [],
            moved: [],
            errors: [],
            skipped: []
        };

        for (const move of plan.moves) {
            try {
                if (move.type === 'create_directory') {
                    await this.createDirectory(path.join(projectPath, move.path));
                    results.created.push(move.path);
                } else if (move.type === 'move_file') {
                    await this.moveFile(
                        path.join(projectPath, move.from),
                        path.join(projectPath, move.to)
                    );
                    results.moved.push({ from: move.from, to: move.to });
                }
            } catch (error) {
                results.errors.push({
                    move,
                    error: error.message
                });
            }
        }

        return results;
    }

    async createDirectory(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    async moveFile(fromPath, toPath) {
        try {
            await fs.mkdir(path.dirname(toPath), { recursive: true });
            await fs.rename(fromPath, toPath);
        } catch (error) {
            throw new Error(`Failed to move file from ${fromPath} to ${toPath}: ${error.message}`);
        }
    }

    async createIndexFiles(projectPath, plan) {
        this.logger.info('Creating index files...');
        
        const results = {
            created: [],
            errors: []
        };

        // Group files by their new locations
        const fileGroups = {};
        plan.moves.forEach(move => {
            if (move.type === 'move_file') {
                const dir = path.dirname(move.to);
                if (!fileGroups[dir]) {
                    fileGroups[dir] = [];
                }
                fileGroups[dir].push(path.basename(move.to, path.extname(move.to)));
            }
        });

        // Create index files for each directory
        for (const [dir, files] of Object.entries(fileGroups)) {
            try {
                const indexPath = path.join(projectPath, dir, 'index.js');
                const indexContent = this.generateIndexContent(files);
                await fs.writeFile(indexPath, indexContent);
                results.created.push(indexPath);
            } catch (error) {
                results.errors.push({
                    directory: dir,
                    error: error.message
                });
            }
        }

        return results;
    }

    generateIndexContent(files) {
        const exports = files.map(file => {
            const exportName = this.toPascalCase(file);
            return `export { default as ${exportName} } from './${file}';`;
        });

        return exports.join('\n') + '\n';
    }

    toPascalCase(str) {
        return str
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('');
    }

    async updateImports(projectPath, plan) {
        this.logger.info('Updating imports...');
        
        const results = {
            updated: [],
            errors: []
        };

        // Create a mapping of old paths to new paths
        const pathMapping = {};
        plan.moves.forEach(move => {
            if (move.type === 'move_file') {
                pathMapping[move.from] = move.to;
            }
        });

        // Update imports in all files
        const allFiles = await this.getAllCodeFiles(projectPath);
        
        for (const filePath of allFiles) {
            try {
                await this.updateImportsInFile(filePath, pathMapping);
                results.updated.push(filePath);
            } catch (error) {
                results.errors.push({
                    file: filePath,
                    error: error.message
                });
            }
        }

        return results;
    }

    async getAllCodeFiles(projectPath) {
        const files = [];
        
        const scanDir = async (dir) => {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory === true && !this.shouldSkipDirectory(entry.name)) {
                    await scanDir(fullPath);
                } else if (entry.isFile === true && this.isCodeFile(entry.name)) {
                    files.push(fullPath);
                }
            }
        };

        await scanDir(projectPath);
        return files;
    }

    async updateImportsInFile(filePath, pathMapping) {
        const content = await fs.readFile(filePath, 'utf-8');
        let updatedContent = content;

        // Update import statements
        for (const [oldPath, newPath] of Object.entries(pathMapping)) {
            const oldModule = this.pathToModule(oldPath);
            const newModule = this.pathToModule(newPath);
            
            const importRegex = new RegExp(`from\\s+['"\`]${this.escapeRegex(oldModule)}['"\`]`, 'g');
            updatedContent = updatedContent.replace(importRegex, `from '${newModule}'`);
        }

        if (updatedContent !== content) {
            await fs.writeFile(filePath, updatedContent);
        }
    }

    pathToModule(filePath) {
        // Convert file path to module import path
        return filePath.replace(/\\/g, '/').replace(/\.(js|jsx|ts|tsx)$/, '');
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    async validateOrganization(projectPath, plan) {
        this.logger.info('Validating organization...');
        
        const results = {
            valid: true,
            issues: [],
            metrics: {}
        };

        // Check if all planned moves were successful
        for (const move of plan.moves) {
            if (move.type === 'move_file') {
                const newPath = path.join(projectPath, move.to);
                try {
                    await fs.access(newPath);
                } catch (error) {
                    results.valid = false;
                    results.issues.push({
                        type: 'missing_file',
                        path: move.to,
                        message: 'Planned file move was not completed'
                    });
                }
            }
        }

        // Calculate new metrics
        const newStructure = await this.analyzeCurrentStructure(projectPath);
        results.metrics = newStructure.metrics;

        return results;
    }

    async generateOutput(data) {
        const { command, currentStructure, organizationPlan, executionResults, indexResults, importResults, validationResults, outputConfig } = data;

        const output = {
            commandId: command.commandId,
            timestamp: new Date(),
            summary: {
                strategy: organizationPlan.strategy,
                totalMoves: organizationPlan.moves.length,
                filesMoved: executionResults?.moved?.length || 0,
                indexFilesCreated: indexResults?.created?.length || 0,
                importsUpdated: importResults?.updated?.length || 0,
                validationPassed: validationResults?.valid || false
            },
            currentStructure: outputConfig.includeRawData ? currentStructure : currentStructure.metrics,
            organizationPlan: {
                strategy: organizationPlan.strategy,
                moves: organizationPlan.moves,
                recommendations: organizationPlan.recommendations
            },
            results: {
                execution: executionResults,
                indexFiles: indexResults,
                imports: importResults,
                validation: validationResults
            },
            recommendations: organizationPlan.recommendations
        };

        if (outputConfig.includeMetrics) {
            output.metrics = {
                before: currentStructure.metrics,
                after: validationResults?.metrics || currentStructure.metrics
            };
        }

        return output;
    }

    async saveResults(command, output) {
        try {
            await this.analysisRepository.save({
                id: command.commandId,
                type: 'module_organization',
                projectPath: command.projectPath,
                data: output,
                timestamp: new Date(),
                metadata: command.getMetadata()
            });

            await this.eventBus.publish('module.organization.completed', {
                commandId: command.commandId,
                projectPath: command.projectPath,
                results: output,
                timestamp: new Date()
            });
        } catch (error) {
            this.logger.error('Failed to save organization results:', error);
        }
    }
}

module.exports = OrganizeModulesHandler; 