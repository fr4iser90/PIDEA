const Logger = require('@logging/Logger');
const path = require('path');
const fs = require('fs');
const logger = new Logger('CDPWorkspaceDetector');

/**
 * CDP-Based Workspace Detector
 * 
 * Modern workspace detection using Chrome DevTools Protocol (CDP) instead of terminal-based approach.
 * Provides faster, more reliable workspace detection across different IDE types.
 * 
 * @class CDPWorkspaceDetector
 */
class CDPWorkspaceDetector {
  constructor(cdpConnectionManager, options = {}) {
    this.cdpManager = cdpConnectionManager;
    this.options = {
      cacheTimeout: options.cacheTimeout || 300000, // 5 minutes
      maxSearchDepth: options.maxSearchDepth || 10,
      enableFallback: options.enableFallback !== false, // Default true
      ...options
    };

    // Workspace detection state
    this.detectionHistory = new Map(); // port -> detection history
    this.isInitialized = false;

    logger.info('CDPWorkspaceDetector initialized', {
      cacheTimeout: this.options.cacheTimeout,
      maxSearchDepth: this.options.maxSearchDepth,
      enableFallback: this.options.enableFallback
    });
  }

  /**
   * Initialize the workspace detector
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      logger.debug('CDPWorkspaceDetector already initialized');
      return;
    }

    try {
      logger.info('Initializing CDPWorkspaceDetector...');
      
      // Initialize CDP connection manager
      await this.cdpManager.initialize();
      
      this.isInitialized = true;
      logger.info('CDPWorkspaceDetector initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize CDPWorkspaceDetector:', error.message);
      throw error;
    }
  }

  /**
   * Detect workspace information for a specific IDE port
   * @param {number} port - The IDE port
   * @returns {Promise<Object|null>} Workspace information or null
   */
  async detectWorkspace(port) {
    const startTime = Date.now();
    
    try {
      logger.info(`Starting workspace detection for port ${port}`);
      
      // Check cache first
      const cachedResult = this.cdpManager.getCachedWorkspaceDetection(port);
      if (cachedResult) {
        logger.info(`Using cached workspace detection for port ${port}`);
        return cachedResult;
      }

      // Perform new detection
      const workspaceInfo = await this.cdpManager.executeWorkspaceDetection(
        port,
        async (connection) => {
          return await this.cdpManager.extractWorkspaceInfo(connection);
        }
      );

      if (!workspaceInfo) {
        logger.warn(`No workspace information extracted for port ${port}`);
        return null;
      }

      // Resolve workspace path if we have workspace name
      if (workspaceInfo.workspaceName && !workspaceInfo.workspacePath) {
        workspaceInfo.workspacePath = await this.resolveWorkspacePath(workspaceInfo.workspaceName);
      }

      // Validate workspace path
      if (workspaceInfo.workspacePath) {
        workspaceInfo.isValid = await this.validateWorkspacePath(workspaceInfo.workspacePath);
      }

      // Add metadata
      workspaceInfo.port = port;
      workspaceInfo.detectionTime = Date.now();
      workspaceInfo.detectionDuration = Date.now() - startTime;

      // Cache the result
      this.cdpManager.cacheWorkspaceDetection(port, workspaceInfo, this.options.cacheTimeout);

      // Record detection history
      this.recordDetectionHistory(port, workspaceInfo);

      logger.info(`Workspace detection completed for port ${port}:`, {
        workspacePath: workspaceInfo.workspacePath,
        workspaceName: workspaceInfo.workspaceName,
        ideType: workspaceInfo.ideType,
        detectionDuration: workspaceInfo.detectionDuration
      });

      return workspaceInfo;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Workspace detection failed for port ${port} after ${duration}ms:`, error.message);
      
      // Record failed detection
      this.recordDetectionHistory(port, { error: error.message, detectionTime: Date.now() });
      
      return null;
    }
  }

  /**
   * Resolve workspace path from workspace name
   * @param {string} workspaceName - The workspace name
   * @returns {Promise<string|null>} Resolved workspace path or null
   */
  async resolveWorkspacePath(workspaceName) {
    try {
      logger.debug(`Resolving workspace path for: ${workspaceName}`);
      
      // Common workspace directories to search
      const searchPaths = [
        '/home/fr4iser/Documents/Git',
        '/home/fr4iser/Documents',
        '/home/fr4iser/Projects',
        '/home/fr4iser/Code',
        process.cwd()
      ];
      
      // First, try exact match
      for (const searchPath of searchPaths) {
        if (fs.existsSync(searchPath)) {
          const exactPath = path.join(searchPath, workspaceName);
          if (fs.existsSync(exactPath)) {
            logger.debug(`Found exact workspace path: ${exactPath}`);
            return exactPath;
          }
        }
      }
      
      // Then try partial matches (contains workspace name)
      for (const searchPath of searchPaths) {
        if (fs.existsSync(searchPath)) {
          try {
            const entries = fs.readdirSync(searchPath);
            for (const entry of entries) {
              const fullPath = path.join(searchPath, entry);
              if (fs.statSync(fullPath).isDirectory() && 
                  entry.toLowerCase().includes(workspaceName.toLowerCase())) {
                logger.debug(`Found partial match workspace path: ${fullPath}`);
                return fullPath;
              }
            }
          } catch (readError) {
            logger.debug(`Could not read directory ${searchPath}: ${readError.message}`);
          }
        }
      }
      
      // Fallback: search upward from current directory
      let currentDir = process.cwd();
      const maxDepth = this.options.maxSearchDepth;
      let depth = 0;
      
      while (currentDir !== '/' && depth < maxDepth) {
        const workspacePath = path.join(currentDir, workspaceName);
        
        if (fs.existsSync(workspacePath)) {
          logger.debug(`Found workspace path in parent directory: ${workspacePath}`);
          return workspacePath;
        }
        
        // Move up one directory
        currentDir = path.dirname(currentDir);
        depth++;
      }
      
      logger.warn(`Could not resolve workspace path for: ${workspaceName}`);
      return null;
      
    } catch (error) {
      logger.error(`Error resolving workspace path for ${workspaceName}:`, error.message);
      return null;
    }
  }

  /**
   * Validate workspace path
   * @param {string} workspacePath - The workspace path to validate
   * @returns {Promise<boolean>} True if valid, false otherwise
   */
  async validateWorkspacePath(workspacePath) {
    try {
      if (!workspacePath || typeof workspacePath !== 'string') {
        return false;
      }

      // Check if path exists
      if (!fs.existsSync(workspacePath)) {
        logger.debug(`Workspace path does not exist: ${workspacePath}`);
        return false;
      }

      // Check if it's a directory
      const stats = fs.statSync(workspacePath);
      if (!stats.isDirectory()) {
        logger.debug(`Workspace path is not a directory: ${workspacePath}`);
        return false;
      }

      // Check if it's accessible
      try {
        fs.accessSync(workspacePath, fs.constants.R_OK);
      } catch (accessError) {
        logger.debug(`Workspace path is not accessible: ${workspacePath}`);
        return false;
      }

      logger.debug(`Workspace path is valid: ${workspacePath}`);
      return true;

    } catch (error) {
      logger.error(`Error validating workspace path ${workspacePath}:`, error.message);
      return false;
    }
  }

  /**
   * Detect workspace for multiple ports
   * @param {Array<number>} ports - Array of IDE ports
   * @returns {Promise<Array>} Array of detection results
   */
  async detectWorkspacesForPorts(ports) {
    logger.info(`Starting workspace detection for ${ports.length} ports`);
    
    const results = [];
    
    for (const port of ports) {
      try {
        const workspaceInfo = await this.detectWorkspace(port);
        results.push({
          port,
          success: !!workspaceInfo,
          workspaceInfo,
          timestamp: Date.now()
        });
      } catch (error) {
        logger.error(`Failed to detect workspace for port ${port}:`, error.message);
        results.push({
          port,
          success: false,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    logger.info(`Workspace detection completed: ${successCount}/${ports.length} successful`);
    
    return results;
  }

  /**
   * Get Git information for a workspace
   * @param {string} workspacePath - The workspace path
   * @returns {Promise<Object|null>} Git information or null
   */
  async getGitInformation(workspacePath) {
    try {
      if (!workspacePath || !fs.existsSync(workspacePath)) {
        return null;
      }

      const gitPath = path.join(workspacePath, '.git');
      if (!fs.existsSync(gitPath)) {
        logger.debug(`No Git repository found at: ${workspacePath}`);
        return { isGitRepo: false };
      }

      const gitInfo = {
        isGitRepo: true,
        gitRoot: workspacePath,
        gitPath: gitPath
      };

      // Get Git configuration
      try {
        const { execSync } = require('child_process');
        const config = execSync('git config --list', { 
          cwd: workspacePath, 
          encoding: 'utf8',
          timeout: 5000
        });
        
        const configLines = config.split('\n').filter(line => line.trim());
        gitInfo.config = {};
        
        for (const line of configLines) {
          const [key, value] = line.split('=');
          if (key && value) {
            gitInfo.config[key] = value;
          }
        }
      } catch (configError) {
        gitInfo.configError = configError.message;
      }

      // Get current branch
      try {
        const { execSync } = require('child_process');
        const branch = execSync('git branch --show-current', { 
          cwd: workspacePath, 
          encoding: 'utf8',
          timeout: 5000
        }).trim();
        gitInfo.currentBranch = branch;
      } catch (branchError) {
        gitInfo.branchError = branchError.message;
      }

      // Get remote information
      try {
        const { execSync } = require('child_process');
        const remotes = execSync('git remote -v', { 
          cwd: workspacePath, 
          encoding: 'utf8',
          timeout: 5000
        });
        
        const remoteLines = remotes.split('\n').filter(line => line.trim());
        gitInfo.remotes = {};
        
        for (const line of remoteLines) {
          const parts = line.split('\t');
          if (parts.length >= 2) {
            const name = parts[0];
            const url = parts[1].split(' ')[0];
            gitInfo.remotes[name] = url;
          }
        }
      } catch (remoteError) {
        gitInfo.remoteError = remoteError.message;
      }

      logger.debug(`Git information extracted for: ${workspacePath}`);
      return gitInfo;

    } catch (error) {
      logger.error(`Error getting Git information for ${workspacePath}:`, error.message);
      return { isGitRepo: false, error: error.message };
    }
  }

  /**
   * Get comprehensive workspace information including Git data
   * @param {number} port - The IDE port
   * @returns {Promise<Object|null>} Comprehensive workspace information
   */
  async getComprehensiveWorkspaceInfo(port) {
    try {
      logger.info(`Getting comprehensive workspace info for port ${port}`);
      
      // Get basic workspace info
      const workspaceInfo = await this.detectWorkspace(port);
      if (!workspaceInfo || !workspaceInfo.workspacePath) {
        return workspaceInfo;
      }

      // Get Git information
      const gitInfo = await this.getGitInformation(workspaceInfo.workspacePath);
      
      // Combine information
      const comprehensiveInfo = {
        ...workspaceInfo,
        git: gitInfo,
        hasGit: gitInfo && gitInfo.isGitRepo,
        timestamp: Date.now()
      };

      logger.info(`Comprehensive workspace info retrieved for port ${port}:`, {
        workspacePath: comprehensiveInfo.workspacePath,
        hasGit: comprehensiveInfo.hasGit,
        ideType: comprehensiveInfo.ideType
      });

      return comprehensiveInfo;

    } catch (error) {
      logger.error(`Error getting comprehensive workspace info for port ${port}:`, error.message);
      return null;
    }
  }

  /**
   * Record detection history for a port
   * @param {number} port - The IDE port
   * @param {Object} result - Detection result
   */
  recordDetectionHistory(port, result) {
    if (!this.detectionHistory.has(port)) {
      this.detectionHistory.set(port, []);
    }

    const history = this.detectionHistory.get(port);
    history.push({
      ...result,
      timestamp: Date.now()
    });

    // Keep only last 10 detections
    if (history.length > 10) {
      history.shift();
    }

    logger.debug(`Recorded detection history for port ${port}`);
  }

  /**
   * Get detection history for a port
   * @param {number} port - The IDE port
   * @returns {Array} Detection history
   */
  getDetectionHistory(port) {
    return this.detectionHistory.get(port) || [];
  }

  /**
   * Clear detection history for a port
   * @param {number} port - The IDE port
   */
  clearDetectionHistory(port) {
    this.detectionHistory.delete(port);
    logger.debug(`Cleared detection history for port ${port}`);
  }

  /**
   * Clear all detection history
   */
  clearAllDetectionHistory() {
    this.detectionHistory.clear();
    logger.debug('Cleared all detection history');
  }

  /**
   * Get detector statistics
   * @returns {Object} Statistics object
   */
  getStatistics() {
    const totalDetections = Array.from(this.detectionHistory.values())
      .reduce((sum, history) => sum + history.length, 0);

    const successfulDetections = Array.from(this.detectionHistory.values())
      .reduce((sum, history) => sum + history.filter(h => !h.error).length, 0);

    return {
      totalDetections,
      successfulDetections,
      successRate: totalDetections > 0 ? (successfulDetections / totalDetections) * 100 : 0,
      portsWithHistory: this.detectionHistory.size,
      options: this.options,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Cleanup and destroy the detector
   * @returns {Promise<void>}
   */
  async destroy() {
    logger.info('Destroying CDPWorkspaceDetector...');
    
    try {
      // Clear all history
      this.clearAllDetectionHistory();
      
      // Clear CDP manager cache
      this.cdpManager.clearAllWorkspaceDetectionCache();
      
      this.isInitialized = false;
      
      logger.info('CDPWorkspaceDetector destroyed successfully');
      
    } catch (error) {
      logger.error('Error destroying CDPWorkspaceDetector:', error.message);
      throw error;
    }
  }
}

module.exports = CDPWorkspaceDetector;
