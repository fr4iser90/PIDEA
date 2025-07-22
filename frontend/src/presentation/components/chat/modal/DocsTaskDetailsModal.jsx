import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import '@/css/modal/task-docs-details-modal.css';

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
    const content = taskDetails?.content || 
                   taskDetails?.description || 
                   taskDetails?.details || 
                   taskDetails?.htmlContent ||
                   taskDetails?.metadata?.content ||
                   taskDetails?.metadata?.description;
    
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
        logger.error('Error rendering markdown:', error);
        setHtmlContent(`<p class="error">Error rendering markdown: ${error.message}</p><pre>${content}</pre>`);
      }
    } else {
      setHtmlContent('');
    }
  }, [taskDetails]);

  useEffect(() => {
    if (isOpen) {
      loadExecutePrompt();
    }
  }, [isOpen]);

  const loadExecutePrompt = async () => {
    try {
      const response = await fetch('/api/prompts/task-management/task-execute');
      if (response.ok) {
        const data = await response.json();
        setExecutePromptContent(data.content);
      }
    } catch (error) {
      logger.error('Failed to load execute prompt:', error);
    }
  };

  const handleExecuteTask = async () => {
    if (!taskDetails || !onExecuteTask) return;
    
    try {
      setIsExecuting(true);
      await onExecuteTask(taskDetails);
    } catch (error) {
      logger.error('Error executing task:', error);
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
    const priorityStr = String(priority || '').toLowerCase();
    switch (priorityStr) {
      case 'high': return '#ff4444';
      case 'medium': return '#ffaa00';
      case 'low': return '#44aa44';
      default: return '#888888';
    }
  };

  const getStatusColor = (status) => {
    const statusStr = String(status || '').toLowerCase();
    switch (statusStr) {
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
                  {String(taskDetails.priority)}
                </span>
              )}
              {taskDetails?.status && (
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(taskDetails.status) }}
                >
                  {String(taskDetails.status)}
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

        {/* Error State */}
        {!isLoading && !taskDetails && (
          <div className="modal-error">
            <p>❌ No task details available</p>
            <p className="error-details">
              The task details could not be loaded. This might be due to:
            </p>
            <ul className="error-list">
              <li>• Task not found in database</li>
              <li>• Network connection issue</li>
              <li>• Backend service unavailable</li>
            </ul>
            <button className="btn-secondary" onClick={handleClose}>
              Close
            </button>
          </div>
        )}

        {/* Content */}
        {!isLoading && taskDetails && (
          <div className="modal-content">
            {/* File Info */}
            <div className="file-info">
              <div className="file-details">
                <span className="file-name">📄 {taskDetails.filename || taskDetails.metadata?.filename || 'Unknown file'}</span>
                <span className="file-modified">
                  Last modified: {formatDate(taskDetails.lastModified || taskDetails.updatedAt || taskDetails.createdAt)}
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
                  {htmlContent ? (
                    <div 
                      className="markdown-content"
                      dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                  ) : (
                    <div className="no-content">
                      <p>No content available for rendering.</p>
                      <p>Task description: {taskDetails.description || taskDetails.content || 'No description available'}</p>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'raw' && (
                <div className="raw-content">
                  <pre className="markdown-raw">
                    <code>{taskDetails.content || taskDetails.description || 'No content available'}</code>
                  </pre>
                </div>
              )}
            </div>
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