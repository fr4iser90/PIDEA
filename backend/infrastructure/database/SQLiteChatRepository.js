const ChatRepository = require('@repositories/ChatRepository');
const ChatSession = require('@entities/ChatSession');
const ChatMessage = require('@entities/ChatMessage');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class SQLiteChatRepository extends ChatRepository {
  constructor(databaseConnection) {
    super();
    this.db = databaseConnection;
  }

  async saveSession(session) {
    if (!(session instanceof ChatSession)) {
      throw new Error('Invalid session');
    }

    const sql = `
      INSERT OR REPLACE INTO chat_sessions (id, user_id, title, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const sessionData = session.toJSON();
    
    await this.db.execute(sql, [
      sessionData.id,
      sessionData.userId,
      sessionData.title,
      sessionData.createdAt,
      sessionData.updatedAt,
      JSON.stringify(sessionData.metadata)
    ]);

    return session;
  }

  async findSessionById(sessionId) {
    const sql = 'SELECT * FROM chat_sessions WHERE id = ?';
    const row = await this.db.getOne(sql, [sessionId]);
    
    if (!row) return null;
    
    let metadata = {};
    if (row.metadata) {
      try {
        metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
      } catch (error) {
        logger.warn('Failed to parse metadata for chat session:', sessionId, error.message);
        metadata = {};
      }
    }
    
    const sessionData = {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata
    };
    
    return ChatSession.fromJSON(sessionData);
  }

  async getAllSessions() {
    const sql = 'SELECT * FROM chat_sessions ORDER BY updated_at DESC';
    const rows = await this.db.query(sql);
    
    return rows.map(row => {
      let metadata = {};
      if (row.metadata) {
        try {
          metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
        } catch (error) {
          logger.warn('Failed to parse metadata for chat session:', row.id, error.message);
          metadata = {};
        }
      }
      
      const sessionData = {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        metadata
      };
      
      return ChatSession.fromJSON(sessionData);
    });
  }

  async findAllSessions() {
    return this.getAllSessions();
  }

  async deleteSession(id) {
    const sql = 'DELETE FROM chat_sessions WHERE id = ?';
    const result = await this.db.execute(sql, [id]);
    return result.rowsAffected > 0;
  }

  async addMessageToSession(sessionId, message) {
    const session = await this.findSessionById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!(message instanceof ChatMessage)) {
      throw new Error('message must be an instance of ChatMessage');
    }

    const sql = `
      INSERT INTO chat_messages (id, session_id, content, sender_type, message_type, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const messageData = message.toJSON();
    
    const senderType = messageData.sender;
    
    await this.db.execute(sql, [
      messageData.id,
      sessionId,
      messageData.content,
      senderType,
      messageData.type,
      messageData.timestamp,
      JSON.stringify(messageData.metadata)
    ]);

    session.addMessage(message);
    await this.saveSession(session);
    return session;
  }

  async getSessionMessages(sessionId) {
    const sql = 'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY timestamp ASC';
    const rows = await this.db.query(sql, [sessionId]);
    
    return rows.map(row => {
      let metadata = {};
      if (row.metadata) {
        try {
          metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
        } catch (error) {
          logger.warn('Failed to parse metadata for chat message:', row.id, error.message);
          metadata = {};
        }
      }
      
      // Verwende direkt den Sender - keine Mapping mehr
      const sender = row.sender_type;
      
      const messageData = {
        id: row.id,
        sessionId: row.session_id,
        content: row.content,
        sender: sender,
        type: row.message_type || row.type,
        timestamp: row.timestamp,
        metadata
      };
      
      return ChatMessage.fromJSON(messageData);
    });
  }

  async updateSession(session) {
    return this.saveSession(session);
  }
}

module.exports = SQLiteChatRepository; 