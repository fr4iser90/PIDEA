import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useMemo } from 'react';
import '@/css/components/analysis/analysis-recommendations.css';

const AnalysisRecommendations = ({ recommendations, loading, error }) => {
  const [activeView, setActiveView] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('priority');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedRecommendations, setExpandedRecommendations] = useState(new Set());

  // Add debugging
  console.log('💡 [AnalysisRecommendations] Received props:', { recommendations, loading, error });

  // Process recommendations data from backend structure
  const processedRecommendations = useMemo(() => {
    if (!recommendations) {
      console.log('💡 [AnalysisRecommendations] No recommendations data provided');
      return null;
    }

    console.log('💡 [AnalysisRecommendations] Processing recommendations data:', recommendations);
    console.log('💡 [AnalysisRecommendations] recommendations.recommendations:', recommendations.recommendations);
    console.log('💡 [AnalysisRecommendations] recommendations.insights:', recommendations.insights);

    const processed = {
      recommendations: recommendations.recommendations || [],
      integratedInsights: recommendations.integratedInsights || []
    };

    // Add default values for missing fields
    processed.recommendations = processed.recommendations.map(rec => ({
      title: rec.title || 'Untitled Recommendation',
      description: rec.description || 'No description available',
      priority: rec.priority || 'medium',
      category: rec.category || 'general',
      effort: rec.effort || 'medium',
      impact: rec.impact || 'medium',
      file: rec.file || null,
      estimatedTime: rec.estimatedTime || null,
      dependencies: rec.dependencies || [],
      tags: rec.tags || [],
      status: rec.status || 'pending'
    }));

    return processed;
  }, [recommendations]);

  // Filter and sort recommendations
  const filteredAndSortedRecommendations = useMemo(() => {
    if (!processedRecommendations?.recommendations) return [];

    let filtered = [...processedRecommendations.recommendations];

    // Apply priority filter
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(rec => rec.priority === selectedPriority);
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(rec => rec.category === selectedCategory);
    }

    // Sort recommendations
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'priority':
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          aValue = priorityOrder[a.priority] || 4;
          bValue = priorityOrder[b.priority] || 4;
          break;
        case 'category':
          aValue = a.category || '';
          bValue = b.category || '';
          break;
        case 'effort':
          const effortOrder = { low: 0, medium: 1, high: 2 };
          aValue = effortOrder[a.effort] || 3;
          bValue = effortOrder[b.effort] || 3;
          break;
        case 'impact':
          const impactOrder = { high: 0, medium: 1, low: 2 };
          aValue = impactOrder[a.impact] || 3;
          bValue = impactOrder[b.impact] || 3;
          break;
        case 'status':
          const statusOrder = { 'in-progress': 0, planned: 1, pending: 2, completed: 3 };
          aValue = statusOrder[a.status] || 4;
          bValue = statusOrder[b.status] || 4;
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
  }, [processedRecommendations, selectedPriority, selectedCategory, sortBy, sortOrder]);

  // Get unique values for filters
  const uniquePriorities = useMemo(() => 
    [...new Set(processedRecommendations?.recommendations.map(r => r.priority))].filter(Boolean),
    [processedRecommendations]
  );

  const uniqueCategories = useMemo(() => 
    [...new Set(processedRecommendations?.recommendations.map(r => r.category))].filter(Boolean),
    [processedRecommendations]
  );

  const uniqueEfforts = useMemo(() => 
    [...new Set(processedRecommendations?.recommendations.map(r => r.effort))].filter(Boolean),
    [processedRecommendations]
  );

  // Recommendation statistics
  const recommendationStats = useMemo(() => {
    if (!processedRecommendations) return null;

    const stats = {
      total: processedRecommendations.recommendations.length,
      byPriority: {},
      byCategory: {},
      byEffort: {},
      byStatus: {},
      totalEstimatedTime: 0
    };

    processedRecommendations.recommendations.forEach(rec => {
      // Count by priority
      stats.byPriority[rec.priority] = (stats.byPriority[rec.priority] || 0) + 1;
      
      // Count by category
      stats.byCategory[rec.category] = (stats.byCategory[rec.category] || 0) + 1;
      
      // Count by effort
      stats.byEffort[rec.effort] = (stats.byEffort[rec.effort] || 0) + 1;
      
      // Count by status
      stats.byStatus[rec.status] = (stats.byStatus[rec.status] || 0) + 1;
      
      // Sum estimated time
      if (rec.estimatedTime) {
        stats.totalEstimatedTime += rec.estimatedTime;
      }
    });

    return stats;
  }, [processedRecommendations]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
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

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'critical': return '🚨';
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'neutral';
    }
  };

  const getEffortIcon = (effort) => {
    switch (effort) {
      case 'low': return '⚡';
      case 'medium': return '⚙️';
      case 'high': return '🔧';
      default: return '📋';
    }
  };

  const getEffortColor = (effort) => {
    switch (effort) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'critical';
      default: return 'neutral';
    }
  };

  const getImpactIcon = (impact) => {
    switch (impact) {
      case 'high': return '📈';
      case 'medium': return '📊';
      case 'low': return '📉';
      default: return '📋';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in-progress': return '🔄';
      case 'planned': return '📅';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'warning';
      case 'planned': return 'info';
      case 'pending': return 'neutral';
      default: return 'neutral';
    }
  };

  const clearFilters = () => {
    setSelectedPriority('all');
    setSelectedCategory('all');
  };

  const exportRecommendations = () => {
    const csvContent = [
      ['Priority', 'Title', 'Category', 'Effort', 'Impact', 'Status', 'Description'],
      ...filteredAndSortedRecommendations.map(rec => [
        rec.priority,
        rec.title,
        rec.category,
        rec.effort,
        rec.impact,
        rec.status,
        rec.description
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-recommendations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatEstimatedTime = (hours) => {
    if (!hours) return 'Unknown';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 8) return `${hours.toFixed(1)}h`;
    return `${(hours / 8).toFixed(1)}d`;
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
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!processedRecommendations) {
    return (
      <div className="analysis-recommendations no-data">
        <p>No recommendations data available.</p>
      </div>
    );
  }

  return (
    <div className="analysis-recommendations">
      {/* Header */}
      <div className="recommendations-header">
        <div className="recommendations-title">
          <h3>💡 Recommendations</h3>
          <div className="recommendations-summary">
            <span className="summary-text">
              {recommendationStats?.total > 0 
                ? `${recommendationStats.total} actionable recommendations`
                : 'No recommendations available'
              }
            </span>
          </div>
        </div>
        <div className="recommendations-actions">
          <button 
            onClick={exportRecommendations}
            className="btn-export"
            disabled={filteredAndSortedRecommendations.length === 0}
            title="Export recommendations to CSV"
          >
            📊 Export
          </button>
        </div>
      </div>

      {/* Statistics */}
      {recommendationStats && recommendationStats.total > 0 && (
        <div className="recommendations-statistics">
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Total:</span>
              <span className="stat-value">{recommendationStats.total}</span>
            </div>
            {Object.entries(recommendationStats.byPriority).map(([priority, count]) => (
              <div key={priority} className={`stat-item ${getPriorityColor(priority)}`}>
                <span className="stat-label">{priority}:</span>
                <span className="stat-value">{count}</span>
              </div>
            ))}
            {recommendationStats.totalEstimatedTime > 0 && (
              <div className="stat-item">
                <span className="stat-label">Est. Time:</span>
                <span className="stat-value">{formatEstimatedTime(recommendationStats.totalEstimatedTime)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="recommendations-filters">
        <div className="filter-group">
          <label htmlFor="priority-filter">Priority:</label>
          <select
            id="priority-filter"
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Priorities</option>
            {uniquePriorities.map(priority => (
              <option key={priority} value={priority}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="category-filter">Category:</label>
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            {uniqueCategories.map(category => (
              <option key={category} value={category}>
                {category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="effort-filter">Effort:</label>
          <select
            id="effort-filter"
            value={filterEffort}
            onChange={(e) => setFilterEffort(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Efforts</option>
            {uniqueEfforts.map(effort => (
              <option key={effort} value={effort}>
                {effort.charAt(0).toUpperCase() + effort.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <button onClick={clearFilters} className="btn-clear-filters">
          Clear Filters
        </button>
      </div>

      {/* Recommendations List */}
      {filteredAndSortedRecommendations.length > 0 ? (
        <div className="recommendations-list">
          {filteredAndSortedRecommendations.map((rec, index) => {
            const recId = `${rec.priority}-${index}`;
            const isExpanded = expandedRecommendations.has(recId);
            
            return (
              <div key={recId} className={`recommendation-item ${getPriorityColor(rec.priority)}`}>
                <div className="recommendation-header">
                  <div className="recommendation-priority">
                    <span className={`priority-badge ${getPriorityColor(rec.priority)}`}>
                      {getPriorityIcon(rec.priority)} {rec.priority}
                    </span>
                  </div>
                  
                  <div className="recommendation-title">
                    <h4>{rec.title}</h4>
                    <div className="recommendation-meta">
                      <span className="category-badge">{rec.category}</span>
                      <span className={`effort-badge ${getEffortColor(rec.effort)}`}>
                        {getEffortIcon(rec.effort)} {rec.effort}
                      </span>
                      <span className="impact-badge">
                        {getImpactIcon(rec.impact)} {rec.impact}
                      </span>
                      <span className={`status-badge ${getStatusColor(rec.status)}`}>
                        {getStatusIcon(rec.status)} {rec.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="recommendation-actions">
                    <button
                      onClick={() => toggleRecommendationExpansion(recId)}
                      className="btn-expand"
                      title={isExpanded ? 'Collapse details' : 'Expand details'}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>
                  </div>
                </div>

                <div className="recommendation-description">
                  <p>{rec.description}</p>
                </div>

                {isExpanded && (
                  <div className="recommendation-details">
                    {rec.file && (
                      <div className="detail-section">
                        <h5>📁 Related File</h5>
                        <p className="file-path">{rec.file}</p>
                      </div>
                    )}
                    
                    {rec.estimatedTime && (
                      <div className="detail-section">
                        <h5>⏱️ Estimated Time</h5>
                        <p>{formatEstimatedTime(rec.estimatedTime)}</p>
                      </div>
                    )}
                    
                    {rec.dependencies && rec.dependencies.length > 0 && (
                      <div className="detail-section">
                        <h5>🔗 Dependencies</h5>
                        <div className="dependencies-list">
                          {rec.dependencies.map((dep, depIndex) => (
                            <span key={depIndex} className="dependency-tag">{dep}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {rec.tags && rec.tags.length > 0 && (
                      <div className="detail-section">
                        <h5>🏷️ Tags</h5>
                        <div className="tags-list">
                          {rec.tags.map((tag, tagIndex) => (
                            <span key={tagIndex} className="tag">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-recommendations-message">
          <p>
            {processedRecommendations.recommendations.length === 0 
              ? 'No recommendations found in the analysis.'
              : 'No recommendations match the current filters.'
            }
          </p>
        </div>
      )}

      {/* Integrated Insights */}
      {processedRecommendations.integratedInsights && processedRecommendations.integratedInsights.length > 0 && (
        <div className="insights-section">
          <h4>🧠 Integrated Insights</h4>
          <div className="insights-list">
            {processedRecommendations.integratedInsights.map((insight, index) => (
              <div key={index} className="insight-item">
                <div className="insight-header">
                  <span className={`insight-type ${insight.severity || 'info'}`}>
                    {insight.type || 'Insight'}
                  </span>
                  <span className="insight-severity">
                    {insight.severity || 'info'}
                  </span>
                </div>
                <p className="insight-description">{insight.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {filteredAndSortedRecommendations.length > 0 && (
        <div className="recommendations-summary-footer">
          <span className="summary-text">
            Showing {filteredAndSortedRecommendations.length} of {processedRecommendations.recommendations.length} recommendations
          </span>
        </div>
      )}
    </div>
  );
};

export default AnalysisRecommendations; 