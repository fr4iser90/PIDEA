import React from 'react';
import { ChatBubbleLeftIcon, UserIcon } from '@heroicons/react/24/outline';

const ChatMessage = ({ message, index }) => {
  const isUser = message.role === 'user';
  
  // Simple code detection (you can enhance this)
  const hasCode = message.content.includes('```');
  
  const formatMessage = (content) => {
    if (!hasCode) return content;
    
    // Simple code block formatting
    const parts = content.split('```');
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is code
        return (
          <pre key={index} className="code-block my-2">
            <code>{part}</code>
          </pre>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessageContent = () => {
    if (message.type === 'error') {
      return (
        <div className="message-bubble error">
          <div className="error-icon">⚠️</div>
          <div className="error-text">{message.content}</div>
        </div>
      );
    }

    if (message.type === 'system') {
      return (
        <div className="message-bubble system">
          <div className="system-icon">ℹ️</div>
          <div className="system-text">{message.content}</div>
        </div>
      );
    }

    return (
      <div className="message-bubble">
        {formatMessage(message.content)}
      </div>
    );
  };

  return (
    <div className={`message ${message.type}`} data-index={index}>
      <div className="message-avatar">
        {message.type === 'user' ? 'U' : message.type === 'assistant' ? 'AI' : 'S'}
      </div>
      <div className="message-content">
        {renderMessageContent()}
        {message.timestamp && (
          <div className="message-timestamp">
            {formatTimestamp(message.timestamp)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage; 