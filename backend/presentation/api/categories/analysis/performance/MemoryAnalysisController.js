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
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: projectId and projectPath',
          data: null
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

      res.json({
        success: true,
        data: {
          projectId: projectId,
          timestamp: new Date().toISOString(),
          scanner: 'memory',
          results: result.data || {},
          metadata: result.metadata || {}
        },
        error: null
      });
    } catch (error) {
      this.logger.error('Memory analysis failed', { 
        projectId: req.body.projectId, 
        error: error.message 
      });

      res.status(500).json({
        success: false,
        data: null,
        error: {
          message: 'Memory analysis failed',
          details: error.message
        }
      });
    }
  }

  async getConfiguration(req, res) {
    try {
      const config = await this.memoryService.getConfiguration();
      
      res.json({
        success: true,
        data: config,
        error: null
      });
    } catch (error) {
      this.logger.error('Failed to get memory configuration', { error: error.message });
      
      res.status(500).json({
        success: false,
        data: null,
        error: {
          message: 'Failed to get configuration',
          details: error.message
        }
      });
    }
  }

  async getStatus(req, res) {
    try {
      const status = await this.memoryService.getStatus();
      
      res.json({
        success: true,
        data: status,
        error: null
      });
    } catch (error) {
      this.logger.error('Failed to get memory status', { error: error.message });
      
      res.status(500).json({
        success: false,
        data: null,
        error: {
          message: 'Failed to get status',
          details: error.message
        }
      });
    }
  }

  getRouter() {
    return this.router;
  }
}

module.exports = MemoryAnalysisController; 