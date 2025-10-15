const express = require("express");
const router = express.Router();

/**
 * Auth Routes - Professional RESTful API Design
 *
 * This module provides a clean, modular approach to authentication endpoints
 * including login, logout, profile management, and session handling.
 */

class AuthRoutes {
  constructor(authController = null, authMiddleware = null) {
    this.authController = authController;
    this.authMiddleware = authMiddleware;
    this.router = express.Router();
    this.setupRoutes();
  }

  /**
   * Get router instance
   * @returns {express.Router} Router instance
   */
  getRouter() {
    return this.router;
  }

  /**
   * Setup all authentication routes
   */
  setupRoutes() {
    // ========================================
    // PUBLIC AUTH ROUTES - No Authentication Required
    // ========================================

    // Login with brute force protection
    this.router.post(
      "/api/auth/login",
      (req, res) => {
        if (this.authController) {
          this.authController.login(req, res);
        } else {
          res.status(501).json({ error: "Auth controller not available" });
        }
      }
    );

    // Refresh token with brute force protection
    this.router.post(
      "/api/auth/refresh",
      (req, res) => {
        if (this.authController) {
          this.authController.refresh(req, res);
        } else {
          res.status(501).json({ error: "Auth controller not available" });
        }
      }
    );

    // Validate token (public endpoint)
    this.router.get("/api/auth/validate", (req, res) => {
      if (this.authController) {
        this.authController.validateToken(req, res);
      } else {
        res.status(501).json({ error: "Auth controller not available" });
      }
    });

    // ========================================
    // PROTECTED AUTH ROUTES - Authentication Required
    // ========================================

    // Authentication handled by global middleware

    // Profile management
    this.router.get("/api/auth/profile", (req, res) => {
      if (this.authController) {
        this.authController.getProfile(req, res);
      } else {
        res.status(501).json({ error: "Auth controller not available" });
      }
    });
    this.router.put("/api/auth/profile", (req, res) => {
      if (this.authController) {
        this.authController.updateProfile(req, res);
      } else {
        res.status(501).json({ error: "Auth controller not available" });
      }
    });

    // Session management
    this.router.get("/api/auth/sessions", (req, res) => {
      if (this.authController) {
        this.authController.getSessions(req, res);
      } else {
        res.status(501).json({ error: "Auth controller not available" });
      }
    });

    // Logout
    this.router.post("/api/auth/logout", (req, res) => {
      if (this.authController) {
        this.authController.logout(req, res);
      } else {
        res.status(501).json({ error: "Auth controller not available" });
      }
    });
  }

  /**
   * Get router instance for Express app
   * @returns {Express.Router} Router instance
   */
  getRouter() {
    return this.router;
  }
}

module.exports = AuthRoutes;

// Export getRouter function for route registry
module.exports.getRouter = () => {
  const authRoutes = new AuthRoutes();
  return authRoutes.getRouter();
};
