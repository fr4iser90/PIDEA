# Category Analysis Data Fix – Phase 2: Backend Data Fix

## Overview
Fix AnalysisController category endpoints to use proper data mapping and implement WebSocket streaming for large data. Add data mapping logic to AnalysisApplicationService and implement proper error handling.

## Objectives
- [ ] Fix AnalysisController category endpoints to use CategoryDataMapper
- [ ] Add data mapping logic to AnalysisApplicationService
- [ ] Implement WebSocket streaming for large data
- [ ] Add proper error handling and logging
- [ ] Update category endpoint logic to handle data transformation

## Deliverables
- File: `backend/presentation/api/AnalysisController.js` - Updated with data mapping
- File: `backend/application/services/AnalysisApplicationService.js` - Enhanced with category mapping
- File: `backend/infrastructure/services/WebSocketStreamingService.js` - New WebSocket streaming service
- File: `backend/tests/integration/CategoryAnalysisController.test.js` - Integration tests

## Dependencies
- Requires: Phase 1 completion (CategoryDataMapper)
- Blocks: Phase 3 (Frontend WebSocket Integration)

## Estimated Time
2 hours

## Success Criteria
- [ ] Category endpoints return correct data from database
- [ ] Data mapping works for all analysis types
- [ ] WebSocket streaming implemented for large data
- [ ] Error handling and logging improved
- [ ] Integration tests passing

## Technical Details

### AnalysisController Updates
- Update `getCategoryRecommendations`, `getCategoryIssues`, `getCategoryMetrics`, `getCategorySummary`, `getCategoryResults` methods
- Use CategoryDataMapper to transform data
- Add WebSocket streaming for large datasets (> 1MB)
- Implement proper error handling and fallback strategies

### AnalysisApplicationService Enhancements
- Add category-specific data extraction methods
- Integrate CategoryDataMapper for data transformation
- Add support for large data streaming
- Implement caching for category mappings

### WebSocket Streaming Service
- Handle large data streaming via WebSocket
- Implement chunking for multi-MB datasets
- Add progress indicators and status updates
- Provide fallback to HTTP API for small data

### Data Flow
1. Category endpoint receives request
2. AnalysisApplicationService retrieves data from database
3. CategoryDataMapper transforms data to expected format
4. If data is large (> 1MB), stream via WebSocket
5. If data is small, return via HTTP response
6. Handle errors and provide fallback strategies 