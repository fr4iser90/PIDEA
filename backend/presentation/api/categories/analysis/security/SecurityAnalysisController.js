/**
 * SecurityAnalysisController - Presentation Layer
 * Main security analysis API endpoints
 * 
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Main security analysis API endpoints for orchestrating security scans
 */

const express = require('express');
const Logger = require('@logging/Logger');
const { SecurityAnalysisOrchestratorService } = require('@application/services/categories/analysis/security');

class SecurityAnalysisController {
  constructor() {
    this.logger = new Logger('SecurityAnalysisController');
    this.securityService = new SecurityAnalysisOrchestratorService();
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
      this.logger.info('Security analysis request received', { 
        projectId: req.body.projectId,
        userId: req.user?.id 
      });

      const { projectId, projectPath, config = {} } = req.body;

      if (!projectId || !projectPath) {
        return res.badRequest('Missing required parameters: projectId and projectPath', {data: null
        });
      }

      const result = await this.securityService.analyze({
        projectId,
        projectPath,
        config
      });

      this.logger.info('Security analysis completed', { 
        projectId,
        vulnerabilities: result.data?.vulnerabilities?.length || 0 
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
      this.logger.error('Security analysis failed', { 
        projectId: req.body.projectId, 
        error: error.message 
      });

      res.error('Security analysis failed', 500, { details: error.message });
    }
  }

  async getConfiguration(req, res) {
    try {
      const config = await this.securityService.getConfiguration();
      
      res.success(config);
    } catch (error) {
      this.logger.error('Failed to get security configuration', { error: error.message });
      
      res.error('Failed to get configuration', 500, { details: error.message });
    }
  }

  async getStatus(req, res) {
    try {
      const status = await this.securityService.getStatus();
      
      res.success(status);
    } catch (error) {
      this.logger.error('Failed to get security status', { error: error.message });
      
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

      const results = await this.securityService.getResults(id);
      
      if (!results) {
        return res.notFound('Results not found', {data: null
        });
      }

      res.success(results);
    } catch (error) {
      this.logger.error('Failed to get security results', { 
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

      await this.securityService.deleteResults(id);
      
      res.success({ message: 'Results deleted successfully' });
    } catch (error) {
      this.logger.error('Failed to delete security results', { 
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

module.exports = SecurityAnalysisController; 