import ChatMessage from '@domain/entities/ChatMessage.jsx';

class ChatSession {
  constructor(id, title = 'New Chat', createdAt = new Date()) {
    this.id = id;
    this.title = title;
    this.createdAt = createdAt;
    this.messages = [];
    this.isTyping = false;
    this.lastActivity = createdAt;
  }

  addMessage(message) {
    if (!(message instanceof ChatMessage)) {
      throw new Error('Message must be an instance of ChatMessage');
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
      isTyping: this.isTyping
    };
  }

  static fromJSON(data) {
    const session = new ChatSession(
      data.id,
      data.title,
      new Date(data.createdAt)
    );
    session.lastActivity = new Date(data.lastActivity);
    session.isTyping = data.isTyping || false;
    session.messages = data.messages.map(m => ChatMessage.fromJSON(m));
    return session;
  }
}

export default ChatSession; 