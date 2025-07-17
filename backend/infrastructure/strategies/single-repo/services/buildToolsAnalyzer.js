/**
 * Build tools analyzer service for SingleRepoStrategy
 */
const { BUILD_TOOLS } = require('../constants');
const ServiceLogger = require('@logging/ServiceLogger');

class BuildToolsAnalyzer {
    constructor(dependencies = {}) {
        this.logger = new ServiceLogger('BuildToolsAnalyzer');
        this.fileUtils = new (require('../utils/fileUtils'))();
    }

    /**
     * Detect build tools
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Build tools detection
     */
    async detectBuildTools(projectPath) {
        const tools = {};

        for (const tool of BUILD_TOOLS) {
            tools[tool.name] = await this.fileUtils.hasAnyFile(projectPath, tool.files);
        }

        return tools;
    }
}

module.exports = BuildToolsAnalyzer; 