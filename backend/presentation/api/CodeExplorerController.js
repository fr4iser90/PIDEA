const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('CodeExplorerController');


class CodeExplorerController {
  constructor(dependencies = {}) {
    this.codeExplorerApplicationService = dependencies.codeExplorerApplicationService;
    if (!this.codeExplorerApplicationService) {
      throw new Error('CodeExplorerController requires codeExplorerApplicationService dependency');
    }
  }

  async getFileTree(req, res) {
    try {
      logger.info('Getting file tree...');
      const userId = req.user?.id;
      
      const result = await this.codeExplorerApplicationService.getFileTree(userId);
      
      res.json({
        success: result.success,
        data: result.data
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
      const userId = req.user?.id;
      logger.info(`Getting file content for: ${path}`);
      
      const result = await this.codeExplorerApplicationService.getFileContent(path, userId);
      
      res.json({
        success: result.success,
        data: result.data
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
      const userId = req.user?.id;
      logger.info('Getting current file info...');
      
      const result = await this.codeExplorerApplicationService.getCurrentFileInfo(userId);
      
      res.json({
        success: result.success,
        data: result.data
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
      const userId = req.user?.id;
      logger.info('Refreshing explorer...');
      
      const result = await this.codeExplorerApplicationService.refreshExplorer(userId);
      
      res.json({
        success: result.success,
        data: result.data
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