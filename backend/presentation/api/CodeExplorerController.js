const BrowserManager = require('@external/BrowserManager');
const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('CodeExplorerController');


class CodeExplorerController {
  constructor() {
    this.browserManager = new BrowserManager();
  }

  async getFileTree(req, res) {
    try {
      logger.info('Getting file tree...');
      
      const files = await this.browserManager.getFileExplorerTree();
      
      res.json({
        success: true,
        data: files
      });
    } catch (error) {
      logger.error('Error getting file tree:', error);
      res.status(500).json({
        success: false,
        error: error?.message || String(error)
      });
    }
  }

  async getFileContent(req, res) {
    try {
      const { path } = req.params;
      logger.info(`Getting file content for: ${path}`);
      
      // First open the file in Cursor IDE
      const opened = await this.browserManager.openFile(path);
      if (!opened) {
        return res.status(404).json({
          success: false,
          error: 'File not found or could not be opened'
        });
      }

      // Then get the content
      const content = await this.browserManager.getCurrentFileContent();
      
      res.json({
        success: true,
        data: {
          path,
          content,
          opened
        }
      });
    } catch (error) {
      logger.error('Error getting file content:', error);
      res.status(500).json({
        success: false,
        error: error?.message || String(error)
      });
    }
  }

  async getCurrentFileInfo(req, res) {
    try {
      logger.info('Getting current file info...');
      
      const fileInfo = await this.browserManager.getCurrentFileInfo();
      
      res.json({
        success: true,
        data: fileInfo
      });
    } catch (error) {
      logger.error('Error getting current file info:', error);
      res.status(500).json({
        success: false,
        error: error?.message || String(error)
      });
    }
  }

  async refreshExplorer(req, res) {
    try {
      logger.info('Refreshing explorer...');
      
      const refreshed = await this.browserManager.refreshExplorer();
      
      res.json({
        success: true,
        data: { refreshed }
      });
    } catch (error) {
      logger.error('Error refreshing explorer:', error);
      res.status(500).json({
        success: false,
        error: error?.message || String(error)
      });
    }
  }
}

module.exports = CodeExplorerController; 