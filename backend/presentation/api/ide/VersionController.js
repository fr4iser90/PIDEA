/**
 * VersionController - API endpoints for version management
 * Provides REST API for version detection and selector collection
 */

const Logger = require('@logging/Logger');
const logger = new Logger('VersionController');

class VersionController {
  constructor(dependencies = {}) {
    this.versionManagementService = dependencies.versionManagementService;
    this.automationOrchestrator = dependencies.automationOrchestrator;
    this.logger = dependencies.logger || logger;
  }

  /**
   * GET /api/ide/versions - Get all IDE versions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getVersions(req, res) {
    try {
      this.logger.info('GET /api/ide/versions - Getting all IDE versions');

      // Get version information from the management service
      const stats = this.versionManagementService.getStats();
      const history = this.versionManagementService.getWorkflowHistory();

      const response = {
        success: true,
        data: {
          stats,
          history: history.slice(0, 10), // Last 10 workflows
          timestamp: new Date().toISOString()
        }
      };

      res.status(200).json(response);

    } catch (error) {
      this.logger.error('Error getting versions:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to get versions',
        message: error.message
      });
    }
  }

  /**
   * POST /api/ide/versions/detect - Detect IDE version
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async detectVersion(req, res) {
    try {
      const { ideType, port } = req.body;

      // Validate input
      if (!ideType || !port) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters',
          message: 'ideType and port are required'
        });
      }

      this.logger.info(`POST /api/ide/versions/detect - Detecting version for ${ideType} on port ${port}`);

      // Run version detection workflow
      const result = await this.versionManagementService.detectAndUpdateVersion(ideType, port);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            ideType: result.ideType,
            port: result.port,
            version: result.finalVersion,
            isNewVersion: result.isNewVersion,
            steps: result.steps,
            timestamp: result.timestamp
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Version detection failed',
          message: result.error,
          data: {
            ideType: result.ideType,
            port: result.port,
            steps: result.steps
          }
        });
      }

    } catch (error) {
      this.logger.error('Error detecting version:', error.message);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * POST /api/ide/versions/collect-selectors - Collect selectors for version
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async collectSelectors(req, res) {
    try {
      const { ideType, version, port } = req.body;

      // Validate input
      if (!ideType || !version || !port) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters',
          message: 'ideType, version, and port are required'
        });
      }

      this.logger.info(`POST /api/ide/versions/collect-selectors - Collecting selectors for ${ideType} ${version} on port ${port}`);

      // Run selector collection workflow
      const result = await this.versionManagementService.collectSelectorsForNewVersion(ideType, version, port);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            ideType,
            version,
            port,
            selectors: result.selectors,
            testResults: result.testResults,
            message: result.message,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Selector collection failed',
          message: result.error,
          data: {
            ideType,
            version,
            port
          }
        });
      }

    } catch (error) {
      this.logger.error('Error collecting selectors:', error.message);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * GET /api/ide/versions/:version/selectors - Get selectors for version
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSelectorsForVersion(req, res) {
    try {
      const { version } = req.params;
      const { ideType } = req.query;

      // Validate input
      if (!version) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameter',
          message: 'version is required'
        });
      }

      this.logger.info(`GET /api/ide/versions/${version}/selectors - Getting selectors for version ${version}`);

      // Get selectors from the management service
      // This would typically query the IDETypes or database
      const response = {
        success: true,
        data: {
          version,
          ideType: ideType || 'all',
          selectors: {}, // Would be populated from actual data source
          timestamp: new Date().toISOString()
        }
      };

      res.status(200).json(response);

    } catch (error) {
      this.logger.error('Error getting selectors for version:', error.message);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * POST /api/ide/automation/start - Start automatic detection
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async startAutomation(req, res) {
    try {
      const { options } = req.body;

      this.logger.info('POST /api/ide/automation/start - Starting automatic detection');

      const result = await this.automationOrchestrator.startAutomaticDetection(options);

      if (result) {
        res.status(200).json({
          success: true,
          data: {
            message: 'Automatic detection started successfully',
            options: options || {},
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to start automatic detection',
          message: 'Check logs for details'
        });
      }

    } catch (error) {
      this.logger.error('Error starting automation:', error.message);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * POST /api/ide/automation/stop - Stop automatic detection
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async stopAutomation(req, res) {
    try {
      this.logger.info('POST /api/ide/automation/stop - Stopping automatic detection');

      const result = await this.automationOrchestrator.stopAutomaticDetection();

      if (result) {
        res.status(200).json({
          success: true,
          data: {
            message: 'Automatic detection stopped successfully',
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to stop automatic detection',
          message: 'Check logs for details'
        });
      }

    } catch (error) {
      this.logger.error('Error stopping automation:', error.message);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * GET /api/ide/automation/status - Get automation status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAutomationStatus(req, res) {
    try {
      this.logger.info('GET /api/ide/automation/status - Getting automation status');

      const stats = this.automationOrchestrator.getStats();
      const tasks = this.automationOrchestrator.getScheduledTasksStatus();

      res.status(200).json({
        success: true,
        data: {
          stats,
          tasks,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      this.logger.error('Error getting automation status:', error.message);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * GET /api/ide/health - Health check endpoint
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async healthCheck(req, res) {
    try {
      const health = {
        status: 'healthy',
        services: {
          versionManagement: !!this.versionManagementService,
          automationOrchestrator: !!this.automationOrchestrator
        },
        timestamp: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        data: health
      });

    } catch (error) {
      this.logger.error('Error in health check:', error.message);
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        message: error.message
      });
    }
  }
}

module.exports = VersionController;
