# Phase 4: Integration & Testing - Chat Attachment UX Enhancement

## Overview
Integrate all components together and perform comprehensive testing to ensure the attachment system works correctly.

## Duration: 2 hours

## Tasks

### 1. Integrate All Components in ChatComponent (45 minutes)
**File**: `frontend/src/presentation/components/chat/main/ChatComponent.jsx`

**Integration**:
- Import all new components
- Update the main component structure
- Ensure proper state management
- Add attachment display in input area

**Implementation**:
```javascript
// Import all new components
import MarkdownAttachmentIcon from './MarkdownAttachmentIcon';
import MarkdownPreviewModal from './MarkdownPreviewModal';
import '@/css/components/attachment-icon.css';

// Update component structure
function ChatComponent({ eventBus, activePort, attachedPrompts = [] }) {
  // ... existing state ...
  
  // Add attachment-related state
  const [attachments, setAttachments] = useState([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);

  // ... existing functions ...

  // Update file input to support multiple files
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = [];
    const errors = [];
    
    files.forEach(file => {
      try {
        validateFile(file);
        validFiles.push(file);
      } catch (error) {
        errors.push(error.message);
      }
    });
    
    if (errors.length > 0) {
      setError(`File validation errors: ${errors.join(', ')}`);
    }
    
    setAttachments(prev => [...prev, ...validFiles]);
    e.target.value = ''; // Reset input
  };

  // Add attachment removal
  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Update sendMessage to include attachments
  const sendMessage = async (message) => {
    if (!message.trim() && attachments.length === 0) return;
    
    // Process attachments
    const processedAttachments = await Promise.all(
      attachments.map(async (file) => {
        const content = await readFileContent(file);
        return {
          name: file.name,
          size: file.size,
          type: file.type,
          content: content,
          lastModified: file.lastModified
        };
      })
    );

    const newMessage = normalizeMessage({
      id: Date.now(),
      content: message,
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: message.includes('```') ? 'code' : 'text',
      metadata: {
        attachments: processedAttachments
      }
    });

    setMessages(prevMessages => [...prevMessages, newMessage]);
    setInputValue('');
    setAttachments([]); // Clear attachments after sending

    // ... rest of existing sendMessage logic
  };

  // File reading utility
  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  // Update renderMessage to include attachments
  const renderMessage = (message, index) => {
    const isUser = message.sender === 'user';
    const isAI = message.sender === 'ai';
    const isCode = message.type === 'code';
    let content = message.content || message.text;
    let bubbleContent;
    
    // Handle message content
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

    // Handle attachments
    const renderAttachments = () => {
      const attachments = message.getAttachments?.() || message.metadata?.attachments || [];
      
      if (attachments.length === 0) return null;
      
      return (
        <div className="attachments-container">
          {attachments.map((attachment, idx) => (
            <MarkdownAttachmentIcon
              key={`${message.id}-attachment-${idx}`}
              file={attachment}
              onClick={() => handleAttachmentClick(attachment)}
              className="message-attachment"
            />
          ))}
        </div>
      );
    };

    return (
      <div className={`message ${isUser ? 'user' : 'ai'}`} key={message.id || index} data-index={index}>
        {isUser && !isCode && <div className="message-avatar">U</div>}
        {isAI && <div className="message-avatar">AI</div>}
        {isUser && isCode && <div className="message-avatar">U</div>}
        
        <div className="message-content">
          {bubbleContent}
          {renderAttachments()}
        </div>
      </div>
    );
  };

  // Add attachment click handler
  const handleAttachmentClick = (attachment) => {
    console.log('Opening attachment preview:', attachment);
    setSelectedAttachment(attachment);
    setIsPreviewModalOpen(true);
  };

  // Modal close handler
  const handlePreviewModalClose = () => {
    setIsPreviewModalOpen(false);
    setSelectedAttachment(null);
  };

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isPreviewModalOpen) {
        handlePreviewModalClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPreviewModalOpen]);

  // Update the return statement to include attachments in input area
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
        {/* Attachment Preview */}
        {attachments.length > 0 && (
          <div className="attachments-preview">
            <div className="attachments-header">
              <span>📎 Attachments ({attachments.length})</span>
              <button 
                className="clear-attachments-btn"
                onClick={() => setAttachments([])}
                title="Clear all attachments"
              >
                ✕ Clear All
              </button>
            </div>
            <div className="attachments-list">
              {attachments.map((file, index) => (
                <div key={index} className="attachment-preview-item">
                  <MarkdownAttachmentIcon
                    file={file}
                    onClick={() => removeAttachment(index)}
                    className="preview-attachment"
                  />
                  <button 
                    className="remove-attachment-btn"
                    onClick={() => removeAttachment(index)}
                    title={`Remove ${file.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="input-container">
          <button id="fileUploadBtn" title="Datei hochladen" onClick={handleFileUploadClick}>📎</button>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileChange}
            multiple
            accept=".md,.markdown,.txt,.json,.js,.jsx,.ts,.tsx,.css,.html,.py,.java,.cpp,.c,.php,.rb,.go,.rs,.swift,.kt"
          />
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
            <button 
              id="sendBtn" 
              onClick={handleSendClick} 
              disabled={!inputValue.trim() && attachments.length === 0} 
              className="btn btn-primary"
            >
              <span>Senden</span>
            </button>
            <button id="debugBtn" onClick={handleDebugClick} className="btn btn-secondary">
              <span>Debug</span>
            </button>
          </div>
        </div>
      </div>

      {/* Markdown Preview Modal */}
      <MarkdownPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={handlePreviewModalClose}
        attachment={selectedAttachment}
      />
    </div>
  );
}
```

### 2. Test Multiple File Uploads (30 minutes)
**Test Scenarios**:
- Upload multiple files at once
- Upload files one by one
- Mix of different file types
- Large files and small files
- Invalid file types
- Files exceeding size limits

**Test Cases**:
```javascript
// Test multiple file upload
const testMultipleFileUpload = () => {
  const files = [
    new File(['# Test Markdown\n\nThis is a test.'], 'test.md', { type: 'text/markdown' }),
    new File(['console.log("Hello World");'], 'test.js', { type: 'text/javascript' }),
    new File(['body { color: red; }'], 'test.css', { type: 'text/css' })
  ];
  
  // Simulate file input change
  const event = {
    target: { files: files }
  };
  
  handleFileChange(event);
  
  // Verify attachments state
  expect(attachments).toHaveLength(3);
  expect(attachments[0].name).toBe('test.md');
  expect(attachments[1].name).toBe('test.js');
  expect(attachments[2].name).toBe('test.css');
};

// Test file validation
const testFileValidation = () => {
  const invalidFile = new File(['content'], 'test.exe', { type: 'application/octet-stream' });
  
  expect(() => validateFile(invalidFile)).toThrow('File type not supported');
  
  const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.txt', { type: 'text/plain' });
  
  expect(() => validateFile(largeFile)).toThrow('File is too large');
};
```

### 3. Test Markdown Preview Functionality (30 minutes)
**Test Scenarios**:
- Opening preview modal
- Rendering different Markdown content
- Code block syntax highlighting
- Tab switching between rendered and raw
- Copy to clipboard functionality
- Download functionality
- Modal keyboard navigation

**Test Cases**:
```javascript
// Test modal opening
const testModalOpening = () => {
  const attachment = {
    name: 'test.md',
    content: '# Test\n\nThis is a **test**.',
    size: 1024,
    type: 'text/markdown'
  };
  
  handleAttachmentClick(attachment);
  
  expect(isPreviewModalOpen).toBe(true);
  expect(selectedAttachment).toEqual(attachment);
};

// Test Markdown rendering
const testMarkdownRendering = () => {
  const content = `
# Header 1
## Header 2

This is **bold** and *italic* text.

\`\`\`javascript
console.log("Hello World");
\`\`\`

- List item 1
- List item 2

> This is a blockquote
  `;
  
  const html = window.marked.parse(content);
  
  expect(html).toContain('<h1>Header 1</h1>');
  expect(html).toContain('<strong>bold</strong>');
  expect(html).toContain('<em>italic</em>');
  expect(html).toContain('<pre class="code-block javascript">');
  expect(html).toContain('<ul>');
  expect(html).toContain('<blockquote>');
};
```

### 4. Ensure Attachments Persist in Chat History (30 minutes)
**Test Scenarios**:
- Send message with attachments
- Reload chat history
- Verify attachments are preserved
- Test with different message types
- Test with multiple attachments per message

**Implementation**:
```javascript
// Test attachment persistence
const testAttachmentPersistence = () => {
  // Send message with attachments
  const messageWithAttachments = {
    id: Date.now(),
    content: 'Test message with attachments',
    sender: 'user',
    timestamp: new Date().toISOString(),
    type: 'text',
    metadata: {
      attachments: [
        {
          name: 'test.md',
          content: '# Test content',
          size: 1024,
          type: 'text/markdown'
        }
      ]
    }
  };
  
  // Add to messages
  setMessages(prev => [...prev, messageWithAttachments]);
  
  // Simulate chat history reload
  const savedMessages = messages.map(msg => msg.toJSON());
  const restoredMessages = savedMessages.map(msg => ChatMessage.fromJSON(msg));
  
  // Verify attachments are preserved
  const restoredMessage = restoredMessages.find(msg => msg.id === messageWithAttachments.id);
  expect(restoredMessage.hasAttachments()).toBe(true);
  expect(restoredMessage.getAttachments()).toHaveLength(1);
  expect(restoredMessage.getAttachments()[0].name).toBe('test.md');
};
```

### 5. Test with Different File Types (15 minutes)
**Test Scenarios**:
- All supported file types
- Edge cases (no extension, unusual extensions)
- Mixed case extensions
- Files with special characters in names

**Test Cases**:
```javascript
// Test all supported file types
const testSupportedFileTypes = () => {
  const supportedTypes = [
    'test.md', 'test.markdown', 'test.txt', 'test.json',
    'test.js', 'test.jsx', 'test.ts', 'test.tsx',
    'test.css', 'test.html', 'test.py', 'test.java',
    'test.cpp', 'test.c', 'test.php', 'test.rb',
    'test.go', 'test.rs', 'test.swift', 'test.kt'
  ];
  
  supportedTypes.forEach(filename => {
    const file = new File(['content'], filename, { type: 'text/plain' });
    expect(() => validateFile(file)).not.toThrow();
  });
};

// Test file type detection
const testFileTypeDetection = () => {
  const testCases = [
    { filename: 'README.md', expectedIcon: '📄' },
    { filename: 'package.json', expectedIcon: '📦' },
    { filename: 'script.js', expectedIcon: '📜' },
    { filename: 'styles.css', expectedIcon: '🎨' },
    { filename: 'unknown.xyz', expectedIcon: '📎' }
  ];
  
  testCases.forEach(({ filename, expectedIcon }) => {
    const icon = getFileIcon(filename);
    expect(icon).toBe(expectedIcon);
  });
};
```

## Success Criteria
- [ ] All components integrate seamlessly
- [ ] Multiple file uploads work correctly
- [ ] Markdown preview modal functions properly
- [ ] Attachments persist in chat history
- [ ] All supported file types work
- [ ] Error handling works for invalid files
- [ ] UI is responsive and accessible
- [ ] No console errors or warnings

## Dependencies
- All previous phases completed
- React Testing Library for component testing
- Jest for unit testing
- Browser File API support

## Notes
- Test on different browsers (Chrome, Firefox, Safari)
- Test with various file sizes and types
- Verify accessibility features work
- Check performance with large files
- Ensure backward compatibility with existing chat
- Test error scenarios and edge cases 