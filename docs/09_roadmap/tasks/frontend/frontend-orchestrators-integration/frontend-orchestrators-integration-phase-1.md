# Frontend Orchestrators Integration - Phase 1: API Repository Extension

## 📋 Phase Overview
- **Phase**: 1
- **Name**: API Repository Extension
- **Objective**: Add category-based API methods for all 7 categories
- **Estimated Time**: 1.5 hours
- **Status**: Ready
- **Created**: 2025-08-01T20:59:25.000Z
- **Last Updated**: 2025-08-01T20:59:25.000Z

## 🎯 Objectives
- [ ] Add `getCategoryAnalysisData(projectId, category, endpoint)` method
- [ ] Add individual methods for each category: `getSecurityAnalysis`, `getPerformanceAnalysis`, etc.
- [ ] Add `getAllCategoriesData(projectId)` method for comprehensive analysis
- [ ] Add error handling and retry logic
- [ ] Remove legacy API methods

## 📁 Files to Modify
- [ ] `frontend/src/infrastructure/repositories/APIChatRepository.jsx` - Add category-based API methods

## 📁 Files to Create
- [ ] `frontend/src/utils/orchestratorDataProcessor.js` - Data processing utilities

## 🔧 Implementation Tasks

### Task 1: Add Category-Based API Methods
**File**: `frontend/src/infrastructure/repositories/APIChatRepository.jsx`

**Implementation**:
```javascript
// NEW: Category-based analysis data fetching
async getCategoryAnalysisData(projectId = null, category, endpoint) {
  const currentProjectId = projectId || await this.getCurrentProjectId();
  return apiCall(`/api/projects/${currentProjectId}/analysis/${category}/${endpoint}`, {}, currentProjectId);
}

// NEW: Individual category methods for convenience
async getSecurityAnalysis(projectId = null, endpoint = 'results') {
  return this.getCategoryAnalysisData(projectId, 'security', endpoint);
}

async getPerformanceAnalysis(projectId = null, endpoint = 'results') {
  return this.getCategoryAnalysisData(projectId, 'performance', endpoint);
}

async getArchitectureAnalysis(projectId = null, endpoint = 'results') {
  return this.getCategoryAnalysisData(projectId, 'architecture', endpoint);
}

async getCodeQualityAnalysis(projectId = null, endpoint = 'results') {
  return this.getCategoryAnalysisData(projectId, 'code-quality', endpoint);
}

async getDependenciesAnalysis(projectId = null, endpoint = 'results') {
  return this.getCategoryAnalysisData(projectId, 'dependencies', endpoint);
}

async getManifestAnalysis(projectId = null, endpoint = 'results') {
  return this.getCategoryAnalysisData(projectId, 'manifest', endpoint);
}

async getTechStackAnalysis(projectId = null, endpoint = 'results') {
  return this.getCategoryAnalysisData(projectId, 'tech-stack', endpoint);
}

// NEW: Comprehensive analysis data for all categories
async getAllCategoriesData(projectId = null) {
  const currentProjectId = projectId || await this.getCurrentProjectId();
  const categories = ['security', 'performance', 'architecture', 'code-quality', 'dependencies', 'manifest', 'tech-stack'];
  const endpoints = ['recommendations', 'issues', 'metrics', 'summary', 'results'];
  
  const promises = categories.flatMap(category => 
    endpoints.map(endpoint => 
      this.getCategoryAnalysisData(currentProjectId, category, endpoint)
        .then(result => ({ category, endpoint, result }))
        .catch(error => ({ category, endpoint, error }))
    )
  );
  
  const results = await Promise.allSettled(promises);
  return this.processAllCategoriesResults(results);
}
```

### Task 2: Create Data Processing Utilities
**File**: `frontend/src/utils/orchestratorDataProcessor.js`

**Implementation**:
```javascript
/**
 * Process orchestrator analysis results into consistent format
 */
export const processOrchestratorData = (data, category) => {
  if (!data || !data.success) {
    return {
      category,
      hasData: false,
      summary: null,
      details: null,
      recommendations: [],
      issues: [],
      tasks: [],
      documentation: null,
      score: 0,
      executionTime: 0,
      timestamp: null
    };
  }

  const result = data.data || data;
  
  return {
    category,
    hasData: true,
    summary: result.summary || {},
    details: result.details || {},
    recommendations: result.recommendations || [],
    issues: result.issues || [],
    tasks: result.tasks || [],
    documentation: result.documentation || {},
    score: result.score || 0,
    executionTime: result.executionTime || 0,
    timestamp: result.timestamp || new Date().toISOString()
  };
};

/**
 * Process all categories results into organized structure
 */
export const processAllCategoriesResults = (results) => {
  const categories = ['security', 'performance', 'architecture', 'code-quality', 'dependencies', 'manifest', 'tech-stack'];
  const processedData = {};
  
  categories.forEach(category => {
    processedData[category] = {
      recommendations: [],
      issues: [],
      metrics: null,
      summary: null,
      results: null,
      hasData: false
    };
  });
  
  results.forEach(({ category, endpoint, result, error }) => {
    if (error) {
      console.warn(`Failed to load ${category}/${endpoint}:`, error);
      return;
    }
    
    if (result && result.success) {
      processedData[category][endpoint] = result.data;
      processedData[category].hasData = true;
    }
  });
  
  return processedData;
};
```

### Task 3: Add Error Handling and Retry Logic
**File**: `frontend/src/infrastructure/repositories/APIChatRepository.jsx`

**Implementation**:
```javascript
// NEW: Enhanced error handling for category endpoints
async getCategoryAnalysisDataWithRetry(projectId = null, category, endpoint, maxRetries = 3) {
  const currentProjectId = projectId || await this.getCurrentProjectId();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall(`/api/projects/${currentProjectId}/analysis/${category}/${endpoint}`, {}, currentProjectId);
      
      if (result.success) {
        return result;
      }
      
      if (!result.error) {
        return result;
      }
      
      throw new Error(result.error);
    } catch (error) {
      console.warn(`Attempt ${attempt}/${maxRetries} failed for ${category}/${endpoint}:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}
```

## ✅ Success Criteria
- [ ] All 7 categories (security, performance, architecture, code-quality, dependencies, manifest, tech-stack) supported
- [ ] All 5 endpoints per category (recommendations, issues, metrics, summary, results) implemented
- [ ] Legacy endpoints completely replaced
- [ ] Error handling and retry logic implemented
- [ ] Data processing utilities created
- [ ] All existing methods updated to use new endpoints

## 🔍 Validation Steps
1. **API Endpoint Testing**: Verify all category endpoints return correct data
2. **Error Handling**: Test error scenarios and retry logic
3. **Data Processing**: Validate data processing utilities
4. **Performance**: Check API call performance

## 📊 Progress Tracking
- **Status**: Ready
- **Progress**: 0%
- **Next Phase**: Phase 2 - Global State Extension

## 🔗 Dependencies
- Backend Analysis Orchestrators Implementation (completed)
- Existing APIChatRepository structure
- apiCall utility function

## 📝 Notes
- Replace existing method implementations with category-based endpoints
- Update all method signatures to use new API structure
- Implement comprehensive error handling
- Create reusable data processing utilities
- Test all endpoints before proceeding to Phase 2

---

**Next**: [Phase 2 - Global State Extension](./frontend-orchestrators-integration-phase-2.md) 