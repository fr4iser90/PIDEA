/**
 * MemoryAnalysisController - Presentation Layer
 * Memory analysis API
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Memory analysis API endpoints
 */

const express = require('express');
const Logger = require('@logging/Logger');
const { MemoryAnalysisService } = require('@application/services/categories/analysis/performance');

class MemoryAnalysisController {
  constructor() {
    this.logger = new Logger('MemoryAnalysisController');
    this.memoryService = new MemoryAnalysisService();
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
      this.logger.info('Memory analysis request received', { 
        projectId: req.body.projectId,
        userId: req.user?.id 
      });

      const { projectId, projectPath, config = {} } = req.body;

      if (!projectId || !projectPath) {
        return res.badRequest('Missing required parameters: projectId and projectPath', {data: null
        });
      }

      const result = await this.memoryService.analyze({
        projectId,
        projectPath,
        config
      });

      this.logger.info('Memory analysis completed', { 
        projectId,
        samples: result.data?.samples?.length || 0 
      });

      res.success({
        data: {
          projectId: projectId,
          timestamp: new Date().toISOString(),
          scanner: 'memory',
          results: result.data || {},
          metadata: result.metadata || {}
        }
      });
    } catch (error) {
      this.logger.error('Memory analysis failed', { 
        projectId: req.body.projectId, 
        error: error.message 
      });

      res.error('Memory analysis failed', 500, { details: error.message });
    }
  }

  async getConfiguration(req, res) {
    try {
      const config = await this.memoryService.getConfiguration();
      
      res.success(config);
    } catch (error) {
      this.logger.error('Failed to get memory configuration', { error: error.message });
      
      res.error('Failed to get configuration', 500, { details: error.message });
    }
  }

  async getStatus(req, res) {
    try {
      const status = await this.memoryService.getStatus();
      
      res.success(status);
    } catch (error) {
      this.logger.error('Failed to get memory status', { error: error.message });
      
      res.error('Failed to get status', 500, { details: error.message });
    }
  }

  getRouter() {
    return this.router;
  }
}

module.exports = MemoryAnalysisController; 