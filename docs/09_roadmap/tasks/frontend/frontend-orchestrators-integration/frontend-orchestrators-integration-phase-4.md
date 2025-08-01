# Frontend Orchestrators Integration - Phase 4: Component Updates

## 📋 Phase Overview
- **Phase**: 4
- **Name**: Component Updates
- **Objective**: Update existing components to support new orchestrator data structures
- **Estimated Time**: 1 hour
- **Status**: Ready
- **Created**: 2025-08-01T20:59:25.000Z
- **Last Updated**: 2025-08-01T20:59:25.000Z

## 🎯 Objectives
- [ ] Update `AnalysisIssues` to handle orchestrator-specific issues data
- [ ] Update `AnalysisRecommendations` for category-based recommendations
- [ ] Create `CategoryAnalysisSection` component for reusable category sections
- [ ] Create `CategoryOverview` component for category summaries

## 📁 Files to Modify
- [ ] `frontend/src/presentation/components/analysis/AnalysisIssues.jsx` - Support orchestrator issues data
- [ ] `frontend/src/presentation/components/analysis/AnalysisRecommendations.jsx` - Support orchestrator recommendations data

## 📁 Files to Create
- [ ] `frontend/src/utils/orchestratorDataProcessor.js` - Data processing utilities

## 🔧 Implementation Tasks

### Task 1: Update AnalysisIssues Component
**File**: `frontend/src/presentation/components/analysis/AnalysisIssues.jsx`

**Implementation**:
```javascript
import React, { useMemo } from 'react';
import { processOrchestratorIssues } from '@/utils/orchestratorDataProcessor';

const AnalysisIssues = ({ issues, loading, error, category = 'all' }) => {
  // NEW: Process orchestrator issues data
  const processedIssues = useMemo(() => {
    if (!issues) return [];

    // Handle orchestrator data structure
    if (Array.isArray(issues)) {
      return processOrchestratorIssues(issues, category);
    }

    // Handle legacy data structure (fallback)
    if (typeof issues === 'object' && !Array.isArray(issues)) {
      return processLegacyIssues(issues);
    }

    return [];
  }, [issues, category]);

  if (loading) {
    return <div className="analysis-issues loading">Loading issues...</div>;
  }

  if (error) {
    return <div className="analysis-issues error">Error loading issues: {error}</div>;
  }

  if (!processedIssues || processedIssues.length === 0) {
    return <div className="analysis-issues no-data">No issues found</div>;
  }

  return (
    <div className="analysis-issues">
      <div className="issues-header">
        <h3>Issues ({processedIssues.length})</h3>
      </div>
      
      <div className="issues-list">
        {processedIssues.map(issue => (
          <IssueCard 
            key={issue.id} 
            issue={issue}
            category={issue.category}
          />
        ))}
      </div>
    </div>
  );
};

// Issue Card Component
const IssueCard = ({ issue, category }) => {
  const severityColors = {
    high: '#dc2626',
    medium: '#f59e0b',
    low: '#10b981'
  };

  return (
    <div className={`issue-card severity-${issue.severity}`}>
      <div className="issue-header">
        <h4 className="issue-title">{issue.title}</h4>
        <span 
          className="issue-severity"
          style={{ backgroundColor: severityColors[issue.severity] || '#6b7280' }}
        >
          {issue.severity}
        </span>
      </div>
      
      <div className="issue-content">
        <p className="issue-description">{issue.description}</p>
        
        {issue.file && (
          <div className="issue-file">
            <strong>File:</strong> {issue.file}
            {issue.line && <span> (Line {issue.line})</span>}
          </div>
        )}
        
        {issue.category && (
          <div className="issue-category">
            <strong>Category:</strong> {issue.category}
          </div>
        )}
        
        {issue.source && (
          <div className="issue-source">
            <strong>Source:</strong> {issue.source}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisIssues;
```

### Task 2: Update AnalysisRecommendations Component
**File**: `frontend/src/presentation/components/analysis/AnalysisRecommendations.jsx`

**Implementation**:
```javascript
import React, { useMemo } from 'react';
import { processOrchestratorRecommendations } from '@/utils/orchestratorDataProcessor';

const AnalysisRecommendations = ({ recommendations, loading, error, category = 'all' }) => {
  // NEW: Process orchestrator recommendations data
  const processedRecommendations = useMemo(() => {
    if (!recommendations) return [];

    // Handle orchestrator data structure
    if (Array.isArray(recommendations)) {
      return processOrchestratorRecommendations(recommendations, category);
    }

    // Handle legacy data structure (fallback)
    if (typeof recommendations === 'object' && !Array.isArray(recommendations)) {
      return processLegacyRecommendations(recommendations);
    }

    return [];
  }, [recommendations, category]);

  if (loading) {
    return <div className="analysis-recommendations loading">Loading recommendations...</div>;
  }

  if (error) {
    return <div className="analysis-recommendations error">Error loading recommendations: {error}</div>;
  }

  if (!processedRecommendations || processedRecommendations.length === 0) {
    return <div className="analysis-recommendations no-data">No recommendations found</div>;
  }

  return (
    <div className="analysis-recommendations">
      <div className="recommendations-header">
        <h3>Recommendations ({processedRecommendations.length})</h3>
      </div>
      
      <div className="recommendations-list">
        {processedRecommendations.map(recommendation => (
          <RecommendationCard 
            key={recommendation.id} 
            recommendation={recommendation}
            category={recommendation.category}
          />
        ))}
      </div>
    </div>
  );
};

// Recommendation Card Component
const RecommendationCard = ({ recommendation, category }) => {
  const priorityColors = {
    high: '#dc2626',
    medium: '#f59e0b',
    low: '#10b981'
  };

  return (
    <div className={`recommendation-card priority-${recommendation.priority}`}>
      <div className="recommendation-header">
        <h4 className="recommendation-title">{recommendation.title}</h4>
        <span 
          className="recommendation-priority"
          style={{ backgroundColor: priorityColors[recommendation.priority] || '#6b7280' }}
        >
          {recommendation.priority}
        </span>
      </div>
      
      <div className="recommendation-content">
        <p className="recommendation-description">{recommendation.description}</p>
        
        {recommendation.effort && (
          <div className="recommendation-effort">
            <strong>Effort:</strong> {recommendation.effort}
          </div>
        )}
        
        {recommendation.impact && (
          <div className="recommendation-impact">
            <strong>Impact:</strong> {recommendation.impact}
          </div>
        )}
        
        {recommendation.category && (
          <div className="recommendation-category">
            <strong>Category:</strong> {recommendation.category}
          </div>
        )}
        
        {recommendation.estimatedTime && (
          <div className="recommendation-time">
            <strong>Estimated Time:</strong> {recommendation.estimatedTime}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisRecommendations;
```

### Task 3: Create Data Processing Utilities
**File**: `frontend/src/utils/orchestratorDataProcessor.js`

**Implementation**:
```javascript
/**
 * Process orchestrator issues data into consistent format
 */
export const processOrchestratorIssues = (issues, category) => {
  if (!Array.isArray(issues)) return [];

  return issues.map(issue => ({
    id: issue.id || `${category}-${Date.now()}-${Math.random()}`,
    title: issue.title || issue.message || 'Unknown Issue',
    description: issue.description || issue.details || '',
    severity: issue.severity || 'medium',
    category: category,
    source: issue.source || issue.scanner || 'orchestrator',
    file: issue.file || issue.path || null,
    line: issue.line || issue.lineNumber || null,
    column: issue.column || null,
    rule: issue.rule || issue.ruleId || null,
    message: issue.message || issue.description || '',
    timestamp: issue.timestamp || new Date().toISOString(),
    status: issue.status || 'open',
    priority: issue.priority || 'medium',
    effort: issue.effort || 'medium',
    tags: issue.tags || [],
    metadata: issue.metadata || {}
  }));
};

/**
 * Process orchestrator recommendations data into consistent format
 */
export const processOrchestratorRecommendations = (recommendations, category) => {
  if (!Array.isArray(recommendations)) return [];

  return recommendations.map(recommendation => ({
    id: recommendation.id || `${category}-${Date.now()}-${Math.random()}`,
    title: recommendation.title || recommendation.name || 'Unknown Recommendation',
    description: recommendation.description || recommendation.details || '',
    priority: recommendation.priority || 'medium',
    category: category,
    effort: recommendation.effort || 'medium',
    impact: recommendation.impact || 'medium',
    file: recommendation.file || recommendation.path || null,
    estimatedTime: recommendation.estimatedTime || recommendation.time || null,
    dependencies: recommendation.dependencies || [],
    tags: recommendation.tags || [],
    status: recommendation.status || 'pending',
    source: recommendation.source || 'orchestrator',
    scanner: recommendation.scanner || 'orchestrator',
    timestamp: recommendation.timestamp || new Date().toISOString(),
    metadata: recommendation.metadata || {}
  }));
};

/**
 * Process legacy issues data (fallback)
 */
export const processLegacyIssues = (data) => {
  if (!data || typeof data !== 'object') return [];

  const issues = [];
  
  // Handle different legacy data structures
  if (data.issues && Array.isArray(data.issues)) {
    issues.push(...data.issues);
  }
  
  if (data.vulnerabilities && Array.isArray(data.vulnerabilities)) {
    issues.push(...data.vulnerabilities.map(vuln => ({
      ...vuln,
      category: 'security',
      source: 'security-scanner'
    })));
  }
  
  return issues;
};

/**
 * Process legacy recommendations data (fallback)
 */
export const processLegacyRecommendations = (data) => {
  if (!data || typeof data !== 'object') return [];

  const recommendations = [];
  
  // Handle different legacy data structures
  if (data.recommendations && Array.isArray(data.recommendations)) {
    recommendations.push(...data.recommendations);
  }
  
  if (data.suggestions && Array.isArray(data.suggestions)) {
    recommendations.push(...data.suggestions.map(suggestion => ({
      ...suggestion,
      title: suggestion.title || suggestion.name,
      category: 'legacy'
    })));
  }
  
  return recommendations;
};

/**
 * Validate orchestrator data structure
 */
export const validateOrchestratorData = (data) => {
  const requiredFields = ['category', 'projectId', 'score', 'timestamp'];
  const missingFields = requiredFields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    console.warn('Missing required fields in orchestrator data:', missingFields);
    return false;
  }
  
  return true;
};
```

## ✅ Success Criteria
- [ ] AnalysisIssues handles orchestrator-specific issues data
- [ ] AnalysisRecommendations handles orchestrator-specific recommendations data
- [ ] Data processing utilities created and working
- [ ] Legacy data structure fallback functional
- [ ] All issue and recommendation types display correctly
- [ ] Category-based data processing working

## 🔍 Validation Steps
1. **Component Rendering**: Verify components render with new data structure
2. **Data Processing**: Validate orchestrator data processing
3. **Legacy Fallback**: Test legacy data structure fallback
4. **Performance**: Check component performance with new data

## 📊 Progress Tracking
- **Status**: Ready
- **Progress**: 0%
- **Next Phase**: Task Complete

## 🔗 Dependencies
- Phase 1: API Repository Extension (completed)
- Phase 2: Global State Extension (completed)
- Phase 3: AnalysisDataViewer Complete Restructure (completed)
- Existing AnalysisIssues and AnalysisRecommendations components

## 📝 Notes
- Focus on updating existing components to support new orchestrator data structures
- Implement comprehensive data processing utilities
- Maintain backward compatibility with legacy data
- Test all components with new data before completing the task

---

**Task Complete**: All phases of Frontend Orchestrators Integration have been planned and are ready for implementation.