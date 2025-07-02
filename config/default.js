module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },

  // Cursor IDE configuration
  cursorIDE: {
    debuggerUrl: process.env.CURSOR_DEBUGGER_URL || 'http://127.0.0.1:9222',
    connectionTimeout: 10000,
    retryAttempts: 3
  },

  // WebSocket configuration
  websocket: {
    port: process.env.WS_PORT || 3001,
    pingInterval: 30000,
    pingTimeout: 5000
  },

  // Chat configuration
  chat: {
    maxMessageLength: 10000,
    maxMessagesPerSession: 1000,
    messagePollingInterval: 5000
  },

  // Development configuration
  development: {
    hotReload: true,
    logLevel: 'debug',
    enableCors: true
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    timestamp: true
  }
}; 