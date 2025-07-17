/**
 * ChatMessageHandlerRefactored - Refactored version using separated services
 * Demonstrates how to use the new MessageTypeDetector, DOMCodeBlockDetector, and AITextDetector
 */
const MessageTypeDetector = require('./MessageTypeDetector');
const DOMCodeBlockDetector = require('./DOMCodeBlockDetector');
const AITextDetector = require('./AITextDetector');

class ChatMessageHandlerRefactored {
  constructor(browserManager, ideType, selectors) {
    this.browserManager = browserManager;
    this.ideType = ideType;
    this.selectors = selectors;
    this.logger = console; // Simple logger
    
    // Initialize separated services
    this.messageTypeDetector = new MessageTypeDetector();
    this.domCodeBlockDetector = new DOMCodeBlockDetector(selectors);
    this.aiTextDetector = new AITextDetector(selectors);
  }

  /**
   * Process user message - detect type and content
   * @param {string} content - User message content
   * @param {Object} metadata - Message metadata
   * @returns {Object} User message analysis
   */
  async processUserMessage(content, metadata = {}) {
    this.logger.info('👤 [ChatMessageHandler] Processing user message');
    
    const analysis = this.messageTypeDetector.detectUserMessage(content, metadata);
    
    this.logger.info('📊 [ChatMessageHandler] User message analysis:', {
      type: analysis.type,
      hasCodeBlocks: analysis.hasCodeBlocks,
      hasInlineCode: analysis.hasInlineCode,
      hasMarkdown: analysis.hasMarkdown,
      language: analysis.language,
      confidence: analysis.confidence
    });
    
    return analysis;
  }

  /**
   * Process AI response - detect type, extract code blocks, analyze quality
   * @param {Object} page - Playwright page object
   * @returns {Object} AI response analysis
   */
  async processAIResponse(page) {
    this.logger.info('🤖 [ChatMessageHandler] Processing AI response');
    
    // Step 1: Extract AI text response
    const aiText = await this.aiTextDetector.extractLatestAIResponse(page);
    
    // Step 2: Detect code blocks from DOM
    const domCodeBlocks = await this.domCodeBlockDetector.detectCodeBlocks(page);
    
    // Step 3: Analyze message type
    const messageAnalysis = this.messageTypeDetector.analyzeMessage(aiText, 'ai', domCodeBlocks);
    
    // Step 4: Analyze response quality
    const qualityAnalysis = this.aiTextDetector.analyzeResponseQuality(aiText);
    
    // Step 5: Detect completion
    const completionAnalysis = this.aiTextDetector.detectCompletion(aiText, {
      hasCode: domCodeBlocks.length > 0
    });
    
    // Step 6: Get code block statistics
    const codeBlockStats = this.domCodeBlockDetector.getCodeBlockStats(domCodeBlocks);
    
    const result = {
      success: true,
      response: aiText,
      messageType: messageAnalysis,
      quality: qualityAnalysis,
      completion: completionAnalysis,
      codeBlocks: domCodeBlocks,
      codeBlockStats: codeBlockStats,
      timestamp: new Date(),
      ideType: this.ideType
    };
    
    this.logger.info('📊 [ChatMessageHandler] AI response analysis:', {
      responseLength: aiText.length,
      messageType: messageAnalysis.type,
      hasCodeBlocks: messageAnalysis.hasCodeBlocks,
      codeBlockCount: domCodeBlocks.length,
      qualityScore: qualityAnalysis.score,
      isComplete: completionAnalysis.isComplete,
      confidence: completionAnalysis.confidence
    });
    
    return result;
  }

  /**
   * Wait for AI response with comprehensive analysis
   * @param {Object} page - Playwright page object
   * @param {Object} options - Wait options
   * @returns {Promise<Object>} Complete AI response analysis
   */
  async waitForAIResponse(page, options = {}) {
    this.logger.info('⏳ [ChatMessageHandler] Waiting for AI response with comprehensive analysis');
    
    // Use AITextDetector for waiting and completion detection
    const waitResult = await this.aiTextDetector.waitForAIResponse(page, options);
    
    if (waitResult.success) {
      // Extract code blocks from DOM
      const domCodeBlocks = await this.domCodeBlockDetector.detectCodeBlocks(page);
      
      // Analyze message type
      const messageAnalysis = this.messageTypeDetector.analyzeMessage(
        waitResult.response, 
        'ai', 
        domCodeBlocks
      );
      
      // Get code block statistics
      const codeBlockStats = this.domCodeBlockDetector.getCodeBlockStats(domCodeBlocks);
      
      return {
        ...waitResult,
        messageType: messageAnalysis,
        codeBlocks: domCodeBlocks,
        codeBlockStats: codeBlockStats,
        ideType: this.ideType
      };
    }
    
    return waitResult;
  }

  /**
   * Send message and wait for AI response
   * @param {string} message - User message
   * @param {Object} options - Options
   * @returns {Promise<Object>} Complete response analysis
   */
  async sendMessageAndWait(message, options = {}) {
    this.logger.info('📤 [ChatMessageHandler] Sending message and waiting for response');
    
    // Step 1: Process user message
    const userAnalysis = await this.processUserMessage(message);
    
    // Step 2: Send message (this would be implemented based on IDE type)
    await this.sendMessageToIDE(message);
    
    // Step 3: Wait for and process AI response
    const page = await this.browserManager.getPage();
    const aiAnalysis = await this.waitForAIResponse(page, options);
    
    return {
      userMessage: {
        content: message,
        analysis: userAnalysis
      },
      aiResponse: aiAnalysis,
      timestamp: new Date()
    };
  }

  /**
   * Send message to IDE (placeholder - implement based on IDE type)
   * @param {string} message - Message to send
   */
  async sendMessageToIDE(message) {
    // This would be implemented based on the specific IDE type
    // For now, just log the message
    this.logger.info(`📤 [ChatMessageHandler] Sending message to ${this.ideType}: ${message.substring(0, 50)}...`);
  }

  /**
   * Get comprehensive chat analysis
   * @param {Object} page - Playwright page object
   * @returns {Object} Complete chat analysis
   */
  async getChatAnalysis(page) {
    this.logger.info('🔍 [ChatMessageHandler] Getting comprehensive chat analysis');
    
    // Extract AI response
    const aiText = await this.aiTextDetector.extractLatestAIResponse(page);
    
    // Detect code blocks
    const domCodeBlocks = await this.domCodeBlockDetector.detectCodeBlocks(page);
    
    // Analyze message type
    const messageAnalysis = this.messageTypeDetector.analyzeMessage(aiText, 'ai', domCodeBlocks);
    
    // Analyze quality
    const qualityAnalysis = this.aiTextDetector.analyzeResponseQuality(aiText);
    
    // Get code block statistics
    const codeBlockStats = this.domCodeBlockDetector.getCodeBlockStats(domCodeBlocks);
    
    return {
      aiText: aiText,
      messageType: messageAnalysis,
      quality: qualityAnalysis,
      codeBlocks: domCodeBlocks,
      codeBlockStats: codeBlockStats,
      timestamp: new Date(),
      ideType: this.ideType
    };
  }
}

module.exports = ChatMessageHandlerRefactored; 