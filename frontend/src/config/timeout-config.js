/**
 * Frontend Timeout Configuration
 * Centralized timeout values for frontend operations
 * Follows the same pattern as backend timeout configuration
 */

const TimeoutConfig = {
  // API Request Timeouts
  API: {
    DEFAULT: 30000,           // 30 seconds - for standard API calls
    ANALYSIS: 300000,         // 5 minutes - for analysis operations
    CHAT: 120000,             // 2 minutes - for chat operations
    QUICK: 10000,             // 10 seconds - for quick operations
    ULTRA_QUICK: 5000         // 5 seconds - for very quick operations
  },

  // UI Operations
  UI: {
    MODAL_HANDLING: 5000,     // 5 seconds - for modal operations
    ANIMATION: 300,           // 300ms - for UI animations
    DEBOUNCE: 1000,          // 1 second - for debounced operations
    TYPING_DELAY: 500,       // 500ms - for typing delays
    NOTIFICATION_DISMISS: 5000 // 5 seconds - for notification auto-dismiss
  },

  // Cache Operations
  CACHE: {
    INDEXEDDB_INIT: 5000,     // 5 seconds - for IndexedDB initialization
    INDEXEDDB_LOAD: 5000,     // 5 seconds - for IndexedDB load operations
    MEMORY_CACHE: 1000       // 1 second - for memory cache operations
  },

  // WebSocket Operations
  WEBSOCKET: {
    CONNECTION: 10000,        // 10 seconds - for WebSocket connection
    RECONNECT_DELAY: 2000,    // 2 seconds - for reconnection attempts
    MESSAGE_TIMEOUT: 5000     // 5 seconds - for message acknowledgment
  },

  // Authentication
  AUTH: {
    LOGIN_TIMEOUT: 30000,     // 30 seconds - for login operations
    SESSION_CHECK: 5000,      // 5 seconds - for session validation
    TOKEN_REFRESH: 10000,     // 10 seconds - for token refresh
    COOKIE_DELAY: 1000,       // 1 second - for cookie setting delay
    SESSION_TIMEOUT: 15 * 60 * 1000,  // 15 minutes - session timeout
    WARNING_THRESHOLD: 5 * 60 * 1000,  // 5 minutes - warning before expiry
    VALIDATION_INTERVAL: 2 * 60 * 1000, // 2 minutes - validation interval
    ACTIVITY_THRESHOLD: 30 * 1000      // 30 seconds - activity threshold
  },

  // IDE Operations
  IDE: {
    SWITCH_PORT: 10000,       // 10 seconds - for IDE port switching
    MESSAGE_SEND: 30000,      // 30 seconds - for sending IDE messages
    DOM_LOAD: 5000,          // 5 seconds - for DOM loading
    FEATURE_LOAD: 10000       // 10 seconds - for feature loading
  },

  // Check Intervals
  INTERVALS: {
    STATUS_CHECK: 5000,      // 5 seconds - for status checking
    PROGRESS_CHECK: 2000,    // 2 seconds - for progress checking
    ACTIVITY_TRACK: 1000     // 1 second - for activity tracking
  },

  // Retry Settings
  RETRY: {
    // Default retry configuration
    MAX_ATTEMPTS: 3,
    BACKOFF_MULTIPLIER: 1.5,
    INITIAL_DELAY: 1000,
    
    // Specific retry configurations for different operation types
    API: {
      MAX_ATTEMPTS: 3,
      BACKOFF_MULTIPLIER: 1.5,
      INITIAL_DELAY: 1000
    },
    
    WEBSOCKET: {
      MAX_ATTEMPTS: 5,
      BACKOFF_MULTIPLIER: 2.0,
      INITIAL_DELAY: 2000
    },
    
    IDE: {
      MAX_ATTEMPTS: 3,
      BACKOFF_MULTIPLIER: 1.5,
      INITIAL_DELAY: 1000
    },
    
    VOICE_INPUT: {
      MAX_ATTEMPTS: 2,
      BACKOFF_MULTIPLIER: 1.0,
      INITIAL_DELAY: 500
    },
    
    AUTO_FINISH: {
      MAX_ATTEMPTS: 3,
      BACKOFF_MULTIPLIER: 1.0,
      INITIAL_DELAY: 1000
    }
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

  getRetryConfig(type = 'DEFAULT') {
    const config = this.RETRY[type] || this.RETRY;
    return {
      maxAttempts: config.MAX_ATTEMPTS,
      backoffMultiplier: config.BACKOFF_MULTIPLIER,
      initialDelay: config.INITIAL_DELAY
    };
  },

  // Specific helper for API timeouts based on endpoint type
  getApiTimeout(endpoint) {
    if (endpoint.includes('/analysis/')) {
      return this.getTimeout('API', 'ANALYSIS');
    }
    if (endpoint.includes('/chat/')) {
      return this.getTimeout('API', 'CHAT');
    }
    if (endpoint.includes('/quick/') || endpoint.includes('/status/')) {
      return this.getTimeout('API', 'QUICK');
    }
    return this.getTimeout('API', 'DEFAULT');
  },

  // Helper for calculating retry delay with exponential backoff
  getRetryDelay(attempt, type = 'DEFAULT') {
    const config = this.getRetryConfig(type);
    return Math.min(
      config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
      30000 // Max 30 seconds
    );
  }
};

export default TimeoutConfig;
