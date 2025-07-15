import { logger } from "@/infrastructure/logging/Logger";
import React, { useState } from 'react';
import '@/css/components/analysis/analysis-history.css';

const AnalysisHistory = ({ history, onAnalysisSelect, loading }) => {
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');



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

  const getAnalysisStatus = (analysis) => {
    // Determine status based on analysis properties
    if (analysis.error) return { status: 'failed', icon: '❌', color: 'error' };
    if (analysis.status === 'completed' || analysis.completed) return { status: 'completed', icon: '✅', color: 'success' };
    if (analysis.status === 'failed') return { status: 'failed', icon: '❌', color: 'error' };
    if (analysis.status === 'running' || analysis.progress > 0) return { status: 'running', icon: '🔄', color: 'warning' };
    return { status: 'pending', icon: '⏳', color: 'neutral' };
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const sortHistory = (history) => {
    if (!history) return [];
    
    // Ensure history is an array
    const historyArray = Array.isArray(history) ? history : [];
    
    return [...historyArray].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'timestamp':
          aValue = new Date(a.timestamp || a.created_at);
          bValue = new Date(b.timestamp || b.created_at);
          break;
        case 'size':
          aValue = a.size || 0;
          bValue = b.size || 0;
          break;
        case 'type':
          aValue = a.type || a.analysisType || '';
          bValue = b.type || b.analysisType || '';
          break;
        case 'filename':
          aValue = a.filename || a.id || '';
          bValue = b.filename || b.id || '';
          break;
        default:
          aValue = a[sortBy] || '';
          bValue = b[sortBy] || '';
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const filterHistory = (history) => {
    if (!history || !searchTerm) return history;
    
    // Ensure history is an array
    const historyArray = Array.isArray(history) ? history : [];
    
    const term = searchTerm.toLowerCase();
    return historyArray.filter(item => 
      (item.filename && item.filename.toLowerCase().includes(term)) ||
      (item.id && item.id.toLowerCase().includes(term)) ||
      (item.type && item.type.toLowerCase().includes(term)) ||
      (item.analysisType && item.analysisType.toLowerCase().includes(term))
    );
  };

  const renderSortButton = (field, label) => (
    <button
      onClick={() => handleSort(field)}
      className={`sort-btn ${sortBy === field ? 'active' : ''}`}
      title={`Sort by ${label}`}
    >
      {label}
      {sortBy === field && (
        <span className="sort-indicator">
          {sortOrder === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  );

  if (loading) {
    return (
      <div className="analysis-history loading">
        <div className="loading-spinner"></div>
        <p>Loading analysis history...</p>
      </div>
    );
  }

  const sortedAndFilteredHistory = filterHistory(sortHistory(history));

  return (
    <div className="analysis-history">
      <div className="history-header">
        <h3>📋 Analysis History</h3>
        <div className="history-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search analyses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="clear-search"
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="history-table">
        <div className="table-header">
          <div className="header-cell">
            {renderSortButton('timestamp', 'Date')}
          </div>
          <div className="header-cell">
            {renderSortButton('type', 'Type')}
          </div>
          <div className="header-cell">
            {renderSortButton('filename', 'File')}
          </div>
          <div className="header-cell">
            {renderSortButton('size', 'Size')}
          </div>
          <div className="header-cell">
            Status
          </div>
          <div className="header-cell">
            Actions
          </div>
        </div>

        <div className="table-body">
          {sortedAndFilteredHistory.length === 0 ? (
            <div className="no-data-message">
              {searchTerm ? (
                <p>No analyses found matching "{searchTerm}"</p>
              ) : (
                <p>No analysis history available. Run an analysis to see results here.</p>
              )}
            </div>
          ) : (
            sortedAndFilteredHistory.map((analysis, index) => {
              const status = getAnalysisStatus(analysis);
              
              return (
                <div
                  key={index}
                  className={`history-row ${status.color}`}
                  onClick={() => onAnalysisSelect(analysis)}
                >
                  <div className="cell timestamp">
                    <span className="timestamp-text">
                      {formatTimestamp(analysis.timestamp || analysis.created_at)}
                    </span>
                  </div>
                  
                  <div className="cell type">
                    <span className="type-icon">
                      {getAnalysisIcon(analysis.type || 'analysis')}
                    </span>
                    <span className="type-text">
                      {analysis.analysisType || analysis.type || 'Analysis'}
                    </span>
                  </div>
                  
                  <div className="cell filename">
                    <span className="filename-text" title={analysis.filename || analysis.id}>
                      {analysis.filename || analysis.id || 'Unknown'}
                    </span>
                  </div>
                  
                  <div className="cell size">
                    <span className="size-text">
                      {formatFileSize(analysis.size || 0)}
                    </span>
                  </div>
                  
                  <div className="cell status">
                    <span className={`status-badge ${status.color}`}>
                      <span className="status-icon">{status.icon}</span>
                      <span className="status-text">{status.status}</span>
                    </span>
                  </div>
                  
                  <div className="cell actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAnalysisSelect(analysis);
                      }}
                      className="btn-view"
                      title="View analysis details"
                    >
                      👁️
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {sortedAndFilteredHistory.length > 0 && (
        <div className="history-summary">
          <span className="summary-text">
            Showing {sortedAndFilteredHistory.length} of {history?.length || 0} analyses
          </span>
        </div>
      )}
    </div>
  );
};

export default AnalysisHistory; 