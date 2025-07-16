const UserSessionRepository = require('@repositories/UserSessionRepository');
const UserSession = require('@entities/UserSession');
const Logger = require('@logging/Logger');
const logger = new Logger('UserSessionRepositorySQLite');

class SQLiteUserSessionRepository extends UserSessionRepository {
  constructor(databaseConnection) {
    super();
    this.db = databaseConnection;
  }

  async save(session) {
    if (!(session instanceof UserSession)) {
      throw new Error('Invalid session entity');
    }

    logger.info('🔍 Saving session:', {
      id: session.id,
      userId: session.userId,
      accessTokenLength: session.accessToken.length,
      refreshTokenLength: session.refreshToken.length
    });

    const sql = `
      INSERT OR REPLACE INTO user_sessions (id, user_id, access_token, refresh_token, expires_at, created_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const sessionData = session.toJSON();
    logger.info('🔍 Session data to save:', {
      id: sessionData.id,
      userId: sessionData.userId,
      accessTokenStart: sessionData.accessToken.substring(0, 20) + '...',
      expiresAt: sessionData.expiresAt
    });

    await this.db.execute(sql, [
      sessionData.id,
      sessionData.userId,
      sessionData.accessToken,
      sessionData.refreshToken,
      sessionData.expiresAt,
      sessionData.createdAt,
      JSON.stringify(sessionData.metadata)
    ]);

    logger.info('✅ Session saved successfully');
    return session;
  }

  async findById(id) {
    if (!id) {
      throw new Error('Session id is required');
    }

    const sql = 'SELECT * FROM user_sessions WHERE id = ?';
    const row = await this.db.getOne(sql, [id]);
    
    if (!row) return null;
    
    return UserSession.fromJSON({
      id: row.id,
      userId: row.user_id,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    });
  }

  async findByUserId(userId) {
    if (!userId) {
      throw new Error('User id is required');
    }

    const sql = 'SELECT * FROM user_sessions WHERE user_id = ? ORDER BY created_at DESC';
    const rows = await this.db.query(sql, [userId]);
    
    return rows.map(row => UserSession.fromJSON({
      id: row.id,
      userId: row.user_id,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    }));
  }

  async findByAccessToken(accessToken) {
    if (!accessToken) {
      throw new Error('Access token is required');
    }

    // logger.info('🔍 Finding session by access token:', accessToken.substring(0, 20) + '...');

    const sql = 'SELECT * FROM user_sessions WHERE access_token = ?';
    const row = await this.db.getOne(sql, [accessToken]);
    
    // logger.info('🔍 Database result:', row ? {
    //   id: row.id,
    //   user_id: row.user_id,
    //   access_token_start: row.access_token.substring(0, 20) + '...',
    //   expires_at: row.expires_at
    // } : 'null');
    
    if (!row) return null;
    
    const session = UserSession.fromJSON({
      id: row.id,
      userId: row.user_id,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    });

    // logger.info('✅ Session found and reconstructed:', {
    //   id: session.id,
    //   userId: session.userId,
    //   isActive: session.isActive()
    // });
    
    return session;
  }

  async findByRefreshToken(refreshToken) {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    const sql = 'SELECT * FROM user_sessions WHERE refresh_token = ?';
    const row = await this.db.getOne(sql, [refreshToken]);
    
    if (!row) return null;
    
    return UserSession.fromJSON({
      id: row.id,
      userId: row.user_id,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    });
  }

  async findActiveSessionsByUserId(userId) {
    if (!userId) {
      throw new Error('User id is required');
    }

    const sql = 'SELECT * FROM user_sessions WHERE user_id = ? AND expires_at > datetime(\'now\') ORDER BY created_at DESC';
    const rows = await this.db.query(sql, [userId]);
    
    return rows.map(row => UserSession.fromJSON({
      id: row.id,
      userId: row.user_id,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    }));
  }

  async delete(id) {
    if (!id) {
      throw new Error('Session id is required');
    }

    const sql = 'DELETE FROM user_sessions WHERE id = ?';
    const result = await this.db.execute(sql, [id]);
    return result.rowsAffected > 0;
  }

  async deleteByUserId(userId) {
    if (!userId) {
      throw new Error('User id is required');
    }

    const sql = 'DELETE FROM user_sessions WHERE user_id = ?';
    const result = await this.db.execute(sql, [userId]);
    return result.rowsAffected > 0;
  }

  async deleteExpiredSessions() {
    const sql = 'DELETE FROM user_sessions WHERE expires_at <= datetime(\'now\')';
    const result = await this.db.execute(sql);
    return result.rowsAffected;
  }

  async update(session) {
    if (!(session instanceof UserSession)) {
      throw new Error('Invalid session entity');
    }

    const sql = `
      UPDATE user_sessions 
      SET access_token = ?, refresh_token = ?, expires_at = ?, metadata = ?
      WHERE id = ?
    `;

    const sessionData = session.toJSON();
    const result = await this.db.execute(sql, [
      sessionData.accessToken,
      sessionData.refreshToken,
      sessionData.expiresAt,
      JSON.stringify(sessionData.metadata),
      sessionData.id
    ]);

    return result.rowsAffected > 0;
  }
}

module.exports = SQLiteUserSessionRepository; 