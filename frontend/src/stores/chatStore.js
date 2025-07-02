import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useChatStore = create(
  persist(
    (set, get) => ({
      // Chat Sessions
      sessions: [],
      activeSessionId: null,
      
      // Messages
      messages: [],
      isLoading: false,
      isTyping: false,
      
      // IDE Integration
      activePort: null,
      availablePorts: [],
      
      // Framework Integration
      activeFrameworks: [],
      availableFrameworks: [],
      
      // UI state
      sidebarOpen: false,
      rightPanelOpen: false,
      
      // Connection state
      isConnected: false,
      error: null,
      
      // Actions
      createSession: (port) => {
        const newSession = {
          id: `session-${Date.now()}`,
          port,
          title: `Chat ${port}`,
          messageCount: 0,
          lastActivity: new Date().toISOString(),
          messages: []
        };
        
        set((state) => ({
          sessions: [...state.sessions, newSession],
          activeSessionId: newSession.id
        }));
        
        return newSession.id;
      },
      
      switchSession: (sessionId) => {
        set({ activeSessionId: sessionId });
      },
      
      deleteSession: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.filter(s => s.id !== sessionId),
          activeSessionId: state.activeSessionId === sessionId ? 
            (state.sessions.length > 1 ? state.sessions[0].id : null) : 
            state.activeSessionId
        }));
      },
      
      addMessage: (sessionId, message) => {
        set((state) => ({
          sessions: state.sessions.map(session => 
            session.id === sessionId 
              ? { 
                  ...session, 
                  messages: [...session.messages, message],
                  messageCount: session.messageCount + 1,
                  lastActivity: new Date().toISOString()
                }
              : session
          ),
          messages: state.activeSessionId === sessionId 
            ? [...state.messages, message]
            : state.messages
        }));
      },
      
      setMessages: (sessionId, messages) => {
        set((state) => ({
          sessions: state.sessions.map(session => 
            session.id === sessionId 
              ? { ...session, messages }
              : session
          ),
          messages: state.activeSessionId === sessionId ? messages : state.messages
        }));
      },
      
      setTyping: (isTyping) => {
        set({ isTyping });
      },
      
      setLoading: (isLoading) => {
        set({ isLoading });
      },
      
      setAvailablePorts: (ports) => {
        set({ availablePorts: ports });
      },
      
      setActivePort: (port) => {
        set({ activePort: port });
      },
      
      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },
      
      toggleRightPanel: () => {
        set((state) => ({ rightPanelOpen: !state.rightPanelOpen }));
      },
      
      toggleFramework: (framework) => {
        set(state => {
          const isActive = state.activeFrameworks.includes(framework);
          return {
            activeFrameworks: isActive 
              ? state.activeFrameworks.filter(f => f !== framework)
              : [...state.activeFrameworks, framework]
          };
        });
      },
      
      setAvailableFrameworks: (frameworks) => {
        set({ availableFrameworks: frameworks });
      },
      
      clearMessages: () => {
        set({ messages: [] });
      },
      
      updateSessionTitle: (sessionId, title) => {
        set(state => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId ? { ...session, title } : session
          )
        }));
      },
      
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      setConnected: (isConnected) => set({ isConnected }),
      
      // Getters
      getActiveSession: () => {
        const { sessions, activeSessionId } = get();
        return sessions.find(s => s.id === activeSessionId);
      },
      
      getSessionMessages: (sessionId) => {
        const { sessions } = get();
        const session = sessions.find(s => s.id === sessionId);
        return session ? session.messages : [];
      },
      
      getLastMessage: () => {
        const state = get();
        return state.messages[state.messages.length - 1];
      },
      
      getMessageCount: () => {
        const state = get();
        return state.messages.length;
      },
      
      // Reset
      reset: () => set({
        messages: [],
        isLoading: false,
        error: null,
        isConnected: false
      })
    }),
    {
      name: 'cursor-chat-store',
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
        activeFrameworks: state.activeFrameworks
      })
    }
  )
);

export default useChatStore; 