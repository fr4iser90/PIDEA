const ServiceLogger = require('@logging/ServiceLogger');
/**
 * QueryBus - Handles query execution and routing
 * Implements the Query Bus pattern for CQRS architecture
 */
class QueryBus {
  constructor() {
    this.handlers = new Map();
    this.middleware = [];
    this.logger = new ServiceLogger('QueryBus');
  }

  /**
   * Register a query handler
   * @param {string} queryName - Name of the query
   * @param {Object} handler - Query handler instance
   */
  register(queryName, handler) {
    if (!handler || typeof handler.handle !== 'function') {
      throw new Error(`Invalid handler for query: ${queryName}`);
    }
    
    this.handlers.set(queryName, handler);
    this.logger.info(`Registered handler for query: ${queryName}`);
  }

  /**
   * Execute a query
   * @param {string} queryName - Name of the query
   * @param {Object} queryData - Query data
   * @returns {Promise<Object>} Query execution result
   */
  async execute(queryName, queryData) {
    try {
      this.logger.info(`Executing query: ${queryName}`);

      // Apply middleware
      let processedQueryData = queryData;
      for (const middleware of this.middleware) {
        processedQueryData = await middleware(queryName, processedQueryData);
      }

      // Get handler
      const handler = this.handlers.get(queryName);
      if (!handler) {
        throw new Error(`No handler registered for query: ${queryName}`);
      }

      // Execute handler
      const result = await handler.handle(processedQueryData);
      
      this.logger.info(`Query executed successfully: ${queryName}`);
      return result;
    } catch (error) {
      this.logger.error(`Query execution failed: ${queryName}`, {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Add middleware
   * @param {Function} middleware - Middleware function
   */
  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }
    this.middleware.push(middleware);
  }

  /**
   * Check if a query has a handler
   * @param {string} queryName - Name of the query
   * @returns {boolean} True if handler exists
   */
  hasHandler(queryName) {
    return this.handlers.has(queryName);
  }

  /**
   * Get all registered query names
   * @returns {Array<string>} Array of query names
   */
  getRegisteredQueries() {
    return Array.from(this.handlers.keys());
  }

  /**
   * Clear all handlers
   */
  clear() {
    this.handlers.clear();
    this.middleware = [];
  }

  /**
   * Set logger
   * @param {Object} logger - Logger instance
   */
  setLogger(logger) {
    this.logger = logger;
  }
}

module.exports = QueryBus; 