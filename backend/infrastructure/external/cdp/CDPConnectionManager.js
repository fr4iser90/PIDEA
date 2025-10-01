const { chromium } = require('playwright');
const Logger = require('@logging/Logger');
const ConnectionPool = require('../ConnectionPool');
const logger = new Logger('CDPConnectionManager');

/**
 * CDP Connection Manager for Workspace Detection
 * 
 * Manages Chrome DevTools Protocol connections specifically for workspace detection.
 * Provides optimized connection pooling and error handling for workspace detection operations.
 * 
 * @class CDPConnectionManager
 */
class CDPConnectionManager {
  constructor(options = {}) {
    this.options = {
      maxConnections: options.maxConnections || 5, // Smaller pool for workspace detection
      connectionTimeout: options.connectionTimeout || 5000, // Reduced timeout for faster failure detection
      healthCheckInterval: options.healthCheckInterval || 60000, // 1 minute - less frequent health checks
      cleanupInterval: options.cleanupInterval || 180000, // 3 minutes - less frequent cleanup
      host: options.host || '127.0.0.1',
      ...options
    };

    // Initialize connection pool specifically for workspace detection
    this.connectionPool = new ConnectionPool({
      maxConnections: this.options.maxConnections,
      connectionTimeout: this.options.connectionTimeout,
      healthCheckInterval: this.options.healthCheckInterval,
      cleanupInterval: this.options.cleanupInterval,
      host: this.options.host
    });

    // Workspace detection specific state
    this.workspaceDetectionCache = new Map(); // port -> {workspaceInfo, timestamp, ttl}
    this.detectionTimeouts = new Map(); // port -> timeout reference
    this.isInitialized = false;

    logger.debug('CDPConnectionManager initialized for workspace detection', {
      maxConnections: this.options.maxConnections,
      connectionTimeout: this.options.connectionTimeout
    });
  }

  /**
   * Initialize the CDP connection manager
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      logger.debug('CDPConnectionManager already initialized');
      return;
    }

    try {
      logger.debug('Initializing CDPConnectionManager...');
      
      // Test connection to ensure CDP is available
      await this.testCDPAvailability();
      
      this.isInitialized = true;
      logger.debug('CDPConnectionManager initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize CDPConnectionManager:', error.message);
      throw error;
    }
  }

  /**
   * Test CDP availability by attempting a connection
   * @returns {Promise<boolean>}
   */
  async testCDPAvailability() {
    try {
      // Try to connect to a common CDP port to test availability
      const testPorts = [9222, 9223, 9224];
      
      for (const port of testPorts) {
        try {
          const browser = await chromium.connectOverCDP(`http://${this.options.host}:${port}`, {
            timeout: 5000 // Short timeout for test
          });
          
          // If we can connect, CDP is available
          await browser.close();
          logger.debug(`CDP availability test passed on port ${port}`);
          return true;
          
        } catch (portError) {
          logger.debug(`CDP test failed on port ${port}: ${portError.message}`);
          continue;
        }
      }
      
      logger.warn('CDP availability test failed on all test ports');
      return false;
      
    } catch (error) {
      logger.error('CDP availability test failed:', error.message);
      return false;
    }
  }

  /**
   * Get a CDP connection for workspace detection
   * @param {number} port - The IDE port
   * @returns {Promise<Object>} Connection object with browser and page
   */
  async getWorkspaceDetectionConnection(port) {
    try {
      logger.debug(`Getting workspace detection connection for port ${port}`);
      
      // Get connection from pool
      const connection = await this.connectionPool.getConnection(port);
      
      if (!connection || !connection.browser || !connection.page) {
        throw new Error(`Invalid connection received for port ${port}`);
      }

      logger.debug(`Successfully obtained workspace detection connection for port ${port}`);
      return connection;
      
    } catch (error) {
      logger.error(`Failed to get workspace detection connection for port ${port}:`, error.message);
      throw error;
    }
  }

  /**
   * Execute workspace detection operation with connection management
   * @param {number} port - The IDE port
   * @param {Function} operation - The operation to execute with the connection
   * @returns {Promise<any>} Result of the operation
   */
  async executeWorkspaceDetection(port, operation) {
    const startTime = Date.now();
    
    try {
      logger.debug(`Executing workspace detection operation for port ${port}`);
      
      // Get connection
      const connection = await this.getWorkspaceDetectionConnection(port);
      
      // Execute the operation
      const result = await operation(connection);
      
      const duration = Date.now() - startTime;
      logger.debug(`Workspace detection operation completed for port ${port} in ${duration}ms`);
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Workspace detection operation failed for port ${port} after ${duration}ms:`, error.message);
      throw error;
    }
  }

  /**
   * Extract workspace information from IDE page
   * @param {Object} connection - Connection object with browser and page
   * @returns {Promise<Object>} Workspace information
   */
  async extractWorkspaceInfo(connection) {
    try {
      const { page } = connection;
      
      logger.debug('Extracting workspace information from IDE page');
      
      // Extract workspace info using multiple methods
      const workspaceInfo = await page.evaluate(() => {
        const info = {
          workspacePath: null,
          workspaceName: null,
          currentFile: null,
          ideType: null,
          extractionMethod: null
        };

        // Method 1: Extract from page title (most reliable for Cursor)
        const pageTitle = document.title;
        if (pageTitle) {
          // Format: "filename - workspace - Cursor" or "workspace - Cursor"
          const titleMatch = pageTitle.match(/([^-]+)\s*-\s*(?:Cursor|VSCode|Windsurf)/);
          if (titleMatch) {
            const workspaceName = titleMatch[1].trim();
            info.workspaceName = workspaceName;
            info.extractionMethod = 'page_title';
            
            // Determine IDE type from title
            if (pageTitle.includes('Cursor')) {
              info.ideType = 'cursor';
            } else if (pageTitle.includes('VSCode')) {
              info.ideType = 'vscode';
            } else if (pageTitle.includes('Windsurf')) {
              info.ideType = 'windsurf';
            }
          }
        }

        // Method 2: Try VS Code API
        if (!info.workspacePath && window.vscode) {
          try {
            if (window.vscode.workspace && window.vscode.workspace.workspaceFolders) {
              const workspaceFolder = window.vscode.workspace.workspaceFolders[0];
              if (workspaceFolder && workspaceFolder.uri) {
                info.workspacePath = workspaceFolder.uri.fsPath;
                info.workspaceName = workspaceFolder.name;
                info.extractionMethod = 'vscode_api';
              }
            }
          } catch (vscodeError) {
            // VS Code API not available or error
          }
        }

        // Method 3: Try to get current file
        if (window.vscode && window.vscode.window && window.vscode.window.activeTextEditor) {
          try {
            const activeEditor = window.vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document) {
              info.currentFile = activeEditor.document.uri.fsPath;
            }
          } catch (editorError) {
            // Active editor not available
          }
        }

        // Method 4: Try DOM elements
        if (!info.workspacePath) {
          const workspaceElements = document.querySelectorAll('[data-workspace], .workspace-name, .folder-name');
          for (const element of workspaceElements) {
            const workspaceData = element.getAttribute('data-workspace') || 
                                element.getAttribute('title') || 
                                element.textContent;
            if (workspaceData && workspaceData.includes('/')) {
              info.workspacePath = workspaceData;
              info.extractionMethod = 'dom_element';
              break;
            }
          }
        }

        return info;
      });

      logger.debug('Workspace information extracted:', {
        workspaceName: workspaceInfo.workspaceName,
        workspacePath: workspaceInfo.workspacePath,
        ideType: workspaceInfo.ideType,
        extractionMethod: workspaceInfo.extractionMethod
      });

      return workspaceInfo;
      
    } catch (error) {
      logger.error('Failed to extract workspace information:', error.message);
      throw error;
    }
  }

  /**
   * Cache workspace detection result
   * @param {number} port - The IDE port
   * @param {Object} workspaceInfo - Workspace information to cache
   * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
   */
  cacheWorkspaceDetection(port, workspaceInfo, ttl = 300000) {
    const cacheKey = `workspace-${port}`;
    const cacheEntry = {
      workspaceInfo,
      timestamp: Date.now(),
      ttl
    };

    this.workspaceDetectionCache.set(cacheKey, cacheEntry);

    // Clear any existing timeout
    if (this.detectionTimeouts.has(port)) {
      clearTimeout(this.detectionTimeouts.get(port));
    }

    // Set new timeout for cache expiration
    const timeout = setTimeout(() => {
      this.workspaceDetectionCache.delete(cacheKey);
      this.detectionTimeouts.delete(port);
      logger.debug(`Workspace detection cache expired for port ${port}`);
    }, ttl);

    this.detectionTimeouts.set(port, timeout);
    
    logger.debug(`Cached workspace detection result for port ${port} with TTL ${ttl}ms`);
  }

  /**
   * Get cached workspace detection result
   * @param {number} port - The IDE port
   * @returns {Object|null} Cached workspace information or null
   */
  getCachedWorkspaceDetection(port) {
    const cacheKey = `workspace-${port}`;
    const cacheEntry = this.workspaceDetectionCache.get(cacheKey);

    if (!cacheEntry) {
      return null;
    }

    // Check if cache is still valid
    const now = Date.now();
    if (now - cacheEntry.timestamp > cacheEntry.ttl) {
      this.workspaceDetectionCache.delete(cacheKey);
      if (this.detectionTimeouts.has(port)) {
        clearTimeout(this.detectionTimeouts.get(port));
        this.detectionTimeouts.delete(port);
      }
      return null;
    }

    logger.debug(`Using cached workspace detection result for port ${port}`);
    return cacheEntry.workspaceInfo;
  }

  /**
   * Clear workspace detection cache for a specific port
   * @param {number} port - The IDE port
   */
  clearWorkspaceDetectionCache(port) {
    const cacheKey = `workspace-${port}`;
    this.workspaceDetectionCache.delete(cacheKey);
    
    if (this.detectionTimeouts.has(port)) {
      clearTimeout(this.detectionTimeouts.get(port));
      this.detectionTimeouts.delete(port);
    }
    
    logger.debug(`Cleared workspace detection cache for port ${port}`);
  }

  /**
   * Clear all workspace detection cache
   */
  clearAllWorkspaceDetectionCache() {
    this.workspaceDetectionCache.clear();
    
    for (const timeout of this.detectionTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.detectionTimeouts.clear();
    
    logger.debug('Cleared all workspace detection cache');
  }

  /**
   * Get connection pool health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    const poolHealth = this.connectionPool.getHealth();
    const cacheSize = this.workspaceDetectionCache.size;
    
    return {
      ...poolHealth,
      cacheSize,
      isInitialized: this.isInitialized,
      cacheEntries: Array.from(this.workspaceDetectionCache.keys())
    };
  }

  /**
   * Get detailed statistics
   * @returns {Object} Statistics object
   */
  getStatistics() {
    const poolStats = this.connectionPool.getStats();
    
    return {
      connectionPool: poolStats,
      workspaceDetectionCache: {
        size: this.workspaceDetectionCache.size,
        entries: Array.from(this.workspaceDetectionCache.entries()).map(([key, value]) => ({
          key,
          timestamp: value.timestamp,
          ttl: value.ttl,
          age: Date.now() - value.timestamp
        }))
      },
      options: this.options
    };
  }

  /**
   * Cleanup and destroy the connection manager
   * @returns {Promise<void>}
   */
  async destroy() {
    logger.info('Destroying CDPConnectionManager...');
    
    try {
      // Clear all cache
      this.clearAllWorkspaceDetectionCache();
      
      // Destroy connection pool
      this.connectionPool.destroy();
      
      this.isInitialized = false;
      
      logger.info('CDPConnectionManager destroyed successfully');
      
    } catch (error) {
      logger.error('Error destroying CDPConnectionManager:', error.message);
      throw error;
    }
  }
}

module.exports = CDPConnectionManager;
