import React, { useState, useEffect } from 'react';
import AnalysisStep from './steps/AnalysisStep.jsx';
import PlanningStep from './steps/PlanningStep.jsx';
import ExecutionStep from './steps/ExecutionStep.jsx';
import TrackingStep from './steps/TrackingStep.jsx';
import '@css/framework/documentation-modal.css';

function DocumentationFrameworkModal({ isOpen, onClose, framework }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [createdTasks, setCreatedTasks] = useState([]);
  const [workflowData, setWorkflowData] = useState({
    projectPath: null,
    analysisComplete: false,
    tasksCreated: false,
    totalTasks: 0,
    completedTasks: 0
  });

  useEffect(() => {
    if (isOpen) {
      // Reset workflow when modal opens
      setCurrentStep(1);
      setAnalysisResults(null);
      setCreatedTasks([]);
      setWorkflowData({
        projectPath: null,
        analysisComplete: false,
        tasksCreated: false,
        totalTasks: 0,
        completedTasks: 0
      });
    }
  }, [isOpen]);

  const handleAnalysisComplete = (results) => {
    setAnalysisResults(results);
    setWorkflowData(prev => ({
      ...prev,
      analysisComplete: true
    }));
    setCurrentStep(2);
  };

  const handleTasksCreated = (tasks) => {
    setCreatedTasks(tasks);
    setWorkflowData(prev => ({
      ...prev,
      tasksCreated: true,
      totalTasks: tasks.length
    }));
    setCurrentStep(3);
  };

  const handleTaskProgress = (completedCount) => {
    setWorkflowData(prev => ({
      ...prev,
      completedTasks: completedCount
    }));
    
    // Auto-advance to tracking step if all tasks completed
    if (completedCount === workflowData.totalTasks && completedCount > 0) {
      setCurrentStep(4);
    }
  };

  const renderStepIndicator = () => (
    <div className="doc-framework-steps">
      {[1, 2, 3, 4].map(step => (
        <div
          key={step}
          className={`step-indicator ${currentStep === step ? 'active' : ''} ${currentStep > step ? 'completed' : ''}`}
          onClick={() => step < currentStep && setCurrentStep(step)}
        >
          <div className="step-number">{step}</div>
          <div className="step-label">
            {step === 1 && '📊 Analysis'}
            {step === 2 && '📋 Planning'}
            {step === 3 && '⚡ Execution'}
            {step === 4 && '📊 Tracking'}
          </div>
        </div>
      ))}
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <AnalysisStep
            framework={framework}
            onAnalysisComplete={handleAnalysisComplete}
            workflowData={workflowData}
            setWorkflowData={setWorkflowData}
          />
        );
      case 2:
        return (
          <PlanningStep
            analysisResults={analysisResults}
            onTasksCreated={handleTasksCreated}
            workflowData={workflowData}
          />
        );
      case 3:
        return (
          <ExecutionStep
            tasks={createdTasks}
            onTaskProgress={handleTaskProgress}
            workflowData={workflowData}
          />
        );
      case 4:
        return (
          <TrackingStep
            tasks={createdTasks}
            analysisResults={analysisResults}
            workflowData={workflowData}
          />
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    const titles = {
      1: 'Project Documentation Analysis',
      2: 'Documentation Improvement Planning',
      3: 'Task Execution & Content Creation',
      4: 'Progress Tracking & Quality Metrics'
    };
    return titles[currentStep] || 'Documentation Framework';
  };

  const getStepDescription = () => {
    const descriptions = {
      1: 'Analyze your current documentation coverage and identify gaps',
      2: 'Review analysis results and create prioritized improvement tasks',
      3: 'Execute documentation tasks with AI assistance and track progress',
      4: 'Monitor overall progress and quality metrics for your documentation'
    };
    return descriptions[currentStep] || '';
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="doc-framework-modal" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title">
            <div className="framework-icon">📚</div>
            <div>
              <h2>Documentation Framework</h2>
              <p className="framework-subtitle">
                Systematic documentation creation and improvement
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Current Step Header */}
        <div className="step-header">
          <h3>{getStepTitle()}</h3>
          <p>{getStepDescription()}</p>
        </div>

        {/* Progress Overview */}
        <div className="progress-overview">
          <div className="progress-item">
            <span className="label">Analysis:</span>
            <span className={`status ${workflowData.analysisComplete ? 'complete' : 'pending'}`}>
              {workflowData.analysisComplete ? '✅ Complete' : '⏳ Pending'}
            </span>
          </div>
          <div className="progress-item">
            <span className="label">Tasks Created:</span>
            <span className={`status ${workflowData.tasksCreated ? 'complete' : 'pending'}`}>
              {workflowData.tasksCreated ? `✅ ${workflowData.totalTasks} tasks` : '⏳ Pending'}
            </span>
          </div>
          <div className="progress-item">
            <span className="label">Execution:</span>
            <span className="status">
              {workflowData.totalTasks > 0 
                ? `🔄 ${workflowData.completedTasks}/${workflowData.totalTasks}`
                : '⏳ Pending'
              }
            </span>
          </div>
        </div>

        {/* Current Step Content */}
        <div className="step-content">
          {renderCurrentStep()}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <div className="footer-info">
            Step {currentStep} of 4 • Documentation Framework Workflow
          </div>
          <div className="footer-actions">
            {currentStep > 1 && (
              <button 
                className="btn-secondary"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                ← Previous
              </button>
            )}
            {currentStep < 4 && workflowData.analysisComplete && currentStep === 1 && (
              <button 
                className="btn-primary"
                onClick={() => setCurrentStep(2)}
              >
                Next → Planning
              </button>
            )}
            {currentStep < 4 && workflowData.tasksCreated && currentStep === 2 && (
              <button 
                className="btn-primary"
                onClick={() => setCurrentStep(3)}
              >
                Next → Execution
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentationFrameworkModal; 