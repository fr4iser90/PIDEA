import React, { useState, useEffect } from 'react';
import TaskCreationForm from './TaskCreationForm';
import TaskWorkflowProgress from './TaskWorkflowProgress';
import TaskReviewModal from './TaskReviewModal';
import TaskReviewService from '@/application/services/TaskReviewService';
import '@/css/modal/task-creation-modal.css';

const TaskCreationModal = ({ isOpen, onClose, onTaskCreated }) => {
  const [currentStep, setCurrentStep] = useState('form'); // 'form', 'review', 'progress', 'complete'
  const [formData, setFormData] = useState({});
  const [validation, setValidation] = useState({});
  const [workflowId, setWorkflowId] = useState(null);
  const [progress, setProgress] = useState({});
  const [errors, setErrors] = useState([]);
  const [reviewData, setReviewData] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

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
  };

  const handleFormSubmit = async (data) => {
    try {
      setFormData(data);
      setCurrentStep('review');
      setIsGeneratingPlan(true);

      // Generate review plan
      const reviewPlan = await taskReviewService.generateReviewPlan(data);
      setReviewData(reviewPlan);
      setIsReviewModalOpen(true);
      setIsGeneratingPlan(false);
    } catch (error) {
      console.error('Error generating review plan:', error);
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
      <div className="task-creation-modal-overlay" onClick={handleClose}>
        <div className="task-creation-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>🚀 Create New Task</h2>
            <button className="modal-close-btn" onClick={handleClose}>×</button>
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