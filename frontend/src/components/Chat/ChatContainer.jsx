import React, { useEffect, useRef, useState } from 'react';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import useChatStore from '../../stores/chatStore';

const ChatComponent = ({ eventBus }) => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const { addMessage, getActiveSession } = useChatStore();

  useEffect(() => {
    if (!eventBus) return;

    const handleMessagesLoaded = (data) => {
      setMessages(data.messages);
    };

    const handleMessageSent = (data) => {
      setMessages(prev => [...prev, data.message]);
    };

    const handleTypingChanged = (data) => {
      setIsTyping(data.isTyping);
    };

    const handleError = (data) => {
      setMessages(prev => [...prev, { type: 'error', content: data.error, timestamp: new Date().toISOString() }]);
    };

    eventBus.on('chat:messages:loaded', handleMessagesLoaded);
    eventBus.on('chat:message:sent', handleMessageSent);
    eventBus.on('chat:typing:changed', handleTypingChanged);
    eventBus.on('chat:error', handleError);

    return () => {
      eventBus.off('chat:messages:loaded', handleMessagesLoaded);
      eventBus.off('chat:message:sent', handleMessageSent);
      eventBus.off('chat:typing:changed', handleTypingChanged);
      eventBus.off('chat:error', handleError);
    };
  }, [eventBus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = (content) => {
    if (!eventBus) return;

    const message = {
      type: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    const activeSession = getActiveSession();
    if (activeSession) {
      addMessage(activeSession.id, message);
    }

    eventBus.emit('chat:send:message', { content });
  };

  return (
    <div className="chat-container">
      <div className="messages-container" id="messages">
        {messages.map((message, index) => (
          <ChatMessage 
            key={index} 
            message={message} 
            index={index} 
          />
        ))}
        {isTyping && (
          <div className="typing-indicator" id="typingIndicator" style={{ display: 'flex' }}>
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
      <ChatInput 
        eventBus={eventBus}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};

export default ChatComponent;
export { ChatComponent }; 