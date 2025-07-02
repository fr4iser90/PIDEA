class EventBus {
  constructor() {
    this.handlers = new Map();
    this.middleware = [];
  }

  // Subscribe to events
  subscribe(eventName, handler) {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName).push(handler);
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
    console.log(`[EventBus] Publishing event: ${eventName}`, eventData);
    
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
          console.error(`[EventBus] Error in handler for ${eventName}:`, error);
          return Promise.resolve();
        }
      });
      
      await Promise.allSettled(promises);
    }
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