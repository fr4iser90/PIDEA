import ChatMessage from '@domain/entities/ChatMessage.jsx';
import ChatSession from '@domain/entities/ChatSession.jsx';

class ChatService {
  constructor(chatRepository, eventBus) {
    this.chatRepository = chatRepository;
    this.eventBus = eventBus;
    this.currentSession = null;
    this.isTyping = false;
  }

  async initialize() {
    try {
      this.currentSession = await this.chatRepository.getCurrentSession();
      const messages = await this.chatRepository.getChatHistory();
      
      messages.forEach(message => {
        this.currentSession.addMessage(message);
      });

      this.eventBus.emit('chat:initialized', { session: this.currentSession });
      return this.currentSession;
    } catch (error) {
      this.eventBus.emit('chat:error', { error: error.message });
      throw error;
    }
  }

  async sendMessage(content) {
    if (!content || !content.trim()) {
      throw new Error('Message content cannot be empty');
    }

    try {
      this.setTyping(true);
      
      const userMessage = new ChatMessage(
        this.generateId(),
        content.trim(),
        'user'
      );

      this.currentSession.addMessage(userMessage);
      this.eventBus.emit('chat:message:sent', { message: userMessage });

      const result = await this.chatRepository.sendMessage(userMessage);
      
      this.setTyping(false);
      
      // Reload messages after sending
      setTimeout(() => this.loadMessages(), 1000);
      
      return result;
    } catch (error) {
      this.setTyping(false);
      this.eventBus.emit('chat:error', { error: error.message });
      throw error;
    }
  }

  async loadMessages() {
    try {
      const messages = await this.chatRepository.getChatHistory();
      
      // Only update if we have a valid session
      if (this.currentSession && Array.isArray(messages)) {
        this.currentSession.messages = messages;
        this.currentSession.lastActivity = new Date();
        
        this.eventBus.emit('chat:messages:loaded', { 
          messages: messages,
          session: this.currentSession 
        });
      }
      
      return messages;
    } catch (error) {
      // Don't emit error events for polling failures
      console.debug('Chat messages load failed (normal during startup):', error.message);
      return [];
    }
  }

  async createNewSession() {
    const newSession = new ChatSession(
      this.generateId(),
      'New Chat'
    );
    
    this.currentSession = newSession;
    await this.chatRepository.createSession(newSession);
    
    this.eventBus.emit('chat:session:created', { session: newSession });
    return newSession;
  }

  setTyping(isTyping) {
    this.isTyping = isTyping;
    this.currentSession.setTyping(isTyping);
    this.eventBus.emit('chat:typing:changed', { isTyping });
  }

  getCurrentSession() {
    return this.currentSession;
  }

  getMessages() {
    return this.currentSession ? this.currentSession.messages : [];
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export default ChatService; 