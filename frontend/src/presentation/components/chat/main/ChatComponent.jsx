import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiCall, API_CONFIG } from '@/infrastructure/repositories/APIChatRepository.jsx';
import ChatMessage from '@/domain/entities/ChatMessage.jsx';
import '@/css/main/chat.css';
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';

// Use global marked from CDN script tag

// Hilfsfunktion für HTML-Escaping
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function normalizeMessage(msg) {
  // Fallbacks für sender/type
  let sender = msg.sender;
  let type = msg.type;
  if (!sender) {
    if (type === 'user' || msg.isUserMessage?.() || msg.role === 'user') sender = 'user';
    else if (type === 'ai' || msg.isAIMessage?.() || msg.role === 'ai') sender = 'ai';
    else if (type === 'system' || msg.role === 'system') sender = 'system';
    else sender = 'ai'; // fallback
  }
  if (!type) {
    if (msg.content && msg.content.includes('```')) type = 'code';
    else if (msg.type) type = msg.type;
    else type = 'text';
  }
  return { ...msg, sender, type };
}

async function fetchPromptContent(promptFile) {
  let url;
  if (promptFile.startsWith('frameworks/')) {
    const parts = promptFile.split('/');
    const frameworkId = parts[1];
    const filename = parts[3];
    url = `/api/frameworks/${frameworkId}/prompts/${filename}`;
  } else {
    let filePath = promptFile;
    if (filePath.startsWith('prompts/')) filePath = filePath.substring(8);
    const pathParts = filePath.split('/');
    const filename = pathParts.pop();
    const category = pathParts.join('/');
    url = `/api/prompts/${category}/${filename}`;
  }
  const response = await apiCall(url);
  // Robust: prüfe alle sinnvollen Felder
  if (response.content) return response.content;
  if (response.data && response.data.content) return response.data.content;
  if (typeof response.data === 'string') return response.data;
  if (typeof response === 'string') return response;
  throw new Error(`Prompt content not found for ${promptFile}`);
}

function ChatComponent({ eventBus, activePort, attachedPrompts = [] }) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const msgInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const { user } = useAuthStore.getState();
  const requestedBy = user?.email || user?.id || 'unknown';

  // Lade Chat immer, wenn activePort sich ändert (React-Way)
  const loadChatHistory = useCallback(async () => {
    if (!activePort) return;
    console.log('[ChatComponent] Lade Chat für Port:', activePort);
    try {
      const data = await apiCall(API_CONFIG.endpoints.chat.portHistory(activePort));
      let msgs = [];
      if (data.success && data.data && data.data.messages) {
        msgs = data.data.messages;
      } else if (data.messages) {
        msgs = data.messages;
      } else if (Array.isArray(data)) {
        msgs = data;
      }
      console.log('[ChatComponent] Neue Nachrichten geladen:', msgs.length);
      setMessages(msgs.map(normalizeMessage));
    } catch (error) {
      setMessages([]);
      setError('❌ Failed to load chat history: ' + error.message);
    }
  }, [activePort]);

  useEffect(() => {
    console.log('[ChatComponent] activePort changed:', activePort);
    // Wenn sich der Port ändert, sofort leeren!
    setMessages([]);
    setError(null);
    console.log('[ChatComponent] setMessages([]) aufgerufen!');
    loadChatHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePort]);

  useEffect(() => {
    if (shouldAutoScroll) scrollToBottom();
  }, [messages, isTyping]);

  // Listen for external chat messages (from task execution, etc.)
  useEffect(() => {
    if (!eventBus) return;
    
    const handleExternalMessage = (data) => {
      if (data && data.message) {
        console.log('[ChatComponent] Received external message:', data.message);
        sendMessage(data.message);
      }
    };

    eventBus.on('chat:send:message', handleExternalMessage);
    
    return () => {
      eventBus.off('chat:send:message', handleExternalMessage);
    };
  }, [eventBus]);

  const sendMessage = async (message) => {
    if (!message.trim()) return;
    let promptContents = [];
    let failedPrompts = [];
    // Fetch all attached prompt contents
    if (attachedPrompts.length > 0) {
      await Promise.all(attachedPrompts.map(async (promptFile) => {
        try {
          const content = await fetchPromptContent(promptFile);
          promptContents.push(content);
        } catch (err) {
          failedPrompts.push(promptFile);
        }
      }));
    }
    // Combine prompt contents and user message
    const finalMessage = `${promptContents.join('\n\n')}${promptContents.length > 0 ? '\n\n' : ''}${message}`;
    // === DEBUG LOGS START ===
    console.log('==== PROMPT CONTENTS ====', promptContents);
    console.log('==== FAILED PROMPTS ====', failedPrompts);
    console.log('==== FINAL MESSAGE ====', finalMessage);
    // === DEBUG LOGS END ===
    const newMessage = normalizeMessage({
      id: Date.now(),
      content: finalMessage,
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: finalMessage.includes('```') ? 'code' : 'text'
    });
    setMessages(prevMessages => [...prevMessages, newMessage]);
    setInputValue('');
    if (failedPrompts.length > 0) {
      const errorMessage = normalizeMessage({
        id: Date.now() + 1,
        content: `Fehler beim Laden folgender Prompts: ${failedPrompts.join(', ')}`,
        sender: 'system',
        timestamp: new Date().toISOString(),
        type: 'error'
      });
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    }
    try {

      // Send message to active IDE
      const result = await apiCall(API_CONFIG.endpoints.chat.send, {
        method: 'POST',
        body: JSON.stringify({ message: finalMessage.trim(), requestedBy })
      });
      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error) {
      setError('❌ ' + error.message);
      const errorMessage = normalizeMessage({
        id: Date.now() + 2,
        content: `Error: ${error.message}`,
        sender: 'system',
        timestamp: new Date().toISOString(),
        type: 'error'
      });
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    }
  };

  const handleInputChange = (e) => setInputValue(e.target.value);
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
    autoResizeTextarea();
  };
  const handleSendClick = () => sendMessage(inputValue);
  const handleDebugClick = () => eventBus && eventBus.emit('chat:debug:requested');
  const handleFileUploadClick = () => fileInputRef.current && fileInputRef.current.click();
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setInputValue(ev.target.result);
      autoResizeTextarea();
    };
    reader.readAsText(file);
  };
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  const handleScroll = (e) => {
    const el = e.target;
    const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
    setShouldAutoScroll(isAtBottom);
  };
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
  const autoResizeTextarea = () => {
    const textarea = msgInputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, window.innerHeight * 0.7) + 'px';
    }
  };
  useEffect(() => { autoResizeTextarea(); }, [inputValue]);

  // Copy code to clipboard
  const handleCopyClick = (code) => {
    navigator.clipboard.writeText(code);
  };

  // Render message bubble (user/ai)
  const renderMessage = (message, index) => {
    const isUser = message.sender === 'user';
    const isAI = message.sender === 'ai';
    const isCode = message.type === 'code';
    let content = message.content || message.text;
    let bubbleContent;
    if (isAI && window.marked) {
      bubbleContent = (
        <div className="message-bubble" dangerouslySetInnerHTML={{ __html: window.marked.parse(content) }} />
      );
    } else if (isCode) {
      bubbleContent = (
        <pre className="user-codeblock">
          <code>{content.replace(/^```[a-zA-Z0-9]*|```$/g, '').trim()}</code>
          <button className="codeblock-copy-btn" onClick={() => handleCopyClick(content.replace(/^```[a-zA-Z0-9]*|```$/g, '').trim())}>Copy</button>
        </pre>
      );
    } else {
      bubbleContent = <div className="message-bubble">{escapeHtml(content)}</div>;
    }
    return (
      <div className={`message ${isUser ? 'user' : 'ai'}`} key={message.id || index} data-index={index}>
        {isUser && !isCode && <div className="message-avatar">U</div>}
        {isAI && <div className="message-avatar">AI</div>}
        {isUser && isCode && (
          <div className="message-avatar">U</div>
        )}
        {bubbleContent}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="chat-container">
      <div className="messages-container" id="messages" onScroll={handleScroll}>
        {messages.map(renderMessage)}
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
        {error && <div className="error-message"><span>⚠️</span><span>{error}</span></div>}
        <div ref={messagesEndRef} />
      </div>
      <div className="input-area">
        <div className="input-container">
          <button id="fileUploadBtn" title="Datei hochladen" onClick={handleFileUploadClick}>📎</button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
          <textarea
            id="msgInput"
            ref={msgInputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder="Nachricht eingeben..."
            autoComplete="off"
            rows={1}
          />
          <div className="button-group">
            <button id="sendBtn" onClick={handleSendClick} disabled={!inputValue.trim()} className="btn btn-primary">
              <span>Senden</span>
            </button>
            <button id="debugBtn" onClick={handleDebugClick} className="btn btn-secondary">
              <span>Debug</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatComponent; 