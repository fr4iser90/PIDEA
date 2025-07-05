/**
 * CommandBus - Handles command execution and routing
 * Implements the Command Bus pattern for CQRS architecture
 */
class CommandBus {
  constructor() {
    this.handlers = new Map();
    this.middleware = [];
    this.logger = console;
  }

  /**
   * Register a command handler
   * @param {string} commandName - Name of the command
   * @param {Object} handler - Command handler instance
   */
  register(commandName, handler) {
    if (!handler || typeof handler.handle !== 'function') {
      throw new Error(`Invalid handler for command: ${commandName}`);
    }
    
    this.handlers.set(commandName, handler);
    this.logger.info(`[CommandBus] Registered handler for command: ${commandName}`);
  }

  /**
   * Execute a command
   * @param {string} commandName - Name of the command
   * @param {Object} commandData - Command data
   * @returns {Promise<Object>} Command execution result
   */
  async execute(commandName, commandData) {
    try {
      this.logger.info(`[CommandBus] Executing command: ${commandName}`, { commandData });

      // Apply middleware
      let processedCommandData = commandData;
      for (const middleware of this.middleware) {
        processedCommandData = await middleware(commandName, processedCommandData);
      }

      // Get handler
      const handler = this.handlers.get(commandName);
      if (!handler) {
        throw new Error(`No handler registered for command: ${commandName}`);
      }

      // Execute handler
      const result = await handler.handle(processedCommandData);
      
      this.logger.info(`[CommandBus] Command executed successfully: ${commandName}`);
      return result;
    } catch (error) {
      this.logger.error(`[CommandBus] Command execution failed: ${commandName}`, {
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
   * Check if a command has a handler
   * @param {string} commandName - Name of the command
   * @returns {boolean} True if handler exists
   */
  hasHandler(commandName) {
    return this.handlers.has(commandName);
  }

  /**
   * Get all registered command names
   * @returns {Array<string>} Array of command names
   */
  getRegisteredCommands() {
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

module.exports = CommandBus; 