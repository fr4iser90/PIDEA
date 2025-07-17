/**
 * Security analyzer service for SingleRepoStrategy
 */
const path = require('path');
const { SECURITY_FILES, SECRETS_FILES, SECURITY_DEPENDENCIES } = require('../constants');
const ServiceLogger = require('@logging/ServiceLogger');

class SecurityAnalyzer {
    constructor(dependencies = {}) {
        this.logger = new ServiceLogger('SecurityAnalyzer');
        this.fileUtils = new (require('../utils/fileUtils'))();
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
                const packageJson = await this.fileUtils.readJsonFile(packageJsonPath);
                
                if (packageJson) {
                    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

                    security.hasAuditScript = !!packageJson.scripts?.audit;
                    security.hasSecurityDependencies = this.hasAnyDependency(allDeps, SECURITY_DEPENDENCIES);

                    // Check for security configuration files
                    security.hasSecurityConfig = await this.fileUtils.hasAnyFile(projectPath, SECURITY_FILES);

                    // Check for secrets management
                    security.hasSecretsManagement = await this.fileUtils.hasAnyFile(projectPath, SECRETS_FILES);
                }
            } catch {
                // Ignore package.json errors
            }

            return security;
        } catch (error) {
            this.logger.error('SecurityAnalyzer: Failed to analyze security', {
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
        if (!dependencies || !targetDeps || targetDeps.length === 0) {
            return false;
        }
        return targetDeps.some(dep => dependencies[dep]);
    }
}

module.exports = SecurityAnalyzer; 