/**
 * Project type analyzer service for SingleRepoStrategy
 */
const path = require('path');
const { 
    FRONTEND_FRAMEWORKS, 
    BACKEND_FRAMEWORKS, 
    BUILD_TOOLS_DETECTION 
} = require('../constants');
const ServiceLogger = require('@logging/ServiceLogger');

class ProjectTypeAnalyzer {
    constructor(dependencies = {}) {
        this.logger = new ServiceLogger('ProjectTypeAnalyzer');
        this.fileUtils = new (require('../utils/fileUtils'))();
    }

    /**
     * Get project type
     * @param {string} projectPath - Project path
     * @returns {Promise<string>} Project type
     */
    async getProjectType(projectPath) {
        try {
            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJson = await this.fileUtils.readJsonFile(packageJsonPath);
            
            if (!packageJson) {
                return 'unknown';
            }

            const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

            // Check frontend frameworks
            const frontendType = this.detectFrontendFramework(dependencies);
            if (frontendType) {
                return frontendType;
            }

            // Check backend frameworks
            const backendType = this.detectBackendFramework(dependencies);
            if (backendType) {
                return backendType;
            }

            // Check build tools
            const buildType = await this.detectBuildTool(projectPath, dependencies);
            if (buildType) {
                return buildType;
            }

            // Check for TypeScript
            if (dependencies.typescript || await this.fileUtils.fileExists(path.join(projectPath, 'tsconfig.json'))) {
                return 'typescript-library';
            }

            return 'node-app';
        } catch (error) {
            if (this.logger) {
                this.logger.error('ProjectTypeAnalyzer: Failed to get project type', {
                    projectPath,
                    error: error.message
                });
            }
            return 'unknown';
        }
    }

    /**
     * Detect frontend framework
     * @param {Object} dependencies - Dependencies object
     * @returns {string|null} Framework type or null
     */
    detectFrontendFramework(dependencies) {
        if (!dependencies) {
            return null;
        }
        
        for (const [dep, type] of Object.entries(FRONTEND_FRAMEWORKS)) {
            if (dependencies[dep]) {
                return type;
            }
        }
        return null;
    }

    /**
     * Detect backend framework
     * @param {Object} dependencies - Dependencies object
     * @returns {string|null} Framework type or null
     */
    detectBackendFramework(dependencies) {
        if (!dependencies) {
            return null;
        }
        
        for (const [dep, type] of Object.entries(BACKEND_FRAMEWORKS)) {
            if (dependencies[dep]) {
                return type;
            }
        }
        return null;
    }

    /**
     * Detect build tool
     * @param {string} projectPath - Project path
     * @param {Object} dependencies - Dependencies object
     * @returns {Promise<string|null>} Build tool type or null
     */
    async detectBuildTool(projectPath, dependencies) {
        // Check dependencies first
        if (dependencies) {
            for (const [dep, type] of Object.entries(BUILD_TOOLS_DETECTION)) {
                if (dependencies[dep]) {
                    return type;
                }
            }
        }

        // Check configuration files
        const buildConfigs = {
            'webpack.config.js': 'webpack-app',
            'webpack.config.ts': 'webpack-app',
            'vite.config.js': 'vite-app',
            'vite.config.ts': 'vite-app',
            'rollup.config.js': 'rollup-app',
            'rollup.config.ts': 'rollup-app'
        };

        try {
            for (const [configFile, type] of Object.entries(buildConfigs)) {
                if (await this.fileUtils.fileExists(path.join(projectPath, configFile))) {
                    return type;
                }
            }
        } catch (error) {
            // Handle fileExists errors gracefully
            return null;
        }

        return null;
    }
}

module.exports = ProjectTypeAnalyzer; 