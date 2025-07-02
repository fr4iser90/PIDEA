const { v4: uuidv4 } = require('uuid');

class ChatMessage {
  constructor(id, content, type, timestamp, metadata = {}) {
    this._id = id || uuidv4();
    this._sender = sender; // 'user' | 'ai' | 'system'
    this._content = content;
    this._type = type; // 'user' | 'ai'
    this._timestamp = timestamp || new Date();
    this._metadata = metadata;
    this._validate();
  }

  // Getters
  get id() { return this._id; }
  get content() { return this._content; }
  get type() { return this._type; }
  get timestamp() { return this._timestamp; }
  get metadata() { return { ...this._metadata }; }

  // Domain methods
  isUserMessage() {
    return this._type === 'user';
  }

  isAIMessage() {
    return this._type === 'ai';
  }

  isCodeBlock() {
    return this._content.includes('```') || 
           /^[ \t]*[a-zA-Z0-9_\-\.]+ ?= ?.+$/m.test(this._content) ||
           /^[ \t]*((if|for|while|def|class|function|let|const|var)\b|#include|import |public |private |protected )/m.test(this._content);
  }

  getCleanContent() {
    return this._content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Business rules validation
  _validate() {
    if (!this._content || this._content.trim().length === 0) {
      throw new Error('ChatMessage content cannot be empty');
    }
    
    if (!['user', 'ai'].includes(this._type)) {
      throw new Error('ChatMessage type must be either "user" or "ai"');
    }

    if (!(this._timestamp instanceof Date)) {
      throw new Error('ChatMessage timestamp must be a Date object');
    }
  }

  // Factory methods
  static createUserMessage(content, metadata = {}) {
    return new ChatMessage(null, content, 'user', new Date(), metadata);
  }

  static createAIMessage(content, metadata = {}) {
    return new ChatMessage(null, content, 'ai', new Date(), metadata);
  }

  // Serialization
  toJSON() {
    return {
      id: this._id,
      content: this._content,
      type: this._type,
      timestamp: this._timestamp.toISOString(),
      metadata: this._metadata
    };
  }

  static fromJSON(data) {
    return new ChatMessage(
      data.id,
      data.content,
      data.type,
      new Date(data.timestamp),
      data.metadata
    );
  }
}

module.exports = ChatMessage;