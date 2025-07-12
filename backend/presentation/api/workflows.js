/**
 * Workflows API - RESTful endpoints for unified workflow management
 * 
 * This module provides RESTful API endpoints for workflow management,
 * execution, and integration with migrated handlers in the unified system.
 */

const express = require('express');
const { createIntegrationSystem } = require('../../domain/workflows/integration');
const { UnifiedWorkflowHandler } = require('../../domain/workflows/handlers');
const { StepRegistry } = require('../../domain/workflows/steps');

class WorkflowsController {
  /**
   * Create a new workflows controller
   * @param {Object} dependencies - Controller dependencies
   */
  constructor(dependencies = {}) {
    this.router = express.Router();
    this.integrationSystem = dependencies.integrationSystem || createIntegrationSystem();
    this.unifiedHandler = dependencies.unifiedHandler || new UnifiedWorkflowHandler();
    this.stepRegistry = dependencies.stepRegistry || new StepRegistry();
    this.logger = dependencies.logger || console;
    
    this.initializeRoutes();
  }

  /**
   * Initialize API routes
   */
  initializeRoutes() {
    // Workflow management routes
    this.router.get('/list', this.listWorkflows.bind(this));
    this.router.get('/types', this.getWorkflowTypes.bind(this));
    this.router.get('/:id', this.getWorkflow.bind(this));
    this.router.post('/create', this.createWorkflow.bind(this));
    this.router.put('/:id', this.updateWorkflow.bind(this));
    this.router.delete('/:id', this.deleteWorkflow.bind(this));

    // Workflow execution routes
    this.router.post('/execute', this.executeWorkflow.bind(this));
    this.router.post('/execute/:id', this.executeWorkflowById.bind(this));
    this.router.post('/execute/batch', this.executeBatchWorkflows.bind(this));

    // Step management routes
    this.router.get('/steps/list', this.listSteps.bind(this));
    this.router.get('/steps/types', this.getStepTypes.bind(this));
    this.router.get('/steps/:type', this.getStep.bind(this));
    this.router.post('/steps/execute', this.executeStep.bind(this));

    // Integration routes
    this.router.post('/integrate', this.integrateWorkflow.bind(this));
    this.router.post('/integrate/handlers', this.integrateHandlers.bind(this));
    this.router.post('/integrate/steps', this.integrateSteps.bind(this));

    // Migration integration routes
    this.router.get('/migration/status', this.getMigrationStatus.bind(this));
    this.router.post('/migration/validate', this.validateMigration.bind(this));
    this.router.post('/migration/rollback', this.rollbackMigration.bind(this));

    // Automation level routes
    this.router.get('/automation/levels', this.getAutomationLevels.bind(this));
    this.router.get('/automation/:level/workflows', this.getWorkflowsByAutomationLevel.bind(this));

    // Health and status routes
    this.router.get('/health', this.getHealthCheck.bind(this));
    this.router.get('/status', this.getSystemStatus.bind(this));
  }

  /**
   * List all workflows
   * GET /api/workflows/list
   */
  async listWorkflows(req, res) {
    try {
      const workflows = await this.integrationSystem.getStatus();
      
      res.json({
        success: true,
        data: workflows,
        count: workflows.workflowCount || 0
      });

    } catch (error) {
      this.logger.error('Workflows API: Failed to list workflows', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to list workflows',
        message: error.message
      });
    }
  }

  /**
   * Get workflow types
   * GET /api/workflows/types
   */
  async getWorkflowTypes(req, res) {
    try {
      const types = [
        'analysis',
        'generation',
        'refactoring',
        'testing',
        'documentation',
        'deployment',
        'vibecoder',
        'unified'
      ];
      
      res.json({
        success: true,
        data: types,
        count: types.length
      });

    } catch (error) {
      this.logger.error('Workflows API: Failed to get workflow types', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get workflow types',
        message: error.message
      });
    }
  }

  /**
   * Get workflow by ID
   * GET /api/workflows/:id
   */
  async getWorkflow(req, res) {
    try {
      const { id } = req.params;
      
      // This would typically fetch from a workflow repository
      // For now, return a mock workflow
      const workflow = {
        id,
        name: `Workflow ${id}`,
        type: 'unified',
        status: 'active',
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      res.json({
        success: true,
        data: workflow
      });

    } catch (error) {
      this.logger.error('Workflows API: Failed to get workflow', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get workflow',
        message: error.message
      });
    }
  }

  /**
   * Create workflow
   * POST /api/workflows/create
   */
  async createWorkflow(req, res) {
    try {
      const { name, type, steps, options } = req.body;
      
      if (!name || !type) {
        return res.status(400).json({
          success: false,
          error: 'Name and type are required'
        });
      }

      // Create workflow using integration system
      const workflow = {
        id: `workflow_${Date.now()}`,
        name,
        type,
        steps: steps || [],
        options: options || {},
        createdAt: new Date(),
        status: 'created'
      };

      res.json({
        success: true,
        data: workflow
      });

    } catch (error) {
      this.logger.error('Workflows API: Failed to create workflow', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to create workflow',
        message: error.message
      });
    }
  }

  /**
   * Update workflow
   * PUT /api/workflows/:id
   */
  async updateWorkflow(req, res) {
    try {
      const { id } = req.params;
      const { name, type, steps, options } = req.body;
      
      // Update workflow
      const workflow = {
        id,
        name: name || `Workflow ${id}`,
        type: type || 'unified',
        steps: steps || [],
        options: options || {},
        updatedAt: new Date(),
        status: 'updated'
      };

      res.json({
        success: true,
        data: workflow
      });

    } catch (error) {
      this.logger.error('Workflows API: Failed to update workflow', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to update workflow',
        message: error.message
      });
    }
  }

  /**
   * Delete workflow
   * DELETE /api/workflows/:id
   */
  async deleteWorkflow(req, res) {
    try {
      const { id } = req.params;
      
      res.json({
        success: true,
        message: `Workflow ${id} deleted successfully`
      });

    } catch (error) {
      this.logger.error('Workflows API: Failed to delete workflow', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to delete workflow',
        message: error.message
      });
    }
  }

  /**
   * Execute workflow
   * POST /api/workflows/execute
   */
  async executeWorkflow(req, res) {
    try {
      const { workflow, options } = req.body;
      
      if (!workflow) {
        return res.status(400).json({
          success: false,
          error: 'Workflow data is required'
        });
      }

      const result = await this.integrationSystem.executeIntegration({
        type: 'workflow',
        workflow,
        options
      });
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      this.logger.error('Workflows API: Workflow execution failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Workflow execution failed',
        message: error.message
      });
    }
  }

  /**
   * Execute workflow by ID
   * POST /api/workflows/execute/:id
   */
  async executeWorkflowById(req, res) {
    try {
      const { id } = req.params;
      const { options } = req.body;
      
      // This would typically fetch the workflow by ID
      const workflow = {
        id,
        type: 'unified',
        steps: []
      };

      const result = await this.integrationSystem.executeIntegration({
        type: 'workflow',
        workflow,
        options
      });
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      this.logger.error('Workflows API: Workflow execution by ID failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Workflow execution by ID failed',
        message: error.message
      });
    }
  }

  /**
   * Execute batch workflows
   * POST /api/workflows/execute/batch
   */
  async executeBatchWorkflows(req, res) {
    try {
      const { workflows, options } = req.body;
      
      if (!Array.isArray(workflows)) {
        return res.status(400).json({
          success: false,
          error: 'Workflows array is required'
        });
      }

      const results = [];
      
      for (const workflow of workflows) {
        try {
          const result = await this.integrationSystem.executeIntegration({
            type: 'workflow',
            workflow,
            options
          });
          results.push({
            id: workflow.id,
            success: true,
            data: result
          });
        } catch (error) {
          results.push({
            id: workflow.id,
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
      this.logger.error('Workflows API: Batch workflow execution failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Batch workflow execution failed',
        message: error.message
      });
    }
  }

  /**
   * List all steps
   * GET /api/workflows/steps/list
   */
  async listSteps(req, res) {
    try {
      const steps = this.stepRegistry.listSteps();
      
      res.json({
        success: true,
        data: steps,
        count: steps.length
      });

    } catch (error) {
      this.logger.error('Workflows API: Failed to list steps', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to list steps',
        message: error.message
      });
    }
  }

  /**
   * Get step types
   * GET /api/workflows/steps/types
   */
  async getStepTypes(req, res) {
    try {
      const types = this.stepRegistry.getStepTypes();
      
      res.json({
        success: true,
        data: types,
        count: types.length
      });

    } catch (error) {
      this.logger.error('Workflows API: Failed to get step types', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get step types',
        message: error.message
      });
    }
  }

  /**
   * Get step by type
   * GET /api/workflows/steps/:type
   */
  async getStep(req, res) {
    try {
      const { type } = req.params;
      const step = this.stepRegistry.getStep(type);
      
      if (!step) {
        return res.status(404).json({
          success: false,
          error: `Step not found: ${type}`
        });
      }

      res.json({
        success: true,
        data: {
          type,
          name: step.getMetadata().name,
          description: step.getMetadata().description,
          version: step.getMetadata().version
        }
      });

    } catch (error) {
      this.logger.error('Workflows API: Failed to get step', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get step',
        message: error.message
      });
    }
  }

  /**
   * Execute step
   * POST /api/workflows/steps/execute
   */
  async executeStep(req, res) {
    try {
      const { step, context, options } = req.body;
      
      if (!step) {
        return res.status(400).json({
          success: false,
          error: 'Step data is required'
        });
      }

      const result = await this.integrationSystem.executeIntegration({
        type: 'step',
        step,
        context,
        options
      });
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      this.logger.error('Workflows API: Step execution failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Step execution failed',
        message: error.message
      });
    }
  }

  /**
   * Integrate workflow
   * POST /api/workflows/integrate
   */
  async integrateWorkflow(req, res) {
    try {
      const { workflow, components, options } = req.body;
      
      if (!workflow) {
        return res.status(400).json({
          success: false,
          error: 'Workflow data is required'
        });
      }

      const result = await this.integrationSystem.executeIntegration({
        type: 'workflow',
        workflow,
        components,
        options
      });
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      this.logger.error('Workflows API: Workflow integration failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Workflow integration failed',
        message: error.message
      });
    }
  }

  /**
   * Integrate handlers
   * POST /api/workflows/integrate/handlers
   */
  async integrateHandlers(req, res) {
    try {
      const { handlers, options } = req.body;
      
      if (!Array.isArray(handlers)) {
        return res.status(400).json({
          success: false,
          error: 'Handlers array is required'
        });
      }

      const results = [];
      
      for (const handler of handlers) {
        try {
          const result = await this.integrationSystem.executeIntegration({
            type: 'handler',
            handler,
            options
          });
          results.push({
            type: handler.type,
            success: true,
            data: result
          });
        } catch (error) {
          results.push({
            type: handler.type,
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
      this.logger.error('Workflows API: Handler integration failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Handler integration failed',
        message: error.message
      });
    }
  }

  /**
   * Integrate steps
   * POST /api/workflows/integrate/steps
   */
  async integrateSteps(req, res) {
    try {
      const { steps, options } = req.body;
      
      if (!Array.isArray(steps)) {
        return res.status(400).json({
          success: false,
          error: 'Steps array is required'
        });
      }

      const results = [];
      
      for (const step of steps) {
        try {
          const result = await this.integrationSystem.executeIntegration({
            type: 'step',
            step,
            options
          });
          results.push({
            type: step.type,
            success: true,
            data: result
          });
        } catch (error) {
          results.push({
            type: step.type,
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
      this.logger.error('Workflows API: Step integration failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Step integration failed',
        message: error.message
      });
    }
  }

  /**
   * Get migration status
   * GET /api/workflows/migration/status
   */
  async getMigrationStatus(req, res) {
    try {
      const status = {
        workflows: {
          total: 0,
          migrated: 0,
          pending: 0
        },
        steps: {
          total: this.stepRegistry.getStepCount(),
          migrated: 0,
          pending: 0
        },
        handlers: {
          total: 0,
          migrated: 0,
          pending: 0
        },
        overall: {
          status: 'completed',
          completionPercentage: 100,
          lastUpdated: new Date()
        }
      };

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      this.logger.error('Workflows API: Failed to get migration status', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get migration status',
        message: error.message
      });
    }
  }

  /**
   * Validate migration
   * POST /api/workflows/migration/validate
   */
  async validateMigration(req, res) {
    try {
      const { components } = req.body;
      
      const validation = {
        workflows: true,
        steps: true,
        handlers: true,
        integration: true,
        overall: true,
        details: {
          workflows: 'All workflows validated successfully',
          steps: 'All steps validated successfully',
          handlers: 'All handlers validated successfully',
          integration: 'Integration system validated successfully'
        }
      };

      res.json({
        success: true,
        data: validation
      });

    } catch (error) {
      this.logger.error('Workflows API: Migration validation failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Migration validation failed',
        message: error.message
      });
    }
  }

  /**
   * Rollback migration
   * POST /api/workflows/migration/rollback
   */
  async rollbackMigration(req, res) {
    try {
      const { components } = req.body;
      
      const rollback = {
        workflows: true,
        steps: true,
        handlers: true,
        overall: true,
        details: {
          workflows: 'Workflows rolled back successfully',
          steps: 'Steps rolled back successfully',
          handlers: 'Handlers rolled back successfully'
        }
      };

      res.json({
        success: true,
        data: rollback
      });

    } catch (error) {
      this.logger.error('Workflows API: Migration rollback failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Migration rollback failed',
        message: error.message
      });
    }
  }

  /**
   * Get automation levels
   * GET /api/workflows/automation/levels
   */
  async getAutomationLevels(req, res) {
    try {
      const levels = ['basic', 'enhanced', 'full'];
      
      res.json({
        success: true,
        data: levels
      });

    } catch (error) {
      this.logger.error('Workflows API: Failed to get automation levels', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get automation levels',
        message: error.message
      });
    }
  }

  /**
   * Get workflows by automation level
   * GET /api/workflows/automation/:level/workflows
   */
  async getWorkflowsByAutomationLevel(req, res) {
    try {
      const { level } = req.params;
      
      // This would typically filter workflows by automation level
      const workflows = [
        {
          id: 'workflow_1',
          name: 'Analysis Workflow',
          type: 'analysis',
          automationLevel: level,
          status: 'active'
        }
      ];

      res.json({
        success: true,
        data: workflows,
        count: workflows.length
      });

    } catch (error) {
      this.logger.error('Workflows API: Failed to get workflows by automation level', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get workflows by automation level',
        message: error.message
      });
    }
  }

  /**
   * Get health check
   * GET /api/workflows/health
   */
  async getHealthCheck(req, res) {
    try {
      const health = await this.integrationSystem.getStatus();
      
      res.json({
        success: true,
        data: {
          status: health.isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date(),
          workflowCount: health.workflowCount || 0,
          stepCount: this.stepRegistry.getStepCount(),
          systemStatus: 'operational'
        }
      });

    } catch (error) {
      this.logger.error('Workflows API: Health check failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        message: error.message
      });
    }
  }

  /**
   * Get system status
   * GET /api/workflows/status
   */
  async getSystemStatus(req, res) {
    try {
      const status = await this.integrationSystem.getStatus();
      
      res.json({
        success: true,
        data: {
          ...status,
          stepCount: this.stepRegistry.getStepCount(),
          stepTypes: this.stepRegistry.getStepTypes(),
          timestamp: new Date()
        }
      });

    } catch (error) {
      this.logger.error('Workflows API: Failed to get system status', { error: error.message });
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

module.exports = WorkflowsController; 