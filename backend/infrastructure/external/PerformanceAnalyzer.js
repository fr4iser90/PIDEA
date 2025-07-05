/**
 * PerformanceAnalyzer - Comprehensive performance analysis
 */
const path = require('path');
const fs = require('fs').promises;
const { execSync } = require('child_process');

class PerformanceAnalyzer {
    constructor() {
        this.performanceMetrics = {
            build: {},
            bundle: {},
            runtime: {},
            optimization: {}
        };
    }

    /**
     * Analyze performance for a project
     * @param {string} projectPath - Project directory path
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Performance analysis results
     */
    async analyzePerformance(projectPath, options = {}) {
        try {
            const analysis = {
                projectPath,
                timestamp: new Date(),
                overallScore: 0,
                buildPerformance: {},
                bundleAnalysis: {},
                runtimePerformance: {},
                optimizationOpportunities: [],
                bottlenecks: [],
                recommendations: []
            };

            // Analyze build performance
            analysis.buildPerformance = await this.analyzeBuildPerformance(projectPath);
            
            // Analyze bundle size
            analysis.bundleAnalysis = await this.analyzeBundleSize(projectPath);
            
            // Analyze runtime performance
            analysis.runtimePerformance = await this.analyzeRuntimePerformance(projectPath);
            
            // Identify optimization opportunities
            analysis.optimizationOpportunities = await this.identifyOptimizations(projectPath);
            
            // Identify bottlenecks
            analysis.bottlenecks = await this.identifyBottlenecks(projectPath);
            
            // Generate recommendations
            analysis.recommendations = await this.generatePerformanceRecommendations(analysis);
            
            // Calculate overall score
            analysis.overallScore = this.calculateOverallScore(analysis);

            return analysis;
        } catch (error) {
            throw new Error(`Performance analysis failed: ${error.message}`);
        }
    }

    /**
     * Analyze build performance
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Object>} Build performance analysis
     */
    async analyzeBuildPerformance(projectPath) {
        const build = {
            buildTime: null,
            hasBuildOptimization: false,
            hasCaching: false,
            hasParallelization: false,
            buildTools: [],
            optimizationLevel: 'low'
        };

        try {
            const packageJson = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf8'));
            const scripts = packageJson.scripts || {};
            const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

            // Detect build tools
            if (allDeps.webpack) {
                build.buildTools.push('webpack');
                build.hasBuildOptimization = true;
            }
            if (allDeps.vite) {
                build.buildTools.push('vite');
                build.hasBuildOptimization = true;
            }
            if (allDeps.rollup) {
                build.buildTools.push('rollup');
                build.hasBuildOptimization = true;
            }
            if (allDeps.parcel) {
                build.buildTools.push('parcel');
                build.hasBuildOptimization = true;
            }

            // Check for build optimization features
            if (allDeps['webpack-merge'] || allDeps['vite-plugin-optimize-persist']) {
                build.hasCaching = true;
            }

            if (allDeps['thread-loader'] || allDeps['parallel-webpack']) {
                build.hasParallelization = true;
            }

            // Analyze build scripts
            for (const [scriptName, script] of Object.entries(scripts)) {
                if (scriptName.includes('build')) {
                    // Check for optimization flags
                    if (script.includes('--optimize') || script.includes('--minify')) {
                        build.optimizationLevel = 'high';
                    } else if (script.includes('--production')) {
                        build.optimizationLevel = 'medium';
                    }
                }
            }

            // Try to measure build time (simplified)
            try {
                const startTime = Date.now();
                execSync('npm run build', { cwd: projectPath, stdio: 'pipe', timeout: 60000 });
                build.buildTime = Date.now() - startTime;
            } catch {
                // Build failed or timeout
                build.buildTime = null;
            }

        } catch (error) {
            // No package.json or parsing error
        }

        return build;
    }

    /**
     * Analyze bundle size
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Object>} Bundle size analysis
     */
    async analyzeBundleSize(projectPath) {
        const bundle = {
            totalSize: 0,
            chunkCount: 0,
            largeChunks: [],
            duplicateModules: [],
            unusedDependencies: [],
            optimizationLevel: 'low'
        };

        try {
            // Check for bundle analyzer
            const packageJson = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf8'));
            const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

            // Check for bundle analysis tools
            if (allDeps['webpack-bundle-analyzer'] || allDeps['rollup-plugin-visualizer']) {
                bundle.optimizationLevel = 'medium';
            }

            // Analyze dist/build directory if exists
            const distPaths = ['dist', 'build', 'out', 'public'];
            for (const distPath of distPaths) {
                try {
                    const fullPath = path.join(projectPath, distPath);
                    const stats = await fs.stat(fullPath);
                    
                    if (stats.isDirectory()) {
                        const files = await this.getBundleFiles(fullPath);
                        
                        for (const file of files) {
                            const fileStats = await fs.stat(file);
                            bundle.totalSize += fileStats.size;
                            bundle.chunkCount++;

                            // Check for large chunks (>500KB)
                            if (fileStats.size > 500000) {
                                bundle.largeChunks.push({
                                    file: path.basename(file),
                                    size: fileStats.size,
                                    sizeKB: Math.round(fileStats.size / 1024)
                                });
                            }
                        }
                    }
                } catch {
                    // Directory doesn't exist
                }
            }

            // Check for duplicate dependencies
            bundle.duplicateModules = await this.findDuplicateModules(projectPath);

        } catch (error) {
            // No package.json or parsing error
        }

        return bundle;
    }

    /**
     * Analyze runtime performance
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Object>} Runtime performance analysis
     */
    async analyzeRuntimePerformance(projectPath) {
        const runtime = {
            hasPerformanceMonitoring: false,
            hasCaching: false,
            hasCompression: false,
            hasLazyLoading: false,
            hasCodeSplitting: false,
            performanceIssues: []
        };

        try {
            const packageJson = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf8'));
            const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

            // Check for performance monitoring
            if (allDeps['web-vitals'] || allDeps['lighthouse'] || allDeps['performance-now']) {
                runtime.hasPerformanceMonitoring = true;
            }

            // Check for caching
            if (allDeps.redis || allDeps.memcached || allDeps['node-cache']) {
                runtime.hasCaching = true;
            }

            // Check for compression
            if (allDeps.compression || allDeps['express-static-gzip']) {
                runtime.hasCompression = true;
            }

            // Check for lazy loading
            if (allDeps['react-lazy'] || allDeps['@loadable/component']) {
                runtime.hasLazyLoading = true;
            }

            // Check for code splitting
            const files = await this.getCodeFiles(projectPath);
            for (const file of files) {
                const content = await fs.readFile(file, 'utf8');
                
                if (content.includes('React.lazy') || content.includes('import(')) {
                    runtime.hasCodeSplitting = true;
                    break;
                }
            }

            // Analyze performance issues
            runtime.performanceIssues = await this.analyzePerformanceIssues(projectPath);

        } catch (error) {
            // No package.json or parsing error
        }

        return runtime;
    }

    /**
     * Identify optimization opportunities
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Array>} Optimization opportunities
     */
    async identifyOptimizations(projectPath) {
        const optimizations = [];

        try {
            const packageJson = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf8'));
            const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

            // Check for missing optimizations
            if (!allDeps.compression) {
                optimizations.push({
                    type: 'compression',
                    title: 'Add compression middleware',
                    description: 'Enable gzip compression for better performance',
                    impact: 'high',
                    effort: 'low'
                });
            }

            if (!allDeps.redis && !allDeps.memcached) {
                optimizations.push({
                    type: 'caching',
                    title: 'Implement caching strategy',
                    description: 'Add Redis or Memcached for data caching',
                    impact: 'high',
                    effort: 'medium'
                });
            }

            if (!allDeps['webpack-bundle-analyzer']) {
                optimizations.push({
                    type: 'bundle-analysis',
                    title: 'Add bundle analyzer',
                    description: 'Use webpack-bundle-analyzer to optimize bundle size',
                    impact: 'medium',
                    effort: 'low'
                });
            }

            // Check for code optimizations
            const files = await this.getCodeFiles(projectPath);
            let hasLazyLoading = false;
            let hasCodeSplitting = false;

            for (const file of files) {
                const content = await fs.readFile(file, 'utf8');
                
                if (content.includes('React.lazy') || content.includes('import(')) {
                    hasLazyLoading = true;
                }
                
                if (content.includes('webpackChunkName') || content.includes('dynamic import')) {
                    hasCodeSplitting = true;
                }
            }

            if (!hasLazyLoading) {
                optimizations.push({
                    type: 'lazy-loading',
                    title: 'Implement lazy loading',
                    description: 'Use React.lazy for component lazy loading',
                    impact: 'medium',
                    effort: 'medium'
                });
            }

            if (!hasCodeSplitting) {
                optimizations.push({
                    type: 'code-splitting',
                    title: 'Implement code splitting',
                    description: 'Split code into smaller chunks for better loading',
                    impact: 'high',
                    effort: 'medium'
                });
            }

        } catch (error) {
            // No package.json or parsing error
        }

        return optimizations;
    }

    /**
     * Identify performance bottlenecks
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Array>} Performance bottlenecks
     */
    async identifyBottlenecks(projectPath) {
        const bottlenecks = [];

        try {
            const files = await this.getCodeFiles(projectPath);
            
            for (const file of files) {
                const content = await fs.readFile(file, 'utf8');
                const fileBottlenecks = this.findBottlenecks(content, file);
                bottlenecks.push(...fileBottlenecks);
            }

        } catch (error) {
            // Ignore errors
        }

        return bottlenecks;
    }

    /**
     * Find bottlenecks in file content
     * @param {string} content - File content
     * @param {string} filePath - File path
     * @returns {Array} Bottlenecks found
     */
    findBottlenecks(content, filePath) {
        const bottlenecks = [];
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;

            // N+1 query patterns
            if (line.includes('forEach') && line.includes('query') || line.includes('map') && line.includes('query')) {
                bottlenecks.push({
                    file: filePath,
                    line: lineNumber,
                    type: 'n-plus-one-query',
                    description: 'Potential N+1 query pattern',
                    severity: 'high'
                });
            }

            // Synchronous operations in loops
            if (line.includes('for') && (line.includes('fs.readFileSync') || line.includes('execSync'))) {
                bottlenecks.push({
                    file: filePath,
                    line: lineNumber,
                    type: 'sync-in-loop',
                    description: 'Synchronous operation in loop',
                    severity: 'medium'
                });
            }

            // Large data processing
            if (line.includes('JSON.parse') && line.includes('fs.readFile')) {
                bottlenecks.push({
                    file: filePath,
                    line: lineNumber,
                    type: 'large-data-processing',
                    description: 'Large data processing without streaming',
                    severity: 'medium'
                });
            }

            // Memory leaks
            if (line.includes('setInterval') && !line.includes('clearInterval')) {
                bottlenecks.push({
                    file: filePath,
                    line: lineNumber,
                    type: 'memory-leak',
                    description: 'Potential memory leak - missing clearInterval',
                    severity: 'high'
                });
            }
        }

        return bottlenecks;
    }

    /**
     * Generate performance recommendations
     * @param {Object} analysis - Complete performance analysis
     * @returns {Promise<Array>} Performance recommendations
     */
    async generatePerformanceRecommendations(analysis) {
        const recommendations = [];

        // Build performance recommendations
        if (analysis.buildPerformance.buildTime > 30000) {
            recommendations.push({
                title: 'Optimize build time',
                description: `Build time is ${Math.round(analysis.buildPerformance.buildTime / 1000)}s - consider optimizations`,
                priority: 'medium',
                category: 'build'
            });
        }

        if (!analysis.buildPerformance.hasCaching) {
            recommendations.push({
                title: 'Add build caching',
                description: 'Implement build caching to reduce build times',
                priority: 'high',
                category: 'build'
            });
        }

        // Bundle size recommendations
        if (analysis.bundleAnalysis.totalSize > 5000000) { // 5MB
            recommendations.push({
                title: 'Reduce bundle size',
                description: `Bundle size is ${Math.round(analysis.bundleAnalysis.totalSize / 1024 / 1024)}MB - too large`,
                priority: 'high',
                category: 'bundle'
            });
        }

        if (analysis.bundleAnalysis.largeChunks.length > 0) {
            recommendations.push({
                title: 'Split large chunks',
                description: `${analysis.bundleAnalysis.largeChunks.length} chunks are too large`,
                priority: 'medium',
                category: 'bundle'
            });
        }

        // Runtime performance recommendations
        if (!analysis.runtimePerformance.hasCompression) {
            recommendations.push({
                title: 'Enable compression',
                description: 'Add gzip compression for better performance',
                priority: 'high',
                category: 'runtime'
            });
        }

        if (!analysis.runtimePerformance.hasCaching) {
            recommendations.push({
                title: 'Implement caching',
                description: 'Add caching strategy for better performance',
                priority: 'high',
                category: 'runtime'
            });
        }

        // Optimization recommendations
        for (const optimization of analysis.optimizationOpportunities) {
            recommendations.push({
                title: optimization.title,
                description: optimization.description,
                priority: optimization.impact === 'high' ? 'high' : 'medium',
                category: 'optimization'
            });
        }

        return recommendations;
    }

    /**
     * Calculate overall performance score
     * @param {Object} analysis - Complete performance analysis
     * @returns {number} Performance score (0-100)
     */
    calculateOverallScore(analysis) {
        let score = 100;

        // Deduct points for build issues
        if (analysis.buildPerformance.buildTime > 60000) score -= 15;
        if (!analysis.buildPerformance.hasCaching) score -= 10;
        if (!analysis.buildPerformance.hasParallelization) score -= 5;

        // Deduct points for bundle issues
        if (analysis.bundleAnalysis.totalSize > 10000000) score -= 20; // 10MB
        else if (analysis.bundleAnalysis.totalSize > 5000000) score -= 10; // 5MB
        
        if (analysis.bundleAnalysis.largeChunks.length > 0) score -= 10;

        // Deduct points for runtime issues
        if (!analysis.runtimePerformance.hasCompression) score -= 15;
        if (!analysis.runtimePerformance.hasCaching) score -= 15;
        if (!analysis.runtimePerformance.hasCodeSplitting) score -= 10;

        // Deduct points for bottlenecks
        score -= analysis.bottlenecks.length * 5;

        // Add points for optimizations
        score += analysis.optimizationOpportunities.length * 2;

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Get bundle files from directory
     * @param {string} dirPath - Directory path
     * @returns {Promise<Array>} Array of bundle file paths
     */
    async getBundleFiles(dirPath) {
        const files = [];
        
        try {
            const getFiles = async (dir) => {
                const items = await fs.readdir(dir);
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    const stats = await fs.stat(itemPath);
                    
                    if (stats.isDirectory()) {
                        await getFiles(itemPath);
                    } else if (stats.isFile()) {
                        const ext = path.extname(item);
                        if (['.js', '.css', '.html'].includes(ext)) {
                            files.push(itemPath);
                        }
                    }
                }
            };
            
            await getFiles(dirPath);
        } catch (error) {
            // Ignore errors
        }

        return files;
    }

    /**
     * Find duplicate modules
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Array>} Duplicate modules
     */
    async findDuplicateModules(projectPath) {
        const duplicates = [];

        try {
            const packageJson = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf8'));
            const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

            // Check for common duplicate patterns
            const duplicatePatterns = [
                { name: 'lodash', pattern: /lodash/ },
                { name: 'moment', pattern: /moment/ },
                { name: 'jquery', pattern: /jquery/ }
            ];

            for (const pattern of duplicatePatterns) {
                const matches = Object.keys(allDeps).filter(dep => pattern.pattern.test(dep));
                if (matches.length > 1) {
                    duplicates.push({
                        module: pattern.name,
                        versions: matches,
                        count: matches.length
                    });
                }
            }

        } catch (error) {
            // No package.json or parsing error
        }

        return duplicates;
    }

    /**
     * Analyze performance issues
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Array>} Performance issues
     */
    async analyzePerformanceIssues(projectPath) {
        const issues = [];

        try {
            const files = await this.getCodeFiles(projectPath);
            
            for (const file of files) {
                const content = await fs.readFile(file, 'utf8');
                const fileIssues = this.findPerformanceIssues(content, file);
                issues.push(...fileIssues);
            }

        } catch (error) {
            // Ignore errors
        }

        return issues;
    }

    /**
     * Find performance issues in file content
     * @param {string} content - File content
     * @param {string} filePath - File path
     * @returns {Array} Performance issues
     */
    findPerformanceIssues(content, filePath) {
        const issues = [];
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;

            // Inefficient DOM queries
            if (line.includes('getElementById') && line.includes('for')) {
                issues.push({
                    file: filePath,
                    line: lineNumber,
                    type: 'inefficient-dom-query',
                    description: 'DOM query in loop - cache the element',
                    severity: 'medium'
                });
            }

            // Large object creation
            if (line.includes('new Array(') && line.includes('1000')) {
                issues.push({
                    file: filePath,
                    line: lineNumber,
                    type: 'large-object-creation',
                    description: 'Large array creation - consider streaming',
                    severity: 'medium'
                });
            }

            // Unnecessary re-renders
            if (line.includes('setState') && line.includes('prevState')) {
                issues.push({
                    file: filePath,
                    line: lineNumber,
                    type: 'unnecessary-rerender',
                    description: 'Potential unnecessary re-render',
                    severity: 'low'
                });
            }
        }

        return issues;
    }

    /**
     * Get code files in project
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Array>} Array of code file paths
     */
    async getCodeFiles(projectPath) {
        const files = [];
        
        try {
            const getFiles = async (dir) => {
                const items = await fs.readdir(dir);
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    const stats = await fs.stat(itemPath);
                    
                    if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                        await getFiles(itemPath);
                    } else if (stats.isFile()) {
                        const ext = path.extname(item);
                        if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
                            files.push(itemPath);
                        }
                    }
                }
            };
            
            await getFiles(projectPath);
        } catch (error) {
            // Ignore errors
        }

        return files;
    }
}

module.exports = PerformanceAnalyzer; 