import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import '@/scss/components/_task-review-modal.scss';;

const TaskReviewModal = ({ 
  isOpen, 
  onClose, 
  reviewData,
  onSplit,
  onExecute,
  onModify
}) => {
  const [activeTab, setActiveTab] = useState('plan');
  const [htmlContent, setHtmlContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [decision, setDecision] = useState(null);

  useEffect(() => {
    if (isOpen && reviewData?.plan) {
      renderPlanContent();
    }
  }, [isOpen, reviewData]);

  const renderPlanContent = () => {
    try {
      // Configure marked for security and proper rendering
      marked.setOptions({
        breaks: true,
        gfm: true,
        sanitize: false,
        smartLists: true,
        highlight: function(code, lang) {
          return `<pre class="code-block ${lang}"><code>${code}</code></pre>`;
        }
      });

      const html = marked(reviewData.plan);
      setHtmlContent(html);
    } catch (error) {
      console.error('Error rendering plan:', error);
      setHtmlContent(`<p class="error">Error rendering plan: ${error.message}</p><pre>${reviewData.plan}</pre>`);
    }
  };

  const handleSplit = async () => {
    setIsProcessing(true);
    setDecision('split');
    
    try {
      if (onSplit) {
        await onSplit(reviewData);
      }
    } catch (error) {
      console.error('Error splitting tasks:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecute = async () => {
    setIsProcessing(true);
    setDecision('execute');
    
    try {
      if (onExecute) {
        await onExecute(reviewData);
      }
    } catch (error) {
      console.error('Error executing tasks:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleModify = async () => {
    setIsProcessing(true);
    setDecision('modify');
    
    try {
      if (onModify) {
        await onModify(reviewData);
      }
    } catch (error) {
      console.error('Error modifying plan:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  const getPlanSummary = () => {
    if (!reviewData?.plan) return null;

    const lines = reviewData.plan.split('\n');
    const summary = {
      phases: 0,
      estimatedHours: 0,
      filesToModify: 0,
      filesToCreate: 0,
      filesToDelete: 0,
      priority: 'medium',
      category: 'feature'
    };

    // Parse plan for summary information
    lines.forEach(line => {
      if (line.includes('Phase') && line.includes('hours')) {
        summary.phases++;
        const hoursMatch = line.match(/(\d+)\s*hours?/i);
        if (hoursMatch) {
          summary.estimatedHours += parseInt(hoursMatch[1]);
        }
      }
      if (line.includes('Files to Modify:')) summary.filesToModify++;
      if (line.includes('Files to Create:')) summary.filesToCreate++;
      if (line.includes('Files to Delete:')) summary.filesToDelete++;
      if (line.includes('Priority:')) {
        const priorityMatch = line.match(/Priority:\s*(\w+)/i);
        if (priorityMatch) summary.priority = priorityMatch[1].toLowerCase();
      }
      if (line.includes('Category:')) {
        const categoryMatch = line.match(/Category:\s*(\w+)/i);
        if (categoryMatch) summary.category = categoryMatch[1].toLowerCase();
      }
    });

    return summary;
  };

  const planSummary = getPlanSummary();

  if (!isOpen) return null;

  return (
    <div className="task-review-modal-overlay" onClick={handleClose}>
      <div className="task-review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Review AI-Generated Plan</h2>
          <button className="modal-close-btn" onClick={handleClose}>×</button>
        </div>

        <div className="modal-content">
          {planSummary && (
            <div className="plan-summary">
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="summary-label">Phases</span>
                  <span className="summary-value">{planSummary.phases}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Est. Hours</span>
                  <span className="summary-value">{planSummary.estimatedHours}h</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Files to Modify</span>
                  <span className="summary-value">{planSummary.filesToModify}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Files to Create</span>
                  <span className="summary-value">{planSummary.filesToCreate}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Priority</span>
                  <span className={`summary-value priority-${planSummary.priority}`}>
                    {planSummary.priority}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Category</span>
                  <span className="summary-value">{planSummary.category}</span>
                </div>
              </div>
            </div>
          )}

          <div className="review-tabs">
            <button 
              className={`tab-button ${activeTab === 'plan' ? 'active' : ''}`}
              onClick={() => setActiveTab('plan')}
            >
              📋 Implementation Plan
            </button>
            <button 
              className={`tab-button ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              👁️ Task Preview
            </button>
            <button 
              className={`tab-button ${activeTab === 'files' ? 'active' : ''}`}
              onClick={() => setActiveTab('files')}
            >
              📁 File Changes
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'plan' && (
              <div className="plan-content">
                <div 
                  className="plan-html"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              </div>
            )}

            {activeTab === 'preview' && (
              <div className="preview-content">
                <div className="task-preview">
                  <h3>Task Details</h3>
                  <div className="preview-section">
                    <label>Description:</label>
                    <p>{reviewData?.taskData?.description || 'No description provided'}</p>
                  </div>
                  <div className="preview-section">
                    <label>Category:</label>
                    <span className={`category-badge ${reviewData?.taskData?.category || 'feature'}`}>
                      {reviewData?.taskData?.category || 'feature'}
                    </span>
                  </div>
                  <div className="preview-section">
                    <label>Priority:</label>
                    <span className={`priority-badge ${reviewData?.taskData?.priority || 'medium'}`}>
                      {reviewData?.taskData?.priority || 'medium'}
                    </span>
                  </div>
                  <div className="preview-section">
                    <label>Estimated Hours:</label>
                    <span>{reviewData?.taskData?.estimatedHours || 0} hours</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'files' && (
              <div className="files-content">
                <div className="files-preview">
                  <h3>File Changes Preview</h3>
                  <div className="files-list">
                    {reviewData?.filesToCreate?.map((file, index) => (
                      <div key={index} className="file-item create">
                        <span className="file-icon">📄</span>
                        <span className="file-path">{file}</span>
                        <span className="file-action">Create</span>
                      </div>
                    ))}
                    {reviewData?.filesToModify?.map((file, index) => (
                      <div key={index} className="file-item modify">
                        <span className="file-icon">✏️</span>
                        <span className="file-path">{file}</span>
                        <span className="file-action">Modify</span>
                      </div>
                    ))}
                    {reviewData?.filesToDelete?.map((file, index) => (
                      <div key={index} className="file-item delete">
                        <span className="file-icon">🗑️</span>
                        <span className="file-path">{file}</span>
                        <span className="file-action">Delete</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <div className="action-buttons">
              <button 
                className="action-btn modify-btn"
                onClick={handleModify}
                disabled={isProcessing}
              >
                {isProcessing && decision === 'modify' ? 'Modifying...' : '✏️ Modify Plan'}
              </button>
              
              <button 
                className="action-btn split-btn"
                onClick={handleSplit}
                disabled={isProcessing}
              >
                {isProcessing && decision === 'split' ? 'Splitting...' : '🔀 Split into Subtasks'}
              </button>
              
              <button 
                className="action-btn execute-btn"
                onClick={handleExecute}
                disabled={isProcessing}
              >
                {isProcessing && decision === 'execute' ? 'Executing...' : '🚀 Execute Now'}
              </button>
            </div>
            
            <div className="action-info">
              <p className="info-text">
                <strong>Modify:</strong> Edit the plan before execution<br/>
                <strong>Split:</strong> Break into smaller, manageable tasks<br/>
                <strong>Execute:</strong> Start immediate implementation
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskReviewModal; 