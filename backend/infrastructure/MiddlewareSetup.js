const express = require('express');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const slowDown = require('express-slow-down');
const cookieParser = require('cookie-parser');

/**
 * Middleware Setup - Professional Middleware Configuration
 * 
 * This module provides a clean, modular approach to middleware setup
 * including security, rate limiting, static file serving, and frontend building.
 */

class MiddlewareSetup {
  constructor(autoSecurityManager, logger) {
    this.autoSecurityManager = autoSecurityManager;
    this.logger = logger;
  }

  /**
   * Setup all middleware
   * @param {Express.Router} app - Express app instance
   */
  setupMiddleware(app) {
    this.logger.info('Setting up middleware...');

    // Import centralized security configuration
    const securityConfig = require('../config/security-config');

    // ========================================
    // SECURITY MIDDLEWARE - Security Configuration
    // ========================================
    this.setupSecurityMiddleware(app, securityConfig);

    // ========================================
    // RATE LIMITING - Request Limiting
    // ========================================
    this.setupRateLimiting(app, securityConfig);

    // ========================================
    // BODY PARSING - Request Processing
    // ========================================
    this.setupBodyParsing(app, securityConfig);

    // ========================================
    // STATIC FILES - File Serving
    // ========================================
    this.setupStaticFiles(app, securityConfig);

    // ========================================
    // FRONTEND BUILDING - Development Support
    // ========================================
    this.setupFrontendBuilding(app);

    this.logger.info('Middleware setup complete');
  }

  setupSecurityMiddleware(app, securityConfig) {
    // Security middleware
    app.use(helmet(securityConfig.config.helmet));
    app.use(cors({
      ...securityConfig.config.cors,
      credentials: true // Allow cookies
    }));

    // HTTP Parameter Pollution protection
    app.use(hpp());
  }

  setupRateLimiting(app, securityConfig) {
    // Progressive rate limiting (slow down) - only for unauthenticated users
    const speedLimiter = slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 20, // allow 20 requests per 15 minutes for visitors, then...
      delayMs: 1000, // begin adding 1000ms of delay per request above 20
      skip: (req) => {
        // Skip rate limiting for authenticated users
        return req.user || req.path === '/api/health';
      },
      onLimitReached: (req, res) => {
        // Redirect content library requests to GitHub
        if (req.path.includes('/api/frameworks') || req.path.includes('/api/prompts') || req.path.includes('/api/templates')) {
          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded for content library',
            message: 'Please visit our GitHub repository for direct access to frameworks, prompts, and templates',
            githubUrl: 'https://github.com/fr4iser90/PIDEA'
          });
        }
      }
    });
    app.use('/api/', speedLimiter);

    // Standard rate limiting
    const limiter = rateLimit({
      ...securityConfig.config.rateLimiting,
      skip: (req) => {
        // Skip rate limiting for authenticated users and public content
        return req.user || 
               req.path === '/api/health' || 
               req.path.startsWith('/web/') || 
               req.path.startsWith('/framework/') ||
               req.path.startsWith('/api/frameworks') ||
               req.path.startsWith('/api/prompts') ||
               req.path.startsWith('/api/templates');
      }
    });
    app.use('/api/', limiter);
  }

  setupBodyParsing(app, securityConfig) {
    // Cookie parsing
    app.use(cookieParser());

    // Body parsing with security limits
    app.use(express.json({ 
      limit: securityConfig.config.inputValidation.limits.maxBodySize,
      strict: true
    }));
    app.use(express.urlencoded({ 
      extended: true,
      limit: securityConfig.config.inputValidation.limits.maxBodySize
    }));
  }

  setupStaticFiles(app, securityConfig) {
    // Serve static files with security headers
    app.use('/web', express.static(path.join(__dirname, '../web'), {
      etag: false,
      lastModified: false,
      setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        // Add security headers to static files
        Object.entries(securityConfig.config.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
      }
    }));

    app.use('/framework', require('express').static(path.join(__dirname, '../framework')));
  }

  setupFrontendBuilding(app) {
    // Serve frontend build files in development
    if (process.env.NODE_ENV === 'development') {
      const frontendDistPath = path.join(__dirname, '../frontend/dist');
      const frontendPath = path.join(__dirname, '../frontend');
      
      if (!fs.existsSync(frontendDistPath)) {
        this.logger.info('🔨 Frontend dist not found, building automatically...');
        try {
          const { execSync } = require('child_process');
          
          // Check if frontend package.json exists
          if (fs.existsSync(path.join(frontendPath, 'package.json'))) {
            this.logger.info('📦 Installing frontend dependencies...');
            execSync('npm install', { 
              cwd: frontendPath, 
              stdio: 'inherit',
              timeout: 120000 // 2 minutes timeout
            });
            
            this.logger.info('🔨 Building frontend...');
            execSync('npm run build', { 
              cwd: frontendPath, 
              stdio: 'inherit',
              timeout: 180000 // 3 minutes timeout
            });
            
            this.logger.info('✅ Frontend built successfully!');
          } else {
            this.logger.warn('⚠️ Frontend package.json not found, skipping auto-build');
          }
        } catch (error) {
          this.logger.error('❌ Failed to build frontend automatically:', error.message);
          this.logger.info('💡 Please run: cd frontend && npm install && npm run build');
        }
      }
      
      if (fs.existsSync(frontendDistPath)) {
        app.use(express.static(frontendDistPath));
        this.logger.info('📁 Serving frontend from:', frontendDistPath);
      } else {
        this.logger.warn('⚠️ Frontend dist still not found, serving fallback');
      }
    }
  }
}

module.exports = MiddlewareSetup;
