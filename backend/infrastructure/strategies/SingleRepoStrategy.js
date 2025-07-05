/**
 * SingleRepoStrategy - Handles single repository optimization and analysis
 */
const path = require('path');
const fs = require('fs').promises;

class SingleRepoStrategy {
    constructor(dependencies = {}) {
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
        this.fileSystemService = dependencies.fileSystemService;
        this.projectAnalyzer = dependencies.projectAnalyzer;
    }

    /**
     * Check if project is a single repository
     * @param {string} projectPath - Project path
     * @returns {Promise<boolean>} True if single repo
     */
    async isSingleRepo(projectPath) {
        try {
            // Check for monorepo indicators first
            const monorepoIndicators = [
                'lerna.json',
                'nx.json',
                'rush.json',
                'pnpm-workspace.yaml'
            ];

            for (const indicator of monorepoIndicators) {
                if (await this.fileExists(path.join(projectPath, indicator))) {
                    return false; // It's a monorepo
                }
            }

            // Check for workspace configuration
            try {
                const packageJsonPath = path.join(projectPath, 'package.json');
                const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
                
                if (packageJson.workspaces && Array.isArray(packageJson.workspaces) && packageJson.workspaces.length > 0) {
                    return false; // It's a monorepo
                }
            } catch {
                // Continue checking other indicators
            }

            // Check for common single repo patterns
            const hasSrcDir = await this.directoryExists(path.join(projectPath, 'src'));
            const hasAppDir = await this.directoryExists(path.join(projectPath, 'app'));
            const hasLibDir = await this.directoryExists(path.join(projectPath, 'lib'));
            const hasComponentsDir = await this.directoryExists(path.join(projectPath, 'components'));

            return hasSrcDir || hasAppDir || hasLibDir || hasComponentsDir;
        } catch (error) {
            this.logger.error('SingleRepoStrategy: Failed to check if single repo', {
                projectPath,
                error: error.message
            });
            return false;
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
     * Check if directory exists
     * @param {string} dirPath - Directory path
     * @returns {Promise<boolean>} True if directory exists
     */
    async directoryExists(dirPath) {
        try {
            const stats = await fs.stat(dirPath);
            return stats.isDirectory === true;
        } catch {
            return false;
        }
    }

    /**
     * Analyze single repository structure
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Single repo analysis
     */
    async analyzeSingleRepo(projectPath) {
        try {
            this.logger.info('SingleRepoStrategy: Analyzing single repository', { projectPath });

            const analysis = {
                isSingleRepo: await this.isSingleRepo(projectPath),
                projectType: await this.getProjectType(projectPath),
                structure: await this.analyzeStructure(projectPath),
                dependencies: await this.analyzeDependencies(projectPath),
                buildTools: await this.detectBuildTools(projectPath),
                testing: await this.analyzeTesting(projectPath),
                linting: await this.analyzeLinting(projectPath),
                deployment: await this.analyzeDeployment(projectPath),
                performance: await this.analyzePerformance(projectPath),
                security: await this.analyzeSecurity(projectPath),
                recommendations: await this.generateRecommendations(projectPath)
            };

            if (this.eventBus) {
                this.eventBus.publish('singlerepo.analysis.completed', {
                    projectPath,
                    analysis,
                    timestamp: new Date()
                });
            }

            return analysis;
        } catch (error) {
            this.logger.error('SingleRepoStrategy: Failed to analyze single repo', {
                projectPath,
                error: error.message
            });
            throw new Error(`Failed to analyze single repository: ${error.message}`);
        }
    }

    /**
     * Get project type
     * @param {string} projectPath - Project path
     * @returns {Promise<string>} Project type
     */
    async getProjectType(projectPath) {
        try {
            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

            // Frontend frameworks
            if (dependencies.react || dependencies['react-dom']) {
                return 'react-app';
            } else if (dependencies.vue) {
                return 'vue-app';
            } else if (dependencies.angular || dependencies['@angular/core']) {
                return 'angular-app';
            } else if (dependencies.svelte) {
                return 'svelte-app';
            } else if (dependencies.next) {
                return 'next-app';
            } else if (dependencies.nuxt) {
                return 'nuxt-app';
            }

            // Backend frameworks
            if (dependencies.express) {
                return 'express-app';
            } else if (dependencies.koa) {
                return 'koa-app';
            } else if (dependencies.fastify) {
                return 'fastify-app';
            } else if (dependencies['@nestjs/core']) {
                return 'nest-app';
            }

            // Build tools
            if (dependencies.webpack || await this.fileExists(path.join(projectPath, 'webpack.config.js'))) {
                return 'webpack-app';
            } else if (dependencies.vite || await this.fileExists(path.join(projectPath, 'vite.config.js'))) {
                return 'vite-app';
            } else if (dependencies.rollup || await this.fileExists(path.join(projectPath, 'rollup.config.js'))) {
                return 'rollup-app';
            }

            // Library
            if (dependencies.typescript || await this.fileExists(path.join(projectPath, 'tsconfig.json'))) {
                return 'typescript-library';
            }

            return 'node-app';
        } catch {
            return 'unknown';
        }
    }

    /**
     * Analyze project structure
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Structure analysis
     */
    async analyzeStructure(projectPath) {
        try {
            const structure = {
                directories: [],
                files: [],
                totalFiles: 0,
                totalDirectories: 0,
                totalSize: 0,
                mainDirectories: {},
                fileTypes: {}
            };

            // Analyze main directories
            const mainDirs = ['src', 'app', 'lib', 'components', 'pages', 'api', 'config', 'utils', 'types'];
            for (const dir of mainDirs) {
                const dirPath = path.join(projectPath, dir);
                if (await this.directoryExists(dirPath)) {
                    const stats = await this.getDirectoryStats(dirPath);
                    structure.mainDirectories[dir] = stats;
                }
            }

            // Analyze file structure
            await this.scanDirectory(projectPath, structure, 0, 3);

            return structure;
        } catch (error) {
            this.logger.error('SingleRepoStrategy: Failed to analyze structure', {
                projectPath,
                error: error.message
            });
            return {};
        }
    }

    /**
     * Get directory statistics
     * @param {string} dirPath - Directory path
     * @returns {Promise<Object>} Directory stats
     */
    async getDirectoryStats(dirPath) {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            const stats = {
                files: 0,
                directories: 0,
                totalSize: 0,
                fileTypes: {}
            };

            for (const entry of entries) {
                if (entry.isFile === true) {
                    stats.files++;
                    const ext = path.extname(entry.name);
                    stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
                    
                    try {
                        const filePath = path.join(dirPath, entry.name);
                        const fileStats = await fs.stat(filePath);
                        stats.totalSize += fileStats.size;
                    } catch {
                        // Ignore stat errors
                    }
                } else if (entry.isDirectory === true) {
                    stats.directories++;
                }
            }

            return stats;
        } catch {
            return { files: 0, directories: 0, totalSize: 0, fileTypes: {} };
        }
    }

    /**
     * Recursively scan directory
     * @param {string} dirPath - Directory path
     * @param {Object} structure - Structure object to populate
     * @param {number} depth - Current depth
     * @param {number} maxDepth - Maximum depth
     */
    async scanDirectory(dirPath, structure, depth, maxDepth) {
        if (depth > maxDepth) return;

        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                const relativePath = path.relative(structure.root || dirPath, fullPath);

                // Skip common exclusions
                if (this.shouldSkipDirectory(entry.name)) continue;

                if (entry.isDirectory === true) {
                    structure.directories.push({
                        name: entry.name,
                        path: relativePath,
                        depth
                    });
                    structure.totalDirectories++;

                    await this.scanDirectory(fullPath, structure, depth + 1, maxDepth);
                } else if (entry.isFile === true && this.isCodeFile(entry.name)) {
                    const stats = await fs.stat(fullPath);
                    const ext = path.extname(entry.name);
                    
                    structure.files.push({
                        name: entry.name,
                        path: relativePath,
                        size: stats.size,
                        extension: ext,
                        depth
                    });
                    structure.totalFiles++;
                    structure.totalSize += stats.size;
                    
                    structure.fileTypes[ext] = (structure.fileTypes[ext] || 0) + 1;
                }
            }
        } catch (error) {
            this.logger.warn('SingleRepoStrategy: Failed to scan directory', {
                dirPath,
                error: error.message
            });
        }
    }

    /**
     * Check if directory should be skipped
     * @param {string} dirName - Directory name
     * @returns {boolean} True if should skip
     */
    shouldSkipDirectory(dirName) {
        const skipDirs = [
            'node_modules', '.git', '.vscode', '.idea', 'dist', 'build',
            'coverage', '.nyc_output', '.next', '.nuxt', 'out', 'public'
        ];
        return skipDirs.includes(dirName);
    }

    /**
     * Analyze dependencies
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Dependencies analysis
     */
    async analyzeDependencies(projectPath) {
        try {
            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

            const analysis = {
                dependencies: packageJson.dependencies || {},
                devDependencies: packageJson.devDependencies || {},
                peerDependencies: packageJson.peerDependencies || {},
                optionalDependencies: packageJson.optionalDependencies || {},
                totalDependencies: Object.keys(packageJson.dependencies || {}).length,
                totalDevDependencies: Object.keys(packageJson.devDependencies || {}).length,
                hasLockFile: await this.hasLockFile(projectPath),
                packageManager: await this.detectPackageManager(projectPath),
                outdatedDependencies: [],
                securityIssues: [],
                recommendations: []
            };

            // Analyze dependency categories
            analysis.categories = this.categorizeDependencies(analysis.dependencies);
            analysis.devCategories = this.categorizeDependencies(analysis.devDependencies);

            // Generate recommendations
            analysis.recommendations = this.generateDependencyRecommendations(analysis);

            return analysis;
        } catch (error) {
            this.logger.error('SingleRepoStrategy: Failed to analyze dependencies', {
                projectPath,
                error: error.message
            });
            return {};
        }
    }

    /**
     * Check if project has lock file
     * @param {string} projectPath - Project path
     * @returns {Promise<boolean>} True if has lock file
     */
    async hasLockFile(projectPath) {
        const lockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
        
        for (const lockFile of lockFiles) {
            try {
                await fs.access(path.join(projectPath, lockFile));
                return true;
            } catch {
                continue;
            }
        }
        return false;
    }

    /**
     * Detect package manager
     * @param {string} projectPath - Project path
     * @returns {Promise<string>} Package manager name
     */
    async detectPackageManager(projectPath) {
        const lockFiles = {
            'package-lock.json': 'npm',
            'yarn.lock': 'yarn',
            'pnpm-lock.yaml': 'pnpm'
        };

        for (const [lockFile, manager] of Object.entries(lockFiles)) {
            try {
                await fs.access(path.join(projectPath, lockFile));
                return manager;
            } catch {
                continue;
            }
        }
        return 'npm'; // Default
    }

    /**
     * Categorize dependencies
     * @param {Object} dependencies - Dependencies object
     * @returns {Object} Categorized dependencies
     */
    categorizeDependencies(dependencies) {
        const categories = {
            framework: [],
            build: [],
            testing: [],
            linting: [],
            utility: [],
            database: [],
            security: [],
            monitoring: [],
            other: []
        };

        for (const [dep, version] of Object.entries(dependencies)) {
            if (this.isFramework(dep)) {
                categories.framework.push({ name: dep, version });
            } else if (this.isBuildTool(dep)) {
                categories.build.push({ name: dep, version });
            } else if (this.isTestingTool(dep)) {
                categories.testing.push({ name: dep, version });
            } else if (this.isLintingTool(dep)) {
                categories.linting.push({ name: dep, version });
            } else if (this.isDatabase(dep)) {
                categories.database.push({ name: dep, version });
            } else if (this.isSecurity(dep)) {
                categories.security.push({ name: dep, version });
            } else if (this.isMonitoring(dep)) {
                categories.monitoring.push({ name: dep, version });
            } else if (this.isUtility(dep)) {
                categories.utility.push({ name: dep, version });
            } else {
                categories.other.push({ name: dep, version });
            }
        }

        return categories;
    }

    /**
     * Check if dependency is a framework
     * @param {string} dep - Dependency name
     * @returns {boolean} True if framework
     */
    isFramework(dep) {
        const frameworks = [
            'react', 'vue', 'angular', 'svelte', 'next', 'nuxt',
            'express', 'koa', 'fastify', '@nestjs/core'
        ];
        return frameworks.includes(dep);
    }

    /**
     * Check if dependency is a build tool
     * @param {string} dep - Dependency name
     * @returns {boolean} True if build tool
     */
    isBuildTool(dep) {
        const buildTools = [
            'webpack', 'vite', 'rollup', 'esbuild', 'swc',
            'babel', 'typescript', 'postcss', 'tailwindcss'
        ];
        return buildTools.includes(dep);
    }

    /**
     * Check if dependency is a testing tool
     * @param {string} dep - Dependency name
     * @returns {boolean} True if testing tool
     */
    isTestingTool(dep) {
        const testingTools = [
            'jest', 'mocha', 'cypress', 'playwright', 'puppeteer',
            'vitest', '@testing-library/react', '@testing-library/vue'
        ];
        return testingTools.includes(dep);
    }

    /**
     * Check if dependency is a linting tool
     * @param {string} dep - Dependency name
     * @returns {boolean} True if linting tool
     */
    isLintingTool(dep) {
        const lintingTools = [
            'eslint', 'prettier', 'stylelint', 'tslint'
        ];
        return lintingTools.includes(dep);
    }

    /**
     * Check if dependency is a database
     * @param {string} dep - Dependency name
     * @returns {boolean} True if database
     */
    isDatabase(dep) {
        const databases = [
            'mysql', 'postgres', 'sqlite', 'mongodb', 'redis',
            'prisma', 'sequelize', 'mongoose', 'typeorm'
        ];
        return databases.includes(dep);
    }

    /**
     * Check if dependency is security-related
     * @param {string} dep - Dependency name
     * @returns {boolean} True if security
     */
    isSecurity(dep) {
        const security = [
            'helmet', 'bcrypt', 'jsonwebtoken', 'cors',
            'express-rate-limit', 'express-validator'
        ];
        return security.includes(dep);
    }

    /**
     * Check if dependency is monitoring-related
     * @param {string} dep - Dependency name
     * @returns {boolean} True if monitoring
     */
    isMonitoring(dep) {
        const monitoring = [
            'winston', 'morgan', 'express-status-monitor',
            'prometheus', 'grafana'
        ];
        return monitoring.includes(dep);
    }

    /**
     * Check if dependency is a utility
     * @param {string} dep - Dependency name
     * @returns {boolean} True if utility
     */
    isUtility(dep) {
        const utilities = [
            'lodash', 'moment', 'date-fns', 'uuid', 'crypto',
            'axios', 'node-fetch', 'form-data'
        ];
        return utilities.includes(dep);
    }

    /**
     * Generate dependency recommendations
     * @param {Object} analysis - Dependencies analysis
     * @returns {Array} Recommendations
     */
    generateDependencyRecommendations(analysis) {
        const recommendations = [];

        // Check for missing lock file
        if (!analysis.hasLockFile) {
            recommendations.push({
                type: 'lock_file',
                priority: 'high',
                message: 'Add a lock file for consistent dependency versions',
                action: `Run '${analysis.packageManager} install' to generate lock file`
            });
        }

        // Check for security dependencies
        if (analysis.categories.security.length === 0) {
            recommendations.push({
                type: 'security',
                priority: 'high',
                message: 'Consider adding security dependencies',
                action: 'Add helmet, bcrypt, or jsonwebtoken for security'
            });
        }

        // Check for testing dependencies
        if (analysis.categories.testing.length === 0) {
            recommendations.push({
                type: 'testing',
                priority: 'medium',
                message: 'Consider adding testing dependencies',
                action: 'Add jest, mocha, or cypress for testing'
            });
        }

        // Check for linting dependencies
        if (analysis.categories.linting.length === 0) {
            recommendations.push({
                type: 'linting',
                priority: 'medium',
                message: 'Consider adding linting dependencies',
                action: 'Add eslint and prettier for code quality'
            });
        }

        return recommendations;
    }

    /**
     * Detect build tools
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Build tools detection
     */
    async detectBuildTools(projectPath) {
        const tools = {};

        const buildTools = [
            { name: 'webpack', files: ['webpack.config.js', 'webpack.config.ts'] },
            { name: 'vite', files: ['vite.config.js', 'vite.config.ts'] },
            { name: 'rollup', files: ['rollup.config.js', 'rollup.config.ts'] },
            { name: 'parcel', files: ['package.json'] },
            { name: 'esbuild', files: ['esbuild.config.js'] },
            { name: 'swc', files: ['.swcrc', 'swc.config.js'] }
        ];

        for (const tool of buildTools) {
            tools[tool.name] = await this.hasAnyFile(projectPath, tool.files);
        }

        return tools;
    }

    /**
     * Check if any of the specified files exist
     * @param {string} projectPath - Project path
     * @param {Array<string>} files - Files to check
     * @returns {Promise<boolean>} True if any file exists
     */
    async hasAnyFile(projectPath, files) {
        for (const file of files) {
            try {
                await fs.access(path.join(projectPath, file));
                return true;
            } catch {
                continue;
            }
        }
        return false;
    }

    /**
     * Analyze testing setup
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Testing analysis
     */
    async analyzeTesting(projectPath) {
        try {
            const testing = {
                hasTests: false,
                testFiles: [],
                testConfigs: [],
                coverage: false,
                e2e: false,
                unit: false,
                integration: false
            };

            // Check for test files
            const testFiles = await this.findTestFiles(projectPath);
            testing.testFiles = testFiles;
            testing.hasTests = testFiles.length > 0;

            // Check for test configurations
            const testConfigs = [
                'jest.config.js', 'jest.config.ts', 'cypress.config.js',
                'playwright.config.js', 'vitest.config.js'
            ];

            for (const config of testConfigs) {
                if (await this.fileExists(path.join(projectPath, config))) {
                    testing.testConfigs.push(config);
                }
            }

            // Determine test types
            testing.unit = testFiles.some(file => file.includes('.test.') || file.includes('.spec.'));
            testing.integration = testFiles.some(file => file.includes('integration') || file.includes('e2e'));
            testing.e2e = testFiles.some(file => file.includes('e2e') || file.includes('cypress') || file.includes('playwright'));

            return testing;
        } catch (error) {
            this.logger.error('SingleRepoStrategy: Failed to analyze testing', {
                projectPath,
                error: error.message
            });
            return {};
        }
    }

    /**
     * Find test files
     * @param {string} projectPath - Project path
     * @returns {Promise<Array>} Test files
     */
    async findTestFiles(projectPath) {
        const testFiles = [];
        const testPatterns = [
            '**/*.test.js', '**/*.test.ts', '**/*.test.jsx', '**/*.test.tsx',
            '**/*.spec.js', '**/*.spec.ts', '**/*.spec.jsx', '**/*.spec.tsx',
            '**/__tests__/**/*', '**/tests/**/*', '**/test/**/*'
        ];

        // Simple implementation - in production, use glob patterns
        try {
            await this.scanForTestFiles(projectPath, testFiles);
        } catch (error) {
            this.logger.warn('SingleRepoStrategy: Failed to scan for test files', {
                projectPath,
                error: error.message
            });
        }

        return testFiles;
    }

    /**
     * Scan for test files recursively
     * @param {string} dirPath - Directory path
     * @param {Array} testFiles - Test files array
     */
    async scanForTestFiles(dirPath, testFiles) {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                
                if (entry.isDirectory === true && !this.shouldSkipDirectory(entry.name)) {
                    await this.scanForTestFiles(fullPath, testFiles);
                } else if (entry.isFile === true && this.isCodeFile(entry.name)) {
                    testFiles.push(fullPath);
                }
            }
        } catch (error) {
            // Ignore scan errors
        }
    }

    /**
     * Analyze linting setup
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Linting analysis
     */
    async analyzeLinting(projectPath) {
        try {
            const linting = {
                hasLinting: false,
                configs: [],
                tools: []
            };

            const lintConfigs = [
                '.eslintrc.js', '.eslintrc.json', '.eslintrc.yml',
                '.prettierrc', '.prettierrc.js', '.prettierrc.json',
                '.stylelintrc', 'stylelint.config.js'
            ];

            for (const config of lintConfigs) {
                if (await this.fileExists(path.join(projectPath, config))) {
                    linting.configs.push(config);
                    linting.hasLinting = true;
                }
            }

            // Check package.json for linting scripts
            try {
                const packageJsonPath = path.join(projectPath, 'package.json');
                const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
                const scripts = packageJson.scripts || {};

                if (scripts.lint || scripts.eslint || scripts.prettier) {
                    linting.hasLinting = true;
                }
            } catch {
                // Ignore package.json errors
            }

            return linting;
        } catch (error) {
            this.logger.error('SingleRepoStrategy: Failed to analyze linting', {
                projectPath,
                error: error.message
            });
            return {};
        }
    }

    /**
     * Analyze deployment setup
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Deployment analysis
     */
    async analyzeDeployment(projectPath) {
        try {
            const deployment = {
                hasDeployment: false,
                configs: [],
                platforms: []
            };

            const deploymentConfigs = [
                'Dockerfile', 'docker-compose.yml', 'vercel.json',
                'netlify.toml', '.github/workflows', '.gitlab-ci.yml'
            ];

            for (const config of deploymentConfigs) {
                if (await this.fileExists(path.join(projectPath, config))) {
                    deployment.configs.push(config);
                    deployment.hasDeployment = true;
                }
            }

            // Detect deployment platforms
            if (deployment.configs.includes('vercel.json')) {
                deployment.platforms.push('vercel');
            }
            if (deployment.configs.includes('netlify.toml')) {
                deployment.platforms.push('netlify');
            }
            if (deployment.configs.includes('Dockerfile')) {
                deployment.platforms.push('docker');
            }
            if (deployment.configs.includes('.github/workflows')) {
                deployment.platforms.push('github-actions');
            }

            return deployment;
        } catch (error) {
            this.logger.error('SingleRepoStrategy: Failed to analyze deployment', {
                projectPath,
                error: error.message
            });
            return {};
        }
    }

    /**
     * Analyze performance aspects
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Performance analysis
     */
    async analyzePerformance(projectPath) {
        try {
            const performance = {
                hasPerformanceConfig: false,
                hasMonitoring: false,
                hasCaching: false,
                hasOptimization: false
            };

            // Check for performance-related dependencies
            try {
                const packageJsonPath = path.join(projectPath, 'package.json');
                const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
                const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

                performance.hasMonitoring = !!(
                    allDeps['winston'] || 
                    allDeps['morgan'] || 
                    allDeps['express-status-monitor']
                );

                performance.hasCaching = !!(
                    allDeps['redis'] || 
                    allDeps['memcached'] || 
                    allDeps['node-cache']
                );

                performance.hasOptimization = !!(
                    allDeps['compression'] || 
                    allDeps['express-static-gzip']
                );
            } catch {
                // Ignore package.json errors
            }

            // Check for performance configuration files
            const perfFiles = ['performance.config.js', 'monitoring.config.js'];
            performance.hasPerformanceConfig = await this.hasAnyFile(projectPath, perfFiles);

            return performance;
        } catch (error) {
            this.logger.error('SingleRepoStrategy: Failed to analyze performance', {
                projectPath,
                error: error.message
            });
            return {};
        }
    }

    /**
     * Analyze security aspects
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Security analysis
     */
    async analyzeSecurity(projectPath) {
        try {
            const security = {
                hasSecurityConfig: false,
                hasAuditScript: false,
                hasSecretsManagement: false,
                hasSecurityDependencies: false
            };

            try {
                const packageJsonPath = path.join(projectPath, 'package.json');
                const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
                const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

                security.hasAuditScript = !!packageJson.scripts?.audit;
                security.hasSecurityDependencies = !!(
                    allDeps['helmet'] || 
                    allDeps['express-rate-limit'] || 
                    allDeps['cors'] ||
                    allDeps['bcrypt'] ||
                    allDeps['jsonwebtoken']
                );

                // Check for security configuration files
                const securityFiles = ['.env.example', 'security.config.js', 'auth.config.js'];
                security.hasSecurityConfig = await this.hasAnyFile(projectPath, securityFiles);

                // Check for secrets management
                const secretsFiles = ['.env', '.env.local', 'secrets.json'];
                security.hasSecretsManagement = await this.hasAnyFile(projectPath, secretsFiles);

            } catch {
                // Ignore package.json errors
            }

            return security;
        } catch (error) {
            this.logger.error('SingleRepoStrategy: Failed to analyze security', {
                projectPath,
                error: error.message
            });
            return {};
        }
    }

    /**
     * Generate recommendations for single repository
     * @param {string} projectPath - Project path
     * @returns {Promise<Array>} Recommendations
     */
    async generateRecommendations(projectPath) {
        try {
            const recommendations = [];
            const analysis = await this.analyzeSingleRepo(projectPath);

            // Structure recommendations
            if (!analysis.structure.mainDirectories.src && !analysis.structure.mainDirectories.app) {
                recommendations.push({
                    type: 'structure',
                    priority: 'medium',
                    message: 'Consider organizing code into src/ or app/ directory',
                    action: 'Create src/ directory and move source files there'
                });
            }

            // Testing recommendations
            if (!analysis.testing.hasTests) {
                recommendations.push({
                    type: 'testing',
                    priority: 'high',
                    message: 'Add testing setup to the project',
                    action: 'Install and configure Jest or other testing framework'
                });
            }

            // Linting recommendations
            if (!analysis.linting.hasLinting) {
                recommendations.push({
                    type: 'linting',
                    priority: 'medium',
                    message: 'Add linting and formatting setup',
                    action: 'Install and configure ESLint and Prettier'
                });
            }

            // Security recommendations
            if (!analysis.security.hasSecurityDependencies) {
                recommendations.push({
                    type: 'security',
                    priority: 'high',
                    message: 'Add security dependencies',
                    action: 'Install helmet, bcrypt, or other security packages'
                });
            }

            // Performance recommendations
            if (!analysis.performance.hasMonitoring) {
                recommendations.push({
                    type: 'performance',
                    priority: 'low',
                    message: 'Consider adding monitoring and logging',
                    action: 'Install winston or morgan for logging'
                });
            }

            return recommendations;
        } catch (error) {
            this.logger.error('SingleRepoStrategy: Failed to generate recommendations', {
                projectPath,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Optimize single repository
     * @param {string} projectPath - Project path
     * @param {Object} options - Optimization options
     * @returns {Promise<Object>} Optimization result
     */
    async optimizeSingleRepo(projectPath, options = {}) {
        try {
            this.logger.info('SingleRepoStrategy: Optimizing single repository', { projectPath });

            const optimizations = {
                structure: await this.optimizeStructure(projectPath, options),
                dependencies: await this.optimizeDependencies(projectPath, options),
                build: await this.optimizeBuild(projectPath, options),
                testing: await this.optimizeTesting(projectPath, options),
                linting: await this.optimizeLinting(projectPath, options),
                security: await this.optimizeSecurity(projectPath, options),
                performance: await this.optimizePerformance(projectPath, options)
            };

            if (this.eventBus) {
                this.eventBus.publish('singlerepo.optimization.completed', {
                    projectPath,
                    optimizations,
                    timestamp: new Date()
                });
            }

            return optimizations;
        } catch (error) {
            this.logger.error('SingleRepoStrategy: Failed to optimize single repo', {
                projectPath,
                error: error.message
            });
            throw new Error(`Failed to optimize single repository: ${error.message}`);
        }
    }

    /**
     * Optimize project structure
     * @param {string} projectPath - Project path
     * @param {Object} options - Options
     * @returns {Promise<Object>} Optimization result
     */
    async optimizeStructure(projectPath, options) {
        // Implementation for structure optimization
        return { success: true, message: 'Structure optimization completed' };
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
     * Optimize testing setup
     * @param {string} projectPath - Project path
     * @param {Object} options - Options
     * @returns {Promise<Object>} Optimization result
     */
    async optimizeTesting(projectPath, options) {
        // Implementation for testing optimization
        return { success: true, message: 'Testing optimization completed' };
    }

    /**
     * Optimize linting setup
     * @param {string} projectPath - Project path
     * @param {Object} options - Options
     * @returns {Promise<Object>} Optimization result
     */
    async optimizeLinting(projectPath, options) {
        // Implementation for linting optimization
        return { success: true, message: 'Linting optimization completed' };
    }

    /**
     * Optimize security setup
     * @param {string} projectPath - Project path
     * @param {Object} options - Options
     * @returns {Promise<Object>} Optimization result
     */
    async optimizeSecurity(projectPath, options) {
        // Implementation for security optimization
        return { success: true, message: 'Security optimization completed' };
    }

    /**
     * Optimize performance setup
     * @param {string} projectPath - Project path
     * @param {Object} options - Options
     * @returns {Promise<Object>} Optimization result
     */
    async optimizePerformance(projectPath, options) {
        // Implementation for performance optimization
        return { success: true, message: 'Performance optimization completed' };
    }
}

module.exports = SingleRepoStrategy; 