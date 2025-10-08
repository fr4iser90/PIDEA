# Queue History Enhancement - Phase 1: Backend Foundation Setup

## 📋 Phase Overview
- **Phase Name**: Backend Foundation Setup
- **Phase Number**: 1
- **Parent Task**: Queue History Enhancement & Workflow Type Identification
- **Estimated Time**: 12 hours
- **Status**: ⏳ Planning
- **Dependencies**: None
- **Created**: 2025-07-28T13:25:05.334Z

## 🎯 Phase Objectives
- [ ] Create QueueHistoryService with persistence logic
- [ ] Implement TaskModeDetector with strict type detection (no fallbacks)
- [ ] Create QueueHistoryRepository for database operations
- [ ] Add database migrations for history and type detection tables
- [ ] Set up Redis caching for history data
- [ ] Create initial tests for new services with strict error handling

## 📁 Files to Create

### Backend Services
- [ ] `backend/domain/services/queue/QueueHistoryService.js` - Queue history management and persistence
  - **Purpose**: Core service for managing queue history with strict error handling
  - **Key Features**: History persistence, cleanup policies, filtering, pagination
  - **Error Handling**: No fallbacks - throw errors for invalid operations

- [ ] `backend/domain/services/queue/TaskModeDetector.js` - Intelligent workflow type detection
  - **Purpose**: Strict type detection with zero fallback mechanisms
  - **Key Features**: Step analysis, metadata analysis, pattern recognition
  - **Error Handling**: Throw specific errors for unknown types

- [ ] `backend/infrastructure/database/QueueHistoryRepository.js` - Database operations for queue history
  - **Purpose**: Database layer for queue history operations
  - **Key Features**: CRUD operations, query optimization, connection management

### Database Migrations
- [ ] `database/migrations/add_queue_history_table.sql` - Database migration for history table
  - **Purpose**: Create queue_history table with proper indexes
  - **Schema**: workflow_id, type, status, created_at, completed_at, metadata, steps_data

- [ ] `database/migrations/add_workflow_type_detection_table.sql` - Database migration for type detection
  - **Purpose**: Create workflow_type_detection table for type analysis data
  - **Schema**: workflow_id, detected_type, confidence_score, analysis_data, created_at

### Test Files
- [ ] `backend/tests/unit/services/queue/QueueHistoryService.test.js` - Queue history service tests
  - **Test Cases**: History persistence, cleanup, retrieval, filtering, pagination
  - **Error Tests**: Verify errors thrown for invalid operations
  - **Mock Requirements**: Database connection, Redis cache, event bus

- [ ] `backend/tests/unit/services/queue/TaskModeDetector.test.js` - Type detector tests
  - **Test Cases**: Type detection accuracy, error throwing for unknown types, strict validation
  - **Error Tests**: Verify errors thrown for unrecognized workflow types
  - **Mock Requirements**: Workflow data, step definitions, metadata

## 🔧 Implementation Details

### QueueHistoryService Implementation
```javascript
class QueueHistoryService {
  constructor(queueHistoryRepository, cacheService, logger) {
    this.repository = queueHistoryRepository;
    this.cache = cacheService;
    this.logger = logger;
  }

  async persistWorkflowHistory(workflowData) {
    // Validate workflow data - throw error if invalid
    if (!workflowData || !workflowData.id) {
      throw new InvalidWorkflowDataError('Workflow data is required and must have an ID');
    }

    // Store in database and cache
    const history = await this.repository.create(workflowData);
    await this.cache.set(`history:${workflowData.id}`, history, 3600);
    
    return history;
  }

  async getWorkflowHistory(filters, pagination) {
    // Validate filters - throw error if invalid
    if (filters && !this.validateFilters(filters)) {
      throw new InvalidFilterError('Invalid filter parameters provided');
    }

    return await this.repository.find(filters, pagination);
  }

  async cleanupOldHistory(retentionDays) {
    // Validate retention period - throw error if invalid
    if (!retentionDays || retentionDays < 1) {
      throw new InvalidRetentionError('Retention days must be at least 1');
    }

    const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));
    return await this.repository.deleteOlderThan(cutoffDate);
  }
}
```

### TaskModeDetector Implementation
```javascript
class TaskModeDetector {
  constructor(logger) {
    this.logger = logger;
    this.knownTypes = new Set([
      'refactoring', 'testing', 'analysis', 'feature', 'bugfix', 
      'documentation', 'manual', 'optimization', 'security', 'generic'
    ]);
  }

  detecttaskMode(workflowData) {
    // Validate input - throw error if invalid
    if (!workflowData || !workflowData.steps) {
      throw new InvalidWorkflowDataError('Workflow data and steps are required');
    }

    const detectedType = this.analyzeSteps(workflowData.steps);
    
    // Strict validation - throw error if type not recognized
    if (!this.knownTypes.has(detectedType)) {
      throw new UnknowntaskModeError(`Unknown workflow type detected: ${detectedType}`);
    }

    return detectedType;
  }

  analyzeSteps(steps) {
    // Step analysis logic with strict type detection
    const stepTypes = steps.map(step => this.analyzeStep(step));
    return this.determineTypeFromSteps(stepTypes);
  }

  analyzeStep(step) {
    // Individual step analysis
    if (!step || !step.action) {
      throw new InvalidStepError('Step must have an action property');
    }

    // Step analysis logic here
    return this.classifyStepAction(step.action);
  }
}
```

### Database Schema
```sql
-- Queue History Table
CREATE TABLE queue_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL,
  workflow_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  metadata JSONB,
  steps_data JSONB,
  execution_time_ms INTEGER,
  error_message TEXT,
  created_by UUID,
  CONSTRAINT fk_workflow FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);

-- Indexes for performance
CREATE INDEX idx_queue_history_workflow_id ON queue_history(workflow_id);
CREATE INDEX idx_queue_history_type ON queue_history(workflow_type);
CREATE INDEX idx_queue_history_status ON queue_history(status);
CREATE INDEX idx_queue_history_created_at ON queue_history(created_at);
CREATE INDEX idx_queue_history_completed_at ON queue_history(completed_at);

-- Workflow Type Detection Table
CREATE TABLE workflow_type_detection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL,
  detected_type VARCHAR(50) NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL,
  analysis_data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_workflow_detection FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);

-- Indexes for type detection
CREATE INDEX idx_workflow_type_detection_workflow_id ON workflow_type_detection(workflow_id);
CREATE INDEX idx_workflow_type_detection_type ON workflow_type_detection(detected_type);
CREATE INDEX idx_workflow_type_detection_confidence ON workflow_type_detection(confidence_score);
```

## 🧪 Testing Strategy

### Unit Tests for QueueHistoryService
```javascript
describe('QueueHistoryService', () => {
  describe('persistWorkflowHistory', () => {
    it('should persist valid workflow history', async () => {
      // Test valid workflow persistence
    });

    it('should throw error for invalid workflow data', async () => {
      // Test error throwing for invalid data
      await expect(service.persistWorkflowHistory(null))
        .rejects.toThrow(InvalidWorkflowDataError);
    });

    it('should throw error for workflow without ID', async () => {
      // Test error throwing for missing ID
      await expect(service.persistWorkflowHistory({}))
        .rejects.toThrow(InvalidWorkflowDataError);
    });
  });

  describe('getWorkflowHistory', () => {
    it('should throw error for invalid filters', async () => {
      // Test error throwing for invalid filters
      await expect(service.getWorkflowHistory({ invalid: 'filter' }))
        .rejects.toThrow(InvalidFilterError);
    });
  });
});
```

### Unit Tests for TaskModeDetector
```javascript
describe('TaskModeDetector', () => {
  describe('detecttaskMode', () => {
    it('should detect known workflow types', () => {
      // Test known type detection
    });

    it('should throw error for unknown workflow types', () => {
      // Test error throwing for unknown types
      expect(() => detector.detecttaskMode({ steps: [{ action: 'unknown_action' }] }))
        .toThrow(UnknowntaskModeError);
    });

    it('should throw error for invalid workflow data', () => {
      // Test error throwing for invalid data
      expect(() => detector.detecttaskMode(null))
        .toThrow(InvalidWorkflowDataError);
    });
  });
});
```

## 🔒 Security Considerations
- [ ] Input validation for all service methods
- [ ] SQL injection prevention in repository layer
- [ ] Authentication and authorization checks
- [ ] Audit logging for all history operations
- [ ] Data sanitization for sensitive workflow data

## 📊 Performance Requirements
- **Database Operations**: < 50ms for single history retrieval
- **Type Detection**: < 100ms for workflow type analysis
- **Cache Operations**: < 10ms for cached data retrieval
- **Memory Usage**: < 20MB for service instances

## ✅ Success Criteria
- [ ] QueueHistoryService successfully persists workflow history
- [ ] TaskModeDetector correctly identifies known types
- [ ] All unknown types throw specific errors (no fallbacks)
- [ ] Database migrations execute successfully
- [ ] Redis caching is functional
- [ ] All unit tests pass with 90%+ coverage
- [ ] Error handling works correctly for invalid inputs

## 🚨 Risk Mitigation
- **Database Migration Failures**: Comprehensive testing, backup strategies
- **Type Detection Errors**: Extensive testing with various workflow types
- **Performance Issues**: Implement caching and query optimization from start
- **Memory Leaks**: Proper cleanup and resource management

## 🔄 Next Phase Dependencies
- QueueHistoryService must be complete for API endpoints
- TaskModeDetector must be functional for type detection APIs
- Database schema must be in place for repository operations
- Error handling patterns must be established for frontend integration

---

**Note**: This phase establishes the core backend foundation with strict error handling and no fallback mechanisms. All unknown or invalid inputs will throw specific errors rather than using default values. 