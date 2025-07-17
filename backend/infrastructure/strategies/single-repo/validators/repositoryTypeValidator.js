/**
 * Repository type validator for SingleRepoStrategy
 */
const path = require('path');
const { MONOREPO_INDICATORS } = require('../constants');
const ServiceLogger = require('@logging/ServiceLogger');

class RepositoryTypeValidator {
    constructor(dependencies = {}) {
        this.logger = new ServiceLogger('RepositoryTypeValidator');
        this.fileUtils = new (require('../utils/fileUtils'))();
    }

    /**
     * Check if project is a single repository
     * @param {string} projectPath - Project path
     * @returns {Promise<boolean>} True if single repo
     */
    async isSingleRepo(projectPath) {
        try {
            // Check for monorepo indicators first
            for (const indicator of MONOREPO_INDICATORS) {
                if (await this.fileUtils.fileExists(path.join(projectPath, indicator))) {
                    return false; // It's a monorepo
                }
            }

            // Check for workspace configuration
            try {
                const packageJsonPath = path.join(projectPath, 'package.json');
                const packageJson = await this.fileUtils.readJsonFile(packageJsonPath);
                
                if (packageJson && packageJson.workspaces && Array.isArray(packageJson.workspaces) && packageJson.workspaces.length > 0) {
                    return false; // It's a monorepo
                }
            } catch {
                // Continue checking other indicators
            }

            // Check for common single repo patterns
            const hasSrcDir = await this.fileUtils.directoryExists(path.join(projectPath, 'src'));
            const hasAppDir = await this.fileUtils.directoryExists(path.join(projectPath, 'app'));
            const hasLibDir = await this.fileUtils.directoryExists(path.join(projectPath, 'lib'));
            const hasComponentsDir = await this.fileUtils.directoryExists(path.join(projectPath, 'components'));

            return hasSrcDir || hasAppDir || hasLibDir || hasComponentsDir;
        } catch (error) {
            this.logger.error('RepositoryTypeValidator: Failed to check if single repo', {
                projectPath,
                error: error.message
            });
            return false;
        }
    }
}

module.exports = RepositoryTypeValidator; 