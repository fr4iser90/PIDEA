# Queue History Enhancement - Phase 2: API Enhancement

## 📋 Phase Overview
- **Phase Name**: API Enhancement
- **Phase Number**: 2
- **Parent Task**: Queue History Enhancement & Workflow Type Identification
- **Estimated Time**: 8 hours
- **Status**: ⏳ Planning
- **Dependencies**: Phase 1 (Backend Foundation Setup)
- **Created**: 2025-07-28T13:25:05.334Z

## 🎯 Phase Objectives
- [ ] Add history endpoints to QueueController
- [ ] Implement enhanced type detection endpoints
- [ ] Add step progress API improvements
- [ ] Update WebSocket events for real-time history updates
- [ ] Add API documentation for new endpoints
- [ ] Write integration tests for new APIs

## 📁 Files to Modify

### Backend API Controllers
- [ ] `backend/presentation/api/QueueController.js` - Add history endpoints and enhanced type detection
  - **New Endpoints**: GET /api/queue/history, GET /api/queue/history/:id, DELETE /api/queue/history
  - **Enhanced Endpoints**: POST /api/queue/type-detect, GET /api/queue/types
  - **Error Handling**: Strict validation with specific error responses

### WebSocket Integration
- [ ] `backend/presentation/websocket/QueueWebSocketHandler.js` - Update for real-time history updates
  - **New Events**: queue.history.updated, queue.type.detected, queue.step.progress
  - **Error Events**: queue.error.type_detection, queue.error.history_access

## 📁 Files to Create

### API Documentation
- [ ] `backend/docs/api/queue-history-endpoints.md` - API documentation for history endpoints
- [ ] `backend/docs/api/workflow-type-detection-endpoints.md` - API documentation for type detection

### Integration Tests
- [ ] `backend/tests/integration/api/QueueHistory.test.js` - History API integration tests
- [ ] `backend/tests/integration/api/taskModeDetection.test.js` - Type detection API tests

## 🔧 Implementation Details

### QueueController Enhancements
```javascript
class QueueController {
  constructor(queueHistoryService, TaskModeDetector, logger) {
    this.historyService = queueHistoryService;
    this.typeDetector = TaskModeDetector;
    this.logger = logger;
  }

  // History Endpoints
  async getQueueHistory(req, res) {
    try {
      const { page = 1, limit = 20, type, status, startDate, endDate } = req.query;
      
      // Validate query parameters - throw error if invalid
      this.validateHistoryQuery({ page, limit, type, status, startDate, endDate });
      
      const filters = { type, status, startDate, endDate };
      const pagination = { page: parseInt(page), limit: parseInt(limit) };
      
      const history = await this.historyService.getWorkflowHistory(filters, pagination);
      
      res.json({
        success: true,
        data: history.items,
        pagination: history.pagination
      });
    } catch (error) {
      this.logger.error('Error fetching queue history:', error);
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.constructor.name
      });
    }
  }

  async getQueueHistoryItem(req, res) {
    try {
      const { id } = req.params;
      
      // Validate ID - throw error if invalid
      if (!id || !this.isValidUUID(id)) {
        throw new InvalidHistoryIdError('Invalid history item ID provided');
      }
      
      const historyItem = await this.historyService.getHistoryItem(id);
      
      if (!historyItem) {
        throw new HistoryItemNotFoundError(`History item with ID ${id} not found`);
      }
      
      res.json({
        success: true,
        data: historyItem
      });
    } catch (error) {
      this.logger.error('Error fetching history item:', error);
      res.status(404).json({
        success: false,
        error: error.message,
        code: error.constructor.name
      });
    }
  }

  async deleteQueueHistory(req, res) {
    try {
      const { retentionDays } = req.body;
      
      // Validate retention days - throw error if invalid
      if (!retentionDays || retentionDays < 1) {
        throw new InvalidRetentionError('Retention days must be at least 1');
      }
      
      const deletedCount = await this.historyService.cleanupOldHistory(retentionDays);
      
      res.json({
        success: true,
        data: { deletedCount },
        message: `Successfully deleted ${deletedCount} history items`
      });
    } catch (error) {
      this.logger.error('Error deleting queue history:', error);
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.constructor.name
      });
    }
  }

  // Type Detection Endpoints
  async detecttaskMode(req, res) {
    try {
      const { workflowData } = req.body;
      
      // Validate workflow data - throw error if invalid
      if (!workflowData || !workflowData.steps) {
        throw new InvalidWorkflowDataError('Workflow data with steps is required');
      }
      
      const detectedType = this.typeDetector.detecttaskMode(workflowData);
      
      res.json({
        success: true,
        data: {
          type: detectedType,
          confidence: 1.0, // No fallbacks = 100% confidence
          analysis: {
            stepCount: workflowData.steps.length,
            analysisMethod: 'strict_detection'
          }
        }
      });
    } catch (error) {
      this.logger.error('Error detecting workflow type:', error);
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.constructor.name
      });
    }
  }

  async gettaskModes(req, res) {
    try {
      const types = this.typeDetector.getKnownTypes();
      
      res.json({
        success: true,
        data: {
          types: Array.from(types),
          count: types.size,
          detectionMethod: 'strict_no_fallbacks'
        }
      });
    } catch (error) {
      this.logger.error('Error fetching workflow types:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        code: error.constructor.name
      });
    }
  }

  // Validation Methods
  validateHistoryQuery(query) {
    const { page, limit, type, status, startDate, endDate } = query;
    
    if (page && (isNaN(page) || page < 1)) {
      throw new InvalidQueryError('Page must be a positive number');
    }
    
    if (limit && (isNaN(limit) || limit < 1 || limit > 100)) {
      throw new InvalidQueryError('Limit must be between 1 and 100');
    }
    
    if (type && !this.typeDetector.getKnownTypes().has(type)) {
      throw new InvalidTypeError(`Unknown workflow type: ${type}`);
    }
    
    if (status && !['completed', 'failed', 'cancelled'].includes(status)) {
      throw new InvalidStatusError(`Invalid status: ${status}`);
    }
    
    if (startDate && !this.isValidDate(startDate)) {
      throw new InvalidDateError('Invalid start date format');
    }
    
    if (endDate && !this.isValidDate(endDate)) {
      throw new InvalidDateError('Invalid end date format');
    }
  }

  isValidUUID(id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }
}
```

### WebSocket Event Updates
```javascript
class QueueWebSocketHandler {
  constructor(queueHistoryService, TaskModeDetector, logger) {
    this.historyService = queueHistoryService;
    this.typeDetector = TaskModeDetector;
    this.logger = logger;
  }

  // Real-time History Updates
  async handleHistoryUpdate(workflowId, historyData) {
    try {
      // Validate history data - throw error if invalid
      if (!historyData || !historyData.id) {
        throw new InvalidHistoryDataError('Invalid history data for WebSocket update');
      }
      
      this.broadcast('queue.history.updated', {
        workflowId,
        history: historyData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Error handling history update:', error);
      this.broadcast('queue.error.history_update', {
        error: error.message,
        code: error.constructor.name
      });
    }
  }

  // Real-time Type Detection
  async handleTypeDetection(workflowId, workflowData) {
    try {
      const detectedType = this.typeDetector.detecttaskMode(workflowData);
      
      this.broadcast('queue.type.detected', {
        workflowId,
        type: detectedType,
        confidence: 1.0,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Error in type detection:', error);
      this.broadcast('queue.error.type_detection', {
        workflowId,
        error: error.message,
        code: error.constructor.name
      });
    }
  }

  // Step Progress Updates
  async handleStepProgress(workflowId, stepData) {
    try {
      // Validate step data - throw error if invalid
      if (!stepData || !stepData.stepId || !stepData.status) {
        throw new InvalidStepDataError('Invalid step data for progress update');
      }
      
      this.broadcast('queue.step.progress', {
        workflowId,
        step: stepData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Error handling step progress:', error);
      this.broadcast('queue.error.step_progress', {
        workflowId,
        error: error.message,
        code: error.constructor.name
      });
    }
  }

  broadcast(event, data) {
    // WebSocket broadcast implementation
    this.io.emit(event, data);
  }
}
```

### API Routes
```javascript
// Queue History Routes
router.get('/api/queue/history', queueController.getQueueHistory.bind(queueController));
router.get('/api/queue/history/:id', queueController.getQueueHistoryItem.bind(queueController));
router.delete('/api/queue/history', queueController.deleteQueueHistory.bind(queueController));

// Workflow Type Detection Routes
router.post('/api/queue/type-detect', queueController.detecttaskMode.bind(queueController));
router.get('/api/queue/types', queueController.gettaskModes.bind(queueController));
```

## 🧪 Testing Strategy

### Integration Tests for History API
```javascript
describe('Queue History API', () => {
  describe('GET /api/queue/history', () => {
    it('should return queue history with pagination', async () => {
      const response = await request(app)
        .get('/api/queue/history')
        .query({ page: 1, limit: 10 });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.pagination).toBeDefined();
    });

    it('should throw error for invalid page parameter', async () => {
      const response = await request(app)
        .get('/api/queue/history')
        .query({ page: -1 });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('InvalidQueryError');
    });

    it('should throw error for invalid workflow type', async () => {
      const response = await request(app)
        .get('/api/queue/history')
        .query({ type: 'unknown_type' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('InvalidTypeError');
    });
  });

  describe('GET /api/queue/history/:id', () => {
    it('should return specific history item', async () => {
      const validId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .get(`/api/queue/history/${validId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should throw error for invalid UUID', async () => {
      const response = await request(app)
        .get('/api/queue/history/invalid-id');
      
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('InvalidHistoryIdError');
    });
  });
});
```

### Integration Tests for Type Detection API
```javascript
describe('Workflow Type Detection API', () => {
  describe('POST /api/queue/type-detect', () => {
    it('should detect known workflow type', async () => {
      const workflowData = {
        steps: [{ action: 'refactor_code', parameters: { language: 'javascript' } }]
      };
      
      const response = await request(app)
        .post('/api/queue/type-detect')
        .send({ workflowData });
      
      expect(response.status).toBe(200);
      expect(response.body.data.type).toBe('refactoring');
      expect(response.body.data.confidence).toBe(1.0);
    });

    it('should throw error for unknown workflow type', async () => {
      const workflowData = {
        steps: [{ action: 'unknown_action' }]
      };
      
      const response = await request(app)
        .post('/api/queue/type-detect')
        .send({ workflowData });
      
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('UnknowntaskModeError');
    });

    it('should throw error for invalid workflow data', async () => {
      const response = await request(app)
        .post('/api/queue/type-detect')
        .send({ workflowData: null });
      
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('InvalidWorkflowDataError');
    });
  });
});
```

## 🔒 Security Considerations
- [ ] Input validation for all API endpoints
- [ ] Rate limiting for history and type detection endpoints
- [ ] Authentication and authorization for sensitive operations
- [ ] Audit logging for all API access
- [ ] CORS configuration for WebSocket connections

## 📊 Performance Requirements
- **API Response Time**: < 200ms for history queries, < 100ms for type detection
- **WebSocket Latency**: < 50ms for real-time updates
- **Concurrent Connections**: Support 100+ WebSocket connections
- **Database Queries**: Optimized with proper indexing

## ✅ Success Criteria
- [ ] All history endpoints return correct data with proper error handling
- [ ] Type detection endpoints work with strict validation (no fallbacks)
- [ ] WebSocket events fire correctly for real-time updates
- [ ] All integration tests pass
- [ ] API documentation is complete and accurate
- [ ] Error responses include specific error codes and messages

## 🚨 Risk Mitigation
- **API Performance**: Implement caching and query optimization
- **WebSocket Scalability**: Connection pooling and load balancing
- **Error Propagation**: Proper error handling and logging
- **Security Vulnerabilities**: Input validation and rate limiting

## 🔄 Next Phase Dependencies
- API endpoints must be functional for frontend integration
- WebSocket events must be working for real-time updates
- Error handling patterns must be established for frontend error handling
- Integration tests must pass before frontend development

---

**Note**: This phase focuses on API enhancement with strict error handling and no fallback mechanisms. All endpoints will throw specific errors for invalid inputs rather than using default values. 