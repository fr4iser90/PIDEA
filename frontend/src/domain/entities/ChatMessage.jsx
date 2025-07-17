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
    return this.content.includes('```') || this.isCodeSnippet() || this.hasInlineCode();
  }

  isCodeSnippet() {
    const trimmed = this.content.trim();
    
    // Enhanced patterns for code detection
    const codePatterns = [
      // Function definitions
      /^[ \t]*(function|def|class|const|let|var)\s+\w+/m,
      // Control structures
      /^[ \t]*(if|for|while|switch|try|catch)\s*\(/m,
      // Import statements
      /^[ \t]*(import|from|require|include)\s+/m,
      // Variable assignments with complex expressions
      /^[ \t]*\w+\s*=\s*[^=]+[;)]?$/m,
      // Method calls
      /^[ \t]*\w+\.\w+\s*\(/m,
      // Object/array literals
      /^[ \t]*[{[]/m,
      // Comments
      /^[ \t]*(#|\/\/|\/\*)/m,
      // HTML tags
      /^[ \t]*<[^>]+>/m,
      // CSS rules
      /^[ \t]*\w+\s*\{/m,
      // SQL statements
      /^[ \t]*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)\s+/im
    ];
    
    return codePatterns.some(pattern => pattern.test(trimmed));
  }

  hasInlineCode() {
    const inlinePatterns = [
      /`[^`]+`/g,  // Backticks
      /<code>[^<]+<\/code>/g,  // HTML code tags
      /\$\{[^}]+\}/g  // Template literals
    ];
    
    return inlinePatterns.some(pattern => pattern.test(this.content));
  }

  getInlineCode() {
    const inlineCode = [];
    const inlinePatterns = [
      /`([^`]+)`/g,  // Backticks
      /<code>([^<]+)<\/code>/g,  // HTML code tags
      /\$\{([^}]+)\}/g  // Template literals
    ];
    
    inlinePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(this.content)) !== null) {
        inlineCode.push({
          content: match[1],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          pattern: pattern.source
        });
      }
    });
    
    return inlineCode;
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