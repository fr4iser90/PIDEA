/**
 * Dependency analysis service for SingleRepoStrategy
 */
const path = require('path');
const { 
    LOCK_FILES, 
    DEPENDENCY_CATEGORIES,
    SECURITY_DEPENDENCIES 
} = require('../constants');
const { logger } = require('@infrastructure/logging/Logger');

class DependencyAnalyzer {
    constructor(logger, fileUtils) {
        this.logger = logger;
        this.fileUtils = fileUtils;
    }

    /**
     * Analyze dependencies
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Dependencies analysis
     */
    async analyzeDependencies(projectPath) {
        try {
            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJson = await this.fileUtils.readJsonFile(packageJsonPath);
            
            if (!packageJson) {
                return {};
            }

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
            this.logger.error('DependencyAnalyzer: Failed to analyze dependencies', {
                projectPath,
                error: error.message
            });
            return {};
        }
    }

    /**
     * Get packages for single repo (compatibility with DependencyAnalyzer)
     * @param {string} projectPath - Project path
     * @returns {Promise<Array>} Package list
     */
    async getPackages(projectPath) {
        try {
            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJson = await this.fileUtils.readJsonFile(packageJsonPath);
            
            if (!packageJson) {
                return [];
            }

            return [{
                name: packageJson.name,
                version: packageJson.version,
                path: projectPath,
                dependencies: packageJson.dependencies || {},
                devDependencies: packageJson.devDependencies || {}
            }];
        } catch (error) {
            this.logger.error('DependencyAnalyzer: Failed to get packages', {
                projectPath,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Check if project has lock file
     * @param {string} projectPath - Project path
     * @returns {Promise<boolean>} True if has lock file
     */
    async hasLockFile(projectPath) {
        const lockFiles = Object.keys(LOCK_FILES);
        
        for (const lockFile of lockFiles) {
            if (await this.fileUtils.fileExists(path.join(projectPath, lockFile))) {
                return true;
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
        for (const [lockFile, manager] of Object.entries(LOCK_FILES)) {
            if (await this.fileUtils.fileExists(path.join(projectPath, lockFile))) {
                return manager;
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
            frameworks: [],
            buildTools: [],
            testing: [],
            linting: [],
            databases: [],
            security: [],
            monitoring: [],
            utilities: []
        };

        for (const [dep, version] of Object.entries(dependencies)) {
            if (this.isFramework(dep)) {
                categories.frameworks.push({ name: dep, version });
            } else if (this.isBuildTool(dep)) {
                categories.buildTools.push({ name: dep, version });
            } else if (this.isTestingTool(dep)) {
                categories.testing.push({ name: dep, version });
            } else if (this.isLintingTool(dep)) {
                categories.linting.push({ name: dep, version });
            } else if (this.isDatabase(dep)) {
                categories.databases.push({ name: dep, version });
            } else if (this.isSecurity(dep)) {
                categories.security.push({ name: dep, version });
            } else if (this.isMonitoring(dep)) {
                categories.monitoring.push({ name: dep, version });
            } else if (this.isUtility(dep)) {
                categories.utilities.push({ name: dep, version });
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
        return DEPENDENCY_CATEGORIES.frameworks.includes(dep);
    }

    /**
     * Check if dependency is a build tool
     * @param {string} dep - Dependency name
     * @returns {boolean} True if build tool
     */
    isBuildTool(dep) {
        return DEPENDENCY_CATEGORIES.buildTools.includes(dep);
    }

    /**
     * Check if dependency is a testing tool
     * @param {string} dep - Dependency name
     * @returns {boolean} True if testing tool
     */
    isTestingTool(dep) {
        return DEPENDENCY_CATEGORIES.testing.includes(dep);
    }

    /**
     * Check if dependency is a linting tool
     * @param {string} dep - Dependency name
     * @returns {boolean} True if linting tool
     */
    isLintingTool(dep) {
        return DEPENDENCY_CATEGORIES.linting.includes(dep);
    }

    /**
     * Check if dependency is a database
     * @param {string} dep - Dependency name
     * @returns {boolean} True if database
     */
    isDatabase(dep) {
        return DEPENDENCY_CATEGORIES.databases.includes(dep);
    }

    /**
     * Check if dependency is security-related
     * @param {string} dep - Dependency name
     * @returns {boolean} True if security
     */
    isSecurity(dep) {
        return DEPENDENCY_CATEGORIES.security.includes(dep);
    }

    /**
     * Check if dependency is monitoring-related
     * @param {string} dep - Dependency name
     * @returns {boolean} True if monitoring
     */
    isMonitoring(dep) {
        return DEPENDENCY_CATEGORIES.monitoring.includes(dep);
    }

    /**
     * Check if dependency is a utility
     * @param {string} dep - Dependency name
     * @returns {boolean} True if utility
     */
    isUtility(dep) {
        return DEPENDENCY_CATEGORIES.utilities.includes(dep);
    }

    /**
     * Generate dependency recommendations
     * @param {Object} analysis - Dependency analysis
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
}

module.exports = DependencyAnalyzer; 