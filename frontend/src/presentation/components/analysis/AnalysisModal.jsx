import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository';
import '@/css/components/analysis/analysis-modal.css';

const AnalysisModal = ({ analysis, onClose, projectId }) => {
  const [analysisContent, setAnalysisContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('content');

  const apiRepository = new APIChatRepository();

  useEffect(() => {
    if (analysis && analysis.filename) {
      loadAnalysisContent();
    }
  }, [analysis]);

  const loadAnalysisContent = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentProjectId = projectId || await apiRepository.getCurrentProjectId();
      const response = await apiRepository.getAnalysisFile(currentProjectId, analysis.filename);
      
      if (response.success) {
        setAnalysisContent(response.data);
      } else {
        setError('Failed to load analysis content');
      }
    } catch (err) {
      setError('Error loading analysis content: ' + err.message);
      logger.error('Analysis content loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getAnalysisIcon = (type) => {
    switch (type) {
      case 'analysis':
        return '📈';
      case 'report':
        return '📄';
      case 'scan':
        return '🔍';
      case 'audit':
        return '🔒';
      default:
        return '📋';
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="modal-loading">
          <div className="loading-spinner"></div>
          <p>Loading analysis content...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="modal-error">
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
          <button onClick={loadAnalysisContent} className="btn-retry">
            Retry
          </button>
        </div>
      );
    }

    if (!analysisContent) {
      return (
        <div className="no-content">
          <p>No content available for this analysis.</p>
        </div>
      );
    }

    if (typeof analysisContent === 'string') {
      // Markdown or plain text content
      return (
        <div className="content-text">
          <pre className="content-pre">{analysisContent}</pre>
        </div>
      );
    } else {
      // JSON content
      return (
        <div className="content-json">
          <pre className="json-pre">{JSON.stringify(analysisContent, null, 2)}</pre>
        </div>
      );
    }
  };

  const renderMetadata = () => {
    return (
      <div className="analysis-metadata">
        <div className="metadata-grid">
          <div className="metadata-item">
            <span className="metadata-label">Filename:</span>
            <span className="metadata-value">{analysis.filename || 'Unknown'}</span>
          </div>
          
          <div className="metadata-item">
            <span className="metadata-label">Type:</span>
            <span className="metadata-value">
              <span className="type-icon">{getAnalysisIcon(analysis.type)}</span>
              {analysis.type === 'analysis' 
                ? `${analysis.analysisType || 'Analysis'}`
                : analysis.type || 'Unknown'
              }
            </span>
          </div>
          
          <div className="metadata-item">
            <span className="metadata-label">Size:</span>
            <span className="metadata-value">{formatFileSize(analysis.size || 0)}</span>
          </div>
          
          <div className="metadata-item">
            <span className="metadata-label">Created:</span>
            <span className="metadata-value">{formatTimestamp(analysis.timestamp)}</span>
          </div>
        </div>
      </div>
    );
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="analysis-modal-backdrop" onClick={handleBackdropClick}>
      <div className="analysis-modal">
        <div className="modal-header">
          <div className="modal-title">
            <span className="title-icon">{getAnalysisIcon(analysis.type)}</span>
            <h3>Analysis Details</h3>
          </div>
          <button onClick={onClose} className="btn-close" title="Close modal">
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="modal-tabs">
            <button
              onClick={() => setActiveTab('content')}
              className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`}
            >
              📄 Content
            </button>
            <button
              onClick={() => setActiveTab('metadata')}
              className={`tab-btn ${activeTab === 'metadata' ? 'active' : ''}`}
            >
              ℹ️ Details
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'content' ? (
              <div className="content-tab">
                {renderContent()}
              </div>
            ) : (
              <div className="metadata-tab">
                {renderMetadata()}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-close-modal">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal; 