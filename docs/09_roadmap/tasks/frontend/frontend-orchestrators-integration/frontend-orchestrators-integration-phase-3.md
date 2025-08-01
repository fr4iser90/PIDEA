# Frontend Orchestrators Integration - Phase 3: Core Components Update

## 📋 Phase Overview
- **Phase**: 3
- **Name**: Core Components Update
- **Objective**: Update main analysis components to support new orchestrator data structures
- **Estimated Time**: 1.5 hours
- **Status**: Pending
- **Created**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
- **Last Updated**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]

## 🎯 Objectives
- [ ] Update AnalysisDataViewer to use category-based data from global state
- [ ] Enhance AnalysisIssues to handle orchestrator-specific issues data
- [ ] Update AnalysisRecommendations for category-based recommendations
- [ ] Replace legacy API calls with global state selectors
- [ ] Implement category-based filtering and display

## 📁 Files to Modify
- [ ] `frontend/src/presentation/components/analysis/AnalysisDataViewer.jsx` - Update to use category-based data
- [ ] `frontend/src/presentation/components/analysis/AnalysisIssues.jsx` - Support orchestrator issues data
- [ ] `frontend/src/presentation/components/analysis/AnalysisRecommendations.jsx` - Support orchestrator recommendations data

## 📁 Files to Create
- [ ] `frontend/src/utils/orchestratorDataProcessor.js` - Enhanced data processing for orchestrator results

## 🔧 Implementation Tasks

### Task 1: Update AnalysisDataViewer
**File**: `frontend/src/presentation/components/analysis/AnalysisDataViewer.jsx`

**Implementation**:
```javascript
// Replace legacy selectors with category-based selectors
import { 
  useAnalysisStatus, 
  useAnalysisMetrics, 
  useAnalysisHistory, 
  useAllCategoriesAnalysis,  // NEW
  useCodeQualityAnalysis,    // NEW
  useDependencyAnalysis,     // NEW
  useManifestAnalysis,       // NEW
  useActiveIDE, 
  useProjectDataActions 
} from '@/infrastructure/stores/selectors/ProjectSelectors.jsx';

const AnalysisDataViewer = ({ projectId = null, eventBus = null }) => {
  // ✅ NEW: Use category-based selectors instead of legacy
  const analysisStatus = useAnalysisStatus();
  const analysisMetrics = useAnalysisMetrics();
  const analysisHistory = useAnalysisHistory();
  const allCategories = useAllCategoriesAnalysis();  // NEW
  const codeQuality = useCodeQualityAnalysis();      // NEW
  const dependencies = useDependencyAnalysis();      // NEW
  const manifest = useManifestAnalysis();            // NEW
  const activeIDE = useActiveIDE();
  const { loadAnalysisData: loadAnalysisDataFromStore } = useProjectDataActions();

  // ✅ NEW: Category-based data structure
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categoryFilters, setCategoryFilters] = useState({
    severity: 'all',
    type: 'all',
    status: 'all'
  });

  // ✅ NEW: Load all categories data
  useEffect(() => {
    if (activeIDE.workspacePath && !allCategories.hasData) {
      loadAnalysisDataFromStore(activeIDE.workspacePath);
    }
  }, [activeIDE.workspacePath, allCategories.hasData, loadAnalysisDataFromStore]);

  // ✅ NEW: Category selection handler
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  // ✅ NEW: Get filtered data based on selected category
  const getFilteredData = () => {
    if (selectedCategory === 'all') {
      return allCategories.categories;
    }
    return { [selectedCategory]: allCategories.categories[selectedCategory] };
  };

  return (
    <div className="analysis-data-viewer">
      {/* ✅ NEW: Category selector */}
      <div className="category-selector">
        <button 
          className={selectedCategory === 'all' ? 'active' : ''}
          onClick={() => handleCategorySelect('all')}
        >
          All Categories
        </button>
        {Object.keys(allCategories.categories || {}).map(category => (
          <button
            key={category}
            className={selectedCategory === category ? 'active' : ''}
            onClick={() => handleCategorySelect(category)}
          >
            {category.replace('-', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {/* ✅ NEW: Category-based content */}
      <div className="category-content">
        {selectedCategory === 'all' ? (
          // Show all categories
          Object.entries(getFilteredData()).map(([category, data]) => (
            <CategoryAnalysisView 
              key={category}
              category={category}
              data={data}
              loading={allCategories.loading}
            />
          ))
        ) : (
          // Show specific category
          <CategoryAnalysisView
            category={selectedCategory}
            data={getFilteredData()[selectedCategory]}
            loading={allCategories.loading}
          />
        )}
      </div>
    </div>
  );
};
```

### Task 2: Update AnalysisIssues
**File**: `frontend/src/presentation/components/analysis/AnalysisIssues.jsx`

**Implementation**:
```javascript
// ✅ NEW: Support orchestrator issues data structure
const AnalysisIssues = ({ issues, loading, error, category = 'all' }) => {
  // ✅ NEW: Process orchestrator issues data
  const processedIssues = useMemo(() => {
    if (!issues) return [];

    // Handle orchestrator data structure
    if (issues.category && issues.issues) {
      return processOrchestratorIssues(issues.issues, issues.category);
    }

    // Handle legacy data structure (fallback)
    if (Array.isArray(issues)) {
      return processLegacyIssues(issues);
    }

    // Handle category-specific issues
    if (typeof issues === 'object' && !Array.isArray(issues)) {
      return processCategoryIssues(issues, category);
    }

    return [];
  }, [issues, category]);

  // ✅ NEW: Category-specific filtering
  const [filterCategory, setFilterCategory] = useState(category);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterSource, setFilterSource] = useState('all');

  // ✅ NEW: Get available categories from issues
  const availableCategories = useMemo(() => {
    const categories = new Set();
    processedIssues.forEach(issue => {
      if (issue.category) categories.add(issue.category);
    });
    return Array.from(categories);
  }, [processedIssues]);

  // ✅ NEW: Filter issues by category
  const filteredIssues = useMemo(() => {
    return processedIssues.filter(issue => {
      const categoryMatch = filterCategory === 'all' || issue.category === filterCategory;
      const severityMatch = filterSeverity === 'all' || issue.severity === filterSeverity;
      const sourceMatch = filterSource === 'all' || issue.source === filterSource;
      return categoryMatch && severityMatch && sourceMatch;
    });
  }, [processedIssues, filterCategory, filterSeverity, filterSource]);

  return (
    <div className="analysis-issues">
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
      <div className="issues-content">
        {filteredIssues.map(issue => (
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
```

### Task 3: Update AnalysisRecommendations
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

### Task 4: Enhanced Data Processing
**File**: `frontend/src/utils/orchestratorDataProcessor.js`

**Implementation**:
```javascript
// ✅ NEW: Process orchestrator issues data
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

// ✅ NEW: Process category-specific data
export const processCategoryIssues = (data, category) => {
  if (!data || typeof data !== 'object') return [];

  // Handle different category data structures
  switch (category) {
    case 'code-quality':
      return processCodeQualityIssues(data);
    case 'security':
      return processSecurityIssues(data);
    case 'dependencies':
      return processDependencyIssues(data);
    case 'manifest':
      return processManifestIssues(data);
    case 'tech-stack':
      return processTechStackIssues(data);
    case 'performance':
      return processPerformanceIssues(data);
    case 'architecture':
      return processArchitectureIssues(data);
    default:
      return processGenericIssues(data);
  }
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
```

## ✅ Success Criteria
- [ ] AnalysisDataViewer uses category-based data from global state
- [ ] AnalysisIssues handles orchestrator-specific issues data
- [ ] AnalysisRecommendations supports category-based recommendations
- [ ] Legacy API calls replaced with global state selectors
- [ ] Category-based filtering implemented
- [ ] Data processing utilities enhanced for orchestrator data
- [ ] All components display orchestrator data correctly

## 🔍 Validation Steps
1. **Component Rendering**: Verify all components render with new data structure
2. **Category Filtering**: Test category-based filtering functionality
3. **Data Processing**: Validate orchestrator data processing
4. **Global State Integration**: Test integration with global state
5. **Performance**: Check component performance with new data

## 📊 Progress Tracking
- **Status**: Pending
- **Progress**: 0%
- **Next Phase**: Phase 4 - Tech Stack & Architecture

## 🔗 Dependencies
- Phase 1: API Repository Extension (completed)
- Phase 2: Global State Extension (completed)
- Existing analysis components
- orchestratorDataProcessor utilities

## 📝 Notes
- Focus on main analysis components (DataViewer, Issues, Recommendations)
- Replace legacy API calls with global state selectors
- Implement category-based filtering and display
- Enhance data processing for orchestrator structures
- Test all components with new data before proceeding to Phase 4

---

**Next**: [Phase 4 - Tech Stack & Architecture](./frontend-orchestrators-integration-phase-4.md) 