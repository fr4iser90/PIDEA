import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository';
import '@/css/components/analysis/individual-analysis-buttons.css';

const IndividualAnalysisButtons = ({ projectId = null, eventBus = null, onAnalysisComplete = null }) => {
  const [activeSteps, setActiveSteps] = useState(new Map());
  const [stepProgress, setStepProgress] = useState(new Map());
  const [loadingStates, setLoadingStates] = useState(new Map());
  const [errorStates, setErrorStates] = useState(new Map());

  const apiRepository = new APIChatRepository();

  const analysisTypes = [
    {
      key: 'code-quality',
      label: 'Code Quality',
      icon: '🔍',
      description: 'Analyze code quality, complexity, and best practices',
      color: 'blue'
    },
    {
      key: 'security',
      label: 'Security',
      icon: '🔒',
      description: 'Scan for security vulnerabilities and issues',
      color: 'red'
    },
    {
      key: 'performance',
      label: 'Performance',
      icon: '⚡',
      description: 'Analyze performance bottlenecks and optimizations',
      color: 'green'
    },
    {
      key: 'architecture',
      label: 'Architecture',
      icon: '🏗️',
      description: 'Review architectural patterns and dependencies',
      color: 'purple'
    }
  ];

  useEffect(() => {
    loadActiveSteps();
    setupEventListeners();
    
    // Poll for active steps every 5 seconds
    const interval = setInterval(loadActiveSteps, 5000);
    
    return () => {
      clearInterval(interval);
      if (eventBus) {
        eventBus.off('step:created');
        eventBus.off('step:started');
        eventBus.off('step:progress');
        eventBus.off('step:completed');
        eventBus.off('step:failed');
        eventBus.off('step:cancelled');
      }
    };
  }, [projectId]);

  const setupEventListeners = () => {
    if (!eventBus) return;

    eventBus.on('step:created', handleStepCreated);
    eventBus.on('step:started', handleStepStarted);
    eventBus.on('step:progress', handleStepProgress);
    eventBus.on('step:completed', handleStepCompleted);
    eventBus.on('step:failed', handleStepFailed);
    eventBus.on('step:cancelled', handleStepCancelled);
  };

  const loadActiveSteps = async () => {
    try {
      const currentProjectId = projectId || await apiRepository.getCurrentProjectId();
      const response = await apiRepository.getActiveAnalysisSteps(currentProjectId);
      
      if (response.success && response.data) {
        const newActiveSteps = new Map();
        const newStepProgress = new Map();
        
        response.data.forEach(step => {
          newActiveSteps.set(step.analysisType, step);
          newStepProgress.set(step.id, step.progress);
        });
        
        setActiveSteps(newActiveSteps);
        setStepProgress(newStepProgress);
      }
    } catch (error) {
      logger.error('Failed to load active steps:', error);
    }
  };

  const handleStepCreated = (data) => {
    logger.info('Step created:', data);
    setActiveSteps(prev => new Map(prev.set(data.analysisType, data)));
  };

  const handleStepStarted = (data) => {
    logger.info('Step started:', data);
    setActiveSteps(prev => new Map(prev.set(data.analysisType, data)));
    setLoadingStates(prev => new Map(prev.set(data.analysisType, true)));
  };

  const handleStepProgress = (data) => {
    logger.info('Step progress:', data);
    setStepProgress(prev => new Map(prev.set(data.stepId, data.progress)));
  };

  const handleStepCompleted = (data) => {
    logger.info('Step completed:', data);
    setActiveSteps(prev => {
      const newMap = new Map(prev);
      newMap.delete(data.analysisType);
      return newMap;
    });
    setLoadingStates(prev => new Map(prev.set(data.analysisType, false)));
    setStepProgress(prev => {
      const newMap = new Map(prev);
      newMap.delete(data.stepId);
      return newMap;
    });
    
    // Trigger data refresh
    if (onAnalysisComplete) {
      onAnalysisComplete(data.analysisType);
    }
  };

  const handleStepFailed = (data) => {
    logger.error('Step failed:', data);
    setActiveSteps(prev => {
      const newMap = new Map(prev);
      newMap.delete(data.analysisType);
      return newMap;
    });
    setLoadingStates(prev => new Map(prev.set(data.analysisType, false)));
    setErrorStates(prev => new Map(prev.set(data.analysisType, data.error)));
  };

  const handleStepCancelled = (data) => {
    logger.info('Step cancelled:', data);
    setActiveSteps(prev => {
      const newMap = new Map(prev);
      newMap.delete(data.analysisType);
      return newMap;
    });
    setLoadingStates(prev => new Map(prev.set(data.analysisType, false)));
  };

  const handleStartAnalysis = async (analysisType) => {
    try {
      setLoadingStates(prev => new Map(prev.set(analysisType, true)));
      setErrorStates(prev => new Map(prev.set(analysisType, null)));
      
      const currentProjectId = projectId || await apiRepository.getCurrentProjectId();
      
      // Get workspace path from active IDE
      const ideList = await apiRepository.getIDEs();
      let projectPath = null;
      
      if (ideList.success && ideList.data) {
        const activeIDE = ideList.data.find(ide => ide.active);
        if (activeIDE && activeIDE.workspacePath) {
          projectPath = activeIDE.workspacePath;
        }
      }
      
      const response = await apiRepository.executeAnalysisStep(currentProjectId, analysisType, {
        projectPath,
        timeout: 300000 // 5 minutes
      });
      
      if (response.success) {
        logger.info(`${analysisType} analysis started:`, response);
      } else {
        throw new Error(response.error || 'Failed to start analysis');
      }
    } catch (error) {
      logger.error(`Failed to start ${analysisType} analysis:`, error);
      setErrorStates(prev => new Map(prev.set(analysisType, error.message)));
      setLoadingStates(prev => new Map(prev.set(analysisType, false)));
    }
  };

  const handleCancelAnalysis = async (analysisType) => {
    try {
      const step = activeSteps.get(analysisType);
      if (!step) return;
      
      const currentProjectId = projectId || await apiRepository.getCurrentProjectId();
      const response = await apiRepository.cancelAnalysisStep(step.id, currentProjectId);
      
      if (response.success) {
        logger.info(`${analysisType} analysis cancelled`);
      } else {
        throw new Error(response.error || 'Failed to cancel analysis');
      }
    } catch (error) {
      logger.error(`Failed to cancel ${analysisType} analysis:`, error);
    }
  };

  const handleRetryAnalysis = async (analysisType) => {
    try {
      const step = activeSteps.get(analysisType);
      if (!step) return;
      
      const currentProjectId = projectId || await apiRepository.getCurrentProjectId();
      const response = await apiRepository.retryAnalysisStep(step.id, currentProjectId);
      
      if (response.success) {
        logger.info(`${analysisType} analysis retry started`);
        setErrorStates(prev => new Map(prev.set(analysisType, null)));
      } else {
        throw new Error(response.error || 'Failed to retry analysis');
      }
    } catch (error) {
      logger.error(`Failed to retry ${analysisType} analysis:`, error);
    }
  };

  const getStepStatus = (analysisType) => {
    const step = activeSteps.get(analysisType);
    const isLoading = loadingStates.get(analysisType);
    const error = errorStates.get(analysisType);
    
    if (step) {
      return {
        status: step.status,
        progress: stepProgress.get(step.id) || 0,
        stepId: step.id
      };
    }
    
    if (isLoading) {
      return { status: 'loading', progress: 0 };
    }
    
    if (error) {
      return { status: 'error', error };
    }
    
    return { status: 'idle', progress: 0 };
  };

  const renderAnalysisButton = (analysisType) => {
    const status = getStepStatus(analysisType.key);
    const isActive = status.status === 'running' || status.status === 'pending';
    const isLoading = loadingStates.get(analysisType.key);
    const error = errorStates.get(analysisType.key);
    
    return (
      <div key={analysisType.key} className={`analysis-button-container ${analysisType.color}`}>
        <div className="analysis-button-header">
          <span className="analysis-icon">{analysisType.icon}</span>
          <span className="analysis-label">{analysisType.label}</span>
        </div>
        
        <div className="analysis-button-content">
          <p className="analysis-description">{analysisType.description}</p>
          
          {isActive && (
            <div className="analysis-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${status.progress}%` }}
                ></div>
              </div>
              <span className="progress-text">{status.progress}%</span>
            </div>
          )}
          
          {error && (
            <div className="analysis-error">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{error}</span>
            </div>
          )}
          
          <div className="analysis-actions">
            {!isActive && !isLoading && (
              <button
                onClick={() => handleStartAnalysis(analysisType.key)}
                className="btn-start-analysis"
                disabled={isLoading}
              >
                {isLoading ? 'Starting...' : 'Start Analysis'}
              </button>
            )}
            
            {isActive && (
              <button
                onClick={() => handleCancelAnalysis(analysisType.key)}
                className="btn-cancel-analysis"
              >
                Cancel
              </button>
            )}
            
            {error && (
              <button
                onClick={() => handleRetryAnalysis(analysisType.key)}
                className="btn-retry-analysis"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="individual-analysis-buttons">
      <div className="analysis-buttons-header">
        <h3>🔬 Individual Analysis</h3>
        <p>Run specific analysis types to get detailed insights</p>
      </div>
      
      <div className="analysis-buttons-grid">
        {analysisTypes.map(renderAnalysisButton)}
      </div>
      
      {activeSteps.size > 0 && (
        <div className="active-analyses-summary">
          <h4>🔄 Active Analyses ({activeSteps.size})</h4>
          <div className="active-steps-list">
            {Array.from(activeSteps.values()).map(step => (
              <div key={step.id} className="active-step-item">
                <span className="step-type">{step.analysisType}</span>
                <span className="step-status">{step.status}</span>
                <span className="step-progress">{stepProgress.get(step.id) || 0}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IndividualAnalysisButtons; 