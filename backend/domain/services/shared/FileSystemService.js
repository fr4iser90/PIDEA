/**
 * FileSystemService - Domain service for file system operations
 * Provides abstraction for file system operations used by handlers
 */
const fs = require('fs').promises;
const path = require('path');

class FileSystemService {
    constructor() {
        this.handlerId = this.generateHandlerId();
    }

    generateHandlerId() {
        return `filesystem_service_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async exists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }

    async isDirectory(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.isDirectory();
        } catch (error) {
            return false;
        }
    }

    async isFile(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.isFile();
        } catch (error) {
            return false;
        }
    }

    async getStats(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return {
                size: stats.size,
                mtime: stats.mtime,
                isDirectory: stats.isDirectory(),
                isFile: stats.isFile(),
                mode: stats.mode
            };
        } catch (error) {
            throw new Error(`Failed to get stats for ${filePath}: ${error.message}`);
        }
    }

    async readDirectory(dirPath) {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            return entries.map(entry => ({
                name: entry.name,
                isDirectory: entry.isDirectory(),
                isFile: entry.isFile(),
                path: path.join(dirPath, entry.name)
            }));
        } catch (error) {
            throw new Error(`Failed to read directory ${dirPath}: ${error.message}`);
        }
    }

    async readFile(filePath, encoding = 'utf-8') {
        try {
            return await fs.readFile(filePath, encoding);
        } catch (error) {
            throw new Error(`Failed to read file ${filePath}: ${error.message}`);
        }
    }

    async writeFile(filePath, content, encoding = 'utf-8') {
        try {
            await fs.writeFile(filePath, content, encoding);
        } catch (error) {
            throw new Error(`Failed to write file ${filePath}: ${error.message}`);
        }
    }

    async createDirectory(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
            throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
        }
    }

    async deleteFile(filePath) {
        try {
            await fs.unlink(filePath);
        } catch (error) {
            throw new Error(`Failed to delete file ${filePath}: ${error.message}`);
        }
    }

    async deleteDirectory(dirPath) {
        try {
            await fs.rmdir(dirPath, { recursive: true });
        } catch (error) {
            throw new Error(`Failed to delete directory ${dirPath}: ${error.message}`);
        }
    }

    async copyFile(sourcePath, destPath) {
        try {
            await fs.copyFile(sourcePath, destPath);
        } catch (error) {
            throw new Error(`Failed to copy file from ${sourcePath} to ${destPath}: ${error.message}`);
        }
    }

    async moveFile(sourcePath, destPath) {
        try {
            await fs.rename(sourcePath, destPath);
        } catch (error) {
            throw new Error(`Failed to move file from ${sourcePath} to ${destPath}: ${error.message}`);
        }
    }

    async getFileSize(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.size;
        } catch (error) {
            throw new Error(`Failed to get file size for ${filePath}: ${error.message}`);
        }
    }

    async getDirectorySize(dirPath) {
        try {
            let totalSize = 0;
            const entries = await this.readDirectory(dirPath);
            
            for (const entry of entries) {
                if (entry.isFile === true) {
                    totalSize += await this.getFileSize(entry.path);
                } else if (entry.isDirectory === true) {
                    totalSize += await this.getDirectorySize(entry.path);
                }
            }
            
            return totalSize;
        } catch (error) {
            throw new Error(`Failed to get directory size for ${dirPath}: ${error.message}`);
        }
    }

    async findFiles(dirPath, pattern = null) {
        try {
            const files = [];
            const entries = await this.readDirectory(dirPath);
            
            for (const entry of entries) {
                if (entry.isFile === true) {
                    if (!pattern || entry.name.match(pattern)) {
                        files.push(entry.path);
                    }
                } else if (entry.isDirectory === true) {
                    const subFiles = await this.findFiles(entry.path, pattern);
                    files.push(...subFiles);
                }
            }
            
            return files;
        } catch (error) {
            throw new Error(`Failed to find files in ${dirPath}: ${error.message}`);
        }
    }

    async ensureDirectoryExists(dirPath) {
        try {
            await this.createDirectory(dirPath);
        } catch (error) {
            // Directory might already exist, which is fine
            if (!(await this.exists(dirPath))) {
                throw error;
            }
        }
    }

    async getRelativePath(basePath, targetPath) {
        try {
            return path.relative(basePath, targetPath);
        } catch (error) {
            throw new Error(`Failed to get relative path from ${basePath} to ${targetPath}: ${error.message}`);
        }
    }

    async getAbsolutePath(relativePath, basePath = process.cwd()) {
        try {
            return path.resolve(basePath, relativePath);
        } catch (error) {
            throw new Error(`Failed to get absolute path for ${relativePath}: ${error.message}`);
        }
    }

    async isReadable(filePath) {
        try {
            await fs.access(filePath, fs.constants.R_OK);
            return true;
        } catch (error) {
            return false;
        }
    }

    async validatePath(filePath) {
        try {
            const exists = await this.exists(filePath);
            if (!exists) {
                throw new Error(`Path does not exist: ${filePath}`);
            }
            return true;
        } catch (error) {
            throw new Error(`Path validation failed for ${filePath}: ${error.message}`);
        }
    }

    getMetadata() {
        return {
            handlerId: this.handlerId,
            type: 'FileSystemService',
            version: (() => {
              const VersionService = require('../version/VersionService');
              return new VersionService().getVersion();
            })(),
            capabilities: [
                'file_operations',
                'directory_operations',
                'file_reading',
                'file_writing',
                'path_validation',
                'file_searching'
            ]
        };
    }
}

module.exports = FileSystemService; 