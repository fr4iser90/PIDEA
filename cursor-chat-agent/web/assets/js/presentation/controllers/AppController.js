import ChatService from '../../application/services/ChatService.js';
import APIChatRepository from '../../infrastructure/repositories/APIChatRepository.js';
import EventBus from '../../infrastructure/events/EventBus.js';
import ChatComponent from '../components/ChatComponent.js';
import CodeExplorerComponent from '../components/CodeExplorerComponent.js';

class AppController {
  constructor() {
    this.eventBus = new EventBus();
    this.chatRepository = new APIChatRepository();
    this.chatService = new ChatService(this.chatRepository, this.eventBus);
    
    this.chatComponent = null;
    this.codeExplorerComponent = null;
    this.currentMode = 'chat';
    
    this.init();
  }

  async init() {
    try {
      await this.chatService.initialize();
      this.setupComponents();
      this.setupEventListeners();
      this.setupWebSocket();
      this.startPolling();
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Failed to initialize application');
    }
  }

  setupComponents() {
    // Initialize chat component
    this.chatComponent = new ChatComponent('chatView', this.eventBus);
    
    // Initialize code explorer component
    this.codeExplorerComponent = new CodeExplorerComponent('codeExplorerView', this.eventBus);
    
    // Load initial messages
    this.chatService.loadMessages();
  }

  setupEventListeners() {
    // Chat events
    this.eventBus.on('chat:send:message', async (data) => {
      try {
        await this.chatService.sendMessage(data.content);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    });

    this.eventBus.on('chat:debug:requested', () => {
      this.handleDebug();
    });

    // Code explorer events
    this.eventBus.on('code-explorer:toggle-chat', () => {
      this.toggleRightPanel();
    });

    this.eventBus.on('code-explorer:file:requested', (data) => {
      this.loadFile(data.path);
    });

    // Mode switching
    this.setupModeSwitching();
    
    // Theme switching
    this.setupThemeSwitching();
  }

  setupModeSwitching() {
    const chatModeBtn = document.getElementById('chatModeBtn');
    const codeModeBtn = document.getElementById('codeModeBtn');
    const chatView = document.getElementById('chatView');
    const codeExplorerView = document.getElementById('codeExplorerView');

    chatModeBtn.addEventListener('click', () => {
      this.switchMode('chat');
    });

    codeModeBtn.addEventListener('click', () => {
      this.switchMode('code');
    });
  }

  setupThemeSwitching() {
    const themeSwitcher = document.getElementById('themeSwitcher');
    themeSwitcher.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
    });
  }

  switchMode(mode) {
    const chatModeBtn = document.getElementById('chatModeBtn');
    const codeModeBtn = document.getElementById('codeModeBtn');
    const chatView = document.getElementById('chatView');
    const codeExplorerView = document.getElementById('codeExplorerView');

    if (mode === 'chat') {
      chatModeBtn.classList.add('active');
      codeModeBtn.classList.remove('active');
      chatView.style.display = '';
      codeExplorerView.style.display = 'none';
      this.currentMode = 'chat';
    } else {
      codeModeBtn.classList.add('active');
      chatModeBtn.classList.remove('active');
      chatView.style.display = 'none';
      codeExplorerView.style.display = '';
      this.currentMode = 'code';
    }
  }

  toggleRightPanel() {
    const rightPanel = document.getElementById('rightPanel');
    const isVisible = rightPanel.style.display !== 'none';
    
    if (isVisible) {
      rightPanel.style.display = 'none';
    } else {
      rightPanel.style.display = 'flex';
    }
  }

  async loadFile(path) {
    try {
      const response = await fetch(`/api/files/${encodeURIComponent(path)}`);
      const file = await response.json();
      
      this.eventBus.emit('code-explorer:file:selected', { file });
    } catch (error) {
      console.error('Failed to load file:', error);
      this.showError('Failed to load file');
    }
  }

  async handleDebug() {
    try {
      const response = await fetch('/debug-dom');
      const data = await response.json();
      console.log('DOM Analysis:', data);
      alert('DOM analysis available in browser console (F12)');
    } catch (error) {
      console.error('Debug error:', error);
      alert('Debug error: ' + error.message);
    }
  }

  setupWebSocket() {
    // WebSocket for live reloading
    let ws;
    const connectWebSocket = () => {
      ws = new WebSocket('ws://localhost:3001');
      
      ws.onopen = () => {
        console.log('[WebSocket] Connected for live reload');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'reload') {
          console.log('[WebSocket] Reloading page...', data.file);
          window.location.reload();
        }
      };
      
      ws.onclose = () => {
        console.log('[WebSocket] Connection closed, attempting to reconnect...');
        setTimeout(connectWebSocket, 1000);
      };
      
      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };
    };
    
    connectWebSocket();

    // WebSocket for chat updates
    let chatWs;
    const connectChatWebSocket = () => {
      chatWs = new WebSocket('ws://localhost:3001');
      chatWs.onopen = () => {
        console.log('[WebSocket] Connected for chat updates');
      };
      chatWs.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'chatUpdate') {
          console.log('[WebSocket] Chat update received');
          this.chatService.loadMessages();
        }
      };
      chatWs.onclose = () => {
        console.log('[WebSocket] Chat WebSocket closed, reconnecting...');
        setTimeout(connectChatWebSocket, 1000);
      };
      chatWs.onerror = (error) => {
        console.error('[WebSocket] Chat WebSocket error:', error);
      };
    };
    connectChatWebSocket();
  }

  startPolling() {
    // Poll for messages every 2 seconds
    setInterval(() => {
      this.chatService.loadMessages();
    }, 2000);
  }

  showError(message) {
    console.error('App Error:', message);
    // You could show a toast notification here
  }
}

export default AppController; 