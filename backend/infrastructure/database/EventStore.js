/**
 * Event Store - Event Sourcing Implementation
 * 
 * Provides event sourcing capabilities for domain aggregates
 * Stores events in chronological order and supports event replay
 */

const { v4: uuidv4 } = require('uuid');
const Logger = require('@logging/Logger');

class EventStore {
  constructor(databaseConnection) {
    this.databaseConnection = databaseConnection;
    this.logger = new Logger('EventStore');
  }

  /**
   * Store a domain event
   * @param {string} aggregateId - ID of the aggregate root
   * @param {string} aggregateType - Type of the aggregate (Task, Project, etc.)
   * @param {string} eventType - Type of the event (Created, Updated, Deleted, etc.)
   * @param {Object} eventData - Event data
   * @param {Object} metadata - Additional metadata
   * @param {string} userId - User who triggered the event
   * @param {string} correlationId - Correlation ID for tracking related events
   * @param {string} causationId - Causation ID for tracking event chains
   * @returns {Promise<string>} Event ID
   */
  async storeEvent(aggregateId, aggregateType, eventType, eventData, metadata = {}, userId = 'system', correlationId = null, causationId = null) {
    try {
      const eventId = uuidv4();
      const eventVersion = await this.getNextEventVersion(aggregateId);
      
      const event = {
        id: eventId,
        aggregate_id: aggregateId,
        aggregate_type: aggregateType,
        event_type: eventType,
        event_version: eventVersion,
        event_data: JSON.stringify(eventData),
        metadata: JSON.stringify(metadata),
        user_id: userId,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        correlation_id: correlationId,
        causation_id: causationId
      };

      const sql = `
        INSERT INTO event_store (
          id, aggregate_id, aggregate_type, event_type, event_version,
          event_data, metadata, user_id, timestamp, created_at,
          correlation_id, causation_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.databaseConnection.execute(sql, [
        event.id,
        event.aggregate_id,
        event.aggregate_type,
        event.event_type,
        event.event_version,
        event.event_data,
        event.metadata,
        event.user_id,
        event.timestamp,
        event.created_at,
        event.correlation_id,
        event.causation_id
      ]);

      this.logger.debug(`Event stored: ${eventType} for ${aggregateType}:${aggregateId}`);
      return eventId;

    } catch (error) {
      this.logger.error('Error storing event:', error);
      throw new Error(`Failed to store event: ${error.message}`);
    }
  }

  /**
   * Get events for an aggregate
   * @param {string} aggregateId - ID of the aggregate root
   * @param {number} fromVersion - Starting version (optional)
   * @param {number} toVersion - Ending version (optional)
   * @returns {Promise<Array>} Array of events
   */
  async getEvents(aggregateId, fromVersion = 0, toVersion = null) {
    try {
      let sql = `
        SELECT id, aggregate_id, aggregate_type, event_type, event_version,
               event_data, metadata, user_id, timestamp, created_at,
               correlation_id, causation_id
        FROM event_store
        WHERE aggregate_id = ?
      `;
      
      const params = [aggregateId];

      if (fromVersion > 0) {
        sql += ' AND event_version >= ?';
        params.push(fromVersion);
      }

      if (toVersion !== null) {
        sql += ' AND event_version <= ?';
        params.push(toVersion);
      }

      sql += ' ORDER BY event_version ASC';

      const rows = await this.databaseConnection.query(sql, params);
      
      return rows.map(row => ({
        id: row.id,
        aggregateId: row.aggregate_id,
        aggregateType: row.aggregate_type,
        eventType: row.event_type,
        eventVersion: row.event_version,
        eventData: JSON.parse(row.event_data),
        metadata: JSON.parse(row.metadata),
        userId: row.user_id,
        timestamp: row.timestamp,
        createdAt: row.created_at,
        correlationId: row.correlation_id,
        causationId: row.causation_id
      }));

    } catch (error) {
      this.logger.error('Error getting events:', error);
      throw new Error(`Failed to get events: ${error.message}`);
    }
  }

  /**
   * Get the next event version for an aggregate
   * @param {string} aggregateId - ID of the aggregate root
   * @returns {Promise<number>} Next version number
   */
  async getNextEventVersion(aggregateId) {
    try {
      const sql = `
        SELECT COALESCE(MAX(event_version), 0) + 1 as next_version
        FROM event_store
        WHERE aggregate_id = ?
      `;

      const rows = await this.databaseConnection.query(sql, [aggregateId]);
      return rows[0].next_version;

    } catch (error) {
      this.logger.error('Error getting next event version:', error);
      throw new Error(`Failed to get next event version: ${error.message}`);
    }
  }

  /**
   * Create a snapshot of an aggregate
   * @param {string} aggregateId - ID of the aggregate root
   * @param {string} aggregateType - Type of the aggregate
   * @param {Object} snapshotData - Snapshot data
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<string>} Snapshot ID
   */
  async createSnapshot(aggregateId, aggregateType, snapshotData, metadata = {}) {
    try {
      const snapshotId = uuidv4();
      const snapshotVersion = await this.getNextEventVersion(aggregateId);

      const sql = `
        INSERT INTO event_store_snapshots (
          id, aggregate_id, aggregate_type, snapshot_version,
          snapshot_data, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      await this.databaseConnection.execute(sql, [
        snapshotId,
        aggregateId,
        aggregateType,
        snapshotVersion,
        JSON.stringify(snapshotData),
        JSON.stringify(metadata),
        new Date().toISOString()
      ]);

      this.logger.debug(`Snapshot created for ${aggregateType}:${aggregateId} at version ${snapshotVersion}`);
      return snapshotId;

    } catch (error) {
      this.logger.error('Error creating snapshot:', error);
      throw new Error(`Failed to create snapshot: ${error.message}`);
    }
  }

  /**
   * Get the latest snapshot for an aggregate
   * @param {string} aggregateId - ID of the aggregate root
   * @returns {Promise<Object|null>} Latest snapshot or null
   */
  async getLatestSnapshot(aggregateId) {
    try {
      const sql = `
        SELECT id, aggregate_id, aggregate_type, snapshot_version,
               snapshot_data, metadata, created_at
        FROM event_store_snapshots
        WHERE aggregate_id = ?
        ORDER BY snapshot_version DESC
        LIMIT 1
      `;

      const rows = await this.databaseConnection.query(sql, [aggregateId]);
      
      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
      return {
        id: row.id,
        aggregateId: row.aggregate_id,
        aggregateType: row.aggregate_type,
        snapshotVersion: row.snapshot_version,
        snapshotData: JSON.parse(row.snapshot_data),
        metadata: JSON.parse(row.metadata),
        createdAt: row.created_at
      };

    } catch (error) {
      this.logger.error('Error getting latest snapshot:', error);
      throw new Error(`Failed to get latest snapshot: ${error.message}`);
    }
  }

  /**
   * Replay events to reconstruct aggregate state
   * @param {string} aggregateId - ID of the aggregate root
   * @param {Function} eventHandler - Function to handle each event
   * @param {Object} initialState - Initial state for replay
   * @returns {Promise<Object>} Final state after replay
   */
  async replayEvents(aggregateId, eventHandler, initialState = {}) {
    try {
      const events = await this.getEvents(aggregateId);
      let state = { ...initialState };

      for (const event of events) {
        state = await eventHandler(state, event);
      }

      return state;

    } catch (error) {
      this.logger.error('Error replaying events:', error);
      throw new Error(`Failed to replay events: ${error.message}`);
    }
  }

  /**
   * Get events by correlation ID
   * @param {string} correlationId - Correlation ID
   * @returns {Promise<Array>} Array of events
   */
  async getEventsByCorrelationId(correlationId) {
    try {
      const sql = `
        SELECT id, aggregate_id, aggregate_type, event_type, event_version,
               event_data, metadata, user_id, timestamp, created_at,
               correlation_id, causation_id
        FROM event_store
        WHERE correlation_id = ?
        ORDER BY timestamp ASC
      `;

      const rows = await this.databaseConnection.query(sql, [correlationId]);
      
      return rows.map(row => ({
        id: row.id,
        aggregateId: row.aggregate_id,
        aggregateType: row.aggregate_type,
        eventType: row.event_type,
        eventVersion: row.event_version,
        eventData: JSON.parse(row.event_data),
        metadata: JSON.parse(row.metadata),
        userId: row.user_id,
        timestamp: row.timestamp,
        createdAt: row.created_at,
        correlationId: row.correlation_id,
        causationId: row.causation_id
      }));

    } catch (error) {
      this.logger.error('Error getting events by correlation ID:', error);
      throw new Error(`Failed to get events by correlation ID: ${error.message}`);
    }
  }

  /**
   * Get events by user ID
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of events to return
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} Array of events
   */
  async getEventsByUserId(userId, limit = 100, offset = 0) {
    try {
      const sql = `
        SELECT id, aggregate_id, aggregate_type, event_type, event_version,
               event_data, metadata, user_id, timestamp, created_at,
               correlation_id, causation_id
        FROM event_store
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `;

      const rows = await this.databaseConnection.query(sql, [userId, limit, offset]);
      
      return rows.map(row => ({
        id: row.id,
        aggregateId: row.aggregate_id,
        aggregateType: row.aggregate_type,
        eventType: row.event_type,
        eventVersion: row.event_version,
        eventData: JSON.parse(row.event_data),
        metadata: JSON.parse(row.metadata),
        userId: row.user_id,
        timestamp: row.timestamp,
        createdAt: row.created_at,
        correlationId: row.correlation_id,
        causationId: row.causation_id
      }));

    } catch (error) {
      this.logger.error('Error getting events by user ID:', error);
      throw new Error(`Failed to get events by user ID: ${error.message}`);
    }
  }

  /**
   * Get event statistics
   * @returns {Promise<Object>} Event statistics
   */
  async getEventStatistics() {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_events,
          COUNT(DISTINCT aggregate_id) as unique_aggregates,
          COUNT(DISTINCT aggregate_type) as unique_aggregate_types,
          COUNT(DISTINCT event_type) as unique_event_types,
          COUNT(DISTINCT user_id) as unique_users,
          MIN(timestamp) as first_event,
          MAX(timestamp) as last_event
        FROM event_store
      `;

      const rows = await this.databaseConnection.query(sql);
      return rows[0];

    } catch (error) {
      this.logger.error('Error getting event statistics:', error);
      throw new Error(`Failed to get event statistics: ${error.message}`);
    }
  }
}

module.exports = EventStore;
