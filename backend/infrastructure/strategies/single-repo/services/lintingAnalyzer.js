/**
 * Linting analyzer service for SingleRepoStrategy
 */
const path = require('path');
const { LINT_CONFIGS } = require('../constants');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class LintingAnalyzer {
    constructor(logger, fileUtils) {
        this.logger = logger;
        this.fileUtils = fileUtils;
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

            // Check for linting configuration files
            for (const config of LINT_CONFIGS) {
                if (await this.fileUtils.fileExists(path.join(projectPath, config))) {
                    linting.configs.push(config);
                    linting.hasLinting = true;
                }
            }

            // Check package.json for linting scripts
            try {
                const packageJsonPath = path.join(projectPath, 'package.json');
                const packageJson = await this.fileUtils.readJsonFile(packageJsonPath);
                
                if (packageJson && packageJson.scripts) {
                    const scripts = packageJson.scripts;

                    if (scripts.lint || scripts.eslint || scripts.prettier) {
                        linting.hasLinting = true;
                    }
                }
            } catch {
                // Ignore package.json errors
            }

            return linting;
        } catch (error) {
            this.logger.error('LintingAnalyzer: Failed to analyze linting', {
                projectPath,
                error: error.message
            });
            return {};
        }
    }
}

module.exports = LintingAnalyzer; 