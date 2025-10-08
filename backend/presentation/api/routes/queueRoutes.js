const express = require('express');
const router = express.Router();

/**
 * Queue Routes - Professional RESTful API Design
 * 
 * This module provides a clean, modular approach to queue management endpoints
 * including queue status, item management, and workflow type detection.
 */

class QueueRoutes {
  constructor(queueController, authMiddleware) {
    this.queueController = queueController;
    this.authMiddleware = authMiddleware;
  }

  /**
   * Setup all queue routes
   * @param {Express.Router} app - Express app instance
   */
  setupRoutes(app) {
    // Apply authentication middleware to all queue routes
    app.use('/api/projects/:projectId/queue', this.authMiddleware.authenticate());

    // ========================================
    // QUEUE STATUS ROUTES - Queue Monitoring
    // ========================================
    
    // Get queue status
    app.get('/api/projects/:projectId/queue/status', (req, res) => this.queueController.getQueueStatus(req, res));
    
    // Get queue statistics
    app.get('/api/projects/:projectId/queue/statistics', (req, res) => this.queueController.getQueueStatistics(req, res));

    // ========================================
    // QUEUE ITEM ROUTES - Item Management
    // ========================================
    
    // Add item to queue
    app.post('/api/projects/:projectId/queue/add', (req, res) => this.queueController.addToQueue(req, res));
    
    // Cancel queue item
    app.delete('/api/projects/:projectId/queue/:itemId', (req, res) => this.queueController.cancelQueueItem(req, res));
    
    // Update queue item priority
    app.put('/api/projects/:projectId/queue/:itemId/priority', (req, res) => this.queueController.updateQueueItemPriority(req, res));

    // ========================================
    // STEP PROGRESS ROUTES - Step Management
    // ========================================
    
    // Get step progress for queue item
    app.get('/api/projects/:projectId/queue/:itemId/step-progress', (req, res) => this.queueController.getStepProgress(req, res));
    
    // Toggle step status
    app.post('/api/projects/:projectId/queue/:itemId/step/:stepId/toggle', (req, res) => this.queueController.toggleStepStatus(req, res));

    // ========================================
    // QUEUE HISTORY ROUTES - History Management
    // ========================================
    
    // Get queue history
    app.get('/api/projects/:projectId/queue/history', (req, res) => this.queueController.getQueueHistory(req, res));
    
    // Get history statistics
    app.get('/api/projects/:projectId/queue/history/statistics', (req, res) => this.queueController.getHistoryStatistics(req, res));
    
    // Export history
    app.get('/api/projects/:projectId/queue/history/export', (req, res) => this.queueController.exportHistory(req, res));
    
    // Delete history
    app.delete('/api/projects/:projectId/queue/history', (req, res) => this.queueController.deleteHistory(req, res));
    
    // Get specific history item
    app.get('/api/projects/:projectId/queue/history/:historyId', (req, res) => this.queueController.getHistoryItem(req, res));

    // ========================================
    // WORKFLOW TYPE DETECTION ROUTES - Type Management
    // ========================================
    
    // Detect workflow type
    app.post('/api/projects/:projectId/queue/type-detect', (req, res) => this.queueController.detectWorkflowType(req, res));
    
    // Get available workflow types
    app.get('/api/projects/:projectId/queue/types', (req, res) => this.queueController.getWorkflowTypes(req, res));

    // ========================================
    // QUEUE MAINTENANCE ROUTES - Cleanup Operations
    // ========================================
    
    // Clear completed items
    app.delete('/api/projects/:projectId/queue/completed', (req, res) => this.queueController.clearCompletedItems(req, res));
  }
}

module.exports = QueueRoutes;
