/**
 * MessageTypeDetector - Dedicated service for message type detection
 * Handles user messages, AI text, AI code blocks, and markdown detection
 */
class MessageTypeDetector {
  constructor() {
    this.logger = console; // Simple logger
  }

  /**
   * Detect user message type and content
   * @param {string} content - Message content
   * @param {Object} metadata - Message metadata
   * @returns {Object} User message analysis
   */
  detectUserMessage(content, metadata = {}) {
    const analysis = {
      type: 'user',
      hasCodeBlocks: false,
      hasInlineCode: false,
      hasMarkdown: false,
      codeBlocks: [],
      inlineCode: [],
      language: null,
      confidence: 1.0
    };

    // Check for code blocks
    if (content.includes('```')) {
      analysis.hasCodeBlocks = true;
      analysis.codeBlocks = this.extractCodeBlocks(content);
      analysis.language = this.detectLanguageFromCodeBlocks(analysis.codeBlocks);
    }

    // Check for inline code
    if (/`[^`]+`/.test(content)) {
      analysis.hasInlineCode = true;
      analysis.inlineCode = this.extractInlineCode(content);
    }

    // Check for markdown
    if (this.hasMarkdown(content)) {
      analysis.hasMarkdown = true;
    }

    return analysis;
  }

  /**
   * Detect AI text message (non-code)
   * @param {string} content - Message content
   * @returns {Object} AI text analysis
   */
  detectAITextMessage(content) {
    const analysis = {
      type: 'ai_text',
      hasCodeBlocks: false,
      hasInlineCode: false,
      hasMarkdown: false,
      codeBlocks: [],
      inlineCode: [],
      language: null,
      confidence: 0.8
    };

    // Check for markdown code blocks
    const markdownCodeBlocks = this.extractMarkdownCodeBlocks(content);
    if (markdownCodeBlocks.length > 0) {
      analysis.hasCodeBlocks = true;
      analysis.codeBlocks = markdownCodeBlocks;
      analysis.language = this.detectLanguageFromCodeBlocks(markdownCodeBlocks);
    }

    // Check for inline code
    if (/`[^`]+`/.test(content)) {
      analysis.hasInlineCode = true;
      analysis.inlineCode = this.extractInlineCode(content);
    }

    // Check for markdown formatting
    if (this.hasMarkdown(content)) {
      analysis.hasMarkdown = true;
    }

    return analysis;
  }

  /**
   * Detect AI code block message (from DOM)
   * @param {Array} codeBlocks - Code blocks from DOM
   * @param {string} content - Raw content
   * @returns {Object} AI code block analysis
   */
  detectAICodeBlockMessage(codeBlocks, content = '') {
    const analysis = {
      type: 'ai_code_block',
      hasCodeBlocks: true,
      hasInlineCode: false,
      hasMarkdown: false,
      codeBlocks: codeBlocks,
      inlineCode: [],
      language: null,
      confidence: 0.9
    };

    if (codeBlocks.length > 0) {
      analysis.language = this.detectLanguageFromCodeBlocks(codeBlocks);
      analysis.confidence = this.calculateCodeBlockConfidence(codeBlocks);
    }

    return analysis;
  }

  /**
   * Extract code blocks from markdown content
   * @param {string} content - Markdown content
   * @returns {Array} Array of code blocks
   */
  extractMarkdownCodeBlocks(content) {
    const codeBlocks = [];
    const codeBlockRegex = /```(\w+)?\s*([\s\S]+?)```/g;
    
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      codeBlocks.push({
        type: 'markdown_code_block',
        language: match[1] || 'text',
        content: match[2].trim(),
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.8
      });
    }
    
    return codeBlocks;
  }

  /**
   * Extract inline code from content
   * @param {string} content - Content to analyze
   * @returns {Array} Array of inline code
   */
  extractInlineCode(content) {
    const inlineCode = [];
    const inlinePatterns = [
      /`([^`]+)`/g,  // Backticks
      /<code>([^<]+)<\/code>/g,  // HTML code tags
      /\$\{([^}]+)\}/g  // Template literals
    ];
    
    inlinePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        inlineCode.push({
          type: 'inline_code',
          content: match[1],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          pattern: pattern.source
        });
      }
    });
    
    return inlineCode;
  }

  /**
   * Extract code blocks from content (generic)
   * @param {string} content - Content to analyze
   * @returns {Array} Array of code blocks
   */
  extractCodeBlocks(content) {
    return this.extractMarkdownCodeBlocks(content);
  }

  /**
   * Detect language from code blocks
   * @param {Array} codeBlocks - Array of code blocks
   * @returns {string} Detected language
   */
  detectLanguageFromCodeBlocks(codeBlocks) {
    if (codeBlocks.length === 0) return 'text';
    
    // Use the first code block's language
    const firstBlock = codeBlocks[0];
    return firstBlock.language || 'text';
  }

  /**
   * Check if content has markdown formatting
   * @param {string} content - Content to check
   * @returns {boolean} True if markdown detected
   */
  hasMarkdown(content) {
    const markdownPatterns = [
      /^#{1,6}\s+/m,  // Headers
      /\*\*[^*]+\*\*/,  // Bold
      /\*[^*]+\*/,  // Italic
      /\[[^\]]+\]\([^)]+\)/,  // Links
      /!\[[^\]]+\]\([^)]+\)/,  // Images
      /^\s*[-*+]\s+/m,  // Lists
      /^\s*\d+\.\s+/m,  // Numbered lists
      /`[^`]+`/,  // Inline code
      /```[\s\S]+?```/  // Code blocks
    ];
    
    return markdownPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Calculate confidence for code blocks
   * @param {Array} codeBlocks - Array of code blocks
   * @returns {number} Confidence score (0-1)
   */
  calculateCodeBlockConfidence(codeBlocks) {
    if (codeBlocks.length === 0) return 0;
    
    let totalConfidence = 0;
    codeBlocks.forEach(block => {
      totalConfidence += block.confidence || 0.8;
    });
    
    return totalConfidence / codeBlocks.length;
  }

  /**
   * Comprehensive message analysis
   * @param {string} content - Message content
   * @param {string} sender - Message sender
   * @param {Array} domCodeBlocks - Code blocks from DOM (optional)
   * @returns {Object} Complete message analysis
   */
  analyzeMessage(content, sender, domCodeBlocks = []) {
    this.logger.info(`🔍 [MessageTypeDetector] Analyzing message from ${sender}`);
    
    if (sender === 'user') {
      return this.detectUserMessage(content);
    } else if (sender === 'assistant') {
      if (domCodeBlocks.length > 0) {
        return this.detectAICodeBlockMessage(domCodeBlocks, content);
      } else {
        return this.detectAITextMessage(content);
      }
    } else {
      return {
        type: 'unknown',
        hasCodeBlocks: false,
        hasInlineCode: false,
        hasMarkdown: false,
        codeBlocks: [],
        inlineCode: [],
        language: null,
        confidence: 0.5
      };
    }
  }
}

module.exports = MessageTypeDetector; 