/**
 * Directory scanning utilities for SingleRepoStrategy
 */
const path = require('path');
const fs = require('fs').promises;
const { SKIP_DIRECTORIES } = require('../constants');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class DirectoryScanner {
    constructor(logger, fileUtils) {
        this.logger = logger;
        this.fileUtils = fileUtils;
    }

    /**
     * Check if directory should be skipped
     * @param {string} dirName - Directory name
     * @returns {boolean} True if should skip
     */
    shouldSkipDirectory(dirName) {
        return SKIP_DIRECTORIES.includes(dirName);
    }

    /**
     * Recursively scan directory
     * @param {string} dirPath - Directory path
     * @param {Object} structure - Structure object to populate
     * @param {number} depth - Current depth
     * @param {number} maxDepth - Maximum depth
     */
    async scanDirectory(dirPath, structure, depth, maxDepth) {
        if (depth > maxDepth) return;

        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                const relativePath = path.relative(structure.root || dirPath, fullPath);

                // Skip common exclusions
                if (this.shouldSkipDirectory(entry.name)) continue;

                if (entry.isDirectory === true) {
                    structure.directories.push({
                        name: entry.name,
                        path: relativePath,
                        depth
                    });
                    structure.totalDirectories++;

                    await this.scanDirectory(fullPath, structure, depth + 1, maxDepth);
                } else if (entry.isFile === true && this.fileUtils.isCodeFile(entry.name)) {
                    const stats = await fs.stat(fullPath);
                    const ext = path.extname(entry.name);
                    
                    structure.files.push({
                        name: entry.name,
                        path: relativePath,
                        size: stats.size,
                        extension: ext,
                        depth
                    });
                    structure.totalFiles++;
                    structure.totalSize += stats.size;
                    
                    structure.fileTypes[ext] = (structure.fileTypes[ext] || 0) + 1;
                }
            }
        } catch (error) {
            this.logger.warn('DirectoryScanner: Failed to scan directory', {
                dirPath,
                error: error.message
            });
        }
    }

    /**
     * Scan for test files recursively
     * @param {string} dirPath - Directory path
     * @param {Array} testFiles - Test files array
     */
    async scanForTestFiles(dirPath, testFiles) {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                
                if (entry.isDirectory === true && !this.shouldSkipDirectory(entry.name)) {
                    await this.scanForTestFiles(fullPath, testFiles);
                } else if (entry.isFile === true && this.fileUtils.isCodeFile(entry.name)) {
                    testFiles.push(fullPath);
                }
            }
        } catch (error) {
            // Ignore scan errors
        }
    }
}

module.exports = DirectoryScanner; 