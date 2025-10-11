import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import '@/scss/components/_manual-task-details-modal.scss';;

/**
 * Modal component for displaying manual task details
 * Renders markdown content with proper styling and navigation
 */
const ManualTaskDetailsModal = ({ 
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
      // Use the correct API endpoint from the configuration
      const response = await fetch('/api/prompts/task-management/task-execute.md');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.content) {
          setExecutePromptContent(data.content);
        } else {
          logger.error('Failed to load execute prompt: Invalid response format');
        }
      } else {
        logger.error('Failed to load execute prompt: HTTP error', response.status);
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

${taskDetails.content || taskDetails.description || ''}

---

Please execute this manual task with zero user input required.`;
    } else {
      messageContent = `# TASK TO EXECUTE: ${taskDetails.title}

${taskDetails.content || taskDetails.description || ''}

Please execute this manual task with zero user input required.`;
    }

    onSendToChat(messageContent);
    onClose();
  };

  const handleClose = () => {
    setActiveTab('rendered');
    setIncludeExecutePrompt(true);
    onClose();
  };

  const getPriorityColor = (priority) => {
    // Handle value objects
    const priorityValue = priority?.value || priority;
    const priorityStr = String(priorityValue || '').toLowerCase();
    switch (priorityStr) {
      case 'high':
        return '#ff6b6b';
      case 'medium':
        return '#ffd93d';
      case 'low':
        return '#6bcf7f';
      default:
        return '#6c757d';
    }
  };

  const getStatusColor = (status) => {
    // Handle value objects
    const statusValue = status?.value || status;
    const statusStr = String(statusValue || '').toLowerCase();
    switch (statusStr) {
      case 'completed':
        return '#6bcf7f';
      case 'in_progress':
        return '#ffd93d';
      case 'blocked':
        return '#ff6b6b';
      case 'pending':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  };

  const getPriorityText = (priority) => {
    // Handle value objects
    const priorityValue = priority?.value || priority;
    return String(priorityValue || 'Unknown');
  };

  const getStatusText = (status) => {
    // Handle value objects
    const statusValue = status?.value || status;
    return String(statusValue || 'Unknown').replace('_', ' ');
  };

  const getCategoryText = (category) => {
    // Handle value objects
    const categoryValue = category?.value || category;
    return String(categoryValue || 'Unknown');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="manual-task-details-modal__manual-task-details-modal-overlay">
      <div className="manual-task-details-modal__manual-task-details-modal">
        <div className="manual-task-details-modal__manual-task-details-modal-header">
          <div className="manual-task-details-modal__manual-task-details-modal-title">
            <h2>Manual Task Details</h2>
            {taskDetails && (
              <div className="manual-task-details-modal__manual-task-details-modal-meta">
                <span className="manual-task-details-modal__manual-task-details-modal-priority" style={{ color: getPriorityColor(taskDetails.priority) }}>
                  {getPriorityText(taskDetails.priority)}
                </span>
                <span className="manual-task-details-modal__manual-task-details-modal-status" style={{ color: getStatusColor(taskDetails.status) }}>
                  {getStatusText(taskDetails.status)}
                </span>
                {taskDetails.category && (
                  <span className="manual-task-details-modal__manual-task-details-modal-category">
                    {getCategoryText(taskDetails.category)}
                  </span>
                )}
              </div>
            )}
          </div>
          <button className="manual-task-details-modal__manual-task-details-modal-close" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="manual-task-details-modal__manual-task-details-modal-content">
          {isLoading ? (
            <div className="manual-task-details-modal__manual-task-details-modal-loading">
              <div className="spinner"></div>
              <p>Loading task details...</p>
            </div>
          ) : taskDetails ? (
            <>
              <div className="manual-task-details-modal__manual-task-details-modal-tabs">
                <button 
                  className={`manual-task-details-modal__manual-task-details-modal-tab ${activeTab === 'rendered' ? 'active' : ''}`}
                  onClick={() => setActiveTab('rendered')}
                >
                  Rendered
                </button>
                <button 
                  className={`manual-task-details-modal__manual-task-details-modal-tab ${activeTab === 'raw' ? 'active' : ''}`}
                  onClick={() => setActiveTab('raw')}
                >
                  Raw
                </button>
              </div>

              <div className="manual-task-details-modal__manual-task-details-modal-body">
                {activeTab === 'rendered' ? (
                  <div 
                    className="manual-task-details-modal__manual-task-details-modal-rendered"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                ) : (
                  <pre className="manual-task-details-modal__manual-task-details-modal-raw">
                    {taskDetails.content || taskDetails.description || 'No content available'}
                  </pre>
                )}
              </div>

              <div className="manual-task-details-modal__manual-task-details-modal-footer">
                <div className="manual-task-details-modal__manual-task-details-modal-actions">
                  {onSendToChat && (
                    <div className="manual-task-details-modal__manual-task-details-modal-send-options">
                      <label className="manual-task-details-modal__manual-task-details-modal-checkbox">
                        <input
                          type="checkbox"
                          checked={includeExecutePrompt}
                          onChange={(e) => setIncludeExecutePrompt(e.target.checked)}
                        />
                        Include execution prompt
                      </label>
                      <button 
                        className="manual-task-details-modal__manual-task-details-modal-button manual-task-details-modal__manual-task-details-modal-button-secondary"
                        onClick={handleSendToChat}
                      >
                        Send to Chat
                      </button>
                    </div>
                  )}
                  
                  {onExecuteTask && (
                    <button 
                      className="manual-task-details-modal__manual-task-details-modal-button manual-task-details-modal__manual-task-details-modal-button-primary"
                      onClick={handleExecuteTask}
                      disabled={isExecuting}
                    >
                      {isExecuting ? 'Executing...' : 'Execute Task'}
                    </button>
                  )}
                </div>

                <div className="manual-task-details-modal__manual-task-details-modal-info">
                  <div className="manual-task-details-modal__manual-task-details-modal-info-item">
                    <strong>Created:</strong> {formatDate(taskDetails.createdAt)}
                  </div>
                  <div className="manual-task-details-modal__manual-task-details-modal-info-item">
                    <strong>Updated:</strong> {formatDate(taskDetails.updatedAt)}
                  </div>
                  {taskDetails.metadata && (
                    <div className="manual-task-details-modal__manual-task-details-modal-info-item">
                      <strong>Type:</strong> {getCategoryText(taskDetails.type) || 'Documentation'}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="manual-task-details-modal__manual-task-details-modal-error">
              <p>No task details available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManualTaskDetailsModal; 