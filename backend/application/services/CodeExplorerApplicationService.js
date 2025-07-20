const BrowserManager = require('@external/BrowserManager');
const Logger = require('@logging/Logger');

class CodeExplorerApplicationService {
    constructor(dependencies = {}) {
        this.browserManager = dependencies.browserManager || new BrowserManager(dependencies);
        this.logger = dependencies.logger || new Logger('CodeExplorerApplicationService');
        this.eventBus = dependencies.eventBus;
    }

    async exploreCodeStructure(projectPath, userId) {
        try {
            this.logger.info('CodeExplorerApplicationService: Exploring code structure', { projectPath, userId });
            
            const structure = await this.browserManager.exploreCodeStructure(projectPath);
            return {
                success: true,
                data: structure
            };
        } catch (error) {
            this.logger.error('Error exploring code structure:', error);
            throw error;
        }
    }

    async analyzeFile(filePath, userId) {
        try {
            this.logger.info('CodeExplorerApplicationService: Analyzing file', { filePath, userId });
            
            const analysis = await this.browserManager.analyzeFile(filePath);
            return {
                success: true,
                data: analysis
            };
        } catch (error) {
            this.logger.error('Error analyzing file:', error);
            throw error;
        }
    }

    async searchCode(projectPath, query, filters, userId) {
        try {
            this.logger.info('CodeExplorerApplicationService: Searching code', { projectPath, query, userId });
            
            const results = await this.browserManager.searchCode(projectPath, query, filters);
            return {
                success: true,
                data: results
            };
        } catch (error) {
            this.logger.error('Error searching code:', error);
            throw error;
        }
    }

    async getDependencyGraph(projectPath, userId) {
        try {
            this.logger.info('CodeExplorerApplicationService: Getting dependency graph', { projectPath, userId });
            
            const graph = await this.browserManager.getDependencyGraph(projectPath);
            return {
                success: true,
                data: graph
            };
        } catch (error) {
            this.logger.error('Error getting dependency graph:', error);
            throw error;
        }
    }

    async getFileMetrics(filePath, userId) {
        try {
            this.logger.info('CodeExplorerApplicationService: Getting file metrics', { filePath, userId });
            
            const metrics = await this.browserManager.getFileMetrics(filePath);
            return {
                success: true,
                data: metrics
            };
        } catch (error) {
            this.logger.error('Error getting file metrics:', error);
            throw error;
        }
    }

    async getFileTree(userId) {
        try {
            this.logger.info('CodeExplorerApplicationService: Getting file tree', { userId });
            
            const files = await this.browserManager.getFileExplorerTree();
            return {
                success: true,
                data: files
            };
        } catch (error) {
            this.logger.error('Error getting file tree:', error);
            throw error;
        }
    }

    async getFileContent(path, userId) {
        try {
            this.logger.info('CodeExplorerApplicationService: Getting file content', { path, userId });
            
            // First open the file in IDE
            const opened = await this.browserManager.openFile(path);
            if (!opened) {
                throw new Error('File not found or could not be opened');
            }

            // Then get the content
            const content = await this.browserManager.getCurrentFileContent();
            
            return {
                success: true,
                data: {
                    path,
                    content,
                    opened
                }
            };
        } catch (error) {
            this.logger.error('Error getting file content:', error);
            throw error;
        }
    }

    async getCurrentFileInfo(userId) {
        try {
            this.logger.info('CodeExplorerApplicationService: Getting current file info', { userId });
            
            const fileInfo = await this.browserManager.getCurrentFileInfo();
            return {
                success: true,
                data: fileInfo
            };
        } catch (error) {
            this.logger.error('Error getting current file info:', error);
            throw error;
        }
    }

    async refreshExplorer(userId) {
        try {
            this.logger.info('CodeExplorerApplicationService: Refreshing explorer', { userId });
            
            const refreshed = await this.browserManager.refreshExplorer();
            return {
                success: true,
                data: { refreshed }
            };
        } catch (error) {
            this.logger.error('Error refreshing explorer:', error);
            throw error;
        }
    }
}

module.exports = CodeExplorerApplicationService; 