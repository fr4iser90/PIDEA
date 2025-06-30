const { v4: uuidv4 } = require('uuid');
const ChatMessage = require('./ChatMessage');

class ChatSession {
  constructor(id, name = null, metadata = {}) {
    this._id = id || uuidv4();
    this._name = name;
    this._messages = [];
    this._metadata = metadata;
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  // Getters
  get id() { return this._id; }
  get name() { return this._name; }
  get messages() { return [...this._messages]; }
  get metadata() { return { ...this._metadata }; }
  get createdAt() { return this._createdAt; }
  get updatedAt() { return this._updatedAt; }
  get messageCount() { return this._messages.length; }

  // Domain methods
  addMessage(message) {
    if (!(message instanceof ChatMessage)) {
      throw new Error('Message must be an instance of ChatMessage');
    }
    
    this._messages.push(message);
    this._updatedAt = new Date();
    
    // Auto-generate name from first user message if not set
    if (!this._name && message.isUserMessage()) {
      const content = message.getCleanContent();
      this._name = content.length > 50 ? content.substring(0, 50) + '...' : content;
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

  // Business rules
  canAddMessage() {
    // Add any business rules here (e.g., rate limiting, content validation)
    return true;
  }

  // Serialization
  toJSON() {
    return {
      id: this._id,
      name: this._name,
      messages: this._messages.map(msg => msg.toJSON()),
      metadata: this._metadata,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      messageCount: this.messageCount
    };
  }

  static fromJSON(data) {
    const session = new ChatSession(data.id, data.name, data.metadata);
    session._createdAt = new Date(data.createdAt);
    session._updatedAt = new Date(data.updatedAt);
    session._messages = data.messages.map(msgData => ChatMessage.fromJSON(msgData));
    return session;
  }
}

module.exports = ChatSession; 