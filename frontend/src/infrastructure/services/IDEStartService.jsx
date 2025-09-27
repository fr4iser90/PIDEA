/**
 * IDEStartService
 * Service for orchestrating IDE start functionality
 */

import { logger } from '@/infrastructure/logging/Logger';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';

class IDEStartService {
  constructor() {
    this.isStarting = false;
    this.startQueue = [];
    this.eventListeners = new Map();
  }

  /**
   * Start a new IDE instance
   * @param {Object} config - IDE configuration
   * @param {string} config.ideType - Type of IDE (cursor, vscode, windsurf)
   * @param {string} config.workspacePath - Workspace path (optional)
   * @param {Object} config.options - Additional options
   * @param {string|number} config.options.port - Port number or 'auto'
   * @param {string} config.options.executablePath - Custom executable path (optional)
   * @param {string} config.options.additionalFlags - Additional command line flags (optional)
   * @returns {Promise<Object>} - Result object with success status and data
   */
  async startIDE(config) {
    const { ideType, workspacePath, options = {} } = config;
    
    // Validate configuration
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Check if already starting
    if (this.isStarting) {
      logger.warn('IDE start already in progress, queuing request');
      return this.queueStartRequest(config);
    }

    this.isStarting = true;
    this.emit('startBegin', { config });

    try {
      logger.info('Starting IDE:', { ideType, workspacePath, options });

      // Prepare payload
      const payload = {
        ideType,
        workspacePath: workspacePath || null,
        options: {
          port: options.port || 'auto',
          executablePath: options.executablePath || null,
          additionalFlags: options.additionalFlags || null
        }
      };

      // Make API call
      const result = await apiCall('/api/ide/start', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (result.success) {
        logger.info('IDE started successfully:', result.data);
        this.emit('startSuccess', { config, result: result.data });
        return {
          success: true,
          data: result.data,
          config
        };
      } else {
        throw new Error(result.error || 'Failed to start IDE');
      }
    } catch (error) {
      logger.error('Error starting IDE:', error);
      this.emit('startError', { config, error: error.message });
      throw error;
    } finally {
      this.isStarting = false;
      this.processQueue();
    }
  }

  /**
   * Validate IDE configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} - Validation result
   */
  validateConfig(config) {
    const { ideType, options = {} } = config;

    // Validate IDE type
    const validIDETypes = ['cursor', 'vscode', 'windsurf'];
    if (!ideType || !validIDETypes.includes(ideType)) {
      return {
        valid: false,
        error: `Invalid IDE type. Must be one of: ${validIDETypes.join(', ')}`
      };
    }

    // Validate port if specified
    if (options.port && options.port !== 'auto') {
      const port = parseInt(options.port);
      const portRanges = {
        cursor: { min: 9222, max: 9231 },
        vscode: { min: 9232, max: 9241 },
        windsurf: { min: 9242, max: 9251 }
      };

      const range = portRanges[ideType];
      if (isNaN(port) || port < range.min || port > range.max) {
        return {
          valid: false,
          error: `Port must be between ${range.min} and ${range.max} for ${ideType}`
        };
      }
    }

    // Validate workspace path if provided
    if (config.workspacePath && typeof config.workspacePath !== 'string') {
      return {
        valid: false,
        error: 'Workspace path must be a string'
      };
    }

    return { valid: true };
  }

  /**
   * Queue a start request
   * @param {Object} config - Configuration to queue
   * @returns {Promise<Object>} - Promise that resolves when request is processed
   */
  queueStartRequest(config) {
    return new Promise((resolve, reject) => {
      this.startQueue.push({ config, resolve, reject });
    });
  }

  /**
   * Process queued start requests
   */
  async processQueue() {
    if (this.startQueue.length === 0) return;

    const { config, resolve, reject } = this.startQueue.shift();
    
    try {
      const result = await this.startIDE(config);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  }

  /**
   * Get available ports for an IDE type
   * @param {string} ideType - IDE type
   * @returns {Promise<Array>} - Array of available ports
   */
  async getAvailablePorts(ideType) {
    try {
      const result = await apiCall('/api/ide/available');
      if (result.success) {
        const usedPorts = (result.data.ides || result.data || []).map(ide => ide.port);
        const portRanges = {
          cursor: { min: 9222, max: 9231 },
          vscode: { min: 9232, max: 9241 },
          windsurf: { min: 9242, max: 9251 }
        };

        const range = portRanges[ideType];
        const available = [];
        
        for (let port = range.min; port <= range.max; port++) {
          if (!usedPorts.includes(port)) {
            available.push(port);
          }
        }
        
        return available;
      }
      return [];
    } catch (error) {
      logger.error('Error getting available ports:', error);
      return [];
    }
  }


  /**
   * Get IDE features for a specific IDE type
   * @param {string} ideType - IDE type
   * @returns {Object} - IDE features
   */
  getIDEFeatures(ideType) {
    const features = {
      cursor: {
        hasChat: true,
        hasTerminal: true,
        hasGit: true,
        hasExtensions: true,
        hasRefactoring: true,
        hasAI: true
      },
      vscode: {
        hasChat: false,
        hasTerminal: true,
        hasGit: true,
        hasExtensions: true,
        hasRefactoring: true,
        hasAI: false
      },
      windsurf: {
        hasChat: true,
        hasTerminal: true,
        hasGit: true,
        hasExtensions: true,
        hasRefactoring: true,
        hasAI: true
      }
    };

    return features[ideType] || {};
  }

  /**
   * Get IDE metadata
   * @param {string} ideType - IDE type
   * @returns {Object} - IDE metadata
   */
  getIDEMetadata(ideType) {
    const metadata = {
      cursor: {
        displayName: 'Cursor',
        description: 'AI-powered code editor',
        icon: '🎯',
        version: '1.0.0'
      },
      vscode: {
        displayName: 'VS Code',
        description: 'Microsoft Visual Studio Code',
        icon: '📝',
        version: '1.0.0'
      },
      windsurf: {
        displayName: 'Windsurf',
        description: 'AI-powered development environment',
        icon: '🌊',
        version: '1.0.0'
      }
    };

    return metadata[ideType] || {};
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error('Error in event listener:', error);
        }
      });
    }
  }

  /**
   * Get service status
   * @returns {Object} - Service status
   */
  getStatus() {
    return {
      isStarting: this.isStarting,
      queueLength: this.startQueue.length,
      hasListeners: this.eventListeners.size > 0
    };
  }

  /**
   * Reset service state
   */
  reset() {
    this.isStarting = false;
    this.startQueue = [];
    this.eventListeners.clear();
    logger.info('IDEStartService reset');
  }
}

// Create singleton instance
const ideStartService = new IDEStartService();

export default ideStartService;
