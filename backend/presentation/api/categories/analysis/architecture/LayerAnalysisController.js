/**
 * LayerAnalysisController - Presentation Layer
 * Layer organization analysis API
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Layer organization analysis API endpoints
 */

const express = require('express');
const Logger = require('@logging/Logger');
const { LayerAnalysisService } = require('@application/services/categories/analysis/architecture');

class LayerAnalysisController {
  constructor() {
    this.logger = new Logger('LayerAnalysisController');
    this.layerService = new LayerAnalysisService();
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
      this.logger.info('Layer analysis request received', { 
        projectId: req.body.projectId,
        userId: req.user?.id 
      });

      const { projectId, projectPath, config = {} } = req.body;

      if (!projectId || !projectPath) {
        return res.badRequest('Missing required parameters: projectId and projectPath');
      }

      const result = await this.layerService.analyze({
        projectId,
        projectPath,
        config
      });

      this.logger.info('Layer analysis completed', { 
        projectId,
        summary: result.data?.summary || {} 
      });

      res.success({
        data: {
          projectId: projectId,
          timestamp: new Date().toISOString(),
          scanner: 'layer',
          results: result.data || {},
          metadata: result.metadata || {}
        }
      });
    } catch (error) {
      this.logger.error('Layer analysis failed', { 
        projectId: req.body.projectId, 
        error: error.message 
      });

      res.error('Layer analysis failed', 500, { details: error.message });
    }
  }

  async getConfiguration(req, res) {
    try {
      const config = await this.layerService.getConfiguration();
      
      res.success(config);
    } catch (error) {
      this.logger.error('Failed to get layer analysis configuration', { error: error.message });
      
      res.error('Failed to get configuration', 500, { details: error.message });
    }
  }

  async getStatus(req, res) {
    try {
      const status = await this.layerService.getStatus();
      
      res.success(status);
    } catch (error) {
      this.logger.error('Failed to get layer analysis status', { error: error.message });
      
      res.error('Failed to get status', 500, { details: error.message });
    }
  }

  getRouter() {
    return this.router;
  }
}

module.exports = LayerAnalysisController; 