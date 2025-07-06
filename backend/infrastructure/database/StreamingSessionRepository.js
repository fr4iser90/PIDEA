/**
 * StreamingSessionRepository
 * 
 * Repository for managing streaming session persistence and retrieval.
 * Supports both in-memory and database storage for streaming sessions.
 */
const StreamingSession = require('../../domain/entities/StreamingSession');
const FrameMetrics = require('../../domain/entities/FrameMetrics');

class StreamingSessionRepository {
  constructor(databaseConnection = null) {
    this.databaseConnection = databaseConnection;
    this.sessions = new Map(); // In-memory storage
    this.metrics = new Map(); // sessionId -> FrameMetrics[]
    this.isInitialized = false;
  }

  /**
   * Initialize repository
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      if (this.databaseConnection) {
        await this.createTables();
      }
      this.isInitialized = true;
      console.log('[StreamingSessionRepository] Initialized successfully');
    } catch (error) {
      console.error('[StreamingSessionRepository] Initialization error:', error.message);
      throw error;
    }
  }

  /**
   * Create database tables if using database storage
   * @returns {Promise<void>}
   */
  async createTables() {
    if (!this.databaseConnection) {
      return;
    }

    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS streaming_sessions (
        id VARCHAR(255) PRIMARY KEY,
        port INTEGER NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP NULL,
        stopped_at TIMESTAMP NULL,
        last_frame_at TIMESTAMP NULL,
        frame_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        last_error TEXT NULL,
        fps INTEGER DEFAULT 10,
        quality DECIMAL(3,2) DEFAULT 0.8,
        format VARCHAR(10) DEFAULT 'webp',
        max_frame_size INTEGER DEFAULT 3145728,
        enable_region_detection BOOLEAN DEFAULT FALSE,
        average_frame_size INTEGER DEFAULT 0,
        average_latency INTEGER DEFAULT 0,
        bandwidth_usage INTEGER DEFAULT 0,
        memory_usage INTEGER DEFAULT 0
      )
    `;

    const createMetricsTable = `
      CREATE TABLE IF NOT EXISTS frame_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id VARCHAR(255) NOT NULL,
        frame_number INTEGER NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        capture_latency INTEGER DEFAULT 0,
        compression_latency INTEGER DEFAULT 0,
        streaming_latency INTEGER DEFAULT 0,
        total_latency INTEGER DEFAULT 0,
        original_size INTEGER DEFAULT 0,
        compressed_size INTEGER DEFAULT 0,
        format VARCHAR(10) DEFAULT 'webp',
        quality DECIMAL(3,2) DEFAULT 0.8,
        compression_ratio DECIMAL(5,4) DEFAULT 0,
        has_region_detection BOOLEAN DEFAULT FALSE,
        changed_regions TEXT NULL,
        is_full_frame BOOLEAN DEFAULT TRUE,
        has_error BOOLEAN DEFAULT FALSE,
        error TEXT NULL,
        retry_count INTEGER DEFAULT 0,
        memory_usage_before INTEGER DEFAULT 0,
        memory_usage_after INTEGER DEFAULT 0,
        memory_delta INTEGER DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES streaming_sessions(id) ON DELETE CASCADE
      )
    `;

    try {
      await this.databaseConnection.execute(createSessionsTable);
      await this.databaseConnection.execute(createMetricsTable);
      console.log('[StreamingSessionRepository] Database tables created successfully');
    } catch (error) {
      console.error('[StreamingSessionRepository] Error creating tables:', error.message);
      throw error;
    }
  }

  /**
   * Save streaming session
   * @param {StreamingSession} session - Session to save
   * @returns {Promise<void>}
   */
  async saveSession(session) {
    try {
      await this.initialize();

      // Save to memory
      this.sessions.set(session.id, session);

      // Save to database if available
      if (this.databaseConnection) {
        await this.saveSessionToDatabase(session);
      }

      console.log(`[StreamingSessionRepository] Saved session ${session.id}`);
    } catch (error) {
      console.error(`[StreamingSessionRepository] Error saving session ${session.id}:`, error.message);
      throw error;
    }
  }

  /**
   * Save session to database
   * @param {StreamingSession} session - Session to save
   * @returns {Promise<void>}
   */
  async saveSessionToDatabase(session) {
    const query = `
      INSERT OR REPLACE INTO streaming_sessions (
        id, port, status, created_at, started_at, stopped_at, last_frame_at,
        frame_count, error_count, last_error, fps, quality, format, max_frame_size,
        enable_region_detection, average_frame_size, average_latency, bandwidth_usage, memory_usage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      session.id,
      session.port,
      session.status,
      session.createdAt.toISOString(),
      session.startedAt?.toISOString() || null,
      session.stoppedAt?.toISOString() || null,
      session.lastFrameAt?.toISOString() || null,
      session.frameCount,
      session.errorCount,
      session.lastError,
      session.fps,
      session.quality,
      session.format,
      session.maxFrameSize,
      session.enableRegionDetection,
      Math.round(session.averageFrameSize),
      Math.round(session.averageLatency),
      Math.round(session.bandwidthUsage),
      session.memoryUsage
    ];

    await this.databaseConnection.execute(query, params);
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session identifier
   * @returns {Promise<StreamingSession|null>}
   */
  async getSession(sessionId) {
    try {
      await this.initialize();

      // Check memory first
      if (this.sessions.has(sessionId)) {
        return this.sessions.get(sessionId);
      }

      // Check database if available
      if (this.databaseConnection) {
        return await this.getSessionFromDatabase(sessionId);
      }

      return null;
    } catch (error) {
      console.error(`[StreamingSessionRepository] Error getting session ${sessionId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get session from database
   * @param {string} sessionId - Session identifier
   * @returns {Promise<StreamingSession|null>}
   */
  async getSessionFromDatabase(sessionId) {
    const query = 'SELECT * FROM streaming_sessions WHERE id = ?';
    const result = await this.databaseConnection.query(query, [sessionId]);

    if (result.length === 0) {
      return null;
    }

    const data = result[0];
    const session = StreamingSession.fromJSON({
      id: data.id,
      port: data.port,
      status: data.status,
      createdAt: data.created_at,
      startedAt: data.started_at,
      stoppedAt: data.stopped_at,
      lastFrameAt: data.last_frame_at,
      frameCount: data.frame_count,
      errorCount: data.error_count,
      lastError: data.last_error,
      fps: data.fps,
      quality: data.quality,
      format: data.format,
      maxFrameSize: data.max_frame_size,
      enableRegionDetection: data.enable_region_detection,
      averageFrameSize: data.average_frame_size,
      averageLatency: data.average_latency,
      bandwidthUsage: data.bandwidth_usage,
      memoryUsage: data.memory_usage
    });

    // Cache in memory
    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get all active sessions
   * @returns {Promise<StreamingSession[]>}
   */
  async getActiveSessions() {
    try {
      await this.initialize();

      const activeSessions = [];
      
      // Get from memory
      for (const session of this.sessions.values()) {
        if (session.isActive()) {
          activeSessions.push(session);
        }
      }

      // Get from database if available
      if (this.databaseConnection) {
        const dbSessions = await this.getActiveSessionsFromDatabase();
        for (const session of dbSessions) {
          if (!this.sessions.has(session.id)) {
            this.sessions.set(session.id, session);
            activeSessions.push(session);
          }
        }
      }

      return activeSessions;
    } catch (error) {
      console.error('[StreamingSessionRepository] Error getting active sessions:', error.message);
      throw error;
    }
  }

  /**
   * Get active sessions from database
   * @returns {Promise<StreamingSession[]>}
   */
  async getActiveSessionsFromDatabase() {
    const query = "SELECT * FROM streaming_sessions WHERE status = 'active'";
    const results = await this.databaseConnection.query(query);

    return results.map(data => StreamingSession.fromJSON({
      id: data.id,
      port: data.port,
      status: data.status,
      createdAt: data.created_at,
      startedAt: data.started_at,
      stoppedAt: data.stopped_at,
      lastFrameAt: data.last_frame_at,
      frameCount: data.frame_count,
      errorCount: data.error_count,
      lastError: data.last_error,
      fps: data.fps,
      quality: data.quality,
      format: data.format,
      maxFrameSize: data.max_frame_size,
      enableRegionDetection: data.enable_region_detection,
      averageFrameSize: data.average_frame_size,
      averageLatency: data.average_latency,
      bandwidthUsage: data.bandwidth_usage,
      memoryUsage: data.memory_usage
    }));
  }

  /**
   * Delete session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<void>}
   */
  async deleteSession(sessionId) {
    try {
      await this.initialize();

      // Remove from memory
      this.sessions.delete(sessionId);
      this.metrics.delete(sessionId);

      // Remove from database if available
      if (this.databaseConnection) {
        await this.deleteSessionFromDatabase(sessionId);
      }

      console.log(`[StreamingSessionRepository] Deleted session ${sessionId}`);
    } catch (error) {
      console.error(`[StreamingSessionRepository] Error deleting session ${sessionId}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete session from database
   * @param {string} sessionId - Session identifier
   * @returns {Promise<void>}
   */
  async deleteSessionFromDatabase(sessionId) {
    const query = 'DELETE FROM streaming_sessions WHERE id = ?';
    await this.databaseConnection.execute(query, [sessionId]);
  }

  /**
   * Save frame metrics
   * @param {FrameMetrics} metrics - Frame metrics to save
   * @returns {Promise<void>}
   */
  async saveMetrics(metrics) {
    try {
      await this.initialize();

      // Save to memory
      if (!this.metrics.has(metrics.sessionId)) {
        this.metrics.set(metrics.sessionId, []);
      }
      this.metrics.get(metrics.sessionId).push(metrics);

      // Save to database if available
      if (this.databaseConnection) {
        await this.saveMetricsToDatabase(metrics);
      }
    } catch (error) {
      console.error(`[StreamingSessionRepository] Error saving metrics for session ${metrics.sessionId}:`, error.message);
      throw error;
    }
  }

  /**
   * Save metrics to database
   * @param {FrameMetrics} metrics - Frame metrics to save
   * @returns {Promise<void>}
   */
  async saveMetricsToDatabase(metrics) {
    const query = `
      INSERT INTO frame_metrics (
        session_id, frame_number, timestamp, capture_latency, compression_latency,
        streaming_latency, total_latency, original_size, compressed_size, format,
        quality, compression_ratio, has_region_detection, changed_regions,
        is_full_frame, has_error, error, retry_count, memory_usage_before,
        memory_usage_after, memory_delta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      metrics.sessionId,
      metrics.frameNumber,
      metrics.timestamp.toISOString(),
      metrics.captureLatency,
      metrics.compressionLatency,
      metrics.streamingLatency,
      metrics.totalLatency,
      metrics.originalSize,
      metrics.compressedSize,
      metrics.format,
      metrics.quality,
      metrics.compressionRatio,
      metrics.hasRegionDetection,
      JSON.stringify(metrics.changedRegions),
      metrics.isFullFrame,
      metrics.hasError,
      metrics.error,
      metrics.retryCount,
      metrics.memoryUsageBefore,
      metrics.memoryUsageAfter,
      metrics.memoryDelta
    ];

    await this.databaseConnection.execute(query, params);
  }

  /**
   * Get metrics for session
   * @param {string} sessionId - Session identifier
   * @param {number} limit - Maximum number of metrics to return
   * @returns {Promise<FrameMetrics[]>}
   */
  async getMetrics(sessionId, limit = 100) {
    try {
      await this.initialize();

      // Get from memory
      const memoryMetrics = this.metrics.get(sessionId) || [];

      // Get from database if available
      if (this.databaseConnection) {
        const dbMetrics = await this.getMetricsFromDatabase(sessionId, limit);
        return dbMetrics.length > 0 ? dbMetrics : memoryMetrics.slice(-limit);
      }

      return memoryMetrics.slice(-limit);
    } catch (error) {
      console.error(`[StreamingSessionRepository] Error getting metrics for session ${sessionId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get metrics from database
   * @param {string} sessionId - Session identifier
   * @param {number} limit - Maximum number of metrics to return
   * @returns {Promise<FrameMetrics[]>}
   */
  async getMetricsFromDatabase(sessionId, limit = 100) {
    const query = `
      SELECT * FROM frame_metrics 
      WHERE session_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `;
    
    const results = await this.databaseConnection.query(query, [sessionId, limit]);

    return results.map(data => FrameMetrics.fromJSON({
      sessionId: data.session_id,
      frameNumber: data.frame_number,
      timestamp: data.timestamp,
      captureStartTime: data.capture_start_time,
      captureEndTime: data.capture_end_time,
      compressionStartTime: data.compression_start_time,
      compressionEndTime: data.compression_end_time,
      streamingStartTime: data.streaming_start_time,
      streamingEndTime: data.streaming_end_time,
      captureLatency: data.capture_latency,
      compressionLatency: data.compression_latency,
      streamingLatency: data.streaming_latency,
      totalLatency: data.total_latency,
      originalSize: data.original_size,
      compressedSize: data.compressed_size,
      format: data.format,
      quality: data.quality,
      compressionRatio: data.compression_ratio,
      hasRegionDetection: data.has_region_detection,
      changedRegions: JSON.parse(data.changed_regions || '[]'),
      isFullFrame: data.is_full_frame,
      hasError: data.has_error,
      error: data.error,
      retryCount: data.retry_count,
      memoryUsageBefore: data.memory_usage_before,
      memoryUsageAfter: data.memory_usage_after,
      memoryDelta: data.memory_delta
    }));
  }

  /**
   * Get repository statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    try {
      await this.initialize();

      const stats = {
        totalSessions: this.sessions.size,
        activeSessions: 0,
        totalMetrics: 0,
        averageSessionDuration: 0,
        averageFrameRate: 0,
        totalErrors: 0
      };

      let totalDuration = 0;
      let totalFrames = 0;
      let totalFrameRate = 0;

      for (const session of this.sessions.values()) {
        if (session.isActive()) {
          stats.activeSessions++;
        }
        
        if (session.isStopped()) {
          totalDuration += session.getDuration();
        }
        
        totalFrames += session.frameCount;
        totalFrameRate += session.getFrameRate();
        stats.totalErrors += session.errorCount;
      }

      // Calculate metrics
      const stoppedSessions = Array.from(this.sessions.values()).filter(s => s.isStopped()).length;
      stats.averageSessionDuration = stoppedSessions > 0 ? totalDuration / stoppedSessions : 0;
      stats.averageFrameRate = this.sessions.size > 0 ? totalFrameRate / this.sessions.size : 0;

      // Count total metrics
      for (const sessionMetrics of this.metrics.values()) {
        stats.totalMetrics += sessionMetrics.length;
      }

      return stats;
    } catch (error) {
      console.error('[StreamingSessionRepository] Error getting stats:', error.message);
      throw error;
    }
  }

  /**
   * Clean up old sessions and metrics
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {Promise<void>}
   */
  async cleanup(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    try {
      await this.initialize();

      const cutoffTime = Date.now() - maxAge;
      const sessionsToDelete = [];

      for (const session of this.sessions.values()) {
        if (session.createdAt.getTime() < cutoffTime && session.isStopped()) {
          sessionsToDelete.push(session.id);
        }
      }

      for (const sessionId of sessionsToDelete) {
        await this.deleteSession(sessionId);
      }

      console.log(`[StreamingSessionRepository] Cleaned up ${sessionsToDelete.length} old sessions`);
    } catch (error) {
      console.error('[StreamingSessionRepository] Error during cleanup:', error.message);
      throw error;
    }
  }
}

module.exports = StreamingSessionRepository; 