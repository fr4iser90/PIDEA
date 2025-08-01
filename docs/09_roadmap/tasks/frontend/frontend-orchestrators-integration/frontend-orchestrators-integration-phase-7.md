# Frontend Orchestrators Integration – Phase 7: Charts & Metrics Enhancement

## Overview
Enhance the analysis charts and metrics components to support the new orchestrator data structure and provide category-based visualizations. This phase focuses on updating the AnalysisCharts and AnalysisMetrics components to display orchestrator scores, trends, and category comparisons.

## Objectives
- [ ] Update AnalysisCharts component for category-based visualizations
- [ ] Enhance AnalysisMetrics component for orchestrator data
- [ ] Add orchestrator score visualizations
- [ ] Implement category comparison charts
- [ ] Add interactive chart filtering
- [ ] Create trend analysis for each category

## Deliverables
- File: `frontend/src/presentation/components/analysis/AnalysisCharts.jsx` - Enhanced with category-based charts
- File: `frontend/src/presentation/components/analysis/AnalysisMetrics.jsx` - Enhanced with orchestrator metrics
- File: `frontend/src/utils/orchestratorDataProcessor.js` - Chart data processing utilities
- File: `frontend/src/css/components/analysis/orchestrator-views.css` - Chart styling
- API: Chart data processing for all 7 categories
- Test: Unit tests for chart components

## Dependencies
- Requires: Phase 1-6 completion (API repository, global state, and component updates)
- Blocks: Phase 8 start

## Estimated Time
0.5 hours

## Success Criteria
- [ ] All 7 categories display in charts correctly
- [ ] Orchestrator scores visualized properly
- [ ] Category comparison charts working
- [ ] Interactive filtering functional
- [ ] Trend analysis implemented
- [ ] Performance optimized for large datasets
- [ ] Responsive design maintained
- [ ] Unit tests passing

## Implementation Details

### AnalysisCharts Component Updates
```javascript
// Enhanced chart configuration for orchestrator data
const categoryChartConfig = {
  security: { color: '#ff4444', label: 'Security Analysis' },
  performance: { color: '#44ff44', label: 'Performance Analysis' },
  architecture: { color: '#4444ff', label: 'Architecture Analysis' },
  'code-quality': { color: '#ffff44', label: 'Code Quality Analysis' },
  dependencies: { color: '#ff44ff', label: 'Dependency Analysis' },
  manifest: { color: '#44ffff', label: 'Manifest Analysis' },
  'tech-stack': { color: '#ff8844', label: 'Tech Stack Analysis' }
};

// Category-based chart data processing
const processCategoryChartData = (analysisData) => {
  return Object.entries(analysisData.categories).map(([category, data]) => ({
    category,
    score: data.score,
    issues: data.summary?.totalIssues || 0,
    recommendations: data.recommendations?.length || 0,
    config: categoryChartConfig[category]
  }));
};
```

### AnalysisMetrics Component Updates
```javascript
// Enhanced metrics display for orchestrator data
const OrchestratorMetrics = ({ analysisData }) => {
  const metrics = useMemo(() => {
    const categories = Object.values(analysisData.categories);
    return {
      overallScore: categories.reduce((sum, cat) => sum + cat.score, 0) / categories.length,
      totalIssues: categories.reduce((sum, cat) => sum + (cat.summary?.totalIssues || 0), 0),
      totalRecommendations: categories.reduce((sum, cat) => sum + (cat.recommendations?.length || 0), 0),
      executionTime: categories.reduce((sum, cat) => sum + (cat.executionTime || 0), 0)
    };
  }, [analysisData]);

  return (
    <div className="orchestrator-metrics">
      <MetricCard title="Overall Score" value={`${metrics.overallScore.toFixed(1)}%`} />
      <MetricCard title="Total Issues" value={metrics.totalIssues} />
      <MetricCard title="Recommendations" value={metrics.totalRecommendations} />
      <MetricCard title="Execution Time" value={`${(metrics.executionTime / 1000).toFixed(1)}s`} />
    </div>
  );
};
```

### Chart Data Processing Utilities
```javascript
// New utility functions for orchestrator chart data
export const createCategoryComparisonChart = (analysisData) => {
  const categories = Object.entries(analysisData.categories);
  return {
    labels: categories.map(([category]) => categoryChartConfig[category].label),
    datasets: [{
      label: 'Analysis Score',
      data: categories.map(([, data]) => data.score),
      backgroundColor: categories.map(([category]) => categoryChartConfig[category].color),
      borderColor: categories.map(([category]) => categoryChartConfig[category].color),
      borderWidth: 2
    }]
  };
};

export const createTrendAnalysisChart = (historicalData) => {
  // Process historical data for trend visualization
  return {
    labels: historicalData.map(item => new Date(item.timestamp).toLocaleDateString()),
    datasets: Object.keys(categoryChartConfig).map(category => ({
      label: categoryChartConfig[category].label,
      data: historicalData.map(item => item.categories[category]?.score || 0),
      borderColor: categoryChartConfig[category].color,
      backgroundColor: categoryChartConfig[category].color + '20',
      fill: false
    }))
  };
};
```

### Interactive Filtering
```javascript
// Category-based chart filtering
const CategoryChartFilter = ({ selectedCategories, onCategoryChange }) => {
  return (
    <div className="chart-filter">
      {Object.entries(categoryChartConfig).map(([category, config]) => (
        <label key={category} className="filter-option">
          <input
            type="checkbox"
            checked={selectedCategories.includes(category)}
            onChange={(e) => onCategoryChange(category, e.target.checked)}
          />
          <span style={{ color: config.color }}>{config.label}</span>
        </label>
      ))}
    </div>
  );
};
```

## Testing Strategy

### Unit Tests
- [ ] Test chart data processing functions
- [ ] Test metrics calculation logic
- [ ] Test category filtering functionality
- [ ] Test chart configuration validation

### Integration Tests
- [ ] Test chart rendering with orchestrator data
- [ ] Test metrics display with real data
- [ ] Test interactive filtering
- [ ] Test chart responsiveness

## Performance Considerations
- Implement chart data memoization
- Use lazy loading for large datasets
- Optimize chart rendering performance
- Implement efficient data filtering

## Error Handling
- Handle missing category data gracefully
- Provide fallback for chart rendering failures
- Display meaningful error messages
- Implement retry mechanisms for data loading

## Accessibility
- Ensure chart colors meet contrast requirements
- Add ARIA labels for chart elements
- Provide keyboard navigation for filters
- Include screen reader descriptions

## Documentation
- Update component documentation
- Add chart configuration guide
- Document data processing utilities
- Include usage examples 