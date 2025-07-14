import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useMemo } from 'react';
import '@/css/components/analysis/analysis-issues.css';

const AnalysisIssues = ({ issues, loading, error }) => {
  const [sortBy, setSortBy] = useState('severity');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIssues, setExpandedIssues] = useState(new Set());

  // Process issues from backend data structure
  const processedIssues = useMemo(() => {
    if (!issues) return [];

    const allIssues = [];
    
    // Layer validation violations
    if (issues.layerValidation?.violations) {
      allIssues.push(...issues.layerValidation.violations.map(v => ({
        ...v,
        source: 'layer-validation',
        category: 'architecture',
        severity: v.severity || 'medium',
        type: 'layer-violation'
      })));
    }
    
    // Logic validation violations
    if (issues.logicValidation?.violations) {
      allIssues.push(...issues.logicValidation.violations.map(v => ({
        ...v,
        source: 'logic-validation',
        category: v.type === 'security-violation' ? 'security' : 'logic',
        severity: v.severity || 'medium',
        type: 'logic-violation'
      })));
    }
    
    // Code quality issues
    if (issues.standardAnalysis?.codeQuality?.issues) {
      allIssues.push(...issues.standardAnalysis.codeQuality.issues.map(i => ({
        ...i,
        source: 'code-quality',
        category: 'quality',
        severity: i.severity || 'low',
        type: 'code-quality'
      })));
    }

    // Security issues
    if (issues.standardAnalysis?.security?.vulnerabilities) {
      allIssues.push(...issues.standardAnalysis.security.vulnerabilities.map(v => ({
        ...v,
        source: 'security-scan',
        category: 'security',
        severity: v.severity || 'high',
        type: 'security-vulnerability'
      })));
    }

    return allIssues;
  }, [issues]);

  // Filter and sort issues
  const filteredAndSortedIssues = useMemo(() => {
    let filtered = processedIssues;

    // Apply severity filter
    if (filterSeverity !== 'all') {
      filtered = filtered.filter(issue => issue.severity === filterSeverity);
    }

    // Apply source filter
    if (filterSource !== 'all') {
      filtered = filtered.filter(issue => issue.source === filterSource);
    }

    // Apply category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(issue => issue.category === filterCategory);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(issue => 
        issue.message?.toLowerCase().includes(term) ||
        issue.file?.toLowerCase().includes(term) ||
        issue.type?.toLowerCase().includes(term)
      );
    }

    // Sort issues
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'severity':
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          aValue = severityOrder[a.severity] || 0;
          bValue = severityOrder[b.severity] || 0;
          break;
        case 'file':
          aValue = a.file || '';
          bValue = b.file || '';
          break;
        case 'type':
          aValue = a.type || '';
          bValue = b.type || '';
          break;
        case 'source':
          aValue = a.source || '';
          bValue = b.source || '';
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

    return filtered;
  }, [processedIssues, filterSeverity, filterSource, filterCategory, searchTerm, sortBy, sortOrder]);

  // Get unique values for filters
  const uniqueSeverities = useMemo(() => 
    [...new Set(processedIssues.map(i => i.severity))].filter(Boolean),
    [processedIssues]
  );

  const uniqueSources = useMemo(() => 
    [...new Set(processedIssues.map(i => i.source))].filter(Boolean),
    [processedIssues]
  );

  const uniqueCategories = useMemo(() => 
    [...new Set(processedIssues.map(i => i.category))].filter(Boolean),
    [processedIssues]
  );

  // Issue statistics
  const issueStats = useMemo(() => {
    const stats = {
      total: processedIssues.length,
      bySeverity: {},
      byCategory: {},
      bySource: {}
    };

    processedIssues.forEach(issue => {
      // Count by severity
      stats.bySeverity[issue.severity] = (stats.bySeverity[issue.severity] || 0) + 1;
      
      // Count by category
      stats.byCategory[issue.category] = (stats.byCategory[issue.category] || 0) + 1;
      
      // Count by source
      stats.bySource[issue.source] = (stats.bySource[issue.source] || 0) + 1;
    });

    return stats;
  }, [processedIssues]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const toggleIssueExpansion = (issueId) => {
    setExpandedIssues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(issueId)) {
        newSet.delete(issueId);
      } else {
        newSet.add(issueId);
      }
      return newSet;
    });
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'neutral';
    }
  };

  const getSourceIcon = (source) => {
    switch (source) {
      case 'layer-validation': return '🏗️';
      case 'logic-validation': return '🧠';
      case 'code-quality': return '📝';
      case 'security-scan': return '🔒';
      default: return '📋';
    }
  };

  const clearFilters = () => {
    setFilterSeverity('all');
    setFilterSource('all');
    setFilterCategory('all');
    setSearchTerm('');
  };

  const exportIssues = () => {
    const csvContent = [
      ['Severity', 'Type', 'File', 'Message', 'Source', 'Category'],
      ...filteredAndSortedIssues.map(issue => [
        issue.severity,
        issue.type,
        issue.file || '',
        issue.message || '',
        issue.source,
        issue.category
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-issues-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="analysis-issues loading">
        <div className="loading-spinner"></div>
        <p>Loading issues...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-issues error">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="analysis-issues">
      {/* Header */}
      <div className="issues-header">
        <div className="issues-title">
          <h3>⚠️ Issues</h3>
          <div className="issues-summary">
            <span className="summary-text">
              {issueStats.total > 0 
                ? `${issueStats.total} total issues found`
                : 'No issues found'
              }
            </span>
          </div>
        </div>
        <div className="issues-actions">
          <button 
            onClick={exportIssues}
            className="btn-export"
            disabled={filteredAndSortedIssues.length === 0}
            title="Export issues to CSV"
          >
            📊 Export
          </button>
        </div>
      </div>

      {/* Statistics */}
      {issueStats.total > 0 && (
        <div className="issues-statistics">
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Total Issues:</span>
              <span className="stat-value">{issueStats.total}</span>
            </div>
            {Object.entries(issueStats.bySeverity).map(([severity, count]) => (
              <div key={severity} className={`stat-item ${getSeverityColor(severity)}`}>
                <span className="stat-label">{severity}:</span>
                <span className="stat-value">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="issues-filters">
        <div className="filter-group">
          <label htmlFor="search-issues">Search:</label>
          <input
            id="search-issues"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search issues..."
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="severity-filter">Severity:</label>
          <select
            id="severity-filter"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Severities</option>
            {uniqueSeverities.map(severity => (
              <option key={severity} value={severity}>
                {severity.charAt(0).toUpperCase() + severity.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="source-filter">Source:</label>
          <select
            id="source-filter"
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Sources</option>
            {uniqueSources.map(source => (
              <option key={source} value={source}>
                {source.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="category-filter">Category:</label>
          <select
            id="category-filter"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            {uniqueCategories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <button onClick={clearFilters} className="btn-clear-filters">
          Clear Filters
        </button>
      </div>

      {/* Issues Table */}
      {filteredAndSortedIssues.length > 0 ? (
        <div className="issues-table-container">
          <table className="issues-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('severity')} className="sortable">
                  Severity {sortBy === 'severity' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('type')} className="sortable">
                  Type {sortBy === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('file')} className="sortable">
                  File {sortBy === 'file' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th>Message</th>
                <th onClick={() => handleSort('source')} className="sortable">
                  Source {sortBy === 'source' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedIssues.map((issue, index) => {
                const issueId = `${issue.source}-${index}`;
                const isExpanded = expandedIssues.has(issueId);
                
                return (
                  <React.Fragment key={issueId}>
                    <tr className={`issue-row ${getSeverityColor(issue.severity)}`}>
                      <td className="severity-cell">
                        <span className={`severity-badge ${getSeverityColor(issue.severity)}`}>
                          {getSeverityIcon(issue.severity)} {issue.severity}
                        </span>
                      </td>
                      <td className="type-cell">
                        <span className="issue-type">{issue.type}</span>
                      </td>
                      <td className="file-cell">
                        {issue.file ? (
                          <span className="file-path" title={issue.file}>
                            {issue.file.length > 50 ? issue.file.substring(0, 47) + '...' : issue.file}
                          </span>
                        ) : (
                          <span className="no-file">N/A</span>
                        )}
                      </td>
                      <td className="message-cell">
                        <span className="issue-message" title={issue.message}>
                          {issue.message?.length > 100 ? issue.message.substring(0, 97) + '...' : issue.message}
                        </span>
                      </td>
                      <td className="source-cell">
                        <span className="source-badge">
                          {getSourceIcon(issue.source)} {issue.source.replace('-', ' ')}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button
                          onClick={() => toggleIssueExpansion(issueId)}
                          className="btn-expand"
                          title={isExpanded ? 'Collapse details' : 'Expand details'}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="issue-details-row">
                        <td colSpan="6" className="details-cell">
                          <div className="issue-details">
                            <div className="detail-section">
                              <h4>Full Message</h4>
                              <p className="full-message">{issue.message}</p>
                            </div>
                            
                            {issue.file && (
                              <div className="detail-section">
                                <h4>File</h4>
                                <p className="file-path-full">{issue.file}</p>
                                {issue.line && (
                                  <p className="line-number">Line: {issue.line}</p>
                                )}
                              </div>
                            )}
                            
                            {issue.suggestion && (
                              <div className="detail-section">
                                <h4>Suggestion</h4>
                                <p className="suggestion">{issue.suggestion}</p>
                              </div>
                            )}
                            
                            <div className="detail-section">
                              <h4>Metadata</h4>
                              <div className="metadata-grid">
                                <div className="metadata-item">
                                  <span className="metadata-label">Category:</span>
                                  <span className="metadata-value">{issue.category}</span>
                                </div>
                                <div className="metadata-item">
                                  <span className="metadata-label">Source:</span>
                                  <span className="metadata-value">{issue.source}</span>
                                </div>
                                {issue.rule && (
                                  <div className="metadata-item">
                                    <span className="metadata-label">Rule:</span>
                                    <span className="metadata-value">{issue.rule}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-issues-message">
          <p>
            {processedIssues.length === 0 
              ? 'No issues found in the analysis.'
              : 'No issues match the current filters.'
            }
          </p>
        </div>
      )}

      {/* Summary */}
      {filteredAndSortedIssues.length > 0 && (
        <div className="issues-summary-footer">
          <span className="summary-text">
            Showing {filteredAndSortedIssues.length} of {processedIssues.length} issues
          </span>
        </div>
      )}
    </div>
  );
};

export default AnalysisIssues; 