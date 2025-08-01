# Frontend Orchestrators Integration - Phase 5: AnalysisRecommendations Update

## 📋 Phase Overview
- **Phase**: 5
- **Name**: AnalysisRecommendations Update
- **Objective**: Update AnalysisRecommendations to support category-based recommendations data
- **Estimated Time**: 1 hour
- **Status**: Ready
- **Created**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
- **Last Updated**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]

## 🎯 Objectives
- [ ] Update AnalysisRecommendations to support orchestrator recommendations data
- [ ] Implement category-based filtering for recommendations
- [ ] Add orchestrator data processing for recommendations
- [ ] Support new orchestrator data structure

## 📁 Files to Modify
- [ ] `frontend/src/presentation/components/analysis/AnalysisRecommendations.jsx` - Support orchestrator recommendations data

## 📁 Files to Create
- [ ] `frontend/src/utils/recommendationsDataProcessor.js` - Recommendations data processing utilities

## 🔧 Implementation Tasks

### Task 1: Update AnalysisRecommendations
**File**: `frontend/src/presentation/components/analysis/AnalysisRecommendations.jsx`

**Implementation**:
```javascript
// ✅ NEW: Support orchestrator recommendations data structure
const AnalysisRecommendations = ({ recommendations, loading, error, category = 'all' }) => {
  // ✅ NEW: Process orchestrator recommendations data
  const processedRecommendations = useMemo(() => {
    if (!recommendations) return [];

    // Handle orchestrator data structure
    if (recommendations.category && recommendations.recommendations) {
      return processOrchestratorRecommendations(recommendations.recommendations, recommendations.category);
    }

    // Handle legacy data structure (fallback)
    if (Array.isArray(recommendations)) {
      return processLegacyRecommendations(recommendations);
    }

    // Handle category-specific recommendations
    if (typeof recommendations === 'object' && !Array.isArray(recommendations)) {
      return processCategoryRecommendations(recommendations, category);
    }

    return [];
  }, [recommendations, category]);

  // ✅ NEW: Category-specific filtering
  const [filterCategory, setFilterCategory] = useState(category);
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedEffort, setSelectedEffort] = useState('all');

  // ✅ NEW: Get available categories from recommendations
  const availableCategories = useMemo(() => {
    const categories = new Set();
    processedRecommendations.forEach(rec => {
      if (rec.category) categories.add(rec.category);
    });
    return Array.from(categories);
  }, [processedRecommendations]);

  // ✅ NEW: Filter recommendations by category
  const filteredRecommendations = useMemo(() => {
    return processedRecommendations.filter(rec => {
      const categoryMatch = filterCategory === 'all' || rec.category === filterCategory;
      const priorityMatch = selectedPriority === 'all' || rec.priority === selectedPriority;
      const effortMatch = selectedEffort === 'all' || rec.effort === selectedEffort;
      return categoryMatch && priorityMatch && effortMatch;
    });
  }, [processedRecommendations, filterCategory, selectedPriority, selectedEffort]);

  return (
    <div className="analysis-recommendations">
      {/* ✅ NEW: Category filter */}
      <div className="category-filter">
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="all">All Categories</option>
          {availableCategories.map(cat => (
            <option key={cat} value={cat}>
              {cat.replace('-', ' ').toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Existing filters and content */}
      <div className="recommendations-content">
        {filteredRecommendations.map(rec => (
          <RecommendationCard 
            key={rec.id} 
            recommendation={rec}
            category={rec.category}
          />
        ))}
      </div>
    </div>
  );
};
```

### Task 2: Create Recommendations Data Processor
**File**: `frontend/src/utils/recommendationsDataProcessor.js`

**Implementation**:
```javascript
// ✅ NEW: Process orchestrator recommendations data
export const processOrchestratorRecommendations = (recommendations, category) => {
  if (!Array.isArray(recommendations)) return [];

  return recommendations.map(rec => ({
    id: rec.id || `${category}-${Date.now()}-${Math.random()}`,
    title: rec.title || rec.message || 'Unknown Recommendation',
    description: rec.description || rec.details || '',
    category: category,
    priority: rec.priority || 'medium',
    effort: rec.effort || 'medium',
    impact: rec.impact || 'medium',
    source: rec.source || 'orchestrator',
    file: rec.file || rec.path || null,
    line: rec.line || rec.lineNumber || null,
    column: rec.column || null,
    rule: rec.rule || rec.ruleId || null,
    message: rec.message || rec.description || '',
    timestamp: rec.timestamp || new Date().toISOString(),
    status: rec.status || 'pending',
    tags: rec.tags || [],
    metadata: rec.metadata || {},
    implementation: rec.implementation || null,
    examples: rec.examples || []
  }));
};

// ✅ NEW: Process legacy recommendations data
export const processLegacyRecommendations = (recommendations) => {
  if (!Array.isArray(recommendations)) return [];

  return recommendations.map(rec => ({
    id: rec.id || `legacy-${Date.now()}-${Math.random()}`,
    title: rec.title || rec.message || 'Unknown Recommendation',
    description: rec.description || rec.details || '',
    category: rec.category || 'legacy',
    priority: rec.priority || 'medium',
    effort: rec.effort || 'medium',
    impact: rec.impact || 'medium',
    source: rec.source || 'legacy',
    file: rec.file || rec.path || null,
    line: rec.line || rec.lineNumber || null,
    column: rec.column || null,
    rule: rec.rule || rec.ruleId || null,
    message: rec.message || rec.description || '',
    timestamp: rec.timestamp || new Date().toISOString(),
    status: rec.status || 'pending',
    tags: rec.tags || [],
    metadata: rec.metadata || {},
    implementation: rec.implementation || null,
    examples: rec.examples || []
  }));
};

// ✅ NEW: Process category-specific recommendations
export const processCategoryRecommendations = (data, category) => {
  if (!data || typeof data !== 'object') return [];

  // Handle different category data structures
  switch (category) {
    case 'code-quality':
      return processCodeQualityRecommendations(data);
    case 'security':
      return processSecurityRecommendations(data);
    case 'dependencies':
      return processDependencyRecommendations(data);
    case 'manifest':
      return processManifestRecommendations(data);
    case 'tech-stack':
      return processTechStackRecommendations(data);
    case 'performance':
      return processPerformanceRecommendations(data);
    case 'architecture':
      return processArchitectureRecommendations(data);
    default:
      return processGenericRecommendations(data);
  }
};

// ✅ NEW: Process code quality recommendations
const processCodeQualityRecommendations = (data) => {
  const recommendations = [];
  
  if (data.linting?.recommendations) {
    recommendations.push(...data.linting.recommendations.map(rec => ({
      ...rec,
      category: 'code-quality',
      source: 'linting'
    })));
  }
  
  if (data.complexity?.recommendations) {
    recommendations.push(...data.complexity.recommendations.map(rec => ({
      ...rec,
      category: 'code-quality',
      source: 'complexity'
    })));
  }
  
  return recommendations;
};

// ✅ NEW: Process security recommendations
const processSecurityRecommendations = (data) => {
  const recommendations = [];
  
  if (data.recommendations) {
    recommendations.push(...data.recommendations.map(rec => ({
      id: rec.id || `security-${Date.now()}-${Math.random()}`,
      title: rec.title || 'Security Recommendation',
      description: rec.description || rec.details || '',
      category: 'security',
      priority: rec.priority || 'high',
      effort: rec.effort || 'medium',
      impact: rec.impact || 'high',
      source: 'security-scanner',
      file: rec.file || rec.path || null,
      line: rec.line || null,
      rule: rec.rule || rec.cve || null,
      message: rec.message || rec.description || ''
    })));
  }
  
  return recommendations;
};

// ✅ NEW: Process generic recommendations
const processGenericRecommendations = (data) => {
  if (Array.isArray(data)) {
    return data.map(rec => ({
      id: rec.id || `generic-${Date.now()}-${Math.random()}`,
      title: rec.title || rec.message || 'Unknown Recommendation',
      description: rec.description || rec.details || '',
      category: rec.category || 'generic',
      priority: rec.priority || 'medium',
      effort: rec.effort || 'medium',
      impact: rec.impact || 'medium',
      source: rec.source || 'generic',
      file: rec.file || rec.path || null,
      line: rec.line || rec.lineNumber || null,
      column: rec.column || null,
      rule: rec.rule || rec.ruleId || null,
      message: rec.message || rec.description || '',
      timestamp: rec.timestamp || new Date().toISOString(),
      status: rec.status || 'pending',
      tags: rec.tags || [],
      metadata: rec.metadata || {},
      implementation: rec.implementation || null,
      examples: rec.examples || []
    }));
  }
  
  return [];
};
```

## ✅ Success Criteria
- [ ] AnalysisRecommendations supports orchestrator recommendations data
- [ ] Category-based filtering implemented
- [ ] Orchestrator data processing working
- [ ] Legacy data structure fallback functional
- [ ] All recommendation types display correctly

## 🔍 Validation Steps
1. **Component Rendering**: Verify AnalysisRecommendations renders with new data structure
2. **Category Filtering**: Test category-based filtering functionality
3. **Data Processing**: Validate orchestrator data processing
4. **Performance**: Check component performance with new data

## 📊 Progress Tracking
- **Status**: Ready
- **Progress**: 0%
- **Next Phase**: Phase 6 - TechStack & Architecture Update

## 🔗 Dependencies
- Phase 1: API Repository Extension (completed)
- Phase 2: Global State Extension (completed)
- Phase 3: AnalysisDataViewer Update (completed)
- Phase 4: AnalysisIssues Update (completed)
- Existing AnalysisRecommendations component

## 📝 Notes
- Focus only on AnalysisRecommendations component updates
- Implement orchestrator data processing for recommendations
- Add category-based filtering
- Test component with new data before proceeding to Phase 6

---

**Next**: [Phase 6 - TechStack & Architecture Update](./frontend-orchestrators-integration-phase-6.md) 