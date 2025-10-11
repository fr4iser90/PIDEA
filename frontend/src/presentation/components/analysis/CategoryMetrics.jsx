import React from 'react';
import '@/scss/components/_category-metrics.scss';;

const CategoryMetrics = ({ data, category, categoryName, loading, onAnalysisSelect }) => {
  if (loading) {
    return (
      <div className="category-metrics loading">
        <div className="loading-spinner"></div>
        <p>Loading metrics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="category-metrics no-data">
        <div className="no-data-icon">📊</div>
        <h4>No Metrics Data</h4>
        <p>No {categoryName.toLowerCase()} metrics available.</p>
        <p>Run a {categoryName.toLowerCase()} analysis to see metrics.</p>
      </div>
    );
  }

  // Extract metrics from data
  const metrics = data.metrics || data;
  
  // Get category-specific metrics
  const getCategoryMetrics = () => {
    switch (category) {
      case 'security':
        return {
          securityScore: metrics.securityScore || metrics.score || 0,
          vulnerabilities: metrics.vulnerabilities || metrics.criticalIssues || 0,
          complianceScore: metrics.complianceScore || 0,
          securityIssues: metrics.securityIssues || 0,
          riskLevel: metrics.riskLevel || 'Unknown'
        };
      case 'performance':
        return {
          performanceScore: metrics.performanceScore || metrics.score || 0,
          loadTime: metrics.loadTime || metrics.responseTime || 0,
          throughput: metrics.throughput || 0,
          bottlenecks: metrics.bottlenecks || 0,
          optimizationScore: metrics.optimizationScore || 0
        };
      case 'architecture':
        return {
          architectureScore: metrics.architectureScore || metrics.score || 0,
          designPatterns: metrics.designPatterns || metrics.patterns || 0,
          coupling: metrics.coupling || 0,
          cohesion: metrics.cohesion || 0,
          complexity: metrics.complexity || 0
        };
      case 'codeQuality':
        return {
          codeQualityScore: metrics.codeQualityScore || metrics.score || 0,
          codeSmells: metrics.codeSmells || 0,
          technicalDebt: metrics.technicalDebt || metrics.debt || 0,
          maintainability: metrics.maintainability || 0,
          testCoverage: metrics.testCoverage || 0
        };
      case 'dependencies':
        return {
          dependencyScore: metrics.dependencyScore || metrics.score || 0,
          outdatedDependencies: metrics.outdatedDependencies || 0,
          securityVulnerabilities: metrics.securityVulnerabilities || 0,
          totalDependencies: metrics.totalDependencies || 0,
          dependencyHealth: metrics.dependencyHealth || 0
        };
      case 'manifest':
        return {
          manifestScore: metrics.manifestScore || metrics.score || 0,
          configurationIssues: metrics.configurationIssues || 0,
          missingFields: metrics.missingFields || 0,
          validationScore: metrics.validationScore || 0,
          completeness: metrics.completeness || 0
        };
      case 'techStack':
        return {
          techStackScore: metrics.techStackScore || metrics.score || 0,
          technologies: metrics.technologies || metrics.techCount || 0,
          frameworkScore: metrics.frameworkScore || 0,
          libraryScore: metrics.libraryScore || 0,
          toolingScore: metrics.toolingScore || 0
        };
      default:
        return {};
    }
  };

  const categoryMetrics = getCategoryMetrics();

  const formatMetricValue = (value, type = 'number') => {
    if (value === null || value === undefined) return 'N/A';
    
    switch (type) {
      case 'percentage':
        return `${Math.round(value)}%`;
      case 'time':
        return `${value}ms`;
      case 'score':
        return `${Math.round(value)}/100`;
      case 'count':
        return value.toLocaleString();
      default:
        return value;
    }
  };

  const getMetricColor = (value, maxValue = 100) => {
    const percentage = (value / maxValue) * 100;
    if (percentage >= 80) return 'good';
    if (percentage >= 60) return 'medium';
    if (percentage >= 40) return 'poor';
    return 'critical';
  };

  const getMetricIcon = (metricName) => {
    const iconMap = {
      score: '🎯',
      vulnerabilities: '🚨',
      issues: '⚠️',
      time: '⏱️',
      coverage: '📊',
      debt: '💳',
      dependencies: '📦',
      patterns: '🏗️',
      complexity: '🧮',
      maintainability: '🔧',
      performance: '⚡',
      security: '🔒',
      architecture: '🏛️',
      quality: '✨',
      compliance: '✅',
      risk: '⚠️',
      throughput: '📈',
      bottlenecks: '🚧',
      optimization: '🚀',
      coupling: '🔗',
      cohesion: '🧩',
      testCoverage: '🧪',
      outdated: '📅',
      health: '💚',
      validation: '✅',
      completeness: '📋',
      technologies: '🛠️',
      framework: '⚙️',
      library: '📚',
      tooling: '🔨'
    };

    for (const [key, icon] of Object.entries(iconMap)) {
      if (metricName.toLowerCase().includes(key)) {
        return icon;
      }
    }
    return '📊';
  };

  return (
    <div className="category-metrics">
      {/* Header */}
      <div className="metrics-header">
        <h4>{categoryName} Metrics</h4>
        <div className="metrics-summary">
          <span className="metrics-count">
            {Object.keys(categoryMetrics).length} metrics available
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        {Object.entries(categoryMetrics).map(([key, value]) => {
          const metricName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          const metricIcon = getMetricIcon(key);
          const metricColor = getMetricColor(value);
          const formattedValue = formatMetricValue(value, key.includes('Score') ? 'score' : 'number');
          
          return (
            <div key={key} className={`metric-card ${metricColor}`}>
              <div className="metric-header">
                <span className="metric-icon">{metricIcon}</span>
                <span className="metric-name">{metricName}</span>
              </div>
              
              <div className="metric-value">
                {formattedValue}
              </div>
              
              {key.includes('Score') && (
                <div className="metric-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${Math.min(value, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              <div className="metric-description">
                {getMetricDescription(key, value)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Metrics */}
      {metrics.details && (
        <div className="additional-metrics">
          <h5>Detailed Metrics</h5>
          <div className="metrics-table">
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(metrics.details).map(([key, value]) => (
                  <tr key={key}>
                    <td>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</td>
                    <td>{formatMetricValue(value)}</td>
                    <td>
                      <span className={`status-badge ${getMetricColor(value)}`}>
                        {getMetricStatus(value)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Metrics Actions */}
      <div className="metrics-actions">
        <button 
          className="action-button secondary"
          onClick={() => onAnalysisSelect && onAnalysisSelect({
            type: 'export-metrics',
            category: category,
            data: metrics
          })}
        >
          Export Metrics
        </button>
        
        <button 
          className="action-button primary"
          onClick={() => onAnalysisSelect && onAnalysisSelect({
            type: 'detailed-metrics',
            category: category,
            data: data
          })}
        >
          View Detailed Metrics
        </button>
      </div>
    </div>
  );
};

// Helper functions
const getMetricDescription = (key, value) => {
  const descriptions = {
    score: 'Overall assessment score',
    vulnerabilities: 'Security vulnerabilities found',
    issues: 'Total issues detected',
    time: 'Response or processing time',
    coverage: 'Test coverage percentage',
    debt: 'Technical debt amount',
    dependencies: 'Dependency count',
    patterns: 'Design patterns used',
    complexity: 'Code complexity measure',
    maintainability: 'Maintainability index',
    performance: 'Performance rating',
    security: 'Security assessment',
    architecture: 'Architectural quality',
    quality: 'Code quality measure',
    compliance: 'Compliance status',
    risk: 'Risk assessment level',
    throughput: 'Processing throughput',
    bottlenecks: 'Performance bottlenecks',
    optimization: 'Optimization potential',
    coupling: 'Module coupling level',
    cohesion: 'Module cohesion level',
    testCoverage: 'Test coverage percentage',
    outdated: 'Outdated dependencies',
    health: 'Dependency health score',
    validation: 'Configuration validation',
    completeness: 'Configuration completeness',
    technologies: 'Technology count',
    framework: 'Framework assessment',
    library: 'Library assessment',
    tooling: 'Tooling assessment'
  };

  return descriptions[key] || 'Metric measurement';
};

const getMetricStatus = (value) => {
  if (value >= 80) return 'Excellent';
  if (value >= 60) return 'Good';
  if (value >= 40) return 'Fair';
  if (value >= 20) return 'Poor';
  return 'Critical';
};

export default CategoryMetrics; 