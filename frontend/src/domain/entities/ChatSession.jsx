import ChatMessage from './ChatMessage';

export default class ChatSession {
  constructor({ id, title, metadata = {}, idePort = null, messages = [] }) {
    this.id = id;
    this.title = title;
    this.metadata = metadata;
    this.idePort = idePort;
    this.messages = messages.map(m => m instanceof ChatMessage ? m : ChatMessage.fromJSON(m));
    this.createdAt = new Date();
    this.isTyping = false;
    this.lastActivity = this.createdAt;
  }

  addMessage(message) {
    if (!(message instanceof ChatMessage)) {
      message = ChatMessage.fromJSON(message);
    }
    this.messages.push(message);
    this.lastActivity = new Date();
    this.updateTitle();
  }

  updateTitle() {
    if (this.messages.length === 0) return;
    
    const firstUserMessage = this.messages.find(m => m.isUserMessage());
    if (firstUserMessage) {
      const content = firstUserMessage.content.trim();
      this.title = content.length > 50 ? content.substring(0, 50) + '...' : content;
    }
  }

  getLastMessage() {
    return this.messages[this.messages.length - 1];
  }

  getUserMessages() {
    return this.messages.filter(m => m.isUserMessage());
  }

  getAIMessages() {
    return this.messages.filter(m => m.isAIMessage());
  }

  setTyping(isTyping) {
    this.isTyping = isTyping;
  }

  clear() {
    this.messages = [];
    this.isTyping = false;
  }

  getMessageCount() {
    return this.messages.length;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      createdAt: this.createdAt.toISOString(),
      lastActivity: this.lastActivity.toISOString(),
      messages: this.messages.map(m => m.toJSON()),
      isTyping: this.isTyping,
      metadata: this.metadata,
      idePort: this.idePort
    };
  }

  static fromJSON(data) {
    return new ChatSession({
      id: data.id,
      title: data.title,
      metadata: data.metadata,
      idePort: data.idePort,
      messages: (data.messages || []).map(m => ChatMessage.fromJSON(m))
    });
  }
} 