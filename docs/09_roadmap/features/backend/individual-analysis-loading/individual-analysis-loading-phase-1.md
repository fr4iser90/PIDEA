# Individual Analysis Loading – Phase 1: Backend Individual Analysis Service

## Overview
Create the backend infrastructure for individual analysis loading, including the IndividualAnalysisService, enhanced AnalysisController methods, and route configuration.

## Objectives
- [ ] Create IndividualAnalysisService with lazy loading methods
- [ ] Add individual analysis endpoints to AnalysisController
- [ ] Implement caching for individual analysis types
- [ ] Add route configuration in Application.js
- [ ] Add individual analysis GET methods to existing endpoints

## Deliverables
- [ ] File: `backend/domain/services/IndividualAnalysisService.js` - Service for individual analysis loading
- [ ] File: `backend/presentation/api/AnalysisController.js` - Enhanced with individual loading methods
- [ ] File: `backend/Application.js` - Updated route configuration
- [ ] Test: `tests/unit/IndividualAnalysisService.test.js` - Unit tests for new service
- [ ] Test: `tests/integration/IndividualAnalysisController.test.js` - Integration tests

## Dependencies
- Requires: Existing analysis infrastructure (already implemented)
- Blocks: Phase 2 start

## Estimated Time
2 hours

## Success Criteria
- [ ] IndividualAnalysisService can load specific analysis types on demand
- [ ] AnalysisController has individual loading endpoints
- [ ] Caching works effectively for individual analyses
- [ ] Routes are properly configured
- [ ] All tests pass

## Implementation Details

### IndividualAnalysisService.js
```javascript
const Logger = require('@logging/Logger');
const logger = new Logger('IndividualAnalysisService');

class IndividualAnalysisService {
  constructor(analysisRepository, cacheService) {
    this.analysisRepository = analysisRepository;
    this.cacheService = cacheService;
  }

  async loadAnalysisByType(projectId, analysisType, options = {}) {
    try {
      const cacheKey = `analysis-${projectId}-${analysisType}`;
      
      // Check cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached && !options.forceRefresh) {
        logger.info(`Using cached ${analysisType} analysis for project ${projectId}`);
        return { success: true, data: cached, cached: true };
      }

      // Load from database
      const analysis = await this.analysisRepository.findLatestByProjectIdAndType(projectId, analysisType);
      
      if (!analysis) {
        return { success: false, error: `No ${analysisType} analysis found` };
      }

      // Cache the result
      await this.cacheService.set(cacheKey, analysis.resultData, 300); // 5 minutes TTL
      
      return { success: true, data: analysis.resultData, cached: false };
    } catch (error) {
      logger.error(`Failed to load ${analysisType} analysis:`, error);
      return { success: false, error: error.message };
    }
  }

  async getAvailableAnalysisTypes(projectId) {
    try {
      const types = await this.analysisRepository.getAvailableTypes(projectId);
      return { success: true, data: types };
    } catch (error) {
      logger.error(`Failed to get available analysis types:`, error);
      return { success: false, error: error.message };
    }
  }

  async preloadAnalysisType(projectId, analysisType) {
    try {
      // Preload in background
      setImmediate(async () => {
        await this.loadAnalysisByType(projectId, analysisType);
      });
      
      return { success: true, message: 'Preload started' };
    } catch (error) {
      logger.error(`Failed to preload ${analysisType} analysis:`, error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = IndividualAnalysisService;
```

### Enhanced AnalysisController Methods
```javascript
// Add to existing AnalysisController.js

async getIndividualAnalysis(req, res) {
  try {
    const { projectId, type } = req.params;
    const { forceRefresh } = req.query;

    const result = await this.individualAnalysisService.loadAnalysisByType(
      projectId, 
      type, 
      { forceRefresh: forceRefresh === 'true' }
    );

    if (!result.success) {
      return res.status(404).json(result);
    }

    // Generate ETag for individual analysis
    const etag = this.etagService.generateAnalysisETag(result.data, projectId, type);
    
    if (this.etagService.shouldReturn304(req, etag)) {
      this.etagService.sendNotModified(res, etag);
      return;
    }
    
    this.etagService.setETagHeaders(res, etag, {
      maxAge: 300,
      mustRevalidate: true,
      isPublic: false
    });

    res.json({
      success: true,
      data: result.data,
      cached: result.cached,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    this.logger.error(`Failed to get individual analysis:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async getAnalysisStatus(req, res) {
  try {
    const { projectId, type } = req.params;
    
    const status = await this.individualAnalysisService.getAnalysisStatus(projectId, type);
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    this.logger.error(`Failed to get analysis status:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async preloadAnalysis(req, res) {
  try {
    const { projectId, type } = req.params;
    
    const result = await this.individualAnalysisService.preloadAnalysisType(projectId, type);
    
    res.json(result);

  } catch (error) {
    this.logger.error(`Failed to preload analysis:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
}
```

### Route Configuration
```javascript
// Add to Application.js setupRoutes() method

// Individual Analysis routes (protected) - PROJECT-BASED
this.app.get('/api/projects/:projectId/analysis/:type/individual', (req, res) => this.analysisController.getIndividualAnalysis(req, res));
this.app.get('/api/projects/:projectId/analysis/:type/status', (req, res) => this.analysisController.getAnalysisStatus(req, res));
this.app.post('/api/projects/:projectId/analysis/:type/preload', (req, res) => this.analysisController.preloadAnalysis(req, res));
```

### Service Integration
```javascript
// Update Application.js constructor to include IndividualAnalysisService

constructor() {
  // ... existing code ...
  
  // Initialize IndividualAnalysisService
  this.individualAnalysisService = new IndividualAnalysisService(
    this.analysisRepository,
    this.cacheService
  );
  
  // Inject into AnalysisController
  this.analysisController = new AnalysisController(
    this.codeQualityService,
    this.securityService,
    this.performanceService,
    this.architectureService,
    this.logger,
    this.analysisOutputService,
    this.analysisRepository,
    this.individualAnalysisService // Add this
  );
}
```

## Testing Strategy

### Unit Tests
```javascript
// tests/unit/IndividualAnalysisService.test.js
describe('IndividualAnalysisService', () => {
  let service;
  let mockRepository;
  let mockCache;

  beforeEach(() => {
    mockRepository = {
      findLatestByProjectIdAndType: jest.fn(),
      getAvailableTypes: jest.fn()
    };
    mockCache = {
      get: jest.fn(),
      set: jest.fn()
    };
    service = new IndividualAnalysisService(mockRepository, mockCache);
  });

  describe('loadAnalysisByType', () => {
    it('should return cached data when available', async () => {
      const cachedData = { test: 'data' };
      mockCache.get.mockResolvedValue(cachedData);
      
      const result = await service.loadAnalysisByType('project1', 'code-quality');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(cachedData);
      expect(result.cached).toBe(true);
    });

    it('should load from database when cache miss', async () => {
      const dbData = { resultData: { test: 'data' } };
      mockCache.get.mockResolvedValue(null);
      mockRepository.findLatestByProjectIdAndType.mockResolvedValue(dbData);
      
      const result = await service.loadAnalysisByType('project1', 'code-quality');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(dbData.resultData);
      expect(result.cached).toBe(false);
      expect(mockCache.set).toHaveBeenCalled();
    });
  });
});
```

## Error Handling
- Cache failures should not break the service
- Database errors should be properly logged and handled
- Invalid analysis types should return appropriate error messages
- Network timeouts should be handled gracefully

## Performance Considerations
- Cache TTL of 5 minutes for individual analyses
- Background preloading for better user experience
- ETag support for efficient caching
- Memory usage monitoring for large analysis results

## Security
- Input validation for projectId and analysisType
- Authentication required for all endpoints
- Rate limiting for individual analysis requests
- Audit logging for analysis access

## Next Phase Dependencies
This phase provides the backend foundation that Phase 2 (Frontend Lazy Loading Infrastructure) will build upon. The individual analysis endpoints and caching mechanisms will be consumed by the frontend components. 