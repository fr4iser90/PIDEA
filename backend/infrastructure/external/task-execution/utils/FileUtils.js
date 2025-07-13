/**
 * File utility functions for TaskExecutionEngine
 */
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const EXECUTION_CONSTANTS = require('../constants/ExecutionConstants');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class FileUtils {
    constructor(logger = console) {
        this.logger = logger;
    }

    /**
     * Get all files in a directory recursively
     * @param {string} dirPath - Directory path
     * @returns {Promise<Array>} Array of file objects
     */
    async getAllFiles(dirPath) {
        const files = [];

        try {
            const items = await fs.readdir(dirPath);
            
            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const stats = await fs.stat(itemPath);
                
                if (stats.isDirectory === true) {
                    if (!item.startsWith('.') && item !== 'node_modules') {
                        const subFiles = await this.getAllFiles(itemPath);
                        files.push(...subFiles);
                    }
                } else if (stats.isFile === true) {
                    files.push({
                        path: itemPath,
                        size: stats.size,
                        modified: stats.mtime,
                        type: 'file'
                    });
                }
            }
        } catch (error) {
            this.logger.error('FileUtils: Failed to get all files', {
                dirPath: dirPath,
                error: error.message
            });
        }

        return files;
    }

    /**
     * Find files by pattern
     * @param {string} pattern - File pattern to search for
     * @param {string} rootPath - Root path to search in
     * @returns {Promise<Array>} Array of matching files
     */
    async findFilesByPattern(pattern, rootPath) {
        const files = await this.getAllFiles(rootPath);
        return files.filter(file => {
            const fileName = path.basename(file.path);
            return fileName.includes(pattern) || file.path.includes(pattern);
        });
    }

    /**
     * Check if file or directory exists
     * @param {string} filePath - File path to check
     * @returns {Promise<boolean>} True if exists
     */
    async exists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Create backup of a file
     * @param {string} filePath - File to backup
     * @param {string} backupDir - Backup directory
     * @returns {Promise<string>} Backup file path
     */
    async createBackup(filePath, backupDir) {
        const fileName = path.basename(filePath);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `${fileName}.backup.${timestamp}`;
        const backupPath = path.join(backupDir, backupFileName);
        
        await fs.copyFile(filePath, backupPath);
        return backupPath;
    }

    /**
     * Get project structure
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Project structure
     */
    async getProjectStructure(projectPath) {
        const structure = {
            root: projectPath,
            files: [],
            directories: [],
            totalFiles: 0,
            totalSize: 0
        };

        try {
            const allFiles = await this.getAllFiles(projectPath);
            structure.files = allFiles;
            structure.totalFiles = allFiles.length;
            structure.totalSize = allFiles.reduce((sum, file) => sum + file.size, 0);
        } catch (error) {
            this.logger.error('FileUtils: Failed to get project structure', {
                error: error.message
            });
        }

        return structure;
    }

    /**
     * Get dependency information from package.json
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Dependency information
     */
    async getDependencyInfo(projectPath) {
        try {
            const packageJsonPath = path.join(projectPath, 'package.json');
            if (await this.exists(packageJsonPath)) {
                const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
                return {
                    dependencies: packageJson.dependencies || {},
                    devDependencies: packageJson.devDependencies || {},
                    scripts: packageJson.scripts || {}
                };
            }
        } catch (error) {
            this.logger.error('FileUtils: Failed to get dependency info', {
                error: error.message
            });
        }

        return {};
    }

    /**
     * Get configuration files
     * @param {string} projectPath - Project path
     * @returns {Promise<Array>} Array of configuration files
     */
    async getConfigurationFiles(projectPath) {
        const configFiles = [];

        for (const pattern of EXECUTION_CONSTANTS.CONFIG_PATTERNS) {
            const files = await this.findFilesByPattern(pattern, projectPath);
            configFiles.push(...files);
        }

        return configFiles;
    }

    /**
     * Get Git information
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Git information
     */
    async getGitInfo(projectPath) {
        try {
            const status = execSync('git status --porcelain', { cwd: projectPath, encoding: 'utf8' });
            const branch = execSync('git branch --show-current', { cwd: projectPath, encoding: 'utf8' });
            const lastCommit = execSync('git log -1 --oneline', { cwd: projectPath, encoding: 'utf8' });
            
            return {
                hasChanges: status.length > 0,
                currentBranch: branch.trim(),
                lastCommit: lastCommit.trim()
            };
        } catch (error) {
            return {
                isGitRepo: false,
                error: error.message
            };
        }
    }

    /**
     * Calculate project metrics
     * @param {Array} files - Array of files
     * @returns {Object} Project metrics
     */
    calculateProjectMetrics(files) {
        const metrics = {
            totalFiles: files.length,
            totalSize: files.reduce((sum, file) => sum + file.size, 0),
            averageFileSize: 0,
            largestFiles: [],
            fileTypes: {}
        };

        if (files.length > 0) {
            metrics.averageFileSize = metrics.totalSize / files.length;
            metrics.largestFiles = files
                .sort((a, b) => b.size - a.size)
                .slice(0, 10);

            // Count file types
            for (const file of files) {
                const ext = path.extname(file.path).toLowerCase();
                metrics.fileTypes[ext] = (metrics.fileTypes[ext] || 0) + 1;
            }
        }

        return metrics;
    }

    /**
     * Check if file is a code file
     * @param {string} filePath - File path
     * @returns {boolean} True if code file
     */
    isCodeFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return EXECUTION_CONSTANTS.CODE_EXTENSIONS.includes(ext);
    }
}

module.exports = FileUtils; 