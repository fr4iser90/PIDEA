// Use global marked from CDN script tag

class ChatComponent {
  constructor(containerId, eventBus) {
    this.container = document.getElementById(containerId);
    this.eventBus = eventBus;
    this.messages = [];
    this.isTyping = false;
    this.shouldAutoScroll = true;
    this.isUserScrolling = false;
    this.scrollTimeout = null;
    this.updateTimeout = null;
    this.lastUpdateTime = 0;
    
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.setupEventListeners();
    this.addCopyButtons();
  }

  render() {
    this.container.innerHTML = `
      <div class="chat-container">
        <div class="messages-container" id="messages">
          ${this.renderMessages()}
        </div>
        <div class="typing-indicator" id="typingIndicator" style="display: none;">
          <div class="message-avatar">AI</div>
          <div class="message-bubble">
            <div class="typing-dots">
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
            </div>
          </div>
        </div>
        <div class="input-area">
          <div class="input-container">
            <button id="fileUploadBtn" title="Datei hochladen">📎</button>
            <input type="file" id="fileInput" style="display:none" />
            <textarea 
              id="msgInput" 
              placeholder="Nachricht eingeben..." 
              autocomplete="off"
              rows="1"
            ></textarea>
            <div class="button-group">
              <button id="sendBtn" class="btn btn-primary">
                <span>Senden</span>
              </button>
              <button id="debugBtn" class="btn btn-secondary">
                <span>Debug</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderMessages() {
    return this.messages.map((message, index) => this.renderMessage(message, index)).join('');
  }

  renderMessage(message, index) {
    const isUser = message.type === 'user';
    const messageClass = `message ${message.type}`;
    
    if (isUser && message.isCodeSnippet()) {
      return `
        <div class="${messageClass}" data-index="${index}">
          <pre class="user-codeblock">
            <code>${this.escapeHtml(message.content.replace(/^```[a-zA-Z0-9]*|```$/g, '').trim())}</code>
            <button class="codeblock-copy-btn">Copy</button>
          </pre>
          <div class="message-avatar">U</div>
        </div>
      `;
    } else if (isUser) {
      return `
        <div class="${messageClass}" data-index="${index}">
          <div class="message-bubble">${this.escapeHtml(message.content)}</div>
          <div class="message-avatar">U</div>
        </div>
      `;
    } else {
      const content = window.marked ? window.marked.parse(message.content) : message.content;
      return `
        <div class="${messageClass}" data-index="${index}">
          <div class="message-bubble">${content}</div>
          <div class="message-avatar">AI</div>
        </div>
      `;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  bindEvents() {
    const sendBtn = this.container.querySelector('#sendBtn');
    const msgInput = this.container.querySelector('#msgInput');
    const debugBtn = this.container.querySelector('#debugBtn');
    const messagesContainer = this.container.querySelector('#messages');

    sendBtn.addEventListener('click', () => this.handleSendMessage());
    
    msgInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage();
      }
    });

    msgInput.addEventListener('input', () => this.autoResizeTextarea());
    
    debugBtn.addEventListener('click', () => this.handleDebug());
    
    messagesContainer.addEventListener('scroll', () => this.handleScroll());
    
    // Copy buttons for code blocks
    this.addCopyButtons();
  }

  setupEventListeners() {
    this.eventBus.on('chat:messages:loaded', (data) => {
      this.updateMessages(data.messages);
    });

    this.eventBus.on('chat:message:sent', (data) => {
      this.addMessage(data.message);
    });

    this.eventBus.on('chat:typing:changed', (data) => {
      this.setTyping(data.isTyping);
    });

    this.eventBus.on('chat:error', (data) => {
      this.showError(data.error);
    });
  }

  // Update only the last message (most efficient for streaming responses)
  updateLastMessage(newMessage) {
    this.messages[this.messages.length - 1] = newMessage;
    
    const messagesContainer = this.container.querySelector('#messages');
    if (messagesContainer) {
      const lastMessageElement = messagesContainer.lastElementChild;
      if (lastMessageElement) {
        // Update only the content of the last message
        const bubbleElement = lastMessageElement.querySelector('.message-bubble');
        if (bubbleElement) {
          const content = window.marked ? window.marked.parse(newMessage.content) : newMessage.content;
          bubbleElement.innerHTML = content;
          
          // Re-add copy buttons for code blocks
          bubbleElement.querySelectorAll('pre code').forEach(code => {
            if (!code.parentElement.querySelector('.codeblock-copy-btn')) {
              const btn = document.createElement('button');
              btn.className = 'codeblock-copy-btn';
              btn.textContent = 'Copy';
              code.parentElement.style.position = 'relative';
              code.parentElement.appendChild(btn);
            }
          });
          
          // Re-highlight code
          if (window.hljs) {
            hljs.highlightAll();
          }
        }
      }
    }
    
    this.scrollToBottom();
  }

  async handleSendMessage() {
    const input = this.container.querySelector('#msgInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    input.value = '';
    this.autoResizeTextarea();
    
    this.eventBus.emit('chat:send:message', { content: message });
  }

  handleDebug() {
    this.eventBus.emit('chat:debug:requested');
  }

  handleScroll() {
    const messagesContainer = this.container.querySelector('#messages');
    const isAtBottom = messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - 10;
    this.shouldAutoScroll = isAtBottom;
    
    if (this.isUserScrolling) {
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(() => {
        this.isUserScrolling = false;
      }, 150);
    }
  }

  updateMessages(messages) {
    // Only update if messages actually changed
    if (this.messages.length === messages.length && 
        this.messages.every((msg, i) => 
          msg.content === messages[i].content && 
          msg.type === messages[i].type
        )) {
      return;
    }
    
    // Check if only the last message changed (most common case)
    if (this.messages.length > 0 && messages.length > 0) {
      const lastCurrentMessage = this.messages[this.messages.length - 1];
      const lastNewMessage = messages[messages.length - 1];
      
      // If only the last message content changed, update just that
      if (this.messages.length === messages.length && 
          lastCurrentMessage.type === lastNewMessage.type &&
          lastCurrentMessage.content !== lastNewMessage.content) {
        this.updateLastMessage(lastNewMessage);
        return;
      }
    }
    
    // Full update only if structure changed
    this.messages = messages;
    const messagesContainer = this.container.querySelector('#messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = this.renderMessages();
      this.scrollToBottom();
      this.addCopyButtons();
    }
  }

  addMessage(message) {
    this.messages.push(message);
    const messagesContainer = this.container.querySelector('#messages');
    if (messagesContainer) {
      // Append only the new message
      const messageHtml = this.renderMessage(message, this.messages.length - 1);
      messagesContainer.insertAdjacentHTML('beforeend', messageHtml);
      this.scrollToBottom();
      this.addCopyButtons();
    }
  }

  setTyping(isTyping) {
    this.isTyping = isTyping;
    const typingIndicator = this.container.querySelector('#typingIndicator');
    
    if (isTyping) {
      typingIndicator.style.display = 'flex';
    } else {
      typingIndicator.style.display = 'none';
    }
  }

  showError(error) {
    const messagesContainer = this.container.querySelector('#messages');
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.innerHTML = `<span>⚠️</span><span>${error}</span>`;
    messagesContainer.appendChild(errorEl);
  }

  scrollToBottom(smooth = true) {
    if (!this.shouldAutoScroll) return;
    
    const messagesContainer = this.container.querySelector('#messages');
    if (!messagesContainer) return;
    
    if (smooth) {
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
      });
    } else {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  isAtBottom() {
    const messagesContainer = this.container.querySelector('#messages');
    if (!messagesContainer) return true;
    
    const threshold = 10;
    return messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - threshold;
  }

  autoResizeTextarea() {
    const textarea = this.container.querySelector('#msgInput');
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, window.innerHeight * 0.7) + 'px';
  }

  addCopyButtons() {
    this.container.querySelectorAll('.codeblock-copy-btn').forEach(btn => {
      btn.onclick = function() {
        const code = btn.parentElement.querySelector('code').innerText;
        navigator.clipboard.writeText(code);
        btn.textContent = 'Kopiert!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1200);
      };
    });
  }
}

export default ChatComponent; 