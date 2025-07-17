import { logger } from "@/infrastructure/logging/Logger";
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

  // State für ausgeklappte Codeblöcke
  const [expandedBlocks, setExpandedBlocks] = useState({});

  const toggleBlock = (id) => {
    setExpandedBlocks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Lade Chat immer, wenn activePort sich ändert (React-Way)
  const loadChatHistory = useCallback(async () => {
    if (!activePort) return;
    logger.info('Lade Chat für Port:', activePort);
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
      logger.info('Neue Nachrichten geladen:', msgs.length);
      setMessages(msgs.map(normalizeMessage));
    } catch (error) {
      setMessages([]);
      setError('❌ Failed to load chat history: ' + error.message);
    }
  }, [activePort]);

  useEffect(() => {
    logger.info('activePort changed:', activePort);
    // Wenn sich der Port ändert, sofort leeren!
    setMessages([]);
    setError(null);
    logger.info('setMessages([]) aufgerufen!');
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
        logger.info('Received external message:', data.message);
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
    // === DEBUG LOGS REMOVED FOR SECURITY ===
    // logger.info('==== PROMPT CONTENTS ====', promptContents);
    // logger.info('==== FAILED PROMPTS ====', failedPrompts);
    // logger.info('==== FINAL MESSAGE ====', finalMessage);
    // === DEBUG LOGS END ===
    
    // Enhanced message type detection
    const messageType = detectMessageType(finalMessage);
    
    const newMessage = normalizeMessage({
      id: Date.now(),
      content: finalMessage,
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: messageType,
      metadata: {
        hasCodeBlocks: finalMessage.includes('```'),
        hasInlineCode: /`[^`]+`/.test(finalMessage),
        promptCount: promptContents.length,
        characterCount: finalMessage.length
      }
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
      
      // Add quality indicators if response contains code blocks
      if (result.data && result.data.codeBlocks && result.data.codeBlocks.length > 0) {
        // Create enhanced AI response with code blocks
        const enhancedContent = result.data.codeBlocks.map(block => {
          const language = block.language || 'text';
          const content = block.content || '';
          const filename = block.filename ? ` (${block.filename})` : '';
          return `\`\`\`${language}${filename}\n${content}\n\`\`\``;
        }).join('\n\n');
        
        // Add the enhanced AI response
        const aiResponse = normalizeMessage({
          id: Date.now() + 3,
          content: enhancedContent,
          sender: 'ai',
          timestamp: new Date().toISOString(),
          type: 'code',
          metadata: {
            codeBlocks: result.data.codeBlocks,
            averageConfidence: result.data.codeBlocks.reduce((acc, block) => acc + block.confidence, 0) / result.data.codeBlocks.length
          }
        });
        setMessages(prevMessages => [...prevMessages, aiResponse]);
        
        // Add quality indicator
        const qualityMessage = normalizeMessage({
          id: Date.now() + 4,
          content: `Code blocks detected: ${result.data.codeBlocks.length} blocks with ${Math.round(result.data.codeBlocks.reduce((acc, block) => acc + block.confidence, 0) / result.data.codeBlocks.length * 100)}% average confidence`,
          sender: 'system',
          timestamp: new Date().toISOString(),
          type: 'quality',
          metadata: {
            codeBlocks: result.data.codeBlocks,
            averageConfidence: result.data.codeBlocks.reduce((acc, block) => acc + block.confidence, 0) / result.data.codeBlocks.length
          }
        });
        setMessages(prevMessages => [...prevMessages, qualityMessage]);
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

  // Enhanced message type detection
  const detectMessageType = (content) => {
    if (content.includes('```')) return 'code';
    if (/`[^`]+`/.test(content)) return 'inline_code';
    if (/^[ \t]*(function|def|class|const|let|var|if|for|while|import|require)/m.test(content)) return 'code_snippet';
    if (/<[^>]+>/.test(content)) return 'html';
    if (/^[ \t]*\w+\s*\{/.test(content)) return 'css';
    return 'text';
  };

  // Quality indicator component
  const QualityIndicator = ({ message }) => {
    if (message.type !== 'quality' || !message.metadata?.codeBlocks) return null;
    
    const { codeBlocks, averageConfidence } = message.metadata;
    const confidenceColor = averageConfidence > 0.8 ? 'green' : averageConfidence > 0.6 ? 'orange' : 'red';
    
    return (
      <div className="quality-indicator" style={{ 
        padding: '8px', 
        margin: '4px 0', 
        borderRadius: '4px', 
        backgroundColor: '#f5f5f5',
        border: `2px solid ${confidenceColor}` 
      }}>
        <div style={{ fontSize: '12px', color: confidenceColor, fontWeight: 'bold' }}>
          📊 Code Quality: {Math.round(averageConfidence * 100)}% Confidence
        </div>
        <div style={{ fontSize: '11px', color: '#666' }}>
          {codeBlocks.length} code block{codeBlocks.length !== 1 ? 's' : ''} detected
        </div>
        {codeBlocks.map((block, index) => (
          <div key={index} style={{ fontSize: '10px', marginTop: '2px' }}>
            • {block.language} ({Math.round(block.confidence * 100)}% confidence)
          </div>
        ))}
      </div>
    );
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
    const isQuality = message.type === 'quality';
    let content = message.content || message.text;
    let bubbleContent;
    
    if (isQuality) {
      bubbleContent = <QualityIndicator message={message} />;
    } else if (isAI && message.metadata?.codeBlocks?.length > 0) {
      // Modernes Codeblock-Rendering mit Header und Toggle
      bubbleContent = (
        <div className="code-blocks-container">
          {message.metadata.codeBlocks.map((block, idx) => {
            const blockId = `${message.id}_${idx}`;
            const expanded = expandedBlocks[blockId] !== false; // default: true
            return (
              <div key={blockId} className="modern-code-block-wrapper">
                <div className="modern-code-block-header" onClick={() => toggleBlock(blockId)}>
                  <span className="modern-code-block-title">
                    {block.filename ? block.filename : block.language ? block.language : 'Code'}
                  </span>
                  <button
                    className="modern-code-block-toggle"
                    title={expanded ? 'Einklappen' : 'Ausklappen'}
                    tabIndex={-1}
                    onClick={e => { e.stopPropagation(); toggleBlock(blockId); }}
                  >
                    {expanded ? '▲' : '▼'}
                  </button>
                  <button
                    className="modern-code-block-copy"
                    title="Copy code"
                    tabIndex={-1}
                    onClick={e => { e.stopPropagation(); handleCopyClick(block.content); }}
                  >
                    📋
                  </button>
                </div>
                {expanded && (
                  <pre className={`modern-code-block code-block ${block.language || ''}`}>
                    <code>{block.content}</code>
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      );
      } else if (isAI && window.marked) {
    // Check if content contains markdown code blocks
    const codeBlockRegex = /```(\w+)?\s*([\s\S]+?)```/g;
    const codeBlocks = content.match(codeBlockRegex);
    
    if (codeBlocks && codeBlocks.length > 0) {
      // Use our custom code block rendering
      bubbleContent = (
        <div className="code-blocks-container">
          {codeBlocks.map((block, idx) => {
            const match = block.match(/```(\w+)?\s*([\s\S]+?)```/);
            const language = match[1] || 'text';
            const code = match[2].trim();
            const blockId = `${message.id}_md_${idx}`;
            const expanded = expandedBlocks[blockId] !== false;
            return (
              <div key={blockId} className="modern-code-block-wrapper">
                <div className="modern-code-block-header" onClick={() => toggleBlock(blockId)}>
                  <span className="modern-code-block-title">{language}</span>
                  <button
                    className="modern-code-block-toggle"
                    title={expanded ? 'Einklappen' : 'Ausklappen'}
                    tabIndex={-1}
                    onClick={e => { e.stopPropagation(); toggleBlock(blockId); }}
                  >
                    {expanded ? '▲' : '▼'}
                  </button>
                  <button
                    className="modern-code-block-copy"
                    title="Copy code"
                    tabIndex={-1}
                    onClick={e => { e.stopPropagation(); handleCopyClick(code); }}
                  >
                    📋
                  </button>
                </div>
                {expanded && (
                  <pre className={`modern-code-block code-block ${language}`}>
                    <code>{code}</code>
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      );
    } else {
      // Regular markdown parsing for non-code content
      const parsedContent = window.marked.parse(content);
      bubbleContent = (
        <div className="message-bubble" dangerouslySetInnerHTML={{ __html: parsedContent }} />
      );
    }
    } else if (isCode) {
      // Fallback: Markdown-Codeblöcke parsen
      const codeBlocks = content.match(/```(\w+)?\s*([^`]+)```/g);
      if (codeBlocks) {
        bubbleContent = (
          <div className="code-blocks-container">
            {codeBlocks.map((block, idx) => {
              const match = block.match(/```(\w+)?\s*([^`]+)```/);
              const language = match[1] || 'text';
              const code = match[2].trim();
              const blockId = `${message.id}_md_${idx}`;
              const expanded = expandedBlocks[blockId] !== false;
              return (
                <div key={blockId} className="modern-code-block-wrapper">
                  <div className="modern-code-block-header" onClick={() => toggleBlock(blockId)}>
                    <span className="modern-code-block-title">{language}</span>
                    <button
                      className="modern-code-block-toggle"
                      title={expanded ? 'Einklappen' : 'Ausklappen'}
                      tabIndex={-1}
                      onClick={e => { e.stopPropagation(); toggleBlock(blockId); }}
                    >
                      {expanded ? '▲' : '▼'}
                    </button>
                    <button
                      className="modern-code-block-copy"
                      title="Copy code"
                      tabIndex={-1}
                      onClick={e => { e.stopPropagation(); handleCopyClick(code); }}
                    >
                      📋
                    </button>
                  </div>
                  {expanded && (
                    <pre className={`modern-code-block code-block ${language}`}>
                      <code>{code}</code>
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        );
      }
    } else {
      bubbleContent = <div className="message-bubble">{escapeHtml(content)}</div>;
    }
    
    return (
      <div className={`message ${isUser ? 'user' : 'ai'}`} key={message.id || index} data-index={index}>
        {isUser && !isCode && !isQuality && <div className="message-avatar">U</div>}
        {isAI && !isQuality && <div className="message-avatar">AI</div>}
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