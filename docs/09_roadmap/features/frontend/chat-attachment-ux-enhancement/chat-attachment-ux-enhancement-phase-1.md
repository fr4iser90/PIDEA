# Phase 1: Foundation Setup - Chat Attachment UX Enhancement

## Overview
Set up the foundational components and data structures needed for the chat attachment system.

## Duration: 2 hours

## Tasks

### 1. Update ChatMessage Entity (30 minutes)
**File**: `frontend/src/domain/entities/ChatMessage.jsx`

**Changes**:
- Add `attachments` array to metadata structure
- Add helper methods for attachment management
- Ensure backward compatibility with existing messages

**Implementation**:
```javascript
// Add to constructor metadata default
constructor({ id, content, sender, type, timestamp, metadata = {} }) {
  // ... existing code ...
  this.metadata = {
    attachments: [],
    ...metadata
  };
}

// Add helper methods
hasAttachments() {
  return this.metadata.attachments && this.metadata.attachments.length > 0;
}

getAttachments() {
  return this.metadata.attachments || [];
}

addAttachment(attachment) {
  if (!this.metadata.attachments) {
    this.metadata.attachments = [];
  }
  this.metadata.attachments.push(attachment);
}
```

### 2. Create MarkdownAttachmentIcon Component (45 minutes)
**File**: `frontend/src/presentation/components/chat/main/MarkdownAttachmentIcon.jsx`

**Features**:
- File type detection and icon mapping
- Clickable icon with filename display
- Hover effects and tooltips
- Accessibility support

**Implementation**:
```javascript
import React from 'react';
import '@/css/components/attachment-icon.css';

const MarkdownAttachmentIcon = ({ 
  file, 
  onClick, 
  className = '' 
}) => {
  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const iconMap = {
      'md': '📄',
      'markdown': '📄',
      'txt': '📝',
      'json': '📋',
      'js': '📜',
      'jsx': '⚛️',
      'ts': '📘',
      'tsx': '⚛️',
      'css': '🎨',
      'html': '🌐',
      'py': '🐍',
      'java': '☕',
      'cpp': '⚙️',
      'c': '⚙️',
      'php': '🐘',
      'rb': '💎',
      'go': '🐹',
      'rs': '🦀',
      'swift': '🍎',
      'kt': '☕'
    };
    return iconMap[ext] || '📎';
  };

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) {
      onClick(file);
    }
  };

  return (
    <div 
      className={`attachment-icon ${className}`}
      onClick={handleClick}
      title={`${file.name} (${file.size} bytes)`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick(e);
        }
      }}
    >
      <span className="attachment-icon-symbol">
        {getFileIcon(file.name)}
      </span>
      <span className="attachment-filename">
        {file.name}
      </span>
    </div>
  );
};

export default MarkdownAttachmentIcon;
```

### 3. Set Up Attachment State Management (30 minutes)
**File**: `frontend/src/presentation/components/chat/main/ChatComponent.jsx`

**Changes**:
- Add attachment state to component
- Update file input to support multiple files
- Add attachment validation logic

**Implementation**:
```javascript
// Add to state declarations
const [attachments, setAttachments] = useState([]);
const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
const [selectedAttachment, setSelectedAttachment] = useState(null);

// Add file validation
const validateFile = (file) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'text/markdown',
    'text/plain',
    'application/json',
    'text/javascript',
    'text/css',
    'text/html',
    'text/x-python',
    'text/x-java-source',
    'text/x-c++src',
    'text/x-csrc',
    'text/x-php',
    'text/x-ruby',
    'text/x-go',
    'text/x-rust',
    'text/x-swift',
    'text/x-kotlin'
  ];
  
  if (file.size > maxSize) {
    throw new Error(`File ${file.name} is too large. Maximum size is 10MB.`);
  }
  
  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(md|markdown|txt|json|js|jsx|ts|tsx|css|html|py|java|cpp|c|php|rb|go|rs|swift|kt)$/i)) {
    throw new Error(`File type not supported: ${file.name}`);
  }
  
  return true;
};

// Update file change handler
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
```

### 4. Design Attachment Icon UI (15 minutes)
**File**: `frontend/src/css/components/attachment-icon.css`

**Features**:
- Clean, modern icon design
- Hover effects and transitions
- Responsive layout
- Accessibility styling

**Implementation**:
```css
.attachment-icon {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(78, 140, 255, 0.1);
  border: 1px solid rgba(78, 140, 255, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  color: #4e8cff;
  margin: 4px;
  max-width: 200px;
  overflow: hidden;
}

.attachment-icon:hover {
  background: rgba(78, 140, 255, 0.2);
  border-color: rgba(78, 140, 255, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(78, 140, 255, 0.2);
}

.attachment-icon:focus {
  outline: 2px solid #4e8cff;
  outline-offset: 2px;
}

.attachment-icon-symbol {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.attachment-filename {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.attachments-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0;
  padding: 8px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

/* Light theme support */
body.light-theme .attachment-icon {
  background: rgba(78, 140, 255, 0.1);
  border-color: rgba(78, 140, 255, 0.3);
  color: #4e8cff;
}

body.light-theme .attachment-icon:hover {
  background: rgba(78, 140, 255, 0.2);
  border-color: rgba(78, 140, 255, 0.5);
}

body.light-theme .attachments-container {
  background: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.1);
}
```

## Success Criteria
- [ ] ChatMessage entity supports attachments in metadata
- [ ] MarkdownAttachmentIcon component renders correctly with file icons
- [ ] File validation works for various file types
- [ ] Multiple file selection is functional
- [ ] Attachment state management is implemented
- [ ] CSS styling is applied and responsive

## Dependencies
- Existing ChatMessage entity
- React hooks and state management
- File API support in browser
- CSS custom properties for theming

## Notes
- Ensure backward compatibility with existing chat messages
- Test file validation with various file types and sizes
- Verify accessibility features work with screen readers
- Check responsive design on mobile devices 