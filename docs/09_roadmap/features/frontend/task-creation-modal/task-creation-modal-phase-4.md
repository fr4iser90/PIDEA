# Phase 4: Review and Confirmation System

## Overview
Implement the review modal for plan assessment, split/execute decision logic, task database integration, and confirmation workflows.

## Tasks

### 1. Create TaskReviewModal Component
**File**: `frontend/src/presentation/components/chat/modal/TaskReviewModal.jsx`

**Implementation**:
```jsx
import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import '@/css/modal/task-review-modal.css';

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
              className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
            >
              🔍 Analysis
            </button>
            <button 
              className={`tab-button ${activeTab === 'risks' ? 'active' : ''}`}
              onClick={() => setActiveTab('risks')}
            >
              ⚠️ Risks & Dependencies
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'plan' && (
              <div className="plan-content">
                <div 
                  className="markdown-content"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              </div>
            )}

            {activeTab === 'analysis' && (
              <div className="analysis-content">
                <h3>AI Analysis Results</h3>
                <div className="analysis-grid">
                  <div className="analysis-item">
                    <h4>✅ Strengths</h4>
                    <ul>
                      <li>Comprehensive implementation plan</li>
                      <li>Clear phase breakdown</li>
                      <li>Detailed file impact analysis</li>
                      <li>Proper testing strategy</li>
                    </ul>
                  </div>
                  <div className="analysis-item">
                    <h4>⚠️ Considerations</h4>
                    <ul>
                      <li>Verify estimated time accuracy</li>
                      <li>Check dependency requirements</li>
                      <li>Review security implications</li>
                      <li>Confirm resource availability</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'risks' && (
              <div className="risks-content">
                <h3>Risk Assessment</h3>
                <div className="risk-levels">
                  <div className="risk-level high">
                    <h4>🔴 High Risk</h4>
                    <ul>
                      <li>Complex integration points</li>
                      <li>Database schema changes</li>
                      <li>Breaking API changes</li>
                    </ul>
                  </div>
                  <div className="risk-level medium">
                    <h4>🟡 Medium Risk</h4>
                    <ul>
                      <li>UI/UX changes</li>
                      <li>Performance impact</li>
                      <li>Testing coverage</li>
                    </ul>
                  </div>
                  <div className="risk-level low">
                    <h4>🟢 Low Risk</h4>
                    <ul>
                      <li>Documentation updates</li>
                      <li>Minor bug fixes</li>
                      <li>Code refactoring</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="review-actions">
            <div className="action-buttons">
              <button 
                className="btn-secondary"
                onClick={handleModify}
                disabled={isProcessing}
              >
                🔧 Modify Plan
              </button>
              <button 
                className="btn-warning"
                onClick={handleSplit}
                disabled={isProcessing}
              >
                ✂️ Split into Tasks
              </button>
              <button 
                className="btn-primary"
                onClick={handleExecute}
                disabled={isProcessing}
              >
                {isProcessing && decision === 'execute' ? (
                  <>
                    <div className="spinner"></div>
                    Executing...
                  </>
                ) : (
                  '🚀 Execute Plan'
                )}
              </button>
            </div>
            
            <div className="action-descriptions">
              <div className="action-desc">
                <strong>Modify:</strong> Request changes to the plan before execution
              </div>
              <div className="action-desc">
                <strong>Split:</strong> Break down into smaller, manageable tasks
              </div>
              <div className="action-desc">
                <strong>Execute:</strong> Start automatic implementation now
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskReviewModal;
```

### 2. Create Review Modal CSS
**File**: `frontend/src/css/modal/task-review-modal.css`

**Implementation**:
```css
.task-review-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  backdrop-filter: blur(4px);
}

.task-review-modal {
  background: #1e1e1e;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
  width: 95%;
  max-width: 1000px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid #333;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #333;
  background: linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%);
  border-radius: 12px 12px 0 0;
}

.modal-header h2 {
  margin: 0;
  color: #fff;
  font-size: 1.5rem;
  font-weight: 600;
}

.modal-close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.modal-close-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* Plan Summary */
.plan-summary {
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid #333;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.summary-label {
  color: #888;
  font-size: 0.8rem;
  margin-bottom: 4px;
}

.summary-value {
  color: #fff;
  font-size: 1.2rem;
  font-weight: 600;
}

.priority-high { color: #ff4444; }
.priority-medium { color: #ffaa00; }
.priority-low { color: #44aa44; }

/* Review Tabs */
.review-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid #333;
}

.tab-button {
  background: none;
  border: none;
  color: #888;
  padding: 12px 16px;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
  border-bottom: 2px solid transparent;
}

.tab-button:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.tab-button.active {
  color: #007acc;
  background: rgba(0, 122, 204, 0.1);
  border-bottom-color: #007acc;
}

/* Tab Content */
.tab-content {
  min-height: 400px;
}

.plan-content {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #333;
}

.markdown-content {
  color: #ccc;
  line-height: 1.6;
}

.markdown-content h1,
.markdown-content h2,
.markdown-content h3,
.markdown-content h4,
.markdown-content h5,
.markdown-content h6 {
  color: #fff;
  margin-top: 24px;
  margin-bottom: 12px;
}

.markdown-content h1 { font-size: 1.8rem; }
.markdown-content h2 { font-size: 1.5rem; }
.markdown-content h3 { font-size: 1.3rem; }

.markdown-content p {
  margin-bottom: 12px;
}

.markdown-content ul,
.markdown-content ol {
  margin-bottom: 12px;
  padding-left: 20px;
}

.markdown-content li {
  margin-bottom: 4px;
}

.markdown-content code {
  background: #333;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
}

.markdown-content pre {
  background: #333;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 16px 0;
}

.markdown-content pre code {
  background: none;
  padding: 0;
}

/* Analysis Content */
.analysis-content h3 {
  color: #fff;
  margin-bottom: 20px;
}

.analysis-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.analysis-item {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #333;
}

.analysis-item h4 {
  color: #fff;
  margin-bottom: 12px;
  font-size: 1.1rem;
}

.analysis-item ul {
  margin: 0;
  padding-left: 20px;
  color: #ccc;
}

.analysis-item li {
  margin-bottom: 6px;
}

/* Risks Content */
.risks-content h3 {
  color: #fff;
  margin-bottom: 20px;
}

.risk-levels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.risk-level {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #333;
}

.risk-level.high {
  border-left: 4px solid #ff4444;
}

.risk-level.medium {
  border-left: 4px solid #ffaa00;
}

.risk-level.low {
  border-left: 4px solid #44aa44;
}

.risk-level h4 {
  color: #fff;
  margin-bottom: 12px;
  font-size: 1.1rem;
}

.risk-level ul {
  margin: 0;
  padding-left: 20px;
  color: #ccc;
}

.risk-level li {
  margin-bottom: 6px;
}

/* Review Actions */
.review-actions {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #333;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
}

.action-buttons button {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: linear-gradient(135deg, #007acc 0%, #005a9e 100%);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #005a9e 0%, #004080 100%);
  transform: translateY(-1px);
}

.btn-warning {
  background: linear-gradient(135deg, #ffaa00 0%, #ff8800 100%);
  color: #fff;
}

.btn-warning:hover:not(:disabled) {
  background: linear-gradient(135deg, #ff8800 0%, #ff6600 100%);
  transform: translateY(-1px);
}

.btn-secondary {
  background: #555;
  color: #ccc;
}

.btn-secondary:hover:not(:disabled) {
  background: #666;
  color: #fff;
}

.action-descriptions {
  display: flex;
  justify-content: space-around;
  gap: 20px;
  text-align: center;
}

.action-desc {
  color: #888;
  font-size: 0.8rem;
  line-height: 1.4;
}

.action-desc strong {
  color: #ccc;
}

/* Responsive Design */
@media (max-width: 768px) {
  .task-review-modal {
    width: 98%;
    max-height: 95vh;
  }
  
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .review-tabs {
    flex-direction: column;
  }
  
  .tab-button {
    border-radius: 6px;
    border-bottom: none;
  }
  
  .analysis-grid {
    grid-template-columns: 1fr;
  }
  
  .risk-levels {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .action-descriptions {
    flex-direction: column;
    gap: 12px;
  }
}
```

### 3. Update TaskCreationService with Review Logic
**File**: `frontend/src/application/services/TaskCreationService.jsx`

**Additions**:
```jsx
// Add to existing class

/**
 * Handle plan review and decision
 * @param {string} workflowId - Workflow ID
 * @param {string} decision - User decision (split/execute/modify)
 * @param {Object} reviewData - Review data
 * @returns {Promise<Object>} Decision result
 */
async handlePlanReview(workflowId, decision, reviewData) {
  try {
    logger.log('[TaskCreationService] Handling plan review decision:', { workflowId, decision });

    switch (decision) {
      case 'split':
        return await this.splitPlanIntoTasks(workflowId, reviewData);
      
      case 'execute':
        return await this.executePlan(workflowId, reviewData);
      
      case 'modify':
        return await this.modifyPlan(workflowId, reviewData);
      
      default:
        throw new Error(`Unknown decision: ${decision}`);
    }

  } catch (error) {
    logger.error('[TaskCreationService] Plan review handling failed:', error);
    throw error;
  }
}

/**
 * Split plan into individual tasks
 * @param {string} workflowId - Workflow ID
 * @param {Object} reviewData - Review data
 * @returns {Promise<Object>} Split result
 */
async splitPlanIntoTasks(workflowId, reviewData) {
  try {
    logger.log('[TaskCreationService] Splitting plan into tasks:', workflowId);

    // Parse plan and extract phases
    const phases = this.parsePlanPhases(reviewData.plan);
    
    // Create individual tasks for each phase
    const tasks = [];
    for (const phase of phases) {
      const taskData = {
        title: phase.title,
        description: phase.description,
        type: reviewData.taskData.type,
        category: reviewData.taskData.category,
        priority: reviewData.taskData.priority,
        status: 'pending',
        source_type: 'ai_generated',
        source_path: reviewData.sourcePath,
        metadata: {
          ...reviewData.taskData,
          phase: phase.number,
          totalPhases: phases.length,
          originalWorkflowId: workflowId,
          estimated_hours: phase.estimatedHours
        }
      };

      // Create task in database
      const result = await this.workflowApi.createTask(taskData);
      tasks.push(result);
    }

    this.updateWorkflowProgress(workflowId, {
      status: 'split_completed',
      step: 'tasks_created',
      progress: 80,
      tasksCreated: tasks.length,
      message: `Plan split into ${tasks.length} individual tasks`
    });

    return {
      success: true,
      tasksCreated: tasks.length,
      tasks: tasks
    };

  } catch (error) {
    logger.error('[TaskCreationService] Failed to split plan:', error);
    throw error;
  }
}

/**
 * Execute the complete plan
 * @param {string} workflowId - Workflow ID
 * @param {Object} reviewData - Review data
 * @returns {Promise<Object>} Execution result
 */
async executePlan(workflowId, reviewData) {
  try {
    logger.log('[TaskCreationService] Executing complete plan:', workflowId);

    // Create main task
    const taskData = {
      title: reviewData.taskData.description,
      description: reviewData.plan,
      type: reviewData.taskData.type,
      category: reviewData.taskData.category,
      priority: reviewData.taskData.priority,
      status: 'pending',
      source_type: 'ai_generated',
      source_path: reviewData.sourcePath,
      metadata: {
        ...reviewData.taskData,
        originalWorkflowId: workflowId,
        automation_level: 'full_auto',
        confirmation_required: false
      }
    };

    // Create task in database
    const task = await this.workflowApi.createTask(taskData);

    // Start execution
    const executionResult = await this.workflowApi.executeTask(task.id, {
      createGitBranch: true,
      branchName: `feature/${task.id}-${Date.now()}`,
      autoExecute: true
    });

    this.updateWorkflowProgress(workflowId, {
      status: 'execution_started',
      step: 'task_executing',
      progress: 90,
      taskId: task.id,
      message: 'Task execution started'
    });

    return {
      success: true,
      taskId: task.id,
      executionResult
    };

  } catch (error) {
    logger.error('[TaskCreationService] Failed to execute plan:', error);
    throw error;
  }
}

/**
 * Modify the plan based on feedback
 * @param {string} workflowId - Workflow ID
 * @param {Object} reviewData - Review data
 * @returns {Promise<Object>} Modification result
 */
async modifyPlan(workflowId, reviewData) {
  try {
    logger.log('[TaskCreationService] Modifying plan:', workflowId);

    // Generate modification prompt
    const modificationPrompt = this.generateModificationPrompt(reviewData);
    
    // Send modification request to IDE
    const result = await this.sendToIDEChat(modificationPrompt);
    
    this.updateWorkflowProgress(workflowId, {
      status: 'modifying',
      step: 'plan_modification',
      progress: 50,
      message: 'Plan modification requested'
    });

    return {
      success: true,
      modificationRequested: true,
      result
    };

  } catch (error) {
    logger.error('[TaskCreationService] Failed to modify plan:', error);
    throw error;
  }
}

/**
 * Parse plan phases from markdown
 * @param {string} plan - Plan markdown content
 * @returns {Array} Parsed phases
 */
parsePlanPhases(plan) {
  const phases = [];
  const lines = plan.split('\n');
  let currentPhase = null;

  for (const line of lines) {
    const phaseMatch = line.match(/^#### Phase (\d+):\s*(.+?)\s*\((\d+)\s*hours?\)/i);
    if (phaseMatch) {
      if (currentPhase) {
        phases.push(currentPhase);
      }
      currentPhase = {
        number: parseInt(phaseMatch[1]),
        title: phaseMatch[2].trim(),
        estimatedHours: parseInt(phaseMatch[3]),
        description: '',
        tasks: []
      };
    } else if (currentPhase && line.trim()) {
      currentPhase.description += line.trim() + ' ';
    }
  }

  if (currentPhase) {
    phases.push(currentPhase);
  }

  return phases;
}

/**
 * Generate modification prompt
 * @param {Object} reviewData - Review data
 * @returns {string} Modification prompt
 */
generateModificationPrompt(reviewData) {
  return `# Plan Modification Request

## Original Task
${reviewData.taskData.description}

## Current Plan
${reviewData.plan}

## Modification Request
Please modify the above plan based on the following feedback:

1. **Review the implementation phases** and adjust if needed
2. **Update time estimates** if they seem inaccurate
3. **Refine the technical approach** if there are better alternatives
4. **Add missing considerations** for dependencies or risks
5. **Improve the testing strategy** if needed

Please provide the updated plan in the same format as the original, maintaining the task-create.md framework structure.

**Important**: This modified plan will be used for execution, so ensure all changes are well-considered and complete.`;
}
```

### 4. Update TaskWorkflowRepository with Task Operations
**File**: `frontend/src/infrastructure/repositories/TaskWorkflowRepository.jsx`

**Additions**:
```jsx
// Add to existing class

/**
 * Create task in database
 * @param {Object} taskData - Task data
 * @returns {Promise<Object>} Created task
 */
async createTask(taskData) {
  try {
    const response = await apiCall('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to create task');
    }

    return response.data;

  } catch (error) {
    logger.error('[TaskWorkflowRepository] Failed to create task:', error);
    throw error;
  }
}

/**
 * Execute task
 * @param {string} taskId - Task ID
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Execution result
 */
async executeTask(taskId, options = {}) {
  try {
    const response = await apiCall(`/api/tasks/${taskId}/execute`, {
      method: 'POST',
      body: JSON.stringify(options)
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to execute task');
    }

    return response.data;

  } catch (error) {
    logger.error('[TaskWorkflowRepository] Failed to execute task:', error);
    throw error;
  }
}

/**
 * Get task details
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} Task details
 */
async getTaskDetails(taskId) {
  try {
    const response = await apiCall(`/api/tasks/${taskId}`);
    return response;

  } catch (error) {
    logger.error('[TaskWorkflowRepository] Failed to get task details:', error);
    throw error;
  }
}

/**
 * Update task
 * @param {string} taskId - Task ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} Updated task
 */
async updateTask(taskId, updateData) {
  try {
    const response = await apiCall(`/api/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to update task');
    }

    return response.data;

  } catch (error) {
    logger.error('[TaskWorkflowRepository] Failed to update task:', error);
    throw error;
  }
}
```

### 5. Update TaskCreationModal with Review Integration
**File**: `frontend/src/presentation/components/chat/modal/TaskCreationModal.jsx`

**Updates**:
```jsx
// Add import
import TaskReviewModal from './TaskReviewModal.jsx';

// Add state
const [showReview, setShowReview] = useState(false);
const [reviewData, setReviewData] = useState(null);

// Add review handlers
const handleWorkflowComplete = (result) => {
  if (result.plan) {
    // Show review modal
    setReviewData({
      plan: result.plan,
      taskData: formData,
      sourcePath: result.sourcePath,
      workflowId: workflowId
    });
    setShowReview(true);
  } else {
    // No plan generated, close modal
    setShowProgress(false);
    setWorkflowId(null);
    onClose();
  }
};

const handleReviewClose = () => {
  setShowReview(false);
  setReviewData(null);
  setShowProgress(false);
  setWorkflowId(null);
  onClose();
};

const handleSplitTasks = async (data) => {
  try {
    await taskCreationService.handlePlanReview(workflowId, 'split', data);
    
    if (eventBus) {
      eventBus.emit('show-notification', {
        type: 'success',
        message: 'Plan split into individual tasks successfully!'
      });
    }
    
    handleReviewClose();
  } catch (error) {
    console.error('Error splitting tasks:', error);
    if (eventBus) {
      eventBus.emit('show-notification', {
        type: 'error',
        message: 'Failed to split tasks: ' + error.message
      });
    }
  }
};

const handleExecutePlan = async (data) => {
  try {
    await taskCreationService.handlePlanReview(workflowId, 'execute', data);
    
    if (eventBus) {
      eventBus.emit('show-notification', {
        type: 'success',
        message: 'Plan execution started successfully!'
      });
    }
    
    handleReviewClose();
  } catch (error) {
    console.error('Error executing plan:', error);
    if (eventBus) {
      eventBus.emit('show-notification', {
        type: 'error',
        message: 'Failed to execute plan: ' + error.message
      });
    }
  }
};

const handleModifyPlan = async (data) => {
  try {
    await taskCreationService.handlePlanReview(workflowId, 'modify', data);
    
    if (eventBus) {
      eventBus.emit('show-notification', {
        type: 'info',
        message: 'Plan modification requested. Check the chat for updates.'
      });
    }
    
    // Don't close modal, let user see the modification process
  } catch (error) {
    console.error('Error modifying plan:', error);
    if (eventBus) {
      eventBus.emit('show-notification', {
        type: 'error',
        message: 'Failed to modify plan: ' + error.message
      });
    }
  }
};

// Update render to include review modal
return (
  <>
    <div className="task-creation-modal-overlay" onClick={handleClose}>
      {/* ... existing modal content ... */}
    </div>
    
    <TaskReviewModal
      isOpen={showReview}
      onClose={handleReviewClose}
      reviewData={reviewData}
      onSplit={handleSplitTasks}
      onExecute={handleExecutePlan}
      onModify={handleModifyPlan}
    />
  </>
);
```

## Success Criteria
- [ ] Review modal displays plan content correctly
- [ ] Plan summary shows accurate information
- [ ] Split functionality creates individual tasks
- [ ] Execute functionality starts task execution
- [ ] Modify functionality requests plan changes
- [ ] All decisions are properly handled
- [ ] Database integration works correctly
- [ ] Progress tracking continues through review
- [ ] Error handling works for all scenarios
- [ ] UI/UX is intuitive and responsive

## Testing Checklist
- [ ] Test plan parsing and display
- [ ] Test split decision flow
- [ ] Test execute decision flow
- [ ] Test modify decision flow
- [ ] Test database task creation
- [ ] Test task execution
- [ ] Test error scenarios
- [ ] Test responsive design
- [ ] Test accessibility features
- [ ] Test integration with existing systems 