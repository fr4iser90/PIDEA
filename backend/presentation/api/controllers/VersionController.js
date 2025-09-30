/**
 * VersionController - API controller for version management operations
 * Handles HTTP requests for version management endpoints
 */

const Logger = require('@logging/Logger');
const VersionManagementHandler = require('@application/handlers/categories/version/VersionManagementHandler');
const VersionManagementCommand = require('@application/commands/categories/version/VersionManagementCommand');
const logger = new Logger('VersionController');

class VersionController {
  constructor(dependencies = {}) {
    this.handler = dependencies.handler || new VersionManagementHandler(dependencies);
    this.logger = dependencies.logger || logger;
  }

  /**
   * Bump version endpoint
   * POST /api/versions/bump
   */
  async bumpVersion(req, res) {
    try {
      const { task, projectPath, bumpType, context } = req.body;

      // Validate required fields
      if (!task || !projectPath) {
        return res.status(400).json({
          success: false,
          error: 'Task and projectPath are required',
          timestamp: new Date()
        });
      }

      // Create command
      const command = VersionManagementCommand.bumpVersion({
        task,
        projectPath,
        bumpType,
        context: { ...context, userId: req.user?.id }
      });

      // Execute command
      const result = await this.handler.handle(command);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      this.logger.error('Error in bumpVersion endpoint', {
        error: error.message,
        body: req.body
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  }

  /**
   * Get current version endpoint
   * GET /api/versions/current
   */
  async getCurrentVersion(req, res) {
    try {
      const { projectPath } = req.query;

      if (!projectPath) {
        return res.status(400).json({
          success: false,
          error: 'Project path is required',
          timestamp: new Date()
        });
      }

      // Create command
      const command = VersionManagementCommand.getCurrentVersion({ projectPath });

      // Execute command
      const result = await this.handler.handle(command);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      this.logger.error('Error in getCurrentVersion endpoint', {
        error: error.message,
        query: req.query
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  }

  /**
   * Get version history endpoint
   * GET /api/versions/history
   */
  async getVersionHistory(req, res) {
    try {
      const filters = req.query;

      // Create command
      const command = VersionManagementCommand.getVersionHistory({ filters });

      // Execute command
      const result = await this.handler.handle(command);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      this.logger.error('Error in getVersionHistory endpoint', {
        error: error.message,
        query: req.query
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  }

  /**
   * Validate version endpoint
   * POST /api/versions/validate
   */
  async validateVersion(req, res) {
    try {
      const { version } = req.body;

      if (!version) {
        return res.status(400).json({
          success: false,
          error: 'Version is required',
          timestamp: new Date()
        });
      }

      // Create command
      const command = VersionManagementCommand.validateVersion({ version });

      // Execute command
      const result = await this.handler.handle(command);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      this.logger.error('Error in validateVersion endpoint', {
        error: error.message,
        body: req.body
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  }

  /**
   * Compare versions endpoint
   * POST /api/versions/compare
   */
  async compareVersions(req, res) {
    try {
      const { version1, version2 } = req.body;

      if (!version1 || !version2) {
        return res.status(400).json({
          success: false,
          error: 'Both version1 and version2 are required',
          timestamp: new Date()
        });
      }

      // Create command
      const command = VersionManagementCommand.compareVersions({ version1, version2 });

      // Execute command
      const result = await this.handler.handle(command);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      this.logger.error('Error in compareVersions endpoint', {
        error: error.message,
        body: req.body
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  }

  /**
   * Determine bump type endpoint
   * POST /api/versions/determine-bump-type
   */
  async determineBumpType(req, res) {
    try {
      const { task, projectPath, context } = req.body;

      if (!task || !projectPath) {
        return res.status(400).json({
          success: false,
          error: 'Task and projectPath are required',
          timestamp: new Date()
        });
      }

      // Create command
      const command = VersionManagementCommand.determineBumpType({
        task,
        projectPath,
        context: { ...context, userId: req.user?.id }
      });

      // Execute command
      const result = await this.handler.handle(command);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      this.logger.error('Error in determineBumpType endpoint', {
        error: error.message,
        body: req.body
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  }

  /**
   * Get latest version endpoint
   * GET /api/versions/latest
   */
  async getLatestVersion(req, res) {
    try {
      // Create command
      const command = VersionManagementCommand.getLatestVersion();

      // Execute command
      const result = await this.handler.handle(command);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      this.logger.error('Error in getLatestVersion endpoint', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  }

  /**
   * Update configuration endpoint
   * PUT /api/versions/config
   */
  async updateConfiguration(req, res) {
    try {
      const { config } = req.body;

      if (!config || typeof config !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Config object is required',
          timestamp: new Date()
        });
      }

      // Create command
      const command = VersionManagementCommand.updateConfiguration({ config });

      // Execute command
      const result = await this.handler.handle(command);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      this.logger.error('Error in updateConfiguration endpoint', {
        error: error.message,
        body: req.body
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  }

  /**
   * Get configuration endpoint
   * GET /api/versions/config
   */
  async getConfiguration(req, res) {
    try {
      // Create command
      const command = VersionManagementCommand.getConfiguration();

      // Execute command
      const result = await this.handler.handle(command);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      this.logger.error('Error in getConfiguration endpoint', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  }

  /**
   * Health check endpoint
   * GET /api/versions/health
   */
  async healthCheck(req, res) {
    try {
      res.status(200).json({
        success: true,
        status: 'healthy',
        service: 'version-management',
        timestamp: new Date(),
        version: '1.0.0'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      });
    }
  }
}

module.exports = VersionController;
