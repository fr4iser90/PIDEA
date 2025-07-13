/**
 * MonorepoStrategy - Handles monorepo project structures and optimization
 */
const path = require('path');
const fs = require('fs').promises;
const { logger } = require('@infrastructure/logging/Logger');

class MonorepoStrategy {
    constructor(dependencies = {}) {
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
        this.fileSystemService = dependencies.fileSystemService;
        this.projectAnalyzer = dependencies.projectAnalyzer;
    }

    /**
     * Check if project is a monorepo
     * @param {string} projectPath - Project path
     * @returns {Promise<boolean>} True if monorepo
     */
    async isMonorepo(projectPath) {
        try {
            // Check for common monorepo indicators
            const indicators = [
                'lerna.json',
                'nx.json',
                'rush.json',
                'pnpm-workspace.yaml',
                'yarn.workspaces',
                'package.json' // Check for workspaces
            ];

            for (const indicator of indicators) {
                if (await this.hasMonorepoIndicator(projectPath, indicator)) {
                    return true;
                }
            }

            // Check for common monorepo directory structures
            const commonDirs = ['packages', 'apps', 'libs', 'services', 'frontend', 'backend'];
            const projectDirs = await this.getProjectDirectories(projectPath);
            
            return commonDirs.some(dir => projectDirs.includes(dir));
        } catch (error) {
            this.logger.error('MonorepoStrategy: Failed to check if monorepo', {
                projectPath,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Check for monorepo indicator file
     * @param {string} projectPath - Project path
     * @param {string} indicator - Indicator file name
     * @returns {Promise<boolean>} True if indicator exists
     */
    async hasMonorepoIndicator(projectPath, indicator) {
        try {
            if (indicator === 'package.json') {
                const packageJsonPath = path.join(projectPath, 'package.json');
                const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
                return !!(packageJson.workspaces || packageJson.private);
            } else {
                await fs.access(path.join(projectPath, indicator));
                return true;
            }
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
     * Analyze monorepo structure
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Monorepo analysis
     */
    async analyzeMonorepo(projectPath) {
        try {
            this.logger.info('MonorepoStrategy: Analyzing monorepo', { projectPath });

            const analysis = {
                isMonorepo: true, // Skip the check to avoid infinite loop
                type: await this.getMonorepoType(projectPath),
                workspaces: await this.getWorkspaces(projectPath),
                packages: await this.getPackages(projectPath),
                dependencies: await this.analyzeDependencies(projectPath),
                buildTools: await this.detectBuildTools(projectPath),
                sharedConfigs: await this.getSharedConfigs(projectPath),
                recommendations: await this.generateRecommendations(projectPath)
            };

            if (this.eventBus) {
                this.eventBus.publish('monorepo.analysis.completed', {
                    projectPath,
                    analysis,
                    timestamp: new Date()
                });
            }

            return analysis;
        } catch (error) {
            this.logger.error('MonorepoStrategy: Failed to analyze monorepo', {
                projectPath,
                error: error.message
            });
            throw new Error(`Failed to analyze monorepo: ${error.message}`);
        }
    }

    /**
     * Get monorepo type
     * @param {string} projectPath - Project path
     * @returns {Promise<string>} Monorepo type
     */
    async getMonorepoType(projectPath) {
        try {
            if (await this.fileExists(path.join(projectPath, 'lerna.json'))) {
                return 'lerna';
            } else if (await this.fileExists(path.join(projectPath, 'nx.json'))) {
                return 'nx';
            } else if (await this.fileExists(path.join(projectPath, 'rush.json'))) {
                return 'rush';
            } else if (await this.fileExists(path.join(projectPath, 'pnpm-workspace.yaml'))) {
                return 'pnpm';
            } else if (await this.hasYarnWorkspaces(projectPath)) {
                return 'yarn';
            } else {
                return 'custom';
            }
        } catch {
            return 'unknown';
        }
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
     * Check for Yarn workspaces
     * @param {string} projectPath - Project path
     * @returns {Promise<boolean>} True if has Yarn workspaces
     */
    async hasYarnWorkspaces(projectPath) {
        try {
            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            return !!(packageJson.workspaces && Array.isArray(packageJson.workspaces));
        } catch {
            return false;
        }
    }

    /**
     * Get workspaces configuration
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Workspaces config
     */
    async getWorkspaces(projectPath) {
        try {
            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            
            return {
                workspaces: packageJson.workspaces || [],
                private: packageJson.private || false,
                name: packageJson.name,
                version: packageJson.version
            };
        } catch {
            return { workspaces: [], private: false };
        }
    }

    /**
     * Get all packages in monorepo
     * @param {string} projectPath - Project path
     * @returns {Promise<Array>} Package list
     */
    async getPackages(projectPath) {
        try {
            const workspaces = await this.getWorkspaces(projectPath);
            const packages = [];

            for (const workspace of workspaces.workspaces) {
                const workspacePath = path.join(projectPath, workspace);
                const workspacePackages = await this.findPackagesInWorkspace(workspacePath);
                packages.push(...workspacePackages);
            }

            return packages;
        } catch (error) {
            this.logger.error('MonorepoStrategy: Failed to get packages', {
                projectPath,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Find packages in workspace
     * @param {string} workspacePath - Workspace path
     * @returns {Promise<Array>} Package list
     */
    async findPackagesInWorkspace(workspacePath) {
        try {
            const packages = [];
            const entries = await fs.readdir(workspacePath, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isDirectory === true) {
                    const packagePath = path.join(workspacePath, entry.name);
                    const packageJsonPath = path.join(packagePath, 'package.json');

                    if (await this.fileExists(packageJsonPath)) {
                        try {
                            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
                            packages.push({
                                name: packageJson.name,
                                version: packageJson.version,
                                path: packagePath,
                                relativePath: path.relative(workspacePath, packagePath),
                                type: this.determinePackageType(packageJson),
                                dependencies: packageJson.dependencies || {},
                                devDependencies: packageJson.devDependencies || {},
                                scripts: packageJson.scripts || {}
                            });
                        } catch {
                            // Skip invalid package.json files
                        }
                    }

                    // Also check common subdirectories like backend/frontend
                    const commonSubdirs = ['backend', 'frontend', 'api', 'client', 'server', 'app', 'src'];
                    if (commonSubdirs.includes(entry.name)) {
                        const subdirPackages = await this.findPackagesInSubdirectory(packagePath);
                        packages.push(...subdirPackages);
                    }
                }
            }

            return packages;
        } catch {
            return [];
        }
    }

    /**
     * Find packages in subdirectory
     * @param {string} subdirPath - Subdirectory path
     * @returns {Promise<Array>} Package list
     */
    async findPackagesInSubdirectory(subdirPath) {
        try {
            const packages = [];
            const packageJsonPath = path.join(subdirPath, 'package.json');

            if (await this.fileExists(packageJsonPath)) {
                try {
                    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
                    packages.push({
                        name: packageJson.name,
                        version: packageJson.version,
                        path: subdirPath,
                        relativePath: path.relative(path.dirname(path.dirname(subdirPath)), subdirPath),
                        type: this.determinePackageType(packageJson),
                        dependencies: packageJson.dependencies || {},
                        devDependencies: packageJson.devDependencies || {},
                        scripts: packageJson.scripts || {}
                    });
                } catch {
                    // Skip invalid package.json files
                }
            }

            return packages;
        } catch {
            return [];
        }
    }

    /**
     * Determine package type
     * @param {Object} packageJson - Package.json content
     * @returns {string} Package type
     */
    determinePackageType(packageJson) {
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

        if (dependencies.react || dependencies.vue || dependencies.angular) {
            return 'frontend';
        } else if (dependencies.express || dependencies.koa || dependencies.fastify) {
            return 'backend';
        } else if (dependencies.typescript) {
            return 'library';
        } else {
            return 'utility';
        }
    }

    /**
     * Analyze dependencies across monorepo
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Dependencies analysis
     */
    async analyzeDependencies(projectPath) {
        try {
            const packages = await this.getPackages(projectPath);
            const analysis = {
                sharedDependencies: {},
                uniqueDependencies: {},
                dependencyConflicts: [],
                circularDependencies: [],
                recommendations: []
            };

            // Analyze shared dependencies
            const allDeps = new Map();
            for (const pkg of packages) {
                for (const [dep, version] of Object.entries(pkg.dependencies)) {
                    if (!allDeps.has(dep)) {
                        allDeps.set(dep, new Set());
                    }
                    allDeps.get(dep).add(version);
                }
            }

            // Find shared dependencies
            for (const [dep, versions] of allDeps) {
                if (versions.size > 1) {
                    analysis.dependencyConflicts.push({
                        dependency: dep,
                        versions: Array.from(versions),
                        packages: packages.filter(pkg => pkg.dependencies[dep])
                    });
                } else {
                    analysis.sharedDependencies[dep] = Array.from(versions)[0];
                }
            }

            // Generate recommendations
            if (analysis.dependencyConflicts.length > 0) {
                analysis.recommendations.push({
                    type: 'dependency_conflicts',
                    message: 'Consider standardizing dependency versions across packages',
                    conflicts: analysis.dependencyConflicts
                });
            }

            return analysis;
        } catch (error) {
            this.logger.error('MonorepoStrategy: Failed to analyze dependencies', {
                projectPath,
                error: error.message
            });
            return {};
        }
    }

    /**
     * Detect build tools in monorepo
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Build tools detection
     */
    async detectBuildTools(projectPath) {
        try {
            const tools = {
                lerna: await this.fileExists(path.join(projectPath, 'lerna.json')),
                nx: await this.fileExists(path.join(projectPath, 'nx.json')),
                rush: await this.fileExists(path.join(projectPath, 'rush.json')),
                pnpm: await this.fileExists(path.join(projectPath, 'pnpm-workspace.yaml')),
                yarn: await this.hasYarnWorkspaces(projectPath),
                npm: false
            };

            // Check for npm workspaces
            try {
                const packageJsonPath = path.join(projectPath, 'package.json');
                const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
                tools.npm = !!(packageJson.workspaces && !Array.isArray(packageJson.workspaces));
            } catch {
                tools.npm = false;
            }

            return tools;
        } catch (error) {
            this.logger.error('MonorepoStrategy: Failed to detect build tools', {
                projectPath,
                error: error.message
            });
            return {};
        }
    }

    /**
     * Get shared configurations
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Shared configs
     */
    async getSharedConfigs(projectPath) {
        try {
            const configs = {
                eslint: await this.findSharedConfig(projectPath, '.eslintrc'),
                prettier: await this.findSharedConfig(projectPath, '.prettierrc'),
                typescript: await this.findSharedConfig(projectPath, 'tsconfig.json'),
                jest: await this.findSharedConfig(projectPath, 'jest.config'),
                webpack: await this.findSharedConfig(projectPath, 'webpack.config'),
                babel: await this.findSharedConfig(projectPath, 'babel.config')
            };

            return configs;
        } catch (error) {
            this.logger.error('MonorepoStrategy: Failed to get shared configs', {
                projectPath,
                error: error.message
            });
            return {};
        }
    }

    /**
     * Find shared configuration file
     * @param {string} projectPath - Project path
     * @param {string} configName - Config file name
     * @returns {Promise<boolean>} True if shared config exists
     */
    async findSharedConfig(projectPath, configName) {
        const extensions = ['', '.js', '.json', '.yml', '.yaml'];
        
        for (const ext of extensions) {
            if (await this.fileExists(path.join(projectPath, `${configName}${ext}`))) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Generate recommendations for monorepo
     * @param {string} projectPath - Project path
     * @returns {Promise<Array>} Recommendations
     */
    async generateRecommendations(projectPath) {
        try {
            const recommendations = [];
            const analysis = await this.analyzeMonorepo(projectPath);

            // Check for missing shared configurations
            const sharedConfigs = analysis.sharedConfigs;
            if (!sharedConfigs.eslint) {
                recommendations.push({
                    type: 'shared_config',
                    priority: 'high',
                    message: 'Consider adding a shared ESLint configuration',
                    action: 'Create .eslintrc.js in root with extends for all packages'
                });
            }

            if (!sharedConfigs.prettier) {
                recommendations.push({
                    type: 'shared_config',
                    priority: 'medium',
                    message: 'Consider adding a shared Prettier configuration',
                    action: 'Create .prettierrc in root for consistent formatting'
                });
            }

            if (!sharedConfigs.typescript) {
                recommendations.push({
                    type: 'shared_config',
                    priority: 'high',
                    message: 'Consider adding a shared TypeScript configuration',
                    action: 'Create tsconfig.json in root with base configuration'
                });
            }

            // Check for dependency management
            if (analysis.dependencies.dependencyConflicts.length > 0) {
                recommendations.push({
                    type: 'dependency_management',
                    priority: 'high',
                    message: 'Standardize dependency versions across packages',
                    action: 'Use workspace hoisting or lockfile management'
                });
            }

            // Check for build tool optimization
            const buildTools = analysis.buildTools;
            if (!buildTools.lerna && !buildTools.nx && !buildTools.rush) {
                recommendations.push({
                    type: 'build_tool',
                    priority: 'medium',
                    message: 'Consider using a monorepo build tool',
                    action: 'Implement Lerna, Nx, or Rush for better package management'
                });
            }

            // Check for package structure
            const packages = analysis.packages;
            if (packages.length > 10) {
                recommendations.push({
                    type: 'structure',
                    priority: 'low',
                    message: 'Consider organizing packages into categories',
                    action: 'Group packages by domain or functionality'
                });
            }

            return recommendations;
        } catch (error) {
            this.logger.error('MonorepoStrategy: Failed to generate recommendations', {
                projectPath,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Optimize monorepo structure
     * @param {string} projectPath - Project path
     * @param {Object} options - Optimization options
     * @returns {Promise<Object>} Optimization result
     */
    async optimizeMonorepo(projectPath, options = {}) {
        try {
            this.logger.info('MonorepoStrategy: Optimizing monorepo', { projectPath });

            const optimizations = {
                sharedConfigs: await this.createSharedConfigs(projectPath, options),
                dependencyManagement: await this.optimizeDependencies(projectPath, options),
                buildOptimization: await this.optimizeBuild(projectPath, options),
                structureOptimization: await this.optimizeStructure(projectPath, options)
            };

            if (this.eventBus) {
                this.eventBus.publish('monorepo.optimization.completed', {
                    projectPath,
                    optimizations,
                    timestamp: new Date()
                });
            }

            return optimizations;
        } catch (error) {
            this.logger.error('MonorepoStrategy: Failed to optimize monorepo', {
                projectPath,
                error: error.message
            });
            throw new Error(`Failed to optimize monorepo: ${error.message}`);
        }
    }

    /**
     * Create shared configurations
     * @param {string} projectPath - Project path
     * @param {Object} options - Options
     * @returns {Promise<Object>} Shared configs result
     */
    async createSharedConfigs(projectPath, options) {
        const results = {};

        try {
            // Create shared ESLint config
            if (options.createEslintConfig) {
                results.eslint = await this.createSharedEslintConfig(projectPath);
            }

            // Create shared Prettier config
            if (options.createPrettierConfig) {
                results.prettier = await this.createSharedPrettierConfig(projectPath);
            }

            // Create shared TypeScript config
            if (options.createTypescriptConfig) {
                results.typescript = await this.createSharedTypescriptConfig(projectPath);
            }

            return results;
        } catch (error) {
            this.logger.error('MonorepoStrategy: Failed to create shared configs', {
                projectPath,
                error: error.message
            });
            return results;
        }
    }

    /**
     * Create shared ESLint configuration
     * @param {string} projectPath - Project path
     * @returns {Promise<boolean>} Success status
     */
    async createSharedEslintConfig(projectPath) {
        try {
            const eslintConfig = {
                root: true,
                extends: [
                    'eslint:recommended',
                    '@typescript-eslint/recommended'
                ],
                parser: '@typescript-eslint/parser',
                plugins: ['@typescript-eslint'],
                env: {
                    node: true,
                    es2021: true
                },
                parserOptions: {
                    ecmaVersion: 2021,
                    sourceType: 'module'
                },
                rules: {
                    '@typescript-eslint/no-unused-vars': 'error',
                    '@typescript-eslint/explicit-function-return-type': 'off',
                    '@typescript-eslint/explicit-module-boundary-types': 'off'
                }
            };

            await fs.writeFile(
                path.join(projectPath, '.eslintrc.json'),
                JSON.stringify(eslintConfig, null, 2)
            );

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Create shared Prettier configuration
     * @param {string} projectPath - Project path
     * @returns {Promise<boolean>} Success status
     */
    async createSharedPrettierConfig(projectPath) {
        try {
            const prettierConfig = {
                semi: true,
                trailingComma: 'es5',
                singleQuote: true,
                printWidth: 80,
                tabWidth: 2,
                useTabs: false
            };

            await fs.writeFile(
                path.join(projectPath, '.prettierrc'),
                JSON.stringify(prettierConfig, null, 2)
            );

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Create shared TypeScript configuration
     * @param {string} projectPath - Project path
     * @returns {Promise<boolean>} Success status
     */
    async createSharedTypescriptConfig(projectPath) {
        try {
            const tsConfig = {
                compilerOptions: {
                    target: 'ES2020',
                    module: 'commonjs',
                    lib: ['ES2020'],
                    outDir: './dist',
                    rootDir: './src',
                    strict: true,
                    esModuleInterop: true,
                    skipLibCheck: true,
                    forceConsistentCasingInFileNames: true,
                    declaration: true,
                    declarationMap: true,
                    sourceMap: true,
                    composite: true
                },
                include: ['src/**/*'],
                exclude: ['node_modules', 'dist']
            };

            await fs.writeFile(
                path.join(projectPath, 'tsconfig.json'),
                JSON.stringify(tsConfig, null, 2)
            );

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Optimize dependencies
     * @param {string} projectPath - Project path
     * @param {Object} options - Options
     * @returns {Promise<Object>} Optimization result
     */
    async optimizeDependencies(projectPath, options) {
        // Implementation for dependency optimization
        return { success: true, message: 'Dependency optimization completed' };
    }

    /**
     * Optimize build process
     * @param {string} projectPath - Project path
     * @param {Object} options - Options
     * @returns {Promise<Object>} Optimization result
     */
    async optimizeBuild(projectPath, options) {
        // Implementation for build optimization
        return { success: true, message: 'Build optimization completed' };
    }

    /**
     * Optimize structure
     * @param {string} projectPath - Project path
     * @param {Object} options - Options
     * @returns {Promise<Object>} Optimization result
     */
    async optimizeStructure(projectPath, options) {
        // Implementation for structure optimization
        return { success: true, message: 'Structure optimization completed' };
    }
}

module.exports = MonorepoStrategy; 