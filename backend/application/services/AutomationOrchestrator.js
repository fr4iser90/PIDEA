/**
 * AutomationOrchestrator - Main automation coordinator
 * Handles automatic version detection scheduling and workflow coordination
 */

const Logger = require('@logging/Logger');
const logger = new Logger('AutomationOrchestrator');

class AutomationOrchestrator {
  constructor(dependencies = {}) {
    this.versionManagementService = dependencies.versionManagementService;
    this.logger = dependencies.logger || logger;
    this.scheduler = dependencies.scheduler;
    this.isRunning = false;
    this.scheduledTasks = new Map();
    this.defaultInterval = 30 * 60 * 1000; // 30 minutes
    this.eventHandlers = new Map();
  }

  /**
   * Start automatic version detection
   * @param {Object} options - Configuration options
   * @returns {Promise<boolean>} True if started successfully
   */
  async startAutomaticDetection(options = {}) {
    try {
      if (this.isRunning) {
        this.logger.warn('Automatic detection is already running');
        return true;
      }

      this.logger.info('Starting automatic version detection');
      
      const config = {
        interval: options.interval || this.defaultInterval,
        ideTypes: options.ideTypes || ['cursor', 'vscode', 'windsurf'],
        ports: options.ports || { cursor: 9222, vscode: 9232, windsurf: 9242 },
        ...options
      };

      // Start detection for each IDE type
      for (const ideType of config.ideTypes) {
        const port = config.ports[ideType];
        if (port) {
          await this.scheduleDetection(ideType, port, config.interval);
        }
      }

      this.isRunning = true;
      this.logger.info(`Automatic detection started for ${config.ideTypes.length} IDE types`);
      return true;

    } catch (error) {
      this.logger.error('Failed to start automatic detection:', error.message);
      return false;
    }
  }

  /**
   * Stop automatic version detection
   * @returns {Promise<boolean>} True if stopped successfully
   */
  async stopAutomaticDetection() {
    try {
      if (!this.isRunning) {
        this.logger.warn('Automatic detection is not running');
        return true;
      }

      this.logger.info('Stopping automatic version detection');

      // Clear all scheduled tasks
      for (const [key, task] of this.scheduledTasks) {
        if (task.intervalId) {
          clearInterval(task.intervalId);
        }
        if (task.timeoutId) {
          clearTimeout(task.timeoutId);
        }
      }

      this.scheduledTasks.clear();
      this.isRunning = false;

      this.logger.info('Automatic detection stopped');
      return true;

    } catch (error) {
      this.logger.error('Failed to stop automatic detection:', error.message);
      return false;
    }
  }

  /**
   * Schedule detection for specific IDE type
   * @param {string} ideType - IDE type
   * @param {number} port - IDE port
   * @param {number} interval - Detection interval in milliseconds
   * @returns {Promise<boolean>} True if scheduled successfully
   */
  async scheduleDetection(ideType, port, interval) {
    try {
      const taskKey = `${ideType}:${port}`;
      
      if (this.scheduledTasks.has(taskKey)) {
        this.logger.warn(`Detection already scheduled for ${ideType} on port ${port}`);
        return true;
      }

      this.logger.info(`Scheduling detection for ${ideType} on port ${port} (interval: ${interval}ms)`);

      // Create scheduled task
      const task = {
        ideType,
        port,
        interval,
        lastRun: null,
        nextRun: Date.now() + interval,
        runCount: 0,
        successCount: 0,
        errorCount: 0
      };

      // Schedule the detection
      const intervalId = setInterval(async () => {
        await this.runDetectionTask(task);
      }, interval);

      task.intervalId = intervalId;
      this.scheduledTasks.set(taskKey, task);

      // Run initial detection
      await this.runDetectionTask(task);

      this.logger.info(`Detection scheduled successfully for ${ideType} on port ${port}`);
      return true;

    } catch (error) {
      this.logger.error(`Failed to schedule detection for ${ideType} on port ${port}:`, error.message);
      return false;
    }
  }

  /**
   * Run detection task
   * @param {Object} task - Task configuration
   * @returns {Promise<void>}
   */
  async runDetectionTask(task) {
    try {
      task.lastRun = new Date().toISOString();
      task.runCount++;
      task.nextRun = Date.now() + task.interval;

      this.logger.info(`Running detection task for ${task.ideType} on port ${task.port} (run #${task.runCount})`);

      // Run the detection workflow
      const result = await this.versionManagementService.detectAndUpdateVersion(task.ideType, task.port);
      
      if (result.success) {
        task.successCount++;
        this.logger.info(`Detection task completed successfully for ${task.ideType} on port ${task.port}`);
        
        // Emit success event
        this.emitEvent('detection_success', {
          ideType: task.ideType,
          port: task.port,
          result
        });
      } else {
        task.errorCount++;
        this.logger.error(`Detection task failed for ${task.ideType} on port ${task.port}: ${result.error}`);
        
        // Emit error event
        this.emitEvent('detection_error', {
          ideType: task.ideType,
          port: task.port,
          error: result.error
        });
      }

    } catch (error) {
      task.errorCount++;
      this.logger.error(`Detection task error for ${task.ideType} on port ${task.port}:`, error.message);
      
      // Emit error event
      this.emitEvent('detection_error', {
        ideType: task.ideType,
        port: task.port,
        error: error.message
      });
    }
  }

  /**
   * Handle detection result
   * @param {Object} result - Detection result
   * @returns {Promise<void>}
   */
  async handleDetectionResult(result) {
    try {
      this.logger.info(`Handling detection result for ${result.ideType} on port ${result.port}`);

      if (result.success) {
        this.logger.info(`Detection successful: ${result.ideType} version ${result.finalVersion}`);
        
        // Handle successful detection
        if (result.isNewVersion) {
          this.logger.info(`New version detected: ${result.ideType} ${result.finalVersion}`);
          
          // Emit new version event
          this.emitEvent('new_version_detected', {
            ideType: result.ideType,
            version: result.finalVersion,
            port: result.port,
            result
          });
        }
      } else {
        this.logger.error(`Detection failed: ${result.ideType} on port ${result.port} - ${result.error}`);
        
        // Handle detection failure
        this.emitEvent('detection_failed', {
          ideType: result.ideType,
          port: result.port,
          error: result.error
        });
      }

    } catch (error) {
      this.logger.error('Error handling detection result:', error.message);
    }
  }

  /**
   * Add event handler
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  addEventHandler(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    
    this.eventHandlers.get(event).push(handler);
    this.logger.info(`Added event handler for ${event}`);
  }

  /**
   * Remove event handler
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  removeEventHandler(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        this.logger.info(`Removed event handler for ${event}`);
      }
    }
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emitEvent(event, data) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.logger.error(`Error in event handler for ${event}:`, error.message);
        }
      });
    }
  }

  /**
   * Get scheduled tasks status
   * @returns {Array} Task status information
   */
  getScheduledTasksStatus() {
    const status = [];
    
    for (const [key, task] of this.scheduledTasks) {
      status.push({
        key,
        ideType: task.ideType,
        port: task.port,
        interval: task.interval,
        lastRun: task.lastRun,
        nextRun: new Date(task.nextRun).toISOString(),
        runCount: task.runCount,
        successCount: task.successCount,
        errorCount: task.errorCount,
        successRate: task.runCount > 0 ? (task.successCount / task.runCount * 100).toFixed(2) + '%' : '0%'
      });
    }

    return status;
  }

  /**
   * Get orchestrator statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const tasks = this.getScheduledTasksStatus();
    const totalRuns = tasks.reduce((sum, task) => sum + task.runCount, 0);
    const totalSuccesses = tasks.reduce((sum, task) => sum + task.successCount, 0);
    const totalErrors = tasks.reduce((sum, task) => sum + task.errorCount, 0);

    return {
      isRunning: this.isRunning,
      scheduledTasks: tasks.length,
      totalRuns,
      totalSuccesses,
      totalErrors,
      successRate: totalRuns > 0 ? (totalSuccesses / totalRuns * 100).toFixed(2) + '%' : '0%',
      eventHandlers: Array.from(this.eventHandlers.keys()),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = AutomationOrchestrator;
