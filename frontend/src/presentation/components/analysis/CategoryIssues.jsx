import React, { useState } from 'react';
import '@/scss/components/_category-issues.scss';;

const CategoryIssues = ({ data, category, categoryName, loading, onAnalysisSelect }) => {
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  if (loading) {
    return (
      <div className="category-issues loading">
        <div className="loading-spinner"></div>
        <p>Loading issues...</p>
      </div>
    );
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="category-issues no-data">
        <div className="no-data-icon">✅</div>
        <h4>No Issues Found</h4>
        <p>Great! No {categoryName.toLowerCase()} issues were detected.</p>
        <p>Your {categoryName.toLowerCase()} analysis shows good practices.</p>
      </div>
    );
  }

  // Filter issues based on severity and search term
  const filteredIssues = data.filter(issue => {
    const matchesSeverity = selectedSeverity === 'all' || 
                           issue.severity?.toLowerCase() === selectedSeverity.toLowerCase() ||
                           issue.level?.toLowerCase() === selectedSeverity.toLowerCase();
    
    const matchesSearch = !searchTerm || 
                         issue.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         issue.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         issue.message?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSeverity && matchesSearch;
  });

  // Group issues by severity
  const issuesBySeverity = filteredIssues.reduce((acc, issue) => {
    const severity = issue.severity || issue.level || 'unknown';
    if (!acc[severity]) acc[severity] = [];
    acc[severity].push(issue);
    return acc;
  }, {});

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'error':
        return 'critical';
      case 'high':
      case 'warning':
        return 'high';
      case 'medium':
      case 'info':
        return 'medium';
      case 'low':
      case 'minor':
        return 'low';
      default:
        return 'unknown';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'error':
        return '🚨';
      case 'high':
      case 'warning':
        return '⚠️';
      case 'medium':
      case 'info':
        return 'ℹ️';
      case 'low':
      case 'minor':
        return '💡';
      default:
        return '❓';
    }
  };

  const handleIssueClick = (issue) => {
    onAnalysisSelect && onAnalysisSelect({
      type: 'issue',
      category: category,
      data: issue
    });
  };

  return (
    <div className="category-issues">
      {/* Header */}
      <div className="issues-header">
        <h4>{categoryName} Issues ({filteredIssues.length})</h4>
        <div className="issues-summary">
          <span className="total-issues">Total: {data.length}</span>
          <span className="filtered-issues">Showing: {filteredIssues.length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="issues-filters">
        <div className="search-filter">
          <input
            type="text"
            placeholder="Search issues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="severity-filter">
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="severity-select"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Issues List */}
      <div className="issues-list">
        {Object.entries(issuesBySeverity).map(([severity, issues]) => (
          <div key={severity} className={`severity-group ${getSeverityColor(severity)}`}>
            <div className="severity-header">
              <span className="severity-icon">{getSeverityIcon(severity)}</span>
              <span className="severity-name">{severity}</span>
              <span className="severity-count">({issues.length})</span>
            </div>
            
            <div className="severity-issues">
              {issues.map((issue, index) => (
                <div
                  key={index}
                  className="issue-item"
                  onClick={() => handleIssueClick(issue)}
                >
                  <div className="issue-header">
                    <div className="issue-title">
                      {issue.title || issue.message || issue.name || `Issue ${index + 1}`}
                    </div>
                    <div className="issue-severity">
                      <span className={`severity-badge ${getSeverityColor(severity)}`}>
                        {severity}
                      </span>
                    </div>
                  </div>
                  
                  {issue.description && (
                    <div className="issue-description">
                      {issue.description}
                    </div>
                  )}
                  
                  <div className="issue-meta">
                    {issue.file && (
                      <span className="issue-file">
                        📁 {issue.file}
                        {issue.line && `:${issue.line}`}
                      </span>
                    )}
                    
                    {issue.category && (
                      <span className="issue-category">
                        🏷️ {issue.category}
                      </span>
                    )}
                    
                    {issue.rule && (
                      <span className="issue-rule">
                        📋 {issue.rule}
                      </span>
                    )}
                  </div>
                  
                  {issue.suggestions && (
                    <div className="issue-suggestions">
                      <strong>Suggestions:</strong>
                      <ul>
                        {Array.isArray(issue.suggestions) 
                          ? issue.suggestions.map((suggestion, i) => (
                              <li key={i}>{suggestion}</li>
                            ))
                          : <li>{issue.suggestions}</li>
                        }
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredIssues.length === 0 && data.length > 0 && (
        <div className="no-results">
          <p>No issues match your current filters.</p>
          <button 
            onClick={() => {
              setSelectedSeverity('all');
              setSearchTerm('');
            }}
            className="clear-filters-btn"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Export Actions */}
      <div className="issues-actions">
        <button 
          className="action-button secondary"
          onClick={() => onAnalysisSelect && onAnalysisSelect({
            type: 'export-issues',
            category: category,
            data: filteredIssues
          })}
        >
          Export Issues
        </button>
        
        <button 
          className="action-button primary"
          onClick={() => onAnalysisSelect && onAnalysisSelect({
            type: 'all-issues',
            category: category,
            data: data
          })}
        >
          View All Issues
        </button>
      </div>
    </div>
  );
};

export default CategoryIssues; 