# Analysis Routing Refactor - Phase 1: Core API Refactor

## Overview
Phase 1 focuses on creating the foundation for the new RESTful analysis API by implementing value objects, refactoring the controller, and creating validation middleware.

## Objectives
- [ ] Create AnalysisRequest value object
- [ ] Refactor AnalysisController to handle batch requests
- [ ] Create analysis validation middleware
- [ ] Update main analysis route to accept types array

## Deliverables

### Value Object Creation
- **File**: `backend/domain/value-objects/AnalysisRequest.js`
- **Purpose**: Encapsulate analysis request data with validation
- **Features**:
  - Validate analysis types array
  - Validate options object structure
  - Provide clean interface for request data
  - Support both single and batch analysis requests

### Controller Refactor
- **File**: `backend/presentation/api/controllers/AnalysisController.js`
- **Changes**:
  - Add new `analyzeProjectBatch` method
  - Update existing methods to use AnalysisRequest value object
  - Implement parallel execution for multiple analysis types
  - Add proper error handling for batch requests

### Validation Middleware
- **File**: `backend/presentation/api/middleware/analysisValidation.js`
- **Purpose**: Validate incoming analysis requests
- **Features**:
  - Validate required fields (projectId, types)
  - Validate analysis types against allowed list
  - Validate options object structure
  - Return appropriate error responses

### Route Updates
- **File**: `backend/presentation/api/routes/analysis.js`
- **Changes**:
  - Update main analysis route to accept types array
  - Add validation middleware to routes
  - Keep existing routes for backward compatibility
  - Add new utility routes for analysis types and status

## Implementation Details

### AnalysisRequest Value Object
```javascript
class AnalysisRequest {
  constructor(projectId, types, options = {}) {
    this.projectId = projectId;
    this.types = this.validateTypes(types);
    this.options = this.validateOptions(options);
  }

  validateTypes(types) {
    // Validate and return supported analysis types
  }

  validateOptions(options) {
    // Validate options structure for each analysis type
  }

  toJSON() {
    return {
      projectId: this.projectId,
      types: this.types,
      options: this.options
    };
  }
}
```

### Controller Method Signature
```javascript
async analyzeProjectBatch(req, res) {
  try {
    const analysisRequest = new AnalysisRequest(
      req.params.projectId,
      req.body.types,
      req.body.options
    );
    
    const results = await this.analysisQueueService.processBatch(analysisRequest);
    
    res.json({
      success: true,
      analysisId: results.analysisId,
      results: results.analyses
    });
  } catch (error) {
    // Handle errors appropriately
  }
}
```

### Validation Middleware
```javascript
const validateAnalysisRequest = (req, res, next) => {
  const { types, options } = req.body;
  
  if (!types || !Array.isArray(types)) {
    return res.status(400).json({
      error: 'types must be an array'
    });
  }
  
  // Additional validation logic
  
  next();
};
```

## Testing Requirements

### Unit Tests
- **File**: `tests/unit/value-objects/AnalysisRequest.test.js`
- **Test Cases**:
  - Valid analysis request creation
  - Invalid types validation
  - Invalid options validation
  - JSON serialization

### Integration Tests
- **File**: `tests/integration/controllers/AnalysisController.test.js`
- **Test Cases**:
  - Batch analysis endpoint behavior
  - Error handling for invalid requests
  - Response format validation

## Success Criteria
- [ ] AnalysisRequest value object created and tested
- [ ] AnalysisController supports batch requests
- [ ] Validation middleware properly validates requests
- [ ] Routes updated to use new structure
- [ ] All unit tests pass
- [ ] Integration tests pass

## Time Estimate: 3 hours

## Dependencies
- None (self-contained phase)

## Next Phase
Phase 2: Service Layer Updates - Update AnalysisQueueService and AdvancedAnalysisService for batch processing 