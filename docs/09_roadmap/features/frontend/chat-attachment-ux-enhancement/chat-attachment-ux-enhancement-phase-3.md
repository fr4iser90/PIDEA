# Phase 3: Markdown Preview Integration - Chat Attachment UX Enhancement

## Overview
Create the Markdown preview modal component and integrate it with the existing marked library for rendering attachment content.

## Duration: 3 hours

## Tasks

### 1. Create MarkdownPreviewModal Component (1.5 hours)
**File**: `frontend/src/presentation/components/chat/main/MarkdownPreviewModal.jsx`

**Features**:
- Modal overlay with backdrop
- Markdown content rendering using marked
- Syntax highlighting for code blocks
- Responsive design
- Keyboard navigation and accessibility
- Copy to clipboard functionality

**Implementation**:
```javascript
import React, { useState, useEffect } from 'react';
import '@/css/components/markdown-preview-modal.css';

const MarkdownPreviewModal = ({ 
  isOpen, 
  onClose, 
  attachment = null,
  className = '' 
}) => {
  const [htmlContent, setHtmlContent] = useState('');
  const [activeTab, setActiveTab] = useState('rendered'); // 'rendered' or 'raw'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && attachment) {
      renderMarkdownContent();
    }
  }, [isOpen, attachment]);

  const renderMarkdownContent = () => {
    if (!attachment || !attachment.content) {
      setError('No content available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Configure marked for security and proper rendering
      if (window.marked) {
        window.marked.setOptions({
          breaks: true,
          gfm: true,
          sanitize: false, // We trust our content
          smartLists: true,
          highlight: function(code, lang) {
            // Basic syntax highlighting
            return `<pre class="code-block ${lang}"><code>${code}</code></pre>`;
          }
        });

        const html = window.marked.parse(attachment.content);
        setHtmlContent(html);
      } else {
        // Fallback if marked is not available
        setHtmlContent(`<pre>${attachment.content}</pre>`);
      }
    } catch (error) {
      console.error('Error rendering markdown:', error);
      setError(`Error rendering markdown: ${error.message}`);
      setHtmlContent(`<pre>${attachment.content}</pre>`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setHtmlContent('');
    setError(null);
    setActiveTab('rendered');
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  const copyToClipboard = async () => {
    if (!attachment?.content) return;
    
    try {
      await navigator.clipboard.writeText(attachment.content);
      // Could add a toast notification here
      console.log('Content copied to clipboard');
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  const downloadFile = () => {
    if (!attachment) return;
    
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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`markdown-preview-modal-overlay ${className}`}
      onClick={handleClose}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div 
        className="markdown-preview-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="file-info">
            <div className="file-details">
              <span className="file-name">
                📄 {attachment?.name || 'Unknown file'}
              </span>
              <span className="file-meta">
                {attachment?.size && `${formatFileSize(attachment.size)} • `}
                {attachment?.lastModified && `Modified: ${formatDate(attachment.lastModified)}`}
              </span>
            </div>
          </div>
          
          <div className="modal-actions">
            <button 
              className="action-btn"
              onClick={copyToClipboard}
              title="Copy content to clipboard"
            >
              📋 Copy
            </button>
            <button 
              className="action-btn"
              onClick={downloadFile}
              title="Download file"
            >
              💾 Download
            </button>
            <button 
              className="modal-close-btn"
              onClick={handleClose}
              title="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'rendered' ? 'active' : ''}`}
            onClick={() => setActiveTab('rendered')}
          >
            📖 Rendered
          </button>
          <button 
            className={`tab-btn ${activeTab === 'raw' ? 'active' : ''}`}
            onClick={() => setActiveTab('raw')}
          >
            📝 Raw Content
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-content">
          {isLoading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Rendering content...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <p>❌ {error}</p>
            </div>
          )}

          {!isLoading && !error && (
            <div className="tab-content">
              {activeTab === 'rendered' && (
                <div className="rendered-content">
                  {htmlContent ? (
                    <div 
                      className="markdown-content"
                      dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                  ) : (
                    <div className="no-content">
                      <p>No content available for rendering.</p>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'raw' && (
                <div className="raw-content">
                  <pre className="content-raw">
                    <code>{attachment?.content || 'No content available'}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarkdownPreviewModal;
```

### 2. Integrate with Existing Marked Library (30 minutes)
**File**: `frontend/src/presentation/components/chat/main/MarkdownPreviewModal.jsx`

**Integration**:
- Use existing marked library from CDN
- Configure marked options for security
- Add syntax highlighting support
- Handle edge cases and errors

**Implementation**:
```javascript
// Enhanced marked configuration
const configureMarked = () => {
  if (!window.marked) {
    console.warn('Marked library not available, using fallback rendering');
    return false;
  }

  try {
    window.marked.setOptions({
      breaks: true,
      gfm: true,
      sanitize: false, // We trust our content
      smartLists: true,
      highlight: function(code, lang) {
        // Enhanced syntax highlighting
        const languageMap = {
          'js': 'javascript',
          'jsx': 'javascript',
          'ts': 'typescript',
          'tsx': 'typescript',
          'py': 'python',
          'rb': 'ruby',
          'php': 'php',
          'java': 'java',
          'cpp': 'cpp',
          'c': 'c',
          'go': 'go',
          'rs': 'rust',
          'swift': 'swift',
          'kt': 'kotlin',
          'css': 'css',
          'html': 'html',
          'json': 'json',
          'xml': 'xml',
          'yaml': 'yaml',
          'yml': 'yaml',
          'sql': 'sql',
          'bash': 'bash',
          'sh': 'bash',
          'dockerfile': 'dockerfile',
          'docker': 'dockerfile'
        };

        const mappedLang = languageMap[lang] || lang;
        return `<pre class="code-block ${mappedLang}"><code class="language-${mappedLang}">${code}</code></pre>`;
      },
      renderer: new window.marked.Renderer()
    });

    // Custom renderer for better code block handling
    const renderer = window.marked.Renderer();
    renderer.code = function(code, language) {
      const validLanguage = language && language.match(/^[a-zA-Z0-9_-]+$/) ? language : 'text';
      return `<pre class="code-block ${validLanguage}"><code class="language-${validLanguage}">${code}</code></pre>`;
    };

    window.marked.use({ renderer });
    return true;
  } catch (error) {
    console.error('Error configuring marked:', error);
    return false;
  }
};
```

### 3. Add Modal State Management (30 minutes)
**File**: `frontend/src/presentation/components/chat/main/ChatComponent.jsx`

**Integration**:
- Import and use MarkdownPreviewModal
- Manage modal state
- Handle attachment selection
- Add keyboard shortcuts

**Implementation**:
```javascript
// Import the modal component
import MarkdownPreviewModal from './MarkdownPreviewModal';

// Add modal state management
const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
const [selectedAttachment, setSelectedAttachment] = useState(null);

// Enhanced attachment click handler
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

// Add modal to component render
return (
  <div ref={containerRef} className="chat-container">
    {/* Existing chat content */}
    
    {/* Markdown Preview Modal */}
    <MarkdownPreviewModal
      isOpen={isPreviewModalOpen}
      onClose={handlePreviewModalClose}
      attachment={selectedAttachment}
    />
  </div>
);
```

### 4. Implement Preview Content Rendering (30 minutes)
**File**: `frontend/src/css/components/markdown-preview-modal.css`

**Styling**:
- Modal overlay and backdrop
- Responsive modal design
- Markdown content styling
- Code block syntax highlighting
- Tab navigation styling

**Implementation**:
```css
/* Modal Overlay */
.markdown-preview-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
}

/* Modal Container */
.markdown-preview-modal {
  background: var(--panel-bg, #1e1e1e);
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  max-width: 90vw;
  max-height: 90vh;
  width: 800px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color, #333);
}

/* Modal Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color, #333);
  background: var(--bg-tertiary, #2a2e35);
  border-radius: 12px 12px 0 0;
}

.file-info {
  flex: 1;
}

.file-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #e6e6e6);
}

.file-meta {
  font-size: 0.875rem;
  color: var(--text-secondary, #8ca0b3);
}

.modal-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-btn {
  padding: 6px 12px;
  border: 1px solid var(--border-color, #333);
  border-radius: 6px;
  background: var(--bg-secondary, #23272e);
  color: var(--text-primary, #e6e6e6);
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--primary-color, #4e8cff);
  color: white;
}

.modal-close-btn {
  padding: 8px;
  border: none;
  background: transparent;
  color: var(--text-secondary, #8ca0b3);
  cursor: pointer;
  font-size: 1.2rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary, #e6e6e6);
}

/* Tab Navigation */
.tab-navigation {
  display: flex;
  background: var(--bg-tertiary, #2a2e35);
  border-bottom: 1px solid var(--border-color, #333);
}

.tab-btn {
  padding: 12px 20px;
  border: none;
  background: transparent;
  color: var(--text-secondary, #8ca0b3);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;
}

.tab-btn.active {
  color: var(--primary-color, #4e8cff);
  border-bottom-color: var(--primary-color, #4e8cff);
  background: var(--panel-bg, #1e1e1e);
}

.tab-btn:hover:not(.active) {
  color: var(--text-primary, #e6e6e6);
  background: rgba(255, 255, 255, 0.05);
}

/* Modal Content */
.modal-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tab-content {
  flex: 1;
  overflow: hidden;
}

.rendered-content,
.raw-content {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
}

/* Markdown Content Styling */
.markdown-content {
  line-height: 1.6;
  color: var(--text-primary, #e6e6e6);
}

.markdown-content h1,
.markdown-content h2,
.markdown-content h3,
.markdown-content h4,
.markdown-content h5,
.markdown-content h6 {
  color: var(--text-primary, #e6e6e6);
  margin: 1.5em 0 0.5em 0;
  font-weight: 600;
}

.markdown-content h1 { font-size: 1.8em; }
.markdown-content h2 { font-size: 1.5em; }
.markdown-content h3 { font-size: 1.3em; }

.markdown-content p {
  margin: 1em 0;
}

.markdown-content ul,
.markdown-content ol {
  margin: 1em 0;
  padding-left: 2em;
}

.markdown-content li {
  margin: 0.5em 0;
}

.markdown-content a {
  color: var(--primary-color, #4e8cff);
  text-decoration: none;
}

.markdown-content a:hover {
  text-decoration: underline;
}

.markdown-content blockquote {
  background: rgba(78, 140, 255, 0.1);
  border-left: 4px solid var(--primary-color, #4e8cff);
  margin: 1em 0;
  padding: 1em;
  border-radius: 6px;
  color: var(--text-secondary, #8ca0b3);
}

.markdown-content code {
  background: rgba(255, 255, 255, 0.1);
  color: var(--primary-color, #4e8cff);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.markdown-content pre {
  background: var(--bg-secondary, #23272e);
  border-radius: 8px;
  padding: 1em;
  margin: 1em 0;
  overflow-x: auto;
  border: 1px solid var(--border-color, #333);
}

.markdown-content pre code {
  background: transparent;
  color: var(--text-primary, #e6e6e6);
  padding: 0;
}

/* Code Block Styling */
.code-block {
  background: var(--bg-secondary, #23272e);
  border-radius: 8px;
  padding: 1em;
  margin: 1em 0;
  overflow-x: auto;
  border: 1px solid var(--border-color, #333);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
}

.code-block code {
  background: transparent;
  color: var(--text-primary, #e6e6e6);
  padding: 0;
}

/* Raw Content Styling */
.content-raw {
  background: var(--bg-secondary, #23272e);
  border: 1px solid var(--border-color, #333);
  border-radius: 8px;
  padding: 1em;
  margin: 0;
  overflow-x: auto;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-primary, #e6e6e6);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.content-raw code {
  background: none;
  padding: 0;
  color: inherit;
}

/* Loading and Error States */
.loading-state,
.error-state,
.no-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-secondary, #8ca0b3);
  font-size: 1rem;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color, #333);
  border-top: 3px solid var(--primary-color, #4e8cff);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive Design */
@media (max-width: 768px) {
  .markdown-preview-modal {
    width: 95vw;
    max-height: 95vh;
  }
  
  .modal-header {
    padding: 16px;
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .modal-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .rendered-content,
  .raw-content {
    padding: 16px;
  }
}

/* Light Theme Support */
body.light-theme .markdown-preview-modal {
  background: #ffffff;
  border-color: #e1e5e9;
}

body.light-theme .modal-header {
  background: #f8f9fa;
  border-color: #e1e5e9;
}

body.light-theme .file-name {
  color: #2c3e50;
}

body.light-theme .file-meta {
  color: #6c757d;
}

body.light-theme .action-btn {
  background: #f8f9fa;
  border-color: #e1e5e9;
  color: #2c3e50;
}

body.light-theme .action-btn:hover {
  background: #4e8cff;
  color: white;
}

body.light-theme .tab-navigation {
  background: #f8f9fa;
  border-color: #e1e5e9;
}

body.light-theme .tab-btn {
  color: #6c757d;
}

body.light-theme .tab-btn.active {
  color: #4e8cff;
  background: #ffffff;
}

body.light-theme .markdown-content {
  color: #2c3e50;
}

body.light-theme .markdown-content h1,
body.light-theme .markdown-content h2,
body.light-theme .markdown-content h3,
body.light-theme .markdown-content h4,
body.light-theme .markdown-content h5,
body.light-theme .markdown-content h6 {
  color: #2c3e50;
}

body.light-theme .markdown-content blockquote {
  background: rgba(78, 140, 255, 0.1);
  color: #6c757d;
}

body.light-theme .code-block,
body.light-theme .content-raw {
  background: #f8f9fa;
  border-color: #e1e5e9;
  color: #2c3e50;
}
```

### 5. Add Modal Styling and Animations (30 minutes)
**File**: `frontend/src/css/components/markdown-preview-modal.css`

**Enhancements**:
- Smooth entrance/exit animations
- Focus management
- Scroll behavior
- Loading states

**Implementation**:
```css
/* Animation Classes */
.markdown-preview-modal-overlay {
  animation: modalFadeIn 0.3s ease-out;
}

.markdown-preview-modal {
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Focus Management */
.markdown-preview-modal:focus {
  outline: none;
}

/* Scroll Behavior */
.rendered-content,
.raw-content {
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: var(--border-color, #333) transparent;
}

.rendered-content::-webkit-scrollbar,
.raw-content::-webkit-scrollbar {
  width: 8px;
}

.rendered-content::-webkit-scrollbar-track,
.raw-content::-webkit-scrollbar-track {
  background: transparent;
}

.rendered-content::-webkit-scrollbar-thumb,
.raw-content::-webkit-scrollbar-thumb {
  background: var(--border-color, #333);
  border-radius: 4px;
}

.rendered-content::-webkit-scrollbar-thumb:hover,
.raw-content::-webkit-scrollbar-thumb:hover {
  background: var(--primary-color, #4e8cff);
}
```

## Success Criteria
- [ ] MarkdownPreviewModal component renders correctly
- [ ] Modal opens and closes smoothly with animations
- [ ] Markdown content renders with proper styling
- [ ] Code blocks have syntax highlighting
- [ ] Tab navigation works between rendered and raw views
- [ ] Copy and download functionality works
- [ ] Keyboard navigation and accessibility features work
- [ ] Modal is responsive on mobile devices

## Dependencies
- Phase 1 and 2 components
- Existing marked library from CDN
- React hooks and state management
- CSS custom properties for theming

## Notes
- Test with various Markdown content types
- Verify syntax highlighting works for different languages
- Check accessibility with screen readers
- Test keyboard navigation (Escape to close, Tab navigation)
- Ensure modal doesn't interfere with existing chat functionality
- Test performance with large Markdown files 