import { logger } from "@/infrastructure/logging/Logger";
import ChatService from '@/application/services/ChatService.jsx';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository.jsx';
import EventBus from '@/infrastructure/events/EventBus.jsx';
import ChatComponent from '@/presentation/components/ChatComponent.jsx';
import SidebarLeft from '@/presentation/components/SidebarLeft.jsx';
import SidebarRight from '@/presentation/components/SidebarRight.jsx';
import IDEMirrorComponent from '@/presentation/components/IDEMirrorComponent.jsx';
import PreviewComponent from '@/presentation/components/PreviewComponent.jsx';
import FrameworkPanelComponent from '@/presentation/components/chat/FrameworkPanelComponent.jsx';
import FrameworkModalComponent from '@/presentation/components/chat/FrameworkModalComponent.jsx';

class AppController {
  constructor() {
    this.eventBus = new EventBus();
    this.chatRepository = new APIChatRepository();
    this.chatService = new ChatService(this.chatRepository, this.eventBus);
    
    this.chatComponent = null;
    this.codeExplorerComponent = null;
    this.sidebarLeft = null;
    this.codeSidebarComponent = null;
    this.sidebarRight = null;
    this.codeRightPanelComponent = null;
    this.ideMirrorComponent = null;
    this.previewComponent = null;
    this.frameworkPanelComponent = null;
    this.frameworkModalComponent = null;
    this.currentMode = 'chat';
    this.currentLayout = 'chat'; // 'chat', 'split', 'preview', 'fullscreen'
    this.currentCodeTab = 'tree';
    this.currentTheme = 'dark';
    this.apiRepository = new APIChatRepository();
    
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
      logger.error('Failed to initialize app:', error);
      this.showError('Failed to initialize application');
    }
  }

  async setupComponents() {
    // Initialize chat components
    this.chatComponent = new ChatComponent('chatView', this.eventBus);
    this.sidebarLeft = new SidebarLeft('sidebarLeftContent', this.eventBus);
    this.sidebarRight = new SidebarRight('sidebarRightContent', this.eventBus);
    
    // Initialize code explorer components
    this.codeExplorerComponent = new CodeExplorerComponent('codeExplorerView', this.eventBus);
    this.codeSidebarComponent = new CodeSidebarComponent('codeSidebarContent', this.eventBus);
    this.codeRightPanelComponent = new CodeRightPanelComponent('codeRightPanelContent', this.eventBus);
    
    // Initialize preview component
    this.previewComponent = new PreviewComponent('previewView');
    
    // Frameworks dynamisch laden
    let frameworks = [];
    try {
      const res = await fetch('/api/frameworks');
      const result = await res.json();
      if (result.success) {
        frameworks = result.data.map(framework => ({ 
          name: framework.id, 
          displayName: framework.name,
          active: false 
        }));
      }
    } catch (e) {
      logger.error('Fehler beim Laden der Frameworks:', e);
    }
    this.frameworkPanelComponent = new FrameworkPanelComponent(
      'frameworkPanelContainer',
      (fw) => this.openFrameworkModal(fw),
      (fw) => {/* Toggle-Handler, z.B. speichern */},
      frameworks
    );
    this.frameworkModalComponent = new FrameworkModalComponent('frameworkModalContainer');
    
    // Load initial messages
    this.chatService.loadMessages();
  }

  setupEventListeners() {
    // Chat events
    this.eventBus.on('chat:send:message', async (data) => {
      try {
        const activeFrameworks = this.frameworkPanelComponent?.getActiveFrameworks?.() || [];
        logger.info('Aktive Frameworks:', activeFrameworks);
        let contextText = '';
        let contents = [];
        if (activeFrameworks.length > 0) {
          contents = await Promise.all(
            activeFrameworks.map(fw => fetch(`/framework/${fw.name}`).then(r => r.text()))
          );
          logger.info('Geladene Framework-Inhalte:', contents);
          contextText = contents.map((c, i) => `--- [${activeFrameworks[i].name}] ---\n${c}\n`).join('\n');
          logger.info('Kontexttext:', contextText);
        }
        const fullMessage = contextText + (data.content || '');
        logger.info('FullMessage an ChatService:', fullMessage);
        await this.chatService.sendMessage(fullMessage);
      } catch (error) {
        logger.error('Failed to send message:', error);
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
          logger.info('New IDE started:', result.data);
        } else {
          throw new Error(result.error || 'Failed to start IDE');
        }
      } catch (error) {
        logger.error('Failed to start IDE:', error);
        this.showError('Failed to start IDE');
      }
    });

    this.eventBus.on('chat-sidebar:ide:switch', async (data) => {
      try {
        const { apiCall } = await import('@/infrastructure/repositories/APIChatRepository.jsx');
        const result = await apiCall(`/api/ide/switch/${data.port}`, { method: 'POST' });
        if (result.success) {
          logger.info('Switched to IDE:', result.data);
        } else {
          throw new Error(result.error || 'Failed to switch IDE');
        }
      } catch (error) {
        logger.error('Failed to switch IDE:', error);
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
          logger.info('IDE stopped:', result.data);
        } else {
          throw new Error(result.error || 'Failed to stop IDE');
        }
      } catch (error) {
        logger.error('Failed to stop IDE:', error);
        this.showError('Failed to stop IDE');
      }
    });

    // Sidebar right events
    this.eventBus.on('sidebar-right:quick-prompt', (data) => {
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
        const { apiCall } = await import('@/infrastructure/repositories/APIChatRepository.jsx');
        const result = await apiCall(`/api/chat/port/${data.port}/history`);
        
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
          
          logger.info(`Chat loaded for port ${data.port}: ${result.data.messages.length} messages`);
        } else {
          throw new Error(result.error || 'Failed to load chat');
        }
      } catch (error) {
        logger.error('Failed to load chat for port:', error);
        this.showError(`Failed to load chat for port ${data.port}: ${error.message}`);
      }
    });

    // Handle chat messages loading
    this.eventBus.on('chat:messages:loaded', (data) => {
      if (this.chatComponent && this.chatComponent.loadMessages) {
        this.chatComponent.loadMessages(data.messages);
      }
      
      if (data.session && this.sidebarLeft) {
        this.sidebarLeft.updateSessions([data.session]);
        this.sidebarLeft.setCurrentSession(data.sessionId);
      }
    });

    // User app detection events
    this.eventBus.on('userAppDetected', (data) => {
      this.handleUserAppUrl(data);
    });

    // Active IDE changed events
    this.eventBus.on('activeIDEChanged', (data) => {
      logger.info('🔄 [AppController] Active IDE changed event received:', data);
      logger.info('🔄 [AppController] Refreshing preview...');
      // Refresh preview when switching to a new IDE
      this.refreshPreview();
    });

    // Mode switching
    this.setupModeSwitching();
    
    // Code mode tab switching
    logger.info('🔧 About to setup code tab switching...');
    this.setupCodeTabSwitching();
    logger.info('✅ Code tab switching setup completed');
    
    // Theme switching
    this.setupThemeSwitching();
    
    // Layout controls
    this.setupLayoutControls();
    
    // Preview component events
    this.setupPreviewEvents();
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
      logger.info('🔘 IDE button clicked - switching to IDE Mirror');
      this.switchMode('ide');
    });
  }

  setupCodeTabSwitching() {
    // No tabs needed - IDE Mirror is now a separate full-screen mode
    logger.info('🔧 Tab switching disabled - IDE Mirror is full-screen mode');
  }

  setupThemeSwitching() {
    const themeSwitcher = document.getElementById('themeSwitcher');
    themeSwitcher.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
    });
  }

  setupLayoutControls() {
    const splitViewBtn = document.getElementById('splitViewBtn');
    const fullScreenBtn = document.getElementById('fullScreenBtn');

    splitViewBtn.addEventListener('click', () => {
      this.toggleSplitView();
    });

    fullScreenBtn.addEventListener('click', () => {
      this.toggleFullScreen();
    });
  }

  setupPreviewEvents() {
    // Listen for preview component events
    if (this.previewComponent) {
      this.previewComponent.container.addEventListener('preview:show', (e) => {
        logger.info('Preview shown:', e.detail);
      });

      this.previewComponent.container.addEventListener('preview:hide', (e) => {
        logger.info('Preview hidden');
      });

      this.previewComponent.container.addEventListener('preview:contentChanged', (e) => {
        logger.info('Preview content changed:', e.detail);
      });

      this.previewComponent.container.addEventListener('preview:refresh', (e) => {
        this.refreshPreview();
      });

      this.previewComponent.container.addEventListener('preview:export', (e) => {
        this.exportPreview();
      });

      this.previewComponent.container.addEventListener('preview:share', (e) => {
        this.sharePreview();
      });

      this.previewComponent.container.addEventListener('preview:restartApp', (e) => {
        this.handleAppRestart(e.detail);
      });
    }
  }

  switchMode(mode) {
    logger.info(`🔄 Switching to mode: ${mode}`);
    const chatModeBtn = document.getElementById('chatModeBtn');
    const codeModeBtn = document.getElementById('codeModeBtn');
    const chatView = document.getElementById('chatView');
    const codeExplorerView = document.getElementById('codeExplorerView');
    const ideMirrorView = document.getElementById('ideMirrorView');
    const chatSidebar = document.getElementById('chatSidebar');
    const codeSidebar = document.getElementById('codeSidebar');
    const chatRightPanel = document.getElementById('chatRightPanel');
    const codeRightPanel = document.getElementById('codeRightPanel');

    logger.info('🔍 Found main mode elements:', {
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
      sidebarLeft.style.display = '';
      codeSidebar.style.display = 'none';
      sidebarRight.style.display = '';
      codeRightPanel.style.display = 'none';
      this.currentMode = 'chat';
    } else if (mode === 'ide') {
      logger.info('🖥️ Activating IDE Mirror - FULL SCREEN...');
      codeModeBtn.classList.add('active');
      chatModeBtn.classList.remove('active');
      chatView.style.display = 'none';
      codeExplorerView.style.display = 'none';
      ideMirrorView.style.display = 'block';
      // Hide ALL sidebars for full screen
      sidebarLeft.style.display = 'none';
      codeSidebar.style.display = 'none';
      sidebarRight.style.display = 'none';
      codeRightPanel.style.display = 'none';
      this.currentMode = 'ide';
      
      // Initialize IDE Mirror Component
      if (!this.ideMirrorComponent) {
        logger.info('🔄 Creating IDEMirrorComponent...');
        this.ideMirrorComponent = new IDEMirrorComponent('ideMirrorContainer', this.eventBus);
      }
      logger.info('✅ IDE Mirror activated');
    } else {
      logger.info('🖥️ Activating code mode...');
      codeModeBtn.classList.add('active');
      chatModeBtn.classList.remove('active');
      chatView.style.display = 'none';
      codeExplorerView.style.display = '';
      ideMirrorView.style.display = 'none';
      sidebarLeft.style.display = 'none';
      codeSidebar.style.display = '';
      sidebarRight.style.display = 'none';
      codeRightPanel.style.display = '';
      this.currentMode = 'code';
      logger.info('✅ Code mode activated');
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
      logger.error('Failed to load file tree:', error);
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
      logger.info('DOM Analysis:', data);
      alert('DOM analysis available in browser console (F12)');
    } catch (error) {
      logger.error('Debug error:', error);
      alert('Debug error: ' + error.message);
    }
  }

  setupWebSocket() {
    // WebSocket for chat updates only (existing functionality)
    let chatWs;
    const connectChatWebSocket = () => {
      chatWs = new WebSocket(`ws://${process.env.VITE_BACKEND_URL?.replace('http://', '')}/ws`);
      chatWs.onopen = async () => {
        logger.info('Connected for chat updates');
        logger.info('Connection URL:', chatWs.url);
        logger.info('Ready state:', chatWs.readyState);
        
        // Subscribe to project updates for task sync notifications
        try {
          const { apiCall } = await import('@/infrastructure/repositories/APIChatRepository.jsx');
          const projectId = await this.getCurrentProjectId();
          if (projectId) {
            chatWs.send(JSON.stringify({
              type: 'subscribe:project',
              data: { projectId }
            }));
            logger.info('Subscribed to project updates for project:', projectId);
          }
        } catch (error) {
          logger.error('Failed to subscribe to project updates:', error);
        }
      };
      chatWs.onmessage = (event) => {
        const data = JSON.parse(event.data);
        logger.info('Received message:', data);
        
        // Handle different message formats
        if (data.type === 'chatUpdate' || data.event === 'chatUpdate') {
          logger.info('Chat update received');
          this.chatService.loadMessages();
        }
        if (data.type === 'userAppUrl' || data.event === 'userAppUrl') {
          logger.info('User app URL received:', data.data);
          this.handleUserAppUrl(data.data);
        }
        if (data.type === 'activeIDEChanged' || data.event === 'activeIDEChanged') {
          logger.info('Active IDE changed:', data.data);
          logger.info('Emitting activeIDEChanged event to eventBus');
          // Emit the event to trigger preview refresh
          this.eventBus.emit('activeIDEChanged', data.data);
        }
        if (data.type === 'analysis:completed' || data.event === 'analysis:completed') {
          logger.info('Analysis completed WebSocket event received:', data);
          logger.info('Emitting analysis:completed event to eventBus');
          // Emit the event to trigger analysis data refresh
          this.eventBus.emit('analysis:completed', data.data || data);
        }
        
        // IDE Events
        if (data.type === 'ide:list:updated' || data.event === 'ide:list:updated') {
          logger.info('IDE list updated WebSocket event received:', data);
          logger.info('Emitting ide:list:updated event to eventBus');
          this.eventBus.emit('ide:list:updated', data.data || data);
        }
        
        if (data.type === 'ide:status:changed' || data.event === 'ide:status:changed') {
          logger.info('IDE status changed WebSocket event received:', data);
          logger.info('Emitting ide:status:changed event to eventBus');
          this.eventBus.emit('ide:status:changed', data.data || data);
        }
        
        if (data.type === 'ide:switched' || data.event === 'ide:switched') {
          logger.info('IDE switched WebSocket event received:', data);
          logger.info('Emitting ide:switched event to eventBus');
          this.eventBus.emit('ide:switched', data.data || data);
        }
        
        // Task sync events
        if (data.type === 'task:sync:completed' || data.event === 'task:sync:completed') {
          logger.info('Task sync completed WebSocket event received:', data);
          logger.info('Emitting task:sync:completed event to eventBus');
          this.eventBus.emit('task:sync:completed', data.data || data);
        }
      };
      chatWs.onclose = () => {
        logger.info('Chat WebSocket closed, reconnecting...');
        setTimeout(connectChatWebSocket, 1000);
      };
      chatWs.onerror = (error) => {
        logger.error('Chat WebSocket error:', error);
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
    logger.error('App Error:', message);
    // You could show a toast notification here
  }

  async loadInitialIDEList() {
    try {
      const { apiCall } = await import('@/infrastructure/repositories/APIChatRepository.jsx');
      const result = await apiCall('/api/ide/available');
      if (result.success) {
        this.eventBus.emit('ideListUpdated', { ides: result.data });
      }
    } catch (error) {
      logger.error('Failed to load initial IDE list:', error);
    }
  }

  // Layout Control Methods
  toggleSplitView() {
    const mainLayout = document.querySelector('.main-layout');
    const splitViewBtn = document.getElementById('splitViewBtn');
    const chatSidebar = document.getElementById('chatSidebar');
    const codeSidebar = document.getElementById('codeSidebar');
    
    if (this.currentLayout === 'split') {
      // Exit split view
      mainLayout.classList.remove('split-view');
      splitViewBtn.classList.remove('active');
      this.currentLayout = 'chat';
      if (this.previewComponent) this.previewComponent.hide();
      // Sidebar-Logik wie im Chat-Modus
      sidebarLeft.style.display = '';
      codeSidebar.style.display = 'none';
    } else {
      // Enter split view
      mainLayout.classList.add('split-view');
      splitViewBtn.classList.add('active');
      this.currentLayout = 'split';
      if (this.previewComponent) this.previewComponent.show();
      // **Sidebar SICHTBAR machen!**
      sidebarLeft.style.display = '';
      codeSidebar.style.display = 'none';
    }
  }

  toggleFullScreen() {
    const mainLayout = document.querySelector('.main-layout');
    const fullScreenBtn = document.getElementById('fullScreenBtn');
    
    if (this.currentLayout === 'fullscreen') {
      // Exit fullscreen
      fullScreenBtn.classList.remove('active');
      this.currentLayout = 'chat';
      if (this.previewComponent) {
        this.previewComponent.hideFullScreen();
      }
      // Chat soll wieder expandieren
      mainLayout.classList.remove('split-view');
    } else {
      // Enter fullscreen
      fullScreenBtn.classList.add('active');
      this.currentLayout = 'fullscreen';
      if (this.previewComponent) {
        this.previewComponent.showFullScreen();
      }
      // Chat bleibt schmal
      mainLayout.classList.remove('split-view');
    }
  }

  hidePreview() {
    const mainLayout = document.querySelector('.main-layout');
    if (this.previewComponent) {
      this.previewComponent.hide();
    }
    // Chat soll wieder expandieren
    mainLayout.classList.remove('split-view');
    this.currentLayout = 'chat';
  }

  // Preview Management Methods
  showPreview(content = null, options = {}) {
    if (this.previewComponent) {
      this.previewComponent.show(content, options);
    }
  }

  updatePreviewContent(content) {
    if (this.previewComponent) {
      this.previewComponent.setContent(content);
    }
  }

  async refreshPreview() {
    logger.info('🔄 [AppController] refreshPreview() called');
    try {
      // Ask backend for current user app URL
      const result = await this.apiRepository.getUserAppUrl();
      
      if (result.success && result.data && result.data.url) {
        logger.info('Found user app URL:', result.data.url);
        this.handleUserAppUrl({ url: result.data.url });
      } else {
        logger.info('No user app URL found, checking terminal output...');
        // Trigger terminal monitoring on backend
        const monitorResult = await this.apiRepository.monitorTerminal();
        
        if (monitorResult.success && monitorResult.data && monitorResult.data.url) {
          logger.info('Found URL from terminal monitoring:', monitorResult.data.url);
          this.handleUserAppUrl({ url: monitorResult.data.url });
        } else {
          logger.info('No URL found in terminal output, using default frontend dev server...');
          // Use the main server URL as fallback (not the WebSocket server)
          this.handleUserAppUrl({ url: process.env.VITE_BACKEND_URL });
        }
      }
    } catch (error) {
      logger.error('Failed to refresh preview:', error);
    }
  }

  exportPreview() {
    logger.info('Exporting preview...');
    // Add custom export logic here
  }

  sharePreview() {
    logger.info('Sharing preview...');
    // Add custom share logic here
  }

  handleUserAppUrl(data) {
    if (this.previewComponent && data.url) {
      this.previewComponent.setIframe(data.url);
      // NUR anzeigen, wenn SplitView oder Fullscreen aktiv ist!
      if (this.currentLayout === 'split' || this.currentLayout === 'fullscreen') {
        this.previewComponent.show();
      } else {
        this.previewComponent.hide();
      }
    }
  }

  async handleAppRestart(data) {
    try {
      const result = await this.apiRepository.restartApp({ url: data.url });
      if (!result.success) {
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error('Failed to restart app:', error);
      this.showError('Failed to restart app');
    }
  }

  openFrameworkModal(framework) {
    this.frameworkModalComponent.open(framework);
  }

  async getCurrentProjectId() {
    try {
      return await this.apiRepository.getCurrentProjectId();
    } catch (error) {
      logger.error('Failed to get current project ID:', error);
      return null;
    }
  }
}

export default AppController; 