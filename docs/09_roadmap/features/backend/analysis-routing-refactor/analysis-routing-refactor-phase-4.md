# Analysis Routing Refactor - Phase 4: Testing & Documentation

## Overview
Phase 4 focuses on comprehensive testing of the new RESTful analysis API, updating documentation, and ensuring backward compatibility while maintaining high code quality standards.

## Objectives
- [ ] Write comprehensive unit tests
- [ ] Create integration tests
- [ ] Update API documentation
- [ ] Test backward compatibility

## Deliverables

### Unit Testing
- **Backend Unit Tests**:
  - `tests/unit/value-objects/AnalysisRequest.test.js`
  - `tests/unit/controllers/AnalysisController.test.js`
  - `tests/unit/services/AnalysisQueueService.test.js`
  - `tests/unit/services/AdvancedAnalysisService.test.js`
  - `tests/unit/middleware/analysisValidation.test.js`

- **Frontend Unit Tests**:
  - `frontend/tests/unit/components/AnalysisPanel.test.js`
  - `frontend/tests/unit/infrastructure/api/analysisApi.test.js`
  - `frontend/tests/unit/hooks/useAnalysisProgress.test.js`

### Integration Testing
- **Backend Integration Tests**:
  - `tests/integration/api/analysis-endpoints.test.js`
  - `tests/integration/services/AnalysisQueueService.test.js`
  - `tests/integration/controllers/AnalysisController.test.js`

- **Frontend Integration Tests**:
  - `frontend/tests/integration/api/analysisApi.test.js`
  - `frontend/tests/integration/components/AnalysisPanel.test.js`

### E2E Testing
- **Complete Workflow Tests**:
  - `tests/e2e/analysis-workflow.test.js`
  - `frontend/tests/e2e/analysis-workflow.test.js`

### Documentation Updates
- **API Documentation**: `docs/08_reference/api/analysis-api.md`
- **Migration Guide**: `docs/06_development/api-migration-guide.md`
- **User Guide**: `docs/03_features/analysis-system.md`

## Implementation Details

### Unit Test Examples

#### AnalysisRequest Value Object Tests
```javascript
describe('AnalysisRequest', () => {
  test('should create valid analysis request', () => {
    const request = new AnalysisRequest('project-123', ['code-quality', 'security']);
    
    expect(request.projectId).toBe('project-123');
    expect(request.types).toEqual(['code-quality', 'security']);
    expect(request.options).toEqual({});
  });

  test('should validate analysis types', () => {
    expect(() => {
      new AnalysisRequest('project-123', ['invalid-type']);
    }).toThrow('Invalid analysis type: invalid-type');
  });

  test('should validate options structure', () => {
    const options = {
      'code-quality': { includeMetrics: true },
      'security': { vulnerabilityScan: true }
    };
    
    const request = new AnalysisRequest('project-123', ['code-quality', 'security'], options);
    expect(request.options).toEqual(options);
  });
});
```

#### Controller Tests
```javascript
describe('AnalysisController', () => {
  test('should handle batch analysis request', async () => {
    const mockRequest = {
      params: { projectId: 'project-123' },
      body: {
        types: ['code-quality', 'security'],
        options: { 'code-quality': { includeMetrics: true } }
      }
    };

    const mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    await analysisController.analyzeProjectBatch(mockRequest, mockResponse);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        analysisId: expect.any(String),
        results: expect.any(Object)
      })
    );
  });

  test('should handle validation errors', async () => {
    const mockRequest = {
      params: { projectId: 'project-123' },
      body: { types: 'invalid' }
    };

    const mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    await analysisController.analyzeProjectBatch(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(String)
      })
    );
  });
});
```

#### Service Layer Tests
```javascript
describe('AnalysisQueueService', () => {
  test('should process batch analysis', async () => {
    const analysisRequest = new AnalysisRequest('project-123', ['code-quality', 'security']);
    
    const result = await analysisQueueService.processBatch(analysisRequest);
    
    expect(result).toHaveProperty('analysisId');
    expect(result).toHaveProperty('analyses');
    expect(result.analyses).toHaveProperty('code-quality');
    expect(result.analyses).toHaveProperty('security');
  });

  test('should handle partial failures', async () => {
    // Mock one analyzer to fail
    jest.spyOn(codeQualityAnalyzer, 'analyze').mockRejectedValue(new Error('Analyzer failed'));
    
    const analysisRequest = new AnalysisRequest('project-123', ['code-quality', 'security']);
    const result = await analysisQueueService.processBatch(analysisRequest);
    
    expect(result.analyses['code-quality'].success).toBe(false);
    expect(result.analyses['security'].success).toBe(true);
  });
});
```

### Integration Test Examples

#### API Endpoint Tests
```javascript
describe('Analysis API Endpoints', () => {
  test('POST /api/projects/:projectId/analysis should handle batch request', async () => {
    const response = await request(app)
      .post('/api/projects/project-123/analysis')
      .send({
        types: ['code-quality', 'security'],
        options: {
          'code-quality': { includeMetrics: true }
        }
      })
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('analysisId');
    expect(response.body).toHaveProperty('results');
  });

  test('GET /api/projects/:projectId/analysis/types should return available types', async () => {
    const response = await request(app)
      .get('/api/projects/project-123/analysis/types')
      .expect(200);

    expect(response.body).toHaveProperty('types');
    expect(Array.isArray(response.body.types)).toBe(true);
    expect(response.body.types).toContain('code-quality');
    expect(response.body.types).toContain('security');
  });
});
```

### E2E Test Examples

#### Complete Workflow Test
```javascript
describe('Analysis Workflow E2E', () => {
  test('should complete full analysis workflow', async () => {
    // Navigate to analysis panel
    await page.goto('/projects/project-123/analysis');
    
    // Select analysis types
    await page.click('input[value="code-quality"]');
    await page.click('input[value="security"]');
    
    // Start analysis
    await page.click('button:has-text("Run Analysis")');
    
    // Wait for progress
    await page.waitForSelector('.progress-bar');
    
    // Wait for completion
    await page.waitForSelector('.analysis-results', { timeout: 30000 });
    
    // Verify results
    const results = await page.$$('.result-item');
    expect(results.length).toBeGreaterThan(0);
    
    // Verify success indicators
    const successResults = await page.$$('.result-item.success');
    expect(successResults.length).toBeGreaterThan(0);
  });
});
```

## Documentation Updates

### API Documentation
```markdown
# Analysis API Reference

## POST /api/projects/:projectId/analysis

Execute one or more analysis types on a project.

### Request Body
```json
{
  "types": ["code-quality", "security", "performance"],
  "options": {
    "code-quality": { "includeMetrics": true },
    "security": { "vulnerabilityScan": true }
  }
}
```

### Response
```json
{
  "success": true,
  "analysisId": "analysis-123",
  "results": {
    "code-quality": {
      "success": true,
      "data": { /* analysis results */ }
    },
    "security": {
      "success": true,
      "data": { /* analysis results */ }
    }
  }
}
```

## GET /api/projects/:projectId/analysis/types

Get available analysis types for a project.

### Response
```json
{
  "types": ["code-quality", "security", "performance", "architecture"]
}
```

## GET /api/projects/:projectId/analysis/status/:analysisId

Get the status of a running analysis.

### Response
```json
{
  "status": "completed",
  "progress": 100,
  "results": { /* analysis results */ }
}
```
```

### Migration Guide
```markdown
# Analysis API Migration Guide

## Overview
The analysis API has been refactored to use a RESTful design with batch processing capabilities.

## Changes

### Old API (Deprecated)
```javascript
// Multiple separate endpoints
await api.post('/api/projects/123/analysis/code-quality');
await api.post('/api/projects/123/analysis/security');
await api.post('/api/projects/123/analysis/performance');
```

### New API (Recommended)
```javascript
// Single batch endpoint
await api.post('/api/projects/123/analysis', {
  types: ['code-quality', 'security', 'performance'],
  options: {
    'code-quality': { includeMetrics: true }
  }
});
```

## Migration Steps

1. **Update API calls** to use the new batch endpoint
2. **Update response handling** to process batch results
3. **Add progress tracking** for better user experience
4. **Test thoroughly** to ensure compatibility

## Backward Compatibility
- Old endpoints remain available during transition period
- Feature flag controls which API version to use
- Gradual migration recommended
```

## Testing Strategy

### Test Coverage Requirements
- **Unit Tests**: 90% coverage minimum
- **Integration Tests**: All API endpoints covered
- **E2E Tests**: Complete user workflows
- **Performance Tests**: Load testing for batch operations

### Test Data Requirements
- **Mock Projects**: Various project types and sizes
- **Analysis Results**: Pre-generated analysis data
- **Error Scenarios**: Network failures, timeouts, invalid data
- **Performance Data**: Large projects, many analysis types

### Automated Testing
- **CI/CD Integration**: Tests run on every commit
- **Performance Monitoring**: Response time tracking
- **Error Tracking**: Automated error reporting
- **Coverage Reports**: Automated coverage generation

## Success Criteria
- [ ] All unit tests pass with 90% coverage
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] API documentation is complete and accurate
- [ ] Migration guide is comprehensive
- [ ] Backward compatibility verified
- [ ] Performance requirements met
- [ ] Error handling tested thoroughly

## Time Estimate: 1 hour

## Dependencies
- Phase 1: Core API Refactor
- Phase 2: Service Layer Updates
- Phase 3: Frontend Integration

## Next Steps
- Deploy to staging environment
- Conduct user acceptance testing
- Monitor performance in production
- Plan gradual rollout to users 