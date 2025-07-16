import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useMemo } from 'react';
import { Pie } from 'react-chartjs-2';
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
import '@/css/components/analysis/analysis-techstack.css';

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

  // Add debugging
  console.log('🔧 [AnalysisTechStack] Received props:', { techStack, loading, error });

  // Process tech stack data from backend structure
  const processedTechStack = useMemo(() => {
    if (!techStack) {
      console.log('🔧 [AnalysisTechStack] No techStack data provided');
      return null;
    }

    console.log('🔧 [AnalysisTechStack] Processing techStack data:', techStack);
    console.log('🔧 [AnalysisTechStack] techStack.dependencies:', techStack.dependencies);
    console.log('🔧 [AnalysisTechStack] techStack.structure:', techStack.structure);

    // Extract dependencies and structure
    const dependencies = techStack.dependencies || {};
    const structure = techStack.structure || {};
    
    // Use structure data if dependencies are empty
    const directDeps = dependencies.direct || {};
    const devDeps = dependencies.dev || {};
    const outdatedDeps = dependencies.outdated || [];
    
    // Extract from structure if dependencies are empty
    const frameworks = structure.frameworks || [];
    const libraries = structure.libraries || [];
    
    // Convert frameworks and libraries to dependency format for processing
    const structureDeps = {};
    frameworks.forEach(fw => {
      structureDeps[fw.name] = fw.version;
    });
    libraries.forEach(lib => {
      structureDeps[lib.name] = lib.version;
    });
    
    // Use structure dependencies if direct dependencies are empty
    const effectiveDeps = Object.keys(directDeps).length > 0 ? directDeps : structureDeps;
    
    console.log('🔧 [AnalysisTechStack] Direct deps:', directDeps);
    console.log('🔧 [AnalysisTechStack] Structure deps:', structureDeps);
    console.log('🔧 [AnalysisTechStack] Effective deps:', effectiveDeps);
    console.log('🔧 [AnalysisTechStack] Dev deps:', devDeps);
    console.log('🔧 [AnalysisTechStack] Outdated deps:', outdatedDeps);

    // Extract structure
    const projectType = structure.projectType || 'unknown';
    const fileTypes = structure.fileTypes || {};

    console.log('🔧 [AnalysisTechStack] Project type:', projectType);
    console.log('🔧 [AnalysisTechStack] File types:', fileTypes);
    console.log('🔧 [AnalysisTechStack] Frameworks:', frameworks);
    console.log('🔧 [AnalysisTechStack] Libraries:', libraries);

    const categories = {
      frameworks: ['react', 'vue', 'angular', 'express', 'fastify', 'koa', 'next', 'nuxt', 'gatsby'],
      databases: ['mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'mariadb', 'oracle'],
      testing: ['jest', 'mocha', 'cypress', 'playwright', 'puppeteer', 'selenium', 'vitest'],
      buildTools: ['webpack', 'vite', 'rollup', 'esbuild', 'parcel', 'gulp', 'grunt'],
      linting: ['eslint', 'prettier', 'stylelint', 'tslint', 'husky', 'lint-staged'],
      utilities: ['lodash', 'moment', 'dayjs', 'axios', 'fetch', 'uuid', 'crypto'],
      ui: ['tailwind', 'bootstrap', 'material-ui', 'antd', 'chakra', 'semantic-ui'],
      state: ['redux', 'mobx', 'zustand', 'recoil', 'jotai', 'valtio']
    };

    const categorized = {};
    Object.entries(categories).forEach(([category, keywords]) => {
      if (effectiveDeps) {
        categorized[category] = Object.entries(effectiveDeps)
          .filter(([pkg]) => keywords.some(keyword => pkg.toLowerCase().includes(keyword)))
          .map(([pkg, version]) => ({ 
            name: pkg, 
            version,
            isOutdated: outdatedDeps.some(o => o.name === pkg) || false
          }));
      }
    });

    // Add uncategorized dependencies
    const categorizedPackages = new Set();
    Object.values(categorized).forEach(packages => {
      packages.forEach(pkg => categorizedPackages.add(pkg.name));
    });

    if (effectiveDeps) {
      const uncategorized = Object.entries(effectiveDeps)
        .filter(([pkg]) => !categorizedPackages.has(pkg))
        .map(([pkg, version]) => ({ 
          name: pkg, 
          version,
          isOutdated: outdatedDeps.some(o => o.name === pkg) || false
        }));

      if (uncategorized.length > 0) {
        categorized.other = uncategorized;
      }
    }

    return {
      categorized,
      outdated: outdatedDeps,
      fileTypes: fileTypes,
      projectType: projectType,
      totalDependencies: Object.keys(effectiveDeps).length,
      devDependencies: Object.keys(devDeps).length,
      frameworks: frameworks,
      libraries: libraries
    };
  }, [techStack]);

  // Generate chart data for file types
  const fileTypeChartData = useMemo(() => {
    if (!processedTechStack?.fileTypes) return null;

    const sortedTypes = Object.entries(processedTechStack.fileTypes)
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

  // Generate chart data for dependency categories
  const dependencyChartData = useMemo(() => {
    if (!processedTechStack?.categorized) return null;

    const categories = Object.entries(processedTechStack.categorized)
      .filter(([, packages]) => packages.length > 0)
      .sort(([,a], [,b]) => b.length - a.length);

    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe',
      '#00f2fe', '#43e97b', '#38f9d7', '#fa709a', '#fee140'
    ];

    return {
      labels: categories.map(([category]) => category.replace(/\b\w/g, l => l.toUpperCase())),
      datasets: [{
        data: categories.map(([, packages]) => packages.length),
        backgroundColor: colors.slice(0, categories.length),
        borderColor: colors.slice(0, categories.length).map(color => color + '80'),
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
      case 'frameworks': return '⚡';
      case 'databases': return '🗄️';
      case 'testing': return '🧪';
      case 'buildTools': return '🔨';
      case 'linting': return '📝';
      case 'utilities': return '🛠️';
      case 'ui': return '🎨';
      case 'state': return '📊';
      case 'other': return '📦';
      default: return '📋';
    }
  };

  const getProjectTypeIcon = (type) => {
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

  const getFilteredDependencies = () => {
    if (!processedTechStack?.categorized) return [];
    
    if (selectedCategory === 'all') {
      return Object.values(processedTechStack.categorized).flat();
    }
    
    return processedTechStack.categorized[selectedCategory] || [];
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
            <span className="stat-label">Total Dependencies:</span>
            <span className="stat-value">{processedTechStack.totalDependencies}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Dev Dependencies:</span>
            <span className="stat-value">{processedTechStack.devDependencies}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Outdated:</span>
            <span className="stat-value outdated">{processedTechStack.outdated.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">File Types:</span>
            <span className="stat-value">{Object.keys(processedTechStack.fileTypes).length}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="techstack-content">
        {activeView === 'overview' && (
          <div className="overview-view">
            <div className="charts-grid">
              <div className="chart-container">
                <h4>📦 Dependency Categories</h4>
                {dependencyChartData ? (
                  <div className="chart-wrapper">
                    <Pie data={dependencyChartData} options={chartOptions} />
                  </div>
                ) : (
                  <div className="no-chart-data">
                    <p>No dependency data available</p>
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

            {processedTechStack.outdated.length > 0 && (
              <div className="outdated-section">
                <h4>⚠️ Outdated Dependencies</h4>
                <div className="outdated-list">
                  {processedTechStack.outdated.slice(0, 5).map((dep, index) => (
                    <div key={index} className="outdated-item">
                      <span className="package-name">{dep.name}</span>
                      <span className="version-info">
                        {dep.current} → {dep.latest}
                      </span>
                    </div>
                  ))}
                  {processedTechStack.outdated.length > 5 && (
                    <div className="more-outdated">
                      +{processedTechStack.outdated.length - 5} more outdated packages
                    </div>
                  )}
                </div>
              </div>
            )}
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
                📦 All ({Object.values(processedTechStack.categorized).flat().length})
              </button>
              {Object.entries(processedTechStack.categorized).map(([category, packages]) => (
                <button
                  key={category}
                  onClick={() => handleCategorySelect(category)}
                  className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                >
                  {getCategoryIcon(category)} {category.replace(/\b\w/g, l => l.toUpperCase())} ({packages.length})
                </button>
              ))}
            </div>

            {/* Dependencies List */}
            <div className="dependencies-list">
              {getFilteredDependencies().map((dep, index) => (
                <div key={index} className="dependency-item">
                  <div className="dependency-info">
                    <span className="package-name">{dep.name}</span>
                    <span className="package-version">{dep.version}</span>
                  </div>
                  <div className="dependency-status">
                    <span className={`status-badge ${getUpdateStatusColor(dep.isOutdated)}`}>
                      {getUpdateStatusIcon(dep.isOutdated)} {dep.isOutdated ? 'Outdated' : 'Up to date'}
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
              {Object.entries(processedTechStack.fileTypes)
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
      {(!processedTechStack.totalDependencies && !Object.keys(processedTechStack.fileTypes).length) && (
        <div className="no-data-message">
          <p>No tech stack information available. Run an analysis to see technology details.</p>
        </div>
      )}
    </div>
  );
};

export default AnalysisTechStack; 