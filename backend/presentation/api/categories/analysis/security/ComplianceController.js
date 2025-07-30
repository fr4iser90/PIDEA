/**
 * ComplianceController - Presentation Layer
 * Compliance analysis API
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Compliance analysis API endpoints
 */

const express = require('express');
const Logger = require('@logging/Logger');
const { ComplianceService } = require('@application/services/categories/analysis/security');

class ComplianceController {
  constructor() {
    this.logger = new Logger('ComplianceController');
    this.complianceService = new ComplianceService();
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    this.router.post('/analyze', this.analyze.bind(this));
    this.router.get('/config', this.getConfiguration.bind(this));
    this.router.get('/status', this.getStatus.bind(this));
    this.router.get('/frameworks', this.getSupportedFrameworks.bind(this));
  }

  async analyze(req, res) {
    try {
      this.logger.info('Compliance analysis request received', { 
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

      const result = await this.complianceService.analyze({
        projectId,
        projectPath,
        config
      });

      this.logger.info('Compliance analysis completed', { 
        projectId,
        violations: result.data?.violations?.length || 0 
      });

      res.json({
        success: true,
        data: {
          projectId: projectId,
          timestamp: new Date().toISOString(),
          scanner: 'compliance',
          results: result.data || {},
          metadata: result.metadata || {}
        },
        error: null
      });
    } catch (error) {
      this.logger.error('Compliance analysis failed', { 
        projectId: req.body.projectId, 
        error: error.message 
      });

      res.status(500).json({
        success: false,
        data: null,
        error: {
          message: 'Compliance analysis failed',
          details: error.message
        }
      });
    }
  }

  async getConfiguration(req, res) {
    try {
      const config = await this.complianceService.getConfiguration();
      
      res.json({
        success: true,
        data: config,
        error: null
      });
    } catch (error) {
      this.logger.error('Failed to get compliance configuration', { error: error.message });
      
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
      const status = await this.complianceService.getStatus();
      
      res.json({
        success: true,
        data: status,
        error: null
      });
    } catch (error) {
      this.logger.error('Failed to get compliance status', { error: error.message });
      
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

  async getSupportedFrameworks(req, res) {
    try {
      const frameworks = await this.complianceService.getSupportedFrameworks();
      
      res.json({
        success: true,
        data: frameworks,
        error: null
      });
    } catch (error) {
      this.logger.error('Failed to get supported frameworks', { error: error.message });
      
      res.status(500).json({
        success: false,
        data: null,
        error: {
          message: 'Failed to get supported frameworks',
          details: error.message
        }
      });
    }
  }

  getRouter() {
    return this.router;
  }
}

module.exports = ComplianceController; 