/**
 * FileSystemService - Comprehensive file system operations
 */
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class FileSystemService {
    constructor() {
        this.supportedExtensions = {
            javascript: ['.js', '.jsx', '.ts', '.tsx', '.mjs'],
            python: ['.py', '.pyc', '.pyo'],
            java: ['.java', '.class'],
            csharp: ['.cs', '.csproj'],
            php: ['.php'],
            ruby: ['.rb'],
            go: ['.go'],
            rust: ['.rs'],
            cpp: ['.cpp', '.cc', '.cxx', '.h', '.hpp'],
            c: ['.c', '.h'],
            html: ['.html', '.htm', '.xhtml'],
            css: ['.css', '.scss', '.sass', '.less'],
            json: ['.json'],
            yaml: ['.yml', '.yaml'],
            xml: ['.xml'],
            markdown: ['.md', '.markdown'],
            config: ['.config', '.conf', '.ini', '.env']
        };
    }

    /**
     * Get file statistics
     * @param {string} filePath - File path
     * @returns {Promise<Object>} File statistics
     */
    async getFileStats(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return {
                exists: true,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory(),
                size: stats.size,
                sizeKB: Math.round(stats.size / 1024),
                sizeMB: Math.round(stats.size / (1024 * 1024) * 100) / 100,
                created: stats.birthtime,
                modified: stats.mtime,
                accessed: stats.atime,
                permissions: stats.mode.toString(8)
            };
        } catch (error) {
            return {
                exists: false,
                error: error.message
            };
        }
    }

    /**
     * Read file content
     * @param {string} filePath - File path
     * @param {Object} options - Read options
     * @returns {Promise<string>} File content
     */
    async readFile(filePath, options = {}) {
        try {
            const encoding = options.encoding || 'utf8';
            const content = await fs.readFile(filePath, encoding);
            return content;
        } catch (error) {
            throw new Error(`Failed to read file ${filePath}: ${error.message}`);
        }
    }

    /**
     * Write file content
     * @param {string} filePath - File path
     * @param {string} content - File content
     * @param {Object} options - Write options
     * @returns {Promise<void>}
     */
    async writeFile(filePath, content, options = {}) {
        try {
            const encoding = options.encoding || 'utf8';
            await fs.writeFile(filePath, content, encoding);
        } catch (error) {
            throw new Error(`Failed to write file ${filePath}: ${error.message}`);
        }
    }

    /**
     * Create directory
     * @param {string} dirPath - Directory path
     * @param {Object} options - Create options
     * @returns {Promise<void>}
     */
    async createDirectory(dirPath, options = {}) {
        try {
            const recursive = options.recursive !== false;
            await fs.mkdir(dirPath, { recursive });
        } catch (error) {
            throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
        }
    }

    /**
     * Delete file or directory
     * @param {string} path - File or directory path
     * @param {Object} options - Delete options
     * @returns {Promise<void>}
     */
    async delete(path, options = {}) {
        try {
            const recursive = options.recursive !== false;
            const force = options.force || false;

            const stats = await fs.stat(path);
            if (stats.isDirectory()) {
                if (recursive) {
                    await fs.rmdir(path, { recursive: true });
                } else {
                    await fs.rmdir(path);
                }
            } else {
                await fs.unlink(path);
            }
        } catch (error) {
            if (!options.force) {
                throw new Error(`Failed to delete ${path}: ${error.message}`);
            }
        }
    }

    /**
     * Copy file or directory
     * @param {string} source - Source path
     * @param {string} destination - Destination path
     * @param {Object} options - Copy options
     * @returns {Promise<void>}
     */
    async copy(source, destination, options = {}) {
        try {
            const recursive = options.recursive !== false;
            await fs.cp(source, destination, { recursive });
        } catch (error) {
            throw new Error(`Failed to copy ${source} to ${destination}: ${error.message}`);
        }
    }

    /**
     * Move file or directory
     * @param {string} source - Source path
     * @param {string} destination - Destination path
     * @returns {Promise<void>}
     */
    async move(source, destination) {
        try {
            await fs.rename(source, destination);
        } catch (error) {
            throw new Error(`Failed to move ${source} to ${destination}: ${error.message}`);
        }
    }

    /**
     * List directory contents
     * @param {string} dirPath - Directory path
     * @param {Object} options - List options
     * @returns {Promise<Array>} Directory contents
     */
    async listDirectory(dirPath, options = {}) {
        try {
            const items = await fs.readdir(dirPath);
            const result = [];

            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const stats = await fs.stat(itemPath);
                
                const itemInfo = {
                    name: item,
                    path: itemPath,
                    isFile: stats.isFile(),
                    isDirectory: stats.isDirectory(),
                    size: stats.size,
                    sizeKB: Math.round(stats.size / 1024),
                    modified: stats.mtime,
                    permissions: stats.mode.toString(8)
                };

                if (options.includeHidden !== true && item.startsWith('.')) {
                    continue;
                }

                if (options.filter) {
                    if (typeof options.filter === 'function') {
                        if (!options.filter(itemInfo)) continue;
                    } else if (typeof options.filter === 'string') {
                        if (!item.includes(options.filter)) continue;
                    }
                }

                result.push(itemInfo);
            }

            return result;
        } catch (error) {
            throw new Error(`Failed to list directory ${dirPath}: ${error.message}`);
        }
    }

    /**
     * Find files by pattern
     * @param {string} rootPath - Root directory path
     * @param {Object} options - Find options
     * @returns {Promise<Array>} Found files
     */
    async findFiles(rootPath, options = {}) {
        const files = [];
        const maxDepth = options.maxDepth || 10;
        const extensions = options.extensions || [];
        const excludePatterns = options.exclude || [];
        const includePatterns = options.include || [];

        const traverse = async (dirPath, depth = 0) => {
            if (depth > maxDepth) return;

            try {
                const items = await fs.readdir(dirPath);
                
                for (const item of items) {
                    const itemPath = path.join(dirPath, item);
                    
                    // Skip hidden files unless explicitly included
                    if (!options.includeHidden && item.startsWith('.')) {
                        continue;
                    }

                    // Check exclude patterns
                    if (excludePatterns.some(pattern => 
                        typeof pattern === 'string' ? itemPath.includes(pattern) : pattern.test(itemPath)
                    )) {
                        continue;
                    }

                    const stats = await fs.stat(itemPath);
                    
                    if (stats.isDirectory()) {
                        await traverse(itemPath, depth + 1);
                    } else if (stats.isFile()) {
                        // Check include patterns
                        if (includePatterns.length > 0 && !includePatterns.some(pattern => 
                            typeof pattern === 'string' ? itemPath.includes(pattern) : pattern.test(itemPath)
                        )) {
                            continue;
                        }

                        // Check extensions
                        if (extensions.length > 0) {
                            const ext = path.extname(itemPath).toLowerCase();
                            if (!extensions.includes(ext)) {
                                continue;
                            }
                        }

                        files.push({
                            path: itemPath,
                            name: item,
                            size: stats.size,
                            sizeKB: Math.round(stats.size / 1024),
                            modified: stats.mtime,
                            extension: path.extname(itemPath)
                        });
                    }
                }
            } catch (error) {
                // Skip directories that can't be accessed
            }
        };

        await traverse(rootPath);
        return files;
    }

    /**
     * Get project structure
     * @param {string} projectPath - Project directory path
     * @param {Object} options - Structure options
     * @returns {Promise<Object>} Project structure
     */
    async getProjectStructure(projectPath, options = {}) {
        const structure = {
            root: projectPath,
            files: [],
            directories: [],
            totalFiles: 0,
            totalSize: 0,
            fileTypes: {},
            largestFiles: [],
            recentFiles: []
        };

        try {
            const allFiles = await this.findFiles(projectPath, {
                maxDepth: options.maxDepth || 5,
                includeHidden: options.includeHidden || false
            });

            structure.totalFiles = allFiles.length;
            structure.files = allFiles;

            // Calculate total size and categorize by type
            for (const file of allFiles) {
                structure.totalSize += file.size;
                
                const ext = file.extension.toLowerCase();
                if (!structure.fileTypes[ext]) {
                    structure.fileTypes[ext] = { count: 0, totalSize: 0 };
                }
                structure.fileTypes[ext].count++;
                structure.fileTypes[ext].totalSize += file.size;
            }

            // Get largest files
            structure.largestFiles = allFiles
                .sort((a, b) => b.size - a.size)
                .slice(0, options.maxLargestFiles || 10);

            // Get recent files
            structure.recentFiles = allFiles
                .sort((a, b) => new Date(b.modified) - new Date(a.modified))
                .slice(0, options.maxRecentFiles || 10);

            // Get directories
            const directories = await this.findDirectories(projectPath, {
                maxDepth: options.maxDepth || 5
            });
            structure.directories = directories;

        } catch (error) {
            throw new Error(`Failed to get project structure: ${error.message}`);
        }

        return structure;
    }

    /**
     * Find directories
     * @param {string} rootPath - Root directory path
     * @param {Object} options - Find options
     * @returns {Promise<Array>} Found directories
     */
    async findDirectories(rootPath, options = {}) {
        const directories = [];
        const maxDepth = options.maxDepth || 10;

        const traverse = async (dirPath, depth = 0) => {
            if (depth > maxDepth) return;

            try {
                const items = await fs.readdir(dirPath);
                
                for (const item of items) {
                    const itemPath = path.join(dirPath, item);
                    
                    if (!options.includeHidden && item.startsWith('.')) {
                        continue;
                    }

                    const stats = await fs.stat(itemPath);
                    
                    if (stats.isDirectory()) {
                        directories.push({
                            path: itemPath,
                            name: item,
                            depth: depth,
                            modified: stats.mtime
                        });
                        await traverse(itemPath, depth + 1);
                    }
                }
            } catch (error) {
                // Skip directories that can't be accessed
            }
        };

        await traverse(rootPath);
        return directories;
    }

    /**
     * Check if path exists
     * @param {string} path - Path to check
     * @returns {Promise<boolean>} Exists status
     */
    async exists(path) {
        try {
            await fs.access(path);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get file extension
     * @param {string} filePath - File path
     * @returns {string} File extension
     */
    getFileExtension(filePath) {
        return path.extname(filePath).toLowerCase();
    }

    /**
     * Get file language based on extension
     * @param {string} filePath - File path
     * @returns {string} Language name
     */
    getFileLanguage(filePath) {
        const ext = this.getFileExtension(filePath);
        
        for (const [language, extensions] of Object.entries(this.supportedExtensions)) {
            if (extensions.includes(ext)) {
                return language;
            }
        }
        
        return 'unknown';
    }

    /**
     * Check if file is code file
     * @param {string} filePath - File path
     * @returns {boolean} Is code file
     */
    isCodeFile(filePath) {
        const language = this.getFileLanguage(filePath);
        return language !== 'unknown' && language !== 'config' && language !== 'markdown';
    }

    /**
     * Get file size in human readable format
     * @param {number} bytes - Size in bytes
     * @returns {string} Human readable size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Create backup of file
     * @param {string} filePath - File path
     * @param {string} backupDir - Backup directory
     * @returns {Promise<string>} Backup file path
     */
    async createBackup(filePath, backupDir = null) {
        try {
            if (!backupDir) {
                backupDir = path.dirname(filePath);
            }

            const fileName = path.basename(filePath);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFileName = `${fileName}.backup.${timestamp}`;
            const backupPath = path.join(backupDir, backupFileName);

            await this.copy(filePath, backupPath);
            return backupPath;
        } catch (error) {
            throw new Error(`Failed to create backup: ${error.message}`);
        }
    }

    /**
     * Execute git command
     * @param {string} command - Git command
     * @param {string} cwd - Working directory
     * @returns {Promise<string>} Command output
     */
    async executeGitCommand(command, cwd = process.cwd()) {
        try {
            const output = execSync(`git ${command}`, { 
                cwd, 
                encoding: 'utf8',
                stdio: 'pipe'
            });
            return output.trim();
        } catch (error) {
            throw new Error(`Git command failed: ${error.message}`);
        }
    }

    /**
     * Get git status
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Object>} Git status
     */
    async getGitStatus(projectPath) {
        try {
            const status = await this.executeGitCommand('status --porcelain', projectPath);
            const branches = await this.executeGitCommand('branch --show-current', projectPath);
            const lastCommit = await this.executeGitCommand('log -1 --oneline', projectPath);
            
            return {
                hasChanges: status.length > 0,
                modifiedFiles: status.split('\n').filter(line => line.trim()),
                currentBranch: branches,
                lastCommit: lastCommit
            };
        } catch (error) {
            return {
                isGitRepo: false,
                error: error.message
            };
        }
    }

    /**
     * Get file line count
     * @param {string} filePath - File path
     * @returns {Promise<number>} Line count
     */
    async getLineCount(filePath) {
        try {
            const content = await this.readFile(filePath);
            return content.split('\n').length;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get file word count
     * @param {string} filePath - File path
     * @returns {Promise<number>} Word count
     */
    async getWordCount(filePath) {
        try {
            const content = await this.readFile(filePath);
            return content.split(/\s+/).filter(word => word.length > 0).length;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get file character count
     * @param {string} filePath - File path
     * @returns {Promise<number>} Character count
     */
    async getCharacterCount(filePath) {
        try {
            const content = await this.readFile(filePath);
            return content.length;
        } catch (error) {
            return 0;
        }
    }
}

module.exports = FileSystemService; 