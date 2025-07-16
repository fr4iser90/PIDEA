# Analysis Routing Refactor - Phase 2: Service Layer Updates

## Overview
Phase 2 focuses on updating the service layer to support batch processing, parallel execution, and enhanced request handling for the new RESTful analysis API.

## Objectives
- [ ] Update AnalysisQueueService for batch processing
- [ ] Enhance AdvancedAnalysisService for multiple analyzers
- [ ] Add parallel execution support
- [ ] Implement request validation

## Deliverables

### AnalysisQueueService Updates
- **File**: `backend/domain/services/AnalysisQueueService.js`
- **Changes**:
  - Add `processBatch` method for handling multiple analysis types
  - Implement parallel execution using Promise.allSettled
  - Add progress tracking for batch operations
  - Enhance error handling for partial failures
  - Add caching for batch results

### AdvancedAnalysisService Enhancements
- **File**: `backend/domain/services/AdvancedAnalysisService.js`
- **Changes**:
  - Add `executeMultipleAnalyzers` method
  - Implement analyzer type validation
  - Add support for analyzer-specific options
  - Enhance result aggregation
  - Add performance monitoring

### Parallel Execution Implementation
- **Features**:
  - Use Promise.allSettled for parallel processing
  - Handle partial failures gracefully
  - Provide progress updates
  - Implement timeout handling
  - Add resource management

### Request Validation Enhancement
- **File**: `backend/domain/services/AnalysisQueueService.js`
- **Changes**:
  - Integrate with AnalysisRequest value object
  - Add comprehensive validation logic
  - Implement rate limiting for batch requests
  - Add request size limits

## Implementation Details

### Batch Processing Method
```javascript
async processBatch(analysisRequest) {
  const { projectId, types, options } = analysisRequest;
  
  // Validate request
  this.validateBatchRequest(analysisRequest);
  
  // Create analysis session
  const sessionId = await this.createAnalysisSession(projectId, types);
  
  // Execute analyses in parallel
  const analysisPromises = types.map(type => 
    this.executeSingleAnalysis(projectId, type, options[type] || {})
  );
  
  const results = await Promise.allSettled(analysisPromises);
  
  // Process results
  const processedResults = this.processBatchResults(results, types);
  
  // Update session with results
  await this.updateAnalysisSession(sessionId, processedResults);
  
  return {
    analysisId: sessionId,
    analyses: processedResults
  };
}
```

### Multiple Analyzers Execution
```javascript
async executeMultipleAnalyzers(projectId, types, options = {}) {
  const analyzers = this.getAnalyzersForTypes(types);
  
  const results = {};
  
  for (const [type, analyzer] of Object.entries(analyzers)) {
    try {
      const analyzerOptions = options[type] || {};
      results[type] = await analyzer.analyze(projectId, analyzerOptions);
    } catch (error) {
      results[type] = {
        success: false,
        error: error.message,
        type: type
      };
    }
  }
  
  return results;
}
```

### Progress Tracking
```javascript
class BatchProgressTracker {
  constructor(totalAnalyses) {
    this.total = totalAnalyses;
    this.completed = 0;
    this.failed = 0;
    this.results = {};
  }
  
  updateProgress(type, result, success) {
    this.completed++;
    if (!success) this.failed++;
    this.results[type] = result;
    
    return {
      progress: (this.completed / this.total) * 100,
      completed: this.completed,
      failed: this.failed,
      remaining: this.total - this.completed
    };
  }
}
```

### Enhanced Error Handling
```javascript
processBatchResults(results, types) {
  const processedResults = {};
  
  results.forEach((result, index) => {
    const type = types[index];
    
    if (result.status === 'fulfilled') {
      processedResults[type] = {
        success: true,
        data: result.value,
        type: type
      };
    } else {
      processedResults[type] = {
        success: false,
        error: result.reason.message,
        type: type
      };
    }
  });
  
  return processedResults;
}
```

## Performance Optimizations

### Parallel Execution
- Use Promise.allSettled for true parallel processing
- Implement connection pooling for database operations
- Add request batching for external API calls
- Use worker threads for CPU-intensive operations

### Caching Strategy
- Cache analysis results for 1 hour
- Implement cache warming for common analysis types
- Use Redis for distributed caching
- Add cache invalidation on project updates

### Resource Management
- Implement request queuing for high load
- Add memory usage monitoring
- Implement timeout handling (30 seconds per analysis)
- Add circuit breaker for external dependencies

## Testing Requirements

### Unit Tests
- **File**: `tests/unit/services/AnalysisQueueService.test.js`
- **Test Cases**:
  - Batch processing with multiple types
  - Parallel execution behavior
  - Error handling for partial failures
  - Progress tracking accuracy
  - Caching behavior

### Integration Tests
- **File**: `tests/integration/services/AnalysisQueueService.test.js`
- **Test Cases**:
  - End-to-end batch processing
  - Performance under load
  - Memory usage monitoring
  - Error recovery scenarios

## Success Criteria
- [ ] AnalysisQueueService supports batch processing
- [ ] AdvancedAnalysisService handles multiple analyzers
- [ ] Parallel execution works correctly
- [ ] Progress tracking is accurate
- [ ] Error handling works for partial failures
- [ ] Performance meets requirements (< 2 seconds for batch)
- [ ] All tests pass

## Time Estimate: 2 hours

## Dependencies
- Phase 1: Core API Refactor (AnalysisRequest value object)

## Next Phase
Phase 3: Frontend Integration - Update frontend API client and components to use new endpoint structure 