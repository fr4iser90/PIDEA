import React, { useState, useEffect, useRef } from 'react';
import { apiCall, API_CONFIG } from '@infrastructure/repositories/APIChatRepository.jsx';

// Use global marked from CDN script tag

// Hilfsfunktion für HTML-Escaping
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function ChatComponent({ eventBus }) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setupEventListeners();
    loadChatHistory();
    return () => {};
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const setupEventListeners = () => {
    if (eventBus) {
      eventBus.on('chat-message-received', handleMessageReceived);
      eventBus.on('chat-typing-started', handleTypingStarted);
      eventBus.on('chat-typing-stopped', handleTypingStopped);
      eventBus.on('chat-connected', handleConnected);
      eventBus.on('chat-disconnected', handleDisconnected);
    }
  };

  const loadChatHistory = async () => {
    try {
      const data = await apiCall(API_CONFIG.endpoints.chat.history);
      if (data.success && data.data && data.data.messages) {
        setMessages(data.data.messages);
      } else if (data.messages) {
        setMessages(data.messages);
      } else if (Array.isArray(data)) {
        setMessages(data);
      } else {
        setMessages([]);
      }
    } catch (error) {
      setMessages([]);
      console.error('❌ Failed to load chat history:', error);
    }
  };

  const handleMessageReceived = (message) => {
    setMessages(prevMessages => [...prevMessages, message]);
    if (eventBus) {
      eventBus.emit('chat-message-added', { message });
    }
  };

  const handleTypingStarted = () => setIsTyping(true);
  const handleTypingStopped = () => setIsTyping(false);
  const handleConnected = () => setIsConnected(true);
  const handleDisconnected = () => setIsConnected(false);

  const sendMessage = async (message) => {
    if (!message.trim()) return;
    const newMessage = {
      id: Date.now(),
      text: message,
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: 'text'
    };
    setMessages(prevMessages => [...prevMessages, newMessage]);
    setInputValue('');
    try {
      const result = await apiCall(API_CONFIG.endpoints.chat.send, {
        method: 'POST',
        body: JSON.stringify({ message: message.trim() })
      });
      if (result.success) {
        // ok
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        text: `Error: ${error.message}`,
        sender: 'system',
        timestamp: new Date().toISOString(),
        type: 'error'
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    }
  };

  const handleInputChange = (e) => setInputValue(e.target.value);
  const handleInputKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputValue); } };
  const handleSendClick = () => sendMessage(inputValue);
  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  const clearChat = () => setMessages([]);
  const exportChat = () => {
    const chatData = { messages, exportDate: new Date().toISOString(), totalMessages: messages.length };
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const formatTimestamp = (timestamp) => { const date = new Date(timestamp); return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
  const renderMessage = (message) => {
    const isUser = message.sender === 'user';
    const isSystem = message.sender === 'system';
    return (
      <div key={message.id} className={`message ${isUser ? 'user' : isSystem ? 'system' : 'ai'}`}>
        <div className="message-bubble">
          <div className="message-text">{message.text}</div>
          <div className="message-timestamp">{formatTimestamp(message.timestamp)}</div>
        </div>
        <div className="message-avatar">{isUser ? 'U' : isSystem ? 'S' : 'AI'}</div>
      </div>
    );
  };
  return (
    <div ref={containerRef} className="chat-container">
      <div className="chat-header">
        <h2>Chat</h2>
        <div className="chat-header-actions">
          <div className="status-indicator">
            <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <button onClick={clearChat} className="btn-icon" title="Clear Chat">🗑️</button>
          <button onClick={exportChat} className="btn-icon" title="Export Chat">📤</button>
        </div>
      </div>
      <div className="messages-container" id="messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div className="empty-chat-icon">💬</div>
            <h3>No messages yet</h3>
            <p>Start a conversation by typing a message below.</p>
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        {isTyping && (
          <div className="typing-indicator show">
            <div className="message-avatar">AI</div>
            <div className="message-bubble">
              <div className="typing-dots">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="input-area">
        <div className="input-container">
          <textarea id="msgInput" value={inputValue} onChange={handleInputChange} onKeyPress={handleInputKeyPress} placeholder="Type your message..." />
          <div className="button-group">
            <button id="sendBtn" onClick={handleSendClick} disabled={!inputValue.trim()} className="btn btn-primary">Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatComponent; 