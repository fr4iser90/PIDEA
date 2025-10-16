/**
 * ChatSession Domain Entity
 * Represents a chat session with messages and state management
 */
export class ChatSession {
  constructor(id, projectId, options = {}) {
    this._id = id;
    this._projectId = projectId;
    this._title = options.title || 'New Chat Session';
    this._messages = options.messages || [];
    this._createdAt = options.createdAt || new Date();
    this._updatedAt = options.updatedAt || new Date();
    this._isActive = options.isActive !== undefined ? options.isActive : true;
    this._metadata = options.metadata || {};
    
    this.validateInvariants();
  }

  get id() {
    return this._id;
  }

  get projectId() {
    return this._projectId;
  }

  get title() {
    return this._title;
  }

  get messages() {
    return [...this._messages];
  }

  get createdAt() {
    return this._createdAt;
  }

  get updatedAt() {
    return this._updatedAt;
  }

  get isActive() {
    return this._isActive;
  }

  get metadata() {
    return { ...this._metadata };
  }

  get messageCount() {
    return this._messages.length;
  }

  get lastMessage() {
    return this._messages.length > 0 ? this._messages[this._messages.length - 1] : null;
  }

  validateInvariants() {
    if (!this._id) {
      throw new Error('ChatSession must have a valid ID');
    }
    if (!this._projectId) {
      throw new Error('ChatSession must belong to a project');
    }
    if (!Array.isArray(this._messages)) {
      throw new Error('Messages must be an array');
    }
  }

  addMessage(message) {
    if (!message || typeof message !== 'object') {
      throw new Error('Message must be a valid object');
    }
    
    const chatMessage = {
      id: message.id || this.generateMessageId(),
      content: message.content || '',
      role: message.role || 'user',
      timestamp: message.timestamp || new Date(),
      metadata: message.metadata || {}
    };
    
    this._messages.push(chatMessage);
    this._updatedAt = new Date();
    
    return chatMessage;
  }

  removeMessage(messageId) {
    const index = this._messages.findIndex(msg => msg.id === messageId);
    if (index === -1) {
      throw new Error('Message not found');
    }
    
    this._messages.splice(index, 1);
    this._updatedAt = new Date();
  }

  updateMessage(messageId, updates) {
    const message = this._messages.find(msg => msg.id === messageId);
    if (!message) {
      throw new Error('Message not found');
    }
    
    Object.assign(message, updates);
    this._updatedAt = new Date();
  }

  clearMessages() {
    this._messages = [];
    this._updatedAt = new Date();
  }

  updateTitle(newTitle) {
    if (!newTitle || typeof newTitle !== 'string' || newTitle.trim().length === 0) {
      throw new Error('Title must be a non-empty string');
    }
    this._title = newTitle.trim();
    this._updatedAt = new Date();
  }

  updateMetadata(metadata) {
    this._metadata = { ...this._metadata, ...metadata };
    this._updatedAt = new Date();
  }

  activate() {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  deactivate() {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  equals(other) {
    return other instanceof ChatSession && this._id === other._id;
  }

  toJSON() {
    return {
      id: this._id,
      projectId: this._projectId,
      title: this._title,
      messages: this._messages,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      isActive: this._isActive,
      metadata: this._metadata
    };
  }

  static fromJSON(data) {
    return new ChatSession(
      data.id,
      data.projectId,
      {
        title: data.title,
        messages: data.messages || [],
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        isActive: data.isActive,
        metadata: data.metadata || {}
      }
    );
  }
}
