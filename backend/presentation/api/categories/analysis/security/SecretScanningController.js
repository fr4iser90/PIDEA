/**
 * SecretScanningController - Presentation Layer
 * Secret scanning API
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Secret scanning API endpoints
 */

const express = require('express');
const Logger = require('@logging/Logger');
const { SecretScanningService } = require('@application/services/categories/analysis/security');

class SecretScanningController {
  constructor() {
    this.logger = new Logger('SecretScanningController');
    this.secretService = new SecretScanningService();
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    this.router.post('/analyze', this.analyze.bind(this));
    this.router.get('/config', this.getConfiguration.bind(this));
    this.router.get('/status', this.getStatus.bind(this));
  }

  async analyze(req, res) {
    try {
      this.logger.info('Secret scanning request received', { 
        projectId: req.body.projectId,
        userId: req.user?.id 
      });

      const { projectId, projectPath, config = {} } = req.body;

      if (!projectId || !projectPath) {
        return res.badRequest('Missing required parameters: projectId and projectPath', {data: null
        });
      }

      const result = await this.secretService.analyze({
        projectId,
        projectPath,
        config
      });

      this.logger.info('Secret scanning completed', { 
        projectId,
        secrets: result.data?.secrets?.length || 0 
      });

      res.success({
        data: {
          projectId: projectId,
          timestamp: new Date().toISOString(),
          scanner: 'secret-scan',
          results: result.data || {},
          metadata: result.metadata || {}
        }
      });
    } catch (error) {
      this.logger.error('Secret scanning failed', { 
        projectId: req.body.projectId, 
        error: error.message 
      });

      res.error('Secret scanning failed', 500, { details: error.message });
    }
  }

  async getConfiguration(req, res) {
    try {
      const config = await this.secretService.getConfiguration();
      
      res.success(config);
    } catch (error) {
      this.logger.error('Failed to get secret scanning configuration', { error: error.message });
      
      res.error('Failed to get configuration', 500, { details: error.message });
    }
  }

  async getStatus(req, res) {
    try {
      const status = await this.secretService.getStatus();
      
      res.success(status);
    } catch (error) {
      this.logger.error('Failed to get secret scanning status', { error: error.message });
      
      res.error('Failed to get status', 500, { details: error.message });
    }
  }

  getRouter() {
    return this.router;
  }
}

module.exports = SecretScanningController; 