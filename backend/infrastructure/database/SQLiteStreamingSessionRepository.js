/**
 * SQLiteStreamingSessionRepository
 * 
 * SQLite implementation of StreamingSessionRepository for managing streaming session persistence and retrieval.
 */
const StreamingSession = require('@entities/StreamingSession');
const FrameMetrics = require('@entities/FrameMetrics');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class SQLiteStreamingSessionRepository {
  constructor(databaseConnection) {
    this.db = databaseConnection;
    this.sessions = new Map(); // In-memory cache
    this.metrics = new Map(); // sessionId -> FrameMetrics[] cache
    this.isInitialized = false;
  }

  /**
   * Initialize the repository
   */
  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    try {
      await this.createTables();
      this.isInitialized = true;
      this.logger.info('[SQLiteStreamingSessionRepository] Initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('[SQLiteStreamingSessionRepository] Initialization error:', error.message);
      throw error;
    }
  }

  /**
   * Create database tables
   * @returns {Promise<void>}
   */
  async createTables() {
    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS streaming_sessions (
        id TEXT PRIMARY KEY,
        port INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        started_at TEXT NULL,
        stopped_at TEXT NULL,
        last_frame_at TEXT NULL,
        frame_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        last_error TEXT NULL,
        fps INTEGER DEFAULT 10,
        quality REAL DEFAULT 0.8,
        format TEXT DEFAULT 'webp',
        max_frame_size INTEGER DEFAULT 3145728,
        enable_region_detection INTEGER DEFAULT 0,
        average_frame_size INTEGER DEFAULT 0,
        average_latency INTEGER DEFAULT 0,
        bandwidth_usage INTEGER DEFAULT 0,
        memory_usage INTEGER DEFAULT 0
      )
    `;

    const createMetricsTable = `
      CREATE TABLE IF NOT EXISTS frame_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        frame_number INTEGER NOT NULL,
        timestamp TEXT DEFAULT (datetime('now')),
        capture_latency INTEGER DEFAULT 0,
        compression_latency INTEGER DEFAULT 0,
        streaming_latency INTEGER DEFAULT 0,
        total_latency INTEGER DEFAULT 0,
        original_size INTEGER DEFAULT 0,
        compressed_size INTEGER DEFAULT 0,
        format TEXT DEFAULT 'webp',
        quality REAL DEFAULT 0.8,
        compression_ratio REAL DEFAULT 0,
        has_region_detection INTEGER DEFAULT 0,
        changed_regions TEXT NULL,
        is_full_frame INTEGER DEFAULT 1,
        has_error INTEGER DEFAULT 0,
        error TEXT NULL,
        retry_count INTEGER DEFAULT 0,
        memory_usage_before INTEGER DEFAULT 0,
        memory_usage_after INTEGER DEFAULT 0,
        memory_delta INTEGER DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES streaming_sessions(id) ON DELETE CASCADE
      )
    `;

    try {
      await this.db.execute(createSessionsTable);
      await this.db.execute(createMetricsTable);
      
      // Create indexes for better performance
      await this.db.execute('CREATE INDEX IF NOT EXISTS idx_streaming_sessions_status ON streaming_sessions (status)');
      await this.db.execute('CREATE INDEX IF NOT EXISTS idx_streaming_sessions_created_at ON streaming_sessions (created_at)');
      await this.db.execute('CREATE INDEX IF NOT EXISTS idx_frame_metrics_session_id ON frame_metrics (session_id)');
      await this.db.execute('CREATE INDEX IF NOT EXISTS idx_frame_metrics_timestamp ON frame_metrics (timestamp)');
      
      logger.info('[SQLiteStreamingSessionRepository] Database tables created successfully');
    } catch (error) {
      logger.error('[SQLiteStreamingSessionRepository] Error creating tables:', error.message);
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

      // Save to memory cache
      this.sessions.set(session.id, session);

      // Save to database
      await this.saveSessionToDatabase(session);

      logger.info(`[SQLiteStreamingSessionRepository] Saved session ${session.id}`);
    } catch (error) {
      logger.error(`[SQLiteStreamingSessionRepository] Error saving session ${session.id}:`, error.message);
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
      session.enableRegionDetection ? 1 : 0,
      Math.round(session.averageFrameSize),
      Math.round(session.averageLatency),
      Math.round(session.bandwidthUsage),
      session.memoryUsage
    ];

    await this.db.execute(query, params);
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session identifier
   * @returns {Promise<StreamingSession|null>}
   */
  async getSession(sessionId) {
    try {
      await this.initialize();

      // Check memory cache first
      if (this.sessions.has(sessionId)) {
        return this.sessions.get(sessionId);
      }

      // Get from database
      return await this.getSessionFromDatabase(sessionId);
    } catch (error) {
      logger.error(`[SQLiteStreamingSessionRepository] Error getting session ${sessionId}:`, error.message);
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
    const result = await this.db.query(query, [sessionId]);

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
      enableRegionDetection: Boolean(data.enable_region_detection),
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
      
      // Get from memory cache
      for (const session of this.sessions.values()) {
        if (session.isActive()) {
          activeSessions.push(session);
        }
      }

      // Get from database
      const dbSessions = await this.getActiveSessionsFromDatabase();
      for (const session of dbSessions) {
        if (!this.sessions.has(session.id)) {
          this.sessions.set(session.id, session);
          activeSessions.push(session);
        }
      }

      return activeSessions;
    } catch (error) {
      logger.error('[SQLiteStreamingSessionRepository] Error getting active sessions:', error.message);
      throw error;
    }
  }

  /**
   * Get active sessions from database
   * @returns {Promise<StreamingSession[]>}
   */
  async getActiveSessionsFromDatabase() {
    const query = "SELECT * FROM streaming_sessions WHERE status = 'active'";
    const results = await this.db.query(query);

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
      enableRegionDetection: Boolean(data.enable_region_detection),
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

      // Remove from memory cache
      this.sessions.delete(sessionId);
      this.metrics.delete(sessionId);

      // Remove from database
      await this.deleteSessionFromDatabase(sessionId);

      logger.info(`[SQLiteStreamingSessionRepository] Deleted session ${sessionId}`);
    } catch (error) {
      logger.error(`[SQLiteStreamingSessionRepository] Error deleting session ${sessionId}:`, error.message);
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
    await this.db.execute(query, [sessionId]);
  }

  /**
   * Save frame metrics
   * @param {FrameMetrics} metrics - Frame metrics to save
   * @returns {Promise<void>}
   */
  async saveMetrics(metrics) {
    try {
      await this.initialize();

      // Save to memory cache
      if (!this.metrics.has(metrics.sessionId)) {
        this.metrics.set(metrics.sessionId, []);
      }
      this.metrics.get(metrics.sessionId).push(metrics);

      // Save to database
      await this.saveMetricsToDatabase(metrics);
    } catch (error) {
      logger.error(`[SQLiteStreamingSessionRepository] Error saving metrics for session ${metrics.sessionId}:`, error.message);
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
      metrics.hasRegionDetection ? 1 : 0,
      metrics.changedRegions ? JSON.stringify(metrics.changedRegions) : null,
      metrics.isFullFrame ? 1 : 0,
      metrics.hasError ? 1 : 0,
      metrics.error,
      metrics.retryCount,
      metrics.memoryUsageBefore,
      metrics.memoryUsageAfter,
      metrics.memoryDelta
    ];

    await this.db.execute(query, params);
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

      // Get from memory cache
      const memoryMetrics = this.metrics.get(sessionId) || [];

      // Get from database
      const dbMetrics = await this.getMetricsFromDatabase(sessionId, limit);
      return dbMetrics.length > 0 ? dbMetrics : memoryMetrics.slice(-limit);
    } catch (error) {
      logger.error(`[SQLiteStreamingSessionRepository] Error getting metrics for session ${sessionId}:`, error.message);
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
    
    const results = await this.db.query(query, [sessionId, limit]);

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
      hasRegionDetection: Boolean(data.has_region_detection),
      changedRegions: data.changed_regions ? JSON.parse(data.changed_regions) : [],
      isFullFrame: Boolean(data.is_full_frame),
      hasError: Boolean(data.has_error),
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
      logger.error('[SQLiteStreamingSessionRepository] Error getting stats:', error.message);
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

      const cutoffTime = new Date(Date.now() - maxAge);
      const query = `
        DELETE FROM streaming_sessions 
        WHERE created_at < datetime(?) 
        AND status IN ('stopped', 'error')
      `;
      
      const result = await this.db.execute(query, [cutoffTime.toISOString()]);
      const deletedCount = result.rowsAffected || 0;

      logger.info(`[SQLiteStreamingSessionRepository] Cleaned up ${deletedCount} old sessions`);
    } catch (error) {
      logger.error('[SQLiteStreamingSessionRepository] Error during cleanup:', error.message);
      throw error;
    }
  }
}

module.exports = SQLiteStreamingSessionRepository; 