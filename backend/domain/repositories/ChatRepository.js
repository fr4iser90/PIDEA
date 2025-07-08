const ChatMessage = require('@/domain/entities/ChatMessage');

class ChatRepository {
  constructor() {
    this.messages = new Map();
    this.messageCounter = 0;
  }

  async saveMessage(message) {
    if (!(message instanceof ChatMessage)) {
      throw new Error('Invalid message');
    }
    
    const messageId = message.id || `msg_${++this.messageCounter}`;
    this.messages.set(messageId, message.toJSON());
    return messageId;
  }

  async getAllMessages() {
    return Array.from(this.messages.values()).map(m => ChatMessage.fromJSON(m));
  }

  async getMessagesByPort(port, userId = null) {
    const allMessages = await this.getAllMessages();
    let filteredMessages = allMessages.filter(message => message.port === parseInt(port));
    
    if (userId) {
      filteredMessages = filteredMessages.filter(message => message.userId === userId);
    }
    
    return filteredMessages;
  }

  async getMessagesByUser(userId) {
    const allMessages = await this.getAllMessages();
    return allMessages.filter(message => message.userId === userId);
  }

  async findMessageById(messageId) {
    const data = this.messages.get(messageId);
    if (!data) return null;
    return ChatMessage.fromJSON(data);
  }

  async deleteMessage(messageId) {
    return this.messages.delete(messageId);
  }
}

module.exports = ChatRepository; 