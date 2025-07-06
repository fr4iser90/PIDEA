const fs = require('fs').promises;
const path = require('path');
const CONSTANTS = require('./constants');

/**
 * File system service for analysis output operations
 */
class FileSystemService {
    constructor() {
        this.outputBasePath = CONSTANTS.PATHS.OUTPUT_BASE;
        this.analysisPath = path.join(this.outputBasePath, CONSTANTS.PATHS.ANALYSIS);
        this.projectsPath = path.join(this.analysisPath, CONSTANTS.PATHS.PROJECTS);
        this.ensureDirectories();
    }

    /**
     * Ensure required directories exist
     */
    async ensureDirectories() {
        const dirs = [this.outputBasePath, this.analysisPath, this.projectsPath];
        for (const dir of dirs) {
            try {
                await fs.access(dir);
            } catch {
                await fs.mkdir(dir, { recursive: true });
            }
        }
    }

    /**
     * Save analysis result to file
     * @param {string} projectId - Project ID
     * @param {string} analysisType - Analysis type
     * @param {Object} data - Analysis data
     * @returns {Promise<Object>} Save result
     */
    async saveAnalysisResult(projectId, analysisType, data) {
        const projectDir = path.join(this.projectsPath, projectId);
        await fs.mkdir(projectDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${analysisType}-${timestamp}.json`;
        const filepath = path.join(projectDir, filename);

        const result = {
            projectId,
            analysisType,
            timestamp: new Date().toISOString(),
            data
        };

        await fs.writeFile(filepath, JSON.stringify(result, null, 2));
        return { filepath, filename, result };
    }

    /**
     * Get analysis history for a project
     * @param {string} projectId - Project ID
     * @returns {Promise<Array>} Analysis history
     */
    async getAnalysisHistory(projectId) {
        const projectDir = path.join(this.projectsPath, projectId);
        try {
            const files = await fs.readdir(projectDir);
            const analysisFiles = files.filter(f => f.endsWith(CONSTANTS.FILE_EXTENSIONS.JSON) || f.endsWith(CONSTANTS.FILE_EXTENSIONS.MARKDOWN));
            
            const history = [];
            for (const file of analysisFiles) {
                const filepath = path.join(projectDir, file);
                const stats = await fs.stat(filepath);
                
                if (file.endsWith(CONSTANTS.FILE_EXTENSIONS.JSON)) {
                    const content = await fs.readFile(filepath, 'utf8');
                    const data = JSON.parse(content);
                    history.push({
                        type: 'analysis',
                        filename: file,
                        filepath,
                        timestamp: data.timestamp,
                        analysisType: data.analysisType,
                        size: stats.size
                    });
                } else if (file.endsWith(CONSTANTS.FILE_EXTENSIONS.MARKDOWN)) {
                    history.push({
                        type: 'report',
                        filename: file,
                        filepath,
                        timestamp: stats.mtime.toISOString(),
                        size: stats.size
                    });
                }
            }
            
            return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (error) {
            return [];
        }
    }

    /**
     * Get analysis file content
     * @param {string} projectId - Project ID
     * @param {string} filename - Filename
     * @returns {Promise<Object|string>} File content
     */
    async getAnalysisFile(projectId, filename) {
        const filepath = path.join(this.projectsPath, projectId, filename);
        try {
            const content = await fs.readFile(filepath, 'utf8');
            if (filename.endsWith(CONSTANTS.FILE_EXTENSIONS.JSON)) {
                return JSON.parse(content);
            }
            return content;
        } catch (error) {
            throw new Error(`File not found: ${filename}`);
        }
    }

    /**
     * Write file content
     * @param {string} filepath - File path
     * @param {string} content - File content
     * @returns {Promise<void>}
     */
    async writeFile(filepath, content) {
        await fs.writeFile(filepath, content);
    }

    /**
     * Create directory recursively
     * @param {string} dirPath - Directory path
     * @returns {Promise<void>}
     */
    async createDirectory(dirPath) {
        await fs.mkdir(dirPath, { recursive: true });
    }

    /**
     * Get projects path
     * @returns {string} Projects path
     */
    getProjectsPath() {
        return this.projectsPath;
    }
}

module.exports = FileSystemService; 