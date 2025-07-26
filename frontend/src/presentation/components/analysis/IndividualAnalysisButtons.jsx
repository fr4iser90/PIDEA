import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository';
import '@/css/components/analysis/individual-analysis-buttons.css';

const IndividualAnalysisButtons = ({ projectId = null, eventBus = null, onAnalysisComplete = null }) => {
  const [activeSteps, setActiveSteps] = useState(new Map());
  const [stepProgress, setStepProgress] = useState(new Map());
  const [loadingStates, setLoadingStates] = useState(new Map());
  const [errorStates, setErrorStates] = useState(new Map());
  const [runAllLoading, setRunAllLoading] = useState(false);
  const [runAllProgress, setRunAllProgress] = useState(0);

  const apiRepository = new APIChatRepository();

  // Core Analysis Types - Only the main analysis steps
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
    },
    {
      key: 'tech-stack',
      label: 'Tech Stack',
      icon: '🛠️',
      description: 'Analyze technologies, frameworks, and tools',
      color: 'orange'
    },
    {
      key: 'manifest',
      label: 'Manifest',
      icon: '📋',
      description: 'Analyze project configuration and manifest files',
      color: 'teal'
    },
    {
      key: 'dependencies',
      label: 'Dependencies',
      icon: '📦',
      description: 'Analyze package dependencies and versions',
      color: 'indigo'
    },
  ];

  // Entferne recommendationTypes und deren Verwendung
  // const recommendationTypes = [...];
  // const allAnalysisTypes = [...analysisTypes, ...recommendationTypes];
  const allAnalysisTypes = analysisTypes;

  useEffect(() => {
    loadActiveSteps();
    setupEventListeners();
    
    // Poll for active steps every 30 seconds (reduced from 5 seconds)
    const interval = setInterval(loadActiveSteps, 30000);
    
    return () => {
      clearInterval(interval);
      if (eventBus) {
        eventBus.off('step:created');
        eventBus.off('step:started');
        eventBus.off('step:progress');
        eventBus.off('step:completed');
        eventBus.off('step:failed');
        eventBus.off('step:cancelled');
        eventBus.off('analysis:completed');
        eventBus.off('analysis-completed');
      }
    };
  }, [projectId]);

  const setupEventListeners = () => {
    if (!eventBus) return;

    // Listen for analysis step events
    eventBus.on('step:created', handleStepCreated);
    eventBus.on('step:started', handleStepStarted);
    eventBus.on('step:progress', handleStepProgress);
    eventBus.on('step:completed', handleStepCompleted);
    eventBus.on('step:failed', handleStepFailed);
    eventBus.on('step:cancelled', handleStepCancelled);
    
    // Listen for general analysis completion events
    eventBus.on('analysis:completed', handleAnalysisCompleted);
    eventBus.on('analysis-completed', handleAnalysisCompleted);

    return () => {
      eventBus.off('step:created', handleStepCreated);
      eventBus.off('step:started', handleStepStarted);
      eventBus.off('step:progress', handleStepProgress);
      eventBus.off('step:completed', handleStepCompleted);
      eventBus.off('step:failed', handleStepFailed);
      eventBus.off('step:cancelled', handleStepCancelled);
      
      eventBus.off('analysis:completed', handleAnalysisCompleted);
      eventBus.off('analysis-completed', handleAnalysisCompleted);
    };
  };

  const loadActiveSteps = async () => {
    try {
      const currentProjectId = projectId || await apiRepository.getCurrentProjectId();
      // Use the analysis status endpoint instead of non-existent active steps endpoint
      const response = await apiRepository.getAnalysisStatus(currentProjectId);
      
      if (response.success && response.data) {
        // Check if any analysis is currently running
        if (response.data.isRunning) {
          // Create a mock active step for the running analysis
          const mockStep = {
            id: 'current-analysis',
            analysisType: response.data.currentStep || 'analysis',
            status: 'running',
            progress: response.data.progress || 0,
            projectId: currentProjectId
          };
          setActiveSteps(new Map([[mockStep.analysisType, mockStep]]));
          setStepProgress(new Map([[mockStep.id, mockStep.progress]]));
        } else {
          setActiveSteps(new Map());
          setStepProgress(new Map());
        }
      }
    } catch (error) {
      logger.error('Failed to load active steps:', error);
      setActiveSteps(new Map());
      setStepProgress(new Map());
    }
  };

  const handleStepCreated = (data) => {
    logger.info('Step created:', data);
  };

  const handleStepStarted = (data) => {
    logger.info('Step started:', data);
    setActiveSteps(prev => new Map(prev.set(data.analysisType, data)));
    setLoadingStates(prev => new Map(prev.set(data.analysisType, false)));
  };

  const handleStepProgress = (data) => {
    logger.info('Step progress:', data);
    setStepProgress(prev => new Map(prev.set(data.id, data.progress)));
  };

  const handleStepCompleted = (data) => {
    logger.info('Step completed:', data);
    setActiveSteps(prev => {
      const newMap = new Map(prev);
      newMap.delete(data.analysisType);
      return newMap;
    });
    setStepProgress(prev => {
      const newMap = new Map(prev);
      newMap.delete(data.id);
      return newMap;
    });
    setLoadingStates(prev => new Map(prev.set(data.analysisType, false)));
    setErrorStates(prev => new Map(prev.set(data.analysisType, null)));
    
    // Show success notification
    if (onAnalysisComplete) {
      onAnalysisComplete(data);
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
    setErrorStates(prev => new Map(prev.set(data.analysisType, data.error || 'Analysis failed')));
  };

  const handleStepCancelled = (data) => {
    logger.info('Step cancelled:', data);
    setActiveSteps(prev => {
      const newMap = new Map(prev);
      newMap.delete(data.analysisType);
      return newMap;
    });
    setLoadingStates(prev => new Map(prev.set(data.analysisType, false)));
    setErrorStates(prev => new Map(prev.set(data.analysisType, null)));
  };

  const handleAnalysisCompleted = (data) => {
    logger.info('Analysis completed:', data);
    // Clear any remaining active steps
    setActiveSteps(new Map());
    setStepProgress(new Map());
    setLoadingStates(new Map());
    setErrorStates(new Map());
    
    if (onAnalysisComplete) {
      onAnalysisComplete(data);
    }
  };

  const handleStartAnalysis = async (analysisType) => {
    try {
      setLoadingStates(prev => new Map(prev.set(analysisType, true)));
      setErrorStates(prev => new Map(prev.set(analysisType, null)));
      
      const currentProjectId = projectId || await apiRepository.getCurrentProjectId();
      
      // Call the analysis endpoint
      const response = await apiRepository.startAnalysis(currentProjectId, analysisType);
      
      if (response.success) {
        logger.info(`Started ${analysisType} analysis:`, response);
        
        // Create a mock step for immediate UI feedback
        const mockStep = {
          id: `analysis-${Date.now()}`,
          analysisType: analysisType,
          status: 'running',
          progress: 0,
          projectId: currentProjectId
        };
        
        setActiveSteps(prev => new Map(prev.set(analysisType, mockStep)));
        setStepProgress(prev => new Map(prev.set(mockStep.id, 0)));
      } else {
        throw new Error(response.error || 'Failed to start analysis');
      }
    } catch (error) {
      logger.error(`Failed to start ${analysisType} analysis:`, error);
      setErrorStates(prev => new Map(prev.set(analysisType, error.message)));
    } finally {
      setLoadingStates(prev => new Map(prev.set(analysisType, false)));
    }
  };

  const handleCancelAnalysis = async (analysisType) => {
    try {
      const currentProjectId = projectId || await apiRepository.getCurrentProjectId();
      
      // Call the cancel endpoint
      const response = await apiRepository.cancelAnalysis(currentProjectId, analysisType);
      
      if (response.success) {
        logger.info(`Cancelled ${analysisType} analysis:`, response);
        
        setActiveSteps(prev => {
          const newMap = new Map(prev);
          newMap.delete(analysisType);
          return newMap;
        });
        setStepProgress(prev => {
          const newMap = new Map(prev);
          // Remove all progress entries for this analysis type
          for (const [key] of newMap) {
            if (key.includes(analysisType)) {
              newMap.delete(key);
            }
          }
          return newMap;
        });
      } else {
        throw new Error(response.error || 'Failed to cancel analysis');
      }
    } catch (error) {
      logger.error(`Failed to cancel ${analysisType} analysis:`, error);
      setErrorStates(prev => new Map(prev.set(analysisType, error.message)));
    }
  };

  const handleRetryAnalysis = async (analysisType) => {
    setErrorStates(prev => new Map(prev.set(analysisType, null)));
    await handleStartAnalysis(analysisType);
  };

  const handleRunAllAnalysis = async () => {
    try {
      setRunAllLoading(true);
      setRunAllProgress(0);
      
      const currentProjectId = projectId || await apiRepository.getCurrentProjectId();
      
      // Start all core analysis types sequentially
      for (let i = 0; i < analysisTypes.length; i++) {
        const analysisType = analysisTypes[i];
        const progress = (i / analysisTypes.length) * 100;
        setRunAllProgress(progress);
        
        try {
          await handleStartAnalysis(analysisType.key);
          // Wait a bit between analyses to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          logger.error(`Failed to start ${analysisType.key} in run-all:`, error);
          // Continue with next analysis even if one fails
        }
      }
      
      setRunAllProgress(100);
    } catch (error) {
      logger.error('Failed to run all analyses:', error);
    } finally {
      setRunAllLoading(false);
      setRunAllProgress(0);
    }
  };

  const getStepStatus = (analysisType) => {
    const activeStep = activeSteps.get(analysisType);
    const isLoading = loadingStates.get(analysisType);
    const error = errorStates.get(analysisType);
    
    if (activeStep) {
      const progress = stepProgress.get(activeStep.id) || 0;
      return {
        isActive: true,
        isLoading: false,
        progress: progress,
        status: activeStep.status,
        error: null
      };
    }
    
    return {
      isActive: false,
      isLoading: isLoading || false,
      progress: 0,
      status: 'idle',
      error: error
    };
  };

  const renderAnalysisButton = (analysisType) => {
    const status = getStepStatus(analysisType.key);
    const isActive = status.isActive;
    const isLoading = status.isLoading;
    const error = status.error;
    
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
        
        {/* Run All Analysis Button */}
        <div className="run-all-section">
          <button
            onClick={handleRunAllAnalysis}
            disabled={runAllLoading || activeSteps.size > 0}
            className="btn-run-all-analysis"
            title="Run all analysis types sequentially"
          >
            {runAllLoading ? (
              <>
                <div className="loading-spinner"></div>
                Starting All Analyses... ({Math.round(runAllProgress)}%)
              </>
            ) : (
              <>
                🚀 Run All Analysis
              </>
            )}
          </button>
          
          {runAllLoading && (
            <div className="run-all-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${runAllProgress}%` }}
                ></div>
              </div>
              <span className="progress-text">{Math.round(runAllProgress)}%</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="analysis-buttons-grid">
        {allAnalysisTypes.map(renderAnalysisButton)}
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