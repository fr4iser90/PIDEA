import React, { useState, useEffect } from 'react';
import TaskCreationForm from './TaskCreationForm';
import TaskWorkflowProgress from './TaskWorkflowProgress';
import TaskReviewModal from './TaskReviewModal';
import TaskCreationService from '@/application/services/TaskCreationService';
import TaskReviewService from '@/application/services/TaskReviewService';
import '@/scss/components/_task-creation-modal.scss';;

const TaskCreationModal = ({ isOpen, onClose, onTaskCreated }) => {
  const [currentStep, setCurrentStep] = useState('form'); // 'form', 'create', 'review', 'progress', 'complete'
  const [formData, setFormData] = useState({});
  const [validation, setValidation] = useState({});
  const [workflowId, setWorkflowId] = useState(null);
  const [progress, setProgress] = useState({});
  const [errors, setErrors] = useState([]);
  const [reviewData, setReviewData] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [createdTask, setCreatedTask] = useState(null);
  const [creationMode, setCreationMode] = useState('normal'); // 'normal' or 'advanced'

  const taskCreationService = new TaskCreationService();
  const taskReviewService = new TaskReviewService();

  useEffect(() => {
    if (isOpen) {
      resetModal();
    }
  }, [isOpen]);

  const resetModal = () => {
    setCurrentStep('form');
    setFormData({});
    setValidation({});
    setWorkflowId(null);
    setProgress({});
    setErrors([]);
    setReviewData(null);
    setIsReviewModalOpen(false);
    setIsGeneratingPlan(false);
    setCreatedTask(null);
    setCreationMode('normal');
  };

  const handleFormSubmit = async (data) => {
    try {
      setFormData(data);
      setCurrentStep('create');
      setIsGeneratingPlan(true);

      let createdTaskResult;
      
      if (creationMode === 'advanced') {
        // Advanced Mode: Advanced workflow with comprehensive analysis
        createdTaskResult = await taskCreationService.startAdvancedTaskCreation(data);
      } else {
        // Normal Mode: Standard workflow with basic configuration
        createdTaskResult = await taskCreationService.startTaskCreationWorkflow(data);
      }
      
      setCreatedTask(createdTaskResult);
      
      // STEP 2: REVIEW - Generate review plan using TaskReviewService with task-review.md
      const reviewPlan = await taskReviewService.generateReviewPlan(data);
      setReviewData(reviewPlan);
      
      setCurrentStep('review');
      setIsReviewModalOpen(true);
      setIsGeneratingPlan(false);
    } catch (error) {
      console.error('Error in task creation workflow:', error);
      setErrors([error.message]);
      setIsGeneratingPlan(false);
    }
  };

  const handleReviewSplit = async (reviewData) => {
    try {
      const subtasks = await taskReviewService.splitTask(reviewData);
      
      // Close review modal and show subtasks
      setIsReviewModalOpen(false);
      setCurrentStep('complete');
      
      // Notify parent component about subtasks
      if (onTaskCreated) {
        onTaskCreated({
          type: 'split',
          subtasks: subtasks,
          originalTask: reviewData.taskData
        });
      }
      
      onClose();
    } catch (error) {
      console.error('Error splitting task:', error);
      setErrors([error.message]);
    }
  };

  const handleReviewExecute = async (reviewData) => {
    try {
      setIsReviewModalOpen(false);
      setCurrentStep('progress');
      
      // Execute the task
      const result = await taskReviewService.executeTask(reviewData);
      setWorkflowId(result.workflowId);
      
      // Start progress tracking
      startProgressTracking(result.workflowId);
      
      // Notify parent component
      if (onTaskCreated) {
        onTaskCreated({
          type: 'execute',
          workflowId: result.workflowId,
          taskData: reviewData.taskData
        });
      }
    } catch (error) {
      console.error('Error executing task:', error);
      setErrors([error.message]);
      setCurrentStep('review');
      setIsReviewModalOpen(true);
    }
  };

  const handleReviewModify = async (reviewData) => {
    try {
      // For now, we'll show a simple prompt for modification
      const modificationRequest = prompt('Please describe what you would like to modify in the plan:');
      
      if (modificationRequest) {
        const updatedReviewData = await taskReviewService.modifyPlan(reviewData, modificationRequest);
        setReviewData(updatedReviewData);
      }
    } catch (error) {
      console.error('Error modifying plan:', error);
      setErrors([error.message]);
    }
  };

  const startProgressTracking = (workflowId) => {
    const checkProgress = async () => {
      try {
        const status = await taskReviewService.getWorkflowStatus(workflowId);
        setProgress(status);
        
        if (status.status === 'completed' || status.status === 'failed') {
          setCurrentStep('complete');
          return;
        }
        
        // Continue polling
        setTimeout(checkProgress, 2000);
      } catch (error) {
        console.error('Error checking progress:', error);
        setErrors([error.message]);
      }
    };
    
    checkProgress();
  };

  const handleClose = () => {
    if (currentStep === 'progress' && workflowId) {
      // Ask for confirmation before closing during execution
      if (confirm('Task execution is in progress. Are you sure you want to close?')) {
        taskReviewService.cancelWorkflow(workflowId);
      } else {
        return;
      }
    }
    
    onClose();
  };

  const handleReviewModalClose = () => {
    setIsReviewModalOpen(false);
    setCurrentStep('form');
  };

  const renderContent = () => {
    switch (currentStep) {
      case 'form':
        return (
          <TaskCreationForm
            onSubmit={handleFormSubmit}
            onCancel={handleClose}
            isGeneratingPlan={isGeneratingPlan}
            errors={errors}
            creationMode={creationMode}
          />
        );
      
      case 'progress':
        return (
          <TaskWorkflowProgress
            workflowId={workflowId}
            progress={progress}
            onClose={handleClose}
            errors={errors}
          />
        );
      
      case 'complete':
        return (
          <div className="modal-complete">
            <div className="complete-content">
              <h2>✅ Task Processing Complete</h2>
              <p>Your task has been processed successfully.</p>
              <button className="btn-primary" onClick={handleClose}>
                Close
              </button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="task-create-modal-overlay" onClick={handleClose}>
        <div className="task-create-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>🚀 Create New Task</h2>
            <button className="modal-close-btn" onClick={handleClose}>×</button>
          </div>
          
          {/* Creation Mode Toggle */}
          <div className="creation-mode-toggle">
            <label className="toggle-label">
              <span className="toggle-text">Mode:</span>
              <div className="toggle-switch">
              <input
                type="radio"
                name="creationMode"
                value="normal"
                checked={creationMode === 'normal'}
                onChange={(e) => setCreationMode(e.target.value)}
                id="mode-normal"
              />
              <label htmlFor="mode-normal" className="toggle-option">
                📋 Normal Creation
              </label>

              <input
                type="radio"
                name="creationMode"
                value="advanced"
                checked={creationMode === 'advanced'}
                onChange={(e) => setCreationMode(e.target.value)}
                id="mode-advanced"
              />
              <label htmlFor="mode-advanced" className="toggle-option">
                🔬 Advanced Creation
              </label>
              </div>
            </label>
            <div className="mode-description">
            {creationMode === 'normal'
              ? 'AI analyzes your description and automatically determines title, category, priority, and creates files.'
              : 'You manually configure all task details including title, category, priority, and type.'
            }
            </div>
          </div>
          
          <div className="modal-content">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <TaskReviewModal
        isOpen={isReviewModalOpen}
        onClose={handleReviewModalClose}
        reviewData={reviewData}
        onSplit={handleReviewSplit}
        onExecute={handleReviewExecute}
        onModify={handleReviewModify}
      />
    </>
  );
};

export default TaskCreationModal; 