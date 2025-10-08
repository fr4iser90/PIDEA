const express = require('express');
const router = express.Router();

/**
 * Chat Routes - Professional RESTful API Design
 * 
 * This module provides a clean, modular approach to chat endpoints
 * including message sending, history retrieval, and settings management.
 */

class ChatRoutes {
  constructor(webChatController, authMiddleware) {
    this.webChatController = webChatController;
    this.authMiddleware = authMiddleware;
  }

  /**
   * Setup all chat routes
   * @param {Express.Router} app - Express app instance
   */
  setupRoutes(app) {
    // Apply authentication middleware to all chat routes
    app.use('/api/chat', this.authMiddleware.authenticate());
    app.use('/api/settings', this.authMiddleware.authenticate());
    app.use('/api/prompts', this.authMiddleware.authenticate());

    // ========================================
    // CHAT MESSAGE ROUTES - Message Operations
    // ========================================
    
    // Send chat message
    app.post('/api/chat', (req, res) => this.webChatController.sendMessage(req, res));
    
    // Get chat history
    app.get('/api/chat/history', (req, res) => this.webChatController.getChatHistory(req, res));
    
    // Get chat history for specific port
    app.get('/api/chat/port/:port/history', (req, res) => this.webChatController.getPortChatHistory(req, res));
    
    // Get connection status
    app.get('/api/chat/status', (req, res) => this.webChatController.getConnectionStatus(req, res));

    // ========================================
    // SETTINGS ROUTES - Settings Management
    // ========================================
    
    // Get chat settings
    app.get('/api/settings', (req, res) => this.webChatController.getSettings(req, res));

    // ========================================
    // PROMPTS ROUTES - Prompt Management
    // ========================================
    
    // Get quick prompts
    app.get('/api/prompts/quick', (req, res) => this.webChatController.getQuickPrompts(req, res));
  }
}

module.exports = ChatRoutes;
