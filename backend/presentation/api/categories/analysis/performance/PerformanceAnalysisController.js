/**
 * PerformanceAnalysisController - Presentation Layer
 * Main performance analysis API endpoints
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Main performance analysis API endpoints for orchestrating performance monitoring
 */

const express = require('express');
const Logger = require('@logging/Logger');
const { PerformanceAnalysisOrchestratorService } = require('@application/services/categories/analysis/performance');

class PerformanceAnalysisController {
  constructor() {
    this.logger = new Logger('PerformanceAnalysisController');
    this.performanceService = new PerformanceAnalysisOrchestratorService();
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    this.router.post('/analyze', this.analyze.bind(this));
    this.router.get('/config', this.getConfiguration.bind(this));
    this.router.get('/status', this.getStatus.bind(this));
    this.router.get('/results/:id', this.getResults.bind(this));
    this.router.delete('/results/:id', this.deleteResults.bind(this));
  }

  async analyze(req, res) {
    try {
      this.logger.info('Performance analysis request received', { 
        projectId: req.body.projectId,
        userId: req.user?.id 
      });

      const { projectId, projectPath, config = {} } = req.body;

      if (!projectId || !projectPath) {
        return res.badRequest('Missing required parameters: projectId and projectPath', {data: null
        });
      }

      const result = await this.performanceService.analyze({
        projectId,
        projectPath,
        config
      });

      this.logger.info('Performance analysis completed', { 
        projectId,
        samples: result.data?.samples?.length || 0 
      });

      res.success({
        data: {
          projectId: projectId,
          timestamp: new Date().toISOString(),
          score: result.data?.score || 0,
          results: result.data?.results || {},
          recommendations: result.data?.recommendations || [],
          summary: result.data?.summary || {}
        }
      });
    } catch (error) {
      this.logger.error('Performance analysis failed', { 
        projectId: req.body.projectId, 
        error: error.message 
      });

      res.error('Performance analysis failed', 500, { details: error.message });
    }
  }

  async getConfiguration(req, res) {
    try {
      const config = await this.performanceService.getConfiguration();
      
      res.success(config);
    } catch (error) {
      this.logger.error('Failed to get performance configuration', { error: error.message });
      
      res.error('Failed to get configuration', 500, { details: error.message });
    }
  }

  async getStatus(req, res) {
    try {
      const status = await this.performanceService.getStatus();
      
      res.success(status);
    } catch (error) {
      this.logger.error('Failed to get performance status', { error: error.message });
      
      res.error('Failed to get status', 500, { details: error.message });
    }
  }

  async getResults(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.badRequest('Missing result ID', {data: null
        });
      }

      const results = await this.performanceService.getResults(id);
      
      if (!results) {
        return res.notFound('Results not found', {data: null
        });
      }

      res.success(results);
    } catch (error) {
      this.logger.error('Failed to get performance results', { 
        id: req.params.id, 
        error: error.message 
      });
      
      res.error('Failed to get results', 500, { details: error.message });
    }
  }

  async deleteResults(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.badRequest('Missing result ID', {data: null
        });
      }

      await this.performanceService.deleteResults(id);
      
      res.success({ message: 'Results deleted successfully' });
    } catch (error) {
      this.logger.error('Failed to delete performance results', { 
        id: req.params.id, 
        error: error.message 
      });
      
      res.error('Failed to delete results', 500, { details: error.message });
    }
  }

  getRouter() {
    return this.router;
  }
}

module.exports = PerformanceAnalysisController; 