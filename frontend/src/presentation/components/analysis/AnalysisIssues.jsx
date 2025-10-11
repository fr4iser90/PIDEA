import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useMemo } from 'react';
import '@/scss/components/_analysis-issues.scss';;

const AnalysisIssues = ({ issues, loading, error, category = null }) => {
  const [activeView, setActiveView] = useState('all');
  const [sortBy, setSortBy] = useState('severity');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterScanner, setFilterScanner] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIssues, setExpandedIssues] = useState(new Set());

  // ✅ NEW: Process issues from orchestrator data structure
  const processedIssues = useMemo(() => {
    if (!issues) return [];

    // If issues is already an array (from orchestrator), use it directly
    if (Array.isArray(issues)) {
      return issues.map(issue => ({
        ...issue,
        source: issue.source || 'orchestrator',
        category: issue.category || category || 'general',
        severity: issue.severity || issue.level || 'medium',
        type: issue.type || 'issue',
        scanner: issue.scanner || 'orchestrator'
      }));
    }

    // If issues is an object with category data (legacy support)
    if (typeof issues === 'object') {
      const allIssues = [];
      
      // Process category-specific issues
      const categories = ['security', 'performance', 'architecture', 'code-quality', 'dependencies', 'manifest', 'tech-stack'];
      
      categories.forEach(cat => {
        if (issues[cat] && Array.isArray(issues[cat])) {
          allIssues.push(...issues[cat].map(issue => ({
            ...issue,
            source: issue.source || cat,
            category: issue.category || cat,
            severity: issue.severity || issue.level || 'medium',
            type: issue.type || `${cat}-issue`,
            scanner: issue.scanner || `${cat}-orchestrator`
          })));
        }
      });

      // Process legacy issues structure
      if (issues.issues && Array.isArray(issues.issues)) {
        allIssues.push(...issues.issues.map(issue => ({
          ...issue,
          source: issue.source || 'legacy',
          category: issue.category || category || 'general',
          severity: issue.severity || issue.level || 'medium',
          type: issue.type || 'legacy-issue',
          scanner: issue.scanner || 'legacy-analyzer'
        })));
      }

      return allIssues;
    }

    return [];
  }, [issues, category]);

  // Filter and sort issues
  const filteredAndSortedIssues = useMemo(() => {
    let filtered = processedIssues;

    // Filter by severity
    if (filterSeverity !== 'all') {
      filtered = filtered.filter(issue => 
        issue.severity?.toLowerCase() === filterSeverity.toLowerCase()
      );
    }

    // Filter by source
    if (filterSource !== 'all') {
      filtered = filtered.filter(issue => 
        issue.source?.toLowerCase() === filterSource.toLowerCase()
      );
    }

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(issue => 
        issue.category?.toLowerCase() === filterCategory.toLowerCase()
      );
    }

    // Filter by scanner
    if (filterScanner !== 'all') {
      filtered = filtered.filter(issue => 
        issue.scanner?.toLowerCase() === filterScanner.toLowerCase()
      );
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(issue => 
        issue.title?.toLowerCase().includes(term) ||
        issue.description?.toLowerCase().includes(term) ||
        issue.message?.toLowerCase().includes(term) ||
        issue.file?.toLowerCase().includes(term)
      );
    }

    // Sort issues
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'severity':
          aValue = getSeverityWeight(a.severity);
          bValue = getSeverityWeight(b.severity);
          break;
        case 'title':
          aValue = a.title || '';
          bValue = b.title || '';
          break;
        case 'file':
          aValue = a.file || '';
          bValue = b.file || '';
          break;
        case 'category':
          aValue = a.category || '';
          bValue = b.category || '';
          break;
        default:
          aValue = a[sortBy] || '';
          bValue = b[sortBy] || '';
      }

      if (sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [processedIssues, filterSeverity, filterSource, filterCategory, filterScanner, searchTerm, sortBy, sortOrder]);

  const getSeverityWeight = (severity) => {
    const weights = { critical: 4, high: 3, medium: 2, low: 1 };
    return weights[severity?.toLowerCase()] || 0;
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'unknown';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return 'ℹ️';
      case 'low': return '💡';
      default: return '❓';
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
          <span className="error-icon">❌</span>
          <span>Error loading issues: {error}</span>
        </div>
      </div>
    );
  }

  if (!processedIssues || processedIssues.length === 0) {
    return (
      <div className="analysis-issues no-data">
        <div className="no-data-icon">✅</div>
        <h4>No Issues Found</h4>
        <p>Great! No issues were detected in the analysis.</p>
        <p>Your code appears to be following best practices.</p>
      </div>
    );
  }

  // Get unique values for filters
  const severities = [...new Set(processedIssues.map(issue => issue.severity))].filter(Boolean);
  const sources = [...new Set(processedIssues.map(issue => issue.source))].filter(Boolean);
  const categories = [...new Set(processedIssues.map(issue => issue.category))].filter(Boolean);
  const scanners = [...new Set(processedIssues.map(issue => issue.scanner))].filter(Boolean);

  return (
    <div className="analysis-issues">
      {/* Header */}
      <div className="issues-header">
        <h4>Analysis Issues ({filteredAndSortedIssues.length})</h4>
        <div className="issues-summary">
          <span className="total-issues">Total: {processedIssues.length}</span>
          <span className="filtered-issues">Showing: {filteredAndSortedIssues.length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="issues-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search issues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Severities</option>
            {severities.map(severity => (
              <option key={severity} value={severity}>
                {severity.charAt(0).toUpperCase() + severity.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="severity">Sort by Severity</option>
            <option value="title">Sort by Title</option>
            <option value="file">Sort by File</option>
            <option value="category">Sort by Category</option>
          </select>
        </div>

        <div className="filter-group">
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="sort-button"
          >
            {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      </div>

      {/* Issues List */}
      <div className="issues-list">
        {filteredAndSortedIssues.map((issue, index) => (
          <div
            key={issue.id || index}
            className={`issue-item ${getSeverityColor(issue.severity)}`}
          >
            <div className="issue-header" onClick={() => toggleIssueExpansion(issue.id || index)}>
              <div className="issue-severity">
                <span className="severity-icon">{getSeverityIcon(issue.severity)}</span>
                <span className={`severity-badge ${getSeverityColor(issue.severity)}`}>
                  {issue.severity}
                </span>
              </div>
              
              <div className="issue-title">
                {issue.title || issue.message || `Issue ${index + 1}`}
              </div>
              
              <div className="issue-meta">
                {issue.category && (
                  <span className="issue-category">{issue.category}</span>
                )}
                {issue.file && (
                  <span className="issue-file">📁 {issue.file}</span>
                )}
              </div>
              
              <div className="issue-toggle">
                {expandedIssues.has(issue.id || index) ? '▼' : '▶'}
              </div>
            </div>

            {expandedIssues.has(issue.id || index) && (
              <div className="issue-details">
                {issue.description && (
                  <div className="issue-description">
                    <strong>Description:</strong> {issue.description}
                  </div>
                )}
                
                <div className="issue-info">
                  {issue.file && issue.line && (
                    <div className="issue-location">
                      <strong>Location:</strong> {issue.file}:{issue.line}
                    </div>
                  )}
                  
                  {issue.rule && (
                    <div className="issue-rule">
                      <strong>Rule:</strong> {issue.rule}
                    </div>
                  )}
                  
                  {issue.scanner && (
                    <div className="issue-scanner">
                      <strong>Scanner:</strong> {issue.scanner}
                    </div>
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
            )}
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredAndSortedIssues.length === 0 && processedIssues.length > 0 && (
        <div className="no-results">
          <p>No issues match your current filters.</p>
          <button 
            onClick={() => {
              setFilterSeverity('all');
              setFilterCategory('all');
              setFilterSource('all');
              setFilterScanner('all');
              setSearchTerm('');
            }}
            className="clear-filters-btn"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default AnalysisIssues; 