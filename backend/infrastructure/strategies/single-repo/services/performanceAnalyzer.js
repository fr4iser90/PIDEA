/**
 * Performance analyzer service for SingleRepoStrategy
 */
const { PERFORMANCE_FILES, PERFORMANCE_DEPENDENCIES } = require('../constants');

class PerformanceAnalyzer {
    constructor(logger, fileUtils) {
        this.logger = logger;
        this.fileUtils = fileUtils;
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
                const packageJson = await this.fileUtils.readJsonFile(packageJsonPath);
                
                if (packageJson) {
                    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

                    performance.hasMonitoring = this.hasAnyDependency(allDeps, PERFORMANCE_DEPENDENCIES.monitoring);
                    performance.hasCaching = this.hasAnyDependency(allDeps, PERFORMANCE_DEPENDENCIES.caching);
                    performance.hasOptimization = this.hasAnyDependency(allDeps, PERFORMANCE_DEPENDENCIES.optimization);
                }
            } catch {
                // Ignore package.json errors
            }

            // Check for performance configuration files
            performance.hasPerformanceConfig = await this.fileUtils.hasAnyFile(projectPath, PERFORMANCE_FILES);

            return performance;
        } catch (error) {
            this.logger.error('PerformanceAnalyzer: Failed to analyze performance', {
                projectPath,
                error: error.message
            });
            return {};
        }
    }

    /**
     * Check if any of the specified dependencies exist
     * @param {Object} dependencies - Dependencies object
     * @param {Array<string>} targetDeps - Target dependencies to check
     * @returns {boolean} True if any dependency exists
     */
    hasAnyDependency(dependencies, targetDeps) {
        return targetDeps.some(dep => dependencies[dep]);
    }
}

module.exports = PerformanceAnalyzer; 