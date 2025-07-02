const SendMessageCommand = require('../commands/SendMessageCommand');
const ChatMessage = require('../../domain/entities/ChatMessage');
const ChatSession = require('../../domain/entities/ChatSession');

class SendMessageHandler {
  constructor(chatRepository, cursorIDEService, eventBus) {
    this.chatRepository = chatRepository;
    this.cursorIDEService = cursorIDEService;
    this.eventBus = eventBus;
  }

  async handle(command) {
    // Validate command
    command.validate();

    try {
      // Create message entity
      const type = command.content.includes('```') ? 'code' : 'text';
      const message = ChatMessage.createUserMessage(command.content, type);

      // Get or create session
      let session;
      if (command.sessionId) {
        session = await this.chatRepository.findSessionById(command.sessionId);
        if (!session) {
          throw new Error('Session not found');
        }
      } else {
        // Create new session with IDE port assignment
        const activePort = this.cursorIDEService.getActivePort();
        session = new ChatSession(null, null, {}, activePort);
      }

      // Add message to session
      session.addMessage(message);

      // Save to repository
      await this.chatRepository.saveSession(session);

      // Switch to session's IDE if needed
      if (session.idePort) {
        await this.cursorIDEService.switchToSession(session);
      }

      // Send to Cursor IDE
      await this.cursorIDEService.sendMessage(command.content);

      // Publish events
      if (this.eventBus) {
        await this.eventBus.publish('MessageSent', {
          sessionId: session.id,
          messageId: message.id,
          content: message.content,
          sender: message.sender,
          type: message.type,
          timestamp: message.timestamp
        });
      }

      return {
        success: true,
        sessionId: session.id,
        messageId: message.id,
        message: message
      };

    } catch (error) {
      console.error('[SendMessageHandler] Error:', error);
      throw error;
    }
  }
}

module.exports = SendMessageHandler; 