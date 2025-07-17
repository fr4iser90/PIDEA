const { v4: uuidv4 } = require('uuid');

class ChatMessage {
  constructor(id, content, sender, type, timestamp, metadata = {}) {
    this._id = id || uuidv4();
    this._content = content;
    this._sender = sender; // 'user' | 'assistant' | 'system'
    this._type = type; // 'text' | 'code' | 'system' | 'error'
    this._timestamp = timestamp || new Date();
    this._metadata = metadata;
    this._validate();
  }

  // Getters
  get id() { return this._id; }
  get content() { return this._content; }
  get sender() { return this._sender; }
  get type() { return this._type; }
  get timestamp() { return this._timestamp; }
  get metadata() { return { ...this._metadata }; }

  // Domain methods
  isUserMessage() {
    return this._sender === 'user';
  }

  isAIMessage() {
    return this._sender === 'assistant';
  }

  isCodeBlock() {
    return this._type === 'code';
  }

  getCleanContent() {
    return this._content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Business rules validation
  _validate() {
    if (!this._content || this._content.trim().length === 0) {
      throw new Error('ChatMessage content cannot be empty');
    }
    if (!['user', 'assistant', 'system'].includes(this._sender)) {
      throw new Error('ChatMessage sender must be either "user", "assistant" or "system"');
    }
    if (!['text', 'code', 'system', 'error'].includes(this._type)) {
      throw new Error('ChatMessage type must be text, code, system, or error');
    }
    if (!(this._timestamp instanceof Date)) {
      throw new Error('ChatMessage timestamp must be a Date object');
    }
  }

  // Factory methods
  static createUserMessage(content, type = 'text', metadata = {}) {
    return new ChatMessage(null, content, 'user', type, new Date(), metadata);
  }

  static createAIMessage(content, type = 'text', metadata = {}) {
    return new ChatMessage(null, content, 'assistant', type, new Date(), metadata);
  }

  static createSystemMessage(content, type = 'system', metadata = {}) {
    return new ChatMessage(null, content, 'system', type, new Date(), metadata);
  }

  // Serialization
  toJSON() {
    return {
      id: this._id,
      content: this._content,
      sender: this._sender,
      type: this._type,
      timestamp: this._timestamp.toISOString(),
      metadata: this._metadata
    };
  }

  static fromJSON(data) {
    return new ChatMessage(
      data.id,
      data.content,
      data.sender,
      data.type,
      new Date(data.timestamp),
      data.metadata
    );
  }
}

module.exports = ChatMessage;