import React from 'react';
import '@/scss/components/_category-charts.scss';;

const CategoryCharts = ({ data, category, categoryName, loading, onAnalysisSelect }) => {
  if (loading) {
    return (
      <div className="category-charts loading">
        <div className="loading-spinner"></div>
        <p>Loading charts...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="category-charts no-data">
        <div className="no-data-icon">📈</div>
        <h4>No Charts Data</h4>
        <p>No {categoryName.toLowerCase()} charts available.</p>
        <p>Run a {categoryName.toLowerCase()} analysis to see charts.</p>
      </div>
    );
  }

  // Extract chart data
  const charts = data.charts || data.results || data;
  
  // Get category-specific charts
  const getCategoryCharts = () => {
    switch (category) {
      case 'security':
        return {
          vulnerabilityTrend: charts.vulnerabilityTrend || charts.trends || [],
          riskDistribution: charts.riskDistribution || charts.distribution || [],
          complianceStatus: charts.complianceStatus || [],
          securityScore: charts.securityScore || charts.score || []
        };
      case 'performance':
        return {
          performanceTrend: charts.performanceTrend || charts.trends || [],
          loadTimeDistribution: charts.loadTimeDistribution || charts.distribution || [],
          throughputMetrics: charts.throughputMetrics || [],
          bottleneckAnalysis: charts.bottleneckAnalysis || []
        };
      case 'architecture':
        return {
          architectureTrend: charts.architectureTrend || charts.trends || [],
          patternDistribution: charts.patternDistribution || charts.distribution || [],
          complexityMetrics: charts.complexityMetrics || [],
          couplingAnalysis: charts.couplingAnalysis || []
        };
      case 'codeQuality':
        return {
          qualityTrend: charts.qualityTrend || charts.trends || [],
          codeSmellsDistribution: charts.codeSmellsDistribution || charts.distribution || [],
          technicalDebt: charts.technicalDebt || charts.debt || [],
          maintainabilityMetrics: charts.maintainabilityMetrics || []
        };
      case 'dependencies':
        return {
          dependencyTrend: charts.dependencyTrend || charts.trends || [],
          dependencyHealth: charts.dependencyHealth || charts.health || [],
          vulnerabilityDistribution: charts.vulnerabilityDistribution || charts.distribution || [],
          updateFrequency: charts.updateFrequency || []
        };
      case 'manifest':
        return {
          manifestTrend: charts.manifestTrend || charts.trends || [],
          configurationHealth: charts.configurationHealth || charts.health || [],
          validationStatus: charts.validationStatus || [],
          completenessMetrics: charts.completenessMetrics || []
        };
      case 'techStack':
        return {
          techStackTrend: charts.techStackTrend || charts.trends || [],
          technologyDistribution: charts.technologyDistribution || charts.distribution || [],
          frameworkUsage: charts.frameworkUsage || [],
          toolingMetrics: charts.toolingMetrics || []
        };
      default:
        return {};
    }
  };

  const categoryCharts = getCategoryCharts();

  const renderChart = (chartKey, chartData) => {
    if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
      return (
        <div className="chart-placeholder">
          <div className="placeholder-icon">📊</div>
          <p>No {chartKey.replace(/([A-Z])/g, ' $1').toLowerCase()} data available</p>
        </div>
      );
    }

    // Simple chart rendering (in a real implementation, you'd use a charting library)
    return (
      <div className="chart-container">
        <div className="chart-header">
          <h5>{chartKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h5>
          <span className="chart-count">{chartData.length} data points</span>
        </div>
        
        <div className="chart-content">
          {renderChartData(chartKey, chartData)}
        </div>
      </div>
    );
  };

  const renderChartData = (chartKey, data) => {
    // Simple visualization based on data type
    if (data.length === 0) return <p>No data available</p>;

    const firstItem = data[0];
    
    if (typeof firstItem === 'number') {
      // Numeric data - show as bar chart
      return (
        <div className="simple-bar-chart">
          {data.map((value, index) => (
            <div key={index} className="bar-item">
              <div className="bar-label">Item {index + 1}</div>
              <div className="bar-container">
                <div 
                  className="bar-fill" 
                  style={{ width: `${Math.min((value / Math.max(...data)) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="bar-value">{value}</div>
            </div>
          ))}
        </div>
      );
    } else if (typeof firstItem === 'object') {
      // Object data - show as table
      return (
        <div className="chart-table">
          <table>
            <thead>
              <tr>
                {Object.keys(firstItem).map(key => (
                  <th key={key}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 10).map((item, index) => (
                <tr key={index}>
                  {Object.values(item).map((value, valueIndex) => (
                    <td key={valueIndex}>{String(value)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 10 && (
            <div className="table-footer">
              Showing 10 of {data.length} items
            </div>
          )}
        </div>
      );
    } else {
      // String data - show as list
      return (
        <div className="chart-list">
          {data.map((item, index) => (
            <div key={index} className="list-item">
              {String(item)}
            </div>
          ))}
        </div>
      );
    }
  };

  const getChartIcon = (chartKey) => {
    const iconMap = {
      trend: '📈',
      distribution: '📊',
      health: '💚',
      score: '🎯',
      metrics: '📋',
      analysis: '🔍',
      status: '✅',
      usage: '🔄',
      frequency: '⏱️',
      debt: '💳',
      complexity: '🧮',
      coupling: '🔗',
      vulnerability: '🚨',
      performance: '⚡',
      quality: '✨',
      architecture: '🏗️',
      dependencies: '📦',
      manifest: '📋',
      techStack: '🛠️'
    };

    for (const [key, icon] of Object.entries(iconMap)) {
      if (chartKey.toLowerCase().includes(key)) {
        return icon;
      }
    }
    return '📊';
  };

  return (
    <div className="category-charts">
      {/* Header */}
      <div className="charts-header">
        <h4>{categoryName} Charts</h4>
        <div className="charts-summary">
          <span className="charts-count">
            {Object.keys(categoryCharts).length} charts available
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {Object.entries(categoryCharts).map(([chartKey, chartData]) => (
          <div key={chartKey} className="chart-card">
            <div className="chart-icon">
              {getChartIcon(chartKey)}
            </div>
            {renderChart(chartKey, chartData)}
          </div>
        ))}
      </div>

      {/* No Charts */}
      {Object.keys(categoryCharts).length === 0 && (
        <div className="no-charts">
          <div className="no-charts-icon">📈</div>
          <h5>No Charts Available</h5>
          <p>No chart data found for {categoryName.toLowerCase()} analysis.</p>
          <p>Charts will appear here when analysis data includes visualizations.</p>
        </div>
      )}

      {/* Charts Actions */}
      <div className="charts-actions">
        <button 
          className="action-button secondary"
          onClick={() => onAnalysisSelect && onAnalysisSelect({
            type: 'export-charts',
            category: category,
            data: charts
          })}
        >
          Export Charts Data
        </button>
        
        <button 
          className="action-button primary"
          onClick={() => onAnalysisSelect && onAnalysisSelect({
            type: 'detailed-charts',
            category: category,
            data: data
          })}
        >
          View Detailed Charts
        </button>
      </div>
    </div>
  );
};

export default CategoryCharts; 