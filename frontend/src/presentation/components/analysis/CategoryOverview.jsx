import React from 'react';
import '@/css/components/analysis/category-overview.css';

const CategoryOverview = ({ data, category, categoryName, loading, onAnalysisSelect }) => {
  if (loading) {
    return (
      <div className="category-overview loading">
        <div className="loading-spinner"></div>
        <p>Loading overview...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="category-overview no-data">
        <div className="no-data-icon">📋</div>
        <h4>No Overview Data</h4>
        <p>No {categoryName.toLowerCase()} analysis data available.</p>
        <p>Run a {categoryName.toLowerCase()} analysis to see the overview.</p>
      </div>
    );
  }

  // Extract summary information
  const summary = data.summary || data;
  const score = summary.score || summary.overallScore || 0;
  const totalIssues = summary.totalIssues || summary.issuesCount || 0;
  const totalRecommendations = summary.totalRecommendations || summary.recommendationsCount || 0;
  const executionTime = summary.executionTime || 0;
  const timestamp = summary.timestamp || summary.createdAt;

  // Get category-specific metrics
  const getCategoryMetrics = () => {
    switch (category) {
      case 'security':
        return {
          vulnerabilities: summary.vulnerabilities || summary.criticalIssues || 0,
          securityScore: summary.securityScore || score,
          complianceStatus: summary.complianceStatus || 'Unknown'
        };
      case 'performance':
        return {
          performanceScore: summary.performanceScore || score,
          bottlenecks: summary.bottlenecks || summary.performanceIssues || 0,
          optimizationOpportunities: summary.optimizationOpportunities || 0
        };
      case 'architecture':
        return {
          architectureScore: summary.architectureScore || score,
          designPatterns: summary.designPatterns || summary.patterns || 0,
          architecturalIssues: summary.architecturalIssues || 0
        };
      case 'codeQuality':
        return {
          codeQualityScore: summary.codeQualityScore || score,
          codeSmells: summary.codeSmells || 0,
          technicalDebt: summary.technicalDebt || summary.debt || 0
        };
      case 'dependencies':
        return {
          dependencyScore: summary.dependencyScore || score,
          outdatedDependencies: summary.outdatedDependencies || 0,
          securityVulnerabilities: summary.securityVulnerabilities || 0
        };
      case 'manifest':
        return {
          manifestScore: summary.manifestScore || score,
          configurationIssues: summary.configurationIssues || 0,
          missingFields: summary.missingFields || 0
        };
      case 'techStack':
        return {
          techStackScore: summary.techStackScore || score,
          technologies: summary.technologies || summary.techCount || 0,
          recommendations: summary.techRecommendations || 0
        };
      default:
        return {};
    }
  };

  const categoryMetrics = getCategoryMetrics();

  return (
    <div className="category-overview">
      {/* Header */}
      <div className="overview-header">
        <h4>{categoryName} Analysis Overview</h4>
        {timestamp && (
          <span className="analysis-timestamp">
            Analyzed: {new Date(timestamp).toLocaleString()}
          </span>
        )}
      </div>

      {/* Score Card */}
      <div className="score-card">
        <div className="score-circle">
          <div className="score-value">{Math.round(score)}</div>
          <div className="score-label">Score</div>
        </div>
        <div className="score-details">
          <div className="score-bar">
            <div 
              className="score-fill" 
              style={{ width: `${Math.min(score, 100)}%` }}
            ></div>
          </div>
          <div className="score-description">
            {score >= 90 ? 'Excellent' : 
             score >= 80 ? 'Good' : 
             score >= 70 ? 'Fair' : 
             score >= 60 ? 'Poor' : 'Critical'}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="key-metrics">
        <div className="metric-item">
          <div className="metric-icon">⚠️</div>
          <div className="metric-content">
            <div className="metric-value">{totalIssues}</div>
            <div className="metric-label">Issues Found</div>
          </div>
        </div>
        
        <div className="metric-item">
          <div className="metric-icon">💡</div>
          <div className="metric-content">
            <div className="metric-value">{totalRecommendations}</div>
            <div className="metric-label">Recommendations</div>
          </div>
        </div>

        {executionTime > 0 && (
          <div className="metric-item">
            <div className="metric-icon">⏱️</div>
            <div className="metric-content">
              <div className="metric-value">{Math.round(executionTime / 1000)}s</div>
              <div className="metric-label">Analysis Time</div>
            </div>
          </div>
        )}
      </div>

      {/* Category-Specific Metrics */}
      {Object.keys(categoryMetrics).length > 0 && (
        <div className="category-metrics">
          <h5>Category Details</h5>
          <div className="category-metrics-grid">
            {Object.entries(categoryMetrics).map(([key, value]) => (
              <div key={key} className="category-metric">
                <div className="category-metric-label">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </div>
                <div className="category-metric-value">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Description */}
      {summary.description && (
        <div className="summary-description">
          <h5>Summary</h5>
          <p>{summary.description}</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <button 
          className="action-button primary"
          onClick={() => onAnalysisSelect && onAnalysisSelect(data)}
        >
          View Full Analysis
        </button>
        
        <button 
          className="action-button secondary"
          onClick={() => onAnalysisSelect && onAnalysisSelect({ type: 'issues', data: data.issues })}
        >
          View Issues
        </button>
        
        <button 
          className="action-button secondary"
          onClick={() => onAnalysisSelect && onAnalysisSelect({ type: 'recommendations', data: data.recommendations })}
        >
          View Recommendations
        </button>
      </div>
    </div>
  );
};

export default CategoryOverview; 