const express = require('express');
const router = express.Router();

/**
 * IDE Routes - Professional RESTful API Design
 * 
 * This module provides a clean, modular approach to IDE management endpoints
 * including IDE control, workspace detection, and configuration management.
 */

class IDERoutes {
  constructor(ideController, ideFeatureController, ideConfigurationController, authMiddleware) {
    this.ideController = ideController;
    this.ideFeatureController = ideFeatureController;
    this.ideConfigurationController = ideConfigurationController;
    this.authMiddleware = authMiddleware;
  }

  /**
   * Setup all IDE routes
   * @param {Express.Router} app - Express app instance
   */
  setupRoutes(app) {
    // Apply authentication middleware to all IDE routes
    app.use('/api/ide', this.authMiddleware.authenticate());

    // ========================================
    // IDE CONTROL ROUTES - Basic IDE Operations
    // ========================================
    
    // Get available IDEs
    app.get('/api/ide/available', (req, res) => this.ideController.getAvailableIDEs(req, res));
    
    // Start IDE
    app.post('/api/ide/start', (req, res) => this.ideController.startIDE(req, res));
    
    // Switch to specific IDE
    app.post('/api/ide/switch/:port', (req, res) => this.ideController.switchIDE(req, res));
    
    // Stop IDE
    app.delete('/api/ide/stop/:port', (req, res) => this.ideController.stopIDE(req, res));
    
    // Get IDE status
    app.get('/api/ide/status', (req, res) => this.ideController.getStatus(req, res));
    
    // Restart user app
    app.post('/api/ide/restart-app', (req, res) => this.ideController.restartUserApp(req, res));

    // ========================================
    // IDE FEATURES ROUTES - Feature Management
    // ========================================
    
    // Get IDE features
    app.get('/api/ide/features', (req, res) => this.ideFeatureController.getIDEFeatures(req, res));

    // ========================================
    // WORKSPACE ROUTES - Workspace Management
    // ========================================
    
    // Get user app URL
    app.get('/api/ide/user-app-url', (req, res) => this.ideController.getUserAppUrl(req, res));
    
    // Get user app URL for specific port
    app.get('/api/ide/user-app-url/:port', (req, res) => this.ideController.getUserAppUrlForPort(req, res));
    
    // Monitor terminal
    app.post('/api/ide/monitor-terminal', (req, res) => this.ideController.monitorTerminal(req, res));
    
    // Set workspace path
    app.post('/api/ide/set-workspace/:port', (req, res) => this.ideController.setWorkspacePath(req, res));
    
    // Get workspace info
    app.get('/api/ide/workspace-info', (req, res) => this.ideController.getWorkspaceInfo(req, res));
    
    // Detect workspace paths
    app.post('/api/ide/detect-workspace-paths', (req, res) => this.ideController.detectWorkspacePaths(req, res));
    
    // Click new chat
    app.post('/api/ide/new-chat/:port', (req, res) => this.ideController.clickNewChat(req, res));

    // ========================================
    // WORKSPACE DETECTION ROUTES - Detection Management
    // ========================================
    
    // Detect all workspaces
    app.get('/api/ide/workspace-detection', (req, res) => this.ideController.detectAllWorkspaces(req, res));
    
    // Detect workspace for specific IDE
    app.get('/api/ide/workspace-detection/:port', (req, res) => this.ideController.detectWorkspaceForIDE(req, res));
    
    // Force detect workspace for IDE
    app.post('/api/ide/workspace-detection/:port', (req, res) => this.ideController.forceDetectWorkspaceForIDE(req, res));
    
    // Get detection stats
    app.get('/api/ide/workspace-detection/stats', (req, res) => this.ideController.getDetectionStats(req, res));
    
    // Clear detection results
    app.delete('/api/ide/workspace-detection/results', (req, res) => this.ideController.clearDetectionResults(req, res));
    
    // Execute terminal command
    app.post('/api/ide/workspace-detection/:port/execute', (req, res) => this.ideController.executeTerminalCommand(req, res));

    // ========================================
    // IDE CONFIGURATION ROUTES - Configuration Management
    // ========================================
    
    // Get download links
    app.get('/api/ide/configurations/download-links', (req, res) => this.ideConfigurationController.getDownloadLinks(req, res));
    
    // Get executable paths
    app.get('/api/ide/configurations/executable-paths', (req, res) => this.ideConfigurationController.getExecutablePaths(req, res));
    
    // Save executable paths
    app.post('/api/ide/configurations/executable-paths', (req, res) => this.ideConfigurationController.saveExecutablePaths(req, res));
    
    // Validate path
    app.post('/api/ide/configurations/validate-path', (req, res) => this.ideConfigurationController.validatePath(req, res));

    // ========================================
    // VSCode-SPECIFIC ROUTES - VSCode Integration
    // ========================================
    
    // Start VSCode
    app.post('/api/ide/start-vscode', (req, res) => this.ideController.startVSCode(req, res));
    
    // Get VSCode extensions
    app.get('/api/ide/vscode/:port/extensions', (req, res) => this.ideController.getVSCodeExtensions(req, res));
    
    // Get VSCode workspace info
    app.get('/api/ide/vscode/:port/workspace-info', (req, res) => this.ideController.getVSCodeWorkspaceInfo(req, res));
    
    // Send message to VSCode
    app.post('/api/ide/vscode/send-message', (req, res) => this.ideController.sendMessageToVSCode(req, res));
    
    // Get VSCode status
    app.get('/api/ide/vscode/:port/status', (req, res) => this.ideController.getVSCodeStatus(req, res));

    // ========================================
    // TERMINAL LOG ROUTES - Terminal Management
    // ========================================
    
    // Apply auth middleware to terminal log routes
    app.use('/api/terminal-logs/:port', this.authMiddleware.authenticate());
    
    // Initialize terminal log capture
    app.post('/api/terminal-logs/:port/initialize', (req, res) => this.ideController.initializeTerminalLogCapture(req, res));
    
    // Execute terminal command with capture
    app.post('/api/terminal-logs/:port/execute', (req, res) => this.ideController.executeTerminalCommandWithCapture(req, res));
    
    // Get terminal logs
    app.get('/api/terminal-logs/:port', (req, res) => this.ideController.getTerminalLogs(req, res));
    
    // Search terminal logs
    app.get('/api/terminal-logs/:port/search', (req, res) => this.ideController.searchTerminalLogs(req, res));
    
    // Export terminal logs
    app.get('/api/terminal-logs/:port/export', (req, res) => this.ideController.exportTerminalLogs(req, res));
    
    // Delete terminal logs
    app.delete('/api/terminal-logs/:port', (req, res) => this.ideController.deleteTerminalLogs(req, res));
    
    // Get terminal log capture status
    app.get('/api/terminal-logs/:port/capture-status', (req, res) => this.ideController.getTerminalLogCaptureStatus(req, res));
  }
}

module.exports = IDERoutes;
