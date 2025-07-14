# Analysis Dashboard – Phase 1: Foundation & Dependencies

## Overview
Set up the foundation for the enhanced analysis dashboard by installing missing dependencies, updating the existing AnalysisDataViewer to support new sections, and preparing the infrastructure for the new components.

## Objectives
- [ ] Install Mermaid dependency for diagram rendering
- [ ] Update AnalysisDataViewer to support collapsible sections
- [ ] Extend CSS for new section layouts
- [ ] Prepare API integration points for new data types
- [ ] Set up component structure for new sections
- [ ] Implement client-side caching for performance optimization
- [ ] Add progressive loading strategy for large data transfers
- [ ] Optimize backend data transfer to reduce 4MB+ responses

## Deliverables
- Dependency: `mermaid` package installed in frontend/package.json
- File: `frontend/src/presentation/components/analysis/AnalysisDataViewer.jsx` - Enhanced with section support
- File: `frontend/src/css/components/analysis/analysis-data-viewer.css` - Updated for new sections
- File: `frontend/src/infrastructure/repositories/APIChatRepository.jsx` - Extended API methods
- Test: `frontend/tests/unit/analysis/AnalysisDataViewer.test.js` - Updated tests
- File: `frontend/src/infrastructure/cache/AnalysisDataCache.js` - Client-side caching implementation
- File: `backend/presentation/api/AnalysisController.js` - Optimized with pagination and content filtering
- File: `frontend/src/hooks/useAnalysisCache.js` - Custom hook for cache management

## Dependencies
- Requires: Existing analysis components (already implemented)
- Blocks: Phase 2 start

## Estimated Time
4 hours

## Success Criteria
- [ ] Mermaid package successfully installed and importable
- [ ] AnalysisDataViewer supports collapsible sections
- [ ] CSS properly handles new section layouts
- [ ] API repository has placeholder methods for new data types
- [ ] All existing functionality remains intact
- [ ] Tests pass for updated components

## Technical Details

### Mermaid Installation
```bash
cd frontend
npm install mermaid
```

### AnalysisDataViewer Updates
- Add state management for collapsible sections
- Implement section toggle functionality
- Add placeholder sections for new components
- Maintain existing scrollable container functionality

### CSS Updates
- Add styles for collapsible sections
- Implement proper spacing for new components
- Ensure responsive design for all screen sizes
- Add transition animations for section toggles

### API Integration Preparation
Based on actual backend data structures, add methods for:

#### Issues Data (from AdvancedAnalysisService)
```javascript
// Expected API Response Structure:
{
  success: true,
  data: {
    layerValidation: {
      violations: [
        {
          type: 'layer-violation',
          severity: 'high',
          message: 'Domain layer accessing infrastructure directly',
          file: 'src/domain/UserService.js',
          line: 45
        }
      ]
    },
    logicValidation: {
      violations: [
        {
          type: 'security-violation',
          severity: 'critical',
          message: 'SQL injection vulnerability detected',
          file: 'src/infrastructure/DatabaseService.js',
          line: 23
        }
      ]
    },
    standardAnalysis: {
      codeQuality: {
        issues: [
          {
            type: 'complexity',
            severity: 'medium',
            message: 'Function too complex',
            file: 'src/services/ComplexService.js',
            line: 15
          }
        ]
      }
    }
  }
}
```

#### Tech Stack Data (from TaskAnalysisService)
```javascript
// Expected API Response Structure:
{
  success: true,
  data: {
    dependencies: {
      direct: {
        'express': '^4.17.1',
        'react': '^18.0.0',
        'chart.js': '^4.4.0'
      },
      dev: {
        'jest': '^29.0.0',
        'eslint': '^8.0.0'
      },
      outdated: [
        { name: 'lodash', current: '4.17.21', latest: '4.17.21' }
      ]
    },
    structure: {
      projectType: 'nodejs',
      fileTypes: {
        '.js': 45,
        '.jsx': 23,
        '.json': 5
      }
    }
  }
}
```

#### Architecture Data (from ArchitectureService)
```javascript
// Expected API Response Structure:
{
  success: true,
  data: {
    structure: {
      layers: 3,
      modules: 10,
      patterns: ['mvc', 'repository']
    },
    dependencies: {
      circular: false,
      count: 25,
      graph: 'mermaid-diagram-code-here'
    },
    metrics: {
      coupling: 'low',
      cohesion: 'high',
      complexity: 'medium'
    }
  }
}
```

#### Recommendations Data (from AdvancedAnalysisService)
```javascript
// Expected API Response Structure:
{
  success: true,
  data: {
    recommendations: [
      {
        title: 'Fix critical security vulnerabilities',
        description: 'Address SQL injection in DatabaseService.js',
        priority: 'critical',
        category: 'security',
        effort: 'medium',
        impact: 'high',
        file: 'src/infrastructure/DatabaseService.js'
      },
      {
        title: 'Reduce function complexity',
        description: 'Break down ComplexService.js into smaller functions',
        priority: 'medium',
        category: 'code-quality',
        effort: 'low',
        impact: 'medium',
        file: 'src/services/ComplexService.js'
      }
    ],
    integratedInsights: [
      {
        type: 'cross-layer-logic-issue',
        severity: 'high',
        description: 'Business logic mixed with infrastructure concerns'
      }
    ]
  }
}
```

### Performance Optimization Implementation

#### Client-Side Caching Strategy
```javascript
// File: frontend/src/infrastructure/cache/AnalysisDataCache.js
export class AnalysisDataCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    this.config = {
      metrics: { ttl: 5 * 60 * 1000 }, // 5 minutes
      status: { ttl: 30 * 1000 }, // 30 seconds
      history: { ttl: 10 * 60 * 1000 }, // 10 minutes
      issues: { ttl: 15 * 60 * 1000 }, // 15 minutes
      techStack: { ttl: 30 * 60 * 1000 }, // 30 minutes
      architecture: { ttl: 60 * 60 * 1000 }, // 1 hour
      recommendations: { ttl: 15 * 60 * 1000 } // 15 minutes
    };
  }

  set(key, data, ttl) {
    this.cache.set(key, data);
    this.timestamps.set(key, Date.now() + ttl);
  }

  get(key) {
    const timestamp = this.timestamps.get(key);
    if (!timestamp || Date.now() > timestamp) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  clear() {
    this.cache.clear();
    this.timestamps.clear();
  }

  getCacheKey(projectId, dataType, filters = {}) {
    return `${projectId}:${dataType}:${JSON.stringify(filters)}`;
  }
}
```

#### Custom Hook for Cache Management
```javascript
// File: frontend/src/hooks/useAnalysisCache.js
import { useState, useEffect, useCallback } from 'react';
import { AnalysisDataCache } from '@/infrastructure/cache/AnalysisDataCache';

export const useAnalysisCache = () => {
  const [cache] = useState(() => new AnalysisDataCache());

  const getCachedData = useCallback((projectId, dataType, filters = {}) => {
    const cacheKey = cache.getCacheKey(projectId, dataType, filters);
    return cache.get(cacheKey);
  }, [cache]);

  const setCachedData = useCallback((projectId, dataType, data, filters = {}) => {
    const cacheKey = cache.getCacheKey(projectId, dataType, filters);
    const ttl = cache.config[dataType]?.ttl || 5 * 60 * 1000;
    cache.set(cacheKey, data, ttl);
  }, [cache]);

  const clearCache = useCallback(() => {
    cache.clear();
  }, [cache]);

  return {
    getCachedData,
    setCachedData,
    clearCache
  };
};
```

#### Progressive Loading Implementation
```javascript
// Enhanced loadAnalysisData in AnalysisDataViewer.jsx
const loadAnalysisData = async () => {
  try {
    setLoading(true);
    setError(null);

    const currentProjectId = projectId || await apiRepository.getCurrentProjectId();
    
    // Step 1: Load lightweight data first (status, metrics)
    updateLoadingState('status', true);
    updateLoadingState('metrics', true);
    
    const [statusResponse, metricsResponse] = await Promise.all([
      apiRepository.getAnalysisStatus(currentProjectId),
      apiRepository.getAnalysisMetrics(currentProjectId)
    ]);

    // Update UI with immediate data
    setAnalysisData(prev => ({
      ...prev,
      status: statusResponse.success ? statusResponse.data : null,
      metrics: metricsResponse.success ? metricsResponse.data : null
    }));

    updateLoadingState('status', false);
    updateLoadingState('metrics', false);

    // Step 2: Load heavy data with progress indicators
    updateLoadingState('history', true);
    const historyResponse = await apiRepository.getAnalysisHistory(currentProjectId);
    
    setAnalysisData(prev => ({
      ...prev,
      history: historyResponse.success ? (historyResponse.data || []) : []
    }));

    updateLoadingState('history', false);

  } catch (err) {
    setError('Failed to load analysis data: ' + err.message);
    logger.error('Analysis data loading error:', err);
  } finally {
    setLoading(false);
  }
};
```

#### Backend Data Optimization
```javascript
// Enhanced AnalysisController.js with pagination and content filtering
async getAnalysisHistory(req, res) {
  try {
    const { projectId } = req.params;
    const { 
      limit = 50, 
      offset = 0, 
      includeContent = false,
      type = null,
      dateFrom = null,
      dateTo = null
    } = req.query;
    
    // Build query options
    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      includeContent: includeContent === 'true',
      filters: {}
    };

    if (type) options.filters.type = type;
    if (dateFrom) options.filters.dateFrom = new Date(dateFrom);
    if (dateTo) options.filters.dateTo = new Date(dateTo);
    
    // Get analyses with optimized query
    const analyses = await this.analysisRepository.findByProjectId(projectId, options);
    
    // Return lightweight summary by default
    const summary = analyses.map(analysis => ({
      id: analysis.id,
      type: analysis.type,
      filename: analysis.filename,
      size: analysis.size,
      timestamp: analysis.timestamp,
      status: analysis.status,
      // Only include content if explicitly requested
      content: includeContent === 'true' ? analysis.resultData : undefined
    }));
    
    res.json({ 
      success: true, 
      data: summary,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: await this.analysisRepository.countByProjectId(projectId)
      }
    });
  } catch (error) {
    this.logger.error('[AnalysisController] Failed to get analysis history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
```

### API Method Signatures
```javascript
// Add to APIChatRepository.jsx
async getAnalysisIssues(projectId) {
  return this.apiCall(`/api/analysis/${projectId}/issues`);
}

async getAnalysisTechStack(projectId) {
  return this.apiCall(`/api/analysis/${projectId}/techstack`);
}

async getAnalysisArchitecture(projectId) {
  return this.apiCall(`/api/analysis/${projectId}/architecture`);
}

async getAnalysisRecommendations(projectId) {
  return this.apiCall(`/api/analysis/${projectId}/recommendations`);
}
```

## Risk Mitigation
- **Low Risk**: Mermaid installation - standard npm package
- **Medium Risk**: CSS conflicts - thorough testing required
- **Low Risk**: API changes - backward compatible methods

## Testing Strategy
- Unit tests for new AnalysisDataViewer functionality
- Integration tests for API method calls
- Visual regression tests for CSS changes
- Performance tests for section rendering 