/**
 * Handlers API - RESTful endpoints for unified workflow handlers
 * 
 * This module provides RESTful API endpoints for handler management,
 * execution, and migration status in the unified workflow system.
 */

const express = require('express');
const { UnifiedWorkflowHandler } = require('../../domain/workflows/handlers');
const { HandlerRegistry } = require('../../domain/workflows/handlers');
const { HandlerFactory } = require('../../domain/workflows/handlers');

class HandlersController {
  /**
   * Create a new handlers controller
   * @param {Object} dependencies - Controller dependencies
   */
  constructor(dependencies = {}) {
    this.router = express.Router();
    this.unifiedHandler = dependencies.unifiedHandler || new UnifiedWorkflowHandler();
    this.handlerRegistry = dependencies.handlerRegistry || new HandlerRegistry();
    this.handlerFactory = dependencies.handlerFactory || new HandlerFactory();
    this.logger = dependencies.logger || console;
    
    this.initializeRoutes();
  }

  /**
   * Initialize API routes
   */
  initializeRoutes() {
    // Handler management routes
    this.router.get('/list', this.listHandlers.bind(this));
    this.router.get('/types', this.getHandlerTypes.bind(this));
    this.router.get('/:type', this.getHandler.bind(this));
    this.router.get('/:type/metadata', this.getHandlerMetadata.bind(this));
    this.router.get('/:type/statistics', this.getHandlerStatistics.bind(this));

    // Handler execution routes
    this.router.post('/execute', this.executeHandler.bind(this));
    this.router.post('/execute/:type', this.executeHandlerByType.bind(this));
    this.router.post('/execute/batch', this.executeBatchHandlers.bind(this));

    // Migration status routes
    this.router.get('/migration/status', this.getMigrationStatus.bind(this));
    this.router.get('/migration/statistics', this.getMigrationStatistics.bind(this));
    this.router.get('/migration/handlers', this.getMigratedHandlers.bind(this));

    // Automation level routes
    this.router.get('/automation/levels', this.getAutomationLevels.bind(this));
    this.router.get('/automation/:level/handlers', this.getHandlersByAutomationLevel.bind(this));

    // Health and status routes
    this.router.get('/health', this.getHealthCheck.bind(this));
    this.router.get('/status', this.getSystemStatus.bind(this));
  }

  /**
   * List all handlers
   * GET /api/handlers/list
   */
  async listHandlers(req, res) {
    try {
      const handlers = this.handlerRegistry.listHandlers();
      
      res.json({
        success: true,
        data: handlers,
        count: handlers.length
      });

    } catch (error) {
      this.logger.error('Handlers API: Failed to list handlers', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to list handlers',
        message: error.message
      });
    }
  }

  /**
   * Get handler types
   * GET /api/handlers/types
   */
  async getHandlerTypes(req, res) {
    try {
      const types = this.handlerRegistry.getHandlerTypes();
      
      res.json({
        success: true,
        data: types,
        count: types.length
      });

    } catch (error) {
      this.logger.error('Handlers API: Failed to get handler types', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get handler types',
        message: error.message
      });
    }
  }

  /**
   * Get handler by type
   * GET /api/handlers/:type
   */
  async getHandler(req, res) {
    try {
      const { type } = req.params;
      const handler = this.handlerRegistry.getHandler(type);
      
      if (!handler) {
        return res.status(404).json({
          success: false,
          error: `Handler not found: ${type}`
        });
      }

      res.json({
        success: true,
        data: {
          type,
          name: handler.getMetadata().name,
          description: handler.getMetadata().description,
          version: handler.getMetadata().version
        }
      });

    } catch (error) {
      this.logger.error('Handlers API: Failed to get handler', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get handler',
        message: error.message
      });
    }
  }

  /**
   * Get handler metadata
   * GET /api/handlers/:type/metadata
   */
  async getHandlerMetadata(req, res) {
    try {
      const { type } = req.params;
      const metadata = this.handlerRegistry.getHandlerMetadata(type);
      
      if (!metadata) {
        return res.status(404).json({
          success: false,
          error: `Handler metadata not found: ${type}`
        });
      }

      res.json({
        success: true,
        data: metadata
      });

    } catch (error) {
      this.logger.error('Handlers API: Failed to get handler metadata', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get handler metadata',
        message: error.message
      });
    }
  }

  /**
   * Get handler statistics
   * GET /api/handlers/:type/statistics
   */
  async getHandlerStatistics(req, res) {
    try {
      const { type } = req.params;
      const statistics = this.handlerRegistry.getHandlerStatistics(type);
      
      if (!statistics) {
        return res.status(404).json({
          success: false,
          error: `Handler statistics not found: ${type}`
        });
      }

      res.json({
        success: true,
        data: statistics
      });

    } catch (error) {
      this.logger.error('Handlers API: Failed to get handler statistics', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get handler statistics',
        message: error.message
      });
    }
  }

  /**
   * Execute handler
   * POST /api/handlers/execute
   */
  async executeHandler(req, res) {
    try {
      const { request, response, options } = req.body;
      
      if (!request) {
        return res.status(400).json({
          success: false,
          error: 'Request data is required'
        });
      }

      const result = await this.unifiedHandler.handle(request, response, options);
      
      res.json({
        success: result.isSuccess(),
        data: result.toObject()
      });

    } catch (error) {
      this.logger.error('Handlers API: Handler execution failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Handler execution failed',
        message: error.message
      });
    }
  }

  /**
   * Execute handler by type
   * POST /api/handlers/execute/:type
   */
  async executeHandlerByType(req, res) {
    try {
      const { type } = req.params;
      const { data, response, options } = req.body;
      
      const request = {
        type,
        ...data
      };

      const result = await this.unifiedHandler.handle(request, response, options);
      
      res.json({
        success: result.isSuccess(),
        data: result.toObject()
      });

    } catch (error) {
      this.logger.error('Handlers API: Handler execution by type failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Handler execution by type failed',
        message: error.message
      });
    }
  }

  /**
   * Execute batch handlers
   * POST /api/handlers/execute/batch
   */
  async executeBatchHandlers(req, res) {
    try {
      const { handlers, options } = req.body;
      
      if (!Array.isArray(handlers)) {
        return res.status(400).json({
          success: false,
          error: 'Handlers array is required'
        });
      }

      const results = [];
      
      for (const handlerRequest of handlers) {
        try {
          const result = await this.unifiedHandler.handle(
            handlerRequest.request,
            handlerRequest.response,
            { ...options, ...handlerRequest.options }
          );
          results.push({
            type: handlerRequest.request?.type,
            success: result.isSuccess(),
            data: result.toObject()
          });
        } catch (error) {
          results.push({
            type: handlerRequest.request?.type,
            success: false,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        data: results,
        count: results.length
      });

    } catch (error) {
      this.logger.error('Handlers API: Batch handler execution failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Batch handler execution failed',
        message: error.message
      });
    }
  }

  /**
   * Get migration status
   * GET /api/handlers/migration/status
   */
  async getMigrationStatus(req, res) {
    try {
      const handlers = this.handlerRegistry.listHandlers();
      const migrationStatus = {
        total: handlers.length,
        completed: 0,
        validated: 0,
        unified: 0,
        deprecated: 0,
        unknown: 0
      };

      for (const handler of handlers) {
        const metadata = this.handlerRegistry.getHandlerMetadata(handler.type);
        const status = metadata?.migrationStatus || 'unknown';
        migrationStatus[status]++;
      }

      res.json({
        success: true,
        data: migrationStatus
      });

    } catch (error) {
      this.logger.error('Handlers API: Failed to get migration status', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get migration status',
        message: error.message
      });
    }
  }

  /**
   * Get migration statistics
   * GET /api/handlers/migration/statistics
   */
  async getMigrationStatistics(req, res) {
    try {
      const handlers = this.handlerRegistry.listHandlers();
      const statistics = {
        byCategory: {},
        byAutomationLevel: {},
        byMigrationStatus: {}
      };

      for (const handler of handlers) {
        const metadata = this.handlerRegistry.getHandlerMetadata(handler.type);
        
        // By category
        const category = metadata?.category || 'unknown';
        statistics.byCategory[category] = (statistics.byCategory[category] || 0) + 1;
        
        // By automation level
        const automationLevel = metadata?.automationLevel || 'basic';
        statistics.byAutomationLevel[automationLevel] = (statistics.byAutomationLevel[automationLevel] || 0) + 1;
        
        // By migration status
        const migrationStatus = metadata?.migrationStatus || 'unknown';
        statistics.byMigrationStatus[migrationStatus] = (statistics.byMigrationStatus[migrationStatus] || 0) + 1;
      }

      res.json({
        success: true,
        data: statistics
      });

    } catch (error) {
      this.logger.error('Handlers API: Failed to get migration statistics', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get migration statistics',
        message: error.message
      });
    }
  }

  /**
   * Get migrated handlers
   * GET /api/handlers/migration/handlers
   */
  async getMigratedHandlers(req, res) {
    try {
      const { status } = req.query;
      const handlers = this.handlerRegistry.listHandlers();
      const migratedHandlers = [];

      for (const handler of handlers) {
        const metadata = this.handlerRegistry.getHandlerMetadata(handler.type);
        const handlerStatus = metadata?.migrationStatus || 'unknown';
        
        if (!status || handlerStatus === status) {
          migratedHandlers.push({
            type: handler.type,
            name: handler.name,
            description: handler.description,
            migrationStatus: handlerStatus,
            migrationDate: metadata?.migrationDate,
            automationLevel: metadata?.automationLevel,
            category: metadata?.category
          });
        }
      }

      res.json({
        success: true,
        data: migratedHandlers,
        count: migratedHandlers.length
      });

    } catch (error) {
      this.logger.error('Handlers API: Failed to get migrated handlers', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get migrated handlers',
        message: error.message
      });
    }
  }

  /**
   * Get automation levels
   * GET /api/handlers/automation/levels
   */
  async getAutomationLevels(req, res) {
    try {
      const levels = ['basic', 'enhanced', 'full'];
      
      res.json({
        success: true,
        data: levels
      });

    } catch (error) {
      this.logger.error('Handlers API: Failed to get automation levels', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get automation levels',
        message: error.message
      });
    }
  }

  /**
   * Get handlers by automation level
   * GET /api/handlers/automation/:level/handlers
   */
  async getHandlersByAutomationLevel(req, res) {
    try {
      const { level } = req.params;
      const handlers = this.handlerRegistry.listHandlers();
      const levelHandlers = [];

      for (const handler of handlers) {
        const metadata = this.handlerRegistry.getHandlerMetadata(handler.type);
        const automationLevel = metadata?.automationLevel || 'basic';
        
        if (automationLevel === level) {
          levelHandlers.push({
            type: handler.type,
            name: handler.name,
            description: handler.description,
            automationLevel,
            migrationStatus: metadata?.migrationStatus,
            category: metadata?.category
          });
        }
      }

      res.json({
        success: true,
        data: levelHandlers,
        count: levelHandlers.length
      });

    } catch (error) {
      this.logger.error('Handlers API: Failed to get handlers by automation level', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get handlers by automation level',
        message: error.message
      });
    }
  }

  /**
   * Get health check
   * GET /api/handlers/health
   */
  async getHealthCheck(req, res) {
    try {
      const health = await this.unifiedHandler.isHealthy();
      
      res.json({
        success: true,
        data: {
          status: health ? 'healthy' : 'unhealthy',
          timestamp: new Date(),
          handlerCount: this.handlerRegistry.getHandlerCount(),
          systemStatus: 'operational'
        }
      });

    } catch (error) {
      this.logger.error('Handlers API: Health check failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        message: error.message
      });
    }
  }

  /**
   * Get system status
   * GET /api/handlers/status
   */
  async getSystemStatus(req, res) {
    try {
      const status = {
        handlerCount: this.handlerRegistry.getHandlerCount(),
        handlerTypes: this.handlerRegistry.getHandlerTypes(),
        systemHealth: await this.unifiedHandler.isHealthy(),
        statistics: this.handlerRegistry.getAllStatistics(),
        timestamp: new Date()
      };

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      this.logger.error('Handlers API: Failed to get system status', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get system status',
        message: error.message
      });
    }
  }

  /**
   * Get router
   * @returns {express.Router} Express router
   */
  getRouter() {
    return this.router;
  }
}

module.exports = HandlersController; 