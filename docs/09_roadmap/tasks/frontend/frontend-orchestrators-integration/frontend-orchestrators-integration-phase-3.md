# Frontend Orchestrators Integration - Phase 3: AnalysisDataViewer Complete Restructure

## 📋 Phase Overview
- **Phase**: 3
- **Name**: AnalysisDataViewer Complete Restructure
- **Objective**: COMPLETELY RESTRUCTURE AnalysisDataViewer to show 7 category sections
- **Estimated Time**: 2 hours
- **Status**: Ready
- **Created**: 2025-08-01T20:59:25.000Z
- **Last Updated**: 2025-08-01T20:59:25.000Z

## 🎯 Objectives
- [ ] **REMOVE** all old sections: Metrics, Charts, History, Issues, Tech Stack, Architecture, Security Dashboard, Recommendations
- [ ] **CREATE** 7 new category sections: Security, Performance, Architecture, Code Quality, Dependencies, Manifest, Tech Stack
- [ ] Each category section contains: Overview, Issues, Recommendations, Metrics, Charts tabs
- [ ] Use category-based data from global state
- [ ] **NO CATEGORY FILTERS** - each category is independent

## 📁 Files to Modify
- [ ] `frontend/src/presentation/components/analysis/AnalysisDataViewer.jsx` - Complete restructure

## 📁 Files to Create
- [ ] `frontend/src/presentation/components/analysis/CategoryAnalysisSection.jsx` - Generic category section component
- [ ] `frontend/src/presentation/components/analysis/CategoryOverview.jsx` - Category overview component
- [ ] `frontend/src/css/components/analysis/category-analysis.css` - Category-based styling

## 🔧 Implementation Tasks

### Task 1: Complete AnalysisDataViewer Restructure
**File**: `frontend/src/presentation/components/analysis/AnalysisDataViewer.jsx`

**Implementation**:
```javascript
import React, { useEffect } from 'react';
import { 
  useAllCategoriesAnalysis, 
  useActiveIDE, 
  useProjectDataActions 
} from '@/infrastructure/stores/selectors/ProjectSelectors.jsx';
import CategoryAnalysisSection from './CategoryAnalysisSection';
import '@/css/components/analysis/category-analysis.css';

const AnalysisDataViewer = ({ projectId = null, eventBus = null }) => {
  // NEW: Use category-based selectors
  const allCategories = useAllCategoriesAnalysis();
  const activeIDE = useActiveIDE();
  const { loadAnalysisData: loadAnalysisDataFromStore } = useProjectDataActions();

  // NEW: Load all categories data
  useEffect(() => {
    if (activeIDE.workspacePath && !allCategories.hasData) {
      loadAnalysisDataFromStore(activeIDE.workspacePath);
    }
  }, [activeIDE.workspacePath, allCategories.hasData, loadAnalysisDataFromStore]);

  // NEW: Define all 7 categories
  const categories = [
    { key: 'security', name: 'Security Analysis', icon: '🔒' },
    { key: 'performance', name: 'Performance Analysis', icon: '⚡' },
    { key: 'architecture', name: 'Architecture Analysis', icon: '🏗️' },
    { key: 'code-quality', name: 'Code Quality Analysis', icon: '✨' },
    { key: 'dependencies', name: 'Dependencies Analysis', icon: '📦' },
    { key: 'manifest', name: 'Manifest Analysis', icon: '📄' },
    { key: 'tech-stack', name: 'Tech Stack Analysis', icon: '🛠️' }
  ];

  if (allCategories.loading) {
    return (
      <div className="analysis-data-viewer loading">
        <div className="loading-spinner">Loading analysis data...</div>
      </div>
    );
  }

  if (allCategories.error) {
    return (
      <div className="analysis-data-viewer error">
        <div className="error-message">Failed to load analysis data: {allCategories.error}</div>
      </div>
    );
  }

  return (
    <div className="analysis-data-viewer">
      <div className="analysis-header">
        <h1>Analysis Dashboard</h1>
        <div className="analysis-meta">
          <span className="last-update">
            Last updated: {allCategories.lastUpdate ? new Date(allCategories.lastUpdate).toLocaleString() : 'Never'}
          </span>
        </div>
      </div>

      {/* NEW: 7 Category Sections */}
      <div className="category-sections">
        {categories.map(category => (
          <CategoryAnalysisSection
            key={category.key}
            categoryKey={category.key}
            categoryName={category.name}
            categoryIcon={category.icon}
            data={allCategories.categories[category.key]}
            loading={allCategories.loading}
          />
        ))}
      </div>
    </div>
  );
};

export default AnalysisDataViewer;
```

### Task 2: Create CategoryAnalysisSection Component
**File**: `frontend/src/presentation/components/analysis/CategoryAnalysisSection.jsx`

**Implementation**:
```javascript
import React, { useState } from 'react';
import AnalysisIssues from './AnalysisIssues';
import AnalysisRecommendations from './AnalysisRecommendations';
import AnalysisMetrics from './AnalysisMetrics';
import AnalysisCharts from './AnalysisCharts';
import CategoryOverview from './CategoryOverview';

const CategoryAnalysisSection = ({ categoryKey, categoryName, categoryIcon, data, loading }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [expanded, setExpanded] = useState(true);

  const hasData = data && data.hasData;
  const score = data?.score || 0;
  const issuesCount = data?.issues?.length || 0;
  const recommendationsCount = data?.recommendations?.length || 0;

  const tabs = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'issues', label: 'Issues', icon: '⚠️', count: issuesCount },
    { key: 'recommendations', label: 'Recommendations', icon: '💡', count: recommendationsCount },
    { key: 'metrics', label: 'Metrics', icon: '📈' },
    { key: 'charts', label: 'Charts', icon: '📊' }
  ];

  return (
    <div className={`category-section ${categoryKey} ${expanded ? 'expanded' : 'collapsed'}`}>
      {/* Category Header */}
      <div className="category-header" onClick={() => setExpanded(!expanded)}>
        <div className="category-info">
          <span className="category-icon">{categoryIcon}</span>
          <h2 className="category-title">{categoryName}</h2>
          {hasData && (
            <div className="category-stats">
              <span className="score">Score: {score}</span>
              <span className="issues-count">{issuesCount} issues</span>
              <span className="recommendations-count">{recommendationsCount} recommendations</span>
            </div>
          )}
        </div>
        <div className="category-actions">
          <span className="expand-icon">{expanded ? '−' : '+'}</span>
        </div>
      </div>

      {/* Category Content */}
      {expanded && (
        <div className="category-content">
          {/* Tab Navigation */}
          <div className="category-tabs">
            {tabs.map(tab => (
              <button
                key={tab.key}
                className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="tab-count">{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'overview' && (
              <CategoryOverview 
                categoryKey={categoryKey}
                categoryName={categoryName}
                data={data}
                loading={loading}
              />
            )}
            
            {activeTab === 'issues' && (
              <AnalysisIssues 
                issues={data?.issues}
                loading={loading}
                category={categoryKey}
              />
            )}
            
            {activeTab === 'recommendations' && (
              <AnalysisRecommendations 
                recommendations={data?.recommendations}
                loading={loading}
                category={categoryKey}
              />
            )}
            
            {activeTab === 'metrics' && (
              <AnalysisMetrics 
                metrics={data}
                loading={loading}
                category={categoryKey}
              />
            )}
            
            {activeTab === 'charts' && (
              <AnalysisCharts 
                data={data}
                loading={loading}
                category={categoryKey}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryAnalysisSection;
```

### Task 3: Create CategoryOverview Component
**File**: `frontend/src/presentation/components/analysis/CategoryOverview.jsx`

**Implementation**:
```javascript
import React from 'react';

const CategoryOverview = ({ categoryKey, categoryName, data, loading }) => {
  if (loading) {
    return <div className="category-overview loading">Loading {categoryName} data...</div>;
  }

  if (!data || !data.hasData) {
    return (
      <div className="category-overview no-data">
        <div className="no-data-message">
          No {categoryName} analysis data available
        </div>
      </div>
    );
  }

  return (
    <div className="category-overview">
      <div className="overview-grid">
        <div className="overview-card score">
          <div className="card-title">Overall Score</div>
          <div className="card-value">{data.score || 'N/A'}</div>
        </div>
        
        <div className="overview-card issues">
          <div className="card-title">Issues</div>
          <div className="card-value">{data.issues?.length || 0}</div>
        </div>
        
        <div className="overview-card recommendations">
          <div className="card-title">Recommendations</div>
          <div className="card-value">{data.recommendations?.length || 0}</div>
        </div>
        
        <div className="overview-card execution-time">
          <div className="card-title">Execution Time</div>
          <div className="card-value">{data.executionTime || 'N/A'}ms</div>
        </div>
      </div>

      {data.summary?.description && (
        <div className="overview-description">
          <h4>Summary</h4>
          <p>{data.summary.description}</p>
        </div>
      )}
    </div>
  );
};

export default CategoryOverview;
```

### Task 4: Create Category Analysis CSS
**File**: `frontend/src/css/components/analysis/category-analysis.css`

**Implementation**:
```css
/* Analysis Data Viewer */
.analysis-data-viewer {
  padding: 20px;
}

.analysis-header {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.analysis-header h1 {
  margin: 0 0 10px 0;
  color: #1f2937;
  font-size: 2rem;
  font-weight: 700;
}

.analysis-meta {
  color: #6b7280;
  font-size: 0.875rem;
}

/* Category Sections */
.category-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.category-section {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.category-section.collapsed .category-content {
  display: none;
}

/* Category Header */
.category-header {
  padding: 20px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s;
}

.category-header:hover {
  background: #f3f4f6;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.category-icon {
  font-size: 1.5rem;
}

.category-title {
  margin: 0;
  color: #1f2937;
  font-size: 1.25rem;
  font-weight: 600;
}

.category-stats {
  display: flex;
  gap: 15px;
  font-size: 0.875rem;
}

.category-stats .score {
  color: #059669;
  font-weight: 600;
}

.category-stats .issues-count {
  color: #dc2626;
}

.category-stats .recommendations-count {
  color: #2563eb;
}

.expand-icon {
  font-size: 1.25rem;
  color: #6b7280;
  font-weight: bold;
}

/* Category Content */
.category-content {
  padding: 20px;
}

/* Category Tabs */
.category-tabs {
  display: flex;
  gap: 5px;
  margin-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
  overflow-x: auto;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-weight: 500;
  color: #6b7280;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-button:hover {
  color: #374151;
  background: #f3f4f6;
}

.tab-button.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
  background: #eff6ff;
}

.tab-icon {
  font-size: 1rem;
}

.tab-label {
  font-size: 0.875rem;
}

.tab-count {
  background: #6b7280;
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}

.tab-button.active .tab-count {
  background: #3b82f6;
}

/* Tab Content */
.tab-content {
  min-height: 200px;
}

/* Category Overview */
.category-overview {
  padding: 20px 0;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.overview-card {
  padding: 20px;
  background: #f9fafb;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #e5e7eb;
}

.overview-card.score {
  background: #ecfdf5;
  border-color: #10b981;
}

.overview-card.issues {
  background: #fef2f2;
  border-color: #ef4444;
}

.overview-card.recommendations {
  background: #eff6ff;
  border-color: #3b82f6;
}

.overview-card.execution-time {
  background: #fef3c7;
  border-color: #f59e0b;
}

.card-title {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 8px;
  font-weight: 500;
}

.card-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}

.overview-description {
  background: #f9fafb;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.overview-description h4 {
  margin: 0 0 10px 0;
  color: #374151;
  font-size: 1rem;
  font-weight: 600;
}

.overview-description p {
  margin: 0;
  color: #6b7280;
  line-height: 1.6;
}

/* Loading and Error States */
.analysis-data-viewer.loading,
.analysis-data-viewer.error {
  text-align: center;
  padding: 40px;
}

.loading-spinner {
  color: #6b7280;
  font-size: 1.125rem;
}

.error-message {
  color: #dc2626;
  font-size: 1.125rem;
}

.category-overview.loading,
.category-overview.no-data {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

/* Responsive Design */
@media (max-width: 768px) {
  .category-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .category-stats {
    flex-direction: column;
    gap: 5px;
  }

  .category-tabs {
    flex-wrap: wrap;
  }

  .tab-button {
    flex: 1;
    min-width: 120px;
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }
}
```

## ✅ Success Criteria
- [ ] **ALL OLD SECTIONS REMOVED**: Metrics, Charts, History, Issues, Tech Stack, Architecture, Security Dashboard, Recommendations
- [ ] **7 NEW CATEGORY SECTIONS**: Security, Performance, Architecture, Code Quality, Dependencies, Manifest, Tech Stack
- [ ] **EACH CATEGORY HAS**: Overview, Issues, Recommendations, Metrics, Charts tabs
- [ ] **NO CATEGORY FILTERS**: Each category is independent
- [ ] **CATEGORY-BASED DATA**: Uses global state selectors
- [ ] **RESPONSIVE DESIGN**: Works on all screen sizes

## 🔍 Validation Steps
1. **Old Sections Removed**: Verify old sections are completely removed
2. **New Categories**: Test all 7 category sections render correctly
3. **Tab Functionality**: Test all tabs in each category work
4. **Data Integration**: Verify category data loads correctly
5. **Responsive Design**: Test on mobile and desktop

## 📊 Progress Tracking
- **Status**: Ready
- **Progress**: 0%
- **Next Phase**: Phase 4 - Component Updates

## 🔗 Dependencies
- Phase 1: API Repository Extension (completed)
- Phase 2: Global State Extension (completed)
- Existing analysis components

## 📝 Notes
- **COMPLETE RESTRUCTURE**: Remove all old sections, create 7 new category sections
- **EACH CATEGORY INDEPENDENT**: Each category has its own Overview, Issues, Recommendations, Metrics, Charts
- **NO CATEGORY FILTERS**: Each category is a clear, independent section
- **CLEAN ARCHITECTURE**: No more mixed sections, pure category-based organization
- **USER EXPERIENCE**: Clear, organized, category-focused interface

---

**Next**: [Phase 4 - Component Updates](./frontend-orchestrators-integration-phase-4.md) 