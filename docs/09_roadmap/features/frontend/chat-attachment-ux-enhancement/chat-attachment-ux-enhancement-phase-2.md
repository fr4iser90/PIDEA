# Phase 2: Core Implementation - Chat Attachment UX Enhancement

## Overview
Implement the core attachment functionality including file upload, storage, and rendering in chat messages.

## Duration: 4 hours

## Tasks

### 1. Update File Upload Logic (1 hour)
**File**: `frontend/src/presentation/components/chat/main/ChatComponent.jsx`

**Changes**:
- Modify file input to accept multiple files
- Update file change handler to process multiple files
- Add attachment removal functionality
- Integrate with existing message sending flow

**Implementation**:
```javascript
// Update file input to accept multiple files
<input 
  type="file" 
  ref={fileInputRef} 
  style={{ display: 'none' }} 
  onChange={handleFileChange}
  multiple
  accept=".md,.markdown,.txt,.json,.js,.jsx,.ts,.tsx,.css,.html,.py,.java,.cpp,.c,.php,.rb,.go,.rs,.swift,.kt"
/>

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
```

### 2. Implement Attachment Storage in Message Metadata (30 minutes)
**File**: `frontend/src/domain/entities/ChatMessage.jsx`

**Changes**:
- Ensure attachment metadata is properly serialized
- Add validation for attachment data
- Update toJSON and fromJSON methods

**Implementation**:
```javascript
// Update toJSON method
toJSON() {
  return {
    id: this.id,
    content: this.content,
    sender: this.sender,
    type: this.type,
    timestamp: this.timestamp.toISOString(),
    metadata: {
      ...this.metadata,
      attachments: this.metadata.attachments || []
    }
  };
}

// Update fromJSON method
static fromJSON(data) {
  return new ChatMessage({
    id: data.id,
    content: data.content,
    sender: data.sender,
    type: data.type,
    timestamp: data.timestamp,
    metadata: {
      ...data.metadata,
      attachments: data.metadata?.attachments || []
    }
  });
}

// Add attachment validation
validateAttachment(attachment) {
  if (!attachment.name || !attachment.content) {
    throw new Error('Invalid attachment: missing name or content');
  }
  
  if (attachment.content.length > 10 * 1024 * 1024) { // 10MB
    throw new Error('Attachment content too large');
  }
  
  return true;
}
```

### 3. Create Attachment Rendering in Message Bubbles (1.5 hours)
**File**: `frontend/src/presentation/components/chat/main/ChatComponent.jsx`

**Changes**:
- Update renderMessage function to display attachments
- Add attachment container styling
- Implement attachment click handlers

**Implementation**:
```javascript
// Import the attachment icon component
import MarkdownAttachmentIcon from './MarkdownAttachmentIcon';

// Update renderMessage function
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
  setSelectedAttachment(attachment);
  setIsPreviewModalOpen(true);
};
```

### 4. Add File Type Detection and Icon Mapping (30 minutes)
**File**: `frontend/src/presentation/components/chat/main/MarkdownAttachmentIcon.jsx`

**Enhancements**:
- Improve file type detection logic
- Add more file type icons
- Handle edge cases and unknown file types

**Implementation**:
```javascript
// Enhanced file type detection
const getFileIcon = (filename, mimeType) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  // Enhanced icon mapping
  const iconMap = {
    // Markdown and text
    'md': '📄',
    'markdown': '📄',
    'txt': '📝',
    'rst': '📖',
    
    // Data formats
    'json': '📋',
    'xml': '📋',
    'yaml': '📋',
    'yml': '📋',
    'csv': '📊',
    
    // Web technologies
    'js': '📜',
    'jsx': '⚛️',
    'ts': '📘',
    'tsx': '⚛️',
    'css': '🎨',
    'scss': '🎨',
    'sass': '🎨',
    'less': '🎨',
    'html': '🌐',
    'htm': '🌐',
    'vue': '💚',
    
    // Programming languages
    'py': '🐍',
    'java': '☕',
    'cpp': '⚙️',
    'c': '⚙️',
    'h': '⚙️',
    'hpp': '⚙️',
    'php': '🐘',
    'rb': '💎',
    'go': '🐹',
    'rs': '🦀',
    'swift': '🍎',
    'kt': '☕',
    'scala': '🔴',
    'clj': '🍃',
    'hs': 'λ',
    'ml': '🐫',
    'fs': '🔵',
    'dart': '🎯',
    'elm': '🌳',
    
    // Configuration files
    'config': '⚙️',
    'conf': '⚙️',
    'ini': '⚙️',
    'toml': '⚙️',
    'env': '🔧',
    'gitignore': '🚫',
    'dockerfile': '🐳',
    'docker-compose': '🐳',
    
    // Documentation
    'readme': '📖',
    'license': '📜',
    'changelog': '📝',
    'contributing': '🤝',
    
    // Build and package files
    'package.json': '📦',
    'package-lock.json': '🔒',
    'yarn.lock': '🔒',
    'pom.xml': '📦',
    'build.gradle': '📦',
    'requirements.txt': '📋',
    'gemfile': '💎',
    'cargo.toml': '🦀',
    'go.mod': '🐹',
    'composer.json': '🐘'
  };
  
  // Check for exact filename matches first
  if (iconMap[filename.toLowerCase()]) {
    return iconMap[filename.toLowerCase()];
  }
  
  // Check for extension matches
  if (ext && iconMap[ext]) {
    return iconMap[ext];
  }
  
  // Fallback based on MIME type
  if (mimeType) {
    if (mimeType.startsWith('text/')) return '📝';
    if (mimeType.startsWith('application/json')) return '📋';
    if (mimeType.startsWith('application/xml')) return '📋';
  }
  
  return '📎'; // Default attachment icon
};

// Update component to use enhanced detection
const MarkdownAttachmentIcon = ({ 
  file, 
  onClick, 
  className = '' 
}) => {
  const icon = getFileIcon(file.name, file.type);
  
  // ... rest of component implementation
};
```

### 5. Implement Attachment Click Handlers (1 hour)
**File**: `frontend/src/presentation/components/chat/main/ChatComponent.jsx`

**Features**:
- Handle different file types appropriately
- Prepare for modal integration
- Add keyboard navigation support

**Implementation**:
```javascript
// Enhanced attachment click handler
const handleAttachmentClick = (attachment) => {
  console.log('Attachment clicked:', attachment);
  
  // Check if it's a Markdown file
  const isMarkdown = attachment.name.match(/\.(md|markdown)$/i);
  const isTextFile = attachment.name.match(/\.(txt|json|js|jsx|ts|tsx|css|html|py|java|cpp|c|php|rb|go|rs|swift|kt)$/i);
  
  if (isMarkdown || isTextFile) {
    // Open in preview modal
    setSelectedAttachment(attachment);
    setIsPreviewModalOpen(true);
  } else {
    // For other file types, offer download
    downloadAttachment(attachment);
  }
};

// Download attachment utility
const downloadAttachment = (attachment) => {
  const blob = new Blob([attachment.content], { 
    type: attachment.type || 'text/plain' 
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = attachment.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Add keyboard navigation for attachments
const handleAttachmentKeyDown = (e, attachment) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleAttachmentClick(attachment);
  }
};
```

## Success Criteria
- [ ] Multiple file uploads work correctly
- [ ] Attachments are stored in message metadata
- [ ] Attachments display as icons in chat messages
- [ ] File type detection works for all supported types
- [ ] Attachment click handlers are functional
- [ ] File validation prevents invalid uploads
- [ ] Attachment removal works properly

## Dependencies
- Phase 1 components and styling
- File API support
- React state management
- Existing chat message system

## Notes
- Test with various file types and sizes
- Ensure backward compatibility with existing messages
- Verify file content is properly encoded/decoded
- Check memory usage with large files
- Test keyboard navigation accessibility 