# Frontend Orchestrators Integration - Phase 1: API Repository Extension

## 📋 Phase Overview
- **Phase**: 1
- **Name**: API Repository Extension
- **Objective**: Add category-based API methods while maintaining backward compatibility
- **Estimated Time**: 1.5 hours
- **Status**: Ready
- **Created**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
- **Last Updated**: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]

## 🎯 Objectives
- [ ] Replace legacy API methods with category-based methods for all 7 analysis categories
- [ ] Update existing methods to use new category endpoints
- [ ] Implement all 5 endpoints per category (recommendations, issues, metrics, summary, results)
- [ ] Add robust error handling and retry logic
- [ ] Create comprehensive data fetching utilities

## 📁 Files to Modify
- [ ] `frontend/src/infrastructure/repositories/APIChatRepository.jsx` - Add new category-based methods

## 📁 Files to Create
- [ ] `frontend/src/utils/orchestratorDataProcessor.js` - Data processing utilities for orchestrator results

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
async getCategoryRecommendations(projectId = null, category) {
  return this.getCategoryAnalysisData(projectId, category, 'recommendations');
}

async getCategoryIssues(projectId = null, category) {
  return this.getCategoryAnalysisData(projectId, category, 'issues');
}

async getCategoryMetrics(projectId = null, category) {
  return this.getCategoryAnalysisData(projectId, category, 'metrics');
}

async getCategorySummary(projectId = null, category) {
  return this.getCategoryAnalysisData(projectId, category, 'summary');
}

async getCategoryResults(projectId = null, category) {
  return this.getCategoryAnalysisData(projectId, category, 'results');
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
      
      // If not successful but no error, return the result
      if (!result.error) {
        return result;
      }
      
      throw new Error(result.error);
    } catch (error) {
      console.warn(`Attempt ${attempt}/${maxRetries} failed for ${category}/${endpoint}:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

// NEW: Fallback to legacy endpoints if category endpoints fail
async getCategoryAnalysisDataWithFallback(projectId = null, category, endpoint) {
  try {
    return await this.getCategoryAnalysisDataWithRetry(projectId, category, endpoint);
  } catch (error) {
    console.warn(`Category endpoint failed, falling back to legacy for ${category}/${endpoint}:`, error);
    
    // Fallback mapping
    const fallbackMapping = {
      'code-quality': { issues: 'issues', recommendations: 'recommendations' },
      'tech-stack': { results: 'techstack' },
      'architecture': { results: 'architecture' }
    };
    
    const fallbackEndpoint = fallbackMapping[category]?.[endpoint];
    if (fallbackEndpoint) {
      return this.getAnalysisData(projectId, category, { endpoint: fallbackEndpoint });
    }
    
    throw error;
  }
}
```

## ✅ Success Criteria
- [ ] All 7 categories (security, performance, architecture, code-quality, dependencies, manifest, tech-stack) supported
- [ ] All 5 endpoints per category (recommendations, issues, metrics, summary, results) implemented
- [ ] Legacy endpoints completely replaced with category-based endpoints
- [ ] Error handling and retry logic implemented
- [ ] Data processing utilities created
- [ ] All existing methods updated to use new endpoints
- [ ] Clean migration to new API structure

## 🔍 Validation Steps
1. **API Endpoint Testing**: Verify all category endpoints return correct data
2. **Error Handling**: Test error scenarios and retry logic
3. **Backward Compatibility**: Ensure existing methods still work
4. **Data Processing**: Validate data processing utilities
5. **Performance**: Check API call performance and caching

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