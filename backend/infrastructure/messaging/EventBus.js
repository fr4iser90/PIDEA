const ServiceLogger = require('@logging/ServiceLogger');

class EventBus {
  constructor() {
    this.handlers = new Map();
    this.middleware = [];
    this.logger = new ServiceLogger('EventBus');
  }

  // Subscribe to events
  subscribe(eventName, handler) {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName).push(handler);
  }

  // Alias for subscribe (for compatibility with tests)
  on(eventName, handler) {
    return this.subscribe(eventName, handler);
  }

  // Unsubscribe from events
  unsubscribe(eventName, handler) {
    if (this.handlers.has(eventName)) {
      const handlers = this.handlers.get(eventName);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Publish events
  async publish(eventName, eventData) {
    this.logger.info(`Publishing event: ${eventName}`);
    
    // Apply middleware
    let processedEventData = eventData;
    for (const middleware of this.middleware) {
      processedEventData = await middleware(eventName, processedEventData);
    }

    // Execute handlers
    if (this.handlers.has(eventName)) {
      const handlers = this.handlers.get(eventName);
      const promises = handlers.map(handler => {
        try {
          return handler(processedEventData);
        } catch (error) {
          logger.error(`Error in handler for ${eventName}:`, error);
          return Promise.resolve();
        }
      });
      
      await Promise.allSettled(promises);
    }
  }

  // Alias for publish (for compatibility with services that use emit)
  async emit(eventName, eventData) {
    return this.publish(eventName, eventData);
  }

  // Add middleware
  use(middleware) {
    this.middleware.push(middleware);
  }

  // Clear all handlers
  clear() {
    this.handlers.clear();
  }

  // Get handler count for an event
  getHandlerCount(eventName) {
    return this.handlers.has(eventName) ? this.handlers.get(eventName).length : 0;
  }
}

module.exports = EventBus; 