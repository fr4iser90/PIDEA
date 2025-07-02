class ChatMessage {
  constructor(id, content, type, timestamp = new Date(), metadata = {}) {
    this.id = id;
    this.content = content;
    this.type = type; // 'user' | 'ai'
    this.timestamp = timestamp;
    this.metadata = metadata;
  }

  isUserMessage() {
    return this.type === 'user';
  }

  isAIMessage() {
    return this.type === 'ai';
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
      type: this.type,
      timestamp: this.timestamp.toISOString(),
      metadata: this.metadata
    };
  }

  static fromJSON(data) {
    return new ChatMessage(
      data.id,
      data.content,
      data.type,
      new Date(data.timestamp),
      data.metadata || {}
    );
  }
}

export default ChatMessage; 