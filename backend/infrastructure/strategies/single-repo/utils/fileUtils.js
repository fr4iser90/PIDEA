/**
 * File utility functions for SingleRepoStrategy
 */
const path = require('path');
const fs = require('fs').promises;

class FileUtils {
    constructor(logger) {
        this.logger = logger;
    }

    /**
     * Check if file exists
     * @param {string} filePath - File path
     * @returns {Promise<boolean>} True if file exists
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if directory exists
     * @param {string} dirPath - Directory path
     * @returns {Promise<boolean>} True if directory exists
     */
    async directoryExists(dirPath) {
        try {
            const stats = await fs.stat(dirPath);
            return stats.isDirectory === true;
        } catch {
            return false;
        }
    }

    /**
     * Check if any of the specified files exist
     * @param {string} projectPath - Project path
     * @param {Array<string>} files - Files to check
     * @returns {Promise<boolean>} True if any file exists
     */
    async hasAnyFile(projectPath, files) {
        for (const file of files) {
            try {
                await fs.access(path.join(projectPath, file));
                return true;
            } catch {
                continue;
            }
        }
        return false;
    }

    /**
     * Get directory statistics
     * @param {string} dirPath - Directory path
     * @returns {Promise<Object>} Directory stats
     */
    async getDirectoryStats(dirPath) {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            const stats = {
                files: 0,
                directories: 0,
                totalSize: 0,
                fileTypes: {}
            };

            for (const entry of entries) {
                if (entry.isFile === true) {
                    stats.files++;
                    const ext = path.extname(entry.name);
                    stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
                    
                    try {
                        const filePath = path.join(dirPath, entry.name);
                        const fileStats = await fs.stat(filePath);
                        stats.totalSize += fileStats.size;
                    } catch {
                        // Ignore stat errors
                    }
                } else if (entry.isDirectory === true) {
                    stats.directories++;
                }
            }

            return stats;
        } catch {
            return { files: 0, directories: 0, totalSize: 0, fileTypes: {} };
        }
    }

    /**
     * Check if file is a code file
     * @param {string} fileName - File name
     * @returns {boolean} True if code file
     */
    isCodeFile(fileName) {
        const codeExtensions = [
            '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
            '.py', '.java', '.cpp', '.c', '.cs', '.php',
            '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
            '.html', '.css', '.scss', '.sass', '.less',
            '.json', '.xml', '.yaml', '.yml', '.toml',
            '.md', '.txt', '.sh', '.bat', '.ps1'
        ];
        
        const ext = path.extname(fileName).toLowerCase();
        return codeExtensions.includes(ext);
    }

    /**
     * Read and parse JSON file
     * @param {string} filePath - File path
     * @returns {Promise<Object>} Parsed JSON
     */
    async readJsonFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            if (this.logger && typeof this.logger.warn === 'function') {
                this.logger.warn('FileUtils: Failed to read JSON file', {
                    filePath,
                    error: error.message
                });
            }
            return null;
        }
    }
}

module.exports = FileUtils; 