import React, { useState } from 'react';
import '@/scss/components/_category-recommendations.scss';;

const CategoryRecommendations = ({ data, category, categoryName, loading, onAnalysisSelect }) => {
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  if (loading) {
    return (
      <div className="category-recommendations loading">
        <div className="loading-spinner"></div>
        <p>Loading recommendations...</p>
      </div>
    );
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="category-recommendations no-data">
        <div className="no-data-icon">💡</div>
        <h4>No Recommendations</h4>
        <p>No {categoryName.toLowerCase()} recommendations available.</p>
        <p>This could mean your {categoryName.toLowerCase()} is already optimized.</p>
      </div>
    );
  }

  // Filter recommendations based on priority and search term
  const filteredRecommendations = data.filter(recommendation => {
    const matchesPriority = selectedPriority === 'all' || 
                           recommendation.priority?.toLowerCase() === selectedPriority.toLowerCase() ||
                           recommendation.impact?.toLowerCase() === selectedPriority.toLowerCase();
    
    const matchesSearch = !searchTerm || 
                         recommendation.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recommendation.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recommendation.suggestion?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesPriority && matchesSearch;
  });

  // Group recommendations by priority
  const recommendationsByPriority = filteredRecommendations.reduce((acc, recommendation) => {
    const priority = recommendation.priority || recommendation.impact || 'medium';
    if (!acc[priority]) acc[priority] = [];
    acc[priority].push(recommendation);
    return acc;
  }, {});

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'high';
      case 'medium':
      case 'moderate':
        return 'medium';
      case 'low':
      case 'minor':
        return 'low';
      default:
        return 'medium';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'critical':
        return '🚀';
      case 'medium':
      case 'moderate':
        return '⚡';
      case 'low':
      case 'minor':
        return '💡';
      default:
        return '💡';
    }
  };

  const handleRecommendationClick = (recommendation) => {
    onAnalysisSelect && onAnalysisSelect({
      type: 'recommendation',
      category: category,
      data: recommendation
    });
  };

  return (
    <div className="category-recommendations">
      {/* Header */}
      <div className="recommendations-header">
        <h4>{categoryName} Recommendations ({filteredRecommendations.length})</h4>
        <div className="recommendations-summary">
          <span className="total-recommendations">Total: {data.length}</span>
          <span className="filtered-recommendations">Showing: {filteredRecommendations.length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="recommendations-filters">
        <div className="search-filter">
          <input
            type="text"
            placeholder="Search recommendations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="priority-filter">
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="priority-select"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="recommendations-list">
        {Object.entries(recommendationsByPriority).map(([priority, recommendations]) => (
          <div key={priority} className={`priority-group ${getPriorityColor(priority)}`}>
            <div className="priority-header">
              <span className="priority-icon">{getPriorityIcon(priority)}</span>
              <span className="priority-name">{priority} Priority</span>
              <span className="priority-count">({recommendations.length})</span>
            </div>
            
            <div className="priority-recommendations">
              {recommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className="recommendation-item"
                  onClick={() => handleRecommendationClick(recommendation)}
                >
                  <div className="recommendation-header">
                    <div className="recommendation-title">
                      {recommendation.title || recommendation.suggestion || `Recommendation ${index + 1}`}
                    </div>
                    <div className="recommendation-priority">
                      <span className={`priority-badge ${getPriorityColor(priority)}`}>
                        {priority}
                      </span>
                    </div>
                  </div>
                  
                  {recommendation.description && (
                    <div className="recommendation-description">
                      {recommendation.description}
                    </div>
                  )}
                  
                  {recommendation.suggestion && recommendation.suggestion !== recommendation.title && (
                    <div className="recommendation-suggestion">
                      <strong>Suggestion:</strong> {recommendation.suggestion}
                    </div>
                  )}
                  
                  <div className="recommendation-meta">
                    {recommendation.category && (
                      <span className="recommendation-category">
                        🏷️ {recommendation.category}
                      </span>
                    )}
                    
                    {recommendation.impact && (
                      <span className="recommendation-impact">
                        📈 Impact: {recommendation.impact}
                      </span>
                    )}
                    
                    {recommendation.effort && (
                      <span className="recommendation-effort">
                        ⏱️ Effort: {recommendation.effort}
                      </span>
                    )}
                  </div>
                  
                  {recommendation.examples && (
                    <div className="recommendation-examples">
                      <strong>Examples:</strong>
                      <ul>
                        {Array.isArray(recommendation.examples) 
                          ? recommendation.examples.map((example, i) => (
                              <li key={i}>{example}</li>
                            ))
                          : <li>{recommendation.examples}</li>
                        }
                      </ul>
                    </div>
                  )}
                  
                  {recommendation.steps && (
                    <div className="recommendation-steps">
                      <strong>Implementation Steps:</strong>
                      <ol>
                        {Array.isArray(recommendation.steps) 
                          ? recommendation.steps.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))
                          : <li>{recommendation.steps}</li>
                        }
                      </ol>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredRecommendations.length === 0 && data.length > 0 && (
        <div className="no-results">
          <p>No recommendations match your current filters.</p>
          <button 
            onClick={() => {
              setSelectedPriority('all');
              setSearchTerm('');
            }}
            className="clear-filters-btn"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Export Actions */}
      <div className="recommendations-actions">
        <button 
          className="action-button secondary"
          onClick={() => onAnalysisSelect && onAnalysisSelect({
            type: 'export-recommendations',
            category: category,
            data: filteredRecommendations
          })}
        >
          Export Recommendations
        </button>
        
        <button 
          className="action-button primary"
          onClick={() => onAnalysisSelect && onAnalysisSelect({
            type: 'all-recommendations',
            category: category,
            data: data
          })}
        >
          View All Recommendations
        </button>
      </div>
    </div>
  );
};

export default CategoryRecommendations; 