const express = require('express');
const router = express.Router();

/**
 * Auth Routes - Professional RESTful API Design
 * 
 * This module provides a clean, modular approach to authentication endpoints
 * including login, logout, profile management, and session handling.
 */

class AuthRoutes {
  constructor(authController, authMiddleware) {
    this.authController = authController;
    this.authMiddleware = authMiddleware;
  }

  /**
   * Setup all authentication routes
   * @param {Express.Router} app - Express app instance
   */
  setupRoutes(app) {
    // ========================================
    // PUBLIC AUTH ROUTES - No Authentication Required
    // ========================================
    
    // Login with brute force protection
    app.post('/api/auth/login', this.authMiddleware.bruteForceProtection(), (req, res) => this.authController.login(req, res));
    
    // Refresh token with brute force protection
    app.post('/api/auth/refresh', this.authMiddleware.bruteForceProtection(), (req, res) => this.authController.refresh(req, res));
    
    // Validate token (public endpoint)
    app.get('/api/auth/validate', (req, res) => this.authController.validateToken(req, res));

    // ========================================
    // PROTECTED AUTH ROUTES - Authentication Required
    // ========================================
    
    // Apply authentication middleware to protected routes
    app.use('/api/auth/profile', this.authMiddleware.authenticate());
    app.use('/api/auth/sessions', this.authMiddleware.authenticate());
    app.use('/api/auth/logout', this.authMiddleware.authenticate());

    // Profile management
    app.get('/api/auth/profile', (req, res) => this.authController.getProfile(req, res));
    app.put('/api/auth/profile', (req, res) => this.authController.updateProfile(req, res));
    
    // Session management
    app.get('/api/auth/sessions', (req, res) => this.authController.getSessions(req, res));
    
    // Logout
    app.post('/api/auth/logout', (req, res) => this.authController.logout(req, res));
  }
}

module.exports = AuthRoutes;
