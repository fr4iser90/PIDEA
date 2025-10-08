const express = require('express');
const router = express.Router();

/**
 * Task Routes - Professional RESTful API Design
 * 
 * This module provides a clean, modular approach to task management endpoints
 * including CRUD operations, execution, and status synchronization.
 */

class TaskRoutes {
  constructor(taskController, taskStatusSyncController, authMiddleware) {
    this.taskController = taskController;
    this.taskStatusSyncController = taskStatusSyncController;
    this.authMiddleware = authMiddleware;
  }

  /**
   * Setup all task routes
   * @param {Express.Router} app - Express app instance
   */
  setupRoutes(app) {
    // Apply authentication middleware to all task routes
    app.use('/api/projects/:projectId/tasks', this.authMiddleware.authenticate());

    // ========================================
    // CRUD ROUTES - Basic Task Operations
    // ========================================
    
    // Create new task
    app.post('/api/projects/:projectId/tasks', (req, res) => this.taskController.createTask(req, res));
    
    // Get all tasks for project
    app.get('/api/projects/:projectId/tasks', (req, res) => this.taskController.getProjectTasks(req, res));
    
    // Get specific task
    app.get('/api/projects/:projectId/tasks/:id', (req, res) => this.taskController.getTask(req, res));
    
    // Update task
    app.put('/api/projects/:projectId/tasks/:id', (req, res) => this.taskController.updateTask(req, res));
    
    // Delete task
    app.delete('/api/projects/:projectId/tasks/:id', (req, res) => this.taskController.deleteTask(req, res));

    // ========================================
    // EXECUTION ROUTES - Task Execution & Management
    // ========================================
    
    // Get task execution details
    app.get('/api/projects/:projectId/tasks/:id/execution', (req, res) => this.taskController.getTaskExecution(req, res));
    
    // Cancel task execution
    app.post('/api/projects/:projectId/tasks/:id/cancel', (req, res) => this.taskController.cancelTask(req, res));
    
    // Enqueue task for execution (NEW QUEUE-BASED SYSTEM)
    app.post('/api/projects/:projectId/tasks/enqueue', (req, res) => this.taskController.enqueueTask(req, res));

    // ========================================
    // SYNC ROUTES - Manual Task Synchronization
    // ========================================
    
    // Sync manual tasks
    app.post('/api/projects/:projectId/tasks/sync-manual', (req, res) => this.taskController.syncManualTasks(req, res));
    
    // Clean manual tasks
    app.post('/api/projects/:projectId/tasks/clean-manual', (req, res) => this.taskController.cleanManualTasks(req, res));

    // ========================================
    // STATUS SYNC ROUTES - Task Status Management
    // ========================================
    
    // Sync task statuses
    app.post('/api/projects/:projectId/tasks/sync-status', (req, res) => this.taskStatusSyncController.syncTaskStatuses(req, res));
    
    // Validate task statuses
    app.post('/api/projects/:projectId/tasks/validate-status', (req, res) => this.taskStatusSyncController.validateTaskStatuses(req, res));
    
    // Rollback task statuses
    app.post('/api/projects/:projectId/tasks/rollback-status', (req, res) => this.taskStatusSyncController.rollbackTaskStatuses(req, res));

    // ========================================
    // SCRIPT GENERATION ROUTES - Task Scripts
    // ========================================
    
    // Generate script from task
    app.post('/api/projects/:projectId/scripts/generate', (req, res) => this.taskController.generateScript(req, res));
    
    // Get generated scripts
    app.get('/api/projects/:projectId/scripts', (req, res) => this.taskController.getGeneratedScripts(req, res));
    
    // Execute script
    app.post('/api/projects/:projectId/scripts/:id/execute', (req, res) => this.taskController.executeScript(req, res));
  }
}

module.exports = TaskRoutes;
