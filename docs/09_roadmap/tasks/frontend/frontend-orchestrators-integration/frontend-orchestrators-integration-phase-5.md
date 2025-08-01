# Frontend Orchestrators Integration - Phase 5: Charts & Metrics Enhancement

## 📋 Phase Overview
- **Phase**: 5
- **Name**: Charts & Metrics Enhancement
- **Objective**: Add category-based charts and metrics visualization for orchestrator data
- **Estimated Time**: 1 hour
- **Status**: Pending
- **Created**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
- **Last Updated**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]

## 🎯 Objectives
- [ ] Update AnalysisCharts to support category-based visualizations
- [ ] Enhance AnalysisMetrics to display orchestrator metrics data
- [ ] Add orchestrator score visualizations
- [ ] Implement category comparison charts
- [ ] Add interactive chart filtering and drill-down

## 📁 Files to Modify
- [ ] `frontend/src/presentation/components/analysis/AnalysisCharts.jsx` - Add category-based charts
- [ ] `frontend/src/presentation/components/analysis/AnalysisMetrics.jsx` - Support orchestrator metrics

## 📁 Files to Create
- [ ] `frontend/src/presentation/components/analysis/CategoryScoreChart.jsx` - Orchestrator score visualization
- [ ] `frontend/src/presentation/components/analysis/CategoryComparisonChart.jsx` - Category comparison chart
- [ ] `frontend/src/utils/chartDataProcessor.js` - Chart data processing utilities

## 🔧 Implementation Tasks

### Task 1: Update AnalysisCharts
**File**: `frontend/src/presentation/components/analysis/AnalysisCharts.jsx`

**Implementation**:
```javascript
// ✅ NEW: Support category-based charts
const AnalysisCharts = ({ data, history, filters, loading, categories = null }) => {
  const [activeChart, setActiveChart] = useState('trends');
  const [chartData, setChartData] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const chartsRef = useRef(null);

  // ✅ NEW: Get available categories
  const availableCategories = useMemo(() => {
    if (categories) return Object.keys(categories);
    if (data?.categories) return Object.keys(data.categories);
    return ['security', 'performance', 'architecture', 'code-quality', 'dependencies', 'manifest', 'tech-stack'];
  }, [categories, data]);

  useEffect(() => {
    generateChartData();
  }, [history, filters, selectedCategory, categories]);

  const generateChartData = () => {
    const filteredHistory = filterHistory(history || [], filters);
    
    // ✅ NEW: Generate category-specific chart data
    if (selectedCategory === 'all') {
      // Generate trends chart data for all categories
      const trendsData = generateCategoryTrendsData(filteredHistory);
      
      // Generate types chart data for all categories
      const typesData = generateCategoryTypesData(filteredHistory);
      
      // Generate distribution chart data for all categories
      const distributionData = generateCategoryDistributionData(filteredHistory);
      
      // Generate activity chart data for all categories
      const activityData = generateCategoryActivityData(filteredHistory);

      setChartData({
        trends: trendsData,
        types: typesData,
        distribution: distributionData,
        activity: activityData
      });
    } else {
      // Generate category-specific chart data
      const categoryTrendsData = generateSingleCategoryTrendsData(filteredHistory, selectedCategory);
      const categoryTypesData = generateSingleCategoryTypesData(filteredHistory, selectedCategory);
      const categoryDistributionData = generateSingleCategoryDistributionData(filteredHistory, selectedCategory);
      const categoryActivityData = generateSingleCategoryActivityData(filteredHistory, selectedCategory);

      setChartData({
        trends: categoryTrendsData,
        types: categoryTypesData,
        distribution: categoryDistributionData,
        activity: categoryActivityData
      });
    }
  };

  // ✅ NEW: Generate category trends data
  const generateCategoryTrendsData = (history) => {
    const categories = availableCategories;
    const datasets = categories.map(category => {
      const categoryData = history.filter(item => 
        item.analysis_type === category || item.category === category
      );
      
      return {
        label: category.replace('-', ' ').toUpperCase(),
        data: categoryData.map(item => ({
          x: new Date(item.timestamp || item.created_at),
          y: item.score || item.metrics?.score || 0
        })),
        borderColor: getCategoryColor(category),
        backgroundColor: getCategoryColor(category, 0.1),
        tension: 0.4
      };
    });

    return {
      labels: history.map(item => new Date(item.timestamp || item.created_at)),
      datasets
    };
  };

  // ✅ NEW: Generate category types data
  const generateCategoryTypesData = (history) => {
    const categoryCounts = {};
    
    history.forEach(item => {
      const category = item.analysis_type || item.category || 'unknown';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    return {
      labels: Object.keys(categoryCounts).map(cat => cat.replace('-', ' ').toUpperCase()),
      datasets: [{
        data: Object.values(categoryCounts),
        backgroundColor: Object.keys(categoryCounts).map(cat => getCategoryColor(cat)),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };
  };

  // ✅ NEW: Generate category distribution data
  const generateCategoryDistributionData = (history) => {
    const scoreRanges = {
      'Excellent (90-100)': 0,
      'Good (80-89)': 0,
      'Fair (70-79)': 0,
      'Poor (60-69)': 0,
      'Critical (0-59)': 0
    };

    history.forEach(item => {
      const score = item.score || item.metrics?.score || 0;
      if (score >= 90) scoreRanges['Excellent (90-100)']++;
      else if (score >= 80) scoreRanges['Good (80-89)']++;
      else if (score >= 70) scoreRanges['Fair (70-79)']++;
      else if (score >= 60) scoreRanges['Poor (60-69)']++;
      else scoreRanges['Critical (0-59)']++;
    });

    return {
      labels: Object.keys(scoreRanges),
      datasets: [{
        data: Object.values(scoreRanges),
        backgroundColor: ['#10B981', '#34D399', '#FBBF24', '#F59E0B', '#EF4444'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };
  };

  // ✅ NEW: Get category color
  const getCategoryColor = (category, alpha = 1) => {
    const colors = {
      'security': `rgba(239, 68, 68, ${alpha})`,
      'performance': `rgba(59, 130, 246, ${alpha})`,
      'architecture': `rgba(16, 185, 129, ${alpha})`,
      'code-quality': `rgba(245, 158, 11, ${alpha})`,
      'dependencies': `rgba(139, 92, 246, ${alpha})`,
      'manifest': `rgba(236, 72, 153, ${alpha})`,
      'tech-stack': `rgba(14, 165, 233, ${alpha})`
    };
    return colors[category] || `rgba(156, 163, 175, ${alpha})`;
  };

  return (
    <div className="analysis-charts" ref={chartsRef}>
      {/* ✅ NEW: Category selector */}
      <div className="chart-controls">
        <div className="category-selector">
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {availableCategories.map(category => (
              <option key={category} value={category}>
                {category.replace('-', ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="chart-type-selector">
          <button 
            className={activeChart === 'trends' ? 'active' : ''}
            onClick={() => setActiveChart('trends')}
          >
            Trends
          </button>
          <button 
            className={activeChart === 'types' ? 'active' : ''}
            onClick={() => setActiveChart('types')}
          >
            Types
          </button>
          <button 
            className={activeChart === 'distribution' ? 'active' : ''}
            onClick={() => setActiveChart('distribution')}
          >
            Distribution
          </button>
          <button 
            className={activeChart === 'activity' ? 'active' : ''}
            onClick={() => setActiveChart('activity')}
          >
            Activity
          </button>
        </div>
      </div>

      {/* ✅ NEW: Enhanced chart display */}
      <div className="chart-container">
        {loading ? (
          <div className="chart-loading">Loading chart data...</div>
        ) : (
          <>
            {activeChart === 'trends' && (
              <Line 
                data={chartData.trends} 
                options={{
                  responsive: true,
                  plugins: {
                    title: {
                      display: true,
                      text: selectedCategory === 'all' ? 'Analysis Trends by Category' : `${selectedCategory.replace('-', ' ').toUpperCase()} Trends`
                    },
                    legend: {
                      display: selectedCategory === 'all'
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100
                    }
                  }
                }}
              />
            )}
            
            {activeChart === 'types' && (
              <Pie 
                data={chartData.types} 
                options={{
                  responsive: true,
                  plugins: {
                    title: {
                      display: true,
                      text: 'Analysis Distribution by Category'
                    }
                  }
                }}
              />
            )}
            
            {activeChart === 'distribution' && (
              <Bar 
                data={chartData.distribution} 
                options={{
                  responsive: true,
                  plugins: {
                    title: {
                      display: true,
                      text: 'Score Distribution'
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }}
              />
            )}
            
            {activeChart === 'activity' && (
              <Line 
                data={chartData.activity} 
                options={{
                  responsive: true,
                  plugins: {
                    title: {
                      display: true,
                      text: 'Analysis Activity Over Time'
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
```

### Task 2: Update AnalysisMetrics
**File**: `frontend/src/presentation/components/analysis/AnalysisMetrics.jsx`

**Implementation**:
```javascript
// ✅ NEW: Support orchestrator metrics data
const AnalysisMetrics = ({ metrics, loading, category = 'all' }) => {
  // ✅ NEW: Process orchestrator metrics data
  const processedMetrics = useMemo(() => {
    if (!metrics) return null;

    // Handle orchestrator data structure
    if (metrics.category && metrics.metrics) {
      return processOrchestratorMetrics(metrics.metrics, metrics.category);
    }

    // Handle legacy data structure (fallback)
    if (metrics.score || metrics.totalIssues || metrics.recommendations) {
      return processLegacyMetrics(metrics);
    }

    // Handle category-specific metrics
    if (typeof metrics === 'object' && !Array.isArray(metrics)) {
      return processCategoryMetrics(metrics, category);
    }

    return null;
  }, [metrics, category]);

  // ✅ NEW: Category-specific state
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [timeRange, setTimeRange] = useState('7d');

  // ✅ NEW: Get available metrics
  const availableMetrics = useMemo(() => {
    if (!processedMetrics) return [];
    
    const metrics = ['overview'];
    if (processedMetrics.performance) metrics.push('performance');
    if (processedMetrics.quality) metrics.push('quality');
    if (processedMetrics.security) metrics.push('security');
    if (processedMetrics.complexity) metrics.push('complexity');
    if (processedMetrics.coverage) metrics.push('coverage');
    
    return metrics;
  }, [processedMetrics]);

  return (
    <div className="analysis-metrics">
      {/* ✅ NEW: Category-specific header */}
      <div className="metrics-header">
        <h3>Analysis Metrics</h3>
        {category !== 'all' && (
          <span className="category-badge">
            {category.replace('-', ' ').toUpperCase()}
          </span>
        )}
      </div>

      {/* ✅ NEW: Metric selector */}
      <div className="metric-selector">
        <select value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value)}>
          {availableMetrics.map(metric => (
            <option key={metric} value={metric}>
              {metric.charAt(0).toUpperCase() + metric.slice(1)}
            </option>
          ))}
        </select>

        <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
          <option value="1y">Last Year</option>
        </select>
      </div>

      {/* ✅ NEW: Enhanced metrics display */}
      <div className="metrics-content">
        {loading ? (
          <div className="metrics-loading">Loading metrics...</div>
        ) : (
          <>
            {selectedMetric === 'overview' && (
              <MetricsOverview 
                metrics={processedMetrics}
                category={category}
                timeRange={timeRange}
              />
            )}
            
            {selectedMetric === 'performance' && (
              <PerformanceMetrics 
                metrics={processedMetrics?.performance}
                timeRange={timeRange}
              />
            )}
            
            {selectedMetric === 'quality' && (
              <QualityMetrics 
                metrics={processedMetrics?.quality}
                timeRange={timeRange}
              />
            )}
            
            {selectedMetric === 'security' && (
              <SecurityMetrics 
                metrics={processedMetrics?.security}
                timeRange={timeRange}
              />
            )}
            
            {selectedMetric === 'complexity' && (
              <ComplexityMetrics 
                metrics={processedMetrics?.complexity}
                timeRange={timeRange}
              />
            )}
            
            {selectedMetric === 'coverage' && (
              <CoverageMetrics 
                metrics={processedMetrics?.coverage}
                timeRange={timeRange}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ✅ NEW: Metrics Overview Component
const MetricsOverview = ({ metrics, category, timeRange }) => {
  if (!metrics) return <div>No metrics data available</div>;

  return (
    <div className="metrics-overview">
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-value">{metrics.score || 'N/A'}</div>
          <div className="metric-label">Overall Score</div>
          <div className="metric-trend">
            {metrics.scoreTrend > 0 ? '↗' : metrics.scoreTrend < 0 ? '↘' : '→'} 
            {Math.abs(metrics.scoreTrend || 0)}%
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{metrics.totalIssues || 0}</div>
          <div className="metric-label">Total Issues</div>
          <div className="metric-trend">
            {metrics.issuesTrend > 0 ? '↗' : metrics.issuesTrend < 0 ? '↘' : '→'} 
            {Math.abs(metrics.issuesTrend || 0)}%
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{metrics.recommendations || 0}</div>
          <div className="metric-label">Recommendations</div>
          <div className="metric-trend">
            {metrics.recommendationsTrend > 0 ? '↗' : metrics.recommendationsTrend < 0 ? '↘' : '→'} 
            {Math.abs(metrics.recommendationsTrend || 0)}%
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{metrics.executionTime || 'N/A'}</div>
          <div className="metric-label">Execution Time</div>
          <div className="metric-unit">ms</div>
        </div>
      </div>

      {/* ✅ NEW: Category-specific metrics */}
      {category !== 'all' && metrics.categoryMetrics && (
        <div className="category-specific-metrics">
          <h4>{category.replace('-', ' ').toUpperCase()} Specific Metrics</h4>
          <div className="category-metrics-grid">
            {Object.entries(metrics.categoryMetrics).map(([key, value]) => (
              <div key={key} className="category-metric">
                <div className="metric-name">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                <div className="metric-value">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

### Task 3: Create Category Score Chart
**File**: `frontend/src/presentation/components/analysis/CategoryScoreChart.jsx`

**Implementation**:
```javascript
import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { processCategoryScores } from '@/utils/chartDataProcessor';

const CategoryScoreChart = ({ categories, loading, error }) => {
  const chartData = useMemo(() => {
    if (!categories || Object.keys(categories).length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          data: [1],
          backgroundColor: ['#E5E7EB'],
          borderWidth: 0
        }]
      };
    }

    return processCategoryScores(categories);
  }, [categories]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed;
            return `${label}: ${value}%`;
          }
        }
      }
    },
    cutout: '60%'
  };

  if (loading) {
    return (
      <div className="category-score-chart loading">
        <div className="loading-spinner">Loading scores...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="category-score-chart error">
        <div className="error-message">Failed to load category scores</div>
      </div>
    );
  }

  return (
    <div className="category-score-chart">
      <h3>Category Scores Overview</h3>
      <div className="chart-container">
        <Doughnut data={chartData} options={options} />
      </div>
      <div className="score-summary">
        {Object.entries(categories).map(([category, data]) => (
          <div key={category} className="score-item">
            <div className="score-color" style={{ backgroundColor: getCategoryColor(category) }}></div>
            <div className="score-info">
              <div className="score-category">{category.replace('-', ' ').toUpperCase()}</div>
              <div className="score-value">{data.score || 0}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryScoreChart;
```

### Task 4: Create Chart Data Processor
**File**: `frontend/src/utils/chartDataProcessor.js`

**Implementation**:
```javascript
// ✅ NEW: Process category scores for charts
export const processCategoryScores = (categories) => {
  const labels = [];
  const data = [];
  const colors = [];

  Object.entries(categories).forEach(([category, categoryData]) => {
    labels.push(category.replace('-', ' ').toUpperCase());
    data.push(categoryData.score || 0);
    colors.push(getCategoryColor(category));
  });

  return {
    labels,
    datasets: [{
      data,
      backgroundColor: colors,
      borderWidth: 2,
      borderColor: '#fff',
      hoverBorderWidth: 3
    }]
  };
};

// ✅ NEW: Process orchestrator metrics for charts
export const processOrchestratorMetrics = (metrics, category) => {
  if (!metrics || typeof metrics !== 'object') return null;

  return {
    score: metrics.score || 0,
    totalIssues: metrics.totalIssues || 0,
    recommendations: metrics.recommendations || 0,
    executionTime: metrics.executionTime || 0,
    scoreTrend: metrics.scoreTrend || 0,
    issuesTrend: metrics.issuesTrend || 0,
    recommendationsTrend: metrics.recommendationsTrend || 0,
    categoryMetrics: metrics.categoryMetrics || {},
    timestamp: metrics.timestamp || new Date().toISOString()
  };
};

// ✅ NEW: Process category metrics
export const processCategoryMetrics = (data, category) => {
  switch (category) {
    case 'code-quality':
      return processCodeQualityMetrics(data);
    case 'security':
      return processSecurityMetrics(data);
    case 'performance':
      return processPerformanceMetrics(data);
    case 'architecture':
      return processArchitectureMetrics(data);
    case 'dependencies':
      return processDependencyMetrics(data);
    case 'manifest':
      return processManifestMetrics(data);
    case 'tech-stack':
      return processTechStackMetrics(data);
    default:
      return processGenericMetrics(data);
  }
};

// ✅ NEW: Get category color
const getCategoryColor = (category) => {
  const colors = {
    'security': '#EF4444',
    'performance': '#3B82F6',
    'architecture': '#10B981',
    'code-quality': '#F59E0B',
    'dependencies': '#8B5CF6',
    'manifest': '#EC4899',
    'tech-stack': '#0EA5E9'
  };
  return colors[category] || '#9CA3AF';
};
```

## ✅ Success Criteria
- [ ] AnalysisCharts supports category-based visualizations
- [ ] AnalysisMetrics displays orchestrator metrics data correctly
- [ ] Category score visualizations working
- [ ] Category comparison charts implemented
- [ ] Interactive chart filtering and drill-down functional
- [ ] All chart types render correctly with orchestrator data
- [ ] Performance optimized for large datasets

## 🔍 Validation Steps
1. **Chart Rendering**: Verify all chart types render with new data
2. **Category Filtering**: Test category-based chart filtering
3. **Data Processing**: Validate chart data processing functions
4. **Performance**: Check chart performance with large datasets
5. **Interactivity**: Test chart interactions and drill-down

## 📊 Progress Tracking
- **Status**: Pending
- **Progress**: 0%
- **Next Phase**: Phase 6 - New Category Components

## 🔗 Dependencies
- Phase 1: API Repository Extension (completed)
- Phase 2: Global State Extension (completed)
- Phase 3: Core Components Update (completed)
- Phase 4: Tech Stack & Architecture (completed)
- Existing chart and metrics components
- Chart.js library

## 📝 Notes
- Focus on chart and metrics visualization enhancements
- Implement category-based chart filtering
- Add orchestrator score visualizations
- Optimize performance for large datasets
- Test all chart interactions before proceeding to Phase 6

---

**Next**: [Phase 6 - New Category Components](./frontend-orchestrators-integration-phase-6.md) 