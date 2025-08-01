# Frontend Orchestrators Integration - Phase 3: AnalysisDataViewer Update

## 📋 Phase Overview
- **Phase**: 3
- **Name**: AnalysisDataViewer Update
- **Objective**: Update AnalysisDataViewer to use category-based data from global state
- **Estimated Time**: 1 hour
- **Status**: Pending
- **Created**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
- **Last Updated**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]

## 🎯 Objectives
- [ ] Update AnalysisDataViewer to use category-based data from global state
- [ ] Replace legacy API calls with global state selectors
- [ ] Implement category-based filtering and display
- [ ] Add category selector UI component

## 📁 Files to Modify
- [ ] `frontend/src/presentation/components/analysis/AnalysisDataViewer.jsx` - Update to use category-based data

## 🔧 Implementation Tasks

### Task 1: Update AnalysisDataViewer
**File**: `frontend/src/presentation/components/analysis/AnalysisDataViewer.jsx`

**Implementation**:
```javascript
// ✅ NEW: Replace legacy selectors with category-based selectors
import { 
  useAnalysisStatus, 
  useAnalysisMetrics, 
  useAnalysisHistory, 
  useAllCategoriesAnalysis,  // NEW
  useActiveIDE, 
  useProjectDataActions 
} from '@/infrastructure/stores/selectors/ProjectSelectors.jsx';

const AnalysisDataViewer = ({ projectId = null, eventBus = null }) => {
  // ✅ NEW: Use category-based selectors instead of legacy
  const analysisStatus = useAnalysisStatus();
  const analysisMetrics = useAnalysisMetrics();
  const analysisHistory = useAnalysisHistory();
  const allCategories = useAllCategoriesAnalysis();  // NEW
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

### Task 2: Add Category Selector Styling
**File**: `frontend/src/css/components/analysis/category-selector.css`

**Implementation**:
```css
/* Category Selector Styles */
.category-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  padding: 15px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.category-selector button {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #374151;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.category-selector button:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.category-selector button.active {
  background: #3b82f6;
  color: #ffffff;
  border-color: #3b82f6;
}

.category-content {
  margin-top: 20px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .category-selector {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .category-selector button {
    flex: 1;
    min-width: 120px;
    text-align: center;
  }
}
```

## ✅ Success Criteria
- [ ] AnalysisDataViewer uses category-based data from global state
- [ ] Legacy API calls replaced with global state selectors
- [ ] Category-based filtering implemented
- [ ] Category selector UI functional
- [ ] All categories display correctly

## 🔍 Validation Steps
1. **Component Rendering**: Verify AnalysisDataViewer renders with new data structure
2. **Category Filtering**: Test category-based filtering functionality
3. **Global State Integration**: Test integration with global state
4. **Performance**: Check component performance with new data

## 📊 Progress Tracking
- **Status**: Pending
- **Progress**: 0%
- **Next Phase**: Phase 4 - AnalysisIssues Update

## 🔗 Dependencies
- Phase 1: API Repository Extension (completed)
- Phase 2: Global State Extension (completed)
- Existing AnalysisDataViewer component

## 📝 Notes
- Focus only on AnalysisDataViewer component updates
- Replace legacy API calls with global state selectors
- Implement category-based filtering and display
- Test component with new data before proceeding to Phase 4

---

**Next**: [Phase 4 - AnalysisIssues Update](./frontend-orchestrators-integration-phase-4.md) 