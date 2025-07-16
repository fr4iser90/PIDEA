# Analysis Routing System Refactor - Implementation Plan

## 1. Project Overview
- **Feature/Component Name**: Analysis Routing System Refactor
- **Priority**: High
- **Category**: backend
- **Estimated Time**: 8 hours
- **Dependencies**: None (self-contained refactor)
- **Related Issues**: Current analysis API has 23 separate routes instead of RESTful design

## 2. Technical Requirements
- **Tech Stack**: Node.js, Express.js, existing analysis services
- **Architecture Pattern**: RESTful API design, MVC pattern
- **Database Changes**: None (only API layer changes)
- **API Changes**: Consolidate 23 analysis routes into 1 main endpoint + 2 utility endpoints
- **Frontend Changes**: Update API calls to use new endpoint structure
- **Backend Changes**: Refactor AnalysisController, update route definitions

## 3. File Impact Analysis

### Files to Modify:
- [ ] `backend/presentation/api/routes/analysis.js` - Consolidate all analysis routes into single endpoint
- [ ] `backend/presentation/api/controllers/AnalysisController.js` - Refactor to handle multiple analysis types
- [ ] `backend/domain/services/AnalysisQueueService.js` - Update to support batch analysis requests
- [ ] `backend/domain/services/AdvancedAnalysisService.js` - Add method to handle multiple analyzer types
- [ ] `frontend/src/infrastructure/api/analysisApi.js` - Update API calls to use new endpoint structure
- [ ] `frontend/src/presentation/components/AnalysisPanel.jsx` - Update to send analysis types array
- [ ] `docs/08_reference/api/analysis-api.md` - Update API documentation

### Files to Create:
- [ ] `backend/presentation/api/middleware/analysisValidation.js` - Validate analysis request payload
- [ ] `backend/domain/value-objects/AnalysisRequest.js` - Value object for analysis requests
- [ ] `tests/unit/controllers/AnalysisController.test.js` - Unit tests for new controller methods
- [ ] `tests/integration/api/analysis-endpoints.test.js` - Integration tests for new endpoints

### Files to Delete:
- [ ] None (keeping existing routes for backward compatibility during transition)

## 4. Implementation Phases

### Phase 1: Core API Refactor (3 hours)
- [ ] Create AnalysisRequest value object
- [ ] Refactor AnalysisController to handle batch requests
- [ ] Create analysis validation middleware
- [ ] Update main analysis route to accept types array

### Phase 2: Service Layer Updates (2 hours)
- [ ] Update AnalysisQueueService for batch processing
- [ ] Enhance AdvancedAnalysisService for multiple analyzers
- [ ] Add parallel execution support
- [ ] Implement request validation

### Phase 3: Frontend Integration (2 hours)
- [ ] Update frontend API client
- [ ] Modify AnalysisPanel component
- [ ] Update any other components using analysis API
- [ ] Test frontend-backend integration

### Phase 4: Testing & Documentation (1 hour)
- [ ] Write comprehensive unit tests
- [ ] Create integration tests
- [ ] Update API documentation
- [ ] Test backward compatibility

## 5. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging
- **Testing**: Jest framework, 90% coverage requirement
- **Documentation**: JSDoc for all public methods

## 6. Security Considerations
- [ ] Input validation for analysis types array
- [ ] Rate limiting for batch analysis requests
- [ ] Sanitization of analysis options
- [ ] Authorization checks for analysis access
- [ ] Audit logging for analysis requests

## 7. Performance Requirements
- **Response Time**: < 2 seconds for batch requests
- **Throughput**: Support 100 concurrent analysis requests
- **Memory Usage**: < 500MB for batch processing
- **Database Queries**: Optimize for parallel execution
- **Caching Strategy**: Cache analysis results for 1 hour

## 8. Testing Strategy

### Unit Tests:
- [ ] Test file: `tests/unit/controllers/AnalysisController.test.js`
- [ ] Test cases: Single analysis, batch analysis, invalid types, error handling
- [ ] Mock requirements: AnalysisQueueService, AdvancedAnalysisService

### Integration Tests:
- [ ] Test file: `tests/integration/api/analysis-endpoints.test.js`
- [ ] Test scenarios: API endpoint behavior, request validation, response format
- [ ] Test data: Various analysis type combinations

## 9. Documentation Requirements

### Code Documentation:
- [ ] JSDoc comments for new controller methods
- [ ] API documentation updates
- [ ] Architecture diagrams for new flow

### User Documentation:
- [ ] API migration guide
- [ ] New endpoint usage examples
- [ ] Backward compatibility notes

## 10. Deployment Checklist

### Pre-deployment:
- [ ] All tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Performance testing completed

### Deployment:
- [ ] Deploy with feature flag for gradual rollout
- [ ] Monitor API performance
- [ ] Verify backward compatibility

### Post-deployment:
- [ ] Monitor error rates
- [ ] Verify response times
- [ ] Collect user feedback

## 11. Rollback Plan
- [ ] Keep existing routes active during transition
- [ ] Feature flag to switch between old and new endpoints
- [ ] Database rollback not needed (no schema changes)

## 12. Success Criteria
- [ ] Single analysis endpoint handles all analysis types
- [ ] Batch processing works correctly
- [ ] Response times meet requirements
- [ ] All existing functionality preserved
- [ ] Tests pass with 90% coverage
- [ ] API documentation updated

## 13. Risk Assessment

### High Risk:
- [ ] Breaking existing frontend integrations - Mitigation: Gradual rollout with feature flags

### Medium Risk:
- [ ] Performance degradation with batch processing - Mitigation: Parallel execution and caching

### Low Risk:
- [ ] Documentation updates - Mitigation: Comprehensive review process

## 14. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/features/backend/analysis-routing-refactor/analysis-routing-refactor-implementation.md'
- **category**: 'backend'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: true

#### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/analysis-routing-refactor",
  "confirmation_keywords": ["fertig", "done", "complete"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 300
}
```

#### Success Indicators:
- [ ] All checkboxes in phases completed
- [ ] Tests pass with 90% coverage
- [ ] No build errors
- [ ] API documentation updated
- [ ] Performance requirements met

## 15. References & Resources
- **Technical Documentation**: Express.js routing best practices
- **API References**: RESTful API design principles
- **Design Patterns**: MVC pattern, Value Object pattern
- **Best Practices**: API versioning, backward compatibility
- **Similar Implementations**: Existing analysis services in codebase

## Current vs. Target API Structure

### Current (23 separate routes):
```
POST /api/projects/:projectId/analysis/code-quality
POST /api/projects/:projectId/analysis/security
POST /api/projects/:projectId/analysis/performance
POST /api/projects/:projectId/analysis/architecture
POST /api/projects/:projectId/analysis/techstack
POST /api/projects/:projectId/analysis/recommendations
... (17 more routes)
```

### Target (1 main route + 2 utility routes):
```
POST /api/projects/:projectId/analysis
{
  "types": ["code-quality", "security", "performance"],
  "options": {
    "code-quality": { "includeMetrics": true },
    "security": { "vulnerabilityScan": true }
  }
}

GET /api/projects/:projectId/analysis/types
GET /api/projects/:projectId/analysis/status/:analysisId
```

## Implementation Benefits
- **RESTful Design**: Follows REST principles
- **Performance**: Batch processing reduces HTTP overhead
- **Maintainability**: Single endpoint easier to maintain
- **Flexibility**: Client chooses which analyses to run
- **Scalability**: Easy to add new analysis types
- **User Experience**: Faster response times with parallel execution 