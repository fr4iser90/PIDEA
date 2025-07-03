const { v4: uuidv4 } = require('uuid');
const ChatMessage = require('./ChatMessage');

class ChatSession {
  constructor(id, userId, title, createdAt, updatedAt, metadata = {}, idePort = null, messages = []) {
    this._id = id || uuidv4();
    this._userId = userId;
    this._title = title;
    this._metadata = metadata;
    this._idePort = idePort;
    this._messages = messages.map(msg =>
      msg instanceof ChatMessage ? msg : ChatMessage.fromJSON(msg)
    );
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
    this._validate();
  }

  // Getters
  get id() { return this._id; }
  get userId() { return this._userId; }
  get title() { return this._title; }
  get metadata() { return { ...this._metadata }; }
  get idePort() { return this._idePort; }
  get messages() { return this._messages.slice(); }
  get createdAt() { return this._createdAt; }
  get updatedAt() { return this._updatedAt; }
  get messageCount() { return this._messages.length; }

  // Domain methods
  addMessage(message) {
    if (!(message instanceof ChatMessage)) {
      message = ChatMessage.fromJSON(message);
    }
    this._messages.push(message);
    this._updatedAt = new Date();
    
    // Auto-generate name from first user message if not set
    if (!this._title && message.isUserMessage()) {
      const content = message.getCleanContent();
      this._title = content.length > 50 ? content.substring(0, 50) + '...' : content;
    }
  }

  getLastMessage() {
    return this._messages.length > 0 ? this._messages[this._messages.length - 1] : null;
  }

  getUserMessages() {
    return this._messages.filter(msg => msg.isUserMessage());
  }

  getAIMessages() {
    return this._messages.filter(msg => msg.isAIMessage());
  }

  getMessagesByType(type) {
    return this._messages.filter(msg => msg.type === type);
  }

  hasMessages() {
    return this._messages.length > 0;
  }

  clearMessages() {
    this._messages = [];
    this._updatedAt = new Date();
  }

  // User-specific methods
  belongsToUser(userId) {
    return this._userId === userId;
  }

  canUserAccess(user) {
    if (!user) return false;
    if (user.isAdmin()) return true;
    return this.belongsToUser(user.id);
  }

  // Business rules
  canAddMessage() {
    // Add any business rules here (e.g., rate limiting, content validation)
    return true;
  }

  // Validation
  _validate() {
    if (!this._userId) {
      throw new Error('ChatSession userId cannot be empty');
    }
    if (!(this._createdAt instanceof Date)) {
      throw new Error('ChatSession createdAt must be a Date object');
    }
    if (!(this._updatedAt instanceof Date)) {
      throw new Error('ChatSession updatedAt must be a Date object');
    }
  }

  // Serialization
  toJSON() {
    return {
      id: this._id,
      userId: this._userId,
      title: this._title,
      metadata: this._metadata,
      idePort: this._idePort,
      messages: this._messages.map(m => m.toJSON()),
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      messageCount: this.messageCount
    };
  }

  static fromJSON(data) {
    return new ChatSession(
      data.id,
      data.userId,
      data.title,
      new Date(data.createdAt),
      new Date(data.updatedAt),
      data.metadata,
      data.idePort,
      (data.messages || []).map(m => ChatMessage.fromJSON(m))
    );
  }

  // Factory methods
  static createSession(userId, title, metadata = {}) {
    return new ChatSession(
      null,
      userId,
      title,
      new Date(),
      new Date(),
      metadata
    );
  }
}

module.exports = ChatSession; 