/**
 * EventStore - Event sourcing infrastructure
 * Implements event store pattern for DDD applications
 * 
 * Created: 2025-01-27
 * Purpose: Event sourcing and event store implementation
 */

const Logger = require("@logging/Logger");
const EventBus = require("@infrastructure/messaging/EventBus");

class EventStore {
  constructor(options = {}) {
    this.logger = options.logger || new Logger("EventStore");
    this.eventBus = options.eventBus || new EventBus();
    
    // Event storage
    this.events = new Map(); // streamId -> events[]
    this.snapshots = new Map(); // streamId -> snapshot
    this.eventTypes = new Map(); // eventType -> handler
    
    // Configuration
    this.snapshotThreshold = options.snapshotThreshold || 100;
    this.maxEventsPerStream = options.maxEventsPerStream || 10000;
    this.enableCompression = options.enableCompression !== false;
  }

  /**
   * Append events to stream
   * @param {string} streamId - Stream identifier
   * @param {Array} events - Events to append
   * @param {number} expectedVersion - Expected stream version
   */
  async appendEvents(streamId, events, expectedVersion = -1) {
    try {
      this.logger.debug(`Appending ${events.length} events to stream: ${streamId}`);

      // Validate events
      this.validateEvents(events);

      // Check expected version
      const currentVersion = this.getStreamVersion(streamId);
      if (expectedVersion !== -1 && currentVersion !== expectedVersion) {
        throw new Error(`Concurrency conflict: expected version ${expectedVersion}, got ${currentVersion}`);
      }

      // Store events
      if (!this.events.has(streamId)) {
        this.events.set(streamId, []);
      }

      const streamEvents = this.events.get(streamId);
      const startVersion = streamEvents.length;

      events.forEach((event, index) => {
        const eventData = {
          ...event,
          streamId,
          version: startVersion + index,
          timestamp: new Date().toISOString(),
          id: this.generateEventId()
        };

        streamEvents.push(eventData);

        // Emit event stored
        this.eventBus.emit('event.stored', eventData);
      });

      // Check if snapshot is needed
      if (streamEvents.length % this.snapshotThreshold === 0) {
        await this.createSnapshot(streamId);
      }

      // Emit events appended
      this.eventBus.emit('events.appended', {
        streamId,
        eventCount: events.length,
        version: startVersion + events.length - 1
      });

      return {
        streamId,
        version: startVersion + events.length - 1,
        eventCount: events.length
      };

    } catch (error) {
      this.logger.error(`Failed to append events to stream ${streamId}:`, error);
      throw error;
    }
  }

  /**
   * Get events from stream
   * @param {string} streamId - Stream identifier
   * @param {number} fromVersion - Starting version
   * @param {number} toVersion - Ending version
   */
  async getEvents(streamId, fromVersion = 0, toVersion = -1) {
    try {
      const streamEvents = this.events.get(streamId) || [];
      
      if (toVersion === -1) {
        toVersion = streamEvents.length - 1;
      }

      const events = streamEvents.slice(fromVersion, toVersion + 1);
      
      this.logger.debug(`Retrieved ${events.length} events from stream: ${streamId}`);
      
      return events;
    } catch (error) {
      this.logger.error(`Failed to get events from stream ${streamId}:`, error);
      throw error;
    }
  }

  /**
   * Get stream version
   * @param {string} streamId - Stream identifier
   */
  getStreamVersion(streamId) {
    const streamEvents = this.events.get(streamId);
    return streamEvents ? streamEvents.length - 1 : -1;
  }

  /**
   * Create snapshot for stream
   * @param {string} streamId - Stream identifier
   * @param {Object} snapshot - Snapshot data
   */
  async createSnapshot(streamId, snapshot = null) {
    try {
      const streamEvents = this.events.get(streamId) || [];
      const version = streamEvents.length - 1;

      const snapshotData = {
        streamId,
        version,
        data: snapshot,
        timestamp: new Date().toISOString(),
        eventCount: streamEvents.length
      };

      this.snapshots.set(streamId, snapshotData);

      // Emit snapshot created
      this.eventBus.emit('snapshot.created', snapshotData);

      this.logger.debug(`Snapshot created for stream: ${streamId} at version ${version}`);
      
      return snapshotData;
    } catch (error) {
      this.logger.error(`Failed to create snapshot for stream ${streamId}:`, error);
      throw error;
    }
  }

  /**
   * Get snapshot for stream
   * @param {string} streamId - Stream identifier
   */
  async getSnapshot(streamId) {
    return this.snapshots.get(streamId) || null;
  }

  /**
   * Replay events from snapshot
   * @param {string} streamId - Stream identifier
   * @param {Function} handler - Event handler function
   */
  async replayEvents(streamId, handler) {
    try {
      // Start from snapshot if available
      const snapshot = await this.getSnapshot(streamId);
      let startVersion = 0;

      if (snapshot) {
        startVersion = snapshot.version + 1;
        this.logger.debug(`Replaying from snapshot version ${snapshot.version}`);
      }

      // Get events from start version
      const events = await this.getEvents(streamId, startVersion);
      
      // Replay events
      for (const event of events) {
        await handler(event);
      }

      this.logger.debug(`Replayed ${events.length} events for stream: ${streamId}`);
      
      return events.length;
    } catch (error) {
      this.logger.error(`Failed to replay events for stream ${streamId}:`, error);
      throw error;
    }
  }

  /**
   * Register event type handler
   * @param {string} eventType - Event type
   * @param {Function} handler - Event handler
   */
  registerEventType(eventType, handler) {
    this.eventTypes.set(eventType, handler);
    this.logger.debug(`Event type registered: ${eventType}`);
  }

  /**
   * Validate events
   * @param {Array} events - Events to validate
   */
  validateEvents(events) {
    if (!Array.isArray(events)) {
      throw new Error('Events must be an array');
    }

    events.forEach((event, index) => {
      if (!event.type) {
        throw new Error(`Event at index ${index} missing type`);
      }
      if (!event.data) {
        throw new Error(`Event at index ${index} missing data`);
      }
    });
  }

  /**
   * Generate unique event ID
   * @returns {string} Event ID
   */
  generateEventId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get event store statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    const streamCount = this.events.size;
    const snapshotCount = this.snapshots.size;
    const totalEvents = Array.from(this.events.values())
      .reduce((sum, events) => sum + events.length, 0);

    return {
      streamCount,
      snapshotCount,
      totalEvents,
      snapshotThreshold: this.snapshotThreshold,
      maxEventsPerStream: this.maxEventsPerStream
    };
  }

  /**
   * Clear all data (for testing)
   */
  clear() {
    this.events.clear();
    this.snapshots.clear();
    this.eventTypes.clear();
    this.logger.info('Event store cleared');
  }
}

module.exports = EventStore;
