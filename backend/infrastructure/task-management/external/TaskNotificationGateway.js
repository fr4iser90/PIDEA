/**
 * TaskNotificationGateway - External gateway for task notifications
 * Implements external communication for task domain
 * 
 * Created: 2025-01-27
 * Purpose: External task notification integration following DDD patterns
 */

const Logger = require("@logging/Logger");
const EventBus = require("@infrastructure/messaging/EventBus");

class TaskNotificationGateway {
  constructor(options = {}) {
    this.logger = options.logger || new Logger("TaskNotificationGateway");
    this.eventBus = options.eventBus || new EventBus();
    
    // External service configurations
    this.notificationServices = new Map();
    this.retryAttempts = options.retryAttempts || 3;
    this.timeout = options.timeout || 5000;
  }

  /**
   * Register notification service
   * @param {string} serviceName - Service name
   * @param {Object} config - Service configuration
   */
  registerNotificationService(serviceName, config) {
    this.notificationServices.set(serviceName, {
      url: config.url,
      apiKey: config.apiKey,
      timeout: config.timeout || this.timeout,
      retryAttempts: config.retryAttempts || this.retryAttempts,
      ...config
    });
    
    this.logger.info(`Notification service registered: ${serviceName}`);
  }

  /**
   * Send task notification
   * @param {string} taskId - Task ID
   * @param {string} notificationType - Type of notification
   * @param {Object} data - Notification data
   * @param {Object} options - Notification options
   */
  async sendTaskNotification(taskId, notificationType, data, options = {}) {
    try {
      this.logger.debug(`Sending task notification: ${taskId} - ${notificationType}`);

      // Emit notification started event
      this.eventBus.emit('task.notification.started', {
        taskId,
        notificationType,
        timestamp: new Date().toISOString()
      });

      const results = [];
      
      // Send to all registered services
      for (const [serviceName, config] of this.notificationServices) {
        try {
          const result = await this.sendToService(serviceName, config, {
            taskId,
            notificationType,
            data,
            ...options
          });
          
          results.push({ serviceName, success: true, result });
          
        } catch (error) {
          this.logger.error(`Notification failed for service ${serviceName}:`, error);
          results.push({ serviceName, success: false, error: error.message });
        }
      }

      // Emit notification completed event
      this.eventBus.emit('task.notification.completed', {
        taskId,
        notificationType,
        results,
        timestamp: new Date().toISOString()
      });

      return results;

    } catch (error) {
      // Emit notification failed event
      this.eventBus.emit('task.notification.failed', {
        taskId,
        notificationType,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      this.logger.error(`Task notification failed: ${taskId}`, error);
      throw error;
    }
  }

  /**
   * Send notification to specific service
   * @param {string} serviceName - Service name
   * @param {Object} config - Service configuration
   * @param {Object} payload - Notification payload
   */
  async sendToService(serviceName, config, payload) {
    const axios = require('axios');
    
    const requestConfig = {
      method: 'POST',
      url: config.url,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'User-Agent': 'PIDEA-TaskGateway/1.0'
      },
      data: payload
    };

    let lastError;
    for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
      try {
        const response = await axios(requestConfig);
        return {
          status: response.status,
          data: response.data,
          attempt
        };
      } catch (error) {
        lastError = error;
        if (attempt < config.retryAttempts) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Get notification service health
   * @param {string} serviceName - Service name
   */
  async getServiceHealth(serviceName) {
    const config = this.notificationServices.get(serviceName);
    if (!config) {
      return { status: 'unknown', error: 'Service not found' };
    }

    try {
      const axios = require('axios');
      const healthUrl = config.healthUrl || `${config.url}/health`;
      
      const response = await axios.get(healthUrl, {
        timeout: 5000,
        headers: { 'Authorization': `Bearer ${config.apiKey}` }
      });

      return {
        status: 'healthy',
        service: serviceName,
        responseTime: response.headers['x-response-time'] || 'unknown',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: serviceName,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get all registered services
   * @returns {Array} Service names
   */
  getRegisteredServices() {
    return Array.from(this.notificationServices.keys());
  }
}

module.exports = TaskNotificationGateway;
