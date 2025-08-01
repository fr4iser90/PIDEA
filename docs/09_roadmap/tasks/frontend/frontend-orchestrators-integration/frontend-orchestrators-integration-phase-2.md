# Frontend Orchestrators Integration - Phase 2: Global State Extension

## 📋 Phase Overview
- **Phase**: 2
- **Name**: Global State Extension
- **Objective**: Replace legacy data loading with category-based data in IDEStore
- **Estimated Time**: 1.5 hours
- **Status**: Pending
- **Created**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
- **Last Updated**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]

## 🎯 Objectives
- [ ] Replace `IDEStore.loadAnalysisData()` to load all 7 categories instead of legacy data
- [ ] Update existing selectors to use new category-based data structure
- [ ] Add new selectors: `useDependencyAnalysis()`, `useManifestAnalysis()`, `useCodeQualityAnalysis()`
- [ ] Add `useAllCategoriesAnalysis()` selector for comprehensive data
- [ ] Implement lazy loading for category-specific data
- [ ] Add data caching and refresh mechanisms

## 📁 Files to Modify
- [ ] `frontend/src/infrastructure/stores/IDEStore.jsx` - Extend analysis data loading for all 7 categories
- [ ] `frontend/src/infrastructure/stores/selectors/ProjectSelectors.jsx` - Add selectors for new categories

## 🔧 Implementation Tasks

### Task 1: Update IDEStore Analysis Data Loading
**File**: `frontend/src/infrastructure/stores/IDEStore.jsx`

**Implementation**:
```javascript
// ✅ NEW: Replace legacy loadAnalysisData with category-based loading
async loadAnalysisData(workspacePath) {
  try {
    this.setAnalysisLoading(true);
    
    // Load all 7 categories data
    const categories = ['security', 'performance', 'architecture', 'code-quality', 'dependencies', 'manifest', 'tech-stack'];
    const categoryData = {};
    
    // Load each category data
    for (const category of categories) {
      try {
        const data = await this.apiRepository.getAllCategoriesData(workspacePath);
        categoryData[category] = data.categories[category] || null;
      } catch (error) {
        console.warn(`Failed to load ${category} data:`, error);
        categoryData[category] = null;
      }
    }
    
    // Update global state with category-based data
    this.setAnalysisData(workspacePath, {
      categories: categoryData,
      lastUpdate: new Date().toISOString(),
      hasData: Object.values(categoryData).some(data => data !== null)
    });
    
  } catch (error) {
    console.error('Failed to load analysis data:', error);
    this.setAnalysisError(error.message);
  } finally {
    this.setAnalysisLoading(false);
  }
}

// ✅ NEW: Load specific category data
async loadCategoryData(workspacePath, category) {
  try {
    this.setCategoryLoading(category, true);
    
    const data = await this.apiRepository.getCategoryResults(workspacePath, category);
    
    this.updateCategoryData(workspacePath, category, data);
    
  } catch (error) {
    console.error(`Failed to load ${category} data:`, error);
    this.setCategoryError(category, error.message);
  } finally {
    this.setCategoryLoading(category, false);
  }
}

// ✅ NEW: Update category data in state
updateCategoryData(workspacePath, category, data) {
  const currentData = this.analysis[workspacePath] || { categories: {} };
  
  this.setAnalysisData(workspacePath, {
    ...currentData,
    categories: {
      ...currentData.categories,
      [category]: data
    },
    lastUpdate: new Date().toISOString()
  });
}

// ✅ NEW: Set category loading state
setCategoryLoading(category, loading) {
  const currentLoading = this.analysisLoading[category] || {};
  this.analysisLoading[category] = { ...currentLoading, loading };
}

// ✅ NEW: Set category error state
setCategoryError(category, error) {
  const currentErrors = this.analysisErrors[category] || {};
  this.analysisErrors[category] = { ...currentErrors, error };
}
```

### Task 2: Add New Selectors
**File**: `frontend/src/infrastructure/stores/selectors/ProjectSelectors.jsx`

**Implementation**:
```javascript
// ✅ NEW: Selector for all categories analysis
export const useAllCategoriesAnalysis = () => {
  const { activeIDE, analysis } = useIDEStore();
  const workspacePath = activeIDE?.workspacePath;
  
  if (!workspacePath || !analysis[workspacePath]) {
    return {
      categories: {},
      hasData: false,
      loading: false,
      error: null,
      lastUpdate: null
    };
  }
  
  return {
    categories: analysis[workspacePath].categories || {},
    hasData: analysis[workspacePath].hasData || false,
    loading: analysis[workspacePath].loading || false,
    error: analysis[workspacePath].error || null,
    lastUpdate: analysis[workspacePath].lastUpdate || null
  };
};

// ✅ NEW: Selector for code quality analysis
export const useCodeQualityAnalysis = () => {
  const allCategories = useAllCategoriesAnalysis();
  return {
    data: allCategories.categories['code-quality'] || null,
    loading: allCategories.loading,
    error: allCategories.error,
    hasData: allCategories.categories['code-quality'] !== null
  };
};

// ✅ NEW: Selector for dependency analysis
export const useDependencyAnalysis = () => {
  const allCategories = useAllCategoriesAnalysis();
  return {
    data: allCategories.categories['dependencies'] || null,
    loading: allCategories.loading,
    error: allCategories.error,
    hasData: allCategories.categories['dependencies'] !== null
  };
};

// ✅ NEW: Selector for manifest analysis
export const useManifestAnalysis = () => {
  const allCategories = useAllCategoriesAnalysis();
  return {
    data: allCategories.categories['manifest'] || null,
    loading: allCategories.loading,
    error: allCategories.error,
    hasData: allCategories.categories['manifest'] !== null
  };
};

// ✅ NEW: Selector for tech stack analysis
export const useTechStackAnalysis = () => {
  const allCategories = useAllCategoriesAnalysis();
  return {
    data: allCategories.categories['tech-stack'] || null,
    loading: allCategories.loading,
    error: allCategories.error,
    hasData: allCategories.categories['tech-stack'] !== null
  };
};

// ✅ NEW: Selector for security analysis
export const useSecurityAnalysis = () => {
  const allCategories = useAllCategoriesAnalysis();
  return {
    data: allCategories.categories['security'] || null,
    loading: allCategories.loading,
    error: allCategories.error,
    hasData: allCategories.categories['security'] !== null
  };
};

// ✅ NEW: Selector for performance analysis
export const usePerformanceAnalysis = () => {
  const allCategories = useAllCategoriesAnalysis();
  return {
    data: allCategories.categories['performance'] || null,
    loading: allCategories.loading,
    error: allCategories.error,
    hasData: allCategories.categories['performance'] !== null
  };
};

// ✅ NEW: Selector for architecture analysis
export const useArchitectureAnalysis = () => {
  const allCategories = useAllCategoriesAnalysis();
  return {
    data: allCategories.categories['architecture'] || null,
    loading: allCategories.loading,
    error: allCategories.error,
    hasData: allCategories.categories['architecture'] !== null
  };
};
```

### Task 3: Implement Lazy Loading
**File**: `frontend/src/infrastructure/stores/IDEStore.jsx`

**Implementation**:
```javascript
// ✅ NEW: Lazy load category data
async lazyLoadCategory(workspacePath, category) {
  const currentData = this.analysis[workspacePath]?.categories?.[category];
  
  // If data already exists and is recent (less than 5 minutes old), return cached data
  if (currentData && currentData.timestamp) {
    const dataAge = Date.now() - new Date(currentData.timestamp).getTime();
    if (dataAge < 5 * 60 * 1000) { // 5 minutes
      return currentData;
    }
  }
  
  // Load fresh data
  return this.loadCategoryData(workspacePath, category);
}

// ✅ NEW: Refresh all categories data
async refreshAllCategories(workspacePath) {
  try {
    this.setAnalysisLoading(true);
    
    const categories = ['security', 'performance', 'architecture', 'code-quality', 'dependencies', 'manifest', 'tech-stack'];
    const promises = categories.map(category => 
      this.loadCategoryData(workspacePath, category)
        .catch(error => {
          console.warn(`Failed to refresh ${category}:`, error);
          return null;
        })
    );
    
    await Promise.allSettled(promises);
    
  } catch (error) {
    console.error('Failed to refresh categories:', error);
  } finally {
    this.setAnalysisLoading(false);
  }
}
```

## ✅ Success Criteria
- [ ] All 7 categories loaded in global state
- [ ] Legacy data structure completely replaced
- [ ] Lazy loading working correctly
- [ ] Data caching implemented
- [ ] Selectors provide clean data access
- [ ] Error handling robust
- [ ] Performance optimized

## 🔍 Validation Steps
1. **Global State**: Verify all categories loaded correctly
2. **Selectors**: Test all new selectors return correct data
3. **Lazy Loading**: Test lazy loading functionality
4. **Caching**: Verify data caching works
5. **Error Handling**: Test error scenarios

## 📊 Progress Tracking
- **Status**: Pending
- **Progress**: 0%
- **Next Phase**: Phase 3 - Core Components Update

## 🔗 Dependencies
- Phase 1: API Repository Extension (completed)
- Existing IDEStore structure
- ProjectSelectors structure

## 📝 Notes
- Replace legacy data loading with category-based approach
- Implement comprehensive selectors for all categories
- Add lazy loading and caching mechanisms
- Test all functionality before proceeding to Phase 3

---

**Next**: [Phase 3 - Core Components Update](./frontend-orchestrators-integration-phase-3.md) 