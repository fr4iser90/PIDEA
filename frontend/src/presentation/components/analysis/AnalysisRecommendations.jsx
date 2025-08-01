import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useMemo } from 'react';
import '@/css/components/analysis/analysis-recommendations.css';

const AnalysisRecommendations = ({ recommendations, loading, error, category = null }) => {
  const [activeView, setActiveView] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedEffort, setSelectedEffort] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [sortBy, setSortBy] = useState('priority');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedRecommendations, setExpandedRecommendations] = useState(new Set());

  // ✅ NEW: Process recommendations from orchestrator data structure
  const processedRecommendations = useMemo(() => {
    if (!recommendations) return [];

    // If recommendations is already an array (from orchestrator), use it directly
    if (Array.isArray(recommendations)) {
      return recommendations.map(rec => ({
        ...rec,
        source: rec.source || 'orchestrator',
        category: rec.category || category || 'general',
        priority: rec.priority || rec.impact || 'medium',
        effort: rec.effort || 'medium',
        type: rec.type || 'recommendation',
        scanner: rec.scanner || 'orchestrator'
      }));
    }

    // If recommendations is an object with category data (legacy support)
    if (typeof recommendations === 'object') {
      const allRecommendations = [];
      
      // Process category-specific recommendations
      const categories = ['security', 'performance', 'architecture', 'code-quality', 'dependencies', 'manifest', 'tech-stack'];
      
      categories.forEach(cat => {
        if (recommendations[cat] && Array.isArray(recommendations[cat])) {
          allRecommendations.push(...recommendations[cat].map(rec => ({
            ...rec,
            source: rec.source || cat,
            category: rec.category || cat,
            priority: rec.priority || rec.impact || 'medium',
            effort: rec.effort || 'medium',
            type: rec.type || `${cat}-recommendation`,
            scanner: rec.scanner || `${cat}-orchestrator`
          })));
        }
      });

      // Process legacy recommendations structure
      if (recommendations.recommendations && Array.isArray(recommendations.recommendations)) {
        allRecommendations.push(...recommendations.recommendations.map(rec => ({
          ...rec,
          source: rec.source || 'legacy',
          category: rec.category || category || 'general',
          priority: rec.priority || rec.impact || 'medium',
          effort: rec.effort || 'medium',
          type: rec.type || 'legacy-recommendation',
          scanner: rec.scanner || 'legacy-analyzer'
        })));
      }

      return allRecommendations;
    }

    return [];
  }, [recommendations, category]);

  // Filter and sort recommendations
  const filteredAndSortedRecommendations = useMemo(() => {
    let filtered = processedRecommendations;

    // Filter by priority
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(rec => 
        rec.priority?.toLowerCase() === selectedPriority.toLowerCase()
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(rec => 
        rec.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by effort
    if (selectedEffort !== 'all') {
      filtered = filtered.filter(rec => 
        rec.effort?.toLowerCase() === selectedEffort.toLowerCase()
      );
    }

    // Filter by source
    if (selectedSource !== 'all') {
      filtered = filtered.filter(rec => 
        rec.source?.toLowerCase() === selectedSource.toLowerCase()
      );
    }

    // Filter by view
    if (activeView !== 'all') {
      filtered = filtered.filter(rec => {
        switch (activeView) {
          case 'security':
            return rec.category === 'security';
          case 'performance':
            return rec.category === 'performance';
          case 'architecture':
            return rec.category === 'architecture';
          case 'code-quality':
            return rec.category === 'code-quality';
          case 'dependencies':
            return rec.category === 'dependencies';
          case 'manifest':
            return rec.category === 'manifest';
          case 'tech-stack':
            return rec.category === 'tech-stack';
          default:
            return true;
        }
      });
    }

    // Sort recommendations
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'priority':
          aValue = getPriorityWeight(a.priority);
          bValue = getPriorityWeight(b.priority);
          break;
        case 'effort':
          aValue = getEffortWeight(a.effort);
          bValue = getEffortWeight(b.effort);
          break;
        case 'title':
          aValue = a.title || '';
          bValue = b.title || '';
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
  }, [processedRecommendations, selectedPriority, selectedCategory, selectedEffort, selectedSource, activeView, sortBy, sortOrder]);

  const getPriorityWeight = (priority) => {
    const weights = { critical: 4, high: 3, medium: 2, low: 1 };
    return weights[priority?.toLowerCase()] || 0;
  };

  const getEffortWeight = (effort) => {
    const weights = { low: 1, medium: 2, high: 3 };
    return weights[effort?.toLowerCase()] || 0;
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'medium';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
      case 'high':
        return '🚀';
      case 'medium':
        return '⚡';
      case 'low':
        return '💡';
      default:
        return '💡';
    }
  };

  const getEffortIcon = (effort) => {
    switch (effort?.toLowerCase()) {
      case 'low':
        return '⚡';
      case 'medium':
        return '🔧';
      case 'high':
        return '🏗️';
      default:
        return '🔧';
    }
  };

  const toggleRecommendationExpansion = (recId) => {
    setExpandedRecommendations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recId)) {
        newSet.delete(recId);
      } else {
        newSet.add(recId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="analysis-recommendations loading">
        <div className="loading-spinner"></div>
        <p>Loading recommendations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-recommendations error">
        <div className="error-message">
          <span className="error-icon">❌</span>
          <span>Error loading recommendations: {error}</span>
        </div>
      </div>
    );
  }

  if (!processedRecommendations || processedRecommendations.length === 0) {
    return (
      <div className="analysis-recommendations no-data">
        <div className="no-data-icon">💡</div>
        <h4>No Recommendations</h4>
        <p>No recommendations available for this analysis.</p>
        <p>This could mean your code is already optimized.</p>
      </div>
    );
  }

  // Get unique values for filters
  const priorities = [...new Set(processedRecommendations.map(rec => rec.priority))].filter(Boolean);
  const categories = [...new Set(processedRecommendations.map(rec => rec.category))].filter(Boolean);
  const efforts = [...new Set(processedRecommendations.map(rec => rec.effort))].filter(Boolean);
  const sources = [...new Set(processedRecommendations.map(rec => rec.source))].filter(Boolean);

  return (
    <div className="analysis-recommendations">
      {/* Header */}
      <div className="recommendations-header">
        <h4>Analysis Recommendations ({filteredAndSortedRecommendations.length})</h4>
        <div className="recommendations-summary">
          <span className="total-recommendations">Total: {processedRecommendations.length}</span>
          <span className="filtered-recommendations">Showing: {filteredAndSortedRecommendations.length}</span>
        </div>
      </div>

      {/* View Controls */}
      <div className="view-controls">
        <button
          onClick={() => setActiveView('all')}
          className={`view-btn ${activeView === 'all' ? 'active' : ''}`}
        >
          📋 All
        </button>
        <button
          onClick={() => setActiveView('security')}
          className={`view-btn ${activeView === 'security' ? 'active' : ''}`}
        >
          🔒 Security
        </button>
        <button
          onClick={() => setActiveView('performance')}
          className={`view-btn ${activeView === 'performance' ? 'active' : ''}`}
        >
          ⚡ Performance
        </button>
        <button
          onClick={() => setActiveView('architecture')}
          className={`view-btn ${activeView === 'architecture' ? 'active' : ''}`}
        >
          🏗️ Architecture
        </button>
        <button
          onClick={() => setActiveView('code-quality')}
          className={`view-btn ${activeView === 'code-quality' ? 'active' : ''}`}
        >
          📝 Code Quality
        </button>
        <button
          onClick={() => setActiveView('dependencies')}
          className={`view-btn ${activeView === 'dependencies' ? 'active' : ''}`}
        >
          📦 Dependencies
        </button>
        <button
          onClick={() => setActiveView('manifest')}
          className={`view-btn ${activeView === 'manifest' ? 'active' : ''}`}
        >
          📋 Manifest
        </button>
        <button
          onClick={() => setActiveView('tech-stack')}
          className={`view-btn ${activeView === 'tech-stack' ? 'active' : ''}`}
        >
          🛠️ Tech Stack
        </button>
      </div>

      {/* Filters */}
      <div className="recommendations-filters">
        <div className="filter-group">
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Priorities</option>
            {priorities.map(priority => (
              <option key={priority} value={priority}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select
            value={selectedEffort}
            onChange={(e) => setSelectedEffort(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Efforts</option>
            {efforts.map(effort => (
              <option key={effort} value={effort}>
                {effort.charAt(0).toUpperCase() + effort.slice(1)}
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
            <option value="priority">Sort by Priority</option>
            <option value="effort">Sort by Effort</option>
            <option value="title">Sort by Title</option>
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

      {/* Recommendations List */}
      <div className="recommendations-list">
        {filteredAndSortedRecommendations.map((rec, index) => (
          <div
            key={rec.id || index}
            className={`recommendation-item ${getPriorityColor(rec.priority)}`}
          >
            <div className="recommendation-header" onClick={() => toggleRecommendationExpansion(rec.id || index)}>
              <div className="recommendation-priority">
                <span className="priority-icon">{getPriorityIcon(rec.priority)}</span>
                <span className={`priority-badge ${getPriorityColor(rec.priority)}`}>
                  {rec.priority}
                </span>
              </div>
              
              <div className="recommendation-title">
                {rec.title || rec.suggestion || `Recommendation ${index + 1}`}
              </div>
              
              <div className="recommendation-meta">
                {rec.category && (
                  <span className="recommendation-category">{rec.category}</span>
                )}
                {rec.effort && (
                  <span className="recommendation-effort">
                    {getEffortIcon(rec.effort)} {rec.effort}
                  </span>
                )}
              </div>
              
              <div className="recommendation-toggle">
                {expandedRecommendations.has(rec.id || index) ? '▼' : '▶'}
              </div>
            </div>

            {expandedRecommendations.has(rec.id || index) && (
              <div className="recommendation-details">
                {rec.description && (
                  <div className="recommendation-description">
                    <strong>Description:</strong> {rec.description}
                  </div>
                )}
                
                {rec.suggestion && rec.suggestion !== rec.title && (
                  <div className="recommendation-suggestion">
                    <strong>Suggestion:</strong> {rec.suggestion}
                  </div>
                )}
                
                <div className="recommendation-info">
                  {rec.impact && (
                    <div className="recommendation-impact">
                      <strong>Impact:</strong> {rec.impact}
                    </div>
                  )}
                  
                  {rec.file && (
                    <div className="recommendation-file">
                      <strong>File:</strong> {rec.file}
                      {rec.line && `:${rec.line}`}
                    </div>
                  )}
                  
                  {rec.scanner && (
                    <div className="recommendation-scanner">
                      <strong>Source:</strong> {rec.scanner}
                    </div>
                  )}
                </div>

                {rec.examples && (
                  <div className="recommendation-examples">
                    <strong>Examples:</strong>
                    <ul>
                      {Array.isArray(rec.examples) 
                        ? rec.examples.map((example, i) => (
                            <li key={i}>{example}</li>
                          ))
                        : <li>{rec.examples}</li>
                      }
                    </ul>
                  </div>
                )}
                
                {rec.steps && (
                  <div className="recommendation-steps">
                    <strong>Implementation Steps:</strong>
                    <ol>
                      {Array.isArray(rec.steps) 
                        ? rec.steps.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))
                        : <li>{rec.steps}</li>
                      }
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredAndSortedRecommendations.length === 0 && processedRecommendations.length > 0 && (
        <div className="no-results">
          <p>No recommendations match your current filters.</p>
          <button 
            onClick={() => {
              setSelectedPriority('all');
              setSelectedCategory('all');
              setSelectedEffort('all');
              setSelectedSource('all');
              setActiveView('all');
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

export default AnalysisRecommendations; 