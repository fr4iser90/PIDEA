/**
 * Centralized Timeout Configuration
 * All timeout values for the application in one place
 */

const TimeoutConfig = {
  // AI Response Timeouts
  AI_RESPONSE: {
    DEFAULT: 300000,        // 5 minutes - for complex AI responses
    SIMPLE: 120000,         // 2 minutes - for simple responses
    QUICK: 60000,           // 1 minute - for quick confirmations
    ULTRA_QUICK: 30000      // 30 seconds - for very quick operations
  },

  // IDE Operations
  IDE: {
    SEND_MESSAGE: 300000,   // 5 minutes - for sending messages and waiting for response
    CREATE_CHAT: 30000,     // 30 seconds - for creating new chat
    SWITCH_PORT: 10000,     // 10 seconds - for switching IDE ports
    MODAL_HANDLING: 5000    // 5 seconds - for modal operations
  },

  // Workflow Steps
  WORKFLOW: {
    CONFIRMATION: 60000,    // 1 minute - for confirmation steps
    VALIDATION: 120000,     // 2 minutes - for validation steps
    ANALYSIS: 300000,       // 5 minutes - for analysis steps
    TESTING: 180000,        // 3 minutes - for test execution
    DEV_SERVER: 30000       // 30 seconds - for dev server startup
  },

  // Browser Operations
  BROWSER: {
    PAGE_LOAD: 30000,       // 30 seconds - for page loading
    ELEMENT_WAIT: 10000,    // 10 seconds - for element waiting
    CLICK_OPERATION: 5000,  // 5 seconds - for click operations
    TYPING: 3000            // 3 seconds - for typing operations
  },

  // Check Intervals
  INTERVALS: {
    AI_RESPONSE_CHECK: 2000,    // 2 seconds - for AI response checking
    ELEMENT_CHECK: 1000,        // 1 second - for element checking
    STATUS_CHECK: 5000          // 5 seconds - for status checking
  },

  // Retry Settings
  RETRY: {
    MAX_ATTEMPTS: 3,
    BACKOFF_MULTIPLIER: 1.5,
    INITIAL_DELAY: 1000
  },

  // Helper methods
  getTimeout(type, category = 'DEFAULT') {
    const config = this[type];
    if (!config) {
      throw new Error(`Unknown timeout type: ${type}`);
    }
    return config[category] || config.DEFAULT || 30000;
  },

  getInterval(type) {
    return this.INTERVALS[type] || 1000;
  },

  getRetryConfig() {
    return {
      maxAttempts: this.RETRY.MAX_ATTEMPTS,
      backoffMultiplier: this.RETRY.BACKOFF_MULTIPLIER,
      initialDelay: this.RETRY.INITIAL_DELAY
    };
  }
};

module.exports = TimeoutConfig; 