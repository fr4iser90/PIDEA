/**
 * IDE Configuration Controller
 * API endpoints for IDE configuration management
 * Created: 2025-09-29T19:51:09.000Z
 */

const Logger = require('@logging/Logger');

const logger = new Logger('IDERequirementController');

class IDEConfigurationController {
  constructor() {
    // No service needed - just static data
  }

  /**
   * Get download links for IDE types
   * @param {Object} req Request object
   * @param {Object} res Response object
   */
  async getDownloadLinks(req, res) {
    try {
      const downloadLinks = {
        cursor: {
          name: 'Cursor',
          url: 'https://cursor.sh/',
          description: 'AI-powered code editor',
          downloadUrl: 'https://cursor.sh/download'
        },
        vscode: {
          name: 'Visual Studio Code',
          url: 'https://code.visualstudio.com/',
          description: 'Free source-code editor',
          downloadUrl: 'https://code.visualstudio.com/download'
        },
        windsurf: {
          name: 'Windsurf',
          url: 'https://windsurf.ai/',
          description: 'AI-powered development environment',
          downloadUrl: 'https://windsurf.ai/download'
        }
      };
      
      res.json({
        success: true,
        data: downloadLinks
      });
    } catch (error) {
      logger.error('Error getting download links:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get executable paths for IDE types (cross-platform)
   * @param {Object} req Request object
   * @param {Object} res Response object
   */
  async getExecutablePaths(req, res) {
    try {
      const userId = req.user?.id || 'me';
      
      // TODO: Load from database when implemented
      // For now, return empty object
      const executablePaths = {};
      
      res.json({
        success: true,
        data: executablePaths
      });
    } catch (error) {
      logger.error('Error getting executable paths:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Save executable paths for IDE types (cross-platform)
   * @param {Object} req Request object
   * @param {Object} res Response object
   */
  async saveExecutablePaths(req, res) {
    try {
      const userId = req.user?.id || 'me';
      const { ideType, executablePath } = req.body;
      
      if (!ideType || !executablePath) {
        return res.status(400).json({
          success: false,
          error: 'IDE type and executable path are required'
        });
      }

      // TODO: Save to database when implemented
      // For now, just return success
      
      res.json({
        success: true,
        message: 'Executable path saved successfully'
      });
    } catch (error) {
      logger.error('Error saving executable paths:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Validate executable path (cross-platform)
   * @param {Object} req Request object
   * @param {Object} res Response object
   */
  async validatePath(req, res) {
    try {
      const { executablePath } = req.body;
      
      if (!executablePath) {
        return res.status(400).json({
          success: false,
          error: 'Executable path is required'
        });
      }

      // Cross-platform validation
      const fs = require('fs');
      const path = require('path');
      
      let isValid = false;
      let error = null;
      
      try {
        // Check if file exists
        if (fs.existsSync(executablePath)) {
          const stats = fs.statSync(executablePath);
          isValid = stats.isFile();
          if (!isValid) {
            error = 'Path exists but is not a file';
          }
        } else {
          error = 'File does not exist';
        }
      } catch (err) {
        isValid = false;
        error = err.message;
      }
      
      res.json({
        success: true,
        data: {
          isValid,
          error,
          path: executablePath
        }
      });
    } catch (error) {
      logger.error('Error validating executable path:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = IDEConfigurationController;
