/**
 * PatternAnalysisController - Presentation Layer
 * Code pattern analysis API
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Code pattern analysis API endpoints
 */

const express = require('express');
const Logger = require('@logging/Logger');
const { PatternAnalysisService } = require('@application/services/categories/analysis/architecture');

class PatternAnalysisController {
  constructor() {
    this.logger = new Logger('PatternAnalysisController');
    this.patternService = new PatternAnalysisService();
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
      this.logger.info('Pattern analysis request received', { 
        projectId: req.body.projectId,
        userId: req.user?.id 
      });

      const { projectId, projectPath, config = {} } = req.body;

      if (!projectId || !projectPath) {
        return res.badRequest('Missing required parameters: projectId and projectPath');
      }

      const result = await this.patternService.analyze({
        projectId,
        projectPath,
        config
      });

      this.logger.info('Pattern analysis completed', { 
        projectId,
        patterns: result.data?.patterns?.length || 0 
      });

      res.success({
        data: {
          projectId: projectId,
          timestamp: new Date().toISOString(),
          scanner: 'pattern',
          results: result.data || {},
          metadata: result.metadata || {}
        }
      });
    } catch (error) {
      this.logger.error('Pattern analysis failed', { 
        projectId: req.body.projectId, 
        error: error.message 
      });

      res.error('Pattern analysis failed', 500, { details: error.message });
    }
  }

  async getConfiguration(req, res) {
    try {
      const config = await this.patternService.getConfiguration();
      
      res.success(config);
    } catch (error) {
      this.logger.error('Failed to get pattern analysis configuration', { error: error.message });
      
      res.error('Failed to get configuration', 500, { details: error.message });
    }
  }

  async getStatus(req, res) {
    try {
      const status = await this.patternService.getStatus();
      
      res.success(status);
    } catch (error) {
      this.logger.error('Failed to get pattern analysis status', { error: error.message });
      
      res.error('Failed to get status', 500, { details: error.message });
    }
  }

  getRouter() {
    return this.router;
  }
}

module.exports = PatternAnalysisController; 