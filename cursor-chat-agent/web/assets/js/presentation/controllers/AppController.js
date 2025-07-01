import ChatService from '../../application/services/ChatService.js';
import APIChatRepository from '../../infrastructure/repositories/APIChatRepository.js';
import EventBus from '../../infrastructure/events/EventBus.js';
import ChatComponent from '../components/ChatComponent.js';
import CodeExplorerComponent from '../components/CodeExplorerComponent.js';
import ChatSidebarComponent from '../components/ChatSidebarComponent.js';
import CodeSidebarComponent from '../components/CodeSidebarComponent.js';
import ChatRightPanelComponent from '../components/ChatRightPanelComponent.js';
import CodeRightPanelComponent from '../components/CodeRightPanelComponent.js';
import IDEMirrorComponent from '../components/IDEMirrorComponent.js';

class AppController {
  constructor() {
    this.eventBus = new EventBus();
    this.chatRepository = new APIChatRepository();
    this.chatService = new ChatService(this.chatRepository, this.eventBus);
    
    this.chatComponent = null;
    this.codeExplorerComponent = null;
    this.chatSidebarComponent = null;
    this.codeSidebarComponent = null;
    this.chatRightPanelComponent = null;
    this.codeRightPanelComponent = null;
    this.ideMirrorComponent = null;
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
      await this.loadInitialIDEList();
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Failed to initialize application');
    }
  }

  setupComponents() {
    // Initialize chat components
    this.chatComponent = new ChatComponent('chatView', this.eventBus);
    this.chatSidebarComponent = new ChatSidebarComponent('chatSidebarContent', this.eventBus);
    this.chatRightPanelComponent = new ChatRightPanelComponent('chatRightPanelContent', this.eventBus);
    
    // Initialize code explorer components
    this.codeExplorerComponent = new CodeExplorerComponent('codeExplorerView', this.eventBus);
    this.codeSidebarComponent = new CodeSidebarComponent('codeSidebarContent', this.eventBus);
    this.codeRightPanelComponent = new CodeRightPanelComponent('codeRightPanelContent', this.eventBus);
    
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
        const response = await fetch('/api/ide/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const result = await response.json();
        if (result.success) {
          console.log('New IDE started:', result.data);
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
        const response = await fetch(`/api/ide/switch/${data.port}`, {
          method: 'POST'
        });
        const result = await response.json();
        if (result.success) {
          console.log('Switched to IDE:', result.data);
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
        const response = await fetch(`/api/ide/stop/${data.port}`, {
          method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
          console.log('IDE stopped:', result.data);
        } else {
          throw new Error(result.error || 'Failed to stop IDE');
        }
      } catch (error) {
        console.error('Failed to stop IDE:', error);
        this.showError('Failed to stop IDE');
      }
    });

    // Chat right panel events
    this.eventBus.on('chat-right-panel:quick-prompt', (data) => {
      this.chatService.sendMessage(data.prompt);
    });

    // Code sidebar events
    this.eventBus.on('code-sidebar:refresh-files', () => {
      this.loadFileTree();
    });

    this.eventBus.on('code-sidebar:file:requested', (data) => {
      this.loadFile(data.path);
    });

    // Code explorer events
    this.eventBus.on('code-explorer:toggle-chat', () => {
      this.toggleCodeRightPanel();
    });

    this.eventBus.on('code-explorer:file:requested', (data) => {
      this.loadFile(data.path);
    });

    // NEW: Chat for port loading
    this.eventBus.on('chat-sidebar:load-chat-for-port', async (data) => {
      try {
        const response = await fetch(`/api/chat/port/${data.port}/history`);
        const result = await response.json();
        
        if (result.success) {
          // Update chat with new messages
          this.eventBus.emit('chat:messages:loaded', { 
            messages: result.data.messages,
            port: data.port,
            sessionId: result.data.sessionId,
            session: result.data.session
          });
          
          // Update session in sidebar
          this.eventBus.emit('chat-sidebar:session:selected', { 
            sessionId: result.data.sessionId 
          });
          
          console.log(`Chat loaded for port ${data.port}: ${result.data.messages.length} messages`);
        } else {
          throw new Error(result.error || 'Failed to load chat');
        }
      } catch (error) {
        console.error('Failed to load chat for port:', error);
        this.showError(`Failed to load chat for port ${data.port}: ${error.message}`);
      }
    });

    // Handle chat messages loading
    this.eventBus.on('chat:messages:loaded', (data) => {
      if (this.chatComponent && this.chatComponent.loadMessages) {
        this.chatComponent.loadMessages(data.messages);
      }
      
      if (data.session && this.chatSidebarComponent) {
        this.chatSidebarComponent.updateSessions([data.session]);
        this.chatSidebarComponent.setCurrentSession(data.sessionId);
      }
    });

    // Mode switching
    this.setupModeSwitching();
    
    // Code mode tab switching
    console.log('🔧 About to setup code tab switching...');
    this.setupCodeTabSwitching();
    console.log('✅ Code tab switching setup completed');
    
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
      console.log('🔘 IDE button clicked - switching to IDE Mirror');
      this.switchMode('ide');
    });
  }

  setupCodeTabSwitching() {
    // No tabs needed - IDE Mirror is now a separate full-screen mode
    console.log('🔧 Tab switching disabled - IDE Mirror is full-screen mode');
  }

  setupThemeSwitching() {
    const themeSwitcher = document.getElementById('themeSwitcher');
    themeSwitcher.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
    });
  }

  switchMode(mode) {
    console.log(`🔄 Switching to mode: ${mode}`);
    const chatModeBtn = document.getElementById('chatModeBtn');
    const codeModeBtn = document.getElementById('codeModeBtn');
    const chatView = document.getElementById('chatView');
    const codeExplorerView = document.getElementById('codeExplorerView');
    const ideMirrorView = document.getElementById('ideMirrorView');
    const chatSidebar = document.getElementById('chatSidebar');
    const codeSidebar = document.getElementById('codeSidebar');
    const chatRightPanel = document.getElementById('chatRightPanel');
    const codeRightPanel = document.getElementById('codeRightPanel');

    console.log('🔍 Found main mode elements:', {
      chatModeBtn: !!chatModeBtn,
      codeModeBtn: !!codeModeBtn,
      chatView: !!chatView,
      codeExplorerView: !!codeExplorerView,
      ideMirrorView: !!ideMirrorView
    });

    if (mode === 'chat') {
      chatModeBtn.classList.add('active');
      codeModeBtn.classList.remove('active');
      chatView.style.display = '';
      codeExplorerView.style.display = 'none';
      ideMirrorView.style.display = 'none';
      chatSidebar.style.display = '';
      codeSidebar.style.display = 'none';
      chatRightPanel.style.display = '';
      codeRightPanel.style.display = 'none';
      this.currentMode = 'chat';
    } else if (mode === 'ide') {
      console.log('🖥️ Activating IDE Mirror - FULL SCREEN...');
      codeModeBtn.classList.add('active');
      chatModeBtn.classList.remove('active');
      chatView.style.display = 'none';
      codeExplorerView.style.display = 'none';
      ideMirrorView.style.display = 'block';
      // Hide ALL sidebars for full screen
      chatSidebar.style.display = 'none';
      codeSidebar.style.display = 'none';
      chatRightPanel.style.display = 'none';
      codeRightPanel.style.display = 'none';
      this.currentMode = 'ide';
      
      // Initialize IDE Mirror Component
      if (!this.ideMirrorComponent) {
        console.log('🔄 Creating IDEMirrorComponent...');
        this.ideMirrorComponent = new IDEMirrorComponent('ideMirrorContainer', this.eventBus);
      }
      console.log('✅ IDE Mirror activated');
    } else {
      console.log('🖥️ Activating code mode...');
      codeModeBtn.classList.add('active');
      chatModeBtn.classList.remove('active');
      chatView.style.display = 'none';
      codeExplorerView.style.display = '';
      ideMirrorView.style.display = 'none';
      chatSidebar.style.display = 'none';
      codeSidebar.style.display = '';
      chatRightPanel.style.display = 'none';
      codeRightPanel.style.display = '';
      this.currentMode = 'code';
      console.log('✅ Code mode activated');
    }
  }

  toggleCodeRightPanel() {
    const codeRightPanel = document.getElementById('codeRightPanel');
    const isVisible = codeRightPanel.style.display !== 'none';
    
    if (isVisible) {
      codeRightPanel.style.display = 'none';
    } else {
      codeRightPanel.style.display = 'flex';
    }
  }

  async loadFileTree() {
    try {
      const response = await fetch('/api/files');
      const result = await response.json();
      
      if (result.success) {
        this.eventBus.emit('code-sidebar:files:loaded', { files: result.data });
      } else {
        throw new Error(result.error || 'Failed to load file tree');
      }
    } catch (error) {
      console.error('Failed to load file tree:', error);
      this.showError('Failed to load file tree');
    }
  }

  async loadFile(path) {
    // Suche nach fehlerhaften Datei-API-Requests und entferne sie
    // (Die Datei wird jetzt nur noch über /api/files/content?path=... geladen)
    // Entferne die Zeile:
    // const response = await fetch(`/api/files/${encodeURIComponent(path)}`);
    // und alle zugehörigen Fehlerbehandlungen, die darauf basieren.
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

  async loadInitialIDEList() {
    try {
      const response = await fetch('/api/ide/available');
      const result = await response.json();
      if (result.success) {
        this.eventBus.emit('ideListUpdated', { ides: result.data });
      }
    } catch (error) {
      console.error('Failed to load initial IDE list:', error);
    }
  }
}

export default AppController; 