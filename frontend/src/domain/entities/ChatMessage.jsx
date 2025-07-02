export default class ChatMessage {
  constructor({ id, content, sender, type, timestamp, metadata = {} }) {
    this.id = id;
    this.content = content;
    this.sender = sender;
    this.type = type;
    this.timestamp = timestamp ? new Date(timestamp) : new Date();
    this.metadata = metadata;
  }

  isUserMessage() {
    return this.sender === 'user';
  }

  isAIMessage() {
    return this.sender === 'ai';
  }

  isCodeBlock() {
    return this.type === 'code';
  }

  getCleanContent() {
    return this.content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  hasCodeBlock() {
    return this.content.includes('```') || this.isCodeSnippet();
  }

  isCodeSnippet() {
    const trimmed = this.content.trim();
    return (
      (trimmed.startsWith('```') && trimmed.endsWith('```')) ||
      (/^[ \t]*[a-zA-Z0-9_\-\.]+ ?= ?.+$/m.test(trimmed)) ||
      (/^[ \t]*((if|for|while|def|class|function|let|const|var)\b|#include|import |public |private |protected )/m.test(trimmed))
    );
  }

  getCodeLanguage() {
    const match = this.content.match(/```(\w+)/);
    return match ? match[1] : 'text';
  }

  toJSON() {
    return {
      id: this.id,
      content: this.content,
      sender: this.sender,
      type: this.type,
      timestamp: this.timestamp.toISOString(),
      metadata: this.metadata
    };
  }

  static fromJSON(data) {
    return new ChatMessage({
      id: data.id,
      content: data.content,
      sender: data.sender,
      type: data.type,
      timestamp: data.timestamp,
      metadata: data.metadata || {}
    });
  }
} 