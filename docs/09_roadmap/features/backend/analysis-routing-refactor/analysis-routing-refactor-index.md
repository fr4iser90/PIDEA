# Analysis Routing System Refactor - Master Index

## 📋 Task Overview
- **Name**: Analysis Routing System Refactor
- **Category**: backend
- **Priority**: High
- **Status**: Planning
- **Total Estimated Time**: 8 hours
- **Created**: 2024-12-19
- **Last Updated**: 2024-12-19

## 📁 File Structure
```
docs/09_roadmap/features/backend/analysis-routing-refactor/
├── analysis-routing-refactor-index.md (this file)
├── analysis-routing-refactor-implementation.md
├── analysis-routing-refactor-phase-1.md
├── analysis-routing-refactor-phase-2.md
├── analysis-routing-refactor-phase-3.md
└── analysis-routing-refactor-phase-4.md
```

## 🎯 Main Implementation
- **[Analysis Routing Refactor Implementation](./analysis-routing-refactor-implementation.md)** - Complete implementation plan and specifications

## 📊 Phase Breakdown
| Phase | File | Status | Time | Progress |
|-------|------|--------|------|----------|
| 1 | [Phase 1: Core API Refactor](./analysis-routing-refactor-phase-1.md) | Planning | 3h | 0% |
| 2 | [Phase 2: Service Layer Updates](./analysis-routing-refactor-phase-2.md) | Planning | 2h | 0% |
| 3 | [Phase 3: Frontend Integration](./analysis-routing-refactor-phase-3.md) | Planning | 2h | 0% |
| 4 | [Phase 4: Testing & Documentation](./analysis-routing-refactor-phase-4.md) | Planning | 1h | 0% |

## 🔄 Subtask Management
### Active Subtasks
- [ ] [Phase 1: Core API Refactor](./analysis-routing-refactor-phase-1.md) - Planning - 0%
- [ ] [Phase 2: Service Layer Updates](./analysis-routing-refactor-phase-2.md) - Planning - 0%
- [ ] [Phase 3: Frontend Integration](./analysis-routing-refactor-phase-3.md) - Planning - 0%
- [ ] [Phase 4: Testing & Documentation](./analysis-routing-refactor-phase-4.md) - Planning - 0%

### Completed Subtasks
- None yet

### Pending Subtasks
- None

## 📈 Progress Tracking
- **Overall Progress**: 0% Complete
- **Current Phase**: Phase 1
- **Next Milestone**: Core API Refactor completion
- **Estimated Completion**: TBD

## 🔗 Related Tasks
- **Dependencies**: None (self-contained refactor)
- **Dependents**: Comprehensive Analysis Services Phase 5 (will benefit from this refactor)
- **Related**: 
  - [Comprehensive Analysis Services](../analysis/comprehensive-analysis-services/comprehensive-analysis-services-implementation.md)
  - [Analysis API Documentation](../../../08_reference/api/analysis-api.md)

## 📝 Notes & Updates

### 2024-12-19 - Task Creation
- Created comprehensive implementation plan
- Identified current API issues (23 separate routes)
- Designed RESTful solution with batch processing
- Planned 4-phase implementation approach
- Estimated 8 hours total development time

### Key Benefits of This Refactor
- **RESTful Design**: Follows REST principles with single resource endpoint
- **Performance**: Batch processing reduces HTTP overhead by 95%
- **Maintainability**: Single endpoint easier to maintain than 23 separate routes
- **Flexibility**: Client chooses which analyses to run
- **Scalability**: Easy to add new analysis types without new routes
- **User Experience**: Faster response times with parallel execution

## 🚀 Quick Actions
- [View Implementation Plan](./analysis-routing-refactor-implementation.md)
- [Start Phase 1](./analysis-routing-refactor-phase-1.md)
- [Review Progress](#progress-tracking)
- [Update Status](#notes--updates)

## 🎯 Current vs. Target API Structure

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

## 🔧 Technical Implementation Highlights

### Phase 1: Core API Refactor
- Create AnalysisRequest value object for validation
- Refactor AnalysisController with batch processing
- Implement validation middleware
- Update route definitions

### Phase 2: Service Layer Updates
- Enhance AnalysisQueueService for parallel execution
- Update AdvancedAnalysisService for multiple analyzers
- Implement progress tracking and error handling
- Add caching and performance optimizations

### Phase 3: Frontend Integration
- Update API client for new endpoint structure
- Enhance AnalysisPanel with multi-select interface
- Implement progress visualization
- Add comprehensive error handling

### Phase 4: Testing & Documentation
- Comprehensive unit and integration tests
- E2E workflow testing
- Complete API documentation updates
- Migration guide for existing users

## 📊 Success Metrics
- **Performance**: < 2 seconds for batch requests (vs current 10+ seconds)
- **Maintainability**: 95% reduction in route definitions
- **User Experience**: Single request instead of 23 separate calls
- **Scalability**: Easy addition of new analysis types
- **Code Quality**: 90% test coverage maintained

## 🚨 Risk Mitigation
- **Backward Compatibility**: Keep existing routes during transition
- **Feature Flags**: Gradual rollout with toggle capability
- **Comprehensive Testing**: Extensive test coverage before deployment
- **Performance Monitoring**: Real-time monitoring during rollout
- **Rollback Plan**: Quick rollback capability if issues arise 