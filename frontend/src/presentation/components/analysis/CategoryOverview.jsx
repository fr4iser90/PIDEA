import React from 'react';
import '@/css/components/analysis/category-overview.css';

const CategoryOverview = ({ data, category, categoryName, loading, onAnalysisSelect }) => {
  // DEBUG: Log the data being passed
  console.log('🔍 [CategoryOverview] Received data:', data);
  console.log('🔍 [CategoryOverview] Category:', category);
  console.log('🔍 [CategoryOverview] Data type:', typeof data);
  console.log('🔍 [CategoryOverview] Data keys:', data ? Object.keys(data) : 'null');

  if (loading) {
    return (
      <div className="category-overview loading">
        <div className="loading-spinner"></div>
        <p>Loading {categoryName.toLowerCase()} analysis...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="category-overview empty">
        <p>No {categoryName.toLowerCase()} analysis data available.</p>
        <p>Run a {categoryName.toLowerCase()} analysis to see the overview.</p>
      </div>
    );
  }

  // Extract summary information - handle both summary object and direct data
  const summary = data.summary || data;
  const score = summary.score || summary.overallScore || 0;
  
  // Handle different data structures for issues and recommendations
  let totalIssues = 0;
  let totalRecommendations = 0;
  
  // Check if data has issues array directly
  if (data.issues && Array.isArray(data.issues)) {
    // Data comes as arrays from backend
    totalIssues = data.issues.length;
  } else if (data.issues && data.issues.data && data.issues.data.issues && Array.isArray(data.issues.data.issues)) {
    // Data comes as { success: true, data: { issues: [...] } } from backend
    totalIssues = data.issues.data.issues.length;
  } else if (data.issues && data.issues.issues && Array.isArray(data.issues.issues)) {
    // Data comes as { issues: [...] } from backend
    totalIssues = data.issues.issues.length;
  } else if (summary.totalIssues !== undefined) {
    // Data comes as summary fields
    totalIssues = summary.totalIssues;
  } else if (summary.issuesCount !== undefined) {
    totalIssues = summary.issuesCount;
  } else if (summary.issues && Array.isArray(summary.issues)) {
    // Issues might be in summary
    totalIssues = summary.issues.length;
  }
  
  // Check if data has recommendations array directly
  if (data.recommendations && Array.isArray(data.recommendations)) {
    // Data comes as arrays from backend
    totalRecommendations = data.recommendations.length;
  } else if (data.recommendations && data.recommendations.data && data.recommendations.data.recommendations && Array.isArray(data.recommendations.data.recommendations)) {
    // Data comes as { success: true, data: { recommendations: [...] } } from backend
    totalRecommendations = data.recommendations.data.recommendations.length;
  } else if (data.recommendations && data.recommendations.recommendations && Array.isArray(data.recommendations.recommendations)) {
    // Data comes as { recommendations: [...] } from backend
    totalRecommendations = data.recommendations.recommendations.length;
  } else if (summary.totalRecommendations !== undefined) {
    // Data comes as summary fields
    totalRecommendations = summary.totalRecommendations;
  } else if (summary.recommendationsCount !== undefined) {
    totalRecommendations = summary.recommendationsCount;
  } else if (summary.recommendations && Array.isArray(summary.recommendations)) {
    // Recommendations might be in summary
    totalRecommendations = summary.recommendations.length;
  }
  
  const executionTime = summary.executionTime || 0;
  const timestamp = summary.timestamp || summary.createdAt;

  // Get category-specific metrics
  const getCategoryMetrics = () => {
    switch (category) {
      case 'security':
        return {
          vulnerabilities: summary.vulnerabilities || summary.criticalIssues || totalIssues,
          securityScore: summary.securityScore || score,
          complianceStatus: summary.complianceStatus || 'Unknown'
        };
      case 'performance':
        return {
          performanceScore: summary.performanceScore || score,
          bottlenecks: summary.bottlenecks || summary.performanceIssues || totalIssues,
          optimizationOpportunities: summary.optimizationOpportunities || totalRecommendations
        };
      case 'architecture':
        return {
          architectureScore: summary.architectureScore || score,
          designPatterns: summary.designPatterns || summary.patterns || 0,
          architecturalIssues: summary.architecturalIssues || totalIssues
        };
      case 'codeQuality':
        return {
          codeQualityScore: summary.codeQualityScore || score,
          codeSmells: summary.codeSmells || totalIssues,
          technicalDebt: summary.technicalDebt || summary.debt || 0
        };
      case 'dependencies':
        return {
          dependencyScore: summary.dependencyScore || score,
          outdatedDependencies: summary.outdatedDependencies || totalIssues,
          securityVulnerabilities: summary.securityVulnerabilities || 0
        };
      case 'manifest':
        return {
          manifestScore: summary.manifestScore || score,
          configurationIssues: summary.configurationIssues || totalIssues,
          missingFields: summary.missingFields || 0
        };
      case 'techStack':
        return {
          techStackScore: summary.techStackScore || score,
          technologies: summary.technologies || summary.techCount || 0,
          recommendations: summary.techRecommendations || totalRecommendations
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