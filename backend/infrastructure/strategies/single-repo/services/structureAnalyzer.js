/**
 * Structure analyzer service for SingleRepoStrategy
 */
const path = require('path');
const { MAIN_DIRECTORIES } = require('../constants');
const ServiceLogger = require('@logging/ServiceLogger');

class StructureAnalyzer {
    constructor(dependencies = {}) {
        this.logger = new ServiceLogger('StructureAnalyzer');
        this.fileUtils = new (require('../utils/fileUtils'))();
        this.directoryScanner = new (require('../utils/directoryScanner'))();
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
            for (const dir of MAIN_DIRECTORIES) {
                const dirPath = path.join(projectPath, dir);
                if (await this.fileUtils.directoryExists(dirPath)) {
                    const stats = await this.fileUtils.getDirectoryStats(dirPath);
                    structure.mainDirectories[dir] = stats;
                }
            }

            // Analyze file structure
            await this.directoryScanner.scanDirectory(projectPath, structure, 0, 3);

            return structure;
        } catch (error) {
            this.logger.error('StructureAnalyzer: Failed to analyze structure', {
                projectPath,
                error: error.message
            });
            return {};
        }
    }
}

module.exports = StructureAnalyzer; 