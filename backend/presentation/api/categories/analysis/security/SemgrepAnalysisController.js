/**
 * SemgrepAnalysisController - Presentation Layer
 * Semgrep static analysis API
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Semgrep-specific static analysis API endpoints
 */

const express = require('express');
const Logger = require('@logging/Logger');
const { SemgrepAnalysisService } = require('@application/services/categories/analysis/security');

class SemgrepAnalysisController {
  constructor() {
    this.logger = new Logger('SemgrepAnalysisController');
    this.semgrepService = new SemgrepAnalysisService();
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
      this.logger.info('Semgrep analysis request received', { 
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

      const result = await this.semgrepService.analyze({
        projectId,
        projectPath,
        config
      });

      this.logger.info('Semgrep analysis completed', { 
        projectId,
        findings: result.data?.results?.length || 0 
      });

      res.json({
        success: true,
        data: {
          projectId: projectId,
          timestamp: new Date().toISOString(),
          scanner: 'semgrep',
          results: result.data || {},
          metadata: result.metadata || {}
        },
        error: null
      });
    } catch (error) {
      this.logger.error('Semgrep analysis failed', { 
        projectId: req.body.projectId, 
        error: error.message 
      });

      res.status(500).json({
        success: false,
        data: null,
        error: {
          message: 'Semgrep analysis failed',
          details: error.message
        }
      });
    }
  }

  async getConfiguration(req, res) {
    try {
      const config = await this.semgrepService.getConfiguration();
      
      res.json({
        success: true,
        data: config,
        error: null
      });
    } catch (error) {
      this.logger.error('Failed to get Semgrep configuration', { error: error.message });
      
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
      const status = await this.semgrepService.getStatus();
      
      res.json({
        success: true,
        data: status,
        error: null
      });
    } catch (error) {
      this.logger.error('Failed to get Semgrep status', { error: error.message });
      
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

module.exports = SemgrepAnalysisController; 