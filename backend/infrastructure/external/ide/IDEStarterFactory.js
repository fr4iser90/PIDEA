
/**
 * IDE Starter Factory
 * Manages IDE-specific starters using the factory pattern
 * Provides unified interface for starting different IDE types
 */

const CursorStarter = require('./starters/CursorStarter');
const VSCodeStarter = require('./starters/VSCodeStarter');
const WindsurfStarter = require('./starters/WindsurfStarter');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('IDEStarterFactory');

class IDEStarterFactory {
  constructor() {
    this.starters = new Map();
    this.runningProcesses = new Map(); // port -> process
    this.initializeDefaultStarters();
  }

  /**
   * Initialize default IDE starters
   */
  initializeDefaultStarters() {
    this.registerStarter('cursor', new CursorStarter());
    this.registerStarter('vscode', new VSCodeStarter());
    this.registerStarter('windsurf', new WindsurfStarter());
  }

  /**
   * Create starter by IDE type
   * @param {string} type - IDE type (cursor, vscode, windsurf)
   * @returns {Object} IDE starter instance
   */
  createStarter(type) {
    const starter = this.starters.get(type.toLowerCase());
    if (!starter) {
      throw new Error(`Unsupported IDE type: ${type}`);
    }
    return starter;
  }

  /**
   * Register new starter
   * @param {string} type - IDE type
   * @param {Object} starter - Starter instance
   */
  registerStarter(type, starter) {
    if (!starter || typeof starter.startIDE !== 'function') {
      throw new Error('Starter must implement startIDE method');
    }
    this.starters.set(type.toLowerCase(), starter);
  }

  /**
   * Get list of available starters
   * @returns {Array} Array of available IDE types
   */
  getAvailableStarters() {
    return Array.from(this.starters.keys());
  }

  /**
   * Start IDE with options
   * @param {string} type - IDE type
   * @param {number} port - Port to start IDE on
   * @param {string} workspacePath - Workspace path
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} IDE startup information
   */
  async startIDE(type, port, workspacePath = null, options = {}) {
    const starter = this.createStarter(type);
    
    if (this.runningProcesses.has(port)) {
      throw new Error(`IDE already running on port ${port}`);
    }

    try {
      const ideInfo = await starter.startIDE(port, workspacePath, options);
      
      // Track the process if the starter provides it
      if (ideInfo.process) {
        this.runningProcesses.set(port, ideInfo.process);
        
        // Handle process events if the process has event emitter capabilities
        if (typeof ideInfo.process.on === 'function') {
          ideInfo.process.on('close', (code) => {
            logger.info(`[IDEStarterFactory] ${type} IDE ${port} process closed with code ${code}`);
            this.runningProcesses.delete(port);
          });

          ideInfo.process.on('error', (error) => {
            logger.error(`[IDEStarterFactory] ${type} IDE ${port} process error:`, error);
            this.runningProcesses.delete(port);
          });
        }
      }

      return {
        ...ideInfo,
        ideType: type,
        port: port,
        workspacePath: workspacePath
      };
    } catch (error) {
      logger.error(`[IDEStarterFactory] Failed to start ${type} IDE:`, error);
      throw error;
    }
  }

  /**
   * Stop IDE on specific port
   * @param {number} port - Port of IDE to stop
   * @param {string} type - IDE type (optional, will be detected if not provided)
   * @returns {Promise<Object>} Stop result
   */
  async stopIDE(port, type = null) {
    const process = this.runningProcesses.get(port);
    
    if (!process) {
      throw new Error(`No IDE process found on port ${port}`);
    }

    try {
      // Try to detect IDE type if not provided
      if (!type) {
        type = this.detectIDEType(port);
      }

      const starter = this.createStarter(type);
      
      if (typeof starter.stopIDE === 'function') {
        await starter.stopIDE(port);
      } else {
        // Fallback: kill the process directly
        process.kill('SIGTERM');
      }

      this.runningProcesses.delete(port);
      
      return {
        port: port,
        status: 'stopped',
        ideType: type
      };
    } catch (error) {
      logger.error(`[IDEStarterFactory] Error stopping IDE on port ${port}:`, error);
      throw error;
    }
  }

  /**
   * Get running IDEs
   * @returns {Array} Array of running IDE information
   */
  getRunningIDEs() {
    const runningIDEs = [];
    
    for (const [port, process] of this.runningProcesses) {
      runningIDEs.push({
        port: parseInt(port),
        pid: process.pid,
        status: 'running',
        ideType: this.detectIDEType(port) || 'unknown'
      });
    }
    
    return runningIDEs;
  }

  /**
   * Check if IDE is running on port
   * @param {number} port - Port to check
   * @param {string} type - IDE type (optional)
   * @returns {boolean} True if IDE is running
   */
  isIDERunning(port, type = null) {
    const process = this.runningProcesses.get(port);
    
    if (!process) {
      return false;
    }

    // If type is specified, validate it matches
    if (type) {
      const detectedType = this.detectIDEType(port);
      return detectedType === type.toLowerCase();
    }

    return true;
  }

  /**
   * Detect IDE type for a port
   * @param {number} port - Port to check
   * @returns {string|null} IDE type or null if unknown
   */
  detectIDEType(port) {
    // This is a simplified detection - in practice, you might want to
    // check the process name or other characteristics
    if (port >= 9222 && port <= 9231) {
      return 'cursor';
    } else if (port >= 9232 && port <= 9241) {
      return 'vscode';
    } else if (port >= 9242 && port <= 9251) {
      return 'windsurf';
    }
    return null;
  }

  /**
   * Get starter configuration
   * @param {string} type - IDE type
   * @returns {Object} Starter configuration
   */
  getStarterConfig(type) {
    const starter = this.createStarter(type);
    if (typeof starter.getConfig === 'function') {
      return starter.getConfig();
    }
    return null;
  }

  /**
   * Validate starter implementation
   * @param {string} type - IDE type
   * @returns {boolean} True if starter is valid
   */
  validateStarter(type) {
    try {
      const starter = this.createStarter(type);
      const requiredMethods = ['startIDE'];
      
      return requiredMethods.every(method => 
        typeof starter[method] === 'function'
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Get starter statistics
   * @returns {Object} Statistics about available starters
   */
  getStarterStats() {
    const stats = {
      totalStarters: this.starters.size,
      availableTypes: this.getAvailableStarters(),
      validStarters: 0,
      runningIDEs: this.runningProcesses.size
    };

    for (const type of this.starters.keys()) {
      if (this.validateStarter(type)) {
        stats.validStarters++;
      }
    }

    return stats;
  }

  /**
   * Stop all running IDEs
   * @returns {Promise<Array>} Array of stopped IDE information
   */
  async stopAllIDEs() {
    const stoppedIDEs = [];
    const stopPromises = [];

    for (const [port, process] of this.runningProcesses) {
      stopPromises.push(
        this.stopIDE(parseInt(port))
          .then(result => stoppedIDEs.push(result))
          .catch(error => {
            logger.error(`[IDEStarterFactory] Error stopping IDE on port ${port}:`, error);
          })
      );
    }

    await Promise.allSettled(stopPromises);
    return stoppedIDEs;
  }
}

module.exports = IDEStarterFactory; 