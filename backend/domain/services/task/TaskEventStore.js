const Logger = require('@logging/Logger');

/**
 * TaskEventStore - Event sourcing for task status changes
 * Tracks all task status changes as immutable events for audit and recovery
 */
class TaskEventStore {
    constructor(databaseConnection, eventBus = null) {
        this.databaseConnection = databaseConnection;
        this.eventBus = eventBus;
        this.logger = new Logger('TaskEventStore');
    }

    /**
     * Record a task status change event
     * @param {string} taskId - Task ID
     * @param {string} fromStatus - Previous status
     * @param {string} toStatus - New status
     * @param {Object} metadata - Additional event metadata
     * @param {string} userId - User who triggered the change
     * @returns {Promise<Object>} Recorded event
     */
    async recordStatusChangeEvent(taskId, fromStatus, toStatus, metadata = {}, userId = 'system') {
        try {
            const event = {
                id: this.generateEventId(),
                taskId,
                eventType: 'status_change',
                fromStatus,
                toStatus,
                metadata: JSON.stringify(metadata),
                userId,
                timestamp: new Date().toISOString(),
                createdAt: new Date().toISOString()
            };

            // Store event in database
            await this.storeEvent(event);

            // Emit event to event bus if available
            if (this.eventBus) {
                this.eventBus.emit('task:status:change', event);
            }

            this.logger.info('Task status change event recorded', {
                taskId,
                fromStatus,
                toStatus,
                eventId: event.id
            });

            return event;

        } catch (error) {
            this.logger.error('Failed to record status change event', {
                taskId,
                fromStatus,
                toStatus,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Record a file movement event
     * @param {string} taskId - Task ID
     * @param {string} fromPath - Source path
     * @param {string} toPath - Destination path
     * @param {Object} metadata - Additional event metadata
     * @param {string} userId - User who triggered the change
     * @returns {Promise<Object>} Recorded event
     */
    async recordFileMovementEvent(taskId, fromPath, toPath, metadata = {}, userId = 'system') {
        try {
            const event = {
                id: this.generateEventId(),
                taskId,
                eventType: 'file_movement',
                fromPath,
                toPath,
                metadata: JSON.stringify(metadata),
                userId,
                timestamp: new Date().toISOString(),
                createdAt: new Date().toISOString()
            };

            // Store event in database
            await this.storeEvent(event);

            // Emit event to event bus if available
            if (this.eventBus) {
                this.eventBus.emit('task:file:movement', event);
            }

            this.logger.info('Task file movement event recorded', {
                taskId,
                fromPath,
                toPath,
                eventId: event.id
            });

            return event;

        } catch (error) {
            this.logger.error('Failed to record file movement event', {
                taskId,
                fromPath,
                toPath,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Record a content hash validation event
     * @param {string} taskId - Task ID
     * @param {string} contentHash - Content hash
     * @param {boolean} isValid - Whether hash is valid
     * @param {Object} metadata - Additional event metadata
     * @param {string} userId - User who triggered the validation
     * @returns {Promise<Object>} Recorded event
     */
    async recordContentHashValidationEvent(taskId, contentHash, isValid, metadata = {}, userId = 'system') {
        try {
            const event = {
                id: this.generateEventId(),
                taskId,
                eventType: 'content_hash_validation',
                contentHash,
                isValid,
                metadata: JSON.stringify(metadata),
                userId,
                timestamp: new Date().toISOString(),
                createdAt: new Date().toISOString()
            };

            // Store event in database
            await this.storeEvent(event);

            // Emit event to event bus if available
            if (this.eventBus) {
                this.eventBus.emit('task:content:hash:validation', event);
            }

            this.logger.info('Task content hash validation event recorded', {
                taskId,
                contentHash,
                isValid,
                eventId: event.id
            });

            return event;

        } catch (error) {
            this.logger.error('Failed to record content hash validation event', {
                taskId,
                contentHash,
                isValid,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get events for a specific task
     * @param {string} taskId - Task ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Task events
     */
    async getTaskEvents(taskId, options = {}) {
        try {
            const { limit = 100, offset = 0, eventType = null } = options;

            let query = `
                SELECT * FROM task_file_events 
                WHERE task_id = $1
            `;
            const params = [taskId];

            if (eventType) {
                query += ` AND event_type = $2`;
                params.push(eventType);
            }

            query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(limit, offset);

            const result = await this.databaseConnection.query(query, params);
            
            this.logger.debug('Retrieved task events', {
                taskId,
                eventCount: result.rows.length,
                eventType
            });

            return result.rows.map(row => ({
                ...row,
                metadata: JSON.parse(row.metadata || '{}')
            }));

        } catch (error) {
            this.logger.error('Failed to get task events', {
                taskId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get events by type across all tasks
     * @param {string} eventType - Event type
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Events
     */
    async getEventsByType(eventType, options = {}) {
        try {
            const { limit = 100, offset = 0, since = null } = options;

            let query = `
                SELECT * FROM task_file_events 
                WHERE event_type = $1
            `;
            const params = [eventType];

            if (since) {
                query += ` AND timestamp >= $2`;
                params.push(since);
            }

            query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(limit, offset);

            const result = await this.databaseConnection.query(query, params);
            
            this.logger.debug('Retrieved events by type', {
                eventType,
                eventCount: result.rows.length
            });

            return result.rows.map(row => ({
                ...row,
                metadata: JSON.parse(row.metadata || '{}')
            }));

        } catch (error) {
            this.logger.error('Failed to get events by type', {
                eventType,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Replay events to reconstruct task state
     * @param {string} taskId - Task ID
     * @param {Date} until - Replay events until this timestamp
     * @returns {Promise<Object>} Reconstructed task state
     */
    async replayTaskEvents(taskId, until = null) {
        try {
            let query = `
                SELECT * FROM task_file_events 
                WHERE task_id = $1
            `;
            const params = [taskId];

            if (until) {
                query += ` AND timestamp <= $2`;
                params.push(until.toISOString());
            }

            query += ` ORDER BY timestamp ASC`;

            const result = await this.databaseConnection.query(query, params);
            
            // Reconstruct state from events
            let state = {
                taskId,
                status: 'pending',
                filePath: null,
                contentHash: null,
                lastUpdated: null
            };

            for (const event of result.rows) {
                const metadata = JSON.parse(event.metadata || '{}');
                
                switch (event.event_type) {
                    case 'status_change':
                        state.status = event.to_status;
                        state.lastUpdated = event.timestamp;
                        break;
                    case 'file_movement':
                        state.filePath = event.to_path;
                        state.lastUpdated = event.timestamp;
                        break;
                    case 'content_hash_validation':
                        state.contentHash = event.content_hash;
                        state.lastUpdated = event.timestamp;
                        break;
                }
            }

            this.logger.info('Replayed task events', {
                taskId,
                eventCount: result.rows.length,
                finalStatus: state.status
            });

            return state;

        } catch (error) {
            this.logger.error('Failed to replay task events', {
                taskId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Store event in database
     * @param {Object} event - Event to store
     * @returns {Promise<void>}
     */
    async storeEvent(event) {
        try {
            const query = `
                INSERT INTO task_file_events (
                    id, task_id, event_type, from_status, to_status, 
                    from_path, to_path, content_hash, is_valid,
                    metadata, user_id, timestamp, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `;

            const params = [
                event.id,
                event.taskId,
                event.eventType,
                event.fromStatus || null,
                event.toStatus || null,
                event.fromPath || null,
                event.toPath || null,
                event.contentHash || null,
                event.isValid || null,
                event.metadata,
                event.userId,
                event.timestamp,
                event.createdAt
            ];

            await this.databaseConnection.query(query, params);

        } catch (error) {
            this.logger.error('Failed to store event', {
                eventId: event.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Generate unique event ID
     * @returns {string} Event ID
     */
    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get event statistics
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Event statistics
     */
    async getEventStatistics(options = {}) {
        try {
            const { since = null, taskId = null } = options;

            let whereClause = '';
            const params = [];

            if (since) {
                whereClause += ' WHERE timestamp >= $1';
                params.push(since);
            }

            if (taskId) {
                whereClause += whereClause ? ' AND task_id = $2' : ' WHERE task_id = $1';
                params.push(taskId);
            }

            const query = `
                SELECT 
                    event_type,
                    COUNT(*) as count,
                    MIN(timestamp) as first_event,
                    MAX(timestamp) as last_event
                FROM task_file_events 
                ${whereClause}
                GROUP BY event_type
                ORDER BY count DESC
            `;

            const result = await this.databaseConnection.query(query, params);
            
            return {
                eventTypes: result.rows,
                totalEvents: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0)
            };

        } catch (error) {
            this.logger.error('Failed to get event statistics', {
                error: error.message
            });
            throw error;
        }
    }
}

module.exports = TaskEventStore;
