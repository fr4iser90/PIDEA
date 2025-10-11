import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useMemo } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { processTechStackData } from '@/utils/analysisDataProcessor';
import '@/scss/components/_analysis-techstack.scss';;

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

const AnalysisTechStack = ({ techStack, loading, error }) => {
  const [activeView, setActiveView] = useState('overview');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedConfidence, setSelectedConfidence] = useState('all');

  // Add debugging
  console.log('🔧 [AnalysisTechStack] Received props:', { techStack, loading, error });

  // Process tech stack data using the new processor
  const processedTechStack = useMemo(() => {
    if (!techStack) {
      console.log('🔧 [AnalysisTechStack] No techStack data provided');
      return null;
    }

    console.log('🔧 [AnalysisTechStack] Processing techStack data:', techStack);
    
    // Use the new data processor
    const processed = processTechStackData(techStack);
    
    if (!processed) {
      console.log('🔧 [AnalysisTechStack] Failed to process tech stack data');
      return null;
    }

    console.log('🔧 [AnalysisTechStack] Processed data:', processed);
    return processed;
  }, [techStack]);

  // Generate chart data for file types
  const fileTypeChartData = useMemo(() => {
    if (!processedTechStack?.structure?.fileTypes) return null;

    const sortedTypes = Object.entries(processedTechStack.structure.fileTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10); // Top 10 file types

    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
    ];

    return {
      labels: sortedTypes.map(([type]) => type),
      datasets: [{
        data: sortedTypes.map(([, count]) => count),
        backgroundColor: colors.slice(0, sortedTypes.length),
        borderColor: colors.slice(0, sortedTypes.length).map(color => color + '80'),
        borderWidth: 2
      }]
    };
  }, [processedTechStack]);

  // Generate chart data for technology categories
  const categoryChartData = useMemo(() => {
    if (!processedTechStack?.categories) return null;

    const categories = Object.entries(processedTechStack.categories)
      .filter(([, technologies]) => technologies.length > 0)
      .sort(([,a], [,b]) => b.length - a.length);

    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe',
      '#00f2fe', '#43e97b', '#38f9d7', '#fa709a', '#fee140'
    ];

    return {
      labels: categories.map(([category]) => category.replace(/\b\w/g, l => l.toUpperCase())),
      datasets: [{
        data: categories.map(([, technologies]) => technologies.length),
        backgroundColor: colors.slice(0, categories.length),
        borderColor: colors.slice(0, categories.length).map(color => color + '80'),
        borderWidth: 2
      }]
    };
  }, [processedTechStack]);

  // Generate chart data for confidence levels
  const confidenceChartData = useMemo(() => {
    if (!processedTechStack?.metrics?.technologiesByConfidence) return null;

    const confidenceData = Object.entries(processedTechStack.metrics.technologiesByConfidence)
      .sort(([a], [b]) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a] - order[b];
      });

    const colors = {
      high: '#4CAF50',
      medium: '#FF9800',
      low: '#F44336'
    };

    return {
      labels: confidenceData.map(([confidence]) => confidence.charAt(0).toUpperCase() + confidence.slice(1)),
      datasets: [{
        data: confidenceData.map(([, count]) => count),
        backgroundColor: confidenceData.map(([confidence]) => colors[confidence]),
        borderColor: confidenceData.map(([confidence]) => colors[confidence] + '80'),
        borderWidth: 2
      }]
    };
  }, [processedTechStack]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'framework': return '⚡';
      case 'library': return '📚';
      case 'tool': return '🛠️';
      case 'runtime': return '🟢';
      case 'database': return '🗄️';
      case 'testing': return '🧪';
      case 'other': return '📦';
      default: return '📋';
    }
  };

  const getConfidenceIcon = (confidence) => {
    switch (confidence) {
      case 'high': return '🟢';
      case 'medium': return '🟡';
      case 'low': return '🔴';
      default: return '⚪';
    }
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'high': return 'high-confidence';
      case 'medium': return 'medium-confidence';
      case 'low': return 'low-confidence';
      default: return 'unknown-confidence';
    }
  };

  const getProjectTypeIcon = (type) => {
    if (!type) return '📁'; // Handle undefined/null type
    
    switch (type.toLowerCase()) {
      case 'react': return '⚛️';
      case 'vue': return '💚';
      case 'angular': return '🅰️';
      case 'node': return '🟢';
      case 'python': return '🐍';
      case 'java': return '☕';
      case 'php': return '🐘';
      case 'ruby': return '💎';
      case 'go': return '🐹';
      case 'rust': return '🦀';
      default: return '📁';
    }
  };

  const getUpdateStatusIcon = (isOutdated) => {
    return isOutdated ? '⚠️' : '✅';
  };

  const getUpdateStatusColor = (isOutdated) => {
    return isOutdated ? 'outdated' : 'up-to-date';
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category === selectedCategory ? 'all' : category);
  };

  const handleConfidenceSelect = (confidence) => {
    setSelectedConfidence(confidence === selectedConfidence ? 'all' : confidence);
  };

  const getFilteredTechnologies = () => {
    if (!processedTechStack?.technologies) return [];
    
    let filtered = processedTechStack.technologies;
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(tech => tech.category === selectedCategory);
    }
    
    // Apply confidence filter
    if (selectedConfidence !== 'all') {
      filtered = filtered.filter(tech => tech.confidence === selectedConfidence);
    }
    
    return filtered;
  };

  if (loading) {
    return (
      <div className="analysis-techstack loading">
        <div className="loading-spinner"></div>
        <p>Loading tech stack data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-techstack error">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!processedTechStack) {
    return (
      <div className="analysis-techstack no-data">
        <p>No tech stack data available.</p>
      </div>
    );
  }

  return (
    <div className="analysis-techstack">
      {/* Header */}
      <div className="techstack-header">
        <div className="techstack-title">
          <h3>🔧 Tech Stack</h3>
          <div className="techstack-summary">
            <span className="summary-text">
              {processedTechStack.projectType !== 'unknown' 
                ? `${getProjectTypeIcon(processedTechStack.projectType)} ${processedTechStack.projectType} project`
                : 'Project type unknown'
              }
            </span>
          </div>
        </div>
        <div className="techstack-actions">
          <div className="view-controls">
            <button
              onClick={() => setActiveView('overview')}
              className={`view-btn ${activeView === 'overview' ? 'active' : ''}`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setActiveView('technologies')}
              className={`view-btn ${activeView === 'technologies' ? 'active' : ''}`}
            >
              🛠️ Technologies
            </button>
            <button
              onClick={() => setActiveView('dependencies')}
              className={`view-btn ${activeView === 'dependencies' ? 'active' : ''}`}
            >
              📦 Dependencies
            </button>
            <button
              onClick={() => setActiveView('files')}
              className={`view-btn ${activeView === 'files' ? 'active' : ''}`}
            >
              📁 Files
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="techstack-statistics">
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Total Technologies:</span>
            <span className="stat-value">{processedTechStack.metrics?.totalTechnologies || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">High Confidence:</span>
            <span className="stat-value high-confidence">{processedTechStack.metrics?.technologiesByConfidence?.high || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Outdated:</span>
            <span className="stat-value outdated">{processedTechStack.metrics?.outdatedCount || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">File Types:</span>
            <span className="stat-value">{Object.keys(processedTechStack.structure?.fileTypes || {}).length}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="techstack-content">
        {activeView === 'overview' && (
          <div className="overview-view">
            <div className="charts-grid">
              <div className="chart-container">
                <h4>🛠️ Technology Categories</h4>
                {categoryChartData ? (
                  <div className="chart-wrapper">
                    <Pie data={categoryChartData} options={chartOptions} />
                  </div>
                ) : (
                  <div className="no-chart-data">
                    <p>No technology data available</p>
                  </div>
                )}
              </div>
              
              <div className="chart-container">
                <h4>📊 Confidence Levels</h4>
                {confidenceChartData ? (
                  <div className="chart-wrapper">
                    <Pie data={confidenceChartData} options={chartOptions} />
                  </div>
                ) : (
                  <div className="no-chart-data">
                    <p>No confidence data available</p>
                  </div>
                )}
              </div>
              
              <div className="chart-container">
                <h4>📁 File Type Distribution</h4>
                {fileTypeChartData ? (
                  <div className="chart-wrapper">
                    <Pie data={fileTypeChartData} options={chartOptions} />
                  </div>
                ) : (
                  <div className="no-chart-data">
                    <p>No file type data available</p>
                  </div>
                )}
              </div>
            </div>

            {processedTechStack.metrics?.outdatedCount > 0 && (
              <div className="outdated-section">
                <h4>⚠️ Outdated Technologies</h4>
                <div className="outdated-list">
                  {processedTechStack.technologies
                    .filter(tech => tech.isOutdated)
                    .slice(0, 5)
                    .map((tech, index) => (
                      <div key={index} className="outdated-item">
                        <span className="package-name">{tech.name}</span>
                        <span className="version-info">
                          {tech.version} → {tech.latestVersion || 'Unknown'}
                        </span>
                      </div>
                    ))}
                  {processedTechStack.metrics.outdatedCount > 5 && (
                    <div className="more-outdated">
                      +{processedTechStack.metrics.outdatedCount - 5} more outdated technologies
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'technologies' && (
          <div className="technologies-view">
            {/* Filters */}
            <div className="filters-section">
              <div className="filter-group">
                <label>Category:</label>
                <div className="filter-buttons">
                  <button
                    onClick={() => handleCategorySelect('all')}
                    className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                  >
                    All ({processedTechStack.technologies.length})
                  </button>
                  {Object.entries(processedTechStack.categories).map(([category, technologies]) => (
                    <button
                      key={category}
                      onClick={() => handleCategorySelect(category)}
                      className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
                    >
                      {getCategoryIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1)} ({technologies.length})
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="filter-group">
                <label>Confidence:</label>
                <div className="filter-buttons">
                  <button
                    onClick={() => handleConfidenceSelect('all')}
                    className={`filter-btn ${selectedConfidence === 'all' ? 'active' : ''}`}
                  >
                    All ({processedTechStack.technologies.length})
                  </button>
                  {Object.entries(processedTechStack.metrics?.technologiesByConfidence || {}).map(([confidence, count]) => (
                    <button
                      key={confidence}
                      onClick={() => handleConfidenceSelect(confidence)}
                      className={`filter-btn ${selectedConfidence === confidence ? 'active' : ''}`}
                    >
                      {getConfidenceIcon(confidence)} {confidence.charAt(0).toUpperCase() + confidence.slice(1)} ({count})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Technologies List */}
            <div className="technologies-list">
              {getFilteredTechnologies().map((tech, index) => (
                <div key={index} className="technology-item">
                  <div className="technology-info">
                    <div className="technology-header">
                      <span className="technology-name">{tech.name}</span>
                      <span className={`confidence-badge ${getConfidenceColor(tech.confidence)}`}>
                        {getConfidenceIcon(tech.confidence)} {tech.confidence}
                      </span>
                    </div>
                    <div className="technology-details">
                      <span className="technology-version">v{tech.version}</span>
                      <span className="technology-category">
                        {getCategoryIcon(tech.category)} {tech.category}
                      </span>
                      {tech.isOutdated && (
                        <span className="outdated-badge">
                          ⚠️ Outdated {tech.latestVersion && `(v${tech.latestVersion} available)`}
                        </span>
                      )}
                    </div>
                    {tech.description && (
                      <p className="technology-description">{tech.description}</p>
                    )}
                  </div>
                  <div className="technology-actions">
                    {tech.homepage && (
                      <a href={tech.homepage} target="_blank" rel="noopener noreferrer" className="action-link">
                        🌐 Homepage
                      </a>
                    )}
                    {tech.repository && (
                      <a href={tech.repository} target="_blank" rel="noopener noreferrer" className="action-link">
                        📦 Repository
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'dependencies' && (
          <div className="dependencies-view">
            {/* Category Filter */}
            <div className="category-filter">
              <button
                onClick={() => handleCategorySelect('all')}
                className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
              >
                📦 All ({Object.values(processedTechStack.categories).flat().length})
              </button>
              {Object.entries(processedTechStack.categories).map(([category, technologies]) => (
                <button
                  key={category}
                  onClick={() => handleCategorySelect(category)}
                  className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                >
                  {getCategoryIcon(category)} {category.replace(/\b\w/g, l => l.toUpperCase())} ({technologies.length})
                </button>
              ))}
            </div>

            {/* Dependencies List */}
            <div className="dependencies-list">
              {getFilteredTechnologies().map((tech, index) => (
                <div key={index} className="dependency-item">
                  <div className="dependency-info">
                    <span className="package-name">{tech.name}</span>
                    <span className="package-version">{tech.version}</span>
                  </div>
                  <div className="dependency-status">
                    <span className={`status-badge ${getUpdateStatusColor(tech.isOutdated)}`}>
                      {getUpdateStatusIcon(tech.isOutdated)} {tech.isOutdated ? 'Outdated' : 'Up to date'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'files' && (
          <div className="files-view">
            <div className="file-types-grid">
              {Object.entries(processedTechStack.structure?.fileTypes || {})
                .sort(([,a], [,b]) => b - a)
                .map(([type, count]) => (
                  <div key={type} className="file-type-item">
                    <div className="file-type-icon">
                      {type === 'js' ? '📄' : 
                       type === 'ts' ? '📘' : 
                       type === 'jsx' ? '⚛️' : 
                       type === 'tsx' ? '⚛️' : 
                       type === 'css' ? '🎨' : 
                       type === 'scss' ? '🎨' : 
                       type === 'json' ? '📋' : 
                       type === 'md' ? '📝' : 
                       type === 'html' ? '🌐' : '📁'}
                    </div>
                    <div className="file-type-info">
                      <span className="file-type-name">.{type}</span>
                      <span className="file-type-count">{count} files</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* No Data Message */}
      {(!processedTechStack.metrics?.totalTechnologies && !Object.keys(processedTechStack.structure?.fileTypes || {}).length) && (
        <div className="no-data-message">
          <p>No tech stack information available. Run an analysis to see technology details.</p>
        </div>
      )}
    </div>
  );
};

export default AnalysisTechStack; 