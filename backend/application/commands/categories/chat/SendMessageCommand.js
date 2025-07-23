class SendMessageCommand {
  constructor(content, sessionId = null) {
    this.content = content;
    this.sessionId = sessionId;
    this.timestamp = new Date();
  }

  validate() {
    if (!this.content || this.content.trim().length === 0) {
      throw new Error('Message content cannot be empty');
    }
    
    if (this.content.length > 10000) {
      throw new Error('Message content too long (max 10000 characters)');
    }
  }
}

module.exports = SendMessageCommand; 