import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import '@css/modal/task-docs-details-modal.css';

/**
 * Modal component for displaying documentation task details
 * Renders markdown content with proper styling and navigation
 */
const DocsTaskDetailsModal = ({ 
  isOpen, 
  onClose, 
  taskDetails = null,
  isLoading = false,
  onSendToChat = null,
  onExecuteTask = null
}) => {
  const [htmlContent, setHtmlContent] = useState('');
  const [activeTab, setActiveTab] = useState('rendered'); // 'rendered' or 'raw'
  const [includeExecutePrompt, setIncludeExecutePrompt] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executePromptContent, setExecutePromptContent] = useState('');

  useEffect(() => {
    const content = taskDetails?.content || taskDetails?.description;
    if (taskDetails && content) {
      try {
        // Configure marked for security and proper rendering
        marked.setOptions({
          breaks: true,
          gfm: true,
          sanitize: false, // We trust our content
          smartLists: true,
          highlight: function(code, lang) {
            // Basic syntax highlighting
            return `<pre class="code-block ${lang}"><code>${code}</code></pre>`;
          }
        });

        const html = marked(content);
        setHtmlContent(html);
      } catch (error) {
        console.error('Error rendering markdown:', error);
        setHtmlContent(`<p class="error">Error rendering markdown: ${error.message}</p>`);
      }
    }
  }, [taskDetails]);

  useEffect(() => {
    if (isOpen) {
      loadExecutePrompt();
    }
  }, [isOpen]);

  const loadExecutePrompt = async () => {
    try {
      const response = await fetch('/api/framework/prompt/task-management/task-execute');
      if (response.ok) {
        const data = await response.json();
        setExecutePromptContent(data.content);
      }
    } catch (error) {
      console.error('Failed to load execute prompt:', error);
    }
  };

  const handleExecuteTask = async () => {
    if (!taskDetails || !onExecuteTask) return;
    
    try {
      setIsExecuting(true);
      await onExecuteTask(taskDetails);
    } catch (error) {
      console.error('Error executing task:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSendToChat = () => {
    if (!taskDetails || !onSendToChat) return;

    let messageContent = '';

    if (includeExecutePrompt && executePromptContent) {
      // Include the complete task-execute.md prompt from framework
      messageContent = `${executePromptContent}

---

# TASK TO EXECUTE: ${taskDetails.title}

## Task Details
- **Priority**: ${taskDetails.priority || 'Not specified'}
- **Status**: ${taskDetails.status || 'Not specified'}
- **Estimated Time**: ${taskDetails.estimatedTime || 'Not specified'}
- **File**: ${taskDetails.filename}

## Task Content
${taskDetails.content || taskDetails.description}

## Execute Instructions
**Execute this task automatically using the above prompt framework. Create a Git branch named \`task/${taskDetails.id}-${Date.now()}\` and implement everything with zero user input required.**`;
    } else {
      // Just send the task content
      messageContent = `# ${taskDetails.title}

${taskDetails.content || taskDetails.description}`;
    }

    onSendToChat(messageContent);
    handleClose();
  };

  const handleClose = () => {
    setActiveTab('rendered');
    setHtmlContent('');
    onClose();
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return '#ff4444';
      case 'medium': return '#ffaa00';
      case 'low': return '#44aa44';
      default: return '#888888';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '#44aa44';
      case 'in-progress': return '#ffaa00';
      case 'blocked': return '#ff4444';
      case 'pending': return '#888888';
      default: return '#888888';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="docs-task-modal-overlay" onClick={handleClose}>
      <div className="docs-task-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-section">
            <h2 className="modal-title">
              {taskDetails?.title || 'Documentation Task'}
            </h2>
            <div className="task-meta">
              {taskDetails?.priority && (
                <span 
                  className="priority-badge"
                  style={{ backgroundColor: getPriorityColor(taskDetails.priority) }}
                >
                  {taskDetails.priority}
                </span>
              )}
              {taskDetails?.status && (
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(taskDetails.status) }}
                >
                  {taskDetails.status}
                </span>
              )}
              {taskDetails?.estimatedTime && (
                <span className="time-badge">
                  ⏱️ {taskDetails.estimatedTime}
                </span>
              )}
            </div>
          </div>
          <button className="modal-close-btn" onClick={handleClose}>
            ✕
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="modal-loading">
            <div className="loading-spinner"></div>
            <p>Loading task details...</p>
          </div>
        )}

        {/* Content */}
        {!isLoading && taskDetails && (
          <div className="modal-content">
            {/* File Info */}
            <div className="file-info">
              <div className="file-details">
                <span className="file-name">📄 {taskDetails.filename}</span>
                <span className="file-modified">
                  Last modified: {formatDate(taskDetails.lastModified)}
                </span>
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
                📝 Raw Markdown
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'rendered' && (
                <div className="rendered-content">
                  <div 
                    className="markdown-content"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                </div>
              )}
              
              {activeTab === 'raw' && (
                <div className="raw-content">
                  <pre className="markdown-raw">
                    <code>{taskDetails.content}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {!isLoading && !taskDetails && (
          <div className="modal-error">
            <p>❌ No task details available</p>
          </div>
        )}

        {/* Modal Footer */}
        <div className="modal-footer">
          <div className="footer-actions">
            <button className="btn-secondary" onClick={handleClose}>
              Close
            </button>
            {taskDetails && (
              <>
                <button 
                  className="btn-primary"
                  onClick={() => {
                    // Copy task title to clipboard
                    navigator.clipboard.writeText(taskDetails.title);
                  }}
                >
                  Copy Title
                </button>
                {onSendToChat && (
                  <button 
                    className="btn-vibecoder"
                    onClick={handleSendToChat}
                  >
                    🚀 Send to Chat
                  </button>
                )}
                {onExecuteTask && (
                  <button 
                    className="btn-vibecoder"
                    onClick={handleExecuteTask}
                    disabled={isExecuting}
                  >
                    {isExecuting ? '🔄 Executing...' : '⚡ Execute Task'}
                  </button>
                )}
              </>
            )}
          </div>
          
          {/* Execute Options */}
          {taskDetails && onSendToChat && (
            <div className="execute-options">
              <label className="execute-checkbox">
                <input
                  type="checkbox"
                  checked={includeExecutePrompt}
                  onChange={(e) => setIncludeExecutePrompt(e.target.checked)}
                />
                <span>Include Execute Prompt (Auto-branch & implementation)</span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocsTaskDetailsModal; 