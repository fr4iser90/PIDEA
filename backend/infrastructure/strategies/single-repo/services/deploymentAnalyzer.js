/**
 * Deployment analyzer service for SingleRepoStrategy
 */
const { DEPLOYMENT_CONFIGS } = require('../constants');
const { logger } = require('@infrastructure/logging/Logger');

class DeploymentAnalyzer {
    constructor(logger, fileUtils) {
        this.logger = logger;
        this.fileUtils = fileUtils;
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

            // Check for deployment configuration files
            for (const config of DEPLOYMENT_CONFIGS) {
                if (await this.fileUtils.fileExists(path.join(projectPath, config))) {
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
            this.logger.error('DeploymentAnalyzer: Failed to analyze deployment', {
                projectPath,
                error: error.message
            });
            return {};
        }
    }
}

module.exports = DeploymentAnalyzer; 