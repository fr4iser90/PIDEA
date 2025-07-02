import ChatService from '../../js/application/services/ChatService.js';
import APIChatRepository from '../../js/infrastructure/repositories/APIChatRepository.js';
import EventBus from '../../js/infrastructure/events/EventBus.js';
import API_CONFIG from '../../config/api.js';

class AppController {
  constructor() {
    this.eventBus = new EventBus();
    this.chatRepository = new APIChatRepository();
    this.chatService = new ChatService(this.chatRepository, this.eventBus);
    
    this.currentMode = 'chat';
    this.currentLayout = 'chat'; // 'chat', 'split', 'preview', 'fullscreen'
    this.availableIDEs = [];
    this.activeIDE = null;
    
    this.init();
  }

  async init() {
    try {
      await this.chatService.initialize();
      this.setupEventListeners();
      this.setupWebSocket();
      this.startPolling();
      await this.loadInitialIDEList();
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Failed to initialize application');
    }
  }

  setupEventListeners() {
    // Chat events
    this.eventBus.on('chat:send:message', async (data) => {
      try {
        console.log('Sending message:', data.content);
        await this.chatService.sendMessage(data.content);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    });

    this.eventBus.on('chat:debug:requested', () => {
      this.handleDebug();
    });

    // Chat sidebar events
    this.eventBus.on('chat-sidebar:new-chat', () => {
      this.chatService.createNewSession();
    });

    this.eventBus.on('chat-sidebar:session:requested', (data) => {
      this.chatService.loadSession(data.sessionId);
    });

    this.eventBus.on('chat-sidebar:session:delete', (data) => {
      this.chatService.deleteSession(data.sessionId);
    });

    // IDE management events
    this.eventBus.on('chat-sidebar:new-ide', async () => {
      try {
        const response = await fetch(`${API_CONFIG.baseURL}/api/ide/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const result = await response.json();
        if (result.success) {
          console.log('New IDE started:', result.data);
          await this.loadInitialIDEList();
        } else {
          throw new Error(result.error || 'Failed to start IDE');
        }
      } catch (error) {
        console.error('Failed to start IDE:', error);
        this.showError('Failed to start IDE');
      }
    });

    this.eventBus.on('chat-sidebar:ide:switch', async (data) => {
      try {
        const response = await fetch(`${API_CONFIG.baseURL}/api/ide/switch/${data.port}`, {
          method: 'POST'
        });
        const result = await response.json();
        if (result.success) {
          console.log('Switched to IDE:', result.data);
          this.activeIDE = data.port;
          this.eventBus.emit('activeIDEChanged', { port: data.port });
        } else {
          throw new Error(result.error || 'Failed to switch IDE');
        }
      } catch (error) {
        console.error('Failed to switch IDE:', error);
        this.showError('Failed to switch IDE');
      }
    });

    this.eventBus.on('chat-sidebar:ide:stop', async (data) => {
      try {
        const response = await fetch(`${API_CONFIG.baseURL}/api/ide/stop/${data.port}`, {
          method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
          console.log('IDE stopped:', result.data);
          await this.loadInitialIDEList();
        } else {
          throw new Error(result.error || 'Failed to stop IDE');
        }
      } catch (error) {
        console.error('Failed to stop IDE:', error);
        this.showError('Failed to stop IDE');
      }
    });

    // Mode switching events
    this.eventBus.on('app:mode:switch', (data) => {
      this.switchMode(data.mode);
    });

    // Layout events
    this.eventBus.on('app:layout:change', (data) => {
      this.currentLayout = data.layout;
      this.eventBus.emit('layout:changed', { layout: this.currentLayout });
    });
  }

  setupWebSocket() {
    const connectChatWebSocket = () => {
      try {
        const ws = new WebSocket(`${API_CONFIG.wsURL}/ws/chat`);
        
        ws.onopen = () => {
          console.log('WebSocket connected');
          this.eventBus.emit('websocket:connected');
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.eventBus.emit('websocket:message', data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };
        
        ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.eventBus.emit('websocket:disconnected');
          // Reconnect after 5 seconds
          setTimeout(connectChatWebSocket, 5000);
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }
    };
    
    connectChatWebSocket();
  }

  startPolling() {
    // Poll for new messages every 5 seconds
    setInterval(() => {
      this.chatService.loadMessages();
    }, 5000);
  }

  async loadInitialIDEList() {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/api/ide/available`);
      const result = await response.json();
      if (result.success) {
        this.availableIDEs = result.data.ides || [];
        this.eventBus.emit('ideListUpdated', { ides: this.availableIDEs });
      }
    } catch (error) {
      console.error('Failed to load IDE list:', error);
    }
  }

  switchMode(mode) {
    this.currentMode = mode;
    this.eventBus.emit('mode:changed', { mode: this.currentMode });
  }

  async handleDebug() {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/api/debug`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const result = await response.json();
      if (result.success) {
        console.log('Debug info:', result.data);
        this.eventBus.emit('debug:info', result.data);
      } else {
        throw new Error(result.error || 'Debug failed');
      }
    } catch (error) {
      console.error('Debug failed:', error);
      this.showError('Debug failed');
    }
  }

  showError(message) {
    this.eventBus.emit('app:error', { message });
  }

  getEventBus() {
    return this.eventBus;
  }

  getChatService() {
    return this.chatService;
  }
}

export default AppController; 