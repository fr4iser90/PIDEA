import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import '@/css/components/analysis/analysis-status.css';

const AnalysisStatus = ({ status, onStartAnalysis, loading }) => {
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    let interval;
    
    if (status?.isRunning && status?.estimatedTimeRemaining) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev && prev > 0) {
            return prev - 1;
          }
          return null;
        });
      }, 1000);
    } else {
      setTimeRemaining(null);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status?.isRunning, status?.estimatedTimeRemaining]);

  const formatTimeRemaining = (seconds) => {
    if (!seconds) return '';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const getStatusIcon = () => {
    if (!status) return '⏸️';
    if (status.isRunning) return '🔄';
    if (status.errors && status.errors.length > 0) return '❌';
    return '✅';
  };

  const getStatusColor = () => {
    if (!status) return 'neutral';
    if (status.isRunning) return 'running';
    if (status.errors && status.errors.length > 0) return 'error';
    return 'success';
  };

  const getStatusText = () => {
    if (!status) return 'No status available';
    if (status.isRunning) return 'Analysis in progress';
    if (status.errors && status.errors.length > 0) return 'Analysis failed';
    return 'Analysis ready';
  };

  const getProgressPercentage = () => {
    // DEBUG: Log what we're getting
    console.log('🔍 [DEBUG] getProgressPercentage:', {
      status: status,
      progress: status?.progress,
      isRunning: status?.isRunning
    });
    
    if (!status || !status.progress) {
      console.log('❌ [DEBUG] No status or progress, returning 0');
      return 0;
    }
    
    const percentage = Math.min(Math.max(status.progress, 0), 100);
    console.log('✅ [DEBUG] Returning percentage:', percentage);
    return percentage;
  };

  const renderProgressBar = () => {
    if (!status?.isRunning) return null;

    const percentage = getProgressPercentage();
    
    return (
      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <div className="progress-text">
          {percentage}% complete
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    if (!status?.currentStep) return null;

    return (
      <div className="current-step">
        <span className="step-label">Current step:</span>
        <span className="step-text">{status.currentStep}</span>
      </div>
    );
  };

  const renderTimeRemaining = () => {
    if (!status?.isRunning || !timeRemaining) return null;

    return (
      <div className="time-remaining">
        <span className="time-label">Estimated time remaining:</span>
        <span className="time-text">{formatTimeRemaining(timeRemaining)}</span>
      </div>
    );
  };

  const renderErrors = () => {
    if (!status?.errors || status.errors.length === 0) return null;

    return (
      <div className="status-errors">
        <div className="errors-header">
          <span className="error-icon">⚠️</span>
          <span className="error-label">Errors ({status.errors.length})</span>
        </div>
        <div className="errors-list">
          {status.errors.map((error, index) => (
            <div key={index} className="error-item">
              {error}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLastUpdate = () => {
    if (!status?.lastUpdate) return null;

    return (
      <div className="last-update">
        <span className="update-label">Last update:</span>
        <span className="update-text">
          {new Date(status.lastUpdate).toLocaleTimeString()}
        </span>
      </div>
    );
  };

  return (
    <div className={`analysis-status ${getStatusColor()}`}>
      <div className="status-header">
        <div className="status-indicator">
          <span className="status-icon">{getStatusIcon()}</span>
          <span className="status-text">{getStatusText()}</span>
        </div>
        
        {/* Start Analysis button removed - replaced with IndividualAnalysisButtons */}
      </div>

      {status?.isRunning && (
        <div className="status-details">
          {renderProgressBar()}
          {renderCurrentStep()}
          {renderTimeRemaining()}
          {renderLastUpdate()}
        </div>
      )}

      {renderErrors()}

      {!status && (
        <div className="no-status-message">
          <p>No analysis status available. Start an analysis to see progress.</p>
        </div>
      )}
    </div>
  );
};

export default AnalysisStatus; 